package com.quickrtc.flutter_client

import android.app.Activity
import android.app.Fragment
import android.app.FragmentTransaction
import android.content.Context
import android.content.Intent
import android.media.projection.MediaProjectionManager
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.ResultReceiver
import android.util.Log

/**
 * Helper class for managing MediaProjection permission requests on Android.
 * 
 * On Android 14+ (SDK 34+), MediaProjection requires:
 * 1. User grants permission via the MediaProjection dialog
 * 2. A foreground service with type "mediaProjection" must be started AFTER permission
 *    is granted but BEFORE creating the virtual display
 * 
 * This helper handles the permission request flow and stores the permission result
 * so that we can:
 * 1. Request permission first (user sees dialog)
 * 2. Start our foreground service after permission is granted
 * 3. Then call flutter_webrtc's getDisplayMedia which will use the stored permission
 * 
 * The flow is:
 * 1. Dart calls requestMediaProjectionPermission()
 * 2. This shows the system MediaProjection permission dialog
 * 3. When user grants permission, we store the Intent data
 * 4. We start the foreground service (on Android 14+, this requires the permission to be granted first)
 * 5. Dart calls flutter_webrtc's getDisplayMedia()
 * 6. flutter_webrtc will show its own dialog, but since permission is already granted,
 *    it should work (or we may need to provide the stored intent)
 */
class MediaProjectionHelper(private val activity: Activity) {
    
    companion object {
        private const val TAG = "QuickRTC:MediaProjection"
        private const val REQUEST_CODE = 1001 // Our own request code, different from flutter_webrtc's
        private const val RESULT_RECEIVER = "RESULT_RECEIVER"
        private const val REQUEST_CODE_KEY = "REQUEST_CODE"
        private const val GRANT_RESULT = "GRANT_RESULT"
        private const val PROJECTION_DATA = "PROJECTION_DATA"
    }
    
    /**
     * Stored MediaProjection permission data.
     * This is set when the user grants permission and can be used later.
     */
    var mediaProjectionData: Intent? = null
        private set
    
    /**
     * Whether MediaProjection permission has been granted
     */
    val isPermissionGranted: Boolean
        get() = mediaProjectionData != null
    
    /**
     * Request MediaProjection permission from the user.
     * 
     * This shows the system dialog for screen capture permission.
     * The callback will be invoked with the result.
     * 
     * @param callback Called with true if permission is granted, false otherwise
     */
    fun requestPermission(callback: (Boolean) -> Unit) {
        Log.d(TAG, "Requesting MediaProjection permission")
        mediaProjectionData = null
        
        val resultReceiver = object : ResultReceiver(Handler(Looper.getMainLooper())) {
            override fun onReceiveResult(requestCode: Int, resultData: Bundle?) {
                val resultCode = resultData?.getInt(GRANT_RESULT) ?: Activity.RESULT_CANCELED
                
                if (resultCode == Activity.RESULT_OK) {
                    mediaProjectionData = resultData?.getParcelable(PROJECTION_DATA)
                    Log.d(TAG, "MediaProjection permission granted, data stored")
                    callback(true)
                } else {
                    Log.d(TAG, "MediaProjection permission denied")
                    callback(false)
                }
            }
        }
        
        // Create and show the permission fragment
        val args = Bundle().apply {
            putParcelable(RESULT_RECEIVER, resultReceiver)
            putInt(REQUEST_CODE_KEY, REQUEST_CODE)
        }
        
        val fragment = MediaProjectionPermissionFragment()
        fragment.arguments = args
        
        try {
            val transaction: FragmentTransaction = activity
                .fragmentManager
                .beginTransaction()
                .add(fragment, MediaProjectionPermissionFragment::class.java.name)
            
            transaction.commit()
        } catch (e: IllegalStateException) {
            Log.e(TAG, "Failed to show permission fragment: ${e.message}")
            callback(false)
        }
    }
    
    /**
     * Clear stored MediaProjection data.
     * Call this when stopping screen capture.
     */
    fun clearPermission() {
        mediaProjectionData = null
        Log.d(TAG, "MediaProjection permission data cleared")
    }
    
    /**
     * Fragment that handles the MediaProjection permission request.
     * 
     * This is similar to how flutter_webrtc handles it, but we store the result
     * and send it back via ResultReceiver so we can control the timing.
     */
    class MediaProjectionPermissionFragment : Fragment() {
        
        private var resultReceiver: ResultReceiver? = null
        private var requestCode: Int = 0
        private var hasRequestedPermission = false
        
        override fun onCreate(savedInstanceState: Bundle?) {
            super.onCreate(savedInstanceState)
            Log.d(TAG, "Permission fragment created")
            
            arguments?.let { args ->
                resultReceiver = args.getParcelable(RESULT_RECEIVER)
                requestCode = args.getInt(REQUEST_CODE_KEY, REQUEST_CODE)
            }
        }
        
        override fun onResume() {
            super.onResume()
            
            // Only request once
            if (!hasRequestedPermission) {
                hasRequestedPermission = true
                requestMediaProjection()
            }
        }
        
        private fun requestMediaProjection() {
            val activity = activity ?: run {
                Log.e(TAG, "Activity is null")
                sendResult(Activity.RESULT_CANCELED, null)
                return
            }
            
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) {
                Log.w(TAG, "MediaProjection requires API 21+")
                sendResult(Activity.RESULT_CANCELED, null)
                return
            }
            
            try {
                val mediaProjectionManager = activity.getSystemService(Context.MEDIA_PROJECTION_SERVICE) as MediaProjectionManager
                Log.d(TAG, "Starting MediaProjection permission request")
                startActivityForResult(
                    mediaProjectionManager.createScreenCaptureIntent(),
                    requestCode
                )
            } catch (e: Exception) {
                Log.e(TAG, "Failed to request MediaProjection: ${e.message}")
                sendResult(Activity.RESULT_CANCELED, null)
            }
        }
        
        override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
            super.onActivityResult(requestCode, resultCode, data)
            
            Log.d(TAG, "Permission fragment got result: requestCode=$requestCode, resultCode=$resultCode")
            
            if (requestCode == this.requestCode) {
                sendResult(resultCode, data)
            }
        }
        
        private fun sendResult(resultCode: Int, data: Intent?) {
            val resultData = Bundle().apply {
                putInt(GRANT_RESULT, resultCode)
                if (data != null) {
                    putParcelable(PROJECTION_DATA, data)
                }
            }
            
            resultReceiver?.send(requestCode, resultData)
            finish()
        }
        
        private fun finish() {
            activity?.let {
                try {
                    it.fragmentManager
                        .beginTransaction()
                        .remove(this)
                        .commitAllowingStateLoss()
                } catch (e: Exception) {
                    Log.w(TAG, "Failed to remove fragment: ${e.message}")
                }
            }
        }
    }
}
