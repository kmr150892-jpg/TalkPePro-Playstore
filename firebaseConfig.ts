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

// ✅ TalkPe Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyC3GVk8LQq8iWvPEzn-1xpTv3Bx3LECz8M", 
  authDomain: "talkpe-67db0.firebaseapp.com",
  projectId: "talkpe-67db0",
  storageBucket: "talkpe-67db0.firebasestorage.app",
  messagingSenderId: "2462622395",
  appId: "1:2462622395:android:300e86e1028fb134a87f9e"
};

// 🚀 Initialize Firebase App (Prevention of multiple initializations)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ✅ Persistence Logic: Ithu thaan User login-ah maintain pannum
// Web-la browser storage, Mobile-la AsyncStorage use pannuvom.
export const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web' 
    ? browserLocalPersistence 
    : getReactNativePersistence(AsyncStorage)
});

export const db = getFirestore(app);
export const storage = getStorage(app); 

export default app;