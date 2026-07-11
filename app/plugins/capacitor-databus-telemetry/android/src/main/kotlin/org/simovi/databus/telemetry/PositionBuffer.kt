package org.simovi.databus.telemetry

import java.util.ArrayDeque

/**
 * Bounded in-memory store-and-forward buffer for GPS fixes (master plan §8 R7).
 *
 * When the MQTT broker is unreachable, fixes are held here and flushed in
 * FIFO order on reconnect. Each fix carries its own epoch-`timestamp`, so
 * late/out-of-order delivery is fine server-side (the realtime-engine writes
 * per-fix, not per-sequence — see `realtime_engine/mqtt.py`).
 *
 * Drop policy: when `bufferMaxSize` is exceeded the **oldest** fix is dropped
 * (FIFO drop-head). This bounds memory under a long outage; the freshest
 * positions are kept and the server tolerates the gap.
 *
 * Thread-safe: the MQTT connect callback and the GPS callback run on
 * different threads, so all mutators are `@Synchronized`.
 *
 * (SQLite-backed persistence is a future hardening — a process crash still
 * loses this in-memory buffer. Acceptable for v0; documented in the README.)
 *
 * @since 0.0.1
 */
class PositionBuffer(private val bufferMaxSize: Int) {

    private val deque: ArrayDeque<TelemetryFix> = ArrayDeque(bufferMaxSize)

    /** Number of fixes currently held. */
    @Synchronized
    fun size(): Int = deque.size

    /** Enqueue a fix, dropping the oldest if over capacity. Returns the new size. */
    @Synchronized
    fun add(fix: TelemetryFix): Int {
        if (bufferMaxSize <= 0) {
            return 0
        }
        while (deque.size >= bufferMaxSize) {
            deque.pollFirst()
        }
        deque.addLast(fix)
        return deque.size
    }

    /** Drain and return all buffered fixes in FIFO (publish) order. */
    @Synchronized
    fun drain(): List<TelemetryFix> {
        val out = ArrayList(deque)
        deque.clear()
        return out
    }

    /** Remove all buffered fixes (used on `stop()` after a best-effort flush). */
    @Synchronized
    fun clear() {
        deque.clear()
    }
}
