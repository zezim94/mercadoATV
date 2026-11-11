import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { collection, onSnapshot, getDocs } from "firebase/firestore";
import { db } from "../config/firebase";
import { FontAwesome } from "@expo/vector-icons";
import { useTheme } from "../context/ThemeContext"; // Importação do contexto de tema

export default function AdminReportsScreen() {
  const { themeColors, currentTheme } = useTheme(); // Cores dinâmicas
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPeriod, setFilterPeriod] = useState("hoje"); // 'hoje', '7', '30', 'all'

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        const usersList = snap.docs.map((doc) => doc.data());
        setEmployees(usersList);
      } catch (error) {
        console.error("Erro ao buscar usuários", error);
      }
    };
    fetchUsers();

    const unsubscribe = onSnapshot(collection(db, "orders"), (snap) => {
      const ordersList = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setOrders(ordersList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const reportData = useMemo(() => {
    let totalSales = 0;
    let deliverySales = 0;
    let pickupSales = 0;
    let deliveryCount = 0;
    let pickupCount = 0;
    const employeeMap = {};
    const productMap = {};

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    orders.forEach((order) => {
      if (!order.createdAt || order.status === "cancelado") return;

      const orderDate = new Date(order.createdAt);
      const diffDays = Math.ceil(
        Math.abs(today - orderDate) / (1000 * 60 * 60 * 24),
      );

      let include = true;
      if (filterPeriod === "hoje") {
        const orderMidnight = new Date(orderDate);
        orderMidnight.setHours(0, 0, 0, 0);
        if (orderMidnight.getTime() !== today.getTime()) include = false;
      } else if (filterPeriod === "7" && diffDays > 7) {
        include = false;
      } else if (filterPeriod === "30" && diffDays > 30) {
        include = false;
      }

      if (include) {
        const val = parseFloat(order.total) || 0;
        totalSales += val;

        if (order.method === "delivery") {
          deliverySales += val;
          deliveryCount++;

          const entregador = order.entregador || "Sem Entregador";
          if (!employeeMap[entregador]) {
            employeeMap[entregador] = { count: 0, total: 0 };
          }
          employeeMap[entregador].count += 1;
          employeeMap[entregador].total += val;
        } else {
          pickupSales += val;
          pickupCount++;
        }

        // Processa produtos para o Top 5
        if (order.items && Array.isArray(order.items)) {
          order.items.forEach((prod) => {
            const key = prod.id || prod.nome;
            const qty = parseInt(prod.cartQty || prod.quantity || 1, 10);
            const price = parseFloat(prod.precoPromocao || prod.preco || 0);
            const itemTotal = price * qty;

            if (!productMap[key]) {
              productMap[key] = {
                name: prod.nome || prod.descricao || "Produto sem nome",
                image: prod.imagem || null,
                totalQty: 0,
                totalRevenue: 0,
              };
            }
            productMap[key].totalQty += qty;
            productMap[key].totalRevenue += itemTotal;
          });
        }
      }
    });

    const employeeList = Object.keys(employeeMap)
      .map((key) => {
        const empData = employees.find((e) => e.nome === key);
        const avatarUri =
          empData?.photoUri || empData?.imagem || empData?.foto || null;

        return {
          name: key,
          avatarUri,
          ...employeeMap[key],
        };
      })
      .sort((a, b) => b.count - a.count);

    const maxEmpCount =
      employeeList.length > 0
        ? Math.max(...employeeList.map((e) => e.count))
        : 1;

    // Top 5 Produtos mais vendidos
    const topProducts = Object.values(productMap)
      .sort((a, b) => b.totalQty - a.totalQty)
      .slice(0, 5);

    const maxProdQty = topProducts.length > 0 ? topProducts[0].totalQty : 1;

    return {
      totalSales,
      deliverySales,
      pickupSales,
      deliveryCount,
      pickupCount,
      employeeList,
      maxEmpCount,
      topProducts,
      maxProdQty,
    };
  }, [orders, filterPeriod, employees]);

  if (loading) {
    return (
      <View
        style={[styles.center, { backgroundColor: themeColors.background }]}
      >
        <ActivityIndicator size="large" color={themeColors.primary} />
      </View>
    );
  }

  // Ajusta as cores das medalhas baseando-se no tema para não ofuscar a visão no modo escuro
  const getRankBadgeStyle = (index) => {
    const isDark = currentTheme === "dark";
    if (index === 0)
      return {
        bg: isDark ? "#78350F" : "#FEF3C7",
        color: isDark ? "#FDE68A" : "#D97706",
      }; // Ouro
    if (index === 1)
      return {
        bg: isDark ? "#334155" : "#E2E8F0",
        color: isDark ? "#E2E8F0" : "#475569",
      }; // Prata
    if (index === 2)
      return {
        bg: isDark ? "#7C2D12" : "#FFEDD5",
        color: isDark ? "#FDBA74" : "#C2410C",
      }; // Bronze
    return { bg: themeColors.border, color: themeColors.textSecondary };
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
    >
      {/* Barra de Filtros */}
      <View
        style={[
          styles.filterSection,
          {
            backgroundColor: themeColors.card,
            borderBottomColor: themeColors.border,
          },
        ]}
      >
        <Text
          style={[styles.filterTitle, { color: themeColors.textSecondary }]}
        >
          Período de Análise:
        </Text>
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              {
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
              },
              filterPeriod === "hoje" && {
                backgroundColor: themeColors.success,
                borderColor: themeColors.success,
              },
            ]}
            onPress={() => setFilterPeriod("hoje")}
          >
            <Text
              style={[
                styles.filterBtnText,
                { color: themeColors.textSecondary },
                filterPeriod === "hoje" && { color: "#FFF" },
              ]}
            >
              Hoje
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              {
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
              },
              filterPeriod === "7" && {
                backgroundColor: themeColors.success,
                borderColor: themeColors.success,
              },
            ]}
            onPress={() => setFilterPeriod("7")}
          >
            <Text
              style={[
                styles.filterBtnText,
                { color: themeColors.textSecondary },
                filterPeriod === "7" && { color: "#FFF" },
              ]}
            >
              7 Dias
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              {
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
              },
              filterPeriod === "30" && {
                backgroundColor: themeColors.success,
                borderColor: themeColors.success,
              },
            ]}
            onPress={() => setFilterPeriod("30")}
          >
            <Text
              style={[
                styles.filterBtnText,
                { color: themeColors.textSecondary },
                filterPeriod === "30" && { color: "#FFF" },
              ]}
            >
              30 Dias
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.filterBtn,
              {
                backgroundColor: themeColors.background,
                borderColor: themeColors.border,
              },
              filterPeriod === "all" && {
                backgroundColor: themeColors.success,
                borderColor: themeColors.success,
              },
            ]}
            onPress={() => setFilterPeriod("all")}
          >
            <Text
              style={[
                styles.filterBtnText,
                { color: themeColors.textSecondary },
                filterPeriod === "all" && { color: "#FFF" },
              ]}
            >
              Tudo
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Resumo Financeiro */}
        <View
          style={[
            styles.summaryCard,
            {
              backgroundColor: themeColors.headerBg,
              borderWidth: currentTheme === "dark" ? 1 : 0,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text
            style={[
              styles.summaryLabel,
              {
                color:
                  currentTheme === "dark"
                    ? themeColors.textSecondary
                    : "#94A3B8",
              },
            ]}
          >
            Faturamento Total no Período
          </Text>
          <Text style={[styles.summaryTotal, { color: themeColors.success }]}>
            R$ {reportData.totalSales.toFixed(2)}
          </Text>
        </View>

        <View style={styles.splitRow}>
          <View
            style={[
              styles.splitCard,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
                borderTopColor: themeColors.primary,
              },
            ]}
          >
            <View style={styles.splitHeader}>
              <FontAwesome
                name="motorcycle"
                size={16}
                color={themeColors.primary}
              />
              <Text
                style={[
                  styles.splitTitle,
                  { color: themeColors.textSecondary },
                ]}
              >
                Entregas ({reportData.deliveryCount})
              </Text>
            </View>
            <Text
              style={[styles.splitValue, { color: themeColors.textPrimary }]}
            >
              R$ {reportData.deliverySales.toFixed(2)}
            </Text>
          </View>

          <View
            style={[
              styles.splitCard,
              {
                backgroundColor: themeColors.card,
                borderColor: themeColors.border,
                borderTopColor: themeColors.warning,
              },
            ]}
          >
            <View style={styles.splitHeader}>
              <FontAwesome
                name="building"
                size={16}
                color={themeColors.warning}
              />
              <Text
                style={[
                  styles.splitTitle,
                  { color: themeColors.textSecondary },
                ]}
              >
                Retiradas ({reportData.pickupCount})
              </Text>
            </View>
            <Text
              style={[styles.splitValue, { color: themeColors.textPrimary }]}
            >
              R$ {reportData.pickupSales.toFixed(2)}
            </Text>
          </View>
        </View>

        {/* Gráfico de Desempenho dos Entregadores */}
        <View
          style={[
            styles.chartSection,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <Text
            style={[styles.sectionTitle, { color: themeColors.textPrimary }]}
          >
            Volume por Entregador
          </Text>

          {reportData.employeeList.length === 0 ? (
            <Text
              style={[styles.emptyText, { color: themeColors.textSecondary }]}
            >
              Nenhuma entrega registrada no período selecionado.
            </Text>
          ) : (
            reportData.employeeList.map((emp, index) => {
              const barWidth = `${(emp.count / reportData.maxEmpCount) * 100}%`;

              return (
                <View key={index} style={styles.empRow}>
                  <View style={styles.empHeader}>
                    <View style={styles.empIdentity}>
                      {emp.avatarUri ? (
                        <Image
                          source={{ uri: emp.avatarUri }}
                          style={[
                            styles.empAvatar,
                            { backgroundColor: themeColors.background },
                          ]}
                        />
                      ) : (
                        <View
                          style={[
                            styles.empAvatarPlaceholder,
                            {
                              backgroundColor: themeColors.background,
                              borderColor: themeColors.border,
                            },
                          ]}
                        >
                          <FontAwesome
                            name="user"
                            size={14}
                            color={themeColors.textSecondary}
                          />
                        </View>
                      )}
                      <Text
                        style={[
                          styles.empName,
                          { color: themeColors.textPrimary },
                        ]}
                      >
                        {emp.name}
                      </Text>
                    </View>

                    <Text
                      style={[
                        styles.empStats,
                        { color: themeColors.textSecondary },
                      ]}
                    >
                      {emp.count} entregas (R$ {emp.total.toFixed(2)})
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.barTrack,
                      { backgroundColor: themeColors.background },
                    ]}
                  >
                    <View
                      style={[
                        styles.barFill,
                        {
                          width: barWidth,
                          backgroundColor: themeColors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Top 5 Produtos Mais Vendidos */}
        <View
          style={[
            styles.topProductsSection,
            {
              backgroundColor: themeColors.card,
              borderColor: themeColors.border,
            },
          ]}
        >
          <View style={styles.topProductsHeader}>
            <Text
              style={[styles.sectionTitle, { color: themeColors.textPrimary }]}
            >
              Top 5 Produtos Mais Vendidos
            </Text>
            <FontAwesome name="trophy" size={18} color="#EAB308" />
          </View>

          {reportData.topProducts.length === 0 ? (
            <Text
              style={[styles.emptyText, { color: themeColors.textSecondary }]}
            >
              Nenhum produto vendido no período selecionado.
            </Text>
          ) : (
            reportData.topProducts.map((prod, index) => {
              const rankBadge = getRankBadgeStyle(index);
              const barWidth = `${(prod.totalQty / reportData.maxProdQty) * 100}%`;

              return (
                <View
                  key={index}
                  style={[
                    styles.productRow,
                    { borderBottomColor: themeColors.border },
                  ]}
                >
                  <View
                    style={[
                      styles.rankBadge,
                      { backgroundColor: rankBadge.bg },
                    ]}
                  >
                    <Text
                      style={[styles.rankBadgeText, { color: rankBadge.color }]}
                    >
                      #{index + 1}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.productImgContainer,
                      {
                        backgroundColor: themeColors.background,
                        borderColor: themeColors.border,
                      },
                    ]}
                  >
                    {prod.image ? (
                      <Image
                        source={{ uri: prod.image }}
                        style={styles.productImg}
                      />
                    ) : (
                      <FontAwesome
                        name="shopping-bag"
                        size={14}
                        color={themeColors.textSecondary}
                      />
                    )}
                  </View>

                  <View style={styles.productInfo}>
                    <View style={styles.productInfoHeader}>
                      <Text
                        style={[
                          styles.productName,
                          { color: themeColors.textPrimary },
                        ]}
                        numberOfLines={1}
                      >
                        {prod.name}
                      </Text>
                      <Text
                        style={[
                          styles.productRevenue,
                          { color: themeColors.success },
                        ]}
                      >
                        R$ {prod.totalRevenue.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.productSubRow}>
                      <Text
                        style={[
                          styles.productQtyText,
                          { color: themeColors.textSecondary },
                        ]}
                      >
                        {prod.totalQty} unidades vendidas
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.prodBarTrack,
                        { backgroundColor: themeColors.background },
                      ]}
                    >
                      <View
                        style={[
                          styles.prodBarFill,
                          {
                            width: barWidth,
                            backgroundColor: themeColors.success,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  content: { padding: 20, paddingBottom: 40 },

  // Filtros
  filterSection: { padding: 15, borderBottomWidth: 1, elevation: 2 },
  filterTitle: { fontSize: 13, fontWeight: "bold", marginBottom: 10 },
  filterRow: { flexDirection: "row", gap: 10 },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
  },
  filterBtnText: { fontSize: 13, fontWeight: "bold" },

  // Resumo
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 15,
    elevation: 3,
  },
  summaryLabel: { fontSize: 14, marginBottom: 5 },
  summaryTotal: { fontSize: 32, fontWeight: "bold" },

  splitRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15,
    marginBottom: 25,
  },
  splitCard: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderTopWidth: 4,
    elevation: 1,
  },
  splitHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  splitTitle: { fontSize: 13, fontWeight: "bold", marginLeft: 8 },
  splitValue: { fontSize: 18, fontWeight: "bold" },

  // Gráfico Entregadores
  chartSection: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 1,
    marginBottom: 25,
  },
  sectionTitle: { fontSize: 16, fontWeight: "bold", marginBottom: 20 },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
    fontStyle: "italic",
  },

  empRow: { marginBottom: 15 },
  empHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  empIdentity: { flexDirection: "row", alignItems: "center", flex: 1 },
  empAvatar: { width: 28, height: 28, borderRadius: 14, marginRight: 8 },
  empAvatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    borderWidth: 1,
  },
  empName: { fontSize: 14, fontWeight: "bold" },
  empStats: { fontSize: 13, fontWeight: "500" },
  barTrack: { height: 12, borderRadius: 6, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 6 },

  // Top 5 Produtos
  topProductsSection: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    elevation: 1,
  },
  topProductsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  rankBadgeText: { fontSize: 12, fontWeight: "bold" },
  productImgContainer: {
    width: 38,
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    overflow: "hidden",
  },
  productImg: { width: "100%", height: "100%", resizeMode: "contain" },
  productInfo: { flex: 1 },
  productInfoHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  productName: { fontSize: 14, fontWeight: "600", flex: 1, marginRight: 8 },
  productRevenue: { fontSize: 13, fontWeight: "bold" },
  productSubRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  productQtyText: { fontSize: 12 },
  prodBarTrack: { height: 6, borderRadius: 3, overflow: "hidden" },
  prodBarFill: { height: "100%", borderRadius: 3 },
});
