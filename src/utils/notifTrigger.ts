// src/utils/notifTrigger.ts - FINAL FIXED VERSION

import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { Alert } from 'react-native';
import auth from '@react-native-firebase/auth';

// ✅ DYNAMIC: Get student's class AND role from Firestore
let STUDENT_CLASS: string | null = null;
let USER_ROLE: string | null = null;

// Initialize student class and role
export const initializeStudentClass = async () => {
  try {
    const userId = auth().currentUser?.uid;
    if (!userId) {
      console.log('[notifTrigger] User not logged in');
      return;
    }

    const userDoc = await firestore().collection('users').doc(userId).get();
    if (userDoc.exists()) {
      const userData = userDoc.data();
      
      // ✅ FIX: Default to 'student' if role doesn't exist
      USER_ROLE = userData?.role || 'student';
      STUDENT_CLASS = userData?.class || null;
      
      console.log('[notifTrigger] User role:', USER_ROLE);
      console.log('[notifTrigger] Student class:', STUDENT_CLASS);
      
      // ✅ Admin doesn't need class field
      if (USER_ROLE === 'admin') {
        console.log('[notifTrigger] Admin user - skipping class requirement');
        return;
      }
      
      // ✅ FIX: Only warn if student has no class (don't show Alert - just log)
      if (USER_ROLE === 'student' && !STUDENT_CLASS) {
        console.warn('[notifTrigger] ⚠️ Student has no class field! Will not receive targeted notifications.');
        // ❌ REMOVED ALERT - It's annoying and blocks the app flow
        // Don't throw - let app continue
      }
    }
  } catch (error) {
    console.error('[notifTrigger] Error getting student class:', error);
  }
};

// --- Notification for Session START ---
async function displaySessionStartNotification(
  sessionData: FirebaseFirestoreTypes.DocumentData,
  sessionId: string
): Promise<string | undefined> {
  try {
    const channelId = await notifee.createChannel({
      id: 'session_alerts',
      name: 'Session Start Alerts',
      sound: 'default',
      importance: AndroidImportance.HIGH,
      vibration: true,
    });

    const mode = sessionData.mode || 'QR';
    let pressActionId: string;
    let dataAction: string;
    let actionButtonTitle: string;
    let notificationBody: string;

    const subjectName = sessionData.subject || 'Class';
    const className = sessionData.className || sessionData.class;

    switch (mode) {
      case 'P2P':
        pressActionId = 'OPEN_P2P_SCREEN';
        dataAction = 'OPEN_P2P_SCREEN';
        actionButtonTitle = 'Join P2P Session';
        notificationBody = `P2P session for ${className} has begun. Tap to join.`;
        break;
      
      case 'NFC':
        pressActionId = 'OPEN_NFC_SCANNER';
        dataAction = 'OPEN_NFC_SCANNER';
        actionButtonTitle = 'Tap NFC';
        notificationBody = `NFC session for ${className}. Tap your phone to mark attendance.`;
        break;
      
      case 'SOUND':
        pressActionId = 'OPEN_SOUND_RECEIVER';
        dataAction = 'OPEN_SOUND_RECEIVER';
        actionButtonTitle = 'Listen for Signal';
        notificationBody = `Sound-based session for ${className}. Keep app open.`;
        break;
      
      default: // QR
        pressActionId = 'JOIN_SESSION_ACTION';
        dataAction = 'OPEN_SCANNER';
        actionButtonTitle = 'Scan QR';
        notificationBody = `QR session for ${className}. Tap to scan code.`;
    }

    console.log(
      `[notifTrigger] 📲 Displaying START notification for session: ${sessionId} (Mode: ${mode})`
    );

    const notificationId = await notifee.displayNotification({
      title: `📚 ${subjectName} - Attendance Started`,
      body: notificationBody,
      data: { 
        sessionId: sessionId, 
        action: dataAction,
        mode: mode 
      },
      android: {
        channelId,
        importance: AndroidImportance.HIGH,
        ongoing: true,
        pressAction: { id: 'default' },
        actions: [
          { 
            title: actionButtonTitle, 
            pressAction: { id: pressActionId } 
          }
        ],
        color: '#1E3A8A',
      },
      ios: {
        sound: 'default',
        foregroundPresentationOptions: { 
          alert: true, 
          badge: true, 
          sound: true 
        },
        categoryId: 'session_actions',
      },
    });

    console.log(
      `[notifTrigger] ✅ START notification displayed with ID: ${notificationId}`
    );

    await notifee.setNotificationCategories([
      { 
        id: 'session_actions', 
        actions: [{ id: pressActionId, title: actionButtonTitle }] 
      },
    ]);

    return notificationId;
  } catch (error) {
    console.error('[notifTrigger] ❌ Notifee display START error:', error);
    return undefined;
  }
}

