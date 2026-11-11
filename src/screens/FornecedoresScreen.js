import React, { useState, useCallback } from 'react';
import { 
  View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, 
  Modal, Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getFornecedores, insertFornecedor, updateFornecedor, deleteFornecedor } from '../config/database'; // Importando funções do banco

// Funções de Máscara Simples
const maskPhone = (value) => {
  let v = value.replace(/\D/g, "");
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 10) return v.replace(/^(\d{2})(\d{5})(\d{4}).*/, "($1) $2-$3");
  if (v.length > 5) return v.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, "($1) $2-$3");
  if (v.length > 2) return v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  return v;
};

const maskCNPJ = (value) => {
  let v = value.replace(/\D/g, "");
  if (v.length > 14) v = v.slice(0, 14);
  if (v.length > 12) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2}).*/, "$1.$2.$3/$4-$5");
  if (v.length > 8) return v.replace(/^(\d{2})(\d{3})(\d{3})(\d{0,4}).*/, "$1.$2.$3/$4");
  if (v.length > 5) return v.replace(/^(\d{2})(\d{3})(\d{0,3}).*/, "$1.$2.$3");
  if (v.length > 2) return v.replace(/^(\d{2})(\d{0,3}).*/, "$1.$2");
  return v;
};

const maskCEP = (value) => {
  let v = value.replace(/\D/g, "");
  if (v.length > 8) v = v.slice(0, 8);
  if (v.length > 5) return v.replace(/^(\d{5})(\d{0,3}).*/, "$1-$2");
  return v;
};

