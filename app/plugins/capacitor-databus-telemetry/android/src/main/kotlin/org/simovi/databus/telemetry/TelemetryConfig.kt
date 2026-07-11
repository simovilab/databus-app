package org.simovi.databus.telemetry

/**
 * Immutable runtime configuration for the native telemetry runtime.
 *
 * Values are read from the Capacitor config (`plugins.DatabusTelemetry`) by
 * [DatabusTelemetryPlugin] on `start()` and merged with per-call overrides
 * from [TelemetryStartOptions]. No credential is ever hardcoded — the future
 * R5 auth surface (username/token/caCertAsset) is injected per-call (master
 * plan §8 R5). See `src/config.ts` for the typed config surface.
 *
 * @since 0.0.1
 */
data class TelemetryConfig(
    val brokerHost: String,
    val brokerPort: Int = DEFAULT_BROKER_PORT,
    val useTls: Boolean = true,
    val clientIdPrefix: String = DEFAULT_CLIENT_ID_PREFIX,
    val gpsIntervalMs: Long = DEFAULT_GPS_INTERVAL_MS,
    val gpsMinDistanceM: Float = DEFAULT_GPS_MIN_DISTANCE_M,
    val bufferMaxSize: Int = DEFAULT_BUFFER_MAX_SIZE,
    val notificationChannelId: String = DEFAULT_NOTIFICATION_CHANNEL_ID,
    val notificationTitle: String = DEFAULT_NOTIFICATION_TITLE,
) {
    companion object {
        const val DEFAULT_BROKER_PORT = 8883
        const val DEFAULT_CLIENT_ID_PREFIX = "databus-"
        const val DEFAULT_GPS_INTERVAL_MS = 5_000L
        const val DEFAULT_GPS_MIN_DISTANCE_M = 5f
        const val DEFAULT_BUFFER_MAX_SIZE = 2_000
        const val DEFAULT_NOTIFICATION_CHANNEL_ID = "databus-telemetry"
        const val DEFAULT_NOTIFICATION_TITLE = "Databús transmitiendo"
    }
}

/**
 * Per-call start options merged with [TelemetryConfig]. Mirrors the
 * `TelemetryStartOptions` TS contract in `src/definitions.ts`.
 *
 * @since 0.0.1
 */
data class TelemetryStartOptions(
    val vehicleId: String,
    val brokerHost: String? = null,
    val brokerPort: Int? = null,
    val useTls: Boolean? = null,
    val username: String? = null,
    val token: String? = null,
    val caCertAsset: String? = null,
)

/**
 * One GPS sample, shaped exactly like the §4.4 MQTT payload.
 * `latitude`/`longitude` are required floats; `bearing`/`speed` are optional
 * floats; `timestamp` is an optional epoch-SECONDS int.
 *
 * Verified against `../databus/backend/runs/domain/telemetry/position.py`
 * (required: latitude, longitude; optional float: bearing, speed, odometer;
 * optional int: timestamp).
 *
 * @since 0.0.1
 */
data class TelemetryFix(
    val latitude: Double,
    val longitude: Double,
    val bearing: Double? = null,
    val speed: Double? = null,
    val timestamp: Long? = null,
)
