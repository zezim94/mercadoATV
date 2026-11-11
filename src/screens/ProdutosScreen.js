import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import * as SQLite from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function ProdutosScreen({ navigation }) {
  const { themeColors } = useTheme();
  const [produtos, setProdutos] = useState([]);
  const [busca, setBusca] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProdutos = async () => {
    setLoading(true);
    try {
      const db = await SQLite.openDatabaseAsync('estoque.db');
      
      // JOIN para pegar o nome da Categoria e do Fornecedor
      const query = busca 
        ? `SELECT p.*, c.nome as categoria_nome, f.nome as fornecedor_nome 
           FROM produtos p 
           LEFT JOIN categorias c ON p.categoria_id = c.id 
           LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
           WHERE p.nome LIKE '%${busca}%'` 
        : `SELECT p.*, c.nome as categoria_nome, f.nome as fornecedor_nome 
           FROM produtos p 
           LEFT JOIN categorias c ON p.categoria_id = c.id 
           LEFT JOIN fornecedores f ON p.fornecedor_id = f.id
           ORDER BY p.nome ASC`;
           
      const result = await db.getAllAsync(query);
      setProdutos(result);
    } catch (error) {
      console.error("Erro ao buscar produtos", error);
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadProdutos(); }, [busca]));

  const renderProduct = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.card, 
        { backgroundColor: themeColors.card, borderColor: themeColors.border },
        item.quantidade <= item.estoque_minimo && { borderLeftWidth: 4, borderLeftColor: themeColors.danger }
      ]}
      onPress={() => navigation.navigate('CadastroProduto', { id: item.id })}
    >
      
      {/* Exibição da Imagem */}
      <View style={[styles.imgContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
        {item.imagem ? (
          <Image source={{ uri: item.imagem }} style={styles.prodImg} />
        ) : (
          <FontAwesome5 name="box-open" size={24} color={themeColors.textSecondary} />
        )}
      </View>

      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>Cód {item.id} - {item.nome}</Text>
        <Text style={[styles.cardCat, { color: themeColors.textSecondary }]}>
          {item.categoria_nome || 'Sem Categoria'}
        </Text>
        {item.fornecedor_nome && (
          <Text style={[styles.cardForn, { color: themeColors.textSecondary }]} numberOfLines={1}>
            Forn: {item.fornecedor_nome}
          </Text>
        )}
        
        <Text style={[styles.priceText, { color: themeColors.success }]}>
          R$ {item.preco.toFixed(2)}
        </Text>
      </View>

      <View style={styles.qtyContainer}>
        <Text style={[styles.qtyLabel, { color: themeColors.textSecondary }]}>Estoque</Text>
        <Text style={[
          styles.qtyNumber, 
          { color: themeColors.textPrimary },
          item.quantidade <= item.estoque_minimo && { color: themeColors.danger }
        ]}>
          {item.quantidade}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      <View style={[styles.searchSection, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        <View style={[styles.searchContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
          <FontAwesome5 name="search" size={16} color={themeColors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.textPrimary }]}
            placeholder="Buscar produto..."
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
          data={produtos}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProduct}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>Nenhum produto cadastrado.</Text>
          }
        />
      )}

      <TouchableOpacity 
        style={[styles.fab, { backgroundColor: themeColors.primary }]} 
        onPress={() => navigation.navigate('CadastroProduto')}
      >
        <FontAwesome5 name="plus" size={20} color="#FFF" />
      </TouchableOpacity>
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
  
  card: { padding: 15, borderRadius: 12, marginBottom: 12, flexDirection: 'row', alignItems: 'center', elevation: 1, borderWidth: 1 },
  
  imgContainer: { width: 60, height: 60, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 15, overflow: 'hidden' },
  prodImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  cardInfo: { flex: 1, paddingRight: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  cardCat: { fontSize: 13, marginTop: 2, fontWeight: '500' },
  cardForn: { fontSize: 11, marginTop: 2, fontStyle: 'italic' },
  priceText: { fontSize: 15, fontWeight: 'bold', marginTop: 6 },
  
  qtyContainer: { alignItems: 'center', justifyContent: 'center', paddingLeft: 10, borderLeftWidth: 1, borderLeftColor: '#333' },
  qtyLabel: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  qtyNumber: { fontSize: 22, fontWeight: 'bold' },

  fab: { position: 'absolute', bottom: 20, right: 20, width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', elevation: 5 }
});