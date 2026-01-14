import React, { useState } from 'react';
import { 
    View, 
    Text, 
    StyleSheet, 
    TouchableOpacity, 
    Alert, 
    StatusBar,
    FlatList
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator'; // Path check kar lena
import Icon from 'react-native-vector-icons/MaterialIcons';

// --- Screen Props ---
type VerificationQueueScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'VerificationQueueScreen'>;

interface VerificationQueueScreenProps {
    navigation: VerificationQueueScreenNavigationProp;
}

// --- Mock Data Interface ---
interface QueueItem {
    id: number;
    name: string;
    reason: string;
    type: 'flag' | 'p2p';
}

// --- Mock Data ---
const MOCK_QUEUE: QueueItem[] = [
    { id: 1, name: 'Amit Kumar', reason: '🚩 AI Flag: Location spoofing detected (2km away).', type: 'flag' },
    { id: 2, name: 'Priya Singh', reason: '🚩 AI Flag: Liveness Check Failed (40% match).', type: 'flag' },
    { id: 3, name: 'Rohan Verma', reason: 'P2P Verified by 2 peers (Ankit, Saanvi).', type: 'p2p' },
    { id: 4, name: 'Saanvi Gupta', reason: 'P2P Verified by 3 peers.', type: 'p2p' },
    { id: 5, name: 'Aarav Sharma', reason: '🚩 AI Flag: Marked 5s after session end time.', type: 'flag' },
    { id: 6, name: 'Neha B.', reason: '🚩 AI Flag: Multiple faces detected during liveness check.', type: 'flag' },
    { id: 7, name: 'Karan P.', reason: 'P2P Verified by 1 peer (Rohan).', type: 'p2p' },
    // Yahaan aur data add kar sakte ho 12 tak
];

// --- Component ---
const VerificationQueueScreen: React.FC<VerificationQueueScreenProps> = ({ navigation }) => {
    
    // State to hold the queue, initialized with mock data
    const [queue, setQueue] = useState<QueueItem[]>(MOCK_QUEUE);

    // --- Action Handler ---
    const handleAction = (id: number, action: 'Approve' | 'Reject') => {
        // Simulate action by removing item from the list
        setQueue(prevQueue => prevQueue.filter(item => item.id !== id));
        
        Alert.alert(
            `Action: ${action}`, 
            `Item ${id} has been ${action.toLowerCase()}d.`
        );
    };

    // --- Render Item for FlatList ---
    const renderQueueItem = ({ item }: { item: QueueItem }) => (
        <View style={styles.itemCard}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={[
                styles.itemReason,
                item.type === 'flag' && styles.flagText // Flag wale text ko red karega
            ]}>
                {item.reason}
            </Text>
            <View style={styles.buttonContainer}>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleAction(item.id, 'Reject')}
                >
                    <Icon name="close" size={16} color="#FFF" />
                    <Text style={styles.actionButtonText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleAction(item.id, 'Approve')}
                >
                    <Icon name="check" size={16} color="#FFF" />
                    <Text style={styles.actionButtonText}>Approve</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    // --- Main Render ---
    return (
        <>
            <StatusBar barStyle="light-content" backgroundColor="#111827" />
            <View style={styles.container}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Icon name="arrow-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Smart Verification Queue</Text>
                </View>
                
                <FlatList
                    data={queue}
                    renderItem={renderQueueItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 20, paddingBottom: 20 }}
                    ListHeaderComponent={
                        <Text style={styles.listSubTitle}>
                            Review AI-flagged entries and P2P requests ({queue.length} pending)
                        </Text>
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Icon name="task-alt" size={60} color="#059669" />
                            <Text style={styles.emptyText}>All items have been reviewed!</Text>
                        </View>
                    }
                />
            </View>
        </>
    );
};

// --- Styles ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111827', // Admin dark background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#374151'
    },
    backButton: {
        padding: 8,
        marginRight: 16,
        marginLeft: -8 
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    listSubTitle: {
        fontSize: 15,
        color: '#9CA3AF',
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    // --- Item Card Styles ---
    itemCard: {
        backgroundColor: '#1F2937',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#3B82F6', // Default P2P color
    },
    itemName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: 'white',
        marginBottom: 8,
    },
    itemReason: {
        fontSize: 14,
        color: '#E5E7EB', // P2P reason color
        marginBottom: 16,
        lineHeight: 20,
    },
    flagText: {
        color: '#F87171', // Red color for AI flags
        fontWeight: '500',
    },
    // --- Button Styles ---
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#374151',
        paddingTop: 12,
        marginTop: 4,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        marginLeft: 10,
    },
    actionButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        marginLeft: 6,
    },
    rejectButton: {
        backgroundColor: '#DC2626', // Red
    },
    approveButton: {
        backgroundColor: '#059669', // Green
    },
    // --- Empty List Styles ---
    emptyContainer: {
        marginTop: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#059669',
        marginTop: 16,
    }
});

export default VerificationQueueScreen;