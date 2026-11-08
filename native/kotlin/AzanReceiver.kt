package ir.azango.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.core.content.ContextCompat

class AzanReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        val t = i.getLongExtra("t", 0L)
        val p = AzanCore.prefs(c)
        // Duplicate-protection: never handle the same (or an older) event twice.
        if (t != 0L && t > p.getLong("last", 0L)) {
            p.edit().putLong("last", t).apply()
            val name = i.getStringExtra("name") ?: ""
            when (i.getStringExtra("type")) {
                "pre" -> AzanCore.notifyPre(c, name, i.getIntExtra("min", 0))
                else -> try {
                    ContextCompat.startForegroundService(
                        c, Intent(c, AzanService::class.java).putExtra("name", name)
                    )
                } catch (e: Exception) { android.util.Log.e("AzanGo", "cannot start service", e) }
            }
        }
        AzanCore.scheduleNext(c)
    }
}
