import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDocs, limit, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    KeyboardAvoidingView,
    LayoutAnimation,
    Linking,
    Modal,
    PanResponder,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

// 🎨 IMAGES (neenga eppo venumnaalum unga brand images-a maathikalam - load aagala-na kooda design break aagaadhu)
const HERO_BG = 'https://images.unsplash.com/photo-1553877522-43269d4ea984?q=80&w=1600&auto=format&fit=crop';
const CONTACT_BG = 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop';
const SECURITY_BG = 'https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=1200&auto=format&fit=crop';

// 🆕 3D IMAGES (icons8 3D Fluency) - load aagalana automatic-a icon fallback varum
const IMG3D = {
    shield: 'https://img.icons8.com/3d-fluency/512/shield.png',
    check: 'https://img.icons8.com/3d-fluency/512/ok.png',
};

const CARD_W = width - 40;
const SUPPORT_EMAIL = 'support@talkpepro.com';

const clamp = (v: number, min = -1, max = 1) => Math.max(min, Math.min(max, v));

// 🆕 color helpers
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

// 🆕 REPORT FORM CONFIG
const REPORT_COLOR = '#F43F5E';
const REPORT_CATEGORIES = [
    { key: 'harassment', label: 'Harassment / Abuse', icon: 'account-alert-outline' },
    { key: 'inappropriate', label: 'Inappropriate Content', icon: 'eye-off-outline' },
    { key: 'fraud', label: 'Fraud / Suspicious Activity', icon: 'shield-alert-outline' },
    { key: 'threat', label: 'Threats / Safety Concern', icon: 'alert-octagon-outline' },
    { key: 'impersonation', label: 'Impersonation', icon: 'account-question-outline' },
    { key: 'other', label: 'Other Concern', icon: 'dots-horizontal-circle-outline' },
];
const MIN_DESC = 20;
const MAX_DESC = 500;
const REPORT_COOLDOWN_MS = 60000;
const REPORT_STATUS_META: Record<string, any> = {
    unread:    { label: 'SUBMITTED',    color: '#F59E0B', icon: 'send-check-outline',   note: 'Waiting for the team to pick it up.' },
    reviewing: { label: 'UNDER REVIEW', color: '#3B82F6', icon: 'magnify',              note: 'Our team is reviewing your report.' },
    resolved:  { label: 'REVIEWED',     color: '#10B981', icon: 'check-decagram',       note: 'Reviewed and appropriate action taken.' },
    dismissed: { label: 'REVIEWED',     color: '#94A3B8', icon: 'check-circle-outline', note: 'Reviewed. No policy violation found.' },
};

// 🔥 AAA SMART DYNAMIC TIER ENGINE 🔥
const getSmartLevelConfig = (userData: any) => {
    const getObj = (lvl: number) => {
        if (lvl >= 10) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'] as const, glow: '#F59E0B' };
        if (lvl === 9) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'] as const, glow: '#EC4899' };
        if (lvl === 8) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'] as const, glow: '#8B5CF6' };
        if (lvl === 7) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'] as const, glow: '#3B82F6' };
        if (lvl === 6) return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'] as const, glow: '#06B6D4' };
        if (lvl === 5) return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'] as const, glow: '#10B981' };
        if (lvl === 4) return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'] as const, glow: '#EAB308' };
        if (lvl === 3) return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'] as const, glow: '#94A3B8' };
        if (lvl === 2) return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'] as const, glow: 'transparent' };
        if (lvl === 1) return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'] as const, glow: 'transparent' };
        return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'] as const, glow: 'transparent' };
    };

    // 🔧 "L5" maathiri string vandhalum level correct-a edukkum (munnaadi NaN aagi L0 theme-ku poyidum)
    const rawLvl = userData?.expertLevel ?? userData?.currentLevel ?? userData?.level;
    if (rawLvl !== undefined && rawLvl !== null) {
        if (typeof rawLvl === 'number') return getObj(rawLvl);
        const levelMatch = String(rawLvl).match(/\d+/);
        if (levelMatch) return getObj(parseInt(levelMatch[0], 10));
    }
    const title = String(userData?.levelTitle || '').toUpperCase();
    if (title.includes('L10') || title.includes('LEGEND')) return getObj(10);
    if (title.includes('L9') || title.includes('MYTHIC')) return getObj(9);
    if (title.includes('L8') || title.includes('ELITE')) return getObj(8);
    if (title.includes('L7') || title.includes('MASTER')) return getObj(7);
    if (title.includes('L6') || title.includes('DIAMOND')) return getObj(6);
    if (title.includes('L5') || title.includes('PLATINUM')) return getObj(5);
    if (title.includes('L4') || title.includes('GOLD')) return getObj(4);
    if (title.includes('L3') || title.includes('SILVER')) return getObj(3);
    if (title.includes('L2') || title.includes('BRONZE')) return getObj(2);
    if (title.includes('L1') || title.includes('ROOKIE')) return getObj(1);
    return getObj(0);
};

// 🔥 MASS FAQ DATABASE FOR HOSTS (PLAY STORE COMPLIANT) 🔥
const FAQS = [
       {
        id: 1,
        question: "When will my reward redemption be processed?",
        answer: "Redemption requests are reviewed manually by our team and are usually processed within 5-7 working days. During review, we may verify your account activity and the details you submitted to keep the platform safe and fair. Please make sure your payout details and ID document are accurate, as incorrect details can delay or prevent processing."
    },
    {
        id: 2,
        question: "How does the Premium Spotlight (Algorithm Boost) work?",
        answer: "Premium Spotlight pushes your profile up to get more genuine call requests. Note: All Spotlight videos are subject to strict UGC (User Generated Content) guidelines. Users can report videos, which triggers a mandatory 24-hour admin review to ensure platform safety."
    },
    {
        id: 3,
        question: "What is the minimum Redeem limit & Rules?",
        answer: "The minimum redemption limit is ₹500. Additionally, for any redemption request above ₹5,000, submission of a valid ID proof (Aadhaar or PAN) is mandatory for KYC compliance. Note: A standard transaction charge of ₹100 applies per redemption."
    },
    {
        id: 4,
        question: "Why am I not receiving any incoming call requests?",
        answer: "1. Check your 'ONLINE' status in the command center.\n2. Ensure your profile picture is highly professional and strictly 18+ compliant (no explicit content).\n3. Maintain a positive interaction rating with users.\n4. Keep your app updated to the latest Play Store version."
    },
    {
        id: 5,
        question: "How do Broadcast & Audio/Video Calls work?",
        answer: "You earn rewards directly based on your Tier's 'Rewards per Minute' rate during active audio or video sessions. If a user disconnects due to poor network, our system automatically calculates your earnings up to the exact second of disconnection to protect your legitimate time spent."
    },
    {
        id: 6,
        question: "My account is showing as restricted. What do I do?",
        answer: "Accounts are restricted automatically for strict policy violations (e.g., sharing personal numbers, inappropriate behavior). Contact support to appeal. Additionally, as per data safety rules, you retain full rights to use the 'Delete Account' option to permanently wipe your data at any time."
    },
    {
        id: 7,
        question: "How to handle abusive or misbehaving users?",
        answer: "Your safety is our absolute priority. Disconnect immediately and use the in-call 'Block & Report' feature. Our Trust & Safety team reviews all reports within 24 hours to enforce permanent platform bans on violators."
    },
    {
        id: 8,
        question: "Can I change my Per-Minute Call Reward?",
        answer: "Yes! Based on your Tier (e.g., Bronze, Silver, Gold), you can adjust your 'Rewards per Minute' rate every 30 minutes. Rest assured, for your absolute privacy, TalkPe Pro operates under a Zero Recording Policy—private calls are NEVER recorded."
    }
];

