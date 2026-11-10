import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext'; 

export default function CustomDrawerContent(props) {
  const [userData, setUserData] = useState(null);
  const { themePreference, changeThemePreference, themeColors, currentTheme } = useTheme();

  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        const docRef = doc(db, 'users', currentUser.uid);
        unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
          if (docSnap.exists()) {
            setUserData(docSnap.data());
          }
        }, (error) => console.log("Erro ao buscar dados do perfil", error));
      } else {
        setUserData(null);
        if (unsubscribeSnapshot) unsubscribeSnapshot();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    props.navigation.closeDrawer();
    props.navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return { style: styles.roleAdmin, text: 'Administrador' };
      case 'funcionario': return { style: styles.roleEmployee, text: 'Entregador' };
      default: return { style: styles.roleClient, text: 'Cliente' };
    }
  };

  const badge = userData?.role ? getRoleBadge(userData.role) : null;
  const isGuest = !auth.currentUser;

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={[styles.scrollContainer, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.headerBg, borderBottomColor: themeColors.border }]}>
        {!isGuest ? (
          <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => props.navigation.navigate('Profile')}>
            {userData?.photoUri ? (
              <Image source={{ uri: userData.photoUri }} style={styles.avatar} /> 
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.card }]}>
                <Text style={[styles.avatarText, { color: themeColors.primary }]}>
                  {userData?.nome ? userData.nome.charAt(0).toUpperCase() : 'U'}
                </Text>
              </View>
            )}
            <Text style={[styles.nome, { color: themeColors.headerText }]}>{userData?.nome || 'Carregando...'}</Text>
            <Text style={[styles.email, { color: themeColors.textSecondary }]}>{userData?.email || ''}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ alignItems: 'center', marginTop: 20 }}>
             <FontAwesome name="user-circle" size={60} color={themeColors.textSecondary} />
             <Text style={[styles.nome, { marginTop: 10, color: themeColors.headerText }]}>Modo Visitante</Text>
          </View>
        )}
        
        {badge && !isGuest && (
          <View style={[styles.roleBadge, badge.style]}>
            <Text style={styles.roleText}>{badge.text}</Text>
          </View>
        )}
      </View>

      {/* Container da Lista de Rotas com Sobrescrita de Cor para o Texto do Drawer */}
      <View style={[styles.listContainer, { backgroundColor: themeColors.background }]}>
        <DrawerItemList 
          {...props} 
          // Força as cores dos itens do menu lateral baseadas no tema atual
          screenOptions={{
            drawerActiveTintColor: themeColors.primary,
            drawerInactiveTintColor: themeColors.textPrimary,
          }}
        /> 
      </View>

      {/* --- SELETOR DE TEMA --- */}
      {!isGuest && (
        <View style={[styles.themeSection, { borderTopColor: themeColors.border }]}>
          <Text style={[styles.themeTitle, { color: themeColors.textSecondary }]}>Aparência</Text>
          <View style={[styles.themeRow, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <TouchableOpacity 
              style={[styles.themeBtn, themePreference === 'light' && { backgroundColor: themeColors.primary }]} 
              onPress={() => changeThemePreference('light')}
            >
              <FontAwesome name="sun-o" size={16} color={themePreference === 'light' ? '#FFF' : themeColors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.themeBtn, themePreference === 'system' && { backgroundColor: themeColors.primary }]} 
              onPress={() => changeThemePreference('system')}
            >
              <FontAwesome name="mobile" size={18} color={themePreference === 'system' ? '#FFF' : themeColors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.themeBtn, themePreference === 'dark' && { backgroundColor: themeColors.primary }]} 
              onPress={() => changeThemePreference('dark')}
            >
              <FontAwesome name="moon-o" size={16} color={themePreference === 'dark' ? '#FFF' : themeColors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!isGuest && (
        <TouchableOpacity style={styles.botaoSair} onPress={handleLogout}>
          <Text style={styles.textoBotaoSair}>🚪 Sair da Conta</Text>
        </TouchableOpacity>
      )}
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { paddingTop: 0, flexGrow: 1 },
  header: { padding: 20, paddingTop: 40, alignItems: 'center', marginBottom: 5, borderBottomWidth: 1 },
  avatar: { width: 85, height: 85, borderRadius: 45, marginBottom: 12, borderWidth: 3, borderColor: '#FFFFFF' },
  avatarPlaceholder: { width: 85, height: 85, borderRadius: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  avatarText: { fontSize: 34, fontWeight: 'bold' },
  nome: { fontSize: 18, fontWeight: 'bold' },
  email: { fontSize: 14, marginTop: 2 },
  roleBadge: { marginTop: 10, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  roleAdmin: { backgroundColor: '#10B981' }, 
  roleEmployee: { backgroundColor: '#F59E0B' }, 
  roleClient: { backgroundColor: '#3B82F6', borderWidth: 1, borderColor: '#60A5FA' },
  roleText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' },
  listContainer: { flex: 1, paddingTop: 5 },
  
  themeSection: { padding: 20, borderTopWidth: 1, marginTop: 5 },
  themeTitle: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10 },
  themeRow: { flexDirection: 'row', justifyContent: 'space-between', borderRadius: 10, padding: 5, borderWidth: 1 },
  themeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },

  botaoSair: { marginTop: 10, padding: 15, backgroundColor: '#EF4444', marginHorizontal: 20, borderRadius: 10, alignItems: 'center', marginBottom: 30 },
  textoBotaoSair: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});