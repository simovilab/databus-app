import Foundation
import CoreLocation
import CocoaMQTT

// Production telemetry hot path for iOS: native GPS (CLLocationManager) +
// MQTT over TCP+TLS 8883 (CocoaMQTT) + a native store-and-forward buffer,
// with background-location survival (master plan §1, §4.4, §8 R5–R7).
//
// A suspended webview cannot run JS, so this class owns the whole acquire →
// buffer → publish loop. It is retained by DatabusTelemetryPlugin for the
// app's lifetime once started, and CLLocationManager.allowsBackgroundLocationUpdates
// keeps it publishing while the phone is locked / the app is backgrounded
// (requires UIBackgroundModes "location" — see app/NATIVE-PERMISSIONS.md).

/// One GPS sample, shaped like the §4.4 MQTT payload.
/// Verified against ../databus/backend/runs/domain/telemetry/position.py.
struct DatabusTelemetryFix {
    let latitude: Double
    let longitude: Double
    let bearing: Double?
    let speed: Double?
    let timestamp: Int? // epoch seconds
}

/// Connection / lifecycle status. Maps 1:1 to the TS TelemetryConnectionStatus.
enum DatabusTelemetryStatus: String {
    case idle, starting, streaming, buffering, error
}

/// Bounded in-memory store-and-forward buffer (R7). Drop-head (FIFO) when over
/// capacity; each fix carries its own timestamp so late delivery is fine.
/// Thread-safe: GPS callbacks (main) and MQTT callbacks (CocoaMQTT queue) can
/// race on add/drain, so all mutators are locked.
final class DatabusTelemetryBuffer {
    private var fixes: [DatabusTelemetryFix] = []
    private let maxSize: Int
    private let lock = NSLock()

    init(maxSize: Int) {
        self.maxSize = max(maxSize, 1)
    }

    var count: Int {
        lock.lock(); defer { lock.unlock() }
        return fixes.count
    }

    func add(_ fix: DatabusTelemetryFix) {
        lock.lock(); defer { lock.unlock() }
        if fixes.count >= maxSize {
            fixes.removeFirst()
        }
        fixes.append(fix)
    }

    /// Drain and return all buffered fixes in FIFO (publish) order.
    func drain() -> [DatabusTelemetryFix] {
        lock.lock(); defer { lock.unlock() }
        let out = fixes
        fixes.removeAll()
        return out
    }

    func clear() {
        lock.lock(); defer { lock.unlock() }
        fixes.removeAll()
    }
}

/// Native telemetry engine. One instance is owned by DatabusTelemetryPlugin.
/// Emits status/fix/queuedCount to JS via closures the plugin sets.
final class DatabusTelemetry: NSObject, CLLocationManagerDelegate, CocoaMQTTDelegate {

    // Configuration (read from Capacitor config; no hardcoded credentials).
    private struct RuntimeConfig {
        let brokerHost: String
        let brokerPort: UInt16
        let useTls: Bool
        let clientIdPrefix: String
        let gpsIntervalM: Double
        let gpsMinDistanceM: Double
        let bufferMaxSize: Int
    }

    // Event bridge to the plugin (set before start()).
    var onStatus: ((DatabusTelemetryStatus, String?) -> Void)?
    var onFix: ((DatabusTelemetryFix) -> Void)?
    var onQueuedCount: ((Int) -> Void)?

    private var config: RuntimeConfig?
    private var vehicleId: String?
    private var username: String?
    private var token: String?

    private let locationManager = CLLocationManager()
    private var mqtt: CocoaMQTT?
    private var buffer: DatabusTelemetryBuffer?
    private var running = false

    override init() {
        super.init()
        locationManager.delegate = self
    }

    /// Current location authorization status (the engine owns the manager).
    var authorizationStatus: CLAuthorizationStatus {
        return locationManager.authorizationStatus
    }

    // MARK: - Lifecycle

    func start(host: String,
               port: Int?,
               useTls: Bool?,
               clientIdPrefix: String,
               gpsIntervalMs: Double,
               gpsMinDistanceM: Double,
               bufferMaxSize: Int,
               vehicleId: String,
               username: String?,
               token: String?,
               caCertAsset: String?) {
        if running { return }
        guard !host.isEmpty else {
            onStatus?(.error, "brokerHost is not configured")
            return
        }
        let resolvedPort = UInt16(port ?? 8883)
        let cfg = RuntimeConfig(
            brokerHost: host,
            brokerPort: resolvedPort,
            useTls: useTls ?? true,
            clientIdPrefix: clientIdPrefix,
            gpsIntervalM: gpsIntervalMs,
            gpsMinDistanceM: gpsMinDistanceM,
            bufferMaxSize: bufferMaxSize
        )
        self.config = cfg
        self.vehicleId = vehicleId
        self.username = username
        self.token = token
        self.buffer = DatabusTelemetryBuffer(maxSize: bufferMaxSize)

        running = true
        onStatus?(.starting, nil)

        connectMqtt(cfg: cfg)
        startGps(cfg: cfg)
    }

