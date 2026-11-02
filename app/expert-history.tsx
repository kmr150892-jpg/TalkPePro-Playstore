import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    collection,
    doc, getDoc, getDocs,
    onSnapshot,
    query,
    where
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Image,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

// 🆕 Animated FlatList (scroll-driven effects)
const AnimatedFlatList: any = Animated.createAnimatedComponent(FlatList);

// 🆕 CARD LAYOUT CONSTANTS (scroll-driven 3D wheel effect)
const CARD_ITEM_H = 172;      // approx card height + margin
const LIST_PAD_TOP = 14;      // spacing between header & first card
const MINI_SHOW_AT = 400;     // scroll offset where compact mini-bar appears

// ✅ ACCURATE THEME & LEVEL CONFIG (LOCKED DEEP-GLOW COLORS)
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

// 🆕 Level floor values (progress bar-ku) - getLevelConfig thresholds-oda same
const LEVEL_STEPS = [0, 30000, 100000, 300000, 1000000, 3000000, 5000000, 10000000, 30000000, 50000000, 100000000];

const calculateLevel = (d: number) => {
    if (d <= 200000) return "Silver";
    if (d <= 1000000) return "Gold";
    if (d <= 5000000) return "Diamond";
    if (d <= 10000000) return "Legend";
    if (d <= 50000000) return "Elite";
    if (d <= 100000000) return "Master";
    if (d <= 500000000) return "Grandmaster";
    return "Godlike";
};

const TABS = [
    { id: 'video_call', label: 'Call Reward', icon: 'videocam', iconType: 'Ionicons' },
    { id: 'live_gift', label: 'Broadcast Rewards', icon: 'broadcast', iconType: 'MaterialCommunityIcons' },
    { id: 'party_gift', label: 'Forum Rewards', icon: 'party-popper', iconType: 'MaterialCommunityIcons' },
    { id: 'call_gift', label: 'Private Rewards', icon: 'gift', iconType: 'MaterialCommunityIcons' },
    { id: 'daily_bonus', label: 'Daily Bonus', icon: 'star-shooting', iconType: 'MaterialCommunityIcons' } 
];

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
    trophy: 'https://img.icons8.com/3d-fluency/512/trophy.png',
    star: 'https://img.icons8.com/3d-fluency/512/star.png',
    gift: 'https://img.icons8.com/3d-fluency/512/gift.png',
    diamond: 'https://img.icons8.com/3d-fluency/512/diamond.png',
    crown: 'https://img.icons8.com/3d-fluency/512/crown.png',
    clock: 'https://img.icons8.com/3d-fluency/512/clock.png',
};

// 🆕 Image load aagalana icon fallback (offline-lum azhaga irukkum)
const SafeImage = ({ uri, fallbackIcon, style, color }: any) => {
    const [failed, setFailed] = useState(false);
    if (!uri || failed) {
        return (
            <View style={[style, { alignItems: 'center', justifyContent: 'center' }]}>
                <MaterialCommunityIcons name={fallbackIcon} size={34} color={color} />
            </View>
        );
    }
    return <Image source={{ uri }} style={style} resizeMode="contain" onError={() => setFailed(true)} />;
};

// 🆕 3D image with auto Ionicons fallback
const Img3D = ({ uri, size, fallback, color = '#FFF', style }: any) => {
    const [err, setErr] = useState(false);
    if (err) return <Ionicons name={fallback} size={size * 0.7} color={color} />;
    return <Image source={{ uri }} style={[{ width: size, height: size }, style]} resizeMode="contain" onError={() => setErr(true)} />;
};

// 🆕 Number count-up animation
const useCountUp = (target: number) => {
    const anim = useRef(new Animated.Value(0)).current;
    const [val, setVal] = useState(0);
    useEffect(() => {
        const id = anim.addListener(({ value }) => setVal(Math.floor(value)));
        Animated.timing(anim, { toValue: target, duration: 1300, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
        return () => anim.removeListener(id);
    }, [target]);
    return val;
};

// 🆕 COUNT UP (component version for stat tiles)
const CountUp = ({ value, style, prefix = '', duration = 900 }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    const [txt, setTxt] = useState(0);
    useEffect(() => {
        const id = v.addListener(({ value: val }) => setTxt(Math.round(val)));
        Animated.timing(v, { toValue: value || 0, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
        return () => v.removeListener(id);
    }, [value]);
    return <Text style={style} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{prefix}{txt.toLocaleString()}</Text>;
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

// 🆕 Pulse dot (live)
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

// 🆕 3D TILT CARD - entrance flip-in + gentle 3D sway + press tilt + glow border
// 🆕 UPGRADE: + scroll-driven 3D wheel + holographic shine sweep + double colour border (all old behaviour kept)
const TiltCard = ({ index, sway, glow, colors, scrollY, headerH, children }: any) => {
    const enter = useRef(new Animated.Value(0)).current;
    const press = useRef(new Animated.Value(0)).current;
    const shine = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(enter, {
            toValue: 1,
            delay: Math.min(index, 8) * 70,
            friction: 7,
            tension: 50,
            useNativeDriver: true
        }).start();

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

    // 🆕 SCROLL-DRIVEN 3D WHEEL
    const itemTop = headerH + LIST_PAD_TOP + index * CARD_ITEM_H;
    const sRange = [itemTop - height, itemTop - height * 0.6, itemTop + 20, itemTop + CARD_ITEM_H * 2.2];
    const scrollRotX = scrollY.interpolate({ inputRange: sRange, outputRange: ['26deg', '0deg', '0deg', '-9deg'], extrapolate: 'clamp' });
    const scrollScale = scrollY.interpolate({ inputRange: sRange, outputRange: [0.88, 1, 1, 0.94], extrapolate: 'clamp' });
    const scrollOpacity = scrollY.interpolate({ inputRange: sRange, outputRange: [0.3, 1, 1, 0.55], extrapolate: 'clamp' });
    const scrollTY = scrollY.interpolate({ inputRange: sRange, outputRange: [34, 0, 0, 0], extrapolate: 'clamp' });

    const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
    const rotateXEnter = enter.interpolate({ inputRange: [0, 1], outputRange: ['35deg', '0deg'] });
    const rotateXPress = press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '8deg'] });
    const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.965] });
    const even = index % 2 === 0;
    const swayY = sway.interpolate({ inputRange: [0, 1], outputRange: [even ? '-2.5deg' : '2.5deg', even ? '2.5deg' : '-2.5deg'] });

    const pIn = () => Animated.spring(press, { toValue: 1, friction: 6, useNativeDriver: true }).start();
    const pOut = () => Animated.spring(press, { toValue: 0, friction: 5, useNativeDriver: true }).start();

    return (
        <Animated.View
            style={[
                styles.cardShadow,
                {
                    shadowColor: glow,
                    opacity: Animated.multiply(enter, scrollOpacity),
                    transform: [
                        { perspective: 900 },
                        { translateY },
                        { translateY: scrollTY },
                        { rotateX: rotateXEnter },
                        { rotateX: scrollRotX },
                        { scale: scrollScale },
                        { rotateX: rotateXPress },
                        { rotateY: swayY },
                        { scale }
                    ]
                }
            ]}
        >
            <Pressable onPressIn={pIn} onPressOut={pOut}>
                <LinearGradient
                    colors={[colors[0], colors[1], colors[0]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardBorder}
                >
                    <View style={styles.cardInner}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0.09)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0.8, y: 0.6 }}
                            style={StyleSheet.absoluteFill}
                            pointerEvents="none"
                        />
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
                        {children}
                    </View>
                </LinearGradient>
            </Pressable>
        </Animated.View>
    );
};

