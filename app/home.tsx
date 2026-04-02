import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

export default function HomeScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const [userData, setUserData] = useState<any>(null);

  // ✅ REAL-TIME SYNC: User profile data automatic-ah live-ah update aagum
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

  // Logout Alert Logic
  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to logout?", [
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

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0F172A', '#1E293B']} style={StyleSheet.absoluteFill} />
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* --- HEADER SECTION --- */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greetingText}>
              Hey {userData?.name?.split(' ')[0] || user?.displayName?.split(' ')[0] || 'User'}! ✨
            </Text>
            <Text style={styles.subGreeting}>Welcome back to TalkPe</Text>
          </View>
          
          <TouchableOpacity 
            activeOpacity={0.7}
            onPress={() => router.push('/(tabs)/two' as any)}
          >
            <View style={styles.profileRing}>
              <Image 
                source={{ uri: userData?.profilePic || `https://ui-avatars.com/api/?name=${userData?.name || 'User'}&background=3B82F6&color=fff` }} 
                style={styles.profileThumb} 
              />
            </View>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* --- DIAMONDS / WALLET CARD --- */}
          <View style={styles.walletCard}>
            <LinearGradient 
              colors={['rgba(59, 130, 246, 0.2)', 'rgba(30, 41, 59, 0.4)']} 
              style={styles.walletInner}
            >
              <View>
                <Text style={styles.walletLabel}>Available Balance</Text>
                <View style={styles.diamondRow}>
                  <Ionicons name="diamond" size={20} color="#F59E0B" />
                  <Text style={styles.walletValue}>{(userData?.balance || 0).toLocaleString()} Diamonds</Text>
                </View>
              </View>
              <TouchableOpacity 
                style={styles.rechargeBtn}
                onPress={() => router.push('/recharge' as any)}
              >
                <Text style={styles.rechargeText}>Recharge</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>

          {/* --- MAIN CALL TO ACTION --- */}
          <View style={styles.welcomeCard}>
            <Text style={styles.emoji}>🥳</Text>
            <Text style={styles.welcomeTitle}>Ready to Consult?</Text>
            <Text style={styles.welcomeSub}>Talk to our experts and get instant solutions now.</Text>
            <TouchableOpacity 
              style={styles.joinBtn}
              onPress={() => router.push('/' as any)} 
            >
                <Text style={styles.joinBtnText}>Join Consultation</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* --- QUICK ACTIONS --- */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>
          
          <View style={styles.actionGrid}>
            <TouchableOpacity 
               style={styles.actionCard}
               onPress={() => router.push('/history' as any)}
            >
               <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.gradientCard}>
                  <Ionicons name="time-outline" size={24} color="#FFF" />
                  <Text style={styles.actionText}>View My History</Text>
               </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
               style={[styles.actionCard, { marginTop: 15 }]}
               onPress={() => router.push('/support' as any)}
            >
               <LinearGradient colors={['#10B981', '#059669']} style={styles.gradientCard}>
                  <Ionicons name="headset-outline" size={24} color="#FFF" />
                  <Text style={styles.actionText}>Help & Support</Text>
               </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* --- LOGOUT --- */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#EF4444" />
            <Text style={styles.logoutText}>Logout from Account</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>TalkPe Version 1.0.4 (Beta)</Text>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#0F172A' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingVertical: 20 
  },
  greetingText: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  subGreeting: { color: '#64748B', fontSize: 14, marginTop: 4, fontWeight: '500' },
  profileRing: { padding: 3, borderRadius: 18, borderWidth: 1.5, borderColor: '#3B82F6', borderStyle: 'dashed' },
  profileThumb: { width: 50, height: 50, borderRadius: 15, backgroundColor: '#1E293B' },
  content: { paddingHorizontal: 25, paddingBottom: 100 },
  
  walletCard: { marginTop: 10, marginBottom: 20, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  walletInner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  walletLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase' },
  diamondRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 8 },
  walletValue: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  rechargeBtn: { backgroundColor: '#3B82F6', paddingVertical: 8, paddingHorizontal: 15, borderRadius: 12 },
  rechargeText: { color: '#FFF', fontWeight: '800', fontSize: 13 },

  welcomeCard: { 
    backgroundColor: 'rgba(30, 41, 59, 0.5)', 
    borderRadius: 30, 
    padding: 30, 
    alignItems: 'center', 
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  emoji: { fontSize: 50, marginBottom: 15 },
  welcomeTitle: { color: '#FFF', fontSize: 22, fontWeight: '800' },
  welcomeSub: { color: '#94A3B8', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  joinBtn: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#3B82F6', marginTop: 20, paddingVertical: 12, paddingHorizontal: 25, borderRadius: 15 },
  joinBtnText: { color: '#FFF', fontWeight: '900', fontSize: 15 },

  sectionHeader: { marginTop: 35, marginBottom: 15 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  actionGrid: { width: '100%' },
  actionCard: { height: 75, borderRadius: 22, overflow: 'hidden', elevation: 5 },
  gradientCard: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, gap: 15 },
  actionText: { color: '#FFF', fontSize: 17, fontWeight: '800' },
  
  logoutBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 10, 
    marginTop: 40, 
    padding: 18, 
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    backgroundColor: 'rgba(239, 68, 68, 0.05)'
  },
  logoutText: { color: '#EF4444', fontWeight: '900', fontSize: 16 },
  versionText: { textAlign: 'center', color: '#475569', fontSize: 12, marginTop: 25, fontWeight: '600' }
});