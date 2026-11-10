import React, { useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, 
  TextInput, ActivityIndicator, Alert, ToastAndroid, Platform, ScrollView, Image
} from 'react-native';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext'; // Importação do tema

export default function AdminOrderManagementScreen() {
  const { themeColors } = useTheme(); // Cores dinâmicas
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]); 
  const [allProducts, setAllProducts] = useState([]); 
  const [filteredProducts, setFilteredProducts] = useState([]); 
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Estados dos Filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filterMethod, setFilterMethod] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('all');

  // Estados do Modal de Edição
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [editStatus, setEditStatus] = useState('');
  const [editEntregador, setEditEntregador] = useState('');
  
  // Estados para edição de itens
  const [editItems, setEditItems] = useState([]);
  const [newItem, setNewItem] = useState({ name: '', preco: '', quantity: '1', imagem: null });

  const showToast = (message) => {
    if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
    else Alert.alert('Aviso', message);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const snapOrders = await getDocs(collection(db, 'orders'));
      const ordersList = snapOrders.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      ordersList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setOrders(ordersList);

      const snapUsers = await getDocs(collection(db, 'users'));
      const usersList = snapUsers.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(user => user.role === 'funcionario' || user.role === 'admin');
      setEmployees(usersList);

      const snapProducts = await getDocs(collection(db, 'products'));
      const productsList = snapProducts.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAllProducts(productsList);

    } catch (error) {
      showToast('Erro ao carregar dados.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openEditModal = (order) => {
    setSelectedOrder(order);
    setEditStatus(order.status || 'pendente');
    setEditEntregador(order.entregador || '');
    setEditItems(order.items ? [...order.items] : []); 
    setNewItem({ name: '', preco: '', quantity: '1', imagem: null });
    setShowSuggestions(false);
    setModalVisible(true);
  };

  const removeItem = (index) => {
    const updatedItems = [...editItems];
    updatedItems.splice(index, 1);
    setEditItems(updatedItems);
  };

  const updateItemQuantity = (index, delta) => {
    const updatedItems = [...editItems];
    const currentQty = parseInt(updatedItems[index].quantity) || 1;
    const newQty = currentQty + delta;

    if (newQty > 0) {
      updatedItems[index].quantity = newQty;
      setEditItems(updatedItems);
    }
  };

  const handleSearchProduct = (text) => {
    setNewItem({ ...newItem, name: text });
    if (text.length > 1) {
      const filtered = allProducts.filter(p => 
        (p.nome || '').toLowerCase().includes(text.toLowerCase())
      );
      setFilteredProducts(filtered);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSelectProduct = (product) => {
    const precoAtivo = product.emPromocao && product.precoPromocao ? product.precoPromocao : product.preco;
    
    setNewItem({
      ...newItem,
      name: product.nome,
      preco: String(precoAtivo),
      imagem: product.imagem || null
    });
    setShowSuggestions(false);
  };

  const addNewItem = () => {
    if (!newItem.name || !newItem.preco) {
      showToast('Preencha nome e preço do item');
      return;
    }
    const parsedPrice = parseFloat(newItem.preco.replace(',', '.'));
    const parsedQty = parseInt(newItem.quantity) || 1;

    const existingIndex = editItems.findIndex(item => 
      (item.nome === newItem.name) || (item.descricao === newItem.name)
    );

    if (existingIndex >= 0) {
      const updatedItems = [...editItems];
      const currentQty = parseInt(updatedItems[existingIndex].quantity) || 1;
      updatedItems[existingIndex].quantity = currentQty + parsedQty;
      setEditItems(updatedItems);
    } else {
      setEditItems([
        ...editItems, 
        { 
          id: Date.now().toString(), 
          nome: newItem.name, 
          preco: parsedPrice, 
          quantity: parsedQty,
          imagem: newItem.imagem
        }
      ]);
    }
    
    setNewItem({ name: '', preco: '', quantity: '1', imagem: null });
  };

  const saveOrderChanges = async () => {
    setSaving(true);
    try {
      const novoTotal = editItems.reduce((acc, item) => {
        const valorItem = parseFloat(item.precoPromocao || item.preco) || 0;
        const qtdItem = parseInt(item.quantity) || 1;
        return acc + (valorItem * qtdItem);
      }, 0);

      const orderRef = doc(db, 'orders', selectedOrder.id);
      await updateDoc(orderRef, {
        status: editStatus,
        entregador: editEntregador,
        items: editItems,
        total: novoTotal
      });
      
      showToast('Pedido atualizado com sucesso!');
      setModalVisible(false);
      fetchData(); 
    } catch (error) {
      showToast('Erro ao atualizar o pedido.');
    }
    setSaving(false);
  };

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

  const filteredOrders = orders.filter(order => {
    if (filterMethod !== 'all' && order.method !== filterMethod) return false;
    if (filterStatus !== 'all' && order.status !== filterStatus) return false;
    
    if (filterPeriod !== 'all' && order.createdAt) {
      const orderDate = new Date(order.createdAt);
      const today = new Date();
      const diffDays = Math.ceil(Math.abs(today - orderDate) / (1000 * 60 * 60 * 24));
      
      if (filterPeriod === 'hoje') {
        if (orderDate.toDateString() !== today.toDateString()) return false;
      } else if (filterPeriod === '7' && diffDays > 7) {
        return false;
      } else if (filterPeriod === '30' && diffDays > 30) {
        return false;
      }
    }
    return true;
  });

  const renderOrder = ({ item }) => {
    const badge = getStatusBadge(item.status);
    const entregadorObj = employees.find(emp => emp.nome === item.entregador);
    const avatarUri = entregadorObj?.photoUri || entregadorObj?.imagem || entregadorObj?.foto;
    
    return (
      <TouchableOpacity style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]} onPress={() => openEditModal(item)}>
        <View style={styles.cardHeader}>
          <Text style={[styles.orderId, { color: themeColors.textPrimary }]}>#{item.id.slice(0, 8).toUpperCase()}</Text>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
          </View>
        </View>

        <Text style={[styles.dateText, { color: themeColors.textSecondary }]}><FontAwesome name="calendar" /> {formatDate(item.createdAt)}</Text>
        
        <View style={styles.infoRow}>
          <FontAwesome name={item.method === 'delivery' ? 'motorcycle' : 'building'} size={16} color={themeColors.textSecondary} /> 
          <Text style={[styles.infoText, { color: themeColors.textPrimary }]}>{item.method === 'delivery' ? 'Entrega' : 'Retirada'}</Text>
        </View>

        {/* Exibe o entregador e a observação caso seja entrega */}
        {item.method === 'delivery' && (
          <View>
            {/* Bloco do Entregador */}
            {item.entregador ? (
              <View style={[styles.deliveryBoxCard, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={styles.deliveryAvatarCard} />
                ) : (
                  <View style={[styles.deliveryAvatarCard, { backgroundColor: themeColors.card, justifyContent: 'center', alignItems: 'center' }]}>
                    <FontAwesome name="user" size={14} color={themeColors.textSecondary} />
                  </View>
                )}
                <Text style={[styles.deliveryTextCard, { color: themeColors.textPrimary }]}>
                  Entregador: <Text style={{fontWeight: 'bold'}}>{item.entregador}</Text>
                </Text>
              </View>
            ) : null}

            {/* Bloco de Observação */}
            {item.observacao ? (
              <View style={[styles.obsBox, { backgroundColor: themeColors.warning + '15', borderColor: themeColors.warning }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                  <FontAwesome name="commenting-o" size={14} color={themeColors.warning} />
                  <Text style={[styles.obsTitle, { color: themeColors.warning }]}>Observação do Cliente:</Text>
                </View>
                <Text style={[styles.obsText, { color: themeColors.textPrimary }]}>{item.observacao}</Text>
              </View>
            ) : null}
          </View>
        )}

        {item.method === 'delivery' && item.address && (
          <View style={[styles.addressBox, { backgroundColor: themeColors.background }]}>
            <Text style={[styles.addressText, { color: themeColors.textSecondary }]}>{item.address.street}, {item.address.number}</Text>
            <Text style={[styles.addressText, { color: themeColors.textSecondary }]}>{item.address.neighborhood} - {item.address.city}</Text>
          </View>
        )}

        <View style={[styles.footerRow, { borderTopColor: themeColors.border }]}>
          <Text style={[styles.itemsCount, { color: themeColors.textSecondary }]}>{item.items ? item.items.length : 0} itens</Text>
          <Text style={[styles.totalValue, { color: themeColors.success }]}>R$ {(item.total || 0).toFixed(2)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      
      {/* SEÇÃO DE FILTROS */}
      <View style={[styles.filterSection, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        <TouchableOpacity style={styles.filterToggle} onPress={() => setShowFilters(!showFilters)}>
          <FontAwesome name="filter" size={16} color={themeColors.textPrimary} />
          <Text style={[styles.filterToggleText, { color: themeColors.textPrimary }]}>Filtrar Pedidos</Text>
          <FontAwesome name={showFilters ? "chevron-up" : "chevron-down"} size={14} color={themeColors.textSecondary} />
        </TouchableOpacity>

        {showFilters && (
          <View style={[styles.filterBody, { borderTopColor: themeColors.border }]}>
            <Text style={[styles.filterLabel, { color: themeColors.textSecondary }]}>Método</Text>
            <View style={styles.filterRow}>
              <TouchableOpacity style={[styles.filterChip, { backgroundColor: themeColors.background, borderColor: themeColors.border }, filterMethod === 'all' && { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary }]} onPress={() => setFilterMethod('all')}>
                <Text style={[styles.filterChipText, { color: themeColors.textSecondary }, filterMethod === 'all' && { color: themeColors.primary }]}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, { backgroundColor: themeColors.background, borderColor: themeColors.border }, filterMethod === 'delivery' && { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary }]} onPress={() => setFilterMethod('delivery')}>
                <Text style={[styles.filterChipText, { color: themeColors.textSecondary }, filterMethod === 'delivery' && { color: themeColors.primary }]}>Entrega</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, { backgroundColor: themeColors.background, borderColor: themeColors.border }, filterMethod === 'pickup' && { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary }]} onPress={() => setFilterMethod('pickup')}>
                <Text style={[styles.filterChipText, { color: themeColors.textSecondary }, filterMethod === 'pickup' && { color: themeColors.primary }]}>Retirada</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.filterLabel, { color: themeColors.textSecondary }]}>Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 15 }}>
              {['all', 'pendente', 'saiu_entrega', 'entregue', 'retirado', 'cancelado'].map(st => (
                <TouchableOpacity key={st} style={[styles.filterChipScrolled, { backgroundColor: themeColors.background, borderColor: themeColors.border }, filterStatus === st && { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary }]} onPress={() => setFilterStatus(st)}>
                  <Text style={[styles.filterChipText, { color: themeColors.textSecondary }, filterStatus === st && { color: themeColors.primary }]}>
                    {st === 'all' ? 'Todos' : getStatusBadge(st).label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={[styles.filterLabel, { color: themeColors.textSecondary }]}>Período</Text>
            <View style={styles.filterRow}>
              <TouchableOpacity style={[styles.filterChip, { backgroundColor: themeColors.background, borderColor: themeColors.border }, filterPeriod === 'all' && { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary }]} onPress={() => setFilterPeriod('all')}>
                <Text style={[styles.filterChipText, { color: themeColors.textSecondary }, filterPeriod === 'all' && { color: themeColors.primary }]}>Todos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, { backgroundColor: themeColors.background, borderColor: themeColors.border }, filterPeriod === 'hoje' && { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary }]} onPress={() => setFilterPeriod('hoje')}>
                <Text style={[styles.filterChipText, { color: themeColors.textSecondary }, filterPeriod === 'hoje' && { color: themeColors.primary }]}>Hoje</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, { backgroundColor: themeColors.background, borderColor: themeColors.border }, filterPeriod === '7' && { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary }]} onPress={() => setFilterPeriod('7')}>
                <Text style={[styles.filterChipText, { color: themeColors.textSecondary }, filterPeriod === '7' && { color: themeColors.primary }]}>7 dias</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.filterChip, { backgroundColor: themeColors.background, borderColor: themeColors.border }, filterPeriod === '30' && { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary }]} onPress={() => setFilterPeriod('30')}>
                <Text style={[styles.filterChipText, { color: themeColors.textSecondary }, filterPeriod === '30' && { color: themeColors.primary }]}>30 dias</Text>
              </TouchableOpacity>
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
          ListEmptyComponent={<Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>Nenhum pedido encontrado com esses filtros.</Text>}
        />
      )}

      {/* Modal de Edição */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.card }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Gerir Pedido</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <FontAwesome name="times" size={24} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Status do Pedido</Text>
              <View style={styles.statusGrid}>
                {['pendente', 'saiu_entrega', 'entregue', 'retirado', 'cancelado'].map(st => (
                  <TouchableOpacity 
                    key={st} 
                    style={[styles.statusOption, { backgroundColor: themeColors.background, borderColor: themeColors.border }, editStatus === st && { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary }]}
                    onPress={() => setEditStatus(st)}
                  >
                    <Text style={[styles.statusOptionText, { color: themeColors.textSecondary }, editStatus === st && { color: themeColors.primary }]}>
                      {getStatusBadge(st).label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {selectedOrder?.method === 'delivery' && (
                <View style={[styles.section, { borderTopColor: themeColors.border }]}>
                  {/* Aviso de bloqueio se for "entregue" */}
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>
                    Atribuir Entregador {editStatus === 'entregue' && '(Bloqueado após entrega)'}
                  </Text>
                  {employees.length > 0 ? (
                    <View style={styles.statusGrid}>
                      {employees.map(emp => {
                        const avatarUri = emp.photoUri || emp.imagem || emp.foto; 
                        
                        return (
                          <TouchableOpacity 
                            key={emp.id} 
                            style={[
                              styles.employeeOption, 
                              { backgroundColor: themeColors.background, borderColor: themeColors.border }, 
                              editEntregador === emp.nome && { backgroundColor: themeColors.primary + '15', borderColor: themeColors.primary },
                              editStatus === 'entregue' && { opacity: 0.5 } // Feedback visual de bloqueio
                            ]}
                            onPress={() => setEditEntregador(emp.nome)}
                            disabled={editStatus === 'entregue'} // Bloqueia clique se entregue
                          >
                            {avatarUri ? (
                              <Image source={{ uri: avatarUri }} style={styles.employeeAvatar} />
                            ) : (
                              <View style={[styles.employeeAvatar, { backgroundColor: themeColors.card, justifyContent: 'center', alignItems: 'center' }]}>
                                <FontAwesome name="user" size={14} color={themeColors.textSecondary} />
                              </View>
                            )}
                            <Text style={[styles.statusOptionText, { color: themeColors.textSecondary }, editEntregador === emp.nome && { color: themeColors.primary }]}>
                              {emp.nome}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : (
                    <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>Nenhum entregador encontrado.</Text>
                  )}
                </View>
              )}

              <View style={[styles.section, { borderTopColor: themeColors.border }]}>
                <Text style={[styles.label, { color: themeColors.textSecondary }]}>Itens do Pedido {editStatus !== 'pendente' && '(Apenas leitura)'}</Text>
                {editItems.map((item, index) => {
                  const valorUnitario = parseFloat(item.precoPromocao || item.preco) || 0;
                  const quantidade = parseInt(item.quantity) || 1;
                  const valorTotalLinha = valorUnitario * quantidade;

                  return (
                    <View key={index} style={[styles.itemRow, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                      
                      {/* IMAGEM DO PRODUTO AQUI */}
                      <View style={[styles.itemImgContainerAdmin, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                        {item.imagem ? (
                          <Image source={{ uri: item.imagem }} style={styles.itemImgAdmin} />
                        ) : (
                          <FontAwesome name="image" size={20} color={themeColors.textSecondary} />
                        )}
                      </View>

                      <View style={{ flex: 1 }}>
                        <Text style={[styles.itemName, { color: themeColors.textPrimary }]} numberOfLines={2}>{item.nome || item.descricao}</Text>
                        <Text style={[styles.itemPrice, { color: themeColors.textSecondary }]}>
                          R$ {valorTotalLinha.toFixed(2)} <Text style={{fontSize: 11}}>(R$ {valorUnitario.toFixed(2)} un)</Text>
                        </Text>
                        
                        {editStatus === 'pendente' ? (
                          <View style={[styles.qtyControl, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                            <TouchableOpacity style={styles.qtyBtn} onPress={() => updateItemQuantity(index, -1)}>
                              <FontAwesome name="minus" size={14} color={themeColors.textSecondary} />
                            </TouchableOpacity>
                            <Text style={[styles.qtyText, { color: themeColors.textPrimary }]}>{quantidade}</Text>
                            <TouchableOpacity style={styles.qtyBtn} onPress={() => updateItemQuantity(index, 1)}>
                              <FontAwesome name="plus" size={14} color={themeColors.textSecondary} />
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <Text style={[styles.qtyReadOnly, { color: themeColors.textSecondary }]}>Qtd: {quantidade}</Text>
                        )}
                      </View>

                      {editStatus === 'pendente' && (
                        <TouchableOpacity onPress={() => removeItem(index)} style={[styles.removeBtn, { backgroundColor: themeColors.danger + '20' }]}>
                          <FontAwesome name="trash" size={18} color={themeColors.danger} />
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}

                {editStatus === 'pendente' && (
                  <View style={styles.addItemForm}>
                    <TextInput
                      style={[styles.input, { flex: 2, marginRight: 5, backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]}
                      placeholder="Buscar produto..."
                      placeholderTextColor={themeColors.textSecondary}
                      value={newItem.name}
                      onChangeText={handleSearchProduct}
                    />
                    <TextInput
                      style={[styles.input, { flex: 1, marginRight: 5, backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.textSecondary }]}
                      placeholder="R$ 0,00"
                      keyboardType="numeric"
                      value={newItem.preco}
                      editable={false}
                    />
                    <TextInput
                      style={[styles.input, { flex: 0.8, marginRight: 5, backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]}
                      placeholder="Qtd"
                      placeholderTextColor={themeColors.textSecondary}
                      keyboardType="numeric"
                      value={newItem.quantity}
                      onChangeText={(txt) => setNewItem({...newItem, quantity: txt})}
                    />
                    <TouchableOpacity style={[styles.addBtn, { backgroundColor: themeColors.success }]} onPress={addNewItem}>
                      <FontAwesome name="plus" size={16} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                )}

                {showSuggestions && filteredProducts.length > 0 && editStatus === 'pendente' && (
                  <View style={[styles.suggestionsContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                    {filteredProducts.slice(0, 5).map(prod => {
                      const valor = prod.emPromocao && prod.precoPromocao ? prod.precoPromocao : prod.preco;
                      return (
                        <TouchableOpacity 
                          key={prod.id} 
                          style={[styles.suggestionItem, { borderBottomColor: themeColors.background }]}
                          onPress={() => handleSelectProduct(prod)}
                        >
                          <View style={styles.suggestionInfo}>
                            {prod.imagem ? (
                              <Image source={{ uri: prod.imagem }} style={[styles.suggestionImage, { backgroundColor: themeColors.background }]} />
                            ) : (
                              <View style={[styles.suggestionImage, { backgroundColor: themeColors.background, justifyContent: 'center', alignItems: 'center' }]}>
                                <FontAwesome name="image" size={16} color={themeColors.textSecondary} />
                              </View>
                            )}
                            <Text style={[styles.suggestionName, { color: themeColors.textPrimary }]} numberOfLines={1}>{prod.nome}</Text>
                          </View>
                          <Text style={[styles.suggestionPrice, { color: themeColors.success }]}>R$ {parseFloat(valor).toFixed(2)}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>

              <TouchableOpacity style={[styles.saveBtn, { backgroundColor: themeColors.primary }]} onPress={saveOrderChanges} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Salvar Alterações</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  filterSection: { padding: 15, elevation: 2, zIndex: 10, borderBottomWidth: 1 },
  filterToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 5 },
  filterToggleText: { flex: 1, marginLeft: 10, fontSize: 16, fontWeight: 'bold' },
  filterBody: { marginTop: 15, borderTopWidth: 1, paddingTop: 15 },
  filterLabel: { fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  filterRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  filterChip: { flex: 1, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderRadius: 8, borderWidth: 1 },
  filterChipScrolled: { paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', borderRadius: 8, borderWidth: 1, marginRight: 10 },
  filterChipText: { fontSize: 13, fontWeight: 'bold' },

  list: { padding: 15, paddingBottom: 40 },
  emptyText: { textAlign: 'center', marginTop: 10, fontSize: 14 },
  
  card: { padding: 20, borderRadius: 12, marginBottom: 15, elevation: 2, borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  orderId: { fontSize: 16, fontWeight: 'bold' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 12, fontWeight: 'bold' },
  
  dateText: { fontSize: 13, marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { fontSize: 14, marginLeft: 8, fontWeight: 'bold' },
  
  deliveryBoxCard: { flexDirection: 'row', alignItems: 'center', padding: 8, borderRadius: 8, marginTop: 5, marginBottom: 10, borderWidth: 1 },
  deliveryAvatarCard: { width: 24, height: 24, borderRadius: 12, marginRight: 8 },
  deliveryTextCard: { fontSize: 13 },

  obsBox: { padding: 10, borderRadius: 8, borderWidth: 1, marginTop: 5, marginBottom: 10 },
  obsTitle: { fontSize: 12, fontWeight: 'bold', marginLeft: 6 },
  obsText: { fontSize: 13, lineHeight: 18 },

  addressBox: { padding: 10, borderRadius: 8, marginTop: 5, marginBottom: 15 },
  addressText: { fontSize: 13 },
  
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, paddingTop: 15 },
  itemsCount: { fontSize: 14 },
  totalValue: { fontSize: 18, fontWeight: 'bold' },

  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold' },
  
  label: { fontSize: 14, fontWeight: 'bold', marginBottom: 10 },
  section: { marginBottom: 20, paddingTop: 15, borderTopWidth: 1 },
  
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 10 },
  statusOption: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  statusOptionText: { fontWeight: 'bold' },

  employeeOption: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 25, borderWidth: 1 },
  employeeAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 10, justifyContent: 'center', alignItems: 'center' },
  
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1 },
  
  // Imagem do Produto no Modal de Edição
  itemImgContainerAdmin: { width: 50, height: 50, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1 },
  itemImgAdmin: { width: '100%', height: '100%', resizeMode: 'contain', borderRadius: 6 },

  itemName: { fontSize: 15, fontWeight: 'bold' },
  itemPrice: { fontSize: 13, marginTop: 2, marginBottom: 8 },
  
  qtyControl: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', borderRadius: 6, borderWidth: 1 },
  qtyBtn: { paddingVertical: 6, paddingHorizontal: 12 },
  qtyText: { fontSize: 14, fontWeight: 'bold', paddingHorizontal: 10 },
  qtyReadOnly: { fontSize: 13, fontWeight: 'bold', marginTop: 4 }, 
  
  removeBtn: { padding: 10, borderRadius: 8, alignSelf: 'flex-start', marginTop: 5 },
  
  addItemForm: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 14 },
  addBtn: { padding: 12, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  suggestionsContainer: { borderWidth: 1, borderRadius: 8, marginTop: 5, elevation: 2 },
  suggestionItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 10, borderBottomWidth: 1 },
  suggestionInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  suggestionImage: { width: 35, height: 35, borderRadius: 6, marginRight: 10 },
  suggestionName: { fontSize: 14, fontWeight: '500', flexShrink: 1 },
  suggestionPrice: { fontSize: 14, fontWeight: 'bold' },

  saveBtn: { padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 10, marginBottom: 20 },
  saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' }
});