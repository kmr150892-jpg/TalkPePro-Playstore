import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, query, updateDoc, where } from 'firebase/firestore'; // 🔥 SATTI FIX: Added getDocs
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { sendNotificationToUser } from '../../utils/notificationHelper'; // 🔥 IMPORTED NOTIFICATION HELPER

const { width, height } = Dimensions.get('window');

// 🆕 CARD LAYOUT CONSTANTS (scroll-driven 3D wheel effect)
const CARD_ITEM_H = 134;      // approx card height + margin
const LIST_PAD_TOP = 20;      // spacing between header & first card
const MINI_SHOW_AT = 210;     // scroll offset where compact mini-bar appears

// 🔥 THE UNIVERSAL USER TIER ENGINE (FOR LIST ITEMS SYNC)
const calculateUserTier = (diamonds: number) => {
    if (diamonds >= 500000001) return { lvl: 8, label: 'TITAN L8', color: '#FF0033' };
    if (diamonds >= 100000001) return { lvl: 7, label: 'MYTHIC L7', color: '#D946EF' };
    if (diamonds >= 50000000) return { lvl: 6, label: 'GRANDMASTER L6', color: '#9c77f3' };
    if (diamonds >= 10000000) return { lvl: 5, label: 'ELITE L5', color: '#00F2FE' };
    if (diamonds >= 5000000) return { lvl: 4, label: 'LEGEND L4', color: '#d0630a' };
    if (diamonds >= 1000000) return { lvl: 3, label: 'DIAMOND L3', color: '#4ADE80' };
    if (diamonds >= 200001) return { lvl: 2, label: 'GOLD L2', color: '#ffae00' };
    return { lvl: 1, label: 'SILVER L1', color: '#0f33e7' };
};

// ✅ ACCURATE EXPERT THEME & LEVEL CONFIG (FOR HEADER & GLOBAL UI)
const getLevelConfig = (beans: number) => {
    if (beans >= 100000000) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'], glow: '#F59E0B' };
    if (beans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'], glow: '#EC4899' };
    if (beans >= 30000000) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'], glow: '#8B5CF6' };
    if (beans >= 10000000) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'], glow: '#3B82F6' };
    if (beans >= 5000000)  return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'], glow: '#06B6D4' };
    if (beans >= 3000000)  return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'], glow: '#10B981' };
    if (beans >= 1000000)  return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'], glow: '#EAB308' };
    if (beans >= 300000)   return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'], glow: '#94A3B8' };
    if (beans >= 100000)   return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'], glow: 'transparent' };
    if (beans >= 30000)    return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'], glow: 'transparent' };
    return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'], glow: 'transparent' };
};

// 🆕 PROGRESS HELPERS (next level progress for expert + user tier)
const EXPERT_STEPS = [0, 30000, 100000, 300000, 1000000, 3000000, 5000000, 10000000, 30000000, 50000000, 100000000];
const getLevelProgress = (beans: number) => {
    let idx = 0;
    for (let i = EXPERT_STEPS.length - 1; i >= 0; i--) {
        if (beans >= EXPERT_STEPS[i]) { idx = i; break; }
    }
    if (idx >= EXPERT_STEPS.length - 1) return { progress: 1, remaining: 0, maxed: true, nextLvl: idx };
    const lo = EXPERT_STEPS[idx];
    const hi = EXPERT_STEPS[idx + 1];
    return { progress: (beans - lo) / (hi - lo), remaining: hi - beans, maxed: false, nextLvl: idx + 1 };
};

const USER_STEPS = [0, 200001, 1000000, 5000000, 10000000, 50000000, 100000001, 500000001];
const getTierProgress = (diamonds: number, lvl: number) => {
    const idx = Math.max(0, Math.min(USER_STEPS.length - 1, lvl - 1));
    if (idx >= USER_STEPS.length - 1) return 1;
    const lo = USER_STEPS[idx];
    const hi = USER_STEPS[idx + 1];
    return Math.max(0, Math.min(1, (diamonds - lo) / (hi - lo)));
};

const formatCompact = (n: number) => {
    if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
};

// 🆕 COLOR HELPERS (level color -> light / dark variants, text-safe colours)
const hexToRgb = (hex: string) => {
    const h = (hex || '').replace('#', '');
    if (h.length !== 6) return null;
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
};
const blend = (c1: string, c2: string, t: number) => {
    const a = hexToRgb(c1);
    const b = hexToRgb(c2);
    if (!a || !b) return c1;
    const mix = (x: number, y: number) => Math.round(x * (1 - t) + y * t).toString(16).padStart(2, '0');
    return `#${mix(a.r, b.r)}${mix(a.g, b.g)}${mix(a.b, b.b)}`;
};
const lighten = (hex: string, t: number) => blend(hex, '#FFFFFF', t);
const darken = (hex: string, t: number) => blend(hex, '#000000', t);

// 🆕 Perceived brightness (0-1) + "vivid" = too dark colour-a automatic-a brighten pannum (border colour theriyanum)
const luma = (hex: string) => {
    const c = hexToRgb(hex);
    if (!c) return 0.5;
    return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
};
const vivid = (hex: string, min = 0.3) => {
    let h = hex;
    let i = 0;
    while (luma(h) < min && i < 8) {
        h = lighten(h, 0.14);
        i++;
    }
    return h;
};

// 🆕 BACKGROUND IMAGE (starry nebula)
const BG_IMG = 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1080&q=70';

// 🆕 3D IMAGES (icons8 3D Fluency) - load aagalana automatic-a icon fallback varum
const IMG = {
    chat: 'https://img.icons8.com/3d-fluency/512/speech-bubble.png',
    handshake: 'https://img.icons8.com/3d-fluency/512/handshake.png',
    crown: 'https://img.icons8.com/3d-fluency/512/crown.png',
    trophy: 'https://img.icons8.com/3d-fluency/512/trophy.png',
    star: 'https://img.icons8.com/3d-fluency/512/star.png',
    diamond: 'https://img.icons8.com/3d-fluency/512/diamond.png',
    coin: 'https://img.icons8.com/3d-fluency/512/coin.png',
};

// 🆕 3D image with auto icon fallback
const Img3D = ({ uri, size, fallback, color = '#FFF', style }: any) => {
    const [err, setErr] = useState(false);
    if (err) return <Ionicons name={fallback} size={size * 0.7} color={color} />;
    return <Image source={{ uri }} style={[{ width: size, height: size }, style]} resizeMode="contain" onError={() => setErr(true)} />;
};

// 🆕 Floating (bob + sway) wrapper
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
                        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -amp] }) },
                        { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) }
                    ]
                }
            ]}
        >
            {children}
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
            <Ionicons name="sparkles" size={size} color={color} />
        </Animated.View>
    );
};

// 🆕 Pulse dot (online / live)
const PulseDot = ({ color, size = 8 }: { color: string; size?: number }) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(v, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(v, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <View style={{ width: size + 8, height: size + 8, justifyContent: 'center', alignItems: 'center', marginRight: 4 }}>
            <Animated.View
                style={{
                    position: 'absolute',
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0.15] }),
                    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }]
                }}
            />
            <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
        </View>
    );
};

// 🆕 Unread badge with bounce pulse
const BounceBadge = ({ style, children }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(v, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <Animated.View style={[style, { transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }]}>
            {children}
        </Animated.View>
    );
};

// 🆕 ORBIT RING (rotating dashed ring + glowing satellite dot) - 3D orbit feel
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

// 🆕 GLOW PROGRESS BAR (animated fill)
const GlowBar = ({ progress, color, height = 6, style }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(v, { toValue: Math.max(0, Math.min(1, progress || 0)), duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, [progress]);
    const w = v.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });
    return (
        <View style={[{ height, borderRadius: height / 2, backgroundColor: 'rgba(255,255,255,0.10)', overflow: 'hidden' }, style]}>
            <Animated.View
                style={{
                    width: w,
                    height: '100%',
                    borderRadius: height / 2,
                    backgroundColor: color,
                    shadowColor: color,
                    shadowOpacity: 0.9,
                    shadowRadius: 6,
                    shadowOffset: { width: 0, height: 0 }
                }}
            />
        </View>
    );
};

