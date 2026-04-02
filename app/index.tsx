import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useRouter } from 'expo-router';
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../firebaseConfig';

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const MY_ADMIN_UID = "9yFRrTeuOCd1twDDpBiNCp4U1yf1"; 

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '2462622395-lu12nsjfs82pakt79mptl66p96qmeds4.apps.googleusercontent.com',
      offlineAccess: true,
    });

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 5, useNativeDriver: true })
    ]).start();

    const timer = setTimeout(() => {
      setShowSplash(false);
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true }).start();
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleLogin = async (selectedRole: 'user' | 'expert') => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data ? response.data.idToken : (response as any).idToken;
      const credential = GoogleAuthProvider.credential(idToken);

      const result = await signInWithCredential(auth, credential);
      const uid = result.user.uid;

      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      // 🛡️ BLOCK GUARD LOGIC
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.isBlocked === true) {
          await signOut(auth); 
          setLoading(false);
          Alert.alert(
            "Access Denied", 
            "Your account has been suspended. Please contact support for more information."
          );
          return;
        }
      }

      let finalRole: string = 'user'; 
      let expertStatus: string | null = null;
      let isAlreadyApplying: boolean = false; // 👈 Applying status check panna

      if (userSnap.exists()) {
        const existingData = userSnap.data();
        finalRole = (existingData.role === 'admin' || uid === MY_ADMIN_UID) ? 'admin' : existingData.role;
        expertStatus = existingData.status || null;
        isAlreadyApplying = existingData.isApplying || false; // 👈 Firestore-la irunthu status edukkurom

        await setDoc(userRef, {
          uid: uid,
          name: result.user.displayName,
          email: result.user.email,
          role: finalRole, 
          photoURL: result.user.photoURL,
          lastLogin: serverTimestamp(),
        }, { merge: true });

      } else {
        if (uid === MY_ADMIN_UID) finalRole = 'admin';

        const baseUserData = {
          uid: uid,
          name: result.user.displayName,
          email: result.user.email,
          role: finalRole, 
          photoURL: result.user.photoURL,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          isBlocked: false,
        };

        if (selectedRole === 'expert') {
          expertStatus = "New"; 
          await setDoc(userRef, {
            ...baseUserData,
            status: "New",
            currentLevel: 0,
            levelTitle: "BEGINNER",
            pricePerMin: 10,
            userPrice: 20,
            beans: 0,
            walletBalance: 0,
            followers: [],
            gallery: [],
            isApplying: false, // 👈 New user-ku initial-ah false
          });
        } else {
          await setDoc(userRef, {
            ...baseUserData,
            balance: 0,
          });
        }
      }

      // 🚀 MASS NAVIGATION LOGIC (With Review Protection)
      if (finalRole === 'admin') {
        router.replace('/(admin)' as any); 
      } else if (selectedRole === 'expert') {
        // 1. Approve aana expert-ah? -> Dashboard
        if (finalRole === 'expert' && expertStatus === "Active") {
            router.replace('/expert/dashboard' as any); 
        } 
        // 2. Already form fill panni review-la irukkaara? -> Waiting Screen
        else if (isAlreadyApplying) {
            router.replace('/waiting-approval' as any); 
        }
        // 3. First time apply panna poraara? -> Registration Form
        else {
            router.replace('/expert-register' as any); 
        }
      } else {
        router.replace('/(tabs)' as any); 
      }

    } catch (error: any) {
      console.log("❌ Login Error:", error);
      setLoading(false);
      Alert.alert("Login Failed", "Authentication failed. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#E6F4FE" />
      <View style={[styles.header, showSplash ? styles.headerCentered : null]}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }], alignItems: 'center' }}>
          <Image source={require('../assets/images/icon.png')} style={styles.logoImage} resizeMode="contain" />
          {!showSplash && <Text style={styles.logoText}>TalkPe</Text>}
        </Animated.View>
        {showSplash && <Animated.Text style={[styles.tagline, { opacity: fadeAnim, marginTop: 15 }]}>Your Expert Advice Partner</Animated.Text>}
      </View>

      {!showSplash && (
        <Animated.View style={[styles.bottomSection, { transform: [{ translateY: slideAnim }] }]}>
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Verifying Credentials...</Text>
            </View>
          ) : (
            <>
              <Text style={styles.instruction}>Login to continue as</Text>
              <TouchableOpacity style={[styles.btn, styles.userBtn]} onPress={() => handleLogin('user')} activeOpacity={0.8}>
                <Text style={styles.btnText}>👤 I am a User</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.expertBtn]} onPress={() => handleLogin('expert')} activeOpacity={0.8}>
                <Text style={styles.btnText}>👨‍🏫 I am an Expert</Text>
              </TouchableOpacity>
            </>
          )}
          <Text style={styles.footerText}>Google Secure Login</Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E6F4FE', padding: 25, justifyContent: 'space-between' },
  header: { marginTop: 60, alignItems: 'center' },
  headerCentered: { flex: 1, justifyContent: 'center', marginTop: 0 },
  logoImage: { width: 150, height: 150 },
  logoText: { fontSize: 44, fontWeight: '900', color: '#1E40AF', letterSpacing: -1, marginTop: 10 },
  tagline: { fontSize: 16, color: '#334155', fontWeight: '600' },
  bottomSection: { marginBottom: 40, backgroundColor: '#FFFFFF', padding: 25, borderRadius: 35, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20 },
  loadingBox: { alignItems: 'center', padding: 20 },
  loadingText: { marginTop: 15, color: '#3B82F6', fontWeight: '600' },
  instruction: { textAlign: 'center', color: '#64748B', marginBottom: 20, fontSize: 15, fontWeight: '700', textTransform: 'uppercase' },
  btn: { padding: 18, borderRadius: 20, width: '100%', alignItems: 'center', elevation: 2 },
  userBtn: { backgroundColor: '#3B82F6' },
  expertBtn: { backgroundColor: '#10B981', marginTop: 12 },
  btnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  footerText: { textAlign: 'center', marginTop: 25, color: '#94A3B8', fontSize: 12, fontWeight: '500' }
});