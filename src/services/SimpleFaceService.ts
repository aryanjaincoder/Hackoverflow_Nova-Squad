// src/services/SimpleFaceService.ts
// ✅ REACT NATIVE CLI - TFLite Version with UPNG-JS
// 🚀 Uses: blaze_face_short_range.tflite + facenet_512.tflite
// 🔧 v8.2 - FIXED: Gallery vs Camera Embedding Mismatch

import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import { Camera } from 'react-native-vision-camera';
import { Platform, Image } from 'react-native';
import { loadTensorflowModel, TensorflowModel } from 'react-native-fast-tflite';
import UPNG from 'upng-js';

export interface FaceData {
  userId: string;
  userName: string;
  faceEmbeddings: number[][];
  timestamp: number;
  enrollmentSource: 'camera' | 'gallery'; // 🆕 v8.2: Track enrollment source
}

export interface VerificationResult {
  success: boolean;
  userId?: string;
  userName?: string;
  confidence?: number;
  message?: string;
  processingTime?: number;
  faceDetected?: boolean;
}

export interface EnrollmentProgress {
  step: number;
  total: number;
  message: string;
}

interface FaceDetection {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

interface UserInfo {
  userId: string;
  userName: string;
}

class SimpleFaceService {
  private enrolledFaces: FaceData[] = [];
  private isReady: boolean = false;
  private progressCallback?: (progress: EnrollmentProgress) => void;
  private enrollmentLock: boolean = false;
  
  private detectionModel: TensorflowModel | null = null;
  private recognitionModel: TensorflowModel | null = null;
  
  private readonly DETECTION_SIZE = 128;
  private readonly RECOGNITION_SIZE = 160;
  private readonly EMBEDDING_SIZE = 512;
  
  // 🔥 v8.2: RELAXED THRESHOLDS FOR CROSS-SOURCE MATCHING
  private readonly VERIFICATION_THRESHOLD = 0.30;      // Lowered from 0.55
  private readonly ABSOLUTE_MIN_THRESHOLD = 0.20;      // Lowered from 0.45
  private readonly ENROLLMENT_CONSISTENCY = 0.25;      // Lowered from 0.30
  private readonly FACE_CONFIDENCE_MIN = 0.65;         // Slightly lowered
  private readonly MIN_CONFIDENCE_GAP = 0.15;          // Lowered from 0.20
  private readonly MIN_EMBEDDING_VARIANCE = 0.0005;    // Lowered
  private readonly MIN_INTER_USER_DISTANCE = 0.15;     // Lowered from 0.18
  
  // Liveness thresholds
  private readonly MIN_SKIN_RATIO = 0.20;              // Lowered from 0.25
  private readonly MIN_COLOR_VARIANCE = 60;            // Lowered from 80
  private readonly MAX_COLOR_VARIANCE = 6000;          // Increased from 5500
  
  // Enrollment configuration
  private readonly MIN_ENROLLMENT_PHOTOS = 3;          // Lowered from 5
  private readonly MAX_ENROLLMENT_PHOTOS = 10;

  constructor() {
    console.log('🔥 TFLite Face Service v8.2 - FIXED CROSS-SOURCE MATCHING');
  }

  async initialize(): Promise<boolean> {
    try {
      console.log('🚀 Initializing TFLite Models...');
      
      this.detectionModel = await loadTensorflowModel(
        require('../model/blaze_face_short_range.tflite')
      );
      console.log('✅ BlazeFace model loaded');
      
      this.recognitionModel = await loadTensorflowModel(
        require('../model/facenet_512.tflite')
      );
      console.log('✅ FaceNet-512 model loaded');
      
      await this.loadEnrolledFaces();
      this.isReady = true;
      
      console.log('✅ TFLite Face Service Ready!');
      return true;
    } catch (error) {
      console.error('❌ Init failed:', error);
      return false;
    }
  }

  private async saveLastUserInfo(userId: string, userName: string): Promise<void> {
    try {
      const userInfo: UserInfo = { userId, userName };
      await AsyncStorage.setItem('@last_user_info_v8', JSON.stringify(userInfo));
      console.log('💾 Saved last user info:', userName);
    } catch (error) {
      console.error('❌ Failed to save user info:', error);
    }
  }

  async getLastUserInfo(): Promise<UserInfo | null> {
    try {
      const data = await AsyncStorage.getItem('@last_user_info_v8');
      if (data) {
        const userInfo: UserInfo = JSON.parse(data);
        console.log('📥 Retrieved last user info:', userInfo.userName);
        return userInfo;
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to retrieve user info:', error);
      return null;
    }
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private decodeBase64ToRGBA(base64Image: string): { 
    data: Uint8Array; 
    width: number; 
    height: number 
  } {
    try {
      const arrayBuffer = this.base64ToArrayBuffer(base64Image);
      const png = UPNG.decode(arrayBuffer);
      const rgbaArrayBuffer = UPNG.toRGBA8(png)[0];
      const rgbaData = new Uint8Array(rgbaArrayBuffer);
      
      return {
        data: rgbaData,
        width: png.width,
        height: png.height,
      };
    } catch (error) {
      console.error('❌ PNG decode error:', error);
      throw new Error(`Failed to decode PNG image: ${error}`);
    }
  }

  private cropRGBAData(
    sourceData: Uint8Array,
    sourceWidth: number,
    sourceHeight: number,
    cropX: number,
    cropY: number,
    cropWidth: number,
    cropHeight: number
  ): { data: Uint8Array; width: number; height: number } {
    const x = Math.max(0, Math.floor(cropX));
    const y = Math.max(0, Math.floor(cropY));
    const w = Math.min(Math.floor(cropWidth), sourceWidth - x);
    const h = Math.min(Math.floor(cropHeight), sourceHeight - y);

    const croppedData = new Uint8Array(w * h * 4);
    
    for (let row = 0; row < h; row++) {
      for (let col = 0; col < w; col++) {
        const srcIdx = ((y + row) * sourceWidth + (x + col)) * 4;
        const dstIdx = (row * w + col) * 4;
        
        croppedData[dstIdx] = sourceData[srcIdx];
        croppedData[dstIdx + 1] = sourceData[srcIdx + 1];
        croppedData[dstIdx + 2] = sourceData[srcIdx + 2];
        croppedData[dstIdx + 3] = sourceData[srcIdx + 3];
      }
    }

    return { data: croppedData, width: w, height: h };
  }

  // 🔥 v8.2: UNIFIED IMAGE PREPROCESSING - Same for both gallery and camera
  private resizeImageData(
    sourceData: Uint8Array,
    sourceWidth: number,
    sourceHeight: number,
    targetSize: number
  ): Float32Array {
    const numChannels = 3;
    const result = new Float32Array(targetSize * targetSize * numChannels);
    
    const scaleX = sourceWidth / targetSize;
    const scaleY = sourceHeight / targetSize;
    
    let outputIndex = 0;
    let minVal = 255, maxVal = 0;
    
    for (let y = 0; y < targetSize; y++) {
      for (let x = 0; x < targetSize; x++) {
        const srcX = Math.min(Math.floor(x * scaleX), sourceWidth - 1);
        const srcY = Math.min(Math.floor(y * scaleY), sourceHeight - 1);
        const srcIdx = (srcY * sourceWidth + srcX) * 4;
        
        const r = sourceData[srcIdx];
        const g = sourceData[srcIdx + 1];
        const b = sourceData[srcIdx + 2];
        
        minVal = Math.min(minVal, r, g, b);
        maxVal = Math.max(maxVal, r, g, b);
        
        // FaceNet-512 normalization: [-1, 1] range
        result[outputIndex++] = (r - 127.5) / 128.0;
        result[outputIndex++] = (g - 127.5) / 128.0;
        result[outputIndex++] = (b - 127.5) / 128.0;
      }
    }
    
    console.log(`🖼️ Image pixel range: [${minVal}, ${maxVal}]`);
    
    return result;
  }

  private prepareDetectionInput(base64Image: string): Float32Array {
    const { data, width, height } = this.decodeBase64ToRGBA(base64Image);
    
    if (width !== height) {
      const size = Math.max(width, height);
      const paddedData = new Uint8Array(size * size * 4);
      
      const offsetX = Math.floor((size - width) / 2);
      const offsetY = Math.floor((size - height) / 2);
      
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const srcIdx = (y * width + x) * 4;
          const dstIdx = ((y + offsetY) * size + (x + offsetX)) * 4;
          
          paddedData[dstIdx] = data[srcIdx];
          paddedData[dstIdx + 1] = data[srcIdx + 1];
          paddedData[dstIdx + 2] = data[srcIdx + 2];
          paddedData[dstIdx + 3] = data[srcIdx + 3];
        }
      }
      
      return this.resizeForDetection(paddedData, size, size);
    }
    
    return this.resizeForDetection(data, width, height);
  }

