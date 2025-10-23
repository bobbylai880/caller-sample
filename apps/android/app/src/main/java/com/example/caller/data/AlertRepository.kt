package com.example.caller.data

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

class AlertRepository {
    private val client = OkHttpClient()

    suspend fun sendEmergencyStop(callSid: String) = withContext(Dispatchers.IO) {
        // TODO: move base URL and auth token into secure storage / remote config
        val body = JSONObject(mapOf("callSid" to callSid)).toString()
        val request = Request.Builder()
            .url("https://example.com/api/calls/$callSid/stop")
            .post(body.toRequestBody("application/json".toMediaType()))
            .build()

        client.newCall(request).execute().use { response ->
            if (!response.isSuccessful) {
                throw IllegalStateException("Failed to stop call: ${'$'}{response.code}")
            }
        }
    }
}
