// TypeScript API contract for capacitor-databus-telemetry.
//
// This plugin owns the production telemetry hot path on native devices:
// MQTT over TCP+TLS to :8883, native GPS, Android foreground service /
// iOS background location, and a native store-and-forward buffer. The TS
// adapter (app/src/services/telemetry/nativeRuntime.ts) maps these events
// onto the TelemetryRuntime seam (plans/master-plan.md §6.3).
//
// MQTT payload + topic verified against
// ../databus/backend/realtime_engine/mqtt.py +
// ../databus/backend/runs/domain/telemetry/position.py (master §4.4).

import type { PluginListenerHandle } from '@capacitor/core';

/**
 * Connection / lifecycle status of the native telemetry runtime.
 *
 * Maps 1:1 to the `TelemetryStatus` union in the app's TelemetryRuntime
 * seam (master §6.3). The adapter translates these directly.
 *
 * - `idle`       — not started, or stopped cleanly.
 * - `starting`   — acquiring GPS + establishing the MQTT connection.
 * - `streaming`  — connected and publishing fixes live.
 * - `buffering`  — offline (broker unreachable); fixes are held in the
 *                  native store-and-forward buffer and will flush on reconnect.
 * - `error`      — unrecoverable error (e.g. permissions denied, GPS refused).
 *
 * @since 0.0.1
 */
export type TelemetryConnectionStatus =
  | 'idle'
  | 'starting'
  | 'streaming'
  | 'buffering'
  | 'error';

/**
 * Options for `start()`. Broker endpoint defaults come from the Capacitor
 * config (`plugins.DatabusTelemetry`); per-call values override them. No
 * credential is ever hardcoded — see `username`/`token` for the future R5
 * auth surface (master §8 R5).
 *
 * @since 0.0.1
 */
export interface TelemetryStartOptions {
  /** Vehicle whose position is being published. Required. */
  vehicleId: string;
  /** Override `plugins.DatabusTelemetry.brokerHost`. */
  brokerHost?: string;
  /** Override `plugins.DatabusTelemetry.brokerPort` (default 8883). */
  brokerPort?: number;
  /** Override `plugins.DatabusTelemetry.useTls` (default true in prod). */
  useTls?: boolean;
  /**
   * Future R5 auth: MQTT username. Sent only over the native TLS socket,
   * never persisted. Ops must supply the trust chain + scheme (see README
   * "Asks for the databus/ops team").
   */
  username?: string;
  /**
   * Future R5 auth: bearer token / password. Treated as a secret; the
   * native layer does not log it.
   */
  token?: string;
  /**
   * Relative path (app asset / native resource) to a PEM CA bundle for the
   * broker TLS trust chain. When omitted, the platform default trust store
   * is used (sufficient once ops registers the broker cert with the system).
   */
  caCertAsset?: string;
}

/**
 * `status` event payload.
 *
 * @since 0.0.1
 */
export interface TelemetryStatusEvent {
  status: TelemetryConnectionStatus;
  /** Optional human-readable context (e.g. disconnect reason). */
  message?: string;
}

/**
 * `lastFix` event payload — one GPS sample, shaped exactly like the §4.4
 * MQTT payload (`latitude`/`longitude` required floats; `bearing`/`speed`
 * optional floats; `timestamp` optional epoch-SECONDS int). Emitted for
 * every fix the native layer acquires, immediately before publishing.
 *
 * @since 0.0.1
 */
export interface TelemetryFixEvent {
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
  timestamp?: number;
}

/**
 * `queuedCount` event payload — number of fixes held in the native
 * store-and-forward buffer (master §8 R7).
 *
 * @since 0.0.1
 */
export interface TelemetryQueuedCountEvent {
  count: number;
}

/**
 * Result of a permission check/request. Location is the only permission
 * this plugin needs (background location on Android 10+ is a separate
 * prompt that the app must drive — see README).
 *
 * @since 0.0.1
 */
export interface TelemetryPermissionStatus {
  location: 'granted' | 'denied' | 'prompt';
}

/**
 * Native telemetry plugin contract. Drives GPS acquisition, MQTT
 * publishing, background survival, and store-and-forward entirely in native
 * code — a suspended webview cannot run JS, so the plugin owns the loop.
 *
 * @since 0.0.1
 */
export interface DatabusTelemetryPlugin {
  /**
   * Begin GPS acquisition + MQTT publishing for `vehicleId`. Starts the
   * Android foreground service / iOS background location mode. Idempotent
   * re-start is allowed (the second call is a no-op that resolves after
   * the first). Resolves once the service is started; MQTT connect happens
   * asynchronously and surfaces via `status` events.
   *
   * @throws `PERMISSION_DENIED` if location permission is not granted.
   * @throws `INVALID_PARAMETER` if `vehicleId` is empty.
   * @since 0.0.1
   */
  start(options: TelemetryStartOptions): Promise<void>;

  /**
   * Stop GPS + publishing, flush any buffered fixes (best-effort), end the
   * foreground service, and release GPS. Must leave no residual GPS /
   * battery drain. Idempotent — safe to call after a previous stop or when
   * never started.
   * @since 0.0.1
   */
  stop(): Promise<void>;

  /**
   * Check whether location permission is granted.
   * @since 0.0.1
   */
  checkPermissions(): Promise<TelemetryPermissionStatus>;

  /**
   * Request foreground location permission. Background location
   * (Android 10+) must be requested separately by the app after this
   * returns — see README.
   * @since 0.0.1
   */
  requestPermissions(): Promise<TelemetryPermissionStatus>;

  /**
   * Emitted on every runtime status transition. Use to drive the UI badge
   * and the run store's tracking state.
   * @since 0.0.1
   */
  addListener(
    eventName: 'status',
    listener: (event: TelemetryStatusEvent) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * Emitted for each acquired GPS fix, immediately before publishing.
   * @since 0.0.1
   */
  addListener(
    eventName: 'lastFix',
    listener: (event: TelemetryFixEvent) => void,
  ): Promise<PluginListenerHandle>;

  /**
   * Emitted when the store-and-forward buffer size changes.
   * @since 0.0.1
   */
  addListener(
    eventName: 'queuedCount',
    listener: (event: TelemetryQueuedCountEvent) => void,
  ): Promise<PluginListenerHandle>;
}
