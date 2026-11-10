import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Modal, FlatList, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function AdminScreen() {
  const { themeColors } = useTheme(); 
  const [statsToday, setStatsToday] = useState({ sales: 0, orders: 0, deliveries: 0, pickups: 0 });
  const [outOfStock, setOutOfStock] = useState(0);
  const [outOfStockProducts, setOutOfStockProducts] = useState([]); // Lista de produtos esgotados
  const [outOfStockModalVisible, setOutOfStockModalVisible] = useState(false); // Controle do modal
  const [chartHistory, setChartHistory] = useState([]);
  const [maxChartValue, setMaxChartValue] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const past7Days = [...Array(7)].map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      d.setHours(0, 0, 0, 0);
      const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      return { date: d, label: diasSemana[d.getDay()], delivery: 0, pickup: 0, total: 0 };
    });

    const unsubscribeOrders = onSnapshot(collection(db, 'orders'), (snap) => {
      let todaySales = 0;
      let todayOrders = 0;
      let todayDeliveries = 0;
      let todayPickups = 0;
      let maxTotalHist = 0;

      const historyData = past7Days.map(day => ({ ...day, delivery: 0, pickup: 0, total: 0 }));

      snap.forEach(doc => {
        const data = doc.data();
        if (!data.createdAt || data.status === 'cancelado') return;

        const orderDate = new Date(data.createdAt);
        const orderDateMidnight = new Date(orderDate);
        orderDateMidnight.setHours(0, 0, 0, 0);

        if (orderDateMidnight.getTime() === today.getTime()) {
          todaySales += (data.total || 0);
          todayOrders++;
          if (data.method === 'delivery') todayDeliveries++;
          if (data.method === 'pickup') todayPickups++;
        }

        const dayIndex = historyData.findIndex(d => d.date.getTime() === orderDateMidnight.getTime());
        if (dayIndex !== -1) {
          historyData[dayIndex].total += (data.total || 0);
          if (data.method === 'delivery') historyData[dayIndex].delivery += (data.total || 0);
          if (data.method === 'pickup') historyData[dayIndex].pickup += (data.total || 0);
          
          if (historyData[dayIndex].total > maxTotalHist) {
            maxTotalHist = historyData[dayIndex].total;
          }
        }
      });

      setStatsToday({ sales: todaySales, orders: todayOrders, deliveries: todayDeliveries, pickups: todayPickups });
      setChartHistory(historyData);
      setMaxChartValue(maxTotalHist > 0 ? maxTotalHist : 1);
    });

    const unsubscribeProducts = onSnapshot(collection(db, 'products'), (snap) => {
      let outCount = 0;
      let outList = [];
      snap.forEach(doc => {
        const data = doc.data();
        if (data.estoque <= 0) {
          outCount++;
          outList.push({ id: doc.id, ...data });
        }
      });
      setOutOfStock(outCount);
      setOutOfStockProducts(outList);
      setLoading(false);
    });

    return () => {
      unsubscribeOrders();
      unsubscribeProducts();
    };
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>Resumo do Dia</Text>
          <Text style={[styles.subTitle, { color: themeColors.textSecondary }]}>Acompanhe o desempenho do mercado hoje</Text>
        </View>

        {/* CARDS LADO A LADO */}
        <View style={styles.statsGrid}>
          <View style={[styles.card, styles.cardFull, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderLeftColor: themeColors.success }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: themeColors.textSecondary }]}>Vendas Hoje</Text>
              <FontAwesome name="money" size={16} color={themeColors.success} />
            </View>
            <Text style={[styles.cardValue, { color: themeColors.textPrimary }]}>R$ {statsToday.sales.toFixed(2)}</Text>
          </View>

          <View style={[styles.card, styles.cardHalf, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderLeftColor: '#8B5CF6' }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: themeColors.textSecondary }]}>Pedidos</Text>
              <FontAwesome name="shopping-bag" size={14} color="#8B5CF6" />
            </View>
            <Text style={[styles.cardValue, { color: themeColors.textPrimary }]}>{statsToday.orders}</Text>
          </View>

          {/* Card Esgotados agora é clicável */}
          <TouchableOpacity 
            style={[styles.card, styles.cardHalf, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderLeftColor: themeColors.danger }]}
            onPress={() => setOutOfStockModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: themeColors.textSecondary }]}>Esgotados</Text>
              <FontAwesome name="warning" size={14} color={themeColors.danger} />
            </View>
            <Text style={[styles.cardValue, { color: themeColors.textPrimary }]}>{outOfStock}</Text>
            <Text style={{ fontSize: 10, color: themeColors.danger, marginTop: 4 }}>Ver produtos &rarr;</Text>
          </TouchableOpacity>

          <View style={[styles.card, styles.cardHalf, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderLeftColor: '#3B82F6' }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: themeColors.textSecondary }]}>Entregas</Text>
              <FontAwesome name="motorcycle" size={14} color="#3B82F6" />
            </View>
            <Text style={[styles.cardValue, { color: themeColors.textPrimary }]}>{statsToday.deliveries}</Text>
          </View>

          <View style={[styles.card, styles.cardHalf, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderLeftColor: themeColors.warning }]}>
            <View style={styles.cardHeaderRow}>
              <Text style={[styles.cardTitle, { color: themeColors.textSecondary }]}>Retiradas</Text>
              <FontAwesome name="building" size={14} color={themeColors.warning} />
            </View>
            <Text style={[styles.cardValue, { color: themeColors.textPrimary }]}>{statsToday.pickups}</Text>
          </View>
        </View>

        {/* GRÁFICO DE EVOLUÇÃO */}
        <View style={styles.chartSection}>
          <Text style={[styles.sectionTitle, { color: themeColors.textPrimary }]}>Evolução de Vendas (Últimos 7 dias)</Text>
          
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
              <Text style={[styles.legendText, { color: themeColors.textSecondary }]}>Entregas</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: themeColors.warning }]} />
              <Text style={[styles.legendText, { color: themeColors.textSecondary }]}>Retiradas</Text>
            </View>
          </View>

          <View style={[styles.chartContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            {chartHistory.map((day, index) => {
              const MAX_HEIGHT = 150;
              const deliveryHeight = (day.delivery / maxChartValue) * MAX_HEIGHT;
              const pickupHeight = (day.pickup / maxChartValue) * MAX_HEIGHT;

              return (
                <View key={index} style={styles.chartColumn}>
                  <Text style={[styles.chartBarValue, { color: themeColors.textSecondary }]}>
                    {day.total > 0 ? `R$${Math.round(day.total)}` : ''}
                  </Text>
                  
                  <View style={[styles.chartBarBackground, { height: MAX_HEIGHT, backgroundColor: themeColors.background }]}>
                    <View style={styles.chartBarStacked}>
                      <View style={[styles.chartBarSegment, { backgroundColor: '#3B82F6', height: deliveryHeight }]} />
                      <View style={[styles.chartBarSegment, { backgroundColor: themeColors.warning, height: pickupHeight }]} />
                    </View>
                  </View>

                  <Text style={[styles.chartLabel, { color: themeColors.textSecondary }]}>{day.label}</Text>
                </View>
              );
            })}
          </View>
        </View>

      </ScrollView>

      {/* Modal de Produtos Esgotados */}
      <Modal visible={outOfStockModalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalBg}>
          <View style={[styles.modalCard, { backgroundColor: themeColors.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: themeColors.border }]}>
              <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>Produtos Esgotados</Text>
              <TouchableOpacity onPress={() => setOutOfStockModalVisible(false)}>
                <FontAwesome name="times" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={outOfStockProducts}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={[styles.outItemRow, { borderBottomColor: themeColors.border }]}>
                  <View style={[styles.outItemImgContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                    {item.imagem ? (
                      <Image source={{ uri: item.imagem }} style={styles.outItemImg} />
                    ) : (
                      <FontAwesome name="shopping-basket" size={16} color={themeColors.textSecondary} />
                    )}
                  </View>
                  <View style={styles.outItemInfo}>
                    <Text style={[styles.outItemName, { color: themeColors.textPrimary }]} numberOfLines={1}>{item.nome}</Text>
                    <Text style={[styles.outItemCat, { color: themeColors.textSecondary }]}>{item.categoria}</Text>
                  </View>
                  <View style={[styles.outItemBadge, { backgroundColor: themeColors.danger + '20' }]}>
                    <Text style={[styles.outItemBadgeText, { color: themeColors.danger }]}>Estoque 0</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <Text style={{ color: themeColors.textSecondary, textAlign: 'center', marginTop: 20 }}>
                  Nenhum produto esgotado no momento.
                </Text>
              }
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 20 },
  headerTitle: { fontSize: 24, fontWeight: 'bold' },
  subTitle: { fontSize: 14, marginTop: 4 },
  
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 12 },
  card: { padding: 15, borderRadius: 12, borderLeftWidth: 5, elevation: 2, borderWidth: 1, marginBottom: 5 },
  cardFull: { width: '100%' },
  cardHalf: { width: '48%' },
  
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 13, fontWeight: 'bold' },
  cardValue: { fontSize: 24, fontWeight: 'bold', marginTop: 8 },

  chartSection: { marginTop: 30 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  
  legendRow: { flexDirection: 'row', marginBottom: 15, gap: 15 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendDot: { width: 12, height: 12, borderRadius: 6, marginRight: 6 },
  legendText: { fontSize: 13, fontWeight: '600' },

  chartContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 15, borderRadius: 12, borderWidth: 1, elevation: 2, height: 230 },
  chartColumn: { alignItems: 'center', flex: 1 },
  chartBarValue: { fontSize: 10, marginBottom: 4, height: 15, fontWeight: 'bold' },
  chartBarBackground: { width: 25, borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end' },
  chartBarStacked: { width: '100%', flexDirection: 'column' }, 
  chartBarSegment: { width: '100%' },
  chartLabel: { fontSize: 11, marginTop: 10, fontWeight: '600' },

  // Estilos do Modal de Esgotados
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { padding: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%', minHeight: '50%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  outItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  outItemImgContainer: { width: 40, height: 40, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 12, borderWidth: 1 },
  outItemImg: { width: '100%', height: '100%', resizeMode: 'contain', borderRadius: 6 },
  outItemInfo: { flex: 1, paddingRight: 10 },
  outItemName: { fontSize: 15, fontWeight: 'bold' },
  outItemCat: { fontSize: 12, marginTop: 2 },
  outItemBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  outItemBadgeText: { fontSize: 11, fontWeight: 'bold' },
});