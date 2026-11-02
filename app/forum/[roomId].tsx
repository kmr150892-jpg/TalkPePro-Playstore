import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getDatabase, onValue, ref } from 'firebase/database';
import {
    addDoc,
    arrayUnion,
    collection,
    deleteDoc,
    doc,
    getDoc,
    increment,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where
} from 'firebase/firestore';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    BackHandler,
    Dimensions,
    Easing,
    FlatList,
    Image,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    PermissionsAndroid,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { ChannelProfileType, ClientRoleType, createAgoraRtcEngine, IRtcEngine } from 'react-native-agora';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

// 🔥 Participation NUMBER GAME IMPORT 🔥
import LiveGameSheet from '../../components/LiveGameSheet';
import MemoryMatch from '../../components/MemoryMatch';

const { width, height } = Dimensions.get('window');
const AGORA_APP_ID = "718cedc3c47e44d1bfa4853d6ac6cd80";

const GIFTS = [
    { id: 'rose', name: 'Rose', price: 100, icon: '🌹', colors: ['#ef4444', '#7f1d1d'] },
    { id: 'chocolate', name: 'Chocolate', price: 500, icon: '🍫', colors: ['#d97706', '#78350f'] },
    { id: 'diamond', name: 'Diamond', price: 1000, icon: '💎', colors: ['#3b82f6', '#1e3a8a'] },
    { id: 'crown', name: 'Crown', price: 2000, icon: '👑', colors: ['#f59e0b', '#78350f'] },
    { id: 'car', name: 'Sports Car', price: 5000, icon: '🏎️', colors: ['#ef4444', '#450a0a'] },
    { id: 'rocket', name: 'Rocket', price: 10000, icon: '🚀', colors: ['#8b5cf6', '#312e81'] },
    { id: 'castle', name: 'Castle', price: 50000, icon: '🏰', colors: ['#ec4899', '#831843'] },
];

const REACTION_EMOJIS = ['❤️', '🔥', '😂', '👏', '🙌', '💯'];

// 🆕 3D IMAGES (icons8 3D Fluency) - load aagalana automatic-a icon fallback varum
const IMG = {
    diamond: 'https://img.icons8.com/3d-fluency/512/diamond.png',
    crown: 'https://img.icons8.com/3d-fluency/512/crown.png',
    gift: 'https://img.icons8.com/3d-fluency/512/gift.png',
};

// 🎨 PALETTE (host screen-oda same look)
const NEON_BORDER = ['#22D3EE', '#6366F1', '#F472B6', '#6366F1'];
const SEAT_COLORS = ['#F472B6', '#22D3EE', '#A3E635', '#FBBF24', '#A78BFA', '#FB7185', '#34D399', '#60A5FA'];
const SEAT_RAINBOW = ['#F472B6', '#FBBF24', '#A3E635', '#22D3EE', '#818CF8', '#A855F7', '#F472B6'];

// 🆕 SEAT SIZE (screen width-ku ettha auto fit)
const SEAT_GAP = 10;
const SEAT_W = Math.floor((width - 28 - 24 - SEAT_GAP * 3) / 4);
const SEAT_BOX = Math.min(56, SEAT_W);
const SEAT_RING = SEAT_BOX - 6;
const SEAT_IMG = SEAT_RING - 10;

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT THEME SYNC V2) 🔥
const calculateUserLevel = (totalSpent: number) => {
    if (totalSpent >= 500000001) return { lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#ff0000', secondaryColor: '#660000', anim: 'titan', themeBg: ['#1A0000', '#000000'], hasVipEntry: true, entryMessage: 'The Almighty Titan Overseer has arrived!' };
    if (totalSpent >= 100000001) return { lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#ff0dba', secondaryColor: '#a50606', anim: 'mythic', themeBg: ['#15001A', '#000000'], hasVipEntry: true, entryMessage: 'Bow down, Mythic Ruler entered the room!' };
    if (totalSpent >= 50000000) return { lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#f6f60d', secondaryColor: '#02fa0a', anim: 'grandmaster', themeBg: ['#08001A', '#000000'], hasVipEntry: true, entryMessage: 'A Grandmaster stepped into the forum!' };
    if (totalSpent >= 10000000) return { lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#f52b6092', anim: 'explosion', themeBg: ['#00101A', '#000000'], hasVipEntry: true, entryMessage: 'Elite Veteran is here!' };
    if (totalSpent >= 5000000) return { lvl: 4, label: 'LEGENDARY NODE', status: 'NEBULA COMMANDER', color: '#d0630a', secondaryColor: '#5f0bf0', anim: 'nebula', themeBg: ['#0A001A', '#000000'], hasVipEntry: true, entryMessage: 'Legendary Node is here!' };
    // 🔥 SATTI FIX: ENABLED VIP ENTRY & MESSAGES FOR LEVELS 1 TO 3 🔥
    if (totalSpent >= 1000000) return { lvl: 3, label: 'DIAMOND CORE', status: 'NUCLEAR ASSET', color: '#bcde4a', secondaryColor: '#09bbf1fe', anim: 'diamond', themeBg: ['#001A0A', '#000000'], hasVipEntry: true, entryMessage: 'Diamond Core activated the grid!' };
    if (totalSpent >= 200001) return { lvl: 2, label: 'GOLD OPERATIVE', status: 'ROYAL STRIKER', color: '#ffae00', secondaryColor: '#ac4a4a', anim: 'sparkle', themeBg: ['#1A0B00', '#000000'], hasVipEntry: true, entryMessage: 'Gold Operative secured the perimeter!' };
    return { lvl: 1, label: 'SILVER AGENT', status: 'STAR FAME', color: '#0f33e7', secondaryColor: '#6b0402', anim: 'wave', themeBg: ['#050505', '#000000'], hasVipEntry: true, entryMessage: 'Silver Agent deployed into action!' };
};

// 🔥 SATTI FIX: DYNAMIC LOCAL BADGE FETCHER MAPPED TO SCREENSHOT 🔥
const getBadgeLocalImage = (lvl: number) => {
    switch (lvl) {
        case 8: return require('../../assets/badge/TITAN OVERSEER.png');
        case 7: return require('../../assets/badge/MYTHIC RULER.png');
        case 6: return require('../../assets/badge/GRANDMASTER.png');
        case 5: return require('../../assets/badge/ELITE VETERAN.png');
        case 4: return require('../../assets/badge/LEGENDARY NODE.png');
        case 3: return require('../../assets/badge/DIAMOND CORE.png');
        case 2: return require('../../assets/badge/GOLD OPERATIVE.png');
        case 1: return require('../../assets/badge/SILVER AGENT.png');
        default: return null;
    }
};

// 🔥 SATTI FIX: EXACT RANK CALCULATION FROM PROFILE SCREEN 🔥
const getHighestBalanceForRank = (userRecord: any) => {
    if (!userRecord) return 0;
    return userRecord.totalSpentDiamonds || 0;
};

// ================= 🆕 PREMIUM UI COMPONENTS =================

// 🆕 3D image with auto icon fallback
const Img3D = ({ uri, size, fallback, color = '#FFF', style }: any) => {
    const [err, setErr] = useState(false);
    if (err) return <MaterialCommunityIcons name={fallback} size={size * 0.7} color={color} />;
    return <Image source={{ uri }} style={[{ width: size, height: size }, style]} resizeMode="contain" onError={() => setErr(true)} />;
};

// 🆕 BACKDROP: seat-la last-a ukkandha user image full screen (image maarina smooth cross-fade)
const Backdrop = ({ uri }: { uri: string }) => {
    const [cur, setCur] = useState(uri);
    const [prev, setPrev] = useState<string | null>(null);
    const fade = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (uri === cur) return;
        setPrev(cur);
        setCur(uri);
        fade.setValue(0);
        Animated.timing(fade, { toValue: 1, duration: 650, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(() => setPrev(null));
    }, [uri]);
    return (
        <>
            {prev ? <Image source={{ uri: prev }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
            <Animated.Image source={{ uri: cur }} resizeMode="cover" style={[StyleSheet.absoluteFill, { opacity: fade }]} />
        </>
    );
};

// 🆕 Floating (bob + sway) wrapper
const FloatBox = ({ children, amp = 5, dur = 1800, style, still = false }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (still) return;
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    if (still) return <View style={style}>{children}</View>;
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

// 🆕 Spinning gradient ring (3D avatar frame)
const SpinRing = ({ size, colors, children, speed = 6000, innerBg = '#0B1026', animated = true }: { size: number, colors: any, children?: React.ReactNode, speed?: number, innerBg?: string, animated?: boolean }) => {
    const spin = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        if (!animated) return;
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
            <View style={{ width: size - 6, height: size - 6, borderRadius: (size - 6) / 2, backgroundColor: innerBg, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                {children}
            </View>
        </View>
    );
};

// 🆕 Pulsing dot
const PulseDot = ({ color = '#10B981', size = 8 }: { color?: string, size?: number }) => {
    const a = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.timing(a, { toValue: 1, duration: 1400, easing: Easing.out(Easing.quad), useNativeDriver: true }));
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] }), transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }] }} />
            <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
        </View>
    );
};

// 🆕 Twinkle star
const TwinkleStar = ({ x, y, size = 10, color = '#FFD700', delay = 0 }: { x: number, y: number, size?: number, color?: string, delay?: number }) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.delay(delay),
                Animated.timing(v, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(v, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <Animated.View
            pointerEvents="none"
            style={{
                position: 'absolute', left: x, top: y,
                opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.9] }),
                transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.2] }) }, { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }],
            }}
        >
            <MaterialCommunityIcons name="star-four-points" size={size} color={color} />
        </Animated.View>
    );
};

