import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import LinearGradient from 'react-native-linear-gradient';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';

// Types
type RootStackParamList = {
  Home: undefined;
  CreateSessionScreen: { 
    mode?: 'QR' | 'NFC' | 'SOUND'; 
    className?: string;
    targetStudents?: string[]; // ✅ NEW: BLE-detected students
  };
  SessionActiveScreen: { sessionId: string };
  QRSessionScreen: { sessionId: string; className: string; totalStudents: number };
  NFCSessionScreen: { sessionId: string; className: string };
  SoundSessionScreen: { sessionId: string; className: string };
};

type CreateSessionScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'CreateSessionScreen'
>;
type CreateSessionScreenRouteProp = RouteProp<RootStackParamList, 'CreateSessionScreen'>;

interface Props {
  navigation: CreateSessionScreenNavigationProp;
  route: CreateSessionScreenRouteProp;
}

// Semester Data Structure
interface Subject {
  id: string;
  name: string;
  code: string;
}

interface Semester {
  id: string;
  name: string;
  classId: string; // ✅ NEW: Dashboard-compatible ID
}

interface Course {
  id: string;
  name: string;
  semesters: Semester[];
}

// ✅ UPDATED: Dashboard-compatible data structure
const coursesData: Course[] = [
  {
    id: 'bca',
    name: 'BCA',
    semesters: [
      {
        id: 'bca1',
        name: '1st Semester',
        classId: 'BCA-2024', // ✅ Dashboard format
      },
      {
        id: 'bca2',
        name: '2nd Semester',
        classId: 'BCA-2024',
      },
      {
        id: 'bca3',
        name: '3rd Semester',
        classId: 'BCA-2024',
      },
      {
        id: 'bca4',
        name: '4th Semester',
        classId: 'BCA-2024',
      },
      {
        id: 'bca5',
        name: '5th Semester',
        classId: 'BCA-2024',
      },
      {
        id: 'bca6',
        name: '6th Semester',
        classId: 'BCA-2024',
      },
    ],
  },
  {
    id: 'mca',
    name: 'MCA',
    semesters: [
      {
        id: 'mca1',
        name: '1st Semester',
        classId: 'MCA-2024',
      },
      {
        id: 'mca2',
        name: '2nd Semester',
        classId: 'MCA-2024',
      },
    ],
  },
];

// ✅ UPDATED: Subject list per semester
const subjectsData: { [key: string]: Subject[] } = {
  bca1: [
    { id: 'cs101', name: 'Programming in C', code: 'CS101' },
    { id: 'ma101', name: 'Mathematics-I', code: 'MA101' },
    { id: 'de101', name: 'Digital Electronics', code: 'DE101' },
    { id: 'en101', name: 'English Communication', code: 'EN101' },
  ],
  bca2: [
    { id: 'cs201', name: 'Data Structures', code: 'CS201' },
    { id: 'ma201', name: 'Mathematics-II', code: 'MA201' },
    { id: 'cpp201', name: 'OOP with C++', code: 'CPP201' },
    { id: 'es201', name: 'Environmental Science', code: 'ES201' },
  ],
  bca3: [
    { id: 'cs301', name: 'Database Systems', code: 'CS301' },
    { id: 'wt301', name: 'Web Technologies', code: 'WT301' },
    { id: 'os301', name: 'Operating Systems', code: 'OS301' },
    { id: 'se301', name: 'Software Engineering', code: 'SE301' },
  ],
  bca4: [
    { id: 'java401', name: 'Java Programming', code: 'JAVA401' },
    { id: 'cn401', name: 'Computer Networks', code: 'CN401' },
    { id: 'py401', name: 'Python Programming', code: 'PY401' },
    { id: 'mad401', name: 'Mobile App Development', code: 'MAD401' },
  ],
  bca5: [
    { id: 'ai501', name: 'Artificial Intelligence', code: 'AI501' },
    { id: 'ml501', name: 'Machine Learning', code: 'ML501' },
    { id: 'cc501', name: 'Cloud Computing', code: 'CC501' },
    { id: 'cs501', name: 'Cyber Security', code: 'CS501' },
  ],
  bca6: [
    { id: 'bc601', name: 'Blockchain Technology', code: 'BC601' },
    { id: 'iot601', name: 'Internet of Things', code: 'IOT601' },
    { id: 'bd601', name: 'Big Data Analytics', code: 'BD601' },
    { id: 'proj601', name: 'Project Work', code: 'PROJ601' },
  ],
  mca1: [
    { id: 'aj101', name: 'Advanced Java', code: 'AJ101' },
    { id: 'dm101', name: 'Data Mining', code: 'DM101' },
    { id: 'adb101', name: 'Advanced DBMS', code: 'ADB101' },
  ],
  mca2: [
    { id: 'ml201', name: 'Machine Learning', code: 'ML201' },
    { id: 'do201', name: 'DevOps', code: 'DO201' },
    { id: 'ca201', name: 'Cloud Architecture', code: 'CA201' },
  ],
};