// 🆕 COUNT UP NUMBER
const CountUp = ({ value, style, prefix = '', duration = 900 }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    const [txt, setTxt] = useState(0);
    useEffect(() => {
        const id = v.addListener(({ value: val }) => setTxt(Math.round(val)));
        Animated.timing(v, { toValue: value || 0, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
        return () => v.removeListener(id);
    }, [value]);
    return <Text style={style} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{prefix}{txt}</Text>;
};

// 🆕 RADIAL TICK GAUGE (level progress ring - ticks light up one by one)
const GaugeRing = ({ progress, color, size = 232, ticks = 56 }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    const [lit, setLit] = useState(0);
    const tickArr = useRef(Array.from({ length: ticks }, (_, i) => i)).current;
    useEffect(() => {
        const id = v.addListener(({ value: val }) => {
            const n = Math.round(val * ticks);
            setLit(prev => (prev === n ? prev : n));
        });
        Animated.timing(v, { toValue: Math.max(0, Math.min(1, progress || 0)), duration: 1600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
        return () => v.removeListener(id);
    }, [progress]);
    const radius = size / 2 - 10;
    return (
        <View pointerEvents="none" style={{ width: size, height: size, position: 'absolute' }}>
            {tickArr.map(i => {
                const isLit = i < lit;
                const isEdge = i === lit - 1;
                return (
                    <View
                        key={i}
                        style={{
                            position: 'absolute',
                            left: size / 2 - 2,
                            top: size / 2 - (isEdge ? 8 : 6),
                            width: 4,
                            height: isEdge ? 16 : 12,
                            borderRadius: 2,
                            backgroundColor: isLit ? color : 'rgba(255,255,255,0.12)',
                            shadowColor: color,
                            shadowOpacity: isLit ? 0.9 : 0,
                            shadowRadius: 5,
                            shadowOffset: { width: 0, height: 0 },
                            transform: [{ rotate: `${(i * 360) / ticks}deg` }, { translateY: -radius }]
                        }}
                    />
                );
            })}
        </View>
    );
};

// 🆕 STAT TILE (glass tile with DOUBLE COLOUR gradient frame + round icon badge - NO divider lines)
const StatTile = ({ icon, label, color, glow, frameA, frameB, children, enter }: any) => (
    <Animated.View
        style={{
            flex: 1,
            opacity: enter,
            transform: [
                { perspective: 700 },
                { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
                { rotateX: enter.interpolate({ inputRange: [0, 1], outputRange: ['40deg', '0deg'] }) }
            ]
        }}
    >
        {/* 🆕 DOUBLE COLOUR frame (frameA + frameB = theme two colours, darker shade) */}
        <LinearGradient colors={[frameA || (color + 'AA'), frameB || 'rgba(255,255,255,0.05)', frameA || (glow + '66')]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statTileFrame}>
            <BlurView intensity={22} tint="dark" style={styles.statTile}>
                {/* 🆕 DARKER: tile tint 22 -> 16 */}
                <LinearGradient colors={[color + '16', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                <View style={[styles.statIconBadge, { backgroundColor: color + '2A', shadowColor: color }]}>
                    <Ionicons name={icon} size={13} color={color} />
                </View>
                {children}
                <Text style={styles.summaryLabel}>{label}</Text>
            </BlurView>
        </LinearGradient>
    </Animated.View>
);

// 🆕 User card "HOLO PASS" (stagger entrance + scroll-driven 3D wheel + press tilt + holo shine)
const UserCard = ({ item, index, activeTab, theme, userTier, scrollY, headerH, onOpenProfile, onChat, onDeleteChat, onDisconnect, onAccept, onReject }: any) => {
    const anim = useRef(new Animated.Value(0)).current;
    const press = useRef(new Animated.Value(0)).current; // 🆕 3D press tilt
    const shine = useRef(new Animated.Value(0)).current; // 🆕 holographic shine sweep

    useEffect(() => {
        Animated.spring(anim, { toValue: 1, delay: Math.min(index, 8) * 70, friction: 7, tension: 55, useNativeDriver: true }).start();

        const shineLoop = Animated.loop(
            Animated.sequence([
                Animated.delay(1500 + (index % 6) * 450),
                Animated.timing(shine, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
                Animated.delay(3500)
            ])
        );
        shineLoop.start();
        return () => shineLoop.stop();
    }, []);

    const handlePressIn = () => Animated.spring(press, { toValue: 1, useNativeDriver: true, friction: 6, tension: 120 }).start();
    const handlePressOut = () => Animated.spring(press, { toValue: 0, useNativeDriver: true, friction: 5, tension: 90 }).start();

    // 🆕 SCROLL-DRIVEN 3D WHEEL (card tilts in from bottom, leans back when leaving top)
    const itemTop = headerH + LIST_PAD_TOP + index * CARD_ITEM_H;
    const sRange = [itemTop - height, itemTop - height * 0.6, itemTop + 20, itemTop + CARD_ITEM_H * 2.2];
    const scrollRotX = scrollY.interpolate({ inputRange: sRange, outputRange: ['26deg', '0deg', '0deg', '-9deg'], extrapolate: 'clamp' });
    const scrollScale = scrollY.interpolate({ inputRange: sRange, outputRange: [0.88, 1, 1, 0.94], extrapolate: 'clamp' });
    const scrollOpacity = scrollY.interpolate({ inputRange: sRange, outputRange: [0.3, 1, 1, 0.55], extrapolate: 'clamp' });
    const scrollTY = scrollY.interpolate({ inputRange: sRange, outputRange: [34, 0, 0, 0], extrapolate: 'clamp' });

    const tierText = lighten(userTier.color, 0.5); // 🆕 text-safe tier colour
    const tierProgress = getTierProgress(item.totalSpent || 0, userTier.lvl);
    const isVip = userTier.lvl >= 5;
    // 🆕 DOUBLE COLOUR BORDER: theme primary + secondary (L0 = pink + blue), darker shade
    const borderColors = index % 2 === 0
        ? [theme.bA, theme.bB, theme.bA]
        : [theme.bB, theme.bA, theme.bB];

    return (
        <Animated.View
            style={[
                styles.cardWrapper,
                {
                    opacity: Animated.multiply(anim, scrollOpacity),
                    transform: [
                        { perspective: 900 },
                        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                        { translateY: scrollTY },
                        { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                        { rotateX: scrollRotX },
                        { scale: scrollScale },
                        { rotateX: press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '7deg'] }) },
                        { rotateY: press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', index % 2 === 0 ? '-8deg' : '8deg'] }) },
                        { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) }
                    ]
                }
            ]}
        >
            <TouchableOpacity activeOpacity={0.8} onLongPress={onDeleteChat} onPressIn={handlePressIn} onPressOut={handlePressOut}>
                <View style={[styles.cardGlow, { shadowColor: userTier.color }]}>
                    <LinearGradient colors={borderColors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardBorder}>
                        <BlurView intensity={15} tint="dark" style={styles.fluidUserCard}>
                            {/* 🆕 DARKER: tier tint 26 -> 1A, dark overlay 0.62 -> 0.82 */}
                            <LinearGradient colors={[userTier.color + '1A', 'rgba(3,2,10,0.82)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                            <View style={[styles.cardAccent, { backgroundColor: userTier.color }]} />
                            <View style={styles.cardWatermark} pointerEvents="none">
                                <Ionicons name="diamond" size={96} color={userTier.color + '14'} />
                            </View>
                            {/* 🆕 3D diamond watermark */}
                            <View style={styles.cardWatermark3D} pointerEvents="none">
                                <Img3D uri={IMG.diamond} size={110} fallback="diamond" color={userTier.color + '22'} style={{ opacity: 0.12 }} />
                            </View>

                            {/* 🆕 Holographic shine sweep */}
                            <Animated.View
                                pointerEvents="none"
                                style={[
                                    styles.cardShine,
                                    {
                                        transform: [
                                            { translateX: shine.interpolate({ inputRange: [0, 1], outputRange: [-140, width] }) },
                                            { rotate: '18deg' }
                                        ]
                                    }
                                ]}
                            >
                                <LinearGradient colors={['transparent', 'rgba(255,255,255,0.14)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            </Animated.View>

                            <View style={styles.avatarNode}>
                                {/* 🆕 Orbit rings around avatar */}
                                <OrbitRing size={64} color={userTier.color} dur={5200 + (index % 4) * 600} dotSize={5} />
                                <OrbitRing size={52} color={lighten(userTier.color, 0.45)} dur={7600} reverse dotSize={4} style={{ opacity: 0.7 }} />
                                <TouchableOpacity onPress={onOpenProfile}>
                                    {/* ✅ RING COLOR DiscoverES USER'S OWN TIER */}
                                    <LinearGradient colors={[lighten(userTier.color, 0.5), userTier.color, darken(userTier.color, 0.35)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.nodeAvatarRing, { shadowColor: userTier.color }]}>
                                        <Image source={{ uri: item.userImage || `https://ui-avatars.com/api/?name=${item.userName}&background=1E293B&color=fff&bold=true` }} style={styles.nodeAvatarImg} />
                                    </LinearGradient>
                                    {activeTab === 'USERS' && <View style={styles.onlineStatus} />}
                                </TouchableOpacity>
                                {/* 🆕 3D crown for high tier users */}
                                {isVip && (
                                    <FloatBox amp={3} dur={1500} style={styles.vipCrown}>
                                        <Img3D uri={IMG.crown} size={22} fallback="ribbon" color={tierText} />
                                    </FloatBox>
                                )}
                            </View>

                            <View style={styles.infoNode}>
                                {/* 🆕 NODE tag */}
                                <Text style={[styles.nodeTagText, { color: tierText }]} numberOfLines={1}>NODE {String(index + 1).padStart(2, '0')}</Text>
                                <TouchableOpacity onPress={onOpenProfile}>
                                    <Text style={styles.userName} numberOfLines={1}>{item.userName.toUpperCase()}</Text>
                                </TouchableOpacity>
                                <View style={styles.statusRow}>
                                    <View style={[styles.tierPill, { backgroundColor: userTier.color + '30', borderColor: userTier.color + '88' }]}>
                                        <Ionicons name="diamond" size={9} color={tierText} style={{ marginRight: 4 }} />
                                        <Text style={[styles.statusText, { color: tierText }]}>{userTier.label}</Text>
                                    </View>
                                    {isVip && (
                                        <View style={[styles.vipTag, { borderColor: tierText + '88' }]}>
                                            <Text style={[styles.vipTagText, { color: tierText }]}>VIP</Text>
                                        </View>
                                    )}
                                </View>
                                {/* 🆕 Tier progress + diamonds */}
                                <View style={styles.tierProgressRow}>
                                    <GlowBar progress={tierProgress} color={userTier.color} height={4} style={{ flex: 1 }} />
                                    <Text style={[styles.tierAmount, { color: tierText }]}>{formatCompact(item.totalSpent || 0)}</Text>
                                </View>
                            </View>

                            {activeTab === 'USERS' ? (
                                <View style={styles.actionNode}>
                                    {/* Button also navigates or deletes on long press */}
                                    <TouchableOpacity onPress={onChat} onLongPress={onDeleteChat} activeOpacity={0.85}>
                                        <LinearGradient colors={[lighten(userTier.color, 0.15), userTier.color, darken(userTier.color, 0.3)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.fluidRoundBtn, styles.stackBtn, { shadowColor: userTier.color }]}>
                                            <LinearGradient colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']} style={styles.btnGloss} pointerEvents="none" />
                                            <Ionicons name="chatbubble-ellipses" size={18} color="#FFF" />
                                            {item.unread > 0 && (
                                                <BounceBadge style={styles.glowBadge}>
                                                    <Text style={styles.badgeVal}>{item.unread}</Text>
                                                </BounceBadge>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={onDisconnect} style={[styles.fluidRoundBtn, styles.stackBtn, { backgroundColor: 'rgba(244, 63, 94, 0.15)', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)' }]}>
                                        <Ionicons name="close" size={18} color="#FB7185" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.requestNode}>
                                    <TouchableOpacity onPress={onAccept} activeOpacity={0.85}>
                                        <LinearGradient colors={[lighten(theme.primary, 0.15), theme.primary, darken(theme.primary, 0.3)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.acceptMiniBtn, { shadowColor: theme.primary }]}>
                                            <LinearGradient colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']} style={styles.btnGloss} pointerEvents="none" />
                                            <Ionicons name="link" size={14} color="#FFF" style={{ marginRight: 5 }} />
                                            <Text style={styles.miniPillText}>LINK</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                    {/* 🔥 NEW: REJECT button (request-a decline pannum + user-ku notification pogum) */}
                                    <TouchableOpacity onPress={onReject} activeOpacity={0.85} style={styles.rejectMiniBtn}>
                                        <Ionicons name="close" size={14} color="#FB7185" style={{ marginRight: 4 }} />
                                        <Text style={styles.rejectPillText}>REJECT</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </BlurView>
                    </LinearGradient>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

interface ExpertMessagesProps {
    onBlockUser: (targetUserId: string) => Promise<void>;
}

export default function ExpertMessages({ onBlockUser }: ExpertMessagesProps) {
    const [activeTab, setActiveTab] = useState<'USERS' | 'REQUESTS'>('USERS');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expertProfile, setExpertProfile] = useState<any>(null);
    
    // 🔥 NEW STATES FOR REQUEST BADGE ALERTS 🔥
    const [newRequestCount, setNewRequestCount] = useState(0);
    const [lastKnownRequestIds, setLastKnownRequestIds] = useState<string[]>([]);
    
    const expert = auth.currentUser;
    const router = useRouter();

    // 🔥 ANIMATION REFS FOR SHIMMER ORBS
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    // 🆕 PREMIUM ANIMATION VALUES
    const rotAnim = useRef(new Animated.Value(0)).current;   // core spinning ring
    const sweepAnim = useRef(new Animated.Value(0)).current; // stat dock shine sweep
    const tabSlide = useRef(new Animated.Value(0)).current;  // tab pill slide
    const tabPop = useRef(new Animated.Value(1)).current;    // 🆕 tab 3D pop on switch
    const tabAnim = useRef(new Animated.Value(1)).current;   // list content transition
    const heroIn = useRef(new Animated.Value(0)).current;    // hero entrance
    const [tabW, setTabW] = useState(0);
    const [bgErr, setBgErr] = useState(false); // 🆕 background image load aagalana fallback

    // 🆕 SCROLL ENGINE (whole screen scrolls: hero parallax, mini bar, 3D wheel cards)
    const scrollY = useRef(new Animated.Value(0)).current;
    const listRef = useRef<any>(null);
    const miniShown = useRef(false);
    const [showMini, setShowMini] = useState(false);
    const [headerH, setHeaderH] = useState(520);
    const onScroll = useRef(
        Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
            useNativeDriver: true,
            listener: (e: any) => {
                const show = e.nativeEvent.contentOffset.y > MINI_SHOW_AT;
                if (show !== miniShown.current) {
                    miniShown.current = show;
                    setShowMini(show);
                }
            }
        })
    ).current;

    const particles = useRef(
        Array.from({ length: 12 }, (_, i) => ({
            v: new Animated.Value(0),
            x: ((i * 41) % 100) / 100 * width,
            y: 160 + ((i * 59) % 460),
            size: 2 + (i % 3),
            dur: 6500 + (i % 5) * 1200,
            delay: i * 500,
        }))
    ).current;

    // 🔥 Expert Own Dynamic Theme Core
    const totalBeansEarned = expertProfile?.totalBeansEarned || 0;
    const config = getLevelConfig(totalBeansEarned);
    const levelProgress = getLevelProgress(totalBeansEarned); // 🆕 next level progress
    
    const theme = {
        primary: config.colors[0],
        secondary: config.colors[2],
        accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
        // 🆕 TEXT-SAFE colours (dark colours text-la nalla theriya brighten panniruken)
        accentText: lighten(config.glow !== 'transparent' ? config.glow : config.colors[0], 0.45),
        primaryText: lighten(config.colors[0], 0.4),
        secondaryText: lighten(config.colors[2], 0.62),
        // 🆕 DOUBLE COLOUR BORDER PAIR (darker shade): primary + secondary (L0 = pink + blue)
        bA: darken(vivid(config.colors[0], 0.3), 0.18),
        bB: darken(vivid(config.colors[2], 0.3), 0.18),
        // 🔥 DYNAMIC BACKGROUND DESIGN - MATTERS LEVEL COLORS (🆕 DARKER: 40 -> 22, 20 -> 14, base colours deeper)
        bgGradient: [
            config.lvl >= 7 ? `${config.colors[0]}22` : '#010309',
            config.lvl >= 3 ? `${config.colors[1]}14` : '#050A18',
            '#010309'
        ] as const
    };
    const PARTICLE_COLORS = [theme.accent, theme.primary, theme.secondary, '#FFFFFF'];

    useEffect(() => {
        // Start Ambient Animation
        Animated.loop(
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true
          })
        ).start();

        // 🆕 Core rotating ring + shine sweep + entrance
        const rotLoop = Animated.loop(Animated.timing(rotAnim, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true }));
        rotLoop.start();
        const sweepLoop = Animated.loop(
            Animated.sequence([
                Animated.delay(2000),
                Animated.timing(sweepAnim, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(sweepAnim, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        );
        sweepLoop.start();
        Animated.spring(heroIn, { toValue: 1, friction: 6, tension: 45, useNativeDriver: true }).start();

        // 🆕 Floating particles
        particles.forEach((p) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(p.delay),
                    Animated.timing(p.v, { toValue: 1, duration: p.dur, easing: Easing.linear, useNativeDriver: true }),
                    Animated.timing(p.v, { toValue: 0, duration: 0, useNativeDriver: true })
                ])
            ).start();
        });
    }, []);

    // 🆕 Tab pill slide + list content transition (+ 3D pop on the active tab)
    useEffect(() => {
        Animated.spring(tabSlide, { toValue: activeTab === 'USERS' ? 0 : 1, useNativeDriver: true, friction: 8, tension: 70 }).start();
        tabPop.setValue(0.9);
        Animated.spring(tabPop, { toValue: 1, useNativeDriver: true, friction: 4, tension: 110 }).start();
        tabAnim.setValue(0);
        Animated.timing(tabAnim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, [activeTab]);

    // 🔥 NEW EFFECT: INDEPENDENT BACKGROUND LISTENER FOR PENDING REQUESTS & NOTIFICATIONS 🔥
    useEffect(() => {
        if (!expert?.uid) return;

        const requestQuery = query(collection(db, "connections"), where("receiverId", "==", expert.uid), where("status", "==", 'pending'));

        const unsubRequests = onSnapshot(requestQuery, async (snapshot) => {
            const currentIds = snapshot.docs.map(doc => doc.id);
            
            // Check if there are new requests that we haven't seen yet
            const newIncomingIds = currentIds.filter(id => !lastKnownRequestIds.includes(id));
            
            if (newIncomingIds.length > 0 && lastKnownRequestIds.length > 0) {
                // If there's a new request and it's not the initial load, send a Notification!
                for (const docSnap of snapshot.docs) {
                    if (newIncomingIds.includes(docSnap.id)) {
                        const connData = docSnap.data();
                        await sendNotificationToUser(
                            expert.uid,
                            "New Connection Request! 🤝",
                            `${connData.senderName || 'A user'} wants to connect with you. Check your requests tab!`,
                            "system"
                        );
                    }
                }
            }

            // Only update the unread badge if we are NOT currently on the REQUESTS tab
            if (activeTab !== 'REQUESTS') {
                setNewRequestCount(currentIds.length);
            } else {
                // If we are already on the tab, clear it immediately
                setNewRequestCount(0);
            }

            // Keep track of known IDs to detect future new ones
            setLastKnownRequestIds(currentIds);
        });

        return () => unsubRequests();
    }, [expert?.uid, activeTab, lastKnownRequestIds]);

    useEffect(() => {
        if (!expert?.uid) return;
        setLoading(true);

        const expertRef = doc(db, "users", expert.uid);
        const unsubExpert = onSnapshot(expertRef, (snap) => {
            if (snap.exists()) setExpertProfile(snap.data());
        });

        const statusQuery = activeTab === 'USERS' ? 'friend' : 'pending';
        const q = query(collection(db, "connections"), where("receiverId", "==", expert.uid), where("status", "==", statusQuery));

        let unsubscribeChats: (() => void) | null = null;

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const usersData = await Promise.all(
                snapshot.docs.map(async (connDoc) => {
                    const connData = connDoc.data();
                    const userId = connData.senderId;
                    const userRef = doc(db, "users", userId);
                    const userSnap = await getDoc(userRef);
                    const uData = userSnap.exists() ? userSnap.data() : {};

                    const highestDiamonds = uData?.totalSpentDiamonds || 0;

                    return {
                        id: connDoc.id,
                        ...connData,
                        userName: uData.displayName || uData.name || connData.senderName || "User",
                        userImage: uData.profilePic || uData.photoURL || connData.senderImage || null,
                        userId: userId,
                        totalSpent: highestDiamonds, // 🔥 Replaced simple totalSpentDiamonds with Highest Balance Logic
                        unread: 0
                    };
                })
            );

            setData(usersData);
            setLoading(false);

            if (activeTab === 'USERS' && usersData.length > 0 && expert?.uid) {
                if (unsubscribeChats) unsubscribeChats();
                const chatQ = query(collection(db, "chats"), where("participants", "array-contains", expert.uid));
                unsubscribeChats = onSnapshot(chatQ, (chatSnapshot) => {
                    const chatCounts: any = {};
                    chatSnapshot.docs.forEach(docSnap => {
                        const cData = docSnap.data();
                        if (cData.unreadCount && expert.uid) {
                            chatCounts[docSnap.id] = cData.unreadCount[expert.uid] || 0;
                        }
                    });

                    setData(prevData => prevData.map(user => {
                        const chatId1 = `${expert.uid}_${user.userId}`;
                        const chatId2 = `${user.userId}_${expert.uid}`;
                        const unreadVal = chatCounts[chatId1] || chatCounts[chatId2] || 0;
                        return { ...user, unread: unreadVal };
                    }));
                });
            }
        });

        return () => {
            unsubscribe(); unsubExpert(); if (unsubscribeChats) unsubscribeChats();
        };
    }, [activeTab, expert?.uid]);

    // 🔥 SATTI FIX: FIREBASE DEEP SUBCOLLECTION WIPEOUT ENGINE 🔥
    const executeChatWipeout = async (chatId: string) => {
        try {
            // 1. Fetch all ghost messages in the subcollection
            const msgsSnap = await getDocs(collection(db, "chats", chatId, "messages"));
            
            // 2. Erase every single message
            const deletePromises = msgsSnap.docs.map(msgDoc => deleteDoc(doc(db, "chats", chatId, "messages", msgDoc.id)));
            await Promise.all(deletePromises);
            
            // 3. Destroy the main Chat Room
            await deleteDoc(doc(db, "chats", chatId));
        } catch (e) {
            console.log("Deep wipeout failed:", e);
        }
    };

    const handleAccept = async (id: string, senderId: string) => {
        if (!expert?.uid) return;
        try {
            await updateDoc(doc(db, "connections", id), { status: 'friend' });
            await updateDoc(doc(db, "users", senderId), { friendsCount: increment(1) });
            await updateDoc(doc(db, "users", expert.uid), { friendsCount: increment(1) });
        } catch (e) { Alert.alert("Error", "Transmission failed."); }
    };

    // 🔥 NEW: REJECT a pending connection request + send "Connection Declined" notification to that user
    // (user app notifications screen: title la "Declined" irukkradhala violet CONNECTION card-a kaattum, tap -> host profile)
    const handleRejectRequest = (item: any) => {
        if (!expert?.uid) return;
        const targetUserId = item?.senderId || item?.userId;
        if (!item?.id || !targetUserId) return;

        Alert.alert("Decline Request", `Decline ${item.userName || 'this user'}'s connection request?`, [
            { text: "CANCEL", style: "cancel" },
            {
                text: "REJECT",
                style: "destructive",
                onPress: async () => {
                    try {
                        // 1. request-a list-la irundhu remove pannum
                        await deleteDoc(doc(db, "connections", item.id));

                        // 2. user-ku notification (host name + photo oda, tap pannaa host profile open aagum)
                        const hostName = expertProfile?.name || expertProfile?.displayName || expert?.displayName || 'A host';
                        const hostPic = expertProfile?.profilePic || expertProfile?.photoURL || undefined;
                        await sendNotificationToUser(
                            targetUserId,
                            "Connection Declined",
                            `${hostName} declined your connection request.`,
                            "system",
                            { callerId: expert.uid, callerImage: hostPic }
                        );
                    } catch (e) {
                        console.log("Reject request error:", e);
                        Alert.alert("Error", "Could not decline the request. Please try again.");
                    }
                }
            }
        ]);
    };

    const handleRejectOrUnfollow = async (id: string, type: string, otherUserId?: string) => {
        if (!expert?.uid) return;
        Alert.alert("Manage Link", `${type} this node?`, [
            { text: "CANCEL", style: "cancel" },
            { text: "DISCONNECT", onPress: async () => {
                try {
                    await deleteDoc(doc(db, "connections", id));
                    if (type === 'Disconnect' && otherUserId) {
                        await updateDoc(doc(db, "users", otherUserId), { friendsCount: increment(-1) }).catch(() => {});
                        await updateDoc(doc(db, "users", expert.uid), { friendsCount: increment(-1) }).catch(() => {});
                        
                        // 🔥 SATTI FIX: Deep wipeout when unfollowing! 🔥
                        const chatId1 = `${expert.uid}_${otherUserId}`;
                        const chatId2 = `${otherUserId}_${expert.uid}`;
                        await executeChatWipeout(chatId1);
                        await executeChatWipeout(chatId2);
                    }
                } catch (e) { console.log(e); }
            }},
            { text: "BLOCK", style: "destructive", onPress: () => { if(otherUserId) onBlockUser(otherUserId); } }
        ]);
    };

    // 🔥 NEW: EXPERT DELETE CHAT LOGIC (DEEP WIPEOUT) 🔥
    const handleDeleteChat = (chatId: string) => {
        Alert.alert(
            "Delete Entire Chat",
            "Are you sure you want to permanently delete this entire chat history?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete All", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            // 🔥 SATTI FIX: Trigger the Deep Wipeout Engine 🔥
                            await executeChatWipeout(chatId);
                            Alert.alert("Deleted", "Chat wipeout successful.");
                        } catch (error) {
                            Alert.alert("Error", "Could not delete the chat.");
                        }
                    } 
                }
            ]
        );
    };

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -30]
    });

    // 🆕 DOUBLE COLOUR per-side border (top/left = colour A, bottom/right = colour B) - darker shade
    const sideMix: any = {
        borderTopColor: theme.bA,
        borderLeftColor: theme.bA,
        borderBottomColor: theme.bB,
        borderRightColor: theme.bB,
    };

    // 🔥 UNIFORM FRAME STYLES (💥 LINE FIX: pazhaya thick left/right + thin top/bottom border thaan "line" mathiri theriyuthu. Ippo ellam side-um same thin border)
    // 🆕 DARKER: bg 0.62 -> 0.8, 0.66 -> 0.82
    const borderType1 = {
        borderWidth: 1.2,
        borderColor: theme.accent + '66',
        ...sideMix,
        backgroundColor: 'rgba(4, 7, 18, 0.8)',
    };

    const borderType2 = {
        borderWidth: 1.2,
        borderColor: theme.secondary + '66',
        ...sideMix,
        backgroundColor: 'rgba(4, 7, 18, 0.82)',
    };

    // 🆕 Interpolations
    const spin = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const sweepX = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.6, width * 1.1] });
    const tabSegW = tabW > 0 ? (tabW - 12) / 2 : 0; // container padding 6 + 6

    // 🆕 Scroll-driven interpolations (hero parallax / stretchy header / mini bar / background depth)
    const stageScale = scrollY.interpolate({ inputRange: [-160, 0, 320], outputRange: [1.14, 1, 0.9], extrapolate: 'clamp' });
    const stageTY = scrollY.interpolate({ inputRange: [-160, 0, 320], outputRange: [10, 0, 70], extrapolate: 'clamp' });
    const stageOpacity = scrollY.interpolate({ inputRange: [0, 150, 300], outputRange: [1, 0.85, 0.25], extrapolate: 'clamp' });
    const miniOpacity = scrollY.interpolate({ inputRange: [MINI_SHOW_AT - 20, MINI_SHOW_AT + 40], outputRange: [0, 1], extrapolate: 'clamp' });
    const miniTY = scrollY.interpolate({ inputRange: [MINI_SHOW_AT - 20, MINI_SHOW_AT + 40], outputRange: [-24, 0], extrapolate: 'clamp' });
    const bgShift = scrollY.interpolate({ inputRange: [0, 1500], outputRange: [0, -300], extrapolate: 'clamp' });
    const bgShiftSlow = scrollY.interpolate({ inputRange: [0, 1500], outputRange: [0, -140], extrapolate: 'clamp' });

    // 🆕 Expert identity (header)
    const expertName = expertProfile?.name || expertProfile?.displayName || expert?.displayName || 'Pro Expert';
    const expertPic = expertProfile?.profilePic || expertProfile?.photoURL || `https://ui-avatars.com/api/?name=${expertName}&background=0F172A&color=fff`;

    const getChatId = (uid: string, otherId: string) => uid < otherId ? `${uid}_${otherId}` : `${otherId}_${uid}`;

    // 🆕 Shared tab handlers (used by hero tabs + mini bar)
    const goUsersTab = () => setActiveTab('USERS');
    const goRequestsTab = () => {
        setActiveTab('REQUESTS');
        setNewRequestCount(0); // 🔥 CLEAR BADGE ON CLICK 🔥
    };

    // 🆕 active tab colours (thumb glow)
    const thumbColor = activeTab === 'USERS' ? theme.accent : '#EC4899';

    // 🆕 HEADER (scrolls with the list): title row + LEVEL CORE stage + stat tiles + tabs + section label
    const headerEl = (
        <View onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}>
            {/* 👑 TOP TITLE ROW */}
            <Animated.View
                style={[
                    styles.topHeader,
                    {
                        opacity: heroIn,
                        transform: [{ translateY: heroIn.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }]
                    }
                ]}
            >
                <View style={styles.headerContent}>
                    <View style={{ flex: 1, paddingRight: 15 }}>
                        {/* Uniform glass border pill header */}
                        <BlurView intensity={20} tint="dark" style={[styles.statusPillHeader, borderType1, { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, overflow: 'hidden' }]}>
                            <PulseDot color={theme.accent} size={6} />
                            <Text style={[styles.statusPillText, { color: theme.accentText }]}>SYSTEM {config.label}</Text>
                        </BlurView>
                        {/* 🔥 TEXT AUTO SHRINK ON SMALL SCREENS */}
                        <Text style={styles.mainTitle} numberOfLines={1} adjustsFontSizeToFit={true}>TALKPE PRO NETWORK</Text>
                        <View style={[styles.neonUnderline, { backgroundColor: theme.primary }]} />
                    </View>
                    <View style={styles.headerRight}>
                        <FloatBox amp={5} dur={1600}>
                            <Img3D uri={IMG.chat} size={54} fallback="chatbubbles" color={theme.accent} />
                        </FloatBox>
                        <TouchableOpacity style={[styles.headerIcon, borderType2]}>
                            <Ionicons name="flash" size={20} color={theme.accentText} />
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>

            {/* 🆕 LEVEL CORE STAGE (radial tick gauge + spinning core + 3D objects) */}
            <Animated.View
                style={[
                    styles.stageWrap,
                    {
                        opacity: Animated.multiply(heroIn, stageOpacity),
                        transform: [{ translateY: stageTY }, { scale: stageScale }]
                    }
                ]}
            >
                {/* soft level glow behind stage (🆕 darker: 0C -> 08, 12 -> 0C) */}
                <View style={[styles.stageGlowBig, { backgroundColor: theme.accent + '08' }]} pointerEvents="none" />
                <View style={[styles.stageGlowSmall, { backgroundColor: theme.primary + '0C' }]} pointerEvents="none" />

                <Sparkle x={width * 0.18} y={30} size={13} color={theme.accentText} delay={0} />
                <Sparkle x={width * 0.78} y={70} size={10} color={theme.primaryText} delay={600} />
                <Sparkle x={width * 0.12} y={190} size={11} color={theme.secondaryText} delay={1100} />

                {/* floating 3D objects */}
                <FloatBox amp={7} dur={2000} style={styles.stageTrophy}>
                    <Img3D uri={IMG.trophy} size={58} fallback="trophy" color={theme.accentText} />
                </FloatBox>
                <FloatBox amp={9} dur={2400} style={styles.stageDiamond}>
                    <Img3D uri={IMG.diamond} size={50} fallback="diamond" color={theme.accentText} />
                </FloatBox>
                <FloatBox amp={6} dur={2800} style={styles.stageStar}>
                    <Img3D uri={IMG.star} size={36} fallback="star" color={theme.secondaryText} />
                </FloatBox>

                {/* gauge ring */}
                <GaugeRing progress={levelProgress.progress} color={theme.accent} size={232} ticks={56} />

                {/* core: spinning gradient ring + avatar */}
                <View style={styles.coreWrap}>
                    <OrbitRing size={150} color={theme.accent} dur={5000} dotSize={6} />
                    <OrbitRing size={130} color={theme.primaryText} dur={8000} reverse dotSize={4} style={{ opacity: 0.7 }} />
                    <View style={[styles.coreMask, { shadowColor: theme.accent }]}>
                        <Animated.View style={[styles.coreSpin, { transform: [{ rotate: spin }] }]}>
                            <LinearGradient
                                colors={[theme.accent, theme.primary, theme.secondary, lighten(theme.accent, 0.5), theme.accent] as any}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>
                        <Image source={{ uri: expertPic }} style={styles.coreAvatar} />
                    </View>
                    <FloatBox amp={4} dur={1500} style={styles.coreCrown}>
                        <Img3D uri={IMG.crown} size={38} fallback="ribbon" color={theme.accentText} />
                    </FloatBox>
                    <View style={[styles.coreLevelBadge, { borderColor: theme.accent + 'AA', shadowColor: theme.accent }, sideMix]}>
                        <Ionicons name="star" size={10} color={theme.accentText} style={{ marginRight: 4 }} />
                        <Text style={[styles.coreLevelText, { color: theme.accentText }]}>L{config.lvl}</Text>
                    </View>
                </View>
            </Animated.View>

            {/* 🆕 identity text under the core */}
            <Animated.View style={[styles.identityBlock, { opacity: heroIn }]}>
                <Text style={styles.identityName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{expertName}</Text>
                <Text style={[styles.identityLevel, { color: theme.accentText }]} numberOfLines={1}>{config.label}</Text>
                <Text style={styles.progressCaption} numberOfLines={1}>
                    {levelProgress.maxed ? 'MAX LEVEL REACHED' : `${Math.round(levelProgress.progress * 100)}%  •  ${formatCompact(levelProgress.remaining)} REWARDS TO L${levelProgress.nextLvl}`}
                </Text>
                <GlowBar progress={levelProgress.progress} color={theme.accent} height={5} style={{ marginTop: 10, width: '70%' }} />
            </Animated.View>

            {/* 🆕 STAT TILES (3 separate glass tiles - divider lines illa, 3D entrance, shine sweep, DOUBLE COLOUR frame) */}
            <View style={styles.statRow}>
                <StatTile icon="people" label="LINKS" color={theme.primaryText} glow={theme.primary} frameA={theme.bA} frameB={theme.bB} enter={heroIn}>
                    <CountUp style={styles.summaryValue} value={expertProfile?.friendsCount || 0} />
                </StatTile>
                <StatTile icon="hourglass" label="PENDING" color={theme.accentText} glow={theme.accent} frameA={theme.bB} frameB={theme.bA} enter={heroIn}>
                    <CountUp style={styles.summaryValue} value={lastKnownRequestIds.length} />
                </StatTile>
                <StatTile icon="star" label="LEVEL" color={theme.secondaryText} glow={theme.secondary} frameA={theme.bA} frameB={theme.bB} enter={heroIn}>
                    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>L{config.lvl}</Text>
                </StatTile>
                {/* shine sweep */}
                <Animated.View pointerEvents="none" style={[styles.heroSweep, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
                    <LinearGradient colors={['transparent', 'rgba(255,255,255,0.08)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                </Animated.View>
            </View>

            {/* 👑 NEW TAB STYLE: 2 separate pill buttons (no single bar, no gloss strip, so horizontal line illa) with DOUBLE COLOUR border */}
            <View style={styles.tabWrapper} onLayout={(e) => setTabW(e.nativeEvent.layout.width)}>
                <View style={styles.tabRow2}>
                    {/* USERS */}
                    <Animated.View style={{ flex: 1, transform: [{ scale: activeTab === 'USERS' ? tabPop : 1 }] }}>
                        <TouchableOpacity activeOpacity={0.85} onPress={goUsersTab}>
                            <LinearGradient colors={[theme.bA, theme.bB, theme.bA] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tabBtnFrame, { shadowColor: theme.bA, shadowOpacity: activeTab === 'USERS' ? 0.6 : 0.15 }]}>
                                <View style={styles.tabBtnInner}>
                                    {activeTab === 'USERS' && (
                                        <LinearGradient colors={[darken(theme.bA, 0.3), darken(theme.bB, 0.3)] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                    )}
                                    <View style={styles.tabBtnContent}>
                                        <Ionicons name="people" size={15} color={activeTab === 'USERS' ? '#FFF' : '#E2E8F0'} style={{ marginRight: 6 }} />
                                        <Text style={[styles.tabText, activeTab === 'USERS' && { color: '#FFF' }]}>USERS</Text>
                                        <View style={[styles.tabCountChip, activeTab === 'USERS' && { backgroundColor: 'rgba(255,255,255,0.24)' }]}>
                                            <Text style={styles.tabCountText}>{formatCompact(expertProfile?.friendsCount || 0)}</Text>
                                        </View>
                                    </View>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* REQUESTS */}
                    <Animated.View style={{ flex: 1, transform: [{ scale: activeTab === 'REQUESTS' ? tabPop : 1 }] }}>
                        <TouchableOpacity activeOpacity={0.85} onPress={goRequestsTab}>
                            <LinearGradient colors={[theme.bB, theme.bA, theme.bB] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tabBtnFrame, { shadowColor: theme.bB, shadowOpacity: activeTab === 'REQUESTS' ? 0.6 : 0.15 }]}>
                                <View style={styles.tabBtnInner}>
                                    {activeTab === 'REQUESTS' && (
                                        <LinearGradient colors={[darken('#EC4899', 0.4), darken('#A855F7', 0.45)] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                    )}
                                    <View style={styles.tabBtnContent}>
                                        <Ionicons name="person-add" size={15} color={activeTab === 'REQUESTS' ? '#FFF' : '#E2E8F0'} style={{ marginRight: 6 }} />
                                        <Text style={[styles.tabText, activeTab === 'REQUESTS' && { color: '#FFF' }]}>REQUESTS</Text>
                                        <View style={[styles.tabCountChip, activeTab === 'REQUESTS' && { backgroundColor: 'rgba(255,255,255,0.24)' }]}>
                                            <Text style={styles.tabCountText}>{formatCompact(lastKnownRequestIds.length)}</Text>
                                        </View>
                                    </View>
                                </View>
                            </LinearGradient>

                            {/* 🔥 REQUESTS TAB ALERT BADGE 🔥 */}
                            {newRequestCount > 0 && activeTab !== 'REQUESTS' && (
                                <BounceBadge style={[styles.tabBadge, { top: -4, right: 10 }]}>
                                    <Text style={styles.tabBadgeText}>{newRequestCount > 9 ? '9+' : newRequestCount}</Text>
                                </BounceBadge>
                            )}
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>

            {/* 🆕 Section label */}
            <Animated.View style={[styles.sectionRow, { opacity: tabAnim }]}>
                <View style={[styles.sectionDot, { backgroundColor: theme.accent, shadowColor: theme.accent }]} />
                <Text style={[styles.sectionTitle, { color: theme.accentText }]}>{activeTab === 'USERS' ? 'ACTIVE LINKS' : 'INCOMING REQUESTS'}</Text>
                <View style={{ flex: 1 }} />
                <View style={[styles.sectionCount, { borderColor: theme.accent + '66' }, sideMix]}>
                    <Text style={[styles.sectionCountText, { color: theme.accentText }]}>{activeTab === 'USERS' ? (expertProfile?.friendsCount || 0) : lastKnownRequestIds.length}</Text>
                </View>
            </Animated.View>
        </View>
    );

    return (
        <View style={styles.mainWrapper}>
            <StatusBar barStyle="light-content" />
            
            {/* 🔥 DYNAMIC ANIMATED DESIGN BACKGROUND */}
            <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />

            {/* 🆕 BACKGROUND IMAGE (🆕 DARKER: opacity 0.55 -> 0.3) - load aagalana expert pic blur fallback (0.4 -> 0.25) */}
            {!bgErr ? (
                <Image source={{ uri: BG_IMG }} resizeMode="cover" onError={() => setBgErr(true)} style={[StyleSheet.absoluteFill, { opacity: 0.3 }]} />
            ) : (
                <Image source={{ uri: expertPic }} blurRadius={30} resizeMode="cover" style={[StyleSheet.absoluteFill, { opacity: 0.25 }]} />
            )}
            {/* 🆕 light level-colour tint (🆕 darker: 22 -> 14, 1C -> 10, mid 0.22 -> 0.35) */}
            <LinearGradient colors={[theme.primary + '14', 'rgba(1,3,12,0.35)', theme.secondary + '10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
            {/* 🆕 readability shade (🆕 darker: 0.18 -> 0.35, 0.6 -> 0.78) */}
            <LinearGradient colors={['rgba(1,3,12,0.35)', 'rgba(1,3,12,0.78)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
            
            {/* Shimmer Orbs for Animation (🆕 + scroll depth parallax) */}
            <Animated.View style={[styles.shimmerOrb, { top: 50, right: -60, backgroundColor: theme.primary, transform: [{ translateY: Animated.add(orbTranslateY, bgShift) }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 350, left: -90, backgroundColor: theme.secondary, transform: [{ translateY: Animated.add(Animated.multiply(orbTranslateY, -1), bgShift) }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 650, right: -80, backgroundColor: theme.accent, transform: [{ translateY: Animated.add(orbTranslateY, bgShift) }] }]} />

            {/* 🆕 Floating 3D background objects (diamond / coin / star) with scroll parallax (🆕 darker opacities) */}
            <Animated.View pointerEvents="none" style={[styles.bgFloat, { top: 430, right: 14, opacity: 0.14, transform: [{ translateY: bgShiftSlow }] }]}>
                <FloatBox amp={14} dur={2600}>
                    <Img3D uri={IMG.diamond} size={64} fallback="diamond" color={theme.accent} />
                </FloatBox>
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.bgFloat, { top: 620, left: 10, opacity: 0.12, transform: [{ translateY: bgShiftSlow }] }]}>
                <FloatBox amp={10} dur={2200}>
                    <Img3D uri={IMG.coin} size={52} fallback="logo-bitcoin" color={theme.accent} />
                </FloatBox>
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.bgFloat, { top: 780, right: 30, opacity: 0.10, transform: [{ translateY: bgShiftSlow }] }]}>
                <FloatBox amp={12} dur={3000}>
                    <Img3D uri={IMG.star} size={48} fallback="star" color={theme.accent} />
                </FloatBox>
            </Animated.View>

            {/* 🆕 Floating particles (level theme embers) */}
            {particles.map((p, i) => (
                <Animated.View
                    key={i}
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: p.y,
                        left: p.x,
                        width: p.size,
                        height: p.size,
                        borderRadius: p.size / 2,
                        backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
                        opacity: p.v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.8, 0.5, 0] }),
                        transform: [{ translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, -300] }) }]
                    }}
                />
            ))}

            {/* 🆕 FULL-SCREEN SCROLL LIST (hero + tabs + cards all scroll together) */}
            <Animated.FlatList
                ref={listRef}
                data={loading ? [] : data}
                keyExtractor={(item: any) => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 150 }}
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={onScroll}
                ListHeaderComponent={headerEl}
                ListEmptyComponent={
                    loading ? (
                        <View style={styles.loaderContainer}>
                            <ActivityIndicator size="large" color={theme.primary} />
                        </View>
                    ) : (
                        <Animated.View
                            style={[
                                styles.emptyBox,
                                { opacity: tabAnim, transform: [{ translateY: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] }
                            ]}
                        >
                            {/* 🆕 Orbit rings around empty-state 3D image */}
                            <View style={styles.emptyOrbitWrap}>
                                <OrbitRing size={150} color={theme.accent} dur={7000} dotSize={7} />
                                <OrbitRing size={116} color={theme.primaryText} dur={5000} reverse dotSize={5} />
                                <FloatBox amp={8} dur={1800}>
                                    <Img3D uri={activeTab === 'USERS' ? IMG.handshake : IMG.star} size={90} fallback="people" color={theme.accent} />
                                </FloatBox>
                            </View>
                            <Text style={[styles.emptyTitle, { color: theme.accentText }]}>{activeTab === 'USERS' ? 'NO ACTIVE LINKS YET' : 'NO PENDING REQUESTS'}</Text>
                            <Text style={styles.emptySub}>{activeTab === 'USERS' ? 'Accepted users will appear here.' : 'New requests will appear here.'}</Text>
                        </Animated.View>
                    )
                }
                renderItem={({ item, index }: any) => {
                    // ✅ INDIVIDUAL USER DYNAMIC TIER SYNC
                    const userTier = calculateUserTier(item.totalSpent || 0);
                    
                    return (
                        <UserCard
                            item={item}
                            index={index}
                            activeTab={activeTab}
                            theme={theme}
                            userTier={userTier}
                            scrollY={scrollY}
                            headerH={headerH}
                            onOpenProfile={() => router.push({ pathname: '/user-detail', params: { id: item.userId } } as any)}
                            onChat={() => expert?.uid && router.push({ pathname: "/chat/ChatScreen" as any, params: { chatId: expert.uid < item.userId ? `${expert.uid}_${item.userId}` : `${item.userId}_${expert.uid}`, receiverId: item.userId, receiverName: item.userName } })}
                            onDeleteChat={() => {
                                if (expert?.uid) {
                                    const chatId = expert.uid < item.userId ? `${expert.uid}_${item.userId}` : `${item.userId}_${expert.uid}`;
                                    handleDeleteChat(chatId);
                                }
                            }}
                            onDisconnect={() => handleRejectOrUnfollow(item.id, 'Disconnect', item.userId)}
                            onAccept={() => handleAccept(item.id, item.senderId)}
                            onReject={() => handleRejectRequest(item)}
                        />
                    );
                }}
            />

            {/* 🆕 COMPACT MINI BAR (slides in after scrolling past the hero) */}
            <Animated.View
                pointerEvents={showMini ? 'auto' : 'none'}
                style={[styles.miniBarWrap, { opacity: miniOpacity, transform: [{ translateY: miniTY }] }]}
            >
                <BlurView intensity={45} tint="dark" style={[styles.miniBar, { borderBottomColor: theme.bA }]}>
                    <TouchableOpacity
                        style={styles.miniLeft}
                        activeOpacity={0.8}
                        onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
                    >
                        <LinearGradient colors={[lighten(theme.accent, 0.5), theme.accent, darken(theme.accent, 0.35)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.miniAvatarRing}>
                            <Image source={{ uri: expertPic }} style={styles.miniAvatar} />
                        </LinearGradient>
                        <View style={{ marginLeft: 10, flexShrink: 1 }}>
                            <Text style={styles.miniName} numberOfLines={1}>{expertName}</Text>
                            <Text style={[styles.miniLevel, { color: theme.accentText }]} numberOfLines={1}>{config.label}</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={styles.miniTabs}>
                        <TouchableOpacity
                            onPress={goUsersTab}
                            activeOpacity={0.8}
                            style={[styles.miniTabBtn, sideMix, activeTab === 'USERS' && { backgroundColor: theme.accent + '44' }]}
                        >
                            <Ionicons name="people" size={16} color={activeTab === 'USERS' ? '#FFF' : '#CBD5E1'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={goRequestsTab}
                            activeOpacity={0.8}
                            style={[styles.miniTabBtn, sideMix, activeTab === 'REQUESTS' && { backgroundColor: 'rgba(236, 72, 153, 0.4)' }]}
                        >
                            <Ionicons name="person-add" size={16} color={activeTab === 'REQUESTS' ? '#FFF' : '#CBD5E1'} />
                            {newRequestCount > 0 && activeTab !== 'REQUESTS' && (
                                <BounceBadge style={styles.miniBadge}>
                                    <Text style={styles.tabBadgeText}>{newRequestCount > 9 ? '9+' : newRequestCount}</Text>
                                </BounceBadge>
                            )}
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    // 🆕 DARKER: base #020617 -> #010309
    mainWrapper: { flex: 1, backgroundColor: '#010309' },
    // 🔥 DESIGN: AMBIENT SHIMMER ORBS (🆕 darker: opacity 0.12 -> 0.07)
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.07, filter: 'blur(80px)' },

    // 🆕 floating 3D background objects
    bgFloat: { position: 'absolute' },
    
    // 🔥 SATTI FIX: Width locked strictly to window width to prevent overflow
    topHeader: { width: '100%', paddingTop: 60, paddingBottom: 6, position: 'relative', zIndex: 10 },

    // 🆕 hero frame (legacy styles kept)
    heroWrapper: { width: '100%', borderRadius: 36, backgroundColor: '#0A0620', elevation: 20, shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
    heroFrame: { borderRadius: 36, overflow: 'hidden', padding: 2.5, backgroundColor: '#0A0620' },
    heroFrameSpin: { position: 'absolute', top: '50%', left: '50%', width: 900, height: 900, marginLeft: -450, marginTop: -450 },
    heroCard: { borderRadius: 33.5, padding: 18, overflow: 'hidden' },
    heroSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
    heroSweep: { position: 'absolute', top: -60, bottom: -60, width: 90 },

    // 🔥 SATTI FIX: headerContent explicitly constrained (hero card padding inside topHeader)
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerRight: { alignItems: 'center', gap: 6 },
    
    statusPillHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, alignSelf: 'flex-start' },
    pulseDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
    statusPillText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    mainTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
    neonUnderline: { width: 40, height: 4, borderRadius: 2, marginTop: 4, opacity: 0.8 },
    
    // 🔥 Cleaned up Icon Style
    headerIcon: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' }, 

    // 🆕 LEVEL CORE STAGE
    stageWrap: { height: 272, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
    stageGlowBig: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
    stageGlowSmall: { position: 'absolute', width: 190, height: 190, borderRadius: 95 },
    stageTrophy: { position: 'absolute', left: 0, top: 24 },
    stageDiamond: { position: 'absolute', right: 0, top: 60 },
    stageStar: { position: 'absolute', left: 14, bottom: 22 },
    coreWrap: { width: 120, height: 120, justifyContent: 'center', alignItems: 'center' },
    coreMask: { width: 116, height: 116, borderRadius: 58, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 16, shadowOpacity: 0.8, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
    coreSpin: { position: 'absolute', width: 230, height: 230, left: -57, top: -57 },
    coreAvatar: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#0F172A' },
    coreCrown: { position: 'absolute', top: -30, alignSelf: 'center' },
    coreLevelBadge: { position: 'absolute', bottom: -12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, borderWidth: 1.2, backgroundColor: '#06031A', shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
    coreLevelText: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },

    // 🆕 identity
    identityBlock: { alignItems: 'center', marginTop: 4, marginBottom: 16 },
    identityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: 'rgba(0,0,0,0.28)', padding: 10, borderRadius: 22, borderWidth: 1 },
    identityAvatarWrap: { width: 72, height: 72, justifyContent: 'center', alignItems: 'center' },
    identityRing: { width: 52, height: 52, borderRadius: 26, padding: 2.5, justifyContent: 'center', alignItems: 'center' },
    identityAvatar: { width: '100%', height: '100%', borderRadius: 24, backgroundColor: '#0F172A' },
    identityCrown: { position: 'absolute', top: -6, alignSelf: 'center', left: 26 },
    identityName: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.8, textAlign: 'center', maxWidth: '90%', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
    identityLevel: { fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 4 },
    progressCaption: { color: 'rgba(255,255,255,0.92)', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 6, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },

    // 🆕 stat tiles (legacy dock styles kept, new tile styles added) (🆕 darker tile bg 0.74 -> 0.88)
    statDock: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, overflow: 'hidden', paddingVertical: 4 },
    dockDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.10)' },
    heroSummaryGrid: { flexDirection: 'row', gap: 10, marginTop: 14 },
    statRow: { flexDirection: 'row', gap: 10, overflow: 'hidden', borderRadius: 22 },
    statTileFrame: { borderRadius: 22, padding: 1.4 },
    statTile: { borderRadius: 20.6, overflow: 'hidden', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, backgroundColor: 'rgba(2, 4, 14, 0.88)' },
    statIconBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 6, shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
    summaryChip: { flex: 1, padding: 12, alignItems: 'center' },
    summaryTopRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
    summaryLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 9, fontWeight: '900', letterSpacing: 1.4, marginTop: 3 },
    summaryValue: { color: '#FFF', fontSize: 20, fontWeight: '900' },
    
    // 🆕 TABS (old single-bar styles kept, new 2-pill styles added below)
    tabWrapper: { marginTop: 18, marginBottom: 6 },
    tabFrame: { borderRadius: 28, padding: 1.2 },
    tabContainer: { flexDirection: 'row', padding: 6, borderRadius: 26.8, overflow: 'hidden', backgroundColor: 'rgba(3, 5, 18, 0.7)' },
    tabPill: { position: 'absolute', top: 6, left: 6, bottom: 6, borderRadius: 21, overflow: 'hidden', shadowOpacity: 0.8, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
    tabPillGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 16 },
    massTab: { flex: 1, height: 44, borderRadius: 20, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
    tabText: { color: '#E2E8F0', fontWeight: '900', fontSize: 12, letterSpacing: 2 },
    tabCountChip: { marginLeft: 6, minWidth: 20, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
    tabCountText: { color: '#FFF', fontSize: 9, fontWeight: '900' },

    // 🆕 NEW TAB STYLE: 2 separate pill buttons, double colour border, no gloss strip (🆕 darker inner 0.86 -> 0.93)
    tabRow2: { flexDirection: 'row', gap: 12 },
    tabBtnFrame: { borderRadius: 24, padding: 1.6, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    tabBtnInner: { height: 46, borderRadius: 22.4, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(2, 4, 14, 0.93)' },
    tabBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },

    // 🔥 NEW STYLES FOR THE REQUEST TAB BADGE 🔥
    tabBadge: { position: 'absolute', top: 4, right: 15, backgroundColor: '#EF4444', minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#010309' },
    tabBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', paddingHorizontal: 3 },

    // 🆕 section label
    sectionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: LIST_PAD_TOP - 6 },
    sectionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
    sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2.5 },
    sectionLine: { flex: 1, height: 1.5, marginHorizontal: 10, borderRadius: 1 },
    sectionCount: { minWidth: 28, height: 22, borderRadius: 11, paddingHorizontal: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
    sectionCountText: { fontSize: 11, fontWeight: '900' },

    // 🆕 cards (🆕 darker body: glow bg 0.6 -> 0.8, card bg 0.74 -> 0.88)
    cardWrapper: { marginBottom: 15 },
    cardGlow: { borderRadius: 35, backgroundColor: 'rgba(5,3,20,0.8)', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 9 },
    cardBorder: { borderRadius: 35, padding: 1.5 },
    fluidUserCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 33.5, overflow: 'hidden', backgroundColor: 'rgba(4, 3, 16, 0.88)' }, 
    cardAccent: { position: 'absolute', left: 0, top: 18, bottom: 18, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
    cardWatermark: { position: 'absolute', right: -16, bottom: -20 },
    cardWatermark3D: { position: 'absolute', right: -22, bottom: -26 },
    cardEdgeLine: { position: 'absolute', left: 30, right: 30, bottom: 0, height: 1.5, opacity: 0.8 },
    cardShine: { position: 'absolute', top: -40, bottom: -40, width: 70 },
    avatarNode: { position: 'relative', width: 66, height: 66, justifyContent: 'center', alignItems: 'center' },
    nodeAvatarRing: { width: 54, height: 54, borderRadius: 27, padding: 2.5, elevation: 12, shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
    nodeAvatarImg: { width: '100%', height: '100%', borderRadius: 25, backgroundColor: '#010309' },
    onlineStatus: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2.5, borderColor: '#010309', zIndex: 10 },
    vipCrown: { position: 'absolute', top: -8, alignSelf: 'center' },

    infoNode: { flex: 1, marginLeft: 8, paddingRight: 8 },
    nodeTagText: { fontSize: 8, fontWeight: '900', letterSpacing: 2, opacity: 0.7, marginBottom: 2 },
    userName: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, flexWrap: 'wrap', gap: 4 },
    tierPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, borderWidth: 1 },
    statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
    vipTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 7, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
    vipTagText: { fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
    tierProgressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 },
    tierAmount: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },

    // 🆕 actions stacked vertically
    actionNode: { flexDirection: 'column', gap: 8 },
    fluidRoundBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, overflow: 'visible' }, 
    stackBtn: { width: 40, height: 40, borderRadius: 20 },
    btnGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 18, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
    glowBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#010309' },
    badgeVal: { color: '#FFF', fontSize: 10, fontWeight: '900' },

    // 🔥 UPDATED: requestNode now a COLUMN (LINK on top, REJECT below) so the card never gets squeezed
    requestNode: { flexDirection: 'column', alignItems: 'stretch', gap: 8 },
    acceptMiniBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 20, elevation: 10, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, overflow: 'hidden' },
    miniPillText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
    // 🔥 NEW: REJECT button styles
    rejectMiniBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, backgroundColor: 'rgba(244, 63, 94, 0.15)', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.35)' },
    rejectPillText: { color: '#FB7185', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

    // 🆕 mini bar (appears on scroll) (🆕 darker bg 0.7 -> 0.86)
    miniBarWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 },
    miniBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 46, paddingBottom: 10, paddingHorizontal: 20, borderBottomWidth: 1, backgroundColor: 'rgba(1,3,12,0.86)', overflow: 'hidden' },
    miniLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
    miniAvatarRing: { width: 38, height: 38, borderRadius: 19, padding: 2, justifyContent: 'center', alignItems: 'center' },
    miniAvatar: { width: '100%', height: '100%', borderRadius: 17, backgroundColor: '#0F172A' },
    miniName: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
    miniLevel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginTop: 2 },
    miniTabs: { flexDirection: 'row', gap: 8 },
    miniTabBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(0,0,0,0.55)' },
    miniBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#EF4444', minWidth: 17, height: 17, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#010309' },

    // 🆕 empty state
    emptyBox: { alignItems: 'center', marginTop: 30, opacity: 0.95 },
    emptyOrbitWrap: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center' },
    emptyTitle: { marginTop: 14, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
    emptySub: { color: '#F1F5F9', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 }, marginTop: 6, fontSize: 12, fontWeight: '700' },

    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 60 },
});