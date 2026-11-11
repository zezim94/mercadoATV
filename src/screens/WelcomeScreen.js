import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export default function WelcomeScreen({ navigation }) {
  const { themeColors } = useTheme();

  // Animações
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handlePressIn = () => {
    Animated.spring(buttonScale, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(buttonScale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  const features = [
    { icon: 'package-variant-closed', label: 'Produtos', color: themeColors.primary },
    { icon: 'truck-delivery-outline', label: 'Fornecedores', color: themeColors.success },
    { icon: 'swap-horizontal', label: 'Movimentações', color: themeColors.warning },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Elemento decorativo de fundo */}
      <View
        style={[
          styles.blob,
          { backgroundColor: themeColors.primary, opacity: 0.08 },
        ]}
      />
      <View
        style={[
          styles.blobSmall,
          { backgroundColor: themeColors.success, opacity: 0.07 },
        ]}
      />

      <Animated.View
        style={[
          styles.content,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        {/* Logo + Título */}
        <View style={styles.logoContainer}>
          <View
            style={[
              styles.logoWrapper,
              { backgroundColor: themeColors.card, borderColor: themeColors.border },
            ]}
          >
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
            />
          </View>
          <Text style={[styles.title, { color: themeColors.textPrimary }]}>
            Mercado Local
          </Text>
          <Text style={[styles.subtitle, { color: themeColors.textSecondary }]}>
            Controle de Estoque
          </Text>
          <Text style={[styles.description, { color: themeColors.textSecondary }]}>
            Gerencie seus produtos, fornecedores e movimentações de forma simples e segura.
          </Text>
        </View>

        {/* Cards de features */}
        <View style={styles.featuresRow}>
          {features.map((f, index) => (
            <View
              key={index}
              style={[
                styles.featureCard,
                { backgroundColor: themeColors.card, borderColor: themeColors.border },
              ]}
            >
              <View
                style={[
                  styles.featureIconWrapper,
                  { backgroundColor: f.color + '20' },
                ]}
              >
                <MaterialCommunityIcons name={f.icon} size={22} color={f.color} />
              </View>
              <Text style={[styles.featureLabel, { color: themeColors.textPrimary }]}>
                {f.label}
              </Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Botão */}
      <Animated.View
        style={[
          styles.buttonWrapper,
          { opacity: fadeAnim, transform: [{ scale: buttonScale }] },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[styles.button, { backgroundColor: themeColors.primary }]}
          onPress={() => navigation.replace('Main')}
        >
          <Text style={styles.buttonText}>Entrar</Text>
          <View style={styles.arrowCircle}>
            <FontAwesome5 name="arrow-right" size={16} color={themeColors.primary} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingTop: 20,
    paddingBottom: 30,
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    width: width * 0.9,
    height: width * 0.9,
    borderRadius: width,
    top: -width * 0.4,
    right: -width * 0.3,
  },
  blobSmall: {
    position: 'absolute',
    width: width * 0.5,
    height: width * 0.5,
    borderRadius: width,
    bottom: -width * 0.2,
    left: -width * 0.15,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoWrapper: {
    width: 150,
    height: 150,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginBottom: 24,
    // Sombra
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 4 },
    }),
  },
  logo: {
    width: 120,
    height: 120,
    resizeMode: 'contain',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 6,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 16,
    textAlign: 'center',
    paddingHorizontal: 10,
  },
  featuresRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 10,
  },
  featureCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    marginHorizontal: 4,
  },
  featureIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  buttonWrapper: {
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignItems: 'center',
    marginHorizontal: 10,
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
      },
      android: { elevation: 6 },
    }),
  },
  buttonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginRight: 12,
  },
  arrowCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});