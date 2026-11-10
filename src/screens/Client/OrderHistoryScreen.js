import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, ActivityIndicator, Image, 
  TouchableOpacity, TextInput, ToastAndroid, Platform, Alert 
} from 'react-native';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db, auth } from '../../config/firebase'; 
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext'; // Importação do contexto de tema

export default function OrderHistoryScreen({ navigation }) {
  const { themeColors } = useTheme(); // Cores dinâmicas do tema atual
  const [orders, setOrders] = useState([]); 
  const [employees, setEmployees] = useState([]); 
  const [loading, setLoading] = useState(true); 

  // Controle de quais pedidos estão expandidos (mostrando itens)
  const [expandedOrders, setExpandedOrders] = useState([]);

  // Estados dos Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState('all'); 
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');

  // Estados para edição de observação
  const [editingObsId, setEditingObsId] = useState(null);
  const [obsText, setObsText] = useState('');
  const [savingObs, setSavingObs] = useState(false);

  const showToast = (message) => {
    if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
    else Alert.alert('Aviso', message);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true); 
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const usersList = usersSnap.docs.map(doc => doc.data());
        setEmployees(usersList);

        const q = query(collection(db, 'orders'), where('userId', '==', auth.currentUser.uid)); 
        const snap = await getDocs(q); 
        const ordersList = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })); 
        
        ordersList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); 
        setOrders(ordersList); 
      } catch (error) {
        showToast('Erro ao carregar histórico.');
      }
      setLoading(false); 
    };
    fetchData(); 
  }, []);

  const formatDate = (isoString) => {
    if (!isoString) return 'Data não disponível';
    const date = new Date(isoString); 
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }); 
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'pendente': return { bg: '#FEF3C7', color: '#D97706', label: 'Pendente' }; 
      case 'saiu_entrega': return { bg: '#E0E7FF', color: '#2563EB', label: 'Saiu p/ Entrega' };
      case 'entregue': return { bg: '#DCFCE7', color: '#16A34A', label: 'Entregue' }; 
      case 'retirado': return { bg: '#DBEAFE', color: '#1D4ED8', label: 'Retirado' }; 
      case 'cancelado': return { bg: '#FEE2E2', color: '#DC2626', label: 'Cancelado' }; 
      default: return { bg: '#F1F5F9', color: '#64748B', label: status || 'Sem status' }; 
    }
  };

  const handleReorder = (items) => {
    navigation.navigate('ClientArea', { reorderItems: items });
    showToast('Produtos enviados para o carrinho!');
  };

  const toggleExpand = (orderId) => {
    setExpandedOrders(prev => 
      prev.includes(orderId) 
        ? prev.filter(id => id !== orderId) 
        : [...prev, orderId]                
    );
  };

  const startEditingObs = (order) => {
    setEditingObsId(order.id);
    setObsText(order.observacao || '');
  };

  const handleSaveObs = async (orderId) => {
    setSavingObs(true);
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, { observacao: obsText });
      
      // Atualiza a lista localmente sem precisar recarregar o banco inteiro
      setOrders(orders.map(o => o.id === orderId ? { ...o, observacao: obsText } : o));
      setEditingObsId(null);
      showToast('Observação atualizada!');
    } catch (error) {
      showToast('Erro ao atualizar observação.');
    }
    setSavingObs(false);
  };

  const filteredOrders = orders.filter(order => {
    let matchesPeriod = true;
    if (filterPeriod !== 'all' && order.createdAt) {
      const orderDate = new Date(order.createdAt);
      const diffDays = Math.ceil(Math.abs(new Date() - orderDate) / (1000 * 60 * 60 * 24));
      if (filterPeriod === '7' && diffDays > 7) matchesPeriod = false;
      if (filterPeriod === '30' && diffDays > 30) matchesPeriod = false;
    }

    let matchesMin = true;
    if (minPrice) matchesMin = order.total >= parseFloat(minPrice.replace(',', '.'));
    
    let matchesMax = true;
    if (maxPrice) matchesMax = order.total <= parseFloat(maxPrice.replace(',', '.'));

    return matchesPeriod && matchesMin && matchesMax;
  });

  const renderOrder = ({ item }) => {
    const badge = getStatusBadge(item.status); 
    const entregadorObj = employees.find(emp => emp.nome === item.entregador);
    const avatarUri = entregadorObj?.photoUri || entregadorObj?.imagem || entregadorObj?.foto;
    const isExpanded = expandedOrders.includes(item.id);
    
    return (
      <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <View style={styles.cardHeader}>
          <Text style={[styles.orderId, { color: themeColors.textPrimary }]}>Pedido #{item.id.slice(0, 8).toUpperCase()}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        <Text style={[styles.dateText, { color: themeColors.textSecondary }]}><FontAwesome name="calendar" /> {formatDate(item.createdAt)}</Text>

        <Text style={[styles.methodText, { color: themeColors.textPrimary }]}>
          <FontAwesome name={item.method === 'delivery' ? 'motorcycle' : 'building'} /> 
          {item.method === 'delivery' ? ' Entrega' : ' Retirada no Local'}
        </Text>

        {item.method === 'delivery' && (
          <>
            {/* Informação do Entregador */}
            <View style={[styles.deliveryBox, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.deliveryAvatar} />
              ) : (
                <View style={[styles.deliveryAvatar, { backgroundColor: themeColors.card, justifyContent: 'center', alignItems: 'center' }]}>
                  <FontAwesome name="user" size={16} color={themeColors.textSecondary} />
                </View>
              )}
              <Text style={[styles.deliveryText, { color: themeColors.textPrimary }]}>
                Entregador: <Text style={{fontWeight: 'bold'}}>{item.entregador || 'Aguardando...'}</Text>
              </Text>
            </View>

            {/* Campo de Observação (com edição se pendente) */}
            <View style={[styles.obsContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
              <Text style={[styles.obsLabel, { color: themeColors.textSecondary }]}>Observação para Entrega:</Text>
              
              {editingObsId === item.id ? (
                <View>
                  <TextInput
                    style={[styles.obsInput, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.textPrimary }]}
                    value={obsText}
                    onChangeText={setObsText}
                    multiline
                    placeholder="Ex: Deixar na portaria..."
                    placeholderTextColor={themeColors.textSecondary}
                  />
                  <View style={styles.obsActionRow}>
                    <TouchableOpacity onPress={() => setEditingObsId(null)} style={styles.obsCancelBtn}>
                      <Text style={[styles.obsCancelText, { color: themeColors.danger }]}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleSaveObs(item.id)} style={[styles.obsSaveBtn, { backgroundColor: themeColors.primary }]} disabled={savingObs}>
                      {savingObs ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.obsSaveText}>Salvar</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.obsDisplayRow}>
                  <Text style={[styles.obsText, { color: themeColors.textPrimary }]}>
                    {item.observacao ? item.observacao : 'Nenhuma observação.'}
                  </Text>
                  
                  {/* Exibe botão de edição apenas se estiver Pendente */}
                  {item.status === 'pendente' && (
                    <TouchableOpacity onPress={() => startEditingObs(item)} style={styles.editObsBtn}>
                      <FontAwesome name="edit" size={18} color={themeColors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </>
        )}

        {/* BOTÃO PARA EXPANDIR / OCULTAR PRODUTOS */}
        {!isExpanded ? (
          <TouchableOpacity style={[styles.expandBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border }]} onPress={() => toggleExpand(item.id)}>
            <Text style={[styles.expandBtnText, { color: themeColors.primary }]}>Ver produtos ({item.items?.length || 0} itens)</Text>
            <FontAwesome name="chevron-down" size={12} color={themeColors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.expandedSection}>
            <View style={[styles.itemsBox, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
              {item.items && item.items.map((prod, idx) => {
                const unitPrice = prod.preco; 
                const quantity = prod.cartQty || prod.quantity || 1;
                const itemTotal = unitPrice * quantity; 

                return (
                  <View key={idx} style={[styles.itemRow, { borderBottomColor: themeColors.border }]}>
                    <View style={[styles.itemImgContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                      {prod.imagem ? (
                        <Image source={{ uri: prod.imagem }} style={styles.itemImg} />
                      ) : (
                        <FontAwesome name="shopping-basket" size={20} color={themeColors.textSecondary} />
                      )}
                    </View>

                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemName, { color: themeColors.textPrimary }]} numberOfLines={2}>{quantity}x {prod.nome || prod.descricao}</Text>
                      <Text style={[styles.itemUnit, { color: themeColors.textSecondary }]}>Un: R$ {parseFloat(unitPrice).toFixed(2)} | Total: R$ {itemTotal.toFixed(2)}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <TouchableOpacity style={[styles.expandBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border }]} onPress={() => toggleExpand(item.id)}>
              <Text style={[styles.expandBtnText, { color: themeColors.primary }]}>Ocultar produtos</Text>
              <FontAwesome name="chevron-up" size={12} color={themeColors.primary} />
            </TouchableOpacity>
          </View>
        )}

        <View style={[styles.totalRow, { borderTopColor: themeColors.border }]}>
          <Text style={[styles.totalLabel, { color: themeColors.textPrimary }]}>Total do Pedido</Text>
          <Text style={[styles.totalValue, { color: themeColors.success }]}>R$ {(item.total || 0).toFixed(2)}</Text>
        </View>

        <TouchableOpacity style={[styles.reorderFullBtn, { backgroundColor: themeColors.primary }]} onPress={() => handleReorder(item.items)}>
          <FontAwesome name="refresh" size={14} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.reorderFullBtnText}>Comprar Novamente</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      
      {/* Seção de Filtros */}
      <View style={[styles.filterSection, { backgroundColor: themeColors.card }]}>
        <TouchableOpacity style={styles.filterToggle} onPress={() => setShowFilters(!showFilters)}>
          <FontAwesome name="filter" size={16} color={themeColors.textPrimary} />
          <Text style={[styles.filterToggleText, { color: themeColors.textPrimary }]}>Filtrar Histórico</Text>
          <FontAwesome name={showFilters ? "chevron-up" : "chevron-down"} size={14} color={themeColors.textSecondary} />
        </TouchableOpacity>

        {showFilters && (
          <View style={[styles.filterBody, { borderTopColor: themeColors.border }]}>
            <Text style={[styles.filterLabel, { color: themeColors.textSecondary }]}>Período</Text>
            <View style={styles.periodRow}>
              <TouchableOpacity 
                style={[
                  styles.periodChip, 
                  { backgroundColor: themeColors.background, borderColor: themeColors.border },
                  filterPeriod === 'all' && { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary }
                ]} 
                onPress={() => setFilterPeriod('all')}
              >
                <Text style={[styles.periodChipText, { color: themeColors.textSecondary }, filterPeriod === 'all' && { color: themeColors.primary }]}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.periodChip, 
                  { backgroundColor: themeColors.background, borderColor: themeColors.border },
                  filterPeriod === '7' && { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary }
                ]} 
                onPress={() => setFilterPeriod('7')}
              >
                <Text style={[styles.periodChipText, { color: themeColors.textSecondary }, filterPeriod === '7' && { color: themeColors.primary }]}>7 dias</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[
                  styles.periodChip, 
                  { backgroundColor: themeColors.background, borderColor: themeColors.border },
                  filterPeriod === '30' && { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary }
                ]} 
                onPress={() => setFilterPeriod('30')}
              >
                <Text style={[styles.periodChipText, { color: themeColors.textSecondary }, filterPeriod === '30' && { color: themeColors.primary }]}>30 dias</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.filterLabel, { color: themeColors.textSecondary }]}>Valor do Pedido (R$)</Text>
            <View style={styles.priceFilterRow}>
              <TextInput 
                style={[styles.priceInput, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]} 
                placeholder="Mínimo" 
                placeholderTextColor={themeColors.textSecondary}
                keyboardType="numeric" 
                value={minPrice} 
                onChangeText={setMinPrice} 
              />
              <Text style={{ color: themeColors.textSecondary }}>até</Text>
              <TextInput 
                style={[styles.priceInput, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]} 
                placeholder="Máximo" 
                placeholderTextColor={themeColors.textSecondary}
                keyboardType="numeric" 
                value={maxPrice} 
                onChangeText={setMaxPrice} 
              />
            </View>
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={themeColors.primary} /></View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.list}
          renderItem={renderOrder}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>Nenhum pedido encontrado com estes filtros.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }, 
  
  // Filtros
  filterSection: { padding: 15, elevation: 2, zIndex: 10 },
  filterToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
  filterToggleText: { flex: 1, marginLeft: 10, fontSize: 16, fontWeight: 'bold' },
  filterBody: { marginTop: 15, borderTopWidth: 1, paddingTop: 15 },
  filterLabel: { fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  periodRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  periodChip: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, borderWidth: 1 },
  periodChipText: { fontSize: 13, fontWeight: 'bold' },
  priceFilterRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  priceInput: { flex: 1, borderWidth: 1, borderRadius: 8, padding: 10 },

  list: { padding: 15, paddingBottom: 40 }, 
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 15 }, 
  
  card: { padding: 20, borderRadius: 12, marginBottom: 15, elevation: 2, borderWidth: 1 }, 
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }, 
  orderId: { fontSize: 15, fontWeight: 'bold' }, 
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }, 
  badgeText: { fontSize: 12, fontWeight: 'bold', textTransform: 'uppercase' }, 
  
  dateText: { fontSize: 13, marginBottom: 4 }, 
  methodText: { fontSize: 13, fontWeight: 'bold', marginBottom: 10 }, 
  
  deliveryBox: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 10 },
  deliveryAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  deliveryText: { fontSize: 13 },

  // Estilos da Observação
  obsContainer: { padding: 10, borderRadius: 8, borderWidth: 1, marginBottom: 15 },
  obsLabel: { fontSize: 12, fontWeight: 'bold', marginBottom: 4 },
  obsDisplayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  obsText: { fontSize: 13, flex: 1, marginRight: 10 },
  editObsBtn: { padding: 5 },
  obsInput: { borderWidth: 1, borderRadius: 6, padding: 8, fontSize: 13, minHeight: 40, textAlignVertical: 'top', marginBottom: 8 },
  obsActionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  obsCancelBtn: { paddingVertical: 6, paddingHorizontal: 12, justifyContent: 'center' },
  obsCancelText: { fontWeight: 'bold', fontSize: 13 },
  obsSaveBtn: { paddingVertical: 6, paddingHorizontal: 15, borderRadius: 6, justifyContent: 'center' },
  obsSaveText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

  // Botão Expandir
  expandBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 8, marginBottom: 15, borderWidth: 1 },
  expandBtnText: { fontSize: 13, fontWeight: 'bold', marginRight: 8 },
  expandedSection: { marginBottom: 5 },

  // Lista de Produtos Expandida
  itemsBox: { borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1 }, 
  itemRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderBottomWidth: 1, paddingBottom: 10 }, 
  itemImgContainer: { width: 40, height: 40, borderRadius: 6, justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginRight: 10, overflow: 'hidden' },
  itemImg: { width: '100%', height: '100%', resizeMode: 'contain' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600' }, 
  itemUnit: { fontSize: 12, marginTop: 2 }, 

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 15, marginBottom: 15 }, 
  totalLabel: { fontSize: 16, fontWeight: 'bold' }, 
  totalValue: { fontSize: 20, fontWeight: 'bold' }, 

  reorderFullBtn: { flexDirection: 'row', padding: 15, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  reorderFullBtnText: { color: '#FFF', fontSize: 15, fontWeight: 'bold' }
});