import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, collectionGroup, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT THEME SYNC)
const calculateUserLevel = (totalSpent: number) => {
  if (totalSpent >= 500000001) return { lvl: 8, label: 'TITAN OVERSEER', color: '#FF0033', secondaryColor: '#660000', anim: 'titan' }; 
  if (totalSpent >= 100000001) return { lvl: 7, label: 'MYTHIC RULER', color: '#D946EF', secondaryColor: '#c8040b', anim: 'mythic' }; 
  if (totalSpent >= 50000000) return { lvl: 6, label: 'GRANDMASTER', color: '#9c77f3', secondaryColor: '#d31515', anim: 'grandmaster' };
  if (totalSpent >= 10000000) return { lvl: 5, label: 'ELITE VETERAN', color: '#00F2FE', secondaryColor: '#970d50d4', anim: 'explosion' };
  if (totalSpent >= 5000000) return { lvl: 4, label: 'LEGENDARY NODE', color: '#d0630a', secondaryColor: '#DC2626', anim: 'nebula' };
  if (totalSpent >= 1000000) return { lvl: 3, label: 'DIAMOND CORE', color: '#a3de4a', secondaryColor: '#991625', anim: 'diamond' };
  if (totalSpent >= 200001) return { lvl: 2, label: 'GOLD OPERATIVE', color: '#ffae00', secondaryColor: '#801f29', anim: 'sparkle' };
  return { lvl: 1, label: 'SILVER AGENT', color: '#0f33e7', secondaryColor: '#f50808', anim: 'wave' };
};

