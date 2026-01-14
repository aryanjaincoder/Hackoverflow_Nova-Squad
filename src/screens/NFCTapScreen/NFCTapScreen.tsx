// src/screens/NFCTap/NFCTapScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, Animated, ActivityIndicator } from 'react-native';
import NfcManager, { NfcTech } from 'react-native-nfc-manager';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import Icon from 'react-native-vector-icons/MaterialIcons';

interface Props {
  route: {
    params: {
      sessionId: string;
      className: string;
    };
  };
  navigation: any;
}

const NFCTapScreen: React.FC<Props> = ({ route, navigation }) => {
  const { sessionId, className } = route.params;
  const [scanning, setScanning] = useState(true);
  const [studentName, setStudentName] = useState('');
  const [cardUID, setCardUID] = useState('');
  
  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    readNFC();

    return () => {
      NfcManager.cancelTechnologyRequest().catch(() => {});
    };
  }, []);

 const readNFC = async () => {
  try {
    console.log('🔄 Initializing NFC...');
    await NfcManager.start();
    await NfcManager.requestTechnology(NfcTech.Ndef);
    
    console.log('📡 Waiting for NFC card...');
    const tag = await NfcManager.getTag();
    
    // UID extract karo
    const rawUID = tag?.id || '';
    const detectedUID = rawUID.replace(/:/g, '');
    
    console.log('✅ Card Detected - UID:', detectedUID);
    setCardUID(detectedUID);
    
    // 🎯 FIRESTORE SE NAAM FETCH KARO
    const currentUser = auth().currentUser;
    const userId = currentUser?.uid || '';
    
    // Agar user logged in nahi hai toh return kar do
    if (!userId) {
      Alert.alert('Error', 'Please login first');
      navigation.goBack();
      return;
    }
    
    // Firestore se user ka naam fetch karo
    const userDoc = await firestore()
      .collection('users')
      .doc(userId)
      .get();
    
    const userName = userDoc.data()?.name || 'Student';
    
    setStudentName(userName);
    
    // Mark attendance
    await markAttendance(userId, userName, detectedUID);
    
    // Success animation
    setScanning(false);
    
    setTimeout(() => {
      Alert.alert(
        '✅ Attendance Marked!',
        `${userName}\n\nCard UID: ${detectedUID}`,
        [
          {
            text: 'Done',
            onPress: () => navigation.replace('Home')
          }
        ]
      );
    }, 1500);

  } catch (error: any) {
    console.error('❌ NFC Error:', error);
    
    let errorMessage = 'Could not read NFC card';
    
    if (error.toString().includes('cancelled')) {
      errorMessage = 'NFC scan cancelled';
    } else if (error.toString().includes('timeout')) {
      errorMessage = 'NFC timeout - no card detected';
    }
    
    Alert.alert('Error', errorMessage, [
      { text: 'Retry', onPress: () => readNFC() },
      { text: 'Cancel', onPress: () => navigation.goBack() }
    ]);
    
    setScanning(false);
  } finally {
    NfcManager.cancelTechnologyRequest().catch(() => {});
  }
};

 // src/screens/NFCTap/NFCTapScreen.tsx

const markAttendance = async (studentId: string, studentName: string, cardUID: string) => {
  try {
    const sessionRef = firestore().collection('attendance_sessions').doc(sessionId);
    
    // Get current data
    const sessionDoc = await sessionRef.get();
    const presentStudents = sessionDoc.data()?.presentStudents || [];
    
    // Check duplicate
    const alreadyPresent = presentStudents.some((s: any) => s.id === studentId);
    
    if (alreadyPresent) {
      Alert.alert('ℹ️ Already Marked', `${studentName} is already present!`);
      setTimeout(() => navigation.goBack(), 2000);
      return;
    }

    // ✅ FIX: Use Timestamp.now() instead of serverTimestamp
    const newStudent = {
      id: studentId,
      name: studentName,
      timestamp: firestore.Timestamp.now(), // ← CHANGED
      method: 'nfc',
      cardUID: cardUID
    };

    // Update array manually
    await sessionRef.update({
      presentCount: firestore.FieldValue.increment(1),
      presentStudents: [...presentStudents, newStudent] // ← CHANGED
    });

    console.log('✅ Attendance marked:', studentName);
    
  } catch (error) {
    console.error('❌ Firestore Error:', error);
    throw error;
  }
};

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {scanning ? (
          <>
            <Animated.View style={[styles.iconContainer, { transform: [{ scale: pulseAnim }] }]}>
              <Icon name="nfc" size={100} color="#FFF" />
            </Animated.View>

            <Text style={styles.title}>Tap Your NFC Card</Text>
            <Text style={styles.subtitle}>Hold your card near phone's back</Text>
            
            <View style={styles.classInfo}>
              <Icon name="class" size={20} color="rgba(255,255,255,0.8)" />
              <Text style={styles.className}>{className}</Text>
            </View>

            <ActivityIndicator size="large" color="#FFF" style={styles.loader} />
            
            <View style={styles.instructionBox}>
              <Text style={styles.instructionTitle}>📱 Instructions:</Text>
              <Text style={styles.instruction}>• Remove phone case if metal</Text>
              <Text style={styles.instruction}>• Hold card on back (near camera)</Text>
              <Text style={styles.instruction}>• Keep steady for 2-3 seconds</Text>
              <Text style={styles.instruction}>• Wait for confirmation</Text>
            </View>
          </>
        ) : (
          <>
            <Icon name="check-circle" size={100} color="#10B981" />
            <Text style={styles.successTitle}>Attendance Marked! ✅</Text>
            <Text style={styles.successName}>{studentName}</Text>
            {cardUID && (
              <Text style={styles.cardInfo}>Card: {cardUID.slice(0, 8)}...</Text>
            )}
            <Text style={styles.successSubtitle}>You're all set</Text>
          </>
        )}
      </View>

      <View style={styles.footer}>
        <View style={styles.nfcIndicator}>
          <View style={styles.nfcDot} />
          <Text style={styles.nfcText}>NFC {scanning ? 'SCANNING' : 'COMPLETE'}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#10B981',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  iconContainer: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    marginBottom: 20,
  },
  classInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 30,
    gap: 8,
  },
  className: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  loader: {
    marginVertical: 30,
  },
  instructionBox: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginTop: 20,
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 12,
  },
  instruction: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
    lineHeight: 20,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 30,
    textAlign: 'center',
  },
  successName: {
    fontSize: 24,
    fontWeight: '600',
    color: '#FFF',
    marginTop: 16,
    textAlign: 'center',
  },
  cardInfo: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 8,
    fontFamily: 'monospace',
  },
  successSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  nfcIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  nfcDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFF',
  },
  nfcText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFF',
  },
});

export default NFCTapScreen;