// 🆕 ✨ Colour dust (chinna particles mela rise aagum)
const GoldDust = () => {
    const dust = useRef(
        Array.from({ length: 12 }, (_, i) => ({
            v: new Animated.Value(0),
            x: (((i * 37) % 100) / 100) * width,
            size: 2 + (i % 3),
            dur: 7000 + (i % 5) * 1300,
            delay: i * 450,
            color: ['#22D3EE', '#F472B6', '#A3E635', '#818CF8', '#A78BFA', '#FFFFFF'][i % 6],
        }))
    ).current;
    useEffect(() => {
        const loops = dust.map((p) => {
            const l = Animated.loop(
                Animated.sequence([
                    Animated.delay(p.delay),
                    Animated.timing(p.v, { toValue: 1, duration: p.dur, easing: Easing.linear, useNativeDriver: true }),
                    Animated.timing(p.v, { toValue: 0, duration: 0, useNativeDriver: true })
                ])
            );
            l.start();
            return l;
        });
        return () => loops.forEach(l => l.stop());
    }, []);
    return (
        <>
            {dust.map((p, i) => (
                <Animated.View
                    key={i}
                    pointerEvents="none"
                    style={{
                        position: 'absolute',
                        top: height * 0.92,
                        left: p.x,
                        width: p.size,
                        height: p.size,
                        borderRadius: p.size / 2,
                        backgroundColor: p.color,
                        shadowColor: p.color,
                        shadowOpacity: 0.9,
                        shadowRadius: 4,
                        shadowOffset: { width: 0, height: 0 },
                        opacity: p.v.interpolate({ inputRange: [0, 0.15, 0.85, 1], outputRange: [0, 0.7, 0.4, 0] }),
                        transform: [
                            { translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.7] }) },
                            { translateX: p.v.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 14, -10] }) }
                        ]
                    }}
                />
            ))}
        </>
    );
};

// 🆕 Press-scale wrapper (springy tap)
const PressScale = ({ children, onPress, onLongPress, disabled, style }: any) => {
    const s = useRef(new Animated.Value(1)).current;
    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPress}
            onLongPress={onLongPress}
            disabled={disabled}
            onPressIn={() => Animated.spring(s, { toValue: 0.9, speed: 40, bounciness: 4, useNativeDriver: true }).start()}
            onPressOut={() => Animated.spring(s, { toValue: 1, speed: 20, bounciness: 10, useNativeDriver: true }).start()}
        >
            <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
        </TouchableOpacity>
    );
};

// 🆕 Chat message 3D pop-in
const ChatPop = ({ children, style }: any) => {
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
                        { rotateX: a.interpolate({ inputRange: [0, 1], outputRange: ['35deg', '0deg'] }) },
                        { translateX: a.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
                        { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
                    ],
                },
                style,
            ]}
        >
            {children}
        </Animated.View>
    );
};

// ✨ Seat-ah suthi sutrum colour dots
const OrbitLights = ({ colors, speed = 4200, reverse = false, size = 72 }: { colors: string[], speed?: number, reverse?: boolean, size?: number }) => {
    const spin = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: speed, easing: Easing.linear, useNativeDriver: true }));
        loop.start();
        return () => loop.stop();
    }, []);
    const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: reverse ? ['360deg', '0deg'] : ['0deg', '360deg'] });
    const N = 6, BOX = size + 16, R = size / 2 + 5;
    return (
        <Animated.View pointerEvents="none" style={{ position: 'absolute', width: BOX, height: BOX, left: (size - BOX) / 2, top: (size - BOX) / 2, transform: [{ rotate }] }}>
            {Array.from({ length: N }).map((_, i) => {
                const a = (i / N) * Math.PI * 2;
                const col = colors[i % colors.length];
                const sz = i % 2 === 0 ? 5 : 3;
                return (
                    <View
                        key={i}
                        style={{
                            position: 'absolute',
                            left: BOX / 2 + R * Math.cos(a) - sz / 2,
                            top: BOX / 2 + R * Math.sin(a) - sz / 2,
                            width: sz, height: sz, borderRadius: sz / 2,
                            backgroundColor: col,
                            shadowColor: col, shadowOpacity: 0.8, shadowRadius: 4, shadowOffset: { width: 0, height: 0 }, elevation: 4,
                        }}
                    />
                );
            })}
        </Animated.View>
    );
};

// 👑 ROYAL SEAT v5 (multicolour rainbow ring + orbit dots + nameplate)
//    occupied: spinning rainbow avatar ring + glow + chair badge + 3D crown (host)
//    isSpot  : background image-oda owner seat (brighter glow)
//    empty   : rotating dashed multicolour ring + chair icon
const SeatItem = ({ seat, index, isMe, isSeatHost, isSpot, label, onPress }: any) => {
    const enter = useRef(new Animated.Value(0)).current;
    const emptySpin = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(enter, { toValue: 1, delay: index * 70, friction: 6, tension: 60, useNativeDriver: true }).start();
    }, []);
    useEffect(() => {
        const loop = Animated.loop(Animated.timing(emptySpin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
        loop.start();
        return () => loop.stop();
    }, []);
    const c = SEAT_COLORS[index % SEAT_COLORS.length];
    const c2 = SEAT_COLORS[(index + 3) % SEAT_COLORS.length];
    const accent = isSpot ? '#22D3EE' : c;
    const emptyRotate = emptySpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    return (
        <Animated.View
            style={{
                opacity: enter,
                transform: [
                    { perspective: 700 },
                    { rotateY: enter.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '0deg'] }) },
                    { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) },
                    { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                ],
            }}
        >
            <TouchableOpacity style={styles.seatWrapper} onPress={onPress} activeOpacity={0.85}>
                {seat.uid ? (
                    <FloatBox still>
                        <View style={styles.seatOuter}>
                            <View pointerEvents="none" style={[styles.seatGlow, { backgroundColor: accent, opacity: isSpot ? 0.75 : 0.5 }]} />
                            <SpinRing size={SEAT_RING} colors={SEAT_RAINBOW} animated speed={3500 + (index % 4) * 700}>
                                <Image source={{ uri: seat.image }} style={styles.seatAvatar} />
                                {seat.isMuted && <View style={styles.muteOverlay}><Ionicons name={seat.hostMuted ? "lock-closed" : "mic-off"} size={15} color="#FFF" /></View>}
                            </SpinRing>
                            <OrbitLights colors={[c, '#FFFFFF', c2, '#FFFFFF']} speed={4200 + (index % 3) * 600} reverse={index % 2 === 1} size={SEAT_BOX} />
                            <View style={styles.seatStatusDot} />
                            <LinearGradient colors={[c2, c]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.seatChairBadge}>
                                <MaterialCommunityIcons name="seat" size={10} color="#0B1026" />
                            </LinearGradient>
                            {isSeatHost && (
                                <View style={styles.seatCrown}>
                                    <Img3D uri={IMG.crown} size={20} fallback="crown" color="#F59E0B" />
                                </View>
                            )}
                        </View>
                    </FloatBox>
                ) : (
                    <FloatBox still>
                        <View style={styles.seatOuter}>
                            <Animated.View pointerEvents="none" style={[styles.emptyCircle, { borderColor: c, transform: [{ rotate: emptyRotate }] }]} />
                            <MaterialCommunityIcons name="seat" size={SEAT_BOX - 24} color={c2} style={{ position: 'absolute', textShadowColor: c2, textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 }, opacity: 0.9 }} />
                        </View>
                    </FloatBox>
                )}
                <LinearGradient
                    colors={['rgba(0,0,0,0)', seat.uid ? accent : c, 'rgba(0,0,0,0)']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.seatPedestal}
                />
                <View style={[styles.namePlate, { borderColor: c + '99' }, isMe && styles.namePlateMe, !seat.uid && styles.namePlateEmpty]}>
                    <Text style={[styles.seatName, isMe && { color: '#FDE68A', fontWeight: '900' }, !seat.uid && { color: '#94A3B8' }]} numberOfLines={1}>
                        {label}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// 🆕 Action button with small caption (bottom dock)
const DockBtn = ({ label, onPress, children, borderColor, bg, badge }: any) => (
    <View style={{ alignItems: 'center', flex: 1 }}>
        <PressScale onPress={onPress} style={[styles.dockBtn, { borderColor, backgroundColor: bg }]}>
            {children}
            {badge ? (
                <View style={styles.dockBadge}>
                    <Text style={styles.dockBadgeText}>{badge}</Text>
                </View>
            ) : null}
        </PressScale>
        <Text style={styles.dockLabel} numberOfLines={1}>{label}</Text>
    </View>
);

