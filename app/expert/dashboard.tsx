import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { arrayUnion, collection, doc, limit, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

// --- COMPONENTS ---
import ExpertNotificationBar from '../../components/ExpertNotificationBar';
import ConsoleHome from './components/ConsoleHome';
import ExpertStats from './components/ExpertStats';
import LevelInsights from './components/LevelInsights';
import WalletSystem from './components/WalletSystem';
import ExpertMessages from './ExpertMessages';

const { width, height } = Dimensions.get('window');

// 🎨 IMAGES (replace with your own brand images anytime)
const SPOTLIGHT_BG = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?q=80&w=1200&auto=format&fit=crop';

// 🧭 TAB ORDER + NAV GEOMETRY (used by the sliding indicator)
const TABS = ['DASH', 'WALLET', 'MESSAGES', 'LEVELS', 'STATS'];
const NAV_ROW_W = width - 40;
const NAV_ITEM_W = NAV_ROW_W / 5;

// 🪑 NEW: 8 forum seats placed on a circle (used by the orbiting seats in the Studio Room)
const SEAT_RADIUS = 38;
const SEATS = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * 2 * Math.PI;
    return { x: Math.cos(a) * SEAT_RADIUS, y: Math.sin(a) * SEAT_RADIUS };
});

// 🆕🆕🆕 TOP BUTTON WIDTH (wide pill)
const BTN_W = width; // full screen width
const STUDIO_LABEL = 'HOST STUDIO'; // 🆕 top button name - inga mattum maathina podhum

// 🆕🆕🆕 STUDIO ROOM floating dust / sparkle particles (rise from the stage floor)
const PARTICLES = Array.from({ length: 16 }, (_, i) => ({
    x: Math.random() * width,
    size: 2 + Math.random() * 3,
    dur: 5000 + Math.random() * 4000,
    delay: Math.random() * 4000,
    color: i % 3 === 0 ? '#F5D77A' : i % 3 === 1 ? '#FF8FA0' : '#FFFFFF'
}));
const Particle = ({ p }: any) => {
    const a = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.delay(p.delay),
                Animated.timing(a, { toValue: 1, duration: p.dur, easing: Easing.linear, useNativeDriver: true }),
                Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        ).start();
    }, []);
    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute',
                left: p.x,
                bottom: -10,
                width: p.size,
                height: p.size,
                borderRadius: p.size / 2,
                backgroundColor: p.color,
                opacity: a.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.85, 0.6, 0] }),
                transform: [
                    { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.9] }) },
                    { translateX: a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 10, -6] }) }
                ]
            }}
        />
    );
};

// 🆕 brightness helper - level colors la romba dark color (ex: MYTHIC L9 '#0a0303') irundha button la theriyama pogum, adha avoid panna
const lum = (hex: string) => {
    const h = String(hex || '#000000').replace('#', '');
    const r = parseInt(h.substr(0, 2), 16) / 255;
    const g = parseInt(h.substr(2, 2), 16) / 255;
    const b = parseInt(h.substr(4, 2), 16) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b;
};

// ✨ EXPANDING RIPPLE RING (incoming call magic)
const Ripple = ({ delay, color }: any) => {
    const a = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(a, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        ).start();
    }, []);
    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute',
                width: 180,
                height: 180,
                borderRadius: 90,
                borderWidth: 2,
                borderColor: color,
                opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
                transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.85, 2.3] }) }]
            }}
        />
    );
};

// ✨ BOTTOM NAV BUTTON (stays fully inside the glass box: icon + label, soft scale only)
const NavButton = ({ id, icon, label, active, onPress, theme }: any) => {
    const isActive = active === id;
    const s = useRef(new Animated.Value(isActive ? 1 : 0)).current;
    useEffect(() => {
        Animated.spring(s, { toValue: isActive ? 1 : 0, useNativeDriver: true, friction: 8, tension: 140 }).start();
    }, [isActive]);
    const scale = s.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] });
    const iconName = isActive ? String(icon).replace('-outline', '') : icon;
    return (
        <TouchableOpacity onPress={() => onPress(id)} style={styles.navItem} activeOpacity={0.8}>
            <Animated.View style={[styles.iconBox, { transform: [{ scale }] }]}>
                <Ionicons name={iconName} size={19} color={isActive ? '#FFF' : '#94A3B8'} />
            </Animated.View>
            <Text style={[styles.navText, { color: isActive ? '#FFF' : '#64748B', fontWeight: isActive ? '900' : '800' }]}>{label}</Text>
        </TouchableOpacity>
    );
};

// ✅ ACCURATE THEME & LEVEL CONFIG
const getLevelConfig = (userData: any) => {
    const getObj = (lvl: number) => {
        if (lvl >= 10) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'] as const, glow: '#F59E0B', next: 0, prev: 50000000, rate: 8000 };
        if (lvl === 9) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'] as const, glow: '#EC4899', next: 100000000, prev: 30000000, rate: 7000 };
        if (lvl === 8) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'] as const, glow: '#8B5CF6', next: 50000000, prev: 10000000, rate: 5400 };
        if (lvl === 7) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'] as const, glow: '#3B82F6', next: 30000000, prev: 5000000, rate: 4800 };
        if (lvl === 6) return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'] as const, glow: '#06B6D4', next: 10000000, prev: 3000000, rate: 4200 };
        if (lvl === 5) return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'] as const, glow: '#10B981', next: 5000000, prev: 1000000, rate: 3600 };
        if (lvl === 4) return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'] as const, glow: '#EAB308', next: 3000000, prev: 300000, rate: 3000 };
        if (lvl === 3) return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'] as const, glow: '#94A3B8', next: 1000000, prev: 100000, rate: 2400 };
        if (lvl === 2) return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'] as const, glow: 'transparent', next: 300000, prev: 30000, rate: 1800 };
        if (lvl === 1) return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'] as const, glow: 'transparent', next: 100000, prev: 0, rate: 1200 };
        return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'] as const, glow: 'transparent', next: 30000, prev: 0, rate: 1000 };
    };

    const rawLvl = userData?.expertLevel ?? userData?.currentLevel ?? userData?.level;
    if (rawLvl !== undefined && rawLvl !== null) {
        if (typeof rawLvl === 'number') return getObj(rawLvl);
        if (typeof rawLvl === 'string') {
            const levelMatch = rawLvl.match(/\d+/);
            if (levelMatch) return getObj(parseInt(levelMatch[0], 10));
        }
    }

    const title = String(userData?.levelTitle || '').toUpperCase();
    if (title) {
        const titleMatch = title.match(/\d+/);
        if (titleMatch) return getObj(parseInt(titleMatch[0], 10));
    }

    const beans = Number(userData?.totalBeansEarned) || Number(userData?.beans) || 0;
    if (beans >= 100000000) return getObj(10);
    if (beans >= 50000000) return getObj(9);
    if (beans >= 30000000) return getObj(8);
    if (beans >= 10000000) return getObj(7);
    if (beans >= 5000000)  return getObj(6);
    if (beans >= 3000000)  return getObj(5);
    if (beans >= 1000000)  return getObj(4);
    if (beans >= 300000)   return getObj(3);
    if (beans >= 100000)   return getObj(2);
    if (beans >= 30000)    return getObj(1);
    return getObj(0);
};

