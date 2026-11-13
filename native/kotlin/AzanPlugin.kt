package ir.azango.app

import android.Manifest
import android.app.Activity
import android.app.NotificationManager
import android.content.ActivityNotFoundException
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.OpenableColumns
import android.provider.Settings
import android.view.WindowManager
import androidx.activity.result.ActivityResult
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONArray
import java.io.File

@CapacitorPlugin(name = "AzanPlugin")
class AzanPlugin : Plugin() {

    @PluginMethod
    fun schedule(call: PluginCall) {
        try {
            val events = call.getString("events") ?: "[]"
            AzanCore.save(context, events, call.getString("config") ?: "{}")
            AzanCore.scheduleNext(context)
            call.resolve(JSObject().put("count", JSONArray(events).length()))
        } catch (e: Exception) { call.reject(e.message ?: "schedule failed") }
    }

    @PluginMethod
    fun play(call: PluginCall) {
        try {
            val i = Intent(context, AzanService::class.java)
                .putExtra("test", true)
                .putExtra("path", call.getString("path") ?: "")
                .putExtra("volume", call.getFloat("volume") ?: 0.8f)
            ContextCompat.startForegroundService(context, i)
            call.resolve()
        } catch (e: Exception) { call.reject(e.message ?: "play failed") }
    }

    @PluginMethod
    fun stop(call: PluginCall) {
        try { context.startService(Intent(context, AzanService::class.java).setAction(AzanService.ACTION_STOP)) } catch (_: Exception) {}
        call.resolve()
    }

    @PluginMethod
    fun importAudio(call: PluginCall) {
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply { addCategory(Intent.CATEGORY_OPENABLE); type = "audio/*" }
        startActivityForResult(call, intent, "audioPicked")
    }

    @ActivityCallback
    fun audioPicked(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        val uri: Uri? = result.data?.data
        if (result.resultCode != Activity.RESULT_OK || uri == null) { call.reject("انتخاب لغو شد"); return }
        try {
            val id = (call.getString("id") ?: "x").filter { it.isLetterOrDigit() }
            val out = File(File(context.filesDir, "azan").apply { mkdirs() }, "azan_$id.audio")
            val input = context.contentResolver.openInputStream(uri) ?: run { call.reject("فایل خوانده نشد"); return }
            input.use { ins -> out.outputStream().use { ins.copyTo(it) } }
            if (out.length() < 1000) { out.delete(); call.reject("فایل خالی یا نامعتبر است"); return }
            var name = ""
            context.contentResolver.query(uri, null, null, null, null)?.use { c ->
                if (c.moveToFirst()) { val ix = c.getColumnIndex(OpenableColumns.DISPLAY_NAME); if (ix >= 0) name = c.getString(ix) ?: "" }
            }
            call.resolve(JSObject().put("path", out.absolutePath).put("name", name))
        } catch (e: Exception) { call.reject(e.message ?: "import failed") }
    }

    @PluginMethod
    fun askNotifications(call: PluginCall) {
        if (Build.VERSION.SDK_INT >= 33 &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(activity, arrayOf(Manifest.permission.POST_NOTIFICATIONS), 7001)
        }
        call.resolve(JSObject().put("notifications", NotificationManagerCompat.from(context).areNotificationsEnabled()))
    }

    @PluginMethod
    fun status(call: PluginCall) {
        val pm = context.getSystemService(PowerManager::class.java)
        call.resolve(JSObject()
            .put("notifications", NotificationManagerCompat.from(context).areNotificationsEnabled())
            .put("ignoringBattery", pm.isIgnoringBatteryOptimizations(context.packageName))
            .put("fullScreen", canFullScreen()))
    }

    private fun canFullScreen(): Boolean =
        if (Build.VERSION.SDK_INT >= 34) context.getSystemService(NotificationManager::class.java).canUseFullScreenIntent() else true

    /** Tells the web UI whether the azan is playing right now (it then shows the azan screen). */
    @PluginMethod
    fun state(call: PluginCall) {
        call.resolve(JSObject()
            .put("playing", AzanService.playing).put("muted", AzanService.muted)
            .put("name", AzanService.name).put("startedAt", AzanService.startedAt))
    }

    @PluginMethod
    fun mute(call: PluginCall) {
        val on = call.getBoolean("on", true) ?: true
        try { context.startService(Intent(context, AzanService::class.java).setAction(AzanService.ACTION_MUTE).putExtra("on", on)) } catch (_: Exception) {}
        call.resolve()
    }

    /** Keeps the screen on while the azan screen shows the playing azan. */
    @PluginMethod
    fun keepAwake(call: PluginCall) {
        val on = call.getBoolean("on", false) ?: false
        activity.runOnUiThread {
            if (on) activity.window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
            else activity.window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
        call.resolve()
    }

    @PluginMethod
    fun fullScreenSettings(call: PluginCall) {
        try {
            if (Build.VERSION.SDK_INT >= 34)
                activity.startActivity(Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT, Uri.parse("package:" + context.packageName)))
            else appSettings(call)
        } catch (e: Exception) { activity.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + context.packageName))) }
        call.resolve()
    }

    @PluginMethod
    fun batterySettings(call: PluginCall) {
        try {
            activity.startActivity(Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + context.packageName)))
        } catch (e: ActivityNotFoundException) {
            activity.startActivity(Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS))
        }
        call.resolve()
    }

    @PluginMethod
    fun appSettings(call: PluginCall) {
        activity.startActivity(Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + context.packageName)))
        call.resolve()
    }

    @PluginMethod
    fun openUrl(call: PluginCall) {
        try {
            val url = call.getString("url") ?: run { call.reject("url required"); return }
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            activity.startActivity(intent)
            call.resolve()
        } catch (e: Exception) { call.reject(e.message ?: "openUrl failed") }
    }
}
