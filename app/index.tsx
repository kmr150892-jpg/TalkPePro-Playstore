import { Ionicons } from '@expo/vector-icons'; // 🔥 SATTI UPDATE: Checkbox icon kaaga add panniyachu
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
  Image,
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
  
  // 🔥 SATTI UPDATE: EULA Checkbox Tracker State
  const [eulaAccepted, setEulaAccepted] = useState(false); 

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
  
  // 🔥 SATTI FIX: EXACT MATH CALCULATION FOR CAROUSEL 🔥
  const scrollX = useRef(new Animated.Value(0)).current;
  // Screen Width - (BottomSection Padding 20) = Exact 44px offset
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
    // 🔥 SATTI UPDATE: Safety EULA Check block start 🔥
    if (!eulaAccepted) {
        Alert.alert(
            "Agreement Required", 
            "You must agree to our strict safety policies regarding No Nudity & Harassment before continuing."
        );
        return;
    }
    // 🔥 SATTI UPDATE: Safety EULA Check block end 🔥

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
      
      // 🔥 SATTI FIX: FORCING TOKEN REFRESH IMMEDIATELY AFTER LOGIN
      // Ithu unblock aana users-ku pazhaya "blocked" permission error varama stop pannidum!
      if (result.user) {
          await result.user.getIdToken(true);
      }

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

        // 1. STRICT USER LOCK: Oru thadava Normal User aagitta eppavum User thaan. Host-nu amukkuna amaidhiya User-kuke anuppidum.
        if (selectedRole === 'expert' && existingData.role === 'user' && finalRole !== 'admin' && !isDraftExpert) {
            selectedRole = 'user'; 
        }

        // 2. HOST LOCK: Oru thadava Verified Host aagitta eppavum Host thaan. User-nu amukkuna Dashboard-kuke anuppidum.
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
            // 3. DRAFT ESCAPE (Manasu Maatram) -> Let them become a User permanently.
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

      // 🔥 Final Routing - SATTI HOST UNBLOCK DIRECT ROUTE FIX 🔥
      if (finalRole === 'admin') {
        router.replace('/(admin)' as any); 
      } else if (selectedRole === 'expert' || finalRole === 'expert') {
        // 🔥 SATTI FIX: Direct pass for Active Experts!
        if (finalRole === 'expert' && expertStatus === 'Active') {
            console.log("Host is active. Sending to dashboard...");
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
          console.log("⚠️ Safe Ignore: GateKeeper intentionally cancelled the login DB sync.");
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
          // 🔥 SATTI FIX: OVERRIDE FOR LOGIN UI ONLY 🔥
          showLoginUI && { top: undefined, bottom: 50, paddingHorizontal: 0, height: height * 0.26 },
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
                        source={require('../assets/images/uesr.png')} 
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
              {/* 🔥 ULTRA PREMIUM CAROUSEL DESIGN END 🔥 */}

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

              <Text style={styles.footerTextFloating}>🛡️ END-TO-END ENCRYPTED ACCESS</Text>
            </View>

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
                    <Text style={[styles.instructionCenter, { marginBottom: 12 }]}>CHOOSE YOUR PROFILE</Text>

                    {/* 🔥 SATTI UPDATE: EULA Checkbox UI Start 🔥 */}
                    <TouchableOpacity style={styles.eulaContainer} onPress={() => setEulaAccepted(!eulaAccepted)} activeOpacity={0.8}>
                        <Ionicons name={eulaAccepted ? "checkbox" : "square-outline"} size={25} color={eulaAccepted ? "#02fa0a" : "#CBD5E1"} />
                        <Text style={styles.eulaText}>
                            I agree to the strict no-nudity, no-harassment <Text style={styles.eulaLink} onPress={() => Alert.alert("Terms & Conditions", "Strict Policies:\n\n1. No Nudity or Sexual Content.\n2. No Harassment or Abuse.\n3. Respect all users.\n\nViolators will be permanently banned from TalkPe Pro.")}>Terms & Conditions</Text>. Violators will be banned.
                        </Text>
                    </TouchableOpacity>
                    {/* 🔥 SATTI UPDATE: EULA Checkbox UI End 🔥 */}
                    
                    <TouchableOpacity onPress={() => handleLogin('user')} activeOpacity={0.8}>
                      <LinearGradient colors={['#7B2FF7', '#F43F8D', '#F97316']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.btnMass, { marginTop: 12, paddingVertical: 12 }]}>
                          <Text style={styles.btnTextUser} adjustsFontSizeToFit numberOfLines={1}>CONTINUE AS USER</Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => handleLogin('expert')} activeOpacity={0.8}>
                      <LinearGradient colors={['#F97316', '#F43F8D', '#7B2FF7']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={[styles.btnMass, { marginTop: 12, paddingVertical: 12}]}>
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
  
  // Base style for Landing Page
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

  // 🔥 SATTI UPDATE: EULA Styles added below 🔥
  eulaContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5, marginBottom: 5, paddingHorizontal: 5 },
  eulaText: { color: '#CBD5E1', fontSize: 10, marginLeft: 8, flex: 1, lineHeight: 14, fontWeight: '600' },
  eulaLink: { color: '#F97316', fontWeight: 'bold', textDecorationLine: 'underline' }
});