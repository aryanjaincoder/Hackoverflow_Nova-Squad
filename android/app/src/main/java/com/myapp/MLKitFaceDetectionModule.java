package com.myapp;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.net.Uri;
import com.facebook.react.bridge.*;
import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.face.*;

public class MLKitFaceDetectionModule extends ReactContextBaseJavaModule {
    
    public MLKitFaceDetectionModule(ReactApplicationContext context) {
        super(context);
    }
    
    @Override
    public String getName() {
        return "MLKitFaceDetection";
    }
    
    @ReactMethod
    public void detectFace(String imagePath, Promise promise) {
        try {
            Uri uri = Uri.parse(imagePath);
            Bitmap bitmap = BitmapFactory.decodeFile(uri.getPath());
            InputImage image = InputImage.fromBitmap(bitmap, 0);
            
            FaceDetectorOptions options = new FaceDetectorOptions.Builder()
                .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
                .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_ALL)
                .build();
            
            FaceDetector detector = FaceDetection.getClient(options);
            
            detector.process(image)
                .addOnSuccessListener(faces -> {
                    WritableMap result = Arguments.createMap();
                    
                    if (faces.size() > 0) {
                        Face face = faces.get(0);
                        float leftEyeOpen = face.getLeftEyeOpenProbability() != null 
                            ? face.getLeftEyeOpenProbability() : 0;
                        float rightEyeOpen = face.getRightEyeOpenProbability() != null 
                            ? face.getRightEyeOpenProbability() : 0;
                        
                        result.putBoolean("faceDetected", true);
                        result.putBoolean("eyesOpen", leftEyeOpen > 0.5 && rightEyeOpen > 0.5);
                    } else {
                        result.putBoolean("faceDetected", false);
                        result.putBoolean("eyesOpen", false);
                    }
                    
                    promise.resolve(result);
                })
                .addOnFailureListener(e -> promise.reject("ERROR", e.getMessage()));
                
        } catch (Exception e) {
            promise.reject("ERROR", e.getMessage());
        }
    }
}