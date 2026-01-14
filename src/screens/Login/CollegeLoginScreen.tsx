import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, StatusBar, Alert, ActivityIndicator, ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons'; // Ensure this is installed

// Firebase Imports (using @react-native-firebase)
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore'; // Import firestore if you need role check *during* login

// Navigation types (Adjust path if needed)
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/AuthNavigator'; // Assuming AuthStackParamList is here

// Interfaces
interface LoginFormState { email: string; password: string; }
interface ValidationErrors { [key: string]: string; }

// Props interface
interface CollegeLoginScreenProps {
  navigation: NativeStackNavigationProp<AuthStackParamList, 'Login'>; // Specific type
}

const CollegeLoginScreen: React.FC<CollegeLoginScreenProps> = ({ navigation }) => {
  const [formData, setFormData] = useState<LoginFormState>({ email: '', password: '' });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const handleInputChange = (field: keyof LoginFormState, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field] || errors.general) { // Clear general errors too
      setErrors(prev => ({ ...prev, [field]: '', general: '' }));
    }
  };

  const togglePasswordVisibility = () => setPasswordVisible(prev => !prev);

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Official email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    }
    // Remove minimum length check for login, Auth handles incorrect password error
    // else if (formData.password.length < 6) {
    //   newErrors.password = 'Password must be at least 6 characters';
    // }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // --- Updated handleLogin ---
  const handleLogin = async () => {
    if (validateForm()) {
      setLoading(true);
      setErrors({}); // Clear previous errors

      try {
        // Sign in using Firebase Auth
        await auth().signInWithEmailAndPassword(
          formData.email.trim(), // Trim email
          formData.password
        );

        // --- NAVIGATION REMOVED ---
        // Login successful! onAuthStateChanged in App.tsx will now
        // detect the logged-in user and switch to the AppNavigator automatically.
        // We don't need to navigate from here anymore.
        console.log('Login successful. App.tsx will handle navigation.');
        // --- END REMOVAL ---

        // setLoading(false); // No need to set loading false if App.tsx switches view

      } catch (error: any) { // Type error
        setLoading(false); // Stop loading on error
        console.error("Login Error:", error.code, error.message);
        let errorMessage = 'Login failed. Please try again.';
        // Map common Firebase auth errors to user-friendly messages
        if (error.code === 'auth/user-not-found' ||
            error.code === 'auth/wrong-password' ||
            error.code === 'auth/invalid-credential') { // Added invalid-credential
          errorMessage = 'Invalid email or password.';
        } else if (error.code === 'auth/invalid-email') {
          errorMessage = 'Invalid email format.';
        } else if (error.code === 'auth/too-many-requests') {
           errorMessage = 'Too many login attempts. Please try again later.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Network error. Please check your connection.';
        }
        // Display error message
        setErrors({ general: errorMessage });
        Alert.alert('Login Failed', errorMessage);
      }
    }
  };
  // --- End Updated handleLogin ---

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f4f7" />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>College Portal Login</Text>
          <Text style={styles.headerSubtitle}>Sign in to your dashboard</Text>
        </View>

        <View style={styles.formContainer}>
          <Text style={styles.sectionTitle}>Sign In</Text>

          {/* Email Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Official Email</Text>
            <TextInput
              style={[styles.input, errors.email ? styles.inputError : null]}
              placeholder="Enter your official email *"
              placeholderTextColor="#999"
              value={formData.email}
              onChangeText={(value) => handleInputChange('email', value)}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={[styles.passwordContainer, errors.password ? styles.inputError : null]}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password *"
                placeholderTextColor="#999"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry={!passwordVisible}
              />
              <TouchableOpacity onPress={togglePasswordVisibility} style={styles.eyeIcon}>
                <Icon
                  name={passwordVisible ? 'visibility-off' : 'visibility'}
                  size={22} color="#666"
                />
              </TouchableOpacity>
            </View>
            {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {/* General Error Message */}
          {errors.general && <Text style={[styles.errorText, styles.generalError]}>{errors.general}</Text>}

          {/* Forgot Password Link */}
          <TouchableOpacity style={styles.forgotPasswordButton} onPress={() => Alert.alert("Forgot Password", "Prototype: Navigate to Forgot Password screen.")}>
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.disabledButton]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Text style={styles.loginButtonText}>Login</Text>
                <Icon name="login" size={20} color="white" />
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Registration Link */}
        <View style={styles.footerContainer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          {/* Navigate to AdminRegistration or RoleSelection based on your setup */}
          <TouchableOpacity onPress={() => navigation.navigate('AdminRegistration')}>
            <Text style={styles.linkText}>Register here</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// --- Styles ---
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f7' },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 30 },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 4 },
  headerSubtitle: { fontSize: 16, color: '#666', textAlign: 'center' },
  formContainer: { backgroundColor: 'white', borderRadius: 16, padding: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 5 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 25, textAlign: 'center' },
  inputGroup: { // Added wrapper for label + input
    marginBottom: 15,
  },
  inputLabel: { fontSize: 14, color: '#666', marginBottom: 8, fontWeight: '500' },
  input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 15, backgroundColor: '#fafafa', fontSize: 16, color: '#333' },
  inputError: { borderColor: '#ff3b30' }, // Error border style
  errorText: { color: '#ff3b30', fontSize: 12, marginTop: 4, marginLeft: 5 }, // Added marginTop
  generalError: { // Style for general login error
     textAlign: 'center',
     marginBottom: 10,
     fontWeight: '500',
  },
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, backgroundColor: '#fafafa' },
  passwordInput: { flex: 1, padding: 15, fontSize: 16, color: '#333' },
  eyeIcon: { padding: 15 },
  forgotPasswordButton: { alignSelf: 'flex-end', marginTop: 5, marginBottom: 20 },
  forgotPasswordText: { color: '#007AFF', fontSize: 14, fontWeight: '500' },
  loginButton: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 16, backgroundColor: '#007AFF', borderRadius: 10 },
  disabledButton: { backgroundColor: '#a9cff8' },
  loginButtonText: { color: 'white', fontWeight: 'bold', marginRight: 10, fontSize: 16 },
  footerContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 30 },
  footerText: { fontSize: 14, color: '#666' },
  linkText: { color: '#007AFF', fontWeight: 'bold', fontSize: 14, marginLeft: 4 },
});

export default CollegeLoginScreen;