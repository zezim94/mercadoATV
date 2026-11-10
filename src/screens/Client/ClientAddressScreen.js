import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, 
  ScrollView, ActivityIndicator, Alert, ToastAndroid, Platform, Modal, FlatList 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext'; // Importação do contexto de tema

export default function ClientAddressScreen() {
  const { themeColors } = useTheme(); // Cores dinâmicas do tema atual
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState([]);
  
  // Estados do Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);

  const showToast = (message) => {
    if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
    else Alert.alert('Aviso', message);
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const docRef = doc(db, 'users', user.uid);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().addresses) {
        setAddresses(docSnap.data().addresses || []);
      } else {
        setAddresses([]);
      }
      setLoading(false);
    }, () => {
      showToast('Erro ao carregar endereços.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Ordena os endereços para o Padrão ficar sempre no topo
  const sortedAddresses = [...addresses].sort((a, b) => {
    if (a.isDefault) return -1;
    if (b.isDefault) return 1;
    return 0;
  });

  // Consulta CEP na API ViaCEP
  const handleCepChange = async (text) => {
    const cleaned = text.replace(/\D/g, '');
    setCep(cleaned);

    if (cleaned.length === 8) {
      setLoadingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleaned}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setStreet(data.logradouro || '');
          setNeighborhood(data.bairro || '');
          setCity(data.localidade || '');
          setState(data.uf || '');
          showToast('Endereço encontrado!');
        } else {
          showToast('CEP não encontrado.');
        }
      } catch (error) {
        showToast('Erro ao buscar o CEP.');
      }
      setLoadingCep(false);
    }
  };

  const openNewAddressModal = () => {
    if (addresses.length >= 4) {
      showToast('Você atingiu o limite de 4 endereços cadastrados.');
      return;
    }

    setCep('');
    setStreet('');
    setNumber('');
    setComplement('');
    setNeighborhood('');
    setCity('');
    setState('');
    setModalVisible(true);
  };

  const handleSaveNewAddress = async () => {
    if (!street || !number || !neighborhood || !city) {
      showToast('Preencha os campos obrigatórios (*)');
      return;
    }

    setSaving(true);
    try {
      const newAddress = {
        id: Date.now().toString(),
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        isDefault: addresses.length === 0 
      };

      const updatedAddresses = [...addresses, newAddress];
      const userRef = doc(db, 'users', auth.currentUser.uid);
      
      await updateDoc(userRef, { addresses: updatedAddresses });
      showToast('Endereço adicionado com sucesso!');
      setModalVisible(false);
    } catch (error) {
      showToast('Erro ao salvar endereço.');
    }
    setSaving(false);
  };

  const handleSetDefault = async (id) => {
    try {
      const updatedAddresses = addresses.map(addr => ({
        ...addr,
        isDefault: addr.id === id
      }));

      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, { addresses: updatedAddresses });
      showToast('Endereço padrão atualizado!');
    } catch (error) {
      showToast('Erro ao atualizar padrão.');
    }
  };

  const handleDeleteAddress = async (id) => {
    Alert.alert('Excluir Endereço', 'Deseja remover este endereço da sua lista?', [
      { text: 'Cancelar', style: 'cancel' },
      { 
        text: 'Excluir', 
        style: 'destructive',
        onPress: async () => {
          try {
            const updatedAddresses = addresses.filter(addr => addr.id !== id);
            if (updatedAddresses.length > 0 && !updatedAddresses.some(a => a.isDefault)) {
              updatedAddresses[0].isDefault = true;
            }

            const userRef = doc(db, 'users', auth.currentUser.uid);
            await updateDoc(userRef, { addresses: updatedAddresses });
            showToast('Endereço removido.');
          } catch (error) {
            showToast('Erro ao excluir.');
          }
        }
      }
    ]);
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
      <View style={styles.headerContainer}>
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>Meus Endereços</Text>
        
        <TouchableOpacity 
          style={[styles.newBtn, { backgroundColor: themeColors.primary }, addresses.length >= 4 && styles.newBtnDisabled]} 
          onPress={openNewAddressModal}
          disabled={addresses.length >= 4}
        >
          <FontAwesome name={addresses.length >= 4 ? "ban" : "plus"} size={14} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.newBtnText}>
            {addresses.length >= 4 ? 'Limite de 4 Endereços Atingido' : 'Adicionar Novo Endereço'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={sortedAddresses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }, item.isDefault && { borderColor: themeColors.primary }]}>
            <View style={styles.cardHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 }}>
                <FontAwesome name="map-marker" size={16} color={item.isDefault ? themeColors.primary : themeColors.textSecondary} />
                <Text style={[styles.cardStreet, { color: themeColors.textPrimary }]} numberOfLines={1}>
                  {item.street}, Nº {item.number}
                </Text>
              </View>
              {item.isDefault && (
                <View style={styles.defaultBadge}>
                  <Text style={styles.defaultBadgeText}>Padrão</Text>
                </View>
              )}
            </View>

            {item.complement ? <Text style={[styles.cardText, { color: themeColors.textSecondary }]}>Comp: {item.complement}</Text> : null}
            <Text style={[styles.cardText, { color: themeColors.textSecondary }]}>{item.neighborhood} - {item.city}/{item.state}</Text>
            {item.cep ? <Text style={[styles.cardCep, { color: themeColors.textSecondary }]}>CEP: {item.cep}</Text> : null}

            <View style={[styles.cardActions, { borderTopColor: themeColors.border }]}>
              {!item.isDefault && (
                <TouchableOpacity style={[styles.actionBtnOutline, { borderColor: themeColors.primary }]} onPress={() => handleSetDefault(item.id)}>
                  <Text style={[styles.actionBtnOutlineText, { color: themeColors.primary }]}>Tornar Padrão</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDeleteAddress(item.id)}>
                <FontAwesome name="trash" size={14} color={themeColors.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <FontAwesome name="map-o" size={40} color={themeColors.textSecondary} />
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>Nenhum endereço cadastrado ainda.</Text>
          </View>
        }
      />

      {/* Modal Adicionar Endereço */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.card }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
                <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Adicionar Endereço</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <FontAwesome name="times" size={22} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>CEP (Preenche automático)</Text>
              <View style={styles.cepRow}>
                <TextInput 
                  style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]} 
                  value={cep} 
                  onChangeText={handleCepChange} 
                  placeholder="00000-000" 
                  placeholderTextColor={themeColors.textSecondary}
                  keyboardType="numeric"
                  maxLength={8}
                />
                {loadingCep && <ActivityIndicator size="small" color={themeColors.primary} style={{ marginLeft: 10 }} />}
              </View>

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Rua / Avenida *</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]} 
                value={street} 
                onChangeText={setStreet} 
                placeholder="Nome da rua" 
                placeholderTextColor={themeColors.textSecondary}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Número *</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]} 
                    value={number} 
                    onChangeText={setNumber} 
                    keyboardType="numeric" 
                    placeholder="123" 
                    placeholderTextColor={themeColors.textSecondary}
                  />
                </View>
                <View style={{ flex: 2 }}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Complemento</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]} 
                    value={complement} 
                    onChangeText={setComplement} 
                    placeholder="Apto, Bloco" 
                    placeholderTextColor={themeColors.textSecondary}
                  />
                </View>
              </View>

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Bairro *</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]} 
                value={neighborhood} 
                onChangeText={setNeighborhood} 
                placeholder="Nome do bairro" 
                placeholderTextColor={themeColors.textSecondary}
              />

              <View style={styles.row}>
                <View style={{ flex: 2, marginRight: 10 }}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Cidade *</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]} 
                    value={city} 
                    onChangeText={setCity} 
                    placeholder="Cidade" 
                    placeholderTextColor={themeColors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Estado</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]} 
                    value={state} 
                    onChangeText={setState} 
                    placeholder="UF" 
                    placeholderTextColor={themeColors.textSecondary}
                    maxLength={2} 
                  />
                </View>
              </View>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: themeColors.success }]} onPress={handleSaveNewAddress} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Salvar Endereço</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  headerContainer: { marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 15 },
  newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10 },
  newBtnDisabled: { backgroundColor: '#94A3B8' },
  newBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },
  
  list: { paddingBottom: 30 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 40 },
  emptyText: { marginTop: 10, fontSize: 15 },

  card: { borderRadius: 12, padding: 15, marginBottom: 12, borderWidth: 1, elevation: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardStreet: { fontSize: 15, fontWeight: 'bold', marginLeft: 8, flex: 1 },
  defaultBadge: { backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  defaultBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#16A34A' },
  cardText: { fontSize: 14, marginLeft: 24, marginBottom: 2 },
  cardCep: { fontSize: 12, marginLeft: 24, marginTop: 4 },
  
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 12, borderTopWidth: 1, paddingTop: 10, gap: 10 },
  actionBtnOutline: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1 },
  actionBtnOutlineText: { fontSize: 12, fontWeight: 'bold' },
  deleteBtn: { padding: 6, backgroundColor: '#FEE2E2', borderRadius: 6 },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, paddingBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  
  cepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, marginBottom: 15 },
  row: { flexDirection: 'row' },
  
  saveBtn: { padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 15, marginBottom: 20 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});