import React, { useState, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
  RefreshControl, Animated, Platform, ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { getDashboardStats } from '../config/database';
import { PieChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;
const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6'];

// ------- Helpers -------
const formatarMoeda = (valor) => {
  if (valor == null || isNaN(valor)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
};

const formatDataBR = (dataSql) => {
  if (!dataSql) return '';
  try {
    const [dataPart, horaPart = '00:00'] = dataSql.split(' ');
    const [ano, mes, dia] = dataPart.split('-');
    const [hora, min] = horaPart.split(':');
    return `${dia}/${mes}/${ano} às ${hora}:${min}`;
  } catch {
    return dataSql;
  }
};

const formatHora = (date) => {
  if (!date) return '';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

// ------- Subcomponentes -------
const SectionHeader = ({ icon, title, color, size = 16 }) => (
  <View style={styles.sectionHeader}>
    <FontAwesome5 name={icon} size={size} color={color} />
    <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
  </View>
);

const EmptyState = ({ icon, text, color, iconColor }) => (
  <View style={styles.emptyState}>
    <FontAwesome5 name={icon} size={28} color={iconColor} />
    <Text style={[styles.emptyText, { color }]}>{text}</Text>
  </View>
);

const Skeleton = ({ themeColors }) => (
  <View style={{ flex: 1, padding: 15 }}>
    <View style={[styles.skeleton, { backgroundColor: themeColors.border, width: '65%', height: 26 }]} />
    <View style={[styles.skeleton, { backgroundColor: themeColors.border, width: '45%', height: 14, marginTop: 8, marginBottom: 24 }]} />
    <View style={[styles.skeleton, { backgroundColor: themeColors.border, height: 130, borderRadius: 16, marginBottom: 20 }]} />
    {[1, 2].map((i) => (
      <View key={i} style={{ flexDirection: 'row', gap: 15, marginBottom: 15 }}>
        <View style={[styles.skeleton, { backgroundColor: themeColors.border, flex: 1, height: 90, borderRadius: 12 }]} />
        <View style={[styles.skeleton, { backgroundColor: themeColors.border, flex: 1, height: 90, borderRadius: 12 }]} />
      </View>
    ))}
    <View style={[styles.skeleton, { backgroundColor: themeColors.border, height: 220, borderRadius: 12, marginBottom: 20 }]} />
    <View style={[styles.skeleton, { backgroundColor: themeColors.border, height: 160, borderRadius: 12 }]} />
  </View>
);
 const chartWidth = Math.min(screenWidth - 70, 420);

// ------- Tela principal -------
export default function RelatoriosScreen({ navigation }) {
  const { themeColors } = useTheme();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const loadRelatorio = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const data = await getDashboardStats();
      setStats(data);
      setLastUpdate(new Date());
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } catch (err) {
      console.error('Erro ao carregar relatórios:', err);
      setError('Não foi possível carregar os dados. Verifique sua conexão.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRelatorio(true);
  };

  useFocusEffect(useCallback(() => { loadRelatorio(); }, []));

  // ---- Estados de carregamento ----
  if (loading) return <Skeleton themeColors={themeColors} />;

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: themeColors.background }]}>
        <FontAwesome5 name="exclamation-circle" size={48} color={themeColors.danger} />
        <Text style={[styles.errorText, { color: themeColors.textPrimary }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryBtn, { backgroundColor: themeColors.primary }]}
          onPress={() => loadRelatorio()}
        >
          <FontAwesome5 name="redo" size={14} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.retryBtnText}>Tentar novamente</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!stats) return null;

  const pieChartData = (stats.categorias || []).map((cat, index) => ({
    name: cat.nome,
    population: cat.qtd,
    color: CHART_COLORS[index % CHART_COLORS.length],
    legendFontColor: themeColors.textSecondary,
    legendFontSize: 12,
  }));

  const maxCategoria = Math.max(...(stats.categorias || []).map((c) => c.qtd), 1);
  const estoqueSaudavel = stats.baixoEstoque === 0 && stats.totalProdutos > 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[themeColors.primary]}
          tintColor={themeColors.primary}
        />
      }
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* HEADER */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.headerTitle, { color: themeColors.textPrimary }]}>
              Visão Geral
            </Text>
            <Text style={[styles.headerSubtitle, { color: themeColors.textSecondary }]}>
              {lastUpdate ? `Atualizado às ${formatHora(lastUpdate)}` : 'Análise financeira e operacional'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={onRefresh}
            accessibilityRole="button"
            accessibilityLabel="Atualizar dados"
          >
            <FontAwesome5 name="sync-alt" size={16} color={themeColors.primary} />
          </TouchableOpacity>
        </View>

        {/* INDICADOR DE SAÚDE */}
        {stats.totalProdutos > 0 && (
          <View
            style={[
              styles.healthBadge,
              {
                backgroundColor: estoqueSaudavel
                  ? themeColors.success + '15'
                  : themeColors.warning + '15',
                borderColor: estoqueSaudavel
                  ? themeColors.success + '40'
                  : themeColors.warning + '40',
              },
            ]}
          >
            <FontAwesome5
              name={estoqueSaudavel ? 'check-circle' : 'exclamation-triangle'}
              size={14}
              color={estoqueSaudavel ? themeColors.success : themeColors.warning}
            />
            <Text
              style={[
                styles.healthText,
                { color: estoqueSaudavel ? themeColors.success : themeColors.warning },
              ]}
            >
              {estoqueSaudavel
                ? 'Estoque saudável — nenhum item em nível crítico'
                : `${stats.baixoEstoque} ${stats.baixoEstoque === 1 ? 'item precisa' : 'itens precisam'} de reposição`}
            </Text>
          </View>
        )}

        {/* CAPITAL EM ESTOQUE */}
        <View style={[styles.mainCard, { backgroundColor: themeColors.primary }]}>
          <View style={styles.mainCardRow}>
            <View style={styles.mainCardIconBg}>
              <FontAwesome5 name="wallet" size={20} color="#FFF" />
            </View>
            <Text style={styles.mainCardTitle}>Capital em Estoque</Text>
          </View>
          <Text style={styles.mainCardValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatarMoeda(stats.valorTotal)}
          </Text>
          <Text style={styles.mainCardSub}>Soma do preço × quantidade de todos os itens</Text>
        </View>

        {/* MÉTRICAS RÁPIDAS */}
        <View style={styles.grid}>
          <View style={[styles.gridCard, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderLeftColor: '#3B82F6' }]}>
            <Text style={[styles.gridTitle, { color: themeColors.textSecondary }]}>Produtos</Text>
            <Text style={[styles.gridValue, { color: themeColors.textPrimary }]}>{stats.totalProdutos}</Text>
            <FontAwesome5 name="box-open" size={20} color="#3B82F6" style={styles.gridIcon} />
          </View>

          <TouchableOpacity
            style={[styles.gridCard, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderLeftColor: themeColors.danger }]}
            onPress={() => navigation.navigate('Produtos')}
            accessibilityRole="button"
            accessibilityLabel="Ver produtos com estoque baixo"
          >
            <Text style={[styles.gridTitle, { color: themeColors.danger }]}>Estoque Baixo</Text>
            <Text style={[styles.gridValue, { color: themeColors.danger }]}>{stats.baixoEstoque}</Text>
            <FontAwesome5 name="exclamation-triangle" size={20} color={themeColors.danger} style={styles.gridIcon} />
          </TouchableOpacity>
        </View>

        <View style={styles.grid}>
          <View style={[styles.gridCard, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderLeftColor: themeColors.success }]}>
            <Text style={[styles.gridTitle, { color: themeColors.textSecondary }]}>Entradas</Text>
            <Text style={[styles.gridValue, { color: themeColors.success }]}>+{stats.totalEntradas}</Text>
            <FontAwesome5 name="arrow-down" size={20} color={themeColors.success} style={styles.gridIcon} />
          </View>

          <View style={[styles.gridCard, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderLeftColor: themeColors.danger }]}>
            <Text style={[styles.gridTitle, { color: themeColors.textSecondary }]}>Saídas</Text>
            <Text style={[styles.gridValue, { color: themeColors.danger }]}>-{stats.totalSaidas}</Text>
            <FontAwesome5 name="arrow-up" size={20} color={themeColors.danger} style={styles.gridIcon} />
          </View>
        </View>

        {/* GRÁFICO */}
        <View style={[styles.section, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <SectionHeader icon="chart-pie" title="Distribuição por Categoria" color={themeColors.textPrimary} />

          {stats.categorias.length === 0 ? (
            <EmptyState
              icon="inbox"
              text="Nenhuma categoria com produtos ainda."
              color={themeColors.textSecondary}
              iconColor={themeColors.border}
            />
          ) : (
            <>
             

<PieChart
  data={pieChartData}
  width={chartWidth}
  height={200}
  chartConfig={{ color: (opacity = 1) => `rgba(0,0,0,${opacity})` }}
  accessor="population"
  backgroundColor="transparent"
  paddingLeft="0"
  absolute
  hasLegend={false}                     // 🔑 chave da correção
  style={{ alignSelf: 'center' }}
    center={[chartWidth / 5, 0]} 
/>

              <View style={{ marginTop: 8 }}>
                {stats.categorias.map((cat, index) => {
                  const pct = (cat.qtd / maxCategoria) * 100;
                  const cor = CHART_COLORS[index % CHART_COLORS.length];
                  return (
                    <View key={index} style={styles.catRow}>
                      <View style={{ flex: 1, marginRight: 10 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                          <View style={[styles.colorDot, { backgroundColor: cor }]} />
                          <Text style={[styles.catName, { color: themeColors.textPrimary }]} numberOfLines={1}>
                            {cat.nome}
                          </Text>
                        </View>
                        <View style={[styles.progressTrack, { backgroundColor: themeColors.background }]}>
                          <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: cor }]} />
                        </View>
                      </View>
                      <View style={[styles.catBadge, { backgroundColor: themeColors.background }]}>
                        <Text style={[styles.catValue, { color: themeColors.textSecondary }]}>
                          {cat.qtd} {cat.qtd === 1 ? 'item' : 'itens'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* MOVIMENTAÇÕES */}
        <View style={[styles.section, { backgroundColor: themeColors.card, borderColor: themeColors.border, marginBottom: 40 }]}>
          <SectionHeader icon="history" title="Últimas Movimentações" color={themeColors.textPrimary} />

          {stats.ultimasMovimentacoes.length === 0 ? (
            <EmptyState
              icon="clipboard-list"
              text="Nenhuma movimentação registrada."
              color={themeColors.textSecondary}
              iconColor={themeColors.border}
            />
          ) : (
            stats.ultimasMovimentacoes.map((mov, idx) => {
              const isEntrada = mov.tipo === 'ENTRADA';
              const cor = isEntrada ? themeColors.success : themeColors.danger;
              const isLast = idx === stats.ultimasMovimentacoes.length - 1;
              return (
                <View
                  key={mov.id}
                  style={[
                    styles.movRow,
                    { borderBottomColor: themeColors.background, borderBottomWidth: isLast ? 0 : 1 },
                  ]}
                >
                  <View style={[styles.movIconBox, { backgroundColor: cor + '20' }]}>
                    <FontAwesome5 name={isEntrada ? 'arrow-down' : 'arrow-up'} size={14} color={cor} />
                  </View>
                  <View style={styles.movInfo}>
                    <Text style={[styles.movName, { color: themeColors.textPrimary }]} numberOfLines={1}>
                      {mov.produto_nome}
                    </Text>
                    <Text style={[styles.movDate, { color: themeColors.textSecondary }]}>
                      {formatDataBR(mov.data)}
                    </Text>
                  </View>
                  <Text style={[styles.movQtd, { color: cor }]}>
                    {isEntrada ? '+' : '-'}{mov.quantidade}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

// ------- Estilos -------
const shadowStyle = Platform.select({
  ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10 },
  android: { elevation: 4 },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  contentContainer: { padding: 15, paddingBottom: 40 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 8, gap: 12 },
  headerTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  headerSubtitle: { fontSize: 13, marginTop: 3 },
  refreshBtn: {
    width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },

  // Health badge
  healthBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingVertical: 10, paddingHorizontal: 14,
    borderRadius: 10, borderWidth: 1, marginBottom: 16,
  },
  healthText: { fontSize: 12, fontWeight: '600', flex: 1 },

  // Main card
  mainCard: { padding: 22, borderRadius: 16, marginBottom: 16, ...shadowStyle },
  mainCardRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  mainCardIconBg: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center', marginRight: 10,
  },
  mainCardTitle: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  mainCardValue: { color: '#FFF', fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  mainCardSub: { color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 8 },

  // Grid
  grid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  gridCard: {
    flex: 1, padding: 15, borderRadius: 12, borderWidth: 1, borderLeftWidth: 4,
    position: 'relative', overflow: 'hidden',
  },
  gridTitle: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  gridValue: { fontSize: 22, fontWeight: '800' },
  gridIcon: { position: 'absolute', right: -5, bottom: -5, opacity: 0.1, fontSize: 60 },

  // Sections
  section: { padding: 20, borderRadius: 12, borderWidth: 1, marginBottom: 16, ...shadowStyle },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 28, gap: 10 },
  emptyText: { fontStyle: 'italic', fontSize: 13, textAlign: 'center' },

  // Categoria
  catRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  catName: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  catBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  catValue: { fontSize: 12, fontWeight: '700' },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },

  // Movimentações
  movRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  movIconBox: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  movInfo: { flex: 1 },
  movName: { fontSize: 14, fontWeight: '600' },
  movDate: { fontSize: 11, marginTop: 2 },
  movQtd: { fontSize: 16, fontWeight: '800' },

  // Erro
  errorText: { fontSize: 15, textAlign: 'center', marginTop: 16, marginBottom: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 24, borderRadius: 24,
  },
  retryBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  // Skeleton
  skeleton: { borderRadius: 8 },
});