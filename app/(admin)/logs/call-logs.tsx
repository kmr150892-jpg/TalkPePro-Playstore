import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Easing,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../firebaseConfig';

// 🔥 NEW: Same diamond field order used everywhere in this screen (one place, no mismatch)
const getCallUnits = (l: any) =>
    Number(l.totalDiamonds || l.diamonds || l.amount || l.coins || l.cost || l.spentDiamonds || 0);

// 🔥 NEW: Same live status check used everywhere in this screen
const isLiveStatusValue = (s: any) =>
    ['ongoing', 'active', 'connecting', 'connected'].includes(String(s || '').toLowerCase());

/* ============================================================
   🃏 3D CALL CARD - flips in with perspective. LIVE sessions get
   a pulsing indigo glow, rippling icon halo and shimmer sweep.
   All values are computed by renderCallItem exactly like before
   and only passed in here for animation.
   ============================================================ */
const CallCard = ({
    index,
    isLive,
    iconName,
    iconColor,
    title,
    timeText,
    formattedDate,
    costLabel,
    statusLabel,
}: {
    index: number;
    isLive: boolean;
    iconName: string;
    iconColor: string;
    title: string;
    timeText: string;
    formattedDate: string;
    costLabel: string;
    statusLabel: string;
}) => {
    const enter = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(0)).current;
    const sweep = useRef(new Animated.Value(0)).current;

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
                Animated.timing(pulse, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        const sweepLoop = Animated.loop(
            Animated.sequence([
                Animated.delay(1600),
                Animated.timing(sweep, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        if (isLive) {
            pulseLoop.start();
            sweepLoop.start();
        }
        return () => { pulseLoop.stop(); sweepLoop.stop(); };
    }, [isLive]);

    const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.4] });
    const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
    const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
    const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-120, 420] });

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
            {/* indigo glow behind LIVE cards only */}
            {isLive && <Animated.View style={[styles.cardGlow, { opacity: glowOpacity }]} />}

            <View style={[styles.logCard, isLive && { borderColor: '#6366F1' }]}>
                <LinearGradient
                    colors={[iconColor + '18', 'transparent', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />
                {/* colored edge bar by call outcome */}
                <View style={[styles.edgeBar, { backgroundColor: iconColor }]} />

                {isLive && (
                    <Animated.View pointerEvents="none" style={[styles.shimmer, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
                        <LinearGradient
                            colors={['transparent', 'rgba(129,140,248,0.16)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ flex: 1 }}
                        />
                    </Animated.View>
                )}

                <View style={styles.iconWrap}>
                    {isLive && <Animated.View style={[styles.iconHalo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />}
                    <View style={[styles.iconBox, isLive && { backgroundColor: '#6366F120' }, { borderWidth: 1, borderColor: iconColor + '40' }]}>
                        <Feather 
                            name={iconName as any} 
                            size={20} 
                            color={iconColor} 
                        />
                    </View>
                </View>
                
                <View style={{ flex: 1, marginLeft: 15 }}>
                    <Text style={styles.userText}>{title}</Text>
                    <Text style={styles.subText}>
                        {timeText} • {formattedDate}
                    </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.costText, isLive && { color: '#6366F1' }]}>
                        {costLabel}
                    </Text>
                    <View style={[styles.statusPill, { borderColor: iconColor + '40', backgroundColor: iconColor + '12' }]}>
                        <Text style={[styles.statusTag, isLive && { color: '#6366F1' }]}>
                            {statusLabel}
                        </Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

const CallLogs = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // 🔥 NEW: REAL totals across ALL calls (the list below is limited to the last 50)
    const [totalSessions, setTotalSessions] = useState<number | null>(null);
    const [allUnits, setAllUnits] = useState<number | null>(null);
    
    // 🔥 SYSTEM STATE: Tab state to toggle between ACTIVE and ARCHIVED sessions
    const [activeTab, setActiveTab] = useState<'LIVE' | 'RECENT'>('RECENT');

    /* ---------- 🎞️ HEADER / BACKGROUND / TAB ANIMATIONS ---------- */
    const orbA = useRef(new Animated.Value(0)).current;
    const orbB = useRef(new Animated.Value(0)).current;
    const headerIn = useRef(new Animated.Value(0)).current;
    const statsIn = useRef(new Animated.Value(0)).current;
    const liveDot = useRef(new Animated.Value(0)).current;
    const radar = useRef(new Animated.Value(0)).current;
    const floatIcon = useRef(new Animated.Value(0)).current;
    const tabSlide = useRef(new Animated.Value(0)).current;
    const [tabWidth, setTabWidth] = useState(0);

    useEffect(() => {
        Animated.timing(headerIn, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        Animated.spring(statsIn, { toValue: 1, friction: 7, tension: 40, delay: 250, useNativeDriver: true }).start();

        const loopTiming = (val: Animated.Value, duration: number, delay = 0) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(val, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                    Animated.timing(val, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                ])
            );
        const l1 = loopTiming(orbA, 6000);
        const l2 = loopTiming(orbB, 7500, 700);
        const l3 = loopTiming(liveDot, 900);
        const l4 = loopTiming(floatIcon, 2200);
        const l5 = Animated.loop(Animated.timing(radar, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
        [l1, l2, l3, l4, l5].forEach(l => l.start());
        return () => [l1, l2, l3, l4, l5].forEach(l => l.stop());
    }, []);

    // sliding 3D tab thumb follows the active tab
    useEffect(() => {
        Animated.spring(tabSlide, {
            toValue: activeTab === 'RECENT' ? 0 : 1,
            friction: 8,
            tension: 60,
            useNativeDriver: true,
        }).start();
    }, [activeTab]);

    useEffect(() => {
        // 📞 Fetching Last 50 Platform Sessions
        // 🔥 SYSTEM LOGIC: Using 'createdAt' for precise chronological synchronization
        const q = query(collection(db, "calls"), orderBy("createdAt", "desc"), limit(50));
        
        const unsubscribe = onSnapshot(q, (snap) => {
            const callData = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLogs(callData);
            setLoading(false);
        });

        // 🔥 NEW: Live snapshot of ALL calls → real total sessions + real total diamonds (units)
        const unsubscribeAll = onSnapshot(collection(db, "calls"), (allSnap) => {
            let unitsSum = 0;
            allSnap.docs.forEach(d => {
                const l: any = d.data();
                // same rule as before: live (active) calls are not counted in units
                if (!isLiveStatusValue(l.status)) {
                    unitsSum += getCallUnits(l);
                }
            });
            setTotalSessions(allSnap.size);
            setAllUnits(unitsSum);
        }, (err) => {
            // safe fallback = old behaviour (numbers from the last 50 calls)
            console.log("Total calls sync error:", err);
            setTotalSessions(null);
            setAllUnits(null);
        });

        return () => {
            unsubscribe();
            unsubscribeAll();
        };
    }, []);

    // 🔥 SYSTEM FILTER: Show only ACTIVE sessions or ALL recent history
    const displayData = logs.filter(log => {
        if (activeTab === 'RECENT') return true;
        
        // If ACTIVE tab is selected, only show ongoing platform connections
        const status = log.status ? String(log.status).toLowerCase() : '';
        return status === 'ongoing' || status === 'active' || status === 'connecting' || status === 'connected';
    });

    const renderCallItem = ({ item, index }: any) => {
        // 🔥 DATE SYNCHRONIZATION
        let formattedDate = "Timestamp Unknown";
        const timeData = item.createdAt || item.timestamp || item.connectedAt || item.startTime;
        if (timeData) {
            try {
                formattedDate = timeData.toDate ? timeData.toDate().toLocaleString('en-IN') : new Date(timeData).toLocaleString('en-IN');
            } catch (e) {}
        }

        // 🔥 SESSION DURATION ANALYTICS
        const durationSecs = Number(item.finalDuration || item.duration || item.callDuration || item.time || 0);
        const displayMins = Math.floor(durationSecs / 60);
        const displaySecs = durationSecs % 60;
        const timeText = displayMins > 0 ? `${displayMins}m ${displaySecs}s` : `${displaySecs}s`;

        // 🔥 UNIT ALLOCATION ANALYTICS (Service Units instead of Currency)
        const unitsAllocated = Number(item.totalDiamonds || item.diamonds || item.amount || item.coins || item.cost || item.spentDiamonds || 0);

        const isLive = ['ongoing', 'active', 'connecting', 'connected'].includes(String(item.status || '').toLowerCase());

        return (
            <CallCard
                index={index}
                isLive={isLive}
                iconName={isLive ? "phone-call" : (item.status === 'completed' || item.status === 'SUCCESS' ? "phone-incoming" : "phone-missed")}
                iconColor={isLive ? "#6366F1" : (item.status === 'completed' || item.status === 'SUCCESS' ? "#10B981" : "#EF4444")}
                title={`${item.callerName || item.userName || item.user_name || 'User'} ↔ ${item.expertName || item.expert_name || item.receiverName || 'Host'}`}
                timeText={timeText}
                formattedDate={formattedDate}
                costLabel={isLive ? 'Active' : `- 💎${unitsAllocated}`}
                statusLabel={String(item.status || 'UNVERIFIED').toUpperCase()}
            />
        );
    };

    /* ---------- 📊 LIVE SUMMARY (derived from the same logs list) ---------- */
    const isLiveStatus = (s: any) => ['ongoing', 'active', 'connecting', 'connected'].includes(String(s || '').toLowerCase());
    const liveCount = logs.filter(l => isLiveStatus(l.status)).length;
    const totalUnits = logs.reduce(
        (sum, l) => sum + (isLiveStatus(l.status) ? 0 : Number(l.totalDiamonds || l.diamonds || l.amount || l.coins || l.cost || l.spentDiamonds || 0)),
        0
    );

    const orbAY = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });
    const orbAX = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
    const orbBY = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
    const orbBX = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -35] });
    const liveHaloScale = liveDot.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
    const liveHaloOpacity = liveDot.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
    const radarScale = radar.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] });
    const radarOpacity = radar.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });
    const iconFloatY = floatIcon.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
    const thumbWidth = tabWidth > 0 ? (tabWidth - 6) / 2 : 0;
    const thumbX = tabSlide.interpolate({ inputRange: [0, 1], outputRange: [0, thumbWidth] });

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
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>SESSION & AUDIT LOGS</Text>
                    <Text style={styles.subtitle}>Real-time monitoring of system connections</Text>
                </View>
                {/* live monitor chip */}
                <View style={styles.monitorChip}>
                    <View style={styles.monitorDotWrap}>
                        <Animated.View style={[styles.monitorHalo, { opacity: liveHaloOpacity, transform: [{ scale: liveHaloScale }] }]} />
                        <View style={styles.monitorDot} />
                    </View>
                    <Text style={styles.monitorText}>MONITOR</Text>
                </View>
            </Animated.View>

            {/* 📊 SUMMARY STRIP */}
            {!loading && (
                <Animated.View
                    style={[
                        styles.summaryRow,
                        {
                            opacity: statsIn,
                            transform: [
                                { perspective: 900 },
                                { translateY: statsIn.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
                                { rotateX: statsIn.interpolate({ inputRange: [0, 1], outputRange: ['25deg', '0deg'] }) },
                            ],
                        },
                    ]}
                >
                    <View style={[styles.summaryPill, { borderColor: '#6366F140' }]}>
                        <MaterialCommunityIcons name="phone-log" size={14} color="#6366F1" />
                        {/* 🔥 FIX: show REAL total sessions (falls back to loaded logs until the count arrives) */}
                        <Text style={styles.summaryNum}>{(totalSessions ?? logs.length).toLocaleString()}</Text>
                        <Text style={styles.summaryLabel}>SESSIONS</Text>
                    </View>
                    <View style={[styles.summaryPill, { borderColor: '#10B98140' }]}>
                        <View style={[styles.summaryDot, { backgroundColor: '#10B981' }]} />
                        <Text style={styles.summaryNum}>{liveCount}</Text>
                        <Text style={styles.summaryLabel}>LIVE</Text>
                    </View>
                    <View style={[styles.summaryPill, { borderColor: '#F59E0B40' }]}>
                        <Text style={{ fontSize: 11 }}>💎</Text>
                        {/* 🔥 FIX: show REAL total diamonds across ALL calls (falls back to last-50 total until loaded) */}
                        <Text style={styles.summaryNum}>{(allUnits ?? totalUnits).toLocaleString()}</Text>
                        <Text style={styles.summaryLabel}>UNITS</Text>
                    </View>
                </Animated.View>
            )}

            {/* 🔥 TAB INTERFACE: ACTIVE vs ARCHIVED */}
            <View style={styles.tabContainer} onLayout={(e) => setTabWidth(e.nativeEvent.layout.width)}>
                {/* sliding 3D thumb */}
                {thumbWidth > 0 && (
                    <Animated.View style={[styles.tabThumb, { width: thumbWidth, transform: [{ translateX: thumbX }] }]}>
                        <LinearGradient
                            colors={['#818CF8', '#6366F1', '#4F46E5']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[StyleSheet.absoluteFill, { borderRadius: 14 }]}
                        />
                    </Animated.View>
                )}
                <TouchableOpacity 
                    style={[styles.tabBtn, activeTab === 'RECENT' && styles.tabActive]}
                    onPress={() => setActiveTab('RECENT')}
                >
                    <Text style={[styles.tabText, activeTab === 'RECENT' && styles.tabTextActive]}>ARCHIVED SESSIONS</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tabBtn, activeTab === 'LIVE' && styles.tabActive]}
                    onPress={() => setActiveTab('LIVE')}
                >
                    <Text style={[styles.tabText, activeTab === 'LIVE' && styles.tabTextActive]}>🔴 ACTIVE NOW</Text>
                </TouchableOpacity>
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
                    data={displayData}
                    keyExtractor={(item) => item.id}
                    renderItem={renderCallItem}
                    contentContainerStyle={{ padding: 20 }}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Animated.View style={{ transform: [{ perspective: 800 }, { translateY: iconFloatY }, { rotateX: '12deg' }] }}>
                                <Feather name={activeTab === 'LIVE' ? 'phone-off' : 'archive'} size={44} color="#1E293B" />
                            </Animated.View>
                            <Text style={styles.empty}>{activeTab === 'LIVE' ? 'No active sessions monitored.' : 'No session history found.'}</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },

    /* background orbs */
    orb: { position: 'absolute', borderRadius: 999 },
    orbA: { width: 280, height: 280, top: -70, right: -90, backgroundColor: 'rgba(99,102,241,0.18)' },
    orbB: { width: 240, height: 240, top: 420, left: -110, backgroundColor: 'rgba(139,92,246,0.14)' },
    orbC: { width: 200, height: 200, bottom: 100, right: -80, backgroundColor: 'rgba(16,185,129,0.08)' },

    header: { paddingTop: 60, paddingHorizontal: 25, marginBottom: 15, flexDirection: 'row', alignItems: 'center' },
    title: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(99,102,241,0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
    subtitle: { color: '#475569', fontSize: 12, marginTop: 4 },
    monitorChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B98115', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#10B98133' },
    monitorDotWrap: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center', marginRight: 5 },
    monitorHalo: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    monitorDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    monitorText: { color: '#10B981', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

    /* summary strip */
    summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 14 },
    summaryPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#0F172A', paddingVertical: 10, borderRadius: 16, borderWidth: 1, shadowColor: '#6366F1', shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
    summaryDot: { width: 6, height: 6, borderRadius: 3 },
    summaryNum: { color: '#fff', fontSize: 13, fontWeight: '900' },
    summaryLabel: { color: '#64748B', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
    
    tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 10, padding: 3, backgroundColor: '#0F172A', borderRadius: 17, borderWidth: 1, borderColor: '#1E293B' },
    tabThumb: { position: 'absolute', top: 3, bottom: 3, left: 3, borderRadius: 14, shadowColor: '#6366F1', shadowOpacity: 0.6, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
    tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 14 },
    tabActive: { borderBottomColor: '#6366F1' },
    tabText: { color: '#475569', fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
    tabTextActive: { color: '#FFF', fontWeight: '900' },

    loadingWrap: { alignItems: 'center', marginTop: 50 },
    radarWrap: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
    radarRing: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#6366F1' },

    cardGlow: { position: 'absolute', top: 14, left: 14, right: 14, bottom: 2, borderRadius: 22, backgroundColor: '#6366F1' },
    logCard: { 
        backgroundColor: '#0F172A', 
        padding: 18, 
        paddingLeft: 22,
        borderRadius: 20, 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1E293B',
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.45,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8
    },
    edgeBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
    shimmer: { position: 'absolute', top: -40, bottom: -40, width: 90 },
    iconWrap: { alignItems: 'center', justifyContent: 'center' },
    iconHalo: { position: 'absolute', width: 44, height: 44, borderRadius: 12, backgroundColor: '#6366F1' },
    iconBox: { backgroundColor: '#1E293B', padding: 10, borderRadius: 12 },
    userText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    subText: { color: '#64748B', fontSize: 11, marginTop: 4 },
    costText: { color: '#EF4444', fontWeight: '900', fontSize: 14 },
    statusPill: { marginTop: 5, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
    statusTag: { color: '#475569', fontSize: 9, fontWeight: 'bold' },
    emptyWrap: { alignItems: 'center', marginTop: 100 },
    empty: { color: '#475569', textAlign: 'center', marginTop: 16 }
});

export default CallLogs;