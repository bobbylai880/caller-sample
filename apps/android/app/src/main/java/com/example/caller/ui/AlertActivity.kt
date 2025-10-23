package com.example.caller.ui

import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Bundle
import android.os.Vibrator
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.lifecycle.lifecycleScope
import com.example.caller.R
import com.example.caller.data.AlertRepository
import kotlinx.coroutines.launch

class AlertActivity : ComponentActivity() {
    private val alertRepository = AlertRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON
        )
        setContentView(R.layout.activity_alert)

        val alertMessage: TextView = findViewById(R.id.alertMessage)
        val stopButton: Button = findViewById(R.id.stopButton)

        val payloadMessage = intent.getStringExtra("payload") ?: "TODO: Fill from notification"
        alertMessage.text = payloadMessage

        playAlarm()
        vibrate()
        flashScreen()

        stopButton.setOnClickListener {
            lifecycleScope.launch {
                // TODO: pass actual call SID from notification payload
                alertRepository.sendEmergencyStop("placeholder-call-sid")
                finish()
            }
        }
    }

    private fun playAlarm() {
        val uri = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM)
        val ringtone = RingtoneManager.getRingtone(applicationContext, uri)
        ringtone.audioAttributes = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build()
        ringtone.play()
    }

    @Suppress("DEPRECATION")
    private fun vibrate() {
        val vibrator = getSystemService(VIBRATOR_SERVICE) as Vibrator
        vibrator.vibrate(longArrayOf(0, 500, 500), 0)
    }

    private fun flashScreen() {
        // TODO: Implement screen flashing for devices that support it.
    }
}
