import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
// 🔥 NEW: RTDB IMPORT FOR PRESENCE SYSTEM 🔥
import { getDatabase, onValue, ref } from 'firebase/database';
import React, { useEffect, useRef, useState } from 'react';
// 🔥 FIXED: Added AppState to detect Force Close and update Firestore 🔥
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import createAgoraRtcEngine, { ChannelProfileType, ClientRoleType, IRtcEngine, LighteningContrastLevel, RtcSurfaceView } from 'react-native-agora';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import GiftOverlay from '../../../components/GiftOverlay';
import LiveGameSheet from '../../../components/LiveGameSheet'; // ✅ REFLEX BLITZ ARENA IMPORTED
import MemoryMatch from '../../../components/MemoryMatch'; // ✅ GLASS PATH IMPORTED
import { auth, db } from '../../../firebaseConfig';
import { checkAndRequestCallPermissions } from '../../../utils/permissions';

// --- NEW: Security Import ---

const { width, height } = Dimensions.get('window');
const AGORA_APP_ID = '718cedc3c47e44d1bfa4853d6ac6cd80';

// 🎨 PREMIUM HELPER: safe hex + alpha (works with 6 digit and 8 digit hex colors)
const withAlpha = (hex: string, a: number) => {
    const base = (hex || '#ffffff').slice(0, 7);
    const v = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0');
    return base + v;
};

// 🎨 NEW HELPER: solid lighten (+) / darken (-) of a hex colour -> fully opaque result (for solid buttons)
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

// 🔮 MAGIC ORB LAYOUT CONSTANTS
const ORB = 64;          // main orb size
const ITEM = 44;         // each bloom button size
const EDGE_PAD = 16;     // gap between the phone edge and the side buttons
const INFO_CARD_H = 70;  // approx height of the host name board (sits at the very top of the phone)

// 🔮 SIDE COLUMNS: 4 buttons on the phone's LEFT edge + 4 on the RIGHT edge, top -> bottom, equally spaced
const LEFT_KEYS = ['memory', 'beauty', 'mute', 'exit'];   // left column  (top -> bottom)
const RIGHT_KEYS = ['reflex', 'chat', 'gift', 'call'];    // right column (top -> bottom)

// 🔮 BLOOM ITEMS: ordered bottom -> top and interleaved left/right so both columns unfurl upward together
const BURST_ITEMS: { key: string, side: 'left' | 'right', row: number }[] = [];
for (let row = 3; row >= 0; row--) {
    BURST_ITEMS.push({ key: LEFT_KEYS[row], side: 'left', row });
    BURST_ITEMS.push({ key: RIGHT_KEYS[row], side: 'right', row });
}

// 🎁 PREMIUM GIFT CATALOG (same gifts, same prices as before)
const GIFT_CATALOG = [
    { name: 'Chocolate', price: 100, label: '100', img: require('../../../assets/images/chocolate.png') },
    { name: 'Cake', price: 500, label: '500', img: require('../../../assets/images/cake.png') },
    { name: 'Diamond', price: 1000, label: '1k', img: require('../../../assets/images/diamond.png') },
    { name: 'Crown', price: 5000, label: '5k', img: require('../../../assets/images/crown.png') },
    { name: 'Car', price: 10000, label: '10k', img: require('../../../assets/images/car.png') },
    { name: 'Private Jet', price: 25000, label: '25k', img: require('../../../assets/images/private jet.png') },
    { name: 'Palace', price: 50000, label: '50k', img: require('../../../assets/images/palace.png') },
    { name: 'Golden Shoe', price: 100000, label: '100k', img: require('../../../assets/images/Golden Shoe.png') },
    { name: 'Melody Queen', price: 150000, label: '150k', img: require('../../../assets/images/Melody Queen.png') },
    { name: 'Rockstar Guitar', price: 200000, label: '200k', img: require('../../../assets/images/Rockstar.png') },
    { name: 'Star Performer', price: 300000, label: '300k', img: require('../../../assets/images/Rising Star.png') },
    { name: 'Superstar Mic', price: 500000, label: '500k', img: require('../../../assets/images/Superstar Mic.png') },
    { name: 'Talent Crown', price: 1000000, label: '1M', img: require('../../../assets/images/Talent Crown.png') },
];

// 🎁 Gifts split into rows of 3 (guaranteed 3 per row)
const GIFT_ROWS: (typeof GIFT_CATALOG)[] = [];
for (let i = 0; i < GIFT_CATALOG.length; i += 3) GIFT_ROWS.push(GIFT_CATALOG.slice(i, i + 3));

// 💎 Rarity colours for gift cards
const giftRarity = (price: number): [string, string] => {
    if (price < 1000) return ['#22D3EE', '#3B82F6'];
    if (price < 10000) return ['#A855F7', '#6366F1'];
    if (price < 100000) return ['#FBBF24', '#F97316'];
    return ['#F472B6', '#EF4444'];
};

const FloatingHeart = ({ x }: { x: number }) => {
    const animation = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animation, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true,
            easing: Easing.out(Easing.quad),
        }).start();
    }, []);

    const translateY = animation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -height * 0.6],
    });

    const opacity = animation.interpolate({
        inputRange: [0, 0.7, 1],
        outputRange: [1, 1, 0],
    });

    const scale = animation.interpolate({
        inputRange: [0, 0.2, 1],
        outputRange: [0.5, 1.5, 1],
    });

    const rotate = animation.interpolate({
        inputRange: [0, 0.25, 0.5, 0.75, 1],
        outputRange: ['0deg', '15deg', '-15deg', '15deg', '0deg']
    });

    return (
        <Animated.View
            style={[
                styles.floatingReaction,
                { transform: [{ translateY }, { scale }, { rotate }], opacity, left: x }
            ]}
        >
            <Ionicons name="heart" size={35} color="#EF4444" />
        </Animated.View>
    );
};

// 🔥 SATTI FIX: NEW ANIMATED PREMIUM GIFT COMPONENT 🔥
const AnimatedGiftIcon = ({ source, size = 80 }: { source: any, size?: number }) => {
    const anim = useRef(new Animated.Value(0)).current;
    
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();
    }, []);
    
    const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
    
    return (
        <Animated.Image 
            source={source} 
            style={[styles.giftImage, { width: size, height: size, transform: [{ translateY }] }]} 
            resizeMode="contain" 
        />
    );
};

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

// ✨ SONAR PULSE RINGS (connecting screen + idle orb)
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

// ✨ SOLID 3D ORB BUTTON (opaque gradient + glossy top highlight, smooth press-scale, optional breathing glow)
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
                        colors={[shade(color, active ? 0.05 : 0.2), shade(color, -0.3)]}
                        start={{ x: 0.2, y: 0 }}
                        end={{ x: 0.8, y: 1 }}
                        style={[styles.orbBtn, { width: size, height: size, borderRadius: size / 2, borderColor: active ? '#FFFFFF' : withAlpha('#FFFFFF', 0.45) }]}
                    >
                        {/* glossy highlight for the solid 3D look */}
                        <View pointerEvents="none" style={{ position: 'absolute', top: 2, left: size * 0.18, right: size * 0.18, height: size * 0.3, borderRadius: size, backgroundColor: 'rgba(255,255,255,0.22)' }} />
                        {children}
                    </LinearGradient>
                </Animated.View>
            </View>
        </TouchableOpacity>
    );
};

// 🔮 BLOOM ITEM: flies out of the orb on a spring, flips in 3D, label pill under it (never overlaps)
const BurstItem = ({ anim, tx, ty, centerX, centerY, color, label, active, onPress, disabled, badge, children }: { anim: Animated.Value, tx: number, ty: number, centerX: number, centerY: number, color: string, label: string, active?: boolean, onPress?: () => void, disabled?: boolean, badge?: boolean, children?: React.ReactNode }) => (
    <Animated.View
        style={{
            position: 'absolute',
            left: centerX - ITEM / 2,
            top: centerY - ITEM / 2,
            width: ITEM,
            height: ITEM,
            opacity: anim,
            transform: [
                { perspective: 700 },
                { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, tx] }) },
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, ty] }) },
                { rotateY: anim.interpolate({ inputRange: [0, 1], outputRange: ['90deg', '0deg'] }) },
                { scale: anim },
            ],
        }}
    >
        <GlowOrbButton color={color} active={active} onPress={onPress} disabled={disabled} size={ITEM} glow={false}>
            {children}
        </GlowOrbButton>
        {badge && <View style={styles.burstBadge} />}
        <View pointerEvents="none" style={styles.burstLabelWrap}>
            <View style={styles.burstLabelPill}>
                <Text style={styles.burstLabelText} numberOfLines={1}>{label}</Text>
            </View>
        </View>
    </Animated.View>
);

// ✨ MAGIC PANEL: grows out of the orb area & shrinks back (kept in-place, NOT a Modal -> no conflicts)
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
                        { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) },
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