// ✨ PRESS-SCALE BUTTON (ovvoru tap-kum springy premium feel)
const ScaleBtn = ({ children, onPress, style, wrapStyle, disabled }: any) => {
    const s = useRef(new Animated.Value(1)).current;
    return (
        <Pressable
            onPress={onPress}
            disabled={disabled}
            style={wrapStyle}
            onPressIn={() => Animated.spring(s, { toValue: 0.96, useNativeDriver: true, speed: 40, bounciness: 0 }).start()}
            onPressOut={() => Animated.spring(s, { toValue: 1, useNativeDriver: true, friction: 4 }).start()}
        >
            <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
        </Pressable>
    );
};

// ✨ FLOATING GLOW PARTICLE (card ulla magic dust)
const FloatingDot = ({ delay, left, size, color, duration }: any) => {
    const a = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(a, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true })
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
                bottom: 14,
                left,
                width: size,
                height: size,
                borderRadius: size / 2,
                backgroundColor: color,
                opacity: a.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.85, 0] }),
                transform: [
                    { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -150] }) },
                    { translateX: a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 10, -8] }) }
                ]
            }}
        />
    );
};

// ✨ 3D TILT CARD: sways on its own, follows your finger on horizontal drag, glare shine
const Tilt3D = ({ children, style, radius = 28, max = 10 }: any) => {
    const rx = useRef(new Animated.Value(0)).current;
    const ry = useRef(new Animated.Value(0)).current;
    const sw = useRef(new Animated.Value(0)).current;
    const dims = useRef({ w: 300, h: 160 });

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(sw, { toValue: 1, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(sw, { toValue: 0, duration: 3400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const release = () => {
        Animated.parallel([
            Animated.spring(rx, { toValue: 0, useNativeDriver: true, friction: 4, tension: 40 }),
            Animated.spring(ry, { toValue: 0, useNativeDriver: true, friction: 4, tension: 40 }),
        ]).start();
    };

    const pan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => false,
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy),
            onPanResponderMove: (_, g) => {
                ry.setValue(clamp(g.dx / (dims.current.w / 2)));
                rx.setValue(clamp(g.dy / dims.current.h));
            },
            onPanResponderRelease: release,
            onPanResponderTerminate: release,
        })
    ).current;

    const rotateX = rx.interpolate({ inputRange: [-1, 1], outputRange: [`${max}deg`, `-${max}deg`] });
    const rotateY = ry.interpolate({ inputRange: [-1, 1], outputRange: [`-${max}deg`, `${max}deg`] });
    const swayY = sw.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] });
    const swayX = sw.interpolate({ inputRange: [0, 1], outputRange: ['2deg', '-2deg'] });
    const glareX = Animated.add(
        ry.interpolate({ inputRange: [-1, 1], outputRange: [-130, 130] }),
        sw.interpolate({ inputRange: [0, 1], outputRange: [-70, 70] })
    );

    return (
        <Animated.View
            {...pan.panHandlers}
            onLayout={(e) => { dims.current = { w: e.nativeEvent.layout.width || 300, h: e.nativeEvent.layout.height || 160 }; }}
            style={[
                style,
                { transform: [{ perspective: 900 }, { rotateX }, { rotateY }, { rotateY: swayY }, { rotateX: swayX }] }
            ]}
        >
            {children}
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
                <Animated.View style={[styles.glareStrip, { transform: [{ translateX: glareX }, { rotate: '18deg' }] }]} />
            </View>
        </Animated.View>
    );
};

// ✨ 3D FLOATING ORB (hero headset + security shield) - sways in 3D, bobs, pulses a ring
const Orb3D = ({ c1, c2, children }: any) => {
    const sway = useRef(new Animated.Value(0)).current;
    const bob = useRef(new Animated.Value(0)).current;
    const ring = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const l1 = Animated.loop(
            Animated.sequence([
                Animated.timing(sway, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(sway, { toValue: 0, duration: 2600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        const l2 = Animated.loop(
            Animated.sequence([
                Animated.timing(bob, { toValue: 1, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(bob, { toValue: 0, duration: 2100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        const l3 = Animated.loop(
            Animated.timing(ring, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true })
        );
        l1.start(); l2.start(); l3.start();
        return () => { l1.stop(); l2.stop(); l3.stop(); };
    }, []);

    const rotY = sway.interpolate({ inputRange: [0, 1], outputRange: ['-28deg', '28deg'] });
    const rotX = sway.interpolate({ inputRange: [0, 1], outputRange: ['8deg', '-8deg'] });
    const ty = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
    const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.9] });
    const ringOpacity = ring.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });

    return (
        <View style={styles.orbWrap}>
            <Animated.View pointerEvents="none" style={[styles.orbRing, { borderColor: c1, opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
            <Animated.View style={{ transform: [{ translateY: ty }, { perspective: 600 }, { rotateY: rotY }, { rotateX: rotX }] }}>
                <LinearGradient colors={[c1, c2] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.orbCore}>
                    {children}
                </LinearGradient>
            </Animated.View>
        </View>
    );
};

// ✨ ROTATING-RING ICON (contact cards) - gradient ring spins around the icon
const RingIcon = ({ spin, color, children }: any) => (
    <View style={styles.ringWrap}>
        <View style={styles.ringClip}>
            <Animated.View style={{ width: 100, height: 100, transform: [{ rotate: spin }] }}>
                <LinearGradient colors={[color, 'transparent', color, 'transparent', color] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
            </Animated.View>
        </View>
        <View style={styles.ringInner}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: color + '20', borderRadius: 29 }]} />
            {children}
        </View>
    </View>
);

// ================= 🆕 REPORT FORM COMPONENTS =================

// 🆕 3D image with auto icon fallback
const Img3D = ({ uri, size, fallback, color = '#FFF', style }: any) => {
    const [err, setErr] = useState(false);
    if (err) return <MaterialCommunityIcons name={fallback} size={size * 0.7} color={color} />;
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
                        { perspective: 600 },
                        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -amp] }) },
                        { rotateY: v.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '14deg'] }) }
                    ]
                }
            ]}
        >
            {children}
        </Animated.View>
    );
};

// 🆕 Twinkling sparkle
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

// 🆕 Gradient-border glow card
const GlowCard = ({ colors, radius = 26, children, style, glow }: any) => (
    <View
        style={[
            {
                borderRadius: radius,
                backgroundColor: '#0A0620',
                shadowColor: glow || colors[0],
                shadowOpacity: 0.45,
                shadowRadius: 18,
                shadowOffset: { width: 0, height: 6 },
                elevation: 10
            },
            style
        ]}
    >
        <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius, padding: 1.5 }}>
            <View style={{ borderRadius: radius - 1.5, overflow: 'hidden', backgroundColor: 'rgba(10, 6, 28, 0.97)' }}>{children}</View>
        </LinearGradient>
    </View>
);

// 🆕 Entrance wrapper (spring slide-up + fade)
const Enter = ({ children, delay = 0, style }: any) => {
    const a = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(a, { toValue: 1, delay, friction: 7, tension: 55, useNativeDriver: true }).start();
    }, []);
    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: a,
                    transform: [
                        { perspective: 900 },
                        { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [34, 0] }) },
                        { rotateX: a.interpolate({ inputRange: [0, 1], outputRange: ['18deg', '0deg'] }) },
                        { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }
                    ]
                }
            ]}
        >
            {children}
        </Animated.View>
    );
};

// 🆕 Input with focus glow
const GlowField = ({ icon, color, style, multiline, ...rest }: any) => {
    const [focused, setFocused] = useState(false);
    const f = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(f, { toValue: focused ? 1 : 0, duration: 220, useNativeDriver: false }).start();
    }, [focused]);
    return (
        <Animated.View
            style={[
                styles.fieldWrap,
                multiline && { alignItems: 'flex-start', paddingTop: 12 },
                {
                    borderColor: f.interpolate({ inputRange: [0, 1], outputRange: [color + '44', color] }),
                    shadowColor: color,
                    shadowOpacity: f.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }) as any,
                    shadowRadius: 12,
                    shadowOffset: { width: 0, height: 0 },
                    elevation: focused ? 6 : 0
                },
                style
            ]}
        >
            {icon ? (
                <LinearGradient colors={[color, color + '77']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fieldIcon}>
                    <Ionicons name={icon} size={15} color="#FFF" />
                </LinearGradient>
            ) : null}
            <TextInput
                style={[styles.fieldInput, { minWidth: 0 }, multiline && { textAlignVertical: 'top', height: '100%' }]}
                multiline={multiline}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                {...rest}
            />
        </Animated.View>
    );
};

