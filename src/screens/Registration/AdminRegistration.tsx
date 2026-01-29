import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View, Text, ScrollView, TouchableOpacity, RefreshControl,
    StyleSheet, StatusBar, Alert, Platform, PermissionsAndroid,
    InteractionManager, Animated
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, UserData } from '../../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import messaging from '@react-native-firebase/messaging';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import LinearGradient from 'react-native-linear-gradient';
import TextTicker from 'react-native-text-ticker';
import Modal from 'react-native-modal';

// --- Interfaces ---
interface LiveSession {
    isActive: boolean;
    sessionId?: string;
    className?: string;
    present: number;
    total: number;
    startTime?: string;
    mode?: 'QR' | 'NFC' | 'SOUND';
}

interface AdminStats {
    pendingP2P: number;
    absentToday: number;
    flaggedStudents: number;
    weeklyAverage: number;
}

interface ProximityAlert {
    studentsDetected: number;
    suggestedMode: 'QR' | 'NFC' | 'SOUND';
}

type AdminHomeScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

interface AdminHomeScreenProps {
    navigation: AdminHomeScreenNavigationProp;
    userData: UserData;
}

const AdminHomeScreen: React.FC<AdminHomeScreenProps> = ({ navigation, userData }) => {
    // --- States ---
    const [isPredictionModalVisible, setIsPredictionModalVisible] = useState(false);
    const [rippleAnim] = useState(new Animated.Value(0));
    const [refreshing, setRefreshing] = useState(false);
    const [currentTime, setCurrentTime] = useState('');
    const [selectedMode, setSelectedMode] = useState<'QR' | 'NFC' | 'SOUND'>('QR');
    const [liveSession, setLiveSession] = useState<LiveSession>({
        isActive: false,
        present: 0,
        total: 0
    });
    const [adminStats, setAdminStats] = useState<AdminStats>({
        pendingP2P: 12,
        absentToday: 15,
        flaggedStudents: 5,
        weeklyAverage: 78
    });
    const [isNotificationSetupDone, setIsNotificationSetupDone] = useState(false);
    const [pulseAnim] = useState(new Animated.Value(1));
    const [proximityAlert, setProximityAlert] = useState<ProximityAlert | null>(null);
    const [teacherVerified, setTeacherVerified] = useState(true);
    const [liveActivityFeed, setLiveActivityFeed] = useState<string[]>([
        "Rahul marked present via QR 🎉",
        "Sneha's face verified ✅",
        "Amit flagged for manual review ⚠️"
    ]);
    const [modeTapCount, setModeTapCount] = useState(0);
    const [isClassModalVisible, setIsClassModalVisible] = useState(false);

    // Available classes
    const availableClasses = [
        { id: '1', name: 'Data Structures', icon: 'code' },
        { id: '2', name: 'AI/ML', icon: 'psychology' },
        { id: '3', name: 'Web Development', icon: 'language' },
        { id: '4', name: 'Database Systems', icon: 'storage' },
    ];

    const getDynamicGradient = () => {
        if (adminStats.flaggedStudents > 5 || adminStats.pendingP2P > 15) {
            return ['#DC2626', '#EF4444'];
        }
        if (adminStats.flaggedStudents > 2 || adminStats.pendingP2P > 8) {
            return ['#F59E0B', '#FB923C'];
        }
        return getModeGradient(liveSession.mode || selectedMode);
    };

    const calculatePrediction = () => {
        const currentHour = new Date().getHours();
        const currentMinute = new Date().getMinutes();
        const timeElapsed = (currentHour - 10) * 60 + currentMinute;
        
        if (!liveSession.isActive || timeElapsed <= 0) {
            return { predicted: 85, confidence: 75, endTime: '11:00 AM' };
        }
        
        const rate = (liveSession.present / timeElapsed) * 60;
        const remainingTime = 60 - timeElapsed;
        const predictedTotal = liveSession.present + (rate * remainingTime / 60);
        const predictedPercentage = Math.min(Math.round((predictedTotal / liveSession.total) * 100), 100);
        
        return {
            predicted: predictedPercentage,
            confidence: 85 + Math.floor(Math.random() * 10),
            endTime: '11:00 AM',
        };
    };

    const setupNotifications = useCallback(async () => {
        if (isNotificationSetupDone) return;
        setIsNotificationSetupDone(true);

        let enabled = false;
        try {
            const userId = auth().currentUser?.uid;
            if (!userId) {
                console.log('[AdminHome] User not logged in...');
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
                console.log('[AdminHome] Notification permission granted.');
                const token = await messaging().getToken();
                console.log('[AdminHome] FCM Token:', token);

                await firestore().collection('users').doc(userId).set(
                    {
                        fcmToken: token,
                        lastTokenUpdate: firestore.FieldValue.serverTimestamp()
                    },
                    { merge: true }
                );
                console.log('[AdminHome] FCM Token saved.');
            } else {
                console.log('[AdminHome] Notification permission denied.');
            }
        } catch (error: any) {
            console.error("[AdminHome] Error notification setup:", error);
        }
    }, [isNotificationSetupDone]);

    const getModeIcon = (mode: 'QR' | 'NFC' | 'SOUND') => {
        switch (mode) {
            case 'QR': return 'qr-code-2';
            case 'NFC': return 'nfc';
            case 'SOUND': return 'graphic-eq';
        }
    };

    const getModeColor = (mode: 'QR' | 'NFC' | 'SOUND') => {
        switch (mode) {
            case 'QR': return '#1E3A8A';
            case 'NFC': return '#7C3AED';
            case 'SOUND': return '#DC2626';
        }
    };

    const getModeGradient = (mode: 'QR' | 'NFC' | 'SOUND') => {
        switch (mode) {
            case 'QR': return ['#1E3A8A', '#3B82F6'];
            case 'NFC': return ['#065F46', '#10B981'];
            case 'SOUND': return ['#7C3AED', '#EC4899'];
        }
    };

    // --- Effects ---
    useEffect(() => {
        if (proximityAlert) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(rippleAnim, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(rippleAnim, {
                        toValue: 0,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [proximityAlert, rippleAnim]);

    useEffect(() => {
        if (liveSession.isActive) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.3,
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
    }, [liveSession.isActive, pulseAnim]);

    useEffect(() => {
        const checkProximity = async () => {
            const nearbyCount = Math.floor(Math.random() * 30);
            
            if (nearbyCount > 10 && !liveSession.isActive) {
                const suggestedMode: 'QR' | 'NFC' | 'SOUND' = 
                    nearbyCount > 40 ? 'SOUND' : nearbyCount > 20 ? 'NFC' : 'QR';
                
                setProximityAlert({
                    studentsDetected: nearbyCount,
                    suggestedMode: suggestedMode
                });
            } else if (nearbyCount <= 10) {
                setProximityAlert(null);
            }
        };
        
        const interval = setInterval(checkProximity, 30000);
        return () => clearInterval(interval);
    }, [liveSession.isActive]);

    useEffect(() => {
        const checkTeacherPresence = async () => {
            const beaconDetected = Math.random() > 0.2;
            setTeacherVerified(beaconDetected);
        };
        
        const interval = setInterval(checkTeacherPresence, 10000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!liveSession.isActive || !liveSession.sessionId) return;
        
        const unsubscribe = firestore()
            .collection('attendance_logs')
            .where('sessionId', '==', liveSession.sessionId)
            .limit(10)
            .onSnapshot((snapshot) => {
                const updates = snapshot.docs
                    .map(doc => {
                        const data = doc.data();
                        return {
                            text: `${data.studentName} marked ${data.status} via ${data.method}`,
                            timestamp: data.timestamp
                        };
                    })
                    .sort((a, b) => b.timestamp - a.timestamp)
                    .slice(0, 5)
                    .map(item => item.text);
                    
                if (updates.length > 0) {
                    setLiveActivityFeed(updates);
                }
            }, (error) => {
                console.error('[AdminHome] Activity feed error:', error);
            });
            
        return () => unsubscribe();
    }, [liveSession.isActive, liveSession.sessionId]);

    useEffect(() => {
        const interactionPromise = InteractionManager.runAfterInteractions(() => {
            if (auth().currentUser && !isNotificationSetupDone) {
                setupNotifications();
            }
        });

        const unsubscribeTokenRefresh = messaging().onTokenRefresh(async newToken => {
            console.log("[AdminHome] Token Refreshed:", newToken);
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
                    console.log("[AdminHome] Refreshed FCM token saved.");
                } catch (e) {
                    console.error("[AdminHome] Error saving refreshed token:", e);
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

    useEffect(() => {
        if (modeTapCount >= 3) {
            Alert.alert(
                "🔓 God Mode Activated",
                "All verification checks temporarily disabled. Use with caution!",
                [{ text: "OK", onPress: () => setModeTapCount(0) }]
            );
        }
    }, [modeTapCount]);
    useEffect(() => {
    const userId = auth().currentUser?.uid;
    if (!userId) return;

    const unsubscribe = firestore()
        .collection('attendance_sessions')
        .where('adminId', '==', userId)
        .where('status', '==', 'active')
        .orderBy('createdAt', 'desc')
        .limit(1)
        .onSnapshot(
            (snapshot) => {
                if (!snapshot.empty) {
                    const sessionDoc = snapshot.docs[0];
                    const sessionData = sessionDoc.data();
                    
                    setLiveSession({
                        isActive: true,
                        sessionId: sessionDoc.id,
                        className: sessionData.subject || sessionData.className,
                        present: sessionData.presentCount || 0,
                        total: sessionData.totalStudents || 0,
                        startTime: sessionData.startTime,
                        mode: sessionData.mode,
                    });
                } else {
                    // No active session
                    setLiveSession({
                        isActive: false,
                        present: 0,
                        total: 0,
                    });
                }
            },
            (error) => {
                console.error('[AdminHome] Error listening to active sessions:', error);
            }
        );

    return () => unsubscribe();
}, []);
    // --- Handlers ---
    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        console.log('Refreshing admin data...');

        await new Promise<void>(resolve => setTimeout(() => {
            setLiveSession(prev => ({
                ...prev,
                present: prev.present + Math.floor(Math.random() * 3)
            }));
            setAdminStats(prev => ({
                ...prev,
                pendingP2P: 10 + Math.floor(Math.random() * 5),
                weeklyAverage: 75 + Math.floor(Math.random() * 10)
            }));
            resolve();
        }, 1500));

        setRefreshing(false);
        console.log("Refresh complete.");
    }, []);

    const handleEndSession = () => {
    Alert.alert(
        "End Session",
        "Are you sure you want to end the current session?\n\nNote: Monitor live analytics on the website.",
        [
            { text: "Cancel", style: "cancel" },
            {
                text: "End",
                style: "destructive",
                onPress: async () => {
                    try {
                        // End session in Firebase
                        if (liveSession.sessionId) {
                            await firestore()
                                .collection('attendance_sessions')
                                .doc(liveSession.sessionId)
                                .update({
                                    status: 'ended',
                                    endTime: new Date().toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    }),
                                });
                        }
                        
                        // Reset local state
                        setLiveSession({ isActive: false, present: 0, total: 0 });
                        
                        Alert.alert(
                            "Success", 
                            "Session ended successfully.\n\nView detailed analytics on the website.",
                            [{ text: "OK" }]
                        );
                    } catch (error) {
                        console.error('[AdminHome] Error ending session:', error);
                        Alert.alert('Error', 'Could not end session. Please try again.');
                    }
                }
            }
        ]
    );
};

    const handleCreateSession = (className?: string) => {
        navigation.navigate('CreateSessionScreen', { 
            mode: selectedMode,
            className: className 
        });
    };

    const handleQuickStart = () => {
    navigation.navigate('CreateSessionScreen', { 
        mode: selectedMode 
    });
};

  const handleProximityAlertTap = () => {
    if (proximityAlert) {
        setSelectedMode(proximityAlert.suggestedMode);
        navigation.navigate('CreateSessionScreen', { 
            mode: proximityAlert.suggestedMode 
        });
    }
};

    // --- Render Functions ---
    const renderPredictionModal = () => {
        const prediction = calculatePrediction();
        
        return (
            <Modal
                isVisible={isPredictionModalVisible}
                onBackdropPress={() => setIsPredictionModalVisible(false)}
                backdropOpacity={0.6}
                animationIn="zoomIn"
                animationOut="zoomOut"
            >
                <View style={styles.predictionModal}>
                    <View style={styles.predictionHeader}>
                        <Icon name="psychology" size={32} color="#7C3AED" />
                        <Text style={styles.predictionTitle}>AI Attendance Prediction</Text>
                    </View>
                    
                    <View style={styles.predictionContent}>
                        <View style={styles.predictionMainStat}>
                            <Text style={styles.predictionNumber}>{prediction.predicted}%</Text>
                            <Text style={styles.predictionLabel}>Expected Final Attendance</Text>
                        </View>
                        
                        <View style={styles.predictionDivider} />
                        
                        <View style={styles.predictionDetails}>
                            <View style={styles.predictionRow}>
                                <Icon name="timeline" size={20} color="#6B7280" />
                                <Text style={styles.predictionDetailText}>
                                    Current Rate: {liveSession.total > 0 ? Math.round((liveSession.present / liveSession.total) * 100) : 0}%
                                </Text>
                            </View>
                            
                            <View style={styles.predictionRow}>
                                <Icon name="access-time" size={20} color="#6B7280" />
                                <Text style={styles.predictionDetailText}>
                                    Prediction by {prediction.endTime}
                                </Text>
                            </View>
                            
                            <View style={styles.predictionRow}>
                                <Icon name="verified" size={20} color="#22C55E" />
                                <Text style={styles.predictionDetailText}>
                                    Confidence: {prediction.confidence}%
                                </Text>
                            </View>
                        </View>
                        
                        <View style={styles.predictionInsight}>
                            <Icon name="lightbulb" size={18} color="#F59E0B" />
                            <Text style={styles.predictionInsightText}>
                                {prediction.predicted >= 75 
                                    ? "✅ On track for good attendance!" 
                                    : "⚠️ Consider sending reminder notifications"}
                            </Text>
                        </View>
                    </View>
                    
                    <TouchableOpacity
                        style={styles.predictionCloseButton}
                        onPress={() => setIsPredictionModalVisible(false)}
                    >
                        <Text style={styles.predictionCloseText}>Got it</Text>
                    </TouchableOpacity>
                </View>
            </Modal>
        );
    };

    const renderHeader = () => (
        <View style={styles.header}>
            <View>
                <Text style={styles.greeting}>{currentTime}</Text>
                <Text style={styles.subtitle}>Your Intelligent Control Center</Text>
            </View>
            <View style={[
                styles.verificationBadge, 
                { backgroundColor: teacherVerified ? '#DCFCE7' : '#FEE2E2' }
            ]}>
                <Icon 
                    name={teacherVerified ? "verified" : "error"} 
                    size={16} 
                    color={teacherVerified ? "#22C55E" : "#EF4444"} 
                />
                <Text style={[
                    styles.verificationText,
                    { color: teacherVerified ? "#166534" : "#991B1B" }
                ]}>
                    {teacherVerified ? "In Classroom" : "Not in Range"}
                </Text>
            </View>
        </View>
    );

 // AdminHomeScreen.tsx - FIXED VERSION
// Replace your renderProximityAlert function with this:

const renderProximityAlert = () => {
    // ✅ CORRECT: Check condition FIRST, before any transformations
    if (!proximityAlert) return null;
    
    // Now safely create interpolations (these are NOT hooks)
    const scale = rippleAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 2.5],
    });
    
    const opacity = rippleAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.8, 0.4, 0],
    });
    
    return (
        <TouchableOpacity 
            style={styles.proximityAlert}
            onPress={handleProximityAlertTap}
            activeOpacity={0.8}
        >
            <View style={styles.rippleContainer}>
                <Animated.View
                    style={[
                        styles.ripple,
                        {
                            transform: [{ scale }],
                            opacity,
                        },
                    ]}
                />
                <Animated.View
                    style={[
                        styles.ripple,
                        {
                            transform: [{ scale: scale.interpolate({
                                inputRange: [1, 2.5],
                                outputRange: [1, 2],
                            })}],
                            opacity: opacity.interpolate({
                                inputRange: [0, 0.8],
                                outputRange: [0, 0.4],
                            }),
                        },
                    ]}
                />
                <Icon name="sensors" size={24} color="#F59E0B" />
            </View>
            
            <View style={{flex: 1, marginLeft: 12}}>
                <Text style={styles.proximityTitle}>
                    🔥 {proximityAlert.studentsDetected} Students Detected Nearby!
                </Text>
                <Text style={styles.proximitySubtitle}>
                    Start {proximityAlert.suggestedMode} session now?
                </Text>
            </View>
            <Icon name="play-circle" size={32} color="#22C55E" />
        </TouchableOpacity>
    );
};

