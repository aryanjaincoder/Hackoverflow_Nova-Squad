// BLECheckScreen.tsx

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  Dimensions,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';

// --- 1. Navigation Type Definitions (Match AppNavigator.tsx) ---
type RootStackParamList = {
  Home: undefined;
  BLECheckScreen: { sessionId: string };
  FaceScanScreen: { sessionId: string };
  ScanQRScreen: { sessionId: string; faceVerifiedToken: string };
  SeatSelection: { sessionId: string };
  P2PVerificationScreen: { sessionId: string };
};

type BLECheckScreenRouteProp = RouteProp<RootStackParamList, 'BLECheckScreen'>;
type BLECheckNavigationProp = NativeStackNavigationProp<RootStackParamList>;

const { width } = Dimensions.get('window');
const PING_SIZE = width * 0.7;

// --- 2. Sonar Ping Animation Component ---
const SonarPing: React.FC<{ delay: number }> = ({ delay }) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 0,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim, delay]);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 0],
  });

  return (
    <Animated.View
      style={[
        styles.ping,
        { transform: [{ scale }] },
        { opacity },
      ]}
    />
  );
};

// --- 3. Main BLE Check Screen ---
const BLECheckScreen: React.FC = () => {
  const navigation = useNavigation<BLECheckNavigationProp>();
  const route = useRoute<BLECheckScreenRouteProp>();
  const { sessionId } = route.params;

  const [statusText, setStatusText] = useState('Fetching session details...');
  const [statusIcon, setStatusIcon] = useState('information-outline');
  const [statusColor, setStatusColor] = useState('#5DADE2');
  const [isScanning, setIsScanning] = useState(false);

  const sessionModeRef = useRef<'QR' | 'NFC' | 'P2P' | null>(null);
  const timer1 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timer2 = useRef<ReturnType<typeof setTimeout> | null>(null);
  const navigationTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;

    const fetchAndRunSimulation = async () => {
      try {
        console.log(`[BLECheckScreen] Fetching session: ${sessionId}`);
        const sessionDoc = await firestore()
          .collection('attendance_sessions')
          .doc(sessionId)
          .get();

        if (!mounted) return;

        if (!sessionDoc.exists) {
          setStatusText('Error: Session not found.');
          setStatusIcon('alert-circle-outline');
          setStatusColor('#E74C3C');
          Alert.alert('Error', 'Session not found. Returning to Home.', [
            { text: 'OK', onPress: () => navigation.navigate('Home') },
          ]);
          return;
        }

        const mode = sessionDoc.data()?.mode;
        sessionModeRef.current = mode;
        console.log(`[BLECheckScreen] Session mode: ${mode}`);

        setIsScanning(true);
        setStatusIcon('bluetooth-searching');
        setStatusColor('#5DADE2');
        setStatusText('Scanning for classroom beacon...');

        timer1.current = setTimeout(() => {
          if (!mounted) return;
          setIsScanning(false);
          setStatusIcon('bluetooth-connect');
          setStatusColor('#F1C40F');
          setStatusText('Beacon found! Verifying proximity...');
        }, 2000);

        timer2.current = setTimeout(() => {
          if (!mounted) return;
          setStatusIcon('check-circle-outline');
          setStatusColor('#2ECC71');
          setStatusText('Proximity Confirmed! Loading next step...');
        }, 3500);

        navigationTimer.current = setTimeout(() => {
          if (!mounted) return;
          console.log('[BLECheckScreen] BLE Check Passed (Simulated).');

          if (sessionModeRef.current === 'P2P') {
            console.log('Mode is P2P. Navigating to SeatSelection.');
            navigation.replace('SeatSelection', { sessionId });
          } else {
            console.log(`Mode is ${sessionModeRef.current}. Navigating to FaceScanScreen.`);
            navigation.replace('FaceScanScreen', { sessionId });
          }
        }, 4000);
      } catch (error) {
        if (!mounted) return;
        console.error('Error fetching session data:', error);
        setStatusText('Error: Could not verify session.');
        setStatusIcon('alert-circle-outline');
        setStatusColor('#E74C3C');
        Alert.alert('Error', 'Could not verify session. Returning to Home.', [
          { text: 'OK', onPress: () => navigation.navigate('Home') },
        ]);
      }
    };

    fetchAndRunSimulation();

    return () => {
      mounted = false;
      if (timer1.current) clearTimeout(timer1.current);
      if (timer2.current) clearTimeout(timer2.current);
      if (navigationTimer.current) clearTimeout(navigationTimer.current);
    };
  }, [navigation, sessionId]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={styles.container.backgroundColor} />

      <View style={styles.scannerContainer}>
        {isScanning && (
          <>
            <SonarPing delay={0} />
            <SonarPing delay={500} />
            <SonarPing delay={1000} />
          </>
        )}

        <View style={[styles.iconCircle, { borderColor: statusColor }]}>
          {statusIcon === 'information-outline' ||
          (statusIcon === 'bluetooth-connect' && !isScanning) ? (
            <ActivityIndicator size="large" color={statusColor} />
          ) : (
            <Icon name={statusIcon} size={width * 0.15} color={statusColor} />
          )}
        </View>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Verifying Proximity</Text>
        <Text style={styles.subtitle}>{statusText}</Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Prototype Mode: Simulating BLE Scan</Text>
        <Text style={styles.footerSessionText}>Session ID: {sessionId}</Text>
      </View>
    </View>
  );
};

// --- 4. Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1C1C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerContainer: {
    width: PING_SIZE,
    height: PING_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: '20%',
  },
  ping: {
    width: PING_SIZE,
    height: PING_SIZE,
    borderRadius: PING_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(93, 173, 226, 0.5)',
    position: 'absolute',
  },
  iconCircle: {
    width: width * 0.35,
    height: width * 0.35,
    borderRadius: (width * 0.35) / 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    zIndex: 10,
  },
  content: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 30,
    marginTop: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 15,
  },
  subtitle: {
    fontSize: 16,
    color: '#B0B0C0',
    textAlign: 'center',
    lineHeight: 24,
    minHeight: 50,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    position: 'absolute',
    bottom: 50,
  },
  footerText: {
    fontSize: 13,
    color: '#707080',
  },
  footerSessionText: {
    fontSize: 12,
    color: '#505060',
    marginTop: 5,
  },
});

export default BLECheckScreen;
