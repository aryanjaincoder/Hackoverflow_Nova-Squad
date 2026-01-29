// App.tsx - FIXED WITH GALLERY ENROLLMENT

import React, { useState, useEffect, useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { Alert, View, Platform, Text, StyleSheet, ActivityIndicator } from 'react-native';
import notifee, { EventType, AndroidImportance, Event } from '@notifee/react-native';

// ✅ FIXED: Correct import for react-native-quick-base64


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
import FaceRecognitionService from './src/services/SimpleFaceService';

// ✅ Set global polyfills
global.atob = atob;
global.btoa = btoa;

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
      EnrollFaceScreen: 'enroll-face', // ✅ Added gallery enrollment
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
  // useEffect(() => {
  //   if (!user || initializing) return;

  //   console.log('🔥 [App] Pre-warming face verification cache...');
    
  //   FaceRecognitionService.prewarmVerification()
  //     .then(() => {
  //       console.log('✅ [App] Face verification cache ready!');
  //     })
  //     .catch((error: any) => {
  //       console.warn('⚠️ [App] Pre-warm failed (non-critical):', error);
  //     });
  // }, [user, initializing]);

  // ✅ UPDATED: Navigation Handler with Enrollment Check
  const handleNavigationAction = useCallback(
    async (sessionId: string | undefined, action: string | undefined) => {
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

      // ✅ Session actions that require face verification
      const sessionActions = [
        'OPEN_SCANNER',
        'JOIN_SESSION_ACTION',
        'OPEN_P2P_SCREEN',
        'OPEN_NFC_SCANNER',
        'OPEN_SOUND_RECEIVER',
      ];

      if (sessionActions.includes(action)) {
        console.log(`[App] 🔒 Session action detected: ${action}`);
        
        // ✅ Check if user has enrolled face
        try {
          await FaceRecognitionService.loadEnrolledFaces();
          const status = FaceRecognitionService.getEnrollmentStatus();
          
          if (status.count === 0) {
            // ❌ No enrolled face - redirect to enrollment
            console.log('[App] ❌ No enrolled face detected');
            
            Alert.alert(
              '📸 Face Enrollment Required',
              'Please enroll your face first to use attendance verification.',
              [
                {
                  text: 'Enroll Now',
                  onPress: () => {
                    tryNavigate('EnrollFaceScreen', {});
                  },
                },
                {
                  text: 'Cancel',
                  style: 'cancel',
                },
              ]
            );
            return;
          }
          
          // ✅ Face enrolled - proceed to verification
          console.log(`[App] ✅ Face enrolled (${status.count} face(s)). Proceeding to verification...`);
          
          tryNavigate('FaceScanScreen', { 
            sessionId,
            nextAction: action,
          });
          
        } catch (error) {
          console.error('[App] Error checking enrollment status:', error);
          
          // On error, still allow but warn
          Alert.alert(
            'Warning',
            'Could not verify enrollment status. Continue anyway?',
            [
              {
                text: 'Yes',
                onPress: () => {
                  tryNavigate('FaceScanScreen', { 
                    sessionId,
                    nextAction: action,
                  });
                },
              },
              {
                text: 'Cancel',
                style: 'cancel',
              },
            ]
          );
        }
      }
      else if (action === 'VIEW_INSIGHTS') {
        console.log(`[App] 📊 Navigate to Insights for session ${sessionId}`);
        Alert.alert('Navigate', `Prototype: Open Insights for session ${sessionId}`);
      } 
      else {
        console.log(`[App] ⚠️ Unhandled action: ${action} for session ${sessionId}`);
        Alert.alert('Unknown Action', `Action "${action}" is not supported yet.`);
      }
    },
    []
  );

  // --- FCM & Notifee Listeners ---
  useEffect(() => {
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

    const unsubscribeOpenedApp = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('[App] FCM Notification opened app from background:', remoteMessage.data);
      
      if (remoteMessage.data) {
        setTimeout(() => {
          handleNavigationAction(
            remoteMessage.data?.sessionId as string | undefined,
            remoteMessage.data?.action as string | undefined
          );
        }, 500);
      }
    });

    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage?.data) {
          console.log('[App] FCM Notification opened app from quit state:', remoteMessage.data);
          
          setTimeout(() => {
            handleNavigationAction(
              remoteMessage.data?.sessionId as string | undefined,
              remoteMessage.data?.action as string | undefined
            );
          }, 1500);
        }
      })
      .catch(err => console.error('[App] getInitialNotification error:', err));

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

    if (Platform.OS === 'ios') {
      messaging().registerDeviceForRemoteMessages();
    }

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
        await initializeStudentClass();
        console.log('✅ [App] Class initialized');
      } catch (error: any) {
        console.warn('⚠️ [App] Class initialization warning:', error.message);
      }

      try {
        console.log('🔄 [App] Starting session listener...');
        unsubscribeFirestore = await startSessionListener();
        console.log('✅ [App] Session listener active');
      } catch (error: any) {
        console.error('❌ [App] Listener setup failed:', error);
        
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

  if (initializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing App...</Text>
      </View>
    );
  }

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