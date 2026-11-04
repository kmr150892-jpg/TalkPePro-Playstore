import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Image,
    ImageBackground,
    Modal,
    PanResponder,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LevelAvatar from '../../components/LevelAvatar';
import { LivePreview } from '../../components/LivePreview';
import WelcomeRewardModal from '../../components/WelcomeRewardModal';
import { auth, db } from '../../firebaseConfig';

const { height, width } = Dimensions.get('window');

// 🖼️ PREMIUM IMAGE ASSETS (replace with your own local images: require('../../assets/xxx.jpg') if you like)
const IMG_WALLET_BG = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80';
const IMG_CONNECT_BG = 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?w=900&q=80';
const FALLBACK_HOST_IMG = 'https://i.pravatar.cc/150';

// ✨ TWINKLING STAR FIELD POSITIONS
const STARS = [
    { top: 60, left: 30, size: 3 }, { top: 120, left: width * 0.8, size: 2 }, { top: 210, left: width * 0.5, size: 3 },
    { top: 320, left: 20, size: 2 }, { top: 430, left: width * 0.9, size: 3 }, { top: 520, left: width * 0.3, size: 2 },
    { top: 640, left: width * 0.7, size: 3 }, { top: 760, left: 40, size: 2 }, { top: 150, left: width * 0.15, size: 2 },
    { top: 580, left: width * 0.55, size: 2 },
];

// 🛡️ SAFE ALPHA HELPER: some tier colors are already 8-digit hex (e.g. '#f52b6092'),
// so adding another alpha made an INVALID color -> LinearGradient native crash. This always normalizes first.
const withAlpha = (hex: string, alpha: string = 'FF') => {
    const base = (hex || '#000000').length >= 7 ? hex.slice(0, 7) : hex;
    return base + alpha;
};

// 🧩 TYPED RANK (themeBg is a strict 2-color tuple -> fixes the LinearGradient TypeScript overload error)
type UserRank = {
    lvl: number;
    label: string;
    status: string;
    color: string;
    secondaryColor: string;
    anim: string;
    themeBg: readonly [string, string];
};

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT THEME SYNC V2)
const calculateUserLevel = (totalSpent: number): UserRank => {

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
  // ✅ FIXED: Level 1 Secondary Color changed to RED (#6b0402)
  return { 
      lvl: 1, label: 'SILVER AGENT', status: 'STAR FAME', color: '#0f33e7', secondaryColor: '#6b0402', anim: 'wave', themeBg: ['#050505', '#000000']
  };
};

// 🔥 EXPERT THEME LOGIC (SYNCED)
const getLevelTheme = (totalBeans: number = 0) => {

    if (totalBeans >= 10000000) return { color: '#F59E0B', label: 'MASTER' };
    if (totalBeans >= 5000000) return { color: '#EC4899', label: 'MYTHIC' };
    if (totalBeans >= 1000000) return { color: '#10B981', label: 'DIAMOND' };
    return { color: '#94A3B8', label: 'AGENT' };
};

const getExpertThemeColor = (earned: number) => {

    if (earned >= 10000000) return '#F59E0B';
    if (earned >= 5000000) return '#EC4899';
    if (earned >= 1000000) return '#10B981';
    return '#94A3B8';
};

