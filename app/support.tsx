import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, getDocs, limit, onSnapshot, query, serverTimestamp, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    ImageBackground,
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
    UIManager,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

// 🛠️ Android: enable LayoutAnimation so FAQ expand/collapse animates smoothly
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// 🖼️ PREMIUM IMAGE ASSETS (replace with your own: require('../assets/xxx.jpg') if you like)
const IMG_HERO = 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=900&q=80';
const IMG_CARD_BG = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80';

// 🆕 3D IMAGES (icons8 3D Fluency) - load aagalana automatic-a icon fallback varum
const IMG3D = {
    shield: 'https://img.icons8.com/3d-fluency/512/shield.png',
    check: 'https://img.icons8.com/3d-fluency/512/ok.png',
};

const SUPPORT_EMAIL = 'support@talkpepro.com';

// ✨ TWINKLING STAR FIELD POSITIONS
const STARS = [
    { top: 70, left: 28, size: 3 }, { top: 140, left: width * 0.82, size: 2 }, { top: 250, left: width * 0.5, size: 3 },
    { top: 360, left: 18, size: 2 }, { top: 470, left: width * 0.9, size: 3 }, { top: 560, left: width * 0.3, size: 2 },
    { top: 680, left: width * 0.7, size: 3 }, { top: 780, left: 40, size: 2 }, { top: 190, left: width * 0.14, size: 2 },
    { top: 610, left: width * 0.58, size: 2 },
];

// 🛡️ SAFE ALPHA HELPER: some tier colors are already 8-digit hex (e.g. '#970d50d4'),
// so adding another alpha creates an INVALID color. This always normalizes first.
const withAlpha = (hex: string, alpha: string = 'FF') => {
    const base = (hex || '#000000').length >= 7 ? hex.slice(0, 7) : hex;
    return base + alpha;
};

// 🆕 color helpers (report form)
const hexToRgb = (hex: string) => {
    const h = (hex || '').replace('#', '');
    if (h.length < 6) return null;
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

// 🆕 REPORT FORM CONFIG (user side - host-a report panna)
const REPORT_COLOR = '#F43F5E';
const REPORT_CATEGORIES = [
    { key: 'harassment', label: 'Harassment / Abuse', icon: 'account-alert-outline' },
    { key: 'inappropriate', label: 'Inappropriate Behavior', icon: 'eye-off-outline' },
    { key: 'scam', label: 'Scam / Off-Platform Payment', icon: 'shield-alert-outline' },
    { key: 'fake_profile', label: 'Fake / Misleading Profile', icon: 'account-question-outline' },
    { key: 'threat', label: 'Threats / Safety Concern', icon: 'alert-octagon-outline' },
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

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT THEME SYNC FROM MEMORY V2)
const calculateUserLevel = (totalSpent: number) => {
  if (totalSpent >= 500000001) return { 
      lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#FF0033', secondaryColor: '#660000', anim: 'titan', themeBg: ['#1A0000', '#000000']
  }; 
  if (totalSpent >= 100000001) return { 
      lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#D946EF', secondaryColor: '#c8040b', anim: 'mythic', themeBg: ['#15001A', '#000000']
  }; 
  if (totalSpent >= 50000000) return { 
      lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#9c77f3', secondaryColor: '#d31515', anim: 'grandmaster', themeBg: ['#08001A', '#000000']
  };
  if (totalSpent >= 10000000) return { 
      lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#970d50d4', anim: 'explosion', themeBg: ['#00101A', '#000000']
  };
  if (totalSpent >= 5000000) return { 
      lvl: 4, label: 'LEGENDARY NODE', status: 'NEBULA COMMANDER', color: '#d0630a', secondaryColor: '#5f0bf0', anim: 'nebula', themeBg: ['#0A001A', '#000000']
  };
  if (totalSpent >= 1000000) return { 
      lvl: 3, label: 'DIAMOND CORE', status: 'NUCLEAR ASSET', color: '#bcde4a', secondaryColor: '#09bbf1fe', anim: 'diamond', themeBg: ['#001A0A', '#000000']
  };
  if (totalSpent >= 200001) return { 
      lvl: 2, label: 'GOLD OPERATIVE', status: 'ROYAL STRIKER', color: '#ffae00', secondaryColor: '#ac4a4a', anim: 'sparkle', themeBg: ['#1A0B00', '#000000']
  };
  return { 
      lvl: 1, label: 'SILVER AGENT', status: 'STAR FAME', color: '#0f33e7', secondaryColor: '#6b0402', anim: 'wave', themeBg: ['#050505', '#000000']
  };
};

// 🆕 STAGGERED ENTRANCE (each block pops in with its own delay + 3D tilt-in)
const FadeInItem = ({ index, children }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(v, { toValue: 1, duration: 650, delay: Math.min(index, 8) * 90, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
    }, []);
    return (
        <Animated.View style={{
            opacity: v,
            transform: [
                { perspective: 900 },
                { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) },
                { rotateX: v.interpolate({ inputRange: [0, 1], outputRange: ['30deg', '0deg'] }) },
                { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.93, 1] }) },
            ],
        }}>
            {children}
        </Animated.View>
    );
};

