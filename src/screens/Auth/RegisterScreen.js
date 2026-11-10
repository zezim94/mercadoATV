import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image, 
  Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, 
  Platform, ToastAndroid 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useTheme } from '../../context/ThemeContext'; // Importação do contexto

export default function RegisterScreen({ navigation }) {
  const { themeColors } = useTheme(); // Cores dinâmicas do tema
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [imageUri, setImageUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const formatPhone = (text) => {
    let value = text.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) value = value.replace(/^(\d{2})(\d)/g, '($1) $2');
    if (value.length > 9) value = value.replace(/(\d{5})(\d)/, '$1-$2');
    setPhone(value);
  };

const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Permissão necessária', 'É necessária permissão para acessar suas fotos.');
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
      setLoading(true); // Exibe a rodinha de carregamento enquanto sobe a imagem
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
          setImageUri(data.data.url); // Recebe e guarda o Link Público definitivo
        } else {
          Alert.alert('Erro', 'Falha ao processar a imagem no servidor.');
        }
      } catch (error) {
        Alert.alert('Erro', 'Falha na conexão ao enviar a imagem.');
      }
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!nome || !email || !password || !phone) {
      Alert.alert('Atenção', 'Por favor preencha todos os campos obrigatórios.');
      return;
    }

    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        nome: nome,
        email: email.trim().toLowerCase(),
        phone: phone,
        role: 'client',
        photoUri: imageUri || null,
        createdAt: new Date().toISOString(),
      });

      setLoading(false);
      
      if (Platform.OS === 'android') {
        ToastAndroid.show(`Boas-vindas, ${nome}!`, ToastAndroid.LONG);
      } else {
        Alert.alert('Bem-vindo!', `Boas-vindas, ${nome}!`);
      }

      navigation.reset({
        index: 0,
        routes: [{ name: 'Main', params: { userRole: 'client' } }],
      });

    } catch (error) {
      setLoading(false);
      Alert.alert('Erro ao cadastrar', error.message);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : null}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          
          <View style={styles.headerContainer}>
            <Text style={[styles.title, { color: themeColors.textPrimary }]}>🛒 Criar Conta</Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>Junte-se ao nosso mercado</Text>
          </View>

          <View style={[styles.card, { backgroundColor: themeColors.card }]}>
            <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={[styles.avatar, { borderColor: themeColors.primary }]} />
              ) : (
                <View style={[styles.avatarPlaceholder, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                  <Text style={[styles.avatarText, { color: themeColors.textSecondary }]}>📸 Foto</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]}
              placeholder="Nome Completo *"
              placeholderTextColor={themeColors.textSecondary}
              value={nome}
              onChangeText={setNome}
              autoCapitalize="words"
            />

            <TextInput
              style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]}
              placeholder="E-mail *"
              placeholderTextColor={themeColors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <TextInput
              style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]}
              placeholder="Senha *"
              placeholderTextColor={themeColors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TextInput
              style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]}
              placeholder="Telefone *"
              placeholderTextColor={themeColors.textSecondary}
              value={phone}
              onChangeText={formatPhone}
              keyboardType="numeric"
              maxLength={15}
            />

            <TouchableOpacity style={[styles.button, { backgroundColor: themeColors.primary }]} onPress={handleRegister} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.buttonText}>Finalizar Cadastro</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate('Login')}>
              <Text style={[styles.loginText, { color: themeColors.textSecondary }]}>
                Já tem uma conta? <Text style={[styles.boldText, { color: themeColors.primary }]}>Entrar</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 5, paddingBottom: 250, flexGrow: 1, justifyContent: 'center' },
  headerContainer: { marginBottom: 30, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '800' },
  subtitle: { fontSize: 16, marginTop: 6 },
  card: { borderRadius: 20, padding: 24, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  avatarContainer: { alignSelf: 'center', marginBottom: 25, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 6 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3 },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderStyle: 'dashed' },
  avatarText: { fontSize: 14, fontWeight: '700' },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16 },
  button: { padding: 18, borderRadius: 12, alignItems: 'center', elevation: 4, marginTop: 10 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold' },
  loginLink: { marginTop: 24, alignItems: 'center' },
  loginText: { fontSize: 15 },
  boldText: { fontWeight: 'bold' },
});