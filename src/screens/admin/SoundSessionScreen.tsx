import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar, FlatList, Animated, Alert } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialIcons';
import firestore from '@react-native-firebase/firestore';
import { WebView } from 'react-native-webview';

const SoundSessionScreen: React.FC<any> = ({ navigation, route }) => {
    const { sessionId, className } = route.params;
    const [presentCount, setPresentCount] = useState(0);
    const [students, setStudents] = useState<any[]>([]);
    const [isAudioActive, setIsAudioActive] = useState(false);
    
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        const unsubscribe = firestore()
            .collection('attendance_sessions')
            .doc(sessionId)
            .onSnapshot((doc) => {
                if (doc.exists()) {
                    const data = doc.data();
                    setStudents([...(data?.presentStudents || [])].reverse());
                    setPresentCount(data?.presentCount || 0);
                }
            });

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.15, duration: 800, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        ).start();
        
        return () => unsubscribe();
    }, [sessionId]);

    const handleEndSession = async () => {
        Alert.alert("End Session?", "Stop broadcast and close attendance?", [
            { text: "Cancel", style: "cancel" },
            { 
                text: "End Now", 
                onPress: async () => {
                    await firestore().collection('attendance_sessions').doc(sessionId).update({ 
                        status: 'ended',
                        endTime: firestore.FieldValue.serverTimestamp() 
                    });
                    navigation.navigate('Home');
                }
            }
        ]);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#7C3AED" />
            
            {/* 🔊 WebView - OPTIMIZED 15kHz (Better Phone Support) */}
            <WebView
                style={{ 
                    position: 'absolute', 
                    top: 0, left: 0, right: 0, bottom: 0, 
                    backgroundColor: 'transparent',
                    zIndex: isAudioActive ? -1 : 1000
                }}
                originWhitelist={['*']}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false} 
                source={{ html: `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
                    </head>
                    <body style="background:transparent; height:100vh; width:100vw; display:flex; flex-direction:column; justify-content:center; align-items:center; margin:0; overflow:hidden;">
                        <div id="tapArea" style="width:100%; height:100%; display:flex; flex-direction:column; justify-content:center; align-items:center; color:white; font-family:sans-serif; text-align:center; background:rgba(0,0,0,0.6);">
                            <div style="font-size: 80px; margin-bottom:20px;">🔊</div>
                            <div style="font-size: 24px; font-weight:bold; margin-top:10px;">TAP TO ACTIVATE</div>
                            <div style="font-size: 16px; opacity:0.9; margin-top:15px;">15kHz High-Frequency Broadcast</div>
                            <div style="font-size: 13px; opacity:0.7; margin-top:10px;">⚠️ Turn volume to MAXIMUM</div>
                            <div id="status" style="font-size: 12px; opacity:0.5; margin-top:20px; padding:10px 20px; background:rgba(255,255,255,0.1); border-radius:8px;">Ready to broadcast</div>
                        </div>
                        <script>
                            const AudioContext = window.AudioContext || window.webkitAudioContext;
                            let audioCtx;
                            let oscillator;
                            let gainNode;
                            let isPlaying = false;

                            function updateStatus(msg) {
                                const el = document.getElementById('status');
                                if (el) el.textContent = msg;
                            }

                            function startAudio() {
                                if (isPlaying) {
                                    updateStatus('Already broadcasting...');
                                    return;
                                }
                                
                                try {
                                    updateStatus('Initializing audio...');
                                    
                                    // ✅ Create AudioContext with optimal settings
                                    audioCtx = new AudioContext({
                                        sampleRate: 48000 // Higher sample rate for better high-freq support
                                    });
                                    
                                    oscillator = audioCtx.createOscillator();
                                    gainNode = audioCtx.createGain();

                                    // ✅ 15kHz - OPTIMIZED for phone speakers (better than 18kHz)
                                    // Most phones can handle 14-16kHz range well
                                    oscillator.type = 'sine';
                                    oscillator.frequency.setValueAtTime(15000, audioCtx.currentTime);
                                    
                                    // ✅ MAXIMUM GAIN - Push signal strength to max
                                    gainNode.gain.setValueAtTime(1.0, audioCtx.currentTime);
                                    
                                    // Connect the chain
                                    oscillator.connect(gainNode);
                                    gainNode.connect(audioCtx.destination);
                                    
                                    // Start oscillator
                                    oscillator.start(0);
                                    
                                    isPlaying = true;
                                    updateStatus('🟢 Broadcasting at 15kHz');
                                    
                                    // Hide tap area after 1 second
                                    setTimeout(() => {
                                        document.getElementById('tapArea').style.display = 'none';
                                        window.ReactNativeWebView.postMessage("STARTED");
                                    }, 1000);
                                    
                                    // Keep AudioContext alive
                                    setInterval(() => {
                                        if (audioCtx.state === 'suspended') {
                                            audioCtx.resume();
                                            updateStatus('🟡 Resuming audio...');
                                        }
                                    }, 1000);
                                    
                                } catch (e) {
                                    updateStatus('❌ Error: ' + e.message);
                                    alert("Audio Error: " + e.message);
                                }
                            }

                            // Multiple event listeners for better compatibility
                            document.addEventListener('click', startAudio);
                            document.addEventListener('touchstart', startAudio);
                            document.addEventListener('touchend', startAudio);
                            
                            // Log audio context state
                            setInterval(() => {
                                if (audioCtx) {
                                    console.log('AudioContext state:', audioCtx.state);
                                }
                            }, 2000);
                        </script>
                    </body>
                    </html>
                ` }}
                onMessage={(event) => {
                    if (event.nativeEvent.data === "STARTED") {
                        setIsAudioActive(true);
                    }
                }}
                onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.warn('WebView error:', nativeEvent);
                }}
                onLoadEnd={() => console.log('WebView loaded')}
            />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Icon name="arrow-back" size={28} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>High-Frequency Protocol</Text>
                <View style={{ width: 28 }} />
            </View>

            <View style={styles.topSection}>
                <View style={styles.visualizerContainer}>
                    {[1, 2, 3].map((i) => (
                        <Animated.View 
                            key={i}
                            style={[styles.wave, {
                                transform: [{ scale: pulseAnim }],
                                opacity: pulseAnim.interpolate({
                                    inputRange: [1, 1.15],
                                    outputRange: [0.3, 0]
                                })
                            }]} 
                        />
                    ))}
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                        <View style={styles.iconCircle}>
                            <Icon name={isAudioActive ? "graphic-eq" : "settings-input-antenna"} size={70} color="#FFF" />
                        </View>
                    </Animated.View>
                </View>

                <Text style={styles.className}>{className}</Text>
                
                <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{presentCount}</Text>
                        <Text style={styles.statLabel}>Verified Presence</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statItem}>
                        <Text style={[styles.statNumber, {color: isAudioActive ? '#10B981' : '#FFF'}]}>
                            {isAudioActive ? "15kHz" : "READY"}
                        </Text>
                        <Text style={styles.statLabel}>HIGH-FREQ</Text>
                    </View>
                </View>
            </View>

            <View style={styles.listSection}>
                <View style={styles.listHeader}>
                    <Text style={styles.listTitle}>Live Identity Log</Text>
                    <View style={styles.liveIndicator}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>LIVE</Text>
                    </View>
                </View>

                <FlatList
                    data={students}
                    keyExtractor={(item, index) => `${item.id}-${index}`}
                    renderItem={({ item }) => (
                        <View style={styles.studentRow}>
                            <View style={styles.avatar}><Text style={styles.avatarText}>{item.name?.charAt(0)}</Text></View>
                            <View style={styles.studentInfo}>
                                <Text style={styles.studentName}>{item.name}</Text>
                                <Text style={styles.matchText}>Biometric + Sound Verified</Text>
                            </View>
                            <Icon name="verified" size={22} color="#10B981" />
                        </View>
                    )}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Icon name="sensors" size={50} color="#E5E7EB" />
                            <Text style={styles.emptyText}>Waiting for students to enter range...</Text>
                            <Text style={styles.emptySubtext}>Make sure volume is at MAX on teacher's phone</Text>
                        </View>
                    }
                />
            </View>

            <TouchableOpacity style={styles.endButton} onPress={handleEndSession}>
                <LinearGradient colors={['#EF4444', '#DC2626']} style={styles.gradientButton}>
                    <Icon name="stop-circle" size={24} color="#FFF" />
                    <Text style={styles.endButtonText}>STOP BROADCAST</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#7C3AED' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 40 },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#FFF' },
    topSection: { alignItems: 'center', paddingBottom: 30 },
    visualizerContainer: { height: 160, justifyContent: 'center', alignItems: 'center', width: '100%' },
    iconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    wave: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)' },
    className: { fontSize: 24, fontWeight: 'bold', color: '#FFF', marginTop: 15 },
    statsContainer: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, padding: 20, width: '90%', marginTop: 20, alignItems: 'center' },
    statItem: { flex: 1, alignItems: 'center' },
    statNumber: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
    statLabel: { fontSize: 10, color: '#DDD', textTransform: 'uppercase', marginTop: 4 },
    divider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
    listSection: { flex: 1, backgroundColor: '#FFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25 },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    listTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
    liveIndicator: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#EF4444', marginRight: 6 },
    liveText: { fontSize: 10, fontWeight: 'bold', color: '#EF4444' },
    studentRow: { flexDirection: 'row', alignItems: 'center', padding: 15, backgroundColor: '#F9FAFB', borderRadius: 18, marginBottom: 12, borderWidth: 1, borderColor: '#F3F4F6' },
    avatar: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#DDD6FE', alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    avatarText: { fontSize: 18, fontWeight: 'bold', color: '#7C3AED' },
    studentInfo: { flex: 1 },
    studentName: { fontSize: 16, fontWeight: '600', color: '#1F2937' },
    matchText: { fontSize: 11, color: '#10B981', marginTop: 2, fontWeight: '500' },
    emptyContainer: { alignItems: 'center', marginTop: 50, opacity: 0.5 },
    emptyText: { textAlign: 'center', color: '#6B7280', marginTop: 15, paddingHorizontal: 40, fontSize: 13 },
    emptySubtext: { textAlign: 'center', color: '#9CA3AF', marginTop: 8, fontSize: 11, fontStyle: 'italic' },
    endButton: { padding: 20, backgroundColor: '#FFF' },
    gradientButton: { flexDirection: 'row', height: 60, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 10 },
    endButtonText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});

export default SoundSessionScreen;