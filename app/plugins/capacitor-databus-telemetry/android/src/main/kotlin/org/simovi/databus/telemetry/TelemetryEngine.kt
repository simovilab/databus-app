package org.simovi.databus.telemetry

import android.util.Log

/**
 * Orchestrates the production telemetry hot path: native GPS → §4.4 payload →
 * MQTT over TCP+TLS 8883, with a native store-and-forward buffer across
 * cellular dropouts (master plan §1, §4.4, §8 R5–R7).
 *
 * Owns the whole loop so a suspended webview (screen locked / backgrounded)
 * cannot break it. State transitions surface to JS via [TelemetryController]
 * → [DatabusTelemetryPlugin.notifyListeners].
 *
 * Threading: GPS callbacks fire on the main looper; HiveMQ callbacks fire on
 * its event-loop thread. [PositionBuffer] is synchronized, so no extra locking
 * is needed here.
 *
 * @since 0.0.1
 */
class TelemetryEngine(
    private val context: android.content.Context,
    private val config: TelemetryConfig,
    private val options: TelemetryStartOptions,
    private val emitStatus: (String, String?) -> Unit,
    private val emitFix: (TelemetryFix) -> Unit,
    private val emitQueuedCount: (Int) -> Unit,
) {
    private val buffer = PositionBuffer(config.bufferMaxSize)
    private var mqtt: MqttPublisher? = null
    private var gps: GpsProvider? = null
    @Volatile private var running = false

    /** Start GPS + MQTT. Idempotent — a second start is a no-op. */
    fun start() {
        if (running) return
        running = true
        emitStatus("starting", null)

        mqtt = MqttPublisher(
            config = config,
            options = options,
            onConnected = ::onMqttConnected,
            onDisconnected = ::onMqttDisconnected,
        ).also { it.connect() }

        gps = GpsProvider(
            context = context,
            config = config,
            onFix = ::onGpsFix,
            onError = ::onGpsError,
        ).also { it.start() }
    }

    /**
     * Flush buffered fixes (best-effort), release GPS, disconnect MQTT.
     * Idempotent. Leaves no residual GPS / battery drain.
     */
    fun stop() {
        if (!running) return
        running = false
        try {
            gps?.stop()
        } catch (e: Exception) {
            Log.d(TAG, "gps stop ignored: ${e.message}")
        }
        try {
            // Best-effort flush while the socket is still up.
            if (mqtt?.isConnected == true) flushBuffer()
        } catch (e: Exception) {
            Log.d(TAG, "flush on stop ignored: ${e.message}")
        }
        try {
            mqtt?.disconnect()
        } catch (e: Exception) {
            Log.d(TAG, "mqtt stop ignored: ${e.message}")
        }
        buffer.clear()
        emitQueuedCount(0)
        emitStatus("idle", null)
        gps = null
        mqtt = null
    }

    private fun onGpsFix(fix: TelemetryFix) {
        if (!running) return
        emitFix(fix)
        val pub = mqtt
        if (pub != null && pub.isConnected) {
            flushBuffer()
            pub.publishPosition(fix)
            emitStatus("streaming", null)
        } else {
            val count = buffer.add(fix)
            emitQueuedCount(count)
            emitStatus("buffering", null)
        }
    }

    private fun onGpsError(message: String) {
        Log.e(TAG, "GPS error: $message")
        emitStatus("error", message)
    }

    private fun onMqttConnected() {
        if (!running) return
        flushBuffer()
        emitStatus("streaming", null)
    }

    private fun onMqttDisconnected() {
        if (!running) return
        // Offline: fixes will buffer in onGpsFix until reconnect.
        emitStatus("buffering", null)
    }

    /** Publish all buffered fixes in FIFO order, then clear the count. */
    private fun flushBuffer() {
        val pub = mqtt ?: return
        if (!pub.isConnected) return
        val pending = buffer.drain()
        if (pending.isEmpty()) return
        for (fix in pending) {
            pub.publishPosition(fix)
        }
        emitQueuedCount(0)
    }

    companion object {
        private const val TAG = "DatabusEngine"
    }
}
