package com.quickrtc.flutter_client

import android.app.Activity
import android.app.Application
import android.app.Fragment
import android.app.FragmentManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log

/**
 * Monitors flutter_webrtc's ScreenRequestPermissionsFragment to detect when
 * MediaProjection permission is granted, so we can start the foreground service
 * at the right time on Android 14+.
 * 
 * flutter_webrtc uses a Fragment to handle the permission dialog, and the result
 * is sent via ResultReceiver. We can't intercept the ResultReceiver, but we can
 * detect when the fragment is about to be removed (which happens after the result
 * is processed).
 * 
 * The approach:
 * 1. Register a FragmentLifecycleCallbacks on the activity
 * 2. When we see flutter_webrtc's ScreenRequestPermissionsFragment being added,
 *    we know a permission request is starting
 * 3. When that fragment is detached/destroyed, and the activity result was RESULT_OK,
 *    we quickly start the foreground service
 * 
 * This is a bit hacky but it's the only way to intercept flutter_webrtc's
 * permission flow without modifying its source code.
 */
class MediaProjectionMonitor(
    private val activity: Activity,
    private val onPermissionGranted: () -> Unit
) {
    companion object {
        private const val TAG = "QuickRTC:Monitor"
        private const val FLUTTER_WEBRTC_FRAGMENT = "com.cloudwebrtc.webrtc.GetUserMediaImpl\$ScreenRequestPermissionsFragment"
    }
    
    private var fragmentCallbacks: FragmentManager.FragmentLifecycleCallbacks? = null
    private var isMonitoring = false
    private var permissionFragmentDetected = false
    
    /**
     * Start monitoring for flutter_webrtc's permission fragment.
     * Call this before flutter_webrtc's getDisplayMedia is invoked.
     */
    fun startMonitoring() {
        if (isMonitoring) return
        
        Log.d(TAG, "Starting to monitor for flutter_webrtc permission fragment")
        
        fragmentCallbacks = object : FragmentManager.FragmentLifecycleCallbacks() {
            override fun onFragmentCreated(fm: FragmentManager, f: Fragment, savedInstanceState: Bundle?) {
                val fragmentClass = f.javaClass.name
                Log.d(TAG, "Fragment created: $fragmentClass")
                
                if (fragmentClass == FLUTTER_WEBRTC_FRAGMENT) {
                    Log.d(TAG, "Detected flutter_webrtc ScreenRequestPermissionsFragment")
                    permissionFragmentDetected = true
                }
            }
            
            override fun onFragmentDestroyed(fm: FragmentManager, f: Fragment) {
                val fragmentClass = f.javaClass.name
                Log.d(TAG, "Fragment destroyed: $fragmentClass")
                
                if (fragmentClass == FLUTTER_WEBRTC_FRAGMENT && permissionFragmentDetected) {
                    Log.d(TAG, "flutter_webrtc permission fragment destroyed - checking if permission was granted")
                    permissionFragmentDetected = false
                    
                    // The fragment is destroyed after onActivityResult processes.
                    // At this point, if the user granted permission, flutter_webrtc
                    // will soon try to create the virtual display.
                    // We need to start the foreground service NOW.
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                        Log.d(TAG, "Android 14+: Starting foreground service after permission fragment destroyed")
                        onPermissionGranted()
                    }
                }
            }
        }
        
        try {
            activity.fragmentManager.registerFragmentLifecycleCallbacks(fragmentCallbacks!!, false)
            isMonitoring = true
            Log.d(TAG, "Fragment lifecycle callbacks registered")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to register fragment callbacks: ${e.message}")
        }
    }
    
    /**
     * Stop monitoring. Call this after screen capture is started or cancelled.
     */
    fun stopMonitoring() {
        if (!isMonitoring) return
        
        fragmentCallbacks?.let { callbacks ->
            try {
                activity.fragmentManager.unregisterFragmentLifecycleCallbacks(callbacks)
                Log.d(TAG, "Fragment lifecycle callbacks unregistered")
            } catch (e: Exception) {
                Log.w(TAG, "Failed to unregister callbacks: ${e.message}")
            }
        }
        
        fragmentCallbacks = null
        isMonitoring = false
        permissionFragmentDetected = false
    }
}
