import React, { useState, useEffect, useMemo } from 'react';
import { 
  View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, 
  Alert, TextInput, ScrollView, Modal, ToastAndroid, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { collection, query, where, onSnapshot, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../config/firebase'; 
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext'; // Importação do contexto de tema

export default function HomeScreen({ navigation, route }) {
  const { themeColors } = useTheme(); // Cores dinâmicas do tema atual
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de Abas e Favoritos
  const [mainTab, setMainTab] = useState('loja'); // 'loja' ou 'favoritos'
  const [favorites, setFavorites] = useState([]);

  // Estados de Filtro e Pesquisa
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedSubcategory, setSelectedSubcategory] = useState('Todas');

  // Estados do Modal de Detalhes
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  // Estados do Carrinho
  const [cart, setCart] = useState([]);
  const [cartModalVisible, setCartModalVisible] = useState(false);

  const showToast = (message) => {
    if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
    else Alert.alert('Aviso', message);
  };

  // Escuta os Favoritos do Usuário (se estiver logado)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, 'users', user.uid);
    const unsubUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setFavorites(docSnap.data().favoritos || []);
      }
    });

    return () => unsubUser();
  }, []);

  useEffect(() => {
    if (route.params?.reorderItems) {
      const itemsToReorder = route.params.reorderItems;
      
      setCart((prevCart) => {
        let updatedCart = [...prevCart];
        itemsToReorder.forEach(newItem => {
          const existingItem = updatedCart.find(item => item.id === newItem.id);
          if (existingItem) {
             const novaQtd = existingItem.cartQty + (newItem.cartQty || newItem.quantity || 1);
             existingItem.cartQty = novaQtd <= existingItem.estoque ? novaQtd : existingItem.estoque;
          } else {
             updatedCart.push({ ...newItem, cartQty: newItem.cartQty || newItem.quantity || 1 });
          }
        });
        return updatedCart;
      });
      navigation.setParams({ reorderItems: undefined });
    }
  }, [route.params?.reorderItems]);

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'products'), where('disponivel', '==', true));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const productsList = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsList);
      setLoading(false);
    }, (error) => {
      console.error("Erro ao carregar produtos:", error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const categories = useMemo(() => {
    const cats = products.map(p => p.categoria).filter(Boolean);
    return ['Todas', ...new Set(cats)];
  }, [products]);

  const subcategories = useMemo(() => {
    if (selectedCategory === 'Todas') return ['Todas'];
    const subs = products.filter(p => p.categoria === selectedCategory).map(p => p.subcategoria).filter(Boolean);
    return ['Todas', ...new Set(subs)];
  }, [products, selectedCategory]);

  const filteredProducts = useMemo(() => {
    let list = products;
    
    if (mainTab === 'favoritos') {
      list = list.filter(p => favorites.includes(p.id));
    }

    return list.filter(p => {
      const matchesSearch = (p.nome || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'Todas' || p.categoria === selectedCategory;
      const matchesSubcategory = selectedSubcategory === 'Todas' || p.subcategoria === selectedSubcategory;
      return matchesSearch && matchesCategory && matchesSubcategory;
    });
  }, [products, searchQuery, selectedCategory, selectedSubcategory, mainTab, favorites]);

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat);
    setSelectedSubcategory('Todas'); 
  };

  const openProductDetails = (product) => {
    setSelectedProduct(product);
    setDetailsModalVisible(true);
  };

  const getProductPrice = (item) => {
    return item.emPromocao && item.precoPromocao ? item.precoPromocao : item.preco;
  };

  const handleToggleFavorite = async (productId) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('Login Necessário', 'Faça login ou cadastre-se para favoritar produtos e montar sua lista.', [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Fazer Login', onPress: () => navigation.navigate('Login') }
      ]);
      return;
    }

    const userRef = doc(db, 'users', user.uid);
    try {
      if (favorites.includes(productId)) {
        await updateDoc(userRef, { favoritos: arrayRemove(productId) });
        showToast('Removido dos favoritos');
      } else {
        await updateDoc(userRef, { favoritos: arrayUnion(productId) });
        showToast('Adicionado aos favoritos ♥');
      }
    } catch (error) {
      showToast('Erro ao favoritar.');
    }
  };

  const handleUpdateCart = (product, action) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      let newCart = [...prevCart];

      if (action === 'add') {
        if (existingItem) {
          if (existingItem.cartQty < product.estoque) {
            existingItem.cartQty += 1;
            showToast(`${existingItem.cartQty}x ${product.nome} no carrinho`);
          } else {
            showToast('Limite máximo de estoque atingido!');
          }
        } else {
          newCart.push({ ...product, cartQty: 1 });
          showToast(`1x ${product.nome} adicionado ao carrinho!`);
        }
      } else if (action === 'remove') {
        if (existingItem) {
          if (existingItem.cartQty > 1) {
            existingItem.cartQty -= 1;
          } else {
            newCart = newCart.filter(item => item.id !== product.id);
            showToast(`${product.nome} removido do carrinho`);
          }
        }
      } else if (action === 'delete') {
        newCart = newCart.filter(item => item.id !== product.id);
        showToast(`${product.nome} removido do carrinho`);
      }
      return newCart;
    });
  };

  const clearCart = () => {
    Alert.alert('Limpar Carrinho', 'Tem certeza que deseja remover todos os itens?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar', onPress: () => { setCart([]); showToast('Carrinho limpo'); } }
    ]);
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((total, item) => total + (getProductPrice(item) * item.cartQty), 0);
  }, [cart]);

  const goToCheckout = () => {
    if (cart.length === 0) return;
    setCartModalVisible(false);

    if (!auth.currentUser) {
      Alert.alert(
        'Acesso Restrito',
        'Você está navegando como visitante. Faça login ou cadastre-se para confirmar o pedido e preencher seu endereço.',
        [
          { text: 'Voltar', style: 'cancel' },
          { text: 'Entrar', onPress: () => navigation.navigate('Login') }
        ]
      );
      return;
    }

    navigation.navigate('Checkout', { cartItems: cart, total: cartTotal });
  };

  const renderProduct = ({ item }) => {
    const finalPrice = getProductPrice(item);
    let discountPercent = 0;
    if (item.emPromocao && item.preco > 0) {
      discountPercent = Math.round(((item.preco - item.precoPromocao) / item.preco) * 100);
    }
    const cartItem = cart.find(c => c.id === item.id);
    const cartQty = cartItem ? cartItem.cartQty : 0;
    const isFavorite = favorites.includes(item.id);

    return (
      <View style={[styles.productCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <TouchableOpacity style={styles.favoriteBtnCard} onPress={() => handleToggleFavorite(item.id)}>
          <FontAwesome name={isFavorite ? "heart" : "heart-o"} size={22} color={isFavorite ? "#EF4444" : "#94A3B8"} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.imagePlaceholder, { backgroundColor: themeColors.border }]} onPress={() => openProductDetails(item)}>
          {item.imagem ? (
            <Image source={{ uri: item.imagem }} style={styles.productImage} />
          ) : (
            <FontAwesome name="image" size={30} color={themeColors.textSecondary} />
          )}
          {item.emPromocao && discountPercent > 0 && (
            <View style={styles.discountTag}>
              <Text style={styles.discountTagText}>-{discountPercent}%</Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.infoArea} onPress={() => openProductDetails(item)}>
          <Text style={[styles.productName, { color: themeColors.textPrimary }]} numberOfLines={2}>{item.nome}</Text>
          {item.descricao && (
            <Text style={[styles.productDescription, { color: themeColors.textSecondary }]} numberOfLines={2}>{item.descricao}</Text>
          )}
        </TouchableOpacity>
        
        {item.emPromocao ? (
          <View style={styles.priceContainer}>
            <Text style={styles.oldPrice}>R$ {parseFloat(item.preco).toFixed(2)}</Text>
            <Text style={[styles.productPrice, { color: themeColors.success }]}>R$ {parseFloat(finalPrice).toFixed(2)}</Text>
          </View>
        ) : (
          <View style={styles.priceContainer}>
            <Text style={[styles.productPrice, { color: themeColors.success }]}>R$ {parseFloat(finalPrice).toFixed(2)}</Text>
          </View>
        )}
        
        {item.estoque <= 5 && item.estoque > 0 && (
          <Text style={styles.lowStockText}>Restam {item.estoque} un</Text>
        )}
        {item.estoque === 0 && (
          <Text style={styles.outOfStockText}>Esgotado</Text>
        )}

        {cartQty > 0 ? (
          <View style={[styles.qtyControlContainer, { backgroundColor: themeColors.primary }]}>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateCart(item, 'remove')}>
              <FontAwesome name="minus" size={14} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.qtyControlText}>{cartQty}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateCart(item, 'add')}>
              <FontAwesome name="plus" size={14} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: themeColors.primary }, item.estoque === 0 && styles.addButtonDisabled]}
            disabled={item.estoque === 0}
            onPress={() => handleUpdateCart(item, 'add')}
          >
            <Text style={styles.addButtonText}>Adicionar</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      
      {/* Abas Superiores */}
      <View style={[styles.topTabsContainer, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <TouchableOpacity style={[styles.topTab, mainTab === 'loja' && { borderBottomColor: themeColors.primary }]} onPress={() => setMainTab('loja')}>
          <FontAwesome name="shopping-bag" size={14} color={mainTab === 'loja' ? themeColors.primary : themeColors.textSecondary} style={{marginRight: 6}} />
          <Text style={[styles.topTabText, { color: mainTab === 'loja' ? themeColors.primary : themeColors.textSecondary }]}>Loja</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.topTab, mainTab === 'favoritos' && { borderBottomColor: themeColors.primary }]} 
          onPress={() => {
            if (!auth.currentUser) {
              Alert.alert('Acesso Restrito', 'Faça login para ver sua aba de favoritos.', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Entrar', onPress: () => navigation.navigate('Login') }
              ]);
              return;
            }
            setMainTab('favoritos');
          }}
        >
          <FontAwesome name="heart" size={14} color={mainTab === 'favoritos' ? '#EF4444' : themeColors.textSecondary} style={{marginRight: 6}} />
          <Text style={[styles.topTabText, { color: mainTab === 'favoritos' ? '#EF4444' : themeColors.textSecondary }]}>Favoritos</Text>
        </TouchableOpacity>
      </View>

      <View style={[styles.searchSection, { backgroundColor: themeColors.card }]}>
        <View style={[styles.searchContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
          <FontAwesome name="search" size={18} color={themeColors.textSecondary} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: themeColors.textPrimary }]}
            placeholder="Buscar produtos..."
            placeholderTextColor={themeColors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <FontAwesome name="times-circle" size={18} color={themeColors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={[styles.filtersWrapper, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesList}>
          {categories.map((cat, index) => (
            <TouchableOpacity 
              key={index} 
              style={[styles.categoryBadge, { backgroundColor: themeColors.background, borderColor: themeColors.border }, selectedCategory === cat && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }]}
              onPress={() => handleSelectCategory(cat)}
            >
              <Text style={[styles.categoryText, { color: themeColors.textSecondary }, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {selectedCategory !== 'Todas' && subcategories.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subcategoriesList}>
            {subcategories.map((sub, index) => (
              <TouchableOpacity 
                key={index} 
                style={[styles.subcategoryBadge, { backgroundColor: themeColors.card, borderColor: themeColors.border }, selectedSubcategory === sub && { backgroundColor: themeColors.primary, borderColor: themeColors.primary }]}
                onPress={() => setSelectedSubcategory(sub)}
              >
                <Text style={[styles.subcategoryText, { color: themeColors.textPrimary }, selectedSubcategory === sub && styles.categoryTextActive]}>{sub}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator size="large" color={themeColors.primary} /></View>
      ) : (
        <FlatList
          data={filteredProducts}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={styles.list}
          renderItem={renderProduct}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <FontAwesome name={mainTab === 'favoritos' ? "heart-o" : "search-minus"} size={40} color={themeColors.textSecondary} />
              <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>
                {mainTab === 'favoritos' ? 'Você ainda não tem produtos favoritos.' : 'Nenhum produto encontrado.'}
              </Text>
            </View>
          }
        />
      )}

      {cart.length > 0 && (
        <TouchableOpacity style={[styles.fabContainer, { backgroundColor: themeColors.success }]} onPress={() => setCartModalVisible(true)}>
          <View style={styles.fabLeft}>
            <View style={styles.fabBadge}>
              <Text style={styles.fabBadgeText}>{cart.reduce((total, item) => total + item.cartQty, 0)}</Text>
            </View>
            <FontAwesome name="shopping-cart" size={24} color="#FFF" style={{ marginLeft: 15 }} />
            <Text style={styles.fabText}>Ver Carrinho</Text>
          </View>
          <Text style={styles.fabTotalText}>R$ {cartTotal.toFixed(2)}</Text>
        </TouchableOpacity>
      )}

      {/* Modal de Detalhes */}
      <Modal visible={detailsModalVisible} transparent={true} animationType="fade" onRequestClose={() => setDetailsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.card }]}>
            <TouchableOpacity style={styles.closeModalBtn} onPress={() => setDetailsModalVisible(false)}>
              <FontAwesome name="times" size={24} color={themeColors.textSecondary} />
            </TouchableOpacity>

            {selectedProduct && (() => {
              const modalCartItem = cart.find(c => c.id === selectedProduct.id);
              const modalCartQty = modalCartItem ? modalCartItem.cartQty : 0;
              const isModalFav = favorites.includes(selectedProduct.id);

              return (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <View style={[styles.modalImageContainer, { backgroundColor: themeColors.background }]}>
                    {selectedProduct.imagem ? (
                      <Image source={{ uri: selectedProduct.imagem }} style={styles.modalImage} />
                    ) : (
                      <FontAwesome name="image" size={60} color={themeColors.textSecondary} />
                    )}
                    
                    {selectedProduct.emPromocao && selectedProduct.precoPromocao && selectedProduct.preco > 0 && (
                      <View style={styles.modalDiscountTag}>
                        <Text style={styles.modalDiscountText}>
                          -{Math.round(((selectedProduct.preco - selectedProduct.precoPromocao) / selectedProduct.preco) * 100)}%
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity style={styles.modalFavoriteBtn} onPress={() => handleToggleFavorite(selectedProduct.id)}>
                      <FontAwesome name={isModalFav ? "heart" : "heart-o"} size={26} color={isModalFav ? "#EF4444" : "#94A3B8"} />
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.modalTitle, { color: themeColors.textPrimary }]}>{selectedProduct.nome}</Text>
                  
                  <View style={styles.modalCategoryBox}>
                    <Text style={[styles.modalCategoryText, { color: themeColors.textSecondary }]}>
                      {selectedProduct.categoria} {selectedProduct.subcategoria ? ` > ${selectedProduct.subcategoria}` : ''}
                    </Text>
                  </View>

                  <View style={[styles.modalPriceSection, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                    {selectedProduct.emPromocao && selectedProduct.precoPromocao ? (
                      <>
                        <Text style={[styles.modalOldPrice, { color: themeColors.textSecondary }]}>De: R$ {parseFloat(selectedProduct.preco).toFixed(2)}</Text>
                        <Text style={[styles.modalCurrentPrice, { color: themeColors.success }]}>Por: R$ {parseFloat(selectedProduct.precoPromocao).toFixed(2)}</Text>
                      </>
                    ) : (
                      <Text style={[styles.modalCurrentPrice, { color: themeColors.success }]}>R$ {parseFloat(selectedProduct.preco).toFixed(2)}</Text>
                    )}
                  </View>

                  <View style={[styles.modalStockBox, { backgroundColor: themeColors.background }]}>
                    <Text style={[styles.modalStockText, { color: themeColors.textSecondary }]}>
                      Disponível: <Text style={{fontWeight: 'bold', color: themeColors.textPrimary}}>{selectedProduct.estoque}</Text> unidades
                    </Text>
                  </View>

                  {selectedProduct.descricao ? (
                    <View style={[styles.modalDescriptionBox, { borderTopColor: themeColors.border }]}>
                      <Text style={[styles.modalSectionTitle, { color: themeColors.textPrimary }]}>Descrição do Produto</Text>
                      <Text style={[styles.modalDescriptionText, { color: themeColors.textSecondary }]}>{selectedProduct.descricao}</Text>
                    </View>
                  ) : null}

                  {modalCartQty > 0 ? (
                    <View style={[styles.qtyControlContainer, { backgroundColor: themeColors.primary, width: '100%', height: 50, marginTop: 10 }]}>
                      <TouchableOpacity style={[styles.qtyBtn, { width: 50 }]} onPress={() => handleUpdateCart(selectedProduct, 'remove')}>
                        <FontAwesome name="minus" size={18} color="#FFF" />
                      </TouchableOpacity>
                      <Text style={[styles.qtyControlText, { fontSize: 18 }]}>{modalCartQty} no carrinho</Text>
                      <TouchableOpacity style={[styles.qtyBtn, { width: 50 }]} onPress={() => handleUpdateCart(selectedProduct, 'add')}>
                        <FontAwesome name="plus" size={18} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.modalAddBtn, { backgroundColor: themeColors.primary }, selectedProduct.estoque === 0 && styles.addButtonDisabled]}
                      disabled={selectedProduct.estoque === 0}
                      onPress={() => {
                        handleUpdateCart(selectedProduct, 'add');
                        setDetailsModalVisible(false);
                      }}
                    >
                      <FontAwesome name="cart-plus" size={20} color="#FFF" style={{marginRight: 10}} />
                      <Text style={styles.modalAddBtnText}>
                        {selectedProduct.estoque === 0 ? 'Esgotado' : 'Adicionar ao Carrinho'}
                      </Text>
                    </TouchableOpacity>
                  )}
                </ScrollView>
              );
            })()}
          </View>
        </View>
      </Modal>

      {/* Modal do Carrinho */}
      <Modal visible={cartModalVisible} animationType="slide" transparent={true} onRequestClose={() => setCartModalVisible(false)}>
        <View style={styles.cartModalBg}>
          <View style={[styles.cartModalContainer, { backgroundColor: themeColors.card }]}>
            <View style={[styles.cartModalHeader, { borderColor: themeColors.border }]}>
              <Text style={[styles.cartModalTitle, { color: themeColors.textPrimary }]}>Meu Carrinho</Text>
              <TouchableOpacity onPress={() => setCartModalVisible(false)}>
                <FontAwesome name="times" size={24} color={themeColors.textSecondary} />
              </TouchableOpacity>
            </View>

            {cart.length === 0 ? (
              <View style={styles.emptyContainer}>
                <FontAwesome name="shopping-cart" size={50} color={themeColors.textSecondary} />
                <Text style={[styles.emptyText, { color: themeColors.textSecondary }]}>Seu carrinho está vazio.</Text>
              </View>
            ) : (
              <FlatList
                data={cart}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => {
                  const pPrice = getProductPrice(item);
                  return (
                    <View style={[styles.cartItemCard, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
                      <View style={[styles.cartItemImgBox, { backgroundColor: themeColors.card }]}>
                        {item.imagem ? (
                          <Image source={{ uri: item.imagem }} style={styles.cartItemImg} />
                        ) : (
                          <FontAwesome name="image" size={20} color={themeColors.textSecondary} />
                        )}
                      </View>
                      <View style={styles.cartItemInfo}>
                        <Text style={[styles.cartItemName, { color: themeColors.textPrimary }]} numberOfLines={1}>{item.nome}</Text>
                        <Text style={[styles.cartItemPrice, { color: themeColors.textSecondary }]}>R$ {pPrice.toFixed(2)}</Text>
                        <View style={styles.cartItemControlsRow}>
                          <View style={[styles.qtyControlContainerSmall, { backgroundColor: themeColors.primary }]}>
                            <TouchableOpacity style={styles.qtyBtnSmall} onPress={() => handleUpdateCart(item, 'remove')}>
                              <FontAwesome name="minus" size={12} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.qtyControlTextSmall}>{item.cartQty}</Text>
                            <TouchableOpacity style={styles.qtyBtnSmall} onPress={() => handleUpdateCart(item, 'add')}>
                              <FontAwesome name="plus" size={12} color="#FFF" />
                            </TouchableOpacity>
                          </View>
                          <TouchableOpacity onPress={() => handleUpdateCart(item, 'delete')} style={{ padding: 5, marginLeft: 10 }}>
                            <FontAwesome name="trash" size={18} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <Text style={[styles.cartItemTotal, { color: themeColors.success }]}>R$ {(pPrice * item.cartQty).toFixed(2)}</Text>
                    </View>
                  );
                }}
              />
            )}

            {cart.length > 0 && (
              <View style={[styles.cartFooter, { borderColor: themeColors.border }]}>
                <View style={styles.totalsRow}>
                  <Text style={[styles.totalsLabel, { color: themeColors.textSecondary }]}>Subtotal</Text>
                  <Text style={[styles.totalsValue, { color: themeColors.textPrimary }]}>R$ {cartTotal.toFixed(2)}</Text>
                </View>
                <View style={styles.totalsRow}>
                  <Text style={[styles.totalsLabelTotal, { color: themeColors.textPrimary }]}>Total Geral</Text>
                  <Text style={[styles.totalsValueTotal, { color: themeColors.success }]}>R$ {cartTotal.toFixed(2)}</Text>
                </View>

                <View style={styles.cartActionRow}>
                  <TouchableOpacity style={styles.clearCartBtn} onPress={clearCart}>
                    <FontAwesome name="trash-o" size={16} color="#DC2626" style={{marginRight: 5}}/>
                    <Text style={styles.clearCartText}>Limpar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.checkoutBtn, { backgroundColor: themeColors.primary }]} onPress={goToCheckout}>
                    <Text style={styles.checkoutBtnText}>Ir para Pagamento</Text>
                    <FontAwesome name="arrow-right" size={16} color="#FFF" style={{marginLeft: 10}}/>
                  </TouchableOpacity>
                </View>
              </View>
            )}

          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  
  topTabsContainer: { flexDirection: 'row', borderBottomWidth: 1, elevation: 2, zIndex: 10 },
  topTab: { flex: 1, flexDirection: 'row', paddingVertical: 14, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: 'transparent' },
  topTabText: { fontSize: 14, fontWeight: 'bold' },

  searchSection: { paddingHorizontal: 15, paddingTop: 15, paddingBottom: 10 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, borderWidth: 1 },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, height: 45, fontSize: 16 },
  
  filtersWrapper: { borderBottomWidth: 1, paddingBottom: 10 },
  categoriesList: { paddingHorizontal: 15, gap: 10 },
  categoryBadge: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  categoryText: { fontSize: 14, fontWeight: 'bold' },
  categoryTextActive: { color: '#FFF' },
  
  subcategoriesList: { paddingHorizontal: 15, gap: 8, marginTop: 10 },
  subcategoryBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 15, borderWidth: 1 },
  subcategoryText: { fontSize: 12, fontWeight: 'bold' },
  
  list: { padding: 10, paddingBottom: 100 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  emptyText: { textAlign: 'center', marginTop: 15, fontSize: 15 },
  
  productCard: { flex: 1, margin: 5, padding: 10, borderRadius: 12, borderWidth: 1, justifyContent: 'space-between', position: 'relative' },
  favoriteBtnCard: { position: 'absolute', top: 10, right: 10, zIndex: 10, padding: 4, backgroundColor: 'rgba(255,255,255,0.8)', borderRadius: 20 },
  imagePlaceholder: { width: '100%', height: 110, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  productImage: { width: '100%', height: '100%', resizeMode: 'contain', borderRadius: 8 },
  discountTag: { position: 'absolute', top: -5, left: -5, backgroundColor: '#DC2626', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10, elevation: 2 },
  discountTagText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  
  infoArea: { alignItems: 'center', flex: 1, justifyContent: 'center', width: '100%' },
  productName: { fontSize: 13, fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },
  productDescription: { fontSize: 11, textAlign: 'center', marginBottom: 6, paddingHorizontal: 2 },
  
  priceContainer: { alignItems: 'center', marginVertical: 4, minHeight: 38, justifyContent: 'center' },
  oldPrice: { fontSize: 12, color: '#94A3B8', textDecorationLine: 'line-through' },
  productPrice: { fontSize: 15, fontWeight: 'bold' },
  lowStockText: { fontSize: 11, color: '#DC2626', marginBottom: 4, fontWeight: 'bold', textAlign: 'center' },
  outOfStockText: { fontSize: 11, color: '#94A3B8', marginBottom: 4, fontWeight: 'bold', textAlign: 'center' },
  
  addButton: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6, marginTop: 6, width: '100%', alignItems: 'center' },
  addButtonDisabled: { backgroundColor: '#94A3B8' },
  addButtonText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  qtyControlContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 6, marginTop: 6, width: '100%', height: 35, overflow: 'hidden' },
  qtyBtn: { width: 35, height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  qtyControlText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  
  fabContainer: { position: 'absolute', bottom: 20, left: 20, right: 20, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 15, elevation: 5 },
  fabLeft: { flexDirection: 'row', alignItems: 'center' },
  fabBadge: { position: 'absolute', top: -10, left: -5, backgroundColor: '#DC2626', width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', zIndex: 10, borderWidth: 1, borderColor: '#FFF' },
  fabBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  fabText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  fabTotalText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  modalContent: { borderRadius: 20, padding: 20, maxHeight: '85%' },
  closeModalBtn: { position: 'absolute', top: 15, right: 15, zIndex: 10, padding: 5, backgroundColor: 'rgba(150,150,150,0.2)', borderRadius: 15 },
  modalFavoriteBtn: { position: 'absolute', top: 15, left: 15, zIndex: 10, padding: 5, backgroundColor: 'rgba(150,150,150,0.2)', borderRadius: 15 },
  modalImageContainer: { width: '100%', height: 200, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 20, marginTop: 10, position: 'relative' },
  modalImage: { width: '100%', height: '100%', resizeMode: 'contain', borderRadius: 15 },
  modalDiscountTag: { position: 'absolute', bottom: 10, right: 10, backgroundColor: '#DC2626', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15, elevation: 3 },
  modalDiscountText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
  modalTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  modalCategoryBox: { marginBottom: 15 },
  modalCategoryText: { fontSize: 14, fontWeight: '500' },
  modalPriceSection: { padding: 15, borderRadius: 10, borderWidth: 1, marginBottom: 15, alignItems: 'center' },
  modalOldPrice: { fontSize: 16, textDecorationLine: 'line-through', marginBottom: 2 },
  modalCurrentPrice: { fontSize: 24, fontWeight: 'bold' },
  modalStockBox: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 8, marginBottom: 20 },
  modalStockText: { fontSize: 14, marginLeft: 5 },
  modalDescriptionBox: { marginBottom: 20, borderTopWidth: 1, paddingTop: 15 },
  modalSectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 8 },
  modalDescriptionText: { fontSize: 14, lineHeight: 22 },
  modalAddBtn: { flexDirection: 'row', paddingVertical: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10, marginBottom: 10 },
  modalAddBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  
  cartModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  cartModalContainer: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '90%', minHeight: '50%', padding: 20 },
  cartModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 15, borderBottomWidth: 1, marginBottom: 15 },
  cartModalTitle: { fontSize: 20, fontWeight: 'bold' },
  cartItemCard: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
  cartItemImgBox: { width: 50, height: 50, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cartItemImg: { width: '100%', height: '100%', resizeMode: 'contain' },
  cartItemInfo: { flex: 1 },
  cartItemName: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  cartItemPrice: { fontSize: 13, marginBottom: 6 },
  cartItemControlsRow: { flexDirection: 'row', alignItems: 'center' },
  qtyControlContainerSmall: { flexDirection: 'row', alignItems: 'center', borderRadius: 4, height: 26, overflow: 'hidden' },
  qtyBtnSmall: { width: 26, height: '100%', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' },
  qtyControlTextSmall: { color: '#FFF', fontSize: 12, fontWeight: 'bold', paddingHorizontal: 10 },
  cartItemTotal: { fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  cartFooter: { borderTopWidth: 1, paddingTop: 15, marginTop: 10 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  totalsLabel: { fontSize: 14 },
  totalsValue: { fontSize: 14, fontWeight: 'bold' },
  totalsLabelTotal: { fontSize: 18, fontWeight: 'bold' },
  totalsValueTotal: { fontSize: 20, fontWeight: 'bold' },
  cartActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, gap: 10 },
  clearCartBtn: { flexDirection: 'row', backgroundColor: '#FEE2E2', padding: 15, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flex: 0.35 },
  clearCartText: { color: '#DC2626', fontWeight: 'bold', fontSize: 14 },
  checkoutBtn: { flexDirection: 'row', padding: 15, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flex: 0.65 },
  checkoutBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 }
});