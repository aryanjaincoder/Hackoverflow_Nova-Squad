// Create this file at: src/types/ml-kit-face-detection.d.ts
// This fixes the TypeScript errors for @react-native-ml-kit/face-detection

declare module '@react-native-ml-kit/face-detection' {
  import { Frame } from 'react-native-vision-camera';

  export interface FaceBounds {
    x: number;
    y: number;
    width: number;
    height: number;
  }

  export interface FaceLandmark {
    type: string;
    position: {
      x: number;
      y: number;
    };
  }

  export interface FaceContour {
    type: string;
    points: Array<{
      x: number;
      y: number;
    }>;
  }

  export interface Face {
    bounds: FaceBounds;
    landmarks?: FaceLandmark[];
    contours?: FaceContour[];
    leftEyeOpenProbability?: number;
    rightEyeOpenProbability?: number;
    smilingProbability?: number;
    headEulerAngleX?: number;
    headEulerAngleY?: number;
    headEulerAngleZ?: number;
    trackingId?: number;
  }

  export interface FaceDetectionOptions {
    performanceMode?: 'fast' | 'accurate';
    landmarkMode?: 'none' | 'all';
    contourMode?: 'none' | 'all';
    classificationMode?: 'none' | 'all';
    minFaceSize?: number;
    enableTracking?: boolean;
  }

  export default class FaceDetection {
    static detect(
      frame: Frame,
      options?: FaceDetectionOptions
    ): Promise<Face[]>;
  }
}