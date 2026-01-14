// src/screens/NudgeScreen/NudgeScreen.tsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, TouchableOpacity, Alert } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Hardcoded data prototype ke liye
const friendsData = [
    { id: '1', name: 'Ankit Sharma', class: 'CSE-B' },
    { id: '2', name: 'Riya Singh', class: 'CSE-A' },
    { id: '3', name: 'Rohan Verma', class: 'CSE-B' },
    { id: '4', name: 'Priya Jain', class: 'CSE-A' },
];

// --- Screen Component ---
const NudgeScreen: React.FC = () => {
    
    // Track karne ke liye ki kisko nudge bhej diya
    const [nudgedFriends, setNudgedFriends] = useState<string[]>([]);

    const handleNudge = (friend: { id: string; name: string }) => {
        // Sirf alert dikhao
        Alert.alert(
            'Nudge Sent! 👍',
            `Your nudge has been sent to ${friend.name}.`,
            [{ text: 'OK' }]
        );
        // Button ko disabled state mein daal do
        setNudgedFriends(prev => [...prev, friend.id]);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
            <ScrollView contentContainerStyle={styles.scrollView}>
                
                <Text style={styles.listTitle}>Friends in your next class (Mathematics)</Text>

                {/* Friends List */}
                {friendsData.map(friend => {
                    const isNudged = nudgedFriends.includes(friend.id);
                    return (
                        <View key={friend.id} style={styles.card}>
                            <View style={styles.friendContent}>
                                <View style={styles.avatar}>
                                    <Icon name="account" size={24} color="#1E3A8A" />
                                </View>
                                <View style={styles.friendTextContainer}>
                                    <Text style={styles.friendName}>{friend.name}</Text>
                                    <Text style={styles.friendClass}>{friend.class}</Text>
                                </View>
                                <TouchableOpacity
                                    style={[
                                        styles.nudgeButton,
                                        isNudged && styles.nudgeButtonSent
                                    ]}
                                    onPress={() => handleNudge(friend)}
                                    disabled={isNudged}
                                >
                                    <Icon 
                                        name={isNudged ? "check" : "bell-outline"} 
                                        size={18} 
                                        color="#FFFFFF" 
                                    />
                                    <Text style={styles.nudgeButtonText}>
                                        {isNudged ? 'Sent' : 'Nudge'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5ff', // Thoda light purple/blue background
    },
    scrollView: {
        padding: 16,
    },
    listTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#4B5563', // Grey text
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    friendContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E0E7FF', // Light blue avatar background
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    friendTextContainer: {
        flex: 1,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#111827',
    },
    friendClass: {
        fontSize: 13,
        color: '#6B7280',
        marginTop: 2,
    },
    nudgeButton: {
        flexDirection: 'row',
        backgroundColor: '#007AFF', // Blue
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
    },
    nudgeButtonSent: {
        backgroundColor: '#2ECC71', // Green
    },
    nudgeButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
        marginLeft: 6,
    },
});

export default NudgeScreen;