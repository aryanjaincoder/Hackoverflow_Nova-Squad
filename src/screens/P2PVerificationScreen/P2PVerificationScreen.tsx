import React, { useState, useEffect, useRef, useMemo ,useCallback} from 'react';
import {
    View,
    Text,
    StyleSheet,
    StatusBar,
    Animated,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    Easing,
    Dimensions,
    
    Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { RootStackParamList } from '../../navigation/AppNavigator'; // Path check kar lena

// --- Types ---
type P2PScreenRouteProp = RouteProp<RootStackParamList, 'P2PVerificationScreen'>;
type P2PNavigationProp = NativeStackNavigationProp<RootStackParamList>;
type VerificationStatus = 'present' | 'absent' | null;

// --- Sonar Animation Config ---
const { width } = Dimensions.get('window');
const PING_SIZE = width * 0.6;

// --- Mock Peer Data ---
interface Peer {
    id: string;
    name: string;
    seat: string;
    avatarUrl: string; // Avatar ke liye
}
const MOCK_PEERS: Peer[] = [
    { id: '1', name: 'Priya Sharma', seat: '2C', avatarUrl: 'https://i.pravatar.cc/150?img=26' },
    { id: '2', name: 'Rohan Verma', seat: '3A', avatarUrl: 'https://i.pravatar.cc/150?img=11' },
    { id: '3', name: 'Anjali Singh', seat: '1B', avatarUrl: 'https://i.pravatar.cc/150?img=32' },
    { id: '4', name: 'Amit Kumar', seat: '2D', avatarUrl: 'https://i.pravatar.cc/150?img=14' },
    { id: '5', name: 'Sneha Patil', seat: '4A', avatarUrl: 'https://i.pravatar.cc/150?img=31' },
];

// --- SonarPing Component (Aapke BLECheckScreen se) ---
const SonarPing: React.FC<{ delay: number }> = ({ delay }) => {
    const pulseAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.parallel([
                    Animated.timing(pulseAnim, { toValue: 1, duration: 2000, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
                ]),
                Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [pulseAnim, delay]);

    const scale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
    const opacity = pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.5, 0] });

    return <Animated.View style={[styles.ping, { transform: [{ scale }], opacity }]} />;
};


// --- UPDATE: Peer Card ko alag component banaya ---
interface PeerCardProps {
    peer: Peer;
    status: VerificationStatus;
    onMark: (status: 'present' | 'absent') => void;
}

const PeerCard: React.FC<PeerCardProps> = ({ peer, status, onMark }) => {
    const cardAnim = useRef(new Animated.Value(0)).current;
    const buttonFadeAnim = useRef(new Animated.Value(1)).current;

    const cardColor = cardAnim.interpolate({
        inputRange: [-1, 0, 1], // -1 for absent, 0 for null, 1 for present
        outputRange: ['#FFF0F0', '#FFFFFF', '#F0FFF0'] // Red, White, Green
    });

    const borderColor = cardAnim.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: ['#FFBDBD', '#E5E7EB', '#B0E9C0']
    });

    useEffect(() => {
        let toValue = 0;
        if (status === 'present') toValue = 1;
        if (status === 'absent') toValue = -1;

        Animated.timing(cardAnim, {
            toValue,
            duration: 300,
            useNativeDriver: false // backgroundColor/borderColor animate karne ke liye
        }).start();

        if (status !== null) {
            Animated.timing(buttonFadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true
            }).start();
        }
    }, [status, cardAnim, buttonFadeAnim]);

    return (
        <Animated.View style={[
            styles.peerCard,
            { backgroundColor: cardColor, borderColor: borderColor }
        ]}>
            <Icon name="account-circle" size={40} color="#007AFF" />
            <View style={styles.peerInfo}>
                <Text style={styles.peerName}>{peer.name}</Text>
                <Text style={styles.peerDetail}>Seat: {peer.seat}</Text>
            </View>

            {status === null ? (
                // Buttons
                <Animated.View style={[styles.actionButtons, { opacity: buttonFadeAnim }]}>
                    <TouchableOpacity style={[styles.iconButton, styles.absentButton]} onPress={() => onMark('absent')}>
                        <Icon name="close" size={24} color="#E74C3C" />
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.iconButton, styles.presentButton]} onPress={() => onMark('present')}>
                        <Icon name="check" size={24} color="#2ECC71" />
                    </TouchableOpacity>
                </Animated.View>
            ) : (
                // Status Badge
                <View style={[styles.statusBadge, status === 'present' ? styles.statusBadgePresent : styles.statusBadgeAbsent]}>
                    <Text style={styles.statusBadgeText}>{status === 'present' ? 'Present' : 'Absent'}</Text>
                </View>
            )}
        </Animated.View>
    );
};


