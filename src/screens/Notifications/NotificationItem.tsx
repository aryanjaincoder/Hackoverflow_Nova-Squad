import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NotificationItemProps } from '../../types';

// --- Helper Functions ---
const getIconName = (type: NotificationItemProps['type']): string => {
  switch (type) {
    case 'session_start': return '📅';
    case 'session_reminder': return '⏳';
    case 'low_attendance_alert': return '⚠️';
    case 'general': return '🔔';
    default: return 'ℹ️';
  }
};

// ✅ FIXED: Safely handle timestamp that might not be a Date object
const getTimeAgo = (timestamp: Date | number | any): string => {
  try {
    // Convert to Date if it's not already
    let date: Date;
    
    if (timestamp instanceof Date) {
      date = timestamp;
    } else if (typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else if (timestamp?.seconds) {
      // Firestore Timestamp object
      date = new Date(timestamp.seconds * 1000);
    } else if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      // Fallback to current time if invalid
      console.warn('[NotificationItem] Invalid timestamp:', timestamp);
      return 'just now';
    }

    // Check if date is valid
    if (isNaN(date.getTime())) {
      console.warn('[NotificationItem] Invalid date:', timestamp);
      return 'just now';
    }

    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    
    // Handle future dates
    if (seconds < 0) return 'just now';
    
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + "y ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + "mo ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + "d ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + "h ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + "m ago";
    if (seconds < 5) return "just now";
    return Math.floor(seconds) + "s ago";
  } catch (error) {
    console.error('[NotificationItem] Error calculating time ago:', error);
    return 'recently';
  }
};
// --- End Helper Functions ---

// --- Component Props ---
interface Props {
  notification: NotificationItemProps;
  onPress: () => void;
  onMarkRead: () => void;
}

// --- Component Logic ---
const NotificationItem: React.FC<Props> = ({ notification, onPress, onMarkRead }) => {
  const icon = getIconName(notification.type);
  const timeAgo = getTimeAgo(notification.timestamp);

  const handlePress = () => {
    onPress();
  };

  return (
    <TouchableOpacity
      style={[styles.itemContainer, notification.read && styles.itemContainerRead]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>{icon}</Text>
      </View>

      {/* Content */}
      <View style={styles.contentContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>{notification.title}</Text>
          {/* Show blue dot only if unread */}
          {!notification.read && <View style={styles.unreadIndicator} />}
          <Text style={styles.timestamp}>{timeAgo}</Text>
        </View>
        <Text style={styles.message} numberOfLines={2}>{notification.message}</Text>
      </View>
    </TouchableOpacity>
  );
};

// --- StyleSheet ---
const styles = StyleSheet.create({
  itemContainer: {
    backgroundColor: '#ffffff',
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  itemContainerRead: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  contentContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    flexShrink: 1,
    marginRight: 4,
  },
  unreadIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
    marginHorizontal: 8,
  },
  timestamp: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 'auto',
  },
  message: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
});

export default NotificationItem;