import { Feather, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, or, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../firebaseConfig';

const { width } = Dimensions.get('window');

interface ExpertData {
    id: string;
    name?: string;
    status?: string;
    isBlocked?: boolean;
    currentLevel?: number;
    beansPerMin?: number; 
    userPrice?: number;
    role?: string;
    uid?: string;
    photoURL?: string;
    isApplying?: boolean;
}

/* ============================================================
   🃏 3D EXPERT CARD - flips in with perspective, pending cards
   glow + shimmer, avatar status dot pulses
   ============================================================ */
const ExpertCard = ({
    item,
    index,
    onToggleBlock,
    onOpen,
}: {
    item: ExpertData;
    index: number;
    onToggleBlock: (userId: string, currentStatus: boolean) => void;
    onOpen: (id: string) => void;
}) => {
    const isBlocked = item.status === 'Blocked' || item.isBlocked;
    const isPending = item.status === 'Pending' || item.isApplying === true;
    const accent = isPending ? '#FBBF24' : (isBlocked ? '#EF4444' : '#10B981');

    const enter = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(0)).current;
    const sweep = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(enter, {
            toValue: 1,
            friction: 7,
            tension: 45,
            delay: Math.min(index, 8) * 110,
            useNativeDriver: true,
        }).start();

        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        const sweepLoop = Animated.loop(
            Animated.sequence([
                Animated.delay(1800),
                Animated.timing(sweep, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        pulseLoop.start();
        if (isPending) sweepLoop.start();
        return () => { pulseLoop.stop(); sweepLoop.stop(); };
    }, [isPending]);

    const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
    const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
    const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.12, 0.38] });
    const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-120, width] });

    return (
        <Animated.View
            style={{
                opacity: enter,
                transform: [
                    { perspective: 1000 },
                    { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) },
                    { rotateX: enter.interpolate({ inputRange: [0, 1], outputRange: ['30deg', '0deg'] }) },
                    { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                ],
            }}
        >
            {/* soft colored glow behind each card */}
            <Animated.View style={[styles.cardGlow, { backgroundColor: accent, opacity: isPending ? glowOpacity : 0.1 }]} />

            <View style={[styles.card, isPending && styles.pendingCard]}>
                <LinearGradient
                    colors={[accent + '1F', 'transparent', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />

                {/* shimmer sweep only for pending applicants */}
                {isPending && (
                    <Animated.View pointerEvents="none" style={[styles.shimmer, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
                        <LinearGradient
                            colors={['transparent', 'rgba(251,191,36,0.16)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ flex: 1 }}
                        />
                    </Animated.View>
                )}

                <View style={styles.cardHeader}>
                    <View style={styles.avatarContainer}>
                        <View style={[styles.avatarRing, { borderColor: accent + '66' }]}>
                            {item.photoURL ? (
                                <Image source={{ uri: item.photoURL }} style={styles.avatarImage} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>{item.name?.[0] || '?'}</Text>
                                </View>
                            )}
                        </View>
                        <Animated.View style={[styles.statusHalo, { backgroundColor: accent, opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
                        <View style={[styles.statusDot, { backgroundColor: accent }]} />
                    </View>

                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={styles.name} numberOfLines={1}>{item.name || 'Unknown User'}</Text>
                        <View style={styles.idChip}>
                            <MaterialCommunityIcons name="fingerprint" size={10} color="#64748B" />
                            <Text style={styles.idText}>SYSTEM ID: {item.uid?.slice(0, 12) || item.id.slice(0, 12)}</Text>
                        </View>
                    </View>
                    
                    <View style={[styles.statusBadge, { 
                        backgroundColor: isPending ? '#FBBF2415' : (isBlocked ? '#EF444415' : '#10B98115'),
                        borderColor: isPending ? '#FBBF2430' : (isBlocked ? '#EF444430' : '#10B98130') 
                    }]}>
                        <Text style={[styles.statusText, { color: isPending ? '#FBBF24' : (isBlocked ? '#EF4444' : '#10B981') }]}>
                            {(item.status || 'ACTIVE').toUpperCase()}
                        </Text>
                    </View>
                </View>

                {!isPending && (
                    <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>TIER LEVEL</Text>
                            <Text style={styles.statValue}>{item.currentLevel ?? 0}</Text>
                        </View>
                        <View style={styles.vDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>REWARD /MIN</Text>
                            <View style={styles.currencyRow}>
                                <MaterialCommunityIcons name="leaf" size={12} color="#FBBF24" />
                                <Text style={styles.statValue}> {item.beansPerMin || 0}</Text>
                            </View>
                        </View>
                        <View style={styles.vDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statLabel}>USER RATE</Text>
                            <View style={styles.currencyRow}>
                                <FontAwesome5 name="gem" size={10} color="#6366F1" />
                                <Text style={styles.statValue}> {item.userPrice ?? 0}</Text>
                            </View>
                        </View>
                    </View>
                )}

                <View style={[styles.actions, isPending && { marginTop: 20 }]}>
                    {!isPending && (
                        <TouchableOpacity 
                            style={[styles.actionBtn, styles.secondaryAction, { borderColor: isBlocked ? '#10B98150' : '#EF444430', backgroundColor: isBlocked ? '#10B98110' : '#EF444410' }]} 
                            onPress={() => onToggleBlock(item.id, !!isBlocked)}
                        >
                            <Feather name={isBlocked ? "unlock" : "user-x"} size={16} color={isBlocked ? '#10B981' : '#EF4444'} />
                            <Text style={[styles.actionBtnText, { color: isBlocked ? '#10B981' : '#EF4444' }]}>
                                {isBlocked ? 'RESTORE' : 'RESTRICT'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    
                    <TouchableOpacity 
                         style={[styles.actionBtn, isPending ? styles.primaryActionPending : styles.primaryAction, { flex: 1.2 }]}
                         onPress={() => onOpen(item.id)} 
                    >
                        <LinearGradient
                            colors={isPending ? ['#FDE68A', '#FBBF24', '#F59E0B'] : ['#818CF8', '#6366F1', '#4F46E5']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[StyleSheet.absoluteFill, { borderRadius: 16 }]}
                        />
                        <MaterialCommunityIcons name={isPending ? "file-find-outline" : "shield-account-outline"} size={18} color="#fff" />
                        <Text style={styles.actionBtnText} numberOfLines={1} adjustsFontSizeToFit>
                            {isPending ? 'REVIEW ONBOARDING' : 'MANAGE'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Animated.View>
    );
};

export default function ExpertControl() {
    const router = useRouter();
    const [experts, setExperts] = useState<ExpertData[]>([]);
    const [loading, setLoading] = useState(true);

    /* ---------- 🎞️ HEADER / BACKGROUND ANIMATIONS ---------- */
    const orbA = useRef(new Animated.Value(0)).current;
    const orbB = useRef(new Animated.Value(0)).current;
    const spin = useRef(new Animated.Value(0)).current;
    const headerIn = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(headerIn, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

        const loopTiming = (val: Animated.Value, duration: number, delay = 0) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(val, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                    Animated.timing(val, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                ])
            );
        const l1 = loopTiming(orbA, 6000);
        const l2 = loopTiming(orbB, 7500, 700);
        const l3 = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
        [l1, l2, l3].forEach(l => l.start());
        return () => [l1, l2, l3].forEach(l => l.stop());
    }, []);

    useEffect(() => {
        setLoading(true);
        const q = query(
            collection(db, "users"), 
            or(
                where("role", "==", "expert"),
                where("isApplying", "==", true)
            )
        ); 
        
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExpertData));
            const sortedList = list.sort((a, b) => {
                const statusA = a.status === 'Pending' ? 1 : 0;
                const statusB = b.status === 'Pending' ? 1 : 0;
                return statusB - statusA;
            });

            setExperts(sortedList);
            setLoading(false);
        }, (error) => {
            console.error("Firebase Sync Error:", error);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const toggleBlockStatus = async (userId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        Alert.alert(
            newStatus ? "RESTRICT ACCOUNT ACCESS?" : "RESTORE ACCOUNT ACCESS?",
            `Are you sure you want to ${newStatus ? 'suspend' : 'reinstate'} this host's credentials?`,
            [
                { text: "CANCEL", style: "cancel" },
                { 
                    text: "CONFIRM ACTION", 
                    style: newStatus ? "destructive" : "default",
                    onPress: async () => {
                        try {
                            const userRef = doc(db, "users", userId);
                            await updateDoc(userRef, {
                                isBlocked: newStatus,
                                status: newStatus ? "Blocked" : "Active"
                            });
                        } catch (err) {
                            Alert.alert("SYSTEM ERROR", "Unable to update account status.");
                        }
                    }
                }
            ]
        );
    };

    const renderExpert = ({ item, index }: { item: ExpertData; index: number }) => {
        return (
            <ExpertCard
                item={item}
                index={index}
                onToggleBlock={toggleBlockStatus}
                onOpen={(id) => router.push(`/(admin)/experts/verify-expert/${id}`)}
            />
        );
    };

    /* ---------- 📊 LIVE SUMMARY (derived from the same list) ---------- */
    const pendingCount = experts.filter(e => e.status === 'Pending' || e.isApplying === true).length;
    const blockedCount = experts.filter(e => (e.status === 'Blocked' || e.isBlocked) && !(e.status === 'Pending' || e.isApplying === true)).length;
    const activeCount = experts.length - pendingCount - blockedCount;

    const orbAY = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });
    const orbAX = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
    const orbBY = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
    const orbBX = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -35] });
    const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

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
                <View>
                    <Text style={styles.title}>HOST HUB</Text>
                    <Text style={styles.subtitle}>Administrative Terminal • TalkPe OS</Text>
                </View>
                <View style={styles.countWrap}>
                    {/* rotating dashed orbit ring */}
                    <Animated.View style={[styles.countRing, { transform: [{ rotate: rotate }] }]} />
                    <View style={styles.countContainer}>
                        <Text style={styles.countText}>{experts.length}</Text>
                    </View>
                </View>
            </Animated.View>

            {/* 📊 SUMMARY STRIP */}
            {!loading && (
                <Animated.View style={[styles.summaryRow, { opacity: headerIn }]}>
                    <View style={[styles.summaryPill, { borderColor: '#FBBF2440' }]}>
                        <View style={[styles.summaryDot, { backgroundColor: '#FBBF24' }]} />
                        <Text style={styles.summaryNum}>{pendingCount}</Text>
                        <Text style={styles.summaryLabel}>PENDING</Text>
                    </View>
                    <View style={[styles.summaryPill, { borderColor: '#10B98140' }]}>
                        <View style={[styles.summaryDot, { backgroundColor: '#10B981' }]} />
                        <Text style={styles.summaryNum}>{activeCount}</Text>
                        <Text style={styles.summaryLabel}>ACTIVE</Text>
                    </View>
                    <View style={[styles.summaryPill, { borderColor: '#EF444440' }]}>
                        <View style={[styles.summaryDot, { backgroundColor: '#EF4444' }]} />
                        <Text style={styles.summaryNum}>{blockedCount}</Text>
                        <Text style={styles.summaryLabel}>BLOCKED</Text>
                    </View>
                </Animated.View>
            )}

            {loading ? (
                <View style={styles.loader}>
                    <ActivityIndicator size="large" color="#6366F1" />
                </View>
            ) : (
                <FlatList
                    data={experts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderExpert}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}
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
    orbB: { width: 240, height: 240, top: 380, left: -110, backgroundColor: 'rgba(139,92,246,0.14)' },
    orbC: { width: 200, height: 200, bottom: 100, right: -80, backgroundColor: 'rgba(16,185,129,0.08)' },

    header: { paddingTop: 60, paddingHorizontal: 25, paddingBottom: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    title: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: 2, textShadowColor: 'rgba(99,102,241,0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },
    subtitle: { color: '#475569', fontSize: 10, fontWeight: '800', letterSpacing: 1.5, marginTop: 4 },
    countWrap: { width: 58, height: 58, alignItems: 'center', justifyContent: 'center' },
    countRing: { position: 'absolute', width: 58, height: 58, borderRadius: 29, borderWidth: 1.5, borderColor: '#6366F199', borderStyle: 'dashed' },
    countContainer: { width: 45, height: 45, borderRadius: 14, backgroundColor: '#6366F120', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#6366F155', shadowColor: '#6366F1', shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
    countText: { color: '#6366F1', fontWeight: '900', fontSize: 16 },

    /* summary strip */
    summaryRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 22 },
    summaryPill: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#0F172A', paddingVertical: 10, borderRadius: 16, borderWidth: 1 },
    summaryDot: { width: 6, height: 6, borderRadius: 3 },
    summaryNum: { color: '#fff', fontSize: 14, fontWeight: '900' },
    summaryLabel: { color: '#64748B', fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },

    loader: { flex: 1, justifyContent: 'center' },
    listContent: { paddingHorizontal: 20, paddingBottom: 150 },

    /* cards */
    cardGlow: { position: 'absolute', top: 18, left: 18, right: 18, bottom: 6, borderRadius: 28 },
    card: { backgroundColor: '#0F172A', padding: 22, borderRadius: 28, marginBottom: 18, borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
    pendingCard: { borderColor: '#FBBF2460', borderLeftWidth: 4, borderLeftColor: '#FBBF24' },
    shimmer: { position: 'absolute', top: -40, bottom: -40, width: 90 },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: { position: 'relative' },
    avatarRing: { padding: 3, borderRadius: 20, borderWidth: 1.5 },
    avatarImage: { width: 55, height: 55, borderRadius: 16, borderWidth: 1, borderColor: '#6366F130' },
    avatarPlaceholder: { width: 55, height: 55, borderRadius: 16, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
    avatarText: { color: '#6366F1', fontWeight: '900', fontSize: 22 },
    statusHalo: { position: 'absolute', bottom: -3, right: -3, width: 16, height: 16, borderRadius: 8 },
    statusDot: { position: 'absolute', bottom: -3, right: -3, width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#0F172A' },
    name: { color: '#fff', fontSize: 18, fontWeight: '900' },
    idChip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
    idText: { color: '#475569', fontSize: 9, letterSpacing: 1 },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1 },
    statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 20, backgroundColor: '#02061790', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#1E293B' },
    statBox: { flex: 1, alignItems: 'center' },
    statLabel: { color: '#475569', fontSize: 8, fontWeight: '900', marginBottom: 5, letterSpacing: 0.8 },
    statValue: { color: '#fff', fontSize: 14, fontWeight: '900' },
    currencyRow: { flexDirection: 'row', alignItems: 'center' },
    vDivider: { width: 1, height: '50%', backgroundColor: '#1E293B', alignSelf: 'center' },
    actions: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    actionBtn: { flex: 1, height: 50, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    secondaryAction: { backgroundColor: 'transparent', borderWidth: 1 },
    primaryAction: { backgroundColor: '#6366F1', shadowColor: '#6366F1', shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
    primaryActionPending: { backgroundColor: '#FBBF24', shadowColor: '#FBBF24', shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
    actionBtnText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
});
