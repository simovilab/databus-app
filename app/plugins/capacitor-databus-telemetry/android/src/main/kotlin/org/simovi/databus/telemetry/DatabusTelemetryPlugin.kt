package org.simovi.databus.telemetry

import android.Manifest
import com.getcapacitor.JSObject
import com.getcapacitor.PermissionState
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import com.getcapacitor.annotation.Permission
import com.getcapacitor.annotation.PermissionCallback

/**
 * Capacitor Android plugin for the production telemetry hot path.
 *
 * Wires the TS `DatabusTelemetryPlugin` contract (`src/definitions.ts`) to the
 * native [TelemetryController] / [TelemetryService] / [TelemetryEngine]:
 * MQTT over TCP+TLS 8883, FusedLocation GPS, an Android foreground service
 * for background survival, and a native store-and-forward buffer.
 *
 * The plugin instance is the event bridge: it implements [PluginEmitter] and
 * registers itself with [TelemetryController] so native events reach JS via
 * `notifyListeners`. Permissions are handled through Capacitor's alias system
 * (foreground location alias; background location is a separate app-driven
 * prompt on Android 10+ — see README + `app/NATIVE-PERMISSIONS.md`).
 *
 * @since 0.0.1
 */
@CapacitorPlugin(
    name = "DatabusTelemetry",
    permissions = [
        Permission(
            alias = "location",
            strings = [
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION,
            ],
        ),
    ],
)
class DatabusTelemetryPlugin : Plugin(), PluginEmitter {

    override fun load() {
        super.load()
        // Register as the native→JS event bridge. Held for the plugin's life.
        TelemetryController.pluginEmitter = this
    }

    // --- plugin methods -----------------------------------------------------

    @PluginMethod
    fun start(call: PluginCall) {
        val vehicleId = call.getString("vehicleId")
        if (vehicleId.isNullOrEmpty()) {
            call.reject("INVALID_PARAMETER: vehicleId is required")
            return
        }
        if (getPermissionState("location") != PermissionState.GRANTED) {
            // Defer until the permission callback resolves.
            requestPermissionForAlias("location", call, "startPermissionCallback")
            return
        }
        beginStart(call, vehicleId)
    }

    @PermissionCallback
    private fun startPermissionCallback(call: PluginCall) {
        if (getPermissionState("location") == PermissionState.GRANTED) {
            val vehicleId = call.getString("vehicleId")
            if (vehicleId.isNullOrEmpty()) {
                call.reject("INVALID_PARAMETER: vehicleId is required")
                return
            }
            beginStart(call, vehicleId)
        } else {
            call.reject("PERMISSION_DENIED: location permission is required")
        }
    }

    private fun beginStart(call: PluginCall, vehicleId: String) {
        val config = readConfig()
        val options = TelemetryStartOptions(
            vehicleId = vehicleId,
            brokerHost = call.getString("brokerHost"),
            brokerPort = call.getInt("brokerPort"),
            useTls = call.getBoolean("useTls", config.useTls),
            username = call.getString("username"),
            token = call.getString("token"),
            caCertAsset = call.getString("caCertAsset"),
        )
        try {
            TelemetryController.start(context, config, options)
            call.resolve()
        } catch (e: Exception) {
            call.reject("Failed to start telemetry: ${e.message}")
        }
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        try {
            TelemetryController.stop(context)
        } catch (e: Exception) {
            // Idempotent — swallow teardown errors, still resolve.
        }
        call.resolve()
    }

    @PluginMethod
    fun checkPermissions(call: PluginCall) {
        val state = getPermissionState("location")
        call.resolve(JSObject().put("location", stateToJs(state)))
    }

    @PluginMethod
    fun requestPermissions(call: PluginCall) {
        if (getPermissionState("location") != PermissionState.GRANTED) {
            requestPermissionForAlias("location", call, "requestPermissionCallback")
        } else {
            call.resolve(JSObject().put("location", "granted"))
        }
    }

    @PermissionCallback
    private fun requestPermissionCallback(call: PluginCall) {
        call.resolve(JSObject().put("location", stateToJs(getPermissionState("location"))))
    }

    // --- PluginEmitter (native → JS events) ---------------------------------

    override fun emitStatus(status: String, message: String?) {
        val data = JSObject()
        data.put("status", status)
        if (message != null) data.put("message", message)
        notifyListeners("status", data)
    }

    override fun emitFix(fix: TelemetryFix) {
        val data = JSObject()
        data.put("latitude", fix.latitude)
        data.put("longitude", fix.longitude)
        fix.bearing?.let { data.put("bearing", it) }
        fix.speed?.let { data.put("speed", it) }
        fix.timestamp?.let { data.put("timestamp", it) }
        notifyListeners("lastFix", data)
    }

    override fun emitQueuedCount(count: Int) {
        val data = JSObject()
        data.put("count", count)
        notifyListeners("queuedCount", data)
    }

    // --- helpers ------------------------------------------------------------

    private fun readConfig(): TelemetryConfig {
        val cfg = getConfig()
        val host = cfg.getString("brokerHost", "")
        if (host.isEmpty()) {
            // Surface a clear error rather than connecting to a nonsense host.
            throw IllegalStateException(
                "plugins.DatabusTelemetry.brokerHost is not set in capacitor.config.ts",
            )
        }
        return TelemetryConfig(
            brokerHost = host,
            brokerPort = cfg.getInt("brokerPort", TelemetryConfig.DEFAULT_BROKER_PORT),
            useTls = cfg.getBoolean("useTls", true),
            clientIdPrefix = cfg.getString("clientIdPrefix", TelemetryConfig.DEFAULT_CLIENT_ID_PREFIX)
                ?: TelemetryConfig.DEFAULT_CLIENT_ID_PREFIX,
            gpsIntervalMs = cfg.getDouble("gpsIntervalMs", TelemetryConfig.DEFAULT_GPS_INTERVAL_MS.toDouble())
                .toLong()
                .coerceAtLeast(1000L),
            gpsMinDistanceM = cfg.getDouble("gpsMinDistanceM", TelemetryConfig.DEFAULT_GPS_MIN_DISTANCE_M.toDouble())
                .toFloat(),
            bufferMaxSize = cfg.getInt("bufferMaxSize", TelemetryConfig.DEFAULT_BUFFER_MAX_SIZE)
                .coerceAtLeast(1),
            notificationChannelId = cfg.getString("notificationChannelId", TelemetryConfig.DEFAULT_NOTIFICATION_CHANNEL_ID)
                ?: TelemetryConfig.DEFAULT_NOTIFICATION_CHANNEL_ID,
            notificationTitle = cfg.getString("notificationTitle", TelemetryConfig.DEFAULT_NOTIFICATION_TITLE)
                ?: TelemetryConfig.DEFAULT_NOTIFICATION_TITLE,
        )
    }

    private fun stateToJs(state: PermissionState?): String = when (state) {
        PermissionState.GRANTED -> "granted"
        PermissionState.DENIED -> "denied"
        else -> "prompt"
    }
}
