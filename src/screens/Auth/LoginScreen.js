import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  ActivityIndicator, KeyboardAvoidingView, ScrollView, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useTheme } from '../../context/ThemeContext';
import { FontAwesome } from '@expo/vector-icons'; // Importação do ícone

export default function LoginScreen({ navigation }) {
  const { themeColors } = useTheme(); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false); // Estado para exibir/ocultar senha
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Atenção', 'Por favor preencha o e-mail e a senha.');
      return;
    }
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      
      setLoading(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Main', params: { userRole: userData?.role || 'client' } }],
      });
    } catch (error) {
      setLoading(false);
      Alert.alert('Erro ao Entrar', 'E-mail ou senha incorretos.');
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Atenção', 'Digite seu e-mail no campo acima para recuperar a senha.');
      return;
    }
    
    setResetting(true);
    try {
      const q = query(collection(db, 'users'), where('email', '==', email.trim().toLowerCase()));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        Alert.alert('Erro', 'Este e-mail não está cadastrado em nossa base de dados.');
        setResetting(false);
        return;
      }

      await sendPasswordResetEmail(auth, email.trim());
      Alert.alert('Sucesso', 'Um link de recuperação foi enviado para o seu e-mail.');
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível enviar o e-mail de recuperação.');
    }
    setResetting(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled" 
          showsVerticalScrollIndicator={false}
        >
          
          <View style={styles.headerContainer}>
            <Text style={[styles.title, { color: themeColors.textPrimary }]}>🛒 Mercado App</Text>
            <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>Faça login para continuar</Text>
          </View>

          <View style={[styles.card, { backgroundColor: themeColors.card }]}>
            <TextInput
              style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]}
              placeholder="E-mail *"
              placeholderTextColor={themeColors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={[styles.passwordContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: themeColors.textPrimary }]}
                placeholder="Palavra-passe *"
                placeholderTextColor={themeColors.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeIcon}>
                <FontAwesome name={showPassword ? "eye-slash" : "eye"} size={20} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={handleForgotPassword} disabled={resetting} style={styles.forgotBtn}>
              {resetting ? <ActivityIndicator size="small" color={themeColors.primary} /> : <Text style={[styles.forgotText, { color: themeColors.primary }]}>Esqueci minha senha</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, { backgroundColor: themeColors.primary }]} onPress={handleLogin} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Entrar</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.registerLink} onPress={() => navigation.navigate('Register')}>
              <Text style={[styles.registerText, { color: themeColors.textSecondary }]}>
                Não tem uma conta? <Text style={[styles.boldText, { color: themeColors.primary }]}>Cadastre-se</Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.line, { backgroundColor: themeColors.border }]} />
              <Text style={[styles.dividerText, { color: themeColors.textSecondary }]}>OU</Text>
              <View style={[styles.line, { backgroundColor: themeColors.border }]} />
            </View>

            <TouchableOpacity style={[styles.storeButton, { backgroundColor: themeColors.background, borderColor: themeColors.border }]} onPress={() => navigation.reset({ index: 0, routes: [{ name: 'Main' }] })}>
              <Text style={[styles.storeButtonText, { color: themeColors.textPrimary }]}>Ver Loja (Acesso Visitante)</Text>
            </TouchableOpacity>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 5, paddingBottom: 40, flexGrow: 1, justifyContent: 'center' },
  headerContainer: { marginBottom: 30, alignItems: 'center' },
  title: { fontSize: 32, fontWeight: '800' },
  subtitle: { fontSize: 16, marginTop: 6 },
  card: { borderRadius: 20, padding: 24, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
  
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16 },
  
  passwordContainer: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12, marginBottom: 16 },
  passwordInput: { flex: 1, padding: 16, fontSize: 16 },
  eyeIcon: { padding: 16 },

  forgotBtn: { alignSelf: 'flex-end', marginBottom: 16, marginTop: -4 },
  forgotText: { fontSize: 14, fontWeight: '600' },
  button: { padding: 18, borderRadius: 12, alignItems: 'center', elevation: 4, marginTop: 5 },
  buttonText: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold' },
  registerLink: { marginTop: 24, alignItems: 'center' },
  registerText: { fontSize: 15 },
  boldText: { fontWeight: 'bold' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  line: { flex: 1, height: 1 },
  dividerText: { marginHorizontal: 12, fontWeight: 'bold', fontSize: 13 },
  storeButton: { padding: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  storeButtonText: { fontSize: 16, fontWeight: 'bold' }
});