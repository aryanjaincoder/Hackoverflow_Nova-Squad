// src/types.ts (or wherever you keep your types)

export type NotificationType = 'session_start' | 'session_reminder' | 'low_attendance_alert' | 'general' | 'p2p_session_start';

export interface NotificationItemProps {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  data?: { // Optional data for actions
    sessionId?: string;
    studentId?: string;
    // Add other relevant data
  };
}