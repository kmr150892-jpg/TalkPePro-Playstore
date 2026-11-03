import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

const FILTERS = ['All', 'Pending', 'Delivered', 'Rejected'];

/* ------------------------------------------------------------------ */
/* ✨ FLOATING 3D AURORA ORB (background depth layer)                  */
/* ------------------------------------------------------------------ */
const FloatingOrb = ({ size, colors, top, left, right, duration, travel }: any) => {
    const t = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(t, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute',
                top,
                left,
                right,
                width: size,
                height: size,
                borderRadius: size / 2,
                opacity: 0.55,
                transform: [
                    { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-travel, travel] }) },
                    { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [travel, -travel] }) },
                    { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.15] }) }
                ]
            }}
        >
            <LinearGradient colors={colors} style={{ flex: 1, borderRadius: size / 2 }} />
        </Animated.View>
    );
};

/* ------------------------------------------------------------------ */
/* 🔴 PULSING LIVE / PENDING DOT                                       */
/* ------------------------------------------------------------------ */
const PulseDot = ({ color, size = 8 }: { color: string; size?: number }) => {
    const pulse = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(pulse, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true })
        );
        loop.start();
        return () => loop.stop();
    }, []);

    return (
        <View style={{ width: size * 2.6, height: size * 2.6, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View
                style={{
                    position: 'absolute',
                    width: size * 2.6,
                    height: size * 2.6,
                    borderRadius: size * 1.3,
                    backgroundColor: color,
                    opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
                    transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] }) }]
                }}
            />
            <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
        </View>
    );
};

/* ------------------------------------------------------------------ */
/* 📊 STAT TILE (spring pop-in)                                        */
/* ------------------------------------------------------------------ */
const StatTile = ({ label, value, color, icon, delay }: any) => {
    const pop = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(pop, { toValue: 1, delay, friction: 6, tension: 60, useNativeDriver: true }).start();
    }, []);

    return (
        <Animated.View
            style={[
                styles.statTile,
                {
                    opacity: pop,
                    transform: [
                        { perspective: 800 },
                        { rotateX: pop.interpolate({ inputRange: [0, 1], outputRange: ['-50deg', '0deg'] }) },
                        { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }
                    ]
                }
            ]}
        >
            <View style={[styles.statIconWrap, { backgroundColor: color + '22' }]}>
                <Ionicons name={icon} size={14} color={color} />
            </View>
            <Text style={[styles.statValue, { color }]}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </Animated.View>
    );
};

