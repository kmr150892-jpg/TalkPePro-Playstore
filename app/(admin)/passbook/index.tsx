import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Easing,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

/* ============================================================
   🎬 3D POP-IN WRAPPER - cards flip up in 3D, staggered
   ============================================================ */
const Pop = ({ index = 0, children, style }: { index?: number; children: React.ReactNode; style?: any }) => {
    const v = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(v, { toValue: 1, friction: 7, tension: 45, delay: 150 + index * 160, useNativeDriver: true }).start();
    }, []);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: v.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
                    transform: [
                        { perspective: 900 },
                        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) },
                        { rotateX: v.interpolate({ inputRange: [0, 1], outputRange: ['35deg', '0deg'] }) },
                        { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
                    ],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
};

/* ============================================================
   🚪 PORTAL CARD - gradient border, idle 3D tilt, orbit icon, scan line
   ============================================================ */
const PortalCard = ({
    index,
    onPress,
    gradBg,
    borderColor,
    accent,
    iconBg,
    icon,
    title,
    sub,
    tag,
    tilt,
    dir,
    loop,
    pulse,
    shine,
}: any) => {
    const press = useRef(new Animated.Value(0)).current;

    const tiltY = tilt.interpolate({ inputRange: [0, 1], outputRange: [`${-4 * dir}deg`, `${4 * dir}deg`] });
    const tiltX = tilt.interpolate({ inputRange: [0, 1], outputRange: ['2deg', '-2deg'] });
    const pressScale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });
    const pressRotate = press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '7deg'] });
    const spin = loop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const arrowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.14] });
    const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-120, 460] });
    const scanY = loop.interpolate({ inputRange: [0, 1], outputRange: [-10, 170] });
    const scanOpacity = loop.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.8, 0.8, 0] });

    return (
        <Pop index={index} style={styles.popWrap}>
            <Animated.View style={{ transform: [{ perspective: 1000 }, { rotateY: tiltY }, { rotateX: tiltX }] }}>
                <Animated.View style={{ transform: [{ perspective: 1000 }, { scale: pressScale }, { rotateX: pressRotate }] }}>
                    <TouchableOpacity 
                        style={[styles.cardWrapper, { shadowColor: accent }]} 
                        activeOpacity={0.9}
                        onPress={onPress}
                        onPressIn={() => Animated.spring(press, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start()}
                        onPressOut={() => Animated.spring(press, { toValue: 0, friction: 6, tension: 120, useNativeDriver: true }).start()}
                    >
                        {/* outer glowing gradient border */}
                        <LinearGradient
                            colors={[borderColor, accent, borderColor]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.borderWrap}
                        >
                            <LinearGradient 
                                colors={gradBg} 
                                start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                                style={[styles.card, { borderColor: borderColor }]}
                            >
                                {/* huge faint watermark icon */}
                                <MaterialCommunityIcons name={icon} size={150} color={accent + '10'} style={styles.watermark} />

                                {/* scanner line */}
                                <Animated.View pointerEvents="none" style={[styles.scanLine, { opacity: scanOpacity, transform: [{ translateY: scanY }] }]}>
                                    <LinearGradient
                                        colors={['transparent', accent, 'transparent']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{ flex: 1 }}
                                    />
                                </Animated.View>

                                {/* metallic shine sweep */}
                                <Animated.View pointerEvents="none" style={[styles.shine, { transform: [{ translateX: shineX }, { rotate: '20deg' }] }]}>
                                    <LinearGradient
                                        colors={['transparent', 'rgba(255,255,255,0.12)', 'transparent']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={{ flex: 1 }}
                                    />
                                </Animated.View>

                                {/* top tag chip */}
                                <View style={[styles.tagChip, { borderColor: accent + '55', backgroundColor: accent + '14' }]}>
                                    <View style={[styles.tagDot, { backgroundColor: accent }]} />
                                    <Text style={[styles.tagText, { color: accent }]}>{tag}</Text>
                                </View>

                                <View style={styles.cardRow}>
                                    <View style={styles.iconWrap}>
                                        <Animated.View style={[styles.iconOrbit, { borderColor: accent + '66', transform: [{ rotate: spin }] }]}>
                                            <View style={[styles.iconOrbitDot, { backgroundColor: accent, shadowColor: accent }]} />
                                        </Animated.View>
                                        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
                                            {icon === 'account-group' ? (
                                                <MaterialCommunityIcons name="account-group" size={32} color={accent} />
                                            ) : (
                                                <MaterialCommunityIcons name="shield-star" size={32} color={accent} />
                                            )}
                                        </View>
                                    </View>
                                    <View style={styles.cardTextContainer}>
                                        <Text style={styles.cardTitle}>{title}</Text>
                                        <Text style={styles.cardSub}>{sub}</Text>
                                    </View>
                                    <Animated.View style={{ transform: [{ scale: arrowScale }] }}>
                                        <Ionicons name="chevron-forward-circle" size={28} color={accent} />
                                    </Animated.View>
                                </View>
                            </LinearGradient>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </Animated.View>
        </Pop>
    );
};

// 🌌 floating particles config (background depth)
const particles = [
    { left: '8%', top: '35%', size: 3, range: -150, color: '#818CF8' },
    { left: '24%', top: '75%', size: 2, range: -110, color: '#FB7185' },
    { left: '45%', top: '45%', size: 4, range: -190, color: '#818CF8' },
    { left: '63%', top: '82%', size: 3, range: -130, color: '#FB7185' },
    { left: '80%', top: '38%', size: 2, range: -170, color: '#818CF8' },
    { left: '93%', top: '65%', size: 3, range: -120, color: '#FB7185' },
];

export default function PassbookIndex() {
    const router = useRouter();

    /* ---------- 🎞️ ANIMATION VALUES ---------- */
    const loop = useRef(new Animated.Value(0)).current;       // linear 0→1 (orbit, scan, particles)
    const pulse = useRef(new Animated.Value(0)).current;      // yoyo pulse (arrows, safe icon, live dot)
    const shine = useRef(new Animated.Value(0)).current;      // card shine sweep
    const tilt = useRef(new Animated.Value(0)).current;       // idle 3D tilt of the cards
    const orbA = useRef(new Animated.Value(0)).current;       // floating orb A
    const orbB = useRef(new Animated.Value(0)).current;       // floating orb B

    useEffect(() => {
        const yoyo = (val: Animated.Value, duration: number, delay = 0) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(val, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                    Animated.timing(val, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                ])
            );

        const l1 = Animated.loop(Animated.timing(loop, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true }));
        const l2 = yoyo(pulse, 1100);
        const l3 = Animated.loop(
            Animated.sequence([
                Animated.delay(2000),
                Animated.timing(shine, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        const l4 = yoyo(tilt, 3600);
        const l5 = yoyo(orbA, 6000);
        const l6 = yoyo(orbB, 7500, 800);

        [l1, l2, l3, l4, l5, l6].forEach(l => l.start());
        return () => [l1, l2, l3, l4, l5, l6].forEach(l => l.stop());
    }, []);

    const orbAY = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });
    const orbAX = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
    const orbBY = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
    const orbBX = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -35] });
    const safeScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
    const safeGlow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.75] });

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* 🌌 BACKGROUND DEPTH: gradient + aurora orbs + particles */}
            <LinearGradient colors={['#020617', '#0A0B1E', '#020617']} style={StyleSheet.absoluteFill} />
            <Animated.View pointerEvents="none" style={[styles.orb, styles.orbA, { transform: [{ translateX: orbAX }, { translateY: orbAY }] }]} />
            <Animated.View pointerEvents="none" style={[styles.orb, styles.orbB, { transform: [{ translateX: orbBX }, { translateY: orbBY }] }]} />
            {particles.map((p, i) => (
                <Animated.View
                    key={i}
                    pointerEvents="none"
                    style={[
                        styles.particle,
                        {
                            left: p.left as any,
                            top: p.top as any,
                            width: p.size,
                            height: p.size,
                            borderRadius: p.size,
                            backgroundColor: p.color,
                            opacity: loop.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.8, 0.8, 0] }),
                            transform: [{ translateY: loop.interpolate({ inputRange: [0, 1], outputRange: [0, p.range] }) }],
                        },
                    ]}
                />
            ))}

            {/* 🛡️ SYSTEM HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>System Ledger</Text>
                    <View style={styles.headerSubRow}>
                        <Animated.View style={[styles.liveDot, { opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 0.25] }) }]} />
                        <Text style={styles.headerSub}>Select entity type to audit</Text>
                    </View>
                </View>
                <View style={styles.headerIconWrap}>
                    <Animated.View style={[styles.safeHalo, { opacity: safeGlow, transform: [{ scale: safeScale }] }]} />
                    <MaterialCommunityIcons name="safe" size={28} color="#10B981" style={styles.headerIcon} />
                </View>
            </View>

            <View style={styles.content}>
                <View style={styles.sectionRow}>
                    <Text style={styles.sectionTitle}>AUDIT ACCESS</Text>
                    <LinearGradient
                        colors={['#4F46E555', '#E11D4855', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.sectionRule}
                    />
                </View>

                {/* 👤 USER ALLOCATION LEDGER BUTTON */}
                <PortalCard
                    index={0}
                    dir={1}
                    tilt={tilt}
                    loop={loop}
                    pulse={pulse}
                    shine={shine}
                    onPress={() => router.push('/(admin)/passbook/user-list' as any)}
                    gradBg={['#0F172A', '#1E1B4B']}
                    borderColor="#4F46E5"
                    accent="#818CF8"
                    iconBg="rgba(79, 70, 229, 0.2)"
                    icon="account-group"
                    tag="NETWORK USERS"
                    title="USER AUDIT"
                    sub="Review total allocations, unit refills, and session history of all network users."
                />

                {/* 👑 HOST PERFORMANCE LEDGER BUTTON */}
                <PortalCard
                    index={1}
                    dir={-1}
                    tilt={tilt}
                    loop={loop}
                    pulse={pulse}
                    shine={shine}
                    onPress={() => router.push('/(admin)/passbook/expert-list' as any)}
                    gradBg={['#0F172A', '#31102A']}
                    borderColor="#E11D48"
                    accent="#FB7185"
                    iconBg="rgba(225, 29, 72, 0.2)"
                    icon="shield-star"
                    tag="AUTHORIZED HOSTS"
                    title="HOST AUDIT"
                    sub="Review Operational Activity, processed, spotlight analytics, and reward logs."
                />

                <View style={styles.footerNote}>
                    <MaterialCommunityIcons name="shield-lock-outline" size={12} color="rgba(255,255,255,0.25)" />
                    <Text style={styles.footerText}>TALKPE OS • SECURE_LEDGER</Text>
                </View>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#020617' 
    },

    /* background */
    orb: { position: 'absolute', borderRadius: 999 },
    orbA: { width: 280, height: 280, top: -60, right: -90, backgroundColor: 'rgba(79,70,229,0.2)' },
    orbB: { width: 260, height: 260, top: 460, left: -110, backgroundColor: 'rgba(225,29,72,0.15)' },
    particle: { position: 'absolute' },

    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingVertical: 15, 
        gap: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)'
    },
    backBtn: { 
        width: 42, 
        height: 42, 
        backgroundColor: 'rgba(255,255,255,0.07)', 
        borderRadius: 14, 
        justifyContent: 'center', 
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    headerTitle: { 
        color: '#FFF', 
        fontSize: 20, 
        fontWeight: '900', 
        letterSpacing: 0.5 
    },
    headerSubRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
    liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    headerSub: { 
        color: '#94A3B8', 
        fontSize: 11, 
        fontWeight: '600',
        marginTop: 0
    },
    headerIconWrap: { marginLeft: 'auto', width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    safeHalo: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(16,185,129,0.22)' },
    headerIcon: {
        marginLeft: 'auto',
        textShadowColor: 'rgba(16, 185, 129, 0.4)',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 10
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 20
    },
    sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    sectionTitle: {
        color: '#475569', 
        fontSize: 10, 
        fontWeight: '900', 
        letterSpacing: 2, 
        marginBottom: 0,
        marginLeft: 5
    },
    sectionRule: { flex: 1, height: 1, marginLeft: 12 },
    popWrap: { marginBottom: 18 },
    cardWrapper: {
        marginBottom: 0,
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.4,
        shadowRadius: 22,
        elevation: 12
    },
    borderWrap: { borderRadius: 27, padding: 1.3 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 40,
        borderRadius: 26,
        borderWidth: 0,
        overflow: 'hidden'
    },
    watermark: { position: 'absolute', right: -24, bottom: -34 },
    scanLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
    shine: { position: 'absolute', top: -60, bottom: -60, width: 70 },
    tagChip: { position: 'absolute', top: 14, left: 20, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
    tagDot: { width: 5, height: 5, borderRadius: 3 },
    tagText: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
    cardRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    iconWrap: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
    iconOrbit: { position: 'absolute', width: 72, height: 72, borderRadius: 36, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center' },
    iconOrbitDot: { width: 7, height: 7, borderRadius: 4, marginTop: -3.5, shadowOpacity: 1, shadowRadius: 6, elevation: 6 },
    iconBox: {
        width: 60,
        height: 60,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    cardTextContainer: {
        flex: 1,
        marginLeft: 10,
        marginRight: 10
    },
    cardTitle: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 4
    },
    cardSub: {
        color: '#94A3B8',
        fontSize: 11,
        fontWeight: '500',
        lineHeight: 16
    },
    footerNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 20 },
    footerText: { color: 'rgba(255,255,255,0.2)', fontSize: 10, fontWeight: '900', letterSpacing: 2 }
});
