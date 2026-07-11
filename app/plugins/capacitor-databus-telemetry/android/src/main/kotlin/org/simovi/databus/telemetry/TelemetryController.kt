package org.simovi.databus.telemetry

import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.core.content.ContextCompat

/**
 * Singleton bridge between the Capacitor plugin layer and the native engine.
 *
 * The plugin ([DatabusTelemetryPlugin]) reads config + options and forwards
 * `start/stop` here. The controller owns the running [TelemetryEngine] and
 * the [TelemetryService] lifecycle. Events flow engine → controller → plugin
 * (`notifyListeners`) via the [pluginEmitter] set on plugin load.
 *
 * This indirection exists so the foreground service (which outlives the plugin
 * instance's active bridge calls) can reach the same emitter without holding
 * the Activity.
 *
 * @since 0.0.1
 */
object TelemetryController {

    @Volatile private var engine: TelemetryEngine? = null
    @Volatile private var config: TelemetryConfig? = null
    @Volatile private var options: TelemetryStartOptions? = null
    @Volatile private var appContext: Context? = null

    /** Set by the plugin so the engine can emit JS events. Cleared on stop. */
    @Volatile var pluginEmitter: PluginEmitter? = null

    // --- plugin entry points ------------------------------------------------

    fun start(context: Context, cfg: TelemetryConfig, opts: TelemetryStartOptions) {
        if (engine != null) {
            Log.d(TAG, "start called while running — no-op (idempotent)")
            return
        }
        appContext = context.applicationContext
        config = cfg
        options = opts
        val intent = Intent(context, TelemetryService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ContextCompat.startForegroundService(context, intent)
        } else {
            context.startService(intent)
        }
    }

    fun stop(context: Context) {
        if (engine == null && config == null) {
            // Nothing running — still clear emitter state for cleanliness.
            return
        }
        val intent = Intent(context, TelemetryService::class.java)
        context.stopService(intent)
        // Service.onDestroy calls stopEngine(); call it here too as a safety
        // net in case stopService doesn't immediately destroy (it usually does
        // for a started FGS once stopForeground/stopSelf fires).
        stopEngine()
    }

    // --- service callbacks --------------------------------------------------

    /** Called by [TelemetryService.onStartCommand] once the FGS is foreground. */
    fun onServiceStarted(context: Context) {
        val cfg = config ?: return
        val opts = options ?: return
        if (engine != null) return
        val eng = TelemetryEngine(
            context = context.applicationContext,
            config = cfg,
            options = opts,
            emitStatus = ::emitStatus,
            emitFix = ::emitFix,
            emitQueuedCount = ::emitQueuedCount,
        )
        engine = eng
        eng.start()
    }

    /** Called by [TelemetryService.onDestroy]; idempotent. */
    fun stopEngine() {
        engine?.stop()
        engine = null
        config = null
        options = null
    }

    // --- config accessors for the service notification ----------------------

    fun notificationTitle(): String? = config?.notificationTitle
    fun notificationChannelId(): String? = config?.notificationChannelId

    // --- event fan-out to the plugin ---------------------------------------

    private fun emitStatus(status: String, message: String?) {
        pluginEmitter?.emitStatus(status, message)
    }

    private fun emitFix(fix: TelemetryFix) {
        pluginEmitter?.emitFix(fix)
    }

    private fun emitQueuedCount(count: Int) {
        pluginEmitter?.emitQueuedCount(count)
    }

    private const val TAG = "DatabusController"
}

/** Bridge for emitting JS events from native; implemented by the plugin. */
interface PluginEmitter {
    fun emitStatus(status: String, message: String?)
    fun emitFix(fix: TelemetryFix)
    fun emitQueuedCount(count: Int)
}
