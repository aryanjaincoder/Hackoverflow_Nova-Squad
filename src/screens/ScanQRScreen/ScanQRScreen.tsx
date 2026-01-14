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

// --- NAYA: FIREBASE IMPORTS ---
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
// --- END NAYA IMPORTS ---

// --- Navigation types ---
type RootStackParamList = {
    ScanQRScreen: { sessionId: string; faceVerifiedToken: string };
    FaceScanScreen: { sessionId: string };
    Home: undefined;
    SuccessScreen: { sessionId: string }; // <-- UPDATE YAHAN HAI
};

type ScanQRScreenRouteProp = RouteProp<RootStackParamList, 'ScanQRScreen'>;
type ScanQRNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ScanQRScreen'>;

const { width } = Dimensions.get('window');
const SCANNING_AREA_SIZE = width * 0.7;

interface QrCodeData {
    sessionId: string;
    token: string;
}

// --- AppNavigator se aane wale props ke liye Interface ---
interface UserData {
  name: string;
  email: string;
  role: 'student' | 'admin';
  // ... AppNavigator se aane waale baaki props
}

interface ScanQRScreenProps {
  userData: UserData; // Yeh prop ab AppNavigator se milega
  navigation: ScanQRNavigationProp; // Navigation prop bhi pass hoga
  route: ScanQRScreenRouteProp; // Route prop bhi pass hoga
}
// --- END FIX 1 ---


// --- Dynamic Style Helpers (Same) ---
const cornerStyle = (color: string, position: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight') => {
    // ... (code change nahi)
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
// --- End Style Helpers ---


// --- Component definition ko badla gaya hai taaki 'userData' prop le sake ---
const ScanQRScreen: React.FC<ScanQRScreenProps> = ({ userData, navigation, route }) => {
    // Hooks ab props se data lenge (ya use kar sakte hain)
    // const navigation = useNavigation<ScanQRNavigationProp>(); // Yeh ab prop se aa raha hai
    // const route = useRoute<ScanQRScreenRouteProp>(); // Yeh ab prop se aa raha hai
    const isFocused = useIsFocused();
    
    // --- NAYA: faceVerifiedToken ko params se nikalo ---
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

    // Permission Check on Mount (Same)
    useEffect(() => {
        if (!hasPermission) {
            requestPermission();
        }
    }, [hasPermission, requestPermission]);

    // Toggle Flash (Same)
    const toggleFlash = () => {
        setFlashMode(prev => (prev === 'off' ? 'torch' : 'off'));
    };

    // ---
    // --- 1. MUKHYA LOGIC: markAttendance ---
    // ---
    const markAttendance = useCallback(
        async (scannedData: QrCodeData) => {
            // Processing mein hai toh ruko
            if (scanStatus !== 'ready') return;

            setIsScanning(false);
            setScanStatus('processing'); // Status ko 'processing' set karo

            try {
                // --- START: ASLI FIREBASE LOGIC ---

                // 1. QR code ko validate karo (Basic check)
                if (scannedData.sessionId !== sessionId) {
                    throw new Error('Invalid or expired QR code (Session ID mismatch).');
                }

                // 2. Logged-in user ki details nikalo
                const currentUser = auth().currentUser;
                if (!currentUser) {
                    throw new Error('User not logged in. Please restart the app.');
                }

                // --- 'studentData' object ab 'userData' prop se data lega ---
                const studentData = {
                    name: userData.name, // <-- PROP SE NAYA NAAM
                    email: userData.email, // <-- PROP SE NAYA EMAIL
                    uid: currentUser.uid,
                    markedAt: firestore.FieldValue.serverTimestamp(), // Server ka time
                    faceVerifiedToken: faceVerifiedToken, // FaceScan se mila token
                };
                // --- END FIX ---

                // 4. Data ko 'attendees' sub-collection mein save karo
                const attendeeDocRef = firestore()
                    .collection('attendance_sessions')
                    .doc(sessionId)
                    .collection('attendees')
                    .doc(currentUser.uid); // Har user ki ek hi entry hogi (UID ko ID banaya)

                await attendeeDocRef.set(studentData);

                // --- END: ASLI FIREBASE LOGIC ---

                // 5. Success!
                setScanStatus('success');

                // --- UPDATE YAHAN HAI ---
                // Ab Alert nahi, seedha SuccessScreen par navigate karenge
                // 'replace' use kiya taaki user back karke QR screen par na aa sake
                navigation.replace('SuccessScreen', {
                    sessionId: sessionId,
                });
                // --- UPDATE END ---

            } catch (error: any) {
                // 6. Fail ho gaya
                setScanStatus('failed');
                Alert.alert('Attendance Failed', error.message || 'An unknown error occurred.', [
                    {
                        text: 'Try Again',
                        onPress: () => {
                            setScanStatus('ready');
                            setIsScanning(true); // Scanning dobara chalu karo
                        },
                    },
                    { text: 'Cancel', onPress: () => navigation.navigate('Home'), style: 'cancel' },
                ]);
            }
        },
        // --- 'userData' ko dependency array mein add kiya gaya ---
        [sessionId, scanStatus, navigation, faceVerifiedToken, userData],
    );

    // 2. VisionCamera Code Scanner Hook (Same)
    const codeScanner = useCodeScanner({
        codeTypes: ['qr'],
        onCodeScanned: (codes) => {
            if (!isScanning || scanStatus !== 'ready' || codes.length === 0) return;

            const scannedCode = codes[0].value;
            if (!scannedCode) return;

            setIsScanning(false); // Scanning turant band karo

            try {
                const qrData: QrCodeData = JSON.parse(scannedCode);
                if (qrData.sessionId && qrData.token) {
                    markAttendance(qrData); // Hamara naya function call karo
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

    // --- BAAKI KA UI (Permission, Loading, Return) ---
    // --- (Ye sab pehle jaisa hi hai, koi change nahi) ---

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

// --- Styles (Same) ---
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