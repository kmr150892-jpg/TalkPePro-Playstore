import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
// 🔥 FIXED: Added getDocs and limit to the import statement
import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
// 🔥 NEW: RTDB IMPORT FOR PRESENCE SYSTEM 🔥
import { getDatabase, onDisconnect, onValue, ref, set } from 'firebase/database';
import React, { useEffect, useRef, useState } from 'react';
// 🔥 FIXED: Added AppState to detect Force Close and update Firestore 🔥
// 🆕 Keyboard added (type box keyboard-ku mela varathukku)
import { ActivityIndicator, Alert, Animated, AppState, BackHandler, Dimensions, Easing, FlatList, Image, Keyboard, KeyboardAvoidingView, Modal, PermissionsAndroid, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; // 🆕 useSafeAreaInsets (sheet bottom-ku nav bar overlap fix)

import LottieView from 'lottie-react-native';
import { ChannelProfileType, ClientRoleType, createAgoraRtcEngine, IRtcEngine } from 'react-native-agora';
import { auth, db } from '../../../firebaseConfig';

import LiveGameSheet from '../../../components/LiveGameSheet';
import MemoryMatch from '../../../components/MemoryMatch';

const { width, height } = Dimensions.get('window');
const AGORA_APP_ID = "718cedc3c47e44d1bfa4853d6ac6cd80"; 

const REACTION_EMOJIS = ['❤️', '🔥', '😂', '👏', '🙌', '💯'];

// 🆕 3D IMAGES (icons8 3D Fluency) - load aagalana automatic-a icon fallback varum
const IMG = {
    coin: 'https://img.icons8.com/3d-fluency/512/coin.png',
    crown: 'https://img.icons8.com/3d-fluency/512/crown.png',
    microphone: 'https://img.icons8.com/3d-fluency/512/microphone.png',
    star: 'https://img.icons8.com/3d-fluency/512/star.png',
};

// 👑 ROYAL PALETTE
const GOLD_RING = ['#22D3EE', '#FFFFFF', '#F472B6', '#FFFFFF', '#A3E635', '#22D3EE'];
const AMETHYST_RING = ['#E9D5FF', '#A855F7', '#22D3EE', '#6366F1', '#E9D5FF'];
const GOLD_BORDER = ['#E9C46A', '#B8860B', '#8B6508', '#B8860B']; // 🥇 dark gold border (ippo seats-ku mattum - header/dock vera color)
// 🆕 NEON BORDER (header + dock + sheets) - gold ippo seat-ku mattum, mathathu ellam intha colors
const NEON_BORDER = ['#22D3EE', '#6366F1', '#F472B6', '#6366F1'];
const SEAT_COLORS = ['#F472B6', '#22D3EE', '#A3E635', '#FBBF24', '#A78BFA', '#FB7185', '#34D399', '#60A5FA'];
// 🆕 SEAT RAINBOW RING (multicolour - seat avatar ring continuous-a suthum)
const SEAT_RAINBOW = ['#F472B6', '#FBBF24', '#A3E635', '#22D3EE', '#818CF8', '#A855F7', '#F472B6'];

// 🆕 SEAT SIZE (screen width-ku ettha auto fit aagum - text/icon box-ku veliya varaadhu)
// 🆕 Seats ippo konjam chinna (76 -> 62 -> 56) so chat/system messages-ku neraya space
const SEAT_GAP = 10;
const SEAT_W = Math.floor((width - 28 - 24 - SEAT_GAP * 3) / 4); // 28 = outer margin, 24 = stage padding
const SEAT_BOX = Math.min(56, SEAT_W);
const SEAT_RING = SEAT_BOX - 6;
const SEAT_IMG = SEAT_RING - 10;

const calculateUserLevel = (totalSpent: number) => {
    if (totalSpent >= 500000001) return { lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#ff0000', secondaryColor: '#660000', anim: 'titan', themeBg: ['#1A0000', '#000000'], hasVipEntry: true, entryMessage: 'The Almighty Titan Overseer has arrived!' }; 
    if (totalSpent >= 100000001) return { lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#ff0dba', secondaryColor: '#a50606', anim: 'mythic', themeBg: ['#15001A', '#000000'], hasVipEntry: true, entryMessage: 'Bow down, Mythic Ruler entered the room!' }; 
    if (totalSpent >= 50000000) return { lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#f6f60d', secondaryColor: '#02fa0a', anim: 'grandmaster', themeBg: ['#08001A', '#000000'], hasVipEntry: true, entryMessage: 'A Grandmaster stepped into the forum!' };
    if (totalSpent >= 10000000) return { lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#f52b6092', anim: 'explosion', themeBg: ['#00101A', '#000000'], hasVipEntry: true, entryMessage: 'Elite Veteran is here!' };
    if (totalSpent >= 5000000) return { lvl: 4, label: 'LEGENDARY NODE', status: 'NEBULA COMMANDER', color: '#d0630a', secondaryColor: '#5f0bf0', anim: 'nebula', themeBg: ['#0A001A', '#000000'], hasVipEntry: true, entryMessage: 'Legendary Node is here!' };
    if (totalSpent >= 1000000) return { lvl: 3, label: 'DIAMOND CORE', status: 'NUCLEAR ASSET', color: '#bcde4a', secondaryColor: '#09bbf1fe', anim: 'diamond', themeBg: ['#001A0A', '#000000'], hasVipEntry: true, entryMessage: 'Diamond Core activated the grid!' };
    if (totalSpent >= 200001) return { lvl: 2, label: 'GOLD OPERATIVE', status: 'ROYAL STRIKER', color: '#ffae00', secondaryColor: '#ac4a4a', anim: 'sparkle', themeBg: ['#1A0B00', '#000000'], hasVipEntry: true, entryMessage: 'Gold Operative secured the perimeter!' };
    return { lvl: 1, label: 'SILVER AGENT', status: 'STAR FAME', color: '#0f33e7', secondaryColor: '#6b0402', anim: 'wave', themeBg: ['#050505', '#000000'], hasVipEntry: true, entryMessage: 'Silver Agent deployed into action!' };
};

const getBadgeLocalImage = (lvl: number) => {
    switch(lvl) {
        case 8: return require('../../../assets/badge/TITAN OVERSEER.png');
        case 7: return require('../../../assets/badge/MYTHIC RULER.png');
        case 6: return require('../../../assets/badge/GRANDMASTER.png');
        case 5: return require('../../../assets/badge/ELITE VETERAN.png');
        case 4: return require('../../../assets/badge/LEGENDARY NODE.png');
        case 3: return require('../../../assets/badge/DIAMOND CORE.png');
        case 2: return require('../../../assets/badge/GOLD OPERATIVE.png');
        case 1: return require('../../../assets/badge/SILVER AGENT.png');
        default: return null;
    }
};

// ================= 🆕 PREMIUM UI COMPONENTS =================

// 🆕 3D image with auto icon fallback
const Img3D = ({ uri, size, fallback, color = '#FFF', style }: any) => {
    const [err, setErr] = useState(false);
    if (err) return <MaterialCommunityIcons name={fallback} size={size * 0.7} color={color} />;
    return <Image source={{ uri }} style={[{ width: size, height: size }, style]} resizeMode="contain" onError={() => setErr(true)} />;
};

// 🆕 BACKDROP: seat-la last-a ukkandha user-oda image full screen background (image maarina smooth-a cross-fade aagum)
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

// 🆕 ✨ Gold dust (chinna golden particles mela rise aagum - royal feel)
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
const PressScale = ({ children, onPress, disabled, style }: any) => {
    const s = useRef(new Animated.Value(1)).current;
    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={onPress}
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

// ✨ Seat-ah suthi sutrum lite animation (chinna colour lights)
// 🆕 UPDATED: seat size-ku ettha auto adjust + multicolour dots (colors array-la ulla ella colors-um use aagum)
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

// 👑 ROYAL SEAT v5 (🆕 multicolour design, seat numbers illa, ring + dots continuous-a suthum)
//    occupied: rainbow spinning ring avatar + glow + chair badge + 3D crown (host) + nameplate pill + orbit dots
//    isSpot  : background image-oda owner seat (brighter glow)
//    empty   : rotating dashed multicolour ring + chair icon
const SeatItem = ({ seat, index, isMe, isSeatHost, isSpot, label, onPress }: any) => {
    const enter = useRef(new Animated.Value(0)).current;
    const emptySpin = useRef(new Animated.Value(0)).current; // 🆕 empty seat dashed ring rotation
    useEffect(() => {
        Animated.spring(enter, { toValue: 1, delay: index * 70, friction: 6, tension: 60, useNativeDriver: true }).start();
    }, []);
    useEffect(() => {
        const loop = Animated.loop(Animated.timing(emptySpin, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
        loop.start();
        return () => loop.stop();
    }, []);
    const c = SEAT_COLORS[index % SEAT_COLORS.length];            // 🆕 ovvoru seat-kum thani colour
    const c2 = SEAT_COLORS[(index + 3) % SEAT_COLORS.length];     // 🆕 second colour (gradient / highlight)
    const ringColors = SEAT_RAINBOW;
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
                            {/* 🆕 multicolour rainbow ring - ella seat-layum continuous-a suthum */}
                            <SpinRing size={SEAT_RING} colors={ringColors} animated speed={3500 + (index % 4) * 700}>
                                <Image source={{ uri: seat.image }} style={styles.seatAvatar} />
                                {seat.isMuted && <View style={styles.muteOverlay}><Ionicons name="mic-off" size={15} color="#FFF" /></View>}
                            </SpinRing>
                            {/* 🆕 ring-a suthi multicolour dots (dot ring animation) */}
                            <OrbitLights colors={[c, '#FFFFFF', c2, '#FFFFFF']} speed={4200 + (index % 3) * 600} reverse={index % 2 === 1} size={SEAT_BOX} />
                            <View style={styles.seatStatusDot} />
                            {/* small chair badge (seat feel) */}
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
                            {/* 🆕 empty seat dashed ring - suthikitte irukkum, ovvoru seat-kum thani colour */}
                            <Animated.View pointerEvents="none" style={[styles.emptyCircle, { borderColor: c, transform: [{ rotate: emptyRotate }] }]} />
                            <MaterialCommunityIcons name="seat" size={SEAT_BOX - 24} color={c2} style={{ position: 'absolute', textShadowColor: c2, textShadowRadius: 10, textShadowOffset: { width: 0, height: 0 }, opacity: 0.9 }} />
                        </View>
                    </FloatBox>
                )}
                {/* colour pedestal (3D platform) */}
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

export default function ExpertForumRoomScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const roomId = params.roomId as string;
    const user = auth.currentUser;
    const insets = useSafeAreaInsets(); // 🆕 phone navigation bar height

    const [roomData, setRoomData] = useState<any>(null);
    const [expertData, setExpertData] = useState<any>(null);
    const [mySeatIndex, setMySeatIndex] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    
    // 🔥 NEW: DISCLAIMER MODAL STATES FOR HOST 🔥
    const [isGameVisible, setIsGameVisible] = useState(false);
    const [glassVisible, setGlassVisible] = useState(false);
    const [disclaimerVisible, setDisclaimerVisible] = useState(false);
    const [disclaimerChecked, setDisclaimerChecked] = useState(false);
    const [pendingGameType, setPendingGameType] = useState<'reflex' | 'memory' | null>(null);

    const [messages, setMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [reactions, setReactions] = useState<any[]>([]);

    const agoraEngine = useRef<IRtcEngine | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isAgoraJoined, setIsAgoraJoined] = useState(false);
    // 🔥 FIX: mic permission dialog must NOT end the forum
    const isAskingPermission = useRef(false);
    const permGraceUntil = useRef(0);
    const bgTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [waitingList, setWaitingList] = useState<any[]>([]);
    const [waitingModalVisible, setWaitingModalVisible] = useState(false);

    // 🆕 SPOTLIGHT: seat-la last-a ukkandha user (host illama) - background image avar thaan
    const [spotlight, setSpotlight] = useState<{ uid: string, name: string, image: string } | null>(null);
    const seatOrderRef = useRef<string[]>([]);

    // 🆕 KEYBOARD LIFT: type box (bottom dock) keyboard-ku mela varanum
    const bottomRef = useRef<any>(null);
    const [kbLift, setKbLift] = useState(0);
    useEffect(() => {
        if (Platform.OS !== 'android') return; // iOS-la KeyboardAvoidingView handle pannum
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

    // 🆕 PREMIUM UI STATES / ANIMATION DRIVERS
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const headerEnter = useRef(new Animated.Value(0)).current;
    const bottomEnter = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();
        Animated.spring(headerEnter, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }).start();
        Animated.spring(bottomEnter, { toValue: 1, friction: 8, tension: 50, delay: 200, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        if (!roomId) return;
        const wq = query(collection(db, "forum_rooms", roomId, "waitingList"), orderBy("requestedAt", "asc"));
        const unsubWaiting = onSnapshot(wq, (snap) => {
            setWaitingList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsubWaiting();
    }, [roomId]);

    // 🎖️ THIS FORUM-OODA TOTAL REWARDS (ella gifts-um serthu, ovvonnum price/2)
    const [forumRewards, setForumRewards] = useState(0);
    useEffect(() => {
        if (!roomId) return;
        const gq = query(collection(db, 'forum_rooms', roomId, 'gifts'));
        const unsubTotal = onSnapshot(gq, (snap) => {
            let total = 0;
            snap.docs.forEach((d: any) => {
                const g = d.data();
                total += Math.floor((g.price || g.amount || 0) / 2);
            });
            setForumRewards(total);
        });
        return () => unsubTotal();
    }, [roomId]);

    const [currentGift, setCurrentGift] = useState<any>(null);
    const giftAnimY = useRef(new Animated.Value(50)).current; 
    const scaleAnim = useRef(new Animated.Value(0)).current;

    const [myWalletBalance, setMyWalletBalance] = useState(0);

    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [callerProfile, setCallerProfile] = useState<any>(null);
    const [ringModalVisible, setRingModalVisible] = useState(false);
    const [ringTimer, setRingTimer] = useState(12);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    
    const hasJoinedFired = useRef(false);
    const hasFiredVipEntry = useRef(false);

    const [actionSheetVisible, setActionSheetVisible] = useState(false);
    const [reportSheetVisible, setReportSheetVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const [vipEntry, setVipEntry] = useState<any>(null);
    const vipAnimX = useRef(new Animated.Value(-width)).current;
    const vipProgress = useRef(new Animated.Value(0)).current;

    const roomDataRef = useRef<any>(null);
    useEffect(() => {
        roomDataRef.current = roomData;
    }, [roomData]);

    // 🆕 SPOTLIGHT TRACKER: seat-la yaar last-a vandhaangalo avanga image background-la varum.
    // Avanga ezhunthu poitaa, munnaadi ukkandha user-oda image varum. Yaarum illana host image.
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
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                    {
                        title: 'Microphone Permission',
                        message: 'TalkPe Pro needs access to your microphone for professional audio sessions.',
                        buttonNeutral: 'Ask Me Later', buttonNegative: 'Cancel', buttonPositive: 'OK',
                    }
                );
                return granted === PermissionsAndroid.RESULTS.GRANTED;
            } catch (err) { return false; }
        }
        return true;
    };

    useEffect(() => {
        const backAction = () => {
            handleEndForum();
            return true; 
        };
        const backHandler = BackHandler.addEventListener("hardwareBackPress", backAction);
        return () => backHandler.remove();
    }, [roomId]);

    useEffect(() => {
        if (!roomId) return;

        const inPermissionWindow = () => isAskingPermission.current || Date.now() < permGraceUntil.current;

        const endForum = async () => {
            try {
                await updateDoc(doc(db, "forum_rooms", roomId), { status: "ended" });
            } catch (error) { console.log(error); }
        };

        const handleAppStateChange = (nextAppState: string) => {
            if (nextAppState === 'active') {
                if (bgTimerRef.current) { clearTimeout(bgTimerRef.current); bgTimerRef.current = null; }
                return;
            }

            // 🔥 permission dialog (or its late events) never ends the forum
            if (inPermissionWindow()) return;

            if (nextAppState === 'background') {
                if (bgTimerRef.current) { clearTimeout(bgTimerRef.current); bgTimerRef.current = null; }
                endForum();
                return;
            }

            if (nextAppState === 'inactive') {
                if (bgTimerRef.current) clearTimeout(bgTimerRef.current);
                bgTimerRef.current = setTimeout(() => {
                    bgTimerRef.current = null;
                    if (AppState.currentState === 'active' || inPermissionWindow()) return;
                    endForum();
                }, 1500);
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => {
            if (bgTimerRef.current) clearTimeout(bgTimerRef.current);
            subscription.remove();
        };
    }, [roomId]);

    useEffect(() => {
        if (!roomId || !user) return;

        const cleanupGhostRooms = async () => {
            try {
                const q = query(collection(db, "forum_rooms"), where("hostId", "==", user.uid), where("status", "==", "active"));
                const querySnapshot = await getDocs(q);
                // 🔥 FIXED: Added 'any' type to roomDoc
                querySnapshot.forEach(async (roomDoc: any) => {
                    if (roomDoc.id !== roomId) {
                        await updateDoc(doc(db, "forum_rooms", roomDoc.id), { status: "ended" });
                    }
                });
            } catch (error) { console.log("Ghost forum cleanup error:", error); }
        };
        cleanupGhostRooms();

        const rtdb = getDatabase();
        const connectedRef = ref(rtdb, ".info/connected");
        const roomPresenceRef = ref(rtdb, `presence_rooms/${roomId}`);

        const unsubPresence = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                onDisconnect(roomPresenceRef).set("ended").then(() => {
                    set(roomPresenceRef, "active");
                });
            }
        });

        const unsubExpert = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setExpertData(data);
                setMyWalletBalance(data.walletBalance || 0);
            }
        });

        const unsubRoom = onSnapshot(doc(db, "forum_rooms", roomId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.status === 'ended') {
                    router.replace('/expert/dashboard' as any);
                    return;
                }
                setRoomData(data);
                const myIdx = data.seats?.findIndex((s: any) => s.uid === user?.uid);
                setMySeatIndex(myIdx !== -1 ? myIdx : null);
                setIsLoading(false);
            } else {
                getDoc(doc(db, "forum_rooms", roomId)).then(docSnap => {
                    if (!docSnap.exists()) {
                        setIsLoading(false);
                        router.replace('/expert/dashboard' as any); 
                    }
                }).catch(() => {
                    setIsLoading(false);
                    router.replace('/expert/dashboard' as any);
                });
            }
        });

        const msgQuery = query(collection(db, 'forum_rooms', roomId, 'messages'), orderBy('timestamp', 'desc'), limit(20));
        const unsubMsgs = onSnapshot(msgQuery, (snap) => {
            // SATTI FIX: Removed .reverse() so the latest message appears at the top (MELA VARANUM)
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));

            snap.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const isRecent = data.timestamp ? (Date.now() - data.timestamp.toMillis() < 5000) : true;
                    
                    if (isRecent && data.isVipEntry) {
                        const currentHostId = roomDataRef.current?.hostId;
                        if (data.uid !== currentHostId) {
                            triggerVipBanner(data);
                        }
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
                        let fetchedSenderImage = data.senderImage || data.userImage || null;
                        if (!fetchedSenderImage && data.senderId) {
                            try {
                                const senderSnap = await getDoc(doc(db, "users", data.senderId));
                                if (senderSnap.exists()) {
                                    const sData = senderSnap.data();
                                    fetchedSenderImage = sData.profilePic || sData.photoURL || null;
                                }
                            } catch (e) { console.log(e); }
                        }

                        setCurrentGift({ ...data, senderImage: fetchedSenderImage });
                        triggerGiftAnimation();

                        if (user) {
                            try {
                                const diamondAmount = data.price || data.amount || 0;
                                const beanAmount = Math.floor(diamondAmount / 2);
                                const expertRef = doc(db, "users", user.uid);
                                const expertSnap = await getDoc(expertRef);

                                if (expertSnap.exists()) {
                                    const eData = expertSnap.data();
                                    const today = new Date().toISOString().split('T')[0];
                                    const isNewDay = eData.lastBonusDate !== today;

                                    let currentTopVip = eData.topVipSupporter || { name: 'None', amount: 0, date: '' };
                                    const senderName = data.senderName || 'Premium User';
                                    if (isNewDay || diamondAmount > currentTopVip.amount) {
                                        currentTopVip = { name: senderName, amount: diamondAmount, date: today };
                                    }

                                    const updatedTodayBeans = isNewDay ? beanAmount : (Number(eData.todayBeans) || 0) + beanAmount;
                                    let achievedMilestone = "0 / 100K";
                                    if (updatedTodayBeans >= 500000) achievedMilestone = "ELITE (500K)";
                                    else if (updatedTodayBeans >= 300000) achievedMilestone = "PRO (300K)";
                                    else if (updatedTodayBeans >= 100000) achievedMilestone = "STARTER (100K)";

                                    await updateDoc(expertRef, {
                                        todayBeans: isNewDay ? beanAmount : increment(beanAmount),
                                        topVipSupporter: currentTopVip,
                                        currentDailyMilestone: achievedMilestone,
                                        lastBonusDate: today,
                                        totalDiamondsReceived: increment(diamondAmount)
                                    });
                                }
                            } catch (e) { console.log(e); }
                        }
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
            set(roomPresenceRef, "ended"); 
            unsubRoom(); unsubExpert(); unsubGifts(); unsubMsgs(); unsubReactions(); 
        };
    }, [roomId, user]);

    useEffect(() => {
        if (expertData && user && roomId && roomData && !hasFiredVipEntry.current) {
            hasFiredVipEntry.current = true;
            
            const isHost = user.uid === roomData.hostId;
            
            if (!isHost) {
                const userTotalSpent = expertData.totalDiamondsSpent || 0; 
                const levelData = calculateUserLevel(userTotalSpent);
                
                if (levelData.hasVipEntry) {
                    addDoc(collection(db, "forum_rooms", roomId, "messages"), {
                        uid: user.uid,
                        name: expertData.name || expertData.userName || "User",
                        text: levelData.entryMessage,
                        timestamp: serverTimestamp(),
                        isVipEntry: true,
                        lvl: levelData.lvl,
                        label: levelData.label,
                        color: levelData.color,
                        themeBg: levelData.themeBg,
                        anim: levelData.anim,
                        entryMessage: levelData.entryMessage,
                        image: expertData.profilePic || expertData.photoURL || null
                    }).catch(e => console.log(e));
                }
            }
        }
    }, [expertData, user, roomId, roomData]);

    useEffect(() => {
        if (isAgoraJoined && expertData && !hasJoinedFired.current) {
            hasJoinedFired.current = true;
            addDoc(collection(db, "forum_rooms", roomId, "messages"), {
                uid: "system",
                name: "System",
                text: `✨ ${expertData?.name || expertData?.userName || "Host"} has initiated the session!`,
                timestamp: serverTimestamp(),
                isSystem: true
            }).catch(e => console.log(e));
        }
    }, [isAgoraJoined, expertData, roomId]);

    useEffect(() => {
        if (!user?.uid) return;

        const callsQuery = query(
            collection(db, "calls"),
            where("expertId", "==", user.uid),
            where("status", "in", ["calling", "ringing", "pending"]),
            limit(1)
        );

        const unsubCalls = onSnapshot(callsQuery, { includeMetadataChanges: true }, (snap) => {
            if (snap.metadata.fromCache) return;

            if (!snap.empty) {
                const callDoc = snap.docs[0];
                const callData: any = { id: callDoc.id, ...callDoc.data() };
                
                const now = Date.now();
                const callTime = callData.createdAt?.toMillis ? callData.createdAt.toMillis() : now;
                
                if (now - callTime < 15000) {
                    setIncomingCall(callData);
                    setRingModalVisible(true);
                    setRingTimer((prev) => prev > 0 ? prev : 12); 
                }
            } else {
                setRingModalVisible(false);
                setIncomingCall(null);
            }
        });

        return () => unsubCalls();
    }, [user?.uid]);

    useEffect(() => {
        const fetchCallerProfile = async () => {
            if (incomingCall) {
                const targetUid = incomingCall.userId || incomingCall.callerId || incomingCall.uid;
                if (targetUid) {
                    try {
                        const userSnap = await getDoc(doc(db, "users", targetUid));
                        if (userSnap.exists()) {
                            setCallerProfile(userSnap.data());
                        }
                    } catch (e) {
                        console.log("Failed to fetch caller profile", e);
                    }
                }
            } else {
                setCallerProfile(null);
            }
        };
        fetchCallerProfile();
    }, [incomingCall]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval> | null = null;

        if (ringModalVisible && incomingCall) {
            pulseAnim.setValue(1);
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
                ])
            ).start();

            interval = setInterval(() => {
                setRingTimer((prev) => {
                    if (prev <= 1) {
                        if (interval) clearInterval(interval);
                        handleMissedCall(incomingCall.id);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            pulseAnim.stopAnimation();
            pulseAnim.setValue(1);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [ringModalVisible, incomingCall?.id]);

    const handleMissedCall = async (callId: string) => {
        setRingModalVisible(false);
        setIncomingCall(null);
        try {
            await updateDoc(doc(db, "calls", callId), { status: 'missed' });
        } catch (e) {}
    };

    const handleDeclineCall = async () => {
        if (!incomingCall) return;
        const callId = incomingCall.id;
        setRingModalVisible(false);
        setIncomingCall(null);
        try {
            await updateDoc(doc(db, "calls", callId), { status: 'declined' });
        } catch (e) {}
    };

    const handleAcceptCall = async () => {
        if (!incomingCall) return;
        const callId = incomingCall.id;
        setRingModalVisible(false);
        setIncomingCall(null);
        
        try {
            await updateDoc(doc(db, "calls", callId), { status: 'accepted' });
            await updateDoc(doc(db, "forum_rooms", roomId), { status: "ended" });
            
            if (agoraEngine.current) {
                agoraEngine.current.leaveChannel();
                agoraEngine.current.release();
                agoraEngine.current = null;
            }

            router.replace({
                pathname: "/videocall" as any,
                params: { 
                    expertId: user?.uid, 
                    expertName: expertData?.name || "Host",
                    callId: callId,
                    role: 'expert',
                    isAccepted: 'true' 
                }
            });
        } catch (e) {}
    };

    const triggerVipBanner = (data: any) => {
        setVipEntry(data);
        vipProgress.setValue(0);
        Animated.sequence([
            Animated.timing(vipProgress, { toValue: 1, duration: 900, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
            Animated.delay(4500), 
            Animated.timing(vipProgress, { toValue: 0, duration: 600, easing: Easing.in(Easing.ease), useNativeDriver: true })
        ]).start(() => {
            setVipEntry(null);
        });
    };

    const getVipTransform = (animType: string) => {
        switch(animType) {
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
                Animated.timing(giftAnimY, { toValue: 0, duration: 600, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 1.2, duration: 600, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true })
            ]),
            Animated.delay(3000), 
            Animated.parallel([
                Animated.timing(giftAnimY, { toValue: -150, duration: 600, easing: Easing.in(Easing.ease), useNativeDriver: true }),
                Animated.timing(scaleAnim, { toValue: 0, duration: 600, useNativeDriver: true })
            ])
        ]).start(() => setCurrentGift(null));
    };

    useEffect(() => {
        const setupAgoraEngine = async () => {
            isAskingPermission.current = true;
            const hasPermission = await requestMicrophonePermission();
            await new Promise(r => setTimeout(r, 800));   // let the dialog close animation settle
            permGraceUntil.current = Date.now() + 2500;
            isAskingPermission.current = false;
            if (!hasPermission) return;
            try {
                agoraEngine.current = createAgoraRtcEngine();
                agoraEngine.current.initialize({ appId: AGORA_APP_ID });
                agoraEngine.current.enableAudio();
                agoraEngine.current.setChannelProfile(ChannelProfileType.ChannelProfileLiveBroadcasting);
                agoraEngine.current.setClientRole(ClientRoleType.ClientRoleBroadcaster);
                agoraEngine.current.setDefaultAudioRouteToSpeakerphone(true);
                agoraEngine.current.setEnableSpeakerphone(true);
                agoraEngine.current.addListener('onJoinChannelSuccess', () => setIsAgoraJoined(true));
                agoraEngine.current.joinChannel('', roomId, 0, {
                    clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                    publishMicrophoneTrack: true, autoSubscribeAudio: true
                }); 
            } catch (e) { console.log(e); }
        };
        setupAgoraEngine();
        return () => {
            if (agoraEngine.current) {
                agoraEngine.current.leaveChannel();
                agoraEngine.current.release();
            }
        };
    }, [roomId]);

    // 🔇 HOST MUTE: host mute panna user-ala thirumba unmute panna mudiyathu
    const myHostMuted = mySeatIndex !== null && !!roomData?.seats?.[mySeatIndex]?.hostMuted;
    useEffect(() => {
        if (myHostMuted && agoraEngine.current) {
            agoraEngine.current.muteLocalAudioStream(true);
            setIsMuted(true);
        }
    }, [myHostMuted]);

    const toggleMic = () => {
        if (myHostMuted) {
            Alert.alert("Muted by Host", "The host has muted your mic. You can speak once they unmute you.");
            return;
        }
        if (agoraEngine.current && roomData) {
            const newMutedState = !isMuted;
            agoraEngine.current.muteLocalAudioStream(newMutedState);
            setIsMuted(newMutedState);
            if (mySeatIndex !== null) {
                const updatedSeats = [...roomData.seats];
                updatedSeats[mySeatIndex].isMuted = newMutedState;
                updateDoc(doc(db, "forum_rooms", roomId), { seats: updatedSeats });
            }
        }
    };

    const handleSendChat = async () => {
        if (!chatInput.trim() || !user) return;
        try {
            const hostTotalSpent = expertData?.totalDiamondsSpent || 0; 
            const hostLevelData = calculateUserLevel(hostTotalSpent);

            await addDoc(collection(db, "forum_rooms", roomId, "messages"), {
                uid: user.uid,
                name: expertData?.name || "Host",
                text: chatInput.trim(),
                timestamp: serverTimestamp(),
                lvl: hostLevelData.lvl,
                label: hostLevelData.label,
                color: hostLevelData.color
            });
            setChatInput('');
        } catch (e) { console.log(e); }
    };

    const handleReaction = async (emoji: string) => {
        try {
            await addDoc(collection(db, "forum_rooms", roomId, "reactions"), { emoji, timestamp: serverTimestamp() });
        } catch (e) { console.log(e); }
    };

    const getWaitText = (ts: any) => {
        const ms = ts?.toMillis ? Date.now() - ts.toMillis() : 0;
        const m = Math.floor(ms / 60000);
        return m < 1 ? 'just now' : `${m} min`;
    };

    const assignWaitingUser = async (w: any) => {
        if (!roomData?.seats) return;
        // already seat-la irundha entry mattum delete
        if (roomData.seats.some((s: any) => s.uid === w.id)) {
            await deleteDoc(doc(db, "forum_rooms", roomId, "waitingList", w.id));
            return;
        }
        const emptyIdx = roomData.seats.findIndex((s: any) => !s.uid);
        if (emptyIdx === -1) {
            Alert.alert("Seats Full", "No empty seats available. Please free up a seat first.");
            return;
        }
        try {
            const updatedSeats = [...roomData.seats];
            const hm = (roomData.mutedUsers || []).includes(w.id);
            // 🆕 seatedAt: yaar last-a ukkandhaanga nu theriya (background image order)
            updatedSeats[emptyIdx] = { uid: w.id, name: w.name || 'User', image: w.image || '', isMuted: hm, hostMuted: hm, seatedAt: Date.now() };
            await updateDoc(doc(db, "forum_rooms", roomId), { seats: updatedSeats });
            await deleteDoc(doc(db, "forum_rooms", roomId, "waitingList", w.id));
        } catch (e) { console.log(e); }
    };

    const removeWaitingUser = async (uid: string) => {
        try { await deleteDoc(doc(db, "forum_rooms", roomId, "waitingList", uid)); } catch (e) { console.log(e); }
    };

    const handleSeatClick = async (index: number) => {
        if (!roomData) return;
        const seat = roomData.seats[index];
        
        if (seat.uid === user?.uid) {
            Alert.alert("Step Down?", "Vacate this position?", [{ text: "Confirm", onPress: async () => {
                const updatedSeats = [...roomData.seats];
                updatedSeats[index] = { uid: null, name: null, image: null, isMuted: false };
                await updateDoc(doc(db, "forum_rooms", roomId), { seats: updatedSeats });
            }}, { text: "Cancel", style: "cancel" }]);
            return;
        }
        
        if (seat.uid) {
            handleUserClick(seat);
            return;
        }
        
        if (mySeatIndex !== null) return;
        try {
            const updatedSeats = [...roomData.seats];
            const actualName = expertData?.name || expertData?.userName || user?.displayName || "Host";
            const actualImage = expertData?.profilePic || expertData?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(actualName)}&background=0F172A&color=00F2FE`;

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

    // 🔇 HOST: seat-la irukkura user-ah mute / unmute (mute aana user thaane unmute panna mudiyathu)
    const handleHostMuteUser = async (targetUid: string) => {
        if (!roomData || !targetUid) return;
        const seatIndex = roomData.seats?.findIndex((s: any) => s.uid === targetUid);
        if (seatIndex === -1 || seatIndex === undefined) { setActionSheetVisible(false); return; }
        const newState = !roomData.seats[seatIndex].hostMuted;
        try {
            const updatedSeats = [...roomData.seats];
            updatedSeats[seatIndex] = { ...updatedSeats[seatIndex], isMuted: newState, hostMuted: newState };
            await updateDoc(doc(db, "forum_rooms", roomId), {
                seats: updatedSeats,
                mutedUsers: newState ? arrayUnion(targetUid) : arrayRemove(targetUid)
            });
        } catch (e) { console.log(e); }
        setActionSheetVisible(false);
    };

    const handleDisconnectUser = async (targetUid: string) => {
        if (!roomData || !targetUid) return;
        const seatIndex = roomData.seats?.findIndex((s: any) => s.uid === targetUid);
        if (seatIndex !== -1) {
            Alert.alert("Host Controls 👑", `Disconnect ${selectedUser?.name}?`, [{ text: "Confirm", style: "destructive", onPress: async () => {
                const updatedSeats = [...roomData.seats];
                updatedSeats[seatIndex] = { uid: null, name: null, image: null, isMuted: false };
                await updateDoc(doc(db, "forum_rooms", roomId), { seats: updatedSeats });
                setActionSheetVisible(false);
            }}, { text: "Cancel" }]);
        } else {
            setActionSheetVisible(false);
        }
    };

    const handleEndForum = () => {
        Alert.alert("Close Forum?", "This will terminate the session.", [
            { text: "Cancel", style: "cancel" },
            { text: "Terminate", style: "destructive", onPress: async () => {
                await updateDoc(doc(db, "forum_rooms", roomId), { status: "ended" });
                router.replace('/expert/dashboard' as any);
            }}
        ]);
    };

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

    const handleBlockUser = async (showAlert = true) => {
        if (!selectedUser || !user) return;
        try {
            await updateDoc(doc(db, "users", user.uid), {
                blockedUsers: arrayUnion(selectedUser.id)
            });

            await updateDoc(doc(db, "forum_rooms", roomId), {
                bannedUsers: arrayUnion(selectedUser.id)
            });

            if (roomData && roomData.seats) {
                const seatIndex = roomData.seats.findIndex((s: any) => s.uid === selectedUser.id);
                if (seatIndex !== -1) {
                    const updatedSeats = [...roomData.seats];
                    updatedSeats[seatIndex] = { uid: null, name: null, image: null, isMuted: false };
                    await updateDoc(doc(db, "forum_rooms", roomId), { seats: updatedSeats });
                }
            }

            const rtdb = getDatabase();
            await set(ref(rtdb, `forum_rooms/${roomId}/kicked_users/${selectedUser.id}`), true);

            await addDoc(collection(db, "forum_rooms", roomId, "messages"), {
                uid: "system",
                name: "System",
                text: `🚫 ${selectedUser.name} was blocked and removed from the forum.`,
                timestamp: serverTimestamp(),
                isSystem: true
            });

            if (showAlert) Alert.alert("Blocked", `${selectedUser.name} has been permanently blocked and removed.`);
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
            Alert.alert("Reported & Blocked", `User reported to Admin for: ${reason} and has been removed.`);
        } catch (e) { console.log(e); }
        setReportSheetVisible(false);
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <LinearGradient colors={['#05070F', '#0A0A1A', '#020617']} style={StyleSheet.absoluteFill} />
                <ActivityIndicator size="large" color="#22D3EE" />
                <Text style={{ color: '#22D3EE', marginTop: 15, fontWeight: '900', letterSpacing: 2 }}>ENTERING ARENA...</Text>
            </View>
        );
    }

    if (!roomData) return null;

    // 🆕 derived values (no hooks below)
    const headerY = headerEnter.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] });
    const headerRotX = headerEnter.interpolate({ inputRange: [0, 1], outputRange: ['-35deg', '0deg'] });
    const bottomY = bottomEnter.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
    const hostFallbackPic = expertData?.profilePic || expertData?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(expertData?.name || 'Host')}&background=1E1B4B&color=fff&size=600`;
    // 🆕 BACKGROUND IMAGE: seat-la last user image, yaarum illana host image
    const backdropUri = spotlight?.image || hostFallbackPic;
    // 🆕 sheets: nav bar mela lift (waiting list "kila poi maraiyuthu" fix)
    const sheetBottom = Math.max(insets.bottom, 12) + 28;

    return (
        <View style={styles.container}>
            {/* 🌌 BASE (very dark) */}
            <LinearGradient colors={['#05070F', '#0A0A1A', '#020617']} style={StyleSheet.absoluteFill} />

            {/* 🖼️ LAST-SEATED USER IMAGE = FULL SCREEN BACKGROUND (live/zoom illa, static + smooth cross-fade) */}
            <Backdrop uri={backdropUri} />

            {/* 🌑 DARK OVERLAY (🆕 darkness romba kammi - background image nala theriyum, text still readable) */}
            <LinearGradient colors={['rgba(2,4,12,0.30)', 'rgba(2,4,12,0.16)', 'rgba(2,4,12,0.48)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <LinearGradient colors={['rgba(167,139,250,0.06)', 'rgba(0,0,0,0)', 'rgba(34,211,238,0.06)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />

            {/* 🆕 twinkles + gold dust */}
            <TwinkleStar x={width * 0.12} y={height * 0.2} size={11} color="#67E8F9" delay={0} />
            <TwinkleStar x={width * 0.82} y={height * 0.17} size={9} color="#C4B5FD" delay={500} />
            <TwinkleStar x={width * 0.9} y={height * 0.36} size={10} color="#F472B6" delay={900} />
            <TwinkleStar x={width * 0.06} y={height * 0.4} size={8} color="#FFFFFF" delay={1300} />
            <GoldDust />

            {/* 🆕 bottom edge SafeArea illa - dock nala kila (screen bottom-ku) varum, insets manually add pannrom */}
            <SafeAreaView style={{ flex: 1 }} edges={['top', 'left', 'right']}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                    enabled={Platform.OS === 'ios'}
                    style={{ flex: 1 }}
                >
                    {/* 🔮 FLOATING 3D GLASS HEADER (🆕 neon border, gold illa) */}
                    <Animated.View style={[styles.headerWrap, { opacity: headerEnter, transform: [{ perspective: 1000 }, { translateY: headerY }, { rotateX: headerRotX }] }]}>
                        <LinearGradient colors={NEON_BORDER as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headerBorder}>
                            <BlurView intensity={90} tint="dark" style={styles.header}>
                                <LinearGradient colors={['rgba(34,211,238,0.14)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                <View style={styles.headerTop}>
                                    <PressScale onPress={handleEndForum} style={styles.iconBtn}>
                                        <Ionicons name="power" size={22} color="#FCA5A5" />
                                    </PressScale>
                                    <View style={styles.roomInfo}>
                                        <Text style={styles.roomName} numberOfLines={1}>{roomData.roomName}</Text>
                                        <View style={styles.hostRow}>
                                            <PulseDot color={isAgoraJoined ? '#10B981' : '#F59E0B'} size={6} />
                                            <Text style={styles.hostName} numberOfLines={1}>👑 Host {isAgoraJoined ? "• Active" : "• Synchronizing..."}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.beanBadge}>
                                        <Img3D uri={IMG.coin} size={18} fallback="wallet-outline" color="#FBBF24" />
                                        <Text style={styles.beanText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{expertData?.walletBalance || 0}</Text>
                                    </View>
                                </View>
                                <View style={styles.headerDivider} />
                                <View style={styles.rewardStrip}>
                                    <Text style={styles.rewardLabel} numberOfLines={1}>🎖️ FORUM REWARDS</Text>
                                    <Text style={styles.rewardValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{forumRewards.toLocaleString()}</Text>
                                </View>
                            </BlurView>
                        </LinearGradient>
                    </Animated.View>

                    {/* 🪑 ROYAL SEATS (🆕 periya box illa - seats appadiye screen mela, spotlight pill remove panniyachu) */}
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
                                        label={seat.uid === user?.uid ? "YOU" : (seat.uid ? seat.name : "Empty")}
                                        onPress={() => handleSeatClick(index)}
                                    />
                                ))}
                            </View>
                        </View>
                    </View>

                    {/* 💬 DARK GLASS CHAT (🆕 double contrast borders) */}
                    <View style={styles.chatArea}>
                        <FlatList
                            data={messages}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item, index }) => {
                                const fade = Math.max(0.78, 1 - index * 0.03);

                                if (item.isSystem) {
                                    return (
                                        <ChatPop style={{ alignSelf: 'center', opacity: fade, maxWidth: '96%' }}>
                                            <TouchableOpacity activeOpacity={0.8} onPress={() => handleUserClick(item)}>
                                                <LinearGradient colors={['#34D399', '#A78BFA', '#F472B6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sysBorder}>
                                                    <View style={styles.sysPill}>
                                                        <PulseDot color="#34D399" size={5} />
                                                        <Text style={styles.sysText}>{item.text}</Text>
                                                    </View>
                                                </LinearGradient>
                                            </TouchableOpacity>
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

                    {/* 🎛️ BOTTOM DOCK (🆕 screen bottom-ku nala kila + keyboard mela lift) */}
                    <Animated.View
                        ref={bottomRef}
                        collapsable={false}
                        style={[styles.bottomArea, { paddingBottom: Math.max(insets.bottom, 4) + 4, marginBottom: kbLift, opacity: bottomEnter, transform: [{ translateY: bottomY }] }]}
                    >
                        <View style={styles.reactionRow}>
                            {REACTION_EMOJIS.map(emoji => (
                                <PressScale key={emoji} onPress={() => handleReaction(emoji)} style={styles.reactionBtn}>
                                    <Text style={{fontSize: 20}}>{emoji}</Text>
                                </PressScale>
                            ))}
                        </View>
                        <LinearGradient colors={NEON_BORDER as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.controlsBorder}>
                            <BlurView intensity={90} tint="dark" style={styles.controlsBox}>
                                <View style={styles.inputRow}>
                                    <TextInput
                                        value={chatInput}
                                        onChangeText={setChatInput}
                                        placeholder="Sync with the forum..."
                                        placeholderTextColor="#94A3B8"
                                        style={styles.chatInputField}
                                    />
                                    <TouchableOpacity 
                                        style={[styles.sendIconBtn, { opacity: chatInput.trim() ? 1 : 0.5 }]} 
                                        onPress={handleSendChat}
                                        disabled={!chatInput.trim()}
                                    >
                                        <LinearGradient colors={['#22D3EE', '#6366F1']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.sendGrad}>
                                            <Ionicons name="send" size={17} color="#FFFFFF" />
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.actionRow}>
                                    <DockBtn label={isMuted ? 'MUTED' : 'MIC'} onPress={toggleMic} borderColor={isMuted ? 'rgba(252,165,165,0.8)' : 'rgba(165,180,252,0.8)'} bg={isMuted ? 'rgba(239,68,68,0.30)' : 'rgba(99,102,241,0.30)'}>
                                        <Ionicons name={isMuted ? "mic-off" : "mic"} size={21} color={isMuted ? "#FCA5A5" : "#C7D2FE"} />
                                    </DockBtn>

                                    <DockBtn label="QUEUE" onPress={() => setWaitingModalVisible(true)} borderColor="rgba(244,114,182,0.9)" bg="rgba(236,72,153,0.30)" badge={waitingList.length > 0 ? waitingList.length : null}>
                                        <Ionicons name="hourglass-outline" size={21} color="#FBCFE8" />
                                    </DockBtn>

                                    {/* 🔥 TRIGGER DISCLAIMER FOR REFLEX ARENA INSTEAD OF DIRECT LAUNCH 🔥 */}
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

                                    {/* 🔥 TRIGGER DISCLAIMER FOR MEMORY MATCH INSTEAD OF DIRECT LAUNCH 🔥 */}
                                    <DockBtn label="MEMORY" onPress={() => { setPendingGameType('memory'); setDisclaimerVisible(true); }} borderColor="#C084FC" bg="rgba(168, 85, 247, 0.35)">
                                        <View style={{ width: 24, height: 24, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                                            <Text style={{ fontSize: 9 }}>🍎</Text>
                                            <Text style={{ fontSize: 9 }}>🍌</Text>
                                            <Text style={{ fontSize: 9 }}>🍇</Text>
                                            <Text style={{ fontSize: 9 }}>🍓</Text>
                                        </View>
                                    </DockBtn>
                                </View>
                            </BlurView>
                        </LinearGradient>
                    </Animated.View>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {vipEntry && (
                <Animated.View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, justifyContent: 'center', alignItems: 'center', backgroundColor: vipProgress.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)'] }) }]} pointerEvents="none">
                    <Animated.View style={[styles.vipEntryBannerContainer, { transform: getVipTransform(vipEntry.anim) }]}>
                        <LinearGradient colors={vipEntry.themeBg || ['#0A001A', '#000000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.vipBannerGradient}>
                            <TwinkleStar x={18} y={18} size={14} color={vipEntry.color || '#F59E0B'} delay={0} />
                            <TwinkleStar x={width * 0.95 - 55} y={30} size={11} color="#FFFFFF" delay={400} />
                            <TwinkleStar x={30} y={230} size={10} color="#22D3EE" delay={800} />
                            <Image 
                                source={vipEntry.lvl ? getBadgeLocalImage(vipEntry.lvl) : { uri: vipEntry.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(vipEntry.name || 'VIP')}&background=0A001A&color=FFF` }} 
                                style={[styles.vipBannerAvatar, vipEntry.lvl ? { borderWidth: 0, borderRadius: 0 } : { borderColor: vipEntry.color || '#F59E0B' }]} 
                                resizeMode="contain"
                            />
                            <View style={{ alignItems: 'center', marginTop: 15, paddingHorizontal: 10 }}>
                                <Text style={[styles.vipBannerLabel, { color: vipEntry.color || '#F59E0B' }]}>✨ {vipEntry.label || 'VIP MEMBER'} ✨</Text>
                                
                                {vipEntry.lvl && (
                                    <View style={{ backgroundColor: vipEntry.color || '#F59E0B', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12, marginBottom: 8 }}>
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

            <View style={styles.topOverlayLayer} pointerEvents="none">
                <View style={StyleSheet.absoluteFill}>
                    {reactions.map(r => (
                        <FlyingEmoji key={r.id} emoji={r.emoji} onComplete={() => setReactions(prev => prev.filter(item => item.id !== r.id))} />
                    ))}
                </View>

                {currentGift && (
                    <View style={styles.lottieContainer}>
                        <LottieView
                            source={currentGift.price >= 1000 ? require('../../../assets/images/fireworks.json') : require('../../../assets/images/confetti.json')}
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
                                <Text style={styles.giftAnimAmount}>🎖️ {Math.floor((currentGift.price || currentGift.amount || 0) / 2)} REWARDS</Text>
                            </LinearGradient>
                        </Animated.View>
                    </View>
                )}
            </View>

            <LiveGameSheet 
                visible={isGameVisible} 
                onClose={() => setIsGameVisible(false)} 
                liveId={roomId}
                isHost={user?.uid === roomData?.hostId}
                userWalletBalance={myWalletBalance}
            />

            <MemoryMatch 
                visible={glassVisible} 
                onClose={() => setGlassVisible(false)} 
                liveId={roomId} 
                isHost={user?.uid === roomData?.hostId} 
                entryFee={0}
            />

            {/* ⏳ WAITING LIST SHEET (💥 FIX: nav bar mela lift aagi, "kila poi maraiyuthu" problem illa. Modal ippo root level la) */}
            <Modal visible={waitingModalVisible} transparent animationType="slide" onRequestClose={() => setWaitingModalVisible(false)}>
                <View style={styles.waitOverlay}>
                    <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setWaitingModalVisible(false)} />
                    <View style={[styles.waitSheet, { paddingBottom: sheetBottom }]}>
                        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                        <LinearGradient colors={['transparent', 'rgba(34,211,238,0.95)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.topEdgeGlow} pointerEvents="none" />
                        <View style={styles.actionSheetHandle} />
                        <View style={styles.waitHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                                <FloatBox amp={3} dur={1500}>
                                    <Img3D uri={IMG.microphone} size={30} fallback="microphone" color="#FCD34D" />
                                </FloatBox>
                                <Text style={styles.waitTitle} numberOfLines={1}>Waiting List ({waitingList.length})</Text>
                            </View>
                            <TouchableOpacity onPress={() => setWaitingModalVisible(false)} style={styles.waitCloseBtn}>
                                <Ionicons name="close" size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                        {waitingList.length === 0 ? (
                            <View style={{ alignItems: 'center', paddingVertical: 34 }}>
                                <MaterialCommunityIcons name="account-clock-outline" size={42} color="rgba(255,255,255,0.5)" />
                                <Text style={styles.waitEmpty}>Queue is empty</Text>
                            </View>
                        ) : (
                            <ScrollView style={{ maxHeight: height * 0.46 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 6 }}>
                                {waitingList.map((w: any) => (
                                    <LinearGradient key={w.id} colors={['#22D3EE', '#F472B6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.waitCardBorder}>
                                        <View style={styles.waitCard}>
                                            <SpinRing size={50} colors={GOLD_RING} speed={5000}>
                                                <Image source={{ uri: w.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(w.name || 'U')}` }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                                            </SpinRing>
                                            <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
                                                <Text style={styles.waitName} numberOfLines={1}>{w.name || 'User'}</Text>
                                                <Text style={styles.waitMeta} numberOfLines={1}>Level {w.lvl || 1} • {getWaitText(w.requestedAt)}</Text>
                                            </View>
                                            <TouchableOpacity onPress={() => assignWaitingUser(w)} activeOpacity={0.85} style={{ marginRight: 8 }}>
                                                <LinearGradient colors={['#34D399', '#059669']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.waitSeatBtn}>
                                                    <Text style={styles.waitSeatText}>SEAT</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                            <TouchableOpacity onPress={() => removeWaitingUser(w.id)} activeOpacity={0.85} style={styles.waitRemoveBtn}>
                                                <Text style={styles.waitRemoveText}>REMOVE</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </LinearGradient>
                                ))}
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>

            {/* 📞 INCOMING UPLINK (premium) */}
            <Modal visible={ringModalVisible} transparent animationType="fade">
                <BlurView intensity={90} tint="dark" style={styles.ringingOverlay}>
                    <View style={styles.ringingContent}>
                        <Text style={styles.ringConnectingText}>INCOMING UPLINK...</Text>
                        <View style={styles.ringAvatarWrapper}>
                            <Animated.View style={[styles.ringPulseGlow, { transform: [{ scale: pulseAnim }] }]} />
                            <SpinRing size={128} colors={['#10B981', '#22D3EE', '#FFFFFF', '#10B981']} speed={3500}>
                                <View style={styles.ringAvatarContainer}>
                                     {callerProfile?.profilePic || callerProfile?.photoURL || incomingCall?.userImage || incomingCall?.callerImage || incomingCall?.callerPic || incomingCall?.photoURL || incomingCall?.profilePic || incomingCall?.pic || incomingCall?.avatar || incomingCall?.image ? (
                                         <Image 
                                             source={{ uri: callerProfile?.profilePic || callerProfile?.photoURL || incomingCall?.userImage || incomingCall?.callerImage || incomingCall?.callerPic || incomingCall?.photoURL || incomingCall?.profilePic || incomingCall?.pic || incomingCall?.avatar || incomingCall?.image }} 
                                             style={{ width: '100%', height: '100%', borderRadius: 60 }} 
                                         />
                                     ) : (
                                         <Ionicons name="person" size={60} color="#10B981" />
                                     )}
                                </View>
                            </SpinRing>
                        </View>
                        <Text style={styles.ringExpertName} numberOfLines={1}>
                            {callerProfile?.name || callerProfile?.displayName || incomingCall?.userName || incomingCall?.callerName || incomingCall?.name || incomingCall?.displayName || incomingCall?.user_name || "Premium User"}
                        </Text>
                        <Text style={styles.ringTimer}>00:{ringTimer.toString().padStart(2, '0')}</Text>
                        <View style={styles.ringActionRow}>
                            <TouchableOpacity style={[styles.ringActionBtn, { backgroundColor: '#EF4444', shadowColor: '#EF4444' }]} onPress={handleDeclineCall} activeOpacity={0.8}>
                                <MaterialCommunityIcons name="phone-hangup" size={32} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.ringActionBtn, { backgroundColor: '#10B981', shadowColor: '#10B981' }]} onPress={handleAcceptCall} activeOpacity={0.8}>
                                <MaterialCommunityIcons name="phone" size={32} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </BlurView>
            </Modal>

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

                        {roomData?.seats?.some((s: any) => s.uid === selectedUser?.id) && (
                            <>
                                <TouchableOpacity style={styles.actionSheetBtn} onPress={() => handleHostMuteUser(selectedUser?.id)}>
                                    <Ionicons name={roomData.seats.find((s: any) => s.uid === selectedUser?.id)?.hostMuted ? "mic" : "mic-off"} size={22} color="#22D3EE" />
                                    <Text style={[styles.actionSheetBtnText, { color: '#A5F3FC' }]}>{roomData.seats.find((s: any) => s.uid === selectedUser?.id)?.hostMuted ? "Unmute User" : "Mute User"}</Text>
                                </TouchableOpacity>
                                <View style={styles.actionSheetDivider} />
                                <TouchableOpacity style={styles.actionSheetBtn} onPress={() => handleDisconnectUser(selectedUser?.id)}>
                                    <Ionicons name="mic-off-circle-outline" size={22} color="#F59E0B" />
                                    <Text style={[styles.actionSheetBtnText, { color: '#FCD34D' }]}>Remove from Seat</Text>
                                </TouchableOpacity>
                                <View style={styles.actionSheetDivider} />
                            </>
                        )}

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

            {/* 🔥 PLAY STORE COMPLIANT HOST GAMING DISCLAIMER MODAL 🔥 */}
            <Modal visible={disclaimerVisible} transparent animationType="slide">
                <View style={styles.actionSheetOverlay}>
                    <View style={[styles.actionSheetContainer, { paddingBottom: sheetBottom }]}>
                        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={styles.actionSheetHandle} />
                        <Text style={[styles.actionSheetTitle, { marginBottom: 15, color: '#22D3EE' }]}>🛡️ Host Skill Gaming Policy</Text>

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
                            <Ionicons name={disclaimerChecked ? "checkbox" : "square-outline"} size={24} color={disclaimerChecked ? "#10B981" : "#CBD5E1"} />
                            <Text style={styles.checkboxText}>I confirm that I understand my role as a Host, that games are free to play, and agree not to disrupt active games.</Text>
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
                                    if (pendingGameType === 'reflex') setIsGameVisible(true);
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
    shimmerOrb: { position: 'absolute', width: 320, height: 320, borderRadius: 160, opacity: 0.28 },

    // 🔮 HEADER (floating 3D glass, 🆕 neon gradient border)
    headerWrap: { paddingHorizontal: 14, paddingTop: 6, paddingBottom: 6, zIndex: 10 },
    headerBorder: { borderRadius: 30, padding: 1.4 },
    header: { flexDirection: 'column', paddingHorizontal: 14, paddingVertical: 12, borderRadius: 28.6, overflow: 'hidden', backgroundColor: 'rgba(3, 5, 18, 0.84)' },
    iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(239,68,68,0.20)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(252,165,165,0.55)' },
    headerTop: { flexDirection: 'row', alignItems: 'center', height: 44 },
    headerDivider: { height: 1, backgroundColor: 'rgba(34,211,238,0.30)', marginTop: 10, marginBottom: 8 },
    rewardStrip: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 6, minHeight: 22, gap: 12 },
    rewardLabel: { color: '#CBD5E1', fontSize: 10.5, fontWeight: '900', letterSpacing: 1.2, flexShrink: 1 },
    rewardValue: { color: '#22D3EE', fontSize: 14, fontWeight: '900', letterSpacing: 0.5, maxWidth: '50%', textAlign: 'right' },
    roomInfo: { flex: 1, marginHorizontal: 12, justifyContent: 'center', minWidth: 0 },
    roomName: { color: '#FFF', fontSize: 17, fontWeight: '900', letterSpacing: 0.3, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
    hostRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
    hostName: { color: '#6EE7B7', fontSize: 11.5, fontWeight: '800', flexShrink: 1, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
    beanBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minWidth: 84, maxWidth: 110, height: 36, gap: 6, backgroundColor: 'rgba(34,211,238,0.14)', paddingHorizontal: 10, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(34,211,238,0.6)' },
    beanText: { color: '#A5F3FC', fontSize: 12, fontWeight: '900', flexShrink: 1 },
    rewardPill: { alignSelf: 'flex-start', marginTop: 5, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
    rewardText: { color: '#E0F2FE', fontSize: 10.5, fontWeight: '900', letterSpacing: 0.3 },

    // 👑 ROYAL SEATS (🆕 box/panel illa - seats direct-a screen mela, chinna + space save)
    seatsContainer: { paddingHorizontal: 14, paddingTop: 0, paddingBottom: 0 },
    spotPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 8, backgroundColor: 'rgba(3,5,18,0.82)', borderWidth: 1, borderColor: 'rgba(233,196,106,0.45)', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, marginBottom: 8, maxWidth: '86%' },
    spotLabel: { color: '#E9C46A', fontSize: 9.5, fontWeight: '900', letterSpacing: 2 },
    spotName: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', flexShrink: 1 },
    stagePanel: { backgroundColor: 'transparent', borderRadius: 0, borderWidth: 0, borderColor: 'transparent', paddingHorizontal: 12, paddingTop: 2, paddingBottom: 0 },
    seatsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', columnGap: SEAT_GAP, rowGap: 0 },
    seatWrapper: { alignItems: 'center', width: SEAT_W, paddingTop: 7 },
    seatOuter: { width: SEAT_BOX, height: SEAT_BOX, justifyContent: 'center', alignItems: 'center' },
    emptyCircle: { position: 'absolute', width: SEAT_RING, height: SEAT_RING, borderRadius: SEAT_RING / 2, backgroundColor: 'rgba(0,0,0,0.35)', borderWidth: 1.8, borderColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed' },
    seatAvatar: { width: SEAT_IMG, height: SEAT_IMG, borderRadius: SEAT_IMG / 2 },
    seatGlow: { position: 'absolute', width: SEAT_RING - 6, height: SEAT_RING - 6, borderRadius: (SEAT_RING - 6) / 2, opacity: 0.55 },
    seatNumGem: { position: 'absolute', bottom: 0, left: 0, width: 17, height: 17, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.55)' },
    seatNumText: { color: '#2B1500', fontSize: 9, fontWeight: '900', includeFontPadding: false },
    seatChairBadge: { position: 'absolute', bottom: 0, right: 0, width: 17, height: 17, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#0B1026' },
    seatPedestal: { width: SEAT_BOX - 10, height: 3, borderRadius: 2, marginTop: 2 },
    namePlate: { marginTop: 3, paddingHorizontal: 8, paddingVertical: 1, maxWidth: SEAT_W, minWidth: SEAT_W - 14, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.60)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.40)', alignItems: 'center' },
    namePlateMe: { borderColor: 'rgba(253,230,138,0.85)', backgroundColor: 'rgba(233,196,106,0.16)' },
    namePlateEmpty: { backgroundColor: 'rgba(0,0,0,0.45)', borderColor: 'rgba(255,255,255,0.14)' },
    seatStatusDot: { position: 'absolute', top: 2, right: 2, width: 11, height: 11, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#0B1026' },
    seatCrown: { position: 'absolute', top: -10, alignSelf: 'center' },
    muteOverlay: { position: 'absolute', backgroundColor: 'rgba(239,68,68,0.75)', width: '100%', height: '100%', borderRadius: 40, justifyContent: 'center', alignItems: 'center' },
    seatName: { color: '#FFFFFF', fontSize: 10, fontWeight: '800', textAlign: 'center', maxWidth: SEAT_W - 16 },

    // 💬 CHAT (🆕 dark glass panel + double-contrast borders, margins kammi = neraya space)
    chatArea: { flex: 1, marginHorizontal: 14, marginTop: 2, marginBottom: 6, backgroundColor: 'rgba(3,5,18,0.45)', borderRadius: 26, borderWidth: 1, borderColor: 'rgba(34,211,238,0.35)', overflow: 'hidden' },
    chatBorder: { borderRadius: 18, padding: 1.6, marginBottom: 10 },
    chatBubble: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(4,7,22,0.96)', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 16.5 },
    chatInitial: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    chatInitialText: { color: '#0B1026', fontSize: 13, fontWeight: '900' },
    chatName: { color: '#67E8F9', fontWeight: '900', fontSize: 12, letterSpacing: 0.3, marginBottom: 2 },
    chatText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700', lineHeight: 20, flexShrink: 1 },
    sysBorder: { borderRadius: 18, padding: 1.6, marginBottom: 10 },
    sysPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(4,7,22,0.96)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16.5 },
    sysText: { color: '#A7F3D0', fontWeight: '800', fontSize: 12.5, textAlign: 'center', flexShrink: 1, lineHeight: 18 },

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

    topOverlayLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1000, elevation: 1000 },
    lottieContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    giftAnimationContainer: { alignItems: 'center', justifyContent: 'center' },
    giftAnimIcon: { fontSize: 150, textShadowColor: 'rgba(255,255,255,0.8)', textShadowRadius: 40 },
    giftAnimLabel: { alignItems: 'center', marginTop: -15, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25 },
    giftAnimSender: { color: '#FCD34D', fontSize: 16, fontWeight: '900', letterSpacing: 1.2 },
    giftAnimAmount: { color: '#FFF', fontSize: 32, fontWeight: '900', marginTop: 5, textShadowColor: '#F59E0B', textShadowRadius: 15 },

    // ⏳ WAITING LIST SHEET
    waitOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
    waitSheet: { backgroundColor: 'rgba(6, 9, 28, 0.94)', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 14, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(34,211,238,0.40)', borderBottomWidth: 0, maxHeight: height * 0.72 },
    topEdgeGlow: { position: 'absolute', top: 0, left: 20, right: 20, height: 1.5 },
    waitHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    waitTitle: { color: '#FFF', fontSize: 17, fontWeight: '900', flexShrink: 1 },
    waitCloseBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.14)', justifyContent: 'center', alignItems: 'center' },
    waitEmpty: { color: '#E2E8F0', textAlign: 'center', marginTop: 10, fontWeight: '700' },
    waitCardBorder: { borderRadius: 18, padding: 1.4, marginBottom: 12 },
    waitCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(4,7,22,0.96)', padding: 12, borderRadius: 16.6 },
    waitName: { color: '#FFF', fontWeight: '800', fontSize: 14 },
    waitMeta: { color: '#CBD5E1', fontSize: 11, marginTop: 3 },
    waitSeatBtn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12 },
    waitSeatText: { color: '#FFFFFF', fontWeight: '900', fontSize: 11, letterSpacing: 1 },
    waitRemoveBtn: { backgroundColor: 'rgba(239,68,68,0.28)', borderWidth: 1, borderColor: 'rgba(252,165,165,0.5)', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 12 },
    waitRemoveText: { color: '#FCA5A5', fontWeight: '900', fontSize: 10.5 },

    // 📞 INCOMING UPLINK
    ringingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(2, 6, 23, 0.5)' },
    ringingContent: { alignItems: 'center', justifyContent: 'center' },
    ringConnectingText: { color: '#34D399', fontSize: 14, fontWeight: '900', letterSpacing: 4, marginBottom: 50 },
    ringAvatarWrapper: { justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    ringPulseGlow: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 2, borderColor: '#10B981', opacity: 0.4 },
    ringAvatarContainer: { width: 120, height: 120, borderRadius: 60, zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }, 
    ringExpertName: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 1, marginBottom: 5, maxWidth: width * 0.85, textAlign: 'center' },
    ringTimer: { color: '#CBD5E1', fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 50 },
    ringActionRow: { flexDirection: 'row', gap: 40 },
    ringActionBtn: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', elevation: 15, shadowOpacity: 0.6, shadowRadius: 15 },

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
