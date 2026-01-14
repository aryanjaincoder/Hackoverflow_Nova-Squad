// App.tsx - COMPLETELY FIXED VERSION

import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { Alert, View, Platform, Text, StyleSheet, ActivityIndicator } from 'react-native';
import notifee, { EventType, AndroidImportance, Event } from '@notifee/react-native';

// --- Firebase Imports ---
import './src/firebase/config';
import messaging from '@react-native-firebase/messaging';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';

// --- Navigators & Types ---
import { AuthStack, AuthStackParamList } from './src/navigation/AuthNavigator';
import AppNavigator, { RootStackParamList } from './src/navigation/AppNavigator';

// --- Firestore Listener & Types ---
import { startSessionListener, initializeStudentClass } from './src/utils/notifTrigger';
import { NotificationItemProps, NotificationType } from './src/types';

// --- Pre-warm function ---
import { prewarmVerification } from './src/services/FaceDetectionService';

// --- Navigation Ref ---
type CombinedParamList = RootStackParamList & AuthStackParamList;
export const navigationRef = React.createRef<NavigationContainerRef<CombinedParamList>>();

// --- Helper Type for Notifications ---
interface NotifLike {
  id?: string;
  title?: string | null;
  body?: string | null;
  timestamp?: number;
  data?: Record<string, any>;
}

// --- Deep Linking Configuration ---
const linking = {
  prefixes: ['my-smart-app://'],
  config: {
    screens: {
      Home: 'home',
      BLECheckScreen: 'join-session/:sessionId',
      FaceScanScreen: 'face-scan/:sessionId',
      ScanQRScreen: 'qr-scan',
      NFCTapScreen: 'nfc-tap',
      SoundListenerScreen: 'sound-listener',
      P2PVerificationScreen: 'p2p-session/:sessionId',
      Notifications: 'notifications',
      SeatSelection: 'seat-select',
      CollegeRegistration: 'register',
      Login: 'login',
      Signup: 'signup',
    },
  },
};

