import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture'; // 🔒 NEW: screenshot / screen record block
import { addDoc, arrayUnion, collection, doc, increment, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { auth, db } from '../firebaseConfig';

const { height, width } = Dimensions.get('window');

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT THEME SYNC V2)
const calculateUserLevel = (totalSpent: number) => {
  if (totalSpent >= 500000001) return { 
      lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#ff0000', secondaryColor: '#660000', anim: 'titan', themeBg: ['#1A0000', '#000000']
  }; 
  if (totalSpent >= 100000001) return { 
      lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#ff0dba', secondaryColor: '#a50606', anim: 'mythic', themeBg: ['#15001A', '#000000']
  }; 
  if (totalSpent >= 50000000) return { 
      lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#f6f60d', secondaryColor: '#02fa0a', anim: 'grandmaster', themeBg: ['#08001A', '#000000']
  };
  if (totalSpent >= 10000000) return { 
      lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#f52b6092', anim: 'explosion', themeBg: ['#00101A', '#000000']
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

// 🆕 TIER STEPS (progress to next tier - same thresholds as the engine above)
const TIER_STEPS = [0, 200001, 1000000, 5000000, 10000000, 50000000, 100000001, 500000001];
const getTierProgress = (diamonds: number, lvl: number) => {
    const idx = Math.max(0, Math.min(TIER_STEPS.length - 1, lvl - 1));
    if (idx >= TIER_STEPS.length - 1) return 1;
    const lo = TIER_STEPS[idx];
    const hi = TIER_STEPS[idx + 1];
    return Math.max(0, Math.min(1, (diamonds - lo) / (hi - lo)));
};

// 🆕 COLOR HELPERS (double colour borders + text-safe shades)
const norm = (hex: string) => (hex && hex.length > 7 ? hex.slice(0, 7) : hex); // 8-digit hex (alpha) -> 6-digit
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

// 🆕 3D IMAGES (icons8 3D Fluency) - load aagalana automatic-a icon fallback varum
const IMG = {
    crown: 'https://img.icons8.com/3d-fluency/512/crown.png',
    trophy: 'https://img.icons8.com/3d-fluency/512/trophy.png',
    diamond: 'https://img.icons8.com/3d-fluency/512/diamond.png',
    star: 'https://img.icons8.com/3d-fluency/512/star.png',
    shield: 'https://img.icons8.com/3d-fluency/512/shield.png',
    chat: 'https://img.icons8.com/3d-fluency/512/speech-bubble.png',
    coin: 'https://img.icons8.com/3d-fluency/512/coin.png',
    pin: 'https://img.icons8.com/3d-fluency/512/marker.png',
    cake: 'https://img.icons8.com/3d-fluency/512/birthday-cake.png',
    user: 'https://img.icons8.com/3d-fluency/512/user.png',
    heart: 'https://img.icons8.com/3d-fluency/512/like.png',
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

// 🆕 3D reveal (section vandhu flip-up aagi varum)
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
                        { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                        { rotateX: a.interpolate({ inputRange: [0, 1], outputRange: ['24deg', '0deg'] }) },
                        { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }
                    ]
                }
            ]}
        >
            {children}
        </Animated.View>
    );
};

// 🆕 DOUBLE COLOUR FRAME (gradient border: colour A + colour B, solid dark inside - NO line look)
const DoubleFrame = ({ a, b, radius = 24, pad = 1.6, children, style, inner, shine = false, shineDelay = 0 }: any) => {
    const [cw, setCw] = useState(0);
    return (
        <LinearGradient colors={[a, b, a]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[{ borderRadius: radius, padding: pad }, style]}>
            <View
                style={[{ borderRadius: radius - pad, overflow: 'hidden', backgroundColor: 'rgba(5, 5, 8, 0.88)' }, inner]}
                onLayout={shine ? (e) => setCw(e.nativeEvent.layout.width) : undefined}
            >
                {children}
                {shine && <ShineSweep w={cw} delay={shineDelay} />}
            </View>
        </LinearGradient>
    );
};

