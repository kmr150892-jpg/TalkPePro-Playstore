import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  // @ts-ignore
  getReactNativePersistence,
  initializeAuth
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

// ✅ TalkPe Firebase Configuration (SECURED VIA ENV)
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY, 
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  // 🔥 NEW: RTDB URL ADDED FOR PRESENCE SYSTEM 🔥
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL
};

// 🚀 Initialize Firebase App (Prevention of multiple initializations)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ✅ Persistence Logic: Ithu thaan User login-ah maintain pannum
// 🛡️ SYNCED: Strict persistence handling to prevent session ghosting during logout loops
export const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web' 
    ? browserLocalPersistence 
    : getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app); 

export default app;