import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, RefreshControl,
    StyleSheet, StatusBar, Alert, Platform, PermissionsAndroid,
    InteractionManager, Linking
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, UserData } from '../../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import BLEService from '../../services/BLEService';

// --- Interfaces ---
interface AttendanceStats {
    overall: number;
    month: number;
    week: number;
    daysToTarget: number;
}

interface Challenge {
    name: string;
    progress: number;
    total: number;
    reward: string;
    timeLeft: string;
}

interface Notification {
    id: string;
    message: string;
    timestamp: string;
}

interface ClassInfo {
    name: string;
    status: 'present' | 'absent' | 'pending';
    streak: number;
}

type StudentHomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface StudentHomeScreenProps {
    navigation: StudentHomeScreenNavigationProp;
    userData: UserData;
}

// --- Helper Functions ---
const getStatusIcon = (status: string): string => {
    if (status === 'present') return '✅';
    if (status === 'absent') return '❌';
    return '⏰';
};

const getProgressBars = (progress: number, total: number): string => {
    return Array.from({ length: total }, (_, i) => (i < progress ? '⭐' : '⚪')).join('');
};

// ====================================================================
// --- STUDENT HOME SCREEN COMPONENT ---
// ====================================================================

const StudentHomeScreen: React.FC<StudentHomeScreenProps> = ({ navigation, userData }) => {
    // --- States ---
    const [refreshing, setRefreshing] = useState(false);
    const [currentTime, setCurrentTime] = useState('');
    const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
        overall: 78,
        month: 85,
        week: 100,
        daysToTarget: 3
    });
    const [currentClass, setCurrentClass] = useState<ClassInfo>({
        name: 'Mathematics',
        status: 'pending',
        streak: 7
    });
    const [todayChallenge, setTodayChallenge] = useState<Challenge>({
        name: 'Perfect Week Streak',
        progress: 4,
        total: 7,
        reward: '50 points + Badge',
        timeLeft: '3 days'
    });
    const [localNotifications, setLocalNotifications] = useState<Notification[]>([
        { id: '1', message: 'Quiz challenge completed! +20 points', timestamp: '10:30 AM' },
        { id: '2', message: 'Reminder: Math class in 30 minutes', timestamp: '11:00 AM' },
    ]);
    const [isNotificationSetupDone, setIsNotificationSetupDone] = useState(false);
    
    // --- BLE States ---
    const [isBLEActive, setIsBLEActive] = useState(false);
    const [bleStatus, setBLEStatus] = useState<'broadcasting' | 'stopped' | 'error'>('stopped');
    const [broadcastStartTime, setBroadcastStartTime] = useState<Date | null>(null);
    const [isBLELoading, setIsBLELoading] = useState(false);

    // --- Notification Setup ---
    const setupNotifications = useCallback(async () => {
        if (isNotificationSetupDone) return;
        setIsNotificationSetupDone(true);

        let enabled = false;
        try {
            const userId = auth().currentUser?.uid;
            if (!userId) {
                console.log('[StudentHome] User not logged in...');
                return;
            }

            if (Platform.OS === 'ios') {
                const authStatus = await messaging().requestPermission();
                enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
            } else if (Platform.OS === 'android') {
                if (Platform.Version >= 33) {
                    const granted = await PermissionsAndroid.request(
                        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
                    );
                    enabled = granted === PermissionsAndroid.RESULTS.GRANTED;
                } else {
                    enabled = true;
                }
            }

            if (enabled) {
                console.log('[StudentHome] Notification permission granted.');
                const token = await messaging().getToken();
                console.log('[StudentHome] FCM Token:', token);

                await firestore().collection('users').doc(userId).set(
                    {
                        fcmToken: token,
                        lastTokenUpdate: firestore.FieldValue.serverTimestamp()
                    },
                    { merge: true }
                );
                console.log('[StudentHome] FCM Token saved.');
            } else {
                console.log('[StudentHome] Notification permission denied.');
            }
        } catch (error: any) {
            console.error("[StudentHome] Error notification setup:", error);
        }
    }, [isNotificationSetupDone]);

    // --- Effects ---
    useEffect(() => {
        const interactionPromise = InteractionManager.runAfterInteractions(() => {
            if (auth().currentUser && !isNotificationSetupDone) {
                setupNotifications();
            }
        });

        const unsubscribeTokenRefresh = messaging().onTokenRefresh(async newToken => {
            console.log("[StudentHome] Token Refreshed:", newToken);
            const userId = auth().currentUser?.uid;
            if (userId) {
                try {
                    await firestore().collection('users').doc(userId).set(
                        {
                            fcmToken: newToken,
                            lastTokenUpdate: firestore.FieldValue.serverTimestamp()
                        },
                        { merge: true }
                    );
                    console.log("[StudentHome] Refreshed FCM token saved.");
                } catch (e) {
                    console.error("[StudentHome] Error saving refreshed token:", e);
                }
            }
        });

        return () => {
            unsubscribeTokenRefresh();
            interactionPromise.cancel();
        };
    }, [setupNotifications, isNotificationSetupDone]);

    useEffect(() => {
        const updateTime = () => {
            const hour = new Date().getHours();
            let greeting = hour < 12 ? 'Good morning ☀️' :
                hour < 18 ? 'Good afternoon 🌤️' : 'Good evening 🌙';
            setCurrentTime(greeting);
        };
        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, []);

    // 🔥 CLEANUP: Stop BLE when component unmounts
    useEffect(() => {
        return () => {
            if (isBLEActive) {
                console.log('[StudentHome] 🛑 Component unmounting - Stopping broadcast');
                BLEService.stopAdvertising();
            }
        };
    }, [isBLEActive]);

    // --- BLE Helper Functions ---
    const getBLEStatusColor = () => {
        switch (bleStatus) {
            case 'broadcasting': return '#22C55E';
            case 'stopped': return '#9CA3AF';
            case 'error': return '#EF4444';
        }
    };

    const getBLEStatusText = () => {
        switch (bleStatus) {
            case 'broadcasting': return 'Broadcasting';
            case 'stopped': return 'Inactive';
            case 'error': return 'Error';
        }
    };

    const getBroadcastDuration = () => {
        if (!broadcastStartTime) return '0m';
        const now = new Date().getTime();
        const start = broadcastStartTime.getTime();
        const minutes = Math.floor((now - start) / 60000);
        return `${minutes}m`;
    };

    // 🚀 REQUEST ALL BLE PERMISSIONS
    const requestBLEPermissions = async (): Promise<boolean> => {
        try {
            if (Platform.OS !== 'android') {
                return true; // iOS handles permissions differently
            }

            const permissions: string[] = [];

            // Android 12+ (API 31+)
            if (Platform.Version >= 31) {
                permissions.push(
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
                    PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT
                );
            }

            // All Android versions
            permissions.push(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
            );

            console.log('[BLE] Requesting permissions:', permissions);

            const results = await PermissionsAndroid.requestMultiple(permissions as any[]);
            
            console.log('[BLE] Permission results:', results);

            // Check if all permissions granted
            const allGranted = Object.values(results).every(
                result => result === PermissionsAndroid.RESULTS.GRANTED
            );

            if (!allGranted) {
                console.warn('[BLE] Some permissions denied:', results);
                
                // Show settings alert
                Alert.alert(
                    'Permissions Required',
                    'Bluetooth and Location permissions are required for proximity detection.\n\nPlease enable them in Settings.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Open Settings',
                            onPress: () => Linking.openSettings()
                        }
                    ]
                );
                
                return false;
            }

            return true;
        } catch (error) {
            console.error('[BLE] Permission request error:', error);
            Alert.alert('Error', 'Failed to request permissions');
            return false;
        }
    };

    // 🔵 START BLE BROADCASTING
    const handleStartBLE = async () => {
        try {
            setIsBLELoading(true);

            const userId = auth().currentUser?.uid;
            if (!userId) {
                Alert.alert('Error', 'Please log in first');
                setIsBLELoading(false);
                return;
            }

            console.log('[StudentHome] ========================================');
            console.log('[StudentHome] 🔵 Starting BLE Broadcasting');
            console.log('[StudentHome] ========================================');

            // 1️⃣ Request ALL BLE Permissions
            console.log('[StudentHome] 1️⃣ Requesting BLE permissions...');
            const hasPermissions = await requestBLEPermissions();
            
            if (!hasPermissions) {
                setBLEStatus('error');
                setIsBLELoading(false);
                return;
            }

            console.log('[StudentHome] ✅ All permissions granted');

            // 2️⃣ Get user's class from Firestore
            console.log('[StudentHome] 2️⃣ Fetching user class...');
            const userDoc = await firestore()
                .collection('users')
                .doc(userId)
                .get();
            
            const userClass = userDoc.data()?.class || 'Unknown';
            
            console.log('[StudentHome] 👤 User ID:', userId);
            console.log('[StudentHome] 👤 User Name:', userData.name);
            console.log('[StudentHome] 📚 User Class:', userClass);
            console.log('[StudentHome] 🎯 Will broadcast as: ATT_' + userId + '_' + userClass);
            
            // 3️⃣ Start BLE advertising
            console.log('[StudentHome] 3️⃣ Starting BLE advertising...');
            const success = await BLEService.startAdvertising(userId, userClass);
            
            if (success) {
                setIsBLEActive(true);
                setBLEStatus('broadcasting');
                setBroadcastStartTime(new Date());
                console.log('[StudentHome] ✅ BLE broadcasting started successfully');
                console.log('[StudentHome] ========================================');
                
                Alert.alert(
                    '✅ BLE Active',
                    'Proximity detection is now active.\nTeachers can detect your presence.',
                    [{ text: 'OK' }]
                );
            } else {
                setBLEStatus('error');
                console.log('[StudentHome] ❌ BLE broadcasting failed');
                console.log('[StudentHome] ========================================');
                
                Alert.alert(
                    'Error',
                    'Failed to start BLE broadcasting.\nPlease check Bluetooth and Location are enabled.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        {
                            text: 'Open Settings',
                            onPress: () => Linking.openSettings()
                        }
                    ]
                );
            }
        } catch (error) {
            console.error('[StudentHome] ========================================');
            console.error('[StudentHome] ❌ Error starting BLE:', error);
            console.error('[StudentHome] ========================================');
            setBLEStatus('error');
            
            Alert.alert(
                'Error',
                `Failed to start BLE: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        } finally {
            setIsBLELoading(false);
        }
    };

    // 🔴 STOP BLE BROADCASTING
    const handleStopBLE = async () => {
        try {
            setIsBLELoading(true);
            
            console.log('[StudentHome] ========================================');
            console.log('[StudentHome] 🔴 Stopping BLE Broadcasting');
            console.log('[StudentHome] ========================================');
            
            await BLEService.stopAdvertising();
            
            setIsBLEActive(false);
            setBLEStatus('stopped');
            setBroadcastStartTime(null);
            
            console.log('[StudentHome] ✅ BLE broadcasting stopped');
            console.log('[StudentHome] ========================================');
            
            Alert.alert('✅ BLE Stopped', 'Proximity detection has been disabled.');
        } catch (error) {
            console.error('[StudentHome] ❌ Error stopping BLE:', error);
            Alert.alert('Error', 'Failed to stop BLE broadcasting');
        } finally {
            setIsBLELoading(false);
        }
    };

    // 🎛️ TOGGLE BLE
    const handleToggleBLE = () => {
        if (isBLEActive) {
            handleStopBLE();
        } else {
            handleStartBLE();
        }
    };

    // --- Handlers ---
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        console.log('[StudentHome] Refreshing student data...');

        await new Promise<void>(resolve => setTimeout(() => {
            setAttendanceStats(prev => ({
                ...prev,
                month: prev.month + (Math.random() > 0.5 ? 1 : -1)
            }));
            resolve();
        }, 1500));

        setRefreshing(false);
        console.log("[StudentHome] Refresh complete.");
    }, []);

    const handleScanAttendancePress = useCallback(() => {
        const currentSessionId = "SESSION_123";
        navigation.navigate('BLECheckScreen', { sessionId: currentSessionId });
    }, [navigation]);

    const handleSetupPress = useCallback(() => {
        navigation.navigate('SetupScreen');
    }, [navigation]);

    // --- Render Functions ---
    const renderBLEStatus = () => (
        <View style={[styles.card, styles.bleCard]}>
            <View style={styles.bleHeader}>
                <View style={styles.bleIconContainer}>
                    <Icon 
                        name="bluetooth" 
                        size={32} 
                        color={getBLEStatusColor()} 
                    />
                    {bleStatus === 'broadcasting' && (
                        <View style={[styles.blePulse, { backgroundColor: getBLEStatusColor() }]} />
                    )}
                </View>
                <View style={styles.bleInfo}>
                    <Text style={styles.bleTitle}>Proximity Detection</Text>
                    <Text style={[styles.bleStatus, { color: getBLEStatusColor() }]}>
                        {getBLEStatusText()}
                    </Text>
                </View>
            </View>

            {bleStatus === 'broadcasting' && (
                <View style={styles.bleDetails}>
                    <View style={styles.bleDetailRow}>
                        <Icon name="access-time" size={16} color="#6B7280" />
                        <Text style={styles.bleDetailText}>
                            Broadcasting for {getBroadcastDuration()}
                        </Text>
                    </View>
                    <View style={styles.bleDetailRow}>
                        <Icon name="wifi-tethering" size={16} color="#6B7280" />
                        <Text style={styles.bleDetailText}>
                            Teachers can detect your presence
                        </Text>
                    </View>
                </View>
            )}

            {bleStatus === 'error' && (
                <View style={styles.bleError}>
                    <Icon name="error-outline" size={20} color="#EF4444" />
                    <Text style={styles.bleErrorText}>
                        Bluetooth & Location permissions required for proximity detection
                    </Text>
                </View>
            )}

            {bleStatus === 'stopped' && (
                <View style={styles.bleInfo}>
                    <Text style={styles.bleStoppedText}>
                        Enable proximity detection to receive nearby class notifications
                    </Text>
                </View>
            )}

            {/* 🔥 TOGGLE BUTTON */}
            <TouchableOpacity
                style={[
                    styles.bleToggleButton,
                    isBLEActive ? styles.bleToggleButtonActive : styles.bleToggleButtonInactive
                ]}
                onPress={handleToggleBLE}
                disabled={isBLELoading}
            >
                {isBLELoading ? (
                    <>
                        <Icon name="hourglass-empty" size={20} color="#FFF" />
                        <Text style={styles.bleToggleButtonText}>
                            {isBLEActive ? 'Stopping...' : 'Starting...'}
                        </Text>
                    </>
                ) : (
                    <>
                        <Icon 
                            name={isBLEActive ? 'bluetooth-disabled' : 'bluetooth'} 
                            size={20} 
                            color="#FFF" 
                        />
                        <Text style={styles.bleToggleButtonText}>
                            {isBLEActive ? 'Stop Broadcasting' : 'Start Broadcasting'}
                        </Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );

    const renderHeroSection = () => (
        <View style={[styles.card, styles.heroCard]}>
            <Text style={styles.heroTitle}>🎯 Today's Attendance</Text>
            <View style={styles.heroContent}>
                <Text style={styles.heroText}>Upcoming/Current Class: {currentClass.name}</Text>
                <Text style={styles.heroText}>
                    Last Status: {getStatusIcon(currentClass.status)} {currentClass.status.toUpperCase()}
                </Text>
                <Text style={styles.heroText}>Current Streak: {currentClass.streak} days 🔥</Text>
            </View>
            <TouchableOpacity style={styles.attendanceButton} onPress={handleScanAttendancePress}>
                <Text style={styles.buttonText}>MARK ATTENDANCE</Text>
            </TouchableOpacity>
        </View>
    );

    const renderSetupButton = () => {
        if (userData.role !== 'student') return null;

        return (
            <View style={[styles.card, styles.setupCard]}>
                <View style={styles.setupHeader}>
                    <Icon name="settings" size={24} color="#3498db" />
                    <Text style={styles.setupTitle}>System Setup</Text>
                </View>
                <Text style={styles.setupDescription}>
                    Configure Face++ Global Faceset for faster verification
                </Text>
                <TouchableOpacity style={styles.setupButton} onPress={handleSetupPress}>
                    <Icon name="build" size={20} color="#fff" />
                    <Text style={styles.setupButtonText}>Open Face++ Setup</Text>
                </TouchableOpacity>
                <Text style={styles.setupNote}>
                    ⚠️ One-time setup required. Delete after configuration.
                </Text>
            </View>
        );
    };

    const renderAttendanceOverview = () => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 My Attendance Stats</Text>
            <View style={styles.statsContainer}>
                <Text style={styles.statText}>
                    Overall: {attendanceStats.overall}%
                    {attendanceStats.overall >= 75 ? ' ✅' : ' ❌'} (Min 75%)
                </Text>
                <Text style={styles.statText}>This Month: {attendanceStats.month}%</Text>
                <Text style={styles.statText}>This Week: {attendanceStats.week}% ✨</Text>
            </View>
            <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => navigation.navigate('AnalyticsScreen')}
            >
                <Text style={styles.linkText}>View Details →</Text>
            </TouchableOpacity>
        </View>
    );

    const renderAIChallenge = () => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>🎮 Today's Challenge</Text>
            <View style={styles.statsContainer}>
                <Text style={styles.statText}>Challenge: "{todayChallenge.name}"</Text>
                <Text style={styles.statText}>
                    Progress: {todayChallenge.progress}/{todayChallenge.total}{' '}
                    {getProgressBars(todayChallenge.progress, todayChallenge.total)}
                </Text>
                <Text style={styles.statText}>Reward: {todayChallenge.reward}</Text>
                <Text style={styles.statText}>Time Left: {todayChallenge.timeLeft}</Text>
            </View>
            <TouchableOpacity
                style={styles.challengeButton}
                onPress={() => Alert.alert("Accept", "Prototype: Challenge accepted!")}
            >
                <Text style={[styles.buttonText, { color: '#FFF' }]}>Accept Challenge</Text>
            </TouchableOpacity>
        </View>
    );

    const renderMyBadges = () => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>🏆 My Badges</Text>
            <View style={styles.badgeContainer}>
                <Text style={styles.badge}>🐦 Early Bird</Text>
                <Text style={styles.badge}>🔥 Streak King (7 Days)</Text>
                <Text style={styles.badge}>💯 Perfect Week</Text>
                <Text style={styles.badge}>🎓 Class Topper (Mockup)</Text>
            </View>
        </View>
    );

    const renderQuickActions = () => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>⚡ Quick Actions</Text>
            <View style={styles.quickActionsGrid}>
                <TouchableOpacity style={styles.quickActionButton} onPress={handleScanAttendancePress}>
                    <Text style={styles.quickActionIcon}>📷</Text>
                    <Text style={styles.quickActionText}>Scan Attendance</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => navigation.navigate('AnalyticsScreen')}
                >
                    <Text style={styles.quickActionIcon}>📊</Text>
                    <Text style={styles.quickActionText}>View Analytics</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => navigation.navigate('NudgeScreen')}
                >
                    <Icon name="people" size={24} style={styles.quickActionIcon} />
                    <Text style={styles.quickActionText}>Nudge a Friend</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.quickActionButton}
                    onPress={() => navigation.navigate('RedeemScreen')}
                >
                    <Text style={styles.quickActionIcon}>🎁</Text>
                    <Text style={styles.quickActionText}>Redeem Points</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderNotifications = () => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>🔔 Recent Updates</Text>
            <View style={styles.notificationsContainer}>
                {localNotifications.slice(0, 3).map((notification) => (
                    <View key={notification.id} style={styles.notificationItem}>
                        <Text style={styles.notificationText}>• {notification.message}</Text>
                        <Text style={styles.notificationTime}>{notification.timestamp}</Text>
                    </View>
                ))}
            </View>
            <TouchableOpacity
                style={styles.viewDetailsButton}
                onPress={() => navigation.navigate('Notifications')}
            >
                <Text style={styles.linkText}>View All →</Text>
            </TouchableOpacity>
        </View>
    );

    const renderAIInsights = () => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>🤖 AI Insights</Text>
            <Text style={styles.insightText}>
                "Based on your pattern, you're likely to attend tomorrow's Physics class. Consider the early morning start!"
            </Text>
            <View style={styles.insightFooter}>
                <Text style={styles.insightDetail}>Prediction Accuracy: 94%</Text>
                <Text style={styles.insightDetail}>Attendance Trend: ↗️ Improving</Text>
            </View>
        </View>
    );

    const renderProgressVisualization = () => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>📈 Weekly Progress</Text>
            <View style={styles.weekProgress}>
                <Text style={styles.weekDay}>Mon ✅</Text>
                <Text style={styles.weekDay}>Tue ✅</Text>
                <Text style={styles.weekDay}>Wed ❌</Text>
                <Text style={styles.weekDay}>Thu ✅</Text>
                <Text style={styles.weekDay}>Fri ⏰</Text>
            </View>
            <View style={styles.progressBarContainer}>
                <Text style={styles.progressLabel}>Attendance Goal: 75%</Text>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${attendanceStats.overall}%` }]} />
                </View>
                <Text style={styles.progressPercentage}>{attendanceStats.overall}%</Text>
            </View>
        </View>
    );

    // --- Main Render ---
    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
            <ScrollView
                style={styles.scrollView}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={['#007AFF']}
                        tintColor={'#007AFF'}
                    />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.greeting}>
                        {currentTime}, {userData.name || 'Student'}!
                    </Text>
                    <Text style={styles.subtitle}>Your attendance dashboard</Text>
                </View>

                {/* Setup Button */}
                {renderSetupButton()}

                {/* 🔥 BLE Status Card with Toggle Button */}
                {renderBLEStatus()}

                {/* Content */}
                {renderHeroSection()}
                {renderAttendanceOverview()}
                {renderAIChallenge()}
                {renderMyBadges()}
                {renderQuickActions()}
                {renderNotifications()}
                {renderAIInsights()}
                {renderProgressVisualization()}
            </ScrollView>
        </>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    scrollView: { flex: 1, backgroundColor: '#f5f5f5' },
    header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
    greeting: { fontSize: 24, fontWeight: 'bold', color: '#333' },
    subtitle: { fontSize: 16, color: '#666', marginTop: 4 },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3
    },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
    statText: { fontSize: 14, color: '#555', marginBottom: 8, lineHeight: 20 },
    buttonText: { color: '#333', fontWeight: 'bold', fontSize: 14 },
    linkText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
    viewDetailsButton: { alignSelf: 'flex-end', marginTop: 4 },
    progressBar: { height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#4CAF50' },
    heroCard: { backgroundColor: '#007AFF' },
    heroTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 12 },
    heroContent: { marginBottom: 16 },
    heroText: { fontSize: 14, color: 'white', marginBottom: 6, lineHeight: 20 },
    statsContainer: { marginBottom: 12 },
    attendanceButton: {
        backgroundColor: '#FFD700',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 8
    },
    challengeButton: {
        backgroundColor: '#FF6B35',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center'
    },
    quickActionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-around'
    },
    quickActionButton: {
        width: '45%',
        alignItems: 'center',
        paddingVertical: 16,
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#e9ecef'
    },
    quickActionIcon: { fontSize: 24, marginBottom: 6, color: '#007AFF' },
    quickActionText: { fontSize: 13, color: '#333', textAlign: 'center', fontWeight: '500' },
    notificationsContainer: { marginBottom: 12 },
    notificationItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    notificationText: { fontSize: 14, color: '#555', flex: 1, marginRight: 8 },
    notificationTime: { fontSize: 12, color: '#999', marginLeft: 8 },
    insightText: {
        fontSize: 14,
        color: '#555',
        fontStyle: 'italic',
        marginBottom: 12,
        lineHeight: 20
    },
    insightFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: 8
    },
    insightDetail: { fontSize: 12, color: '#666', fontWeight: '500' },
    weekProgress: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
        backgroundColor: '#f8f9fa',
        paddingVertical: 10,
        borderRadius: 6
    },
    weekDay: { fontSize: 13, color: '#555', fontWeight: '500' },
    progressBarContainer: { marginBottom: 8 },
    progressLabel: { fontSize: 14, color: '#555', marginBottom: 6 },
    progressPercentage: {
        fontSize: 12,
        color: '#666',
        textAlign: 'right',
        marginTop: 4,
        fontWeight: '600'
    },
    badgeContainer: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
    badge: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0056b3',
        backgroundColor: '#e6f0ff',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 12,
        marginRight: 8,
        marginBottom: 8,
        overflow: 'hidden'
    },
    setupCard: {
        backgroundColor: '#e3f2fd',
        borderLeftWidth: 4,
        borderLeftColor: '#3498db',
    },
    setupHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    setupTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1976d2',
        marginLeft: 8,
    },
    setupDescription: {
        fontSize: 14,
        color: '#555',
        marginBottom: 12,
        lineHeight: 20,
    },
    setupButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#3498db',
        paddingVertical: 14,
        borderRadius: 8,
        marginBottom: 8,
    },
    setupButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    setupNote: {
        fontSize: 12,
        color: '#e67e22',
        fontStyle: 'italic',
        textAlign: 'center',
    },
    bleCard: {
        backgroundColor: '#F9FAFB',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    bleHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    bleIconContainer: {
        position: 'relative',
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#FFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 2,
        borderColor: '#E5E7EB',
    },
    blePulse: {
        position: 'absolute',
        width: 56,
        height: 56,
        borderRadius: 28,
        opacity: 0.3,
    },
    bleInfo: {
        flex: 1,
    },
    bleTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 4,
    },
    bleStatus: {
        fontSize: 14,
        fontWeight: '600',
    },
    bleDetails: {
        backgroundColor: '#FFF',
        borderRadius: 8,
        padding: 12,
        gap: 8,
        marginBottom: 12,
    },
    bleDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    bleDetailText: {
        fontSize: 13,
        color: '#6B7280',
    },
    bleError: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        padding: 12,
        borderRadius: 8,
        gap: 8,
        marginBottom: 12,
    },
    bleErrorText: {
        flex: 1,
        fontSize: 13,
        color: '#DC2626',
    },
    bleStoppedText: {
        fontSize: 13,
        color: '#6B7280',
        fontStyle: 'italic',
        marginBottom: 12,
    },
    // 🔥 NEW: Toggle Button Styles
    bleToggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 8,
        gap: 8,
    },
    bleToggleButtonActive: {
        backgroundColor: '#EF4444', // Red for Stop
    },
    bleToggleButtonInactive: {
        backgroundColor: '#22C55E', // Green for Start
    },
    bleToggleButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default StudentHomeScreen;