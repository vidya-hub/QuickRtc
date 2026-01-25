package com.quickrtc.flutter_client

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import io.flutter.embedding.engine.plugins.FlutterPlugin
import io.flutter.embedding.engine.plugins.activity.ActivityAware
import io.flutter.embedding.engine.plugins.activity.ActivityPluginBinding
import io.flutter.plugin.common.MethodCall
import io.flutter.plugin.common.MethodChannel
import io.flutter.plugin.common.MethodChannel.MethodCallHandler
import io.flutter.plugin.common.MethodChannel.Result
import io.flutter.plugin.common.PluginRegistry

/**
 * QuickRTC Flutter Client Plugin
 * 
 * Handles Android-specific functionality for screen sharing, including:
 * - Foreground service management for MediaProjection (Android 10+)
 * 
 * On Android 14+ (SDK 34+), the flow is:
 * 1. Dart calls flutter_webrtc's Helper.requestCapturePermission()
 *    - This shows the system MediaProjection permission dialog
 *    - User grants permission
 *    - flutter_webrtc stores the mediaProjectionData internally
 * 2. Dart calls startScreenCaptureService() to start our foreground service
 *    - This is now allowed because permission was granted
 * 3. Dart calls flutter_webrtc's getDisplayMedia()
 *    - flutter_webrtc sees mediaProjectionData is cached, skips dialog
 *    - Creates MediaProjection using the stored data (service is running, so this succeeds)
 * 
 * On Android 10-13, the flow is:
 * 1. Dart calls startScreenCaptureService() first
 * 2. Dart calls flutter_webrtc's getDisplayMedia() (shows permission dialog)
 */
