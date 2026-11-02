import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, arrayUnion, collection, doc, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { auth, db } from '../../../firebaseConfig';

const { width, height } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ✅ ACCURATE THEME & LEVEL CONFIG (LOCKED DEEP-GLOW COLORS)
const getLevelConfig = (beans: number) => {
    if (beans >= 100000000) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'], glow: '#F59E0B', next: 0, prev: 50000000, rate: 8000 };
    if (beans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'], glow: '#EC4899', next: 100000000, prev: 30000000, rate: 7000 };
    if (beans >= 30000000) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'], glow: '#8B5CF6', next: 50000000, prev: 10000000, rate: 5400 };
    if (beans >= 10000000) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'], glow: '#3B82F6', next: 30000000, prev: 5000000, rate: 4800 };
    if (beans >= 5000000)  return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'], glow: '#06B6D4', next: 10000000, prev: 3000000, rate: 4200 };
    if (beans >= 3000000)  return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'], glow: '#10B981', next: 5000000, prev: 1000000, rate: 3600 };
    if (beans >= 1000000)  return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'], glow: '#EAB308', next: 3000000, prev: 300000, rate: 3000 };
    if (beans >= 300000)   return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'], glow: '#94A3B8', next: 1000000, prev: 100000, rate: 2400 };
    if (beans >= 100000)   return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'], glow: 'transparent', next: 300000, prev: 30000, rate: 1800 };
    if (beans >= 30000)    return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'], glow: 'transparent', next: 100000, prev: 0, rate: 1200 };
    return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'], glow: 'transparent', next: 30000, prev: 0, rate: 1000 };
};

// 🆕 Level thresholds (hero level-progress bar-ku)
const LEVEL_GOALS = [0, 30000, 100000, 300000, 1000000, 3000000, 5000000, 10000000, 30000000, 50000000, 100000000];

// 🆕 PREMIUM CONSTANTS
const GOLD = '#F5C84C';
const DIST_COLORS = ['#22D3EE', '#F59E0B', '#FF5C9E', '#34D399']; // calls, call rewards, broadcast, forum

// 👑 ROYAL PALETTE (base dark backgrounds + semantic colors - theme colors ippo LEVEL based)
const ROYAL = {
    bg0: '#05030F',
    bg1: '#0A0620',
    bg2: '#150B38',
    card: 'rgba(10, 6, 28, 0.96)',
    gold: '#F5C84C',
    goldLight: '#FFE9A8',
    goldDeep: '#B8860B',
    violet: '#8B5CF6',
    amethyst: '#C084FC',
    ruby: '#F43F5E',
    rose: '#FF5C9E',
    sapphire: '#3B82F6',
    cyan: '#22D3EE',
    emerald: '#10B981',
    mint: '#34D399',
    amber: '#F59E0B',
    ink: '#CBD5E1',
    mute: '#CBD5E1',
};

// 🆕 COLOR HELPERS (level color -> light / dark / tinted background)
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

// 🆕 Perceived brightness (0-1) + "vivid" = too dark colour-a automatic-a brighten pannum (dark shade kammi)
const luma = (hex: string) => {
    const c = hexToRgb(hex);
    if (!c) return 0.5;
    return (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255;
};
const vivid = (hex: string, min = 0.38) => {
    let h = hex;
    let i = 0;
    while (luma(h) < min && i < 8) {
        h = lighten(h, 0.14);
        i++;
    }
    return h;
};

// 🆕 3D IMAGES (icons8 3D Fluency) - load aagalana automatic-a icon fallback varum
const IMG = {
    trophy: 'https://img.icons8.com/3d-fluency/512/trophy.png',
    gift: 'https://img.icons8.com/3d-fluency/512/gift.png',
    rocket: 'https://img.icons8.com/3d-fluency/512/rocket.png',
    crown: 'https://img.icons8.com/3d-fluency/512/crown.png',
    medal: 'https://img.icons8.com/3d-fluency/512/medal.png',
    money: 'https://img.icons8.com/3d-fluency/512/money-bag.png',
    star: 'https://img.icons8.com/3d-fluency/512/star.png',
    // 🆕 new 3D images for performance tiles
    clock: 'https://img.icons8.com/3d-fluency/512/alarm-clock.png',
    phone: 'https://img.icons8.com/3d-fluency/512/phone.png',
    hourglass: 'https://img.icons8.com/3d-fluency/512/hourglass.png',
    wallet: 'https://img.icons8.com/3d-fluency/512/wallet.png',
};

const TAB_KEYS: ('STATS' | 'MONTHLY' | 'LEADERBOARD')[] = ['STATS', 'MONTHLY', 'LEADERBOARD'];
const TAB_LABELS = ['STATS', 'MONTHLY', 'RANKING'];
const TAB_ICONS = ['chart-areaspline', 'calendar-month', 'trophy'];

// 🆕 Mission ring geometry
const MISSION_RING = 104;
const MISSION_STROKE = 9;
const MISSION_R = (MISSION_RING - MISSION_STROKE) / 2;
const MISSION_C = 2 * Math.PI * MISSION_R;

// 🆕 Reward breakdown donut geometry
const DONUT_SIZE = 132;
const DONUT_STROKE = 15;
const DONUT_R = (DONUT_SIZE - DONUT_STROKE) / 2;
const DONUT_C = 2 * Math.PI * DONUT_R;

// 🆕 Level-based card body colour (GlowCard ellame ithu-la irundhu eduthukkum)
const CardCtx = createContext<string>(ROYAL.card);

// 🆕 LEVEL 0 BORDER MIX: Level 0-la pink + blue rendum border-la mix aagum (matha level-la null = old behaviour)
const BorderCtx = createContext<string[] | null>(null);

// 🆕 3D image with auto icon fallback
const Img3D = ({ uri, size, fallback, color = '#FFF', style }: any) => {
    const [err, setErr] = useState(false);
    if (err) return <MaterialCommunityIcons name={fallback} size={size * 0.7} color={color} />;
    return <Image source={{ uri }} style={[{ width: size, height: size }, style]} resizeMode="contain" onError={() => setErr(true)} />;
};

// 🆕 Floating wrapper -> now TRUE 3D (bob + sway + perspective Y-turn)
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
                        { rotateY: v.interpolate({ inputRange: [0, 1], outputRange: ['-16deg', '16deg'] }) },
                        { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) }
                    ]
                }
            ]}
        >
            {children}
        </Animated.View>
    );
};

// 🆕 3D orbit ring (tilted rotating dashed halo around 3D images)
const OrbitRing = ({ size = 100, color = '#FFF', spin, style }: any) => (
    <Animated.View
        pointerEvents="none"
        style={[
            {
                position: 'absolute',
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 1.5,
                borderStyle: 'dashed',
                borderColor: color + 'AA',
                transform: [{ perspective: 600 }, { rotateX: '70deg' }, { rotate: spin }]
            },
            style
        ]}
    />
);

// 🆕 ✨ Royal twinkling sparkle (gold / multi-color star)
const RoyalSparkle = ({ x, y, size = 12, color = ROYAL.gold, delay = 0, dur = 1800 }: any) => {
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

// 🆕 Glass shine sweep (card mela light kadandhu pogum)
const ShineSweep = ({ w, delay = 0, color = 'rgba(255,255,255,0.18)' }: any) => {
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

// 🆕 Gradient-border glow card (now level-tinted body + optional glass shine)
// 🆕 keepColors = true na Level 0 mix-a skip pannum (reward source / other users level colours maaraama irukka)
const GlowCard = ({ colors, radius = 24, children, style, innerStyle, glow, shine = false, shineDelay = 0, keepColors = false }: any) => {
    const cardBg = useContext(CardCtx);
    const mix = useContext(BorderCtx);
    const [cw, setCw] = useState(0);
    // 🆕 LEVEL 0: pink + blue border mix
    const borderColors = mix && !keepColors ? [mix[0], mix[1], mix[0]] : colors;
    return (
        <View
            style={[
                {
                    borderRadius: radius,
                    backgroundColor: ROYAL.bg1,
                    shadowColor: glow || borderColors[0],
                    shadowOpacity: 0.5,
                    shadowRadius: 18,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 10
                },
                style
            ]}
        >
            <LinearGradient colors={borderColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius, padding: 1.5 }}>
                <View
                    style={[{ borderRadius: radius - 1.5, overflow: 'hidden', backgroundColor: cardBg }, innerStyle]}
                    onLayout={shine ? (e) => setCw(e.nativeEvent.layout.width) : undefined}
                >
                    {children}
                    {shine && <ShineSweep w={cw} delay={shineDelay} />}
                </View>
            </LinearGradient>
        </View>
    );
};

// 🆕 Section title (royal ornament: icon + text + fading line + diamond)
const SectionTitle = ({ title, icon, color }: any) => (
    <View style={styles.sectionRow}>
        <LinearGradient colors={[color, color + '66']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sectionIcon}>
            <MaterialCommunityIcons name={icon} size={14} color="#0B1026" />
        </LinearGradient>
        <Text style={styles.sectionText}>{title}</Text>
        <LinearGradient colors={[color + '88', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sectionLine} />
        <View style={[styles.sectionDiamond, { backgroundColor: color, shadowColor: color }]} />
    </View>
);

// 🆕 3D reveal (section kulla vandhu flip-up aagi varum)
const Reveal = ({ children, delay = 0, style }: any) => {
    const a = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(a, { toValue: 1, duration: 750, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, []);
    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: a,
                    transform: [
                        { perspective: 900 },
                        { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [42, 0] }) },
                        { rotateX: a.interpolate({ inputRange: [0, 1], outputRange: ['26deg', '0deg'] }) },
                        { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }
                    ]
                }
            ]}
        >
            {children}
        </Animated.View>
    );
};

// 🆕 3D press (touch pannina card tilt + shrink aagum)
const Press3D = ({ children, onPress, style }: any) => {
    const s = useRef(new Animated.Value(0)).current;
    return (
        <TouchableOpacity
            activeOpacity={1}
            onPress={onPress}
            onPressIn={() => Animated.spring(s, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(s, { toValue: 0, friction: 5, tension: 120, useNativeDriver: true }).start()}
            style={style}
        >
            <Animated.View
                style={{
                    transform: [
                        { perspective: 800 },
                        { scale: s.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }) },
                        { rotateX: s.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '6deg'] }) }
                    ]
                }}
            >
                {children}
            </Animated.View>
        </TouchableOpacity>
    );
};

// 🆕 Tab icon (active aana 3D flip + pop)
const TabIcon = ({ name, active, color, activeColor }: any) => {
    const s = useRef(new Animated.Value(active ? 1 : 0)).current;
    useEffect(() => {
        Animated.spring(s, { toValue: active ? 1 : 0, friction: 5, tension: 140, useNativeDriver: true }).start();
    }, [active]);
    return (
        <Animated.View
            style={[
                styles.tabIconCircle,
                active && { backgroundColor: activeColor + '44', borderColor: activeColor + 'AA' },
                {
                    transform: [
                        { perspective: 500 },
                        { scale: s.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] }) },
                        { rotateY: s.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }
                    ]
                }
            ]}
        >
            <MaterialCommunityIcons name={name} size={17} color={color} />
        </Animated.View>
    );
};

// 🆕 Loader pulse
const LoaderPulse = ({ color }: { color: string }) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }));
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <View style={styles.loaderPulseBox}>
            <Animated.View
                style={[
                    styles.loaderPulseRing,
                    { borderColor: color, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }] }
                ]}
            />
            <ActivityIndicator size="large" color={color} />
        </View>
    );
};