// ✅ That's it! Just moved the conditional return to the TOP
    const renderModeSelector = () => (
        <View style={styles.modeSelectorContainer}>
            {(['QR', 'NFC', 'SOUND'] as const).map((mode) => (
                <TouchableOpacity
                    key={mode}
                    style={[
                        styles.modeChip,
                        selectedMode === mode && {
                            backgroundColor: getModeColor(mode),
                            borderColor: getModeColor(mode)
                        }
                    ]}
                    onPress={() => {
                        setSelectedMode(mode);
                        setModeTapCount(prev => prev + 1);
                    }}
                    activeOpacity={0.7}
                >
                    <Icon
                        name={getModeIcon(mode)}
                        size={24}
                        color={selectedMode === mode ? '#FFF' : '#666'}
                    />
                    <Text style={[
                        styles.modeChipText,
                        selectedMode === mode && styles.modeChipTextActive
                    ]}>
                        {mode}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderLiveActivityStream = () => {
        if (!liveSession.isActive || liveActivityFeed.length === 0) return null;
        
        return (
            <View style={styles.activityStreamContainer}>
                <Icon name="trending-up" size={16} color="#22C55E" />
                <TextTicker
                    style={styles.activityText}
                    duration={15000}
                    loop
                    bounce={false}
                    marqueeDelay={0}
                >
                    {liveActivityFeed.join('  •  ')}
                </TextTicker>
            </View>
        );
    };

    const renderLiveSession = () => (
        <LinearGradient
            colors={getDynamicGradient()}
            start={{x: 0, y: 0}}
            end={{x: 1, y: 1}}
            style={styles.heroCard}
        >
            {liveSession.isActive ? (
                <View>
                    <View style={styles.liveHeader}>
                        <View style={styles.liveStatusBadge}>
                            <Animated.View
                                style={[
                                    styles.liveDot,
                                    { transform: [{ scale: pulseAnim }] }
                                ]}
                            />
                            <Text style={styles.liveStatusText}>LIVE SESSION</Text>
                        </View>
                        <View style={styles.modeIndicator}>
                            <Icon name={getModeIcon(liveSession.mode || 'QR')} size={18} color="#FFF" />
                            <Text style={styles.modeIndicatorText}>{liveSession.mode}</Text>
                        </View>
                    </View>

                    <Text style={styles.heroClassName}>{liveSession.className}</Text>
                    <Text style={styles.heroStartTime}>Started at {liveSession.startTime}</Text>

                    {renderLiveActivityStream()}

                    <View style={styles.attendanceDisplay}>
                        <View style={styles.attendanceCount}>
                            <Text style={styles.attendanceNumber}>{liveSession.present}</Text>
                            <Text style={styles.attendanceLabel}>Present</Text>
                        </View>
                        <View style={styles.attendanceDivider} />
                        <View style={styles.attendanceCount}>
                            <Text style={styles.attendanceNumber}>{liveSession.total}</Text>
                            <Text style={styles.attendanceLabel}>Total</Text>
                        </View>
                    </View>

                    <View style={styles.progressBarContainer}>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${liveSession.total > 0 ? (liveSession.present / liveSession.total) * 100 : 0}%`,
                                        backgroundColor: '#FFF'
                                    }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>
                            {liveSession.total > 0 ? Math.round((liveSession.present / liveSession.total) * 100) : 0}% Attendance
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.endSessionButton}
                        onPress={handleEndSession}
                    >
                        <Icon name="stop-circle" size={20} color="#FFF" />
                        <Text style={styles.endSessionText}>END SESSION</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <View style={styles.noSessionContainer}>
                    <Icon name="event-busy" size={64} color="rgba(255,255,255,0.5)" />
                    <Text style={styles.noSessionTitle}>No Active Session</Text>
                    <Text style={styles.noSessionSubtitle}>Start a new session to begin tracking attendance</Text>
                </View>
            )}
        </LinearGradient>
    );

    const renderQuickActions = () => (
        <View style={styles.quickActionsContainer}>
            <TouchableOpacity
                style={[styles.quickActionCard, styles.glassmorphic]}
                onPress={handleQuickStart}
            >
                <View style={[styles.quickActionIcon, { backgroundColor: getModeColor(selectedMode) }]}>
                    <Icon name="play-arrow" size={28} color="#FFF" />
                </View>
                <Text style={styles.quickActionTitle}>Start Class</Text>
                <Text style={styles.quickActionSubtitle}>{selectedMode} Mode</Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.quickActionCard, styles.glassmorphic]}
                onPress={() => Alert.alert("Navigate", "View Reports - Feature coming soon")}
            >
                <View style={[styles.quickActionIcon, { backgroundColor: '#059669' }]}>
                    <Icon name="assessment" size={28} color="#FFF" />
                </View>
                <Text style={styles.quickActionTitle}>Reports</Text>
                <Text style={styles.quickActionSubtitle}>Export Data</Text>
            </TouchableOpacity>
        </View>
    );

    const renderAlerts = () => {
        const hasAlerts = adminStats.flaggedStudents > 0 || adminStats.pendingP2P > 0;
        
        if (!hasAlerts) return null;

        return (
            <View style={styles.alertsContainer}>
                <Text style={styles.sectionTitle}>⚠️ Alerts & Notifications</Text>
                
                {adminStats.flaggedStudents > 0 && (
                    <TouchableOpacity
                        style={styles.alertCard}
                        onPress={() => Alert.alert("Navigate", "View Flagged Students - Feature coming soon")}
                    >
                        <View style={styles.alertIconContainer}>
                            <Icon name="flag" size={20} color="#DC2626" />
                        </View>
                        <View style={styles.alertContent}>
                            <Text style={styles.alertTitle}>{adminStats.flaggedStudents} Students Flagged</Text>
                            <Text style={styles.alertSubtitle}>Face match failed but QR scanned</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                )}

                {adminStats.pendingP2P > 0 && (
                    <TouchableOpacity
                        style={styles.alertCard}
                        onPress={() => navigation.navigate('VerificationQueueScreen')}
                    >
                        <View style={styles.alertIconContainer}>
                            <Icon name="pending-actions" size={20} color="#F59E0B" />
                        </View>
                        <View style={styles.alertContent}>
                            <Text style={styles.alertTitle}>{adminStats.pendingP2P} Pending Approvals</Text>
                            <Text style={styles.alertSubtitle}>P2P verification requests waiting</Text>
                        </View>
                        <Icon name="chevron-right" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const renderQuickStats = () => (
        <View style={styles.card}>
            <View style={styles.statsHeader}>
                <Text style={styles.sectionTitle}>📊 Quick Stats</Text>
                <TouchableOpacity
                    style={styles.aiButton}
                    onPress={() => setIsPredictionModalVisible(true)}
                >
                    <Icon name="psychology" size={16} color="#7C3AED" />
                    <Text style={styles.aiButtonText}>AI Predict</Text>
                </TouchableOpacity>
            </View>
            
            <View style={styles.statsGrid}>
                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{adminStats.weeklyAverage}%</Text>
                    <Text style={styles.statLabel}>Weekly Average</Text>
                    <View style={styles.trendIndicator}>
                        <Icon name="trending-up" size={14} color="#22C55E" />
                        <Text style={styles.trendText}>+3%</Text>
                    </View>
                </View>

                <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{adminStats.absentToday}</Text>
                    <Text style={styles.statLabel}>Absent Today</Text>
                    <TouchableOpacity style={styles.viewDetailsButton}>
                        <Text style={styles.viewDetailsText}>View</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    const renderClassBottomSheet = () => (
        <Modal
            isVisible={isClassModalVisible}
            onBackdropPress={() => setIsClassModalVisible(false)}
            onSwipeComplete={() => setIsClassModalVisible(false)}
            swipeDirection="down"
            style={styles.bottomModal}
            backdropOpacity={0.5}
            animationIn="slideInUp"
            animationOut="slideOutDown"
        >
            <View style={styles.bottomSheetContent}>
                <View style={styles.modalHandle} />
                <Text style={styles.bottomSheetTitle}>Select Today's Class</Text>
                
                {availableClasses.map((classItem) => (
                    <TouchableOpacity
                        key={classItem.id}
                        style={styles.classOption}
                        onPress={() => {
                            setIsClassModalVisible(false);
                            handleCreateSession(classItem.name);
                        }}
                    >
                        <Icon name={classItem.icon} size={24} color="#1E3A8A" />
                        <Text style={styles.classOptionText}>{classItem.name}</Text>
                        <Icon name="chevron-right" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                ))}
            </View>
        </Modal>
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
                        colors={['#1E3A8A']}
                        tintColor={'#1E3A8A'}
                    />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {renderHeader()}
                {renderProximityAlert()}
                {renderModeSelector()}
                {renderLiveSession()}
                {!liveSession.isActive && renderQuickActions()}
                {renderAlerts()}
                {renderQuickStats()}
            </ScrollView>

            {!liveSession.isActive && (
                <TouchableOpacity
                    style={[styles.fab, { backgroundColor: getModeColor(selectedMode) }]}
                    onPress={handleQuickStart}
                    activeOpacity={0.8}
                >
                    <Icon name="add" size={32} color="#FFF" />
                </TouchableOpacity>
            )}
            {renderPredictionModal()}
            {renderClassBottomSheet()}
        </>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    scrollView: { flex: 1, backgroundColor: '#f5f5f5' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
    },
    greeting: { fontSize: 28, fontWeight: 'bold', color: '#111827' },
    subtitle: { fontSize: 15, color: '#6B7280', marginTop: 4 },
    verificationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 6,
    },
    verificationText: {
        fontSize: 12,
        fontWeight: '600',
    },
    proximityAlert: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        borderWidth: 2,
        borderColor: '#FCD34D',
        borderRadius: 16,
        padding: 16,
        marginHorizontal: 20,
        marginBottom: 16,
    },
    proximityTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#92400E',
        marginBottom: 4,
    },
    proximitySubtitle: {
        fontSize: 14,
        color: '#B45309',
    },
    modeSelectorContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        gap: 12,
    },
    modeChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderRadius: 12,
        backgroundColor: '#FFF',
        borderWidth: 2,
        borderColor: '#E5E7EB',
        gap: 6,
    },
    modeChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
    },
    modeChipTextActive: {
        color: '#FFF',
    },
    heroCard: {
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    liveHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    liveStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 20,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    liveDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FFF',
        marginRight: 6,
    },
    liveStatusText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    modeIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        gap: 6,
    },
    modeIndicatorText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    activityStreamContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
        padding: 10,
        marginBottom: 16,
        gap: 8,
    },
    rippleContainer: {
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    ripple: {
        position: 'absolute',
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F59E0B',
        borderWidth: 2,
        borderColor: '#F59E0B',
    },
    activityText: {
        fontSize: 13,
        color: '#FFF',
        fontWeight: '500',
        flex: 1,
    },
    heroClassName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    heroStartTime: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 20,
    },
    attendanceDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    attendanceCount: {
        alignItems: 'center',
        flex: 1,
    },
    attendanceNumber: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FFF',
    },
    attendanceLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 4,
    },
    attendanceDivider: {
        width: 2,
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
    },
    progressBarContainer: {
        marginBottom: 20,
    },
    progressBar: {
        height: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 6,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 6,
    },
    statsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    aiButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#EDE9FE',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        gap: 4,
    },
    aiButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#7C3AED',
    },
    predictionModal: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 24,
        marginHorizontal: 20,
    },
    predictionHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    predictionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 8,
    },
    predictionContent: {
        marginBottom: 20,
    },
    predictionMainStat: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    predictionNumber: {
        fontSize: 56,
        fontWeight: 'bold',
        color: '#7C3AED',
    },
    predictionLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 8,
    },
    predictionDivider: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 20,
    },
    predictionDetails: {
        gap: 12,
    },
    predictionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    predictionDetailText: {
        fontSize: 14,
        color: '#374151',
    },
    predictionInsight: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        padding: 12,
        borderRadius: 12,
        marginTop: 16,
        gap: 8,
    },
    predictionInsightText: {
        flex: 1,
        fontSize: 13,
        color: '#92400E',
        fontWeight: '500',
    },
    predictionCloseButton: {
        backgroundColor: '#7C3AED',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    predictionCloseText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    progressText: {
        fontSize: 13,
        color: '#FFF',
        marginTop: 8,
        textAlign: 'center',
        fontWeight: '600',
    },
    endSessionButton: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 2,
        borderColor: '#FFF',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    endSessionText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    noSessionContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    noSessionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        marginTop: 16,
    },
    noSessionSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginTop: 8,
        textAlign: 'center',
    },
    quickActionsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 12,
    },
    quickActionCard: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    glassmorphic: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    quickActionIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    quickActionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 4,
    },
    quickActionSubtitle: {
        fontSize: 13,
        color: '#6B7280',
    },
    alertsContainer: {
        paddingHorizontal: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 12,
    },
    alertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    alertIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FEF2F2',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    alertContent: {
        flex: 1,
    },
    alertTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    alertSubtitle: {
        fontSize: 13,
        color: '#6B7280',
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 20,
        marginHorizontal: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#1E3A8A',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 13,
        color: '#6B7280',
        textAlign: 'center',
    },
    trendIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
        gap: 4,
    },
    trendText: {
        fontSize: 12,
        color: '#22C55E',
        fontWeight: '600',
    },
    viewDetailsButton: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: '#E0E7FF',
        borderRadius: 8,
    },
    viewDetailsText: {
        fontSize: 12,
        color: '#1E3A8A',
        fontWeight: '600',
    },
    bottomModal: {
        justifyContent: 'flex-end',
        margin: 0,
    },
    bottomSheetContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 32,
        minHeight: 300,
    },
    modalHandle: {
        width: 40,
        height: 5,
        backgroundColor: '#D1D5DB',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 20,
    },
    bottomSheetTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: 20,
    },
    classOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        gap: 12,
    },
    classOptionText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 20,
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});

export default AdminHomeScreen;