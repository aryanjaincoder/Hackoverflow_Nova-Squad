import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import Modal from 'react-native-modal';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { DetectedStudent } from '../services/BLEService';

interface Props {
  visible: boolean;
  students: DetectedStudent[];
  onClose: () => void;
  onStartSession: (studentIds: string[]) => void;
}

const NearbyStudentsModal: React.FC<Props> = ({
  visible,
  students,
  onClose,
  onStartSession,
}) => {
  // ✅ Log when modal is shown with students
  React.useEffect(() => {
    if (visible && students.length > 0) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('📱 [NearbyStudentsModal] Modal opened');
      console.log('👥 Total Students Detected:', students.length);
      console.log('📋 Student Details:');
      students.forEach((s, idx) => {
        console.log(`  ${idx + 1}. ${s.name} (${s.className})`);
        console.log(`     ID: ${s.id.substring(0, 12)}...`);
        console.log(`     Signal: ${s.rssi} dBm | In Range: ${s.isInRange}`);
      });
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  }, [visible, students]);

  const getSignalStrength = (rssi: number) => {
    if (rssi > -50) return { label: 'Excellent', color: '#22C55E', icon: 'signal-cellular-4-bar' };
    if (rssi > -60) return { label: 'Good', color: '#10B981', icon: 'signal-cellular-3-bar' };
    if (rssi > -70) return { label: 'Fair', color: '#F59E0B', icon: 'signal-cellular-2-bar' };
    return { label: 'Weak', color: '#EF4444', icon: 'signal-cellular-1-bar' };
  };

  const renderStudent = ({ item }: { item: DetectedStudent }) => {
    const signal = getSignalStrength(item.rssi);
    const timeSinceDetection = Math.floor(
      (new Date().getTime() - item.lastSeen.getTime()) / 1000
    );

    return (
      <View style={styles.studentCard}>
        <View style={styles.studentInfo}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {item.name.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.studentDetails}>
            <Text style={styles.studentName}>{item.name}</Text>
            <Text style={styles.studentClass}>{item.className}</Text>
            <Text style={styles.studentLastSeen}>
              {timeSinceDetection < 5 ? 'Just now' : `${timeSinceDetection}s ago`}
            </Text>
          </View>
        </View>

        <View style={styles.signalContainer}>
          <Icon name={signal.icon} size={24} color={signal.color} />
          <Text style={[styles.signalText, { color: signal.color }]}>
            {signal.label}
          </Text>
          <Text style={styles.rssiText}>{item.rssi} dBm</Text>
        </View>
      </View>
    );
  };

  const inRangeStudents = students.filter(s => s.isInRange);

  // ✅ Handle session start with detailed logging
  const handleStartSession = () => {
    const studentIds = inRangeStudents.map(s => s.id);
    
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🚀 [NearbyStudentsModal] START SESSION CLICKED');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📊 Total Detected:', students.length);
    console.log('✅ In Range:', inRangeStudents.length);
    console.log('📋 Student IDs to be notified:');
    studentIds.forEach((id, idx) => {
      const student = inRangeStudents[idx];
      console.log(`  ${idx + 1}. ${id.substring(0, 12)}... (${student.name})`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (studentIds.length === 0) {
      console.warn('⚠️ [NearbyStudentsModal] No students in range!');
      return;
    }
    
    // Call the parent handler with student IDs
    console.log('✅ [NearbyStudentsModal] Calling onStartSession with', studentIds.length, 'students');
    onStartSession(studentIds);
  };

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={styles.modal}
      backdropOpacity={0.5}
      animationIn="slideInUp"
      animationOut="slideOutDown"
    >
      <View style={styles.container}>
        <View style={styles.handle} />
        
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Nearby Students</Text>
            <Text style={styles.subtitle}>
              {students.length} detected • {inRangeStudents.length} in range
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {students.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="bluetooth-searching" size={64} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Scanning for students...</Text>
            <Text style={styles.emptySubtitle}>
              Make sure students have their app open
            </Text>
          </View>
        ) : (
          <>
            <FlatList
              data={students}
              renderItem={renderStudent}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />

            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.startButton,
                  inRangeStudents.length === 0 && styles.startButtonDisabled
                ]}
                onPress={handleStartSession}
                disabled={inRangeStudents.length === 0}
                activeOpacity={0.8}
              >
                <Icon name="play-arrow" size={24} color="#FFF" />
                <Text style={styles.startButtonText}>
                  {inRangeStudents.length > 0 
                    ? `Start Session (${inRangeStudents.length} will be notified)`
                    : 'No students in range'
                  }
                </Text>
              </TouchableOpacity>
              
              {/* ✅ NEW: Show info text */}
              {inRangeStudents.length > 0 && (
                <Text style={styles.infoText}>
                  Only students in range will receive notifications
                </Text>
              )}
            </View>
          </>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    paddingBottom: 20,
  },
  handle: {
    width: 40,
    height: 5,
    backgroundColor: '#D1D5DB',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  studentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
  },
  studentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  studentDetails: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  studentClass: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  studentLastSeen: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  signalContainer: {
    alignItems: 'center',
  },
  signalText: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  rssiText: {
    fontSize: 10,
    color: '#9CA3AF',
    marginTop: 2,
  },
  separator: {
    height: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  startButton: {
    flexDirection: 'row',
    backgroundColor: '#3B82F6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  startButtonDisabled: {
    backgroundColor: '#9CA3AF',
    opacity: 0.6,
  },
  startButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // ✅ NEW: Info text style
  infoText: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});

export default NearbyStudentsModal;