import XCTest
@testable import DatabusTelemetryPlugin

/// Smoke tests for the store-and-forward buffer (the only pure-logic unit).
/// Full MQTT/GPS behavior is a device test (see README "Manual device-test
/// steps"). These keep the SPM `swift test` target green.
final class DatabusTelemetryTests: XCTestCase {

    func testBufferAddAndDrainFIFO() {
        let buffer = DatabusTelemetryBuffer(maxSize: 3)
        let f1 = DatabusTelemetryFix(latitude: 1, longitude: 1, bearing: nil, speed: nil, timestamp: 1)
        let f2 = DatabusTelemetryFix(latitude: 2, longitude: 2, bearing: nil, speed: nil, timestamp: 2)
        let f3 = DatabusTelemetryFix(latitude: 3, longitude: 3, bearing: nil, speed: nil, timestamp: 3)

        buffer.add(f1)
        buffer.add(f2)
        buffer.add(f3)
        XCTAssertEqual(buffer.count, 3)

        let drained = buffer.drain()
        XCTAssertEqual(drained.count, 3)
        // FIFO publish order.
        XCTAssertEqual(drained[0].timestamp, 1)
        XCTAssertEqual(drained[1].timestamp, 2)
        XCTAssertEqual(drained[2].timestamp, 3)
        XCTAssertEqual(buffer.count, 0)
    }

    func testBufferDropHeadWhenOverCapacity() {
        let buffer = DatabusTelemetryBuffer(maxSize: 2)
        let f1 = DatabusTelemetryFix(latitude: 1, longitude: 1, bearing: nil, speed: nil, timestamp: 1)
        let f2 = DatabusTelemetryFix(latitude: 2, longitude: 2, bearing: nil, speed: nil, timestamp: 2)
        let f3 = DatabusTelemetryFix(latitude: 3, longitude: 3, bearing: nil, speed: nil, timestamp: 3)

        buffer.add(f1)
        buffer.add(f2)
        buffer.add(f3) // over cap → oldest (f1) dropped

        XCTAssertEqual(buffer.count, 2)
        let drained = buffer.drain()
        XCTAssertEqual(drained[0].timestamp, 2)
        XCTAssertEqual(drained[1].timestamp, 3)
    }
}