export default function FornecedoresScreen() {
  const { themeColors } = useTheme();
  
  const [fornecedores, setFornecedores] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados do Modal e Formulário
  const [modalVisible, setModalVisible] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    nome: '', cnpj: '', cep: '', endereco: '', numero: '', 
    bairro: '', cidade: '', estado: '', telefone: '', email: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getFornecedores(busca);
      setFornecedores(result);
    } catch (error) {
      console.error("Erro ao buscar fornecedores", error);
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadData(); }, [busca]));

  const openModal = (fornecedor = null) => {
    if (fornecedor) {
      setEditingId(fornecedor.id);
      setForm({
        nome: fornecedor.nome,
        cnpj: fornecedor.cnpj || '',
        cep: fornecedor.cep || '',
        endereco: fornecedor.endereco || '',
        numero: fornecedor.numero || '',
        bairro: fornecedor.bairro || '',
        cidade: fornecedor.cidade || '',
        estado: fornecedor.estado || '',
        telefone: fornecedor.telefone || '',
        email: fornecedor.email || ''
      });
    } else {
      setEditingId(null);
      setForm({ nome: '', cnpj: '', cep: '', endereco: '', numero: '', bairro: '', cidade: '', estado: '', telefone: '', email: '' });
    }
    setModalVisible(true);
  };

  const handleCepChange = async (value) => {
    const masked = maskCEP(value);
    setForm(prev => ({ ...prev, cep: masked }));

    const rawCep = masked.replace(/\D/g, '');
    if (rawCep.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${rawCep}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setForm(prev => ({
            ...prev,
            endereco: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || ''
          }));
        }
      } catch (error) {
        console.log("Erro ao buscar CEP", error);
      }
    }
  };

  const handleSave = async () => {
    if (!form.nome) return Alert.alert('Erro', 'O nome do fornecedor é obrigatório!');

    setSaving(true);
    try {
      if (editingId) {
        await updateFornecedor(editingId, form);
        Alert.alert('Sucesso', 'Fornecedor atualizado!');
      } else {
        await insertFornecedor(form);
        Alert.alert('Sucesso', 'Fornecedor cadastrado!');
      }
      
      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível salvar o fornecedor.');
    }
    setSaving(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Apagar Fornecedor',
      'Tem certeza que deseja apagar este fornecedor? TODOS os produtos vinculados a ele e as movimentações também serão removidos!',
      [
        { text: 'Cancelar', style: 'cancel' },
        { 
          text: 'Apagar', 
          style: 'destructive',
          onPress: async () => {
            setSaving(true);
            try {
              await deleteFornecedor(editingId);
              Alert.alert('Sucesso', 'Fornecedor removido com sucesso.');
              setModalVisible(false);
              loadData();
            } catch (error) {
              Alert.alert('Erro', 'Não foi possível apagar.');
            }
            setSaving(false);
          }
        }
      ]
    );
  };

  const renderFornecedor = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
      onPress={() => openModal(item)}
    >
      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]}>{item.nome}</Text>
        
        <View style={styles.infoRow}>
          <FontAwesome5 name="id-card" size={12} color={themeColors.textSecondary} />
          <Text style={[styles.cardText, { color: themeColors.textSecondary }]}> CNPJ: {item.cnpj || 'Não informado'}</Text>
        </View>

        <View style={styles.infoRow}>
          <FontAwesome5 name="phone" size={12} color={themeColors.textSecondary} />
          <Text style={[styles.cardText, { color: themeColors.textSecondary }]}> Tel: {item.telefone || 'Não informado'}</Text>
        </View>
        
        {item.cidade && item.estado && (
          <View style={styles.infoRow}>
            <FontAwesome5 name="map-marker-alt" size={12} color={themeColors.textSecondary} />
            <Text style={[styles.cardText, { color: themeColors.textSecondary }]}> {item.cidade} - {item.estado}</Text>
          </View>
        )}
      </View>
      <FontAwesome5 name="edit" size={20} color={themeColors.textSecondary} style={{ padding: 10 }} />
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      
      <View style={[styles.searchSection, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
          <FontAwesome5 name="search" size={16} color={themeColors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.textPrimary }]}
            placeholder="Buscar por nome ou CNPJ..."
            placeholderTextColor={themeColors.textSecondary}
            value={busca}
            onChangeText={setBusca}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={themeColors.primary} /></View>
      ) : (
        <FlatList
          data={fornecedores}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderFornecedor}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>Nenhum fornecedor cadastrado.</Text>}
        />
      )}

      <TouchableOpacity style={[styles.fab, { backgroundColor: themeColors.primary }]} onPress={() => openModal()}>
        <FontAwesome5 name="plus" size={20} color="#FFF" />
      </TouchableOpacity>

      {/* Modal de Cadastro/Edição */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <SafeAreaView style={[styles.modalBg, { backgroundColor: themeColors.background }]}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            
            <View style={[styles.modalHeader, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>{editingId ? 'Editar Fornecedor' : 'Novo Fornecedor'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <FontAwesome5 name="times" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll}>
              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Nome Fantasia / Razão Social *</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.textPrimary }]} 
                value={form.nome} onChangeText={(t) => setForm({...form, nome: t})} placeholderTextColor={themeColors.textSecondary} 
              />

              <View style={styles.row}>
                <View style={styles.col}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>CNPJ</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.textPrimary }]} 
                    value={form.cnpj} onChangeText={(t) => setForm({...form, cnpj: maskCNPJ(t)})} 
                    keyboardType="numeric" maxLength={18} placeholderTextColor={themeColors.textSecondary} 
                  />
                </View>
                <View style={styles.col}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Telefone</Text>
                  <TextInput 
                    style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.textPrimary }]} 
                    value={form.telefone} onChangeText={(t) => setForm({...form, telefone: maskPhone(t)})} 
                    keyboardType="phone-pad" maxLength={15} placeholderTextColor={themeColors.textSecondary} 
                  />
                </View>
              </View>

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>E-mail</Text>
              <TextInput style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.textPrimary }]} value={form.email} onChangeText={(t) => setForm({...form, email: t})} keyboardType="email-address" autoCapitalize="none" placeholderTextColor={themeColors.textSecondary} />

              <View style={[styles.divider, { borderBottomColor: themeColors.border }]} />
              <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Endereço</Text>

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>CEP</Text>
              <TextInput 
                style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.textPrimary, width: '50%' }]} 
                value={form.cep} onChangeText={handleCepChange} keyboardType="numeric" maxLength={9} placeholderTextColor={themeColors.textSecondary} 
              />

              <View style={styles.row}>
                <View style={[styles.col, { flex: 2 }]}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Rua/Avenida</Text>
                  <TextInput style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.textPrimary }]} value={form.endereco} onChangeText={(t) => setForm({...form, endereco: t})} placeholderTextColor={themeColors.textSecondary} />
                </View>
                <View style={[styles.col, { flex: 1 }]}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Número</Text>
                  <TextInput style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.textPrimary }]} value={form.numero} onChangeText={(t) => setForm({...form, numero: t})} placeholderTextColor={themeColors.textSecondary} />
                </View>
              </View>

              <Text style={[styles.label, { color: themeColors.textSecondary }]}>Bairro</Text>
              <TextInput style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.textPrimary }]} value={form.bairro} onChangeText={(t) => setForm({...form, bairro: t})} placeholderTextColor={themeColors.textSecondary} />

              <View style={styles.row}>
                <View style={[styles.col, { flex: 2 }]}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Cidade</Text>
                  <TextInput style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.textPrimary }]} value={form.cidade} onChangeText={(t) => setForm({...form, cidade: t})} placeholderTextColor={themeColors.textSecondary} />
                </View>
                <View style={[styles.col, { flex: 1 }]}>
                  <Text style={[styles.label, { color: themeColors.textSecondary }]}>Estado (UF)</Text>
                  <TextInput style={[styles.input, { backgroundColor: themeColors.card, borderColor: themeColors.border, color: themeColors.textPrimary }]} value={form.estado} onChangeText={(t) => setForm({...form, estado: t})} maxLength={2} autoCapitalize="characters" placeholder="SP" placeholderTextColor={themeColors.textSecondary} />
                </View>
              </View>

              <View style={styles.actionButtonsRow}>
                {editingId && (
                  <TouchableOpacity style={[styles.deleteBtn, { backgroundColor: themeColors.danger + '20', borderColor: themeColors.danger }]} onPress={handleDelete} disabled={saving}>
                    <FontAwesome5 name="trash" size={18} color={themeColors.danger} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={[styles.saveBtn, { flex: 1, backgroundColor: themeColors.success }]} onPress={handleSave} disabled={saving}>
                  {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>{editingId ? 'Atualizar Fornecedor' : 'Salvar Fornecedor'}</Text>}
                </TouchableOpacity>
              </View>
              
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
  searchSection: { padding: 15, borderBottomWidth: 1, elevation: 2 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 45, fontSize: 16 },
  list: { padding: 15, paddingBottom: 80 },
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 16 },
  
  card: { padding: 18, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 1, borderWidth: 1, borderLeftWidth: 5, borderLeftColor: '#F2A900' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  cardText: { fontSize: 13 },
  fab: { position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 5 },

  modalBg: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalScroll: { padding: 20, paddingBottom: 50 },
  label: { fontSize: 13, fontWeight: 'bold', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderRadius: 8, padding: 12, fontSize: 14, marginBottom: 5 },
  row: { flexDirection: 'row', gap: 10 },
  col: { flex: 1 },
  divider: { borderBottomWidth: 1, marginVertical: 15 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 5 },
  
  actionButtonsRow: { flexDirection: 'row', gap: 15, marginTop: 20, marginBottom: 20 },
  deleteBtn: { padding: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, width: 60 },
  saveBtn: { padding: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});