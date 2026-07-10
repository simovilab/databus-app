import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';
import { createPositionWatcher } from '@/services/geolocation';

vi.mock('@capacitor/geolocation', () => ({
  Geolocation: {
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  },
}));

describe('createPositionWatcher (web fallback)', () => {
  let watchPositionMock: ReturnType<typeof vi.fn>;
  let clearWatchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    watchPositionMock = vi.fn().mockReturnValue(7);
    clearWatchMock = vi.fn();
    vi.stubGlobal('navigator', {
      geolocation: {
        watchPosition: watchPositionMock,
        clearWatch: clearWatchMock,
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses navigator.geolocation.watchPosition on web (jsdom has no native bridge)', async () => {
    const watcher = createPositionWatcher();
    const onFix = vi.fn();

    await watcher.start(onFix);

    expect(watchPositionMock).toHaveBeenCalledTimes(1);
    const [successCb, , options] = watchPositionMock.mock.calls[0];
    expect(options).toMatchObject({ enableHighAccuracy: true });

    successCb({
      coords: { latitude: 9.9363, longitude: -84.0474, heading: 180, speed: 8.3 },
      timestamp: 1720600000123,
    });

    expect(onFix).toHaveBeenCalledWith({
      latitude: 9.9363,
      longitude: -84.0474,
      bearing: 180,
      speed: 8.3,
      timestamp: 1720600000, // ms → epoch seconds
    });
  });

  it('omits bearing/speed when the browser does not report them', async () => {
    const watcher = createPositionWatcher();
    const onFix = vi.fn();
    await watcher.start(onFix);

    const [successCb] = watchPositionMock.mock.calls[0];
    successCb({
      coords: { latitude: 1, longitude: 2, heading: null, speed: null },
      timestamp: 1000,
    });

    expect(onFix).toHaveBeenCalledWith({ latitude: 1, longitude: 2, timestamp: 1 });
  });

  it('forwards browser geolocation errors via onError', async () => {
    const watcher = createPositionWatcher();
    const onFix = vi.fn();
    const onError = vi.fn();
    await watcher.start(onFix, onError);

    const [, errorCb] = watchPositionMock.mock.calls[0];
    const err = new Error('permission denied');
    errorCb(err);

    expect(onError).toHaveBeenCalledWith(err);
  });

  it('reports an error when geolocation is unavailable in the browser', async () => {
    vi.stubGlobal('navigator', {});
    const watcher = createPositionWatcher();
    const onError = vi.fn();

    await watcher.start(vi.fn(), onError);

    expect(onError).toHaveBeenCalledWith(expect.any(Error));
  });

  it('stop() clears the watch by id', async () => {
    const watcher = createPositionWatcher();
    await watcher.start(vi.fn());
    await watcher.stop();

    expect(clearWatchMock).toHaveBeenCalledWith(7);
  });

  it('stop() before start() is a safe no-op', async () => {
    const watcher = createPositionWatcher();
    await expect(watcher.stop()).resolves.toBeUndefined();
    expect(clearWatchMock).not.toHaveBeenCalled();
  });
});

describe('createPositionWatcher (native — Capacitor Geolocation)', () => {
  beforeEach(() => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.mocked(Geolocation.watchPosition).mockClear();
    vi.mocked(Geolocation.clearWatch).mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses Geolocation.watchPosition with enableHighAccuracy when native', async () => {
    vi.mocked(Geolocation.watchPosition).mockResolvedValue('watch-id-1');
    const watcher = createPositionWatcher();
    const onFix = vi.fn();

    await watcher.start(onFix);

    expect(Geolocation.watchPosition).toHaveBeenCalledWith(
      expect.objectContaining({ enableHighAccuracy: true }),
      expect.any(Function)
    );

    const [, callback] = vi.mocked(Geolocation.watchPosition).mock.calls[0];
    callback(
      {
        timestamp: 1720600000123,
        coords: {
          latitude: 9.9363,
          longitude: -84.0474,
          heading: 180,
          speed: 8.3,
          accuracy: 5,
          altitude: null,
          altitudeAccuracy: null,
        },
      },
      undefined
    );

    expect(onFix).toHaveBeenCalledWith({
      latitude: 9.9363,
      longitude: -84.0474,
      bearing: 180,
      speed: 8.3,
      timestamp: 1720600000,
    });
  });

  it('forwards native watch errors via onError without calling onFix', async () => {
    vi.mocked(Geolocation.watchPosition).mockResolvedValue('watch-id-2');
    const watcher = createPositionWatcher();
    const onFix = vi.fn();
    const onError = vi.fn();
    await watcher.start(onFix, onError);

    const [, callback] = vi.mocked(Geolocation.watchPosition).mock.calls[0];
    const err = new Error('permission denied');
    callback(null, err);

    expect(onError).toHaveBeenCalledWith(err);
    expect(onFix).not.toHaveBeenCalled();
  });

  it('stop() clears the native watch by id', async () => {
    vi.mocked(Geolocation.watchPosition).mockResolvedValue('watch-id-3');
    const watcher = createPositionWatcher();
    await watcher.start(vi.fn());

    await watcher.stop();

    expect(Geolocation.clearWatch).toHaveBeenCalledWith({ id: 'watch-id-3' });
  });

  it('native stop() before start() is a safe no-op', async () => {
    const watcher = createPositionWatcher();
    await expect(watcher.stop()).resolves.toBeUndefined();
    expect(Geolocation.clearWatch).not.toHaveBeenCalled();
  });
});
