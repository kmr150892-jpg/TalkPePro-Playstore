import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { createUserWithEmailAndPassword, GoogleAuthProvider, sendEmailVerification, sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT THEME SYNC V2)
const calculateUserLevel = (totalSpent: number) => {
  if (totalSpent >= 500000001) return { lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#ff0000', secondaryColor: '#660000', anim: 'titan', themeBg: ['#1A0000', '#000000'] }; 
  if (totalSpent >= 100000001) return { lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#ff0dba', secondaryColor: '#a50606', anim: 'mythic', themeBg: ['#15001A', '#000000'] }; 
  if (totalSpent >= 50000000) return { lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#f6f60d', secondaryColor: '#02fa0a', anim: 'grandmaster', themeBg: ['#08001A', '#000000'] };
  if (totalSpent >= 10000000) return { lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#f52b6092', anim: 'explosion', themeBg: ['#00101A', '#000000'] };
  if (totalSpent >= 5000000) return { lvl: 4, label: 'LEGENDARY NODE', status: 'NEBULA COMMANDER', color: '#d0630a', secondaryColor: '#5f0bf0', anim: 'nebula', themeBg: ['#0A001A', '#000000'] };
  if (totalSpent >= 1000000) return { lvl: 3, label: 'DIAMOND CORE', status: 'NUCLEAR ASSET', color: '#bcde4a', secondaryColor: '#09bbf1fe', anim: 'diamond', themeBg: ['#001A0A', '#000000'] };
  if (totalSpent >= 200001) return { lvl: 2, label: 'GOLD OPERATIVE', status: 'ROYAL STRIKER', color: '#ffae00', secondaryColor: '#ac4a4a', anim: 'sparkle', themeBg: ['#1A0B00', '#000000'] };
  if (totalSpent >= 1) return { lvl: 1, label: 'SILVER AGENT', status: 'STAR FAME', color: '#0f33e7', secondaryColor: '#6b0402', anim: 'wave', themeBg: ['#050505', '#000000'] };
  return { lvl: 0, label: 'BEGINNER', status: 'NEW RECRUIT', color: '#94A3B8', secondaryColor: '#475569', anim: 'wave', themeBg: ['#020617', '#000000'] };
};

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [totalSpent, setTotalSpent] = useState(0); 
  
  const [showLoginUI, setShowLoginUI] = useState(false);
  
  // 🔥 SATTI UPDATE: EULA Checkbox Tracker State
  const [eulaAccepted, setEulaAccepted] = useState(false);

  // 🔥 NEW: 18+ AGE CONFIRMATION (required for USER and HOST, Google + Email)
  const [ageConfirmed, setAgeConfirmed] = useState(false);

  // 🔥 NEW: EMAIL + PASSWORD LOGIN STATES (for Play Store reviewer / test accounts)
  const [loginMethod, setLoginMethod] = useState<'google' | 'email' | null>(null); // null = choose method screen
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  // 🔥 NEW: EMAIL SIGN UP + FORGOT PASSWORD STATES
  const [emailMode, setEmailMode] = useState<'login' | 'signup'>('login');
  const [nameInput, setNameInput] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [layoutH, setLayoutH] = useState(0);
  const baseLayoutH = useRef(0);

  const router = useRouter();

  // 🔥 Track keyboard so the email popup always lifts above it
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // If Android already resized the screen for the keyboard, don't lift twice
  const resizedBy = baseLayoutH.current > 0 ? Math.max(0, baseLayoutH.current - layoutH) : 0;
  const keyboardOffset = keyboardHeight > 0 ? Math.max(0, keyboardHeight - resizedBy) : 0;

  // 🔥 UPDATED (EDIT 1): STEP-BY-STEP ANDROID BACK BUTTON (same behavior as the on-screen back arrows)
  useEffect(() => {
    const backAction = () => {
      // Splash-la irundha exit
      if (showSplash) {
        BackHandler.exitApp();
        return true;
      }
      // Email / Google screen-la irundha -> "Choose login method" ku back
      if (showLoginUI && loginMethod !== null) {
        Keyboard.dismiss();
        setLoginMethod(null);
        setPasswordInput('');
        return true;
      }
      // "Choose login method" la irundha -> "Proceed to secure login" ku back
      if (showLoginUI && loginMethod === null) {
        setShowLoginUI(false);
        return true;
      }
      // First screen-la irundha mattum exit
      BackHandler.exitApp();
      return true;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, [showSplash, showLoginUI, loginMethod]);

  // 🔥 CORE ANIMATION REFS
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const slideAnim = useRef(new Animated.Value(height)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current; 
  const bgScaleAnim = useRef(new Animated.Value(1)).current; 

  const talkScale = useRef(new Animated.Value(0)).current;
  const peScale = useRef(new Animated.Value(5)).current; 
  const peOpacity = useRef(new Animated.Value(0)).current;
  const magicFloat = useRef(new Animated.Value(-50)).current; 

  const cardFloat1 = useRef(new Animated.Value(0)).current;
  const cardFloat2 = useRef(new Animated.Value(0)).current;
  
  // 🔥 SATTI FIX: EXACT MATH CALCULATION FOR CAROUSEL 🔥
  const scrollX = useRef(new Animated.Value(0)).current;
  const innerWidth = width - 44; 

  // 🔄 FULL SCREEN VIDEO Setup
  const videoSource = require('../assets/images/welcome-girl.mp4');
  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
  });

  useEffect(() => {
    if (showLoginUI) {
      player.play();
    } else {
      player.pause();
    }
  }, [showLoginUI, player]);

  // 🔥 SATTI NEW EMAIL FIX 🔥 
  const MY_ADMIN_EMAIL = "kmr150892@gmail.com"; 

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '2462622395-lu12nsjfs82pakt79mptl66p96qmeds4.apps.googleusercontent.com',
      offlineAccess: true,
    });

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 10000, useNativeDriver: true }))
    ]).start();

    Animated.loop(
        Animated.sequence([
            Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
        ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bgScaleAnim, { toValue: 1.05, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bgScaleAnim, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(cardFloat1, { toValue: -4, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(cardFloat1, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ).start();
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(cardFloat2, { toValue: -4, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(cardFloat2, { toValue: 0, duration: 3000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ).start();

    Animated.sequence([
      Animated.delay(200),
      Animated.spring(magicFloat, { toValue: 0, friction: 4, tension: 30, useNativeDriver: true }),
      Animated.parallel([
        Animated.spring(talkScale, { toValue: 1, friction: 4, tension: 50, useNativeDriver: true }),
        Animated.sequence([
            Animated.delay(150),
            Animated.parallel([
                Animated.timing(peOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
                Animated.spring(peScale, { toValue: 1, friction: 3, tension: 70, useNativeDriver: true })
            ])
        ])
      ])
    ]).start();

    const timer = setTimeout(() => {
      setShowSplash(false);
      Animated.spring(slideAnim, { toValue: 0, tension: 20, useNativeDriver: true }).start();
    }, 3500); 

    return () => clearTimeout(timer);
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });

  const orbTranslateY = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -40]
  });

  const handleLogin = async (selectedRole: 'user' | 'expert') => {
    if (!eulaAccepted) {
        Alert.alert(
            "Agreement Required", 
            "You must agree to our strict safety policies regarding No Nudity & Harassment before continuing."
        );
        return;
    }

    if (!ageConfirmed) {
        Alert.alert("Age Confirmation Required", "You must confirm that you are 18 years or older to continue.");
        return;
    }

    setLoading(true);
    await AsyncStorage.setItem('@is_logging_in', 'true');
    await AsyncStorage.setItem('@intended_role', selectedRole);

    let authSuccess = false; 

    try {
      // Standard Google Sign-in flow
      await GoogleSignin.hasPlayServices();

      // 🔥 UPDATED: Clear the cached Google account so the "Choose an account" popup ALWAYS shows 🔥
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        console.log("Google signOut (account chooser reset) skipped:", e);
      }

      const response = await GoogleSignin.signIn();
      const idToken = response.data ? response.data.idToken : (response as any).idToken;
      const credential = GoogleAuthProvider.credential(idToken);

      const result = await signInWithCredential(auth, credential);
      const resultUser = result.user;

      if (!resultUser) throw new Error("Auth user not found");
      authSuccess = true; 
      
      const uid = resultUser.uid;
      const userEmail = resultUser.email; 

      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      // 💾 DATABASE UPDATE LOGIC 💾
      if (userSnap.exists()) {
        const existingData = userSnap.data();
        if (existingData.isBlocked === true) {
          await signOut(auth); 
          setLoading(false);
          Alert.alert("Account Locked", "Your account has been restricted for security reasons. Please contact support.");
          return;
        }

        // 🔥 NEW: 🔒 ROLE LOCK (Google login) - a HOST account can never enter as USER, and a USER account can never enter as HOST 🔒
        // Alert fires directly from this screen (no GateKeeper race / spinner screen), and the intended role is cleared
        // before sign-out so GateKeeper does not fire a duplicate "Access Denied" alert.
        const lockRole = existingData.role;
        const lockStatus = existingData.status;
        const isAdminAccount = userEmail === MY_ADMIN_EMAIL || lockRole === 'admin';
        if (!isAdminAccount) {
          const isHostAccount =
            lockRole === 'expert' ||
            existingData.isApplying === true ||
            existingData.registrationInProgress === true ||
            (!!lockStatus && lockStatus !== 'User');

          if (isHostAccount && selectedRole === 'user') {
            await AsyncStorage.removeItem('@intended_role');
            await signOut(auth);
            setLoading(false);
            Alert.alert("Access Denied", "This account is for Hosts only. You cannot login as a User.");
            return;
          }
          if (!isHostAccount && selectedRole === 'expert') {
            await AsyncStorage.removeItem('@intended_role');
            await signOut(auth);
            setLoading(false);
            Alert.alert("Access Denied", "This account is for Users only. You cannot switch to Host.");
            return;
          }
        }

        setTotalSpent(existingData.totalSpentDiamonds || 0);

        // Simple Sync: Update only login info. DO NOT TOUCH name/photo/status/role!
let updateData: any = {
  lastLogin: serverTimestamp(),
};

// Name / photo Firestore-la illaina mattum Gmail value fill pannu (existing custom value overwrite aagaadhu)
if (!existingData.name && resultUser.displayName) {
  updateData.name = resultUser.displayName;
}
if (!existingData.photoURL && resultUser.photoURL) {
  updateData.photoURL = resultUser.photoURL;
}

await setDoc(userRef, updateData, { merge: true });

      } else {
        // 🆕 COMPLETELY NEW USER DB CREATION 🆕
        const finalRole = (userEmail === MY_ADMIN_EMAIL) ? 'admin' : 'user';

        let isFreeAvailable = true;
        let freeMins = 3; 
        const hasUsedFree = await AsyncStorage.getItem('talkpe_welcome_used');
        if (hasUsedFree === 'true') {
            isFreeAvailable = false; 
            freeMins = 0;
        } else {
            await AsyncStorage.setItem('talkpe_welcome_used', 'true');
        }

        const baseUserData = {
          uid: uid,
          isAdultConfirmed: true,
          name: resultUser.displayName,
          email: resultUser.email,
          role: finalRole, 
          photoURL: resultUser.photoURL,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          isBlocked: false,
          isWelcomeCallAvailable: (selectedRole === 'user' && finalRole !== 'admin') ? isFreeAvailable : false, 
          freeMinsRemaining: (selectedRole === 'user' && finalRole !== 'admin') ? freeMins : 0,
          registrationInProgress: (selectedRole === 'expert' && finalRole !== 'admin'), 
        };

        if (selectedRole === 'expert' && finalRole !== 'admin') {
          // New Host -> Direct to Register Page without stopping at Login Screen
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
            isApplying: false, 
          });
        } else {
          await setDoc(userRef, {
            ...baseUserData,
            status: finalRole === 'admin' ? "Active" : "User",
            balance: 0,
          });
        }
      }

      // 🚀 BULLETPROOF ROUTING ENGINE 🚀
      const finalSnap = await getDoc(userRef);
      const finalData = finalSnap.exists() ? finalSnap.data() : {};
      
      const statusDB = finalData.status;
      const roleDB = finalData.role;

      if (userEmail === MY_ADMIN_EMAIL || roleDB === 'admin') {
          router.replace('/(admin)' as any); 
      } else if (selectedRole === 'expert' || roleDB === 'expert') {
          
          if (statusDB === 'Active' || roleDB === 'expert') {
              console.log("Host is active. Sending to dashboard...");
              router.replace('/expert/dashboard' as any); 
          } 
          else if (statusDB === 'Pending' || finalData.isApplying) {
              console.log("Host is pending. Sending to waiting approval...");
              router.replace('/waiting-approval' as any); 
          }
          else {
              console.log("Host is new/rejected. Sending to register form...");
              // 🔥 Directly routing to Register Page where Camera logic is available
              router.replace('/expert-register' as any); 
          }
      } else {
          router.replace('/(tabs)' as any); 
      }

    } catch (error: any) {
      if (authSuccess) {
          console.log("⚠️ Safe Ignore: GateKeeper intentionally cancelled the login DB sync.");
      } else {
          console.log("❌ Login Error:", error);
          // 🔥 UPDATED (EDIT 2): Google fail message now also points the reviewer to Email & Password
          Alert.alert("Authentication Error", "Unable to sign in with Google at the moment. Please check your internet connection, or go back and use Email & Password.");
      }
    } finally {
      await AsyncStorage.removeItem('@is_logging_in');
      setLoading(false);
    }
  };

  // 🔥 NEW: EMAIL + PASSWORD LOGIN (existing accounts only - same routing as Google login) 🔥
  const handleEmailLogin = async (selectedRole: 'user' | 'expert') => {
    if (!eulaAccepted) {
        Alert.alert(
            "Agreement Required", 
            "You must agree to our strict safety policies regarding No Nudity & Harassment before continuing."
        );
        return;
    }

    if (!ageConfirmed) {
        Alert.alert("Age Confirmation Required", "You must confirm that you are 18 years or older to continue.");
        return;
    }

    if (!emailInput.trim() || !passwordInput) {
        Alert.alert("Missing Details", "Please enter your email and password.");
        return;
    }

    setEmailLoading(true);
    await AsyncStorage.setItem('@is_logging_in', 'true');

    // 🔥 FIX: '@intended_role' = 'expert' is set ONLY AFTER all checks pass (see below).
    // If it is set before login, GateKeeper pushes a USER account into the Host registration form before the role check finishes.
    if (selectedRole === 'user') {
      await AsyncStorage.setItem('@intended_role', 'user');
    } else {
      await AsyncStorage.removeItem('@intended_role');
    }

    let authSuccess = false;

    try {
      const result = await signInWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      const resultUser = result.user;

      if (!resultUser) throw new Error("Auth user not found");
      authSuccess = true;

      const uid = resultUser.uid;
      const userEmail = resultUser.email;

      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      // Email login is only for existing profiles (no new profile creation here)
      if (!userSnap.exists()) {
        await signOut(auth);
        setEmailLoading(false);
        Alert.alert("Account Not Found", "No profile is linked to this email. Please sign in with Google.");
        return;
      }

      const existingData = userSnap.data();
      if (existingData.isBlocked === true) {
        await signOut(auth);
        setEmailLoading(false);
        Alert.alert("Account Locked", "Your account has been restricted for security reasons. Please contact support.");
        return;
      }
      // 📧 EMAIL VERIFY CHECK: accounts created via app Sign Up must verify their email first
      // (accounts without the flag, e.g. Play Store reviewer/test accounts, are not affected)
      if (existingData.emailVerifyRequired === true && !resultUser.emailVerified) {
        let resent = true;
        try {
          await sendEmailVerification(resultUser);
        } catch (e) {
          resent = false;
          console.log("resend verification skipped:", e);
        }
        await signOut(auth);
        setEmailLoading(false);
        Alert.alert(
          "Email Not Verified",
          resent
            ? `Please verify your email first. We have sent a new verification link to ${userEmail}. Open it (check Spam/Junk too), then login again.`
            : "Please verify your email first. Open the verification link we sent earlier (check Spam/Junk too), then login again."
        );
        return;
      }

      // 🔒 ROLE LOCK: a HOST account can never enter as USER, and a USER account can never enter as HOST 🔒
      const lockRole = existingData.role;
      const lockStatus = existingData.status;
      const isAdminAccount = userEmail === MY_ADMIN_EMAIL || lockRole === 'admin';
      if (!isAdminAccount) {
        const isHostAccount =
          lockRole === 'expert' ||
          existingData.isApplying === true ||
          existingData.registrationInProgress === true ||
          (!!lockStatus && lockStatus !== 'User');

        if (isHostAccount && selectedRole === 'user') {
          await signOut(auth);
          setEmailLoading(false);
          Alert.alert("Host Account", "This email is registered as a HOST. Please use LOGIN AS HOST.");
          return;
        }
        if (!isHostAccount && selectedRole === 'expert') {
          await signOut(auth);
          setEmailLoading(false);
          Alert.alert("User Account", "This email is registered as a USER. Please use LOGIN AS USER.");
          return;
        }
      }

      setTotalSpent(existingData.totalSpentDiamonds || 0);

      // Update only login info. DO NOT TOUCH status/role!
      await setDoc(userRef, { lastLogin: serverTimestamp() }, { merge: true });

      // ✅ All checks passed (verified + role lock) -> now it is safe to tell GateKeeper the intended role
      if (selectedRole === 'expert') {
        await AsyncStorage.setItem('@intended_role', 'expert');
      }

      // 🚀 SAME ROUTING ENGINE AS GOOGLE LOGIN 🚀
      const finalSnap = await getDoc(userRef);
      const finalData = finalSnap.exists() ? finalSnap.data() : {};

      const statusDB = finalData.status;
      const roleDB = finalData.role;

      setPasswordInput('');

      if (userEmail === MY_ADMIN_EMAIL || roleDB === 'admin') {
          router.replace('/(admin)' as any); 
      } else if (selectedRole === 'expert' || roleDB === 'expert') {

          if (statusDB === 'Active' || roleDB === 'expert') {
              router.replace('/expert/dashboard' as any); 
          } 
          else if (statusDB === 'Pending' || finalData.isApplying) {
              router.replace('/waiting-approval' as any); 
          }
          else {
              router.replace('/expert-register' as any); 
          }
      } else {
          router.replace('/(tabs)' as any); 
      }

    } catch (error: any) {
      if (authSuccess) {
          console.log("⚠️ Safe Ignore: GateKeeper intentionally cancelled the login DB sync.");
      } else {
          console.log("❌ Email Login Error:", error);
          const code = error?.code || '';
          if (code === 'auth/invalid-email') {
              Alert.alert("Login Failed", "Please enter a valid email address.");
          } else if (code === 'auth/too-many-requests') {
              Alert.alert("Login Failed", "Too many attempts. Please try again later.");
          } else if (code === 'auth/network-request-failed') {
              Alert.alert("Login Failed", "Network error. Please check your internet connection.");
          } else if (code === 'auth/operation-not-allowed') {
              Alert.alert("Login Failed", "Email & Password login is not enabled for this app. Please enable it in Firebase Authentication.");
          } else if (code === 'auth/user-disabled') {
              Alert.alert("Login Failed", "This account has been disabled. Please contact support.");
          } else {
              Alert.alert("Login Failed", "Incorrect email or password.");
          }
      }
    } finally {
      await AsyncStorage.removeItem('@is_logging_in');
      setEmailLoading(false);
    }
  };

  // 🔥 NEW: EMAIL SIGN UP (creates Auth account + Firestore profile automatically, same data as Google new user) 🔥
  const handleEmailSignup = async (selectedRole: 'user' | 'expert') => {
    if (!eulaAccepted) {
        Alert.alert(
            "Agreement Required",
            "You must agree to our strict safety policies regarding No Nudity & Harassment before continuing."
        );
        return;
    }

    if (!ageConfirmed) {
        Alert.alert("Age Confirmation Required", "You must confirm that you are 18 years or older to continue.");
        return;
    }

    if (!nameInput.trim() || !emailInput.trim() || !passwordInput) {
        Alert.alert("Missing Details", "Please enter your name, email and password.");
        return;
    }

    if (passwordInput.length < 6) {
        Alert.alert("Weak Password", "Password must be at least 6 characters.");
        return;
    }

    setEmailLoading(true);
    await AsyncStorage.setItem('@is_logging_in', 'true');
    // NOTE: '@intended_role' is intentionally NOT set on sign up. The account must verify its email first;
    // the role is applied when the user logs in after verification.

    let authSuccess = false;
    let createdUser: any = null;

    try {
      const result = await createUserWithEmailAndPassword(auth, emailInput.trim(), passwordInput);
      const resultUser = result.user;

      if (!resultUser) throw new Error("Auth user not found");
      authSuccess = true;
      createdUser = resultUser;

      try {
        await updateProfile(resultUser, { displayName: nameInput.trim() });
      } catch (e) {
        console.log("updateProfile skipped:", e);
      }

      const uid = resultUser.uid;
      const userEmail = resultUser.email;
      const userRef = doc(db, "users", uid);

      // 🆕 NEW USER DB CREATION (same structure as Google new user) 🆕
      const finalRole = (userEmail === MY_ADMIN_EMAIL) ? 'admin' : 'user';

      let isFreeAvailable = true;
      let freeMins = 3;
      const hasUsedFree = await AsyncStorage.getItem('talkpe_welcome_used');
      if (hasUsedFree === 'true') {
          isFreeAvailable = false;
          freeMins = 0;
      } else {
          await AsyncStorage.setItem('talkpe_welcome_used', 'true');
      }

      const baseUserData = {
        uid: uid,
        isAdultConfirmed: true,
        emailVerifyRequired: true,
        name: nameInput.trim(),
        email: resultUser.email,
        role: finalRole,
        photoURL: resultUser.photoURL || null,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp(),
        isBlocked: false,
        isWelcomeCallAvailable: (selectedRole === 'user' && finalRole !== 'admin') ? isFreeAvailable : false,
        freeMinsRemaining: (selectedRole === 'user' && finalRole !== 'admin') ? freeMins : 0,
        registrationInProgress: (selectedRole === 'expert' && finalRole !== 'admin'),
      };

      if (selectedRole === 'expert' && finalRole !== 'admin') {
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
          isApplying: false,
        });
      } else {
        await setDoc(userRef, {
          ...baseUserData,
          status: finalRole === 'admin' ? "Active" : "User",
          balance: 0,
        });
      }

      // 📧 Send verification mail - account CANNOT login until the email is verified
      let verifyMailSent = true;
      try {
        await sendEmailVerification(resultUser);
      } catch (e) {
        verifyMailSent = false;
        console.log("sendEmailVerification failed:", e);
      }

      // Logout until the email is verified
      try {
        await signOut(auth);
      } catch (e) {
        console.log("signOut after signup skipped:", e);
      }

      setPasswordInput('');
      setEmailMode('login');
      Alert.alert(
        "Verify Your Email",
        verifyMailSent
          ? `We sent a verification link to ${userEmail}. Please open it (also check Spam/Junk folder), then come back and login.`
          : "Your account was created, but we could not send the verification mail right now. Please try to login and we will send it again."
      );

    } catch (error: any) {
      if (authSuccess && createdUser) {
          // Profile creation failed after Auth account was created -> remove the half-created account so the user can retry cleanly
          console.log("❌ Email Signup profile error:", error);
          try { await createdUser.delete(); } catch (e) { console.log("cleanup delete skipped:", e); }
          try { await signOut(auth); } catch (e) {}
          Alert.alert("Sign Up Failed", "Could not finish creating your account. Please try again.");
      } else {
          console.log("❌ Email Signup Error:", error);
          const code = error?.code || '';
          if (code === 'auth/email-already-in-use') {
              Alert.alert("Sign Up Failed", "This email is already registered. Please login, or use 'Forgot password?' to set a password.");
          } else if (code === 'auth/invalid-email') {
              Alert.alert("Sign Up Failed", "Please enter a valid email address.");
          } else if (code === 'auth/weak-password') {
              Alert.alert("Sign Up Failed", "Password must be at least 6 characters.");
          } else if (code === 'auth/network-request-failed') {
              Alert.alert("Sign Up Failed", "Network error. Please check your internet connection.");
          } else if (code === 'auth/operation-not-allowed') {
              Alert.alert("Sign Up Failed", "Email & Password sign up is not enabled for this app. Please enable it in Firebase Authentication.");
          } else {
              Alert.alert("Sign Up Failed", "Unable to create your account at the moment. Please try again.");
          }
      }
    } finally {
      await AsyncStorage.removeItem('@is_logging_in');
      setEmailLoading(false);
    }
  };

  // 🔥 NEW: FORGOT PASSWORD (also lets Google-created accounts set a password) 🔥
  const handleForgotPassword = async () => {
    if (!emailInput.trim()) {
        Alert.alert("Enter Email", "Please type your email above first, then tap 'Forgot password?'.");
        return;
    }
    try {
      await sendPasswordResetEmail(auth, emailInput.trim());
      Alert.alert("Check Your Email", "If an account exists for this email, a password reset link has been sent. Please also check your spam folder.");
    } catch (error: any) {
      console.log("❌ Password Reset Error:", error);
      const code = error?.code || '';
      if (code === 'auth/invalid-email') {
          Alert.alert("Reset Failed", "Please enter a valid email address.");
      } else if (code === 'auth/network-request-failed') {
          Alert.alert("Reset Failed", "Network error. Please check your internet connection.");
      } else if (code === 'auth/too-many-requests') {
          Alert.alert("Reset Failed", "Too many attempts. Please try again later.");
      } else {
          Alert.alert("Check Your Email", "If an account exists for this email, a password reset link has been sent. Please also check your spam folder.");
      }
    }
  };

  const borderType1 = {
      borderLeftWidth: 2,
      borderRightWidth: 2,
      borderTopWidth: 2,
      borderBottomWidth: 2,
      borderLeftColor: '#f47207', 
      borderRightColor: '#fc7107', 
      borderTopColor: 'rgba(246, 10, 226, 0.98)',
      borderBottomColor: 'rgb(255, 2, 255)',
  };

  return (
    <View
      style={styles.container}
      onLayout={(e) => {
        const h = e.nativeEvent.layout.height;
        if (keyboardHeight === 0) baseLayoutH.current = h;
        setLayoutH(h);
      }}
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: bgScaleAnim }] }]}>
          <LinearGradient 
            colors={['#690efc', '#8815f4', '#F43F8D', '#FB7185', '#F97316']} 
            style={StyleSheet.absoluteFill} 
          />
      </Animated.View>
      
      <Animated.View style={[styles.shimmerOrb, { top: 50, right: -60, backgroundColor: '#061af8', transform: [{ translateY: orbTranslateY }] }] } />
      <Animated.View style={[styles.shimmerOrb, { bottom: 150, left: -60, backgroundColor: '#f805cf', transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }] } />

      <Animated.View style={[styles.glowCircle, { transform: [{ rotate: spin }] }]}>
          <LinearGradient colors={['rgba(255, 42, 133, 0.1)', 'rgba(134, 239, 172, 0.1)']} style={styles.glowInner} />
      </Animated.View>

      {!showSplash && showLoginUI && (
        <View style={StyleSheet.absoluteFill}>
          <VideoView
            player={player}
            style={styles.fullTopVideo}
            contentFit="cover"
          />
          <LinearGradient 
            colors={['rgba(2, 6, 23, 0.3)', 'rgba(2, 6, 23, 0.9)']} 
            style={StyleSheet.absoluteFill} 
          />
        </View>
      )}

      <View style={[styles.header, showSplash ? styles.headerCentered : styles.headerTop]}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ scale: scaleAnim }, { translateY: magicFloat }], alignItems: 'center' }}>
          {!showSplash && showLoginUI && (
              <View style={styles.logoTextContainer}>
                  <Animated.Text style={[styles.logoTextTalk, { color: '#bf00ff', textShadowColor: 'rgb(0, 0, 0)', transform: [{ scale: talkScale }] }]}>TALKPE</Animated.Text>
                  <Animated.Text style={[styles.logoTextPe, { color: '#fc6a02', textShadowColor: 'rgba(0,0,0,0.8)', opacity: peOpacity, transform: [{ scale: peScale }] }]}>PRO</Animated.Text>
              </View>
          )}
        </Animated.View>
        
        {showSplash && (
          <View style={styles.splashTextContainer}>
              <Animated.Text style={[styles.tagline, { opacity: fadeAnim }]}>Empowering Conversations</Animated.Text>
              <ActivityIndicator color="#FFFFFF" style={{marginTop: 20}} />
          </View>
        )}
      </View>

      {!showSplash && (
        <Animated.View style={[
          styles.bottomSection, 
          showLoginUI && loginMethod !== 'email' && { top: undefined, bottom: 50, paddingHorizontal: 0, height: loginMethod === 'google' ? height * 0.42 : height * 0.34 },
          showLoginUI && loginMethod === 'email' && { top: undefined, bottom: keyboardOffset > 0 ? keyboardOffset + 10 : 50, paddingHorizontal: 0 },
          { transform: [{ translateY: slideAnim }] }
        ]}>
          
          {!showLoginUI ? (
            <View style={styles.transparentFormContainer}>
              
              <View style={styles.instructionRow}>
                <Text style={styles.instructionFloating}>WHY JOIN TALKPE PRO?</Text>
                <Text style={styles.swipeHintFloating}>SWIPE ➔</Text>
              </View>
              
              {/* 🔥 ULTRA PREMIUM FULL SCREEN IMAGE CAROUSEL START 🔥 */}
              <View style={[styles.carouselContainer, { width: innerWidth }]}>
                <Animated.ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  scrollEventThrottle={16}
                  onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
                    { useNativeDriver: false }
                  )}
                >
                  
                  {/* 🔹 SLIDE 1: USER PORTAL 🔹 */}
                  <View style={[styles.cardWrapper, { width: innerWidth }]}>
                    <Animated.View style={{ flex: 1, width: '100%', height: '100%', transform: [{ translateY: cardFloat1 }] }}>
                      <Image 
                        source={require('../assets/images/user.png')} 
                        style={styles.fullImageCard} 
                        resizeMode="cover" 
                      />
                    </Animated.View>
                  </View>

                  {/* 🔹 SLIDE 2: HOST HUB 🔹 */}
                  <View style={[styles.cardWrapper, { width: innerWidth }]}>
                    <Animated.View style={{ flex: 1, width: '100%', height: '100%', transform: [{ translateY: cardFloat2 }] }}>
                      <Image 
                        source={require('../assets/images/host.png')} 
                        style={styles.fullImageCard} 
                        resizeMode="cover" 
                      />
                    </Animated.View>
                  </View>

                </Animated.ScrollView>
              </View>

              {/* 🔥 PAGINATION DOTS 🔥 */}
              <View style={styles.paginationDots}>
                {[0, 1].map((_, i) => {
                  const inputRange = [(i - 1) * innerWidth, i * innerWidth, (i + 1) * innerWidth];
                  const dotWidth = scrollX.interpolate({
                    inputRange,
                    outputRange: [8, 24, 8],
                    extrapolate: 'clamp',
                  });
                  const opacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.3, 1, 0.3],
                    extrapolate: 'clamp',
                  });
                  const bgColor = scrollX.interpolate({
                    inputRange,
                    outputRange: ['#CBD5E1', i === 0 ? '#7B2FF7' : '#F97316', '#CBD5E1'],
                    extrapolate: 'clamp',
                  });
                  return (
                    <Animated.View
                      key={i}
                      style={[styles.dot, { width: dotWidth, opacity, backgroundColor: bgColor }]}
                    />
                  );
                })}
              </View>

              <TouchableOpacity onPress={() => setShowLoginUI(true)} activeOpacity={0.8} style={{ width: '100%' }}>
                <LinearGradient 
                  colors={['#6102f9', '#fd6a00']} 
                  start={{x: 0, y: 0}} 
                  end={{x: 1, y: 1}} 
                  style={[styles.btnMass, { shadowColor: '#7B2FF7', shadowOpacity: 0.9, shadowRadius: 20 }]}
                >
                  <Text style={styles.btnTextUser} adjustsFontSizeToFit numberOfLines={1}>PROCEED TO SECURE LOGIN</Text>
                </LinearGradient>
              </TouchableOpacity>

              <Text style={styles.footerTextFloating}>🛡️ JOIN OUR COMMUNITY</Text>
            </View>

          ) : loginMethod === null ? (

            <BlurView 
              intensity={40} 
              tint="dark" 
              style={[
                styles.blurCard, 
                borderType1, 
                { flex: 1, paddingVertical: 15, paddingHorizontal: 25, justifyContent: 'center' } 
              ]}
            >
              <View style={[styles.formContainer, { flex: 1, justifyContent: 'space-evenly' }]}>
                {/* 🔥 UPDATED: BACK ARROW BESIDE "CHOOSE LOGIN METHOD" TITLE -> GOES BACK TO "PROCEED TO SECURE LOGIN" PAGE 🔥 */}
                <View style={[styles.titleRow, { marginBottom: 12 }]}>
                  <TouchableOpacity
                    onPress={() => { Keyboard.dismiss(); setLoginMethod(null); setPasswordInput(''); setShowLoginUI(false); }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={styles.inlineBackBtn}
                  >
                    <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                  <Text style={[styles.instructionCenter, { marginBottom: 0 }]}>CHOOSE LOGIN METHOD</Text>
                </View>

                <TouchableOpacity onPress={() => setLoginMethod('google')} activeOpacity={0.8}>
                  <LinearGradient colors={['#7B2FF7', '#F43F8D', '#F97316']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.btnMass, { marginTop: 12, paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', gap: 10 }]}>
                      <Ionicons name="logo-google" size={18} color="#FFFFFF" />
                      <Text style={styles.btnTextUser} adjustsFontSizeToFit numberOfLines={1}>CONTINUE WITH GOOGLE</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setLoginMethod('email')} activeOpacity={0.8}>
                  <LinearGradient colors={['#F97316', '#F43F8D', '#7B2FF7']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.btnMass, { marginTop: 12, paddingVertical: 18, flexDirection: 'row', justifyContent: 'center', gap: 10 }]}>
                      <Ionicons name="mail" size={18} color="#FFFFFF" />
                      <Text style={styles.btnTextExpert} adjustsFontSizeToFit numberOfLines={1}>EMAIL & PASSWORD</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </BlurView>

          ) : loginMethod === 'email' ? (

            <BlurView 
              intensity={40} 
              tint="dark" 
              style={[
                styles.blurCard, 
                borderType1, 
                { paddingVertical: 18, paddingHorizontal: 22 } 
              ]}
            >
              {/* 🔥 UPDATED: BACK ARROW BESIDE "LOGIN WITH EMAIL" TITLE (LEFT SIDE) 🔥 */}
              <View style={styles.titleRow}>
                {!emailLoading && (
                  <TouchableOpacity
                    onPress={() => { Keyboard.dismiss(); setLoginMethod(null); setPasswordInput(''); }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                    style={styles.inlineBackBtn}
                  >
                    <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
                <Text style={[styles.instructionCenter, { marginBottom: 0 }]}>{emailMode === 'signup' ? 'SIGN UP WITH EMAIL' : 'LOGIN WITH EMAIL'}</Text>
              </View>

              {/* 🔥 NEW: NAME FIELD (SIGN UP ONLY) 🔥 */}
              {emailMode === 'signup' && (
                <View style={styles.emailInputWrap}>
                  <Ionicons name="person-outline" size={20} color="#94A3B8" />
                  <TextInput
                    placeholder="Full Name"
                    placeholderTextColor="#64748B"
                    value={nameInput}
                    onChangeText={setNameInput}
                    autoCapitalize="words"
                    autoCorrect={false}
                    style={styles.emailInput}
                  />
                </View>
              )}

              <View style={styles.emailInputWrap}>
                <Ionicons name="mail-outline" size={20} color="#94A3B8" />
                <TextInput
                  placeholder="Email"
                  placeholderTextColor="#64748B"
                  value={emailInput}
                  onChangeText={setEmailInput}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={styles.emailInput}
                />
              </View>

              <View style={styles.emailInputWrap}>
                <Ionicons name="lock-closed-outline" size={20} color="#94A3B8" />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#64748B"
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.emailInput}
                />
                <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
                  <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.eulaContainer} onPress={() => setEulaAccepted(!eulaAccepted)} activeOpacity={0.8}>
                  <Ionicons name={eulaAccepted ? "checkbox" : "square-outline"} size={25} color={eulaAccepted ? "#02fa0a" : "#CBD5E1"} />
                  <Text style={styles.eulaText}>
                      I agree to the strict no-nudity, no-harassment <Text style={styles.eulaLink} onPress={() => Alert.alert("Terms & Conditions", "Strict Policies:\n\n1. No Nudity or Sexual Content.\n2. No Harassment or Abuse.\n3. Respect all users.\n\nViolators will be permanently banned from TalkPe Pro.")}>Terms & Conditions</Text>. Violators will be banned.
                  </Text>
              </TouchableOpacity>

              {/* 🔥 NEW: 18+ AGE CONFIRMATION CHECKBOX 🔥 */}
              <TouchableOpacity style={styles.eulaContainer} onPress={() => setAgeConfirmed(!ageConfirmed)} activeOpacity={0.8}>
                  <Ionicons name={ageConfirmed ? "checkbox" : "square-outline"} size={25} color={ageConfirmed ? "#02fa0a" : "#CBD5E1"} />
                  <Text style={styles.eulaText}>I confirm that I am 18 years of age or older.</Text>
              </TouchableOpacity>

              {emailLoading ? (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="large" color="#A855F7" />
                  <Text style={styles.loadingText}>AUTHENTICATING...</Text>
                </View>
              ) : (
                <>
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                  <TouchableOpacity onPress={() => (emailMode === 'signup' ? handleEmailSignup('user') : handleEmailLogin('user'))} activeOpacity={0.8} style={{ flex: 1 }}>
                    <LinearGradient colors={['#7B2FF7', '#F43F8D', '#F97316']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.btnMass, { paddingVertical: 16, padding: 0 }]}>
                        <Text style={styles.btnTextUser} adjustsFontSizeToFit numberOfLines={1}>{emailMode === 'signup' ? 'SIGN UP AS USER' : 'LOGIN AS USER'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>

                  <TouchableOpacity onPress={() => (emailMode === 'signup' ? handleEmailSignup('expert') : handleEmailLogin('expert'))} activeOpacity={0.8} style={{ flex: 1 }}>
                    <LinearGradient colors={['#F97316', '#F43F8D', '#7B2FF7']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.btnMass, { paddingVertical: 16, padding: 0 }]}>
                        <Text style={styles.btnTextExpert} adjustsFontSizeToFit numberOfLines={1}>{emailMode === 'signup' ? 'SIGN UP AS HOST' : 'LOGIN AS HOST'}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                {/* 🔥 NEW: FORGOT PASSWORD + SIGN UP / LOGIN TOGGLE 🔥 */}
                <View style={styles.emailLinksRow}>
                  {emailMode === 'login' ? (
                    <TouchableOpacity onPress={handleForgotPassword} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.emailSmallLink}>Forgot password?</Text>
                    </TouchableOpacity>
                  ) : (
                    <View />
                  )}
                  <TouchableOpacity
                    onPress={() => { setEmailMode(emailMode === 'login' ? 'signup' : 'login'); setPasswordInput(''); }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.emailSmallLink}>{emailMode === 'login' ? 'New user? Sign up' : 'Already have an account? Login'}</Text>
                  </TouchableOpacity>
                </View>
                </>
              )}
            </BlurView>

          ) : (

            <BlurView 
              intensity={40} 
              tint="dark" 
              style={[
                styles.blurCard, 
                borderType1, 
                { flex: 1, paddingVertical: 15, paddingHorizontal: 25, justifyContent: 'center' } 
              ]}
            >
              <View style={[styles.formContainer, { flex: 1, justifyContent: 'space-evenly' }]}>
                {loading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#A855F7" />
                    <Text style={styles.loadingText}>AUTHENTICATING...</Text>
                  </View>
                ) : (
                  <>
                    {/* 🔥 UPDATED: BACK ARROW BESIDE "CHOOSE YOUR PROFILE" TITLE (LEFT SIDE) 🔥 */}
                    <View style={[styles.titleRow, { marginBottom: 12 }]}>
                      <TouchableOpacity
                        onPress={() => { Keyboard.dismiss(); setLoginMethod(null); setPasswordInput(''); }}
                        activeOpacity={0.7}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={styles.inlineBackBtn}
                      >
                        <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
                      </TouchableOpacity>
                      <Text style={[styles.instructionCenter, { marginBottom: 0 }]}>CHOOSE YOUR PROFILE</Text>
                    </View>

                    {/* 🔥 SATTI UPDATE: EULA Checkbox UI Start 🔥 */}
                    <TouchableOpacity style={styles.eulaContainer} onPress={() => setEulaAccepted(!eulaAccepted)} activeOpacity={0.8}>
                        <Ionicons name={eulaAccepted ? "checkbox" : "square-outline"} size={25} color={eulaAccepted ? "#02fa0a" : "#CBD5E1"} />
                        <Text style={styles.eulaText}>
                            I agree to the strict no-nudity, no-harassment <Text style={styles.eulaLink} onPress={() => Alert.alert("Terms & Conditions", "Strict Policies:\n\n1. No Nudity or Sexual Content.\n2. No Harassment or Abuse.\n3. Respect all users.\n\nViolators will be permanently banned from TalkPe Pro.")}>Terms & Conditions</Text>. Violators will be banned.
                        </Text>
                    </TouchableOpacity>
                    {/* 🔥 SATTI UPDATE: EULA Checkbox UI End 🔥 */}

                    {/* 🔥 NEW: 18+ AGE CONFIRMATION CHECKBOX 🔥 */}
                    <TouchableOpacity style={styles.eulaContainer} onPress={() => setAgeConfirmed(!ageConfirmed)} activeOpacity={0.8}>
                        <Ionicons name={ageConfirmed ? "checkbox" : "square-outline"} size={25} color={ageConfirmed ? "#02fa0a" : "#CBD5E1"} />
                        <Text style={styles.eulaText}>I confirm that I am 18 years of age or older.</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity onPress={() => handleLogin('user')} activeOpacity={0.8}>
                      <LinearGradient colors={['#7B2FF7', '#F43F8D', '#F97316']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.btnMass, { marginTop: 12, paddingVertical: 18 }]}>
                          <Text style={styles.btnTextUser} adjustsFontSizeToFit numberOfLines={1}>CONTINUE AS USER</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleLogin('expert')} activeOpacity={0.8}>
                      <LinearGradient colors={['#F97316', '#F43F8D', '#7B2FF7']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.btnMass, { marginTop: 12, paddingVertical: 18 }]}>
                          <Text style={styles.btnTextExpert} adjustsFontSizeToFit numberOfLines={1}>CONTINUE AS HOST</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </BlurView>
          )}

        </Animated.View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  shimmerOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.15 },
  glowCircle: { position: 'absolute', top: -100, right: -100, width: 300, height: 300, opacity: 2},
  glowInner: { flex: 1, borderRadius: 150 },
  fullTopVideo: { ...StyleSheet.absoluteFillObject },
  header: { alignItems: 'center', zIndex: 10 }, 
  headerTop: { marginTop: 30 }, 
  headerCentered: { flex: 1, justifyContent: 'center', marginTop: 50 },
  logoTextContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logoTextTalk: { fontSize: 50, fontWeight: '900', letterSpacing: 1, textShadowOffset: {width: 0, height: 10}, textShadowRadius: 15 },
  logoTextPe: { fontSize:50, fontWeight: '900', letterSpacing: 1, textShadowOffset: {width: 0, height: 10}, textShadowRadius: 15, marginLeft: 8 },
  splashTextContainer: { alignItems: 'center', marginTop: 30, gap: 10 },
  tagline: { fontSize: 13, color: '#FFFFFF', fontWeight: '900', letterSpacing: 3, textTransform: 'uppercase', opacity: 0.8 },
  
  bottomSection: { position: 'absolute', top: 55, bottom: 40, width: '100%', paddingHorizontal: 20, zIndex: 10, justifyContent: 'flex-end' }, 
  blurCard: { padding: 30, borderRadius: 35, overflow: 'hidden', backgroundColor: 'rgba(5, 5, 10, 0.7)' }, 
  formContainer: { justifyContent: 'center', width: '100%' },
  transparentFormContainer: { flex: 1, width: '100%', alignItems: 'center', justifyContent: 'space-between' }, 
  carouselContainer: { flex: 1, width: '100%' }, 
  cardWrapper: { justifyContent: 'center', alignItems: 'center' }, 
  fullImageCard: { width: '100%', height: '100%', borderRadius: 25, borderWidth: 8, borderColor: 'rgba(255, 2, 2, 0.22)', backgroundColor: 'transparent' }, 

  instructionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingHorizontal: 8, marginBottom: 15 },
  instructionCenter: { textAlign: 'center', color: '#CBD5E1', marginBottom: 5, fontSize: 12, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },

  instructionFloating: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 10 },
  swipeHintFloating: { color: '#F97316', fontSize: 13, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 10 },
  
  paginationDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 8, gap: 5 },
  dot: { height: 6, borderRadius: 3 },
  
  loadingBox: { alignItems: 'center', padding: 30 },
  loadingText: { marginTop: 1, color: '#f309d0', fontWeight: '900', fontSize: 15, letterSpacing:1.5, textTransform: 'uppercase' },
  
  btnMass: { padding: 20, borderRadius: 30, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }, 
  btnTextUser: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 12 },
  btnTextExpert: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 12 },
  
  footerText: { textAlign: 'center', marginTop: 15, color: 'rgba(249, 249, 250, 0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  footerTextFloating: { textAlign: 'center', marginTop: 10, marginBottom: 5, color: 'rgba(255, 255, 255, 0.8)', fontSize: 10, fontWeight: '900', letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 8 },

  eulaContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 5, paddingHorizontal: 5 },
  eulaText: { color: '#CBD5E1', fontSize: 10, marginLeft: 8, flex: 1, lineHeight: 14, fontWeight: '600' },
  eulaLink: { color: '#F97316', fontWeight: 'bold', textDecorationLine: 'underline' },

  // 🔥 NEW: EMAIL LOGIN STYLES
  emailLinkWrap: { position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center', zIndex: 20 },
  emailLinkBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 16 },
  emailLinkText: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.9)', textShadowRadius: 8 },
  emailModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)', paddingHorizontal: 20 },
  emailModalScroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 30 },
  emailModalBox: { width: '100%', borderRadius: 30, padding: 22, backgroundColor: 'rgba(15, 23, 42, 0.97)' },
  emailModalTitle: { textAlign: 'center', color: '#CBD5E1', marginBottom: 16, fontSize: 12, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  emailInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 16, paddingHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  emailInput: { flex: 1, color: '#FFF', fontWeight: '600', fontSize: 15, paddingVertical: 14 },
  emailCancelText: { color: '#94A3B8', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },

  // 🔥 UPDATED: TOP-LEFT BACK BUTTON STYLES
  backBtnWrap: { position: 'absolute', top: (StatusBar.currentHeight || 30) + 10, left: 16, zIndex: 30 },
  backBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },

  // 🔥 UPDATED: TITLE ROW WITH LEFT BACK ARROW
  emailLinksRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, paddingHorizontal: 4 },
  emailSmallLink: { color: '#F97316', fontSize: 12, fontWeight: '800', letterSpacing: 0.5, textDecorationLine: 'underline' },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 12, minHeight: 34 },
  inlineBackBtn: { position: 'absolute', left: 0, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }
});
