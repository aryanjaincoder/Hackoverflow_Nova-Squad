// AppNavigator.tsx - UPDATED VERSION

import React, { useState, ComponentType, useEffect, useCallback } from 'react';
import { View, StyleSheet, useColorScheme } from 'react-native';
import {
  createNativeStackNavigator,
  NativeStackNavigationProp,
} from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsFocused } from '@react-navigation/native';

// --- Firebase Imports ---
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// --- Import Screens & Components ---
import Topbar from '../components/Topbar/Topbar';
import HamburgerMenu from '../components/Topbar/Hamburger';
import StudentHomeScreen from '../screens/Home/StudentHomeScreen';
import AdminHomeScreen from '../screens/Home/AdminHomeScreen';
import CollegeRegistrationScreen from '../screens/Registration/CollegeRegistration';
import NotificationScreen from '../screens/Notifications/Notifications';
import EnrollFaceScreen from '../screens/EnrollFaceScreen/EnrollFaceScreen';
import BLECheckScreen from '../screens/BleScan/BLECheckScreen';
import FaceScanScreen from '../screens/FaceScan/FaceScanScreen';
import ScanQRScreen from '../screens/ScanQRScreen/ScanQRScreen';
import ProfileScreen from '../screens/ProfileScreen/ProfileScreen';
import SuccessScreen from '../screens/success/SuccessScreen';
import RedeemScreen from '../screens/RedeemScreen/RedeemScreen';
import NudgeScreen from '../screens/NudgeScreen/NudgeScreen';
import AnalyticsScreen from '../screens/AnalyticsScreen/AnalyticsScreen';

// --- Admin Screens ---
import CreateSessionScreen from '../screens/SessionCreateScreen/CreateSessionScreen';
import VerificationQueueScreen from '../screens/VerificationQueueScreen/VerificationQueueScreen';
import P2PVerificationScreen from '../screens/P2PVerificationScreen/P2PVerificationScreen';
import QRSessionScreen from '../screens/admin/QRSessionScreen';
import NFCSessionScreen from '../screens/admin/NFCSessionScreen';
import SoundSessionScreen from '../screens/admin/SoundSessionScreen';

// --- Student Mode-Specific Screens ---
import NFCTapScreen from '../screens/NFCTapScreen/NFCTapScreen';
// ✅ FIXED: Changed import from SoundListenerScreen to SoundReceiver
import SoundReceiver from '../screens/soundReciever/SoundReceiver';

// --- Setup Screen (Temporary) ---
import SetupScreen from '../screens/SetupScreen/SetupScreen';

// ✅ FIXED: Complete Type Definitions
export type RootStackParamList = {
  // --- Auth & Home ---
  Home: undefined;
  CollegeRegistration: undefined;
  // --- Face Enrollment ---
  EnrollFaceScreen: undefined;
  
  // --- Notifications ---
  Notifications: undefined;
  
  // --- BLE ---
  BLECheckScreen: { sessionId: string };
  
  // --- Face Verification (Gateway) ---
FaceScanScreen: { 
  sessionId: string; 
  nextAction?: string;
  mode?: 'enroll' | 'verify';
  userId?: string;
  userName?: string;
};
  
  // --- Student Attendance Screens (Mode-Specific) ---
  ScanQRScreen: { 
    sessionId: string; 
    faceVerifiedToken: string;
    userId?: string;
    userName?: string;
  };
  NFCTapScreen: { 
    sessionId: string; 
    faceVerifiedToken: string;
  };
  SoundReceiver: { 
    sessionId: string; 
    faceVerifiedToken: string;
  };
  
  // --- Success & Other Student Screens ---
  SuccessScreen: { sessionId: string };
  RedeemScreen: undefined;
  NudgeScreen: undefined;
  ProfileScreen: undefined;
  AnalyticsScreen: undefined;
  P2PVerificationScreen: { sessionId: string; seatId: string };
  
  // --- Admin Screens ---
  CreateSessionScreen: { mode?: 'QR' | 'NFC' | 'SOUND'; className?: string ;
  targetStudents?: string[]} | undefined;
  VerificationQueueScreen: undefined;
  QRSessionScreen: { sessionId: string; className: string; totalStudents: number };
  NFCSessionScreen: { sessionId: string; className: string };
  SoundSessionScreen: { sessionId: string; className: string };
  
  // --- Setup (Temporary) ---
  SetupScreen: undefined;
  
  // --- Legacy (if needed) ---
  SeatSelection?: { sessionId: string };
};

// --- UserData Interface ---
export interface UserData {
  name: string;
  email: string;
  syncStatus: 'online' | 'offline';
  notificationCount: number;
  photoURL?: string;
  role: 'student' | 'admin';
}

interface ScreenWrapperProps {
  navigation: NativeStackNavigationProp<
    RootStackParamList,
    keyof RootStackParamList
  >;
  component: ComponentType<any>;
  name: string;
  route: any;
  currentTheme: 'light' | 'dark';
  userData: UserData;
  handleThemeToggle: () => void;
  handleLogout: () => void;
  liveNotifications?: any[];
  resetNotificationCount?: () => void;
}

