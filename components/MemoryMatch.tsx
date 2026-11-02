import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, onSnapshot, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, FlatList, Image, Modal, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

const COLOR_POOL = [
    { name: 'RED', colorCode: '#FF2A5F' },
    { name: 'BLUE', colorCode: '#00F2FE' },
    { name: 'GREEN', colorCode: '#10B981' },
    { name: 'YELLOW', colorCode: '#FFD700' },
    { name: 'PURPLE', colorCode: '#A855F7' }, 
    { name: 'ORANGE', colorCode: '#F97316' }  
];

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

// 🔥 15 Pairs (13 Normal, 1 Jackpot, 1 Trap) for the 30-Card Grid 🔥
const EMOJI_PAIRS = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒', '🍍', '🥝', '🥑', '🥕', '🌽', '🍩', '🍕', '💎', '☠️'];

// 🆕 BACKGROUND IMAGE (starry nebula)
const BG_IMG = 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1080&q=70';

// 🆕 3D IMAGES (icons8 3D Fluency) - load aagalana automatic-a icon fallback varum
const IMG = {
    trophy: 'https://img.icons8.com/3d-fluency/512/trophy.png',
    star: 'https://img.icons8.com/3d-fluency/512/star.png',
    diamond: 'https://img.icons8.com/3d-fluency/512/diamond.png',
    crown: 'https://img.icons8.com/3d-fluency/512/crown.png',
    gift: 'https://img.icons8.com/3d-fluency/512/gift.png',
};

// 🆕 GAME RULES (shown when the "GAME RULES" chip is tapped) - matches the real game logic
const GAME_RULES = [
    { icon: 'game-controller', color: '#10B981', title: 'FREE TO PLAY', text: 'No entry fee. No coins are won or lost. Play for the top spot and the winner crown!' },
    { icon: 'people', color: '#00F2FE', title: 'JOIN THE ARENA', text: `The host opens the arena, then up to ${MAX_PLAYERS} players can join. At least ${MIN_PLAYERS} players are needed to start. The host can also join and play.` },
    { icon: 'timer', color: '#FF2A5F', title: '60 SECOND MATCH', text: 'Find all 15 pairs (30 cards) before the 60 second timer ends.' },
    { icon: 'albums', color: '#A855F7', title: 'HOW TO PLAY', text: 'Tap two cards. Same picture = a pair, it stays open with a tick. Different pictures flip back, so remember where they are!' },
    { icon: 'flash', color: '#FFD700', title: 'SCORING & COMBO', text: 'Each pair gives +100 x your combo. Every pair in a row raises the combo. A wrong match resets the combo back to x1.' },
    { icon: 'diamond', color: '#FFD700', title: 'JACKPOT PAIR', text: 'The diamond pair gives +300 x your combo and raises the combo too.' },
    { icon: 'skull', color: '#EF4444', title: 'TRAP PAIR', text: 'The skull pair costs -200 points and blinds your board for 3 seconds.' },
    { icon: 'lock-closed', color: '#F97316', title: '5 MISTAKES = LOCK', text: '5 wrong matches in a row locks your board for 3 seconds.' },
    { icon: 'trophy', color: '#FFD700', title: 'WINNER', text: 'Match all 15 pairs first to get +1000 bonus and win instantly. Otherwise the highest score when time ends wins. Equal top scores = tie. If nobody scored, there is no winner.' },
    { icon: 'warning', color: '#F59E0B', title: "DON'T LEAVE", text: 'Do not close the app during the match. If the host closes the app from recent tabs, the arena ends for all players and action may be taken against the host account.' },
];

// 🆕 COLOR HELPERS
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

// 🆕 PHOTO UPDATE: profile photo field name entha name-la irunthalum pick pannum (users/{uid} document)
const pickPhoto = (u: any): string => {
    if (!u) return '';
    return u.profilePic || u.photoURL || u.photoUrl || u.profileImage || u.profilePicture || u.avatar || u.image || u.imageUrl || u.photo || u.dp || '';
};

// 🆕 3D image with auto icon fallback
const Img3D = ({ uri, size, fallback, color = '#FFF', style }: any) => {
    const [err, setErr] = useState(false);
    if (err) return <Ionicons name={fallback} size={size * 0.7} color={color} />;
    return <Image source={{ uri }} style={[{ width: size, height: size }, style]} resizeMode="contain" onError={() => setErr(true)} />;
};

// 🆕 PHOTO UPDATE: Player avatar - shows profile photo, falls back to coloured initial if no photo / load fails
const Avatar = ({ uri, name, size, color = '#A855F7', textSize }: any) => {
    const [err, setErr] = useState(false);
    useEffect(() => { setErr(false); }, [uri]);
    const r = size / 2;
    if (uri && !err) {
        return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: r, backgroundColor: '#0B1224' }} resizeMode="cover" onError={() => setErr(true)} />;
    }
    return (
        <LinearGradient
            colors={[darken(color, 0.15), darken(color, 0.7)]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: size, height: size, borderRadius: r, justifyContent: 'center', alignItems: 'center' }}
        >
            <Text style={{ color: '#FFF', fontSize: textSize || size * 0.42, fontWeight: '900' }}>{(name || 'P').charAt(0).toUpperCase()}</Text>
        </LinearGradient>
    );
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
            <Ionicons name="sparkles" size={size} color={color} />
        </Animated.View>
    );
};

// 🆕 Pulse dot (live)
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
        <View style={{ width: size + 8, height: size + 8, justifyContent: 'center', alignItems: 'center', marginRight: 4 }}>
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

// 🆕 ORBIT RING (rotating dashed ring + glowing satellite dot) - 3D orbit feel
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

// 🆕 RADIAL TICK GAUGE (lobby countdown ring - ticks light up)
const GaugeRing = ({ progress, color, size = 232, ticks = 56, dur = 900 }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    const [lit, setLit] = useState(0);
    const tickArr = useRef(Array.from({ length: ticks }, (_, i) => i)).current;
    useEffect(() => {
        const id = v.addListener(({ value: val }) => {
            const n = Math.round(val * ticks);
            setLit(prev => (prev === n ? prev : n));
        });
        Animated.timing(v, { toValue: Math.max(0, Math.min(1, progress || 0)), duration: dur, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
        return () => v.removeListener(id);
    }, [progress]);
    const radius = size / 2 - 10;
    return (
        <View pointerEvents="none" style={{ width: size, height: size, position: 'absolute' }}>
            {tickArr.map(i => {
                const isLit = i < lit;
                const isEdge = i === lit - 1;
                return (
                    <View
                        key={i}
                        style={{
                            position: 'absolute',
                            left: size / 2 - 2,
                            top: size / 2 - (isEdge ? 8 : 6),
                            width: 4,
                            height: isEdge ? 16 : 12,
                            borderRadius: 2,
                            backgroundColor: isLit ? color : 'rgba(255,255,255,0.12)',
                            shadowColor: color,
                            shadowOpacity: isLit ? 0.9 : 0,
                            shadowRadius: 5,
                            shadowOffset: { width: 0, height: 0 },
                            transform: [{ rotate: `${(i * 360) / ticks}deg` }, { translateY: -radius }]
                        }}
                    />
                );
            })}
        </View>
    );
};

// 🆕 3D FLIP MEMORY CARD (same visuals logic as old card: back = hex icon, front = emoji / tick when matched)
// 🆕 FULL SCREEN BOARD: `size` prop lets the grid scale the cards so the whole screen is covered
const MemoryCard = ({ index, item, isFlipped, isMatched, disabled, onPress, size }: any) => {
    const flip = useRef(new Animated.Value(isFlipped ? 1 : 0)).current;
    const enter = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(enter, { toValue: 1, delay: Math.min(index, 29) * 25, friction: 6, tension: 60, useNativeDriver: true }).start();
    }, []);

    useEffect(() => {
        Animated.spring(flip, { toValue: isFlipped ? 1 : 0, friction: 7, tension: 80, useNativeDriver: true }).start();
    }, [isFlipped]);

    const backRot = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
    const frontRot = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

    return (
        <Animated.View style={{ opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }}>
            <TouchableOpacity 
                activeOpacity={0.8}
                disabled={disabled}
                style={[
                    styles.card, 
                    size ? { width: size, height: size, borderRadius: Math.max(8, Math.round(size * 0.16)) } : null,
                    isFlipped && styles.neonGlowBlue, 
                    isMatched && styles.neonGlowGreen
                ]}
                onPress={onPress}
            >
                {/* FRONT FACE (emoji / tick) */}
                <Animated.View style={[styles.cardFace, { transform: [{ perspective: 600 }, { rotateY: frontRot }] }]}>
                    <LinearGradient 
                        colors={isMatched ? ['rgba(16,185,129,0.3)', 'rgba(5,150,105,0.1)'] : ['#00F2FE', '#0284C7']} 
                        style={styles.boxGradient}
                    >
                        {isMatched ? (
                            <Ionicons name="checkmark-done" size={size ? Math.round(size * 0.45) : 20} color="#10B981" />
                        ) : (
                            <Text style={[styles.cardEmojiText, size ? { fontSize: Math.round(size * 0.5) } : null]}>{item}</Text>
                        )}
                    </LinearGradient>
                </Animated.View>

                {/* BACK FACE (hex pattern) */}
                <Animated.View style={[styles.cardFace, { transform: [{ perspective: 600 }, { rotateY: backRot }] }]}>
                    <View style={styles.cardBack}>
                        <LinearGradient colors={['rgba(168,85,247,0.28)', 'rgba(0,242,254,0.10)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                        <MaterialCommunityIcons name="hexagon-slice-6" size={size ? Math.round(size * 0.45) : 20} color="rgba(255,255,255,0.28)" />
                    </View>
                </Animated.View>
            </TouchableOpacity>
        </Animated.View>
    );
};

interface GlassPathProps {
    visible: boolean;
    onClose: () => void;
    liveId: string;
    isHost: boolean;
    entryFee?: number; // 🆓 Game is free now. Prop kept optional so existing callers don't break.
    userWalletBalance?: number;
    collectionName?: string; 
}

// 🔥 Optimized PlayerItem Component outside to fix VirtualizedList Warning 🔥
const PlayerItem = React.memo(({ item }: { item: any }) => (
    <View style={{ alignItems: 'center', marginRight: 15 }}>
        <View style={[styles.playerAvatarWrapper, (item.status === 'eliminated' || item.status === 'time_up') && styles.eliminatedAvatar, { marginRight: 0 }]}>
            {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.playerAvatar} />
            ) : (
                <View style={styles.playerInitials}><Text style={styles.initialText}>{item.name?.charAt(0)}</Text></View>
            )}
            {(item.status === 'eliminated' || item.status === 'time_up') && <View style={styles.crossOverlay}><Ionicons name="close" size={20} color="#EF4444" /></View>}
        </View>
        <Text style={styles.scoreText}>{item.score || 0} Pts</Text>
    </View>
));

