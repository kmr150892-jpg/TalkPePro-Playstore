import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture'; // 🔒 NEW: screenshot / screen record block
import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useContext, useEffect, useRef, useState } from 'react'; // 🔥 SATTI UPDATE: Added useContext here
import {
    ActivityIndicator,
    Alert,
    Animated,
    AppState,
    Dimensions,
    Easing,
    Image,
    Modal,
    Platform,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { auth, db } from '../firebaseConfig';
import { BlockContext } from '../utils/context/BlockContext'; // 🔥 SATTI UPDATE: BlockContext Imported Here
import { checkAndRequestCallPermissions } from '../utils/permissions';
import { useCallOutcomeNotifier } from '../utils/useCallOutcomeNotifier'; // 🔔 NEW: host reject / miss aanaa user bell-ku notification

const { height, width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// 🔥 BUG FIX (FIRST CALL CUT): camera/mic permission dialog moodina udane app konja neram 'inactive' state-la irukkum.
// Andha time-la call start panna first call cut aagum. So dialog close aagi app 'active' aagura varaikkum wait panni,
// pinnaadi konjam settle time (500ms) kuduthu thaan call-a continue pannuvom. (max 3s wait - hang aagaadhu)
const waitForAppActive = (timeoutMs: number = 3000): Promise<void> =>
    new Promise((resolve) => {
        const settle = () => setTimeout(resolve, 500);
        if (AppState.currentState === 'active') {
            settle();
            return;
        }
        let done = false;
        const sub = AppState.addEventListener('change', (state) => {
            if (state === 'active' && !done) {
                done = true;
                sub.remove();
                clearTimeout(timer);
                settle();
            }
        });
        const timer = setTimeout(() => {
            if (!done) {
                done = true;
                sub.remove();
                resolve();
            }
        }, timeoutMs);
    });

// 🔥 MASS UPDATE: ACCURATE THEME ENGINE (LOCKED DEEP-GLOW COLORS)
const getLevelTheme = (beans: number = 0) => {
    if (beans >= 100000000) return { lvl: 10, label: 'LEGEND L10', color: '#ff0404', grad: ['#ff0404', '#df03ee'] as const, shadow: '#F59E0B60' };
    if (beans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', color: '#f40691', grad: ['#f40691', '#0a0303'] as const, shadow: '#EC489960' };
    if (beans >= 30000000) return { lvl: 8, label: 'ELITE L8', color: '#660aee', grad: ['#660aee', '#d40808'] as const, shadow: '#8B5CF660' };
    if (beans >= 10000000) return { lvl: 7, label: 'MASTER L7', color: '#0af635', grad: ['#0af635', '#fd068a'] as const, shadow: '#3B82F660' };
    if (beans >= 5000000) return { lvl: 6, label: 'DIAMOND L6', color: '#f70606', grad: ['#f70606', '#fad906'] as const, shadow: '#06B6D460' };
    if (beans >= 3000000) return { lvl: 5, label: 'PLATINUM L5', color: '#136a3e', grad: ['#136a3e', '#f6085b'] as const, shadow: '#10B98160' };
    if (beans >= 1000000) return { lvl: 4, label: 'GOLD L4', color: '#ffd001', grad: ['#ffd001', '#1d00f9'] as const, shadow: '#EAB30860' };
    if (beans >= 300000) return { lvl: 3, label: 'SILVER L3', color: '#bababa', grad: ['#bababa', '#bc0e08'] as const, shadow: '#94A3B860' };
    if (beans >= 100000) return { lvl: 2, label: 'BRONZE L2', color: '#ff8604', grad: ['#ff8604', '#1505fc'] as const, shadow: '#B4530960' };
    if (beans >= 30000) return { lvl: 1, label: 'ROOKIE L1', color: '#03ffc8', grad: ['#03ffc8', '#f64a06'] as const, shadow: '#6366F160' };
    return { lvl: 0, label: 'BEGINNER L0', color: '#f807cf', grad: ['#f807cf', '#2a06f5'] as const, shadow: '#764a7560' };
};

// 🆕 COLOR HELPERS (double colour borders + text-safe shades)
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
    hourglass: 'https://img.icons8.com/3d-fluency/512/hourglass.png',
    shield: 'https://img.icons8.com/3d-fluency/512/shield.png',
    chat: 'https://img.icons8.com/3d-fluency/512/speech-bubble.png',
    coin: 'https://img.icons8.com/3d-fluency/512/coin.png',
    gift: 'https://img.icons8.com/3d-fluency/512/gift.png',
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

// 🆕 Pulse dot (online indicator)
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
        <View style={{ width: size + 8, height: size + 8, justifyContent: 'center', alignItems: 'center' }}>
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
                style={[{ borderRadius: radius - pad, overflow: 'hidden', backgroundColor: 'rgba(5, 7, 20, 0.88)' }, inner]}
                onLayout={shine ? (e) => setCw(e.nativeEvent.layout.width) : undefined}
            >
                {children}
                {shine && <ShineSweep w={cw} delay={shineDelay} />}
            </View>
        </LinearGradient>
    );
};

// 🆕 Section heading (gradient bar icon + title + fading line + diamond)
const SectionHead = ({ title, color, a, b, right }: any) => (
    <View style={styles.sectionHeadRow}>
        <LinearGradient colors={[a, b]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.sectionBar} />
        <Text style={[styles.sectionTitle, { color }]}>{title}</Text>
        <LinearGradient colors={[a + '99', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sectionLine} />
        {right ? right : <View style={[styles.sectionDiamond, { backgroundColor: b, shadowColor: b }]} />}
    </View>
);

// 🆕 Calling ripple (expanding rings behind the avatar)
const Ripple = ({ color, size = 200, delay = 0 }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true })
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
                width: size,
                height: size,
                borderRadius: size / 2,
                borderWidth: 2,
                borderColor: color,
                opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.75, 1.9] }) }]
            }}
        />
    );
};

