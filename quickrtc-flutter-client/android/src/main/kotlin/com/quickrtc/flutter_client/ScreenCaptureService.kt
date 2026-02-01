package com.quickrtc.flutter_client

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.util.Log
import androidx.core.app.NotificationCompat
import io.flutter.plugin.common.MethodChannel

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
        const val ACTION_STOP_SCREEN_SHARE = "ACTION_STOP_SCREEN_SHARE"
        const val EXTRA_STOP_FROM_NOTIFICATION = "STOP_FROM_NOTIFICATION"
        
        // Synchronized set to track started services (following GetStream's pattern)
        private val startedServices = mutableSetOf<String>()
        private const val DEFAULT_SERVICE_KEY = "default_screen_share"
        
        // Method channel for communicating stop events to Flutter
        private var methodChannel: MethodChannel? = null
        
        // Main thread handler for invoking Flutter callbacks
        private val mainHandler = Handler(Looper.getMainLooper())
        
        // Flag to track if we're stopping due to our own cleanup (vs external stop)
        @Volatile
        private var stoppingFromOurCode = false
        
        /**
         * Set the method channel for communicating with Flutter.
         * Called from the plugin when it's attached.
         */
        fun setMethodChannel(channel: MethodChannel?) {
            methodChannel = channel
            Log.d(TAG, "Method channel ${if (channel != null) "set" else "cleared"}")
        }
        
        /**
         * Mark that we're intentionally stopping the service from Flutter code.
         * This prevents double-notification when onDestroy is called.
         */
        fun markStoppingFromOurCode() {
            stoppingFromOurCode = true
            Log.d(TAG, "Marked as stopping from our code")
        }
        
        /**
         * Notify Flutter that screen sharing was stopped from the notification.
         * This is called when the user taps the "Stop" button on the notification.
         * Must be called on the main thread for the method channel to work.
         */
        fun notifyScreenShareStopped() {
            Log.d(TAG, "notifyScreenShareStopped called, methodChannel=${methodChannel != null}")
            
            // Ensure we're on the main thread for method channel invocation
            mainHandler.post {
                Log.d(TAG, "Notifying Flutter on main thread that screen share was stopped")
                try {
                    val channel = methodChannel
                    if (channel != null) {
                        channel.invokeMethod("onScreenShareStopped", null)
                        Log.d(TAG, "Successfully invoked onScreenShareStopped on Flutter")
                    } else {
                        Log.e(TAG, "Method channel is null, cannot notify Flutter")
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to notify Flutter: ${e.message}", e)
                }
            }
        }
        
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
            stoppingFromOurCode = false  // Reset the flag when service starts
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
        Log.d(TAG, "Intent action: ${intent?.action}")
        
        // Check if this is a stop action from the notification
        if (intent?.action == ACTION_STOP_SCREEN_SHARE || 
            intent?.getBooleanExtra(EXTRA_STOP_FROM_NOTIFICATION, false) == true) {
            Log.d(TAG, "===== STOP ACTION RECEIVED FROM NOTIFICATION =====")
            // Notify Flutter first, then stop
            notifyScreenShareStopped()
            stopSelf()
            return START_NOT_STICKY
        }
        
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
        Log.d(TAG, "stoppingFromOurCode=$stoppingFromOurCode")
        
        // Check if we're being destroyed while we were still marked as running
        // AND we're not being stopped by our own code
        val wasRunning = isServiceRunning()
        Log.d(TAG, "Service was running when destroyed: $wasRunning")
        
        markServiceAsStopped()
        
        // If the service was running when destroyed and we're NOT stopping from our code,
        // this means the service was stopped externally (e.g., system killed it,
        // MediaProjection was revoked, or user clicked system's "Stop now" button)
        if (wasRunning && !stoppingFromOurCode) {
            Log.d(TAG, "===== SERVICE STOPPED EXTERNALLY - Notifying Flutter =====")
            notifyScreenShareStopped()
        } else {
            Log.d(TAG, "Service stopped by our code, not notifying Flutter (already handled)")
        }
        
        // Reset the flag
        stoppingFromOurCode = false
        
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
        // Create pending intent for the stop action - use Service intent, not Broadcast
        val stopIntent = Intent(this, ScreenCaptureService::class.java).apply {
            action = ACTION_STOP_SCREEN_SHARE
            putExtra(EXTRA_STOP_FROM_NOTIFICATION, true)
        }
        
        val stopPendingIntent = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            PendingIntent.getForegroundService(
                this,
                0,
                stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        } else {
            PendingIntent.getService(
                this,
                0,
                stopIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
        }
        
        Log.d(TAG, "Creating notification with Stop action")
        
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Screen Sharing")
            .setContentText("Tap 'Stop' to end screen sharing")
            .setSmallIcon(android.R.drawable.ic_menu_share)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setOngoing(true)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .addAction(
                android.R.drawable.ic_menu_close_clear_cancel,
                "Stop",
                stopPendingIntent
            )
            .build()
    }
}
