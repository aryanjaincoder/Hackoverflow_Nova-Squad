import React, { useState, useEffect } from 'react'; // Added useEffect
import {
  FlatList,
  Alert,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useIsFocused } from '@react-navigation/native'; // Import useIsFocused

// Import types
import { NotificationItemProps } from '../../types'; // Adjust path if needed

// Import the item component
import NotificationItem from './NotificationItem'; // Adjust path if needed

// --- Component Props ---
interface NotificationScreenProps {
    // Receive live notifications from AppNavigator
    liveNotifications?: NotificationItemProps[];
    // Function to reset badge count (passed down from App.tsx via AppNavigator)
    // resetNotificationCount?: () => void; // This is now handled in AppNavigator's ScreenWrapper
}


const NotificationScreen: React.FC<NotificationScreenProps> = ({ liveNotifications = [] }) => {
    // Use the liveNotifications prop as the source of truth
    // No need for separate useState for notifications if always showing live data
    // const [notifications, setNotifications] = useState<NotificationItemProps[]>(liveNotifications);
    const [filter, setFilter] = useState<'all' | 'unread'>('all');
    const isFocused = useIsFocused();

    // Note: resetNotificationCount is now called in AppNavigator's ScreenWrapper
    // useEffect(() => {
    //     if (isFocused && resetNotificationCount) {
    //         resetNotificationCount();
    //     }
    // }, [isFocused, resetNotificationCount]);


    // Simplified mark as read - just log for now as state is managed above
    const handleMarkAsRead = (id: string) => {
        console.log(`Marking notification ${id} as read (visual only in this screen).`);
        // In a real app, you might update the state locally or trigger a backend update
        // setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const handleNotificationAction = (item: NotificationItemProps) => {
        let action = 'details';
        if (item.type === 'session_start' || item.type === 'session_reminder') {
            action = 'Open Scanner';
        } else if (item.type === 'low_attendance_alert') {
            action = 'View Attendance Report';
        }
        Alert.alert(
            `Action: ${action}`,
            `Prototype: Action for "${item.title}"`,
            [{ text: "OK" }]
        );
        if (!item.read) {
           handleMarkAsRead(item.id); // Mark read visually on action
        }
    };

    // Filter the live notifications passed via props
    const filteredNotifications = liveNotifications.filter((notif) =>
        filter === 'unread' ? !notif.read : true
    );

    const unreadCount = liveNotifications.filter(n => !n.read).length; // Calculate unread from live data

    // --- Render ---
    return (
        <View style={styles.screenContainer}>
            <View style={styles.header}>
                <Text style={styles.title}>Recent Notifications</Text>
                <View style={styles.filterContainer}>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
                        onPress={() => setFilter('all')}
                        activeOpacity={0.7}
                    >
                        {/* Show count from live data length */}
                        <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
                            All ({liveNotifications.length})
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.filterButton, filter === 'unread' && styles.filterButtonActive]}
                        onPress={() => setFilter('unread')}
                        activeOpacity={0.7}
                    >
                         {/* Show unread count */}
                        <Text style={[styles.filterButtonText, filter === 'unread' && styles.filterButtonTextActive]}>
                            Unread ({unreadCount})
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            <FlatList
                data={filteredNotifications} // Use filtered live data
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                    <NotificationItem
                        notification={item}
                        onPress={() => handleNotificationAction(item)}
                        onMarkRead={() => handleMarkAsRead(item.id)} // Pass handler
                    />
                )}
                ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
                contentContainerStyle={styles.listContentContainer}
                ListEmptyComponent={
                    <View style={styles.emptyListContainer}>
                        <Text style={styles.emptyListText}>No notifications here yet!</Text>
                    </View>
                }
            />
        </View>
    );
};

// --- StyleSheet ---
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#f4f7f6', // Light background
  },
  header: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
  },
  filterContainer: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 10, // Space between buttons
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  filterButtonActive: {
    backgroundColor: '#3b82f6', // Blue background for active
    borderColor: '#3b82f6',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600', // Semibold
    color: '#4b5563',
  },
  filterButtonTextActive: {
    color: '#ffffff', // White text for active
  },
  listSeparator: {
    height: 8, // Space between items
  },
  listContentContainer: {
    paddingVertical: 8,
    paddingHorizontal: 16, // Padding around the list items
  },
  emptyListContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 50,
    padding: 20,
  },
  emptyListText: {
    fontSize: 16,
    color: '#6b7280', // Medium gray
  },
});

export default NotificationScreen;