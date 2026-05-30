import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { GoogleAuthProvider, signInWithCredential, signOut } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  StatusBar,
  StyleSheet,
  Text,
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
  
  const router = useRouter();

  useEffect(() => {
    const backAction = () => {
      BackHandler.exitApp();
      return true; 
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction,
    );

    return () => backHandler.remove();
  }, []);

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
  
  // 🔥 SATTI FIX: EXACT MATH CALCULATION FOR CAROUSEL TO STOP CLIPPING/PEEKING 🔥
  const scrollX = useRef(new Animated.Value(0)).current;
  // Screen Width - (BottomSection Padding 24) - (BlurCard Padding 40) - (BlurCard Borders 4) = Exact 68px offset
  const innerWidth = width - 68; 

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
    setLoading(true);
    await AsyncStorage.setItem('@is_logging_in', 'true');
    await AsyncStorage.setItem('@intended_role', selectedRole);

    let authSuccess = false; // 🔥 SATTI FIX: Tracking flag to detect GateKeeper interruption

    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data ? response.data.idToken : (response as any).idToken;
      const credential = GoogleAuthProvider.credential(idToken);

      const result = await signInWithCredential(auth, credential);
      
      // ✅ If it reaches here, Google Login was successful! 
      // Any error after this is because GateKeeper intentionally signed them out.
      authSuccess = true; 
      
      const uid = result.user.uid;
      const userEmail = result.user.email; 

      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      let finalRole: string = 'user'; 
      let expertStatus: string | null = null;
      let isAlreadyApplying: boolean = false; 

      if (userSnap.exists()) {
        const existingData = userSnap.data();
        if (existingData.isBlocked === true) {
          await signOut(auth); 
          setLoading(false);
          Alert.alert("Account Locked", "Your account has been restricted for security reasons. Please contact support.");
          return;
        }
        setTotalSpent(existingData.totalSpentDiamonds || 0);

        finalRole = (userEmail === MY_ADMIN_EMAIL) ? 'admin' : existingData.role;
        expertStatus = existingData.status || null;
        isAlreadyApplying = existingData.isApplying || false; 

        // 🔥 THE MASTER PLAN FIX 🔥
        const isDraftExpert = existingData.registrationInProgress === true && existingData.role === 'user';
        const isApprovedOrPendingExpert = existingData.role === 'expert' || existingData.status === 'Active' || existingData.status === 'Pending' || existingData.isApplying === true;

        // 1. STRICT CLIENT LOCK: Oru thadava Normal User aagitta eppavum User thaan. Consultant-nu amukkuna amaidhiya Client-kuke anuppidum.
        if (selectedRole === 'expert' && existingData.role === 'user' && finalRole !== 'admin' && !isDraftExpert) {
            selectedRole = 'user'; 
        }

        // 2. CONSULTANT LOCK: Oru thadava Verified Consultant aagitta eppavum Consultant thaan. Client-nu amukkuna Dashboard-kuke anuppidum.
        if (selectedRole === 'user' && isApprovedOrPendingExpert && finalRole !== 'admin') {
            selectedRole = 'expert'; 
        }

        let updateData: any = {
          name: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
          lastLogin: serverTimestamp(),
        };

        if (finalRole === 'admin') {
            updateData.role = 'admin';
        }

        if (selectedRole === 'user' && isDraftExpert && finalRole !== 'admin') {
            // 3. DRAFT ESCAPE (Manasu Maatram) -> Let them become a Client permanently.
            updateData.registrationInProgress = false;
            updateData.isApplying = false;
            updateData.status = "User"; 
        } else if (selectedRole === 'expert' && finalRole !== 'admin') {
            // Keep role as user for safety, just mark them as in progress
            if (existingData.role === 'user') {
                updateData.registrationInProgress = true;  
            }
        } else if (finalRole !== 'admin') {
            updateData.registrationInProgress = false; 
        }

        // We only push updateData. Firebase 'merge: true' leaves role untouched unless Admin! No crash!
        await setDoc(userRef, updateData, { merge: true });

      } else {
        
        // 🔥 ALL NEW USERS ARE 'USER' BY DEFAULT 🔥
        finalRole = 'user'; 
        if (userEmail === MY_ADMIN_EMAIL) finalRole = 'admin';

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
          name: result.user.displayName,
          email: result.user.email,
          role: finalRole, // ALWAYS 'user' (or admin)
          photoURL: result.user.photoURL,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          isBlocked: false,
          isWelcomeCallAvailable: (selectedRole === 'user' && finalRole !== 'admin') ? isFreeAvailable : false, 
          freeMinsRemaining: (selectedRole === 'user' && finalRole !== 'admin') ? freeMins : 0,
          registrationInProgress: (selectedRole === 'expert' && finalRole !== 'admin'), 
        };

        if (selectedRole === 'expert' && finalRole !== 'admin') {
          // Store them as a USER internally, but setup expert fields to wait for admin approval
          expertStatus = "New"; 
          await setDoc(userRef, {
            ...baseUserData,
            status: "New", // Status New, but Role is strictly user!
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

      // Final Routing
      if (finalRole === 'admin') {
        router.replace('/(admin)' as any); 
      } else if (selectedRole === 'expert') {
        if ((finalRole === 'expert' || expertStatus === 'Active') && expertStatus === "Active") {
            router.replace('/expert/dashboard' as any); 
        } 
        else if (isAlreadyApplying || expertStatus === 'Pending') {
            router.replace('/waiting-approval' as any); 
        }
        else {
            router.replace('/expert-register' as any); 
        }
      } else {
        router.replace('/(tabs)' as any); 
      }

    } catch (error: any) {
      // 🔥 SATTI SMART ERROR HANDLER 🔥
      if (authSuccess) {
          // Auth aana piragu error vantha, athu GateKeeper sign out pannathunaala vantha error thaan.
          console.log("⚠️ Safe Ignore: GateKeeper intentionally aborted the login DB sync.");
      } else {
          // Unmaiyave internet illana, athu auth aagarathukku munnadiye intha block-ku vanthidum.
          console.log("❌ Login Error:", error);
          Alert.alert("Authentication Error", "Unable to sign in at the moment. Please check your internet connection.");
      }
    } finally {
      await AsyncStorage.removeItem('@is_logging_in');
      setLoading(false);
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: bgScaleAnim }] }]}>
          <LinearGradient 
            colors={['#7B2FF7', '#A855F7', '#F43F8D', '#FB7185', '#F97316']} 
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
          {!showSplash && (
              <View style={styles.logoTextContainer}>
                  <Animated.Text style={[styles.logoTextTalk, { color: '#bf00ff', textShadowColor: 'rgb(0, 0, 0)', transform: [{ scale: talkScale }] }]}>TALKPE</Animated.Text>
                  <Animated.Text style={[styles.logoTextPe, { color: '#F97316', textShadowColor: 'rgba(0,0,0,0.8)', opacity: peOpacity, transform: [{ scale: peScale }] }]}>PRO</Animated.Text>
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
        <Animated.View style={[styles.bottomSection, { transform: [{ translateY: slideAnim }] }]}>
          <BlurView intensity={40} tint="dark" style={[styles.blurCard, borderType1]}>
            
            {!showLoginUI ? (
              <View style={styles.formContainer}>
                
                <View style={styles.instructionRow}>
                  <Text style={styles.instruction}>WHY JOIN TALKPE PRO?</Text>
                  <Text style={styles.swipeHint}>SWIPE ➔</Text>
                </View>
                
                {/* 🔥 ULTRA PREMIUM CAROUSEL DESIGN START 🔥 */}
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
                    
                    {/* 🔹 SLIDE 1: CLIENT PORTAL 🔹 */}
                    <View style={[styles.cardWrapper, { width: innerWidth }]}>
                      <Animated.View style={{ flex: 1, transform: [{ translateY: cardFloat1 }] }}>
                        <LinearGradient 
                          colors={['rgba(168, 85, 247, 0.25)', 'rgba(2, 6, 23, 0.9)']} 
                          style={[styles.benefitBox, { borderColor: 'rgba(168, 85, 247, 0.6)' }]}
                        >
                          {/* 🔥 CENTRED PREMIUM HEADER 🔥 */}
                          <View style={styles.benefitHeader}>
                              <View style={[styles.iconWrapper, { shadowColor: '#A855F7', backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                                  <Text style={styles.benefitIconTop}>💎</Text>
                              </View>
                              <View style={styles.headerTextStack}>
                                  <Text style={[styles.benefitTitle, { color: '#E9D5FF' }]}>CLIENT PORTAL</Text>
                                  <Text style={styles.benefitSubText}>Verified Expert Interactions</Text>
                              </View>
                          </View>

                          {/* 🔥 NEAT & LARGE BULLET POINTS 🔥 */}
                          <View style={styles.benefitList}>
                              <Text style={styles.benefitBullet}>💎  <Text style={styles.highlightText}>Up to 3 Mins</Text> Free Consultation</Text>
                              <Text style={styles.benefitBullet}>💎  Access <Text style={styles.highlightText}>Interactive</Text> Skill Activities</Text>
                              <Text style={styles.benefitBullet}>💎  100% <Text style={styles.highlightText}>Secure & Private</Text> Network</Text>
                              <Text style={styles.benefitBullet}>💎  Join <Text style={styles.highlightText}>Free Forums</Text> & Broadcasts</Text>
                          </View>
                        </LinearGradient>
                      </Animated.View>
                    </View>

                    {/* 🔹 SLIDE 2: CONSULTANT HUB 🔹 */}
                    <View style={[styles.cardWrapper, { width: innerWidth }]}>
                      <Animated.View style={{ flex: 1, transform: [{ translateY: cardFloat2 }] }}>
                        <LinearGradient 
                          colors={['rgba(249, 115, 22, 0.25)', 'rgba(2, 6, 23, 0.9)']} 
                          style={[styles.benefitBox, { borderColor: 'rgba(249, 115, 22, 0.6)' }]}
                        >
                          {/* 🔥 CENTRED PREMIUM HEADER 🔥 */}
                          <View style={styles.benefitHeader}>
                              <View style={[styles.iconWrapper, { shadowColor: '#F97316', backgroundColor: 'rgba(249, 115, 22, 0.2)' }]}>
                                  <Text style={styles.benefitIconTop}>🌟</Text>
                              </View>
                              <View style={styles.headerTextStack}>
                                  <Text style={[styles.benefitTitle, { color: '#FFEDD5' }]}>CONSULTANT HUB</Text>
                                  <Text style={styles.benefitSubText}>Monetize Your Expertise</Text>
                              </View>
                          </View>

                          {/* 🔥 NEAT & LARGE BULLET POINTS 🔥 */}
                          <View style={styles.benefitList}>
                              <Text style={styles.benefitBullet}>🌟  Host Premium <Text style={styles.highlightText}>Live Broadcasts</Text></Text>
                              <Text style={styles.benefitBullet}>🌟  Create Engauge <Text style={styles.highlightText}>Skill Activities</Text></Text>
                              <Text style={styles.benefitBullet}>🌟  High-Yield <Text style={styles.highlightText}>Consultation Rewards</Text></Text>
                              <Text style={styles.benefitBullet}>🌟  Verified, <Text style={styles.highlightText}>Safe & Private</Text> Platform</Text>
                          </View>
                        </LinearGradient>
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
                      outputRange: ['#CBD5E1', i === 0 ? '#A855F7' : '#F97316', '#CBD5E1'],
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
                {/* 🔥 ULTRA PREMIUM CAROUSEL DESIGN END 🔥 */}

                <TouchableOpacity onPress={() => setShowLoginUI(true)} activeOpacity={0.8}>
                  <LinearGradient 
                    colors={['#f309d0', '#F97316']} 
                    start={{x: 0, y: 0}} 
                    end={{x: 1, y: 1}} 
                    style={[styles.btnMass, { shadowColor: '#f309d0', shadowOpacity: 0.9, shadowRadius: 20 }]}
                  >
                    <Text style={styles.btnTextUser} adjustsFontSizeToFit numberOfLines={1}>PROCEED TO SECURE LOGIN</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

            ) : (

              <View style={styles.formContainer}>
                {loading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#A855F7" />
                    <Text style={styles.loadingText}>AUTHENTICATING...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.instructionCenter}>SELECT YOUR PROFESSIONAL ROLE</Text>
                    
                    <TouchableOpacity onPress={() => handleLogin('user')} activeOpacity={0.8}>
                      <LinearGradient colors={['#7B2FF7', '#F43F8D', '#F97316']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.btnMass, { marginTop: 15 }]}>
                          <Text style={styles.btnTextUser} adjustsFontSizeToFit numberOfLines={1}>CONTINUE AS CLIENT</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleLogin('expert')} activeOpacity={0.8}>
                      <LinearGradient colors={['#F97316', '#F43F8D', '#7B2FF7']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.btnMass, { marginTop: 15 }]}>
                          <Text style={styles.btnTextExpert} adjustsFontSizeToFit numberOfLines={1}>CONTINUE AS CONSULTANT</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            <Text style={styles.footerText}>🛡️ END-TO-END ENCRYPTED ACCESS</Text>
          </BlurView>
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
  headerTop: { marginTop: 40 }, 
  headerCentered: { flex: 1, justifyContent: 'center', marginTop: 10 },
  logoTextContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logoTextTalk: { fontSize: 50, fontWeight: '900', letterSpacing: 1, textShadowOffset: {width: 0, height: 10}, textShadowRadius: 15 },
  logoTextPe: { fontSize: 50, fontWeight: '900', letterSpacing: 1, textShadowOffset: {width: 0, height: 10}, textShadowRadius: 15, marginLeft: 8 },
  splashTextContainer: { alignItems: 'center', marginTop: 30, gap: 10 },
  tagline: { fontSize: 13, color: '#FFFFFF', fontWeight: '900', letterSpacing: 3, textTransform: 'uppercase', opacity: 0.8 },
  
  bottomSection: { position: 'absolute', bottom: 20, width: '100%', padding: 12, paddingBottom: 25, zIndex: 10 }, 
  
  blurCard: { padding: 20, borderRadius: 35, overflow: 'hidden', backgroundColor: 'rgba(5, 5, 10, 0.7)' }, 
  formContainer: { width: '100%' },
  
  instructionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, paddingHorizontal: 12 },
  instruction: { color: '#CBD5E1', fontSize: 13, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  instructionCenter: { textAlign: 'center', color: '#CBD5E1', marginBottom: 5, fontSize: 12, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  swipeHint: { color: '#F97316', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  
  carouselContainer: { height: 450, marginTop: 5 }, 
  cardWrapper: { paddingHorizontal: 0, paddingTop: 25, paddingBottom: 3 }, 
  
  paginationDots: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 10, gap: 5 },
  dot: { height: 6, borderRadius: 3 },
  
  benefitBox: { flex: 1, padding: 5, borderRadius: 24, borderWidth: 1.5, elevation: 200, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 8, position: 'relative' },
  
  benefitHeader: { alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.15)', paddingBottom: 30, paddingTop:15 }, 
  iconWrapper: { padding: 20, borderRadius: 20, marginBottom: 15, borderWidth: 3, borderColor: 'rgba(255,255,255,0.2)', elevation: 200, shadowOpacity: 0.9, shadowRadius: 10 }, 
  benefitIconTop: { fontSize: 34 }, 
  headerTextStack: { alignItems: 'center' },
  benefitTitle: { fontWeight: '900', fontSize: 22, letterSpacing: 3, textAlign: 'center' }, 
  benefitSubText: { color: '#94A3B8', fontSize: 13, fontWeight: '800', marginTop: 5, letterSpacing: 1, textAlign: 'center' }, 
  
  benefitList: { paddingHorizontal: 9, gap: 20 }, 
  benefitBullet: { color: '#E2E8F0', fontSize: 14, fontWeight: '700', letterSpacing: 0.5, lineHeight: 22 }, 
  highlightText: { color: '#FFF', fontWeight: '900' },
  
  loadingBox: { alignItems: 'center', padding: 30 },
  loadingText: { marginTop: 1, color: '#f309d0', fontWeight: '900', fontSize: 15, letterSpacing:1.5, textTransform: 'uppercase' },
  
  btnMass: { padding: 20, borderRadius: 30, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }, 
  btnTextUser: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 12 },
  btnTextExpert: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 12 },
  footerText: { textAlign: 'center', marginTop: 15, color: 'rgba(249, 249, 250, 0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 2 } 
});