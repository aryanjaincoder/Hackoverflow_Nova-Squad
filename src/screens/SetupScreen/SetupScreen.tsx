// SetupScreen.tsx - Fixed for faceTokens ARRAY structure
// Use this screen ONCE to create faceset, then DELETE this screen

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Clipboard,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import firestore from '@react-native-firebase/firestore';

const FACEPP_CONFIG = {
  API_KEY: 'ZDvzTMxB7tcZSSglzBnllF64dSLodHJt',
  API_SECRET: 'CzUk_i-VIR7c_QmOSvosvXJyxGSyUaR-',
  API_URL: 'https://api-us.faceplusplus.com/facepp/v3',
};

const SetupScreen: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [facesetToken, setFacesetToken] = useState(''); // Empty - will create new
  const [logs, setLogs] = useState<string[]>([]);
  const [migrationStatus, setMigrationStatus] = useState<any>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  // 🔥 Create Global Faceset
  const handleCreateFaceset = async () => {
    setLoading(true);
    setLogs([]);
    addLog('🏗️ Creating global faceset...');

    try {
      const formData = new FormData();
      formData.append('api_key', FACEPP_CONFIG.API_KEY);
      formData.append('api_secret', FACEPP_CONFIG.API_SECRET);
      formData.append('display_name', 'Students Global Faceset');

      const response = await fetch(`${FACEPP_CONFIG.API_URL}/faceset/create`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.faceset_token) {
        const token = data.faceset_token;
        setFacesetToken(token);
        addLog('✅ Faceset created successfully!');
        addLog(`📋 Token: ${token}`);
        
        Clipboard.setString(token);
        
        Alert.alert(
          'Success!',
          `Faceset Token:\n${token}\n\nToken copied to clipboard!\n\nPaste it in FaceVerificationService.ts as GLOBAL_FACESET_TOKEN`,
          [
            {
              text: 'Copy Again',
              onPress: () => Clipboard.setString(token),
            },
            { text: 'OK' }
          ]
        );
      } else {
        addLog(`❌ Error: ${data.error_message}`);
        Alert.alert('Error', data.error_message || 'Failed to create faceset');
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`);
      Alert.alert('Error', 'Failed to create faceset');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Add single face to faceset
  const addFaceToFaceset = async (faceToken: string): Promise<boolean> => {
    try {
      const formData = new FormData();
      formData.append('api_key', FACEPP_CONFIG.API_KEY);
      formData.append('api_secret', FACEPP_CONFIG.API_SECRET);
      formData.append('faceset_token', facesetToken);
      formData.append('face_tokens', faceToken);

      const response = await fetch(`${FACEPP_CONFIG.API_URL}/faceset/addface`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.error_message) {
        addLog(`   ❌ API Error: ${data.error_message}`);
        return false;
      }

      addLog(`   ✅ Added (${data.face_added} faces, total: ${data.face_count})`);
      return true;

    } catch (error) {
      addLog(`   ❌ Network Error: ${error}`);
      return false;
    }
  };

  // 🔥 Migrate Existing Users (FIXED FOR ARRAY)
  const handleMigrateUsers = async () => {
    if (!facesetToken) {
      Alert.alert('Error', 'Enter faceset token first!');
      return;
    }

    setLoading(true);
    setLogs([]);
    addLog('🔄 Starting migration...');
    addLog(`📋 Using faceset: ${facesetToken}`);

    try {
      // Get ALL users (no filter - we'll check manually)
      const usersSnapshot = await firestore()
        .collection('users')
        .get();
      
      addLog(`📊 Found ${usersSnapshot.size} total users`);
      
      if (usersSnapshot.empty) {
        addLog('⚠️ No users found');
        Alert.alert('Info', 'No users found in database');
        setLoading(false);
        return;
      }

      let totalFaces = 0;
      let migrated = 0;
      let failed = 0;
      let skipped = 0;

      for (const userDoc of usersSnapshot.docs) {
        const userId = userDoc.id;
        const userData = userDoc.data();
        const userName = userData.name || userId;
        
        addLog(`\n👤 Processing: ${userName}`);
        
        // ✅ Check for faceTokens ARRAY (Your structure)
        if (userData.faceTokens && Array.isArray(userData.faceTokens)) {
          const faceTokens = userData.faceTokens;
          addLog(`   📦 Found ${faceTokens.length} face tokens`);
          
          let userSuccess = 0;
          let userFailed = 0;
          
          // Add each face token
          for (let i = 0; i < faceTokens.length; i++) {
            const token = faceTokens[i];
            addLog(`   [${i + 1}/${faceTokens.length}] Adding: ${token.substring(0, 20)}...`);
            
            const added = await addFaceToFaceset(token);
            
            if (added) {
              userSuccess++;
              totalFaces++;
            } else {
              userFailed++;
            }
            
            // Small delay to avoid rate limit
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          
          if (userSuccess > 0) {
            addLog(`   ✅ ${userName}: ${userSuccess}/${faceTokens.length} faces added`);
            migrated++;
          } else {
            addLog(`   ❌ ${userName}: All faces failed`);
            failed++;
          }
        }
        // ✅ Fallback: Check for single faceToken
        else if (userData.faceToken) {
          addLog(`   📦 Found single faceToken (old structure)`);
          
          const added = await addFaceToFaceset(userData.faceToken);
          
          if (added) {
            addLog(`   ✅ ${userName} migrated (1 face)`);
            migrated++;
            totalFaces++;
          } else {
            addLog(`   ❌ ${userName} failed`);
            failed++;
          }
          
          await new Promise(resolve => setTimeout(resolve, 300));
        }
        // ✅ Check faceData subcollection (if exists)
        else {
          addLog(`   🔍 Checking faceData subcollection...`);
          
          const faceDataSnapshot = await firestore()
            .collection('users')
            .doc(userId)
            .collection('faceData')
            .get();
          
          if (!faceDataSnapshot.empty) {
            let subSuccess = 0;
            
            for (const faceDoc of faceDataSnapshot.docs) {
              const faceData = faceDoc.data();
              
              if (faceData.faceToken) {
                addLog(`   📦 Found in subcollection: ${faceDoc.id}`);
                
                const added = await addFaceToFaceset(faceData.faceToken);
                
                if (added) {
                  subSuccess++;
                  totalFaces++;
                }
                
                await new Promise(resolve => setTimeout(resolve, 300));
              }
            }
            
            if (subSuccess > 0) {
              addLog(`   ✅ ${userName}: ${subSuccess} faces from subcollection`);
              migrated++;
            } else {
              addLog(`   ❌ ${userName}: No valid faces in subcollection`);
              failed++;
            }
          } else {
            addLog(`   ⚠️ ${userName}: No face data found - needs registration`);
            skipped++;
          }
        }
      }
      
      addLog('\n🎉 ===== MIGRATION COMPLETE =====');
      addLog(`✅ Users migrated: ${migrated}`);
      addLog(`❌ Failed: ${failed}`);
      addLog(`⚠️ Skipped (no data): ${skipped}`);
      addLog(`📊 Total faces added: ${totalFaces}`);
      addLog(`📊 Total users: ${usersSnapshot.size}`);
      
      setMigrationStatus({ 
        migrated, 
        failed, 
        skipped,
        totalFaces,
        total: usersSnapshot.size 
      });
      
      Alert.alert(
        'Migration Complete! 🎉',
        `Migrated: ${migrated}\nFailed: ${failed}\nSkipped: ${skipped}\nTotal Faces: ${totalFaces}`,
        [{ text: 'OK' }]
      );
      
    } catch (error) {
      addLog(`❌ Migration error: ${error}`);
      Alert.alert('Error', 'Migration failed. Check logs.');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Check Faceset Status
  const handleCheckStatus = async () => {
    if (!facesetToken) {
      Alert.alert('Error', 'Enter faceset token first!');
      return;
    }

    setLoading(true);
    addLog('📊 Checking faceset status...');

    try {
      const formData = new FormData();
      formData.append('api_key', FACEPP_CONFIG.API_KEY);
      formData.append('api_secret', FACEPP_CONFIG.API_SECRET);
      formData.append('faceset_token', facesetToken);
      
      const response = await fetch(`${FACEPP_CONFIG.API_URL}/faceset/getdetail`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.faceset_token) {
        addLog('✅ Faceset Status:');
        addLog(`   Name: ${data.display_name || 'N/A'}`);
        addLog(`   Face Count: ${data.face_count}`);
        addLog(`   Token: ${data.faceset_token}`);
        addLog(`   Created: ${new Date(data.create_time * 1000).toLocaleString()}`);
        
        Alert.alert(
          'Faceset Status ✅',
          `Name: ${data.display_name || 'N/A'}\nFaces: ${data.face_count}\nToken: ${data.faceset_token.substring(0, 20)}...\nCreated: ${new Date(data.create_time * 1000).toLocaleString()}`,
          [
            {
              text: 'Copy Token',
              onPress: () => {
                Clipboard.setString(data.faceset_token);
                Alert.alert('Copied!', 'Token copied to clipboard');
              }
            },
            { text: 'OK' }
          ]
        );
      } else {
        addLog(`❌ Error: ${data.error_message}`);
        Alert.alert('Error', data.error_message || 'Invalid token');
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`);
      Alert.alert('Error', 'Failed to check status');
    } finally {
      setLoading(false);
    }
  };

  // 🔥 Clear/Reset Faceset (Dangerous!)
  const handleClearFaceset = () => {
    Alert.alert(
      '⚠️ Warning',
      'This will remove ALL faces from the faceset. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            addLog('🗑️ Clearing faceset...');
            
            try {
              const formData = new FormData();
              formData.append('api_key', FACEPP_CONFIG.API_KEY);
              formData.append('api_secret', FACEPP_CONFIG.API_SECRET);
              formData.append('faceset_token', facesetToken);
              formData.append('check_empty', '0');
              
              const response = await fetch(`${FACEPP_CONFIG.API_URL}/faceset/removeface`, {
                method: 'POST',
                body: formData,
              });
              
              const data = await response.json();
              
              if (data.face_removed !== undefined) {
                addLog(`✅ Cleared ${data.face_removed} faces`);
                Alert.alert('Success', `Removed ${data.face_removed} faces`);
              } else {
                addLog(`❌ Error: ${data.error_message}`);
                Alert.alert('Error', data.error_message);
              }
            } catch (error) {
              addLog(`❌ Error: ${error}`);
              Alert.alert('Error', 'Failed to clear faceset');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏗️ Face++ Setup</Text>
      <Text style={styles.subtitle}>One-Time Configuration</Text>

      {/* Instructions */}
      <View style={styles.instructionBox}>
        <Text style={styles.instructionTitle}>📋 Setup Steps:</Text>
        <Text style={styles.instructionText}>
          1. Create Global Faceset (or use existing){'\n'}
          2. Copy token to FaceVerificationService.ts{'\n'}
          3. Migrate existing users{'\n'}
          4. Check status to verify{'\n'}
          5. Delete this screen after setup ✅
        </Text>
      </View>

      {/* Token Display/Input */}
      <View style={[styles.tokenBox, { backgroundColor: facesetToken ? '#27ae60' : '#555' }]}>
        <Text style={styles.tokenLabel}>
          {facesetToken ? '✅ Faceset Token:' : 'Faceset Token:'}
        </Text>
        <Text style={styles.tokenText} numberOfLines={2}>
          {facesetToken || 'Not created yet'}
        </Text>
        {facesetToken && (
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => {
              Clipboard.setString(facesetToken);
              Alert.alert('Copied! ✅', 'Token copied to clipboard');
            }}
          >
            <Icon name="content-copy" size={20} color="#fff" />
            <Text style={styles.copyButtonText}>Copy Token</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.createButton]}
          onPress={handleCreateFaceset}
          disabled={loading}
        >
          <Icon name="plus-circle" size={24} color="#fff" />
          <Text style={styles.buttonText}>1. Create New Faceset</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.migrateButton, !facesetToken && styles.buttonDisabled]}
          onPress={handleMigrateUsers}
          disabled={loading || !facesetToken}
        >
          <Icon name="account-multiple" size={24} color="#fff" />
          <Text style={styles.buttonText}>2. Migrate All Users</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.statusButton, !facesetToken && styles.buttonDisabled]}
          onPress={handleCheckStatus}
          disabled={loading || !facesetToken}
        >
          <Icon name="information" size={24} color="#fff" />
          <Text style={styles.buttonText}>3. Check Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton, !facesetToken && styles.buttonDisabled]}
          onPress={handleClearFaceset}
          disabled={loading || !facesetToken}
        >
          <Icon name="delete" size={24} color="#fff" />
          <Text style={styles.buttonText}>⚠️ Clear Faceset</Text>
        </TouchableOpacity>
      </View>

      {/* Migration Status */}
      {migrationStatus && (
        <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>📊 Migration Results:</Text>
          <Text style={styles.statusText}>✅ Migrated: {migrationStatus.migrated}</Text>
          <Text style={styles.statusText}>❌ Failed: {migrationStatus.failed}</Text>
          <Text style={styles.statusText}>⚠️ Skipped: {migrationStatus.skipped}</Text>
          <Text style={styles.statusText}>📦 Total Faces: {migrationStatus.totalFaces}</Text>
          <Text style={styles.statusText}>👥 Total Users: {migrationStatus.total}</Text>
        </View>
      )}

      {/* Logs */}
      <View style={styles.logsContainer}>
        <View style={styles.logsHeader}>
          <Text style={styles.logsTitle}>📝 Logs:</Text>
          <TouchableOpacity
            onPress={() => setLogs([])}
            style={styles.clearLogsButton}
          >
            <Icon name="delete-sweep" size={18} color="#999" />
          </TouchableOpacity>
        </View>
        <ScrollView 
          style={styles.logsScroll}
          onContentSizeChange={() => {}}
        >
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>
              {log}
            </Text>
          ))}
          {logs.length === 0 && (
            <Text style={styles.logTextEmpty}>No logs yet...</Text>
          )}
        </ScrollView>
      </View>

      {/* Loading Overlay */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 20,
  },
  instructionBox: {
    backgroundColor: '#2c2c2c',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#3498db',
  },
  instructionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
  },
  tokenBox: {
    backgroundColor: '#2c2c2c',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  tokenLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  tokenText: {
    fontSize: 12,
    color: '#fff',
    fontFamily: 'monospace',
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#229954',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
    justifyContent: 'center',
  },
  copyButtonText: {
    color: '#fff',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  createButton: {
    backgroundColor: '#3498db',
  },
  migrateButton: {
    backgroundColor: '#e67e22',
  },
  statusButton: {
    backgroundColor: '#9b59b6',
  },
  clearButton: {
    backgroundColor: '#e74c3c',
  },
  buttonDisabled: {
    backgroundColor: '#555',
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  statusBox: {
    backgroundColor: '#2c2c2c',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#27ae60',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
  },
  logsContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 10,
    padding: 15,
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  logsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
  },
  clearLogsButton: {
    padding: 5,
  },
  logsScroll: {
    flex: 1,
  },
  logText: {
    fontSize: 12,
    color: '#0f0',
    fontFamily: 'monospace',
    marginBottom: 3,
  },
  logTextEmpty: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    marginTop: 15,
    fontSize: 16,
  },
});

export default SetupScreen;