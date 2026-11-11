import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons'; 
import { useTheme } from '../context/ThemeContext';
import { initDB } from '../config/database'; // <-- IMPORTAÇÃO DO BANCO

import CustomDrawerContent from './CustomDrawerContent'; 

// Telas do Aplicativo
import WelcomeScreen from '../screens/WelcomeScreen';
import HomeScreen from '../screens/HomeScreen'; 
import ProdutosScreen from '../screens/ProdutosScreen';
import CadastroProdutoScreen from '../screens/CadastroProdutoScreen';
import FornecedoresScreen from '../screens/FornecedoresScreen';
import MovimentacoesScreen from '../screens/MovimentacoesScreen';
import RelatoriosScreen from '../screens/RelatoriosScreen';

const Stack = createNativeStackNavigator(); 
const Drawer = createDrawerNavigator(); 

// ... (Mantenha sua function DrawerNavigator() exatamente como está) ...
function DrawerNavigator() {
  const { themeColors } = useTheme(); 

  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}  
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.headerBg }, 
        headerTintColor: themeColors.headerText, 
        drawerActiveTintColor: themeColors.primary,
        drawerInactiveTintColor: themeColors.textPrimary, 
        drawerStyle: { backgroundColor: themeColors.background }, 
        sceneContainerStyle: { backgroundColor: themeColors.background },
      }}
    >
      <Drawer.Screen name="Painel" component={HomeScreen} options={{ title: 'Início', drawerIcon: ({ color, size }) => <FontAwesome5 name="home" size={size} color={color} /> }} />
      <Drawer.Screen name="Produtos" component={ProdutosScreen} options={{ title: 'Produtos', drawerIcon: ({ color, size }) => <FontAwesome5 name="box-open" size={size} color={color} /> }} />
      <Drawer.Screen name="Fornecedores" component={FornecedoresScreen} options={{ title: 'Fornecedores', drawerIcon: ({ color, size }) => <FontAwesome5 name="truck" size={size} color={color} /> }} />
      <Drawer.Screen name="Movimentacoes" component={MovimentacoesScreen} options={{ title: 'Entrada / Saída', drawerIcon: ({ color, size }) => <FontAwesome5 name="exchange-alt" size={size} color={color} /> }} />
      <Drawer.Screen 
  name="Relatorios" 
  component={RelatoriosScreen} 
  options={{ 
    title: 'Relatórios',
    drawerIcon: ({ color, size }) => <FontAwesome5 name="chart-pie" size={size} color={color} />
  }} 
/>
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  const { themeColors } = useTheme();
  const [dbReady, setDbReady] = useState(false); // Estado para segurar a tela

  // Executa a criação das tabelas antes de abrir o app
  useEffect(() => {
    async function setupDatabase() {
      await initDB();
      setDbReady(true);
    }
    setupDatabase();
  }, []);

  // Tela de carregamento enquanto o banco é criado
  if (!dbReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Welcome">
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Main" component={DrawerNavigator} />
        
        <Stack.Screen 
          name="CadastroProduto" 
          component={CadastroProdutoScreen} 
          options={{ 
            headerShown: true, 
            title: 'Gerenciar Produto',
            headerStyle: { backgroundColor: themeColors.headerBg },
            headerTintColor: themeColors.headerText
          }} 
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}