// 🆕 Section heading (gradient bar + title + fading line + diamond)
const SectionHead = ({ title, a, b }: any) => (
    <View style={styles.sectionHeader}>
        <LinearGradient colors={[a, b]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.glowBar} />
        <Text style={styles.sectionTitleText}>{title}</Text>
        <LinearGradient colors={[a + '99', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sectionLine} />
        <View style={[styles.sectionDiamond, { backgroundColor: b, shadowColor: b }]} />
    </View>
);

// 🆕 GLOW PROGRESS BAR (animated fill)
const GlowBar = ({ progress, color, height = 6, style }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(v, { toValue: Math.max(0, Math.min(1, progress || 0)), duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
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
const CountUp = ({ value, style, duration = 900 }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    const [txt, setTxt] = useState(0);
    useEffect(() => {
        const id = v.addListener(({ value: val }) => setTxt(Math.round(val)));
        Animated.timing(v, { toValue: Number(value) || 0, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
        return () => v.removeListener(id);
    }, [value]);
    return <Text style={style} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{txt}</Text>;
};

// 🆕 Data tile (3D image + label + value, double colour frame)
const DataTile = ({ a, b, img, fallback, color, delay, label, children }: any) => (
    <Reveal delay={delay} style={{ flex: 1 }}>
        <DoubleFrame a={a} b={b} radius={26} shine shineDelay={800 + delay * 4}>
            <View style={styles.dataTile}>
                <LinearGradient colors={[color + '26', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                <View style={styles.dataImgBox}>
                    <View style={[styles.dataImgGlow, { backgroundColor: color }]} />
                    <FloatBox amp={4} dur={1700 + delay * 3}>
                        <Img3D uri={img} size={36} fallback={fallback} color={color} />
                    </FloatBox>
                </View>
                <Text style={styles.dataLabel}>{label}</Text>
                {children}
            </View>
        </DoubleFrame>
    </Reveal>
);

export default function UserDetail() {
    const params = useLocalSearchParams();
    const userId = (params.id || params.userId) as string;
    const router = useRouter();

    const [targetUser, setTargetUser] = useState<any>(null);
    const [currentUserData, setCurrentUserData] = useState<any>(null); // 🔥 SATTI FIX: Track Expert's profile to prevent double block
    const [loading, setLoading] = useState(true);

    const [blockModalVisible, setBlockModalVisible] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);
    
    const blockReasons = [
        "Abusive Language / Harassment",
        "Inappropriate Behavior / Nudity",
        "Scam / Spam / Phishing",
        "Threatening / Aggressive",
        "Other Unwanted Contact"
    ];

    const scrollY = useRef(new Animated.Value(0)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const trailX = useRef(new Animated.Value(-width)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current; 

    // 🆕 PREMIUM ANIMATION VALUES
    const rotAnim = useRef(new Animated.Value(0)).current;   // avatar spinning frame
    const pulseAnim = useRef(new Animated.Value(0)).current; // glow pulse
    const heroIn = useRef(new Animated.Value(0)).current;    // hero entrance
    const [btnW, setBtnW] = useState(0);                     // message button shine width
    const particles = useRef(
        Array.from({ length: 12 }, (_, i) => ({
            v: new Animated.Value(0),
            x: ((i * 41) % 100) / 100 * width,
            y: 160 + ((i * 59) % 520),
            size: 2 + (i % 3),
            dur: 6500 + (i % 5) * 1200,
            delay: i * 500,
        }))
    ).current;

    // 🔒 NEW: SCREENSHOT / SCREEN RECORD BLOCK (User Profile screen)
    // Screen open aagumbodhu capture lock pōdum, screen close aagumbodhu mattum release pannum.
    // Thani key use panradhunaala video call screen-oda lock-ku onnum aagaadhu.
    useEffect(() => {
        const SECURE_KEY = 'USER_DETAIL_SECURE';
        ScreenCapture.preventScreenCaptureAsync(SECURE_KEY).catch((e) => console.log('Screen capture block error:', e));
        return () => {
            ScreenCapture.allowScreenCaptureAsync(SECURE_KEY).catch((e) => console.log('Screen capture release error:', e));
        };
    }, []);

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -10, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();

        const runTrail = () => {
            trailX.setValue(-width);
            Animated.timing(trailX, { toValue: width, duration: 3500, useNativeDriver: true }).start(() => runTrail());
        };
        runTrail();

        if (!userId) return;
        
        const unsubTargetUser = onSnapshot(doc(db, 'users', userId), (docSnap) => {
            if (docSnap.exists()) {
                setTargetUser({ id: docSnap.id, ...docSnap.data() });
            }
            setLoading(false);
        });

        let unsubCurrentUser = () => {};
        if (auth.currentUser) {
            unsubCurrentUser = onSnapshot(doc(db, 'users', auth.currentUser.uid), (docSnap) => {
                if (docSnap.exists()) {
                    setCurrentUserData(docSnap.data());
                }
            });
        }

        return () => { unsubTargetUser(); unsubCurrentUser(); };
    }, [userId]);

    // 🆕 PREMIUM AMBIENT LOOPS (avatar frame spin, glow pulse, hero entrance, floating particles)
    useEffect(() => {
        const rotLoop = Animated.loop(Animated.timing(rotAnim, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true }));
        rotLoop.start();
        const pulseLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        );
        pulseLoop.start();
        Animated.spring(heroIn, { toValue: 1, friction: 6, tension: 45, useNativeDriver: true }).start();

        const pLoops = particles.map((p) =>
            Animated.loop(
                Animated.sequence([
                    Animated.delay(p.delay),
                    Animated.timing(p.v, { toValue: 1, duration: p.dur, easing: Easing.linear, useNativeDriver: true }),
                    Animated.timing(p.v, { toValue: 0, duration: 0, useNativeDriver: true })
                ])
            )
        );
        pLoops.forEach(l => l.start());

        return () => {
            rotLoop.stop();
            pulseLoop.stop();
            pLoops.forEach(l => l.stop());
        };
    }, []);

    const handleReasonSelect = (reason: string) => {
        if (!targetUser || !auth.currentUser) return;

        const alreadyBlocked = Array.isArray(currentUserData?.blockedUsers) && currentUserData.blockedUsers.includes(userId);
        
        if (alreadyBlocked) {
            Alert.alert(
                "ACTION RESTRICTED", 
                "This user is already in your blacklist. Please manage them via Security Settings if you wish to restore access."
            );
            setBlockModalVisible(false);
            return;
        }

        Alert.alert(
            "CONFIRM BLOCK",
            `Are you sure you want to block ${targetUser.name}?\n\nReason: ${reason}`,
            [
                { text: "CANCEL", style: "cancel" },
                { 
                    text: "BLOCK & REPORT", 
                    style: "destructive",
                    onPress: () => executeBlockUser(reason)
                }
            ]
        );
    };

    const executeBlockUser = async (reason: string) => {
        setIsBlocking(true);
        const expertId = auth.currentUser!.uid;

        try {
            await updateDoc(doc(db, "users", expertId), { blockedUsers: arrayUnion(userId) });
            await updateDoc(doc(db, "users", userId), { expertBlockCount: increment(1) });
            
            await addDoc(collection(db, "admin_alerts"), {
                type: 'EXPERT_BLOCKED_USER', 
                expertId: expertId, 
                expertName: currentUserData?.name || auth.currentUser?.displayName || "Expert",
                userId: userId, 
                userName: targetUser.name, 
                reason: reason,
                timestamp: serverTimestamp(), 
                status: 'unread'
            });

            Alert.alert("USER BLOCKED", `${targetUser.name} has been successfully restricted and reported to safety moderation.`);
        } catch (error) {
            Alert.alert("SYSTEM ERROR", "Unable to complete blocking protocol. Please check your connection.");
        } finally {
            setIsBlocking(false); 
            setBlockModalVisible(false);
        }
    };

    if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#6366F1" /></View>;

    // 🔥 SATTI FIX: Synced Highest Balance check for accurate Level display!
    const userDiamonds = targetUser?.totalSpentDiamonds || 0;
    const userRank = calculateUserLevel(userDiamonds);
    const gender = targetUser?.gender || 'N/A';

    // 🆕 NORMALIZED THEME COLOURS (8-digit hex -> 6-digit) + DOUBLE COLOUR PAIR (darker shade)
    const colA = norm(userRank.color);
    const colB = norm(userRank.secondaryColor);
    const bA = darken(vivid(colA, 0.3), 0.15);
    const bB = darken(vivid(colB, 0.3), 0.15);
    const textColor = lighten(colA, 0.35);   // text-safe
    const textColor2 = lighten(colB, 0.55);  // text-safe
    const tierProgress = getTierProgress(userDiamonds, userRank.lvl);
    const tierPct = Math.round(tierProgress * 100);

    // 🆕 per-side double colour border (top/left = A, bottom/right = B)
    const sideMix: any = {
        borderTopColor: bA,
        borderLeftColor: bA,
        borderBottomColor: bB,
        borderRightColor: bB,
    };

    const parallaxImg = scrollY.interpolate({ inputRange: [0, 300], outputRange: [0, -50], extrapolate: 'clamp' });
    const bgOpacity = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0.15, 0.05], extrapolate: 'clamp' });
    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });

    // 🆕 hero parallax (stretch on pull-down, slower slide on scroll) + background depth
    const heroTY = scrollY.interpolate({ inputRange: [-250, 0, 300], outputRange: [-125, 0, 120], extrapolate: 'clamp' });
    const heroScale = scrollY.interpolate({ inputRange: [-250, 0, 300], outputRange: [1.6, 1, 1], extrapolate: 'clamp' });
    const heroFade = scrollY.interpolate({ inputRange: [0, 260], outputRange: [1, 0.35], extrapolate: 'clamp' });
    const bgShift = scrollY.interpolate({ inputRange: [0, 1500], outputRange: [0, -260], extrapolate: 'clamp' });
    const spin = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] });
    const crestScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });

    const borderType1 = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: userRank.color, borderRightColor: userRank.color,
        borderTopColor: userRank.secondaryColor + '80', borderBottomColor: userRank.secondaryColor + '80',
        backgroundColor: 'rgba(5, 5, 5, 0.65)',
    };

    const borderType2 = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: userRank.secondaryColor, borderRightColor: userRank.secondaryColor,
        borderTopColor: userRank.color + '80', borderBottomColor: userRank.color + '80',
        backgroundColor: 'rgba(5, 5, 5, 0.8)',
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <LinearGradient colors={userRank.themeBg as any} style={StyleSheet.absoluteFill} />

            {/* 🆕 DARKER orbs (0.15 -> 0.09) */}
            <Animated.View style={[styles.parallaxAura, { top: 40, left: -50, backgroundColor: colA, opacity: bgOpacity, transform: [{ translateY: parallaxImg }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: height * 0.4, right: -80, backgroundColor: colA, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { bottom: 50, left: -80, backgroundColor: colB, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            {/* 🆕 Floating 3D background objects with scroll parallax */}
            <Animated.View pointerEvents="none" style={[styles.bgFloat, { top: 560, right: 12, opacity: 0.16, transform: [{ translateY: bgShift }] }]}>
                <FloatBox amp={14} dur={2600}>
                    <Img3D uri={IMG.diamond} size={62} fallback="diamond-stone" color={colA} />
                </FloatBox>
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.bgFloat, { top: 860, left: 8, opacity: 0.14, transform: [{ translateY: bgShift }] }]}>
                <FloatBox amp={10} dur={2200}>
                    <Img3D uri={IMG.coin} size={50} fallback="circle-multiple" color={colA} />
                </FloatBox>
            </Animated.View>

            {/* 🆕 Floating particles (rank theme embers) */}
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
                        backgroundColor: [colA, colB, '#FFFFFF'][i % 3],
                        opacity: p.v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.7, 0.4, 0] }),
                        transform: [{ translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, -300] }) }]
                    }}
                />
            ))}

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                scrollEventThrottle={16}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            >
                <View style={styles.imageWrapper}>
                    {/* 🆕 PARALLAX COVER (stretches on pull-down, slides slower on scroll) */}
                    <View style={styles.heroClip}>
                        <Animated.View style={[StyleSheet.absoluteFill, { opacity: heroFade, transform: [{ translateY: heroTY }, { scale: heroScale }] }]}>
                            <Animated.Image
                                source={{ uri: targetUser?.coverPhoto || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400' }}
                                style={[styles.profileImg, { transform: [{ translateY: parallaxImg }] }]}
                            />
                        </Animated.View>
                        <LinearGradient colors={['rgba(2, 6, 23, 0.55)', 'rgba(2, 6, 23, 0.05)', userRank.themeBg[0]]} style={StyleSheet.absoluteFill} />
                        <LinearGradient colors={['transparent', bA + '30']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                        <Sparkle x={width * 0.5} y={height * 0.1} size={12} color={textColor} delay={0} />
                        <Sparkle x={width * 0.86} y={height * 0.2} size={10} color={textColor2} delay={700} />
                    </View>
                    
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <BlurView intensity={30} tint="dark" style={[styles.blurBack, sideMix]}>
                            <Ionicons name="chevron-back" size={24} color="#FFF" />
                        </BlurView>
                    </TouchableOpacity>

                    {/* 🆕 RANK EMBLEM (floating 3D crown + orbit rings, right side of hero) */}
                    <Animated.View style={[styles.emblemNode, { opacity: heroIn }]} pointerEvents="none">
                        <Animated.View style={[styles.emblemGlow, { backgroundColor: colA, opacity: glowOpacity }]} />
                        <OrbitRing size={104} color={textColor} dur={5200} dotSize={6} />
                        <OrbitRing size={88} color={textColor2} dur={8000} reverse dotSize={4} style={{ opacity: 0.7 }} />
                        <FloatBox amp={6} dur={1700}>
                            <Img3D uri={userRank.lvl >= 5 ? IMG.crown : IMG.trophy} size={64} fallback="crown" color={textColor} />
                        </FloatBox>
                    </Animated.View>

                    <Animated.View style={[styles.leftAvatarNode, { transform: [{ translateY: floatAnim }] }]}>
                         <Animated.View style={[styles.avatarGlow, { backgroundColor: colA, opacity: glowOpacity }]} />
                         {/* 🆕 spinning DOUBLE COLOUR frame around the avatar */}
                         <View style={[styles.avatarBorder, { shadowColor: colA }]}>
                            <Animated.View style={[styles.avatarSpin, { transform: [{ rotate: spin }] }]}>
                                <LinearGradient colors={[bA, bB, bA, bB, bA]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                            </Animated.View>
                            <View style={styles.avatarInner}>
                                <Image source={{ uri: targetUser?.profilePic || `https://ui-avatars.com/api/?name=${targetUser?.name}` }} style={styles.syncedAvatarImg} />
                            </View>
                         </View>
                         <FloatBox amp={3} dur={1500} style={styles.avatarCrown}>
                            <Img3D uri={IMG.crown} size={34} fallback="crown" color={textColor} />
                         </FloatBox>
                    </Animated.View>
                </View>

                <View style={[styles.infoContent, { backgroundColor: userRank.themeBg[0] }]}>
                    <LinearGradient colors={[bA + '1A', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.infoTint} pointerEvents="none" />

                    <View style={styles.topHeaderInfo}>
                        <View style={{flex: 1}}>
                            <Text style={styles.userName}>{targetUser?.name || "TalkPe User"}</Text>
                            <Text style={styles.idLabel}>NETWORK ID: {userId.slice(0, 10).toUpperCase()}</Text>
                            <Text style={[styles.statusLabel, { color: textColor2 }]} numberOfLines={1}>{userRank.status}</Text>
                        </View>
                        <LinearGradient colors={[darken(colA, 0.15), darken(colB, 0.15)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rankBadgeMass}>
                             <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']} style={styles.rankGloss} pointerEvents="none" />
                             <MaterialCommunityIcons name="crown" size={16} color="#FFF" />
                             <Text style={styles.rankLabelMass}>{userRank.label}</Text>
                        </LinearGradient>
                    </View>

                    {/* 🆕 3 SEPARATE 3D DATA TILES (double colour frame) */}
                    <View style={styles.dataNodeRow}>
                        <DataTile a={bA} b={bB} img={IMG.pin} fallback="map-marker" color={textColor} delay={0} label="LOCATION">
                            <Text style={styles.dataVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{targetUser?.location || 'GLOBAL'}</Text>
                        </DataTile>
                        <DataTile a={bB} b={bA} img={IMG.cake} fallback="cake-variant" color={textColor2} delay={90} label="AGE">
                            <Text style={styles.dataVal}>{targetUser?.age || '20'}</Text>
                        </DataTile>
                        <DataTile a={bA} b={bB} img={IMG.user} fallback={gender === 'Male' ? 'gender-male' : 'gender-female'} color={textColor} delay={180} label="GENDER">
                            <Text style={styles.dataVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{gender.toUpperCase()}</Text>
                        </DataTile>
                    </View>

                    {/* 🆕 METRICS (followers + tier rank + progress to next tier) */}
                    <Reveal delay={200}>
                        <DoubleFrame a={bB} b={bA} radius={30} shine shineDelay={1400} style={styles.metricsWrapper}>
                            <View style={styles.metricsBody}>
                                <LinearGradient colors={[colA + '1F', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                <View style={styles.metricsInner}>
                                    <View style={styles.statItem}>
                                        <View style={styles.metricImgBox}>
                                            <FloatBox amp={3} dur={1800}>
                                                <Img3D uri={IMG.heart} size={30} fallback="heart" color={textColor2} />
                                            </FloatBox>
                                        </View>
                                        <CountUp style={styles.statNumber} value={targetUser?.friendsCount || 0} />
                                        <Text style={styles.statSub}>FOLLOWERS</Text>
                                    </View>
                                    <LinearGradient colors={['transparent', bA, 'transparent']} style={styles.dividerV} />
                                    <View style={styles.statItem}>
                                        <View style={styles.metricImgBox}>
                                            <FloatBox amp={3} dur={2000}>
                                                <Img3D uri={IMG.trophy} size={30} fallback="trophy" color={textColor} />
                                            </FloatBox>
                                        </View>
                                        <Text style={[styles.statNumber, { color: textColor }]}>L{userRank.lvl}</Text>
                                        <Text style={styles.statSub}>TIER RANK</Text>
                                    </View>
                                </View>
                                <View style={styles.tierProgressWrap}>
                                    <GlowBar progress={tierProgress} color={colA} height={5} />
                                    <Text style={[styles.tierProgressText, { color: textColor2 }]} numberOfLines={1}>
                                        {userRank.lvl >= 8 ? 'MAX TIER REACHED' : `${tierPct}%  •  TO TIER L${userRank.lvl + 1}`}
                                    </Text>
                                </View>
                            </View>
                        </DoubleFrame>
                    </Reveal>

                    <Reveal delay={240}>
                        <SectionHead title="BIOGRAPHY" a={bA} b={bB} />
                        <DoubleFrame a={bA} b={bB} radius={30}>
                            <View style={styles.bioContainer}>
                                <Animated.View style={[styles.glowTrail, { backgroundColor: colA, transform: [{ translateX: trailX }] }]} />
                                <MaterialCommunityIcons name="format-quote-open" size={24} color={colA + '50'} style={styles.quoteIcon} />
                                <View style={styles.bioStar} pointerEvents="none">
                                    <FloatBox amp={6} dur={2400}>
                                        <Img3D uri={IMG.star} size={64} fallback="star" color={colA} style={{ opacity: 0.18 }} />
                                    </FloatBox>
                                </View>
                                <Text style={styles.bioText}>
                                    {targetUser?.bio || "This TalkPe identity has not yet shared a biography."}
                                </Text>
                            </View>
                        </DoubleFrame>
                    </Reveal>

                    {targetUser?.hobbies && targetUser.hobbies.length > 0 && (
                        <Reveal delay={280} style={{ marginTop: 35 }}>
                            <SectionHead title="INTERESTS" a={bB} b={bA} />
                            <View style={styles.hobbiesList}>
                                {targetUser.hobbies.map((hobby: string, index: number) => (
                                    <DoubleFrame key={index} a={index % 2 === 0 ? bB : bA} b={index % 2 === 0 ? bA : bB} radius={20} pad={1.3}>
                                        <View style={styles.hobbyPill}>
                                            <LinearGradient colors={[(index % 2 === 0 ? colB : colA) + '22', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                            <MaterialCommunityIcons name="star-four-points" size={9} color={index % 2 === 0 ? textColor2 : textColor} style={{ marginRight: 6 }} />
                                            <Text style={[styles.hobbyLabel, { color: index % 2 === 0 ? textColor2 : textColor }]}>{hobby.toUpperCase()}</Text>
                                        </View>
                                    </DoubleFrame>
                                ))}
                            </View>
                        </Reveal>
                    )}

                    <Reveal delay={320}>
                        <View style={styles.actionRowMass}>
                            <TouchableOpacity 
                                style={{ flex: 1 }}
                                activeOpacity={0.85}
                                onPress={() => router.push({ 
                                    pathname: '/chat/ChatScreen', 
                                    params: { userId: userId, userName: targetUser?.name } 
                                })}
                            >
                                <DoubleFrame a={bA} b={bB} radius={22} pad={1.6}>
                                    <View style={styles.actionBtnMass} onLayout={(e) => setBtnW(e.nativeEvent.layout.width)}>
                                        <LinearGradient colors={[colA + '33', colB + '22']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                        <Ionicons name="chatbubble-ellipses" size={20} color={textColor} />
                                        <Text style={[styles.actionBtnTextMass, { color: textColor }]}>MESSAGE</Text>
                                        <ShineSweep w={btnW} delay={1200} />
                                    </View>
                                </DoubleFrame>
                            </TouchableOpacity>

                            <TouchableOpacity 
                                style={{ flex: 1 }}
                                activeOpacity={0.85}
                                onPress={() => setBlockModalVisible(true)}
                            >
                                <View style={[styles.actionBtnMass, styles.blockBtn]}>
                                    <MaterialCommunityIcons name="shield-off" size={20} color="#EF4444" />
                                    <Text style={[styles.actionBtnTextMass, { color: '#EF4444' }]}>BLOCK & REPORT</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                    </Reveal>

                    <Reveal delay={360}>
                        <DoubleFrame a={bB} b={bA} radius={28} shine shineDelay={2200} style={styles.trustBanner}>
                            <View style={styles.trustInner}>
                                <LinearGradient colors={[colA + '20', 'transparent']} start={{x:0, y:0}} end={{x:1, y:0}} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                <View style={styles.trustImgBox}>
                                    <View style={[styles.dataImgGlow, { backgroundColor: colA }]} />
                                    <FloatBox amp={3} dur={1800}>
                                        <Img3D uri={IMG.shield} size={34} fallback="shield-check" color={colA} />
                                    </FloatBox>
                                </View>
                                <Text style={[styles.trustLabel, { color: textColor }]}>Safe & Respectful Community</Text>
                                <MaterialCommunityIcons name="check-decagram" size={20} color={colA} />
                            </View>
                        </DoubleFrame>
                    </Reveal>
                </View>
            </Animated.ScrollView>

            <Modal
                visible={blockModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setBlockModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { borderColor: userRank.color }, sideMix]}>
                        <View style={{ alignItems: 'center', marginBottom: 15 }}>
                            <View style={[styles.modalIconRing, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                <MaterialCommunityIcons name="shield-off-outline" size={32} color="#EF4444" />
                            </View>
                            <Text style={styles.modalTitle}>BLOCK USER</Text>
                            <Text style={styles.modalSubText}>
                                Restrict {targetUser?.name} from contacting you. This action will be reported for safety moderation.
                            </Text>
                        </View>

                        <Text style={styles.modalLabel}>REASON FOR REPORTING:</Text>
                        {blockReasons.map((reason, idx) => (
                            <TouchableOpacity 
                                key={idx} 
                                style={[styles.reasonBtn, { borderColor: userRank.color + '40' }, sideMix]}
                                onPress={() => handleReasonSelect(reason)}
                                disabled={isBlocking}
                            >
                                <Text style={styles.reasonText}>{reason}</Text>
                                <Ionicons name="chevron-forward" size={16} color={userRank.color} />
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
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    // 🆕 darker orbs (0.15 -> 0.09)
    shimmerOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.09 },
    parallaxAura: { position: 'absolute', width: 450, height: 450, borderRadius: 225 },
    bgFloat: { position: 'absolute' },

    // 🆕 hero
    imageWrapper: { width: '100%', height: height * 0.45, position: 'relative', overflow: 'visible' },
    heroClip: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
    profileImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    backBtn: { position: 'absolute', top: 55, left: 20, zIndex: 20 },
    blurBack: { padding: 10, borderRadius: 15, overflow: 'hidden', borderWidth: 1.3, borderColor: 'rgba(255,255,255,0.1)' },
    emblemNode: { position: 'absolute', right: 26, bottom: 14, width: 104, height: 104, justifyContent: 'center', alignItems: 'center', zIndex: 12 },
    emblemGlow: { position: 'absolute', width: 70, height: 70, borderRadius: 35 },
    leftAvatarNode: { position: 'absolute', bottom: -55, left: 35, zIndex: 15 },
    avatarGlow: { position: 'absolute', left: -4, top: -4, width: 123, height: 123, borderRadius: 38 },
    avatarBorder: { width: 115, height: 115, borderRadius: 35, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', elevation: 20, shadowOpacity: 0.8, shadowRadius: 15 },
    avatarSpin: { position: 'absolute', width: 260, height: 260, left: -72, top: -72 },
    avatarInner: { width: 107, height: 107, borderRadius: 31, backgroundColor: '#000', padding: 3 },
    syncedAvatarImg: { width: '100%', height: '100%', borderRadius: 28 },
    avatarCrown: { position: 'absolute', top: -22, alignSelf: 'center', left: 40 },

    infoContent: { padding: 25, paddingTop: 75, borderTopLeftRadius: 45, borderTopRightRadius: 45, minHeight: height, overflow: 'hidden' },
    infoTint: { position: 'absolute', top: 0, left: 0, right: 0, height: 320 },
    topHeaderInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 35 },
    userName: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: -0.5, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
    idLabel: { color: '#64748B', fontSize: 10, fontWeight: '800', marginTop: 4, letterSpacing: 1.5 },
    statusLabel: { fontSize: 9, fontWeight: '900', marginTop: 5, letterSpacing: 1.5 },
    rankBadgeMass: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, elevation: 15, overflow: 'hidden' }, 
    rankGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 14 },
    rankLabelMass: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },

    // 🆕 data tiles (separate 3D tiles)
    dataNodeRow: { flexDirection: 'row', gap: 10, marginBottom: 35 },
    dataTile: { minHeight: 128, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 6 },
    dataImgBox: { width: 46, height: 46, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
    dataImgGlow: { position: 'absolute', width: 32, height: 32, borderRadius: 16, opacity: 0.3 },
    stealthNodeBase: { flex: 1, height: 110, borderRadius: 25, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, 
    quadBorder: { ...StyleSheet.absoluteFillObject, borderLeftWidth: 3, borderRightWidth: 3, borderTopWidth: 1, borderBottomWidth: 1, borderRadius: 25 },
    dataLabel: { color: '#94A3B8', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginTop: 4 },
    dataVal: { color: '#FFF', fontSize: 13, fontWeight: '800', marginTop: 3, maxWidth: '100%' },

    // 🆕 metrics
    metricsWrapper: { marginBottom: 35 }, 
    metricsBody: { paddingVertical: 16, paddingHorizontal: 12 },
    metricsInner: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', zIndex: 10 },
    metricImgBox: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 2 },
    statItem: { alignItems: 'center', minWidth: 90 },
    dividerV: { width: 1.5, height: 60, borderRadius: 1 },
    divider: { width: 1, height: 30 },
    statNumber: { color: '#FFF', fontSize: 24, fontWeight: '900' },
    statSub: { color: '#94A3B8', fontSize: 8, marginTop: 4, fontWeight: '900', letterSpacing: 2 },
    tierProgressWrap: { marginTop: 14, paddingHorizontal: 6 },
    tierProgressText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.5, marginTop: 8, textAlign: 'center' },
    metricsInnerLegacy: { flexDirection: 'row' },

    // 🆕 section head
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
    glowBar: { width: 4, height: 18, borderRadius: 2 },
    sectionTitleText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 2.5 },
    sectionLine: { flex: 1, height: 1.5, borderRadius: 1 },
    sectionDiamond: { width: 7, height: 7, transform: [{ rotate: '45deg' }], shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },

    bioContainer: { padding: 22, overflow: 'hidden', position: 'relative' }, 
    glowTrail: { position: 'absolute', width: 80, height: '200%', top: '-50%', opacity: 0.1, transform: [{ rotate: '35deg' }] },
    quoteIcon: { position: 'absolute', top: 12, left: 12 },
    bioStar: { position: 'absolute', right: -6, bottom: -8 },
    bioText: { color: '#E2E8F0', lineHeight: 24, fontSize: 14, fontWeight: '600', textAlign: 'justify', zIndex: 5 },
    hobbiesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    hobbyPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, overflow: 'hidden' }, 
    hobbyLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    actionRowMass: { flexDirection: 'row', gap: 15, marginTop: 40, marginBottom: 10 },
    actionBtnMass: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 20, overflow: 'hidden' },
    blockBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)', borderWidth: 1 },
    actionBtnTextMass: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    trustBanner: { marginTop: 25, alignSelf: 'center' },
    trustInner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 10 },
    trustImgBox: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    trustLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#0A0F22', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40, borderWidth: 1.3, borderBottomWidth: 0 },
    modalIconRing: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    modalTitle: { color: '#EF4444', fontSize: 20, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
    modalSubText: { color: '#94A3B8', fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 },
    modalLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
    reasonBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1.2 },
    reasonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    cancelBtn: { marginTop: 15, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)' },
    cancelBtnText: { color: '#94A3B8', fontSize: 13, fontWeight: '900', letterSpacing: 1 }
});