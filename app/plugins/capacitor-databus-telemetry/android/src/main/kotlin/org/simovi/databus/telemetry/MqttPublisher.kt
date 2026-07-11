package org.simovi.databus.telemetry

import android.util.Log
import com.hivemq.client.mqtt.mqtt3.Mqtt3AsyncClient
import com.hivemq.client.mqtt.mqtt3.Mqtt3Client
import com.hivemq.client.mqtt.datatypes.MqttQos
import java.util.UUID
import java.util.concurrent.TimeUnit

/**
 * HiveMQ MQTT 3.1.1 async client wrapper. Speaks MQTT over **TCP+TLS to
 * :8883** (production broker — raw TLS only, no WSS; master plan §4.4, §8 R5).
 *
 * Why HiveMQ (vs Paho): the async API is fully non-blocking (no extra thread
 * management), it has built-in exponential-backoff auto-reconnect (R7
 * connection-recovery half), first-class TLS with pluggable trust managers
 * for the broker CA, and MQTT 3.1.1 + 5 support. Apache-2.0.
 *
 * Lifecycle: [connect] is async — it returns once the connect future is
 * initiated; the [onConnected] / [onDisconnected] callbacks drive the engine
 * state. [publish] is fire-and-forget at QoS 0 (the realtime-engine tolerates
 * at-most-once for position — see `mqtt.py` qos=0 subscribe). Reconnect is
 * automatic; on each successful reconnect the engine flushes the buffer.
 *
 * No credential is hardcoded. R5 future auth (username/token) is wired via
 * [TelemetryStartOptions] and sent only over the TLS socket.
 *
 * @since 0.0.1
 */
class MqttPublisher(
    private val config: TelemetryConfig,
    private val options: TelemetryStartOptions,
    private val onConnected: () -> Unit,
    private val onDisconnected: () -> Unit,
) {
    private var client: Mqtt3AsyncClient? = null
    @Volatile private var connected = false

    val isConnected: Boolean get() = connected

    /** Begin the async connect. Callbacks fire on HiveMQ's event-loop thread. */
    fun connect() {
        if (client != null) return
        val clientId = config.clientIdPrefix + UUID.randomUUID()
        val builder = Mqtt3Client.builder()
            .identifier(clientId)
            .serverHost(resolveBrokerHost())
            .serverPort(resolveBrokerPort())
            .addConnectedListener { onConnectedSafe() }
            .addDisconnectedListener { _ ->
                connected = false
                // automaticReconnectWithDefaultConfig() schedules the reconnect
                // with exponential backoff (R7); we just surface the state.
                onDisconnected()
            }
            .automaticReconnectWithDefaultConfig()

        val withTls = if (resolveUseTls()) builder.sslWithDefaultConfig() else builder

        val async = withTls.buildAsync()
        client = async

        // connectWith() keeps the keepAlive alive; auto-reconnect handles drops.
        // Future R5 auth: only attach simpleAuth when credentials are supplied
        // per-call (never from config on disk).
        val connectBuilder = async.connectWith().keepAlive(KEEP_ALIVE_SECONDS)
        if (options.username != null && options.token != null) {
            connectBuilder
                .simpleAuth()
                .username(options.username)
                .password(options.token!!.toByteArray(Charsets.UTF_8))
                .applySimpleAuth()
        }
        connectBuilder.send()
            .whenComplete { _, throwable ->
                if (throwable != null) {
                    // Initial connect failed — auto-reconnect will retry.
                    Log.w(TAG, "Initial MQTT connect failed: ${throwable.message}")
                    connected = false
                    onDisconnected()
                }
            }
    }

    /** Publish a position fix to `transit/vehicle/<vehicleId>/position` QoS 0. */
    fun publishPosition(fix: TelemetryFix) {
        val c = client ?: return
        if (!connected) return
        val topic = "transit/vehicle/${options.vehicleId}/position"
        val payload = fix.toJsonBytes()
        try {
            c.publishWith()
                .topic(topic)
                .qos(MqttQos.AT_MOST_ONCE)
                .payload(payload)
                .send()
        } catch (e: Exception) {
            // QoS 0 — a transient publish failure is swallowed; the fix is
            // already in the buffer if we were flushing, and the next fix
            // will retry. Don't crash the event loop.
            Log.w(TAG, "publish failed: ${e.message}")
        }
    }

    /** Disconnect cleanly and release the client. Idempotent. */
    fun disconnect() {
        val c = client ?: return
        try {
            c.disconnect().get(2, TimeUnit.SECONDS)
        } catch (e: Exception) {
            // Best-effort — broker may already be gone.
            Log.d(TAG, "disconnect ignored: ${e.message}")
        }
        connected = false
        client = null
    }

    // --- per-call override resolution (config defaults, options win) -------

    private fun resolveBrokerHost(): String =
        options.brokerHost ?: config.brokerHost

    private fun resolveBrokerPort(): Int =
        options.brokerPort ?: config.brokerPort

    private fun resolveUseTls(): Boolean = options.useTls ?: config.useTls

    private fun onConnectedSafe() {
        connected = true
        onConnected()
    }

    companion object {
        private const val TAG = "DatabusMqtt"
        private const val KEEP_ALIVE_SECONDS = 60
    }
}

/**
 * Serialize a fix to the §4.4 JSON payload (lat/lon required floats;
 * bearing/speed optional floats; timestamp optional epoch-SECONDS int).
 * Keys match `position.py` field constants exactly.
 */
private fun TelemetryFix.toJsonBytes(): ByteArray {
    val sb = StringBuilder()
    sb.append('{')
    sb.append("\"latitude\":").append(latitude)
    sb.append(",\"longitude\":").append(longitude)
    bearing?.let { sb.append(",\"bearing\":").append(it) }
    speed?.let { sb.append(",\"speed\":").append(it) }
    timestamp?.let { sb.append(",\"timestamp\":").append(it) }
    sb.append('}')
    return sb.toString().toByteArray(Charsets.UTF_8)
}
