import React, { useState, useEffect } from 'react';
import { 
  View, Text, FlatList, TouchableOpacity, Modal, StyleSheet, 
  Alert, Switch, ActivityIndicator, TextInput, Image, ToastAndroid, Platform, ScrollView, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, getDocs, addDoc, doc, updateDoc } from 'firebase/firestore'; 
import { db } from '../../config/firebase';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext'; // Importação do contexto

export default function ProductManagementScreen() {
  const { themeColors } = useTheme(); // Cores dinâmicas do tema
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('');

  const [productModalVisible, setProductModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  
  // Estados para Gestão e Edição de Categorias/Subcategorias
  const [managingCategory, setManagingCategory] = useState(null);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubcategoryName, setNewSubcategoryName] = useState('');
  const [editingCategoryMode, setEditingCategoryMode] = useState(null); 
  const [editingSubcategoryMode, setEditingSubcategoryMode] = useState(null); 

  const [editingId, setEditingId] = useState(null);
  const [prodNome, setProdNome] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCat, setProdCat] = useState('');
  const [prodSubCat, setProdSubCat] = useState('');
  const [prodPreco, setProdPreco] = useState('');
  const [prodPromo, setProdPromo] = useState(false);
  const [prodPrecoPromo, setProdPrecoPromo] = useState('');
  const [prodEstoque, setProdEstoque] = useState('');
  const [prodDisponivel, setProdDisponivel] = useState(true);
  const [prodImage, setProdImage] = useState(null);
  const [saving, setSaving] = useState(false);

  const showToast = (message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert('Aviso', message);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const catSnap = await getDocs(collection(db, 'categories'));
      const catList = catSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setCategories(catList);

      const prodSnap = await getDocs(collection(db, 'products'));
      const prodList = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      setProducts(prodList);
    } catch (error) {
      showToast('Erro ao carregar os dados.');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveCategory = async () => {
    if (!newCategoryName.trim()) {
      showToast('Digite o nome da categoria.');
      return;
    }
    setSaving(true);
    try {
      if (editingCategoryMode) {
        await updateDoc(doc(db, 'categories', editingCategoryMode.id), { nome: newCategoryName });
        showToast('Categoria atualizada!');
        setEditingCategoryMode(null);
      } else {
        await addDoc(collection(db, 'categories'), { nome: newCategoryName, subcategorias: [] });
        showToast('Categoria criada!');
      }
      setNewCategoryName('');
      fetchData();
    } catch (error) {
      showToast('Erro ao salvar categoria.');
    }
    setSaving(false);
  };

  const handleSaveSubcategory = async () => {
    if (!newSubcategoryName.trim() || !managingCategory) {
      showToast('Digite o nome da subcategoria.');
      return;
    }
    setSaving(true);
    try {
      const catRef = doc(db, 'categories', managingCategory.id);
      let updatedSubcats;
      
      if (editingSubcategoryMode) {
        updatedSubcats = managingCategory.subcategorias.map(sub => sub === editingSubcategoryMode ? newSubcategoryName : sub);
        showToast('Subcategoria atualizada!');
        setEditingSubcategoryMode(null);
      } else {
        updatedSubcats = [...(managingCategory.subcategorias || []), newSubcategoryName];
        showToast('Subcategoria adicionada!');
      }

      await updateDoc(catRef, { subcategorias: updatedSubcats });
      setNewSubcategoryName('');
      
      const updatedCat = { ...managingCategory, subcategorias: updatedSubcats };
      setManagingCategory(updatedCat);
      fetchData();
    } catch (error) {
      showToast('Erro ao salvar subcategoria.');
    }
    setSaving(false);
  };

  const cancelEdits = () => {
    setEditingCategoryMode(null);
    setEditingSubcategoryMode(null);
    setNewCategoryName('');
    setNewSubcategoryName('');
  };

const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão', 'Precisamos de acesso às fotos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      aspect: [1, 1], 
      allowsEditing: true, 
      quality: 0.5,
      base64: true, // Fundamental para o ImgBB
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      showToast('Enviando imagem do produto, aguarde...');
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
          setProdImage(data.data.url); // Salva o Link Público para todos os clientes verem
          showToast('Imagem carregada com sucesso!');
        } else {
          showToast('Erro ao processar a imagem.');
        }
      } catch (error) {
        showToast('Erro de conexão ao enviar imagem.');
      }
    }
  };

  const openProductModal = (product = null) => {
    if (product) {
      setEditingId(product.id);
      setProdNome(product.nome);
      setProdDesc(product.descricao || '');
      setProdCat(product.categoria);
      setProdSubCat(product.subcategoria || '');
      setProdPreco(product.preco.toString());
      setProdPromo(product.emPromocao || false);
      setProdPrecoPromo(product.precoPromocao?.toString() || '');
      setProdEstoque(product.estoque.toString());
      setProdDisponivel(product.disponivel !== false);
      setProdImage(product.imagem || null);
    } else {
      setEditingId(null);
      setProdNome('');
      setProdDesc('');
      setProdCat(categories.length > 0 ? categories[0].nome : '');
      setProdSubCat('');
      setProdPreco('');
      setProdPromo(false);
      setProdPrecoPromo('');
      setProdEstoque('');
      setProdDisponivel(true);
      setProdImage(null);
    }
    setProductModalVisible(true);
  };

  const saveProduct = async () => {
    if (!prodNome || !prodPreco || !prodEstoque || !prodCat) {
      showToast('Preencha nome, preço, estoque e categoria.');
      return;
    }
    
    setSaving(true);
    const productData = {
      nome: prodNome,
      descricao: prodDesc,
      categoria: prodCat,
      subcategoria: prodSubCat,
      preco: parseFloat(prodPreco.replace(',', '.')),
      emPromocao: prodPromo,
      precoPromocao: prodPromo ? parseFloat(prodPrecoPromo.replace(',', '.')) : null,
      estoque: parseInt(prodEstoque, 10),
      disponivel: prodDisponivel,
      imagem: prodImage,
      updatedAt: new Date().toISOString()
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'products', editingId), productData);
        showToast('Produto atualizado!');
      } else {
        productData.createdAt = new Date().toISOString();
        await addDoc(collection(db, 'products'), productData);
        showToast('Produto criado!');
      }
      setProductModalVisible(false);
      fetchData();
    } catch (error) {
      showToast('Erro ao salvar produto.');
    }
    setSaving(false);
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = categoryFilter === 'all' || p.categoria === categoryFilter;
    const matchesStock = stockFilter === '' || p.estoque <= parseInt(stockFilter, 10);
    return matchesSearch && matchesCat && matchesStock;
  });

  const selectedCatData = categories.find(c => c.nome === prodCat);
  const availableSubcats = selectedCatData?.subcategorias || [];

  const renderProduct = ({ item }) => (
    <TouchableOpacity style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]} onPress={() => openProductModal(item)}>
      <View style={[styles.imgContainer, { backgroundColor: themeColors.background }]}>
        {item.imagem ? (
          <Image source={{ uri: item.imagem }} style={styles.prodImg} />
        ) : (
          <View style={styles.imgPlaceholder}><FontAwesome name="shopping-basket" size={24} color={themeColors.textSecondary} /></View>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>{item.nome}</Text>
        <Text style={[styles.cardCat, { color: themeColors.textSecondary }]}>{item.categoria} {item.subcategoria ? ` > ${item.subcategoria}` : ''}</Text>
        
        <View style={styles.priceRow}>
          <Text style={[styles.priceText, { color: themeColors.textPrimary }, item.emPromocao && { textDecorationLine: 'line-through', color: themeColors.textSecondary, fontSize: 12 }]}>
            R$ {item.preco.toFixed(2)}
          </Text>
          {item.emPromocao && (
            <Text style={[styles.promoText, { color: themeColors.success }]}> R$ {item.precoPromocao.toFixed(2)}</Text>
          )}
        </View>

        <View style={styles.badgesRow}>
          <Text style={[styles.badge, item.estoque <= 5 ? { backgroundColor: themeColors.danger + '20', color: themeColors.danger } : { backgroundColor: themeColors.success + '20', color: themeColors.success }]}>
            Estoque: {item.estoque}
          </Text>
          {!item.disponivel && <Text style={[styles.badge, { backgroundColor: themeColors.danger + '20', color: themeColors.danger }]}>Indisponível</Text>}
        </View>
      </View>
      <FontAwesome name="edit" size={20} color={themeColors.textSecondary} style={{ padding: 10 }} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.actionBtnOutline, { borderColor: themeColors.primary }]} onPress={() => { setManagingCategory(null); cancelEdits(); setCategoryModalVisible(true); }}>
            <FontAwesome name="tags" size={14} color={themeColors.primary} />
            <Text style={[styles.actionBtnTextOutline, { color: themeColors.primary }]}>Categorias</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtnSolid, { backgroundColor: themeColors.primary }]} onPress={() => openProductModal()}>
            <FontAwesome name="plus" size={14} color="#FFF" />
            <Text style={styles.actionBtnTextSolid}>Novo Produto</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]}
          placeholder="Buscar produto..."
          placeholderTextColor={themeColors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        
        <View style={styles.filterRow}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
            <TouchableOpacity 
              style={[styles.filterChip, { backgroundColor: themeColors.background, borderColor: themeColors.border }, categoryFilter === 'all' && { backgroundColor: themeColors.primary + '20', borderColor: themeColors.primary }]}
              onPress={() => setCategoryFilter('all')}
            >
              <Text style={[styles.filterChipText, { color: themeColors.textSecondary }, categoryFilter === 'all' && { color: themeColors.primary }]}>Todas</Text>
            </TouchableOpacity>
            {categories.map(c => (
              <TouchableOpacity 
                key={c.id}
                style={[styles.filterChip, { backgroundColor: themeColors.background, borderColor: themeColors.border }, categoryFilter === c.nome && { backgroundColor: themeColors.primary + '20', borderColor: themeColors.primary }]}
                onPress={() => setCategoryFilter(c.nome)}
              >
                <Text style={[styles.filterChipText, { color: themeColors.textSecondary }, categoryFilter === c.nome && { color: themeColors.primary }]}>{c.nome}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <TextInput
          style={[styles.inputSmall, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]}
          placeholder="Filtrar estoque abaixo de... (ex: 10)"
          placeholderTextColor={themeColors.textSecondary}
          value={stockFilter}
          onChangeText={setStockFilter}
          keyboardType="numeric"
        />
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={themeColors.primary} /></View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={item => item.id}
          renderItem={renderProduct}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>Nenhum produto encontrado.</Text>}
        />
      )}

      {/* Modal de Gestão de Categorias */}
      <Modal visible={categoryModalVisible} animationType="slide">
        <SafeAreaView style={[styles.modalFullContainer, { backgroundColor: themeColors.background }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            
            <View style={[styles.modalHeader, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {managingCategory && (
                  <TouchableOpacity onPress={() => { setManagingCategory(null); cancelEdits(); }} style={{ marginRight: 15 }}>
                    <FontAwesome name="arrow-left" size={20} color={themeColors.textPrimary} />
                  </TouchableOpacity>
                )}
                <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>
                  {managingCategory ? `Subcategorias de ${managingCategory.nome}` : 'Categorias'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setCategoryModalVisible(false); cancelEdits(); }}>
                <FontAwesome name="times" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.managerListScroll}>
              {!managingCategory ? (
                categories.map(cat => (
                  <View key={cat.id} style={[styles.managerListItem, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                    <TouchableOpacity style={{ flex: 1 }} onPress={() => setManagingCategory(cat)}>
                      <Text style={[styles.managerListItemText, { color: themeColors.textPrimary }]}>{cat.nome}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Text style={[styles.managerListCount, { backgroundColor: themeColors.background, color: themeColors.textSecondary }]}>{(cat.subcategorias || []).length} sub</Text>
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setEditingCategoryMode(cat); setNewCategoryName(cat.nome); }} style={{ paddingHorizontal: 15 }}>
                      <FontAwesome name="edit" size={20} color={themeColors.textSecondary} />
                    </TouchableOpacity>
                    <FontAwesome name="chevron-right" size={14} color={themeColors.textSecondary} />
                  </View>
                ))
              ) : (
                (managingCategory.subcategorias || []).map((sub, index) => (
                  <View key={index} style={[styles.managerListItem, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                    <Text style={[styles.managerListItemText, { flex: 1, color: themeColors.textPrimary }]}>{sub}</Text>
                    <TouchableOpacity onPress={() => { setEditingSubcategoryMode(sub); setNewSubcategoryName(sub); }} style={{ paddingHorizontal: 15 }}>
                      <FontAwesome name="edit" size={20} color={themeColors.textSecondary} />
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </ScrollView>

            <View style={[styles.managerFooter, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              {(editingCategoryMode || editingSubcategoryMode) && (
                <TouchableOpacity onPress={cancelEdits} style={{ marginRight: 10 }}>
                  <FontAwesome name="times-circle" size={28} color={themeColors.danger} />
                </TouchableOpacity>
              )}
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0, marginRight: 10, backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]}
                placeholder={managingCategory ? "Nome da subcategoria..." : "Nome da categoria..."}
                placeholderTextColor={themeColors.textSecondary}
                value={managingCategory ? newSubcategoryName : newCategoryName}
                onChangeText={managingCategory ? setNewSubcategoryName : setNewCategoryName}
              />
              <TouchableOpacity 
                style={[styles.addBtnSquare, { backgroundColor: themeColors.primary }, (editingCategoryMode || editingSubcategoryMode) && { backgroundColor: themeColors.success }]} 
                onPress={managingCategory ? handleSaveSubcategory : handleSaveCategory} 
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <FontAwesome name={(editingCategoryMode || editingSubcategoryMode) ? "check" : "plus"} size={18} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
            
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      {/* Modal de Produto */}
      <Modal visible={productModalVisible} animationType="slide">
        <SafeAreaView style={[styles.modalFullContainer, { backgroundColor: themeColors.background }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={[styles.modalHeader, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>{editingId ? 'Editar Produto' : 'Novo Produto'}</Text>
              <TouchableOpacity onPress={() => setProductModalVisible(false)}>
                <FontAwesome name="times" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView contentContainerStyle={styles.modalScroll}>
              <TouchableOpacity style={[styles.imgPicker, { backgroundColor: themeColors.card, borderColor: themeColors.border }]} onPress={pickImage}>
                {prodImage ? (
                  <Image source={{ uri: prodImage }} style={styles.imgPreview} />
                ) : (
                  <>
                    <FontAwesome name="camera" size={24} color={themeColors.textSecondary} />
                    <Text style={[styles.imgPickerText, { color: themeColors.textSecondary }]}>Adicionar Imagem</Text>
                  </>
                )}
              </TouchableOpacity>

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Nome do Produto *</Text>
              <TextInput style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.textPrimary }]} value={prodNome} onChangeText={setProdNome} placeholderTextColor={themeColors.textSecondary} />

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Categoria Principal *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catSelectScroll}>
                {categories.map(c => (
                  <TouchableOpacity 
                    key={c.id} 
                    style={[styles.catSelectChip, { backgroundColor: themeColors.card, borderColor: themeColors.border }, prodCat === c.nome && { backgroundColor: themeColors.primary + '20', borderColor: themeColors.primary }]}
                    onPress={() => { setProdCat(c.nome); setProdSubCat(''); }}
                  >
                    <Text style={[styles.catSelectChipText, { color: themeColors.textSecondary }, prodCat === c.nome && { color: themeColors.primary }]}>{c.nome}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {availableSubcats.length > 0 && (
                <>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Subcategoria *</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catSelectScroll}>
                    {availableSubcats.map((sub, idx) => (
                      <TouchableOpacity 
                        key={idx} 
                        style={[styles.catSelectChip, { backgroundColor: themeColors.card, borderColor: themeColors.border }, prodSubCat === sub && { backgroundColor: themeColors.primary + '20', borderColor: themeColors.primary }]}
                        onPress={() => setProdSubCat(sub)}
                      >
                        <Text style={[styles.catSelectChipText, { color: themeColors.textSecondary }, prodSubCat === sub && { color: themeColors.primary }]}>{sub}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </>
              )}

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Descrição</Text>
              <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top', backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.textPrimary }]} multiline value={prodDesc} onChangeText={setProdDesc} placeholderTextColor={themeColors.textSecondary} />

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Preço (R$) *</Text>
                  <TextInput style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.textPrimary }]} keyboardType="numeric" value={prodPreco} onChangeText={setProdPreco} placeholder="0.00" placeholderTextColor={themeColors.textSecondary} />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Estoque *</Text>
                  <TextInput style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.textPrimary }]} keyboardType="numeric" value={prodEstoque} onChangeText={setProdEstoque} placeholder="Qtd" placeholderTextColor={themeColors.textSecondary} />
                </View>
              </View>

              <View style={[styles.switchRow, { borderColor: themeColors.border }]}>
                <Text style={[styles.switchLabel, { color: themeColors.textPrimary }]}>Produto Disponível na Loja</Text>
                <Switch value={prodDisponivel} onValueChange={setProdDisponivel} trackColor={{ false: themeColors.border, true: themeColors.primary + '80' }} thumbColor={prodDisponivel ? themeColors.primary : themeColors.textSecondary} />
              </View>

              <View style={[styles.switchRow, { borderColor: themeColors.border }]}>
                <Text style={[styles.switchLabel, { color: themeColors.textPrimary }]}>Ativar Promoção</Text>
                <Switch value={prodPromo} onValueChange={setProdPromo} trackColor={{ false: themeColors.border, true: themeColors.primary + '80' }} thumbColor={prodPromo ? themeColors.primary : themeColors.textSecondary} />
              </View>

              {prodPromo && (
                <>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Preço Promocional (R$) *</Text>
                  <TextInput style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.textPrimary }]} keyboardType="numeric" value={prodPrecoPromo} onChangeText={setProdPrecoPromo} placeholder="0.00" placeholderTextColor={themeColors.textSecondary} />
                </>
              )}

              <TouchableOpacity style={[styles.saveBtnFull, { backgroundColor: themeColors.success }]} onPress={saveProduct} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Salvar Produto</Text>}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 20, borderBottomWidth: 1, elevation: 2 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  actionBtnOutline: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 8, borderWidth: 1 },
  actionBtnTextOutline: { fontWeight: 'bold' },
  actionBtnSolid: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 8 },
  actionBtnTextSolid: { color: '#FFF', fontWeight: 'bold' },
  
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 10 },
  inputSmall: { borderWidth: 1, borderRadius: 8, padding: 10, fontSize: 13, marginTop: 10 },
  
  filterRow: { flexDirection: 'row' },
  catScroll: { paddingVertical: 5 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1 },
  filterChipText: { fontWeight: 'bold', fontSize: 13 },
  
  list: { padding: 15, paddingBottom: 40 },
  emptyText: { textAlign: 'center', marginTop: 20 },
  
  card: { padding: 12, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 1, borderWidth: 1 },
  imgContainer: { width: 70, height: 70, borderRadius: 8, overflow: 'hidden', marginRight: 12 },
  prodImg: { width: '100%', height: '100%' },
  imgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: 'bold' },
  cardCat: { fontSize: 12, marginTop: 2 },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  priceText: { fontSize: 14, fontWeight: 'bold' },
  promoText: { fontSize: 14, fontWeight: 'bold', marginLeft: 6 },
  badgesRow: { flexDirection: 'row', marginTop: 6, gap: 6 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 10, fontWeight: 'bold', overflow: 'hidden' },
  
  modalFullContainer: { flex: 1, width: '100%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalScroll: { padding: 20 },
  
  managerListScroll: { padding: 20, paddingBottom: 100 },
  managerListItem: { padding: 18, borderRadius: 12, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1 },
  managerListItemText: { fontSize: 16, fontWeight: 'bold' },
  managerListCount: { fontSize: 12, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  managerFooter: { position: 'absolute', bottom: 0, width: '100%', padding: 20, borderTopWidth: 1, flexDirection: 'row', alignItems: 'center', elevation: 10 },
  addBtnSquare: { width: 48, height: 48, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 6, marginTop: 10 },
  imgPicker: { width: '100%', height: 150, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderStyle: 'dashed', marginBottom: 10 },
  imgPreview: { width: '100%', height: '100%', borderRadius: 10 },
  imgPickerText: { marginTop: 8, fontWeight: 'bold' },
  catSelectScroll: { marginBottom: 10 },
  catSelectChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, marginRight: 8, borderWidth: 1 },
  catSelectChipText: { fontWeight: 'bold' },
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, marginTop: 5 },
  switchLabel: { fontSize: 14, fontWeight: 'bold' },
  
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
  saveBtnFull: { padding: 16, borderRadius: 10, alignItems: 'center', marginTop: 30, marginBottom: 50 },
});