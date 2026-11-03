import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, collectionGroup, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
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
import { db } from '../../../../firebaseConfig';

const { width, height } = Dimensions.get('window');

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (ADMIN SPECIFIC WITH USER COLORS)
const calculateUserLevel = (totalSpent: number) => {
  if (totalSpent >= 500000001) return { 
      lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#FF0033', secondaryColor: '#660000', grad: ['#1A0000', '#000000'] as const, 
      themeBg: ['#1A0000', '#000000'], layout: 'stealth', anim: 'titan', radius: 40, avatarSize: 85, icon: 'fire-circle'
  }; 
  if (totalSpent >= 100000001) return { 
      lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#D946EF', secondaryColor: '#c8040b', grad: ['#15001A', '#000000'] as const, 
      themeBg: ['#15001A', '#000000'], layout: 'stealth', anim: 'mythic', radius: 40, avatarSize: 85, icon: 'lightning-bolt'
  }; 
  if (totalSpent >= 50000000) return { 
      lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#9c77f3', secondaryColor: '#d31515', grad: ['#08001A', '#000000'] as const, 
      themeBg: ['#08001A', '#000000'], layout: 'stealth', anim: 'grandmaster', radius: 40, avatarSize: 85, icon: 'shield-crown'
  };
  if (totalSpent >= 10000000) return { 
      lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#970d50d4', grad: ['#00101A', '#000000'] as const, 
      themeBg: ['#00101A', '#000000'], layout: 'stealth', anim: 'explosion', radius: 40, avatarSize: 85, icon: 'target'
  };
  if (totalSpent >= 5000000) return { 
      lvl: 4, label: 'LEGENDARY NODE', status: 'NEBULA COMMANDER', color: '#d0630a', secondaryColor: '#DC2626', grad: ['#0A001A', '#000000'] as const, 
      themeBg: ['#0A001A', '#000000'], layout: 'stealth', anim: 'nebula', radius: 40, avatarSize: 80, icon: 'shield-airplane'
  };
  if (totalSpent >= 1000000) return { 
      lvl: 3, label: 'DIAMOND CORE', status: 'NUCLEAR ASSET', color: '#a3de4a', secondaryColor: '#991625', grad: ['#001A0A', '#000000'] as const, 
      themeBg: ['#001A0A', '#000000'], layout: 'stealth', anim: 'diamond', radius: 40, avatarSize: 80, icon: 'diamond-stone'
  };
  if (totalSpent >= 200001) return { 
      lvl: 2, label: 'GOLD OPERATIVE', status: 'ROYAL STRIKER', color: '#ffae00', secondaryColor: '#801f29', grad: ['#1A0B00', '#000000'] as const, 
      themeBg: ['#1A0B00', '#000000'], layout: 'stealth', anim: 'sparkle', radius: 40, avatarSize: 75, icon: 'trophy'
  };
  return { 
      lvl: 1, label: 'SILVER AGENT', status: 'STAR FAME', color: '#0f33e7', secondaryColor: '#f50808', grad: ['#050505', '#000000'] as const, 
      themeBg: ['#050505', '#000000'], layout: 'stealth', anim: 'wave', radius: 40, avatarSize: 70, icon: 'shield-star'
  };
};

/* ============================================================
   🎬 3D POP-IN WRAPPER - every card / tile flips up in 3D (staggered)
   ============================================================ */
