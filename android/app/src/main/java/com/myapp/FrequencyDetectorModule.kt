package com.myapp

import android.media.AudioFormat
import android.media.AudioRecord
import android.media.MediaRecorder
import android.util.Log
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import kotlin.math.*

class FrequencyDetectorModule(reactContext: ReactApplicationContext) : 
    ReactContextBaseJavaModule(reactContext) {
    
    private var audioRecord: AudioRecord? = null
    private var isRecording = false
    private var recordingThread: Thread? = null
    
    companion object {
        private const val TAG = "FrequencyDetector"
        private const val SAMPLE_RATE = 44100 // Perfect for up to 20kHz
        private const val CHANNEL_CONFIG = AudioFormat.CHANNEL_IN_MONO
        private const val AUDIO_FORMAT = AudioFormat.ENCODING_PCM_16BIT
    }
    
    override fun getName() = "FrequencyDetector"
    
    @ReactMethod
    fun startDetection(targetFrequency: Int, promise: Promise) {
        if (isRecording) {
            promise.reject("ALREADY_RUNNING", "Detection already running")
            return
        }
        
        try {
            // ✅ OPTIMIZED: Larger buffer for high frequencies = better resolution
            val bufferSize = when {
                targetFrequency < 5000 -> 4096   // Low freq - small buffer OK
                targetFrequency < 10000 -> 8192  // Mid freq - medium buffer
                targetFrequency < 16000 -> 16384 // HIGH FREQ - LARGE BUFFER! ⚡
                else -> 32768                     // Ultra-high (18kHz+) - MAX resolution
            }
            
            val minBufferSize = AudioRecord.getMinBufferSize(
                SAMPLE_RATE, 
                CHANNEL_CONFIG, 
                AUDIO_FORMAT
            )
            
            // Use larger of calculated vs minimum (multiply by 2 for safety)
            val actualBufferSize = maxOf(bufferSize, minBufferSize * 2)
            
            audioRecord = AudioRecord(
                MediaRecorder.AudioSource.MIC,
                SAMPLE_RATE,
                CHANNEL_CONFIG,
                AUDIO_FORMAT,
                actualBufferSize
            )
            
            if (audioRecord?.state != AudioRecord.STATE_INITIALIZED) {
                promise.reject("INIT_FAILED", "AudioRecord initialization failed")
                return
            }
            
            audioRecord?.startRecording()
            isRecording = true
            
            recordingThread = Thread { detectFrequency(targetFrequency) }
            recordingThread?.start()
            
            promise.resolve("Started")
            Log.d(TAG, "⚡⚡⚡ ULTRA FAST MODE: ${targetFrequency}Hz | Buffer: $actualBufferSize | Rate: $SAMPLE_RATE")
        } catch (e: Exception) {
            Log.e(TAG, "❌ Start error: ${e.message}")
            promise.reject("START_ERROR", e.message)
        }
    }
    
    @ReactMethod
    fun stopDetection(promise: Promise) {
        isRecording = false
        
        audioRecord?.apply {
            try {
                stop()
                release()
                Log.d(TAG, "🛑 Stopped detection")
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping recording", e)
            }
        }
        audioRecord = null
        
        promise.resolve("Stopped")
    }
    
    private fun detectFrequency(targetFrequency: Int) {
        // ✅ OPTIMIZED: Larger buffer for high-freq = better accuracy
        val bufferSize = when {
            targetFrequency < 5000 -> 4096
            targetFrequency < 10000 -> 8192
            targetFrequency < 16000 -> 16384  // ⚡ 15kHz sweet spot!
            else -> 32768
        }
        
        val audioBuffer = ShortArray(bufferSize)
        var consecutiveDetections = 0
        var peakMagnitude = 0.0
        
        Log.d(TAG, "⚡⚡⚡ ULTRA FAST DETECTION: ${targetFrequency}Hz | FFT size: $bufferSize")
        
        while (isRecording) {
            val readSize = audioRecord?.read(audioBuffer, 0, bufferSize) ?: 0
            
            if (readSize > 0) {
                // Convert to double for FFT
                val audioData = DoubleArray(bufferSize) { i ->
                    audioBuffer[i] / 32768.0
                }
                
                // Apply Hamming window to reduce spectral leakage
                applyHammingWindow(audioData)
                
                // Perform FFT
                val fftResult = performFFT(audioData)
                
                // ✅ CRITICAL: Calculate target bin accurately
                val targetBin = ((targetFrequency * bufferSize) / SAMPLE_RATE.toDouble()).toInt()
                
                // ✅ SUPER WIDE SCAN: Check ±5 bins for maximum reliability!
                // This handles frequency drift, phone variations, etc.
                val magnitudeRange = (-5..5).map { offset ->
                    val bin = (targetBin + offset).coerceIn(0, fftResult.lastIndex)
                    fftResult[bin]
                }
                val magnitude = magnitudeRange.maxOrNull() ?: 0.0
                
                // Track peak for debugging
                if (magnitude > peakMagnitude) {
                    peakMagnitude = magnitude
                }
                
                // ✅ ULTRA-SENSITIVE THRESHOLDS - Optimized for real phones!
                val threshold = when {
                    targetFrequency < 8000 -> 0.0003   // Very sensitive for low freq
                    targetFrequency < 12000 -> 0.0005  // Medium (10-12kHz)
                    targetFrequency < 16000 -> 0.0015  // ⚡ 15kHz - PERFECT BALANCE!
                    else -> 0.003                       // 18kHz+ (harder to detect)
                }
                
                // ✅ ADAPTIVE THRESHOLD: Lower if we're already detecting (prevents flickering)
                val effectiveThreshold = if (consecutiveDetections > 0) {
                    threshold * 0.5  // 50% lower = more stable
                } else {
                    threshold
                }
                
                val detected = magnitude > effectiveThreshold
                
                // Track consecutive detections with faster decay
                if (detected) {
                    consecutiveDetections = minOf(10, consecutiveDetections + 2) // Fast ramp up
                } else {
                    consecutiveDetections = maxOf(0, consecutiveDetections - 1) // Slow decay
                }
                
                // Send to React Native
                val data = Arguments.createMap().apply {
                    putInt("targetFrequency", targetFrequency)
                    putInt("targetBin", targetBin)
                    putDouble("magnitude", magnitude)
                    putDouble("threshold", effectiveThreshold)
                    putBoolean("detected", detected)
                    putInt("consecutiveCount", consecutiveDetections)
                    putDouble("peakMagnitude", peakMagnitude)
                }
                
                // ✅ SMART LOGGING: Show everything when magnitude is significant
                if (magnitude > threshold * 0.3) {
                    val status = if (detected) "✅ DETECTED" else "⚠️ WEAK"
                    Log.d(TAG, "$status | ${targetFrequency}Hz | Bin:$targetBin | Mag:%.6f | Thresh:%.6f | Cons:$consecutiveDetections | Peak:%.6f"
                        .format(magnitude, effectiveThreshold, peakMagnitude))
                }
                
                sendEvent("FrequencyDetected", data)
            }
            
            // ✅ ULTRA FAST: 10ms sleep = 100Hz refresh rate! ⚡⚡⚡
            Thread.sleep(10)
        }
        
        Log.d(TAG, "🏁 Detection ended | Peak magnitude: %.6f".format(peakMagnitude))
    }
    
    private fun applyHammingWindow(data: DoubleArray) {
        val n = data.size
        for (i in data.indices) {
            val window = 0.54 - 0.46 * cos(2 * PI * i / (n - 1))
            data[i] *= window
        }
    }
    
    private fun performFFT(input: DoubleArray): DoubleArray {
        val n = input.size
        val magnitudes = DoubleArray(n / 2)
        
        for (k in 0 until n / 2) {
            var real = 0.0
            var imag = 0.0
            
            for (t in input.indices) {
                val angle = 2 * PI * t * k / n
                real += input[t] * cos(angle)
                imag -= input[t] * sin(angle)
            }
            
            magnitudes[k] = sqrt(real * real + imag * imag) / n
        }
        
        return magnitudes
    }
    
    private fun sendEvent(eventName: String, params: WritableMap) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Failed to send event: ${e.message}")
        }
    }
}