export default function ExpertHistory() {
  const router = useRouter();
  const user = auth.currentUser;
  const insets = useSafeAreaInsets();

  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalMinutes, setTotalMinutes] = useState(0);
  
  const [activeTab, setActiveTab] = useState<'video_call' | 'live_gift' | 'party_gift' | 'call_gift' | 'daily_bonus'>('video_call');
  const [expertProfile, setExpertProfile] = useState<any>(null);

  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  // 🆕 new animation drivers
  const swayAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const refreshSpin = useRef(new Animated.Value(0)).current;
  const progAnim = useRef(new Animated.Value(0)).current;
  const heroEnter = useRef(new Animated.Value(0)).current;

  // 🆕 PREMIUM ANIMATION VALUES
  const tabPop = useRef(new Animated.Value(1)).current;    // tab 3D pop on switch
  const tabAnim = useRef(new Animated.Value(1)).current;   // list content transition
  const [bgErr, setBgErr] = useState(false);

  // 🆕 SCROLL ENGINE (whole screen scrolls: hero parallax, mini bar, 3D wheel cards)
  const scrollY = useRef(new Animated.Value(0)).current;
  const listRef = useRef<any>(null);
  const miniShown = useRef(false);
  const [showMini, setShowMini] = useState(false);
  const [headerH, setHeaderH] = useState(760);
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

  const config = getLevelConfig(expertProfile?.totalBeansEarned || 0);
  const theme = {
      primary: config.colors[0],
      secondary: config.colors[2],
      accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
      // 🆕 TEXT-SAFE colours (dark colours text-la nalla theriya brighten panniruken)
      accentText: lighten(config.glow !== 'transparent' ? config.glow : config.colors[0], 0.45),
      primaryText: lighten(config.colors[0], 0.4),
      secondaryText: lighten(config.colors[2], 0.62),
      // 🆕 DOUBLE COLOUR BORDER PAIR (darker shade): primary + secondary
      bA: darken(vivid(config.colors[0], 0.3), 0.18),
      bB: darken(vivid(config.colors[2], 0.3), 0.18),
      // 🆕 DARKER background (40 -> 22, 20 -> 14, deeper base)
      bgGradient: [
          config.lvl >= 7 ? `${config.colors[0]}22` : '#010309', 
          config.lvl >= 3 ? `${config.colors[1]}14` : '#050A18', 
          '#010309'
      ] as const 
  };
  const PARTICLE_COLORS = [theme.accent, theme.primary, theme.secondary, '#FFFFFF'];

  // 🆕 DOUBLE COLOUR per-side border (top/left = colour A, bottom/right = colour B)
  const sideMix: any = {
      borderTopColor: theme.bA,
      borderLeftColor: theme.bA,
      borderBottomColor: theme.bB,
      borderRightColor: theme.bB,
  };

  // 🆕 Hero stats
  const lifetimeBeans = Number(expertProfile?.totalBeansEarned) || 0;
  const countedLifetime = useCountUp(lifetimeBeans);
  const curFloor = LEVEL_STEPS[config.lvl] || 0;
  const nextFloor = config.lvl >= 10 ? curFloor : LEVEL_STEPS[config.lvl + 1];
  const levelProgress = config.lvl >= 10 ? 1 : Math.max(0, Math.min(1, (lifetimeBeans - curFloor) / ((nextFloor - curFloor) || 1)));

  const fetchAllArchives = async () => {
    if (!user) return;
    setLoading(true);
    try {
        let rawData: any[] = [];

        // 1. FETCH CALLS
        const callsSnap = await getDocs(query(collection(db, "calls"), where("expertId", "==", user.uid)));
        for (const docSnap of callsSnap.docs) {
            const d = docSnap.data();
            const expertEarnings = Number(d.expertEarnings) || 0;

            if (expertEarnings > 0) {
                let callerName = d.callerName || 'Call User';
                let callerPic = d.callerImage || null;
                let callerLevel = 'Silver';

                if (d.callerId) {
                    const uSnap = await getDoc(doc(db, "users", d.callerId));
                    if (uSnap.exists()) {
                        const uData = uSnap.data();
                        callerName = uData.name || uData.displayName || callerName;
                        callerPic = uData.profilePic || uData.photoURL || callerPic;
                        callerLevel = calculateLevel(uData.balance || 0);
                    }
                }

                rawData.push({
                    id: docSnap.id,
                    type: 'video_call',
                    callerId: d.callerId, 
                    callerName: callerName,
                    syncPic: callerPic,
                    syncLevel: callerLevel,
                    finalDuration: d.finalDuration || d.duration || 0,
                    expertEarnings: expertEarnings,
                    timestamp: d.endedAt || d.createdAt || { seconds: 0 }
                });
            }
        }

        // 2. FETCH TRANSACTIONS (For Call Gifts & DAILY BONUS)
        const transSnapUser = await getDocs(query(collection(db, "transactions"), where("userId", "==", user.uid)));
        const transSnapExpert = await getDocs(query(collection(db, "transactions"), where("expertId", "==", user.uid)));
        
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

            const bns = Number(d.expertBeans) || Number(d.expertBean) || Number(d.beans) || Math.floor((Number(d.diamonds) || Number(d.amount) || 0) / 2);

            if (bns > 0) {
                let tType = 'call_gift';
                if (d.source === 'Session' || d.source === 'forum') tType = 'party_gift';
                if (d.source === 'live') tType = 'live_gift';

                let senderName = d.senderName || d.userName || 'Verified Supporter';
                let senderPic = d.userImage || null;
                let senderLevel = 'Silver';

                if (d.userId && d.userId !== 'unknown' && d.userId !== user.uid) {
                    const uSnap = await getDoc(doc(db, "users", d.userId));
                    if (uSnap.exists()) {
                        const uData = uSnap.data();
                        senderName = uData.name || uData.displayName || senderName;
                        senderPic = uData.profilePic || uData.photoURL || senderPic;
                        senderLevel = calculateLevel(uData.balance || 0);
                    }
                }

                rawData.push({
                    id: docSnap.id,
                    type: tType,
                    senderId: d.userId, 
                    senderName: senderName,
                    syncPic: senderPic,
                    syncLevel: senderLevel,
                    giftName: d.giftName || d.giftType || 'Virtual Reward',
                    amount: d.diamonds || d.amount || 0,
                    beans: bns,
                    timestamp: d.timestamp || { seconds: 0 }
                });
            }
        }

        // 3. FETCH LIVES (Live Gifts)
        const livesSnap = await getDocs(query(collection(db, "lives"), where("hostId", "==", user.uid)));
        for (const liveDoc of livesSnap.docs) {
            const liveData = liveDoc.data();
            const isParty = liveData.isPartyRoom === true || liveData.status === "party_hidden";

            if (!isParty) {
                const giftsSnap = await getDocs(collection(db, "lives", liveDoc.id, "gifts"));
                for (const gDoc of giftsSnap.docs) {
                    const g = gDoc.data();
                    const bns = Number(g.beans) || Math.floor((Number(g.amount) || Number(g.price) || 0) / 2);

                    if (bns > 0) {
                        let gSenderName = g.senderName || 'VIP Supporter';
                        let gPic = g.senderImage || g.icon || null;
                        let gLevel = 'Silver';

                        if (g.senderId) {
                            const uSnap = await getDoc(doc(db, "users", g.senderId));
                            if (uSnap.exists()) {
                                const uData = uSnap.data();
                                gSenderName = uData.name || uData.displayName || gSenderName;
                                gPic = uData.profilePic || uData.photoURL || gPic;
                                gLevel = calculateLevel(uData.balance || 0);
                            }
                        }

                        rawData.push({
                            id: gDoc.id,
                            type: 'live_gift',
                            senderId: g.senderId, 
                            senderName: gSenderName,
                            giftName: g.giftName || 'Virtual Reward',
                            amount: g.amount || g.price || 0,
                            beans: bns,
                            timestamp: g.timestamp || liveData.startedAt || { seconds: 1 },
                            syncPic: gPic,
                            syncLevel: gLevel
                        });
                    }
                }
            }
        }

        // 4. FETCH Session ROOMS (Forum Rewards) 
        const partySnap = await getDocs(query(collection(db, "forum_rooms"), where("hostId", "==", user.uid)));
        for (const partyDoc of partySnap.docs) {
            const pData = partyDoc.data();
            const giftsSnap = await getDocs(collection(db, "forum_rooms", partyDoc.id, "gifts"));
            for (const gDoc of giftsSnap.docs) {
                const g = gDoc.data();
                const bns = Number(g.beans) || Math.floor((Number(g.price) || Number(g.amount) || 0) / 2);
                
                if (bns > 0) {
                    let gSenderName = g.senderName || 'Room Member';
                    let gPic = g.icon || null;
                    let gLevel = 'Silver';

                    if (g.senderId) {
                        const uSnap = await getDoc(doc(db, "users", g.senderId));
                        if (uSnap.exists()) {
                            const uData = uSnap.data();
                            gSenderName = uData.name || uData.displayName || gSenderName;
                            gPic = uData.profilePic || uData.photoURL || gPic;
                            gLevel = calculateLevel(uData.balance || 0);
                        }
                    }

                    rawData.push({
                        id: gDoc.id,
                        type: 'party_gift',
                        senderId: g.senderId, 
                        senderName: gSenderName,
                        giftName: g.giftName || 'Virtual Reward',
                        amount: g.price || g.amount || 0,
                        beans: bns,
                        timestamp: g.timestamp || pData.createdAt || { seconds: 1 },
                        syncPic: gPic,
                        syncLevel: gLevel
                    });
                }
            }
        }

        const uniqueData: any[] = [];
        const seen = new Set();
        for (const item of rawData) {
            const uniqueKey = `${item.type}_${item.beans || item.expertEarnings}_${item.timestamp?.seconds || 0}`;
            if (!seen.has(uniqueKey)) {
                seen.add(uniqueKey);
                uniqueData.push(item);
            }
        }

        uniqueData.sort((a: any, b: any) => {
            const timeA = a.timestamp?.seconds || 0;
            const timeB = b.timestamp?.seconds || 0;
            return timeB - timeA;
        });

        const totalSecs = uniqueData.filter(t => t.type === 'video_call').reduce((acc, curr) => acc + (Number(curr.finalDuration) || 0), 0);
        setTotalMinutes(Math.floor(totalSecs / 60));

        setAllTransactions(uniqueData);
        setLoading(false);

    } catch (error) {
        console.error("Archive Sync Error:", error);
        setLoading(false);
    }
  };

  useEffect(() => {
    // 🔧 smooth ping-pong (munnadi 0->1 reset aagi orb jump aagum, ippo smooth)
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

    // 🆕 3D sway for cards
    Animated.loop(
      Animated.sequence([
        Animated.timing(swayAnim, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(swayAnim, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    ).start();

    // 🆕 rotating ring around hero trophy
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // 🆕 hero entrance
    Animated.spring(heroEnter, { toValue: 1, friction: 7, tension: 45, useNativeDriver: true }).start();

    if (!user) return;
    
    const expertRef = doc(db, "users", user.uid);
    const unsubExpert = onSnapshot(expertRef, (snap) => {
        if (snap.exists()) setExpertProfile(snap.data());
    });

    fetchAllArchives();

    return () => {
        unsubExpert();
    };
  }, [user]);

  // 🆕 Floating particles (one time)
  useEffect(() => {
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

  // 🆕 refresh icon spins while syncing
  useEffect(() => {
    if (!loading) { refreshSpin.setValue(0); return; }
    const loop = Animated.loop(
      Animated.timing(refreshSpin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [loading]);

  // 🆕 level progress bar animation
  useEffect(() => {
    Animated.timing(progAnim, { toValue: levelProgress, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [levelProgress]);

  const orbTranslateY = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -30]
  });
  const ringRotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const refreshRotate = refreshSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const sweepX = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-160, width] });
  const heroScale = heroEnter.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const heroRotX = heroEnter.interpolate({ inputRange: [0, 1], outputRange: ['25deg', '0deg'] });
  const progWidth = progAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  // 🆕 Scroll-driven interpolations (hero parallax / mini bar / background depth)
  const stageScale = scrollY.interpolate({ inputRange: [-160, 0, 320], outputRange: [1.14, 1, 0.9], extrapolate: 'clamp' });
  const stageTY = scrollY.interpolate({ inputRange: [-160, 0, 320], outputRange: [10, 0, 70], extrapolate: 'clamp' });
  const stageOpacity = scrollY.interpolate({ inputRange: [0, 150, 300], outputRange: [1, 0.85, 0.25], extrapolate: 'clamp' });
  const miniOpacity = scrollY.interpolate({ inputRange: [MINI_SHOW_AT - 20, MINI_SHOW_AT + 40], outputRange: [0, 1], extrapolate: 'clamp' });
  const miniTY = scrollY.interpolate({ inputRange: [MINI_SHOW_AT - 20, MINI_SHOW_AT + 40], outputRange: [-24, 0], extrapolate: 'clamp' });
  const bgShift = scrollY.interpolate({ inputRange: [0, 1500], outputRange: [0, -300], extrapolate: 'clamp' });
  const bgShiftSlow = scrollY.interpolate({ inputRange: [0, 1500], outputRange: [0, -140], extrapolate: 'clamp' });

  const cardColorsA = [theme.bA, theme.bB];
  const cardColorsB = [theme.bB, theme.bA];

  const renderCallItem = ({ item, index }: { item: any, index: number }) => {
    const duration = Number(item.finalDuration) || 0;
    const mins = Math.floor(duration / 60);
    const secs = duration % 60;
    const dateObj = item.timestamp?.seconds ? new Date(item.timestamp.seconds * 1000) : new Date();
    const earnings = item.expertEarnings || 0; 
    
    const titleText = item.callerName ? `Call with ${item.callerName}` : "Call Reward";

    return (
      <TiltCard index={index} sway={swayAnim} glow={theme.accent} colors={index % 2 === 0 ? cardColorsA : cardColorsB} scrollY={scrollY} headerH={headerH}>
        <LinearGradient colors={[theme.primary, 'transparent']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.statusGlowLine} />
        {/* 🆕 3D watermark */}
        <View style={styles.cardWatermark3D} pointerEvents="none">
            <Img3D uri={IMG.trophy} size={120} fallback="trophy" color={theme.primary + '22'} style={{ opacity: 0.1 }} />
        </View>
        <View style={styles.cardMain}>
          <View style={styles.userSection}>
            <View style={styles.avatarNode}>
                {/* 🆕 Orbit rings around avatar */}
                <OrbitRing size={76} color={theme.accent} dur={5200 + (index % 4) * 600} dotSize={5} />
                <OrbitRing size={64} color={theme.primaryText} dur={7600} reverse dotSize={4} style={{ opacity: 0.7 }} />
                <TouchableOpacity 
                    style={styles.avatarWrapper} 
                    onPress={() => item.callerId ? router.push({ pathname: '/user-detail', params: { id: item.callerId } } as any) : null}
                    disabled={!item.callerId}
                >
                    <LinearGradient colors={[lighten(theme.primary, 0.3), theme.primary, theme.secondary]} style={styles.avatarRing}>
                        <Image source={{ uri: item.syncPic || `https://ui-avatars.com/api/?name=${item.callerName}&background=3B82F6&color=fff` }} style={styles.eliteAvatar} />
                    </LinearGradient>
                    <LinearGradient colors={[theme.bA, theme.bB]} style={styles.levelBadgeMini}>
                      <Text style={styles.levelBadgeText}>{item.syncLevel.toUpperCase()}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
            <View style={styles.userMeta}>
              <Text style={[styles.nodeTagText, { color: theme.accentText }]} numberOfLines={1}>LOG {String(index + 1).padStart(2, '0')}</Text>
              <Text style={styles.eliteUserName} numberOfLines={2} adjustsFontSizeToFit>{titleText}</Text>
              <View style={styles.dateTimeRow}>
                <Ionicons name="time" size={12} color={theme.primaryText} />
                <Text style={styles.eliteDateText}>{dateObj.toLocaleDateString()} • {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
              </View>
            </View>
          </View>
          <View style={styles.earningsBlock}>
            <Text style={styles.earnLabel}>Rewards</Text>
            <LinearGradient colors={['rgba(251,191,36,0.25)', 'rgba(251,191,36,0.06)']} style={styles.rewardPill}>
              <Text style={styles.eliteBeansValue}>+🎖️{earnings}</Text> 
            </LinearGradient>
          </View>
        </View>
        <BlurView intensity={20} tint="dark" style={styles.cardFooter}>
            <View style={styles.footerStatRow}>
                <Ionicons name="stopwatch" size={13} color="#10B981" />
                <Text style={styles.footerStatText}>{mins}m {secs}s Uplink</Text>
            </View>
            <View style={[styles.verifiedBadge, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="shield-checkmark" size={11} color={theme.accentText} />
                <Text style={[styles.verifiedText, { color: theme.accentText }]}>SECURE</Text>
            </View>
        </BlurView>
      </TiltCard>
    );
  };

  const renderGiftItem = ({ item, index }: { item: any, index: number }) => {
    const dateObj = item.timestamp?.seconds ? new Date(item.timestamp.seconds * 1000) : new Date();
    const beansEarned = item.beans || 0;
    
    let displayTitle = "";
    let displaySub = item.giftName || 'Virtual Reward';
    let iconType = 'gift';
    let iconColor = theme.primary;

    if (item.type === 'daily_bonus') {
        displayTitle = 'Daily Mission Bonus';
        displaySub = item.giftName || 'System Reward';
        iconType = 'star-shooting';
        iconColor = '#8B5CF6';
    } else {
        let baseTitle = "";
        if (item.type === 'live_gift') {
            baseTitle = "Broadcast Reward";
            iconType = 'broadcast';
            iconColor = '#10B981';
        } else if (item.type === 'party_gift') {
            baseTitle = "Forum Reward";
            iconType = 'party-popper';
            iconColor = '#EC4899';
        } else if (item.type === 'call_gift') {
            baseTitle = "Private Reward";
            iconType = 'gift';
            iconColor = theme.primary;
        }
        
        const validSender = item.senderName && item.senderName !== "Unknown" ? item.senderName : "User";
        displayTitle = `${baseTitle} (from ${validSender})`;
    }

    const iconText = lighten(iconColor, 0.4); // 🆕 text-safe colour

    return (
      <TiltCard index={index} sway={swayAnim} glow={iconColor} colors={index % 2 === 0 ? cardColorsB : cardColorsA} scrollY={scrollY} headerH={headerH}>
        <LinearGradient colors={[theme.secondary, 'transparent']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.statusGlowLine} />
        {/* 🆕 3D watermark */}
        <View style={styles.cardWatermark3D} pointerEvents="none">
            <Img3D uri={item.type === 'daily_bonus' ? IMG.star : IMG.gift} size={120} fallback={item.type === 'daily_bonus' ? 'star' : 'gift'} color={iconColor + '22'} style={{ opacity: 0.1 }} />
        </View>
        <View style={styles.cardMain}>
          <View style={styles.userSection}>
            <View style={styles.avatarNode}>
                {/* 🆕 Orbit rings around avatar */}
                <OrbitRing size={76} color={iconColor} dur={5200 + (index % 4) * 600} dotSize={5} />
                <OrbitRing size={64} color={iconText} dur={7600} reverse dotSize={4} style={{ opacity: 0.7 }} />
                <TouchableOpacity 
                    style={styles.avatarWrapper} 
                    onPress={() => item.senderId ? router.push({ pathname: '/user-detail', params: { id: item.senderId } } as any) : null}
                    disabled={!item.senderId}
                >
                    <LinearGradient colors={[lighten(theme.primary, 0.3), theme.primary, theme.secondary]} style={styles.avatarRing}>
                        <Image source={{ uri: item.syncPic || `https://ui-avatars.com/api/?name=${item.senderName || 'V'}&background=D946EF&color=fff` }} style={styles.eliteAvatar} />
                    </LinearGradient>
                    <LinearGradient colors={[theme.bA, theme.bB]} style={styles.levelBadgeMini}>
                      <Text style={styles.levelBadgeText}>{item.syncLevel.toUpperCase()}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
            <View style={styles.userMeta}>
              <Text style={[styles.nodeTagText, { color: iconText }]} numberOfLines={1}>LOG {String(index + 1).padStart(2, '0')}</Text>
              <Text style={styles.eliteUserName} numberOfLines={2} adjustsFontSizeToFit>{displayTitle}</Text>
              <View style={styles.giftLabelRow}>
                  <View style={[styles.giftIconChip, { backgroundColor: iconColor + '25', borderColor: iconColor + '60' }]}>
                      <MaterialCommunityIcons name={iconType as any} size={14} color={iconText} />
                  </View>
                  <Text style={[styles.giftSubName, { color: iconText }]} numberOfLines={2} adjustsFontSizeToFit>{displaySub}</Text>
              </View>
            </View>
          </View>
          <View style={styles.earningsBlock}>
            <Text style={styles.earnLabel}>REWARD</Text>
            <LinearGradient colors={['rgba(251,191,36,0.25)', 'rgba(251,191,36,0.06)']} style={styles.rewardPill}>
              <Text style={styles.eliteBeansValue}>+🎖️{beansEarned}</Text>
            </LinearGradient>
          </View>
        </View>
        <View style={styles.cardFooterSimple}>
            <Text style={styles.footerTimeText}>{dateObj.toLocaleDateString()} • {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            <View style={[styles.receivedTag, { backgroundColor: theme.primary + '20' }]}>
                <MaterialCommunityIcons name="check-decagram" size={12} color={theme.accentText} />
                <Text style={[styles.receivedText, { color: theme.accentText }]}>VERIFIED</Text>
            </View>
        </View>
      </TiltCard>
    );
  };

  const filteredData = allTransactions.filter(t => t.type === activeTab);
  const tabCount = (id: string) => allTransactions.filter(t => t.type === id).length;
  const giftsTotalCount = tabCount('live_gift') + tabCount('party_gift') + tabCount('call_gift');

  const activeTabLabel = TABS.find(t => t.id === activeTab)?.label || '';

  // 🆕 HEADER (scrolls with the list): title row + LEVEL CORE stage + identity + stat tiles + tabs + section label
  const headerEl = (
    <View onLayout={(e) => setHeaderH(e.nativeEvent.layout.height)}>
        <Animated.View
            style={[
                styles.eliteHeader,
                {
                    opacity: heroEnter,
                    transform: [{ translateY: heroEnter.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }]
                }
            ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={[styles.glassBackBtn, { borderColor: theme.primary + '40' }, sideMix]}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <View style={[styles.statusPill, { borderColor: theme.primary + '66' }, sideMix]}>
                <PulseDot color={theme.accent} size={6} />
                <Text style={[styles.headerLabel, { color: theme.primaryText }]}>SECURE TERMINAL</Text>
            </View>
            <Text style={styles.headerMainTitle}>Reward Hub</Text>
          </View>
          <TouchableOpacity style={[styles.headerActionBtn, { borderColor: theme.accent + '40' }, sideMix]} onPress={fetchAllArchives}>
            <Animated.View style={{ transform: [{ rotate: refreshRotate }] }}>
                <MaterialCommunityIcons name="shield-refresh-outline" size={24} color={theme.accentText} />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>

        {/* 🆕 LEVEL CORE STAGE (radial tick gauge + spinning core + 3D objects) */}
        <Animated.View
            style={[
                styles.stageWrap,
                {
                    opacity: Animated.multiply(heroEnter, stageOpacity),
                    transform: [{ perspective: 1000 }, { rotateX: heroRotX }, { translateY: stageTY }, { scale: Animated.multiply(heroScale, stageScale) }]
                }
            ]}
        >
            <View style={[styles.stageGlowBig, { backgroundColor: theme.accent + '08' }]} pointerEvents="none" />
            <View style={[styles.stageGlowSmall, { backgroundColor: theme.primary + '0C' }]} pointerEvents="none" />

            {/* light sweep */}
            <Animated.View pointerEvents="none" style={[styles.sweep, { transform: [{ translateX: sweepX }, { rotate: '18deg' }] }]}>
                <LinearGradient colors={['transparent', 'rgba(255,255,255,0.10)', 'transparent']} start={{x:0,y:0}} end={{x:1,y:0}} style={{ flex: 1 }} />
            </Animated.View>

            <Sparkle x={width * 0.18} y={30} size={13} color={theme.accentText} delay={0} />
            <Sparkle x={width * 0.72} y={70} size={10} color={theme.primaryText} delay={600} />
            <Sparkle x={width * 0.12} y={190} size={11} color={theme.secondaryText} delay={1100} />

            {/* floating 3D objects */}
            <FloatBox amp={7} dur={2000} style={styles.stageTrophy}>
                <Img3D uri={IMG.star} size={56} fallback="star" color={theme.accentText} />
            </FloatBox>
            <FloatBox amp={9} dur={2400} style={styles.stageDiamond}>
                <Img3D uri={IMG.gift} size={52} fallback="gift" color={theme.accentText} />
            </FloatBox>
            <FloatBox amp={6} dur={2800} style={styles.stageStar}>
                <Img3D uri={IMG.diamond} size={38} fallback="diamond" color={theme.secondaryText} />
            </FloatBox>

            {/* gauge ring (level progress) */}
            <GaugeRing progress={levelProgress} color={theme.accent} size={232} ticks={56} />

            {/* core: spinning gradient ring + trophy */}
            <View style={styles.trophyBox}>
                <OrbitRing size={150} color={theme.accent} dur={5000} dotSize={6} />
                <OrbitRing size={130} color={theme.primaryText} dur={8000} reverse dotSize={4} style={{ opacity: 0.7 }} />
                <View style={[styles.coreMask, { shadowColor: theme.accent }]}>
                    <Animated.View style={[styles.coreSpin, { transform: [{ rotate: ringRotate }] }]}>
                        <LinearGradient
                            colors={[theme.accent, theme.primary, theme.secondary, lighten(theme.accent, 0.5), theme.accent] as any}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={StyleSheet.absoluteFill}
                        />
                    </Animated.View>
                    <View style={styles.trophyCore}>
                        <SafeImage
                            uri={IMG.trophy}
                            fallbackIcon="trophy"
                            color="#FBBF24"
                            style={styles.trophyImg}
                        />
                    </View>
                </View>
                <FloatBox amp={4} dur={1500} style={styles.coreCrown}>
                    <Img3D uri={config.lvl >= 5 ? IMG.crown : IMG.star} size={38} fallback="ribbon" color={theme.accentText} />
                </FloatBox>
                <View style={[styles.coreLevelBadge, { borderColor: theme.accent + 'AA', shadowColor: theme.accent }, sideMix]}>
                    <Ionicons name="star" size={10} color={theme.accentText} style={{ marginRight: 4 }} />
                    <Text style={[styles.coreLevelText, { color: theme.accentText }]}>L{config.lvl}</Text>
                </View>
            </View>
        </Animated.View>

        {/* 🆕 identity text under the core (old hero data: lifetime rewards, level chip, progress) */}
        <Animated.View style={[styles.identityBlock, { opacity: heroEnter }]}>
            <Text style={styles.heroLabel}>LIFETIME REWARDS</Text>
            <Text style={styles.heroValue} numberOfLines={1} adjustsFontSizeToFit>🎖️ {countedLifetime.toLocaleString()}</Text>
            <View style={styles.levelRow}>
                <LinearGradient colors={[theme.bA, theme.bB]} start={{x:0,y:0}} end={{x:1,y:0}} style={styles.levelChip}>
                    <MaterialCommunityIcons name="crown" size={11} color="#FFF" />
                    <Text style={styles.levelChipText}>{config.label}</Text>
                </LinearGradient>
            </View>
            <View style={[styles.progressTrack, { width: '70%' }]}>
                <Animated.View style={[styles.progressFill, { width: progWidth }]}>
                    <LinearGradient colors={[theme.primary, theme.accent]} start={{x:0,y:0}} end={{x:1,y:0}} style={{ flex: 1 }} />
                </Animated.View>
            </View>
            <Text style={styles.progressText}>
                {config.lvl >= 10 ? 'MAX LEVEL REACHED' : `${Math.round(levelProgress * 100)}% TO LEVEL ${config.lvl + 1}`}
            </Text>
        </Animated.View>

        {/* 🆕 STAT TILES (3 glass tiles with DOUBLE COLOUR frame) */}
        <View style={styles.statRow}>
            <StatTile icon="videocam" label="CALLS" color={theme.primaryText} glow={theme.primary} frameA={theme.bA} frameB={theme.bB} enter={heroEnter}>
                <CountUp style={styles.summaryValue} value={tabCount('video_call')} />
            </StatTile>
            <StatTile icon="gift" label="GIFTS" color={theme.accentText} glow={theme.accent} frameA={theme.bB} frameB={theme.bA} enter={heroEnter}>
                <CountUp style={styles.summaryValue} value={giftsTotalCount} />
            </StatTile>
            <StatTile icon="star" label="BONUS" color={theme.secondaryText} glow={theme.secondary} frameA={theme.bA} frameB={theme.bB} enter={heroEnter}>
                <CountUp style={styles.summaryValue} value={tabCount('daily_bonus')} />
            </StatTile>
        </View>

        {/* 👑 TABS: separate pill buttons with DOUBLE COLOUR border (horizontal scroll kept) */}
        <View style={styles.tabScrollWrap}>
            <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false} 
                contentContainerStyle={styles.tabCapsuleContainer}
            >
                {TABS.map((tab, tIdx) => {
                    const isActive = activeTab === tab.id;
                    const cnt = tabCount(tab.id);
                    const fA = tIdx % 2 === 0 ? theme.bA : theme.bB;
                    const fB = tIdx % 2 === 0 ? theme.bB : theme.bA;
                    return (
                        <Animated.View key={tab.id} style={{ marginRight: 10, transform: [{ scale: isActive ? tabPop : 1 }] }}>
                            <TouchableOpacity activeOpacity={0.85} onPress={() => setActiveTab(tab.id as any)}>
                                <LinearGradient colors={[fA, fB, fA] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.tabBtnFrame, { shadowColor: fA, shadowOpacity: isActive ? 0.6 : 0.15 }]}>
                                    <View style={styles.tabBtnInner}>
                                        {isActive && (
                                            <LinearGradient colors={[darken(fA, 0.3), darken(fB, 0.3)] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                        )}
                                        <View style={styles.tabBtnContent}>
                                            {tab.iconType === 'Ionicons' ? (
                                                <Ionicons name={tab.icon as any} size={16} color={isActive ? '#FFF' : '#E2E8F0'} />
                                            ) : (
                                                <MaterialCommunityIcons name={tab.icon as any} size={16} color={isActive ? '#FFF' : '#E2E8F0'} />
                                            )}
                                            <Text style={[styles.eliteTabText, isActive && styles.eliteTabTextActive]}>{tab.label}</Text>
                                            {cnt > 0 && (
                                                <View style={[styles.tabCount, isActive && { backgroundColor: 'rgba(255,255,255,0.24)' }]}>
                                                    <Text style={styles.tabCountText}>{cnt > 99 ? '99+' : cnt}</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    )
                })}
            </ScrollView>
        </View>

        {/* 🆕 Section label */}
        <Animated.View style={[styles.sectionRow, { opacity: tabAnim }]}>
            <View style={[styles.sectionDot, { backgroundColor: theme.accent, shadowColor: theme.accent }]} />
            <Text style={[styles.sectionTitle, { color: theme.accentText }]} numberOfLines={1}>{activeTabLabel.toUpperCase()}</Text>
            <View style={{ flex: 1 }} />
            <View style={[styles.sectionCount, { borderColor: theme.accent + '66' }, sideMix]}>
                <Text style={[styles.sectionCountText, { color: theme.accentText }]}>{filteredData.length}</Text>
            </View>
        </Animated.View>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />

      {/* 🆕 BACKGROUND IMAGE (dark, low opacity) */}
      {!bgErr && (
        <Image source={{ uri: BG_IMG }} resizeMode="cover" onError={() => setBgErr(true)} style={[StyleSheet.absoluteFill, { opacity: 0.3 }]} />
      )}
      {/* 🆕 level-colour tint + readability shade (darker) */}
      <LinearGradient colors={[theme.primary + '14', 'rgba(1,3,12,0.35)', theme.secondary + '10']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <LinearGradient colors={['rgba(1,3,12,0.35)', 'rgba(1,3,12,0.78)']} style={StyleSheet.absoluteFill} pointerEvents="none" />
      
      <Animated.View style={[styles.shimmerOrb, { top: 120, right: -60, backgroundColor: theme.primary, transform: [{ translateY: Animated.add(orbTranslateY, bgShift) }] }]} />
      <Animated.View style={[styles.shimmerOrb, { top: 500, left: -90, backgroundColor: theme.secondary, transform: [{ translateY: Animated.add(Animated.multiply(orbTranslateY, -1), bgShift) }] }]} />
      <Animated.View style={[styles.shimmerOrbSmall, { top: height * 0.32, left: width * 0.4, backgroundColor: theme.accent, transform: [{ translateY: Animated.multiply(orbTranslateY, 0.6) }] }]} />

      {/* 🆕 Floating 3D background objects with scroll parallax */}
      <Animated.View pointerEvents="none" style={[styles.bgFloat, { top: 470, right: 14, opacity: 0.14, transform: [{ translateY: bgShiftSlow }] }]}>
          <FloatBox amp={14} dur={2600}>
              <Img3D uri={IMG.diamond} size={64} fallback="diamond" color={theme.accent} />
          </FloatBox>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.bgFloat, { top: 660, left: 10, opacity: 0.12, transform: [{ translateY: bgShiftSlow }] }]}>
          <FloatBox amp={10} dur={2200}>
              <Img3D uri={IMG.trophy} size={52} fallback="trophy" color={theme.accent} />
          </FloatBox>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.bgFloat, { top: 800, right: 30, opacity: 0.10, transform: [{ translateY: bgShiftSlow }] }]}>
          <FloatBox amp={12} dur={3000}>
              <Img3D uri={IMG.gift} size={48} fallback="gift" color={theme.accent} />
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

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* 🆕 FULL-SCREEN SCROLL LIST (hero + tabs + cards all scroll together) */}
        <AnimatedFlatList 
            ref={listRef}
            data={loading ? [] : filteredData} 
            keyExtractor={(item: any, index: number) => `${item.id}_${index}`} 
            renderItem={activeTab === 'video_call' ? renderCallItem : renderGiftItem} 
            contentContainerStyle={styles.listContainer} 
            showsVerticalScrollIndicator={false} 
            scrollEventThrottle={16}
            onScroll={onScroll}
            ListHeaderComponent={headerEl}
            ListEmptyComponent={
                loading ? (
                    <View style={styles.loaderBox}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={[styles.loaderText, { color: theme.primaryText }]}>SYNCING ARCHIVES...</Text>
                    </View>
                ) : (
                    <Animated.View style={[styles.emptyCenter, { opacity: tabAnim, transform: [{ translateY: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }] }]}>
                        <View style={styles.emptyOrbitWrap}>
                            <OrbitRing size={150} color={theme.accent} dur={7000} dotSize={7} />
                            <OrbitRing size={116} color={theme.primaryText} dur={5000} reverse dotSize={5} />
                            <Animated.View style={[styles.emptyIconCircle, { borderColor: theme.primary + '30', transform: [{ translateY: floatAnim }] }]}>
                                <MaterialCommunityIcons name="database-off" size={60} color={theme.primaryText} style={{ opacity: 0.6 }} />
                            </Animated.View>
                        </View>
                        <Text style={styles.emptyTitleText}>No Activity Found</Text>
                        <Text style={{color: '#CBD5E1', fontSize: 13, marginTop: 10, textAlign: 'center'}}>Your earning records will appear here after synchronization.</Text>
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
                  <LinearGradient colors={[lighten(theme.accent, 0.5), theme.accent, darken(theme.accent, 0.35)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.miniAvatarRing}>
                      <View style={styles.miniCore}>
                          <Text style={styles.miniCoreText}>L{config.lvl}</Text>
                      </View>
                  </LinearGradient>
                  <View style={{ marginLeft: 10, flexShrink: 1 }}>
                      <Text style={styles.miniName} numberOfLines={1}>Reward Hub</Text>
                      <Text style={[styles.miniLevel, { color: theme.accentText }]} numberOfLines={1}>{config.label}</Text>
                  </View>
              </TouchableOpacity>
              <View style={styles.miniTabs}>
                  <TouchableOpacity onPress={fetchAllArchives} activeOpacity={0.8} style={[styles.miniTabBtn, sideMix]}>
                      <Animated.View style={{ transform: [{ rotate: refreshRotate }] }}>
                          <MaterialCommunityIcons name="shield-refresh-outline" size={18} color={theme.accentText} />
                      </Animated.View>
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
  shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.08 },
  shimmerOrbSmall: { position: 'absolute', width: 160, height: 160, borderRadius: 80, opacity: 0.07 },
  bgFloat: { position: 'absolute' },
  eliteHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 0, paddingTop: 12, paddingBottom: 14, justifyContent: 'space-between' },
  glassBackBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(2,4,14,0.8)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.2 },
  headerTitleContainer: { flex: 1, marginLeft: 18 },
  headerLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 4 },
  statusPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, borderWidth: 1.2, backgroundColor: 'rgba(4,7,18,0.8)' },
  headerMainTitle: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: -1 },
  headerActionBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(2,4,14,0.8)', borderWidth: 1.2, justifyContent: 'center', alignItems: 'center' },

  // 🆕 LEVEL CORE STAGE
  stageWrap: { height: 272, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stageGlowBig: { position: 'absolute', width: 300, height: 300, borderRadius: 150 },
  stageGlowSmall: { position: 'absolute', width: 190, height: 190, borderRadius: 95 },
  stageTrophy: { position: 'absolute', left: 0, top: 24 },
  stageDiamond: { position: 'absolute', right: 0, top: 60 },
  stageStar: { position: 'absolute', left: 14, bottom: 22 },
  coreMask: { width: 116, height: 116, borderRadius: 58, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 16, shadowOpacity: 0.8, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
  coreSpin: { position: 'absolute', width: 230, height: 230, left: -57, top: -57 },
  coreCrown: { position: 'absolute', top: -30, alignSelf: 'center' },
  coreLevelBadge: { position: 'absolute', bottom: -12, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 14, borderWidth: 1.2, backgroundColor: '#06031A', shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  coreLevelText: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
  identityBlock: { alignItems: 'center', marginTop: 8, marginBottom: 16 },

  // HERO (old keys kept, now used by the stage)
  heroWrap: { paddingHorizontal: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 14 },
  heroBorder: { borderRadius: 30, padding: 1.5 },
  heroInner: { borderRadius: 28.5, backgroundColor: '#070B1A', padding: 18, overflow: 'hidden' },
  sweep: { position: 'absolute', top: -40, bottom: -40, width: 120 },
  heroTop: { flexDirection: 'row', alignItems: 'center' },
  trophyBox: { width: 120, height: 120, alignItems: 'center', justifyContent: 'center' },
  trophyRing: { width: 84, height: 84, borderRadius: 42, opacity: 0.9 },
  trophyCore: { width: 104, height: 104, borderRadius: 52, backgroundColor: '#030612', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  trophyImg: { width: 66, height: 66 },
  heroLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 2.5 },
  heroValue: { color: '#FBBF24', fontSize: 30, fontWeight: '900', marginTop: 2, letterSpacing: -0.5, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
  levelRow: { flexDirection: 'row', marginTop: 8 },
  levelChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  levelChipText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  progressTrack: { height: 7, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.10)', marginTop: 14, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 6, overflow: 'hidden' },
  progressText: { color: 'rgba(255,255,255,0.92)', fontSize: 8.5, fontWeight: '900', letterSpacing: 1.5, marginTop: 6 },

  // 🆕 stat tiles
  statRow: { flexDirection: 'row', gap: 10, overflow: 'hidden', borderRadius: 22 },
  statTileFrame: { borderRadius: 22, padding: 1.4 },
  statTile: { borderRadius: 20.6, overflow: 'hidden', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 6, backgroundColor: 'rgba(2, 4, 14, 0.88)' },
  statIconBadge: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginBottom: 6, shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  summaryLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 9, fontWeight: '900', letterSpacing: 1.4, marginTop: 3 },
  summaryValue: { color: '#FFF', fontSize: 20, fontWeight: '900' },

  // TABS
  tabScrollWrap: { marginTop: 18, marginHorizontal: -20 },
  tabCapsuleContainer: { paddingHorizontal: 20, paddingBottom: 16 },
  tabCapsule: { flexDirection: 'row', backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 25, padding: 6, borderWidth: 1, overflow: 'hidden' },
  eliteTab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16, position: 'relative' },
  eliteTabActive: { borderRadius: 20 },
  activeGlow: { position: 'absolute', bottom: 0, width: '60%', height: 3, borderRadius: 10, shadowOpacity: 1, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  eliteTabText: { color: '#E2E8F0', fontSize: 12, fontWeight: '900', letterSpacing: 0.5, marginHorizontal: 6 },
  eliteTabTextActive: { color: '#FFF' },
  tabCount: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  tabCountText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
  tabBtnFrame: { borderRadius: 24, padding: 1.6, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  tabBtnInner: { height: 46, borderRadius: 22.4, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(2, 4, 14, 0.93)', paddingHorizontal: 16 },
  tabBtnContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },

  // 🆕 section label
  sectionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 0, marginBottom: LIST_PAD_TOP - 6 },
  sectionDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  sectionTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2.5, flexShrink: 1 },
  sectionCount: { minWidth: 28, height: 22, borderRadius: 11, paddingHorizontal: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.55)' },
  sectionCountText: { fontSize: 11, fontWeight: '900' },

  // CARDS
  listContainer: { paddingHorizontal: 20, paddingBottom: 120 },
  cardShadow: { marginBottom: 18, shadowOpacity: 0.45, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  cardBorder: { borderRadius: 30, padding: 1.5 },
  cardInner: { borderRadius: 28.5, backgroundColor: 'rgba(3, 5, 18, 0.97)', overflow: 'hidden' },
  cardShine: { position: 'absolute', top: -40, bottom: -40, width: 70 },
  cardWatermark3D: { position: 'absolute', right: -22, bottom: -26 },
  statusGlowLine: { height: 3, width: '100%' },
  cardMain: { flexDirection: 'row', padding: 18, justifyContent: 'space-between', alignItems: 'center' },
  userSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarNode: { width: 76, height: 76, alignItems: 'center', justifyContent: 'center' },
  avatarWrapper: { position: 'relative' },
  avatarRing: { width: 61, height: 61, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  eliteAvatar: { width: 55, height: 55, borderRadius: 21, backgroundColor: '#0F172A', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  levelBadgeMini: { position: 'absolute', bottom: -6, right: -6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 2, borderColor: '#010309' },
  levelBadgeText: { color: '#FFF', fontSize: 7, fontWeight: '900' },
  userMeta: { marginLeft: 8, flex: 1, paddingRight: 10, flexShrink: 1 },
  nodeTagText: { fontSize: 8, fontWeight: '900', letterSpacing: 2, opacity: 0.75, marginBottom: 2 },
  eliteUserName: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.2, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
  dateTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  giftLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  giftIconChip: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  eliteDateText: { color: '#CBD5E1', fontSize: 10, fontWeight: '800' },
  giftSubName: { color: '#FBBF24', fontSize: 11, fontWeight: '900', flexShrink: 1 },
  earningsBlock: { alignItems: 'flex-end', minWidth: 60 },
  earnLabel: { color: '#94A3B8', fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
  rewardPill: { marginTop: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(251,191,36,0.35)' },
  beansRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  eliteBeansValue: { color: '#FBBF24', fontSize: 18, fontWeight: '900' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.25)' },
  footerStatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerStatText: { color: '#CBD5E1', fontSize: 11, fontWeight: '800' },
  verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  verifiedText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  cardFooterSimple: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.03)', alignItems: 'center' },
  footerTimeText: { color: '#CBD5E1', fontSize: 10, fontWeight: '800' },
  receivedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  receivedText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  loaderBox: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 80 },
  loaderText: { marginTop: 15, fontWeight: '900', fontSize: 10, letterSpacing: 2 },
  emptyCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyOrbitWrap: { width: 170, height: 170, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
  emptyIconCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.02)', justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  emptyTitleText: { color: '#FFF', fontSize: 22, fontWeight: '900' },

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