// 🆕 PRESS-SCALE 3D CARD WRAPPER (spring squish + optional perspective tilt)
const PressCard = ({ children, style, onPress, tilt = 0, activeOpacity = 0.9 }: any) => {
    const s = useRef(new Animated.Value(1)).current;
    return (
        <Animated.View style={{ transform: [{ perspective: 900 }, { rotateY: `${tilt}deg` }, { scale: s }] }}>
            <TouchableOpacity
                activeOpacity={activeOpacity}
                style={style}
                onPress={onPress}
                onPressIn={() => Animated.spring(s, { toValue: 0.94, friction: 6, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(s, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
            >
                {children}
            </TouchableOpacity>
        </Animated.View>
    );
};

// 🆕 CARD SIZES
const LIVE_W = 176;
const FRAME_H = 240;
const LIVE_H = 288;
const FORUM_W = 276;
const FORUM_H = 150;

// 🚪 LOUNGE SIZES (HORIZONTAL portal cards on home + cards inside the lounge)
// 🔥 UPDATED: portal is now a full-width HORIZONTAL rectangle (was a vertical arch)
const PORTAL_W = width - 40;
const PORTAL_H = 138;
const ROOM_W = width - 40;
const ROOM_LIVE_H = 230;

// 🆕 ROTATING NEON BORDER FRAME (light beam circles the card edge) - rt/rb = top/bottom radius (arch support)
const NeonFrame = ({ w, h, rt, rb, c1, c2, rotate, children }: any) => {
    const diag = Math.sqrt(w * w + h * h) + 24;
    const k1 = withAlpha(c1, 'FF'), k1t = withAlpha(c1, '00');
    const k2 = withAlpha(c2, 'FF'), k2t = withAlpha(c2, '00');
    return (
        <View style={{ width: w, height: h, borderTopLeftRadius: rt, borderTopRightRadius: rt, borderBottomLeftRadius: rb, borderBottomRightRadius: rb, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' }}>
            <Animated.View style={{ position: 'absolute', width: diag, height: diag, transform: [{ rotate }] }}>
                <LinearGradient colors={[k1, k1t, k2, k2t, k1]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
            </Animated.View>
            <View style={{ position: 'absolute', top: 2.5, left: 2.5, right: 2.5, bottom: 2.5, borderTopLeftRadius: rt - 2.5, borderTopRightRadius: rt - 2.5, borderBottomLeftRadius: rb - 2.5, borderBottomRightRadius: rb - 2.5, overflow: 'hidden', backgroundColor: '#050816' }}>
                {children}
            </View>
        </View>
    );
};

// 🆕 LIVE AUDIO EQUALIZER BARS (forum cards)
const EqBars = ({ loop, color }: any) => {
    const sets = [
        [0.3, 1, 0.5, 0.9, 0.3],
        [1, 0.4, 0.9, 0.3, 1],
        [0.5, 0.9, 0.3, 1, 0.5],
        [0.9, 0.3, 1, 0.5, 0.9],
    ];
    return (
        <View style={{ flexDirection: 'row', alignItems: 'center', height: 18, gap: 3 }}>
            {sets.map((out, i) => (
                <Animated.View key={i} style={{ width: 3, height: 18, borderRadius: 2, backgroundColor: color, transform: [{ scaleY: loop.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: out }) }] }} />
            ))}
        </View>
    );
};

// 🌐 HOST ORB (outside portal design)
// Center avatar cycles through the CURRENT host images (fade swap every few seconds),
// tiny host avatars orbit around it, and the blurred backdrop follows the current host.
// Because `pics` always comes from the live host profile, a changed host image shows up here instantly.
// 🔥 UPDATED: orb now sits on the LEFT side of the horizontal portal card.
const ORB_SIZE = 104;
const ORB_R = 42;
const ORB_MINI = 24;

const PortalHostOrb = ({ pics, c1, c2, rotate, rotateRev, pulseOpacity, pulseScale, icon }: any) => {
    const [idx, setIdx] = useState(0);
    const fade = useRef(new Animated.Value(1)).current;
    const picsKey = pics.join('|');

    useEffect(() => {
        setIdx(0);
        fade.setValue(1);
    }, [picsKey]);

    useEffect(() => {
        if (pics.length < 2) return;
        const t = setInterval(() => {
            Animated.timing(fade, { toValue: 0, duration: 260, useNativeDriver: true }).start(() => {
                setIdx(p => (p + 1) % pics.length);
                Animated.timing(fade, { toValue: 1, duration: 320, useNativeDriver: true }).start();
            });
        }, 3200);
        return () => clearInterval(t);
    }, [picsKey]);

    const hasPics = pics.length > 0;
    const current = hasPics ? pics[idx % pics.length] : null;
    const orbitPics = pics.slice(0, 4);

    return (
        <>
            {/* blurred backdrop follows the current host */}
            {current ? (
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: fade }]}>
                    <Image source={{ uri: current }} blurRadius={26} style={[StyleSheet.absoluteFill, { opacity: 0.4 }]} />
                </Animated.View>
            ) : (
                <ImageBackground source={{ uri: IMG_WALLET_BG }} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.28 }} />
            )}
            <LinearGradient pointerEvents="none" colors={[withAlpha(c1, '55'), 'rgba(2,6,23,0.75)', 'rgba(0,0,0,0.95)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />

            <View style={styles.hostOrbBox} pointerEvents="none">
                {/* soft pulse */}
                <Animated.View style={[styles.hostOrbPulse, { backgroundColor: withAlpha(c1, '44'), opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                {/* big dashed ring */}
                <Animated.View style={[styles.hostOrbDash, { borderColor: withAlpha(c2, 'CC'), transform: [{ rotate }] }]} />
                {/* inner dotted ring */}
                <Animated.View style={[styles.hostOrbDot, { borderColor: withAlpha(c1, 'CC'), transform: [{ rotate: rotateRev }] }]} />

                {/* orbiting mini host avatars */}
                {orbitPics.length > 1 && (
                    <Animated.View style={[styles.hostOrbitWrap, { transform: [{ rotate }] }]}>
                        {orbitPics.map((p: string, i: number) => {
                            const ang = (i * 2 * Math.PI) / orbitPics.length - Math.PI / 2;
                            const left = ORB_SIZE / 2 + ORB_R * Math.cos(ang) - ORB_MINI / 2;
                            const top = ORB_SIZE / 2 + ORB_R * Math.sin(ang) - ORB_MINI / 2;
                            return (
                                <Animated.View key={`om-${i}-${p}`} style={[styles.hostOrbMini, { left, top, borderColor: withAlpha(c2, 'FF'), transform: [{ rotate: rotateRev }] }]}>
                                    <Image source={{ uri: p }} style={styles.hostOrbMiniImg} />
                                </Animated.View>
                            );
                        })}
                    </Animated.View>
                )}

                {/* center cycling avatar */}
                <View style={[styles.hostOrbCore, { borderColor: withAlpha(c1, 'FF'), shadowColor: c1 }]}>
                    {current ? (
                        <Animated.Image source={{ uri: current }} style={[styles.hostOrbCoreImg, { opacity: fade }]} />
                    ) : (
                        <MaterialCommunityIcons name="door-closed-lock" size={26} color="#64748B" />
                    )}
                </View>

                {/* tiny type badge */}
                <View style={[styles.hostOrbBadge, { backgroundColor: withAlpha(c1, 'FF') }]}>
                    <MaterialCommunityIcons name={icon} size={11} color="#FFF" />
                </View>
            </View>
        </>
    );
};

export default function UserHome() {

    const router = useRouter();
    const user = auth.currentUser;
    const isFocused = useIsFocused();

    const [experts, setExperts] = useState<any[]>([]);
    const [activeLives, setActiveLives] = useState<any[]>([]);
    const [activeParties, setActiveParties] = useState<any[]>([]); // 🔥 NEW STATE FOR Session ROOMS
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeLiveId, setActiveLiveId] = useState<string | null>(null);
    
    // 🔥 NEW STATES FOR PLAY STORE SAVER POP-UP 🔥
    const [showPolicyModal, setShowPolicyModal] = useState(false);
    const [dontShowToday, setDontShowToday] = useState(false);

    // 🔥 NEW STATE FOR DYNAMIC ONLINE COUNT FLUCTUATION 🔥
    const [dynamicOffset, setDynamicOffset] = useState(42);

    // 🚪 LOUNGE STATE: which lounge is currently open ('live' = Live Lounge, 'forum' = Forum Lounge)
    const [roomType, setRoomType] = useState<'live' | 'forum' | null>(null);

    // 🌀 MASTER ANIMATION ENGINE
    const scrollY = useRef(new Animated.Value(0)).current;
    const mainLoop = useRef(new Animated.Value(0)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const trailX = useRef(new Animated.Value(-width)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current; 

    // 🆕 NEW ANIMATION VALUES
    const enter = useRef(new Animated.Value(0)).current;        // staggered entrance
    const tiltX = useRef(new Animated.Value(0)).current;        // wallet 3D tilt (vertical drag)
    const tiltY = useRef(new Animated.Value(0)).current;        // wallet 3D tilt (horizontal drag)
    const shineAnim = useRef(new Animated.Value(0)).current;    // quick-connect shine sweep
    const pulseAnim = useRef(new Animated.Value(0)).current;    // glow pulse (live dot / connect button)
    const holoAnim = useRef(new Animated.Value(0)).current;     // wallet holographic sweep

    // 🚪 LOUNGE OPEN ANIMATION VALUES
    const roomAnim = useRef(new Animated.Value(0)).current;     // content reveal (0 closed -> 1 open)
    const burstAnim = useRef(new Animated.Value(0)).current;    // warp rings + scanner beam

    // 🆕 WALLET CARD DRAG-TO-TILT (3D)
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
            onPanResponderMove: (_, g) => {
                tiltY.setValue(Math.max(-1, Math.min(1, g.dx / 120)));
                tiltX.setValue(Math.max(-1, Math.min(1, g.dy / 80)));
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

    const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

    const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
        if (viewableItems && viewableItems.length > 0) setActiveLiveId(viewableItems[0].item.id);
    }).current;

    // 🔥 DYNAMIC ONLINE COUNT EFFECT
    useEffect(() => {
        const interval = setInterval(() => {
            // Generates a random number between 38 and 62 to make the online count look real and constantly updating
            setDynamicOffset(Math.floor(Math.random() * 25) + 38);
        }, 3500); 
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {

        Animated.loop(Animated.timing(mainLoop, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true })).start();

        Animated.loop(Animated.sequence([
            Animated.timing(floatAnim, { toValue: -10, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(floatAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])).start();

        Animated.loop(Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 1.04, duration: 1500, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 1500, useNativeDriver: true })
        ])).start();

        Animated.loop(Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 2, duration: 45, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -2, duration: 45, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 45, useNativeDriver: true }),
            Animated.delay(2000)
        ])).start();

        // 🔥 Start Ambient Shimmer (SMOOTH FLOATING SEQUENCE)
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                  toValue: 1,
                  duration: 4000,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true
                }),
                Animated.timing(shimmerAnim, {
                  toValue: 0,
                  duration: 4000,
                  easing: Easing.inOut(Easing.sin),
                  useNativeDriver: true
                })
            ])
        ).start();

        // 🆕 ENTRANCE (one orchestrated reveal on load)
        Animated.timing(enter, { toValue: 1, duration: 1400, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

        // 🆕 QUICK CONNECT SHINE SWEEP
        Animated.loop(Animated.sequence([
            Animated.timing(shineAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.delay(1800),
            Animated.timing(shineAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])).start();

        // 🆕 GLOW PULSE
        Animated.loop(Animated.sequence([
            Animated.timing(pulseAnim, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(pulseAnim, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])).start();

        // 🆕 WALLET HOLOGRAPHIC SWEEP
        Animated.loop(Animated.sequence([
            Animated.delay(1200),
            Animated.timing(holoAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
            Animated.timing(holoAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])).start();

        const runTrail = () => {
            trailX.setValue(-width);
            Animated.timing(trailX, { toValue: width, duration: 3500, useNativeDriver: true }).start(() => runTrail());
        };
        runTrail();

        if (!user) { setLoading(false); return; }

        const q = query(collection(db, 'users'), where('role', '==', 'expert'));

        const unsubExperts = onSnapshot(q, (snap) => {
            setExperts(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        const liveQuery = query(collection(db, 'lives'), where('status', '==', 'live'));

        const unsubLives = onSnapshot(liveQuery, (snap) => {
            setActiveLives(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        // 🔥 FIX: FETCH ACTIVE FORUMS FROM 'forum_rooms' COLLECTION 🔥
        const partyQuery = query(collection(db, 'forum_rooms'), where('status', '==', 'active'));

        const unsubParties = onSnapshot(partyQuery, (snap) => {
            setActiveParties(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const userRef = doc(db, 'users', user.uid);

        const unsubUser = onSnapshot(userRef, (docSnap) => {
            if (docSnap.exists()) setUserData(docSnap.data());
        });

        return () => { unsubExperts(); unsubLives(); unsubUser(); unsubParties(); };

    }, [user]);

    // 🔥 SATTI FIX: Fetching the Maximum of DIAMOND/RECHARGE fields only for accurate Home Screen Level
    const userDiamonds = userData?.totalSpentDiamonds || 0;

    const userRank = calculateUserLevel(userDiamonds);

    // 🔔 BELL BADGE COUNT (same rule as the notifications screen: unread OR newer than last seen time)
    const notifSeenAt = userData?.notifSeenAt === undefined ? null : (Number(userData?.notifSeenAt) || 0);
    const seenLevelKeys = new Set<string>();
    const unreadCount = (Array.isArray(userData?.notifications) ? userData.notifications : []).filter((n: any) => {
        // same level-up duplicate is hidden in the list, so it is not counted here either
        const title = String(n?.title || '');
        if (n?.type !== 'call' && /level/i.test(title)) {
            const k = `${title}|${n?.message || ''}`;
            if (seenLevelKeys.has(k)) return false;
            seenLevelKeys.add(k);
        }
        const unread = !(n?.read === true || n?.isRead === true);
        const newer = notifSeenAt !== null && typeof n?.createdAt === 'number' && n.createdAt > notifSeenAt;
        return unread || newer;
    }).length;

    const uPic = userData?.profilePic || `https://ui-avatars.com/api/?name=${userData?.name || 'User'}&background=020617&color=fff&bold=true`;

    const parallaxAura = scrollY.interpolate({ inputRange: [0, 300], outputRange: [0, -50], extrapolate: 'clamp' });
    const cardScale = scrollY.interpolate({ inputRange: [-100, 0, 100], outputRange: [1.05, 1, 0.98], extrapolate: 'clamp' });

    // ==========================================
    // 🔥 CORE GHOST FILTER APPLICATION (DIRECT SYNC) 🔥
    // ==========================================

    const currentBlocked = userData?.blockedUsers || [];
    
    // 1. Filter Experts (Two-Way Block Check)
    const safeExperts = experts.filter((expert) => {
        const hostBlockedUsers = expert.blockedUsers || [];
        const notBlockedByMe = !currentBlocked.includes(expert.id);
        const notBlockedByHost = !hostBlockedUsers.includes(user?.uid);
        return notBlockedByMe && notBlockedByHost;
    });

    // 2. Filter Lives (Two-Way Block Check)
    const safeLives = activeLives.filter(live => {
        const hostProfile = experts.find(e => e.id === live.hostId);
        const hostBlockedUsers = hostProfile?.blockedUsers || [];
        const notBlockedByMe = !currentBlocked.includes(live.hostId);
        const notBlockedByHost = !hostBlockedUsers.includes(user?.uid);
        return notBlockedByMe && notBlockedByHost;
    });

    // 3. Filter Parties/Forums (Two-Way Block Check)
    const safeParties = activeParties.filter(party => {
        const hostProfile = experts.find(e => e.id === party.hostId);
        const hostBlockedUsers = hostProfile?.blockedUsers || [];
        const notBlockedByMe = !currentBlocked.includes(party.hostId);
        const notBlockedByHost = !hostBlockedUsers.includes(user?.uid);
        return notBlockedByMe && notBlockedByHost;
    });

    // 4. Spotlight (Featured) inherits from already filtered safeExperts
    const spotlightExperts = safeExperts.filter(e => (e.rating || 5.0) >= 4.0);

    // ==========================================
    // 🔄 LIVE HOST IMAGE / NAME SYNC
    // The `lives` / `forum_rooms` docs hold an OLD snapshot of hostImage.
    // We always read the CURRENT host profile (users collection, real-time) first,
    // and only fall back to the old snapshot if the profile has no picture.
    // ==========================================
    const getHostPic = (item: any): string => {
        const hostProfile = experts.find(e => e.id === item?.hostId);
        return hostProfile?.profilePic || hostProfile?.photoURL || item?.hostImage || FALLBACK_HOST_IMG;
    };

    const getHostName = (item: any): string => {
        const hostProfile = experts.find(e => e.id === item?.hostId);
        return hostProfile?.name || item?.hostName || 'Host';
    };

    const getWalletStyle = () => {
        switch(userRank.anim) {
            case 'wave': return { transform: [{ translateY: mainLoop.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 5, 0] }) }] };
            case 'sparkle': return { transform: [{ scale: scaleAnim }, { translateY: floatAnim }] };
            case 'diamond': return { transform: [{ perspective: 1000 }, { rotateY: mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] };
            case 'nebula': return { transform: [{ perspective: 1000 }, { rotateX: '10deg' }, { scale: scaleAnim }] };
            case 'titan': return { transform: [{ translateX: shakeAnim }, { scale: 1.02 }] };
            default: return { transform: [{ translateY: floatAnim }] };
        }
    };

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -40]
    });

    // 🆕 STAGGERED REVEAL HELPER
    const reveal = (i: number) => {
        const start = Math.min(i * 0.12, 0.5);
        const end = Math.min(start + 0.5, 1);
        return {
            opacity: enter.interpolate({ inputRange: [start, end], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [{ translateY: enter.interpolate({ inputRange: [start, end], outputRange: [50, 0], extrapolate: 'clamp' }) }],
        };
    };

    // 🆕 WALLET 3D TILT + HOLO
    const walletTilt = {
        transform: [
            { perspective: 1000 },
            { rotateX: tiltX.interpolate({ inputRange: [-1, 1], outputRange: ['14deg', '-14deg'] }) },
            { rotateY: tiltY.interpolate({ inputRange: [-1, 1], outputRange: ['-20deg', '20deg'] }) },
        ],
    };
    const holoX = holoAnim.interpolate({ inputRange: [0, 1], outputRange: [-width, width] });
    const shineX = shineAnim.interpolate({ inputRange: [0, 1], outputRange: [-160, width] });
    const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
    const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] });
    const orbitRotate = mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const orbitRotateRev = mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });

    // 🔥 ALTERNATING BORDER STYLES (FLUID, 2px)
    const borderType1 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: userRank.color,
        borderRightColor: userRank.color,
        borderTopColor: withAlpha(userRank.secondaryColor, '80'),
        borderBottomColor: withAlpha(userRank.secondaryColor, '80'),
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    const borderType2 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: userRank.secondaryColor,
        borderRightColor: userRank.secondaryColor,
        borderTopColor: withAlpha(userRank.color, '80'),
        borderBottomColor: withAlpha(userRank.color, '80'),
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
    };

    // 🔥 NEW DIRECT CALL ROUTING LOGIC 🔥
    const handleExpertCallClick = (expert: any, liveSession: any) => {
        if (liveSession) {
            // Priority 1: Expert is LIVE. Send user to Live Room!
            router.push({ pathname: "/(tabs)/live/[liveId]", params: { liveId: liveSession.id } } as any);
        } else if (expert.isBusy === true || expert.isBusy === "true") {
            // Priority 2: Expert is not live, but is on another call (BUSY).
            Alert.alert(
                "Host is Engaged", 
                `${expert.name} is currently assisting another user. Please try again in a few minutes.`
            );
        } else {
            // Priority 3: Expert is free. Send user to detail page (to make the call).
            router.push({ pathname: '/expert-detail', params: { id: expert.id } } as any);
        }
    };

    // ==========================================
    // 🚪 LOUNGES: OPEN / CLOSE
    // ==========================================
    const openRoom = (type: 'live' | 'forum') => {
        const list = type === 'live' ? safeLives : safeParties;
        if (list.length === 0) {
            Alert.alert(
                type === 'live' ? "Live Lounge is Quiet" : "Forum Lounge is Quiet",
                type === 'live' ? "No host is broadcasting right now. Please check back soon!" : "No forum room is open right now. Please check back soon!"
            );
            return;
        }
        roomAnim.setValue(0);
        burstAnim.setValue(0);
        setActiveLiveId(null);
        setRoomType(type);
        Animated.parallel([
            Animated.timing(roomAnim, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
            Animated.timing(burstAnim, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        ]).start();
    };

    const closeRoom = () => {
        Animated.timing(roomAnim, { toValue: 0, duration: 380, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => {
            setRoomType(null);
        });
    };

    // instant close (used before navigating to a live / forum room so the modal doesn't stay on top)
    const leaveRoomTo = (target: any) => {
        roomAnim.setValue(0);
        setRoomType(null);
        router.push(target);
    };

    const roomC1 = roomType === 'forum' ? '#6366F1' : '#EF4444';
    const roomC2 = userRank.color;
    const roomList = roomType === 'live' ? safeLives : safeParties;

    const roomContentOpacity = roomAnim.interpolate({ inputRange: [0, 0.2, 0.6, 1], outputRange: [0, 0, 1, 1], extrapolate: 'clamp' });
    const roomContentScale = roomAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1], extrapolate: 'clamp' });
    const burstScale = burstAnim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 1], extrapolate: 'clamp' });
    const burstOpacity = burstAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.8, 0], extrapolate: 'clamp' });
    // 🌀 scanner beam sweeps top -> bottom once while the lounge opens
    const beamY = burstAnim.interpolate({ inputRange: [0, 1], outputRange: [0, height], extrapolate: 'clamp' });
    const beamOpacity = burstAnim.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 1, 1, 0], extrapolate: 'clamp' });

    // 🌀 WARP RINGS (3 expanding rings, each different speed)
    const warpRingStyle = (i: number) => ({
        borderColor: i % 2 === 0 ? withAlpha(roomC1, 'CC') : withAlpha(roomC2, 'CC'),
        opacity: burstAnim.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.9 - i * 0.2, 0], extrapolate: 'clamp' as const }),
        transform: [{ scale: burstAnim.interpolate({ inputRange: [0, 1], outputRange: [0.05, 0.55 + i * 0.45], extrapolate: 'clamp' as const }) }],
    });

    // 🃏 CARDS RISE IN WITH 3D FLIP, ONE BY ONE
    const roomItemReveal = (index: number) => {
        const start = Math.min(0.15 + index * 0.08, 0.55);
        const end = Math.min(start + 0.4, 1);
        return {
            opacity: roomAnim.interpolate({ inputRange: [start, end], outputRange: [0, 1], extrapolate: 'clamp' }),
            transform: [
                { perspective: 900 },
                { translateY: roomAnim.interpolate({ inputRange: [start, end], outputRange: [90, 0], extrapolate: 'clamp' }) },
                { rotateX: roomAnim.interpolate({ inputRange: [start, end], outputRange: ['35deg', '0deg'], extrapolate: 'clamp' }) },
            ],
        };
    };

    // 🚪 PORTAL (home screen entry to a lounge) - HORIZONTAL rectangle "gate" design
    // 🔥 UPDATED: wide landscape card. LEFT = cycling host orb, MIDDLE = title + hint + count chip,
    // RIGHT = live equalizer + glowing ENTER gate button. Corner brackets + scan line give a "gateway" feel.
    const renderPortal = (type: 'live' | 'forum') => {
        const isLive = type === 'live';
        const list = isLive ? safeLives : safeParties;
        const p1 = isLive ? '#EF4444' : '#6366F1';
        const p2 = userRank.color;
        const empty = list.length === 0;
        // always the CURRENT host pictures (synced with host profile), duplicates removed
        const pics: string[] = Array.from(new Set(list.map((it: any) => getHostPic(it)))).slice(0, 6) as string[];
        return (
            <PressCard
                tilt={isLive ? 2 : -2}
                style={{ width: PORTAL_W, height: PORTAL_H, opacity: empty ? 0.6 : 1 }}
                onPress={() => openRoom(type)}
            >
                <View style={[styles.portalShadow, { shadowColor: p1 }]}>
                    <NeonFrame w={PORTAL_W} h={PORTAL_H} rt={28} rb={28} c1={p1} c2={p2} rotate={isLive ? orbitRotate : orbitRotateRev}>
                        <PortalHostOrb
                            pics={pics}
                            c1={p1}
                            c2={p2}
                            rotate={isLive ? orbitRotate : orbitRotateRev}
                            rotateRev={isLive ? orbitRotateRev : orbitRotate}
                            pulseOpacity={pulseOpacity}
                            pulseScale={pulseScale}
                            icon={isLive ? 'broadcast' : 'forum'}
                        />

                        {/* 🆕 GATE CORNER BRACKETS */}
                        <View pointerEvents="none" style={[styles.vfCorner, { top: 7, right: 7, width: 12, height: 12, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 6, borderColor: withAlpha(p2, 'FF') }]} />
                        <View pointerEvents="none" style={[styles.vfCorner, { bottom: 7, right: 7, width: 12, height: 12, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 6, borderColor: withAlpha(p2, 'FF') }]} />

                        {/* 🆕 VERTICAL ENERGY DIVIDER (orb | info) */}
                        <View pointerEvents="none" style={[styles.portalDivider, { backgroundColor: withAlpha(p1, '88'), left: ORB_SIZE + 14 }]} />

                        {/* 🆕 SCAN LINE SWEEPING ACROSS THE CARD */}
                        <Animated.View pointerEvents="none" style={[styles.portalScan, { backgroundColor: withAlpha(p2, '33'), transform: [{ translateX: shineX }, { rotate: '18deg' }] }]} />

                        <View pointerEvents="none" style={styles.portalInner}>
                            <View style={styles.portalTextCol}>
                                <View style={styles.portalTagRow}>
                                    <View style={[styles.portalTagLine, { backgroundColor: p2 }]} />
                                    <Text style={[styles.portalSub, { color: p2 }]}>{isLive ? 'HOST' : 'HOST'}</Text>
                                </View>
                                <Text style={styles.portalTitle} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{isLive ? 'BROADCAST' : 'FORUM'}</Text>
                                <Text style={styles.portalHint} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>{isLive ? 'Watch hosts streaming right now' : 'Join open host discussions'}</Text>

                                {/* count chip */}
                                <View style={[styles.portalCountChip, { backgroundColor: withAlpha(p1, '33'), borderColor: withAlpha(p1, '99') }]}>
                                    <View style={[styles.portalCountDot, { backgroundColor: empty ? '#64748B' : '#10B981' }]} />
                                    <Text style={styles.portalCountText}>{list.length} {isLive ? 'LIVE' : 'OPEN'}</Text>
                                </View>
                            </View>

                            <View style={styles.portalRightCol}>
                                <EqBars loop={mainLoop} color={withAlpha(p1, 'FF')} />
                                <View style={[styles.portalEnterChip, { backgroundColor: withAlpha(p1, 'FF'), shadowColor: p1 }]}>
                                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                                </View>
                                <Text style={styles.portalEnterText}>ENTER</Text>
                            </View>
                        </View>
                    </NeonFrame>
                </View>
            </PressCard>
        );
    };

    // 🎥 CARD INSIDE LIVE LOUNGE (live host)
    const renderRoomLiveCard = (item: any, index: number) => {
        const isActive = item.id === activeLiveId && isFocused && roomType === 'live';
        const c1 = index % 2 === 0 ? userRank.color : userRank.secondaryColor;
        const c2 = index % 2 === 0 ? userRank.secondaryColor : userRank.color;
        const k1 = withAlpha(c1, 'FF');
        return (
            // 🔥 LIVE GOES TO LIVE 🔥
            <PressCard tilt={index % 2 === 0 ? 2 : -2} style={styles.roomCardWrap} onPress={() => leaveRoomTo({ pathname: "/(tabs)/live/[liveId]", params: { liveId: item.id } })}>
                <View style={[styles.roomLiveShadow, { shadowColor: k1 }]}>
                    <NeonFrame w={ROOM_W} h={ROOM_LIVE_H} rt={30} rb={30} c1={c1} c2={c2} rotate={index % 2 === 0 ? orbitRotate : orbitRotateRev}>
                        {isActive ? <LivePreview liveId={item.id} /> : <Image source={{ uri: getHostPic(item) }} style={styles.massLiveThumb} />}
                        <LinearGradient pointerEvents="none" colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.35)']} style={styles.liveSoftShade} />

                        {/* 🎥 VIEWFINDER CORNER BRACKETS */}
                        <View pointerEvents="none" style={[styles.vfCorner, { top: 12, left: 12, borderTopWidth: 2, borderLeftWidth: 2, borderTopLeftRadius: 8, borderColor: k1 }]} />
                        <View pointerEvents="none" style={[styles.vfCorner, { top: 12, right: 12, borderTopWidth: 2, borderRightWidth: 2, borderTopRightRadius: 8, borderColor: k1 }]} />
                        <View pointerEvents="none" style={[styles.vfCorner, { bottom: 12, left: 12, borderBottomWidth: 2, borderLeftWidth: 2, borderBottomLeftRadius: 8, borderColor: k1 }]} />
                        <View pointerEvents="none" style={[styles.vfCorner, { bottom: 12, right: 12, borderBottomWidth: 2, borderRightWidth: 2, borderBottomRightRadius: 8, borderColor: k1 }]} />

                        <View pointerEvents="none" style={styles.archBadgeWrap}>
                            <View style={styles.liveBadgeNew}>
                                <Animated.View style={[styles.liveBadgeDot, { opacity: pulseOpacity }]} />
                                <Text style={styles.liveBadgeText}>LIVE</Text>
                            </View>
                        </View>
                    </NeonFrame>
                </View>

                <View style={styles.liveNameRow}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.liveHostNameMass} numberOfLines={1}>{getHostName(item)}</Text>
                        <View style={[styles.liveNameLine, { backgroundColor: k1 }]} />
                    </View>
                    <EqBars loop={mainLoop} color={k1} />
                </View>
            </PressCard>
        );
    };

    // 💬 CARD INSIDE FORUM LOUNGE (forum host)
    const renderRoomForumCard = (item: any, index: number) => {
        const fc1 = index % 2 === 0 ? '#6366F1' : userRank.color;
        const fc2 = index % 2 === 0 ? userRank.color : '#6366F1';
        const hostPic = getHostPic(item);
        return (
            // 🔥 THE ULTIMATE ROOT FOLDER PATH FIX (/forum/[roomId]) 🔥
            <PressCard tilt={index % 2 === 0 ? 2 : -2} style={[styles.roomForumWrap, { shadowColor: '#6366F1' }]} onPress={() => leaveRoomTo({ pathname: "/forum/[roomId]", params: { roomId: item.roomId || item.id } })}>
                <NeonFrame w={ROOM_W} h={FORUM_H} rt={30} rb={30} c1={fc1} c2={fc2} rotate={index % 2 === 0 ? orbitRotateRev : orbitRotate}>
                    <Image source={{ uri: hostPic }} blurRadius={22} style={styles.forumBackdrop} />
                    <LinearGradient pointerEvents="none" colors={['rgba(49,46,129,0.80)', 'rgba(2,6,23,0.55)', 'rgba(2,6,23,0.92)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />

                    <View pointerEvents="none" style={styles.forumRow}>
                        <View style={[styles.forumThumbWrap, { borderColor: withAlpha(fc1, 'FF') }]}>
                            <Image source={{ uri: hostPic }} style={styles.forumThumb} />
                        </View>
                        <View style={styles.forumInfo}>
                            <View style={styles.forumBadge}>
                                <Ionicons name="chatbubbles" size={10} color="#FFF" />
                                <Text style={styles.liveBadgeText}>FORUM</Text>
                            </View>
                            <Text style={styles.forumRoomName} numberOfLines={2}>{item.roomName}</Text>
                            <View style={styles.forumHostRow}>
                                <Ionicons name="mic" size={11} color="#A5B4FC" />
                                <Text style={styles.forumHostText} numberOfLines={1}>Host: {getHostName(item)}</Text>
                            </View>
                            <View style={styles.forumFooter}>
                                <EqBars loop={mainLoop} color={withAlpha(fc2, 'FF')} />
                                <View style={[styles.joinChip, { backgroundColor: withAlpha(fc1, 'FF') }]}>
                                    <Text style={styles.joinChipText}>JOIN</Text>
                                    <Ionicons name="arrow-forward" size={10} color="#000" />
                                </View>
                            </View>
                        </View>
                    </View>
                </NeonFrame>
            </PressCard>
        );
    };

    return (
        <View style={styles.mainContainer}>

            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            {/* 🔥 IDHO UNGA WELCOME SPIN MODAL! */}
            <WelcomeRewardModal />
            
            {/* 🔥 HIGH-END PREMIUM POLICY WARNING MODAL 🔥 */}
            <Modal transparent visible={showPolicyModal} animationType="slide">
                <BlurView intensity={60} tint="dark" style={styles.policyModalContainer}>
                    <View style={styles.premiumModalBorder}>
                        <LinearGradient colors={['#1e0b24', '#0f0202', '#020617']} style={styles.policyModalBox}>
                            
                            <View style={styles.policyHeaderGlow}>
                                <LinearGradient colors={['#EF4444', '#9333EA']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.iconGradientBg}>
                                    <Ionicons name="shield-checkmark" size={36} color="#FFF" />
                                </LinearGradient>
                            </View>
                            
                            <Text style={styles.policyTitle}>COMMUNITY STANDARDS</Text>
                            <Text style={styles.policyText}>
                                By proceeding, you agree to adhere to our strict community guidelines. Any form of harassment, nudity, explicit content, or inappropriate behavior will result in an immediate and permanent account BAN. Please keep the community safe.
                            </Text>
                            
                            <TouchableOpacity style={styles.checkboxRow} activeOpacity={0.8} onPress={() => setDontShowToday(!dontShowToday)}>
                                <View style={[styles.checkbox, dontShowToday && { backgroundColor: '#a855f7', borderColor: '#a855f7' }]}>
                                    {dontShowToday && <Ionicons name="checkmark" size={16} color="#FFF" />}
                                </View>
                                <Text style={styles.checkboxLabel}>Don't show again today</Text>
                            </TouchableOpacity>

                            <TouchableOpacity activeOpacity={0.9} onPress={() => {
                                setShowPolicyModal(false);
                                router.push('/explore-experts' as any);
                            }} style={styles.agreeBtnWrapper}>
                                <LinearGradient colors={['#EF4444', '#F59E0B']} start={{x: 0, y: 0}} end={{x: 1, y: 1}} style={styles.agreeBtn}>
                                    <Text style={styles.agreeBtnText}>I AGREE & PROCEED</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </LinearGradient>
                    </View>
                </BlurView>
            </Modal>

            {/* 🚪 LOUNGE (Live Lounge / Forum Lounge) */}
            <Modal transparent visible={roomType !== null} animationType="none" onRequestClose={closeRoom} statusBarTranslucent>
                <View style={styles.roomRoot}>
                    <LinearGradient colors={['#05010f', userRank.themeBg[0], userRank.themeBg[1]]} style={StyleSheet.absoluteFill} />

                    {/* room stars */}
                    {STARS.map((st, i) => (
                        <Animated.View
                            key={`rstar-${i}`}
                            pointerEvents="none"
                            style={{
                                position: 'absolute', top: st.top, left: st.left, width: st.size, height: st.size, borderRadius: st.size,
                                backgroundColor: '#FFF',
                                opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: i % 2 === 0 ? [0.1, 0.9] : [0.9, 0.1] }),
                            }}
                        />
                    ))}

                    {/* room ambient orbs */}
                    <Animated.View pointerEvents="none" style={[styles.roomOrb, { top: 80, left: -80, backgroundColor: roomC1, transform: [{ translateY: orbTranslateY }] }]} />
                    <Animated.View pointerEvents="none" style={[styles.roomOrb, { bottom: 80, right: -80, backgroundColor: roomC2, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

                    {/* ✨ ENERGY BURST */}
                    <Animated.View
                        pointerEvents="none"
                        style={[styles.roomBurst, { backgroundColor: withAlpha(roomC1, '66'), borderColor: withAlpha(roomC2, 'CC'), opacity: burstOpacity, transform: [{ scale: burstScale }] }]}
                    />

                    {/* 🌀 WARP RINGS */}
                    {[0, 1, 2].map(i => (
                        <Animated.View key={`warp-${i}`} pointerEvents="none" style={[styles.roomWarpRing, warpRingStyle(i)]} />
                    ))}

                    {/* ROOM CONTENT */}
                    <Animated.View style={[styles.roomContent, { opacity: roomContentOpacity, transform: [{ scale: roomContentScale }] }]}>
                        <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
                            {/* lounge header */}
                            <View style={styles.roomHeader}>
                                <TouchableOpacity activeOpacity={0.8} onPress={closeRoom} style={[styles.roomCloseBtn, { borderColor: withAlpha(roomC1, '99') }]}>
                                    <Ionicons name="chevron-down" size={22} color="#FFF" />
                                </TouchableOpacity>

                                <View style={styles.roomHeaderCenter}>
                                    <View style={styles.roomCrownWrap}>
                                        <Animated.View style={[styles.roomCrownRing, { borderColor: roomC1, transform: [{ rotate: orbitRotate }] }]} />
                                        <Animated.View style={[styles.roomCrownRingInner, { borderColor: roomC2, transform: [{ rotate: orbitRotateRev }] }]} />
                                        <MaterialCommunityIcons name={roomType === 'forum' ? 'forum' : 'broadcast'} size={20} color="#FFF" />
                                    </View>
                                    <Text style={styles.roomTitle}>{roomType === 'forum' ? 'FORUM LOUNGE' : 'LIVE LOUNGE'}</Text>
                                    <Text style={[styles.roomSubtitle, { color: roomC2 }]}>{roomType === 'forum' ? 'OPEN DISCUSSIONS' : 'NOW STREAMING'}</Text>
                                </View>

                                <View style={[styles.roomCountPill, { borderColor: withAlpha(roomC1, '99') }]}>
                                    <View style={styles.roomCountDot} />
                                    <Text style={styles.roomCountText}>{roomList.length}</Text>
                                </View>
                            </View>

                            <View style={[styles.roomDivider, { backgroundColor: withAlpha(roomC1, '88') }]} />

                            <FlatList
                                key={`room-${roomType}`}
                                data={roomList}
                                keyExtractor={(item: any) => item.id}
                                showsVerticalScrollIndicator={false}
                                contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 }}
                                onViewableItemsChanged={roomType === 'live' ? onViewableItemsChanged : undefined}
                                viewabilityConfig={viewabilityConfig}
                                ListEmptyComponent={
                                    <View style={styles.roomEmpty}>
                                        <MaterialCommunityIcons name="door-closed-lock" size={46} color="#475569" />
                                        <Text style={styles.roomEmptyText}>This lounge is empty right now</Text>
                                    </View>
                                }
                                renderItem={({ item, index }: any) => (
                                    <Animated.View style={roomItemReveal(index)}>
                                        {roomType === 'forum' ? renderRoomForumCard(item, index) : renderRoomLiveCard(item, index)}
                                    </Animated.View>
                                )}
                            />
                        </SafeAreaView>
                    </Animated.View>

                    {/* 🔦 SCANNER BEAM (sweeps once on open) */}
                    <Animated.View pointerEvents="none" style={[styles.roomBeam, { opacity: beamOpacity, transform: [{ translateY: beamY }] }]}>
                        <LinearGradient
                            colors={['rgba(255,255,255,0)', withAlpha(roomC2, 'FF'), 'rgba(255,255,255,0)']}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={{ flex: 1 }}
                        />
                    </Animated.View>
                </View>
            </Modal>
            
            {/* 🔥 DYNAMIC ANIMATED DESIGN BACKGROUND */}
            <LinearGradient colors={userRank.themeBg} style={StyleSheet.absoluteFill} />

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
            
            {/* 🔥 FLOATING SHIMMER ORBS (now with scroll parallax) */}
            <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { transform: [{ translateY: parallaxAura }] }]}>
                <Animated.View style={[styles.shimmerOrb, { top: 100, left: -60, backgroundColor: userRank.color, transform: [{ translateY: orbTranslateY }] }]} />
                <Animated.View style={[styles.shimmerOrb, { bottom: 200, right: -60, backgroundColor: userRank.color, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />
            </Animated.View>

            {/* 🆕 COMPACT FIXED HEADER (glass) */}
            <SafeAreaView style={styles.topSection} edges={['top']}>
                <Animated.View style={[styles.topEliteHeader, reveal(0)]}>
                    <View style={styles.brandContainer}>
                        <Text style={styles.welcomeLabelText}>WELCOME TO</Text>
                        <View style={styles.brandRow}>
                            <Text style={styles.brandTitleWhite}>TALKPE </Text>
                            <Text style={[styles.brandTitleIndigo, { color: userRank.color }]}>PRO</Text>
                        </View>
                        <Text style={[styles.rankStatusText, { color: userRank.color }]}>{userRank.status}</Text>
                    </View>

                    {/* 🔔 BELL + PROFILE PHOTO (bell sits next to the profile photo) */}
                    <View style={styles.headerRight}>

                        {/* 🔔 NOTIFICATION BELL */}
                        <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/notifications' as any)}>
                            <View style={[styles.bellBtn, { borderColor: withAlpha(userRank.color, '80'), shadowColor: userRank.color }]}>
                                {unreadCount > 0 && (
                                    <Animated.View pointerEvents="none" style={[styles.bellPulse, { backgroundColor: withAlpha(userRank.color, '33'), opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                                )}
                                <Animated.View style={unreadCount > 0 ? { transform: [{ rotate: shakeAnim.interpolate({ inputRange: [-2, 2], outputRange: ['-14deg', '14deg'] }) }] } : undefined}>
                                    <Ionicons name={unreadCount > 0 ? 'notifications' : 'notifications-outline'} size={22} color="#FFF" />
                                </Animated.View>
                                {unreadCount > 0 && (
                                    <View style={styles.bellBadge}>
                                        <Text style={styles.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/(tabs)/two' as any)}>
                            <View style={styles.avatarOrbitWrap}>
                                {/* 🆕 ORBITING RINGS */}
                                <Animated.View style={[styles.orbitRing, { borderColor: userRank.color, transform: [{ rotate: orbitRotate }] }]} />
                                <Animated.View style={[styles.orbitRingInner, { borderColor: userRank.secondaryColor, transform: [{ rotate: orbitRotateRev }] }]} />
                                <View style={[styles.syncedAvatarRing, { borderColor: userRank.color, shadowColor: userRank.color }]}>
                                    <Image source={{ uri: uPic }} style={styles.syncedAvatarImg} />
                                </View>
                                <View style={[styles.levelBadgeMini, { backgroundColor: userRank.color }]}>
                                    <Text style={styles.levelBadgeMiniText}>L{userRank.lvl}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </SafeAreaView>

            <Animated.ScrollView 
                showsVerticalScrollIndicator={false} 
                contentContainerStyle={styles.scrollContent}
                scrollEventThrottle={16}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            >

                {/* 💳 3D TILT WALLET CARD (drag it!) */}
                <Animated.View style={{ transform: [{ scaleX: cardScale }, { scaleY: cardScale }] }}>
                    <Animated.View style={[styles.walletArea, reveal(1)]}>
                        <Animated.View style={getWalletStyle()}>
                            <Animated.View style={[walletTilt]} {...panResponder.panHandlers}>
                                <View style={[styles.walletGlowShadow, { shadowColor: userRank.color }]}>
                                    <View style={[styles.stealthBoxBase, borderType1]}>
                                        <ImageBackground source={{ uri: IMG_WALLET_BG }} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.35 }} />
                                        <LinearGradient
                                            colors={['rgba(0,0,0,0.55)', withAlpha(userRank.color, '30'), 'rgba(0,0,0,0.7)']}
                                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                            style={StyleSheet.absoluteFill}
                                        />
                                        <Animated.View style={[styles.glowTrail, { backgroundColor: userRank.color, transform: [{ translateX: trailX }, { rotate: '35deg' }] }]} />
                                        {/* 🆕 HOLOGRAPHIC SWEEP */}
                                        <Animated.View pointerEvents="none" style={[styles.holoStripe, { transform: [{ translateX: holoX }, { rotate: '25deg' }] }]} />
                                        <View style={styles.walletContentRow}>
                                            <View style={styles.walletInfo}>
                                                <Text style={styles.cardSubTitle}>DIAMOND ASSETS</Text>
                                                <View style={styles.balanceRow}>
                                                    <MaterialCommunityIcons name="diamond-stone" size={26} color="#FFF" />
                                                    <Text style={styles.mainBalanceValue} numberOfLines={1} adjustsFontSizeToFit>{(userData?.balance || 0).toLocaleString()}</Text>
                                                </View>
                                                <View style={styles.userNameContainer}>
                                                    <Text style={styles.walletUserName}>{userData?.name?.toUpperCase() || 'AGENT_IDENTIFIED'}</Text>
                                                    <Text style={[styles.walletUserID, { color: userRank.color }]}>{userRank.label}</Text>
                                                </View>
                                            </View>
                                            <View style={styles.rightAction}>
                                                {/* 🔥 UPDATED: card-chip symbol removed -> glowing SECURE SHIELD badge (safe) */}
                                                <View style={[styles.safeShield, { borderColor: withAlpha(userRank.color, '80'), shadowColor: userRank.color }]}>
                                                    <Animated.View style={[styles.safeShieldPulse, { backgroundColor: withAlpha(userRank.color, '33'), opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                                                    <MaterialCommunityIcons name="shield-check" size={24} color={userRank.color} />
                                                </View>
                                                <Text style={[styles.safeShieldLabel, { color: withAlpha(userRank.color, 'CC') }]}>SECURED</Text>
                                                <TouchableOpacity style={[styles.glassAddBtn, {borderColor: withAlpha(userRank.color, '50')}]} onPress={() => router.push('/recharge' as any)}>
                                                    <BlurView intensity={20} style={styles.btnBlur}>
                                                        <Text style={[styles.btnTxt, {color: userRank.color}]}>TOPUP</Text>
                                                    </BlurView>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            </Animated.View>
                        </Animated.View>
                    </Animated.View>
                </Animated.View>

                {/* 🔥 QUICK Discover BUTTON WITH LEVEL RESTRICTION & POLICY MODAL 🔥 */}
                <Animated.View style={reveal(2)}>
                    <TouchableOpacity 
                        activeOpacity={0.9} 
                        onPress={() => {
                            if (userRank.lvl === 1) {
                                // 🔥 strict Alert update when clicked 🔥
                                Alert.alert(
                                    "🔒 UNLOCK AT LEVEL 2", 
                                    "Level 1 Agents cannot access Quick Connect. Please upgrade to Level 2 (GOLD OPERATIVE) by topping up diamonds to unlock this feature!"
                                );
                            } else {
                                // Level 2+ Proceed (Check if Policy was accepted for the session)
                                if (dontShowToday) {
                                    router.push('/explore-experts' as any);
                                } else {
                                    setShowPolicyModal(true);
                                }
                            }
                        }}
                        style={[styles.DiscoverTriggerMass, { shadowColor: userRank.color }]}
                    >
                        <View style={styles.DiscoverClip}>
                            <ImageBackground source={{ uri: IMG_CONNECT_BG }} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.45 }} />
                            <LinearGradient 
                                colors={[withAlpha(userRank.color, 'EE'), withAlpha(userRank.secondaryColor, 'CC')]} 
                                style={styles.DiscoverGradient}
                                start={{x: 0, y: 0}}
                                end={{x: 1, y: 1}}
                            >
                                {/* LEFT: energy orb with pulsing rings */}
                                <View style={styles.connectOrb}>
                                    <Animated.View style={[styles.connectRing, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                                    <Animated.View style={[styles.connectRingDash, { transform: [{ rotate: orbitRotate }] }]} />
                                    <View style={styles.connectOrbCore}>
                                        <MaterialCommunityIcons name="lightning-bolt" size={24} color="#FFF" />
                                    </View>
                                </View>

                                {/* MIDDLE: title + online pill (never cut) */}
                                <View style={styles.connectTextCol}>
                                    <Text style={styles.DiscoverBtnText} numberOfLines={1} adjustsFontSizeToFit>QUICK CONNECT</Text>
                                    <View style={styles.liveIndicatorDiscover}>
                                        <View style={styles.liveDotDiscover} />
                                        {/* 🔥 NUMBER CHANGED TO USE DYNAMIC STATE 🔥 */}
                                        <Text style={styles.liveCountDiscover} numberOfLines={1}>{safeLives.length + safeExperts.length + dynamicOffset} Online</Text>
                                    </View>
                                </View>

                                {/* RIGHT: go button (lock for level 1) */}
                                <View style={styles.connectGoBtn}>
                                    <Ionicons name={userRank.lvl === 1 ? 'lock-closed' : 'chevron-forward'} size={20} color="#FFF" />
                                </View>
                            </LinearGradient>
                            {/* 🆕 SHINE SWEEP */}
                            <Animated.View pointerEvents="none" style={[styles.shineBar, { transform: [{ translateX: shineX }, { rotate: '20deg' }] }]} />
                        </View>
                    </TouchableOpacity>
                </Animated.View>

                <Animated.View style={[styles.searchSection, reveal(3)]}>
                    <BlurView intensity={10} tint="dark" style={[styles.searchBarMass, borderType2]}>
                        <Ionicons name="search" size={18} color={userRank.color} />
                        <TextInput placeholder="search host" placeholderTextColor="#475569" style={styles.searchInputMass} value={searchQuery} onChangeText={setSearchQuery} />
                    </BlurView>
                </Animated.View>

                {/* 🚪 LIVE LOUNGES: BROADCAST + FORUM (tap a card -> lounge opens with the hosts inside) */}
                {(safeLives.length > 0 || safeParties.length > 0) && (
                    <Animated.View style={[styles.sectionArea, reveal(4)]}>
                        <View style={styles.sectionHeaderMass}>
                            <View style={styles.rowCenter}>
                                <MaterialCommunityIcons name="access-point" size={16} color={userRank.color} style={{ marginRight: 8 }} />
                                <Text style={styles.sectionTitleMass}>LIVE LOUNGES</Text>
                            </View>
                            <Text style={styles.onlineCountText}>TAP A CARD TO ENTER</Text>
                        </View>
                        <View style={styles.portalRow}>
                            {renderPortal('live')}
                            {renderPortal('forum')}
                        </View>
                    </Animated.View>
                )}

                <View style={styles.sectionArea}>
                    <View style={styles.sectionHeaderMass}>
                        <View style={styles.rowCenter}>
                            <View style={[styles.sectionAccentBar, { backgroundColor: userRank.color }]} />
                            <Text style={styles.sectionTitleMass}>FEATURED HOSTS</Text>
                        </View>
                        <TouchableOpacity><Text style={[styles.seeMoreText, { color: userRank.color }]}>DISCOVER</Text></TouchableOpacity>
                    </View>
                    <FlatList horizontal showsHorizontalScrollIndicator={false} data={spotlightExperts} keyExtractor={(item) => item.id} contentContainerStyle={{ paddingLeft: 14, paddingRight: 10, paddingVertical: 14 }}
                        style={{ overflow: 'visible' }}
                        renderItem={({ item }) => {
                            const liveNode = safeLives.find(l => l.hostId === item.id);
                            return (
                                <TouchableOpacity activeOpacity={0.8} style={styles.circleBtn} onPress={() => liveNode ? router.push({ pathname: "/(tabs)/live/[liveId]", params: { liveId: liveNode.id } } as any) : router.push({ pathname: '/expert-detail', params: { id: item.id } } as any)}>
                                    <View style={styles.circleGlow}>
                                        {/* 🆕 centered counter-rotating halos (no clipping) */}
                                        <Animated.View style={[styles.circleHalo, { borderColor: withAlpha(userRank.color, 'AA'), transform: [{ rotate: orbitRotate }] }]} />
                                        <Animated.View style={[styles.circleHaloInner, { borderColor: withAlpha(userRank.secondaryColor, 'CC'), transform: [{ rotate: orbitRotateRev }] }]} />
                                        <View style={styles.circleAvatarCenter}>
                                            <LevelAvatar image={item.profilePic || item.photoURL} beans={item.totalBeansEarned || 0} size={64} />
                                        </View>
                                    </View>
                                    <Text style={styles.circleNameText} numberOfLines={1}>{item.name}</Text>
                                </TouchableOpacity>
                            );
                        }}
                    />
                </View>

                <View style={styles.listArea}>
                    <View style={[styles.rowCenter, { marginBottom: 18 }]}>
                        <View style={[styles.sectionAccentBar, { backgroundColor: userRank.color }]} />
                        <Text style={styles.sectionTitleMass}>RECOMMENDED HOSTS</Text>
                    </View>
                    {loading ? ( <ActivityIndicator color={userRank.color} style={{ marginTop: 40 }} /> ) : (
                        safeExperts.filter(e => (e.name || '').toLowerCase().includes(searchQuery.toLowerCase())).map((expert, index) => {
                                const diamondRate = Number(expert.userPrice || (expert.beansPerMin * 2) || 1000);
                                const liveSession = safeLives.find(live => live.hostId === expert.id);
                                const expertThemeColor = getExpertThemeColor(expert.totalBeansEarned || 0);
                                const isBusyNow = expert.isBusy === true || expert.isBusy === "true";
                                
                                // 🔥 Alternating Border Logic
                                const expertBorderStyle = index % 2 === 0 ? borderType2 : borderType1;

                                return (
                                    <PressCard 
                                        key={expert.id} 
                                        activeOpacity={0.85} 
                                        style={[styles.eliteNodeRow, expertBorderStyle]} 
                                        // 🔥 THE UPDATED CALL CLICK LOGIC 🔥
                                        onPress={() => handleExpertCallClick(expert, liveSession)}
                                    >
                                        <View style={styles.nodeLead}>
                                            <View style={[styles.nodeAvatarRing, { borderColor: expertThemeColor, shadowColor: expertThemeColor }]}>
                                                <Image source={{ uri: expert.profilePic || 'https://i.pravatar.cc/100' }} style={styles.nodeAvatarImg} />
                                            </View>
                                            {liveSession && <View style={styles.livePing}><Text style={styles.livePingText}>LIVE</Text></View>}
                                            {/* 🆕 availability dot */}
                                            <View style={[styles.statusDot, { backgroundColor: liveSession ? '#EF4444' : isBusyNow ? '#F59E0B' : '#10B981' }]} />
                                        </View>
                                        <View style={styles.nodeMain}>
                                            <Text style={styles.nodeName}>{expert.name}</Text>
                                            <Text style={[styles.nodeRateText, { color: expertThemeColor }]}>💎 {diamondRate.toLocaleString()} / MIN</Text>
                                            {/* 🆕 rating + busy chips */}
                                            <View style={styles.chipRow}>
                                                {expert.rating ? (
                                                    <View style={styles.miniChip}>
                                                        <Ionicons name="star" size={9} color="#F59E0B" />
                                                        <Text style={styles.miniChipText}>{Number(expert.rating).toFixed(1)}</Text>
                                                    </View>
                                                ) : null}
                                                {!liveSession && isBusyNow ? (
                                                    <View style={[styles.miniChip, { backgroundColor: 'rgba(245,158,11,0.15)' }]}>
                                                        <Text style={[styles.miniChipText, { color: '#F59E0B' }]}>BUSY</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        </View>
                                        
                                        {/* 🔥 FLAME OR VIDEO ICON 🔥 */}
                                        <LinearGradient colors={liveSession ? ['#EF4444', '#7F1D1D'] : [withAlpha(userRank.color, 'FF'), withAlpha(userRank.secondaryColor || '#1E1B4B', 'FF')]} style={[styles.nodeCallBtn, { shadowColor: liveSession ? '#EF4444' : userRank.color }]}>
                                            <Ionicons name={liveSession ? "flame" : "videocam"} size={18} color="#FFF" />
                                        </LinearGradient>
                                    </PressCard>
                                );
                            })
                    )}
                </View>
                <View style={{height: 120}} />
            </Animated.ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({

    mainContainer: { flex: 1, backgroundColor: '#020617' },
    // 🔥 DESIGN: AMBIENT SHIMMER ORBS
    shimmerOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.15 },
    
    topSection: { paddingBottom: 5 },
    topEliteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginTop: 15 },
    brandContainer: { flex: 1 },
    welcomeLabelText: { color: '#475569', fontSize: 9, fontWeight: '900', letterSpacing: 4 },
    brandRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    brandTitleWhite: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: -1 },
    brandTitleIndigo: { fontSize: 22, fontWeight: '900', letterSpacing: -1, marginLeft: 6 },
    rankStatusText: { fontSize: 8, fontWeight: '900', letterSpacing: 2.5, marginTop: 3, opacity: 0.85 },

    // 🔔 BELL (next to the profile photo)
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    bellBtn: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.07)', justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
    bellPulse: { position: 'absolute', width: 44, height: 44, borderRadius: 22 },
    bellBadge: { position: 'absolute', top: -5, right: -5, minWidth: 19, height: 19, borderRadius: 10, paddingHorizontal: 4, backgroundColor: '#F43F5E', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#020617' },
    bellBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
    
    // 🆕 AVATAR ORBIT
    avatarOrbitWrap: { width: 78, height: 78, justifyContent: 'center', alignItems: 'center' },
    orbitRing: { position: 'absolute', width: 76, height: 76, borderRadius: 38, borderWidth: 1.5, borderStyle: 'dashed', opacity: 0.8 },
    orbitRingInner: { position: 'absolute', width: 68, height: 68, borderRadius: 34, borderWidth: 1, borderStyle: 'dotted', opacity: 0.7 },
    levelBadgeMini: { position: 'absolute', bottom: 2, right: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
    levelBadgeMiniText: { color: '#000', fontSize: 8, fontWeight: '900' },

    syncedAvatarRing: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, padding: 2, elevation: 15, backgroundColor: '#020617', shadowOpacity: 0.9, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
    syncedAvatarImg: { width: '100%', height: '100%', borderRadius: 26 },

    walletArea: { paddingHorizontal: 20, marginTop: 10 },
    walletGlowShadow: { borderRadius: 35, shadowOpacity: 0.55, shadowRadius: 22, shadowOffset: { width: 0, height: 12 }, elevation: 20 },
    // 🔥 ZERO BOX FLUID SHAPE
    stealthBoxBase: { height: 150, borderRadius: 35, overflow: 'hidden', elevation: 20 },
    glowTrail: { position: 'absolute', width: 120, height: '200%', top: '-50%', opacity: 0.2 },
    holoStripe: { position: 'absolute', width: 70, height: '220%', top: '-60%', backgroundColor: 'rgba(255,255,255,0.14)' },
    walletContentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: '100%', paddingHorizontal: 22, zIndex: 10 },
    walletInfo: { flex: 1 },
    cardSubTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
    balanceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'nowrap' },
    mainBalanceValue: { color: '#FFF', fontSize: 32, fontWeight: '900', flexShrink: 1, textShadowColor: 'rgba(255,255,255,0.35)', textShadowRadius: 12 },
    userNameContainer: { marginTop: 8 },
    walletUserName: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    walletUserID: { fontSize: 9, fontWeight: '900', marginTop: 2, letterSpacing: 1.5 },
    rightAction: { alignItems: 'flex-end', justifyContent: 'center' },
    glassAddBtn: { borderRadius: 12, overflow: 'hidden', borderWidth: 1, marginTop: 8 },
    btnBlur: { paddingHorizontal: 15, paddingVertical: 10 },
    btnTxt: { fontWeight: '900', fontSize: 9, letterSpacing: 1 },

    // 🛡️ SECURE SHIELD BADGE (replaces the old chip icon on the wallet card)
    safeShield: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
    safeShieldPulse: { position: 'absolute', width: 42, height: 42, borderRadius: 21 },
    safeShieldLabel: { fontSize: 7, fontWeight: '900', letterSpacing: 2, marginTop: 4 },

    // 🔥 QUICK Discover BUTTON STYLES
    DiscoverTriggerMass: { marginHorizontal: 20, marginTop: 25, borderRadius: 30, elevation: 15, shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
    DiscoverClip: { borderRadius: 30, overflow: 'hidden' },
    DiscoverGradient: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, paddingHorizontal: 18, borderRadius: 30, gap: 14 },
    DiscoverBtnText: { color: '#FFF', fontSize: 19, fontWeight: '900', letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 6 },
    boltWrap: { width: 30, height: 30, justifyContent: 'center', alignItems: 'center' },
    boltHalo: { position: 'absolute', width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.5)' },
    shineBar: { position: 'absolute', top: -40, bottom: -40, width: 60, backgroundColor: 'rgba(255,255,255,0.22)' },
    liveIndicatorDiscover: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: 'rgba(0,0,0,0.35)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
    liveDotDiscover: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    liveCountDiscover: { color: '#10B981', fontSize: 10, fontWeight: '800' },

    searchSection: { paddingHorizontal: 20, marginTop: 20 },
    searchBarMass: { flexDirection: 'row', borderRadius: 25, paddingHorizontal: 18, height: 50, alignItems: 'center', overflow: 'hidden' },
    searchInputMass: { flex: 1, marginLeft: 12, color: '#FFF', fontSize: 13, fontWeight: '700' },
    
    scrollContent: { paddingTop: 10 },
    sectionArea: { marginTop: 35 },
    sectionHeaderMass: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginHorizontal: 20, marginBottom: 15 },
    rowCenter: { flexDirection: 'row', alignItems: 'center' },
    sectionAccentBar: { width: 4, height: 16, borderRadius: 2, marginRight: 10 },
    pulseDotWrap: { width: 20, height: 20, justifyContent: 'center', alignItems: 'center', marginRight: 6 },
    pulseDotHalo: { position: 'absolute', width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444' },
    livePulseDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#EF4444', shadowColor: '#EF4444', shadowRadius: 5, elevation: 5 },
    sectionTitleMass: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
    onlineCountText: { color: '#475569', fontSize: 9, fontWeight: '900' },
    seeMoreText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    
    massLiveCard: { width: 170, height: 230, marginRight: 18, borderRadius: 35, overflow: 'hidden' },
    massLiveThumb: { width: '100%', height: '100%' },
    
    // 🔥 NEW Session CARD STYLES
    massPartyCard: { width: 160, height: 160, marginRight: 18, borderRadius: 25, overflow: 'hidden' },
    massPartyThumb: { width: '100%', height: '100%', opacity: 0.7 },

    // 🆕 NEON FRAME CARDS (broadcast + forum)
    neonWrap: { width: LIVE_W, height: LIVE_H, marginRight: 16, borderRadius: 34, shadowOpacity: 0.6, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 14 },
    neonWrapForum: { width: FORUM_W, height: FORUM_H, marginRight: 16, borderRadius: 30, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
    liveTopRow: { position: 'absolute', top: 14, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    liveBadgeNew: { backgroundColor: '#EF4444', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
    viewerPill: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
    viewerPillText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
    liveGlassPanel: { position: 'absolute', left: 10, right: 10, bottom: 10, borderRadius: 24, paddingHorizontal: 10, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.06)' },
    liveMiniAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, padding: 1.5 },
    liveMiniAvatarImg: { width: '100%', height: '100%', borderRadius: 18 },
    watchHint: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginTop: 2 },
    playCircle: { width: 28, height: 28, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    forumTopRow: { position: 'absolute', top: 12, left: 14, right: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    forumBadge: { backgroundColor: '#4F46E5', paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 },
    forumOnlinePill: { backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5 },
    forumBottom: { position: 'absolute', left: 16, right: 16, bottom: 14, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
    forumRoomName: { color: '#FFF', fontSize: 15, marginTop: 6, fontWeight: '900', letterSpacing: 0.3, textShadowColor: '#000', textShadowRadius: 6 },
    forumHostRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    forumHostText: { color: '#A5B4FC', fontSize: 10, fontWeight: '700' },

    // 🆕 QUICK CONNECT PARTS
    connectOrb: { width: 58, height: 58, justifyContent: 'center', alignItems: 'center' },
    connectRing: { position: 'absolute', width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.45)' },
    connectRingDash: { position: 'absolute', width: 58, height: 58, borderRadius: 29, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.8)' },
    connectOrbCore: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
    connectTextCol: { flex: 1 },
    connectGoBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },

    // 🆕 ARCH BROADCAST + FORUM TICKET
    neonWrapArch: { width: LIVE_W, height: LIVE_H, marginRight: 16, borderTopLeftRadius: LIVE_W / 2, borderTopRightRadius: LIVE_W / 2, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, shadowOpacity: 0.6, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 14 },
    archBadgeWrap: { position: 'absolute', top: 14, left: 0, right: 0, alignItems: 'center' },
    forumBackdrop: { position: 'absolute', width: '100%', height: '100%', opacity: 0.7 },
    forumRow: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
    forumThumbWrap: { width: 104, height: 104, borderRadius: 26, borderWidth: 2, padding: 2 },
    forumThumb: { width: '100%', height: '100%', borderRadius: 22 },
    forumInfo: { flex: 1, justifyContent: 'center' },
    forumFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 },
    joinChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    joinChipText: { color: '#000', fontSize: 9, fontWeight: '900', letterSpacing: 1 },

    // 🆕 BROADCAST: VIEWFINDER CARD
    liveCardWrap: { width: LIVE_W, height: LIVE_H, marginRight: 16 },
    liveFrameShadow: { width: LIVE_W, height: FRAME_H, borderRadius: 26, backgroundColor: '#020617', shadowOpacity: 0.65, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 14 },
    liveSoftShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 60 },
    vfCorner: { position: 'absolute', width: 20, height: 20 },
    liveNameRow: { height: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, marginTop: 8, gap: 10 },
    liveNameLine: { width: 28, height: 3, borderRadius: 2, marginTop: 5 },

    massLiveOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', padding: 18 },
    liveBadge: { position: 'absolute', top: 15, left: 15, backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }, 
    liveBadgeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFF' },
    liveBadgeText: { color: '#FFF', fontSize: 8, fontWeight: '900' },
    liveHostNameMass: { color: '#FFF', fontSize: 14, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 5 },
    
    circleBtn: { alignItems: 'center', marginRight: 14, width: 96 },
    circleGlow: { width: 88, height: 88, justifyContent: 'center', alignItems: 'center' },
    circleHalo: { position: 'absolute', top: 0, left: 0, width: 88, height: 88, borderRadius: 44, borderWidth: 1.5, borderStyle: 'dashed' },
    circleHaloInner: { position: 'absolute', top: 7, left: 7, width: 74, height: 74, borderRadius: 37, borderWidth: 1, borderStyle: 'dotted' },
    circleAvatarCenter: { width: 64, height: 64, justifyContent: 'center', alignItems: 'center' },
    circleNameText: { color: '#FFF', fontSize: 10, fontWeight: '900', marginTop: 8, textAlign: 'center', width: 90 },
    
    listArea: { marginTop: 45, paddingHorizontal: 20 },
    eliteNodeRow: { flexDirection: 'row', alignItems: 'center', padding: 15, borderRadius: 35, marginBottom: 15 },
    nodeLead: { position: 'relative' },
    nodeAvatarRing: { width: 54, height: 54, borderRadius: 27, borderWidth: 1.5, padding: 2, shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 } },
    nodeAvatarImg: { width: '100%', height: '100%', borderRadius: 25 },
    statusDot: { position: 'absolute', bottom: 0, right: 0, width: 13, height: 13, borderRadius: 7, borderWidth: 2, borderColor: '#020617' },
    livePing: { position: 'absolute', top: -5, left: -5, backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, zIndex: 10 },
    livePingText: { color: '#FFF', fontSize: 7, fontWeight: '900' },
    nodeMain: { flex: 1, marginLeft: 16 },
    nodeName: { color: '#FFF', fontWeight: '900', fontSize: 16, letterSpacing: 0.2 },
    nodeRateText: { fontSize: 12, fontWeight: '900', marginTop: 3 },
    chipRow: { flexDirection: 'row', gap: 6, marginTop: 5 },
    miniChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
    miniChipText: { color: '#E2E8F0', fontSize: 9, fontWeight: '900' },
    nodeCallBtn: { width: 48, height: 48, borderRadius: 18, justifyContent: 'center', alignItems: 'center', elevation: 12, shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },

    // ==========================================
    // 🚪 LOUNGES: PORTAL CARDS (home screen) - HORIZONTAL RECTANGLE GATES
    // ==========================================
    portalRow: { flexDirection: 'column', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 6 },
    portalShadow: { width: PORTAL_W, height: PORTAL_H, borderRadius: 28, backgroundColor: '#020617', shadowOpacity: 0.65, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 14 },
    portalInner: { ...StyleSheet.absoluteFillObject, flexDirection: 'row', alignItems: 'center', paddingLeft: ORB_SIZE + 22, paddingRight: 14 },
    portalTextCol: { flex: 1, justifyContent: 'center' },
    portalTagRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    portalTagLine: { width: 14, height: 2, borderRadius: 1 },
    portalRightCol: { width: 44, alignItems: 'center', justifyContent: 'center', gap: 6, marginLeft: 6 },
    portalHint: { color: '#94A3B8', fontSize: 9, fontWeight: '700', marginTop: 3, lineHeight: 12 },
    portalDivider: { position: 'absolute', top: 22, bottom: 22, width: 1.5, borderRadius: 1 },
    portalScan: { position: 'absolute', top: -30, bottom: -30, width: 36 },
    portalTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1, marginTop: 4, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 6 },
    portalSub: { fontSize: 7.5, fontWeight: '900', letterSpacing: 2.5 },
    portalCountChip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginTop: 8 },
    portalCountDot: { width: 6, height: 6, borderRadius: 3 },
    portalCountText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    portalAvatarRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 30, marginTop: 12 },
    portalAvatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, backgroundColor: '#0F172A' },
    portalEnterChip: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.8, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
    portalEnterText: { color: '#FFF', fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },

    // 🌐 HOST ORB (cycling host image + orbiting mini hosts) - now anchored LEFT, vertically centered
    hostOrbBox: { position: 'absolute', top: (PORTAL_H - 5 - ORB_SIZE) / 2, left: 8, width: ORB_SIZE, height: ORB_SIZE, justifyContent: 'center', alignItems: 'center' },
    hostOrbPulse: { position: 'absolute', width: 70, height: 70, borderRadius: 35 },
    hostOrbDash: { position: 'absolute', width: ORB_SIZE, height: ORB_SIZE, borderRadius: ORB_SIZE / 2, borderWidth: 1.5, borderStyle: 'dashed' },
    hostOrbDot: { position: 'absolute', width: 78, height: 78, borderRadius: 39, borderWidth: 1, borderStyle: 'dotted' },
    hostOrbitWrap: { position: 'absolute', width: ORB_SIZE, height: ORB_SIZE },
    hostOrbMini: { position: 'absolute', width: ORB_MINI, height: ORB_MINI, borderRadius: ORB_MINI / 2, borderWidth: 1.5, overflow: 'hidden', backgroundColor: '#0F172A' },
    hostOrbMiniImg: { width: '100%', height: '100%' },
    hostOrbCore: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, overflow: 'hidden', backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', shadowOpacity: 0.9, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
    hostOrbCoreImg: { width: '100%', height: '100%' },
    hostOrbBadge: { position: 'absolute', bottom: 12, right: 16, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#020617' },

    // ==========================================
    // 🚪 LOUNGES: INSIDE THE LOUNGE
    // ==========================================
    roomRoot: { flex: 1, backgroundColor: '#05010f' },
    roomContent: { ...StyleSheet.absoluteFillObject },
    roomOrb: { position: 'absolute', width: 380, height: 380, borderRadius: 190, opacity: 0.14 },
    roomBurst: { position: 'absolute', width: width * 2.2, height: width * 2.2, borderRadius: width * 1.1, borderWidth: 3, left: width / 2 - width * 1.1, top: height / 2 - width * 1.1 },
    roomWarpRing: { position: 'absolute', width: width * 2, height: width * 2, borderRadius: width, borderWidth: 2, left: width / 2 - width, top: height / 2 - width },
    roomBeam: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, zIndex: 50, elevation: 50 },
    roomHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 14 },
    roomCloseBtn: { width: 42, height: 42, borderRadius: 21, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
    roomHeaderCenter: { flex: 1, alignItems: 'center' },
    roomCrownWrap: { width: 46, height: 46, justifyContent: 'center', alignItems: 'center' },
    roomCrownRing: { position: 'absolute', width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderStyle: 'dashed', opacity: 0.9 },
    roomCrownRingInner: { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderStyle: 'dotted', opacity: 0.8 },
    roomTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 3, marginTop: 6, textShadowColor: 'rgba(255,255,255,0.35)', textShadowRadius: 10 },
    roomSubtitle: { fontSize: 8, fontWeight: '900', letterSpacing: 3, marginTop: 3 },
    roomCountPill: { minWidth: 42, height: 42, borderRadius: 21, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.06)', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5, paddingHorizontal: 8 },
    roomCountDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
    roomCountText: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    roomDivider: { height: 1.5, marginHorizontal: 40, borderRadius: 1 },
    roomCardWrap: { width: ROOM_W, marginBottom: 22 },
    roomLiveShadow: { width: ROOM_W, height: ROOM_LIVE_H, borderRadius: 30, backgroundColor: '#020617', shadowOpacity: 0.65, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 14 },
    roomForumWrap: { width: ROOM_W, height: FORUM_H, marginBottom: 22, borderRadius: 30, shadowOpacity: 0.5, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
    roomEmpty: { alignItems: 'center', justifyContent: 'center', marginTop: 80, gap: 12 },
    roomEmptyText: { color: '#64748B', fontSize: 12, fontWeight: '800', letterSpacing: 1 },

    // ==========================================
    // 🔥 NEW HIGH-END PREMIUM POLICY MODAL STYLES 🔥
    // ==========================================
    policyModalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    premiumModalBorder: { width: '100%', padding: 2, borderRadius: 32, backgroundColor: 'rgba(239, 68, 68, 0.4)', shadowColor: '#EF4444', shadowRadius: 25, shadowOpacity: 0.6, elevation: 15 },
    policyModalBox: { width: '100%', borderRadius: 30, padding: 25, alignItems: 'center' },
    policyHeaderGlow: { marginBottom: 20 },
    iconGradientBg: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center', shadowColor: '#9333EA', shadowRadius: 15, shadowOpacity: 0.8, elevation: 10 },
    policyTitle: { color: '#FFF', fontSize: 19, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 15, textShadowColor: 'rgba(239, 68, 68, 0.8)', textShadowRadius: 10 },
    policyText: { color: '#CBD5E1', fontSize: 13, lineHeight: 22, textAlign: 'center', marginBottom: 25, fontWeight: '600' },
    checkboxRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
    checkbox: { width: 22, height: 22, borderWidth: 2, borderColor: '#64748B', borderRadius: 6, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
    checkboxLabel: { color: '#E2E8F0', fontSize: 12, fontWeight: '800' },
    agreeBtnWrapper: { width: '100%', shadowColor: '#F59E0B', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 10 },
    agreeBtn: { paddingVertical: 18, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
    agreeBtnText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 2 }
});