export default function PartyRoomScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const roomId = params.roomId as string;
    const user = auth.currentUser;
    const insets = useSafeAreaInsets();

    const [roomData, setRoomData] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);
    const [mySeatIndex, setMySeatIndex] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isHost, setIsHost] = useState(false);

    const [messages, setMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [reactions, setReactions] = useState<any[]>([]);

    const agoraEngine = useRef<IRtcEngine | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
    const [isAgoraJoined, setIsAgoraJoined] = useState(false);

    const [showGiftModal, setShowGiftModal] = useState(false);
    const [currentGift, setCurrentGift] = useState<any>(null);
    const giftAnimY = useRef(new Animated.Value(50)).current;
    const scaleAnim = useRef(new Animated.Value(0)).current;

    const [gameVisible, setGameVisible] = useState(false);
    const [glassPathVisible, setGlassPathVisible] = useState(false);

    // 🔥 DISCLAIMER MODAL STATES FOR PLAY STORE SAFETY 🔥
    const [disclaimerVisible, setDisclaimerVisible] = useState(false);
    const [disclaimerChecked, setDisclaimerChecked] = useState(false);
    const [pendingGameType, setPendingGameType] = useState<'reflex' | 'memory' | null>(null);

    const gameVisibleRef = useRef(false);
    useEffect(() => { gameVisibleRef.current = gameVisible; }, [gameVisible]);

    const [displayWalletBalance, setDisplayWalletBalance] = useState(0);
    const isClosingRef = useRef(false);

    const [isLiveEndedWaiting, setIsLiveEndedWaiting] = useState(false);
    const [exitMessage, setExitMessage] = useState("");

    const hasAnnouncedJoin = useRef(false);
    const userDataRef = useRef<any>(null);
    const mySeatIndexRef = useRef<number | null>(null);
    const roomDataRef = useRef<any>(null);

    const isCallingRef = useRef(false);
    const [isCallingState, setIsCallingState] = useState(false);
    const navigatingToCallRef = useRef(false);

    // 🔥 USER BLOCK AND REPORT ACTION SHEET STATES 🔥
    const [actionSheetVisible, setActionSheetVisible] = useState(false);
    const [reportSheetVisible, setReportSheetVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    // 🔥 VIP USER ENTRY STATES 🔥
    const [vipEntry, setVipEntry] = useState<any>(null);
    const vipProgress = useRef(new Animated.Value(0)).current;
    const hasFiredVipEntry = useRef(false);

    // 🆕 SPOTLIGHT: seat-la last-a ukkandha user (host illama) - background image avar thaan
    const [spotlight, setSpotlight] = useState<{ uid: string, name: string, image: string } | null>(null);
    const seatOrderRef = useRef<string[]>([]);

    // 🆕 KEYBOARD LIFT: type box keyboard-ku mela varanum (Android)
    const bottomRef = useRef<any>(null);
    const [kbLift, setKbLift] = useState(0);
    useEffect(() => {
        if (Platform.OS !== 'android') return;
        const showSub = Keyboard.addListener('keyboardDidShow', (e: any) => {
            const kbTop = e?.endCoordinates?.screenY;
            if (typeof kbTop !== 'number') return;
            setTimeout(() => {
                if (!bottomRef.current || !bottomRef.current.measureInWindow) return;
                bottomRef.current.measureInWindow((_x: number, y: number, _w: number, h: number) => {
                    const overlap = y + h - kbTop;
                    if (overlap > 0) setKbLift(prev => prev + overlap);
                });
            }, 120);
        });
        const hideSub = Keyboard.addListener('keyboardDidHide', () => setKbLift(0));
        return () => { showSub.remove(); hideSub.remove(); };
    }, []);

    // 🆕 PREMIUM UI ANIMATION DRIVERS
    const headerEnter = useRef(new Animated.Value(0)).current;
    const bottomEnter = useRef(new Animated.Value(0)).current;

    useEffect(() => { userDataRef.current = userData; }, [userData]);
    useEffect(() => { mySeatIndexRef.current = mySeatIndex; }, [mySeatIndex]);

    useEffect(() => {
        Animated.spring(headerEnter, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }).start();
        Animated.spring(bottomEnter, { toValue: 1, friction: 8, tension: 50, delay: 200, useNativeDriver: true }).start();
    }, []);

    const [isWaiting, setIsWaiting] = useState(false);

    // Waiting list entry watch + room-ai vittu pona entry delete
    useEffect(() => {
        const myUid = auth.currentUser?.uid;
        if (!roomId || !myUid || isHost) return;
        const wRef = doc(db, "forum_rooms", roomId, "waitingList", myUid);
        const unsubWait = onSnapshot(wRef, (snap) => setIsWaiting(snap.exists()));
        return () => { unsubWait(); deleteDoc(wRef).catch(() => {}); };
    }, [roomId, isHost]);

    const requestSeat = async () => {
        const myUid = auth.currentUser?.uid;
        if (!myUid || isWaiting) return;
        try {
            const actualName = userData?.name || userData?.displayName || auth.currentUser?.displayName || "User";
            const actualImage = userData?.profilePic || userData?.photoURL || auth.currentUser?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(actualName)}&background=0F172A&color=00F2FE`;
            await setDoc(doc(db, "forum_rooms", roomId, "waitingList", myUid), {
                uid: myUid,
                name: actualName,
                image: actualImage,
                lvl: calculateUserLevel(userData?.totalSpentDiamonds || 0).lvl,
                requestedAt: serverTimestamp()
            });
            Alert.alert("Request Sent ⏳", "The host is reviewing your request. please wait for approval.");
        } catch (e) { console.log(e); }
    };

    const cancelSeatRequest = async () => {
        const myUid = auth.currentUser?.uid;
        if (!myUid) return;
        try { await deleteDoc(doc(db, "forum_rooms", roomId, "waitingList", myUid)); } catch (e) { console.log(e); }
    };

    useEffect(() => { roomDataRef.current = roomData; }, [roomData]);

    // 🆕 SPOTLIGHT TRACKER: seat-la yaar last-a vandhaangalo avanga image background-la varum.
    // Avanga ezhunthu poitaa, munnaadi ukkandha user image. Yaarum illana host image.
    useEffect(() => {
        if (!roomData?.seats) return;
        const hostId = roomData.hostId;
        const present = roomData.seats
            .map((s: any, i: number) => ({ ...s, i }))
            .filter((s: any) => s.uid && s.uid !== hostId);
        const presentIds: string[] = present.map((s: any) => s.uid);

        let order = seatOrderRef.current.filter((id) => presentIds.includes(id));
        const fresh = present
            .filter((s: any) => !order.includes(s.uid))
            .sort((a: any, b: any) => ((a.seatedAt || 0) - (b.seatedAt || 0)) || (a.i - b.i));
        fresh.forEach((s: any) => order.push(s.uid));
        seatOrderRef.current = order;

        const lastId = order[order.length - 1];
        const lastSeat = present.find((s: any) => s.uid === lastId);
        if (lastSeat) {
            const nm = lastSeat.name || 'User';
            setSpotlight({
                uid: lastSeat.uid,
                name: nm,
                image: lastSeat.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(nm)}&background=1E1B4B&color=fff&size=600`
            });
        } else {
            setSpotlight(null);
        }
    }, [roomData?.seats, roomData?.hostId]);

    const requestMicrophonePermission = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, {
                    title: 'Microphone Permission',
                    message: 'TalkPe Pro needs access to your microphone to talk.',
                    buttonNeutral: 'Ask Me Later', buttonNegative: 'Cancel', buttonPositive: 'OK',
                });
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) { return false; }
        }
        return true;
    };

    // 🔥 SATTI FIX: Explicit Leave Function 🔥
    const handleLeaveParty = async () => {
        if (isClosingRef.current) return;
        isClosingRef.current = true;

        const uData = userDataRef.current;
        const name = uData?.name || uData?.displayName || user?.displayName || "Guest";

        try {
            if (hasAnnouncedJoin.current) {
                await addDoc(collection(db, "forum_rooms", roomId, "messages"), {
                    uid: "system",
                    name: "System",
                    text: `🚪 ${name} left the room.`,
                    timestamp: serverTimestamp(),
                    isSystem: true
                });
            }

            if (mySeatIndexRef.current !== null && roomDataRef.current) {
                const updatedSeats = [...roomDataRef.current.seats];
                updatedSeats[mySeatIndexRef.current] = { uid: null, name: null, image: null, isMuted: false };
                await updateDoc(doc(db, "forum_rooms", roomId), { seats: updatedSeats });
            }
        } catch (e) { console.log(e); }

        if (agoraEngine.current) {
            agoraEngine.current.leaveChannel();
            agoraEngine.current.release();
            agoraEngine.current = null;
        }
        router.back();
    };

    // 🔥 SATTI FIX: THE ULTIMATE SMART MULTI-entry CHECKER & EXACT ROUND SYNC EXIT 🔥
    const handleRoomEnded = async () => {
        if (isClosingRef.current || isCallingRef.current || navigatingToCallRef.current) return;

        isClosingRef.current = true;

        setShowGiftModal(false);
        setDisclaimerVisible(false);

        if (agoraEngine.current) {
            agoraEngine.current.leaveChannel();
            agoraEngine.current.release();
            agoraEngine.current = null;
            setIsAgoraJoined(false);
        }

        try {
            setExitMessage("Forum ended. Exiting... 🚀");
            setIsLiveEndedWaiting(true);

            setGameVisible(false);
            setGlassPathVisible(false);

            setTimeout(() => {
                Alert.alert(
                    "Forum Ended",
                    "Host closed this Forum. See you next time! 🚀",
                    [{ text: "OK", onPress: () => router.replace('/(tabs)' as any) }],
                    { cancelable: false }
                );
            }, 500);

            setTimeout(() => router.replace('/(tabs)' as any), 3500);

        } catch (e) { console.log(e); }
    };

    useEffect(() => {
        const backAction = () => {
            handleLeaveParty();
            return true;
        };
        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, [roomId]);

    useEffect(() => {
        if (!roomId || !user) return;

        setIsLiveEndedWaiting(false);
        setExitMessage("");
        isClosingRef.current = false;

        const rtdb = getDatabase();
        const roomPresenceRef = ref(rtdb, `presence_rooms/${roomId}`);

        const unsubPresence = onValue(roomPresenceRef, async (snap) => {
            if (snap.exists() && snap.val() === "ended") {
                await updateDoc(doc(db, "forum_rooms", roomId), { status: "ended" }).catch(() => {});
                await updateDoc(doc(db, "lives", roomId), { status: "ended" }).catch(() => {});
            }
        });

        const kickRef = ref(rtdb, `forum_rooms/${roomId}/kicked_users/${user.uid}`);
        const unsubKick = onValue(kickRef, (snap) => {
            if (snap.val() === true) {
                Alert.alert("Removed", "You have been blocked and removed by the host.");
                handleLeaveParty();
            }
        });

        const unsubUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setUserData(data);
                setDisplayWalletBalance(data.balance || 0);
            }
        });

        const unsubRoom = onSnapshot(doc(db, "forum_rooms", roomId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();

                if (data.bannedUsers && data.bannedUsers.includes(user.uid)) {
                    Alert.alert("Removed", "You have been blocked and removed by the host.");
                    handleLeaveParty();
                    return;
                }

                if (data.status === 'ended') {
                    if (!isCallingRef.current && !navigatingToCallRef.current) {
                        handleRoomEnded();
                    }
                    return;
                }
                setRoomData(data);
                setIsHost(data.hostId === user?.uid);
                const myIdx = data.seats?.findIndex((s: any) => s.uid === user?.uid);
                setMySeatIndex(myIdx !== -1 ? myIdx : null);
                setIsLoading(false);
            } else {
                setIsLoading(false);
                router.replace('/(tabs)' as any);
            }
        });

        const msgQuery = query(collection(db, 'forum_rooms', roomId, 'messages'), orderBy('timestamp', 'desc'), limit(20));
        const unsubMsgs = onSnapshot(msgQuery, (snap) => {
            // latest message top-la (MELA VARANUM)
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));

            snap.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const isRecent = data.timestamp ? (Date.now() - data.timestamp.toMillis() < 5000) : true;
                    if (isRecent && data.isVipEntry) {
                        triggerVipBanner(data);
                    }
                }
            });
        });

        const giftQuery = query(collection(db, 'forum_rooms', roomId, 'gifts'), orderBy('timestamp', 'desc'), limit(1));
        const unsubGifts = onSnapshot(giftQuery, async (snap) => {
            snap.docChanges().forEach(async (change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const isRecent = data.timestamp ? (Date.now() - data.timestamp.toMillis() < 5000) : true;
                    if (isRecent) {
                        setCurrentGift(data);
                        triggerGiftAnimation();
                    }
                }
            });
        });

        const reactionQuery = query(collection(db, 'forum_rooms', roomId, 'reactions'), orderBy('timestamp', 'desc'), limit(1));
        const unsubReactions = onSnapshot(reactionQuery, (snap) => {
            snap.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const isRecentReact = data.timestamp ? (Date.now() - data.timestamp.toMillis() < 3000) : true;
                    if (isRecentReact) {
                        setReactions(prev => [...prev, { id: Date.now() + Math.random(), emoji: data.emoji }]);
                    }
                }
            });
        });

        return () => {
            unsubPresence();
            unsubKick();
            unsubRoom();
            unsubUser();
            unsubGifts();
            unsubMsgs();
            unsubReactions();
        };
    }, [roomId, user]);

    // 🔥 AUTOMATIC VIP ENTRY TRIGGER WHEN CURRENT USER ENTERS 🔥
    useEffect(() => {
        if (userData && user && roomId && !hasFiredVipEntry.current) {
            hasFiredVipEntry.current = true;
            const userTotalSpent = getHighestBalanceForRank(userData);
            const levelData = calculateUserLevel(userTotalSpent);

            if (levelData.hasVipEntry) {
                addDoc(collection(db, "forum_rooms", roomId, "messages"), {
                    uid: user.uid,
                    name: userData.name || userData.displayName || "User",
                    text: levelData.entryMessage,
                    timestamp: serverTimestamp(),
                    isVipEntry: true,
                    lvl: levelData.lvl,
                    label: levelData.label,
                    color: levelData.color,
                    themeBg: levelData.themeBg,
                    anim: levelData.anim,
                    entryMessage: levelData.entryMessage,
                    image: userData.profilePic || userData.photoURL || null
                }).catch(e => console.log(e));
            }
        }
    }, [userData, user, roomId]);

    // 🔥 AUTOMATIC JOIN NOTIFICATION 🔥
    useEffect(() => {
        if (isAgoraJoined && userData && !hasAnnouncedJoin.current) {
            hasAnnouncedJoin.current = true;
            addDoc(collection(db, "forum_rooms", roomId, "messages"), {
                uid: "system",
                name: "System",
                text: `👋 ${userData?.name || userData?.displayName || "Guest"} joined the room!`,
                timestamp: serverTimestamp(),
                isSystem: true
            }).catch(e => console.log(e));
        }
    }, [isAgoraJoined, userData, roomId]);

    // 🆕 VIP ENTRY BANNER (3D tier-based animation)
    const triggerVipBanner = (data: any) => {
        setVipEntry(data);
        vipProgress.setValue(0);
        Animated.sequence([
            Animated.timing(vipProgress, { toValue: 1, duration: 900, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
            Animated.delay(4000),
            Animated.timing(vipProgress, { toValue: 0, duration: 600, easing: Easing.in(Easing.ease), useNativeDriver: true })
        ]).start(() => {
            setVipEntry(null);
        });
    };

    const getVipTransform = (animType: string) => {
        switch (animType) {
            case 'titan':
                return [
                    { translateY: vipProgress.interpolate({ inputRange: [0, 1], outputRange: [-height, 0] }) },
                    { scale: vipProgress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.3, 1.2, 1] }) }
                ];
            case 'mythic':
                return [
                    { scale: vipProgress },
                    { rotateY: vipProgress.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }) }
                ];
            case 'grandmaster':
                return [
                    { translateY: vipProgress.interpolate({ inputRange: [0, 1], outputRange: [height, 0] }) },
                    { rotateZ: vipProgress.interpolate({ inputRange: [0, 1], outputRange: ['15deg', '0deg'] }) }
                ];
            case 'explosion':
                return [
                    { scale: vipProgress.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1.4, 1] }) }
                ];
            case 'nebula':
                return [
                    { scale: vipProgress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) },
                    { translateX: vipProgress.interpolate({ inputRange: [0, 1], outputRange: [width, 0] }) },
                    { translateY: vipProgress.interpolate({ inputRange: [0, 1], outputRange: [100, 0] }) }
                ];
            case 'diamond':
                return [
                    { scale: vipProgress },
                    { rotateX: vipProgress.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '0deg'] }) },
                    { rotateZ: vipProgress.interpolate({ inputRange: [0, 1], outputRange: ['-45deg', '0deg'] }) }
                ];
            case 'sparkle':
                return [
                    { scale: vipProgress },
                    { rotate: vipProgress.interpolate({ inputRange: [0, 1], outputRange: ['270deg', '0deg'] }) }
                ];
            case 'wave':
                return [
                    { translateX: vipProgress.interpolate({ inputRange: [0, 1], outputRange: [-width, 0] }) },
                    { scale: vipProgress.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) }
                ];
            default: return [{ scale: vipProgress }];
        }
    };

    const triggerGiftAnimation = () => {
        giftAnimY.setValue(50);
        scaleAnim.setValue(0);
        Animated.sequence([
            Animated.parallel([
                Animated.timing(giftAnimY, { toValue: 0, duration: 400, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1.2, duration: 400, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true })
            ]),
            Animated.delay(2500),
            Animated.parallel([
                Animated.timing(giftAnimY, { toValue: -150, duration: 400, easing: Easing.in(Easing.ease), useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 0, duration: 400, useNativeDriver: true })
            ])
        ]).start(() => setCurrentGift(null));
    };

    useEffect(() => {
        const initAgora = async () => {
            const hasPermission = await requestMicrophonePermission();
            if (!hasPermission) return;
            try {
                agoraEngine.current = createAgoraRtcEngine();
                agoraEngine.current.initialize({ appId: AGORA_APP_ID });
                agoraEngine.current.enableAudio();
                agoraEngine.current.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting);
                agoraEngine.current.setDefaultAudioRouteToSpeakerphone(true);
                agoraEngine.current.setEnableSpeakerphone(true);
                agoraEngine.current.addListener('onJoinChannelSuccess', () => setIsAgoraJoined(true));
                agoraEngine.current.setClientRole(ClientRoleType.ClientRoleAudience);
                agoraEngine.current.joinChannel('', roomId, 0, { autoSubscribeAudio: true });
            } catch (e) { console.log(e); }
        };
        initAgora();
        return () => {
            if (agoraEngine.current) {
                agoraEngine.current.leaveChannel();
                agoraEngine.current.release();
            }
        };
    }, [roomId]);

    // 🔇 HOST MUTE: host mute panna user thirumba thaane unmute panna mudiyathu
    const myHostMuted = mySeatIndex !== null && !!roomData?.seats?.[mySeatIndex]?.hostMuted;
    const prevHostMutedRef = useRef(false);

    useEffect(() => {
        if (myHostMuted) {
            // Host mute pannitaanga -> mic force OFF
            if (agoraEngine.current) agoraEngine.current.muteLocalAudioStream(true);
            setIsMuted(true);
        } else if (prevHostMutedRef.current) {
            // Host unmute pannitaanga -> thirumba pesalaam
            setIsMuted(false);
        }
        prevHostMutedRef.current = myHostMuted;
    }, [myHostMuted]);

    useEffect(() => {
        if (agoraEngine.current && isAgoraJoined) {
            if (isHost || mySeatIndex !== null) {
                agoraEngine.current.setClientRole(ClientRoleType.ClientRoleBroadcaster);
                // hostMuted irundha eppavume mute (user-ala override panna mudiyathu)
                agoraEngine.current.muteLocalAudioStream(isMuted || myHostMuted);
            } else {
                agoraEngine.current.setClientRole(ClientRoleType.ClientRoleAudience);
            }
        }
    }, [isHost, mySeatIndex, isAgoraJoined, isMuted, myHostMuted]);

    const handleSeatClick = async (index: number) => {
        if (!roomData) return;
        const seat = roomData.seats[index];
        if (seat.uid === user?.uid) {
            if (isHost) return;
            Alert.alert("Leave Seat?", "Go to audience?", [{ text: "Leave", onPress: async () => {
                const updatedSeats = [...roomData.seats];
                updatedSeats[index] = { uid: null, name: null, image: null, isMuted: false };
                await updateDoc(doc(db, "forum_rooms", roomId), { seats: updatedSeats });
            }}, { text: "Cancel" }]);
            return;
        }
        if (seat.uid || mySeatIndex !== null) return;
        if (!isHost) {
            if (isWaiting) {
                Alert.alert("Waiting... ⏳", "You are waiting for host approval. Do you want to cancel your request?", [
                    { text: "Keep Waiting", style: "cancel" },
                    { text: "Cancel Request", style: "destructive", onPress: cancelSeatRequest }
                ]);
            } else {
                requestSeat();
            }
            return;
        }
        try {
            const updatedSeats = [...roomData.seats];
            const actualName = userData?.name || userData?.displayName || user?.displayName || "VIP User";
            const actualImage = userData?.profilePic || userData?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(actualName)}&background=0F172A&color=00F2FE`;

            updatedSeats[index] = {
                uid: user?.uid,
                name: actualName,
                image: actualImage,
                isMuted: isMuted,
                seatedAt: Date.now()
            };
            await updateDoc(doc(db, "forum_rooms", roomId), { seats: updatedSeats });
        } catch (e) { console.log(e); }
    };

    const toggleMic = () => {
        // 🔇 Host mute pannirundha user unmute panna mudiyathu
        if (myHostMuted) {
            Alert.alert("Muted by Host 🔇", "Host unga mic-ah mute pannirukkaanga. Host unmute pannaa mattum thaan pesa mudiyum.");
            return;
        }
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);
        if (mySeatIndex !== null && roomData) {
            const updatedSeats = [...roomData.seats];
            updatedSeats[mySeatIndex] = { ...updatedSeats[mySeatIndex], isMuted: newMutedState };
            updateDoc(doc(db, "forum_rooms", roomId), { seats: updatedSeats });
        }
    };

    // 🔥 MUTE/UNMUTE ROOM SPEAKER 🔥
    const toggleSpeaker = () => {
        const newSpeakerMutedState = !isSpeakerMuted;
        setIsSpeakerMuted(newSpeakerMutedState);
        if (agoraEngine.current) {
            agoraEngine.current.muteAllRemoteAudioStreams(newSpeakerMutedState);
        }
    };

    const handleSendChat = async () => {
        if (!chatInput.trim() || !user) return;
        try {
            const userTotalSpent = getHighestBalanceForRank(userData);
            const levelData = calculateUserLevel(userTotalSpent);

            await addDoc(collection(db, "forum_rooms", roomId, "messages"), {
                uid: user.uid,
                name: userData?.name || "Guest",
                text: chatInput.trim(),
                timestamp: serverTimestamp(),
                // regular message-ku level data anuppa maatom
                lvl: 0,
                label: '',
                color: ''
            });
            setChatInput('');
        } catch (e) { console.log(e); }
    };

    const handleReaction = async (emoji: string) => {
        try {
            await addDoc(collection(db, "forum_rooms", roomId, "reactions"), {
                emoji, timestamp: serverTimestamp()
            });
        } catch (e) { console.log(e); }
    };

    const handleSendGift = async (gift: any) => {
        if (!userData || !roomData || !user) return;
        if ((userData.balance || 0) < gift.price) {
            Alert.alert("Low Diamonds 💎", "Not enough diamonds.");
            return;
        }
        setShowGiftModal(false);
        try {
            const expertBeans = Math.floor(gift.price / 2);

            addDoc(collection(db, "forum_rooms", roomId, "gifts"), {
                giftId: gift.id, giftName: gift.name, icon: gift.icon,
                price: gift.price,
                senderName: userData.name || user?.displayName || 'User',
                senderId: user.uid,
                senderImage: userData.profilePic || userData.photoURL || user?.photoURL || null,
                timestamp: serverTimestamp()
            });

            updateDoc(doc(db, "users", user.uid), { balance: increment(-gift.price) });
            updateDoc(doc(db, "users", roomData.hostId), {
                totalBeansEarned: increment(expertBeans),
                walletBalance: increment(expertBeans),
                beans: increment(expertBeans)
            });

            // 🔥 ROYAL VIP GIFT MESSAGE TO CHAT (ippo diamond amount-um kaatum) 🔥
            addDoc(collection(db, "forum_rooms", roomId, "messages"), {
                uid: "system_gift",
                name: "System",
                text: `🎁 ${userData?.name || userData?.displayName || "Guest"} sent a ${gift.name} ${gift.icon} • 💎 ${gift.price}`,
                timestamp: serverTimestamp(),
                isGift: true
            }).catch(e => console.log(e));

        } catch (e) { console.log(e); }
    };

    // 🔥 ROBUST CALL INITIATOR FOR USER IN FORUM ROOM 🔥
    const handleCallButtonPress = async () => {
        if (!roomData?.hostId || !auth.currentUser) return;
        if (isCallingRef.current) return;

        try {
            isCallingRef.current = true;
            setIsCallingState(true);

            let verifiedUserName = auth.currentUser.displayName || "User";
            let verifiedUserPic = auth.currentUser.photoURL || "";

            const userProfileRef = doc(db, "users", auth.currentUser.uid);
            const userSnap = await getDoc(userProfileRef);

            if (userSnap.exists()) {
                const freshData = userSnap.data();
                verifiedUserName = freshData.name || verifiedUserName;
                verifiedUserPic = freshData.profilePic || verifiedUserPic;
            }

            let expertCallRate = 25;
            const expertProfileRef = doc(db, "users", roomData.hostId);
            const expertSnap = await getDoc(expertProfileRef);

            if (expertSnap.exists()) {
                const eData = expertSnap.data();
                expertCallRate = eData.pricePerMin || 25;
            }

            const callRef = await addDoc(collection(db, "calls"), {
                userId: auth.currentUser.uid,
                userName: verifiedUserName,
                userImage: verifiedUserPic,
                expertId: roomData.hostId,
                expertName: roomData.hostName || "Expert",
                expertImage: roomData.hostImage || "",
                status: "pending",
                createdAt: serverTimestamp(),
                pricePerMin: expertCallRate,
                type: "video"
            });

        } catch (error) {
            isCallingRef.current = false;
            setIsCallingState(false);
            Alert.alert("Error", "Could not initiate call request.");
        }
    };

    // 🔥 UPDATED CALL LISTENER FOR FORUM ROOM
    const listenToCallRequest = () => {
        if (!auth.currentUser) return () => {};

        const q = query(
            collection(db, "calls"),
            where("userId", "==", auth.currentUser.uid),
            where("status", "in", ["accepted", "rejected"]),
            orderBy("createdAt", "desc")
        );

        const unsub = onSnapshot(q, async (snap) => {
            if (snap.metadata.hasPendingWrites) return;

            for (const change of snap.docs) {
                const callData = change.data();

                const now = new Date().getTime();
                const callTime = callData.createdAt?.toMillis() || 0;
                const isRecent = (now - callTime) < 30000;

                if (callData.status === "accepted") {
                    navigatingToCallRef.current = true;

                    unsub();
                    isCallingRef.current = false;
                    setIsCallingState(false);

                    handleLeaveParty();

                    router.push({
                        pathname: "/videocall" as any,
                        params: {
                            callId: change.id,
                            role: 'user',
                            isFreeTrial: "false"
                        }
                    });
                } else if (callData.status === "rejected" && isRecent) {
                    isCallingRef.current = false;
                    setIsCallingState(false);
                    Alert.alert("Busy", "The host is currently busy.");
                }
            }
        });

        return unsub;
    };

    useEffect(() => {
        const unsubCall = listenToCallRequest();
        return () => unsubCall();
    }, []);

    // 🔥 USER CLICK HANDLER - PREVENTING "System" CLICK 🔥
    const handleUserClick = (userItem: any) => {
        if (userItem.isSystem || userItem.uid === 'system' || userItem.senderId === 'system_msg') return;

        const normalizedUser = {
            id: userItem.uid || userItem.senderId,
            name: userItem.name || userItem.senderName,
            image: userItem.image || userItem.profilePic || userItem.photoURL || null
        };
        if (normalizedUser.id === user?.uid) return;
        setSelectedUser(normalizedUser);
        setActionSheetVisible(true);
    };

    // 🔥 BLOCK LOGIC FOR USER SIDE 🔥
    const handleBlockUser = async (showAlert = true) => {
        if (!selectedUser || !user) return;
        try {
            await updateDoc(doc(db, "users", user.uid), {
                blockedUsers: arrayUnion(selectedUser.id)
            });
            if (showAlert) Alert.alert("Blocked", `${selectedUser.name} has been permanently blocked.`);
        } catch (e) { console.log(e); }
        setActionSheetVisible(false);
    };

    const handleReportUser = () => {
        setActionSheetVisible(false);
        setTimeout(() => {
            setReportSheetVisible(true);
        }, 300);
    };

    const submitReport = async (reason: string) => {
        if (!selectedUser) return;
        try {
            await addDoc(collection(db, "reports"), {
                reportedUserId: selectedUser.id,
                reportedUserName: selectedUser.name,
                reportedBy: user?.uid,
                reason: reason,
                timestamp: serverTimestamp(),
                forumId: roomId
            });

            await handleBlockUser(false);
            Alert.alert("Reported & Blocked", `User reported to Admin for: ${reason}.`);
        } catch (e) { console.log(e); }
        setReportSheetVisible(false);
    };

    if (isLoading || !roomData) return null;

    // 🆕 derived values (no hooks below)
    const headerY = headerEnter.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] });
    const headerRotX = headerEnter.interpolate({ inputRange: [0, 1], outputRange: ['-35deg', '0deg'] });
    const bottomY = bottomEnter.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
    const hostFallbackPic = roomData?.hostImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(roomData?.hostName || 'Host')}&background=1E1B4B&color=fff&size=600`;
    // 🆕 BACKGROUND IMAGE: seat-la last user image, yaarum illana host image
    const backdropUri = spotlight?.image || hostFallbackPic;
    const sheetBottom = Math.max(insets.bottom, 12) + 28;

    return (
        <View style={styles.container}>
            {/* 🌌 BASE (very dark) */}
            <LinearGradient colors={['#05070F', '#0A0A1A', '#020617']} style={StyleSheet.absoluteFill} />

            {/* 🖼️ LAST-SEATED USER IMAGE = FULL SCREEN BACKGROUND (smooth cross-fade) */}
            <Backdrop uri={backdropUri} />

            {/* 🌑 DARK OVERLAY (screen nala dark - text/messages clear-a theriyum, image-um theriyum) */}
            <LinearGradient colors={['rgba(2,4,12,0.50)', 'rgba(2,4,12,0.36)', 'rgba(2,4,12,0.66)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <LinearGradient colors={['rgba(167,139,250,0.06)', 'rgba(0,0,0,0)', 'rgba(34,211,238,0.06)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />

            {/* 🆕 twinkles + colour dust */}
            <TwinkleStar x={width * 0.12} y={height * 0.2} size={11} color="#67E8F9" delay={0} />
            <TwinkleStar x={width * 0.82} y={height * 0.17} size={9} color="#C4B5FD" delay={500} />
            <TwinkleStar x={width * 0.9} y={height * 0.36} size={10} color="#F472B6" delay={900} />
            <TwinkleStar x={width * 0.06} y={height * 0.4} size={8} color="#FFFFFF" delay={1300} />
            <GoldDust />

            {/* 🔥 INVISIBLE SHIELD LOCK DURING GRACEFUL EXIT 🔥 */}
            {isLiveEndedWaiting && (
                <View
                    style={[StyleSheet.absoluteFillObject, { zIndex: 9999, elevation: 9999, backgroundColor: 'transparent' }]}
                    onStartShouldSetResponder={() => true}
                >
                    <View style={{ position: 'absolute', top: height * 0.15, width: '100%', alignItems: 'center' }}>
                        <View style={{ backgroundColor: 'rgba(239,68,68,0.95)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, borderWidth: 2, borderColor: '#FFF', shadowColor: '#000', shadowRadius: 10, shadowOpacity: 0.8, elevation: 15 }}>
                            <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
                                {exitMessage || "Closing session..."}
                            </Text>
                        </View>
                    </View>
                </View>
            )}

            {/* bottom edge SafeArea illa - dock screen bottom-ku varum, insets manually add pannrom */}
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    enabled={Platform.OS === 'ios'}
                    style={{ flex: 1 }}
                >
                    {/* 🔮 FLOATING 3D GLASS HEADER (neon border) */}
                    <Animated.View style={[styles.headerWrap, { opacity: headerEnter, transform: [{ perspective: 1000 }, { translateY: headerY }, { rotateX: headerRotX }] }]}>
                        <LinearGradient colors={NEON_BORDER as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerBorder}>
                            <BlurView intensity={90} tint="dark" style={styles.header}>
                                <LinearGradient colors={['rgba(34,211,238,0.14)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                <PressScale onPress={handleLeaveParty} style={styles.iconBtn}>
                                    <Ionicons name="log-out-outline" size={22} color="#FCA5A5" />
                                </PressScale>

                                <View style={styles.roomInfo}>
                                    <Text style={styles.roomName} numberOfLines={1}>{roomData.roomName || 'Forum Arena'}</Text>
                                    <View style={styles.hostRow}>
                                        <PulseDot color={isAgoraJoined ? '#10B981' : '#F59E0B'} size={6} />
                                        <Text style={styles.hostName} numberOfLines={1}>👑 {roomData.hostName} {isAgoraJoined ? '• Live' : '• Connecting...'}</Text>
                                    </View>
                                </View>

                                <FloatBox amp={3} dur={1800}>
                                    <View style={styles.balanceBadge}>
                                        <Img3D uri={IMG.diamond} size={18} fallback="diamond-stone" color="#60A5FA" />
                                        <Text style={styles.balanceText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{displayWalletBalance}</Text>
                                    </View>
                                </FloatBox>
                            </BlurView>
                        </LinearGradient>
                    </Animated.View>

                    {/* 🪑 ROYAL SEATS (box illa - seats direct-a screen mela) */}
                    <View style={styles.seatsContainer}>
                        <View style={styles.stagePanel}>
                            <View style={styles.seatsGrid}>
                                {roomData.seats?.map((seat: any, index: number) => (
                                    <SeatItem
                                        key={index}
                                        seat={seat}
                                        index={index}
                                        isMe={seat.uid === user?.uid}
                                        isSeatHost={!!seat.uid && seat.uid === roomData.hostId}
                                        isSpot={!!seat.uid && !!spotlight && seat.uid === spotlight.uid}
                                        label={seat.uid === user?.uid ? 'YOU' : (seat.uid ? seat.name : (isWaiting && !isHost ? 'Waiting...' : 'Empty'))}
                                        onPress={() => handleSeatClick(index)}
                                    />
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* 💬 DARK GLASS CHAT (clear visible messages) */}
                    <View style={styles.chatArea}>
                        <FlatList
                            data={messages}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item, index }) => {
                                // VIP entry message chat-la kaatha - banner mattum
                                if (item.isVipEntry) return null;

                                const fade = Math.max(0.78, 1 - index * 0.03);

                                // 🎁 ROYAL GIFT MESSAGE
                                if (item.isGift) {
                                    return (
                                        <ChatPop style={{ alignSelf: 'center', opacity: fade, maxWidth: '96%' }}>
                                            <LinearGradient
                                                colors={['#FBBF24', '#F472B6', '#A78BFA']}
                                                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                                style={styles.sysBorder}
                                            >
                                                <View style={styles.sysPill}>
                                                    <Text style={styles.giftChatText}>{item.text}</Text>
                                                </View>
                                            </LinearGradient>
                                        </ChatPop>
                                    );
                                }

                                // System message (join / leave)
                                if (item.isSystem) {
                                    return (
                                        <ChatPop style={{ alignSelf: 'center', opacity: fade, maxWidth: '96%' }}>
                                            <LinearGradient colors={['#34D399', '#A78BFA', '#F472B6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sysBorder}>
                                                <View style={styles.sysPill}>
                                                    <PulseDot color="#34D399" size={5} />
                                                    <Text style={styles.sysText}>{item.text}</Text>
                                                </View>
                                            </LinearGradient>
                                        </ChatPop>
                                    );
                                }

                                return (
                                    <ChatPop style={{ alignSelf: 'flex-start', opacity: fade, maxWidth: '96%' }}>
                                        <TouchableOpacity activeOpacity={0.8} onPress={() => handleUserClick(item)}>
                                            <LinearGradient colors={['#22D3EE', '#F472B6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.chatBorder}>
                                                <View style={styles.chatBubble}>
                                                    <LinearGradient colors={['#22D3EE', '#A78BFA']} style={styles.chatInitial}>
                                                        <Text style={styles.chatInitialText}>{(item.name || 'U').charAt(0).toUpperCase()}</Text>
                                                    </LinearGradient>
                                                    <View style={{ flexShrink: 1 }}>
                                                        <Text style={styles.chatName} numberOfLines={1}>{item.name}</Text>
                                                        <Text style={styles.chatText}>{item.text}</Text>
                                                    </View>
                                                </View>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </ChatPop>
                                );
                            }}
                            contentContainerStyle={{ paddingVertical: 12, paddingHorizontal: 12 }}
                        />
                    </View>

                    {/* 🎛️ BOTTOM DOCK (screen bottom-ku nala kila + keyboard mela lift) */}
                    <Animated.View
                        ref={bottomRef}
                        collapsable={false}
                        style={[styles.bottomArea, { paddingBottom: Math.max(insets.bottom, 4) + 4, marginBottom: kbLift, opacity: bottomEnter, transform: [{ translateY: bottomY }] }]}
                    >
                        <View style={styles.reactionRow}>
                            {REACTION_EMOJIS.map(emoji => (
                                <PressScale key={emoji} onPress={() => handleReaction(emoji)} style={styles.reactionBtn}>
                                    <Text style={{ fontSize: 20 }}>{emoji}</Text>
                                </PressScale>
                            ))}
                        </View>
                        <LinearGradient colors={NEON_BORDER as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.controlsBorder}>
                            <BlurView intensity={90} tint="dark" style={styles.controlsBox}>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        value={chatInput}
                                        onChangeText={setChatInput}
                                        placeholder="Type a message..."
                                        placeholderTextColor="#94A3B8"
                                        style={styles.chatInputField}
                                        editable={!isLiveEndedWaiting}
                                    />
                                    <TouchableOpacity
                                        style={[styles.sendIconBtn, { opacity: chatInput.trim() && !isLiveEndedWaiting ? 1 : 0.5 }]}
                                        onPress={handleSendChat}
                                        disabled={!chatInput.trim() || isLiveEndedWaiting}
                                    >
                                        <LinearGradient colors={['#22D3EE', '#6366F1']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.sendGrad}>
                                            <Ionicons name="send" size={17} color="#FFFFFF" />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.actionRow}>
                                    {/* 🔥 CUSTOM SKILL ARENA ICON (Play Store Safe) 🔥 */}
                                    <DockBtn label="REFLEX" onPress={() => { setPendingGameType('reflex'); setDisclaimerVisible(true); }} borderColor="rgb(0, 229, 255)" bg="rgba(0, 0, 0, 0.55)">
                                        <View style={{ width: 16, height: 16, justifyContent: 'space-between' }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                                <View style={{ width: 7, height: 7, backgroundColor: '#FF2A5F', borderRadius: 2 }} />
                                                <View style={{ width: 7, height: 7, backgroundColor: '#00F2FE', borderRadius: 2 }} />
                                            </View>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <View style={{ width: 7, height: 7, backgroundColor: '#10B981', borderRadius: 2 }} />
                                                <View style={{ width: 7, height: 4, backgroundColor: '#FFD700', borderRadius: 4 }} />
                                            </View>
                                        </View>
                                    </DockBtn>

                                    {/* 🔥 MEMORY MATCH GAME ICON 🔥 */}
                                    <DockBtn label="MEMORY" onPress={() => { setPendingGameType('memory'); setDisclaimerVisible(true); }} borderColor="#C084FC" bg="rgba(168, 85, 247, 0.35)">
                                        <View style={{ width: 24, height: 24, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 9 }}>🍎</Text>
                                            <Text style={{ fontSize: 9 }}>🍌</Text>
                                            <Text style={{ fontSize: 9 }}>🍇</Text>
                                            <Text style={{ fontSize: 9 }}>🍓</Text>
                                        </View>
                                    </DockBtn>

                                    <DockBtn label="GIFT" onPress={() => setShowGiftModal(true)} borderColor="rgba(249,168,212,0.9)" bg="rgba(236,72,153,0.35)">
                                        <Ionicons name="gift" size={21} color="#F9A8D4" />
                                    </DockBtn>

                                    {/* 🔊 SPEAKER (room audio mute / unmute) */}
                                    <DockBtn label={isSpeakerMuted ? 'SOUND OFF' : 'SOUND'} onPress={toggleSpeaker} borderColor={isSpeakerMuted ? 'rgba(252,165,165,0.8)' : 'rgba(125,211,252,0.8)'} bg={isSpeakerMuted ? 'rgba(239,68,68,0.30)' : 'rgba(14,165,233,0.30)'}>
                                        <Ionicons name={isSpeakerMuted ? "volume-mute" : "volume-high"} size={21} color={isSpeakerMuted ? "#FCA5A5" : "#BAE6FD"} />
                                    </DockBtn>

                                    {/* 🎤 MIC (seat-la irukkumbodhu / host) - host mute pannina lock */}
                                    {(isHost || mySeatIndex !== null) ? (
                                        <DockBtn
                                            label={myHostMuted ? 'LOCKED' : (isMuted ? 'MUTED' : 'MIC')}
                                            onPress={toggleMic}
                                            borderColor={(isMuted || myHostMuted) ? 'rgba(252,165,165,0.8)' : 'rgba(110,231,183,0.8)'}
                                            bg={(isMuted || myHostMuted) ? 'rgba(239,68,68,0.30)' : 'rgba(16,185,129,0.30)'}
                                        >
                                            <Ionicons name={myHostMuted ? "lock-closed" : (isMuted ? "mic-off" : "mic")} size={21} color={(isMuted || myHostMuted) ? "#FCA5A5" : "#6EE7B7"} />
                                        </DockBtn>
                                    ) : (
                                        /* 🪑 SEAT REQUEST (audience-ku) */
                                        <DockBtn
                                            label={isWaiting ? 'WAITING' : 'SEAT'}
                                            onPress={() => {
                                                if (isWaiting) {
                                                    Alert.alert("Waiting... ⏳", "You are waiting for host approval. Do you want to cancel your request?", [
                                                        { text: "Keep Waiting", style: "cancel" },
                                                        { text: "Cancel Request", style: "destructive", onPress: cancelSeatRequest }
                                                    ]);
                                                } else {
                                                    requestSeat();
                                                }
                                            }}
                                            borderColor={isWaiting ? 'rgba(252,211,77,0.9)' : 'rgba(110,231,183,0.8)'}
                                            bg={isWaiting ? 'rgba(245,158,11,0.30)' : 'rgba(16,185,129,0.30)'}
                                        >
                                            <MaterialCommunityIcons name={isWaiting ? "timer-sand" : "seat"} size={21} color={isWaiting ? "#FCD34D" : "#6EE7B7"} />
                                        </DockBtn>
                                    )}
                                </View>
                            </BlurView>
                        </LinearGradient>
                    </Animated.View>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {/* 🔥 FREE-TO-PLAY: isHost={false} => HOST ALSO JOINS AS A NORMAL PLAYER 🔥 */}
            <LiveGameSheet
                visible={gameVisible}
                onClose={() => setGameVisible(false)}
                liveId={roomId}
                isHost={false}
                userWalletBalance={userData?.balance || 0}
            />

            {/* ✅ MEMORY MATCH ARENA (FREE-TO-PLAY) */}
            <MemoryMatch
                visible={glassPathVisible}
                onClose={() => setGlassPathVisible(false)}
                liveId={roomId}
                isHost={false}
                userWalletBalance={userData?.balance || 0}
            />

            {/* 🔥 VIP USER ENTRY ANIMATION BANNER (3D tier animation) 🔥 */}
            {vipEntry && (
                <Animated.View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, justifyContent: 'center', alignItems: 'center', backgroundColor: vipProgress.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)'] }) }]} pointerEvents="none">
                    <Animated.View style={[styles.vipEntryBannerContainer, { transform: getVipTransform(vipEntry.anim) }]}>
                        <LinearGradient colors={vipEntry.themeBg || ['#0A001A', '#000000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.vipBannerGradient}>
                            <TwinkleStar x={18} y={18} size={14} color={vipEntry.color || '#F59E0B'} delay={0} />
                            <TwinkleStar x={width * 0.9 - 50} y={30} size={11} color="#FFFFFF" delay={400} />
                            <TwinkleStar x={30} y={220} size={10} color="#22D3EE" delay={800} />
                            <Image
                                source={vipEntry.lvl ? getBadgeLocalImage(vipEntry.lvl) : { uri: vipEntry.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(vipEntry.name || 'VIP')}&background=0A001A&color=FFF` }}
                                style={[styles.vipBannerAvatar, vipEntry.lvl ? { borderWidth: 0, borderRadius: 0 } : { borderColor: vipEntry.color || '#F59E0B' }]}
                                resizeMode="contain"
                            />
                            <View style={{ alignItems: 'center', marginTop: 15, paddingHorizontal: 10 }}>
                                <Text style={[styles.vipBannerLabel, { color: vipEntry.color || '#F59E0B' }]}>✨ {vipEntry.label || 'VIP MEMBER'} ✨</Text>

                                {vipEntry.lvl && (
                                    <View style={{ backgroundColor: vipEntry.color || '#F59E0B', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginBottom: 8, marginTop: 5 }}>
                                        <Text style={{ color: '#000', fontSize: 11, fontWeight: '900', letterSpacing: 1 }}>LEVEL {vipEntry.lvl}</Text>
                                    </View>
                                )}

                                <Text style={{ color: '#FFF', fontSize: 22, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5, textAlign: 'center' }}>
                                    {vipEntry.name}
                                </Text>
                                <Text style={styles.vipBannerName}>{vipEntry.entryMessage || `has joined the arena!`}</Text>
                            </View>
                        </LinearGradient>
                    </Animated.View>
                </Animated.View>
            )}

            {/* 🎆 TOP OVERLAY: reactions + gift animation */}
            <View style={styles.topOverlayLayer} pointerEvents="none">
                <View style={StyleSheet.absoluteFill}>
                    {reactions.map(r => (
                        <FlyingEmoji key={r.id} emoji={r.emoji} onComplete={() => setReactions(prev => prev.filter(item => item.id !== r.id))} />
                    ))}
                </View>

                {currentGift && (
                    <View style={styles.lottieContainer}>
                        <LottieView
                            source={currentGift.price >= 1000 ? require('../../assets/images/fireworks.json') : require('../../assets/images/confetti.json')}
                            autoPlay loop={false}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                        />
                        <Animated.View style={[styles.giftAnimationContainer, { transform: [{ translateY: giftAnimY }, { scale: scaleAnim }] }]}>
                            <Text style={styles.giftAnimIcon}>{currentGift.icon || '🎁'}</Text>
                            <LinearGradient colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.5)', 'transparent']} style={styles.giftAnimLabel}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                                    <Image
                                        source={{ uri: currentGift.senderImage || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentGift.senderName || 'U')}&background=F59E0B&color=fff` }}
                                        style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: '#F59E0B' }}
                                    />
                                    <Text style={styles.giftAnimSender}>{currentGift.senderName} Sent {currentGift.giftName}</Text>
                                </View>
                                {/* 💎 FIX: gift-ku kila evalvu diamond nu ippo kaatum */}
                                <Text style={styles.giftAnimAmount}>💎 {currentGift.price || currentGift.amount || 0} DIAMONDS</Text>
                            </LinearGradient>
                        </Animated.View>
                    </View>
                )}
            </View>

            {/* 🎁 GIFT SHEET */}
            <Modal visible={showGiftModal} transparent animationType="slide" onRequestClose={() => setShowGiftModal(false)}>
                <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setShowGiftModal(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity activeOpacity={1} style={{ width: '100%' }}>
                            <View style={[styles.premiumGiftSheet, { paddingBottom: sheetBottom }]}>
                                <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                                <LinearGradient colors={['transparent', 'rgba(244,114,182,0.95)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topEdgeGlow} pointerEvents="none" />
                                <View style={styles.actionSheetHandle} />
                                <View style={styles.giftSheetHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                        <FloatBox amp={3} dur={1500}>
                                            <Img3D uri={IMG.gift} size={30} fallback="gift" color="#F9A8D4" />
                                        </FloatBox>
                                        <Text style={styles.premiumSheetTitle} numberOfLines={1}>SEND PREMIUM GIFT 🎁</Text>
                                    </View>
                                    <View style={styles.balanceBadge}>
                                        <Text style={styles.balanceText} numberOfLines={1}>💎 {userData?.balance || 0}</Text>
                                    </View>
                                </View>
                                <FlatList
                                    data={GIFTS}
                                    numColumns={4}
                                    keyExtractor={(g) => g.id}
                                    showsVerticalScrollIndicator={false}
                                    renderItem={({ item }) => (
                                        <PressScale style={styles.premiumGiftCard} onPress={() => handleSendGift(item)}>
                                            <LinearGradient colors={item.colors as any} style={styles.premiumGiftIconBox}><Text style={{ fontSize: 30 }}>{item.icon}</Text></LinearGradient>
                                            <Text style={styles.premiumPriceText}>💎 {item.price}</Text>
                                            <Text style={styles.premiumNameText}>{item.name}</Text>
                                        </PressScale>
                                    )}
                                />
                            </View>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>

            {/* 🔥 PREMIUM ACTION SHEET: USER MINI-PROFILE 🔥 */}
            <Modal visible={actionSheetVisible} transparent animationType="slide">
                <View style={styles.actionSheetOverlay}>
                    <TouchableOpacity style={styles.actionSheetDismiss} onPress={() => setActionSheetVisible(false)} />
                    <View style={[styles.actionSheetContainer, { paddingBottom: sheetBottom }]}>
                        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
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
                            <Text style={styles.actionSheetTitle} numberOfLines={1}>{selectedUser?.name || "User"}</Text>
                        </View>

                        <TouchableOpacity style={styles.actionSheetBtn} onPress={handleReportUser}>
                            <Ionicons name="shield-half-outline" size={22} color="#EF4444" />
                            <Text style={[styles.actionSheetBtnText, { color: '#FCA5A5' }]}>Block and Report</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionSheetCancelBtn} onPress={() => setActionSheetVisible(false)}>
                            <Text style={styles.actionSheetCancelText}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 🔥 REPORT REASONS MODAL 🔥 */}
            <Modal visible={reportSheetVisible} transparent animationType="slide">
                <View style={styles.actionSheetOverlay}>
                    <TouchableOpacity style={styles.actionSheetDismiss} onPress={() => setReportSheetVisible(false)} />
                    <View style={[styles.actionSheetContainer, { paddingBottom: sheetBottom }]}>
                        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
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
                            <Ionicons name="flag-outline" size={22} color="#CBD5E1" />
                            <Text style={[styles.actionSheetBtnText, { color: '#FFF' }]}>Other Violations</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionSheetCancelBtn} onPress={() => setReportSheetVisible(false)}>
                            <Text style={styles.actionSheetCancelText}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 🔥 PLAY STORE COMPLIANT FREE-TO-PLAY GAMING DISCLAIMER MODAL 🔥 */}
            <Modal visible={disclaimerVisible} transparent animationType="slide">
                <View style={styles.actionSheetOverlay}>
                    <View style={[styles.actionSheetContainer, { paddingBottom: sheetBottom }]}>
                        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={styles.actionSheetHandle} />
                        <Text style={[styles.actionSheetTitle, { marginBottom: 15, color: '#FBBF24' }]}>🛡️ Skill Gaming Policy</Text>

                        <ScrollView style={{ maxHeight: height * 0.4, marginBottom: 15 }} showsVerticalScrollIndicator={false}>
                            <Text style={styles.disclaimerBodyText}>Welcome to TalkPe Pro Games! Before you proceed, please acknowledge our gaming policy:</Text>

                            <Text style={styles.disclaimerBullet}>🧠 <Text style={styles.disclaimerBold}>100% Skill-Based:</Text> Games like Reflex Arena and Memory Match are purely based on user skill, speed, and memory. This is NOT a game of chance or gambling.</Text>

                            <Text style={styles.disclaimerBullet}>🎮 <Text style={styles.disclaimerBold}>Free to Play:</Text> All games are completely free. There is NO entry fee and NO Diamonds are deducted to play.</Text>

                            <Text style={styles.disclaimerBullet}>🚫 <Text style={styles.disclaimerBold}>No Rewards or Cash Value:</Text> Games do not give any Diamond rewards or prizes. Nothing in these games can be withdrawn, cashed out, or exchanged for real money.</Text>

                            <Text style={styles.disclaimerBullet}>🎭 <Text style={styles.disclaimerBold}>Entertainment Only:</Text> This feature is provided strictly for entertainment and interactive networking purposes.</Text>
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.checkboxContainer}
                            activeOpacity={0.8}
                            onPress={() => setDisclaimerChecked(!disclaimerChecked)}
                        >
                            <Ionicons name={disclaimerChecked ? "checkbox" : "square-outline"} size={24} color={disclaimerChecked ? "#10B981" : "#CBD5E1"} />
                            <Text style={styles.checkboxText}>I confirm that I have read and agree to the Skill Gaming Policy. I understand that the games are free and carry no monetary rewards.</Text>
                        </TouchableOpacity>

                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 20 }}>
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
                                    if (pendingGameType === 'memory') setGlassPathVisible(true);
                                    setPendingGameType(null);
                                }}
                            >
                                <Text style={[styles.actionSheetBtnText, { color: disclaimerChecked ? '#FFF' : 'rgba(255,255,255,0.4)', marginLeft: 0 }]}>AGREE & PLAY</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

        </View>
    );
}

function FlyingEmoji({ emoji, onComplete }: any) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.timing(anim, { toValue: 1, duration: 2500, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(onComplete);
    }, []);
    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -height * 0.6] });
    const translateX = anim.interpolate({ inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1], outputRange: [0, 15, -15, 10, -10, 0] });
    const opacity = anim.interpolate({ inputRange: [0, 0.8, 1], outputRange: [1, 1, 0] });
    return (
        <Animated.Text style={{ fontSize: 35, position: 'absolute', bottom: 100, right: 30, opacity, transform: [{ translateY }, { translateX }] }}>{emoji}</Animated.Text>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },

    // 🔮 HEADER (floating 3D glass, neon gradient border)
    headerWrap: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 6, zIndex: 10 },
    headerBorder: { borderRadius: 30, padding: 1.4 },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 28.6, overflow: 'hidden', backgroundColor: 'rgba(3, 5, 18, 0.84)' },
    iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(239,68,68,0.20)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(252,165,165,0.55)' },
    roomInfo: { flex: 1, marginHorizontal: 12, justifyContent: 'center', minWidth: 0 },
    roomName: { color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.3, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
    hostRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    hostName: { color: '#6EE7B7', fontSize: 11.5, fontWeight: '800', flexShrink: 1, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
    balanceBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 84, maxWidth: 120, height: 36, gap: 6, backgroundColor: 'rgba(59,130,246,0.22)', paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(147,197,253,0.6)' },
    balanceText: { color: '#BFDBFE', fontSize: 12, fontWeight: '900', flexShrink: 1 },

    // 👑 ROYAL SEATS (box illa - seats direct-a screen mela)
    seatsContainer: { paddingHorizontal: 14, paddingTop: 0, paddingBottom: 0 },
    stagePanel: { backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: 'transparent', paddingHorizontal: 12, paddingTop: 2, paddingBottom: 0 },
    seatsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: SEAT_GAP, rowGap: 0 },
    seatWrapper: { alignItems: 'center', width: SEAT_W, paddingTop: 7 },
    seatOuter: { width: SEAT_BOX, height: SEAT_BOX, justifyContent: 'center', alignItems: 'center' },
    emptyCircle: { position: 'absolute', width: SEAT_RING, height: SEAT_RING, borderRadius: SEAT_RING / 2, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1.8, borderColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed' },
    seatAvatar: { width: SEAT_IMG, height: SEAT_IMG, borderRadius: SEAT_IMG / 2 },
    seatGlow: { position: 'absolute', width: SEAT_RING - 6, height: SEAT_RING - 6, borderRadius: (SEAT_RING - 6) / 2, opacity: 0.55 },
    seatChairBadge: { position: 'absolute', bottom: 0, right: 0, width: 17, height: 17, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#0B1026' },
    seatPedestal: { width: SEAT_BOX - 10, height: 3, borderRadius: 2, marginTop: 2 },
    namePlate: { marginTop: 3, paddingHorizontal: 8, paddingVertical: 1, maxWidth: SEAT_W, minWidth: SEAT_W - 14, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.60)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.40)', alignItems: 'center' },
    namePlateMe: { borderColor: 'rgba(253,230,138,0.85)', backgroundColor: 'rgba(233,196,106,0.16)' },
    namePlateEmpty: { backgroundColor: 'rgba(0,0,0,0.45)', borderColor: 'rgba(255,255,255,0.14)' },
    seatStatusDot: { position: 'absolute', top: 2, right: 2, width: 11, height: 11, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#0B1026' },
    seatCrown: { position: 'absolute', top: -10, alignSelf: 'center' },
    muteOverlay: { position: 'absolute', backgroundColor: 'rgba(239,68,68,0.75)', width: '100%', height: '100%', borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
    seatName: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', textAlign: 'center', maxWidth: SEAT_W - 16 },

    // 💬 CHAT (dark glass panel + double-contrast borders)
    chatArea: { flex: 1, marginHorizontal: 14, marginTop: 2, marginBottom: 6, backgroundColor: 'rgba(3,5,18,0.55)', borderRadius: 26, borderWidth: 1, borderColor: 'rgba(34,211,238,0.35)', overflow: 'hidden' },
    chatBorder: { borderRadius: 18, padding: 1.6, marginBottom: 10 },
    chatBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(4,7,22,0.96)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16.5 },
    chatInitial: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    chatInitialText: { color: '#0B1026', fontSize: 13, fontWeight: '900' },
    chatName: { color: '#67E8F9', fontWeight: '900', fontSize: 12, letterSpacing: 0.3, marginBottom: 2 },
    chatText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', lineHeight: 20, flexShrink: 1 },
    sysBorder: { borderRadius: 18, padding: 1.6, marginBottom: 10 },
    sysPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(4,7,22,0.96)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16.5 },
    sysText: { color: '#A7F3D0', fontWeight: '800', fontSize: 12.5, textAlign: 'center', flexShrink: 1, lineHeight: 18 },
    giftChatText: { color: '#FDE68A', fontWeight: '900', fontSize: 12.5, textAlign: 'center', flexShrink: 1, lineHeight: 18 },

    // 🎛️ BOTTOM DOCK
    bottomArea: { paddingHorizontal: 14, paddingBottom: 14 },
    reactionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginBottom: 8 },
    reactionBtn: { backgroundColor: 'rgba(3,5,18,0.85)', borderWidth: 1, borderColor: 'rgba(244,114,182,0.5)', paddingVertical: 6, paddingHorizontal: 9, borderRadius: 16 },
    controlsBorder: { borderRadius: 28, padding: 1.3 },
    controlsBox: { borderRadius: 26.7, paddingHorizontal: 14, paddingVertical: 12, overflow: 'hidden', backgroundColor: 'rgba(3, 5, 18, 0.84)' },
    inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    chatInputField: { flex: 1, color: '#FFF', fontSize: 14, fontWeight: '700', minWidth: 0, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', borderRadius: 18, paddingHorizontal: 14, height: 42 },
    sendIconBtn: { paddingLeft: 10, justifyContent: 'center', alignItems: 'center' },
    sendGrad: { width: 42, height: 42, borderRadius: 21, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
    dockBtn: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.2, justifyContent: 'center', alignItems: 'center' },
    dockLabel: { color: '#F8FAFC', fontSize: 8.5, fontWeight: '900', letterSpacing: 1, marginTop: 5, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 2 },
    dockBadge: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, borderWidth: 1.5, borderColor: '#0B1026' },
    dockBadgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },

    // 🎆 OVERLAYS
    topOverlayLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1000, elevation: 1000 },
    lottieContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    giftAnimationContainer: { alignItems: 'center', justifyContent: 'center' },
    giftAnimIcon: { fontSize: 150, textShadowColor: 'rgba(255,255,255,0.8)', textShadowRadius: 40 },
    giftAnimLabel: { alignItems: 'center', marginTop: -15, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25 },
    giftAnimSender: { color: '#93C5FD', fontSize: 16, fontWeight: '900', letterSpacing: 1.2 },
    giftAnimAmount: { color: '#FFF', fontSize: 28, fontWeight: '900', marginTop: 5, textShadowColor: '#3B82F6', textShadowRadius: 15 },

    // 🎁 GIFT SHEET
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    premiumGiftSheet: { width: '100%', maxHeight: height * 0.55, backgroundColor: 'rgba(6, 9, 28, 0.94)', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 15, paddingTop: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(244,114,182,0.40)', borderBottomWidth: 0 },
    topEdgeGlow: { position: 'absolute', top: 0, left: 20, right: 20, height: 1.5 },
    giftSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    premiumSheetTitle: { color: '#FFF', fontWeight: '900', fontSize: 15, flexShrink: 1 },
    premiumGiftCard: { width: (width - 30) / 4, alignItems: 'center', marginVertical: 10 },
    premiumGiftIconBox: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
    premiumPriceText: { color: '#93C5FD', fontSize: 10, fontWeight: '900', marginTop: 5 },
    premiumNameText: { color: '#E2E8F0', fontSize: 9, fontWeight: '700' },

    // 🔥 ACTION SHEET STYLES 🔥
    actionSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
    actionSheetDismiss: { flex: 1 },
    actionSheetContainer: { backgroundColor: 'rgba(6, 9, 28, 0.94)', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(34,211,238,0.35)', borderBottomWidth: 0 },
    actionSheetHandle: { width: 40, height: 5, backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
    actionSheetProfileHeader: { alignItems: 'center', marginBottom: 25 },
    actionSheetAvatar: { width: 70, height: 70, borderRadius: 35, borderWidth: 2, borderColor: '#22D3EE', marginBottom: 10 },
    actionSheetAvatarPlaceholder: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#1E293B', borderWidth: 2, borderColor: '#22D3EE', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    actionSheetAvatarText: { color: '#FFF', fontSize: 28, fontWeight: '900' },
    actionSheetTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', textAlign: 'center', letterSpacing: 1 },
    actionSheetBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 10 },
    actionSheetBtnText: { fontSize: 16, fontWeight: '700', marginLeft: 15, letterSpacing: 0.5 },
    actionSheetDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', width: '100%' },
    actionSheetCancelBtn: { marginTop: 25, backgroundColor: 'rgba(255,255,255,0.14)', paddingVertical: 15, borderRadius: 15, alignItems: 'center' },
    actionSheetCancelText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },

    // 🔥 VIP ENTRY STYLES 🔥
    vipEntryBannerContainer: { width: width * 0.95, alignSelf: 'center', borderRadius: 30, elevation: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.8, shadowRadius: 20 },
    vipBannerGradient: { alignItems: 'center', padding: 25, borderRadius: 25, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' },
    vipBannerAvatar: { width: 250, height: 250, marginBottom: 10 },
    vipBannerLabel: { fontSize: 18, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 10 },
    vipBannerName: { color: '#FFF', fontSize: 16, fontWeight: 'bold', textAlign: 'center', lineHeight: 24, paddingHorizontal: 10 },

    // 🔥 DISCLAIMER STYLES 🔥
    disclaimerBodyText: { color: '#E2E8F0', fontSize: 13, lineHeight: 20, marginBottom: 15 },
    disclaimerBullet: { color: '#E2E8F0', fontSize: 13, lineHeight: 22, marginBottom: 10 },
    disclaimerBold: { fontWeight: 'bold', color: '#FFF' },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: 15, borderRadius: 12 },
    checkboxText: { color: '#CBD5E1', fontSize: 11, marginLeft: 10, flex: 1, lineHeight: 18 },
});