export default function ExpertDashboard() {
    const router = useRouter();
    const [user, setUser] = useState(auth.currentUser);
    const [activeTab, setActiveTab] = useState('DASH');

    // 🆕 NEW: Open specific tab when navigated with ?tab=WALLET / MESSAGES / LEVELS / STATS / DASH
    const dashParams = useLocalSearchParams();
    useEffect(() => {
        const t = String(dashParams.tab || '');
        if (['DASH', 'WALLET', 'MESSAGES', 'LEVELS', 'STATS'].includes(t)) setActiveTab(t);
    }, [dashParams.tab, dashParams.ts]);

    const [loading, setLoading] = useState(true);
    const [expertData, setExpertData] = useState<any>(null);
    const [isOnline, setIsOnline] = useState(false);
    
    const [isUploading, setIsUploading] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    
    // Separate loading states for buttons
    const [isStartingLive, setIsStartingLive] = useState(false);
    const [isStartingForum, setIsStartingForum] = useState(false);

    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [showCallModal, setShowCallModal] = useState(false);

    // 🆕🆕 NEW: STUDIO ROOM (Go Live / Forum / Premium Spotlight live inside this room)
    const [studioOpen, setStudioOpen] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current; 

    // ✨ NEW PREMIUM ANIMATION VALUES
    const spinAnim = useRef(new Animated.Value(0)).current;      // rotating rings (loader + call avatar)
    const sweepAnim = useRef(new Animated.Value(0)).current;     // light sweep over buttons / banner
    const navIndexAnim = useRef(new Animated.Value(0)).current; // sliding nav indicator
    const tabAnim = useRef(new Animated.Value(1)).current;       // tab switch transition
    const navStretch = useRef(new Animated.Value(1)).current;    // nav indicator stretch while sliding

    // 🆕🆕 NEW: Studio Room animation values
    const studioAnim = useRef(new Animated.Value(0)).current;    // room content entrance (staggered cards)
    const curtainAnim = useRef(new Animated.Value(0)).current;   // velvet curtains opening
    const flashAnim = useRef(new Animated.Value(0)).current;     // camera flash on entry
    const flickAnim = useRef(new Animated.Value(1)).current;     // neon "ON AIR" flicker
    const swayAnim = useRef(new Animated.Value(0)).current;      // 🆕 spotlight beams sway + cards float (smooth ping-pong)
    const btnPress = useRef(new Animated.Value(0)).current;      // 🆕 3D press-down for the top Studio Room button

    // DYNAMIC THEME ENGINE
    const config = getLevelConfig(expertData);
    
    const theme = {
        primary: config.colors[0],
        secondary: config.colors[2] || config.colors[1] || config.colors[0],
        accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
        bgGradient: [
            config.lvl >= 7 ? `${config.colors[0]}40` : '#020617', 
            config.lvl >= 3 ? `${config.colors[1] || config.colors[0]}20` : '#0F172A', 
            '#020617' 
        ] as const 
    };

    // 🆕🆕🆕 LEVEL-THEMED colors for the top Studio Room button (every level gets its own look)
    const btnC1 = lum(theme.primary) > 0.07 ? theme.primary : (config.colors[1] || theme.accent);
    const btnC2 = lum(theme.secondary) > 0.07 ? theme.secondary : (config.colors[1] || theme.accent);
    const btnC3 = theme.accent;

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -40]
    });

    // ✨ NEW: derived animation styles
    const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const sweepX = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, 240] });
    const bannerSweepX = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-100, width] });
    const blinkOpacity = pulseAnim.interpolate({ inputRange: [1, 1.05], outputRange: [0.35, 1] });
    const iconPulseScale = pulseAnim.interpolate({ inputRange: [1, 1.05], outputRange: [1, 1.9] });
    const iconPulseOpacity = pulseAnim.interpolate({ inputRange: [1, 1.05], outputRange: [0.75, 0] });
    const acceptPulse = pulseAnim.interpolate({ inputRange: [1, 1.05], outputRange: [1, 1.14] });
    const navIndicatorX = navIndexAnim.interpolate({ inputRange: [0, 1, 2, 3, 4], outputRange: [0, NAV_ITEM_W, NAV_ITEM_W * 2, NAV_ITEM_W * 3, NAV_ITEM_W * 4] });
    const tabSlide = tabAnim.interpolate({ inputRange: [0, 1], outputRange: [26, 0] });

    // 🆕🆕🆕 NEW: GO LIVE rings now stay INSIDE the card (small controlled expansion) + top banner chevron bob
    const liveRingScale = pulseAnim.interpolate({ inputRange: [1, 1.05], outputRange: [1, 1.3] });
    const liveRingOpacity = pulseAnim.interpolate({ inputRange: [1, 1.05], outputRange: [0.85, 0] });
    const chevronBob = pulseAnim.interpolate({ inputRange: [1, 1.05], outputRange: [0, 3] });
    const btnFaceY = btnPress.interpolate({ inputRange: [0, 1], outputRange: [0, 7] });
    const btnZoom = pulseAnim.interpolate({ inputRange: [1, 1.05], outputRange: [1, 1.025] }); // 🆕 lite zoom in/out for top button
    // 🆕🆕🆕 Studio Room: swaying spotlight beams + floating stage cards
    const beamRotA = swayAnim.interpolate({ inputRange: [0, 1], outputRange: ['-16deg', '14deg'] });
    const beamRotB = swayAnim.interpolate({ inputRange: [0, 1], outputRange: ['15deg', '-13deg'] });
    const floatA = swayAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -5] });
    const floatB = swayAnim.interpolate({ inputRange: [0, 1], outputRange: [-5, 0] });

    // 🆕🆕 NEW: Studio Room derived styles
    const neonOpacity = flickAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] });
    const curtainLeftX = curtainAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -width / 2 - 4] });
    const curtainRightX = curtainAnim.interpolate({ inputRange: [0, 1], outputRange: [0, width / 2 + 4] });
    const cardIn = (i: number) => {
        const s = 0.2 + i * 0.16;
        const e = Math.min(0.62 + i * 0.16, 1);
        return {
            opacity: studioAnim.interpolate({ inputRange: [s, e], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [
                { translateY: studioAnim.interpolate({ inputRange: [s, e], outputRange: [60, 0], extrapolate: 'clamp' }) },
                { scale: studioAnim.interpolate({ inputRange: [s, e], outputRange: [0.92, 1], extrapolate: 'clamp' }) },
                { translateY: i % 2 === 0 ? floatA : floatB }
            ]
        };
    };

    const borderType1 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: theme.primary,
        borderRightColor: theme.primary,
        borderTopColor: theme.secondary + '80',
        borderBottomColor: theme.secondary + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    const borderType2 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: theme.secondary,
        borderRightColor: theme.secondary,
        borderTopColor: theme.primary + '80',
        borderBottomColor: theme.primary + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
    };

    const player = useVideoPlayer(expertData?.teaserVideo || null, (player) => {
        player.loop = true;
    });

    useEffect(() => {
        if (showPreviewModal) {
            player.play();
        } else {
            player.pause();
        }
    }, [showPreviewModal]);

    useEffect(() => {
        const authUnsub = auth.onAuthStateChanged((u:any) => {
            if (!u) {
                setLoading(false);
                router.replace('/' as any);
            } else {
                setUser(u);
            }
        });

        Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: 4000,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true
            })
        ).start();

        // ✨ NEW: spin + light-sweep loops
        Animated.loop(
            Animated.timing(spinAnim, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: true })
        ).start();
        Animated.loop(
            Animated.sequence([
                Animated.delay(1200),
                Animated.timing(sweepAnim, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(sweepAnim, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        ).start();

        // 🆕🆕 NEW: neon "ON AIR" sign flicker loop
        Animated.loop(
            Animated.sequence([
                Animated.delay(1800),
                Animated.timing(flickAnim, { toValue: 0.1, duration: 60, useNativeDriver: true }),
                Animated.timing(flickAnim, { toValue: 1, duration: 70, useNativeDriver: true }),
                Animated.timing(flickAnim, { toValue: 0.35, duration: 60, useNativeDriver: true }),
                Animated.timing(flickAnim, { toValue: 1, duration: 90, useNativeDriver: true })
            ])
        ).start();

        // 🆕🆕🆕 smooth ping-pong sway (spotlight beams + floating cards)
        Animated.loop(
            Animated.sequence([
                Animated.timing(swayAnim, { toValue: 1, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(swayAnim, { toValue: 0, duration: 3600, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();

        return () => authUnsub();
    }, []);

    // ✨ NEW: slide the nav indicator + animate content whenever the tab changes
    useEffect(() => {
        const idx = Math.max(0, TABS.indexOf(activeTab));
        Animated.spring(navIndexAnim, { toValue: idx, useNativeDriver: true, friction: 7, tension: 90 }).start();
        Animated.sequence([
            Animated.timing(navStretch, { toValue: 1.12, duration: 110, useNativeDriver: true }),
            Animated.spring(navStretch, { toValue: 1, useNativeDriver: true, friction: 6 })
        ]).start();
        tabAnim.setValue(0);
        Animated.timing(tabAnim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, [activeTab]);

    // 🆕🆕 NEW: incoming call vandha Studio Room-a auto close pannidum (rendu modal overlap aagaama irukka)
    useEffect(() => {
        if (showCallModal) setStudioOpen(false);
    }, [showCallModal]);

    useEffect(() => {
        if (!user?.uid) return;

        const unsubProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data) {
                    setExpertData({ uid: snap.id, ...data });
                    setIsOnline(data.isOnline ?? false);
                }
                
                setLoading(false);
                Animated.parallel([
                    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                    Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true })
                ]).start();
            } else {
                setLoading(false);
            }
        });

        const DiscoverQueueQuery = query(
            collection(db, "Discover_queue"),
            where("expertId", "==", user.uid),
            where("status", "==", "Discovered"),
            limit(1)
        );

        const unsubDiscoverQueue = onSnapshot(DiscoverQueueQuery, (snap) => {
            if (!snap.empty) {
                const DiscoverDoc = snap.docs[0];
                const DiscoverData = DiscoverDoc.data();
                setIncomingCall({ 
                    id: DiscoverData.callId,
                    callerName: DiscoverData.userName || "Discover User",
                    status: 'dialing',
                    isDiscoverCall: true,
                    queueId: DiscoverDoc.id
                });
            }
        });

        const callsQuery = query(
            collection(db, "calls"),
            where("expertId", "==", user.uid),
            where("status", "==", "dialing"),
            limit(1)
        );

        const unsubCalls = onSnapshot(callsQuery, (snap) => {
            if (!snap.empty) {
                const callDoc = snap.docs[0];
                const callData = { id: callDoc.id, ...callDoc.data() };
                setIncomingCall(callData);
                setShowCallModal(true);
            } else if (!incomingCall?.isDiscoverCall) {
                setShowCallModal(false);
                setIncomingCall(null);
            }
        });

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
            ])
        ).start();

        return () => {
            unsubProfile();
            unsubCalls();
            unsubDiscoverQueue();
        };
    }, [user?.uid]);

    // 🔥 FORUM CREATION LOGIC 🔥
    const startForumRoom = async () => {
        if (!user?.uid || isStartingForum || isStartingLive) return;

        try {
            setIsStartingForum(true); 
            
            const roomId = `forum_${user.uid}_${Date.now()}`;
            const roomRef = doc(db, "forum_rooms", roomId); // STRICTLY forum_rooms

            const initialData = {
                roomId: roomId,
                hostId: user.uid,
                hostName: expertData?.name || "Host",
                hostImage: expertData?.profilePic || "",
                roomName: `${expertData?.name || 'Host'}'s Forum`,
                status: "active",
                viewerCount: 1,
                createdAt: serverTimestamp(),
                seats: Array(8).fill({ 
                    uid: null, 
                    name: null, 
                    image: null, 
                    isMuted: false 
                })
            };

            await setDoc(roomRef, initialData);

            // 🔥 SATTI EXACT FIX: Fixed Dynamic literal path matching app/expert/forum/[roomId].tsx
            router.push(`/expert/forum/${roomId}` as any);
            
            setIsStartingForum(false);

        } catch (error) {
            setIsStartingForum(false);
            console.error("Session Room Error:", error);
            Alert.alert("Error", "Could not initiate forum.");
        }
    };

    // 🔥 LIVE STREAM CREATION LOGIC 🔥
    const startLiveStream = async () => {
        if (!user?.uid || isStartingLive || isStartingForum) return;
        try {
            setIsStartingLive(true);
            
            const liveId = `live_${user.uid}_${Date.now()}`;
            const liveRef = doc(db, "lives", liveId);
            
            await setDoc(liveRef, {
                hostId: user.uid,
                hostName: expertData?.name || "Host",
                hostImage: expertData?.profilePic || "",
                status: "live",
                createdAt: serverTimestamp(),
                viewerCount: 0
            });
            
            // 🔥 SATTI EXACT FIX: Direct Explicit String Literal passing search query to prevent route confusion
            router.push(`/expert/livestream?liveId=${liveId}` as any);

            setIsStartingLive(false);

        } catch (error) {
            setIsStartingLive(false);
            console.error("Live Stream Error: ", error);
            Alert.alert("Error", "Could not start live stream.");
        }
    };

    // 🆕🆕 NEW: STUDIO ROOM open / close / enter
    const openStudio = () => {
        if (isStartingLive || isStartingForum) return;
        studioAnim.setValue(0);
        curtainAnim.setValue(0);
        flashAnim.setValue(0);
        setStudioOpen(true);
        // 📸 camera flash on entry
        Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 110, useNativeDriver: true }),
            Animated.timing(flashAnim, { toValue: 0, duration: 420, useNativeDriver: true })
        ]).start();
        // 🎭 velvet curtains slide open
        Animated.timing(curtainAnim, { toValue: 1, duration: 800, delay: 160, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }).start();
        // 🎬 room content staggered entrance
        Animated.timing(studioAnim, { toValue: 1, duration: 1100, delay: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    };

    const closeStudio = () => {
        Animated.timing(studioAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setStudioOpen(false));
    };

    // room-ku ulla irundhu oru stage-a thoratha: modal-a close panni apram action run aagum
    const enterStage = (action: () => void) => {
        setStudioOpen(false);
        setTimeout(action, 80);
    };

    const handleUploadTeaser = async () => {
        if (!user?.uid) return;
        
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
                Alert.alert("Permission Required", "Camera roll access is needed to upload a teaser.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'], 
                allowsEditing: true,
                aspect: [9, 16],
                quality: 1, 
                videoMaxDuration: 30, 
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedVideo = result.assets[0];

                if (selectedVideo.duration && selectedVideo.duration > 30000) {
                    Alert.alert(
                        "Video Too Long! ⏱️", 
                        "Teaser video must be under 30 seconds. Please edit or select a shorter video."
                    );
                    return;
                }

                setIsUploading(true);
                const videoUri = selectedVideo.uri;

                const CLOUD_NAME = 'dvwjxeexc'; 
                const UPLOAD_PRESET = 'TALKPE'; 

                const data = new FormData();
                data.append('file', {
                    uri: videoUri,
                    type: 'video/mp4',
                    name: `teaser_${user.uid}_${Date.now()}.mp4`
                } as any);
                data.append('upload_preset', UPLOAD_PRESET);
                data.append('cloud_name', CLOUD_NAME);

                const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
                    method: 'POST',
                    body: data,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'multipart/form-data',
                    }
                });

                const responseData = await response.json();

                if (responseData.secure_url) {
                    const userDocRef = doc(db, "users", user.uid);
                    await updateDoc(userDocRef, {
                        teaserVideo: responseData.secure_url
                    });

                    Alert.alert("Success!", "Your cinematic teaser has been updated! 🎬");
                } else {
                    console.error("Cloudinary Error:", responseData);
                    Alert.alert("Upload Failed", responseData.error?.message || "Could not upload video to Cloudinary.");
                }
                
                setIsUploading(false);
            }
        } catch (error) {
            console.error("Video Upload Error: ", error);
            Alert.alert("Upload Failed", "Something went wrong while uploading your teaser.");
            setIsUploading(false);
        }
    };

    const handleAcceptCall = async () => {
        if (!incomingCall || !user?.uid) return;
        setShowCallModal(false);
        try {
            await updateDoc(doc(db, "users", user.uid), { isBusy: true });
            
            if (!incomingCall.isDiscoverCall) {
                await updateDoc(doc(db, "calls", incomingCall.id), {
                    status: 'accepted',
                    acceptedAt: serverTimestamp()
                });
            }
            router.push({
                pathname: '/videocall',
                params: {
                    expertId: user.uid,
                    expertName: expertData?.userName || expertData?.name || 'Host',
                    callId: incomingCall.id,
                    role: 'expert',
                    callerName: incomingCall.callerName || 'User'
                }
            } as any);
        } catch (e) {
            console.log("Accept Fail", e);
            setShowCallModal(true);
        }
    };

    const handleBlurCall = async () => {
         // Function body placeholder preserved exactly to avoid line reduction 
    };

    const handleRejectCall = async () => {
        if (!incomingCall) return;
        try {
            if (incomingCall.isDiscoverCall) {
                await updateDoc(doc(db, "Discover_queue", incomingCall.queueId), { 
                    status: "searching", expertId: null, callId: null 
                });
            } else {
                await updateDoc(doc(db, "calls", incomingCall.id), { status: 'rejected' });
            }
            setShowCallModal(false);
            setIncomingCall(null);
        } catch (e) { console.log("Reject Fail", e); }
    };

    const handleBlockUser = async (targetUserId: string) => {
        if (!user?.uid || !targetUserId) return;
        try {
            const expertRef = doc(db, "users", user.uid);
            await updateDoc(expertRef, {
                blockedUsers: arrayUnion(targetUserId)
            });
        } catch (e) { console.log("Block Error", e); }
    };

    // 🚀 PREMIUM LOADER (spinning gradient ring + pulsing brand)
    if (loading) {
        return (
            <View style={styles.loader}>
                <LinearGradient colors={['#020617', '#1E1B4B', '#020617']} style={StyleSheet.absoluteFill} />
                <Animated.View style={[styles.shimmerOrb, { top: 120, right: -80, backgroundColor: '#6366F1', transform: [{ translateY: orbTranslateY }] }]} />
                <Animated.View style={[styles.shimmerOrb, { bottom: 80, left: -100, backgroundColor: '#EC4899', transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />
                <View style={styles.loaderRingWrap}>
                    <View style={styles.loaderRingClip}>
                        <Animated.View style={{ width: 200, height: 200, transform: [{ rotate: spin }] }}>
                            <LinearGradient colors={['#6366F1', 'transparent', '#EC4899', 'transparent', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
                        </Animated.View>
                    </View>
                    <View style={styles.loaderRingInner}>
                        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                            <MaterialCommunityIcons name="crown" size={38} color="#FFF" />
                        </Animated.View>
                    </View>
                </View>
                <Text style={styles.loaderBrand}>TALKPE<Text style={{ color: '#6366F1' }}>PRO</Text></Text>
                <ActivityIndicator size="small" color="#6366F1" style={{ marginTop: 18 }} />
                <Text style={styles.loaderText}>SYNCING SECURELY...</Text>
            </View>
        );
    }

    const toggleOnlineStatus = async (status: boolean) => {
        if (!user?.uid) return;
        try {
            await updateDoc(doc(db, "users", user.uid), { isOnline: status });
        } catch (e) { console.log("Status Update Error", e); }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'DASH': return (
                <View style={{ flex: 1 }}>
                    {/* 🚪 STUDIO ROOM TOP BUTTON (🆕🆕🆕 same gold-framed marquee design as THE STUDIO header, 3D press button, no close / no red dot) */}
                    <Animated.View style={[styles.btnWrap, { shadowColor: btnC1, transform: [{ scale: btnZoom }] }]}>
                        <TouchableOpacity
                            activeOpacity={0.95}
                            onPress={openStudio}
                            onPressIn={() => Animated.timing(btnPress, { toValue: 1, duration: 80, useNativeDriver: true }).start()}
                            onPressOut={() => Animated.timing(btnPress, { toValue: 0, duration: 140, useNativeDriver: true }).start()}
                            disabled={isStartingLive || isStartingForum}
                        >
                            {/* 3D depth base (the thick bottom edge) - level color, darkened */}
                            <View style={styles.btn3dBase}>
                                <LinearGradient colors={[btnC1, btnC2]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                <View style={styles.btn3dShade} pointerEvents="none" />
                                <Animated.View style={{ transform: [{ translateY: btnFaceY }] }}>
                                    <LinearGradient
                                        colors={[btnC1, btnC1, '#FFFFFF', btnC2, btnC2]}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        style={styles.btnFrame}
                                    >
                                        <View style={styles.btnFace}>
                                            <LinearGradient
                                                colors={[btnC1 + 'F2', btnC2 + 'F2']}
                                                start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                                                style={StyleSheet.absoluteFill}
                                                pointerEvents="none"
                                            />
                                            {/* darken a bit so WHITE text always pops on both level colors */}
                                            <View style={styles.btnFaceShade} pointerEvents="none" />
                                            {/* 3D bevel: glossy top, shaded bottom, bright top edge */}
                                            <LinearGradient colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0)']} style={styles.btnSolidGloss} pointerEvents="none" />
                                            <LinearGradient colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.4)']} style={styles.btnBevelBottom} pointerEvents="none" />
                                            <View style={styles.btnTopEdge} pointerEvents="none" />
                                            <Animated.View pointerEvents="none" style={[styles.btnSweep, { width: 46, transform: [{ translateX: bannerSweepX }, { skewX: '-20deg' }] }]} />

                                            {/* left rotating emblem */}
                                            <View style={styles.btnEmblemWrap}>
                                                <View style={styles.btnEmblemClip}>
                                                    <Animated.View style={{ width: 80, height: 80, transform: [{ rotate: spin }] }}>
                                                        <LinearGradient colors={['#FFFFFF', 'transparent', btnC2, 'transparent', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
                                                    </Animated.View>
                                                </View>
                                                <View style={[styles.btnEmblemInner, { borderColor: 'rgba(255,255,255,0.55)' }]}>
                                                    <MaterialCommunityIcons name="movie-open" size={19} color="#FFFFFF" />
                                                </View>
                                            </View>

                                            {/* name + diamond divider */}
                                            <View style={{ flex: 1, alignItems: 'center', marginHorizontal: 8 }}>
                                                <Text style={[styles.btnTitle, { textShadowColor: 'rgba(0,0,0,0.65)', textShadowRadius: 5, textShadowOffset: { width: 0, height: 2 } }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                                                    {isStartingLive ? 'STARTING LIVE...' : isStartingForum ? 'OPENING FORUM...' : STUDIO_LABEL}
                                                </Text>
                                                <View style={styles.btnDivider}>
                                                    <LinearGradient colors={['transparent', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.studioHeadDividerLine} />
                                                    <View style={[styles.studioHeadDiamond, { backgroundColor: '#FFFFFF' }]} />
                                                    <LinearGradient colors={['#FFFFFF', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.studioHeadDividerLine} />
                                                </View>
                                            </View>

                                            {/* right rotating emblem (mirror) */}
                                            <View style={styles.btnEmblemWrap}>
                                                <View style={styles.btnEmblemClip}>
                                                    <Animated.View style={{ width: 80, height: 80, transform: [{ rotate: spin }] }}>
                                                        <LinearGradient colors={['#FFFFFF', 'transparent', btnC1, 'transparent', '#FFFFFF']} start={{ x: 1, y: 0 }} end={{ x: 0, y: 1 }} style={{ flex: 1 }} />
                                                    </Animated.View>
                                                </View>
                                                <View style={[styles.btnEmblemInner, { borderColor: 'rgba(255,255,255,0.55)' }]}>
                                                    <MaterialCommunityIcons name="crown" size={19} color="#FFFFFF" />
                                                </View>
                                            </View>
                                        </View>
                                    </LinearGradient>
                                </Animated.View>
                            </View>
                        </TouchableOpacity>
                    </Animated.View>

                    <ConsoleHome expertData={expertData} isOnline={isOnline} setIsOnline={toggleOnlineStatus} />
                </View>
            );
            case 'WALLET': return <WalletSystem expertData={expertData} />;
            case 'MESSAGES': return <ExpertMessages onBlockUser={handleBlockUser} />;
            case 'LEVELS': return <LevelInsights expertData={expertData} />;
            case 'STATS': return <ExpertStats expertData={expertData} />;
            default: return <ConsoleHome expertData={expertData} isOnline={isOnline} setIsOnline={toggleOnlineStatus} />;
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />
            <Animated.View style={[styles.shimmerOrb, { top: 80, right: -60, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 450, left: -90, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            <ExpertNotificationBar />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    <Animated.View style={{ flex: 1, opacity: tabAnim, transform: [{ translateY: tabSlide }] }}>
                        {renderContent()}
                    </Animated.View>
                </Animated.View>

                {/* 🧭 ROYAL GLASS NAV (everything stays inside the box) */}
                <View style={styles.floatingNavWrapper}>
                    <BlurView intensity={50} tint="dark" style={styles.glassNav}>
                        <LinearGradient colors={[theme.primary + '26', 'rgba(2,6,23,0.55)', theme.secondary + '26']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                        <LinearGradient colors={['transparent', theme.accent, '#F5D77A', theme.accent, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.navTopLine} pointerEvents="none" />
                        <View style={styles.navRow}>
                            <Animated.View
                                pointerEvents="none"
                                style={[styles.navIndicator, { borderColor: theme.primary + '90', shadowColor: theme.primary, transform: [{ translateX: navIndicatorX }, { scaleX: navStretch }] }]}
                            >
                                <LinearGradient colors={[theme.primary + '55', theme.secondary + '30']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                                <View style={[styles.navIndicatorTop, { backgroundColor: '#F5D77A' }]} />
                            </Animated.View>
                            <NavButton id="DASH" icon="grid-outline" label="Home" active={activeTab} onPress={setActiveTab} theme={theme} />
                            <NavButton id="WALLET" icon="wallet-outline" label="Wallet" active={activeTab} onPress={setActiveTab} theme={theme} />
                            <NavButton id="MESSAGES" icon="chatbubbles-outline" label="Chat" active={activeTab} onPress={setActiveTab} theme={theme} />
                            <NavButton id="LEVELS" icon="ribbon-outline" label="Level" active={activeTab} onPress={setActiveTab} theme={theme} />
                            <NavButton id="STATS" icon="bar-chart-outline" label="Stats" active={activeTab} onPress={setActiveTab} theme={theme} />
                        </View>
                    </BlurView>
                </View>
            </SafeAreaView>

            {/* 🎭 STUDIO ROOM (🆕🆕 NEW: curtains open + camera flash, then 3 stages: GO LIVE / FORUM / PREMIUM SPOTLIGHT) */}
            <Modal visible={studioOpen} transparent animationType="none" statusBarTranslucent onRequestClose={closeStudio}>
                <View style={styles.studioRoot}>
                    <LinearGradient colors={['#020617', '#14072E', '#020617']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                    <Animated.View pointerEvents="none" style={[styles.shimmerOrb, { top: 40, left: -110, backgroundColor: '#FF1F3D', transform: [{ translateY: orbTranslateY }] }]} />
                    <Animated.View pointerEvents="none" style={[styles.shimmerOrb, { bottom: 20, right: -110, backgroundColor: '#F59E0B', transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

                    {/* 🔦 stage spotlight cone */}
                    <Animated.View pointerEvents="none" style={[styles.studioCone, { opacity: studioAnim }]}>
                        <LinearGradient colors={['rgba(255,255,255,0.16)', 'rgba(255,255,255,0.03)', 'transparent']} style={StyleSheet.absoluteFill} />
                    </Animated.View>

                    {/* 🆕🆕🆕 swaying stage spotlight beams */}
                    <Animated.View pointerEvents="none" style={[styles.beamHolder, { left: width * 0.16 - 60, opacity: studioAnim, transform: [{ rotate: beamRotA }] }]}>
                        <LinearGradient colors={['rgba(255,31,61,0.32)', 'rgba(255,31,61,0.07)', 'transparent']} style={styles.beamBody} />
                    </Animated.View>
                    <Animated.View pointerEvents="none" style={[styles.beamHolder, { left: width * 0.84 - 60, opacity: studioAnim, transform: [{ rotate: beamRotB }] }]}>
                        <LinearGradient colors={['rgba(245,215,122,0.30)', 'rgba(245,215,122,0.06)', 'transparent']} style={styles.beamBody} />
                    </Animated.View>

                    {/* 🆕🆕🆕 stage floor glow + rising sparkles */}
                    <LinearGradient pointerEvents="none" colors={['transparent', 'rgba(245,215,122,0.10)', 'rgba(255,31,61,0.16)']} style={styles.studioFloor} />
                    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                        {PARTICLES.map((p, i) => <Particle key={i} p={p} />)}
                    </View>

                    <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                        {/* 🆕🆕🆕 header - gold-framed glass marquee. Close button is LAST + highest layer, so nothing can hide it */}
                        <Animated.View style={[styles.studioHead, { opacity: studioAnim, transform: [{ translateY: studioAnim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }] }]}>
                            <LinearGradient
                                colors={['#F5D77A', 'rgba(255,31,61,0.55)', '#F5D77A', 'rgba(245,158,11,0.55)', '#F5D77A']}
                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                style={styles.studioHeadFrame}
                            >
                                <View style={styles.studioHeadInner}>
                                    <LinearGradient
                                        colors={['rgba(255,31,61,0.22)', 'transparent', 'rgba(245,158,11,0.20)']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        style={StyleSheet.absoluteFill}
                                        pointerEvents="none"
                                    />
                                    {/* light sweep sits UNDER the content now */}
                                    <Animated.View pointerEvents="none" style={[styles.btnSweep, { width: 46, transform: [{ translateX: bannerSweepX }, { skewX: '-20deg' }] }]} />

                                    {/* rotating emblem */}
                                    <View style={styles.studioEmblemWrap}>
                                        <View style={styles.studioEmblemClip}>
                                            <Animated.View style={{ width: 90, height: 90, transform: [{ rotate: spin }] }}>
                                                <LinearGradient colors={['#F5D77A', 'transparent', '#FF1F3D', 'transparent', '#F5D77A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
                                            </Animated.View>
                                        </View>
                                        <View style={styles.studioEmblemInner}>
                                            <MaterialCommunityIcons name="movie-open" size={22} color="#F5D77A" />
                                        </View>
                                    </View>

                                    <View style={{ flex: 1, marginLeft: 12, marginRight: 8 }}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                            <Animated.View style={{ opacity: blinkOpacity }}>
                                                <View style={styles.studioHeadDot} />
                                            </Animated.View>
                                            <Text style={styles.studioHeadTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>STUDIO ROOM</Text>
                                        </View>
                                        <View style={styles.studioHeadDivider}>
                                            <LinearGradient colors={['#F5D77A', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.studioHeadDividerLine} />
                                            <View style={styles.studioHeadDiamond} />
                                            <LinearGradient colors={['transparent', '#F5D77A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.studioHeadDividerLine, { flex: 0.35 }]} />
                                        </View>
                                        <Text style={styles.studioHeadSub} numberOfLines={2}>Pick your stage. The spotlight is yours.</Text>
                                    </View>

                                    <TouchableOpacity onPress={closeStudio} style={styles.studioClose} activeOpacity={0.8} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                                        <Ionicons name="close" size={20} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            </LinearGradient>
                        </Animated.View>

                        <ScrollView contentContainerStyle={styles.studioScroll} showsVerticalScrollIndicator={false}>
                            {/* 🔴 STAGE 1 · GO LIVE */}
                            <Animated.View style={cardIn(0)}>
                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    style={[styles.stageCard, { borderColor: 'rgba(255,140,150,0.6)', shadowColor: '#FF1F3D', height: 168 }]}
                                    onPress={() => enterStage(startLiveStream)}
                                    disabled={isStartingLive || isStartingForum}
                                >
                                    <LinearGradient colors={['#FF1F3D', '#5B0716', '#12020A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stageGrad}>
                                        <MaterialCommunityIcons name="broadcast" size={150} color="rgba(255,255,255,0.08)" style={styles.stageWatermark} />
                                        <LinearGradient colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.stageSheen} pointerEvents="none" />

                                        <View style={{ flex: 1, justifyContent: 'space-between' }}>
                                            {/* neon ON AIR sign */}
                                            <Animated.View style={[styles.onAirSign, { opacity: neonOpacity }]}>
                                                <View style={styles.onAirDot} />
                                                <Text style={styles.onAirText}>ON AIR</Text>
                                            </Animated.View>
                                            <View>
                                                <Text style={styles.stageTitle}>GO LIVE</Text>
                                                <Text style={styles.stageSub}>Broadcast to everyone, instantly</Text>
                                            </View>
                                        </View>

                                        {/* 🆕🆕🆕 big pulsing record button - rings now perfectly centered & kept INSIDE the card */}
                                        <View style={styles.liveBtnWrap}>
                                            <View style={styles.liveStage}>
                                                <Animated.View style={[styles.liveRing, { opacity: liveRingOpacity, transform: [{ scale: liveRingScale }] }]} />
                                                <Animated.View style={[styles.liveRing, { opacity: Animated.multiply(liveRingOpacity, 0.6), transform: [{ scale: Animated.multiply(liveRingScale, 0.85) }] }]} />
                                                <View style={styles.liveBtnCircle}>
                                                    <Ionicons name="radio-button-on" size={34} color="#FFF" />
                                                </View>
                                            </View>
                                            <Text style={styles.stageTap}>TAP TO START</Text>
                                        </View>

                                        <Animated.View pointerEvents="none" style={[styles.btnSweep, { width: 46, transform: [{ translateX: bannerSweepX }, { skewX: '-20deg' }] }]} />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>

                            {/* 🟠 STAGE 2 · FORUM */}
                            <Animated.View style={[cardIn(1), { marginTop: 14 }]}>
                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    style={[styles.stageCard, { borderColor: 'rgba(253,211,120,0.65)', shadowColor: '#F59E0B', height: 140 }]}
                                    onPress={() => enterStage(startForumRoom)}
                                    disabled={isStartingForum || isStartingLive}
                                >
                                    <LinearGradient colors={['#F59E0B', '#7C2D12', '#1A0A04']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.stageGrad}>
                                        <MaterialCommunityIcons name="account-group" size={130} color="rgba(255,255,255,0.08)" style={styles.stageWatermark} />
                                        <LinearGradient colors={['transparent', 'rgba(255,255,255,0.55)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.stageSheen} pointerEvents="none" />

                                        <View style={{ flex: 1, justifyContent: 'center' }}>
                                            <View style={styles.stageTag}>
                                                <MaterialCommunityIcons name="microphone" size={11} color="#FDE68A" />
                                                <Text style={styles.stageTagText}>8 SEATS · VOICE ROOM</Text>
                                            </View>
                                            <Text style={[styles.stageTitle, { marginTop: 8 }]}>FORUM</Text>
                                            <Text style={styles.stageSub}>Host a round-table with your fans</Text>
                                        </View>

                                        {/* 🪑 orbiting seats */}
                                        <View style={styles.seatBox}>
                                            <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ rotate: spin }] }]}>
                                                {SEATS.map((s, i) => (
                                                    <View
                                                        key={i}
                                                        style={[
                                                            styles.seatDot,
                                                            { left: 48 + s.x - 6, top: 48 + s.y - 6, opacity: i % 2 === 0 ? 1 : 0.55 }
                                                        ]}
                                                    />
                                                ))}
                                            </Animated.View>
                                            <View style={styles.seatCenter}>
                                                <MaterialCommunityIcons name="account-group" size={22} color="#FFF" />
                                            </View>
                                        </View>

                                        <Animated.View pointerEvents="none" style={[styles.btnSweep, { width: 46, transform: [{ translateX: bannerSweepX }, { skewX: '-20deg' }] }]} />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>

                            {/* 👑 STAGE 3 · PREMIUM SPOTLIGHT */}
                            <Animated.View style={[cardIn(2), { marginTop: 14 }]}>
                                <TouchableOpacity
                                    activeOpacity={0.88}
                                    style={[styles.stageCard, { borderColor: 'rgba(255,236,170,0.85)', shadowColor: '#F5D77A', height: 112 }]}
                                    onPress={() => enterStage(() => router.push('/expert/masterclass' as any))}
                                >
                                    <Image source={{ uri: SPOTLIGHT_BG }} style={styles.spotlightBgImage} />
                                    <LinearGradient
                                        colors={['#6B4A0AE6', '#F5D77AE6', '#C9972BE6', '#F5D77AE6', '#6B4A0AE6']}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                        style={[styles.stageGrad, { alignItems: 'center', justifyContent: 'center' }]}
                                    >
                                        <View style={{ alignItems: 'center' }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                <MaterialCommunityIcons name="crown" size={20} color="#3B2600" />
                                                <View style={styles.royalDivider} />
                                                <Text style={styles.royalSpotlightText}>PREMIUM SPOTLIGHT</Text>
                                                <View style={styles.royalDivider} />
                                                <MaterialCommunityIcons name="crown" size={20} color="#3B2600" />
                                            </View>
                                            <Text style={styles.spotSub}>YOUR 30-SECOND CINEMATIC SHOWCASE</Text>
                                        </View>
                                        <Animated.View pointerEvents="none" style={[styles.btnSweep, { width: 50, transform: [{ translateX: bannerSweepX }, { skewX: '-20deg' }] }]} />
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        </ScrollView>
                    </SafeAreaView>

                    {/* 🎭 VELVET CURTAINS (slide apart on entry) */}
                    <Animated.View pointerEvents="none" style={[styles.curtain, { left: 0, transform: [{ translateX: curtainLeftX }] }]}>
                        <LinearGradient colors={['#2B0509', '#9B1226', '#4A0A14']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                        <View style={[styles.curtainSeam, { right: 0 }]} />
                    </Animated.View>
                    <Animated.View pointerEvents="none" style={[styles.curtain, { right: 0, transform: [{ translateX: curtainRightX }] }]}>
                        <LinearGradient colors={['#4A0A14', '#9B1226', '#2B0509']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                        <View style={[styles.curtainSeam, { left: 0 }]} />
                    </Animated.View>

                    {/* 📸 CAMERA FLASH */}
                    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: '#FFF', opacity: flashAnim }]} />
                </View>
            </Modal>

            <Modal visible={showPreviewModal} transparent animationType="slide" onRequestClose={() => setShowPreviewModal(false)}>
                <BlurView intensity={95} tint="dark" style={styles.previewModalOverlay}>
                    <TouchableOpacity style={styles.closePreviewBtn} onPress={() => setShowPreviewModal(false)}>
                        <Ionicons name="close-circle" size={40} color="#FFF" />
                    </TouchableOpacity>
                    <View style={[styles.previewVideoContainer, { borderColor: theme.primary, shadowColor: theme.primary }]}>
                        {expertData?.teaserVideo && (
                            <VideoView
                                player={player}
                                style={styles.previewVideo}
                                contentFit="cover"
                                nativeControls={true}
                            />
                        )}
                    </View>
                </BlurView>
            </Modal>

            {/* 📞 INCOMING CALL (ripples + rotating ring + pulsing accept) */}
            <Modal visible={showCallModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                    <LinearGradient colors={['transparent', theme.primary + '20', 'transparent']} style={StyleSheet.absoluteFill} />
                    <Animated.View pointerEvents="none" style={[styles.shimmerOrb, { top: height * 0.15, right: -80, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
                    <Animated.View pointerEvents="none" style={[styles.shimmerOrb, { bottom: height * 0.1, left: -100, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />
                    <View style={styles.callContent}>
                        <View style={styles.pulseContainer}>
                            <Ripple delay={0} color={theme.primary + '90'} />
                            <Ripple delay={800} color={theme.accent + '80'} />
                            <Ripple delay={1600} color={theme.secondary + '80'} />
                            <View style={[styles.outerPulse, { borderColor: theme.primary + '60' }]} />
                            <View style={styles.callRingClip}>
                                <Animated.View style={{ width: 240, height: 240, transform: [{ rotate: spin }] }}>
                                    <LinearGradient
                                        colors={[theme.primary, 'transparent', theme.secondary, 'transparent', theme.accent, theme.primary]}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        style={{ flex: 1 }}
                                    />
                                </Animated.View>
                            </View>
                            <Image source={{ uri: `https://ui-avatars.com/api/?name=${incomingCall?.callerName || 'U'}&background=${theme.primary.replace('#','')}&color=fff&size=200` }} style={[styles.callerAvatar, { borderColor: '#020617' }]} />
                        </View>
                        <Text style={[styles.incomingLabel, { color: theme.accent }]}>
                            {incomingCall?.isDiscoverCall ? '🚀 QUICK SYNC REQUEST' : 'INCOMING CALL'}
                        </Text>
                        <Text style={styles.callerNameText}>{incomingCall?.callerName || "New User"}</Text>
                        <Text style={styles.callSubText}>
                            {incomingCall?.isDiscoverCall ? 'System Discovered you with this user!' : 'Wants to initiate a session...'}
                        </Text>
                        <View style={styles.callActionRow}>
                            <View style={{ alignItems: 'center' }}>
                                <TouchableOpacity onPress={handleRejectCall} style={[styles.actionBtn, styles.declineBg]}>
                                    <Ionicons name="close" size={40} color="#FFF" />
                                </TouchableOpacity>
                                <Text style={styles.actionLabel}>DECLINE</Text>
                            </View>
                            <View style={{ alignItems: 'center' }}>
                                <Animated.View style={{ transform: [{ scale: acceptPulse }] }}>
                                    <TouchableOpacity onPress={handleAcceptCall} style={[styles.actionBtn, styles.acceptBg, { shadowColor: '#34C759' }]}>
                                        <Ionicons name="videocam" size={35} color="#FFF" />
                                    </TouchableOpacity>
                                </Animated.View>
                                <Text style={styles.actionLabel}>ACCEPT</Text>
                            </View>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    loaderText: { color: '#6366F1', marginTop: 12, fontSize: 10, fontWeight: '900', letterSpacing: 3 },
    loaderBrand: { color: '#FFF', fontSize: 28, fontWeight: '900', letterSpacing: 2, marginTop: 26 },
    loaderRingWrap: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center' },
    loaderRingClip: { width: 140, height: 140, borderRadius: 70, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    loaderRingInner: { position: 'absolute', width: 124, height: 124, borderRadius: 62, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
    
    compactTopBar: {
        width: 'auto',
        justifyContent: 'center',
        paddingVertical: 12, 
        paddingHorizontal: 12,
        marginHorizontal: 15,
        marginTop: 10,
        marginBottom: 10,
        borderRadius: 24,
        overflow: 'hidden',
    },
    studioHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingHorizontal: 2 },
    studioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF0000', marginRight: 8 },
    studioTitle: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 2.5 },
    studioSub: { color: '#64748B', fontSize: 8, fontWeight: '800', letterSpacing: 1, marginLeft: 'auto' },
    compactActionGrid: {
        width: '100%',
        gap: 10
    },
    compactRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 10,
        justifyContent: 'space-between'
    },
    compactBtn: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    compactGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 8
    },
    btnIconCircle: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center' },
    btnSweep: { position: 'absolute', top: -10, bottom: -10, width: 34, backgroundColor: 'rgba(255,255,255,0.28)' },
    compactBtnText: {
        color: '#FFF',
        fontWeight: '900',
        fontSize: 11,
        letterSpacing: 1,
    },
    liveButtonGlow: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        borderRadius: 12,
        backgroundColor: '#FF0000',
        opacity: 0.2,
        zIndex: -1
    },

    masterclassBtn: {
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 5,
    },
    spotlightBgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.55 },
    masterclassGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', 
        padding: 15, 
        overflow: 'hidden',
    },
    masterclassTitle: {
        fontSize: 14, 
        fontWeight: '900',
        letterSpacing: 3, 
        textTransform: 'uppercase'
    },

    // 👑 ROYAL COMMAND DECK
    royalWrap: { marginHorizontal: 15, marginTop: 10, marginBottom: 10, borderRadius: 28, overflow: 'hidden', elevation: 10, shadowColor: '#F5D77A', shadowOpacity: 0.35, shadowRadius: 14 },
    royalFrame: { padding: 1.5, borderRadius: 28 },
    royalInner: { borderRadius: 26.5, padding: 12, backgroundColor: 'rgba(2, 6, 23, 0.92)', overflow: 'hidden' },
    royalBtn: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, elevation: 8, shadowOpacity: 0.5, shadowRadius: 10 },
    royalBtnGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, gap: 12, overflow: 'hidden' },
    royalWatermark: { position: 'absolute', right: -12, bottom: -14, transform: [{ rotate: '-14deg' }] },
    royalIconWrap: { width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
    royalIconPulse: { position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 1.5 },
    royalIconCircle: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)', justifyContent: 'center', alignItems: 'center' },
    royalBtnText: { color: '#FFF', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
    royalSpotlight: { borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255, 236, 170, 0.8)', elevation: 8, shadowColor: '#F5D77A', shadowOpacity: 0.55, shadowRadius: 12 },
    royalSpotlightGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, overflow: 'hidden' },
    royalSpotlightText: { color: '#2B1B00', fontSize: 13, fontWeight: '900', letterSpacing: 4 },
    royalDivider: { width: 22, height: 1.5, backgroundColor: 'rgba(43,27,0,0.55)', marginHorizontal: 10 },

    // 🚪 NEW: STUDIO ROOM PORTAL (slim bar on the dashboard) - old styles kept
    portalWrap: { marginHorizontal: 15, marginTop: 8, marginBottom: 6, borderRadius: 24, overflow: 'hidden', elevation: 10, shadowColor: '#F5D77A', shadowOpacity: 0.35, shadowRadius: 12 },
    portalFrame: { padding: 1.5, borderRadius: 24 },
    portalInner: { flexDirection: 'row', alignItems: 'center', height: 54, borderRadius: 22.5, paddingHorizontal: 14, backgroundColor: 'rgba(2, 6, 23, 0.94)', overflow: 'hidden' },
    portalDotWrap: { width: 22, height: 22, justifyContent: 'center', alignItems: 'center' },
    portalDotPulse: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF1F3D' },
    portalDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#FF1F3D', shadowColor: '#FF1F3D', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
    portalTitle: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 2.2 },
    portalSub: { color: '#94A3B8', fontSize: 8.5, fontWeight: '800', letterSpacing: 1, marginTop: 2 },
    portalMiniRow: { flexDirection: 'row', gap: 5, marginRight: 10 },
    portalMini: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    portalEnter: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 11, height: 28, borderRadius: 14, backgroundColor: '#F5D77A' },
    portalEnterText: { color: '#2B1B00', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },

    // 🆕🆕🆕 NEW: TOP BANNER DOCK (full-width, fused with the notification banner, only the name)
    bannerWrap: { marginTop: 0, marginBottom: 8, elevation: 10, shadowColor: '#F5D77A', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
    bannerDock: { height: 40, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, overflow: 'hidden', justifyContent: 'center', backgroundColor: 'rgba(2, 6, 23, 0.9)' },
    bannerTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1 },
    bannerBottomLine: { position: 'absolute', bottom: 0, left: 36, right: 36, height: 1.5 },
    bannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
    bannerSideLine: { flex: 1, height: 1, marginHorizontal: 12, maxWidth: 70 },
    bannerDotWrap: { width: 18, height: 18, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
    bannerTitle: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 6, textShadowColor: 'rgba(245, 215, 122, 0.85)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },

    // 🆕🆕🆕 NEW: TOP STUDIO ROOM BUTTON (wide pill, running light border)
    btnWrap: { marginHorizontal: 6, marginTop: 8, marginBottom: 10, borderRadius: 26, elevation: 14, shadowColor: '#F5D77A', shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 9 } },
    btn3dBase: { borderRadius: 27, backgroundColor: '#7A5A0E', paddingBottom: 8, overflow: 'hidden' },
    btnBevelBottom: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 20 },
    btnTopEdge: { position: 'absolute', top: 0, left: 20, right: 20, height: 1.5, borderRadius: 1, backgroundColor: 'rgba(255,255,255,0.75)' },
    btnFaceShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.22)' },
    btn3dShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
    btnFrame: { padding: 1.5, borderRadius: 26 },
    btnFace: { flexDirection: 'row', alignItems: 'center', height: 58, paddingHorizontal: 10, borderRadius: 24.5, backgroundColor: 'rgba(2, 6, 23, 0.96)', overflow: 'hidden' },
    btnEmblemWrap: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    btnEmblemClip: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    btnEmblemInner: { position: 'absolute', width: 38, height: 38, borderRadius: 19, backgroundColor: '#0B0618', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(245,215,122,0.35)' },
    btnDivider: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch', marginTop: 4 },
    btnSolidGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 30 },
    btnTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 5, textAlign: 'center', textShadowColor: 'rgba(245,215,122,0.85)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },

    // 🆕🆕🆕 NEW: Studio Room beams + floor
    beamHolder: { position: 'absolute', top: -height * 0.75, width: 120, height: height * 1.5 },
    beamBody: { position: 'absolute', top: height * 0.75, left: 0, right: 0, bottom: 0, borderBottomLeftRadius: 60, borderBottomRightRadius: 60 },
    studioFloor: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 180 },

    // 🎭 NEW: STUDIO ROOM (full-screen immersive room)
    studioRoot: { flex: 1, backgroundColor: '#020617', overflow: 'hidden' },
    studioCone: { position: 'absolute', top: 0, left: width * 0.1, right: width * 0.1, height: height * 0.7, borderBottomLeftRadius: 400, borderBottomRightRadius: 400, overflow: 'hidden' },
    studioHead: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 6 },
    studioHeadFrame: { padding: 1.5, borderRadius: 26 },
    studioHeadInner: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 24.5, backgroundColor: 'rgba(2, 6, 23, 0.94)', overflow: 'hidden' },
    studioEmblemWrap: { width: 56, height: 56, justifyContent: 'center', alignItems: 'center' },
    studioEmblemClip: { width: 56, height: 56, borderRadius: 28, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    studioEmblemInner: { position: 'absolute', width: 48, height: 48, borderRadius: 24, backgroundColor: '#0B0618', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(245,215,122,0.35)' },
    studioHeadDot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#FF1F3D', marginRight: 9, shadowColor: '#FF1F3D', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
    studioHeadTitle: { flexShrink: 1, color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 3.5, textShadowColor: 'rgba(245,215,122,0.75)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
    studioHeadDivider: { flexDirection: 'row', alignItems: 'center', marginTop: 6, marginBottom: 5 },
    studioHeadDividerLine: { flex: 1, height: 1 },
    studioHeadDiamond: { width: 6, height: 6, backgroundColor: '#F5D77A', transform: [{ rotate: '45deg' }], marginHorizontal: 6 },
    studioHeadSub: { color: '#94A3B8', fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
    studioClose: { width: 42, height: 42, borderRadius: 21, flexShrink: 0, zIndex: 30, backgroundColor: 'rgba(255,31,61,0.22)', borderWidth: 1.5, borderColor: '#FF8FA0', shadowColor: '#FF1F3D', shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8, justifyContent: 'center', alignItems: 'center' },
    studioScroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 18, paddingVertical: 20 },
    stageCard: { borderRadius: 28, overflow: 'hidden', borderWidth: 1, elevation: 12, shadowOpacity: 0.55, shadowRadius: 16, shadowOffset: { width: 0, height: 8 } },
    stageGrad: { flex: 1, flexDirection: 'row', padding: 18, overflow: 'hidden' },
    stageSheen: { position: 'absolute', top: 0, left: 28, right: 28, height: 1.5 },
    stageWatermark: { position: 'absolute', right: -24, bottom: -30, transform: [{ rotate: '-14deg' }] },
    stageTitle: { color: '#FFF', fontSize: 30, fontWeight: '900', letterSpacing: 3, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
    stageSub: { color: 'rgba(255,255,255,0.78)', fontSize: 11, fontWeight: '700', marginTop: 3, letterSpacing: 0.4 },
    stageTap: { color: 'rgba(255,255,255,0.85)', fontSize: 8.5, fontWeight: '900', letterSpacing: 2, marginTop: 4 },
    stageTag: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1, borderColor: 'rgba(253,230,138,0.5)' },
    stageTagText: { color: '#FDE68A', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
    onAirSign: { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, borderWidth: 1.5, borderColor: '#FFB4BE', backgroundColor: 'rgba(0,0,0,0.35)', shadowColor: '#FF1F3D', shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
    onAirDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF1F3D' },
    onAirText: { color: '#FFD1D8', fontSize: 12, fontWeight: '900', letterSpacing: 3.5, textShadowColor: '#FF1F3D', textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 } },
    liveBtnWrap: { width: 100, alignItems: 'center', justifyContent: 'center' },
    liveStage: { width: 96, height: 96, alignItems: 'center', justifyContent: 'center' },
    liveRing: { position: 'absolute', top: 11, left: 11, width: 74, height: 74, borderRadius: 37, borderWidth: 2, borderColor: '#FFB4BE' },
    liveBtnCircle: { width: 74, height: 74, borderRadius: 37, marginTop: 0, backgroundColor: 'rgba(255,255,255,0.18)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.55)', justifyContent: 'center', alignItems: 'center' },
    seatBox: { width: 96, height: 96, alignSelf: 'center', justifyContent: 'center', alignItems: 'center' },
    seatDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#FDE68A', shadowColor: '#FDE68A', shadowOpacity: 0.9, shadowRadius: 5, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
    seatCenter: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', justifyContent: 'center', alignItems: 'center' },
    spotSub: { color: 'rgba(43,27,0,0.8)', fontSize: 9, fontWeight: '900', letterSpacing: 2.5, marginTop: 8 },
    curtain: { position: 'absolute', top: 0, bottom: 0, width: width / 2 + 2, overflow: 'hidden' },
    curtainSeam: { position: 'absolute', top: 0, bottom: 0, width: 3, backgroundColor: '#F5D77A', opacity: 0.85 },

    previewModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)' },
    closePreviewBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: 20, zIndex: 100, shadowColor: '#000', shadowOpacity: 0.8, shadowRadius: 10 },
    previewVideoContainer: { width: width * 0.85, height: height * 0.7, borderRadius: 30, overflow: 'hidden', borderWidth: 2, elevation: 20, shadowOpacity: 0.5, shadowRadius: 20, backgroundColor: '#000' },
    previewVideo: { width: '100%', height: '100%' },
    
    floatingNavWrapper: { position: 'absolute', bottom: 12, left: 0, right: 0 },
    glassNav: {
        flexDirection: 'row',
        width: 'auto',
        marginHorizontal: 10,
        marginBottom: Platform.OS === 'ios' ? 45 : 30,
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderRadius: 30,
        borderWidth: 1,
        borderColor: 'rgba(245, 215, 122, 0.35)',
        backgroundColor: 'rgba(2, 6, 23, 0.55)',
        justifyContent: 'center',
        overflow: 'hidden'
    },
    navTopLine: { position: 'absolute', top: 0, left: 24, right: 24, height: 1.5 },
    navRow: { flexDirection: 'row', width: NAV_ROW_W, alignItems: 'center' },
    navIndicator: { position: 'absolute', top: 0, bottom: 0, left: 5, width: NAV_ITEM_W - 10, borderRadius: 22, borderWidth: 1, overflow: 'hidden' },
    navIndicatorTop: { position: 'absolute', top: 0, left: 14, right: 14, height: 2, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },

    navItem: { alignItems: 'center', justifyContent: 'center', width: NAV_ITEM_W, paddingVertical: 7 },
    iconBox: { width: 40, height: 28, justifyContent: 'center', alignItems: 'center' },
    activeIconBox: { shadowOpacity: 0.55, shadowRadius: 12, elevation: 8 },
    navText: { fontSize: 8, fontWeight: '800', marginTop: 3, letterSpacing: 0.4 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    callContent: { alignItems: 'center', width: '100%', zIndex: 10 },
    pulseContainer: { width: 180, height: 180, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
    outerPulse: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2 },
    callRingClip: { position: 'absolute', width: 160, height: 160, borderRadius: 80, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    callerAvatar: { position: 'absolute', width: 146, height: 146, borderRadius: 73, borderWidth: 4 },
    incomingLabel: { fontWeight: '900', fontSize: 11, letterSpacing: 4, marginBottom: 15 },
    callerNameText: { color: '#FFF', fontSize: 36, fontWeight: '900', marginBottom: 5, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 10 },
    callSubText: { color: '#94A3B8', fontSize: 14, fontWeight: '600', marginBottom: 60 },
    callActionRow: { flexDirection: 'row', gap: 60 },
    actionBtn: { width: 85, height: 85, borderRadius: 42.5, justifyContent: 'center', alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 15 },
    actionLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginTop: 12 },
    declineBg: { backgroundColor: '#FF3B30' },
    acceptBg: { backgroundColor: '#34C759' },
});
