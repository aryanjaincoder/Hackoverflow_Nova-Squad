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
  FlatList,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DatePicker from 'react-native-date-picker';
import Icon from 'react-native-vector-icons/MaterialIcons';

// TypeScript Interfaces
interface CollegeFormData {
  // Basic Information
  collegeName: string;
  collegeType: string;
  affiliatedUniversity: string;
  yearOfEstablishment: string;
  accreditationStatus: string;
  accreditationGrade: string;
  accreditationNumber: string;
  accreditationValidity: Date | null;

  // Location & Contacts
  address: {
    street: string;
    city: string;
    state: string;
    pinCode: string;
    country: string;
  };
  contactNumber: string;
  officialEmail: string;
  website: string;
  faxNumber: string;

  // Administrative Details
  principalName: string;
  designation: string;
  principalContact: string;
  principalEmail: string;

  // Academic Information
  departments: string[];
  coursesOffered: string[];
  totalStudents: string;
  facultyMembers: string;
  newDepartment: string;
  newCourse: string;


  registrationCertificate: string;
  affiliationLetter: string;
  accreditationCertificate: string;
  governmentPermission: string;

 
  campusArea: string;
  hostelFacilities: boolean;
  hostelDetails: string;
  libraryFacilities: boolean;
  libraryDetails: string;
  labFacilities: boolean;
  labDetails: string;
  sportsFacilities: boolean;
  sportsDetails: string;


  complianceConfirmed: boolean;
  authorizedSignature: string;
  agreementDate: Date | null;
  termsAccepted: boolean;
  privacyPolicyAccepted: boolean;
}

interface ValidationErrors {
  [key: string]: string;
}

