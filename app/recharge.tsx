import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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
    ImageBackground,
    PanResponder,
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

// 🆕 UPDATE 6: RECHARGE SWITCH
// false = button shows "COMING SOON" and cannot be clicked.
// BillDesk verification + Play Console products ready aana apram ithai true panna podhum.
const RECHARGE_ENABLED = false;

// 🖼️ PREMIUM IMAGE ASSETS (replace with your own: require('../assets/xxx.jpg') if you like)
const IMG_VAULT_BG = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80';
const IMG_HERO = 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=900&q=80';

// ✨ TWINKLING STAR FIELD POSITIONS
const STARS = [
  { top: 70, left: 28, size: 3 }, { top: 140, left: width * 0.82, size: 2 }, { top: 250, left: width * 0.5, size: 3 },
  { top: 360, left: 18, size: 2 }, { top: 470, left: width * 0.9, size: 3 }, { top: 560, left: width * 0.3, size: 2 },
  { top: 680, left: width * 0.7, size: 3 }, { top: 780, left: 40, size: 2 }, { top: 190, left: width * 0.14, size: 2 },
  { top: 610, left: width * 0.58, size: 2 },
];

// 🛡️ SAFE ALPHA HELPER: some tier colors are already 8-digit hex (e.g. '#f52b6092'),
// so adding another alpha creates an INVALID color. This always normalizes first.
const withAlpha = (hex: string, alpha: string = 'FF') => {
  const base = (hex || '#000000').length >= 7 ? hex.slice(0, 7) : hex;
  return base + alpha;
};

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

// 🆕 LEVEL PROGRESS (shows how close the user is to the next tier) - uses the same thresholds as the tier engine
const TIER_MINS = [0, 200001, 1000000, 5000000, 10000000, 50000000, 100000001, 500000001];
const getLevelProgress = (totalSpent: number, lvl: number) => {
  if (lvl >= 8) return 1;
  const cur = TIER_MINS[lvl - 1];
  const next = TIER_MINS[lvl];
  return Math.max(0, Math.min(1, (totalSpent - cur) / (next - cur)));
};

// 🔥 GOOGLE PLAY PRODUCT IDs (Console-la ithae IDs create pannanum)
const BUNDLES = [
    { id: 'diamonds_49', diamonds: '5,000', value: 5000, time: 'Call: Up to 2 Min 30 Sec', price: '₹49', numericPrice: 49 },
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

// 🆕 STAGGERED CARD ENTRANCE (each card pops in with its own delay + 3D tilt-in)
const FadeInItem = ({ index, children }: any) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 650, delay: Math.min(index, 9) * 80, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{
      opacity: v,
      transform: [
        { perspective: 900 },
        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
        { rotateX: v.interpolate({ inputRange: [0, 1], outputRange: ['35deg', '0deg'] }) },
        { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
      ],
    }}>
      {children}
    </Animated.View>
  );
};

