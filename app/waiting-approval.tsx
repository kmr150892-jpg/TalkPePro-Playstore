import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth } from '../firebaseConfig';

const loop = (value: Animated.Value, duration: number, easing = Easing.inOut(Easing.sin)) =>
    Animated.loop(
        Animated.sequence([
            Animated.timing(value, { toValue: 1, duration, easing, useNativeDriver: true }),
            Animated.timing(value, { toValue: 0, duration, easing, useNativeDriver: true }),
        ])
    );

export default function WaitingApproval() {
    const router = useRouter();

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
        const anims = [
            spinYAnim,
            spinXAnim,
            shimmerAnim,
            loop(float, 2600),
            loop(pulse, 1800),
            loop(orbA, 5000),
            loop(orbB, 6500),
            loop(dot, 900),
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
    const floatY = float.interpolate({ inputRange: [0, 1], outputRange: [-8, 8] });
    const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] });
    const pulseOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0.1] });
    const orbAY = orbA.interpolate({ inputRange: [0, 1], outputRange: [-25, 25] });
    const orbBX = orbB.interpolate({ inputRange: [0, 1], outputRange: [-30, 30] });
    const shimmerX = shimmer.interpolate({ inputRange: [0, 1], outputRange: [-120, 260] });
    const dotScale = dot.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });

    const reveal = (i: number) => ({
        opacity: enter[i],
        transform: [{ translateY: enter[i].interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
    });

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#020617', '#0B1030', '#0F172A']} style={StyleSheet.absoluteFill} />

            {/* Floating background orbs */}
            <Animated.View style={[styles.orb, styles.orbOne, { transform: [{ translateY: orbAY }] }]} />
            <Animated.View style={[styles.orb, styles.orbTwo, { transform: [{ translateX: orbBX }] }]} />

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
                    <View style={styles.iconCircle}>
                        <Feather name="clock" size={54} color="#818CF8" />
                    </View>
                </Animated.View>

                <Animated.View style={reveal(1)}>
                    <Text style={styles.badge}>HOST VERIFICATION</Text>
                    <Text style={styles.title}>APPLICATION UNDER REVIEW</Text>
                </Animated.View>

                {/* Glass card */}
                <Animated.View style={[styles.card, reveal(2)]}>
                    <Text style={styles.subtitle}>
                        Thank you for applying! Our team is reviewing your profile details to keep the community safe and genuine. This usually takes some time, so please check back later to see your host account status.
                    </Text>

                    <View style={styles.progressTrack}>
                        <Animated.View style={[styles.shimmerBar, { transform: [{ translateX: shimmerX }] }]}>
                            <LinearGradient
                                colors={['transparent', '#6366F1', 'transparent']}
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
                            <Text style={styles.stepTitle}>Profile Submitted</Text>
                            <Text style={styles.stepSub}>We have received your details</Text>
                        </View>
                    </View>
                    <View style={styles.connector} />
                    <View style={styles.step}>
                        <View style={[styles.stepIcon, styles.stepActive]}>
                            <Animated.View style={[styles.liveDot, { transform: [{ scale: dotScale }] }]} />
                        </View>
                        <View style={styles.stepTextWrap}>
                            <Text style={styles.stepTitle}>Review in Progress</Text>
                            <Text style={styles.stepSub}>Verification & safety check</Text>
                        </View>
                    </View>
                    <View style={styles.connector} />
                    <View style={styles.step}>
                        <View style={[styles.stepIcon, styles.stepPending]}>
                            <Feather name="unlock" size={13} color="#64748B" />
                        </View>
                        <View style={styles.stepTextWrap}>
                            <Text style={[styles.stepTitle, { color: '#64748B' }]}>Account Activation</Text>
                            <Text style={styles.stepSub}>Available once your profile is approved</Text>
                        </View>
                    </View>
                </Animated.View>

                <Animated.View style={reveal(3)}>
                    <TouchableOpacity activeOpacity={0.7} onPress={handleLogout} style={styles.logoutWrap}>
                        <LinearGradient
                            colors={['rgba(99,102,241,0.25)', 'rgba(139,92,246,0.12)']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.logoutBtn}
                        >
                            <Feather name="log-out" size={16} color="#A5B4FC" style={{ marginRight: 10 }} />
                            <Text style={styles.logoutText}>LOGOUT & CHECK LATER</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    content: { padding: 24, alignItems: 'center', width: '100%' },

    orb: { position: 'absolute', borderRadius: 999 },
    orbOne: { width: 260, height: 260, top: -60, left: -80, backgroundColor: 'rgba(99,102,241,0.18)' },
    orbTwo: { width: 220, height: 220, bottom: -50, right: -70, backgroundColor: 'rgba(139,92,246,0.16)' },

    stage: { width: 190, height: 190, justifyContent: 'center', alignItems: 'center', marginBottom: 22 },
    glow: { position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: '#6366F1' },
    ring: { position: 'absolute', borderRadius: 999, borderWidth: 2 },
    ringOuter: { width: 180, height: 180, borderColor: 'rgba(129,140,248,0.7)', borderStyle: 'dashed' },
    ringInner: { width: 150, height: 150, borderColor: 'rgba(167,139,250,0.55)' },
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

    badge: {
        color: '#818CF8',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 3,
        textAlign: 'center',
        marginBottom: 8,
    },
    title: { color: '#fff', fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 20, letterSpacing: 1 },

    card: {
        width: '100%',
        padding: 22,
        borderRadius: 26,
        backgroundColor: 'rgba(30,41,59,0.55)',
        borderWidth: 1,
        borderColor: 'rgba(148,163,184,0.18)',
        marginBottom: 28,
    },
    subtitle: { color: '#94A3B8', fontSize: 15, textAlign: 'center', lineHeight: 23, marginBottom: 18 },

    progressTrack: {
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(99,102,241,0.15)',
        overflow: 'hidden',
        marginBottom: 20,
    },
    shimmerBar: { width: 120, height: 4 },

    step: { flexDirection: 'row', alignItems: 'center' },
    stepIcon: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    stepDone: { backgroundColor: '#22C55E' },
    stepActive: { backgroundColor: 'rgba(99,102,241,0.25)', borderWidth: 1, borderColor: '#6366F1' },
    stepPending: { backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#818CF8' },
    stepTextWrap: { marginLeft: 14, flex: 1 },
    stepTitle: { color: '#E2E8F0', fontSize: 14, fontWeight: '700' },
    stepSub: { color: '#64748B', fontSize: 12, marginTop: 2 },
    connector: { width: 2, height: 16, backgroundColor: '#334155', marginLeft: 13, marginVertical: 3 },

    logoutWrap: { borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: '#6366F1' },
    logoutBtn: { paddingVertical: 15, paddingHorizontal: 30, flexDirection: 'row', alignItems: 'center' },
    logoutText: { color: '#A5B4FC', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
});