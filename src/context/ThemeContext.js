import React, { createContext, useState, useEffect, useContext } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

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
    primary: '#3B82F6', // Azul um pouco mais claro para contraste no escuro
    danger: '#EF4444',
    success: '#10B981',
    warning: '#FBBF24',
    headerBg: '#1E293B',
    headerText: '#F8FAFC',
  }
};

export const ThemeProvider = ({ children }) => {
  const systemTheme = useColorScheme(); // 'light' ou 'dark' do sistema
  const [themePreference, setThemePreference] = useState('system'); // 'light', 'dark', 'system'
  const [currentTheme, setCurrentTheme] = useState(systemTheme || 'light');

  // Buscar preferência do Firebase ao logar
  useEffect(() => {
    const fetchTheme = async () => {
      if (auth.currentUser) {
        try {
          const docRef = doc(db, 'users', auth.currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().themePreference) {
            setThemePreference(docSnap.data().themePreference);
          }
        } catch (error) {
          console.error("Erro ao buscar tema:", error);
        }
      }
    };
    fetchTheme();
  }, [auth.currentUser]);

  // Atualizar tema atual baseado na preferência ou sistema
  useEffect(() => {
    if (themePreference === 'system') {
      setCurrentTheme(systemTheme || 'light');
    } else {
      setCurrentTheme(themePreference);
    }
  }, [themePreference, systemTheme]);

  // Função para alterar e salvar no Firebase
  const changeThemePreference = async (newPreference) => {
    setThemePreference(newPreference);
    if (auth.currentUser) {
      try {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(docRef, { themePreference: newPreference });
      } catch (error) {
        console.error("Erro ao salvar tema:", error);
      }
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