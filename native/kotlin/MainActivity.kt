package ir.azango.app

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(AzanPlugin::class.java) // must be before super.onCreate
        super.onCreate(savedInstanceState)
    }
}
