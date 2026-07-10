// GPS position watcher: Capacitor Geolocation on native, browser
// navigator.geolocation fallback on web (verified via /find-docs against
// /ionic-team/capacitor-docs — Geolocation.watchPosition/clearWatch).
// Foreground/web-only: background survival on native is owned by A5's
// TelemetryRuntime (native plugin), not this module.

import { Capacitor } from '@capacitor/core';
import { Geolocation, type Position } from '@capacitor/geolocation';
import type { Fix } from '@/types/domain';

export interface PositionWatcher {
  start(onFix: (fix: Fix) => void, onError?: (e: unknown) => void): Promise<void>;
  stop(): Promise<void>;
}

function toFix(position: Position): Fix {
  const fix: Fix = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    timestamp: Math.floor(position.timestamp / 1000),
  };
  if (position.coords.heading !== null && position.coords.heading !== undefined) {
    fix.bearing = position.coords.heading;
  }
  if (position.coords.speed !== null && position.coords.speed !== undefined) {
    fix.speed = position.coords.speed;
  }
  return fix;
}

function toFixFromWeb(position: GeolocationPosition): Fix {
  const fix: Fix = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    timestamp: Math.floor(position.timestamp / 1000),
  };
  if (position.coords.heading !== null && position.coords.heading !== undefined) {
    fix.bearing = position.coords.heading;
  }
  if (position.coords.speed !== null && position.coords.speed !== undefined) {
    fix.speed = position.coords.speed;
  }
  return fix;
}

class CapacitorPositionWatcher implements PositionWatcher {
  private watchId: string | undefined;

  async start(onFix: (fix: Fix) => void, onError?: (e: unknown) => void): Promise<void> {
    this.watchId = await Geolocation.watchPosition(
      { enableHighAccuracy: true, timeout: 10000 },
      (position, err) => {
        if (err) {
          onError?.(err);
          return;
        }
        if (position) {
          onFix(toFix(position));
        }
      }
    );
  }

  async stop(): Promise<void> {
    if (this.watchId !== undefined) {
      await Geolocation.clearWatch({ id: this.watchId });
      this.watchId = undefined;
    }
  }
}

class BrowserPositionWatcher implements PositionWatcher {
  private watchId: number | undefined;

  async start(onFix: (fix: Fix) => void, onError?: (e: unknown) => void): Promise<void> {
    if (!('geolocation' in navigator)) {
      onError?.(new Error('Geolocation is not available in this browser'));
      return;
    }
    this.watchId = navigator.geolocation.watchPosition(
      (position) => onFix(toFixFromWeb(position)),
      (err) => onError?.(err),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async stop(): Promise<void> {
    if (this.watchId !== undefined) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = undefined;
    }
  }
}

/** Picks the Capacitor Geolocation plugin on native, browser API on web. */
export function createPositionWatcher(): PositionWatcher {
  return Capacitor.isNativePlatform()
    ? new CapacitorPositionWatcher()
    : new BrowserPositionWatcher();
}
