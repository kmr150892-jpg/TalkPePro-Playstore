import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    FlatList,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { db } from '../../../firebaseConfig';

/* ============================================================
   🃏 3D LOG CARD - flips in with perspective, glow edge by type,
   icon box pulses softly. All values are computed by renderItem
   exactly like before and only passed in here for animation.
   ============================================================ */
const LogCard = ({
    index,
    iconData,
    displayName,
    refId,
    dateString,
    isPositive,
    displayAmount,
    typeLabel,
}: {
    index: number;
    iconData: { name: string; color: string };
    displayName: string;
    refId: string;
    dateString: string;
    isPositive: boolean;
    displayAmount: number;
    typeLabel: string;
}) => {
    const enter = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(enter, {
            toValue: 1,
            friction: 7,
            tension: 45,
            delay: Math.min(index, 8) * 90,
            useNativeDriver: true,
        }).start();

        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        pulseLoop.start();
        return () => pulseLoop.stop();
    }, []);

    const accent = isPositive ? '#10B981' : '#EF4444';
    const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
    const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] });

    return (
        <Animated.View
            style={{
                opacity: enter,
                transform: [
                    { perspective: 1000 },
                    { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
                    { rotateX: enter.interpolate({ inputRange: [0, 1], outputRange: ['28deg', '0deg'] }) },
                    { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                ],
            }}
        >
            <View style={styles.logCard}>
                <LinearGradient
                    colors={[accent + '18', 'transparent', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                {/* colored edge bar */}
                <View style={[styles.edgeBar, { backgroundColor: accent }]} />

                <View style={styles.iconWrap}>
                    <Animated.View style={[styles.iconHalo, { backgroundColor: iconData.color, opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
                    <View style={[styles.iconBox, { backgroundColor: iconData.color + '15', borderWidth: 1, borderColor: iconData.color + '40' }]}>
                        <Feather name={iconData.name as any} size={18} color={iconData.color} />
                    </View>
                </View>
                
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.txTitle}>{displayName}</Text>
                    <Text style={styles.txId}>REF: {refId}...</Text>
                    <Text style={styles.txDate}>{dateString}</Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.txAmount, { color: accent, textShadowColor: accent + '66', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 8 }]}>
                        {isPositive ? '+ ₹' : '- ₹'}{displayAmount.toLocaleString('en-IN')}
                    </Text>
                    <View style={[styles.typePill, { borderColor: iconData.color + '40', backgroundColor: iconData.color + '12' }]}>
                        <Text style={[styles.txTypeLabel, { color: iconData.color }]}>{typeLabel}</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

export default function MasterLedger() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [filteredData, setFilteredData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // 🔥 Default active filter changed from 'ALL' to 'TODAY_RECHARGE'
    const [activeFilter, setActiveFilter] = useState('TODAY_RECHARGE');

    /* ---------- 🎞️ HEADER / BACKGROUND / SUMMARY ANIMATIONS ---------- */
    const orbA = useRef(new Animated.Value(0)).current;
    const orbB = useRef(new Animated.Value(0)).current;
    const headerIn = useRef(new Animated.Value(0)).current;
    const summaryIn = useRef(new Animated.Value(0)).current;
    const tilt = useRef(new Animated.Value(0)).current;
    const shine = useRef(new Animated.Value(0)).current;
    const radar = useRef(new Animated.Value(0)).current;
    const floatIcon = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(headerIn, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        Animated.spring(summaryIn, { toValue: 1, friction: 7, tension: 40, delay: 200, useNativeDriver: true }).start();

        const loopTiming = (val: Animated.Value, duration: number, delay = 0) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(val, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                    Animated.timing(val, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                ])
            );
        const l1 = loopTiming(orbA, 6000);
        const l2 = loopTiming(orbB, 7500, 700);
        const l3 = loopTiming(tilt, 3200);
        const l4 = loopTiming(floatIcon, 2200);
        const l5 = Animated.loop(Animated.timing(radar, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
        const l6 = Animated.loop(
            Animated.sequence([
                Animated.delay(2200),
                Animated.timing(shine, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        [l1, l2, l3, l4, l5, l6].forEach(l => l.start());
        return () => [l1, l2, l3, l4, l5, l6].forEach(l => l.stop());
    }, []);

    useEffect(() => {
        setLoading(true);
        // 🔥 LIVE MASTER LEDGER: Fetches Inflows and Activity Rewards 🔥
        const qTx = query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(500));
        
        // Removed orderBy here to prevent silent Firestore failures if the field name is different
        const qACTIVITY_REWARDs = query(collection(db, "withdrawals"), limit(300)); 
        
        let txList: any[] = [];
        let ACTIVITY_REWARDList: any[] = [];

        const updateList = () => {
            // Combine collections and sort them by time sequence via Javascript
            const combined = [...txList, ...ACTIVITY_REWARDList].sort((a, b) => {
                const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (new Date(a.timestamp).getTime() || 0);
                const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (new Date(b.timestamp).getTime() || 0);
                return timeB - timeA;
            });
            setTransactions(combined);
            setLoading(false);
        };

        const unsubTx = onSnapshot(qTx, (snap) => {
            // Remove potential duplicates by secure ID
            const uniqueTxs = new Map();
            snap.docs.forEach(doc => {
                uniqueTxs.set(doc.id, { id: doc.id, ...doc.data() });
            });
            txList = Array.from(uniqueTxs.values());
            updateList();
        });

        // 🔥 SYSTEM LOGIC: FETCH ACTIVITY REWARDS (WITHDRAWALS) 🔥
        const unsubACTIVITY_REWARDs = onSnapshot(qACTIVITY_REWARDs, (snap) => {
            const uniqueACTIVITY_REWARDs = new Map();
            snap.docs.forEach(docSnapshot => {
                const data = docSnapshot.data();
                const status = (data.status || '').toUpperCase();
                
                // Allow all logs except the explicitly rejected ones to ensure data shows up
                if (status !== 'REJECTED' && status !== 'FAILED') {
                    uniqueACTIVITY_REWARDs.set(docSnapshot.id, {
                        id: docSnapshot.id,
                        type: 'ACTIVITY_REWARD', 
                        userName: data.expertName || data.userName || data.name || 'Host',
                        // Added more field fallbacks in case the DB structure is slightly different
                        amount: data.amountRupee || data.amount || data.ACTIVITY_REWARDAmount || data.withdrawAmount || 0,
                        // Added multiple timestamp fallbacks
                        timestamp: data.paidAt || data.createdAt || data.timestamp || data.processedAt || new Date(),
                        ...data
                    });
                }
            });
            ACTIVITY_REWARDList = Array.from(uniqueACTIVITY_REWARDs.values());
            updateList();
        });

        return () => { unsubTx(); unsubACTIVITY_REWARDs(); };
    }, []);

    // 🔥 AUTOMATIC FILTER ENGINE: Runs perfectly when data updates or tab changes
    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const filtered = transactions.filter(t => {
            const upType = t.type ? t.type.toUpperCase() : '';

            // Handle "TODAY_" filters strictly for current operational cycle
            if (activeFilter.startsWith('TODAY_')) {
                const expectedType = activeFilter.replace('TODAY_', '');
                if (upType !== expectedType) return false;
                
                // Ensure synchronization within current date
                const timeData = t.processedAt || t.processedDate || t.paidAt || t.createdAt || t.timestamp || t.date;
                if (!timeData) return false;
                try {
                    const txDate = timeData.toDate ? timeData.toDate() : new Date(timeData);
                    return txDate >= today;
                } catch(e) {
                    return false;
                }
            } 
            // Handle "TOTAL_" cumulative filters
            else if (activeFilter.startsWith('TOTAL_')) {
                const expectedType = activeFilter.replace('TOTAL_', '');
                return upType === expectedType;
            } 
            // Handle Standard Filters
            else {
                return upType === activeFilter;
            }
        });

        setFilteredData(filtered);
    }, [transactions, activeFilter]);

    const applyFilter = (type: string) => {
        setActiveFilter(type);
    };

    const getIcon = (type: string) => {
        const upType = type ? type.toUpperCase() : '';
        switch(upType) {
            case 'RECHARGE': return { name: 'plus-circle', color: '#10B981' };
            case 'ACTIVITY_REWARD': return { name: 'external-link', color: '#6366F1' };
            default: return { name: 'help-circle', color: '#475569' };
        }
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        const upType = item.type ? item.type.toUpperCase() : '';
        const iconData = getIcon(upType);
        
        let displayName = item.userName || item.user_name || item.callerName || item.expertName || 'System';
        
        // Amount logic (handling exact values from operational ledger)
        const displayAmount = Number(item.amountRupee || item.amount || item.rechargeAmount || item.ACTIVITY_REWARDAmount || 0);

        // Formatted Operational Timestamp
        let dateString = "Timestamp Unknown";
        const timeData = item.paidAt || item.processedDate || item.processedAt || item.createdAt || item.timestamp || item.date;
        if (timeData) {
            try {
                dateString = timeData.toDate ? timeData.toDate().toLocaleString('en-IN') : new Date(timeData).toLocaleString('en-IN');
            } catch(e) {}
        }

        const isPositive = (upType === 'RECHARGE');
        
        // Dynamic Label Mapping
        const typeLabel = upType ? upType.replace('_', ' ') : 'UNKNOWN';

        return (
            <LogCard
                index={index}
                iconData={iconData}
                displayName={displayName}
                refId={item.id.slice(0,12).toUpperCase()}
                dateString={dateString}
                isPositive={isPositive}
                displayAmount={displayAmount}
                typeLabel={typeLabel}
            />
        );
    };

    /* ---------- 📊 LIVE SUMMARY (derived from the same filtered list) ---------- */
    const summaryTotal = filteredData.reduce(
        (sum, t) => sum + Number(t.amountRupee || t.amount || t.rechargeAmount || t.ACTIVITY_REWARDAmount || 0),
        0
    );
    const summaryIsInflow = activeFilter.endsWith('RECHARGE');
    const summaryAccent = summaryIsInflow ? '#10B981' : '#6366F1';

    const filterIcon = (f: string): any => (f.endsWith('RECHARGE') ? 'plus-circle' : 'external-link');

    const orbAY = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });
    const orbAX = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
    const orbBY = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
    const orbBX = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -35] });
    const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-300, 500] });
    const radarScale = radar.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] });
    const radarOpacity = radar.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });
    const iconFloatY = floatIcon.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
    const summaryTransform = [
        { perspective: 1000 },
        { translateY: summaryIn.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
        { rotateX: summaryIn.interpolate({ inputRange: [0, 1], outputRange: ['30deg', '0deg'] }) },
        { scale: summaryIn.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
        { rotateY: tilt.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) },
    ];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0F172A', '#020617']} style={StyleSheet.absoluteFill} />

            {/* 🌌 AURORA FLOATING ORBS */}
            <Animated.View pointerEvents="none" style={[styles.orb, styles.orbA, { transform: [{ translateX: orbAX }, { translateY: orbAY }] }]} />
            <Animated.View pointerEvents="none" style={[styles.orb, styles.orbB, { transform: [{ translateX: orbBX }, { translateY: orbBY }] }]} />
            <Animated.View pointerEvents="none" style={[styles.orb, styles.orbC, { transform: [{ translateY: orbAY }] }]} />
            
            <Animated.View
                style={[
                    styles.header,
                    {
                        opacity: headerIn,
                        transform: [
                            { perspective: 900 },
                            { translateY: headerIn.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
                            { rotateX: headerIn.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) },
                        ],
                    },
                ]}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#6366F1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>SYSTEM MASTER LEDGER</Text>
            </Animated.View>

            {/* 📊 LIVE SUMMARY 3D CARD (reflects the active filter) */}
            {!loading && (
                <Animated.View style={[styles.summaryWrap, { opacity: summaryIn, transform: summaryTransform }]}>
                    <LinearGradient
                        colors={summaryIsInflow ? ['#059669', '#047857'] : ['#6366F1', '#4338CA']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[styles.summaryCard, { shadowColor: summaryAccent }]}
                    >
                        <LinearGradient
                            colors={['rgba(255,255,255,0.22)', 'transparent', 'rgba(0,0,0,0.25)']}
                            locations={[0, 0.5, 1]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.summaryCircle} />
                        <Animated.View pointerEvents="none" style={[styles.summaryShine, { transform: [{ translateX: shineX }, { rotate: '20deg' }] }]}>
                            <LinearGradient
                                colors={['transparent', 'rgba(255,255,255,0.28)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ flex: 1 }}
                            />
                        </Animated.View>
                        <View style={styles.summaryTop}>
                            <Text style={styles.summaryLabel}>
                                {activeFilter.replace('TODAY_', "TODAY'S ").replace('TOTAL_', 'TOTAL ').replace('_', ' ')}
                            </Text>
                            <View style={styles.summaryCountChip}>
                                <MaterialCommunityIcons name="format-list-bulleted" size={12} color="#fff" />
                                <Text style={styles.summaryCountText}>{filteredData.length} LOGS</Text>
                            </View>
                        </View>
                        <Text style={styles.summaryValue}>₹{summaryTotal.toLocaleString('en-IN')}</Text>
                    </LinearGradient>
                </Animated.View>
            )}

            {/* ⚡ ANALYTICS FILTERS */}
            <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {/* 🔥 Removed VOUCHER filters here as requested 🔥 */}
                    {['TODAY_RECHARGE', 'TOTAL_RECHARGE', 'TODAY_ACTIVITY_REWARD', 'TOTAL_ACTIVITY_REWARD'].map((f) => (
                        <TouchableOpacity 
                            key={f} 
                            onPress={() => applyFilter(f)}
                            style={[styles.chip, activeFilter === f && styles.activeChip]}
                        >
                            {activeFilter === f && (
                                <LinearGradient
                                    colors={['#818CF8', '#6366F1', '#4F46E5']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={[StyleSheet.absoluteFill, { borderRadius: 10 }]}
                                />
                            )}
                            <Feather name={filterIcon(f)} size={11} color={activeFilter === f ? '#FFF' : '#475569'} style={{ marginRight: 6 }} />
                            <Text style={[styles.chipText, activeFilter === f && styles.activeChipText]}>
                                {f.replace('TODAY_', "TODAY'S ").replace('TOTAL_', 'TOTAL ')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {loading ? (
                <View style={styles.loadingWrap}>
                    <View style={styles.radarWrap}>
                        <Animated.View style={[styles.radarRing, { opacity: radarOpacity, transform: [{ scale: radarScale }] }]} />
                        <ActivityIndicator color="#6366F1" size="large" />
                    </View>
                </View>
            ) : (
                <FlatList
                    data={filteredData}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Animated.View style={{ transform: [{ perspective: 800 }, { translateY: iconFloatY }, { rotateX: '12deg' }] }}>
                                <MaterialCommunityIcons name="history" size={46} color="#1E293B" />
                            </Animated.View>
                            <Text style={styles.emptyText}>No operational logs found in current cycle.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },

    /* background orbs */
    orb: { position: 'absolute', borderRadius: 999 },
    orbA: { width: 280, height: 280, top: -70, right: -90, backgroundColor: 'rgba(99,102,241,0.18)' },
    orbB: { width: 240, height: 240, top: 420, left: -110, backgroundColor: 'rgba(139,92,246,0.14)' },
    orbC: { width: 200, height: 200, bottom: 100, right: -80, backgroundColor: 'rgba(16,185,129,0.08)' },

    header: { paddingTop: 60, paddingBottom: 10, paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center' },
    backBtn: { backgroundColor: '#0F172A', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B', shadowColor: '#6366F1', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginLeft: 15, letterSpacing: 1, textShadowColor: 'rgba(99,102,241,0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },

    /* summary card */
    summaryWrap: { paddingHorizontal: 20, marginTop: 15 },
    summaryCard: { padding: 22, borderRadius: 30, overflow: 'hidden', elevation: 16, shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 10 } },
    summaryCircle: { position: 'absolute', width: 170, height: 170, borderRadius: 85, top: -60, right: -50, backgroundColor: 'rgba(255,255,255,0.08)' },
    summaryShine: { position: 'absolute', top: -60, bottom: -60, width: 80 },
    summaryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    summaryLabel: { color: '#E0E7FF', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
    summaryCountChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#FFFFFF30', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#FFFFFF40' },
    summaryCountText: { color: '#fff', fontSize: 9, fontWeight: '900' },
    summaryValue: { color: '#fff', fontSize: 38, fontWeight: '900', marginTop: 10, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10 },
    
    filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginVertical: 15, gap: 8 },
    chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden' },
    activeChip: { backgroundColor: '#6366F1', borderColor: '#6366F1', shadowColor: '#6366F1', shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
    chipText: { color: '#475569', fontSize: 10, fontWeight: '900' },
    activeChipText: { color: '#FFF' },

    loadingWrap: { alignItems: 'center', marginTop: 50 },
    radarWrap: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
    radarRing: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#6366F1' },

    logCard: { backgroundColor: '#0F172A', padding: 15, paddingLeft: 19, borderRadius: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
    edgeBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
    iconWrap: { width: 45, height: 45, alignItems: 'center', justifyContent: 'center' },
    iconHalo: { position: 'absolute', width: 45, height: 45, borderRadius: 12 },
    iconBox: { width: 45, height: 45, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    txTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    txId: { color: '#475569', fontSize: 10, marginTop: 2 },
    txDate: { color: '#475569', fontSize: 9, marginTop: 2 },
    txAmount: { fontSize: 16, fontWeight: '900' },
    typePill: { marginTop: 5, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    txTypeLabel: { color: '#475569', fontSize: 8, fontWeight: '900' },
    emptyWrap: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: '#475569', textAlign: 'center', marginTop: 16, fontWeight: '700' }
});
