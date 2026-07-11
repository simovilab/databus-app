import Foundation

@objc public class DatabusTelemetry: NSObject {
    @objc public func echo(_ value: String) -> String {
        print(value)
        return value
    }
}
