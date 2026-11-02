import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, collectionGroup, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

// 🆕 CARD LAYOUT CONSTANTS (scroll-driven 3D wheel effect)
const CARD_ITEM_H = 176;      // approx card height + margin
const LIST_PAD_TOP = 14;      // spacing between header & first card
const MINI_SHOW_AT = 360;     // scroll offset where compact mini-bar appears

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT THEME SYNC)
const calculateUserLevel = (totalSpent: number) => {
  if (totalSpent >= 500000001) return { lvl: 8, label: 'TITAN OVERSEER', color: '#FF0033', secondaryColor: '#660000', anim: 'titan' }; 
  if (totalSpent >= 100000001) return { lvl: 7, label: 'MYTHIC RULER', color: '#D946EF', secondaryColor: '#c8040b', anim: 'mythic' }; 
  if (totalSpent >= 50000000) return { lvl: 6, label: 'GRANDMASTER', color: '#9c77f3', secondaryColor: '#d31515', anim: 'grandmaster' };
  if (totalSpent >= 10000000) return { lvl: 5, label: 'ELITE VETERAN', color: '#00F2FE', secondaryColor: '#970d50d4', anim: 'explosion' };
  if (totalSpent >= 5000000) return { lvl: 4, label: 'LEGENDARY NODE', color: '#d0630a', secondaryColor: '#DC2626', anim: 'nebula' };
  if (totalSpent >= 1000000) return { lvl: 3, label: 'DIAMOND CORE', color: '#a3de4a', secondaryColor: '#991625', anim: 'diamond' };
  if (totalSpent >= 200001) return { lvl: 2, label: 'GOLD OPERATIVE', color: '#ffae00', secondaryColor: '#801f29', anim: 'sparkle' };
  return { lvl: 1, label: 'SILVER AGENT', color: '#0f33e7', secondaryColor: '#f50808', anim: 'wave' };
};

// 🆕 PROGRESS HELPERS (tier progress for the gauge ring)
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
const norm = (hex: string) => (hex && hex.length === 9 ? hex.slice(0, 7) : hex); // 8-digit hex (alpha) -> 6-digit safe
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
    clock: 'https://img.icons8.com/3d-fluency/512/clock.png',
    gift: 'https://img.icons8.com/3d-fluency/512/gift.png',
    phone: 'https://img.icons8.com/3d-fluency/512/phone.png',
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

