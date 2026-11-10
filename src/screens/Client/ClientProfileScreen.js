import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, Image, Modal,
  ActivityIndicator, Alert, ToastAndroid, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { db, auth } from '../../config/firebase';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext'; // Importação do contexto de tema

export default function ClientProfileScreen() {
  const { themeColors } = useTheme(); // Cores dinâmicas do tema atual
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userData, setUserData] = useState(null);
  
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editNome, setEditNome] = useState('');
  const [editTelefone, setEditTelefone] = useState('');
  const [editFotoUri, setEditFotoUri] = useState(null);

  const showToast = (message) => {
    if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
    else Alert.alert('Aviso', message);
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const docRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) setUserData(docSnap.data());
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatPhone = (text) => {
    const cleaned = ('' + text).replace(/\D/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2) formatted = `(${cleaned.substring(0,2)}) ` + cleaned.substring(2);
    if (cleaned.length > 7) formatted = `(${cleaned.substring(0,2)}) ${cleaned.substring(2,7)}-${cleaned.substring(7,11)}`;
    return formatted;
  };

  const openEditModal = () => {
    setEditNome(userData?.nome || '');
    setEditTelefone(formatPhone(userData?.telefone || userData?.phone || ''));
    setEditFotoUri(userData?.photoUri || null);
    setEditModalVisible(true);
  };

 const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão', 'Precisamos de acesso às fotos para mudar o perfil.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], 
      allowsEditing: true, 
      aspect: [1, 1], 
      quality: 0.5,
      base64: true, // Fundamental para o ImgBB
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      showToast('Processando nova foto...');
      try {
        const base64Img = result.assets[0].base64;
        const formData = new FormData();
        formData.append('key', 'cb9f0289dd535280be7750ee2a73e79b');
        formData.append('image', base64Img);

        const response = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (data.success) {
          setEditFotoUri(data.data.url); // Atualiza o avatar publicamente
          showToast('Nova foto carregada!');
        }
      } catch (error) {
        showToast('Falha na conexão ao atualizar foto.');
      }
    }
  };

  const handleSaveProfile = async () => {
    if (!editNome) { showToast('O nome não pode ficar vazio.'); return; }
    setSaving(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { nome: editNome, telefone: editTelefone, photoUri: editFotoUri });
      showToast('Perfil atualizado com sucesso!');
      setEditModalVisible(false);
    } catch (error) {
      showToast('Erro ao salvar os dados.');
    }
    setSaving(false);
  };

  const handleResetPassword = async () => {
    if (!userData?.email) return;
    try {
      await sendPasswordResetEmail(auth, userData.email);
      showToast('Link de redefinição enviado para o seu e-mail!');
    } catch (error) {
      showToast('Erro ao enviar e-mail. Tente novamente.');
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      
      {/* Card de Perfil */}
      <View style={[styles.profileCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <View style={styles.avatarContainer}>
          {userData?.photoUri ? (
            <Image source={{ uri: userData.photoUri }} style={[styles.avatar, { borderColor: themeColors.border }]} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.border, borderColor: themeColors.background }]}>
              <Text style={[styles.avatarText, { color: themeColors.primary }]}>
                {userData?.nome ? userData.nome.charAt(0).toUpperCase() : 'U'}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.infoContainer}>
          <Text style={[styles.nameText, { color: themeColors.textPrimary }]}>{userData?.nome || 'Nome não informado'}</Text>
          <Text style={[styles.emailText, { color: themeColors.textSecondary }]}>{userData?.email}</Text>
          <View style={styles.phoneRow}>
            <FontAwesome name="whatsapp" size={14} color="#16A34A" />
            <Text style={styles.phoneText}>{formatPhone(userData?.telefone || userData?.phone || 'Não informado')}</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.editBtn, { backgroundColor: themeColors.primary }]} onPress={openEditModal}>
          <FontAwesome name="edit" size={16} color="#FFF" />
          <Text style={styles.editBtnText}>Editar Meus Dados</Text>
        </TouchableOpacity>
      </View>

      {/* Opção Trocar Senha */}
      <TouchableOpacity 
        style={[styles.optionBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]} 
        onPress={handleResetPassword}
      >
        <View style={styles.optionLeft}>
          <View style={[styles.iconBox, { backgroundColor: themeColors.background }]}>
            <FontAwesome name="lock" size={18} color={themeColors.danger} />
          </View>
          <Text style={[styles.optionText, { color: themeColors.textPrimary }]}>Enviar Link para Trocar Senha</Text>
        </View>
        <FontAwesome name="chevron-right" size={14} color={themeColors.textSecondary} />
      </TouchableOpacity>

      {/* Modal de Edição */}
      <Modal visible={editModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Editar Perfil</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <FontAwesome name="times" size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.modalAvatarEdit} onPress={pickImage}>
              {editFotoUri ? (
                <Image source={{ uri: editFotoUri }} style={styles.modalAvatarImg} />
              ) : (
                <View style={[styles.modalAvatarPlaceholder, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                  <FontAwesome name="camera" size={24} color={themeColors.textSecondary} />
                </View>
              )}
              <View style={[styles.editBadge, { backgroundColor: themeColors.primary, borderColor: themeColors.card }]}>
                <FontAwesome name="pencil" size={12} color="#FFF" />
              </View>
            </TouchableOpacity>

            <Text style={[styles.label, { color: themeColors.textSecondary }]}>Nome Completo</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]} 
              value={editNome} 
              onChangeText={setEditNome} 
              placeholder="Seu nome" 
              placeholderTextColor={themeColors.textSecondary}
            />

            <Text style={[styles.label, { color: themeColors.textSecondary }]}>WhatsApp / Telefone</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]} 
              value={editTelefone} 
              onChangeText={(txt) => setEditTelefone(formatPhone(txt))} 
              keyboardType="phone-pad" 
              placeholder="(00) 00000-0000" 
              placeholderTextColor={themeColors.textSecondary}
              maxLength={15} 
            />

            <TouchableOpacity style={[styles.saveBtn, { backgroundColor: themeColors.success }]} onPress={handleSaveProfile} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Salvar Alterações</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  profileCard: { borderRadius: 15, padding: 20, alignItems: 'center', elevation: 2, marginBottom: 20, borderWidth: 1 },
  avatarContainer: { marginBottom: 15 },
  avatar: { width: 90, height: 90, borderRadius: 45, borderWidth: 3 },
  avatarPlaceholder: { width: 90, height: 90, borderRadius: 45, justifyContent: 'center', alignItems: 'center', borderWidth: 3 },
  avatarText: { fontSize: 36, fontWeight: 'bold' },
  infoContainer: { alignItems: 'center', marginBottom: 20 },
  nameText: { fontSize: 20, fontWeight: 'bold', marginBottom: 4 },
  emailText: { fontSize: 14, marginBottom: 6 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0FDF4', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  phoneText: { fontSize: 13, color: '#16A34A', fontWeight: 'bold', marginLeft: 6 },
  editBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, width: '100%', justifyContent: 'center' },
  editBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 },
  optionBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 15, elevation: 1, borderWidth: 1 },
  optionLeft: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 35, height: 35, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  optionText: { fontSize: 15, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 15, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottomWidth: 1, paddingBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalAvatarEdit: { alignSelf: 'center', marginBottom: 20, position: 'relative' },
  modalAvatarImg: { width: 80, height: 80, borderRadius: 40 },
  modalAvatarPlaceholder: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  editBadge: { position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 15 },
  saveBtn: { padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});