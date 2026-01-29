// FaceScanScreen.tsx - VERIFICATION WITH BLAZEFACE + INTELLIGENT HIDDEN CONTROLS
// ✅ Real face detection using BlazeFace model
// 🚨 HACKATHON MODE: Hidden buttons set mode, then main button triggers animated demo
// Top-left corner 2x tap = Set Success Mode | Top-right corner 2x tap = Set Failure Mode
// Then press main "Verify Face" button to see animated scanning with predetermined result

import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  TouchableWithoutFeedback,
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
import SimpleFaceService from '../../services/SimpleFaceService';

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
  EnrollFaceScreen: undefined;
};

type FaceScanNavigationProp = NativeStackNavigationProp<RootStackParamList, 'FaceScanScreen'>;
type FaceScanScreenRouteProp = RouteProp<RootStackParamList, 'FaceScanScreen'>;

type ScanStatus =
  | 'initializing'
  | 'checking_permission'
  | 'ready'
  | 'verifying'
  | 'matched'
  | 'failed'
  | 'permission_denied';

type DemoMode = 'normal' | 'force_success' | 'force_failure';

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

  const format = useMemo(() => {
    if (!device?.formats) return undefined;
    const yuvFormats = device.formats.filter((f) => {
      if ('pixelFormats' in f && Array.isArray(f.pixelFormats)) {
        return f.pixelFormats.includes('yuv');
      }
      return false;
    });
    if (yuvFormats.length === 0) return undefined;
    return yuvFormats[0];
  }, [device]);

  const [scanStatus, setScanStatus] = useState<ScanStatus>('initializing');
  const [statusMessage, setStatusMessage] = useState('Initializing...');
  const [isPermissionChecked, setIsPermissionChecked] = useState(false);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [scanningStep, setScanningStep] = useState<string>('');

  // 🚨 DEMO MODE TRACKING
  const [demoMode, setDemoMode] = useState<DemoMode>('normal');
  const successTapCount = useRef(0);
  const failureTapCount = useRef(0);
  const lastSuccessTapTime = useRef(0);
  const lastFailureTapTime = useRef(0);
  const tapResetTimeout = useRef<NodeJS.Timeout | null>(null);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const successAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scanLineAnim = useRef(new Animated.Value(0)).current;

  // ✅ INITIALIZE BLAZEFACE MODEL ON MOUNT
  useEffect(() => {
    let mounted = true;

    const initializeService = async () => {
      try {
        console.log('🔥 Initializing BlazeFace service...');
        setScanStatus('initializing');
        setStatusMessage('Loading AI model...');

        const success = await SimpleFaceService.initialize();
        
        if (!mounted) return;

        if (success) {
          console.log('✅ BlazeFace initialized successfully');
          setScanStatus('checking_permission');
          setStatusMessage('Checking permissions...');
        } else {
          console.error('❌ Failed to initialize BlazeFace');
          Alert.alert(
            'Initialization Error',
            'Failed to load face detection model. Please restart the app.',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      } catch (error) {
        console.error('❌ Initialization error:', error);
        if (mounted) {
          Alert.alert(
            'Error',
            'Failed to initialize face service',
            [{ text: 'OK', onPress: () => navigation.goBack() }]
          );
        }
      }
    };

    initializeService();
    return () => { mounted = false; };
  }, [navigation]);

  // Pulse animation
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
  }, [scanStatus, pulseAnim]);

  // Scanning laser animation
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
  }, [scanStatus, scanLineAnim]);

  // Permission check
  useEffect(() => {
    let mounted = true;

    const checkPermission = async () => {
      if (!isFocused || isPermissionChecked || scanStatus !== 'checking_permission') return;

      console.log('🔐 Checking camera permission...');
      setIsPermissionChecked(true);

      try {
        if (hasPermission === true) {
          console.log('✅ Permission granted');
          if (mounted) {
            setScanStatus('ready');
            setStatusMessage('Position your face in the frame');
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
            setStatusMessage('Position your face in the frame');
          } else {
            console.log('❌ Permission denied');
            setScanStatus('permission_denied');
            Alert.alert(
              'Camera Permission Required',
              'Enable camera access in settings to use face verification.',
              [{ text: 'OK', onPress: () => { if (mounted) navigation.goBack(); } }],
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
  }, [isFocused, hasPermission, isPermissionChecked, scanStatus, navigation, requestPermission]);

  // 🚨 HIDDEN SUCCESS MODE SETTER (TOP-LEFT)
  const handleSuccessButtonPress = () => {
    if (scanStatus !== 'ready') return;

    const now = Date.now();
    const timeSinceLastTap = now - lastSuccessTapTime.current;

    if (timeSinceLastTap > 800) {
      successTapCount.current = 0;
    }

    successTapCount.current++;
    lastSuccessTapTime.current = now;

    console.log(`🟢 Success tap count: ${successTapCount.current}`);

    if (successTapCount.current >= 2) {
      console.log('🚨 DEMO MODE SET: SUCCESS');
      successTapCount.current = 0;
      setDemoMode('force_success');
      Vibration.vibrate(50);
      
      // Visual feedback (optional - you can remove this)
      setStatusMessage('Demo: Success mode active');
      setTimeout(() => {
        setStatusMessage('Position your face in the frame');
      }, 1500);
    }

    if (tapResetTimeout.current) {
      clearTimeout(tapResetTimeout.current);
    }
    tapResetTimeout.current = setTimeout(() => {
      successTapCount.current = 0;
    }, 1000);
  };

  // 🚨 HIDDEN FAILURE MODE SETTER (TOP-RIGHT)
  const handleFailureButtonPress = () => {
    if (scanStatus !== 'ready') return;

    const now = Date.now();
    const timeSinceLastTap = now - lastFailureTapTime.current;

    if (timeSinceLastTap > 800) {
      failureTapCount.current = 0;
    }

    failureTapCount.current++;
    lastFailureTapTime.current = now;

    console.log(`🔴 Failure tap count: ${failureTapCount.current}`);

    if (failureTapCount.current >= 2) {
      console.log('🚨 DEMO MODE SET: FAILURE');
      failureTapCount.current = 0;
      setDemoMode('force_failure');
      Vibration.vibrate([0, 100]);
      
      // Visual feedback (optional)
      setStatusMessage('Demo: Failure mode active');
      setTimeout(() => {
        setStatusMessage('Position your face in the frame');
      }, 1500);
    }

    if (tapResetTimeout.current) {
      clearTimeout(tapResetTimeout.current);
    }
    tapResetTimeout.current = setTimeout(() => {
      failureTapCount.current = 0;
    }, 1000);
  };

  // 🎬 ANIMATED DEMO VERIFICATION WITH MULTIPLE SCANS
  const handleDemoVerification = async (mode: 'force_success' | 'force_failure') => {
    console.log(`🎬 Starting DEMO verification: ${mode}`);
    
    setScanStatus('verifying');
    Vibration.vibrate(40);

    // Flash animation
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.delay(250),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    const scanAttempts = mode === 'force_success' ? 4 : 6;
    const scanMessages = mode === 'force_success' 
      ? [
          '🤖 Detecting face...',
          '🔍 Analyzing features...',
          '📊 Matching patterns...',
          '✅ Verification complete!'
        ]
      : [
          '🤖 Detecting face...',
          '🔍 Analyzing features...',
          '⚠️ Low confidence...',
          '🔄 Retrying detection...',
          '📊 Re-analyzing...',
          '❌ Match failed!'
        ];

    // Simulate multiple scan attempts
    for (let i = 0; i < scanAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 600));
      
      if (i < scanMessages.length) {
        setScanningStep(scanMessages[i]);
        setStatusMessage(scanMessages[i]);
      }
      
      // Pulse effect on each scan
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }

    // Final delay before result
    await new Promise(resolve => setTimeout(resolve, 400));

    if (mode === 'force_success') {
      // ✅ SUCCESS RESULT
      console.log('✅ DEMO SUCCESS');
      setScanStatus('matched');
      setStatusMessage('✅ Verification Success');
      setScanningStep('✅ Success!');
      setProcessingTime(2400 + Math.floor(Math.random() * 200));
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
        const token = `verified_demo_success_${Date.now()}`;
        setDemoMode('normal'); // Reset mode
        
        switch (nextAction) {
          case 'OPEN_NFC_SCANNER':
            navigation.replace('NFCTapScreen', { sessionId, faceVerifiedToken: token });
            break;
          case 'OPEN_SOUND_RECEIVER':
            navigation.replace('SoundReceiver', { sessionId, faceVerifiedToken: token });
            break;
          default:
            navigation.replace('ScanQRScreen', {
              sessionId,
              faceVerifiedToken: token,
              userId: 'DEMO001',
              userName: 'Demo User',
            });
            break;
        }
      }, 1500);
    } else {
      // ❌ FAILURE RESULT
      console.log('❌ DEMO FAILURE');
      setScanStatus('failed');
      setStatusMessage('❌ Verification Failed');
      setScanningStep('❌ Failed');
      setProcessingTime(3600 + Math.floor(Math.random() * 200));
      Vibration.vibrate([0, 100, 50, 100]);

      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();

      setTimeout(() => {
        setDemoMode('normal'); // Reset mode
        Alert.alert(
          'Verification Failed',
          'Face not recognized. Please try again.',
          [
            { 
              text: 'Try Again', 
              onPress: () => {
                setScanStatus('ready');
                setStatusMessage('Position your face in the frame');
                setScanningStep('');
              }
            },
            { text: 'Cancel', onPress: () => navigation.goBack() }
          ]
        );
      }, 1500);
    }
  };

  // ✅ MAIN VERIFICATION FUNCTION
  const handleVerification = async () => {
    if (scanStatus === 'verifying') {
      console.log('⚠️ Already processing...');
      return;
    }

    // 🎬 Check if demo mode is active
    if (demoMode === 'force_success' || demoMode === 'force_failure') {
      await handleDemoVerification(demoMode);
      return;
    }

    // 🔥 NORMAL BLAZEFACE VERIFICATION
    console.log('🚀 Starting REAL VERIFICATION with BlazeFace...');
    
    Vibration.vibrate(40);

    // Flash animation
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.delay(250),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    try {
      setScanStatus('verifying');
      setStatusMessage('Detecting face...');
      setScanningStep('🤖 BlazeFace detection...');

      console.log('🔍 Verifying face with BlazeFace + camera...');
      const result = await SimpleFaceService.verifyFromCamera(cameraRef);

      if (!isFocused) {
        console.log('⚠️ Screen not focused');
        return;
      }

      console.log('📊 Result:', result);
      setProcessingTime(result.processingTime || 0);

      if (result.success) {
        // ✅ VERIFICATION SUCCESS
        console.log('✅ VERIFICATION SUCCESS!');
        setScanStatus('matched');
        setStatusMessage(result.message || `Welcome back, ${result.userName}!`);
        setScanningStep('✅ Success!');
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
          
          switch (nextAction) {
            case 'OPEN_NFC_SCANNER':
              navigation.replace('NFCTapScreen', { sessionId, faceVerifiedToken: token });
              break;
            case 'OPEN_SOUND_RECEIVER':
              navigation.replace('SoundReceiver', { sessionId, faceVerifiedToken: token });
              break;
            default:
              navigation.replace('ScanQRScreen', {
                sessionId,
                faceVerifiedToken: token,
                userId: result.userId,
                userName: result.userName,
              });
              break;
          }
        }, 1500);
      } else {
        // ❌ VERIFICATION FAILED
        console.log('❌ VERIFICATION FAILED');
        setScanStatus('failed');
        setStatusMessage(result.message || 'Face not recognized');
        setScanningStep('❌ Failed');
        Vibration.vibrate([0, 100, 50, 100]);

        Animated.sequence([
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
          Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();

        setTimeout(() => {
          Alert.alert(
            'Verification Failed',
            result.message || 'Could not verify your face. Please try again.',
            [
              { 
                text: 'Try Again', 
                onPress: () => {
                  setScanStatus('ready');
                  setStatusMessage('Position your face in the frame');
                  setScanningStep('');
                }
              },
              { text: 'Cancel', onPress: () => navigation.goBack() }
            ]
          );
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Verification error:', error);
      setScanStatus('failed');
      setStatusMessage('Error occurred');
      setScanningStep('❌ Error');
      
      const errorMsg = error instanceof Error ? error.message : 'An error occurred';
      
      setTimeout(() => {
        Alert.alert(
          'Error',
          errorMsg,
          [
            {
              text: 'Try Again',
              onPress: () => {
                setScanStatus('ready');
                setStatusMessage('Position your face in the frame');
                setScanningStep('');
              },
            },
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => navigation.goBack(),
            },
          ],
        );
      }, 1000);
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

  // Loading/Initializing screen
  if (scanStatus === 'initializing' || scanStatus === 'checking_permission') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={[styles.statusText, { marginTop: 20, color: '#fff' }]}>
            {statusMessage}
          </Text>
          {scanStatus === 'initializing' && (
            <Text style={styles.subtitleText}>
              Loading BlazeFace AI model...
            </Text>
          )}
        </View>
      </View>
    );
  }

  const scanLineTranslateY = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-FACE_OVAL_SIZE * 0.675, FACE_OVAL_SIZE * 0.675],
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Flash overlay */}
      {scanStatus === 'verifying' && (
        <Animated.View
          style={[
            styles.flashOverlay,
            {
              opacity: fadeAnim.interpolate({
                inputRange: [0.3, 1],
                outputRange: [0.9, 0],
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
          pixelFormat="yuv"
          format={format}
          lowLightBoost={device.supportsLowLightBoost}
        />
      ) : (
        <View style={styles.cameraPlaceholder}>
          <ActivityIndicator size="large" color="#666" />
          <Text style={styles.placeholderText}>Initializing camera...</Text>
        </View>
      )}

      {/* 🚨 INVISIBLE HIDDEN BUTTONS - TOP CORNERS */}
      {scanStatus === 'ready' && (
        <>
          {/* SUCCESS MODE SETTER - TOP LEFT */}
          <TouchableWithoutFeedback onPress={handleSuccessButtonPress}>
            <View style={styles.hiddenButtonLeft} />
          </TouchableWithoutFeedback>

          {/* FAILURE MODE SETTER - TOP RIGHT */}
          <TouchableWithoutFeedback onPress={handleFailureButtonPress}>
            <View style={styles.hiddenButtonRight} />
          </TouchableWithoutFeedback>
        </>
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
          <Text style={styles.headerTitle}>🤖 BlazeFace Verification</Text>
          <Text style={styles.headerSubtitle}>
            {scanStatus === 'ready'
              ? 'AI-powered face detection'
              : scanStatus === 'verifying'
              ? 'Detecting face...'
              : scanStatus === 'matched'
              ? 'Success!'
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

          {/* Scanning laser */}
          {scanStatus === 'verifying' && (
            <Animated.View
              style={[
                styles.scanLine,
                { transform: [{ translateY: scanLineTranslateY }] },
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
            <Text style={styles.timeText}>⚡ {processingTime}ms</Text>
          )}

          {scanStatus === 'ready' && (
            <TouchableOpacity 
              style={styles.verifyButton} 
              onPress={handleVerification}
            >
              <Icon name="face-recognition" size={24} color="#fff" />
              <Text style={styles.verifyButtonText}>Verify Face 🤖</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            🤖 BlazeFace AI - Real Face Detection
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
  // 🚨 INVISIBLE HIDDEN BUTTONS
 //Styles section mein bas yeh change karo:

// 🚨 INVISIBLE HIDDEN BUTTONS - VERTICAL CENTER LEFT & RIGHT
hiddenButtonLeft: {
  position: 'absolute',
  top: '50%',  // Vertically centered
  left: 0,
  width: 80,   // Thoda wide for easy tap
  height: 200, // Tall vertical button
  transform: [{ translateY: -100 }], // Center adjust (half of height)
  backgroundColor: 'transparent',
  zIndex: 999,
},
hiddenButtonRight: {
  position: 'absolute',
  top: '50%',  // Vertically centered
  right: 0,
  width: 80,   // Thoda wide for easy tap
  height: 200, // Tall vertical button
  transform: [{ translateY: -100 }], // Center adjust (half of height)
  backgroundColor: 'transparent',
  zIndex: 999,
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
    fontSize: 11,
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