// FaceScanScreen_V2.tsx - HACKATHON WINNER VERSION
// 🔥 Burst Mode + Scanning Animation + Better UX

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
  Platform,
  StatusBar,
  Animated,
  Vibration,
} from 'react-native';
import {
  useNavigation,
  useRoute,
  RouteProp,
  useIsFocused,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
} from 'react-native-vision-camera';
import { verifyFaceWithAPI, prewarmVerification } from '../../services/FaceDetectionService';

type RootStackParamList = {
  FaceScanScreen: { 
    sessionId: string; 
    nextAction?: string;
  };
  ScanQRScreen: {
    sessionId: string;
    faceVerifiedToken: string;
    userId?: string;
    userName?: string;
  };
  NFCTapScreen: { 
    sessionId: string; 
    faceVerifiedToken: string;
  };
  SoundReceiver: {
    sessionId: string; 
    faceVerifiedToken: string;
  };
  Home: undefined;
};

type FaceScanScreenRouteProp = RouteProp<RootStackParamList, 'FaceScanScreen'>;
type FaceScanNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'FaceScanScreen'
>;

type ScanStatus =
  | 'checking_permission'
  | 'ready'
  | 'verifying'
  | 'matched'
  | 'failed'
  | 'permission_denied';

const { width, height } = Dimensions.get('window');
const FACE_OVAL_SIZE = width * 0.65;

