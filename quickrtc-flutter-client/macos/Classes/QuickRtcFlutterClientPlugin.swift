import Cocoa
import FlutterMacOS
import CoreGraphics

@available(macOS 10.14, *)
public class QuickRtcFlutterClientPlugin: NSObject, FlutterPlugin, @unchecked Sendable {
    
    public static func register(with registrar: FlutterPluginRegistrar) {
        let channel = FlutterMethodChannel(name: "quickrtc_flutter_client", binaryMessenger: registrar.messenger)
        let instance = QuickRtcFlutterClientPlugin()
        registrar.addMethodCallDelegate(instance, channel: channel)
    }

    public func handle(_ call: FlutterMethodCall, result: @escaping FlutterResult) {
        switch call.method {
        case "startScreenCaptureService":
            result(true)
            
        case "stopScreenCaptureService":
            result(true)
            
        case "isScreenCaptureServiceRunning":
            result(true)
            
        case "checkScreenCapturePermission":
            let hasPermission = checkScreenCapturePermission()
            result(hasPermission)
            
        case "requestScreenCapturePermission":
            requestScreenCapturePermission(result: result)
            
        case "openScreenCaptureSettings":
            openScreenCaptureSettings()
            result(true)
            
        case "getPlatformVersion":
            result("macOS " + ProcessInfo.processInfo.operatingSystemVersionString)
            
        default:
            result(FlutterMethodNotImplemented)
        }
    }
    
    // MARK: - Screen Capture Permission
    
    /// Check if screen capture permission is granted using multiple methods
    private func checkScreenCapturePermission() -> Bool {
        if #available(macOS 10.15, *) {
            // Method 1: Use CGPreflightScreenCaptureAccess (most reliable)
            let preflightResult = CGPreflightScreenCaptureAccess()
            print("QuickRTC: CGPreflightScreenCaptureAccess result: \(preflightResult)")
            
            if preflightResult {
                return true
            }
            
            // Method 2: Try to capture a small part of the screen
            let displayID = CGMainDisplayID()
            if CGDisplayCreateImage(displayID, rect: CGRect(x: 0, y: 0, width: 1, height: 1)) != nil {
                // If we can capture even 1 pixel, we have permission
                print("QuickRTC: Screen capture test successful")
                return true
            }
            
            print("QuickRTC: Screen capture permission not granted")
            return false
        } else {
            // On older macOS versions, screen capture doesn't require explicit permission
            return true
        }
    }
    
    /// Request screen capture permission (opens System Preferences)
    private func requestScreenCapturePermission(result: @escaping FlutterResult) {
        if #available(macOS 10.15, *) {
            // CGRequestScreenCaptureAccess will show the permission dialog
            // It returns true if permission was already granted
            let granted = CGRequestScreenCaptureAccess()
            
            if granted {
                print("QuickRTC: Screen capture permission already granted")
                result(true)
            } else {
                print("QuickRTC: Screen capture permission request initiated")
                // The system will show a dialog, but we need to open System Preferences
                // for the user to actually grant permission
                openScreenCaptureSettings()
                
                // We can't know if they granted permission, so return false
                // They'll need to restart the app after granting permission
                result(false)
            }
        } else {
            // On older macOS versions, screen capture doesn't require explicit permission
            result(true)
        }
    }
    
    /// Open System Preferences to Screen Recording settings
    private func openScreenCaptureSettings() {
        if #available(macOS 13.0, *) {
            // macOS 13+ uses new Settings app
            if let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture") {
                NSWorkspace.shared.open(url)
            }
        } else {
            // macOS 12 and earlier use System Preferences
            let prefpaneUrl = URL(fileURLWithPath: "/System/Library/PreferencePanes/Security.prefPane")
            NSWorkspace.shared.open(prefpaneUrl)
        }
    }
}
