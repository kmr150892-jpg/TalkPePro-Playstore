import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import {
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

const { width } = Dimensions.get('window');

/* ───────────────────────── 3D / ANIMATION BUILDING BLOCKS ───────────────────────── */

// 3D press tilt
const Press3D = ({ children, style, onPress, activeOpacity }: any) => {
    const p = useRef(new Animated.Value(0)).current;
    const pressIn = () => Animated.spring(p, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
    const pressOut = () => Animated.spring(p, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 10 }).start();
    const scale = p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] });
    const rotateX = p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '8deg'] });
    return (
        <TouchableOpacity activeOpacity={activeOpacity ?? 1} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
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
            duration: 560,
            delay: index * 110,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
        }).start();
    }, []);
    const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
    const rotateX = v.interpolate({ inputRange: [0, 1], outputRange: ['-16deg', '0deg'] });
    return (
        <Animated.View style={[style, { opacity: v, transform: [{ perspective: 900 }, { translateY }, { rotateX }] }]}>
            {children}
        </Animated.View>
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
            <Animated.View style={[styles.orb, { top: -80, right: -90, width: 300, height: 300, backgroundColor: '#6366F1', opacity: 0.16, transform: [{ translateY: aY }, { translateX: aX }] }]} />
            <Animated.View style={[styles.orb, { bottom: 60, left: -120, width: 320, height: 320, backgroundColor: '#8B5CF6', opacity: 0.1, transform: [{ translateY: bY }, { translateX: bX }] }]} />
            <Animated.View style={[styles.orb, { top: 360, right: -80, width: 200, height: 200, backgroundColor: '#10B981', opacity: 0.07, transform: [{ translateY: aY }] }]} />
        </View>
    );
};

// Light sweep across a tile (shine effect)
const Shimmer = ({ delay = 0 }: { delay?: number }) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const l = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(v, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.delay(2800),
                Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        );
        l.start();
        return () => l.stop();
    }, []);
    const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [-140, width] });
    return (
        <Animated.View
            pointerEvents="none"
            style={{ position: 'absolute', top: -30, bottom: -30, width: 70, transform: [{ translateX }, { rotate: '18deg' }] }}
        >
            <LinearGradient
                colors={['transparent', 'rgba(255,255,255,0.10)', 'transparent']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ flex: 1 }}
            />
        </Animated.View>
    );
};

// Gently bobbing icon
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
    const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
    return <Animated.View style={{ transform: [{ translateY }] }}>{children}</Animated.View>;
};

// Rotating orbit with 4 module-coloured dots (hero decoration)
const OrbitHub = () => {
    const spin = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const l = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
        l.start();
        return () => l.stop();
    }, []);
    const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const dots = [
        { color: '#10B981', style: { top: -5, left: 40 } },
        { color: '#6366F1', style: { top: 40, right: -5 } },
        { color: '#8B5CF6', style: { bottom: -5, left: 40 } },
        { color: '#F59E0B', style: { top: 40, left: -5 } }
    ];
    return (
        <View style={styles.orbitWrap}>
            <View style={styles.orbitRingOuter} />
            <Animated.View style={[styles.orbitSpinner, { transform: [{ rotate }] }]}>
                {dots.map((d, i) => (
                    <View key={i} style={[styles.orbitDot, d.style as any, { backgroundColor: d.color, shadowColor: d.color }]} />
                ))}
            </Animated.View>
            <View style={styles.orbitCore}>
                <MaterialCommunityIcons name="chart-box-outline" size={26} color="#A5B4FC" />
            </View>
        </View>
    );
};

// Premium navigation tile
const NavTile = ({ title, sub, color, route, router, iconSet, iconName, iconSize, full, index }: any) => {
    const IconComp: any = iconSet === 'feather' ? Feather : MaterialCommunityIcons;
    return (
        <Reveal index={index} style={full ? { width: '100%' } : undefined}>
            <Press3D
                activeOpacity={0.7}
                onPress={() => router.push(route)}
                style={[
                    styles.mainTile,
                    full && styles.fullTile,
                    { borderColor: `${color}30`, borderBottomColor: `${color}80`, shadowColor: color }
                ]}
            >
                <LinearGradient colors={[`${color}20`, 'transparent']} style={styles.tileGrad} />
                <View style={[styles.tileGlowOrb, { backgroundColor: color }]} />
                <Shimmer delay={index * 700} />

                {full ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 15 }}>
                        <FloatBox delay={index * 300}>
                            <View style={[styles.iconTile, { backgroundColor: `${color}22`, borderColor: `${color}66`, shadowColor: color }]}>
                                <IconComp name={iconName} size={iconSize} color={color} />
                            </View>
                        </FloatBox>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.tileTitle}>{title}</Text>
                            <Text style={styles.tileSub}>{sub}</Text>
                        </View>
                        <View style={[styles.arrowCircle, { backgroundColor: `${color}1F`, borderColor: `${color}55` }]}>
                            <Feather name="arrow-right" size={16} color={color} />
                        </View>
                    </View>
                ) : (
                    <>
                        <View style={styles.tileTopRow}>
                            <FloatBox delay={index * 300}>
                                <View style={[styles.iconTile, { backgroundColor: `${color}22`, borderColor: `${color}66`, shadowColor: color }]}>
                                    <IconComp name={iconName} size={iconSize} color={color} />
                                </View>
                            </FloatBox>
                            <View style={[styles.arrowCircle, { backgroundColor: `${color}1F`, borderColor: `${color}55` }]}>
                                <Feather name="arrow-up-right" size={16} color={color} />
                            </View>
                        </View>
                        <Text style={styles.tileTitle}>{title}</Text>
                        <Text style={styles.tileSub}>{sub}</Text>
                    </>
                )}
            </Press3D>
        </Reveal>
    );
};

