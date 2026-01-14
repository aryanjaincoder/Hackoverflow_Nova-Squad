// src/screens/AnalyticsScreen/AnalyticsScreen.tsx

import React from 'react';
import { View, Text, StyleSheet, StatusBar, ScrollView } from 'react-native';
import { UserData } from '../../navigation/AppNavigator'; // Path check kar lena
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// --- Component Props ---
interface AnalyticsScreenProps {
    userData: UserData; // This prop AppNavigator se aayega
}

// --- Hardcoded Data ---
const fakeBarData = [
    { label: 'Mon', value: 80 },
    { label: 'Tue', value: 100 },
    { label: 'Wed', value: 70 },
    { label: 'Thu', value: 100 },
    { label: 'Fri', value: 90 },
];

const fakePieData = [
    { subject: 'Mathematics', value: '90%', color: '#1E3A8A' },
    { subject: 'Physics', value: '70%', color: '#059669' },
    { subject: 'Chemistry', value: '85%', color: '#FF6B35' },
];

// --- Screen Component ---
const AnalyticsScreen: React.FC<AnalyticsScreenProps> = ({ userData }) => {

    // Fake Bar Graph render karne ke liye helper
    const renderBarGraph = () => (
        <View style={styles.barGraphContainer}>
            {fakeBarData.map((day, index) => (
                <View key={index} style={styles.barWrapper}>
                    <View style={[styles.bar, { height: day.value }]} />
                    <Text style={styles.barLabel}>{day.label}</Text>
                </View>
            ))}
        </View>
    );

    // Fake Pie Chart Legend render karne ke liye helper
    const renderPieLegend = () => (
        <View style={styles.legendContainer}>
            {fakePieData.map((subject, index) => (
                <View key={index} style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: subject.color }]} />
                    <Text style={styles.legendSubject}>{subject.subject}:</Text>
                    <Text style={styles.legendValue}>{subject.value}</Text>
                </View>
            ))}
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
            <ScrollView contentContainerStyle={styles.scrollView}>

                {/* --- Weekly Trend Card --- */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>My Weekly Trend</Text>
                    {renderBarGraph()}
                </View>

                {/* --- Subject-wise Card --- */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Attendance by Subject (This Month)</Text>
                    {renderPieLegend()}
                </View>

                {/* --- Smart Insights Card --- */}
                <View style={[styles.card, styles.aiCard]}>
                    <Text style={[styles.cardTitle, { color: '#FFFFFF' }]}>🤖 Smart Insights</Text>
                    <View style={styles.insightItem}>
                        <Icon name="chart-donut" size={22} color="#FFD700" />
                        <Text style={styles.insightText}>
                            **Most Missed Class:** Physics (Monday 9 AM)
                        </Text>
                    </View>
                    <View style={styles.insightItem}>
                        <Icon name="calendar-check" size={22} color="#2ECC71" />
                        <Text style={styles.insightText}>
                            **Best Day:** Wednesday (100% Attendance)
                        </Text>
                    </View>
                    <View style={styles.insightItem}>
                        <Icon name="brain" size={22} color="#5DADE2" />
                        <Text style={styles.insightText}>
                            **AI Prediction:** You are **90%** likely to meet the 75% target this month. Keep it up!
                        </Text>
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
    aiCard: {
        backgroundColor: '#1E3A8A', // Dark Blue
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 20,
    },
    // Bar Graph Styles
    barGraphContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 120, // Graph ki height
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
        paddingBottom: 5,
    },
    barWrapper: {
        alignItems: 'center',
    },
    bar: {
        width: 30,
        backgroundColor: '#007AFF',
        borderRadius: 4,
    },
    barLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 6,
    },
    // Pie Chart Legend Styles
    legendContainer: {
        marginTop: 10,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 10,
    },
    legendSubject: {
        fontSize: 15,
        color: '#333',
        fontWeight: '500',
    },
    legendValue: {
        fontSize: 15,
        color: '#111',
        fontWeight: 'bold',
        marginLeft: 'auto',
    },
    // AI Insights Styles
    insightItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 15,
    },
    insightText: {
        fontSize: 14,
        color: '#E0E7FF',
        marginLeft: 10,
        lineHeight: 20,
        flex: 1, // Taaki text wrap ho sake
    },
});

export default AnalyticsScreen;