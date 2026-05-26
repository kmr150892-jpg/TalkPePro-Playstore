import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT THEME SYNC V2)
const calculateUserLevel = (totalSpent: number) => {
  if (totalSpent >= 500000001) return { 
      lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#ff0000', secondaryColor: '#660000', themeBg: ['#1A0000', '#000000']
  }; 
  if (totalSpent >= 100000001) return { 
      lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#ff0dba', secondaryColor: '#a50606', themeBg: ['#15001A', '#000000']
  }; 
  if (totalSpent >= 50000000) return { 
      lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#f6f60d', secondaryColor: '#02fa0a', themeBg: ['#08001A', '#000000']
  };
  if (totalSpent >= 10000000) return { 
      lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#f52b6092', themeBg: ['#00101A', '#000000']
  };
  if (totalSpent >= 5000000) return { 
      lvl: 4, label: 'LEGENDARY NODE', status: 'NEBULA COMMANDER', color: '#d0630a', secondaryColor: '#5f0bf0', themeBg: ['#0A001A', '#000000']
  };
  if (totalSpent >= 1000000) return { 
      lvl: 3, label: 'DIAMOND CORE', status: 'NUCLEAR ASSET', color: '#bcde4a', secondaryColor: '#09bbf1fe', themeBg: ['#001A0A', '#000000']
  };
  if (totalSpent >= 200001) return { 
      lvl: 2, label: 'GOLD OPERATIVE', status: 'ROYAL STRIKER', color: '#ffae00', secondaryColor: '#ac4a4a', themeBg: ['#1A0B00', '#000000']
  };
  return { 
      lvl: 1, label: 'SILVER AGENT', status: 'STAR FAME', color: '#0f33e7', secondaryColor: '#6b0402', themeBg: ['#050505', '#000000']
  };
};