  private resizeForDetection(
    sourceData: Uint8Array,
    sourceWidth: number,
    sourceHeight: number
  ): Float32Array {
    const targetSize = this.DETECTION_SIZE;
    const numChannels = 3;
    const totalPixels = targetSize * targetSize * numChannels;
    const result = new Float32Array(totalPixels);
    
    const scaleX = sourceWidth / targetSize;
    const scaleY = sourceHeight / targetSize;
    
    let outputIndex = 0;
    
    for (let y = 0; y < targetSize; y++) {
      for (let x = 0; x < targetSize; x++) {
        const srcX = Math.min(Math.floor(x * scaleX), sourceWidth - 1);
        const srcY = Math.min(Math.floor(y * scaleY), sourceHeight - 1);
        const srcIdx = (srcY * sourceWidth + srcX) * 4;
        
        result[outputIndex++] = sourceData[srcIdx] / 255.0;
        result[outputIndex++] = sourceData[srcIdx + 1] / 255.0;
        result[outputIndex++] = sourceData[srcIdx + 2] / 255.0;
      }
    }
    
    return result;
  }

  private prepareRecognitionInputFromRGBA(
    rgbaData: Uint8Array,
    width: number,
    height: number
  ): Float32Array {
    return this.resizeImageData(rgbaData, width, height, this.RECOGNITION_SIZE);
  }

