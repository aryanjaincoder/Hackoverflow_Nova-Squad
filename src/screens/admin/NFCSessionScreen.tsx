import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, Animated, ScrollView } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { RootStackParamList } from '../../navigation/AppNavigator';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';

type NFCSessionScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'NFCSessionScreen'>;
type NFCSessionScreenRouteProp = RouteProp<RootStackParamList, 'NFCSessionScreen'>;

interface NFCSessionScreenProps {
    navigation: NFCSessionScreenNavigationProp;
    route: NFCSessionScreenRouteProp;
}

interface Student {
    id: string;
    name: string;
    timestamp: any;
    method: string;
    cardUID?: string;
}

const NFCSessionScreen: React.FC<NFCSessionScreenProps> = ({ navigation, route }) => {
    const { sessionId, className } = route.params;
    const [presentCount, setPresentCount] = useState(0);
    const [lastStudent, setLastStudent] = useState<Student | null>(null);
    const [recentStudents, setRecentStudents] = useState<Student[]>([]);
    
    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(-50)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('attendance_sessions')
            .doc(sessionId)
            .onSnapshot((doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    const count = data?.presentCount || 0;
                    const students = data?.presentStudents || [];
                    
                    setPresentCount(count);
                    
                    // Get last 5 students (most recent first)
                    const sortedStudents = [...students].sort((a, b) => {
                        const timeA = a.timestamp?.seconds || 0;
                        const timeB = b.timestamp?.seconds || 0;
                        return timeB - timeA;
                    });
                    
                    setRecentStudents(sortedStudents.slice(0, 5));
                    
                    // Detect new student
                    if (sortedStudents.length > 0) {
                        const newest = sortedStudents[0];
                        
                        // Check if this is a new student (different from last one)
                        if (!lastStudent || lastStudent.id !== newest.id) {
                            setLastStudent(newest);
                            triggerSuccessAnimation();
                        }
                    }
                }
            });
        
        return () => unsubscribe();
    }, [sessionId, lastStudent]);

    const triggerSuccessAnimation = () => {
        // Reset animations
        fadeAnim.setValue(0);
        slideAnim.setValue(-50);
        pulseAnim.setValue(1);

        // Fade in and slide up
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
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
            ]),
        ]).start();
    };

    const handleEndSession = async () => {
        await firestore()
            .collection('attendance_sessions')
            .doc(sessionId)
            .update({ status: 'ended' });
        
        navigation.navigate('Home');
    };

    const formatTime = (timestamp: any) => {
        if (!timestamp || !timestamp.seconds) return 'Just now';
        
        const now = Date.now();
        const then = timestamp.seconds * 1000;
        const diffSeconds = Math.floor((now - then) / 1000);
        
        if (diffSeconds < 10) return 'Just now';
        if (diffSeconds < 60) return `${diffSeconds}s ago`;
        if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
        
        const date = new Date(then);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#10B981" />
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Icon name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>NFC Session Active</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.content}>
                    <Icon name="nfc" size={100} color="#FFF" />
                    <Text style={styles.className}>{className}</Text>
                    
                    <Animated.View 
                        style={[
                            styles.statsBox,
                            { transform: [{ scale: pulseAnim }] }
                        ]}
                    >
                        <Text style={styles.statNumber}>{presentCount}</Text>
                        <Text style={styles.statLabel}>Students Marked Present</Text>
                    </Animated.View>

                    {/* Last Student Banner */}
                    {lastStudent && (
                        <Animated.View 
                            style={[
                                styles.lastStudentBanner,
                                {
                                    opacity: fadeAnim,
                                    transform: [{ translateY: slideAnim }]
                                }
                            ]}
                        >
                            <Icon name="check-circle" size={24} color="#10B981" />
                            <View style={styles.lastStudentInfo}>
                                <Text style={styles.lastStudentLabel}>Last Marked:</Text>
                                <Text style={styles.lastStudentName}>{lastStudent.name}</Text>
                                <Text style={styles.lastStudentTime}>{formatTime(lastStudent.timestamp)}</Text>
                            </View>
                        </Animated.View>
                    )}

                    {/* Recent Students List */}
                    {recentStudents.length > 0 && (
                        <View style={styles.recentSection}>
                            <Text style={styles.recentTitle}>Recent Attendance 📋</Text>
                            <ScrollView 
                                style={styles.recentList}
                                showsVerticalScrollIndicator={false}
                            >
                                {recentStudents.map((student, index) => (
                                    <View 
                                        key={student.id + index} 
                                        style={[
                                            styles.recentItem,
                                            index === 0 && styles.recentItemFirst
                                        ]}
                                    >
                                        <View style={styles.recentItemLeft}>
                                            <View style={styles.recentAvatar}>
                                                <Text style={styles.recentAvatarText}>
                                                    {student.name.charAt(0).toUpperCase()}
                                                </Text>
                                            </View>
                                            <View>
                                                <Text style={styles.recentName}>{student.name}</Text>
                                                <Text style={styles.recentTime}>
                                                    {formatTime(student.timestamp)}
                                                </Text>
                                            </View>
                                        </View>
                                        <Icon 
                                            name="nfc" 
                                            size={20} 
                                            color={index === 0 ? "#10B981" : "rgba(255,255,255,0.5)"} 
                                        />
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <Text style={styles.instruction}>
                        Ask students to tap their phones on your device
                    </Text>

                    <TouchableOpacity 
                        style={styles.endButton}
                        onPress={handleEndSession}
                    >
                        <Icon name="stop-circle" size={20} color="#FFF" />
                        <Text style={styles.endButtonText}>END SESSION</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#10B981' },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    className: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF',
        marginTop: 20,
        marginBottom: 30,
    },
    statsBox: {
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 16,
        padding: 30,
        marginBottom: 20,
    },
    statNumber: { fontSize: 48, fontWeight: 'bold', color: '#FFF' },
    statLabel: { fontSize: 14, color: '#FFF', marginTop: 8, opacity: 0.9 },
    
    // Last Student Banner
    lastStudentBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        gap: 12,
    },
    lastStudentInfo: {
        flex: 1,
    },
    lastStudentLabel: {
        fontSize: 12,
        color: '#059669',
        fontWeight: '600',
        marginBottom: 2,
    },
    lastStudentName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 2,
    },
    lastStudentTime: {
        fontSize: 12,
        color: '#6B7280',
    },

    // Recent Students List
    recentSection: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        maxHeight: 200,
    },
    recentTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFF',
        marginBottom: 12,
    },
    recentList: {
        maxHeight: 150,
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    recentItemFirst: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderRadius: 8,
        paddingHorizontal: 8,
        marginBottom: 4,
    },
    recentItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    recentAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    recentAvatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
    recentName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF',
    },
    recentTime: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },

    instruction: {
        fontSize: 14,
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 30,
        opacity: 0.9,
    },
    endButton: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 2,
        borderColor: '#FFF',
        paddingVertical: 14,
        paddingHorizontal: 32,
        borderRadius: 12,
        alignItems: 'center',
        gap: 8,
    },
    endButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default NFCSessionScreen;