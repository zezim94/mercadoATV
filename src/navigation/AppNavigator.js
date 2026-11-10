import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { FontAwesome } from '@expo/vector-icons';
import { auth } from '../config/firebase'; 
import { useTheme } from '../context/ThemeContext'; // Importa o hook de tema

import CustomDrawerContent from './CustomDrawerContent'; 

import LoginScreen from '../screens/Auth/LoginScreen'; 
import RegisterScreen from '../screens/Auth/RegisterScreen'; 
import AdminScreen from '../screens/Admin/AdminScreen'; 
import HomeScreen from "../screens/HomeScreen";
import UserManagementScreen from '../screens/Admin/UserManagementScreen'; 
import ProductManagementScreen from '../screens/Admin/ProductManagementScreen';
import AdminOrderManagementScreen from "../screens/Admin/AdminOrderManagementScreen";
import AdminReportsScreen from "../screens/Admin/AdminReportsScreen"; 
import ProfileScreen from '../screens/Profile/ProfileScreen';
import EmployeeScreen from "../screens/Employee/EmployeeScreen";
import CheckoutScreen from "../screens/Client/CheckoutScreen";
import OrderHistoryScreen from "../screens/Client/OrderHistoryScreen";
import ClientProfileScreen from "../screens/Client/ClientProfileScreen";
import ClientAddressScreen from "../screens/Client/ClientAddressScreen";

const Stack = createNativeStackNavigator(); 
const Drawer = createDrawerNavigator(); 
const Tab = createBottomTabNavigator();

function ClientTabNavigator() {
  const { themeColors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Historico') iconName = 'list-alt';
          else if (route.name === 'MeusDados') iconName = 'user';
          else if (route.name === 'Enderecos') iconName = 'map-marker';
          return <FontAwesome name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: themeColors.primary,
        tabBarInactiveTintColor: themeColors.textSecondary,
        headerShown: false, 
        tabBarStyle: { 
          height: 60, 
          paddingBottom: 10, 
          paddingTop: 5, 
          backgroundColor: themeColors.card,
          borderTopColor: themeColors.border 
        }
      })}
    >
      <Tab.Screen name="Historico" component={OrderHistoryScreen} options={{ title: 'Histórico' }} />
      <Tab.Screen name="MeusDados" component={ClientProfileScreen} options={{ title: 'Meus Dados' }} />
      <Tab.Screen name="Enderecos" component={ClientAddressScreen} options={{ title: 'Endereços' }} />
    </Tab.Navigator>
  );
}

function AdminTabNavigator() {
  const { themeColors } = useTheme();
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Resumo') iconName = 'bar-chart';
          else if (route.name === 'Produtos') iconName = 'plus-circle';
          else if (route.name === 'Encomendas') iconName = 'list-alt';
          else if (route.name === 'Relatorios') iconName = 'pie-chart';
          return <FontAwesome name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#10B981', 
        tabBarInactiveTintColor: themeColors.textSecondary,
        headerShown: false, 
        tabBarStyle: { 
          height: 60, 
          paddingBottom: 10, 
          paddingTop: 5, 
          backgroundColor: themeColors.card,
          borderTopColor: themeColors.border 
        }
      })}
    >
      <Tab.Screen name="Resumo" component={AdminScreen} options={{ title: 'Resumo' }} />
      <Tab.Screen name="Encomendas" component={AdminOrderManagementScreen} options={{ title: 'Encomendas' }} />
      <Tab.Screen name="Relatorios" component={AdminReportsScreen} options={{ title: 'Relatórios' }} />
      <Tab.Screen name="Produtos" component={ProductManagementScreen} options={{ title: 'Produtos' }} />
    </Tab.Navigator>
  );
}

function DrawerNavigator({ route, navigation }) {
  const userRole = route.params?.userRole || 'client'; 
  const isGuest = !auth.currentUser; 
  const { themeColors } = useTheme(); // Obtém as cores do tema atual

  const getInitialRoute = () => {
    if (userRole === "admin") return "AdminArea";
    if (userRole === "funcionario") return "EmployeeArea";
    return "ClientArea";
  };

  return (
    <Drawer.Navigator
      initialRouteName={getInitialRoute()} 
      drawerContent={(props) => <CustomDrawerContent {...props} />}  
      screenOptions={{
        headerStyle: { backgroundColor: themeColors.headerBg }, 
        headerTintColor: themeColors.headerText, 
        drawerActiveTintColor: themeColors.primary,
        drawerInactiveTintColor: themeColors.textPrimary, // Mantém o texto visível no modo escuro/claro
        drawerStyle: { backgroundColor: themeColors.background }, // Fundo da gaveta sincronizado
        sceneContainerStyle: { backgroundColor: themeColors.background },
        swipeEnabled: !isGuest, 
        headerLeft: isGuest ? () => (
          <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ marginLeft: 15 }}>
             <FontAwesome name="sign-in" size={24} color={themeColors.headerText} />
          </TouchableOpacity>
        ) : undefined, 
      }}
    >
      {(userRole === 'client' || isGuest) && (
        <>
          <Drawer.Screen 
            name="ClientArea" 
            component={HomeScreen} 
            options={{ title: isGuest ? '🛒 Loja (Visitante)' : '🛒 Loja' }} 
          />
          {!isGuest && (
            <Drawer.Screen name="ClientPanel" component={ClientTabNavigator} options={{ title: '👤 Meu Painel' }} />
          )}
        </>
      )}

      {userRole === 'funcionario' && (
        <Drawer.Group>
          <Drawer.Screen name="EmployeeArea" component={EmployeeScreen} options={{ title: "🛵 Minhas Entregas" }} />
        </Drawer.Group>
      )}

      {userRole === 'admin' && (
        <Drawer.Group>
          <Drawer.Screen name="AdminArea" component={AdminTabNavigator} options={{ title: '⚙️ Painel Administrador' }} />
          <Drawer.Screen name="UserManagement" component={UserManagementScreen} options={{ title: '👥 Gestão de Usuários' }} />
        </Drawer.Group>
      )}
    </Drawer.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Main">
        <Stack.Screen name="Main" component={DrawerNavigator} />
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: true, title: 'Cadastro' }} />
        <Stack.Screen name="Profile" component={ProfileScreen} options={{ headerShown: true, title: 'Acesso Rápido', headerStyle: { backgroundColor: '#2563EB' }, headerTintColor: '#FFF' }} />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: true, title: 'Finalizar Pedido', headerStyle: { backgroundColor: '#2563EB' }, headerTintColor: '#FFF' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}