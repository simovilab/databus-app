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
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "DatabusTelemetryPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/DatabusTelemetryPlugin"),
        .testTarget(
            name: "DatabusTelemetryPluginTests",
            dependencies: ["DatabusTelemetryPlugin"],
            path: "ios/Tests/DatabusTelemetryPluginTests")
    ]
)