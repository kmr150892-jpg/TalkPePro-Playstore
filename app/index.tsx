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
  Dimensions,
  Easing,
  FlatList,
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
  
  // 🔄 NEW STATES FOR INTRO & EARNINGS
  const [showLoginUI, setShowLoginUI] = useState(false);
  const [selectedHours, setSelectedHours] = useState(4); 
  
  const router = useRouter();

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

  // 🔄 FULL SCREEN VIDEO Setup
  const videoSource = require('../assets/images/welcome-girl.mp4');
  const player = useVideoPlayer(videoSource, (player) => {
    player.loop = true;
    player.play();
  });

  const MY_ADMIN_UID = "9yFRrTeuOCd1twDDpBiNCp4U1yf1"; 

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '2462622395-lu12nsjfs82pakt79mptl66p96qmeds4.apps.googleusercontent.com',
      offlineAccess: true,
    });

    // Ambient Animations
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
      Animated.loop(Animated.timing(rotateAnim, { toValue: 1, duration: 10000, useNativeDriver: true }))
    ]).start();

    // Start Ambient Shimmer
    Animated.loop(
        Animated.sequence([
            Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
        ])
    ).start();

    // 🔥 Slow Breathing Background Animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(bgScaleAnim, { toValue: 1.05, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(bgScaleAnim, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ).start();

    // 🔥 MAGICAL TEXT ENTRANCE SEQUENCE
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

  // 🔄 DYNAMIC REACH CALCULATOR (1 hr = 500 reach, 15 hr = 12.5k reach)
  const calculateReach = (hours: number) => {
    const minReach = 100;
    const maxReach = 5000;
    const value = minReach + ((hours - 1) / 14) * (maxReach - minReach);
    return Math.round(value).toLocaleString('en-IN') + '+'; 
  };

  const hoursArray = Array.from({ length: 15 }, (_, i) => i + 1);

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
        let freeMins = 2; 

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

  const userTier = calculateUserLevel(totalSpent);

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

      {!showSplash && (
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
                  <Animated.Text style={[styles.logoTextTalk, { color: '#bf00ff', textShadowColor: 'rgb(0, 0, 0)', transform: [{ scale: talkScale }] }]}>TALK</Animated.Text>
                  <Animated.Text style={[styles.logoTextPe, { color: '#F97316', textShadowColor: 'rgba(0,0,0,0.8)', opacity: peOpacity, transform: [{ scale: peScale }] }]}>PE</Animated.Text>
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
          <BlurView intensity={30} tint="dark" style={[styles.blurCard, borderType1]}>
            
            {!showLoginUI ? (
              <View style={styles.formContainer}>
                <Text style={styles.instruction}>ESTIMATED GLOBAL VISIBILITY*</Text>
                
                <View style={styles.earningDisplayBox}>
                    <Text style={styles.rupeeSymbol}>month</Text>
                    <Text style={styles.earningAmount}>{calculateReach(selectedHours)}</Text>
                    <Text style={styles.perMonthText}>/ visits</Text>
                </View>

                <Text style={styles.subInstruction}>DAILY ACTIVE MENTORSHIP HOURS</Text>
          
                <View style={styles.sliderOuterWrapper}>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={hoursArray}
                    keyExtractor={(item) => item.toString()}
                    contentContainerStyle={styles.sliderContent}
                    renderItem={({ item }) => {
                      const isSelected = selectedHours === item;
                      return (
                        <TouchableOpacity 
                          onPress={() => setSelectedHours(item)}
                          style={[styles.hourBubble, isSelected && styles.hourBubbleSelected]}
                        >
                          <Text style={[styles.hourText, isSelected && styles.hourTextSelected]}>
                            {item}h
                          </Text>
                        </TouchableOpacity>
                      );
                    }}
                  />
                </View>

                <TouchableOpacity onPress={() => setShowLoginUI(true)} activeOpacity={0.8}>
                  <LinearGradient 
                    colors={['#f309d0', '#F97316']} 
                    start={{x: 0, y: 0}} 
                    end={{x: 1, y: 1}} 
                    style={[styles.btnMass, { marginTop: 25, shadowColor: '#f309d0', shadowOpacity: 0.8, shadowRadius: 15 }]}
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
                    <Text style={styles.loadingText}>CONNECTING...</Text>
                  </View>
                ) : (
                  <>
                    <Text style={styles.instruction}>CHOOSE YOUR PROFESSIONAL ROLE</Text>
                    
                    <TouchableOpacity onPress={() => handleLogin('user')} activeOpacity={0.8}>
                      <LinearGradient colors={['#7B2FF7', '#F43F8D', '#F97316']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.btnMass, { marginTop: 15 }]}>
                          <Text style={styles.btnTextUser} adjustsFontSizeToFit numberOfLines={1}>LOGIN AS CLIENT</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleLogin('expert')} activeOpacity={0.8}>
                      <LinearGradient colors={['#F97316', '#F43F8D', '#7B2FF7']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.btnMass, { marginTop: 15 }]}>
                          <Text style={styles.btnTextExpert} adjustsFontSizeToFit numberOfLines={1}>LOGIN AS CONSULTANT</Text>
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
  headerTop: { marginTop: 60 }, 
  headerCentered: { flex: 1, justifyContent: 'center', marginTop: 10 },
  logoTextContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  logoTextTalk: { fontSize: 65, fontWeight: '900', letterSpacing: 1, textShadowOffset: {width: 0, height: 10}, textShadowRadius: 15 },
  logoTextPe: { fontSize: 65, fontWeight: '900', letterSpacing: 1, textShadowOffset: {width: 0, height: 10}, textShadowRadius: 15, marginLeft: 8 },
  splashTextContainer: { alignItems: 'center', marginTop: 30, gap: 10 },
  tagline: { fontSize: 13, color: '#FFFFFF', fontWeight: '900', letterSpacing: 3, textTransform: 'uppercase', opacity: 0.8 },
  bottomSection: { position: 'absolute', bottom: 0, width: '100%', padding: 20, paddingBottom: 40, zIndex: 10 },
  blurCard: { padding: 30, borderRadius: 40, overflow: 'hidden', backgroundColor: 'rgba(5, 5, 10, 0.7)' },
  formContainer: { width: '100%' },
  earningDisplayBox: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', marginVertical: 15 },
  rupeeSymbol: { fontSize: 25, color: '#F97316', fontWeight: '900', marginRight: 8 },
  earningAmount: { fontSize: 40, color: '#FFFFFF', fontWeight: '900', letterSpacing: 1, textShadowColor: '#F97316', textShadowRadius: 15 },
  perMonthText: { fontSize: 14, color: '#CBD5E1', marginLeft: 8, fontWeight: '700' },
  subInstruction: { textAlign: 'center', color: '#f309d0', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 20, textTransform: 'uppercase' },
  sliderOuterWrapper: { width: '100%', alignItems: 'center', justifyContent: 'center', height: 60 },
  sliderContent: { paddingHorizontal: 20, alignItems: 'center' },
  hourBubble: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginHorizontal: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  hourBubbleSelected: { backgroundColor: 'rgba(249, 115, 22, 0.2)', borderColor: '#F97316', borderWidth: 2, transform: [{ scale: 1.1 }] },
  hourText: { color: '#64748b', fontSize: 14, fontWeight: '700' },
  hourTextSelected: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
  loadingBox: { alignItems: 'center', padding: 30 },
  loadingText: { marginTop: 15, color: '#f309d0', fontWeight: '900', fontSize: 15, letterSpacing:1.5, textTransform: 'uppercase' },
  instruction: { textAlign: 'center', color: '#CBD5E1', marginBottom: 10, fontSize: 11, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase' },
  btnMass: { padding: 20, borderRadius: 25, width: '100%', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  btnTextUser: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
  btnTextExpert: { color: '#FFFFFF', fontSize: 13, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
  footerText: { textAlign: 'center', marginTop: 30, color: 'rgba(249, 249, 250, 0.3)', fontSize: 10, fontWeight: '900', letterSpacing: 2 }
});