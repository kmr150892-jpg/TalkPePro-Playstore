import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, collectionGroup, doc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../../../firebaseConfig';

export default function ExpertPassbookDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    
    const [userData, setUserData] = useState<any>(null);
    const [historyLogs, setHistoryLogs] = useState<any[]>([]); 
    const [totalGiftsBeans, setTotalGiftsBeans] = useState<number>(0);
    const [totalEarningsCalculated, setTotalEarningsCalculated] = useState<number>(0);
    const [totalWithdrawnCalculated, setTotalWithdrawnCalculated] = useState<number>(0);
    
    // 🔥 SYSTEM LOGIC: OPERATIONAL BREAKDOWN FOR AUDIT 🔥
    const [breakdown, setBreakdown] = useState({
        calls: 0,
        liveGifts: 0,
        partyGifts: 0,
        callGifts: 0,
        liveGames: 0,
        partyGames: 0,
        totalDeepGifts: 0
    });

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'STATS' | 'HISTORY'>('STATS');

    useEffect(() => {
        if (!id) return;

        let currentUserData: any = null;
        let rawWithdrawals: any[] = [];
        let rawGifts: any[] = [];
        let rawCallEarnings: any[] = [];
        let rawDeepLogs: any[] = []; // 🔥 Injecting Operational Breakdown Logs into History

        // 🔥 MASTER CALCULATION: Merges Disbursements, Service Incomes & Reward Distributions
        const processAllExpertLogs = () => {
            if (!currentUserData) return;

            // 1. Filter Distributions (Consultant is Host or Receiver)
            const myReceivedGifts = rawGifts.filter(g => 
                g.receiverId === id || g.hostId === id
            );

            // 2. Merge Streams Including Traceability Logs
            const allLogs = [
                ...rawWithdrawals.map(w => ({ ...w, _source: 'ACTIVITY_REWARD' })),
                ...myReceivedGifts.map(g => ({ ...g, _source: 'gift' })),
                ...rawCallEarnings.map(c => ({ ...c, _source: 'call_earning' })),
                ...rawDeepLogs // 🔥 Breakdown Logs Injected Here
            ];

            // 3. Deduplicate to maintain ledger integrity
            const uniqueLogsMap = new Map();
            allLogs.forEach(log => {
                const key = log.id || `${log.type}_${log.timestamp?.seconds}`;
                if (!uniqueLogsMap.has(key)) {
                    uniqueLogsMap.set(key, log);
                }
            });
            const mergedLogs = Array.from(uniqueLogsMap.values());

            // 4. Client-side chronological sorting (Newest first)
            mergedLogs.sort((a, b) => {
                const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0));
                const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0));
                return timeB - timeA;
            });

            setHistoryLogs(mergedLogs);

            // 💰 Calculate Total Rewards (in Units)
            const giftBeans = myReceivedGifts.reduce((sum, g) => {
                const val = Number(g.beans) || Number(g.price) / 2 || Number(g.amount) / 2 || 0;
                return sum + val;
            }, 0);
            setTotalGiftsBeans(giftBeans);

            // 💸 Calculate Total Disbursed (INR)
            const withdrawn = rawWithdrawals.reduce((sum, w) => sum + (Number(w.amountRupee) || Number(w.amount) || 0), 0);
            setTotalWithdrawnCalculated(withdrawn);

            // 📈 Calculate Lifetime Yield (Sum of all positive allocations)
            const lifeEarnings = mergedLogs.reduce((sum, log) => {
                if (log._source === 'gift' || log._source === 'call_earning' || log._source === 'breakdown' || log._source === 'game') {
                    const val = Number(log.beans) || Number(log.expertEarning) || Number(log.expertEarnings) || (Number(log.price) || Number(log.amount)) / 2 || 0;
                    return sum + val;
                }
                return sum;
            }, 0);
            setTotalEarningsCalculated(lifeEarnings);
        };

        // 🔥 DEEP FETCH ENGINE FOR REWARD BREAKDOWN 🔥
        const fetchRevenueBreakdown = async () => {
            try {
                let rawData: any[] = [];
                const expertId = id as string;

                const callsSnap = await getDocs(query(collection(db, "calls"), where("expertId", "==", expertId)));
                for (const docSnap of callsSnap.docs) {
                    const d = docSnap.data();
                    rawData.push({ id: docSnap.id, type: 'video_call', expertEarnings: d.expertEarnings || 0, timestamp: d.endedAt || d.createdAt || { seconds: 0 } });
                }

                const transSnap = await getDocs(query(collection(db, "transactions"), where("expertId", "==", expertId)));
                for (const docSnap of transSnap.docs) {
                    const d = docSnap.data();
                    if (d.type === 'video_call') continue; 
                    let tType = 'call_gift';
                    if (d.source === 'Session') tType = 'party_gift';
                    if (d.source === 'live') tType = 'live_gift';
                    if (d.type?.includes('game') || d.source?.includes('game')) tType = 'live_game_bonus';

                    rawData.push({ id: docSnap.id, type: tType, beans: d.beans || Math.floor((d.diamonds || d.amount || 0) / 2), timestamp: d.timestamp || { seconds: 0 } });
                }

                const livesSnap = await getDocs(query(collection(db, "lives"), where("hostId", "==", expertId)));
                for (const liveDoc of livesSnap.docs) {
                    const liveData = liveDoc.data();
                    const isParty = liveData.isPartyRoom === true || liveData.status === "party_hidden";

                    if (liveData.gameBeansCollected && liveData.gameBeansCollected > 0) {
                        rawData.push({ id: `game_${liveDoc.id}`, type: isParty ? 'party_game_bonus' : 'live_game_bonus', beans: liveData.gameBeansCollected, timestamp: liveData.endedAt || liveData.startedAt || { seconds: Date.now() / 1000 } });
                    }

                    if (!isParty) {
                        const giftsSnap = await getDocs(collection(db, "lives", liveDoc.id, "gifts"));
                        for (const gDoc of giftsSnap.docs) {
                            const g = gDoc.data();
                            rawData.push({ id: gDoc.id, type: 'live_gift', beans: g.beans || Math.floor((g.amount || g.price || 0) / 2), timestamp: g.timestamp || liveData.startedAt || { seconds: 1 } });
                        }
                    }
                }

                const partySnap = await getDocs(query(collection(db, "party_rooms"), where("hostId", "==", expertId)));
                for (const partyDoc of partySnap.docs) {
                    const pData = partyDoc.data();
                    const giftsSnap = await getDocs(collection(db, "party_rooms", partyDoc.id, "gifts"));
                    for (const gDoc of giftsSnap.docs) {
                        const g = gDoc.data();
                        rawData.push({ id: gDoc.id, type: 'party_gift', beans: g.beans || Math.floor((g.price || g.amount || 0) / 2), timestamp: g.timestamp || pData.createdAt || { seconds: 1 } });
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

                let calls = 0, liveGifts = 0, partyGifts = 0, callGifts = 0, liveGames = 0, partyGames = 0;
                uniqueData.forEach(t => {
                    if (t.type === 'video_call') calls += (t.expertEarnings || 0);
                    else if (t.type === 'live_gift') liveGifts += (t.beans || 0);
                    else if (t.type === 'party_gift') partyGifts += (t.beans || 0);
                    else if (t.type === 'call_gift') callGifts += (t.beans || 0);
                    else if (t.type === 'live_game_bonus') liveGames += (t.beans || 0);
                    else if (t.type === 'party_game_bonus') partyGames += (t.beans || 0);
                });

                setBreakdown({
                    calls, liveGifts, partyGifts, callGifts, liveGames, partyGames,
                    totalDeepGifts: liveGifts + partyGifts + callGifts + liveGames + partyGames
                });

                // 🔥 MAP OPERATIONAL LOGS FOR HISTORY 🔥
                rawDeepLogs = uniqueData.map(t => {
                    let titleText = "System Action";
                    let source = "breakdown";
                    if (t.type === 'video_call') titleText = "Session Earning";
                    else if (t.type === 'live_gift') { titleText = "Live Interaction Reward"; source = "gift"; }
                    else if (t.type === 'party_gift') { titleText = "Group Interaction Reward"; source = "gift"; }
                    else if (t.type === 'call_gift') { titleText = "Direct Reward"; source = "gift"; }
                    else if (t.type === 'live_game_bonus') { titleText = "Interactive Bonus"; source = "game"; }
                    else if (t.type === 'party_game_bonus') { titleText = "Activity Bonus"; source = "game"; }

                    return {
                        ...t,
                        id: t.id,
                        _source: source,
                        title: titleText,
                        status: 'SUCCESS',
                        beans: t.beans || t.expertEarnings || 0,
                        timestamp: t.timestamp
                    };
                });

                processAllExpertLogs();

            } catch (error) { console.error("Traceability fetch error:", error); }
        };

        // Fetch Consultant Profile
        const unsubUser = onSnapshot(doc(db, 'users', id as string), (docSnap) => {
            if (docSnap.exists()) {
                currentUserData = { id: docSnap.id, ...(docSnap.data() as any) };
                setUserData(currentUserData);
                processAllExpertLogs();
                fetchRevenueBreakdown(); 
            }
            setLoading(false);
        });

        // Fetch Disbursement History
        const qWithdrawals = query(collection(db, 'withdrawals'), where('userId', '==', id));
        const unsubWithdrawals = onSnapshot(qWithdrawals, (snap) => {
            rawWithdrawals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            processAllExpertLogs();
        });

        // Fetch Received Distributions (CollectionGroup)
        const qGifts = query(collectionGroup(db, 'gifts'));
        const unsubGifts = onSnapshot(qGifts, (snap) => {
            rawGifts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            processAllExpertLogs();
        });

        // Fetch Session Statistics
        const qCalls = query(collection(db, 'transactions'), where('expertId', '==', id));
        const unsubCalls = onSnapshot(qCalls, (snap) => {
            rawCallEarnings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            processAllExpertLogs();
        });

        return () => { unsubUser(); unsubWithdrawals(); unsubGifts(); unsubCalls(); };
    }, [id]);

    if (loading) return (
        <View style={styles.loader}>
            <ActivityIndicator size="large" color="#E11D48" />
            <Text style={[styles.loaderText, { color: '#E11D48' }]}>Synchronizing Ledger...</Text>
        </View>
    );

    if (!userData) return <View style={styles.loader}><Text style={{color: '#FFF'}}>Profile not found.</Text></View>;

    const renderHistoryItem = ({ item }: { item: any }) => {
        let iconName = "swap-horizontal";
        let iconColor = "#94A3B8";
        let sign = "+";
        let amountText = "";
        let isEarnings = true;
        let titleText = item.title || item.giftName || item.type || 'Activity';

        if (item._source === 'ACTIVITY_REWARD') {
            iconName = "bank-transfer-out"; iconColor = "#F43F5E"; sign = "-"; isEarnings = false;
            amountText = `₹${item.amountRupee || item.amount || 0}`;
            titleText = "Settlement Disbursed";
        } else if (item._source === 'gift') {
            iconName = "gift"; iconColor = "#A855F7";
            const b = item.beans || (Number(item.price) || Number(item.amount)) / 2 || 0;
            amountText = `${b} Units`;
            titleText = item.title || `${item.icon || ''} ${item.giftName || 'Reward Allocated'}`;
        } else if (item._source === 'game') {
            iconName = "dice-multiple"; iconColor = "#F59E0B";
            amountText = `${item.beans || 0} Units`;
            titleText = item.title || "Interactive Bonus";
        } else {
            iconName = "video-vintage"; iconColor = "#10B981";
            amountText = `${item.beans || item.expertEarning || item.expertEarnings || 0} Units`;
            titleText = item.title || "Session Yield";
        }

        const timeVal = item.timestamp || item.createdAt;
        let displayTime = 'Synced';
        if (timeVal) {
            let dateObj;
            if (timeVal.toDate) dateObj = timeVal.toDate();
            else if (timeVal.seconds) dateObj = new Date(timeVal.seconds * 1000);
            else dateObj = new Date(timeVal);
            
            displayTime = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }

        return (
            <View style={styles.historyCard}>
                <View style={[styles.historyIconBox, !isEarnings && { backgroundColor: 'rgba(244, 63, 94, 0.1)' }]}>
                    <MaterialCommunityIcons name={iconName as any} size={20} color={iconColor} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.historyTitle} numberOfLines={1}>{titleText}</Text>
                    <Text style={styles.historyDate}>{displayTime}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.historyAmount, { color: isEarnings ? '#10B981' : '#F43F5E' }]}>
                        {sign} {amountText}
                    </Text>
                    <Text style={[styles.historyStatus, { color: '#64748B' }]}>
                        {item.status || 'VERIFIED'}
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Operational Ledger</Text>
                    <Text style={styles.headerSub}>Enterprise Level Audit Clearance</Text>
                </View>
                <MaterialCommunityIcons name="shield-star" size={24} color="#FB7185" style={{marginLeft: 'auto'}} />
            </View>

            <FlatList 
                data={activeTab === 'HISTORY' ? historyLogs : []}
                keyExtractor={(item, index) => item.id || `log_${index}`}
                renderItem={renderHistoryItem}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 50 }}
                ListHeaderComponent={
                    <View style={{ paddingHorizontal: 20 }}>
                        
                        <LinearGradient 
                            colors={['#0F172A', '#31102A', '#000000']} 
                            start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                            style={styles.passbookCard}
                        >
                            <View style={styles.cardTop}>
                                <View style={styles.cardHeaderLeft}>
                                    <MaterialCommunityIcons name="check-decagram" size={18} color="#10B981" />
                                    <Text style={styles.cardType}>VERIFIED CONSULTANT</Text>
                                </View>
                                <MaterialCommunityIcons name="integrated-circuit-chip" size={32} color="#D4D4D8" />
                            </View>

                            <View style={styles.profileSection}>
                                <View style={styles.avatarBox}>
                                    {userData.profilePic || userData.photoURL ? (
                                        <Image source={{ uri: userData.profilePic || userData.photoURL }} style={styles.avatar} />
                                    ) : (
                                        <Text style={styles.avatarText}>{userData.name?.[0] || 'C'}</Text>
                                    )}
                                </View>
                                <View style={{marginLeft: 15, flex: 1}}>
                                    <Text style={styles.userName} numberOfLines={1}>{userData.name || 'Authorized User'}</Text>
                                    <Text style={styles.userPhone} numberOfLines={1}>{userData.phone || userData.email || 'Encrypted Channel'}</Text>
                                </View>
                            </View>

                            <View style={styles.cardBottom}>
                                <View style={{flex: 1.2}}>
                                    <Text style={styles.uidLabel}>SYSTEM REF ID</Text>
                                    <Text style={styles.uidValueLarge} numberOfLines={1} selectable={true}>{String(userData.id).toUpperCase()}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end', flex: 0.8 }}>
                                    <Text style={styles.joinedLabel}>AUTHORIZED ON</Text>
                                    <Text style={styles.joinedValue}>
                                        {userData.verifiedAt ? new Date(userData.verifiedAt.toDate ? userData.verifiedAt.toDate() : userData.verifiedAt).toLocaleDateString() : 'N/A'}
                                    </Text>
                                </View>
                            </View>
                        </LinearGradient>

                        <View style={styles.tabsRow}>
                            <TouchableOpacity 
                                style={[styles.tabBtn, activeTab === 'STATS' && styles.tabBtnActive]}
                                onPress={() => setActiveTab('STATS')}
                            >
                                <Text style={[styles.tabText, activeTab === 'STATS' && styles.tabTextActive]}>ANALYTICS</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={[styles.tabBtn, activeTab === 'HISTORY' && styles.tabBtnActive]}
                                onPress={() => setActiveTab('HISTORY')}
                            >
                                <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.tabTextActive]}>LEDGER HISTORY</Text>
                            </TouchableOpacity>
                        </View>

                        {activeTab === 'STATS' && (
                            <View>
                                <View style={[styles.balanceCard, { backgroundColor: 'rgba(168, 85, 247, 0.1)', borderColor: 'rgba(168, 85, 247, 0.3)' }]}>
                                    <Text style={styles.balLabel}>CURRENT ALLOCATED UNITS</Text>
                                    <Text style={[styles.balValue, { color: '#A855F7' }]}>{userData.walletBalance || 0} 💎</Text>
                                </View>

                                <View style={styles.statsContainer}>
                                    <StatBox icon="sack-percent" label="LIFETIME YIELD" value={`${userData.totalBeansEarned || 0} 💎`} color="#A855F7" bgColor="rgba(168, 85, 247, 0.1)" />
                                    <StatBox icon="bank-transfer-out" label="TOTAL DISBURSED" value={`₹ ${userData.totalWithdrawnRs || 0}`} color="#F43F5E" bgColor="rgba(244, 63, 94, 0.1)" />
                                    <StatBox icon="gift" label="REWARDS RECEIVED" value={`${Math.floor((userData.totalDiamondsReceived || 0) / 2)} 💎`} color="#FB7185" bgColor="rgba(251, 113, 133, 0.1)" />
                                    <StatBox icon="video-vintage" label="SESSIONS ATTENDED" value={`${userData.totalCalls || 0}`} color="#10B981" bgColor="rgba(16, 185, 129, 0.1)" />
                                    <StatBox icon="clock-outline" label="CONSULTING MINS" value={`${Math.floor(userData.totalMinutes || 0)}`} color="#F59E0B" bgColor="rgba(245, 158, 11, 0.1)" />
                                    <StatBox icon="medal" label="TIER LEVEL" value={userData.levelTitle || "TIER 0"} color="#06B6D4" bgColor="rgba(6, 182, 212, 0.1)" />
                                </View>

                                <Text style={styles.subHeading}>DISTRIBUTION MATRIX</Text>
                                <View style={styles.matrixGrid}>
                                    <View style={styles.matrixRow}>
                                        <MatrixBox icon="videocam" label="Session Yield" value={`₿${breakdown.calls.toLocaleString()}`} color="#A855F7" />
                                        <MatrixBox icon="gift" label="Interaction Rewards" value={`₿${breakdown.callGifts.toLocaleString()}`} color="#A855F7" />
                                    </View>
                                    <View style={styles.matrixRow}>
                                        <MatrixBox icon="broadcast" iconFamily="MaterialCommunityIcons" label="Live Rewards" value={`₿${breakdown.liveGifts.toLocaleString()}`} color="#FB7185" />
                                        <MatrixBox icon="party-popper" iconFamily="MaterialCommunityIcons" label="Group Rewards" value={`₿${breakdown.partyGifts.toLocaleString()}`} color="#FB7185" />
                                    </View>
                                    <View style={styles.matrixRow}>
                                        <MatrixBox icon="dice-multiple" iconFamily="MaterialCommunityIcons" label="Interactive Bonus" value={`₿${breakdown.liveGames.toLocaleString()}`} color="#F59E0B" />
                                        <MatrixBox icon="dice-multiple" iconFamily="MaterialCommunityIcons" label="Engagement Bonus" value={`₿${breakdown.partyGames.toLocaleString()}`} color="#EC4899" />
                                    </View>
                                </View>
                            </View>
                        )}
                        
                        {activeTab === 'HISTORY' && historyLogs.length === 0 && (
                            <View style={styles.emptyBox}>
                                <MaterialCommunityIcons name="file-document-outline" size={48} color="#334155" />
                                <Text style={styles.emptyText}>No recent financial records found.</Text>
                            </View>
                        )}
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const StatBox = ({ icon, label, value, color, bgColor }: any) => (
    <View style={[styles.statBox, { borderColor: color, backgroundColor: bgColor }]}>
        <View style={[styles.iconCircle, { backgroundColor: color + '30' }]}>
            <MaterialCommunityIcons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.statBoxValue} numberOfLines={1}>{value}</Text>
        <Text style={styles.statBoxLabel}>{label}</Text>
    </View>
);

