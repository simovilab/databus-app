package org.simovi.databus.telemetry

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat

/**
 * Android foreground service that keeps the [TelemetryEngine] alive while the
 * app is backgrounded / the screen is locked (master plan §8 R6).
 *
 * A foreground service (with a persistent notification) is the only Android
 * mechanism that reliably evades Doze / background-process limits for a
 * continuous GPS + network loop. The service declares
 * `android:foregroundServiceType="location"` in the plugin's own manifest
 * (Android 14+ enforces typed foreground services — see
 * `app/NATIVE-PERMISSIONS.md`).
 *
 * Lifecycle is owned by [TelemetryController]: it starts this service on
 * `start()` and stops it on `stop()`. `onDestroy` guarantees the engine is
 * torn down (GPS released, MQTT disconnected, buffer cleared) so there is no
 * residual battery drain after a run ends.
 *
 * @since 0.0.1
 */
class TelemetryService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        // ServiceCompat.startForeground is cross-version safe (the 3-arg
        // Service.startForeground exists only on API 29+; minSdk is 24).
        // foregroundServiceType() returns LOCATION on Android 14+, else 0.
        ServiceCompat.startForeground(
            this,
            NOTIFICATION_ID,
            buildNotification(),
            foregroundServiceType(),
        )
        try {
            TelemetryController.onServiceStarted(this)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to start telemetry engine: ${e.message}", e)
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    override fun onDestroy() {
        super.onDestroy()
        // Remove the foreground notification explicitly so none lingers.
        try {
            ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        } catch (e: Exception) {
            Log.d(TAG, "stopForeground ignored: ${e.message}")
        }
        try {
            TelemetryController.stopEngine()
        } catch (e: Exception) {
            Log.e(TAG, "Engine teardown failed: ${e.message}", e)
        }
    }

    private fun buildNotification(): Notification {
        val controller = TelemetryController
        val title = controller.notificationTitle() ?: DEFAULT_TITLE
        ensureChannel(controller.notificationChannelId() ?: DEFAULT_CHANNEL_ID)
        return NotificationCompat.Builder(this, controller.notificationChannelId() ?: DEFAULT_CHANNEL_ID)
            .setContentTitle(title)
            .setContentText("Tu posición se está transmitiendo en segundo plano.")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    private fun foregroundServiceType(): Int {
        // Android 14+ (API 34) requires the typed FGS type to match the
        // manifest declaration. FOREGROUND_SERVICE_TYPE_LOCATION is the
        // correct type for a continuous GPS publisher.
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION
        } else {
            0
        }
    }

    private fun ensureChannel(channelId: String) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(NotificationManager::class.java)
            if (nm.getNotificationChannel(channelId) == null) {
                val channel = NotificationChannel(
                    channelId,
                    "Databús Telemetry",
                    NotificationManager.IMPORTANCE_LOW,
                ).apply {
                    description = "Notificación de transmisión de posición en segundo plano."
                    setShowBadge(false)
                }
                nm.createNotificationChannel(channel)
            }
        }
    }

    companion object {
        const val NOTIFICATION_ID = 4242
        private const val TAG = "DatabusService"
        private const val DEFAULT_TITLE = "Databús transmitiendo"
        private const val DEFAULT_CHANNEL_ID = "databus-telemetry"
    }
}
