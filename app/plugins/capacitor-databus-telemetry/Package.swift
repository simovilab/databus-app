// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "CapacitorDatabusTelemetry",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapacitorDatabusTelemetry",
            targets: ["DatabusTelemetryPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0"),
        // MQTT 3.1.1/5 over TCP+TLS (R5). CocoaMQTT — Swift, TLS, auto-reconnect.
        .package(url: "https://github.com/emqx/CocoaMQTT.git", from: "2.0.0")
    ],
    targets: [
        .target(
            name: "DatabusTelemetryPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CocoaMQTT", package: "CocoaMQTT")
            ],
            path: "ios/Sources/DatabusTelemetryPlugin"),
        .testTarget(
            name: "DatabusTelemetryPluginTests",
            dependencies: ["DatabusTelemetryPlugin"],
            path: "ios/Tests/DatabusTelemetryPluginTests")
    ]
)