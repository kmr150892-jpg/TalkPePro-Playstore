import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    collection,
    collectionGroup,
    doc,
    onSnapshot,
    query,
    where
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

const { width, height } = Dimensions.get('window');

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT COLOR PROTOCOL LOCKED)
const calculateUserLevel = (totalSpent: number) => {
  if (totalSpent >= 500000001) return { 
      lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#ff0000', secondaryColor: '#660000', grad: ['#ff0000', '#660000'] as const, 
      themeBg: ['#1A0000', '#000000'], layout: 'stealth', anim: 'titan', radius: 40, avatarSize: 85, icon: 'fire-circle'
  }; 
  if (totalSpent >= 100000001) return { 
      lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#ff0dba', secondaryColor: '#a50606', grad: ['#ff0dba', '#a50606'] as const, 
      themeBg: ['#15001A', '#000000'], layout: 'stealth', anim: 'mythic', radius: 40, avatarSize: 85, icon: 'lightning-bolt'
  }; 
  if (totalSpent >= 50000000) return { 
      lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#f6f60d', secondaryColor: '#02fa0a', grad: ['#f6f60d', '#02fa0a'] as const, 
      themeBg: ['#08001A', '#000000'], layout: 'stealth', anim: 'grandmaster', radius: 40, avatarSize: 85, icon: 'shield-crown'
  };
  if (totalSpent >= 10000000) return { 
      lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#f52b6092', grad: ['#00F2FE', '#f52b6092'] as const, 
      themeBg: ['#00101A', '#000000'], layout: 'stealth', anim: 'explosion', radius: 40, avatarSize: 85, icon: 'target'
  };
  if (totalSpent >= 5000000) return { 
      lvl: 4, label: 'LEGENDARY NODE', status: 'NEBULA COMMANDER', color: '#d0630a', secondaryColor: '#5f0bf0', grad: ['#d0630a', '#5f0bf0'] as const, 
      themeBg: ['#0A001A', '#000000'], layout: 'stealth', anim: 'nebula', radius: 40, avatarSize: 80, icon: 'shield-airplane'
  };
  if (totalSpent >= 1000000) return { 
      lvl: 3, label: 'DIAMOND CORE', status: 'NUCLEAR ASSET', color: '#bcde4a', secondaryColor: '#09bbf1fe', grad: ['#bcde4a', '#09bbf1fe'] as const, 
      themeBg: ['#001A0A', '#000000'], layout: 'stealth', anim: 'diamond', radius: 40, avatarSize: 80, icon: 'diamond-stone'
  };
  if (totalSpent >= 200001) return { 
      lvl: 2, label: 'GOLD OPERATIVE', status: 'ROYAL STRIKER', color: '#ffae00', secondaryColor: '#ac4a4a', grad: ['#ffae00', '#ac4a4a'] as const, 
      themeBg: ['#1A0B00', '#000000'], layout: 'stealth', anim: 'sparkle', radius: 40, avatarSize: 75, icon: 'trophy'
  };
  return { 
      lvl: 1, label: 'SILVER AGENT', status: 'STAR FAME', color: '#0f33e7', secondaryColor: '#6b0402', grad: ['#0f33e7', '#02216b'] as const, 
      themeBg: ['#050505', '#000000'], layout: 'stealth', anim: 'wave', radius: 40, avatarSize: 70, icon: 'shield-star'
  };
};