export default function GlassPathSheet({ visible, onClose, liveId, isHost, userWalletBalance = 0, collectionName = 'lives' }: GlassPathProps) {
    const insets = useSafeAreaInsets(); // 🆕 FULL SCREEN: safe area padding for notch / nav bar

    const [gameStatus, setGameStatus] = useState<'WAITING' | 'SHUFFLING' | 'PLAYING' | 'FINISHED' | 'CANCELLED'>('WAITING');
    const [players, setPlayers] = useState<any[]>([]);
    // 🆓 isFeeLocked now simply means "Arena is OPEN for joining" (Firestore field name kept for compatibility)
    const [isFeeLocked, setIsFeeLocked] = useState<boolean>(false);
    const [hostId, setHostId] = useState<string>('');
    const [matchResults, setMatchResults] = useState<any>(null); 
    const [isProcessing, setIsProcessing] = useState<boolean>(false); 
    const [lobbyTimeLeft, setLobbyTimeLeft] = useState<number>(45); 
    
    // --- Memory Match Engine States ---
    const [deck, setDeck] = useState<string[]>([]);
    const [myOpenCards, setMyOpenCards] = useState<number[]>([]);
    const [myMatchedPairs, setMyMatchedPairs] = useState<string[]>([]);
    const [isChecking, setIsChecking] = useState<boolean>(false);

    // 🆕 FULL SCREEN BOARD: measured size of the board area (cards scale to fill it)
    const [gridBox, setGridBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

    // 🔥 Twist States 🔥
    const [consecutiveMistakes, setConsecutiveMistakes] = useState<number>(0);
    const [isFrozen, setIsFrozen] = useState<boolean>(false);
    const [isBlackout, setIsBlackout] = useState<boolean>(false);
    const [showJackpotFlash, setShowJackpotFlash] = useState<boolean>(false);

    // 🔥 Score & Combo States 🔥
    const [myProgress, setMyProgress] = useState(0); 
    const [myScore, setMyScore] = useState<number>(0);
    const [myCombo, setMyCombo] = useState<number>(1);
    const [myStatus, setMyStatus] = useState<'idle' | 'playing' | 'eliminated' | 'won' | 'time_up'>('idle');
    
    // 60-Second Panic Timer
    const [timeLeftToCross, setTimeLeftToCross] = useState<number>(60); 

    // 🆕 GAME RULES popup state
    const [showRules, setShowRules] = useState<boolean>(false);
    const rulesAnim = useRef(new Animated.Value(0)).current;

    // 🆕 PREMIUM ANIMATION VALUES
    const heroIn = useRef(new Animated.Value(0)).current;      // stage entrance
    const rotAnim = useRef(new Animated.Value(0)).current;    // core spinning ring
    const shimmerAnim = useRef(new Animated.Value(0)).current; // ambient orb drift
    const sweepAnim = useRef(new Animated.Value(0)).current;   // shine sweep
    const timeAnim = useRef(new Animated.Value(1)).current;    // 60s timeline bar
    const scoreBump = useRef(new Animated.Value(1)).current;   // score pop
    const [bgErr, setBgErr] = useState(false);
    const particles = useRef(
        Array.from({ length: 12 }, (_, i) => ({
            v: new Animated.Value(0),
            x: ((i * 41) % 100) / 100 * width,
            y: 140 + ((i * 59) % Math.max(300, Math.floor(height * 0.6))),
            size: 2 + (i % 3),
            dur: 6500 + (i % 5) * 1200,
            delay: i * 500,
        }))
    ).current;
    const PARTICLE_COLORS = ['#A855F7', '#00F2FE', '#FFD700', '#FFFFFF'];

    const hasJoined = players.some(p => p.id === auth.currentUser?.uid);

    // 🔥 SATTI FIX: Auto-detect forum vs live based on ID 🔥
    const actualCollection = liveId?.startsWith('forum_') ? 'forum_rooms' : collectionName;
    const roomRef = doc(db, actualCollection, liveId, 'games', 'memory_match');

    const pan = useRef(new Animated.ValueXY()).current;
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: () => {
                pan.flattenOffset();
            }
        })
    ).current;

    // 🆕 One-time premium animations (re-run every time the arena opens, stopped when closed)
    useEffect(() => {
        if (!visible) { setShowRules(false); return; }
        heroIn.setValue(0);
        Animated.spring(heroIn, { toValue: 1, friction: 6, tension: 45, useNativeDriver: true }).start();

        const loops: Animated.CompositeAnimation[] = [];
        const rotLoop = Animated.loop(Animated.timing(rotAnim, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true }));
        rotLoop.start(); loops.push(rotLoop);

        const shimLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        shimLoop.start(); loops.push(shimLoop);

        const sweepLoop = Animated.loop(
            Animated.sequence([
                Animated.delay(2000),
                Animated.timing(sweepAnim, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(sweepAnim, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        );
        sweepLoop.start(); loops.push(sweepLoop);

        particles.forEach((p) => {
            const l = Animated.loop(
                Animated.sequence([
                    Animated.delay(p.delay),
                    Animated.timing(p.v, { toValue: 1, duration: p.dur, easing: Easing.linear, useNativeDriver: true }),
                    Animated.timing(p.v, { toValue: 0, duration: 0, useNativeDriver: true })
                ])
            );
            l.start(); loops.push(l);
        });

        return () => { loops.forEach(l => l.stop()); };
    }, [visible]);

    // 🆕 60s timeline bar follows the timer
    useEffect(() => {
        if (gameStatus === 'PLAYING') {
            Animated.timing(timeAnim, { toValue: Math.max(0, (timeLeftToCross - 1) / 60), duration: 1000, easing: Easing.linear, useNativeDriver: false }).start();
        } else {
            timeAnim.setValue(1);
        }
    }, [timeLeftToCross, gameStatus]);

    // 🆕 score pop animation
    useEffect(() => {
        Animated.sequence([
            Animated.timing(scoreBump, { toValue: 1.25, duration: 110, useNativeDriver: true }),
            Animated.timing(scoreBump, { toValue: 1, duration: 140, useNativeDriver: true })
        ]).start();
    }, [myScore]);

    useEffect(() => {
        if (!liveId || !visible || isHost) return;
        const parentRoomRef = doc(db, actualCollection, liveId);
        
        const unsubParent = onSnapshot(parentRoomRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.status === 'ended' || data.status === 'CANCELLED') {
                    handleHostDropExit();
                }
            }
        });

        return () => unsubParent();
    }, [liveId, visible, isHost, actualCollection]);

    // 🆓 Host dropped / room ended: just remove the player from the arena and close (no wallet logic)
    const handleHostDropExit = async () => {
        if (!auth.currentUser || isProcessing) return;
        const uid = auth.currentUser.uid;
        try {
            await runTransaction(db, async (transaction) => {
                const gameSnap = await transaction.get(roomRef);

                if (!gameSnap.exists()) return;
                const gameData = gameSnap.data();

                if (gameData.status === 'FINISHED' || gameData.status === 'CANCELLED') return;

                const currentPlayers = gameData.players || [];
                const myPlayerObj = currentPlayers.find((p: any) => p.id === uid);
                if (!myPlayerObj) return; 

                const updatedPlayers = currentPlayers.filter((p: any) => p.id !== uid);
                transaction.update(roomRef, { players: updatedPlayers });
            });
            onClose(); 
        } catch (e) {
            console.log("Host drop exit error:", e);
        }
    };

    useEffect(() => {
        if (!liveId || !visible) return;

        if (isHost) {
            getDoc(roomRef).then(snap => {
                const data = snap.data();
                if (!snap.exists() || data?.status === 'FINISHED' || data?.status === 'CANCELLED') {
                    setDoc(roomRef, { 
                        status: 'WAITING', 
                        isFeeLocked: false,
                        hostId: auth.currentUser?.uid, 
                        players: [], 
                        deck: [], 
                        createdAt: serverTimestamp() 
                    });
                    setMatchResults(null);
                    setPlayers([]);
                    setIsFeeLocked(false);
                    setMyProgress(0);
                    setMyScore(0);
                    setMyCombo(1);
                    setMyStatus('idle');
                    setTimeLeftToCross(60);
                    setMyOpenCards([]);
                    setMyMatchedPairs([]);
                    setIsChecking(false);
                    setConsecutiveMistakes(0);
                    setIsFrozen(false);
                    setIsBlackout(false);
                    setShowJackpotFlash(false);
                }
            });
        }

        const unsub = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status) setGameStatus(data.status);
                if (data.players) setPlayers(data.players);
                if (data.isFeeLocked !== undefined) setIsFeeLocked(data.isFeeLocked);
                if (data.hostId) setHostId(data.hostId);
                if (data.deck) setDeck(data.deck);
                
                if (data.status === 'SHUFFLING') {
                    setMyOpenCards([]);
                    setMyMatchedPairs([]);
                    setMyProgress(0);
                    setMyScore(0);
                    setMyCombo(1);
                    setIsChecking(false);
                    setConsecutiveMistakes(0);
                    setIsFrozen(false);
                    setIsBlackout(false);
                    setShowJackpotFlash(false);
                    setTimeLeftToCross(60);
                }

                if (auth.currentUser) {
                    const me = data.players?.find((p: any) => p.id === auth.currentUser?.uid);
                    if (me) {
                        setMyStatus(me.status);
                        setMyProgress(me.progress || 0);
                        setMyScore(me.score || 0);
                    }
                }

                if (data.status === 'FINISHED') {
                    setMatchResults({
                        isTie: data.isTie,
                        winnerIds: data.winnerIds,
                        rankedPlayers: data.rankedPlayers || data.players 
                    });

                    if (isHost && !data.payoutProcessed) {
                        finalizeMatchResults();
                    }
                }

                if (data.status === 'CANCELLED') {
                    onClose(); 
                }
            }
        });
        return () => unsub();
    }, [liveId, visible]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (gameStatus === 'WAITING' && isFeeLocked && visible) {
            interval = setInterval(() => {
                setLobbyTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => { if(interval) clearInterval(interval); }
    }, [gameStatus, isFeeLocked, visible]);

    useEffect(() => {
        let playTimer: ReturnType<typeof setInterval>;
        if (gameStatus === 'PLAYING') {
            playTimer = setInterval(() => {
                setTimeLeftToCross(prev => {
                    if (prev <= 1) {
                        clearInterval(playTimer);
                        if (myStatus === 'playing') {
                            handleTimeOutElimination();
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (gameStatus === 'SHUFFLING') {
            setTimeLeftToCross(60);
        }
        return () => { if(playTimer) clearInterval(playTimer); }
    }, [gameStatus, myStatus, isHost]);

    // 🆓 Host opens the arena lobby (no fee, no diamonds)
    const openArena = async () => {
        try {
            await setDoc(roomRef, { isFeeLocked: true }, { merge: true });
        } catch (e) { console.log("Open Arena Error", e); }
    };

    const closeArenaLobby = async () => {
        try {
            await setDoc(roomRef, { isFeeLocked: false }, { merge: true });
        } catch (e) { console.log("Close Lobby Error", e); }
    };

    // 🆓 Works for both Host and Players (Host can now play too)
    const handleJoinArena = async () => {
        if (!auth.currentUser || isProcessing || !isFeeLocked) return;
        setIsProcessing(true);
        const uid = auth.currentUser.uid;
        let uName = auth.currentUser.displayName || 'Player';
        let avatar = auth.currentUser.photoURL || "";

        try {
            // 🆕 NAME FIX: Use the app profile name / picture (users/{uid}) - same as other screens - instead of the Google account name
            try {
                const uSnap = await getDoc(doc(db, "users", uid));
                if (uSnap.exists()) {
                    const uData = uSnap.data();
                    uName = uData.name || uData.displayName || uName;
                    // 🆕 PHOTO UPDATE: app profile photo (any common field name) so same DP shows in lobby & result board
                    avatar = pickPhoto(uData) || avatar;
                }
            } catch (nameErr) {
                console.log("Profile fetch failed, using auth name:", nameErr);
            }

            await runTransaction(db, async (transaction) => {
                const roomSnap = await transaction.get(roomRef);

                if (!roomSnap.exists()) throw "Data missing! Arena setup might be incomplete.";
                
                const roomData = roomSnap.data();
                const currentPlayers = roomData.players || [];

                if (currentPlayers.find((p: any) => p.id === uid)) throw "Already joined";
                if (currentPlayers.length >= MAX_PLAYERS) throw "Arena Full";

                transaction.update(roomRef, {
                    players: [...currentPlayers, { id: uid, name: uName, avatar: avatar || '', status: 'playing', progress: 0, score: 0, joinedAt: Date.now() }]
                });
            });
            Alert.alert("Success!", "You joined the Arena. Waiting for launch.");
        } catch(e: any) { 
            Alert.alert("Join Failed", e.toString());
        }
        setIsProcessing(false);
    };

    const handleExitArena = async () => {
        if (!auth.currentUser || isProcessing) return;
        setIsProcessing(true);
        const uid = auth.currentUser.uid;

        try {
            await runTransaction(db, async (transaction) => {
                const roomSnap = await transaction.get(roomRef);

                if (!roomSnap.exists()) throw "Data missing";
                const roomData = roomSnap.data();

                if (roomData.status !== 'WAITING') throw "Arena already active! Can't exit now.";

                const currentPlayers = roomData.players || [];
                const myPlayerObj = currentPlayers.find((p: any) => p.id === uid);

                if (!myPlayerObj) throw "You are not in the arena";

                const updatedPlayers = currentPlayers.filter((p: any) => p.id !== uid);
                transaction.update(roomRef, { players: updatedPlayers });
            });
            Alert.alert("Left Arena 🎖️", "You left the arena.");
        } catch (e: any) {
            Alert.alert("Exit Failed", e.toString());
        }
        setIsProcessing(false);
    };

    const handleHostClose = async () => {
        if (isHost && (gameStatus === 'WAITING' || gameStatus === 'SHUFFLING' || gameStatus === 'PLAYING') && players.length > 0) {
            Alert.alert(
                "Cancel Arena?",
                "Closing now will cancel the arena for all participants.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Yes, Cancel Arena", style: "destructive", onPress: async () => {
                        setIsProcessing(true);
                        try {
                            await runTransaction(db, async (transaction) => {
                                const roomSnap = await transaction.get(roomRef);
                                if(!roomSnap.exists()) return;
                                const data = roomSnap.data();

                                if (data.status === 'CANCELLED') { return; }

                                transaction.update(roomRef, { status: 'CANCELLED', players: [] });
                            });
                            onClose();
                        } catch (e) {
                            Alert.alert("Error", "Could not cancel the arena properly.");
                        }
                        setIsProcessing(false);
                    }}
                ]
            );
        } else {
            onClose();
        }
    };

    const launchLiveMatch = async () => {
        if (players.length < MIN_PLAYERS) {
            Alert.alert("Waiting for Challengers ⏳", `Need at least ${MIN_PLAYERS} participants to start the match!`);
            return;
        }
        try {
            let newDeck = [...EMOJI_PAIRS, ...EMOJI_PAIRS];
            newDeck.sort(() => Math.random() - 0.5);
            
            await setDoc(roomRef, {
                status: 'SHUFFLING',
                deck: newDeck, 
                gameStartedAt: serverTimestamp(),
                players: players.map(p => ({ ...p, status: 'playing', progress: 0, score: 0 }))
            }, { merge: true });

            setTimeout(async () => {
                await updateDoc(roomRef, { status: 'PLAYING' });
            }, 3000); 

        } catch (e) { console.log(e); }
    };

    const handleTimeOutElimination = async () => {
        if (!auth.currentUser) return;
        
        try {
            const snap = await getDoc(roomRef);
            if (!snap.exists()) return;
            let data = snap.data();
            let freshPlayersList = data.players || [];
            
            let myIndex = freshPlayersList.findIndex((p: any) => p.id === auth.currentUser?.uid);
            if (myIndex === -1 || freshPlayersList[myIndex].status !== 'playing') return;

            freshPlayersList[myIndex].status = 'time_up';
            const allFinished = freshPlayersList.every((p: any) => p.status === 'time_up' || p.status === 'won');
            
            const updates: any = { players: freshPlayersList };
            
            if (allFinished) {
                updates.status = 'FINISHED';
                const maxScore = Math.max(...freshPlayersList.map((p: any) => p.score || 0));
                
                if (maxScore > 0) { 
                    updates.winnerIds = freshPlayersList.filter((p: any) => p.score === maxScore).map((p: any) => p.id);
                    updates.isTie = updates.winnerIds.length > 1;
                } else {
                    updates.winnerIds = [];
                    updates.isTie = false;
                }
                updates.payoutProcessed = false;
            }
            
            await updateDoc(roomRef, updates);
            setMyStatus('time_up'); 
        } catch (e) {
            console.log(e);
        }
    };

    const handleCardPress = async (index: number) => {
        if (!auth.currentUser || gameStatus !== 'PLAYING' || myStatus !== 'playing') return;
        if (isChecking || isFrozen || isBlackout || myOpenCards.includes(index) || myMatchedPairs.includes(deck[index])) return;

        const newOpen = [...myOpenCards, index];
        setMyOpenCards(newOpen);

        if (newOpen.length === 2) {
            setIsChecking(true);
            const card1 = deck[newOpen[0]];
            const card2 = deck[newOpen[1]];

            if (card1 === card2) {
                setConsecutiveMistakes(0);
                const newMatched = [...myMatchedPairs, card1];
                setMyMatchedPairs(newMatched);
                setMyOpenCards([]);
                setIsChecking(false);

                let addedScore = 0;
                let newCombo = myCombo;

                if (card1 === '💎') {
                    addedScore = 300 * myCombo;
                    newCombo = myCombo + 1;
                    setShowJackpotFlash(true);
                    setTimeout(() => setShowJackpotFlash(false), 1000);
                } else if (card1 === '☠️') {
                    addedScore = -200;
                    setIsBlackout(true);
                    setTimeout(() => setIsBlackout(false), 3000);
                } else {
                    addedScore = 100 * myCombo;
                    newCombo = myCombo + 1;
                }

                const newScore = myScore + addedScore;
                setMyScore(newScore);
                setMyCombo(newCombo);

                setPlayers(prevPlayers => prevPlayers.map(p => 
                    p.id === auth.currentUser?.uid ? { ...p, progress: newMatched.length, score: newScore } : p
                ));

                getDoc(roomRef).then(snap => {
                    if (snap.exists()) {
                        let freshPlayers = snap.data().players || [];
                        let mIndex = freshPlayers.findIndex((p:any) => p.id === auth.currentUser?.uid);
                        if (mIndex !== -1) {
                            freshPlayers[mIndex].progress = newMatched.length;
                            freshPlayers[mIndex].score = newScore;
                            
                            if (newMatched.length === 15) {
                                const finalWinScore = newScore + 1000;
                                freshPlayers[mIndex].score = finalWinScore;
                                setMyScore(finalWinScore);

                                freshPlayers[mIndex].status = 'won';
                                updateDoc(roomRef, { 
                                    status: 'FINISHED', 
                                    winnerIds: [auth.currentUser?.uid],
                                    isTie: false,
                                    players: freshPlayers,
                                    payoutProcessed: false
                                });
                            } else {
                                updateDoc(roomRef, { players: freshPlayers });
                            }
                        }
                    }
                });

            } else {
                setMyCombo(1);
                
                setConsecutiveMistakes(prev => {
                    const mistakes = prev + 1;
                    if (mistakes >= 5) {
                        setIsFrozen(true);
                        setTimeout(() => { setIsFrozen(false); setConsecutiveMistakes(0); }, 3000); 
                    }
                    return mistakes;
                });

                setTimeout(() => {
                    setMyOpenCards([]);
                    setIsChecking(false);
                }, 600);
            }
        }
    };

    // 🆓 No payout anymore. Host only ranks the players and marks the match as processed.
    const finalizeMatchResults = async () => {
        if (isProcessing || !isHost) return;
        setIsProcessing(true);

        try {
            await runTransaction(db, async (transaction) => {
                const roomSnap = await transaction.get(roomRef);
                if (!roomSnap.exists()) return;
                const data = roomSnap.data();
                
                if (data.status !== 'FINISHED' || data.payoutProcessed) return; 

                const currentPlayers = data.players || [];
                if (currentPlayers.length === 0) return; 

                const winnerIds = data.winnerIds || [];
                const isTie = winnerIds.length > 1; 

                const ranked = [...currentPlayers].sort((a, b) => {
                    if (a.status === 'won' && b.status !== 'won') return -1;
                    if (b.status === 'won' && a.status !== 'won') return 1;
                    return (b.score || 0) - (a.score || 0);
                });

                transaction.update(roomRef, {
                    payoutProcessed: true,
                    rankedPlayers: ranked, 
                    isTie: isTie
                });
            });
        } catch (e) {
            console.error("Finalize results error:", e);
        }
        setIsProcessing(false);
    };

    const getWinnerText = () => {
        if (!matchResults) return "UNKNOWN";
        if (matchResults.winnerIds?.length === 0) return "NOBODY SCORED ☠️";
        if (matchResults.isTie) return "TIE - MULTIPLE WINNERS!";
        const w = (matchResults.rankedPlayers || players).find((p: any) => p.id === matchResults.winnerIds?.[0]) || players.find(p => p.id === matchResults.winnerIds?.[0]);
        return w ? `${w.name.toUpperCase()} WON! 🏆` : "UNKNOWN";
    };

    const topScore = matchResults?.rankedPlayers?.length
        ? Math.max(...matchResults.rankedPlayers.map((p: any) => p.score || 0))
        : 0;

    // 🆕 RESULT BOARD DATA (winner photo hero + podium)
    const rankedList: any[] = matchResults?.rankedPlayers || [];
    const winnerList: any[] = rankedList.filter((p: any) => matchResults?.winnerIds?.includes(p.id));
    const heroWinners: any[] = winnerList.slice(0, 3);
    const heroAvatarSize = heroWinners.length > 1 ? 92 : 128;
    const iAmWinner = !!matchResults?.winnerIds?.includes(auth.currentUser?.uid);
    const noWinner = !!matchResults && (matchResults.winnerIds?.length === 0);
    const podiumOrder: number[] = noWinner ? [] : rankedList.length >= 3 ? [1, 0, 2] : rankedList.length === 2 ? [1, 0] : [];
    const PODIUM_META = [
        { color: '#FFD700', medal: '🥇', barH: 96 },
        { color: '#CBD5E1', medal: '🥈', barH: 70 },
        { color: '#F97316', medal: '🥉', barH: 52 },
    ];

    // 🆕 FULL SCREEN BOARD: card size that fills the measured board (5 columns x 6 rows, gap 8)
    const cardSize = gridBox.w > 0 && gridBox.h > 0
        ? Math.max(40, Math.min(Math.floor((gridBox.w - 16 - 32) / 5), Math.floor((gridBox.h - 16 - 48) / 6), 96))
        : undefined;

    // 🆕 GAME RULES open / close
    const openRules = () => {
        rulesAnim.setValue(0);
        setShowRules(true);
        Animated.spring(rulesAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }).start();
    };
    const closeRules = () => {
        Animated.timing(rulesAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setShowRules(false));
    };

    // 🆕 Interpolations
    const spin = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
    const sweepX = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.6, width * 1.1] });
    const stageRotX = heroIn.interpolate({ inputRange: [0, 1], outputRange: ['30deg', '0deg'] });
    const stageScale = heroIn.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
    const timeBarWidth = timeAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

    const statusLabel = gameStatus === 'WAITING' ? 'LOBBY' : gameStatus === 'SHUFFLING' ? 'SHUFFLING' : gameStatus === 'PLAYING' ? 'LIVE MATCH' : gameStatus === 'FINISHED' ? 'RESULTS' : 'CLOSED';
    const statusColor = gameStatus === 'PLAYING' ? '#FF2A5F' : gameStatus === 'FINISHED' ? '#FFD700' : '#A855F7';

    // 🆕 Top pill text (multicolor, turns solid red in the last 10 seconds)
    const pillLabel = gameStatus === 'SHUFFLING'
        ? 'PREPARING BOARD... ⚡'
        : `⏳ MATCH ALL PAIRS IN: 00:${timeLeftToCross < 10 ? '0' + timeLeftToCross : timeLeftToCross}`;

    // 🆕 Glossy overlay for gradient buttons
    const Gloss = () => (
        <LinearGradient colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']} style={styles.btnGloss} pointerEvents="none" />
    );

    return (
        <Modal visible={visible} animationType="slide" transparent statusBarTranslucent>
            <View style={styles.sheetOverlay}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                
                <Animated.View 
                    style={[
                        styles.arcadeContentCard,
                        { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 40 },
                        { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
                    ]}
                >
                    {/* 🆕 DARKER base + background image + tint layers */}
                    <LinearGradient colors={['#050A18', '#010309']} style={StyleSheet.absoluteFill} />
                    {!bgErr && (
                        <Image source={{ uri: BG_IMG }} resizeMode="cover" onError={() => setBgErr(true)} style={[StyleSheet.absoluteFill, { opacity: 0.3 }]} />
                    )}
                    <LinearGradient colors={['rgba(168,85,247,0.10)', 'rgba(1,3,12,0.35)', 'rgba(0,242,254,0.08)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                    <LinearGradient colors={['rgba(1,3,12,0.35)', 'rgba(1,3,12,0.78)']} style={StyleSheet.absoluteFill} pointerEvents="none" />

                    {/* 🆕 ambient orbs */}
                    <Animated.View pointerEvents="none" style={[styles.shimmerOrb, { top: 80, right: -80, backgroundColor: '#A855F7', transform: [{ translateY: orbTranslateY }] }]} />
                    <Animated.View pointerEvents="none" style={[styles.shimmerOrb, { bottom: 60, left: -100, backgroundColor: '#00F2FE', transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

                    {/* 🆕 floating particles */}
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
                                backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
                                opacity: p.v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.8, 0.5, 0] }),
                                transform: [{ translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, -300] }) }]
                            }}
                        />
                    ))}
                    
                    <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
                        <View style={styles.dragPill} />
                    </View>

                    <View style={styles.sheetHeaderRow}>
                        <View style={styles.titleIconBadge}>
                            <View style={styles.titleOrbitWrap}>
                                <OrbitRing size={46} color="#A855F7" dur={5200} dotSize={5} />
                                <View style={styles.titleBrainCircle}>
                                    <MaterialCommunityIcons name="cards-playing-outline" size={22} color="#C084FC" style={styles.glowIcon} />
                                </View>
                            </View>
                            <View style={{ flexShrink: 1 }}>
                                <Text style={styles.mainTitleText} numberOfLines={1} adjustsFontSizeToFit>MEMORY MATCH ARENA</Text>
                                <View style={[styles.headerStatusPill, { borderColor: statusColor + '88' }]}>
                                    <PulseDot color={statusColor} size={6} />
                                    <Text style={[styles.headerStatusText, { color: lighten(statusColor, 0.3) }]}>{statusLabel}</Text>
                                    <Text style={styles.headerStatusCount}>{players.length}/{MAX_PLAYERS}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.headerBtnRow}>
                            {/* 🆕 UPDATE: "?" box removed from header - GAME RULES chip (lobby) already available */}
                            <TouchableOpacity onPress={handleHostClose} style={styles.closeRoundBtn}>
                                <Ionicons name="close" size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* MATCHMAKING / LOBBY */}
                    {gameStatus === 'WAITING' && (
                        <ScrollView contentContainerStyle={{ paddingBottom: 30, flexGrow: 1 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                            <View style={styles.lobbyStateWrapper}>
                                {/* 🆕 LOBBY STAGE (countdown gauge + spinning core + 3D objects) */}
                                <Animated.View style={[styles.stageWrap, { opacity: heroIn, transform: [{ perspective: 900 }, { rotateX: stageRotX }, { scale: stageScale }] }]}>
                                    <View style={styles.stageGlowBig} pointerEvents="none" />
                                    <Animated.View pointerEvents="none" style={[styles.heroSweep, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
                                        <LinearGradient colors={['transparent', 'rgba(255,255,255,0.10)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                                    </Animated.View>

                                    <Sparkle x={width * 0.14} y={24} size={13} color="#A855F7" delay={0} />
                                    <Sparkle x={width * 0.7} y={50} size={10} color="#FFD700" delay={600} />
                                    <Sparkle x={width * 0.1} y={150} size={11} color="#00F2FE" delay={1100} />

                                    <FloatBox amp={7} dur={2000} style={styles.stageTrophy}>
                                        <Img3D uri={IMG.trophy} size={54} fallback="trophy" color="#FFD700" />
                                    </FloatBox>
                                    <FloatBox amp={9} dur={2400} style={styles.stageDiamond}>
                                        <Img3D uri={IMG.diamond} size={46} fallback="diamond" color="#00F2FE" />
                                    </FloatBox>
                                    <FloatBox amp={6} dur={2800} style={styles.stageStar}>
                                        <Img3D uri={IMG.star} size={34} fallback="star" color="#FFD700" />
                                    </FloatBox>

                                    <GaugeRing progress={isFeeLocked ? lobbyTimeLeft / 45 : 0} color="#A855F7" size={200} ticks={48} dur={900} />

                                    <View style={styles.coreWrap}>
                                        <OrbitRing size={128} color="#A855F7" dur={5000} dotSize={6} />
                                        <OrbitRing size={110} color="#00F2FE" dur={8000} reverse dotSize={4} style={{ opacity: 0.7 }} />
                                        <View style={styles.coreMask}>
                                            <Animated.View style={[styles.coreSpin, { transform: [{ rotate: spin }] }]}>
                                                <LinearGradient
                                                    colors={['#A855F7', '#00F2FE', '#FFD700', '#FF2A5F', '#A855F7'] as any}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 1 }}
                                                    style={StyleSheet.absoluteFill}
                                                />
                                            </Animated.View>
                                            <View style={styles.coreInner}>
                                                {isFeeLocked ? (
                                                    <>
                                                        <Text style={styles.coreNumber}>{lobbyTimeLeft}</Text>
                                                        <Text style={styles.coreSuffix}>SEC</Text>
                                                    </>
                                                ) : (
                                                    <Ionicons name="hourglass" size={30} color="#F59E0B" />
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                </Animated.View>

                                <Text style={styles.lobbyHelperText}>{isFeeLocked ? `ARENA LOBBY OPEN (${lobbyTimeLeft}s)` : 'WAITING FOR HOST TO OPEN ARENA...'}</Text>
                                
                                <LinearGradient colors={['#A855F7', '#00F2FE', '#A855F7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.entryFeeFrame}>
                                    <View style={styles.entryFeeContainer}>
                                        <Text style={styles.feeLabel}>ARENA PASS:</Text>
                                        {/* 🆕 TEXT FIX: emoji is a separate Text so the words never get clipped / dark on some phones */}
                                        <View style={styles.feeValueRow}>
                                            <Text style={styles.feeEmoji}>🎮</Text>
                                            <Text style={styles.feeValueText} numberOfLines={1}>FREE TO PLAY</Text>
                                        </View>
                                    </View>
                                </LinearGradient>

                                {/* 🆕 Small GAME RULES chip */}
                                <TouchableOpacity onPress={openRules} activeOpacity={0.8} style={styles.rulesChip}>
                                    <Ionicons name="help-circle" size={16} color="#FFD700" />
                                    <Text style={styles.rulesChipText}>GAME RULES</Text>
                                </TouchableOpacity>

                                <View style={styles.playerPoolRow}>
                                    {[...Array(MAX_PLAYERS)].map((_, idx) => {
                                        const p = players[idx];
                                        if (p) {
                                            const pc = COLOR_POOL[idx % COLOR_POOL.length].colorCode;
                                            return (
                                                <View key={p.id || idx} style={styles.profileAuraWrapper}>
                                                    <View style={styles.avatarNode}>
                                                        <OrbitRing size={54} color={pc} dur={5200 + (idx % 4) * 600} dotSize={4} />
                                                        <View style={[styles.avatarAuraGlow, { borderColor: pc, shadowColor: pc }]}>
                                                            {/* 🆕 PHOTO UPDATE: joined player's profile photo (initial letter if no photo) */}
                                                            <Avatar uri={p.avatar} name={p.name} size={40} color={pc} textSize={16} />
                                                        </View>
                                                    </View>
                                                    <Text style={styles.poolPlayerName} numberOfLines={1}>{p.name || 'Joined'}</Text>
                                                </View>
                                            );
                                        } else {
                                            return (
                                                <View key={`empty-${idx}`} style={styles.profileAuraWrapper}>
                                                    <View style={styles.avatarNode}>
                                                        <View style={[styles.avatarAuraGlow, { borderColor: '#475569', borderStyle: 'dashed' }]}>
                                                            <Ionicons name="person-add" size={16} color="#64748B" />
                                                        </View>
                                                    </View>
                                                    <Text style={[styles.poolPlayerName, { color: '#64748B' }]}>Slot {idx + 1}</Text>
                                                </View>
                                            );
                                        }
                                    })}
                                </View>

                                {isHost && !isFeeLocked && (
                                    <View style={{ width: '100%', marginBottom: 20, alignItems: 'center' }}>
                                        <TouchableOpacity onPress={openArena} style={[styles.arcadeLaunchBtn, { width: '100%', marginTop: 20 }]}>
                                            <LinearGradient colors={['#A855F7', '#7E22CE']} style={StyleSheet.absoluteFill} />
                                            <Gloss />
                                            <Text style={[styles.launchBtnLabel, { color: '#FFF' }]}>🚀 OPEN ARENA</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                
                                {isHost && isFeeLocked && (
                                    <View style={{ width: '100%', marginBottom: 20, alignItems: 'center' }}>
                                        <View style={[styles.feeValueRow, { marginBottom: 10 }]}>
                                            <Text style={[styles.feeEmoji, { fontSize: 12, marginRight: 6 }]}>✅</Text>
                                            <Text style={[styles.feeLabel, { color: '#FBBF24', marginBottom: 0 }]}>ARENA OPEN</Text>
                                        </View>
                                        <TouchableOpacity onPress={launchLiveMatch} style={styles.arcadeLaunchBtn}>
                                            <LinearGradient colors={['#00F2FE', '#059669']} style={StyleSheet.absoluteFill} />
                                            <Gloss />
                                            <Text style={styles.launchBtnLabel}>START 60s MEMORY MATCH</Text>
                                        </TouchableOpacity>
                                        
                                        {players.length === 0 && (
                                            <TouchableOpacity onPress={closeArenaLobby} style={{marginTop: 15, padding: 10}}>
                                                <Text style={{color: '#CBD5E1', fontWeight: 'bold', fontSize: 12}}>🔓 CLOSE LOBBY</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}

                                {isFeeLocked && !hasJoined && (
                                    <TouchableOpacity onPress={handleJoinArena} disabled={isProcessing} style={styles.arcadeLaunchBtn}>
                                        <LinearGradient colors={['#F59E0B', '#D97706']} style={StyleSheet.absoluteFill} />
                                        <Gloss />
                                        <Text style={styles.launchBtnLabel}>{isProcessing ? 'PROCESSING...' : 'JOIN ARENA'}</Text>
                                    </TouchableOpacity>
                                )}

                                {!isHost && !isFeeLocked && (
                                    <Text style={[styles.waitServerSignalText, { color: '#F59E0B' }]}>⏳ Waiting for host to open the arena...</Text>
                                )}

                                {hasJoined && (
                                    <View style={{ alignItems: 'center', width: '100%' }}>
                                        <Text style={styles.waitServerSignalText}>
                                            {isHost ? `You joined as a player! Start when ready. (${lobbyTimeLeft}s)` : `You are in! Awaiting expert to launch... (${lobbyTimeLeft}s)`}
                                        </Text>
                                        <TouchableOpacity onPress={handleExitArena} disabled={isProcessing} style={[styles.arcadeLaunchBtn, { marginTop: 15, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#EF4444', elevation: 0 }]}>
                                            <Text style={[styles.launchBtnLabel, { color: '#EF4444' }]}>{isProcessing ? 'WAIT...' : 'EXIT ARENA'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                
                                {/* 🆕 Yellow warning banner removed - the same note is now inside GAME RULES ("DON'T LEAVE") */}
                            </View>
                        </ScrollView>
                    )}

                    {/* LIVE MEMORY MATCH ENGINE (30 CARDS FLATLIST) */}
                    {(gameStatus === 'SHUFFLING' || gameStatus === 'PLAYING') && (
                        <View style={styles.activeEngineMainContainer}>
                            
                            {/* 🔥 SATTI FIX: Reduced spacing here to fit grid perfectly 🔥 */}
                            <View style={[
                                styles.statusPill, 
                                gameStatus === 'SHUFFLING' && styles.shufflingPill,
                                gameStatus === 'PLAYING' && timeLeftToCross <= 10 && { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.2)' }
                            ]}>
                                <Text style={[
                                    styles.statusText,
                                    gameStatus === 'SHUFFLING' && { color: '#C084FC' },
                                    gameStatus === 'PLAYING' && timeLeftToCross <= 10 && { color: '#F87171', fontSize: 16 }
                                ]}>
                                    {pillLabel}
                                </Text>
                            </View>

                            {/* 🆕 glowing 60s timeline bar */}
                            <View style={styles.timelineTrackContainer}>
                                <Animated.View style={[styles.timelineFillBar, { width: timeBarWidth }, timeLeftToCross <= 10 && gameStatus === 'PLAYING' && { backgroundColor: '#EF4444', shadowColor: '#EF4444' }]} />
                            </View>

                            <View style={{ flexDirection: 'row', gap: 20, marginBottom: 2 }}>
                                <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '900', textShadowColor: 'rgba(255,215,0,0.5)', textShadowRadius: 5 }}>💎 JACKPOT: +300</Text>
                                <Text style={{ color: '#F87171', fontSize: 10, fontWeight: '900', textShadowColor: 'rgba(239,68,68,0.5)', textShadowRadius: 5 }}>☠️ TRAP: -200</Text>
                            </View>

                            {myStatus === 'playing' && (
                                <View style={styles.liveHudContainer}>
                                    <Animated.Text style={[styles.hudScoreText, { transform: [{ scale: scoreBump }] }]}>SCORE: {myScore}</Animated.Text>
                                    <Text style={styles.hudComboText}>COMBO x{myCombo}</Text>
                                </View>
                            )}

                            <View style={styles.playersContainer}>
                                <Text style={styles.playersTitle}>SURVIVORS & SCORE ({players.filter(p=>p.status!=='eliminated' && p.status!=='time_up').length}/{players.length})</Text>
                                <FlatList
                                    data={players}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={(item) => item.id}
                                    getItemLayout={(data, index) => ({
                                        length: 70,
                                        offset: 70 * index,
                                        index,
                                    })}
                                    initialNumToRender={10}
                                    maxToRenderPerBatch={5}
                                    windowSize={5}
                                    renderItem={({ item }) => <PlayerItem item={item} />}
                                />
                            </View>

                            {/* 🆕 FULL SCREEN BOARD: neon frame, board is pushed down & cards scale to cover the whole area */}
                            <LinearGradient colors={['#A855F7', '#00F2FE', '#FFD700', '#FF2A5F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.boardFrame}>
                            <View
                                style={styles.gridContainerWrapper}
                                onLayout={(e) => {
                                    const { width: bw, height: bh } = e.nativeEvent.layout;
                                    setGridBox(prev => (Math.abs(prev.w - bw) < 1 && Math.abs(prev.h - bh) < 1 ? prev : { w: bw, h: bh }));
                                }}
                            >
                                <FlatList 
                                    data={deck}
                                    numColumns={5}
                                    keyExtractor={(_, index) => index.toString()}
                                    style={{ width: '100%' }}
                                    contentContainerStyle={styles.gridContainer}
                                    columnWrapperStyle={styles.columnWrapper}
                                    showsVerticalScrollIndicator={false}
                                    /* 🆕 Yellow warning banner removed from grid footer - the same note is now inside GAME RULES */
                                    renderItem={({ item, index }) => {
                                        const isFlipped = myOpenCards.includes(index) || myMatchedPairs.includes(item);
                                        const isMatched = myMatchedPairs.includes(item);

                                        return (
                                            <MemoryCard
                                                index={index}
                                                item={item}
                                                size={cardSize}
                                                isFlipped={isFlipped}
                                                isMatched={isMatched}
                                                disabled={isChecking || isFrozen || isBlackout || isFlipped || myStatus !== 'playing' || gameStatus !== 'PLAYING'}
                                                onPress={() => handleCardPress(index)}
                                            />
                                        );
                                    }}
                                />

                                {isBlackout && (
                                    <View style={styles.blackoutOverlay}>
                                        <OrbitRing size={150} color="#EF4444" dur={4000} dotSize={7} />
                                        <Ionicons name="skull" size={80} color="#EF4444" style={{ shadowColor: '#EF4444', shadowRadius: 20, shadowOpacity: 1 }} />
                                        <Text style={styles.massFreezeTitle}>TRAP HIT!</Text>
                                        <Text style={styles.massFreezeSub}>-200 POINTS & BLINDED</Text>
                                    </View>
                                )}

                                {showJackpotFlash && (
                                    <View style={styles.jackpotFlash}>
                                        <FloatBox amp={8} dur={500}>
                                            <Img3D uri={IMG.diamond} size={100} fallback="diamond" color="#000" />
                                        </FloatBox>
                                        <Text style={[styles.massFreezeTitle, { color: '#000', textShadowColor: '#FFF' }]}>JACKPOT!</Text>
                                        <Text style={[styles.massFreezeSub, { color: '#000' }]}>+300 POINTS</Text>
                                    </View>
                                )}

                                {isFrozen && !isBlackout && !showJackpotFlash && (
                                    <View style={styles.massFreezeOverlay}>
                                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                                        <LinearGradient colors={['rgba(239,68,68,0.3)', 'rgba(2,6,23,0.8)']} style={StyleSheet.absoluteFill} />
                                        <Ionicons name="warning" size={60} color="#EF4444" style={{ marginBottom: 10, shadowColor: '#EF4444', shadowRadius: 20, shadowOpacity: 1 }} />
                                        <Text style={styles.massFreezeTitle}>SYSTEM LOCKED!</Text>
                                        <Text style={styles.massFreezeSub}>5 MISTAKES = 3s PENALTY</Text>
                                    </View>
                                )}
                            </View>
                            </LinearGradient>

                            {(myStatus === 'eliminated' || myStatus === 'time_up') && timeLeftToCross <= 0 && (
                                <Text style={styles.eliminatedText} numberOfLines={1} adjustsFontSizeToFit>TIME OUT! WAITING FOR RESULTS... ⏳</Text>
                            )}

                        </View>
                    )}

                    {/* DETAILED LEADERBOARD & RESULTS SCREEN */}
                    {gameStatus === 'FINISHED' && matchResults && (
                        <View style={styles.terminalStateWrapper}>
                            
                            {matchResults.winnerIds?.includes(auth.currentUser?.uid) && (
                                <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]} pointerEvents="none">
                                    <LottieView
                                        source={require('../assets/images/fireworks.json')} 
                                        autoPlay
                                        loop={false}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                </View>
                            )}

                            {/* 🆕 RESULT BOARD: scrollable so big winner photo + podium + leaderboard all fit */}
                            <ScrollView
                                style={{ flex: 1, width: '100%' }}
                                contentContainerStyle={styles.resultScrollContent}
                                showsVerticalScrollIndicator={false}
                                nestedScrollEnabled
                            >
                                {/* 🆕 WINNER HERO - big profile photo with orbit rings, crown & sparkles */}
                                <View style={styles.heroStage}>
                                    <View style={styles.heroGlow} pointerEvents="none" />
                                    <OrbitRing size={228} color="#FFD700" dur={7000} dotSize={8} />
                                    <OrbitRing size={196} color="#00F2FE" dur={5200} reverse dotSize={6} />
                                    <OrbitRing size={166} color="#A855F7" dur={8500} dotSize={5} style={{ opacity: 0.8 }} />

                                    <Sparkle x={width * 0.08} y={20} size={14} color="#FFD700" delay={0} />
                                    <Sparkle x={width * 0.78} y={34} size={12} color="#00F2FE" delay={500} />
                                    <Sparkle x={width * 0.14} y={170} size={11} color="#A855F7" delay={900} />
                                    <Sparkle x={width * 0.72} y={178} size={13} color="#FFD700" delay={1300} />

                                    <FloatBox amp={7} dur={2100} style={styles.heroTrophyLeft}>
                                        <Img3D uri={IMG.trophy} size={50} fallback="trophy" color="#FFD700" />
                                    </FloatBox>
                                    <FloatBox amp={8} dur={2500} style={styles.heroDiamondRight}>
                                        <Img3D uri={IMG.diamond} size={42} fallback="diamond" color="#00F2FE" />
                                    </FloatBox>

                                    <View style={styles.heroAvatarsRow}>
                                        {heroWinners.length === 0 ? (
                                            <LinearGradient colors={['#EF4444', '#7E22CE', '#00F2FE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.heroAvatarFrame, { width: 138, height: 138, borderRadius: 69 }]}>
                                                <View style={[styles.heroAvatarInner, { width: 132, height: 132, borderRadius: 66 }]}>
                                                    <Text style={{ fontSize: 64 }}>☠️</Text>
                                                </View>
                                            </LinearGradient>
                                        ) : heroWinners.map((w: any, i: number) => (
                                            <LinearGradient
                                                key={w.id || i}
                                                colors={['#FFD700', '#FF2A5F', '#A855F7', '#00F2FE']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 1 }}
                                                style={[
                                                    styles.heroAvatarFrame,
                                                    {
                                                        width: heroAvatarSize + 10,
                                                        height: heroAvatarSize + 10,
                                                        borderRadius: (heroAvatarSize + 10) / 2,
                                                        marginLeft: i === 0 ? 0 : -18,
                                                        zIndex: 10 - i
                                                    }
                                                ]}
                                            >
                                                <View style={[styles.heroAvatarInner, { width: heroAvatarSize + 4, height: heroAvatarSize + 4, borderRadius: (heroAvatarSize + 4) / 2 }]}>
                                                    <Avatar uri={w.avatar} name={w.name} size={heroAvatarSize} color={COLOR_POOL[(i + 4) % COLOR_POOL.length].colorCode} />
                                                </View>
                                            </LinearGradient>
                                        ))}
                                    </View>

                                    {heroWinners.length > 0 && (
                                        <FloatBox amp={5} dur={1500} style={styles.heroCrown}>
                                            <Img3D uri={IMG.crown} size={52} fallback="ribbon" color="#FFD700" />
                                        </FloatBox>
                                    )}
                                </View>

                                <LinearGradient colors={noWinner ? ['#EF4444', '#7E22CE'] : ['#FFD700', '#F97316', '#FF2A5F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.championChip}>
                                    <Text style={styles.championChipText}>{noWinner ? '☠️ NO CHAMPION' : matchResults.isTie ? '🤝 CO-CHAMPIONS' : iAmWinner ? '🏆 YOU ARE THE CHAMPION!' : '👑 ARENA CHAMPION'}</Text>
                                </LinearGradient>

                                <Text style={styles.terminalTitle} numberOfLines={1} adjustsFontSizeToFit>{getWinnerText()}</Text>

                                {!noWinner && winnerList.length > 0 && (
                                    <View style={styles.winnerScorePill}>
                                        <Ionicons name="flash" size={16} color="#FFD700" />
                                        <Text style={styles.winnerScoreText}>{winnerList[0]?.score || 0} PTS</Text>
                                    </View>
                                )}

                                {/* 🆕 PODIUM (top 3) */}
                                {podiumOrder.length > 0 && (
                                    <View style={styles.podiumRow}>
                                        {podiumOrder.map((rankIdx: number) => {
                                            const pp = rankedList[rankIdx];
                                            if (!pp) return null;
                                            const meta = PODIUM_META[rankIdx];
                                            const avSize = rankIdx === 0 ? 62 : 52;
                                            return (
                                                <View key={pp.id || rankIdx} style={styles.podiumCol}>
                                                    <Text style={styles.podiumMedal}>{meta.medal}</Text>
                                                    <View style={[styles.podiumAvatarRing, { borderColor: meta.color, shadowColor: meta.color, width: avSize + 8, height: avSize + 8, borderRadius: (avSize + 8) / 2 }]}>
                                                        <Avatar uri={pp.avatar} name={pp.name} size={avSize} color={meta.color} />
                                                    </View>
                                                    <Text style={styles.podiumName} numberOfLines={1}>{pp.name}</Text>
                                                    <LinearGradient
                                                        colors={[lighten(meta.color, 0.15), darken(meta.color, 0.55)]}
                                                        style={[styles.podiumBar, { height: meta.barH }]}
                                                    >
                                                        <LinearGradient colors={['rgba(255,255,255,0.35)', 'rgba(255,255,255,0)']} style={styles.podiumGloss} pointerEvents="none" />
                                                        <Text style={styles.podiumScore}>{pp.score || 0}</Text>
                                                        <Text style={styles.podiumPts}>PTS</Text>
                                                    </LinearGradient>
                                                </View>
                                            );
                                        })}
                                    </View>
                                )}

                                <LinearGradient colors={['#FFD700', '#A855F7', '#00F2FE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.leaderboardFrame}>
                                    <View style={styles.leaderboardContainer}>
                                        <Text style={styles.leaderboardTitle}>🏆 ARENA SURVIVAL BOARD</Text>
                                        {matchResults.rankedPlayers?.map((p: any, idx: number) => {
                                            const isWinner = matchResults.winnerIds?.includes(p.id);
                                            const rc = idx < 3 ? PODIUM_META[idx].color : '#64748B';
                                            const isMe = p.id === auth.currentUser?.uid;
                                            return (
                                                <View
                                                    key={p.id}
                                                    style={[
                                                        styles.leaderboardRow,
                                                        isWinner && styles.leaderboardRowWinner,
                                                        { borderLeftWidth: 4, borderLeftColor: rc },
                                                        isMe && styles.leaderboardRowMe
                                                    ]}
                                                >
                                                    <Text style={[styles.lbRank, { color: rc }]}>{idx < 3 ? PODIUM_META[idx].medal : `#${idx + 1}`}</Text>
                                                    <View style={[styles.lbAvatarRing, { borderColor: rc }]}>
                                                        <Avatar uri={p.avatar} name={p.name} size={32} color={rc === '#64748B' ? '#A855F7' : rc} />
                                                    </View>
                                                    <Text style={styles.lbName} numberOfLines={1} ellipsizeMode="tail">{p.name} {isWinner ? '👑' : ''}{isMe ? ' (You)' : ''}</Text>
                                                    <Text style={styles.lbScore}>{p.score || 0} Pts</Text>
                                                </View>
                                            )
                                        })}
                                    </View>
                                </LinearGradient>

                                <View style={styles.resultDetailsCard}>
                                    <View style={styles.resultRow}>
                                        <Text style={styles.resultLabel}>{matchResults.winnerIds?.length === 0 ? 'Nobody Scored:' : (matchResults.isTie ? 'Tied Winners:' : 'Winning Score:')}</Text>
                                        <Text style={[styles.resultValue, matchResults.winnerIds?.length === 0 ? { color: '#F87171' } : { color: '#34D399' }]}>
                                            {matchResults.winnerIds?.length === 0 ? 'NO WINNER' : (matchResults.isTie ? `${matchResults.winnerIds?.length} 🏆` : `${topScore} Pts`)}
                                        </Text>
                                    </View>
                                    <View style={styles.resultRow}>
                                        <Text style={styles.resultLabel}>Total Players:</Text>
                                        <Text style={styles.resultValue}>{matchResults.rankedPlayers?.length || 0}</Text>
                                    </View>
                                </View>
                            </ScrollView>
                            
                            <TouchableOpacity onPress={onClose} style={[styles.arcadeLaunchBtn, { marginTop: 10, height: 50 }]}>
                                <LinearGradient colors={['#334155', '#0F172A']} style={StyleSheet.absoluteFill} />
                                <Gloss />
                                <Text style={[styles.launchBtnLabel, { color: '#FFF' }]}>EXIT ARENA</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* 🆕 GAME RULES POPUP (opens from the GAME RULES chip) */}
                    {showRules && (
                        <Animated.View style={[styles.rulesOverlay, { opacity: rulesAnim, paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
                            <BlurView intensity={55} tint="dark" style={StyleSheet.absoluteFill} />
                            <Animated.View
                                style={[
                                    styles.rulesPanelWrap,
                                    {
                                        transform: [
                                            { perspective: 900 },
                                            { translateY: rulesAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                                            { rotateX: rulesAnim.interpolate({ inputRange: [0, 1], outputRange: ['25deg', '0deg'] }) },
                                            { scale: rulesAnim.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }
                                        ]
                                    }
                                ]}
                            >
                                <LinearGradient colors={['#A855F7', '#00F2FE', '#FFD700']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rulesFrame}>
                                    <View style={styles.rulesPanel}>
                                        <View style={styles.rulesHeaderRow}>
                                            <FloatBox amp={4} dur={1600}>
                                                <Img3D uri={IMG.trophy} size={44} fallback="trophy" color="#FFD700" />
                                            </FloatBox>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={styles.rulesTitle}>GAME RULES</Text>
                                                <Text style={styles.rulesSub}>MEMORY MATCH ARENA</Text>
                                            </View>
                                            <TouchableOpacity onPress={closeRules} style={styles.closeRoundBtn}>
                                                <Ionicons name="close" size={20} color="#FFF" />
                                            </TouchableOpacity>
                                        </View>

                                        <ScrollView style={{ flexShrink: 1 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                                            {GAME_RULES.map((r, i) => (
                                                <View key={i} style={[styles.ruleRow, { borderColor: r.color + '44' }]}>
                                                    <View style={[styles.ruleIconBox, { backgroundColor: r.color + '22', borderColor: r.color + '88' }]}>
                                                        <Ionicons name={r.icon as any} size={18} color={lighten(r.color, 0.3)} />
                                                    </View>
                                                    <View style={{ flex: 1, marginLeft: 12 }}>
                                                        <Text style={[styles.ruleTitle, { color: lighten(r.color, 0.3) }]}>{r.title}</Text>
                                                        <Text style={styles.ruleText}>{r.text}</Text>
                                                    </View>
                                                </View>
                                            ))}
                                        </ScrollView>

                                        <TouchableOpacity onPress={closeRules} activeOpacity={0.85} style={[styles.arcadeLaunchBtn, { marginTop: 14, alignSelf: 'center' }]}>
                                            <LinearGradient colors={['#A855F7', '#00F2FE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                                            <Gloss />
                                            <Text style={styles.launchBtnLabel}>GOT IT</Text>
                                        </TouchableOpacity>
                                    </View>
                                </LinearGradient>
                            </Animated.View>
                        </Animated.View>
                    )}

                    <View {...panResponder.panHandlers} style={[styles.dragHandleContainer, { position: 'absolute', bottom: 15 + insets.bottom, alignSelf: 'center', width: '100%', height: 30 }]}>
                        <View style={styles.dragPill} />
                    </View>

                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    // 🆕 FULL SCREEN: overlay + card now fill the whole phone screen
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(1, 3, 9, 0.9)' },
    // 🆕 FULL SCREEN: no fixed 0.85 height, no rounded sheet corners (insets are added inline for notch / nav bar)
    arcadeContentCard: { flex: 1, width: '100%', borderTopLeftRadius: 0, borderTopRightRadius: 0, overflow: 'hidden', padding: 20, paddingTop: 10, paddingBottom: 40 },
    shimmerOrb: { position: 'absolute', width: 320, height: 320, borderRadius: 160, opacity: 0.08 },
    
    dragHandleContainer: { width: '100%', height: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
    dragPill: { width: 50, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },

    sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    titleIconBadge: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
    titleOrbitWrap: { width: 54, height: 54, justifyContent: 'center', alignItems: 'center' },
    titleBrainCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(168,85,247,0.14)', borderWidth: 1, borderColor: 'rgba(168,85,247,0.55)', justifyContent: 'center', alignItems: 'center' },
    glowIcon: { shadowColor: '#A855F7', shadowOpacity: 0.8, shadowRadius: 10 },
    mainTitleText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1.5, textShadowColor: '#A855F7', textShadowRadius: 8, flexShrink: 1 },
    headerStatusPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1.2, backgroundColor: 'rgba(4,7,18,0.8)' },
    headerStatusText: { fontSize: 8, fontWeight: '900', letterSpacing: 2 },
    headerStatusCount: { color: '#FFF', fontSize: 8, fontWeight: '900', marginLeft: 8 },
    closeRoundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(2,4,14,0.8)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.2, borderColor: 'rgba(168,85,247,0.55)' },
    
    // 🔥 SATTI FIX: COMPACT WARNING BANNER STYLES 🔥 (banner itself removed, styles kept)
    warningBanner: { flexDirection: 'row', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', alignItems: 'center' },
    warningText: { color: '#F59E0B', fontSize: 8.5, fontWeight: '700', marginLeft: 8, flex: 1, lineHeight: 12 },

    // 🆕 LOBBY STAGE
    stageWrap: { width: '100%', height: 230, alignItems: 'center', justifyContent: 'center' },
    stageGlowBig: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(168,85,247,0.07)' },
    heroSweep: { position: 'absolute', top: -60, bottom: -60, width: 90 },
    stageTrophy: { position: 'absolute', left: 4, top: 20 },
    stageDiamond: { position: 'absolute', right: 6, top: 50 },
    stageStar: { position: 'absolute', left: 18, bottom: 18 },
    coreWrap: { width: 110, height: 110, justifyContent: 'center', alignItems: 'center' },
    coreMask: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 16, shadowColor: '#A855F7', shadowOpacity: 0.8, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
    coreSpin: { position: 'absolute', width: 200, height: 200, left: -50, top: -50 },
    coreInner: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#030612', justifyContent: 'center', alignItems: 'center' },
    coreNumber: { color: '#FFF', fontSize: 32, fontWeight: '900', fontVariant: ['tabular-nums'] },
    coreSuffix: { color: '#C084FC', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginTop: -2 },

    lobbyStateWrapper: { flex: 1, alignItems: 'center' },
    lobbyHelperText: { color: '#CBD5E1', fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 10 },
    entryFeeFrame: { borderRadius: 19, padding: 1.4, marginBottom: 20 },
    entryFeeContainer: { backgroundColor: 'rgba(2, 5, 16, 0.92)', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 17.6, minWidth: 240, alignItems: 'center' },
    feeLabel: { color: '#C084FC', fontSize: 10, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
    // 🆕 TEXT FIX: explicit white colour + no shrink so "FREE TO PLAY" is fully visible on every phone
    feeValueText: { color: '#FFFFFF', fontSize: 20, fontWeight: '900', letterSpacing: 1, flexShrink: 0, textAlign: 'center', textShadowColor: 'rgba(168, 85, 247, 0.5)', textShadowRadius: 10 },
    feeValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    feeEmoji: { fontSize: 20, marginRight: 8, color: '#FFFFFF' },
    
    playerPoolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 25, width: '100%' },
    profileAuraWrapper: { alignItems: 'center', width: '17%', marginBottom: 10 }, 
    avatarNode: { width: 54, height: 54, justifyContent: 'center', alignItems: 'center' },
    avatarAuraGlow: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, backgroundColor: '#050A18', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowRadius: 10, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 0 } },
    initialsAvatarText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    poolPlayerName: { color: '#E2E8F0', fontSize: 9, fontWeight: '700', marginTop: 3, textAlign: 'center' },
    
    arcadeLaunchBtn: { width: '85%', height: 56, borderRadius: 20, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 12, shadowColor: '#00F2FE', shadowOpacity: 0.5, shadowRadius: 15 },
    btnGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 22, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
    // 🆕 TEXT FIX: white label + dark shadow so it is clearly visible on every phone / gradient colour
    launchBtnLabel: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
    waitServerSignalText: { color: '#94A3B8', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginTop: 15, textAlign: 'center' },

    // 🆕 RULES box / chip / popup
    headerBtnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    rulesBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,215,0,0.12)', borderWidth: 1.2, borderColor: 'rgba(255,215,0,0.6)', justifyContent: 'center', alignItems: 'center' },
    rulesChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 12, borderWidth: 1.2, borderColor: 'rgba(255,215,0,0.55)', backgroundColor: 'rgba(255,215,0,0.10)', marginTop: -6, marginBottom: 18 },
    rulesChipText: { color: '#FDE68A', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    rulesOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 60, paddingHorizontal: 18, justifyContent: 'center' },
    rulesPanelWrap: { width: '100%', maxHeight: '100%', flexShrink: 1 },
    rulesFrame: { borderRadius: 28, padding: 1.5, flexShrink: 1 },
    rulesPanel: { borderRadius: 26.5, backgroundColor: 'rgba(2,4,14,0.96)', padding: 16, flexShrink: 1 },
    rulesHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    rulesTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
    rulesSub: { color: '#C084FC', fontSize: 9, fontWeight: '900', letterSpacing: 2.5, marginTop: 2 },
    ruleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 1, padding: 10, marginBottom: 8 },
    ruleIconBox: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    ruleTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 2 },
    ruleText: { color: '#E2E8F0', fontSize: 12, fontWeight: '600', lineHeight: 17 },

    activeEngineMainContainer: { flex: 1, alignItems: 'center', paddingTop: 0 },
    
    // 🔥 SATTI FIX: REDUCED VERTICAL PADDINGS SO GRID FITS PERFECTLY 🔥
    statusPill: { backgroundColor: 'rgba(168, 85, 247, 0.12)', paddingHorizontal: 20, paddingVertical: 5, borderRadius: 25, borderWidth: 1, borderColor: '#A855F7', marginBottom: 5, shadowColor: '#A855F7', shadowOpacity: 0.4, shadowRadius: 10 },
    shufflingPill: { borderColor: '#A855F7', backgroundColor: 'rgba(168, 85, 247, 0.1)' },
    statusText: { color: '#C084FC', fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },

    // 🆕 timeline bar
    timelineTrackContainer: { width: '95%', height: 5, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
    timelineFillBar: { height: '100%', backgroundColor: '#A855F7', borderRadius: 3, shadowColor: '#A855F7', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },

    liveHudContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '95%', backgroundColor: 'rgba(2,4,14,0.85)', paddingVertical: 6, paddingHorizontal: 20, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(168,85,247,0.45)', marginBottom: 5 },
    hudScoreText: { color: '#00F2FE', fontSize: 16, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0, 242, 254, 0.6)', textShadowRadius: 8 },
    hudComboText: { color: '#FFD700', fontSize: 16, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(255, 215, 0, 0.6)', textShadowRadius: 8 },

    playersContainer: { width: '100%', paddingHorizontal: 10, height: 55, marginBottom: 5 },
    playersTitle: { color: '#CBD5E1', fontSize: 11, fontWeight: '800', marginBottom: 3, letterSpacing: 1.5 },
    playerAvatarWrapper: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#10B981', overflow: 'hidden' },
    eliminatedAvatar: { borderColor: '#EF4444', opacity: 0.4 },
    playerAvatar: { width: '100%', height: '100%' },
    playerInitials: { width: '100%', height: '100%', backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
    initialText: { color: '#FFF', fontWeight: 'bold' },
    scoreText: { color: '#C084FC', fontSize: 10, fontWeight: '900', marginTop: 4 },
    crossOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },

    // 🆕 FULL SCREEN BOARD: neon frame + board area that takes ALL remaining height (pushed down, cards scale to fill)
    boardFrame: { flex: 1, width: '100%', borderRadius: 26, padding: 1.5, marginTop: 8, marginBottom: 6 },
    gridContainerWrapper: { flex: 1, width: '100%', borderRadius: 24.5, backgroundColor: 'rgba(2,4,14,0.62)', overflow: 'hidden', justifyContent: 'center' },
    gridContainer: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8 },
    
    // 🔥 SATTI FIX: NEW MATH FOR ENLARGED CARDS 🔥 (card width/height are now overridden by the measured `size`)
    columnWrapper: { gap: 8, justifyContent: 'center', marginBottom: 8 },
    card: { 
        width: Math.floor((width - 80) / 5.8), // fallback size until the board is measured
        height: Math.floor((width - 80) / 5.8), 
        borderRadius: 8, 
        borderWidth: 2, 
        borderColor: 'rgb(253, 178, 3)', 
        overflow: 'hidden',
        backgroundColor: '#000000',
        elevation: 8,
        shadowColor: '#00F2FE',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    cardFace: { ...StyleSheet.absoluteFillObject, backfaceVisibility: 'hidden' },
    cardBack: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 6,
        borderStyle: 'dashed',
        overflow: 'hidden'
    },
    boxGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    cardEmojiText: { fontSize: 24 }, // Increased emoji size for bigger cards

    neonGlowGreen: { borderColor: '#10B981', shadowColor: '#10B981', shadowOpacity: 0.8, shadowRadius: 10, elevation: 15 },
    neonGlowBlue: { borderColor: '#00F2FE', shadowColor: '#00F2FE', shadowOpacity: 0.8, shadowRadius: 10, elevation: 15 },

    blackoutOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.95)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200
    },
    jackpotFlash: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 215, 0, 0.8)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200
    },

    massFreezeOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#EF4444',
        zIndex: 100
    },
    massFreezeTitle: { color: '#EF4444', fontSize: 24, fontWeight: '900', letterSpacing: 2, textShadowColor: 'rgba(239,68,68,0.8)', textShadowRadius: 15 },
    massFreezeSub: { color: '#FFF', fontSize: 14, fontWeight: '800', marginTop: 5, letterSpacing: 1 },

    eliminatedText: { color: '#F87171', fontSize: 16, fontWeight: '900', letterSpacing: 1.5, marginTop: 10, textShadowColor: 'rgba(239, 68, 68, 0.6)', textShadowRadius: 10 },

    terminalStateWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 15 },
    trophyStage: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    trophyCrown: { position: 'absolute', top: 4, alignSelf: 'center' },
    summaryTrophyIcon: { marginBottom: 10, shadowColor: '#FFD700', shadowOpacity: 0.6, shadowRadius: 20 },
    terminalTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 1.5, marginBottom: 10, textAlign: 'center', textShadowColor: 'rgba(255,215,0,0.6)', textShadowRadius: 15 },
    
    leaderboardFrame: { width: '100%', borderRadius: 22, padding: 1.4, marginBottom: 15 },
    leaderboardContainer: { width: '100%', backgroundColor: 'rgba(2,4,14,0.92)', borderRadius: 20.6, padding: 5, borderWidth: 0, borderColor: 'rgba(255,255,255,0.15)' },
    leaderboardTitle: { color: '#CBD5E1', fontSize: 12, fontWeight: '900', marginBottom: 12, textAlign: 'center', letterSpacing: 1.5, marginTop: 6 },
    leaderboardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 10, marginBottom: 8 },
    leaderboardRowWinner: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: 'rgba(16, 185, 129, 0.45)', borderWidth: 1 },
    lbRank: { color: '#CBD5E1', fontSize: 14, fontWeight: '900', width: 30 },
    lbName: { color: '#FFF', fontSize: 14, fontWeight: '800', flex: 1, marginLeft: 10 },
    lbScore: { color: '#00F2FE', fontSize: 11, fontWeight: '900' },

    // 🆕 RESULT BOARD (winner photo hero / podium / photo leaderboard)
    resultScrollContent: { alignItems: 'center', paddingTop: 4, paddingBottom: 14 },
    heroStage: { width: '100%', height: 250, alignItems: 'center', justifyContent: 'center' },
    heroGlow: { position: 'absolute', width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,215,0,0.10)' },
    heroTrophyLeft: { position: 'absolute', left: 2, top: 54 },
    heroDiamondRight: { position: 'absolute', right: 4, top: 78 },
    heroAvatarsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    heroAvatarFrame: { justifyContent: 'center', alignItems: 'center', elevation: 18, shadowColor: '#FFD700', shadowOpacity: 0.9, shadowRadius: 22, shadowOffset: { width: 0, height: 0 } },
    heroAvatarInner: { backgroundColor: '#030612', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    heroCrown: { position: 'absolute', top: 2, alignSelf: 'center', zIndex: 30 },
    championChip: { paddingHorizontal: 18, paddingVertical: 7, borderRadius: 16, marginTop: 2, marginBottom: 10, elevation: 8, shadowColor: '#FFD700', shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
    championChipText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900', letterSpacing: 2, textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
    winnerScorePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 14, borderWidth: 1.2, borderColor: 'rgba(255,215,0,0.6)', backgroundColor: 'rgba(255,215,0,0.12)', marginBottom: 16 },
    winnerScoreText: { color: '#FDE68A', fontSize: 15, fontWeight: '900', letterSpacing: 2 },

    podiumRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', width: '100%', gap: 8, marginBottom: 16, paddingHorizontal: 6 },
    podiumCol: { flex: 1, alignItems: 'center' },
    podiumMedal: { fontSize: 20, marginBottom: 2 },
    podiumAvatarRing: { borderWidth: 2.5, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050A18', elevation: 10, shadowOpacity: 0.8, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
    podiumName: { color: '#FFF', fontSize: 11, fontWeight: '800', marginTop: 5, marginBottom: 5, maxWidth: '100%' },
    podiumBar: { width: '100%', borderTopLeftRadius: 14, borderTopRightRadius: 14, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    podiumGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 24 },
    podiumScore: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
    podiumPts: { color: 'rgba(255,255,255,0.85)', fontSize: 8, fontWeight: '900', letterSpacing: 2 },

    lbAvatarRing: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginLeft: 8, overflow: 'hidden', backgroundColor: '#050A18' },
    leaderboardRowMe: { backgroundColor: 'rgba(168,85,247,0.2)' },

    resultDetailsCard: { width: '100%', backgroundColor: 'rgba(2,4,14,0.85)', borderRadius: 18, padding: 15, borderWidth: 1, borderColor: 'rgba(168,85,247,0.35)', marginBottom: 15 },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
    resultLabel: { color: '#CBD5E1', fontSize: 13, fontWeight: '800' },
    resultValue: { color: '#FFF', fontSize: 16, fontWeight: '900' }
});