// 🆕 Performance tile (stagger entrance + 3D floating image + glass shine)
const MatrixBox = ({ icon, label, value, color, borderStyle, iconFamily = "Ionicons", delay = 0, img, imgFallback }: any) => {
    const anim = useRef(new Animated.Value(0)).current;
    const glowAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(anim, { toValue: 1, delay, friction: 7, tension: 60, useNativeDriver: true }).start();
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(glowAnim, { toValue: 1, duration: 1800 + delay * 3, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(glowAnim, { toValue: 0, duration: 1800 + delay * 3, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <Animated.View
            style={{
                flex: 1,
                opacity: anim,
                transform: [
                    { perspective: 900 },
                    { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) },
                    { rotateX: anim.interpolate({ inputRange: [0, 1], outputRange: ['20deg', '0deg'] }) },
                    { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }
                ]
            }}
        >
            <GlowCard colors={[color, color + '22', color + '77']} radius={26} shine shineDelay={600 + delay * 6}>
                <View style={styles.matrixCard}>
                    <LinearGradient colors={[color + '30', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                    <View style={styles.matrixWatermark} pointerEvents="none">
                        {iconFamily === 'Ionicons' ? (
                            <Ionicons name={icon} size={86} color={color + '14'} />
                        ) : (
                            <MaterialCommunityIcons name={icon} size={86} color={color + '14'} />
                        )}
                    </View>
                    {img && (
                        <View style={styles.matrixImg} pointerEvents="none">
                            <FloatBox amp={4} dur={1900 + delay * 4}>
                                <Img3D uri={img} size={52} fallback={imgFallback || 'star'} color={color} />
                            </FloatBox>
                        </View>
                    )}
                    <Animated.View style={{ transform: [{ scale: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] }) }] }}>
                        <LinearGradient colors={[color, color + '88']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.matrixIconCircle}>
                            <LinearGradient colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']} style={styles.matrixIconGloss} pointerEvents="none" />
                            {iconFamily === 'Ionicons' ? (
                                <Ionicons name={icon} size={20} color="#FFF" />
                            ) : (
                                <MaterialCommunityIcons name={icon} size={20} color="#FFF" />
                            )}
                        </LinearGradient>
                    </Animated.View>
                    <Text style={styles.matrixValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>{value}</Text>
                    <Text style={styles.matrixLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{label}</Text>
                    <Animated.View style={[styles.bottomGlowLine, { backgroundColor: color, opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }]} />
                </View>
            </GlowCard>
        </Animated.View>
    );
};

// 🆕 Podium column (top 3) - now with 3D side depth
const PodiumCol = ({ user, pos, isMe, theme, delay }: any) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(anim, { toValue: 1, delay, friction: 7, tension: 50, useNativeDriver: true }).start();
    }, []);

    const meta = [
        { c0: '#FDE68A', c1: '#F59E0B', h: 138, av: 74 },
        { c0: '#E2E8F0', c1: '#94A3B8', h: 106, av: 60 },
        { c0: '#FDBA74', c1: '#D97706', h: 86, av: 60 },
    ][pos];
    const uConfig = getLevelConfig(user.totalBeansEarned || 0);
    const uColor = uConfig.colors[0];

    return (
        <Animated.View
            style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'flex-end',
                opacity: anim,
                transform: [
                    { perspective: 900 },
                    { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
                    { rotateX: anim.interpolate({ inputRange: [0, 1], outputRange: ['35deg', '0deg'] }) }
                ]
            }}
        >
            {pos === 0 ? (
                <FloatBox amp={5} dur={1500} style={{ marginBottom: -4, zIndex: 5 }}>
                    <Img3D uri={IMG.crown} size={38} fallback="crown" color={GOLD} />
                </FloatBox>
            ) : (
                <View style={styles.podiumRankBadge}>
                    <Text style={[styles.podiumRankText, { color: meta.c1 }]}>#{pos + 1}</Text>
                </View>
            )}
            <View style={{ shadowColor: meta.c1, shadowOpacity: 0.8, shadowRadius: 14, shadowOffset: { width: 0, height: 0 }, elevation: 10 }}>
                <LinearGradient colors={[meta.c0, meta.c1, '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: meta.av + 6, height: meta.av + 6, borderRadius: (meta.av + 6) / 2, padding: 3 }}>
                    <Image
                        source={{ uri: user.profilePic || `https://ui-avatars.com/api/?name=${user.name || 'U'}&background=0F172A&color=fff` }}
                        style={{ width: '100%', height: '100%', borderRadius: meta.av / 2, backgroundColor: '#0F172A' }}
                    />
                </LinearGradient>
                {isMe && <View style={[styles.podiumMeDot, { backgroundColor: theme.primary }]} />}
                {pos === 0 && (
                    <>
                        <RoyalSparkle x={-10} y={4} size={12} color={theme.accent} delay={0} />
                        <RoyalSparkle x={meta.av - 2} y={-4} size={10} color={theme.primary} delay={500} />
                        <RoyalSparkle x={meta.av - 6} y={meta.av - 4} size={11} color={theme.secondary} delay={900} />
                    </>
                )}
            </View>
            <Text style={styles.podiumName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {user.name || 'Host'}{isMe ? ' (You)' : ''}
            </Text>
            <View style={[styles.podiumLvl, { backgroundColor: uColor + '30' }]}>
                <Text style={{ color: lighten(uColor, 0.5), fontSize: 11, fontWeight: '900' }}>L{uConfig.lvl} • {uConfig.label.split(' ')[0]}</Text>
            </View>
            <LinearGradient colors={[meta.c0 + 'CC', meta.c1 + '44', 'rgba(2,6,23,0.2)']} style={[styles.podiumBlock, { height: meta.h, borderColor: meta.c1 + 'AA' }]}>
                <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} style={styles.podiumGloss} pointerEvents="none" />
                <View style={[styles.podiumSide, { backgroundColor: meta.c1 + '77' }]} pointerEvents="none" />
                <Text style={[styles.podiumBigNum, { color: '#FFF' }]}>{pos + 1}</Text>
                <View style={styles.podiumRewardPill}>
                    <Text style={{ fontSize: 11 }}>🎖️</Text>
                    <Text style={styles.podiumRewardText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{user.totalBeansEarned?.toLocaleString() || 0}</Text>
                </View>
            </LinearGradient>
        </Animated.View>
    );
};

export default function ExpertStats({ expertData }: { expertData: any }) {
    const router = useRouter(); 
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    
    const [mainTab, setMainTab] = useState<'STATS' | 'MONTHLY' | 'LEADERBOARD'>('STATS'); 
    const [activeTab, setActiveTab] = useState(0); 

    const [breakdown, setBreakdown] = useState({
        calls: 0, liveGifts: 0, partyGifts: 0, callGifts: 0, totalDeepGifts: 0
    });

    const [realTodayStats, setRealTodayStats] = useState<{calls: number, mins: number, beans: number} | null>(null);

    // 🆕 Longest single session partner (name + photo)
    const [longestCall, setLongestCall] = useState<{ name: string, pic: string | null, secs: number } | null>(null);

    const [historyLogs, setHistoryLogs] = useState<any[]>([]); 
    const [historyLoading, setHistoryLoading] = useState(true);
    
    const [yearlyEarnings, setYearlyEarnings] = useState<{year: string, total: number, months: {month: string, total: number, logs: any[]}[]}[]>([]);
    const [expandedYear, setExpandedYear] = useState<string | null>(null);
    const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

    const [leaderboardData, setLeaderboardData] = useState<any[]>([]);
    const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);

    const [blockModalVisible, setBlockModalVisible] = useState(false);
    const [selectedUserToBlock, setSelectedUserToBlock] = useState<{id: string, name: string} | null>(null);
    const [isBlocking, setIsBlocking] = useState(false);

    const blockReasons = [
        "Abusive Language / Harassment",
        "Inappropriate Behavior",
        "Scam / Spam / Phishing",
        "Threatening / Aggressive",
        "Other Policy Violation"
    ];

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current; 

    // 🆕 PREMIUM ANIMATION VALUES
    const rotAnim = useRef(new Animated.Value(0)).current;      // hero rotating frame
    const sweepAnim = useRef(new Animated.Value(0)).current;    // hero shine sweep
    const pulseAnim = useRef(new Animated.Value(0)).current;    // live dot / glow pulse
    const heroCountAnim = useRef(new Animated.Value(0)).current;// hero count-up + level bar
    const tabAnim = useRef(new Animated.Value(1)).current;      // tab content transition
    const tabSlide = useRef(new Animated.Value(0)).current;     // tab pill slide
    const distAnim = useRef(new Animated.Value(0)).current;     // distribution bar grow
    const missionAnim = useRef(new Animated.Value(0)).current;  // mission ring fill
    const [tabW, setTabW] = useState(0);
    const [heroCount, setHeroCount] = useState(0);
    const particles = useRef(
        Array.from({ length: 14 }, (_, i) => ({
            v: new Animated.Value(0),
            x: ((i * 41) % 100) / 100 * width,
            y: 140 + ((i * 59) % 460),
            size: 2 + (i % 3),
            dur: 6500 + (i % 5) * 1200,
            delay: i * 500,
        }))
    ).current;

    const totalBeansEarned = stats?.totalBeansEarned || expertData?.totalBeansEarned || 0;
    const config = getLevelConfig(totalBeansEarned);
    
    // 🆕 Level colours brighten pannirukken (dark colours -> vivid) so dark shade kammi
    const primary = config.colors?.[0] || '#ad57a6';
    const mid = config.colors?.[1] || primary;
    const secondary = config.colors?.[2] || '#5e2a5b';
    
    // 🆕 THEME = LEVEL BASED. Level maarina theme-um auto-a maarum (colors, glow, background tint ellame).
    const tierColor = config.glow !== 'transparent' ? (config.glow || primary) : primary;
    // 🆕 DARKER SHADE: background tint kammi pannirukken (0.18/0.12 -> 0.13/0.08) so dark shade konjam adhigam
    const bgTint = config.lvl >= 3 ? 0.08 : 0.05;
    // 🆕 LEVEL 0 = BLUE + PINK primary. Antha rendum border-la mix aaga (matha level-ku null)
    const isLevel0 = config.lvl === 0;
    const borderMix: string[] | null = isLevel0 ? [primary, secondary] : null;
    const theme = {
        primary: primary,
        secondary: mid,
        accent: secondary,
        tier: tierColor,
        tierPrimary: primary,
        tierSecondary: secondary,
        light: lighten(tierColor, 0.62),
        deep: darken(secondary, 0.35),
        // 🆕 TEXT-SAFE colours (dark blue / dark accent colours text-la nalla theriya brighten panniruken)
        accentText: lighten(secondary, 0.62),
        tierText: lighten(tierColor, 0.45),
        // 🆕 level-tinted panels (dark black illa - level colour kalandha lighter shade)
        // 🆕 ANALYTICS BOARD (hero) mattum: level colour 1 + colour 2 (L0 = pink + blue) shade
        // 🆕 DARKER SHADE: vivid min 0.34 -> 0.24 (hero romba lite-a theriyaama konjam dark)
        heroA: vivid(primary, 0.14),
        heroB: vivid(secondary, 0.14),
        panel: '#0F0A28',
        panelDeep: '#05030F',
        cardBg: ROYAL.card,
        bgGradient: [
            blend(ROYAL.bg1, primary, bgTint),
            blend('#110A2E', mid, bgTint),
            ROYAL.bg0
        ] as any
    };

    // 🆕 Hero gradient dark shade (heroA/heroB ah konjam darken panni use pannurom, other colours same)
    const heroDarkA = darken(theme.heroA, 0.38);
    const heroDarkB = darken(theme.heroB, 0.38);

    // 🆕 LEVEL 0 mixed border style (per-side colour: pink + blue) - matha level-la empty object
    const mixBorderStyle: any = borderMix
        ? { borderTopColor: borderMix[0], borderLeftColor: borderMix[0], borderBottomColor: borderMix[1], borderRightColor: borderMix[1] }
        : {};

    // 🆕 Level based timeline + particle colors
    const MONTH_COLORS = [theme.primary, theme.secondary, theme.accent, theme.tier, lighten(primary, 0.35), lighten(mid, 0.35), lighten(secondary, 0.35), darken(tierColor, 0.2)];
    const PARTICLE_COLORS = [theme.accent, theme.primary, theme.secondary, theme.tier, '#FFFFFF'];

    // 🆕 each milestone has own level-theme color pair (color, color2)
    const milestones = [
        { target: 100000, bonus: 5000, label: "STARTER", color: theme.primary, color2: theme.secondary },
        { target: 300000, bonus: 10000, label: "PRO", color: theme.secondary, color2: theme.accent },
        { target: 500000, bonus: 15000, label: "ELITE", color: theme.accent, color2: theme.primary }
    ];

    const bonusLock = useRef(false);

    const evaluateAndResetDailyStats = async (expertId: string, currentData: any) => {
        const today = new Date();
        const offset = today.getTimezoneOffset() * 60000;
        const localDateStr = (new Date(Date.now() - offset)).toISOString().split('T')[0];
        
        if (currentData.lastBonusDate !== localDateStr) {
            if (bonusLock.current) return;
            bonusLock.current = true; 

            const storageKey = `@daily_reset_${localDateStr}_${expertId}`;
            const hasClaimedLocally = await AsyncStorage.getItem(storageKey);
            if (hasClaimedLocally === 'true') return; 

            await AsyncStorage.setItem(storageKey, 'true');

            let bonusEarned = 0;
            let earnedLabel = "";
            const yesterdayBeans = Number(currentData.todayBeans) || 0;

            for (let i = milestones.length - 1; i >= 0; i--) {
                if (yesterdayBeans >= milestones[i].target) {
                    bonusEarned = milestones[i].bonus;
                    earnedLabel = milestones[i].label;
                    break; 
                }
            }

            try {
                const updates: any = {
                    todayBeans: 0, todayMinutes: 0, todayCalls: 0, 
                    lastBonusDate: localDateStr, topVipSupporter: { name: 'None', amount: 0, date: localDateStr },
                    currentDailyMilestone: "" 
                };

                if (bonusEarned > 0) {
                    updates.walletBalance = increment(bonusEarned);
                    updates.beans = increment(bonusEarned);
                    updates.totalBeansEarned = increment(bonusEarned); 
                }

                await updateDoc(doc(db, "users", expertId), updates);

                if (bonusEarned > 0) {
                    await addDoc(collection(db, "transactions"), {
                        userId: expertId,
                        type: 'mission_bonus',
                        title: `Daily Mission Reward: ${earnedLabel}`,
                        amount: bonusEarned,
                        beans: bonusEarned,
                        expertBeans: bonusEarned,
                        timestamp: serverTimestamp(),
                        createdAt: serverTimestamp(),
                        status: 'completed'
                    });

                    Alert.alert(
                        "🎉 Daily Milestone Reached! 💸", 
                        `Awesome work! You received ${bonusEarned.toLocaleString()} rewards for completing the ${earnedLabel} mission yesterday!\n\nIt has been credited to your wallet.`
                    );
                }
            } catch (e) {
                console.error("Failed to auto-reset stats:", e);
                bonusLock.current = false; 
                await AsyncStorage.removeItem(storageKey);
            }
        }
    };

    useEffect(() => {
        if (mainTab === 'LEADERBOARD' && leaderboardData.length === 0) {
            fetchLeaderboard();
        }
    }, [mainTab]);

    const fetchLeaderboard = async () => {
        setIsLeaderboardLoading(true);
        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, orderBy("totalBeansEarned", "desc"), limit(25));
            const snap = await getDocs(q);
            
            let experts = snap.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter((u: any) => (u.isExpert === true || u.role === 'expert') && (u.totalBeansEarned > 0));
                
            experts = experts.slice(0, 10); 
            setLeaderboardData(experts);
        } catch (error) {
            console.error("Leaderboard fetch error:", error);
        } finally {
            setIsLeaderboardLoading(false);
        }
    };

    useEffect(() => {
        const fetchAllArchives = async () => {
            const user = auth.currentUser;
            if (!user) return;
            try {
                let rawData: any[] = [];
                
                let calcTodayCalls = 0;
                let calcTodayMins = 0;
                // 🆕 longest single call tracker
                let longestSecs = 0;
                let longestInfo: any = null;
                const today = new Date();
                const offset = today.getTimezoneOffset() * 60000;
                const localDateStr = (new Date(Date.now() - offset)).toISOString().split('T')[0];

                // 1. VIDEO CALLS
                try {
                    const callsSnap = await getDocs(query(collection(db, "calls"), where("expertId", "==", user.uid)));
                    for (const docSnap of callsSnap.docs) {
                        const d = docSnap.data();

                        const timeVal = d.endedAt || d.createdAt;
                        if (timeVal) {
                            let logDate = new Date();
                            if (timeVal.toDate) logDate = timeVal.toDate();
                            else if (timeVal.seconds) logDate = new Date(timeVal.seconds * 1000);
                            else if (typeof timeVal === 'number') logDate = new Date(timeVal < 10000000000 ? timeVal * 1000 : timeVal);

                            const logDateStr = (new Date(logDate.getTime() - offset)).toISOString().split('T')[0];
                            if (logDateStr === localDateStr) {
                                if (d.status === 'ended' || d.status === 'completed' || d.duration > 0) {
                                    calcTodayCalls++;
                                    calcTodayMins += (Number(d.duration) || Number(d.callDuration) || 0) / 60;
                                }
                            }
                        }

                        // 🆕 track longest session + who it was with
                        const durSecs = Number(d.duration) || Number(d.callDuration) || 0;
                        if (durSecs > longestSecs) {
                            longestSecs = durSecs;
                            longestInfo = {
                                id: d.callerId,
                                name: d.callerName,
                                pic: d.callerPic || d.callerProfilePic || d.callerImage || d.callerPhoto || null
                            };
                        }

                        const expertEarnings = Number(d.expertEarnings) || 0;
                        if (expertEarnings > 0) { 
                            rawData.push({ id: docSnap.id, type: 'video_call', expertEarnings: expertEarnings, timestamp: timeVal || { seconds: 0 }, callerName: d.callerName, userId: d.callerId });
                        }
                    }
                } catch(e) { console.log('Calls fetch error', e); }

                // 🆕 Longest session partner: name + photo
                try {
                    if (longestInfo && longestSecs > 0) {
                        let lName = longestInfo.name;
                        let lPic = longestInfo.pic;
                        if (longestInfo.id && (!lPic || !lName)) {
                            try {
                                const uSnap = await getDoc(doc(db, "users", longestInfo.id));
                                if (uSnap.exists()) {
                                    const u: any = uSnap.data();
                                    lPic = lPic || u.profilePic || null;
                                    lName = lName || u.name || null;
                                }
                            } catch (e) { console.log('Longest caller fetch error', e); }
                        }
                        setLongestCall({ name: lName || 'User', pic: lPic || null, secs: longestSecs });
                    }
                } catch (e) { console.log('Longest call error', e); }

                // 2. TRANSACTIONS
                try {
                    const userQ = query(collection(db, "transactions"), where("userId", "==", user.uid));
                    const expertQ = query(collection(db, "transactions"), where("expertId", "==", user.uid));
                    
                    const [transSnapUser, transSnapExpert] = await Promise.all([getDocs(userQ), getDocs(expertQ)]);
                    const mergedDocs = [...transSnapUser.docs, ...transSnapExpert.docs];
                    const uniqueDocs = Array.from(new Map(mergedDocs.map(doc => [doc.id, doc])).values());

                    for (const docSnap of uniqueDocs) {
                        const d = docSnap.data();
                        
                        if (d.type === 'video_call') continue; 
                        
                        if (d.type === 'mission_bonus' || d.title?.includes('Daily Mission') || (d.title?.includes('Bonus') && !d.title?.includes('Arena'))) {
                            const bonusAmount = Number(d.expertBeans) || Number(d.expertBean) || Number(d.beans) || Number(d.amount) || 0;
                            if (bonusAmount > 0) {
                                rawData.push({
                                    id: docSnap.id,
                                    type: 'daily_bonus',
                                    senderId: null,
                                    senderName: 'TalkPe System',
                                    syncPic: 'https://img.icons8.com/3d-fluency/512/star.png',
                                    syncLevel: 'Legend',
                                    giftName: d.title || 'Daily Goal Completion',
                                    amount: bonusAmount,
                                    beans: bonusAmount,
                                    timestamp: d.timestamp || d.createdAt || { seconds: 0 }
                                });
                            }
                            continue; 
                        }

                        let tType = '';
                        if (d.type === 'withdrawal' || d.type === 'payout' || d.status === 'deducted' || d.amount < 0) continue;

                        if (d.source === 'Session' || d.source === 'forum') {
                            tType = 'party_gift';
                        } else if (d.source === 'live') {
                            tType = 'live_gift';
                        } else if (d.type === 'gift' || d.source === 'call') {
                            tType = 'call_gift';
                        } else {
                            continue;
                        }

                        const bns = Number(d.expertBeans) || Number(d.expertBean) || Number(d.beans) || Math.floor((Number(d.diamonds) || Number(d.amount) || 0) / 2);
                        if (bns > 0) { 
                            rawData.push({ id: docSnap.id, type: tType, beans: bns, timestamp: d.timestamp || d.createdAt || { seconds: 0 }, senderName: d.senderName || d.userName || d.name || "User", userId: d.userId || d.senderId });
                        }
                    }
                } catch(e) { console.log('Transactions fetch error', e); }

                // 3. LIVE GIFTS
                try {
                    const livesSnap = await getDocs(query(collection(db, "lives"), where("hostId", "==", user.uid)));
                    for (const liveDoc of livesSnap.docs) {
                        const liveData = liveDoc.data();
                        const giftsSnap = await getDocs(collection(db, "lives", liveDoc.id, "gifts"));
                        for (const gDoc of giftsSnap.docs) {
                            const g = gDoc.data();
                            const bns = Number(g.beans) || Math.floor((Number(g.amount) || Number(g.price) || 0) / 2);
                            if (bns > 0) { 
                                rawData.push({ id: gDoc.id, type: 'live_gift', beans: bns, timestamp: g.timestamp || liveData.startedAt || { seconds: 1 }, senderName: g.senderName || g.userName || g.name || "User", userId: g.senderId || g.userId });
                            }
                        }
                    }
                } catch(e) { console.log('Live gifts fetch error', e); }

                // 4. FORUM REWARDS
                try {
                    const forumSnap = await getDocs(query(collection(db, "forum_rooms"), where("hostId", "==", user.uid)));
                    for (const forumDoc of forumSnap.docs) {
                        const pData = forumDoc.data();
                        const giftsSnap = await getDocs(collection(db, "forum_rooms", forumDoc.id, "gifts"));
                        for (const gDoc of giftsSnap.docs) {
                            const g = gDoc.data();
                            const bns = Number(g.beans) || Math.floor((Number(g.price) || Number(g.amount) || 0) / 2);
                            if (bns > 0) { 
                                rawData.push({ id: gDoc.id, type: 'party_gift', beans: bns, timestamp: g.timestamp || pData.createdAt || { seconds: 1 }, senderName: g.senderName || g.userName || g.name || "User", userId: g.senderId || g.userId });
                            }
                        }
                    }
                } catch(e) { console.log('Forum rewards fetch error', e); }

                const uniqueData: any[] = [];
                const seen = new Set();
                for (const item of rawData) {
                    const amount = Number(item.beans) || Number(item.expertEarnings) || 0;
                    if (amount > 0) { 
                        const uniqueKey = item.id ? `${item.type}_${item.id}` : `${item.type}_${amount}_${item.timestamp?.seconds || Math.random()}`;
                        if (!seen.has(uniqueKey)) {
                            seen.add(uniqueKey);
                            uniqueData.push(item);
                        }
                    }
                }

                let calls = 0, liveGifts = 0, partyGifts = 0, callGifts = 0;
                let todayCalculatedBeans = 0;

                uniqueData.forEach(t => {
                    if (t.type === 'video_call') calls += (t.expertEarnings || 0);
                    else if (t.type === 'live_gift') liveGifts += (t.beans || 0);
                    else if (t.type === 'party_gift') partyGifts += (t.beans || 0);
                    else if (t.type === 'call_gift') callGifts += (t.beans || 0);

                    const rawT = t.timestamp || t.createdAt;
                    if (rawT) {
                        let logDate = new Date();
                        if (rawT.toDate) logDate = rawT.toDate();
                        else if (rawT.seconds) logDate = new Date(rawT.seconds * 1000);
                        else if (typeof rawT === 'number') logDate = new Date(rawT < 10000000000 ? rawT * 1000 : rawT);
                        else if (typeof rawT === 'string') logDate = new Date(rawT);

                        const logDateStr = (new Date(logDate.getTime() - offset)).toISOString().split('T')[0];
                        if (logDateStr === localDateStr) {
                            if (t.type === 'video_call') todayCalculatedBeans += (Number(t.expertEarnings) || 0);
                            else todayCalculatedBeans += (Number(t.beans) || Number(t.expertEarnings) || 0);
                        }
                    }
                });

                setBreakdown({
                    calls, liveGifts, partyGifts, callGifts,
                    totalDeepGifts: liveGifts + partyGifts + callGifts
                });

                uniqueData.sort((a, b) => {
                    const getT = (val: any) => {
                        const t = val?.timestamp || val?.createdAt;
                        if (!t) return 0;
                        if (t.toMillis) return t.toMillis();
                        if (t.seconds) return t.seconds * 1000;
                        if (t.getTime) return t.getTime();
                        if (typeof t === 'number') return t < 10000000000 ? t * 1000 : t; 
                        if (typeof t === 'string') return new Date(t).getTime();
                        return 0;
                    };
                    return getT(b) - getT(a);
                });
                
                setHistoryLogs(uniqueData);

                setRealTodayStats({
                    calls: calcTodayCalls,
                    mins: calcTodayMins,
                    beans: todayCalculatedBeans
                });

                const yearMap: Record<string, { total: number, months: Record<string, { total: number, logs: any[] }> }> = {};

                uniqueData.forEach(t => {
                    const rawT = t.timestamp;
                    if (rawT) {
                        let logDate = new Date();
                        if (rawT.toDate) logDate = rawT.toDate();
                        else if (rawT.seconds) logDate = new Date(rawT.seconds * 1000);
                        else if (typeof rawT === 'number') logDate = new Date(rawT < 10000000000 ? rawT * 1000 : rawT);
                        else if (typeof rawT === 'string') logDate = new Date(rawT);

                        const yearStr = logDate.getFullYear().toString();
                        const monthStr = logDate.toLocaleString('default', { month: 'short' }); 
                        
                        let earned = 0;
                        if (t.type === 'video_call') earned = Number(t.expertEarnings) || 0;
                        else if (t.type === 'live_gift' || t.type === 'party_gift' || t.type === 'call_gift') earned = Number(t.beans) || 0;
                        else if (t.type === 'daily_bonus') earned = Number(t.beans) || 0; 
                        else earned = Number(t.expertEarnings) || Number(t.beans) || 0;

                        if (earned > 0) { 
                            if (!yearMap[yearStr]) yearMap[yearStr] = { total: 0, months: {} };
                            if (!yearMap[yearStr].months[monthStr]) yearMap[yearStr].months[monthStr] = { total: 0, logs: [] };
                            
                            yearMap[yearStr].total += earned;
                            yearMap[yearStr].months[monthStr].total += earned;
                            yearMap[yearStr].months[monthStr].logs.push(t);
                        }
                    }
                });

                const yearlyArray = Object.keys(yearMap).map(year => ({
                    year,
                    total: yearMap[year].total,
                    months: Object.keys(yearMap[year].months).map(month => ({
                        month,
                        total: yearMap[year].months[month].total,
                        logs: yearMap[year].months[month].logs
                    })).sort((a, b) => {
                        const mOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        return mOrder.indexOf(b.month) - mOrder.indexOf(a.month);
                    })
                })).sort((a, b) => Number(b.year) - Number(a.year));

                setYearlyEarnings(yearlyArray);
                setHistoryLoading(false); 

            } catch (error) { 
                console.error(error); 
                setHistoryLoading(false); 
            }
        };
        fetchAllArchives();
    }, []);

    useEffect(() => {
        Animated.loop(
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true
          })
        ).start();

        // 🆕 Hero rotating frame + shine sweep + pulse
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
        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        );
        pulseLoop.start();

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

        const expertId = auth.currentUser?.uid;
        if (!expertId) return;

        const unsub = onSnapshot(doc(db, "users", expertId), async (snap) => {
            if (snap.exists()) {
                const d = snap.data();

                const today = new Date();
                const offset = today.getTimezoneOffset() * 60000;
                const localDateStr = (new Date(Date.now() - offset)).toISOString().split('T')[0];
                const isNewDay = d.lastBonusDate !== localDateStr;

                await evaluateAndResetDailyStats(expertId, d);

                const totalBeans = Number(d.walletBalance) || 0; 
                const lastCallerName = d.lastCallFrom || "Waiting...";

                // 🆕 KEY USER: name + diamond value thani thani (name mela, diamond kila)
                const hasKeyUser = !!(d.topVipSupporter?.name && d.topVipSupporter.name !== 'None');
                const eliteFan = hasKeyUser ? String(d.topVipSupporter.name) : "No Key Users Yet";
                const eliteFanAmount = hasKeyUser ? (Number(d.topVipSupporter?.amount) || 0) : 0;
                
                const longestSecs = Number(d.longestCallDuration) || 0; 
                const longestCallMinutes = Math.floor(longestSecs / 60);

                const todaysEarnings = isNewDay ? 0 : (Number(d.todayBeans) || 0);
                const displayTodayCalls = isNewDay ? 0 : (Number(d.todayCalls) || 0);
                const displayTodayMins = isNewDay ? '0' : Math.round(Number(d.todayMinutes) || 0).toString();
                
                if (todaysEarnings >= 300000) setActiveTab(2);
                else if (todaysEarnings >= 100000) setActiveTab(1);
                else setActiveTab(0);

                setStats({
                    ...d,
                    totalBeans,
                    totalBeansEarned: Number(d.totalBeansEarned) || 0, 
                    todayBeans: todaysEarnings,
                    totalCalls: Number(d.totalCalls) || 0,
                    todayCalls: displayTodayCalls, 
                    totalWithdrawn: Number(d.totalWithdrawnRs) || 0,
                    displayMins: Math.round(Number(d.totalMinutes) || 0).toString(),
                    todayMins: displayTodayMins,
                    longestCallDisplay: longestCallMinutes.toString(), 
                    topFanName: eliteFan,
                    topFanAmount: eliteFanAmount,
                    hasKeyUser: hasKeyUser,
                    lastCaller: lastCallerName,
                    statusLabel: d.isVerified === true ? "VERIFIED PRO" : "PENDING VERIFICATION",
                    statusColor: d.isVerified === true ? "#10B981" : "#F59E0B",
                });
                
                setLoading(false);
                Animated.parallel([
                    Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
                    Animated.spring(slideAnim, { toValue: 0, friction: 5, tension: 40, useNativeDriver: true })
                ]).start();
            }
        });

        return () => unsub();
    }, []);

    // 🆕 Hero count-up (total rewards) + level bar fill
    useEffect(() => {
        const target = Number(stats?.totalBeansEarned) || 0;
        const id = heroCountAnim.addListener(({ value }) => setHeroCount(Math.floor(target * value)));
        heroCountAnim.setValue(0);
        Animated.timing(heroCountAnim, { toValue: 1, duration: 1600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
            if (finished) setHeroCount(target);
        });
        return () => heroCountAnim.removeListener(id);
    }, [stats?.totalBeansEarned]);

    // 🆕 Tab pill slide + content transition
    useEffect(() => {
        Animated.spring(tabSlide, { toValue: TAB_KEYS.indexOf(mainTab), useNativeDriver: true, friction: 8, tension: 70 }).start();
        tabAnim.setValue(0);
        Animated.timing(tabAnim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, [mainTab]);

    // 🆕 Distribution bar grow
    useEffect(() => {
        distAnim.setValue(0);
        Animated.timing(distAnim, { toValue: 1, duration: 1100, delay: 250, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, [mainTab, breakdown.calls, breakdown.callGifts, breakdown.liveGifts, breakdown.partyGifts]);

    // ---- Derived "today" values (early return-ku munnaadi, hooks order safe) ----
    // 🆕 FIX: Firestore user doc = single source of truth. realTodayStats (archive scan) fallback-a mattum use aagum,
    //         so reload pannina 46m / 36 calls / 88,420 rewards maaraama same-a irukkum.
    const finalTodayCalls = stats?.todayCalls ?? realTodayStats?.calls ?? 0;
    const finalTodayMins = stats?.todayMins ?? (realTodayStats ? Math.round(realTodayStats.mins).toString() : '0');
    const finalTodayBeans = stats?.todayBeans ?? realTodayStats?.beans ?? 0;

    const currentMilestone = milestones[activeTab] || milestones[0];
    const progress = Math.min((finalTodayBeans || 0) / currentMilestone.target, 1);
    const isCompleted = (finalTodayBeans || 0) >= currentMilestone.target;

    // 🆕 Mission ring fill
    useEffect(() => {
        Animated.timing(missionAnim, { toValue: progress, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, [progress]);

    const handleReasonSelect = (reason: string) => {
        if (!selectedUserToBlock || !auth.currentUser) return;
        const targetId = selectedUserToBlock.id;
        
        const alreadyBlocked = Array.isArray(stats?.blockedUsers) && stats.blockedUsers.includes(targetId);
        
        if (alreadyBlocked) {
            Alert.alert("ALREADY RESTRICTED", "You have already restricted this user. Remove restriction first.");
            setBlockModalVisible(false);
            return;
        }

        Alert.alert(
            "CONFIRM RESTRICTION",
            `Are you sure you want to restrict ${selectedUserToBlock.name}?\n\nReason: ${reason}`,
            [
                { text: "CANCEL", style: "cancel" },
                { 
                    text: "YES, RESTRICT", 
                    style: "destructive",
                    onPress: () => executeBlockUser(reason, targetId)
                }
            ]
        );
    };

    const executeBlockUser = async (reason: string, targetId: string) => {
        setIsBlocking(true);
        const expertId = auth.currentUser!.uid;

        try {
            await updateDoc(doc(db, "users", expertId), { blockedUsers: arrayUnion(targetId) });
            await updateDoc(doc(db, "users", targetId), { expertBlockCount: increment(1) });
            await addDoc(collection(db, "admin_alerts"), {
                type: 'EXPERT_BLOCKED_USER', expertId: expertId, expertName: stats?.name || "Host",
                userId: targetId, userName: selectedUserToBlock!.name, reason: reason,
                timestamp: serverTimestamp(), status: 'unread'
            });

            Alert.alert("SUCCESS", `${selectedUserToBlock!.name} has been restricted and reported.`);
        } catch (error) {
            console.error("Block Error:", error);
            Alert.alert("ERROR", "Could not restrict the user. Please try again.");
        } finally {
            setIsBlocking(false); setBlockModalVisible(false); setSelectedUserToBlock(null);
        }
    };

    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });

    const borderType1 = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: theme.primary, borderRightColor: theme.primary,
        borderTopColor: theme.secondary + '80', borderBottomColor: theme.secondary + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    const borderType2 = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: theme.secondary, borderRightColor: theme.secondary,
        borderTopColor: theme.primary + '80', borderBottomColor: theme.primary + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    // 🆕 Interpolations
    const spin = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const sweepX = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.6, width * 1.1] });
    const dotScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
    const dotOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.3] });
    const trophyGlow = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] });
    const crestScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });
    // 🆕 hero card gentle 3D tilt + trophy ground shadow
    const heroTiltY = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: ['-1.8deg', '1.8deg'] });
    const heroTiltX = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: ['1deg', '-1deg'] });
    const trophyShadowScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.65] });

    // 🆕 Hero level progress
    const levelGoal = LEVEL_GOALS[config.lvl] || 0;
    const levelPct = config.next > 0
        ? Math.max(0, Math.min((totalBeansEarned - levelGoal) / (config.next - levelGoal), 1))
        : 1;
    const levelBarWidth = heroCountAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${levelPct * 100}%`] }) as any;
    // 🆕 Clear wording values: completed % / balance % / balance rewards (100% nu thappa kaattaama floor use pannirukken)
    const levelPctDisplay = config.next > 0 ? Math.min(99, Math.floor(levelPct * 100)) : 100;
    const levelRemainPct = config.next > 0 ? 100 - levelPctDisplay : 0;
    const levelRemainBeans = config.next > 0 ? Math.max(config.next - totalBeansEarned, 0) : 0;

    // 🆕 Mission colors (level theme; completed = green)
    const missionColor = isCompleted ? ROYAL.emerald : currentMilestone.color;
    const missionColor2 = isCompleted ? ROYAL.mint : currentMilestone.color2;

    // 🆕 Longest session minutes (user doc + archive scan, edhu perusoo adhu)
    const longestMins = Math.max(Number(stats?.longestCallDisplay) || 0, longestCall ? Math.floor(longestCall.secs / 60) : 0);

    const renderExpertHistoryItem = (item: any, index: number) => {
        const uniqueKey = item.id ? `${item.id}-${index}-${item.type}` : `log-${index}`;
        let iconName = "swap-horizontal";
        let iconColor = "#94A3B8";
        let amountValue = Number(item.beans) || Number(item.expertEarnings) || 0;
        let titleText = item.giftName || item.title || item.type || 'Transaction';
        
        const itemType = String(item.type || '').toLowerCase();
        const targetUserName = item.callerName || item.senderName || 'User';

        if (itemType === 'video_call') {
            iconName = "video-vintage"; iconColor = DIST_COLORS[0]; 
            titleText = item.callerName ? `Call with ${item.callerName}` : "Call Reward";
        } else if (itemType.includes('gift')) {
            iconName = "gift"; 
            iconColor = itemType === 'live_gift' ? DIST_COLORS[2] : itemType === 'party_gift' ? DIST_COLORS[3] : DIST_COLORS[1]; 
            let baseTitle = itemType === 'live_gift' ? "Broadcast Reward" : itemType === 'party_gift' ? "Forum Reward" : "Private Reward";
            titleText = `${baseTitle} (from ${targetUserName})`;
        } else if (itemType === 'daily_bonus') {
            iconName = "star-shooting"; iconColor = theme.accent;
            titleText = item.giftName || 'Daily Mission Bonus';
        }

        const timeVal = item.timestamp || item.createdAt;
        let displayTime = 'Recent';
        if (timeVal?.toDate) displayTime = timeVal.toDate().toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        else if (timeVal?.seconds) displayTime = new Date(timeVal.seconds * 1000).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

        const itemBorder = index % 2 === 0 ? borderType2 : borderType1;

        return (
            <View key={uniqueKey} style={styles.logCard}>
                <LinearGradient colors={[iconColor + '22', 'rgba(255,255,255,0.02)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                <View style={[styles.logAccent, { backgroundColor: iconColor }]} />
                <LinearGradient colors={[iconColor, iconColor + '77']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.logIconBox}>
                    <MaterialCommunityIcons name={iconName as any} size={18} color="#FFF" />
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: 12, paddingRight: 8, justifyContent: 'center' }}>
                    <Text style={styles.historyTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{titleText}</Text>
                    <Text style={styles.historyDate} numberOfLines={1} adjustsFontSizeToFit>{displayTime}</Text>
                </View>
                <View style={styles.logAmountPill}>
                    <Text style={[styles.logAmountText, { color: '#10B981' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        +{amountValue.toLocaleString()} 🎖️
                    </Text>
                    <Text style={[styles.historyStatus, { color: '#10B981' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                        ACQUIRED
                    </Text>
                </View>
            </View>
        );
    };

    const renderLeaderboardItem = (user: any, index: number) => {
        let rankColor = theme.secondary;
        let rankGradient = [theme.primary + '24', 'rgba(15, 10, 40, 0.55)'];
        let iconName = "medal-outline";
        let isTop3 = false;

        if (index === 0) { rankColor = '#F59E0B'; rankGradient = ['rgba(245, 158, 11, 0.25)', 'rgba(245, 158, 11, 0.05)']; iconName = "crown"; isTop3 = true; }
        else if (index === 1) { rankColor = '#94A3B8'; rankGradient = ['rgba(148, 163, 184, 0.25)', 'rgba(148, 163, 184, 0.05)']; iconName = "crown"; isTop3 = true; }
        else if (index === 2) { rankColor = '#D97706'; rankGradient = ['rgba(217, 119, 6, 0.25)', 'rgba(217, 119, 6, 0.05)']; iconName = "crown"; isTop3 = true; }

        const isMe = user.id === auth.currentUser?.uid;
        const uConfig = getLevelConfig(user.totalBeansEarned || 0);
        const uColor = uConfig.colors[0];

        // 🆕 ================= RANK 4+ : UNIQUE DESIGN =================
        if (!isTop3) {
            const lvlColor = uColor;
            const topScore = Number(leaderboardData[0]?.totalBeansEarned) || 0;
            const myScore = Number(user.totalBeansEarned) || 0;
            const pctOfTop = topScore > 0 ? Math.max(0.04, Math.min(myScore / topScore, 1)) : 0;
            const ringColors = isMe ? [lighten(theme.accent, 0.5), theme.accent] : [lighten(lvlColor, 0.45), lvlColor];

            return (
                <Reveal key={`rank-${user.id}-${index}`} delay={(index - 3) * 70} style={{ marginBottom: 14 }}>
                    <GlowCard
                        colors={(isMe ? [theme.accent, theme.secondary, theme.primary] : [lvlColor + 'CC', lvlColor + '22', theme.accent + '66']) as any}
                        radius={24}
                        glow={isMe ? theme.accent : lvlColor}
                        keepColors
                    >
                        <View style={styles.rankCardInner}>
                            <LinearGradient colors={[lvlColor + '26', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                            <Text style={[styles.rankWatermark, { color: lvlColor }]} pointerEvents="none">{index + 1}</Text>

                            {/* RANK NUMBER (fixed box, perfectly centered) */}
                            <LinearGradient colors={[lvlColor, lvlColor + '66']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rankNumBox}>
                                <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} style={styles.rankNumGloss} pointerEvents="none" />
                                <Text style={styles.rankNumText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{index + 1}</Text>
                            </LinearGradient>

                            {/* AVATAR with level ring */}
                            <View style={styles.rankAvatarWrap}>
                                <LinearGradient colors={ringColors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rankAvatarRing}>
                                    <Image
                                        source={{ uri: user.profilePic || `https://ui-avatars.com/api/?name=${user.name || 'U'}&background=0F172A&color=fff` }}
                                        style={styles.rankAvatarImg}
                                    />
                                </LinearGradient>
                                {isMe && <View style={[styles.rankMeDot, { backgroundColor: theme.accent }]} />}
                            </View>

                            {/* NAME + LEVEL + PROGRESS vs #1 */}
                            <View style={styles.rankInfo}>
                                <Text style={styles.rankName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                                    {user.name || 'Host'}{isMe ? ' (You)' : ''}
                                </Text>
                                <View style={styles.rankLvlRow}>
                                    <View style={[styles.rankLvlChip, { backgroundColor: lvlColor + '30', borderColor: lvlColor + '88' }]}>
                                        <Text style={[styles.rankLvlChipText, { color: lighten(lvlColor, 0.5) }]}>L{uConfig.lvl}</Text>
                                    </View>
                                    <Text style={styles.rankLvlLabel} numberOfLines={1}>{uConfig.label.split(' ')[0]}</Text>
                                </View>
                                <View style={styles.rankTrack}>
                                    <Animated.View
                                        style={{
                                            height: '100%',
                                            borderRadius: 3,
                                            backgroundColor: lvlColor,
                                            width: distAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${pctOfTop * 100}%`] }) as any
                                        }}
                                    />
                                </View>
                            </View>

                            {/* REWARDS */}
                            <View style={styles.rankRewardCol}>
                                <Text style={styles.rankRewardLabel}>REWARDS</Text>
                                <View style={styles.rankRewardPill}>
                                    <Text style={{ fontSize: 12, marginRight: 4 }}>🎖️</Text>
                                    <Text style={styles.rankRewardText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                                        {user.totalBeansEarned?.toLocaleString() || 0}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </GlowCard>
                </Reveal>
            );
        }

        // ================= TOP 3 (fallback list when < 3 users) =================
        const scaleAnim = isTop3 ? shimmerAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.03, 1] }) : 1;
        const translateYAnim = isTop3 ? shimmerAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, -4, 0] }) : 0;
        const glowOpacity = isTop3 ? shimmerAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 0.8, 0.3] }) : 0;

        return (
            <Animated.View
                key={`rank-${user.id}-${index}`}
                style={{
                    marginBottom: 16,
                    transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
                    shadowColor: rankColor,
                    shadowOpacity: glowOpacity,
                    shadowRadius: isTop3 ? 12 : 0,
                    elevation: isTop3 ? 8 : 0,
                }}
            >
                <LinearGradient
                    colors={isMe && !isTop3 ? [theme.accent + '30', theme.accent + '10'] : (rankGradient as any)}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12, 
                        borderRadius: 24,
                        borderWidth: isTop3 || isMe ? 1.5 : 1,
                        borderColor: isTop3 ? rankColor : (isMe ? theme.accent : theme.secondary + '38'),
                        overflow: 'hidden',
                        position: 'relative'
                    }}
                >
                    {isTop3 && (
                        <View style={{ position: 'absolute', right: -20, bottom: -25, opacity: 0.1 }}>
                            <MaterialCommunityIcons name={iconName as any} size={110} color={rankColor} style={{ transform: [{ rotate: '15deg' }] }} />
                        </View>
                    )}

                    {/* 🆕 Rank badge: crown + number ellame ulla-ye center-a (veliya varaathu) */}
                    <View style={{
                        width: 44, height: 44, borderRadius: 22, 
                        backgroundColor: rankColor,
                        justifyContent: 'center', alignItems: 'center',
                        shadowColor: rankColor, shadowOpacity: 0.5, shadowRadius: 6, elevation: 5,
                        marginRight: 10, 
                        flexShrink: 0
                    }}>
                        <MaterialCommunityIcons name={iconName as any} size={16} color="#000" />
                        <Text style={{ color: '#000', fontSize: 13, fontWeight: '900', lineHeight: 15 }}>{index + 1}</Text>
                    </View>

                    <View style={{ position: 'relative', flexShrink: 0 }}>
                        <Image
                            source={{ uri: user.profilePic || `https://ui-avatars.com/api/?name=${user.name || 'U'}&background=0F172A&color=fff` }}
                            style={{
                                width: 48, height: 48, borderRadius: 18, 
                                borderWidth: 2, borderColor: isTop3 ? rankColor : 'rgba(255,255,255,0.15)'
                            }}
                        />
                        {isMe && (
                            <View style={{ position: 'absolute', top: -2, right: -2, backgroundColor: theme.accent, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#020617' }} />
                        )}
                    </View>

                    <View style={{ flex: 1, marginLeft: 12, marginRight: 8, justifyContent: 'center' }}>
                        <Text style={{ color: '#FFF', fontSize: 15, fontWeight: 'bold', letterSpacing: 0.5, lineHeight: 22 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                            {user.name || 'Host'} {isMe && <Text style={{ color: theme.accentText, fontSize: 13 }}> (You)</Text>}
                        </Text>
                        
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2, flexWrap: 'wrap' }}>
                            <View style={{ backgroundColor: uColor + '30', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 6 }}>
                                <Text style={{ color: lighten(uColor, 0.5), fontSize: 11, fontWeight: '900' }}>L{uConfig.lvl}</Text>
                            </View>
                            <Text style={{ color: '#E2E8F0', fontSize: 12, fontWeight: '700' }} numberOfLines={1} adjustsFontSizeToFit>
                                {uConfig.label}
                            </Text>
                        </View>
                    </View>

                    <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontWeight: '900', letterSpacing: 1, marginBottom: 4 }}>REWARDS</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' }}>
                            <Text style={{ fontSize: 12, marginRight: 4 }}>🎖️</Text>
                            <Text style={{ color: '#10B981', fontSize: 14, fontWeight: '900' }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                                {user.totalBeansEarned?.toLocaleString() || 0}
                            </Text>
                        </View>
                    </View>
                </LinearGradient>
            </Animated.View>
        );
    };

    if (loading) return (
        <View style={styles.loaderContainer}>
            <LoaderPulse color={theme.accent} />
            <Text style={[styles.loaderText, { color: theme.accentText }]}>CALIBRATING HUB...</Text>
        </View>
    );

    // 🆕 Distribution data (Reward Breakdown)
    const distItems = [
        { label: 'Call Earnings', value: breakdown.calls, color: DIST_COLORS[0], icon: 'phone-in-talk' },
        { label: 'Call Rewards', value: breakdown.callGifts, color: DIST_COLORS[1], icon: 'gift-outline' },
        { label: 'Broadcast Rewards', value: breakdown.liveGifts, color: DIST_COLORS[2], icon: 'broadcast' },
        { label: 'Forum Rewards', value: breakdown.partyGifts, color: DIST_COLORS[3], icon: 'account-group' },
    ];
    const distTotal = distItems.reduce((s, i) => s + i.value, 0);
    const maxDist = Math.max(...distItems.map(i => i.value));
    const activeSources = distItems.filter(i => i.value > 0).length;

    // 🆕 Donut segments (each reward source = own coloured arc)
    let donutAcc = 0;
    const donutSegments = distItems.map((it) => {
        const frac = distTotal > 0 ? it.value / distTotal : 0;
        const full = frac * DONUT_C;
        const gap = frac > 0 && activeSources > 1 ? 4 : 0;
        const len = Math.max(full - gap, 0);
        const seg = { color: it.color, len, start: donutAcc };
        donutAcc += full;
        return seg;
    });

    // 🆕 Individual reward box (thani thani box) - 4 box-um same size (fixed height + reserved tag slot)
    const renderDistBox = (it: any, idx: number) => {
        const pct = distTotal > 0 ? (it.value / distTotal) * 100 : 0;
        const isTop = distTotal > 0 && it.value > 0 && it.value === maxDist;
        return (
            <GlowCard
                key={`dist-${idx}`}
                style={{ flex: 1, minWidth: 0 }}
                colors={[it.color, it.color + '22', it.color + '77'] as any}
                radius={24}
                glow={it.color}
                shine
                shineDelay={900 + idx * 500}
                keepColors
            >
                <View style={styles.distBox}>
                    <LinearGradient colors={[it.color + '30', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                    <View style={styles.distWatermark} pointerEvents="none">
                        <MaterialCommunityIcons name={it.icon as any} size={80} color={it.color + '14'} />
                    </View>
                    <View style={styles.distBoxTop}>
                        <LinearGradient colors={[it.color, it.color + '88']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.distIconBubble}>
                            <MaterialCommunityIcons name={it.icon as any} size={20} color="#FFF" />
                        </LinearGradient>
                        <View style={[styles.distPctPill, { borderColor: it.color + '88', backgroundColor: it.color + '22' }]}>
                            <Text style={[styles.distPctText, { color: lighten(it.color, 0.55) }]}>{Math.round(pct)}%</Text>
                        </View>
                    </View>
                    <Text style={styles.distBoxLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{it.label}</Text>
                    <Text style={styles.distBoxValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>🎖️ {it.value.toLocaleString()}</Text>
                    <View style={styles.distMiniTrack}>
                        <Animated.View
                            style={{
                                height: '100%',
                                borderRadius: 3,
                                backgroundColor: it.color,
                                width: distAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${pct}%`] }) as any
                            }}
                        />
                    </View>
                    {/* 🆕 tag slot always reserved -> height maaraathu */}
                    <View style={styles.topTagSlot}>
                        {isTop && (
                            <View style={[styles.topTag, { backgroundColor: it.color }]}>
                                <MaterialCommunityIcons name="crown" size={10} color="#0B1026" />
                                <Text style={styles.topTagText}>TOP SOURCE</Text>
                            </View>
                        )}
                    </View>
                </View>
            </GlowCard>
        );
    };

    // 🆕 tabs: padding 6 each side -> (tabW - 12) / 3
    const tabSegW = tabW > 0 ? (tabW - 12) / 3 : 0;

    return (
        <CardCtx.Provider value={theme.cardBg}>
        <BorderCtx.Provider value={borderMix}>
        <View style={{ flex: 1, backgroundColor: ROYAL.bg0 }}>
            <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />
            <Animated.View style={[styles.shimmerOrb, { top: 120, right: -60, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 450, left: -90, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 780, right: -80, backgroundColor: theme.accent, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 1100, left: -100, backgroundColor: theme.tier, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

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

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom: 150}}>
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    
                    {/* 🏆 PREMIUM ROYAL HERO (🆕 gentle 3D tilt) */}
                    <Animated.View style={[styles.eliteHeroWrapper, { shadowColor: theme.accent, transform: [{ perspective: 1100 }, { rotateY: heroTiltY }, { rotateX: heroTiltX }] }]}>
                        <View style={styles.heroFrame}>
                            <Animated.View style={[styles.heroFrameSpin, { transform: [{ rotate: spin }] }]} pointerEvents="none">
                                <LinearGradient
                                    colors={(isLevel0
                                        ? [theme.primary, theme.accent, theme.primary, theme.accent, theme.primary, theme.accent, theme.primary, theme.accent, theme.primary, theme.accent, theme.primary]
                                        : [theme.primary, theme.accent, theme.primary, theme.accent, theme.primary, theme.accent, theme.primary, theme.accent, theme.primary, theme.accent, theme.primary]) as any}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                />
                            </Animated.View>

                            {/* 🆕 Hero background = level colour tint, DARK SHADE konjam adhigam (heroDarkA / heroDarkB, base darker) */}
                            <LinearGradient colors={[heroDarkA + 'DD', blend('#0A0524', theme.heroA, 0.16), heroDarkB + 'DD', blend('#0A0524', theme.heroB, 0.16)] as any} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.eliteHeroCard}>
                                <View style={styles.cyberCircle} />
                                <View style={styles.cyberCircleSmall} />
                                <LinearGradient colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0)']} style={styles.heroSheen} pointerEvents="none" />

                                {/* royal sparkles */}
                                <RoyalSparkle x={width * 0.5} y={70} size={13} color={theme.accent} delay={0} />
                                <RoyalSparkle x={width * 0.72} y={150} size={10} color={theme.primary} delay={600} />
                                <RoyalSparkle x={24} y={190} size={11} color={theme.secondary} delay={1100} />
                                <RoyalSparkle x={width * 0.3} y={250} size={9} color={theme.tier} delay={1500} />

                                {/* shine sweep */}
                                <Animated.View pointerEvents="none" style={[styles.heroSweep, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
                                    <LinearGradient colors={['transparent', 'rgba(255,255,255,0.18)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                                </Animated.View>

                                <View style={styles.heroHeaderRow}>
                                    {/* 🆕 DOUBLE COLOUR BORDER: theme primary + accent (L0 = pink + blue) */}
                                    <LinearGradient colors={[theme.primary, theme.accent, theme.primary] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 14, padding: 1.8 }}>
                                        <View style={[styles.systemStatusBox, { borderWidth: 0, borderRadius: 12, backgroundColor: '#0A0524' }]}>
                                            <View style={styles.pulseDotWrap}>
                                                <Animated.View style={[styles.pulseDotRing, { opacity: dotOpacity, transform: [{ scale: dotScale }] }]} />
                                                <View style={styles.pulseDot} />
                                            </View>
                                            <Text style={styles.systemStatusText}>ANALYTICS ACTIVE</Text>
                                        </View>
                                    </LinearGradient>
                                    <View style={[styles.statusTag, { backgroundColor: 'rgba(20,12,60,0.35)', borderWidth: 1, borderColor: theme.tier + '99' }, mixBorderStyle]}>
                                        <MaterialCommunityIcons name="star-circle" size={14} color={theme.tierText} />
                                        <Text style={[styles.statusTagText, { color: theme.tierText }]}>{config.label}</Text>
                                    </View>
                                </View>

                                {/* 🆕 ROYAL IDENTITY ROW */}
                                <View style={[styles.identityRow, { borderColor: theme.accent + '55' }, mixBorderStyle]}>
                                    <Animated.View style={{ transform: [{ scale: crestScale }] }}>
                                        <LinearGradient colors={[lighten(theme.accent, 0.5), theme.accent, theme.deep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.identityRing}>
                                            <Image
                                                source={{ uri: stats?.profilePic || expertData?.profilePic || `https://ui-avatars.com/api/?name=${stats?.name || expertData?.name || 'U'}&background=0F172A&color=fff` }}
                                                style={styles.identityAvatar}
                                            />
                                        </LinearGradient>
                                        <View style={styles.identityCrown}>
                                            <MaterialCommunityIcons name="crown" size={16} color={theme.accentText} />
                                        </View>
                                    </Animated.View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.identityName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{stats?.name || expertData?.name || 'Royal Host'}</Text>
                                        <View style={styles.identityStatusRow}>
                                            <MaterialCommunityIcons name={stats?.isVerified === true ? 'check-decagram' : 'clock-outline'} size={13} color={stats?.statusColor || ROYAL.amber} />
                                            <Text style={[styles.identityStatusText, { color: stats?.statusColor || ROYAL.amber }]} numberOfLines={1}>{stats?.statusLabel}</Text>
                                        </View>
                                    </View>
                                </View>

                                <View style={styles.heroMainRow}>
                                    <View style={{ flex: 1, paddingRight: 6 }}>
                                        <Text style={styles.revenueTitle}>GLOBAL STREAM</Text>
                                        <View style={styles.revenueNumberContainer}>
                                            <Text style={[styles.revenueSymbol, { color: theme.accentText }]}>🎖️</Text>
                                            {/* 🆕 Big glow remove -> chinna dark shadow mattum (letters sharp) */}
                                            <Text style={[styles.revenueMainValue, { color: theme.light, textShadowColor: 'rgba(0,0,0,0.5)' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>{heroCount.toLocaleString()}</Text>
                                        </View>
                                        <Text style={[styles.revenueMainUnit, { color: theme.accentText }]}>REWARDS</Text>
                                    </View>
                                    <View style={styles.heroTrophyBox}>
                                        <Animated.View style={[styles.heroTrophyGlow, { backgroundColor: theme.accent, opacity: trophyGlow }]} />
                                        <OrbitRing size={104} color={theme.accentText} spin={spin} />
                                        <FloatBox amp={7} dur={1700}>
                                            <Img3D uri={IMG.trophy} size={96} fallback="trophy-award" color={theme.accent} />
                                        </FloatBox>
                                        <Animated.View style={[styles.heroTrophyShadow, { backgroundColor: theme.accent, transform: [{ scaleX: trophyShadowScale }] }]} />
                                    </View>
                                </View>

                                {/* 🆕 LEVEL PROGRESS v3: clear wording -> % COMPLETED + % LEFT + rewards needed for next level */}
                                <View style={styles.levelBarWrap}>
                                    <View style={styles.levelBarHeader}>
                                        <View>
                                            <View style={[styles.levelChip, { borderColor: theme.accent + '88' }, mixBorderStyle]}>
                                                <MaterialCommunityIcons name="shield-star" size={13} color={theme.accentText} />
                                                <Text style={styles.levelChipText}>LEVEL {config.lvl}</Text>
                                            </View>
                                            <Text style={[styles.levelNextText, { color: theme.accentText }]}>
                                                {config.next > 0 ? `NEXT: LEVEL ${config.lvl + 1}` : 'HIGHEST LEVEL'}
                                            </Text>
                                        </View>
                                        <View style={styles.levelPctBox}>
                                            <Text style={[styles.levelPctBig, { color: theme.light }]}>{levelPctDisplay}%</Text>
                                            <Text style={[styles.levelPctSub, { color: theme.accentText }]}>{config.next > 0 ? 'COMPLETED' : 'MAX LEVEL'}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.levelBarTrack}>
                                        <Animated.View style={[styles.levelBarFillWrap, { width: levelBarWidth }]}>
                                            <LinearGradient colors={[theme.primary, theme.secondary, theme.accent] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                                            <View style={styles.levelBarCap} />
                                        </Animated.View>
                                        <View style={[styles.levelBarTick, { left: '25%' }]} pointerEvents="none" />
                                        <View style={[styles.levelBarTick, { left: '50%' }]} pointerEvents="none" />
                                        <View style={[styles.levelBarTick, { left: '75%' }]} pointerEvents="none" />
                                    </View>
                                    {config.next > 0 && (
                                        <View style={styles.levelBarFooter}>
                                            <Text style={styles.levelBarFooterText}>🎖️ {totalBeansEarned.toLocaleString()}</Text>
                                            <Text style={styles.levelBarFooterText}>GOAL {config.next.toLocaleString()}</Text>
                                        </View>
                                    )}
                                    {config.next > 0 ? (
                                        <View style={[styles.levelNeedChip, { borderColor: theme.accent + '66', backgroundColor: theme.accent + '22' }, mixBorderStyle]}>
                                            <MaterialCommunityIcons name="flag-checkered" size={15} color={theme.accentText} />
                                            <Text style={styles.levelNeedText} numberOfLines={2}>
                                                <Text style={{ color: theme.light, fontWeight: '900' }}>{levelRemainPct}% LEFT</Text>
                                                {`  •  🎖️ ${levelRemainBeans.toLocaleString()} more rewards to reach LEVEL ${config.lvl + 1}`}
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={[styles.levelNeedChip, { borderColor: GOLD + '88', backgroundColor: GOLD + '22' }]}>
                                            <MaterialCommunityIcons name="crown" size={15} color={GOLD} />
                                            <Text style={styles.levelNeedText} numberOfLines={2}>
                                                <Text style={{ color: ROYAL.goldLight, fontWeight: '900' }}>100% COMPLETED</Text>
                                                {'  •  You have reached the highest level'}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                {/* 🆕 Stat chips: text overflow fix (label shrink-to-fit, value 2 lines) */}
                                <View style={styles.heroSummaryGrid}>
                                    <BlurView intensity={20} tint="dark" style={[styles.summaryChip, mixBorderStyle]}>
                                        <View style={styles.summaryTopRow}>
                                            <View style={[styles.summaryIconBubble, { backgroundColor: lighten(theme.primary, 0.4) + '30' }]}>
                                                <MaterialCommunityIcons name="phone-in-talk" size={12} color={lighten(theme.primary, 0.4)} />
                                            </View>
                                            <Text style={styles.summaryLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>LAST INTERACTION</Text>
                                        </View>
                                        <Text style={styles.summaryValue} numberOfLines={2} ellipsizeMode="tail">{stats?.lastCaller}</Text>
                                    </BlurView>
                                    <BlurView intensity={20} tint="dark" style={[styles.summaryChip, mixBorderStyle]}>
                                        <View style={styles.summaryTopRow}>
                                            <View style={[styles.summaryIconBubble, { backgroundColor: theme.accentText + '30' }]}>
                                                <MaterialCommunityIcons name="crown" size={12} color={theme.accentText} />
                                            </View>
                                            <Text style={styles.summaryLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>KEY USER</Text>
                                        </View>
                                        {/* 🆕 Name mela */}
                                        <Text style={styles.summaryValue} numberOfLines={1} ellipsizeMode="tail">{stats?.topFanName}</Text>
                                        {/* 🆕 Diamond value kila */}
                                        {stats?.hasKeyUser && (
                                            <View style={styles.summaryDiamondRow}>
                                                <Text style={styles.summaryDiamondEmoji}>💎</Text>
                                                <Text style={[styles.summaryDiamondText, { color: theme.light }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
                                                    {Number(stats?.topFanAmount || 0).toLocaleString()}
                                                </Text>
                                            </View>
                                        )}
                                    </BlurView>
                                </View>
                            </LinearGradient>
                        </View>
                    </Animated.View>

                    {/* 🎚 3D SLIDING TABS v2 (icon circle + label, thick glowing pill - line maadhiri illa) */}
                    <View style={[styles.tabsRow, { borderColor: theme.accent + '55', shadowColor: theme.accent }, mixBorderStyle]} onLayout={(e) => setTabW(e.nativeEvent.layout.width)}>
                        {tabSegW > 0 && (
                            <Animated.View
                                style={[
                                    styles.tabPill,
                                    {
                                        width: tabSegW,
                                        borderColor: theme.accent,
                                        shadowColor: theme.accent,
                                        transform: [{ translateX: tabSlide.interpolate({ inputRange: [0, 1, 2], outputRange: [0, tabSegW, tabSegW * 2] }) }]
                                    },
                                    mixBorderStyle
                                ]}
                            >
                                <LinearGradient colors={[theme.primary + 'CC', theme.accent + '66']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                                <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']} style={styles.tabPillGloss} pointerEvents="none" />
                                <View style={[styles.tabPillEdge, { backgroundColor: theme.light }]} pointerEvents="none" />
                            </Animated.View>
                        )}
                        {TAB_KEYS.map((key, idx) => {
                            const isActiveTab = mainTab === key;
                            return (
                                <TouchableOpacity key={key} style={styles.tabBtn} onPress={() => setMainTab(key)} activeOpacity={0.8}>
                                    <TabIcon name={TAB_ICONS[idx]} active={isActiveTab} color={isActiveTab ? '#FFF' : '#E2E8F0'} activeColor={theme.light} />
                                    <Text style={[styles.tabText, isActiveTab && styles.tabTextActive, isActiveTab && { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit>{TAB_LABELS[idx]}</Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    <Animated.View
                        style={[
                            styles.menuBox,
                            {
                                opacity: tabAnim,
                                transform: [{ translateY: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }]
                            }
                        ]}
                    >
                        
                        {mainTab === 'STATS' && (
                            <View>
                                <SectionTitle title="PERFORMANCE MATRIX" icon="chart-box" color={theme.primary} />
                                <View style={styles.matrixGrid}>
                                    <View style={styles.matrixRow}>
                                        <MatrixBox icon="time-outline" label="Today Session" value={`${finalTodayMins}m`} color={theme.primary} borderStyle={borderType2} delay={0} img={IMG.clock} imgFallback="clock-outline" />
                                        <MatrixBox icon="people-outline" label="Today Calls" value={finalTodayCalls} color={theme.secondary} borderStyle={borderType1} delay={80} img={IMG.phone} imgFallback="phone-in-talk" />
                                    </View>
                                    <View style={styles.matrixRow}>
                                        <MatrixBox icon="stats-chart-outline" label="Total Time" value={`${stats?.displayMins}m`} color={theme.accent} borderStyle={borderType1} delay={160} img={IMG.hourglass} imgFallback="timer-sand" />
                                        <MatrixBox icon="cash-outline" label="Redeemed" value={`₹${stats?.totalWithdrawn}`} color={theme.tier} borderStyle={borderType2} delay={240} img={IMG.wallet} imgFallback="wallet" />
                                    </View>
                                </View>

                                {/* 🆕 REWARD BREAKDOWN v2: donut summary box + 4 thani thani source boxes */}
                                <Reveal delay={120}>
                                <SectionTitle title="REWARD BREAKDOWN" icon="chart-donut" color={theme.secondary} />
                                <GlowCard colors={['#22D3EE', '#F59E0B', '#FF5C9E', '#34D399'] as any} radius={28} shine shineDelay={400} keepColors>
                                    <View style={styles.distCard}>
                                        <LinearGradient colors={[theme.primary + '24', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                        <View style={styles.donutRow}>
                                            <View style={styles.donutBox}>
                                                <Animated.View
                                                    style={{
                                                        opacity: distAnim,
                                                        transform: [
                                                            { rotate: distAnim.interpolate({ inputRange: [0, 1], outputRange: ['-140deg', '0deg'] }) },
                                                            { scale: distAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }
                                                        ]
                                                    }}
                                                >
                                                    <Svg width={DONUT_SIZE} height={DONUT_SIZE} style={{ transform: [{ rotate: '-90deg' }] }}>
                                                        <Circle cx={DONUT_SIZE / 2} cy={DONUT_SIZE / 2} r={DONUT_R} stroke="rgba(255,255,255,0.07)" strokeWidth={DONUT_STROKE} fill="transparent" />
                                                        {distTotal > 0 && donutSegments.map((seg, i) => seg.len > 0 ? (
                                                            <Circle
                                                                key={`seg-${i}`}
                                                                cx={DONUT_SIZE / 2}
                                                                cy={DONUT_SIZE / 2}
                                                                r={DONUT_R}
                                                                stroke={seg.color}
                                                                strokeWidth={DONUT_STROKE}
                                                                fill="transparent"
                                                                strokeDasharray={`${seg.len} ${DONUT_C - seg.len}`}
                                                                strokeDashoffset={-seg.start}
                                                                strokeLinecap="butt"
                                                            />
                                                        ) : null)}
                                                    </Svg>
                                                </Animated.View>
                                                <View style={styles.donutCenter} pointerEvents="none">
                                                    <Text style={styles.donutCenterEmoji}>🎖️</Text>
                                                    <Text style={styles.donutCenterLabel}>TOTAL</Text>
                                                </View>
                                            </View>
                                            <View style={styles.donutInfo}>
                                                <Text style={styles.donutInfoLabel}>TOTAL BREAKDOWN</Text>
                                                <Text style={[styles.donutInfoValue, { color: theme.light }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>🎖️ {distTotal.toLocaleString()}</Text>
                                                <View style={styles.donutChip}>
                                                    <Text style={styles.donutChipText}>{activeSources} / 4 ACTIVE SOURCES</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </GlowCard>

                                <View style={styles.distGrid}>
                                    <View style={styles.distRow}>
                                        {renderDistBox(distItems[0], 0)}
                                        {renderDistBox(distItems[1], 1)}
                                    </View>
                                    <View style={styles.distRow}>
                                        {renderDistBox(distItems[2], 2)}
                                        {renderDistBox(distItems[3], 3)}
                                    </View>
                                </View>
                                </Reveal>

                                {/* 🎁 LIFETIME GIFT REWARDS */}
                                <Reveal delay={200}>
                                <View style={styles.dailyFlowContainer}>
                                    <GlowCard colors={[theme.accent, theme.secondary, theme.primary] as any} radius={30} glow={theme.accent} shine shineDelay={1200}>
                                        <View style={styles.dailyFlowPill}>
                                            <LinearGradient colors={[theme.accent + '38', theme.accent + '0D', 'transparent']} start={{x:0, y:0}} end={{x:1, y:1}} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                            <RoyalSparkle x={74} y={10} size={9} color={theme.light} delay={300} />
                                            <RoyalSparkle x={20} y={58} size={8} color={theme.secondary} delay={900} />
                                            <View style={styles.flowImgBox}>
                                                <View style={[styles.flowIconGlow, { backgroundColor: theme.accent }]} />
                                                <OrbitRing size={64} color={theme.accentText} spin={spin} />
                                                <FloatBox amp={5} dur={1500}>
                                                    <Img3D uri={IMG.gift} size={62} fallback="gift-outline" color={theme.accent} />
                                                </FloatBox>
                                            </View>
                                            <View style={styles.flowTextContainer}>
                                                <Text style={styles.flowLabel} numberOfLines={1} adjustsFontSizeToFit>LIFETIME GIFT REWARDS</Text>
                                            </View>
                                            <View style={styles.flowValueNode}>
                                                <View style={[styles.flowValueGlow, { backgroundColor: theme.accent }]} />
                                                <View style={[styles.flowValueBox, { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: theme.accent + '80' }, mixBorderStyle]}>
                                                    <Text style={[styles.flowBeanSymbol, {color: theme.accentText, marginRight: 4}]}>🎖️</Text>
                                                    <Text style={[styles.flowValText, { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
                                                        {(breakdown.totalDeepGifts > 0 ? breakdown.totalDeepGifts : Math.floor((Number(stats?.totalDiamondsReceived) || 0) / 2)).toLocaleString()}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                    </GlowCard>
                                </View>
                                </Reveal>

                                <Reveal delay={260}>
                                <SectionTitle title="MISSION: DAILY GOAL" icon="flag-checkered" color={missionColor} />
                                <GlowCard
                                    colors={(isCompleted ? ['#10B981', '#34D399', '#22D3EE'] : [currentMilestone.color, currentMilestone.color2, theme.accent]) as any}
                                    radius={34}
                                    glow={missionColor}
                                    shine
                                    shineDelay={1800}
                                >
                                    <View style={styles.massChallengeCard}>
                                        <LinearGradient colors={['rgba(15, 10, 40, 0.9)', 'rgba(5, 3, 15, 1)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                        <LinearGradient colors={[missionColor + '22', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                        <View style={styles.massChallengeHeader}>
                                            <View style={styles.massHeaderLeft}>
                                                <View style={styles.missionImgBox}>
                                                    <FloatBox amp={4} dur={1400}>
                                                        {isCompleted
                                                            ? <Img3D uri={IMG.medal} size={50} fallback="check-decagram" color="#10B981" />
                                                            : <Img3D uri={IMG.rocket} size={50} fallback="rocket-launch" color={missionColor} />}
                                                    </FloatBox>
                                                </View>
                                                <View style={styles.missionTextGroup}>
                                                    <Text style={[styles.missionMainTitle, { color: isCompleted ? '#10B981' : '#FFF' }]}>
                                                        {currentMilestone.label} MISSION
                                                    </Text>
                                                    <Text style={styles.missionSubText}>Reach {currentMilestone.target.toLocaleString()} Rewards to unlock</Text>
                                                </View>
                                            </View>
                                            <View style={[styles.bountyBox, { backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.15)' : missionColor + '20', borderColor: missionColor }, !isCompleted && mixBorderStyle]}>
                                                <Text style={styles.bountyLabel}>REWARDS</Text>
                                                <Text style={[styles.bountyValue, { color: isCompleted ? missionColor : lighten(missionColor, 0.55) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>+{currentMilestone.bonus.toLocaleString()}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.holoTabContainer}>
                                            {milestones.map((m, index) => {
                                                const isTabActive = activeTab === index;
                                                const tabDone = (finalTodayBeans || 0) >= m.target;
                                                return (
                                                    <TouchableOpacity 
                                                        key={index} 
                                                        onPress={() => setActiveTab(index)} 
                                                        style={[
                                                            styles.holoTab, 
                                                            isTabActive && { backgroundColor: m.color + '30', borderColor: m.color },
                                                            isTabActive && mixBorderStyle
                                                        ]}
                                                        activeOpacity={0.7}
                                                    >
                                                        {isTabActive && <View style={[styles.holoTabGlow, { backgroundColor: m.color }]} />}
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                            {tabDone && <MaterialCommunityIcons name="check-decagram" size={12} color={ROYAL.emerald} />}
                                                            <Text style={[styles.holoTabText, { color: isTabActive ? '#FFF' : lighten(m.color, 0.55) }]} numberOfLines={1} adjustsFontSizeToFit>{m.label}</Text>
                                                        </View>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        <View style={styles.quantumProgressContainer}>
                                            <View style={styles.missionRingBox}>
                                                <Svg width={MISSION_RING} height={MISSION_RING} style={{ transform: [{ rotate: '-90deg' }] }}>
                                                    <Defs>
                                                        <SvgLinearGradient id="missionGrad" x1="0" y1="0" x2="1" y2="1">
                                                            <Stop offset="0" stopColor={missionColor} />
                                                            <Stop offset="1" stopColor={missionColor2} />
                                                        </SvgLinearGradient>
                                                    </Defs>
                                                    <Circle cx={MISSION_RING / 2} cy={MISSION_RING / 2} r={MISSION_R} stroke="rgba(255,255,255,0.08)" strokeWidth={MISSION_STROKE} fill="transparent" />
                                                    <AnimatedCircle
                                                        cx={MISSION_RING / 2}
                                                        cy={MISSION_RING / 2}
                                                        r={MISSION_R}
                                                        stroke="url(#missionGrad)"
                                                        strokeWidth={MISSION_STROKE}
                                                        fill="transparent"
                                                        strokeDasharray={MISSION_C}
                                                        strokeDashoffset={missionAnim.interpolate({ inputRange: [0, 1], outputRange: [MISSION_C, 0] }) as any}
                                                        strokeLinecap="round"
                                                    />
                                                </Svg>
                                                <View style={styles.missionRingCenter} pointerEvents="none">
                                                    <Text style={[styles.quantumProgressPct, { color: isCompleted ? '#10B981' : '#FFF' }]}>{Math.round(progress * 100)}%</Text>
                                                    <Text style={styles.missionRingSub}>SYNC</Text>
                                                </View>
                                            </View>
                                            <View style={{ flex: 1, marginLeft: 16, minWidth: 0 }}>
                                                <Text style={styles.quantumProgressLabel}>CORE STATUS</Text>
                                                <Text style={styles.quantumCollected} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{(finalTodayBeans || 0).toLocaleString()} / {currentMilestone.target.toLocaleString()}</Text>
                                                {/* 🆕 REWARDS REMAINING: full-a theriyum (number thani line, label keela) */}
                                                <View style={[styles.remainChip, isCompleted && { borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.12)' }]}>
                                                    {isCompleted ? (
                                                        <Text style={[styles.quantumRemaining, { color: '#10B981' }]} numberOfLines={2}>TRANSMISSION COMPLETE</Text>
                                                    ) : (
                                                        <>
                                                            <Text style={styles.remainValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                                                                {(currentMilestone.target - (finalTodayBeans || 0)).toLocaleString()}
                                                            </Text>
                                                            <Text style={styles.remainLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>REWARDS REMAINING</Text>
                                                        </>
                                                    )}
                                                </View>
                                            </View>
                                        </View>
                                    </View>
                                </GlowCard>
                                </Reveal>

                                <Reveal delay={320}>
                                <SectionTitle title="VIP INSIGHTS" icon="shield-star" color={theme.accent} />
                                <GlowCard colors={[theme.accent, theme.secondary, theme.primary] as any} radius={30} glow={theme.accent} shine shineDelay={2400}>
                                    <View style={styles.insightPremiumCard}>
                                        <LinearGradient colors={['rgba(30, 20, 60, 0.4)', 'rgba(5, 3, 15, 0.9)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                        <RoyalSparkle x={60} y={8} size={9} color={theme.light} delay={200} />
                                        <RoyalSparkle x={width - 110} y={52} size={8} color={theme.secondary} delay={800} />
                                        <View style={styles.insightTopRow}>
                                            <View style={styles.insightImgBox}>
                                                <View style={[styles.insightGlow, { backgroundColor: theme.accent }]} />
                                                <OrbitRing size={64} color={theme.accentText} spin={spin} />
                                                <FloatBox amp={5} dur={1600}>
                                                    <Img3D uri={IMG.trophy} size={58} fallback="trophy-variant" color={theme.accent} />
                                                </FloatBox>
                                            </View>
                                            <View style={{flex: 1, marginLeft: 15}}>
                                                <Text style={[styles.insightTopTitle, { color: theme.accentText }]}>TOP LOYALTY RECORD</Text>
                                                <Text style={styles.insightDescription}>Maximum focus: <Text style={{color: '#FFF', fontWeight: '900'}}>{longestMins} minutes</Text> single session.</Text>
                                            </View>
                                            <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                                        </View>

                                        {/* 🆕 Yaar kooda pesunaanga: photo + name */}
                                        {longestCall && (
                                            <View style={[styles.insightPartnerRow, { borderColor: theme.accent + '55' }, mixBorderStyle]}>
                                                <LinearGradient colors={[lighten(theme.accent, 0.5), theme.accent, theme.deep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.insightPartnerRing}>
                                                    <Image
                                                        source={{ uri: longestCall.pic || `https://ui-avatars.com/api/?name=${longestCall.name || 'U'}&background=0F172A&color=fff` }}
                                                        style={styles.insightPartnerImg}
                                                    />
                                                </LinearGradient>
                                                <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                                                    <Text style={styles.insightPartnerLabel} numberOfLines={1}>LONGEST SESSION WITH</Text>
                                                    <Text style={styles.insightPartnerName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{longestCall.name}</Text>
                                                </View>
                                                <View style={[styles.insightPartnerPill, { backgroundColor: theme.accent + '38', borderColor: theme.accent + '99' }, mixBorderStyle]}>
                                                    <MaterialCommunityIcons name="timer-outline" size={13} color={theme.accentText} />
                                                    <Text style={[styles.insightPartnerPillText, { color: theme.light }]}>{Math.floor(longestCall.secs / 60)}m</Text>
                                                </View>
                                            </View>
                                        )}
                                    </View>
                                </GlowCard>
                                </Reveal>
                            </View>
                        )}

                        {mainTab === 'MONTHLY' && (
                            <View>
                                <Reveal>
                                <View style={styles.lifetimeHeader}>
                                    <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                                        <OrbitRing size={100} color={theme.accentText} spin={spin} />
                                        <FloatBox amp={6} dur={1700}>
                                            <Img3D uri={IMG.money} size={70} fallback="cash-multiple" color={theme.accent} />
                                        </FloatBox>
                                    </View>
                                    <Text style={[styles.totalTalkLabel, { color: theme.accentText, marginBottom: 5, marginTop: 8 }]}>LIFETIME REWARDS ACCUMULATED</Text>
                                    <Text style={{color: theme.light, fontSize: 34, fontWeight: '900', letterSpacing: -1, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 }}} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
                                        {stats?.totalBeansEarned?.toLocaleString() || 0} 🎖️
                                    </Text>
                                </View>
                                </Reveal>

                                {historyLoading ? (
                                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                        <ActivityIndicator size="large" color={theme.accent} />
                                        <Text style={{ color: theme.accentText, marginTop: 15, fontSize: 11, fontWeight: '900', letterSpacing: 2 }}>DECRYPTING ARCHIVES...</Text>
                                    </View>
                                ) : yearlyEarnings.length > 0 ? yearlyEarnings.map((y, yIdx) => {
                                    const isYearExpanded = expandedYear === y.year;
                                    const yColor = MONTH_COLORS[yIdx % MONTH_COLORS.length];

                                    return (
                                        <Reveal key={`year-group-${yIdx}`} delay={yIdx * 90} style={{ marginBottom: 16 }}>
                                            <Press3D onPress={() => setExpandedYear(isYearExpanded ? null : y.year)}>
                                                <GlowCard
                                                    colors={(isYearExpanded ? [theme.accent, yColor, theme.secondary] : [yColor, theme.accent + 'AA', yColor + '55']) as any}
                                                    radius={26}
                                                    style={{ marginBottom: isYearExpanded ? 14 : 0 }}
                                                >
                                                    <View style={styles.yearCard}>
                                                        <LinearGradient colors={[yColor + (isYearExpanded ? '30' : '14'), 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                                        <LinearGradient colors={[yColor, theme.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.yearIconBox}>
                                                            <LinearGradient colors={['rgba(255,255,255,0.5)', 'rgba(255,255,255,0)']} style={styles.matrixIconGloss} pointerEvents="none" />
                                                            <MaterialCommunityIcons name="calendar-multiselect" size={24} color="#FFF" />
                                                        </LinearGradient>
                                                        <View style={{ flex: 1, marginLeft: 15 }}>
                                                            <Text style={styles.yearTitle} numberOfLines={1} adjustsFontSizeToFit>{y.year}</Text>
                                                            <Text style={styles.historyDate} numberOfLines={1} adjustsFontSizeToFit>{y.months.length} Months Active</Text>
                                                        </View>
                                                        <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 10, flexShrink: 1 }}>
                                                            <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
                                                                <Text style={[styles.historyAmount, { color: '#10B981' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>+{y.total.toLocaleString()} 🎖️</Text>
                                                                <Text style={[styles.historyStatus, { color: '#10B981' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>YEAR TOTAL</Text>
                                                            </View>
                                                            <Ionicons name={isYearExpanded ? "chevron-up" : "chevron-down"} size={20} color={theme.accentText} style={{marginLeft: 5}} />
                                                        </View>
                                                    </View>
                                                </GlowCard>
                                            </Press3D>

                                            {isYearExpanded && (
                                                <View style={styles.timelineWrap}>
                                                    <View style={[styles.timelineLine, { backgroundColor: yColor + '55' }]} />
                                                    {y.months.map((m, mIdx) => {
                                                        const monthUniqueKey = `${y.year}-${m.month}`;
                                                        const isMonthExpanded = expandedMonth === monthUniqueKey;
                                                        const mColor = MONTH_COLORS[(mIdx + yIdx) % MONTH_COLORS.length];

                                                        return (
                                                            <View key={`month-group-${mIdx}`} style={{ marginBottom: 10 }}>
                                                                <View style={[styles.timelineDot, { backgroundColor: isMonthExpanded ? theme.accent : mColor, shadowColor: mColor }]} />
                                                                <Press3D onPress={() => setExpandedMonth(isMonthExpanded ? null : monthUniqueKey)}>
                                                                    <GlowCard
                                                                        colors={(isMonthExpanded ? [theme.accent, mColor] : [mColor + 'AA', mColor + '33']) as any}
                                                                        radius={22}
                                                                        style={{ marginBottom: isMonthExpanded ? 10 : 0 }}
                                                                    >
                                                                        <View style={styles.monthCard}>
                                                                            <LinearGradient colors={[mColor + (isMonthExpanded ? '30' : '14'), 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                                                            <LinearGradient colors={[mColor, mColor + '99']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.monthIconBox}>
                                                                                <MaterialCommunityIcons name="calendar-month" size={18} color="#FFF" />
                                                                            </LinearGradient>
                                                                            <View style={{ flex: 1, marginLeft: 14 }}>
                                                                                <Text style={styles.historyTitle} numberOfLines={1} adjustsFontSizeToFit>{m.month} {y.year}</Text>
                                                                                <Text style={styles.historyDate} numberOfLines={1} adjustsFontSizeToFit>{m.logs.length} Transactions</Text>
                                                                            </View>
                                                                            <View style={{ alignItems: 'flex-end', flexDirection: 'row', gap: 10, flexShrink: 1 }}>
                                                                                <View style={{ alignItems: 'flex-end', flexShrink: 1 }}>
                                                                                    <Text style={[styles.historyAmount, { color: '#10B981', fontSize: 14 }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>+{m.total.toLocaleString()} 🎖️</Text>
                                                                                </View>
                                                                                <Ionicons name={isMonthExpanded ? "chevron-up" : "chevron-down"} size={18} color={lighten(mColor, 0.45)} style={{marginLeft: 5}} />
                                                                            </View>
                                                                        </View>
                                                                    </GlowCard>
                                                                </Press3D>

                                                                {isMonthExpanded && (
                                                                    <View style={{ paddingLeft: 6, paddingRight: 2 }}>
                                                                        {m.logs.map((log, logIdx) => renderExpertHistoryItem(log, logIdx))}
                                                                    </View>
                                                                )}
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            )}
                                        </Reveal>
                                    );
                                }) : (
                                    <View style={styles.emptyBox}>
                                        <MaterialCommunityIcons name="calendar-blank" size={48} color="rgba(255,255,255,0.3)" />
                                        <Text style={styles.emptyText}>No monthly earnings recorded yet.</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        {mainTab === 'LEADERBOARD' && (
                            <View style={{ marginTop: 10 }}>
                                <View style={{ alignItems: 'center', marginBottom: 20 }}>
                                    <View>
                                        <OrbitRing size={104} color={theme.accentText} spin={spin} style={{ left: -20, top: 2 }} />
                                        <FloatBox amp={6} dur={1600}>
                                            <Img3D uri={IMG.trophy} size={64} fallback="trophy" color={theme.accent} />
                                        </FloatBox>
                                        <RoyalSparkle x={-14} y={6} size={12} color={theme.accent} delay={0} />
                                        <RoyalSparkle x={62} y={0} size={10} color={theme.primary} delay={500} />
                                        <RoyalSparkle x={58} y={48} size={11} color={theme.secondary} delay={1000} />
                                    </View>
                                    <Text style={[styles.totalTalkLabel, { color: theme.accentText, marginBottom: 5, marginTop: 8 }]}>GLOBAL TOP PERFORMERS (LIFETIME)</Text>
                                    <Text style={{color: theme.light, fontSize: 24, fontWeight: '900', letterSpacing: -0.5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 }}}>LEADERBOARD</Text>
                                </View>
                                
                                {isLeaderboardLoading ? (
                                    <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                                        <ActivityIndicator size="large" color={theme.accent} />
                                        <Text style={{ color: theme.accentText, marginTop: 15, fontSize: 11, fontWeight: '900', letterSpacing: 2 }}>SYNCING RANKS...</Text>
                                    </View>
                                ) : leaderboardData.length >= 3 ? (
                                    <View>
                                        {/* 🏆 PODIUM (top 3) */}
                                        <View style={styles.podiumRow}>
                                            <PodiumCol user={leaderboardData[1]} pos={1} isMe={leaderboardData[1].id === auth.currentUser?.uid} theme={theme} delay={150} />
                                            <PodiumCol user={leaderboardData[0]} pos={0} isMe={leaderboardData[0].id === auth.currentUser?.uid} theme={theme} delay={0} />
                                            <PodiumCol user={leaderboardData[2]} pos={2} isMe={leaderboardData[2].id === auth.currentUser?.uid} theme={theme} delay={300} />
                                        </View>
                                        <View style={{ marginTop: 22 }}>
                                            {leaderboardData.slice(3).map((user, i) => renderLeaderboardItem(user, i + 3))}
                                        </View>
                                    </View>
                                ) : leaderboardData.length > 0 ? (
                                    leaderboardData.map((user, index) => renderLeaderboardItem(user, index))
                                ) : (
                                    <View style={styles.emptyBox}>
                                        <MaterialCommunityIcons name="trophy-broken" size={48} color="rgba(255,255,255,0.3)" />
                                        <Text style={styles.emptyText}>No rankings available yet.</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    </Animated.View>
                </Animated.View>
            </ScrollView>

            <Modal
                visible={blockModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setBlockModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { borderColor: theme.primary }, mixBorderStyle]}>
                        <View style={{ alignItems: 'center', marginBottom: 15 }}>
                            <View style={[styles.modalIconRing, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                <MaterialCommunityIcons name="shield-off-outline" size={32} color="#EF4444" />
                            </View>
                            <Text style={styles.modalTitle}>RESTRICT USER</Text>
                            <Text style={styles.modalSubText}>
                                Prevent {selectedUserToBlock?.name} from contacting you.
                            </Text>
                        </View>

                        <Text style={styles.modalLabel}>SELECT REASON:</Text>
                        {blockReasons.map((reason, idx) => (
                            <TouchableOpacity 
                                key={idx} 
                                style={[styles.reasonBtn, { borderColor: theme.primary + '40' }]}
                                onPress={() => handleReasonSelect(reason)}
                                disabled={isBlocking}
                            >
                                <Text style={styles.reasonText}>{reason}</Text>
                                <Ionicons name="chevron-forward" size={16} color={lighten(theme.primary, 0.4)} />
                            </TouchableOpacity>
                        ))}

                        {isBlocking && (
                            <ActivityIndicator size="small" color="#EF4444" style={{ marginTop: 10 }} />
                        )}

                        <TouchableOpacity 
                            style={styles.cancelBtn} 
                            onPress={() => setBlockModalVisible(false)}
                            disabled={isBlocking}
                        >
                            <Text style={styles.cancelBtnText}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
        </BorderCtx.Provider>
        </CardCtx.Provider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20 },
    loaderContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: '#05030F' },
    loaderText: { marginTop: 15, fontSize: 12, fontWeight: '900', letterSpacing: 3 },
    loaderPulseBox: { width: 90, height: 90, justifyContent: 'center', alignItems: 'center' },
    loaderPulseRing: { position: 'absolute', width: 80, height: 80, borderRadius: 40, borderWidth: 2 },
    
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.09 },

    // section titles
    sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 34, marginBottom: 16 },
    sectionIcon: { width: 26, height: 26, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    sectionText: { color: '#E9D8FF', fontSize: 12, fontWeight: '900', letterSpacing: 2.5, textTransform: 'uppercase' },
    sectionLine: { flex: 1, height: 1.5, borderRadius: 1 },
    sectionDiamond: { width: 7, height: 7, transform: [{ rotate: '45deg' }], shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },

    // hero
    eliteHeroWrapper: { width: '100%', marginTop: 10, borderRadius: 40, backgroundColor: '#0A0620', elevation: 22, shadowOpacity: 0.5, shadowRadius: 26, shadowOffset: { width: 0, height: 10 } },
    heroFrame: { borderRadius: 40, overflow: 'hidden', padding: 2.5, backgroundColor: '#0A0620' },
    heroFrameSpin: { position: 'absolute', top: '50%', left: '50%', width: 900, height: 900, marginLeft: -450, marginTop: -450 },
    eliteHeroCard: { borderRadius: 37.5, padding: 22, overflow: 'hidden' },
    cyberCircle: { position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.05)' },
    cyberCircleSmall: { position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.07)' },
    heroSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 90 },
    heroSweep: { position: 'absolute', top: -60, bottom: -60, width: 90 },
    heroHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    systemStatusBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20,12,60,0.35)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    pulseDotWrap: { width: 14, height: 14, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
    pulseDotRing: { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    systemStatusText: { color: '#34D399', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    statusTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    statusTagText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },

    // royal identity
    identityRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.28)', padding: 10, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(245,200,76,0.25)' },
    identityRing: { width: 54, height: 54, borderRadius: 27, padding: 2.5, justifyContent: 'center', alignItems: 'center' },
    identityAvatar: { width: '100%', height: '100%', borderRadius: 25, backgroundColor: '#0F172A' },
    identityCrown: { position: 'absolute', top: -11, alignSelf: 'center', left: 19 },
    identityName: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
    identityStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    identityStatusText: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },

    heroMainRow: { flexDirection: 'row', alignItems: 'center' },
    revenueTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 11, fontWeight: '800', letterSpacing: 2 },
    revenueNumberContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'nowrap' },
    revenueSymbol: { fontSize: 24, fontWeight: '800', marginRight: 5 },
    // 🆕 Glow (radius 16) remove -> chinna dark shadow (radius 2) so letters sharp-a theriyum
    revenueMainValue: { color: '#FFE9A8', fontSize: 40, fontWeight: '900', letterSpacing: -1, flexShrink: 1, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
    revenueMainUnit: { fontSize: 14, fontWeight: '900', letterSpacing: 3, marginTop: 2 },
    heroTrophyBox: { width: 104, height: 118, justifyContent: 'center', alignItems: 'center' },
    heroTrophyGlow: { position: 'absolute', width: 80, height: 80, borderRadius: 40 },
    heroTrophyShadow: { position: 'absolute', bottom: 2, width: 58, height: 9, borderRadius: 5, opacity: 0.4 },
    levelBarWrap: { marginTop: 18 },
    levelBarHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    levelBarLabel: { color: 'rgba(255,255,255,0.82)', fontSize: 11, fontWeight: '900', letterSpacing: 1.8 },
    levelBarTrack: { height: 14, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    levelBarFillWrap: { height: '100%', borderRadius: 7, overflow: 'hidden' },
    heroSummaryGrid: { flexDirection: 'row', gap: 10, marginTop: 18 },
    summaryChip: { flex: 1, minWidth: 0, padding: 12, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(0,0,0,0.28)' },
    summaryTopRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 },
    summaryLabel: { flex: 1, color: 'rgba(255,255,255,0.78)', fontSize: 9.5, fontWeight: '900', letterSpacing: 0.8 },
    summaryValue: { color: '#FFF', fontSize: 14, fontWeight: '800', lineHeight: 19 },

    // 🆕 key user diamond row
    summaryDiamondRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
    summaryDiamondEmoji: { fontSize: 13 },
    summaryDiamondText: { flexShrink: 1, fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },

    // 🆕 level bar v3 + summary chip icon
    summaryIconBubble: { width: 20, height: 20, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
    levelChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(20,12,60,0.35)', alignSelf: 'flex-start' },
    levelChipText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
    levelNextText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.3, marginTop: 6, marginLeft: 2 },
    levelPctBox: { alignItems: 'flex-end' },
    levelPctBig: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, lineHeight: 30, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
    levelPctSub: { fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    levelBarCap: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 5, backgroundColor: 'rgba(255,255,255,0.85)' },
    levelBarTick: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.28)' },
    levelBarFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 },
    levelBarFooterText: { color: 'rgba(255,255,255,0.8)', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5 },
    levelNeedChip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 14, borderWidth: 1 },
    levelNeedText: { flex: 1, color: '#F1F5F9', fontSize: 11.5, fontWeight: '800', lineHeight: 16, letterSpacing: 0.3 },

    // tabs (🆕 thick 3D tab bar)
    tabsRow: { flexDirection: 'row', marginHorizontal: 0, marginTop: 24, marginBottom: 6, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 28, padding: 6, borderWidth: 1, borderColor: 'rgba(245,200,76,0.18)', shadowOpacity: 0.35, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
    tabPill: { position: 'absolute', top: 6, left: 6, bottom: 6, borderRadius: 22, borderWidth: 1.2, overflow: 'hidden', shadowOpacity: 0.8, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
    tabPillGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 26 },
    tabPillEdge: { position: 'absolute', bottom: 0, left: '22%', right: '22%', height: 3, borderTopLeftRadius: 3, borderTopRightRadius: 3, opacity: 0.9 },
    tabBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 5 }, 
    tabIconCircle: { width: 34, height: 34, borderRadius: 13, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    tabText: { color: '#E2E8F0', fontSize: 11, fontWeight: '900', letterSpacing: 1, flexShrink: 1 },
    tabTextActive: { color: '#FFE9A8' },
    menuBox: { paddingHorizontal: 0, marginTop: 0 },

    // matrix tiles
    matrixGrid: { gap: 14 },
    matrixRow: { flexDirection: 'row', gap: 14 },
    matrixCard: { padding: 18, alignItems: 'flex-start', width: '100%', overflow: 'hidden' },
    matrixWatermark: { position: 'absolute', right: -14, bottom: -16 },
    matrixImg: { position: 'absolute', top: 8, right: 8 },
    matrixIconCircle: { width: 42, height: 42, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 14, overflow: 'hidden' },
    matrixIconGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 18 },
    matrixValue: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: -0.5, maxWidth: '100%' },
    matrixLabel: { color: '#E2E8F0', fontSize: 12, fontWeight: '800', marginTop: 4, maxWidth: '100%' },
    bottomGlowLine: { position: 'absolute', bottom: 0, left: 18, width: '34%', height: 3, borderRadius: 2 },

    // distribution
    distCard: { padding: 20 },
    distHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    distHeaderLabel: { color: '#E2E8F0', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    distHeaderValue: { color: '#FFE9A8', fontSize: 18, fontWeight: '900', maxWidth: '60%' },
    distBar: { height: 16, borderRadius: 8, overflow: 'hidden', flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    distLegend: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 18, rowGap: 14 },
    distLegendItem: { width: '50%', flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
    distDot: { width: 10, height: 10, borderRadius: 5, marginRight: 9, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
    distLegendLabel: { color: '#E2E8F0', fontSize: 11.5, fontWeight: '800' },
    distLegendValue: { color: '#FFF', fontSize: 14, fontWeight: '900', marginTop: 2 },
    distLegendPct: { color: '#CBD5E1', fontSize: 11, fontWeight: '800' },

    // 🆕 reward breakdown v2 (donut + separate boxes)
    donutRow: { flexDirection: 'row', alignItems: 'center' },
    donutBox: { width: DONUT_SIZE, height: DONUT_SIZE, justifyContent: 'center', alignItems: 'center' },
    donutCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    donutCenterEmoji: { fontSize: 24 },
    donutCenterLabel: { color: '#E2E8F0', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginTop: 2 },
    donutInfo: { flex: 1, marginLeft: 16 },
    donutInfoLabel: { color: '#E2E8F0', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    donutInfoValue: { fontSize: 24, fontWeight: '900', marginTop: 6, letterSpacing: -0.5 },
    donutChip: { alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.05)' },
    donutChipText: { color: '#E2E8F0', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    distGrid: { marginTop: 14, gap: 14 },
    distRow: { flexDirection: 'row', gap: 14 },
    // 🆕 fixed height -> 4 box-um exact same size
    distBox: { padding: 14, height: 178, overflow: 'hidden' },
    distWatermark: { position: 'absolute', right: -12, bottom: -14 },
    distBoxTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    distIconBubble: { width: 38, height: 38, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    distPctPill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
    distPctText: { fontSize: 12, fontWeight: '900' },
    distBoxLabel: { color: '#E2E8F0', fontSize: 12, fontWeight: '800' },
    distBoxValue: { color: '#FFF', fontSize: 19, fontWeight: '900', marginTop: 4, letterSpacing: -0.3 },
    distMiniTrack: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.09)', overflow: 'hidden', marginTop: 12 },
    // 🆕 reserved slot for TOP SOURCE tag
    topTagSlot: { height: 22, marginTop: 8, justifyContent: 'center' },
    topTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
    topTagText: { color: '#0B1026', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    
    // lifetime gift
    dailyFlowContainer: { marginTop: 16, marginBottom: 0 },
    dailyFlowPill: { flexDirection: 'row', alignItems: 'center', padding: 16, position: 'relative' },
    flowImgBox: { width: 70, height: 70, justifyContent: 'center', alignItems: 'center' },
    flowIconGlow: { position: 'absolute', width: 50, height: 50, borderRadius: 25, opacity: 0.35 },
    flowTextContainer: { flex: 1, paddingLeft: 6, justifyContent: 'center' },
    flowLabel: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
    flowValueNode: { position: 'relative', flexShrink: 1, maxWidth: '40%' },
    flowValueGlow: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 20, opacity: 0.5 },
    flowValueBox: { paddingHorizontal: 14, paddingVertical: 11, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, zIndex: 2 },
    flowValText: { fontSize: 17, fontWeight: '900', letterSpacing: -0.5, flexShrink: 1 },
    flowBeanSymbol: { fontSize: 16, fontWeight: '900' },
    
    // mission
    massChallengeCard: { padding: 22 },
    massChallengeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    massHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    missionImgBox: { width: 54, height: 54, justifyContent: 'center', alignItems: 'center' },
    missionTextGroup: { marginLeft: 10, flex: 1 },
    missionMainTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
    missionSubText: { color: '#E2E8F0', fontSize: 12, fontWeight: '700', marginTop: 3 },
    bountyBox: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, maxWidth: '35%' },
    bountyLabel: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 2, opacity: 0.9 },
    bountyValue: { fontSize: 15, fontWeight: '900', flexShrink: 1 },
    
    holoTabContainer: { flexDirection: 'row', gap: 10, marginBottom: 20, backgroundColor: 'rgba(0,0,0,0.2)', padding: 6, borderRadius: 20 },
    holoTab: { flex: 1, paddingVertical: 12, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent', position: 'relative', overflow: 'hidden' },
    holoTabGlow: { position: 'absolute', bottom: 0, width: '50%', height: 2, borderRadius: 2, elevation: 5, shadowOpacity: 1, shadowRadius: 5 },
    holoTabText: { color: '#94A3B8', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    
    quantumProgressContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    missionRingBox: { width: MISSION_RING, height: MISSION_RING, justifyContent: 'center', alignItems: 'center' },
    missionRingCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
    missionRingSub: { color: '#E2E8F0', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 1 },
    quantumProgressLabel: { color: '#E2E8F0', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 6 },
    quantumProgressPct: { fontSize: 22, fontWeight: '900' },
    quantumCollected: { color: '#FFF', fontSize: 15, fontWeight: '900' },
    // 🆕 remaining chip: full width, number + label (text cut aagaathu)
    remainChip: { marginTop: 10, alignSelf: 'stretch', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.04)' },
    remainValue: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.3 },
    remainLabel: { color: '#E2E8F0', fontSize: 9.5, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
    quantumRemaining: { color: '#E2E8F0', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },

    // vip insight
    insightPremiumCard: { padding: 18 },
    insightTopRow: { flexDirection: 'row', alignItems: 'center' },
    insightImgBox: { width: 66, height: 66, justifyContent: 'center', alignItems: 'center' },
    insightGlow: { position: 'absolute', width: 46, height: 46, borderRadius: 23, opacity: 0.3 },
    insightTopTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    insightDescription: { color: '#E2E8F0', fontSize: 13, marginTop: 5, lineHeight: 20 },
    // 🆕 longest session partner
    insightPartnerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, padding: 10, borderRadius: 20, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
    insightPartnerRing: { width: 50, height: 50, borderRadius: 25, padding: 2.5, justifyContent: 'center', alignItems: 'center' },
    insightPartnerImg: { width: '100%', height: '100%', borderRadius: 23, backgroundColor: '#0F172A' },
    insightPartnerLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    insightPartnerName: { color: '#FFF', fontSize: 15, fontWeight: '900', marginTop: 3 },
    insightPartnerPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1 },
    insightPartnerPillText: { fontSize: 13, fontWeight: '900' },

    // monthly
    lifetimeHeader: { alignItems: 'center', marginBottom: 25, marginTop: 10 },
    yearCard: { flexDirection: 'row', alignItems: 'center', padding: 16 },
    yearIconBox: { width: 50, height: 50, borderRadius: 18, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    yearTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
    timelineWrap: { paddingLeft: 22, position: 'relative' },
    timelineLine: { position: 'absolute', left: 6, top: 0, bottom: 0, width: 2, borderRadius: 1 },
    timelineDot: { position: 'absolute', left: -20, top: 24, width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#05030F', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 5, zIndex: 3 },
    monthCard: { flexDirection: 'row', alignItems: 'center', padding: 12 },
    monthIconBox: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    logCard: { flexDirection: 'row', alignItems: 'center', padding: 13, paddingLeft: 16, borderRadius: 18, marginBottom: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(15, 10, 40, 0.55)', overflow: 'hidden' },
    logAccent: { position: 'absolute', left: 0, top: 10, bottom: 10, width: 3.5, borderTopRightRadius: 3, borderBottomRightRadius: 3 },
    logIconBox: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    logAmountPill: { alignItems: 'flex-end', justifyContent: 'center', backgroundColor: 'rgba(16,185,129,0.14)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)', maxWidth: '38%' },
    logAmountText: { fontSize: 13, fontWeight: '900' },
    historyTitle: { color: '#FFF', fontSize: 14, fontWeight: 'bold', marginBottom: 4, letterSpacing: 0.5, lineHeight: 20 },
    historyDate: { color: '#E2E8F0', fontSize: 11.5, fontWeight: '700', letterSpacing: 0.5 },
    historyAmount: { fontSize: 16, fontWeight: '900', marginBottom: 4 },
    historyStatus: { fontSize: 11, fontWeight: '900', letterSpacing: 1, textTransform: 'uppercase' },
    emptyBox: { alignItems: 'center', marginTop: 20, marginBottom: 20, opacity: 0.9 },
    emptyText: { color: '#E2E8F0', marginTop: 10, fontSize: 13, fontWeight: '700', letterSpacing: 1 },
    totalTalkLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 5 },

    // podium
    podiumRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingTop: 8 },
    podiumRankBadge: { backgroundColor: '#000', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginBottom: 4 },
    podiumRankText: { fontSize: 11, fontWeight: '900' },
    podiumMeDot: { position: 'absolute', top: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#05030F' },
    podiumName: { color: '#FFF', fontSize: 12, fontWeight: '900', marginTop: 8, maxWidth: '96%', textAlign: 'center' },
    podiumLvl: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, marginTop: 4, marginBottom: 8 },
    podiumBlock: { width: '100%', borderTopLeftRadius: 20, borderTopRightRadius: 20, borderWidth: 1, borderBottomWidth: 0, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 4 },
    podiumGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 30 },
    podiumSide: { position: 'absolute', top: 0, right: 0, bottom: 0, width: 7 },
    podiumBigNum: { fontSize: 38, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 2 } },
    podiumRewardPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 9, marginTop: 4, maxWidth: '96%' },
    podiumRewardText: { color: '#FFF', fontSize: 12, fontWeight: '900', flexShrink: 1 },

    // 🆕 RANK 4+ unique cards
    rankCardInner: { flexDirection: 'row', alignItems: 'center', padding: 12, minHeight: 84 },
    rankWatermark: { position: 'absolute', right: 6, bottom: -14, fontSize: 84, fontWeight: '900', opacity: 0.07 },
    rankNumBox: { width: 42, height: 42, borderRadius: 14, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', flexShrink: 0 },
    rankNumGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 18 },
    rankNumText: { color: '#FFF', fontSize: 17, fontWeight: '900', textAlign: 'center', includeFontPadding: false, textShadowColor: 'rgba(0,0,0,0.45)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 }, maxWidth: 34 },
    rankAvatarWrap: { marginLeft: 12, flexShrink: 0 },
    rankAvatarRing: { width: 54, height: 54, borderRadius: 27, padding: 2.5, justifyContent: 'center', alignItems: 'center' },
    rankAvatarImg: { width: '100%', height: '100%', borderRadius: 25, backgroundColor: '#0F172A' },
    rankMeDot: { position: 'absolute', top: -1, right: -1, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#05030F' },
    rankInfo: { flex: 1, minWidth: 0, marginLeft: 12, marginRight: 8, justifyContent: 'center' },
    rankName: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.4 },
    rankLvlRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    rankLvlChip: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, marginRight: 6 },
    rankLvlChipText: { fontSize: 11, fontWeight: '900' },
    rankLvlLabel: { color: '#E2E8F0', fontSize: 11.5, fontWeight: '800', flexShrink: 1 },
    rankTrack: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.09)', overflow: 'hidden', marginTop: 8 },
    rankRewardCol: { alignItems: 'flex-end', flexShrink: 0, maxWidth: '34%' },
    rankRewardLabel: { color: 'rgba(255,255,255,0.78)', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 4 },
    rankRewardPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(16, 185, 129, 0.18)', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.35)', maxWidth: '100%' },
    rankRewardText: { color: '#34D399', fontSize: 14, fontWeight: '900', flexShrink: 1 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#0F172A', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40, borderWidth: 1, borderBottomWidth: 0 },
    modalIconRing: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    modalTitle: { color: '#EF4444', fontSize: 20, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
    modalSubText: { color: '#E2E8F0', fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 },
    modalLabel: { color: '#CBD5E1', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
    reasonBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
    reasonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    cancelBtn: { marginTop: 15, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)' },
    cancelBtnText: { color: '#E2E8F0', fontSize: 13, fontWeight: '900', letterSpacing: 1 }
});
