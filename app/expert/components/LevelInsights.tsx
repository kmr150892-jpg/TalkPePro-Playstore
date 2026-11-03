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
import Svg, { Circle, Defs, Path, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { db } from '../../../firebaseConfig';

const { width, height } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);

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

// 🆕 🪙 3D MEDAL (bevelled coin: thickness edge + glossy highlight + optional spinning coin + contact shadow)
// state: 'locked' | 'current' | 'done' | 'open'   mode: 'number' | 'icon'
const Medal3D = ({ size, pv, pt, state, lvl, mode = 'number', iconName, spin, coin, bob, halo, glowOpacity, glowScale }: any) => {
    const locked = state === 'locked';
    const current = state === 'current';
    const done = state === 'done';
    const inner = size - 12;
    const faceColors: any = locked ? ['#334155', '#111827'] : g([lighten(pv[0], 0.45), pv[0], pv[1], darken(pv[1], 0.6)]);
    const coreColors: any = locked ? ['#1e293b', '#0b1220'] : g([pv[0], pv[1], darken(pv[1], 0.65)]);
    const edgeColor = locked ? '#0b1220' : darken(pv[1], 0.55);
    const iconSize = Math.round(inner * 0.55);
    const resolvedIcon = iconName || (done ? 'check-decagram' : (lvl >= 7 ? 'crown' : 'star-face'));
    return (
        <View style={{ width: size + 16, height: size + 24, alignItems: 'center', justifyContent: 'center' }}>
            {current && halo ? (
                <Animated.View
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        width: size + 16,
                        height: size + 16,
                        borderRadius: (size + 16) / 2,
                        borderWidth: 2,
                        borderColor: halo,
                        opacity: glowOpacity,
                        transform: [{ scale: glowScale }]
                    }}
                />
            ) : null}
            {/* contact shadow on the ground */}
            <View style={{ position: 'absolute', bottom: 2, width: size * 0.78, height: 9, borderRadius: 6, backgroundColor: locked ? 'rgba(0,0,0,0.45)' : pv[0] + '66' }} />
            <Animated.View style={{ width: size, height: size, transform: [{ perspective: 700 }, { translateY: bob || 0 }, { rotateY: spin && coin ? coin : '0deg' }] }}>
                {/* coin thickness */}
                <View style={{ position: 'absolute', top: 4, left: 0, width: size, height: size, borderRadius: size / 2, backgroundColor: edgeColor }} />
                <LinearGradient
                    colors={faceColors}
                    start={{ x: 0.1, y: 0 }}
                    end={{ x: 0.9, y: 1 }}
                    style={{
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderWidth: current ? 2 : 1.5,
                        borderColor: locked ? 'rgba(255,255,255,0.18)' : (current ? pt[0] : pt[1]),
                        elevation: 8,
                        opacity: locked ? 0.8 : 1
                    }}
                >
                    <LinearGradient
                        colors={coreColors}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={{ width: inner, height: inner, borderRadius: inner / 2, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' }}
                    >
                        {locked ? (
                            <MaterialCommunityIcons name="lock" size={Math.round(inner * 0.45)} color="#64748B" />
                        ) : mode === 'icon' || iconName ? (
                            <MaterialCommunityIcons name={resolvedIcon} size={iconSize} color="#FFF" />
                        ) : (
                            <Text style={{ color: '#FFF', fontSize: Math.round(inner * 0.52), fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } }}>{lvl}</Text>
                        )}
                    </LinearGradient>
                    {/* glossy highlight */}
                    <View
                        pointerEvents="none"
                        style={{ position: 'absolute', top: size * 0.08, left: size * 0.16, width: size * 0.42, height: size * 0.2, borderRadius: size * 0.1, backgroundColor: 'rgba(255,255,255,0.32)', transform: [{ rotate: '-28deg' }] }}
                    />
                </LinearGradient>
            </Animated.View>
            {done && (
                <View style={{ position: 'absolute', right: 3, bottom: 12, width: 18, height: 18, borderRadius: 9, backgroundColor: ROYAL.emerald, borderWidth: 1.5, borderColor: ROYAL.bg0, alignItems: 'center', justifyContent: 'center', zIndex: 5 }}>
                    <MaterialCommunityIcons name="check" size={11} color="#FFF" />
                </View>
            )}
        </View>
    );
};

// 🆕 Progress ring geometry (avatar-ah suththi varra ring)
const RING_SIZE = 126;
const RING_STROKE = 7;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = RING_RADIUS * 2 * Math.PI;

// 🆕 Royal tick ring + rays
const TICK_SIZE = 164;
const TICK_RADIUS = 78;
const RAYS = Array.from({ length: 16 }, (_, i) => i);
const HERO_STAGE = 204;

// 🆕 Level-up modal sparkle positions (crown-ah suththi)
const SPARKLES = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
    const a = (i / 8) * 2 * Math.PI;
    return { x: 90 + 78 * Math.cos(a) - 9, y: 90 + 78 * Math.sin(a) - 9 };
});

// 🆕 Orbiting gems around hero avatar
const GEM_POS = [0, 1, 2].map((i) => {
    const a = (i / 3) * 2 * Math.PI;
    return { x: HERO_STAGE / 2 + 84 * Math.cos(a) - 5, y: HERO_STAGE / 2 + 84 * Math.sin(a) - 5 };
});

// 👑 ULTRA PREMIUM LEVEL-UP EMBLEM geometry (god-rays + tick ring + shockwaves)
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

// 🛣️ MILESTONE ROAD geometry (L0 bottom -> L10 top, FULL-SCREEN-WIDE road winds left <-> right)
const ROAD_W = width;                       // 🆕 full screen width (edge to edge)
const ROW_H = 196;                          // 🆕 taller rows -> long, broad road
const NODE = 84;                            // 🆕 big medals
const ROAD_TOP_PAD = 70;
const ROAD_BOTTOM_PAD = 190;                // room for the L0 detail panel + start sign
const ROAD_H = ROAD_TOP_PAD + ALL_LEVELS.length * ROW_H + ROAD_BOTTOM_PAD;
const LANE = 66;                            // 🆕 broad road lane
const PANEL_W = ROAD_W - 24;                // 🆕 tap-to-open detail panel
const PANEL_H = 188;
const nodeX = (lvl: number) => (lvl % 2 === 0 ? ROAD_W * 0.2 : ROAD_W * 0.8);
const nodeY = (lvl: number) => ROAD_TOP_PAD + (ALL_LEVELS.length - 1 - lvl) * ROW_H + ROW_H / 2;
const START_Y = ROAD_H - 30;

