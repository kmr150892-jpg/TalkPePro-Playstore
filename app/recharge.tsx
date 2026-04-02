import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, increment, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import RazorpayCheckout from 'react-native-razorpay';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

// 🔥 MASS UPDATED BUNDLES: As per your new pricing logic
const BUNDLES = [
  { id: '1', diamonds: '10,000', value: 10000, time: 'Talk Time: 5 Minutes Max', price: '₹100', numericPrice: 100 },
  { id: '2', diamonds: '50,000', value: 50000, time: 'Talk Time: 25 Minutes Max', price: '₹500', numericPrice: 500 },
  { id: '3', diamonds: '1,00,000', value: 100000, time: 'Talk Time: 50 Minutes Max', price: '₹1,000', numericPrice: 1000, bestSeller: true },
  { id: '4', diamonds: '1,50,000', value: 150000, time: 'Talk Time: 75 Minutes Max', price: '₹1,500', numericPrice: 1500 },
  { id: '5', diamonds: '2,00,000', value: 200000, time: 'Talk Time: 100 Minutes Max', price: '₹2,000', numericPrice: 2000 },
];

export default function RechargeScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState('3'); // Default to Best Seller
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isBuying, setIsBuying] = useState(false); 
  const user = auth.currentUser;

  const RAZORPAY_KEY_ID = 'rzp_test_SVinrPnj1KVHuH'; 

  useEffect(() => {
    if (!user) return;
    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().balance || 0);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, [user]);

  const handleBuy = async () => {
    if (!user) {
      Alert.alert("Error", "Please login to continue.");
      return;
    }
    
    const selectedBundle = BUNDLES.find(b => b.id === selected);
    if (!selectedBundle) return;

    setIsBuying(true);

    const options = {
      description: `TalkPe Recharge: ${selectedBundle.diamonds} Diamonds`,
      image: 'https://your-logo-url.com/logo.png', 
      currency: 'INR',
      key: RAZORPAY_KEY_ID,
      amount: selectedBundle.numericPrice * 100, 
      name: 'TalkPe AI',
      prefill: {
        email: user.email || '',
        contact: '',
        name: user.displayName || 'User'
      },
      theme: { color: '#3B82F6' }
    };

    try {
      // 1. Trigger Razorpay
      const data: any = await (RazorpayCheckout as any).open(options);
      
      // 2. 🔥 SUCCESS: Update User Balance & Log Transaction
      const userRef = doc(db, "users", user.uid);
      const transactionRef = doc(collection(db, "transactions"));

      // Update balance
      await updateDoc(userRef, {
        balance: increment(selectedBundle.value)
      });

      // Log the recharge transaction for history
      await setDoc(transactionRef, {
        userId: user.uid,
        userName: user.displayName || 'User',
        amount: selectedBundle.numericPrice,
        diamondsAdded: selectedBundle.value,
        type: 'recharge',
        paymentId: data.razorpay_payment_id,
        timestamp: serverTimestamp(),
        status: 'success'
      });

      Alert.alert(
        "Payment Success! 🎉", 
        `${selectedBundle.diamonds} Diamonds added to your wallet.`,
        [{ text: "Done", onPress: () => router.back() }]
      );

    } catch (error: any) {
      if (error && error.code !== 2) {
         Alert.alert("Payment Failed", "Transaction could not be completed.");
      }
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#0F172A', '#1E293B']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Recharge Diamonds</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
          
          <LinearGradient colors={['#3B82F6', '#2563EB']} style={styles.balanceCard}>
            <View>
              <Text style={styles.balanceLabel}>TOTAL BALANCE</Text>
              <View style={styles.balanceRow}>
                <Ionicons name="diamond" size={28} color="#FFF" />
                {loading ? (
                  <ActivityIndicator color="#FFF" style={{ marginLeft: 10 }} />
                ) : (
                  <Text style={styles.balanceAmount}>{balance.toLocaleString()}</Text>
                )}
              </View>
            </View>
            <Ionicons name="wallet-outline" size={60} color="rgba(255,255,255,0.2)" />
          </LinearGradient>

          <Text style={styles.sectionTitle}>SELECT TALK TIME BUNDLE</Text>

          {BUNDLES.map((bundle) => (
            <TouchableOpacity 
              key={bundle.id} 
              onPress={() => setSelected(bundle.id)}
              style={[
                styles.bundleItem, 
                selected === bundle.id && styles.bundleSelected
              ]}
              activeOpacity={0.8}
            >
              <View style={styles.bundleLeft}>
                <View style={[styles.diamondIcon, { backgroundColor: selected === bundle.id ? '#3B82F6' : '#1E293B' }]}>
                  <Ionicons name="diamond" size={22} color={selected === bundle.id ? '#FFF' : '#3B82F6'} />
                </View>
                <View style={{ marginLeft: 15 }}>
                  <Text style={styles.bundleDiamonds}>{bundle.diamonds} Diamonds</Text>
                  <Text style={styles.bundleTime}>{bundle.time}</Text>
                </View>
              </View>

              <View style={styles.priceTag}>
                 {bundle.bestSeller && (
                    <View style={styles.bestSellerBadge}>
                        <Text style={styles.bestSellerText}>BEST SELLER</Text>
                    </View>
                 )}
                 <View style={[styles.priceBtn, { backgroundColor: selected === bundle.id ? '#3B82F6' : 'rgba(59, 130, 246, 0.1)' }]}>
                    <Text style={[styles.priceText, { color: selected === bundle.id ? '#FFF' : '#3B82F6' }]}>{bundle.price}</Text>
                 </View>
              </View>
            </TouchableOpacity>
          ))}
          
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color="#94A3B8" />
            <Text style={styles.infoText}>Consultation Rate: 2,000 Diamonds / Min</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity 
            style={[styles.buyBtn, isBuying && { opacity: 0.7 }]} 
            onPress={handleBuy}
            disabled={isBuying}
          >
            {isBuying ? (
                <ActivityIndicator color="#FFF" />
            ) : (
                <>
                    <Text style={styles.buyBtnText}>Confirm Purchase</Text>
                    <Ionicons name="chevron-forward" size={20} color="#FFF" />
                </>
            )}
          </TouchableOpacity>
        </View>

      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#0F172A' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 12 },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', marginLeft: 20 },
  balanceCard: { padding: 30, borderRadius: 30, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 5 },
  balanceAmount: { color: '#FFF', fontSize: 38, fontWeight: '900' },
  sectionTitle: { color: '#94A3B8', fontSize: 12, fontWeight: '900', letterSpacing: 1.5, marginBottom: 20, paddingLeft: 5 },
  bundleItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 18, borderRadius: 25, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  bundleSelected: { borderColor: '#3B82F6', backgroundColor: 'rgba(59, 130, 246, 0.08)' },
  bundleLeft: { flexDirection: 'row', alignItems: 'center' },
  diamondIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  bundleDiamonds: { color: '#FFF', fontSize: 17, fontWeight: '900' },
  bundleTime: { color: '#64748B', fontSize: 12, marginTop: 2 },
  priceTag: { alignItems: 'flex-end' },
  bestSellerBadge: { backgroundColor: '#F59E0B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, position: 'absolute', top: -35, right: 0 },
  bestSellerText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  priceBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 15 },
  priceText: { fontWeight: '900', fontSize: 16 },
  infoBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10, marginBottom: 20 },
  infoText: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  footer: { padding: 20, paddingBottom: 35, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  buyBtn: { backgroundColor: '#3B82F6', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 18, borderRadius: 22, gap: 12, elevation: 10, shadowColor: '#3B82F6', shadowOpacity: 0.3, shadowRadius: 10 },
  buyBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900' }
});