export default function HistoryScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    
    const [history, setHistory] = useState<any[]>([]);
    // 🆕 UPDATE: gameHistory and totalGames states removed (game activity log removed)
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [totalMinutes, setTotalMinutes] = useState<number>(0);

    // 🆕 UPDATE: 'GAMES' tab removed. Only CALLS and REWARDS remain.
    const [activeTab, setActiveTab] = useState<'CALLS' | 'REWARDS'>('CALLS'); 

    const scrollY = useRef(new Animated.Value(0)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const trailX = useRef(new Animated.Value(-width)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -8, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ).start();

        const runTrail = () => {
            trailX.setValue(-width);
            Animated.timing(trailX, { toValue: width, duration: 3500, useNativeDriver: true }).start(() => runTrail());
        };
        runTrail();

        if (!user) return;

        const userRef = doc(db, "users", user.uid);
        const unsubUser = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) setUserData(docSnap.data());
        });

        // ==========================================
        // 🔥 1. CALLS & GIFTS FETCHING ENGINE
        // ==========================================
        let rawCalls: any[] = [];
        let rawGifts: any[] = [];

        const processCallLogs = () => {
            const myGifts = rawGifts.filter(g => {
                const isIdMatch = g.senderId === user.uid || g.userId === user.uid;
                const isNameMatch = g.senderName && (g.senderName === userData?.name || g.senderName === user.displayName);
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

            const combined = [...mappedCalls, ...mappedStandaloneGifts, ...mappedCallGifts].sort((a, b) => b.mergedTime - a.mergedTime);
            const totalSecs = rawCalls.reduce((acc, curr) => acc + (Number(curr.finalDuration) || Number(curr.duration) || 0), 0);
            setTotalMinutes(Math.floor(totalSecs / 60));
            setHistory(combined);
            setLoading(false);
        };

        const qCalls = query(collection(db, "calls"), where("callerId", "==", user.uid), orderBy("endedAt", "desc"));
        const unsubscribeHistory = onSnapshot(qCalls, (snapshot) => {
            rawCalls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            processCallLogs();
        });

        const qGifts = query(collectionGroup(db, 'gifts'));
        const unsubscribeGifts = onSnapshot(qGifts, async (snapshot) => {
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
            processCallLogs();
        });

        // 🆕 UPDATE: Game activity log engine (activityHistory listener) removed from here.

        return () => { 
            unsubUser(); unsubscribeHistory(); unsubscribeGifts(); 
        };
    }, [user, userData]);

    // 🔥 SATTI FIX: Synced Highest Balance check for accurate Level display!
    const userDiamonds = Math.max(
        userData?.totalDiamonds || 0,
        userData?.walletBalance || 0,
        userData?.balance || 0
    );
    const userTier = calculateUserLevel(userDiamonds);

    const callsData = history.filter(item => item.isCall);
    const rewardsData = history.filter(item => item.isCallGift || item.isStandaloneGift);

    // ==========================================
    // 🔥 UI RENDERERS
    // ==========================================
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
                <Animated.View style={[styles.cardContainer, { transform: [{ translateY: floatAnim }] }]}>
                    <View style={styles.stealthHistoryCard}>
                        <View style={[styles.quadBorder, { borderLeftColor: '#A855F7', borderRightColor: '#A855F7', borderTopColor: 'rgba(168, 85, 247, 0.4)', borderBottomColor: 'rgba(168, 85, 247, 0.4)' }]} />
                        
                        <View style={[styles.sessionBadge, { backgroundColor: '#A855F7' }]}>
                             <MaterialCommunityIcons name="gift" size={10} color="#FFF" />
                             <Text style={styles.sessionTypeText}>REWARD SENT</Text>
                        </View>
                        
                        <View style={styles.cardHeader}>
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
            <Animated.View style={[styles.cardContainer, { transform: [{ translateY: floatAnim }] }]}>
                <View style={styles.stealthHistoryCard}>
                    <View style={[styles.quadBorder, { 
                        borderLeftColor: userTier.color, borderRightColor: userTier.color, 
                        borderTopColor: userTier.secondaryColor, borderBottomColor: userTier.secondaryColor 
                    }]} />
                    
                    <View style={[styles.sessionBadge, { backgroundColor: userTier.color }]}>
                         <Ionicons name="videocam" size={10} color="#FFF" />
                         <Text style={styles.sessionTypeText}>VERIFIED_LINK</Text>
                    </View>
                    
                    <View style={styles.cardHeader}>
                        <View style={[styles.expertThumbRing, { borderColor: userTier.color, shadowColor: userTier.color }]}>
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
                             <Text style={[styles.costText, { color: userTier.color }]} numberOfLines={1} adjustsFontSizeToFit>-{totalSpentOnCall.toLocaleString()}</Text>
                             <Ionicons name="diamond" size={12} color={userTier.color} />
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Ionicons name="time-outline" size={14} color="#64748B" />
                            <Text style={styles.statValueText} numberOfLines={1} adjustsFontSizeToFit>{durationText}</Text>
                        </View>

                        <View style={styles.vDivider} />
                        <TouchableOpacity 
                            style={styles.talkAgainBtn}
                            onPress={() => router.push({ pathname: '/expert-detail', params: { id: item.expertId } } as any)}
                        >
                            <Text style={[styles.talkAgainText, { color: userTier.color }]} numberOfLines={1} adjustsFontSizeToFit>RECONNECT</Text>
                            <Ionicons name="arrow-forward" size={12} color={userTier.color} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        );
    };

    // 🆕 UPDATE: renderGameHistoryItem (game activity log renderer) removed.

    const parallaxHeader = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0, -40], extrapolate: 'clamp' });

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0F172A', '#020617']} style={StyleSheet.absoluteFill} />
            
            <Animated.View style={[styles.aura, { top: -50, left: -100, backgroundColor: userTier.color, opacity: 0.15, transform: [{ translateY: parallaxHeader }] }]} />
            <Animated.View style={[styles.aura, { bottom: 100, right: -100, backgroundColor: userTier.secondaryColor, opacity: 0.1, transform: [{ translateY: parallaxHeader }] }]} />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <View style={styles.headerSection}>
                    <View style={styles.topRow}>
                        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: userTier.color + '40' }]}>
                            <Ionicons name="chevron-back" size={24} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.screenTitle} numberOfLines={1}>SESSION LOGS</Text>
                        <View style={styles.placeholderBtn} /> 
                    </View>

                    <View style={styles.talktimeHighlight}>
                        <Text style={[styles.totalTalkLabel, { color: userTier.color }]} numberOfLines={1}>
                            {activeTab === 'CALLS' ? 'TOTAL CALL TALKTIME' : 'TOTAL REWARDS SENT'}
                        </Text>
                        <View style={styles.minsDisplay}>
                            <Text style={styles.bigMins} numberOfLines={1} adjustsFontSizeToFit>
                                {activeTab === 'CALLS' ? totalMinutes.toLocaleString() : rewardsData.length.toLocaleString()}
                            </Text>
                            <Text style={styles.minSuffix} numberOfLines={1}>
                                {activeTab === 'CALLS' ? 'MINS' : 'GIFTS'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.walletArea}>
                     <View style={styles.stealthWalletCard}>
                        <View style={[styles.quadBorder, { 
                            borderLeftColor: userTier.color, borderRightColor: userTier.color, 
                            borderTopColor: userTier.secondaryColor, borderBottomColor: userTier.secondaryColor 
                        }]} />
                        <Animated.View style={[styles.glowTrail, { backgroundColor: userTier.color, transform: [{ translateX: trailX }] }]} />
                        <View style={styles.walletInfo}>
                             <Text style={styles.walletTitle} numberOfLines={1}>AVAILABLE ASSETS</Text>
                             <View style={styles.balanceRow}>
                                <Ionicons name="diamond" size={28} color={userTier.color} />
                                <Text style={styles.balanceText} numberOfLines={1} adjustsFontSizeToFit>{(userData?.balance || 0).toLocaleString()}</Text>
                             </View>
                        </View>
                        <MaterialCommunityIcons name="integrated-circuit-chip" size={40} color="rgba(255,255,255,0.05)" style={styles.chipIcon} />
                     </View>
                </View>

                <View style={styles.tabsRow}>
                    <TouchableOpacity style={[styles.tabBtn, activeTab === 'CALLS' && { backgroundColor: userTier.color + '40', borderColor: userTier.color }]} onPress={() => setActiveTab('CALLS')}>
                        <Text style={[styles.tabText, activeTab === 'CALLS' && { color: '#FFF' }]} numberOfLines={1}>CALL LOG</Text>
                    </TouchableOpacity>
                    {/* 🆕 UPDATE: "ACTIVITY LOG" tab removed */}
                    <TouchableOpacity style={[styles.tabBtn, activeTab === 'REWARDS' && { backgroundColor: userTier.color + '40', borderColor: userTier.color }]} onPress={() => setActiveTab('REWARDS')}>
                        <Text style={[styles.tabText, activeTab === 'REWARDS' && { color: '#FFF' }]} numberOfLines={1}>REWARD LOG</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingBox}>
                        <ActivityIndicator size="large" color={userTier.color} />
                        <Text style={[styles.loadingText, { color: userTier.color }]}>Syncing Archives...</Text>
                    </View>
                ) : activeTab === 'CALLS' ? (
                    callsData.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconCircle, { borderColor: userTier.color + '20' }]}>
                                 <Ionicons name="videocam-off" size={50} color={userTier.color} style={{ opacity: 0.2 }} />
                            </View>
                            <Text style={styles.emptyTitle}>NO SESSIONS FOUND</Text>
                            <Text style={styles.emptySub}>Your professional session logs will appear here once linked with an expert node.</Text>
                                                       
                        </View>
                    ) : (
                        <Animated.FlatList
                            data={callsData}
                            keyExtractor={(item) => item.id}
                            renderItem={renderHistoryItem}
                            contentContainerStyle={styles.listPadding}
                            showsVerticalScrollIndicator={false}
                            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                        />
                    )
                ) : (
                    rewardsData.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <View style={[styles.emptyIconCircle, { borderColor: userTier.color + '20' }]}>
                                 <Ionicons name="gift-outline" size={50} color={userTier.color} style={{ opacity: 0.2 }} />
                            </View>
                            <Text style={styles.emptyTitle}>NO REWARDS FOUND</Text>
                            <Text style={styles.emptySub}>Your reward transmission logs will appear here once you send gifts.</Text>
                        </View>
                    ) : (
                        <Animated.FlatList
                            data={rewardsData}
                            keyExtractor={(item) => item.id}
                            renderItem={renderHistoryItem}
                            contentContainerStyle={styles.listPadding}
                            showsVerticalScrollIndicator={false}
                            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                        />
                    )
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#020617' },
    aura: { position: 'absolute', width: 450, height: 450, borderRadius: 225 },
    headerSection: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    backBtn: { width: 45, height: 45, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    screenTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
    placeholderBtn: { width: 45 },
    talktimeHighlight: { alignItems: 'center', marginBottom: 10 },
    totalTalkLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 5 },
    minsDisplay: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', width: '100%' },
    bigMins: { color: '#FFF', fontSize: 44, fontWeight: '900', lineHeight: 46 },
    minSuffix: { color: '#475569', fontSize: 12, fontWeight: '800', marginLeft: 8, marginBottom: 6 },
    walletArea: { paddingHorizontal: 20, marginBottom: 15 },
    stealthWalletCard: { height: 110, backgroundColor: '#000', borderRadius: 24, overflow: 'hidden', elevation: 20, padding: 22 },
    quadBorder: { ...StyleSheet.absoluteFillObject, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 1.2, borderBottomWidth: 1.2, borderRadius: 24, opacity: 0.8 },
    glowTrail: { position: 'absolute', width: 100, height: '200%', top: '-50%', opacity: 0.15, transform: [{ rotate: '30deg' }] },
    walletInfo: { flex: 1, zIndex: 10, justifyContent: 'center' },
    walletTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
    balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    balanceText: { color: '#FFF', fontSize: 32, fontWeight: '900' },
    chipIcon: { position: 'absolute', right: -10, top: -10 },
    tabsRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 15, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, padding: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
    tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    listPadding: { paddingHorizontal: 20, paddingBottom: 120 },
    cardContainer: { marginBottom: 20 },
    stealthHistoryCard: { backgroundColor: 'rgba(5,5,5,0.7)', borderRadius: 22, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', overflow: 'hidden' },
    sessionBadge: { position: 'absolute', top: 0, right: 18, paddingHorizontal: 10, paddingVertical: 4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 10 },
    sessionTypeText: { color: '#FFF', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, zIndex: 10 },
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
    loadingBox: { marginTop: 100, alignItems: 'center' },
    loadingText: { marginTop: 15, fontWeight: '900', letterSpacing: 2, fontSize: 10 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 40 },
    emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1 },
    emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 10, letterSpacing: 2 },
    emptySub: { color: '#475569', textAlign: 'center', lineHeight: 20, fontSize: 13, fontWeight: '600' },
    exploreBtn: { marginTop: 30, paddingHorizontal: 35, paddingVertical: 18, borderRadius: 15, elevation: 15 },
    exploreText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 2 }
});
