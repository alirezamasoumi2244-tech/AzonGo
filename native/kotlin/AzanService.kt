package ir.azango.app

import android.app.Notification
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.RingtoneManager
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.core.app.ServiceCompat
import java.io.File

/** Foreground service: plays the whole azan file, shows a notification (mute/stop) and opens the azan screen. */
class AzanService : Service() {
    companion object {
        const val ACTION_STOP = "ir.azango.app.STOP"
        const val ACTION_MUTE = "ir.azango.app.MUTE"
        const val NOTIF_ID = 1
        // Read by AzanPlugin.state() so the web UI knows when to show the azan screen.
        @Volatile var playing = false
        @Volatile var muted = false
        @Volatile var name = ""
        @Volatile var startedAt = 0L
    }

    private var player: MediaPlayer? = null
    private var focus: AudioFocusRequest? = null
    private var vol = 0.8f
    private var isTest = false
    private val attrs = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP -> { stopAll(); return START_NOT_STICKY }
            ACTION_MUTE -> {
                if (!playing) { stopSelf(); return START_NOT_STICKY }
                setMuted(intent?.getBooleanExtra("on", true) ?: true)
                return START_NOT_STICKY
            }
        }
        AzanCore.ensureChannels(this)
        isTest = intent?.getBooleanExtra("test", false) == true
        name = if (isTest) "" else (intent?.getStringExtra("name") ?: "")
        muted = false; playing = true; startedAt = System.currentTimeMillis()
        try {
            ServiceCompat.startForeground(this, NOTIF_ID, notification(),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        } catch (e: Exception) { Log.e("AzanGo", "startForeground failed", e) }
        val cfg = AzanCore.config(this)
        val path = if (isTest) intent?.getStringExtra("path") ?: "" else cfg.optString("path", "")
        vol = (if (isTest) intent?.getFloatExtra("volume", 0.8f) ?: 0.8f else cfg.optDouble("volume", 0.8).toFloat()).coerceIn(0.05f, 1f)
        play(path)
        return START_NOT_STICKY
    }

    private fun notification(): Notification {
        val fl = PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        val self = { Intent(this, AzanService::class.java) }
        val stop = PendingIntent.getService(this, 2, self().setAction(ACTION_STOP), fl)
        val mute = PendingIntent.getService(this, 4, self().setAction(ACTION_MUTE).putExtra("on", !muted), fl)
        // Opens the app on the azan screen (also over the lock screen via full-screen intent).
        val open = PendingIntent.getActivity(this, 3,
            Intent(this, MainActivity::class.java).putExtra("azan", true)
                .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP), fl)
        val b = NotificationCompat.Builder(this, AzanCore.CH_AZAN)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(if (name.isEmpty()) "آزمایش صدای اذان" else "وقت اذان $name")
            .setContentText(if (muted) "صدا قطع شد" else "برای قطع صدا یا توقف، دکمه‌ها را بزنید")
            .setContentIntent(open)
            .addAction(android.R.drawable.ic_lock_silent_mode, if (muted) "پخش صدا" else "قطع صدا", mute)
            .addAction(android.R.drawable.ic_media_pause, "توقف اذان", stop)
            .setOngoing(true).setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        if (!isTest) b.setFullScreenIntent(open, true)
        return b.build()
    }

    private fun setMuted(on: Boolean) {
        muted = on
        val v = if (on) 0f else vol
        try { player?.setVolume(v, v) } catch (_: Exception) {}
        try { getSystemService(NotificationManager::class.java).notify(NOTIF_ID, notification()) } catch (_: Exception) {}
    }

    private fun play(path: String) {
        releasePlayer()
        try {
            val am = getSystemService(AudioManager::class.java)
            if (Build.VERSION.SDK_INT >= 26) {
                focus = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT).setAudioAttributes(attrs).build()
                am.requestAudioFocus(focus!!)
            }
            val mp = MediaPlayer()
            mp.setAudioAttributes(attrs)
            mp.setWakeMode(applicationContext, PowerManager.PARTIAL_WAKE_LOCK)
            val f = if (path.isNotEmpty()) File(path) else null
            if (f != null && f.exists() && f.length() > 0) mp.setDataSource(f.absolutePath)
            else try {  // built-in azan (res/raw/azan_default.mp3)
                resources.openRawResourceFd(R.raw.azan_default).use { afd -> mp.setDataSource(afd.fileDescriptor, afd.startOffset, afd.length) }
            } catch (e: Exception) {  // built-in file unavailable -> phone's default alarm sound
                mp.setDataSource(this, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                    ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
            }
            mp.setVolume(vol, vol)
            mp.setOnPreparedListener { it.start() }
            mp.setOnCompletionListener { stopAll() }
            mp.setOnErrorListener { _, w, e -> Log.e("AzanGo", "player error $w/$e"); stopAll(); true }
            mp.prepareAsync()
            player = mp
        } catch (e: Exception) { Log.e("AzanGo", "play failed", e); stopAll() }
    }

    private fun releasePlayer() {
        try { player?.stop() } catch (_: Exception) {}
        try { player?.release() } catch (_: Exception) {}
        player = null
        if (Build.VERSION.SDK_INT >= 26) focus?.let { getSystemService(AudioManager::class.java).abandonAudioFocusRequest(it) }
        focus = null
    }

    private fun stopAll() {
        playing = false; muted = false
        releasePlayer()
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() { playing = false; releasePlayer(); super.onDestroy() }
}