// 🆕 PREMIUM SUPPORT CARD (glass + glowing strip + icon with orbit ring)
// 🔧 FIX: card pinnaadi vara shadow remove pannitten (shadowColor inline eduthutten)
const SupportCard = ({ icon, title, sub, onPress, color, index, orbitRotate }: any) => (
    <FadeInItem index={index}>
        <TouchableOpacity activeOpacity={0.9} style={styles.card} onPress={onPress}>
            <BlurView intensity={25} tint="dark" style={styles.cardBlur}>
                <LinearGradient 
                    colors={[withAlpha(color, '30'), 'rgba(255,255,255,0.02)']}
                    start={{x:0, y:0}} end={{x:1, y:1}} 
                    style={styles.cardGradient}
                >
                    <LinearGradient
                        pointerEvents="none"
                        colors={[withAlpha(color, 'FF'), withAlpha(color, '00')]}
                        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                        style={styles.cardStrip}
                    />
                    <View style={styles.iconWrap}>
                        <Animated.View style={[styles.iconRing, { borderColor: withAlpha(color, 'AA'), transform: [{ rotate: orbitRotate }] }]} />
                        <View style={[styles.iconContainer, { backgroundColor: color }]}>
                            <Ionicons name={icon} size={28} color="#FFF" />
                        </View>
                    </View>
                    <View style={styles.cardText}>
                        <Text style={styles.cardTitle}>{title}</Text>
                        <Text style={styles.cardSub}>{sub}</Text>
                    </View>
                    <View style={[styles.chevronBox, { borderColor: withAlpha(color, '40') }]}>
                        <Ionicons name="chevron-forward" size={22} color={color} />
                    </View>
                </LinearGradient>
            </BlurView>
        </TouchableOpacity>
    </FadeInItem>
);

