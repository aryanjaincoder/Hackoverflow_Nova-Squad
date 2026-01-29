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
        private const val SAMPLE_RATE = 44100
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
            // Power of 2 ke liye (FFT efficient rahega)
            val bufferSize = 8192
            
            val minBufferSize = AudioRecord.getMinBufferSize(
                SAMPLE_RATE, 
                CHANNEL_CONFIG, 
                AUDIO_FORMAT
            )
            
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
            Log.d(TAG, "✅ Detection shuru @ ${targetFrequency}Hz | Buffer: $actualBufferSize")
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
                Log.d(TAG, "🛑 Detection band")
            } catch (e: Exception) {
                Log.e(TAG, "Error stopping", e)
            }
        }
        audioRecord = null
        
        promise.resolve("Stopped")
    }
    
    private fun detectFrequency(targetFrequency: Int) {
        val bufferSize = 8192  // Power of 2 (FFT ke liye)
        val audioBuffer = ShortArray(bufferSize)
        var consecutiveDetections = 0
        var frameCount = 0
        
        Log.d(TAG, "🎯 Target: ${targetFrequency}Hz")
        
        while (isRecording) {
            val readSize = audioRecord?.read(audioBuffer, 0, bufferSize) ?: 0
            
            if (readSize > 0) {
                frameCount++
                
                // Convert to double
                val audioData = DoubleArray(bufferSize) { i ->
                    audioBuffer[i] / 32768.0
                }
                
                // Hamming window
                applyHammingWindow(audioData)
                
                // 🔥 REAL FFT (1000x faster!)
                val fftResult = performRealFFT(audioData)
                
                // Hz per bin
                val hzPerBin = SAMPLE_RATE.toDouble() / bufferSize
                val targetBin = (targetFrequency / hzPerBin).toInt()
                
                // ±20 bins check karo (wider tolerance)
                val startBin = maxOf(0, targetBin - 20)
                val endBin = minOf(fftResult.lastIndex, targetBin + 20)
                
                // Max magnitude dhundho
                var maxMag = 0.0
                var maxBin = targetBin
                for (i in startBin..endBin) {
                    if (fftResult[i] > maxMag) {
                        maxMag = fftResult[i]
                        maxBin = i
                    }
                }
                
                // Threshold (frequency ke basis par)
                val baseThreshold = when {
                    targetFrequency < 5000 -> 0.001
                    targetFrequency < 10000 -> 0.0005
                    targetFrequency < 15000 -> 0.0002
                    else -> 0.0001
                }
                
                // Adaptive (lock hone ke baad easier)
                val effectiveThreshold = if (consecutiveDetections > 0) {
                    baseThreshold * 0.3  // 70% easier
                } else {
                    baseThreshold
                }
                
                val detected = maxMag > effectiveThreshold
                
                // Update consecutive count
                if (detected) {
                    consecutiveDetections = minOf(10, consecutiveDetections + 2)
                } else {
                    consecutiveDetections = maxOf(0, consecutiveDetections - 1)
                }
                
                // React Native ko bhejo
                val data = Arguments.createMap().apply {
                    putInt("targetFrequency", targetFrequency)
                    putDouble("magnitude", maxMag)
                    putDouble("threshold", effectiveThreshold)
                    putBoolean("detected", detected)
                    putInt("consecutiveCount", consecutiveDetections)
                    putInt("detectedBin", maxBin)
                    putDouble("detectedFreq", maxBin * hzPerBin)
                }
                
                // Log (har 50 frames ya jab detect ho)
                if (frameCount % 50 == 0 || detected) {
                    Log.d(TAG, "Mag: %.6f | Thresh: %.6f | Cons: %d | Bin: %d (%.1f Hz)"
                        .format(maxMag, effectiveThreshold, consecutiveDetections, 
                                maxBin, maxBin * hzPerBin))
                }
                
                sendEvent("FrequencyDetected", data)
            }
            
            Thread.sleep(20)  // 50 FPS
        }
    }
    
    private fun applyHammingWindow(data: DoubleArray) {
        val n = data.size
        for (i in data.indices) {
            val window = 0.54 - 0.46 * cos(2 * PI * i / (n - 1))
            data[i] *= window
        }
    }
    
    /**
     * 🔥 REAL FFT - Cooley-Tukey Algorithm
     * O(n log n) complexity - 1000x faster than naive DFT!
     */
    private fun performRealFFT(input: DoubleArray): DoubleArray {
        val n = input.size
        require(n and (n - 1) == 0) { "Size must be power of 2" }
        
        val real = input.copyOf()
        val imag = DoubleArray(n)
        
        // Bit-reversal permutation
        var j = 0
        for (i in 0 until n - 1) {
            if (i < j) {
                val temp = real[i]
                real[i] = real[j]
                real[j] = temp
            }
            var k = n / 2
            while (k <= j) {
                j -= k
                k /= 2
            }
            j += k
        }
        
        // Cooley-Tukey FFT
        var length = 2
        while (length <= n) {
            val angle = -2 * PI / length
            val wLenReal = cos(angle)
            val wLenImag = sin(angle)
            
            var i = 0
            while (i < n) {
                var wReal = 1.0
                var wImag = 0.0
                
                for (j in 0 until length / 2) {
                    val k = i + j
                    val l = k + length / 2
                    
                    val tReal = wReal * real[l] - wImag * imag[l]
                    val tImag = wReal * imag[l] + wImag * real[l]
                    
                    real[l] = real[k] - tReal
                    imag[l] = imag[k] - tImag
                    real[k] += tReal
                    imag[k] += tImag
                    
                    val nextWReal = wReal * wLenReal - wImag * wLenImag
                    wImag = wReal * wLenImag + wImag * wLenReal
                    wReal = nextWReal
                }
                i += length
            }
            length *= 2
        }
        
        // Calculate magnitudes (sirf pehla half chahiye)
        val magnitudes = DoubleArray(n / 2)
        for (i in magnitudes.indices) {
            magnitudes[i] = sqrt(real[i] * real[i] + imag[i] * imag[i]) / n
        }
        
        return magnitudes
    }
    
    private fun sendEvent(eventName: String, params: WritableMap) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "❌ Event send failed: ${e.message}")
        }
    }
}