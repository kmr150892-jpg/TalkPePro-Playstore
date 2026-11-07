import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
// 🔥 SATTI FIX: Added deleteDoc, arrayUnion for Kick and Block logic
import { getDatabase, onDisconnect, onValue, ref, set } from 'firebase/database';
import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
// 🔥 SATTI FIX: Added ScrollView to imports for the Disclaimer Modal
// 🆕 PanResponder added for the Beauty Studio sliders
import { Alert, Animated, AppState, Dimensions, Easing, FlatList, Image, KeyboardAvoidingView, Modal, PanResponder, PermissionsAndroid, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import createAgoraRtcEngine, {
    ChannelProfileType,
    ClientRoleType,
    IRtcEngine,
    LighteningContrastLevel,
    RtcTextureView,
} from 'react-native-agora';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';
import { checkAndRequestCallPermissions } from '../../utils/permissions';

import * as ScreenCapture from 'expo-screen-capture';
import GiftOverlay from '../../components/GiftOverlay';
import LiveGameSheet from '../../components/LiveGameSheet';
import MemoryMatch from '../../components/MemoryMatch';

const { width, height } = Dimensions.get('window');
const AGORA_APP_ID = '718cedc3c47e44d1bfa4853d6ac6cd80';

// 🎨 PREMIUM HELPER: safe hex + alpha (works with 6 digit and 8 digit hex colors)
const withAlpha = (hex: string, a: number) => {
    const base = (hex || '#ffffff').slice(0, 7);
    const v = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
    return base + v;
};

// 🎨 PREMIUM HELPER: solid lighten (+) / darken (-) of a hex colour -> fully opaque result (for solid buttons)
const shade = (hex: string, amt: number) => {
    const h = (hex || '#ffffff').slice(1, 7);
    const n = parseInt(h.length === 6 ? h : 'ffffff', 16);
    const target = amt < 0 ? 0 : 255;
    const p = Math.min(1, Math.abs(amt));
    const mix = (c: number) => Math.round(c + (target - c) * p);
    const r = mix((n >> 16) & 255);
    const g = mix((n >> 8) & 255);
    const b = mix(n & 255);
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const getLevelConfig = (beans: number) => {
    if (beans >= 100000000) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'] as const, glow: '#F59E0B', next: 0, prev: 50000000, rate: 8000 };
    if (beans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'] as const, glow: '#EC4899', next: 100000000, prev: 30000000, rate: 7000 };
    if (beans >= 30000000) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'] as const, glow: '#8B5CF6', next: 50000000, prev: 10000000, rate: 5400 };
    if (beans >= 10000000) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'] as const, glow: '#3B82F6', next: 30000000, prev: 5000000, rate: 4800 };
    if (beans >= 5000000)  return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'] as const, glow: '#06B6D4', next: 10000000, prev: 3000000, rate: 4200 };
    if (beans >= 3000000)  return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'] as const, glow: '#10B981', next: 5000000, prev: 1000000, rate: 3600 };
    if (beans >= 1000000)  return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'] as const, glow: '#EAB308', next: 3000000, prev: 300000, rate: 3000 };
    if (beans >= 300000)    return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'] as const, glow: '#94A3B8', next: 1000000, prev: 100000, rate: 2400 };
    if (beans >= 100000)   return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'] as const, glow: 'transparent', next: 300000, prev: 30000, rate: 1800 };
    if (beans >= 30000)    return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'] as const, glow: 'transparent', next: 100000, prev: 0, rate: 1200 };
    return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'] as const, glow: 'transparent', next: 30000, prev: 0, rate: 1000 };
};

// 🆕 BEAUTY STUDIO CONFIG (presets + default levels)
const DEFAULT_BEAUTY = { light: 0.7, smooth: 0.8, red: 0.5, sharp: 0.3 };
const BEAUTY_PRESETS = [
    { key: 'Natural', icon: 'leaf', color: '#34D399', lv: { light: 0.5, smooth: 0.4, red: 0.3, sharp: 0.3 } },
    { key: 'Glam', icon: 'diamond-stone', color: '#F472B6', lv: { light: 0.8, smooth: 0.9, red: 0.6, sharp: 0.4 } },
    { key: 'Fresh', icon: 'water', color: '#22D3EE', lv: { light: 0.7, smooth: 0.6, red: 0.4, sharp: 0.5 } },
    { key: 'Studio', icon: 'camera-iris', color: '#FBBF24', lv: { light: 0.6, smooth: 0.7, red: 0.2, sharp: 0.6 } },
];
const BEAUTY_SLIDERS: { key: 'smooth' | 'light' | 'red' | 'sharp', label: string, icon: string, color: string }[] = [
    { key: 'smooth', label: 'Smooth', icon: 'blur', color: '#A78BFA' },
    { key: 'light', label: 'Brighten', icon: 'white-balance-sunny', color: '#FBBF24' },
    { key: 'red', label: 'Rosy', icon: 'heart', color: '#F472B6' },
    { key: 'sharp', label: 'Sharpen', icon: 'details', color: '#22D3EE' },
];

// ✨ SPINNING GRADIENT RING (3D feel avatar frame)
const SpinRing = ({ size, colors, children, speed = 6000 }: { size: number, colors: any, children?: React.ReactNode, speed?: number }) => {
    const spin = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: speed, easing: Easing.linear, useNativeDriver: true }));
        loop.start();
        return () => loop.stop();
    }, []);
    const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, overflow: 'hidden', transform: [{ rotate }] }}>
                <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
            </Animated.View>
            <View style={{ width: size - 6, height: size - 6, borderRadius: (size - 6) / 2, backgroundColor: '#020617', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {children}
            </View>
        </View>
    );
};

// ✨ PULSING LIVE DOT
const PulseDot = ({ color = '#EF4444', size = 8 }: { color?: string, size?: number }) => {
    const a = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }));
        loop.start();
        return () => loop.stop();
    }, []);
    const scale = a.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
    const opacity = a.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] });
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity, transform: [{ scale }] }} />
            <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
        </View>
    );
};

// ✨ SONAR PULSE RINGS (connecting screen + incoming call)
const PulseRings = ({ color, size }: { color: string, size: number }) => {
    const rings = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
    useEffect(() => {
        const loops = rings.map((v, i) => {
            const l = Animated.loop(
                Animated.sequence([
                    Animated.delay(i * 600),
                    Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                    Animated.delay((2 - i) * 600),
                ])
            );
            l.start();
            return l;
        });
        return () => loops.forEach(l => l.stop());
    }, []);
    return (
        <>
            {rings.map((v, i) => (
                <Animated.View
                    key={i}
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        width: size,
                        height: size,
                        borderRadius: size / 2,
                        borderWidth: 2,
                        borderColor: color,
                        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2] }) }],
                    }}
                />
            ))}
        </>
    );
};

// ✨ SOLID 3D ORB BUTTON (🆕 opaque deep gradient + crisp white ring, NO gloss/shadow over the icon -> icon always solid & clear)
const GlowOrbButton = ({ onPress, disabled, color, active, children, size = 46, glow = true }: { onPress?: () => void, disabled?: boolean, color: string, active?: boolean, children?: React.ReactNode, size?: number, glow?: boolean }) => {
    const press = useRef(new Animated.Value(0)).current;
    const pulse = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!glow) return;
        const loop = Animated.loop(Animated.timing(pulse, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }));
        loop.start();
        return () => loop.stop();
    }, [glow]);
    const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] });
    const glowScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });
    const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0] });
    return (
        <TouchableOpacity
            activeOpacity={0.9}
            disabled={disabled}
            onPress={onPress}
            onPressIn={() => Animated.spring(press, { toValue: 1, speed: 40, bounciness: 4, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(press, { toValue: 0, speed: 20, bounciness: 10, useNativeDriver: true }).start()}
        >
            <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.55 : 1 }}>
                {glow && (
                    <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: glowOpacity, transform: [{ scale: glowScale }] }} />
                )}
                <Animated.View style={{ transform: [{ scale }] }}>
                    <LinearGradient
                        colors={[shade(color, active ? 0.08 : -0.08), shade(color, -0.5)]}
                        start={{ x: 0.2, y: 0 }}
                        end={{ x: 0.8, y: 1 }}
                        style={[styles.orbBtn, { width: size, height: size, borderRadius: size / 2, borderColor: active ? '#FFFFFF' : 'rgba(255,255,255,0.85)' }]}
                    >
                        {children}
                    </LinearGradient>
                </Animated.View>
            </View>
        </TouchableOpacity>
    );
};

// 🔮 RAIL ITEM: right-side control flips in with a 3D spring (staggered by index)
const RailItem = ({ index, color, active, onPress, children, size = 46 }: { index: number, color: string, active?: boolean, onPress?: () => void, children?: React.ReactNode, size?: number }) => {
    const a = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.sequence([
            Animated.delay(300 + index * 90),
            Animated.spring(a, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
        ]).start();
    }, []);
    return (
        <Animated.View
            style={{
                opacity: a,
                transform: [
                    { perspective: 700 },
                    { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) },
                    { rotateY: a.interpolate({ inputRange: [0, 1], outputRange: ['-80deg', '0deg'] }) },
                    { scale: a },
                ],
            }}
        >
            <GlowOrbButton color={color} active={active} onPress={onPress} size={size} glow={false}>
                {children}
            </GlowOrbButton>
        </Animated.View>
    );
};

// ✨ MAGIC PANEL: grows out of the bottom & shrinks back (kept in-place, NOT a Modal -> no conflicts)
const MagicPanel = ({ visible, children, style }: { visible: boolean, children?: React.ReactNode, style?: any }) => {
    const a = useRef(new Animated.Value(0)).current;
    const [mounted, setMounted] = useState(visible);
    useEffect(() => {
        if (visible) {
            setMounted(true);
            Animated.spring(a, { toValue: 1, friction: 8, tension: 70, useNativeDriver: true }).start();
        } else {
            Animated.timing(a, { toValue: 0, duration: 220, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(({ finished }) => {
                if (finished) setMounted(false);
            });
        }
    }, [visible]);
    if (!mounted) return null;
    return (
        <Animated.View
            pointerEvents={visible ? 'auto' : 'none'}
            style={[
                style,
                {
                    opacity: a,
                    transform: [
                        { perspective: 900 },
                        { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [90, 0] }) },
                        { rotateX: a.interpolate({ inputRange: [0, 1], outputRange: ['40deg', '0deg'] }) },
                        { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
                    ],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
};

// ✨ CHAT MESSAGE 3D POP-IN
const ChatPop = ({ children, style }: { children?: React.ReactNode, style?: any }) => {
    const a = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(a, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }).start();
    }, []);
    return (
        <Animated.View
            style={[
                {
                    opacity: a,
                    transform: [
                        { perspective: 600 },
                        { rotateX: a.interpolate({ inputRange: [0, 1], outputRange: ['40deg', '0deg'] }) },
                        { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) },
                        { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                    ],
                },
                style,
            ]}
        >
            {children}
        </Animated.View>
    );
};

// 🆕 ✨ TWINKLE STAR (tiny sparkle for the ultra beauty button)
const TwinkleStar = ({ x, y, size = 10, color = '#FFD700', delay = 0 }: { x: number, y: number, size?: number, color?: string, delay?: number }) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(v, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(v, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
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
                opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }),
                transform: [
                    { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] }) },
                    { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) },
                ],
            }}
        >
            <MaterialCommunityIcons name="star-four-points" size={size} color={color} />
        </Animated.View>
    );
};