// 🆕 COUNT UP NUMBER (locale formatted, same as old toLocaleString display)
const CountUp = ({ value, style, prefix = '', duration = 900 }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    const [txt, setTxt] = useState(0);
    useEffect(() => {
        const id = v.addListener(({ value: val }) => setTxt(Math.round(val)));
        Animated.timing(v, { toValue: value || 0, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
        return () => v.removeListener(id);
    }, [value]);
    return <Text style={style} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>{prefix}{txt.toLocaleString()}</Text>;
};

// 🆕 RADIAL TICK GAUGE (tier progress ring - ticks light up one by one)
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

// 🆕 STAT TILE (glass tile with DOUBLE COLOUR gradient frame + round icon badge)
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
        <LinearGradient colors={[frameA || (color + 'AA'), frameB || 'rgba(255,255,255,0.05)', frameA || (glow + '66')]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statTileFrame}>
            <BlurView intensity={22} tint="dark" style={styles.statTile}>
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

// 🆕 HISTORY CARD "HOLO PASS" (stagger entrance + scroll-driven 3D wheel + press tilt + holo shine)
// ✅ SAME DATA LOGIC AS OLD renderHistoryItem (reward card + call card), only the design is new
const HistoryCard = ({ item, index, scrollY, headerH, floatAnim, theme, userTier, router }: any) => {
    const anim = useRef(new Animated.Value(0)).current;
    const press = useRef(new Animated.Value(0)).current;
    const shine = useRef(new Animated.Value(0)).current;

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

    // 🆕 SCROLL-DRIVEN 3D WHEEL
    const itemTop = headerH + LIST_PAD_TOP + index * CARD_ITEM_H;
    const sRange = [itemTop - height, itemTop - height * 0.6, itemTop + 20, itemTop + CARD_ITEM_H * 2.2];
    const scrollRotX = scrollY.interpolate({ inputRange: sRange, outputRange: ['26deg', '0deg', '0deg', '-9deg'], extrapolate: 'clamp' });
    const scrollScale = scrollY.interpolate({ inputRange: sRange, outputRange: [0.88, 1, 1, 0.94], extrapolate: 'clamp' });
    const scrollOpacity = scrollY.interpolate({ inputRange: sRange, outputRange: [0.3, 1, 1, 0.55], extrapolate: 'clamp' });
    const scrollTY = scrollY.interpolate({ inputRange: sRange, outputRange: [34, 0, 0, 0], extrapolate: 'clamp' });

    const isReward = !!(item.isCallGift || item.isStandaloneGift);
    const accent = isReward ? '#A855F7' : userTier.color;
    const accentText = lighten(accent, 0.45); // 🆕 text-safe colour
    const frameA = isReward ? darken('#A855F7', 0.1) : theme.bA;
    const frameB = isReward ? darken('#EC4899', 0.15) : theme.bB;
    const borderColors = index % 2 === 0 ? [frameA, frameB, frameA] : [frameB, frameA, frameB];

    // ---------- data (identical logic to old code) ----------
    let titleName = '';
    let thumbUri = '';
    let dateText = '';
    let costValue = '';
    let durationText = '';

    if (isReward) {
        const giftName = item.giftName || item.name || 'Virtual Reward';
        const amount = item.amount || item.price || item.diamonds || 0;
        const eName = item.fetchedHostName || item.expertName || item.receiverName || item.toName || item.hostName || item.userName || 'Network Expert';
        const eImage = item.fetchedHostImage || item.expertImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(eName)}&background=1E293B&color=fff&bold=true`;

        let displayTime = 'JUST NOW';
        const timeVal = item.timestamp || item.createdAt;
        if (timeVal?.toDate) {
            displayTime = timeVal.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        } else if (timeVal?.seconds) {
            displayTime = new Date(timeVal.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        } else if (typeof timeVal === 'string' || typeof timeVal === 'number') {
            displayTime = new Date(timeVal).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        }

        titleName = eName;
        thumbUri = eImage;
        dateText = displayTime;
        costValue = `-${Number(amount).toLocaleString()}`;
        durationText = `Item Sent: ${item.isCallGift ? 'In-Call Premium Rewards' : giftName}`;
    } else {
        const currentDuration = Number(item.finalDuration) || Number(item.duration) || 0;
        const mins = Math.floor(currentDuration / 60);
        const secs = currentDuration % 60;
        durationText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
        const totalSpentOnCall = (Number(item.totalDiamonds) || 0);
        const callEName = item.expertName || item.hostName || 'HOST NODE';
        const callEImage = item.expertImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(callEName)}&background=1E293B&color=fff&bold=true`;

        titleName = callEName;
        thumbUri = callEImage;
        dateText = item.endedAt?.seconds
            ? new Date(item.endedAt.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
            : 'SYNCHRONIZING...';
        costValue = `-${totalSpentOnCall.toLocaleString()}`;
    }

    return (
        <Animated.View
            style={[
                styles.cardContainer,
                {
                    opacity: Animated.multiply(anim, scrollOpacity),
                    transform: [
                        { perspective: 900 },
                        { translateY: floatAnim },
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
            <TouchableOpacity activeOpacity={0.9} onPressIn={handlePressIn} onPressOut={handlePressOut}>
                <View style={[styles.cardGlow, { shadowColor: accent }]}>
                    <LinearGradient colors={borderColors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardBorder}>
                        <BlurView intensity={15} tint="dark" style={styles.stealthHistoryCard}>
                            <LinearGradient colors={[accent + '1A', 'rgba(3,2,10,0.82)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                            <View style={[styles.cardAccent, { backgroundColor: accent }]} />

                            {/* 🆕 3D watermark */}
                            <View style={styles.cardWatermark3D} pointerEvents="none">
                                <Img3D uri={isReward ? IMG.gift : IMG.diamond} size={120} fallback={isReward ? 'gift' : 'diamond'} color={accent + '22'} style={{ opacity: 0.12 }} />
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

                            {/* SESSION BADGE (same labels as old) */}
                            <View style={[styles.sessionBadge, { backgroundColor: isReward ? '#A855F7' : userTier.color }]}>
                                {isReward ? <MaterialCommunityIcons name="gift" size={10} color="#FFF" /> : <Ionicons name="videocam" size={10} color="#FFF" />}
                                <Text style={styles.sessionTypeText}>{isReward ? 'REWARD SENT' : 'VERIFIED_LINK'}</Text>
                            </View>

                            <View style={styles.cardHeader}>
                                <View style={styles.thumbNode}>
                                    <OrbitRing size={68} color={accent} dur={5200 + (index % 4) * 600} dotSize={5} />
                                    <View style={[styles.expertThumbRing, { borderColor: accent, shadowColor: accent }, isReward && { justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(168, 85, 247, 0.1)' }]}>
                                        <Image source={{ uri: thumbUri }} style={styles.expertThumb} />
                                    </View>
                                </View>

                                <View style={styles.expertInfo}>
                                    <Text style={[styles.nodeTagText, { color: accentText }]} numberOfLines={1}>LOG {String(index + 1).padStart(2, '0')}</Text>
                                    <Text style={styles.expertName} numberOfLines={1} adjustsFontSizeToFit>{titleName.toUpperCase()}</Text>
                                    <Text style={styles.callDateText} numberOfLines={1}>{dateText}</Text>
                                </View>

                                <View style={styles.costContainer}>
                                    <Text style={[styles.costText, { color: accentText }]} numberOfLines={1} adjustsFontSizeToFit>{costValue}</Text>
                                    <Img3D uri={IMG.diamond} size={18} fallback="diamond" color={accentText} />
                                </View>
                            </View>

                            {isReward ? (
                                <View style={[styles.statsRow, { borderColor: accent + '44' }]}>
                                    <View style={styles.statItem}>
                                        <Ionicons name="sparkles-outline" size={14} color={accentText} />
                                        <Text style={[styles.statValueText, { color: '#E2E8F0' }]} numberOfLines={1} adjustsFontSizeToFit>
                                            {durationText}
                                        </Text>
                                    </View>
                                </View>
                            ) : (
                                <View style={[styles.statsRow, { borderColor: accent + '44' }]}>
                                    <View style={styles.statItem}>
                                        <Ionicons name="time-outline" size={14} color="#CBD5E1" />
                                        <Text style={[styles.statValueText, { color: '#E2E8F0' }]} numberOfLines={1} adjustsFontSizeToFit>{durationText}</Text>
                                    </View>

                                    <View style={styles.vDivider} />
                                    <TouchableOpacity
                                        style={styles.talkAgainBtn}
                                        activeOpacity={0.85}
                                        onPress={() => router.push({ pathname: '/expert-detail', params: { id: item.expertId } } as any)}
                                    >
                                        <LinearGradient colors={[lighten(userTier.color, 0.15), userTier.color, darken(userTier.color, 0.3)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.reconnectPill, { shadowColor: userTier.color }]}>
                                            <LinearGradient colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']} style={styles.btnGloss} pointerEvents="none" />
                                            <Text style={styles.talkAgainText} numberOfLines={1} adjustsFontSizeToFit>RECONNECT</Text>
                                            <Ionicons name="arrow-forward" size={12} color="#FFF" />
                                        </LinearGradient>
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

export default function HistoryScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    const insets = useSafeAreaInsets();
    
    const [history, setHistory] = useState<any[]>([]);
    // 🆕 UPDATE: gameHistory and totalGames states removed (game activity log removed)
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [totalMinutes, setTotalMinutes] = useState<number>(0);

    // 🆕 UPDATE: 'GAMES' tab removed. Only CALLS and REWARDS remain.
    const [activeTab, setActiveTab] = useState<'CALLS' | 'REWARDS'>('CALLS'); 

    const scrollY = useRef(new Animated.Value(0)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const trailX = useRef(new Animated.Value(-width)).current;

    // 🆕 PREMIUM ANIMATION VALUES
    const rotAnim = useRef(new Animated.Value(0)).current;   // core spinning ring
    const sweepAnim = useRef(new Animated.Value(0)).current; // shine sweep (stat tiles + wallet)
    const tabPop = useRef(new Animated.Value(1)).current;    // tab 3D pop on switch
    const tabAnim = useRef(new Animated.Value(1)).current;   // list content transition
    const heroIn = useRef(new Animated.Value(0)).current;    // hero entrance
    const shimmerAnim = useRef(new Animated.Value(0)).current; // ambient orb drift
    const [bgErr, setBgErr] = useState(false);

    // 🆕 SCROLL ENGINE (whole screen scrolls: hero parallax, mini bar, 3D wheel cards)
    const listRef = useRef<any>(null);
    const miniShown = useRef(false);
    const [showMini, setShowMini] = useState(false);
    const [headerH, setHeaderH] = useState(640);
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

    // 🆕 One-time premium animations (kept separate so they never restart with data updates)
    useEffect(() => {
        Animated.loop(
            Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
        ).start();

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

    // 🆕 Tab pop + list content transition
    useEffect(() => {
        tabPop.setValue(0.9);
        Animated.spring(tabPop, { toValue: 1, useNativeDriver: true, friction: 4, tension: 110 }).start();
        tabAnim.setValue(0);
        Animated.timing(tabAnim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, [activeTab]);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -8, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ).start();

        const runTrail = () => {
            trailX.setValue(-width);
            Animated.timing(trailX, { toValue: width, duration: 3500, useNativeDriver: true }).start(() => runTrail());
        };
        runTrail();

        if (!user) return;

        const userRef = doc(db, "users", user.uid);
        const unsubUser = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) setUserData(docSnap.data());
        });

        // ==========================================
        // 🔥 1. CALLS & GIFTS FETCHING ENGINE
        // ==========================================
        let rawCalls: any[] = [];
        let rawGifts: any[] = [];

        const processCallLogs = () => {
            const myGifts = rawGifts.filter(g => {
                const isIdMatch = g.senderId === user.uid || g.userId === user.uid;
                const isNameMatch = g.senderName && (g.senderName === userData?.name || g.senderName === user.displayName);
                return isIdMatch || isNameMatch;
            });
            
            const mappedStandaloneGifts = myGifts.map(g => ({
                ...g,
                isStandaloneGift: true,
                mergedTime: g.timestamp?.toMillis ? g.timestamp.toMillis() : (g.createdAt?.toMillis ? g.createdAt.toMillis() : 0)
            }));

            const mappedCallGifts = rawCalls
                .filter(c => Math.abs(Number(String(c.totalGiftsDiamonds || 0).replace(/[^0-9.-]+/g, ''))) > 0)
                .map(c => ({
                    id: c.id + '_callgift',
                    isCallGift: true,
                    expertName: c.expertName || c.receiverName || c.hostName || c.toName || 'Network Expert',
                    expertImage: c.expertImage || '',
                    amount: Math.abs(Number(String(c.totalGiftsDiamonds || 0).replace(/[^0-9.-]+/g, ''))),
                    timestamp: c.endedAt || c.createdAt,
                    mergedTime: c.endedAt?.toMillis ? c.endedAt.toMillis() : (c.createdAt?.toMillis ? c.createdAt.toMillis() : 0)
                }));

            const mappedCalls = rawCalls.map(c => ({
                ...c,
                isCall: true,
                mergedTime: c.endedAt?.toMillis ? c.endedAt.toMillis() : (c.createdAt?.toMillis ? c.createdAt.toMillis() : 0)
            }));

            const combined = [...mappedCalls, ...mappedStandaloneGifts, ...mappedCallGifts].sort((a, b) => b.mergedTime - a.mergedTime);
            const totalSecs = rawCalls.reduce((acc, curr) => acc + (Number(curr.finalDuration) || Number(curr.duration) || 0), 0);
            setTotalMinutes(Math.floor(totalSecs / 60));
            setHistory(combined);
            setLoading(false);
        };

        const qCalls = query(collection(db, "calls"), where("callerId", "==", user.uid), orderBy("endedAt", "desc"));
        const unsubscribeHistory = onSnapshot(qCalls, (snapshot) => {
            rawCalls = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            processCallLogs();
        });

        const qGifts = query(collectionGroup(db, 'gifts'));
        const unsubscribeGifts = onSnapshot(qGifts, async (snapshot) => {
            rawGifts = await Promise.all(snapshot.docs.map(async (giftDoc) => {
                const data = giftDoc.data();
                let fetchedHostName = data.hostName || data.receiverName || data.toName || '';
                let fetchedHostImage = data.expertImage || data.receiverImage || data.hostImage || '';
                
                if (!fetchedHostName && giftDoc.ref.parent && giftDoc.ref.parent.parent) {
                    try {
                        const parentDoc = await getDoc(giftDoc.ref.parent.parent);
                        if (parentDoc.exists()) {
                            const pData = parentDoc.data();
                            fetchedHostName = pData.hostName || pData.expertName || pData.roomName || '';
                            fetchedHostImage = pData.hostImage || pData.expertImage || '';
                        }
                    } catch (e) {}
                }
                return { id: giftDoc.id, ...data, fetchedHostName, fetchedHostImage };
            }));
            processCallLogs();
        });

        // 🆕 UPDATE: Game activity log engine (activityHistory listener) removed from here.

        return () => { 
            unsubUser(); unsubscribeHistory(); unsubscribeGifts(); 
        };
    }, [user, userData]);

    // 🔥 SATTI FIX: Synced Highest Balance check for accurate Level display!
    const userDiamonds = userData?.totalSpentDiamonds || 0;
    const userTier = calculateUserLevel(userDiamonds);

    const callsData = history.filter(item => item.isCall);
    const rewardsData = history.filter(item => item.isCallGift || item.isStandaloneGift);

    // 🆕 DYNAMIC THEME (from the user's own tier) - double colour borders + text-safe colours
    const tierPrimary = norm(userTier.color);
    const tierSecondary = norm(userTier.secondaryColor);
    const tierProgress = getTierProgress(userDiamonds, userTier.lvl);
    const tierMaxed = userTier.lvl >= 8;
    const theme = {
        primary: tierPrimary,
        secondary: tierSecondary,
        primaryText: lighten(tierPrimary, 0.45),
        secondaryText: lighten(tierSecondary, 0.62),
        bA: darken(vivid(tierPrimary, 0.3), 0.12),
        bB: darken(vivid(tierSecondary, 0.3), 0.12),
    };
    const PARTICLE_COLORS = [theme.primary, theme.secondary, theme.primaryText, '#FFFFFF'];

    const sideMix: any = {
        borderTopColor: theme.bA,
        borderLeftColor: theme.bA,
        borderBottomColor: theme.bB,
        borderRightColor: theme.bB,
    };

    // ==========================================
    // 🔥 UI RENDERERS
    // ==========================================
    const renderHistoryItem = ({ item, index }: { item: any; index: number }) => (
        <HistoryCard
            item={item}
            index={index}
            scrollY={scrollY}
            headerH={headerH}
            floatAnim={floatAnim}
            theme={theme}
            userTier={userTier}
            router={router}
        />
    );

    // 🆕 UPDATE: renderGameHistoryItem (game activity log renderer) removed.

    const parallaxHeader = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0, -40], extrapolate: 'clamp' });

    // 🆕 Interpolations
    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
    const spin = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const sweepX = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.6, width * 1.1] });
    const stageScale = scrollY.interpolate({ inputRange: [-160, 0, 320], outputRange: [1.14, 1, 0.9], extrapolate: 'clamp' });
    const stageTY = scrollY.interpolate({ inputRange: [-160, 0, 320], outputRange: [10, 0, 70], extrapolate: 'clamp' });
    const stageOpacity = scrollY.interpolate({ inputRange: [0, 150, 300], outputRange: [1, 0.85, 0.25], extrapolate: 'clamp' });
    const miniOpacity = scrollY.interpolate({ inputRange: [MINI_SHOW_AT - 20, MINI_SHOW_AT + 40], outputRange: [0, 1], extrapolate: 'clamp' });
    const miniTY = scrollY.interpolate({ inputRange: [MINI_SHOW_AT - 20, MINI_SHOW_AT + 40], outputRange: [-24, 0], extrapolate: 'clamp' });
    const bgShift = scrollY.interpolate({ inputRange: [0, 1500], outputRange: [0, -300], extrapolate: 'clamp' });
    const bgShiftSlow = scrollY.interpolate({ inputRange: [0, 1500], outputRange: [0, -140], extrapolate: 'clamp' });

    const goCallsTab = () => setActiveTab('CALLS');
    const goRewardsTab = () => setActiveTab('REWARDS');

    // 🆕 HEADER (scrolls with the list): title row + LEVEL CORE stage + identity + wallet + stat tiles + tabs + section label
    const headerEl = (
        <View onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}>
            <View style={styles.headerSection}>
                <Animated.View
                    style={[
                        styles.topRow,
                        {
                            opacity: heroIn,
                            transform: [{ translateY: heroIn.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }]
                        }
                    ]}
                >
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: userTier.color + '40' }, sideMix]}>
                        <Ionicons name="chevron-back" size={24} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={styles.screenTitle} numberOfLines={1}>SESSION LOGS</Text>
                        <View style={[styles.statusPill, { borderColor: theme.primary + '66' }, sideMix]}>
                            <PulseDot color={theme.primary} size={6} />
                            <Text style={[styles.statusPillText, { color: theme.primaryText }]} numberOfLines={1}>LIVE ARCHIVE</Text>
                        </View>
                    </View>
                    <View style={styles.placeholderBtn}>
                        <FloatBox amp={5} dur={1600}>
                            <Img3D uri={IMG.clock} size={44} fallback="time" color={theme.primaryText} />
                        </FloatBox>
                    </View>
                </Animated.View>
            </View>

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
                <View style={[styles.stageGlowBig, { backgroundColor: theme.primary + '08' }]} pointerEvents="none" />
                <View style={[styles.stageGlowSmall, { backgroundColor: theme.secondary + '0C' }]} pointerEvents="none" />

                <Sparkle x={width * 0.18} y={30} size={13} color={theme.primaryText} delay={0} />
                <Sparkle x={width * 0.78} y={70} size={10} color={theme.secondaryText} delay={600} />
                <Sparkle x={width * 0.12} y={190} size={11} color={theme.primaryText} delay={1100} />

                {/* floating 3D objects */}
                <FloatBox amp={7} dur={2000} style={styles.stageTrophy}>
                    <Img3D uri={IMG.clock} size={58} fallback="time" color={theme.primaryText} />
                </FloatBox>
                <FloatBox amp={9} dur={2400} style={styles.stageDiamond}>
                    <Img3D uri={IMG.gift} size={52} fallback="gift" color={theme.primaryText} />
                </FloatBox>
                <FloatBox amp={6} dur={2800} style={styles.stageStar}>
                    <Img3D uri={IMG.diamond} size={38} fallback="diamond" color={theme.secondaryText} />
                </FloatBox>

                {/* gauge ring (tier progress) */}
                <GaugeRing progress={tierProgress} color={theme.primary} size={232} ticks={56} />

                {/* core: spinning gradient ring + big number */}
                <View style={styles.coreWrap}>
                    <OrbitRing size={150} color={theme.primary} dur={5000} dotSize={6} />
                    <OrbitRing size={130} color={theme.primaryText} dur={8000} reverse dotSize={4} style={{ opacity: 0.7 }} />
                    <View style={[styles.coreMask, { shadowColor: theme.primary }]}>
                        <Animated.View style={[styles.coreSpin, { transform: [{ rotate: spin }] }]}>
                            <LinearGradient
                                colors={[theme.primary, theme.secondary, theme.bA, lighten(theme.primary, 0.5), theme.primary] as any}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>
                        <View style={styles.coreInner}>
                            <CountUp
                                style={styles.coreNumber}
                                value={activeTab === 'CALLS' ? totalMinutes : rewardsData.length}
                            />
                            <Text style={[styles.coreSuffix, { color: theme.primaryText }]} numberOfLines={1}>
                                {activeTab === 'CALLS' ? 'MINS' : 'GIFTS'}
                            </Text>
                        </View>
                    </View>
                    <FloatBox amp={4} dur={1500} style={styles.coreCrown}>
                        <Img3D uri={userTier.lvl >= 5 ? IMG.crown : IMG.star} size={38} fallback="ribbon" color={theme.primaryText} />
                    </FloatBox>
                    <View style={[styles.coreLevelBadge, { borderColor: theme.primary + 'AA', shadowColor: theme.primary }, sideMix]}>
                        <Ionicons name="star" size={10} color={theme.primaryText} style={{ marginRight: 4 }} />
                        <Text style={[styles.coreLevelText, { color: theme.primaryText }]}>L{userTier.lvl}</Text>
                    </View>
                </View>
            </Animated.View>

            {/* 🆕 identity text under the core (old label kept: TOTAL CALL TALKTIME / TOTAL REWARDS SENT) */}
            <Animated.View style={[styles.identityBlock, { opacity: heroIn }]}>
                <View style={styles.talktimeHighlight}>
                    <Text style={[styles.totalTalkLabel, { color: theme.primaryText }]} numberOfLines={1}>
                        {activeTab === 'CALLS' ? 'TOTAL CALL TALKTIME' : 'TOTAL REWARDS SENT'}
                    </Text>
                </View>
                <Text style={[styles.identityLevel, { color: theme.primaryText }]} numberOfLines={1}>{userTier.label}</Text>
                <Text style={styles.progressCaption} numberOfLines={1}>
                    {tierMaxed ? 'MAX TIER REACHED' : `${Math.round(tierProgress * 100)}%  •  ${formatCompact(userDiamonds)} DIAMONDS SPENT`}
                </Text>
                <GlowBar progress={tierProgress} color={theme.primary} height={5} style={{ marginTop: 10, width: '70%' }} />
            </Animated.View>

            {/* 🆕 WALLET CARD (3D premium card, same balance data) */}
            <View style={styles.walletArea}>
                <Animated.View
                    style={{
                        opacity: heroIn,
                        transform: [
                            { perspective: 800 },
                            { translateY: heroIn.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
                            { rotateX: heroIn.interpolate({ inputRange: [0, 1], outputRange: ['35deg', '0deg'] }) }
                        ]
                    }}
                >
                    <LinearGradient colors={[theme.bA, theme.bB, theme.bA] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.walletFrame, { shadowColor: theme.bA }]}>
                        <View style={styles.stealthWalletCard}>
                            <LinearGradient colors={[theme.primary + '22', 'rgba(2,3,12,0.0)', theme.secondary + '18']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                            <Animated.View style={[styles.glowTrail, { backgroundColor: userTier.color, transform: [{ translateX: trailX }] }]} />
                            <Animated.View pointerEvents="none" style={[styles.heroSweep, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
                                <LinearGradient colors={['transparent', 'rgba(255,255,255,0.10)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            </Animated.View>
                            <View style={styles.walletInfo}>
                                <Text style={styles.walletTitle} numberOfLines={1}>AVAILABLE ASSETS</Text>
                                <View style={styles.balanceRow}>
                                    <FloatBox amp={3} dur={1700}>
                                        <Img3D uri={IMG.diamond} size={34} fallback="diamond" color={theme.primaryText} />
                                    </FloatBox>
                                    <CountUp style={styles.balanceText} value={userData?.balance || 0} />
                                </View>
                            </View>
                            <MaterialCommunityIcons name="integrated-circuit-chip" size={40} color="rgba(255,255,255,0.08)" style={styles.chipIcon} />
                            <FloatBox amp={6} dur={2200} style={styles.walletCoin}>
                                <Img3D uri={IMG.coin} size={52} fallback="cash" color={theme.primaryText} />
                            </FloatBox>
                        </View>
                    </LinearGradient>
                </Animated.View>
            </View>

            {/* 🆕 STAT TILES (3 glass tiles with DOUBLE COLOUR frame) */}
            <View style={styles.statRow}>
                <StatTile icon="videocam" label="CALLS" color={theme.primaryText} glow={theme.primary} frameA={theme.bA} frameB={theme.bB} enter={heroIn}>
                    <CountUp style={styles.summaryValue} value={callsData.length} />
                </StatTile>
                <StatTile icon="gift" label="REWARDS" color="#D8B4FE" glow="#A855F7" frameA={theme.bB} frameB={theme.bA} enter={heroIn}>
                    <CountUp style={styles.summaryValue} value={rewardsData.length} />
                </StatTile>
                <StatTile icon="star" label="TIER" color={theme.secondaryText} glow={theme.secondary} frameA={theme.bA} frameB={theme.bB} enter={heroIn}>
                    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>L{userTier.lvl}</Text>
                </StatTile>
            </View>

            {/* 👑 TABS: 2 separate pill buttons with DOUBLE COLOUR border */}
            <View style={styles.tabWrapper}>
                <View style={styles.tabsRow}>
                    {/* CALL LOG */}
                    <Animated.View style={{ flex: 1, transform: [{ scale: activeTab === 'CALLS' ? tabPop : 1 }] }}>
                        <TouchableOpacity activeOpacity={0.85} onPress={goCallsTab}>
                            <LinearGradient colors={[theme.bA, theme.bB, theme.bA] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tabBtnFrame, { shadowColor: theme.bA, shadowOpacity: activeTab === 'CALLS' ? 0.6 : 0.15 }]}>
                                <View style={styles.tabBtnInner}>
                                    {activeTab === 'CALLS' && (
                                        <LinearGradient colors={[darken(theme.bA, 0.3), darken(theme.bB, 0.3)] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                    )}
                                    <View style={styles.tabBtnContent}>
                                        <Ionicons name="videocam" size={15} color={activeTab === 'CALLS' ? '#FFF' : '#E2E8F0'} style={{ marginRight: 6 }} />
                                        <Text style={[styles.tabText, activeTab === 'CALLS' && { color: '#FFF' }]} numberOfLines={1}>CALL LOG</Text>
                                        <View style={[styles.tabCountChip, activeTab === 'CALLS' && { backgroundColor: 'rgba(255,255,255,0.24)' }]}>
                                            <Text style={styles.tabCountText}>{formatCompact(callsData.length)}</Text>
                                        </View>
                                    </View>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    {/* 🆕 UPDATE: "ACTIVITY LOG" tab removed */}

                    {/* REWARD LOG */}
                    <Animated.View style={{ flex: 1, transform: [{ scale: activeTab === 'REWARDS' ? tabPop : 1 }] }}>
                        <TouchableOpacity activeOpacity={0.85} onPress={goRewardsTab}>
                            <LinearGradient colors={[theme.bB, theme.bA, theme.bB] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tabBtnFrame, { shadowColor: theme.bB, shadowOpacity: activeTab === 'REWARDS' ? 0.6 : 0.15 }]}>
                                <View style={styles.tabBtnInner}>
                                    {activeTab === 'REWARDS' && (
                                        <LinearGradient colors={[darken('#A855F7', 0.4), darken('#EC4899', 0.45)] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                    )}
                                    <View style={styles.tabBtnContent}>
                                        <Ionicons name="gift" size={15} color={activeTab === 'REWARDS' ? '#FFF' : '#E2E8F0'} style={{ marginRight: 6 }} />
                                        <Text style={[styles.tabText, activeTab === 'REWARDS' && { color: '#FFF' }]} numberOfLines={1}>REWARD LOG</Text>
                                        <View style={[styles.tabCountChip, activeTab === 'REWARDS' && { backgroundColor: 'rgba(255,255,255,0.24)' }]}>
                                            <Text style={styles.tabCountText}>{formatCompact(rewardsData.length)}</Text>
                                        </View>
                                    </View>
                                </View>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </View>
            </View>

            {/* 🆕 Section label */}
            <Animated.View style={[styles.sectionRow, { opacity: tabAnim }]}>
                <View style={[styles.sectionDot, { backgroundColor: theme.primary, shadowColor: theme.primary }]} />
                <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>{activeTab === 'CALLS' ? 'CALL ARCHIVE' : 'REWARD ARCHIVE'}</Text>
                <View style={{ flex: 1 }} />
                <View style={[styles.sectionCount, { borderColor: theme.primary + '66' }, sideMix]}>
                    <Text style={[styles.sectionCountText, { color: theme.primaryText }]}>{activeTab === 'CALLS' ? callsData.length : rewardsData.length}</Text>
                </View>
            </Animated.View>
        </View>
    );

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" />
            {/* 🆕 DARKER base gradient */}
            <LinearGradient colors={['#010309', '#050A18', '#010309']} style={StyleSheet.absoluteFill} />

            {/* 🆕 BACKGROUND IMAGE (dark, low opacity) */}
            {!bgErr && (
                <Image source={{ uri: BG_IMG }} resizeMode="cover" onError={() => setBgErr(true)} style={[StyleSheet.absoluteFill, { opacity: 0.3 }]} />
            )}
            {/* 🆕 tier-colour tint + readability shade (darker) */}
            <LinearGradient colors={[theme.primary + '14', 'rgba(1,3,12,0.35)', theme.secondary + '10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <LinearGradient colors={['rgba(1,3,12,0.35)', 'rgba(1,3,12,0.78)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
            
            <Animated.View style={[styles.aura, { top: -50, left: -100, backgroundColor: userTier.color, opacity: 0.1, transform: [{ translateY: Animated.add(parallaxHeader, orbTranslateY) }] }]} />
            <Animated.View style={[styles.aura, { bottom: 100, right: -100, backgroundColor: userTier.secondaryColor, opacity: 0.07, transform: [{ translateY: Animated.add(parallaxHeader, Animated.multiply(orbTranslateY, -1)) }] }]} />
            <Animated.View style={[styles.aura, { top: 560, left: -140, width: 320, height: 320, borderRadius: 160, backgroundColor: theme.bB, opacity: 0.06, transform: [{ translateY: bgShift }] }]} />

            {/* 🆕 Floating 3D background objects with scroll parallax */}
            <Animated.View pointerEvents="none" style={[styles.bgFloat, { top: 470, right: 14, opacity: 0.14, transform: [{ translateY: bgShiftSlow }] }]}>
                <FloatBox amp={14} dur={2600}>
                    <Img3D uri={IMG.diamond} size={64} fallback="diamond" color={theme.primary} />
                </FloatBox>
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.bgFloat, { top: 660, left: 10, opacity: 0.12, transform: [{ translateY: bgShiftSlow }] }]}>
                <FloatBox amp={10} dur={2200}>
                    <Img3D uri={IMG.coin} size={52} fallback="diamond" color={theme.primary} />
                </FloatBox>
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.bgFloat, { top: 800, right: 30, opacity: 0.10, transform: [{ translateY: bgShiftSlow }] }]}>
                <FloatBox amp={12} dur={3000}>
                    <Img3D uri={IMG.gift} size={48} fallback="gift" color={theme.primary} />
                </FloatBox>
            </Animated.View>

            {/* 🆕 Floating particles (tier colour embers) */}
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

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                {/* 🆕 FULL-SCREEN SCROLL LIST (hero + wallet + tabs + cards all scroll together) */}
                <Animated.FlatList
                    ref={listRef}
                    data={loading ? [] : (activeTab === 'CALLS' ? callsData : rewardsData)}
                    keyExtractor={(item: any) => item.id}
                    renderItem={renderHistoryItem as any}
                    contentContainerStyle={styles.listPadding}
                    showsVerticalScrollIndicator={false}
                    scrollEventThrottle={16}
                    onScroll={onScroll}
                    ListHeaderComponent={headerEl}
                    ListEmptyComponent={
                        loading ? (
                            <View style={styles.loadingBox}>
                                <ActivityIndicator size="large" color={userTier.color} />
                                <Text style={[styles.loadingText, { color: theme.primaryText }]}>Syncing Archives...</Text>
                            </View>
                        ) : activeTab === 'CALLS' ? (
                            <Animated.View style={[styles.emptyContainer, { opacity: tabAnim, transform: [{ translateY: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] }]}>
                                <View style={styles.emptyOrbitWrap}>
                                    <OrbitRing size={150} color={theme.primary} dur={7000} dotSize={7} />
                                    <OrbitRing size={116} color={theme.primaryText} dur={5000} reverse dotSize={5} />
                                    <FloatBox amp={8} dur={1800}>
                                        <Img3D uri={IMG.phone} size={80} fallback="videocam-off" color={theme.primary} />
                                    </FloatBox>
                                </View>
                                <Text style={styles.emptyTitle}>NO SESSIONS FOUND</Text>
                                <Text style={styles.emptySub}>Your professional session logs will appear here once linked with an expert node.</Text>
                            </Animated.View>
                        ) : (
                            <Animated.View style={[styles.emptyContainer, { opacity: tabAnim, transform: [{ translateY: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] }]}>
                                <View style={styles.emptyOrbitWrap}>
                                    <OrbitRing size={150} color="#A855F7" dur={7000} dotSize={7} />
                                    <OrbitRing size={116} color="#D8B4FE" dur={5000} reverse dotSize={5} />
                                    <FloatBox amp={8} dur={1800}>
                                        <Img3D uri={IMG.gift} size={80} fallback="gift-outline" color="#A855F7" />
                                    </FloatBox>
                                </View>
                                <Text style={styles.emptyTitle}>NO REWARDS FOUND</Text>
                                <Text style={styles.emptySub}>Your reward transmission logs will appear here once you send gifts.</Text>
                            </Animated.View>
                        )
                    }
                />
            </SafeAreaView>

            {/* 🆕 COMPACT MINI BAR (slides in after scrolling past the hero) */}
            <Animated.View
                pointerEvents={showMini ? 'auto' : 'none'}
                style={[styles.miniBarWrap, { opacity: miniOpacity, transform: [{ translateY: miniTY }] }]}
            >
                <BlurView intensity={45} tint="dark" style={[styles.miniBar, { paddingTop: insets.top + 8, borderBottomColor: theme.bA }]}>
                    <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8} style={[styles.miniTabBtn, sideMix, { marginRight: 10 }]}>
                        <Ionicons name="chevron-back" size={18} color="#FFF" />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.miniLeft}
                        activeOpacity={0.8}
                        onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}
                    >
                        <LinearGradient colors={[lighten(theme.primary, 0.5), theme.primary, darken(theme.primary, 0.35)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.miniAvatarRing}>
                            <View style={styles.miniCore}>
                                <Text style={styles.miniCoreText}>L{userTier.lvl}</Text>
                            </View>
                        </LinearGradient>
                        <View style={{ marginLeft: 10, flexShrink: 1 }}>
                            <Text style={styles.miniName} numberOfLines={1}>SESSION LOGS</Text>
                            <Text style={[styles.miniLevel, { color: theme.primaryText }]} numberOfLines={1}>{userTier.label}</Text>
                        </View>
                    </TouchableOpacity>
                    <View style={styles.miniTabs}>
                        <TouchableOpacity
                            onPress={goCallsTab}
                            activeOpacity={0.8}
                            style={[styles.miniTabBtn, sideMix, activeTab === 'CALLS' && { backgroundColor: theme.primary + '44' }]}
                        >
                            <Ionicons name="videocam" size={16} color={activeTab === 'CALLS' ? '#FFF' : '#CBD5E1'} />
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={goRewardsTab}
                            activeOpacity={0.8}
                            style={[styles.miniTabBtn, sideMix, activeTab === 'REWARDS' && { backgroundColor: 'rgba(168, 85, 247, 0.4)' }]}
                        >
                            <Ionicons name="gift" size={16} color={activeTab === 'REWARDS' ? '#FFF' : '#CBD5E1'} />
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    // 🆕 DARKER base
    mainContainer: { flex: 1, backgroundColor: '#010309' },
    aura: { position: 'absolute', width: 450, height: 450, borderRadius: 225 },
    bgFloat: { position: 'absolute' },
    headerSection: { paddingHorizontal: 0, paddingTop: 10, paddingBottom: 10 },
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    backBtn: { width: 45, height: 45, backgroundColor: 'rgba(2,4,14,0.8)', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1.2 },
    screenTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
    statusPill: { flexDirection: 'row', alignItems: 'center', marginTop: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1.2, backgroundColor: 'rgba(4,7,18,0.8)' },
    statusPillText: { fontSize: 8, fontWeight: '900', letterSpacing: 2 },
    placeholderBtn: { width: 45, alignItems: 'center', justifyContent: 'center' },
    talktimeHighlight: { alignItems: 'center', marginBottom: 10 },
    totalTalkLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 5 },
    minsDisplay: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', width: '100%' },
    bigMins: { color: '#FFF', fontSize: 44, fontWeight: '900', lineHeight: 46 },
    minSuffix: { color: '#475569', fontSize: 12, fontWeight: '800', marginLeft: 8, marginBottom: 6 },

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
    coreInner: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#030612', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 },
    coreNumber: { color: '#FFF', fontSize: 30, fontWeight: '900', textAlign: 'center', width: '100%' },
    coreSuffix: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 1 },
    coreCrown: { position: 'absolute', top: -30, alignSelf: 'center' },
    coreLevelBadge: { position: 'absolute', bottom: -12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, borderWidth: 1.2, backgroundColor: '#06031A', shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
    coreLevelText: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },

    // 🆕 identity
    identityBlock: { alignItems: 'center', marginTop: 8, marginBottom: 16 },
    identityLevel: { fontSize: 13, fontWeight: '900', letterSpacing: 2, marginTop: 2 },
    progressCaption: { color: 'rgba(255,255,255,0.92)', fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 6, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },

    // 🆕 wallet
    walletArea: { paddingHorizontal: 0, marginBottom: 15 },
    walletFrame: { borderRadius: 26, padding: 1.6, shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 12 },
    stealthWalletCard: { height: 110, backgroundColor: 'rgba(1,2,10,0.94)', borderRadius: 24.4, overflow: 'hidden', padding: 22 },
    quadBorder: { ...StyleSheet.absoluteFillObject, borderLeftWidth: 4, borderRightWidth: 4, borderTopWidth: 1.2, borderBottomWidth: 1.2, borderRadius: 24, opacity: 0.8 },
    glowTrail: { position: 'absolute', width: 100, height: '200%', top: '-50%', opacity: 0.12, transform: [{ rotate: '30deg' }] },
    heroSweep: { position: 'absolute', top: -60, bottom: -60, width: 90 },
    walletInfo: { flex: 1, zIndex: 10, justifyContent: 'center' },
    walletTitle: { color: 'rgba(255,255,255,0.75)', fontSize: 8, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
    balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, maxWidth: '70%' },
    balanceText: { color: '#FFF', fontSize: 32, fontWeight: '900', flexShrink: 1 },
    chipIcon: { position: 'absolute', right: -10, top: -10 },
    walletCoin: { position: 'absolute', right: 18, bottom: 12 },

    // 🆕 stat tiles
    statRow: { flexDirection: 'row', gap: 10, overflow: 'hidden', borderRadius: 22 },
    statTileFrame: { borderRadius: 22, padding: 1.4 },
    statTile: { borderRadius: 20.6, overflow: 'hidden', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, backgroundColor: 'rgba(2, 4, 14, 0.88)' },
    statIconBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 6, shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
    summaryLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 9, fontWeight: '900', letterSpacing: 1.4, marginTop: 3 },
    summaryValue: { color: '#FFF', fontSize: 20, fontWeight: '900' },

    // 🆕 TABS (2 separate pills)
    tabWrapper: { marginTop: 18, marginBottom: 6 },
    tabsRow: { flexDirection: 'row', gap: 12 },
    tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: 'transparent' },
    tabText: { color: '#E2E8F0', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
    tabBtnFrame: { borderRadius: 24, padding: 1.6, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    tabBtnInner: { height: 46, borderRadius: 22.4, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(2, 4, 14, 0.93)' },
    tabBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    tabCountChip: { marginLeft: 6, minWidth: 20, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center' },
    tabCountText: { color: '#FFF', fontSize: 9, fontWeight: '900' },

    // 🆕 section label
    sectionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, marginBottom: LIST_PAD_TOP - 6 },
    sectionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
    sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2.5 },
    sectionCount: { minWidth: 28, height: 22, borderRadius: 11, paddingHorizontal: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
    sectionCountText: { fontSize: 11, fontWeight: '900' },

    listPadding: { paddingHorizontal: 20, paddingBottom: 120 },

    // 🆕 cards
    cardContainer: { marginBottom: 20 },
    cardGlow: { borderRadius: 28, backgroundColor: 'rgba(5,3,20,0.8)', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 9 },
    cardBorder: { borderRadius: 28, padding: 1.5 },
    stealthHistoryCard: { backgroundColor: 'rgba(4,3,16,0.88)', borderRadius: 26.5, padding: 18, overflow: 'hidden' },
    cardAccent: { position: 'absolute', left: 0, top: 18, bottom: 18, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
    cardWatermark3D: { position: 'absolute', right: -22, bottom: -26 },
    cardShine: { position: 'absolute', top: -40, bottom: -40, width: 70 },
    sessionBadge: { position: 'absolute', top: 0, right: 18, paddingHorizontal: 10, paddingVertical: 4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 10 },
    sessionTypeText: { color: '#FFF', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, marginTop: 6, zIndex: 10 },
    thumbNode: { width: 68, height: 68, justifyContent: 'center', alignItems: 'center' },
    expertThumbRing: { width: 54, height: 54, borderRadius: 18, borderWidth: 1.5, padding: 2, elevation: 10, shadowOpacity: 0.5, shadowRadius: 8 },
    expertThumb: { width: '100%', height: '100%', borderRadius: 15 },
    expertInfo: { flex: 1, marginLeft: 10, overflow: 'hidden' },
    nodeTagText: { fontSize: 8, fontWeight: '900', letterSpacing: 2, opacity: 0.75, marginBottom: 2 },
    expertName: { color: '#FFF', fontSize: 14, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
    callDateText: { color: '#94A3B8', fontSize: 10, fontWeight: '800' },
    costContainer: { flexDirection: 'row', alignItems: 'center', gap: 4, marginLeft: 10, maxWidth: 110 },
    costText: { fontSize: 17, fontWeight: '900' },
    statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', padding: 10, borderRadius: 14, borderWidth: 1, zIndex: 10, width: '100%' },
    statItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'center' },
    statValueText: { color: '#E2E8F0', fontSize: 10, fontWeight: '800', letterSpacing: 0.2 },
    vDivider: { width: 1, height: 16, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 4 },
    talkAgainBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', flex: 1.2 },
    reconnectPill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, overflow: 'hidden', elevation: 8, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
    btnGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 14, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
    talkAgainText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },

    loadingBox: { marginTop: 100, alignItems: 'center' },
    loadingText: { marginTop: 15, fontWeight: '900', letterSpacing: 2, fontSize: 10 },
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40, marginTop: 10 },
    emptyOrbitWrap: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1 },
    emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 10, letterSpacing: 2 },
    emptySub: { color: '#CBD5E1', textAlign: 'center', lineHeight: 20, fontSize: 13, fontWeight: '600' },
    exploreBtn: { marginTop: 30, paddingHorizontal: 35, paddingVertical: 18, borderRadius: 15, elevation: 15 },
    exploreText: { color: '#FFF', fontWeight: '900', fontSize: 14, letterSpacing: 2 },

    // 🆕 mini bar (appears on scroll)
    miniBarWrap: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 50 },
    miniBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, paddingHorizontal: 20, borderBottomWidth: 1, backgroundColor: 'rgba(1,3,12,0.86)', overflow: 'hidden' },
    miniLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
    miniAvatarRing: { width: 38, height: 38, borderRadius: 19, padding: 2, justifyContent: 'center', alignItems: 'center' },
    miniCore: { width: '100%', height: '100%', borderRadius: 17, backgroundColor: '#030612', justifyContent: 'center', alignItems: 'center' },
    miniCoreText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
    miniName: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.5 },
    miniLevel: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginTop: 2 },
    miniTabs: { flexDirection: 'row', gap: 8 },
    miniTabBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1.2, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(0,0,0,0.55)' },
});