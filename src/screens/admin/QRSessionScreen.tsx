import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    ScrollView,
    Alert,
    Linking,
    ActivityIndicator,
    Animated
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import LinearGradient from 'react-native-linear-gradient';

type QRSessionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'QRSessionScreen'>;
type QRSessionScreenRouteProp = RouteProp<RootStackParamList, 'QRSessionScreen'>;

interface QRSessionScreenProps {
    navigation: QRSessionScreenNavigationProp;
    route: QRSessionScreenRouteProp;
}

interface RecentActivity {
    id: string;
    studentName: string;
    timestamp: Date;
    method: string;
    status: string;
}

const QRSessionScreen: React.FC<QRSessionScreenProps> = ({ navigation, route }) => {
    const { sessionId, className, totalStudents } = route.params;
    const [bleWave1] = useState(new Animated.Value(0));
    const [bleWave2] = useState(new Animated.Value(0));
    const [presentCount, setPresentCount] = useState(0);
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [bleNearby, setBleNearby] = useState(12);
    const [isLoading, setIsLoading] = useState(true);
    const [pulseAnim] = useState(new Animated.Value(1));
    const [sessionStatus, setSessionStatus] = useState<'active' | 'ended'>('active');

    // ✅ BLE Wave Animation
    useEffect(() => {
        const animateWave = (animValue: Animated.Value, delay: number) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(delay),
                    Animated.timing(animValue, {
                        toValue: 1,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(animValue, {
                        toValue: 0,
                        duration: 1000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        };

        animateWave(bleWave1, 0);
        animateWave(bleWave2, 300);
    }, []);

    // ✅ Pulse animation for live indicator
    useEffect(() => {
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
    }, []);

    // ✅ CRITICAL: Listen to session updates (detects website close too!)
    useEffect(() => {
        console.log('✅ [QRSession] Setting up session listener for:', sessionId);
        
        const unsubscribe = firestore()
            .collection('attendance_sessions')
            .doc(sessionId)
            .onSnapshot(
                (doc) => {
                    if (!doc.exists) {
                        console.log('❌ [QRSession] Session document deleted!');
                        handleSessionEnded('deleted');
                        return;
                    }

                    const data = doc.data();
                    console.log('📡 [QRSession] Session status:', data?.status);
                    
                    setPresentCount(data?.presentCount || 0);
                    setSessionStatus(data?.status || 'active');
                    setIsLoading(false);

                    // ✅ Check if session ended (from website or app)
                    if (data?.status === 'ended') {
                        console.log('🛑 [QRSession] Session ended detected!');
                        handleSessionEnded('ended');
                    }
                },
                (error) => {
                    console.error('❌ [QRSession] Error listening to session:', error);
                    setIsLoading(false);
                    Alert.alert(
                        'Connection Error',
                        'Lost connection to session. Returning to Home.',
                        [{ text: 'OK', onPress: () => navigateToHome() }]
                    );
                }
            );

        return () => {
            console.log('🔌 [QRSession] Unsubscribing from session listener');
            unsubscribe();
        };
    }, [sessionId]);

    // ✅ Listen to recent attendance logs
    useEffect(() => {
        const unsubscribe = firestore()
            .collection('attendance_logs')
            .where('sessionId', '==', sessionId)
            .orderBy('timestamp', 'desc')
            .limit(5)
            .onSnapshot(
                (snapshot) => {
                    const activities: RecentActivity[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        activities.push({
                            id: doc.id,
                            studentName: data.studentName || data.email || 'Unknown',
                            timestamp: data.timestamp?.toDate() || new Date(),
                            method: data.method || 'QR',
                            status: data.status || 'present'
                        });
                    });
                    setRecentActivity(activities);
                },
                (error) => {
                    console.error('[QRSession] Error listening to logs:', error);
                }
            );

        return () => unsubscribe();
    }, [sessionId]);

    // ✅ Simulate BLE nearby count
    useEffect(() => {
        const interval = setInterval(() => {
            setBleNearby(prev => Math.max(presentCount, Math.min(totalStudents, prev + (Math.random() > 0.5 ? 1 : -1))));
        }, 3000);

        return () => clearInterval(interval);
    }, [presentCount, totalStudents]);

    // ✅ Handle session ended (from website or app)
    const handleSessionEnded = (reason: 'ended' | 'deleted') => {
        const message = reason === 'deleted' 
            ? 'Session was deleted.' 
            : 'Session has been closed.';

        Alert.alert(
            'Session Ended',
            `${message}\n\nReturning to Home screen.`,
            [
                {
                    text: 'OK',
                    onPress: () => navigateToHome()
                }
            ],
            { cancelable: false }
        );
    };

    // ✅ Navigate to Home (clears navigation stack)
    const navigateToHome = () => {
        // Reset to Home screen (clears entire stack)
        navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
        });
    };

    // ✅ Handle manual end session (from app)
    const handleEndSession = () => {
        Alert.alert(
            'End Session',
            'Are you sure you want to end this session?\n\nAll data will be saved.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'End Session',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            console.log('🛑 [QRSession] Ending session manually...');
                            
                            await firestore()
                                .collection('attendance_sessions')
                                .doc(sessionId)
                                .update({
                                    status: 'ended',
                                    endTime: new Date().toLocaleTimeString('en-US', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    }),
                                    endDate: new Date().toISOString().split('T')[0],
                                });

                            console.log('✅ [QRSession] Session ended successfully!');
                            
                            // Don't show alert here, the listener will handle it
                            // This prevents double alerts
                            
                        } catch (error) {
                            console.error('❌ [QRSession] Error ending session:', error);
                            Alert.alert('Error', 'Could not end session. Please try again.');
                        }
                    }
                }
            ]
        );
    };

    // ✅ Open website dashboard
    const openWebDashboard = () => {
        const url = `https://smartattend.com/live/${sessionId}`; // Replace with your actual URL
        Linking.openURL(url).catch(() => {
            Alert.alert('Error', 'Could not open browser');
        });
    };

    const getActivityIcon = (method: string) => {
        switch (method.toLowerCase()) {
            case 'qr': return 'qr-code-2';
            case 'ble': return 'bluetooth';
            case 'face': return 'face';
            default: return 'check-circle';
        }
    };

    const getTimeAgo = (timestamp: Date) => {
        const seconds = Math.floor((new Date().getTime() - timestamp.getTime()) / 1000);
        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        return timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />
                <ActivityIndicator size="large" color="#FFF" />
                <Text style={styles.loadingText}>Loading session...</Text>
            </View>
        );
    }

    const attendancePercent = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#3B82F6" />
            <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.container}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigateToHome()} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>QR Session</Text>
                        <View style={styles.liveIndicator}>
                            <Animated.View
                                style={[
                                    styles.liveDot,
                                    { transform: [{ scale: pulseAnim }] }
                                ]}
                            />
                            <Text style={styles.liveText}>LIVE</Text>
                        </View>
                    </View>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Class Info Card */}
                    <View style={styles.classCard}>
                        <Icon name="school" size={32} color="#3B82F6" />
                        <Text style={styles.className}>{className}</Text>
                        <Text style={styles.classSubtitle}>Students can scan QR on website</Text>
                    </View>

                    {/* Stats Grid */}
                    <View style={styles.statsGrid}>
                        {/* Present Count */}
                        <View style={styles.statCard}>
                            <View style={styles.statIconContainer}>
                                <Icon name="people" size={28} color="#3B82F6" />
                            </View>
                            <Text style={styles.statNumber}>
                                {presentCount}<Text style={styles.statTotal}>/{totalStudents}</Text>
                            </Text>
                            <Text style={styles.statLabel}>Present</Text>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${attendancePercent}%` }
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>{attendancePercent}%</Text>
                        </View>

                        {/* BLE Nearby */}
                        <View style={styles.statCard}>
                            <View style={styles.statIconContainer}>
                                <Icon name="bluetooth-searching" size={28} color="#10B981" />
                            </View>
                            <Text style={styles.statNumber}>{bleNearby}</Text>
                            <Text style={styles.statLabel}>Nearby Devices</Text>
                            <View style={styles.bleIndicator}>
                                <Animated.View style={[styles.bleWave, { opacity: bleWave1 }]} />
                                <Animated.View style={[styles.bleWave, { opacity: bleWave2 }]} />
                                <Text style={styles.bleText}>Scanning...</Text>
                            </View>
                        </View>
                    </View>

                    {/* Recent Activity */}
                    <View style={styles.activitySection}>
                        <View style={styles.activityHeader}>
                            <Icon name="history" size={20} color="#FFF" />
                            <Text style={styles.activityTitle}>Recent Activity</Text>
                        </View>

                        {recentActivity.length === 0 ? (
                            <View style={styles.emptyActivity}>
                                <Icon name="pending-actions" size={48} color="rgba(255,255,255,0.3)" />
                                <Text style={styles.emptyActivityText}>
                                    Waiting for students to mark attendance
                                </Text>
                            </View>
                        ) : (
                            recentActivity.map((activity, index) => (
                                <View key={activity.id || index} style={styles.activityItem}>
                                    <View style={styles.activityIcon}>
                                        <Icon name={getActivityIcon(activity.method)} size={16} color="#3B82F6" />
                                    </View>
                                    <View style={styles.activityContent}>
                                        <Text style={styles.activityName}>
                                            {activity.studentName}
                                        </Text>
                                        <Text style={styles.activityTime}>
                                            {getTimeAgo(activity.timestamp)} • {activity.method}
                                        </Text>
                                    </View>
                                    <Icon name="check-circle" size={20} color="#10B981" />
                                </View>
                            ))
                        )}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionSection}>
                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={openWebDashboard}
                            activeOpacity={0.8}
                        >
                            <Icon name="dashboard" size={20} color="#FFF" />
                            <Text style={styles.primaryButtonText}>View Full Dashboard</Text>
                            <Icon name="open-in-new" size={18} color="#FFF" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.endButton}
                            onPress={handleEndSession}
                            activeOpacity={0.8}
                        >
                            <Icon name="stop-circle" size={20} color="#FFF" />
                            <Text style={styles.endButtonText}>End Session</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Info Banner */}
                    <View style={styles.infoBanner}>
                        <Icon name="info-outline" size={18} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.infoText}>
                            Display QR code on your laptop/projector for students to scan. Session syncs with website in real-time.
                        </Text>
                    </View>
                </ScrollView>
            </LinearGradient>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: '#3B82F6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#FFF',
        fontSize: 16,
        marginTop: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    backButton: {
        padding: 4,
    },
    headerCenter: {
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 4,
    },
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    liveDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#FFF',
        marginRight: 6,
    },
    liveText: {
        color: '#FFF',
        fontSize: 11,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    classCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    className: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
        marginTop: 12,
        marginBottom: 4,
    },
    classSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statNumber: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#111827',
    },
    statTotal: {
        fontSize: 20,
        color: '#9CA3AF',
    },
    statLabel: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 4,
        marginBottom: 12,
    },
    progressBar: {
        width: '100%',
        height: 6,
        backgroundColor: '#E5E7EB',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#3B82F6',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 12,
        color: '#3B82F6',
        fontWeight: '600',
    },
    bleIndicator: {
        alignItems: 'center',
        marginTop: 8,
    },
    bleWave: {
        width: 30,
        height: 2,
        backgroundColor: '#10B981',
        marginBottom: 2,
    },
    bleText: {
        fontSize: 11,
        color: '#10B981',
        fontWeight: '600',
        marginTop: 4,
    },
    activitySection: {
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    activityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    activityTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
        marginLeft: 8,
    },
    emptyActivity: {
        alignItems: 'center',
        paddingVertical: 32,
    },
    emptyActivityText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 12,
        textAlign: 'center',
    },
    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 8,
    },
    activityIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EEF2FF',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    activityContent: {
        flex: 1,
    },
    activityName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
    },
    activityTime: {
        fontSize: 12,
        color: '#6B7280',
    },
    actionSection: {
        gap: 12,
        marginBottom: 20,
    },
    primaryButton: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 2,
        borderColor: '#FFF',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    primaryButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    endButton: {
        flexDirection: 'row',
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    endButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    infoBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        padding: 12,
        gap: 8,
    },
    infoText: {
        flex: 1,
        fontSize: 13,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 18,
    },
});

export default QRSessionScreen;