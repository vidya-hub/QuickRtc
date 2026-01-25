package com.quickrtc.flutter_client

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

/**
 * Foreground service required for screen capture on Android 10+ (API 29+).
 * 
 * On Android 14+ (API 34+), the FOREGROUND_SERVICE_MEDIA_PROJECTION permission
 * must be declared in the app's AndroidManifest.xml in addition to the plugin's manifest.
 * 
 * This implementation follows GetStream's proven pattern for Android 14+ compatibility:
 * - Uses a synchronized static set to track service state
 * - Service state is set AFTER startForeground() succeeds
 * - Dart code polls for readiness instead of blocking
 */
class ScreenCaptureService : Service() {
    
    companion object {
        private const val TAG = "QuickRTC:ScreenCapture"
        const val CHANNEL_ID = "quickrtc_screen_capture_channel"
        const val NOTIFICATION_ID = 9999
        
        // Synchronized set to track started services (following GetStream's pattern)
        private val startedServices = mutableSetOf<String>()
        private const val DEFAULT_SERVICE_KEY = "default_screen_share"
        
        /**
         * Check if the screen capture service is running and foreground started.
         * This is polled from Dart to ensure the service is ready before MediaProjection.
         */
        @Synchronized
        fun isServiceRunning(): Boolean {
            val running = startedServices.contains(DEFAULT_SERVICE_KEY)
            Log.d(TAG, "isServiceRunning() = $running")
            return running
        }
        
        @Synchronized
        private fun markServiceAsStarted() {
            startedServices.add(DEFAULT_SERVICE_KEY)
            Log.d(TAG, "markServiceAsStarted: Service marked as ready")
        }
        
        @Synchronized
        private fun markServiceAsStopped() {
            startedServices.remove(DEFAULT_SERVICE_KEY)
            Log.d(TAG, "markServiceAsStopped: Service marked as stopped")
        }
        
        // Legacy getter for backward compatibility
        val isRunning: Boolean
            get() = isServiceRunning()
    }
    
    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "===== Service onCreate =====")
        Log.d(TAG, "Thread: ${Thread.currentThread().name}")
        Log.d(TAG, "SDK Version: ${Build.VERSION.SDK_INT}")
        createNotificationChannel()
    }
    
    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        Log.d(TAG, "===== Service onStartCommand =====")
        Log.d(TAG, "Thread: ${Thread.currentThread().name}")
        Log.d(TAG, "SDK: ${Build.VERSION.SDK_INT}, Intent: $intent, StartId: $startId")
        
        val notification = createNotification()
        
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                // Android 14+ (API 34+) - explicit foreground service type is required
                Log.d(TAG, "Calling startForeground() with FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION (Android 14+)")
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
                )
                Log.d(TAG, "startForeground() returned successfully (Android 14+)")
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10-13 (API 29-33)
                Log.d(TAG, "Calling startForeground() with FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION (Android 10-13)")
                startForeground(
                    NOTIFICATION_ID,
                    notification,
                    ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PROJECTION
                )
                Log.d(TAG, "startForeground() returned successfully (Android 10-13)")
            } else {
                // Android 9 and below
                Log.d(TAG, "Calling startForeground() without type (Android 9 and below)")
                startForeground(NOTIFICATION_ID, notification)
                Log.d(TAG, "startForeground() returned successfully (Android 9-)")
            }
            
            // CRITICAL: Mark as started AFTER startForeground() succeeds
            // This is the key to Android 14+ compatibility
            markServiceAsStarted()
            Log.d(TAG, "===== Foreground service FULLY STARTED =====")
            
        } catch (e: SecurityException) {
            Log.e(TAG, "===== SecurityException in startForeground =====")
            Log.e(TAG, "Message: ${e.message}")
            Log.e(TAG, "Ensure FOREGROUND_SERVICE_MEDIA_PROJECTION permission is declared in your app's AndroidManifest.xml")
            markServiceAsStopped()
            throw e
        } catch (e: Exception) {
            Log.e(TAG, "===== Exception in startForeground =====")
            Log.e(TAG, "Type: ${e.javaClass.simpleName}, Message: ${e.message}")
            markServiceAsStopped()
            throw e
        }
        
        return START_STICKY
    }
    
    override fun onBind(intent: Intent?): IBinder? {
        Log.d(TAG, "Service onBind")
        return null
    }
    
    override fun onDestroy() {
        Log.d(TAG, "===== Service onDestroy =====")
        markServiceAsStopped()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        super.onDestroy()
    }
    
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Screen Sharing",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Used for screen sharing in video calls"
                setShowBadge(false)
            }
            
            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
            Log.d(TAG, "Notification channel created")
        }
    }
    
    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Screen Sharing")
            .setContentText("Your screen is being shared")
            .setSmallIcon(android.R.drawable.ic_menu_share)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .build()
    }
}
