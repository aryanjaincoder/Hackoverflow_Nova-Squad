import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Dimensions,
    Alert,
    StatusBar,
    ActivityIndicator,
    Linking,
} from 'react-native';
import {
    useNavigation,
    useRoute,
    RouteProp,
    useIsFocused,
} from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// --- VISION CAMERA IMPORTS ---
import {
    Camera,
    useCameraDevice,
    useCameraPermission,
    useCodeScanner,
} from 'react-native-vision-camera';

// --- FIREBASE IMPORTS ---
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
// --- END IMPORTS ---

// --- Navigation types ---
type RootStackParamList = {
    ScanQRScreen: { sessionId: string; faceVerifiedToken: string };
    FaceScanScreen: { sessionId: string };
    Home: undefined;
    SuccessScreen: { sessionId: string };
};

type ScanQRScreenRouteProp = RouteProp<RootStackParamList, 'ScanQRScreen'>;
type ScanQRNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ScanQRScreen'>;

const { width } = Dimensions.get('window');
const SCANNING_AREA_SIZE = width * 0.7;

interface QrCodeData {
    sessionId: string;
    token: string;
    timestamp?: number; // Optional: Agar teacher side se aata hai
}

// --- AppNavigator se aane wale props ke liye Interface ---
interface UserData {
  name: string;
  email: string;
  role: 'student' | 'admin';
}

interface ScanQRScreenProps {
  userData: UserData;
  navigation: ScanQRNavigationProp;
  route: ScanQRScreenRouteProp;
}

// --- Dynamic Style Helpers ---
const cornerStyle = (color: string, position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight') => {
    const isTop = position.startsWith('top');
    const isLeft = position.endsWith('Left');
    const borderStyle = {
        position: 'absolute' as 'absolute',
        width: 30,
        height: 30,
        borderWidth: 4,
        borderColor: color,
    };
    const cornerStyleObj: any = {
        [isTop ? 'top' : 'bottom']: -1,
        [isLeft ? 'left' : 'right']: -1,
        borderTopWidth: isTop ? 4 : 0,
        borderBottomWidth: isTop ? 0 : 4,
        borderLeftWidth: isLeft ? 4 : 0,
        borderRightWidth: isLeft ? 0 : 4,
    };
    return { ...borderStyle, ...cornerStyleObj, borderColor: color };
};

const getSquareFrameStyle = (color: string) => ({
    width: SCANNING_AREA_SIZE,
    height: SCANNING_AREA_SIZE,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center' as 'center',
    justifyContent: 'center' as 'center',
});

