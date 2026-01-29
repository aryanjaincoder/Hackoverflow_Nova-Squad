import { BleManager, Device, State } from 'react-native-ble-plx';
import { PermissionsAndroid, Platform, Alert, NativeModules } from 'react-native';
import firestore from '@react-native-firebase/firestore';

const { BLEAdvertiser } = NativeModules;

const SERVICE_UUID = '4FAFC201-1FB5-459E-8FCC-C5C9C331914B';
const CHARACTERISTIC_UUID = 'BEB5483E-36E1-4688-B7F5-EA07361B26A8';
const MANUFACTURER_ID = 0x004C;

// ✅ Registered Student IDs
const REGISTERED_STUDENT_IDS = [
  'LDtkEVkV9oVfdE66FJyOvAczr8D2',
  'upTrCQsR6hYL5d1iVRIJoKSICS43',
  'N1wCNJxWOrSUkKhJkDEwPvtzo7s1',
];

class BLEService {
  private manager: BleManager | null = null;
  private isScanning: boolean = false;
  private isAdvertising: boolean = false;
  private detectedStudents: Map<string, DetectedStudent> = new Map();
  private scanInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.manager = null;
  }

  private async ensureManager(): Promise<BleManager> {
    if (!this.manager) {
      try {
        console.log('[BLE] 🔧 Initializing BLE Manager...');
        this.manager = new BleManager();
        await new Promise(resolve => setTimeout(resolve, 200));
        console.log('[BLE] ✅ BLE Manager initialized');
      } catch (error) {
        console.error('[BLE] ❌ Failed to initialize BLE Manager:', error);
        throw new Error('BLE initialization failed');
      }
    }
    return this.manager;
  }

  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'android') {
        console.log('[BLE] 📱 Android version:', Platform.Version);
        
        if (Platform.Version >= 31) {
          console.log('[BLE] 🔐 Requesting Android 12+ permissions...');
          
          const permissions = [
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
            PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          ];
          
          const granted = await PermissionsAndroid.requestMultiple(permissions);
          
          console.log('[BLE] Permission results:', granted);
          
          const allGranted = Object.entries(granted).every(
            ([_, status]) => status === PermissionsAndroid.RESULTS.GRANTED
          );
          
          if (!allGranted) {
            const denied = Object.entries(granted)
              .filter(([_, status]) => status !== PermissionsAndroid.RESULTS.GRANTED)
              .map(([key, _]) => key);
            
            console.error('[BLE] ❌ Denied permissions:', denied);
            Alert.alert(
              '⚠️ Permissions Required',
              'BLE proximity detection requires all Bluetooth permissions.\n\nGo to: Settings > Apps > Permissions',
              [{ text: 'OK' }]
            );
            return false;
          }
          
          console.log('[BLE] ✅ All permissions granted');
          return true;
        } else {
          console.log('[BLE] 🔐 Requesting location permission (Android 11-)...');
          
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
          );
          
          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.error('[BLE] ❌ Location permission denied');
            Alert.alert('Permission Required', 'Location permission needed for BLE scanning');
            return false;
          }
          
          console.log('[BLE] ✅ Location permission granted');
          return true;
        }
      }
      
      console.log('[BLE] 📱 iOS - using Info.plist permissions');
      return true;
    } catch (error) {
      console.error('[BLE] ❌ Permission request error:', error);
      return false;
    }
  }

  async checkBluetoothState(): Promise<boolean> {
    try {
      const manager = await this.ensureManager();
      const state = await manager.state();
      
      console.log('[BLE] 📡 Bluetooth state:', state);
      
      if (state !== State.PoweredOn) {
        let message = 'Bluetooth not available';
        
        switch (state) {
          case State.PoweredOff:
            message = '❌ Bluetooth is OFF\n\nPlease turn on Bluetooth in Settings';
            break;
          case State.Unauthorized:
            message = '❌ Bluetooth permission denied\n\nPlease grant permission in Settings';
            break;
          case State.Unsupported:
            message = '❌ Bluetooth not supported on this device';
            break;
          default:
            message = '❌ Bluetooth state: ' + state;
        }
        
        console.error('[BLE]', message);
        Alert.alert('Bluetooth Required', message, [{ text: 'OK' }]);
        return false;
      }
      
      console.log('[BLE] ✅ Bluetooth is ON and ready');
      return true;
    } catch (error) {
      console.error('[BLE] ❌ Bluetooth state check failed:', error);
      return false;
    }
  }

  // ===================================================================
  // ✅ FIXED: Handle shortened student IDs
  // ===================================================================
  async startScanningForStudents(
    onStudentDetected: (students: DetectedStudent[]) => void
  ): Promise<void> {
    try {
      console.log('[BLE] ========================================');
      console.log('[BLE] 🔍 ADMIN: STARTING SCAN (SHORT FORMAT)');
      console.log('[BLE] ========================================');
      console.log('[BLE] 📡 Manufacturer ID: 0x' + MANUFACTURER_ID.toString(16).toUpperCase());
      console.log('[BLE] 👥 Registered students:', REGISTERED_STUDENT_IDS.length);
      console.log('[BLE] 💡 Looking for format: ATT_<12chars>_<8chars>');
      
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.error('[BLE] ❌ Permissions denied');
        return;
      }
      
      const btOn = await this.checkBluetoothState();
      if (!btOn) {
        console.error('[BLE] ❌ Bluetooth not ready');
        return;
      }
      
      const manager = await this.ensureManager();
      
      console.log('[BLE] 📚 Fetching student data from Firestore...');
      const studentDataMap = await this.fetchStudentData();
      console.log('[BLE] ✅ Student data loaded for', studentDataMap.size, 'students');
      
      this.isScanning = true;
      
      console.log('[BLE] 🔍 Starting device scan...');
      
      let scanCount = 0;
      let studentDeviceCount = 0;
      let lastLogTime = Date.now();
      
      manager.startDeviceScan(
        null,
        {
          allowDuplicates: true,
          scanMode: Platform.OS === 'android' ? 2 : undefined,
        },
        async (error, device) => {
          if (error) {
            console.error('[BLE] ❌ Scan error:', error.message);
            
            if (error.message.includes('Permission')) {
              console.error('[BLE] ❌ PERMISSION ERROR - STOPPING SCAN');
              this.stopScanning();
              Alert.alert('Permission Error', 'Lost BLE permission. Please restart app.');
            }
            return;
          }

          if (!device) return;
          scanCount++;
          
          // Log progress
          const now = Date.now();
          if (now - lastLogTime > 5000) {
            console.log('[BLE] 📊 Scanned', scanCount, 'devices,', studentDeviceCount, 'students found');
            lastLogTime = now;
          }

          // ✅ CHECK MANUFACTURER DATA
          let studentInfo: { studentId: string; className: string } | null = null;
          
          if (device.manufacturerData) {
            try {
              const base64Data = device.manufacturerData;
              
              // Decode base64
              let decoded = '';
              try {
                decoded = Buffer.from(base64Data, 'base64').toString('utf8');
              } catch (e) {
                // Try alternate decode
                try {
                  // @ts-ignore
                  if (typeof atob !== 'undefined') {
                    decoded = atob(base64Data);
                  }
                } catch (e2) {
                  return;
                }
              }
              
              // ✅ FIX: Strip any leading garbage characters
              // Sometimes manufacturer data has extra bytes at the start
              const attIndex = decoded.indexOf('ATT_');
              if (attIndex !== -1) {
                decoded = decoded.substring(attIndex); // Remove everything before "ATT_"
                
                console.log('[BLE] ========================================');
                console.log('[BLE] 🎯 STUDENT DEVICE FOUND!');
                console.log('[BLE] ========================================');
                console.log('[BLE] 📱 Device:', device.name || 'No name');
                console.log('[BLE] 📶 RSSI:', device.rssi);
                console.log('[BLE] 🆔 Device ID:', device.id);
                console.log('[BLE] 📦 Cleaned payload:', decoded);
                
                studentDeviceCount++;
                
                // Parse: "ATT_<shortId>_<shortClass>"
                const parts = decoded.split('_');
                console.log('[BLE] 🔧 Parts:', parts);
                
                if (parts.length >= 3 && parts[0] === 'ATT') {
                  const shortId = parts[1]; // First 12 chars of student ID
                  const shortClass = parts.slice(2).join('_');
                  
                  console.log('[BLE] 📝 Short ID:', shortId);
                  console.log('[BLE] 📝 Short Class:', shortClass);
                  
                  // ✅ MATCH against registered student IDs (prefix match)
                  const matchedStudentId = REGISTERED_STUDENT_IDS.find(
                    id => id.startsWith(shortId)
                  );
                  
                  if (matchedStudentId) {
                    console.log('[BLE] ✅ MATCHED to registered ID:', matchedStudentId);
                    
                    studentInfo = {
                      studentId: matchedStudentId, // Use full ID
                      className: shortClass
                    };
                  } else {
                    console.warn('[BLE] ⚠️ Short ID not found in registered students');
                    console.warn('[BLE] Looking for:', shortId);
                    console.warn('[BLE] In list:', REGISTERED_STUDENT_IDS.map(id => id.substring(0, 12)));
                    return;
                  }
                } else {
                  console.warn('[BLE] ⚠️ Invalid format:', decoded);
                  return;
                }
              }
            } catch (error) {
              // Skip silently
              return;
            }
          }
          
          if (!studentInfo) return;
          
          const { studentId, className } = studentInfo;
          
          console.log('[BLE] ✅ Student registered!');
          
          // Get full student data
          const studentData = studentDataMap.get(studentId) || {
            name: `Student ${studentId.substring(0, 8)}`,
            class: className
          };
          
          const rssi = device.rssi || -100;
          const isInRange = rssi > -70;
          
          let signalQuality = 'Weak';
          if (rssi > -50) signalQuality = 'Excellent';
          else if (rssi > -60) signalQuality = 'Good';
          else if (rssi > -70) signalQuality = 'Fair';
          
          console.log('[BLE] 📶 Signal:', signalQuality, '(', rssi, 'dBm)');
          console.log('[BLE] 📍 In Range:', isInRange ? 'YES ✅' : 'NO ❌');
          
          const detectedStudent: DetectedStudent = {
            id: studentId,
            name: studentData.name || 'Unknown Student',
            className: className,
            rssi: rssi,
            lastSeen: new Date(),
            isInRange: isInRange,
          };
          
          this.detectedStudents.set(studentId, detectedStudent);
          
          console.log('[BLE] ✅ Student added:', detectedStudent.name);
          console.log('[BLE] 📊 Total detected:', this.detectedStudents.size);
          
          const studentList = Array.from(this.detectedStudents.values());
          onStudentDetected(studentList);
          
          console.log('[BLE] ========================================');
        }
      );
      
      console.log('[BLE] ✅ Scan started successfully!');
      
      // Periodic cleanup
      this.scanInterval = setInterval(() => {
        const beforeCount = this.detectedStudents.size;
        this.cleanOldDetections();
        const afterCount = this.detectedStudents.size;
        
        if (beforeCount !== afterCount) {
          console.log('[BLE] 🧹 Cleanup:', (beforeCount - afterCount), 'students removed');
        }
        
        const studentList = Array.from(this.detectedStudents.values());
        onStudentDetected(studentList);
      }, 5000);
      
    } catch (error) {
      console.error('[BLE] ❌ SCAN FAILED:', error);
      Alert.alert('BLE Scan Error', 'Failed to start scanning: ' + error);
    }
  }

  stopScanning(): void {
    console.log('[BLE] 🛑 Stopping BLE scan...');
    
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    if (this.isScanning && this.manager) {
      this.manager.stopDeviceScan();
      console.log('[BLE] ✅ Device scan stopped');
    }
    
    this.isScanning = false;
    this.detectedStudents.clear();
    
    console.log('[BLE] ✅ Scan stopped completely');
  }

  async startAdvertising(studentId: string, className: string): Promise<boolean> {
    try {
      console.log('[BLE] ========================================');
      console.log('[BLE] 📡 STUDENT: STARTING BLE ADVERTISING');
      console.log('[BLE] ========================================');
      console.log('[BLE] 👤 Student ID:', studentId);
      console.log('[BLE] 🏫 Class:', className);
      
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.error('[BLE] ❌ Permissions denied');
        Alert.alert('Permission Required', 'Bluetooth permissions needed');
        return false;
      }
      
      const btOn = await this.checkBluetoothState();
      if (!btOn) {
        console.error('[BLE] ❌ Bluetooth not ready');
        return false;
      }
      
      await this.ensureManager();
      
      if (!BLEAdvertiser) {
        console.error('[BLE] ❌ Native module not found!');
        Alert.alert('Native Module Missing', 'BLE Advertising requires native module');
        return false;
      }
      
      console.log('[BLE] 📡 Calling native advertising...');
      
      const result = await BLEAdvertiser.startAdvertising(studentId, className);
      
      console.log('[BLE] ✅ Advertising started:', result);
      console.log('[BLE] ========================================');
      
      this.isAdvertising = true;
      
      Alert.alert(
        '✅ Broadcasting Active',
        `Your device is now visible to teachers.\n\nNote: Using shortened ID format for compatibility.`,
        [{ text: 'OK' }]
      );
      
      return true;
      
    } catch (error) {
      console.error('[BLE] ❌ Advertising failed:', error);
      Alert.alert('Advertising Error', 'Failed to start: ' + error);
      return false;
    }
  }

  async stopAdvertising(): Promise<boolean> {
    try {
      if (!BLEAdvertiser) {
        console.warn('[BLE] Native module not available');
        return false;
      }
      
      console.log('[BLE] 🛑 Stopping advertising...');
      await BLEAdvertiser.stopAdvertising();
      console.log('[BLE] ✅ Advertising stopped');
      
      this.isAdvertising = false;
      return true;
    } catch (error) {
      console.error('[BLE] Error stopping advertising:', error);
      return false;
    }
  }

  private async fetchStudentData(): Promise<Map<string, any>> {
    const studentDataMap = new Map<string, any>();

    try {
      for (const studentId of REGISTERED_STUDENT_IDS) {
        try {
          console.log('[BLE] 📚 Fetching:', studentId.substring(0, 12) + '...');
          
          const doc = await firestore().collection('users').doc(studentId).get();
          
          if (doc.exists()) {
            const data = doc.data();
            studentDataMap.set(studentId, data);
            console.log('[BLE] ✅ Found:', data?.name || 'No name');
          } else {
            console.warn('[BLE] ⚠️ Not in Firestore:', studentId);
            studentDataMap.set(studentId, {
              name: `Student ${studentId.substring(0, 8)}`,
              class: 'Unknown',
            });
          }
        } catch (error) {
          console.error('[BLE] ❌ Fetch error:', error);
        }
      }

      return studentDataMap;
    } catch (error) {
      console.error('[BLE] ❌ fetchStudentData failed:', error);
      return studentDataMap;
    }
  }

  private cleanOldDetections(): void {
    const now = new Date().getTime();
    const timeout = 30000; // 30 seconds

    this.detectedStudents.forEach((student, id) => {
      const age = now - student.lastSeen.getTime();
      if (age > timeout) {
        console.log('[BLE] 🗑️ Removing:', student.name);
        this.detectedStudents.delete(id);
      }
    });
  }

  destroy(): void {
    console.log('[BLE] 💀 Destroying BLE service...');
    this.stopScanning();
    
    if (this.isAdvertising) {
      this.stopAdvertising();
    }
    
    if (this.manager) {
      this.manager.destroy();
      this.manager = null;
    }
    
    console.log('[BLE] ✅ BLE service destroyed');
  }
}

export interface DetectedStudent {
  id: string;
  name: string;
  className: string;
  rssi: number;
  lastSeen: Date;
  isInRange: boolean;
}

export default new BLEService();