const Stack = createNativeStackNavigator<RootStackParamList>();

// ✅ Screen Wrapper Component
const ScreenWrapper: React.FC<ScreenWrapperProps> = ({
  navigation,
  route,
  component: Component,
  name,
  currentTheme,
  userData,
  handleThemeToggle,
  handleLogout,
  liveNotifications,
  resetNotificationCount,
}) => {
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  useEffect(() => {
    if (name === 'Notifications' && isFocused && resetNotificationCount) {
      console.log('[AppNavigator] NotificationScreen focused, resetting count.');
      resetNotificationCount();
    }
  }, [isFocused, name, resetNotificationCount]);

  const handleMenuOpen = () => setIsMenuVisible(true);
  const handleMenuClose = () => setIsMenuVisible(false);

  const handleNotificationsNavigate = () => navigation.navigate('Notifications');
  const handleProfile = () => navigation.navigate('ProfileScreen');

  // ✅ FIXED: Screens where Topbar should NOT appear
  const screensWithoutTopbar = [
    'BLE Check',
    'Face Verification',
    'QR Scan',
    'NFC Tap',
    'Sound Detection',
    'Success Screen',
    'Create Session',
    'Verification Queue',
    'P2P Verification',
    'QR Session',
    'NFC Session',
    'Sound Session',
    'Face++ Setup',
  ];

  const handleLogoutAndCloseMenu = () => {
    handleMenuClose();
    handleLogout();
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: currentTheme === 'dark' ? '#111827' : '#F9FAFB' },
      ]}>
      {!screensWithoutTopbar.includes(name) && (
        <Topbar
          statusBarHeight={insets.top}
          pageTitle={name}
          notificationCount={userData.notificationCount}
          theme={currentTheme}
          syncStatus={userData.syncStatus}
          onPressNotifications={handleNotificationsNavigate}
          onPressProfile={handleProfile}
          userImage={userData.photoURL}
          onMenuPress={handleMenuOpen}
        />
      )}

      <View style={styles.content}>
        <Component
          navigation={navigation}
          route={route}
          userData={userData}
          {...(name === 'Notifications' && { liveNotifications })}
        />
      </View>

      <HamburgerMenu
  isVisible={isMenuVisible}
  onClose={handleMenuClose}
  navigation={navigation}  // <-- ADD THIS LINE
  currentTheme={currentTheme}
  onThemeToggle={handleThemeToggle}
  onLogout={handleLogoutAndCloseMenu}
  syncStatus={userData.syncStatus}
  userName={userData.name}
  userEmail={userData.email}
  role={userData.role}
/>
    </View>
  );
};

// --- Main App Navigator ---
interface AppNavigatorProps {
  notificationCount: number;
  liveNotifications: any[];
  resetNotificationCount: () => void;
}

