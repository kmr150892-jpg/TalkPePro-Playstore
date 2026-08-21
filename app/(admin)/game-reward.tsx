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
        memoryProfit: 0, // 🔥 Updated for memory_match
        reflexProfit: 0  // 🔥 Updated for reflex_arena
    });

    useEffect(() => {
        let unsub: any = null;

        const fetchData = async () => {
            try {
                const q = query(collectionGroup(db, 'games'), orderBy('createdAt', 'desc'));

                unsub = onSnapshot(q, (snap) => {
                    let tPool = 0;
                    let tAdmin = 0;
                    let tExpert = 0;
                    let tMemoryProfit = 0;
                    let tReflexProfit = 0;

                    const fetchedGames: any[] = [];

                    snap.docs.forEach((docSnap) => {
                        const data = docSnap.data();
                        
                        // 🔥 FETCHING EXACT NAMES FROM DB AS REQUESTED 🔥
                        const totalPool = Number(data.totalPool) || 0;
                        const expertBeans = Number(data.expertBeans) || 0;
                        const adminProfit = Number(data.adminCommission) || 0; 
                        
                        if (totalPool > 0 || adminProfit > 0 || expertBeans > 0) {
                            
                            // Calculating Expert Diamonds (1 Bean = 2 Diamonds)
                            let expertDiamonds = expertBeans * 2; 

                            // User winning grants calculation
                            let winnerACTIVITY_REWARD = totalPool - adminProfit - expertDiamonds;
                            if (winnerACTIVITY_REWARD < 0) winnerACTIVITY_REWARD = 0;

                            tPool += totalPool;
                            tAdmin += adminProfit;
                            tExpert += expertBeans;

                            // 🔥 CHECKING GAME TYPE 🔥
                            const gameIdStr = String(data.gameName || data.gameId || data.type || docSnap.id).toLowerCase();
                            const isMemory = gameIdStr.includes('memory_match') || gameIdStr.includes('memory');

                            if (isMemory) {
                                tMemoryProfit += adminProfit;
                            } else {
                                // Assuming anything else is reflex_arena
                                tReflexProfit += adminProfit;
                            }

                            // 🔥 SATTI FIX: Guaranteed Unique Key Generation 🔥
                            const uniqueKey = docSnap.id + "_" + (data.createdAt?.seconds || Date.now());

                            fetchedGames.push({
                                uniqueKey: uniqueKey,
                                id: docSnap.id, 
                                totalPool,
                                winnerACTIVITY_REWARD,
                                expertBeans,
                                expertDiamonds,
                                adminProfit,
                                gameTypeResolved: isMemory ? 'MEMORY MATCH' : 'REFLEX ARENA',
                                ...data
                            });
                        }
                    });

                    setGameLogs(fetchedGames);
                    setStats({
                        totalPool: tPool,
                        totalAdminProfit: tAdmin,
                        totalExpertBeans: tExpert,
                        memoryProfit: tMemoryProfit,
                        reflexProfit: tReflexProfit
                    });
                    
                    // Stop loading once data is mapped
                    setLoading(false);
                }, (error) => {
                    console.log("Snapshot Error:", error);
                    setLoading(false);
                });
            } catch (err) {
                console.log("Initialization Error:", err);
                setLoading(false);
            }
        };

        fetchData();

        return () => {
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
        const isMemory = item.gameTypeResolved === 'MEMORY MATCH';
        
        const isProfit = item.adminProfit >= 0;
        const profitColor = isProfit ? '#10B981' : '#EF4444';
        const profitGradient = isProfit ? ['rgba(16, 185, 129, 0.1)', 'rgba(16, 185, 129, 0.05)'] as const : ['rgba(239, 68, 68, 0.15)', 'rgba(239, 68, 68, 0.05)'] as const;

        return (
            <View style={styles.logCard}>
                <View style={styles.logHeader}>
                    <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={styles.roomTypeBadge}>
                            <Ionicons name={isParty ? "headset" : "videocam"} size={12} color="#FFF" />
                            <Text style={styles.roomTypeText}>{isParty ? "Session" : "LIVE"}</Text>
                        </View>
                        <View style={[styles.roomTypeBadge, { backgroundColor: isMemory ? '#8B5CF6' : '#EF4444' }]}>
                            <Ionicons name={isMemory ? "extension-puzzle" : "game-controller"} size={12} color="#FFF" />
                            <Text style={styles.roomTypeText}>{item.gameTypeResolved}</Text>
                        </View>
                    </View>
                    <Text style={styles.timestampText}>{formatTime(item.createdAt)}</Text>
                </View>

                <View style={styles.resultRow}>
                    <Text style={styles.winnerLabel}>Game Mode: <Text style={{ color: '#3B82F6', fontWeight: '900' }}>{item.gameTypeResolved}</Text></Text>
                    <Text style={styles.hostIdText} numberOfLines={1}>Log ID: <Text style={{color: '#FFF'}}>{item.id.slice(-6).toUpperCase()}</Text></Text>
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>TOTAL DIAMONDS</Text>
                        <Text style={[styles.statValue, { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                            {item.totalPool} 💎
                        </Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>USER REWARDS</Text>
                        <Text style={[styles.statValue, { color: '#FBBF24' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                            -{Math.floor(item.winnerACTIVITY_REWARD)} 💎
                        </Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>HOST BONUS</Text>
                        <Text style={[styles.statValue, { color: '#A855F7' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                            -{item.expertDiamonds} 💎
                        </Text>
                    </View>
                </View>

                <LinearGradient 
                    colors={profitGradient} 
                    style={[styles.adminProfitBanner, { borderColor: isProfit ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)' }]}
                >
                    <Text style={[styles.adminProfitLabel, { color: profitColor }]}>NET PLATFORM SHARE</Text>
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
                    <Text style={styles.headerSub}>Real-time Platform Share Analysis</Text>
                </View>
            </View>

            <View style={styles.overviewContainer}>
                {/* 🔥 GLOBAL OVERALL Earnings CARD (WITH INR & AUTO-SHRINK) 🔥 */}
                <LinearGradient colors={stats.totalAdminProfit >= 0 ? ['#064E3B', '#022C22'] : ['#450a0a', '#290606']} style={[styles.mainProfitCard, { borderColor: overallProfitColor }]}>
                    <MaterialCommunityIcons name="finance" size={32} color={overallProfitColor} style={{ position: 'absolute', top: 15, right: 20, opacity: 0.2 }} />
                    <Text style={[styles.mainProfitLabel, { color: stats.totalAdminProfit >= 0 ? '#A7F3D0' : '#FECACA' }]}>GLOBAL PLATFORM SHARE</Text>
                    
                    <View style={styles.profitSplitRow}>
                        <View style={styles.profitBlock}>
                            <Text style={[styles.profitSubLabel, { color: overallProfitColor, opacity: 0.7 }]}>VIRTUAL UNITS (💎)</Text>
                            <Text style={[styles.mainProfitValue, { color: overallProfitColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
                                {stats.totalAdminProfit > 0 ? '+' : ''}{Math.floor(stats.totalAdminProfit).toLocaleString()}
                            </Text>
                        </View>
                        <View style={styles.vDivider} />
                        <View style={styles.profitBlock}>
                            <Text style={[styles.profitSubLabel, { color: overallProfitColor, opacity: 0.7 }]}>ESTIMATED VALUE (INR)</Text>
                            <Text style={[styles.mainProfitValue, { color: overallProfitColor }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
                                {totalProfitINR > 0 ? '+' : ''}₹{totalProfitINR.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                {/* 🔥 INDIVIDUAL ANALYTICS BREAKDOWN 🔥 */}
                <View style={styles.subStatsRow}>
                    <View style={[styles.subStatCard, { 
                        borderColor: stats.memoryProfit >= 0 ? 'rgba(139, 92, 246, 0.3)' : 'rgba(239, 68, 68, 0.3)', 
                        backgroundColor: stats.memoryProfit >= 0 ? 'rgba(139, 92, 246, 0.05)' : 'rgba(239, 68, 68, 0.05)' 
                    }]}>
                        <Ionicons name="extension-puzzle" size={18} color={stats.memoryProfit >= 0 ? '#8B5CF6' : '#EF4444'} style={{marginBottom: 6}}/>
                        <Text style={styles.subStatLabel}>MEMORY SHARE</Text>
                        <Text style={[styles.subStatValue, { color: stats.memoryProfit >= 0 ? '#8B5CF6' : '#EF4444' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                            {stats.memoryProfit > 0 ? '+' : ''}{Math.floor(stats.memoryProfit).toLocaleString()} 💎
                        </Text>
                    </View>

                    <View style={[styles.subStatCard, { 
                        borderColor: stats.reflexProfit >= 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.3)', 
                        backgroundColor: stats.reflexProfit >= 0 ? 'rgba(239, 68, 68, 0.05)' : 'rgba(239, 68, 68, 0.05)' 
                    }]}>
                        <Ionicons name="game-controller" size={18} color={stats.reflexProfit >= 0 ? '#EF4444' : '#EF4444'} style={{marginBottom: 6}}/>
                        <Text style={styles.subStatLabel}>REFLEX SHARE</Text>
                        <Text style={[styles.subStatValue, { color: stats.reflexProfit >= 0 ? '#EF4444' : '#EF4444' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                            {stats.reflexProfit > 0 ? '+' : ''}{Math.floor(stats.reflexProfit).toLocaleString()} 💎
                        </Text>
                    </View>
                </View>

                {/* OVERALL TASK ANALYTICS */}
                <View style={[styles.subStatsRow, { marginTop: 15 }]}>
                    <View style={[styles.subStatCard, { borderColor: 'rgba(59, 130, 246, 0.3)' }]}>
                        <Text style={styles.subStatLabel}>TOTAL VIRTUAL ASSETS</Text>
                        <Text style={[styles.subStatValue, { color: '#3B82F6' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                            {stats.totalPool.toLocaleString()} 💎
                        </Text>
                    </View>
                    <View style={[styles.subStatCard, { borderColor: 'rgba(168, 85, 247, 0.3)' }]}>
                        <Text style={styles.subStatLabel}>EXPERT REWARDS</Text>
                        <Text style={[styles.subStatValue, { color: '#A855F7' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                            {stats.totalExpertBeans.toLocaleString()} 🎖️
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
                keyExtractor={(item) => item.uniqueKey}
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