// 🆕 💎 ULTRA BEAUTY BUTTON (standalone, always visible: rainbow spin ring + aura + PRO tag)
const BeautyUltraButton = ({ active, onPress }: { active?: boolean, onPress?: () => void }) => {
    const press = useRef(new Animated.Value(0)).current;
    const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] });
    return (
        <TouchableOpacity
            activeOpacity={0.92}
            onPress={onPress}
            onPressIn={() => Animated.spring(press, { toValue: 1, speed: 40, bounciness: 4, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(press, { toValue: 0, speed: 20, bounciness: 10, useNativeDriver: true }).start()}
        >
            <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
                <View style={{ width: 62, height: 62, alignItems: 'center', justifyContent: 'center' }}>
                    {!active && <PulseRings color="#EC4899" size={56} />}
                    <SpinRing size={62} colors={['#F472B6', '#A855F7', '#22D3EE', '#FFD700', '#F472B6']} speed={3200}>
                        <LinearGradient
                            colors={active ? ['#F472B6', '#9D174D'] : ['#EC4899', '#5B21B6']}
                            start={{ x: 0.2, y: 0 }}
                            end={{ x: 0.8, y: 1 }}
                            style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}
                        >
                            <MaterialCommunityIcons name="face-man-shimmer" size={30} color="#FFFFFF" />
                        </LinearGradient>
                    </SpinRing>
                    <TwinkleStar x={-2} y={2} size={11} color="#FFD700" delay={0} />
                    <TwinkleStar x={50} y={-2} size={9} color="#22D3EE" delay={500} />
                    <TwinkleStar x={52} y={48} size={10} color="#F472B6" delay={900} />
                </View>
                <View style={styles.proTag}>
                    <Text style={styles.proTagText}>BEAUTY PRO</Text>
                </View>
            </Animated.View>
        </TouchableOpacity>
    );
};

// 🆕 🪄 MAGIC DOCK: ONE slider handle on the side. Tap -> glass capsule slides open & the 4 buttons fly out with equal spacing
const DOCK_BTN = 46;
const DOCK_GAP = 14;
const DOCK_PAD = 12;
const DOCK_COUNT = 4;
const DOCK_H = DOCK_COUNT * DOCK_BTN + (DOCK_COUNT - 1) * DOCK_GAP + DOCK_PAD * 2;
const DOCK_W = DOCK_BTN + 22;
const DOCK_TOGGLE = 54;
const BURST_DIRS = Array.from({ length: 8 }, (_, k) => ({ dx: Math.cos((k * Math.PI) / 4) * 40, dy: Math.sin((k * Math.PI) / 4) * 40 }));

const MagicDock = ({ items, open, onToggle, c0, c2 }: { items: { key: string, color: string, icon: React.ReactNode, onPress: () => void, active?: boolean }[], open: boolean, onToggle: () => void, c0: string, c2: string }) => {
    const h = useRef(new Animated.Value(0)).current;               // capsule height (JS driver)
    const spinV = useRef(new Animated.Value(0)).current;           // handle icon rotation
    const burst = useRef(new Animated.Value(0)).current;           // sparkle burst
    const press = useRef(new Animated.Value(0)).current;
    const itemAnims = useRef(items.map(() => new Animated.Value(0))).current;

    useEffect(() => {
        if (open) {
            Animated.timing(h, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
            Animated.timing(spinV, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
            burst.setValue(0);
            Animated.timing(burst, { toValue: 1, duration: 800, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
            Animated.stagger(85, itemAnims.map(v => Animated.spring(v, { toValue: 1, friction: 5, tension: 90, useNativeDriver: true }))).start();
        } else {
            Animated.stagger(40, [...itemAnims].reverse().map(v => Animated.timing(v, { toValue: 0, duration: 180, easing: Easing.in(Easing.quad), useNativeDriver: true }))).start();
            Animated.timing(h, { toValue: 0, duration: 320, delay: 120, easing: Easing.in(Easing.cubic), useNativeDriver: false }).start();
            Animated.timing(spinV, { toValue: 0, duration: 320, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start();
        }
    }, [open]);

    const pressScale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] });
    const handleRotate = spinV.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

    return (
        <View style={{ alignItems: 'center' }}>
            {/* HANDLE (the single slider button) */}
            <View style={{ width: DOCK_TOGGLE, height: DOCK_TOGGLE, alignItems: 'center', justifyContent: 'center' }}>
                {open && <PulseRings color={c0} size={DOCK_TOGGLE - 6} />}
                {BURST_DIRS.map((d, i) => (
                    <Animated.View
                        key={i}
                        pointerEvents="none"
                        style={{
                            position: 'absolute',
                            opacity: burst.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
                            transform: [
                                { translateX: burst.interpolate({ inputRange: [0, 1], outputRange: [0, d.dx] }) },
                                { translateY: burst.interpolate({ inputRange: [0, 1], outputRange: [0, d.dy] }) },
                                { scale: burst.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.3, 1.2, 0.4] }) },
                            ],
                        }}
                    >
                        <MaterialCommunityIcons name="star-four-points" size={12} color={i % 2 === 0 ? '#FFD700' : '#22D3EE'} />
                    </Animated.View>
                ))}
                <TouchableOpacity
                    activeOpacity={0.92}
                    onPress={onToggle}
                    onPressIn={() => Animated.spring(press, { toValue: 1, speed: 40, bounciness: 4, useNativeDriver: true }).start()}
                    onPressOut={() => Animated.spring(press, { toValue: 0, speed: 20, bounciness: 10, useNativeDriver: true }).start()}
                >
                    <Animated.View style={{ transform: [{ scale: pressScale }] }}>
                        <SpinRing size={DOCK_TOGGLE} colors={[c0, c2, '#FFFFFF', c0]} speed={4500}>
                            <LinearGradient
                                colors={open ? ['#22D3EE', '#4338CA'] : ['#7C3AED', '#312E81']}
                                start={{ x: 0.2, y: 0 }}
                                end={{ x: 0.8, y: 1 }}
                                style={{ width: DOCK_TOGGLE - 6, height: DOCK_TOGGLE - 6, borderRadius: (DOCK_TOGGLE - 6) / 2, alignItems: 'center', justifyContent: 'center' }}
                            >
                                <Animated.View style={{ transform: [{ rotate: handleRotate }] }}>
                                    <Ionicons name={open ? 'close' : 'apps'} size={24} color="#FFFFFF" />
                                </Animated.View>
                            </LinearGradient>
                        </SpinRing>
                    </Animated.View>
                </TouchableOpacity>
            </View>

            {/* GLASS CAPSULE (slider track) with the 4 buttons inside */}
            <Animated.View
                style={{
                    marginTop: 10,
                    width: DOCK_W,
                    height: h.interpolate({ inputRange: [0, 1], outputRange: [0, DOCK_H] }),
                    borderRadius: DOCK_W / 2,
                    overflow: 'hidden',
                    opacity: h.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 1, 1] }),
                }}
            >
                <LinearGradient colors={[c0, c2, c0]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                <View style={{ position: 'absolute', top: 1.5, left: 1.5, right: 1.5, bottom: 1.5, borderRadius: DOCK_W / 2 - 1.5, backgroundColor: 'rgba(6,10,26,0.92)' }} />
                <LinearGradient
                    colors={['transparent', c0, c2, 'transparent']}
                    style={{ position: 'absolute', left: DOCK_W / 2 - 1.5, width: 3, top: DOCK_PAD, height: DOCK_H - DOCK_PAD * 2, borderRadius: 2, opacity: 0.5 }}
                />
                <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: DOCK_H, paddingVertical: DOCK_PAD, alignItems: 'center' }}>
                    {items.map((it, i) => {
                        const v = itemAnims[i];
                        const fromY = -(DOCK_PAD + i * (DOCK_BTN + DOCK_GAP) + DOCK_BTN / 2 + 6);
                        return (
                            <Animated.View
                                key={it.key}
                                style={{
                                    marginBottom: i === items.length - 1 ? 0 : DOCK_GAP,
                                    opacity: v.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
                                    transform: [
                                        { perspective: 700 },
                                        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [fromY, 0] }) },
                                        { rotateY: v.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '0deg'] }) },
                                        { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-200deg', '0deg'] }) },
                                        { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
                                    ],
                                }}
                            >
                                <GlowOrbButton color={it.color} active={it.active} onPress={it.onPress} size={DOCK_BTN} glow={false}>
                                    {it.icon}
                                </GlowOrbButton>
                            </Animated.View>
                        );
                    })}
                </View>
            </Animated.View>
        </View>
    );
};

