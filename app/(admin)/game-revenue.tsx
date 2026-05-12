import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collectionGroup, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

export default function AdminGameRevenue() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [gameLogs, setGameLogs] = useState<any[]>([]);
    
    const [stats, setStats] = useState({
        totalPool: 0,
        totalAdminProfit: 0,
        totalExpertBeans: 0,
        racingProfit: 0,
        clashProfit: 0
    });

    useEffect(() => {
        let unsub: any = null;
        let timeoutId: ReturnType<typeof setTimeout>;

        // 🔥 ANTI-FREEZE LOGIC. Delay fetching so page opens instantly! 🔥
        const startFetching = setTimeout(() => {
            const q = query(collectionGroup(db, 'gameHistory'), orderBy('timestamp', 'desc'));

            unsub = onSnapshot(q, async (snap) => {
                // Debounce rapid updates to prevent UI stuttering
                clearTimeout(timeoutId);
                timeoutId = setTimeout(async () => {
                    let tPool = 0;
                    let tAdmin = 0;
                    let tExpert = 0;
                    let tRacingProfit = 0;
                    let tClashProfit = 0;

                    const fetchedGames: any[] = [];

                    try {
                        for (const docSnap of snap.docs) {
                            const data = docSnap.data();
                            
                            const bigBet = Number(data.totalBigBet) || 0;
                            const smallBet = Number(data.totalSmallBet) || 0;
                            const blueBet = Number(data.totalBlueBet) || 0;
                            const redBet = Number(data.totalRedBet) || 0;
                            const greenBet = Number(data.totalGreenBet) || 0;
                            
                            const totalPool = bigBet + smallBet + blueBet + redBet + greenBet;

                            if (totalPool > 0 && data.resultType) {
                                
                                let winnerPayout = 0;
                                if (data.resultType === 'SMALL') winnerPayout = smallBet * 1.9;
                                else if (data.resultType === 'BIG') winnerPayout = bigBet * 1.9;
                                else if (data.resultType === 'BLUE') winnerPayout = blueBet * 1.9;
                                else if (data.resultType === 'RED') winnerPayout = redBet * 1.9;
                                else if (data.resultType === 'GREEN') winnerPayout = greenBet * 9; 

                                let expertBeans = Number(data.gameBeansCollected) || Number(data.expertBeansPaid) || 0;
                                let expertDiamonds = expertBeans * 2; 

                                if (expertDiamonds === 0 && totalPool > 0) {
                                    expertDiamonds = Math.floor(totalPool * 0.05);
                                    expertBeans = expertDiamonds / 2; 
                                }

                                const adminProfit = totalPool - winnerPayout - expertDiamonds;

                                tPool += totalPool;
                                tAdmin += adminProfit;
                                tExpert += expertBeans;

                                const isRacing = data.resultType === 'BLUE' || data.resultType === 'RED' || data.resultType === 'GREEN';

                                if (isRacing) {
                                    tRacingProfit += adminProfit;
                                } else {
                                    tClashProfit += adminProfit;
                                }

                                fetchedGames.push({
                                    id: docSnap.id,
                                    totalPool,
                                    winnerPayout,
                                    expertBeans,
                                    expertDiamonds,
                                    adminProfit,
                                    gameTypeResolved: isRacing ? 'RACING' : 'CLASH',
                                    ...data
                                });
                            }
                        }
                    } catch (err) {
                        console.log("Global fetch loop error:", err);
                    }

                    setGameLogs(fetchedGames);
                    setStats({
                        totalPool: tPool,
                        totalAdminProfit: tAdmin,
                        totalExpertBeans: tExpert,
                        racingProfit: tRacingProfit,
                        clashProfit: tClashProfit
                    });
                    setLoading(false);
                }, 150); 
            });
        }, 300); 

        return () => {
            clearTimeout(startFetching);
            clearTimeout(timeoutId);
            if (unsub) unsub();
        };
    }, []);

    const formatTime = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' });
    };

    const renderGameCard = ({ item }: { item: any }) => {
        const isParty = item.isPartyRoom;
        const isRacing = item.gameTypeResolved === 'RACING';
        
        const resColor = (item.resultType === 'SMALL' || item.resultType === 'BLUE') ? '#3B82F6' : 
                         (item.resultType === 'BIG' || item.resultType === 'RED') ? '#EF4444' : '#10B981';

        const isProfit = item.adminProfit >= 0;
        const profitColor = isProfit ? '#10B981' : '#EF4444';
        const profitGradient = isProfit ? ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)'] as const : ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)'] as const;

        return (
            <View style={styles.logCard}>
                <View style={styles.logHeader}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={styles.roomTypeBadge}>
                            <Ionicons name={isParty ? "headset" : "videocam"} size={12} color="#FFF" />
                            <Text style={styles.roomTypeText}>{isParty ? "PARTY" : "LIVE"}</Text>
                        </View>
                        <View style={[styles.roomTypeBadge, { backgroundColor: isRacing ? '#EF4444' : '#8B5CF6' }]}>
                            <Ionicons name={isRacing ? "car-sport" : "dice"} size={12} color="#FFF" />
                            <Text style={styles.roomTypeText}>{isRacing ? "RACING" : "CLASH"}</Text>
                        </View>
                    </View>
                    <Text style={styles.timestampText}>{formatTime(item.timestamp)}</Text>
                </View>

                <View style={styles.resultRow}>
                    <Text style={styles.winnerLabel}>Outflow Code: <Text style={{ color: resColor, fontWeight: '900' }}>{item.resultType}</Text></Text>
                    <Text style={styles.hostIdText} numberOfLines={1}>Session ID: <Text style={{color: '#FFF'}}>{item.roundId}</Text></Text>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>ALLOCATED</Text>
                        <Text style={[styles.statValue, { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                            {item.totalPool} 💎
                        </Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>USER GRANTS</Text>
                        <Text style={[styles.statValue, { color: '#FBBF24' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                            -{Math.floor(item.winnerPayout)} 💎
                        </Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>COMMISSION</Text>
                        <Text style={[styles.statValue, { color: '#A855F7' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                            -{item.expertDiamonds} 💎
                        </Text>
                    </View>
                </View>

                <LinearGradient 
                    colors={profitGradient} 
                    style={[styles.adminProfitBanner, { borderColor: isProfit ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)' }]}
                >
                    <Text style={[styles.adminProfitLabel, { color: profitColor }]}>NET SYSTEM MARGIN</Text>
                    <View style={{ flex: 1, alignItems: 'flex-end', paddingLeft: 10 }}>
                        <Text style={[styles.adminProfitValue, { color: profitColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                            {isProfit ? '+' : ''}{Math.floor(item.adminProfit)} 💎
                        </Text>
                    </View>
                </LinearGradient>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={styles.loaderText}>Auditing System Statistics...</Text>
            </View>
        );
    }

    const overallProfitColor = stats.totalAdminProfit >= 0 ? '#10B981' : '#EF4444';
    const totalProfitINR = stats.totalAdminProfit * 0.01;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Interaction Analytics</Text>
                    <Text style={styles.headerSub}>Real-time Operational Margin Analysis</Text>
                </View>
            </View>

            <View style={styles.overviewContainer}>
                {/* 🔥 GLOBAL OVERALL PROFIT CARD (WITH INR & AUTO-SHRINK) 🔥 */}
                <LinearGradient colors={stats.totalAdminProfit >= 0 ? ['#064E3B', '#022C22'] : ['#450a0a', '#290606']} style={[styles.mainProfitCard, { borderColor: overallProfitColor }]}>
                    <MaterialCommunityIcons name="finance" size={32} color={overallProfitColor} style={{ position: 'absolute', top: 15, right: 20, opacity: 0.2 }} />
                    <Text style={[styles.mainProfitLabel, { color: stats.totalAdminProfit >= 0 ? '#A7F3D0' : '#FECACA' }]}>GLOBAL OPERATIONAL MARGIN</Text>
                    
                    <View style={styles.profitSplitRow}>
                        <View style={styles.profitBlock}>
                            <Text style={[styles.profitSubLabel, { color: overallProfitColor, opacity: 0.7 }]}>UNITS (💎)</Text>
                            <Text style={[styles.mainProfitValue, { color: overallProfitColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
                                {stats.totalAdminProfit > 0 ? '+' : ''}{Math.floor(stats.totalAdminProfit).toLocaleString()}
                            </Text>
                        </View>
                        <View style={styles.vDivider} />
                        <View style={styles.profitBlock}>
                            <Text style={[styles.profitSubLabel, { color: overallProfitColor, opacity: 0.7 }]}>EQUIVALENT INR</Text>
                            <Text style={[styles.mainProfitValue, { color: overallProfitColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
                                {totalProfitINR > 0 ? '+' : ''}₹{totalProfitINR.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* 🔥 INDIVIDUAL ANALYTICS BREAKDOWN 🔥 */}
                <View style={styles.subStatsRow}>
                    <View style={[styles.subStatCard, { 
                        borderColor: stats.racingProfit >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)', 
                        backgroundColor: stats.racingProfit >= 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)' 
                    }]}>
                        <Ionicons name="analytics" size={18} color={stats.racingProfit >= 0 ? '#10B981' : '#EF4444'} style={{marginBottom: 6}}/>
                        <Text style={styles.subStatLabel}>TYPE-R MARGIN</Text>
                        <Text style={[styles.subStatValue, { color: stats.racingProfit >= 0 ? '#10B981' : '#EF4444' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                            {stats.racingProfit > 0 ? '+' : ''}{Math.floor(stats.racingProfit).toLocaleString()} 💎
                        </Text>
                    </View>

                    <View style={[styles.subStatCard, { 
                        borderColor: stats.clashProfit >= 0 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)', 
                        backgroundColor: stats.clashProfit >= 0 ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)' 
                    }]}>
                        <Ionicons name="bar-chart" size={18} color={stats.clashProfit >= 0 ? '#10B981' : '#EF4444'} style={{marginBottom: 6}}/>
                        <Text style={styles.subStatLabel}>TYPE-C MARGIN</Text>
                        <Text style={[styles.subStatValue, { color: stats.clashProfit >= 0 ? '#10B981' : '#EF4444' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                            {stats.clashProfit > 0 ? '+' : ''}{Math.floor(stats.clashProfit).toLocaleString()} 💎
                        </Text>
                    </View>
                </View>

                {/* OVERALL POOL ANALYTICS */}
                <View style={[styles.subStatsRow, { marginTop: 15 }]}>
                    <View style={[styles.subStatCard, { borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
                        <Text style={styles.subStatLabel}>TOTAL ASSET POOL</Text>
                        <Text style={[styles.subStatValue, { color: '#3B82F6' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                            {stats.totalPool.toLocaleString()} 💎
                        </Text>
                    </View>
                    <View style={[styles.subStatCard, { borderColor: 'rgba(168, 85, 247, 0.3)' }]}>
                        <Text style={styles.subStatLabel}>CONSULTANT YIELD</Text>
                        <Text style={[styles.subStatValue, { color: '#A855F7' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                            {stats.totalExpertBeans.toLocaleString()} 🌱
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>DETAILED ANALYTICS LOGS</Text>
                <Text style={styles.listCount}>{gameLogs.length} Records</Text>
            </View>

            <FlatList
                data={gameLogs}
                keyExtractor={(item) => item.id}
                renderItem={renderGameCard}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                ListEmptyComponent={
                    <View style={styles.emptyBox}>
                        <Ionicons name="document-text-outline" size={48} color="#334155" />
                        <Text style={styles.emptyText}>No transaction logs documented in current audit cycle.</Text>
                    </View>
                }
            />

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    loaderText: { color: '#10B981', marginTop: 10, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, gap: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { width: 40, height: 40, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
    headerSub: { color: '#94A3B8', fontSize: 11, fontWeight: '600' },
    overviewContainer: { padding: 20 },
    mainProfitCard: { padding: 20, borderRadius: 20, borderWidth: 1, marginBottom: 15, overflow: 'hidden' },
    mainProfitLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },
    profitSplitRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    profitBlock: { flex: 1, overflow: 'hidden' },
    profitSubLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
    mainProfitValue: { fontSize: 28, fontWeight: '900' },
    vDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 15 },
    subStatsRow: { flexDirection: 'row', gap: 15 },
    subStatCard: { flex: 1, padding: 15, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 15, borderWidth: 1, overflow: 'hidden' },
    subStatLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 0.5, marginBottom: 5 },
    subStatValue: { fontSize: 18, fontWeight: '900' },
    listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
    listTitle: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    listCount: { color: '#64748B', fontSize: 10, fontWeight: '700' },
    listContainer: { paddingHorizontal: 20, paddingBottom: 40 },
    logCard: { backgroundColor: 'rgba(15, 23, 42, 0.5)', borderRadius: 16, padding: 15, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    roomTypeBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#334155', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
    roomTypeText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    timestampText: { color: '#64748B', fontSize: 10, fontWeight: '600' },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    winnerLabel: { color: '#E2E8F0', fontSize: 12, fontWeight: '700' },
    hostIdText: { color: '#64748B', fontSize: 10, maxWidth: '50%' },
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(0,0,0,0.3)', padding: 12, borderRadius: 12, marginBottom: 12 },
    statBox: { flex: 1, alignItems: 'center', paddingHorizontal: 4, overflow: 'hidden' },
    statLabel: { color: '#64748B', fontSize: 9, fontWeight: '800', marginBottom: 4 },
    statValue: { fontSize: 14, fontWeight: '900' },
    adminProfitBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
    adminProfitLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    adminProfitValue: { fontSize: 16, fontWeight: '900' },
    emptyBox: { alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#64748B', marginTop: 10, fontSize: 12, fontWeight: '600' }
});