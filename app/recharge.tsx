import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, increment, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
// 🔥 LATEST v12 NAMED IMPORTS FOR GOOGLE BILLING (No getProducts to avoid TS error)
import {
    endConnection,
    finishTransaction,
    initConnection,
    purchaseErrorListener,
    purchaseUpdatedListener,
    requestPurchase
} from 'react-native-iap';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const { width } = Dimensions.get('window');

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

// 🔥 GOOGLE PLAY PRODUCT IDs (Console-la ithae IDs create pannanum)
const BUNDLES = [
    { id: 'diamonds_100', diamonds: '10,000', value: 10000, time: 'Call: ~5 Minutes', price: '₹100', numericPrice: 100 },
    { id: 'diamonds_500', diamonds: '50,000', value: 50000, time: 'Call: ~25 Minutes', price: '₹500', numericPrice: 500 },
    { id: 'diamonds_1000', diamonds: '1,00,000', value: 100000, time: 'Call: ~50 Minutes', price: '₹1,000', numericPrice: 1000, bestSeller: true },
    { id: 'diamonds_1500', diamonds: '1,50,000', value: 150000, time: 'Call: ~75 Minutes', price: '₹1,500', numericPrice: 1500 },
    { id: 'diamonds_2000', diamonds: '2,00,000', value: 200000, time: 'Call: ~100 Minutes', price: '₹2,000', numericPrice: 2000 },
    { id: 'diamonds_3000', diamonds: '3,00,000', value: 300000, time: 'Call: ~150 Minutes', price: '₹3,000', numericPrice: 3000 },
    { id: 'diamonds_5000', diamonds: '5,00,000', value: 500000, time: 'Call: ~250 Minutes', price: '₹5,000', numericPrice: 5000 },
    { id: 'diamonds_8000', diamonds: '8,00,000', value: 800000, time: 'Call: ~400 Minutes', price: '₹8,000', numericPrice: 8000 },
    { id: 'diamonds_10000', diamonds: '10,00,000', value: 1000000, time: 'Call: ~500 Minutes', price: '₹10,000', numericPrice: 10000 },
];