// --- Notification for Session END ---
async function displaySessionEndNotification(
  sessionData: FirebaseFirestoreTypes.DocumentData,
  sessionId: string
): Promise<string | undefined> {
  try {
    const channelId = await notifee.createChannel({
      id: 'session_end',
      name: 'Session End Alerts',
      importance: AndroidImportance.DEFAULT,
      sound: 'default',
    });

    console.log(`[notifTrigger] Displaying END notification for session: ${sessionId}`);

    const userId = auth().currentUser?.uid;
    let wasPresent = false;

    if (userId) {
      const attendanceLog = await firestore()
        .collection('attendance_logs')
        .where('sessionId', '==', sessionId)
        .where('studentId', '==', userId)
        .limit(1)
        .get();
      
      wasPresent = !attendanceLog.empty && attendanceLog.docs[0].data().status === 'present';
    }

    const subjectName = sessionData.subject || 'Class';
    const className = sessionData.className || sessionData.class;

    const notificationId = await notifee.displayNotification({
      title: wasPresent ? `✅ Attendance Marked` : `⏰ Session Ended`,
      body: wasPresent
        ? `Your attendance for ${subjectName} has been recorded.`
        : `Session for ${className} has ended. You were marked absent.`,
      data: { sessionId: sessionId, action: 'VIEW_INSIGHTS' },
      android: {
        channelId,
        importance: AndroidImportance.DEFAULT,
        pressAction: { id: 'default' },
        actions: wasPresent
          ? [{ title: 'View Stats', pressAction: { id: 'VIEW_INSIGHTS' } }]
          : [],
      },
      ios: {
        sound: 'default',
        foregroundPresentationOptions: { alert: true, badge: true, sound: true },
        categoryId: wasPresent ? 'session_end_actions' : undefined,
      },
    });

    console.log(`[notifTrigger] END notification displayed with ID: ${notificationId}`);

    if (wasPresent) {
      await notifee.setNotificationCategories([
        { 
          id: 'session_end_actions', 
          actions: [{ id: 'VIEW_INSIGHTS', title: 'View Stats' }] 
        },
      ]);
    }

    return notificationId;
  } catch (error) {
    console.error('[notifTrigger] Notifee display END error:', error);
    return undefined;
  }
}

// --- Firestore listener ---
export const startSessionListener = async () => {
  // ✅ Auto-initialize if not already done
  if (!USER_ROLE) {
    console.log('[notifTrigger] User role not initialized, initializing now...');
    await initializeStudentClass();
  }

  // ✅ ADMIN CHECK - Admins don't get student notifications
  if (USER_ROLE === 'admin') {
    console.log('[notifTrigger] 👨‍💼 Admin user detected - skipping session listener');
    return () => {
      console.log('[notifTrigger] Admin cleanup (no-op)');
    };
  }

  // ✅ FIX: Allow listener to run even if class is not set (but warn user)
  if (!STUDENT_CLASS) {
    console.warn('[notifTrigger] ⚠️ Student class not set! Listening to ALL sessions (not recommended).');
  } else {
    console.log(`[notifTrigger] 🎯 Starting listener for class: ${STUDENT_CLASS}`);
  }

  // ✅ CRITICAL FIX: Only listen to 'active' status
  // Removed 'ended' from query - we'll detect it through modifications
  let query = firestore()
    .collection('attendance_sessions')
    .where('status', '==', 'active'); // ✅ ONLY ACTIVE

  // ✅ Only filter by class if STUDENT_CLASS exists
  if (STUDENT_CLASS) {
    query = query.where('class', '==', STUDENT_CLASS);
  }

  // ✅ CRITICAL: Listen WITHOUT includeMetadataChanges to avoid cache issues
  const unsubscribe = query.onSnapshot(
    querySnapshot => {
      console.log('🔔 [notifTrigger] Firestore snapshot received! Docs count:', querySnapshot.docs.length);
      console.log('📊 [notifTrigger] Snapshot metadata:', {
        fromCache: querySnapshot.metadata.fromCache,
        hasPendingWrites: querySnapshot.metadata.hasPendingWrites
      });
      
      if (querySnapshot.docs.length === 0) {
        console.log('📭 [notifTrigger] No matching sessions found.');
        return;
      }

      querySnapshot.docChanges().forEach(change => {
        const sessionData = change.doc.data();
        const sessionId = change.doc.id;

        console.log(`📝 [notifTrigger] Change detected:`, {
          type: change.type,
          sessionId,
          status: sessionData.status,
          class: sessionData.class,
          subject: sessionData.subject,
          mode: sessionData.mode,
          fromCache: change.doc.metadata.fromCache,
          hasPendingWrites: change.doc.metadata.hasPendingWrites
        });

        // ✅ Skip cached or pending writes
        if (change.doc.metadata.fromCache || change.doc.metadata.hasPendingWrites) {
          console.log('⚠️ [notifTrigger] Ignoring cached/pending data');
          return;
        }

        const previousData =
          change.type === 'modified' && change.oldIndex !== -1
            ? querySnapshot.docs[change.oldIndex]?.data()
            : null;

        // ✅ Scenario 1: New ACTIVE session added
        if (change.type === 'added' && sessionData.status === 'active') {
          console.log(`✅ [notifTrigger] New ACTIVE session detected: ${sessionId}`);
          displaySessionStartNotification(sessionData, sessionId);
        }
        // ✅ Scenario 2: Session becomes ACTIVE
        else if (
          change.type === 'modified' &&
          sessionData.status === 'active' &&
          previousData?.status !== 'active'
        ) {
          console.log(`✅ [notifTrigger] Session became ACTIVE: ${sessionId}`);
          displaySessionStartNotification(sessionData, sessionId);
        }
        // ✅ Scenario 3: Session removed from active (it was ended)
        else if (change.type === 'removed') {
          console.log(`🛑 [notifTrigger] Session REMOVED from active: ${sessionId}`);
          displaySessionEndNotification(sessionData, sessionId);
        } else {
          console.log(`ℹ️ [notifTrigger] Ignoring change - Type: ${change.type}, Status: ${sessionData.status}`);
        }
      });
    },
    error => {
      console.error('[notifTrigger] ❌ Firestore Listener Error:', error);
      if ((error as any).code === 'permission-denied') {
        Alert.alert(
          'Permission Error',
          'Could not listen for session updates. Please check Firestore security rules.'
        );
      }
    }
  );

  return unsubscribe;
};