// ✨ PREMIUM 3D GIFT CARD (rarity border, floating item, tilt sway)
const PremiumGiftCard = ({ item, index, onPress }: { item: any, index: number, onPress: () => void }) => {
    const enter = useRef(new Animated.Value(0)).current;
    const sway = useRef(new Animated.Value(0)).current;
    const [c1, c2] = giftRarity(item.price);

    useEffect(() => {
        Animated.sequence([
            Animated.delay(index * 60),
            Animated.spring(enter, { toValue: 1, friction: 6, tension: 70, useNativeDriver: true }),
        ]).start();
        const loop = Animated.sequence([
            Animated.delay(index * 150),
            Animated.loop(
                Animated.sequence([
                    Animated.timing(sway, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                    Animated.timing(sway, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                ])
            ),
        ]);
        loop.start();
        return () => loop.stop();
    }, []);

    const rotateY = sway.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '10deg'] });
    const rotateX = sway.interpolate({ inputRange: [0, 1], outputRange: ['4deg', '-4deg'] });
    const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

    return (
        <Animated.View style={{ opacity: enter, transform: [{ perspective: 700 }, { translateY }, { rotateY }, { rotateX }, { scale: enter }] }}>
            <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
                <LinearGradient colors={[c1, c2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.giftCardBorder}>
                    <View style={styles.giftCardInner}>
                        <View style={[styles.giftCardGlow, { backgroundColor: c1 }]} />
                        <AnimatedGiftIcon source={item.img} size={62} />
                        <Text style={styles.giftNameText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{item.name}</Text>
                        <LinearGradient colors={[withAlpha(c1, 0.35), withAlpha(c2, 0.35)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.giftPricePill}>
                            <Text style={styles.giftPriceEmoji}>💎</Text>
                            <Text style={[styles.giftPrice, { color: '#FFF' }]}>{item.label}</Text>
                        </LinearGradient>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

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

export default function UserLiveViewScreen() {
    // 🔒 SCREENSHOT & SCREEN RECORDING BLOCK (Android: full block, iOS: recording hidden)
    usePreventScreenCapture();

    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams();
    const insets = useSafeAreaInsets();
    const engine = useRef<IRtcEngine | null>(null);
    const liveId = params.liveId as string;
    const isMounted = useRef(true);
    const isFocused = useIsFocused(); 

    const [joined, setJoined] = useState(false);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [viewerCount, setViewerCount] = useState(0);
    const [hostUid, setHostUid] = useState<number>(0);
    const [giftAlert, setGiftAlert] = useState<string | null>(null);
    const [activeGrandGift, setActiveGrandGift] = useState<any>(null); 
    const [hostName, setHostName] = useState<string>("Host");
    const [hostImage, setHostImage] = useState<string>("");
    const [callRate, setCallRate] = useState<number>(25); 
    const [hostLevel, setHostLevel] = useState<string>("L1");
    const [showGiftModal, setShowGiftModal] = useState(false);
    const [hostFirestoreId, setHostFirestoreId] = useState<string | null>(null);
    const [reactions, setReactions] = useState<{ id: number; x: number }[]>([]);
    const [userData, setUserData] = useState<any>(null);
    
    const [isCalling, setIsCalling] = useState(false);
    const [callRequestId, setCallRequestId] = useState<string | null>(null);
    const [showBusyStatus, setShowBusyStatus] = useState(false);

    // 🔥 SATTI FIX: NEW STATE FOR UI FREEZE DURING GRACEFUL EXIT 🔥
    const [isLiveEndedWaiting, setIsLiveEndedWaiting] = useState(false);
    const [exitMessage, setExitMessage] = useState("");

    // 🔥 THE FIX: CALL TRANSITION SHIELDS 🔥
    const isCallingRef = useRef(false);
    const navigatingToCallRef = useRef(false);
    // 🔥 SATTI FIX: CALL TIMER REF 🔥
    const callTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // 🔥 NEW: USER BLOCK AND REPORT ACTION SHEET STATES 🔥
    const [actionSheetVisible, setActionSheetVisible] = useState(false);
    const [reportSheetVisible, setReportSheetVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    // 🔥 NEW: MUTE AND BEAUTY FILTER STATES 🔥
    const [isMuted, setIsMuted] = useState(false);
    const [showProSettings, setShowProSettings] = useState(false); // beauty panel visible
    const [ProLevel, setProLevel] = useState({ light: 0.7, smooth: 0.8 });
    const [isProEnabled, setIsProEnabled] = useState(false);

    // ✨ CHAT PANEL (in-place, opens only when tapped) + unread dot
    const [chatVisible, setChatVisible] = useState(false);
    const [chatUnread, setChatUnread] = useState(false);
    const prevMsgLenRef = useRef(0);

    // 🔮 MAGIC ORB MENU STATE
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuMounted, setMenuMounted] = useState(false);
    const itemAnims = useRef(BURST_ITEMS.map(() => new Animated.Value(0))).current;
    const infoAnim = useRef(new Animated.Value(0)).current;
    const orbPress = useRef(new Animated.Value(0)).current;
    const [layerSize, setLayerSize] = useState({ w: width, h: height }); // real size of the full-screen bloom layer

    // 🔮 Floating "latest message" toast (only shows when everything is closed)
    const [toastText, setToastText] = useState("");
    const toastAnim = useRef(new Animated.Value(0)).current;
    const lastToastIdRef = useRef<string | null>(null);

    useEffect(() => {
        isCallingRef.current = isCalling;
    }, [isCalling]);

    // ✨ Unread dot on chat when a new user message arrives while chat is closed
    useEffect(() => {
        if (messages.length > prevMsgLenRef.current && prevMsgLenRef.current !== 0 && !chatVisible) {
            const latest = messages[0];
            if (latest && !latest.isSystem) setChatUnread(true);
        }
        prevMsgLenRef.current = messages.length;
    }, [messages]);

    // 🔮 Toast for newest message
    useEffect(() => {
        const m = messages[0];
        if (!m) return;
        if (lastToastIdRef.current === null) { lastToastIdRef.current = m.id; return; }
        if (m.id === lastToastIdRef.current) return;
        lastToastIdRef.current = m.id;
        if (m.isSystem) return;
        setToastText(m.isGift ? m.text : `${m.senderName}: ${m.text}`);
        Animated.sequence([
            Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
            Animated.delay(3200),
            Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
    }, [messages]);

    // 🔥 GAME FEATURE STATE
    const [gameVisible, setGameVisible] = useState(false);
    const [glassPathVisible, setGlassPathVisible] = useState(false); // 🔥 NEW: GLASS PATH STATE
    const [myWalletBalance, setMyWalletBalance] = useState(0);

    // 🔥 NEW: DISCLAIMER MODAL STATES FOR PLAY STORE SAFETY 🔥
    const [disclaimerVisible, setDisclaimerVisible] = useState(false);
    const [disclaimerChecked, setDisclaimerChecked] = useState(false);
    const [pendingGameType, setPendingGameType] = useState<'reflex' | 'memory' | null>(null);

    // 🔥 FIX: Use refs to avoid stale closure issues during Graceful Exit
    const gameVisibleRef = useRef(false);
    
    useEffect(() => { gameVisibleRef.current = gameVisible; }, [gameVisible]);

    // 🔥 Trial Check Reference
    const hasTrialMinsRef = useRef(false);
    
    // 🔥 NEW: Graceful Exit Reference
    const isClosingRef = useRef(false);

    // 🔥 SATTI FIX: THE ULTIMATE SMART REFLEX ENGINE SYNC EXIT 🔥
    const handleRoomEnded = async () => {
        if (isClosingRef.current || isCallingRef.current || navigatingToCallRef.current) return;

        isClosingRef.current = true;
        leaveChannel(); // Safely disconnect Agora so video/audio stops immediately

        // 🆕 FREE-TO-PLAY UPDATE: Frontend auto-refund block removed.
        // Games are free now, so there is no entry fee to refund and no wallet change happens here.

        // 🔥 SATTI FIX: GAME WAITING LOGIC REMOVED! INSTANT EXIT & CLOSE ALL MODALS 🔥
        setExitMessage("Host left the broadcast. Exiting... 🚀");
        setIsLiveEndedWaiting(true); // Lock the screen
        
        // 🔥 Force close modals and WAIT 500ms before showing Alert! 🔥
        setGameVisible(false); // Instantly close the game modal
        setGlassPathVisible(false); // 🔥 Close Glass Path modal
        setShowGiftModal(false);
        setDisclaimerVisible(false); // Close disclaimer if open
        setChatVisible(false); // ✨ Close chat panel
        setShowProSettings(false); // ✨ Close beauty panel
        closeMenu(); // 🔮 Collapse the orb menu
        setActiveGrandGift(null);
        setShowBusyStatus(false);
        
        setTimeout(() => {
            Alert.alert(
                "Broadcast Concluded", 
                "Host has left the broadcast. See you next time! 🚀", 
                [{ text: "OK", onPress: () => handleBackNavigation() }],
                { cancelable: false }
            );
        }, 500);

        // Auto-navigate back after 3.5 seconds just in case user ignores Alert
        setTimeout(() => handleBackNavigation(), 3500); 
    };

    // 🔥 Check User Trial Status on Load
    useEffect(() => {
        const fetchTrialStatus = async () => {
            if (auth.currentUser) {
                try {
                    const uSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
                    if (uSnap.exists()) {
                        const data = uSnap.data();
                        if (data.freeMinsRemaining && data.freeMinsRemaining > 0) {
                            hasTrialMinsRef.current = true;
                        } else {
                            hasTrialMinsRef.current = false;
                        }
                    }
                } catch (e) {}
            }
        };
        fetchTrialStatus();
    }, []);

    // 🌀 ANIMATION REFS
    const giftAnim = useRef(new Animated.Value(0)).current;
    const blinkAnim = useRef(new Animated.Value(0.4)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current; 
    // ✨ PREMIUM ANIMATION REFS
    const introAnim = useRef(new Animated.Value(0)).current;
    const driftAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(blinkAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                Animated.timing(blinkAnim, { toValue: 0.4, duration: 800, useNativeDriver: true })
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: -1, duration: 100, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
                Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
                Animated.delay(1500)
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();

        // ✨ Intro entrance (orb pops in)
        Animated.spring(introAnim, { toValue: 1, friction: 6, tension: 50, useNativeDriver: true }).start();

        // ✨ Slow aurora drift for background orbs
        Animated.loop(
            Animated.sequence([
                Animated.timing(driftAnim, { toValue: 1, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(driftAnim, { toValue: 0, duration: 7000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();
    }, []);

    const rotation = shakeAnim.interpolate({
        inputRange: [-1, 1],
        outputRange: ['-6deg', '6deg']
    });

    const checkBlockStatus = async () => {
        if (!auth.currentUser || !liveId) return false;
        try {
            const liveRef = doc(db, "lives", liveId);
            const liveSnap = await getDoc(liveRef);
            if (!liveSnap.exists()) return false;
            
            const expertId = liveSnap.data().hostId;
            const expertRef = doc(db, "users", expertId);
            const expertSnap = await getDoc(expertRef);
            
            const blockedList = expertSnap.data()?.blockedUsers || [];
            if (blockedList.includes(auth.currentUser.uid)) {
                Alert.alert("Access Denied", "You are not allowed to join this session.");
                handleBackNavigation();
                return true;
            }
            return false;
        } catch (e) {
            console.log("Block check error:", e);
            return false;
        }
    };

    const joinLiveLogic = async () => {
        if (!auth.currentUser || !liveId) return;

        const isBlocked = await checkBlockStatus();
        if (isBlocked) return;

        const viewerRef = doc(db, "lives", liveId, "activeViewers", auth.currentUser.uid);
        const userProfileRef = doc(db, "users", auth.currentUser.uid);

        try {
            const viewerSnap = await getDoc(viewerRef);
            
            if (!viewerSnap.exists()) {
                const userSnap = await getDoc(userProfileRef);
                let currentUserPic = auth.currentUser?.photoURL || ""; 
                let currentUserName = auth.currentUser?.displayName || "User";

                if (userSnap.exists()) {
                    const uData = userSnap.data();
                    currentUserPic = uData.profilePic || currentUserPic;
                    currentUserName = uData.name || currentUserName;
                    setUserData(uData);
                }

                await setDoc(viewerRef, {
                    uid: auth.currentUser?.uid,
                    name: currentUserName,
                    profilePic: currentUserPic, 
                    joinedAt: serverTimestamp()
                }, { merge: true });
                
                await updateDoc(doc(db, "lives", liveId), { viewerCount: increment(1) });

                await addDoc(collection(db, "lives", liveId, "messages"), {
                    text: `${currentUserName} joined the session 🙌`,
                    senderName: "System",
                    senderId: "system_msg",
                    timestamp: serverTimestamp(),
                    isSystem: true
                });
            } else {
                const userSnap = await getDoc(userProfileRef);
                if (userSnap.exists()) setUserData(userSnap.data());
            }
        } catch (e) { console.log("Join error:", e); }
    };

    const leaveLiveLogic = async () => {
        if (!auth.currentUser || !liveId) return;
        const viewerRef = doc(db, "lives", liveId, "activeViewers", auth.currentUser.uid);
        const liveDocRef = doc(db, "lives", liveId);
        const currentUserName = userData?.name || auth.currentUser?.displayName || "User";

        try {
            const viewerSnap = await getDoc(viewerRef);
            if (viewerSnap.exists()) {
                await deleteDoc(viewerRef);
                await addDoc(collection(db, "lives", liveId, "messages"), {
                    text: `${currentUserName} left the session 👋`,
                    senderName: "System",
                    senderId: "system_msg",
                    timestamp: serverTimestamp(),
                    isSystem: true
                });
                const liveSnap = await getDoc(liveDocRef);
                if (liveSnap.exists() && (liveSnap.data().viewerCount || 0) > 0) {
                    await updateDoc(liveDocRef, { viewerCount: increment(-1) });
                }
            }
        } catch (e) { console.log("Leave cleanup error:", e); }
    };

    useEffect(() => {
        isMounted.current = true;
        
        if (liveId && auth.currentUser && isFocused) { 
            // 🔥 SATTI FIX: RESET EXIT STATES ON RE-entry 🔥
            setIsLiveEndedWaiting(false);
            setExitMessage("");
            isClosingRef.current = false;

            setupAgora();
            const unsubListeners = listenToStreamData();
            const unsubCallRequest = listenToCallRequest();
            const unsubBlockRealtime = listenToBlockRealtime();
            const unsubPresence = listenToPresence(); // 🔥 NEW: RTDB PRESENCE LISTENER ADDED
            
            // 🌍 GLOBAL SYNC: Wallet Balance Listener
            const unsubWallet = onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
                if (docSnap.exists() && isMounted.current) {
                    const freshData = docSnap.data();
                    setUserData(freshData); // Update complete user data for calls
                    setMyWalletBalance(freshData.balance || 0); 
                }
            });
            
            joinLiveLogic();

            return () => {
                isMounted.current = false;
                leaveLiveLogic(); 
                unsubListeners(); 
                unsubCallRequest();
                unsubBlockRealtime();
                unsubPresence(); // 🔥 NEW: CLEANUP RTDB LISTENER
                unsubWallet();
                leaveChannel();
            };
        }
    }, [liveId, isFocused]);

    const listenToBlockRealtime = () => {
        if (!auth.currentUser || !liveId) return () => {};
        
        let unsubExpert: (() => void) | null = null;

        const unsubLive = onSnapshot(doc(db, "lives", liveId), (liveSnap) => {
            if (liveSnap.exists() && isMounted.current) {
                const expertId = liveSnap.data().hostId;
                
                if (unsubExpert) unsubExpert();

                unsubExpert = onSnapshot(doc(db, "users", expertId), (expertSnap) => {
                    const blockedList = expertSnap.data()?.blockedUsers || [];
                    
                    if (blockedList.includes(auth.currentUser?.uid)) {
                        if (unsubExpert) unsubExpert();
                        unsubLive();

                        Alert.alert(
                            "Blocked", 
                            "You are not allowed to view this session.",
                            [{ text: "OK", onPress: () => handleBackNavigation() }],
                            { cancelable: false }
                        );
                    }
                });
            }
        });

        return () => {
            unsubLive();
            if (unsubExpert) unsubExpert();
        };
    };

    // 🔥 SATTI FIX: RTDB PRESENCE LISTENER ADDED HERE 🔥
    const listenToPresence = () => {
        if (!liveId) return () => {};
        
        const rtdb = getDatabase();
        const livePresenceRef = ref(rtdb, `presence_lives/${liveId}`);

        const unsubPresence = onValue(livePresenceRef, (snap) => {
            const status = snap.val();
            
            // 🔥 CRITICAL FIX: Firestore miss aanalum, RTDB-la status "ended" nu marunale Host app-a kill pannittar-nu artham!
            if (status === 'ended') {
                if (isMounted.current && !isCallingRef.current && !navigatingToCallRef.current && !isClosingRef.current) {
                    console.log("Host disconnected or app killed! Triggering graceful exit...");
                    handleRoomEnded();
                }
            }
        });

        return unsubPresence;
    };

    // 🔥 UPDATED AGORA SETUP
    const setupAgora = async () => {
        try {
            if (engine.current) return; 

            engine.current = createAgoraRtcEngine();
            const rtcEngine = engine.current;
            rtcEngine.initialize({ appId: AGORA_APP_ID });
            rtcEngine.enableVideo();
            
            rtcEngine.registerEventHandler({
                onJoinChannelSuccess: () => { 
                    if (isMounted.current) setJoined(true); 
                },
                onUserJoined: (connection, uid) => { 
                    if (isMounted.current) setHostUid(uid); 
                },
                onUserOffline: () => {
                    if (isMounted.current && !isCallingRef.current && !navigatingToCallRef.current) {
                        // 🔥 SATTI FIX: EXPERT NETWORK DROP AANA / APP MINIMIZE PANNA UDANE USER KICK AAGA KOODATHU! 🔥
                        // Just setHostUid(0) to show reconnecting UI. Firestore status thaan source of truth!
                        setHostUid(0); 
                    }
                },
            });

            rtcEngine.joinChannel('', liveId, 0, {
                clientRoleType: ClientRoleType.ClientRoleAudience,
                channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
            });
        } catch (e) { 
            console.error("Agora Setup error =>", e); 
        }
    };

    // 🔥 UPDATED STREAM LISTENER
    const listenToStreamData = () => {
        const q = query(collection(db, "lives", liveId, "messages"), orderBy("timestamp", "desc"));
        const unsubChat = onSnapshot(q, (snap) => setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
        
        const unsubDoc = onSnapshot(doc(db, "lives", liveId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.status === 'ended') {
                    if (!isCallingRef.current && !navigatingToCallRef.current) {
                        handleRoomEnded();
                    }
                    return;
                }
                setViewerCount(data.viewerCount || 0);
                setHostName(data.hostName || data.displayName || "Host"); 
                setHostImage(data.hostImage || data.profilePic || "");
                setHostLevel(data.levelTitle || data.currentLevel || "L0"); 
                setCallRate(data.pricePerMin || 0);
                setHostFirestoreId(data.hostId || null);
            }
        });

        const unsubGifts = onSnapshot(collection(db, "lives", liveId, "gifts"), (snap) => {
            snap.docChanges().forEach((change) => {
                if (change.type === "added") {
                    const data = change.doc.data();
                    // 🔥 SATTI FIX: Changed condition to >= 100 so Cake (500) and Chocolate (100) will also display the overlay!
                    if (data.amount >= 100) {
                        setActiveGrandGift(data);
                    }
                }
            });
        });

        return () => { unsubChat(); unsubDoc(); unsubGifts(); };
    };

    // 🔥 UPDATED CALL LISTENER WITH EXPERT NAME FLASH FIX 🔥
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
                    // 🔥 Clear 10-second auto-cut timer if call is accepted
                    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);

                    navigatingToCallRef.current = true;
                    
                    unsub(); 
                    setIsCalling(false);
                    isCallingRef.current = false;
                    
                    leaveChannel(); 
                    leaveLiveLogic();

                    // 🔥 SATTI FIX: Passing exact Host Name and Image to prevent the "Expert" flash bug! 🔥
                    router.push({
                        pathname: "/videocall" as any,
                        params: { 
                            callId: change.id, 
                            role: 'user',
                            expertName: callData.expertName || hostName || "Host", 
                            expertImage: callData.expertImage || hostImage || "",
                            isFreeTrial: hasTrialMinsRef.current ? "true" : "false" 
                        }
                    });
                } else if (callData.status === "rejected" && isRecent) {
                    // 🔥 Clear 10-second auto-cut timer if call is rejected by host
                    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);

                    setIsCalling(false);
                    isCallingRef.current = false;

                    // 🔥 FIX: Host Decline pannaalum, busy aanaalum user ku overlay kaattanum
                    setShowBusyStatus(true);
                    setTimeout(() => setShowBusyStatus(false), 4000);

                    if (hostFirestoreId) {
                        const expertRef = doc(db, "users", hostFirestoreId);
                        const expertSnap = await getDoc(expertRef);

                        // Public live chat message: host nijama vera call la irundha mattum
                        if (expertSnap.exists() && expertSnap.data().isBusy === true) {
                            await addDoc(collection(db, "lives", liveId, "messages"), {
                                text: `${hostName} is currently on another call. Please try later.`,
                                senderName: "System",
                                senderId: "system_msg",
                                timestamp: serverTimestamp(),
                                isSystem: true
                            });
                        }
                    }
                }
            }
        });

        return unsub;
    };

    // 🔥 SATTI FIX: ROBUST CALL INITIATOR WITH 10 SECONDS AUTO CUT 🔥
    const handleCallButtonPress = async () => {
        if (!hostFirestoreId || !auth.currentUser) return;
        if (isCalling) return;

        // 👇👇 Satti's Permission Check Added Here 👇👇
        const hasPermission = await checkAndRequestCallPermissions();
        if (!hasPermission) {
            return; // If permission denied, do not proceed with call request
        }
        // 👆👆 -------------------------------------- 👆👆

        try {
            setIsCalling(true);
            isCallingRef.current = true; 

            // Force Fetch latest user profile to ensure picture/name is 100% there
            let verifiedUserName = auth.currentUser.displayName || "User";
            let verifiedUserPic = auth.currentUser.photoURL || "";
            
            const userProfileRef = doc(db, "users", auth.currentUser.uid);
            const userSnap = await getDoc(userProfileRef);
            
            if (userSnap.exists()) {
                const freshData = userSnap.data();
                verifiedUserName = freshData.name || verifiedUserName;
                verifiedUserPic = freshData.profilePic || verifiedUserPic;
            }

            const callRef = await addDoc(collection(db, "calls"), {
                userId: auth.currentUser.uid,
                userName: verifiedUserName,
                userImage: verifiedUserPic,
                expertId: hostFirestoreId,
                expertName: hostName, 
                expertImage: hostImage, 
                status: "pending",
                createdAt: serverTimestamp(),
                pricePerMin: callRate,
                type: "video"
            });
            
            setCallRequestId(callRef.id);

            // 🔥 SATTI FIX: 10 SECONDS AUTO CUT LOGIC 🔥
            callTimeoutRef.current = setTimeout(async () => {
                try {
                    const checkCallSnap = await getDoc(doc(db, "calls", callRef.id));
                    if (checkCallSnap.exists()) {
                        const callData = checkCallSnap.data();
                        
                        // If it's still pending after 10 seconds, force cancel it
                        if (callData.status === "pending" || callData.status === "ringing") {
                            await updateDoc(doc(db, "calls", callRef.id), { status: "missed" });
                            setIsCalling(false);
                            isCallingRef.current = false;
                            Alert.alert("No Answer", "The host is currently unavailable. Try again later.");
                        }
                    }
                } catch (e) {
                    console.log("Auto-cut error:", e);
                }
            }, 10000); // 10000 ms = 10 Seconds

        } catch (error) {
            setIsCalling(false);
            isCallingRef.current = false; 
            Alert.alert("Error", "Could not initiate call request.");
        }
    };

    const triggerGiftAnim = () => {
        Animated.sequence([
            Animated.timing(giftAnim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.back(1.5) }),
            Animated.delay(2500),
            Animated.timing(giftAnim, { toValue: 0, duration: 400, useNativeDriver: true })
        ]).start();
    };

    const sendGift = async (name: string, price: number) => {
        if (!auth.currentUser) return;

        try {
            const userRef = doc(db, "users", auth.currentUser.uid);
            const userSnap = await getDoc(userRef);

            if (userSnap.exists()) {
                const uData = userSnap.data();
                const currentBalance = uData.balance || 0; 

                if (currentBalance < price) {
                    Alert.alert("Insufficient Balance", "Please recharge your wallet to send this reward.");
                    return;
                }

                await updateDoc(userRef, { 
                    balance: increment(-price) 
                });

                await addDoc(collection(db, "lives", liveId, "gifts"), {
                    giftName: name, 
                    amount: price, 
                    senderName: uData.name || "Premium User", 
                    senderId: auth.currentUser?.uid,
                    timestamp: serverTimestamp()
                });

                // 🔥 SATTI FIX: ROYAL VIP GIFT MESSAGE TO CHAT 🔥
                await addDoc(collection(db, "lives", liveId, "messages"), {
                    uid: "system_gift",
                    name: "System",
                    text: `🎁 ${uData.name || "Premium User"} sent a ${name}!`,
                    timestamp: serverTimestamp(),
                    isGift: true 
                }).catch(e => console.log(e));

                setGiftAlert(`You sent ${name}! 💎`);
                setShowGiftModal(false);
                triggerGiftAnim();
                setTimeout(() => setGiftAlert(null), 3000);
            }
        } catch (error) {
            console.error("Gift error:", error);
            Alert.alert("Error", "Failed to send reward. Please try again.");
        }
    };

    const sendMessage = async () => {
        if (inputText.trim() === '' || !liveId) return;
        const text = inputText; setInputText('');
        const expertRef = doc(db, "users", hostFirestoreId || "");
        const expertSnap = await getDoc(expertRef);
        const blockedList = expertSnap.data()?.blockedUsers || [];
        
        if (blockedList.includes(auth.currentUser?.uid)) {
            Alert.alert("Error", "Blocked users cannot send messages.");
            return;
        }

        await addDoc(collection(db, "lives", liveId, "messages"), {
            text: text, 
            senderName: userData?.name || auth.currentUser?.displayName || "User", 
            senderId: auth.currentUser?.uid,
            timestamp: serverTimestamp(), 
            isHost: false
        });
    };

    const addReaction = () => {
        const newReaction = { id: Date.now(), x: Math.random() * (width - 150) + 75 };
        setReactions((prev) => [...prev, newReaction]);
        setTimeout(() => {
            setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
        }, 3000);
    };

    // 🔥 NEW: USER CLICK HANDLER FROM CHAT 🔥
    const handleUserClick = (userItem: any, isFromChat = false) => {
        const normalizedUser = {
            id: isFromChat ? userItem.senderId : userItem.id,
            name: isFromChat ? userItem.senderName : userItem.name,
            image: isFromChat ? null : (userItem.photoURL || userItem.profilePic)
        };
        if (normalizedUser.id === auth.currentUser?.uid) return; 
        setSelectedUser(normalizedUser);
        setActionSheetVisible(true);
    };

    // 🔥 NEW: BLOCK LOGIC FOR USER SIDE 🔥
    const handleBlockUser = async (showAlert = true) => {
        if (!selectedUser || !auth.currentUser) return;
        try {
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                blockedUsers: arrayUnion(selectedUser.id)
            });
            if (showAlert) Alert.alert("Blocked", `${selectedUser.name} has been permanently blocked.`);
        } catch (e) { console.log(e); }
        setActionSheetVisible(false);
    };

    // 🔥 NEW: REPORT MODAL TRIGGER 🔥
    const handleReportUser = () => {
        setActionSheetVisible(false); 
        setTimeout(() => {
            setReportSheetVisible(true); 
        }, 300); 
    };

    // 🔥 NEW: SUBMIT ACTUAL REPORT TO ADMIN & TRIGGER BLOCK 🔥
    const submitReport = async (reason: string) => {
        if (!selectedUser) return;
        try {
            await addDoc(collection(db, "reports"), {
                reportedUserId: selectedUser.id,
                reportedUserName: selectedUser.name,
                reportedBy: auth.currentUser?.uid,
                reason: reason,
                timestamp: serverTimestamp(),
                liveId: liveId
            });
            
            await handleBlockUser(false);
            
            Alert.alert("Reported & Blocked", `User reported to Admin for: ${reason} and has been removed.`);
        } catch (e) { console.log(e); }
        setReportSheetVisible(false);
    };

    // 🔥 NEW: MUTE TOGGLE FUNCTION 🔥
    const toggleMute = () => {
        engine.current?.muteAllRemoteAudioStreams(!isMuted); 
        setIsMuted(!isMuted);
    };

    // 🔥 NEW: BEAUTY FILTER FUNCTION 🔥
    const updatePro = (type: 'light' | 'smooth', val: number) => {
        const newLevels = { ...ProLevel, [type]: val };
        setProLevel(newLevels);
        engine.current?.setBeautyEffectOptions(true, {
            lighteningContrastLevel: LighteningContrastLevel.LighteningContrastNormal,
            lighteningLevel: newLevels.light,
            smoothnessLevel: newLevels.smooth,
            rednessLevel: 0.5,
            sharpnessLevel: 0.3
        });
        setIsProEnabled(true);
    };

    const leaveChannel = () => { 
        if (engine.current) {
            engine.current.leaveChannel(); 
            engine.current.release(); 
            engine.current = null;
            setJoined(false); 
            setHostUid(0); 
        }
    };

    const handleBackNavigation = async () => {
        await leaveLiveLogic(); 
        if (router.canGoBack()) router.back();
        else router.replace('/');
    };

    // 🔮 ORB MENU: OPEN (bloom out) / CLOSE (suck back into the orb)
    const openMenu = () => {
        setMenuOpen(true);
        setMenuMounted(true);
        Animated.parallel([
            Animated.spring(infoAnim, { toValue: 1, friction: 7, tension: 80, useNativeDriver: true }),
            Animated.stagger(
                35,
                itemAnims.map(v => Animated.spring(v, { toValue: 1, friction: 7, tension: 85, useNativeDriver: true }))
            ),
        ]).start();
    };

    const closeMenu = () => {
        setMenuOpen(false);
        Animated.parallel([
            Animated.timing(infoAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.stagger(
                18,
                itemAnims.map(v => Animated.timing(v, { toValue: 0, duration: 190, easing: Easing.in(Easing.quad), useNativeDriver: true }))
            ),
        ]).start(({ finished }) => {
            if (finished) setMenuMounted(false);
        });
    };

    // 🔮 Open one in-place panel at a time (menu collapses first so nothing overlaps)
    const openPanel = (panel: 'chat' | 'beauty') => {
        closeMenu();
        setChatVisible(panel === 'chat');
        setShowProSettings(panel === 'beauty');
        if (panel === 'chat') setChatUnread(false);
    };

    const onOrbPress = () => {
        if (chatVisible || showProSettings) {
            setChatVisible(false);
            setShowProSettings(false);
            return;
        }
        if (menuOpen) closeMenu();
        else openMenu();
    };

    // 🔥 SATTI FIX: Synced Highest Balance check for accurate Level display!
    const userDiamonds = userData?.totalSpentDiamonds || 0;
    const userTier = calculateUserLevel(userDiamonds);
    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });

    // ✨ Orb transforms
    const orbFloat = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -4] });
    const orbOpenScale = infoAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
    const orbPressScale = orbPress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.9] });
    const driftX = driftAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 50] });
    const giftPopRotateX = giftAnim.interpolate({ inputRange: [0, 1], outputRange: ['-70deg', '0deg'] });

    // 🔮 Orb geometry (respects the phone's bottom safe area)
    const orbBottom = Math.max(insets.bottom, 10) + 10;
    const layerH = layerSize.h;
    const layerW = layerSize.w;
    const CX = layerW / 2;
    const CY = layerH - orbBottom - ORB / 2;
    const panelBottom = orbBottom + ORB + 14;
    const chatPanelH = Math.min(height * 0.42, 340);
    const panelOpen = chatVisible || showProSettings;
    const orbIdle = !menuOpen && !panelOpen;

    // 🔮 Host name board sits at the very TOP of the phone; the two button columns run top -> bottom below it
    const infoCardW = Math.min(layerW - 32, 300);
    const infoTop = insets.top + 10;
    const colTop = infoTop + INFO_CARD_H + 18 + ITEM / 2;        // centre of the first (top) button
    const colBottom = Math.max(CY, colTop + 3 * 70);              // centre of the last (bottom) button, level with the orb
    const colStep = (colBottom - colTop) / 3;                     // equal spacing
    const burstPos = (it: { side: 'left' | 'right', row: number }) => ({
        tx: (it.side === 'left' ? EDGE_PAD + ITEM / 2 : layerW - EDGE_PAD - ITEM / 2) - CX,
        ty: colTop + it.row * colStep - CY,
    });

    // 🔥 ALTERNATING BORDER STYLES (FLUID, 2px)
    const borderType1 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: userTier.color,
        borderRightColor: userTier.color,
        borderTopColor: withAlpha(userTier.secondaryColor, 0.5),
        borderBottomColor: withAlpha(userTier.secondaryColor, 0.5),
    };

    const borderType2 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: userTier.secondaryColor,
        borderRightColor: userTier.secondaryColor,
        borderTopColor: withAlpha(userTier.color, 0.5),
        borderBottomColor: withAlpha(userTier.color, 0.5),
    };

    // ✨ CHAT ROW RENDERER (used inside the chat panel)
    const renderChatItem = ({ item, index }: { item: any, index: number }) => {
        // 🔥 SATTI FIX: ROYAL GIFT MESSAGE RENDER IN CHAT 🔥
        if (item.isGift) {
            return (
                <ChatPop style={styles.chatPopWrap}>
                    <LinearGradient 
                        colors={['rgba(245, 158, 11, 0.3)', 'rgba(236, 72, 153, 0.3)']} 
                        start={{x:0, y:0}} end={{x:1, y:1}} 
                        style={styles.giftChatBubble}
                    >
                        <Text style={styles.giftChatText}>{item.text}</Text>
                    </LinearGradient>
                </ChatPop>
            );
        }

        // Normal System Message (Join/Leave)
        if (item.isSystem) {
            return (
                <ChatPop style={styles.chatPopWrap}>
                    <View style={[styles.chatBubble, { backgroundColor: 'rgba(16, 185, 129, 0.16)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6 }]}>
                        <Text style={[styles.chatText, { color: '#93C5FD', fontWeight: 'bold', flexShrink: 1 }]}>{item.text}</Text>
                    </View>
                </ChatPop>
            );
        }

        // Normal User Message (🔥 CLICKABLE TO OPEN PROFILE 🔥)
        const msgBorder = index % 2 === 0 ? borderType1 : borderType2;
        return (
            <ChatPop style={styles.chatPopWrap}>
                <TouchableOpacity activeOpacity={0.8} onPress={() => handleUserClick(item, true)} style={[styles.chatBubble, styles.chatBubbleRow, msgBorder]}>
                    <LinearGradient colors={[userTier.color, userTier.secondaryColor]} style={styles.chatInitial}>
                        <Text style={styles.chatInitialText}>{(item.senderName || "U").charAt(0).toUpperCase()}</Text>
                    </LinearGradient>
                    <Text style={[styles.chatName, { flexShrink: 1 }]}>{item.senderName}: <Text style={styles.chatMessage}>{item.text}</Text></Text>
                </TouchableOpacity>
            </ChatPop>
        );
    };

    // 🔮 Bloom item config: icon, color, label, action
    const burstConfig: Record<string, { color: string, label: string, active?: boolean, disabled?: boolean, badge?: boolean, onPress: () => void, icon: React.ReactNode }> = {
        exit: {
            color: '#EF4444', label: 'Exit',
            onPress: handleBackNavigation,
            icon: <Ionicons name="power" size={20} color="#FFF" />,
        },
        mute: {
            color: '#38BDF8', label: isMuted ? 'Muted' : 'Mute', active: isMuted, disabled: isLiveEndedWaiting,
            onPress: toggleMute,
            icon: <Ionicons name={isMuted ? "volume-mute" : "volume-medium"} size={21} color="#FFF" />,
        },
        beauty: {
            color: '#EC4899', label: 'Beauty', disabled: isLiveEndedWaiting,
            onPress: () => openPanel('beauty'),
            icon: <MaterialCommunityIcons name="face-man-shimmer" size={22} color="#FFF" />,
        },
        memory: {
            color: '#A855F7', label: 'Memory',
            onPress: () => { closeMenu(); setPendingGameType('memory'); setDisclaimerVisible(true); },
            icon: (
                <View style={{ width: 24, height: 24, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 9 }}>🍎</Text>
                    <Text style={{ fontSize: 9 }}>🍌</Text>
                    <Text style={{ fontSize: 9 }}>🍇</Text>
                    <Text style={{ fontSize: 9 }}>🍓</Text>
                </View>
            ),
        },
        reflex: {
            color: '#00EAFF', label: 'Reflex',
            onPress: () => { closeMenu(); setPendingGameType('reflex'); setDisclaimerVisible(true); },
            icon: (
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
            ),
        },
        chat: {
            color: userTier.color, label: 'Chat', badge: chatUnread,
            onPress: () => openPanel('chat'),
            icon: <Ionicons name="chatbubbles" size={21} color="#FFF" />,
        },
        gift: {
            color: '#F59E0B', label: 'Gift',
            onPress: () => { closeMenu(); setShowGiftModal(true); },
            icon: <FontAwesome5 name="gift" size={18} color="#FFF" />,
        },
        call: {
            color: '#10B981', label: isCalling ? 'Calling' : `Call ${callRate}💎`, active: isCalling,
            onPress: () => { closeMenu(); handleCallButtonPress(); },
            icon: isCalling ? <ActivityIndicator size="small" color="#FFF" /> : <Ionicons name="videocam" size={22} color="#FFF" />,
        },
    };

    return (
        <View style={styles.container}>
            {/* 🔥 SATTI FIX: KEYBOARD AVOIDING VIEW WRAPS ENTIRE SCREEN 🔥 */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                
                {/* BACKGROUND ELEMENTS */}
                <LinearGradient colors={userTier.themeBg as any} style={StyleSheet.absoluteFill} />
                <Animated.View style={[styles.shimmerOrb, { top: 100, left: -60, backgroundColor: userTier.color, transform: [{ translateY: orbTranslateY }, { translateX: driftX }] }]} />
                <Animated.View style={[styles.shimmerOrb, { bottom: 200, right: -60, backgroundColor: userTier.secondaryColor, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }, { translateX: Animated.multiply(driftX, -1) }] }]} />
                <Animated.View style={[styles.shimmerOrb, { top: height * 0.35, left: width * 0.2, width: 260, height: 260, borderRadius: 130, opacity: 0.1, backgroundColor: '#A855F7', transform: [{ translateY: orbTranslateY }] }]} />

                {/* VIDEO CONTAINER (100% CLEAN FULL SCREEN, no dark overlays) */}
                <View style={styles.videoContainer}>
                    {isFocused && joined && hostUid !== 0 ? (
                        <RtcSurfaceView 
                            key={hostUid} 
                            canvas={{ uid: hostUid }} 
                            style={styles.fullVideo} 
                            connection={{ channelId: liveId }} 
                        />
                    ) : (
                        <LinearGradient colors={['rgba(15,23,42,0.5)', 'rgba(30,41,59,0.5)']} style={styles.loadingContainer}>
                            <View style={styles.pulseWrap}>
                                <PulseRings color={userTier.color} size={110} />
                                <SpinRing size={96} colors={[userTier.color, userTier.secondaryColor, '#FFFFFF', userTier.color]} speed={3500}>
                                    {hostImage ? (
                                        <Image source={{ uri: hostImage }} style={{ width: 90, height: 90, borderRadius: 45 }} />
                                    ) : (
                                        <ActivityIndicator size="large" color={userTier.color} />
                                    )}
                                </SpinRing>
                            </View>
                            <Text style={[styles.loadingText, { color: userTier.color }]}>Connecting to {hostName}...</Text>
                            <ActivityIndicator size="small" color={userTier.color} style={{ marginTop: 14 }} />
                        </LinearGradient>
                    )}
                </View>

                {/* INVISIBLE EXIT SHIELD */}
                {isLiveEndedWaiting && (
                    <View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, elevation: 9999, backgroundColor: 'transparent' }]} onStartShouldSetResponder={() => true}>
                        <View style={{ position: 'absolute', top: height * 0.15, width: '100%', alignItems: 'center' }}>
                            <View style={{ backgroundColor: 'rgba(239,68,68,0.95)', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 25, borderWidth: 2, borderColor: '#FFF', shadowColor: '#000', shadowRadius: 10, shadowOpacity: 0.8, elevation: 15 }}>
                                <Text style={{ color: '#FFF', fontWeight: '900', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>
                                    {exitMessage || "Closing session..."}
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                <SafeAreaView style={StyleSheet.absoluteFill} edges={[]} pointerEvents="box-none">

                    {showBusyStatus && (
                        <View style={styles.busyOverlay}>
                            <BlurView intensity={90} tint="dark" style={[styles.busyCard, borderType1]}>
                                <View style={[styles.busyIconCircle, { backgroundColor: withAlpha(userTier.secondaryColor, 0.19) }]}>
                                    <PulseRings color={userTier.color} size={80} />
                                    <Ionicons name="time" size={32} color={userTier.color} />
                                </View>
                                <Text style={styles.busyTitle}>Host is Engaged</Text>
                                <Text style={styles.busySub}>The host is currently busy. Please try again in a few minutes.</Text>
                            </BlurView>
                        </View>
                    )}

                    <Animated.View style={[styles.giftNotify, { top: insets.top + 12, opacity: giftAnim, transform: [{ perspective: 800 }, { rotateX: giftPopRotateX }, { scale: giftAnim }] }]}>
                        <LinearGradient colors={[userTier.color, userTier.secondaryColor]} style={styles.giftPop}>
                            <FontAwesome5 name="gem" size={20} color="#FFF" />
                            <Text style={styles.giftPopText} numberOfLines={1}>{giftAlert}</Text>
                        </LinearGradient>
                    </Animated.View>

                    {reactions.map((r) => (
                        <FloatingHeart key={r.id} x={r.x} />
                    ))}

                    {/* 🔮 NEW LATEST-MESSAGE TOAST (only when everything is closed) */}
                    {orbIdle && (
                        <Animated.View pointerEvents="none" style={[styles.toastWrap, { bottom: panelBottom - 4, opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }]}>
                            <View style={[styles.toastPill, { borderColor: withAlpha(userTier.color, 0.7) }]}>
                                <Ionicons name="chatbubble-ellipses" size={13} color={userTier.color} />
                                <Text style={styles.toastText} numberOfLines={1}>{toastText}</Text>
                            </View>
                        </Animated.View>
                    )}

                    {/* 🔮 IN-PLACE CHAT PANEL (grows out of the orb, never a Modal) */}
                    <MagicPanel visible={chatVisible} style={[styles.panelWrap, { bottom: panelBottom }]}>
                        <LinearGradient colors={[userTier.color, userTier.secondaryColor, userTier.color]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.panelBorder, { height: chatPanelH }]}>
                            <BlurView intensity={55} tint="dark" style={[styles.panelInner, { flex: 1 }]}>
                                <View style={styles.panelHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                        <Ionicons name="chatbubbles" size={18} color={userTier.color} />
                                        <Text style={styles.panelTitle} numberOfLines={1}>Live Chat</Text>
                                        <View style={styles.chatViewerPill}>
                                            <Ionicons name="eye" size={11} color="#E2E8F0" />
                                            <Text style={styles.chatViewerText}>{viewerCount}</Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity onPress={() => setChatVisible(false)} style={styles.panelCloseBtn}>
                                        <Ionicons name="chevron-down" size={20} color="#FFF" />
                                    </TouchableOpacity>
                                </View>

                                <FlatList
                                    data={messages}
                                    keyExtractor={(item) => item.id}
                                    inverted={true} 
                                    renderItem={renderChatItem}
                                    style={styles.chatList}
                                    contentContainerStyle={{ paddingTop: 8 }}
                                    showsVerticalScrollIndicator={false}
                                />

                                <View style={styles.inputBar}>
                                    <TextInput 
                                        style={[styles.textInput, { borderColor: withAlpha(userTier.color, 0.55) }]} 
                                        placeholder="Chat..." 
                                        placeholderTextColor="#CBD5E1"
                                        value={inputText}
                                        onChangeText={setInputText}
                                        editable={!isLiveEndedWaiting}
                                    />
                                    <GlowOrbButton color={userTier.color} active disabled={isLiveEndedWaiting} onPress={sendMessage} size={46}>
                                        <Ionicons name="paper-plane" size={19} color="#FFF" />
                                    </GlowOrbButton>
                                </View>
                            </BlurView>
                        </LinearGradient>
                    </MagicPanel>

                    {/* 🔮 IN-PLACE BEAUTY PANEL */}
                    <MagicPanel visible={showProSettings} style={[styles.panelWrap, { bottom: panelBottom }]}>
                        <LinearGradient colors={['#EC4899', userTier.color, '#EC4899']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.panelBorder}>
                            <BlurView intensity={55} tint="dark" style={styles.panelInner}>
                                <View style={styles.panelHeader}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                        <MaterialCommunityIcons name="face-man-shimmer" size={20} color="#EC4899" />
                                        <Text style={styles.panelTitle} numberOfLines={1}>Beauty Filter</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setShowProSettings(false)} style={styles.panelCloseBtn}>
                                        <Ionicons name="chevron-down" size={20} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                                <View style={styles.ProSettingsBar}>
                                    <View style={styles.settingGroup}>
                                        <Text style={styles.settingLabel}>BRIGHTNESS</Text>
                                        <View style={styles.chipRow}>
                                            <TouchableOpacity onPress={() => updatePro('light', 0.9)} style={[styles.chip, ProLevel.light === 0.9 && styles.activeChip]}>
                                                <Text style={styles.chipText}>High</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => updatePro('light', 0.4)} style={[styles.chip, ProLevel.light === 0.4 && styles.activeChip]}>
                                                <Text style={styles.chipText}>Low</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                    <View style={styles.settingDivider} />
                                    <View style={styles.settingGroup}>
                                        <Text style={styles.settingLabel}>SMOOTHNESS</Text>
                                        <View style={styles.chipRow}>
                                            <TouchableOpacity onPress={() => updatePro('smooth', 0.9)} style={[styles.chip, ProLevel.smooth === 0.9 && styles.activeChip]}>
                                                <Text style={styles.chipText}>Max</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => updatePro('smooth', 0.3)} style={[styles.chip, ProLevel.smooth === 0.3 && styles.activeChip]}>
                                                <Text style={styles.chipText}>Natural</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </BlurView>
                        </LinearGradient>
                    </MagicPanel>

                    {/* 🔮✨ THE MAGIC ORB + BLOOM LAYER ✨🔮 */}
                    <View style={styles.bloomLayer} pointerEvents="box-none" onLayout={(e) => { const { width: w, height: h } = e.nativeEvent.layout; if (Math.abs(w - layerSize.w) > 0.5 || Math.abs(h - layerSize.h) > 0.5) setLayerSize({ w, h }); }}>

                        {/* 🔮 HOST NAME BOARD: name + LIVE + viewers + level, pinned at the TOP of the phone */}
                        {menuMounted && (
                            <Animated.View
                                pointerEvents="none"
                                style={[
                                    styles.infoCard,
                                    {
                                        width: infoCardW,
                                        left: CX - infoCardW / 2,
                                        top: infoTop,
                                        opacity: infoAnim,
                                        transform: [
                                            { perspective: 700 },
                                            { translateY: infoAnim.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) },
                                            { rotateX: infoAnim.interpolate({ inputRange: [0, 1], outputRange: ['60deg', '0deg'] }) },
                                            { scale: infoAnim },
                                        ],
                                    },
                                ]}
                            >
                                <LinearGradient colors={[userTier.color, userTier.secondaryColor, userTier.color]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.infoBorder}>
                                    <BlurView intensity={60} tint="dark" style={styles.infoInner}>
                                        <SpinRing size={46} colors={[userTier.color, userTier.secondaryColor, '#FFFFFF', userTier.color]} speed={5000}>
                                            {hostImage ? (
                                                <Image source={{ uri: hostImage }} style={{ width: 40, height: 40, borderRadius: 20 }} />
                                            ) : (
                                                <View style={[styles.infoAvatarFallback, { backgroundColor: userTier.color }]}>
                                                    <Text style={styles.placeholderText}>{hostName.charAt(0).toUpperCase()}</Text>
                                                </View>
                                            )}
                                        </SpinRing>
                                        <View style={styles.infoTextCol}>
                                            <Text style={styles.infoName} numberOfLines={1}>{hostName}</Text>
                                            <View style={styles.statusRow}>
                                                <LinearGradient colors={['#EF4444', '#F97316']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.livePill}>
                                                    <PulseDot color="#FFF" size={5} />
                                                    <Text style={styles.livePillText}>LIVE</Text>
                                                </LinearGradient>
                                                <View style={styles.viewerChip}>
                                                    <Ionicons name="eye" size={12} color="#FFF" />
                                                    <Text style={styles.viewerText} numberOfLines={1}>{viewerCount}</Text>
                                                </View>
                                                <View style={styles.levelTag}>
                                                    <FontAwesome5 name="crown" size={8} color="#FFF" />
                                                    <Text style={styles.levelTextTag} numberOfLines={1}>{hostLevel}</Text>
                                                </View>
                                            </View>
                                        </View>
                                    </BlurView>
                                </LinearGradient>
                            </Animated.View>
                        )}

                        {/* Bloom buttons fly out of the orb to the phone edges: 4 on the left, 4 on the right */}
                        {menuMounted && BURST_ITEMS.map((it, i) => {
                            const cfg = burstConfig[it.key];
                            const pos = burstPos(it);
                            return (
                                <BurstItem
                                    key={it.key}
                                    anim={itemAnims[i]}
                                    tx={pos.tx}
                                    ty={pos.ty}
                                    centerX={CX}
                                    centerY={CY}
                                    color={cfg.color}
                                    label={cfg.label}
                                    active={cfg.active}
                                    disabled={cfg.disabled}
                                    badge={cfg.badge}
                                    onPress={cfg.onPress}
                                >
                                    {cfg.icon}
                                </BurstItem>
                            );
                        })}

                        {/* THE ORB */}
                        <Animated.View
                            style={{
                                position: 'absolute',
                                left: CX - ORB / 2,
                                top: CY - ORB / 2,
                                width: ORB,
                                height: ORB,
                                opacity: introAnim,
                                transform: [{ perspective: 800 }, { translateY: orbFloat }, { scale: introAnim }, { scale: orbOpenScale }],
                            }}
                        >
                            {orbIdle && (
                                <View pointerEvents="none" style={styles.orbRingsWrap}>
                                    <PulseRings color={userTier.color} size={ORB} />
                                </View>
                            )}
                            <TouchableOpacity
                                activeOpacity={0.9}
                                onPress={onOrbPress}
                                onPressIn={() => Animated.spring(orbPress, { toValue: 1, speed: 40, bounciness: 6, useNativeDriver: true }).start()}
                                onPressOut={() => Animated.spring(orbPress, { toValue: 0, speed: 20, bounciness: 14, useNativeDriver: true }).start()}
                            >
                                <Animated.View style={{ transform: [{ scale: orbPressScale }] }}>
                                    <SpinRing size={ORB} colors={[userTier.color, userTier.secondaryColor, '#FFFFFF', userTier.color]}>
                                        {hostImage ? (
                                            <Image source={{ uri: hostImage }} style={[styles.hostAvatar, { borderColor: userTier.color }]} />
                                        ) : (
                                            <View style={[styles.avatarPlaceholder, { backgroundColor: userTier.color }]}>
                                                <Text style={styles.placeholderText}>{hostName.charAt(0).toUpperCase()}</Text>
                                            </View>
                                        )}
                                    </SpinRing>
                                </Animated.View>
                            </TouchableOpacity>

                            {/* viewers chip under the orb */}
                            <View pointerEvents="none" style={styles.liveIndicator}>
                                <View style={styles.liveDot} />
                                <Text style={styles.countText}>{viewerCount}</Text>
                            </View>

                            {/* state badge: close / chevron / sparkle / calling */}
                            <View pointerEvents="none" style={[styles.orbStateBadge, { backgroundColor: userTier.color }]}>
                                {isCalling ? (
                                    <ActivityIndicator size="small" color="#FFF" style={{ transform: [{ scale: 0.6 }] }} />
                                ) : (
                                    <Ionicons name={panelOpen ? "chevron-down" : menuOpen ? "close" : "sparkles"} size={12} color="#FFF" />
                                )}
                            </View>

                            {/* unread chat dot */}
                            {chatUnread && !chatVisible && <View pointerEvents="none" style={styles.orbUnreadDot} />}
                        </Animated.View>
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView>

            <GiftOverlay 
                giftData={activeGrandGift} 
                onComplete={() => setActiveGrandGift(null)} 
                role="user"
            />

            {/* 🔥 SATTI FIX: ANIMATED PREMIUM GIFTS (3D RARITY CARDS) — now lifted almost to the top of the screen 🔥 */}
            <Modal visible={showGiftModal} transparent animationType="slide" statusBarTranslucent onRequestClose={() => setShowGiftModal(false)}>
                <View style={styles.modalOverlay}>
                    <TouchableOpacity activeOpacity={1} style={{ height: insets.top + 8 }} onPress={() => setShowGiftModal(false)} />
                    <BlurView intensity={100} tint="dark" style={[styles.modalContent, borderType2, { borderBottomWidth: 0, flex: 1 }]}>
                        <LinearGradient
                            colors={['transparent', withAlpha(userTier.color, 0.95), 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.topEdgeGlow}
                            pointerEvents="none"
                        />
                        <View style={styles.modalHeader}>
                            <View style={{ flexShrink: 1 }}>
                                <Text style={styles.modalTitle} numberOfLines={1}>Send Appreciation 💎</Text>
                                <View style={styles.balanceChip}>
                                    <FontAwesome5 name="gem" size={10} color={userTier.color} />
                                    <Text style={[styles.balanceText, { color: userTier.color }]}>{myWalletBalance}</Text>
                                </View>
                            </View>
                            <TouchableOpacity onPress={() => setShowGiftModal(false)}>
                                <Ionicons name="close" size={28} color={userTier.color} />
                            </TouchableOpacity>
                        </View>
                        {/* 🔥 13 GIFTS IN 3D GRID VIEW 🔥 */}
                        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 10) + 20 }} showsVerticalScrollIndicator={false}>
                            <View style={styles.giftGrid}>
                                {GIFT_ROWS.map((row, r) => (
                                    <View key={r} style={styles.giftRow}>
                                        {row.map((g, k) => (
                                            <PremiumGiftCard key={g.name} item={g} index={r * 3 + k} onPress={() => sendGift(g.name, g.price)} />
                                        ))}
                                    </View>
                                ))}
                            </View>
                        </ScrollView>
                    </BlurView>
                </View>
            </Modal>

            {/* 🔥 NEW: PREMIUM ACTION SHEET: USER MINI-PROFILE (Over Live Stream) 🔥 */}
            <Modal visible={actionSheetVisible} transparent animationType="slide">
                <View style={styles.actionSheetOverlay}>
                    <TouchableOpacity style={styles.actionSheetDismiss} onPress={() => setActionSheetVisible(false)} />
                    <View style={styles.actionSheetContainer}>
                        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                        <LinearGradient colors={['transparent', withAlpha(userTier.color, 0.95), 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topEdgeGlow} pointerEvents="none" />
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
                            <Text style={[styles.actionSheetBtnText, { color: '#EF4444' }]}>Block and Report</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionSheetCancelBtn} onPress={() => setActionSheetVisible(false)}>
                            <Text style={styles.actionSheetCancelText}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 🔥 NEW: REPORT REASONS MODAL 🔥 */}
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

            {/* 🔥 NEW: PLAY STORE COMPLIANT SKILL GAMING DISCLAIMER MODAL 🔥 */}
            <Modal visible={disclaimerVisible} transparent animationType="slide">
                <View style={styles.actionSheetOverlay}>
                    <View style={[styles.actionSheetContainer, { paddingBottom: Platform.OS === 'ios' ? 60 : 50 }]}>
                        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                        <LinearGradient colors={['transparent', 'rgba(245,158,11,0.95)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topEdgeGlow} pointerEvents="none" />
                        <View style={styles.actionSheetHandle} />
                        <Text style={[styles.actionSheetTitle, { marginBottom: 15, color: '#F59E0B' }]}>🛡️ Skill Gaming Policy</Text>

                        <ScrollView style={{ maxHeight: height * 0.35, marginBottom: 15 }} showsVerticalScrollIndicator={false}>
                            <Text style={styles.disclaimerBodyText}>Welcome to TalkPe Pro Games! Before you proceed, please acknowledge our gaming policy:</Text>
                            
                            <Text style={styles.disclaimerBullet}>🧠 <Text style={styles.disclaimerBold}>100% Skill-Based:</Text> Games like Reflex Arena and Memory Match are purely based on user skill, speed, and memory. This is NOT a game of chance or gambling.</Text>
                            
                            {/* 🆕 FREE-TO-PLAY UPDATE: Disclaimer text updated (no entry fee / no rewards) */}
                            <Text style={styles.disclaimerBullet}>🆓 <Text style={styles.disclaimerBold}>Free to Play:</Text> Games like Reflex Arena and Memory Match are free. There is no entry fee and no prize or reward of any kind.</Text>
                            
                            <Text style={styles.disclaimerBullet}>🚫 <Text style={styles.disclaimerBold}>No Wallet Impact:</Text> Playing or winning does not add or deduct Diamonds or any real money.</Text>
                            
                            <Text style={styles.disclaimerBullet}>🎭 <Text style={styles.disclaimerBold}>Entertainment Only:</Text> This feature is provided strictly for entertainment and interactive networking purposes.</Text>
                        </ScrollView>

                        <TouchableOpacity 
                            style={styles.checkboxContainer} 
                            activeOpacity={0.8}
                            onPress={() => setDisclaimerChecked(!disclaimerChecked)}
                        >
                            <Ionicons name={disclaimerChecked ? "checkbox" : "square-outline"} size={24} color={disclaimerChecked ? "#10B981" : "#94A3B8"} />
                            <Text style={styles.checkboxText}>I confirm that I have read and agree to the Gaming Policy. I understand these games are for fun only and have no rewards.</Text>
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

            {/* ✅ REFLEX BLITZ ARENA (Gateway component) */}
            <LiveGameSheet 
                visible={gameVisible} 
                onClose={() => setGameVisible(false)} 
                liveId={liveId} 
                isHost={false} 
                userWalletBalance={myWalletBalance} 
            />

            {/* ✅ GLASS PATH ARENA (Gateway component) */}
            <MemoryMatch 
                visible={glassPathVisible} 
                onClose={() => setGlassPathVisible(false)} 
                liveId={liveId} 
                isHost={false} 
                userWalletBalance={myWalletBalance}
                entryFee={0} // 🔥 SATTI FIX: Added entryFee prop to resolve TS Error
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    videoContainer: { ...StyleSheet.absoluteFillObject },
    fullVideo: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' }, // <--- SATTI FIX ADDED
    loadingText: { color: '#0400fe', alignSelf: 'center', marginTop: 40, fontWeight: '900', letterSpacing: 2 },
    shimmerOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.15, filter: 'blur(100px)' },
    pulseWrap: { width: 220, height: 220, justifyContent: 'center', alignItems: 'center' },
    topEdgeGlow: { position: 'absolute', top: 0, left: 20, right: 20, height: 1.5 },

    // 🔮 ORB + BLOOM LAYER
    bloomLayer: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    orbRingsWrap: { position: 'absolute', left: 0, top: 0, width: ORB, height: ORB, alignItems: 'center', justifyContent: 'center' },
    hostAvatar: { width: ORB - 6, height: ORB - 6, borderRadius: (ORB - 6) / 2, borderWidth: 0 },
    avatarPlaceholder: { width: ORB - 6, height: ORB - 6, borderRadius: (ORB - 6) / 2, justifyContent: 'center', alignItems: 'center' },
    placeholderText: { color: '#FFF', fontSize: 22, fontWeight: 'bold' },
    liveIndicator: { position: 'absolute', bottom: -8, alignSelf: 'center', backgroundColor: '#EF4444', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 1, borderRadius: 10, gap: 3, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
    liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FFF' },
    countText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
    orbStateBadge: { position: 'absolute', top: -4, right: -4, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.85)' },
    orbUnreadDot: { position: 'absolute', top: -2, left: -2, width: 14, height: 14, borderRadius: 7, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FFF' },
    // 🔮 label now sits in a small solid dark pill so it never visually merges with a neighbour
    burstLabelWrap: { position: 'absolute', top: ITEM + 4, left: -14, width: ITEM + 28, alignItems: 'center' },
    burstLabelPill: { maxWidth: ITEM + 28, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 9, backgroundColor: 'rgba(2,6,23,0.78)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.25)' },
    burstLabelText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.2, textAlign: 'center' },
    burstBadge: { position: 'absolute', top: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#FFF' },
    orbBtn: { justifyContent: 'center', alignItems: 'center', borderWidth: 1.5 },

    // 🔮 HOST CARD (above the bloom): gradient border + glass body, auto height, text can never spill out
    infoCard: { position: 'absolute' },
    infoBorder: { padding: 1.5, borderRadius: 24 },
    infoInner: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 22.5, overflow: 'hidden', backgroundColor: 'rgba(6,10,24,0.55)' },
    infoAvatarFallback: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    infoTextCol: { flex: 1, minWidth: 0, gap: 5 },
    infoName: { color: '#FFF', fontWeight: '900', fontSize: 15, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4 },
    statusRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
    viewerChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    viewerText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
    livePill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8 },
    livePillText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    levelTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 9, gap: 4, backgroundColor: 'rgba(255,255,255,0.22)', maxWidth: 110 },
    levelTextTag: { color: '#FFF', fontSize: 10, fontWeight: '900', flexShrink: 1 },

    // 🔮 TOAST
    toastWrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
    toastPill: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: width * 0.8, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: 'rgba(8,12,28,0.6)', borderWidth: 1 },
    toastText: { color: '#FFF', fontSize: 12, fontWeight: '700', flexShrink: 1 },

    // 🔮 IN-PLACE PANELS
    panelWrap: { position: 'absolute', left: 12, right: 12 },
    panelBorder: { padding: 1.5, borderRadius: 28 },
    panelInner: { borderRadius: 26.5, overflow: 'hidden', padding: 12, backgroundColor: 'rgba(6,10,24,0.5)' },
    panelHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    panelTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', flexShrink: 1 },
    panelCloseBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.16)', justifyContent: 'center', alignItems: 'center' },
    chatViewerPill: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.14)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    chatViewerText: { color: '#E2E8F0', fontSize: 11, fontWeight: '800' },

    giftNotify: { position: 'absolute', alignSelf: 'center', zIndex: 100, maxWidth: width * 0.9 },
    giftPop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 30, gap: 12 },
    giftPopText: { color: '#FFF', fontWeight: '900', fontSize: 15, flexShrink: 1 },
    
    // 🔥 CHAT STYLES (text always wraps inside the bubble) 🔥
    chatList: { flex: 1, marginBottom: 6 },
    chatPopWrap: { alignSelf: 'flex-start', maxWidth: width * 0.78 },
    chatBubble: { backgroundColor: 'rgba(15, 23, 42, 0.55)', padding: 10, borderRadius: 18, marginBottom: 8, alignSelf: 'flex-start', maxWidth: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
    chatBubbleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    chatInitial: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    chatInitialText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
    chatName: { color: '#fe9d00', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },
    chatMessage: { color: '#FFF', fontWeight: '600', fontSize: 13 },
    chatText: { color: '#E2E8F0', fontSize: 12, fontWeight: '600' },
    
    // 🔥 SATTI FIX: ROYAL GIFT BUBBLE STYLES 🔥
    giftChatBubble: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 18, marginBottom: 8, alignSelf: 'flex-start', maxWidth: '100%', borderWidth: 1, borderColor: 'rgba(245, 159, 11, 0.99)' },
    giftChatText: { color: '#FFF', fontWeight: '900', fontSize: 12, flexShrink: 1, textShadowColor: 'rgb(99, 71, 170)', textShadowRadius: 5 },

    inputBar: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    textInput: { flex: 1, height: 46, backgroundColor: 'rgba(15,23,42,0.7)', borderRadius: 23, paddingHorizontal: 18, color: '#FFF', borderWidth: 1.5 },
    floatingReaction: { position: 'absolute', bottom: 120, zIndex: 99 },

    // 🎁 GIFT MODAL (tall sheet: starts just under the status bar)
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
    modalTitle: { color: '#FFF', fontSize: 22, fontWeight: '800' },
    balanceChip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
    balanceText: { fontSize: 12, fontWeight: '900' },
    giftGrid: { marginBottom: 30 },
    giftRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 12 },
    giftCardBorder: { width: Math.floor((width - 50 - 24 - 2) / 3), padding: 1.5, borderRadius: 24 },
    giftCardInner: { height: 128, borderRadius: 22.5, backgroundColor: 'rgba(6, 10, 26, 0.94)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', paddingHorizontal: 4 },
    giftCardGlow: { position: 'absolute', top: 6, width: 70, height: 70, borderRadius: 35, opacity: 0.22 },
    giftPricePill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10, marginTop: 4 },
    giftPriceEmoji: { fontSize: 9 },
    giftImage: { width: 80, height: 80 },
    giftNameText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', marginTop: -2, textAlign: 'center', maxWidth: '100%' },
    giftPrice: { fontSize: 14, fontWeight: '900', marginTop: 2 },
    
    busyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    busyCard: { width: width * 0.85, padding: 35, borderRadius: 35, alignItems: 'center', overflow: 'hidden' },
    busyIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    busyTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
    busySub: { color: '#94A3B8', fontSize: 15, textAlign: 'center', lineHeight: 24 },

    // 🔥 BEAUTY SETTINGS 🔥
    ProSettingsBar: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 22, padding: 16, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.14)' },
    settingGroup: { flex: 1, alignItems: 'center' },
    settingLabel: { color: '#CBD5E1', fontSize: 10, fontWeight: '900', marginBottom: 10, letterSpacing: 1.5 },
    chipRow: { flexDirection: 'row', gap: 10 },
    chip: { backgroundColor: 'rgba(30,41,59,0.8)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
    activeChip: { backgroundColor: 'rgba(0, 242, 254, 0.15)', borderColor: '#00F2FE' },
    chipText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
    settingDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.15)', marginHorizontal: 12 },

    // 🔥 ACTION SHEET STYLES 🔥
    actionSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    actionSheetDismiss: { flex: 1 },
    actionSheetContainer: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.2)', borderBottomWidth: 0 },
    actionSheetHandle: { width: 40, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, alignSelf: 'center', marginBottom: 14 },
    
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
