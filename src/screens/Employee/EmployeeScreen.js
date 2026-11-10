import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, 
  ToastAndroid, Platform, Alert, Linking, RefreshControl, Image, Modal, ScrollView
} from 'react-native';
import { collection, query, where, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext'; // Importação do contexto de tema

export default function EmployeeScreen() {
  const { themeColors, currentTheme } = useTheme(); // Cores dinâmicas do tema
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employeeName, setEmployeeName] = useState('');
  
  // Controle de Abas
  const [activeTab, setActiveTab] = useState('ativas'); // 'ativas' ou 'historico'

  // Controle de expansão do histórico
  const [expandedOrders, setExpandedOrders] = useState([]);

  // Controle do Modal de Conferência
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [checkedItems, setCheckedItems] = useState([]);
  const [delivering, setDelivering] = useState(false);

  const showToast = (message) => {
    if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
    else Alert.alert('Aviso', message);
  };

  const fetchAssignedOrders = async () => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        showToast('Erro: Perfil não encontrado.');
        setLoading(false);
        return;
      }

      const empName = userSnap.data().nome;
      setEmployeeName(empName);

      // Busca TODOS os pedidos atribuídos a este entregador
      const q = query(collection(db, 'orders'), where('entregador', '==', empName));
      const snap = await getDocs(q);
      const ordersList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Ordena por data (mais recentes primeiro)
      ordersList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setOrders(ordersList);
    } catch (error) {
      showToast('Erro ao buscar entregas.');
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchAssignedOrders();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAssignedOrders();
  };

  const openMaps = (address) => {
    if (!address) return;
    const fullAddress = `${address.street}, ${address.number}, ${address.neighborhood}, ${address.city}`;
    const url = Platform.select({
      ios: `maps:0,0?q=${fullAddress}`,
      android: `geo:0,0?q=${fullAddress}`
    });
    Linking.openURL(url);
  };

  const toggleExpand = (orderId) => {
    setExpandedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]                
    );
  };

  // Funções do Modal de Conferência
  const openConferenceModal = (order) => {
    setSelectedOrder(order);
    setCheckedItems([]); // Zera o checklist
    setModalVisible(true);
  };

  const toggleCheck = (index) => {
    if (checkedItems.includes(index)) {
      setCheckedItems(checkedItems.filter(i => i !== index));
    } else {
      setCheckedItems([...checkedItems, index]);
    }
  };

  const confirmDelivery = async () => {
    if (!selectedOrder) return;
    
    if (checkedItems.length !== (selectedOrder.items?.length || 0)) {
      showToast('Confire e marque todos os itens antes de entregar!');
      return;
    }

    setDelivering(true);
    try {
      const orderRef = doc(db, 'orders', selectedOrder.id);
      await updateDoc(orderRef, { status: 'entregue' });
      
      showToast('Entrega finalizada com sucesso!');
      setModalVisible(false);
      fetchAssignedOrders(); 
    } catch (error) {
      showToast('Erro ao confirmar entrega.');
    }
    setDelivering(false);
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const filteredOrders = orders.filter(o => {
    if (activeTab === 'ativas') {
      return o.status === 'pendente' || o.status === 'saiu_entrega';
    } else {
      return o.status === 'entregue' || o.status === 'cancelado' || o.status === 'retirado';
    }
  });

  const renderOrder = ({ item }) => {
    const isHistory = activeTab === 'historico';
    const isExpanded = expandedOrders.includes(item.id);
    
    return (
      <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }, isHistory && { opacity: 0.8, backgroundColor: themeColors.background }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.orderId, { color: themeColors.textPrimary }]}>Pedido #{item.id.slice(0, 8).toUpperCase()}</Text>
          <View style={[
            styles.badge, 
            { backgroundColor: themeColors.warning + '20' }, 
            item.status === 'entregue' && { backgroundColor: themeColors.success + '20' }, 
            item.status === 'cancelado' && { backgroundColor: themeColors.danger + '20' }
          ]}>
            <Text style={[
              styles.badgeText, 
              { color: themeColors.warning }, 
              item.status === 'entregue' && { color: themeColors.success }, 
              item.status === 'cancelado' && { color: themeColors.danger }
            ]}>
              {item.status.replace('_', ' ').toUpperCase()}
            </Text>
          </View>
        </View>

        {isHistory && item.createdAt && (
          <Text style={[styles.dateText, { color: themeColors.textSecondary }]}><FontAwesome name="calendar" /> {formatDate(item.createdAt)}</Text>
        )}

        {item.address && (
          <View style={[styles.addressBox, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
            <View style={styles.addressHeader}>
              <FontAwesome name="map-marker" size={18} color={themeColors.danger} />
              <Text style={[styles.addressTitle, { color: themeColors.textPrimary }]}>Endereço de Entrega</Text>
            </View>
            <Text style={[styles.addressText, { color: themeColors.textSecondary }]}>{item.address.street}, Nº {item.address.number}</Text>
            {item.address.complement ? <Text style={[styles.addressText, { color: themeColors.textSecondary }]}>Comp: {item.address.complement}</Text> : null}
            <Text style={[styles.addressText, { color: themeColors.textSecondary }]}>{item.address.neighborhood} - {item.address.city}</Text>
            
            {!isHistory && (
              <TouchableOpacity style={[styles.mapBtn, { backgroundColor: themeColors.success }]} onPress={() => openMaps(item.address)}>
                <FontAwesome name="location-arrow" size={14} color="#FFF" style={{marginRight: 6}} />
                <Text style={styles.mapBtnText}>Abrir GPS</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Observação do Cliente (Destaque para o entregador) */}
        {item.observacao ? (
          <View style={[styles.obsBox, { backgroundColor: themeColors.warning + '15', borderColor: themeColors.warning }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
              <FontAwesome name="exclamation-circle" size={16} color={themeColors.warning} />
              <Text style={[styles.obsTitle, { color: themeColors.warning }]}>Atenção / Observação:</Text>
            </View>
            <Text style={[styles.obsText, { color: themeColors.textPrimary }]}>{item.observacao}</Text>
          </View>
        ) : null}

        {!isHistory ? (
          <View style={styles.itemsBox}>
            <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Produtos ({item.items?.length || 0}):</Text>
            {item.items?.map((prod, idx) => (
              <View key={idx} style={[styles.itemCard, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                <View style={[styles.itemImgContainer, { backgroundColor: themeColors.card }]}>
                  {prod.imagem ? (
                    <Image source={{ uri: prod.imagem }} style={styles.itemImg} />
                  ) : (
                    <FontAwesome name="image" size={16} color={themeColors.textSecondary} />
                  )}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={[styles.itemName, { color: themeColors.textPrimary }]} numberOfLines={1}>{prod.nome || prod.descricao}</Text>
                  <Text style={[styles.itemQty, { color: themeColors.textSecondary }]}>Qtd: {prod.cartQty || prod.quantity}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          !isExpanded ? (
            <TouchableOpacity style={[styles.expandBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border }]} onPress={() => toggleExpand(item.id)}>
              <Text style={[styles.expandBtnText, { color: themeColors.primary }]}>Ver produtos ({item.items?.length || 0} itens)</Text>
              <FontAwesome name="chevron-down" size={12} color={themeColors.primary} />
            </TouchableOpacity>
          ) : (
            <View style={styles.expandedSection}>
              <View style={styles.itemsBox}>
                <Text style={[styles.sectionTitle, { color: themeColors.textSecondary }]}>Produtos ({item.items?.length || 0}):</Text>
                {item.items?.map((prod, idx) => (
                  <View key={idx} style={[styles.itemCard, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                    <View style={[styles.itemImgContainer, { backgroundColor: themeColors.card }]}>
                      {prod.imagem ? (
                        <Image source={{ uri: prod.imagem }} style={styles.itemImg} />
                      ) : (
                        <FontAwesome name="image" size={16} color={themeColors.textSecondary} />
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, { color: themeColors.textPrimary }]} numberOfLines={1}>{prod.nome || prod.descricao}</Text>
                      <Text style={[styles.itemQty, { color: themeColors.textSecondary }]}>Qtd: {prod.cartQty || prod.quantity}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={[styles.expandBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border }]} onPress={() => toggleExpand(item.id)}>
                <Text style={[styles.expandBtnText, { color: themeColors.primary }]}>Ocultar produtos</Text>
                <FontAwesome name="chevron-up" size={12} color={themeColors.primary} />
              </TouchableOpacity>
            </View>
          )
        )}

        <View style={[styles.totalRow, { borderTopColor: themeColors.border }]}>
          <Text style={[styles.totalLabel, { color: themeColors.textPrimary }]}>Total a Receber:</Text>
          <Text style={[styles.totalValue, { color: themeColors.success }]}>R$ {(item.total || 0).toFixed(2)}</Text>
        </View>

        {!isHistory && (
          <TouchableOpacity style={[styles.deliverBtn, { backgroundColor: themeColors.primary }]} onPress={() => openConferenceModal(item)}>
            <FontAwesome name="list-ul" size={16} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.deliverBtnText}>Conferir e Entregar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      
      {/* Abas Superiores */}
      <View style={[styles.tabsContainer, { backgroundColor: themeColors.card }]}>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'ativas' && { borderBottomColor: themeColors.primary }]} 
          onPress={() => setActiveTab('ativas')}
        >
          <FontAwesome name="motorcycle" size={16} color={activeTab === 'ativas' ? themeColors.primary : themeColors.textSecondary} />
          <Text style={[styles.tabText, { color: themeColors.textSecondary }, activeTab === 'ativas' && { color: themeColors.primary }]}>Em Rota</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tabBtn, activeTab === 'historico' && { borderBottomColor: themeColors.primary }]} 
          onPress={() => setActiveTab('historico')}
        >
          <FontAwesome name="history" size={16} color={activeTab === 'historico' ? themeColors.primary : themeColors.textSecondary} />
          <Text style={[styles.tabText, { color: themeColors.textSecondary }, activeTab === 'historico' && { color: themeColors.primary }]}>Histórico</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}><ActivityIndicator size="large" color={themeColors.primary} /></View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderOrder}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[themeColors.primary]} progressBackgroundColor={themeColors.card} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome name="check-square-o" size={50} color={themeColors.textSecondary} />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                {activeTab === 'ativas' ? 'Nenhuma entrega pendente no momento.' : 'Nenhum histórico encontrado.'}
              </Text>
            </View>
          }
        />
      )}

      {/* Modal de Conferência / Nota Fiscal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Nota de Conferência</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <FontAwesome name="times" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView showsVerticalScrollIndicator={false}>
                
                <View style={[styles.receiptHeader, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                  <Text style={[styles.receiptId, { color: themeColors.textPrimary }]}>Pedido #{selectedOrder.id.slice(0, 8).toUpperCase()}</Text>
                  {selectedOrder.address && (
                    <Text style={[styles.receiptAddress, { color: themeColors.textSecondary }]}>
                      {selectedOrder.address.street}, {selectedOrder.address.number} - {selectedOrder.address.neighborhood}
                    </Text>
                  )}
                  
                  {/* Observação visível no modal de conferência também */}
                  {selectedOrder.observacao ? (
                    <View style={{ marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: themeColors.border, borderStyle: 'dashed' }}>
                       <Text style={{ fontSize: 12, fontWeight: 'bold', color: themeColors.warning, marginBottom: 2 }}>Observação do Cliente:</Text>
                       <Text style={{ fontSize: 13, color: themeColors.textPrimary }}>{selectedOrder.observacao}</Text>
                    </View>
                  ) : null}
                </View>

                <View style={styles.checklistTitleBox}>
                  <Text style={[styles.checklistTitle, { color: themeColors.textSecondary }]}>Marque os itens conferidos:</Text>
                </View>

                {selectedOrder.items?.map((prod, idx) => {
                  const isChecked = checkedItems.includes(idx);
                  return (
                    <TouchableOpacity 
                      key={idx} 
                      style={[
                        styles.checklistItem, 
                        { backgroundColor: themeColors.card, borderColor: themeColors.border },
                        isChecked && { backgroundColor: themeColors.success + '15', borderColor: themeColors.success }
                      ]} 
                      onPress={() => toggleCheck(idx)}
                    >
                      <View style={[styles.checklistImgContainer, { backgroundColor: themeColors.background }]}>
                        {prod.imagem ? (
                          <Image source={{ uri: prod.imagem }} style={styles.itemImg} />
                        ) : (
                          <FontAwesome name="image" size={14} color={themeColors.textSecondary} />
                        )}
                      </View>
                      
                      <View style={styles.checklistInfo}>
                        <Text style={[styles.checklistName, { color: themeColors.textPrimary }, isChecked && {color: themeColors.success}]}>{prod.nome || prod.descricao}</Text>
                        <Text style={[styles.checklistQty, { color: themeColors.textSecondary }]}>Qtd: {prod.cartQty || prod.quantity}</Text>
                      </View>

                      <View style={[styles.checkbox, { borderColor: themeColors.textSecondary }, isChecked && { backgroundColor: themeColors.success, borderColor: themeColors.success }]}>
                        {isChecked && <FontAwesome name="check" size={14} color="#FFF" />}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <View style={[styles.receiptFooter, { borderTopColor: themeColors.border }]}>
                  <Text style={[styles.receiptTotalLabel, { color: themeColors.textPrimary }]}>Valor a Receber:</Text>
                  <Text style={[styles.receiptTotalValue, { color: themeColors.success }]}>R$ {(selectedOrder.total || 0).toFixed(2)}</Text>
                </View>

                <TouchableOpacity 
                  style={[styles.confirmBtn, { backgroundColor: themeColors.success }, checkedItems.length !== (selectedOrder.items?.length || 0) && { backgroundColor: themeColors.border }]} 
                  onPress={confirmDelivery}
                  disabled={checkedItems.length !== (selectedOrder.items?.length || 0) || delivering}
                >
                  {delivering ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <FontAwesome name="check-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
                      <Text style={styles.confirmBtnText}>Finalizar Entrega</Text>
                    </>
                  )}
                </TouchableOpacity>

              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  tabsContainer: { flexDirection: 'row', elevation: 2, zIndex: 10 },
  tabBtn: { flex: 1, flexDirection: 'row', padding: 15, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent', gap: 8 },
  tabText: { fontSize: 14, fontWeight: 'bold' },

  list: { padding: 15, paddingBottom: 40 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 60 },
  emptyText: { textAlign: 'center', marginTop: 15, fontSize: 15, paddingHorizontal: 20 },
  
  card: { padding: 20, borderRadius: 12, marginBottom: 15, elevation: 2, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderId: { fontSize: 16, fontWeight: 'bold' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  dateText: { fontSize: 12, marginBottom: 15 },
  
  addressBox: { padding: 15, borderRadius: 8, borderWidth: 1, marginBottom: 15 },
  addressHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  addressTitle: { fontSize: 15, fontWeight: 'bold', marginLeft: 8 },
  addressText: { fontSize: 14, marginBottom: 4 },
  mapBtn: { flexDirection: 'row', padding: 10, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  mapBtnText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  
  // Estilo da Observação
  obsBox: { padding: 15, borderRadius: 8, borderWidth: 1, marginBottom: 15 },
  obsTitle: { fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
  obsText: { fontSize: 14, lineHeight: 20 },

  expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, marginBottom: 15, borderWidth: 1 },
  expandBtnText: { fontSize: 13, fontWeight: 'bold', marginRight: 8 },
  expandedSection: { marginBottom: 5 },

  itemsBox: { marginBottom: 15 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  itemCard: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, marginBottom: 6, borderWidth: 1 },
  itemImgContainer: { width: 40, height: 40, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  itemImg: { width: '100%', height: '100%', resizeMode: 'contain', borderRadius: 6 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 13, fontWeight: 'bold' },
  itemQty: { fontSize: 12 },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 15, marginBottom: 15 },
  totalLabel: { fontSize: 16, fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold' },
  
  deliverBtn: { flexDirection: 'row', padding: 16, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  deliverBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContent: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', minHeight: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  
  receiptHeader: { padding: 15, borderRadius: 8, marginBottom: 20, borderWidth: 1 },
  receiptId: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  receiptAddress: { fontSize: 13 },
  
  checklistTitleBox: { marginBottom: 10 },
  checklistTitle: { fontSize: 15, fontWeight: 'bold' },
  
  checklistItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1 },
  checklistImgContainer: { width: 45, height: 45, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checklistInfo: { flex: 1 },
  checklistName: { fontSize: 14, fontWeight: 'bold', marginBottom: 2 },
  checklistQty: { fontSize: 13 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, justifyContent: 'center', alignItems: 'center' },

  receiptFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, marginBottom: 20, paddingTop: 15, borderTopWidth: 2, borderStyle: 'dashed' },
  receiptTotalLabel: { fontSize: 16, fontWeight: 'bold' },
  receiptTotalValue: { fontSize: 22, fontWeight: 'bold' },

  confirmBtn: { flexDirection: 'row', padding: 16, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  confirmBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});