// 🆕 Category chip (press scale + gradient when selected)
const CatChip = ({ label, icon, selected, color, onPress }: any) => {
    const scale = useRef(new Animated.Value(1)).current;
    return (
        <Animated.View style={{ transform: [{ scale }] }}>
            <TouchableOpacity
                activeOpacity={0.85}
                onPress={onPress}
                onPressIn={() => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
                style={[styles.catChip, { borderColor: selected ? color : 'rgba(255,255,255,0.14)' }, selected && { shadowColor: color, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 5 }]}
            >
                {selected && <LinearGradient colors={[color + 'CC', color + '66']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />}
                <MaterialCommunityIcons name={icon} size={15} color={selected ? '#FFF' : '#94A3B8'} />
                <Text style={[styles.catChipText, selected && { color: '#FFF', fontWeight: '900' }]}>{label}</Text>
                {selected && <Ionicons name="checkmark-circle" size={13} color="#FFF" />}
            </TouchableOpacity>
        </Animated.View>
    );
};

// 🆕 Submit button with shine sweep
const SweepBtn = ({ colors, onPress, disabled, loading, label, icon }: any) => {
    const sw = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(1400),
                Animated.timing(sw, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(sw, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <ScaleBtn onPress={onPress} disabled={disabled} style={[styles.sweepBtnOuter, { shadowColor: colors[0] }, disabled && { opacity: 0.6 }]}>
            <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sweepBtnGrad}>
                <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']} style={styles.sweepBtnGloss} pointerEvents="none" />
                <Animated.View pointerEvents="none" style={[styles.sweepBtnSweep, { transform: [{ translateX: sw.interpolate({ inputRange: [0, 1], outputRange: [-120, 360] }) }, { rotate: '20deg' }] }]}>
                    <LinearGradient colors={['transparent', 'rgba(255,255,255,0.38)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                </Animated.View>
                {loading ? <ActivityIndicator color="#FFF" /> : (
                    <>
                        {icon ? <MaterialCommunityIcons name={icon} size={20} color="#FFF" /> : null}
                        <Text style={styles.sweepBtnText}>{label}</Text>
                    </>
                )}
            </LinearGradient>
        </ScaleBtn>
    );
};

// 🆕 Animated success tick (pop + ring pulse)
const SuccessTick = ({ color }: any) => {
    const pop = useRef(new Animated.Value(0)).current;
    const ring = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(pop, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
        const loop = Animated.loop(Animated.timing(ring, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <View style={styles.tickWrap}>
            <Animated.View pointerEvents="none" style={[styles.tickRing, { borderColor: color, opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }), transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.8] }) }] }]} />
            <Animated.View style={{ transform: [{ scale: pop }, { perspective: 600 }, { rotateY: pop.interpolate({ inputRange: [0, 1], outputRange: ['-90deg', '0deg'] }) }] }}>
                <Img3D uri={IMG3D.check} size={92} fallback="check-decagram" color={color} />
            </Animated.View>
        </View>
    );
};

