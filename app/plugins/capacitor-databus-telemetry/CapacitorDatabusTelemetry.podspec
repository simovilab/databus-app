require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  s.name = 'CapacitorDatabusTelemetry'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = package['repository']['url']
  s.author = package['author']
  s.source = { :git => package['repository']['url'], :tag => s.version.to_s }
  s.source_files = 'ios/Sources/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target = '15.0'
  s.dependency 'Capacitor'
  # MQTT 3.1.1/5 over TCP+TLS (R5). CocoaMQTT is the most-maintained Swift
  # MQTT client with first-class TLS, auto-reconnect, and background-safe
  # sockets (no extra threading). MIT. See README for the lib-choice rationale.
  s.dependency 'CocoaMQTT', '~> 2.0'
  s.swift_version = '5.1'
end
