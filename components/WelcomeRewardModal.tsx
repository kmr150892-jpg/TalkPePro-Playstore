import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig'; // Ensure correct path

const { width, height } = Dimensions.get('window');

// 🆕 3D IMAGES (icons8 3D Fluency) - load aagalana automatic-a icon fallback varum
const IMG = {
    gift: 'https://img.icons8.com/3d-fluency/512/gift.png',
    coin: 'https://img.icons8.com/3d-fluency/512/coin.png',
    diamond: 'https://img.icons8.com/3d-fluency/512/diamond.png',
    star: 'https://img.icons8.com/3d-fluency/512/star.png',
};

// 🆕 3D image with auto icon fallback
const Img3D = ({ uri, size, fallback, color = '#FFF', style }: any) => {
    const [err, setErr] = useState(false);
    if (err) return <MaterialCommunityIcons name={fallback} size={size * 0.7} color={color} />;
    return <Image source={{ uri }} style={[{ width: size, height: size }, style]} resizeMode="contain" onError={() => setErr(true)} />;
};

// 🆕 Floating wrapper (bob + sway + perspective Y-turn = true 3D feel)
const FloatBox = ({ children, amp = 6, dur = 1800, style }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <Animated.View
            style={[
                style,
                {
                    transform: [
                        { perspective: 700 },
                        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -amp] }) },
                        { rotateY: v.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '14deg'] }) },
                        { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) }
                    ]
                }
            ]}
        >
            {children}
        </Animated.View>
    );
};

// 🆕 ORBIT RING (rotating dashed ring + glowing satellite dot)
const OrbitRing = ({ size, color, dur = 6000, reverse = false, dotSize = 6, style }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.linear, useNativeDriver: true }));
        loop.start();
        return () => loop.stop();
    }, []);
    const spin = v.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'] });
    return (
        <Animated.View
            pointerEvents="none"
            style={[
                {
                    position: 'absolute',
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    borderWidth: 1,
                    borderStyle: 'dashed',
                    borderColor: color + '66',
                    transform: [{ rotate: spin }]
                },
                style
            ]}
        >
            <View
                style={{
                    position: 'absolute',
                    top: -dotSize / 2 - 1,
                    left: size / 2 - dotSize / 2 - 1,
                    width: dotSize,
                    height: dotSize,
                    borderRadius: dotSize / 2,
                    backgroundColor: color,
                    shadowColor: color,
                    shadowOpacity: 1,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: 6
                }}
            />
        </Animated.View>
    );
};

// 🆕 ✨ Twinkling sparkle
const Sparkle = ({ x, y, size = 12, color = '#F5C84C', delay = 0, dur = 1800 }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
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
                left: x,
                top: y,
                opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] }),
                transform: [
                    { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.15] }) },
                    { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }
                ]
            }}
        >
            <MaterialCommunityIcons name="star-four-points" size={size} color={color} />
        </Animated.View>
    );
};

// 🆕 Glass shine sweep (light kadandhu pogum)
const ShineSweep = ({ w, delay = 0, color = 'rgba(255,255,255,0.16)' }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(v, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.delay(3600)
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    if (!w) return null;
    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute',
                top: -30,
                bottom: -30,
                width: 56,
                transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [-90, w + 40] }) }, { rotate: '18deg' }]
            }}
        >
            <LinearGradient colors={['transparent', color, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
    );
};

// 🆕 DOUBLE COLOUR FRAME (gradient border: colour A + colour B, solid dark inside - NO line look)
const DoubleFrame = ({ a, b, radius = 24, pad = 1.6, children, style, inner, shine = false, shineDelay = 0 }: any) => {
    const [cw, setCw] = useState(0);
    return (
        <LinearGradient colors={[a, b, a]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: radius, padding: pad }, style]}>
            <View
                style={[{ borderRadius: radius - pad, overflow: 'hidden', backgroundColor: 'rgba(5, 7, 20, 0.92)' }, inner]}
                onLayout={shine ? (e) => setCw(e.nativeEvent.layout.width) : undefined}
            >
                {children}
                {shine && <ShineSweep w={cw} delay={shineDelay} />}
            </View>
        </LinearGradient>
    );
};

