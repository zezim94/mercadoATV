import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/context/ThemeContext'; // Importe o contexto

export default function App() {
  return (
    <ThemeProvider>
      {/* O status bar agora se ajustará ao tema automaticamente caso você configure 'auto' depois */}
      <StatusBar style="auto" /> 
      <AppNavigator />
    </ThemeProvider>
  );
}