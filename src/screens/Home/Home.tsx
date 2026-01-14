import React, { useState, useEffect, useCallback, memo } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, RefreshControl,
    StyleSheet, StatusBar, Alert, Platform, PermissionsAndroid,
    InteractionManager
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
// Assuming the path is correct and types are defined here
import { RootStackParamList, UserData } from '../../navigation/AppNavigator'; 
import Icon from 'react-native-vector-icons/MaterialIcons'; 

// --- Firebase Imports ---
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// --- Interfaces ---
interface AttendanceStats { overall: number; month: number; week: number; daysToTarget: number; }
interface Challenge { name: string; progress: number; total: number; reward: string; timeLeft: string; }
interface Notification { id: string; message: string; timestamp: string; }
interface ClassInfo { name: string; status: 'present' | 'absent' | 'pending'; streak: number; }
interface LiveSession {
    isActive: boolean;
    className?: string;
    present: number;
    total: number;
    startTime?: string;
}
interface AdminStats {
    pendingP2P: number;
    absentToday: number;
}
// --- Component Props ---
// ✅ NEW
interface HomeScreenProps {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
    userData: UserData;
}

// ====================================================================
// --- HELPER FUNCTIONS (Optimization ke liye bahar nikaale gaye) ---
// ====================================================================

const getStatusIcon = (status: string) => status === 'present' ? '✅' : status === 'absent' ? '❌' : '⏰';
const getProgressBars = (progress: number, total: number) => Array.from({ length: total }, (_, i) => (i < progress ? '⭐' : '⚪')).join('');


// ====================================================================
// --- STUDENT DASHBOARD COMPONENT (RENDER LOGIC) ---
// ====================================================================
interface StudentDashboardProps {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
    attendanceStats: AttendanceStats;
    currentClass: ClassInfo;
    todayChallenge: Challenge;
    localNotifications: Notification[];
    handleScanAttendancePress: () => void;
}
// Ab saara Student UI logic is component mein hai (Clean code)
const StudentDashboard: React.FC<StudentDashboardProps> = memo(({
    navigation, attendanceStats, currentClass, todayChallenge, localNotifications,
    handleScanAttendancePress
}) => {

    // --- Student Render Functions (Inko yahaan rakha hai) ---
    const renderHeroSection = () => (
        <View style={[styles.card, styles.heroCard]}>
            <Text style={styles.heroTitle}>🎯 Today's Attendance</Text>
            <View style={styles.heroContent}>
                <Text style={styles.heroText}>Upcoming/Current Class: {currentClass.name}</Text>
                <Text style={styles.heroText}>Last Status: {getStatusIcon(currentClass.status)} {currentClass.status.toUpperCase()}</Text>
                <Text style={styles.heroText}>Current Streak: {currentClass.streak} days 🔥</Text>
            </View>
            <TouchableOpacity style={styles.attendanceButton} onPress={handleScanAttendancePress}>
                <Text style={styles.buttonText}>MARK ATTENDANCE</Text>
            </TouchableOpacity>
        </View>
    );

    const renderAttendanceOverview = () => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>📊 My Attendance Stats</Text>
            <View style={styles.statsContainer}>
                <Text style={styles.statText}>Overall: {attendanceStats.overall}% {attendanceStats.overall >= 75 ? ' ✅' : ' ❌'} (Min 75%)</Text>
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
                <Text style={styles.statText}>Progress: {todayChallenge.progress}/{todayChallenge.total} {getProgressBars(todayChallenge.progress, todayChallenge.total)}</Text>
                <Text style={styles.statText}>Reward: {todayChallenge.reward}</Text>
                <Text style={styles.statText}>Time Left: {todayChallenge.timeLeft}</Text>
            </View>
            <TouchableOpacity style={styles.challengeButton} onPress={() => Alert.alert("Accept", "Prototype: Challenge accepted!")}>
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
                    <Text style={styles.quickActionIcon}>📷</Text><Text style={styles.quickActionText}>Scan Attendance</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    style={styles.quickActionButton} 
                    onPress={() => navigation.navigate('AnalyticsScreen')} 
                >
                    <Text style={styles.quickActionIcon}>📊</Text><Text style={styles.quickActionText}>View Analytics</Text>
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
            <TouchableOpacity style={styles.viewDetailsButton} onPress={() => navigation.navigate('Notifications')}>
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

    // --- MAIN STUDENT RENDER ---
    return (
        <>
            {renderHeroSection()}
            {renderAttendanceOverview()}
            {renderAIChallenge()}
            {renderMyBadges()} 
            {renderQuickActions()}
            {renderNotifications()}
            {renderAIInsights()}
            {renderProgressVisualization()}
        </>
    );
});


