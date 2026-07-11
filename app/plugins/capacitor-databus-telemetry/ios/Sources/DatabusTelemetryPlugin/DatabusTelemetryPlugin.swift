import Foundation
import CoreLocation
import Capacitor

/**
 * Capacitor iOS plugin for the production telemetry hot path.
 *
 * Wires the TS `DatabusTelemetryPlugin` contract (`src/definitions.ts`) to the
 * native [DatabusTelemetry] engine: MQTT over TCP+TLS 8883 (CocoaMQTT),
 * CLLocationManager GPS with background-location mode, and a native
 * store-and-forward buffer.
 *
 * The plugin owns the single [DatabusTelemetry] instance and is the native→JS
 * event bridge: it sets closures on the engine that call `notifyListeners`.
 * `start/stop/checkPermissions/requestPermissions` are exported to JS via the
 * `pluginMethods` array (Capacitor's Objective-C runtime requires `@objc`).
 *
 * @since 0.0.1
 */
@objc(DatabusTelemetryPlugin)
public class DatabusTelemetryPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DatabusTelemetryPlugin"
    public let jsName = "DatabusTelemetry"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
    ]

    private let implementation = DatabusTelemetry()

    public override func load() {
        super.load()
        // Wire the native event stream to JS via notifyListeners.
        implementation.onStatus = { [weak self] status, message in
            self?.notifyListeners("status", data: [
                "status": status.rawValue,
                "message": message as Any,
            ])
        }
        implementation.onFix = { [weak self] fix in
            var data: [String: Any] = [
                "latitude": fix.latitude,
                "longitude": fix.longitude,
            ]
            if let b = fix.bearing { data["bearing"] = b }
            if let s = fix.speed { data["speed"] = s }
            if let t = fix.timestamp { data["timestamp"] = t }
            self?.notifyListeners("lastFix", data: data)
        }
        implementation.onQueuedCount = { [weak self] count in
            self?.notifyListeners("queuedCount", data: ["count": count])
        }
    }

    // MARK: - Plugin methods

    @objc func start(_ call: CAPPluginCall) {
        guard let vehicleId = call.getString("vehicleId"), !vehicleId.isEmpty else {
            call.reject("INVALID_PARAMETER: vehicleId is required")
            return
        }
        let host = brokerHostFromConfig()
        guard !host.isEmpty else {
            call.reject("plugins.DatabusTelemetry.brokerHost is not set in capacitor.config.ts")
            return
        }
        implementation.start(
            host: host,
            port: call.getInt("brokerPort"),
            useTls: call.getBool("useTls"),
            clientIdPrefix: clientIdPrefixFromConfig(),
            gpsIntervalMs: gpsIntervalMsFromConfig(),
            gpsMinDistanceM: gpsMinDistanceMFromConfig(),
            bufferMaxSize: bufferMaxSizeFromConfig(),
            vehicleId: vehicleId,
            username: call.getString("username"),
            token: call.getString("token"),
            caCertAsset: call.getString("caCertAsset")
        )
        call.resolve()
    }

    @objc func stop(_ call: CAPPluginCall) {
        implementation.stop()
        call.resolve()
    }

    @objc func checkPermissions(_ call: CAPPluginCall) {
        call.resolve(["location": locationPermissionState()])
    }

    @objc func requestPermissions(_ call: CAPPluginCall) {
        // CLLocationManager authorization is driven by the engine on start();
        // here we just report the current state. iOS does not expose a JS-side
        // permission prompt distinct from starting location updates.
        call.resolve(["location": locationPermissionState()])
    }

    // MARK: - Config accessors (Capacitor config: plugins.DatabusTelemetry)

    private func brokerHostFromConfig() -> String {
        getConfig().getString("brokerHost") ?? ""
    }

    private func clientIdPrefixFromConfig() -> String {
        getConfig().getString("clientIdPrefix") ?? "databus-"
    }

    private func gpsIntervalMsFromConfig() -> Double {
        let v = getConfig().getDouble("gpsIntervalMs", 5000.0)
        return max(v, 1000.0)
    }

    private func gpsMinDistanceMFromConfig() -> Double {
        getConfig().getDouble("gpsMinDistanceM", 5.0)
    }

    private func bufferMaxSizeFromConfig() -> Int {
        let v = getConfig().getInt("bufferMaxSize", 2000)
        return max(v, 1)
    }

    // MARK: - Permissions

    private func locationPermissionState() -> String {
        switch implementation.authorizationStatus {
        case .authorizedAlways, .authorizedWhenInUse:
            return "granted"
        case .denied, .restricted:
            return "denied"
        default:
            return "prompt"
        }
    }
}