// ✨ FAQ ITEM (staggered slide-in, animated icon bump, accent bar, numbered badge)
const FaqItem = ({ faq, index, isExpanded, onToggle, primaryColor, secondaryColor }: any) => {
    const enter = useRef(new Animated.Value(0)).current;
    const bump = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

    useEffect(() => {
        Animated.timing(enter, { toValue: 1, duration: 520, delay: index * 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        Animated.spring(bump, { toValue: isExpanded ? 1 : 0, useNativeDriver: true, friction: 6, tension: 120 }).start();
    }, [isExpanded]);

    const iconScale = bump.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] });

    return (
        <Animated.View
            style={{
                opacity: enter,
                transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }]
            }}
        >
            <TouchableOpacity
                style={[styles.faqItem, { borderColor: isExpanded ? primaryColor : 'rgba(255,255,255,0.05)', backgroundColor: isExpanded ? 'rgba(15, 23, 42, 0.9)' : 'rgba(15, 23, 42, 0.5)' }]}
                onPress={() => onToggle(faq.id)}
                activeOpacity={0.7}
            >
                <View style={[styles.faqAccent, { backgroundColor: primaryColor, opacity: isExpanded ? 1 : 0 }]} />
                <View style={styles.faqQuestionRow}>
                    <LinearGradient
                        colors={isExpanded ? ([primaryColor, secondaryColor] as const) : (['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)'] as const)}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={styles.faqNumBadge}
                    >
                        <Text style={[styles.faqNumText, { color: isExpanded ? '#FFF' : '#94A3B8' }]}>{String(index + 1).padStart(2, '0')}</Text>
                    </LinearGradient>
                    <Text style={[styles.faqQuestion, { color: isExpanded ? '#FFF' : 'rgba(255,255,255,0.8)' }]}>
                        {faq.question}
                    </Text>
                    <Animated.View style={[styles.faqIconContainer, { backgroundColor: isExpanded ? primaryColor + '20' : 'transparent', transform: [{ scale: iconScale }] }]}>
                        <Ionicons
                            name={isExpanded ? "chevron-up" : "add"}
                            size={22}
                            color={isExpanded ? primaryColor : '#64748B'}
                        />
                    </Animated.View>
                </View>
                {isExpanded && (
                    <View style={styles.faqAnswerBox}>
                        <Text style={styles.faqAnswer}>{faq.answer}</Text>
                    </View>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function SupportHubScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [expandedId, setExpandedId] = useState<number | null>(null);

    // 🆕 REPORT FORM STATE
    const [reportVisible, setReportVisible] = useState(false);
    const [reportCategory, setReportCategory] = useState<string>('');
    const [reportedUser, setReportedUser] = useState('');
    const [reportDesc, setReportDesc] = useState('');
    const [reportConfirm, setReportConfirm] = useState(false);
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [reportDoneId, setReportDoneId] = useState<string | null>(null);
    const lastReportRef = useRef(0);

    // 🆕🆕 NEW: recent callers picker (reportedUserId correct-a save aaga)
    const [recentUsers, setRecentUsers] = useState<any[]>([]);
    const [pickedUser, setPickedUser] = useState<{ id: string; name: string } | null>(null);

    // 🆕🆕 NEW: host anuppina reports-oda live status (MY REPORTS)
    const [myReports, setMyReports] = useState<any[]>([]);

    // 🔥 ANIMATION REFS
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const spinAnim = useRef(new Animated.Value(0)).current;      // rotating rings (loader + contact icons)
    const sweepAnim = useRef(new Animated.Value(0)).current;     // light sweep over cards
    const bobAnim = useRef(new Animated.Value(0)).current;       // chevron bob on contact cards
    const sectionAnims = useRef(Array.from({ length: 6 }, () => new Animated.Value(0))).current; // staggered 3D entrance

    useEffect(() => {
        const l1 = Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: 4000,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true
            })
        );
        const l2 = Animated.loop(
            Animated.timing(spinAnim, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: true })
        );
        const l3 = Animated.loop(
            Animated.sequence([
                Animated.delay(1400),
                Animated.timing(sweepAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(sweepAnim, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        );
        const l4 = Animated.loop(
            Animated.sequence([
                Animated.timing(bobAnim, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(bobAnim, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        );
        l1.start(); l2.start(); l3.start(); l4.start();
        return () => { l1.stop(); l2.stop(); l3.stop(); l4.stop(); };
    }, []);

    useEffect(() => {
        if (!user?.uid) {
            setLoading(false);
            return;
        }
        const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                setUserData(snap.data());
            }
            setLoading(false);
        }, (error) => {
            console.log("SupportHub: profile sync detached safely.", error?.code);
            setLoading(false);
        });

        return () => unsub();
    }, [user?.uid]);

    // 🆕🆕 NEW: MY REPORTS live listener (admin status maathina udane host screen-la maarum)
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, "admin_alerts"),
            where("expertId", "==", user.uid),
            where("type", "==", "TRUST_SAFETY_REPORT")
        );
        const unsub = onSnapshot(q, (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
            rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setMyReports(rows.slice(0, 5));
        }, (err) => console.log("My reports listener:", err?.code));
        return () => unsub();
    }, [user?.uid]);

    // ✨ staggered 3D entrance starts once the content is actually visible
    useEffect(() => {
        if (loading) return;
        Animated.stagger(
            110,
            sectionAnims.map((a) =>
                Animated.timing(a, { toValue: 1, duration: 720, easing: Easing.out(Easing.cubic), useNativeDriver: true })
            )
        ).start();
    }, [loading]);

    // 🔥 AAA DYNAMIC THEME EXTRACTION 🔥
    const themeData = getSmartLevelConfig(userData);
    const primaryColor = themeData.colors[0];
    const secondaryColor = themeData.colors[1] || themeData.colors[2] || primaryColor;
    const tertiaryColor = themeData.colors[2] || secondaryColor;
    const glowColor = themeData.glow !== 'transparent' ? themeData.glow : primaryColor;

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -40]
    });

    // ✨ derived animation styles
    const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const cardSweepX = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-160, CARD_W + 60] });
    const chevronBob = bobAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] });
    const loaderPulse = bobAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.12] });

    // ✨ 3D flip-up reveal
    const reveal = (i: number) => ({
        opacity: sectionAnims[i],
        transform: [
            { perspective: 1000 },
            { translateY: sectionAnims[i].interpolate({ inputRange: [0, 1], outputRange: [46, 0] }) },
            { rotateX: sectionAnims[i].interpolate({ inputRange: [0, 1], outputRange: ['28deg', '0deg'] }) }
        ]
    });

    // 🔥 ALTERNATING DUAL-TONE BORDERS (same language as Wallet / Dashboard)
    const borderType1 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: primaryColor,
        borderRightColor: primaryColor,
        borderTopColor: tertiaryColor + '80',
        borderBottomColor: tertiaryColor + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    const borderType2 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: tertiaryColor,
        borderRightColor: tertiaryColor,
        borderTopColor: primaryColor + '80',
        borderBottomColor: primaryColor + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    const toggleExpand = (id: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(expandedId === id ? null : id);
    };

    // 🔥 SUPPORT EMAIL ACTIONS (mail app illana crash aagaama email address kaattum)
    const openMail = (url: string) => {
        Linking.openURL(url).catch(() => {
            Alert.alert("Email app not found", `Please write to us at ${SUPPORT_EMAIL}`);
        });
    };

    const handleEmailSupport = () => {
        openMail('mailto:support@talkpepro.com?subject=TalkPe%20Pro%20Consultant%20General%20Support');
    };

    // 🆕 TRUST & SAFETY: ippo mail illa, in-app secure report form thirakkum
    const handleTrustSafetyReport = () => {
        setReportDoneId(null);
        setReportVisible(true);
        loadRecentUsers();
    };

    // 🆕🆕 NEW: recent callers (yaar kooda pesunaangalo avanga list)
    const loadRecentUsers = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        try {
            const snap = await getDocs(query(collection(db, "calls"), where("expertId", "==", uid), limit(40)));
            const rows = snap.docs.map((d) => {
                const c: any = d.data();
                const t = c.endedAt || c.createdAt;
                const ms = t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : typeof t === 'number' ? t : 0;
                return { id: c.callerId, name: c.callerName || 'User', ms };
            }).filter((r) => !!r.id);
            rows.sort((a, b) => b.ms - a.ms);
            const seen = new Set<string>();
            const unique: any[] = [];
            for (const r of rows) {
                if (!seen.has(r.id)) { seen.add(r.id); unique.push(r); }
                if (unique.length >= 8) break;
            }
            setRecentUsers(unique);
        } catch (e) {
            console.log("Recent users error:", e);
        }
    };

    const closeReport = () => {
        if (reportSubmitting) return;
        setReportVisible(false);
        // reset form (success screen-la irundhu moodina piragu fresh-a irukkum)
        setTimeout(() => {
            setReportCategory('');
            setReportedUser('');
            setReportDesc('');
            setReportConfirm(false);
            setReportDoneId(null);
            setPickedUser(null);
            setRecentUsers([]);
        }, 250);
    };

    // 🆕 SUBMIT REPORT -> Firestore admin_alerts (admin panel-la 'unread' aa theriyum)
    const submitReport = async () => {
        if (reportSubmitting) return;
        const currentUser = auth.currentUser;
        if (!currentUser) {
            Alert.alert("Sign-in Required", "Please sign in again to submit a report.");
            return;
        }
        if (!reportCategory) {
            Alert.alert("Select a Category", "Please choose what your report is about.");
            return;
        }
        const desc = reportDesc.trim();
        if (desc.length < MIN_DESC) {
            Alert.alert("More Details Needed", `Please describe the concern in at least ${MIN_DESC} characters so our team can review it properly.`);
            return;
        }
        if (!reportConfirm) {
            Alert.alert("Confirmation Required", "Please confirm that the information you are submitting is genuine.");
            return;
        }
        const now = Date.now();
        if (now - lastReportRef.current < REPORT_COOLDOWN_MS) {
            Alert.alert("Please Wait", "You have just submitted a report. Please wait a minute before sending another one.");
            return;
        }

        setReportSubmitting(true);
        try {
            const catLabel = REPORT_CATEGORIES.find((c) => c.key === reportCategory)?.label || reportCategory;
            const ref = await addDoc(collection(db, "admin_alerts"), {
                type: 'TRUST_SAFETY_REPORT',
                source: 'support_hub',
                expertId: currentUser.uid,
                expertName: userData?.name || "Host",
                category: reportCategory,
                categoryLabel: catLabel,
                reportedUser: reportedUser.trim(),
                reportedUserId: pickedUser?.id || null,
                reportedUserName: pickedUser?.name || reportedUser.trim() || null,
                description: desc,
                status: 'unread',
                priority: reportCategory === 'threat' ? 'high' : 'normal',
                timestamp: serverTimestamp(),
                createdAt: Date.now()
            });
            lastReportRef.current = Date.now();
            setReportDoneId(ref.id.slice(0, 8).toUpperCase());
        } catch (e) {
            console.log("Report submit error:", e);
            Alert.alert("Could Not Submit", `Something went wrong. Please check your connection and try again, or write to ${SUPPORT_EMAIL}.`);
        } finally {
            setReportSubmitting(false);
        }
    };

    // 🚀 PREMIUM LOADER (spinning gradient ring + pulsing icon)
    if (loading) {
        return (
            <View style={styles.loader}>
                <LinearGradient colors={['#020617', '#0B1B2E', '#020617']} style={StyleSheet.absoluteFill} />
                <Animated.View style={[styles.shimmerOrb, { top: 120, right: -80, backgroundColor: '#10B981', transform: [{ translateY: orbTranslateY }] }]} />
                <Animated.View style={[styles.shimmerOrb, { bottom: 80, left: -100, backgroundColor: '#6366F1', transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />
                <View style={styles.loaderRingWrap}>
                    <View style={styles.loaderRingClip}>
                        <Animated.View style={{ width: 200, height: 200, transform: [{ rotate: spin }] }}>
                            <LinearGradient colors={['#10B981', 'transparent', '#6366F1', 'transparent', '#10B981']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
                        </Animated.View>
                    </View>
                    <View style={styles.loaderRingInner}>
                        <Animated.View style={{ transform: [{ scale: loaderPulse }] }}>
                            <MaterialCommunityIcons name="headset" size={38} color="#FFF" />
                        </Animated.View>
                    </View>
                </View>
                <ActivityIndicator size="large" color="#10B981" style={{ marginTop: 22 }} />
                <Text style={styles.loaderText}>OPENING SUPPORT HUB...</Text>
            </View>
        );
    }

    const descLen = reportDesc.trim().length;
    const descOk = descLen >= MIN_DESC;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* 🔥 DYNAMIC BACKGROUND WITH 3 COLORS 🔥 */}
            <LinearGradient colors={[`${primaryColor}30`, '#020617', '#000000']} style={StyleSheet.absoluteFill} />
            <Animated.View pointerEvents="none" style={[styles.shimmerOrb, { top: 80, right: -60, backgroundColor: primaryColor, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View pointerEvents="none" style={[styles.shimmerOrb, { top: 450, left: -90, backgroundColor: tertiaryColor, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            {/* 🛡️ HEADER */}
            <Animated.View style={[styles.header, reveal(0)]}>
                <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: primaryColor + '40' }]}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.headerTitle, { textShadowColor: glowColor, textShadowRadius: 10 }]}>Support Hub</Text>
                    <Text style={[styles.headerSub, { color: primaryColor }]}>TalkPe Pro Command Center</Text>
                </View>
                <LinearGradient colors={[primaryColor, tertiaryColor] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.levelPill}>
                    <MaterialCommunityIcons name="crown" size={13} color="#FFF" />
                    <Text style={styles.levelPillText}>{themeData.label}</Text>
                </LinearGradient>
            </Animated.View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60, paddingHorizontal: 20 }}>

                {/* 🎁 HERO CARD (3D tilt + floating orb + image) */}
                <Animated.View style={[styles.contactContainer, reveal(1)]}>
                    <Tilt3D radius={30} max={8} style={{ borderRadius: 30 }}>
                        <View style={[styles.heroCard, { shadowColor: primaryColor }]}>
                            <Image source={{ uri: HERO_BG }} style={styles.heroBgImage} />
                            <LinearGradient
                                colors={[primaryColor + 'CC', '#020617E6', tertiaryColor + 'AA'] as const}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.heroGlow} />
                            <View style={[styles.heroRingOne, { borderColor: glowColor + '40' }]} />
                            <View style={[styles.heroRingTwo, { borderColor: primaryColor + '35' }]} />
                            <Animated.View pointerEvents="none" style={[styles.cardSweep, { transform: [{ translateX: cardSweepX }, { skewX: '-20deg' }] }]} />

                            <FloatingDot delay={0}    left={CARD_W * 0.10} size={5} color="#FFF"         duration={4200} />
                            <FloatingDot delay={1100} left={CARD_W * 0.34} size={4} color={glowColor}   duration={3800} />
                            <FloatingDot delay={600}  left={CARD_W * 0.58} size={6} color="#FFF"         duration={4600} />
                            <FloatingDot delay={1800} left={CARD_W * 0.84} size={4} color={primaryColor} duration={4000} />

                            <View style={styles.heroRow}>
                                <View style={{ flex: 1, paddingRight: 8 }}>
                                    <Text style={[styles.sectionTitle, { color: '#FFF' }]}>24/7 COMMAND RESOLUTION</Text>
                                    <Text style={styles.heroTitle}>How can we help you today?</Text>
                                    <Text style={styles.sectionDesc}>Our dedicated administrator team is strictly monitoring platform integrity and is ready to assist you.</Text>
                                </View>
                                <Orb3D c1={primaryColor} c2={tertiaryColor}>
                                    <MaterialCommunityIcons name="headset" size={34} color="#FFF" />
                                </Orb3D>
                            </View>
                        </View>
                    </Tilt3D>
                </Animated.View>

                {/* 📜 QUICK FACTS STRIP (numbers come straight from the FAQ rules below) */}
                <Animated.View style={[styles.rulesRow, reveal(2)]}>
                    <View style={[styles.ruleTile, borderType2]}>
                        <Ionicons name="flash-outline" size={18} color={primaryColor} />
                        <Text style={styles.ruleValue}>₹500</Text>
                        <Text style={styles.ruleLabel}>MIN REDEEM</Text>
                    </View>
                    <View style={[styles.ruleTile, borderType1]}>
                        <Ionicons name="time-outline" size={18} color={primaryColor} />
                        <Text style={styles.ruleValue}>5-7 DAYS</Text>
                        <Text style={styles.ruleLabel}>PAYOUT REVIEW</Text>
                    </View>
                    <View style={[styles.ruleTile, borderType2]}>
                        <Ionicons name="shield-checkmark-outline" size={18} color={primaryColor} />
                        <Text style={styles.ruleValue}>24 HR</Text>
                        <Text style={styles.ruleLabel}>SAFETY REVIEW</Text>
                    </View>
                </Animated.View>

                {/* 🚀 PREMIUM CONTACT CARDS */}
                <Animated.View style={[styles.contactSection, reveal(3)]}>
                    <View style={styles.actionColumn}>

                        {/* 🌟 BIG GENERAL SUPPORT BUTTON */}
                        <Tilt3D radius={26} max={7} style={styles.actionCardWrapper}>
                            <ScaleBtn onPress={handleEmailSupport} style={[styles.actionCardBig, { borderColor: secondaryColor + '55' }]}>
                                <Image source={{ uri: CONTACT_BG }} style={styles.cardBgImage} />
                                <LinearGradient colors={['rgba(15, 23, 42, 0.9)', 'rgba(2, 6, 23, 1)'] as const} style={StyleSheet.absoluteFill} />
                                <LinearGradient colors={[secondaryColor + '30', 'transparent'] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                                <Animated.View pointerEvents="none" style={[styles.cardSweep, { transform: [{ translateX: cardSweepX }, { skewX: '-20deg' }] }]} />
                                <RingIcon spin={spin} color={secondaryColor}>
                                    <MaterialCommunityIcons name="email-fast-outline" size={30} color={secondaryColor} />
                                </RingIcon>
                                <View style={styles.actionTextContent}>
                                    <Text style={styles.actionTitleBig}>General Support</Text>
                                    <Text style={styles.actionSubBig}>Payouts, Profile Issues & Guidance</Text>
                                    <Text style={[styles.actionEmailHighlight, { color: secondaryColor }]}>support@talkpepro.com</Text>
                                </View>
                                <Animated.View style={{ transform: [{ translateX: chevronBob }] }}>
                                    <Ionicons name="chevron-forward" size={24} color={secondaryColor} style={styles.forwardIcon} />
                                </Animated.View>
                            </ScaleBtn>
                        </Tilt3D>

                        {/* 🚨 TRUST & SAFETY DESK (🆕 ippo in-app secure report form thirakkum) */}
                        <Tilt3D radius={26} max={7} style={styles.actionCardWrapper}>
                            <ScaleBtn onPress={handleTrustSafetyReport} style={[styles.actionCardBig, { borderColor: REPORT_COLOR + '40' }]}>
                                <Image source={{ uri: CONTACT_BG }} style={styles.cardBgImage} />
                                <LinearGradient colors={['rgba(15, 23, 42, 0.9)', 'rgba(2, 6, 23, 1)'] as const} style={StyleSheet.absoluteFill} />
                                <LinearGradient colors={[REPORT_COLOR + '30', 'transparent'] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                                <Animated.View pointerEvents="none" style={[styles.cardSweep, { transform: [{ translateX: cardSweepX }, { skewX: '-20deg' }] }]} />
                                <RingIcon spin={spin} color={REPORT_COLOR}>
                                    <MaterialCommunityIcons name="shield-alert-outline" size={30} color={REPORT_COLOR} />
                                </RingIcon>
                                <View style={styles.actionTextContent}>
                                    <Text style={[styles.actionTitleBig, { color: '#FFF' }]}>Trust & Safety Desk</Text>
                                    <Text style={styles.actionSubBig}>Report a user or safety concern securely</Text>
                                    <Text style={[styles.actionEmailHighlight, { color: REPORT_COLOR }]}>In-App Report • Reviewed in 24 Hrs</Text>
                                </View>
                                <Animated.View style={{ transform: [{ translateX: chevronBob }] }}>
                                    <Ionicons name="chevron-forward" size={24} color={REPORT_COLOR} style={styles.forwardIcon} />
                                </Animated.View>
                            </ScaleBtn>
                        </Tilt3D>

                    </View>
                </Animated.View>

                {/* 🆕🆕 NEW: MY REPORTS (host anuppina reports-oda live status) */}
                {myReports.length > 0 && (
                    <View style={styles.myReportsBox}>
                        <View style={styles.myReportsHead}>
                            <MaterialCommunityIcons name="clipboard-text-clock-outline" size={22} color={REPORT_COLOR} />
                            <Text style={styles.myReportsTitle}>MY REPORTS</Text>
                        </View>
                        {myReports.map((r) => {
                            const st = r.status || 'unread';
                            // 🔧 TS FIX: typed map (REPORT_STATUS_META) use pannrom - inline object-a 'any' key-la index panna error vandhudhu
                            const meta = REPORT_STATUS_META[st] || REPORT_STATUS_META.unread;
                            return (
                                <View key={r.id} style={[styles.myReportRow, { borderColor: meta.color + '55' }]}>
                                    <View style={[styles.myReportIcon, { backgroundColor: meta.color + '22' }]}>
                                        <MaterialCommunityIcons name={meta.icon} size={20} color={meta.color} />
                                    </View>
                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                        <Text style={styles.myReportCat} numberOfLines={1}>{r.categoryLabel || 'Report'}</Text>
                                        <Text style={styles.myReportNote}>{meta.note}</Text>
                                        <Text style={styles.myReportRef}>Ref {String(r.id).slice(0, 8).toUpperCase()}</Text>
                                    </View>
                                    <View style={[styles.myReportChip, { backgroundColor: meta.color + '22', borderColor: meta.color + '88' }]}>
                                        <Text style={[styles.myReportChipText, { color: meta.color }]}>{meta.label}</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

                {/* 📖 FAQ SECTION - PREMIUM UPGRADE */}
                <Animated.View style={[styles.faqContainer, reveal(4)]}>
                    <View style={styles.faqHeaderRow}>
                        <MaterialCommunityIcons name="frequently-asked-questions" size={26} color={primaryColor} />
                        <Text style={[styles.sectionTitle, { color: primaryColor, marginBottom: 0, fontSize: 14, flex: 1 }]}>KNOWLEDGE BASE</Text>
                        <View style={[styles.faqCountPill, { borderColor: primaryColor + '55', backgroundColor: primaryColor + '15' }]}>
                            <Text style={[styles.faqCountText, { color: primaryColor }]}>{FAQS.length} ANSWERS</Text>
                        </View>
                    </View>

                    {FAQS.map((faq, index) => (
                        <FaqItem
                            key={faq.id}
                            faq={faq}
                            index={index}
                            isExpanded={expandedId === faq.id}
                            onToggle={toggleExpand}
                            primaryColor={primaryColor}
                            secondaryColor={tertiaryColor}
                        />
                    ))}
                </Animated.View>

                {/* 🔥 SECURITY BADGE - BIGGER, WITH 3D SHIELD */}
                <Animated.View style={reveal(5)}>
                    <View style={[styles.securityBadge, { borderColor: secondaryColor + '50', backgroundColor: secondaryColor + '10' }]}>
                        <Image source={{ uri: SECURITY_BG }} style={styles.securityBgImage} />
                        <LinearGradient colors={['rgba(2,6,23,0.55)', 'rgba(2,6,23,0.92)'] as const} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                        <Orb3D c1={secondaryColor} c2={primaryColor}>
                            <MaterialCommunityIcons name="shield-lock-outline" size={32} color="#FFF" />
                        </Orb3D>
                        <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text style={[styles.securityTitle, { color: secondaryColor }]}>PLATFORM SECURITY PROTOCOL</Text>
                            <Text style={styles.securityDesc}>Never share your OTP, Passwords, or Banking details with anyone. Admins will NEVER ask for your PIN. Avoid all off-platform transactions to prevent permanent bans.</Text>
                        </View>
                    </View>
                </Animated.View>

            </ScrollView>

            {/* 🛡️ TRUST & SAFETY REPORT FORM (🆕) */}
            <Modal visible={reportVisible} animationType="slide" transparent={true} onRequestClose={closeReport}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.reportOverlay}>
                    <ScrollView
                        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingVertical: 40, paddingHorizontal: 18 }}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <Enter>
                            <GlowCard colors={[REPORT_COLOR, REPORT_COLOR + '22', primaryColor + 'AA']} radius={34} glow={REPORT_COLOR}>
                                <View style={styles.reportPad}>
                                    <LinearGradient colors={[REPORT_COLOR + '2E', 'transparent', primaryColor + '22']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                    <Sparkle x={width * 0.5} y={12} size={12} color={REPORT_COLOR} delay={0} />
                                    <Sparkle x={width * 0.72} y={80} size={10} color="#F5C84C" delay={700} />
                                    <Sparkle x={20} y={96} size={9} color={primaryColor} delay={1200} />

                                    {reportDoneId ? (
                                        /* ✅ SUCCESS VIEW */
                                        <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                                            <SuccessTick color="#10B981" />
                                            <Text style={styles.doneTitle}>Report Submitted</Text>
                                            <Text style={styles.doneSub}>Thank you for helping keep TalkPe Pro safe. Our Trust & Safety team will review your report within 24 hours.</Text>
                                            <View style={styles.refChip}>
                                                <MaterialCommunityIcons name="pound" size={14} color="#10B981" />
                                                <Text style={styles.refChipText}>REFERENCE: {reportDoneId}</Text>
                                            </View>
                                            <Text style={styles.doneNote}>If you are in immediate danger, please contact your local emergency services (India: 112).</Text>
                                            <View style={{ height: 18, alignSelf: 'stretch' }} />
                                            <View style={{ alignSelf: 'stretch' }}>
                                                <SweepBtn colors={['#10B981', primaryColor]} onPress={closeReport} label="DONE" icon="check-decagram" />
                                            </View>
                                        </View>
                                    ) : (
                                        <>
                                            {/* header */}
                                            <View style={styles.reportHeadRow}>
                                                <View style={styles.reportImgBox}>
                                                    <View style={[styles.reportImgGlow, { backgroundColor: REPORT_COLOR }]} />
                                                    <FloatBox amp={6} dur={1700}>
                                                        <Img3D uri={IMG3D.shield} size={74} fallback="shield-alert" color={REPORT_COLOR} />
                                                    </FloatBox>
                                                </View>
                                                <View style={{ flex: 1, marginLeft: 12 }}>
                                                    <Text style={styles.reportTitle}>Report a Concern</Text>
                                                    <Text style={styles.reportSub}>Confidential • Reviewed within 24 hours</Text>
                                                </View>
                                                <TouchableOpacity onPress={closeReport} style={styles.reportCloseBtn} activeOpacity={0.8}>
                                                    <Ionicons name="close" size={20} color="#FFF" />
                                                </TouchableOpacity>
                                            </View>

                                            {/* safety info */}
                                            <View style={styles.infoBox}>
                                                <Ionicons name="lock-closed" size={14} color="#10B981" />
                                                <Text style={styles.infoBoxText}>Your report goes directly to our Trust & Safety team and is handled confidentially. Please do not include passwords, OTPs or banking details.</Text>
                                            </View>

                                            {/* 1. category */}
                                            <View style={styles.rSectionRow}>
                                                <LinearGradient colors={[REPORT_COLOR, REPORT_COLOR + '66']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rSectionIcon}>
                                                    <MaterialCommunityIcons name="format-list-bulleted" size={14} color="#0B1026" />
                                                </LinearGradient>
                                                <Text style={[styles.rSectionText, { color: lighten(REPORT_COLOR, 0.55) }]}>WHAT HAPPENED?</Text>
                                                <LinearGradient colors={[REPORT_COLOR + '88', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.rSectionLine} />
                                            </View>
                                            <View style={styles.catWrap}>
                                                {REPORT_CATEGORIES.map((c) => (
                                                    <CatChip
                                                        key={c.key}
                                                        label={c.label}
                                                        icon={c.icon}
                                                        selected={reportCategory === c.key}
                                                        color={REPORT_COLOR}
                                                        onPress={() => setReportCategory(c.key)}
                                                    />
                                                ))}
                                            </View>

                                            {/* 2. reported user */}
                                            <View style={styles.rSectionRow}>
                                                <LinearGradient colors={[primaryColor, primaryColor + '66']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rSectionIcon}>
                                                    <MaterialCommunityIcons name="account-search-outline" size={14} color="#0B1026" />
                                                </LinearGradient>
                                                <Text style={[styles.rSectionText, { color: lighten(primaryColor, 0.55) }]}>USER DETAILS (OPTIONAL)</Text>
                                                <LinearGradient colors={[primaryColor + '88', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.rSectionLine} />
                                            </View>

                                            {/* 🆕🆕 NEW: recent contacts picker */}
                                            {recentUsers.length > 0 && (
                                                <>
                                                    <Text style={styles.pickLabel}>RECENT CONTACTS (TAP TO SELECT)</Text>
                                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }} keyboardShouldPersistTaps="handled">
                                                        {recentUsers.map((u) => {
                                                            const sel = pickedUser?.id === u.id;
                                                            return (
                                                                <TouchableOpacity
                                                                    key={u.id}
                                                                    activeOpacity={0.8}
                                                                    onPress={() => {
                                                                        if (sel) { setPickedUser(null); }
                                                                        else { setPickedUser({ id: u.id, name: u.name }); setReportedUser(u.name); }
                                                                    }}
                                                                    style={[styles.userPick, sel && { borderColor: primaryColor, backgroundColor: primaryColor + '30' }]}
                                                                >
                                                                    <Ionicons name={sel ? 'checkmark-circle' : 'person-circle-outline'} size={16} color={sel ? '#FFF' : '#94A3B8'} />
                                                                    <Text style={[styles.userPickText, sel && { color: '#FFF' }]} numberOfLines={1}>{u.name}</Text>
                                                                </TouchableOpacity>
                                                            );
                                                        })}
                                                    </ScrollView>
                                                </>
                                            )}

                                            <GlowField
                                                icon="person-outline"
                                                color={primaryColor}
                                                value={reportedUser}
                                                onChangeText={(t: string) => {
                                                    setReportedUser(t);
                                                    // picked user-oda name-a maathi type pannina, thappana ID save aagaama pick-a clear pannidum
                                                    if (pickedUser && t.trim() !== pickedUser.name) setPickedUser(null);
                                                }}
                                                maxLength={60}
                                                placeholder="User name or ID (if known)"
                                                placeholderTextColor="#64748B"
                                            />

                                            {/* 3. description */}
                                            <View style={styles.rSectionRow}>
                                                <LinearGradient colors={[tertiaryColor, tertiaryColor + '66']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rSectionIcon}>
                                                    <MaterialCommunityIcons name="text-box-edit-outline" size={14} color="#0B1026" />
                                                </LinearGradient>
                                                <Text style={[styles.rSectionText, { color: lighten(tertiaryColor, 0.55) }]}>DESCRIBE THE CONCERN</Text>
                                                <LinearGradient colors={[tertiaryColor + '88', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.rSectionLine} />
                                                <Text style={[styles.counterText, { color: descOk ? '#10B981' : '#94A3B8' }]}>{descLen}/{MAX_DESC}</Text>
                                            </View>
                                            <GlowField
                                                color={tertiaryColor}
                                                multiline
                                                value={reportDesc}
                                                onChangeText={setReportDesc}
                                                maxLength={MAX_DESC}
                                                placeholder="Please explain what happened, when it happened and any other helpful details..."
                                                placeholderTextColor="#64748B"
                                                style={{ height: 130, borderRadius: 24, marginBottom: 6 }}
                                            />
                                            <View style={styles.minHintRow}>
                                                <Ionicons name={descOk ? 'checkmark-circle' : 'information-circle-outline'} size={13} color={descOk ? '#10B981' : '#94A3B8'} />
                                                <Text style={[styles.minHintText, { color: descOk ? '#10B981' : '#94A3B8' }]}>
                                                    {descOk ? 'Looks good. Thank you for the details.' : `Minimum ${MIN_DESC} characters`}
                                                </Text>
                                            </View>

                                            {/* 4. confirmation */}
                                            <TouchableOpacity activeOpacity={0.8} onPress={() => setReportConfirm(!reportConfirm)} style={[styles.confirmRow, reportConfirm && { borderColor: '#10B981' + '88', backgroundColor: '#10B98112' }]}>
                                                <View style={[styles.checkBox, reportConfirm && { backgroundColor: '#10B981', borderColor: '#10B981' }]}>
                                                    {reportConfirm && <Ionicons name="checkmark" size={14} color="#FFF" />}
                                                </View>
                                                <Text style={styles.confirmText}>I confirm that this report is genuine and made in good faith. I understand that false or abusive reports may lead to action on my account.</Text>
                                            </TouchableOpacity>

                                            <View style={{ height: 16 }} />
                                            <SweepBtn
                                                colors={[REPORT_COLOR, primaryColor]}
                                                onPress={submitReport}
                                                disabled={reportSubmitting}
                                                loading={reportSubmitting}
                                                label="SUBMIT REPORT"
                                                icon="send-check"
                                            />

                                            <View style={styles.emergencyRow}>
                                                <MaterialCommunityIcons name="phone-alert-outline" size={13} color="#94A3B8" />
                                                <Text style={styles.emergencyText}>In an emergency, contact local emergency services (India: 112).</Text>
                                            </View>

                                            <TouchableOpacity onPress={() => { closeReport(); handleEmailSupport(); }} style={{ marginTop: 12, alignItems: 'center' }} activeOpacity={0.7}>
                                                <Text style={styles.altMailText}>Prefer email? Write to {SUPPORT_EMAIL}</Text>
                                            </TouchableOpacity>
                                        </>
                                    )}
                                </View>
                            </GlowCard>
                        </Enter>
                    </ScrollView>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    loaderText: { color: '#10B981', marginTop: 12, fontSize: 10, fontWeight: '900', letterSpacing: 3 },
    loaderRingWrap: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center' },
    loaderRingClip: { width: 140, height: 140, borderRadius: 70, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    loaderRingInner: { position: 'absolute', width: 124, height: 124, borderRadius: 62, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
    shimmerOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.15, filter: 'blur(90px)' },

    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, gap: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { width: 50, height: 50, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    headerTitle: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: 0.5 },
    headerSub: { fontSize: 13, fontWeight: '800', letterSpacing: 1 },
    levelPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
    levelPillText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },

    // 🎁 HERO
    contactContainer: { marginTop: 15, marginBottom: 10 },
    heroCard: { width: CARD_W, minHeight: 210, borderRadius: 30, padding: 22, overflow: 'hidden', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)', backgroundColor: '#0F172A', elevation: 18, shadowOpacity: 0.55, shadowRadius: 22, shadowOffset: { width: 0, height: 12 } },
    heroBgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.45 },
    heroGlow: { position: 'absolute', top: -100, left: -100, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,255,255,0.1)' },
    heroRingOne: { position: 'absolute', right: -60, bottom: -70, width: 210, height: 210, borderRadius: 105, borderWidth: 1.5 },
    heroRingTwo: { position: 'absolute', right: -20, bottom: -30, width: 130, height: 130, borderRadius: 65, borderWidth: 1.5 },
    heroRow: { flexDirection: 'row', alignItems: 'center' },
    heroTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.3, marginBottom: 8, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
    cardSweep: { position: 'absolute', top: -30, bottom: -30, width: 70, backgroundColor: 'rgba(255,255,255,0.14)' },
    glareStrip: { position: 'absolute', top: -40, bottom: -40, width: 90, backgroundColor: 'rgba(255,255,255,0.12)' },

    sectionTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1.5, marginBottom: 6 },
    sectionDesc: { color: 'rgba(226,232,240,0.85)', fontSize: 13, fontWeight: '600', lineHeight: 20 },

    // 3D ORB
    orbWrap: { width: 84, height: 84, justifyContent: 'center', alignItems: 'center' },
    orbRing: { position: 'absolute', width: 56, height: 56, borderRadius: 28, borderWidth: 1.5 },
    orbCore: { width: 62, height: 62, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.35)' },

    // 📜 QUICK FACTS
    rulesRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
    ruleTile: { flex: 1, borderRadius: 22, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    ruleValue: { color: '#FFF', fontSize: 14, fontWeight: '900', marginTop: 6 },
    ruleLabel: { color: '#64748B', fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 3 },

    contactSection: { marginBottom: 10 },
    actionColumn: { gap: 15, marginBottom: 35 },
    actionCardWrapper: { borderRadius: 26, elevation: 12, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },

    // NEW BIGGER CARD DESIGN
    actionCardBig: { flexDirection: 'row', padding: 22, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', borderRadius: 26, overflow: 'hidden', backgroundColor: '#020617' },
    cardBgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.18 },
    actionTextContent: { flex: 1, justifyContent: 'center' },
    actionTitleBig: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5 },
    actionSubBig: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 6 },
    actionEmailHighlight: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    forwardIcon: { marginLeft: 10, opacity: 0.8 },

    // ROTATING RING ICON
    ringWrap: { width: 70, height: 70, justifyContent: 'center', alignItems: 'center', marginRight: 18 },
    ringClip: { width: 70, height: 70, borderRadius: 35, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    ringInner: { position: 'absolute', width: 58, height: 58, borderRadius: 29, backgroundColor: '#050B1C', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },

    // 🆕🆕 NEW: MY REPORTS styles
    myReportsBox: { marginTop: 6, marginBottom: 26, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(15,23,42,0.6)' },
    myReportsHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    myReportsTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
    myReportRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 18, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.25)', marginBottom: 10 },
    myReportIcon: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    myReportCat: { color: '#FFF', fontSize: 13.5, fontWeight: '900' },
    myReportNote: { color: '#94A3B8', fontSize: 11, fontWeight: '600', marginTop: 3 },
    myReportRef: { color: '#64748B', fontSize: 9.5, fontWeight: '800', letterSpacing: 1, marginTop: 3 },
    myReportChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, marginLeft: 8 },
    myReportChipText: { fontSize: 8.5, fontWeight: '900', letterSpacing: 1 },

    faqContainer: { marginTop: 10 },
    faqHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 25 },
    faqCountPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1 },
    faqCountText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    faqItem: { borderRadius: 20, marginBottom: 16, borderWidth: 1, overflow: 'hidden' },
    faqAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
    faqQuestionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22, paddingLeft: 20 },
    faqNumBadge: { width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
    faqNumText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    faqQuestion: { fontSize: 15, fontWeight: '800', flex: 1, paddingRight: 15, lineHeight: 22 },
    faqIconContainer: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
    faqAnswerBox: { paddingHorizontal: 22, paddingBottom: 22, paddingTop: 5, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
    faqAnswer: { color: '#94A3B8', fontSize: 14, fontWeight: '600', lineHeight: 24 },

    securityBadge: { flexDirection: 'row', alignItems: 'center', padding: 22, paddingLeft: 14, borderRadius: 24, borderWidth: 1, marginTop: 40, overflow: 'hidden' },
    securityBgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.35 },
    securityTitle: { fontSize: 12, fontWeight: '900', letterSpacing: 1.2, marginBottom: 6 },
    securityDesc: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600', lineHeight: 18 },

    // ================= 🆕 REPORT FORM STYLES =================
    reportOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)' },
    reportPad: { padding: 20 },
    reportHeadRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    reportImgBox: { width: 84, height: 84, justifyContent: 'center', alignItems: 'center' },
    reportImgGlow: { position: 'absolute', width: 56, height: 56, borderRadius: 28, opacity: 0.35 },
    reportTitle: { color: '#FFF', fontSize: 21, fontWeight: '900', letterSpacing: 0.4 },
    reportSub: { color: '#94A3B8', fontSize: 10.5, fontWeight: '700', marginTop: 4, letterSpacing: 0.5 },
    reportCloseBtn: { width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 16, backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.3)' },
    infoBoxText: { flex: 1, color: '#CBD5E1', fontSize: 11, fontWeight: '600', lineHeight: 17 },

    rSectionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 12 },
    rSectionIcon: { width: 26, height: 26, borderRadius: 9, justifyContent: 'center', alignItems: 'center' },
    rSectionText: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    rSectionLine: { flex: 1, height: 1.5, borderRadius: 1 },
    counterText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },

    catWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 18, borderWidth: 1, overflow: 'hidden', backgroundColor: 'rgba(30,41,59,0.7)' },
    catChipText: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },

    // 🆕🆕 NEW: recent contacts picker styles
    pickLabel: { color: '#64748B', fontSize: 9.5, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
    userPick: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)', backgroundColor: 'rgba(255,255,255,0.05)', maxWidth: 160 },
    userPickText: { color: '#94A3B8', fontSize: 11.5, fontWeight: '800', flexShrink: 1 },

    fieldWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 12, height: 56, marginBottom: 12, borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.35)' },
    fieldIcon: { width: 30, height: 30, borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    fieldInput: { flex: 1, color: '#FFF', fontSize: 14, fontWeight: '700' },

    minHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
    minHintText: { fontSize: 11, fontWeight: '800' },

    confirmRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.04)' },
    checkBox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', justifyContent: 'center', alignItems: 'center', marginTop: 1 },
    confirmText: { flex: 1, color: '#CBD5E1', fontSize: 11.5, fontWeight: '600', lineHeight: 18 },

    sweepBtnOuter: { borderRadius: 30, overflow: 'hidden', elevation: 14, shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 7 } },
    sweepBtnGrad: { paddingVertical: 19, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, overflow: 'hidden' },
    sweepBtnGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 22 },
    sweepBtnSweep: { position: 'absolute', top: -30, bottom: -30, width: 70 },
    sweepBtnText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 2.5 },

    emergencyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 16 },
    emergencyText: { color: '#94A3B8', fontSize: 10.5, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
    altMailText: { color: '#64748B', fontSize: 11, fontWeight: '700', textDecorationLine: 'underline' },

    // success
    tickWrap: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    tickRing: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 2 },
    doneTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.5, marginTop: 4 },
    doneSub: { color: '#CBD5E1', fontSize: 13, fontWeight: '600', lineHeight: 21, textAlign: 'center', marginTop: 10, paddingHorizontal: 6 },
    refChip: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 16, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.14)', borderWidth: 1, borderColor: 'rgba(16,185,129,0.35)' },
    refChipText: { color: '#10B981', fontSize: 11.5, fontWeight: '900', letterSpacing: 1.2 },
    doneNote: { color: '#94A3B8', fontSize: 11, fontWeight: '600', textAlign: 'center', marginTop: 14, lineHeight: 17 }
});
