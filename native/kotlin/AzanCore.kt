package ir.azango.app

import android.app.AlarmManager
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import org.json.JSONArray
import org.json.JSONObject

/** Stores the event list sent by the web UI and always keeps exactly ONE alarm armed: the next event. */
object AzanCore {
    const val PREFS = "azango"
    const val CH_AZAN = "azan_playback"
    const val CH_PRE = "azan_pre"
    private const val REQ_ALARM = 1001

    fun prefs(c: Context) = c.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

    fun save(c: Context, events: String, config: String) {
        prefs(c).edit().putString("events", events).putString("config", config).apply()
    }

    fun config(c: Context): JSONObject =
        try { JSONObject(prefs(c).getString("config", "{}") ?: "{}") } catch (e: Exception) { JSONObject() }

    fun ensureChannels(c: Context) {
        if (Build.VERSION.SDK_INT < 26) return
        val nm = c.getSystemService(NotificationManager::class.java)
        val azan = NotificationChannel(CH_AZAN, "اذان", NotificationManager.IMPORTANCE_HIGH).apply {
            description = "نمایش هنگام پخش اذان و دکمه توقف"
            setSound(null, null)
            lockscreenVisibility = android.app.Notification.VISIBILITY_PUBLIC
        }
        val pre = NotificationChannel(CH_PRE, "یادآوری قبل از اذان", NotificationManager.IMPORTANCE_DEFAULT).apply {
            description = "اعلان چند دقیقه قبل از اذان"
        }
        nm.createNotificationChannel(azan)
        nm.createNotificationChannel(pre)
    }

    private fun launchIntent(c: Context): PendingIntent {
        val i = c.packageManager.getLaunchIntentForPackage(c.packageName) ?: Intent()
        return PendingIntent.getActivity(c, 0, i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    fun launchPending(c: Context) = launchIntent(c)

    private fun alarmIntent(c: Context, o: JSONObject?): PendingIntent {
        val i = Intent(c, AzanReceiver::class.java)
        if (o != null) {
            i.putExtra("t", o.getLong("t"))
            i.putExtra("type", o.optString("type", "azan"))
            i.putExtra("name", o.optString("name", ""))
            i.putExtra("min", o.optInt("min", 0))
        }
        return PendingIntent.getBroadcast(c, REQ_ALARM, i, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
    }

    /** Arms the next not-yet-fired event. Uses setAlarmClock: exact, Doze-proof, needs no special permission. */
    fun scheduleNext(c: Context) {
        val p = prefs(c)
        val am = c.getSystemService(AlarmManager::class.java)
        val arr = try { JSONArray(p.getString("events", "[]")) } catch (e: Exception) { JSONArray() }
        val last = p.getLong("last", 0L)
        val now = System.currentTimeMillis()
        var next: JSONObject? = null
        for (i in 0 until arr.length()) {
            val o = arr.optJSONObject(i) ?: continue
            val t = o.optLong("t", 0L)
            // skip already-fired events and events that are more than 2 minutes stale (e.g. phone was off)
            if (t > last && t >= now - 120_000L && (next == null || t < next.getLong("t"))) next = o
        }
        if (next == null) { am.cancel(alarmIntent(c, null)); return }
        am.setAlarmClock(AlarmManager.AlarmClockInfo(next.getLong("t"), launchIntent(c)), alarmIntent(c, next))
    }

    fun notifyPre(c: Context, name: String, min: Int) {
        ensureChannels(c)
        val nm = NotificationManagerCompat.from(c)
        if (!nm.areNotificationsEnabled()) return
        val n = NotificationCompat.Builder(c, CH_PRE)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle("اذان $name نزدیک است")
            .setContentText("$min دقیقه تا اذان $name")
            .setContentIntent(launchIntent(c))
            .setAutoCancel(true)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .build()
        try { nm.notify(2000 + (System.currentTimeMillis() % 1000).toInt(), n) } catch (e: SecurityException) { /* no permission */ }
    }
}