export default function ProfileScreen() {
  const router = useRouter();
  const user = auth.currentUser;
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [friendsCount, setFriendsCount] = useState(0);

  // 🔥 LEDGER STATE VARIABLES
  const [activeTab, setActiveTab] = useState<'COMMANDS' | 'STATS'>('COMMANDS');
  const [historyLogs, setHistoryLogs] = useState<any[]>([]); 
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [totalRechargeDiamonds, setTotalRechargeDiamonds] = useState<number>(0); 
  const [totalGiftsSpent, setTotalGiftsSpent] = useState<number>(0);
  const [totalVideoCallSpent, setTotalVideoCallSpent] = useState<number>(0);
  const [totalSpentCalculated, setTotalSpentCalculated] = useState<number>(0); 
  const [gameNetProfit, setGameNetProfit] = useState<number>(0); 
  const [totalRedeemed, setTotalRedeemed] = useState<number>(0); 
  const [totalEntryFees, setTotalEntryFees] = useState<number>(0); 
  const [totalMinutes, setTotalMinutes] = useState<number>(0);

  // 🌀 COMPLEX ANIMATION ENGINE MATRIX
  const scrollY = useRef(new Animated.Value(0)).current;
  const mainLoop = useRef(new Animated.Value(0)).current;
  const secondaryLoop = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const trailX = useRef(new Animated.Value(-width)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(Animated.timing(mainLoop, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(secondaryLoop, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })).start();
    
    Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 4000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true
        })
    ).start();

    const runTrail = () => {
        trailX.setValue(-width);
        Animated.timing(trailX, { toValue: width, duration: 3500, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }).start(() => runTrail());
    };
    runTrail();

    Animated.loop(Animated.sequence([
        Animated.timing(floatAnim, { toValue: -10, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
    ])).start();

    Animated.loop(Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 2, duration: 45, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -2, duration: 45, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
        Animated.delay(2000)
    ])).start();

    Animated.loop(Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.03, duration: 1500, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
    ])).start();
  }, []);

  // Fetch Base User Data
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const userRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserData(data);
        setFriendsCount(data.friendsCount || 0);
      }
      setLoading(false);
    });

    return () => { unsub(); };
  }, [user]);

  // 🔥 FETCH LEDGER & MERGED HISTORY DATA DYNAMICALLY 🔥
  useEffect(() => {
      if (!user || !userData) return;

      let rawTransactions: any[] = [];
      let rawGifts: any[] = [];
      let rawRequests: any[] = []; 
      let rawGames: any[] = []; 
      let rawCalls: any[] = []; // 🔥 Fetching calls globally here to sync everything properly

      const processAllLogs = () => {
          const myGifts = rawGifts.filter(g => 
              g.senderId === user.uid || 
              (g.senderName && userData.name && String(g.senderName).trim().toLowerCase() === String(userData.name).trim().toLowerCase())
          );

          // 🔥 EXTRACT EXPERT NAME FOR GIFTS (LIVE/FORUM)
          const enrichedGifts = myGifts.map(g => ({
              ...g,
              _enrichedName: g.expertName || g.receiverName || g.toName || g.hostName || g.creatorName || g.Name || ''
          }));

          // 🔥 EXTRACT EXPERT NAME FOR TRANSACTIONS (CONSULTATION)
          const validTransactions = rawTransactions.filter(t => {
              const typeStr = String(t.type).toUpperCase();
              return typeStr !== 'VOUCHER_REDEEM'; 
          }).map(t => {
              let enrichedName = t.expertName || t.receiverName || t.toName || t.hostName || t.creatorName || t.Name || '';
              // Cross-reference with Calls DB if name is missing
              if (!enrichedName && t.callId) {
                  const call = rawCalls.find(c => c.id === t.callId);
                  if (call) enrichedName = call.expertName || call.receiverName || '';
              }
              return { ...t, _enrichedName: enrichedName };
          });

          const mappedRequests = rawRequests.map(r => ({
              id: r.id,
              _source: 'reward_requests',
              type: 'VOUCHER_REDEEM',
              title: `Redeemed: ${r.voucherName || 'Reward Voucher'}`,
              amount: r.costDeducted || r.voucherValue || 0,
              status: r.status || 'Pending',
              timestamp: r.requestDate || r.processedDate || r.createdAt
          }));

          const mappedGames = rawGames.map(g => ({
              ...g,
              _source: 'game_history',
              timestamp: g.timestamp || g.createdAt
          }));

          // 🔥 NEW: Extracting In-Call Gifts directly from Calls Database to push to History Logs (WITH EXPERT NAME)
          const mappedCallGifts = rawCalls
              .filter(c => Math.abs(Number(String(c.totalGiftsDiamonds || 0).replace(/[^0-9.-]+/g, ''))) > 0)
              .map(c => ({
                  id: c.id + '_callgift',
                  _source: 'call_gifts',
                  type: 'GIFT',
                  title: 'In-Call Reward',
                  amount: Math.abs(Number(String(c.totalGiftsDiamonds || 0).replace(/[^0-9.-]+/g, ''))),
                  status: 'COMPLETED',
                  timestamp: c.endTime || c.createdAt || c.timestamp || c.startTime,
                  expertName: c.expertName || c.receiverName || c.toName || '', // 🔥 Expert Name mapped here
                  _enrichedName: c.expertName || c.receiverName || c.toName || ''
              }));

          // Merge everything into history
          const mergedLogs = [...validTransactions, ...enrichedGifts, ...mappedRequests, ...mappedGames, ...mappedCallGifts];

          mergedLogs.sort((a, b) => {
              const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : 0);
              const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : 0);
              return timeB - timeA;
          });

          setHistoryLogs(mergedLogs);

          // ================= STATS CALCULATION ENGINE =================

          // Calculate Video Call Minutes safely from rawCalls
          const totalSecs = rawCalls.reduce((acc, curr) => acc + (Number(curr.finalDuration) || Number(curr.duration) || 0), 0);
          setTotalMinutes(Math.floor(totalSecs / 60));
          
          // 1. Calculate Recharge (Asset Added)
          const calcRecharge = rawTransactions.reduce((sum, log) => {
              const typeStr = String(log.type || '').toUpperCase();
              const itemStatus = String(log.status || '').toLowerCase();
              if (typeStr.includes('RECHARGE') && (itemStatus === 'success' || itemStatus === 'completed')) {
                  let d = Number(log.diamonds) || Number(log.diamondsAdded) || 0;
                  if (d === 0) d = (Number(log.amount) || 0) * 100;
                  return sum + d;
              }
              return sum;
          }, 0);
          setTotalRechargeDiamonds(calcRecharge);

          // 2. 🔥 Calculate ALL Gifts (Standalone + In-Call) 🔥
          const calcGiftsFromNested = myGifts.reduce((sum, log) => sum + (Number(log.amount) || Number(log.diamonds) || Number(log.price) || 0), 0);
          const calcGiftsFromTx = rawTransactions.reduce((sum, log) => {
              const typeStr = String(log.type || '').toUpperCase();
              if (typeStr === 'GIFT' || typeStr.includes('GIFT')) {
                  return sum + (Number(log.amount) || Number(log.diamonds) || Number(log.price) || 0);
              }
              return sum;
          }, 0);
          const calcCallGifts = mappedCallGifts.reduce((sum, log) => sum + log.amount, 0); // Adding mapped call gifts
          
          const calcGifts = calcGiftsFromNested + calcGiftsFromTx + calcCallGifts;
          setTotalGiftsSpent(calcGifts);

          // 3. Calculate Video Call Spent
          const calcVideoCalls = rawTransactions.reduce((sum, log) => {
              if (String(log.type || '').toUpperCase().includes('CALL')) { 
                  return sum + (Number(log.amount) || Number(log.diamonds) || Number(log.price) || 0);
              }
              return sum;
          }, 0);
          setTotalVideoCallSpent(calcVideoCalls);

          // 4. Calculate Redeemed Vouchers
          const calcRedeemed = rawRequests.reduce((sum, log) => {
              const statusStr = String(log.status || '').toLowerCase();
              if (statusStr !== 'failed' && statusStr !== 'rejected') {
                  return sum + (Number(log.costDeducted) || Number(log.voucherValue) || Number(log.amount) || 0);
              }
              return sum;
          }, 0);
          setTotalRedeemed(calcRedeemed);

          // 5. Calculate Activity Rewards & EXCLUSIVE Game Entry Fees Calculation 🔥
          let totalGameEntryFeesAll = 0; 
          let totalGameRefundsAll = 0; 
          
          const calcGameNet = rawGames.reduce((sum, log) => {
              const rawStatus = String(log.status || '').toUpperCase();
              const typeStr = String(log.type || '').toUpperCase();
              const titleStr = String(log.gameName || log.title || '').toUpperCase();
              
              const isWin = rawStatus.includes('WIN') || rawStatus === 'WON' || rawStatus.includes('REWARD') || typeStr.includes('WIN') || typeStr.includes('REWARD') || titleStr.includes('WIN') || titleStr.includes('REWARD') || Number(String(log.winAmount || 0).replace(/[^0-9.-]+/g, '')) > 0;
              
              // 🔥 If game is Cancelled or Refunded, completely isolate it
              const isRefundTx = typeStr.includes('REFUND') || titleStr.includes('REFUND') || rawStatus.includes('REFUND');
              const isFailedOrCancelled = rawStatus.includes('CANCEL') || rawStatus.includes('FAIL');
              
              let winVal = 0;
              let entryVal = Math.abs(Number(String(log.entryFee || log.entryAmount || log.Amount || log.fee || log.cost || 0).replace(/[^0-9.-]+/g, ''))) || 0; 

              if (isRefundTx) {
                  totalGameRefundsAll += entryVal;
              } else if (!isFailedOrCancelled) {
                  totalGameEntryFeesAll += entryVal; 
              }

              if (isWin && !isFailedOrCancelled && !isRefundTx) {
                  winVal = Math.abs(Number(String(log.winAmount || log.rewardAmount || log.amount || log.prize || 0).replace(/[^0-9.-]+/g, ''))) || 0;
                  return sum + winVal;
              }
              return sum; 
          }, 0);

          const calcTxGameNet = rawTransactions.reduce((sum, log) => {
              const typeStr = String(log.type || '').toUpperCase();
              const titleStr = String(log.title || '').toUpperCase();
              const statusStr = String(log.status || '').toUpperCase();
              
              let amountVal = Math.abs(Number(String(log.amount || log.diamonds || log.diamondsAdded || log.winAmount || log.entryFee || log.price || log.fee || 0).replace(/[^0-9.-]+/g, ''))) || 0;

              // 🔥 1. ABSOLUTE STOP FOR ANY REFUND
              const isRefundTx = typeStr.includes('REFUND') || titleStr.includes('REFUND') || statusStr.includes('REFUND');
              const isGameRelated = typeStr.includes('ARENA') || typeStr.includes('GAME') || typeStr.includes('ENTRY') || 
                                    titleStr.includes('ARENA') || titleStr.includes('GAME') || titleStr.includes('ENTRY');

              if (isRefundTx) {
                  if (isGameRelated) {
                      totalGameRefundsAll += amountVal;
                  }
                  return sum; // 🛑 STRICTLY STOP HERE IF IT IS A REFUND
              }

              // 🔥 2. ONLY PROCEED IF IT IS DEFINITELY NOT A REFUND
              const isGameReward = typeStr.includes('WINNER') || typeStr.includes('REWARD') || titleStr.includes('WINNER') || titleStr.includes('REWARD') || statusStr.includes('WINNER') || statusStr.includes('REWARD');
              const isGameEntry = typeStr.includes('ARENA_ENTRY') || typeStr.includes('GAME_ENTRY') || typeStr.includes('ARENA') || typeStr.includes('ENTRY') || titleStr.includes('ARENA') || titleStr.includes('ENTRY');
              const isFailed = statusStr.includes('CANCEL') || statusStr.includes('FAIL');

              if (isGameReward) {
                  if (!isFailed) return sum + amountVal;
                  return sum;
              }
              
              if (isGameEntry) {
                  if (!isFailed) {
                      totalGameEntryFeesAll += amountVal;
                  }
                  return sum;
              }

              return sum;
          }, 0);

          setGameNetProfit(calcGameNet + calcTxGameNet);

          // 6. Calculate ALL General Refunds
          const calcRefunds = rawTransactions.reduce((sum, log) => {
              if (String(log.type || '').toUpperCase().includes('REFUND')) {
                  return sum + (Number(log.amount) || Number(log.diamonds) || 0);
              }
              return sum;
          }, 0);

          // 7. Calculate Total Spent / Asset Utilized
          const grandTotalSpent = Math.max(0, calcVideoCalls + calcGifts + calcRedeemed);
          setTotalSpentCalculated(grandTotalSpent);

          // 🔥 TOTAL ARENA ENTRY : Accurately subtract Game Refunds
          setTotalEntryFees(Math.max(0, totalGameEntryFeesAll - totalGameRefundsAll));

          setLedgerLoading(false);
      };

      // Ensure we listen to all collections
      const qHistory = query(collection(db, 'transactions'), where('userId', '==', user.uid));
      const unsubHistory = onSnapshot(qHistory, (snap) => {
          rawTransactions = snap.docs.map(d => ({ id: d.id, _source: 'transactions', ...(d.data() as any) }));
          processAllLogs();
      });

      const qGifts = query(collectionGroup(db, 'gifts'));
      const unsubGifts = onSnapshot(qGifts, (snap) => {
          rawGifts = snap.docs.map(d => ({ id: d.id, _source: 'nested_gifts', ...(d.data() as any) }));
          processAllLogs();
      });

      const qRequests = query(collection(db, 'reward_requests'), where('userId', '==', user.uid));
      const unsubRequests = onSnapshot(qRequests, (snap) => {
          rawRequests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          processAllLogs();
      });

      const qGameHistory = query(collection(db, "users", user.uid, "activityHistory"));
      const unsubGameHistory = onSnapshot(qGameHistory, (snap) => {
          rawGames = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          processAllLogs();
      });

      // 🔥 Calls Snapshot integration
      const qCalls = query(collection(db, "calls"), where("callerId", "==", user.uid));
      const unsubCalls = onSnapshot(qCalls, (snap) => {
          rawCalls = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          processAllLogs();
      });

      return () => { unsubHistory(); unsubGifts(); unsubRequests(); unsubGameHistory(); unsubCalls(); };
  }, [user, userData]);

  const totalSpent = userData?.totalSpentDiamonds || 0;
  const rank = calculateUserLevel(totalSpent);
  const uPic = userData?.profilePic || `https://ui-avatars.com/api/?name=${userData?.name || 'User'}&background=1E293B&color=fff&bold=true`;

  const parallaxBg = scrollY.interpolate({ inputRange: [0, 300], outputRange: [0, -40], extrapolate: 'clamp' });
  const bgOpacity = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0.12, 0.05], extrapolate: 'clamp' });
  const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });

  const getDynamicStyle = () => {
    switch(rank.anim) {
      case 'wave': return { transform: [{ translateY: mainLoop.interpolate({ inputRange:[0, 0.5, 1], outputRange:[0, 6, 0] }) }] };
      case 'sparkle': return { transform: [{ scale: scaleAnim }, { translateY: floatAnim }] };
      case 'diamond': return { transform: [{ perspective: 1000 }, { rotateY: mainLoop.interpolate({ inputRange:[0, 1], outputRange:['0deg', '360deg'] }) }] };
      case 'nebula': return { transform: [{ perspective: 1000 }, { rotateX: '10deg' }, { scale: scaleAnim }] };
      case 'explosion': return { transform: [{ scale: secondaryLoop.interpolate({ inputRange:[0, 0.1, 1], outputRange:[1, 1.08, 1] }) }] };
      case 'titan': return { transform: [{ translateX: shakeAnim }, { scale: 1.03 }] };
      default: return { transform: [{ translateY: floatAnim }] };
    }
  };

  const menuItems = [
    { id: '1', title: 'EDIT PROFILE', icon: 'finger-print', color: rank.color, route: '/edit-profile' },
    { id: '2', title: 'Session Archives', icon: 'analytics', color: rank.secondaryColor, route: '/history' }, 
    { id: 'friends', title: 'Network Circle', icon: 'planet', color: rank.color, route: '/friends' }, 
    { id: '3', title: 'Asset Vault', icon: 'shield-checkmark', color: rank.secondaryColor, route: '/recharge' },
    { id: '4', title: 'Support Center', icon: 'construct', color: rank.color, route: '/support' },
    { id: '5', title: 'Privacy Policy', icon: 'ribbon', color: rank.secondaryColor, route: '/legal' },
  ];
  
  const borderType1 = {
      borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
      borderLeftColor: rank.color, borderRightColor: rank.color,
      borderTopColor: rank.secondaryColor + '80', borderBottomColor: rank.secondaryColor + '80',
      backgroundColor: 'rgba(5, 5, 5, 0.85)',
  };

  const borderType2 = {
      borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
      borderLeftColor: rank.secondaryColor, borderRightColor: rank.secondaryColor,
      borderTopColor: rank.color + '80', borderBottomColor: rank.color + '80',
      backgroundColor: 'rgba(5, 5, 5, 0.85)',
  };

  const renderDynamicProfileCard = () => {
    return (
      <Animated.View style={[styles.cardBase, borderType1, { borderRadius: rank.radius, ...getDynamicStyle() }]}>
        <Animated.View style={[styles.glowTrail, { backgroundColor: rank.color, transform: [{ translateX: trailX }] }]} />
        <View style={styles.cardGlassOverlay} />
        
        <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 10 }}>
          <View style={styles.avatarNode}>
            <View style={[styles.ring, { borderRadius: 100, borderWidth: 2, borderColor: rank.color, shadowColor: rank.color, shadowOpacity: 0.8, shadowRadius: 12, elevation: 12 }]}>
              <Image source={{ uri: uPic }} style={{ width: rank.avatarSize, height: rank.avatarSize, borderRadius: 100 }} />
            </View>
          </View>
          
          <View style={{ marginLeft: 15, flex: 1 }}>
              <View style={[styles.badge, { borderColor: rank.color, backgroundColor: rank.color + '15' }]}>
                <MaterialCommunityIcons name={rank.icon as any} size={11} color={rank.color} />
                <Text style={[styles.badgeText, { color: rank.color }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{rank.label}</Text>
              </View>
              <Text style={styles.nameRow} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>{userData?.name || 'SYNCING...'}</Text>
              <Text style={[styles.statusText, { color: rank.secondaryColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{rank.status}</Text>
          </View>
        </View>

        <View style={[styles.rowStats, { borderTopColor: 'rgba(255,255,255,0.06)' }]}>
          <View style={styles.stat}><Text style={styles.statV}>{friendsCount}</Text><Text style={styles.statL}>NETWORK</Text></View>
          <View style={[styles.stat, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }]}>
            <Text style={styles.statV} adjustsFontSizeToFit minimumFontScale={0.4} numberOfLines={1}>{(userData?.balance || 0).toLocaleString()}</Text>
            <Text style={styles.statL}>ASSETS</Text>
          </View>
          <View style={styles.stat}><Text style={[styles.statV, {color: rank.color}]}>L{rank.lvl}</Text><Text style={styles.statL}>LEVEL</Text></View>
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={rank.themeBg as any} style={StyleSheet.absoluteFill} />
      
      {/* 🔥 DYNAMIC ANIMATED SHIMMER ORBS */}
      <Animated.View style={[styles.shimmerOrb, { top: 100, right: -60, backgroundColor: rank.color, transform: [{ translateY: orbTranslateY }] }]} />
      <Animated.View style={[styles.shimmerOrb, { bottom: 200, left: -90, backgroundColor: rank.secondaryColor, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

      <Animated.View style={[styles.aura, { top: 40, left: -50, backgroundColor: rank.color, opacity: bgOpacity, transform: [{ translateY: parallaxBg }] }]} />
      <Animated.View style={[styles.aura, { bottom: 40, right: -50, backgroundColor: rank.secondaryColor, opacity: 0.06, transform: [{ translateY: parallaxBg }] }]} />

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollPadding}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
      >
        <SafeAreaView edges={['top']}>
          <View style={styles.cardContainer}>{renderDynamicProfileCard()}</View>
        </SafeAreaView>

        {/* 🔥 TABS SECTION (2 TABS ONLY) 🔥 */}
        <View style={styles.tabsRow}>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'COMMANDS' && { backgroundColor: rank.color + '40', borderColor: rank.color }]} onPress={() => setActiveTab('COMMANDS')}>
                <Text style={[styles.tabText, activeTab === 'COMMANDS' && { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>COMMANDS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'STATS' && { backgroundColor: rank.color + '40', borderColor: rank.color }]} onPress={() => setActiveTab('STATS')}>
                <Text style={[styles.tabText, activeTab === 'STATS' && { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>STATS</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.menuBox}>
            {/* 1. COMMANDS TAB */}
            {activeTab === 'COMMANDS' && (
                <>
                  {menuItems.map((item, index) => {
                      const itemBorderStyle = index % 2 === 0 ? borderType2 : borderType1;
                      return (
                        <TouchableOpacity key={item.id} style={[styles.neonRow, itemBorderStyle, { borderLeftColor: item.color, borderLeftWidth: 4 }]} onPress={() => router.push(item.route as any)} activeOpacity={0.6}>
                          <View style={[styles.neonIcon, { backgroundColor: item.color + '15', borderColor: item.color + '40' }]}><Ionicons name={item.icon as any} size={20} color={item.color} /></View>
                          <View style={{ flex: 1, marginLeft: 18 }}>
                              <Text style={styles.neonLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>{item.title.toUpperCase()}</Text>
                              <Text style={styles.neonSub} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.6}>Status: ACCESS_GRANTED</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
                        </TouchableOpacity>
                      );
                  })}
                </>
            )}

            {/* 2. STATS TAB */}
            {activeTab === 'STATS' && (
                <View>
                    {ledgerLoading ? (
                        <ActivityIndicator size="large" color={rank.color} style={{ marginTop: 40 }} />
                    ) : (
                        <View style={styles.statsContainer}>
                            <View style={[styles.ledgerBox, borderType1]}>
                                <View style={[styles.iconCircle, { backgroundColor: '#10B98130' }]}><MaterialCommunityIcons name="cash-plus" size={24} color="#10B981" /></View>
                                <Text style={styles.statBoxValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>{totalRechargeDiamonds} 💎</Text>
                                <Text style={styles.statBoxLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>ASSETS ADDED</Text>
                            </View>
                            <View style={[styles.ledgerBox, borderType2]}>
                                <View style={[styles.iconCircle, { backgroundColor: '#F43F5E30' }]}><MaterialCommunityIcons name="diamond-stone" size={24} color="#F43F5E" /></View>
                                <Text style={styles.statBoxValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>{totalSpentCalculated} 💎</Text>
                                <Text style={styles.statBoxLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>ASSETS UTILIZED</Text>
                            </View>
                            <View style={[styles.ledgerBox, borderType1]}>
                                <View style={[styles.iconCircle, { backgroundColor: gameNetProfit >= 0 ? '#10B98130' : '#EF444430' }]}><MaterialCommunityIcons name="gamepad-variant" size={24} color={gameNetProfit >= 0 ? "#10B981" : "#EF4444"} /></View>
                                <Text style={styles.statBoxValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>{gameNetProfit > 0 ? '+' : ''}{gameNetProfit} 💎</Text>
                                <Text style={styles.statBoxLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>ACTIVITY REWARDS</Text>
                            </View>
                            <View style={[styles.ledgerBox, borderType2]}>
                                <View style={[styles.iconCircle, { backgroundColor: '#A855F730' }]}><MaterialCommunityIcons name="gift" size={24} color="#A855F7" /></View>
                                <Text style={styles.statBoxValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>{totalGiftsSpent} 💎</Text>
                                <Text style={styles.statBoxLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>REWARDS SENT</Text>
                            </View>
                            <View style={[styles.ledgerBox, borderType1]}>
                                <View style={[styles.iconCircle, { backgroundColor: '#3B82F630' }]}><MaterialCommunityIcons name="video-vintage" size={24} color="#3B82F6" /></View>
                                <Text style={styles.statBoxValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>{totalVideoCallSpent} 💎</Text>
                                <Text style={styles.statBoxLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>CONSULTATION SPENT</Text>
                            </View>
                            <View style={[styles.ledgerBox, borderType2]}>
                                <View style={[styles.iconCircle, { backgroundColor: '#F59E0B30' }]}><MaterialCommunityIcons name="clock-outline" size={24} color="#F59E0B" /></View>
                                <Text style={styles.statBoxValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>{totalMinutes}</Text>
                                <Text style={styles.statBoxLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>CONSULTATION MINS</Text>
                            </View>
                            
                            {/* 🔥 NEW TOTAL ARENA ENTRY BOX 🔥 */}
                            <View style={[styles.ledgerBox, borderType2, { width: '100%' }]}>
                                <View style={[styles.iconCircle, { backgroundColor: '#EF444430' }]}><MaterialCommunityIcons name="sword-cross" size={24} color="#EF4444" /></View>
                                <Text style={styles.statBoxValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>{totalEntryFees.toLocaleString()} 💎</Text>
                                <Text style={styles.statBoxLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>TOTAL ARENA ENTRY</Text>
                            </View>
                        </View>
                    )}
                </View>
            )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.verText}>TALKPE PRO OS v1.0.5 • SECURE_NODE</Text>
          <View style={[styles.secureNode, { borderColor: 'rgba(255,255,255,0.08)' }]}>
              <MaterialCommunityIcons name="shield-check" size={12} color={rank.color} />
              <Text style={[styles.secureText, { color: rank.color }]}>Quantum Link Secure</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#020617' },
  shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
  scrollPadding: { paddingBottom: 150 },
  aura: { position: 'absolute', width: 450, height: 450, borderRadius: 225, filter: 'blur(120px)' },
  cardContainer: { margin: 16, marginTop: 10 },
  cardGlassOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.01)' },
  
  cardBase: { padding: 25, elevation: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.9, shadowRadius: 30 },
  avatarNode: { position: 'relative' },
  ring: { padding: 4, backgroundColor: 'rgba(0,0,0,0.4)' },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, marginBottom: 10 },
  badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginLeft: 4 },
  nameRow: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: -0.5 },
  statusText: { fontSize: 10, fontWeight: '800', marginTop: 4, letterSpacing: 2 },
  rowStats: { flexDirection: 'row', marginTop: 22, paddingTop: 18 },
  stat: { flex: 1, alignItems: 'center' },
  statV: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  statL: { color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: '900', marginTop: 6, letterSpacing: 1.5 },

  glowTrail: { position: 'absolute', width: 120, height: '220%', top: '-60%', opacity: 0.15, transform: [{ rotate: '40deg' }] },

  menuBox: { paddingHorizontal: 16, marginTop: 10 },
  
  tabsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 10, marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, padding: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
  tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900', letterSpacing: 1 },

  headerSection: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  backBtn: { width: 45, height: 45, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  screenTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  placeholderBtn: { width: 45 },
  talktimeHighlight: { alignItems: 'center' },
  totalTalkLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 5 },
  minsDisplay: { flexDirection: 'row', alignItems: 'flex-end' },
  bigMins: { color: '#FFF', fontSize: 44, fontWeight: '900', lineHeight: 46 },
  minSuffix: { color: '#475569', fontSize: 12, fontWeight: '800', marginLeft: 8, marginBottom: 6 },

  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  ledgerBox: { width: '48%', padding: 20, borderRadius: 25, alignItems: 'center', elevation: 10 },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statBoxValue: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 4 },
  statBoxLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '900', letterSpacing: 1, textAlign: 'center' },

  historyCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 25, marginBottom: 12, elevation: 10 },
  historyIconBox: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  historyTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5, marginBottom: 4 },
  historyDate: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  historyAmount: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  historyStatus: { fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  emptyBox: { alignItems: 'center', marginTop: 40, opacity: 0.7 },
  emptyText: { color: 'rgba(255,255,255,0.4)', marginTop: 10, fontSize: 12, fontWeight: '900', letterSpacing: 1 },

  neonRow: { flexDirection: 'row', alignItems: 'center', padding: 20, borderRadius: 25, marginBottom: 15, elevation: 10 },
  neonIcon: { width: 50, height: 50, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  neonLabel: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  neonSub: { color: 'rgba(255,255,255,0.3)', fontSize: 10, marginTop: 4, fontWeight: '800', letterSpacing: 1 },

  logoutWrapper: { marginHorizontal: 0, marginTop: 30, borderRadius: 30, overflow: 'hidden' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 22, gap: 12 },
  logoutLabel: { fontWeight: '900', fontSize: 14, letterSpacing: 3, color: '#EF4444' },
  footer: { alignItems: 'center', marginTop: 80 },
  verText: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  secureNode: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 15, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, borderWidth: 1 },
  secureText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },

  // Stealth History Card Specifics
  stealthHistoryCard: { backgroundColor: 'rgba(5,5,5,0.7)', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  sessionBadge: { position: 'absolute', top: -1, right: 18, paddingHorizontal: 10, paddingVertical: 4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 10 },
  sessionTypeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, zIndex: 10 },
  expertThumbRing: { width: 54, height: 54, borderRadius: 18, borderWidth: 1.5, elevation: 10, shadowOpacity: 0.5, shadowRadius: 8 },
  expertThumb: { width: '100%', height: '100%', borderRadius: 15 },
  expertInfo: { flex: 1, marginLeft: 15 },
  expertName: { color: '#FFF', fontSize: 14, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5 },
  callDateText: { color: '#475569', fontSize: 10, fontWeight: '800' },
  costContainer: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  costText: { fontSize: 17, fontWeight: '900' },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, zIndex: 10 },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'center' },
  statValueText: { color: '#94A3B8', fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  vDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 8 },
  talkAgainBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', flex: 1 },
  talkAgainText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  floatingReaction: { position: 'absolute' }
});