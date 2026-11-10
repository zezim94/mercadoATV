import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, ToastAndroid } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext'; // Importação do contexto de tema

export default function ProfileScreen({ navigation }) {
  const { themeColors } = useTheme(); // Cores dinâmicas do tema atual
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const showToast = (message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Aviso', message);
    }
  };

  const formatPhone = (text) => {
    if (!text) {
      setPhone('');
      return;
    }
    let value = String(text).replace(/\D/g, ''); 
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    if (value.length > 9) value = value.replace(/(\d{5})(\d)/, '$1-$2');
    setPhone(value);
  };

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            setNome(data.nome || '');
            setEmail(data.email || user.email);
            formatPhone(data.phone || ''); 
            setImageUri(data.photoUri || null);
          }
        }
      } catch (error) {
        showToast('Erro ao carregar dados do perfil.');
      }
      setLoading(false);
    };
    fetchUserData();
  }, []);

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permissão', 'Precisamos de acesso às suas fotos.'); 
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
      setSaving(true); // Bloqueia o botão enquanto faz upload
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
          setImageUri(data.data.url); // Atualiza com o Link Público do ImgBB
          showToast('Nova foto carregada!');
        } else {
          showToast('Erro ao processar a imagem.');
        }
      } catch (error) {
        showToast('Falha na conexão ao atualizar foto.');
      }
      setSaving(false);
    }
  };

  const handleUpdateProfile = async () => {
    if (!nome || !phone) {
      showToast('Por favor, preencha o nome e telefone.');
      return;
    }
    setSaving(true);
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        nome,
        phone,
        photoUri: imageUri
      });
      showToast('Perfil atualizado com sucesso!');
      navigation.goBack();
    } catch (error) {
      showToast('Erro ao atualizar perfil.');
    }
    setSaving(false);
  };

  const handleResetPassword = () => {
    Alert.alert(
      'Redefinir Senha',
      `Enviar link de redefinição para ${email}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Enviar', 
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, email);
              showToast('E-mail de recuperação enviado!');
            } catch (error) {
              showToast('Erro ao enviar e-mail.');
            }
          } 
        }
      ]
    );
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          
          <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} disabled={saving}>
              {imageUri ? (
                <Image source={{ uri: imageUri } } style={styles.avatar} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.border }]}>
                  <Text style={[styles.avatarText, { color: themeColors.primary }]}>
                    {nome ? nome.charAt(0).toUpperCase() : 'U'}
                  </Text>
                </View>
              )}
              <View style={[styles.editIconBadge, { backgroundColor: themeColors.primary }]}>
                <FontAwesome name="camera" size={14} color="#FFF" />
              </View>
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]}
              placeholder="Nome Completo"
              placeholderTextColor={themeColors.textSecondary}
              value={nome}
              onChangeText={setNome}
            />

            <TextInput
              style={[styles.input, styles.inputDisabled, { backgroundColor: themeColors.border, color: themeColors.textSecondary }]}
              value={email}
              editable={false} 
              placeholderTextColor={themeColors.textSecondary}
            />

            <TextInput
              style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]}
              placeholder="Telefone"
              placeholderTextColor={themeColors.textSecondary}
              value={phone}
              onChangeText={formatPhone}
              keyboardType="numeric"
              maxLength={15}
            />

            <TouchableOpacity style={styles.resetLink} onPress={handleResetPassword}>
              <FontAwesome name="lock" size={16} color={themeColors.primary} />
              <Text style={[styles.resetText, { color: themeColors.primary }]}>Trocar minha senha</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, { backgroundColor: themeColors.success }]} onPress={handleUpdateProfile} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Salvar Alterações</Text>}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 15 },
  card: { borderRadius: 20, padding: 20, elevation: 3, borderWidth: 1 },
  avatarContainer: { alignSelf: 'center', marginBottom: 25 },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#3B82F6' },
  avatarPlaceholder: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 40, fontWeight: 'bold' },
  editIconBadge: { position: 'absolute', bottom: 0, right: 10, padding: 8, borderRadius: 20, elevation: 4 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16 },
  inputDisabled: {},
  resetLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, marginBottom: 10 },
  resetText: { fontSize: 16, fontWeight: 'bold' },
  button: { padding: 18, borderRadius: 12, alignItems: 'center', elevation: 4 },
  buttonText: { color: '#FFF', fontSize: 17, fontWeight: 'bold' },
});