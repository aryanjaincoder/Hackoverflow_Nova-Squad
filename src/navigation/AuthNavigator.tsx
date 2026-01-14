import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CollegeLoginScreen from '../screens/Login/CollegeLoginScreen';
import AdminRegistrationScreen from '../screens/Registration/AdminRegistration';
import StudentRegistrationScreen from '../screens/Registration/StudentRegistrationScreen';

// --- 1. Apni saari Auth screens import karein ---

// RoleSelectionScreen ko hata diya gaya hai

// --- 2. स्टैक (Stack) ke liye type banayein ---
// Yeh batata hai ki kaun-kaun si screens hain
export type AuthStackParamList = {
  Login: undefined; 
  AdminRegistration: undefined;
  StudentRegistration: undefined; 
  // RoleSelection ko yahaan se hata diya gaya hai
};

// --- 3. Apna स्टैक (Stack) banayein ---
const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack = () => {
  return (
    <Stack.Navigator
      // App khulne par sabse pehle 'Login' screen dikhao
      initialRouteName="Login"
      screenOptions={{
        headerShown: false, // Default header nahin chahiye
      }}
    >
      {/* --- 4. Sahi flow ke hisaab se screens register karein --- */}

      {/* 1. Login Screen */}
      <Stack.Screen name="Login" component={CollegeLoginScreen} />

      {/* 2. Admin Registration Screen */}
      <Stack.Screen
        name="AdminRegistration"
        component={AdminRegistrationScreen}
      />
      
      {/* 3. Student Registration Screen */}
      <Stack.Screen
        name="StudentRegistration" 
        component={StudentRegistrationScreen}
      />
    </Stack.Navigator>
  );
};

