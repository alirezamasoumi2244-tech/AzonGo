package ir.azango.app

import android.app.Notification
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

/** Foreground service that plays the whole azan file and shows a notification with a Stop button. */
class AzanService : Service() {
    companion object { const val ACTION_STOP = "ir.azango.app.STOP"; const val NOTIF_ID = 1 }

    private var player: MediaPlayer? = null
    private var focus: AudioFocusRequest? = null
    private val attrs = AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_MUSIC).build()

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP) { stopAll(); return START_NOT_STICKY }
        AzanCore.ensureChannels(this)
        val test = intent?.getBooleanExtra("test", false) == true
        val name = intent?.getStringExtra("name") ?: ""
        try {
            ServiceCompat.startForeground(this, NOTIF_ID, notification(if (test) "" else name),
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK)
        } catch (e: Exception) { Log.e("AzanGo", "startForeground failed", e) }
        val cfg = AzanCore.config(this)
        val path = if (test) intent?.getStringExtra("path") ?: "" else cfg.optString("path", "")
        val vol = if (test) intent?.getFloatExtra("volume", 0.8f) ?: 0.8f else cfg.optDouble("volume", 0.8).toFloat()
        play(path, vol.coerceIn(0.05f, 1f))
        return START_NOT_STICKY
    }

    private fun notification(name: String): Notification {
        val stop = PendingIntent.getService(this, 2,
            Intent(this, AzanService::class.java).setAction(ACTION_STOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
        return NotificationCompat.Builder(this, AzanCore.CH_AZAN)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(if (name.isEmpty()) "آزمایش صدای اذان" else "وقت اذان $name")
            .setContentText("برای قطع صدا دکمه توقف را بزنید")
            .setContentIntent(AzanCore.launchPending(this))
            .addAction(android.R.drawable.ic_media_pause, "توقف اذان", stop)
            .setOngoing(true).setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC).build()
    }

    private fun play(path: String, vol: Float) {
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
            else mp.setDataSource(this, RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
                ?: RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION)) // no audio file chosen -> phone default
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
        releasePlayer()
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() { releasePlayer(); super.onDestroy() }
}
