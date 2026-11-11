import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { DrawerContentScrollView, DrawerItemList } from '@react-navigation/drawer';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext'; 

export default function CustomDrawerContent(props) {
  const { themePreference, changeThemePreference, themeColors } = useTheme();

  const handleLogout = () => {
    // Volta para a tela inicial de Entrada
    props.navigation.closeDrawer();
    props.navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  return (
    <DrawerContentScrollView {...props} contentContainerStyle={[styles.scrollContainer, { backgroundColor: themeColors.background }]}>
      
      {/* CABEÇALHO DO MENU COM A LOGO */}
      <View style={[styles.header, { backgroundColor: themeColors.headerBg, borderBottomColor: themeColors.border }]}>
        <View style={[styles.logoWrapper, { backgroundColor: themeColors.card, borderColor: themeColors.primary }]}>
          <Image 
            source={require('../../assets/logo2.png')} 
            style={styles.logo} 
          />
        </View>
        <Text style={[styles.nome, { color: themeColors.headerText }]}>Meu Mercado</Text>
        <Text style={[styles.email, { color: 'rgba(255,255,255,0.7)' }]}>Gestão Offline</Text>
      </View>

      {/* LISTA DE ROTAS (Produtos, Fornecedores, etc) */}
      <View style={[styles.listContainer, { backgroundColor: themeColors.background }]}>
        <DrawerItemList 
          {...props} 
          screenOptions={{
            drawerActiveTintColor: themeColors.primary,
            drawerInactiveTintColor: themeColors.textPrimary,
          }}
        /> 
      </View>

      {/* SELETOR DE TEMA */}
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

      {/* BOTÃO VOLTAR PARA A TELA INICIAL */}
      <TouchableOpacity style={styles.botaoSair} onPress={handleLogout}>
        <Text style={styles.textoBotaoSair}>Voltar ao Início</Text>
      </TouchableOpacity>
      
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { paddingTop: 0, flexGrow: 1 },
  header: { padding: 20, paddingTop: 40, alignItems: 'center', marginBottom: 5, borderBottomWidth: 1 },
  
  // Estilos da Logo no Menu
  logoWrapper: { width: 150, height: 150, borderRadius: 75, justifyContent: 'center', alignItems: 'center', marginBottom: 12, borderWidth: 2, overflow: 'hidden' },
  logo: { width: '90%', height: '90%', resizeMode: 'cover' },
  
  nome: { fontSize: 18, fontWeight: 'bold' },
  email: { fontSize: 13, marginTop: 2 },
  listContainer: { flex: 1, paddingTop: 5 },
  
  themeSection: { padding: 20, borderTopWidth: 1, marginTop: 5 },
  themeTitle: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase', marginBottom: 10 },
  themeRow: { flexDirection: 'row', justifyContent: 'space-between', borderRadius: 10, padding: 5, borderWidth: 1 },
  themeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },

  botaoSair: { marginTop: 10, padding: 15, backgroundColor: '#EF4444', marginHorizontal: 20, borderRadius: 10, alignItems: 'center', marginBottom: 30 },
  textoBotaoSair: { color: '#FFFFFF', fontWeight: 'bold', fontSize: 16 },
});