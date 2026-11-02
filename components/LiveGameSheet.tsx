import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, onSnapshot, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { getDownloadURL, getStorage, ref as storageRef } from 'firebase/storage';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, Image, Modal, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

// 🎨 DYNAMIC ARCADE COLOR CONFIG
const COLOR_POOL = [
    { name: 'RED', colorCode: '#FF2A5F' },
    { name: 'BLUE', colorCode: '#00F2FE' },
    { name: 'GREEN', colorCode: '#10B981' },
    { name: 'YELLOW', colorCode: '#FFD700' },
    { name: 'PURPLE', colorCode: '#A855F7' },
    { name: 'ORANGE', colorCode: '#F97316' }
];

const MAX_PLAYERS = 10;

// 🆕 GAME RULES (shown when the "GAME RULES" chip is tapped) - matches the real game logic
const GAME_RULES = [
    { icon: 'game-controller', color: '#10B981', title: 'FREE TO PLAY', text: 'No entry fee. No coins are won or lost. Play for the top spot and the winner crown!' },
    { icon: 'people', color: '#00F2FE', title: 'JOIN THE ARENA', text: `Up to ${MAX_PLAYERS} players can join. The host needs at least 2 players to start. The host can also join and play.` },
    { icon: 'timer', color: '#FF2A5F', title: '60 SECOND MATCH', text: 'Everyone plays the same 60 second challenge at the same time.' },
    { icon: 'color-palette', color: '#00F2FE', title: 'RULE: MATCH THE COLOR', text: 'A colour word appears. Tap the button whose name matches the COLOR of the letters, not what the word says.' },
    { icon: 'text', color: '#FFD700', title: 'RULE: READ THE TEXT', text: 'Tap the button that matches the WORD written and ignore its colour. The rule changes every round, so watch the banner!' },
    { icon: 'shuffle', color: '#A855F7', title: 'BUTTONS SHUFFLE', text: 'Button names and colours are mixed up every round, so stay sharp.' },
    { icon: 'flash', color: '#FFD700', title: 'SCORING', text: 'Correct tap = +100 points, plus +15 bonus for every combo in a row. Wrong tap = -150 points (never below 0) and your combo resets.' },
    { icon: 'trophy', color: '#FFD700', title: 'WINNER', text: 'Highest score wins. If scores are equal it is a tie and all top players win. Results appear a few seconds after the timer ends.' },
    { icon: 'warning', color: '#F59E0B', title: "DON'T LEAVE", text: 'Do not close the app during the match, or your score may not be counted.' },
];

// 🆕 BACKGROUND IMAGE (starry nebula)
const BG_IMG = 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?auto=format&fit=crop&w=1080&q=70';

// 🆕 3D IMAGES (icons8 3D Fluency) - icon fallback if load fails
const IMG = {
    trophy: 'https://img.icons8.com/3d-fluency/512/trophy.png',
    star: 'https://img.icons8.com/3d-fluency/512/star.png',
    diamond: 'https://img.icons8.com/3d-fluency/512/diamond.png',
    crown: 'https://img.icons8.com/3d-fluency/512/crown.png',
    gift: 'https://img.icons8.com/3d-fluency/512/gift.png',
};

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

// 🆕 PHOTO FIX: profilePic is checked FIRST (same as Memory Match), then the other common names
const PHOTO_KEYS = [
    'profilePic', 'profilePicture', 'profileImage', 'profilePhoto', 'profilePicUrl', 'profilePicURL',
    'profileImageUrl', 'profileImageURL', 'profilePhotoUrl', 'profilePhotoURL',
    'avatar', 'avatarUrl', 'avatarURL', 'image', 'imageUrl', 'photo', 'dp',
    'userImage', 'userPhoto', 'picture', 'pic', 'img', 'imgUrl', 'displayPhoto', 'thumbnail',
    'photoURL', 'photoUrl' // Google account photo = last fallback
];
const asPhotoStr = (v: any): string => {
    if (!v) return '';
    if (typeof v === 'string') return v.trim();
    if (typeof v === 'object') return asPhotoStr(v.url || v.uri || v.downloadURL || v.downloadUrl || v.src || '');
    return '';
};
const pickPhoto = (u: any): string => {
    if (!u) return '';
    for (const k of PHOTO_KEYS) {
        const s = asPhotoStr(u[k]);
        if (s) return s;
    }
    for (const nested of ['profile', 'user', 'userData', 'data', 'info']) {
        const n = u[nested];
        if (n && typeof n === 'object') {
            for (const k of PHOTO_KEYS) {
                const s = asPhotoStr(n[k]);
                if (s) return s;
            }
        }
    }
    for (const key of Object.keys(u)) {
        if (/(photo|image|img|avatar|pic|dp)/i.test(key)) {
            const s = asPhotoStr(u[key]);
            if (s && (/^(https?:|gs:|data:image)/i.test(s) || /\.(png|jpe?g|webp|gif)/i.test(s))) return s;
        }
    }
    return '';
};

// is this a directly loadable photo link?
const isHttpPhoto = (s: any): boolean => typeof s === 'string' && /^(https?:\/\/|data:image)/i.test(s);

