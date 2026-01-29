package com.myapp

import android.bluetooth.BluetoothAdapter
import android.bluetooth.le.BluetoothLeAdvertiser
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseCallback
import android.os.ParcelUuid
import android.util.Log
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.Promise
import java.util.UUID
import java.nio.charset.StandardCharsets

class BLEAdvertiserModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
    
    companion object {
        private const val TAG = "BLEAdvertiser"
        private const val SERVICE_UUID = "4FAFC201-1FB5-459E-8FCC-C5C9C331914B"
        // ✅ Use Apple's manufacturer ID for better compatibility
        private const val MANUFACTURER_ID = 0x004C
    }

    private var advertiser: BluetoothLeAdvertiser? = null
    private var advertiseCallback: AdvertiseCallback? = null

    override fun getName(): String = "BLEAdvertiser"

    @ReactMethod
    fun startAdvertising(studentId: String, className: String, promise: Promise) {
        try {
            Log.d(TAG, "========================================")
            Log.d(TAG, "📡 STARTING BLE ADVERTISING (SHORT FORMAT)")
            Log.d(TAG, "========================================")
            Log.d(TAG, "👤 Student ID: $studentId")
            Log.d(TAG, "🏫 Class: $className")

            val bluetoothAdapter = BluetoothAdapter.getDefaultAdapter()
            
            if (bluetoothAdapter == null) {
                Log.e(TAG, "❌ Bluetooth not available")
                promise.reject("BT_UNAVAILABLE", "Bluetooth not available")
                return
            }

            if (!bluetoothAdapter.isEnabled) {
                Log.e(TAG, "❌ Bluetooth is OFF")
                promise.reject("BT_OFF", "Bluetooth is turned off")
                return
            }

            advertiser = bluetoothAdapter.bluetoothLeAdvertiser
            
            if (advertiser == null) {
                Log.e(TAG, "❌ BLE Advertising not supported")
                promise.reject("ADV_NOT_SUPPORTED", "BLE Advertising not supported")
                return
            }

            // ✅ HIGH POWER settings for maximum range
            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setConnectable(false)
                .setTimeout(0) // Advertise indefinitely
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .build()

            // ✅ COMPACT FORMAT to fit in 27 bytes
            // Format: "ATT_<first12ofID>_<first8ofClass>"
            // Example: "ATT_N1wCNJxWOrSU_BCA-2024" = 26 bytes
            val shortId = studentId.take(12)
            val shortClass = className.take(8)
            val payload = "ATT_${shortId}_${shortClass}"
            val payloadBytes = payload.toByteArray(StandardCharsets.UTF_8)
            
            Log.d(TAG, "📦 Original Student ID: $studentId")
            Log.d(TAG, "📦 Shortened ID: $shortId")
            Log.d(TAG, "📦 Original Class: $className")
            Log.d(TAG, "📦 Shortened Class: $shortClass")
            Log.d(TAG, "📦 Final Payload: $payload")
            Log.d(TAG, "📦 Payload Size: ${payloadBytes.size} bytes (limit: 27)")

            // ✅ Check if it fits
            if (payloadBytes.size > 27) {
                Log.e(TAG, "❌ Payload too large even after shortening!")
                Log.e(TAG, "Size: ${payloadBytes.size} bytes")
                
                // Emergency fallback - use even shorter format
                val ultraShortId = studentId.take(8)
                val ultraShortClass = className.take(6)
                val fallbackPayload = "ATT_${ultraShortId}_${ultraShortClass}"
                val fallbackBytes = fallbackPayload.toByteArray(StandardCharsets.UTF_8)
                
                Log.w(TAG, "⚠️ Using emergency short format")
                Log.w(TAG, "📦 Emergency Payload: $fallbackPayload")
                Log.w(TAG, "📦 Emergency Size: ${fallbackBytes.size} bytes")
                
                if (fallbackBytes.size > 27) {
                    promise.reject("PAYLOAD_TOO_LARGE", "Cannot fit student info in 27 bytes")
                    return
                }
                
                // Use fallback
                val advertiseData = AdvertiseData.Builder()
                    .addManufacturerData(MANUFACTURER_ID, fallbackBytes)
                    .setIncludeDeviceName(false)
                    .setIncludeTxPowerLevel(false)
                    .build()
                
                startAdvertisingInternal(advertiseData, settings, fallbackPayload, promise)
                return
            }

            // ✅ Build advertising data
            val advertiseData = AdvertiseData.Builder()
                .addManufacturerData(MANUFACTURER_ID, payloadBytes)
                .setIncludeDeviceName(false)
                .setIncludeTxPowerLevel(false)
                .build()

            Log.d(TAG, "✅ Advertising data built successfully")
            Log.d(TAG, "🏷️ Manufacturer ID: 0x${MANUFACTURER_ID.toString(16).uppercase()}")
            
            startAdvertisingInternal(advertiseData, settings, payload, promise)
            
        } catch (e: SecurityException) {
            Log.e(TAG, "❌ Bluetooth permissions denied", e)
            promise.reject("PERMISSION_DENIED", "Bluetooth permissions not granted")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error starting advertising", e)
            promise.reject("ERROR", "Error: ${e.message}")
        }
    }
    
    private fun startAdvertisingInternal(
        advertiseData: AdvertiseData,
        settings: AdvertiseSettings,
        payload: String,
        promise: Promise
    ) {
        // ✅ Callback for monitoring
        advertiseCallback = object : AdvertiseCallback() {
            override fun onStartSuccess(settingsInEffect: AdvertiseSettings) {
                Log.d(TAG, "========================================")
                Log.d(TAG, "✅ ADVERTISING STARTED SUCCESSFULLY!")
                Log.d(TAG, "========================================")
                Log.d(TAG, "📡 Mode: MANUFACTURER DATA (SHORT FORMAT)")
                Log.d(TAG, "🏷️ Manufacturer ID: 0x${MANUFACTURER_ID.toString(16).uppercase()}")
                Log.d(TAG, "📦 Broadcasting: $payload")
                Log.d(TAG, "📦 Payload Size: ${payload.toByteArray().size} bytes")
                Log.d(TAG, "📶 TX Power: HIGH (max range)")
                Log.d(TAG, "⏱️ Advertising Mode: LOW_LATENCY")
                Log.d(TAG, "💡 Admin will scan for this exact format")
                Log.d(TAG, "========================================")
            }

            override fun onStartFailure(errorCode: Int) {
                val errorMsg = when (errorCode) {
                    ADVERTISE_FAILED_ALREADY_STARTED -> "Already advertising"
                    ADVERTISE_FAILED_DATA_TOO_LARGE -> "Data too large"
                    ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "Feature not supported"
                    ADVERTISE_FAILED_INTERNAL_ERROR -> "Internal BLE error"
                    ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "Too many advertisers active"
                    else -> "Unknown error (code: $errorCode)"
                }
                Log.e(TAG, "========================================")
                Log.e(TAG, "❌ ADVERTISING FAILED!")
                Log.e(TAG, "========================================")
                Log.e(TAG, "Error code: $errorCode")
                Log.e(TAG, "Error: $errorMsg")
                Log.e(TAG, "========================================")
            }
        }

        // ✅ Start advertising
        advertiser?.startAdvertising(settings, advertiseData, advertiseCallback)
        
        promise.resolve("Advertising started: $payload")
        Log.d(TAG, "🚀 Advertising request sent")
    }

    @ReactMethod
    fun stopAdvertising(promise: Promise) {
        try {
            if (advertiser != null && advertiseCallback != null) {
                Log.d(TAG, "🛑 Stopping BLE advertising...")
                advertiser?.stopAdvertising(advertiseCallback)
                advertiser = null
                advertiseCallback = null
                Log.d(TAG, "✅ Advertising stopped")
                promise.resolve("Advertising stopped")
            } else {
                Log.d(TAG, "⚠️ Not currently advertising")
                promise.resolve("Not advertising")
            }
        } catch (e: Exception) {
            Log.e(TAG, "❌ Error stopping advertising", e)
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun isAdvertising(promise: Promise) {
        promise.resolve(advertiser != null && advertiseCallback != null)
    }
}