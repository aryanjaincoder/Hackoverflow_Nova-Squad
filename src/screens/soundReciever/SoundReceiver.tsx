import React, { useEffect, useState, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  NativeModules,
  NativeEventEmitter,
  PermissionsAndroid,
  Platform,
  Alert
} from 'react-native';
import database from '@react-native-firebase/database';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

const { FrequencyDetector } = NativeModules;
const eventEmitter = new NativeEventEmitter(FrequencyDetector);

interface SoundReceiverProps {
  navigation?: any;
  route?: any;
  targetSessionId?: string;
  onVerified?: (sessionId: string) => void;
  targetFrequency?: number;
  studentName?: string;
  studentId?: string;
}

const SoundReceiver: React.FC<SoundReceiverProps> = ({ 
  navigation,
  route,
  targetSessionId: propSessionId, 
  onVerified: propOnVerified,
  targetFrequency: propFrequency = 14500, // ✅ STEP 5: Updated from 17500 to 14500
  studentName: propStudentName,
  studentId: propStudentId
}) => {
  const routeParams = route?.params || {};
  const sessionId = propSessionId || routeParams.sessionId;
  
  const authUid = auth().currentUser?.uid;
  const finalStudentId = propStudentId || authUid || 'unknown';
  
  const [finalStudentName, setFinalStudentName] = useState(
    propStudentName || auth().currentUser?.displayName || 'Unknown Student'
  );
  
  const targetFrequency = propFrequency;
  
  const handleVerified = propOnVerified || ((verifiedSessionId: string) => {
    console.log('⚡ INSTANT VERIFY! Navigating...');
    navigation?.replace('SuccessScreen', { sessionId: verifiedSessionId });
  });

  const [status, setStatus] = useState('INITIALIZING');
  const [magnitude, setMagnitude] = useState(0);
  const [detectionCount, setDetectionCount] = useState(0);
  const hasVerified = useRef(false);
  const consecutiveDetections = useRef(0);
  const isMounted = useRef(true);
  const detectionRef = useRef<any>(null);
  
  // ✅ OPTIMIZATION: Pre-cache session document
  const cachedSessionRef = useRef<any>(null);
  
  const firebaseKey = authUid || finalStudentId;

  // ✅ PRE-FETCH: Student name + Session doc (BEFORE detection)
  useEffect(() => {
    const preCacheData = async () => {
      if (!authUid) {
        console.error('❌ No auth user');
        setStatus('NOT AUTHENTICATED');
        return;
      }

      try {
        console.log('⚡ Pre-caching data...');
        
        // Parallel fetch: name + session
        const [userDoc, sessionDoc] = await Promise.all([
          firestore().collection('users').doc(authUid).get(),
          firestore().collection('attendance_sessions').doc(sessionId).get()
        ]);

        // Cache student name
        if (userDoc.exists()) {
          const userName = userDoc.data()?.name || auth().currentUser?.displayName || 'Student';
          setFinalStudentName(userName);
          console.log('✅ Name cached:', userName);
        } else {
          setFinalStudentName(auth().currentUser?.displayName || 'Student');
        }

        // Cache session reference
        if (sessionDoc.exists()) {
          cachedSessionRef.current = sessionDoc;
          console.log('✅ Session cached');
        }

      } catch (error) {
        console.error('❌ Pre-cache error:', error);
        setFinalStudentName('Student');
      }
    };

    preCacheData();
  }, [authUid, sessionId]);

  // ✅ ULTRA FAST: Direct batch write (NO transaction overhead)
  const markAttendanceInstantly = async () => {
    if (!authUid) {
      console.error('❌ No authUid');
      return;
    }
    
    try {
      console.log('⚡⚡⚡ INSTANT MARK...');
      
      const sessionRef = firestore().collection('attendance_sessions').doc(sessionId);
      const batch = firestore().batch();
      
      // Use cached doc if available, otherwise fetch
      let doc = cachedSessionRef.current;
      if (!doc) {
        doc = await sessionRef.get();
      }
      
      if (!doc.exists) {
        throw new Error('Session not found');
      }
      
      const data = doc.data();
      const presentStudents = data?.presentStudents || [];
      
      const alreadyPresent = presentStudents.some((s: any) => s.id === finalStudentId);
      
      if (!alreadyPresent) {
        const studentEntry = {
          id: finalStudentId,
          name: finalStudentName,
          timestamp: new Date(),
          method: 'ultrasonic',
          authUid: authUid
        };
        
        presentStudents.push(studentEntry);
        
        batch.update(sessionRef, {
          presentStudents,
          presentCount: presentStudents.length
        });
        
        // Execute batch (faster than transaction)
        await batch.commit();
        console.log('⚡⚡⚡ MARKED:', finalStudentName);
      } else {
        console.log('Already present, skipping...');
      }
      
    } catch (err: any) {
      console.error('❌ Mark failed:', err);
      throw err; // Let caller handle
    }
  };

  const sendDetectionSignal = async () => {
    if (!isMounted.current || hasVerified.current || !authUid) return;
    
    try {
      const ref = database().ref(`live_detections/${sessionId}/${firebaseKey}`);
      detectionRef.current = ref;
      
      // Fire and forget - don't block
      ref.set({
        studentId: finalStudentId,
        authUid: authUid,
        studentName: finalStudentName,
        status: 'detecting',
        timestamp: database.ServerValue.TIMESTAMP,
        magnitude: magnitude,
        detectionCount: consecutiveDetections.current
      }).catch(() => {});
      
      console.log('✅ Live signal sent');
      setStatus('DETECTING');
    } catch (err: any) {
      console.error('⚠️ Live signal failed');
      setStatus('DETECTING');
    }
  };

  const sendVerifiedSignal = async () => {
    if (!isMounted.current || !authUid) return;
    
    try {
      // Non-blocking update
      database()
        .ref(`live_detections/${sessionId}/${firebaseKey}`)
        .update({
          status: 'verified',
          verifiedAt: database.ServerValue.TIMESTAMP,
          studentName: finalStudentName
        }).catch(() => {});
    } catch (err) {}
  };

  useEffect(() => {
    isMounted.current = true;
    let subscription: any;

    const startDetection = async () => {
      try {
        if (!authUid) {
          setStatus('NOT AUTHENTICATED');
          Alert.alert('Error', 'Please login first');
          return;
        }

        if (Platform.OS === 'android') {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
          );
          
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            setStatus('PERMISSION DENIED');
            Alert.alert('Permission Required', 'Microphone access needed');
            return;
          }
        }

       subscription = eventEmitter.addListener('FrequencyDetected', async (data) => {
    if (hasVerified.current || !isMounted.current) return;

    setMagnitude(data.magnitude);

    if (data.detected) {
        consecutiveDetections.current += 1;
        const count = consecutiveDetections.current;
        setDetectionCount(count);

        // 🔥 INSTANT VERIFICATION (1 detection = success)
        if (count >= 1 && !hasVerified.current) {  // Was: count >= 2
            hasVerified.current = true;
            setStatus('⚡ VERIFYING...');
            
            try {
                FrequencyDetector.stopDetection();
            } catch (e) {}
            
            await Promise.all([
                markAttendanceInstantly(),
                sendVerifiedSignal()
            ]);
            
            setStatus('✅ DONE!');
            
            if (isMounted.current) {
                handleVerified(sessionId);
            }
        }
    } else {
        if (consecutiveDetections.current > 0) {
            consecutiveDetections.current = Math.max(0, consecutiveDetections.current - 1);
            setDetectionCount(Math.floor(consecutiveDetections.current));
        }
    }
});

        // Start detection
        await FrequencyDetector.startDetection(targetFrequency);
        setStatus('⚡ READY');
        console.log('⚡⚡⚡ MULTI-TONE MODE @', targetFrequency, 'Hz');

      } catch (error: any) {
        console.error('❌ Start error:', error);
        setStatus('ERROR');
        Alert.alert('Error', error.message);
      }
    };

    startDetection();

    return () => {
      console.log('🧹 Cleanup');
      isMounted.current = false;
      
      if (subscription) {
        subscription.remove();
      }
      
      try {
        FrequencyDetector.stopDetection();
      } catch (e) {}
      
      if (detectionRef.current) {
        detectionRef.current.remove().catch(() => {});
      }
    };
  }, [sessionId, targetFrequency, finalStudentId, finalStudentName, authUid]);

  const magnitudePercent = Math.min(100, magnitude * 500);

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>
          {status === '⚡ READY' && '⚡⚡⚡ MULTI-TONE MODE'}
          {status === 'DETECTING' && '⚡⚡⚡ LOCKING...'}
          {status === '⚡ VERIFYING...' && '⚡⚡⚡ MARKING...'}
          {status === '✅ DONE!' && '✅✅✅ INSTANT SUCCESS!'}
          {status === 'INITIALIZING' && '⚡ Loading...'}
          {status === 'NOT AUTHENTICATED' && '❌ Not Logged In'}
          {status === 'PERMISSION DENIED' && '❌ Permission Denied'}
          {status.startsWith('ERROR') && status}
        </Text>
        
        {detectionCount >= 1 && (
          <Text style={styles.detectionText}>
            ⚡⚡⚡ LOCKING SIGNAL! 
          </Text>
        )}

        <Text style={styles.debugText}>
          {finalStudentName} | MULTI-TONE DETECTION
        </Text>
      </View>

      <View style={styles.meterContainer}>
        <View style={styles.meterBg}>
          <View 
            style={[
              styles.meterFill, 
              { 
                width: `${magnitudePercent}%`,
                backgroundColor: detectionCount >= 1 ? '#10B981' : '#6366F1'
              }
            ]} 
          />
        </View>
        <Text style={styles.meterText}>
          Multi-Tone (14.5kHz) | ADSR SMOOTHING  {/* ✅ STEP 5: Updated text */}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#7C3AED',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 20,
    width: '100%',
  },
  statusText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 18,
    textAlign: 'center',
  },
  detectionText: {
    color: '#10B981',
    fontSize: 16,
    marginTop: 8,
    fontWeight: 'bold',
  },
  debugText: {
    color: '#A5B4FC',
    fontSize: 10,
    marginTop: 8,
    opacity: 0.6,
  },
  meterContainer: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    padding: 20,
  },
  meterBg: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  meterFill: {
    height: '100%',
    borderRadius: 4,
  },
  meterText: {
    color: '#FFF',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default SoundReceiver;