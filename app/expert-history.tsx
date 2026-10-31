import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    collection,
    doc, getDoc, getDocs,
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
    FlatList,
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

const { width, height } = Dimensions.get('window');

// ✅ ACCURATE THEME & LEVEL CONFIG (LOCKED DEEP-GLOW COLORS)
const getLevelConfig = (beans: number) => {
    if (beans >= 100000000) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'], glow: '#F59E0B' };
    if (beans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'], glow: '#EC4899' };
    if (beans >= 30000000) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'], glow: '#8B5CF6' };
    if (beans >= 10000000) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'], glow: '#3B82F6' };
    if (beans >= 5000000)  return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'], glow: '#06B6D4' };
    if (beans >= 3000000)  return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'], glow: '#10B981' };
    if (beans >= 1000000)  return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'], glow: '#EAB308' };
    if (beans >= 300000)   return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'], glow: '#94A3B8' };
    if (beans >= 100000)   return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'], glow: 'transparent' };
    if (beans >= 30000)    return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'], glow: 'transparent' };
    return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'], glow: 'transparent' };
};

const calculateLevel = (d: number) => {
    if (d <= 200000) return "Silver";
    if (d <= 1000000) return "Gold";
    if (d <= 5000000) return "Diamond";
    if (d <= 10000000) return "Legend";
    if (d <= 50000000) return "Elite";
    if (d <= 100000000) return "Master";
    if (d <= 500000000) return "Grandmaster";
    return "Godlike";
};

const TABS = [
    { id: 'video_call', label: 'Call Reward', icon: 'videocam', iconType: 'Ionicons' },
    { id: 'live_gift', label: 'Broadcast Rewards', icon: 'broadcast', iconType: 'MaterialCommunityIcons' },
    { id: 'party_gift', label: 'Forum Rewards', icon: 'party-popper', iconType: 'MaterialCommunityIcons' },
    { id: 'call_gift', label: 'Private Rewards', icon: 'gift', iconType: 'MaterialCommunityIcons' },
    { id: 'daily_bonus', label: 'Daily Bonus', icon: 'star-shooting', iconType: 'MaterialCommunityIcons' } 
];

export default function ExpertHistory() {
  const router = useRouter();
  const user = auth.currentUser;

  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMinutes, setTotalMinutes] = useState(0);
  
  const [activeTab, setActiveTab] = useState<'video_call' | 'live_gift' | 'party_gift' | 'call_gift' | 'daily_bonus'>('video_call');
  const [expertProfile, setExpertProfile] = useState<any>(null);

  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  const config = getLevelConfig(expertProfile?.totalBeansEarned || 0);
  const theme = {
      primary: config.colors[0],
      secondary: config.colors[2],
      accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
      bgGradient: [
          config.lvl >= 7 ? `${config.colors[0]}40` : '#020617', 
          config.lvl >= 3 ? `${config.colors[1]}20` : '#0F172A', 
          '#020617'
      ] as const 
  };

  const fetchAllArchives = async () => {
    if (!user) return;
    setLoading(true);
    try {
        let rawData: any[] = [];

        // 1. FETCH CALLS
        const callsSnap = await getDocs(query(collection(db, "calls"), where("expertId", "==", user.uid)));
        for (const docSnap of callsSnap.docs) {
            const d = docSnap.data();
            const expertEarnings = Number(d.expertEarnings) || 0;

            if (expertEarnings > 0) {
                let callerName = d.callerName || 'Call User';
                let callerPic = d.callerImage || null;
                let callerLevel = 'Silver';

                if (d.callerId) {
                    const uSnap = await getDoc(doc(db, "users", d.callerId));
                    if (uSnap.exists()) {
                        const uData = uSnap.data();
                        callerName = uData.name || uData.displayName || callerName;
                        callerPic = uData.profilePic || uData.photoURL || callerPic;
                        callerLevel = calculateLevel(uData.balance || 0);
                    }
                }

                rawData.push({
                    id: docSnap.id,
                    type: 'video_call',
                    callerId: d.callerId, 
                    callerName: callerName,
                    syncPic: callerPic,
                    syncLevel: callerLevel,
                    finalDuration: d.finalDuration || d.duration || 0,
                    expertEarnings: expertEarnings,
                    timestamp: d.endedAt || d.createdAt || { seconds: 0 }
                });
            }
        }

        // 2. FETCH TRANSACTIONS (For Call Gifts & DAILY BONUS)
        const transSnapUser = await getDocs(query(collection(db, "transactions"), where("userId", "==", user.uid)));
        const transSnapExpert = await getDocs(query(collection(db, "transactions"), where("expertId", "==", user.uid)));
        
        const mergedDocs = [...transSnapUser.docs, ...transSnapExpert.docs];
        const uniqueDocs = Array.from(new Map(mergedDocs.map(doc => [doc.id, doc])).values());

        for (const docSnap of uniqueDocs) {
            const d = docSnap.data();
            if (d.type === 'video_call') continue; 
            
            if (d.type === 'mission_bonus' || d.title?.includes('Daily Mission') || (d.title?.includes('Bonus') && !d.title?.includes('Arena'))) {
                const bonusAmount = Number(d.expertBeans) || Number(d.expertBean) || Number(d.beans) || Number(d.amount) || 0;
                if (bonusAmount > 0) {
                    rawData.push({
                        id: docSnap.id,
                        type: 'daily_bonus',
                        senderId: null,
                        senderName: 'TalkPe System',
                        syncPic: 'https://img.icons8.com/3d-fluency/512/star.png',
                        syncLevel: 'Legend',
                        giftName: d.title || 'Daily Goal Completion',
                        amount: bonusAmount,
                        beans: bonusAmount,
                        timestamp: d.timestamp || d.createdAt || { seconds: 0 }
                    });
                }
                continue;
            }

            const bns = Number(d.expertBeans) || Number(d.expertBean) || Number(d.beans) || Math.floor((Number(d.diamonds) || Number(d.amount) || 0) / 2);

            if (bns > 0) {
                let tType = 'call_gift';
                if (d.source === 'Session' || d.source === 'forum') tType = 'party_gift';
                if (d.source === 'live') tType = 'live_gift';

                let senderName = d.senderName || d.userName || 'Verified Supporter';
                let senderPic = d.userImage || null;
                let senderLevel = 'Silver';

                if (d.userId && d.userId !== 'unknown' && d.userId !== user.uid) {
                    const uSnap = await getDoc(doc(db, "users", d.userId));
                    if (uSnap.exists()) {
                        const uData = uSnap.data();
                        senderName = uData.name || uData.displayName || senderName;
                        senderPic = uData.profilePic || uData.photoURL || senderPic;
                        senderLevel = calculateLevel(uData.balance || 0);
                    }
                }

                rawData.push({
                    id: docSnap.id,
                    type: tType,
                    senderId: d.userId, 
                    senderName: senderName,
                    syncPic: senderPic,
                    syncLevel: senderLevel,
                    giftName: d.giftName || d.giftType || 'Virtual Reward',
                    amount: d.diamonds || d.amount || 0,
                    beans: bns,
                    timestamp: d.timestamp || { seconds: 0 }
                });
            }
        }

        // 3. FETCH LIVES (Live Gifts)
        const livesSnap = await getDocs(query(collection(db, "lives"), where("hostId", "==", user.uid)));
        for (const liveDoc of livesSnap.docs) {
            const liveData = liveDoc.data();
            const isParty = liveData.isPartyRoom === true || liveData.status === "party_hidden";

            if (!isParty) {
                const giftsSnap = await getDocs(collection(db, "lives", liveDoc.id, "gifts"));
                for (const gDoc of giftsSnap.docs) {
                    const g = gDoc.data();
                    const bns = Number(g.beans) || Math.floor((Number(g.amount) || Number(g.price) || 0) / 2);

                    if (bns > 0) {
                        let gSenderName = g.senderName || 'VIP Supporter';
                        let gPic = g.senderImage || g.icon || null;
                        let gLevel = 'Silver';

                        if (g.senderId) {
                            const uSnap = await getDoc(doc(db, "users", g.senderId));
                            if (uSnap.exists()) {
                                const uData = uSnap.data();
                                gSenderName = uData.name || uData.displayName || gSenderName;
                                gPic = uData.profilePic || uData.photoURL || gPic;
                                gLevel = calculateLevel(uData.balance || 0);
                            }
                        }

                        rawData.push({
                            id: gDoc.id,
                            type: 'live_gift',
                            senderId: g.senderId, 
                            senderName: gSenderName,
                            giftName: g.giftName || 'Virtual Reward',
                            amount: g.amount || g.price || 0,
                            beans: bns,
                            timestamp: g.timestamp || liveData.startedAt || { seconds: 1 },
                            syncPic: gPic,
                            syncLevel: gLevel
                        });
                    }
                }
            }
        }

        // 4. FETCH Session ROOMS (Forum Rewards) 
        const partySnap = await getDocs(query(collection(db, "forum_rooms"), where("hostId", "==", user.uid)));
        for (const partyDoc of partySnap.docs) {
            const pData = partyDoc.data();
            const giftsSnap = await getDocs(collection(db, "forum_rooms", partyDoc.id, "gifts"));
            for (const gDoc of giftsSnap.docs) {
                const g = gDoc.data();
                const bns = Number(g.beans) || Math.floor((Number(g.price) || Number(g.amount) || 0) / 2);
                
                if (bns > 0) {
                    let gSenderName = g.senderName || 'Room Member';
                    let gPic = g.icon || null;
                    let gLevel = 'Silver';

                    if (g.senderId) {
                        const uSnap = await getDoc(doc(db, "users", g.senderId));
                        if (uSnap.exists()) {
                            const uData = uSnap.data();
                            gSenderName = uData.name || uData.displayName || gSenderName;
                            gPic = uData.profilePic || uData.photoURL || gPic;
                            gLevel = calculateLevel(uData.balance || 0);
                        }
                    }

                    rawData.push({
                        id: gDoc.id,
                        type: 'party_gift',
                        senderId: g.senderId, 
                        senderName: gSenderName,
                        giftName: g.giftName || 'Virtual Reward',
                        amount: g.price || g.amount || 0,
                        beans: bns,
                        timestamp: g.timestamp || pData.createdAt || { seconds: 1 },
                        syncPic: gPic,
                        syncLevel: gLevel
                    });
                }
            }
        }

        const uniqueData: any[] = [];
        const seen = new Set();
        for (const item of rawData) {
            const uniqueKey = `${item.type}_${item.beans || item.expertEarnings}_${item.timestamp?.seconds || 0}`;
            if (!seen.has(uniqueKey)) {
                seen.add(uniqueKey);
                uniqueData.push(item);
            }
        }

        uniqueData.sort((a: any, b: any) => {
            const timeA = a.timestamp?.seconds || 0;
            const timeB = b.timestamp?.seconds || 0;
            return timeB - timeA;
        });

        const totalSecs = uniqueData.filter(t => t.type === 'video_call').reduce((acc, curr) => acc + (Number(curr.finalDuration) || 0), 0);
        setTotalMinutes(Math.floor(totalSecs / 60));

        setAllTransactions(uniqueData);
        setLoading(false);

    } catch (error) {
        console.error("Archive Sync Error:", error);
        setLoading(false);
    }
  };

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 4000,
        easing: Easing.inOut(Easing.sin),
        useNativeDriver: true
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

    if (!user) return;
    
    const expertRef = doc(db, "users", user.uid);
    const unsubExpert = onSnapshot(expertRef, (snap) => {
        if (snap.exists()) setExpertProfile(snap.data());
    });

    fetchAllArchives();

    return () => {
        unsubExpert();
    };
  }, [user]);

  const orbTranslateY = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -30]
  });

  const borderType1 = {
      borderLeftWidth: 2,
      borderRightWidth: 2,
      borderTopWidth: 0.5,
      borderBottomWidth: 0.5,
      borderLeftColor: theme.primary,
      borderRightColor: theme.primary,
      borderTopColor: theme.secondary + '80',
      borderBottomColor: theme.secondary + '80',
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
  };

  const borderType2 = {
      borderLeftWidth: 2,
      borderRightWidth: 2,
      borderTopWidth: 0.5,
      borderBottomWidth: 0.5,
      borderLeftColor: theme.secondary,
      borderRightColor: theme.secondary,
      borderTopColor: theme.primary + '80',
      borderBottomColor: theme.primary + '80',
      backgroundColor: 'rgba(15, 23, 42, 0.45)',
  };

  const renderCallItem = ({ item, index }: { item: any, index: number }) => {
    const duration = Number(item.finalDuration) || 0;
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const dateObj = item.timestamp?.seconds ? new Date(item.timestamp.seconds * 1000) : new Date();
    const earnings = item.expertEarnings || 0; 
    
    const titleText = item.callerName ? `Call with ${item.callerName}` : "Call Reward";

    return (
      <Animated.View style={[styles.eliteCard, index % 2 === 0 ? borderType1 : borderType2, { transform: [{ translateY: floatAnim }] }]}>
        <LinearGradient colors={[theme.primary, 'transparent']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.statusGlowLine} />
        <View style={styles.cardMain}>
          <View style={styles.userSection}>
            <TouchableOpacity 
                style={styles.avatarWrapper} 
                onPress={() => item.callerId ? router.push({ pathname: '/user-detail', params: { id: item.callerId } } as any) : null}
                disabled={!item.callerId}
            >
                <Image source={{ uri: item.syncPic || `https://ui-avatars.com/api/?name=${item.callerName}&background=3B82F6&color=fff` }} style={styles.eliteAvatar} />
                <LinearGradient colors={[theme.primary, theme.secondary]} style={styles.levelBadgeMini}>
                  <Text style={styles.levelBadgeText}>{item.syncLevel.toUpperCase()}</Text>
                </LinearGradient>
            </TouchableOpacity>
            <View style={styles.userMeta}>
              <Text style={styles.eliteUserName} numberOfLines={2} adjustsFontSizeToFit>{titleText}</Text>
              <View style={styles.dateTimeRow}>
                <Ionicons name="time" size={12} color={theme.primary} />
                <Text style={styles.eliteDateText}>{dateObj.toLocaleDateString()} • {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
              </View>
            </View>
          </View>
          <View style={styles.earningsBlock}>
            <Text style={styles.earnLabel}>Rewards</Text>
            <View style={styles.beansRow}>
              <Text style={styles.eliteBeansValue}>+🎖️{earnings}</Text> 
            </View>
          </View>
        </View>
        <BlurView intensity={20} tint="dark" style={styles.cardFooter}>
            <View style={styles.footerStatRow}>
                <Ionicons name="stopwatch" size={13} color="#10B981" />
                <Text style={styles.footerStatText}>{mins}m {secs}s Uplink</Text>
            </View>
            <View style={[styles.verifiedBadge, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="shield-checkmark" size={11} color={theme.accent} />
                <Text style={[styles.verifiedText, { color: theme.accent }]}>SECURE</Text>
            </View>
        </BlurView>
      </Animated.View>
    );
  };

  const renderGiftItem = ({ item, index }: { item: any, index: number }) => {
    const dateObj = item.timestamp?.seconds ? new Date(item.timestamp.seconds * 1000) : new Date();
    const beansEarned = item.beans || 0;
    
    let displayTitle = "";
    let displaySub = item.giftName || 'Virtual Reward';
    let iconType = 'gift';
    let iconColor = theme.primary;

    if (item.type === 'daily_bonus') {
        displayTitle = 'Daily Mission Bonus';
        displaySub = item.giftName || 'System Reward';
        iconType = 'star-shooting';
        iconColor = '#8B5CF6';
    } else {
        let baseTitle = "";
        if (item.type === 'live_gift') {
            baseTitle = "Broadcast Reward";
            iconType = 'broadcast';
            iconColor = '#10B981';
        } else if (item.type === 'party_gift') {
            baseTitle = "Forum Reward";
            iconType = 'party-popper';
            iconColor = '#EC4899';
        } else if (item.type === 'call_gift') {
            baseTitle = "Private Reward";
            iconType = 'gift';
            iconColor = theme.primary;
        }
        
        const validSender = item.senderName && item.senderName !== "Unknown" ? item.senderName : "User";
        displayTitle = `${baseTitle} (from ${validSender})`;
    }

    return (
      <Animated.View style={[styles.eliteCard, index % 2 === 0 ? borderType2 : borderType1, { transform: [{ translateY: floatAnim }] }]}>
        <LinearGradient colors={[theme.secondary, 'transparent']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.statusGlowLine} />
        <View style={styles.cardMain}>
          <View style={styles.userSection}>
            <TouchableOpacity 
                style={styles.avatarWrapper} 
                onPress={() => item.senderId ? router.push({ pathname: '/user-detail', params: { id: item.senderId } } as any) : null}
                disabled={!item.senderId}
            >
                <Image source={{ uri: item.syncPic || `https://ui-avatars.com/api/?name=${item.senderName || 'V'}&background=D946EF&color=fff` }} style={styles.eliteAvatar} />
                <LinearGradient colors={[theme.primary, theme.secondary]} style={styles.levelBadgeMini}>
                  <Text style={styles.levelBadgeText}>{item.syncLevel.toUpperCase()}</Text>
                </LinearGradient>
            </TouchableOpacity>
            <View style={styles.userMeta}>
              <Text style={styles.eliteUserName} numberOfLines={2} adjustsFontSizeToFit>{displayTitle}</Text>
              <View style={styles.giftLabelRow}>
                  <MaterialCommunityIcons name={iconType as any} size={16} color={iconColor} />
                  <Text style={[styles.giftSubName, { color: iconColor }]} numberOfLines={2} adjustsFontSizeToFit>{displaySub}</Text>
              </View>
            </View>
          </View>
          <View style={styles.earningsBlock}>
            <Text style={styles.earnLabel}>REWARD</Text>
            <View style={styles.beansRow}>
              <Text style={styles.eliteBeansValue}>+🎖️{beansEarned}</Text>
            </View>
          </View>
        </View>
        <View style={styles.cardFooterSimple}>
            <Text style={styles.footerTimeText}>{dateObj.toLocaleDateString()} • {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            <View style={[styles.receivedTag, { backgroundColor: theme.primary + '20' }]}>
                <MaterialCommunityIcons name="check-decagram" size={12} color={theme.accent} />
                <Text style={[styles.receivedText, { color: theme.accent }]}>VERIFIED</Text>
            </View>
        </View>
      </Animated.View>
    );
  };

  const filteredData = allTransactions.filter(t => t.type === activeTab);

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />
      
      <Animated.View style={[styles.shimmerOrb, { top: 120, right: -60, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
      <Animated.View style={[styles.shimmerOrb, { top: 500, left: -90, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <View style={styles.eliteHeader}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.glassBackBtn, { borderColor: theme.primary + '40' }]}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={[styles.headerLabel, { color: theme.primary }]}>SECURE TERMINAL</Text>
            <Text style={styles.headerMainTitle}>Reward Hub</Text>
          </View>
          <TouchableOpacity style={styles.headerActionBtn} onPress={fetchAllArchives}>
            <MaterialCommunityIcons name="shield-refresh-outline" size={26} color={theme.accent} />
          </TouchableOpacity>
        </View>

        <View>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.tabCapsuleContainer}
            >
                <BlurView intensity={40} tint="dark" style={[styles.tabCapsule, { borderColor: theme.primary + '30' }]}>
                    {TABS.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <TouchableOpacity 
                                key={tab.id}
                                style={[styles.eliteTab, isActive && [styles.eliteTabActive, { backgroundColor: theme.primary + '20' }]]} 
                                onPress={() => setActiveTab(tab.id as any)}
                            >
                                {isActive && <View style={[styles.activeGlow, { backgroundColor: theme.primary, shadowColor: theme.primary }]} />}
                                {tab.iconType === 'Ionicons' ? (
                                    <Ionicons name={tab.icon as any} size={16} color={isActive ? '#FFF' : '#475569'} />
                                ) : (
                                    <MaterialCommunityIcons name={tab.icon as any} size={16} color={isActive ? '#FFF' : '#475569'} />
                                )}
                                <Text style={[styles.eliteTabText, isActive && styles.eliteTabTextActive]}>{tab.label}</Text>
                            </TouchableOpacity>
                        )
                    })}
                </BlurView>
            </ScrollView>
        </View>
        
        {loading ? (
          <View style={styles.loaderBox}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loaderText, { color: theme.primary }]}>SYNCING ARCHIVES...</Text>
          </View>
        ) : filteredData.length === 0 ? (
          <View style={styles.emptyCenter}>
            <View style={[styles.emptyIconCircle, { borderColor: theme.primary + '20' }]}>
                <MaterialCommunityIcons name="database-off" size={60} color={theme.primary + '30'} />
            </View>
            <Text style={styles.emptyTitleText}>No Activity Found</Text>
            <Text style={{color: '#475569', fontSize: 13, marginTop: 10, textAlign: 'center'}}>Your earning records will appear here after synchronization.</Text>
          </View>
        ) : (
          <FlatList 
            data={filteredData} 
            keyExtractor={(item, index) => `${item.id}_${index}`} 
            renderItem={activeTab === 'video_call' ? renderCallItem : renderGiftItem} 
            contentContainerStyle={styles.listContainer} 
            showsVerticalScrollIndicator={false} 
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#020617' },
  shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15 },
  eliteHeader: { flexDirection: 'row', alignItems: 'center', padding: 20, justifyContent: 'space-between' },
  glassBackBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  headerTitleContainer: { flex: 1, marginLeft: 18 },
  headerLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 4 },
  headerMainTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  headerActionBtn: { padding: 5 },
  tabCapsuleContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  tabCapsule: { flexDirection: 'row', backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 25, padding: 6, borderWidth: 1, overflow: 'hidden' },
  eliteTab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16, position: 'relative' },
  eliteTabActive: { borderRadius: 20 },
  activeGlow: { position: 'absolute', bottom: 0, width: '60%', height: 3, borderRadius: 10 },
  eliteTabText: { color: '#475569', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
  eliteTabTextActive: { color: '#FFF' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 120 },
  eliteCard: { borderRadius: 32, marginBottom: 18, overflow: 'hidden', elevation: 20 },
  statusGlowLine: { height: 3, width: '100%' },
  cardMain: { flexDirection: 'row', padding: 18, justifyContent: 'space-between', alignItems: 'center' },
  userSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarWrapper: { position: 'relative' },
  eliteAvatar: { width: 55, height: 55, borderRadius: 22, backgroundColor: '#0F172A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  levelBadgeMini: { position: 'absolute', bottom: -6, right: -6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 2, borderColor: '#020617' },
  levelBadgeText: { color: '#FFF', fontSize: 7, fontWeight: '900' },
  userMeta: { marginLeft: 15, flex: 1, paddingRight: 10, flexShrink: 1 },
  eliteUserName: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.2 },
  dateTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  giftLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  eliteDateText: { color: '#94A3B8', fontSize: 10, fontWeight: '800' },
  giftSubName: { color: '#FBBF24', fontSize: 11, fontWeight: '900', flexShrink: 1 },
  earningsBlock: { alignItems: 'flex-end', minWidth: 60 },
  earnLabel: { color: '#475569', fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
  beansRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  eliteBeansValue: { color: '#FBBF24', fontSize: 18, fontWeight: '900' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.25)' },
  footerStatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerStatText: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  verifiedText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  cardFooterSimple: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)', alignItems: 'center' },
  footerTimeText: { color: '#94A3B8', fontSize: 10, fontWeight: '800' },
  receivedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  receivedText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 15, fontWeight: '900', fontSize: 10, letterSpacing: 2 },
  emptyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center', marginBottom: 25, borderWidth: 1 },
  emptyTitleText: { color: '#FFF', fontSize: 22, fontWeight: '900' }
});