/* ------------------------------------------------------------------ */
/* 🎴 3D REQUEST CARD (entrance fold + press tilt + glow)              */
/* ------------------------------------------------------------------ */
const RequestCard = ({ req, index, processingId, onApprove, onReject }: any) => {
    const isPending = req.status === 'Pending';
    const isDelivered = req.status === 'Delivered';
    const statusColor = isPending ? '#F59E0B' : (isDelivered ? '#10B981' : '#EF4444');

    const enter = useRef(new Animated.Value(0)).current;
    const tilt = useRef(new Animated.Value(0)).current;
    const shimmer = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(enter, {
            toValue: 1,
            delay: Math.min(index, 8) * 90,
            friction: 7,
            tension: 45,
            useNativeDriver: true
        }).start();
    }, []);

    useEffect(() => {
        if (!isPending) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(1200),
                Animated.timing(shimmer, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        );
        loop.start();
        return () => loop.stop();
    }, [isPending]);

    const pressIn = () => Animated.spring(tilt, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
    const pressOut = () => Animated.spring(tilt, { toValue: 0, friction: 4, tension: 80, useNativeDriver: true }).start();

    const initial = (req.userName || req.userEmail || '?').toString().charAt(0).toUpperCase();

    let dateLabel = '';
    try {
        const d = req.requestDate?.toDate ? req.requestDate.toDate() : null;
        if (d) dateLabel = d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
    } catch (e) {
        dateLabel = '';
    }

    return (
        <Animated.View
            style={{
                opacity: enter,
                marginBottom: 22,
                transform: [
                    { perspective: 900 },
                    { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
                    { rotateX: enter.interpolate({ inputRange: [0, 1], outputRange: ['38deg', '0deg'] }) },
                    { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) }
                ]
            }}
        >
            <Pressable onPressIn={pressIn} onPressOut={pressOut}>
                <Animated.View
                    style={{
                        shadowColor: statusColor,
                        shadowOffset: { width: 0, height: 14 },
                        shadowOpacity: 0.35,
                        shadowRadius: 22,
                        elevation: 14,
                        transform: [
                            { perspective: 900 },
                            { rotateX: tilt.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '5deg'] }) },
                            { rotateY: tilt.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-5deg'] }) },
                            { scale: tilt.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] }) }
                        ]
                    }}
                >
                    {/* GRADIENT RIM */}
                    <LinearGradient
                        colors={[statusColor + 'CC', 'rgba(255,255,255,0.05)', statusColor + '40']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardRim}
                    >
                        <View style={styles.cardBody}>
                            {/* Inner glass highlight */}
                            <LinearGradient
                                colors={[statusColor + '22', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0.8, y: 0.6 }}
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
                            />

                            {/* IDENTITY ROW */}
                            <View style={styles.reqHeader}>
                                <View style={styles.identity}>
                                    <LinearGradient colors={[statusColor, statusColor + '55']} style={styles.avatar}>
                                        <Text style={styles.avatarText}>{initial}</Text>
                                    </LinearGradient>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.reqUser} numberOfLines={1}>{req.userName}</Text>
                                        <Text style={styles.reqEmail} numberOfLines={1}><Ionicons name="mail" size={12} /> {req.userEmail}</Text>
                                    </View>
                                </View>

                                <View style={[styles.statusBadge, { backgroundColor: statusColor + '20', borderColor: statusColor + '55' }]}>
                                    {isPending && <PulseDot color={statusColor} size={6} />}
                                    <Text style={[styles.statusText, { color: statusColor }]}>{req.status.toUpperCase()}</Text>
                                </View>
                            </View>

                            {/* PERFORATED TICKET DIVIDER */}
                            <View style={styles.perforation}>
                                {Array.from({ length: 26 }).map((_, i) => (
                                    <View key={i} style={[styles.dash, { backgroundColor: statusColor + '55' }]} />
                                ))}
                            </View>

                            {/* ALLOCATION DETAILS */}
                            <View style={styles.detailsRow}>
                                <View style={{ flex: 1, paddingRight: 10 }}>
                                    <Text style={styles.detailLabel}>REQUESTED ALLOCATION</Text>
                                    <Text style={styles.detailValue}>{req.voucherValue} {req.voucherName}</Text>
                                    {!!dateLabel && (
                                        <View style={styles.dateRow}>
                                            <Ionicons name="time-outline" size={11} color="rgba(255,255,255,0.4)" />
                                            <Text style={styles.dateText}>{dateLabel}</Text>
                                        </View>
                                    )}
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={styles.detailLabel}>ALLOCATION COST</Text>
                                    <View style={styles.costChip}>
                                        <Text style={styles.detailDiamond}>{req.costDeducted.toLocaleString()} 💎</Text>
                                    </View>
                                </View>
                            </View>

                            {/* OPERATIONAL ACTIONS (Visible only for Pending Status) */}
                            {isPending && (
                                <View style={styles.actionRow}>
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={[styles.actionBtn, styles.rejectBtn]}
                                        onPress={() => onReject(req)}
                                        disabled={processingId === req.id}
                                    >
                                        {processingId === req.id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.rejectText}>DECLINE & REVERSE</Text>}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        activeOpacity={0.85}
                                        style={[styles.actionBtn, styles.approveBtn]}
                                        onPress={() => onApprove(req)}
                                        disabled={processingId === req.id}
                                    >
                                        <LinearGradient
                                            colors={['#34D399', '#10B981', '#059669']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                        <Animated.View
                                            pointerEvents="none"
                                            style={[
                                                styles.shine,
                                                {
                                                    transform: [
                                                        { translateX: shimmer.interpolate({ inputRange: [0, 1], outputRange: [-120, 200] }) },
                                                        { skewX: '-20deg' }
                                                    ]
                                                }
                                            ]}
                                        />
                                        {processingId === req.id ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={styles.approveText}>COMMIT DELIVERY</Text>}
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    </LinearGradient>
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
};

/* ------------------------------------------------------------------ */
/* 🚀 MAIN SCREEN                                                      */
/* ------------------------------------------------------------------ */
export default function AdminRewardRequestsScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [filter, setFilter] = useState<string>('All');

    const headerIn = useRef(new Animated.Value(0)).current;
    const spin = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(headerIn, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        const loop = Animated.loop(
            Animated.timing(spin, { toValue: 1, duration: 2400, easing: Easing.linear, useNativeDriver: true })
        );
        loop.start();
        return () => loop.stop();
    }, []);

    // 🔥 FETCH ALL GRANT REQUESTS (Real-time) 🔥
    useEffect(() => {
        const q = query(collection(db, "reward_requests"), orderBy("requestDate", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            const reqData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRequests(reqData);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // ✅ AUTHORIZE GRANT PROTOCOL ✅
    const handleApprove = async (req: any) => {
        Alert.alert(
            "Authorize Grant Fulfillment?",
            `Confirm delivery of ${req.voucherValue} ${req.voucherName} to ${req.userEmail}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm Delivery",
                    style: "default",
                    onPress: async () => {
                        setProcessingId(req.id);
                        try {
                            // 1. Update Request Status to Delivered in central ledger
                            await updateDoc(doc(db, "reward_requests", req.id), {
                                status: "Delivered",
                                processedDate: serverTimestamp()
                            });

                            // 2. Synchronize associated transaction node to success
                            const txQuery = query(collection(db, "transactions"), 
                                where("userId", "==", req.userId), 
                                where("type", "==", "VOUCHER_REDEEM"),
                                where("status", "==", "pending")
                            );
                            const txSnap = await getDocs(txQuery);
                            txSnap.forEach(async (txDoc) => {
                                await updateDoc(doc(db, "transactions", txDoc.id), {
                                    status: "success"
                                });
                            });

                            Alert.alert("Success", "System Grant Marked as Fulfilled.");
                        } catch (error) {
                            console.error(error);
                            Alert.alert("Error", "Failed to synchronize grant record.");
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };

    // ❌ DECLINE & REVERSAL PROTOCOL ❌
    const handleReject = async (req: any) => {
        Alert.alert(
            "Decline & Unit Reversal?",
            `This will decline the request and reverse ${req.costDeducted} units back to the user wallet. Proceed?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Decline & Reverse",
                    style: "destructive",
                    onPress: async () => {
                        setProcessingId(req.id);
                        try {
                            // 1. Update Request Status to Rejected for audit trail
                            await updateDoc(doc(db, "reward_requests", req.id), {
                                status: "Rejected",
                                processedDate: serverTimestamp()
                            });

                            // 2. Atomic reversal of units back to user profile
                            await updateDoc(doc(db, "users", req.userId), {
                                balance: increment(req.costDeducted),
                                beansBalance: increment(req.costDeducted),
                                walletBalance: increment(req.costDeducted)
                            });

                            // 3. Update associated transaction node as failed/reversed
                            const txQuery = query(collection(db, "transactions"), 
                                where("userId", "==", req.userId), 
                                where("type", "==", "VOUCHER_REDEEM"),
                                where("status", "==", "pending")
                            );
                            const txSnap = await getDocs(txQuery);
                            txSnap.forEach(async (txDoc) => {
                                await updateDoc(doc(db, "transactions", txDoc.id), {
                                    status: "failed",
                                    title: `Reversed: ${req.voucherName}`
                                });
                            });

                            Alert.alert("Reversed", "Request declined and units synchronized.");
                        } catch (error) {
                            console.error(error);
                            Alert.alert("Error", "Failed to process grant reversal.");
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loader}>
                <View style={styles.loaderRingWrap}>
                    <Animated.View
                        style={[
                            styles.loaderRing,
                            {
                                transform: [
                                    { perspective: 600 },
                                    { rotateX: '65deg' },
                                    { rotateZ: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }
                                ]
                            }
                        ]}
                    />
                    <ActivityIndicator size="large" color="#3B82F6" />
                </View>
                <Text style={styles.loaderText}>SYNCHRONIZING SECURE LOGS...</Text>
            </View>
        );
    }

    // 📊 LIVE COUNTS
    const pendingCount = requests.filter(r => r.status === 'Pending').length;
    const deliveredCount = requests.filter(r => r.status === 'Delivered').length;
    const rejectedCount = requests.filter(r => r.status === 'Rejected').length;
    const pendingUnits = requests
        .filter(r => r.status === 'Pending')
        .reduce((sum, r) => sum + (Number(r.costDeducted) || 0), 0);

    const visibleRequests = filter === 'All' ? requests : requests.filter(r => r.status === filter);

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <LinearGradient colors={['#0F172A', '#020617', '#000000']} style={StyleSheet.absoluteFill} />

            {/* 🌌 DEPTH LAYER: FLOATING AURORA ORBS */}
            <FloatingOrb size={width * 0.8} colors={['#3B82F6', 'transparent']} top={-width * 0.25} left={-width * 0.25} duration={5200} travel={26} />
            <FloatingOrb size={width * 0.7} colors={['#8B5CF6', 'transparent']} top={width * 0.9} right={-width * 0.35} duration={6400} travel={32} />
            <FloatingOrb size={width * 0.55} colors={['#06B6D4', 'transparent']} top={width * 1.7} left={-width * 0.2} duration={7200} travel={22} />

            {/* 🛡️ SYSTEM HEADER */}
            <Animated.View
                style={[
                    styles.header,
                    {
                        opacity: headerIn,
                        transform: [{ translateY: headerIn.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }]
                    }
                ]}
            >
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>System Grants</Text>
                    <Text style={styles.headerSub}>Operational Control Center</Text>
                </View>
                <View style={styles.liveChip}>
                    <PulseDot color="#10B981" size={6} />
                    <Text style={styles.liveText}>LIVE</Text>
                </View>
            </Animated.View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* 📊 COMMAND STATS */}
                {requests.length > 0 && (
                    <>
                        <View style={styles.statsRow}>
                            <StatTile label="PENDING" value={pendingCount} color="#F59E0B" icon="hourglass" delay={0} />
                            <StatTile label="DELIVERED" value={deliveredCount} color="#10B981" icon="checkmark-done" delay={90} />
                            <StatTile label="REJECTED" value={rejectedCount} color="#EF4444" icon="close-circle" delay={180} />
                        </View>

                        <LinearGradient
                            colors={['rgba(59,130,246,0.25)', 'rgba(139,92,246,0.12)', 'rgba(15,23,42,0.6)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroBanner}
                        >
                            <View>
                                <Text style={styles.heroLabel}>UNITS AWAITING DECISION</Text>
                                <Text style={styles.heroValue}>{pendingUnits.toLocaleString()} 💎</Text>
                            </View>
                            <View style={styles.heroIcon}>
                                <MaterialCommunityIcons name="shield-check" size={28} color="#60A5FA" />
                            </View>
                        </LinearGradient>

                        {/* 🎚️ FILTER CHIPS */}
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                            {FILTERS.map(f => {
                                const active = filter === f;
                                return (
                                    <TouchableOpacity
                                        key={f}
                                        activeOpacity={0.8}
                                        onPress={() => setFilter(f)}
                                        style={[styles.filterChip, active && styles.filterChipActive]}
                                    >
                                        <Text style={[styles.filterText, active && styles.filterTextActive]}>{f}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    </>
                )}

                {requests.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <MaterialCommunityIcons name="inbox-outline" size={60} color="rgba(255,255,255,0.2)" />
                        <Text style={styles.emptyText}>No pending allocations found.</Text>
                    </View>
                ) : visibleRequests.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <MaterialCommunityIcons name="filter-remove-outline" size={54} color="rgba(255,255,255,0.2)" />
                        <Text style={styles.emptyText}>No {filter.toLowerCase()} allocations.</Text>
                    </View>
                ) : (
                    visibleRequests.map((req, index) => (
                        <RequestCard
                            key={`${filter}-${req.id}`}
                            req={req}
                            index={index}
                            processingId={processingId}
                            onApprove={handleApprove}
                            onReject={handleReject}
                        />
                    ))
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    loaderRingWrap: { width: 110, height: 110, alignItems: 'center', justifyContent: 'center' },
    loaderRing: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: 'rgba(59,130,246,0.6)', borderTopColor: '#8B5CF6' },
    loaderText: { color: '#3B82F6', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 15 },
    
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, gap: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { width: 45, height: 45, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
    headerSub: { color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    liveChip: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingRight: 10, paddingLeft: 4, height: 28, borderRadius: 14, backgroundColor: 'rgba(16,185,129,0.12)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)' },
    liveText: { color: '#10B981', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },

    scrollContent: { padding: 20, paddingBottom: 50 },

    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
    statTile: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    statIconWrap: { width: 26, height: 26, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
    statValue: { fontSize: 24, fontWeight: '900' },
    statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 8, fontWeight: '800', letterSpacing: 1.2, marginTop: 2 },

    heroBanner: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderRadius: 22, marginBottom: 18, borderWidth: 1, borderColor: 'rgba(96,165,250,0.25)' },
    heroLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '800', letterSpacing: 1.4, marginBottom: 6 },
    heroValue: { color: '#FFF', fontSize: 28, fontWeight: '900' },
    heroIcon: { width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(59,130,246,0.15)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)' },

    filterRow: { gap: 10, paddingBottom: 20 },
    filterChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    filterChipActive: { backgroundColor: '#3B82F6', borderColor: '#60A5FA' },
    filterText: { color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    filterTextActive: { color: '#FFF' },

    emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700', marginTop: 15, letterSpacing: 1 },

    cardRim: { borderRadius: 26, padding: 1.5 },
    cardBody: { backgroundColor: '#0B1224', padding: 20, borderRadius: 25, overflow: 'hidden' },
    reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5, gap: 10 },
    identity: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    avatar: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
    avatarText: { color: '#020617', fontSize: 18, fontWeight: '900' },
    reqUser: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
    statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    reqEmail: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginTop: 2 },
    
    perforation: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 18 },
    dash: { width: 6, height: 2, borderRadius: 1 },
    
    detailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
    detailValue: { color: '#FFF', fontSize: 15, fontWeight: '800' },
    detailDiamond: { color: '#60A5FA', fontSize: 16, fontWeight: '900' },
    costChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.12)', borderWidth: 1, borderColor: 'rgba(96,165,250,0.3)' },
    dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    dateText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '700' },

    actionRow: { flexDirection: 'row', gap: 10, marginTop: 22 },
    actionBtn: { flex: 1, paddingVertical: 15, borderRadius: 14, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    rejectBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
    rejectText: { color: '#EF4444', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    approveBtn: { backgroundColor: '#10B981' },
    approveText: { color: '#020617', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    shine: { position: 'absolute', top: 0, bottom: 0, width: 50, backgroundColor: 'rgba(255,255,255,0.35)' }
});