// --- Main Screen ---
const P2PVerificationScreen: React.FC = () => {
    const navigation = useNavigation<P2PNavigationProp>();
    const route = useRoute<P2PScreenRouteProp>();
    const { sessionId, seatId } = route.params;

    // --- State Management ---
    const [status, setStatus] = useState<'scanning' | 'verifying' | 'complete'>('scanning');
    
    // Naya state verification ka status track karne ke liye
    const [verificationStatus, setVerificationStatus] = useState<Record<string, VerificationStatus>>(
        MOCK_PEERS.reduce((acc, peer) => ({ ...acc, [peer.id]: null }), {})
    );

    // Derived state: Kitne verify ho gaye?
    const verifiedCount = useMemo(() => {
        return Object.values(verificationStatus).filter(s => s !== null).length;
    }, [verificationStatus]);

    const allVerified = useMemo(() => {
        return verifiedCount === MOCK_PEERS.length;
    }, [verifiedCount]);

    // Animations
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const checkAnim = useRef(new Animated.Value(0)).current;

    // --- Simulation Effects ---
    useEffect(() => {
        let timer: ReturnType<typeof setTimeout>;

        if (status === 'scanning') {
            timer = setTimeout(() => {
                setStatus('verifying'); // List dikhane waali state
            }, 2500);
        } else if (status === 'verifying') {
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
        } else if (status === 'complete') {
            Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
            Animated.spring(checkAnim, { toValue: 1, friction: 4, useNativeDriver: true }).start();
            timer = setTimeout(() => {
                navigation.replace('SuccessScreen', { sessionId });
            }, 2000);
        }

        return () => clearTimeout(timer);
    }, [status, navigation, sessionId, fadeAnim, checkAnim]);

    // --- Handlers ---
    const handleMarkStatus = useCallback((peerId: string, mark: 'present' | 'absent') => {
        setVerificationStatus(prev => ({
            ...prev,
            [peerId]: mark
        }));
    }, []);

    const handleSubmit = () => {
        if (!allVerified) return; // Dobara check
        // TODO: Yahaan aap poora 'verificationStatus' object Firestore par bhej sakte hain
        console.log("Submitting Verifications:", verificationStatus);
        setStatus('complete');
    };

    // --- Render Functions ---

    const renderHeader = () => (
        <View style={styles.header}>
            <Text style={styles.title}>Peer-to-Peer Verification</Text>
            <Text style={styles.subtitle}>
                {`Your Seat: ${seatId} | Session: ${sessionId.substring(0, 6)}...`}
            </Text>
        </View>
    );

    const renderContent = () => {
        switch (status) {
            case 'scanning':
                return (
                    <View style={styles.statusContainer}>
                        <View style={styles.scannerContainer}>
                            <SonarPing delay={0} />
                            <SonarPing delay={500} />
                            <SonarPing delay={1000} />
                            <View style={styles.iconCircle}>
                                <Icon name="people" size={width * 0.12} color="#007AFF" />
                            </View>
                        </View>
                        <Text style={styles.statusText}>Scanning for nearby peers...</Text>
                    </View>
                );

            case 'verifying':
                return (
                    <Animated.View style={{ opacity: fadeAnim, flex: 1, width: '100%' }}>
                        {/* --- UPDATE: Progress Bar --- */}
                        <Text style={styles.listHeader}>Verify Peers Around You</Text>
                        <View style={styles.progressContainer}>
                            <Animated.View 
                                style={[
                                    styles.progressBar, 
                                    { width: `${(verifiedCount / MOCK_PEERS.length) * 100}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.listSubHeader}>{verifiedCount} / {MOCK_PEERS.length} Verified</Text>
                        {/* --- UPDATE END --- */}

                        <FlatList
                            data={MOCK_PEERS}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <PeerCard 
                                    peer={item}
                                    status={verificationStatus[item.id]}
                                    onMark={(mark) => handleMarkStatus(item.id, mark)}
                                />
                            )}
                            contentContainerStyle={{ paddingBottom: 100 }} // Button ke liye space
                        />
                    </Animated.View>
                );

            case 'complete':
                return (
                    <View style={styles.statusContainer}>
                        <Animated.View style={{ transform: [{ scale: checkAnim }] }}>
                            <Icon name="check-circle" size={80} color="#2ECC71" />
                        </Animated.View>
                        <Text style={styles.statusText}>Verification Submitted!</Text>
                        <Text style={styles.statusSubText}>Your attendance has been marked.</Text>
                    </View>
                );
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={styles.container.backgroundColor} />
            {renderHeader()}
            <View style={styles.contentBody}>{renderContent()}</View>
            
            {/* Submit Button (Sirf 'verifying' state mein dikhega) */}
            {status === 'verifying' && (
                <View style={styles.footer}>
                    <TouchableOpacity 
                        style={[styles.submitButton, !allVerified && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={!allVerified}
                    >
                        <Text style={styles.submitButtonText}>Submit Verification</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F7F9FC',
        paddingTop: 50,
    },
    header: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    title: { fontSize: 28, fontWeight: '700', color: '#333' },
    subtitle: { fontSize: 16, color: '#666', marginTop: 4 },
    contentBody: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    statusContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    statusText: { fontSize: 20, fontWeight: '600', color: '#333', marginTop: 20, textAlign: 'center' },
    statusSubText: { fontSize: 16, color: '#555', marginTop: 8 },
    listHeader: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 4 },
    listSubHeader: { fontSize: 14, color: '#666', marginBottom: 16, textAlign: 'center' },
    
    // --- UPDATE: Progress Bar Styles ---
    progressContainer: {
        height: 8,
        width: '100%',
        backgroundColor: '#E5E7EB',
        borderRadius: 4,
        marginBottom: 8,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 4,
    },
    // --- UPDATE END ---

    peerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 2, // Border width badhaya
        borderColor: '#E5E7EB',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 3,
    },
    peerInfo: { flex: 1, marginLeft: 12 },
    peerName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    peerDetail: { fontSize: 14, color: '#666', marginTop: 2 },
    
    // --- UPDATE: Action Button Styles ---
    actionButtons: {
        flexDirection: 'row',
    },
    iconButton: {
        padding: 8,
        borderRadius: 30,
        marginHorizontal: 4,
    },
    absentButton: {
        backgroundColor: '#FFF0F0'
    },
    presentButton: {
        backgroundColor: '#F0FFF0'
    },
    statusBadge: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 20,
    },
    statusBadgePresent: {
        backgroundColor: 'rgba(46, 204, 113, 0.2)',
    },
    statusBadgeAbsent: {
        backgroundColor: 'rgba(231, 76, 60, 0.2)',
    },
    statusBadgeText: {
        fontSize: 14,
        fontWeight: '600',
    },
    // --- UPDATE END ---
    
    scannerContainer: {
        width: PING_SIZE,
        height: PING_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    ping: {
        width: PING_SIZE,
        height: PING_SIZE,
        borderRadius: PING_SIZE / 2,
        borderWidth: 2,
        borderColor: 'rgba(0, 122, 255, 0.5)',
        position: 'absolute',
    },
    iconCircle: {
        width: width * 0.25,
        height: width * 0.25,
        borderRadius: (width * 0.25) / 2,
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },

    // --- UPDATE: Footer Button Styles ---
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: '#F7F9FC', // Container se match
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB'
    },
    submitButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#007AFF',
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    submitButtonDisabled: {
        backgroundColor: '#B0C4DE', // Faded blue
        elevation: 0,
    },
    submitButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    // --- UPDATE END ---
});

export default P2PVerificationScreen;