// 🆕 PREMIUM BUNDLE CARD (glass + 3D select pop + orbit ring gem)
const BundleCard = ({ bundle, index, isSelected, onPress, tier, orbitRotate, pulseScale, pulseOpacity }: any) => {
  const sel = useRef(new Animated.Value(isSelected ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(sel, { toValue: isSelected ? 1 : 0, friction: 6, tension: 80, useNativeDriver: true }).start();
  }, [isSelected]);

  const accent = index % 2 === 0 ? tier.color : tier.secondaryColor;
  const accent2 = index % 2 === 0 ? tier.secondaryColor : tier.color;
  const gemSize = 20 + Math.min(index, 8) * 1.5;

  const cardBorder = index % 2 === 0
    ? {
        borderLeftColor: tier.color, borderRightColor: tier.color,
        borderTopColor: withAlpha(tier.secondaryColor, '80'), borderBottomColor: withAlpha(tier.secondaryColor, '80'),
        backgroundColor: 'rgba(5, 5, 5, 0.65)',
      }
    : {
        borderLeftColor: tier.secondaryColor, borderRightColor: tier.secondaryColor,
        borderTopColor: withAlpha(tier.color, '80'), borderBottomColor: withAlpha(tier.color, '80'),
        backgroundColor: 'rgba(5, 5, 5, 0.8)',
      };

  return (
    <FadeInItem index={index}>
      <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
        <Animated.View
          style={[
            styles.bundleWrap,
            isSelected && { shadowColor: tier.color, shadowOpacity: 0.7, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 14 },
            {
              transform: [
                { perspective: 900 },
                { scale: sel.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] }) },
                { rotateX: sel.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-3deg'] }) },
              ],
            },
          ]}
        >
          <BlurView
            intensity={25}
            tint="dark"
            style={[
              styles.bundleItem,
              styles.bundleBorderBase,
              cardBorder,
              isSelected && { borderLeftColor: tier.color, borderRightColor: tier.color, borderTopColor: tier.color, borderBottomColor: tier.color, borderTopWidth: 1, borderBottomWidth: 1 },
            ]}
          >
            {/* 🆕 selected gradient fill */}
            {isSelected && (
              <LinearGradient
                pointerEvents="none"
                colors={[withAlpha(tier.color, '45'), withAlpha(tier.secondaryColor, '10')]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            )}
            {/* 🆕 glowing accent strip */}
            <LinearGradient
              pointerEvents="none"
              colors={[withAlpha(accent, 'FF'), withAlpha(accent2, '00')]}
              start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
              style={styles.bundleStrip}
            />

            <View style={styles.bundleLeft}>
              <View style={styles.gemWrap}>
                {isSelected && (
                  <>
                    <Animated.View style={[styles.gemRing, { borderColor: withAlpha(tier.color, 'CC'), transform: [{ rotate: orbitRotate }] }]} />
                    <Animated.View style={[styles.gemPulse, { backgroundColor: withAlpha(tier.color, '40'), opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                  </>
                )}
                <View style={[styles.diamondIconBase, { backgroundColor: isSelected ? tier.color : 'rgba(255,255,255,0.05)', borderColor: withAlpha(accent, '55') }]}>
                  <Ionicons name="diamond" size={gemSize} color={isSelected ? '#000' : tier.color} />
                </View>
              </View>
              <View style={{ marginLeft: 14 }}>
                <Text style={styles.bundleDiamonds}>{bundle.diamonds}</Text>
                <Text style={styles.bundleTime}>{bundle.time}</Text>
              </View>
            </View>

            <View style={styles.priceTagArea}>
              <View style={[styles.priceActionBtn, { backgroundColor: isSelected ? tier.color : 'rgba(255,255,255,0.05)', borderColor: withAlpha(tier.color, isSelected ? 'FF' : '40') }]}>
                <Text style={[styles.priceValue, { color: isSelected ? '#000' : tier.color }]}>{bundle.price}</Text>
              </View>
            </View>

            {/* 🆕 selected check badge */}
            {isSelected && (
              <View style={[styles.checkBadge, { backgroundColor: tier.color }]}>
                <Ionicons name="checkmark" size={12} color="#000" />
              </View>
            )}
          </BlurView>

          {/* 🆕 POPULAR ribbon */}
          {bundle.bestSeller && (
            <View style={[styles.popularBadge, { backgroundColor: tier.color, shadowColor: tier.color }]}>
              <MaterialCommunityIcons name="fire" size={11} color="#000" />
              <Text style={styles.popularText}>POPULAR</Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    </FadeInItem>
  );
};

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

    // 🆕 NEW ANIMATION VALUES
    const mainLoop = useRef(new Animated.Value(0)).current;     // rotation loop (orbit rings)
    const haloAnim = useRef(new Animated.Value(0)).current;     // pulse halos
    const holoAnim = useRef(new Animated.Value(0)).current;     // holographic sweep (balance card)
    const btnShine = useRef(new Animated.Value(0)).current;     // shine sweep on buy button
    const headerEnter = useRef(new Animated.Value(0)).current;  // header entrance
    const tiltX = useRef(new Animated.Value(0)).current;        // balance card 3D tilt
    const tiltY = useRef(new Animated.Value(0)).current;

    // 🆕 BALANCE CARD DRAG-TO-TILT (3D)
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
            onPanResponderMove: (_, g) => {
                tiltY.setValue(Math.max(-1, Math.min(1, g.dx / 120)));
                tiltX.setValue(Math.max(-1, Math.min(1, g.dy / 60)));
            },
            onPanResponderRelease: () => {
                Animated.spring(tiltX, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }).start();
                Animated.spring(tiltY, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }).start();
            },
            onPanResponderTerminate: () => {
                Animated.spring(tiltX, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }).start();
                Animated.spring(tiltY, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }).start();
            },
        })
    ).current;

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

        // 🆕 ORBIT ROTATION LOOP
        Animated.loop(Animated.timing(mainLoop, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true })).start();

        // 🆕 PULSE HALO LOOP
        Animated.loop(Animated.sequence([
            Animated.timing(haloAnim, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(haloAnim, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])).start();

        // 🆕 HOLO SWEEP LOOP
        Animated.loop(Animated.sequence([
            Animated.delay(1200),
            Animated.timing(holoAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(holoAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])).start();

        // 🆕 BUTTON SHINE LOOP
        Animated.loop(Animated.sequence([
            Animated.delay(900),
            Animated.timing(btnShine, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(btnShine, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])).start();

        // 🆕 HEADER ENTRANCE
        Animated.timing(headerEnter, { toValue: 1, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

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
        // 🆕 UPDATE 6: Recharge locked -> Coming Soon
        if (!RECHARGE_ENABLED) {
            Alert.alert("Coming Soon", "Diamond recharge will be available soon.");
            return;
        }
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

    // 🆕 UPDATE 3: LEVEL FIX
    // Munnaadi: balance / walletBalance use panninom -> diamonds kharchu aanaa level kammi aagum.
    // Ippo: lifetime-la mattum athigam aagura totalSpentDiamonds (+ totalDiamonds) use panrom -> level kammi aagaadhu.
    const userDiamonds = Math.max(totalSpentDiamonds, userData?.totalSpentDiamonds || 0);
    const userTier = calculateUserLevel(userDiamonds);
    const levelProgress = getLevelProgress(userDiamonds, userTier.lvl);
    const activeBundle = BUNDLES.find(b => b.id === selected);
    
    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });

    // 🆕 DERIVED ANIMATION VALUES
    const orbitRotate = mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const orbitRotateRev = mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
    const pulseScale = haloAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
    const pulseOpacity = haloAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] });
    const holoX = holoAnim.interpolate({ inputRange: [0, 1], outputRange: [-width, width] });
    const shineX = btnShine.interpolate({ inputRange: [0, 1], outputRange: [-120, width] });
    const balanceTilt = {
        transform: [
            { perspective: 1000 },
            { rotateX: tiltX.interpolate({ inputRange: [-1, 1], outputRange: ['12deg', '-12deg'] }) },
            { rotateY: tiltY.interpolate({ inputRange: [-1, 1], outputRange: ['-18deg', '18deg'] }) },
        ],
    };
    const headerReveal = {
        opacity: headerEnter,
        transform: [{ translateY: headerEnter.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
    };

    const borderType1 = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: userTier.color, borderRightColor: userTier.color,
        borderTopColor: withAlpha(userTier.secondaryColor, '80'), borderBottomColor: withAlpha(userTier.secondaryColor, '80'),
        backgroundColor: 'rgba(5, 5, 5, 0.65)',
    };

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={userTier.themeBg as any} style={StyleSheet.absoluteFill} />

            {/* 🆕 HERO IMAGE FADING INTO BACKGROUND */}
            <ImageBackground source={{ uri: IMG_HERO }} style={styles.heroImg} imageStyle={{ opacity: 0.22 }}>
                <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(2,6,23,0.85)', '#020617']} style={StyleSheet.absoluteFill} />
            </ImageBackground>

            {/* 🆕 TWINKLING STAR FIELD */}
            {STARS.map((st, i) => (
                <Animated.View
                    key={`star-${i}`}
                    pointerEvents="none"
                    style={{
                        position: 'absolute', top: st.top, left: st.left, width: st.size, height: st.size, borderRadius: st.size,
                        backgroundColor: '#FFF',
                        opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: i % 2 === 0 ? [0.1, 0.9] : [0.9, 0.1] }),
                    }}
                />
            ))}
            
            <Animated.View style={[styles.shimmerOrb, { top: 80, right: -60, backgroundColor: userTier.color, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { bottom: 150, left: -60, backgroundColor: userTier.secondaryColor, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            <SafeAreaView style={{ flex: 1 }}>
                <Animated.View style={[styles.header, headerReveal]}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: withAlpha(userTier.color, '40') }]}>
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={styles.headerTitle}>ASSET VAULT</Text>
                        <Text style={[styles.headerSubTitle, { color: userTier.color }]}>Premium Diamond Store</Text>
                    </View>
                    {/* 🆕 LEVEL BADGE WITH ORBIT RING */}
                    <View style={styles.levelOrbitWrap}>
                        <Animated.View style={[styles.levelOrbitRing, { borderColor: userTier.color, transform: [{ rotate: orbitRotate }] }]} />
                        <View style={[styles.levelOrbitCore, { borderColor: userTier.color }]}>
                            <Text style={[styles.levelOrbitText, { color: userTier.color }]}>L{userTier.lvl}</Text>
                        </View>
                    </View>
                </Animated.View>

                <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
                    
                    {/* 🆕 3D TILT BALANCE CARD (drag it!) */}
                    <Animated.View style={[{ transform: [{ translateY: floatAnim }] }, headerReveal]}>
                        <Animated.View style={balanceTilt} {...panResponder.panHandlers}>
                            <View style={[styles.balanceGlow, { shadowColor: userTier.color }]}>
                                <View style={[styles.stealthBalanceCard, borderType1]}>
                                    <ImageBackground source={{ uri: IMG_VAULT_BG }} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.35 }} />
                                    <LinearGradient
                                        colors={['rgba(0,0,0,0.55)', withAlpha(userTier.color, '30'), 'rgba(0,0,0,0.7)']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <View style={[styles.quadBorder, { 
                                        borderLeftColor: userTier.color, borderRightColor: userTier.color, 
                                        borderTopColor: userTier.secondaryColor, borderBottomColor: userTier.secondaryColor 
                                    }]} />
                                    <Animated.View style={[styles.glowTrail, { backgroundColor: userTier.color, transform: [{ translateX: trailX }, { rotate: '30deg' }] }]} />
                                    <Animated.View pointerEvents="none" style={[styles.holoStripe, { transform: [{ translateX: holoX }, { rotate: '25deg' }] }]} />
                                    
                                    <View style={styles.cardInternal}>
                                        <View style={{ flex: 1 }}>
                                            <View style={[styles.rankBadge, { borderColor: withAlpha(userTier.color, '60') }]}>
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

                                        {/* 🆕 floating 3D gem with orbit rings */}
                                        <View style={styles.heroGemWrap}>
                                            <Animated.View style={[styles.heroRing, { borderColor: withAlpha(userTier.color, 'AA'), transform: [{ rotate: orbitRotate }] }]} />
                                            <Animated.View style={[styles.heroRingInner, { borderColor: withAlpha(userTier.secondaryColor, 'AA'), transform: [{ rotate: orbitRotateRev }] }]} />
                                            <Animated.View style={[styles.heroPulse, { backgroundColor: withAlpha(userTier.color, '40'), opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                                            <MaterialCommunityIcons name="diamond-stone" size={32} color="rgba(255,255,255,0.9)" />
                                        </View>
                                    </View>

                                    {/* 🆕 NEXT LEVEL PROGRESS BAR */}
                                    <View style={styles.progressWrap}>
                                        <View style={styles.progressTrack}>
                                            <LinearGradient
                                                colors={[withAlpha(userTier.color, 'FF'), withAlpha(userTier.secondaryColor, 'FF')]}
                                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                                style={[styles.progressFill, { width: `${Math.round(levelProgress * 100)}%` }]}
                                            />
                                        </View>
                                        <Text style={styles.progressText}>{userTier.lvl >= 8 ? 'MAX LEVEL' : `NEXT LEVEL ${Math.round(levelProgress * 100)}%`}</Text>
                                    </View>
                                </View>
                            </View>
                        </Animated.View>
                    </Animated.View>

                    {/* 🆕 SECTION TITLE WITH GLOW LINE */}
                    <View style={styles.sectionRow}>
                        <Text style={[styles.sectionTitle, { color: userTier.color }]}>SELECT ASSET BUNDLE</Text>
                        <LinearGradient
                            colors={[withAlpha(userTier.color, '80'), withAlpha(userTier.color, '00')]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={styles.sectionLine}
                        />
                    </View>

                    {BUNDLES.map((bundle, index) => (
                        <BundleCard
                            key={bundle.id}
                            bundle={bundle}
                            index={index}
                            isSelected={selected === bundle.id}
                            onPress={() => setSelected(bundle.id)}
                            tier={userTier}
                            orbitRotate={orbitRotate}
                            pulseScale={pulseScale}
                            pulseOpacity={pulseOpacity}
                        />
                    ))}
                    
                    <View style={styles.encryptionInfo}>
                        <Ionicons name="shield-checkmark" size={16} color="#10B981" />
                        <Text style={styles.encryptionText}>Secure payment via Google Play</Text>
                    </View>
                </ScrollView>

                <View style={styles.footerArea}>
                    {/* 🆕 fade-in backdrop for the footer */}
                    <LinearGradient
                        pointerEvents="none"
                        colors={['rgba(2,6,23,0)', 'rgba(2,6,23,0.95)']}
                        style={StyleSheet.absoluteFill}
                    />

                    {/* 🆕 selected bundle summary */}
                    {activeBundle && (
                        <View style={[styles.summaryRow, { borderColor: withAlpha(userTier.color, '40') }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                <Ionicons name="diamond" size={14} color={userTier.color} />
                                <Text style={styles.summaryDiamonds}>{activeBundle.diamonds}</Text>
                            </View>
                            <Text style={[styles.summaryPrice, { color: userTier.color }]}>{activeBundle.price}</Text>
                        </View>
                    )}

                    {/* 🆕 UPDATE 6: Coming Soon notice */}
                    {!RECHARGE_ENABLED && (
                        <Text style={styles.comingSoonText}>DIAMOND RECHARGE WILL BE AVAILABLE SOON</Text>
                    )}
                    <TouchableOpacity 
                        style={[styles.buyBtn, (isBuying || !RECHARGE_ENABLED) && { opacity: 0.6 }, { backgroundColor: userTier.color, shadowColor: userTier.color }]} 
                        onPress={handleBuy}
                        disabled={isBuying || !RECHARGE_ENABLED}
                    >
                        <LinearGradient
                            pointerEvents="none"
                            colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']}
                            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                            style={styles.buyBtnHighlight}
                        />
                        <Animated.View pointerEvents="none" style={[styles.buyShine, { transform: [{ translateX: shineX }, { rotate: '20deg' }] }]} />
                        {isBuying ? (
                            <ActivityIndicator color="#000" style={{ paddingVertical: 20 }} />
                        ) : (
                            <Animated.View style={[styles.buyBtnContent, { transform: [{ scale: RECHARGE_ENABLED ? pulseAnim : 1 }] }]}>
                                <Text style={styles.buyBtnLabel}>{RECHARGE_ENABLED ? 'AUTHORIZE TRANSACTION' : 'COMING SOON'}</Text>
                                <Ionicons name={RECHARGE_ENABLED ? 'flash' : 'time'} size={18} color="#000" />
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
    heroImg: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
    shimmerOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.15, filter: 'blur(100px)' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    backBtn: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 15, borderWidth: 1 },
    headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
    headerSubTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 4 },

    // 🆕 LEVEL ORBIT BADGE
    levelOrbitWrap: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
    levelOrbitRing: { position: 'absolute', width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderStyle: 'dashed', opacity: 0.8 },
    levelOrbitCore: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    levelOrbitText: { fontSize: 11, fontWeight: '900' },

    // 🆕 3D BALANCE CARD
    balanceGlow: { borderRadius: 35, shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 18, marginBottom: 35 },
    stealthBalanceCard: { height: 170, borderRadius: 35, overflow: 'hidden' },
    quadBorder: { ...StyleSheet.absoluteFillObject, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 1.2, borderBottomWidth: 1.2, borderRadius: 35, opacity: 0.8 },
    glowTrail: { position: 'absolute', width: 100, height: '200%', top: '-50%', opacity: 0.15 },
    holoStripe: { position: 'absolute', width: 60, height: '240%', top: '-70%', backgroundColor: 'rgba(255,255,255,0.14)' },
    cardInternal: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 22, paddingTop: 22, paddingBottom: 4, zIndex: 10 },
    rankBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 10, borderWidth: 1 },
    rankText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    balanceLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
    balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    balanceAmount: { color: '#FFF', fontSize: 30, fontWeight: '900' },
    heroGemWrap: { width: 78, height: 78, justifyContent: 'center', alignItems: 'center' },
    heroRing: { position: 'absolute', width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, borderStyle: 'dashed' },
    heroRingInner: { position: 'absolute', width: 58, height: 58, borderRadius: 29, borderWidth: 1, borderStyle: 'dotted' },
    heroPulse: { position: 'absolute', width: 50, height: 50, borderRadius: 25 },
    progressWrap: { paddingHorizontal: 22, paddingBottom: 16, zIndex: 10 },
    progressTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden' },
    progressFill: { height: 5, borderRadius: 3 },
    progressText: { color: 'rgba(255,255,255,0.55)', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginTop: 6 },

    sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingLeft: 5 },
    sectionTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 3 },
    sectionLine: { flex: 1, height: 1, marginLeft: 12 },

    // 🆕 BUNDLE CARDS
    bundleWrap: { marginBottom: 18, borderRadius: 25, backgroundColor: 'rgba(0,0,0,0.01)' },
    bundleItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18, borderRadius: 25, overflow: 'hidden' },
    bundleBorderBase: { borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5 },
    bundleStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, zIndex: 20 },
    bundleLeft: { flexDirection: 'row', alignItems: 'center' },
    gemWrap: { width: 58, height: 58, justifyContent: 'center', alignItems: 'center' },
    gemRing: { position: 'absolute', width: 58, height: 58, borderRadius: 29, borderWidth: 1.5, borderStyle: 'dashed' },
    gemPulse: { position: 'absolute', width: 48, height: 48, borderRadius: 24 },
    diamondIconBase: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    bundleDiamonds: { color: '#FFF', fontSize: 17, fontWeight: '900' },
    bundleTime: { color: '#64748b', fontSize: 10, marginTop: 2, fontWeight: '700' },
    priceTagArea: { alignItems: 'flex-end', position: 'relative' },
    priceActionBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
    priceValue: { fontWeight: '900', fontSize: 14 },
    checkBadge: { position: 'absolute', top: 8, right: 8, width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    popularBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, position: 'absolute', top: -10, right: 24, elevation: 8, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    popularText: { color: '#000', fontSize: 9, fontWeight: '900', letterSpacing: 1 },

    encryptionInfo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 15 },
    encryptionText: { color: '#475569', fontSize: 11, fontWeight: '800' },

    // 🆕 FOOTER
    footerArea: { padding: 20, paddingBottom: 35 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)', marginBottom: 12 },
    summaryDiamonds: { color: '#FFF', fontSize: 14, fontWeight: '900' },
    summaryPrice: { fontSize: 16, fontWeight: '900' },
    comingSoonText: { color: '#94a3b8', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textAlign: 'center', marginBottom: 12 },
    buyBtn: { borderRadius: 30, overflow: 'hidden', elevation: 15, shadowOpacity: 0.4, shadowRadius: 10 },
    buyBtnHighlight: { position: 'absolute', top: 0, left: 0, right: 0, height: '55%' },
    buyShine: { position: 'absolute', top: -20, bottom: -20, width: 40, backgroundColor: 'rgba(255,255,255,0.35)' },
    buyBtnContent: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 20, gap: 10 },
    buyBtnLabel: { color: '#000', fontSize: 15, fontWeight: '900', letterSpacing: 2 }
});
