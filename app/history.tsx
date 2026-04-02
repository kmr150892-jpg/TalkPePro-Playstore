import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore'; // ✅ doc added
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const { width } = Dimensions.get('window');

export default function HistoryScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userBalance, setUserBalance] = useState<number>(0); // ✅ New Balance State

  useEffect(() => {
    if (!user) return;

    // 1. ✅ Real-time Balance Sync
    // User-oda balance maaruna automatic-ah inga update aagum
    const userRef = doc(db, "users", user.uid);
    const unsubBalance = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserBalance(docSnap.data().balance || 0);
      }
    });

    // 2. ✅ Consultations History Sync
    const q = query(
      collection(db, "consultations"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribeHistory = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setHistory(data);
      setLoading(false);
    }, (error) => {
      console.error("Firebase Sync Error:", error);
      setLoading(false);
    });

    return () => {
      unsubBalance();
      unsubscribeHistory();
    };
  }, [user]);

  // Handle Recharge Button (Razorpay trigger)
  const handleRecharge = () => {
    console.log("Navigating to Recharge...");
    // router.push('/recharge'); // Unga Razorpay logic screen-ku poga idhai use pannunga
  };

  const renderHistoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      activeOpacity={0.8} 
      style={styles.historyCard}
      onPress={() => console.log("Card Pressed", item.id)}
    >
      <View style={styles.cardHeader}>
        <View style={styles.expertWrapper}>
            <Image 
            source={{ uri: item.expertImage || `https://ui-avatars.com/api/?name=${item.expertName || 'Expert'}&background=1E293B&color=fff` }} 
            style={styles.expertThumb} 
            />
            <View style={styles.onlineDot} />
        </View>
        
        <View style={styles.expertInfo}>
          <Text style={styles.expertName} numberOfLines={1}>
            {item.expertName || 'TalkPe Expert'}
          </Text>
          <Text style={styles.categoryText}>
            {item.category || 'Consultation'}
          </Text>
        </View>

        <View style={styles.statusBadge}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>Completed</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <View style={styles.footerRow}>
            <View style={styles.footerItem}>
                <Ionicons name="calendar-clear-outline" size={16} color="#64748B" />
                <Text style={styles.footerValue}>
                    {item.createdAt?.seconds 
                    ? new Date(item.createdAt.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) 
                    : 'Today'}
                </Text>
            </View>
            
            <View style={styles.footerItem}>
                <Ionicons name="stopwatch-outline" size={16} color="#64748B" />
                <Text style={styles.footerValue}>{item.duration || '0'} mins</Text>
            </View>
        </View>

        <View style={styles.costBadge}>
          <Ionicons name="diamond" size={14} color="#F59E0B" />
          <Text style={styles.costText}>{item.totalCost || '0'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <LinearGradient 
        colors={['#0F172A', '#1E293B', '#0F172A']} 
        style={StyleSheet.absoluteFill} 
      />
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* --- Header Section --- */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()} 
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>History</Text>
            <Text style={styles.headerSub}>Manage your sessions</Text>
          </View>
          <TouchableOpacity style={styles.filterBtn}>
             <Ionicons name="funnel-outline" size={22} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* --- 💎 WALLET CARD (MASS UPDATE) --- */}
        <View style={styles.walletContainer}>
          <LinearGradient
            colors={['#1E293B', '#334155']}
            style={styles.walletCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View>
              <Text style={styles.walletLabel}>Available Balance</Text>
              <View style={styles.balanceRow}>
                <Ionicons name="diamond" size={24} color="#F59E0B" />
                <Text style={styles.balanceAmount}>{userBalance}</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={styles.addDiamondsBtn} 
              onPress={handleRecharge}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.addBtnGradient}
              >
                <Ionicons name="add" size={20} color="#FFF" />
                <Text style={styles.addBtnText}>Add</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color="#3B82F6" />
            <Text style={styles.loadingText}>Loading your history...</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={styles.center}>
            <View style={styles.emptyIconCircle}>
                <Ionicons name="videocam-off" size={45} color="#3B82F6" />
            </View>
            <Text style={styles.emptyTitle}>No Consultations Found</Text>
            <Text style={styles.emptySub}>
              You haven't had any consultations yet. Connect with our experts to get started!
            </Text>
            
            <TouchableOpacity 
              style={styles.exploreBtn}
              onPress={() => router.replace('/home')}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.exploreGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.exploreText}>Talk to an Expert</Text>
                <Ionicons name="arrow-forward" size={18} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={history}
            keyExtractor={(item) => item.id}
            renderItem={renderHistoryItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 15 },
  headerTextContainer: { flex: 1, marginLeft: 15 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },
  headerSub: { color: '#64748B', fontSize: 13, fontWeight: '500' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  filterBtn: { padding: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 12 },
  
  // 💎 Wallet Styles
  walletContainer: { paddingHorizontal: 20, marginBottom: 10 },
  walletCard: { borderRadius: 25, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  walletLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 5 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  balanceAmount: { color: '#FFF', fontSize: 32, fontWeight: '900' },
  addDiamondsBtn: { overflow: 'hidden', borderRadius: 15 },
  addBtnGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, gap: 5 },
  addBtnText: { color: '#FFF', fontWeight: '800', fontSize: 14 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 30 },
  loadingText: { color: '#64748B', marginTop: 15, fontWeight: '600', fontSize: 14 },
  listContent: { padding: 20, paddingBottom: 100 },
  historyCard: { backgroundColor: 'rgba(30, 41, 59, 0.4)', borderRadius: 28, padding: 20, marginBottom: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)' },
  cardHeader: { flexDirection: 'row', alignItems: 'center' },
  expertWrapper: { position: 'relative' },
  expertThumb: { width: 60, height: 60, borderRadius: 20, backgroundColor: '#1E293B' },
  onlineDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', position: 'absolute', bottom: -2, right: -2, borderWidth: 3, borderColor: '#1E293B' },
  expertInfo: { flex: 1, marginLeft: 18 },
  expertName: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  categoryText: { color: '#64748B', fontSize: 13, marginTop: 4, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.08)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
  statusText: { color: '#10B981', fontSize: 10, fontWeight: '900' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerRow: { flexDirection: 'row', gap: 20 },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerValue: { color: '#94A3B8', fontSize: 14, fontWeight: '700' },
  costBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245, 158, 11, 0.12)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  costText: { color: '#F59E0B', fontWeight: '900', fontSize: 15 },
  emptyIconCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(59, 130, 246, 0.08)', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  emptyTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  emptySub: { color: '#64748B', fontSize: 15, textAlign: 'center', marginTop: 12, lineHeight: 22 },
  exploreBtn: { marginTop: 35, width: width * 0.7, borderRadius: 22, overflow: 'hidden' },
  exploreGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, paddingVertical: 18 },
  exploreText: { color: '#FFF', fontWeight: '900', fontSize: 16 }
});