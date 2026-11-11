import React, { useState, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, Modal, FlatList, KeyboardAvoidingView, Platform, ScrollView, Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getProdutosParaMovimentacao, registrarMovimentacao, getProdutoById } from '../config/database'; // Importando funções

export default function MovimentacoesScreen({ navigation }) {
  const { themeColors } = useTheme();

  // Estados do Formulário
  const [tipo, setTipo] = useState('ENTRADA'); 
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [quantidade, setQuantidade] = useState('');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);

  // Estados do Modal de Seleção de Produto
  const [modalVisible, setModalVisible] = useState(false);
  const [produtos, setProdutos] = useState([]);
  const [buscaProduto, setBuscaProduto] = useState('');

  // Estado para verificar teclado aberto e dar espaço extra
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      keyboardDidHideListener.remove();
      keyboardDidShowListener.remove();
    };
  }, []);

  const loadProdutos = async () => {
    try {
      const result = await getProdutosParaMovimentacao(buscaProduto);
      setProdutos(result);
    } catch (error) {
      console.error("Erro ao buscar produtos", error);
    }
  };

  useEffect(() => {
    if (modalVisible) {
      loadProdutos();
    }
  }, [modalVisible, buscaProduto]);

  const handleMovimentacao = async () => {
    if (!selectedProduct) {
      return Alert.alert('Atenção', 'Selecione um produto.');
    }
    const qtd = parseInt(quantidade);
    if (!qtd || qtd <= 0) {
      return Alert.alert('Atenção', 'Informe uma quantidade válida maior que zero.');
    }

    setSaving(true);
    try {
      // Re-busca a quantidade atual direto do banco por segurança
      const produtoNoBanco = await getProdutoById(selectedProduct.id);
      
      await registrarMovimentacao(selectedProduct.id, tipo, qtd, observacao, produtoNoBanco.quantidade);
      Alert.alert('Sucesso!', `Movimentação de ${tipo} registrada com sucesso.`);
      
      setSelectedProduct(null);
      setQuantidade('');
      setObservacao('');
      
    } catch (error) {
      Alert.alert('Erro', error.message || 'Ocorreu um erro ao registrar a movimentação.');
    }
    setSaving(false);
  };

  const renderProdutoModal = ({ item }) => (
    <TouchableOpacity 
      style={[styles.produtoItem, { backgroundColor: themeColors.background, borderBottomColor: themeColors.border }]}
      onPress={() => {
        setSelectedProduct(item);
        setModalVisible(false);
      }}
    >
      <View style={styles.produtoInfo}>
        <Text style={[styles.produtoNome, { color: themeColors.textPrimary }]}>{item.nome}</Text>
        <Text style={[styles.produtoEstoque, { color: themeColors.textSecondary }]}>
          Estoque atual: <Text style={{fontWeight: 'bold', color: item.quantidade === 0 ? themeColors.danger : themeColors.textPrimary}}>{item.quantidade}</Text> un
        </Text>
      </View>
      <FontAwesome5 name="chevron-right" size={14} color={themeColors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1, backgroundColor: themeColors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'} // undefined para Android gerenciar nativamente via scroll
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView 
        style={styles.container}
        // Dinamismo: Adiciona 120px de respiro no final da página quando o teclado abre
        contentContainerStyle={{ paddingBottom: isKeyboardVisible ? 120 : 40 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        
        <View style={styles.typeSelectorContainer}>
          <TouchableOpacity 
            style={[
              styles.typeButton, 
              { backgroundColor: themeColors.card, borderColor: themeColors.border },
              tipo === 'ENTRADA' && { backgroundColor: themeColors.success + '20', borderColor: themeColors.success }
            ]} 
            onPress={() => setTipo('ENTRADA')}
          >
            <FontAwesome5 name="arrow-down" size={18} color={tipo === 'ENTRADA' ? themeColors.success : themeColors.textSecondary} />
            <Text style={[styles.typeButtonText, { color: tipo === 'ENTRADA' ? themeColors.success : themeColors.textSecondary }]}>ENTRADA</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[
              styles.typeButton, 
              { backgroundColor: themeColors.card, borderColor: themeColors.border },
              tipo === 'SAIDA' && { backgroundColor: themeColors.danger + '20', borderColor: themeColors.danger }
            ]} 
            onPress={() => setTipo('SAIDA')}
          >
            <FontAwesome5 name="arrow-up" size={18} color={tipo === 'SAIDA' ? themeColors.danger : themeColors.textSecondary} />
            <Text style={[styles.typeButtonText, { color: tipo === 'SAIDA' ? themeColors.danger : themeColors.textSecondary }]}>SAÍDA</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          
          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Produto Selecionado *</Text>
          <TouchableOpacity 
            style={[styles.selectProdutoBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
            onPress={() => setModalVisible(true)}
          >
            {selectedProduct ? (
              <View>
                <Text style={[styles.selectedProdutoNome, { color: themeColors.textPrimary }]}>{selectedProduct.nome}</Text>
                <Text style={[styles.selectedProdutoEstoque, { color: themeColors.textSecondary }]}>Estoque atual: {selectedProduct.quantidade}</Text>
              </View>
            ) : (
              <Text style={{ color: themeColors.textSecondary, fontSize: 16 }}>Toque para selecionar um produto...</Text>
            )}
            <FontAwesome5 name="search" size={18} color={themeColors.textSecondary} />
          </TouchableOpacity>

          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Quantidade *</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.border }]} 
            value={quantidade} 
            onChangeText={setQuantidade} 
            keyboardType="numeric" 
            placeholder="Ex: 10" 
            placeholderTextColor={themeColors.textSecondary} 
          />

          <Text style={[styles.label, { color: themeColors.textSecondary }]}>Observação (Opcional)</Text>
          <TextInput 
            style={[styles.input, { backgroundColor: themeColors.background, color: themeColors.textPrimary, borderColor: themeColors.border, height: 80, textAlignVertical: 'top' }]} 
            value={observacao} 
            onChangeText={setObservacao} 
            multiline
            placeholder={tipo === 'ENTRADA' ? "Lote, Nota Fiscal, etc." : "Motivo da saída, cliente, perda, etc."} 
            placeholderTextColor={themeColors.textSecondary} 
          />

        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, { backgroundColor: tipo === 'ENTRADA' ? themeColors.success : themeColors.danger }]} 
          onPress={handleMovimentacao} 
          disabled={saving}
        >
          {saving ? <ActivityIndicator color="#FFF" /> : (
            <>
              <FontAwesome5 name={tipo === 'ENTRADA' ? "box-open" : "dolly"} size={18} color="#FFF" style={{ marginRight: 10 }} />
              <Text style={styles.saveBtnText}>Confirmar {tipo}</Text>
            </>
          )}
        </TouchableOpacity>

      </ScrollView>

      {/* MODAL DE SELEÇÃO DE PRODUTO */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <SafeAreaView style={styles.modalOverlay}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
            <View style={[styles.modalContainer, { backgroundColor: themeColors.card }]}>
              
              <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
                <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Selecionar Produto</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}>
                  <FontAwesome5 name="times" size={24} color={themeColors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={{ padding: 15 }}>
                <View style={[styles.searchContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                  <FontAwesome5 name="search" size={16} color={themeColors.textSecondary} style={{ marginRight: 10 }} />
                  <TextInput
                    style={[styles.searchInput, { color: themeColors.textPrimary }]}
                    placeholder="Buscar pelo nome..."
                    placeholderTextColor={themeColors.textSecondary}
                    value={buscaProduto}
                    onChangeText={setBuscaProduto}
                  />
                </View>
              </View>

              <FlatList
                data={produtos}
                keyExtractor={(item) => item.id.toString()}
                renderItem={renderProdutoModal}
                contentContainerStyle={{ paddingHorizontal: 15, paddingBottom: 20 }}
                ListEmptyComponent={
                  <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                    Nenhum produto encontrado.
                  </Text>
                }
              />
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  
  typeSelectorContainer: { flexDirection: 'row', gap: 15, marginBottom: 25 },
  typeButton: { flex: 1, flexDirection: 'row', paddingVertical: 18, justifyContent: 'center', alignItems: 'center', borderRadius: 12, borderWidth: 2 },
  typeButtonText: { fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  
  card: { padding: 20, borderRadius: 12, borderWidth: 1, elevation: 2, marginBottom: 25 },
  label: { marginBottom: 8, fontSize: 14, fontWeight: 'bold' },
  
  selectProdutoBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 15, borderRadius: 8, borderWidth: 1, marginBottom: 20 },
  selectedProdutoNome: { fontSize: 16, fontWeight: 'bold' },
  selectedProdutoEstoque: { fontSize: 13, marginTop: 2 },
  
  input: { borderWidth: 1, padding: 15, borderRadius: 8, marginBottom: 20, fontSize: 16 },
  
  saveBtn: { flexDirection: 'row', padding: 18, borderRadius: 12, alignItems: 'center', justifyContent: 'center', elevation: 3, marginBottom: 40 },
  saveBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { borderTopLeftRadius: 20, borderTopRightRadius: 20, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 12, borderWidth: 1 },
  searchInput: { flex: 1, height: 45, fontSize: 16 },
  
  produtoItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1 },
  produtoInfo: { flex: 1 },
  produtoNome: { fontSize: 16, fontWeight: 'bold' },
  produtoEstoque: { fontSize: 13, marginTop: 4 },
  
  emptyText: { textAlign: 'center', marginTop: 20, fontSize: 15 }
});