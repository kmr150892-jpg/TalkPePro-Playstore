import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../../firebaseConfig';

const { width } = Dimensions.get('window');

/* ───────────────────────── 3D / ANIMATION BUILDING BLOCKS ───────────────────────── */

// 3D press tilt
const Press3D = ({ children, style, onPress }: any) => {
    const p = useRef(new Animated.Value(0)).current;
    const pressIn = () => Animated.spring(p, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
    const pressOut = () => Animated.spring(p, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 10 }).start();
    const scale = p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });
    const rotateX = p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '7deg'] });
    return (
        <TouchableOpacity activeOpacity={1} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
            <Animated.View style={[style, { transform: [{ perspective: 800 }, { rotateX }, { scale }] }]}>
                {children}
            </Animated.View>
        </TouchableOpacity>
    );
};

// Staggered entrance (fade + rise + flip-up)
const Reveal = ({ index = 0, children, style }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(v, {
            toValue: 1,
            duration: 540,
            delay: index * 110,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
        }).start();
    }, []);
    const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [38, 0] });
    const rotateX = v.interpolate({ inputRange: [0, 1], outputRange: ['-15deg', '0deg'] });
    return (
        <Animated.View style={[style, { opacity: v, transform: [{ perspective: 900 }, { translateY }, { rotateX }] }]}>
            {children}
        </Animated.View>
    );
};

// Integer count-up (lands on the exact value)
const CountUp = ({ value, style }: { value: number; style?: any }) => {
    const anim = useRef(new Animated.Value(0)).current;
    const [display, setDisplay] = useState(0);
    useEffect(() => {
        const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
        Animated.timing(anim, { toValue: value, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
            if (finished) setDisplay(value);
        });
        return () => anim.removeListener(id);
    }, [value]);
    return <Text style={style}>{display}</Text>;
};