  private getImageDimensions(imageUri: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      Image.getSize(
        imageUri,
        (width, height) => resolve({ width, height }),
        (error) => reject(error)
      );
    });
  }

  private isSkinTone(r: number, g: number, b: number): boolean {
    // RGB rule
    if (r > 95 && g > 40 && b > 20) {
      if (Math.max(r, g, b) - Math.min(r, g, b) > 15) {
        if (Math.abs(r - g) > 15 && r > g && r > b) {
          return true;
        }
      }
    }

    // YCbCr rule
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = -0.169 * r - 0.331 * g + 0.5 * b + 128;
    const cr = 0.5 * r - 0.419 * g - 0.081 * b + 128;

    if (y > 80 && cb >= 85 && cb <= 135 && cr >= 135 && cr <= 180) {
      return true;
    }

    // HSV rule
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;
    
    let h = 0;
    if (delta !== 0) {
      if (max === r) {
        h = 60 * (((g - b) / delta) % 6);
      } else if (max === g) {
        h = 60 * ((b - r) / delta + 2);
      } else {
        h = 60 * ((r - g) / delta + 4);
      }
    }
    if (h < 0) h += 360;

    const s = max === 0 ? 0 : delta / max;
    const v = max / 255;

    if ((h >= 0 && h <= 50) && s >= 0.15 && s <= 0.7 && v >= 0.3) {
      return true;
    }

    return false;
  }

  private calculateColorVariance(
    rgbaData: Uint8Array,
    x: number,
    y: number,
    w: number,
    h: number,
    imgWidth: number
  ): number {
    const pixels: number[] = [];
    const sampleStep = Math.max(2, Math.floor(Math.min(w, h) / 20));
    
    for (let dy = 0; dy < h; dy += sampleStep) {
      for (let dx = 0; dx < w; dx += sampleStep) {
        const px = x + dx;
        const py = y + dy;
        
        if (px >= 0 && px < imgWidth && py >= 0 && py < imgWidth) {
          const idx = (py * imgWidth + px) * 4;
          const r = rgbaData[idx];
          const g = rgbaData[idx + 1];
          const b = rgbaData[idx + 2];
          
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          pixels.push(luminance);
        }
      }
    }
    
    if (pixels.length === 0) return 0;
    
    const mean = pixels.reduce((a, b) => a + b, 0) / pixels.length;
    const variance = pixels.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / pixels.length;
    
    return variance;
  }

  private async validateRealFace(
    imageUri: string, 
    faceRegion: { x: number; y: number; width: number; height: number }
  ): Promise<{ isReal: boolean; reason?: string }> {
    let tempPath: string | null = null;

    try {
      console.log('👁️ Running liveness detection...');

      const originalDimensions = await this.getImageDimensions(imageUri);
      const maxDim = Math.max(originalDimensions.width, originalDimensions.height);
      const scale = this.DETECTION_SIZE / maxDim;
      const resizedWidth = Math.round(originalDimensions.width * scale);
      const resizedHeight = Math.round(originalDimensions.height * scale);

      const resized = await ImageResizer.createResizedImage(
        imageUri,
        resizedWidth,
        resizedHeight,
        'PNG',
        100,
        0,
        undefined,
        false
      );

      tempPath = resized.uri;

      const imagePath = Platform.OS === 'ios' 
        ? resized.uri 
        : resized.uri.replace('file://', '');

      const base64Image = await RNFS.readFile(imagePath, 'base64');
      const { data: rgbaData, width: imgWidth, height: imgHeight } = this.decodeBase64ToRGBA(base64Image);

      const scaleX = imgWidth / originalDimensions.width;
      const scaleY = imgHeight / originalDimensions.height;
      
      const scaledX = Math.max(0, Math.floor(faceRegion.x * scaleX));
      const scaledY = Math.max(0, Math.floor(faceRegion.y * scaleY));
      const scaledW = Math.min(Math.floor(faceRegion.width * scaleX), imgWidth - scaledX);
      const scaledH = Math.min(Math.floor(faceRegion.height * scaleY), imgHeight - scaledY);

      const centerX = scaledX + Math.floor(scaledW / 2);
      const centerY = scaledY + Math.floor(scaledH / 2);
      const sampleRadius = Math.min(15, Math.floor(scaledW / 6));

      let skinPixels = 0;
      let totalPixels = 0;

      for (let dy = -sampleRadius; dy <= sampleRadius; dy++) {
        for (let dx = -sampleRadius; dx <= sampleRadius; dx++) {
          const px = centerX + dx;
          const py = centerY + dy;
          
          if (px >= 0 && px < imgWidth && py >= 0 && py < imgHeight) {
            const idx = (py * imgWidth + px) * 4;
            const r = rgbaData[idx];
            const g = rgbaData[idx + 1];
            const b = rgbaData[idx + 2];

            if (this.isSkinTone(r, g, b)) skinPixels++;
            totalPixels++;
          }
        }
      }

      const skinRatio = totalPixels > 0 ? skinPixels / totalPixels : 0;
      console.log(`🎨 Skin tone ratio: ${(skinRatio * 100).toFixed(1)}%`);

      if (skinRatio < this.MIN_SKIN_RATIO) {
        return { 
          isReal: false, 
          reason: `Not a real face - insufficient skin tone (${(skinRatio * 100).toFixed(0)}%)` 
        };
      }

      const colorVariance = this.calculateColorVariance(rgbaData, scaledX, scaledY, scaledW, scaledH, imgWidth);
      console.log(`🌈 Color variance: ${colorVariance.toFixed(1)}`);

      if (colorVariance < this.MIN_COLOR_VARIANCE) {
        return { 
          isReal: false, 
          reason: `Not a real face - too uniform (variance: ${colorVariance.toFixed(0)})` 
        };
      }

      if (colorVariance > this.MAX_COLOR_VARIANCE) {
        return { 
          isReal: false, 
          reason: `Not a real face - too busy (variance: ${colorVariance.toFixed(0)})` 
        };
      }

      console.log('✅ Liveness check passed!');
      return { isReal: true };
    } catch (error) {
      console.error('❌ Liveness detection error:', error);
      return { isReal: false, reason: 'Liveness detection failed' };
    } finally {
      if (tempPath) {
        await RNFS.unlink(tempPath.replace('file://', '')).catch(() => {});
      }
    }
  }
  
  private async detectFace(imageUri: string): Promise<{
    detected: boolean;
    faceRegion?: { x: number; y: number; width: number; height: number };
    confidence?: number;
    originalDimensions?: { width: number; height: number };
    error?: string;
  }> {
    if (!this.detectionModel) {
      return { detected: false, error: 'Detection model not loaded' };
    }

    let resizedPath: string | null = null;

    try {
      console.log('🔍 Detecting face with BlazeFace TFLite...');

      const originalDimensions = await this.getImageDimensions(imageUri);

      const maxDim = Math.max(originalDimensions.width, originalDimensions.height);
      const scale = this.DETECTION_SIZE / maxDim;
      const resizedWidth = Math.round(originalDimensions.width * scale);
      const resizedHeight = Math.round(originalDimensions.height * scale);

      const resized = await ImageResizer.createResizedImage(
        imageUri,
        resizedWidth,
        resizedHeight,
        'PNG',
        100,
        0,
        undefined,
        false
      );

      resizedPath = resized.uri;

      const imagePath = Platform.OS === 'ios' 
        ? resized.uri 
        : resized.uri.replace('file://', '');

      const base64Image = await RNFS.readFile(imagePath, 'base64');
      
      const { width: decodedWidth, height: decodedHeight } = this.decodeBase64ToRGBA(base64Image);
      
      if (decodedWidth === 0 || decodedHeight === 0) {
        return { detected: false, error: 'Image resize failed - invalid dimensions' };
      }
      
      const inputData = this.prepareDetectionInput(base64Image);
      
      const outputs = await this.detectionModel.run([inputData]);
      const detection = this.parseBlazeFaceOutput(outputs);

      if (!detection) {
        return { detected: false, error: 'No face detected. Please show your face clearly.' };
      }

      if (detection.confidence < this.FACE_CONFIDENCE_MIN) {
        return { 
          detected: false, 
          error: `Face confidence too low (${(detection.confidence * 100).toFixed(0)}%).` 
        };
      }

      const scaleX = originalDimensions.width / decodedWidth;
      const scaleY = originalDimensions.height / decodedHeight;

      const scaledFaceRegion = {
        x: Math.max(0, detection.x * scaleX),
        y: Math.max(0, detection.y * scaleY),
        width: Math.min(detection.width * scaleX, originalDimensions.width),
        height: Math.min(detection.height * scaleY, originalDimensions.height),
      };

      console.log(`✅ Face detected! Confidence: ${(detection.confidence * 100).toFixed(1)}%`);

      return { 
        detected: true, 
        faceRegion: scaledFaceRegion,
        confidence: detection.confidence,
        originalDimensions,
      };
    } catch (error) {
      console.error('❌ Face detection error:', error);
      return { 
        detected: false, 
        error: error instanceof Error ? error.message : 'Face detection failed' 
      };
    } finally {
      if (resizedPath) {
        await RNFS.unlink(resizedPath.replace('file://', '')).catch(() => {});
      }
    }
  }

  private parseBlazeFaceOutput(outputs: any[]): FaceDetection | null {
    try {
      const regressors = outputs[0];
      const classificators = outputs[1] || outputs[0];
      
      if (!classificators || !regressors) return null;

      const scoreData = Array.isArray(classificators) ? classificators.flat() : Array.from(classificators);
      const boxData = Array.isArray(regressors) ? regressors.flat() : Array.from(regressors);

      let bestScore = 0;
      let bestIndex = -1;
      
      for (let i = 0; i < scoreData.length; i++) {
        const rawScore = typeof scoreData[i] === 'number' ? scoreData[i] : 0;
        const confidence = 1 / (1 + Math.exp(-rawScore));
        
        if (confidence > bestScore) {
          bestScore = confidence;
          bestIndex = i;
        }
      }

      if (bestScore < this.FACE_CONFIDENCE_MIN) {
        console.log(`❌ Low confidence: ${(bestScore * 100).toFixed(1)}%`);
        return null;
      }

      const numAnchors = 896;
      const valuesPerAnchor = boxData.length / numAnchors;

      const boxOffset = bestIndex * valuesPerAnchor;

      const v0 = boxData[boxOffset] ?? 0;
      const v1 = boxData[boxOffset + 1] ?? 0;
      const v2 = boxData[boxOffset + 2] ?? 0;
      const v3 = boxData[boxOffset + 3] ?? 0;

      const anchorX = ((bestIndex % 16) + 0.5) * 8;
      const anchorY = (Math.floor(bestIndex / 16) % 16 + 0.5) * 8;
      const anchorScale = 1.0;

      let cx = anchorX + v0 * this.DETECTION_SIZE;
      let cy = anchorY + v1 * this.DETECTION_SIZE;
      let w = Math.exp(v2) * anchorScale * 32;
      let h = Math.exp(v3) * anchorScale * 32;

      if (w < 10 || h < 10 || !isFinite(w) || !isFinite(h)) {
        w = Math.abs(v2) * this.DETECTION_SIZE;
        h = Math.abs(v3) * this.DETECTION_SIZE;
        cx = v0 * this.DETECTION_SIZE;
        cy = v1 * this.DETECTION_SIZE;
      }

      if (w < 10 || h < 10) {
        const x1 = Math.min(v0, v2) * this.DETECTION_SIZE;
        const y1 = Math.min(v1, v3) * this.DETECTION_SIZE;
        const x2 = Math.max(v0, v2) * this.DETECTION_SIZE;
        const y2 = Math.max(v1, v3) * this.DETECTION_SIZE;
        cx = (x1 + x2) / 2;
        cy = (y1 + y2) / 2;
        w = x2 - x1;
        h = y2 - y1;
      }

      const xMin = Math.max(0, cx - w / 2);
      const yMin = Math.max(0, cy - h / 2);
      let width = Math.min(w, this.DETECTION_SIZE - xMin);
      let height = Math.min(h, this.DETECTION_SIZE - yMin);

      if (width < 10 || height < 10) {
        return null;
      }

      // 🔥 v8.2: Consistent padding for face alignment
      const padding = 0.30; // Slightly increased for better coverage
      return {
        x: Math.max(0, xMin - width * padding),
        y: Math.max(0, yMin - height * padding),
        width: Math.min(width * (1 + 2 * padding), this.DETECTION_SIZE),
        height: Math.min(height * (1 + 2 * padding), this.DETECTION_SIZE),
        confidence: bestScore,
      };
    } catch (error) {
      console.error('❌ Error parsing BlazeFace output:', error);
      return null;
    }
  }

  private validateEmbeddingQuality(embedding: number[]): { valid: boolean; reason?: string } {
    const allZeros = embedding.every(v => Math.abs(v) < 0.0001);
    if (allZeros) return { valid: false, reason: 'All zeros embedding' };

    const allSame = embedding.every(v => Math.abs(v - embedding[0]) < 0.0001);
    if (allSame) return { valid: false, reason: 'No variance in embedding' };

    const hasInvalid = embedding.some(v => !isFinite(v));
    if (hasInvalid) return { valid: false, reason: 'Contains invalid values' };

    const variance = this.calculateVariance(embedding);
    if (variance < this.MIN_EMBEDDING_VARIANCE) {
      return { valid: false, reason: `Low variance: ${variance.toFixed(6)}` };
    }

    return { valid: true };
  }

  private async validateUniqueUser(newEmbeddings: number[][]): Promise<{ 
    unique: boolean; 
    conflictUser?: string; 
    similarity?: number 
  }> {
    if (this.enrolledFaces.length === 0) {
      return { unique: true };
    }

    let maxSimilarity = 0;
    let conflictUser = '';

    for (const enrolledFace of this.enrolledFaces) {
      for (const newEmb of newEmbeddings) {
        for (const enrolledEmb of enrolledFace.faceEmbeddings) {
          const similarity = this.compareEmbeddings(newEmb, enrolledEmb);
          if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            conflictUser = enrolledFace.userName;
          }
        }
      }
    }

    console.log(`🔍 Max similarity with existing users: ${(maxSimilarity * 100).toFixed(1)}% (${conflictUser})`);

    if (maxSimilarity > (1 - this.MIN_INTER_USER_DISTANCE)) {
      return { 
        unique: false, 
        conflictUser, 
        similarity: maxSimilarity 
      };
    }

    return { unique: true };
  }

  // 🔥 v8.2: UNIFIED EMBEDDING EXTRACTION - Same processing for all sources
  private async extractEmbedding(imageUri: string): Promise<{
    success: boolean;
    embedding?: number[];
    confidence?: number;
    error?: string;
  }> {
    if (!this.recognitionModel) {
      return { success: false, error: 'Recognition model not loaded' };
    }

    let tempResizedPath: string | null = null;

    try {
      const detection = await this.detectFace(imageUri);
      
      if (!detection.detected || !detection.faceRegion || !detection.originalDimensions) {
        return { success: false, error: detection.error };
      }

      const { faceRegion, originalDimensions } = detection;

      const validation = await this.validateRealFace(imageUri, faceRegion);
      if (!validation.isReal) {
        return { success: false, error: validation.reason || 'Not a real face detected' };
      }

      // 🔥 v8.2: FIXED SIZE for consistent preprocessing
      const FIXED_SIZE = 512; // Always resize to same size first
      
      const resized = await ImageResizer.createResizedImage(
        imageUri,
        FIXED_SIZE,
        FIXED_SIZE,
        'PNG',
        100,
        0,
        undefined,
        false,
        { mode: 'contain', onlyScaleDown: false }
      );

      tempResizedPath = resized.uri;

      const imagePath = Platform.OS === 'ios' 
        ? resized.uri 
        : resized.uri.replace('file://', '');

      const base64Image = await RNFS.readFile(imagePath, 'base64');
      const { data: rgbaData, width: imgWidth, height: imgHeight } = this.decodeBase64ToRGBA(base64Image);

      // 🔥 v8.2: Recalculate face region for resized image
      const faceScaleX = imgWidth / originalDimensions.width;
      const faceScaleY = imgHeight / originalDimensions.height;
      
      const scaledFaceX = faceRegion.x * faceScaleX;
      const scaledFaceY = faceRegion.y * faceScaleY;
      const scaledFaceW = faceRegion.width * faceScaleX;
      const scaledFaceH = faceRegion.height * faceScaleY;

      // 🔥 v8.2: CONSISTENT padding for all sources
      const padding = 0.30;
      const padX = scaledFaceW * padding;
      const padY = scaledFaceH * padding;

      const cropX = Math.max(0, scaledFaceX - padX);
      const cropY = Math.max(0, scaledFaceY - padY);
      const cropW = Math.min(scaledFaceW + 2 * padX, imgWidth - cropX);
      const cropH = Math.min(scaledFaceH + 2 * padY, imgHeight - cropY);
      
      // Make square crop
      const cropSize = Math.max(cropW, cropH);
      const finalCropX = Math.max(0, cropX - (cropSize - cropW) / 2);
      const finalCropY = Math.max(0, cropY - (cropSize - cropH) / 2);
      const finalCropSize = Math.min(cropSize, imgWidth - finalCropX, imgHeight - finalCropY);

      console.log(`📐 Crop: x=${finalCropX.toFixed(0)}, y=${finalCropY.toFixed(0)}, size=${finalCropSize.toFixed(0)}`);

      const { data: croppedData, width: croppedWidth, height: croppedHeight } = this.cropRGBAData(
        rgbaData,
        imgWidth,
        imgHeight,
        finalCropX,
        finalCropY,
        finalCropSize,
        finalCropSize
      );

      const inputData = this.prepareRecognitionInputFromRGBA(croppedData, croppedWidth, croppedHeight);
      
      const outputs = await this.recognitionModel.run([inputData]);
      
      const embedding = this.parseEmbeddingOutput(outputs);

      if (!embedding || embedding.length === 0) {
        return { success: false, error: 'Failed to extract face embedding' };
      }

      if (embedding.length !== this.EMBEDDING_SIZE) {
        console.warn(`⚠️ Unexpected embedding size: ${embedding.length} (expected ${this.EMBEDDING_SIZE})`);
      }

      const normalizedEmbedding = this.normalizeEmbedding(embedding);
      
      const qualityCheck = this.validateEmbeddingQuality(normalizedEmbedding);
      if (!qualityCheck.valid) {
        return { success: false, error: `Invalid embedding: ${qualityCheck.reason}` };
      }
      
      return { 
        success: true, 
        embedding: normalizedEmbedding,
        confidence: detection.confidence,
      };
    } catch (error) {
      console.error('❌ Embedding extraction error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Embedding extraction failed' 
      };
    } finally {
      if (tempResizedPath) {
        await RNFS.unlink(tempResizedPath.replace('file://', '')).catch(() => {});
      }
    }
  }

  private calculateVariance(arr: number[]): number {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    return arr.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / arr.length;
  }

  private parseEmbeddingOutput(outputs: any[]): number[] {
    try {
      const output = outputs[0];
      if (!output) return [];

      const embedding = Array.isArray(output) ? output.flat() : Array.from(output);
      return embedding.map(v => typeof v === 'number' ? v : 0);
    } catch (error) {
      console.error('❌ Error parsing embedding output:', error);
      return [];
    }
  }

  private normalizeEmbedding(embedding: number[]): number[] {
    const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    
    console.log(`📊 Raw embedding norm: ${norm.toFixed(4)}`);
    console.log(`📊 First 5 raw values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    
    if (norm === 0 || !isFinite(norm)) {
      console.error('❌ Invalid norm - returning raw embedding');
      return embedding;
    }
    
    const normalized = embedding.map(val => val / norm);
    
    const newNorm = Math.sqrt(normalized.reduce((sum, val) => sum + val * val, 0));
    console.log(`📊 Normalized norm: ${newNorm.toFixed(4)} (should be ~1.0)`);
    console.log(`📊 First 5 normalized: [${normalized.slice(0, 5).map(v => v.toFixed(4)).join(', ')}]`);
    
    return normalized;
  }

  // 🔥 v8.2: IMPROVED COMPARISON - More lenient for cross-source matching
  private compareEmbeddings(emb1: number[], emb2: number[]): number {
    if (emb1.length !== emb2.length) {
      console.error(`❌ Embedding length mismatch: ${emb1.length} vs ${emb2.length}`);
      return 0;
    }

    // Calculate Euclidean distance
    let sumSquaredDiff = 0;
    for (let i = 0; i < emb1.length; i++) {
      sumSquaredDiff += Math.pow(emb1[i] - emb2[i], 2);
    }
    
    const distance = Math.sqrt(sumSquaredDiff);
    
    // 🔥 v8.2: RELAXED scoring for FaceNet-512
    // Same person typical distance: 0.3 - 0.8
    // Different person typical distance: 1.0 - 1.5
    // Cross-source (gallery vs camera) may have higher distances
    
    const maxDistance = 1.2; // Increased from 1.1
    const score = Math.max(0, Math.min(1, (maxDistance - distance) / maxDistance));
    
    console.log(`📏 Distance: ${distance.toFixed(3)}, Score: ${(score * 100).toFixed(1)}%`);
    return score;
  }

  private async pickMultipleImages(count: number): Promise<string[]> {
    const result: ImagePickerResponse = await launchImageLibrary({
      mediaType: 'photo',
      quality: 1.0,
      selectionLimit: count,
      includeBase64: false,
    });

    if (result.didCancel) throw new Error('Photo selection cancelled');
    if (result.errorCode) throw new Error(result.errorMessage || 'Image picker error');
    
    const uris = result.assets?.map(asset => asset.uri).filter(uri => uri !== undefined) as string[];
    if (!uris || uris.length === 0) throw new Error('No images selected');

    return uris;
  }

  setProgressCallback(callback: (progress: EnrollmentProgress) => void): void {
    this.progressCallback = callback;
  }

  private notifyProgress(step: number, total: number, message: string): void {
    this.progressCallback?.({ step, total, message });
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔥 v8.2: CAMERA-BASED ENROLLMENT (RECOMMENDED)
  // ═══════════════════════════════════════════════════════════════

  async enrollFromCamera(
    userId: string, 
    userName: string,
    cameraRef: React.RefObject<Camera>,
    photoCount: number = 5
  ): Promise<boolean> {
    if (this.enrollmentLock) throw new Error('Another enrollment is in progress.');
    if (!this.detectionModel || !this.recognitionModel) throw new Error('TFLite models not loaded');
    if (!cameraRef.current) throw new Error('Camera not ready');

    this.enrollmentLock = true;

    try {
      console.log(`\n${'═'.repeat(50)}`);
      console.log(`🎯 CAMERA ENROLLING: ${userName} (${userId})`);
      console.log(`${'═'.repeat(50)}`);

      const faceEmbeddings: number[][] = [];
      const confidenceScores: number[] = [];

      for (let i = 0; i < photoCount; i++) {
        const stepNum = i + 1;
        console.log(`\n📸 Capturing photo ${stepNum}/${photoCount}...`);
        this.notifyProgress(stepNum, photoCount, `Capturing photo ${stepNum}/${photoCount}...`);

        const photo = await cameraRef.current.takePhoto({ 
          flash: 'off', 
          enableShutterSound: false 
        });
        
        const photoPath = photo.path.startsWith('file://') 
          ? photo.path 
          : `file://${photo.path}`;

        const result = await this.extractEmbedding(photoPath);
        await RNFS.unlink(photo.path).catch(() => {});

        if (!result.success || !result.embedding) {
          console.warn(`⚠️ Photo ${stepNum} failed: ${result.error}`);
          continue;
        }

        faceEmbeddings.push(result.embedding);
        confidenceScores.push(result.confidence || 0);
        console.log(`✅ Photo ${stepNum} done - Confidence: ${(result.confidence! * 100).toFixed(1)}%`);

        // Wait between captures
        if (i < photoCount - 1) {
          await new Promise(r => setTimeout(r, 500));
        }
      }

      if (faceEmbeddings.length < this.MIN_ENROLLMENT_PHOTOS) {
        throw new Error(
          `Only ${faceEmbeddings.length} photos captured successfully. Need at least ${this.MIN_ENROLLMENT_PHOTOS}.`
        );
      }

      console.log(`\n✅ Successfully captured ${faceEmbeddings.length} photos`);

      // Calculate consistency
      const similarities: number[] = [];
      for (let i = 0; i < faceEmbeddings.length; i++) {
        for (let j = i + 1; j < faceEmbeddings.length; j++) {
          similarities.push(this.compareEmbeddings(faceEmbeddings[i], faceEmbeddings[j]));
        }
      }

      const avgSim = similarities.length > 0 
        ? similarities.reduce((a, b) => a + b, 0) / similarities.length 
        : 1;
      const avgConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;

      console.log(`📊 Enrollment Quality:`);
      console.log(`   Average Consistency: ${(avgSim * 100).toFixed(1)}%`);
      console.log(`   Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);

      // Save user info
      await this.saveLastUserInfo(userId, userName);

      // Save enrollment
      this.notifyProgress(photoCount, photoCount, 'Saving face data...');

      const faceData: FaceData = { 
        userId, 
        userName, 
        faceEmbeddings, 
        timestamp: Date.now(),
        enrollmentSource: 'camera'
      };
      
      const existingIndex = this.enrolledFaces.findIndex(f => f.userId === userId);

      if (existingIndex >= 0) {
        this.enrolledFaces[existingIndex] = faceData;
        console.log(`🔄 Updated existing enrollment for ${userName}`);
      } else {
        this.enrolledFaces.push(faceData);
        console.log(`🆕 New enrollment for ${userName}`);
      }

      await this.saveToStorage();
      
      console.log(`\n${'═'.repeat(50)}`);
      console.log(`🎉 CAMERA ENROLLMENT SUCCESS!`);
      console.log(`   User: ${userName}`);
      console.log(`   Photos: ${faceEmbeddings.length}`);
      console.log(`   Quality: ${(avgSim * 100).toFixed(1)}%`);
      console.log(`${'═'.repeat(50)}\n`);
      
      return true;
    } finally {
      this.progressCallback = undefined;
      this.enrollmentLock = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔥 v8.2: GALLERY ENROLLMENT (with relaxed thresholds)
  // ═══════════════════════════════════════════════════════════════

  async enrollFromGallery(userId: string, userName: string): Promise<boolean> {
    if (this.enrollmentLock) throw new Error('Another enrollment is in progress.');
    if (!this.detectionModel || !this.recognitionModel) throw new Error('TFLite models not loaded');

    this.enrollmentLock = true;

    try {
      console.log(`\n${'═'.repeat(50)}`);
      console.log(`🎯 GALLERY ENROLLING: ${userName} (${userId})`);
      console.log(`${'═'.repeat(50)}`);

      this.notifyProgress(1, 3, `Select ${this.MIN_ENROLLMENT_PHOTOS}-${this.MAX_ENROLLMENT_PHOTOS} photos`);
      
      const imageUris = await this.pickMultipleImages(this.MAX_ENROLLMENT_PHOTOS);
      
      if (imageUris.length < this.MIN_ENROLLMENT_PHOTOS) {
        throw new Error(
          `Please select at least ${this.MIN_ENROLLMENT_PHOTOS} photos. You selected ${imageUris.length}.`
        );
      }

      console.log(`📸 Processing ${imageUris.length} photos...`);
      this.notifyProgress(2, 3, `Processing ${imageUris.length} photos...`);

      const faceEmbeddings: number[][] = [];
      const confidenceScores: number[] = [];

      for (let i = 0; i < imageUris.length; i++) {
        const stepNum = i + 1;
        console.log(`\n📷 Processing photo ${stepNum}/${imageUris.length}...`);
        this.notifyProgress(2, 3, `🤖 Processing photo ${stepNum}/${imageUris.length}...`);

        const result = await this.extractEmbedding(imageUris[i]);

        if (!result.success || !result.embedding) {
          console.warn(`⚠️ Photo ${stepNum} failed: ${result.error}`);
          continue;
        }

        faceEmbeddings.push(result.embedding);
        confidenceScores.push(result.confidence || 0);
        console.log(`✅ Photo ${stepNum} done - Confidence: ${(result.confidence! * 100).toFixed(1)}%`);
      }

      if (faceEmbeddings.length < this.MIN_ENROLLMENT_PHOTOS) {
        throw new Error(
          `Only ${faceEmbeddings.length} photos processed successfully. Need at least ${this.MIN_ENROLLMENT_PHOTOS}.`
        );
      }

      console.log(`\n✅ Successfully processed ${faceEmbeddings.length} photos`);

      const similarities: number[] = [];
      for (let i = 0; i < faceEmbeddings.length; i++) {
        for (let j = i + 1; j < faceEmbeddings.length; j++) {
          similarities.push(this.compareEmbeddings(faceEmbeddings[i], faceEmbeddings[j]));
        }
      }

      const avgSim = similarities.length > 0 
        ? similarities.reduce((a, b) => a + b, 0) / similarities.length 
        : 1;
      const minSim = similarities.length > 0 ? Math.min(...similarities) : 1;
      const avgConfidence = confidenceScores.reduce((a, b) => a + b, 0) / confidenceScores.length;

      console.log(`📊 Enrollment Quality:`);
      console.log(`   Average Consistency: ${(avgSim * 100).toFixed(1)}%`);
      console.log(`   Minimum Consistency: ${(minSim * 100).toFixed(1)}%`);
      console.log(`   Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);

      if (avgSim < this.ENROLLMENT_CONSISTENCY) {
        throw new Error(
          `Photos not consistent enough (${(avgSim * 100).toFixed(0)}%). ` +
          `Need ${(this.ENROLLMENT_CONSISTENCY * 100).toFixed(0)}%+. Use clear photos of the SAME person.`
        );
      }

      this.notifyProgress(3, 3, 'Validating uniqueness...');
      const uniqueCheck = await this.validateUniqueUser(faceEmbeddings);
      
      if (!uniqueCheck.unique) {
        throw new Error(
          `This face is too similar to "${uniqueCheck.conflictUser}" ` +
          `(${(uniqueCheck.similarity! * 100).toFixed(0)}% match). ` +
          `Cannot enroll duplicate or very similar faces.`
        );
      }

      await this.saveLastUserInfo(userId, userName);

      this.notifyProgress(3, 3, 'Saving face data...');

      const faceData: FaceData = { 
        userId, 
        userName, 
        faceEmbeddings, 
        timestamp: Date.now(),
        enrollmentSource: 'gallery'
      };
      
      const existingIndex = this.enrolledFaces.findIndex(f => f.userId === userId);

      if (existingIndex >= 0) {
        this.enrolledFaces[existingIndex] = faceData;
        console.log(`🔄 Updated existing enrollment for ${userName}`);
      } else {
        this.enrolledFaces.push(faceData);
        console.log(`🆕 New enrollment for ${userName}`);
      }

      await this.saveToStorage();
      
      console.log(`\n${'═'.repeat(50)}`);
      console.log(`🎉 GALLERY ENROLLMENT SUCCESS!`);
      console.log(`   User: ${userName}`);
      console.log(`   Photos: ${faceEmbeddings.length}`);
      console.log(`   Quality: ${(avgSim * 100).toFixed(1)}%`);
      console.log(`${'═'.repeat(50)}\n`);
      
      return true;
    } finally {
      this.progressCallback = undefined;
      this.enrollmentLock = false;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // 🔥 v8.2: IMPROVED VERIFICATION
  // ═══════════════════════════════════════════════════════════════

  async verifyFromCamera(cameraRef: React.RefObject<Camera>): Promise<VerificationResult> {
    const startTime = Date.now();

    try {
      if (!this.detectionModel || !this.recognitionModel) {
        return { 
          success: false, 
          message: 'TFLite models not loaded', 
          processingTime: Date.now() - startTime, 
          faceDetected: false 
        };
      }

      if (!cameraRef.current) {
        return { 
          success: false, 
          message: 'Camera not ready', 
          processingTime: Date.now() - startTime, 
          faceDetected: false 
        };
      }

      if (this.enrolledFaces.length === 0) {
        return { 
          success: false, 
          message: 'No enrolled faces. Please enroll first.', 
          processingTime: Date.now() - startTime, 
          faceDetected: false 
        };
      }

      const capturedEmbeddings: number[][] = [];

      // Take 3 photos for better accuracy
      for (let i = 0; i < 3; i++) {
        const photo = await cameraRef.current.takePhoto({ 
          flash: 'off', 
          enableShutterSound: false 
        });
        
        const photoPath = photo.path.startsWith('file://') 
          ? photo.path 
          : `file://${photo.path}`;

        const result = await this.extractEmbedding(photoPath);
        await RNFS.unlink(photo.path).catch(() => {});

        if (!result.success || !result.embedding) {
          return { 
            success: false, 
            message: result.error || 'No face detected', 
            processingTime: Date.now() - startTime, 
            faceDetected: false 
          };
        }

        capturedEmbeddings.push(result.embedding);

        if (i < 2) await new Promise(r => setTimeout(r, 200));
      }

      // 🔥 v8.2: MOVED DEBUG LOG AFTER capture loop
      console.log('\n═══════════════════════════════════════');
      console.log('🔍 VERIFICATION DEBUG:');
      console.log(`📸 Captured embeddings: ${capturedEmbeddings.length}`);
      console.log(`📁 Enrolled users: ${this.enrolledFaces.length}`);

      if (capturedEmbeddings.length > 0) {
        const captured = capturedEmbeddings[0];
        const capturedNorm = Math.sqrt(captured.reduce((sum, val) => sum + val * val, 0));
        console.log(`📸 Captured norm: ${capturedNorm.toFixed(4)}`);
        console.log(`📸 Captured first 5: [${captured.slice(0, 5).map(v => v.toFixed(6)).join(', ')}]`);
      }

      if (this.enrolledFaces.length > 0) {
        const enrolled = this.enrolledFaces[0].faceEmbeddings[0];
        const enrolledNorm = Math.sqrt(enrolled.reduce((sum, val) => sum + val * val, 0));
        console.log(`📁 Enrolled norm: ${enrolledNorm.toFixed(4)}`);
        console.log(`📁 Enrolled first 5: [${enrolled.slice(0, 5).map(v => v.toFixed(6)).join(', ')}]`);
        console.log(`📁 Enrolled source: ${this.enrolledFaces[0].enrollmentSource || 'unknown'}`);
      }
      console.log('═══════════════════════════════════════\n');

      // Calculate capture consistency
      const captureConsistencies: number[] = [];
      for (let i = 0; i < capturedEmbeddings.length; i++) {
        for (let j = i + 1; j < capturedEmbeddings.length; j++) {
          captureConsistencies.push(
            this.compareEmbeddings(capturedEmbeddings[i], capturedEmbeddings[j])
          );
        }
      }
      
      const avgCaptureConsistency = captureConsistencies.reduce((a, b) => a + b, 0) / captureConsistencies.length;
      console.log(`📸 Capture consistency: ${(avgCaptureConsistency * 100).toFixed(1)}%`);

      // 🔥 v8.2: Relaxed consistency check
      if (avgCaptureConsistency < 0.50) {
        return {
          success: false,
          message: `Unstable capture (${(avgCaptureConsistency * 100).toFixed(0)}%). Please hold still and try again.`,
          processingTime: Date.now() - startTime,
          faceDetected: true,
        };
      }

      // Compare with enrolled faces
      let bestMatch: FaceData | null = null;
      let bestScore = 0;
      const userScores: Map<string, number> = new Map();

      console.log('\n📊 VERIFICATION SCORES:');
      
      for (const face of this.enrolledFaces) {
        const allScores: number[] = [];

        for (const capturedEmb of capturedEmbeddings) {
          for (const enrolledEmb of face.faceEmbeddings) {
            const score = this.compareEmbeddings(capturedEmb, enrolledEmb);
            allScores.push(score);
          }
        }

        // Use average of top scores
        allScores.sort((a, b) => b - a);
        const topCount = Math.min(5, allScores.length);
        const topScores = allScores.slice(0, topCount);
        const avgScore = topScores.reduce((a, b) => a + b, 0) / topScores.length;

        userScores.set(face.userId, avgScore);
        console.log(`   ${face.userName}: ${(avgScore * 100).toFixed(1)}% (source: ${face.enrollmentSource || 'unknown'})`);

        if (avgScore > bestScore) {
          bestScore = avgScore;
          bestMatch = face;
        }
      }
      
      console.log(`  Threshold: ${(this.VERIFICATION_THRESHOLD * 100).toFixed(1)}%`);
      console.log(`  Absolute Min: ${(this.ABSOLUTE_MIN_THRESHOLD * 100).toFixed(1)}%\n`);

      // Find second best score
      let secondBestScore = 0;
      if (this.enrolledFaces.length > 1) {
        for (const face of this.enrolledFaces) {
          if (face === bestMatch) continue;
          const score = userScores.get(face.userId) || 0;
          if (score > secondBestScore) {
            secondBestScore = score;
          }
        }
      }

      const processingTime = Date.now() - startTime;
      const confidenceGap = bestScore - secondBestScore;

      console.log(`🎯 Best: ${(bestScore * 100).toFixed(1)}%, Second: ${(secondBestScore * 100).toFixed(1)}%, Gap: ${(confidenceGap * 100).toFixed(1)}%`);

      // Validation checks
      if (bestScore < this.ABSOLUTE_MIN_THRESHOLD) {
        return {
          success: false,
          message: `Face not recognized (${(bestScore * 100).toFixed(0)}% < ${(this.ABSOLUTE_MIN_THRESHOLD * 100).toFixed(0)}% minimum)`,
          confidence: bestScore,
          processingTime,
          faceDetected: true,
        };
      }

      if (bestScore < this.VERIFICATION_THRESHOLD) {
        return {
          success: false,
          message: `Face not recognized (${(bestScore * 100).toFixed(0)}% < ${(this.VERIFICATION_THRESHOLD * 100).toFixed(0)}% required)`,
          confidence: bestScore,
          processingTime,
          faceDetected: true,
        };
      }

      if (this.enrolledFaces.length > 1 && confidenceGap < this.MIN_CONFIDENCE_GAP) {
        return {
          success: false,
          message: `Match ambiguous (gap: ${(confidenceGap * 100).toFixed(0)}% < ${(this.MIN_CONFIDENCE_GAP * 100).toFixed(0)}% required). Try again.`,
          confidence: bestScore,
          processingTime,
          faceDetected: true,
        };
      }

      // 🔥 v8.2: Relaxed photo attack detection
      if (bestScore > 0.99) {
        console.log('⚠️ Suspiciously high match - possible photo attack');
        return {
          success: false,
          message: 'Verification failed - suspiciously high match. Please use live face.',
          confidence: bestScore,
          processingTime,
          faceDetected: true,
        };
      }

      // Success!
      if (bestMatch) {
        console.log(`\n✅ VERIFICATION SUCCESS: ${bestMatch.userName} (${(bestScore * 100).toFixed(1)}%)\n`);
        
        return {
          success: true,
          userId: bestMatch.userId,
          userName: bestMatch.userName,
          confidence: bestScore,
          message: `Welcome, ${bestMatch.userName}!`,
          processingTime,
          faceDetected: true,
        };
      }

      return {
        success: false,
        message: 'Face not recognized',
        confidence: bestScore,
        processingTime,
        faceDetected: true,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Verification failed',
        processingTime: Date.now() - startTime,
        faceDetected: false,
      };
    }
  }

  private async saveToStorage(): Promise<void> {
    if (this.enrolledFaces.length > 0) {
      const firstEmb = this.enrolledFaces[0].faceEmbeddings[0];
      const norm = Math.sqrt(firstEmb.reduce((sum, val) => sum + val * val, 0));
      console.log(`💾 SAVING - Embedding length: ${firstEmb.length}`);
      console.log(`💾 SAVING - Norm: ${norm.toFixed(4)}`);
      console.log(`💾 SAVING - First 5: [${firstEmb.slice(0, 5).map(v => v.toFixed(6)).join(', ')}]`);
    }
    
    const data = JSON.stringify(this.enrolledFaces);
    await AsyncStorage.setItem('@enrolled_faces_v82', data); // 🔥 v8.2: New storage key
    console.log(`💾 Saved ${this.enrolledFaces.length} face(s), size: ${data.length} bytes`);
  }

  async loadEnrolledFaces(): Promise<void> {
    try {
      // 🔥 v8.2: Try new key first, then fall back to old
      let data = await AsyncStorage.getItem('@enrolled_faces_v82');
      
      if (!data) {
        data = await AsyncStorage.getItem('@enrolled_faces_v8');
      }
      
      this.enrolledFaces = data ? JSON.parse(data) : [];
      
      if (this.enrolledFaces.length > 0) {
        const firstEmb = this.enrolledFaces[0].faceEmbeddings[0];
        const norm = Math.sqrt(firstEmb.reduce((sum, val) => sum + val * val, 0));
        console.log(`📥 LOADED - Embedding length: ${firstEmb.length}`);
        console.log(`📥 LOADED - Norm: ${norm.toFixed(4)}`);
        console.log(`📥 LOADED - First 5: [${firstEmb.slice(0, 5).map(v => v.toFixed(6)).join(', ')}]`);
        
        if (norm < 0.9 || norm > 1.1) {
          console.error(`❌ WARNING: Loaded embedding norm is ${norm}, should be ~1.0!`);
          console.log('⚠️ Data might be corrupted. Consider re-enrolling.');
        }
      }
      
      console.log(`📥 Loaded ${this.enrolledFaces.length} face(s)`);
    } catch (error) {
      console.error('❌ Failed to load faces:', error);
      this.enrolledFaces = [];
    }
  }

  async clearEnrolledFaces(): Promise<void> {
    this.enrolledFaces = [];
    await AsyncStorage.removeItem('@enrolled_faces_v82');
    await AsyncStorage.removeItem('@enrolled_faces_v8');
    await AsyncStorage.removeItem('@enrolled_faces_v7');
    await AsyncStorage.removeItem('@enrolled_faces_v6');
    console.log('🗑️ Cleared all enrolled faces');
  }

  getEnrollmentStatus() {
    return {
      count: this.enrolledFaces.length,
      users: this.enrolledFaces.map(f => ({ 
        userId: f.userId, 
        userName: f.userName, 
        photoCount: f.faceEmbeddings.length,
        timestamp: f.timestamp,
        source: f.enrollmentSource || 'unknown'
      })),
    };
  }

  getEnrolledCount(): number { 
    return this.enrolledFaces.length; 
  }
  
  getEnrolledUsers() { 
    return this.enrolledFaces.map(f => ({ 
      userId: f.userId, 
      userName: f.userName, 
      photoCount: f.faceEmbeddings.length,
      timestamp: f.timestamp,
      source: f.enrollmentSource || 'unknown'
    })); 
  }
  
  isInitialized(): boolean { 
    return this.isReady; 
  }
}

export default new SimpleFaceService();