class QuickRtcFlutterClientPlugin: FlutterPlugin, MethodCallHandler, ActivityAware, 
    PluginRegistry.ActivityResultListener {
    
    companion object {
        private const val TAG = "QuickRTC:Plugin"
    }
    
    private lateinit var channel: MethodChannel
    private var context: Context? = null
    private var activity: Activity? = null
    private var activityBinding: ActivityPluginBinding? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    
    // Monitor for flutter_webrtc's permission fragment
    private var mediaProjectionMonitor: MediaProjectionMonitor? = null

    override fun onAttachedToEngine(flutterPluginBinding: FlutterPlugin.FlutterPluginBinding) {
        channel = MethodChannel(flutterPluginBinding.binaryMessenger, "quickrtc_flutter_client")
        channel.setMethodCallHandler(this)
        context = flutterPluginBinding.applicationContext
    }

    override fun onMethodCall(call: MethodCall, result: Result) {
        when (call.method) {
            "prepareScreenCapture" -> {
                // On Android 14+, start monitoring for flutter_webrtc's permission fragment
                prepareScreenCapture(result)
            }
            "startScreenCaptureService" -> {
                // Start the foreground service
                // On Android 14+, this should be called AFTER the user has granted
                // MediaProjection permission (via requestCapturePermission)
                startScreenCaptureService(result)
            }
            "stopScreenCaptureService" -> {
                stopScreenCaptureService()
                mediaProjectionMonitor?.stopMonitoring()
                result.success(true)
            }
            "isScreenCaptureServiceRunning" -> {
                result.success(ScreenCaptureService.isRunning)
            }
            "getAndroidSdkVersion" -> {
                result.success(Build.VERSION.SDK_INT)
            }
            "getPlatformVersion" -> {
                result.success("Android ${Build.VERSION.RELEASE}")
            }
            else -> {
                result.notImplemented()
            }
        }
    }
    
    /**
     * Prepare for screen capture on Android 14+.
     * 
     * This sets up monitoring for flutter_webrtc's permission fragment so we can
     * start the foreground service at the right moment.
     * 
     * Call this BEFORE calling flutter_webrtc's getDisplayMedia().
     */
    private fun prepareScreenCapture(result: Result) {
        val currentActivity = activity
        if (currentActivity == null) {
            Log.e(TAG, "Activity is null, cannot prepare screen capture")
            result.error("NO_ACTIVITY", "Activity is not available", null)
            return
        }
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
            Log.d(TAG, "Android 14+: Setting up permission fragment monitor")
            
            // Clean up any existing monitor
            mediaProjectionMonitor?.stopMonitoring()
            
            // Create new monitor
            mediaProjectionMonitor = MediaProjectionMonitor(currentActivity) {
                // This is called when flutter_webrtc's permission fragment is destroyed
                // (which happens after the user grants or denies permission)
                mainHandler.post {
                    try {
                        Log.d(TAG, "Permission fragment completed, starting foreground service")
                        startScreenCaptureServiceInternal()
                        Log.d(TAG, "Foreground service started successfully")
                    } catch (e: Exception) {
                        Log.e(TAG, "Failed to start foreground service: ${e.message}", e)
                    }
                }
            }
            
            mediaProjectionMonitor?.startMonitoring()
            result.success(true)
        } else {
            // Android 10-13: No monitoring needed, service is started separately
            Log.d(TAG, "Android < 14: No monitoring needed")
            result.success(true)
        }
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?): Boolean {
        // Not used anymore - we use fragment lifecycle monitoring instead
        return false
    }

    private fun startScreenCaptureService(result: Result) {
        try {
            Log.d(TAG, "===== startScreenCaptureService called =====")
            
            // Check if service is already running
            if (ScreenCaptureService.isServiceRunning()) {
                Log.d(TAG, "Service already running")
                result.success(true)
                return
            }
            
            // Start the service - this is async, service will start in background
            startScreenCaptureServiceInternal()
            
            // Return immediately - Dart will poll for readiness
            // This follows GetStream's proven pattern
            Log.d(TAG, "Service start requested, returning true")
            result.success(true)
        } catch (e: Exception) {
            Log.e(TAG, "Error starting screen capture service: ${e.message}")
            result.error("SERVICE_ERROR", e.message, null)
        }
    }

    private fun startScreenCaptureServiceInternal() {
        val ctx = context ?: throw IllegalStateException("Context is null")
        
        Log.d(TAG, "Starting ScreenCaptureService (SDK: ${Build.VERSION.SDK_INT})")
        val serviceIntent = Intent(ctx, ScreenCaptureService::class.java)
        
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ctx.startForegroundService(serviceIntent)
        } else {
            ctx.startService(serviceIntent)
        }
        
        Log.d(TAG, "ScreenCaptureService start requested")
    }

    private fun stopScreenCaptureService() {
        context?.let { ctx ->
            Log.d(TAG, "Stopping ScreenCaptureService")
            val serviceIntent = Intent(ctx, ScreenCaptureService::class.java)
            ctx.stopService(serviceIntent)
        }
    }

    override fun onDetachedFromEngine(binding: FlutterPlugin.FlutterPluginBinding) {
        channel.setMethodCallHandler(null)
    }

    override fun onAttachedToActivity(binding: ActivityPluginBinding) {
        activity = binding.activity
        activityBinding = binding
        binding.addActivityResultListener(this)
        Log.d(TAG, "Attached to activity")
    }

    override fun onDetachedFromActivityForConfigChanges() {
        activityBinding?.removeActivityResultListener(this)
        mediaProjectionMonitor?.stopMonitoring()
        activity = null
        activityBinding = null
        mediaProjectionMonitor = null
    }

    override fun onReattachedToActivityForConfigChanges(binding: ActivityPluginBinding) {
        activity = binding.activity
        activityBinding = binding
        binding.addActivityResultListener(this)
    }

    override fun onDetachedFromActivity() {
        activityBinding?.removeActivityResultListener(this)
        mediaProjectionMonitor?.stopMonitoring()
        activity = null
        activityBinding = null
        mediaProjectionMonitor = null
    }
}
