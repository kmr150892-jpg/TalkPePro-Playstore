import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    DimensionValue,
    Easing,
    Image,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { db } from '../../../firebaseConfig';

const { width, height } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ✅ ACCURATE THEME & LEVEL CONFIG (LOCKED DEEP-GLOW COLORS & DUAL RATES)
export const getLevelData = (totalBeans: number) => {
    let levelData;
    if (totalBeans >= 100000000) levelData = { lvl: 10, rate: 8000, qmRate: 4400, label: 'LEGEND L10', next: 0, colors: ['#ff0404', '#F59E0B', '#df03ee'], glow: '#F59E0B' };
    else if (totalBeans >= 50000000) levelData = { lvl: 9, rate: 7000, qmRate: 4000, label: 'MYTHIC L9', next: 100000000, colors: ['#f40691', '#dbc0c0', '#0a0303'], glow: '#EC4899' };
    else if (totalBeans >= 30000000) levelData = { lvl: 8, rate: 5400, qmRate: 3600, label: 'ELITE L8', next: 50000000, colors: ['#660aee', '#d4cfdf', '#d40808'], glow: '#8B5CF6' };
    else if (totalBeans >= 10000000) levelData = { lvl: 7, rate: 4800, qmRate: 3200, label: 'MASTER L7', next: 30000000, colors: ['#0af635', '#ca0bf5', '#fd068a'], glow: '#3B82F6' };
    else if (totalBeans >= 5000000)  levelData = { lvl: 6, rate: 4200, qmRate: 2800, label: 'DIAMOND L6', next: 10000000, colors: ['#f70606', '#fdec05', '#fad906'], glow: '#06B6D4' };
    else if (totalBeans >= 3000000)  levelData = { lvl: 5, rate: 3600, qmRate: 2400, label: 'PLATINUM L5', next: 5000000, colors: ['#136a3e', '#10B981', '#f6085b'], glow: '#10B981' };
    else if (totalBeans >= 1000000)  levelData = { lvl: 4, rate: 3000, qmRate: 2000, label: 'GOLD L4', next: 3000000, colors: ['#ffd001', '#EAB308', '#1d00f9'], glow: '#EAB308' };
    else if (totalBeans >= 300000)   levelData = { lvl: 3, rate: 2400, qmRate: 1600, label: 'SILVER L3', next: 1000000, colors: ['#bababa', '#74706f', '#bc0e08'], glow: '#94A3B8' };
    else if (totalBeans >= 100000)    levelData = { lvl: 2, rate: 1800, qmRate: 1200, label: 'BRONZE L2', next: 300000, colors: ['#ff8604', '#f29d0a', '#1505fc'], glow: 'transparent' };
    else if (totalBeans >= 30000)     levelData = { lvl: 1, rate: 1200, qmRate: 1200, label: 'ROOKIE L1', next: 100000, colors: ['#03ffc8', '#13feea', '#f64a06'], glow: 'transparent' };
    else levelData = { lvl: 0, rate: 1000, qmRate: 1000, label: 'BEGINNER L0', next: 30000, colors: ['#f807cf', '#f607e2', '#2a06f5'], glow: 'transparent' };

    return { ...levelData, minRate: 300, maxRate: levelData.rate, color: levelData.colors[0], shadow: levelData.glow !== 'transparent' ? levelData.glow : levelData.colors[0] };
};

export const ALL_LEVELS = [
    { lvl: 0, label: 'BEGINNER L0', goal: 0, rate: 1000, qmRate: 1000, color: '#f807cf' },
    { lvl: 1, label: 'ROOKIE L1', goal: 30000, rate: 1200, qmRate: 1200, color: '#03ffc8' },
    { lvl: 2, label: 'BRONZE L2', goal: 100000, rate: 1800, qmRate: 1200, color: '#ff8604' },
    { lvl: 3, label: 'SILVER L3', goal: 300000, rate: 2400, qmRate: 1600, color: '#bababa' },
    { lvl: 4, label: 'GOLD L4', goal: 1000000, rate: 3000, qmRate: 2000, color: '#ffd001' },
    { lvl: 5, label: 'PLATINUM L5', goal: 3000000, rate: 3600, qmRate: 2400, color: '#136a3e' },
    { lvl: 6, label: 'DIAMOND L6', goal: 5000000, rate: 4200, qmRate: 2800, color: '#f70606' },
    { lvl: 7, label: 'MASTER L7', goal: 10000000, rate: 4800, qmRate: 3200, color: '#0af635' },
    { lvl: 8, label: 'ELITE L8', goal: 30000000, rate: 5400, qmRate: 3600, color: '#660aee' },
    { lvl: 9, label: 'MYTHIC L9', goal: 50000000, rate: 7000, qmRate: 4000, color: '#f40691' },
    { lvl: 10, label: 'LEGEND L10', goal: 100000000, rate: 8000, qmRate: 4400, color: '#ff0404' },
];

// 🆕 ROYAL GOLD (default fallback mattum - screen accent ippo LEVEL based)
const GOLD = '#F5C84C';

// 👑 ROYAL BASE PALETTE (dark base backgrounds + semantic colors)
const ROYAL = {
    bg0: '#05030F',
    bg1: '#0B0622',
    bg2: '#150B38',
    gold: '#F5C84C',
    goldLight: '#FFE9A8',
    goldDeep: '#B8860B',
    violet: '#8B5CF6',
    amethyst: '#C084FC',
    rose: '#FF5C9E',
    cyan: '#22D3EE',
    emerald: '#10B981',
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

// 🆕 MULTICOLOR ENGINE
type Grad = readonly [string, string, ...string[]];
const g = (arr: string[]) => arr as unknown as Grad;

const lum = (hex: string) => {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16) || 0;
    const gg = parseInt(h.substring(2, 4), 16) || 0;
    const b = parseInt(h.substring(4, 6), 16) || 0;
    return (0.299 * r + 0.587 * gg + 0.114 * b) / 255;
};

// 🎨 DUOTONE ENGINE: ovvoru level-kum ADHOODA 2 CONTRAST COLOURS (eg: Level 0 = pink + blue)
// a  = level-oda mudhal colour (primary)
// b  = a-kku adhigama contrast irukkura 2nd colour (level colours-la irundhu)
// at / bt = text-safe versions (romba dark colour na konjam lighten pannum, dark screen-la theriyum)
const colorDist = (c1: string, c2: string) => {
    const x = hexToRgb(c1);
    const y = hexToRgb(c2);
    if (!x || !y) return 0;
    return Math.sqrt((x.r - y.r) ** 2 + (x.g - y.g) ** 2 + (x.b - y.b) ** 2);
};

const textSafe = (hex: string, min: number = 0.62) => {
    const l = lum(hex);
    if (l >= min) return hex;
    const t = Math.min(0.75, (min - l) / (1 - l));
    return lighten(hex, t);
};

const duoOf = (colors: string[]) => {
    const a = colors[0];
    const rest = colors.slice(1).filter(Boolean);
    // Almost-black colours (eg: #0a0303) pair panna kashtam, adhanaala mudhal choice-la skip
    const usable = rest.filter((c) => lum(c) > 0.08);
    const pool = usable.length ? usable : rest;
    let b = pool[0] || a;
    let best = -1;
    pool.forEach((c) => {
        const d = colorDist(a, c);
        if (d > best) { best = d; b = c; }
    });
    return { a, b, at: textSafe(a), bt: textSafe(b) };
};

// Roadmap / medal ovvoru level-kum thani duotone palette (goal = antha level-oda threshold)
const levelPalette = (goal: number) => {
    const d = getLevelData(goal);
    const duo = duoOf(d.colors);
    return {
        colors: d.colors,
        vivid: [duo.a, duo.b, duo.a],   // gradients / fills / glows
        text: [duo.at, duo.bt, duo.at], // text / thin lines
    };
};

// 🆕 Multicolor text: letters smoothly blend from colour 1 -> colour 2 (-> ...)
const GradientText = ({ text, colors, style, fit }: { text: string; colors: string[]; style?: any; fit?: boolean }) => {
    const n = text.length;
    const pick = (i: number) => {
        if (colors.length === 1 || n <= 1) return colors[0];
        const pos = (i / (n - 1)) * (colors.length - 1);
        const idx = Math.min(colors.length - 2, Math.floor(pos));
        return blend(colors[idx], colors[idx + 1], pos - idx);
    };
    return (
        <Text style={style} {...(fit ? { numberOfLines: 1, adjustsFontSizeToFit: true, minimumFontScale: 0.6 } : {})}>
            {text.split('').map((ch, i) => (
                <Text key={i} style={{ color: pick(i) }}>
                    {ch}
                </Text>
            ))}
        </Text>
    );
};

// 🆕 Royal section header (left line + gem in colour 1, right line + gem in colour 2)
const RoyalHeader = ({ title, colors, pulse, accent = GOLD, accent2 }: { title: string; colors: string[]; pulse?: Animated.Value; accent?: string; accent2?: string }) => {
    const sc: any = pulse ? pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] }) : 1;
    const second = accent2 || accent;
    return (
        <View style={styles.royalHeader}>
            <LinearGradient colors={['transparent', accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.royalLine} />
            <Animated.View style={{ transform: [{ scale: sc }] }}>
                <MaterialCommunityIcons name="rhombus" size={8} color={accent} />
            </Animated.View>
            <GradientText text={title} colors={colors} style={styles.royalTitle} />
            <Animated.View style={{ transform: [{ scale: sc }] }}>
                <MaterialCommunityIcons name="rhombus" size={8} color={second} />
            </Animated.View>
            <LinearGradient colors={[second, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.royalLine} />
        </View>
    );
};

// 🆕 ✨ Royal twinkling sparkle
const RoyalSparkle = ({ x, y, size = 12, color = GOLD, delay = 0, dur = 1800 }: any) => {
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
                zIndex: 6,
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

// 🆕 Progress ring geometry (avatar-ah suththi varra ring) - COMPACT SIZE
const RING_SIZE = 108;
const RING_STROKE = 7;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = RING_RADIUS * 2 * Math.PI;

// 🆕 Royal tick ring + rays - COMPACT SIZE
const TICK_SIZE = 138;
const TICK_RADIUS = 66;
const RAYS = Array.from({ length: 16 }, (_, i) => i);
const HERO_STAGE = 148;

// 🆕 Level-up modal sparkle positions (crown-ah suththi)
const SPARKLES = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const a = (i / 8) * 2 * Math.PI;
    return { x: 90 + 78 * Math.cos(a) - 9, y: 90 + 78 * Math.sin(a) - 9 };
});