const MatrixBox = ({ icon, label, value, color, iconFamily = "Ionicons" }: any) => (
    <View style={styles.matrixCardWrapper}>
        <View style={styles.matrixCard}>
            <View style={[styles.matrixIconCircle, { backgroundColor: color + '15' }]}>
                {iconFamily === 'Ionicons' ? (
                    <Ionicons name={icon} size={22} color={color} />
                ) : (
                    <MaterialCommunityIcons name={icon} size={22} color={color} />
                )}
            </View>
            <View style={{alignItems: 'center', width: '100%', paddingHorizontal: 5}}>
                <Text style={styles.matrixValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
                <Text style={styles.matrixLabel} numberOfLines={1}>{label}</Text>
            </View>
            <View style={[styles.bottomGlowLine, { backgroundColor: color }]} />
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    loaderText: { marginTop: 12, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, gap: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
    headerSub: { color: '#FB7185', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
    passbookCard: { borderRadius: 24, padding: 25, marginTop: 15, borderWidth: 1, borderColor: '#FB7185', elevation: 20, shadowColor: '#FB7185', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, marginBottom: 25 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    cardType: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    profileSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
    avatarBox: { width: 60, height: 60, borderRadius: 18, backgroundColor: 'rgba(251, 113, 133, 0.1)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(251, 113, 133, 0.3)' },
    avatar: { width: '100%', height: '100%' },
    avatarText: { color: '#FB7185', fontSize: 24, fontWeight: '900' },
    userName: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
    userPhone: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    uidLabel: { color: '#64748B', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
    uidValueLarge: { color: '#FB7185', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
    joinedLabel: { color: '#64748B', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
    joinedValue: { color: '#FFF', fontSize: 13, fontWeight: '800' },
    tabsRow: { flexDirection: 'row', backgroundColor: '#0F172A', padding: 5, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B', justifyContent: 'space-between' },
    tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
    tabBtnActive: { backgroundColor: '#334155' },
    tabText: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    tabTextActive: { color: '#FFF' },
    balanceCard: { padding: 18, borderRadius: 20, borderWidth: 1, marginBottom: 15, alignItems: 'center' },
    balLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 8 },
    balValue: { fontSize: 28, fontWeight: '900' },
    statsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    statBox: { width: '48%', padding: 20, borderRadius: 20, borderWidth: 1, alignItems: 'center' },
    iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    statBoxValue: { color: '#FFF', fontSize: 15, fontWeight: '900', marginBottom: 4 },
    statBoxLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    
    // NEW MATRIX STYLES
    subHeading: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 15, marginTop: 25, textTransform: 'uppercase' },
    matrixGrid: { gap: 12 },
    matrixRow: { flexDirection: 'row', gap: 12 },
    matrixCardWrapper: { flex: 1, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(15, 23, 42, 0.5)' },
    matrixCard: { padding: 15, alignItems: 'center', width: '100%' },
    matrixIconCircle: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    matrixValue: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
    matrixLabel: { color: '#64748B', fontSize: 9, fontWeight: '800', marginTop: 4, textAlign: 'center' },
    bottomGlowLine: { position: 'absolute', bottom: 0, width: '40%', height: 3, borderRadius: 2 },

    historyCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0F172A', padding: 15, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: '#1E293B', marginHorizontal: 20 },
    historyIconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    historyTitle: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginBottom: 4 },
    historyDate: { color: '#64748B', fontSize: 10, fontWeight: '600' },
    historyAmount: { fontSize: 14, fontWeight: '900', marginBottom: 4 },
    historyStatus: { fontSize: 9, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
    emptyBox: { alignItems: 'center', marginTop: 40, opacity: 0.7 },
    emptyText: { color: '#64748B', marginTop: 10, fontSize: 12, fontWeight: '700' }
});