// src/data/dummyNotifications.ts
import { NotificationItemProps } from '../types';

const now = new Date();

// Helper function to create dates easily
const timeAgo = (minutes = 0, hours = 0, days = 0): Date => {
  const date = new Date(now);
  date.setMinutes(date.getMinutes() - minutes);
  date.setHours(date.getHours() - hours);
  date.setDate(date.getDate() - days);
  return date;
};

export const dummyNotifications: NotificationItemProps[] = [
  // --- Unread ---
  {
    id: '1',
    type: 'session_start',
    title: 'Attendance Started: CS-401',
    message: 'Session for 4th Year CSE-B (AI/ML) has begun. Tap to scan.',
    timestamp: timeAgo(2), // 2 minutes ago
    read: false,
    data: { sessionId: 'SESSION_101' },
  },
  {
    id: '2',
    type: 'session_reminder',
    title: 'Reminder: Session Ending Soon',
    message: 'Attendance for ME-205 (Thermodynamics) will close in 3 minutes.',
    timestamp: timeAgo(7), // 7 minutes ago
    read: false,
    data: { sessionId: 'SESSION_102' },
  },
   {
    id: '6',
    type: 'session_start',
    title: 'Attendance Started: EC-303',
    message: 'Session for 3rd Year ECE-A (Digital Circuits) has begun.',
    timestamp: timeAgo(15), // 15 minutes ago
    read: false,
    data: { sessionId: 'SESSION_103' },
  },
  {
    id: '7',
    type: 'low_attendance_alert',
    title: 'Attendance Check: Below 80%',
    message: 'Your attendance in CS-401 is currently 78%. Please attend regularly.',
    timestamp: timeAgo(0, 1), // 1 hour ago
    read: false,
    data: { studentId: 'YOUR_STUDENT_ID' }, // Add relevant data if needed
  },

  // --- Read ---
  {
    id: '3',
    type: 'low_attendance_alert',
    title: 'Low Attendance Warning',
    message: 'Your overall attendance has dropped below 75%. Please ensure regular attendance.',
    timestamp: timeAgo(0, 3), // 3 hours ago
    read: true,
  },
  {
    id: '4',
    type: 'session_start',
    title: 'Attendance Started: PH-101',
    message: 'Session for 1st Year Physics B has begun.',
    timestamp: timeAgo(0, 0, 1), // 1 day ago
    read: true,
    data: { sessionId: 'SESSION_789' },
  },
   {
    id: '8',
    type: 'general',
    title: 'App Update Available',
    message: 'A new version of SmartAttendance includes bug fixes and performance improvements.',
    timestamp: timeAgo(0, 0, 1), // 1 day ago
    read: true,
  },
  {
    id: '9',
    type: 'session_start',
    title: 'Attendance Started: MA-101',
    message: 'Session for 1st Year Maths A (Calculus) has begun.',
    timestamp: timeAgo(0, 0, 2), // 2 days ago
    read: true,
    data: { sessionId: 'SESSION_104' },
  },
  {
    id: '5',
    type: 'general',
    title: 'Welcome to Zenith Ely!',
    message: 'Manage your attendance efficiently.',
    timestamp: timeAgo(0, 0, 3), // 3 days ago
    read: true,
  },
  {
    id: '10',
    type: 'session_reminder',
    title: 'Reminder: Session Ended',
    message: 'Attendance for CS-401 (AI/ML) session is now closed.',
    timestamp: timeAgo(0, 0, 4), // 4 days ago
    read: true,
    data: { sessionId: 'SESSION_101_OLD' }, // Example for a past session
  },
   {
    id: '11',
    type: 'session_start',
    title: 'Attendance Started: CH-202',
    message: 'Session for 2nd Year Chemical Engg. has begun.',
    timestamp: timeAgo(0, 0, 5), // 5 days ago
    read: true,
    data: { sessionId: 'SESSION_105' },
  },
   {
    id: '12',
    type: 'general',
    title: 'Tip: Scan Quickly!',
    message: 'Remember the QR code changes every few seconds. Be ready to scan!',
    timestamp: timeAgo(0, 0, 6), // 6 days ago
    read: true,
  },
   {
    id: '13',
    type: 'low_attendance_alert',
    title: 'Attendance Improvement',
    message: 'Good job! Your overall attendance is now above 75%.',
    timestamp: timeAgo(0, 0, 7), // 1 week ago
    read: true,
  },
  {
    id: '14',
    type: 'session_start',
    title: 'Attendance Started: HU-101',
    message: 'Session for 1st Year Humanities has begun.',
    timestamp: timeAgo(0, 0, 8), // 8 days ago
    read: true,
    data: { sessionId: 'SESSION_106' },
  },
];