// Gently bobbing wrapper
const FloatBox = ({ children, delay = 0 }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const l = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(v, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(v, { toValue: 0, duration: 1600, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        l.start();
        return () => l.stop();
    }, []);
    const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
    return <Animated.View style={{ transform: [{ translateY }] }}>{children}</Animated.View>;
};

// Rotating orbit (indigo = users, amber = hosts) around a network icon
const NetworkOrbit = () => {
    const spin = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const l1 = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 8000, easing: Easing.linear, useNativeDriver: true }));
        const l2 = Animated.loop(
            Animated.sequence([
                Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(pulse, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        l1.start(); l2.start();
        return () => { l1.stop(); l2.stop(); };
    }, []);
    const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const counter = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });
    const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
    const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
    return (
        <View style={styles.orbitWrap}>
            <Animated.View style={[styles.orbitPulse, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
            <View style={styles.orbitRing} />
            <Animated.View style={[styles.orbitSpinner, { transform: [{ rotate }] }]}>
                <View style={[styles.orbitDot, { top: -6, left: 57, backgroundColor: '#6366F1', shadowColor: '#6366F1' }]} />
                <View style={[styles.orbitDot, { bottom: -6, left: 57, backgroundColor: '#F59E0B', shadowColor: '#F59E0B' }]} />
            </Animated.View>
            <Animated.View style={[styles.orbitCore, { transform: [{ rotate: counter }] }]}>
                <MaterialCommunityIcons name="account-network" size={34} color="#FBBF24" />
            </Animated.View>
        </View>
    );
};

// Floating glow orbs background
const BackgroundOrbs = () => {
    const a = useRef(new Animated.Value(0)).current;
    const b = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const la = Animated.loop(
            Animated.sequence([
                Animated.timing(a, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(a, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        const lb = Animated.loop(
            Animated.sequence([
                Animated.timing(b, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(b, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        la.start(); lb.start();
        return () => { la.stop(); lb.stop(); };
    }, []);
    const aY = a.interpolate({ inputRange: [0, 1], outputRange: [0, 40] });
    const aX = a.interpolate({ inputRange: [0, 1], outputRange: [0, -25] });
    const bY = b.interpolate({ inputRange: [0, 1], outputRange: [0, -50] });
    const bX = b.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
    return (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <Animated.View style={[styles.orb, { top: -80, right: -90, width: 300, height: 300, backgroundColor: '#F59E0B', opacity: 0.1, transform: [{ translateY: aY }, { translateX: aX }] }]} />
            <Animated.View style={[styles.orb, { bottom: 80, left: -120, width: 320, height: 320, backgroundColor: '#6366F1', opacity: 0.13, transform: [{ translateY: bY }, { translateX: bX }] }]} />
        </View>
    );
};

// Section heading with accent bar
const SectionHeader = ({ title, color = '#F59E0B' }: any) => (
    <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionAccent, { backgroundColor: color }]} />
        <Text style={styles.sectionTitleInline}>{title}</Text>
    </View>
);

// Animated distribution bar (hosts = amber fill, users = indigo track)
const DistributionBar = ({ pct }: { pct: number }) => {
    const fill = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(fill, { toValue: pct, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, [pct]);
    const w = fill.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'], extrapolate: 'clamp' });
    return (
        <View style={styles.progressBar}>
            <Animated.View style={[styles.progressFill, { width: w as any }]} />
            {[25, 50, 75].map(t => (
                <View key={t} style={[styles.progressTick, { left: `${t}%` }]} />
            ))}
        </View>
    );
};

/* ───────────────────────────────── MAIN SCREEN ───────────────────────────────── */

const UserAnalytics = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState({ total: 0, users: 0, experts: 0 });

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snap) => {
            let uCount = 0;
            let eCount = 0;
            
            snap.docs.forEach(d => {
                // Role identifier logic kept exactly as configured in DB
                if (d.data().role === 'expert') eCount++;
                else uCount++;
            });

            setCounts({ total: snap.size, users: uCount, experts: eCount });
            setLoading(false);
        });
        return () => unsub();
    }, []);

    if (loading) return (
        <View style={styles.loader}>
            <BackgroundOrbs />
            <View style={styles.loaderRing}>
                <ActivityIndicator color="#F59E0B" size="large" />
            </View>
            <Text style={styles.loaderText}>COUNTING NETWORK...</Text>
        </View>
    );

    // 🆕 safety: avoid NaN% when there are no users yet (display only)
    const hostPct = counts.total > 0 ? (counts.experts / counts.total) * 100 : 0;
    const userPct = counts.total > 0 ? (counts.users / counts.total) * 100 : 0;

    return (
        <View style={styles.container}>
            <BackgroundOrbs />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                <Reveal index={0}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Feather name="arrow-left" size={24} color="#F59E0B" />
                        </TouchableOpacity>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.title}>USER BASE METRICS</Text>
                            <Text style={styles.titleSub}>Onboarding & Retention</Text>
                        </View>
                        <View style={styles.liveChip}>
                            <View style={styles.liveDot} />
                            <Text style={styles.liveChipText}>LIVE</Text>
                        </View>
                    </View>
                </Reveal>

                {/* TOTAL NETWORK HERO */}
                <Reveal index={1}>
                    <View style={styles.totalBox}>
                        <View style={styles.heroOrbA} />
                        <View style={styles.heroOrbB} />
                        <NetworkOrbit />
                        <Text style={styles.totalLabel}>TOTAL NETWORK SIZE</Text>
                        <CountUp value={counts.total} style={styles.totalValue} />
                        <View style={styles.totalChips}>
                            <View style={[styles.miniChip, { backgroundColor: '#6366F11F', borderColor: '#6366F155' }]}>
                                <View style={[styles.miniDot, { backgroundColor: '#6366F1' }]} />
                                <Text style={[styles.miniChipText, { color: '#A5B4FC' }]}>{userPct.toFixed(1)}% USERS</Text>
                            </View>
                            <View style={[styles.miniChip, { backgroundColor: '#F59E0B1F', borderColor: '#F59E0B55' }]}>
                                <View style={[styles.miniDot, { backgroundColor: '#F59E0B' }]} />
                                <Text style={[styles.miniChipText, { color: '#FBBF24' }]}>{hostPct.toFixed(1)}% HOSTS</Text>
                            </View>
                        </View>
                    </View>
                </Reveal>

                {/* USERS / HOSTS */}
                <SectionHeader title="NETWORK BREAKDOWN" />
                <Reveal index={2}>
                    <View style={styles.row}>
                        <Press3D style={[styles.statBox, { borderColor: '#6366F145', borderBottomColor: '#6366F1', shadowColor: '#6366F1' }]}>
                            <View style={[styles.statGlow, { backgroundColor: '#6366F1' }]} />
                            <FloatBox>
                                <View style={[styles.statIcon, { backgroundColor: '#6366F122', borderColor: '#6366F166', shadowColor: '#6366F1' }]}>
                                    <MaterialCommunityIcons name="account" size={30} color="#6366F1" />
                                </View>
                            </FloatBox>
                            <CountUp value={counts.users} style={styles.statNum} />
                            <Text style={styles.statLabel}>ACTIVE USERS</Text>
                        </Press3D>
                        <Press3D style={[styles.statBox, { borderColor: '#F59E0B45', borderBottomColor: '#F59E0B', shadowColor: '#F59E0B' }]}>
                            <View style={[styles.statGlow, { backgroundColor: '#F59E0B' }]} />
                            <FloatBox delay={400}>
                                <View style={[styles.statIcon, { backgroundColor: '#F59E0B22', borderColor: '#F59E0B66', shadowColor: '#F59E0B' }]}>
                                    <MaterialCommunityIcons name="star-face" size={30} color="#F59E0B" />
                                </View>
                            </FloatBox>
                            <CountUp value={counts.experts} style={styles.statNum} />
                            <Text style={styles.statLabel}>HOSTS</Text>
                        </Press3D>
                    </View>
                </Reveal>

                {/* DISTRIBUTION */}
                <SectionHeader title="DISTRIBUTION" color="#6366F1" />
                <Reveal index={3}>
                    <View style={styles.growthCard}>
                        <View style={styles.growthTop}>
                            <View style={styles.growthIcon}>
                                <MaterialCommunityIcons name="chart-donut" size={20} color="#F59E0B" />
                            </View>
                            <Text style={styles.growthText}>Network Distribution: {hostPct.toFixed(1)}% Hosts</Text>
                        </View>
                        <DistributionBar pct={hostPct} />
                        <View style={styles.legendRow}>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#F59E0B' }]} />
                                <Text style={styles.legendText}>HOSTS · {counts.experts}</Text>
                            </View>
                            <View style={styles.legendItem}>
                                <View style={[styles.legendDot, { backgroundColor: '#6366F1' }]} />
                                <Text style={styles.legendText}>USERS · {counts.users}</Text>
                            </View>
                        </View>
                    </View>
                </Reveal>

                <View style={{ height: 50 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    scrollContent: { padding: 22, paddingBottom: 40 },
    loader: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
    loaderRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 1, borderColor: '#78350F', backgroundColor: '#F59E0B12', alignItems: 'center', justifyContent: 'center', shadowColor: '#F59E0B', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
    loaderText: { color: '#475569', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 20 },
    orb: { position: 'absolute', borderRadius: 999 },

    header: { paddingTop: 40, flexDirection: 'row', alignItems: 'center', marginBottom: 28 },
    backBtn: { width: 46, height: 46, borderRadius: 16, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155', borderBottomWidth: 3, borderBottomColor: '#78350F', shadowColor: '#F59E0B', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    title: { color: '#fff', fontSize: 20, fontWeight: '900', marginLeft: 15, letterSpacing: 1, textShadowColor: '#F59E0B', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
    titleSub: { color: '#64748B', fontSize: 11, fontWeight: '700', marginLeft: 15, marginTop: 3 },
    liveChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B9811A', borderWidth: 1, borderColor: '#10B98155', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
    liveChipText: { color: '#10B981', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

    sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 30, marginBottom: 14 },
    sectionAccent: { width: 3, height: 14, borderRadius: 2, marginRight: 10 },
    sectionTitleInline: { color: '#94A3B8', fontSize: 11, fontWeight: '900', letterSpacing: 2 },

    totalBox: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 20, backgroundColor: '#0F172A', borderRadius: 36, borderWidth: 1, borderBottomWidth: 5, borderColor: '#1E293B', borderBottomColor: '#78350F', overflow: 'hidden', shadowColor: '#F59E0B', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
    heroOrbA: { position: 'absolute', top: -70, right: -50, width: 210, height: 210, borderRadius: 105, backgroundColor: '#F59E0B', opacity: 0.13 },
    heroOrbB: { position: 'absolute', bottom: -80, left: -40, width: 190, height: 190, borderRadius: 95, backgroundColor: '#6366F1', opacity: 0.12 },
    totalLabel: { color: '#64748B', fontSize: 12, fontWeight: '900', letterSpacing: 2, marginTop: 20 },
    totalValue: { color: '#fff', fontSize: 72, fontWeight: '900', textShadowColor: '#F59E0B', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
    totalChips: { flexDirection: 'row', gap: 10, marginTop: 8 },
    miniChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 7, borderRadius: 12, borderWidth: 1 },
    miniDot: { width: 6, height: 6, borderRadius: 3, marginRight: 7 },
    miniChipText: { fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },

    orbitWrap: { width: 130, height: 130, alignItems: 'center', justifyContent: 'center' },
    orbitPulse: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 1.5, borderColor: '#F59E0B' },
    orbitRing: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 1, borderColor: '#334155' },
    orbitSpinner: { position: 'absolute', width: 120, height: 120 },
    orbitDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, shadowOpacity: 0.9, shadowRadius: 9, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
    orbitCore: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#F59E0B1A', borderWidth: 1, borderColor: '#F59E0B66', alignItems: 'center', justifyContent: 'center', shadowColor: '#F59E0B', shadowOpacity: 0.7, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 8 },

    row: { flexDirection: 'row', justifyContent: 'space-between' },
    statBox: { backgroundColor: '#0F172A', width: (width - 66) / 2, padding: 22, borderRadius: 30, alignItems: 'center', borderWidth: 1, borderBottomWidth: 5, overflow: 'hidden', shadowOpacity: 0.4, shadowRadius: 18, shadowOffset: { width: 0, height: 9 }, elevation: 10 },
    statGlow: { position: 'absolute', top: -45, right: -45, width: 130, height: 130, borderRadius: 65, opacity: 0.16 },
    statIcon: { width: 58, height: 58, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
    statNum: { color: '#fff', fontSize: 30, fontWeight: '900', marginTop: 14 },
    statLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', marginTop: 5, letterSpacing: 1 },

    growthCard: { backgroundColor: '#0B1224', padding: 20, borderRadius: 26, borderWidth: 1, borderBottomWidth: 4, borderColor: '#1E293B', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
    growthTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
    growthIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F59E0B1F', borderWidth: 1, borderColor: '#F59E0B55', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
    growthText: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold', flex: 1 },
    progressBar: { height: 14, backgroundColor: '#6366F133', borderRadius: 10, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#F59E0B', borderRadius: 10, shadowColor: '#F59E0B', shadowOpacity: 0.9, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
    progressTick: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: '#020617', opacity: 0.6 },
    legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
    legendItem: { flexDirection: 'row', alignItems: 'center' },
    legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
    legendText: { color: '#94A3B8', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 }
});

export default UserAnalytics;