const CreateSessionScreen: React.FC<Props> = ({ navigation, route }) => {
  // ✅ NEW: Extract targetStudents from route params
  const { mode, className, targetStudents } = route.params || {};
  
  // States
  const [selectedMode, setSelectedMode] = useState<'QR' | 'NFC' | 'SOUND'>(
    mode || 'QR'
  );
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<Semester | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [loading, setLoading] = useState(false);
  const [scaleAnim] = useState(new Animated.Value(0));

  // ✅ NEW: Log BLE targeting info on mount
  useEffect(() => {
    if (targetStudents && targetStudents.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('🎯 [CreateSession] BLE TARGETED SESSION');
      console.log('📋 Target Students Count:', targetStudents.length);
      console.log('📋 Target Students:', targetStudents.map(id => id.substring(0, 12) + '...'));
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  }, [targetStudents]);

  useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();
  }, [step]);

  // Mode Config
  const getModeIcon = (mode: 'QR' | 'NFC' | 'SOUND') => {
    switch (mode) {
      case 'QR':
        return 'qr-code-2';
      case 'NFC':
        return 'nfc';
      case 'SOUND':
        return 'graphic-eq';
    }
  };

  const getModeColor = (mode: 'QR' | 'NFC' | 'SOUND') => {
    switch (mode) {
      case 'QR':
        return '#1E3A8A';
      case 'NFC':
        return '#065F46';
      case 'SOUND':
        return '#7C3AED';
    }
  };

  // ✅ UPDATED: Session creation with BLE targeting support
  const handleCreateSession = async () => {
    if (!selectedCourse || !selectedSemester || !selectedSubject) {
      Alert.alert('Error', 'Please select all required fields');
      return;
    }

    setLoading(true);

    try {
      const userId = auth().currentUser?.uid;
      if (!userId) {
        Alert.alert('Error', 'User not authenticated');
        setLoading(false);
        return;
      }

      // ✅ Determine total students based on targeting mode
      let totalStudents = 0;
      
      if (targetStudents && targetStudents.length > 0) {
        // BLE targeted session - use detected students count
        totalStudents = targetStudents.length;
        console.log('[CreateSession] 🎯 Using BLE target count:', totalStudents);
      } else {
        // Normal session - count all students in class
        const studentsSnapshot = await firestore()
          .collection('users')
          .where('role', '==', 'student')
          .where('class', '==', selectedSemester.classId)
          .get();
        totalStudents = studentsSnapshot.size;
        console.log('[CreateSession] 📢 Using class total count:', totalStudents);
      }

      const sessionRef = firestore().collection('attendance_sessions').doc();
      const today = new Date().toISOString().split('T')[0];

      // ✅✅✅ CRITICAL: Session data with BLE targeting support ✅✅✅
      const sessionData = {
        sessionId: sessionRef.id,
        adminId: userId,
        
        // 🎯 KEY FIX: Use classId for notification matching
        class: selectedSemester.classId,        // ✅ "BCA-2024" (Dashboard format)
        className: selectedSemester.classId,    // ✅ Same value
        
        course: selectedCourse.name,
        subject: selectedSubject.name,
        subjectCode: selectedSubject.code,
        mode: selectedMode,
        status: 'active',
        
        totalStudents: totalStudents,
        presentCount: 0,
        presentStudents: [],
        
        // ✅✅✅ NEW: BLE TARGETING FIELDS ✅✅✅
        isTargeted: targetStudents && targetStudents.length > 0, // Boolean flag
        targetStudents: targetStudents || [], // Array of student IDs
        // ✅✅✅ END NEW FIELDS ✅✅✅
        
        teacherName: auth().currentUser?.displayName || 'Admin User',
        createdAt: new Date().toISOString(), // ✅ String format
        startTime: new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        startDate: today,
      };

      await sessionRef.set(sessionData);
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✅ [CreateSession] SESSION CREATED!');
      console.log('📋 Session ID:', sessionRef.id);
      console.log('📋 Class (Dashboard format):', selectedSemester.classId);
      console.log('📋 Mode:', selectedMode);
      console.log('📋 Subject:', selectedSubject.name);
      console.log('📋 Total Students:', totalStudents);
      console.log('🎯 Is Targeted:', targetStudents && targetStudents.length > 0);
      console.log('📋 Target Students Count:', targetStudents?.length || 0);
      if (targetStudents && targetStudents.length > 0) {
        console.log('📋 Target List:', targetStudents.map(id => id.substring(0, 12) + '...'));
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      await new Promise(resolve => setTimeout(resolve, 500));

      setLoading(false);

      // ✅ Different success messages for targeted vs normal sessions
      const isTargeted = targetStudents && targetStudents.length > 0;
      
      Alert.alert(
        isTargeted ? '🎯 Targeted Session Created!' : 'Session Created! 🎉',
        `${selectedMode} session for ${selectedSubject.name} is now active.\n\n` +
        `Class: ${selectedSemester.classId}\n` +
        `${isTargeted 
          ? `Targeted Students: ${totalStudents} (detected via BLE)\n` 
          : `Total Students: ${totalStudents}\n`
        }\n` +
        `${isTargeted 
          ? 'Only detected students will receive notifications.' 
          : 'All students in class will receive notifications.'
        }`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (selectedMode === 'QR') {
                navigation.replace('QRSessionScreen', {
                  sessionId: sessionRef.id,
                  className: selectedSubject.name,
                  totalStudents: totalStudents,
                });
              } else if (selectedMode === 'NFC') {
                navigation.replace('NFCSessionScreen', {
                  sessionId: sessionRef.id,
                  className: selectedSubject.name,
                });
              } else if (selectedMode === 'SOUND') {
                navigation.replace('SoundSessionScreen', {
                  sessionId: sessionRef.id,
                  className: selectedSubject.name,
                });
              }
            }
          }
        ]
      );

    } catch (error: any) {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('❌ [CreateSession] Error:', error);
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      Alert.alert('Error', `Could not create session: ${error.message}`);
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1 && !selectedCourse) {
      Alert.alert('Error', 'Please select a course');
      return;
    }
    if (step === 2 && !selectedSemester) {
      Alert.alert('Error', 'Please select a semester');
      return;
    }
    setStep((prev) => (prev + 1) as 1 | 2 | 3);
    Animated.spring(scaleAnim, {
      toValue: 0,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start(() => {
      scaleAnim.setValue(1);
    });
  };

  const handleBack = () => {
    if (step === 1) {
      navigation.goBack();
    } else {
      setStep((prev) => (prev - 1) as 1 | 2 | 3);
    }
  };

  // Render Functions
  const renderModeSelector = () => (
    <View style={styles.modeSelectorContainer}>
      <Text style={styles.sectionLabel}>Select Mode</Text>
      <View style={styles.modeGrid}>
        {(['QR', 'NFC', 'SOUND'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeCard,
              selectedMode === mode && {
                borderColor: getModeColor(mode),
                borderWidth: 3,
              },
            ]}
            onPress={() => setSelectedMode(mode)}
          >
            <View
              style={[
                styles.modeIconContainer,
                { backgroundColor: getModeColor(mode) + '20' },
              ]}
            >
              <Icon name={getModeIcon(mode)} size={32} color={getModeColor(mode)} />
            </View>
            <Text style={styles.modeTitle}>{mode}</Text>
            {selectedMode === mode && (
              <View style={[styles.selectedBadge, { backgroundColor: getModeColor(mode) }]}>
                <Icon name="check" size={16} color="#FFF" />
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // ✅ NEW: BLE targeting banner
  const renderTargetingBanner = () => {
    if (!targetStudents || targetStudents.length === 0) return null;
    
    return (
      <View style={styles.targetingBanner}>
        <Icon name="bluetooth-connected" size={20} color="#22C55E" />
        <View style={{ flex: 1 }}>
          <Text style={styles.targetingTitle}>🎯 Targeted Session Mode</Text>
          <Text style={styles.targetingSubtitle}>
            {targetStudents.length} students detected via BLE
          </Text>
        </View>
        <Icon name="verified" size={20} color="#22C55E" />
      </View>
    );
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((s) => (
        <View key={s} style={styles.stepItem}>
          <View
            style={[
              styles.stepCircle,
              step >= s && { backgroundColor: getModeColor(selectedMode) },
            ]}
          >
            <Text style={[styles.stepNumber, step >= s && styles.stepNumberActive]}>
              {s}
            </Text>
          </View>
          {s < 3 && (
            <View
              style={[
                styles.stepLine,
                step > s && { backgroundColor: getModeColor(selectedMode) },
              ]}
            />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Text style={styles.stepTitle}>Select Course</Text>
      <View style={styles.cardsContainer}>
        {coursesData.map((course) => (
          <TouchableOpacity
            key={course.id}
            style={[
              styles.selectionCard,
              selectedCourse?.id === course.id && styles.selectionCardActive,
            ]}
            onPress={() => setSelectedCourse(course)}
          >
            <Icon
              name="school"
              size={28}
              color={
                selectedCourse?.id === course.id
                  ? getModeColor(selectedMode)
                  : '#6B7280'
              }
            />
            <Text
              style={[
                styles.selectionCardText,
                selectedCourse?.id === course.id && styles.selectionCardTextActive,
              ]}
            >
              {course.name}
            </Text>
            {selectedCourse?.id === course.id && (
              <Icon name="check-circle" size={24} color={getModeColor(selectedMode)} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );

  const renderStep2 = () => (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Text style={styles.stepTitle}>Select Semester</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {selectedCourse?.semesters.map((semester) => (
          <TouchableOpacity
            key={semester.id}
            style={[
              styles.selectionCard,
              selectedSemester?.id === semester.id && styles.selectionCardActive,
            ]}
            onPress={() => setSelectedSemester(semester)}
          >
            <Icon
              name="calendar-today"
              size={24}
              color={
                selectedSemester?.id === semester.id
                  ? getModeColor(selectedMode)
                  : '#6B7280'
              }
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.selectionCardText,
                  selectedSemester?.id === semester.id && styles.selectionCardTextActive,
                ]}
              >
                {semester.name}
              </Text>
              <Text style={styles.subjectsCount}>
                Class ID: {semester.classId}
              </Text>
            </View>
            {selectedSemester?.id === semester.id && (
              <Icon name="check-circle" size={24} color={getModeColor(selectedMode)} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );

  const renderStep3 = () => (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Text style={styles.stepTitle}>Select Subject</Text>
      <ScrollView showsVerticalScrollIndicator={false}>
        {selectedSemester && subjectsData[selectedSemester.id]?.map((subject) => (
          <TouchableOpacity
            key={subject.id}
            style={[
              styles.selectionCard,
              selectedSubject?.id === subject.id && styles.selectionCardActive,
            ]}
            onPress={() => setSelectedSubject(subject)}
          >
            <Icon
              name="menu-book"
              size={24}
              color={
                selectedSubject?.id === subject.id
                  ? getModeColor(selectedMode)
                  : '#6B7280'
              }
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.selectionCardText,
                  selectedSubject?.id === subject.id && styles.selectionCardTextActive,
                ]}
              >
                {subject.name}
              </Text>
              <Text style={styles.subjectCode}>{subject.code}</Text>
            </View>
            {selectedSubject?.id === subject.id && (
              <Icon name="check-circle" size={24} color={getModeColor(selectedMode)} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Animated.View>
  );

  const renderSummary = () => (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Session Summary</Text>
      <View style={styles.summaryRow}>
        <Icon name="school" size={20} color="#6B7280" />
        <Text style={styles.summaryLabel}>Course:</Text>
        <Text style={styles.summaryValue}>{selectedCourse?.name}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Icon name="calendar-today" size={20} color="#6B7280" />
        <Text style={styles.summaryLabel}>Semester:</Text>
        <Text style={styles.summaryValue}>{selectedSemester?.name}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Icon name="class" size={20} color="#6B7280" />
        <Text style={styles.summaryLabel}>Class ID:</Text>
        <Text style={styles.summaryValue}>{selectedSemester?.classId}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Icon name="menu-book" size={20} color="#6B7280" />
        <Text style={styles.summaryLabel}>Subject:</Text>
        <Text style={styles.summaryValue}>{selectedSubject?.name}</Text>
      </View>
      <View style={styles.summaryRow}>
        <Icon name={getModeIcon(selectedMode)} size={20} color="#6B7280" />
        <Text style={styles.summaryLabel}>Mode:</Text>
        <Text style={styles.summaryValue}>{selectedMode}</Text>
      </View>
      {/* ✅ NEW: Show targeting info in summary */}
      {targetStudents && targetStudents.length > 0 && (
        <View style={styles.summaryRow}>
          <Icon name="bluetooth-connected" size={20} color="#22C55E" />
          <Text style={styles.summaryLabel}>Targeting:</Text>
          <Text style={[styles.summaryValue, { color: '#22C55E', fontWeight: 'bold' }]}>
            {targetStudents.length} BLE Students
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New Session</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* ✅ NEW: BLE Targeting Banner */}
      {renderTargetingBanner()}

      {/* Mode Selector */}
      {renderModeSelector()}

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && (
          <>
            {renderStep3()}
            {selectedSubject && renderSummary()}
          </>
        )}
      </ScrollView>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        {step < 3 ? (
          <TouchableOpacity
            style={[
              styles.nextButton,
              { backgroundColor: getModeColor(selectedMode) },
            ]}
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Icon name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.createButton,
              { backgroundColor: getModeColor(selectedMode) },
              loading && styles.createButtonDisabled,
            ]}
            onPress={handleCreateSession}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Icon name="play-circle" size={24} color="#FFF" />
                <Text style={styles.createButtonText}>
                  {targetStudents && targetStudents.length > 0 
                    ? `Start Targeted Session (${targetStudents.length})`
                    : 'Start Session'
                  }
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  // ✅ NEW: BLE targeting banner styles
  targetingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: '#22C55E',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 20,
    marginTop: 12,
    gap: 8,
  },
  targetingTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#166534',
  },
  targetingSubtitle: {
    fontSize: 12,
    color: '#15803D',
    marginTop: 2,
  },
  modeSelectorContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFF',
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
  },
  modeGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    position: 'relative',
  },
  modeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#9CA3AF',
  },
  stepNumberActive: {
    color: '#FFF',
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  cardsContainer: {
    gap: 12,
  },
  selectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  selectionCardActive: {
    borderColor: '#1E3A8A',
    backgroundColor: '#F0F9FF',
  },
  selectionCardText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  selectionCardTextActive: {
    color: '#1E3A8A',
  },
  subjectsCount: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  subjectCode: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    width: 80,
  },
  summaryValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 12,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFF',
  },
});

export default CreateSessionScreen;