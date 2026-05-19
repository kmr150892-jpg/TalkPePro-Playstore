import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, collectionGroup, doc, onSnapshot, query, where } from 'firebase/firestore';
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
import { auth, db } from '../../../../firebaseConfig';

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

export default function UserPassbookDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const user = auth.currentUser;
  
  const [userData, setUserData] = useState<any>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]); 
  const [totalRecharge, setTotalRecharge] = useState<number>(0);
  const [totalGiftsSpent, setTotalGiftsSpent] = useState<number>(0);
  const [totalVideoCallSpent, setTotalVideoCallSpent] = useState<number>(0); 
  const [totalSpentCalculated, setTotalSpentCalculated] = useState<number>(0); 
  const [gameNetProfit, setGameNetProfit] = useState<number>(0); 
  const [totalRedeemed, setTotalRedeemed] = useState<number>(0); 
  const [totalMinutes, setTotalMinutes] = useState<number>(0); 
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'STATS' | 'HISTORY'>('STATS'); 

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

  // 🔥 FETCH LEDGER & MERGED HISTORY DATA DYNAMICALLY 🔥
  useEffect(() => {
      if (!id) return;

      let currentUserData: any = null;
      let rawTransactions: any[] = [];
      let rawGifts: any[] = [];
      let rawRequests: any[] = []; 
      let rawGames: any[] = []; 
      let rawCalls: any[] = []; 

      // 🔥 MASTER FUNCTION: Merges and calculates everything accurately!
      const processAllLogs = () => {
          if (!currentUserData) return;

          // 1. Calculate Video Calls Minutes and Spent
          let callMins = 0;
          let callSpent = 0;
          rawCalls.forEach(c => {
              callMins += (Number(c.finalDuration) || Number(c.duration) || 0);
              callSpent += (Number(c.totalDiamonds) || 0) + (Number(c.totalGiftsDiamonds) || 0);
          });
          setTotalMinutes(Math.floor(callMins / 60));
          setTotalVideoCallSpent(callSpent);

          // 2. Calculate Games Net Earnings (Win - Loss)
          let tGameWin = 0;
          let tGameLoss = 0;
          rawGames.forEach(g => {
              const isWin = String(g.status || '').toUpperCase() === 'WIN';
              if (isWin) {
                  tGameWin += (Number(g.winAmount) || 0);
              } else {
                  tGameLoss += (Number(g.lossAmount) || Number(g.entryFee) || 0);
              }
          });
          setGameNetProfit(tGameWin - tGameLoss);

          // 3. Filter nested gifts & 🔥 SATTI FIX: Fetch ALL Gifts Accurate Math 🔥
          const myGifts = rawGifts.filter(g => 
              g.senderId === id || 
              (g.senderName && currentUserData.name && String(g.senderName).trim().toLowerCase() === String(currentUserData.name).trim().toLowerCase())
          );

          const calcGiftsFromNested = myGifts.reduce((sum, g) => sum + (Number(g.amount) || Number(g.diamonds) || Number(g.price) || 0), 0);
          
          const calcGiftsFromTx = rawTransactions.reduce((sum, t) => {
              const typeStr = String(t.type || '').toUpperCase();
              if (typeStr === 'GIFT' || typeStr.includes('GIFT')) {
                  return sum + (Number(t.amount) || Number(t.diamonds) || Number(t.price) || 0);
              }
              return sum;
          }, 0);
          
          const tGifts = calcGiftsFromNested + calcGiftsFromTx;
          setTotalGiftsSpent(tGifts);

          // 4. Redeemed Vouchers
          let tRedeemed = 0;
          rawRequests.forEach(r => {
              const statusStr = String(r.status || '').toLowerCase();
              if (statusStr !== 'failed' && statusStr !== 'rejected') {
                  // Accurately fetching value from the structure provided in image
                  tRedeemed += (Number(r.costDeducted) || Number(r.voucherValue) || Number(r.amount) || 0);
              }
          });
          setTotalRedeemed(tRedeemed);

          // 5. Calculate Recharge & Other Unknown Spends
          let tRecharge = 0;
          let tOtherSpent = 0;

          rawTransactions.forEach(t => {
              const typeStr = String(t.type || '').toUpperCase();
              const statusStr = String(t.status || '').toLowerCase();

              if (typeStr.includes('RECHARGE') && statusStr === 'success') {
                  tRecharge += (Number(t.amount) || 0);
              } else {
                  // 🔥 AVOID DOUBLE COUNTING: Ignore types we already calculated above
                  const isCall = typeStr.includes('CALL');
                  const isGame = typeStr.includes('GAME') || typeStr.includes('WINNER') || typeStr.includes('entry');
                  const isVoucher = typeStr.includes('VOUCHER');
                  const isGift = typeStr.includes('GIFT');
                  const isRechargeAny = typeStr.includes('RECHARGE'); 

                  if (!isCall && !isGame && !isVoucher && !isGift && !isRechargeAny) {
                      tOtherSpent += (Number(t.amount) || Number(t.diamonds) || Number(t.price) || 0);
                  }
              }
          });
          setTotalRecharge(tRecharge);

          // 🔥 6. ACCURATE TOTAL SPENT (Excludes Recharge, Includes Gifts) 🔥
          setTotalSpentCalculated(callSpent + tGifts + tRedeemed + tGameLoss + tOtherSpent);

          // 7. BUILD UI HISTORY LOGS
          const validTransactions = rawTransactions.filter(t => {
              const ts = String(t.type).toUpperCase();
              return ts !== 'VOUCHER_REDEEM' && !ts.includes('GAME_bet') && !ts.includes('WINNER') && !ts.includes('CALL');
          });

          // Fallback added for amount Discovering the screenshot exactly
          const mappedRequests = rawRequests.map(r => ({
              id: r.id,
              _source: 'reward_requests',
              type: 'VOUCHER_REDEEM',
              title: `Authorized Allocation: ${r.voucherName || 'System Voucher'}`,
              amount: r.costDeducted || r.voucherValue || r.amount || 0,
              status: r.status || 'Pending',
              timestamp: r.requestDate || r.processedDate || r.createdAt || new Date()
          }));

          const mappedGames = rawGames.map(g => ({
              ...g,
              _source: 'game_history',
              timestamp: g.timestamp || g.createdAt || new Date()
          }));

          // 🔥 SATTI FIX: Map Calls into History Logs so they show in All Txns 🔥
          const mappedCalls = rawCalls.map(c => ({
              id: c.id,
              _source: 'video_calls',
              type: 'VIDEO_CALL',
              title: `Session ${c.expertName ? 'with ' + c.expertName : ''}`,
              amount: Number(c.totalDiamonds) || 0,
              status: c.status === 'completed' || c.status === 'user_ended' || c.status === 'ended' ? 'COMPLETED' : c.status,
              timestamp: c.endedAt || c.createdAt || new Date()
          }));

          // Merge Streams (Including mappedCalls)
          const mergedLogs = [...validTransactions, ...myGifts, ...mappedRequests, ...mappedGames, ...mappedCalls];

          // 🔥 BULLETPROOF TIMESTAMP SORTING 🔥
          mergedLogs.sort((a, b) => {
              const getT = (val: any) => {
                  const t = val?.timestamp || val?.createdAt || val?.requestDate;
                  if (!t) return 0;
                  if (t.toMillis) return t.toMillis();
                  if (t.seconds) return t.seconds * 1000;
                  if (t.getTime) return t.getTime();
                  if (typeof t === 'number') return t;
                  if (typeof t === 'string') return new Date(t).getTime();
                  return 0;
              };
              return getT(b) - getT(a);
          });

          // Optimize list size to avoid hang
          setHistoryLogs(mergedLogs.slice(0, 100));
          setLoading(false);
      };

      // Fetch Exact User Profile Data
      const unsubUser = onSnapshot(doc(db, 'users', id as string), (docSnap) => {
          if (docSnap.exists()) {
              currentUserData = { id: docSnap.id, ...(docSnap.data() as any) };
              setUserData(currentUserData);
              processAllLogs(); 
          }
      });

      // Fetch User's Transactions
      const qHistory = query(
          collection(db, 'transactions'),
          where('userId', '==', id)
      );
      const unsubHistory = onSnapshot(qHistory, (snap) => {
          rawTransactions = snap.docs.map(d => ({ id: d.id, _source: 'transactions', ...(d.data() as any) }));
          processAllLogs();
      }, (error) => console.error("Error fetching transactions: ", error));

      // Fetch ALL Gifts across DB
      const qGifts = query(collectionGroup(db, 'gifts'));
      const unsubGifts = onSnapshot(qGifts, (snap) => {
          rawGifts = snap.docs.map(d => ({ id: d.id, _source: 'nested_gifts', ...(d.data() as any) }));
          processAllLogs();
      }, (error) => console.error("FIREBASE INDEX ERROR: ", error));

      // Fetch actual reward requests
      const qRequests = query(collection(db, 'reward_requests'), where('userId', '==', id));
      const unsubRequests = onSnapshot(qRequests, (snap) => {
          rawRequests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          processAllLogs();
      });

      // Fetch Game History
      const qGameHistory = query(collection(db, "users", id as string, "gameHistory"));
      const unsubGameHistory = onSnapshot(qGameHistory, (snap) => {
          rawGames = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          processAllLogs();
      });

      // Fetch Video Calls
      const qCalls = query(collection(db, "calls"), where("callerId", "==", id));
      const unsubCalls = onSnapshot(qCalls, (snap) => {
          rawCalls = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          processAllLogs();
      });

      return () => {
          unsubUser();
          unsubHistory();
          unsubGifts();
          unsubRequests();
          unsubGameHistory();
          unsubCalls();
      };
  }, [id]);

  if (loading) {
      return (
          <View style={styles.loader}>
              <ActivityIndicator size="large" color="#6366F1" />
              <Text style={styles.loaderText}>Decrypting Audit Trail...</Text>
          </View>
      );
  }

  if (!userData) {
      return <View style={styles.loader}><Text style={{color: '#FFF'}}>Account record not found in secure vault.</Text></View>;
  }

  const totalSpent = userData?.totalSpentDiamonds || 0;
  const rank = calculateUserLevel(totalSpent);
  const uPic = userData?.profilePic || `https://ui-avatars.com/api/?name=${userData?.name || 'Client'}&background=1E293B&color=fff&bold=true`;

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

  // 🎨 RENDER LIST ITEMS
  const renderListItem = ({ item, index }: { item: any, index: number }) => {
      let iconName = "swap-horizontal";
      let iconColor = "#94A3B8";
      let sign = "-";
      let currency = "💎";
      let amountValue = item.amount || item.price || item.diamonds || item.diamondsAdded || 0;
      let titleText = item.title || item.type || 'System Action';
      let statusText = item.status || 'VERIFIED';
      let statusColor = String(item.status).toLowerCase() === 'success' || String(item.status).toLowerCase() === 'completed' ? '#10B981' : '#F59E0B';

      const itemType = String(item.type || '').toUpperCase();
      
      // 🎮 GAME HISTORY UI LOGIC 🎮
      if (item._source === 'game_history') {
          const isWin = String(item.status || "").toUpperCase() === "WIN";
          iconColor = isWin ? '#10B981' : '#F43F5E';
          
          const isRacing = String(item.gameType).toUpperCase() === "RACING";
          iconName = isRacing ? "car" : "dice-multiple"; 
          
          const finalAmount = isWin ? (Number(item.winAmount) || 0) : (Number(item.lossAmount) || Number(item.entryFee) || 0);
          
          titleText = `Activity: ${String(item.gameType).toUpperCase()}`;
          amountValue = finalAmount;
          sign = isWin ? '+' : '-';
          statusText = isWin ? 'GRANTED' : 'CONSUMED';
          statusColor = iconColor;
      }
      else {
          const isRecharge = itemType.includes('RECHARGE');
          const isCall = itemType.includes('CALL');
          const isbet = itemType === 'GAME_bet';
          const isWinner = itemType.includes('WINNER');
          const isVoucher = itemType === 'VOUCHER_REDEEM' || item._source === 'reward_requests'; 

          const isGiftUI = item._source === 'nested_gifts' || (!isRecharge && !isCall && !isbet && !isWinner && !isVoucher && itemType.includes('GIFT'));
          
          if (isGiftUI) {
              iconName = "gift";
              iconColor = "#A855F7"; 
              if (item._source === 'nested_gifts') {
                  const theGiftName = item.giftName || item.name || 'Virtual Resource';
                  titleText = `${item.icon ? item.icon + ' ' : ''}${theGiftName}`;
              } else {
                  titleText = item.giftName ? `Allocation: ${item.giftName}` : 'Virtual Allocation';
              }
              statusText = 'FINALIZED';
              statusColor = '#10B981';
          }
          else if (isRecharge) { 
              iconName = "cash-plus"; iconColor = "#10B981"; sign = "+"; currency = "₹"; amountValue = item.amount || 0; titleText = "System Refill";
          }
          else if (isWinner) { 
              iconName = "trophy"; iconColor = "#10B981"; sign = "+"; titleText = "Reward Yield"; statusColor = "#10B981";
          }
          else if (isbet) { iconName = "gamepad-variant"; iconColor = "#F59E0B"; titleText = "Activity Allocation"; }
          // 🔥 SATTI FIX: Title override for Call Log
          else if (isCall) { iconName = "video-vintage"; iconColor = "#3B82F6"; titleText = item.title || "Platform Session"; }
          else if (isVoucher) {
              iconName = "ticket-percent"; iconColor = "#F59E0B";
              const rawStatus = String(item.status || 'pending').toLowerCase();
              
              if (rawStatus === 'success' || rawStatus === 'delivered' || rawStatus === 'approved') {
                  statusText = 'FULFILLED'; statusColor = '#10B981'; sign = "-";
              } else if (rawStatus === 'failed' || rawStatus === 'rejected') {
                  statusText = 'REVERSED'; statusColor = '#EF4444'; sign = "+";
              } else {
                  statusText = 'QUEUE'; statusColor = '#F59E0B'; sign = "-";
              }
          }
      }

      // 🔥 BULLETPROOF DATE RENDERER 🔥
      const timeVal = item.timestamp || item.createdAt || item.requestDate;
      let displayTime = 'Synced';
      if (timeVal) {
          if (timeVal.toDate) {
              displayTime = timeVal.toDate().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
          } else if (timeVal.seconds) {
              displayTime = new Date(timeVal.seconds * 1000).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
          } else {
              displayTime = new Date(timeVal).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
          }
      }

      const itemBorder = index % 2 === 0 ? borderType2 : borderType1;

      return (
          // 🔥 SATTI FIX: Added key prop to the root View returned by renderListItem 🔥
          <View key={item.id || `log-${index}`} style={[styles.historyCard, itemBorder]}>
              <View style={[styles.historyIconBox, iconName === 'gift' ? { backgroundColor: 'rgba(168, 85, 247, 0.15)' } : {}]}>
                  <MaterialCommunityIcons name={iconName as any} size={20} color={iconColor} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.historyTitle} numberOfLines={1}>{titleText}</Text>
                  <Text style={styles.historyDate}>{displayTime}</Text>
                  {item._source === 'game_history' && (
                      <Text style={{ color: '#94A3B8', fontSize: 10, marginTop: 4, fontWeight: '600' }}>
                          Session: {item.roundId || 'N/A'} | Pick: {item.pick || 'N/A'} | Outcome: {item.result || 'N/A'}
                      </Text>
                  )}
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.historyAmount, { color: sign === '+' ? '#10B981' : '#F43F5E' }]}>
                      {sign} {currency === '₹' ? currency : ''}{amountValue} {currency === '💎' ? currency : ''}
                  </Text>
                  <Text style={[styles.historyStatus, { color: statusColor }]}>
                      {statusText}
                  </Text>
              </View>
          </View>
      );
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
                <Text style={[styles.badgeText, { color: rank.color }]}>{rank.label}</Text>
              </View>
              <Text style={styles.nameRow} numberOfLines={1}>{userData?.name || 'SYNCING...'}</Text>
              <Text style={[styles.statusText, { color: rank.secondaryColor }]}>{rank.status}</Text>
          </View>
        </View>

        <View style={[styles.rowStats, { borderTopColor: 'rgba(255,255,255,0.06)' }]}>
          <View style={styles.stat}><Text style={styles.statV}>{userData?.friendsCount || 0}</Text><Text style={styles.statL}>NETWORK</Text></View>
          <View style={[styles.stat, { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }]}>
            <Text style={styles.statV} adjustsFontSizeToFit numberOfLines={1}>{(userData?.balance || 0).toLocaleString()}</Text>
            <Text style={styles.statL}>UNITS</Text>
          </View>
          <View style={styles.stat}><Text style={[styles.statV, {color: rank.color}]}>L{rank.lvl}</Text><Text style={styles.statL}>TIER</Text></View>
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
          <View style={styles.header}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={24} color="#FFF" />
              </TouchableOpacity>
              <View>
                  <Text style={styles.headerTitle}>Operational Ledger</Text>
                  <Text style={styles.headerSub}>System Audit Access</Text>
              </View>
              <MaterialCommunityIcons name="shield-account" size={24} color="#3B82F6" style={{marginLeft: 'auto'}} />
          </View>
          
          <View style={styles.cardContainer}>{renderDynamicProfileCard()}</View>
        </SafeAreaView>

        {/* 🔥 TABS SECTION (2 TABS) 🔥 */}
        <View style={styles.tabsRow}>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'STATS' && styles.tabBtnActive]} onPress={() => setActiveTab('STATS')}>
                <Text style={[styles.tabText, activeTab === 'STATS' && styles.tabTextActive]}>ANALYTICS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'HISTORY' && styles.tabBtnActive]} onPress={() => setActiveTab('HISTORY')}>
                <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.tabTextActive]}>LEDGER HISTORY</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.menuBox}>
            {/* STATS TAB */}
            {activeTab === 'STATS' && (
                <View>
                    <View style={[styles.balanceCard, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
                        <Text style={styles.balLabel}>CURRENT SYSTEM BALANCE</Text>
                        <Text style={[styles.balValue, { color: '#60A5FA' }]}>{userData?.balance || 0} 💎</Text>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color={rank.color} style={{ marginTop: 40 }} />
                    ) : (
                        <View style={styles.statsContainer}>
                            <StatBox icon="cash-plus" label="TOTAL REFILLS" value={`₹ ${totalRecharge}`} color="#10B981" bgColor="rgba(16, 185, 129, 0.1)" />
                            <StatBox icon="diamond-stone" label="TOTAL ALLOCATION" value={`${totalSpentCalculated} 💎`} color="#F43F5E" bgColor="rgba(244, 63, 94, 0.1)" />
                            <StatBox icon="gamepad-variant" label="ACTIVITY NET" value={`${gameNetProfit > 0 ? '+' : ''}${gameNetProfit} 💎`} color={gameNetProfit >= 0 ? "#10B981" : "#EF4444"} bgColor={gameNetProfit >= 0 ? "rgba(16, 185, 129, 0.1)" : "rgba(239, 68, 68, 0.1)"} />
                            <StatBox icon="gift" label="GIFT ALLOCATIONS" value={`${totalGiftsSpent} 💎`} color="#A855F7" bgColor="rgba(168, 85, 247, 0.1)" />
                            <StatBox icon="video-vintage" label="SESSION ALLOCATIONS" value={`${totalVideoCallSpent} 💎`} color="#3B82F6" bgColor="rgba(59, 130, 246, 0.1)" />
                            <StatBox icon="clock-outline" label="PLATFORM MINS" value={`${totalMinutes}`} color="#F59E0B" bgColor="rgba(245, 158, 11, 0.1)" />
                            <StatBox icon="ticket-percent" label="FULFILLED GRANTS" value={`${totalRedeemed.toLocaleString()} 💎`} color="#F59E0B" bgColor="rgba(245, 158, 11, 0.1)" width="100%" />
                        </View>
                    )}
                </View>
            )}

            {/* UNIFIED HISTORY TAB */}
            {activeTab === 'HISTORY' && (
                <View>
                    <View style={styles.talktimeHighlight}>
                         <Text style={[styles.totalTalkLabel, { color: rank.color, marginBottom: 15 }]}>TOTAL ARCHIVED ACTIVITY: {totalMinutes} MINS</Text>
                    </View>

                    {loading ? (
                        <ActivityIndicator size="large" color={rank.color} style={{ marginTop: 40 }} />
                    ) : historyLogs.length > 0 ? (
                        historyLogs.map((item, index) => renderListItem({item, index}))
                    ) : (
                        <View style={styles.emptyBox}>
                            <MaterialCommunityIcons name="file-document-outline" size={48} color="rgba(255,255,255,0.2)" />
                            <Text style={styles.emptyText}>No ledger records documented.</Text>
                        </View>
                    )}
                </View>
            )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.verText}>TALKPE OS • SECURE_LEDGER</Text>
          <View style={[styles.secureNode, { borderColor: 'rgba(255,255,255,0.08)' }]}>
              <MaterialCommunityIcons name="shield-check" size={12} color={rank.color} />
              <Text style={[styles.secureText, { color: rank.color }]}>Encrypted Data Node</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const StatBox = ({ icon, label, value, color, bgColor, width = '48%' }: any) => (
    <View style={[styles.statBox, { borderColor: color, backgroundColor: bgColor, width: width as any }]}>
        <View style={[styles.iconCircle, { backgroundColor: color + '30' }]}>
            <MaterialCommunityIcons name={icon} size={28} color={color} />
        </View>
        <Text style={[styles.statBoxValue, { color: '#FFF' }]}>{value}</Text>
        <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
);

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#020617' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
  loaderText: { color: '#6366F1', marginTop: 12, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
  scrollPadding: { paddingBottom: 150 },
  aura: { position: 'absolute', width: 450, height: 450, borderRadius: 225, filter: 'blur(120px)' },
  cardContainer: { margin: 16, marginTop: 10 },
  cardGlassOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.01)' },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, gap: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  headerSub: { color: '#3B82F6', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 2 },

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
  
  tabsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 10, marginBottom: 15, backgroundColor: '#0F172A', borderRadius: 12, padding: 5, borderWidth: 1, borderColor: '#1E293B', justifyContent: 'space-between' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  tabBtnActive: { backgroundColor: '#334155' },
  tabText: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  tabTextActive: { color: '#FFF' },

  balanceCard: { padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 15, alignItems: 'center' },
  balLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  balValue: { fontSize: 28, fontWeight: '900' },

  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statBox: { padding: 20, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
  iconCircle: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  statBoxValue: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  statBoxLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 0.5, textAlign: 'center' },

  talktimeHighlight: { alignItems: 'center' },
  totalTalkLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 5 },

  historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', padding: 15, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#1E293B', marginHorizontal: 2 },
  historyIconBox: { width: 45, height: 45, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  historyTitle: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginBottom: 4, letterSpacing: 0.5 },
  historyDate: { color: '#64748B', fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  historyAmount: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
  historyStatus: { fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
  emptyBox: { alignItems: 'center', marginTop: 40, opacity: 0.7 },
  emptyText: { color: '#64748B', marginTop: 10, fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  footer: { alignItems: 'center', marginTop: 80 },
  verText: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  secureNode: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 15, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, borderWidth: 1 },
  secureText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
});