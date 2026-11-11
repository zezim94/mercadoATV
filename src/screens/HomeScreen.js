import React, { useState, useCallback } from 'react';
import { 
  View, Text, StyleSheet, SectionList, Image, TouchableOpacity, ActivityIndicator 
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import * as SQLite from 'expo-sqlite';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen({ navigation }) {
  const { themeColors } = useTheme();
  const [groupedProducts, setGroupedProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Carrega os produtos e agrupa por fornecedor toda vez que a tela ganha foco
  const loadEstoque = async () => {
    setLoading(true);
    try {
      const db = await SQLite.openDatabaseAsync('estoque.db');
      
      const query = `
        SELECT p.*, f.nome as fornecedor_nome 
        FROM produtos p 
        LEFT JOIN fornecedores f ON p.fornecedor_id = f.id 
        ORDER BY f.nome ASC, p.nome ASC
      `;
      const result = await db.getAllAsync(query);

      // Lógica para agrupar os produtos pelo nome do fornecedor
      const groups = {};
      result.forEach(prod => {
        const fornName = prod.fornecedor_nome || 'Sem Fornecedor Vinculado';
        if (!groups[fornName]) {
          groups[fornName] = [];
        }
        groups[fornName].push(prod);
      });

      // Converter o objeto em um Array no formato exigido pelo <SectionList>
      const sections = Object.keys(groups).sort((a, b) => {
        // Coloca "Sem Fornecedor Vinculado" sempre no final da lista
        if (a === 'Sem Fornecedor Vinculado') return 1;
        if (b === 'Sem Fornecedor Vinculado') return -1;
        return a.localeCompare(b);
      }).map(key => ({
        title: key,
        data: groups[key]
      }));

      setGroupedProducts(sections);
    } catch (error) {
      console.error("Erro ao carregar estoque por fornecedor", error);
    }
    setLoading(false);
  };

  useFocusEffect(useCallback(() => { loadEstoque(); }, []));

  const renderProduct = ({ item }) => (
    <TouchableOpacity 
      style={[
        styles.card, 
        { backgroundColor: themeColors.card, borderColor: themeColors.border },
        item.quantidade <= item.estoque_minimo && { borderLeftWidth: 4, borderLeftColor: themeColors.danger }
      ]}
      onPress={() => navigation.navigate('CadastroProduto', { id: item.id })}
    >
      <View style={[styles.imgContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
        {item.imagem ? (
          <Image source={{ uri: item.imagem }} style={styles.prodImg} />
        ) : (
          <FontAwesome5 name="box-open" size={20} color={themeColors.textSecondary} />
        )}
      </View>

      <View style={styles.cardInfo}>
        <Text style={[styles.cardTitle, { color: themeColors.textPrimary }]} numberOfLines={1}>{item.nome}</Text>
        <Text style={[styles.priceText, { color: themeColors.success }]}>R$ {item.preco.toFixed(2)}</Text>
      </View>

      <View style={styles.qtyContainer}>
        <Text style={[styles.qtyLabel, { color: themeColors.textSecondary }]}>Qtd</Text>
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

  const renderSectionHeader = ({ section: { title } }) => (
    <View style={[styles.sectionHeader, { backgroundColor: themeColors.background }]}>
      <FontAwesome5 name={title === 'Sem Fornecedor Vinculado' ? 'question-circle' : 'truck'} size={14} color={themeColors.primary} style={{ marginRight: 8 }} />
      <Text style={[styles.sectionHeaderText, { color: themeColors.primary }]}>{title}</Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background }]}>
      
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        <FontAwesome5 name="boxes" size={28} color={themeColors.primary} />
        <View style={{ marginLeft: 15 }}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Visão Geral do Estoque</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>Produtos agrupados por fornecedor</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : (
        <SectionList
          sections={groupedProducts}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderProduct}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContainer}
          stickySectionHeadersEnabled={false}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
              Nenhum produto cadastrado no estoque.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, elevation: 2 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { fontSize: 13, marginTop: 2 },

  listContainer: { padding: 15, paddingBottom: 40 },
  emptyText: { textAlign: 'center', marginTop: 30, fontSize: 15, fontStyle: 'italic' },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginTop: 15, marginBottom: 10, paddingVertical: 5 },
  sectionHeaderText: { fontSize: 16, fontWeight: 'bold', textTransform: 'uppercase' },

  card: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 10, borderWidth: 1, elevation: 1 },
  
  imgContainer: { width: 50, height: 50, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 12, overflow: 'hidden' },
  prodImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  cardInfo: { flex: 1, paddingRight: 10 },
  cardTitle: { fontSize: 15, fontWeight: 'bold' },
  priceText: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  
  qtyContainer: { alignItems: 'center', justifyContent: 'center', paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: '#333' },
  qtyLabel: { fontSize: 10, fontWeight: 'bold', textTransform: 'uppercase' },
  qtyNumber: { fontSize: 20, fontWeight: 'bold' }
});