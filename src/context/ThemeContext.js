import React, { createContext, useState, useEffect, useContext } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ThemeContext = createContext();

// Paleta de Cores Claras e Escuras
export const colors = {
  light: {
    background: '#F8FAFC',
    card: '#FFFFFF',
    textPrimary: '#0F172A',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    primary: '#2563EB',
    danger: '#DC2626',
    success: '#10B981',
    warning: '#F59E0B',
    headerBg: '#2563EB',
    headerText: '#FFFFFF',
  },
  dark: {
    background: '#0F172A',
    card: '#1E293B',
    textPrimary: '#F8FAFC',
    textSecondary: '#94A3B8',
    border: '#334155',
    primary: '#3B82F6', 
    danger: '#EF4444',
    success: '#10B981',
    warning: '#FBBF24',
    headerBg: '#1E293B',
    headerText: '#F8FAFC',
  }
};

export const ThemeProvider = ({ children }) => {
  const systemTheme = useColorScheme(); 
  const [themePreference, setThemePreference] = useState('system'); 
  const [currentTheme, setCurrentTheme] = useState(systemTheme || 'light');

  // Buscar preferência da memória local do celular ao abrir o app
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@theme_preference');
        if (savedTheme) {
          setThemePreference(savedTheme);
        }
      } catch (error) {
        console.error("Erro ao buscar tema na memória local:", error);
      }
    };
    fetchTheme();
  }, []);

  // Atualizar tema atual baseado na preferência ou sistema
  useEffect(() => {
    if (themePreference === 'system') {
      setCurrentTheme(systemTheme || 'light');
    } else {
      setCurrentTheme(themePreference);
    }
  }, [themePreference, systemTheme]);

  // Função para alterar e salvar no armazenamento local
  const changeThemePreference = async (newPreference) => {
    setThemePreference(newPreference);
    try {
      await AsyncStorage.setItem('@theme_preference', newPreference);
    } catch (error) {
      console.error("Erro ao salvar tema na memória local:", error);
    }
  };

  const themeColors = colors[currentTheme];

  return (
    <ThemeContext.Provider value={{ themePreference, currentTheme, themeColors, changeThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);