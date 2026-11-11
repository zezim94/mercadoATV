import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform, Image, Modal, Keyboard
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { 
  getProdutoById, insertProduto, updateProduto, deleteProduto, 
  getCategorias, insertCategoria, getFornecedores 
} from '../config/database'; 

export default function CadastroProdutoScreen({ route, navigation }) {
  const { themeColors } = useTheme();
  const { id } = route.params || {}; 
  
  const [form, setForm] = useState({ 
    nome: '', categoria_id: null, preco: '', quantidade: '0', estoque_minimo: '5', fornecedor_id: null, imagem: null 
  });
  
  const [categorias, setCategorias] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [modalCatVisible, setModalCatVisible] = useState(false);
  const [novaCategoria, setNovaCategoria] = useState('');

  // Estado para detectar se o teclado está aberto (para adicionar espaço extra no final)
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  useEffect(() => {
    loadDependencies();
    if (id) loadProduto();
  }, [id]);

  const loadDependencies = async () => {
    try {
      const cats = await getCategorias();
      const forns = await getFornecedores(''); 
      setCategorias(cats || []); 
      setFornecedores(forns || []);
    } catch (error) {
      console.error("Erro ao carregar dependências: ", error);
      Alert.alert('Erro', 'Não foi possível carregar categorias e fornecedores.');
    }
  };

  const loadProduto = async () => {
    setLoading(true);
    try {
      const result = await getProdutoById(id);
      if (result) {
        setForm({
          nome: result.nome,
          categoria_id: result.categoria_id,
          preco: result.preco.toString(),
          quantidade: result.quantidade.toString(),
          estoque_minimo: result.estoque_minimo.toString(),
          fornecedor_id: result.fornecedor_id,
          imagem: result.imagem
        });
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível carregar o produto.');
    }
    setLoading(false);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], 
      quality: 0.7,
    });

    if (!result.canceled) {
      setForm({ ...form, imagem: result.assets[0].uri });
    }
  };

  const handleSalvarCategoria = async () => {
    if (!novaCategoria.trim()) return Alert.alert('Atenção', 'Digite um nome.');
    try {
      const result = await insertCategoria(novaCategoria);
      setForm({ ...form, categoria_id: result.lastInsertRowId });
      setNovaCategoria('');
      setModalCatVisible(false);
      loadDependencies(); 
    } catch (error) {
      Alert.alert('Erro', 'Categoria já existe ou erro no banco.');
    }
  };

  const handleSave = async () => {
    if (!form.nome || !form.categoria_id || !form.preco) {
      return Alert.alert('Atenção', 'Preencha o nome, categoria e preço!');
    }

    setSaving(true);
    try {
      const payload = {
        nome: form.nome,
        categoria_id: form.categoria_id,
        preco: parseFloat(form.preco.replace(',', '.')),
        quantidade: parseInt(form.quantidade) || 0,
        estoque_minimo: parseInt(form.estoque_minimo) || 0,
        fornecedor_id: form.fornecedor_id,
        imagem: form.imagem
      };

      if (id) {
        await updateProduto(id, payload);
        Alert.alert('Sucesso', 'Produto atualizado!');
      } else {
        await insertProduto(payload);
        Alert.alert('Sucesso', 'Produto cadastrado!');
      }
      navigation.goBack();
    } catch (error) {
      console.error(error);
      Alert.alert('Erro', 'Falha ao salvar produto.');
    }
    setSaving(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Apagar Produto',
      'Tem certeza que deseja apagar este produto? O histórico de movimentações dele também será removido.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Apagar', 
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await deleteProduto(id);
              Alert.alert('Sucesso', 'Produto apagado.');
              navigation.goBack();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível apagar.');
            }
            setSaving(false);
          }
        }
      ]
    );
  };

  if (loading) {
    return <View style={[styles.center, { backgroundColor: themeColors.background }]}><ActivityIndicator size="large" color={themeColors.primary} /></View>;
  }

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: themeColors.background }} 
      // No Android o layout padrão lida melhor, no iOS exige padding
      behavior={Platform.OS === 'ios' ? 'padding' : "height"}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0} 
    >
      <ScrollView 
        style={styles.container}
        // Adiciona um padding absurdo dinâmico no final quando o teclado subir, garantindo o scroll até o último botão
        contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 150 : 40 }} 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          
          <TouchableOpacity style={[styles.imgPicker, { backgroundColor: themeColors.background, borderColor: themeColors.border }]} onPress={pickImage}>
            {form.imagem ? (
              <Image source={{ uri: form.imagem }} style={styles.imgPreview} resizeMode="contain" />
            ) : (
              <>
                <FontAwesome5 name="camera" size={30} color={themeColors.textSecondary} />
                <Text style={[styles.imgPickerText, { color: themeColors.textSecondary }]}>Adicionar Imagem</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Nome do Produto *</Text>
          <TextInput style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]} value={form.nome} onChangeText={(t) => setForm({...form, nome: t})} placeholderTextColor={themeColors.textSecondary} />

          <View style={styles.rowBetween}>
            <Text style={[styles.label, { color: themeColors.textSecondary }]}>Categoria *</Text>
            <TouchableOpacity onPress={() => setModalCatVisible(true)}>
              <Text style={{ color: themeColors.primary, fontWeight: 'bold' }}>+ Nova Categoria</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {categorias.length === 0 && <Text style={{ color: themeColors.textSecondary, fontStyle: 'italic' }}>Nenhuma categoria.</Text>}
            {categorias.map(cat => (
              <TouchableOpacity 
                key={cat.id}
                style={[styles.chip, { backgroundColor: themeColors.background, borderColor: themeColors.border }, form.categoria_id === cat.id && { backgroundColor: themeColors.primary + '20', borderColor: themeColors.primary }]}
                onPress={() => setForm({...form, categoria_id: cat.id})}
              >
                <Text style={[styles.chipText, { color: themeColors.textSecondary }, form.categoria_id === cat.id && { color: themeColors.primary }]}>{cat.nome}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <Text style={[styles.label, { color: themeColors.textSecondary, marginTop: 10 }]}>Fornecedor</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            <TouchableOpacity 
              style={[styles.chip, { backgroundColor: themeColors.background, borderColor: themeColors.border }, form.fornecedor_id === null && { backgroundColor: themeColors.primary + '20', borderColor: themeColors.primary }]}
              onPress={() => setForm({...form, fornecedor_id: null})}
            >
              <Text style={[styles.chipText, { color: themeColors.textSecondary }, form.fornecedor_id === null && { color: themeColors.primary }]}>Nenhum</Text>
            </TouchableOpacity>
            {fornecedores.map(forn => (
              <TouchableOpacity 
                key={forn.id}
                style={[styles.chip, { backgroundColor: themeColors.background, borderColor: themeColors.border }, form.fornecedor_id === forn.id && { backgroundColor: themeColors.primary + '20', borderColor: themeColors.primary }]}
                onPress={() => setForm({...form, fornecedor_id: forn.id})}
              >
                <Text style={[styles.chipText, { color: themeColors.textSecondary }, form.fornecedor_id === forn.id && { color: themeColors.primary }]}>{forn.nome}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Preço (R$) *</Text>
              <TextInput style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]} value={form.preco} onChangeText={(t) => setForm({...form, preco: t})} keyboardType="numeric" placeholder="0.00" placeholderTextColor={themeColors.textSecondary} />
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={styles.col}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Qtd Atual</Text>
              <TextInput style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]} value={form.quantidade} onChangeText={(t) => setForm({...form, quantidade: t})} keyboardType="numeric" placeholderTextColor={themeColors.textSecondary} />
            </View>
            <View style={styles.col}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Estoque Min</Text>
              <TextInput style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]} value={form.estoque_minimo} onChangeText={(t) => setForm({...form, estoque_minimo: t})} keyboardType="numeric" placeholderTextColor={themeColors.textSecondary} />
            </View>
          </View>

          <View style={styles.actionButtonsRow}>
            {id && (
              <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: themeColors.danger + '20', borderColor: themeColors.danger }]} onPress={handleDelete} disabled={saving}>
                <FontAwesome5 name="trash" size={18} color={themeColors.danger} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.button, { flex: 1, backgroundColor: themeColors.primary }]} onPress={handleSave} disabled={saving}>
              {saving ? <ActivityIndicator color="#FFF" /> : <><FontAwesome5 name="save" size={18} color="#FFF" style={{ marginRight: 10 }} /><Text style={styles.buttonText}>{id ? 'Atualizar' : 'Salvar'}</Text></>}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* MODAL NOVA CATEGORIA */}
      <Modal visible={modalCatVisible} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Nova Categoria</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.textPrimary }]} 
              placeholder="Ex: Bebidas" 
              placeholderTextColor={themeColors.textSecondary}
              value={novaCategoria}
              onChangeText={setNovaCategoria}
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: themeColors.border }]} onPress={() => setModalCatVisible(false)}>
                <Text style={{ color: themeColors.textPrimary, fontWeight: 'bold' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: themeColors.primary }]} onPress={handleSalvarCategoria}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { padding: 20, borderRadius: 12, borderWidth: 1, elevation: 2, marginBottom: 10 }, 
  
  imgPicker: { width: 120, height: 120, borderRadius: 12, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 20, borderWidth: 2, borderStyle: 'dashed' },
  imgPreview: { width: '100%', height: '100%', borderRadius: 10 },
  imgPickerText: { marginTop: 8, fontSize: 12, fontWeight: 'bold' },

  label: { marginBottom: 6, fontSize: 14, fontWeight: 'bold' },
  input: { borderWidth: 1, padding: 12, borderRadius: 8, marginBottom: 16, fontSize: 16 },
  row: { flexDirection: 'row', gap: 15 },
  col: { flex: 1 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  
  horizontalScroll: { marginBottom: 15, paddingBottom: 5 },
  chip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, borderWidth: 1, marginRight: 10 },
  chipText: { fontSize: 13, fontWeight: 'bold' },

  actionButtonsRow: { flexDirection: 'row', gap: 15, marginTop: 10 },
  deleteBtn: { padding: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, width: 60 },
  button: { flexDirection: 'row', padding: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { padding: 25, borderRadius: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  modalBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 }
});