/* ───────────────────────────────── MAIN SCREEN ───────────────────────────────── */

export default function AnalyticsDashboard() {
    const router = useRouter();

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0F172A']} style={StyleSheet.absoluteFill} />
            <BackgroundOrbs />

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* HEADER - Cinematic Style */}
                <Reveal index={0}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                            <Feather name="chevron-left" size={24} color="#6366F1" />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.welcomeText}>SYSTEM OPERATIONS</Text>
                            <Text style={styles.adminName}>PLATFORM PULSE</Text>
                        </View>
                    </View>
                </Reveal>

                {/* 🆕 HERO BANNER */}
                <Reveal index={1}>
                    <View style={styles.heroWrap}>
                        <LinearGradient
                            colors={['#1E1B4B', '#0F172A']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.heroCard}
                        >
                            <View style={styles.heroOrbA} />
                            <View style={{ flex: 1 }}>
                                <View style={styles.heroChip}>
                                    <View style={styles.heroChipDot} />
                                    <Text style={styles.heroChipText}>ANALYTICS HUB</Text>
                                </View>
                                <Text style={styles.heroTitle}>Choose a module</Text>
                                <Text style={styles.heroSub}>Rewards, sessions, hosts and users, all in one place.</Text>
                            </View>
                            <OrbitHub />
                        </LinearGradient>
                    </View>
                </Reveal>

                {/* MAIN NAVIGATION TILES */}
                <View style={styles.menuGrid}>
                    
                    {/* 1. SYSTEM REWARD */}
                    <NavTile
                        index={2}
                        router={router}
                        route="/(admin)/analytics/revenue"
                        color="#10B981"
                        iconSet="mci"
                        iconName="currency-inr"
                        iconSize={26}
                        title="SYSTEM REWARD"
                        sub="Platform Income & Distributions"
                    />

                    {/* 2. SESSION LOGS */}
                    <NavTile
                        index={3}
                        router={router}
                        route="/(admin)/analytics/calls"
                        color="#6366F1"
                        iconSet="feather"
                        iconName="phone-call"
                        iconSize={24}
                        title="SESSION LOGS"
                        sub="Operational Traffic & Metrics"
                    />

                    {/* 3. HOST VERIFICATION - Updated Route Logic */}
                    <NavTile
                        index={4}
                        router={router}
                        full
                        route="/(admin)/experts/verification-queue"
                        color="#8B5CF6"
                        iconSet="mci"
                        iconName="shield-check-outline"
                        iconSize={28}
                        title="HOST QUEUE"
                        sub="Manage Identity Verifications"
                    />

                    {/* 4. USER GROWTH */}
                    <NavTile
                        index={5}
                        router={router}
                        full
                        route="/(admin)/analytics/users"
                        color="#F59E0B"
                        iconSet="feather"
                        iconName="users"
                        iconSize={26}
                        title="USER GROWTH"
                        sub="Onboarding & Retention"
                    />
                </View>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingBottom: 40 },
    orb: { position: 'absolute', borderRadius: 999 },

    header: { paddingTop: 60, paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 15 },
    backBtn: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155', borderBottomWidth: 3, borderBottomColor: '#312E81', shadowColor: '#6366F1', shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    welcomeText: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    adminName: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 2, letterSpacing: 1, textShadowColor: '#6366F1', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 14 },

    /* hero */
    heroWrap: { paddingHorizontal: 20, marginBottom: 22 },
    heroCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 32, padding: 22, borderWidth: 1, borderBottomWidth: 5, borderColor: '#312E81', borderBottomColor: '#4338CA', overflow: 'hidden', shadowColor: '#6366F1', shadowOpacity: 0.45, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
    heroOrbA: { position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: 100, backgroundColor: '#6366F1', opacity: 0.2 },
    heroChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#6366F122', borderWidth: 1, borderColor: '#6366F155', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    heroChipDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 7 },
    heroChipText: { color: '#A5B4FC', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
    heroTitle: { color: '#fff', fontSize: 22, fontWeight: '900', marginTop: 14 },
    heroSub: { color: '#94A3B8', fontSize: 12, fontWeight: '600', marginTop: 6, lineHeight: 18, paddingRight: 10 },

    orbitWrap: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
    orbitRingOuter: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 1, borderColor: '#4F46E5', opacity: 0.6 },
    orbitSpinner: { position: 'absolute', width: 90, height: 90 },
    orbitDot: { position: 'absolute', width: 10, height: 10, borderRadius: 5, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
    orbitCore: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#312E8180', borderWidth: 1, borderColor: '#4F46E5', alignItems: 'center', justifyContent: 'center' },

    menuGrid: { paddingHorizontal: 20, flexDirection: 'row', flexWrap: 'wrap', gap: 15 },
    mainTile: { width: (width - 55) / 2, height: 150, backgroundColor: '#0F172A', borderRadius: 28, padding: 18, justifyContent: 'space-between', borderWidth: 1, borderBottomWidth: 4, borderColor: '#1E293B', overflow: 'hidden', shadowOpacity: 0.35, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
    fullTile: { width: '100%', height: 112, justifyContent: 'center' },
    tileGrad: { ...StyleSheet.absoluteFillObject },
    tileGlowOrb: { position: 'absolute', top: -40, right: -40, width: 120, height: 120, borderRadius: 60, opacity: 0.14 },
    tileTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    iconTile: { width: 50, height: 50, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
    arrowCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
    tileTitle: { color: '#fff', fontSize: 15, fontWeight: '900', marginTop: 10, letterSpacing: 0.5 },
    tileSub: { color: '#64748B', fontSize: 10, fontWeight: '700', marginTop: 4 }
});