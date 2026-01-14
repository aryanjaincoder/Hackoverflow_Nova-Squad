import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DatePicker from 'react-native-date-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

// TypeScript Interface for Student Data
interface StudentFormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: string;
  dateOfBirth: Date | null;
  photo: string;
  password: string;
  confirmPassword: string;
  enrollmentNumber: string;
  selectedCollege: string;
  selectedDepartment: string;
  currentYear: string;
  section: string;
  termsAccepted: boolean;
}

interface ValidationErrors {
  [key: string]: string;
}

const StudentRegistrationScreen: React.FC = () => {
  const [formData, setFormData] = useState<StudentFormData>({
    fullName: '',
    email: '',
    phoneNumber: '',
    gender: '',
    dateOfBirth: null,
    photo: '',
    password: '',
    confirmPassword: '',
    enrollmentNumber: '',
    selectedCollege: '',
    selectedDepartment: '',
    currentYear: '',
    section: '',
    termsAccepted: false,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Mock data for dropdowns
  // In a real app, you'd fetch these from Firestore
  const colleges = ['ABC Engineering College', 'XYZ University', 'PQR Institute of Technology'];
  const departments = ['Computer Science', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering'];
  const years = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {};

    switch (step) {
      case 1:
        if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
        if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
        else if (!/^\d{10}$/.test(formData.phoneNumber)) newErrors.phoneNumber = 'Phone number must be 10 digits';
        break;

      case 2:
        if (!formData.selectedCollege) newErrors.selectedCollege = 'Please select your college';
        if (!formData.selectedDepartment) newErrors.selectedDepartment = 'Please select your department';
        if (!formData.currentYear) newErrors.currentYear = 'Please select your current year';
        if (!formData.enrollmentNumber.trim()) newErrors.enrollmentNumber = 'Enrollment number is required';
        break;

      case 3:
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
        if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm password';
        else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept terms and conditions';
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (validateStep(3)) {
      setLoading(true);

      // --- FIREBASE LOGIC GOES HERE ---
      // 1. import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
      // 2. import { getFirestore, doc, setDoc } from "firebase/firestore";
      //
      // try {
      //   const auth = getAuth();
      //   const db = getFirestore();
      //
      //   // Step 1: Create user in Auth
      //   const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      //   const user = userCredential.user;
      //
      //   // Step 2: Create user document in Firestore
      //   // We remove password data before saving to database
      //   const { password, confirmPassword, ...studentData } = formData; 
      //
      //   await setDoc(doc(db, "users", user.uid), {
      //     ...studentData,
      //     uid: user.uid,
      //     role: "student", // <-- This is the important part
      //     createdAt: new Date(),
      //   });
      //
      //   setLoading(false);
      //   Alert.alert(
      //     'Registration Successful!',
      //     'Your student account has been created.',
      //     [{ text: 'OK', onPress: () => console.log('Navigate to Login or Home') }]
      //   );
      //
      // } catch (error) {
      //   setLoading(false);
      //   console.error("Error during student registration: ", error);
      //   Alert.alert('Registration Failed', error.message);
      // }

      // Placeholder logic (like your admin form)
      setTimeout(() => {
        setLoading(false);
        Alert.alert(
          'Registration Submitted',
          'Your student account has been created successfully. Please login to continue.',
          [{ text: 'OK', onPress: () => console.log('Registration completed') }]
        );
      }, 2000);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBar, { width: `${(currentStep - 1) / 2 * 100}%` }]} />
    </View>
  );

  const renderPersonalDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Personal Details</Text>
      
      <TextInput
        style={[styles.input, errors.fullName && styles.inputError]}
        placeholder="Full Name *"
        value={formData.fullName}
        onChangeText={(value) => handleInputChange('fullName', value)}
      />
      {errors.fullName && <Text style={styles.errorText}>{errors.fullName}</Text>}

      <TextInput
        style={[styles.input, errors.email && styles.inputError]}
        placeholder="Email Address *"
        keyboardType="email-address"
        autoCapitalize="none"
        value={formData.email}
        onChangeText={(value) => handleInputChange('email', value)}
      />
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

      <TextInput
        style={[styles.input, errors.phoneNumber && styles.inputError]}
        placeholder="Phone Number *"
        keyboardType="phone-pad"
        value={formData.phoneNumber}
        onChangeText={(value) => handleInputChange('phoneNumber', value)}
      />
      {errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber}</Text>}

      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.gender}
          style={styles.picker}
          onValueChange={(value) => handleInputChange('gender', value)}
        >
          <Picker.Item label="Select Gender" value="" />
          <Picker.Item label="Male" value="male" />
          <Picker.Item label="Female" value="female" />
          <Picker.Item label="Other" value="other" />
        </Picker>
      </View>

      <TouchableOpacity 
        style={styles.input}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={formData.dateOfBirth ? styles.inputText : styles.placeholderText}>
          {formData.dateOfBirth ? formData.dateOfBirth.toDateString() : 'Date of Birth'}
        </Text>
      </TouchableOpacity>

      <DatePicker
        modal
        open={showDatePicker}
        date={formData.dateOfBirth || new Date()}
        mode="date"
        onConfirm={(date) => {
          setShowDatePicker(false);
          handleInputChange('dateOfBirth', date);
        }}
        onCancel={() => {
          setShowDatePicker(false);
        }}
      />

      <TouchableOpacity style={styles.uploadButton}>
        <Icon name="photo-camera" size={20} color="#007AFF" />
        <Text style={styles.uploadButtonText}>Upload Profile Photo</Text>
      </TouchableOpacity>
    </View>
  );

  const renderAcademicDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Academic Details</Text>
      
      <Text style={styles.inputLabel}>College *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.selectedCollege}
          style={[styles.picker, errors.selectedCollege && styles.inputError]}
          onValueChange={(value) => handleInputChange('selectedCollege', value)}
        >
          <Picker.Item label="Select College" value="" />
          {colleges.map(college => (
            <Picker.Item key={college} label={college} value={college} />
          ))}
        </Picker>
      </View>
      {errors.selectedCollege && <Text style={styles.errorText}>{errors.selectedCollege}</Text>}

      <Text style={styles.inputLabel}>Department *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.selectedDepartment}
          style={[styles.picker, errors.selectedDepartment && styles.inputError]}
          onValueChange={(value) => handleInputChange('selectedDepartment', value)}
        >
          <Picker.Item label="Select Department" value="" />
          {departments.map(dept => (
            <Picker.Item key={dept} label={dept} value={dept} />
          ))}
        </Picker>
      </View>
      {errors.selectedDepartment && <Text style={styles.errorText}>{errors.selectedDepartment}</Text>}

      <Text style={styles.inputLabel}>Current Year *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.currentYear}
          style={[styles.picker, errors.currentYear && styles.inputError]}
          onValueChange={(value) => handleInputChange('currentYear', value)}
        >
          <Picker.Item label="Select Year" value="" />
          {years.map(year => (
            <Picker.Item key={year} label={year} value={year} />
          ))}
        </Picker>
      </View>
      {errors.currentYear && <Text style={styles.errorText}>{errors.currentYear}</Text>}

      <TextInput
        style={[styles.input, errors.enrollmentNumber && styles.inputError]}
        placeholder="Enrollment Number / Student ID *"
        value={formData.enrollmentNumber}
        onChangeText={(value) => handleInputChange('enrollmentNumber', value)}
      />
      {errors.enrollmentNumber && <Text style={styles.errorText}>{errors.enrollmentNumber}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Section (e.g., A, B, C)"
        value={formData.section}
        onChangeText={(value) => handleInputChange('section', value)}
      />
    </View>
  );

  const renderPasswordAndAgreements = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Set Password & Agreements</Text>
      
      <TextInput
        style={[styles.input, errors.password && styles.inputError]}
        placeholder="Password (min 8 characters) *"
        secureTextEntry
        value={formData.password}
        onChangeText={(value) => handleInputChange('password', value)}
      />
      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

      <TextInput
        style={[styles.input, errors.confirmPassword && styles.inputError]}
        placeholder="Confirm Password *"
        secureTextEntry
        value={formData.confirmPassword}
        onChangeText={(value) => handleInputChange('confirmPassword', value)}
      />
      {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

      <View style={styles.switchContainer}>
        <View style={styles.switchRow}>
          <Switch
            value={formData.termsAccepted}
            onValueChange={(value) => handleInputChange('termsAccepted', value)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={formData.termsAccepted ? '#007AFF' : '#f4f3f4'}
          />
          <TouchableOpacity onPress={() => {/* Show Terms Modal */}}>
            <Text style={styles.switchText}>
              I agree to the **Terms and Conditions** *
            </Text>
          </TouchableOpacity>
        </View>
        {errors.termsAccepted && <Text style={styles.errorText}>{errors.termsAccepted}</Text>}
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderPersonalDetails();
      case 2: return renderAcademicDetails();
      case 3: return renderPasswordAndAgreements();
      default: return renderPersonalDetails();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Student Registration</Text>
          <Text style={styles.headerSubtitle}>Complete all steps to create your account</Text>
          {renderProgressBar()}
        </View>

        <View style={styles.stepLabels}>
          <Text style={styles.stepLabel}>Personal</Text>
          <Text style={styles.stepLabel}>Academic</Text>
          <Text style={styles.stepLabel}>Finish</Text>
        </View>

        <View style={styles.formContainer}>
          {renderCurrentStep()}
        </View>

        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <TouchableOpacity style={styles.previousButton} onPress={handlePrevious}>
              <Text style={styles.previousButtonText}>Previous</Text>
            </TouchableOpacity>
          )}
          
          {currentStep < 3 ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
              <Icon name="arrow-forward" size={20} color="white" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              style={[styles.nextButton, loading && styles.disabledButton]} 
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text style={styles.nextButtonText}>Register</Text>
                  <Icon name="send" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
      
      {/* Add Modals for Terms & Privacy here if needed */}
    </SafeAreaView>
  );
};

