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
  }, []);

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

  const renderHistoryItem = ({ item }: { item: any }) => {
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
              <Animated.View style={[styles.cardContainerUI, { transform: [{ translateY: floatAnim }] }]}>
                  <View style={styles.stealthHistoryCard}>
                      <View style={[styles.quadBorderUI, { borderLeftColor: '#A855F7', borderRightColor: '#A855F7', borderTopColor: 'rgba(168, 85, 247, 0.4)', borderBottomColor: 'rgba(168, 85, 247, 0.4)' }]} />
                      <View style={[styles.sessionBadge, { backgroundColor: '#A855F7' }]}>
                           <MaterialCommunityIcons name="gift" size={10} color="#FFF" />
                           <Text style={styles.sessionTypeText}>REWARD SENT</Text>
                      </View>
                      <View style={styles.cardHeaderUI}>
                          <View style={[styles.expertThumbRing, { borderColor: '#A855F7', shadowColor: '#A855F7', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                              <Image source={{ uri: eImage }} style={styles.expertThumb} />
                          </View>
                          <View style={styles.expertInfo}>
                              <Text style={styles.expertName} numberOfLines={1} adjustsFontSizeToFit>{eName.toUpperCase()}</Text>
                              <Text style={styles.callDateText} numberOfLines={1}>{displayTime}</Text>
                          </View>
                          <View style={styles.costContainer}>
                               <Text style={[styles.costText, { color: '#A855F7' }]} numberOfLines={1} adjustsFontSizeToFit>-{Number(amount).toLocaleString()}</Text>
                               <Ionicons name="diamond" size={12} color="#A855F7" />
                          </View>
                      </View>
                      <View style={styles.statsRow}>
                          <View style={styles.statItem}>
                              <Ionicons name="sparkles-outline" size={14} color="#A855F7" />
                              <Text style={[styles.statValueText, { color: '#E2E8F0' }]} numberOfLines={1} adjustsFontSizeToFit>
                                  Item Sent: {item.isCallGift ? 'In-Call Premium Rewards' : giftName}
                              </Text>
                          </View>
                      </View>
                  </View>
              </Animated.View>
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
          <Animated.View style={[styles.cardContainerUI, { transform: [{ translateY: floatAnim }] }]}>
              <View style={styles.stealthHistoryCard}>
                  <View style={[styles.quadBorderUI, { 
                      borderLeftColor: rank.color, borderRightColor: rank.color, 
                      borderTopColor: rank.secondaryColor, borderBottomColor: rank.secondaryColor 
                  }]} />
                  <View style={[styles.sessionBadge, { backgroundColor: rank.color }]}>
                       <Ionicons name="videocam" size={10} color="#FFF" />
                       <Text style={styles.sessionTypeText}>VERIFIED_LINK</Text>
                  </View>
                  <View style={styles.cardHeaderUI}>
                      <View style={[styles.expertThumbRing, { borderColor: rank.color, shadowColor: rank.color }]}>
                          <Image source={{ uri: callEImage }} style={styles.expertThumb} />
                      </View>
                      <View style={styles.expertInfo}>
                          <Text style={styles.expertName} numberOfLines={1} adjustsFontSizeToFit>{callEName.toUpperCase()}</Text>
                          <Text style={styles.callDateText} numberOfLines={1}>
                              {item.endedAt?.seconds 
                              ? new Date(item.endedAt.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) 
                              : 'SYNCHRONIZING...'}
                          </Text>
                      </View>
                      <View style={styles.costContainer}>
                           <Text style={[styles.costText, { color: rank.color }]} numberOfLines={1} adjustsFontSizeToFit>-{totalSpentOnCall.toLocaleString()}</Text>
                           <Ionicons name="diamond" size={12} color={rank.color} />
                      </View>
                  </View>
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
              </View>
          </Animated.View>
      );
  };

  // 🆕 UPDATE: renderGameHistoryItem (game activity card renderer) removed.

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

        <View style={styles.tabsRow}>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'STATS' && styles.tabBtnActive]} onPress={() => setActiveTab('STATS')}>
                <Text style={[styles.tabText, activeTab === 'STATS' && styles.tabTextActive]} numberOfLines={1}>ANALYTICS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'CALLS' && { backgroundColor: rank.color + '40', borderColor: rank.color }]} onPress={() => setActiveTab('CALLS')}>
                <Text style={[styles.tabText, activeTab === 'CALLS' && { color: '#FFF' }]} numberOfLines={1}>CALL LOG</Text>
            </TouchableOpacity>
            {/* 🆕 UPDATE: "ACTIVITY" tab removed */}
            <TouchableOpacity style={[styles.tabBtn, activeTab === 'REWARDS' && { backgroundColor: rank.color + '40', borderColor: rank.color }]} onPress={() => setActiveTab('REWARDS')}>
                <Text style={[styles.tabText, activeTab === 'REWARDS' && { color: '#FFF' }]} numberOfLines={1}>REWARD</Text>
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
                            <StatBox icon="cash-plus" label="ASSETS ADDED" value={`${totalRechargeDiamonds} 💎`} color="#10B981" bgColor="rgba(16, 185, 129, 0.1)" />
                            <StatBox icon="diamond-stone" label="ASSETS UTILIZED" value={`${totalSpentCalculated} 💎`} color="#F43F5E" bgColor="rgba(244, 63, 94, 0.1)" />
                            {/* 🆕 UPDATE: "ACTIVITY REWARDS" stat box removed */}
                            <StatBox icon="gift" label="REWARDS SENT" value={`${totalGiftsSpent} 💎`} color="#A855F7" bgColor="rgba(168, 85, 247, 0.1)" />
                            <StatBox icon="video-vintage" label="CALL SPENT" value={`${totalVideoCallSpent} 💎`} color="#3B82F6" bgColor="rgba(59, 130, 246, 0.1)" />
                            {/* 🆕 UPDATE: "TOTAL ARENA ENTRY" stat box removed. CALL MINS now full width as the last box. */}
                            <StatBox icon="clock-outline" label="CALL MINS" value={`${totalMinutes}`} color="#F59E0B" bgColor="rgba(245, 158, 11, 0.1)" width="100%" />
                        </View>
                    )}
                </View>
            )}

            {/* CALLS TAB */}
            {activeTab === 'CALLS' && (
                <View>
                    <View style={styles.talktimeHighlight}>
                         <Text style={[styles.totalTalkLabel, { color: rank.color, marginBottom: 15 }]}>TOTAL ARCHIVED ACTIVITY: {totalMinutes} MINS</Text>
                    </View>
                    {loading ? (
                        <ActivityIndicator size="large" color={rank.color} style={{ marginTop: 40 }} />
                    ) : callsData.length > 0 ? (
                        callsData.map((item, index) => <View key={item.id || index}>{renderHistoryItem({item})}</View>)
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
                    <View style={styles.talktimeHighlight}>
                         <Text style={[styles.totalTalkLabel, { color: rank.color, marginBottom: 15 }]}>TOTAL REWARDS SENT: {rewardsData.length}</Text>
                    </View>
                    {loading ? (
                        <ActivityIndicator size="large" color={rank.color} style={{ marginTop: 40 }} />
                    ) : rewardsData.length > 0 ? (
                        rewardsData.map((item, index) => <View key={item.id || index}>{renderHistoryItem({item})}</View>)
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
                    <View style={styles.talktimeHighlight}>
                         <Text style={[styles.totalTalkLabel, { color: '#EF4444', marginBottom: 15 }]}>HOST REPORTS AUDIT LOG: {flags.length} SECURE FLAGS</Text>
                    </View>
                    {loading ? (
                        <ActivityIndicator size="large" color="#EF4444" style={{ marginTop: 40 }} />
                    ) : flags.length > 0 ? (
                        flags.map((item, index) => {
                            // 🔥 SATTI UPDATE: Rendering the Blocked Host Profile Picture (Actual Photo)
                            const hostPic = item.fetchedExpertPic || item.expertImage || item.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.expertName || 'Host')}&background=EF4444&color=fff&bold=true`;
                            return (
                                <Animated.View key={item.alertId || index} style={[styles.cardContainerUI, { transform: [{ translateY: floatAnim }] }]}>
                                    <View style={styles.stealthHistoryCard}>
                                        <View style={[styles.quadBorderUI, { borderLeftColor: '#EF4444', borderRightColor: '#EF4444', borderTopColor: 'rgba(239, 68, 68, 0.2)', borderBottomColor: 'rgba(239, 68, 68, 0.2)' }]} />
                                        <View style={[styles.sessionBadge, { backgroundColor: '#EF4444' }]}>
                                             <MaterialCommunityIcons name="alert-circle" size={10} color="#FFF" />
                                             <Text style={styles.sessionTypeText}>REPORTED_LOG</Text>
                                        </View>
                                        <View style={styles.cardHeaderUI}>
                                            <View style={[styles.expertThumbRing, { borderColor: '#EF4444', shadowColor: '#EF4444', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                                <Image source={{ uri: hostPic }} style={styles.expertThumb} />
                                            </View>
                                            <View style={styles.expertInfo}>
                                                <Text style={styles.expertName} numberOfLines={1}>HOST: {(item.expertName || 'Unknown Host').toUpperCase()}</Text>
                                                <Text style={styles.callDateText} numberOfLines={1}>
                                                    {item.timestamp?.seconds 
                                                    ? new Date(item.timestamp.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) 
                                                    : 'RECENT FLAG'}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={[styles.statsRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
                                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900' }}>REASON FOR BLOCK:</Text>
                                            <Text style={{ color: '#E2E8F0', fontSize: 12, fontWeight: '700' }}>{item.reason || 'No specific reason documented by the host.'}</Text>
                                        </View>
                                    </View>
                                </Animated.View>
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
            <TouchableOpacity 
                style={[styles.bottomFlagBtn, flags.length > 0 ? {backgroundColor: '#EF4444'} : {backgroundColor: 'rgba(255,255,255,0.05)'}]}
                onPress={() => setActiveTab('FLAGS')}
                activeOpacity={0.8}
            >
                <MaterialCommunityIcons name={flags.length > 0 ? "alert-octagon" : "shield-check"} size={20} color={flags.length > 0 ? "#FFF" : "#10B981"} />
                <Text style={[styles.bottomFlagText, {color: flags.length > 0 ? "#FFF" : "#10B981"}]}>
                    {flags.length > 0 ? `VIEW SECURITY FLAGS (${flags.length})` : 'CLEAN RECORD (0 FLAGS)'}
                </Text>
            </TouchableOpacity>

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

const StatBox = ({ icon, label, value, color, bgColor, width = '48%' }: any) => (
    <View style={[styles.statBox, { borderColor: color, backgroundColor: bgColor, width: width as any }]}>
        <View style={[styles.iconCircle, { backgroundColor: color + '30' }]}>
            <MaterialCommunityIcons name={icon} size={28} color={color} />
        </View>
        <Text style={[styles.statBoxValue, { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.3}>{value}</Text>
        <Text style={styles.statBoxLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.5}>{label}</Text>
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
  
  tabsRow: { flexDirection: 'row', marginHorizontal: 16, marginTop: 10, marginBottom: 15, backgroundColor: '#0F172A', borderRadius: 12, padding: 5, borderWidth: 1, borderColor: '#1E293B', justifyContent: 'space-between', gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: 'transparent' },
  tabBtnActive: { backgroundColor: '#334155' },
  tabText: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
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

  // User App Stealth Card UI Styles
  cardContainerUI: { marginBottom: 20 },
  stealthHistoryCard: { backgroundColor: 'rgba(5,5,5,0.7)', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
  quadBorderUI: { ...StyleSheet.absoluteFillObject, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 1.2, borderBottomWidth: 1.2, borderRadius: 24, opacity: 0.8 },
  sessionBadge: { position: 'absolute', top: 0, right: 18, paddingHorizontal: 10, paddingVertical: 4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 10 },
  sessionTypeText: { color: '#FFF', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
  cardHeaderUI: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, zIndex: 10 },
  expertThumbRing: { width: 54, height: 54, borderRadius: 18, borderWidth: 1.5, padding: 2, elevation: 10, shadowOpacity: 0.5, shadowRadius: 8 },
  expertThumb: { width: '100%', height: '100%', borderRadius: 15 },
  expertInfo: { flex: 1, marginLeft: 15, overflow: 'hidden' },
  expertName: { color: '#FFF', fontSize: 14, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5 },
  callDateText: { color: '#475569', fontSize: 10, fontWeight: '800' },
  costContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 10 },
  costText: { fontSize: 17, fontWeight: '900' },
  statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 12, zIndex: 10, width: '100%' },
  statItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' },
  statValueText: { color: '#94A3B8', fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
  vDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 4 },
  talkAgainBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', flex: 1.2 },
  talkAgainText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  emptyBox: { alignItems: 'center', marginTop: 40, opacity: 0.7 },
  emptyText: { color: '#64748B', marginTop: 10, fontSize: 12, fontWeight: '700', letterSpacing: 1 },

  // 🔥 SATTI UPDATE: Bottom Button Styles Added 🔥
  footerContainer: { marginTop: 40, alignItems: 'center', paddingHorizontal: 20 },
  bottomFlagBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 15, paddingHorizontal: 30, borderRadius: 25, width: '100%', gap: 10, elevation: 5, shadowColor: '#EF4444', shadowOpacity: 0.3, shadowRadius: 10 },
  bottomFlagText: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
  
  footer: { alignItems: 'center', marginTop: 40 },
  verText: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  secureNode: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 15, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, borderWidth: 1 },
  secureText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
});