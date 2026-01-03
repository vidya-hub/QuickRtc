import Flutter
import UIKit

public class QuickRtcFlutterClientPlugin: NSObject, FlutterPlugin {
    public static func register(with registrar: FlutterPluginRegistrar) {
        let channel = FlutterMethodChannel(name: "quickrtc_flutter_client", binaryMessenger: registrar.messenger())
        let instance = QuickRtcFlutterClientPlugin()
        registrar.addMethodCallDelegate(instance, channel: channel)
    }

    public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "startScreenCaptureService":
            // iOS doesn't need a foreground service for screen capture
            // ReplayKit handles this automatically
            result(true)
        case "stopScreenCaptureService":
            // No-op on iOS
            result(true)
        case "isScreenCaptureServiceRunning":
            // On iOS, we don't have a separate service
            result(true)
        case "getPlatformVersion":
            result("iOS " + UIDevice.current.systemVersion)
        default:
            result(FlutterMethodNotImplemented)
        }
    }
}
