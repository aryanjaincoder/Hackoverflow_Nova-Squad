// src/screens/ProfileScreen/ProfileScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { RootStackParamList, UserData } from '../../navigation/AppNavigator'; // Path check kar lena

// --- Component Props ---
interface ProfileScreenProps {
    navigation: NativeStackNavigationProp<RootStackParamList, 'ProfileScreen'>;
    userData: UserData; // This prop AppNavigator se aayega
}

// --- Hardcoded Data ---
const hardcodedStats = {
    overall: 78,
    streak: 7,
    points: 1250,
};

// --- Screen Component ---
const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation, userData }) => {

    const navigateToRedeem = () => {
        navigation.navigate('RedeemScreen');
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
            <ScrollView contentContainerStyle={styles.scrollView}>
                
                {/* --- Profile Header --- */}
                <View style={styles.header}>
                    <View style={styles.avatar}>
                        <Icon name="account" size={60} color="#1E3A8A" />
                    </View>
                    <Text style={styles.userName}>{userData.name}</Text>
                    <Text style={styles.userEmail}>{userData.email}</Text>
                </View>

                {/* --- Stats Card --- */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>My Stats</Text>
                    <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{hardcodedStats.overall}%</Text>
                            <Text style={styles.statLabel}>Overall Attendance</Text>
                        </View>
                        <View style={styles.statSeparator} />
                        <View style={styles.statBox}>
                            <Text style={styles.statValue}>{hardcodedStats.streak} Days</Text>
                            <Text style={styles.statLabel}>Current Streak 🔥</Text>
                        </View>
                    </View>
                </View>

                {/* --- Points Card --- */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>My Points</Text>
                    <View style={styles.pointsContainer}>
                        <Text style={styles.pointsValue}>{hardcodedStats.points.toLocaleString()} 🪙</Text>
                        <TouchableOpacity style={styles.redeemButton} onPress={navigateToRedeem}>
                            <Text style={styles.redeemButtonText}>Redeem Now</Text>
                            <Icon name="arrow-right-thin" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* --- Badges Card (Reused from HomeScreen) --- */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>My Badges</Text>
                    <View style={styles.badgeContainer}>
                        <Text style={styles.badge}>🐦 Early Bird</Text>
                        <Text style={styles.badge}>🔥 Streak King (7 Days)</Text>
                        <Text style={styles.badge}>💯 Perfect Week</Text>
                        <Text style={styles.badge}>🎓 Class Topper (Mockup)</Text>
                        <Text style={styles.badge}>🚀 Punctual (Mockup)</Text>
                    </View>
                </View>

            </ScrollView>
        </View>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollView: {
        padding: 16,
    },
    header: {
        alignItems: 'center',
        paddingVertical: 20,
        marginBottom: 10,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#E0E7FF', // Light blue
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 3,
        borderColor: '#FFF'
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#111827',
    },
    userEmail: {
        fontSize: 16,
        color: '#6B7280',
        marginTop: 4,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statBox: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1E3A8A',
    },
    statLabel: {
        fontSize: 14,
        color: '#6B7280',
        marginTop: 4,
    },
    statSeparator: {
        width: 1,
        backgroundColor: '#E5E7EB',
    },
    pointsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#F3F4F6',
        padding: 16,
        borderRadius: 8,
    },
    pointsValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FF6B35', // Orange
    },
    redeemButton: {
        flexDirection: 'row',
        backgroundColor: '#007AFF', // Blue
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    redeemButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
        marginRight: 4,
    },
    // Styles reused from HomeScreen
    badgeContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 4,
    },
    badge: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0056b3', // Dark blue text
        backgroundColor: '#e6f0ff', // Light blue background
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 12,
        marginRight: 8,
        marginBottom: 8,
        overflow: 'hidden',
    },
});

export default ProfileScreen;