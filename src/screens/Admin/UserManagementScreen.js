import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Modal, StyleSheet, Linking, Alert, Switch, ActivityIndicator, TextInput, Image, ToastAndroid, Platform } from 'react-native';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore'; 
import { db, auth } from '../../config/firebase';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext'; // Importação do contexto de tema

export default function UserManagementScreen() {
  const { themeColors, currentTheme } = useTheme(); // Cores dinâmicas do tema
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editRole, setEditRole] = useState('client');
  const [editActive, setEditActive] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); 

  const showToast = (message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Aviso', message);
    }
  };

  useEffect(() => {
    setLoading(true);
    const unsubscribe = onSnapshot(collection(db, 'users'), (querySnapshot) => {
      const usersList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersList);
      setLoading(false);
    }, (error) => {
      showToast('Erro ao carregar os usuários.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const openWhatsApp = (phone) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const url = `whatsapp://send?phone=55${cleanPhone}&text=Olá!`;
    Linking.canOpenURL(url).then(supported => {
      if (supported) Linking.openURL(url);
      else Alert.alert('Atenção', 'O WhatsApp não está instalado neste dispositivo.');
    });
  };

  const openModal = (user) => {
    setSelectedUser(user);
    setEditRole(user.role || 'client');
    setEditActive(user.active !== false);
    setModalVisible(true);
  };

  const saveChanges = async () => {
    try {
      const userRef = doc(db, 'users', selectedUser.id);
      await updateDoc(userRef, { role: editRole, active: editActive });
      showToast('Usuário atualizado com sucesso!');
      setModalVisible(false);
    } catch (error) {
      showToast('Erro ao atualizar o usuário.');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = (user.nome?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                          (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const isCurrentUser = selectedUser?.id === auth.currentUser?.uid;

  const renderCard = ({ item }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]} onPress={() => openModal(item)}>
      <View style={styles.avatarContainer}>
        {item.photoUri ? (
          <Image source={{ uri: item.photoUri }} style={[styles.avatar, { borderColor: themeColors.border }]} />
        ) : (
          <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
            <Text style={[styles.avatarText, { color: themeColors.primary }]}>{item.nome ? item.nome.charAt(0).toUpperCase() : 'U'}</Text>
          </View>
        )}
      </View>

      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, { color: themeColors.textPrimary }]}>{item.nome || 'Sem Nome'}</Text>
        <Text style={[styles.cardEmail, { color: themeColors.textSecondary }]}>{item.email}</Text>
        <View style={styles.badgesRow}>
          <Text style={[
            styles.badge, 
            item.role === 'admin' ? { backgroundColor: themeColors.primary + '20', color: themeColors.primary } : 
            item.role === 'funcionario' ? { backgroundColor: themeColors.warning + '20', color: themeColors.warning } : 
            { backgroundColor: themeColors.background, color: themeColors.textSecondary, borderWidth: 1, borderColor: themeColors.border }
          ]}>
            {item.role === 'admin' ? 'Admin' : item.role === 'funcionario' ? 'Entregador' : 'Cliente'}
          </Text>
          {item.active === false && <Text style={[styles.badge, { backgroundColor: themeColors.danger + '20', color: themeColors.danger }]}>Desativado</Text>}
        </View>
      </View>
      
      {item.phone ? (
        <TouchableOpacity style={styles.whatsappBtn} onPress={() => openWhatsApp(item.phone)}>
          <FontAwesome name="whatsapp" size={22} color="#FFF" />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      
      <View style={[styles.filterSection, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        <TextInput
          style={[styles.searchInput, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.border, borderWidth: 1 }]}
          placeholder="Buscar por nome ou e-mail..."
          placeholderTextColor={themeColors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.filterButtonsRow}>
          <TouchableOpacity 
            style={[styles.filterBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border }, roleFilter === 'all' && { backgroundColor: themeColors.primary + '20', borderColor: themeColors.primary }]}
            onPress={() => setRoleFilter('all')}
          >
            <Text style={[styles.filterBtnText, { color: themeColors.textSecondary }, roleFilter === 'all' && { color: themeColors.primary }]}>Todos</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border }, roleFilter === 'admin' && { backgroundColor: themeColors.primary + '20', borderColor: themeColors.primary }]}
            onPress={() => setRoleFilter('admin')}
          >
            <Text style={[styles.filterBtnText, { color: themeColors.textSecondary }, roleFilter === 'admin' && { color: themeColors.primary }]}>Admins</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border }, roleFilter === 'funcionario' && { backgroundColor: themeColors.primary + '20', borderColor: themeColors.primary }]}
            onPress={() => setRoleFilter('funcionario')}
          >
            <Text style={[styles.filterBtnText, { color: themeColors.textSecondary }, roleFilter === 'funcionario' && { color: themeColors.primary }]}>Entregadores</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filterBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border }, roleFilter === 'client' && { backgroundColor: themeColors.primary + '20', borderColor: themeColors.primary }]}
            onPress={() => setRoleFilter('client')}
          >
            <Text style={[styles.filterBtnText, { color: themeColors.textSecondary }, roleFilter === 'client' && { color: themeColors.primary }]}>Clientes</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={themeColors.primary} /></View>
      ) : (
        <FlatList 
          data={filteredUsers} 
          keyExtractor={item => item.id} 
          renderItem={renderCard} 
          contentContainerStyle={styles.list} 
          ListEmptyComponent={<Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>Nenhum usuário encontrado.</Text>}
        />
      )}

      <Modal visible={modalVisible} transparent={true} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Editar Usuário</Text>
            <Text style={[styles.modalSubtitle, { color: themeColors.textSecondary }]}>{selectedUser?.nome}</Text>

            {isCurrentUser && (
              <View style={[styles.warningBox, { backgroundColor: themeColors.warning + '15' }]}>
                <Text style={[styles.warningText, { color: themeColors.warning }]}>⚠️ Você não pode alterar as permissões da sua própria conta.</Text>
              </View>
            )}

            <View style={[styles.switchRow, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.switchLabel, { color: themeColors.textPrimary }, isCurrentUser && { color: themeColors.textSecondary }]}>Cargo do Usuário</Text>
              <View style={styles.roleSelectRow}>
                <TouchableOpacity 
                  style={[styles.roleSelectBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border }, editRole === 'client' && { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary }]}
                  onPress={() => !isCurrentUser && setEditRole('client')}
                >
                  <Text style={[styles.roleSelectText, { color: themeColors.textSecondary }, editRole === 'client' && { color: themeColors.primary }]}>Cliente</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.roleSelectBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border }, editRole === 'funcionario' && { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary }]}
                  onPress={() => !isCurrentUser && setEditRole('funcionario')}
                >
                  <Text style={[styles.roleSelectText, { color: themeColors.textSecondary }, editRole === 'funcionario' && { color: themeColors.primary }]}>Entregador</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.roleSelectBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border }, editRole === 'admin' && { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary }]}
                  onPress={() => !isCurrentUser && setEditRole('admin')}
                >
                  <Text style={[styles.roleSelectText, { color: themeColors.textSecondary }, editRole === 'admin' && { color: themeColors.primary }]}>Admin</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.switchRow, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.switchLabel, { color: themeColors.textPrimary }, isCurrentUser && { color: themeColors.textSecondary }]}>Conta Ativa</Text>
              <Switch 
                value={editActive}
                onValueChange={setEditActive}
                disabled={isCurrentUser}
                trackColor={{ false: themeColors.border, true: themeColors.primary + '80' }} 
                thumbColor={editActive ? themeColors.primary : themeColors.textSecondary}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={[styles.cancelBtnText, { color: themeColors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              
              {!isCurrentUser && (
                <TouchableOpacity style={[styles.saveBtn, { backgroundColor: themeColors.primary }]} onPress={saveChanges}>
                  <Text style={styles.saveBtnText}>Salvar</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  filterSection: { padding: 5, borderBottomWidth: 1, elevation: 2 },
  searchInput: { padding: 12, borderRadius: 10, fontSize: 15, marginBottom: 12 },
  filterButtonsRow: { flexDirection: 'row', gap: 6 },
  filterBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, borderWidth: 1 },
  filterBtnText: { fontWeight: 'bold', fontSize: 11 },
  
  list: { padding: 20, paddingBottom: 40 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16 },
  
  card: { padding: 10, borderRadius: 12, marginBottom: 15, flexDirection: 'row', alignItems: 'center', elevation: 1, borderWidth: 1 },
  avatarContainer: { marginRight: 15 },
  avatar: { width: 50, height: 50, borderRadius: 25, borderWidth: 1 },
  avatarPlaceholder: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  avatarText: { fontSize: 20, fontWeight: 'bold' },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: 'bold' },
  cardEmail: { fontSize: 14, marginTop: 2 },
  badgesRow: { flexDirection: 'row', marginTop: 8, gap: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, fontSize: 11, fontWeight: 'bold', overflow: 'hidden' },
  whatsappBtn: { backgroundColor: '#25D366', width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginLeft: 10 },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 15, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 5 },
  modalSubtitle: { fontSize: 16, marginBottom: 20 },
  warningBox: { padding: 12, borderRadius: 8, marginBottom: 20 },
  warningText: { fontSize: 13, fontWeight: 'bold', textAlign: 'center' },
  
  switchRow: { paddingVertical: 10, borderBottomWidth: 1, marginBottom: 5, flexDirection: 'column' },
  switchLabel: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  roleSelectRow: { flexDirection: 'row', gap: 10 },
  roleSelectBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, borderWidth: 1 },
  roleSelectText: { fontSize: 12, fontWeight: 'bold' },
  
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', gap: 15, marginTop: 25 },
  cancelBtn: { padding: 10 },
  cancelBtnText: { fontWeight: 'bold' },
  saveBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
});