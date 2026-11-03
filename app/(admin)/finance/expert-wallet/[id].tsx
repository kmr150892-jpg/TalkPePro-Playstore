import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../../firebaseConfig';

const { width } = Dimensions.get('window');

/* ============================================================
   🎬 3D REVEAL WRAPPER - every section flips up in 3D, staggered
   ============================================================ */
const Reveal = ({ index = 0, children, style }: { index?: number; children: React.ReactNode; style?: any }) => {
    const v = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(v, {
            toValue: 1,
            duration: 650,
            delay: 250 + index * 140,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: v,
                    transform: [
                        { perspective: 900 },
                        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [45, 0] }) },
                        { rotateX: v.interpolate({ inputRange: [0, 1], outputRange: ['22deg', '0deg'] }) },
                        { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                    ],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
};

/* ============================================================
   🏷️ SECTION TITLE - glowing dot + fading rule line
   ============================================================ */
const SectionTitle = ({ title }: { title: string }) => (
    <View style={styles.sectionTitleRow}>
        <View style={styles.sectionTitleDot} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <LinearGradient
            colors={['#6366F155', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sectionRule}
        />
    </View>
);

const ExpertWalletDetail = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [expert, setExpert] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    /* ---------- 🎞️ ANIMATION VALUES ---------- */
    const cardIn = useRef(new Animated.Value(0)).current;     // 3D balance card entrance
    const tilt = useRef(new Animated.Value(0)).current;       // balance card idle 3D tilt
    const shine = useRef(new Animated.Value(0)).current;      // metallic shine sweep
    const pulse = useRef(new Animated.Value(0)).current;      // chip / avatar pulse
    const orbA = useRef(new Animated.Value(0)).current;
    const orbB = useRef(new Animated.Value(0)).current;
    const nudge = useRef(new Animated.Value(0)).current;      // action arrow nudge
    const floatIcon = useRef(new Animated.Value(0)).current;  // empty-state icon float
    const headerIn = useRef(new Animated.Value(0)).current;

    /* ---------- 🔢 BALANCE COUNT-UP ---------- */
    const balanceTarget = expert?.walletBalance || 0;
    const countAnim = useRef(new Animated.Value(0)).current;
    const [displayBalance, setDisplayBalance] = useState(0);

    useEffect(() => {
        Animated.timing(headerIn, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        Animated.spring(cardIn, { toValue: 1, friction: 7, tension: 40, delay: 150, useNativeDriver: true }).start();

        const loopTiming = (val: Animated.Value, duration: number, delay = 0) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(val, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                    Animated.timing(val, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                ])
            );
        const l1 = loopTiming(tilt, 3200);
        const l2 = loopTiming(pulse, 1100);
        const l3 = loopTiming(orbA, 6000);
        const l4 = loopTiming(orbB, 7500, 800);
        const l5 = loopTiming(nudge, 700);
        const l6 = loopTiming(floatIcon, 2200);
        const l7 = Animated.loop(
            Animated.sequence([
                Animated.delay(2200),
                Animated.timing(shine, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        [l1, l2, l3, l4, l5, l6, l7].forEach(l => l.start());
        return () => [l1, l2, l3, l4, l5, l6, l7].forEach(l => l.stop());
    }, []);

    // count-up runs whenever the live wallet balance changes (JS-driven, only updates text)
    useEffect(() => {
        const listenerId = countAnim.addListener(({ value }) => setDisplayBalance(Math.round(value)));
        Animated.timing(countAnim, {
            toValue: balanceTarget,
            duration: 1400,
            delay: 400,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: false,
        }).start(() => setDisplayBalance(balanceTarget));
        return () => countAnim.removeListener(listenerId);
    }, [balanceTarget]);

    useEffect(() => {
        if (!id) return;
        
        // 🔥 SYSTEM LIVE LISTENER: Allocation Metrics & Operational Analytics
        const docRef = doc(db, "users", id as string);
        const unsubExpert = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                setExpert({ id: snap.id, ...snap.data() });
            }
            setLoading(false);
        }, (error) => {
            console.error("Firestore Sync Error:", error);
            setLoading(false);
        });

        return () => unsubExpert();
    }, [id]);

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#6366F1" />
        </View>
    );

    // 💡 Logic: Calculating Estimated Distribution (Standardized Unit Mapping)
    const estimatedACTIVITY_REWARD = (expert?.walletBalance || 0);

    /* ---------- 🎨 DERIVED ANIMATION STYLES ---------- */
    const cardTransform = [
        { perspective: 1000 },
        { translateY: cardIn.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
        { rotateX: cardIn.interpolate({ inputRange: [0, 1], outputRange: ['35deg', '0deg'] }) },
        { scale: cardIn.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
        { rotateY: tilt.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) },
        { rotateX: tilt.interpolate({ inputRange: [0, 1], outputRange: ['1.5deg', '-1.5deg'] }) },
    ];
    const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-width, width * 1.2] });
    const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });
    const haloScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
    const haloOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
    const orbAY = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });
    const orbAX = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
    const orbBY = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
    const orbBX = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -35] });
    const nudgeX = nudge.interpolate({ inputRange: [0, 1], outputRange: [0, 8] });
    const iconFloatY = floatIcon.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0F172A', '#020617']} style={StyleSheet.absoluteFill} />

            {/* 🌌 AURORA FLOATING ORBS (background depth) */}
            <Animated.View pointerEvents="none" style={[styles.orb, styles.orbA, { transform: [{ translateX: orbAX }, { translateY: orbAY }] }]} />
            <Animated.View pointerEvents="none" style={[styles.orb, styles.orbB, { transform: [{ translateX: orbBX }, { translateY: orbBY }] }]} />
            <Animated.View pointerEvents="none" style={[styles.orb, styles.orbC, { transform: [{ translateY: orbAY }] }]} />
            
            {/* 🚀 OPERATIONAL HEADER */}
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
                <Text style={styles.headerTitle}>FINANCIAL ANALYTICS</Text>
                <View style={styles.avatarWrap}>
                    <Animated.View style={[styles.avatarHalo, { opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
                    <View style={styles.expertMiniProfile}>
                        <Text style={styles.avatarChar}>
                            {expert?.name ? expert.name[0].toUpperCase() : 'C'}
                        </Text>
                    </View>
                </View>
            </Animated.View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                
                {/* 💎 NEUMORPHIC BALANCE INTERFACE - 3D HOLO CARD */}
                <Animated.View style={[styles.cardContainer, { transform: cardTransform }]}>
                    {/* pulsing indigo glow behind the card */}
                    <Animated.View style={[styles.cardGlow, { opacity: glowOpacity }]} />

                    <LinearGradient 
                        colors={['#6366F1', '#4338CA']} 
                        start={{x:0, y:0}} 
                        end={{x:1, y:1}} 
                        style={styles.balanceCard}
                    >
                        {/* decorative depth layers */}
                        <LinearGradient
                            colors={['rgba(255,255,255,0.22)', 'transparent', 'rgba(0,0,0,0.25)']}
                            locations={[0, 0.5, 1]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                        <View style={styles.cardCircleA} />
                        <View style={styles.cardCircleB} />

                        {/* METALLIC SHINE SWEEP */}
                        <Animated.View pointerEvents="none" style={[styles.shine, { transform: [{ translateX: shineX }, { rotate: '20deg' }] }]}>
                            <LinearGradient
                                colors={['transparent', 'rgba(255,255,255,0.28)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ flex: 1 }}
                            />
                        </Animated.View>

                        <View style={styles.cardTop}>
                            <View>
                                <Text style={styles.balanceLabel}>AVAILABLE ALLOCATIONS</Text>
                                <View style={styles.row}>
                                    <MaterialCommunityIcons name="seed" size={24} color="#A5B4FC" />
                                    <Text style={styles.balanceValue}> ₹{displayBalance.toLocaleString()}</Text>
                                </View>
                            </View>
                            <View style={styles.chip}>
                                <Text style={styles.chipText}>{expert?.status === 'Approved' ? 'VERIFIED' : 'ACTIVE'}</Text>
                            </View>
                        </View>

                        <View style={styles.rupeeEquivalent}>
                            <Text style={styles.eqLabel}>Estimated Distribution:</Text>
                            <Text style={styles.eqValue}>₹{estimatedACTIVITY_REWARD.toLocaleString()}</Text>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Lifetime Units</Text>
                                <Text style={styles.statValue}>{expert?.totalBeansEarned || 0}</Text>
                            </View>
                            <View style={styles.vDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Total Sessions</Text>
                                <Text style={styles.statValue}>{expert?.totalCallsHandled || 0}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* 📊 SYSTEM INSIGHTS SECTION */}
                <Reveal index={0} style={styles.section}>
                    <SectionTitle title="HOST CONFIGURATION" />
                    
                    <View style={styles.infoBox}>
                        <LinearGradient colors={['#6366F114', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                        <View style={styles.infoRow}>
                            <View style={[styles.iconWrap, { backgroundColor: '#10B98120' }]}>
                                <Feather name="trending-up" size={16} color="#10B981" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>Platform Service Fee</Text>
                                <Text style={styles.infoValue}>Enterprise Standard (10%)</Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={[styles.iconWrap, { backgroundColor: '#F59E0B20' }]}>
                                <Feather name="clock" size={16} color="#F59E0B" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>Session Rate</Text>
                                <Text style={styles.infoValue}>{expert?.beansPerMin || 1000} Units / min</Text>
                            </View>
                        </View>
                    </View>
                </Reveal>

                {/* 🕒 GRANT QUEUE */}
                <Reveal index={1} style={styles.section}>
                    <SectionTitle title="RECENT DISTRIBUTIONS" />
                    <View style={styles.emptyBox}>
                        <BlurView intensity={5} style={styles.emptyBlur}>
                            <Animated.View style={{ transform: [{ perspective: 800 }, { translateY: iconFloatY }, { rotateX: '12deg' }] }}>
                                <MaterialCommunityIcons name="history" size={40} color="#1E293B" />
                            </Animated.View>
                            <Text style={styles.emptyText}>No recent distribution logs</Text>
                        </BlurView>
                    </View>
                </Reveal>

                {/* ⚡ ACTION INTERFACE */}
                <Reveal index={2}>
                    <TouchableOpacity 
                        style={styles.ACTIVITY_REWARDBtn} 
                        onPress={() => router.push(`/(admin)/withdrawals?expertId=${id}` as any)}
                    >
                        <LinearGradient 
                            colors={['#0F172A', '#1E293B']} 
                            style={styles.ACTIVITY_REWARDGradient}
                        >
                            <LinearGradient
                                colors={['#6366F122', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <MaterialCommunityIcons name="shield-search" size={22} color="#6366F1" />
                            <Text style={styles.ACTIVITY_REWARDBtnText}>AUDIT REDEMPTIONS REQUESTS</Text>
                            <Animated.View style={{ transform: [{ translateX: nudgeX }] }}>
                                <Feather name="arrow-right" size={18} color="#6366F1" />
                            </Animated.View>
                        </LinearGradient>
                    </TouchableOpacity>
                </Reveal>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    center: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },

    /* background orbs */
    orb: { position: 'absolute', borderRadius: 999 },
    orbA: { width: 280, height: 280, top: -60, right: -90, backgroundColor: 'rgba(99,102,241,0.18)' },
    orbB: { width: 240, height: 240, top: 420, left: -110, backgroundColor: 'rgba(139,92,246,0.14)' },
    orbC: { width: 200, height: 200, bottom: 100, right: -80, backgroundColor: 'rgba(16,185,129,0.08)' },

    header: { 
        paddingTop: 60, 
        paddingBottom: 20, 
        paddingHorizontal: 25, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    backBtn: { backgroundColor: '#0F172A', padding: 12, borderRadius: 18, borderWidth: 1, borderColor: '#1E293B', shadowColor: '#6366F1', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    headerTitle: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    avatarWrap: { width: 45, height: 45, alignItems: 'center', justifyContent: 'center' },
    avatarHalo: { position: 'absolute', width: 45, height: 45, borderRadius: 15, backgroundColor: '#6366F1' },
    expertMiniProfile: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#6366F155' },
    avatarChar: { color: '#818CF8', fontWeight: '900', fontSize: 18 },
    
    cardContainer: { paddingHorizontal: 20, marginTop: 10 },
    cardGlow: { position: 'absolute', top: 30, left: 35, right: 35, bottom: -12, borderRadius: 40, backgroundColor: '#6366F1' },
    balanceCard: { 
        padding: 30, 
        borderRadius: 40, 
        overflow: 'hidden',
        elevation: 20, 
        shadowColor: '#6366F1', 
        shadowOpacity: 0.4, 
        shadowRadius: 20 
    },
    cardCircleA: { position: 'absolute', width: 200, height: 200, borderRadius: 100, top: -70, right: -60, backgroundColor: 'rgba(255,255,255,0.08)' },
    cardCircleB: { position: 'absolute', width: 150, height: 150, borderRadius: 75, bottom: -60, left: -40, backgroundColor: 'rgba(255,255,255,0.06)' },
    shine: { position: 'absolute', top: -60, bottom: -60, width: 90 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    balanceLabel: { color: '#E0E7FF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    row: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    balanceValue: { color: '#fff', fontSize: 48, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10 },
    chip: { backgroundColor: '#FFFFFF30', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#FFFFFF40' },
    chipText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    
    rupeeEquivalent: { marginTop: 15, backgroundColor: '#00000020', padding: 15, borderRadius: 20, borderWidth: 1, borderColor: '#FFFFFF15' },
    eqLabel: { color: '#C7D2FE', fontSize: 12, fontWeight: '600' },
    eqValue: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 2 },

    statsRow: { 
        flexDirection: 'row', 
        marginTop: 25, 
        paddingTop: 25, 
        borderTopWidth: 1, 
        borderTopColor: '#ffffff20', 
        justifyContent: 'space-around' 
    },
    statItem: { alignItems: 'center' },
    statLabel: { color: '#E0E7FF', fontSize: 10, fontWeight: '700' },
    statValue: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 5 },
    vDivider: { width: 1, backgroundColor: '#ffffff20', height: '100%' },

    section: { paddingHorizontal: 25, marginTop: 35 },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    sectionTitleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#6366F1', marginRight: 10, shadowColor: '#6366F1', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
    sectionTitle: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    sectionRule: { flex: 1, height: 1, marginLeft: 12 },
    infoBox: { backgroundColor: '#0F172A', borderRadius: 30, padding: 20, paddingBottom: 0, borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden', shadowColor: '#6366F1', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    infoLabel: { color: '#475569', fontSize: 11, fontWeight: '700' },
    infoValue: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 2 },
    
    emptyBox: { height: 160, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: '#1E293B', borderStyle: 'dashed' },
    emptyBlur: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#1E293B', marginTop: 12, fontWeight: '900', fontSize: 12, letterSpacing: 1 },

    ACTIVITY_REWARDBtn: { margin: 25, height: 75, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: '#6366F130', shadowColor: '#6366F1', shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
    ACTIVITY_REWARDGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 15 },
    ACTIVITY_REWARDBtnText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1.5 }
});

export default ExpertWalletDetail;