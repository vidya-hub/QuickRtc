Pod::Spec.new do |s|
  s.name             = 'quickrtc_flutter_client'
  s.version          = '1.0.2'
  s.summary          = 'QuickRTC Flutter Client Plugin'
  s.description      = <<-DESC
A Flutter WebRTC client library built on MediaSoup for real-time video conferencing.
                       DESC
  s.homepage         = 'https://github.com/vidya-hub/QuickRTC'
  s.license          = { :file => '../LICENSE' }
  s.author           = { 'QuickRTC' => 'info@quickrtc.dev' }
  s.source           = { :path => '.' }
  s.source_files = 'Classes/**/*'
  s.dependency 'FlutterMacOS'
  s.platform = :osx, '10.14'
  
  # Required frameworks for screen capture permission checks
  s.frameworks = 'CoreGraphics'

  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.swift_version = '5.0'
end