// Use the SAME styles from your AdminRegistrationScreen
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f4f7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  progressBarContainer: {
    width: '100%',
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    marginTop: 20,
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
  },
  stepLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    flex: 1,
  },
  formContainer: {
    padding: 20,
  },
  section: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    backgroundColor: '#fafafa',
    fontSize: 16, // Added for better readability
    color: '#333', // Added for better readability
  },
  inputError: {
    borderColor: '#ff3b30',
  },
  inputText: {
    color: '#333',
    fontSize: 16,
  },
  placeholderText: {
    color: '#999',
    fontSize: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    fontWeight: '500',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    marginBottom: 15,
    backgroundColor: '#fafafa',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  uploadButtonText: {
    color: '#007AFF',
    marginLeft: 10,
    fontWeight: '600',
  },
  switchContainer: {
    marginBottom: 20,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  switchText: {
    marginLeft: 15,
    color: '#333',
    flex: 1,
    fontSize: 14,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  previousButton: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 10,
    marginRight: 10,
    alignItems: 'center',
  },
  previousButtonText: {
    color: '#007AFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  nextButton: {
    flex: 2,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#007AFF',
    borderRadius: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  nextButtonText: {
    color: 'white',
    fontWeight: 'bold',
    marginRight: 10,
    fontSize: 16,
  },
  errorText: {
    color: '#ff3b30',
    fontSize: 12,
    marginBottom: 10,
    marginLeft: 5,
  },
});

export default StudentRegistrationScreen;