const AppNavigator: React.FC<AppNavigatorProps> = ({
  notificationCount,
  liveNotifications,
  resetNotificationCount,
}) => {
  const isDarkMode = useColorScheme() === 'dark';
  const defaultTheme = isDarkMode ? 'dark' : 'light';
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(defaultTheme);

  const [userData, setUserData] = useState<UserData>({
    name: 'Student',
    email: 'student@example.com',
    syncStatus: 'online',
    notificationCount,
    photoURL: undefined,
    role: 'student',
  });

  // Update notification count
  useEffect(() => {
    setUserData(prev => ({ ...prev, notificationCount }));
  }, [notificationCount]);

  // Fetch user data from Firebase
  useEffect(() => {
    const unsubscribeAuth = auth().onUserChanged(async currentUser => {
      if (currentUser) {
        try {
          const userDoc = await firestore()
            .collection('users')
            .doc(currentUser.uid)
            .get();

          let firestoreName = 'Student';
          let firestoreRole: 'student' | 'admin' = 'student';

          if (userDoc.exists()) {
            firestoreName = userDoc.data()?.name || 'Student';
            firestoreRole = userDoc.data()?.role || 'student';
          }

          setUserData(prevData => ({
            ...prevData,
            name: firestoreName,
            email: currentUser.email || 'student@example.com',
            photoURL: currentUser.photoURL || undefined,
            syncStatus: 'online',
            role: firestoreRole,
          }));
        } catch (error) {
          console.error('[AppNavigator] Error fetching user data:', error);
          setUserData(prevData => ({
            ...prevData,
            name: 'Student',
            email: currentUser.email || 'student@example.com',
            photoURL: currentUser.photoURL || undefined,
            syncStatus: 'online',
            role: 'student',
          }));
        }
      } else {
        setUserData({
          name: 'Student',
          email: '',
          syncStatus: 'offline',
          notificationCount: 0,
          photoURL: undefined,
          role: 'student',
        });
      }
    });

    return unsubscribeAuth;
  } , []);

  // Handlers
  const handleThemeToggle = useCallback(
    () => setCurrentTheme(prev => (prev === 'light' ? 'dark' : 'light')),
    [],
  );

  const handleLogout = useCallback(
    () => auth().signOut().catch(error => console.error('[AppNavigator] Logout Error:', error)),
    [],
  );

  // Screen Renderer
  const renderScreen = useCallback(
    (Component: ComponentType<any>, screenTitle: string) => (props: any) => (
      <ScreenWrapper
        {...props}
        component={Component}
        name={screenTitle}
        currentTheme={currentTheme}
        userData={userData}
        handleThemeToggle={handleThemeToggle}
        handleLogout={handleLogout}
        {...(screenTitle === 'Notifications' && {
          liveNotifications,
          resetNotificationCount,
        })}
      />
    ),
    [
      currentTheme,
      userData,
      handleThemeToggle,
      handleLogout,
      liveNotifications,
      resetNotificationCount,
    ],
  );

  // --- Dynamically select Home Screen based on user role ---
  const HomeScreenComponent = userData.role === 'admin' ? AdminHomeScreen : StudentHomeScreen;

  return (
    <Stack.Navigator 
      screenOptions={{ headerShown: false }} 
      initialRouteName="Home"
    >
      {/* ==================== HOME & AUTH ==================== */}
      <Stack.Screen name="Home">
        {renderScreen(HomeScreenComponent, 'Dashboard')}
      </Stack.Screen>
      
      <Stack.Screen name="CollegeRegistration">
        {renderScreen(CollegeRegistrationScreen, 'College Registration')}
      </Stack.Screen>
      {/* ==================== FACE ENROLLMENT ==================== */}
<Stack.Screen name="EnrollFaceScreen">
  {renderScreen(EnrollFaceScreen, 'Face Enrollment')}
</Stack.Screen>
      
      {/* ==================== NOTIFICATIONS ==================== */}
      <Stack.Screen name="Notifications">
        {renderScreen(NotificationScreen, 'Notifications')}
      </Stack.Screen>
      
      {/* ==================== BLE CHECK ==================== */}
      <Stack.Screen name="BLECheckScreen">
        {renderScreen(BLECheckScreen, 'BLE Check')}
      </Stack.Screen>
      
      {/* ==================== FACE VERIFICATION (Gateway) ==================== */}
      {/* ✅ CORRECT */}
<Stack.Screen name="FaceScanScreen" component={renderScreen(FaceScanScreen, 'Face Verification')} />
      
      {/* ==================== STUDENT ATTENDANCE SCREENS (Mode-Specific) ==================== */}
      
      {/* QR Mode */}
      <Stack.Screen name="ScanQRScreen">
        {renderScreen(ScanQRScreen, 'QR Scan')}
      </Stack.Screen>
      
      {/* NFC Mode */}
      <Stack.Screen name="NFCTapScreen">
        {renderScreen(NFCTapScreen, 'NFC Tap')}
      </Stack.Screen>
      
      {/* Sound Mode */}
      <Stack.Screen name="SoundReceiver">
        {/* ✅ FIXED: Changed SoundListenerScreen to SoundReceiver */}
        {renderScreen(SoundReceiver, 'Sound Detection')}
      </Stack.Screen>
      
      {/* ==================== SUCCESS & OTHER STUDENT SCREENS ==================== */}
      <Stack.Screen name="SuccessScreen">
        {renderScreen(SuccessScreen, 'Success Screen')}
      </Stack.Screen>
      
      <Stack.Screen name="P2PVerificationScreen">
        {renderScreen(P2PVerificationScreen, 'P2P Verification')}
      </Stack.Screen>
      
      <Stack.Screen name="RedeemScreen">
        {renderScreen(RedeemScreen, 'Redeem Points')}
      </Stack.Screen>
      
      <Stack.Screen name="NudgeScreen">
        {renderScreen(NudgeScreen, 'Nudge a Friend')}
      </Stack.Screen>
      
      <Stack.Screen name="ProfileScreen">
        {renderScreen(ProfileScreen, 'My Profile')}
      </Stack.Screen>
      
      <Stack.Screen name="AnalyticsScreen">
        {renderScreen(AnalyticsScreen, 'My Analytics')}
      </Stack.Screen>
      
      {/* ==================== ADMIN SCREENS ==================== */}
      
      {/* Create Session */}
      <Stack.Screen name="CreateSessionScreen">
        {renderScreen(CreateSessionScreen, 'Create Session')}
      </Stack.Screen>
      
      {/* Verification Queue */}
      <Stack.Screen name="VerificationQueueScreen">
        {renderScreen(VerificationQueueScreen, 'Verification Queue')}
      </Stack.Screen>
      
      {/* Admin Session Screens (Mode-Specific) */}
      <Stack.Screen name="QRSessionScreen">
        {renderScreen(QRSessionScreen, 'QR Session')}
      </Stack.Screen>

      <Stack.Screen name="NFCSessionScreen">
        {renderScreen(NFCSessionScreen, 'NFC Session')}
      </Stack.Screen>

      <Stack.Screen name="SoundSessionScreen">
        {renderScreen(SoundSessionScreen, 'Sound Session')}
      </Stack.Screen>
      
      {/* ==================== SETUP (Temporary) ==================== */}
      <Stack.Screen name="SetupScreen">
        {renderScreen(SetupScreen, 'Face++ Setup')}
      </Stack.Screen>
    </Stack.Navigator>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  content: { 
    flex: 1 
  },
});

export default AppNavigator;