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
  if (totalSpent >= 500000001) return { 
      lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#ff0000', secondaryColor: '#660000', anim: 'titan', themeBg: ['#1A0000', '#000000']
  }; 
  if (totalSpent >= 100000001) return { 
      lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#ff0dba', secondaryColor: '#a50606', anim: 'mythic', themeBg: ['#15001A', '#000000']
  }; 
  if (totalSpent >= 50000000) return { 
      lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#f6f60d', secondaryColor: '#02fa0a', anim: 'grandmaster', themeBg: ['#08001A', '#000000']
  };
  if (totalSpent >= 10000000) return { 
      lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#f52b6092', anim: 'explosion', themeBg: ['#00101A', '#000000']
  };
  if (totalSpent >= 5000000) return { 
      lvl: 4, label: 'LEGENDARY NODE', status: 'NEBULA COMMANDER', color: '#d0630a', secondaryColor: '#5f0bf0', anim: 'nebula', themeBg: ['#0A001A', '#000000']
  };
  if (totalSpent >= 1000000) return { 
      lvl: 3, label: 'DIAMOND CORE', status: 'NUCLEAR ASSET', color: '#bcde4a', secondaryColor: '#09bbf1fe', anim: 'diamond', themeBg: ['#001A0A', '#000000']
  };
  if (totalSpent >= 200001) return { 
      lvl: 2, label: 'GOLD OPERATIVE', status: 'ROYAL STRIKER', color: '#ffae00', secondaryColor: '#ac4a4a', anim: 'sparkle', themeBg: ['#1A0B00', '#000000']
  };
  return { 
      lvl: 1, label: 'SILVER AGENT', status: 'STAR FAME', color: '#0f33e7', secondaryColor: '#6b0402', anim: 'wave', themeBg: ['#050505', '#000000']
  };
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

  // 🔥 NEW MAGICAL TEXT ANIMATION REFS
  const talkScale = useRef(new Animated.Value(0)).current;
  const peScale = useRef(new Animated.Value(5)).current; 
  const peOpacity = useRef(new Animated.Value(0)).current;
  const magicFloat = useRef(new Animated.Value(-50)).current; 

  // 🔥 SATTI FIX: NEW ANIMATION REFS FOR ENGAGING CARDS
  const cardFloat1 = useRef(new Animated.Value(0)).current;
  const cardFloat2 = useRef(new Animated.Value(0)).current;

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

  const MY_ADMIN_UID = "9yFRrTeuOCd1twDDpBiNCp4U1yf1"; 

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

    // 🔥 SATTI FIX: ADDED FLOATING ANIMATIONS FOR PREMIUM CARDS
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
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      const idToken = response.data ? response.data.idToken : (response as any).idToken;
      const credential = GoogleAuthProvider.credential(idToken);

      const result = await signInWithCredential(auth, credential);
      const uid = result.user.uid;

      const userRef = doc(db, "users", uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.isBlocked === true) {
          await signOut(auth); 
          setLoading(false);
          Alert.alert("Account Locked", "Your account has been restricted for security reasons. Please contact support.");
          return;
        }
        setTotalSpent(userData.totalSpentDiamonds || 0);
      }

      let finalRole: string = 'user'; 
      let expertStatus: string | null = null;
      let isAlreadyApplying: boolean = false; 

      if (userSnap.exists()) {
        const existingData = userSnap.data();
        finalRole = (existingData.role === 'admin' || uid === MY_ADMIN_UID) ? 'admin' : existingData.role;
        expertStatus = existingData.status || null;
        isAlreadyApplying = existingData.isApplying || false; 

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
          role: finalRole, 
          photoURL: result.user.photoURL,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          isBlocked: false,
          isWelcomeCallAvailable: isFreeAvailable, 
          freeMinsRemaining: freeMins,
        };

        if (selectedRole === 'expert') {
          expertStatus = "New"; 
          await setDoc(userRef, {
            ...baseUserData,
            isWelcomeCallAvailable: false, 
            freeMinsRemaining: 0,
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
            balance: 0,
          });
        }
      }

      if (finalRole === 'admin') {
        router.replace('/(admin)' as any); 
      } else if (selectedRole === 'expert') {
        if (finalRole === 'expert' && expertStatus === "Active") {
            router.replace('/expert/dashboard' as any); 
        } 
        else if (isAlreadyApplying) {
            router.replace('/waiting-approval' as any); 
        }
        else {
            router.replace('/expert-register' as any); 
        }
      } else {
        router.replace('/(tabs)' as any); 
      }

    } catch (error: any) {
      console.log("❌ Login Error:", error);
      setLoading(false);
      if (error.code !== '-3') { 
          Alert.alert("Authentication Error", "Unable to sign in at the moment. Please check your internet connection.");
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: bgScaleAnim }] }]}>
          <LinearGradient 
            colors={['#7B2FF7', '#A855F7', '#F43F8D', '#FB7185', '#F97316']} 
            style={StyleSheet.absoluteFill} 
          />
      </Animated.View>
      
      <Animated.View style={[styles.shimmerOrb, { top: 50, right: -60, backgroundColor: '#061af8', transform: [{ translateY: orbTranslateY }] }]} />
      <Animated.View style={[styles.shimmerOrb, { bottom: 150, left: -60, backgroundColor: '#f805cf', transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

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
                <Text style={styles.instruction}>WHY JOIN TALKPE PRO?</Text>
                
                {/* 🔥 COMPACT PREMIUM ANIMATED CARDS 🔥 */}
                <View style={styles.benefitsContainer}>
                  
                  {/* CLIENT FEATURES - Floating Glassmorphism Design */}
                  <Animated.View style={{ transform: [{ translateY: cardFloat1 }] }}>
                    <LinearGradient 
                      colors={['rgba(168, 85, 247, 0.25)', 'rgba(2, 6, 23, 0.9)']} 
                      style={[styles.benefitBox, { borderColor: 'rgba(168, 85, 247, 0.6)' }]}
                    >
                      <View style={styles.badgeContainer}>
                          <LinearGradient colors={['#A855F7', '#7B2FF7']} style={styles.badgeLabel}>
                              <Text style={styles.badgeText}> WELCOME TIER</Text>
                          </LinearGradient>
                      </View>
                      
                      <View style={styles.benefitHeader}>
                          <View style={[styles.iconWrapper, { shadowColor: '#A855F7', backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}>
                              <Text style={styles.benefitIconTop}>💎</Text>
                          </View>
                          <View>
                              <Text style={[styles.benefitTitle, { color: '#E9D5FF' }]}>CLIENT PORTAL</Text>
                              <Text style={styles.benefitSubText}>Verified Expert Interactions</Text>
                          </View>
                      </View>
                      <View style={styles.benefitList}>
                          <Text style={styles.benefitBullet}>💎 <Text style={styles.highlightText}>Up to 3 Mins</Text> Free Consultation</Text>
                          <Text style={styles.benefitBullet}>💎 Access <Text style={styles.highlightText}>Interactive</Text> Skill Activities</Text>
                          <Text style={styles.benefitBullet}>💎 100% <Text style={styles.highlightText}>Secure & Private</Text> Network</Text>
                          <Text style={styles.benefitBullet}>💎 Join <Text style={styles.highlightText}>Free Forums</Text> & Broadcasts</Text>
                      </View>
                    </LinearGradient>
                  </Animated.View>
                  
                  {/* CONSULTANT FEATURES - Floating Glassmorphism Design */}
                  <Animated.View style={{ transform: [{ translateY: cardFloat2 }] }}>
                    <LinearGradient 
                      colors={['rgba(249, 115, 22, 0.25)', 'rgba(2, 6, 23, 0.9)']} 
                      style={[styles.benefitBox, { borderColor: 'rgba(249, 115, 22, 0.6)' }]}
                    >
                      <View style={styles.badgeContainer}>
                          <LinearGradient colors={['#F97316', '#EA580C']} style={styles.badgeLabel}>
                              <Text style={styles.badgeText}> PREMIUM PARTNER</Text>
                          </LinearGradient>
                      </View>
                      
                      <View style={styles.benefitHeader}>
                          <View style={[styles.iconWrapper, { shadowColor: '#F97316', backgroundColor: 'rgba(249, 115, 22, 0.2)' }]}>
                              <Text style={styles.benefitIconTop}>🌟</Text>
                          </View>
                          <View>
                              <Text style={[styles.benefitTitle, { color: '#FFEDD5' }]}>CONSULTANT HUB</Text>
                              <Text style={styles.benefitSubText}>Monetize Your Expertise</Text>
                          </View>
                      </View>
                      <View style={styles.benefitList}>
                          <Text style={styles.benefitBullet}>🌟 Host Premium <Text style={styles.highlightText}>Live Broadcasts</Text></Text>
                          <Text style={styles.benefitBullet}>🌟 Create Engauge <Text style={styles.highlightText}>Skill Activities</Text></Text>
                          <Text style={styles.benefitBullet}>🌟 High-Yield <Text style={styles.highlightText}>Consultation Rewards</Text></Text>
                          <Text style={styles.benefitBullet}>🌟 Verified, <Text style={styles.highlightText}>Safe & Private</Text> Platform</Text>
                      </View>
                    </LinearGradient>
                  </Animated.View>

                </View>

                <TouchableOpacity onPress={() => setShowLoginUI(true)} activeOpacity={0.8}>
                  <LinearGradient 
                    colors={['#f309d0', '#F97316']} 
                    start={{x: 0, y: 0}} 
                    end={{x: 1, y: 1}} 
                    style={[styles.btnMass, { marginTop: 10, shadowColor: '#f309d0', shadowOpacity: 0.9, shadowRadius: 20 }]}
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
                    <Text style={styles.instruction}>SELECT YOUR PROFESSIONAL ROLE</Text>
                    
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
  
  // 🔥 UPDATED: Moved up significantly to avoid hiding behind phone buttons
  bottomSection: { position: 'absolute', bottom: 20, width: '100%', padding: 12, paddingBottom: 25, zIndex: 10 }, 
  
  // 🔥 UPDATED: Increased padding slightly for larger appearance
  blurCard: { padding: 20, borderRadius: 35, overflow: 'hidden', backgroundColor: 'rgba(5, 5, 10, 0.7)' }, 
  formContainer: { width: '100%' },
  
  // 🔥 UPDATED: Increased gap, margins, paddings, and font sizes (~20%) 🔥
  benefitsContainer: { width: '100%', gap: 25, marginVertical: 15}, 
  benefitBox: { padding: 13, paddingTop: 20, borderRadius: 20, borderWidth: 1.5, elevation: 8, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.4, shadowRadius: 8, position: 'relative' },
  badgeContainer: { position: 'absolute', top: -14, right: 15, zIndex: 10, elevation: 15, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 5 },
  badgeLabel: { paddingHorizontal: 14, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' }, 
  benefitHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', paddingBottom: 12 }, 
  iconWrapper: { padding: 10, borderRadius: 12, marginRight: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', elevation: 12, shadowOpacity: 0.9, shadowRadius: 10 }, 
  benefitIconTop: { fontSize: 22 }, 
  benefitTitle: { fontWeight: '900', fontSize: 15, letterSpacing: 2 }, 
  benefitSubText: { color: '#94A3B8', fontSize: 11, fontWeight: '700', marginTop: 3, letterSpacing: 0.5 }, 
  benefitList: { paddingLeft: 5, gap: 8 }, 
  benefitBullet: { color: '#E2E8F0', fontSize: 13, fontWeight: '600', letterSpacing: 0.5 }, 
  highlightText: { color: '#FFF', fontWeight: '900' },
  
  loadingBox: { alignItems: 'center', padding: 30 },
  loadingText: { marginTop: 1, color: '#f309d0', fontWeight: '900', fontSize: 15, letterSpacing:1.5, textTransform: 'uppercase' },
  instruction: { textAlign: 'center', color: '#CBD5E1', marginBottom: 5, fontSize: 12, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  
  // 🔥 UPDATED: Made buttons larger to match the 20% scale up
  btnMass: { padding: 20, borderRadius: 30, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }, 
  btnTextUser: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 12 },
  btnTextExpert: { color: '#FFFFFF', fontSize: 15, fontWeight: '900', letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 12 },
  footerText: { textAlign: 'center', marginTop: 15, color: 'rgba(249, 249, 250, 0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 2 } 
});