// 🆕 Confetti pieces (burst direction precomputed)
const CONFETTI_COLORS = ['#00F2FE', '#4FACFE', '#8B5CF6', '#F472B6', '#FBBF24', '#10B981'];
const CONFETTI = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * Math.PI * 2;
    const dist = 95 + (i % 3) * 32;
    return {
        dx: Math.cos(angle) * dist,
        dy: Math.sin(angle) * dist,
        size: 6 + (i % 3) * 2,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        rot: i % 2 === 0 ? '320deg' : '-320deg',
        round: i % 3 === 0,
    };
});

// 🆕 Background floating particles
const BG_PARTICLES = Array.from({ length: 10 }, (_, i) => ({
    x: ((i * 37) % 100) / 100 * width,
    y: height * 0.35 + ((i * 53) % 45) / 100 * height,
    size: 2 + (i % 3),
    dur: 6000 + (i % 5) * 1100,
    delay: i * 450,
    color: ['#00F2FE', '#8B5CF6', '#FFFFFF'][i % 3],
}));

const BgParticle = ({ p }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(p.delay),
                Animated.timing(v, { toValue: 1, duration: p.dur, easing: Easing.linear, useNativeDriver: true }),
                Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true })
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
                top: p.y,
                left: p.x,
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
                backgroundColor: p.color,
                opacity: v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.7, 0.4, 0] }),
                transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -260] }) }]
            }}
        />
    );
};

