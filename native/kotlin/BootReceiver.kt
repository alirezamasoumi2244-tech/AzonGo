package ir.azango.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

/** Re-arms the next alarm after reboot, app update, clock change or time-zone change. */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(c: Context, i: Intent) {
        when (i.action) {
            Intent.ACTION_BOOT_COMPLETED, Intent.ACTION_MY_PACKAGE_REPLACED,
            Intent.ACTION_TIME_CHANGED, Intent.ACTION_TIMEZONE_CHANGED -> AzanCore.scheduleNext(c)
        }
    }
}