const CollegeRegistrationScreen: React.FC = () => {
  const [formData, setFormData] = useState<CollegeFormData>({
    // Basic Information
    collegeName: '',
    collegeType: '',
    affiliatedUniversity: '',
    yearOfEstablishment: '',
    accreditationStatus: '',
    accreditationGrade: '',
    accreditationNumber: '',
    accreditationValidity: null,

    // Location & Contacts
    address: {
      street: '',
      city: '',
      state: '',
      pinCode: '',
      country: 'India',
    },
    contactNumber: '',
    officialEmail: '',
    website: '',
    faxNumber: '',

    // Administrative Details
    principalName: '',
    designation: 'Principal',
    principalContact: '',
    principalEmail: '',

    // Academic Information
    departments: [],
    coursesOffered: [],
    totalStudents: '',
    facultyMembers: '',
    newDepartment: '',
    newCourse: '',

    // Documents
    registrationCertificate: '',
    affiliationLetter: '',
    accreditationCertificate: '',
    governmentPermission: '',

    // Facilities
    campusArea: '',
    hostelFacilities: false,
    hostelDetails: '',
    libraryFacilities: false,
    libraryDetails: '',
    labFacilities: false,
    labDetails: '',
    sportsFacilities: false,
    sportsDetails: '',

    // Compliance & Declarations
    complianceConfirmed: false,
    authorizedSignature: '',
    agreementDate: null,
    termsAccepted: false,
    privacyPolicyAccepted: false,
  });

  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [showAccreditationDatePicker, setShowAccreditationDatePicker] = useState(false);
  const [showAgreementDatePicker, setShowAgreementDatePicker] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Mock data for dropdowns
  const collegeTypes = [
    'Engineering',
    'Arts & Science',
    'Medical',
    'Polytechnic',
    'Management',
    'Law',
    'Pharmacy',
    'Architecture',
    'Other'
  ];

  const accreditationStatuses = [
    'NAAC Accredited',
    'NBA Accredited',
    'UGC Recognized',
    'AICTE Approved',
    'State Government',
    'Not Accredited'
  ];

  const states = ['Maharashtra', 'Karnataka', 'Tamil Nadu', 'Delhi', 'Uttar Pradesh', 'Gujarat', 'Rajasthan'];
  const countries = ['India', 'Other'];
  const designations = ['Principal', 'Director', 'Chairman', 'President', 'Dean'];

  const courses = ['Undergraduate', 'Postgraduate', 'Diploma', 'Certificate', 'PhD', 'Post-Doctoral'];

  const validateStep = (step: number): boolean => {
    const newErrors: ValidationErrors = {};

    switch (step) {
      case 1:
        if (!formData.collegeName.trim()) newErrors.collegeName = 'College name is required';
        if (!formData.collegeType) newErrors.collegeType = 'College type is required';
        if (!formData.affiliatedUniversity.trim()) newErrors.affiliatedUniversity = 'Affiliated university is required';
        if (!formData.yearOfEstablishment.trim()) newErrors.yearOfEstablishment = 'Year of establishment is required';
        else if (!/^\d{4}$/.test(formData.yearOfEstablishment)) newErrors.yearOfEstablishment = 'Enter valid year';
        break;

      case 2:
        if (!formData.address.street.trim()) newErrors['address.street'] = 'Street address is required';
        if (!formData.address.city.trim()) newErrors['address.city'] = 'City is required';
        if (!formData.address.state.trim()) newErrors['address.state'] = 'State is required';
        if (!formData.address.pinCode.trim()) newErrors['address.pinCode'] = 'PIN code is required';
        else if (!/^\d{6}$/.test(formData.address.pinCode)) newErrors['address.pinCode'] = 'Invalid PIN code';
        if (!formData.contactNumber.trim()) newErrors.contactNumber = 'Contact number is required';
        else if (!/^\d{10}$/.test(formData.contactNumber)) newErrors.contactNumber = 'Invalid contact number';
        if (!formData.officialEmail.trim()) newErrors.officialEmail = 'Official email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.officialEmail)) newErrors.officialEmail = 'Invalid email format';
        break;

      case 3:
        if (!formData.principalName.trim()) newErrors.principalName = 'Principal name is required';
        if (!formData.designation) newErrors.designation = 'Designation is required';
        if (!formData.principalContact.trim()) newErrors.principalContact = 'Contact number is required';
        else if (!/^\d{10}$/.test(formData.principalContact)) newErrors.principalContact = 'Invalid contact number';
        if (!formData.principalEmail.trim()) newErrors.principalEmail = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(formData.principalEmail)) newErrors.principalEmail = 'Invalid email format';
        break;

      case 4:
        if (formData.departments.length === 0) newErrors.departments = 'At least one department is required';
        if (formData.coursesOffered.length === 0) newErrors.coursesOffered = 'At least one course is required';
        if (!formData.totalStudents.trim()) newErrors.totalStudents = 'Total students count is required';
        if (!formData.facultyMembers.trim()) newErrors.facultyMembers = 'Faculty members count is required';
        break;

      case 5:
        if (!formData.registrationCertificate) newErrors.registrationCertificate = 'Registration certificate is required';
        if (!formData.affiliationLetter) newErrors.affiliationLetter = 'Affiliation letter is required';
        break;

      case 6:
        // Facilities are optional, no validation needed
        break;

      case 7:
        if (!formData.complianceConfirmed) newErrors.complianceConfirmed = 'Compliance confirmation is required';
        if (!formData.authorizedSignature.trim()) newErrors.authorizedSignature = 'Authorized signature is required';
        if (!formData.agreementDate) newErrors.agreementDate = 'Agreement date is required';
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
    if (validateStep(7)) {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        setLoading(false);
        Alert.alert(
          'Registration Successful',
          'Your college registration has been submitted successfully. Our team will review and contact you shortly.',
          [{ text: 'OK', onPress: () => console.log('Registration completed') }]
        );
      }, 3000);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      if (parent === 'address') {
        setFormData(prev => ({
          ...prev,
          address: {
            ...prev.address,
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

  const addDepartment = () => {
    if (formData.newDepartment.trim()) {
      setFormData(prev => ({
        ...prev,
        departments: [...prev.departments, prev.newDepartment.trim()],
        newDepartment: '',
      }));
    }
  };

  const removeDepartment = (index: number) => {
    setFormData(prev => ({
      ...prev,
      departments: prev.departments.filter((_, i) => i !== index),
    }));
  };

  const toggleCourse = (course: string) => {
    setFormData(prev => ({
      ...prev,
      coursesOffered: prev.coursesOffered.includes(course)
        ? prev.coursesOffered.filter(c => c !== course)
        : [...prev.coursesOffered, course],
    }));
  };

  const renderProgressBar = () => (
    <View style={styles.progressBarContainer}>
      <View style={[styles.progressBar, { width: `${(currentStep - 1) / 6 * 100}%` }]} />
    </View>
  );

  const renderStepIndicator = () => (
    <View style={styles.stepIndicatorContainer}>
      {[1, 2, 3, 4, 5, 6, 7].map(step => (
        <View key={step} style={styles.stepIndicator}>
          <View
            style={[
              styles.stepCircle,
              currentStep >= step ? styles.stepActive : styles.stepInactive,
            ]}
          >
            <Text style={styles.stepText}>{step}</Text>
          </View>
          {step < 7 && <View style={styles.stepLine} />}
        </View>
      ))}
    </View>
  );

  const renderBasicInformation = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Basic Information</Text>
      
      <TextInput
        style={[styles.input, errors.collegeName && styles.inputError]}
        placeholder="College Name *"
        value={formData.collegeName}
        onChangeText={(value) => handleInputChange('collegeName', value)}
      />
      {errors.collegeName && <Text style={styles.errorText}>{errors.collegeName}</Text>}

      <Text style={styles.inputLabel}>College Type *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.collegeType}
          style={[styles.picker, errors.collegeType && styles.inputError]}
          onValueChange={(value) => handleInputChange('collegeType', value)}
        >
          <Picker.Item label="Select College Type" value="" />
          {collegeTypes.map(type => (
            <Picker.Item key={type} label={type} value={type} />
          ))}
        </Picker>
      </View>
      {errors.collegeType && <Text style={styles.errorText}>{errors.collegeType}</Text>}

      <TextInput
        style={[styles.input, errors.affiliatedUniversity && styles.inputError]}
        placeholder="Affiliated University/Board *"
        value={formData.affiliatedUniversity}
        onChangeText={(value) => handleInputChange('affiliatedUniversity', value)}
      />
      {errors.affiliatedUniversity && <Text style={styles.errorText}>{errors.affiliatedUniversity}</Text>}

      <TextInput
        style={[styles.input, errors.yearOfEstablishment && styles.inputError]}
        placeholder="Year of Establishment *"
        keyboardType="numeric"
        value={formData.yearOfEstablishment}
        onChangeText={(value) => handleInputChange('yearOfEstablishment', value)}
      />
      {errors.yearOfEstablishment && <Text style={styles.errorText}>{errors.yearOfEstablishment}</Text>}

      <Text style={styles.inputLabel}>Accreditation Status</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.accreditationStatus}
          style={styles.picker}
          onValueChange={(value) => handleInputChange('accreditationStatus', value)}
        >
          <Picker.Item label="Select Accreditation Status" value="" />
          {accreditationStatuses.map(status => (
            <Picker.Item key={status} label={status} value={status} />
          ))}
        </Picker>
      </View>

      {formData.accreditationStatus && (
        <>
          <TextInput
            style={styles.input}
            placeholder="Accreditation Grade (e.g., NAAC A+)"
            value={formData.accreditationGrade}
            onChangeText={(value) => handleInputChange('accreditationGrade', value)}
          />

          <TextInput
            style={styles.input}
            placeholder="Accreditation Number"
            value={formData.accreditationNumber}
            onChangeText={(value) => handleInputChange('accreditationNumber', value)}
          />

          <TouchableOpacity 
            style={styles.input}
            onPress={() => setShowAccreditationDatePicker(true)}
          >
            <Text style={formData.accreditationValidity ? styles.inputText : styles.placeholderText}>
              {formData.accreditationValidity ? formData.accreditationValidity.toDateString() : 'Accreditation Validity Date'}
            </Text>
          </TouchableOpacity>

          <DatePicker
            modal
            open={showAccreditationDatePicker}
            date={formData.accreditationValidity || new Date()}
            mode="date"
            onConfirm={(date) => {
              setShowAccreditationDatePicker(false);
              handleInputChange('accreditationValidity', date);
            }}
            onCancel={() => {
              setShowAccreditationDatePicker(false);
            }}
          />
        </>
      )}
    </View>
  );

  const renderLocationContacts = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Location & Contacts</Text>
      
      <TextInput
        style={[styles.input, errors['address.street'] && styles.inputError]}
        placeholder="Street Address *"
        value={formData.address.street}
        onChangeText={(value) => handleInputChange('address.street', value)}
      />
      {errors['address.street'] && <Text style={styles.errorText}>{errors['address.street']}</Text>}

      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.halfInput, errors['address.city'] && styles.inputError]}
          placeholder="City *"
          value={formData.address.city}
          onChangeText={(value) => handleInputChange('address.city', value)}
        />
        <TextInput
          style={[styles.input, styles.halfInput, errors['address.pinCode'] && styles.inputError]}
          placeholder="PIN Code *"
          keyboardType="numeric"
          value={formData.address.pinCode}
          onChangeText={(value) => handleInputChange('address.pinCode', value)}
        />
      </View>

      <Text style={styles.inputLabel}>State *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.address.state}
          style={[styles.picker, errors['address.state'] && styles.inputError]}
          onValueChange={(value) => handleInputChange('address.state', value)}
        >
          <Picker.Item label="Select State" value="" />
          {states.map(state => (
            <Picker.Item key={state} label={state} value={state} />
          ))}
        </Picker>
      </View>
      {errors['address.state'] && <Text style={styles.errorText}>{errors['address.state']}</Text>}

      <Text style={styles.inputLabel}>Country *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.address.country}
          style={styles.picker}
          onValueChange={(value) => handleInputChange('address.country', value)}
        >
          {countries.map(country => (
            <Picker.Item key={country} label={country} value={country} />
          ))}
        </Picker>
      </View>

      <TextInput
        style={[styles.input, errors.contactNumber && styles.inputError]}
        placeholder="Main Contact Number *"
        keyboardType="phone-pad"
        value={formData.contactNumber}
        onChangeText={(value) => handleInputChange('contactNumber', value)}
      />
      {errors.contactNumber && <Text style={styles.errorText}>{errors.contactNumber}</Text>}

      <TextInput
        style={[styles.input, errors.officialEmail && styles.inputError]}
        placeholder="Official Email Address *"
        keyboardType="email-address"
        value={formData.officialEmail}
        onChangeText={(value) => handleInputChange('officialEmail', value)}
      />
      {errors.officialEmail && <Text style={styles.errorText}>{errors.officialEmail}</Text>}

      <TextInput
        style={styles.input}
        placeholder="Website URL (optional)"
        keyboardType="url"
        value={formData.website}
        onChangeText={(value) => handleInputChange('website', value)}
      />

      <TextInput
        style={styles.input}
        placeholder="Fax Number (optional)"
        value={formData.faxNumber}
        onChangeText={(value) => handleInputChange('faxNumber', value)}
      />
    </View>
  );

  const renderAdministrativeDetails = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Administrative Details</Text>
      
      <TextInput
        style={[styles.input, errors.principalName && styles.inputError]}
        placeholder="Principal/Head Name *"
        value={formData.principalName}
        onChangeText={(value) => handleInputChange('principalName', value)}
      />
      {errors.principalName && <Text style={styles.errorText}>{errors.principalName}</Text>}

      <Text style={styles.inputLabel}>Designation *</Text>
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={formData.designation}
          style={[styles.picker, errors.designation && styles.inputError]}
          onValueChange={(value) => handleInputChange('designation', value)}
        >
          {designations.map(designation => (
            <Picker.Item key={designation} label={designation} value={designation} />
          ))}
        </Picker>
      </View>
      {errors.designation && <Text style={styles.errorText}>{errors.designation}</Text>}

      <TextInput
        style={[styles.input, errors.principalContact && styles.inputError]}
        placeholder="Contact Number *"
        keyboardType="phone-pad"
        value={formData.principalContact}
        onChangeText={(value) => handleInputChange('principalContact', value)}
      />
      {errors.principalContact && <Text style={styles.errorText}>{errors.principalContact}</Text>}

      <TextInput
        style={[styles.input, errors.principalEmail && styles.inputError]}
        placeholder="Email Address *"
        keyboardType="email-address"
        value={formData.principalEmail}
        onChangeText={(value) => handleInputChange('principalEmail', value)}
      />
      {errors.principalEmail && <Text style={styles.errorText}>{errors.principalEmail}</Text>}
    </View>
  );

  const renderAcademicInformation = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Academic Information</Text>
      
      <Text style={styles.inputLabel}>Departments/Faculties *</Text>
      <View style={styles.row}>
        <TextInput
          style={[styles.input, styles.flexInput]}
          placeholder="Add Department"
          value={formData.newDepartment}
          onChangeText={(value) => handleInputChange('newDepartment', value)}
        />
        <TouchableOpacity style={styles.addButton} onPress={addDepartment}>
          <Icon name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>
      {errors.departments && <Text style={styles.errorText}>{errors.departments}</Text>}

      <FlatList
        data={formData.departments}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item, index }) => (
          <View style={styles.listItem}>
            <Text style={styles.listItemText}>{item}</Text>
            <TouchableOpacity onPress={() => removeDepartment(index)}>
              <Icon name="close" size={20} color="#ff3b30" />
            </TouchableOpacity>
          </View>
        )}
        style={styles.list}
        scrollEnabled={false}
      />

      <Text style={styles.inputLabel}>Courses Offered *</Text>
      {courses.map(course => (
        <TouchableOpacity
          key={course}
          style={styles.checkboxContainer}
          onPress={() => toggleCourse(course)}
        >
          <View style={[
            styles.checkbox,
            formData.coursesOffered.includes(course) && styles.checkboxSelected
          ]}>
            {formData.coursesOffered.includes(course) && (
              <Icon name="check" size={16} color="white" />
            )}
          </View>
          <Text style={styles.checkboxLabel}>{course}</Text>
        </TouchableOpacity>
      ))}
      {errors.coursesOffered && <Text style={styles.errorText}>{errors.coursesOffered}</Text>}

      <TextInput
        style={[styles.input, errors.totalStudents && styles.inputError]}
        placeholder="Total Number of Students (approximate) *"
        keyboardType="numeric"
        value={formData.totalStudents}
        onChangeText={(value) => handleInputChange('totalStudents', value)}
      />
      {errors.totalStudents && <Text style={styles.errorText}>{errors.totalStudents}</Text>}

      <TextInput
        style={[styles.input, errors.facultyMembers && styles.inputError]}
        placeholder="Number of Faculty Members *"
        keyboardType="numeric"
        value={formData.facultyMembers}
        onChangeText={(value) => handleInputChange('facultyMembers', value)}
      />
      {errors.facultyMembers && <Text style={styles.errorText}>{errors.facultyMembers}</Text>}
    </View>
  );

  const renderDocumentsUpload = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Documents Upload</Text>
      
      <TouchableOpacity style={[styles.uploadButton, errors.registrationCertificate && styles.inputError]}>
        <Icon name="attach-file" size={20} color="#007AFF" />
        <Text style={styles.uploadButtonText}>College Registration Certificate *</Text>
      </TouchableOpacity>
      {errors.registrationCertificate && <Text style={styles.errorText}>{errors.registrationCertificate}</Text>}

      <TouchableOpacity style={[styles.uploadButton, errors.affiliationLetter && styles.inputError]}>
        <Icon name="attach-file" size={20} color="#007AFF" />
        <Text style={styles.uploadButtonText}>Affiliation Letter from University/Board *</Text>
      </TouchableOpacity>
      {errors.affiliationLetter && <Text style={styles.errorText}>{errors.affiliationLetter}</Text>}

      <TouchableOpacity style={styles.uploadButton}>
        <Icon name="attach-file" size={20} color="#007AFF" />
        <Text style={styles.uploadButtonText}>Accreditation Certificate(s)</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.uploadButton}>
        <Icon name="attach-file" size={20} color="#007AFF" />
        <Text style={styles.uploadButtonText}>Government Permission / License</Text>
      </TouchableOpacity>

      <Text style={styles.uploadHint}>Supported formats: PDF, JPG, PNG (Max size: 5MB each)</Text>
    </View>
  );

  const renderFacilities = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Facilities (Optional)</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Campus Area Size (in sq meters or acres)"
        value={formData.campusArea}
        onChangeText={(value) => handleInputChange('campusArea', value)}
      />

      <View style={styles.switchContainer}>
        <View style={styles.switchRow}>
          <Switch
            value={formData.hostelFacilities}
            onValueChange={(value) => handleInputChange('hostelFacilities', value)}
          />
          <Text style={styles.switchText}>Hostel Facilities</Text>
        </View>
        {formData.hostelFacilities && (
          <TextInput
            style={styles.input}
            placeholder="Hostel Details"
            value={formData.hostelDetails}
            onChangeText={(value) => handleInputChange('hostelDetails', value)}
          />
        )}
      </View>

      <View style={styles.switchContainer}>
        <View style={styles.switchRow}>
          <Switch
            value={formData.libraryFacilities}
            onValueChange={(value) => handleInputChange('libraryFacilities', value)}
          />
          <Text style={styles.switchText}>Library Facilities</Text>
        </View>
        {formData.libraryFacilities && (
          <TextInput
            style={styles.input}
            placeholder="Library Details"
            value={formData.libraryDetails}
            onChangeText={(value) => handleInputChange('libraryDetails', value)}
          />
        )}
      </View>

      <View style={styles.switchContainer}>
        <View style={styles.switchRow}>
          <Switch
            value={formData.labFacilities}
            onValueChange={(value) => handleInputChange('labFacilities', value)}
          />
          <Text style={styles.switchText}>Lab & Computer Center Facilities</Text>
        </View>
        {formData.labFacilities && (
          <TextInput
            style={styles.input}
            placeholder="Lab Details"
            value={formData.labDetails}
            onChangeText={(value) => handleInputChange('labDetails', value)}
          />
        )}
      </View>

      <View style={styles.switchContainer}>
        <View style={styles.switchRow}>
          <Switch
            value={formData.sportsFacilities}
            onValueChange={(value) => handleInputChange('sportsFacilities', value)}
          />
          <Text style={styles.switchText}>Sports & Recreation Facilities</Text>
        </View>
        {formData.sportsFacilities && (
          <TextInput
            style={styles.input}
            placeholder="Sports Facilities Details"
            value={formData.sportsDetails}
            onChangeText={(value) => handleInputChange('sportsDetails', value)}
          />
        )}
      </View>
    </View>
  );

  const renderComplianceDeclarations = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Compliance & Declarations</Text>
      
      <View style={styles.switchContainer}>
        <View style={styles.switchRow}>
          <Switch
            value={formData.complianceConfirmed}
            onValueChange={(value) => handleInputChange('complianceConfirmed', value)}
          />
          <Text style={styles.switchText}>
            I confirm compliance with all educational regulations and guidelines *
          </Text>
        </View>
        {errors.complianceConfirmed && <Text style={styles.errorText}>{errors.complianceConfirmed}</Text>}
      </View>

      <TextInput
        style={[styles.input, errors.authorizedSignature && styles.inputError]}
        placeholder="Authorized Signature *"
        value={formData.authorizedSignature}
        onChangeText={(value) => handleInputChange('authorizedSignature', value)}
      />
      {errors.authorizedSignature && <Text style={styles.errorText}>{errors.authorizedSignature}</Text>}

      <TouchableOpacity 
        style={[styles.input, errors.agreementDate && styles.inputError]}
        onPress={() => setShowAgreementDatePicker(true)}
      >
        <Text style={formData.agreementDate ? styles.inputText : styles.placeholderText}>
          {formData.agreementDate ? formData.agreementDate.toDateString() : 'Agreement Date *'}
        </Text>
      </TouchableOpacity>
      {errors.agreementDate && <Text style={styles.errorText}>{errors.agreementDate}</Text>}

      <DatePicker
        modal
        open={showAgreementDatePicker}
        date={formData.agreementDate || new Date()}
        mode="date"
        onConfirm={(date) => {
          setShowAgreementDatePicker(false);
          handleInputChange('agreementDate', date);
        }}
        onCancel={() => {
          setShowAgreementDatePicker(false);
        }}
      />

      <View style={styles.switchContainer}>
        <View style={styles.switchRow}>
          <Switch
            value={formData.termsAccepted}
            onValueChange={(value) => handleInputChange('termsAccepted', value)}
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
          />
          <TouchableOpacity onPress={() => setShowPrivacyModal(true)}>
            <Text style={styles.switchText}>
              I agree to the **Privacy Policy** *
            </Text>
          </TouchableOpacity>
        </View>
        {errors.privacyPolicyAccepted && <Text style={styles.errorText}>{errors.privacyPolicyAccepted}</Text>}
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderBasicInformation();
      case 2: return renderLocationContacts();
      case 3: return renderAdministrativeDetails();
      case 4: return renderAcademicInformation();
      case 5: return renderDocumentsUpload();
      case 6: return renderFacilities();
      case 7: return renderComplianceDeclarations();
      default: return renderBasicInformation();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>College Registration</Text>
          <Text style={styles.headerSubtitle}>Complete all steps to register your college</Text>
          {renderProgressBar()}
        </View>

        <View style={styles.stepLabels}>
          <Text style={styles.stepLabel}>Basic</Text>
          <Text style={styles.stepLabel}>Location</Text>
          <Text style={styles.stepLabel}>Admin</Text>
          <Text style={styles.stepLabel}>Academic</Text>
          <Text style={styles.stepLabel}>Documents</Text>
          <Text style={styles.stepLabel}>Facilities</Text>
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
          
          {currentStep < 7 ? (
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
                  <Text style={styles.nextButtonText}>Submit Registration</Text>
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
                Welcome to our educational platform! By registering your college, you agree to abide by our terms and conditions. These terms outline your responsibilities regarding data accuracy, student information protection, and compliance with educational regulations. Unauthorized access or misuse of platform data is strictly prohibited. We reserve the right to modify these terms at any time. Your continued use of the platform constitutes your acceptance of these changes.
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
                Your institution's privacy is important to us. This policy explains how we collect, use, and protect your college's information. We collect data necessary for providing our educational services and ensuring a secure experience. This information may include college details, administrative contacts, and institutional data. We do not share your information with third parties without your explicit consent, except as required by educational authorities or law.
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
  flexInput: {
    flex: 1,
    marginRight: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  uploadHint: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  switchContainer: {
    marginBottom: 15,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  switchText: {
    marginLeft: 15,
    color: '#333',
    flex: 1,
    fontSize: 14,
  },
  addButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    maxHeight: 150,
    marginBottom: 15,
  },
  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  listItemText: {
    color: '#333',
    flex: 1,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 4,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
  },
  checkboxLabel: {
    color: '#333',
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

export default CollegeRegistrationScreen;