// 🆕 PHOTO FIX: any photo value -> loadable URL. If storage resolve fails, the original value is returned (never lost)
const resolvePhotoUrl = async (raw: string): Promise<string> => {
    const s = (raw || '').trim();
    if (!s) return '';
    if (/^http:\/\//i.test(s)) return s.replace(/^http:\/\//i, 'https://');
    if (/^(https:\/\/|data:image|file:\/\/)/i.test(s)) return s;
    try {
        return await getDownloadURL(storageRef(getStorage(), s));
    } catch (e) {
        console.log('Photo resolve failed:', e);
        return s;
    }
};

// 🆕 3D image with auto icon fallback
const Img3D = ({ uri, size, fallback, color = '#FFF', style }: any) => {
    const [err, setErr] = useState(false);
    if (err) return <Ionicons name={fallback} size={size * 0.7} color={color} />;
    return <Image source={{ uri }} style={[{ width: size, height: size }, style]} resizeMode="contain" onError={() => setErr(true)} />;
};

// 🆕 Player avatar - shows profile photo, falls back to coloured initial if no photo / load fails
const Avatar = ({ uri, name, size, color = '#00F2FE', textSize }: any) => {
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

interface LiveGameSheetProps {
    visible: boolean;
    onClose: () => void;
    liveId: string;
    isHost: boolean;
    userWalletBalance: number;
    collectionName?: string;
}

export default function LiveGameSheet({ visible, onClose, liveId, isHost, userWalletBalance, collectionName = 'lives' }: LiveGameSheetProps) {
    const insets = useSafeAreaInsets();

    // --- System States ---
    const [gameStatus, setGameStatus] = useState<'WAITING' | 'PLAYING' | 'FINISHED' | 'CANCELLED'>('WAITING');
    const [players, setPlayers] = useState<any[]>([]);
    // isFeeLocked field name kept only for compatibility with other files. Meaning now = "Arena is OPEN".
    const [isFeeLocked, setIsFeeLocked] = useState<boolean>(false);
    const [hostId, setHostId] = useState<string>('');
    const [matchResults, setMatchResults] = useState<any>(null);

    // --- Gameplay Engine States ---
    const [targetWord, setTargetWord] = useState<string>('START');
    const [displayColor, setDisplayColor] = useState<string>('#00F2FE');
    const [score, setScore] = useState<number>(0);
    const [combo, setCombo] = useState<number>(0);
    const [gameTimeLeft, setGameTimeLeft] = useState<number>(60);
    const [isPlayingSolo, setIsPlayingSolo] = useState<boolean>(false);
    const [hasSubmittedScore, setHasSubmittedScore] = useState<boolean>(false);

    // --- Twist States ---
    const [currentRule, setCurrentRule] = useState<'COLOR' | 'WORD'>('COLOR');
    const [buttonDecoys, setButtonDecoys] = useState(COLOR_POOL);
    const [wordTilt, setWordTilt] = useState<string>('0deg');
    const [wordFontSize, setWordFontSize] = useState<number>(52);
    const [wordTranslate, setWordTranslate] = useState({ x: 0, y: 0 });

    // --- Lobby States ---
    const [lobbyTimeLeft, setLobbyTimeLeft] = useState<number>(45);
    const [isProcessing, setIsProcessing] = useState<boolean>(false);
    const [showRules, setShowRules] = useState<boolean>(false);
    const rulesAnim = useRef(new Animated.Value(0)).current;
    const hasJoined = players.some(p => p.id === auth.currentUser?.uid);
    const canPlay = isHost ? hasJoined : true;

    // 🆕 PHOTO FIX: live photo cache (userId -> photo URL)
    const [photoMap, setPhotoMap] = useState<Record<string, string>>({});
    const photoMapRef = useRef<Record<string, string>>({});
    const photoFetchedRef = useRef<Set<string>>(new Set());

    // cache first (fresh profilePic from users doc), then whatever the room doc saved (photo / avatar)
    const getPhoto = (p: any): string => {
        if (!p) return '';
        return photoMap[p.id] || p.avatar || p.photo || '';
    };
    // same lookup but safe to use inside timers / transactions (no stale state)
    const getPhotoFromRef = (p: any): string => {
        if (!p) return '';
        return photoMapRef.current[p.id] || p.avatar || p.photo || '';
    };

    // --- Animation & Data Refs ---
    const progressAnim = useRef(new Animated.Value(1)).current;
    const scoreAnim = useRef(new Animated.Value(1)).current;
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // 🆕 PREMIUM ANIMATION VALUES
    const heroIn = useRef(new Animated.Value(0)).current;
    const rotAnim = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const sweepAnim = useRef(new Animated.Value(0)).current;
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
    const PARTICLE_COLORS = ['#00F2FE', '#A855F7', '#FFD700', '#FFFFFF'];

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

    const scoreRef = useRef<number>(0);
    const hasSubmittedScoreRef = useRef<boolean>(false);

    // Auto-detect forum vs live based on ID
    const actualCollection = liveId?.startsWith('forum_') ? 'forum_rooms' : collectionName;
    const roomRef = doc(db, actualCollection, liveId, 'games', 'reflex_arena');

    // 🆕 PHOTO FIX: every player (lobby + result board) -> ALWAYS read the profile from users/{id} once.
    // profilePic wins over the old Google photo saved in the room doc.
    useEffect(() => {
        if (!visible) { photoFetchedRef.current.clear(); return; }
        const all: any[] = [...players, ...((matchResults && matchResults.rankedPlayers) || [])];
        all.forEach((p: any) => {
            const id = p?.id;
            if (!id || photoFetchedRef.current.has(id)) return;
            photoFetchedRef.current.add(id);
            (async () => {
                try {
                    let url = '';
                    const snap = await getDoc(doc(db, 'users', id));
                    if (snap.exists()) url = await resolvePhotoUrl(pickPhoto(snap.data()));
                    if (!url) url = await resolvePhotoUrl(p.avatar || p.photo || '');
                    if (!url && id === auth.currentUser?.uid) url = await resolvePhotoUrl(auth.currentUser?.photoURL || '');
                    if (url) {
                        photoMapRef.current[id] = url;
                        setPhotoMap(prev => ({ ...prev, [id]: url }));
                    }
                } catch (e) {
                    console.log('Photo fetch failed for', id, e);
                    photoFetchedRef.current.delete(id); // allow retry on next update
                }
            })();
        });
    }, [players, matchResults, visible]);

    // One-time premium animations (re-run every time the arena opens, stopped when closed)
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

    // PARENT ROOM LISTENER FOR HOST FORCE-CLOSE
    useEffect(() => {
        if (!liveId || !visible || isHost) return;
        const parentRoomRef = doc(db, actualCollection, liveId);

        const unsubParent = onSnapshot(parentRoomRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.status === 'ended' || data.status === 'CANCELLED') {
                    onClose();
                }
            }
        });

        return () => unsubParent();
    }, [liveId, visible, isHost, actualCollection]);

    useEffect(() => {
        if (!liveId || !visible) return;

        if (isHost) {
            getDoc(roomRef).then(snap => {
                const data = snap.data();
                if (!snap.exists() || data?.status === 'FINISHED' || data?.status === 'CANCELLED') {
                    setDoc(roomRef, {
                        status: 'WAITING',
                        entryFee: 0,
                        isFeeLocked: true,
                        hostId: auth.currentUser?.uid,
                        players: [],
                        createdAt: serverTimestamp()
                    });
                    setMatchResults(null);
                    setPlayers([]);
                    setIsFeeLocked(true);
                    setHasSubmittedScore(false);
                    hasSubmittedScoreRef.current = false;
                } else if (data?.status === 'WAITING' && data?.isFeeLocked !== true) {
                    updateDoc(roomRef, { isFeeLocked: true, entryFee: 0 }).catch(() => {});
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

                if (data.status === 'FINISHED') {
                    setMatchResults({
                        isTie: data.isTie,
                        winnerIds: data.winnerIds,
                        rankedPlayers: data.rankedPlayers || data.players
                    });
                    if (isPlayingSolo) {
                        setIsPlayingSolo(false);
                        if (timerRef.current) clearInterval(timerRef.current);
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
        return () => { if (interval) clearInterval(interval); }
    }, [gameStatus, isFeeLocked, visible]);

    useEffect(() => {
        if (gameStatus === 'PLAYING') {
            if (canPlay && !isPlayingSolo && gameTimeLeft === 60) {
                setScore(0);
                scoreRef.current = 0;
                setCombo(0);
                setHasSubmittedScore(false);
                hasSubmittedScoreRef.current = false;
                progressAnim.setValue(1);
                generateNewClash();
                setIsPlayingSolo(true);
            }

            timerRef.current = setInterval(() => {
                setGameTimeLeft(prev => {
                    if (prev > 1) {
                        Animated.timing(progressAnim, {
                            toValue: (prev - 1) / 60,
                            duration: 1000,
                            easing: Easing.linear,
                            useNativeDriver: false
                        }).start();
                        return prev - 1;
                    } else {
                        if (timerRef.current) clearInterval(timerRef.current);

                        if (canPlay && !hasSubmittedScoreRef.current) {
                            submitMyScore(scoreRef.current);
                        }

                        if (isHost) {
                            setTimeout(() => {
                                finalizeMatchResults();
                            }, 6000);
                        }
                        return 0;
                    }
                });
            }, 1000);
        } else {
            setGameTimeLeft(60);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameStatus]);

    const generateNewClash = () => {
        let wordIdx = Math.floor(Math.random() * COLOR_POOL.length);
        let colorIdx = Math.floor(Math.random() * COLOR_POOL.length);

        if (Math.random() < 0.90) {
            while (wordIdx === colorIdx) {
                colorIdx = Math.floor(Math.random() * COLOR_POOL.length);
            }
        }

        let finalWord = COLOR_POOL[wordIdx].name;
        if (Math.random() > 0.4) {
            finalWord = finalWord.split('').map(c => Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase()).join('');
        }
        if (Math.random() > 0.6) {
            finalWord = finalWord.split('').join(' ');
        }

        setTargetWord(finalWord);
        setDisplayColor(COLOR_POOL[colorIdx].colorCode);
        setCurrentRule(Math.random() > 0.5 ? 'COLOR' : 'WORD');

        const shuffledNames = [...COLOR_POOL].map(c => c.name).sort(() => Math.random() - 0.5);
        const shuffledColors = [...COLOR_POOL].map(c => c.colorCode).sort(() => Math.random() - 0.5);
        const generatedDecoys = shuffledNames.map((name, index) => ({ name, colorCode: shuffledColors[index] }));

        setButtonDecoys(generatedDecoys);
        setWordTilt(`${(Math.random() * 30 - 15).toFixed(1)}deg`);
        setWordFontSize(Math.floor(Math.random() * 14) + 26);
        setWordTranslate({ x: Math.random() * 30 - 15, y: Math.random() * 20 - 10 });
    };

    const handleColorTap = (tappedName: string, tappedColorCode: string) => {
        if (gameStatus !== 'PLAYING' || !isPlayingSolo) return;

        let isCorrect = false;

        if (currentRule === 'COLOR') {
            const correctColorObj = COLOR_POOL.find(c => c.colorCode === displayColor);
            if (tappedName === correctColorObj?.name || tappedColorCode === displayColor) {
                isCorrect = true;
            }
        } else {
            const cleanWord = targetWord.replace(/\s/g, '').toUpperCase();
            const correctWordObj = COLOR_POOL.find(c => c.name === cleanWord);
            if (tappedName === cleanWord || tappedColorCode === correctWordObj?.colorCode) {
                isCorrect = true;
            }
        }

        if (isCorrect) {
            const addedScore = 100 + (combo * 15);
            setScore(prev => {
                const newScore = prev + addedScore;
                scoreRef.current = newScore;
                return newScore;
            });
            setCombo(prev => prev + 1);

            Animated.sequence([
                Animated.timing(scoreAnim, { toValue: 1.4, duration: 100, useNativeDriver: true }),
                Animated.timing(scoreAnim, { toValue: 1, duration: 100, useNativeDriver: true })
            ]).start();
        } else {
            setCombo(0);
            setScore(prev => {
                const newScore = Math.max(0, prev - 150);
                scoreRef.current = newScore;
                return newScore;
            });
        }
        generateNewClash();
    };

    // Join = FREE. No wallet deduction, no transaction record.
    const handleJoinArena = async () => {
        if (!auth.currentUser || isProcessing || !isFeeLocked) return;
        setIsProcessing(true);
        const uid = auth.currentUser.uid;
        let uName = auth.currentUser.displayName || 'Player';
        let uPhoto: string = '';

        try {
            // Use the app profile name + photo (users/{uid}) - same as Memory Match
            try {
                const uSnap = await getDoc(doc(db, "users", uid));
                if (uSnap.exists()) {
                    const uData = uSnap.data();
                    uName = uData.name || uData.displayName || uName;
                    uPhoto = pickPhoto(uData);
                    console.log('REFLEX JOIN -> photo field picked:', uPhoto);
                }
            } catch (nameErr) {
                console.log("Profile fetch failed, using auth data:", nameErr);
            }

            // fallback to the auth photo only if the profile had nothing
            if (!uPhoto) uPhoto = auth.currentUser.photoURL || '';

            // 🆕 PHOTO FIX: loadable URL + local cache so the lobby shows it immediately
            uPhoto = await resolvePhotoUrl(uPhoto);
            if (uPhoto) {
                photoMapRef.current[uid] = uPhoto;
                setPhotoMap(prev => ({ ...prev, [uid]: uPhoto }));
            }

            await runTransaction(db, async (transaction) => {
                const roomSnap = await transaction.get(roomRef);

                if (!roomSnap.exists()) throw "Data missing! Arena setup might be incomplete.";

                const roomData = roomSnap.data();
                const currentPlayers = roomData.players || [];

                if (roomData.status !== 'WAITING') throw "Arena already active!";
                if (currentPlayers.find((p: any) => p.id === uid)) throw "Already joined";
                if (currentPlayers.length >= MAX_PLAYERS) throw "Arena Full";

                transaction.update(roomRef, {
                    players: [...currentPlayers, {
                        id: uid,
                        name: uName,
                        photo: uPhoto || '',
                        avatar: uPhoto || '', // 🆕 same field name as Memory Match
                        score: 0,
                        hasFinished: false,
                        joinedAt: Date.now()
                    }]
                });
            });
            Alert.alert("Success!", "You joined the Arena. Waiting for launch.");
        } catch (e: any) {
            Alert.alert("Join Failed", e.toString());
        }
        setIsProcessing(false);
    };

    // Exit = just leave the arena. No refund needed.
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
            Alert.alert("Left Arena", "You left the arena.");
        } catch (e: any) {
            Alert.alert("Exit Failed", e.toString());
        }
        setIsProcessing(false);
    };

    // Host close = cancel arena for everyone
    const handleHostClose = async () => {
        if (isHost && (gameStatus === 'WAITING' || gameStatus === 'PLAYING') && players.length > 0) {
            Alert.alert(
                "Cancel Arena?",
                "Closing now will cancel the arena for all participants.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Yes, Cancel Arena", style: "destructive", onPress: async () => {
                        setIsProcessing(true);
                        try {
                            await updateDoc(roomRef, { status: 'CANCELLED', players: [] });
                            onClose();
                        } catch (e) {
                            console.log("Cancel error:", e);
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

    const launchLiveReflexMatch = async () => {
        if (players.length < 2) {
            Alert.alert("Waiting for Challengers ⏳", "Need at least 2 participants to start the match!");
            return;
        }
        try {
            await updateDoc(roomRef, {
                status: 'PLAYING',
                gameStartedAt: serverTimestamp(),
                gameExpiresAt: Date.now() + 75000
            });
        } catch (e) { console.log(e); }
    };

    const submitMyScore = async (finalScore: number) => {
        if (!auth.currentUser || hasSubmittedScoreRef.current) return;

        setHasSubmittedScore(true);
        hasSubmittedScoreRef.current = true;
        setIsPlayingSolo(false);
        const uid = auth.currentUser.uid;

        const pushScoreToDB = async (retryCount = 0) => {
            try {
                await runTransaction(db, async (transaction) => {
                    const roomSnap = await transaction.get(roomRef);
                    if (!roomSnap.exists() || roomSnap.data().status !== 'PLAYING') return;

                    const data = roomSnap.data();
                    const currentPlayers = data.players || [];

                    const updatedPlayers = currentPlayers.map((p: any) =>
                        p.id === uid ? { ...p, score: finalScore, hasFinished: true } : p
                    );

                    transaction.update(roomRef, { players: updatedPlayers });
                });
            } catch (e) {
                console.error(`Score Submit Retry ${retryCount}:`, e);
                if (retryCount < 3) {
                    setTimeout(() => pushScoreToDB(retryCount + 1), 1000 + Math.random() * 1500);
                }
            }
        };

        setTimeout(() => pushScoreToDB(0), Math.random() * 1500);
    };

    // Only ranks players and decides the winner. NO wallet credit, NO commission.
    const finalizeMatchResults = async () => {
        if (isProcessing || !isHost) return;
        setIsProcessing(true);

        try {
            await runTransaction(db, async (transaction) => {
                const roomSnap = await transaction.get(roomRef);
                if (!roomSnap.exists()) return;
                const data = roomSnap.data();

                if (data.status !== 'PLAYING') return;

                const currentPlayers = data.players || [];
                if (currentPlayers.length === 0) return;

                // 🆕 PHOTO FIX: every ranked player carries photo + avatar into the result board
                const ranked = [...currentPlayers]
                    .map((p: any) => {
                        const ph = getPhotoFromRef(p);
                        return { ...p, photo: ph, avatar: ph };
                    })
                    .sort((a, b) => (b.score || 0) - (a.score || 0));

                const topScore = Number(ranked[0]?.score) || 0;
                const winners = ranked.filter(p => p.score === topScore);
                const isTie = winners.length > 1;

                transaction.update(roomRef, {
                    status: 'FINISHED',
                    rankedPlayers: ranked,
                    isTie: isTie,
                    winnerIds: winners.map(w => w.id)
                });
            });
        } catch (e) {
            console.error("Result error:", e);
            setTimeout(finalizeMatchResults, 2000);
        }
        setIsProcessing(false);
    };

    // GAME RULES open / close
    const openRules = () => {
        rulesAnim.setValue(0);
        setShowRules(true);
        Animated.spring(rulesAnim, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }).start();
    };
    const closeRules = () => {
        Animated.timing(rulesAnim, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => setShowRules(false));
    };

    const progressBarWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    const getWinnerText = () => {
        if (!matchResults || !players.length) return "UNKNOWN";
        if (matchResults.isTie) return "TIE - MULTIPLE TOP CHALLENGERS!";
        const w = (matchResults.rankedPlayers || players).find((p: any) => p.id === matchResults.winnerIds?.[0]);
        return w ? w.name.toUpperCase() : "UNKNOWN";
    };

    // RESULT BOARD DATA (winner photo hero + podium)
    const rankedList: any[] = matchResults?.rankedPlayers || [];
    const winnerList: any[] = rankedList.filter((p: any) => matchResults?.winnerIds?.includes(p.id));
    const heroWinners: any[] = winnerList.slice(0, 3);
    const heroAvatarSize = heroWinners.length > 1 ? 92 : 128;
    const iAmWinner = !!matchResults?.winnerIds?.includes(auth.currentUser?.uid);
    const podiumOrder: number[] = rankedList.length >= 3 ? [1, 0, 2] : rankedList.length === 2 ? [1, 0] : [];
    const PODIUM_META = [
        { color: '#FFD700', medal: '🥇', barH: 96 },
        { color: '#CBD5E1', medal: '🥈', barH: 70 },
        { color: '#F97316', medal: '🥉', barH: 52 },
    ];

    // Interpolations
    const spin = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });
    const sweepX = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.6, width * 1.1] });
    const stageRotX = heroIn.interpolate({ inputRange: [0, 1], outputRange: ['30deg', '0deg'] });
    const stageScale = heroIn.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });

    const statusLabel = gameStatus === 'WAITING' ? 'LOBBY' : gameStatus === 'PLAYING' ? 'LIVE MATCH' : gameStatus === 'FINISHED' ? 'RESULTS' : 'CLOSED';
    const statusColor = gameStatus === 'PLAYING' ? '#FF2A5F' : gameStatus === 'FINISHED' ? '#FFD700' : '#00F2FE';

    // Glossy overlay for gradient buttons
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
                        { paddingTop: insets.top + 10, paddingBottom: insets.bottom + 50 },
                        { transform: [{ translateX: pan.x }, { translateY: pan.y }] }
                    ]}
                >
                    {/* DARKER base + background image + tint layers */}
                    <LinearGradient colors={['#050A18', '#010309']} style={StyleSheet.absoluteFill} />
                    {!bgErr && (
                        <Image source={{ uri: BG_IMG }} resizeMode="cover" onError={() => setBgErr(true)} style={[StyleSheet.absoluteFill, { opacity: 0.3 }]} />
                    )}
                    <LinearGradient colors={['rgba(0,242,254,0.08)', 'rgba(1,3,12,0.35)', 'rgba(168,85,247,0.08)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                    <LinearGradient colors={['rgba(1,3,12,0.35)', 'rgba(1,3,12,0.78)']} style={StyleSheet.absoluteFill} pointerEvents="none" />

                    {/* ambient orbs */}
                    <Animated.View pointerEvents="none" style={[styles.shimmerOrb, { top: 80, right: -80, backgroundColor: '#00F2FE', transform: [{ translateY: orbTranslateY }] }]} />
                    <Animated.View pointerEvents="none" style={[styles.shimmerOrb, { bottom: 60, left: -100, backgroundColor: '#A855F7', transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

                    {/* floating particles */}
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

                    {/* Top Drag Handle */}
                    <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
                        <View style={styles.dragPill} />
                    </View>

                    <View style={styles.sheetHeaderRow}>
                        <View style={styles.titleIconBadge}>
                            <View style={styles.titleOrbitWrap}>
                                <OrbitRing size={44} color="#00F2FE" dur={5200} dotSize={5} />
                                <View style={styles.titleBrainCircle}>
                                    <MaterialCommunityIcons name="brain" size={20} color="#00F2FE" />
                                </View>
                            </View>
                            <View>
                                <Text style={styles.mainTitleText}>REFLEX BLITZ Arena</Text>
                                <View style={[styles.statusPill, { borderColor: statusColor + '88' }]}>
                                    <PulseDot color={statusColor} size={6} />
                                    <Text style={[styles.statusPillText, { color: lighten(statusColor, 0.3) }]}>{statusLabel}</Text>
                                    <Text style={styles.statusPillCount}>{players.length}/{MAX_PLAYERS}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.headerBtnRow}>
                            <TouchableOpacity onPress={handleHostClose} style={styles.closeRoundBtn}>
                                <Ionicons name="close" size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* MATCHMAKING */}
                    {gameStatus === 'WAITING' && (
                        <ScrollView
                            style={{ flex: 1 }}
                            contentContainerStyle={styles.lobbyStateWrapper}
                            showsVerticalScrollIndicator={false}
                            nestedScrollEnabled
                        >
                            {/* LOBBY STAGE (countdown gauge + spinning core + 3D objects) */}
                            <Animated.View style={[styles.stageWrap, { opacity: heroIn, transform: [{ perspective: 900 }, { rotateX: stageRotX }, { scale: stageScale }] }]}>
                                <View style={styles.stageGlowBig} pointerEvents="none" />
                                <Animated.View pointerEvents="none" style={[styles.heroSweep, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
                                    <LinearGradient colors={['transparent', 'rgba(255,255,255,0.10)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                                </Animated.View>

                                <Sparkle x={width * 0.14} y={24} size={13} color="#00F2FE" delay={0} />
                                <Sparkle x={width * 0.7} y={50} size={10} color="#FFD700" delay={600} />
                                <Sparkle x={width * 0.1} y={150} size={11} color="#A855F7" delay={1100} />

                                <FloatBox amp={7} dur={2000} style={styles.stageTrophy}>
                                    <Img3D uri={IMG.trophy} size={54} fallback="trophy" color="#FFD700" />
                                </FloatBox>
                                <FloatBox amp={9} dur={2400} style={styles.stageDiamond}>
                                    <Img3D uri={IMG.diamond} size={46} fallback="diamond" color="#00F2FE" />
                                </FloatBox>
                                <FloatBox amp={6} dur={2800} style={styles.stageStar}>
                                    <Img3D uri={IMG.star} size={34} fallback="star" color="#FFD700" />
                                </FloatBox>

                                <GaugeRing progress={isFeeLocked ? lobbyTimeLeft / 45 : 0} color="#00F2FE" size={200} ticks={48} dur={900} />

                                <View style={styles.coreWrap}>
                                    <OrbitRing size={128} color="#00F2FE" dur={5000} dotSize={6} />
                                    <OrbitRing size={110} color="#A855F7" dur={8000} reverse dotSize={4} style={{ opacity: 0.7 }} />
                                    <View style={styles.coreMask}>
                                        <Animated.View style={[styles.coreSpin, { transform: [{ rotate: spin }] }]}>
                                            <LinearGradient
                                                colors={['#00F2FE', '#A855F7', '#FF2A5F', '#FFD700', '#00F2FE'] as any}
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

                            <LinearGradient colors={['#00F2FE', '#A855F7', '#00F2FE']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.entryFeeFrame}>
                                <View style={styles.entryFeeContainer}>
                                    <Text style={styles.feeLabel}>ENTRY:</Text>
                                    <View style={styles.feeValueRow}>
                                        <Text style={styles.feeEmoji}>🎮</Text>
                                        <Text style={styles.feeValueText} numberOfLines={1}>FREE TO PLAY</Text>
                                    </View>
                                </View>
                            </LinearGradient>

                            {/* Small GAME RULES chip */}
                            <TouchableOpacity onPress={openRules} activeOpacity={0.8} style={styles.rulesChip}>
                                <Ionicons name="help-circle" size={16} color="#FFD700" />
                                <Text style={styles.rulesChipText}>GAME RULES</Text>
                            </TouchableOpacity>

                            <ScrollView style={{ width: '100%', maxHeight: 260 }} showsVerticalScrollIndicator={false} nestedScrollEnabled>
                                <View style={styles.playerPoolRow}>
                                    {[...Array(MAX_PLAYERS)].map((_, idx) => {
                                        const p = players[idx];
                                        if (p) {
                                            const pc = COLOR_POOL[idx % COLOR_POOL.length].colorCode;
                                            return (
                                                <View key={p.id || idx} style={styles.profileAuraWrapper}>
                                                    <View style={styles.avatarNode}>
                                                        <OrbitRing size={52} color={pc} dur={5200 + (idx % 4) * 600} dotSize={4} />
                                                        <View style={[styles.avatarAuraGlow, { borderColor: pc, shadowColor: pc }]}>
                                                            <Avatar uri={getPhoto(p)} name={p.name} size={38} color={pc} textSize={16} />
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
                            </ScrollView>

                            {/* Host panel - start match + optional "join as player" */}
                            {isHost && isFeeLocked && (
                                <View style={{ width: '100%', marginBottom: 20, alignItems: 'center' }}>
                                    <View style={[styles.feeValueRow, { marginBottom: 10 }]}>
                                        <Text style={[styles.feeEmoji, { fontSize: 12, marginRight: 6 }]}>🟢</Text>
                                        <Text style={[styles.feeLabel, { color: '#34D399', marginBottom: 0 }]} numberOfLines={1}>ARENA OPEN - FREE TO PLAY</Text>
                                    </View>
                                    <TouchableOpacity onPress={launchLiveReflexMatch} style={styles.arcadeLaunchBtn}>
                                        <LinearGradient colors={['#00F2FE', '#059669']} style={StyleSheet.absoluteFill} />
                                        <Gloss />
                                        <Text style={styles.launchBtnLabel}>START 60S CHALLENGE</Text>
                                    </TouchableOpacity>

                                    {!hasJoined ? (
                                        <TouchableOpacity onPress={handleJoinArena} disabled={isProcessing} style={[styles.arcadeLaunchBtn, { marginTop: 12 }]}>
                                            <LinearGradient colors={['#F59E0B', '#D97706']} style={StyleSheet.absoluteFill} />
                                            <Gloss />
                                            <Text style={styles.launchBtnLabel}>{isProcessing ? 'PROCESSING...' : 'JOIN & PLAY AS PLAYER'}</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={{ alignItems: 'center', width: '100%' }}>
                                            <Text style={styles.waitServerSignalText}>You are playing too! Start when everyone is ready.</Text>
                                            <TouchableOpacity onPress={handleExitArena} disabled={isProcessing} style={[styles.arcadeLaunchBtn, { marginTop: 12, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#EF4444', elevation: 0 }]}>
                                                <Text style={[styles.launchBtnLabel, { color: '#EF4444' }]}>{isProcessing ? 'WAIT...' : 'LEAVE AS PLAYER'}</Text>
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </View>
                            )}

                            {!isHost && isFeeLocked && !hasJoined && (
                                <TouchableOpacity onPress={handleJoinArena} disabled={isProcessing} style={styles.arcadeLaunchBtn}>
                                    <LinearGradient colors={['#F59E0B', '#D97706']} style={StyleSheet.absoluteFill} />
                                    <Gloss />
                                    <Text style={styles.launchBtnLabel}>{isProcessing ? 'PROCESSING...' : 'JOIN ARENA (FREE)'}</Text>
                                </TouchableOpacity>
                            )}

                            {!isHost && !isFeeLocked && (
                                <Text style={[styles.waitServerSignalText, { color: '#F59E0B' }]}>⏳ Waiting for host to open the arena...</Text>
                            )}

                            {!isHost && hasJoined && (
                                <View style={{ alignItems: 'center', width: '100%' }}>
                                    <Text style={styles.waitServerSignalText}>You are in! Awaiting expert to launch... ({lobbyTimeLeft}s)</Text>
                                    <TouchableOpacity onPress={handleExitArena} disabled={isProcessing} style={[styles.arcadeLaunchBtn, { marginTop: 15, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#EF4444', elevation: 0 }]}>
                                        <Text style={[styles.launchBtnLabel, { color: '#EF4444' }]}>{isProcessing ? 'WAIT...' : 'EXIT ARENA'}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    )}

                    {/* LIVE 60 SECONDS */}
                    {gameStatus === 'PLAYING' && (
                        <View style={styles.activeEngineMainContainer}>
                            <View style={styles.timelineTrackContainer}>
                                <Animated.View style={[styles.timelineFillBar, { width: progressBarWidth }]} />
                            </View>

                            {!canPlay ? (
                                <View style={styles.expertWaitingView}>
                                    <View style={styles.waitOrbitWrap}>
                                        <OrbitRing size={150} color="#00F2FE" dur={6000} dotSize={7} />
                                        <OrbitRing size={116} color="#A855F7" dur={4500} reverse dotSize={5} />
                                        <FloatBox amp={6} dur={1800}>
                                            <MaterialCommunityIcons name="timer-sand" size={60} color="#00F2FE" />
                                        </FloatBox>
                                    </View>
                                    <Text style={styles.expertPlayingTitle}>CHALLENGE IN PROGRESS!</Text>
                                    <Text style={styles.expertPlayingTime}>{gameTimeLeft}</Text>
                                    <Text style={styles.expertPlayingSub}>{players.length} challengers are competing for the top spot 🏆</Text>
                                    {gameTimeLeft === 0 && (
                                        <Text style={[styles.expertPlayingSub, { color: '#F59E0B', marginTop: 10 }]}>Evaluating final scores...</Text>
                                    )}
                                </View>
                            ) : (
                                <View style={{ flex: 1 }}>
                                    <View style={styles.hudHeaderStatsBar}>
                                        <View style={styles.hudBadgeContainer}>
                                            <Text style={styles.hudMetaLabel}>SCORE</Text>
                                            <Animated.Text style={[styles.hudValueText, { transform: [{ scale: scoreAnim }] }]}>{score}</Animated.Text>
                                        </View>
                                        <View style={[styles.hudBadgeContainer, { backgroundColor: 'rgba(255,42,95,0.1)', borderColor: '#FF2A5F' }]}>
                                            <Ionicons name="time" size={16} color="#FF2A5F" />
                                            <Text style={[styles.hudValueText, { color: '#FFF', fontVariant: ['tabular-nums'] }]}>{gameTimeLeft}s</Text>
                                        </View>
                                        <View style={[styles.hudBadgeContainer, { borderColor: '#FFD700' }]}>
                                            <Text style={styles.hudMetaLabel}>COMBO</Text>
                                            <Text style={[styles.hudValueText, { color: '#FFD700' }]}>x{combo}</Text>
                                        </View>
                                    </View>

                                    <View style={[styles.ruleBannerContainer, { borderColor: (currentRule === 'COLOR' ? '#00F2FE' : '#FFD700') + '66' }]}>
                                        <Text style={[styles.ruleBannerText, { color: currentRule === 'COLOR' ? '#00F2FE' : '#FFD700' }]}>
                                            {currentRule === 'COLOR' ? '👉 MATCH THE COLOR 👈' : '👉 READ THE TEXT 👈'}
                                        </Text>
                                    </View>

                                    {/* 3D word stage with colour-synced frame */}
                                    <LinearGradient colors={[displayColor + '88', 'rgba(255,255,255,0.08)', displayColor + '88']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.matrixFrame}>
                                        <View style={styles.centralMatrixBox}>
                                            <View style={styles.matrixOrbitWrap} pointerEvents="none">
                                                <OrbitRing size={190} color={displayColor} dur={9000} dotSize={5} style={{ opacity: 0.5 }} />
                                                <OrbitRing size={150} color="#FFFFFF" dur={6500} reverse dotSize={4} style={{ opacity: 0.3 }} />
                                            </View>
                                            <Animated.Text style={[styles.matrixWordRenderer, {
                                                color: displayColor,
                                                fontSize: wordFontSize,
                                                transform: [
                                                    { rotate: wordTilt },
                                                    { translateX: wordTranslate.x },
                                                    { translateY: wordTranslate.y }
                                                ]
                                            }]}>
                                                {targetWord}
                                            </Animated.Text>
                                        </View>
                                    </LinearGradient>

                                    <View style={styles.quadrantActionGrid}>
                                        {buttonDecoys.map((btnColor) => (
                                            <TouchableOpacity
                                                key={`${btnColor.name}-${btnColor.colorCode}`}
                                                activeOpacity={0.7}
                                                onPress={() => handleColorTap(btnColor.name, btnColor.colorCode)}
                                                style={[styles.quadrantButton, { borderColor: btnColor.colorCode, backgroundColor: 'rgba(4,7,18,0.85)', shadowColor: btnColor.colorCode }]}
                                            >
                                                <LinearGradient colors={[`${btnColor.colorCode}33`, 'transparent']} style={StyleSheet.absoluteFill} />
                                                <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} style={styles.btnGloss} pointerEvents="none" />
                                                <Text style={[styles.quadrantButtonLabel, { color: lighten(btnColor.colorCode, 0.25) }]}>{btnColor.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {canPlay && hasSubmittedScore && (
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 10, borderRadius: 20 }]}>
                                    <Text style={{ fontSize: 40, marginBottom: 15 }}>⏳</Text>
                                    <Text style={{ color: '#00F2FE', fontSize: 16, fontWeight: '800' }}>Evaluating Scores...</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* DETAILED LEADERBOARD & RESULTS SCREEN */}
                    {gameStatus === 'FINISHED' && matchResults && (
                        <View style={styles.terminalStateWrapper}>

                            {/* MASS CELEBRATION FOR WINNERS ONLY */}
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

                            <ScrollView
                                style={{ flex: 1, width: '100%' }}
                                contentContainerStyle={styles.resultScrollContent}
                                showsVerticalScrollIndicator={false}
                                nestedScrollEnabled
                            >
                                {/* WINNER HERO - big profile photo with orbit rings, crown & sparkles */}
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
                                        {heroWinners.map((w: any, i: number) => (
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
                                                    <Avatar uri={getPhoto(w)} name={w.name} size={heroAvatarSize} color={COLOR_POOL[(i + 3) % COLOR_POOL.length].colorCode} />
                                                </View>
                                            </LinearGradient>
                                        ))}
                                    </View>

                                    <FloatBox amp={5} dur={1500} style={styles.heroCrown}>
                                        <Img3D uri={IMG.crown} size={52} fallback="ribbon" color="#FFD700" />
                                    </FloatBox>
                                </View>

                                <LinearGradient colors={['#FFD700', '#F97316', '#FF2A5F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.championChip}>
                                    <Text style={styles.championChipText}>{matchResults.isTie ? '🤝 CO-CHAMPIONS' : iAmWinner ? '🏆 YOU ARE THE CHAMPION!' : '👑 ARENA CHAMPION'}</Text>
                                </LinearGradient>

                                <Text style={styles.terminalTitle}>{getWinnerText()}</Text>

                                {winnerList.length > 0 && (
                                    <View style={styles.winnerScorePill}>
                                        <Ionicons name="flash" size={16} color="#FFD700" />
                                        <Text style={styles.winnerScoreText}>{winnerList[0]?.score || 0} PTS</Text>
                                    </View>
                                )}

                                {/* PODIUM (top 3) */}
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
                                                        <Avatar uri={getPhoto(pp)} name={pp.name} size={avSize} color={meta.color} />
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
                                        <Text style={styles.leaderboardTitle}>🏆 ARENA LEADERBOARD</Text>
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
                                                        <Avatar uri={getPhoto(p)} name={p.name} size={32} color={rc === '#64748B' ? '#00F2FE' : rc} />
                                                    </View>
                                                    <Text style={styles.lbName} numberOfLines={1}>{p.name} {isWinner ? '👑' : ''}{isMe ? ' (You)' : ''}</Text>
                                                    <Text style={styles.lbScore}>{p.score} pts</Text>
                                                </View>
                                            )
                                        })}
                                    </View>
                                </LinearGradient>
                            </ScrollView>

                            <TouchableOpacity onPress={onClose} style={[styles.arcadeLaunchBtn, { marginTop: 10 }]}>
                                <LinearGradient colors={['#334155', '#0F172A']} style={StyleSheet.absoluteFill} />
                                <Gloss />
                                <Text style={[styles.launchBtnLabel, { color: '#FFF' }]}>EXIT ARENA</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* GAME RULES POPUP (opens from the GAME RULES chip) */}
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
                                <LinearGradient colors={['#00F2FE', '#A855F7', '#FFD700']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rulesFrame}>
                                    <View style={styles.rulesPanel}>
                                        <View style={styles.rulesHeaderRow}>
                                            <FloatBox amp={4} dur={1600}>
                                                <Img3D uri={IMG.trophy} size={44} fallback="trophy" color="#FFD700" />
                                            </FloatBox>
                                            <View style={{ flex: 1, marginLeft: 12 }}>
                                                <Text style={styles.rulesTitle}>GAME RULES</Text>
                                                <Text style={styles.rulesSub}>REFLEX BLITZ Arena</Text>
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
                                            <LinearGradient colors={['#00F2FE', '#A855F7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                                            <Gloss />
                                            <Text style={styles.launchBtnLabel}>GOT IT</Text>
                                        </TouchableOpacity>
                                    </View>
                                </LinearGradient>
                            </Animated.View>
                        </Animated.View>
                    )}

                    {/* Bottom Drag Handle Pinned to absolute bottom */}
                    <View {...panResponder.panHandlers} style={[styles.dragHandleContainer, { position: 'absolute', bottom: 15 + insets.bottom, alignSelf: 'center', width: '100%', height: 30 }]}>
                        <View style={styles.dragPill} />
                    </View>

                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(1, 3, 9, 0.9)' },
    arcadeContentCard: { flex: 1, width: '100%', borderTopLeftRadius: 0, borderTopRightRadius: 0, overflow: 'hidden', padding: 25, paddingTop: 10, paddingBottom: 50 },
    shimmerOrb: { position: 'absolute', width: 320, height: 320, borderRadius: 160, opacity: 0.08 },

    dragHandleContainer: { width: '100%', height: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
    dragPill: { width: 50, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },

    sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    titleIconBadge: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    titleOrbitWrap: { width: 52, height: 52, justifyContent: 'center', alignItems: 'center' },
    titleBrainCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(0,242,254,0.12)', borderWidth: 1, borderColor: 'rgba(0,242,254,0.5)', justifyContent: 'center', alignItems: 'center' },
    mainTitleText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 4, textShadowOffset: { width: 0, height: 1 } },
    statusPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1.2, backgroundColor: 'rgba(4,7,18,0.8)' },
    statusPillText: { fontSize: 8, fontWeight: '900', letterSpacing: 2 },
    statusPillCount: { color: '#FFF', fontSize: 8, fontWeight: '900', marginLeft: 8 },
    closeRoundBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(2,4,14,0.8)', justifyContent: 'center', alignItems: 'center', borderWidth: 1.2, borderColor: 'rgba(0,242,254,0.5)' },

    warningBanner: { flexDirection: 'row', backgroundColor: 'rgba(245, 158, 11, 0.12)', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.4)', marginBottom: 12, alignItems: 'center' },
    warningText: { color: '#FBBF24', fontSize: 10, fontWeight: '700', marginLeft: 8, flex: 1, lineHeight: 14 },

    // LOBBY STAGE
    stageWrap: { width: '100%', height: 230, alignItems: 'center', justifyContent: 'center' },
    stageGlowBig: { position: 'absolute', width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(0,242,254,0.06)' },
    heroSweep: { position: 'absolute', top: -60, bottom: -60, width: 90 },
    stageTrophy: { position: 'absolute', left: 4, top: 20 },
    stageDiamond: { position: 'absolute', right: 6, top: 50 },
    stageStar: { position: 'absolute', left: 18, bottom: 18 },
    coreWrap: { width: 110, height: 110, justifyContent: 'center', alignItems: 'center' },
    coreMask: { width: 100, height: 100, borderRadius: 50, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 16, shadowColor: '#00F2FE', shadowOpacity: 0.8, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } },
    coreSpin: { position: 'absolute', width: 200, height: 200, left: -50, top: -50 },
    coreInner: { width: 88, height: 88, borderRadius: 44, backgroundColor: '#030612', justifyContent: 'center', alignItems: 'center' },
    coreNumber: { color: '#FFF', fontSize: 32, fontWeight: '900', fontVariant: ['tabular-nums'] },
    coreSuffix: { color: '#00F2FE', fontSize: 9, fontWeight: '900', letterSpacing: 2, marginTop: -2 },

    lobbyStateWrapper: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 60 },
    lobbyHelperText: { color: '#CBD5E1', fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 10 },
    entryFeeFrame: { borderRadius: 17, padding: 1.4, marginBottom: 20 },
    entryFeeContainer: { backgroundColor: 'rgba(2, 5, 16, 0.92)', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 15.6, minWidth: 240, alignItems: 'center' },
    feeLabel: { color: '#00F2FE', fontSize: 10, fontWeight: '900', textAlign: 'center', marginBottom: 2 },
    feeValueText: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', letterSpacing: 1, flexShrink: 0, textAlign: 'center' },

    playerPoolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 25, width: '100%' },
    profileAuraWrapper: { alignItems: 'center', width: '17%', marginBottom: 10 },
    avatarNode: { width: 54, height: 54, justifyContent: 'center', alignItems: 'center' },
    avatarAuraGlow: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, backgroundColor: '#050A18', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowRadius: 10, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 0 }, overflow: 'hidden' },
    initialsAvatarText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    poolPlayerName: { color: '#E2E8F0', fontSize: 9, fontWeight: '700', marginTop: 3, textAlign: 'center' },

    arcadeLaunchBtn: { width: '85%', height: 56, borderRadius: 18, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#00F2FE', shadowOpacity: 0.4, shadowRadius: 10 },
    btnGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 22, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
    launchBtnLabel: { color: '#FFFFFF', fontWeight: '900', fontSize: 15, letterSpacing: 1.5, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },

    feeValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    feeEmoji: { fontSize: 18, marginRight: 8, color: '#FFFFFF' },

    // RULES box / chip / popup
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
    rulesSub: { color: '#00F2FE', fontSize: 9, fontWeight: '900', letterSpacing: 2.5, marginTop: 2 },
    ruleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 1, padding: 10, marginBottom: 8 },
    ruleIconBox: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
    ruleTitle: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 2 },
    ruleText: { color: '#E2E8F0', fontSize: 12, fontWeight: '600', lineHeight: 17 },
    waitServerSignalText: { color: '#94A3B8', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginTop: 15, textAlign: 'center' },

    activeEngineMainContainer: { flex: 1 },
    hudHeaderStatsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    hudBadgeContainer: { flex: 1, height: 50, backgroundColor: 'rgba(2,4,14,0.8)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(0,242,254,0.35)', justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
    hudMetaLabel: { color: '#CBD5E1', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    hudValueText: { color: '#00F2FE', fontSize: 18, fontWeight: '900' },
    timelineTrackContainer: { width: '100%', height: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden', marginBottom: 20 },
    timelineFillBar: { height: '100%', backgroundColor: '#FF2A5F', borderRadius: 3, shadowColor: '#FF2A5F', shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },

    ruleBannerContainer: { backgroundColor: 'rgba(2,4,14,0.85)', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 15, alignItems: 'center' },
    ruleBannerText: { fontSize: 16, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },

    matrixFrame: { flex: 1, borderRadius: 27, padding: 1.5, marginBottom: 15 },
    centralMatrixBox: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 80, backgroundColor: 'rgba(2,4,14,0.88)', borderRadius: 25.5, padding: 10, overflow: 'hidden' },
    matrixOrbitWrap: { position: 'absolute', width: 190, height: 190, justifyContent: 'center', alignItems: 'center' },
    matrixWordRenderer: { fontWeight: '900', letterSpacing: 4, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10 },

    quadrantActionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
    quadrantButton: { width: (width - 100) / 3, height: 60, borderRadius: 16, borderWidth: 2, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', elevation: 5 },
    quadrantButtonLabel: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },

    expertWaitingView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(2,4,14,0.8)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,242,254,0.35)' },
    waitOrbitWrap: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center' },
    expertPlayingTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 20, letterSpacing: 2 },
    expertPlayingTime: { color: '#00F2FE', fontSize: 60, fontWeight: '900', marginVertical: 10 },
    expertPlayingSub: { color: '#CBD5E1', fontSize: 14, fontWeight: '600', textAlign: 'center', paddingHorizontal: 20 },

    terminalStateWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 15 },
    trophyStage: { width: 160, height: 160, justifyContent: 'center', alignItems: 'center', marginBottom: 6 },
    trophyCrown: { position: 'absolute', top: 4, alignSelf: 'center' },
    summaryTrophyIcon: { marginBottom: 5, shadowColor: '#FFD700', shadowOpacity: 0.5, shadowRadius: 15 },
    terminalTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8, textAlign: 'center', textShadowColor: 'rgba(255,215,0,0.7)', textShadowRadius: 14, textShadowOffset: { width: 0, height: 0 } },

    leaderboardFrame: { width: '100%', borderRadius: 17, padding: 1.4, marginBottom: 10 },
    leaderboardContainer: { width: '100%', backgroundColor: 'rgba(2,4,14,0.92)', borderRadius: 15.6, padding: 10, borderWidth: 0, borderColor: 'rgba(255,255,255,0.1)' },
    leaderboardTitle: { color: '#CBD5E1', fontSize: 12, fontWeight: '800', marginBottom: 10, textAlign: 'center', letterSpacing: 1 },
    leaderboardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', padding: 10, borderRadius: 8, marginBottom: 5 },
    leaderboardRowWinner: { backgroundColor: 'rgba(16, 185, 129, 0.18)', borderColor: 'rgba(16, 185, 129, 0.45)', borderWidth: 1 },
    lbRank: { color: '#CBD5E1', fontSize: 14, fontWeight: '900', width: 30 },
    lbName: { color: '#FFF', fontSize: 14, fontWeight: '800', flex: 1, marginLeft: 10 },
    lbScore: { color: '#00F2FE', fontSize: 14, fontWeight: '900' },

    // RESULT BOARD (winner photo hero / podium / photo leaderboard)
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
    podiumAvatarRing: { borderWidth: 2.5, justifyContent: 'center', alignItems: 'center', backgroundColor: '#050A18', elevation: 10, shadowOpacity: 0.8, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, overflow: 'hidden' },
    podiumName: { color: '#FFF', fontSize: 11, fontWeight: '800', marginTop: 5, marginBottom: 5, maxWidth: '100%' },
    podiumBar: { width: '100%', borderTopLeftRadius: 14, borderTopRightRadius: 14, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    podiumGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 24 },
    podiumScore: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 3, textShadowOffset: { width: 0, height: 1 } },
    podiumPts: { color: 'rgba(255,255,255,0.85)', fontSize: 8, fontWeight: '900', letterSpacing: 2 },

    lbAvatarRing: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, justifyContent: 'center', alignItems: 'center', marginLeft: 8, overflow: 'hidden', backgroundColor: '#050A18' },
    leaderboardRowMe: { backgroundColor: 'rgba(0,242,254,0.14)' },

    resultDetailsCard: { width: '100%', backgroundColor: 'rgba(30,41,59,0.5)', borderRadius: 15, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 10 },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
    resultLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
    resultValue: { color: '#FFF', fontSize: 14, fontWeight: '900' },

    feeChip: { backgroundColor: 'rgba(30,41,59,0.5)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    feeChipActive: { backgroundColor: 'rgb(254, 135, 0)', borderColor: '#fe00b2' },
    feeChipText: { color: '#feffff', fontSize: 12, fontWeight: '800' },
    feeChipTextActive: { color: '#000000', fontSize: 14, fontWeight: '900' }
});