const segPath = (i: number) => {
    const x1 = nodeX(i), y1 = nodeY(i), x2 = nodeX(i + 1), y2 = nodeY(i + 1);
    const off = ROW_H * 0.7;
    return `M ${x1} ${y1} C ${x1} ${y1 - off} ${x2} ${y2 + off} ${x2} ${y2}`;
};
const segLength = (i: number) => {
    const x1 = nodeX(i), y1 = nodeY(i), x2 = nodeX(i + 1), y2 = nodeY(i + 1);
    const off = ROW_H * 0.7;
    const p = [[x1, y1], [x1, y1 - off], [x2, y2 + off], [x2, y2]];
    let len = 0;
    let prev = p[0];
    for (let s = 1; s <= 30; s++) {
        const t = s / 30;
        const u = 1 - t;
        const x = u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0];
        const y = u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1];
        len += Math.sqrt((x - prev[0]) ** 2 + (y - prev[1]) ** 2);
        prev = [x, y];
    }
    return len;
};
const SEGMENTS = Array.from({ length: ALL_LEVELS.length - 1 }, (_, i) => ({ d: segPath(i), len: segLength(i) }));
const TAIL_D = `M ${nodeX(0)} ${START_Y} L ${nodeX(0)} ${nodeY(0)}`;

export default function LevelInsights({ expertData }: any) {
    const [showModal, setShowModal] = useState(false);
    const [displayBeans, setDisplayBeans] = useState(0);
    const [displayPercent, setDisplayPercent] = useState(0);
    // 🆕 Level-up modal: previous level + animated count-up rates
    const [prevLevel, setPrevLevel] = useState(0);
    const [modalRates, setModalRates] = useState({ call: 0, quick: 0 });
    // 🛣️ road section top offset (for "jump to my rank")
    const [roadTop, setRoadTop] = useState(0);
    // 🆕 which level's detail panel is open on the road (tap a medal -> magic open)
    const [openLvl, setOpenLvl] = useState<number | null>(null);

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
    const countAnim = useRef(new Animated.Value(0)).current;   // ring + progress bar + road fill + count-up numbers
    const rotAnim = useRef(new Animated.Value(0)).current;     // rotating frames / rays / sparkles
    const pulseAnim = useRef(new Animated.Value(0)).current;   // glow pulse (current rank)
    const sweepAnim = useRef(new Animated.Value(0)).current;   // hero card shine sweep
    const heroAnim = useRef(new Animated.Value(0)).current;    // hero entrance
    const itemAnims = useRef(ALL_LEVELS.map(() => new Animated.Value(0))).current; // road milestone stagger entrance
    const openAnims = useRef(ALL_LEVELS.map(() => new Animated.Value(0))).current; // 🆕 detail panel magic-open per level
    const nextAnim = useRef(new Animated.Value(0)).current;    // 🆕 next-reward card entrance
    const medalScrollRef = useRef<ScrollView>(null);
    const mainScrollRef = useRef<ScrollView>(null);

    // 🆕 3D animation values
    const tiltAnim = useRef(new Animated.Value(0)).current;    // slow 3D sway for hero card + modal emblem
    const coinAnim = useRef(new Animated.Value(0)).current;    // coin spin for current / next medal

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
        const running: Animated.CompositeAnimation[] = [];
        const run = (a: Animated.CompositeAnimation) => { a.start(); running.push(a); return a; };

        // Linear shimmer for progress bar
        run(Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.linear }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        ));

        // Sinusoidal float for background orbs
        run(Animated.loop(
            Animated.timing(orbAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true
            })
        ));

        // 🆕 Rotation (frames, rays, dashed ring)
        run(Animated.loop(
            Animated.timing(rotAnim, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true })
        ));

        // 🆕 Glow pulse
        run(Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ));

        // 🆕 3D sway (hero card + modal emblem)
        run(Animated.loop(
            Animated.sequence([
                Animated.timing(tiltAnim, { toValue: 1, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(tiltAnim, { toValue: 0, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ));

        // 🆕 Coin spin (current + next medal) - spin, then rest
        run(Animated.loop(
            Animated.sequence([
                Animated.timing(coinAnim, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
                Animated.delay(3200),
                Animated.timing(coinAnim, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        ));

        // 🆕 Hero card shine sweep (every few seconds)
        run(Animated.loop(
            Animated.sequence([
                Animated.delay(1800),
                Animated.timing(sweepAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(sweepAnim, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        ));

        // 🆕 Floating particles
        particles.forEach((p) => {
            run(Animated.loop(
                Animated.sequence([
                    Animated.delay(p.delay),
                    Animated.timing(p.v, { toValue: 1, duration: p.dur, easing: Easing.linear, useNativeDriver: true }),
                    Animated.timing(p.v, { toValue: 0, duration: 0, useNativeDriver: true })
                ])
            ));
        });

        // 🆕 Hero entrance + road stagger
        run(Animated.spring(heroAnim, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }));
        run(Animated.spring(nextAnim, { toValue: 1, delay: 350, tension: 40, friction: 8, useNativeDriver: true }));
        run(Animated.stagger(
            70,
            itemAnims.map((a) => Animated.timing(a, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }))
        ));

        return () => running.forEach((a) => a.stop());
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

    // 🛣️ jump to my current milestone on the road
    const jumpToMyRank = () => {
        mainScrollRef.current?.scrollTo({ y: Math.max(0, roadTop + nodeY(currentLevelInfo.lvl) - height * 0.32), animated: true });
    };

    // 🆕 ✨ tap a level medal -> details panel magic-open (tap again = close)
    const toggleLevel = (lvl: number) => {
        if (openLvl === lvl) {
            Animated.timing(openAnims[lvl], { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
                setOpenLvl((c) => (c === lvl ? null : c));
            });
            return;
        }
        openAnims[lvl].setValue(0);
        setOpenLvl(lvl);
        Animated.spring(openAnims[lvl], { toValue: 1, tension: 55, friction: 7, useNativeDriver: true }).start();
        mainScrollRef.current?.scrollTo({ y: Math.max(0, roadTop + nodeY(lvl) - height * 0.32), animated: true });
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
    const medalBob = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });

    // 🆕 3D interpolations
    const tiltY = tiltAnim.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] });
    const tiltX = tiltAnim.interpolate({ inputRange: [0, 1], outputRange: ['1.5deg', '-1.5deg'] });
    const coinRot = coinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const pedestalScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

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

    // 🛣️ how much of each road segment is lit (done = full, current = progress %, locked = 0)
    const segFill = (i: number) => {
        const upGoal = ALL_LEVELS[i + 1].goal;
        if (totalBeans >= upGoal) return 1;
        if (currentLevelInfo.lvl === i) return progressPercent / 100;
        return 0;
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

            <ScrollView ref={mainScrollRef} style={styles.container} showsVerticalScrollIndicator={false}>
                
                {/* 🔥 3D FLOATING HERO (COMPACT: avatar on a glowing pedestal on the left, info on the right) */}
                <Animated.View
                    style={[
                        styles.heroWrapper,
                        {
                            shadowColor: vc(0),
                            opacity: heroAnim,
                            transform: [
                                { perspective: 1100 },
                                { rotateY: tiltY },
                                { rotateX: tiltX },
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

                        {/* 🆕 COMPACT STAGE: ring + avatar + rays (left) + host info (right) */}
                        <View style={styles.heroMiddleRow}>
                          <View style={styles.heroStageCol}>
                            <View style={styles.heroStageBox}>
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
                                <RoyalSparkle x={HERO_STAGE - 44} y={18} size={11} color={acc} delay={0} />
                                <RoyalSparkle x={14} y={HERO_STAGE - 60} size={10} color={acc2} delay={700} />
                                <RoyalSparkle x={26} y={28} size={9} color={accLight} delay={1300} />

                                {/* 🆕 Floating crown */}
                                <Animated.View style={[styles.floatCrown, { transform: [{ translateY: crownBob }] }]} pointerEvents="none">
                                    <MaterialCommunityIcons name="crown" size={24} color={acc} />
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
                            </View>

                            {/* 🆕 3D pedestal under the avatar */}
                            <Animated.View pointerEvents="none" style={[styles.pedestalOuter, { backgroundColor: vc(1) + '33', borderColor: vc(0) + '88', transform: [{ scaleX: pedestalScale }] }]}>
                                <View style={[styles.pedestalCore, { backgroundColor: vc(0) + '55' }]} />
                            </Animated.View>
                          </View>

                            {/* 🆕 Host info (right side) */}
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
                            transform: [{ perspective: 900 }, { rotateX: '4deg' }, { translateY: nextAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }]
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
                                {nextLevelItem ? (
                                    <Medal3D size={52} pv={nextPal} pt={nextPalT} state="open" lvl={nextLevelItem.lvl} mode="number" spin coin={coinRot} bob={medalBob} />
                                ) : (
                                    <Medal3D size={52} pv={nextPal} pt={nextPalT} state="open" lvl={10} iconName="crown" spin coin={coinRot} bob={medalBob} />
                                )}
                            </View>

                            <View style={{ flex: 1, marginLeft: 10 }}>
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

                {/* 🆕 RANK MEDALS STRIP (3D coins) */}
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
                        const state = isCurrent ? 'current' : isLocked ? 'locked' : isCompleted ? 'done' : 'open';
                        return (
                            <View key={item.lvl} style={styles.medalWrap}>
                                <Medal3D
                                    size={42}
                                    pv={pal.vivid}
                                    pt={pal.text}
                                    state={state}
                                    lvl={item.lvl}
                                    mode="icon"
                                    spin={isCurrent}
                                    coin={coinRot}
                                    bob={isCurrent ? medalBob : 0}
                                    halo={acc}
                                    glowOpacity={glowOpacity}
                                    glowScale={glowScale}
                                />
                                {isCurrent && <RoyalSparkle x={40} y={-2} size={10} color={acc} delay={0} />}
                                <Text style={[styles.medalLabel, { color: isLocked ? '#94A3B8' : pal.text[0] }]}>L{item.lvl}</Text>
                            </View>
                        );
                    })}
                </ScrollView>

                {/* 🛣️ ELITE ROADMAP = FULL-WIDTH winding road, only level medals (L0 bottom -> L10 top). TAP a medal = details magic-open */}
                <RoyalHeader title="ELITE ROADMAP" colors={textGrad} pulse={pulseAnim} accent={acc} accent2={acc2} />

                <TouchableOpacity activeOpacity={0.8} onPress={jumpToMyRank} style={[styles.jumpPill, { borderColor: acc + '99' }]}>
                    <MaterialCommunityIcons name="crosshairs-gps" size={14} color={acc} />
                    <Text style={[styles.jumpText, { color: acc }]}>JUMP TO MY RANK</Text>
                    <MaterialCommunityIcons name="chevron-down" size={14} color={acc2} />
                </TouchableOpacity>
                
                <View style={styles.roadmapBox} onLayout={(e) => setRoadTop(e.nativeEvent.layout.y)}>
                    <View style={{ width: ROAD_W, height: ROAD_H }}>

                        {/* ---- ROAD SURFACE (rim -> asphalt -> dashed centre -> lit lane) ---- */}
                        <Svg width={ROAD_W} height={ROAD_H} style={StyleSheet.absoluteFill} pointerEvents="none">
                            <Defs>
                                {SEGMENTS.map((seg, i) => (
                                    <SvgLinearGradient
                                        key={`gd${i}`}
                                        id={`seg${i}`}
                                        gradientUnits="userSpaceOnUse"
                                        x1={nodeX(i)}
                                        y1={nodeY(i)}
                                        x2={nodeX(i + 1)}
                                        y2={nodeY(i + 1)}
                                    >
                                        <Stop offset="0" stopColor={levelPalette(ALL_LEVELS[i].goal).vivid[0]} />
                                        <Stop offset="1" stopColor={levelPalette(ALL_LEVELS[i + 1].goal).vivid[0]} />
                                    </SvgLinearGradient>
                                ))}
                            </Defs>

                            {/* start tail */}
                            <Path d={TAIL_D} stroke="rgba(255,255,255,0.12)" strokeWidth={LANE + 6} strokeLinecap="round" fill="none" />
                            <Path d={TAIL_D} stroke="#0E0A26" strokeWidth={LANE} strokeLinecap="round" fill="none" />
                            <Path d={TAIL_D} stroke="rgba(255,255,255,0.22)" strokeWidth={2} strokeDasharray="7 9" fill="none" />

                            {/* rim */}
                            {SEGMENTS.map((seg, i) => (
                                <Path key={`rim${i}`} d={seg.d} stroke="rgba(255,255,255,0.12)" strokeWidth={LANE + 6} strokeLinecap="round" fill="none" />
                            ))}
                            {/* asphalt */}
                            {SEGMENTS.map((seg, i) => (
                                <Path key={`as${i}`} d={seg.d} stroke="#0E0A26" strokeWidth={LANE} strokeLinecap="round" fill="none" />
                            ))}
                            {/* dashed centre line */}
                            {SEGMENTS.map((seg, i) => (
                                <Path key={`dash${i}`} d={seg.d} stroke="rgba(255,255,255,0.22)" strokeWidth={2} strokeDasharray="7 9" fill="none" />
                            ))}
                            {/* lit lane (animated draw-in: completed = full, current = progress %) */}
                            {SEGMENTS.map((seg, i) => {
                                const p = segFill(i);
                                if (p <= 0) return null;
                                const start = i * 0.06;
                                const off = countAnim.interpolate({ inputRange: [start, start + 0.4], outputRange: [seg.len, seg.len * (1 - p)], extrapolate: 'clamp' });
                                return (
                                    <React.Fragment key={`lit${i}`}>
                                        <AnimatedPath d={seg.d} stroke={`url(#seg${i})`} strokeOpacity={0.22} strokeWidth={LANE - 4} strokeLinecap="round" fill="none" strokeDasharray={seg.len} strokeDashoffset={off} />
                                        <AnimatedPath d={seg.d} stroke={`url(#seg${i})`} strokeWidth={8} strokeLinecap="round" fill="none" strokeDasharray={seg.len} strokeDashoffset={off} />
                                    </React.Fragment>
                                );
                            })}
                        </Svg>

                        {/* ---- START SIGN ---- */}
                        <View style={[styles.startSign, { left: nodeX(0) - 40, top: START_Y + 2, borderColor: acc + '88' }]}>
                            <MaterialCommunityIcons name="flag-checkered" size={13} color={acc} />
                            <Text style={[styles.startText, { color: acc }]}>START</Text>
                        </View>

                        {/* ---- LEVELS: big medals on the road. TAP -> detail panel opens like magic ---- */}
                        {ALL_LEVELS.map((item, index) => {
                            const isCompleted = totalBeans >= (ALL_LEVELS[index + 1]?.goal || 999999999);
                            const isCurrent = currentLevelInfo.lvl === item.lvl;
                            const isLocked = totalBeans < item.goal && !isCurrent;
                            const pal = levelPalette(item.goal);
                            const pv = pal.vivid;   // raw 2 colours (fills)
                            const pt = pal.text;    // text-safe 2 colours (text, thin lines)
                            const state = isCurrent ? 'current' : isLocked ? 'locked' : isCompleted ? 'done' : 'open';

                            const x = nodeX(item.lvl);
                            const y = nodeY(item.lvl);
                            const isOpen = openLvl === item.lvl;
                            const prevLvlItem = index > 0 ? ALL_LEVELS[index - 1] : null;
                            const dCall = prevLvlItem ? item.rate - prevLvlItem.rate : 0;
                            const dQuick = prevLvlItem ? item.qmRate - prevLvlItem.qmRate : 0;
                            const panelPct = isCurrent
                                ? progressPercent
                                : isLocked
                                    ? Math.max(0, Math.min(100, Math.floor((totalBeans / item.goal) * 100)))
                                    : 100;
                            const panelInfo = isCurrent
                                ? (remainingBeans > 0 ? `NEED ${remainingBeans.toLocaleString()} FOR ${nextLevelItem?.label}` : 'MAX RANK ACHIEVED')
                                : isLocked
                                    ? `NEED ${(item.goal - totalBeans).toLocaleString()} MORE TO UNLOCK`
                                    : 'COMPLETED - UNLOCKED';
                            const oa = openAnims[item.lvl];

                            return (
                                <React.Fragment key={item.lvl}>
                                    {/* milestone 3D medal sitting on the road (TAP to open details) */}
                                    <Animated.View
                                        style={[
                                            styles.nodeSlot,
                                            {
                                                left: x - (NODE + 16) / 2,
                                                top: y - (NODE + 24) / 2,
                                                opacity: itemAnims[index],
                                                transform: [{ scale: itemAnims[index].interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) }]
                                            }
                                        ]}
                                    >
                                        <TouchableOpacity activeOpacity={0.85} onPress={() => toggleLevel(item.lvl)}>
                                            <Medal3D
                                                size={NODE}
                                                pv={pv}
                                                pt={pt}
                                                state={state}
                                                lvl={item.lvl}
                                                mode="number"
                                                spin={isCurrent}
                                                coin={coinRot}
                                                bob={isCurrent ? medalBob : 0}
                                                halo={acc}
                                                glowOpacity={glowOpacity}
                                                glowScale={glowScale}
                                            />
                                        </TouchableOpacity>
                                    </Animated.View>

                                    {/* level name pill under the medal (also tappable) */}
                                    <Animated.View style={[styles.lvlPill, { left: x - 64, top: y + NODE / 2 + 6, opacity: itemAnims[index] }]}>
                                        <TouchableOpacity
                                            activeOpacity={0.8}
                                            onPress={() => toggleLevel(item.lvl)}
                                            style={[
                                                styles.lvlPillInner,
                                                { borderColor: isLocked ? 'rgba(255,255,255,0.15)' : pt[0] + '99' },
                                                isCurrent && { borderColor: acc, backgroundColor: 'rgba(255,255,255,0.08)' }
                                            ]}
                                        >
                                            {isCurrent ? (
                                                <View style={[styles.statusTagDot, { backgroundColor: acc }]} />
                                            ) : isCompleted ? (
                                                <MaterialCommunityIcons name="check" size={10} color={ROYAL.emerald} />
                                            ) : (
                                                <MaterialCommunityIcons name="lock" size={10} color="#64748B" />
                                            )}
                                            <Text style={[styles.lvlPillText, { color: isLocked ? '#94A3B8' : pt[0] }]} numberOfLines={1}>{item.label}</Text>
                                            <MaterialCommunityIcons name={isOpen ? 'chevron-up' : 'chevron-down'} size={13} color={isLocked ? '#64748B' : pt[1]} />
                                        </TouchableOpacity>
                                    </Animated.View>

                                    {/* 📍 YOU ARE HERE pin */}
                                    {isCurrent && (
                                        <Animated.View pointerEvents="none" style={[styles.youPin, { left: x - 36, top: y - NODE / 2 - 46, borderColor: acc, transform: [{ translateY: crownBob }] }]}>
                                            <Image source={{ uri: avatarUri }} style={styles.youAvatar} />
                                            <Text style={[styles.youText, { color: acc }]}>YOU</Text>
                                            <View style={[styles.youTail, { borderColor: acc }]} />
                                        </Animated.View>
                                    )}
                                    {isCurrent && <RoyalSparkle x={x + NODE / 2 - 6} y={y - NODE / 2 - 4} size={12} color={acc2} delay={300} />}

                                    {/* ✨ MAGIC DETAIL PANEL (pops out of the medal: scale + 3D flip + fade) */}
                                    {isOpen && (
                                        <Animated.View
                                            style={[
                                                styles.detailPanel,
                                                {
                                                    left: (ROAD_W - PANEL_W) / 2,
                                                    top: Math.min(y + NODE / 2 + 36, ROAD_H - PANEL_H - 8),
                                                    width: PANEL_W,
                                                    height: PANEL_H,
                                                    shadowColor: isLocked ? '#000' : pv[0],
                                                    opacity: oa.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' }),
                                                    transform: [
                                                        { perspective: 900 },
                                                        { translateY: oa.interpolate({ inputRange: [0, 1], outputRange: [-PANEL_H * 0.4, 0] }) },
                                                        { rotateX: oa.interpolate({ inputRange: [0, 1], outputRange: ['45deg', '0deg'] }) },
                                                        { scale: oa.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) }
                                                    ]
                                                }
                                            ]}
                                        >
                                            <TouchableOpacity activeOpacity={1} onPress={() => toggleLevel(item.lvl)} style={{ flex: 1 }}>
                                                <View style={styles.panelFrame}>
                                                    {/* border: rotating duotone for CURRENT, static duotone for others */}
                                                    {isCurrent ? (
                                                        <Animated.View style={[styles.currentFrameSpin, { transform: [{ rotate: spin }] }]} pointerEvents="none">
                                                            <LinearGradient
                                                                colors={g([pv[0], pv[1], pv[0], pv[1], pv[0]])}
                                                                start={{ x: 0, y: 0 }}
                                                                end={{ x: 1, y: 1 }}
                                                                style={StyleSheet.absoluteFill}
                                                            />
                                                        </Animated.View>
                                                    ) : (
                                                        <LinearGradient
                                                            colors={isLocked ? ['#334155', '#1e293b'] : g([pv[0], pv[1], pv[0]])}
                                                            start={{ x: 0, y: 0 }}
                                                            end={{ x: 1, y: 1 }}
                                                            style={StyleSheet.absoluteFill}
                                                            pointerEvents="none"
                                                        />
                                                    )}
                                                    <View style={styles.panelInner}>
                                                        <LinearGradient
                                                            colors={isLocked ? ['rgba(30,41,59,0.5)', 'rgba(15,23,42,0.4)'] : g([pv[0] + '30', pv[1] + '26', pv[0] + '1A'])}
                                                            start={{ x: 0, y: 0 }}
                                                            end={{ x: 1, y: 1 }}
                                                            style={StyleSheet.absoluteFill}
                                                            pointerEvents="none"
                                                        />
                                                        {/* current panel shine sweep */}
                                                        {isCurrent && (
                                                            <Animated.View pointerEvents="none" style={[styles.cardSweep, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
                                                                <LinearGradient colors={['transparent', 'rgba(255,255,255,0.14)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                                                            </Animated.View>
                                                        )}

                                                        {/* header: label + status */}
                                                        <View style={styles.panelHeadRow}>
                                                            <View style={{ flex: 1 }}>
                                                                {isLocked ? (
                                                                    <Text style={[styles.rmLabel, { color: '#94A3B8' }]} numberOfLines={1}>{item.label}</Text>
                                                                ) : (
                                                                    <GradientText text={item.label} colors={[pt[0], pt[1]]} fit style={styles.rmLabel} />
                                                                )}
                                                                <Text style={styles.rmGoal} numberOfLines={1} adjustsFontSizeToFit>{item.goal.toLocaleString()} XP Rewards</Text>
                                                            </View>
                                                            {isCurrent && (
                                                                <View style={[styles.statusTag, { backgroundColor: '#0A0620', borderColor: acc, marginTop: 0 }]}>
                                                                    <View style={[styles.statusTagDot, { backgroundColor: acc }]} />
                                                                    <Text style={[styles.statusTagText, { color: acc }]}>CURRENT</Text>
                                                                </View>
                                                            )}
                                                            {isCompleted && !isCurrent && (
                                                                <View style={[styles.statusTag, { backgroundColor: '#06150F', borderColor: '#10B981', marginTop: 0 }]}>
                                                                    <MaterialCommunityIcons name="check" size={9} color="#10B981" />
                                                                    <Text style={[styles.statusTagText, { color: '#10B981' }]}>UNLOCKED</Text>
                                                                </View>
                                                            )}
                                                            {isLocked && (
                                                                <View style={[styles.statusTag, { backgroundColor: '#0F172A', borderColor: '#475569', marginTop: 0 }]}>
                                                                    <MaterialCommunityIcons name="lock" size={9} color="#94A3B8" />
                                                                    <Text style={[styles.statusTagText, { color: '#94A3B8' }]}>LOCKED</Text>
                                                                </View>
                                                            )}
                                                        </View>

                                                        {/* progress */}
                                                        <View>
                                                            <View style={styles.panelProgHead}>
                                                                <Text style={styles.panelProgLabel}>{isCurrent ? 'PROGRESS TO NEXT' : isLocked ? 'PROGRESS TO UNLOCK' : 'COMPLETED'}</Text>
                                                                <Text style={[styles.panelProgLabel, { color: isLocked ? '#94A3B8' : pt[1] }]}>{Math.floor(panelPct)}%</Text>
                                                            </View>
                                                            <View style={styles.panelTrack}>
                                                                <LinearGradient
                                                                    colors={isLocked ? ['#475569', '#334155'] : g([pv[0], pv[1]])}
                                                                    start={{ x: 0, y: 0 }}
                                                                    end={{ x: 1, y: 0 }}
                                                                    style={{ width: `${panelPct}%`, height: '100%', borderRadius: 6 }}
                                                                />
                                                            </View>
                                                            <Text style={styles.panelInfoText} numberOfLines={1}>{panelInfo}</Text>
                                                        </View>

                                                        {/* 🔥 DUAL RATE DISPLAY (colour 1 pill + colour 2 pill) */}
                                                        <View style={styles.rateRow}>
                                                            <View style={[styles.rmRateBox, { backgroundColor: isLocked ? '#1e293b' : pv[0] + '2E' }]}>
                                                                <Text style={[styles.rmRateText, { color: isLocked ? '#94A3B8' : pt[0] }]} numberOfLines={1}>CALL: {item.rate}{dCall > 0 ? `  +${dCall}` : ''}</Text>
                                                            </View>
                                                            <View style={[styles.rmRateBox, { backgroundColor: isLocked ? '#1e293b' : pv[1] + '2E' }]}>
                                                                <Text style={[styles.rmRateText, { color: isLocked ? '#94A3B8' : pt[1] }]} numberOfLines={1}>QUICK: {item.qmRate}{dQuick > 0 ? `  +${dQuick}` : ''}</Text>
                                                            </View>
                                                        </View>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                            <RoyalSparkle x={PANEL_W - 30} y={-4} size={12} color={pt[0]} delay={0} />
                                            <RoyalSparkle x={10} y={PANEL_H - 12} size={10} color={pt[1]} delay={600} />
                                        </Animated.View>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </View>
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

                            {/* ===== 1. HERO EMBLEM (god-rays + shockwaves + avatar + crown) - 3D sway ===== */}
                            <Animated.View style={{ transform: [{ perspective: 900 }, { rotateY: tiltY }, { rotateX: tiltX }] }}>
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

                            {/* ===== 3. OLD RANK -> NEW RANK FLOW (3D medals joined by a lit road) ===== */}
                            <Animated.View style={[styles.mFlowRow, stageIn(0.42, 0.66)]}>
                                <View style={styles.mFlowSide}>
                                    <View style={{ opacity: 0.65 }}>
                                        <Medal3D size={50} pv={prevPal.vivid} pt={prevPal.text} state="done" lvl={prevItem.lvl} mode="number" />
                                    </View>
                                    <Text style={styles.mFlowLabelOld}>{prevItem.label}</Text>
                                </View>

                                <View style={styles.mFlowRoadWrap}>
                                    <View style={styles.mFlowRoad}>
                                        <LinearGradient colors={g([prevPal.vivid[0], vc(0), vc(1)])} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                                    </View>
                                    <Animated.View style={{ opacity: glowOpacity }}>
                                        <MaterialCommunityIcons name="chevron-double-right" size={30} color={acc} />
                                    </Animated.View>
                                </View>

                                <View style={styles.mFlowSide}>
                                    <Medal3D size={64} pv={vivid} pt={[acc, acc2, acc]} state="current" lvl={currentLevelInfo.lvl} mode="number" spin coin={coinRot} bob={medalBob} halo={acc} glowOpacity={glowOpacity} glowScale={glowScale} />
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
                                            <Text style={styles.hStatLabel}>NEW CALL REWARD</Text>
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
                                            <Text style={styles.hStatLabel}>NEW QUICK REWARD</Text>
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
    royalDivider: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },

    // 🆕 3D HERO (COMPACT)
    heroWrapper: { marginTop: 6, marginBottom: 16, borderRadius: 34, backgroundColor: '#0A0620', elevation: 22, shadowOpacity: 0.55, shadowRadius: 22, shadowOffset: { width: 0, height: 10 } },
    heroFrame: { borderRadius: 34, overflow: 'hidden', padding: 3, backgroundColor: '#0A0620' },
    heroFrameSpin: { position: 'absolute', top: '50%', left: '50%', width: 900, height: 900, marginLeft: -450, marginTop: -450 },
    heroCard: { borderRadius: 31, padding: 12, overflow: 'hidden', position: 'relative' },
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

    // 🆕 AVATAR + RING + RAYS (left, scaled down) + INFO (right)
    heroMiddleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 0 },
    heroStageCol: { width: 156, alignItems: 'center' },
    heroStageBox: { width: 156, height: 156, alignItems: 'center', justifyContent: 'center' },
    ringBox: { width: HERO_STAGE, height: HERO_STAGE, justifyContent: 'center', alignItems: 'center', transform: [{ scale: 0.76 }] },
    ringGlow: { position: 'absolute', width: 110, height: 110, borderRadius: 55, filter: 'blur(26px)' },
    raysStage: { position: 'absolute', width: HERO_STAGE, height: HERO_STAGE },
    rayArm: { position: 'absolute', width: HERO_STAGE, height: HERO_STAGE, alignItems: 'center' },
    rayBeam: { width: 2.5, height: 14, borderRadius: 2 },
    tickRing: { position: 'absolute', width: TICK_SIZE, height: TICK_SIZE },
    dashedRing: { position: 'absolute', width: 146, height: 146, borderRadius: 73, borderWidth: 1.5, borderStyle: 'dashed' },
    ringSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
    avatarFrame: { width: 90, height: 90, borderRadius: 45, borderWidth: 2.5, overflow: 'hidden', backgroundColor: '#0F172A', elevation: 12 },
    avatarImg: { width: '100%', height: '100%' },
    floatCrown: { position: 'absolute', top: 6, alignSelf: 'center' },
    crestBadge: { position: 'absolute', top: 58, right: 26, width: 30, height: 30, borderRadius: 15, borderWidth: 2, justifyContent: 'center', alignItems: 'center', elevation: 10 },
    ringPercentChip: { position: 'absolute', bottom: 8, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 10, borderWidth: 1.5, borderColor: GOLD },
    ringPercentText: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
    pedestalOuter: { width: 120, height: 20, borderRadius: 60, borderWidth: 1, marginTop: -12, alignItems: 'center', justifyContent: 'center' },
    pedestalCore: { width: 80, height: 9, borderRadius: 40 },
    heroInfoCol: { flex: 1, alignItems: 'flex-start', justifyContent: 'center', marginLeft: 4 },
    heroName: { color: 'rgba(255,255,255,0.92)', fontSize: 12, fontWeight: '900', letterSpacing: 2, textAlign: 'left' },
    heroNameLine: { height: 1.5, width: '80%', marginTop: 4, borderRadius: 1 },
    heroTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 4, textAlign: 'left', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
    expertVerifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    expertType: { fontSize: 9.5, fontWeight: '800' },
    nextChip: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', marginTop: 8, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)', maxWidth: '100%' },
    nextChipText: { color: '#F1F5F9', fontSize: 10, fontWeight: '900', letterSpacing: 0.5, flexShrink: 1 },

    heroStatsContainer: { flexDirection: 'row', gap: 10, marginTop: 8 },
    heroStatBox: { flex: 1, padding: 9, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    statTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
    statIconRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    statIcon: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    hStatLabel: { color: 'rgba(255,255,255,0.88)', fontSize: 10, fontWeight: '900', flexShrink: 1 },
    hValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'nowrap' }, 
    hStatValue: { color: '#FFF', fontSize: 16, fontWeight: '900', flex: 1 }, 
    dualRateContainer: { flexDirection: 'column', marginTop: 0, gap: 1 },
    heroRateText: { color: '#FFF', fontSize: 12.5, fontWeight: '800', letterSpacing: 0.5 },
    massProgressSection: { marginTop: 10 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
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
    remainingBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 6, borderRadius: 14, marginTop: 8 },
    maxBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1 },
    remainingText: { color: '#E2E8F0', fontSize: 11.5, textAlign: 'center', fontWeight: '800', letterSpacing: 0.5 },

    sectionHeader: { fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 20, marginLeft: 10 },

    // 🆕 NEXT REWARD CARD
    nextCardWrap: { marginBottom: 28, borderRadius: 28, backgroundColor: '#0A0620', shadowOpacity: 0.4, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 9 },
    nextCardBorder: { borderRadius: 28, padding: 1.5 },
    nextCardInner: { borderRadius: 26.5, overflow: 'hidden', backgroundColor: 'rgba(10,6,32,0.97)', padding: 16, flexDirection: 'row', alignItems: 'center' },
    nextMedalBox: { width: 76, height: 84, justifyContent: 'center', alignItems: 'center' },
    nextMedalHalo: { position: 'absolute', width: 70, height: 70, borderRadius: 35, borderWidth: 2 },
    nextTitle: { fontSize: 17, fontWeight: '900', letterSpacing: 0.5 },
    nextSub: { color: '#CBD5E1', fontSize: 12, fontWeight: '700', marginTop: 3 },
    perkRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 9 },
    perkPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
    perkText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.3 },

    // 🆕 MEDAL STRIP
    medalStrip: { paddingHorizontal: 8, paddingVertical: 10, gap: 12 },
    medalThread: { position: 'absolute', left: 36, right: 36, top: 44, height: 2.5, borderRadius: 2, opacity: 0.4 },
    medalWrap: { width: 56, alignItems: 'center', justifyContent: 'center' },
    medalLabel: { marginTop: 2, fontSize: 11.5, fontWeight: '900', letterSpacing: 0.5 },

    // 🛣️ MILESTONE ROAD (FULL WIDTH)
    jumpPill: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 12 },
    jumpText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 1.5 },
    roadmapBox: { alignItems: 'center', marginHorizontal: -15 },
    startSign: { position: 'absolute', width: 80, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 4, borderRadius: 10, borderWidth: 1, backgroundColor: 'rgba(10,6,32,0.9)' },
    startText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 1.5 },
    nodeSlot: { position: 'absolute', width: NODE + 16, height: NODE + 24, zIndex: 8 },
    cardSlot: { position: 'absolute', zIndex: 6, shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 7 },
    currentFrame: { flex: 1, borderRadius: 26, overflow: 'hidden', padding: 2, backgroundColor: '#0A0620' },
    currentFrameSpin: { position: 'absolute', top: '50%', left: '50%', width: 420, height: 420, marginLeft: -210, marginTop: -210 },
    roadmapCard: { flex: 1, borderRadius: 24, paddingHorizontal: 11, paddingVertical: 8, justifyContent: 'center', overflow: 'hidden' },
    cardSweep: { position: 'absolute', top: -40, bottom: -40, left: 0, width: 60 },
    rmLabel: { fontSize: 18, fontWeight: '900' },
    rmGoal: { color: '#CBD5E1', fontSize: 11.5, fontWeight: '700', marginTop: 2 },
    statusTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, marginTop: 4 },
    statusRibbon: { position: 'absolute', top: -10, right: 12, marginTop: 0, zIndex: 9 },
    statusTagDot: { width: 5, height: 5, borderRadius: 3 },
    statusTagText: { fontSize: 9.5, fontWeight: '900', letterSpacing: 0.5 },
    rateRow: { flexDirection: 'row', gap: 6, marginTop: 0 },
    rmRateBox: { flex: 1, paddingHorizontal: 4, paddingVertical: 7, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rmRateText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.2 },
    youPin: { position: 'absolute', width: 72, height: 30, zIndex: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 15, borderWidth: 1.5, backgroundColor: '#0A0620' },
    youAvatar: { width: 20, height: 20, borderRadius: 10 },
    youText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 1.5 },
    youTail: { position: 'absolute', bottom: -5, alignSelf: 'center', width: 8, height: 8, backgroundColor: '#0A0620', borderRightWidth: 1.5, borderBottomWidth: 1.5, transform: [{ rotate: '45deg' }] },

    // 🆕 LEVEL NAME PILL + MAGIC DETAIL PANEL
    lvlPill: { position: 'absolute', width: 128, height: 26, zIndex: 9 },
    lvlPillInner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 13, borderWidth: 1, backgroundColor: 'rgba(10,6,32,0.92)', paddingHorizontal: 6 },
    lvlPillText: { fontSize: 10.5, fontWeight: '900', letterSpacing: 0.5, flexShrink: 1 },
    detailPanel: { position: 'absolute', zIndex: 20, shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 14 },
    panelFrame: { flex: 1, borderRadius: 26, overflow: 'hidden', padding: 2, backgroundColor: '#0A0620' },
    panelInner: { flex: 1, borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(10,6,32,0.97)', paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'space-between' },
    panelHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    panelProgHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
    panelProgLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 9.5, fontWeight: '900', letterSpacing: 1 },
    panelTrack: { height: 8, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' },
    panelInfoText: { color: '#CBD5E1', fontSize: 10, fontWeight: '800', letterSpacing: 0.4, marginTop: 4 },

    // 👑 LEVEL-UP MODAL
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    confettiPiece: { position: 'absolute', top: 0, borderRadius: 2 },
    modalContent: { width: width * 0.85, borderRadius: 40, overflow: 'hidden' },
    modalGradient: { padding: 40, alignItems: 'center' },
    fireworkContainer: { marginBottom: 10 },
    mScroll: { flex: 1, width: '100%' },
    mScrollContent: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 40 },
    mContent: { width: '100%', alignItems: 'center', paddingHorizontal: 18 },
    mAura: { position: 'absolute', width: 320, height: 320, borderRadius: 160, filter: 'blur(70px)' },
    mStage: { width: M_STAGE, height: M_STAGE, justifyContent: 'center', alignItems: 'center' },
    mGlow: { position: 'absolute', width: 170, height: 170, borderRadius: 85, filter: 'blur(40px)' },
    mWave: { position: 'absolute', width: M_RING, height: M_RING, borderRadius: M_RING / 2, borderWidth: 2 },
    mRaysStage: { position: 'absolute', width: M_STAGE, height: M_STAGE },
    mRayArm: { position: 'absolute', width: M_STAGE, height: M_STAGE, alignItems: 'center' },
    mRayBeam: { width: 3, borderRadius: 2 },
    mTickRing: { position: 'absolute', width: M_TICK, height: M_TICK },
    mDashed: { position: 'absolute', width: 226, height: 226, borderRadius: 113, borderWidth: 1.5, borderStyle: 'dashed' },
    mRingSvg: { position: 'absolute' },
    crownStage: { position: 'absolute', width: 180, height: 180, justifyContent: 'center', alignItems: 'center' },
    sparkleOrbit: { position: 'absolute', width: 180, height: 180 },
    mAvatarFrame: { width: 128, height: 128, borderRadius: 64, borderWidth: 3, overflow: 'hidden', backgroundColor: '#0F172A', shadowOpacity: 0.9, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 16 },
    mCrown: { position: 'absolute', top: 6, alignSelf: 'center' },
    mRankBadge: { position: 'absolute', bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 5, borderRadius: 14, borderWidth: 1.5 },
    mRankBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
    mTitleBlock: { alignItems: 'center', marginTop: 6, width: '100%' },
    mLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, width: '100%' },
    congratsLabel: { color: '#FBBF24', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
    congratsTitle: { color: '#FFF', fontSize: 30, fontWeight: '900', letterSpacing: 2 },
    mCongratsTitle: { marginTop: 8, textAlign: 'center', textShadowRadius: 18, textShadowOffset: { width: 0, height: 0 } },
    mLevelName: { fontSize: 34, fontWeight: '900', marginTop: 4, textAlign: 'center' },
    mSubText: { color: '#CBD5E1', fontSize: 12.5, textAlign: 'center', marginTop: 6, fontWeight: '600' },
    mFlowRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginTop: 14, paddingHorizontal: 4 },
    mFlowSide: { alignItems: 'center', width: 104 },
    mFlowRoadWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 40 },
    mFlowRoad: { position: 'absolute', left: 0, right: 0, height: 8, borderRadius: 4, overflow: 'hidden', opacity: 0.55, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    mFlowLabelOld: { color: '#94A3B8', fontSize: 10.5, fontWeight: '900', marginTop: 2 },
    mFlowLabelNew: { fontSize: 12, fontWeight: '900', marginTop: 2 },
    mRateRow: { flexDirection: 'row', gap: 10, width: '100%', marginTop: 14 },
    mRateWrap: { flex: 1 },
    mRateCard: { padding: 12, borderRadius: 20, overflow: 'hidden', borderWidth: 1 },
    mOldRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    mOldRate: { color: '#64748B', fontSize: 12, fontWeight: '800', textDecorationLine: 'line-through' },
    mNewRate: { fontSize: 26, fontWeight: '900', marginTop: 2 },
    mDeltaPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, marginTop: 6 },
    mNextRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)', maxWidth: '100%' },
    mNextText: { color: '#E2E8F0', fontSize: 11.5, fontWeight: '800', letterSpacing: 0.5, flexShrink: 1 },
    mBtnOuter: { width: '100%', marginTop: 20 },
    claimBtnWrap: { borderRadius: 30, overflow: 'hidden', elevation: 10 },
    claimBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 30, overflow: 'hidden' },
    mClaimBtn: { width: '100%' },
    claimBtnText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
});