// 🆕 Orbiting gems around hero avatar
const GEM_POS = [0, 1, 2].map((i) => {
    const a = (i / 3) * 2 * Math.PI;
    return { x: HERO_STAGE / 2 + 67 * Math.cos(a) - 5, y: HERO_STAGE / 2 + 67 * Math.sin(a) - 5 };
});

// 👑 NEW: ULTRA PREMIUM LEVEL-UP EMBLEM geometry (god-rays + tick ring + shockwaves)
const M_STAGE = 270;
const M_RAYS = Array.from({ length: 28 }, (_, i) => i);
const M_TICK = 244;
const M_TICK_R = 118;
const M_RING = 200;
const M_RING_STROKE = 5;
const M_RING_R = (M_RING - M_RING_STROKE) / 2;
const M_GEMS = [0, 1, 2, 3, 4, 5].map((i) => {
    const a = (i / 6) * 2 * Math.PI;
    return { x: M_STAGE / 2 + 124 * Math.cos(a) - 6, y: M_STAGE / 2 + 124 * Math.sin(a) - 6 };
});

export default function LevelInsights({ expertData }: any) {
    const [showModal, setShowModal] = useState(false);
    const [displayBeans, setDisplayBeans] = useState(0);
    const [displayPercent, setDisplayPercent] = useState(0);
    // 🆕 Level-up modal: previous level + animated count-up rates
    const [prevLevel, setPrevLevel] = useState(0);
    const [modalRates, setModalRates] = useState({ call: 0, quick: 0 });
    
    const totalBeans = expertData?.totalBeansEarned || expertData?.totalBeans || 0; 
    const currentLevelInfo = getLevelData(totalBeans);

    // 🆕 LEVEL BASED ACCENT (munnadi fixed gold - ippo level color-ku yetha maarum)
    const tierColor = currentLevelInfo.shadow;

    // 🎨 THIS LEVEL'S TWO CONTRAST COLOURS (eg: Level 0 = pink + blue)
    const duo = duoOf(currentLevelInfo.colors);
    const acc = duo.at;                       // colour 1 (text-safe)  - lines, chips, icons
    const acc2 = duo.bt;                      // colour 2 (text-safe)  - lines, chips, icons
    const accLight = lighten(duo.at, 0.5);
    const accDeep = darken(duo.a, 0.4);

    // Raw colours for fills/gradients/glows: alternate colour 1, colour 2
    const vivid = [duo.a, duo.b, duo.a];
    const vc = (i: number) => (i % 2 === 0 ? duo.a : duo.b);
    // Smooth colour 1 -> colour 2 for text
    const textGrad = [duo.at, duo.bt];

    // 🔥 DYNAMIC THEME ENGINE FOR BACKGROUND (ippo ella level-kum 2 colour tint)
    const theme = {
        primary: duo.a,
        secondary: duo.b,
        accent: acc,
        vivid,
        bgGradient: [
            blend(ROYAL.bg1, duo.a, currentLevelInfo.lvl >= 7 ? 0.3 : 0.18),
            blend('#120A30', duo.b, currentLevelInfo.lvl >= 3 ? 0.22 : 0.14),
            ROYAL.bg0
        ] as const
    };
    
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const orbAnim = useRef(new Animated.Value(0)).current;

    // 🆕 PREMIUM ANIMATION VALUES
    const countAnim = useRef(new Animated.Value(0)).current;   // ring + progress bar + count-up numbers
    const rotAnim = useRef(new Animated.Value(0)).current;     // rotating frames / rays / sparkles
    const pulseAnim = useRef(new Animated.Value(0)).current;   // glow pulse (current rank)
    const sweepAnim = useRef(new Animated.Value(0)).current;   // hero card shine sweep
    const heroAnim = useRef(new Animated.Value(0)).current;    // hero entrance
    const itemAnims = useRef(ALL_LEVELS.map(() => new Animated.Value(0))).current; // roadmap stagger entrance
    const nextAnim = useRef(new Animated.Value(0)).current;    // 🆕 next-reward card entrance
    const medalScrollRef = useRef<ScrollView>(null);

    // 👑 NEW: level-up modal animation values
    const introAnim = useRef(new Animated.Value(0)).current;   // staggered cinematic entrance (emblem -> title -> rank flow -> cards -> button)
    const modalCount = useRef(new Animated.Value(0)).current;  // rate count-up (old rate -> new rate)
    const waves = useRef([0, 1, 2].map(() => new Animated.Value(0))).current; // expanding shockwave rings

    const particles = useRef(
        Array.from({ length: 20 }, (_, i) => ({
            v: new Animated.Value(0),
            x: ((i * 37) % 100) / 100 * width,
            y: 160 + ((i * 53) % 420),
            size: 2 + (i % 3),
            dur: 6000 + (i % 5) * 1300,
            delay: i * 450,
        }))
    ).current;

    // 🆕 Level-up confetti
    const confetti = useRef(
        Array.from({ length: 22 }, (_, i) => ({
            v: new Animated.Value(0),
            x: ((i * 47) % 100) / 100 * (width * 0.92),
            size: 6 + (i % 4) * 2,
            dur: 2800 + (i % 5) * 500,
            delay: (i % 7) * 220,
        }))
    ).current;

    // ---- Derived progress values ----
    const currentLvlIdx = ALL_LEVELS.findIndex(l => l.lvl === currentLevelInfo.lvl);
    const currentGoal = ALL_LEVELS[currentLvlIdx]?.goal || 0;
    const nextGoal = currentLevelInfo.next;
    const rawPercent = nextGoal > 0 ? Math.min(((totalBeans - currentGoal) / (nextGoal - currentGoal)) * 100, 100) : 100;
    const progressPercent = isNaN(rawPercent) ? 0 : Math.max(0, rawPercent);
    const remainingBeans = nextGoal > 0 ? nextGoal - totalBeans : 0;
    const nextLevelItem = ALL_LEVELS[currentLvlIdx + 1];

    // 🆕 Next rank preview data (rate upgrade delta) - next level-oda own 2 colours
    const nextDuo = nextLevelItem ? levelPalette(nextLevelItem.goal) : null;
    const nextPal = nextDuo ? nextDuo.vivid : [duo.a, duo.b, duo.a];   // raw (fills)
    const nextPalT = nextDuo ? nextDuo.text : [acc, acc2, acc];        // text-safe
    const deltaCall = nextLevelItem ? nextLevelItem.rate - currentLevelInfo.rate : 0;
    const deltaQuick = nextLevelItem ? nextLevelItem.qmRate - currentLevelInfo.qmRate : 0;

    // 👑 NEW: previous rank data for the level-up modal (old -> new transition)
    const prevItem = ALL_LEVELS.find((l) => l.lvl === prevLevel) || ALL_LEVELS[Math.max(0, currentLevelInfo.lvl - 1)];
    const prevPal = levelPalette(prevItem.goal);
    const modalDeltaCall = currentLevelInfo.rate - prevItem.rate;
    const modalDeltaQuick = currentLevelInfo.qmRate - prevItem.qmRate;

    useEffect(() => {
        // Linear shimmer for progress bar
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.linear }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        ).start();

        // Sinusoidal float for background orbs
        Animated.loop(
            Animated.timing(orbAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true
            })
        ).start();

        // 🆕 Rotation (frames, rays, dashed ring)
        Animated.loop(
            Animated.timing(rotAnim, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true })
        ).start();

        // 🆕 Glow pulse
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ).start();

        // 🆕 Hero card shine sweep (every few seconds)
        Animated.loop(
            Animated.sequence([
                Animated.delay(1800),
                Animated.timing(sweepAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(sweepAnim, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        ).start();

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

        // 🆕 Hero entrance + roadmap stagger
        Animated.spring(heroAnim, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }).start();
        Animated.spring(nextAnim, { toValue: 1, delay: 350, tension: 40, friction: 8, useNativeDriver: true }).start();
        Animated.stagger(
            70,
            itemAnims.map((a) => Animated.timing(a, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }))
        ).start();
    }, []);

    // 🆕 Level-up confetti rain (modal open irukkumbodhu mattum)
    useEffect(() => {
        if (!showModal) return;
        const anims = confetti.map((c) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(c.delay),
                    Animated.timing(c.v, { toValue: 1, duration: c.dur, easing: Easing.linear, useNativeDriver: true }),
                    Animated.timing(c.v, { toValue: 0, duration: 0, useNativeDriver: true })
                ])
            )
        );
        anims.forEach((a) => a.start());
        return () => anims.forEach((a) => a.stop());
    }, [showModal]);

    // 👑 NEW: cinematic intro + shockwave rings (modal open irukkumbodhu mattum)
    useEffect(() => {
        if (!showModal) return;
        introAnim.setValue(0);
        Animated.timing(introAnim, { toValue: 1, duration: 2200, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

        const waveLoops = waves.map((w, i) => {
            w.setValue(0);
            return Animated.loop(
                Animated.sequence([
                    Animated.delay(i * 800),
                    Animated.timing(w, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                    Animated.timing(w, { toValue: 0, duration: 0, useNativeDriver: true })
                ])
            );
        });
        waveLoops.forEach((a) => a.start());
        return () => waveLoops.forEach((a) => a.stop());
    }, [showModal]);

    // 👑 NEW: rate count-up (old rate -> new rate) inside the level-up modal
    useEffect(() => {
        if (!showModal) return;
        setModalRates({ call: prevItem.rate, quick: prevItem.qmRate });
        modalCount.setValue(0);
        const id = modalCount.addListener(({ value }) => {
            setModalRates({
                call: Math.round(prevItem.rate + (currentLevelInfo.rate - prevItem.rate) * value),
                quick: Math.round(prevItem.qmRate + (currentLevelInfo.qmRate - prevItem.qmRate) * value),
            });
        });
        Animated.timing(modalCount, { toValue: 1, duration: 1400, delay: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
        return () => modalCount.removeListener(id);
    }, [showModal]);

    // 🆕 Count-up (total reward + percent) + ring fill animation
    useEffect(() => {
        const id = countAnim.addListener(({ value }) => {
            setDisplayBeans(Math.floor(totalBeans * value));
            setDisplayPercent(Math.floor(progressPercent * value));
        });
        countAnim.setValue(0);
        Animated.timing(countAnim, { toValue: 1, duration: 1700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
        return () => countAnim.removeListener(id);
    }, [totalBeans, progressPercent]);

    // 🆕 Medal strip auto scroll to current level
    useEffect(() => {
        const t = setTimeout(() => {
            medalScrollRef.current?.scrollTo({ x: Math.max(0, currentLvlIdx * 68 - width / 2 + 40), animated: true });
        }, 700);
        return () => clearTimeout(t);
    }, [currentLvlIdx]);

    useEffect(() => {
        const syncLevelToDB = async () => {
            if (expertData?.uid) {
                const dbLevel = expertData.currentLevel || 0;
                const newLevel = currentLevelInfo.lvl;

                if (newLevel !== dbLevel) {
                    try {
                        const userRef = doc(db, 'users', expertData.uid);
                        await updateDoc(userRef, {
                            currentLevel: newLevel,
                            levelTitle: currentLevelInfo.label,
                            pricePerMin: currentLevelInfo.rate,
                            beansPerMin: currentLevelInfo.rate 
                        });

                        if (newLevel > dbLevel) {
                            setPrevLevel(dbLevel); // 👑 NEW: old rank -> new rank transition kaattaradhukku
                            triggerLevelUp();
                        }
                    } catch (error: any) {
                        console.error("❌ Firestore ERROR:", error.message);
                    }
                }
            }
        };
        syncLevelToDB();
    }, [totalBeans, expertData?.uid, expertData?.currentLevel]);

    const triggerLevelUp = () => {
        setShowModal(true);
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true })
        ]).start();
    };

    const closeLevelUp = () => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
            setShowModal(false);
            scaleAnim.setValue(0);
        });
    };

    const shimmerTranslate = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-width, width]
    });

    const orbTranslateY = orbAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -30]
    });

    // 🆕 Interpolations for premium visuals
    const spin = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const spinRev = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
    const sweepX = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.6, width * 1.1] });
    const ringOffset = countAnim.interpolate({ inputRange: [0, 1], outputRange: [RING_CIRCUMFERENCE, RING_CIRCUMFERENCE * (1 - progressPercent / 100)] });
    const fillWidth = countAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${progressPercent}%`] }) as unknown as DimensionValue;
    const knobLeft = countAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${progressPercent}%`] }) as unknown as DimensionValue;
    const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.75] });
    const glowScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
    const crownBob = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });

    // 👑 NEW: level-up modal staged entrance helpers
    const stageIn = (a: number, b: number): any => ({
        opacity: introAnim.interpolate({ inputRange: [a, b], outputRange: [0, 1], extrapolate: 'clamp' }),
        transform: [{ translateY: introAnim.interpolate({ inputRange: [a, b], outputRange: [36, 0], extrapolate: 'clamp' }) }]
    });
    const emblemIn: any = {
        opacity: introAnim.interpolate({ inputRange: [0, 0.18], outputRange: [0, 1], extrapolate: 'clamp' }),
        transform: [
            { scale: introAnim.interpolate({ inputRange: [0, 0.38], outputRange: [0.15, 1], extrapolate: 'clamp' }) },
            { rotate: introAnim.interpolate({ inputRange: [0, 0.38], outputRange: ['-30deg', '0deg'], extrapolate: 'clamp' }) }
        ]
    };
    const flashOpacity = introAnim.interpolate({ inputRange: [0, 0.22], outputRange: [0.85, 0], extrapolate: 'clamp' });

    const expertName = expertData?.name || expertData?.userName || 'TALKPE HOST';
    const avatarUri = expertData?.profilePic || expertData?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(expertName)}&background=0F172A&color=ffffff&size=256&bold=true`;

    // 🔥 ALTERNATING BORDER STYLES WITH REDUCED THICKNESS (2px) - colour 1 / colour 2
    const borderType1 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: duo.at,
        borderRightColor: duo.at,
        borderTopColor: duo.bt + '80',
        borderBottomColor: duo.bt + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    const borderType2 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: duo.bt,
        borderRightColor: duo.bt,
        borderTopColor: duo.at + '80',
        borderBottomColor: duo.at + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    return (
        <View style={[styles.mainContainer, { backgroundColor: ROYAL.bg0 }]}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />
            
            {/* Shimmer Orbs for Animation (colour 1 / colour 2 alternate) */}
            <Animated.View style={[styles.shimmerOrb, { top: 80, right: -60, backgroundColor: duo.a, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 400, left: -90, backgroundColor: duo.b, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 720, right: -80, backgroundColor: duo.b, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 1000, left: -100, backgroundColor: duo.a, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 1300, right: -90, backgroundColor: acc, opacity: 0.1, transform: [{ translateY: orbTranslateY }] }]} />

            {/* 🆕 Floating particles (colour 1 / colour 2, background-la mela eruthu varum) */}
            {particles.map((p, i) => (
                <Animated.View
                    key={i}
                    pointerEvents="none"
                    style={[
                        styles.particle,
                        {
                            top: p.y,
                            left: p.x,
                            width: p.size,
                            height: p.size,
                            borderRadius: p.size / 2,
                            backgroundColor: i % 5 === 0 ? acc : (i % 7 === 0 ? accLight : vc(i)),
                            opacity: p.v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.85, 0.6, 0] }),
                            transform: [{ translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, -320] }) }]
                        }
                    ]}
                />
            ))}

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                
                {/* 🔥 COMPACT CYBER HERO SECTION DYNAMIC (one-screen fit) */}
                <Animated.View
                    style={[
                        styles.heroWrapper,
                        {
                            shadowColor: vc(0),
                            opacity: heroAnim,
                            transform: [
                                { scale: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                                { translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }
                            ]
                        }
                    ]}
                >
                    {/* 🆕 Rotating duotone frame (colour 1 <-> colour 2) */}
                    <View style={styles.heroFrame}>
                        <Animated.View style={[styles.heroFrameSpin, { transform: [{ rotate: spin }] }]} pointerEvents="none">
                            <LinearGradient
                                colors={g([vc(0), vc(1), vc(0), vc(1), vc(0)])}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>

                    <LinearGradient 
                        colors={g([vc(0) + '40', '#0A0620', vc(1) + '30', '#060315'])} 
                        start={{x:0, y:0}} end={{x:1, y:1}} 
                        style={[styles.heroCard, borderType1, { shadowColor: duo.a }]}
                    >
                        <View style={styles.heroGlow} />

                        {/* 🆕 Glass sheen + inner rim (advanced depth) */}
                        <LinearGradient
                            colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']}
                            start={{ x: 0.5, y: 0 }}
                            end={{ x: 0.5, y: 1 }}
                            style={styles.heroSheen}
                            pointerEvents="none"
                        />
                        <View style={styles.heroInnerRim} pointerEvents="none" />

                        {/* 🆕 Royal corner ornaments (twinkle) - colour 1 / colour 2 */}
                        <Animated.View style={[styles.cornerStar, { top: 5, left: 7, opacity: glowOpacity }]} pointerEvents="none">
                            <MaterialCommunityIcons name="star-four-points" size={10} color={acc} />
                        </Animated.View>
                        <Animated.View style={[styles.cornerStar, { top: 5, right: 7, opacity: glowOpacity }]} pointerEvents="none">
                            <MaterialCommunityIcons name="star-four-points" size={10} color={acc2} />
                        </Animated.View>
                        <Animated.View style={[styles.cornerStar, { bottom: 5, left: 7, opacity: glowOpacity }]} pointerEvents="none">
                            <MaterialCommunityIcons name="star-four-points" size={10} color={acc2} />
                        </Animated.View>
                        <Animated.View style={[styles.cornerStar, { bottom: 5, right: 7, opacity: glowOpacity }]} pointerEvents="none">
                            <MaterialCommunityIcons name="star-four-points" size={10} color={acc} />
                        </Animated.View>

                        {/* 🆕 Shine sweep across hero card */}
                        <Animated.View pointerEvents="none" style={[styles.heroSweep, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
                            <LinearGradient
                                colors={['transparent', 'rgba(255,255,255,0.16)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>

                        {/* 🆕 Top row: status badge + rank chip */}
                        <View style={styles.heroTopRow}>
                            <View style={[styles.statusPill, { borderColor: acc + '99' }]}>
                                <MaterialCommunityIcons name="shield-star" size={12} color={acc} />
                                <Text style={[styles.badgeLabel, { color: acc, marginBottom: 0 }]}>PREMIUM STATUS</Text>
                            </View>
                            <LinearGradient colors={g([vc(0), vc(1)])} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.rankChip}>
                                <Text style={styles.rankChipText}>RANK {currentLevelInfo.lvl}/10</Text>
                            </LinearGradient>
                        </View>

                        {/* 🆕 COMPACT MIDDLE ROW: ring (left) + host info (right) */}
                        <View style={styles.heroMiddleRow}>
                            <View style={styles.ringBox}>
                                <Animated.View style={[styles.ringGlow, { backgroundColor: vc(1), opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />

                                {/* Rotating duotone rays (colour 1 / colour 2 alternate) */}
                                <Animated.View style={[styles.raysStage, { transform: [{ rotate: spin }] }]} pointerEvents="none">
                                    {RAYS.map((i) => (
                                        <View key={i} style={[styles.rayArm, { transform: [{ rotate: `${i * 22.5}deg` }] }]}>
                                            <LinearGradient
                                                colors={g([i % 2 === 0 ? acc : acc2, 'transparent'])}
                                                style={styles.rayBeam}
                                            />
                                        </View>
                                    ))}
                                </Animated.View>

                                {/* Accent tick ring (reverse rotation) */}
                                <Animated.View style={[styles.tickRing, { transform: [{ rotate: spinRev }] }]} pointerEvents="none">
                                    <Svg width={TICK_SIZE} height={TICK_SIZE}>
                                        <Circle
                                            cx={TICK_SIZE / 2}
                                            cy={TICK_SIZE / 2}
                                            r={TICK_RADIUS}
                                            stroke={acc}
                                            strokeOpacity={0.7}
                                            strokeWidth={2.5}
                                            strokeDasharray="1.5 8"
                                            fill="transparent"
                                        />
                                    </Svg>
                                </Animated.View>

                                {/* 🆕 Orbiting royal gems */}
                                <Animated.View style={[styles.raysStage, { transform: [{ rotate: spinRev }] }]} pointerEvents="none">
                                    {GEM_POS.map((s, i) => (
                                        <MaterialCommunityIcons
                                            key={i}
                                            name="rhombus"
                                            size={10}
                                            color={i % 2 === 0 ? acc : acc2}
                                            style={{ position: 'absolute', left: s.x, top: s.y }}
                                        />
                                    ))}
                                </Animated.View>

                                <Animated.View style={[styles.dashedRing, { borderColor: acc2 + '99', transform: [{ rotate: spin }] }]} />
                                <Svg width={RING_SIZE} height={RING_SIZE} style={styles.ringSvg}>
                                    <Defs>
                                        <SvgLinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                                            <Stop offset="0" stopColor={vc(0)} />
                                            <Stop offset="1" stopColor={vc(1)} />
                                        </SvgLinearGradient>
                                    </Defs>
                                    <Circle
                                        cx={RING_SIZE / 2}
                                        cy={RING_SIZE / 2}
                                        r={RING_RADIUS}
                                        stroke="rgba(255,255,255,0.08)"
                                        strokeWidth={RING_STROKE}
                                        fill="transparent"
                                    />
                                    <AnimatedCircle
                                        cx={RING_SIZE / 2}
                                        cy={RING_SIZE / 2}
                                        r={RING_RADIUS}
                                        stroke="url(#ringGrad)"
                                        strokeWidth={RING_STROKE}
                                        fill="transparent"
                                        strokeDasharray={RING_CIRCUMFERENCE}
                                        strokeDashoffset={ringOffset}
                                        strokeLinecap="round"
                                    />
                                </Svg>
                                <View style={[styles.avatarFrame, { borderColor: acc }]}>
                                    <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                                </View>

                                {/* 🆕 Royal sparkles around avatar */}
                                <RoyalSparkle x={HERO_STAGE - 34} y={14} size={11} color={acc} delay={0} />
                                <RoyalSparkle x={10} y={HERO_STAGE - 50} size={10} color={acc2} delay={700} />
                                <RoyalSparkle x={20} y={22} size={9} color={accLight} delay={1300} />

                                {/* 🆕 Floating crown */}
                                <Animated.View style={[styles.floatCrown, { transform: [{ translateY: crownBob }] }]} pointerEvents="none">
                                    <MaterialCommunityIcons name="crown" size={22} color={acc} />
                                </Animated.View>

                                {/* 🔥 Rank icon badge (old capsule icon logic) */}
                                <LinearGradient colors={g([vc(0), vc(1), '#000'])} style={[styles.crestBadge, { borderColor: acc }]}>
                                    <MaterialCommunityIcons name={currentLevelInfo.lvl >= 7 ? "crown" : "star-face"} size={16} color="#FFF" />
                                </LinearGradient>
                                {/* Percent chip (ring-oda keezhe) */}
                                <LinearGradient colors={g([vc(0), vc(1)])} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.ringPercentChip, { borderColor: acc }]}>
                                    <Text style={styles.ringPercentText}>{displayPercent}%</Text>
                                </LinearGradient>
                            </View>

                            {/* 🆕 Host info column */}
                            <View style={styles.heroInfoCol}>
                                <Text style={styles.heroName} numberOfLines={1}>{expertName.toUpperCase()}</Text>
                                <LinearGradient colors={['transparent', acc, acc2, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.heroNameLine} />
                                <GradientText text={currentLevelInfo.label} colors={textGrad} fit style={[styles.heroTitle, { textShadowColor: 'rgba(0,0,0,0.75)' }]} />
                                <View style={styles.expertVerifiedRow}>
                                    <MaterialCommunityIcons name="check-decagram" size={13} color={acc} />
                                    <View style={{ flexShrink: 1 }}>
                                        <GradientText text="OFFICIAL TALKPE PRO HOST" colors={textGrad} fit style={styles.expertType} />
                                    </View>
                                </View>
                                {/* 🆕 Next rank mini chip */}
                                {nextLevelItem ? (
                                    <View style={[styles.nextChip, { borderColor: nextPalT[0] + '88' }]}>
                                        <MaterialCommunityIcons name="arrow-up-bold-circle" size={12} color={nextPalT[0]} />
                                        <Text style={styles.nextChipText} numberOfLines={1}>NEXT: {nextLevelItem.label}</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.nextChip, { borderColor: acc + '88' }]}>
                                        <MaterialCommunityIcons name="crown" size={12} color={acc} />
                                        <Text style={[styles.nextChipText, { color: acc }]} numberOfLines={1}>TOP OF THE WORLD</Text>
                                    </View>
                                )}
                            </View>
                        </View>

                        {/* 🆕 Royal divider (colour 1 left -> colour 2 right) */}
                        <View style={styles.royalDivider}>
                            <LinearGradient colors={['transparent', acc]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.royalLine} />
                            <MaterialCommunityIcons name="diamond-stone" size={12} color={acc} />
                            <MaterialCommunityIcons name="diamond-stone" size={12} color={acc2} />
                            <LinearGradient colors={[acc2, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.royalLine} />
                        </View>

                        <View style={styles.heroStatsContainer}>
                            <BlurView intensity={20} tint="dark" style={styles.heroStatBox}>
                                <LinearGradient colors={g([vc(0), vc(1)])} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statTopLine} />
                                <View style={styles.statIconRow}>
                                    <LinearGradient colors={g([vc(0), vc(1)])} style={styles.statIcon}>
                                        <MaterialCommunityIcons name="trophy-award" size={13} color="#FFF" />
                                    </LinearGradient>
                                    <Text style={styles.hStatLabel}>TOTAL REWARD</Text>
                                </View>
                                <View style={styles.hValueRow}>
                                    <Text style={{ fontSize: 14 }}>🎖️</Text>
                                    <Text style={styles.hStatValue} numberOfLines={1} adjustsFontSizeToFit>{displayBeans.toLocaleString()}</Text>
                                </View>
                            </BlurView>
                            <BlurView intensity={20} tint="dark" style={styles.heroStatBox}>
                                <LinearGradient colors={g([vc(1), vc(0)])} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statTopLine} />
                                <View style={styles.statIconRow}>
                                    <LinearGradient colors={g([vc(1), vc(0)])} style={styles.statIcon}>
                                        <MaterialCommunityIcons name="phone-in-talk" size={13} color="#FFF" />
                                    </LinearGradient>
                                    <Text style={styles.hStatLabel}>CALL FEE CAP (R/min)</Text>
                                </View>
                                <View style={styles.dualRateContainer}>
                                    <Text style={[styles.heroRateText, { color: acc }]}>CALL: {currentLevelInfo.rate}</Text>
                                    <Text style={[styles.heroRateText, { color: acc2 }]}>QUICK: {currentLevelInfo.qmRate}</Text>
                                </View>
                            </BlurView>
                        </View>

                        <View style={styles.massProgressSection}>
                            <View style={styles.progressHeader}>
                                <Text style={styles.progressTitle}>RANK SYNCING...</Text>
                                <Text style={[styles.progressPercent, {color: acc2}]}>{displayPercent}%</Text>
                            </View>
                            <View style={styles.trackWrap}>
                                <View style={styles.megaTrack}>
                                    {/* 25 / 50 / 75 tick marks */}
                                    <View style={[styles.tick, { left: '25%' }]} />
                                    <View style={[styles.tick, { left: '50%' }]} />
                                    <View style={[styles.tick, { left: '75%' }]} />
                                    <Animated.View style={[styles.megaFillWrap, { width: fillWidth }]}>
                                        <LinearGradient 
                                            colors={g([vc(0), vc(1)])} 
                                            start={{x:0, y:0}} end={{x:1, y:0}} 
                                            style={styles.megaFill} 
                                        >
                                            <Animated.View style={[styles.shimmerLayer, { transform: [{ translateX: shimmerTranslate }] }]} />
                                        </LinearGradient>
                                    </Animated.View>
                                </View>
                                {/* 🆕 Glowing knob at progress end */}
                                <Animated.View style={[styles.knobTrack, { width: knobLeft }]} pointerEvents="none">
                                    <Animated.View style={[styles.knob, { backgroundColor: acc2, shadowColor: vc(1), transform: [{ scale: glowScale }] }]} />
                                </Animated.View>
                            </View>
                            {remainingBeans > 0 ? (
                                <View style={styles.remainingBadge}>
                                    <Text style={styles.remainingText}>
                                        NEED <Text style={{color: acc, fontWeight: '900'}}>{remainingBeans.toLocaleString()}</Text> FOR {ALL_LEVELS[currentLvlIdx + 1]?.label}
                                    </Text>
                                </View>
                            ) : (
                                <View style={[styles.remainingBadge, styles.maxBadge, { borderColor: acc }]}>
                                    <MaterialCommunityIcons name="crown" size={14} color={acc} />
                                    <Text style={[styles.remainingText, { color: acc }]}>MAX RANK ACHIEVED</Text>
                                </View>
                            )}
                        </View>
                    </LinearGradient>
                    </View>
                </Animated.View>

                {/* 🆕 NEXT REWARD PREVIEW CARD (next rank-la enna kidaikkum nu kaattum - adhoda own 2 colours) */}
                <RoyalHeader title={nextLevelItem ? 'NEXT REWARD' : 'LEGEND STATUS'} colors={textGrad} pulse={pulseAnim} accent={acc} accent2={acc2} />
                <Animated.View
                    style={[
                        styles.nextCardWrap,
                        {
                            shadowColor: nextPal[0],
                            opacity: nextAnim,
                            transform: [{ translateY: nextAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }]
                        }
                    ]}
                >
                    <LinearGradient colors={g([nextPal[0], nextPal[1], nextPal[0]])} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.nextCardBorder}>
                        <View style={styles.nextCardInner}>
                            <LinearGradient colors={g([nextPal[0] + '2A', 'transparent', nextPal[1] + '26'])} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                            <RoyalSparkle x={width - 80} y={10} size={10} color={nextPalT[0]} delay={200} />
                            <RoyalSparkle x={70} y={64} size={8} color={nextPalT[1]} delay={900} />

                            <View style={styles.nextMedalBox}>
                                <Animated.View style={[styles.nextMedalHalo, { borderColor: nextPalT[0], opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
                                <LinearGradient colors={g([nextPal[0], nextPal[1], '#020617'])} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.nextMedal, { borderColor: nextPalT[1] }]}>
                                    {nextLevelItem ? (
                                        <Text style={styles.nextMedalText}>{nextLevelItem.lvl}</Text>
                                    ) : (
                                        <MaterialCommunityIcons name="crown" size={26} color="#FFF" />
                                    )}
                                </LinearGradient>
                            </View>

                            <View style={{ flex: 1, marginLeft: 14 }}>
                                {nextLevelItem ? (
                                    <>
                                        <GradientText text={nextLevelItem.label} colors={[nextPalT[0], nextPalT[1]]} fit style={styles.nextTitle} />
                                        <Text style={styles.nextSub}>Unlock at {nextLevelItem.goal.toLocaleString()} Rewards</Text>
                                        <View style={styles.perkRow}>
                                            <View style={[styles.perkPill, { borderColor: nextPalT[0] + '88', backgroundColor: nextPal[0] + '26' }]}>
                                                <MaterialCommunityIcons name="trending-up" size={11} color={ROYAL.emerald} />
                                                <Text style={[styles.perkText, { color: nextPalT[0] }]}>CALL {nextLevelItem.rate}</Text>
                                                {deltaCall > 0 && <Text style={[styles.perkText, { color: ROYAL.emerald }]}>+{deltaCall}</Text>}
                                            </View>
                                            <View style={[styles.perkPill, { borderColor: nextPalT[1] + '88', backgroundColor: nextPal[1] + '26' }]}>
                                                <MaterialCommunityIcons name="trending-up" size={11} color={ROYAL.emerald} />
                                                <Text style={[styles.perkText, { color: nextPalT[1] }]}>QUICK {nextLevelItem.qmRate}</Text>
                                                {deltaQuick > 0 && <Text style={[styles.perkText, { color: ROYAL.emerald }]}>+{deltaQuick}</Text>}
                                            </View>
                                        </View>
                                    </>
                                ) : (
                                    <>
                                        <GradientText text="HIGHEST RANK REACHED" colors={textGrad} fit style={styles.nextTitle} />
                                        <Text style={styles.nextSub}>Maximum call and quick rates unlocked</Text>
                                        <View style={styles.perkRow}>
                                            <View style={[styles.perkPill, { borderColor: acc + '88', backgroundColor: acc + '1F' }]}>
                                                <MaterialCommunityIcons name="crown" size={11} color={acc} />
                                                <Text style={[styles.perkText, { color: acc }]}>CALL {currentLevelInfo.rate}</Text>
                                            </View>
                                            <View style={[styles.perkPill, { borderColor: acc2 + '88', backgroundColor: acc2 + '1F' }]}>
                                                <MaterialCommunityIcons name="crown" size={11} color={acc2} />
                                                <Text style={[styles.perkText, { color: acc2 }]}>QUICK {currentLevelInfo.qmRate}</Text>
                                            </View>
                                        </View>
                                    </>
                                )}
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* 🆕 RANK MEDALS STRIP */}
                <RoyalHeader title="RANK MEDALS" colors={textGrad} pulse={pulseAnim} accent={acc} accent2={acc2} />
                <ScrollView
                    ref={medalScrollRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.medalStrip}
                    style={{ marginBottom: 30 }}
                >
                    {/* 🆕 connecting multicolor thread behind medals */}
                    <LinearGradient
                        colors={g(ALL_LEVELS.map((l) => levelPalette(l.goal).vivid[0]))}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.medalThread}
                        pointerEvents="none"
                    />
                    {ALL_LEVELS.map((item, index) => {
                        const isCompleted = totalBeans >= (ALL_LEVELS[index + 1]?.goal || 999999999);
                        const isCurrent = currentLevelInfo.lvl === item.lvl;
                        const isLocked = totalBeans < item.goal && !isCurrent;
                        const pal = levelPalette(item.goal);
                        return (
                            <View key={item.lvl} style={styles.medalWrap}>
                                {isCurrent && (
                                    <Animated.View
                                        style={[
                                            styles.medalHalo,
                                            { borderColor: acc, opacity: glowOpacity, transform: [{ scale: glowScale }] }
                                        ]}
                                    />
                                )}
                                <LinearGradient
                                    colors={isLocked ? ['#1e293b', '#0f172a'] : g([pal.vivid[0], pal.vivid[1], '#020617'])}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={[styles.medal, { borderColor: isLocked ? 'rgba(255,255,255,0.18)' : pal.text[1] }, isCurrent && { borderColor: acc, borderWidth: 2 }, isLocked && { opacity: 0.55 }]}
                                >
                                    {isLocked ? (
                                        <MaterialCommunityIcons name="lock" size={18} color="#475569" />
                                    ) : isCompleted ? (
                                        <MaterialCommunityIcons name="check-decagram" size={22} color="#FFF" />
                                    ) : (
                                        <MaterialCommunityIcons name={item.lvl >= 7 ? "crown" : "star-face"} size={22} color="#FFF" />
                                    )}
                                </LinearGradient>
                                {isCurrent && <RoyalSparkle x={38} y={-4} size={10} color={acc} delay={0} />}
                                <Text style={[styles.medalLabel, { color: isLocked ? '#94A3B8' : pal.text[0] }]}>L{item.lvl}</Text>
                            </View>
                        );
                    })}
                </ScrollView>

                <RoyalHeader title="ELITE ROADMAP" colors={textGrad} pulse={pulseAnim} accent={acc} accent2={acc2} />
                
                <View style={styles.roadmapBox}>
                    {ALL_LEVELS.map((item, index) => {
                        const isCompleted = totalBeans >= (ALL_LEVELS[index + 1]?.goal || 999999999);
                        const isCurrent = currentLevelInfo.lvl === item.lvl;
                        const isLocked = totalBeans < item.goal && !isCurrent;
                        const pal = levelPalette(item.goal);
                        const pv = pal.vivid;   // raw 2 colours (fills)
                        const pt = pal.text;    // text-safe 2 colours (text, thin lines)
                        
                        // 🔥 Alternate borders for roadmap items
                        const roadmapBorderStyle = index % 2 === 0 ? borderType2 : borderType1;

                        const cardNode = (
                            <TouchableOpacity activeOpacity={0.8} style={[styles.roadmapCard, roadmapBorderStyle, !isLocked && { borderLeftColor: pt[0], borderRightColor: pt[1] }, isCurrent && {borderColor: item.color, borderLeftColor: pt[0], borderRightColor: pt[1], borderLeftWidth: 4, backgroundColor: 'rgba(255,255,255,0.05)'}, isLocked && {opacity: 0.8}]}>
                                <LinearGradient
                                    colors={isLocked ? ['rgba(30,41,59,0.5)', 'rgba(15,23,42,0.4)'] : g([pv[0] + '30', pv[1] + '26', pv[0] + '1A'])}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                    pointerEvents="none"
                                />
                                {/* 🆕 Current card shine sweep */}
                                {isCurrent && (
                                    <Animated.View pointerEvents="none" style={[styles.cardSweep, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
                                        <LinearGradient colors={['transparent', 'rgba(255,255,255,0.14)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                                    </Animated.View>
                                )}
                                {/* 🆕 Level medallion (this level's own 2 colours) */}
                                <LinearGradient
                                    colors={isLocked ? ['#1e293b', '#0f172a'] : g([pv[0], pv[1], '#020617'])}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={[styles.rmMedal, !isLocked && { borderColor: pt[1] }]}
                                >
                                    <Text style={[styles.rmMedalText, { color: isLocked ? '#94A3B8' : '#FFF' }]}>{item.lvl}</Text>
                                </LinearGradient>

                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    {isLocked ? (
                                        <Text style={[styles.rmLabel, {color: '#94A3B8'}]}>{item.label}</Text>
                                    ) : (
                                        <GradientText text={item.label} colors={[pt[0], pt[1]]} style={styles.rmLabel} />
                                    )}
                                    <Text style={styles.rmGoal}>{item.goal.toLocaleString()} XP Rewards</Text>
                                    {isCurrent && (
                                        <View style={[styles.statusTag, { backgroundColor: acc + '26', borderColor: acc }]}>
                                            <View style={[styles.statusTagDot, { backgroundColor: acc }]} />
                                            <Text style={[styles.statusTagText, { color: acc }]}>CURRENT</Text>
                                        </View>
                                    )}
                                    {isCompleted && !isCurrent && (
                                        <View style={[styles.statusTag, { backgroundColor: 'rgba(16,185,129,0.18)', borderColor: '#10B981' }]}>
                                            <MaterialCommunityIcons name="check" size={9} color="#10B981" />
                                            <Text style={[styles.statusTagText, { color: '#10B981' }]}>UNLOCKED</Text>
                                        </View>
                                    )}
                                </View>
                                
                                {/* 🔥 DUAL RATE DISPLAY FOR EACH LEVEL (colour 1 pill + colour 2 pill) */}
                                <View style={styles.rateColumn}>
                                    <View style={[styles.rmRateBox, {backgroundColor: isLocked ? '#1e293b' : pv[0] + '2E', marginBottom: 2}]}>
                                        <Text style={[styles.rmRateText, {color: isLocked ? '#94A3B8' : pt[0]}]}>CALL: {item.rate}</Text>
                                    </View>
                                    <View style={[styles.rmRateBox, {backgroundColor: isLocked ? '#1e293b' : pv[1] + '2E'}]}>
                                        <Text style={[styles.rmRateText, {color: isLocked ? '#94A3B8' : pt[1]}]}>QUICK: {item.qmRate}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                        
                        return (
                            <Animated.View
                                key={item.lvl}
                                style={[
                                    styles.roadmapRow,
                                    {
                                        opacity: itemAnims[index],
                                        transform: [{ translateX: itemAnims[index].interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }]
                                    }
                                ]}
                            >
                                <View style={styles.timelineLeft}>
                                    <View style={[styles.verticalLine, isCompleted && {backgroundColor: '#10B981'}]} />
                                    {isCurrent && (
                                        <Animated.View
                                            style={[
                                                styles.markerHalo,
                                                { backgroundColor: acc, opacity: glowOpacity, transform: [{ scale: glowScale }] }
                                            ]}
                                        />
                                    )}
                                    <View style={[styles.markerDot, isCurrent && {backgroundColor: pv[0], shadowColor: pv[0], elevation: 10, borderColor: acc}, isCompleted && {backgroundColor: '#10B981'}]}>
                                        {isCompleted && <MaterialCommunityIcons name="check" size={11} color="#FFF" />}
                                        {isLocked && <MaterialCommunityIcons name="lock" size={9} color="#475569" />}
                                    </View>
                                </View>
                                
                                {/* 🆕 Current rank-ku rotating duotone frame */}
                                {isCurrent ? (
                                    <View style={styles.currentFrame}>
                                        <Animated.View style={[styles.currentFrameSpin, { transform: [{ rotate: spin }] }]} pointerEvents="none">
                                            <LinearGradient
                                                colors={g([pv[0], pv[1], pv[0], pv[1], pv[0]])}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={StyleSheet.absoluteFill}
                                            />
                                        </Animated.View>
                                        {cardNode}
                                    </View>
                                ) : (
                                    <View style={styles.cardSlot}>{cardNode}</View>
                                )}
                            </Animated.View>
                        );
                    })}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* 👑 ULTRA PREMIUM LEVEL-UP EXPERIENCE (full-screen cinematic, no boring box) */}
            <Modal visible={showModal} transparent animationType="none" onRequestClose={closeLevelUp}>
                <BlurView intensity={95} tint="dark" style={styles.modalOverlay}>
                    {/* Deep duotone atmosphere */}
                    <LinearGradient
                        colors={g([vc(0) + '55', '#05030FDD', vc(1) + '55'])}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                        pointerEvents="none"
                    />
                    <Animated.View pointerEvents="none" style={[styles.mAura, { top: -90, right: -120, backgroundColor: vc(0), opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
                    <Animated.View pointerEvents="none" style={[styles.mAura, { bottom: -110, left: -130, backgroundColor: vc(1), opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />

                    {/* 🆕 Duotone confetti rain */}
                    {confetti.map((c, i) => (
                        <Animated.View
                            key={i}
                            pointerEvents="none"
                            style={[
                                styles.confettiPiece,
                                {
                                    left: c.x,
                                    width: c.size,
                                    height: c.size * 1.6,
                                    backgroundColor: i % 4 === 0 ? acc : (i % 6 === 0 ? accLight : vc(i)),
                                    transform: [
                                        { translateY: c.v.interpolate({ inputRange: [0, 1], outputRange: [-40, height + 40] }) },
                                        { rotate: c.v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', i % 2 === 0 ? '720deg' : '-720deg'] }) }
                                    ]
                                }
                            ]}
                        />
                    ))}

                    <ScrollView
                        style={styles.mScroll}
                        contentContainerStyle={styles.mScrollContent}
                        showsVerticalScrollIndicator={false}
                    >
                        <Animated.View style={[styles.mContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] }]}>

                            {/* ===== 1. HERO EMBLEM (god-rays + shockwaves + avatar + crown) ===== */}
                            <Animated.View style={[styles.mStage, emblemIn]}>
                                {/* soft core glow */}
                                <Animated.View style={[styles.mGlow, { backgroundColor: vc(1), opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />

                                {/* expanding shockwave rings */}
                                {waves.map((w, i) => (
                                    <Animated.View
                                        key={i}
                                        pointerEvents="none"
                                        style={[
                                            styles.mWave,
                                            {
                                                borderColor: i % 2 === 0 ? acc : acc2,
                                                opacity: w.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.75, 0] }),
                                                transform: [{ scale: w.interpolate({ inputRange: [0, 1], outputRange: [0.5, 2.5] }) }]
                                            }
                                        ]}
                                    />
                                ))}

                                {/* rotating god-rays */}
                                <Animated.View style={[styles.mRaysStage, { transform: [{ rotate: spin }] }]} pointerEvents="none">
                                    {M_RAYS.map((i) => (
                                        <View key={i} style={[styles.mRayArm, { transform: [{ rotate: `${i * (360 / M_RAYS.length)}deg` }] }]}>
                                            <LinearGradient
                                                colors={g([i % 2 === 0 ? acc : acc2, 'transparent'])}
                                                style={[styles.mRayBeam, { height: i % 2 === 0 ? 38 : 22 }]}
                                            />
                                        </View>
                                    ))}
                                </Animated.View>

                                {/* tick ring (reverse) */}
                                <Animated.View style={[styles.mTickRing, { transform: [{ rotate: spinRev }] }]} pointerEvents="none">
                                    <Svg width={M_TICK} height={M_TICK}>
                                        <Circle
                                            cx={M_TICK / 2}
                                            cy={M_TICK / 2}
                                            r={M_TICK_R}
                                            stroke={acc}
                                            strokeOpacity={0.75}
                                            strokeWidth={2.5}
                                            strokeDasharray="1.5 9"
                                            fill="transparent"
                                        />
                                    </Svg>
                                </Animated.View>

                                {/* orbiting royal gems */}
                                <Animated.View style={[styles.mRaysStage, { transform: [{ rotate: spinRev }] }]} pointerEvents="none">
                                    {M_GEMS.map((s, i) => (
                                        <MaterialCommunityIcons
                                            key={i}
                                            name="rhombus"
                                            size={12}
                                            color={i % 2 === 0 ? acc : acc2}
                                            style={{ position: 'absolute', left: s.x, top: s.y }}
                                        />
                                    ))}
                                </Animated.View>

                                {/* dashed ring + gradient solid ring */}
                                <Animated.View style={[styles.mDashed, { borderColor: acc2 + '99', transform: [{ rotate: spin }] }]} />
                                <Svg width={M_RING} height={M_RING} style={styles.mRingSvg}>
                                    <Defs>
                                        <SvgLinearGradient id="mRingGrad" x1="0" y1="0" x2="1" y2="1">
                                            <Stop offset="0" stopColor={vc(0)} />
                                            <Stop offset="0.5" stopColor={vc(1)} />
                                            <Stop offset="1" stopColor={vc(0)} />
                                        </SvgLinearGradient>
                                    </Defs>
                                    <Circle
                                        cx={M_RING / 2}
                                        cy={M_RING / 2}
                                        r={M_RING_R}
                                        stroke="url(#mRingGrad)"
                                        strokeWidth={M_RING_STROKE}
                                        fill="transparent"
                                    />
                                </Svg>

                                {/* avatar + orbiting sparkles */}
                                <View style={styles.crownStage}>
                                    <Animated.View style={[styles.sparkleOrbit, { transform: [{ rotate: spin }] }]} pointerEvents="none">
                                        {SPARKLES.map((s, i) => (
                                            <MaterialCommunityIcons
                                                key={i}
                                                name="star-four-points"
                                                size={16}
                                                color={i % 3 === 0 ? acc : i % 3 === 1 ? '#FFF' : acc2}
                                                style={{ position: 'absolute', left: s.x, top: s.y }}
                                            />
                                        ))}
                                    </Animated.View>
                                    <View style={[styles.mAvatarFrame, { borderColor: acc, shadowColor: vc(0) }]}>
                                        <Image source={{ uri: avatarUri }} style={styles.avatarImg} />
                                    </View>
                                </View>

                                {/* floating crown */}
                                <Animated.View style={[styles.mCrown, { transform: [{ translateY: crownBob }] }]} pointerEvents="none">
                                    <MaterialCommunityIcons name="crown" size={44} color={acc} />
                                </Animated.View>

                                {/* rank badge */}
                                <LinearGradient colors={g([vc(0), vc(1)])} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.mRankBadge, { borderColor: accLight }]}>
                                    <MaterialCommunityIcons name={currentLevelInfo.lvl >= 7 ? 'crown' : 'star-face'} size={13} color="#FFF" />
                                    <Text style={styles.mRankBadgeText}>RANK {currentLevelInfo.lvl}</Text>
                                </LinearGradient>

                                <RoyalSparkle x={M_STAGE - 56} y={34} size={14} color={acc} delay={0} />
                                <RoyalSparkle x={30} y={M_STAGE - 80} size={12} color={acc2} delay={600} />
                                <RoyalSparkle x={46} y={40} size={10} color={accLight} delay={1100} />
                            </Animated.View>

                            {/* ===== 2. TITLE BLOCK ===== */}
                            <Animated.View style={[styles.mTitleBlock, stageIn(0.28, 0.5)]}>
                                <View style={styles.mLabelRow}>
                                    <LinearGradient colors={['transparent', acc]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.royalLine} />
                                    <Animated.View style={{ opacity: glowOpacity, transform: [{ translateY: crownBob }] }}>
                                        <MaterialCommunityIcons name="chevron-double-up" size={20} color={acc} />
                                    </Animated.View>
                                    <Text style={[styles.congratsLabel, { color: accLight }]}>NEW RANK UNLOCKED</Text>
                                    <Animated.View style={{ opacity: glowOpacity, transform: [{ translateY: crownBob }] }}>
                                        <MaterialCommunityIcons name="chevron-double-up" size={20} color={acc2} />
                                    </Animated.View>
                                    <LinearGradient colors={[acc2, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.royalLine} />
                                </View>
                                <Text style={[styles.congratsTitle, styles.mCongratsTitle, { textShadowColor: vc(0) }]}>CONGRATULATIONS!</Text>
                                <GradientText text={currentLevelInfo.label} colors={textGrad} fit style={styles.mLevelName} />
                                <Text style={styles.mSubText}>You have ascended to a higher tier of the Royal Network</Text>
                            </Animated.View>

                            {/* ===== 3. OLD RANK -> NEW RANK FLOW ===== */}
                            <Animated.View style={[styles.mFlowRow, stageIn(0.42, 0.66)]}>
                                <View style={styles.mFlowSide}>
                                    <LinearGradient colors={g([prevPal.vivid[0], prevPal.vivid[1], '#020617'])} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.mMedalSm, { borderColor: 'rgba(255,255,255,0.25)', opacity: 0.6 }]}>
                                        <Text style={styles.mMedalSmText}>{prevItem.lvl}</Text>
                                    </LinearGradient>
                                    <Text style={styles.mFlowLabelOld}>{prevItem.label}</Text>
                                </View>

                                <Animated.View style={{ opacity: glowOpacity }}>
                                    <MaterialCommunityIcons name="chevron-double-right" size={30} color={acc} />
                                </Animated.View>

                                <View style={styles.mFlowSide}>
                                    <Animated.View style={[styles.mMedalHalo, { borderColor: acc, opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
                                    <LinearGradient colors={g([vc(0), vc(1), '#020617'])} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.mMedalLg, { borderColor: acc }]}>
                                        <Text style={styles.mMedalLgText}>{currentLevelInfo.lvl}</Text>
                                    </LinearGradient>
                                    <GradientText text={currentLevelInfo.label} colors={textGrad} style={styles.mFlowLabelNew} />
                                </View>
                            </Animated.View>

                            {/* ===== 4. NEW RATE CARDS (old -> new count-up) ===== */}
                            <View style={styles.mRateRow}>
                                <Animated.View style={[styles.mRateWrap, stageIn(0.54, 0.78)]}>
                                    <BlurView intensity={30} tint="dark" style={[styles.mRateCard, { borderColor: acc + '66' }]}>
                                        <LinearGradient colors={g([vc(0), vc(1)])} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statTopLine} />
                                        <View style={styles.statIconRow}>
                                            <LinearGradient colors={g([vc(0), vc(1)])} style={styles.statIcon}>
                                                <MaterialCommunityIcons name="phone-in-talk" size={13} color="#FFF" />
                                            </LinearGradient>
                                            <Text style={styles.hStatLabel}>NEW CALL RATE</Text>
                                        </View>
                                        <View style={styles.mOldRow}>
                                            <Text style={styles.mOldRate}>{prevItem.rate}</Text>
                                            <MaterialCommunityIcons name="arrow-right" size={12} color="#64748B" />
                                        </View>
                                        <Text style={[styles.mNewRate, { color: acc }]} numberOfLines={1} adjustsFontSizeToFit>{modalRates.call.toLocaleString()}</Text>
                                        {modalDeltaCall > 0 ? (
                                            <View style={[styles.mDeltaPill, { borderColor: ROYAL.emerald + '99' }]}>
                                                <MaterialCommunityIcons name="trending-up" size={11} color={ROYAL.emerald} />
                                                <Text style={[styles.perkText, { color: ROYAL.emerald }]}>+{modalDeltaCall}</Text>
                                            </View>
                                        ) : (
                                            <View style={[styles.mDeltaPill, { borderColor: 'rgba(255,255,255,0.2)' }]}>
                                                <Text style={[styles.perkText, { color: '#94A3B8' }]}>SAME RATE</Text>
                                            </View>
                                        )}
                                    </BlurView>
                                </Animated.View>

                                <Animated.View style={[styles.mRateWrap, stageIn(0.64, 0.88)]}>
                                    <BlurView intensity={30} tint="dark" style={[styles.mRateCard, { borderColor: acc2 + '66' }]}>
                                        <LinearGradient colors={g([vc(1), vc(0)])} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.statTopLine} />
                                        <View style={styles.statIconRow}>
                                            <LinearGradient colors={g([vc(1), vc(0)])} style={styles.statIcon}>
                                                <MaterialCommunityIcons name="flash" size={13} color="#FFF" />
                                            </LinearGradient>
                                            <Text style={styles.hStatLabel}>NEW QUICK RATE</Text>
                                        </View>
                                        <View style={styles.mOldRow}>
                                            <Text style={styles.mOldRate}>{prevItem.qmRate}</Text>
                                            <MaterialCommunityIcons name="arrow-right" size={12} color="#64748B" />
                                        </View>
                                        <Text style={[styles.mNewRate, { color: acc2 }]} numberOfLines={1} adjustsFontSizeToFit>{modalRates.quick.toLocaleString()}</Text>
                                        {modalDeltaQuick > 0 ? (
                                            <View style={[styles.mDeltaPill, { borderColor: ROYAL.emerald + '99' }]}>
                                                <MaterialCommunityIcons name="trending-up" size={11} color={ROYAL.emerald} />
                                                <Text style={[styles.perkText, { color: ROYAL.emerald }]}>+{modalDeltaQuick}</Text>
                                            </View>
                                        ) : (
                                            <View style={[styles.mDeltaPill, { borderColor: 'rgba(255,255,255,0.2)' }]}>
                                                <Text style={[styles.perkText, { color: '#94A3B8' }]}>SAME RATE</Text>
                                            </View>
                                        )}
                                    </BlurView>
                                </Animated.View>
                            </View>

                            {/* ===== 5. NEXT GOAL LINE ===== */}
                            <Animated.View style={[styles.mNextRow, { borderColor: acc + '55' }, stageIn(0.72, 0.92)]}>
                                {nextLevelItem ? (
                                    <>
                                        <MaterialCommunityIcons name="arrow-up-bold-circle" size={14} color={nextPalT[0]} />
                                        <Text style={styles.mNextText} numberOfLines={1}>
                                            NEXT: <Text style={{ color: nextPalT[0], fontWeight: '900' }}>{nextLevelItem.label}</Text> AT {nextLevelItem.goal.toLocaleString()}
                                        </Text>
                                    </>
                                ) : (
                                    <>
                                        <MaterialCommunityIcons name="crown" size={14} color={acc} />
                                        <Text style={[styles.mNextText, { color: acc }]} numberOfLines={1}>MAX RANK - YOU ARE A LEGEND</Text>
                                    </>
                                )}
                            </Animated.View>

                            {/* ===== 6. CLAIM BUTTON (shine sweep) ===== */}
                            <Animated.View style={[styles.mBtnOuter, stageIn(0.8, 1)]}>
                                <TouchableOpacity activeOpacity={0.85} onPress={closeLevelUp} style={styles.claimBtnWrap}>
                                    <LinearGradient colors={g([vc(0), vc(1)])} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.claimBtn, styles.mClaimBtn]}>
                                        <Animated.View pointerEvents="none" style={[styles.cardSweep, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
                                            <LinearGradient colors={['transparent', 'rgba(255,255,255,0.35)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                                        </Animated.View>
                                        <MaterialCommunityIcons name="crown" size={20} color="#FFF" />
                                        <Text style={styles.claimBtnText}>MASSIVE! CLAIM</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        </Animated.View>
                    </ScrollView>

                    {/* cinematic entry flash */}
                    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: accLight, opacity: flashOpacity }]} />
                </BlurView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1 },
    // 🔥 AMBIENT SHIMMER ORBS
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
    particle: { position: 'absolute' },
    container: { padding: 15 },

    // 🆕 ROYAL HEADERS / DIVIDERS
    royalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 20 },
    royalLine: { flex: 1, height: 1.5, borderRadius: 1 },
    royalTitle: { fontSize: 13, fontWeight: '900', letterSpacing: 2 },
    royalDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },

    // 🆕 COMPACT HERO (one-screen fit)
    heroWrapper: { marginTop: 6, marginBottom: 22, borderRadius: 34, backgroundColor: '#0A0620', elevation: 22, shadowOpacity: 0.55, shadowRadius: 22, shadowOffset: { width: 0, height: 10 } },
    heroFrame: { borderRadius: 34, overflow: 'hidden', padding: 3, backgroundColor: '#0A0620' },
    heroFrameSpin: { position: 'absolute', top: '50%', left: '50%', width: 900, height: 900, marginLeft: -450, marginTop: -450 },
    heroCard: { borderRadius: 31, padding: 15, overflow: 'hidden', position: 'relative' },
    heroGlow: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.05)' },
    heroSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
    heroInnerRim: { ...StyleSheet.absoluteFillObject, borderRadius: 31, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
    cornerStar: { position: 'absolute', zIndex: 5 },
    heroSweep: { position: 'absolute', top: -60, bottom: -60, width: 90 },
    heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
    rankChip: { paddingHorizontal: 11, paddingVertical: 5, borderRadius: 12 },
    rankChipText: { color: '#FFF', fontSize: 9.5, fontWeight: '900', letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
    badgeLabel: { fontSize: 10.5, fontWeight: '900', letterSpacing: 1.5, marginBottom: 5 },

    // 🆕 AVATAR + RING + RAYS (compact, left) + INFO (right)
    heroMiddleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    ringBox: { width: HERO_STAGE, height: HERO_STAGE, justifyContent: 'center', alignItems: 'center' },
    ringGlow: { position: 'absolute', width: 96, height: 96, borderRadius: 48, filter: 'blur(24px)' },
    raysStage: { position: 'absolute', width: HERO_STAGE, height: HERO_STAGE },
    rayArm: { position: 'absolute', width: HERO_STAGE, height: HERO_STAGE, alignItems: 'center' },
    rayBeam: { width: 2.5, height: 14, borderRadius: 2 },
    tickRing: { position: 'absolute', width: TICK_SIZE, height: TICK_SIZE },
    dashedRing: { position: 'absolute', width: 124, height: 124, borderRadius: 62, borderWidth: 1.5, borderStyle: 'dashed' },
    ringSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
    avatarFrame: { width: 78, height: 78, borderRadius: 39, borderWidth: 2.5, overflow: 'hidden', backgroundColor: '#0F172A', elevation: 12 },
    avatarImg: { width: '100%', height: '100%' },
    floatCrown: { position: 'absolute', top: 2, alignSelf: 'center' },
    crestBadge: { position: 'absolute', top: 34, right: 17, width: 30, height: 30, borderRadius: 15, borderWidth: 2, justifyContent: 'center', alignItems: 'center', elevation: 10 },
    ringPercentChip: { position: 'absolute', bottom: 12, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, borderWidth: 1.5, borderColor: GOLD },
    ringPercentText: { color: '#FFF', fontSize: 10.5, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
    heroInfoCol: { flex: 1, marginLeft: 4, justifyContent: 'center' },
    heroName: { color: 'rgba(255,255,255,0.92)', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    heroNameLine: { height: 1.5, width: '70%', marginTop: 3, borderRadius: 1 },
    heroTitle: { color: '#FFF', fontSize: 26, fontWeight: '900', marginTop: 2, textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
    expertVerifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    expertType: { fontSize: 10.5, fontWeight: '800' },
    nextChip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)', maxWidth: '100%' },
    nextChipText: { color: '#F1F5F9', fontSize: 10.5, fontWeight: '900', letterSpacing: 0.5, flexShrink: 1 },

    heroStatsContainer: { flexDirection: 'row', gap: 10, marginTop: 12 },
    heroStatBox: { flex: 1, padding: 11, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    statTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
    statIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    statIcon: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    hStatLabel: { color: 'rgba(255,255,255,0.88)', fontSize: 10, fontWeight: '900', flexShrink: 1 },
    hValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'nowrap' }, 
    hStatValue: { color: '#FFF', fontSize: 16, fontWeight: '900', flex: 1 }, 
    dualRateContainer: { flexDirection: 'column', marginTop: 0, gap: 1 },
    heroRateText: { color: '#FFF', fontSize: 12.5, fontWeight: '800', letterSpacing: 0.5 },
    massProgressSection: { marginTop: 14 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    progressTitle: { color: '#FFF', fontSize: 11.5, fontWeight: '900', letterSpacing: 1.5 },
    progressPercent: { fontSize: 16, fontWeight: '900' },
    trackWrap: { height: 14, justifyContent: 'center' },
    megaTrack: { height: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    megaFillWrap: { height: '100%' },
    megaFill: { height: '100%', borderRadius: 10, position: 'relative', overflow: 'hidden' },
    shimmerLayer: { width: '50%', height: '100%', backgroundColor: 'rgba(255,255,255,0.2)', position: 'absolute' },
    tick: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(255,255,255,0.15)', zIndex: 2 },
    knobTrack: { position: 'absolute', left: 0, top: 0, bottom: 0, alignItems: 'flex-end', justifyContent: 'center' },
    knob: { width: 14, height: 14, borderRadius: 7, marginRight: -4, borderWidth: 2, borderColor: '#FFF', shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
    remainingBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 7, borderRadius: 14, marginTop: 10 },
    maxBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
    remainingText: { color: '#E2E8F0', fontSize: 11.5, textAlign: 'center', fontWeight: '800', letterSpacing: 0.5 },

    sectionHeader: { fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 20, marginLeft: 10 },

    // 🆕 NEXT REWARD CARD
    nextCardWrap: { marginBottom: 28, borderRadius: 28, backgroundColor: '#0A0620', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 9 },
    nextCardBorder: { borderRadius: 28, padding: 1.5 },
    nextCardInner: { borderRadius: 26.5, overflow: 'hidden', backgroundColor: 'rgba(10,6,32,0.97)', padding: 16, flexDirection: 'row', alignItems: 'center' },
    nextMedalBox: { width: 70, height: 70, justifyContent: 'center', alignItems: 'center' },
    nextMedalHalo: { position: 'absolute', width: 68, height: 68, borderRadius: 34, borderWidth: 2 },
    nextMedal: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 2, elevation: 8 },
    nextMedalText: { color: '#FFF', fontSize: 22, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
    nextTitle: { fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
    nextSub: { color: '#CBD5E1', fontSize: 12, fontWeight: '700', marginTop: 3 },
    perkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 9 },
    perkPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
    perkText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },

    // 🆕 MEDAL STRIP
    medalStrip: { paddingHorizontal: 8, paddingVertical: 10, gap: 12 },
    medalThread: { position: 'absolute', left: 36, right: 36, top: 36, height: 2.5, borderRadius: 2, opacity: 0.4 },
    medalWrap: { width: 56, alignItems: 'center', justifyContent: 'center' },
    medalHalo: { position: 'absolute', top: -4, width: 62, height: 62, borderRadius: 31, borderWidth: 2 },
    medal: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', elevation: 6 },
    medalLabel: { marginTop: 6, fontSize: 11.5, fontWeight: '900', letterSpacing: 0.5 },

    roadmapBox: { paddingHorizontal: 5 },
    roadmapRow: { flexDirection: 'row', height: 96, alignItems: 'center' },
    timelineLeft: { width: 30, alignItems: 'center', height: '100%', justifyContent: 'center' },
    verticalLine: { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', position: 'absolute', top: 0, bottom: 0 },
    markerHalo: { position: 'absolute', width: 26, height: 26, borderRadius: 13 },
    markerDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#1e293b', zIndex: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.15)' },
    cardSlot: { flex: 1, marginLeft: 15 },
    currentFrame: { flex: 1, marginLeft: 15, borderRadius: 27, overflow: 'hidden', padding: 2, backgroundColor: '#0A0620' },
    currentFrameSpin: { position: 'absolute', top: '50%', left: '50%', width: 420, height: 420, marginLeft: -210, marginTop: -210 },
    roadmapCard: { flex: 1, height: 80, borderRadius: 25, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, overflow: 'hidden' },
    cardSweep: { position: 'absolute', top: -40, bottom: -40, left: 0, width: 60 },
    rmMedal: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
    rmMedalText: { fontSize: 15, fontWeight: '900' },
    rmLabel: { fontSize: 15, fontWeight: '900' },
    rmGoal: { color: '#CBD5E1', fontSize: 11.5, fontWeight: '700', marginTop: 2 },
    statusTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, marginTop: 4 },
    statusTagDot: { width: 5, height: 5, borderRadius: 3 },
    statusTagText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.5 },
    rateColumn: { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' },
    rmRateBox: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rmRateText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.3 },

    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    confettiPiece: { position: 'absolute', top: 0, borderRadius: 2 },
    modalContent: { width: width * 0.85, borderRadius: 40, overflow: 'hidden' },
    modalGradient: { padding: 40, alignItems: 'center' },
    fireworkContainer: { marginBottom: 10 },
    congratsLabel: { color: '#FBBF24', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
    congratsTitle: { color: '#FFF', fontSize: 26, fontWeight: '900', marginTop: 5 },
    modalRankCard: { width: '100%', padding: 30, borderRadius: 30, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', marginVertical: 30 },
    crownStage: { width: 180, height: 180, justifyContent: 'center', alignItems: 'center' },
    crownGlow: { position: 'absolute', width: 110, height: 110, borderRadius: 55, filter: 'blur(26px)' },
    sparkleOrbit: { position: 'absolute', width: 180, height: 180 },
    modalLevelName: { fontSize: 22, fontWeight: '900', marginTop: 15, textAlign: 'center' },
    newBenefitBox: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15, marginTop: 15, alignItems: 'center', gap: 5 },
    benefitText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
    claimBtnWrap: { width: '100%', borderRadius: 25, overflow: 'hidden', elevation: 10 },
    claimBtn: { width: '100%', padding: 20, alignItems: 'center' },
    claimBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },

    // 👑 NEW: ULTRA PREMIUM LEVEL-UP MODAL STYLES
    mAura: { position: 'absolute', width: 420, height: 420, borderRadius: 210, filter: 'blur(90px)' },
    mScroll: { width: '100%' },
    mScrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 36 },
    mContent: { width: width * 0.9, alignItems: 'center' },

    // emblem
    mStage: { width: M_STAGE, height: M_STAGE, justifyContent: 'center', alignItems: 'center' },
    mGlow: { position: 'absolute', width: 150, height: 150, borderRadius: 75, filter: 'blur(34px)' },
    mWave: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 2 },
    mRaysStage: { position: 'absolute', width: M_STAGE, height: M_STAGE },
    mRayArm: { position: 'absolute', width: M_STAGE, height: M_STAGE, alignItems: 'center' },
    mRayBeam: { width: 2.5, height: 30, borderRadius: 2 },
    mTickRing: { position: 'absolute', width: M_TICK, height: M_TICK },
    mDashed: { position: 'absolute', width: 214, height: 214, borderRadius: 107, borderWidth: 1.5, borderStyle: 'dashed' },
    mRingSvg: { position: 'absolute' },
    mAvatarFrame: { width: 112, height: 112, borderRadius: 56, borderWidth: 3.5, overflow: 'hidden', backgroundColor: '#0F172A', elevation: 16, shadowOpacity: 0.9, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
    mCrown: { position: 'absolute', top: 30, alignSelf: 'center' },
    mRankBadge: { position: 'absolute', bottom: 22, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14, borderWidth: 1.5, elevation: 10 },
    mRankBadgeText: { color: '#FFF', fontSize: 11.5, fontWeight: '900', letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },

    // title block
    mTitleBlock: { width: '100%', alignItems: 'center', marginTop: 2 },
    mLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%' },
    mCongratsTitle: { fontSize: 24, letterSpacing: 3, textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } },
    mLevelName: { fontSize: 36, fontWeight: '900', letterSpacing: 1, marginTop: 2, width: '100%', textAlign: 'center' },
    mSubText: { color: '#CBD5E1', fontSize: 11.5, fontWeight: '700', letterSpacing: 0.5, marginTop: 4, textAlign: 'center' },

    // old -> new flow
    mFlowRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', marginTop: 20 },
    mFlowSide: { alignItems: 'center', justifyContent: 'center', width: 120 },
    mMedalSm: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
    mMedalSmText: { color: '#FFF', fontSize: 17, fontWeight: '900' },
    mMedalLg: { width: 60, height: 60, borderRadius: 30, borderWidth: 2.5, justifyContent: 'center', alignItems: 'center', elevation: 10 },
    mMedalLgText: { color: '#FFF', fontSize: 26, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
    mMedalHalo: { position: 'absolute', top: -5, width: 70, height: 70, borderRadius: 35, borderWidth: 2 },
    mFlowLabelOld: { color: '#94A3B8', fontSize: 10.5, fontWeight: '800', letterSpacing: 0.5, marginTop: 6 },
    mFlowLabelNew: { fontSize: 12, fontWeight: '900', letterSpacing: 0.5, marginTop: 6 },

    // rate cards
    mRateRow: { width: '100%', flexDirection: 'row', gap: 12, marginTop: 20 },
    mRateWrap: { flex: 1 },
    mRateCard: { padding: 12, borderRadius: 22, overflow: 'hidden', borderWidth: 1, alignItems: 'flex-start' },
    mOldRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    mOldRate: { color: '#64748B', fontSize: 12, fontWeight: '800', textDecorationLine: 'line-through' },
    mNewRate: { fontSize: 28, fontWeight: '900', letterSpacing: 0.5, width: '100%' },
    mDeltaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, borderWidth: 1, marginTop: 6, backgroundColor: 'rgba(255,255,255,0.04)' },

    // next goal + button
    mNextRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)', maxWidth: '100%' },
    mNextText: { color: '#E2E8F0', fontSize: 11, fontWeight: '800', letterSpacing: 0.5, flexShrink: 1 },
    mBtnOuter: { width: '100%', marginTop: 22 },
    mClaimBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, overflow: 'hidden' }
});