// 🆕 🎚️ BEAUTY SLIDER (drag with finger, smooth, touch never leaks to anything else)
const BeautySlider = ({ label, icon, color, value, onChange }: { label: string, icon: string, color: string, value: number, onChange: (v: number) => void }) => {
    const [w, setW] = useState(0);
    const wRef = useRef(0);
    const startV = useRef(0);
    const latest = useRef(value);
    const lastPush = useRef(0);
    const dragging = useRef(false);
    const cb = useRef(onChange);
    cb.current = onChange;
    const [local, setLocal] = useState(value);

    useEffect(() => {
        if (!dragging.current) {
            setLocal(value);
            latest.current = value;
        }
    }, [value]);

    const pan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderTerminationRequest: () => false,
            onPanResponderGrant: (e) => {
                dragging.current = true;
                const v = clamp01(e.nativeEvent.locationX / (wRef.current || 1));
                startV.current = v;
                latest.current = v;
                setLocal(v);
                lastPush.current = Date.now();
                cb.current(Math.round(v * 100) / 100);
            },
            onPanResponderMove: (_, g) => {
                const v = clamp01(startV.current + g.dx / (wRef.current || 1));
                latest.current = v;
                setLocal(v);
                const now = Date.now();
                if (now - lastPush.current > 80) {
                    lastPush.current = now;
                    cb.current(Math.round(v * 100) / 100);
                }
            },
            onPanResponderRelease: () => {
                dragging.current = false;
                cb.current(Math.round(latest.current * 100) / 100);
            },
            onPanResponderTerminate: () => {
                dragging.current = false;
                cb.current(Math.round(latest.current * 100) / 100);
            },
        })
    ).current;

    const knob = 22;
    const x = Math.max(0, Math.min(w, local * w));
    return (
        <View style={styles.sliderRow}>
            <View style={[styles.sliderIcon, { backgroundColor: color }]}>
                <MaterialCommunityIcons name={icon as any} size={16} color="#FFFFFF" />
            </View>
            <Text style={styles.sliderLabel} numberOfLines={1}>{label}</Text>
            <View
                style={styles.sliderHit}
                onLayout={(e) => { wRef.current = e.nativeEvent.layout.width; setW(e.nativeEvent.layout.width); }}
                {...pan.panHandlers}
            >
                <View pointerEvents="none" style={styles.sliderTrack}>
                    <LinearGradient colors={[color, shade(color, 0.35)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={{ width: x, height: '100%', borderRadius: 4 }} />
                </View>
                <View pointerEvents="none" style={[styles.sliderKnob, { left: x - knob / 2, borderColor: color }]}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />
                </View>
            </View>
            <Text style={styles.sliderValue}>{Math.round(local * 100)}</Text>
        </View>
    );
};

export default function LiveStreamScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const engine = useRef<IRtcEngine | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const isNavigatingToCall = useRef(false);
    
    const isAppClosing = useRef(false);
    const isRequestingPermissions = useRef(true);
    // 🔥 FIX: late "background" events right after the permission dialog closes are ignored for 2.5s
    const permGraceUntil = useRef(0);
    const bgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 🔥 FIX: real OS check (Android) so a false return from the util on first accept never kicks the host out
    const verifyCamMicGranted = async () => {
        if (Platform.OS !== 'android') return false; // iOS: trust the util result
        try {
            const cam = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
            const mic = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
            return cam && mic;
        } catch (e) { return false; }
    };

    const [joined, setJoined] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isFrontCamera, setIsFrontCamera] = useState(true);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [viewerCount, setViewerCount] = useState(0);

    const [seconds, setSeconds] = useState(0);
    const [showSummary, setShowSummary] = useState(false);
    const [earnings, setEarnings] = useState(0);
    const [giftAlert, setGiftAlert] = useState<string | null>(null);
    const [isProEnabled, setIsProEnabled] = useState(false);
    const [pinnedMessage, setPinnedMessage] = useState<any>(null);
    const [guestUid, setGuestUid] = useState<number | null>(null);
    const [hostImage, setHostImage] = useState<string>("");
    const [hostName, setHostName] = useState<string>("");
    
    const [hostLevel, setHostLevel] = useState<string>("BEGINNER");
    const [hostConfig, setHostConfig] = useState<any>(getLevelConfig(0));
    
    const [activeViewers, setActiveViewers] = useState<any[]>([]);
    const [showProSettings, setShowProSettings] = useState(false);
    // 🆕 ProLevel now has 4 levels (light, smooth, red, sharp) - defaults keep the old behaviour (0.7 / 0.8 / 0.5 / 0.3)
    const [ProLevel, setProLevel] = useState({ ...DEFAULT_BEAUTY });
    const [activePreset, setActivePreset] = useState<string | null>(null);

    // 🆕 Magic dock open/close + panel/rail animation values
    const [dockOpen, setDockOpen] = useState(false);
    const chatFade = useRef(new Animated.Value(1)).current;
    const railIn = useRef(new Animated.Value(0)).current;

    const [currentLiveId] = useState(params.liveId as string || `live_${auth.currentUser?.uid}_${Date.now()}`);

    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
    const [activeGift, setActiveGift] = useState<any>(null);

    const [gameVisible, setGameVisible] = useState(false);
    const [glassVisible, setGlassVisible] = useState(false);
    
    // 🔥 NEW: HOST GAMING DISCLAIMER MODAL STATES 🔥
    const [disclaimerVisible, setDisclaimerVisible] = useState(false);
    const [disclaimerChecked, setDisclaimerChecked] = useState(false);
    const [pendingGameType, setPendingGameType] = useState<'reflex' | 'memory' | null>(null);

    const [roomData, setRoomData] = useState<any>(null);
    const [myWalletBalance, setMyWalletBalance] = useState(0);

    const [sessionEarnedBeans, setSessionEarnedBeans] = useState(0);

    // 🔥 NEW: PLAY STORE REPORT & KICK ACTION SHEET STATES 🔥
    const [actionSheetVisible, setActionSheetVisible] = useState(false);
    // 🔥 SATTI FIX: NEW STATE FOR REPORT REASON SELECTION 🔥
    const [reportSheetVisible, setReportSheetVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const borderType1 = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: hostConfig.colors[0], borderRightColor: hostConfig.colors[0],
        borderTopColor: hostConfig.colors[2] + '80', borderBottomColor: hostConfig.colors[2] + '80',
    };

    const borderType2 = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: hostConfig.colors[2], borderRightColor: hostConfig.colors[2],
        borderTopColor: hostConfig.colors[0] + '80', borderBottomColor: hostConfig.colors[0] + '80',
    };

    const checkGameActive = async () => {
        try {
            const gameSnap = await getDoc(doc(db, "lives", currentLiveId, "games", "reflex_arena"));
            if (gameSnap.exists() && (gameSnap.data().status === 'PLAYING' || gameSnap.data().status === 'WAITING')) {
                return true;
            }
        } catch (e) { console.error("Game check error:", e); }
        return false;
    };

    const safeCancelGameForAudienceRefund = async () => {
        try {
            const roomRef = doc(db, "lives", currentLiveId, "games", "reflex_arena");
            const snap = await getDoc(roomRef);
            if (snap.exists()) {
                const data = snap.data();
                if (data.status === 'PLAYING' || data.status === 'WAITING') {
                    await updateDoc(roomRef, { status: 'CANCELLED' });
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }
        } catch (e) { console.log("Refund Wait Error: ", e); }
    };

    const removePlayerFromReflex = async () => {
        if (!auth.currentUser) return;
        try {
            const roomRef = doc(db, "lives", currentLiveId, "games", "reflex_arena");
            const snap = await getDoc(roomRef);
            if (snap.exists()) {
                const data = snap.data();
                if (data.status === 'PLAYING' || data.status === 'WAITING') {
                    const updatedPlayers = data.players.filter((p: any) => p.id !== auth.currentUser?.uid);
                    await updateDoc(roomRef, { players: updatedPlayers });
                }
            }
        } catch (e) { console.log(e); }
    };

    useEffect(() => {
        if (!currentLiveId) return;

        const inPermissionWindow = () => isRequestingPermissions.current || Date.now() < permGraceUntil.current;

        // same cleanup as before (nothing removed), now in its own function
        const endLiveBecauseAppLeft = () => {
            isAppClosing.current = true;

            setGameVisible(false);
            setGlassVisible(false);

            if (engine.current) {
                engine.current.leaveChannel();
            }

            setJoined(false);
            setShowSummary(true);

            try {
                const rtdb = getDatabase();
                set(ref(rtdb, `presence_lives/${currentLiveId}`), "ended").catch(()=>{});
                set(ref(rtdb, `lives/${currentLiveId}/games/reflex_arena/status`), "CANCELLED").catch(()=>{});

                updateDoc(doc(db, "lives", currentLiveId), {
                    status: "ended",
                    endTime: serverTimestamp()
                }).catch(()=>{});

                updateDoc(doc(db, "lives", currentLiveId, "games", "reflex_arena"), {
                    status: "CANCELLED",
                    refunded: true,
                    players: []
                }).catch(()=>{});

                if (auth.currentUser) {
                    updateDoc(doc(db, "users", auth.currentUser.uid), { isLive: false }).catch(()=>{});
                }
            } catch (error) {
                console.log("Force close cleanup log:", error);
            }
        };

        const handleAppStateChange = (nextAppState: string) => {
            if (nextAppState === 'active') {
                if (bgTimerRef.current) { clearTimeout(bgTimerRef.current); bgTimerRef.current = null; }
                setGameVisible(false);
                setGlassVisible(false);
                isAppClosing.current = false;
                return;
            }

            // 🔥 permission dialog (or its late events) never ends the live
            if (isAppClosing.current || inPermissionWindow()) return;

            if (nextAppState === 'background') {
                if (bgTimerRef.current) { clearTimeout(bgTimerRef.current); bgTimerRef.current = null; }
                endLiveBecauseAppLeft();
                return;
            }

            if (nextAppState === 'inactive') {
                // short blips (system dialogs, shade, etc.) only end the live if the app really stays away
                if (bgTimerRef.current) clearTimeout(bgTimerRef.current);
                bgTimerRef.current = setTimeout(() => {
                    bgTimerRef.current = null;
                    if (AppState.currentState === 'active') return;
                    if (isAppClosing.current || inPermissionWindow()) return;
                    endLiveBecauseAppLeft();
                }, 1500);
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            if (bgTimerRef.current) clearTimeout(bgTimerRef.current);
            subscription.remove();
        };
    }, [currentLiveId]);

    // 🆕 Rail flips in once + chat fades out while Beauty Studio is open (no more chat/panel touch conflict)
    useEffect(() => {
        Animated.sequence([
            Animated.delay(300),
            Animated.spring(railIn, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
        ]).start();
    }, []);

    useEffect(() => {
        Animated.timing(chatFade, { toValue: showProSettings ? 0 : 1, duration: 220, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
    }, [showProSettings]);

    useEffect(() => {
        const init = async () => {
            if (Platform.OS !== 'web') {
                await ScreenCapture.preventScreenCaptureAsync();
            }

            isRequestingPermissions.current = true;
            let hasPermission = false;
            try {
                hasPermission = await checkAndRequestCallPermissions();
            } catch (e) { hasPermission = false; }
            if (!hasPermission) hasPermission = await verifyCamMicGranted(); // double-check real OS state
            await new Promise(r => setTimeout(r, 800));                      // let the dialog close animation settle
            permGraceUntil.current = Date.now() + 2500;
            isRequestingPermissions.current = false;
            
            if (!hasPermission) {
                Alert.alert("Permission Required", "Camera and Microphone access is needed to start Live.");
                router.back();
                return;
            }

            const hostData = await fetchHostData();
            setupAgora(hostData);
        };
        init();
        const unsubListeners = listenToStreamData();
        const timer = setInterval(() => setSeconds(s => s + 1), 1000);

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();

        const cleanupGhostRooms = async () => {
            if (!auth.currentUser) return;
            try {
                const q = query(collection(db, "lives"), where("hostId", "==", auth.currentUser.uid), where("status", "==", "live"));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(async (roomDoc) => {
                    if (roomDoc.id !== currentLiveId) {
                        await updateDoc(doc(db, "lives", roomDoc.id), { status: "ended" });
                    }
                });
            } catch (error) { console.log(error); }
        };
        cleanupGhostRooms();

        const rtdb = getDatabase();
        const connectedRef = ref(rtdb, ".info/connected");
        const livePresenceRef = ref(rtdb, `presence_lives/${currentLiveId}`);
        const gamePresenceRef = ref(rtdb, `lives/${currentLiveId}/games/reflex_arena/status`);

        const unsubPresence = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                onDisconnect(livePresenceRef).set("ended").then(() => {
                    set(livePresenceRef, "active");
                });
                onDisconnect(gamePresenceRef).set("CANCELLED");
            }
        });

        const callQuery = query(
            collection(db, "calls"),
            where("expertId", "==", auth.currentUser?.uid || ""),
            where("status", "in", ["ringing", "pending", "Discover_dialing"])
        );

        const unsubCalls = onSnapshot(callQuery, async (snap) => {
            if (!snap.empty) {
                let validDocSnap = null;
                
                for (const docSnap of snap.docs) {
                    const data = docSnap.data() as any;
                    const now = Date.now();
                    const callTime = data.createdAt?.toMillis ? data.createdAt.toMillis() : now;
                    
                    if (now - callTime <= 30000) { 
                        validDocSnap = docSnap;
                        break; 
                    } else {
                        updateDoc(doc(db, "calls", docSnap.id), { status: 'missed' }).catch(()=>{});
                    }
                }

                if (!validDocSnap) {
                    setIncomingCall(null);
                    return;
                }

                const data = validDocSnap.data() as any;
                const currentUserId = data.userId || data.callerId;

                const userRef = doc(db, "users", auth.currentUser?.uid || "");
                const expertSnap = await getDoc(userRef);
                const myBlockedList = expertSnap.data()?.blockedUsers || [];

                if (myBlockedList.includes(currentUserId)) {
                    await updateDoc(doc(db, "calls", validDocSnap.id), { status: 'rejected' });
                    return;
                }

                let callerPic = null;
                let fetchedName = data.userName || data.callerName || "USER";

                if(currentUserId) {
                    const callerDoc = await getDoc(doc(db, "users", currentUserId));
                    if(callerDoc.exists()){
                        const cData = callerDoc.data();
                        callerPic = cData.profilePic || cData.photoURL || null;
                        fetchedName = cData.name || cData.userName || cData.displayName || fetchedName;
                    }
                }
                setIncomingCall({ id: validDocSnap.id, ...data, callerId: currentUserId, callerImage: callerPic, userName: fetchedName });
            } else {
                setIncomingCall(null);
            }
        });

        let unsubWallet = () => {};
        if (auth.currentUser) {
            unsubWallet = onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
                if (docSnap.exists()) {
                    setMyWalletBalance(docSnap.data().walletBalance || 0);
                }
            });
        }

        return () => {
            if (Platform.OS !== 'web') {
                ScreenCapture.allowScreenCaptureAsync();
            }

            clearInterval(timer);
            unsubListeners();
            unsubCalls();
            unsubWallet();
            
            unsubPresence();
            set(livePresenceRef, "ended"); 
            set(gamePresenceRef, "CANCELLED"); 

            removePlayerFromReflex();

            if (currentLiveId) {
                updateDoc(doc(db, 'lives', currentLiveId), {
                    status: 'ended',
                    endedAt: serverTimestamp()
                }).catch(e => console.log("Live close error", e));
            }

            if (!isNavigatingToCall.current) {
                leaveChannel();
            }
        };
    }, []);

    const fetchHostData = async () => {
        if (!auth.currentUser) return { name: "Host", image: "", levelTitle: "BEGINNER", userPrice: 0 };
        const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userSnap.exists()) {
            const userData = userSnap.data();
            let name = userData.name || auth.currentUser.displayName || "Host";
            
            if (name === "ARUVI MULTIVERSE") {
                name = "Aruvi";
            }
            
            const img = userData.profilePic || userData.photoURL || "";
            const beans = userData.totalBeansEarned || 0;
            const config = getLevelConfig(beans);
            const price = userData.userPrice || 0;
            
            setHostName(name);
            setHostImage(img);
            setHostLevel(config.label);
            setHostConfig(config);
            return { name, image: img, levelTitle: config.label, userPrice: price };
        }
        return { name: "Host", image: "", levelTitle: "BEGINNER", userPrice: 0 };
    };

    const setupAgora = async (hostData: { name: string, image: string, levelTitle: string, userPrice: number }) => {
        try {
            if (engine.current) return;

            engine.current = createAgoraRtcEngine();
            const rtcEngine = engine.current;
            rtcEngine.initialize({ appId: AGORA_APP_ID });
            rtcEngine.enableVideo();
            rtcEngine.startPreview();

            rtcEngine.registerEventHandler({
                onJoinChannelSuccess: () => {
                    setJoined(true);
                    updateLiveStatus('live', hostData.name, hostData.image, hostData.levelTitle, hostData.userPrice);
                },
                onUserJoined: (connection, uid) => {
                    setGuestUid(uid);
                },
                onUserOffline: () => {
                    setGuestUid(null);
                }
            });

            rtcEngine.joinChannel('', currentLiveId, 0, {
                clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
            });
        } catch (e) { console.error(e); }
    };

    const handleCallAction = async (action: 'accepted' | 'rejected') => {
        if (!incomingCall || !auth.currentUser) return;
        
        try {
            if (action === 'accepted') {
                isNavigatingToCall.current = true; 
                
                await updateDoc(doc(db, "lives", currentLiveId), {
                    status: 'ended',
                    endTime: serverTimestamp()
                });

                await updateDoc(doc(db, "users", auth.currentUser.uid), { isLive: false, isBusy: true });

                const callRef = doc(db, "calls", incomingCall.id);
                await updateDoc(callRef, {
                    status: 'accepted',
                    expertName: hostName || "Host", 
                    expertImage: hostImage || "",     
                    callerName: incomingCall.userName || "User",
                    expertId: auth.currentUser.uid,
                    acceptedAt: serverTimestamp()
                });
                
                const batch = writeBatch(db);
                const viewersSnap = await getDocs(collection(db, "lives", currentLiveId, "activeViewers"));
                viewersSnap.forEach((vDoc) => batch.delete(vDoc.ref));
                await batch.commit();

                if (engine.current) {
                    engine.current.stopPreview();
                    engine.current.leaveChannel();
                    engine.current.release();
                    engine.current = null;
                }

                router.replace({
                    pathname: "/videocall",
                    params: {
                        callId: incomingCall.id,
                        expertId: auth.currentUser.uid,
                        expertName: hostName || "Host", 
                        expertImage: hostImage || "",     
                        callerName: incomingCall.userName || "User",
                        callerId: incomingCall.callerId,
                        role: 'expert'
                    }
                });
            } else {
                await updateDoc(doc(db, "calls", incomingCall.id), { status: 'rejected' });
                setIncomingCall(null);
            }
        } catch (error) {
            console.error("Call Action Error:", error);
        }
    };

    const listenToStreamData = () => {
        const q = query(collection(db, "lives", currentLiveId, "messages"), orderBy("timestamp", "desc"));
        const unsubChat = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubDoc = onSnapshot(doc(db, "lives", currentLiveId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setRoomData(data); 
                setViewerCount(data.viewerCount || 0);
                setPinnedMessage(data.pinnedMessage || null);
                setSessionEarnedBeans(data.earnedBeans || 0);
            }
        });

        const unsubHost = onSnapshot(doc(db, "users", auth.currentUser?.uid || ""), (snap) => {
            if(snap.exists()) {
                const data = snap.data();
                const beans = data.totalBeansEarned || 0;
                const config = getLevelConfig(beans);
                setHostConfig(config);
                setHostLevel(config.label);
            }
        });

        const unsubGifts = onSnapshot(query(collection(db, "lives", currentLiveId, "gifts"), orderBy("timestamp", "desc")), async (snap) => {
            snap.docChanges().forEach(async (change) => {
                if (change.type === "added") {
                    const gift = change.doc.data();
                    setActiveGift(gift);
                    
                    const diamondAmount = gift.amount || 0;
                    setEarnings(prev => prev + diamondAmount);

                    if (auth.currentUser) {
                        const beanAmount = Math.floor(diamondAmount / 2);
                        const userRef = doc(db, "users", auth.currentUser.uid);
                        
                        const expertSnap = await getDoc(userRef);
                        if (expertSnap.exists()) {
                            const eData = expertSnap.data();
                            const today = new Date().toISOString().split('T')[0];
                            const isNewDay = eData.lastBonusDate !== today;
                            
                            let currentTopVip = eData.topVipSupporter || { name: 'None', amount: 0, date: '' };
                            const senderName = gift.senderName || 'Premium User';
                            if (isNewDay || diamondAmount > currentTopVip.amount) {
                                   currentTopVip = { name: senderName, amount: diamondAmount, date: today };
                            }

                            const updatedTodayBeans = isNewDay ? beanAmount : (Number(eData.todayBeans) || 0) + beanAmount;
                            let achievedMilestone = "0 / 100K";
                            if (updatedTodayBeans >= 500000) achievedMilestone = "ELITE (500K)";
                            else if (updatedTodayBeans >= 300000) achievedMilestone = "PRO (300K)";
                            else if (updatedTodayBeans >= 100000) achievedMilestone = "STARTER (100K)";

                            await updateDoc(userRef, {
                                totalBeansEarned: increment(beanAmount),
                                walletBalance: increment(beanAmount),
                                beans: increment(beanAmount),
                                todayBeans: isNewDay ? beanAmount : increment(beanAmount),
                                topVipSupporter: currentTopVip,
                                currentDailyMilestone: achievedMilestone,
                                lastBonusDate: today,
                                totalDiamondsReceived: increment(diamondAmount)
                            });

                            await updateDoc(doc(db, "lives", currentLiveId), {
                                earnedBeans: increment(beanAmount)
                            }).catch(e => console.log(e));
                        }
                    }
                }
            });
        });

        const viewersQuery = query(collection(db, "lives", currentLiveId, "activeViewers"), orderBy("joinedAt", "desc"));
        const unsubViewers = onSnapshot(viewersQuery, (snapshot) => {
            const viewers = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    photoURL: data.photoURL || data.profilePic || null
                };
            });
            setActiveViewers(viewers);
        });

        return () => { unsubChat(); unsubDoc(); unsubGifts(); unsubViewers(); unsubHost(); };
    };

    const updateLiveStatus = async (status: string, manualName?: string, manualImage?: string, level?: string, price?: number) => {
        if (!auth.currentUser) return;

        const updateData: any = {
            status: status,
            currentLiveId: currentLiveId,
        };

        if (status === 'live') {
            let finalName = manualName || hostName || "Host";
            
            if (finalName === "ARUVI MULTIVERSE") {
                finalName = "Aruvi";
            }
            
            updateData.hostId = auth.currentUser.uid;
            updateData.hostName = finalName;
            updateData.hostImage = manualImage || hostImage || "";
            updateData.startedAt = serverTimestamp();
            updateData.viewerCount = 0;
            updateData.currentLevel = level || "BEGINNER";
            updateData.pricePerMin = price || 0;
            updateData.earnedBeans = 0; 
            
            await updateDoc(doc(db, "users", auth.currentUser.uid), { isLive: true, isBusy: false }); 
        }

        try {
            await setDoc(doc(db, "lives", currentLiveId), updateData, { merge: true });
        } catch (error) {
            console.error("Status Update Error:", error);
        }
    };

    const toggleMute = () => {
        engine.current?.muteLocalAudioStream(!isMuted);
        setIsMuted(!isMuted);
    };

    const switchCamera = () => {
        engine.current?.switchCamera();
        setIsFrontCamera(!isFrontCamera);
    };

    // 🆕 BEAUTY STUDIO ENGINE: one place that pushes all 4 levels to Agora
    const applyBeauty = (lv: { light: number, smooth: number, red: number, sharp: number }, preset: string | null = null) => {
        setProLevel(lv);
        setActivePreset(preset);
        engine.current?.setBeautyEffectOptions(true, {
            lighteningContrastLevel: LighteningContrastLevel.LighteningContrastNormal,
            lighteningLevel: lv.light,
            smoothnessLevel: lv.smooth,
            rednessLevel: lv.red,
            sharpnessLevel: lv.sharp
        });
        setIsProEnabled(true);
    };

    // old API kept (light / smooth) + new (red / sharp)
    const updatePro = (type: 'light' | 'smooth' | 'red' | 'sharp', val: number) => {
        applyBeauty({ ...ProLevel, [type]: val }, null);
    };

    const toggleBeautyPower = () => {
        if (isProEnabled) {
            engine.current?.setBeautyEffectOptions(false, {});
            setIsProEnabled(false);
        } else {
            applyBeauty(ProLevel, activePreset);
        }
    };

    const resetBeauty = () => {
        applyBeauty({ ...DEFAULT_BEAUTY }, null);
    };

    // 🆕 open one, close the other (dock <-> beauty never overlap)
    const toggleBeautyPanel = () => {
        const next = !showProSettings;
        setShowProSettings(next);
        if (next) setDockOpen(false);
    };

    const toggleDock = () => {
        const next = !dockOpen;
        setDockOpen(next);
        if (next) setShowProSettings(false);
    };

    const sendMessage = async () => {
        if (!inputText.trim() || !auth.currentUser) return;
        await addDoc(collection(db, "lives", currentLiveId, "messages"), {
            text: inputText,
            senderName: hostName || "Host",
            senderId: auth.currentUser.uid,
            timestamp: serverTimestamp(),
            isHost: true
        });
        setInputText('');
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    const leaveChannel = async () => {
        const isGamePlaying = await checkGameActive();
        
        if (isGamePlaying) {
            await safeCancelGameForAudienceRefund();
        } else {
            await removePlayerFromReflex();
        }
        
        await updateLiveStatus('ended');
        if (auth.currentUser) {
            await updateDoc(doc(db, "users", auth.currentUser.uid), { isLive: false });
        }
        
        try {
            const batch = writeBatch(db);
            const viewersSnap = await getDocs(collection(db, "lives", currentLiveId, "activeViewers"));
            viewersSnap.forEach((vDoc) => batch.delete(vDoc.ref));
            await batch.commit();
        } catch (e) { console.log("Cleanup error:", e); }

        setShowSummary(true);
    };

    const confirmExit = async () => {
        await removePlayerFromReflex(); 
        await updateDoc(doc(db, "lives", currentLiveId), { viewerCount: 0 });
        if (engine.current) {
            engine.current.leaveChannel();
            engine.current.release();
            engine.current = null;
        }
        router.back();
    };

    // 🔥 NEW: UNIVERSAL USER CLICK TRIGGER (List & Chat) 🔥
    const handleUserClick = (userItem: any, isFromChat = false) => {
        const normalizedUser = {
            id: isFromChat ? userItem.senderId : userItem.id,
            name: isFromChat ? userItem.senderName : userItem.name,
            image: isFromChat ? null : (userItem.photoURL || userItem.profilePic)
        };
        if (normalizedUser.id === auth.currentUser?.uid) return; // Ignore self
        setSelectedUser(normalizedUser);
        setActionSheetVisible(true);
    };

    // 🔥 SATTI FIX: KICK USER FROM LIVE WITH INSTANT DISCONNECT SIGNAL 🔥
    const handleKickUser = async (showAlert = true) => {
        if (!selectedUser) return;
        try {
            // 1. Array Update for blocked users
            await updateDoc(doc(db, "lives", currentLiveId), {
                bannedViewers: arrayUnion(selectedUser.id)
            });
            // 2. Remove from local list
            await deleteDoc(doc(db, "lives", currentLiveId, "activeViewers", selectedUser.id));

            // 🔥 3. THE MAGIC FIX: Send a direct RTDB Kick Signal that the Viewer's App will catch and force close!
            const rtdb = getDatabase();
            await set(ref(rtdb, `lives/${currentLiveId}/kicked_users/${selectedUser.id}`), true);

            // 4. Chat Notification
            await addDoc(collection(db, "lives", currentLiveId, "messages"), {
                text: `${selectedUser.name} was kicked from the stream.`,
                senderName: "System",
                isSystem: true,
                timestamp: serverTimestamp()
            });
            if (showAlert) Alert.alert("Kicked", `${selectedUser.name} has been removed from live.`);
        } catch(e) { console.log(e); }
        setActionSheetVisible(false);
    };

    // 🔥 NEW: BLOCK USER (Blocks permanently + Kicks from live) 🔥
    const handleBlockUser = async (showAlert = true) => {
        if (!selectedUser || !auth.currentUser) return;
        try {
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                blockedUsers: arrayUnion(selectedUser.id)
            });
            await handleKickUser(false); // Boot them out too without second alert
            if (showAlert) Alert.alert("Blocked", `${selectedUser.name} has been permanently blocked.`);
        } catch (e) { console.log(e); }
        setActionSheetVisible(false);
    };

    // 🔥 SATTI FIX: REPORT TRIGGER MODAL 🔥
    const handleReportUser = () => {
        setActionSheetVisible(false); // Close mini-profile
        setReportSheetVisible(true); // Open specific reasons
    };

    // 🔥 SATTI FIX: SUBMIT ACTUAL REPORT TO ADMIN & TRIGGER BLOCK/KICK 🔥
    const submitReport = async (reason: string) => {
        if (!selectedUser) return;
        try {
            // 1. Submit Report
            await addDoc(collection(db, "reports"), {
                reportedUserId: selectedUser.id,
                reportedUserName: selectedUser.name,
                reportedBy: auth.currentUser?.uid,
                reason: reason,
                timestamp: serverTimestamp(),
                liveId: currentLiveId
            });
            
            // 2. Trigger Block & Kick Silently behind the scenes
            await handleBlockUser(false);
            
            Alert.alert("Reported & Blocked", `User reported to Admin for: ${reason} and has been removed.`);
        } catch (e) { console.log(e); }
        setReportSheetVisible(false);
    };

    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });

    // ✨ Premium theme colours (from the host's level config)
    const c0: string = hostConfig.colors[0];
    const c2: string = hostConfig.colors[2];

    // ✨ Gentle 3D sway for the host board (re-uses the shimmer loop)
    const boardTiltX = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: ['2deg', '-2deg'] });
    const boardTiltY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] });

    const topPad = insets.top + 8;
    const bottomPad = Math.max(insets.bottom, 10) + 8;

    // 🆕 The 4 dock buttons (Reflex, Memory, Mute, Flip) - icons are solid white vector icons (clear, no shadow)
    const dockItems = [
        { key: 'reflex', color: '#06B6D4', icon: <MaterialCommunityIcons name="lightning-bolt" size={25} color="#FFFFFF" />, onPress: () => { setPendingGameType('reflex'); setDisclaimerVisible(true); } },
        { key: 'memory', color: '#A855F7', icon: <MaterialCommunityIcons name="cards" size={24} color="#FFFFFF" />, onPress: () => { setPendingGameType('memory'); setDisclaimerVisible(true); } },
        { key: 'mute', color: isMuted ? '#EF4444' : '#0EA5E9', active: isMuted, icon: <Ionicons name={isMuted ? "mic-off" : "mic"} size={23} color="#FFFFFF" />, onPress: toggleMute },
        { key: 'flip', color: '#6366F1', icon: <Ionicons name="camera-reverse" size={24} color="#FFFFFF" />, onPress: switchCamera },
    ];

    // ✨ ALWAYS-FLOATING CHAT ROW (host can clearly see who joins / who messages). Older rows fade out gradually.
    const renderChatItem = ({ item, index }: { item: any, index: number }) => {
        const fade = Math.max(0.3, 1 - index * 0.12);

        if (item.isGift) {
            return (
                <View style={{ opacity: fade, alignSelf: 'flex-start' }}>
                    <ChatPop style={styles.chatPopWrap}>
                        <LinearGradient
                            colors={['rgba(245, 158, 11, 0.35)', 'rgba(236, 72, 153, 0.35)']}
                            start={{x:0, y:0}} end={{x:1, y:1}}
                            style={styles.giftChatBubble}
                        >
                            <Text style={styles.giftChatText}>{item.text}</Text>
                        </LinearGradient>
                    </ChatPop>
                </View>
            );
        }

        if (item.isSystem) {
            const t = String(item.text || '');
            const isJoin = /joined/i.test(t);
            const isLeft = /left|kicked/i.test(t);
            const accent = isJoin ? '#22D3EE' : isLeft ? '#94A3B8' : '#F472B6';
            return (
                <View style={{ opacity: fade, alignSelf: 'flex-start' }}>
                    <ChatPop style={styles.chatPopWrap}>
                        <View style={[styles.sysPill, { borderColor: withAlpha(accent, 0.75) }]}>
                            <View style={[styles.sysDot, { backgroundColor: accent }]}>
                                <Ionicons name={isJoin ? 'person-add' : isLeft ? 'exit-outline' : 'information-circle'} size={11} color="#020617" />
                            </View>
                            <Text style={styles.sysText}>{t}</Text>
                        </View>
                    </ChatPop>
                </View>
            );
        }

        const msgBorder = index % 2 === 0 ? borderType1 : borderType2;
        return (
            <View style={{ opacity: fade, alignSelf: 'flex-start' }}>
                <ChatPop style={styles.chatPopWrap}>
                    {/* 🔥 Chat Message is Clickable to open the Kick/Block/Report menu 🔥 */}
                    <TouchableOpacity activeOpacity={0.8} style={[styles.chatBubble, styles.chatBubbleRow, msgBorder]} onPress={() => handleUserClick(item, true)}>
                        <LinearGradient colors={[c0, c2]} style={styles.chatInitial}>
                            <Text style={styles.chatInitialText}>{(item.senderName || "U").charAt(0).toUpperCase()}</Text>
                        </LinearGradient>
                        <View style={{ flexShrink: 1 }}>
                            <Text style={styles.chatName} numberOfLines={1}>{item.senderName}</Text>
                            <Text style={styles.chatMessage}>{item.text}</Text>
                        </View>
                    </TouchableOpacity>
                </ChatPop>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={hostConfig.colors[0] === '#ad57a6' ? ['#020617', '#0F172A'] : [`${hostConfig.colors[0]}15`, '#020617']} style={StyleSheet.absoluteFill} />
            <Animated.View style={[styles.shimmerOrb, { top: 100, right: -60, backgroundColor: hostConfig.colors[0], transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { bottom: 150, left: -60, backgroundColor: hostConfig.colors[2], transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            <View style={styles.videoContainer}>
                {joined && (
                    <View style={styles.videoGrid}>
                        <RtcTextureView canvas={{ uid: 0 }} style={guestUid ? styles.halfVideo : styles.fullVideo} />
                        {guestUid && <RtcTextureView canvas={{ uid: guestUid }} style={styles.halfVideo} />}
                    </View>
                )}
                {!joined && (
                    <View style={styles.connectWrap}>
                        {hostImage ? <Image source={{ uri: hostImage }} style={StyleSheet.absoluteFill} blurRadius={35} /> : null}
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(2,6,23,0.72)' }]} />
                        <View style={styles.pulseWrap}>
                            <PulseRings color={c0} size={110} />
                            <SpinRing size={96} colors={[c0, c2, '#FFFFFF', c0]} speed={3500}>
                                {hostImage ? (
                                    <Image source={{ uri: hostImage }} style={{ width: 90, height: 90, borderRadius: 45 }} />
                                ) : (
                                    <Text style={styles.initialsText}>{hostName ? hostName.charAt(0).toUpperCase() : "E"}</Text>
                                )}
                            </SpinRing>
                        </View>
                        <Text style={styles.loadingText}>Connecting...</Text>
                    </View>
                )}
            </View>

            {/* 🔮 HOST BOARD (top of the phone): 3D swaying glass card with avatar, level, timer, viewers, rewards */}
            <Animated.View pointerEvents="none" style={[styles.boardWrap, { top: topPad, transform: [{ perspective: 900 }, { rotateX: boardTiltX }, { rotateY: boardTiltY }] }]}>
                <LinearGradient colors={[c0, c2, c0]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.boardBorder}>
                    <BlurView intensity={70} tint="dark" style={styles.boardInner}>
                        <View style={styles.avatarWrapper}>
                            <SpinRing size={54} colors={[c0, c2, '#FFFFFF', c0]} speed={5000}>
                                {hostImage ? (
                                    <Image source={{ uri: hostImage }} style={styles.hostAvatarMass} />
                                ) : (
                                    <View style={styles.initialsCircleMass}>
                                        <Text style={styles.initialsText}>{hostName ? hostName.charAt(0).toUpperCase() : "E"}</Text>
                                    </View>
                                )}
                            </SpinRing>
                            <View style={[styles.crownBadgeMass, { backgroundColor: c0 }]}>
                                <MaterialCommunityIcons name="crown" size={10} color="#FFF" />
                            </View>
                        </View>
                        <View style={styles.boardTextCol}>
                            <Text style={styles.hostNameHeaderMass} numberOfLines={1}>{hostName || "Host"}</Text>
                            <View style={[styles.levelPill, { backgroundColor: withAlpha(c0, 0.22), borderColor: c0 }]}>
                                <Text style={styles.levelPillText} numberOfLines={1}>{hostConfig.label}</Text>
                            </View>
                            <View style={styles.statsRow}>
                                <LinearGradient colors={['#EF4444', '#F97316']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.liveBadgeMass}>
                                    <PulseDot color="#FFF" size={5} />
                                    <Text style={styles.liveText}>{formatTime(seconds)}</Text>
                                </LinearGradient>
                                <View style={styles.viewerBadgeMass}>
                                    <Ionicons name="eye" size={11} color="#00F2FE" />
                                    <Text style={styles.viewerCountTextMass}>{viewerCount}</Text>
                                </View>
                                <View style={styles.beanBadge}>
                                    <Text style={styles.beanText}>🎖️ {sessionEarnedBeans}</Text>
                                </View>
                            </View>
                        </View>
                    </BlurView>
                </LinearGradient>
            </Animated.View>

            {/* END LIVE BUTTON (same action as the old X) */}
            <View style={[styles.endBtnWrap, { top: topPad + 17 }]}>
                <GlowOrbButton color="#EF4444" size={48} onPress={leaveChannel}>
                    <Ionicons name="power" size={22} color="#FFF" />
                </GlowOrbButton>
            </View>

            {/* 👥 AUDIENCE STRIP: avatars of everyone watching (tap = Kick / Block / Report menu) */}
            <View style={[styles.viewersWrap, { top: topPad + 94 }]}>
                <BlurView intensity={55} tint="dark" style={styles.viewersInner}>
                    <View style={styles.viewersIcon}>
                        <Ionicons name="people" size={14} color="#FFF" />
                    </View>
                    <FlatList
                        horizontal
                        data={activeViewers}
                        keyExtractor={(item) => item.id}
                        showsHorizontalScrollIndicator={false}
                        style={{ flex: 1 }}
                        contentContainerStyle={{ alignItems: 'center', paddingRight: 8 }}
                        ListEmptyComponent={<Text style={styles.waitingText}>Waiting for viewers...</Text>}
                        renderItem={({ item }) => (
                            // 🔥 Viewer List Item is Clickable to show Profile Menu 🔥
                            <TouchableOpacity style={styles.viewerItem} activeOpacity={0.8} onPress={() => handleUserClick(item, false)}>
                                {item.photoURL ? (
                                    <Image source={{ uri: item.photoURL }} style={[styles.viewerAvatar, { borderColor: c0 }]} />
                                ) : (
                                    <View style={[styles.viewerAvatar, { borderColor: c0, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' }]}>
                                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>{item.name?.charAt(0).toUpperCase()}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        )}
                    />
                </BlurView>
            </View>

            <GiftOverlay
                giftData={activeGift}
                onComplete={() => setActiveGift(null)}
            />

            {pinnedMessage && (
                <View style={[styles.pinnedBox, { top: topPad + 156 }]}>
                    <Ionicons name="pin" size={16} color="#00F2FE" />
                    <Text style={styles.pinnedText} numberOfLines={1}>{pinnedMessage.text}</Text>
                </View>
            )}

            {/* 📞 INCOMING CALL (premium 3D card) */}
            {incomingCall && (
                <View style={styles.callOverlayMass}>
                    <Animated.View style={[styles.callCardWrapper, { transform: [{ scale: pulseAnim }] }]}>
                        <LinearGradient colors={['#00F2FE', c0, '#00F2FE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.callCardBorder}>
                            <BlurView intensity={90} tint="dark" style={styles.callCardMass}>
                                <LinearGradient
                                    colors={['rgba(2, 6, 23, 0.98)', 'rgba(15, 23, 42, 0.95)', 'rgba(0, 242, 254, 0.15)']}
                                    style={StyleSheet.absoluteFill}
                                />

                                <View style={styles.callerAvatarRing}>
                                    <PulseRings color="#00F2FE" size={92} />
                                    <SpinRing size={96} colors={['#00F2FE', c0, '#FFFFFF', '#00F2FE']} speed={3500}>
                                        {incomingCall.callerImage ? (
                                            <Image source={{ uri: incomingCall.callerImage }} style={styles.callerCallAvatar} />
                                        ) : (
                                            <View style={styles.callerCallInitials}>
                                                <Text style={styles.callerCallInitialsText}>
                                                    {incomingCall.userName ? incomingCall.userName.charAt(0).toUpperCase() : "U"}
                                                </Text>
                                            </View>
                                        )}
                                    </SpinRing>
                                </View>

                                <Text style={styles.callPulseText}>INCOMING CALL</Text>
                                <Text style={styles.callInfoTextMass} numberOfLines={1}>{incomingCall.userName?.toUpperCase() || "USER"}</Text>

                                <View style={styles.callActionsMass}>
                                    <View style={styles.actionBtnHitbox}>
                                        <GlowOrbButton color="#F43F5E" size={68} onPress={() => handleCallAction('rejected')}>
                                            <Ionicons name="close" size={30} color="#FFF" />
                                        </GlowOrbButton>
                                        <Text style={styles.callBtnLabel}>DECLINE</Text>
                                    </View>

                                    <View style={styles.actionBtnHitbox}>
                                        <GlowOrbButton color="#10B981" size={68} onPress={() => handleCallAction('accepted')}>
                                            <Ionicons name="videocam" size={30} color="#FFF" />
                                        </GlowOrbButton>
                                        <Text style={styles.callBtnLabel}>ACCEPT</Text>
                                    </View>
                                </View>
                            </BlurView>
                        </LinearGradient>
                    </Animated.View>
                </View>
            )}

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} pointerEvents="box-none">
                <View style={{ flex: 1 }} pointerEvents="none" />

                <View style={[styles.interactionArea, { paddingBottom: bottomPad }]} pointerEvents="box-none">
                    {/* 💬 ALWAYS-FLOATING LIVE CHAT: newest at the bottom, older messages fade up.
                        🆕 Fades out + stops taking touches while the Beauty Studio is open (no conflict) */}
                    <Animated.View style={{ flex: 1, justifyContent: 'flex-end', opacity: chatFade }} pointerEvents={showProSettings ? 'none' : 'box-none'}>
                        <FlatList
                            data={messages}
                            keyExtractor={(item) => item.id}
                            inverted={true}
                            renderItem={renderChatItem}
                            style={styles.chatList}
                            contentContainerStyle={{ paddingTop: 20 }}
                            showsVerticalScrollIndicator={false}
                        />

                        <View style={styles.bottomBar}>
                            <LinearGradient colors={[withAlpha(c0, 0.9), withAlpha(c2, 0.9)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.inputBorder}>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Connect..."
                                    placeholderTextColor="#94A3B8"
                                    value={inputText}
                                    onChangeText={setInputText}
                                />
                            </LinearGradient>

                            <GlowOrbButton color="#00BCD4" size={46} onPress={sendMessage}>
                                <Ionicons name="send" size={18} color="#FFF" />
                            </GlowOrbButton>
                        </View>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>

            {/* 🎛️ RIGHT SIDE: Ultra Beauty button + ONE magic slider handle (the 4 buttons live inside it).
                🆕 Rendered AFTER the chat layer so it always sits on top and never loses touches */}
            <Animated.View
                pointerEvents="box-none"
                style={[
                    styles.rail,
                    {
                        top: topPad + 160,
                        opacity: railIn,
                        transform: [
                            { perspective: 700 },
                            { translateX: railIn.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) },
                            { rotateY: railIn.interpolate({ inputRange: [0, 1], outputRange: ['-70deg', '0deg'] }) },
                            { scale: railIn },
                        ],
                    },
                ]}
            >
                <BeautyUltraButton active={showProSettings} onPress={toggleBeautyPanel} />
                <View style={{ height: 16 }} />
                <MagicDock items={dockItems} open={dockOpen} onToggle={toggleDock} c0={c0} c2={c2} />
            </Animated.View>

            {/* ✨ BEAUTY STUDIO (pro filter panel) - root level, above chat, own touch layer */}
            <MagicPanel visible={showProSettings} style={[styles.proPanelWrap, { bottom: bottomPad }]}>
                <LinearGradient colors={['#EC4899', '#A855F7', '#22D3EE', '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.panelBorder}>
                    <BlurView intensity={80} tint="dark" style={styles.panelInner}>
                        {/* header */}
                        <View style={styles.panelHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                <LinearGradient colors={['#F472B6', '#7C3AED']} style={styles.studioIcon}>
                                    <MaterialCommunityIcons name="face-man-shimmer" size={20} color="#FFFFFF" />
                                </LinearGradient>
                                <View style={{ flexShrink: 1 }}>
                                    <Text style={styles.panelTitle} numberOfLines={1}>Beauty Studio</Text>
                                    <Text style={styles.panelSub} numberOfLines={1}>Smooth • Glow • Rosy • Sharp</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={toggleBeautyPower} activeOpacity={0.85} style={[styles.powerPill, { backgroundColor: isProEnabled ? '#10B981' : '#475569' }]}>
                                <Text style={styles.powerText}>{isProEnabled ? 'ON' : 'OFF'}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={resetBeauty} activeOpacity={0.85} style={[styles.panelCloseBtn, { marginLeft: 8 }]}>
                                <Ionicons name="refresh" size={17} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => setShowProSettings(false)} activeOpacity={0.85} style={[styles.panelCloseBtn, { marginLeft: 8 }]}>
                                <Ionicons name="chevron-down" size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                        {/* presets */}
                        <View style={styles.presetRow}>
                            {BEAUTY_PRESETS.map((p) => {
                                const on = activePreset === p.key;
                                return (
                                    <TouchableOpacity key={p.key} activeOpacity={0.85} onPress={() => applyBeauty({ ...p.lv }, p.key)} style={[styles.presetCard, on && { borderColor: p.color, backgroundColor: withAlpha(p.color, 0.22) }]}>
                                        <View style={[styles.presetIcon, { backgroundColor: p.color }]}>
                                            <MaterialCommunityIcons name={p.icon as any} size={18} color="#FFFFFF" />
                                        </View>
                                        <Text style={styles.presetText}>{p.key}</Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* sliders */}
                        <View style={styles.sliderBox}>
                            {BEAUTY_SLIDERS.map((s) => (
                                <BeautySlider
                                    key={s.key}
                                    label={s.label}
                                    icon={s.icon}
                                    color={s.color}
                                    value={ProLevel[s.key]}
                                    onChange={(v) => updatePro(s.key, v)}
                                />
                            ))}
                        </View>

                        {/* quick chips (old High / Low / Max / Natural kept) */}
                        <View style={styles.quickRow}>
                            <TouchableOpacity onPress={() => updatePro('light', 0.9)} style={[styles.chip, ProLevel.light === 0.9 && styles.activeChip]}>
                                <Text style={styles.chipText}>Bright High</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => updatePro('light', 0.4)} style={[styles.chip, ProLevel.light === 0.4 && styles.activeChip]}>
                                <Text style={styles.chipText}>Bright Low</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => updatePro('smooth', 0.9)} style={[styles.chip, ProLevel.smooth === 0.9 && styles.activeChip]}>
                                <Text style={styles.chipText}>Smooth Max</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => updatePro('smooth', 0.3)} style={[styles.chip, ProLevel.smooth === 0.3 && styles.activeChip]}>
                                <Text style={styles.chipText}>Natural</Text>
                            </TouchableOpacity>
                        </View>
                    </BlurView>
                </LinearGradient>
            </MagicPanel>

            <LiveGameSheet
                visible={gameVisible}
                onClose={() => setGameVisible(false)}
                liveId={currentLiveId}
                isHost={true}
                userWalletBalance={myWalletBalance}
            />

            <MemoryMatch
                visible={glassVisible}
                onClose={() => setGlassVisible(false)}
                liveId={currentLiveId}
                isHost={true}
                entryFee={0}
            />

            {/* 📊 SESSION SUMMARY */}
            <Modal visible={showSummary} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                    <LinearGradient colors={[c0, c2, c0]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.summaryBorder}>
                        <View style={styles.summaryCard}>
                            <View style={{ marginBottom: 14 }}>
                                <SpinRing size={72} colors={[c0, c2, '#FFFFFF', c0]} speed={5000}>
                                    {hostImage ? (
                                        <Image source={{ uri: hostImage }} style={{ width: 66, height: 66, borderRadius: 33 }} />
                                    ) : (
                                        <Text style={styles.initialsText}>{hostName ? hostName.charAt(0).toUpperCase() : "E"}</Text>
                                    )}
                                </SpinRing>
                            </View>
                            <Text style={styles.summaryTitle}>SESSION SUMMARY</Text>
                            <View style={styles.statGrid}>
                                <View style={styles.statItem}>
                                    <Ionicons name="time" size={16} color="#00F2FE" />
                                    <Text style={styles.statVal}>{formatTime(seconds)}</Text>
                                    <Text style={styles.statLabel}>Duration</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Ionicons name="eye" size={16} color="#00F2FE" />
                                    <Text style={styles.statVal}>{viewerCount}</Text>
                                    <Text style={styles.statLabel}>Viewers</Text>
                                </View>
                                <View style={styles.statItem}>
                                    <Ionicons name="gift" size={16} color="#F59E0B" />
                                    <Text style={styles.statVal}>{sessionEarnedBeans} 🎖️</Text>
                                    <Text style={styles.statLabel}>Rewards Accrued</Text>
                                </View>
                            </View>
                            <TouchableOpacity activeOpacity={0.85} onPress={confirmExit} style={{ width: '100%' }}>
                                <LinearGradient colors={['#00F2FE', '#0EA5E9']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.exitBtn}>
                                    <Text style={styles.exitBtnText}>DONE</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </LinearGradient>
                </View>
            </Modal>

            {/* 🔥 PREMIUM ACTION SHEET: USER MINI-PROFILE (Over Live Stream) 🔥 */}
            <Modal visible={actionSheetVisible} transparent animationType="slide">
                <View style={styles.actionSheetOverlay}>
                    <TouchableOpacity style={styles.actionSheetDismiss} onPress={() => setActionSheetVisible(false)} />
                    <View style={styles.actionSheetContainer}>
                        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                        <LinearGradient colors={['transparent', withAlpha(c0, 0.95), 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topEdgeGlow} pointerEvents="none" />
                        <View style={styles.actionSheetHandle} />
                        
                        <View style={styles.actionSheetProfileHeader}>
                            {selectedUser?.image ? (
                                <Image source={{ uri: selectedUser.image }} style={styles.actionSheetAvatar} />
                            ) : (
                                <View style={styles.actionSheetAvatarPlaceholder}>
                                    <Text style={styles.actionSheetAvatarText}>
                                        {selectedUser?.name ? selectedUser.name.charAt(0).toUpperCase() : "U"}
                                    </Text>
                                </View>
                            )}
                            <Text style={styles.actionSheetTitle}>{selectedUser?.name || "User"}</Text>
                        </View>

                        {/* 🔥 BLOCK AND REPORT ARE MERGED INTO THIS BUTTON 🔥 */}
                        <TouchableOpacity style={styles.actionSheetBtn} onPress={handleReportUser}>
                            <Ionicons name="shield-half-outline" size={22} color="#EF4444" />
                            <Text style={[styles.actionSheetBtnText, { color: '#EF4444' }]}>Block User</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionSheetCancelBtn} onPress={() => setActionSheetVisible(false)}>
                            <Text style={styles.actionSheetCancelText}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 🔥 SATTI FIX: REPORT REASONS MODAL 🔥 */}
            <Modal visible={reportSheetVisible} transparent animationType="slide">
                <View style={styles.actionSheetOverlay}>
                    <TouchableOpacity style={styles.actionSheetDismiss} onPress={() => setReportSheetVisible(false)} />
                    <View style={styles.actionSheetContainer}>
                        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                        <LinearGradient colors={['transparent', 'rgba(239,68,68,0.95)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topEdgeGlow} pointerEvents="none" />
                        <View style={styles.actionSheetHandle} />
                        <Text style={[styles.actionSheetTitle, { marginBottom: 15 }]}>Select Report Reason</Text>

                        <TouchableOpacity style={styles.actionSheetBtn} onPress={() => submitReport("Bad Words / Harassment")}>
                            <Ionicons name="chatbubbles-outline" size={22} color="#EF4444" />
                            <Text style={[styles.actionSheetBtnText, { color: '#FFF' }]}>Bad Words / Harassment</Text>
                        </TouchableOpacity>
                        <View style={styles.actionSheetDivider} />

                        <TouchableOpacity style={styles.actionSheetBtn} onPress={() => submitReport("Nudity / Sexual Content")}>
                            <Ionicons name="eye-off-outline" size={22} color="#EF4444" />
                            <Text style={[styles.actionSheetBtnText, { color: '#FFF' }]}>Nudity / Sexual Content</Text>
                        </TouchableOpacity>
                        <View style={styles.actionSheetDivider} />

                        <TouchableOpacity style={styles.actionSheetBtn} onPress={() => submitReport("Spam / Scam")}>
                            <Ionicons name="alert-circle-outline" size={22} color="#F59E0B" />
                            <Text style={[styles.actionSheetBtnText, { color: '#FFF' }]}>Spam / Scam</Text>
                        </TouchableOpacity>
                        <View style={styles.actionSheetDivider} />

                        <TouchableOpacity style={styles.actionSheetBtn} onPress={() => submitReport("Other Violations")}>
                            <Ionicons name="flag-outline" size={22} color="#94A3B8" />
                            <Text style={[styles.actionSheetBtnText, { color: '#FFF' }]}>Other Violations</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionSheetCancelBtn} onPress={() => setReportSheetVisible(false)}>
                            <Text style={styles.actionSheetCancelText}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 🔥 NEW: PLAY STORE COMPLIANT HOST SKILL GAMING DISCLAIMER MODAL 🔥 */}
            <Modal visible={disclaimerVisible} transparent animationType="slide">
                <View style={styles.actionSheetOverlay}>
                    <View style={[styles.actionSheetContainer, { paddingBottom: Platform.OS === 'ios' ? 40 : 30 }]}>
                        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                        <LinearGradient colors={['transparent', 'rgba(245,158,11,0.95)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topEdgeGlow} pointerEvents="none" />
                        <View style={styles.actionSheetHandle} />
                        <Text style={[styles.actionSheetTitle, { marginBottom: 15, color: '#F59E0B' }]}>🛡️ Host Skill Gaming Policy</Text>

                        <ScrollView style={{ maxHeight: height * 0.35, marginBottom: 15 }} showsVerticalScrollIndicator={false}>
                            <Text style={styles.disclaimerBodyText}>Welcome to TalkPe Pro Games! As a Host, please acknowledge your responsibilities:</Text>
                            
                            <Text style={styles.disclaimerBullet}>🎮 <Text style={styles.disclaimerBold}>Host Role:</Text> You can host the games (Reflex Arena & Memory Match) to engage your audience. You can also join and play along with your audience.</Text>
                            
                            <Text style={styles.disclaimerBullet}>🎁 <Text style={styles.disclaimerBold}>Free to Play:</Text> All games are completely free. There is no entry fee and no game rewards or commission for hosts or players.</Text>

                            <Text style={styles.disclaimerBullet}>⚠️ <Text style={styles.disclaimerBold}>Do Not Force Close:</Text> Never close or minimize the app while a game is active. This disrupts the session for users.</Text>
                            
                            <Text style={styles.disclaimerBullet}>🧠 <Text style={styles.disclaimerBold}>Skill & Entertainment Only:</Text> These are strictly skill-based interactive features created purely for fun and entertainment.</Text>
                        </ScrollView>

                        <TouchableOpacity 
                            style={styles.checkboxContainer} 
                            activeOpacity={0.8}
                            onPress={() => setDisclaimerChecked(!disclaimerChecked)}
                        >
                            <Ionicons name={disclaimerChecked ? "checkbox" : "square-outline"} size={24} color={disclaimerChecked ? "#10B981" : "#94A3B8"} />
                            <Text style={styles.checkboxText}>I confirm that I understand my role as a Host, that games are free to play, and agree not to disrupt active games.</Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 20, paddingBottom: 20 }}>
                            <TouchableOpacity 
                                style={[styles.actionSheetCancelBtn, { flex: 1, marginTop: 0 }]} 
                                onPress={() => { setDisclaimerVisible(false); setDisclaimerChecked(false); setPendingGameType(null); }}
                            >
                                <Text style={styles.actionSheetCancelText}>CANCEL</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[styles.actionSheetBtn, { flex: 1, justifyContent: 'center', backgroundColor: disclaimerChecked ? '#10B981' : 'rgba(16, 185, 129, 0.2)', borderRadius: 15, paddingVertical: 15 }]} 
                                disabled={!disclaimerChecked}
                                onPress={() => {
                                    setDisclaimerVisible(false);
                                    setDisclaimerChecked(false);
                                    if (pendingGameType === 'reflex') setGameVisible(true);
                                    if (pendingGameType === 'memory') setGlassVisible(true);
                                    setPendingGameType(null);
                                }}
                            >
                                <Text style={[styles.actionSheetBtnText, { color: disclaimerChecked ? '#FFF' : 'rgba(255,255,255,0.4)', marginLeft: 0 }]}>AGREE & HOST</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    videoContainer: { ...StyleSheet.absoluteFillObject },
    videoGrid: { flex: 1, flexDirection: 'column' },
    fullVideo: { flex: 1 },
    halfVideo: { flex: 0.5, borderBottomWidth: 1, borderColor: '#1E293B' },
    connectWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    pulseWrap: { width: 220, height: 220, justifyContent: 'center', alignItems: 'center' },
    loadingText: { color: '#00F2FE', alignSelf: 'center', marginTop: 10, fontWeight: '900', letterSpacing: 2 },
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
    topEdgeGlow: { position: 'absolute', top: 0, left: 20, right: 20, height: 1.5 },
    orbBtn: { justifyContent: 'center', alignItems: 'center', borderWidth: 2 },

    // 🔮 HOST BOARD (top of the phone)
    boardWrap: { position: 'absolute', left: 12, right: 68, zIndex: 10 },
    boardBorder: { padding: 1.5, borderRadius: 28 },
    boardInner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 26.5, overflow: 'hidden', backgroundColor: 'rgba(2, 6, 23, 0.6)' },
    avatarWrapper: { position: 'relative' },
    hostAvatarMass: { width: 48, height: 48, borderRadius: 24 },
    initialsCircleMass: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
    initialsText: { color: '#00F2FE', fontSize: 18, fontWeight: '900' },
    crownBadgeMass: { position: 'absolute', top: -3, right: -3, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#020617' },
    boardTextCol: { flex: 1, minWidth: 0, gap: 4 },
    hostNameHeaderMass: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: -0.3, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4 },
    levelPill: { alignSelf: 'flex-start', maxWidth: '100%', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, borderWidth: 1 },
    levelPillText: { color: '#FFF', fontSize: 8, fontWeight: '900', textTransform: 'uppercase' },
    statsRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
    liveBadgeMass: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    liveText: { color: '#FFF', fontWeight: '900', fontSize: 10, letterSpacing: 1 },
    viewerBadgeMass: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0, 242, 254, 0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.3)' },
    viewerCountTextMass: { color: '#00F2FE', fontSize: 11, fontWeight: '900' },
    beanBadge: { backgroundColor: 'rgba(245, 158, 11, 0.16)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.4)' },
    beanText: { color: '#FCD34D', fontSize: 10, fontWeight: '900' },

    endBtnWrap: { position: 'absolute', right: 12, zIndex: 11 },

    // 👥 AUDIENCE STRIP
    viewersWrap: { position: 'absolute', left: 12, right: 12, zIndex: 9 },
    viewersInner: { flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: 25, paddingHorizontal: 8, overflow: 'hidden', backgroundColor: 'rgba(2, 6, 23, 0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    viewersIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center', marginRight: 8 },
    waitingText: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },
    viewerItem: { marginRight: 8 },
    viewerAvatar: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: '#1E293B' },

    pinnedBox: { position: 'absolute', left: 12, right: 72, backgroundColor: 'rgba(15, 23, 42, 0.7)', padding: 12, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 5, borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.2)' },
    pinnedText: { color: '#FFF', fontSize: 13, fontWeight: '700', flexShrink: 1 },

    // 🎛️ RIGHT SIDE (beauty button + magic dock) - 🆕 on top of everything except modals / call card
    rail: { position: 'absolute', right: 10, alignItems: 'center', zIndex: 20, elevation: 20 },
    proTag: { marginTop: -4, backgroundColor: '#FFD700', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: '#FFFFFF' },
    proTagText: { color: '#1F1300', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.6 },

    // 📞 INCOMING CALL
    callOverlayMass: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', zIndex: 99999, elevation: 99999, backgroundColor: 'rgba(2, 6, 23, 0.8)' },
    callCardWrapper: { width: '82%', borderRadius: 32, overflow: 'hidden' },
    callCardBorder: { padding: 1.5, borderRadius: 32 },
    callCardMass: { paddingVertical: 32, paddingHorizontal: 20, alignItems: 'center', borderRadius: 30.5, overflow: 'hidden' },
    callerAvatarRing: { width: 110, height: 110, justifyContent: 'center', alignItems: 'center', marginBottom: 18 },
    callerCallAvatar: { width: 90, height: 90, borderRadius: 45 },
    callerCallInitials: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
    callerCallInitialsText: { color: '#00F2FE', fontSize: 32, fontWeight: '900' },
    callPulseText: { color: '#00F2FE', fontSize: 11, fontWeight: '900', letterSpacing: 5, marginBottom: 10, textShadowColor: '#00F2FE', textShadowRadius: 5 },
    callInfoTextMass: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0, marginBottom: 28, textAlign: 'center', textShadowColor: 'rgba(255,255,255,0.4)', textShadowRadius: 10 },
    callActionsMass: { flexDirection: 'row', gap: 44, width: '100%', justifyContent: 'center' },
    actionBtnHitbox: { alignItems: 'center' },
    callBtnLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '900', textAlign: 'center', marginTop: 12, letterSpacing: 2 },

    // 💬 FLOATING CHAT
    interactionArea: { height: height * 0.45, paddingHorizontal: 12, justifyContent: 'flex-end' },
    chatList: { flex: 1, marginBottom: 12, width: '78%', alignSelf: 'flex-start' },
    chatPopWrap: { alignSelf: 'flex-start', maxWidth: width * 0.74 },
    chatBubble: { backgroundColor: 'rgba(8, 12, 28, 0.72)', padding: 10, borderRadius: 18, marginBottom: 8, alignSelf: 'flex-start', maxWidth: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    chatBubbleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chatInitial: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    chatInitialText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    chatName: { color: '#fec300', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
    chatMessage: { color: '#FFF', fontWeight: '700', fontSize: 14 },
    sysPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 6, paddingRight: 12, borderRadius: 18, marginBottom: 8, backgroundColor: 'rgba(8, 12, 28, 0.72)', borderWidth: 1, maxWidth: '100%' },
    sysDot: { width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    sysText: { color: '#FFF', fontSize: 12, fontWeight: '800', flexShrink: 1 },
    giftChatBubble: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 18, marginBottom: 8, alignSelf: 'flex-start', maxWidth: '100%', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.7)' },
    giftChatText: { color: '#FFF', fontWeight: '900', fontSize: 12, flexShrink: 1, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 5 },

    bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    inputBorder: { flex: 1, padding: 1.5, borderRadius: 26 },
    input: { backgroundColor: 'rgba(8, 12, 28, 0.92)', borderRadius: 24.5, height: 44, color: '#FFF', paddingHorizontal: 20 },

    // ✨ BEAUTY STUDIO PANEL (🆕 root level, zIndex above chat)
    proPanelWrap: { position: 'absolute', left: 12, right: 12, zIndex: 30, elevation: 30 },
    panelBorder: { padding: 1.5, borderRadius: 28 },
    panelInner: { borderRadius: 26.5, overflow: 'hidden', padding: 12, backgroundColor: 'rgba(6,10,26,0.82)' },
    panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
    studioIcon: { width: 38, height: 38, borderRadius: 13, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#FFFFFF' },
    panelTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', flexShrink: 1 },
    panelSub: { color: '#94A3B8', fontSize: 10, fontWeight: '700', marginTop: 1, letterSpacing: 0.5 },
    powerPill: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 14, marginLeft: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
    powerText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    panelCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center' },

    presetRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    presetCard: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 16, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.06)' },
    presetIcon: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    presetText: { color: '#FFF', fontSize: 11, fontWeight: '800' },

    sliderBox: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, paddingVertical: 4, paddingHorizontal: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', marginBottom: 10 },
    sliderRow: { flexDirection: 'row', alignItems: 'center', height: 40 },
    sliderIcon: { width: 26, height: 26, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    sliderLabel: { color: '#FFF', fontSize: 12, fontWeight: '800', width: 62, marginLeft: 8 },
    sliderHit: { flex: 1, height: 36, justifyContent: 'center', marginHorizontal: 6 },
    sliderTrack: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
    sliderKnob: { position: 'absolute', top: 7, width: 22, height: 22, borderRadius: 11, backgroundColor: '#FFFFFF', borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
    sliderValue: { color: '#FFF', fontSize: 12, fontWeight: '900', width: 30, textAlign: 'right' },

    quickRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    ProSettingsBar: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
    settingGroup: { flex: 1, alignItems: 'center' },
    settingLabel: { color: '#CBD5E1', fontSize: 10, fontWeight: '900', marginBottom: 10, letterSpacing: 1.5 },
    chipRow: { flexDirection: 'row', gap: 10 },
    chip: { backgroundColor: 'rgba(30,41,59,0.9)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)' },
    activeChip: { backgroundColor: 'rgba(0, 242, 254, 0.18)', borderColor: '#00F2FE' },
    chipText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
    settingDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 12 },

    // 📊 SUMMARY
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    summaryBorder: { width: '86%', padding: 1.5, borderRadius: 32 },
    summaryCard: { backgroundColor: '#0B1220', borderRadius: 30.5, padding: 26, alignItems: 'center', overflow: 'hidden' },
    summaryTitle: { color: '#00F2FE', fontSize: 20, fontWeight: '900', letterSpacing: 3, marginBottom: 24 },
    statGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 30, gap: 8 },
    statItem: { alignItems: 'center', flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 4, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', gap: 4 },
    statVal: { color: '#FFF', fontSize: 20, fontWeight: '900' },
    statLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '700', letterSpacing: 0.5, textAlign: 'center' },
    exitBtn: { width: '100%', padding: 18, borderRadius: 20, alignItems: 'center' },
    exitBtnText: { color: '#020617', fontWeight: '900', fontSize: 14, letterSpacing: 2 },

    // 🔥 ACTION SHEET STYLES 🔥
    actionSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    actionSheetDismiss: { flex: 1 },
    actionSheetContainer: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.2)', borderBottomWidth: 0 },
    actionSheetHandle: { width: 40, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
    
    actionSheetProfileHeader: { alignItems: 'center', marginBottom: 25 },
    actionSheetAvatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#00F2FE', marginBottom: 10 },
    actionSheetAvatarPlaceholder: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#1E293B', borderWidth: 2, borderColor: '#00F2FE', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    actionSheetAvatarText: { color: '#FFF', fontSize: 28, fontWeight: '900' },
    actionSheetTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },

    actionSheetBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 10 },
    actionSheetBtnText: { fontSize: 16, fontWeight: '700', marginLeft: 15, letterSpacing: 0.5 },
    actionSheetDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', width: '100%' },
    actionSheetCancelBtn: { marginTop: 25, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 15, borderRadius: 15, alignItems: 'center' },
    actionSheetCancelText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },

    // 🔥 DISCLAIMER STYLES 🔥
    disclaimerBodyText: { color: '#CBD5E1', fontSize: 13, lineHeight: 20, marginBottom: 15 },
    disclaimerBullet: { color: '#CBD5E1', fontSize: 13, lineHeight: 22, marginBottom: 10 },
    disclaimerBold: { fontWeight: 'bold', color: '#FFF' },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12 },
    checkboxText: { color: '#94A3B8', fontSize: 11, marginLeft: 10, flex: 1, lineHeight: 18 },
});
