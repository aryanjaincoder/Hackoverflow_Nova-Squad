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
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DatePicker from 'react-native-date-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

// TypeScript Interfaces
interface AdminFormData {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: string;
  dateOfBirth: Date | null;
  photo: string;
  password: string;
  confirmPassword: string;
  roleType: 'college-admin' | 'hod' | '';
  department: string;
  collegeName: string;
  collegeAddress: {
    street: string;
    city: string;
    state: string;
    pin: string;
  };
  collegeContactNumber: string;
  collegeEmail: string;
  universityAffiliation: string;
  collegeWebsite: string;
  selectedCollege: string;
  departmentName: string;
  departmentCode: string;
  alternateEmail: string;
  officeExtension: string;
  whatsappNumber: string;
  termsAccepted: boolean;
  privacyPolicyAccepted: boolean;
}

interface ValidationErrors {
  [key: string]: string;
}

const AdminRegistrationScreen: React.FC = () => {
  const [formData, setFormData] = useState<AdminFormData>({
    fullName: '',
    email: '',
    phoneNumber: '',
    gender: '',
    dateOfBirth: null,
    photo: '',
    password: '',
    confirmPassword: '',
    roleType: '',
    department: '',
    collegeName: '',
    collegeAddress: {
      street: '',
      city: '',
      state: '',
      pin: '',
    },
    collegeContactNumber: '',
    collegeEmail: '',
    universityAffiliation: '',
    collegeWebsite: '',
    selectedCollege: '',
    departmentName: '',
    departmentCode: '',
    alternateEmail: '',
    officeExtension: '',
    whatsappNumber: '',
    termsAccepted: false,
    privacyPolicyAccepted: false,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Mock data for dropdowns
  const colleges = ['ABC Engineering College', 'XYZ University', 'PQR Institute of Technology'];
  const departments = ['Computer Science', 'Electrical Engineering', 'Mechanical Engineering', 'Civil Engineering'];
  const states = ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Uttar Pradesh'];

  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {};

    switch (step) {
      case 1:
        if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
        if (!formData.email.trim()) newErrors.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
        if (!formData.phoneNumber.trim()) newErrors.phoneNumber = 'Phone number is required';
        else if (!/^\d{10}$/.test(formData.phoneNumber)) newErrors.phoneNumber = 'Phone number must be 10 digits';
        if (!formData.password) newErrors.password = 'Password is required';
        else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
        if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm password';
        else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
        break;

      case 2:
        if (!formData.roleType) newErrors.roleType = 'Please select a role';
        if (formData.roleType === 'hod' && !formData.department) newErrors.department = 'Please select department';
        break;

      case 3:
        if (formData.roleType === 'college-admin') {
          if (!formData.collegeName.trim()) newErrors.collegeName = 'College name is required';
          if (!formData.collegeAddress.street.trim()) newErrors['collegeAddress.street'] = 'Street address is required';
          if (!formData.collegeAddress.city.trim()) newErrors['collegeAddress.city'] = 'City is required';
          if (!formData.collegeAddress.state.trim()) newErrors['collegeAddress.state'] = 'State is required';
          if (!formData.collegeAddress.pin.trim()) newErrors['collegeAddress.pin'] = 'PIN code is required';
          if (!formData.collegeContactNumber.trim()) newErrors.collegeContactNumber = 'College contact number is required';
          if (!formData.collegeEmail.trim()) newErrors.collegeEmail = 'College email is required';
        }
        break;

      case 4:
        if (formData.roleType === 'hod') {
          if (!formData.selectedCollege) newErrors.selectedCollege = 'Please select college';
          if (!formData.departmentName.trim()) newErrors.departmentName = 'Department name is required';
        }
        break;

      case 5:
        if (!formData.termsAccepted) newErrors.termsAccepted = 'You must accept terms and conditions';
        if (!formData.privacyPolicyAccepted) newErrors.privacyPolicyAccepted = 'You must accept privacy policy';
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
    if (validateStep(5)) {
      setLoading(true);
      setTimeout(() => {
        setLoading(false);
        Alert.alert(
          'Registration Submitted',
          'Your admin registration has been submitted successfully. You will receive OTP verification shortly.',
          [{ text: 'OK', onPress: () => console.log('Registration completed') }]
        );
      }, 2000);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'collegeAddress') {
        setFormData(prev => ({
          ...prev,
          collegeAddress: {
            ...prev.collegeAddress,
            [child]: value,
          },
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value,
      }));
    }

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBar, { width: `${(currentStep - 1) / 4 * 100}%` }]} />
    </View>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {[1, 2, 3, 4, 5].map(step => (
        <View key={step} style={styles.stepIndicator}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= step ? styles.stepActive : styles.stepInactive,
            ]}
          >
            <Text style={styles.stepText}>{step}</Text>
          </View>
          {step < 5 && <View style={styles.stepLine} />}
        </View>
      ))}
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
        <Text style={styles.uploadButtonText}>Upload Photo</Text>
      </TouchableOpacity>

      <TextInput
        style={[styles.input, errors.password && styles.inputError]}
        placeholder="Password *"
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
    </View>
  );

  const renderRoleSelection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Role Selection</Text>
      
      <Text style={styles.inputLabel}>Role Type *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.roleType}
          style={[styles.picker, errors.roleType && styles.inputError]}
          onValueChange={(value) => handleInputChange('roleType', value)}
        >
          <Picker.Item label="Select Role" value="" />
          <Picker.Item label="College Admin" value="college-admin" />
          <Picker.Item label="Head of Department (HOD)" value="hod" />
        </Picker>
      </View>
      {errors.roleType && <Text style={styles.errorText}>{errors.roleType}</Text>}

      {formData.roleType === 'hod' && (
        <>
          <Text style={styles.inputLabel}>Department *</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.department}
              style={[styles.picker, errors.department && styles.inputError]}
              onValueChange={(value) => handleInputChange('department', value)}
            >
              <Picker.Item label="Select Department" value="" />
              {departments.map(dept => (
                <Picker.Item key={dept} label={dept} value={dept} />
              ))}
            </Picker>
          </View>
          {errors.department && <Text style={styles.errorText}>{errors.department}</Text>}
        </>
      )}
    </View>
  );

  const renderInstitutionalDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Institutional Details</Text>
      
      <TextInput
        style={[styles.input, errors.collegeName && styles.inputError]}
        placeholder="College Name *"
        value={formData.collegeName}
        onChangeText={(value) => handleInputChange('collegeName', value)}
      />
      {errors.collegeName && <Text style={styles.errorText}>{errors.collegeName}</Text>}

      <TextInput
        style={[styles.input, errors['collegeAddress.street'] && styles.inputError]}
        placeholder="Street Address *"
        value={formData.collegeAddress.street}
        onChangeText={(value) => handleInputChange('collegeAddress.street', value)}
      />
      {errors['collegeAddress.street'] && <Text style={styles.errorText}>{errors['collegeAddress.street']}</Text>}

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput, errors['collegeAddress.city'] && styles.inputError]}
          placeholder="City *"
          value={formData.collegeAddress.city}
          onChangeText={(value) => handleInputChange('collegeAddress.city', value)}
        />
        <TextInput
          style={[styles.input, styles.halfInput, errors['collegeAddress.pin'] && styles.inputError]}
          placeholder="PIN Code *"
          value={formData.collegeAddress.pin}
          onChangeText={(value) => handleInputChange('collegeAddress.pin', value)}
        />
      </View>

      <Text style={styles.inputLabel}>State *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.collegeAddress.state}
          style={[styles.picker, errors['collegeAddress.state'] && styles.inputError]}
          onValueChange={(value) => handleInputChange('collegeAddress.state', value)}
        >
          <Picker.Item label="Select State" value="" />
          {states.map(state => (
            <Picker.Item key={state} label={state} value={state} />
          ))}
        </Picker>
      </View>
      {errors['collegeAddress.state'] && <Text style={styles.errorText}>{errors['collegeAddress.state']}</Text>}

      <TextInput
        style={[styles.input, errors.collegeContactNumber && styles.inputError]}
        placeholder="College Contact Number *"
        keyboardType="phone-pad"
        value={formData.collegeContactNumber}
        onChangeText={(value) => handleInputChange('collegeContactNumber', value)}
      />
      {errors.collegeContactNumber && <Text style={styles.errorText}>{errors.collegeContactNumber}</Text>}

      <TextInput
        style={[styles.input, errors.collegeEmail && styles.inputError]}
        placeholder="College Email *"
        keyboardType="email-address"
        value={formData.collegeEmail}
        onChangeText={(value) => handleInputChange('collegeEmail', value)}
      />
      {errors.collegeEmail && <Text style={styles.errorText}>{errors.collegeEmail}</Text>}

      <TextInput
        style={styles.input}
        placeholder="University Affiliation"
        value={formData.universityAffiliation}
        onChangeText={(value) => handleInputChange('universityAffiliation', value)}
      />

      <TextInput
        style={styles.input}
        placeholder="College Website"
        keyboardType="url"
        value={formData.collegeWebsite}
        onChangeText={(value) => handleInputChange('collegeWebsite', value)}
      />

      <TouchableOpacity style={styles.uploadButton}>
        <Icon name="attach-file" size={20} color="#007AFF" />
        <Text style={styles.uploadButtonText}>Upload Verification Documents</Text>
      </TouchableOpacity>
    </View>
  );

  const renderDepartmentDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Department Details</Text>
      
      <Text style={styles.inputLabel}>Select College *</Text>
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

      <TextInput
        style={[styles.input, errors.departmentName && styles.inputError]}
        placeholder="Department Name *"
        value={formData.departmentName}
        onChangeText={(value) => handleInputChange('departmentName', value)}
      />
      {errors.departmentName && <Text style={styles.errorText}>{errors.departmentName}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Department Code"
        value={formData.departmentCode}
        onChangeText={(value) => handleInputChange('departmentCode', value)}
      />
    </View>
  );

  const renderAgreements = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Terms & Agreements</Text>
      
      <View style={styles.switchContainer}>
        <View style={styles.switchRow}>
          <Switch
            value={formData.termsAccepted}
            onValueChange={(value) => handleInputChange('termsAccepted', value)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={formData.termsAccepted ? '#007AFF' : '#f4f3f4'}
          />
          <TouchableOpacity onPress={() => setShowTermsModal(true)}>
            <Text style={styles.switchText}>
              I agree to the **Terms and Conditions** *
            </Text>
          </TouchableOpacity>
        </View>
        {errors.termsAccepted && <Text style={styles.errorText}>{errors.termsAccepted}</Text>}

        <View style={styles.switchRow}>
          <Switch
            value={formData.privacyPolicyAccepted}
            onValueChange={(value) => handleInputChange('privacyPolicyAccepted', value)}
            trackColor={{ false: '#767577', true: '#81b0ff' }}
            thumbColor={formData.privacyPolicyAccepted ? '#007AFF' : '#f4f3f4'}
          />
          <TouchableOpacity onPress={() => setShowPrivacyModal(true)}>
            <Text style={styles.switchText}>
              I agree to the **Privacy Policy** *
            </Text>
          </TouchableOpacity>
        </View>
        {errors.privacyPolicyAccepted && <Text style={styles.errorText}>{errors.privacyPolicyAccepted}</Text>}
      </View>

      <TouchableOpacity style={styles.uploadButton}>
        <Icon name="description" size={20} color="#007AFF" />
        <Text style={styles.uploadButtonText}>Upload Admin Authorization Letter</Text>
      </TouchableOpacity>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderPersonalDetails();
      case 2: return renderRoleSelection();
      case 3: return renderInstitutionalDetails();
      case 4: return renderDepartmentDetails();
      case 5: return renderAgreements();
      default: return renderPersonalDetails();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Registration</Text>
          <Text style={styles.headerSubtitle}>Complete all steps to register as an admin</Text>
          {renderProgressBar()}
        </View>

        <View style={styles.stepLabels}>
          <Text style={styles.stepLabel}>Personal</Text>
          <Text style={styles.stepLabel}>Role</Text>
          <Text style={styles.stepLabel}>Institution</Text>
          <Text style={styles.stepLabel}>Department</Text>
          <Text style={styles.stepLabel}>Agreement</Text>
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
          
          {currentStep < 5 ? (
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
                  <Text style={styles.nextButtonText}>Submit</Text>
                  <Icon name="send" size={20} color="white" />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Terms and Conditions Modal */}
      <Modal
        visible={showTermsModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Terms and Conditions</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalText}>
                {/* Add your terms and conditions content here */}
                Welcome to our platform! By registering as an administrator, you agree to abide by our terms and conditions. These terms outline your responsibilities, our service offerings, and the acceptable use of the platform. Unauthorized access or misuse of data is strictly prohibited. We reserve the right to modify these terms at any time. Your continued use of the platform constitutes your acceptance of these changes.
              </Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowTermsModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Privacy Policy Modal */}
      <Modal
        visible={showPrivacyModal}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Privacy Policy</Text>
            <ScrollView style={styles.modalScroll}>
              <Text style={styles.modalText}>
                {/* Add your privacy policy content here */}
                Your privacy is important to us. This policy explains how we collect, use, and protect your personal information. We collect data necessary for providing our services and ensuring a secure experience. This information may include your name, contact details, and institutional data. We do not share your information with third parties without your explicit consent, except as required by law.
              </Text>
            </ScrollView>
            <TouchableOpacity 
              style={styles.modalCloseButton}
              onPress={() => setShowPrivacyModal(false)}
            >
              <Text style={styles.modalCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

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
  stepIndicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepActive: {
    backgroundColor: '#007AFF',
  },
  stepInactive: {
    backgroundColor: '#e0e0e0',
  },
  stepText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 8,
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
  halfInput: {
    flex: 1,
    marginHorizontal: 5,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
    color: '#333',
  },
  modalScroll: {
    flex: 1,
  },
  modalText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
    textAlign: 'justify',
  },
  modalCloseButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default AdminRegistrationScreen;