    /// Flush best-effort, release GPS, disconnect MQTT. Idempotent.
    func stop() {
        if !running { return }
        running = false
        locationManager.stopUpdatingLocation()
        locationManager.allowsBackgroundLocationUpdates = false
        if let m = mqtt, m.connState == .connected {
            flushBuffer()
        }
        mqtt?.disconnect()
        buffer?.clear()
        onQueuedCount?(0)
        onStatus?(.idle, nil)
        mqtt = nil
    }

    // MARK: - GPS (CLLocationManager)

    private func startGps(cfg: RuntimeConfig) {
        // Background survival (R6): requires UIBackgroundModes "location" +
        // "Always" authorization (see app/NATIVE-PERMISSIONS.md).
        locationManager.allowsBackgroundLocationUpdates = true
        locationManager.pausesLocationUpdatesAutomatically = false
        locationManager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
        locationManager.distanceFilter = cfg.gpsMinDistanceM

        // Request Always authorization if not yet granted. The OS drives the
        // prompt sequence (WhenInUse first, then Always on Android-10-style
        // separate prompt). The app may also drive this; requesting here is
        // idempotent if already authorized.
        switch locationManager.authorizationStatus {
        case .notDetermined:
            locationManager.requestAlwaysAuthorization()
        case .authorizedWhenInUse:
            // Upgrade to Always for background publishing.
            locationManager.requestAlwaysAuthorization()
        default:
            break
        }
        locationManager.startUpdatingLocation()
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard running, let loc = locations.last else { return }
        let bearing: Double? = (loc.course >= 0) ? loc.course : nil
        let speed: Double? = (loc.speed >= 0) ? loc.speed : nil
        let fix = DatabusTelemetryFix(
            latitude: loc.coordinate.latitude,
            longitude: loc.coordinate.longitude,
            bearing: bearing,
            speed: speed,
            timestamp: Int(loc.timestamp.timeIntervalSince1970)
        )
        onFix?(fix)
        if let m = mqtt, m.connState == .connected {
            flushBuffer()
            publish(fix: fix)
            onStatus?(.streaming, nil)
        } else {
            buffer?.add(fix)
            if let c = buffer?.count { onQueuedCount?(c) }
            onStatus?(.buffering, nil)
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        onStatus?(.error, error.localizedDescription)
    }

    // MARK: - MQTT (CocoaMQTT)

    private func connectMqtt(cfg: RuntimeConfig) {
        let clientId = cfg.clientIdPrefix + UUID().uuidString
        let client = CocoaMQTT(clientID: clientId, host: cfg.brokerHost, port: cfg.brokerPort)
        client.enableSSL = cfg.useTls
        client.keepAlive = 60
        client.autoReconnect = true
        // Future R5 auth (never persisted; sent only over TLS).
        if let u = username, let t = token {
            client.username = u
            client.password = t
        }
        client.delegate = self
        self.mqtt = client
        client.connect()
    }

    private func publish(fix: DatabusTelemetryFix) {
        guard let m = mqtt, let vid = vehicleId else { return }
        guard m.connState == .connected else { return }
        let topic = "transit/vehicle/\(vid)/position"
        let payload = fixToJson(fix: fix)
        let message = CocoaMQTTMessage(topic: topic, string: payload, qos: .qos0)
        m.publish(message)
    }

    /// Publish all buffered fixes in FIFO order, then clear the count.
    private func flushBuffer() {
        guard let m = mqtt, m.connState == .connected, let buf = buffer else { return }
        let pending = buf.drain()
        if pending.isEmpty { return }
        for fix in pending { publish(fix: fix) }
        onQueuedCount?(0)
    }

    // CocoaMQTTDelegate
    func mqtt(_ mqtt: CocoaMQTT, didConnectAck ack: CocoaMQTTConnAck) {
        guard running else { return }
        // A successful CONNECT moves connState to .connected; check that
        // rather than the ack enum case so we don't depend on the exact name.
        if mqtt.connState == .connected {
            flushBuffer()
            onStatus?(.streaming, nil)
        }
    }

    func mqttDidDisconnect(_ mqtt: CocoaMQTT, withError err: Error?) {
        guard running else { return }
        // Offline: fixes buffer until auto-reconnect succeeds.
        onStatus?(.buffering, nil)
    }

    // Required by CocoaMQTTDelegate (unused but mandatory).
    func mqtt(_ mqtt: CocoaMQTT, didPublishMessage message: CocoaMQTTMessage, id: UInt16) {}
    func mqtt(_ mqtt: CocoaMQTT, didReceiveMessage message: CocoaMQTTMessage, id: UInt16) {}

    // MARK: - §4.4 payload

    private func fixToJson(fix: DatabusTelemetryFix) -> String {
        var parts: [String] = []
        parts.append("\"latitude\":\(fix.latitude)")
        parts.append("\"longitude\":\(fix.longitude)")
        if let b = fix.bearing { parts.append("\"bearing\":\(b)") }
        if let s = fix.speed { parts.append("\"speed\":\(s)") }
        if let t = fix.timestamp { parts.append("\"timestamp\":\(t)") }
        return "{\(parts.joined(separator: ","))}"
    }
}
