import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth } from '../firebaseConfig';

const loop = (value: Animated.Value, duration: number, easing = Easing.inOut(Easing.sin)) =>
    Animated.loop(
        Animated.sequence([
            Animated.timing(value, { toValue: 1, duration, easing, useNativeDriver: true }),
            Animated.timing(value, { toValue: 0, duration, easing, useNativeDriver: true }),
        ])
    );

// ✨ TWINKLING SPARKLES (position in %, size, color)
const SPARKS = [
    { top: '8%', left: '12%', size: 4, color: '#22D3EE' },
    { top: '14%', left: '82%', size: 3, color: '#F472B6' },
    { top: '30%', left: '6%', size: 3, color: '#FBBF24' },
    { top: '42%', left: '92%', size: 4, color: '#A78BFA' },
    { top: '62%', left: '10%', size: 3, color: '#F472B6' },
    { top: '72%', left: '86%', size: 3, color: '#22D3EE' },
    { top: '84%', left: '30%', size: 4, color: '#FBBF24' },
    { top: '90%', left: '70%', size: 3, color: '#A78BFA' },
];

export default function WaitingApproval() {
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const handleLogout = async () => {
        try {
            await auth.signOut();
            // ✅ Fix: Route '/login' illana '/' use pannanum.
            // 'as any' use panni TypeScript red line error-ah avoid pannuvom.
            router.replace('/' as any);
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    // ---------- Animation values ----------
    const spinY = useRef(new Animated.Value(0)).current;
    const spinX = useRef(new Animated.Value(0)).current;
    const float = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(0)).current;
    const orbA = useRef(new Animated.Value(0)).current;
    const orbB = useRef(new Animated.Value(0)).current;
    const shimmer = useRef(new Animated.Value(0)).current;
    const dot = useRef(new Animated.Value(0)).current;
    const orbit = useRef(new Animated.Value(0)).current;      // 🆕 colorful satellites orbit
    const twinkle = useRef(new Animated.Value(0)).current;    // 🆕 sparkle twinkle
    const btnShine = useRef(new Animated.Value(0)).current;   // 🆕 logout button shine sweep
    const enter = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current;

    useEffect(() => {
        const spinYAnim = Animated.loop(
            Animated.timing(spinY, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true })
        );
        const spinXAnim = Animated.loop(
            Animated.timing(spinX, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })
        );
        const shimmerAnim = Animated.loop(
            Animated.timing(shimmer, { toValue: 1, duration: 1800, easing: Easing.linear, useNativeDriver: true })
        );
        const orbitAnim = Animated.loop(
            Animated.timing(orbit, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })
        );
        const btnShineAnim = Animated.loop(
            Animated.sequence([
                Animated.timing(btnShine, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.delay(1600),
                Animated.timing(btnShine, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );
        const anims = [
            spinYAnim,
            spinXAnim,
            shimmerAnim,
            orbitAnim,
            btnShineAnim,
            loop(float, 2600),
            loop(pulse, 1800),
            loop(orbA, 5000),
            loop(orbB, 6500),
            loop(dot, 900),
            loop(twinkle, 1400),
        ];
        anims.forEach(a => a.start());

        Animated.stagger(
            130,
            enter.map(v =>
                Animated.timing(v, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true })
            )
        ).start();

        return () => anims.forEach(a => a.stop());
    }, []);

    const rotY = spinY.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const rotX = spinX.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const orbitRot = orbit.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const orbitRotRev = orbit.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
    const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [-8, 8] });
    const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
    const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.1] });
    const orbAY = orbA.interpolate({ inputRange: [0, 1], outputRange: [-25, 25] });
    const orbBX = orbB.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] });
    const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-120, 260] });
    const dotScale = dot.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
    const btnShineX = btnShine.interpolate({ inputRange: [0, 1], outputRange: [-120, 360] });

    const reveal = (i: number) => ({
        opacity: enter[i],
        transform: [{ translateY: enter[i].interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
    });

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#020617', '#1A0B3B', '#0B1030', '#04222E']} style={StyleSheet.absoluteFill} />

            {/* Floating background orbs (now multi-color) */}
            <Animated.View style={[styles.orb, styles.orbOne, { transform: [{ translateY: orbAY }] }]} />
            <Animated.View style={[styles.orb, styles.orbTwo, { transform: [{ translateX: orbBX }] }]} />
            <Animated.View style={[styles.orb, styles.orbThree, { transform: [{ translateX: orbBX }] }]} />
            <Animated.View style={[styles.orb, styles.orbFour, { transform: [{ translateY: orbAY }] }]} />

            {/* ✨ Twinkling sparkles */}
            {SPARKS.map((sp, i) => (
                <Animated.View
                    key={`sp-${i}`}
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: sp.top as any,
                        left: sp.left as any,
                        width: sp.size,
                        height: sp.size,
                        borderRadius: sp.size,
                        backgroundColor: sp.color,
                        opacity: twinkle.interpolate({ inputRange: [0, 1], outputRange: i % 2 === 0 ? [0.15, 1] : [1, 0.15] }),
                    }}
                />
            ))}

            {/* 🔥 SCROLLABLE CONTENT (so small phones never cut anything) */}
            <ScrollView
                style={{ flex: 1, width: '100%' }}
                contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
                showsVerticalScrollIndicator={false}
                bounces={false}
            >
                <View style={styles.content}>
                    {/* 3D hologram */}
                    <Animated.View style={[styles.stage, reveal(0), { transform: [{ translateY: floatY }] }]}>
                        <Animated.View
                            style={[styles.glow, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]}
                        />
                        <Animated.View
                            style={[styles.ring, styles.ringOuter, { transform: [{ perspective: 800 }, { rotateY: rotY }] }]}
                        />
                        <Animated.View
                            style={[styles.ring, styles.ringInner, { transform: [{ perspective: 800 }, { rotateX: rotX }] }]}
                        />

                        {/* 🆕 COLORFUL SATELLITES ORBITING THE HOLOGRAM */}
                        <Animated.View pointerEvents="none" style={[styles.orbitWrap, { transform: [{ rotate: orbitRot }] }]}>
                            <View style={[styles.satellite, { top: 0, left: 90, backgroundColor: '#22D3EE', shadowColor: '#22D3EE' }]} />
                            <View style={[styles.satellite, { top: 135, left: 168, backgroundColor: '#F472B6', shadowColor: '#F472B6' }]} />
                            <View style={[styles.satellite, { top: 135, left: 12, backgroundColor: '#FBBF24', shadowColor: '#FBBF24' }]} />
                        </Animated.View>
                        <Animated.View pointerEvents="none" style={[styles.orbitWrapInner, { transform: [{ rotate: orbitRotRev }] }]}>
                            <View style={[styles.satelliteSmall, { top: 0, left: 71, backgroundColor: '#A78BFA', shadowColor: '#A78BFA' }]} />
                            <View style={[styles.satelliteSmall, { top: 108, left: 71, backgroundColor: '#4ADE80', shadowColor: '#4ADE80' }]} />
                        </Animated.View>

                        {/* 🆕 GRADIENT RING AROUND THE ICON */}
                        <LinearGradient
                            colors={['#22D3EE', '#A855F7', '#F472B6', '#FBBF24']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.iconGradientRing}
                        >
                            <View style={styles.iconCircle}>
                                <Feather name="clock" size={54} color="#C4B5FD" />
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    <Animated.View style={reveal(1)}>
                        <View style={styles.badgeWrap}>
                            <LinearGradient
                                colors={['rgba(34,211,238,0.25)', 'rgba(168,85,247,0.25)', 'rgba(244,114,182,0.25)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.badgePill}
                            >
                                <View style={styles.badgeDot} />
                                <Text style={styles.badge}>HOST VERIFICATION</Text>
                            </LinearGradient>
                        </View>
                        <Text style={styles.title}>APPLICATION UNDER REVIEW</Text>
                    </Animated.View>

                    {/* Glass card with rainbow gradient border */}
                    <Animated.View style={[styles.cardBorder, reveal(2)]}>
                        <LinearGradient
                            colors={['#22D3EE', '#A855F7', '#F472B6', '#FBBF24']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.cardBorderGradient}
                        >
                            <View style={styles.card}>
                                <Text style={styles.subtitle}>
                                    Thank you for applying! Our team is reviewing your profile details to keep the community safe and genuine. This usually takes some time, so please check back later to see your host account status.
                                </Text>

                                <View style={styles.progressTrack}>
                                    <Animated.View style={[styles.shimmerBar, { transform: [{ translateX: shimmerX }] }]}>
                                        <LinearGradient
                                            colors={['transparent', '#22D3EE', '#A855F7', '#F472B6', 'transparent']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 0 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    </Animated.View>
                                </View>

                                {/* Timeline */}
                                <View style={styles.step}>
                                    <View style={[styles.stepIcon, styles.stepDone]}>
                                        <Feather name="check" size={14} color="#fff" />
                                    </View>
                                    <View style={styles.stepTextWrap}>
                                        <Text style={[styles.stepTitle, { color: '#4ADE80' }]}>Profile Submitted</Text>
                                        <Text style={styles.stepSub}>We have received your details</Text>
                                    </View>
                                </View>
                                <View style={[styles.connector, { backgroundColor: '#22C55E' }]} />
                                <View style={styles.step}>
                                    <View style={[styles.stepIcon, styles.stepActive]}>
                                        <Animated.View style={[styles.liveDot, { transform: [{ scale: dotScale }] }]} />
                                    </View>
                                    <View style={styles.stepTextWrap}>
                                        <Text style={[styles.stepTitle, { color: '#FBBF24' }]}>Review in Progress</Text>
                                        <Text style={styles.stepSub}>Verification & safety check</Text>
                                    </View>
                                </View>
                                <View style={[styles.connector, { backgroundColor: '#475569' }]} />
                                <View style={styles.step}>
                                    <View style={[styles.stepIcon, styles.stepPending]}>
                                        <Feather name="unlock" size={13} color="#A78BFA" />
                                    </View>
                                    <View style={styles.stepTextWrap}>
                                        <Text style={[styles.stepTitle, { color: '#A78BFA' }]}>Account Activation</Text>
                                        <Text style={styles.stepSub}>Available once your profile is approved</Text>
                                    </View>
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>
                </View>
            </ScrollView>

            {/* 🔥 FIXED FOOTER: logout button is ALWAYS visible (above phone nav buttons / keyboard area) */}
            <Animated.View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 14 }, reveal(3)]}>
                <TouchableOpacity activeOpacity={0.85} onPress={handleLogout} style={styles.logoutWrap}>
                    <LinearGradient
                        colors={['#EC4899', '#8B5CF6', '#06B6D4']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.logoutBtn}
                    >
                        <Feather name="log-out" size={16} color="#FFFFFF" style={{ marginRight: 10 }} />
                        <Text style={styles.logoutText}>LOGOUT & CHECK LATER</Text>
                        {/* 🆕 shine sweep */}
                        <Animated.View pointerEvents="none" style={[styles.btnShine, { transform: [{ translateX: btnShineX }, { rotate: '20deg' }] }]} />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 16 },
    content: { padding: 24, alignItems: 'center', width: '100%' },

    orb: { position: 'absolute', borderRadius: 999 },
    orbOne: { width: 260, height: 260, top: -60, left: -80, backgroundColor: 'rgba(99,102,241,0.22)' },
    orbTwo: { width: 220, height: 220, bottom: -50, right: -70, backgroundColor: 'rgba(236,72,153,0.20)' },
    orbThree: { width: 180, height: 180, top: '38%', right: -90, backgroundColor: 'rgba(6,182,212,0.18)' },
    orbFour: { width: 160, height: 160, top: '55%', left: -80, backgroundColor: 'rgba(251,191,36,0.14)' },

    stage: { width: 190, height: 190, justifyContent: 'center', alignItems: 'center', marginBottom: 22 },
    glow: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: '#A855F7' },
    ring: { position: 'absolute', borderRadius: 999, borderWidth: 2 },
    ringOuter: { width: 180, height: 180, borderColor: 'rgba(34,211,238,0.75)', borderStyle: 'dashed' },
    ringInner: { width: 150, height: 150, borderColor: 'rgba(244,114,182,0.6)' },

    // 🆕 orbiting satellites
    orbitWrap: { position: 'absolute', width: 190, height: 190 },
    orbitWrapInner: { position: 'absolute', width: 150, height: 150 },
    satellite: { position: 'absolute', width: 10, height: 10, borderRadius: 5, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
    satelliteSmall: { position: 'absolute', width: 8, height: 8, borderRadius: 4, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 6 },

    iconGradientRing: { width: 118, height: 118, borderRadius: 59, justifyContent: 'center', alignItems: 'center', shadowColor: '#A855F7', shadowOpacity: 0.7, shadowRadius: 20, elevation: 14 },
    iconCircle: {
        width: 110,
        height: 110,
        borderRadius: 55,
        backgroundColor: '#1E293B',
        justifyContent: 'center',
        alignSelf: 'center', // 🔥 Added for perfect centering
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#334155',
        shadowColor: '#6366F1',
        shadowOpacity: 0.6,
        shadowRadius: 18,
        elevation: 12,
    },

    badgeWrap: { alignItems: 'center', marginBottom: 10 },
    badgePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(167,139,250,0.5)', gap: 8 },
    badgeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#22D3EE' },
    badge: {
        color: '#C4B5FD',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 3,
        textAlign: 'center',
    },
    title: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 20, letterSpacing: 1, textShadowColor: 'rgba(244,114,182,0.7)', textShadowRadius: 12, textShadowOffset: { width: 0, height: 0 } },

    // 🆕 rainbow gradient border wrapper for the glass card
    cardBorder: { width: '100%', marginBottom: 12, borderRadius: 28, shadowColor: '#A855F7', shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
    cardBorderGradient: { borderRadius: 28, padding: 1.5 },
    card: {
        width: '100%',
        padding: 22,
        borderRadius: 26,
        backgroundColor: 'rgba(10,14,40,0.92)',
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.18)',
        marginBottom: 0,
    },
    subtitle: { color: '#94A3B8', fontSize: 15, textAlign: 'center', lineHeight: 23, marginBottom: 18 },

    progressTrack: {
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(168,85,247,0.18)',
        overflow: 'hidden',
        marginBottom: 20,
    },
    shimmerBar: { width: 120, height: 4 },

    step: { flexDirection: 'row', alignItems: 'center' },
    stepIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    stepDone: { backgroundColor: '#22C55E', shadowColor: '#22C55E', shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
    stepActive: { backgroundColor: 'rgba(251,191,36,0.22)', borderWidth: 1, borderColor: '#FBBF24' },
    stepPending: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#7C3AED' },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FBBF24' },
    stepTextWrap: { marginLeft: 14, flex: 1 },
    stepTitle: { color: '#E2E8F0', fontSize: 14, fontWeight: '700' },
    stepSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
    connector: { width: 2, height: 16, backgroundColor: '#334155', marginLeft: 13, marginVertical: 3 },

    // 🔥 FIXED FOOTER (never hidden)
    footer: { width: '100%', paddingHorizontal: 24, paddingTop: 12, alignItems: 'center' },
    logoutWrap: { width: '100%', borderRadius: 18, overflow: 'hidden', shadowColor: '#EC4899', shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
    logoutBtn: { paddingVertical: 16, paddingHorizontal: 30, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
    logoutText: { color: '#FFFFFF', fontWeight: '900', fontSize: 14, letterSpacing: 1 },
    btnShine: { position: 'absolute', top: -30, bottom: -30, width: 40, backgroundColor: 'rgba(255,255,255,0.28)' },
});