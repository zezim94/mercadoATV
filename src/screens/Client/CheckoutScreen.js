import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, 
  ScrollView, ToastAndroid, Platform, Modal, FlatList, TextInput, KeyboardAvoidingView
} from 'react-native';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function CheckoutScreen({ route, navigation }) {
  const { themeColors } = useTheme();
  const { cartItems, total } = route.params || { cartItems: [], total: 0 };
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState('delivery'); 
  const [observation, setObservation] = useState(''); // Novo estado para observação
  
  // Estados de Endereço
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addressModalVisible, setAddressModalVisible] = useState(false);

  const showToast = (message) => {
    if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
    else Alert.alert('Aviso', message);
  };

  useEffect(() => {
    const fetchUserAddresses = async () => {
      try {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(userRef);
        
        if (docSnap.exists() && docSnap.data().addresses) {
          const addresses = docSnap.data().addresses;
          setSavedAddresses(addresses);
          
          const defaultAddr = addresses.find(a => a.isDefault) || addresses[0];
          if (defaultAddr) setSelectedAddress(defaultAddr);
        }
      } catch (error) {
        showToast('Erro ao carregar seus endereços.');
      }
    };

    fetchUserAddresses();
  }, []);

  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      showToast('Seu carrinho está vazio!');
      return;
    }

    if (method === 'delivery' && !selectedAddress) {
      showToast('Selecione um endereço de entrega válido.');
      return;
    }

    setLoading(true);
    try {
      // 1. Dá a baixa no estoque diretamente no Firestore
      for (const item of cartItems) {
        const prodRef = doc(db, 'products', item.id);
        const pSnap = await getDoc(prodRef);
        
        if (pSnap.exists()) {
          const currentStock = pSnap.data().estoque || 0;
          const newStock = currentStock - item.cartQty;
          
          await updateDoc(prodRef, {
            estoque: newStock < 0 ? 0 : newStock,
            disponivel: newStock > 0
          });
        }
      }

      // 2. Cria o pedido confirmando a compra
      const orderData = {
        userId: auth.currentUser.uid,
        items: cartItems.map(item => ({
          id: item.id,
          nome: item.nome,
          preco: item.emPromocao && item.precoPromocao ? item.precoPromocao : item.preco,
          quantity: item.cartQty, 
          imagem: item.imagem || null
        })),
        total: total,
        method: method,
        observacao: method === 'delivery' ? observation : '', // Adiciona observação apenas se for entrega
        status: 'pendente', 
        entregador: '', 
        createdAt: new Date().toISOString()
      };

      if (method === 'delivery') {
        orderData.address = selectedAddress;
      }

      await addDoc(collection(db, 'orders'), orderData);
      showToast('Pedido realizado com sucesso!');
      
      // Volta para a Loja recarregando o estado (limpando o carrinho antigo da memória)
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (error) {
      showToast('Erro ao finalizar pedido.');
      console.error(error);
    }
    setLoading(false);
  };

  const renderAddressModal = () => (
    <Modal visible={addressModalVisible} animationType="slide" transparent={true}>
      <View style={styles.modalBg}>
        <View style={[styles.modalCard, { backgroundColor: themeColors.card }]}>
          <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Escolher Endereço</Text>
            <TouchableOpacity onPress={() => setAddressModalVisible(false)}>
              <FontAwesome name="times" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>
          </View>

          {savedAddresses.length === 0 ? (
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>Nenhum endereço cadastrado.</Text>
          ) : (
            <FlatList
              data={savedAddresses}
              keyExtractor={item => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={[
                    styles.addressOption, 
                    { backgroundColor: themeColors.background, borderColor: themeColors.border },
                    selectedAddress?.id === item.id && { borderColor: themeColors.primary, backgroundColor: themeColors.primary + '15' }
                  ]}
                  onPress={() => {
                    setSelectedAddress(item);
                    setAddressModalVisible(false);
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <FontAwesome name="map-marker" size={16} color={selectedAddress?.id === item.id ? themeColors.primary : themeColors.textSecondary} />
                    <Text style={[styles.addressOptionTitle, { color: selectedAddress?.id === item.id ? themeColors.primary : themeColors.textPrimary }]}>
                      {item.street}, Nº {item.number}
                    </Text>
                  </View>
                  {item.complement ? <Text style={[styles.addressOptionText, { color: themeColors.textSecondary }]}>Comp: {item.complement}</Text> : null}
                  <Text style={[styles.addressOptionText, { color: themeColors.textSecondary }]}>{item.neighborhood} - {item.city}</Text>
                  {item.isDefault && (
                    <View style={styles.defaultBadge}>
                      <Text style={styles.defaultBadgeText}>Padrão</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: themeColors.background }} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.title, { color: themeColors.textPrimary }]}>Finalizar Pedido</Text>

        {/* Resumo do Pedido */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>Resumo da Compra</Text>
          <Text style={[styles.cardText, { color: themeColors.textSecondary }]}>Total de Itens: {cartItems.reduce((acc, i) => acc + i.cartQty, 0)}</Text>
          <Text style={[styles.totalText, { color: themeColors.success }]}>Total a Pagar: R$ {total.toFixed(2)}</Text>
        </View>

        {/* Opção de Entrega/Retirada */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>Método de Recebimento</Text>
          <View style={styles.methodRow}>
            <TouchableOpacity 
              style={[
                styles.methodBtn, 
                { backgroundColor: themeColors.background, borderColor: themeColors.border },
                method === 'delivery' && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
              ]} 
              onPress={() => setMethod('delivery')}
            >
              <FontAwesome name="motorcycle" size={20} color={method === 'delivery' ? '#FFF' : themeColors.textSecondary} />
              <Text style={[styles.methodText, { color: method === 'delivery' ? '#FFF' : themeColors.textSecondary }]}>Entrega</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[
                styles.methodBtn, 
                { backgroundColor: themeColors.background, borderColor: themeColors.border },
                method === 'pickup' && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
              ]} 
              onPress={() => setMethod('pickup')}
            >
              <FontAwesome name="building" size={20} color={method === 'pickup' ? '#FFF' : themeColors.textSecondary} />
              <Text style={[styles.methodText, { color: method === 'pickup' ? '#FFF' : themeColors.textSecondary }]}>Retirada</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Informações Específicas de Entrega */}
        {method === 'delivery' && (
          <>
            {/* Endereço */}
            <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <View style={styles.addressHeaderRow}>
                <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>Endereço de Entrega</Text>
                <TouchableOpacity onPress={() => setAddressModalVisible(true)}>
                  <Text style={[styles.changeAddressText, { color: themeColors.primary }]}>Trocar Endereço</Text>
                </TouchableOpacity>
              </View>

              {selectedAddress ? (
                <View style={[styles.selectedAddressBox, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                    <FontAwesome name="map-marker" size={18} color={themeColors.primary} />
                    <Text style={[styles.selectedAddressStreet, { color: themeColors.textPrimary }]}>{selectedAddress.street}, {selectedAddress.number}</Text>
                  </View>
                  {selectedAddress.complement ? <Text style={[styles.selectedAddressText, { color: themeColors.textSecondary }]}>{selectedAddress.complement}</Text> : null}
                  <Text style={[styles.selectedAddressText, { color: themeColors.textSecondary }]}>{selectedAddress.neighborhood} - {selectedAddress.city}/{selectedAddress.state}</Text>
                  <Text style={[styles.selectedAddressText, { color: themeColors.textSecondary }]}>CEP: {selectedAddress.cep}</Text>
                </View>
              ) : (
                <View style={[styles.noAddressBox, { backgroundColor: themeColors.card, borderColor: themeColors.warning }]}>
                  <FontAwesome name="warning" size={24} color={themeColors.warning} style={{ marginBottom: 10 }} />
                  <Text style={[styles.noAddressText, { color: themeColors.warning }]}>Nenhum endereço selecionado.</Text>
                  <Text style={[styles.noAddressSubText, { color: themeColors.textSecondary }]}>Vá em "Meu Painel" - "Endereços" para adicionar um local de entrega.</Text>
                </View>
              )}
            </View>

            {/* Observação */}
            <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>Observação para o Entregador</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]}
                placeholder="Ex: Deixar na portaria, troco para R$ 50..."
                placeholderTextColor={themeColors.textSecondary}
                value={observation}
                onChangeText={setObservation}
                multiline
                numberOfLines={2}
              />
            </View>
          </>
        )}

        <TouchableOpacity style={[styles.checkoutBtn, { backgroundColor: themeColors.success }]} onPress={handleCheckout} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.checkoutBtnText}>Confirmar e Enviar Pedido</Text>}
        </TouchableOpacity>
      </ScrollView>

      {renderAddressModal()}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, paddingBottom: 350 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  
  card: { padding: 20, borderRadius: 12, marginBottom: 15, borderWidth: 1, elevation: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },
  cardText: { fontSize: 14, marginBottom: 5 },
  totalText: { fontSize: 20, fontWeight: 'bold', marginTop: 10 },
  
  methodRow: { flexDirection: 'row', gap: 10 },
  methodBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 15, borderRadius: 10, borderWidth: 1 },
  methodText: { fontSize: 14, fontWeight: 'bold' },
  
  addressHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  changeAddressText: { fontSize: 13, fontWeight: 'bold' },
  
  selectedAddressBox: { padding: 15, borderRadius: 8, borderWidth: 1 },
  selectedAddressStreet: { fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
  selectedAddressText: { fontSize: 14, marginLeft: 26, marginBottom: 2 },
  
  noAddressBox: { padding: 20, borderRadius: 8, alignItems: 'center', borderWidth: 1 },
  noAddressText: { fontSize: 15, fontWeight: 'bold', textAlign: 'center' },
  noAddressSubText: { fontSize: 13, textAlign: 'center', marginTop: 5 },

  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 15, minHeight: 60, textAlignVertical: 'top' },

  checkoutBtn: { padding: 18, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  checkoutBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, borderBottomWidth: 1, paddingBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 15 },
  
  addressOption: { padding: 15, borderRadius: 8, marginBottom: 10, borderWidth: 1 },
  addressOptionTitle: { fontSize: 14, fontWeight: 'bold', marginLeft: 8 },
  addressOptionText: { fontSize: 13, marginLeft: 24, marginTop: 2 },
  defaultBadge: { position: 'absolute', top: 15, right: 15, backgroundColor: '#DCFCE7', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  defaultBadgeText: { fontSize: 10, fontWeight: 'bold', color: '#16A34A' }
});