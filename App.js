import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Localization from 'expo-localization';
import AppNavigator from './src/navigation/AppNavigator';
import { ThemeProvider } from './src/context/ThemeContext';

export default function App() {
  // Executa UMA vez ao montar o app — fora do JSX
  useEffect(() => {
    const tz = Localization.getCalendars()[0]?.timeZone;
    console.log('Fuso detectado:', tz);
  }, []);

  return (
    <ThemeProvider>
      <StatusBar style="auto" />
      <AppNavigator />
    </ThemeProvider>
  );
}