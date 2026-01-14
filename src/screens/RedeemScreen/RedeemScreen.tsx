// src/screens/RedeemScreen/RedeemScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView, TouchableOpacity, Alert } from 'react-native';

// --- Screen Component ---
const RedeemScreen: React.FC = () => {

    // Hardcoded data prototype ke liye
    const userPoints = 1250;
    const rewards = [
        { id: '1', title: 'Canteen Coupon (1 Samosa)', points: 500, emoji: ' samosa ' },
        { id: '2', title: 'College Fest T-Shirt', points: 2000, emoji: 't-shirt' },
        { id: '3', title: '1 Day Assignment Extension', points: 3000, emoji: 'calendar-check' },
        { id: '4', title: 'Library Fine Waiver (50%)', points: 1500, emoji: 'bookmark' },
    ];

    const handleRedeem = (reward: any) => {
        if (userPoints >= reward.points) {
            Alert.alert(
                'Redeem Successful!',
                `You have successfully redeemed "${reward.title}" for ${reward.points} points.`,
                [{ text: 'Awesome!' }]
            );
            // Prototype hai, toh points minus nahi kar rahe
        } else {
            Alert.alert(
                'Not Enough Points',
                `You need ${reward.points - userPoints} more points to redeem this.`,
                [{ text: 'OK' }]
            );
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
            <ScrollView contentContainerStyle={styles.scrollView}>
                
                {/* Points Balance Card */}
                <View style={[styles.card, styles.balanceCard]}>
                    <Text style={styles.balanceTitle}>Your Points Balance</Text>
                    <Text style={styles.balancePoints}>{userPoints.toLocaleString()} 🪙</Text>
                </View>

                {/* Rewards List */}
                <Text style={styles.listTitle}>Available Rewards</Text>
                {rewards.map(reward => (
                    <View key={reward.id} style={styles.card}>
                        <View style={styles.rewardContent}>
                            <Text style={styles.rewardEmoji}>{reward.emoji}</Text>
                            <View style={styles.rewardTextContainer}>
                                <Text style={styles.rewardTitle}>{reward.title}</Text>
                                <Text style={styles.rewardPoints}>{reward.points.toLocaleString()} points</Text>
                            </View>
                            <TouchableOpacity
                                style={[
                                    styles.redeemButton,
                                    userPoints < reward.points && styles.redeemButtonDisabled
                                ]}
                                onPress={() => handleRedeem(reward)}
                                disabled={userPoints < reward.points}
                            >
                                <Text style={styles.redeemButtonText}>
                                    {userPoints >= reward.points ? 'Redeem' : 'Locked'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

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
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    balanceCard: {
        backgroundColor: '#1E3A8A', // Dark blue
        alignItems: 'center',
    },
    balanceTitle: {
        fontSize: 16,
        color: '#E0E0E0',
    },
    balancePoints: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginTop: 8,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginVertical: 12,
    },
    rewardContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rewardEmoji: {
        fontSize: 30,
        marginRight: 16,
    },
    rewardTextContainer: {
        flex: 1,
    },
    rewardTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    rewardPoints: {
        fontSize: 14,
        color: '#FF6B35', // Orange
        fontWeight: 'bold',
        marginTop: 4,
    },
    redeemButton: {
        backgroundColor: '#2ECC71', // Green
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    redeemButtonDisabled: {
        backgroundColor: '#95A5A6', // Grey
    },
    redeemButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
});

export default RedeemScreen;