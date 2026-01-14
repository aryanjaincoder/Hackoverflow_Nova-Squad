import firestore from '@react-native-firebase/firestore';
import notifee from '@notifee/react-native';

const userClass = 'YOUR_STUDENT_CLASS_NAME'; // Yeh value aapko user ke profile se leni padegi

async function displayLocalNotification(sessionData: any, sessionId: string) {
  // 1. Channel ID ki zaroorat hoti hai
  const channelId = await notifee.createChannel({
    id: 'session_alerts',
    name: 'Session Alerts',
    sound: 'default',
  });

  // 2. Notification dikhayein "Join Session" button ke saath
  await notifee.displayNotification({
    title: `Attendance Started: ${sessionData.subject}`,
    body: `Session for ${sessionData.class} has begun. Tap to scan.`,
    data: {
      sessionId: sessionId,
      action: 'OPEN_SCANNER', // Yeh data hum button tap hone par use karenge
    },
    android: {
      channelId,
      // Notification ko dismiss nahi hone denge jab tak student check-in nahi karta
      ongoing: true, 
      pressAction: {
        id: 'default', // Notification body par click karne ka action
        launchActivity: 'default',
      },
      actions: [
        {
          title: 'Join Session',
          pressAction: {
            id: 'JOIN_SESSION_ACTION', // Button press karne ka unique ID
            launchActivity: 'default',
          },
        },
      ],
    },
  });
}

export const startSessionListener = (navigation: any) => {
  // Listener sirf active sessions ke liye jo student ki class se match karte hain
  return firestore()
    .collection('attendance_sessions')
    .where('class', '==', userClass) 
    .where('status', '==', 'active')
    .onSnapshot(querySnapshot => {
      querySnapshot.docChanges().forEach(change => {
        if (change.type === 'added') {
          // Naya document bana hai -> Session Start ho gaya
          const sessionData = change.doc.data();
          const sessionId = change.doc.id;
          console.log('New active session detected:', sessionId);
          
          // Local Notification trigger karein
          displayLocalNotification(sessionData, sessionId);
        }
      });
    });
};