const FaceScanScreen: React.FC = () => {
  const navigation = useNavigation<FaceScanNavigationProp>();
  const route = useRoute<FaceScanScreenRouteProp>();
  
  const { sessionId, nextAction } = route.params;
  const isFocused = useIsFocused();

  const device = useCameraDevice('front');
  const { hasPermission, requestPermission } = useCameraPermission();
  const cameraRef = useRef<Camera>(null);

  const [scanStatus, setScanStatus] = useState<ScanStatus>('checking_permission');
  const [statusMessage, setStatusMessage] = useState('Position your face');
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [scanningStep, setScanningStep] = useState<string>('');

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // 🔥 NEW: Scanning laser animation
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // 🔥 Pre-warm on mount
  useEffect(() => {
    prewarmVerification();
  }, []);

  // 🔥 NEW: Pulse animation for face oval
  useEffect(() => {
    if (scanStatus === 'ready') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }
  }, [scanStatus]);

  // 🔥 NEW: Scanning laser animation
  useEffect(() => {
    if (scanStatus === 'verifying') {
      scanLineAnim.setValue(0);
      Animated.loop(
        Animated.timing(scanLineAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        })
      ).start();
    } else {
      scanLineAnim.stopAnimation();
    }
  }, [scanStatus]);

  // Camera warmup
  useEffect(() => {
    if (isFocused && scanStatus === 'ready') {
      console.log('🔥 Camera warming up...');
      const timer = setTimeout(() => {
        console.log('✅ Camera ready');
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [isFocused, scanStatus]);

  // Auto-verify after warmup
  useEffect(() => {
  if (scanStatus === 'ready' && isFocused) {
    console.log('⏰ Auto-verify in 3s...'); // 🔥 Give camera more time
    const timer = setTimeout(() => {
  if (scanStatus === 'ready') {
    handleVerification();
  }
}, 1500); // 3000→1500ms (faster start)
      
      return () => clearTimeout(timer);
    }
  }, [scanStatus, isFocused]);

  // Permission check
  useEffect(() => {
    let mounted = true;

    const checkPermission = async () => {
      if (!isFocused || isPermissionChecked) return;

      console.log('🔐 Checking camera permission...');
      setIsPermissionChecked(true);

      try {
        if (hasPermission === true) {
          console.log('✅ Permission granted');
          if (mounted) {
            setScanStatus('ready');
            setStatusMessage('Position your face');
          }
          return;
        }

        if (hasPermission === false) {
          console.log('❌ Requesting permission...');
          const granted = await requestPermission();
          
          if (!mounted) return;

          if (granted) {
            console.log('✅ Permission granted');
            setScanStatus('ready');
            setStatusMessage('Position your face');
          } else {
            console.log('❌ Permission denied');
            setScanStatus('permission_denied');
            Alert.alert(
              'Camera Permission Required',
              'Enable camera access in settings.',
              [
                { 
                  text: 'OK', 
                  onPress: () => {
                    if (mounted) navigation.goBack();
                  }
                }
              ],
            );
          }
        }
      } catch (error) {
        console.error('❌ Permission error:', error);
        if (mounted) setScanStatus('permission_denied');
      }
    };

    checkPermission();
    return () => { mounted = false; };
  }, [isFocused]);

  // 🔥 IMPROVED: Better UX with step-by-step feedback
  const handleVerification = async () => {
    if (scanStatus === 'verifying') {
      console.log('⚠️ Already verifying...');
      return;
    }

    console.log('🚀 Starting BURST verification...');
    setScanStatus('verifying');
    setStatusMessage('Capturing frames...');
    setScanningStep('📸 Capturing...');
    Vibration.vibrate(40);

    Animated.timing(fadeAnim, {
      toValue: 0.3,
      duration: 300,
      useNativeDriver: true,
    }).start();

    try {
  // 🔥 Step 1: Capturing (Give camera time to process)
 // 🔥 Step 1: Capturing
await new Promise(resolve => setTimeout(resolve, 150)); // 400→150ms
setScanningStep('🔍 Detecting face...');

// 🔥 Step 2: Processing
await new Promise(resolve => setTimeout(resolve, 150)); // 400→150ms
setScanningStep('🧠 Analyzing features...');

// 🔥 Step 3: Matching (removed - unnecessary)
setScanningStep('🔎 Searching database...');

      const result = await verifyFaceWithAPI(cameraRef, false); // Add false parameter

      if (!isFocused) {
        console.log('⚠️ Screen not focused');
        return;
      }

      console.log('📊 Result:', result);
      setProcessingTime(result.processingTime || 0);

      if (result.success) {
        // ✅ SUCCESS
        console.log('✅ Verification SUCCESS!');
        setScanStatus('matched');
        setStatusMessage(`Welcome ${result.userName}!`);
        setScanningStep('✅ Verified!');
        Vibration.vibrate([0, 50, 30, 50]);

        Animated.parallel([
          Animated.spring(successAnim, {
            toValue: 1,
            tension: 40,
            friction: 4,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();

        setTimeout(() => {
          const token = `verified_${result.userId}_${Date.now()}`;
          
          console.log('🎯 [FaceScan] Routing based on nextAction:', nextAction);
          
          switch (nextAction) {
            case 'OPEN_NFC_SCANNER':
              console.log('📱 Navigating to NFC Tap Screen');
              navigation.replace('NFCTapScreen', {
                sessionId,
                faceVerifiedToken: token,
              });
              break;
              
            case 'OPEN_SOUND_RECEIVER':
              console.log('🔊 Navigating to Sound Receiver');
              navigation.replace('SoundReceiver', {
                sessionId,
                faceVerifiedToken: token,
              });
              break;
              
            case 'OPEN_SCANNER':
            case 'JOIN_SESSION_ACTION':
            case 'OPEN_P2P_SCREEN':
            default:
              console.log('📷 Navigating to QR Scanner (default)');
              navigation.replace('ScanQRScreen', {
                sessionId,
                faceVerifiedToken: token,
                userId: result.userId,
                userName: result.userName,
              });
              break;
          }
        }, 1200);
      } else {
        // ❌ FAILED
        console.log('❌ Verification FAILED');
        setScanStatus('failed');
        setStatusMessage(result.message || 'Face not recognized');
        setScanningStep('❌ Failed');
        Vibration.vibrate([0, 100, 50, 100]);

        Animated.sequence([
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: -10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 10,
            duration: 50,
            useNativeDriver: true,
          }),
          Animated.timing(shakeAnim, {
            toValue: 0,
            duration: 50,
            useNativeDriver: true,
          }),
        ]).start();

        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        setTimeout(() => {
          setScanStatus('ready');
          setStatusMessage('Position your face');
          setScanningStep('');
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Verification error:', error);
      setScanStatus('failed');
      setStatusMessage('Error occurred');
      setScanningStep('❌ Error');
      
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      Alert.alert(
        'Error',
        'Verification failed. Check internet connection.',
        [
          {
            text: 'Try Again',
            onPress: () => {
              setScanStatus('ready');
              setStatusMessage('Position your face');
              setScanningStep('');
              fadeAnim.setValue(1);
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => navigation.goBack(),
          },
        ],
      );
    }
  };

  // Permission denied screen
  if (scanStatus === 'permission_denied') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.centerContent}>
          <Icon name="camera-off" size={80} color="#e74c3c" />
          <Text style={styles.errorText}>Camera Permission Denied</Text>
          <Text style={styles.subtitleText}>
            Enable camera access in settings
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // No camera screen
  if (!device) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.centerContent}>
          <Icon name="camera-off-outline" size={80} color="#e74c3c" />
          <Text style={styles.errorText}>No Front Camera</Text>
          <Text style={styles.subtitleText}>Device has no front camera</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Loading screen
  if (scanStatus === 'checking_permission') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={[styles.statusText, { marginTop: 20 }]}>
            Checking permissions...
          </Text>
        </View>
      </View>
    );
  }

  // 🔥 Calculate scanning line position
  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-FACE_OVAL_SIZE * 0.675, FACE_OVAL_SIZE * 0.675],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* 🔥 NEW: Full-screen white overlay for better lighting */}
      {scanStatus === 'verifying' && (
        <Animated.View
          style={[
            styles.flashOverlay,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0.3, 1],
                outputRange: [0.2, 0],
              }),
            },
          ]}
        />
      )}

      {/* Camera */}
      {isFocused && device && hasPermission ? (
        <Camera
          ref={cameraRef}
          style={styles.camera}
          device={device}
          isActive={isFocused && scanStatus !== 'matched'}
          photo={true}
        />
      ) : (
        <View style={styles.cameraPlaceholder}>
          <ActivityIndicator size="large" color="#666" />
          <Text style={styles.placeholderText}>Initializing...</Text>
        </View>
      )}

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Back Button */}
        {scanStatus !== 'verifying' && scanStatus !== 'matched' && (
          <TouchableOpacity
            style={styles.backIconButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-left" size={28} color="#fff" />
          </TouchableOpacity>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Icon name="face-recognition" size={36} color="#fff" />
          <Text style={styles.headerTitle}>Face Unlock</Text>
          <Text style={styles.headerSubtitle}>
            {scanStatus === 'ready'
              ? 'Hold steady'
              : scanStatus === 'verifying'
              ? 'Processing...'
              : scanStatus === 'matched'
              ? 'Verified!'
              : 'Try again'}
          </Text>
        </View>

        {/* Face Oval */}
        <View style={styles.ovalContainer}>
          <Animated.View
            style={[
              styles.faceOval,
              {
                opacity: fadeAnim,
                transform: [
                  { scale: scanStatus === 'matched' ? successAnim : pulseAnim },
                  { translateX: shakeAnim },
                ],
                borderColor:
                  scanStatus === 'matched'
                    ? '#2ecc71'
                    : scanStatus === 'failed'
                    ? '#e74c3c'
                    : scanStatus === 'verifying'
                    ? '#3498db'
                    : '#fff',
              },
            ]}
          />

          {/* 🔥 NEW: Scanning laser line */}
          {scanStatus === 'verifying' && (
            <Animated.View
              style={[
                styles.scanLine,
                {
                  transform: [{ translateY: scanLineTranslateY }],
                },
              ]}
            />
          )}

          {scanStatus === 'matched' && (
            <Animated.View style={[styles.successIcon, { opacity: successAnim }]}>
              <Icon name="check-circle" size={100} color="#2ecc71" />
            </Animated.View>
          )}

          {scanStatus === 'failed' && (
            <View style={styles.failedIcon}>
              <Icon name="close-circle" size={80} color="#e74c3c" />
            </View>
          )}
        </View>

        {/* Status */}
        <View style={styles.statusContainer}>
          {scanStatus === 'verifying' && (
            <>
              <ActivityIndicator size="large" color="#fff" style={{ marginBottom: 12 }} />
              {/* 🔥 NEW: Step-by-step feedback */}
              {scanningStep && (
                <Text style={styles.scanningStepText}>{scanningStep}</Text>
              )}
            </>
          )}

          <Text
            style={[
              styles.statusText,
              scanStatus === 'matched' && { color: '#2ecc71' },
              scanStatus === 'failed' && { color: '#e74c3c' },
            ]}
          >
            {statusMessage}
          </Text>

          {processingTime > 0 && (
            <Text style={styles.timeText}>
              ⚡ {processingTime}ms
            </Text>
          )}

          {scanStatus === 'ready' && (
            <View style={styles.hintContainer}>
              <Icon name="information-outline" size={16} color="#999" />
              <Text style={styles.hintText}>Auto-verifying...</Text>
            </View>
          )}

          {scanStatus === 'ready' && (
            <TouchableOpacity style={styles.verifyButton} onPress={handleVerification}>
              <Icon name="face-recognition" size={24} color="#fff" />
              <Text style={styles.verifyButtonText}>Verify Now</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Session: {sessionId.substring(0, 8)}...
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#666',
    marginTop: 16,
    fontSize: 14,
  },
  flashOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#fff',
    zIndex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 40,
    zIndex: 2,
  },
  backIconButton: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 50,
    left: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 25,
  },
  header: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 25,
    marginTop: 10,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 10,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#bbb',
    marginTop: 6,
  },
  ovalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  faceOval: {
    width: FACE_OVAL_SIZE,
    height: FACE_OVAL_SIZE * 1.35,
    borderRadius: FACE_OVAL_SIZE / 1.7,
    borderWidth: 4,
    backgroundColor: 'transparent',
  },
  scanLine: {
    position: 'absolute',
    width: FACE_OVAL_SIZE,
    height: 3,
    backgroundColor: '#3498db',
    shadowColor: '#3498db',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 5,
  },
  successIcon: {
    position: 'absolute',
  },
  failedIcon: {
    position: 'absolute',
  },
  statusContainer: {
    minHeight: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingVertical: 28,
    paddingHorizontal: 40,
    borderRadius: 24,
    marginHorizontal: 20,
    width: width - 60,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  scanningStepText: {
    fontSize: 14,
    color: '#3498db',
    marginBottom: 8,
    fontWeight: '500',
  },
  timeText: {
    fontSize: 14,
    color: '#3498db',
    marginTop: 8,
    fontWeight: '600',
  },
  hintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
  },
  hintText: {
    fontSize: 13,
    color: '#999',
    marginLeft: 6,
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    marginTop: 16,
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    padding: 40,
  },
  errorText: {
    fontSize: 20,
    color: '#fff',
    marginTop: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitleText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  backButton: {
    backgroundColor: '#7f8c8d',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    marginTop: 30,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FaceScanScreen;