// ====================================================================
// --- ADMIN DASHBOARD COMPONENT (RENDER LOGIC) ---
// ====================================================================
interface AdminDashboardProps {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Home'>;
    liveSession: LiveSession;
    adminStats: AdminStats;
}

const AdminDashboard: React.FC<AdminDashboardProps> = memo(({ navigation, liveSession, adminStats }) => {
    
    // --- Admin Render Functions ---
    const renderAdminActions = () => (
        <View style={styles.adminActionsGrid}>
            <TouchableOpacity 
                style={[styles.adminActionCard, {backgroundColor: '#1E3A8A'}]} 
                onPress={() => navigation.navigate('CreateSessionScreen')}
            >
                <Icon name="add-task" size={32} color="#FFF" />
                <Text style={styles.adminActionText}>Create Session</Text>
                <Text style={styles.adminActionSubtext}>QR, NFC, or P2P</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={[styles.adminActionCard, {backgroundColor: '#059669'}]} onPress={() => Alert.alert("Navigate", "View Reports")}>
                <Icon name="assessment" size={32} color="#FFF" />
                <Text style={styles.adminActionText}>View Reports</Text>
                <Text style={styles.adminActionSubtext}>Export Data</Text>
            </TouchableOpacity>
        </View>
    );

    const renderAdminLiveSession = () => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>📡 Live Session Status</Text>
            {liveSession.isActive ? (
                <View>
                    <View style={styles.liveStatusBadge}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveStatusText}>ACTIVE</Text>
                    </View>
                    <Text style={styles.statText}>Class: <Text style={{fontWeight: 'bold'}}>{liveSession.className}</Text></Text>
                    <Text style={styles.statText}>Started at: {liveSession.startTime}</Text>
                    
                    <View style={styles.adminProgressContainer}>
                        <Text style={styles.adminProgressLabel}>Live Count: {liveSession.present} / {liveSession.total}</Text>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${(liveSession.present / liveSession.total) * 100}%`, backgroundColor: '#1E3A8A' }]} />
                        </View>
                    </View>

                    <TouchableOpacity style={[styles.attendanceButton, {backgroundColor: '#B91C1C', marginTop: 16}]} onPress={() => Alert.alert("End Session", "Are you sure?")}>
                        <Text style={[styles.buttonText, {color: '#FFF'}]}>END SESSION</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View>
                    <Text style={styles.statText}>No session is currently active.</Text>
                    
                    <TouchableOpacity 
                        style={[styles.attendanceButton, {backgroundColor: '#1E3A8A', marginTop: 16}]} 
                        onPress={() => navigation.navigate('CreateSessionScreen')}
                    >
                        <Text style={[styles.buttonText, {color: '#FFF'}]}>CREATE NEW SESSION</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );

    const renderAdminOverview = () => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>🗓️ Today's Overview</Text>
            <View style={styles.adminOverviewContainer}>
                
                <TouchableOpacity 
                    style={styles.adminOverviewBox} 
                    onPress={() => navigation.navigate('VerificationQueueScreen')}
                >
                    <Text style={styles.adminOverviewNumber}>{adminStats.pendingP2P}</Text>
                    <Text style={styles.adminOverviewLabel}>Pending Verifications</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.adminOverviewBox} onPress={() => Alert.alert("Navigate", "View Absentees")}>
                    <Text style={styles.adminOverviewNumber}>{adminStats.absentToday}</Text>
                    <Text style={styles.adminOverviewLabel}>Marked Absent (Total)</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderAdminManagement = () => (
        <View style={styles.card}>
            <Text style={styles.cardTitle}>🛠️ Management</Text>
            <TouchableOpacity style={styles.adminListItem} onPress={() => Alert.alert("Navigate", "Manage Students")}>
                <Icon name="manage-accounts" size={22} color="#1E3A8A" />
                <Text style={styles.adminListItemText}>Manage Students</Text>
                <Icon name="chevron-right" size={22} color="#666" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.adminListItem} onPress={() => Alert.alert("Navigate", "Manage Classes")}>
                <Icon name="class" size={22} color="#1E3A8A" />
                <Text style={styles.adminListItemText}>Manage Classes</Text>
                <Icon name="chevron-right" size={22} color="#666" />
            </TouchableOpacity>
            
            <TouchableOpacity 
                style={styles.adminListItem} 
                onPress={() => navigation.navigate('VerificationQueueScreen')}
            >
                <Icon name="how-to-reg" size={22} color="#1E3A8A" />
                <Text style={styles.adminListItemText}>Approve P2P Attendance</Text>
                <Icon name="chevron-right" size={22} color="#666" />
            </TouchableOpacity>
        </View>
    );

    // --- MAIN ADMIN RENDER ---
    return (
        <>
            {renderAdminActions()}
            {renderAdminLiveSession()}
            {renderAdminOverview()}
            {renderAdminManagement()}
        </>
    );
});


// ====================================================================
// --- MAIN HOMESCREEN COMPONENT (Data and Logic) ---
// ====================================================================

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation, userData }) => {
    
    // --- Common States ---
    const [refreshing, setRefreshing] = useState(false);
    const [currentTime, setCurrentTime] = useState('');

    // --- Student-Specific States ---
    const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({ overall: 78, month: 85, week: 100, daysToTarget: 3 });
    const [currentClass, setCurrentClass] = useState<ClassInfo>({ name: 'Mathematics', status: 'pending', streak: 7 });
    const [todayChallenge, setTodayChallenge] = useState<Challenge>({ name: 'Perfect Week Streak', progress: 4, total: 7, reward: '50 points + Badge', timeLeft: '3 days' });
    const [localNotifications, setLocalNotifications] = useState<Notification[]>([
        { id: '1', message: 'Quiz challenge completed! +20 points', timestamp: '10:30 AM' },
        { id: '2', message: 'Reminder: Math class in 30 minutes', timestamp: '11:00 AM' },
    ]);
    
    // --- Admin-Specific States ---
    const [liveSession, setLiveSession] = useState<LiveSession>({ isActive: true, className: 'Data Structures', present: 45, total: 60, startTime: '10:30 AM' });
    const [adminStats, setAdminStats] = useState<AdminStats>({ pendingP2P: 12, absentToday: 15 });
    
    const [isNotificationSetupDone, setIsNotificationSetupDone] = useState(false);
    
    // --- Notification Permission & Token Logic (Common) ---
    const setupNotifications = useCallback(async () => {
        if (isNotificationSetupDone) return;
        setIsNotificationSetupDone(true);
        let enabled = false;
        try {
            const userId = auth().currentUser?.uid;
            if (!userId) { console.log('[HomeScreen] User not logged in...'); return; }
            if (Platform.OS === 'ios') {
                const authStatus = await messaging().requestPermission();
                enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED || authStatus === messaging.AuthorizationStatus.PROVISIONAL;
            } else if (Platform.OS === 'android') {
                if (Platform.Version >= 33) {
                    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
                    enabled = granted === PermissionsAndroid.RESULTS.GRANTED;
                } else { enabled = true; }
            }
            if (enabled) {
                console.log('[HomeScreen] Notification permission granted.');
                const token = await messaging().getToken();
                console.log('[HomeScreen] FCM Token:', token);
                await firestore().collection('users').doc(userId).set(
                    { fcmToken: token, lastTokenUpdate: firestore.FieldValue.serverTimestamp() },
                    { merge: true }
                );
                console.log('[HomeScreen] FCM Token saved.');
            } else { console.log('[HomeScreen] Notification permission denied.'); }
        } catch (error: any) { console.error("[HomeScreen] Error notification setup:", error); }
    }, [isNotificationSetupDone]);

    // --- Notification Setup Effect (Common) ---
    useEffect(() => {
        const interactionPromise = InteractionManager.runAfterInteractions(() => {
            if (auth().currentUser && !isNotificationSetupDone) { setupNotifications(); }
        });
        const unsubscribeTokenRefresh = messaging().onTokenRefresh(async newToken => {
            console.log("[HomeScreen] Token Refreshed:", newToken);
            const userId = auth().currentUser?.uid;
            if (userId) {
                try {
                    await firestore().collection('users').doc(userId).set(
                             { fcmToken: newToken, lastTokenUpdate: firestore.FieldValue.serverTimestamp() },
                             { merge: true }
                          );
                    console.log("[HomeScreen] Refreshed FCM token saved.");
                } catch (e) { console.error("[HomeScreen] Error saving refreshed token:", e); }
            }
        });
        return () => { unsubscribeTokenRefresh(); interactionPromise.cancel(); };
    }, [setupNotifications, isNotificationSetupDone]);

    // --- Greeting Effect (Common) ---
    useEffect(() => {
        const updateTime = () => {
            const hour = new Date().getHours();
            let greeting = hour < 12 ? 'Good morning ☀️' : hour < 18 ? 'Good afternoon 🌤️' : 'Good evening 🌙';
            setCurrentTime(greeting);
        };
        updateTime();
        const interval = setInterval(updateTime, 60000);
        return () => clearInterval(interval);
    }, []);

    // --- Refresh Handler (Conditional) ---
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        console.log(`Refreshing data for ${userData.role}...`);
        
        await new Promise<void>(resolve => setTimeout(() => {
            if (userData.role === 'admin') {
                // Mock data update for admin
                setLiveSession(prev => ({ ...prev, present: prev.present + (Math.floor(Math.random() * 3)) }));
                setAdminStats(prev => ({...prev, pendingP2P: (10 + Math.floor(Math.random() * 5))}));
            }
            if (userData.role === 'student') {
                // Mock data update for student
                setAttendanceStats(prev => ({ ...prev, month: prev.month + (Math.random() > 0.5 ? 1 : -1) }));
            }
            resolve();
        }, 1500));
        
        setRefreshing(false);
        console.log("Refresh complete.");
    }, [userData.role]);

    // --- Student Navigation Handler (UseCallback mein wrapped hai) ---
    const handleScanAttendancePress = useCallback(() => {
        const currentSessionId = "SESSION_123"; 
        navigation.navigate('BLECheckScreen', { sessionId: currentSessionId });
    }, [navigation]);

    // --- Common Wrapper Components ---
    const Header = () => (
        <View style={[styles.header, userData.role === 'admin' ? styles.adminHeader : {}]}>
            <Text style={styles.greeting}>{currentTime}, {userData.role === 'admin' ? 'Admin' : userData.name || 'Student'}!</Text>
            <Text style={styles.subtitle}>{userData.role === 'admin' ? 'Welcome to your control panel' : 'Your attendance dashboard'}</Text>
        </View>
    );

    const ScrollViewWrapper = ({ children }: { children: React.ReactNode }) => (
        <ScrollView
            style={styles.scrollView}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#007AFF']} tintColor={'#007AFF'} />}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 100 }} 
        >
            <Header />
            {children}
        </ScrollView>
    );


    // --- MAIN RENDER ---
    return (
        <>
            <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
            
            {userData.role === 'student' ? (
                <ScrollViewWrapper>
                    <StudentDashboard
                        navigation={navigation}
                        attendanceStats={attendanceStats}
                        currentClass={currentClass}
                        todayChallenge={todayChallenge}
                        localNotifications={localNotifications}
                        handleScanAttendancePress={handleScanAttendancePress}
                    />
                </ScrollViewWrapper>
            ) : (
                <ScrollViewWrapper>
                    <AdminDashboard
                        navigation={navigation}
                        liveSession={liveSession}
                        adminStats={adminStats}
                    />
                </ScrollViewWrapper>
            )}
        </>
    );
};

// --- Styles (Existing Styles) ---
const styles = StyleSheet.create({
    // --- Common Styles ---
    scrollView: { flex: 1, backgroundColor: '#f5f5f5' }, 
    header: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 10 },
    greeting: { fontSize: 24, fontWeight: 'bold', color: '#333' }, 
    subtitle: { fontSize: 16, color: '#666', marginTop: 4 }, 
    card: { backgroundColor: 'white', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, elevation: 3 },
    cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 12 },
    statText: { fontSize: 14, color: '#555', marginBottom: 8, lineHeight: 20 },
    buttonText: { color: '#333', fontWeight: 'bold', fontSize: 14 },
    linkText: { color: '#007AFF', fontSize: 14, fontWeight: '600' },
    viewDetailsButton: { alignSelf: 'flex-end', marginTop: 4 },
    progressBar: { height: 10, backgroundColor: '#e0e0e0', borderRadius: 5, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#4CAF50' }, 
    challengeButton: { backgroundColor: '#FF6B35', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
    
    // --- Student Styles ---
    heroCard: { backgroundColor: '#007AFF' },
    heroTitle: { fontSize: 18, fontWeight: 'bold', color: 'white', marginBottom: 12 },
    heroContent: { marginBottom: 16 },
    heroText: { fontSize: 14, color: 'white', marginBottom: 6, lineHeight: 20 },
    statsContainer: { marginBottom: 12 },
    attendanceButton: { backgroundColor: '#FFD700', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 8 },
    quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' },
    quickActionButton: { width: '45%', alignItems: 'center', paddingVertical: 16, backgroundColor: '#f8f9fa', borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: '#e9ecef' },
    quickActionIcon: { fontSize: 24, marginBottom: 6, color: '#007AFF' },
    quickActionText: { fontSize: 13, color: '#333', textAlign: 'center', fontWeight: '500' },
    notificationsContainer: { marginBottom: 12 },
    notificationItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: '#f0f0f0'},
    notificationText: { fontSize: 14, color: '#555', flex: 1, marginRight: 8 },
    notificationTime: { fontSize: 12, color: '#999', marginLeft: 8 },
    insightText: { fontSize: 14, color: '#555', fontStyle: 'italic', marginBottom: 12, lineHeight: 20 },
    insightFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 8},
    insightDetail: { fontSize: 12, color: '#666', fontWeight: '500' },
    weekProgress: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16, backgroundColor: '#f8f9fa', paddingVertical: 10, borderRadius: 6 },
    weekDay: { fontSize: 13, color: '#555', fontWeight: '500'},
    progressBarContainer: { marginBottom: 8 },
    progressLabel: { fontSize: 14, color: '#555', marginBottom: 6 },
    progressPercentage: { fontSize: 12, color: '#666', textAlign: 'right', marginTop: 4, fontWeight: '600' },
    badgeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 4,
    },
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
        overflow: 'hidden', 
    },
    
    // --- Admin Styles ---
    adminHeader: {
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB' 
    },
    adminActionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: 16,
        marginTop: 16,
        marginBottom: 4,
    },
    adminActionCard: {
        width: '48.5%',
        borderRadius: 12,
        padding: 16,
        minHeight: 120,
        justifyContent: 'space-between',
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    adminActionText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: 'white',
        marginTop: 8,
    },
    adminActionSubtext: {
        fontSize: 13,
        color: 'white',
        opacity: 0.8,
    },
    liveStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        backgroundColor: '#DCFCE7',
        borderRadius: 12,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginBottom: 12,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#22C55E',
        marginRight: 6,
    },
    liveStatusText: {
        color: '#166534',
        fontSize: 12,
        fontWeight: 'bold',
    },
    adminProgressContainer: {
        marginTop: 12,
    },
    adminProgressLabel: {
        fontSize: 14,
        color: '#333',
        marginBottom: 6,
    },
    adminOverviewContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    adminOverviewBox: {
        width: '48.5%',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        backgroundColor: '#F3F4F6',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    adminOverviewNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1E3A8A',
    },
    adminOverviewLabel: {
        fontSize: 13,
        color: '#4B5563',
        textAlign: 'center',
        marginTop: 4,
    },
    adminListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    adminListItemText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    }
});

export default HomeScreen;