export default function RechargeScreen() {
    const router = useRouter();
    const [selected, setSelected] = useState('diamonds_1000');
    const [balance, setBalance] = useState(0);
    const [totalSpentDiamonds, setTotalSpentDiamonds] = useState(0);
    const [userData, setUserData] = useState<any>(null); // 🔥 Added for Universal Theme Sync
    const [loading, setLoading] = useState(true);
    const [isBuying, setIsBuying] = useState(false);
    const user = auth.currentUser;

    const floatAnim = useRef(new Animated.Value(0)).current;
    const trailX = useRef(new Animated.Value(-width)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current; 

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -8, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true })
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();

        const runTrail = () => {
            trailX.setValue(-width);
            Animated.timing(trailX, { toValue: width, duration: 3000, useNativeDriver: true }).start(() => runTrail());
        };
        runTrail();

        if (!user) { setLoading(false); return; }

        const userRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) {
                const d = docSnap.data();
                setUserData(d); // 🔥 Fetching complete data for Level Math check
                setBalance(d.balance || 0);
                setTotalSpentDiamonds(d.totalSpentDiamonds || 0);
            }
            setLoading(false);
        });

        // 🔥 Initialize In-App Purchases connection with react-native-iap v12
        let purchaseUpdateSubscription: any = null;
        let purchaseErrorSubscription: any = null;

        const initIAP = async () => {
            try {
                await initConnection();
            } catch (err) {
                console.warn("IAP Init Warning:", err);
            }
        };
        initIAP();

        // 1. Set purchase listener
        purchaseUpdateSubscription = purchaseUpdatedListener(async (purchase: any) => {
            const receipt = purchase.transactionReceipt;
            
            if (receipt) {
                try {
                    const selectedBundle = BUNDLES.find(b => b.id === purchase.productId);
                    if (selectedBundle && user) {
                        const userRef = doc(db, "users", user.uid);
                        const transactionRef = doc(collection(db, "transactions"));
                        
                        // Update Firestore
                        await updateDoc(userRef, {
                            balance: increment(selectedBundle.value),
                            totalSpentDiamonds: increment(selectedBundle.value)
                        });

                        await setDoc(transactionRef, {
                            userId: user.uid,
                            userName: user.displayName || 'Call User',
                            amount: selectedBundle.numericPrice,
                            diamondsAdded: selectedBundle.value,
                            type: 'asset_purchase',
                            method: 'Google Play Billing',
                            orderId: purchase.transactionId || purchase.transactionReceipt,
                            timestamp: serverTimestamp(),
                            status: 'success'
                        });

                        await finishTransaction({ purchase, isConsumable: true });
                        Alert.alert("Success 🎉", "Transaction complete. Assets securely added to your vault.");
                    }
                } catch (error) {
                    console.error("Firestore Update Error:", error);
                } finally {
                    setIsBuying(false);
                }
            }
        });

        purchaseErrorSubscription = purchaseErrorListener((error: any) => {
            setIsBuying(false);
            if (String(error.code) !== 'E_USER_CANCELLED' && String(error.code) !== 'USER_CANCELED') {
               Alert.alert("Failed", "Google Play Billing process was interrupted.");
            }
        });

        return () => { 
            unsubscribe();
            if (purchaseUpdateSubscription) purchaseUpdateSubscription.remove();
            if (purchaseErrorSubscription) purchaseErrorSubscription.remove();
            endConnection();
        };
    }, [user]);

    const handleBuy = async () => {
        if (!user) { Alert.alert("Identification Error", "Please login to access your asset vault."); return; }
        const selectedBundle = BUNDLES.find(b => b.id === selected);
        if (!selectedBundle) return;
        setIsBuying(true);

        try {
            // 2. Start purchase process - using "as any" to bypass strict sku/skus TS errors entirely
            await requestPurchase({ sku: selectedBundle.id } as any);
        } catch (error) {
            console.error("IAP Error:", error);
            setIsBuying(false);
            Alert.alert("Error", "Could not establish connection to Google Play Billing.");
        }
    };

    // 🔥 SATTI FIX: Synced Highest Balance check for accurate Level display in Recharge!
    const userDiamonds = Math.max(
        userData?.totalDiamonds || 0,
        userData?.walletBalance || 0,
        userData?.balance || 0
    );
    const userTier = calculateUserLevel(userDiamonds);
    
    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });

    const borderType1 = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: userTier.color, borderRightColor: userTier.color,
        borderTopColor: userTier.secondaryColor + '80', borderBottomColor: userTier.secondaryColor + '80',
        backgroundColor: 'rgba(5, 5, 5, 0.65)',
    };

    const borderType2 = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: userTier.secondaryColor, borderRightColor: userTier.secondaryColor,
        borderTopColor: userTier.color + '80', borderBottomColor: userTier.color + '80',
        backgroundColor: 'rgba(5, 5, 5, 0.8)',
    };

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={userTier.themeBg as any} style={StyleSheet.absoluteFill} />
            
            <Animated.View style={[styles.shimmerOrb, { top: 80, right: -60, backgroundColor: userTier.color, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { bottom: 150, left: -60, backgroundColor: userTier.secondaryColor, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: userTier.color + '40' }]}>
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>ASSET VAULT</Text>
                </View>

                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                    
                    <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                        <View style={[styles.stealthBalanceCard, borderType1]}>
                            <View style={[styles.quadBorder, { 
                                borderLeftColor: userTier.color, borderRightColor: userTier.color, 
                                borderTopColor: userTier.secondaryColor, borderBottomColor: userTier.secondaryColor 
                            }]} />
                            <Animated.View style={[styles.glowTrail, { backgroundColor: userTier.color, transform: [{ translateX: trailX }] }]} />
                            
                            <View style={styles.cardInternal}>
                                <View style={{ flex: 1 }}>
                                    <View style={[styles.rankBadge, { borderColor: userTier.color + '60' }]}>
                                        <MaterialCommunityIcons name="crown" size={12} color={userTier.color} />
                                        <Text style={[styles.rankText, { color: userTier.color }]}>{userTier.label}</Text>
                                    </View>
                                    <Text style={styles.balanceLabel}>AVAILABLE ASSETS</Text>
                                    <View style={styles.balanceRow}>
                                        <Ionicons name="diamond" size={24} color={userTier.color} />
                                        {loading ? (
                                            <ActivityIndicator color="#FFF" style={{ marginLeft: 10 }} />
                                        ) : (
                                            <Text style={styles.balanceAmount}>{balance.toLocaleString()}</Text>
                                        )}
                                    </View>
                                </View>
                                <MaterialCommunityIcons name="integrated-circuit-chip" size={50} color="rgba(255,255,255,0.1)" />
                            </View>
                        </View>
                    </Animated.View>

                    <Text style={[styles.sectionTitle, { color: userTier.color }]}>SELECT ASSET BUNDLE</Text>

                    {BUNDLES.map((bundle, index) => {
                        const bundleBorder = index % 2 === 0 ? borderType1 : borderType2;
                        return (
                            <TouchableOpacity 
                                key={bundle.id} 
                                onPress={() => setSelected(bundle.id)}
                                activeOpacity={0.8}
                                style={[
                                    styles.bundleItem, 
                                    bundleBorder,
                                    selected === bundle.id && { borderColor: userTier.color, backgroundColor: userTier.color + '20' }
                                ]}
                            >
                                <View style={styles.bundleLeft}>
                                    <View style={[styles.diamondIconBase, { backgroundColor: selected === bundle.id ? userTier.color : 'rgba(255,255,255,0.05)' }]}>
                                        <Ionicons name="diamond" size={22} color={selected === bundle.id ? '#000' : userTier.color} />
                                    </View>
                                    <View style={{ marginLeft: 15 }}>
                                        <Text style={styles.bundleDiamonds}>{bundle.diamonds}</Text>
                                        <Text style={styles.bundleTime}>{bundle.time}</Text>
                                    </View>
                                </View>

                                <View style={styles.priceTagArea}>
                                    {bundle.bestSeller && (
                                        <View style={[styles.popularBadge, { backgroundColor: userTier.color, shadowColor: userTier.color }]}>
                                            <Text style={styles.popularText}>POPULAR</Text>
                                        </View>
                                    )}
                                    <View style={[styles.priceActionBtn, { backgroundColor: selected === bundle.id ? userTier.color : 'rgba(255,255,255,0.05)' }]}>
                                        <Text style={[styles.priceValue, { color: selected === bundle.id ? '#000' : userTier.color }]}>{bundle.price}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                    
                    <View style={styles.encryptionInfo}>
                        <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                        <Text style={styles.encryptionText}>Google Play Certified Secure Payment</Text>
                    </View>
                </ScrollView>

                <View style={styles.footerArea}>
                    <TouchableOpacity 
                        style={[styles.buyBtn, isBuying && { opacity: 0.6 }, { backgroundColor: userTier.color, shadowColor: userTier.color }]} 
                        onPress={handleBuy}
                        disabled={isBuying}
                    >
                        {isBuying ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Animated.View style={[styles.buyBtnContent, { transform: [{ scale: pulseAnim }] }]}>
                                <Text style={styles.buyBtnLabel}>AUTHORIZE TRANSACTION</Text>
                                <Ionicons name="flash" size={18} color="#000" />
                            </Animated.View>
                        )}
                    </TouchableOpacity>
                </View>

            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#020617' },
    shimmerOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.15, filter: 'blur(100px)' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    backBtn: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 12, borderWidth: 1 },
    headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', marginLeft: 15, letterSpacing: 2 },
    stealthBalanceCard: { height: 130, borderRadius: 35, overflow: 'hidden', elevation: 20, marginBottom: 35 },
    quadBorder: { ...StyleSheet.absoluteFillObject, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 1.2, borderBottomWidth: 1.2, borderRadius: 35, opacity: 0.8 },
    glowTrail: { position: 'absolute', width: 100, height: '200%', top: '-50%', opacity: 0.15, transform: [{ rotate: '30deg' }] },
    cardInternal: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, zIndex: 10 },
    rankBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10, borderWidth: 1 },
    rankText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    balanceLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
    balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    balanceAmount: { color: '#FFF', fontSize: 30, fontWeight: '900' },
    sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 20, paddingLeft: 5 },
    bundleItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 25, marginBottom: 18 }, 
    bundleLeft: { flexDirection: 'row', alignItems: 'center' },
    diamondIconBase: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    bundleDiamonds: { color: '#FFF', fontSize: 17, fontWeight: '900' },
    bundleTime: { color: '#64748b', fontSize: 10, marginTop: 2, fontWeight: '700' },
    priceTagArea: { alignItems: 'flex-end', position: 'relative' },
    popularBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, position: 'absolute', top: -30, right: 0, elevation: 8 },
    popularText: { color: '#000', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    priceActionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12 },
    priceValue: { fontWeight: '900', fontSize: 14 },
    encryptionInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 15 },
    encryptionText: { color: '#475569', fontSize: 11, fontWeight: '800' },
    footerArea: { padding: 20, paddingBottom: 35 },
    buyBtn: { borderRadius: 30, overflow: 'hidden', elevation: 15, shadowOpacity: 0.4, shadowRadius: 10 },
    buyBtnContent: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20, gap: 10 },
    buyBtnLabel: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 2 }
});