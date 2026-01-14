// src/screens/SuccessScreen.tsx

import React, { useEffect } from 'react';
import { View, Text, StyleSheet, StatusBar, Vibration } from 'react-native';
import { useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Apna AnimatedCheckmark component import karo
import AnimatedCheckmark from '../../components/AnimatedCheckmark'; // Path check kar lena

// --- Navigation Types ---
// Apni RootStackParamList mein 'SuccessScreen' add karna
type RootStackParamList = {
    Home: undefined;
    BLECheckScreen: { sessionId: string };
    FaceScanScreen: { sessionId: string };
    ScanQRScreen: { sessionId: string; faceVerifiedToken: string };
    SuccessScreen: { sessionId: string }; // Nayi screen
};

type SuccessNavigationProp = NativeStackNavigationProp<RootStackParamList, 'SuccessScreen'>;

// --- Success Screen Component ---
const SuccessScreen: React.FC = () => {
    const navigation = useNavigation<SuccessNavigationProp>();

    // Step 1: Jaise hi screen load ho, Vibrate karo
    useEffect(() => {
        Vibration.vibrate(100);
    }, []);

    // Step 2: Jab animation poori ho jaaye
    const onAnimationComplete = () => {
        // 1.5 second ruko taaki user text padh le
        setTimeout(() => {
            // Aur wapas Home screen par jao
            navigation.popToTop(); // Saari scan screens ko stack se hata dega
        }, 1500); 
    };

    // --- Render ---
    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
            
            {/* Yahaan humne component ko call kiya */}
            <AnimatedCheckmark 
                start={true} // Animation turant trigger karo
                onAnimationFinish={onAnimationComplete} // Callback function
            />
            
            {/* Yeh hai Priority 2 ka (Fake Gamification) */}
            <Text style={styles.successText}>Attendance Marked!</Text>
            <Text style={styles.streakText}>+50 Points Earned! 🚀</Text>
            <Text style={styles.badgeText}>New Badge: 'Early Bird' 🐦</Text>
        </View>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF', // Light background
    },
    successText: {
        fontSize: 24,
        fontWeight: 'bold',
        marginTop: 24,
        color: '#333',
    },
    streakText: {
        fontSize: 18,
        color: '#4CAF50', // Green
        marginTop: 8,
        fontWeight: '600'
    },
    badgeText: {
        fontSize: 16,
        color: '#007AFF', // Blue
        marginTop: 4,
    },
});

export default SuccessScreen;