package org.simovi.databus.telemetry

import android.Manifest
import android.annotation.SuppressLint
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.os.Looper
import android.util.Log
import androidx.core.content.ContextCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority

/**
 * Battery-aware native GPS via FusedLocationProvider (master plan §8 R6/R7).
 *
 * Cadence is config-driven (`gpsIntervalMs` / `gpsMinDistanceM`) and balanced
 * for power: the realtime-engine tolerates 5–10s cadence for run-state
 * advancement, so we default to 5s. Each fix is mapped to the §4.4 payload —
 * `latitude`/`longitude` required, `bearing`/`speed` optional when the device
 * reports them, `timestamp` as epoch-SECONDS.
 *
 * Callbacks fire on the main looper; the engine relays them without blocking.
 *
 * @since 0.0.1
 */
class GpsProvider(
    private val context: Context,
    private val config: TelemetryConfig,
    private val onFix: (TelemetryFix) -> Unit,
    private val onError: (String) -> Unit,
) {
    private var client: FusedLocationProviderClient? = null
    private var callback: LocationCallback? = null

    /** Caller MUST have granted foreground location permission first. */
    @SuppressLint("MissingPermission")
    fun start() {
        if (!hasLocationPermission()) {
            onError("location permission not granted")
            return
        }
        val fused = LocationServices.getFusedLocationProviderClient(context)
        client = fused
        val request = LocationRequest.Builder(
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            config.gpsIntervalMs,
        )
            .setMinUpdateIntervalMillis(config.gpsIntervalMs)
            .setMinUpdateDistanceMeters(config.gpsMinDistanceM)
            .setWaitForAccurateLocation(false)
            .build()

        val cb = object : LocationCallback() {
            override fun onLocationResult(result: LocationResult) {
                result.lastLocation?.let { mapAndEmit(it) }
            }
        }
        callback = cb
        fused.requestLocationUpdates(request, cb, Looper.getMainLooper())
    }

    /** Stop updates and release the GPS client. Idempotent. */
    fun stop() {
        val c = callback
        val f = client
        if (c != null && f != null) {
            try {
                f.removeLocationUpdates(c)
            } catch (e: Exception) {
                Log.d(TAG, "removeLocationUpdates ignored: ${e.message}")
            }
        }
        callback = null
        client = null
    }

    private fun mapAndEmit(loc: Location) {
        val bearing: Double? = if (loc.hasBearing()) loc.bearing.toDouble() else null
        val speed: Double? = if (loc.hasSpeed()) loc.speed.toDouble() else null
        val fix = TelemetryFix(
            latitude = loc.latitude,
            longitude = loc.longitude,
            bearing = bearing,
            speed = speed,
            timestamp = loc.time / 1000L, // epoch millis → seconds
        )
        onFix(fix)
    }

    private fun hasLocationPermission(): Boolean {
        val fine = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_FINE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        val coarse = ContextCompat.checkSelfPermission(
            context, Manifest.permission.ACCESS_COARSE_LOCATION,
        ) == PackageManager.PERMISSION_GRANTED
        return fine || coarse
    }

    companion object {
        private const val TAG = "DatabusGps"
    }
}