export default function WelcomeRewardModal() {
    const [isVisible, setIsVisible] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [reward, setReward] = useState<number | null>(null);
    const [displayNumber, setDisplayNumber] = useState<number>(1);

    const spinAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // 🆕 PREMIUM ANIMATION VALUES
    const cardIn = useRef(new Animated.Value(0)).current;   // card 3D entrance
    const pulseAnim = useRef(new Animated.Value(0)).current; // glow pulse
    const burstAnim = useRef(new Animated.Value(0)).current; // reward burst (shockwave + confetti)
    const shuffleRef = useRef<any>(null);                    // shuffle timer (cleanup safety)
    const [btnW, setBtnW] = useState(0);                     // button shine width

    // 🛡️ 1. Check if it's a NEW USER who hasn't claimed yet (with Auth Protector)
    useEffect(() => {
        let unsubSnap: () => void;

        const unsubAuth = auth.onAuthStateChanged((user:any) => {
            if (user) {
                unsubSnap = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserData({ id: docSnap.id, ...data });

                        // 🔥 Show ONLY if role is 'user' AND they haven't claimed the welcome bonus yet
                        if (data.role === 'user' && !data.hasSpunWelcomeWheel) {
                            setIsVisible(true);
                        } else {
                            setIsVisible(false);
                        }
                    }
                });
            }
        });

        return () => {
            unsubAuth();
            if (unsubSnap) unsubSnap();
        };
    }, []);

    // 🆕 Ambient glow pulse + shuffle timer cleanup on unmount
    useEffect(() => {
        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        );
        pulseLoop.start();
        return () => {
            pulseLoop.stop();
            if (shuffleRef.current) clearInterval(shuffleRef.current);
        };
    }, []);

    // 🆕 Card 3D entrance (modal open aagumbodhu flip-up)
    useEffect(() => {
        if (isVisible) {
            cardIn.setValue(0);
            Animated.spring(cardIn, { toValue: 1, friction: 7, tension: 40, useNativeDriver: true }).start();
        }
    }, [isVisible]);

    // 🆕 Reward lock aanathum shockwave + confetti burst
    useEffect(() => {
        if (reward !== null) {
            burstAnim.setValue(0);
            Animated.timing(burstAnim, { toValue: 1, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        }
    }, [reward]);

    // 🎰 2. The Weighted Allocation Logic
    const calculateReward = () => {
        const rand = Math.random() * 100; // 0 to 100
        if (rand <= 10) return 3; // 🔥 10% Probability for 3 Mins
        if (rand <= 50) return 2; // 🔥 40% Probability for 2 Mins
        return 1;                 // 🔥 50% Probability for 1 Min
    };

    const handleSpin = () => {
        if (isSpinning) return;
        setIsSpinning(true);

        // Calculate final reward securely
        const finalReward = calculateReward();

        // 🌀 Start UI Animations
        Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 500,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // 🎰 Number Shuffling Effect
        let shuffles = 0;
        const shuffleInterval = setInterval(() => {
            setDisplayNumber(Math.floor(Math.random() * 3) + 1);
            shuffles++;

            // Stop shuffling after 3 seconds
            if (shuffles > 30) {
                clearInterval(shuffleInterval);
                spinAnim.stopAnimation(); // Stop ring
                setDisplayNumber(finalReward); // Lock in the final reward
                setReward(finalReward);

                // Pop animation for the allocation
                Animated.sequence([
                    Animated.timing(scaleAnim, { toValue: 1.3, duration: 200, useNativeDriver: true }),
                    Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true })
                ]).start();
            }
        }, 100);
        shuffleRef.current = shuffleInterval;
    };

    // 💾 3. Claim and Update Firebase
    const claimReward = async () => {
        if (!userData?.id || reward === null) return;
        
        try {
            await updateDoc(doc(db, "users", userData.id), {
                freeMinsRemaining: reward, // 🔥 Using exact field name from screenshot
                hasSpunWelcomeWheel: true // 🔒 Lock it forever!
            });
            setIsVisible(false); // Close Modal
        } catch (error) {
            // console.error("Error claiming reward:", error);
        }
    };

    const spinInterpolate = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    // 🆕 Interpolations
    const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.65] });
    const glowScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });
    const cardRotX = cardIn.interpolate({ inputRange: [0, 1], outputRange: ['32deg', '0deg'] });
    const cardTY = cardIn.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
    const cardScale = cardIn.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
    const shockScale = burstAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.2] });
    const shockOpacity = burstAnim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.8, 0] });

    // 🆕 Tier tile highlight (shuffle nadakkumbodhu match aagura tile glow)
    const activeTier = reward !== null ? reward : (isSpinning ? displayNumber : null);

    if (!isVisible) return null;

    return (
        <Modal transparent visible={isVisible} animationType="fade">
            <BlurView intensity={90} tint="dark" style={styles.overlay}>
                {/* 🆕 premium tint + soft orbs + floating particles */}
                <LinearGradient
                    colors={['rgba(2,6,23,0.55)', 'rgba(40,12,80,0.45)', 'rgba(2,6,23,0.7)']}
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                />
                <View pointerEvents="none" style={[styles.bgOrb, { top: height * 0.12, right: -90, backgroundColor: '#00F2FE' }]} />
                <View pointerEvents="none" style={[styles.bgOrb, { bottom: height * 0.08, left: -100, backgroundColor: '#8B5CF6' }]} />
                {BG_PARTICLES.map((p, i) => <BgParticle key={i} p={p} />)}

                <Animated.View
                    style={[
                        styles.cardWrap,
                        { opacity: cardIn, transform: [{ perspective: 900 }, { translateY: cardTY }, { rotateX: cardRotX }, { scale: cardScale }] }
                    ]}
                >
                    {/* 🆕 floating 3D gift crowning the card */}
                    <View style={styles.giftNode} pointerEvents="none">
                        <Animated.View style={[styles.giftGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
                        <OrbitRing size={92} color="#00F2FE" dur={5200} dotSize={6} />
                        <OrbitRing size={78} color="#F472B6" dur={8000} reverse dotSize={4} style={{ opacity: 0.7 }} />
                        <FloatBox amp={5} dur={1500}>
                            <Img3D uri={IMG.gift} size={60} fallback="gift" color="#00F2FE" />
                        </FloatBox>
                    </View>

                    <DoubleFrame a="#00F2FE" b="#8B5CF6" radius={34} pad={1.8} shine shineDelay={1200} style={styles.frameGlow}>
                        <View style={styles.container}>
                            <LinearGradient
                                colors={['rgba(0,242,254,0.14)', 'transparent', 'rgba(139,92,246,0.12)']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
                            />

                            {/* 🆕 badge */}
                            <LinearGradient colors={['rgba(0,242,254,0.25)', 'rgba(139,92,246,0.25)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.badge}>
                                <MaterialCommunityIcons name="star-four-points" size={9} color="#7DEBFF" />
                                <Text style={styles.badgeText}>COMPLIMENTARY ACCESS</Text>
                                <MaterialCommunityIcons name="star-four-points" size={9} color="#C4B5FD" />
                            </LinearGradient>

                            <Text style={styles.title}>WELCOME TO TALKPE PRO</Text>
                            <Text style={styles.subtitle}>Unlock Your Complimentary Session with Hosts</Text>

                            {/* 🔥 THE QUANTUM RING */}
                            <View style={styles.wheelWrapper}>
                                {/* 🆕 pulsing aura + reward shockwave */}
                                <Animated.View style={[styles.aura, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
                                <Animated.View style={[styles.shockwave, { opacity: shockOpacity, transform: [{ scale: shockScale }] }]} />

                                {/* 🆕 orbit rings with glowing satellites */}
                                <OrbitRing size={228} color="#00F2FE" dur={7000} dotSize={7} />
                                <OrbitRing size={210} color="#8B5CF6" dur={10000} reverse dotSize={5} style={{ opacity: 0.8 }} />

                                {/* Outer Glowing Ring */}
                                <Animated.View style={[styles.outerRing, { transform: [{ rotate: spinInterpolate }] }]}>
                                    <LinearGradient
                                        colors={['#00F2FE', 'transparent', '#4FACFE', 'transparent', '#8B5CF6', 'transparent']}
                                        style={StyleSheet.absoluteFill}
                                        start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                                    />
                                </Animated.View>

                                {/* Inner Core display */}
                                <FloatBox amp={3} dur={2200}>
                                    <Animated.View style={[styles.innerCore, { transform: [{ scale: scaleAnim }] }]}>
                                        <LinearGradient
                                            colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']}
                                            style={styles.coreGloss}
                                            pointerEvents="none"
                                        />
                                        {reward ? (
                                            <View style={styles.rewardContainer}>
                                                <Text style={styles.rewardNumber}>{reward}</Text>
                                                <Text style={styles.rewardText}>MINS</Text>
                                                <Text style={styles.rewardTextSub}>UNLOCKED</Text>
                                            </View>
                                        ) : (
                                            <Text style={styles.rollingNumber}>{displayNumber}</Text>
                                        )}
                                    </Animated.View>
                                </FloatBox>

                                {/* 🆕 floating 3D coin + diamond around the orb */}
                                <View style={styles.coinNode} pointerEvents="none">
                                    <FloatBox amp={7} dur={2100}>
                                        <Img3D uri={IMG.coin} size={34} fallback="circle-multiple" color="#FBBF24" />
                                    </FloatBox>
                                </View>
                                <View style={styles.diamondNode} pointerEvents="none">
                                    <FloatBox amp={6} dur={2500}>
                                        <Img3D uri={IMG.diamond} size={32} fallback="diamond-stone" color="#7DEBFF" />
                                    </FloatBox>
                                </View>

                                {/* 🆕 confetti burst on reward lock */}
                                {CONFETTI.map((c, i) => (
                                    <Animated.View
                                        key={i}
                                        pointerEvents="none"
                                        style={{
                                            position: 'absolute',
                                            width: c.size,
                                            height: c.size,
                                            borderRadius: c.round ? c.size / 2 : 2,
                                            backgroundColor: c.color,
                                            opacity: burstAnim.interpolate({ inputRange: [0, 0.1, 0.7, 1], outputRange: [0, 1, 1, 0] }),
                                            transform: [
                                                { translateX: burstAnim.interpolate({ inputRange: [0, 1], outputRange: [0, c.dx] }) },
                                                { translateY: burstAnim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, c.dy, c.dy + 46] }) },
                                                { rotate: burstAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', c.rot] }) }
                                            ]
                                        }}
                                    />
                                ))}

                                <Sparkle x={6} y={18} size={13} color="#7DEBFF" delay={0} />
                                <Sparkle x={206} y={40} size={10} color="#C4B5FD" delay={600} />
                                <Sparkle x={18} y={196} size={11} color="#F9A8D4" delay={1100} />
                            </View>

                            {/* 🆕 TIER TILES (1 / 2 / 3 MINS) */}
                            <View style={styles.tierRow}>
                                {[1, 2, 3].map((n) => {
                                    const active = activeTier === n;
                                    const dim = reward !== null && !active;
                                    return (
                                        <DoubleFrame
                                            key={n}
                                            a={active ? '#00F2FE' : '#1E293B'}
                                            b={active ? '#8B5CF6' : '#0F172A'}
                                            radius={18}
                                            pad={1.4}
                                            style={[styles.tierTile, { opacity: dim ? 0.35 : 1, transform: [{ scale: active ? 1.07 : 1 }] }, active && styles.tierGlow]}
                                        >
                                            <View style={styles.tierInner}>
                                                {active && (
                                                    <LinearGradient
                                                        colors={['rgba(0,242,254,0.22)', 'rgba(139,92,246,0.18)']}
                                                        style={StyleSheet.absoluteFill}
                                                        pointerEvents="none"
                                                    />
                                                )}
                                                <Text style={[styles.tierNum, active && { color: '#FFF' }]}>{n}</Text>
                                                <Text style={[styles.tierLabel, active && { color: '#7DEBFF' }]}>{n === 1 ? 'MIN' : 'MINS'}</Text>
                                            </View>
                                        </DoubleFrame>
                                    );
                                })}
                            </View>

                            {/* ACTIONS */}
                            <View style={styles.actionContainer}>
                                {!reward ? (
                                    <TouchableOpacity 
                                        style={styles.spinBtnWrap} 
                                        onPress={handleSpin}
                                        disabled={isSpinning}
                                        activeOpacity={0.85}
                                    >
                                        {!isSpinning && (
                                            <Animated.View style={[styles.btnGlow, { backgroundColor: '#00F2FE', opacity: glowOpacity }]} pointerEvents="none" />
                                        )}
                                        <View style={styles.spinBtn} onLayout={(e) => setBtnW(e.nativeEvent.layout.width)}>
                                            <LinearGradient
                                                colors={isSpinning ? ['#334155', '#1E293B'] : ['#00F2FE', '#2563EB']}
                                                start={{x:0, y:0}} end={{x:1, y:0}}
                                                style={styles.spinGradient}
                                            >
                                                <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']} style={styles.btnGloss} pointerEvents="none" />
                                                <MaterialCommunityIcons name={isSpinning ? "sync" : "shield-check"} size={20} color="#FFF" />
                                                <Text style={styles.spinText}>{isSpinning ? "UNLOCKING BONUS..." : "UNLOCK WELCOME BONUS"}</Text>
                                                {!isSpinning && <ShineSweep w={btnW} delay={1000} />}
                                            </LinearGradient>
                                        </View>
                                    </TouchableOpacity>
                                ) : (
                                    <Animated.View style={{ opacity: scaleAnim }}>
                                        <TouchableOpacity style={styles.spinBtnWrap} onPress={claimReward} activeOpacity={0.85}>
                                            <Animated.View style={[styles.btnGlow, { backgroundColor: '#10B981', opacity: glowOpacity }]} pointerEvents="none" />
                                            <View style={styles.claimBtn} onLayout={(e) => setBtnW(e.nativeEvent.layout.width)}>
                                                <LinearGradient
                                                    colors={['#10B981', '#047857']}
                                                    start={{x:0, y:0}} end={{x:1, y:0}}
                                                    style={styles.spinGradient}
                                                >
                                                    <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']} style={styles.btnGloss} pointerEvents="none" />
                                                    <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                                                    <Text style={styles.spinText}>PROCEED WITH {reward} MINS</Text>
                                                    <ShineSweep w={btnW} delay={800} />
                                                </LinearGradient>
                                            </View>
                                        </TouchableOpacity>
                                    </Animated.View>
                                )}
                            </View>

                            {/* 🆕 footer */}
                            <View style={styles.footerRow}>
                                <MaterialCommunityIcons name="shield-lock" size={13} color="#64748B" />
                                <Text style={styles.footerText}>ONE-TIME WELCOME BONUS  •  FOR NEW MEMBERS</Text>
                            </View>
                        </View>
                    </DoubleFrame>
                </Animated.View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(2, 6, 23, 0.8)',
    },
    bgOrb: {
        position: 'absolute',
        width: 320,
        height: 320,
        borderRadius: 160,
        opacity: 0.1,
    },
    cardWrap: {
        width: width * 0.88,
        alignItems: 'center',
        marginTop: 40,
    },
    giftNode: {
        position: 'absolute',
        top: -56,
        width: 100,
        height: 100,
        zIndex: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    giftGlow: {
        position: 'absolute',
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#00F2FE',
    },
    frameGlow: {
        width: '100%',
        elevation: 24,
        shadowColor: '#00F2FE',
        shadowOpacity: 0.45,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 0 },
    },
    container: {
        width: '100%',
        paddingHorizontal: 24,
        paddingTop: 58,
        paddingBottom: 22,
        alignItems: 'center',
        overflow: 'hidden',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 14,
        marginBottom: 14,
        borderWidth: 1,
        borderColor: 'rgba(125, 235, 255, 0.25)',
    },
    badgeText: {
        color: '#BFEFFF',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 2.5,
    },
    title: {
        color: '#FFF',
        fontSize: 21,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 6,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 242, 254, 0.55)',
        textShadowRadius: 12,
        textShadowOffset: { width: 0, height: 0 },
    },
    subtitle: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 28,
        textAlign: 'center',
        letterSpacing: 1,
    },
    wheelWrapper: {
        width: 240,
        height: 240,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 22,
    },
    aura: {
        position: 'absolute',
        width: 190,
        height: 190,
        borderRadius: 95,
        backgroundColor: '#00F2FE',
    },
    shockwave: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 3,
        borderColor: '#7DEBFF',
    },
    outerRing: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 4,
        borderColor: 'rgba(0, 242, 254, 0.1)',
        overflow: 'hidden',
    },
    innerCore: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#020617',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#1E293B',
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 1,
        shadowRadius: 10,
        overflow: 'hidden',
    },
    coreGloss: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 70,
    },
    coinNode: {
        position: 'absolute',
        top: 14,
        right: 10,
    },
    diamondNode: {
        position: 'absolute',
        bottom: 12,
        left: 8,
    },
    rollingNumber: {
        color: '#00F2FE',
        fontSize: 60,
        fontWeight: '900',
        textShadowColor: 'rgba(0, 242, 254, 0.8)',
        textShadowRadius: 15,
    },
    rewardContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    rewardNumber: {
        color: '#10B981',
        fontSize: 60,
        fontWeight: '900',
        lineHeight: 65,
        textShadowColor: 'rgba(16, 185, 129, 0.8)',
        textShadowRadius: 15,
    },
    rewardText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 2,
    },
    rewardTextSub: {
        color: '#10B981',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    tierRow: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
        marginBottom: 24,
    },
    tierTile: {
        flex: 1,
    },
    tierGlow: {
        elevation: 10,
        shadowColor: '#00F2FE',
        shadowOpacity: 0.7,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 0 },
    },
    tierInner: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
    },
    tierNum: {
        color: '#64748B',
        fontSize: 22,
        fontWeight: '900',
    },
    tierLabel: {
        color: '#475569',
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 2,
        marginTop: 1,
    },
    actionContainer: {
        width: '100%',
    },
    spinBtnWrap: {
        width: '100%',
        height: 58,
        justifyContent: 'center',
    },
    btnGlow: {
        position: 'absolute',
        left: 14,
        right: 14,
        top: 8,
        bottom: -4,
        borderRadius: 30,
    },
    spinBtn: {
        width: '100%',
        height: 55,
        borderRadius: 27.5,
        overflow: 'hidden',
    },
    claimBtn: {
        width: '100%',
        height: 55,
        borderRadius: 27.5,
        overflow: 'hidden',
        shadowColor: '#10B981',
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
    },
    spinGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        overflow: 'hidden',
    },
    btnGloss: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 22,
    },
    spinText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1.5,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 16,
    },
    footerText: {
        color: '#64748B',
        fontSize: 8.5,
        fontWeight: '800',
        letterSpacing: 2,
    }
});