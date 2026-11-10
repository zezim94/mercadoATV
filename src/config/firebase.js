import { initializeApp } from "firebase/app";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyDa-713oSrGQiJ-4uBvHqwYbnvAvpZQX56",
  authDomain: "mercado-b76de.firebaseapp.com",
  projectId: "mercado-b76de",
  storageBucket: "mercado-b76de.firebasestorage.app",
  messagingSenderId: "613403850039",
  appId: "1:613403850039:web:6e1a1d1c7a48b2d74516b2",
  measurementId: "G-QRFXJKTYP6"
};

const app = initializeApp(firebaseConfig);

// Inicializa a autenticação com memória persistente
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});
export const db = getFirestore(app);
export const storage = getStorage(app);