// 🆕 TRUST TILE (Play Store friendly safety highlights)
const TrustTile = ({ icon, title, sub, tier, index, pulseScale, pulseOpacity }: any) => (
    <FadeInItem index={index}>
        <BlurView intensity={25} tint="dark" style={[styles.trustTile, { borderColor: withAlpha(tier.color, '35') }]}>
            <LinearGradient
                pointerEvents="none"
                colors={[withAlpha(tier.color, '22'), 'rgba(255,255,255,0.0)']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
            />
            <View style={styles.trustIconWrap}>
                <Animated.View style={[styles.trustPulse, { backgroundColor: withAlpha(tier.color, '40'), opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                <View style={[styles.trustIconCore, { borderColor: withAlpha(tier.color, '70') }]}>
                    <Ionicons name={icon} size={18} color={tier.color} />
                </View>
            </View>
            <Text style={styles.trustTitle}>{title}</Text>
            <Text style={styles.trustSub}>{sub}</Text>
        </BlurView>
    </FadeInItem>
);

// ================= 🆕 REPORT FORM COMPONENTS =================

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

export default function SupportScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [userData, setUserData] = useState<any>(null);

    // 🆕 REPORT FORM STATE
    const [reportVisible, setReportVisible] = useState(false);
    const [reportCategory, setReportCategory] = useState<string>('');
    const [reportedUser, setReportedUser] = useState('');
    const [reportDesc, setReportDesc] = useState('');
    const [reportConfirm, setReportConfirm] = useState(false);
    const [reportSubmitting, setReportSubmitting] = useState(false);
    const [reportDoneId, setReportDoneId] = useState<string | null>(null);
    const lastReportRef = useRef(0);

    // 🆕 recent hosts picker (reportedUserId correct-a save aaga)
    const [recentUsers, setRecentUsers] = useState<any[]>([]);
    const [pickedUser, setPickedUser] = useState<{ id: string; name: string } | null>(null);

    // 🆕 user anuppina reports-oda live status (MY REPORTS)
    const [myReports, setMyReports] = useState<any[]>([]);

    const scrollY = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    // 🆕 NEW ANIMATION VALUES
    const mainLoop = useRef(new Animated.Value(0)).current;     // rotation loop (orbit rings)
    const pulseAnim = useRef(new Animated.Value(0)).current;    // pulse halos
    const holoAnim = useRef(new Animated.Value(0)).current;     // holographic sweep (hero card)
    const floatAnim = useRef(new Animated.Value(0)).current;    // floating hero
    const headerEnter = useRef(new Animated.Value(0)).current;  // header entrance
    const tiltX = useRef(new Animated.Value(0)).current;        // hero card 3D tilt
    const tiltY = useRef(new Animated.Value(0)).current;

    // 🆕 HERO CARD DRAG-TO-TILT (3D)
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
            onPanResponderMove: (_, g) => {
                tiltY.setValue(Math.max(-1, Math.min(1, g.dx / 120)));
                tiltX.setValue(Math.max(-1, Math.min(1, g.dy / 60)));
            },
            onPanResponderRelease: () => {
                Animated.spring(tiltX, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }).start();
                Animated.spring(tiltY, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }).start();
            },
            onPanResponderTerminate: () => {
                Animated.spring(tiltX, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }).start();
                Animated.spring(tiltY, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }).start();
            },
        })
    ).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();

        // 🆕 ORBIT ROTATION LOOP
        Animated.loop(Animated.timing(mainLoop, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true })).start();

        // 🆕 PULSE HALO LOOP
        Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])).start();

        // 🆕 HOLO SWEEP LOOP
        Animated.loop(Animated.sequence([
            Animated.delay(1200),
            Animated.timing(holoAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(holoAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])).start();

        // 🆕 FLOAT LOOP
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -6, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ).start();

        // 🆕 HEADER ENTRANCE
        Animated.timing(headerEnter, { toValue: 1, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

        if (!user) return;
        const userRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
                setUserData(snap.data());
            }
        });
        return () => unsubscribe();
    }, [user]);

    // 🆕 MY REPORTS live listener (admin status maathina udane user screen-la maarum)
    useEffect(() => {
        if (!user?.uid) return;
        const q = query(
            collection(db, "admin_alerts"),
            where("reporterId", "==", user.uid),
            where("type", "==", "TRUST_SAFETY_REPORT")
        );
        const unsub = onSnapshot(q, (snap) => {
            const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];
            rows.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
            setMyReports(rows.slice(0, 5));
        }, (err) => console.log("My reports listener:", err?.code));
        return () => unsub();
    }, [user?.uid]);

    // 🔥 SATTI FIX: Synced Highest Balance check for accurate Level display!
    const userDiamonds = userData?.totalSpentDiamonds || 0;
    const userTier = calculateUserLevel(userDiamonds);

    // 🆕 report form theme colors (normalized 7-char hex so '+ alpha' is always valid)
    const primaryColor = withAlpha(userTier.color, '');
    const tertiaryColor = withAlpha(userTier.secondaryColor, '');

    const toggleFAQ = (id: number) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedId(expandedId === id ? null : id);
    };

    // 🆕 TRUST & SAFETY: ippo mail illa, in-app secure report form thirakkum
    const handleTrustSafetyReport = () => {
        setReportDoneId(null);
        setReportVisible(true);
        loadRecentUsers();
    };

    // 🆕 recent hosts (yaar kooda pesunaangalo avanga list)
    const loadRecentUsers = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        try {
            const snap = await getDocs(query(collection(db, "calls"), where("callerId", "==", uid), limit(40)));
            const rows = snap.docs.map((d) => {
                const c: any = d.data();
                const t = c.endedAt || c.createdAt;
                const ms = t?.toMillis ? t.toMillis() : t?.seconds ? t.seconds * 1000 : typeof t === 'number' ? t : 0;
                return { id: c.expertId, name: c.expertName || '', ms };
            }).filter((r) => !!r.id);
            rows.sort((a, b) => b.ms - a.ms);
            const seen = new Set<string>();
            const unique: any[] = [];
            for (const r of rows) {
                if (!seen.has(r.id)) { seen.add(r.id); unique.push(r); }
                if (unique.length >= 8) break;
            }
            // host name call doc-la illa-na users collection-la irundhu edukkum
            const withNames = await Promise.all(unique.map(async (r) => {
                if (r.name) return r;
                try {
                    const s = await getDoc(doc(db, "users", r.id));
                    const d: any = s.exists() ? s.data() : {};
                    return { ...r, name: d.name || d.userName || d.displayName || 'Host' };
                } catch {
                    return { ...r, name: 'Host' };
                }
            }));
            setRecentUsers(withNames);
        } catch (e) {
            console.log("Recent hosts error:", e);
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
                source: 'user_support_hub',
                reporterId: currentUser.uid,
                reporterRole: 'user',
                reporterName: userData?.name || userData?.userName || userData?.displayName || "User",
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

    // 🆕 UPDATED FAQ WORDING (Play Store review friendly: diamonds = calls & gifts only, hosts admin-verified, screenshots blocked, in-app report system)
    const faqs = [
        { 
            id: 1, 
            q: "Diamond recharge not reflected?", 
            a: "Recharge status usually synchronizes within 2-5 minutes. If your diamonds haven't updated, please contact our support team with your Google Play order details. Note: Diamonds are virtual in-app credits with no real-world monetary value." 
        },
        { 
            id: 2, 
            q: "Experiencing call disconnections?", 
            a: "If a network disconnect occurs during a live audio or video call, our system automatically evaluates the session state to ensure fair usage and protect your diamond balance from unfair deduction. If you still notice an issue, please contact support." 
        },
        { 
            id: 3, 
            q: "How to locate specific hosts?", 
            a: "You can find verified, strictly 18+ compliant hosts by using the search feature. Every host is reviewed and verified by our admin team before going live. Filter by expertise tags to find the professional best suited for your conversation." 
        },
        { 
            id: 4, 
            q: "Is my privacy protected?", 
            a: "TalkPe Pro strictly enforces a Zero Recording Policy. Your private audio and video calls are secured in transit and are NEVER recorded, monitored, or stored by us. Screenshots and screen recording are also blocked inside live audio and video calls for your safety." 
        },
        { 
            id: 5, 
            q: "What is the Refund Policy for Diamonds?", 
            a: "All diamond purchases are final once delivered to your account. Diamonds are virtual in-app credits used only for calls and for sending gifts to hosts. They cannot be cashed out, transferred, or exchanged for real money. TalkPe Pro is a strictly no-gambling platform." 
        },
        { 
            id: 6, 
            q: "How to report abusive behavior?", 
            a: "Safety is our priority. Use the 'Block & Report' button immediately during any active session or profile visit. Our team reviews all reports and takes definitive admin action within 24 hours." 
        },
        { 
            id: 7, 
            q: "How can I delete my account & data?", 
            a: "In strict compliance with Data Safety policies, you have full control. To permanently wipe your identity and delete your account from our servers, navigate to Profile > Edit Profile > Delete Account." 
        },
        { 
            id: 8, 
            q: "How can I use my Diamonds?", 
            a: "Diamonds are used only for live 1-on-1 audio and video calls with hosts, and for sending gifts to hosts within the app. Nothing in the app involves gambling or real-money rewards." 
        },
        { 
            id: 9, 
            q: "Can I report a problem inside the app?", 
            a: "Yes. Use the Trust & Safety Desk on this screen to send a confidential report directly to our team. Choose a category, add the details, and you can track the status of your report under MY REPORTS. Our team reviews every report within 24 hours." 
        },
        { 
            id: 10, 
            q: "Are all hosts verified?", 
            a: "Yes. Every host is manually reviewed and verified by our admin team before they can receive calls. Hosts must meet our 18+ age requirement and community guidelines, and accounts that violate them are removed." 
        },
        { 
            id: 11, 
            q: "Can screenshots be taken during calls?", 
            a: "No. For your privacy and safety, screenshots and screen recording are blocked during live audio and video calls. This protects both users and hosts from unauthorized capture of private conversations." 
        }
    ];

    // 🆕 TRUST HIGHLIGHTS (FREE GAMES -> IN-APP REPORTING)
    const trustTiles = [
        { icon: 'shield-checkmark', title: 'VERIFIED HOSTS', sub: 'Every host is verified by our admin team' },
        { icon: 'eye-off', title: 'SCREENSHOT BLOCK', sub: 'Disabled in live audio & video calls' },
        { icon: 'mic-off', title: 'ZERO RECORDING', sub: 'Calls are never recorded or stored' },
        { icon: 'flag', title: 'IN-APP REPORTING', sub: 'Report any concern securely inside the app' },
    ];

    const parallaxHeader = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0, -40], extrapolate: 'clamp' });
    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });

    // 🆕 DERIVED ANIMATION VALUES
    const orbitRotate = mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const orbitRotateRev = mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
    const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
    const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] });
    const holoX = holoAnim.interpolate({ inputRange: [0, 1], outputRange: [-width, width] });
    const heroTilt = {
        transform: [
            { perspective: 1000 },
            { rotateX: tiltX.interpolate({ inputRange: [-1, 1], outputRange: ['12deg', '-12deg'] }) },
            { rotateY: tiltY.interpolate({ inputRange: [-1, 1], outputRange: ['-18deg', '18deg'] }) },
        ],
    };
    const headerReveal = {
        opacity: headerEnter,
        transform: [{ translateY: headerEnter.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
    };

    const heroBorder = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: userTier.color,
        borderRightColor: userTier.color,
        borderTopColor: withAlpha(userTier.secondaryColor, '80'),
        borderBottomColor: withAlpha(userTier.secondaryColor, '80'),
        backgroundColor: 'rgba(10, 10, 10, 0.65)',
    };

    const descLen = reportDesc.trim().length;
    const descOk = descLen >= MIN_DESC;

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            {/* 🔥 DYNAMIC THEME GRADIENT FROM TIER ENGINE */}
            <LinearGradient colors={userTier.themeBg as any} style={StyleSheet.absoluteFill} />

            {/* 🆕 HERO IMAGE FADING INTO BACKGROUND */}
            <ImageBackground source={{ uri: IMG_HERO }} style={styles.heroImg} imageStyle={{ opacity: 0.22 }}>
                <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(2,6,23,0.85)', '#020617']} style={StyleSheet.absoluteFill} />
            </ImageBackground>

            {/* 🆕 TWINKLING STAR FIELD */}
            {STARS.map((st, i) => (
                <Animated.View
                    key={`star-${i}`}
                    pointerEvents="none"
                    style={{
                        position: 'absolute', top: st.top, left: st.left, width: st.size, height: st.size, borderRadius: st.size,
                        backgroundColor: '#FFF',
                        opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: i % 2 === 0 ? [0.1, 0.9] : [0.9, 0.1] }),
                    }}
                />
            ))}

            {/* 🆕 FLOATING SHIMMER ORBS */}
            <Animated.View style={[styles.shimmerOrb, { top: 80, left: -60, backgroundColor: userTier.color, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { bottom: 150, right: -60, backgroundColor: userTier.secondaryColor, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            {/* 🌌 Animated Parallax Auras synced with tier color accents */}
            <Animated.View style={[styles.aura, { top: -50, left: -100, backgroundColor: userTier.color, opacity: 0.15, transform: [{ translateY: parallaxHeader }] }]} />
            <Animated.View style={[styles.aura, { bottom: 100, right: -100, backgroundColor: userTier.secondaryColor, opacity: 0.1, transform: [{ translateY: parallaxHeader }] }]} />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <Animated.View style={[styles.header, headerReveal]}>
                    <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: withAlpha(userTier.color, '40') }]}>
                        <Ionicons name="chevron-back" size={26} color="#FFF" />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center' }}>
                        <Text style={styles.headerTitle}>SUPPORT HUB</Text>
                        <Text style={[styles.headerSubTitle, { color: userTier.color }]}>Trust & Safety Center</Text>
                    </View>
                    <TouchableOpacity style={styles.headerIcon}>
                        <View style={styles.headerIconWrap}>
                            <Animated.View style={[styles.headerIconRing, { borderColor: userTier.color, transform: [{ rotate: orbitRotate }] }]} />
                            <MaterialCommunityIcons name="shield-sync-outline" size={24} color={userTier.color} />
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.ScrollView 
                    showsVerticalScrollIndicator={false} 
                    contentContainerStyle={styles.scrollContent}
                    onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                    scrollEventThrottle={16}
                >
                    {/* 🆕 3D TILT HERO CARD (drag it!) */}
                    <Animated.View style={[styles.heroSection, headerReveal, { transform: [{ translateY: floatAnim }] }]}>
                        <Animated.View style={heroTilt} {...panResponder.panHandlers}>
                            <View style={[styles.heroGlow, { shadowColor: userTier.color }]}>
                                <View style={[styles.heroCard, heroBorder]}>
                                    <ImageBackground source={{ uri: IMG_CARD_BG }} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.35 }} />
                                    <LinearGradient
                                        colors={['rgba(0,0,0,0.55)', withAlpha(userTier.color, '30'), 'rgba(0,0,0,0.7)']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                    <Animated.View pointerEvents="none" style={[styles.holoStripe, { transform: [{ translateX: holoX }, { rotate: '25deg' }] }]} />

                                    <View style={styles.heroIconWrap}>
                                        <Animated.View style={[styles.heroRing, { borderColor: withAlpha(userTier.color, 'AA'), transform: [{ rotate: orbitRotate }] }]} />
                                        <Animated.View style={[styles.heroRingInner, { borderColor: withAlpha(userTier.secondaryColor, 'AA'), transform: [{ rotate: orbitRotateRev }] }]} />
                                        <Animated.View style={[styles.heroPulse, { backgroundColor: withAlpha(userTier.color, '40'), opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                                        <LinearGradient colors={[userTier.color, withAlpha(userTier.secondaryColor || '#D946EF', 'FF')]} style={styles.supportIconBg}>
                                            <MaterialCommunityIcons name="frequently-asked-questions" size={52} color="#FFF" />
                                        </LinearGradient>
                                    </View>

                                    <Text style={styles.heroTitle}>How can we help?</Text>
                                    <Text style={styles.heroSub}>24/7 Professional customer assistance for the TalkPe Pro network.</Text>

                                    <View style={[styles.liveBadge, { borderColor: withAlpha(userTier.color, '60') }]}>
                                        <View style={styles.liveDotWrap}>
                                            <Animated.View style={[styles.liveDotHalo, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                                            <View style={styles.liveDot} />
                                        </View>
                                        <Text style={[styles.liveText, { color: userTier.color }]}>SUPPORT ONLINE</Text>
                                    </View>
                                </View>
                            </View>
                        </Animated.View>
                    </Animated.View>

                    {/* 🆕 TRUST & SAFETY HIGHLIGHTS */}
                    <View style={styles.section}>
                        <View style={styles.sectionRow}>
                            <Text style={[styles.sectionLabel, { color: userTier.color }]}>TRUST & SAFETY</Text>
                            <LinearGradient
                                colors={[withAlpha(userTier.color, '80'), withAlpha(userTier.color, '00')]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.sectionLine}
                            />
                        </View>
                        <View style={styles.trustGrid}>
                            {trustTiles.map((t, i) => (
                                <TrustTile
                                    key={t.title}
                                    index={i}
                                    icon={t.icon}
                                    title={t.title}
                                    sub={t.sub}
                                    tier={userTier}
                                    pulseScale={pulseScale}
                                    pulseOpacity={pulseOpacity}
                                />
                            ))}
                        </View>
                    </View>

                    <View style={styles.section}>
                        <View style={styles.sectionRow}>
                            <Text style={[styles.sectionLabel, { color: userTier.color }]}>DIRECT ASSISTANCE</Text>
                            <LinearGradient
                                colors={[withAlpha(userTier.color, '80'), withAlpha(userTier.color, '00')]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.sectionLine}
                            />
                        </View>
                        
                        <SupportCard 
                            index={0}
                            orbitRotate={orbitRotate}
                            icon="mail" 
                            title="Official Email Support" 
                            sub="support@talkpepro.com" 
                            color="#6366F1" 
                            onPress={() => Linking.openURL('mailto:support@talkpepro.com?subject=TalkPe%20Pro%20User%20Support')} 
                        />

                        {/* 🆕 ippo mail illa - in-app secure report form thirakkum */}
                        <SupportCard 
                            index={1}
                            orbitRotate={orbitRotateRev}
                            icon="shield-checkmark" 
                            title="Trust & Safety Desk" 
                            sub="Report abusive behavior or scams" 
                            color="#F43F5E" 
                            onPress={handleTrustSafetyReport} 
                        />
                    </View>

                    {/* 🆕 MY REPORTS (user anuppina reports-oda live status) */}
                    {myReports.length > 0 && (
                        <View style={styles.myReportsBox}>
                            <View style={styles.myReportsHead}>
                                <MaterialCommunityIcons name="clipboard-text-clock-outline" size={22} color={REPORT_COLOR} />
                                <Text style={styles.myReportsTitle}>MY REPORTS</Text>
                            </View>
                            {myReports.map((r) => {
                                const st = r.status || 'unread';
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

                    <View style={styles.section}>
                        <View style={styles.sectionRow}>
                            <Text style={[styles.sectionLabel, { color: userTier.color }]}>KNOWLEDGE BASE</Text>
                            <LinearGradient
                                colors={[withAlpha(userTier.color, '80'), withAlpha(userTier.color, '00')]}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                style={styles.sectionLine}
                            />
                        </View>
                        <BlurView intensity={20} tint="dark" style={[styles.faqContainer, { borderColor: withAlpha(userTier.color, '25') }]}>
                            {faqs.map((item, idx) => (
                                <View key={item.id} style={[styles.faqWrapper, idx === faqs.length - 1 && { borderBottomWidth: 0 }]}>
                                    {expandedId === item.id && (
                                        <LinearGradient
                                            pointerEvents="none"
                                            colors={[withAlpha(userTier.color, '18'), 'rgba(255,255,255,0)']}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                    )}
                                    <TouchableOpacity 
                                        activeOpacity={0.7} 
                                        style={styles.faqHeader} 
                                        onPress={() => toggleFAQ(item.id)}
                                    >
                                        <View style={[styles.faqIndex, { borderColor: withAlpha(userTier.color, expandedId === item.id ? 'AA' : '40') }]}>
                                            <Text style={[styles.faqIndexText, { color: userTier.color }]}>{String(idx + 1).padStart(2, '0')}</Text>
                                        </View>
                                        <Text style={[styles.faqText, expandedId === item.id && { color: userTier.color }]}>{item.q}</Text>
                                        <View style={[styles.plusBox, expandedId === item.id && { backgroundColor: withAlpha(userTier.color, '20') }]}>
                                            <Ionicons 
                                                name={expandedId === item.id ? "remove-circle" : "add-circle"}
                                                size={26} 
                                                color={expandedId === item.id ? userTier.color : "#475569"} 
                                            />
                                        </View>
                                    </TouchableOpacity>
                                    
                                    {expandedId === item.id && (
                                        <BlurView intensity={20} tint="dark" style={styles.answerContainer}>
                                            <Text style={styles.answerText}>{item.a}</Text>
                                        </BlurView>
                                    )}
                                </View>
                            ))}
                        </BlurView>
                    </View>

                    {/* 🆕 COMMUNITY & COMPLIANCE NOTE (Play Store review friendly) */}
                    <FadeInItem index={0}>
                        <BlurView intensity={25} tint="dark" style={[styles.complianceCard, { borderColor: withAlpha(userTier.color, '35') }]}>
                            <LinearGradient
                                pointerEvents="none"
                                colors={[withAlpha(userTier.color, '20'), 'rgba(255,255,255,0)']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.complianceHead}>
                                <MaterialCommunityIcons name="shield-lock" size={20} color={userTier.color} />
                                <Text style={[styles.complianceTitle, { color: userTier.color }]}>OUR COMMITMENT</Text>
                            </View>
                            <Text style={styles.complianceText}>
                                TalkPe Pro is an 18+ app for friendly one-to-one audio and video conversations with verified hosts. We expect respectful behavior from everyone and have zero tolerance for abuse or harassment. All hosts are verified by our admin team, calls are never recorded, and screenshots are blocked in live audio and video calls. Diamonds are virtual in-app credits used only for calls and gifts, and nothing in the app involves gambling or real-money rewards. If something feels wrong, you can report it securely inside the app and our team will review it.
                            </Text>
                        </BlurView>
                    </FadeInItem>

                    <View style={styles.footer}>
                        <LinearGradient colors={[userTier.color, userTier.secondaryColor]} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.footerLine} />
                        <Text style={styles.footerText}>TALKPE PRO SECURE SYSTEM • v1.0.5</Text>
                        <View style={styles.devRow}>
                            <Text style={styles.devText}>Developed with 💎 by </Text>
                            <Text style={[styles.devName, { color: userTier.color }]}>TALKPE TEAM</Text>
                        </View>
                    </View>
                </Animated.ScrollView>
            </SafeAreaView>

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

                                            {/* 2. reported host */}
                                            <View style={styles.rSectionRow}>
                                                <LinearGradient colors={[primaryColor, primaryColor + '66']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rSectionIcon}>
                                                    <MaterialCommunityIcons name="account-search-outline" size={14} color="#0B1026" />
                                                </LinearGradient>
                                                <Text style={[styles.rSectionText, { color: lighten(primaryColor, 0.55) }]}>HOST DETAILS</Text>
                                                <LinearGradient colors={[primaryColor + '88', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.rSectionLine} />
                                            </View>

                                            {/* 🆕 recent hosts picker */}
                                            {recentUsers.length > 0 && (
                                                <>
                                                    <Text style={styles.pickLabel}>RECENT HOSTS (TAP TO SELECT)</Text>
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
                                                    // picked host-oda name-a maathi type pannina, thappana ID save aagaama pick-a clear pannidum
                                                    if (pickedUser && t.trim() !== pickedUser.name) setPickedUser(null);
                                                }}
                                                maxLength={60}
                                                placeholder="Host name or ID (if known)"
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

                                            <TouchableOpacity
                                                onPress={() => {
                                                    closeReport();
                                                    Linking.openURL('mailto:support@talkpepro.com?subject=TalkPe%20Pro%20User%20Support').catch(() => {
                                                        Alert.alert("Email app not found", `Please write to us at ${SUPPORT_EMAIL}`);
                                                    });
                                                }}
                                                style={{ marginTop: 12, alignItems: 'center' }}
                                                activeOpacity={0.7}
                                            >
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
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#020617' },
    heroImg: { position: 'absolute', top: 0, left: 0, right: 0, height: 340 },
    shimmerOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.15, filter: 'blur(100px)' },
    aura: { position: 'absolute', width: 450, height: 450, borderRadius: 225 },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 20 },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 2 },
    headerSubTitle: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginTop: 3 },
    backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 16, borderWidth: 1 },
    headerIcon: { padding: 6 },
    headerIconWrap: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
    headerIconRing: { position: 'absolute', width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderStyle: 'dashed', opacity: 0.8 },
    scrollContent: { padding: 22 },
    
    // 🆕 3D HERO CARD
    heroSection: { marginBottom: 40, marginTop: 5 },
    heroGlow: { borderRadius: 38, shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 16 },
    heroCard: { borderRadius: 38, overflow: 'hidden', alignItems: 'center', paddingVertical: 30, paddingHorizontal: 22 },
    holoStripe: { position: 'absolute', width: 60, height: '240%', top: '-70%', backgroundColor: 'rgba(255,255,255,0.14)' },
    heroIconWrap: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
    heroRing: { position: 'absolute', width: 156, height: 156, borderRadius: 78, borderWidth: 1.5, borderStyle: 'dashed' },
    heroRingInner: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 1, borderStyle: 'dotted' },
    heroPulse: { position: 'absolute', width: 110, height: 110, borderRadius: 55 },
    supportIconBg: { width: 110, height: 110, borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
    heroTitle: { color: '#FFF', fontSize: 30, fontWeight: '900', letterSpacing: -0.5 },
    heroSub: { color: '#CBD5E1', fontSize: 14, textAlign: 'center', marginTop: 12, fontWeight: '600', lineHeight: 22 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
    liveDotWrap: { width: 14, height: 14, justifyContent: 'center', alignItems: 'center' },
    liveDotHalo: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981' },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981' },
    liveText: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
    
    section: { marginBottom: 40 },
    sectionRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    sectionLabel: { fontSize: 13, fontWeight: '900', letterSpacing: 3 },
    sectionLine: { flex: 1, height: 1, marginLeft: 12 },

    // 🆕 TRUST GRID
    trustGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 },
    trustTile: { width: (width - 44 - 14) / 2, minHeight: 138, borderRadius: 26, padding: 16, overflow: 'hidden', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
    trustIconWrap: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    trustPulse: { position: 'absolute', width: 40, height: 40, borderRadius: 20 },
    trustIconCore: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
    trustTitle: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
    trustSub: { color: '#94A3B8', fontSize: 11, fontWeight: '600', lineHeight: 16, marginTop: 6 },
    
    // 🆕 SUPPORT CARDS
    // 🔧 FIX: shadowOpacity / shadowRadius / shadowOffset / elevation remove pannitten - pinnaadi vara shadow poiduchu
    card: { marginBottom: 20, borderRadius: 32, backgroundColor: 'transparent' },
    cardBlur: { borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    cardGradient: { flexDirection: 'row', alignItems: 'center', padding: 22 },
    cardStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, zIndex: 20 },
    iconWrap: { width: 78, height: 78, justifyContent: 'center', alignItems: 'center' },
    iconRing: { position: 'absolute', width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, borderStyle: 'dashed' },
    iconContainer: { width: 60, height: 60, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
    cardText: { flex: 1, marginLeft: 14 },
    cardTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 4 },
    cardSub: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
    chevronBox: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 12, borderRadius: 16, borderWidth: 1 },

    // 🆕 MY REPORTS styles
    myReportsBox: { marginTop: -10, marginBottom: 40, padding: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(15,23,42,0.6)' },
    myReportsHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
    myReportsTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
    myReportRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 18, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.25)', marginBottom: 10 },
    myReportIcon: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    myReportCat: { color: '#FFF', fontSize: 13.5, fontWeight: '900' },
    myReportNote: { color: '#94A3B8', fontSize: 11, fontWeight: '600', marginTop: 3 },
    myReportRef: { color: '#64748B', fontSize: 9.5, fontWeight: '800', letterSpacing: 1, marginTop: 3 },
    myReportChip: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, marginLeft: 8 },
    myReportChipText: { fontSize: 8.5, fontWeight: '900', letterSpacing: 1 },
    
    // 🆕 FAQ
    faqContainer: { backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 32, overflow: 'hidden', borderWidth: 1 },
    faqWrapper: { borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24 },
    faqIndex: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 12, backgroundColor: 'rgba(0,0,0,0.4)' },
    faqIndexText: { fontSize: 11, fontWeight: '900' },
    faqText: { color: '#FFF', fontSize: 16, fontWeight: '800', flex: 1, paddingRight: 15, lineHeight: 24 },
    plusBox: { padding: 6, borderRadius: 12 },
    answerContainer: { paddingHorizontal: 28, paddingBottom: 28, paddingTop: 5 },
    answerText: { color: '#94A3B8', fontSize: 15, lineHeight: 24, fontWeight: '600' },

    // 🆕 COMPLIANCE CARD
    complianceCard: { borderRadius: 28, padding: 22, overflow: 'hidden', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
    complianceHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
    complianceTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 2.5 },
    complianceText: { color: '#94A3B8', fontSize: 13, lineHeight: 21, fontWeight: '600' },
    
    footer: { marginTop: 30, alignItems: 'center', paddingBottom: 60 },
    footerLine: { width: '40%', height: 3, borderRadius: 2, marginBottom: 25 },
    footerText: { color: '#334155', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
    devRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
    devText: { color: '#475569', fontSize: 13, fontWeight: '700' },
    devName: { fontSize: 13, fontWeight: '900' },

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

    // recent hosts picker styles
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