// --- Main Component ---
const ScanQRScreen: React.FC<ScanQRScreenProps> = ({ userData, navigation, route }) => {
    const isFocused = useIsFocused();
    const { sessionId, faceVerifiedToken } = route.params;

    // --- VISION CAMERA HOOKS ---
    const { hasPermission, requestPermission } = useCameraPermission();
    const device = useCameraDevice('back');
    const [flashMode, setFlashMode] = useState<'off' | 'on' | 'auto' | 'torch'>('off');
    
    // --- Scanning States ---
    const [isScanning, setIsScanning] = useState(true);
    const [scanStatus, setScanStatus] = useState<
        'ready' | 'processing' | 'success' | 'failed'
    >('ready');

    // Permission Check on Mount
    useEffect(() => {
        if (!hasPermission) {
            requestPermission();
        }
    }, [hasPermission, requestPermission]);

    // Toggle Flash
    const toggleFlash = () => {
        setFlashMode(prev => (prev === 'off' ? 'torch' : 'off'));
    };

    // ===========================================
    // UPDATED: markAttendance FUNCTION WITH VALIDATIONS
    // ===========================================
    const markAttendance = useCallback(
        async (scannedData: QrCodeData) => {
            // Processing mein hai toh ruko
            if (scanStatus !== 'ready') return;

            setIsScanning(false);
            setScanStatus('processing');

            try {
                // ✅ 1. VALIDATION: Fetch current session data
                const sessionDocRef = firestore()
                    .collection('attendance_sessions')
                    .doc(sessionId);
                
                const sessionDoc = await sessionDocRef.get();

                // Check if session exists
                if (!sessionDoc.exists) {
                    throw new Error('❌ Invalid QR - Session not found!');
                }

                const sessionData = sessionDoc.data();

                // ✅ 2. VALIDATION: Check session status
                if (sessionData?.status !== 'active') {
                    throw new Error('❌ Session is closed or inactive!');
                }

                // ✅ 3. VALIDATION: Check if paused
                if (sessionData?.isPaused) {
                    throw new Error('⏸️ Attendance scanning is currently paused!');
                }

                // ✅ 4. VALIDATION: Token match check (SABSE IMPORTANT)
                if (sessionData?.currentToken !== scannedData.token) {
                    throw new Error('⏰ QR Code expired! Please scan the LATEST QR from the screen.');
                }

                // ✅ 5. VALIDATION: Timestamp check (10 seconds threshold)
                if (sessionData?.lastTokenUpdate) {
                    const currentTime = Date.now();
                    const tokenAge = currentTime - sessionData.lastTokenUpdate;
                    
                    // Agar timestamp mila hai toh check karo
                    if (scannedData.timestamp) {
                        // Agar QR me timestamp hai toh usse check karo
                        const qrAge = currentTime - scannedData.timestamp;
                        if (qrAge > 10000) {
                            throw new Error('⏰ QR too old! Scan the fresh QR code.');
                        }
                    } else if (tokenAge > 10000) {
                        // Ya fir session ke lastTokenUpdate se check karo
                        throw new Error('⏰ QR too old! Scan the fresh QR code.');
                    }
                }

                // ✅ 6. Check if user is logged in
                const currentUser = auth().currentUser;
                if (!currentUser) {
                    throw new Error('❌ User not logged in. Please restart the app.');
                }

                // ✅ 7. Check duplicate attendance
                const attendeeDocRef = firestore()
                    .collection('attendance_sessions')
                    .doc(sessionId)
                    .collection('attendees')
                    .doc(currentUser.uid);

                const existingAttendee = await attendeeDocRef.get();
                
                if (existingAttendee.exists()) {
                    throw new Error('✅ You have already marked attendance for this session!');
                }

                // ✅ 8. All validations passed - Mark attendance
                const studentData = {
                    name: userData.name,
                    email: userData.email,
                    uid: currentUser.uid,
                    markedAt: firestore.FieldValue.serverTimestamp(),
                    faceVerifiedToken: faceVerifiedToken,
                    scannedToken: scannedData.token, // Track which token was used
                    locationVerified: true,
                    bleVerified: false,
                };

                await attendeeDocRef.set(studentData);

                // ✅ 9. Success!
                setScanStatus('success');
                
                // Navigate to success screen
                navigation.replace('SuccessScreen', {
                    sessionId: sessionId,
                });

            } catch (error: any) {
                // Error handling
                setScanStatus('failed');
                Alert.alert(
                    'Attendance Failed', 
                    error.message || 'An unknown error occurred.', 
                    [
                        {
                            text: 'Try Again',
                            onPress: () => {
                                setScanStatus('ready');
                                setIsScanning(true);
                            },
                        },
                        { 
                            text: 'Cancel', 
                            onPress: () => navigation.navigate('Home'), 
                            style: 'cancel' 
                        },
                    ]
                );
            }
        },
        [sessionId, scanStatus, navigation, faceVerifiedToken, userData],
    );

    // 2. VisionCamera Code Scanner Hook
    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: (codes) => {
            if (!isScanning || scanStatus !== 'ready' || codes.length === 0) return;

            const scannedCode = codes[0].value;
            if (!scannedCode) return;

            setIsScanning(false);

            try {
                const qrData: QrCodeData = JSON.parse(scannedCode);
                if (qrData.sessionId && qrData.token) {
                    markAttendance(qrData);
                } else {
                    Alert.alert('Invalid QR', 'This QR code is not for attendance. Try again.', [
                        { text: 'OK', onPress: () => setIsScanning(true) }
                    ]);
                }
            } catch (e) {
                Alert.alert('Error', 'Could not read the QR code data format.', [
                    { text: 'OK', onPress: () => setIsScanning(true) }
                ]);
            }
        },
    });

    // --- UI RENDERING ---
    if (!hasPermission) {
        return (
            <View style={[styles.container, styles.center]}>
                <Text style={styles.permissionText}>Camera permission not granted.</Text>
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => Linking.openSettings()}
                >
                    <Text style={styles.settingsButtonText}>Open Settings to Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }
    
    if (!device || !isFocused) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#3498db" />
                <Text style={styles.permissionText}>Loading scanner or camera not found...</Text>
            </View>
        );
    }

    const getStatusColor = () => {
        switch (scanStatus) {
            case 'processing': return '#f39c12';
            case 'success': return '#2ecc71';
            case 'failed': return '#e74c3c';
            case 'ready':
            default: return '#3498db';
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            <Camera
                style={StyleSheet.absoluteFill}
                device={device}
                isActive={isFocused && isScanning}
                codeScanner={codeScanner}
                torch={flashMode === 'torch' ? 'on' : 'off'}
            />

            <View style={styles.overlay}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="close" size={30} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={toggleFlash} style={styles.flashButton}>
                        <Icon name={flashMode === 'off' ? "flashlight" : "flashlight-off"} size={25} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.centerSection}>
                    <View style={getSquareFrameStyle(getStatusColor())}>
                        <View style={cornerStyle(getStatusColor(), 'topLeft')} />
                        <View style={cornerStyle(getStatusColor(), 'topRight')} />
                        <View style={cornerStyle(getStatusColor(), 'bottomLeft')} />
                        <View style={cornerStyle(getStatusColor(), 'bottomRight')} />
                        {scanStatus === 'processing' && (
                            <View style={styles.activityIndicatorOverlay}>
                                <ActivityIndicator size="large" color="#FFF" />
                            </View>
                        )}
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.instructionText}>
                        STEP 2: SCAN QR CODE
                    </Text>
                    <Text style={styles.instructionSubText}>
                        Position the attendance QR code (on the screen) inside the frame to mark your presence.
                    </Text>
                    <View style={[styles.statusBox, { backgroundColor: getStatusColor() }]}>
                        <Text style={styles.statusText}>
                            {scanStatus === 'ready' && 'Scanning Active...'}
                            {scanStatus === 'processing' && 'Verifying Attendance on Server...'}
                            {scanStatus === 'success' && 'SUCCESS! Loading...'}
                            {scanStatus === 'failed' && 'ATTENDANCE FAILED. Tap Try Again.'}
                        </Text>
                    </View>
                </View>
            </View>
        </View>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    permissionText: {
        color: '#fff',
        marginTop: 20,
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'space-between',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 40,
    },
    backButton: {
        padding: 10,
    },
    flashButton: {
        padding: 10,
    },
    centerSection: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityIndicatorOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    footer: {
        paddingHorizontal: 30,
        paddingBottom: 40,
        alignItems: 'center',
    },
    instructionText: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFF',
        marginBottom: 10,
    },
    instructionSubText: {
        fontSize: 14,
        color: '#DDD',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
    },
    statusBox: {
        width: '100%',
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    statusText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
    settingsButton: {
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: '#3498db',
        borderRadius: 8,
    },
    settingsButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    }
});

export default ScanQRScreen;