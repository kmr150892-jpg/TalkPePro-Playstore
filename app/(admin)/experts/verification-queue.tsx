import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
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

/* ============================================================
   🕒 "applied X ago" helper (only used when createdAt exists)
   ============================================================ */
const timeAgo = (seconds: number) => {
    if (!seconds) return '';
    const diff = Math.max(0, Math.floor(Date.now() / 1000) - seconds);
    if (diff < 60) return 'JUST NOW';
    if (diff < 3600) return `${Math.floor(diff / 60)}M AGO`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}H AGO`;
    return `${Math.floor(diff / 86400)}D AGO`;
};

/* ============================================================
   🃏 3D QUEUE CARD - flips in with perspective, avatar pulses,
   shimmer sweeps across, chevron nudges to invite the tap
   ============================================================ */
const QueueCard = ({ item, index, onPress }: { item: any; index: number; onPress: () => void }) => {
    const photo = item.photoURL || item.profilePic || item.profileImage || 'https://via.placeholder.com/150';

    const enter = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(0)).current;
    const sweep = useRef(new Animated.Value(0)).current;
    const nudge = useRef(new Animated.Value(0)).current;

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
                Animated.delay(1800 + (index % 3) * 500),
                Animated.timing(sweep, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        const nudgeLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(nudge, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(nudge, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            ])
        );
        pulseLoop.start();
        sweepLoop.start();
        nudgeLoop.start();
        return () => { pulseLoop.stop(); sweepLoop.stop(); nudgeLoop.stop(); };
    }, []);

    const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2] });
    const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
    const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.1, 0.3] });
    const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-120, 420] });
    const nudgeX = nudge.interpolate({ inputRange: [0, 1], outputRange: [0, 5] });

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
            {/* amber glow behind each pending card */}
            <Animated.View style={[styles.cardGlow, { opacity: glowOpacity }]} />

            <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.card}
                // 🔥 ROUTING FIX: Path correction based on your secure folder structure
                onPress={onPress}
            >
                <LinearGradient
                    colors={['rgba(245,158,11,0.14)', 'transparent', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                />

                {/* shimmer sweep */}
                <Animated.View pointerEvents="none" style={[styles.shimmer, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
                    <LinearGradient
                        colors={['transparent', 'rgba(251,191,36,0.14)', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={{ flex: 1 }}
                    />
                </Animated.View>

                {/* queue position tag */}
                <View style={styles.queueTag}>
                    <Text style={styles.queueTagText}>#{index + 1}</Text>
                </View>

                <View style={styles.cardContent}>
                    <View style={styles.avatarContainer}>
                        <View style={styles.avatarRing}>
                            <Image source={{ uri: photo }} style={styles.avatar} />
                        </View>
                        {/* System pulse for Pending status */}
                        <Animated.View style={[styles.pulseHalo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
                        <View style={styles.activePulse} />
                    </View>
                    
                    <View style={styles.info}>
                        <Text style={styles.name} numberOfLines={1}>{item.name || 'NEW CANDIDATE'}</Text>
                        <View style={styles.metaRow}>
                            <Feather name="tag" size={10} color="#6366F1" />
                            <Text style={styles.subText}>{item.category || 'General Call'}</Text>
                        </View>
                        {item.sortTime > 0 && (
                            <View style={styles.metaRow}>
                                <Feather name="clock" size={10} color="#F59E0B" />
                                <Text style={styles.timeText}>APPLIED {timeAgo(item.sortTime)}</Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.actionArea}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>REVIEW</Text>
                        </View>
                        <Animated.View style={{ marginTop: 5, transform: [{ translateX: nudgeX }] }}>
                            <Ionicons name="chevron-forward" size={16} color="#6366F1" />
                        </Animated.View>
                    </View>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

/* ============================================================
   🛡️ EMPTY STATE - floating shield with rotating orbit rings
   ============================================================ */
const EmptyState = () => {
    const float = useRef(new Animated.Value(0)).current;
    const spin = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const l1 = Animated.loop(
            Animated.sequence([
                Animated.timing(float, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(float, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        const l2 = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true }));
        l1.start();
        l2.start();
        return () => { l1.stop(); l2.stop(); };
    }, []);

    const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
    const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const rotateRev = spin.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

    return (
        <View style={styles.empty}>
            <Animated.View style={[styles.emptyStage, { transform: [{ perspective: 800 }, { translateY: floatY }, { rotateX: '12deg' }] }]}>
                <Animated.View style={[styles.orbitRing, styles.orbitRingOuter, { transform: [{ rotate: rotate }] }]} />
                <Animated.View style={[styles.orbitRing, styles.orbitRingInner, { transform: [{ rotate: rotateRev }] }]} />
                <View style={styles.emptyIconCircle}>
                    <Feather name="shield-off" size={40} color="#1E293B" />
                </View>
            </Animated.View>
            <Text style={styles.emptyTitle}>NO PENDING TASKS</Text>
            <Text style={styles.emptySub}>All host applications have been processed.</Text>
        </View>
    );
};

export default function VerificationQueue() {
    const router = useRouter();
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    /* ---------- 🎞️ HEADER / BACKGROUND / RADAR ANIMATIONS ---------- */
    const orbA = useRef(new Animated.Value(0)).current;
    const orbB = useRef(new Animated.Value(0)).current;
    const headerIn = useRef(new Animated.Value(0)).current;
    const radar = useRef(new Animated.Value(0)).current;

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
        const l3 = Animated.loop(Animated.timing(radar, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
        [l1, l2, l3].forEach(l => l.start());
        return () => [l1, l2, l3].forEach(l => l.stop());
    }, []);

    useEffect(() => {
        // 🔥 SYSTEM LOGIC: Pending host onboarding requests mattum fetch pannum
        const q = query(
            collection(db, "users"), 
            where("isApplying", "==", true),
            where("status", "==", "Pending")
        ); 
        
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => {
                const data = d.data();
                return { 
                    id: d.id, 
                    ...data,
                    // Timestamp-ah numeric value-ah mathikrom sorting-kaga
                    sortTime: data.createdAt?.seconds || 0 
                };
            });

            // ✅ Error Fixed: sortTime vachi safety-ah sort pannuvom
            const sortedList = list.sort((a, b) => b.sortTime - a.sortTime);
            
            setApplications(sortedList);
            setLoading(false);
        }, (error) => {
            console.error("Queue Sync Error:", error);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const renderItem = ({ item, index }: any) => {
        return (
            <QueueCard
                item={item}
                index={index}
                onPress={() => router.push(`/(admin)/experts/verify-expert/${item.id}` as any)}
            />
        );
    };

    const orbAY = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });
    const orbAX = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
    const orbBY = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
    const orbBX = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -35] });
    const radarScale = radar.interpolate({ inputRange: [0, 1], outputRange: [0.4, 2.2] });
    const radarOpacity = radar.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0F172A']} style={StyleSheet.absoluteFill} />

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
                    <LinearGradient colors={['#1E293B', '#0F172A']} style={StyleSheet.absoluteFill} />
                    <Feather name="arrow-left" size={20} color="#6366F1" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.title}>INBOUND QUEUE</Text>
                    <Text style={styles.subtitle}>AWAITING SYSTEM AUTHORIZATION</Text>
                </View>
                {/* live pending counter */}
                <View style={styles.countPill}>
                    <MaterialCommunityIcons name="account-clock-outline" size={14} color="#F59E0B" />
                    <Text style={styles.countPillText}>{loading ? '-' : applications.length}</Text>
                </View>
            </Animated.View>

            {loading ? (
                <View style={styles.center}>
                    <View style={styles.radarWrap}>
                        <Animated.View style={[styles.radarRing, { opacity: radarOpacity, transform: [{ scale: radarScale }] }]} />
                        <ActivityIndicator color="#6366F1" size="large" />
                    </View>
                    <Text style={styles.loadingText}>SCANNING DATABASE...</Text>
                </View>
            ) : (
                <FlatList
                    data={applications}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={<EmptyState />}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    /* background orbs */
    orb: { position: 'absolute', borderRadius: 999 },
    orbA: { width: 280, height: 280, top: -70, right: -90, backgroundColor: 'rgba(99,102,241,0.18)' },
    orbB: { width: 240, height: 240, top: 380, left: -110, backgroundColor: 'rgba(139,92,246,0.14)' },
    orbC: { width: 200, height: 200, bottom: 80, right: -80, backgroundColor: 'rgba(245,158,11,0.07)' },

    header: { paddingTop: 60, paddingHorizontal: 25, marginBottom: 25, flexDirection: 'row', alignItems: 'center', gap: 15 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden', shadowColor: '#6366F1', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    title: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1.5, textShadowColor: 'rgba(99,102,241,0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
    subtitle: { color: '#6366F1', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginTop: 2 },
    countPill: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(245,158,11,0.12)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(245,158,11,0.35)' },
    countPillText: { color: '#F59E0B', fontSize: 14, fontWeight: '900' },

    radarWrap: { width: 90, height: 90, alignItems: 'center', justifyContent: 'center' },
    radarRing: { position: 'absolute', width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#6366F1' },
    loadingText: { color: '#475569', fontSize: 10, fontWeight: '900', marginTop: 15, letterSpacing: 2 },
    list: { paddingHorizontal: 20, paddingBottom: 40 },

    cardGlow: { position: 'absolute', top: 14, left: 16, right: 16, bottom: 2, borderRadius: 26, backgroundColor: '#F59E0B' },
    card: { backgroundColor: '#0F172A', padding: 18, borderRadius: 28, marginBottom: 12, borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 10 }, elevation: 9 },
    shimmer: { position: 'absolute', top: -40, bottom: -40, width: 90 },
    queueTag: { position: 'absolute', top: 0, left: 0, backgroundColor: 'rgba(99,102,241,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderBottomRightRadius: 12 },
    queueTagText: { color: '#A5B4FC', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    cardContent: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    avatarContainer: { position: 'relative' },
    avatarRing: { padding: 3, borderRadius: 22, borderWidth: 1.5, borderColor: 'rgba(245,158,11,0.45)' },
    avatar: { width: 55, height: 55, borderRadius: 18, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
    pulseHalo: { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#F59E0B' },
    activePulse: { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#F59E0B', borderWidth: 2, borderColor: '#0F172A' },
    info: { flex: 1, marginLeft: 15 },
    name: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
    subText: { color: '#475569', fontSize: 11, fontWeight: '700' },
    timeText: { color: '#B45309', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
    actionArea: { alignItems: 'flex-end' },
    badge: { backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' },
    badgeText: { color: '#F59E0B', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

    empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyStage: { width: 170, height: 170, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
    orbitRing: { position: 'absolute', borderRadius: 999, borderStyle: 'dashed' },
    orbitRingOuter: { width: 170, height: 170, borderWidth: 1.5, borderColor: 'rgba(99,102,241,0.45)' },
    orbitRingInner: { width: 130, height: 130, borderWidth: 1, borderColor: 'rgba(139,92,246,0.35)' },
    emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E293B', shadowColor: '#6366F1', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
    emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    emptySub: { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 18, fontWeight: '600' }
});