function App(): React.JSX.Element | null {
  const [initializing, setInitializing] = useState(true);
  const [user, setUser] = useState<FirebaseAuthTypes.User | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [liveNotifications, setLiveNotifications] = useState<NotificationItemProps[]>([]);

  // --- Reset Notification Count ---
  const resetNotificationCount = useCallback(() => {
    setNotificationCount(0);
    setLiveNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  // --- Add Live Notification ---
  const addLiveNotification = useCallback((notif: NotifLike | undefined) => {
    if (!notif?.id || !notif.title || !notif.body) {
      console.warn('[App] addLiveNotification: Invalid notification object.', notif);
      return;
    }

    let notificationType: NotificationType = 'general';
    const action = notif.data?.action as string | undefined;

    // ✅ Map all action types
    if (action === 'VIEW_INSIGHTS') {
      notificationType = 'general';
    } else if (
      action === 'OPEN_SCANNER' || 
      action === 'JOIN_SESSION_ACTION' ||
      action === 'OPEN_NFC_SCANNER' ||
      action === 'OPEN_SOUND_RECEIVER'
    ) {
      notificationType = 'session_start';
    } else if (action === 'OPEN_P2P_SCREEN') {
      notificationType = 'p2p_session_start';
    }

    const newNotification: NotificationItemProps = {
      id: notif.id,
      title: notif.title,
      message: notif.body,
      timestamp: new Date(Date.now()),
      read: false,
      type: notificationType,
      data: notif.data,
    };

    setLiveNotifications(prev => [newNotification, ...prev.slice(0, 49)]);
    console.log('[App] Added live notification:', newNotification.title);
  }, []);

  // --- Firebase Auth State Listener ---
  useEffect(() => {
    const subscriber = auth().onAuthStateChanged(currentUser => {
      setUser(currentUser);
      if (!currentUser) {
        setNotificationCount(0);
        setLiveNotifications([]);
      }
      if (initializing) setInitializing(false);
      console.log('[App] Auth State Changed, User:', currentUser ? currentUser.uid : null);
    });
    return subscriber;
  }, [initializing]);

  // --- Pre-warm face verification cache on app start ---
  useEffect(() => {
    if (!user || initializing) return;

    console.log('🔥 [App] Pre-warming face verification cache...');
    
    prewarmVerification()
      .then(() => {
        console.log('✅ [App] Face verification cache ready!');
      })
      .catch(error => {
        console.warn('⚠️ [App] Pre-warm failed (non-critical):', error);
      });
  }, [user, initializing]);

  // ✅ FIXED: Complete Navigation Handler
  const handleNavigationAction = useCallback(
    (sessionId: string | undefined, action: string | undefined) => {
      if (!sessionId || !action) {
        console.warn('[App] handleNavigationAction: Missing sessionId or action.');
        return;
      }

      const tryNavigate = (name: keyof RootStackParamList, params: any) => {
        if (navigationRef.current && navigationRef.current.isReady()) {
          try {
            navigationRef.current.navigate(name, params);
            console.log(`✅ [App] Navigated to ${name}`);
          } catch (navigationError) {
            console.error(`[App] Navigation failed for ${name}:`, navigationError);
            Alert.alert('Navigation Error', `Could not open screen ${name}.`);
          }
        } else {
          console.warn('[App] Navigator not ready. Retrying in 1.5s...');
          setTimeout(() => tryNavigate(name, params), 1500);
        }
      };

      // ✅ ALL session actions → Face Verification FIRST with nextAction
      const sessionActions = [
        'OPEN_SCANNER',
        'JOIN_SESSION_ACTION',
        'OPEN_P2P_SCREEN',
        'OPEN_NFC_SCANNER',
        'OPEN_SOUND_RECEIVER',
      ];

      if (sessionActions.includes(action)) {
        console.log(`[App] 🔒 Redirecting to Face Verification for action: ${action}`);
        
        tryNavigate('FaceScanScreen', { 
          sessionId,
          nextAction: action, // ✅ Pass action to determine post-verification route
        });
      }
      // --- Insights Action ---
      else if (action === 'VIEW_INSIGHTS') {
        console.log(`[App] 📊 Navigate to Insights for session ${sessionId}`);
        Alert.alert('Navigate', `Prototype: Open Insights for session ${sessionId}`);
      } 
      // --- Unhandled Actions ---
      else {
        console.log(`[App] ⚠️ Unhandled action: ${action} for session ${sessionId}`);
        Alert.alert('Unknown Action', `Action "${action}" is not supported yet.`);
      }
    },
    []
  );

  // --- FCM & Notifee Listeners ---
  useEffect(() => {
    // ✅ Foreground Message Listener
    const unsubscribeFCM = messaging().onMessage(async remoteMessage => {
      console.log('[App] FCM Message Received in Foreground:', remoteMessage);
      
      if (remoteMessage.notification) {
        const displayedNotifId = await notifee.displayNotification({
          title: remoteMessage.notification.title,
          body: remoteMessage.notification.body,
          data: remoteMessage.data,
          android: { 
            channelId: 'session_alerts', 
            importance: AndroidImportance.HIGH,
            pressAction: { id: 'default' },
          },
          ios: { 
            foregroundPresentationOptions: { 
              alert: true, 
              badge: true, 
              sound: true 
            } 
          },
        });

        const fcmNotifLike: NotifLike = {
          id: displayedNotifId,
          title: remoteMessage.notification.title,
          body: remoteMessage.notification.body,
          data: remoteMessage.data,
        };

        setNotificationCount(prev => prev + 1);
        addLiveNotification(fcmNotifLike);
      } else {
        console.log('[App] Data-only message:', remoteMessage.data);
      }
    });

    // ✅ Background -> Foreground (App opened from notification)
    const unsubscribeOpenedApp = messaging().onNotificationOpenedApp(remoteMessage => {
  console.log('[App] FCM Notification opened app from background:', remoteMessage.data);
  
  if (remoteMessage.data) {
    setTimeout(() => {
      handleNavigationAction(
        remoteMessage.data?.sessionId as string | undefined,  // ✅ Optional chaining
        remoteMessage.data?.action as string | undefined      // ✅ Optional chaining
      );
    }, 500);
  }
});

    // ✅ Quit State -> Opened (App was completely closed)
   // ✅ Quit State -> Opened (App was completely closed)
messaging()
  .getInitialNotification()
  .then(remoteMessage => {
    if (remoteMessage?.data) {
      console.log('[App] FCM Notification opened app from quit state:', remoteMessage.data);
      
      setTimeout(() => {
        handleNavigationAction(
          remoteMessage.data?.sessionId as string | undefined, // ✅ Add optional chaining
          remoteMessage.data?.action as string | undefined      // ✅ Add optional chaining
        );
      }, 1500);
    }
  })
  .catch(err => console.error('[App] getInitialNotification error:', err));

    // ✅ Notifee Foreground Event Listener
    const unsubscribeNotifeeForeground = notifee.onForegroundEvent(
      ({ type, detail }: Event) => {
        if (type === EventType.DELIVERED) {
          console.log('[App] Notifee Notification Delivered:', detail.notification?.title);
          setNotificationCount(prev => prev + 1);
          addLiveNotification(detail.notification);
        }

        if (type === EventType.PRESS && detail.notification?.data) {
          console.log('[App] Notifee Notification Tapped:', detail.notification.data);
          handleNavigationAction(
            detail.notification.data.sessionId as string,
            detail.notification.data.action as string | undefined
          );
        }

        if (type === EventType.ACTION_PRESS && detail.pressAction?.id && detail.notification?.data) {
          console.log('[App] Notifee Action Button Pressed:', detail.pressAction.id);
          handleNavigationAction(
            detail.notification.data.sessionId as string,
            detail.pressAction.id
          );
        }
      }
    );

    // ✅ iOS: Register for remote notifications
    if (Platform.OS === 'ios') {
      messaging().registerDeviceForRemoteMessages();
    }

    // ✅ Create Notification Channels (Android)
    notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });
    
    notifee.createChannel({
      id: 'session_alerts',
      name: 'Session Alerts',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
    
    notifee.createChannel({
      id: 'session_end',
      name: 'Session End',
      importance: AndroidImportance.DEFAULT,
    });

    // ✅ Cleanup
    return () => {
      unsubscribeFCM();
      unsubscribeNotifeeForeground();
      if (unsubscribeOpenedApp && typeof unsubscribeOpenedApp === 'function') {
        unsubscribeOpenedApp();
      }
    };
  }, [handleNavigationAction, addLiveNotification]);

  // ✅ Firestore Session Listener
  useEffect(() => {
    let unsubscribeFirestore: (() => void) | undefined;
    
    const setupNotifications = async () => {
      if (!user || initializing) {
        console.log('⏸️ [App] Waiting for user login...');
        return;
      }

      try {
        console.log('🚀 [App] Setting up notifications for user:', user.uid);
        
        // Step 1: Initialize class (non-blocking)
        await initializeStudentClass();
        console.log('✅ [App] Class initialized');
        
      } catch (error: any) {
        console.warn('⚠️ [App] Class initialization warning:', error.message);
        // Don't block - let listener start anyway
      }

      try {
        // Step 2: Start listener (always try, even if class init failed)
        console.log('🔄 [App] Starting session listener...');
        unsubscribeFirestore = await startSessionListener();
        console.log('✅ [App] Session listener active');
        
      } catch (error: any) {
        console.error('❌ [App] Listener setup failed:', error);
        
        // Only show alert for critical errors
        if (error.code === 'permission-denied') {
          Alert.alert(
            'Permission Error',
            'Unable to access attendance sessions. Please check your permissions.'
          );
        }
      }
    };
    
    setupNotifications();
    
    return () => {
      if (unsubscribeFirestore) {
        console.log('🛑 [App] Cleaning up listener');
        unsubscribeFirestore();
      }
    };
  }, [user, initializing]);

  // --- Loading Screen ---
  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing App...</Text>
      </View>
    );
  }

  // --- Main App Render ---
  return (
    <SafeAreaProvider>
      <NavigationContainer
        ref={navigationRef}
        linking={linking}
        fallback={
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading navigation...</Text>
          </View>
        }
      >
        {user ? (
          <AppNavigator
            notificationCount={notificationCount}
            liveNotifications={liveNotifications}
            resetNotificationCount={resetNotificationCount}
          />
        ) : (
          <AuthStack />
        )}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    fontSize: 18,
    color: '#333',
    marginTop: 10,
    fontWeight: '500',
  },
});

export default App;