// 🆕 Stat tile (3D icon image + value + label, double colour frame)
const StatTile = ({ a, b, img, fallback, color, delay, children, label }: any) => (
    <Reveal delay={delay} style={{ flex: 1 }}>
        <DoubleFrame a={a} b={b} radius={26} shine shineDelay={800 + delay * 4}>
            <View style={styles.statTile}>
                <LinearGradient colors={[color + '26', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                <View style={styles.statImgBox}>
                    <View style={[styles.statImgGlow, { backgroundColor: color }]} />
                    <FloatBox amp={4} dur={1700 + delay * 3}>
                        <Img3D uri={img} size={38} fallback={fallback} color={color} />
                    </FloatBox>
                </View>
                {children}
                <Text style={styles.statLabel}>{label}</Text>
            </View>
        </DoubleFrame>
    </Reveal>
);

export default function ExpertDetail() {
    const params = useLocalSearchParams();
    const expertId = (params.id || params.userId) as string; 
    
    const router = useRouter();
    const user = auth.currentUser;

    const { blockUser } = useContext(BlockContext); // 🔥 SATTI UPDATE: Context initialized

    const [expert, setExpert] = useState<any>(null);
    const [isCalling, setIsCalling] = useState(false);
    const [userBalance, setUserBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeCallId, setActiveCallId] = useState<string | null>(null);

    // 🔔 NEW: last call id-ah vechukkum. activeCallId reject aanathum null aagidum,
    // so hook-ku separate state venum, illana listener cleanup aagidum.
    const [lastCallId, setLastCallId] = useState<string | undefined>(undefined);
    useCallOutcomeNotifier(lastCallId);
    
    // 🔥 SATTI FIX: Added a Ref to strictly track call ID in case user presses BACK button abruptly.
    const activeCallIdRef = useRef<string | null>(null); 

    // 🔥 BUG FIX (FIRST CALL CUT): permission dialog open-a irukkum bodhu (10-20s aagalaam) host status maaralaam,
    // so dialog-ku pinnaadi LATEST expert data-va check panna ref use pannrom.
    const expertRef = useRef<any>(null);
    expertRef.current = expert;
    // 🔥 BUG FIX: permission flow nadakkum bodhu thirumba call button tap panna (double-start) block pannum
    const permBusyRef = useRef(false);
    
    const [userData, setUserData] = useState<any>(null);
    const [connectionStatus, setConnectionStatus] = useState<string | null>(null); 
    const [followLoading, setFollowLoading] = useState(false);
    const [isBlockedByExpert, setIsBlockedByExpert] = useState(false);

    // 🔥 SATTI UPDATE: Block & Report Admin Setup
    const [blockModalVisible, setBlockModalVisible] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);
    const blockReasons = [
        "Abusive Language / Harassment",
        "Inappropriate Behavior / Nudity",
        "Scam / Spam / Phishing",
        "Threatening / Aggressive",
        "Other Unwanted Contact"
    ];

    const unsubCallRef = useRef<(() => void) | null>(null);
    const ringTimerAnim = useRef(new Animated.Value(1)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current; 
    const radius = 75;
    const stroke = 6;
    const circumference = radius * 2 * Math.PI;

    // 🆕 PREMIUM ANIMATION VALUES
    const scrollY = useRef(new Animated.Value(0)).current;   // hero parallax
    const galleryX = useRef(new Animated.Value(0)).current;  // gallery 3D tilt
    const rotAnim = useRef(new Animated.Value(0)).current;   // avatar spinning ring
    const pulseAnim = useRef(new Animated.Value(0)).current; // glow pulse
    const heroIn = useRef(new Animated.Value(0)).current;    // hero entrance
    const [barW, setBarW] = useState(0);                     // call button shine width
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

    // 🔒 NEW: SCREENSHOT / SCREEN RECORD BLOCK (Host Profile screen)
    // Screen open aagumbodhu capture lock pōdum, screen close aagumbodhu mattum release pannum.
    // Thani key use panradhunaala video call screen-oda lock-ku onnum aagaadhu.
    useEffect(() => {
        const SECURE_KEY = 'EXPERT_DETAIL_SECURE';
        ScreenCapture.preventScreenCaptureAsync(SECURE_KEY).catch((e) => console.log('Screen capture block error:', e));
        return () => {
            ScreenCapture.allowScreenCaptureAsync(SECURE_KEY).catch((e) => console.log('Screen capture release error:', e));
        };
    }, []);

    const getJoinedDuration = (createdAt: any) => {
        if (!createdAt) return '1 Day';
        const joinedDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - joinedDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return '1 Day';
        if (diffDays < 30) return `${diffDays} Days`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} Mo`;
        return `${Math.floor(diffDays / 365)} Yr`;
    };

    const onShare = async () => {
        try {
            await Share.share({
                message: `Connect with ${expert?.name} on TALKPE PRO! Verified Professional Host. Download now!`,
                url: `https://talkpe.com/expert/${expertId}`,
            });
        } catch (error: any) { Alert.alert(error.message); }
    };

    // 🔥 SATTI FIX: UNMOUNT SAFETY. Stops the call if user leaves the screen without pressing Cancel.
    useEffect(() => {
        return () => {
            // 🔥 BUG FIX: call listener-a screen unmount aagumbodhu mattum thaan close pannanum
            // (munnaadi idhu mela irukkura main effect cleanup-la irundhuchu - adhu re-run aanaa call listener kollapadum)
            if (unsubCallRef.current) {
                unsubCallRef.current();
                unsubCallRef.current = null;
            }
            if (activeCallIdRef.current) {
                // Keep local reference to avoid closure issues
                const cid = activeCallIdRef.current;
                updateDoc(doc(db, "calls", cid), { 
                    status: 'cancelled',
                    updatedAt: serverTimestamp(),
                    endedAt: serverTimestamp()
                }).catch(e => console.log("Unmount cancel error: ", e));
            }
        };
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

        if (!expertId) {
            setLoading(false);
            return;
        }

        const unsubExpert = onSnapshot(doc(db, 'users', expertId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.blockedUsers?.includes(user?.uid)) {
                    setIsBlockedByExpert(true);
                    setLoading(false);
                    return; 
                }
                setIsBlockedByExpert(false);
                setExpert({ id: docSnap.id, ...data });
            }
            setLoading(false);
        });

        let unsubUser: () => void;
        let unsubFollow: () => void;

        if (user?.uid) {
            unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserData(data);
                    setUserBalance(data.balance || 0);
                }
            });

            const connectionId = `${user.uid}_${expertId}`;
            unsubFollow = onSnapshot(doc(db, "connections", connectionId), (docSnap) => {
                if (docSnap.exists()) setConnectionStatus(docSnap.data().status); 
                else setConnectionStatus(null);
            });
        }
        
        return () => { 
            unsubExpert(); 
            if (unsubUser) unsubUser(); 
            if (unsubFollow) unsubFollow();
            // 🔥 BUG FIX: ingaye irundha call listener close panna code remove pannitten.
            // Ippo idhu 'user' object maarina re-run aagum bodhu call listener-a kollum -> accept aanaalum screen maaraama call 'missed' aagi cut aagum.
            // Call listener cleanup ippo mela irukkura unmount-only effect-la irukku.
        };
    }, [expertId, user?.uid]); // 🔥 BUG FIX: 'user' object-ku badhila 'user?.uid' (object reference maaraadhu)

    // 🆕 PREMIUM AMBIENT LOOPS (avatar ring spin, glow pulse, hero entrance, floating particles)
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

    // 🔥 SATTI UPDATE: Block & Admin Report Core Engine 🔥
    const handleReasonSelect = (reason: string) => {
        if (!expert || !user) return;

        const alreadyBlocked = Array.isArray(userData?.blockedUsers) && userData.blockedUsers.includes(expertId);
        
        if (alreadyBlocked) {
            Alert.alert(
                "ACTION RESTRICTED", 
                "This host is already in your blacklist. Please manage them via Security Settings if you wish to restore access."
            );
            setBlockModalVisible(false);
            return;
        }

        Alert.alert(
            "CONFIRM BLOCK",
            `Are you sure you want to block ${expert.name}?\n\nReason: ${reason}`,
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
        const myUid = user!.uid;

        try {
            // Update my doc
            await updateDoc(doc(db, "users", myUid), { blockedUsers: arrayUnion(expertId) });
            // Update expert's block count
            await updateDoc(doc(db, "users", expertId), { expertBlockCount: increment(1) });
            
            // Push alert to admin
            await addDoc(collection(db, "admin_alerts"), {
                type: 'USER_BLOCKED_EXPERT', 
                expertId: expertId, 
                expertName: expert.name || "Unknown Expert",
                userId: myUid, 
                userName: userData?.name || user?.displayName || "TalkPe User", 
                reason: reason,
                timestamp: serverTimestamp(), 
                status: 'unread'
            });

            // Trigger local context block to clear app feeds
            blockUser(expertId); 

            Alert.alert("HOST BLOCKED", `${expert.name} has been successfully restricted and reported to safety moderation.`, [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error) {
            Alert.alert("SYSTEM ERROR", "Unable to complete blocking protocol. Please check your connection.");
        } finally {
            setIsBlocking(false); 
            setBlockModalVisible(false);
        }
    };

    const handleFollowAction = async () => {
        if (!user) return Alert.alert("Login Required", "Please login to connect with hosts.");
        if (connectionStatus === 'friend') return router.push('/friends' as any);
        if (!userData) return Alert.alert("Wait", "User data is loading...");

        setFollowLoading(true);
        const connectionId = `${user.uid}_${expertId}`;
        try {
            if (connectionStatus === null) {
                await setDoc(doc(db, "connections", connectionId), {
                    senderId: user.uid,
                    senderName: userData.userName || userData.name || "TalkPe Pro User",
                    senderImage: userData.profilePic || userData.profileImage || "",
                    receiverId: expertId,
                    status: "pending",
                    timestamp: serverTimestamp(),
                });
                Alert.alert("Sent", "Connection request sent!");
            } else {
                await deleteDoc(doc(db, "connections", connectionId));
            }
        } catch (error) { console.error(error); } finally { setFollowLoading(false); }
    };

    const handleCancelCall = async () => {
        ringTimerAnim.stopAnimation();
        
        // 🔥 SATTI FIX: Grab the active ID from both state and ref for 100% reliability BEFORE clearing it
        const cid = activeCallId || activeCallIdRef.current;
        
        if (unsubCallRef.current) {
            unsubCallRef.current();
            unsubCallRef.current = null;
        }

        if (cid) {
            try { 
                await updateDoc(doc(db, "calls", cid), { 
                    status: 'cancelled',
                    updatedAt: serverTimestamp(), // 🔥 This tells Backend to stop the host's ring notification!
                    endedAt: serverTimestamp() 
                }); 
            } catch (err) { console.error(err); }
        }

        setIsCalling(false);
        deactivateKeepAwake();
        setActiveCallId(null);
        activeCallIdRef.current = null; // Syncing the ref AFTER database update
    };

    const handleStartCall = async () => {
        // 🔥 BUG FIX: permission flow already nadakkudhu-na thirumba start aagaadhu
        if (permBusyRef.current) return;

        if (!expert?.isOnline) return Alert.alert("Host Offline 💤", "This host is currently offline.");
        
        if (expert?.status === 'live' || expert?.isLive === true || expert?.isLive === "true") {
            return Alert.alert("Host is Live 🔴", "This host is currently hosting a live broadcast. Please join the session instead.");
        }
        
        if (expert?.isBusy === true || expert?.isBusy === "true") {
            return Alert.alert("Host is Busy ⏳", `${expert.name} is currently assisting another user. Please try again shortly.`);
        }

        // 🔥 BUG FIX (FIRST CALL CUT): permission dialog moodina piragu app 'active' aagi settle aagura varaikkum wait pannuvom
        permBusyRef.current = true;
        let hasPermission = false;
        try {
            hasPermission = await checkAndRequestCallPermissions();
            if (hasPermission) {
                await waitForAppActive();
            }
        } finally {
            permBusyRef.current = false;
        }
        if (!hasPermission) {
            return; 
        }

        // 🔥 BUG FIX: dialog open-a irundha neram host offline / live / busy aagiruntha LATEST data-vaiye thirumba check pannrom
        const latestExpert = expertRef.current || expert;
        if (!latestExpert?.isOnline) return Alert.alert("Host Offline 💤", "This host is currently offline.");
        if (latestExpert?.status === 'live' || latestExpert?.isLive === true || latestExpert?.isLive === "true") {
            return Alert.alert("Host is Live 🔴", "This host is currently hosting a live broadcast. Please join the session instead.");
        }
        if (latestExpert?.isBusy === true || latestExpert?.isBusy === "true") {
            return Alert.alert("Host is Busy ⏳", `${latestExpert.name} is currently assisting another user. Please try again shortly.`);
        }

        if (!userData || (!userData.name && !userData.userName)) return Alert.alert("Syncing Profile...", "Please wait a moment.");
        
        const priceToCharge = Number(expert.userPrice || (expert.beansPerMin * 2) || (expert.pricePerMin * 2) || 2400);
        
        const validFreeMins = Number(userData?.freeMinsRemaining || 0);
        const isFreeCall = (userData?.isWelcomeCallAvailable === true) || (validFreeMins > 0.05);

        if (!isFreeCall && userBalance < priceToCharge) {
            Alert.alert("Insufficient Assets! 💎", `Requires ${priceToCharge.toLocaleString()} diamonds for a 1 min call.`, [
                { text: "Later", style: "cancel" }, { text: "Add Assets", onPress: () => router.push('/recharge' as any) }
            ]);
            return;
        }

        const proceedToCall = async () => {
            setIsCalling(true);

            if (isFreeCall) {
                try {
                    let deviceId = "unknown_device";
                    if (Platform.OS === 'android') {
                        deviceId = Application.getAndroidId() || "android_unknown";
                    } else if (Platform.OS === 'ios') {
                        deviceId = await Application.getIosIdForVendorAsync() || "ios_unknown";
                    }

                    const deviceRef = doc(db, "used_devices", deviceId);
                    const deviceSnap = await getDoc(deviceRef);

                    if (deviceSnap.exists()) {
                        const deviceData = deviceSnap.data();
                        
                        if (deviceData.userId !== user?.uid) {
                            setIsCalling(false);
                            Alert.alert(
                                "Privilege Claimed 🚫", 
                                "This device has already utilized the Complimentary Call on another account. Please add assets to continue consulting.",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Add Assets", onPress: () => router.push('/recharge' as any) }
                                ]
                            );
                            
                            if (user) {
                                await updateDoc(doc(db, "users", user.uid), {
                                    isWelcomeCallAvailable: false,
                                    freeMinsRemaining: 0
                                });
                            }
                            return; 
                        }
                    } else {
                        await setDoc(deviceRef, {
                            usedAt: serverTimestamp(),
                            userId: user?.uid,
                            hardwareId: deviceId
                        });
                    }
                } catch (e) {
                    console.log("Device security verification error:", e);
                }
            }

            initiateCall(priceToCharge, isFreeCall);
        };

        if (isFreeCall) {
            Alert.alert(
                "Welcome Privilege! 🎉", 
                "You have a COMPLIMENTARY call available. Do you want to use it now?",
                [
                    { text: "Not Now", style: "cancel" },
                    { text: "Yes, Start Session", onPress: proceedToCall }
                ]
            );
        } else {
            proceedToCall();
        }
    };

    const initiateCall = async (priceToCharge: number, isFreeCall: boolean) => {
        await activateKeepAwakeAsync(); 
        try {
            const callRef = await addDoc(collection(db, "calls"), {
                callerId: user?.uid || "UNKNOWN_USER",
                callerName: userData?.userName || userData?.name || "TalkPe Pro User",
                callerImage: userData?.profilePic || userData?.profileImage || "",
                expertId: expert.id,
                expertName: expert.name,
                expertImage: expert.profilePic || expert.expertImage || expert.profileImage || "",
                status: 'calling', 
                
                userId: user?.uid,
                userName: userData?.userName || userData?.name || "TalkPe Pro User",
                userImage: userData?.profilePic || userData?.profileImage || "",
                pricePerMin: isFreeCall ? 0 : priceToCharge, 
                isFreeCall: isFreeCall, 
                isFreeTrial: isFreeCall, 
                createdAt: serverTimestamp(), 
                totalDiamonds: 0,
                expertEarnings: 0,
                finalDuration: 0
            });

            // 🔥 SATTI FIX: Save to both state and ref
            setActiveCallId(callRef.id);
            activeCallIdRef.current = callRef.id;
            setLastCallId(callRef.id); // 🔔 NEW: reject / missed aanaa notification varum

            ringTimerAnim.setValue(1);
            Animated.timing(ringTimerAnim, {
                toValue: 0,
                duration: 12000,
                easing: Easing.linear,
                useNativeDriver: false,
            }).start(({ finished }) => {
                if (finished) handleTimeout(callRef.id);
            });

            unsubCallRef.current = onSnapshot(doc(db, "calls", callRef.id), (snap) => {
                if (snap.exists()) {
                    const callData = snap.data();
                    if (callData.status === 'accepted') {
                        if (unsubCallRef.current) unsubCallRef.current();
                        unsubCallRef.current = null;
                        ringTimerAnim.stopAnimation();
                        setIsCalling(false);
                        deactivateKeepAwake();
                        
                        // 🔥 Clear state and ref securely
                        setActiveCallId(null);
                        activeCallIdRef.current = null;
                        
                        router.push({
                            pathname: "/videocall",
                            params: { 
                                expertId: expert.id, 
                                expertName: expert.name, 
                                price: isFreeCall ? 0 : priceToCharge, 
                                callId: callRef.id,
                                isFree: isFreeCall ? "true" : "false" 
                            }
                        } as any);
                    } else if (['rejected', 'missed', 'cancelled', 'timeout'].includes(callData.status)) {
                        if (unsubCallRef.current) unsubCallRef.current();
                        unsubCallRef.current = null;
                        ringTimerAnim.stopAnimation();
                        setIsCalling(false);
                        deactivateKeepAwake();
                        
                        // 🔥 Clear state and ref securely
                        setActiveCallId(null);
                        activeCallIdRef.current = null;
                        
                        if (callData.status === 'rejected') Alert.alert("Engaged", "The host is currently engaged.");
                    }
                }
            });
        } catch (err) {
            setIsCalling(false);
            Alert.alert("Error", "Could not initiate call session.");
        }
    };

    const handleTimeout = async (cid: string) => {
        try {
            if (unsubCallRef.current) { unsubCallRef.current(); unsubCallRef.current = null; }
            await updateDoc(doc(db, "calls", cid), { 
                status: 'missed',
                updatedAt: serverTimestamp() // 🔥 Notifies backend even on timeouts
            });
            setIsCalling(false);
            deactivateKeepAwake();
            setActiveCallId(null);
            activeCallIdRef.current = null;
        } catch (e) { console.log(e); }
    };

    const handleJoinLive = async () => {
        try {
            const liveQuery = query(collection(db, "lives"), where("hostId", "==", expert.id), where("status", "==", "live"));
            const liveSnap = await getDocs(liveQuery);

            if (!liveSnap.empty) {
                const actualLiveId = liveSnap.docs[0].id;
                router.push({
                    pathname: '/live/[liveId]' as any, 
                    params: { liveId: actualLiveId }
                });
            } else {
                Alert.alert("Broadcast Concluded", "Host is not currently broadcasting or the session has concluded.");
            }
        } catch (e) {
            Alert.alert("Error", "Could not join the live session right now.");
        }
    };

    if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#6366F1" /></View>;

    if (isBlockedByExpert) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <Ionicons name="eye-off-outline" size={80} color="#1E293B" />
                <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 20 }}>Profile Not Available</Text>
                <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 10 }}>This account is currently restricted. Please explore other hosts.</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 30, backgroundColor: '#334155', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 15 }}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>Go Back</Text></TouchableOpacity>
            </View>
        );
    }

    const theme = getLevelTheme(expert?.totalBeansEarned || 0);
    const accentColor = expert?.isOnline ? theme.color : '#475569';
    const isExpertLive = expert?.status === 'live' || expert?.isLive === true || expert?.isLive === "true"; 
    const followThemeColor = connectionStatus === 'friend' ? '#1E293B' : (connectionStatus === 'pending' ? '#F59E0B' : theme.color);

    // 🆕 DOUBLE COLOUR PAIR (darker shade): grad[0] + grad[1] (L0 = pink + blue)
    const bA = darken(vivid(theme.grad[0], 0.3), 0.15);
    const bB = darken(vivid(theme.grad[1], 0.3), 0.15);
    const textColor = lighten(theme.color, 0.35); // 🆕 text-safe colour
    const textColor2 = lighten(theme.grad[1], 0.55);

    // 🆕 per-side double colour border (top/left = A, bottom/right = B)
    const sideMix: any = {
        borderTopColor: bA,
        borderLeftColor: bA,
        borderBottomColor: bB,
        borderRightColor: bB,
    };

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -30]
    });

    const borderType1 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: theme.color,
        borderRightColor: theme.color,
        borderTopColor: theme.grad[1] + '80', 
        borderBottomColor: theme.grad[1] + '80', 
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    const borderType2 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: theme.grad[1],
        borderRightColor: theme.grad[1],
        borderTopColor: theme.color + '80',
        borderBottomColor: theme.color + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    const validFreeMinsUI = Number(userData?.freeMinsRemaining || 0);
    const hasFreeCallUI = (userData?.isWelcomeCallAvailable === true) || (validFreeMinsUI > 0.05);

    // 🆕 Interpolations
    const spin = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const glowOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] });
    const crestScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
    const heroTY = scrollY.interpolate({ inputRange: [-250, 0, 300], outputRange: [-125, 0, 120], extrapolate: 'clamp' });
    const heroScale = scrollY.interpolate({ inputRange: [-250, 0, 300], outputRange: [1.6, 1, 1], extrapolate: 'clamp' });
    const heroFade = scrollY.interpolate({ inputRange: [0, 260], outputRange: [1, 0.35], extrapolate: 'clamp' });
    const bgShift = scrollY.interpolate({ inputRange: [0, 1500], outputRange: [0, -260], extrapolate: 'clamp' });

    const GALLERY_STEP = 153; // item width 138 + margin 15

    const callGradColors =
        !expert?.isOnline ? (['#1E293B', '#0F172A'] as const) :
        (expert?.isBusy === true || expert?.isBusy === "true") ? (['#F59E0B', '#B45309'] as const) :
        theme.grad;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            
            {/* 🆕 DARKER BACKGROUND (level tint 30 -> 22) */}
            <LinearGradient colors={['#020617', theme.grad[1] + '22', '#020617']} style={StyleSheet.absoluteFill} />
            <Animated.View style={[styles.shimmerOrb, { top: 250, right: -60, backgroundColor: theme.color, transform: [{ translateY: Animated.add(orbTranslateY, bgShift) }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 600, left: -90, backgroundColor: theme.grad[1], transform: [{ translateY: Animated.add(Animated.multiply(orbTranslateY, -1), bgShift) }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 950, right: -80, backgroundColor: theme.color, transform: [{ translateY: Animated.add(orbTranslateY, bgShift) }] }]} />

            {/* 🆕 Floating 3D background objects with scroll parallax */}
            <Animated.View pointerEvents="none" style={[styles.bgFloat, { top: 520, right: 12, opacity: 0.16, transform: [{ translateY: bgShift }] }]}>
                <FloatBox amp={14} dur={2600}>
                    <Img3D uri={IMG.diamond} size={62} fallback="diamond-stone" color={theme.color} />
                </FloatBox>
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.bgFloat, { top: 820, left: 8, opacity: 0.14, transform: [{ translateY: bgShift }] }]}>
                <FloatBox amp={10} dur={2200}>
                    <Img3D uri={IMG.coin} size={50} fallback="circle-multiple" color={theme.color} />
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
                        backgroundColor: [theme.color, theme.grad[1], '#FFFFFF'][i % 3],
                        opacity: p.v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.7, 0.4, 0] }),
                        transform: [{ translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, -300] }) }]
                    }}
                />
            ))}

            {isCalling && (
                <View style={styles.callingOverlay}>
                    <LinearGradient colors={['rgba(2, 6, 23, 0.98)', '#0A0F24']} style={StyleSheet.absoluteFill} />
                    {/* 🆕 soft level glow behind the call */}
                    <View style={[styles.callGlow, { backgroundColor: theme.color + '14' }]} pointerEvents="none" />
                    <Sparkle x={width * 0.16} y={height * 0.2} size={14} color={textColor} delay={0} />
                    <Sparkle x={width * 0.8} y={height * 0.26} size={11} color={textColor2} delay={600} />
                    <Sparkle x={width * 0.22} y={height * 0.7} size={12} color={textColor2} delay={1100} />
                    <View style={styles.timerWrapper}>
                        {/* 🆕 ripple rings + orbit rings */}
                        <Ripple color={bA} size={200} delay={0} />
                        <Ripple color={bB} size={200} delay={800} />
                        <Ripple color={bA} size={200} delay={1600} />
                        <OrbitRing size={190} color={textColor} dur={6000} dotSize={6} />
                        <OrbitRing size={174} color={textColor2} dur={9000} reverse dotSize={4} style={{ opacity: 0.7 }} />
                        <Svg width={(radius + stroke) * 2} height={(radius + stroke) * 2} style={styles.timerSvg}>
                            <Circle cx={radius + stroke} cy={radius + stroke} r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} fill="transparent" />
                            <AnimatedCircle
                                cx={radius + stroke} cy={radius + stroke} r={radius} stroke={theme.color} strokeWidth={stroke} fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={ringTimerAnim.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })}
                                strokeLinecap="round"
                            />
                        </Svg>
                        <View style={styles.callingAvatarContainer}><Image source={{ uri: expert?.profilePic || expert?.profileImage || 'https://via.placeholder.com/400' }} style={styles.callingAvatar} /></View>
                    </View>
                    <Text style={styles.callingText}>Connecting to {expert?.name}...</Text>
                    <Text style={[styles.callingSubtext, { color: textColor2 }]}>Establishing Secure Link... 💎</Text>
                    <TouchableOpacity style={styles.cancelCallBtn} onPress={handleCancelCall}>
                        <View style={styles.cancelCircle}><Ionicons name="close" size={32} color="#FFF" /></View>
                        <Text style={styles.cancelLabel}>CANCEL</Text>
                    </TouchableOpacity>
                </View>
            )}

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 150 }}
                scrollEventThrottle={16}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
            >
                <View style={styles.imageWrapper}>
                    {/* 🆕 PARALLAX COVER (stretches on pull-down, slides slower on scroll) */}
                    <View style={styles.heroClip}>
                        <Animated.View style={[StyleSheet.absoluteFill, { opacity: heroFade, transform: [{ translateY: heroTY }, { scale: heroScale }] }]}>
                            <Image source={{ uri: expert?.coverPhoto || expert?.profilePic || 'https://via.placeholder.com/600x800' }} style={styles.profileImg} />
                        </Animated.View>
                        <LinearGradient colors={['rgba(2, 6, 23, 0.55)', 'rgba(2, 6, 23, 0.05)', '#020617']} style={StyleSheet.absoluteFill} />
                        <LinearGradient colors={['transparent', bA + '30']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                        <Sparkle x={width * 0.14} y={height * 0.12} size={12} color={textColor} delay={0} />
                        <Sparkle x={width * 0.84} y={height * 0.2} size={10} color={textColor2} delay={700} />
                    </View>
                    
                    {/* 🆕 AVATAR CORE: spinning double colour ring + orbit rings + 3D crown */}
                    <Animated.View style={[styles.coverAvatarNode, { opacity: heroIn, transform: [{ scale: crestScale }] }]}>
                        <Animated.View style={[styles.avatarGlow, { backgroundColor: theme.color, opacity: glowOpacity }]} />
                        <OrbitRing size={134} color={textColor} dur={5200} dotSize={6} />
                        <OrbitRing size={120} color={textColor2} dur={8000} reverse dotSize={4} style={{ opacity: 0.7 }} />
                        <View style={[styles.avatarMask, { shadowColor: theme.color }]}>
                            <Animated.View style={[styles.avatarSpin, { transform: [{ rotate: spin }] }]}>
                                <LinearGradient colors={[bA, bB, bA, bB, bA]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                            </Animated.View>
                            <Image 
                                source={{ uri: expert?.profilePic || expert?.profileImage || 'https://via.placeholder.com/150' }} 
                                style={styles.expertMainAvatar} 
                            />
                        </View>
                        <FloatBox amp={4} dur={1500} style={styles.avatarCrown}>
                            <Img3D uri={IMG.crown} size={36} fallback="crown" color={textColor} />
                        </FloatBox>
                        <LinearGradient colors={[bA, bB]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.avatarLevelBadge}>
                            <MaterialCommunityIcons name="star-circle" size={11} color="#FFF" style={{ marginRight: 4 }} />
                            <Text style={styles.avatarLevelText}>{theme.label}</Text>
                        </LinearGradient>
                    </Animated.View>

                    <View style={styles.navRow}>
                        <TouchableOpacity onPress={() => router.back()} style={[styles.iconCircle, sideMix]}><Ionicons name="chevron-back" size={24} color="#FFF" /></TouchableOpacity>
                        
                        {/* 🔥 SATTI UPDATE: Changed to Block & Report Modal Trigger */}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => setBlockModalVisible(true)} style={[styles.iconCircle, sideMix]}>
                                <MaterialCommunityIcons name="shield-off" size={22} color="#EF4444" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onShare} style={[styles.iconCircle, sideMix]}>
                                <Ionicons name="share-social-outline" size={22} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                    </View>
                </View>

                <View style={styles.infoContent}>
                    <View style={styles.nameRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.expertName}>{expert?.name}</Text>
                            <View style={styles.locationRow}>
                                <Ionicons name="location-sharp" size={14} color={textColor} />
                                <Text style={styles.locationText}>{expert?.location || 'India'} • {expert?.age || '24'}y • {expert?.gender}</Text>
                            </View>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 10 }}>
                            <View style={[styles.statusBadge, { backgroundColor: expert?.isOnline ? '#10B98115' : '#33415520', borderColor: expert?.isOnline ? '#10B98130' : '#334155', borderWidth: 1 }]}>
                                {expert?.isOnline ? <PulseDot color="#10B981" size={6} /> : <View style={[styles.dot, { backgroundColor: '#94A3B8' }]} />}
                                <Text style={[styles.statusText, {color: expert?.isOnline ? '#10B981' : '#94A3B8'}]}>{expert?.isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
                            </View>
                            <TouchableOpacity 
                                style={[styles.followBtn, { shadowColor: followThemeColor }]} 
                                onPress={handleFollowAction} disabled={followLoading}>
                                <LinearGradient
                                    colors={connectionStatus === null ? [bA, bB] : [followThemeColor, darken(followThemeColor, 0.3)]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.followBtnInner}
                                >
                                    <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']} style={styles.followGloss} pointerEvents="none" />
                                    {followLoading ? <ActivityIndicator size="small" color="#FFF" /> : (
                                        <>
                                            <MaterialCommunityIcons name={connectionStatus === 'friend' ? "account-check" : connectionStatus === 'pending' ? "account-clock" : "account-plus"} size={18} color="#FFF" />
                                            <Text style={styles.followBtnText}>{connectionStatus === 'friend' ? "Connected" : connectionStatus === 'pending' ? "Waiting" : "Connect"}</Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* 🆕 3 SEPARATE 3D STAT TILES (double colour frame + floating 3D image) */}
                    <View style={styles.statsRow}>
                        <StatTile a={bA} b={bB} img={IMG.trophy} fallback="trophy" color={textColor} delay={0} label="Host Tier">
                            <Text style={[styles.statVal, { color: textColor }]} numberOfLines={1} adjustsFontSizeToFit>{theme.label.split(' ')[0]}</Text>
                        </StatTile>
                        <StatTile a={bB} b={bA} img={IMG.diamond} fallback="diamond-stone" color={textColor2} delay={90} label="Per Minute Fee">
                            <Text style={[styles.statVal, { fontSize: 20 }]} numberOfLines={1} adjustsFontSizeToFit>{Number(expert?.userPrice || (expert?.beansPerMin * 2) || 0).toLocaleString()}</Text>
                        </StatTile>
                        <StatTile a={bA} b={bB} img={IMG.hourglass} fallback="timer-sand" color={textColor} delay={180} label="Platform Tenure">
                            <Text style={styles.statVal} numberOfLines={1} adjustsFontSizeToFit>{getJoinedDuration(expert?.createdAt)}</Text>
                        </StatTile>
                    </View>

                    {expert?.expertiseTags && expert.expertiseTags.length > 0 && (
                        <Reveal delay={120} style={styles.chipSection}>
                            <SectionHead title="Expertise In" color={textColor} a={bA} b={bB} />
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                                {expert.expertiseTags.map((tag: string, index: number) => (
                                    <DoubleFrame key={index} a={index % 2 === 0 ? bA : bB} b={index % 2 === 0 ? bB : bA} radius={25} pad={1.3} inner={{ backgroundColor: 'rgba(5, 7, 20, 0.9)' }}>
                                        <View style={styles.chipItem}>
                                            <LinearGradient colors={[theme.color + '22', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                            <MaterialCommunityIcons name="star-four-points" size={9} color={textColor} style={{ marginRight: 6 }} />
                                            <Text style={[styles.chipText, { color: textColor }]}>{tag.toUpperCase()}</Text>
                                        </View>
                                    </DoubleFrame>
                                ))}
                            </ScrollView>
                        </Reveal>
                    )}

                    <Reveal delay={160} style={{ marginTop: 15 }}>
                        <SectionHead title="Host Overview" color={textColor} a={bA} b={bB} />
                        <DoubleFrame a={bB} b={bA} radius={32} shine shineDelay={1500} style={{ marginTop: 15 }}>
                            <View style={styles.bioContainer}>
                                <LinearGradient colors={[theme.color + '1F', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                <MaterialCommunityIcons name="format-quote-open" size={24} color={theme.color + '66'} style={styles.quoteIcon} />
                                <View style={styles.bioStar} pointerEvents="none">
                                    <FloatBox amp={6} dur={2400}>
                                        <Img3D uri={IMG.star} size={64} fallback="star" color={theme.color} style={{ opacity: 0.18 }} />
                                    </FloatBox>
                                </View>
                                <Text style={styles.bioText}>{expert?.bio || "Professional host dedicated to providing high-quality guidance and support."}</Text>
                            </View>
                        </DoubleFrame>
                    </Reveal>

                    {expert?.hobbies && expert.hobbies.length > 0 && (
                        <Reveal delay={200} style={[styles.chipSection, { marginTop: 25 }]}>
                            <SectionHead title="Personal Interests" color={textColor} a={bB} b={bA} />
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                                {expert.hobbies.map((tag: string, index: number) => (
                                    <DoubleFrame key={index} a={index % 2 === 0 ? bB : bA} b={index % 2 === 0 ? bA : bB} radius={20} pad={1.2}>
                                        <View style={styles.hobbyChip}><Text style={styles.hobbyText}>{tag}</Text></View>
                                    </DoubleFrame>
                                ))}
                            </ScrollView>
                        </Reveal>
                    )}

                    <Reveal delay={240} style={{ marginTop: 25 }}>
                        <SectionHead
                            title="Portfolio Visuals"
                            color={textColor}
                            a={bA}
                            b={bB}
                            right={<Text style={styles.galleryCount}>{expert?.gallery?.length || 0}/5 SECURE</Text>}
                        />
                    </Reveal>
                    {/* 🆕 3D TILT GALLERY (cards turn in perspective as you swipe) */}
                    <Animated.ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.galleryScroll}
                        contentContainerStyle={{ paddingVertical: 12, paddingRight: 20 }}
                        scrollEventThrottle={16}
                        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: galleryX } } }], { useNativeDriver: true })}
                    >
                        {expert?.gallery?.length > 0 ? expert.gallery.map((img: string, index: number) => {
                            const rng = [(index - 1) * GALLERY_STEP, index * GALLERY_STEP, (index + 1) * GALLERY_STEP];
                            return (
                                <Animated.View
                                    key={index}
                                    style={{
                                        marginRight: 15,
                                        transform: [
                                            { perspective: 800 },
                                            { rotateY: galleryX.interpolate({ inputRange: rng, outputRange: ['32deg', '0deg', '-32deg'], extrapolate: 'clamp' }) },
                                            { scale: galleryX.interpolate({ inputRange: rng, outputRange: [0.9, 1, 0.9], extrapolate: 'clamp' }) }
                                        ]
                                    }}
                                >
                                    <DoubleFrame a={index % 2 === 0 ? bA : bB} b={index % 2 === 0 ? bB : bA} radius={25} pad={2} style={styles.galleryItem} inner={{ padding: 4 }}>
                                        <Image source={{ uri: img }} style={styles.galleryImg} />
                                    </DoubleFrame>
                                </Animated.View>
                            );
                        }) : (
                            <View style={styles.emptyGallery}>
                                <FloatBox amp={5} dur={2000}>
                                    <Img3D uri={IMG.star} size={44} fallback="image-off-outline" color={theme.color} style={{ opacity: 0.5 }} />
                                </FloatBox>
                                <Text style={styles.emptyText}>No visual data found</Text>
                            </View>
                        )}
                    </Animated.ScrollView>

                    <Reveal delay={280}>
                        <DoubleFrame a={bA} b={bB} radius={30} shine shineDelay={2200} style={{ marginTop: 35 }}>
                            <View style={styles.trustBanner}>
                                <LinearGradient colors={[theme.color + '1F', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                <View style={styles.trustImgBox}>
                                    <View style={[styles.statImgGlow, { backgroundColor: theme.color }]} />
                                    <FloatBox amp={4} dur={1800}>
                                        <Img3D uri={IMG.shield} size={42} fallback="shield-lock" color={theme.color} />
                                    </FloatBox>
                                </View>
                                <Text style={[styles.trustText, { color: textColor }]}>Safe & Respectful Community</Text>
                                <MaterialCommunityIcons name="shield-lock" size={20} color={theme.color} />
                            </View>
                        </DoubleFrame>
                    </Reveal>
                </View>
            </Animated.ScrollView>

            {/* 🆕 PREMIUM FLOATING BOTTOM BAR (darker glass, no thin top line, glowing call button) */}
            <View style={styles.bottomBar}>
                <LinearGradient colors={[bA + '22', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                {isExpertLive ? (
                    <TouchableOpacity style={styles.liveActionBtn} onPress={handleJoinLive}>
                        <LinearGradient colors={['#EF4444', '#991B1B']} style={styles.btnGradient}>
                            <MaterialCommunityIcons name="access-point" size={26} color="#FFF" />
                            <View>
                                <Text style={styles.callBtnText}>JOIN LIVE SESSION</Text>
                                <Text style={{color: '#FFF', fontSize: 10, fontWeight: '900'}}>TAP TO CONNECT</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <>
                        <View style={styles.priceInfo}>
                            <Text style={styles.totalLabel}>CALL FEE</Text>
                            <View style={styles.priceRow}>
                                <FloatBox amp={2} dur={1600}>
                                    <Img3D uri={IMG.diamond} size={22} fallback="diamond" color={accentColor} />
                                </FloatBox>
                                <Text style={[styles.totalVal, { color: accentColor }]} numberOfLines={1} adjustsFontSizeToFit>
                                    {hasFreeCallUI ? "COMPLIMENTARY" : Number(expert?.userPrice || (expert?.beansPerMin * 2) || 0).toLocaleString()}
                                    {!hasFreeCallUI && <Text style={{fontSize: 12, color: '#475569'}}>/min</Text>}
                                </Text>
                            </View>
                        </View>
                        
                        <TouchableOpacity 
                            style={styles.callBtnWrap} 
                            onPress={handleStartCall} 
                            disabled={!expert?.isOnline || expert?.isBusy === true || expert?.isBusy === "true"}
                            activeOpacity={0.85}
                        >
                            {/* 🆕 pulsing glow behind the call button */}
                            {expert?.isOnline && !(expert?.isBusy === true || expert?.isBusy === "true") && (
                                <Animated.View style={[styles.callBtnGlow, { backgroundColor: theme.color, opacity: glowOpacity }]} pointerEvents="none" />
                            )}
                            <View style={styles.callBtn} onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
                                <LinearGradient 
                                    colors={callGradColors} 
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.btnGradient}
                                >
                                    <LinearGradient colors={['rgba(255,255,255,0.3)', 'rgba(255,255,255,0)']} style={styles.callGloss} pointerEvents="none" />
                                    <Ionicons name={!expert?.isOnline ? "videocam-off" : (expert?.isBusy === true || expert?.isBusy === "true") ? "time" : "videocam"} size={22} color={expert?.isOnline ? "#FFF" : "#475569"} />
                                    <Text style={[styles.callBtnText, !expert?.isOnline && { color: '#475569' }]}>
                                        {!expert?.isOnline ? "Offline" : (expert?.isBusy === true || expert?.isBusy === "true") ? "Engaged" : "CONNECT NOW"}
                                    </Text>
                                    {expert?.isOnline && !(expert?.isBusy === true || expert?.isBusy === "true") && <ShineSweep w={barW} delay={1200} />}
                                </LinearGradient>
                            </View>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* 🔥 SATTI UPDATE: BLOCK & REPORT MODAL UI 🔥 */}
            <Modal
                visible={blockModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setBlockModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { borderColor: theme.color }, sideMix]}>
                        <View style={{ alignItems: 'center', marginBottom: 15 }}>
                            <View style={[styles.modalIconRing, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                <MaterialCommunityIcons name="shield-off-outline" size={32} color="#EF4444" />
                            </View>
                            <Text style={styles.modalTitle}>BLOCK HOST</Text>
                            <Text style={styles.modalSubText}>
                                Restrict {expert?.name} from contacting you or showing in your feed. This action will be reported for safety moderation.
                            </Text>
                        </View>

                        <Text style={styles.modalLabel}>REASON FOR REPORTING:</Text>
                        {blockReasons.map((reason, idx) => (
                            <TouchableOpacity 
                                key={idx} 
                                style={[styles.reasonBtn, { borderColor: theme.color + '40' }, sideMix]}
                                onPress={() => handleReasonSelect(reason)}
                                disabled={isBlocking}
                            >
                                <Text style={styles.reasonText}>{reason}</Text>
                                <Ionicons name="chevron-forward" size={16} color={theme.color} />
                            </TouchableOpacity>
                        ))}

                        {isBlocking && (
                            <ActivityIndicator size="small" color="#EF4444" style={{ marginTop: 10 }} />
                        )}

                        <TouchableOpacity 
                            style={styles.cancelActionBtn} 
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
    container: { flex: 1, backgroundColor: '#020617' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    // 🆕 darker orbs (0.15 -> 0.09)
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.09, filter: 'blur(80px)' },
    bgFloat: { position: 'absolute' },

    // 🆕 hero
    imageWrapper: { width: '100%', height: height * 0.44, position: 'relative', overflow: 'visible' },
    heroClip: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
    profileImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    coverAvatarNode: { position: 'absolute', bottom: -65, left: '50%', marginLeft: -65, width: 130, height: 130, zIndex: 11, alignItems: 'center', justifyContent: 'center' },
    avatarGlow: { position: 'absolute', width: 110, height: 110, borderRadius: 55 },
    avatarMask: { width: 112, height: 112, borderRadius: 56, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 14, shadowOpacity: 0.8, shadowRadius: 16, shadowOffset: { width: 0, height: 0 } },
    avatarSpin: { position: 'absolute', width: 240, height: 240, left: -64, top: -64 },
    expertMainAvatar: { width: 102, height: 102, borderRadius: 51, borderWidth: 3, borderColor: '#020617' },
    avatarCrown: { position: 'absolute', top: -18, alignSelf: 'center' },
    avatarLevelBadge: { position: 'absolute', bottom: -4, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 13, borderWidth: 2, borderColor: '#020617' },
    avatarLevelText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    navRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 5, paddingTop: 30, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    iconCircle: { backgroundColor: 'rgba(2, 6, 23, 0.62)', padding: 12, borderRadius: 18, borderWidth: 1.3, borderColor: 'rgba(255,255,255,0.1)' },
    infoContent: { padding: 25, paddingTop: 80, minHeight: height },
    nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    expertName: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: -0.5, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    locationText: { color: '#94A3B8', fontSize: 14, fontWeight: '700' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, gap: 8 },
    followBtn: { borderRadius: 20, elevation: 8, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
    followBtnInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, gap: 8, overflow: 'hidden', minWidth: 110, justifyContent: 'center' },
    followGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 16 },
    followBtnText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
    dot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },

    // 🆕 stat tiles (separate 3D tiles, no dividers)
    statsRow: { flexDirection: 'row', gap: 10, marginVertical: 30 },
    statTile: { alignItems: 'center', paddingVertical: 14, paddingHorizontal: 6, minHeight: 128, justifyContent: 'center' },
    statImgBox: { width: 46, height: 46, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    statImgGlow: { position: 'absolute', width: 32, height: 32, borderRadius: 16, opacity: 0.3 },
    statBox: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
    statsCard: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginVertical: 30, paddingVertical: 25, borderRadius: 35, width: width - 40, alignSelf: 'center' },
    priceContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
    vDivider: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center' },
    statVal: { color: '#FFF', fontSize: 17, fontWeight: '900', textAlign: 'center', maxWidth: '100%' },
    statLabel: { color: '#94A3B8', fontSize: 9, marginTop: 6, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },

    chipSection: { marginBottom: 15 },
    chipScroll: { paddingRight: 20, gap: 10, paddingVertical: 12 },
    chipItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, overflow: 'hidden' },
    chipText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    hobbyChip: { paddingHorizontal: 16, paddingVertical: 10 },
    hobbyText: { color: '#CBD5E1', fontSize: 12, fontWeight: '700' },

    // 🆕 section heading
    sectionHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    sectionBar: { width: 4, height: 20, borderRadius: 2 },
    sectionLine: { flex: 1, height: 1.5, borderRadius: 1 },
    sectionDiamond: { width: 7, height: 7, transform: [{ rotate: '45deg' }], shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 0.2 },
    galleryCount: { color: '#94A3B8', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    galleryScroll: { flexDirection: 'row', marginBottom: 10 },
    galleryItem: { borderRadius: 25, overflow: 'hidden', elevation: 10, width: 138 },
    galleryImg: { width: 130, height: 180, resizeMode: 'cover', borderRadius: 20 },
    emptyGallery: { width: width - 50, height: 120, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 30, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#1E293B', gap: 6 },
    emptyText: { color: '#64748B', fontSize: 12, fontWeight: '700' },
    bioContainer: { padding: 25, position: 'relative', overflow: 'hidden' },
    quoteIcon: { position: 'absolute', top: 15, left: 18 },
    bioStar: { position: 'absolute', right: -6, bottom: -8 },
    bioText: { color: '#B6C2D4', lineHeight: 26, fontSize: 15, fontWeight: '600', paddingLeft: 8 },
    trustBanner: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
    trustImgBox: { width: 50, height: 50, justifyContent: 'center', alignItems: 'center' },
    trustText: { fontSize: 12, fontWeight: '800', flex: 1 },

    // 🆕 calling overlay
    callingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 9999, justifyContent: 'center', alignItems: 'center' },
    callGlow: { position: 'absolute', width: 420, height: 420, borderRadius: 210 },
    timerWrapper: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
    timerSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
    callingAvatarContainer: { width: 150, height: 150, borderRadius: 75, overflow: 'hidden', borderWidth: 4, borderColor: '#020617', elevation: 25 },
    callingAvatar: { width: '100%', height: '100%' },
    callingText: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: 0.5 },
    callingSubtext: { color: '#6366F1', marginTop: 10, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
    cancelCallBtn: { marginTop: 80, alignItems: 'center' },
    cancelCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', elevation: 20, shadowColor: '#EF4444', shadowOpacity: 0.5, shadowRadius: 15 },
    cancelLabel: { color: '#EF4444', marginTop: 15, fontWeight: '900', fontSize: 13, letterSpacing: 3 },

    // 🆕 bottom bar (darker glass, top line removed)
    bottomBar: { position: 'absolute', bottom: 28, left: 0, right: 0, padding: 22, paddingBottom: Platform.OS === 'ios' ? 30 : 20, backgroundColor: 'rgba(4, 6, 18, 0.97)', borderTopLeftRadius: 40, borderTopRightRadius: 40, flexDirection: 'row', alignItems: 'center', elevation: 30, overflow: 'hidden' },
    priceInfo: { flex: 1 },
    totalLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5, flexWrap: 'nowrap' },
    totalVal: { color: '#FFF', fontSize: 20, fontWeight: '900', flexShrink: 1 },
    callBtnWrap: { width: '58%', height: 45, justifyContent: 'center' },
    callBtnGlow: { position: 'absolute', left: 8, right: 8, top: 6, bottom: -4, borderRadius: 32 },
    callBtn: { width: '100%', height: 45, borderRadius: 32, overflow: 'hidden', elevation: 15 },
    callGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 18 },
    btnGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12, overflow: 'hidden' },
    callBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
    liveActionBtn: { flex: 1, height: 68, borderRadius: 35, overflow: 'hidden', elevation: 15 },

    // 🔥 SATTI UPDATE: MODAL STYLES 🔥
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#0A0F22', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40, borderWidth: 1.3, borderBottomWidth: 0 },
    modalIconRing: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    modalTitle: { color: '#EF4444', fontSize: 20, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
    modalSubText: { color: '#94A3B8', fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 },
    modalLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
    reasonBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1.2 },
    reasonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    cancelActionBtn: { marginTop: 15, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)' },
    cancelBtnText: { color: '#94A3B8', fontSize: 13, fontWeight: '900', letterSpacing: 1 }
});