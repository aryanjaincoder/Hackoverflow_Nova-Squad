import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, RefreshControl,
    StyleSheet, StatusBar, Alert, Platform, PermissionsAndroid,
    InteractionManager
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, UserData } from '../../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

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

    // --- Handlers ---
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        console.log('Refreshing student data...');

        await new Promise<void>(resolve => setTimeout(() => {
            setAttendanceStats(prev => ({
                ...prev,
                month: prev.month + (Math.random() > 0.5 ? 1 : -1)
            }));
            resolve();
        }, 1500));

        setRefreshing(false);
        console.log("Refresh complete.");
    }, []);

    const handleScanAttendancePress = useCallback(() => {
        const currentSessionId = "SESSION_123";
        navigation.navigate('BLECheckScreen', { sessionId: currentSessionId });
    }, [navigation]);

    // 🆕 Setup Screen Handler
    const handleSetupPress = useCallback(() => {
        navigation.navigate('SetupScreen');
    }, [navigation]);

    // --- Render Functions ---
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

    // 🆕 Setup Button Section (Only for Admins or Testing)
    const renderSetupButton = () => {
        // Show only for admins or during testing
        // Remove this check to show for everyone during setup
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

                {/* 🆕 Setup Button - Shows at top for easy access */}
                {renderSetupButton()}

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
    // 🆕 Setup Card Styles
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
});

export default StudentHomeScreen;