const Pop = ({ index = 0, children, style }: { index?: number; children: React.ReactNode; style?: any }) => {
  const v = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(v, { toValue: 1, friction: 7, tension: 45, delay: 80 + index * 90, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
          transform: [
            { perspective: 900 },
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
            { rotateX: v.interpolate({ inputRange: [0, 1], outputRange: ['28deg', '0deg'] }) },
            { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

/* ============================================================
   🎫 NEXT-GEN TICKET CARD (used by CALL LOG, REWARD and FLAGS)
   ============================================================ */
const Ticket = ({ accent, badgeIcon, badgeText, imageUri, title, subtitle, amount, children, floatAnim, index = 0 }: any) => (
  <Pop index={index} style={styles.cardContainerUI}>
    <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
      <View style={[styles.ticketGlow, { shadowColor: accent }]}>
        <View style={styles.stealthHistoryCard}>
          <LinearGradient
            colors={[accent + '30', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0.9, y: 0.7 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={[styles.quadBorderUI, { borderLeftColor: accent, borderRightColor: accent + '55', borderTopColor: accent + '33', borderBottomColor: accent + '33' }]} />
          <View style={[styles.sessionBadge, { backgroundColor: accent }]}>
            <MaterialCommunityIcons name={badgeIcon} size={10} color="#FFF" />
            <Text style={styles.sessionTypeText}>{badgeText}</Text>
          </View>
          <View style={styles.cardHeaderUI}>
            <View style={[styles.expertThumbRing, { borderColor: accent, shadowColor: accent, backgroundColor: accent + '1A' }]}>
              <Image source={{ uri: imageUri }} style={styles.expertThumb} />
            </View>
            <View style={styles.expertInfo}>
              <Text style={styles.expertName} numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
              <Text style={styles.callDateText} numberOfLines={1}>{subtitle}</Text>
            </View>
            {amount !== undefined && (
              <View style={[styles.costContainer, { backgroundColor: accent + '1A', borderColor: accent + '44' }]}>
                <Text style={[styles.costText, { color: accent }]} numberOfLines={1} adjustsFontSizeToFit>{amount}</Text>
                <Ionicons name="diamond" size={12} color={accent} />
              </View>
            )}
          </View>
          <View style={[styles.ticketDash, { borderColor: accent + '40' }]} />
          {children}
        </View>
      </View>
    </Animated.View>
  </Pop>
);

/* ============================================================
   🏷️ SUMMARY PILL (top of each tab list)
   ============================================================ */
const SummaryPill = ({ color, icon, label }: any) => (
  <View style={styles.talktimeHighlight}>
    <View style={[styles.summaryPill, { borderColor: color + '55', backgroundColor: color + '14' }]}>
      <MaterialCommunityIcons name={icon} size={14} color={color} />
      <Text style={[styles.totalTalkLabel, { color, marginBottom: 0 }]}>{label}</Text>
    </View>
  </View>
);

// 🌌 floating particles config (background depth)
const particles = [
  { left: '10%', top: '22%', size: 3, range: -140 },
  { left: '28%', top: '60%', size: 2, range: -100 },
  { left: '47%', top: '35%', size: 4, range: -180 },
  { left: '66%', top: '72%', size: 3, range: -120 },
  { left: '82%', top: '28%', size: 2, range: -160 },
  { left: '92%', top: '55%', size: 3, range: -110 },
];

export default function UserPassbookDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 🆕 UPDATE: 'GAMES' (ACTIVITY) tab removed. Tabs: STATS, CALLS, REWARDS, FLAGS
  const [activeTab, setActiveTab] = useState<'STATS' | 'CALLS' | 'REWARDS' | 'FLAGS'>('STATS'); 

  // 🔥 USER HISTORY STATES
  const [history, setHistory] = useState<any[]>([]);
  // 🆕 UPDATE: gameHistory and totalGames states removed
  const [flags, setFlags] = useState<any[]>([]); // 🔥 SATTI UPDATE: Flag Data State

  // 🔥 ADMIN EXACT STATS VARIABLES
  const [totalRechargeDiamonds, setTotalRechargeDiamonds] = useState<number>(0); 
  const [totalGiftsSpent, setTotalGiftsSpent] = useState<number>(0);
  const [totalVideoCallSpent, setTotalVideoCallSpent] = useState<number>(0);
  const [totalSpentCalculated, setTotalSpentCalculated] = useState<number>(0); 
  // 🆕 UPDATE: gameNetProfit and totalEntryFees states removed
  const [totalRedeemed, setTotalRedeemed] = useState<number>(0); 
  const [totalMinutes, setTotalMinutes] = useState<number>(0);

  // 🆕 PREMIUM UI: sliding tab indicator state
  const [tabsW, setTabsW] = useState(0);

  // 🌀 COMPLEX ANIMATION ENGINE MATRIX
  const scrollY = useRef(new Animated.Value(0)).current;
  const mainLoop = useRef(new Animated.Value(0)).current;
  const secondaryLoop = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const trailX = useRef(new Animated.Value(-width)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  // 🆕 PREMIUM UI animation values
  const heroTilt = useRef(new Animated.Value(0)).current;   // 3D idle tilt of hero card
  const tabAnim = useRef(new Animated.Value(0)).current;    // sliding tab indicator position
  const tabFade = useRef(new Animated.Value(1)).current;    // indicator visibility (hidden on FLAGS)

  useEffect(() => {
    Animated.loop(Animated.timing(mainLoop, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.loop(Animated.timing(secondaryLoop, { toValue: 1, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })).start();
    Animated.loop(Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })).start();

    const runTrail = () => {
        trailX.setValue(-width);
        Animated.timing(trailX, { toValue: width, duration: 3500, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: true }).start(() => runTrail());
    };
    runTrail();

    Animated.loop(Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
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

    // 🆕 hero card idle 3D tilt (left <-> right)
    Animated.loop(Animated.sequence([
        Animated.timing(heroTilt, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(heroTilt, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
    ])).start();
  }, []);

  // 🆕 sliding tab indicator follows the active tab (hides when FLAGS is open)
  useEffect(() => {
    const idx = activeTab === 'STATS' ? 0 : activeTab === 'CALLS' ? 1 : activeTab === 'REWARDS' ? 2 : -1;
    if (idx >= 0) {
        Animated.spring(tabAnim, { toValue: idx, friction: 8, tension: 70, useNativeDriver: true }).start();
    }
    Animated.timing(tabFade, { toValue: idx >= 0 ? 1 : 0, duration: 200, useNativeDriver: true }).start();
  }, [activeTab]);

  // 🔥 FETCH LEDGER & MERGED HISTORY DATA DYNAMICALLY 🔥
  useEffect(() => {
      if (!id) return;

      let currentUserData: any = null;
      let rawTransactions: any[] = [];
      let rawGifts: any[] = [];
      let rawRequests: any[] = []; 
      // 🆕 UPDATE: rawActivityGames and rawTxGames removed
      let rawCalls: any[] = []; 

      const processAllLogs = () => {
          if (!currentUserData) return;

          // ==========================================
          // 🔥 1. CALLS & GIFTS FETCHING ENGINE
          // ==========================================
          const myGifts = rawGifts.filter(g => {
              const isIdMatch = g.senderId === id || g.userId === id;
              const isNameMatch = g.senderName && (g.senderName === currentUserData.name);
              return isIdMatch || isNameMatch;
          });
          
          const mappedStandaloneGifts = myGifts.map(g => ({
              ...g,
              isStandaloneGift: true,
              mergedTime: g.timestamp?.toMillis ? g.timestamp.toMillis() : (g.createdAt?.toMillis ? g.createdAt.toMillis() : 0)
          }));

          const mappedCallGifts = rawCalls
              .filter(c => Math.abs(Number(String(c.totalGiftsDiamonds || 0).replace(/[^0-9.-]+/g, ''))) > 0)
              .map(c => ({
                  id: c.id + '_callgift',
                  isCallGift: true,
                  expertName: c.expertName || c.receiverName || c.hostName || c.toName || 'Network Expert',
                  expertImage: c.expertImage || '',
                  amount: Math.abs(Number(String(c.totalGiftsDiamonds || 0).replace(/[^0-9.-]+/g, ''))),
                  timestamp: c.endedAt || c.createdAt,
                  mergedTime: c.endedAt?.toMillis ? c.endedAt.toMillis() : (c.createdAt?.toMillis ? c.createdAt.toMillis() : 0)
              }));

          const mappedCalls = rawCalls.map(c => ({
              ...c,
              isCall: true,
              mergedTime: c.endedAt?.toMillis ? c.endedAt.toMillis() : (c.createdAt?.toMillis ? c.createdAt.toMillis() : 0)
          }));

          const combinedHistory = [...mappedCalls, ...mappedStandaloneGifts, ...mappedCallGifts].sort((a, b) => b.mergedTime - a.mergedTime);
          
          const totalSecs = rawCalls.reduce((acc, curr) => acc + (Number(curr.finalDuration) || Number(curr.duration) || 0), 0);
          setTotalMinutes(Math.floor(totalSecs / 60));
          setHistory(combinedHistory);

          // 🆕 UPDATE: Game history engine (activity log) removed from here.

          // ================= EXACT ADMIN STATS CALCULATION ENGINE =================
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

          const calcGiftsFromNested = myGifts.reduce((sum, log) => sum + (Number(log.amount) || Number(log.diamonds) || Number(log.price) || 0), 0); 
          const calcCallGifts = mappedCallGifts.reduce((sum, log) => sum + log.amount, 0); 
          setTotalGiftsSpent(calcGiftsFromNested + calcCallGifts);

          const calcVideoCalls = rawTransactions.reduce((sum, log) => {
              if (String(log.type || '').toUpperCase().includes('CALL')) { 
                  return sum + (Number(log.amount) || Number(log.diamonds) || Number(log.price) || 0);
              }
              return sum;
          }, 0);
          setTotalVideoCallSpent(calcVideoCalls);

          const calcRedeemed = rawRequests.reduce((sum, log) => {
              const statusStr = String(log.status || '').toLowerCase();
              if (statusStr !== 'failed' && statusStr !== 'rejected') {
                  return sum + (Number(log.costDeducted) || Number(log.voucherValue) || Number(log.amount) || 0);
              }
              return sum;
          }, 0);
          setTotalRedeemed(calcRedeemed);

          // 🆕 UPDATE: Activity rewards & arena entry fee calculation removed from here.
          
          const grandTotalSpent = Math.max(0, calcVideoCalls + (calcGiftsFromNested + calcCallGifts) + calcRedeemed);
          setTotalSpentCalculated(grandTotalSpent);

          setLoading(false);
      };

      // Listeners
      const unsubUser = onSnapshot(doc(db, 'users', id as string), (docSnap) => {
          if (docSnap.exists()) { currentUserData = { id: docSnap.id, ...(docSnap.data() as any) }; setUserData(currentUserData); processAllLogs(); }
      });

      const qHistory = query(collection(db, 'transactions'), where('userId', '==', id));
      const unsubHistory = onSnapshot(qHistory, (snap) => {
          rawTransactions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          processAllLogs();
      });

      const qGifts = query(collectionGroup(db, 'gifts'));
      const unsubGifts = onSnapshot(qGifts, async (snapshot) => {
          rawGifts = await Promise.all(snapshot.docs.map(async (giftDoc) => {
              const data = giftDoc.data();
              let fetchedHostName = data.hostName || data.receiverName || data.toName || '';
              let fetchedHostImage = data.expertImage || data.receiverImage || data.hostImage || '';
              if (!fetchedHostName && giftDoc.ref.parent && giftDoc.ref.parent.parent) {
                  try {
                      const parentDoc = await getDoc(giftDoc.ref.parent.parent);
                      if (parentDoc.exists()) {
                          const pData = parentDoc.data();
                          fetchedHostName = pData.hostName || pData.expertName || pData.roomName || '';
                          fetchedHostImage = pData.hostImage || pData.expertImage || '';
                      }
                  } catch (e) {}
              }
              return { id: giftDoc.id, ...data, fetchedHostName, fetchedHostImage };
          }));
          processAllLogs();
      });

      const qRequests = query(collection(db, 'reward_requests'), where('userId', '==', id));
      const unsubRequests = onSnapshot(qRequests, (snap) => {
          rawRequests = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          processAllLogs();
      });

      // 🆕 UPDATE: activityHistory listener (game activity log) removed from here.

      const qCalls = query(collection(db, "calls"), where("callerId", "==", id), orderBy("endedAt", "desc"));
      const unsubCalls = onSnapshot(qCalls, (snap) => {
          rawCalls = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          processAllLogs();
      });

      // 🔥 SATTI UPDATE: FLAG LISTENER ENGINE WITH ACTUAL PROFILE PICTURE FETCH 🔥
      const qFlags = query(
          collection(db, "admin_alerts"), 
          where("userId", "==", id), 
          where("type", "==", "EXPERT_BLOCKED_USER")
      );
      const unsubFlags = onSnapshot(qFlags, async (snap) => {
          const list = await Promise.all(snap.docs.map(async (d) => {
              const data = d.data() as any;
              // Mudhalla irukkura field la picture irukka nu theduvom
              let fetchedPic = data.expertImage || data.hostImage || data.profilePic || '';
              
              // Illana, antha expertId vechu main users collection la poi original photo edupom!
              if (!fetchedPic && (data.expertId || data.hostId)) {
                  try {
                      const hostId = data.expertId || data.hostId;
                      const hostDoc = await getDoc(doc(db, 'users', hostId));
                      if (hostDoc.exists()) {
                          const hData = hostDoc.data() as any;
                          fetchedPic = hData.profilePic || hData.image || ''; // Unmayaana Profile pic
                      }
                  } catch (e) {
                      console.log("Error fetching host picture:", e);
                  }
              }
              
              return { alertId: d.id, fetchedExpertPic: fetchedPic, ...data };
          }));

          list.sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
          setFlags(list);
      });

      return () => { unsubUser(); unsubHistory(); unsubGifts(); unsubRequests(); unsubCalls(); unsubFlags(); };
  }, [id]);

  if (!userData && !loading) return <View style={styles.loader}><Text style={{color: '#FFF'}}>Account record not found in secure vault.</Text></View>;

  // 🔥 SATTI FIX: Synced Highest Balance check for accurate Level display!
  const userDiamonds = userData?.totalSpentDiamonds || 0;
  const rank = calculateUserLevel(userDiamonds);
  const uPic = userData?.profilePic || `https://ui-avatars.com/api/?name=${userData?.name || 'User'}&background=1E293B&color=fff&bold=true`;

  const parallaxBg = scrollY.interpolate({ inputRange: [0, 300], outputRange: [0, -40], extrapolate: 'clamp' });
  const bgOpacity = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0.12, 0.05], extrapolate: 'clamp' });
  const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });

  // 🆕 scroll-linked hero (JS-driven wrapper only) + tab indicator geometry
  const heroScrollY = scrollY.interpolate({ inputRange: [0, 300], outputRange: [0, 45], extrapolate: 'clamp' });
  const heroScrollScale = scrollY.interpolate({ inputRange: [0, 300], outputRange: [1, 0.95], extrapolate: 'clamp' });
  const tabW = tabsW > 0 ? (tabsW - 10 - 8) / 3 : 0;
  const tabIndicatorX = tabAnim.interpolate({ inputRange: [0, 1, 2], outputRange: [0, tabW + 4, 2 * (tabW + 4)] });

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

  const callsData = history.filter(item => item.isCall);
  const rewardsData = history.filter(item => item.isCallGift || item.isStandaloneGift);

  const renderHistoryItem = ({ item, index = 0 }: { item: any; index?: number }) => {
      if (item.isCallGift || item.isStandaloneGift) {
          const giftName = item.giftName || item.name || 'Virtual Reward';
          const amount = item.amount || item.price || item.diamonds || 0;
          const eName = item.fetchedHostName || item.expertName || item.receiverName || item.toName || item.hostName || item.userName || 'Network Expert';
          const eImage = item.fetchedHostImage || item.expertImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(eName)}&background=1E293B&color=fff&bold=true`;
          
          let displayTime = 'JUST NOW';
          const timeVal = item.timestamp || item.createdAt;
          if (timeVal?.toDate) {
              displayTime = timeVal.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
          } else if (timeVal?.seconds) {
              displayTime = new Date(timeVal.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
          } else if (typeof timeVal === 'string' || typeof timeVal === 'number') {
              displayTime = new Date(timeVal).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
          }

          return (
              <Ticket
                  index={index}
                  floatAnim={floatAnim}
                  accent="#A855F7"
                  badgeIcon="gift"
                  badgeText="REWARD SENT"
                  imageUri={eImage}
                  title={eName.toUpperCase()}
                  subtitle={displayTime}
                  amount={`-${Number(amount).toLocaleString()}`}
              >
                  <View style={styles.statsRow}>
                      <View style={styles.statItem}>
                          <Ionicons name="sparkles-outline" size={14} color="#A855F7" />
                          <Text style={[styles.statValueText, { color: '#E2E8F0' }]} numberOfLines={1} adjustsFontSizeToFit>
                              Item Sent: {item.isCallGift ? 'In-Call Premium Rewards' : giftName}
                          </Text>
                      </View>
                  </View>
              </Ticket>
          );
      }

      const currentDuration = Number(item.finalDuration) || Number(item.duration) || 0;
      const mins = Math.floor(currentDuration / 60);
      const secs = currentDuration % 60;
      const durationText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      const totalSpentOnCall = (Number(item.totalDiamonds) || 0);
      const callEName = item.expertName || item.hostName || 'HOST NODE';
      const callEImage = item.expertImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(callEName)}&background=1E293B&color=fff&bold=true`;

      return (
          <Ticket
              index={index}
              floatAnim={floatAnim}
              accent={rank.color}
              badgeIcon="video"
              badgeText="VERIFIED_LINK"
              imageUri={callEImage}
              title={callEName.toUpperCase()}
              subtitle={item.endedAt?.seconds 
                  ? new Date(item.endedAt.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) 
                  : 'SYNCHRONIZING...'}
              amount={`-${totalSpentOnCall.toLocaleString()}`}
          >
              <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                      <Ionicons name="time-outline" size={14} color="#64748B" />
                      <Text style={styles.statValueText} numberOfLines={1} adjustsFontSizeToFit>{durationText}</Text>
                  </View>
                  <View style={styles.vDivider} />
                  <View style={styles.talkAgainBtn}>
                      <Text style={[styles.talkAgainText, { color: rank.color }]} numberOfLines={1} adjustsFontSizeToFit>SESSION LOG</Text>
                      <Ionicons name="checkmark-circle" size={12} color={rank.color} />
                  </View>
              </View>
          </Ticket>
      );
  };

  // 🆕 UPDATE: renderGameHistoryItem (game activity card renderer) removed.

  const renderDynamicProfileCard = () => {
    const orbit = mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const tiltY = heroTilt.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] });
    const tiltX = heroTilt.interpolate({ inputRange: [0, 1], outputRange: ['3deg', '-3deg'] });
    const ringSize = rank.avatarSize + 34;
    const pulseScale = secondaryLoop.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
    const pulseOpacity = secondaryLoop.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] });

    return (
      <Animated.View style={{ transform: [{ perspective: 1100 }, { rotateY: tiltY }, { rotateX: tiltX }] }}>
        <Animated.View style={[styles.cardBase, borderType1, { borderRadius: rank.radius, backgroundColor: 'rgba(5, 6, 12, 0.94)' }]}>
          {/* holographic tinted background */}
          <LinearGradient
            colors={[rank.color + '2E', 'transparent', rank.color + '12']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Animated.View style={[styles.glowTrail, { backgroundColor: rank.color, transform: [{ translateX: trailX }] }]} />
          <View style={styles.cardGlassOverlay} />

          {/* top row: brand + gold chip */}
          <View style={styles.heroTopRow}>
            <View style={styles.heroBrand}>
              <MaterialCommunityIcons name="shield-account" size={14} color={rank.color} />
              <Text style={[styles.heroBrandText, { color: rank.color }]}>TALKPE • PASSBOOK</Text>
            </View>
            <LinearGradient colors={['#F5D76E', '#B8860B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chip}>
              <View style={styles.chipLine} />
              <View style={styles.chipLine} />
            </LinearGradient>
          </View>
          
          <View style={{ flexDirection: 'row', alignItems: 'center', zIndex: 10 }}>
            <View style={[styles.avatarNode, { width: ringSize, height: ringSize, alignItems: 'center', justifyContent: 'center' }]}>
              {/* expanding radar pulse */}
              <Animated.View style={[styles.pulseRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, borderColor: rank.color, opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
              {/* orbiting dashed ring with satellite dot */}
              <Animated.View style={[styles.orbitRing, { width: ringSize, height: ringSize, borderRadius: ringSize / 2, borderColor: rank.color + '55', transform: [{ rotate: orbit }] }]}>
                <View style={[styles.orbitDot, { backgroundColor: rank.color, shadowColor: rank.color }]} />
              </Animated.View>
              {/* tier-specific avatar animation (wave / sparkle / diamond / nebula / explosion / titan) */}
              <Animated.View style={getDynamicStyle()}>
                <View style={[styles.ring, { borderRadius: 100, borderWidth: 2, borderColor: rank.color, shadowColor: rank.color, shadowOpacity: 0.8, shadowRadius: 12, elevation: 12 }]}>
                  <Image source={{ uri: uPic }} style={{ width: rank.avatarSize, height: rank.avatarSize, borderRadius: 100 }} />
                </View>
              </Animated.View>
            </View>
            
            <View style={{ marginLeft: 12, flex: 1 }}>
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
      </Animated.View>
    );
  };

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={rank.themeBg as any} style={StyleSheet.absoluteFill} />
      
      <Animated.View style={[styles.shimmerOrb, { top: 100, right: -60, backgroundColor: rank.color, transform: [{ translateY: orbTranslateY }] }]} />
      <Animated.View style={[styles.shimmerOrb, { bottom: 200, left: -90, backgroundColor: rank.secondaryColor, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

      <Animated.View style={[styles.aura, { top: 40, left: -50, backgroundColor: rank.color, opacity: bgOpacity, transform: [{ translateY: parallaxBg }] }]} />
      <Animated.View style={[styles.aura, { bottom: 40, right: -50, backgroundColor: rank.secondaryColor, opacity: 0.06, transform: [{ translateY: parallaxBg }] }]} />

      {/* ✨ floating particles (depth) */}
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={[
            styles.particle,
            {
              left: p.left as any,
              top: p.top as any,
              width: p.size,
              height: p.size,
              borderRadius: p.size,
              backgroundColor: rank.color,
              opacity: mainLoop.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.8, 0.8, 0] }),
              transform: [{ translateY: mainLoop.interpolate({ inputRange: [0, 1], outputRange: [0, p.range] }) }],
            },
          ]}
        />
      ))}

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
                  <View style={styles.headerSubRow}>
                      <Animated.View style={[styles.liveDot, { opacity: secondaryLoop.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 0.25, 1] }) }]} />
                      <Text style={styles.headerSub}>System Audit Access</Text>
                  </View>
              </View>
              <MaterialCommunityIcons name="shield-account" size={24} color="#3B82F6" style={{marginLeft: 'auto'}} />
          </View>
          
          <Animated.View style={[styles.cardContainer, { transform: [{ translateY: heroScrollY }, { scale: heroScrollScale }] }]}>
            {renderDynamicProfileCard()}
          </Animated.View>
        </SafeAreaView>

        {/* 🆕 FLOATING GLASS TAB BAR WITH SLIDING 3D INDICATOR */}
        <View style={styles.tabsRow} onLayout={(e) => setTabsW(e.nativeEvent.layout.width)}>
            {tabW > 0 && (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.tabIndicator,
                        {
                            width: tabW,
                            backgroundColor: rank.color + '33',
                            borderColor: rank.color,
                            shadowColor: rank.color,
                            opacity: tabFade,
                            transform: [{ translateX: tabIndicatorX }],
                        },
                    ]}
                />
            )}
            <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('STATS')} activeOpacity={0.8}>
                <MaterialCommunityIcons name="chart-areaspline" size={15} color={activeTab === 'STATS' ? '#FFF' : '#64748B'} />
                <Text style={[styles.tabText, activeTab === 'STATS' && styles.tabTextActive]} numberOfLines={1}>ANALYTICS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('CALLS')} activeOpacity={0.8}>
                <MaterialCommunityIcons name="video-outline" size={15} color={activeTab === 'CALLS' ? '#FFF' : '#64748B'} />
                <Text style={[styles.tabText, activeTab === 'CALLS' && { color: '#FFF' }]} numberOfLines={1}>CALL LOG</Text>
            </TouchableOpacity>
            {/* 🆕 UPDATE: "ACTIVITY" tab removed */}
            <TouchableOpacity style={styles.tabBtn} onPress={() => setActiveTab('REWARDS')} activeOpacity={0.8}>
                <MaterialCommunityIcons name="gift-outline" size={15} color={activeTab === 'REWARDS' ? '#FFF' : '#64748B'} />
                <Text style={[styles.tabText, activeTab === 'REWARDS' && { color: '#FFF' }]} numberOfLines={1}>REWARD</Text>
            </TouchableOpacity>
        </View>

        <View style={styles.menuBox}>
            {/* STATS TAB */}
            {activeTab === 'STATS' && (
                <View>
                    {/* 💎 VAULT BALANCE CARD */}
                    <Pop index={0}>
                        <View style={[styles.balanceCard, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
                            <LinearGradient colors={['rgba(59,130,246,0.28)', 'transparent', 'rgba(96,165,250,0.12)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                            <Animated.View style={[styles.vaultPulse, { opacity: secondaryLoop.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }), transform: [{ scale: secondaryLoop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.8] }) }] }]} />
                            <MaterialCommunityIcons name="diamond-stone" size={92} color="rgba(96,165,250,0.08)" style={styles.vaultWatermark} />
                            <Animated.View style={{ transform: [{ translateY: floatAnim }], alignItems: 'center' }}>
                                <Text style={styles.balLabel}>CURRENT SYSTEM BALANCE</Text>
                                <Text style={[styles.balValue, { color: '#60A5FA' }]}>{userData?.balance || 0} 💎</Text>
                            </Animated.View>
                        </View>
                    </Pop>

                    {loading ? (
                        <ActivityIndicator size="large" color={rank.color} style={{ marginTop: 40 }} />
                    ) : (
                        <View style={styles.statsContainer}>
                            <StatBox index={1} icon="cash-plus" label="ASSETS ADDED" value={`${totalRechargeDiamonds} 💎`} color="#10B981" bgColor="rgba(16, 185, 129, 0.1)" />
                            <StatBox index={2} icon="diamond-stone" label="ASSETS UTILIZED" value={`${totalSpentCalculated} 💎`} color="#F43F5E" bgColor="rgba(244, 63, 94, 0.1)" />
                            {/* 🆕 UPDATE: "ACTIVITY REWARDS" stat box removed */}
                            <StatBox index={3} icon="gift" label="REWARDS SENT" value={`${totalGiftsSpent} 💎`} color="#A855F7" bgColor="rgba(168, 85, 247, 0.1)" />
                            <StatBox index={4} icon="video-vintage" label="CALL SPENT" value={`${totalVideoCallSpent} 💎`} color="#3B82F6" bgColor="rgba(59, 130, 246, 0.1)" />
                            {/* 🆕 UPDATE: "TOTAL ARENA ENTRY" stat box removed. CALL MINS now full width as the last box. */}
                            <StatBox index={5} icon="clock-outline" label="CALL MINS" value={`${totalMinutes}`} color="#F59E0B" bgColor="rgba(245, 158, 11, 0.1)" width="100%" />
                        </View>
                    )}
                </View>
            )}

            {/* CALLS TAB */}
            {activeTab === 'CALLS' && (
                <View>
                    <SummaryPill color={rank.color} icon="history" label={`TOTAL ARCHIVED ACTIVITY: ${totalMinutes} MINS`} />
                    {loading ? (
                        <ActivityIndicator size="large" color={rank.color} style={{ marginTop: 40 }} />
                    ) : callsData.length > 0 ? (
                        callsData.map((item, index) => <View key={item.id || index}>{renderHistoryItem({item, index})}</View>)
                    ) : (
                        <View style={styles.emptyBox}>
                            <Ionicons name="videocam-off" size={48} color="rgba(255,255,255,0.2)" />
                            <Text style={styles.emptyText}>No session records documented.</Text>
                        </View>
                    )}
                </View>
            )}

            {/* 🆕 UPDATE: GAMES (ACTIVITY) TAB content removed */}

            {/* REWARDS TAB */}
            {activeTab === 'REWARDS' && (
                <View>
                    <SummaryPill color={rank.color} icon="gift-outline" label={`TOTAL REWARDS SENT: ${rewardsData.length}`} />
                    {loading ? (
                        <ActivityIndicator size="large" color={rank.color} style={{ marginTop: 40 }} />
                    ) : rewardsData.length > 0 ? (
                        rewardsData.map((item, index) => <View key={item.id || index}>{renderHistoryItem({item, index})}</View>)
                    ) : (
                        <View style={styles.emptyBox}>
                            <Ionicons name="gift-outline" size={48} color="rgba(255,255,255,0.2)" />
                            <Text style={styles.emptyText}>No reward records documented.</Text>
                        </View>
                    )}
                </View>
            )}

            {/* 🔥 SATTI UPDATE: NEW FLAGS TAB CONTENT 🔥 */}
            {activeTab === 'FLAGS' && (
                <View>
                    <SummaryPill color="#EF4444" icon="alert-octagon-outline" label={`HOST REPORTS AUDIT LOG: ${flags.length} SECURE FLAGS`} />
                    {loading ? (
                        <ActivityIndicator size="large" color="#EF4444" style={{ marginTop: 40 }} />
                    ) : flags.length > 0 ? (
                        flags.map((item, index) => {
                            // 🔥 SATTI UPDATE: Rendering the Blocked Host Profile Picture (Actual Photo)
                            const hostPic = item.fetchedExpertPic || item.expertImage || item.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.expertName || 'Host')}&background=EF4444&color=fff&bold=true`;
                            return (
                                <Ticket
                                    key={item.alertId || index}
                                    index={index}
                                    floatAnim={floatAnim}
                                    accent="#EF4444"
                                    badgeIcon="alert-circle"
                                    badgeText="REPORTED_LOG"
                                    imageUri={hostPic}
                                    title={`HOST: ${(item.expertName || 'Unknown Host').toUpperCase()}`}
                                    subtitle={item.timestamp?.seconds 
                                        ? new Date(item.timestamp.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) 
                                        : 'RECENT FLAG'}
                                >
                                    <View style={[styles.statsRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
                                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900' }}>REASON FOR BLOCK:</Text>
                                        <Text style={{ color: '#E2E8F0', fontSize: 12, fontWeight: '700' }}>{item.reason || 'No specific reason documented by the host.'}</Text>
                                    </View>
                                </Ticket>
                            )
                        })
                    ) : (
                        <View style={styles.emptyBox}>
                            <MaterialCommunityIcons name="shield-check" size={48} color="#10B981" />
                            <Text style={styles.emptyText}>Clean Record. No host reports found.</Text>
                        </View>
                    )}
                </View>
            )}
        </View>

        {/* 🔥 SATTI UPDATE: FLAG BUTTON LAST LA BOTTOM LA VECHACHU! 🔥 */}
        <View style={styles.footerContainer}>
            <Animated.View style={{ width: '100%', transform: [{ scale: flags.length > 0 ? scaleAnim : 1 }] }}>
                <TouchableOpacity 
                    style={[styles.bottomFlagBtn, flags.length > 0 ? {backgroundColor: '#EF4444'} : {backgroundColor: 'rgba(255,255,255,0.05)'}]}
                    onPress={() => setActiveTab('FLAGS')}
                    activeOpacity={0.8}
                >
                    {flags.length > 0 && (
                        <LinearGradient colors={['#FF6B6B', '#EF4444', '#B91C1C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    )}
                    <MaterialCommunityIcons name={flags.length > 0 ? "alert-octagon" : "shield-check"} size={20} color={flags.length > 0 ? "#FFF" : "#10B981"} />
                    <Text style={[styles.bottomFlagText, {color: flags.length > 0 ? "#FFF" : "#10B981"}]}>
                        {flags.length > 0 ? `VIEW SECURITY FLAGS (${flags.length})` : 'CLEAN RECORD (0 FLAGS)'}
                    </Text>
                </TouchableOpacity>
            </Animated.View>

            <View style={styles.footer}>
              <Text style={styles.verText}>TALKPE OS • SECURE_LEDGER</Text>
              <View style={[styles.secureNode, { borderColor: 'rgba(255,255,255,0.08)' }]}>
                  <MaterialCommunityIcons name="shield-check" size={12} color={rank.color} />
                  <Text style={[styles.secureText, { color: rank.color }]}>Encrypted Data Node</Text>
              </View>
            </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* ============================================================
   🧊 3D GLASS STAT TILE
   ============================================================ */
const StatBox = ({ icon, label, value, color, bgColor, width = '48%', index = 0 }: any) => (
    <Pop index={index} style={{ width: width as any }}>
        <View style={[styles.statBox, { borderColor: color + '55', backgroundColor: bgColor }]}>
            <LinearGradient colors={[color + '33', 'rgba(5,6,12,0.9)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <MaterialCommunityIcons name={icon} size={84} color={color + '14'} style={styles.tileWatermark} />
            <View style={[styles.iconCircle, { backgroundColor: color + '30', borderColor: color + '66' }]}>
                <MaterialCommunityIcons name={icon} size={24} color={color} />
            </View>
            <Text style={[styles.statBoxValue, { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>{value}</Text>
            <Text style={styles.statBoxLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>{label}</Text>
            <View style={[styles.tileBar, { backgroundColor: color }]} />
        </View>
    </Pop>
);

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#020617' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
  loaderText: { color: '#6366F1', marginTop: 12, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
  shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
  scrollPadding: { paddingBottom: 150 },
  aura: { position: 'absolute', width: 450, height: 450, borderRadius: 225, filter: 'blur(120px)' },
  particle: { position: 'absolute' },
  cardContainer: { margin: 16, marginTop: 10 },
  cardGlassOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.01)' },
  
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, gap: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 42, height: 42, backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
  headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
  headerSub: { color: '#3B82F6', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 0 },

  cardBase: { padding: 25, elevation: 20, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.9, shadowRadius: 30 },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, zIndex: 10 },
  heroBrand: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroBrandText: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
  chip: { width: 36, height: 27, borderRadius: 6, justifyContent: 'center', gap: 5, paddingHorizontal: 6 },
  chipLine: { height: 1.5, backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: 1 },
  avatarNode: { position: 'relative' },
  pulseRing: { position: 'absolute', borderWidth: 1.5 },
  orbitRing: { position: 'absolute', borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
  orbitDot: { width: 8, height: 8, borderRadius: 4, marginTop: -4, shadowOpacity: 1, shadowRadius: 6, elevation: 6 },
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
  
  tabsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 10, marginBottom: 15, backgroundColor: 'rgba(15,23,42,0.85)', borderRadius: 18, padding: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', justifyContent: 'space-between', gap: 4, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  tabIndicator: { position: 'absolute', left: 5, top: 5, bottom: 5, borderRadius: 13, borderWidth: 1, shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', gap: 5 },
  tabBtnActive: { backgroundColor: '#334155' },
  tabText: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  tabTextActive: { color: '#FFF' },

  balanceCard: { padding: 26, borderRadius: 26, borderWidth: 1, marginBottom: 15, alignItems: 'center', overflow: 'hidden', shadowColor: '#3B82F6', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 10 },
  vaultPulse: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 1.5, borderColor: '#60A5FA', top: '50%', marginTop: -80 },
  vaultWatermark: { position: 'absolute', right: -10, bottom: -14 },
  balLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
  balValue: { fontSize: 32, fontWeight: '900' },

  statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statBox: { padding: 18, borderRadius: 24, borderWidth: 1, alignItems: 'flex-start', overflow: 'hidden', width: '100%', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 7 },
  tileWatermark: { position: 'absolute', right: -12, bottom: -14 },
  iconCircle: { width: 44, height: 44, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 14, borderWidth: 1 },
  statBoxValue: { fontSize: 20, fontWeight: '900', marginBottom: 4, alignSelf: 'stretch' },
  statBoxLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 0.5, textAlign: 'left', alignSelf: 'stretch' },
  tileBar: { width: 28, height: 3, borderRadius: 2, marginTop: 12, opacity: 0.9 },

  talktimeHighlight: { alignItems: 'center' },
  summaryPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 20, borderWidth: 1, marginBottom: 18 },
  totalTalkLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 5 },

  // User App Stealth Card UI Styles
  cardContainerUI: { marginBottom: 20 },
  ticketGlow: { borderRadius: 24, shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  ticketDash: { height: 1, borderWidth: 1, borderStyle: 'dashed', borderRadius: 1, marginBottom: 14, zIndex: 10 },
  stealthHistoryCard: { backgroundColor: 'rgba(5,6,12,0.88)', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  quadBorderUI: { ...StyleSheet.absoluteFillObject, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 1.2, borderBottomWidth: 1.2, borderRadius: 24, opacity: 0.8 },
  sessionBadge: { position: 'absolute', top: 0, right: 18, paddingHorizontal: 10, paddingVertical: 4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 10 },
  sessionTypeText: { color: '#FFF', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  cardHeaderUI: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, marginTop: 6, zIndex: 10 },
  expertThumbRing: { width: 54, height: 54, borderRadius: 18, borderWidth: 1.5, padding: 2, elevation: 10, shadowOpacity: 0.5, shadowRadius: 8, justifyContent: 'center', alignItems: 'center' },
  expertThumb: { width: '100%', height: '100%', borderRadius: 15 },
  expertInfo: { flex: 1, marginLeft: 15, overflow: 'hidden' },
  expertName: { color: '#FFF', fontSize: 14, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5 },
  callDateText: { color: '#475569', fontSize: 10, fontWeight: '800' },
  costContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 10, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
  costText: { fontSize: 15, fontWeight: '900' },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 14, zIndex: 10, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' },
  statValueText: { color: '#94A3B8', fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  vDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 4 },
  talkAgainBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', flex: 1.2 },
  talkAgainText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  emptyBox: { alignItems: 'center', marginTop: 40, opacity: 0.7 },
  emptyText: { color: '#64748B', marginTop: 10, fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  // 🔥 SATTI UPDATE: Bottom Button Styles Added 🔥
  footerContainer: { marginTop: 40, alignItems: 'center', paddingHorizontal: 20 },
  bottomFlagBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 25, width: '100%', gap: 10, elevation: 5, shadowColor: '#EF4444', shadowOpacity: 0.3, shadowRadius: 10, overflow: 'hidden' },
  bottomFlagText: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  
  footer: { alignItems: 'center', marginTop: 40 },
  verText: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  secureNode: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 15, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, borderWidth: 1 },
  secureText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
});
