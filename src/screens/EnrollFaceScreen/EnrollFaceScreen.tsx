// src/screens/EnrollFaceScreen/EnrollFaceScreen.tsx
// 📷 CAMERA + GALLERY ENROLLMENT WITH BLAZEFACE VALIDATION
// ✅ v9.0: Camera enrollment for better verification matching

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  StatusBar,
  ScrollView,
  Dimensions,
  Animated,
  Vibration,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import SimpleFaceService from '../../services/SimpleFaceService';

const { width } = Dimensions.get('window');
const FACE_OVAL_SIZE = width * 0.55;

type EnrollmentMode = 'select' | 'camera' | 'gallery';

const EnrollFaceScreen = () => {
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  
  // Camera
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
    return yuvFormats.length > 0 ? yuvFormats[0] : undefined;
  }, [device]);

  // State
  const [userId, setUserId] = useState('');
  const [userName, setUserName] = useState('');
  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrolledCount, setEnrolledCount] = useState(0);
  const [enrollmentStep, setEnrollmentStep] = useState(0);
  const [enrollmentTotal, setEnrollmentTotal] = useState(0);
  const [modelStatus, setModelStatus] = useState('Initializing...');
  const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(true);
  const [enrollmentMode, setEnrollmentMode] = useState<EnrollmentMode>('select');
  const [cameraReady, setCameraReady] = useState(false);
  const [captureProgress, setCaptureProgress] = useState('');

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    initializeModel();
    loadLastUserInfo();
  }, []);

  // Pulse animation for camera mode
  useEffect(() => {
    if (enrollmentMode === 'camera' && !isEnrolling) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }
  }, [enrollmentMode, isEnrolling, pulseAnim]);

  const loadLastUserInfo = async () => {
    try {
      setIsLoadingUserInfo(true);
      const userInfo = await SimpleFaceService.getLastUserInfo();
      if (userInfo) {
        setUserId(userInfo.userId);
        setUserName(userInfo.userName);
      }
    } catch (error) {
      console.error('❌ Failed to load user info:', error);
    } finally {
      setIsLoadingUserInfo(false);
    }
  };

  const initializeModel = async () => {
    try {
      setModelStatus('Loading BlazeFace AI model...');
      const success = await SimpleFaceService.initialize();
      if (success) {
        setIsModelLoading(false);
        setModelStatus('BlazeFace AI Ready ✅');
        loadEnrolledCount();
      } else {
        setModelStatus('Failed to load AI model ❌');
        Alert.alert('Initialization Error', 'Failed to load BlazeFace AI model.');
      }
    } catch (error) {
      setIsModelLoading(false);
      setModelStatus('Error loading model ❌');
    }
  };

  const loadEnrolledCount = async () => {
    try {
      const status = SimpleFaceService.getEnrollmentStatus();
      setEnrolledCount(status.count);
    } catch (error) {
      console.error('❌ Get enrollment status error:', error);
    }
  };

  // 📷 CAMERA ENROLLMENT
  const handleCameraEnroll = async () => {
    if (!userId.trim() || !userName.trim()) {
      Alert.alert('Error', 'Please enter both User ID and Name first');
      setEnrollmentMode('select');
      return;
    }

    // Check permission
    if (!hasPermission) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert('Permission Required', 'Camera access is needed for enrollment.');
        setEnrollmentMode('select');
        return;
      }
    }

    setCameraReady(true);
  };

  const startCameraCapture = async () => {
    if (!cameraRef.current) {
      Alert.alert('Error', 'Camera not ready');
      return;
    }

    setIsEnrolling(true);
    setCaptureProgress('Starting capture...');
    Vibration.vibrate(40);

    try {
      SimpleFaceService.setProgressCallback((progress) => {
        setEnrollmentStep(progress.step);
        setEnrollmentTotal(progress.total);
        setCaptureProgress(progress.message);
        
        // Animate progress
        Animated.timing(progressAnim, {
          toValue: progress.step / progress.total,
          duration: 300,
          useNativeDriver: false,
        }).start();
      });

      console.log(`\n🎯 Starting CAMERA enrollment for ${userName}...`);
      
      const success = await SimpleFaceService.enrollFromCamera(
        userId.trim(),
        userName.trim(),
        cameraRef,
        5 // Capture 5 photos
      );

      setIsEnrolling(false);
      setCaptureProgress('');
      progressAnim.setValue(0);

      if (success) {
        Vibration.vibrate([0, 50, 30, 50]);
        loadEnrolledCount();
        
        Alert.alert(
          '🎉 Camera Enrollment Success!',
          `Face enrolled for ${userName}!\n\n✅ 5 photos captured from camera\n✅ Same source as verification\n✅ Higher accuracy expected!\n\nYou can now use face verification.`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      }
    } catch (error) {
      setIsEnrolling(false);
      setCaptureProgress('');
      progressAnim.setValue(0);
      
      const errorMsg = error instanceof Error ? error.message : 'Enrollment failed';
      Alert.alert('Enrollment Failed', errorMsg);
    }
  };

  // 🖼️ GALLERY ENROLLMENT
  const handleGalleryEnroll = async () => {
    if (!userId.trim() || !userName.trim()) {
      Alert.alert('Error', 'Please enter both User ID and Name');
      return;
    }

    Alert.alert(
      '📸 Select 5-10 Face Photos',
      '⚠️ Note: Gallery enrollment may have lower accuracy than camera enrollment.\n\n📌 Tips:\n• Well-lit photos\n• Face clearly visible\n• Different angles',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => setEnrollmentMode('select') },
        {
          text: 'Select Photos',
          onPress: async () => {
            setIsEnrolling(true);
            try {
              SimpleFaceService.setProgressCallback((progress) => {
                setEnrollmentStep(progress.step);
                setEnrollmentTotal(progress.total);
              });

              await SimpleFaceService.enrollFromGallery(userId.trim(), userName.trim());
              
              setIsEnrolling(false);
              loadEnrolledCount();
              
              Alert.alert(
                '🎉 Gallery Enrollment Success!',
                `Face enrolled for ${userName}!\n\n⚠️ Note: Camera verification may have lower match scores with gallery photos.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } catch (error) {
              setIsEnrolling(false);
              const errorMsg = error instanceof Error ? error.message : 'Enrollment failed';
              Alert.alert('Enrollment Failed', errorMsg);
            }
          },
        },
      ]
    );
  };

  const handleClearAll = () => {
    Alert.alert(
      '⚠️ Clear All Faces',
      `Delete all ${enrolledCount} enrolled face(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await SimpleFaceService.clearEnrolledFaces();
            setEnrolledCount(0);
            Alert.alert('✅ Success', 'All faces cleared!');
          },
        },
      ]
    );
  };

  // 📷 CAMERA VIEW
  if (enrollmentMode === 'camera' && cameraReady) {
    return (
      <View style={styles.cameraContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        
        {/* Camera */}
        {isFocused && device && hasPermission && (
          <Camera
  ref={cameraRef}
  style={styles.camera}
  device={device}
  isActive={isFocused}  // ✅ Sirf isFocused check karo, isEnrolling mat karo
  photo={true}
  pixelFormat="yuv"
  format={format}
  lowLightBoost={device.supportsLowLightBoost}
/>
        )}

        {/* Overlay */}
        <View style={styles.cameraOverlay}>
          {/* Back Button */}
          {!isEnrolling && (
            <TouchableOpacity
              style={styles.cameraBackButton}
              onPress={() => {
                setEnrollmentMode('select');
                setCameraReady(false);
              }}
            >
              <Icon name="arrow-left" size={28} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Header */}
          <View style={styles.cameraHeader}>
            <Icon name="camera" size={32} color="#2ecc71" />
            <Text style={styles.cameraTitle}>📷 Camera Enrollment</Text>
            <Text style={styles.cameraSubtitle}>
              {isEnrolling ? captureProgress : 'Position your face and tap capture'}
            </Text>
          </View>

          {/* Face Oval */}
          <View style={styles.ovalContainer}>
            <Animated.View
              style={[
                styles.faceOval,
                {
                  transform: [{ scale: pulseAnim }],
                  borderColor: isEnrolling ? '#3498db' : '#2ecc71',
                },
              ]}
            />
            
            {isEnrolling && (
              <View style={styles.captureOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.captureText}>
                  📸 Capturing {enrollmentStep}/{enrollmentTotal}
                </Text>
              </View>
            )}
          </View>

          {/* Progress Bar */}
          {isEnrolling && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <Animated.View
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <Text style={styles.progressText}>{captureProgress}</Text>
            </View>
          )}

          {/* Capture Button */}
          {!isEnrolling && (
            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.captureButton} onPress={startCameraCapture}>
                <View style={styles.captureButtonInner}>
                  <Icon name="camera" size={32} color="#fff" />
                </View>
              </TouchableOpacity>
              <Text style={styles.captureHint}>Tap to capture 5 photos automatically</Text>
            </View>
          )}

          {/* User Info */}
          <View style={styles.userInfoBadge}>
            <Icon name="account" size={18} color="#fff" />
            <Text style={styles.userInfoText}>{userName} ({userId})</Text>
          </View>
        </View>
      </View>
    );
  }

  // 📋 MAIN FORM VIEW
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a1a" />
      
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Icon name="arrow-left" size={24} color="#fff" />
            </TouchableOpacity>
            {enrolledCount > 0 && (
              <TouchableOpacity style={styles.clearButton} onPress={handleClearAll}>
                <Icon name="delete-sweep" size={20} color="#e74c3c" />
                <Text style={styles.clearButtonText}>Clear All</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.headerContent}>
            <Icon name="face-recognition" size={60} color="#3498db" />
            <Text style={styles.title}>🤖 Face Enrollment</Text>
            <Text style={styles.subtitle}>BlazeFace AI-powered validation</Text>
            
            {enrolledCount > 0 && (
              <View style={styles.enrolledBadge}>
                <Icon name="check-circle" size={16} color="#2ecc71" />
                <Text style={styles.enrolledBadgeText}>
                  {enrolledCount} face{enrolledCount > 1 ? 's' : ''} enrolled
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Model Status */}
        {isModelLoading ? (
          <View style={styles.modelStatusContainer}>
            <ActivityIndicator size="small" color="#3498db" />
            <Text style={styles.modelStatusText}>{modelStatus}</Text>
          </View>
        ) : (
          <View style={styles.modelReadyContainer}>
            <Icon name="check-circle" size={20} color="#2ecc71" />
            <Text style={styles.modelReadyText}>{modelStatus}</Text>
          </View>
        )}

        {/* Form */}
        <View style={styles.form}>
          {!isLoadingUserInfo && userId && userName && (
            <View style={styles.autoFillBadge}>
              <Icon name="autorenew" size={16} color="#f39c12" />
              <Text style={styles.autoFillText}>Auto-filled from last enrollment</Text>
            </View>
          )}

          <View style={styles.inputContainer}>
            <Icon name="identifier" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="User ID (e.g., 21BCE001)"
              placeholderTextColor="#666"
              value={userId}
              onChangeText={setUserId}
              autoCapitalize="characters"
              editable={!isModelLoading && !isEnrolling}
            />
          </View>

          <View style={styles.inputContainer}>
            <Icon name="account" size={20} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Your Full Name"
              placeholderTextColor="#666"
              value={userName}
              onChangeText={setUserName}
              autoCapitalize="words"
              editable={!isModelLoading && !isEnrolling}
            />
          </View>

          {/* 🆕 ENROLLMENT METHOD SELECTION */}
          <View style={styles.methodSection}>
            <Text style={styles.methodTitle}>Choose Enrollment Method:</Text>
            
            {/* 📷 CAMERA - RECOMMENDED */}
            <TouchableOpacity
              style={[styles.methodButton, styles.methodButtonCamera]}
              onPress={() => {
                setEnrollmentMode('camera');
                handleCameraEnroll();
              }}
              disabled={isModelLoading || isEnrolling}
            >
              <View style={styles.methodIcon}>
                <Icon name="camera" size={32} color="#2ecc71" />
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>⭐ RECOMMENDED</Text>
                </View>
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodButtonTitle}>📷 Camera Enrollment</Text>
                <Text style={styles.methodButtonDesc}>
                  Captures 5 photos from live camera{'\n'}
                  ✅ Same source as verification = 70-95% accuracy
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color="#2ecc71" />
            </TouchableOpacity>

            {/* 🖼️ GALLERY - BACKUP */}
            <TouchableOpacity
              style={[styles.methodButton, styles.methodButtonGallery]}
              onPress={() => {
                setEnrollmentMode('gallery');
                handleGalleryEnroll();
              }}
              disabled={isModelLoading || isEnrolling}
            >
              <View style={styles.methodIcon}>
                <Icon name="image-multiple" size={32} color="#f39c12" />
              </View>
              <View style={styles.methodInfo}>
                <Text style={styles.methodButtonTitle}>🖼️ Gallery Enrollment</Text>
                <Text style={styles.methodButtonDesc}>
                  Select 5-10 photos from gallery{'\n'}
                  ⚠️ May have lower accuracy (25-40%)
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color="#f39c12" />
            </TouchableOpacity>
          </View>

          {/* Why Camera is Better */}
          <View style={styles.infoBox}>
            <Icon name="lightbulb-on" size={24} color="#3498db" />
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoText}>Why Camera Enrollment?</Text>
              <Text style={styles.infoSubtext}>
                📷 Camera enrollment uses the same source as verification,{'\n'}
                resulting in 70-95% similarity scores vs 25-40% with gallery photos.
              </Text>
            </View>
          </View>

          {/* Features */}
          <View style={styles.features}>
            <View style={styles.feature}>
              <Icon name="camera" size={24} color="#2ecc71" />
              <Text style={styles.featureText}>Live Capture</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="face-recognition" size={24} color="#3498db" />
              <Text style={styles.featureText}>BlazeFace AI</Text>
            </View>
            <View style={styles.feature}>
              <Icon name="shield-lock" size={24} color="#f39c12" />
              <Text style={styles.featureText}>Auto-Save</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  
  // Camera styles
  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 40,
  },
  cameraBackButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 10,
    borderRadius: 25,
    zIndex: 10,
  },
  cameraHeader: {
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 20,
  },
  cameraTitle: { fontSize: 22, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  cameraSubtitle: { fontSize: 14, color: '#bbb', marginTop: 4, textAlign: 'center' },
  ovalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  faceOval: {
    width: FACE_OVAL_SIZE,
    height: FACE_OVAL_SIZE * 1.35,
    borderRadius: FACE_OVAL_SIZE / 1.7,
    borderWidth: 4,
    backgroundColor: 'transparent',
  },
  captureOverlay: {
    position: 'absolute',
    alignItems: 'center',
  },
  captureText: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 16 },
  progressContainer: {
    width: width - 60,
    alignItems: 'center',
    marginBottom: 20,
  },
  progressBar: {
    width: '100%',
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#2ecc71' },
  progressText: { color: '#fff', fontSize: 14, marginTop: 8 },
  cameraControls: { alignItems: 'center', marginBottom: 20 },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(46, 204, 113, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#2ecc71',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2ecc71',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureHint: { color: '#999', fontSize: 13, marginTop: 12 },
  userInfoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  userInfoText: { color: '#fff', fontSize: 14, marginLeft: 8 },

  // Form styles
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 30 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 76, 60, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearButtonText: { color: '#e74c3c', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  headerContent: { alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginTop: 20 },
  subtitle: { fontSize: 16, color: '#999', marginTop: 8 },
  enrolledBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  enrolledBadgeText: { color: '#2ecc71', fontSize: 14, fontWeight: '600', marginLeft: 6 },
  modelStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(52, 152, 219, 0.2)',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
  },
  modelStatusText: { color: '#3498db', fontSize: 14, fontWeight: '600', marginLeft: 10 },
  modelReadyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
  },
  modelReadyText: { color: '#2ecc71', fontSize: 14, fontWeight: '600', marginLeft: 10 },
  form: { paddingHorizontal: 20 },
  autoFillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(243, 156, 18, 0.15)',
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  autoFillText: { color: '#f39c12', fontSize: 13, fontWeight: '600', marginLeft: 6 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 16 },
  
  // Method selection
  methodSection: { marginTop: 10, marginBottom: 20 },
  methodTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 16 },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
  },
  methodButtonCamera: {
    backgroundColor: 'rgba(46, 204, 113, 0.15)',
    borderWidth: 2,
    borderColor: '#2ecc71',
  },
  methodButtonGallery: {
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(243, 156, 18, 0.3)',
  },
  methodIcon: { marginRight: 12, alignItems: 'center' },
  recommendedBadge: {
    backgroundColor: '#2ecc71',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  recommendedText: { color: '#fff', fontSize: 8, fontWeight: '700' },
  methodInfo: { flex: 1 },
  methodButtonTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  methodButtonDesc: { color: '#999', fontSize: 12, marginTop: 4 },
  
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(52, 152, 219, 0.1)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoTextContainer: { flex: 1, marginLeft: 12 },
  infoText: { color: '#3498db', fontSize: 14, fontWeight: '600', marginBottom: 6 },
  infoSubtext: { color: '#3498db', fontSize: 12, opacity: 0.8 },
  
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 24,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  feature: { alignItems: 'center' },
  featureText: { color: '#fff', fontSize: 12, marginTop: 8, fontWeight: '600' },
});

export default EnrollFaceScreen;