export default function HomeScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const [userData, setUserData] = useState<any>(null);
  const [isCalling, setIsCalling] = useState(false);

  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
        Animated.sequence([
            Animated.timing(shimmerAnim, {
              toValue: 1,
              duration: 4000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true
            }),
            Animated.timing(shimmerAnim, {
              toValue: 0,
              duration: 4000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true
            })
        ])
    ).start();
  }, []);

  useEffect(() => {
    const syncDeviceId = async () => {
      if (!user) return;
      try {
        let deviceId = "";
        if (Platform.OS === 'android') {
          // @ts-ignore
          deviceId = await Application.getAndroidId();
        } else {
          deviceId = (await Application.getIosIdForVendorAsync()) || "";
        }
        if (deviceId) {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const data = userSnap.data();
            if (!data.registeredDeviceId) {
              await updateDoc(userRef, { registeredDeviceId: deviceId });
            }
          }
        }
      } catch (e) {
        console.log("Device ID verification error:", e);
      }
    };
    syncDeviceId();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserData(docSnap.data());
      }
    });
    return unsubscribe;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "calls"),
      where("userId", "==", user.uid),
      where("status", "in", ["ringing", "accepted", "rejected"])
    );
    const unsubCall = onSnapshot(q, (snap) => {
      snap.forEach((change) => {
        const callData = change.data();
        if (callData.status === "accepted") {
          unsubCall(); 
          router.push({
            pathname: "/videocall" as any,
            params: { callId: change.id, role: 'user' }
          });
        } 
        else if (callData.status === "rejected" || callData.status === "completed") {
          setIsCalling(false);
          unsubCall();
        }
      });
    });
    return () => unsubCall();
  }, [user]);

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to secure your session and logout?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        style: "destructive",
        onPress: async () => {
          try {
            await auth.signOut();
            router.replace('/'); 
          } catch (error) {
            console.error("Logout Error:", error);
          }
        }
      }
    ]);
  };

  const totalSpent = userData?.totalSpentDiamonds || 0;
  const userTier = calculateUserLevel(totalSpent);
  const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });

  const borderType1 = {
      borderLeftWidth: 2,
      borderRightWidth: 2,
      borderTopWidth: 0.5,
      borderBottomWidth: 0.5,
      borderLeftColor: userTier.color,
      borderRightColor: userTier.color,
      borderTopColor: userTier.secondaryColor + '80',
      borderBottomColor: userTier.secondaryColor + '80',
  };

  const borderType2 = {
      borderLeftWidth: 2,
      borderRightWidth: 2,
      borderTopWidth: 0.5,
      borderBottomWidth: 0.5,
      borderLeftColor: userTier.secondaryColor,
      borderRightColor: userTier.secondaryColor,
      borderTopColor: userTier.color + '80',
      borderBottomColor: userTier.color + '80',
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={userTier.themeBg as any} style={StyleSheet.absoluteFill} />
      
      <Animated.View style={[styles.shimmerOrb, { top: 80, right: -60, backgroundColor: userTier.color, transform: [{ translateY: orbTranslateY }] }]} />
      <Animated.View style={[styles.shimmerOrb, { bottom: 150, left: -60, backgroundColor: userTier.secondaryColor, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>
              Hey {userData?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'User'}! ✨
            </Text>
            <Text style={[styles.subGreeting, { color: userTier.color }]}>Status: {userTier.label} Active</Text>
          </View>
          
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/two' as any)}>
            <View style={[styles.profileRing, { borderColor: userTier.color, shadowColor: userTier.color }]}>
              <Image 
                source={{ uri: userData?.profilePic || `https://ui-avatars.com/api/?name=${userData?.name || 'User'}&background=1E293B&color=fff` }} 
                style={styles.profileThumb} 
              />
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.walletCard, borderType1]}>
            <LinearGradient colors={[`${userTier.color}30`, `${userTier.secondaryColor}15`]} style={styles.walletInner}>
              <View>
                <Text style={styles.walletLabel}>Vault Balance</Text>
                <View style={styles.diamondRow}>
                  <Ionicons name="diamond" size={20} color={userTier.color} />
                  <Text style={styles.walletValue}>{(userData?.balance || 0).toLocaleString()} Diamonds</Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.rechargeBtn, { backgroundColor: userTier.color, shadowColor: userTier.color }]} onPress={() => router.push('/recharge' as any)}>
                <Text style={styles.rechargeText}>Recharge</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          <TouchableOpacity 
              activeOpacity={0.9} 
             onPress={() => router.push('/Explore-Discover' as any)}
              style={[styles.DiscoverTriggerMass, { shadowColor: userTier.color }]}
          >
              <LinearGradient 
                  colors={[userTier.color, userTier.secondaryColor]} 
                  style={styles.DiscoverGradient}
                  start={{x: 0, y: 0}}
                  end={{x: 1, y: 1}}
              >
                  <MaterialCommunityIcons name="lightning-bolt" size={23} color="#FFF" />
                  <Text style={styles.DiscoverBtnText}>EXPERT CONNECT</Text>
                  <View style={styles.liveIndicatorDiscover}>
                      <View style={styles.liveDotDiscover} />
                      <Text style={styles.liveCountDiscover}>2.4k Online</Text>
                  </View>
              </LinearGradient>
          </TouchableOpacity>

          <View style={[styles.welcomeCard, borderType2]}>
            <Text style={styles.emoji}>🤝</Text>
            <Text style={styles.welcomeTitle}>Connect with Experts</Text>
            <Text style={styles.welcomeSub}>Start a professional consultation and find solutions instantly.</Text>
            <TouchableOpacity style={[styles.joinBtn, { backgroundColor: userTier.secondaryColor, shadowColor: userTier.secondaryColor }]} onPress={() => router.push('/' as any)}>
                <Text style={styles.joinBtnText}>Start Consulting</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dashboard Actions</Text>
          </View>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity style={[styles.actionCard, borderType1]} onPress={() => router.push('/history' as any)}>
               <LinearGradient colors={[userTier.color + 'AA', userTier.secondaryColor + 'AA']} style={styles.gradientCard} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                  <Ionicons name="time-outline" size={24} color="#FFF" />
                  <Text style={styles.actionText}>Consultation History</Text>
               </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.actionCard, borderType2, { marginTop: 15 }]} onPress={() => router.push('/support' as any)}>
               <LinearGradient colors={[userTier.secondaryColor + 'AA', userTier.color + 'AA']} style={styles.gradientCard} start={{x: 0, y: 0}} end={{x: 1, y: 1}}>
                  <Ionicons name="headset-outline" size={24} color="#FFF" />
                  <Text style={styles.actionText}>Technical Support</Text>
               </LinearGradient>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Securely Logout</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>TalkPe Pro • Secure Build 1.0.5</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#020617' },
  shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 20 },
  greetingText: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  subGreeting: { fontSize: 11, marginTop: 6, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  profileRing: { padding: 3, borderRadius: 18, borderWidth: 1.5, borderStyle: 'dashed', elevation: 10, shadowOpacity: 0.5, shadowRadius: 8 },
  profileThumb: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#1E293B' },
  content: { paddingHorizontal: 25, paddingBottom: 100 },
  walletCard: { marginTop: 10, marginBottom: 20, borderRadius: 35, overflow: 'hidden', backgroundColor: 'rgba(5, 5, 5, 0.5)' },
  walletInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22 },
  walletLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  diamondRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 8 },
  walletValue: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  rechargeBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 18, elevation: 5 },
  rechargeText: { color: '#FFF', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
  DiscoverTriggerMass: { marginVertical: 20, borderRadius: 30, elevation: 20, shadowOpacity: 0.5, shadowRadius: 10 },
  DiscoverGradient: { flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: 30, gap: 15 },
  DiscoverBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  liveIndicatorDiscover: { marginLeft: 'auto', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDotDiscover: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  liveCountDiscover: { color: '#10B981', fontSize: 10, fontWeight: '800' },
  welcomeCard: { backgroundColor: 'rgba(5, 5, 5, 0.6)', borderRadius: 35, padding: 30, alignItems: 'center' },
  emoji: { fontSize: 50, marginBottom: 15 },
  welcomeTitle: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  welcomeSub: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20, paddingVertical: 14, paddingHorizontal: 28, borderRadius: 25, elevation: 8 },
  joinBtnText: { color: '#FFF', fontWeight: '900', fontSize: 15 },
  sectionHeader: { marginTop: 35, marginBottom: 15 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  actionGrid: { width: '100%' },
  actionCard: { height: 75, borderRadius: 30, overflow: 'hidden', elevation: 5, backgroundColor: 'rgba(5, 5, 5, 0.5)' },
  gradientCard: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, gap: 15 },
  actionText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 40, padding: 18, borderRadius: 25, borderWidth: 1.5, borderColor: 'rgba(239, 68, 68, 0.2)', backgroundColor: 'rgba(239, 68, 68, 0.05)' },
  logoutText: { color: '#EF4444', fontWeight: '900', fontSize: 16 },
  versionText: { textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 25, fontWeight: '600' }
});