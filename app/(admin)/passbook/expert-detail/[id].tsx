import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, collectionGroup, doc, getDoc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Image,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../../../firebaseConfig';

const { width, height } = Dimensions.get('window');

// 🔥 EXACT EXPERT THEME & LEVEL CONFIG
const getLevelConfig = (beans: number) => {
    if (beans >= 100000000) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'], glow: '#F59E0B' };
    if (beans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'], glow: '#EC4899' };
    if (beans >= 30000000) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'], glow: '#8B5CF6' };
    if (beans >= 10000000) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'], glow: '#3B82F6' };
    if (beans >= 5000000)  return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'], glow: '#06B6D4' };
    if (beans >= 3000000)  return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'], glow: '#10B981' };
    if (beans >= 1000000)  return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'], glow: '#EAB308' };
    if (beans >= 300000 )   return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'], glow: '#94A3B8' };
    if (beans >= 100000)   return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'], glow: 'transparent' };
    if (beans >= 30000)    return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'], glow: 'transparent' };
    return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'], glow: 'transparent' };
};

const calculateLevel = (d: number) => {
    if (d <= 200000) return "Silver";
    if (d <= 1000000) return "Gold";
    if (d <= 5000000) return "Diamond";
    if (d <= 10000000) return "Legend";
    if (d <= 50000000) return "Elite";
    if (d <= 100000000) return "Master";
    if (d <= 500000000) return "Grandmaster";
    return "Godlike";
};

const milestones = [
    { target: 100000, bonus: 5000, label: "STARTER" },
    { target: 300000, bonus: 10000, label: "PRO" },
    { target: 500000, bonus: 15000, label: "ELITE" }
];

const TABS = [
    { id: 'video_call', label: 'Call Reward', icon: 'videocam', iconType: 'Ionicons' },
    { id: 'live_gift', label: 'Broadcast Rewards', icon: 'broadcast', iconType: 'MaterialCommunityIcons' },
    { id: 'party_gift', label: 'Forum Rewards', icon: 'party-popper', iconType: 'MaterialCommunityIcons' },
    { id: 'call_gift', label: 'Private Rewards', icon: 'gift', iconType: 'MaterialCommunityIcons' }
];

/* ───────────────────────── 3D / ANIMATION HELPERS ───────────────────────── */

// Soft glowing orb (concentric circles fake a blur) that slowly floats around
const GlowOrb = ({ size, color, drift = 24, duration = 7000 }: { size: number; color: string; drift?: number; duration?: number }) => {
    const t = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(t, { toValue: 1, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(t, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);

    const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [-drift, drift] });
    const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [drift, -drift] });
    const scale = t.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.12] });

    return (
        <Animated.View
            pointerEvents="none"
            style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ translateX }, { translateY }, { scale }] }}
        >
            {[1, 0.78, 0.56, 0.36].map((k, i) => (
                <View
                    key={i}
                    style={{
                        position: 'absolute',
                        width: size * k,
                        height: size * k,
                        borderRadius: (size * k) / 2,
                        backgroundColor: color,
                        opacity: 0.06 + i * 0.025,
                    }}
                />
            ))}
        </Animated.View>
    );
};

// Aurora background that takes the host's LEVEL THEME colours, with scroll parallax
const AuroraBackground = ({ scrollY, primary, secondary, accent }: { scrollY: Animated.Value; primary: string; secondary: string; accent: string }) => {
    const shiftA = scrollY.interpolate({ inputRange: [0, 800], outputRange: [0, -110], extrapolate: 'clamp' });
    const shiftB = scrollY.interpolate({ inputRange: [0, 800], outputRange: [0, -190], extrapolate: 'clamp' });

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <LinearGradient colors={['#020617', '#050816', '#02030C']} style={StyleSheet.absoluteFill} />
            <Animated.View style={{ position: 'absolute', top: -100, right: -160, transform: [{ translateY: shiftA }] }}>
                <GlowOrb size={430} color={primary} drift={26} duration={7600} />
            </Animated.View>
            <Animated.View style={{ position: 'absolute', top: height * 0.42, left: -200, transform: [{ translateY: shiftB }] }}>
                <GlowOrb size={400} color={secondary} drift={30} duration={9000} />
            </Animated.View>
            <Animated.View style={{ position: 'absolute', bottom: -170, right: -50, transform: [{ translateY: shiftA }] }}>
                <GlowOrb size={330} color={accent} drift={20} duration={8300} />
            </Animated.View>
        </View>
    );
};

// Button with a springy press (scale) animation
const PressableScale = ({ children, onPress, style, containerStyle, disabled }: any) => {
    const s = useRef(new Animated.Value(1)).current;
    const to = (v: number) => Animated.spring(s, { toValue: v, useNativeDriver: true, speed: 30, bounciness: 6 }).start();

    return (
        <Animated.View style={[{ transform: [{ scale: s }] }, containerStyle]}>
            <TouchableOpacity
                activeOpacity={0.85}
                disabled={disabled}
                onPress={onPress}
                onPressIn={() => to(0.94)}
                onPressOut={() => to(1)}
                style={style}
            >
                {children}
            </TouchableOpacity>
        </Animated.View>
    );
};

// Generic 3D glass card: entrance flip, press tilt, gradient border, depth layers, optional float
const Card3D = ({
    children,
    colors,
    index = 0,
    floatAnim,
    radius = 28,
    bg = 'rgba(7,11,26,0.94)',
    style,
    depth = true,
}: {
    children: any;
    colors: [string, string];
    index?: number;
    floatAnim?: Animated.Value;
    radius?: number;
    bg?: string;
    style?: any;
    depth?: boolean;
}) => {
    const enter = useRef(new Animated.Value(0)).current;
    const press = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.spring(enter, {
            toValue: 1,
            delay: Math.min(index, 6) * 100,
            friction: 7,
            tension: 45,
            useNativeDriver: true,
        }).start();
    }, []);

    const rotateXEnter = enter.interpolate({ inputRange: [0, 1], outputRange: ['32deg', '0deg'] });
    const enterY = enter.interpolate({ inputRange: [0, 1], outputRange: [60, 0] });
    const scaleEnter = enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });
    const opacity = enter.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 1], extrapolate: 'clamp' });
    const translateY = floatAnim ? Animated.add(enterY, floatAnim) : enterY;

    const tiltX = press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '5deg'] });
    const tiltScale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.975] });
    const pressTo = (v: number) => Animated.spring(press, { toValue: v, useNativeDriver: true, speed: 22, bounciness: 8 }).start();

    return (
        <Animated.View
            style={[
                { marginBottom: 26, opacity, transform: [{ perspective: 900 }, { translateY }, { rotateX: rotateXEnter }, { scale: scaleEnter }] },
                style,
            ]}
        >
            {depth && (
                <>
                    <View style={[styles.depthLayer, { bottom: -8, left: 24, right: 24, borderRadius: radius, backgroundColor: colors[0], opacity: 0.16 }]} />
                    <View style={[styles.depthLayer, { bottom: -4, left: 12, right: 12, borderRadius: radius, backgroundColor: colors[0], opacity: 0.28 }]} />
                </>
            )}
            <Pressable onPressIn={() => pressTo(1)} onPressOut={() => pressTo(0)}>
                <Animated.View
                    style={{
                        shadowColor: colors[0],
                        shadowOpacity: 0.35,
                        shadowRadius: 20,
                        shadowOffset: { width: 0, height: 12 },
                        elevation: 12,
                        transform: [{ perspective: 900 }, { rotateX: tiltX }, { scale: tiltScale }],
                    }}
                >
                    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius, padding: 1.5 }}>
                        <View style={{ borderRadius: radius - 1.5, backgroundColor: bg, overflow: 'hidden' }}>
                            <LinearGradient
                                colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0)']}
                                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 70 }}
                                pointerEvents="none"
                            />
                            {children}
                        </View>
                    </LinearGradient>
                </Animated.View>
            </Pressable>
        </Animated.View>
    );
};

// Animated progress bar (fills smoothly whenever progress changes)
const AnimatedBar = ({ progress, color }: { progress: number; color: string }) => {
    const w = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(w, { toValue: progress, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    }, [progress]);

    return (
        <View style={styles.quantumTrack}>
            <Animated.View
                style={[
                    styles.quantumFill,
                    {
                        width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
                        backgroundColor: color,
                        shadowColor: color,
                    },
                ]}
            />
        </View>
    );
};

// Pulsing dot
const PulseDot = ({ color = '#10B981' }: { color?: string }) => {
    const p = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const loop = Animated.loop(Animated.timing(p, { toValue: 1, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: true }));
        loop.start();
        return () => loop.stop();
    }, []);

    return (
        <View style={{ width: 14, height: 14, alignItems: 'center', justifyContent: 'center', marginRight: 6 }}>
            <Animated.View
                style={{
                    position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: color,
                    opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] }),
                    transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
                }}
            />
            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
        </View>
    );
};

export default function ExpertPassbookDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    
    const [userData, setUserData] = useState<any>(null);
    const [historyLogs, setHistoryLogs] = useState<any[]>([]); 
    const [allTransactions, setAllTransactions] = useState<any[]>([]); 
    const [totalGiftsBeans, setTotalGiftsBeans] = useState<number>(0);
    const [totalEarningsCalculated, setTotalEarningsCalculated] = useState<number>(0);
    const [totalWithdrawnCalculated, setTotalWithdrawnCalculated] = useState<number>(0);
    const [flags, setFlags] = useState<any[]>([]); 
    
    const [breakdown, setBreakdown] = useState({
        calls: 0, liveGifts: 0, partyGifts: 0, callGifts: 0, totalDeepGifts: 0
    });

    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'STATS' | 'HISTORY' | 'FLAGS'>('STATS');
    const [activeHistoryTab, setActiveHistoryTab] = useState<'video_call' | 'live_gift' | 'party_gift' | 'call_gift'>('video_call');
    const [activeMissionTab, setActiveMissionTab] = useState(0); 

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current; 
    const floatAnim = useRef(new Animated.Value(0)).current; 
    const swayAnim = useRef(new Animated.Value(0)).current; // 3D sway for passbook card + header badge
    const scrollY = useRef(new Animated.Value(0)).current; // parallax for aurora

    useEffect(() => {
        Animated.loop(
          Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
        ).start();

        Animated.loop(
          Animated.sequence([
            Animated.timing(floatAnim, { toValue: -8, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(floatAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
          ])
        ).start();

        Animated.loop(
          Animated.sequence([
            Animated.timing(swayAnim, { toValue: 1, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(swayAnim, { toValue: 0, duration: 3200, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
          ])
        ).start();
    }, []);

    useEffect(() => {
        if (!id) return;

        let currentUserData: any = null;
        let rawWithdrawals: any[] = [];
        let rawGifts: any[] = [];
        let rawCallEarnings: any[] = [];
        let rawDeepLogs: any[] = []; 

        const processAllExpertLogs = () => {
            if (!currentUserData) return;

            const myReceivedGifts = rawGifts.filter(g => g.receiverId === id || g.hostId === id);

            const allLogs = [
                ...rawWithdrawals.map(w => ({ ...w, _source: 'ACTIVITY_REWARD' })),
                ...myReceivedGifts.map(g => ({ ...g, _source: 'gift' })),
                ...rawCallEarnings.map(c => ({ ...c, _source: 'call_earning' })),
                ...rawDeepLogs 
            ];

            const uniqueLogsMap = new Map();
            allLogs.forEach(log => {
                const key = log.id || `${log.type}_${log.timestamp?.seconds}`;
                if (!uniqueLogsMap.has(key)) uniqueLogsMap.set(key, log);
            });
            const mergedLogs = Array.from(uniqueLogsMap.values());

            mergedLogs.sort((a, b) => {
                const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.timestamp?.seconds ? a.timestamp.seconds * 1000 : 0));
                const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.timestamp?.seconds ? b.timestamp.seconds * 1000 : 0));
                return timeB - timeA;
            });

            setHistoryLogs(mergedLogs);

            const giftBeans = myReceivedGifts.reduce((sum, g) => sum + (Number(g.beans) || Number(g.price) / 2 || Number(g.amount) / 2 || 0), 0);
            setTotalGiftsBeans(giftBeans);

            const withdrawn = rawWithdrawals.reduce((sum, w) => sum + (Number(w.amountRupee) || Number(w.amount) || 0), 0);
            setTotalWithdrawnCalculated(withdrawn);

            const lifeEarnings = mergedLogs.reduce((sum, log) => {
                if (log._source === 'gift' || log._source === 'call_earning' || log._source === 'breakdown' || log._source === 'game') {
                    return sum + (Number(log.beans) || Number(log.expertEarning) || Number(log.expertEarnings) || (Number(log.price) || Number(log.amount)) / 2 || 0);
                }
                return sum;
            }, 0);
            setTotalEarningsCalculated(lifeEarnings);
        };

        const calculateTotalHeaderStats = () => {
            const myReceivedGifts = rawGifts.filter(g => g.receiverId === id || g.hostId === id);
            const giftBeans = myReceivedGifts.reduce((sum, g) => sum + (Number(g.beans) || Number(g.price) / 2 || Number(g.amount) / 2 || 0), 0);
            setTotalGiftsBeans(giftBeans);

            const withdrawn = rawWithdrawals.reduce((sum, w) => sum + (Number(w.amountRupee) || Number(w.amount) || 0), 0);
            setTotalWithdrawnCalculated(withdrawn);
        };

        const fetchAllArchives = async () => {
            try {
                let rawData: any[] = [];
                const expertId = id as string;

                const callsSnap = await getDocs(query(collection(db, "calls"), where("expertId", "==", expertId)));
                for (const docSnap of callsSnap.docs) {
                    const d = docSnap.data();
                    const expertEarnings = Number(d.expertEarnings) || 0;

                    if (expertEarnings > 0) {
                        let callerName = d.callerName || 'Call User';
                        let callerPic = d.callerImage || null;
                        let callerLevel = 'Silver';

                        if (d.callerId) {
                            const uSnap = await getDoc(doc(db, "users", d.callerId));
                            if (uSnap.exists()) {
                                const uData = uSnap.data();
                                callerName = uData.name || uData.displayName || callerName;
                                callerPic = uData.profilePic || uData.photoURL || callerPic;
                                callerLevel = calculateLevel(uData.balance || 0);
                            }
                        }

                        rawData.push({
                            id: docSnap.id, type: 'video_call', callerId: d.callerId, callerName: callerName, syncPic: callerPic, syncLevel: callerLevel,
                            finalDuration: d.finalDuration || d.duration || 0, expertEarnings: expertEarnings, beans: expertEarnings, timestamp: d.endedAt || d.createdAt || { seconds: 0 }
                        });
                    }
                }

                const transSnap = await getDocs(query(collection(db, "transactions"), where("expertId", "==", expertId)));
                for (const docSnap of transSnap.docs) {
                    const d = docSnap.data();
                    if (d.type === 'video_call') continue; 
                    
                    const bns = Number(d.expertBeans) || Number(d.expertBean) || Number(d.beans) || Math.floor((Number(d.diamonds) || Number(d.amount) || 0) / 2);

                    if (bns > 0) {
                        let tType = 'call_gift';
                        if (d.source === 'Session' || d.source === 'forum') tType = 'party_gift';
                        if (d.source === 'live') tType = 'live_gift';

                        let senderName = d.senderName || d.userName || 'Verified Supporter';
                        let senderPic = d.userImage || null;
                        let senderLevel = 'Silver';

                        if (d.userId && d.userId !== 'unknown') {
                            const uSnap = await getDoc(doc(db, "users", d.userId));
                            if (uSnap.exists()) {
                                const uData = uSnap.data();
                                senderName = uData.name || uData.displayName || senderName;
                                senderPic = uData.profilePic || uData.photoURL || senderPic;
                                senderLevel = calculateLevel(uData.balance || 0);
                            }
                        }

                        rawData.push({
                            id: docSnap.id, type: tType, senderId: d.userId, senderName: senderName, syncPic: senderPic, syncLevel: senderLevel,
                            giftName: d.giftName || d.giftType || 'Virtual Reward', amount: d.diamonds || d.amount || 0, beans: bns, timestamp: d.timestamp || { seconds: 0 }
                        });
                    }
                }

                const livesSnap = await getDocs(query(collection(db, "lives"), where("hostId", "==", expertId)));
                for (const liveDoc of livesSnap.docs) {
                    const liveData = liveDoc.data();
                    const isParty = liveData.isPartyRoom === true || liveData.status === "party_hidden";

                    if (!isParty) {
                        const giftsSnap = await getDocs(collection(db, "lives", liveDoc.id, "gifts"));
                        for (const gDoc of giftsSnap.docs) {
                            const g = gDoc.data();
                            const bns = Number(g.beans) || Math.floor((Number(g.amount) || Number(g.price) || 0) / 2);

                            if (bns > 0) {
                                let gSenderName = g.senderName || 'VIP Supporter';
                                let gPic = g.senderImage || g.icon || null;
                                let gLevel = 'Silver';

                                if (g.senderId) {
                                    const uSnap = await getDoc(doc(db, "users", g.senderId));
                                    if (uSnap.exists()) {
                                        const uData = uSnap.data();
                                        gSenderName = uData.name || uData.displayName || gSenderName;
                                        gPic = uData.profilePic || uData.photoURL || gPic;
                                        gLevel = calculateLevel(uData.balance || 0);
                                    }
                                }

                                rawData.push({
                                    id: gDoc.id, type: 'live_gift', senderId: g.senderId, senderName: gSenderName, giftName: g.giftName || 'Virtual Reward',
                                    amount: g.amount || g.price || 0, beans: bns, timestamp: g.timestamp || liveData.startedAt || { seconds: 1 }, syncPic: gPic, syncLevel: gLevel
                                });
                            }
                        }
                    }
                }

                const partySnap = await getDocs(query(collection(db, "forum_rooms"), where("hostId", "==", expertId)));
                for (const partyDoc of partySnap.docs) {
                    const pData = partyDoc.data();
                    const giftsSnap = await getDocs(collection(db, "forum_rooms", partyDoc.id, "gifts"));
                    for (const gDoc of giftsSnap.docs) {
                        const g = gDoc.data();
                        const bns = Number(g.beans) || Math.floor((Number(g.price) || Number(g.amount) || 0) / 2);
                        
                        if (bns > 0) {
                            let gSenderName = g.senderName || 'Room Member';
                            let gPic = g.icon || null;
                            let gLevel = 'Silver';

                            if (g.senderId) {
                                const uSnap = await getDoc(doc(db, "users", g.senderId));
                                if (uSnap.exists()) {
                                    const uData = uSnap.data();
                                    gSenderName = uData.name || uData.displayName || gSenderName;
                                    gPic = uData.profilePic || uData.photoURL || gPic;
                                    gLevel = calculateLevel(uData.balance || 0);
                                }
                            }

                            rawData.push({
                                id: gDoc.id, type: 'party_gift', senderId: g.senderId, senderName: gSenderName, giftName: g.giftName || 'Virtual Reward',
                                amount: g.price || g.amount || 0, beans: bns, timestamp: g.timestamp || pData.createdAt || { seconds: 1 }, syncPic: gPic, syncLevel: gLevel
                            });
                        }
                    }
                }

                const uniqueData: any[] = [];
                const seen = new Set();
                for (const item of rawData) {
                    const uniqueKey = `${item.type}_${item.beans || item.expertEarnings}_${item.timestamp?.seconds || 0}`;
                    if (!seen.has(uniqueKey)) {
                        seen.add(uniqueKey);
                        uniqueData.push(item);
                    }
                }

                uniqueData.sort((a: any, b: any) => {
                    const timeA = a.timestamp?.seconds || 0;
                    const timeB = b.timestamp?.seconds || 0;
                    return timeB - timeA;
                });

                setAllTransactions(uniqueData);

                let calls = 0, liveGifts = 0, partyGifts = 0, callGifts = 0;
                uniqueData.forEach(t => {
                    if (t.type === 'video_call') calls += (t.beans || 0);
                    else if (t.type === 'live_gift') liveGifts += (t.beans || 0);
                    else if (t.type === 'party_gift') partyGifts += (t.beans || 0);
                    else if (t.type === 'call_gift') callGifts += (t.beans || 0);
                });

                setBreakdown({
                    calls, liveGifts, partyGifts, callGifts,
                    totalDeepGifts: liveGifts + partyGifts + callGifts
                });

                rawDeepLogs = uniqueData.map(t => {
                    let titleText = "System Action", source = "breakdown";
                    if (t.type === 'video_call') titleText = "Session Earning";
                    else if (t.type === 'live_gift') { titleText = "Live Interaction Reward"; source = "gift"; }
                    else if (t.type === 'party_gift') { titleText = "Group Interaction Reward"; source = "gift"; }
                    else if (t.type === 'call_gift') { titleText = "Direct Reward"; source = "gift"; }

                    return { ...t, id: t.id, _source: source, title: titleText, status: 'SUCCESS', timestamp: t.timestamp };
                });

                processAllExpertLogs();
            } catch (error) { console.error("Archive Sync Error:", error); }
        };

        const unsubUser = onSnapshot(doc(db, 'users', id as string), (docSnap) => {
            if (docSnap.exists()) {
                const d = docSnap.data() as any;
                
                const todaysEarnings = Number(d.todayBeans) || 0;
                if (todaysEarnings >= 300000) setActiveMissionTab(2);
                else if (todaysEarnings >= 100000) setActiveMissionTab(1);
                else setActiveMissionTab(0);

                currentUserData = { 
                    id: docSnap.id, 
                    ...d,
                    todayBeans: todaysEarnings,
                    todayMins: Math.round(Number(d.todayMinutes) || 0).toString(),
                    displayMins: Math.round(Number(d.totalMinutes) || 0).toString(),
                    todayCalls: Number(d.todayCalls) || 0,
                    longestCallDisplay: Math.floor((Number(d.longestCallDuration) || 0) / 60).toString(),
                    topFanName: d.topVipSupporter?.name && d.topVipSupporter.name !== 'None' ? `${d.topVipSupporter.name} (💎${d.topVipSupporter.amount})` : "No Key Users Yet",
                    lastCaller: d.lastCallFrom || "Waiting...",
                };
                
                setUserData(currentUserData);
                processAllExpertLogs();
                fetchAllArchives(); 

                Animated.parallel([
                    Animated.timing(fadeAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
                    Animated.spring(slideAnim, { toValue: 0, friction: 5, tension: 40, useNativeDriver: true })
                ]).start();
            }
            setLoading(false);
        });

        const qWithdrawals = query(collection(db, 'withdrawals'), where('userId', '==', id));
        const unsubWithdrawals = onSnapshot(qWithdrawals, (snap) => {
            rawWithdrawals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            calculateTotalHeaderStats();
        });

        const qGifts = query(collectionGroup(db, 'gifts'));
        const unsubGifts = onSnapshot(qGifts, (snap) => {
            rawGifts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            calculateTotalHeaderStats();
        });

        const qCalls = query(collection(db, 'transactions'), where('expertId', '==', id));
        const unsubCalls = onSnapshot(qCalls, (snap) => {
            rawCallEarnings = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            processAllExpertLogs();
        });

        const qFlags = query(
            collection(db, "admin_alerts"), 
            where("expertId", "==", id), 
            where("type", "==", "USER_BLOCKED_EXPERT")
        );
        const unsubFlags = onSnapshot(qFlags, async (snap) => {
            const list = await Promise.all(snap.docs.map(async (d) => {
                const data = d.data() as any;
                let fetchedPic = data.userImage || data.profilePic || '';
                
                if (!fetchedPic && data.userId) {
                    try {
                        const userDoc = await getDoc(doc(db, 'users', data.userId));
                        if (userDoc.exists()) {
                            const uData = userDoc.data() as any;
                            fetchedPic = uData.profilePic || uData.image || ''; 
                        }
                    } catch (e) {
                        console.log("Error fetching user picture:", e);
                    }
                }
                
                return { alertId: d.id, fetchedUserPic: fetchedPic, ...data };
            }));

            list.sort((a: any, b: any) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
            setFlags(list);
        });

        return () => { unsubUser(); unsubWithdrawals(); unsubGifts(); unsubCalls(); unsubFlags(); };
    }, [id]);

    if (loading) return (
        <View style={styles.loader}>
            <ActivityIndicator size="large" color="#E11D48" />
            <Text style={[styles.loaderText, { color: '#E11D48' }]}>Synchronizing Ledger...</Text>
        </View>
    );

    if (!userData) return <View style={styles.loader}><Text style={{color: '#FFF'}}>Profile not found.</Text></View>;

    const totalBeansEarned = userData?.totalBeansEarned || 0;
    const config = getLevelConfig(totalBeansEarned);
    const theme = {
        primary: config.colors[0],
        secondary: config.colors[2],
        accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
    };

    const swayY = swayAnim.interpolate({ inputRange: [0, 1], outputRange: ['-7deg', '7deg'] });
    const swayX = swayAnim.interpolate({ inputRange: [0, 1], outputRange: ['3deg', '-3deg'] });
    const sheenX = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [-width, width] });

    const themeColors: [string, string] = [theme.primary, theme.secondary];
    const themeColorsRev: [string, string] = [theme.secondary, theme.primary];

    const currentMilestone = milestones[activeMissionTab] || milestones[0];
    const progress = Math.min(userData?.todayBeans / currentMilestone.target, 1) || 0;
    const isCompleted = userData?.todayBeans >= currentMilestone.target;

    const renderCallItem = ({ item, index }: { item: any, index: number }) => {
        const duration = Number(item.finalDuration) || 0;
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        const dateObj = item.timestamp?.seconds ? new Date(item.timestamp.seconds * 1000) : new Date();
        const earnings = item.beans || item.expertEarnings || 0; 
        
        const titleText = item.callerName ? `Call with ${item.callerName}` : "Call Reward";
    
        return (
          <View style={{ paddingHorizontal: 20 }}>
          <Card3D index={index} floatAnim={floatAnim} colors={index % 2 === 0 ? themeColors : themeColorsRev} radius={30}>
            <LinearGradient colors={[theme.primary, 'transparent']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.statusGlowLine} />
            <View style={styles.cardMain}>
              <View style={styles.userSection}>
                <TouchableOpacity 
                    style={styles.avatarWrapper} 
                    onPress={() => item.callerId ? router.push({ pathname: '/user-detail', params: { id: item.callerId } } as any) : null}
                    disabled={!item.callerId}
                >
                    <LinearGradient colors={[theme.primary, theme.secondary]} style={styles.avatarRing}>
                        <Image source={{ uri: item.syncPic || `https://ui-avatars.com/api/?name=${item.callerName || 'U'}&background=3B82F6&color=fff` }} style={styles.eliteAvatar} />
                    </LinearGradient>
                    <LinearGradient colors={[theme.primary, theme.secondary]} style={styles.levelBadgeMini}>
                      <Text style={styles.levelBadgeText}>{(item.syncLevel || 'SILVER').toUpperCase()}</Text>
                    </LinearGradient>
                </TouchableOpacity>
                <View style={styles.userMeta}>
                  <Text style={styles.eliteUserName} numberOfLines={2} adjustsFontSizeToFit>{titleText}</Text>
                  <View style={styles.dateTimeRow}>
                    <Ionicons name="time" size={12} color={theme.primary} />
                    <Text style={styles.eliteDateText}>{dateObj.toLocaleDateString()} • {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.earningsBlock}>
                <Text style={styles.earnLabel}>Rewards</Text>
                <View style={styles.beansRow}>
                  <Text style={styles.eliteBeansValue}>+🎖️{earnings}</Text> 
                </View>
              </View>
            </View>
            <BlurView intensity={20} tint="dark" style={styles.cardFooter}>
                <View style={styles.footerStatRow}>
                    <Ionicons name="stopwatch" size={13} color="#10B981" />
                    <Text style={styles.footerStatText}>{mins}m {secs}s Uplink</Text>
                </View>
                <View style={[styles.verifiedBadge, { backgroundColor: theme.primary + '20' }]}>
                    <Ionicons name="shield-checkmark" size={11} color={theme.accent} />
                    <Text style={[styles.verifiedText, { color: theme.accent }]}>SECURE</Text>
                </View>
            </BlurView>
          </Card3D>
          </View>
        );
    };
    
    const renderGiftItem = ({ item, index }: { item: any, index: number }) => {
        const dateObj = item.timestamp?.seconds ? new Date(item.timestamp.seconds * 1000) : new Date();
        const beansEarned = item.beans || 0;
        
        let displayTitle = "";
        let displaySub = item.giftName || 'Virtual Reward';
        let iconType = 'gift';
        let iconColor = theme.primary;
    
        let baseTitle = "";
        if (item.type === 'live_gift') {
            baseTitle = "Broadcast Reward";
            iconType = 'broadcast';
            iconColor = '#10B981';
        } else if (item.type === 'party_gift') {
            baseTitle = "Forum Reward";
            iconType = 'party-popper';
            iconColor = '#EC4899';
        } else if (item.type === 'call_gift') {
            baseTitle = "Private Reward";
            iconType = 'gift';
            iconColor = theme.primary;
        }
        const validSender = item.senderName && item.senderName !== "Unknown" ? item.senderName : "User";
        displayTitle = `${baseTitle} (from ${validSender})`;
    
        return (
          <View style={{ paddingHorizontal: 20 }}>
          <Card3D index={index} floatAnim={floatAnim} colors={index % 2 === 0 ? themeColorsRev : themeColors} radius={30}>
            <LinearGradient colors={[theme.secondary, 'transparent']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.statusGlowLine} />
            <View style={styles.cardMain}>
              <View style={styles.userSection}>
                <TouchableOpacity 
                    style={styles.avatarWrapper} 
                    onPress={() => item.senderId ? router.push({ pathname: '/user-detail', params: { id: item.senderId } } as any) : null}
                    disabled={!item.senderId}
                >
                    <LinearGradient colors={[theme.primary, theme.secondary]} style={styles.avatarRing}>
                        <Image source={{ uri: item.syncPic || `https://ui-avatars.com/api/?name=${item.senderName || 'V'}&background=D946EF&color=fff` }} style={styles.eliteAvatar} />
                    </LinearGradient>
                    <LinearGradient colors={[theme.primary, theme.secondary]} style={styles.levelBadgeMini}>
                      <Text style={styles.levelBadgeText}>{(item.syncLevel || 'SILVER').toUpperCase()}</Text>
                    </LinearGradient>
                </TouchableOpacity>
                <View style={styles.userMeta}>
                  <Text style={styles.eliteUserName} numberOfLines={2} adjustsFontSizeToFit>{displayTitle}</Text>
                  <View style={styles.giftLabelRow}>
                      <MaterialCommunityIcons name={iconType as any} size={16} color={iconColor} />
                      <Text style={[styles.giftSubName, { color: iconColor }]} numberOfLines={2} adjustsFontSizeToFit>{displaySub}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.earningsBlock}>
                <Text style={styles.earnLabel}>REWARD</Text>
                <View style={styles.beansRow}>
                  <Text style={styles.eliteBeansValue}>+🎖️{beansEarned}</Text>
                </View>
              </View>
            </View>
            <View style={styles.cardFooterSimple}>
                <Text style={styles.footerTimeText}>{dateObj.toLocaleDateString()} • {dateObj.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                <View style={[styles.receivedTag, { backgroundColor: theme.primary + '20' }]}>
                    <MaterialCommunityIcons name="check-decagram" size={12} color={theme.accent} />
                    <Text style={[styles.receivedText, { color: theme.accent }]}>VERIFIED</Text>
                </View>
            </View>
          </Card3D>
          </View>
        );
    };

    const filteredTransactions = allTransactions.filter(t => t.type === activeHistoryTab);

    const renderListFooter = () => (
        <View style={styles.footerContainer}>
            <PressableScale containerStyle={{ width: '100%' }} onPress={() => setActiveTab('FLAGS')}>
                <LinearGradient
                    colors={flags.length > 0 ? ['#EF4444', '#B91C1C'] : ['rgba(16,185,129,0.12)', 'rgba(16,185,129,0.04)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.bottomFlagBtn, flags.length > 0 ? { borderColor: '#F87171' } : { borderColor: 'rgba(16,185,129,0.35)' }]}
                >
                    <MaterialCommunityIcons name={flags.length > 0 ? "alert-octagon" : "shield-check"} size={20} color={flags.length > 0 ? "#FFF" : "#10B981"} />
                    <Text style={[styles.bottomFlagText, {color: flags.length > 0 ? "#FFF" : "#10B981"}]}>
                        {flags.length > 0 ? `VIEW SECURITY FLAGS (${flags.length})` : 'CLEAN RECORD (0 FLAGS)'}
                    </Text>
                </LinearGradient>
            </PressableScale>

            <View style={styles.footer}>
              <Text style={styles.verText}>TALKPE OS • SECURE_LEDGER</Text>
              <View style={[styles.secureNode, { borderColor: 'rgba(255,255,255,0.08)' }]}>
                  <MaterialCommunityIcons name="shield-check" size={12} color={theme.primary} />
                  <Text style={[styles.secureText, { color: theme.primary }]}>Encrypted Data Node</Text>
              </View>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            <AuroraBackground scrollY={scrollY} primary={theme.primary} secondary={theme.secondary} accent={theme.accent} />

            <View style={styles.header}>
                <PressableScale onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </PressableScale>
                <View>
                    <Text style={styles.headerTitle}>Operational Ledger</Text>
                    <Text style={styles.headerSub}>Enterprise Level Audit Clearance</Text>
                </View>
                <Animated.View style={{ marginLeft: 'auto', transform: [{ perspective: 600 }, { rotateY: swayY }, { rotateX: swayX }] }}>
                    <LinearGradient colors={[theme.primary, theme.secondary]} style={[styles.headerBadgeRing, { shadowColor: theme.primary }]}>
                        <View style={styles.headerBadgeInner}>
                            <MaterialCommunityIcons name="shield-star" size={22} color={theme.accent} />
                        </View>
                    </LinearGradient>
                </Animated.View>
            </View>

            <Animated.FlatList 
                data={activeTab === 'HISTORY' ? filteredTransactions : []}
                keyExtractor={(item: any, index: number) => `${item.id}_${item.type}_${index}`}
                renderItem={(activeHistoryTab === 'video_call' ? renderCallItem : renderGiftItem) as any}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 50 }}
                scrollEventThrottle={16}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                ListEmptyComponent={
                    activeTab === 'HISTORY' ? (
                        <View style={styles.emptyCenter}>
                            <MaterialCommunityIcons name="text-box-search-outline" size={56} color="#334155" />
                            <Text style={{ color: '#475569', fontSize: 13, fontWeight: '700', marginTop: 12 }}>No records in this category yet.</Text>
                        </View>
                    ) : null
                }
                ListFooterComponent={renderListFooter} 
                ListHeaderComponent={
                    <View style={{ paddingHorizontal: 20 }}>
                        
                        {/* 3D HOLOGRAPHIC PASSBOOK CARD */}
                        <Animated.View style={{ marginBottom: 28, transform: [{ perspective: 1000 }, { rotateY: swayY }, { rotateX: swayX }] }}>
                            <View style={[styles.passShadow, { shadowColor: theme.primary }]}>
                                <LinearGradient colors={[theme.primary, theme.secondary, theme.primary]} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.passBorder}>
                                    <LinearGradient 
                                        colors={['#0F172A', theme.secondary + '40', '#000000']} 
                                        start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                                        style={styles.passbookCard}
                                    >
                                        <View style={styles.cardTop}>
                                            <View style={styles.cardHeaderLeft}>
                                                <MaterialCommunityIcons name="check-decagram" size={18} color="#10B981" />
                                                <Text style={styles.cardType}>VERIFIED HOST</Text>
                                            </View>
                                            <MaterialCommunityIcons name="integrated-circuit-chip" size={32} color={theme.accent} />
                                        </View>

                                        <View style={styles.profileSection}>
                                            <LinearGradient colors={[theme.primary, theme.secondary]} style={styles.avatarBoxRing}>
                                                <View style={[styles.avatarBox, { backgroundColor: '#0B1120' }]}>
                                                    {userData.profilePic || userData.photoURL ? (
                                                        <Image source={{ uri: userData.profilePic || userData.photoURL }} style={styles.avatar} />
                                                    ) : (
                                                        <Text style={[styles.avatarText, { color: theme.primary }]}>{userData.name?.[0] || 'C'}</Text>
                                                    )}
                                                </View>
                                            </LinearGradient>
                                            <View style={{marginLeft: 15, flex: 1}}>
                                                <Text style={styles.userName} numberOfLines={1}>{userData.name || 'Authorized User'}</Text>
                                                <Text style={styles.userPhone} numberOfLines={1}>{userData.phone || userData.email || 'Encrypted Channel'}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.cardBottom}>
                                            <View style={{flex: 1.2}}>
                                                <Text style={styles.uidLabel}>SYSTEM REF ID</Text>
                                                <Text style={[styles.uidValueLarge, { color: theme.primary }]} numberOfLines={1} selectable={true}>{String(userData.id).toUpperCase()}</Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end', flex: 0.8 }}>
                                                <Text style={styles.joinedLabel}>AUTHORIZED ON</Text>
                                                <Text style={styles.joinedValue}>
                                                    {userData.verifiedAt ? new Date(userData.verifiedAt.toDate ? userData.verifiedAt.toDate() : userData.verifiedAt).toLocaleDateString() : 'N/A'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* moving holographic sheen */}
                                        <Animated.View pointerEvents="none" style={[styles.sheenBar, { transform: [{ translateX: sheenX }, { rotate: '20deg' }] }]}>
                                            <LinearGradient
                                                colors={['transparent', 'rgba(255,255,255,0.16)', 'transparent']}
                                                start={{ x: 0, y: 0 }}
                                                end={{ x: 1, y: 0 }}
                                                style={{ flex: 1 }}
                                            />
                                        </Animated.View>
                                    </LinearGradient>
                                </LinearGradient>
                            </View>
                        </Animated.View>

                        {/* TABS */}
                        <View style={styles.tabsRow}>
                            <PressableScale containerStyle={{ flex: 1 }} style={styles.tabBtn} onPress={() => setActiveTab('STATS')}>
                                {activeTab === 'STATS' && <LinearGradient colors={[theme.primary + 'CC', theme.secondary + 'CC']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />}
                                <Text style={[styles.tabText, activeTab === 'STATS' && styles.tabTextActive]}>ANALYTICS</Text>
                            </PressableScale>
                            <PressableScale containerStyle={{ flex: 1 }} style={styles.tabBtn} onPress={() => setActiveTab('HISTORY')}>
                                {activeTab === 'HISTORY' && <LinearGradient colors={[theme.primary + 'CC', theme.secondary + 'CC']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} />}
                                <Text style={[styles.tabText, activeTab === 'HISTORY' && styles.tabTextActive]}>LEDGER HISTORY</Text>
                            </PressableScale>
                        </View>

                        {activeTab === 'STATS' && (
                            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                                {/* HERO */}
                                <View style={styles.eliteHeroWrapper}>
                                    <Card3D colors={themeColors} radius={40} bg="#020617" index={0}>
                                        <LinearGradient colors={[theme.primary + 'AA', theme.secondary + 'AA', '#020617']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.eliteHeroCard}>
                                            <View style={styles.cyberCircle} />
                                            <View style={styles.cyberCircleSmall} />
                                            
                                            <View style={styles.heroHeaderRow}>
                                                <View style={styles.systemStatusBox}>
                                                    <PulseDot color="#10B981" />
                                                    <Text style={styles.systemStatusText}>ANALYTICS ACTIVE</Text>
                                                </View>
                                                <View style={[styles.statusTag, { backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                                                    <MaterialCommunityIcons name="star-circle" size={14} color={theme.accent} />
                                                    <Text style={[styles.statusTagText, { color: theme.accent }]}>{config.label}</Text>
                                                </View>
                                            </View>

                                            <View style={styles.revenueDisplay}>
                                                <Text style={styles.revenueTitle}>GLOBAL GAINED REWARDS STREAM</Text>
                                                <View style={styles.revenueNumberContainer}>
                                                    <Animated.Text style={[styles.revenueSymbol, { color: theme.accent, transform: [{ translateY: floatAnim }] }]}>🎖️</Animated.Text>
                                                    <Text style={styles.revenueMainValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>{userData?.totalBeansEarned?.toLocaleString() || 0}</Text>
                                                    <Text style={[styles.revenueMainUnit, { color: theme.accent }]}>REWARDS</Text>
                                                </View>
                                            </View>

                                            <View style={styles.heroSummaryGrid}>
                                                <View style={styles.summaryItem}>
                                                    <Text style={styles.summaryLabel}>LAST INTERACTION</Text>
                                                    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{userData?.lastCaller}</Text>
                                                </View>
                                                <View style={styles.vLine} />
                                                <View style={styles.summaryItem}>
                                                    <Text style={styles.summaryLabel}>KEY USER</Text>
                                                    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{userData?.topFanName}</Text>
                                                </View>
                                            </View>
                                        </LinearGradient>
                                    </Card3D>
                                </View>

                                <Text style={styles.subHeading}>PERFORMANCE MATRIX</Text>
                                <View style={styles.matrixGrid}>
                                    <View style={styles.matrixRow}>
                                        <MatrixBox index={0} icon="time-outline" label="Today Session" value={`${userData?.todayMins}m`} color={theme.primary} colors={themeColorsRev} />
                                        <MatrixBox index={1} icon="people-outline" label="Today Calls" value={userData?.todayCalls} color={theme.primary} colors={themeColors} />
                                    </View>
                                    <View style={styles.matrixRow}>
                                        <MatrixBox index={2} icon="stats-chart-outline" label="Total Time" value={`${userData?.displayMins}m`} color={theme.primary} colors={themeColors} />
                                        <MatrixBox index={3} icon="cash-outline" label="Paid Out" value={`₹${userData?.totalWithdrawnRs || 0}`} color="#EF4444" colors={themeColorsRev} />
                                    </View>
                                </View>

                                <Text style={styles.subHeading}>REWARD BREAKDOWN</Text>
                                <View style={styles.matrixGrid}>
                                    <View style={styles.matrixRow}>
                                        <MatrixBox index={0} icon="videocam" label="Call Earnings" value={`🎖️${breakdown.calls.toLocaleString()}`} color={theme.primary} colors={themeColorsRev} />
                                        <MatrixBox index={1} icon="gift" label="Call Rewards" value={`🎖️${breakdown.callGifts.toLocaleString()}`} color={theme.primary} colors={themeColors} />
                                    </View>
                                    <View style={styles.matrixRow}>
                                        <MatrixBox index={2} icon="broadcast" iconFamily="MaterialCommunityIcons" label="Broadcast Rewards" value={`🎖️${breakdown.liveGifts.toLocaleString()}`} color={theme.secondary} colors={themeColors} />
                                        <MatrixBox index={3} icon="party-popper" iconFamily="MaterialCommunityIcons" label="Forum Rewards" value={`🎖️${breakdown.partyGifts.toLocaleString()}`} color={theme.secondary} colors={themeColorsRev} />
                                    </View>
                                </View>

                                {/* LIFETIME GIFT REWARDS */}
                                <View style={styles.dailyFlowContainer}>
                                    <Card3D colors={['#F59E0B', '#EF4444']} radius={30} index={1}>
                                        <BlurView intensity={20} tint="dark" style={styles.holoFlowCardWrapper}>
                                            <LinearGradient 
                                                colors={['rgba(245, 158, 11, 0.2)', 'rgba(245, 158, 11, 0.05)', 'transparent']} 
                                                start={{x:0, y:0}} end={{x:1, y:1}} 
                                                style={[styles.dailyFlowPill, { borderColor: 'rgba(245, 158, 11, 0.4)' }]}
                                            >
                                                <View style={[styles.flowIconGlow, { backgroundColor: '#F59E0B' }]} />
                                                <View style={[styles.flowIconBox, { backgroundColor: 'rgba(245, 158, 11, 0.15)', borderColor: 'rgba(245, 158, 11, 0.5)' }]}>
                                                     <MaterialCommunityIcons name="gift-outline" size={24} color="#F59E0B" />
                                                </View>
                                                <View style={styles.flowTextContainer}>
                                                    <Text style={styles.flowLabel} numberOfLines={1} adjustsFontSizeToFit>LIFETIME GIFT REWARDS</Text>
                                                </View>
                                                <View style={styles.flowValueNode}>
                                                    <View style={[styles.flowValueGlow, { backgroundColor: '#F59E0B' }]} />
                                                    <View style={[styles.flowValueBox, { backgroundColor: 'rgba(0,0,0,0.6)', borderColor: 'rgba(245, 158, 11, 0.5)' }]}>
                                                        <Text style={[styles.flowBeanSymbol, {color: '#F59E0B', marginRight: 4}]}>🎖️</Text>
                                                        <Text style={[styles.flowValText, { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>
                                                            {(breakdown.totalDeepGifts > 0 ? breakdown.totalDeepGifts : Math.floor((Number(userData?.totalDiamondsReceived) || 0) / 2)).toLocaleString()}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </LinearGradient>
                                        </BlurView>
                                    </Card3D>
                                </View>

                                {/* DAILY MISSION */}
                                <Text style={styles.subHeading}>MISSION: DAILY GOAL</Text>
                                <Card3D colors={isCompleted ? ['#10B981', theme.secondary] : themeColors} radius={35} bg="#030616" index={2}>
                                    <LinearGradient 
                                        colors={['rgba(15, 23, 42, 0.9)', 'rgba(2, 6, 23, 1)']} 
                                        style={styles.massChallengeCard}
                                    >
                                        <View style={styles.massChallengeHeader}>
                                            <View style={styles.massHeaderLeft}>
                                                <View style={[styles.missionIconRing, { borderColor: isCompleted ? '#10B981' : theme.primary }]}>
                                                    <Ionicons name={isCompleted ? "checkmark-circle" : "rocket"} size={22} color={isCompleted ? '#10B981' : theme.primary} />
                                                </View>
                                                <View style={styles.missionTextGroup}>
                                                    <Text style={[styles.missionMainTitle, { color: isCompleted ? '#10B981' : '#FFF' }]}>
                                                        {currentMilestone.label} MISSION
                                                    </Text>
                                                    <Text style={styles.missionSubText}>Reach {currentMilestone.target.toLocaleString()} Rewards to unlock</Text>
                                                </View>
                                            </View>
                                            <View style={[styles.bountyBox, { backgroundColor: isCompleted ? 'rgba(16, 185, 129, 0.15)' : theme.primary + '20', borderColor: isCompleted ? '#10B981' : theme.primary }]}>
                                                <Text style={styles.bountyLabel}>REWARDS</Text>
                                                <Text style={[styles.bountyValue, { color: isCompleted ? '#10B981' : theme.primary }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>+{currentMilestone.bonus.toLocaleString()}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.holoTabContainer}>
                                            {milestones.map((m, index) => {
                                                const isTabActive = activeMissionTab === index;
                                                return (
                                                    <TouchableOpacity 
                                                        key={index} 
                                                        onPress={() => setActiveMissionTab(index)} 
                                                        style={[
                                                            styles.holoTab, 
                                                            isTabActive && { backgroundColor: theme.primary + '30', borderColor: theme.primary }
                                                        ]}
                                                        activeOpacity={0.7}
                                                    >
                                                        {isTabActive && <View style={[styles.holoTabGlow, { backgroundColor: theme.primary }]} />}
                                                        <Text style={[styles.holoTabText, isTabActive && { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit>{m.label}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        <View style={styles.quantumProgressContainer}>
                                            <View style={styles.quantumProgressHeader}>
                                                <Text style={styles.quantumProgressLabel}>CORE SYNC STATUS</Text>
                                                <Text style={[styles.quantumProgressPct, { color: isCompleted ? '#10B981' : theme.primary }]}>
                                                    {Math.round(progress * 100)}%
                                                </Text>
                                            </View>
                                            <AnimatedBar progress={progress} color={isCompleted ? '#10B981' : theme.primary} />
                                            <View style={styles.quantumFooter}>
                                                <Text style={styles.quantumCollected}>{userData?.todayBeans?.toLocaleString()} / {currentMilestone.target.toLocaleString()}</Text>
                                                <Text style={[styles.quantumRemaining, isCompleted && { color: '#10B981' }]}>
                                                    {isCompleted ? 'TRANSMISSION COMPLETE' : `${(currentMilestone.target - userData?.todayBeans).toLocaleString()} REWARDS REMAINING`}
                                                </Text>
                                            </View>
                                        </View>
                                    </LinearGradient>
                                </Card3D>

                                {/* VIP INSIGHTS */}
                                <Text style={styles.subHeading}>VIP INSIGHTS</Text>
                                <Card3D colors={themeColorsRev} radius={30} index={3}>
                                    <LinearGradient colors={['rgba(30, 41, 59, 0.4)', 'rgba(2, 6, 23, 0.9)']} style={styles.insightPremiumCard}>
                                        <View style={[styles.insightIconRing, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '40' }]}>
                                             <MaterialCommunityIcons name="trophy-variant" size={26} color={theme.accent} />
                                        </View>
                                        <View style={{flex: 1, marginLeft: 15}}>
                                            <Text style={[styles.insightTopTitle, { color: theme.accent }]}>TOP LOYALTY RECORD</Text>
                                            <Text style={styles.insightDescription}>Maximum focus: <Text style={{color: '#FFF', fontWeight: '900'}}>{userData?.longestCallDisplay} minutes</Text> single session.</Text>
                                        </View>
                                        <Ionicons name="shield-checkmark" size={20} color="#10B981" />
                                    </LinearGradient>
                                </Card3D>
                            </Animated.View>
                        )}
                        
                        {activeTab === 'HISTORY' && (
                            <View style={{ marginBottom: 15 }}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabCapsuleContainer}>
                                    <BlurView intensity={40} tint="dark" style={[styles.tabCapsule, { borderColor: theme.primary + '30' }]}>
                                        {TABS.map((tab) => {
                                            const isActive = activeHistoryTab === tab.id;
                                            return (
                                                <TouchableOpacity 
                                                    key={tab.id}
                                                    style={[styles.eliteTab, isActive && [styles.eliteTabActive, { backgroundColor: theme.primary + '20' }]]} 
                                                    onPress={() => setActiveHistoryTab(tab.id as any)}
                                                >
                                                    {isActive && <View style={[styles.activeGlow, { backgroundColor: theme.primary, shadowColor: theme.primary }]} />}
                                                    {tab.iconType === 'Ionicons' ? (
                                                        <Ionicons name={tab.icon as any} size={16} color={isActive ? '#FFF' : '#475569'} />
                                                    ) : (
                                                        <MaterialCommunityIcons name={tab.icon as any} size={16} color={isActive ? '#FFF' : '#475569'} />
                                                    )}
                                                    <Text style={[styles.eliteTabText, isActive && styles.eliteTabTextActive]}>{tab.label}</Text>
                                                </TouchableOpacity>
                                            )
                                        })}
                                    </BlurView>
                                </ScrollView>
                            </View>
                        )}
                        
                        {activeTab === 'FLAGS' && (
                            <View style={{ marginTop: 20 }}>
                                <View style={styles.talktimeHighlight}>
                                     <Text style={[styles.totalTalkLabel, { color: '#EF4444', marginBottom: 15 }]}>USER REPORTS AUDIT LOG: {flags.length} SECURE FLAGS</Text>
                                </View>
                                {loading ? (
                                    <ActivityIndicator size="large" color="#EF4444" style={{ marginTop: 40 }} />
                                ) : flags.length > 0 ? (
                                    flags.map((item, index) => {
                                        const userPic = item.fetchedUserPic || item.userImage || item.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.userName || 'User')}&background=EF4444&color=fff&bold=true`;
                                        return (
                                            <Card3D key={item.alertId || index} index={index} floatAnim={floatAnim} colors={['#EF4444', '#F97316']} radius={24} bg="rgba(10,4,8,0.95)">
                                                <View style={styles.stealthHistoryCard}>
                                                    <View style={[styles.sessionBadge, { backgroundColor: '#EF4444' }]}>
                                                         <MaterialCommunityIcons name="alert-circle" size={10} color="#FFF" />
                                                         <Text style={styles.sessionTypeText}>REPORTED_LOG</Text>
                                                    </View>
                                                    <View style={styles.cardHeaderUI}>
                                                        <View style={[styles.expertThumbRing, { borderColor: '#EF4444', shadowColor: '#EF4444', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                                            <Image source={{ uri: userPic }} style={styles.expertThumb} />
                                                        </View>
                                                        <View style={styles.expertInfo}>
                                                            <Text style={styles.expertName} numberOfLines={1}>USER: {(item.userName || 'Unknown User').toUpperCase()}</Text>
                                                            <Text style={styles.callDateText} numberOfLines={1}>
                                                                {item.timestamp?.seconds 
                                                                ? new Date(item.timestamp.seconds * 1000).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) 
                                                                : 'RECENT FLAG'}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    <View style={[styles.statsRow, { flexDirection: 'column', alignItems: 'flex-start', gap: 4 }]}>
                                                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '900' }}>REASON FOR BLOCK:</Text>
                                                        <Text style={{ color: '#E2E8F0', fontSize: 12, fontWeight: '700' }}>{item.reason || 'No specific reason documented by the user.'}</Text>
                                                    </View>
                                                </View>
                                            </Card3D>
                                        )
                                    })
                                ) : (
                                    <View style={styles.emptyCenter}>
                                        <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                                            <MaterialCommunityIcons name="shield-check" size={60} color="#10B981" />
                                        </Animated.View>
                                        <Text style={[styles.emptyTitleText, { color: '#10B981', marginTop: 15 }]}>Clean Record</Text>
                                        <Text style={{color: '#475569', fontSize: 13, marginTop: 5}}>No user reports found against this host.</Text>
                                    </View>
                                )}
                            </View>
                        )}
                        
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const MatrixBox = ({ icon, label, value, color, colors, index = 0, iconFamily = "Ionicons" }: any) => (
    <View style={styles.matrixCardWrapper}>
        <Card3D colors={colors} radius={28} index={index} style={{ marginBottom: 0 }}>
            <BlurView intensity={15} tint="dark" style={styles.matrixCard}>
                <View style={[styles.matrixIconCircle, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                    {iconFamily === 'Ionicons' ? (
                        <Ionicons name={icon} size={22} color={color} />
                    ) : (
                        <MaterialCommunityIcons name={icon} size={22} color={color} />
                    )}
                </View>
                <View style={{alignItems: 'center', width: '100%', paddingHorizontal: 5, flexShrink: 1}}>
                    <Text style={styles.matrixValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.4}>{value}</Text>
                    <Text style={styles.matrixLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{label}</Text>
                </View>
                <View style={[styles.bottomGlowLine, { backgroundColor: color }]} />
            </BlurView>
        </Card3D>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    loaderText: { color: '#6366F1', marginTop: 12, fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    depthLayer: { position: 'absolute', height: 40 },

    /* header */
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15, gap: 15, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { width: 44, height: 44, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
    headerSub: { color: '#FB7185', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
    headerBadgeRing: { padding: 2, borderRadius: 16, shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
    headerBadgeInner: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#050816', alignItems: 'center', justifyContent: 'center' },

    /* passbook card */
    passShadow: { shadowOpacity: 0.45, shadowRadius: 26, shadowOffset: { width: 0, height: 16 }, elevation: 24 },
    passBorder: { borderRadius: 28, padding: 1.5 },
    passbookCard: { borderRadius: 26.5, padding: 25, overflow: 'hidden' },
    sheenBar: { position: 'absolute', top: -40, bottom: -40, width: 90, left: 0 },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25 },
    cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    cardType: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    profileSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
    avatarBoxRing: { width: 66, height: 66, borderRadius: 21, padding: 2.5 },
    avatarBox: { flex: 1, borderRadius: 18.5, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    avatar: { width: '100%', height: '100%' },
    avatarText: { fontSize: 24, fontWeight: '900' },
    userName: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
    userPhone: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginTop: 4, letterSpacing: 1 },
    cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    uidLabel: { color: '#64748B', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
    uidValueLarge: { fontSize: 13, fontWeight: '900', letterSpacing: 1 },
    joinedLabel: { color: '#64748B', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 4 },
    joinedValue: { color: '#FFF', fontSize: 13, fontWeight: '800' },

    /* main tabs */
    tabsRow: { flexDirection: 'row', backgroundColor: 'rgba(15,23,42,0.8)', padding: 5, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 6 },
    tabBtn: { paddingVertical: 13, alignItems: 'center', borderRadius: 12, overflow: 'hidden' },
    tabText: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    tabTextActive: { color: '#FFF' },
    
    subHeading: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 18, marginTop: 36, textTransform: 'uppercase' },

    /* hero */
    eliteHeroWrapper: { width: '100%', marginTop: 10 },
    eliteHeroCard: { padding: 25, overflow: 'hidden' },
    cyberCircle: { position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.04)' },
    cyberCircleSmall: { position: 'absolute', bottom: -20, left: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(255,255,255,0.06)' },
    heroHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 35 },
    systemStatusBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    systemStatusText: { color: '#10B981', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
    statusTag: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
    statusTagText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    revenueDisplay: { marginBottom: 35 },
    revenueTitle: { color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: '800', letterSpacing: 2 },
    revenueNumberContainer: { flexDirection: 'row', alignItems: 'baseline', marginTop: 8, flexWrap: 'nowrap' },
    revenueSymbol: { fontSize: 24, fontWeight: '800', marginRight: 5 },
    revenueMainValue: { color: '#FFF', fontSize: 52, fontWeight: '900', letterSpacing: -1, flexShrink: 1 },
    revenueMainUnit: { fontSize: 14, fontWeight: '800', marginLeft: 10 },
    heroSummaryGrid: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', padding: 18, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
    summaryItem: { flex: 1, overflow: 'hidden' }, 
    summaryLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 7, fontWeight: '900', marginBottom: 4 },
    summaryValue: { color: '#FFF', fontSize: 13, fontWeight: '800' },
    vLine: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 15 },

    /* matrix */
    matrixGrid: { gap: 22 },
    matrixRow: { flexDirection: 'row', gap: 16 },
    matrixCardWrapper: { flex: 1 },
    matrixCard: { padding: 20, alignItems: 'center', width: '100%', overflow: 'hidden' },
    matrixIconCircle: { width: 50, height: 50, borderRadius: 18, justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 1 },
    matrixValue: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
    matrixLabel: { color: '#64748B', fontSize: 10, fontWeight: '800', marginTop: 4, textAlign: 'center' },
    bottomGlowLine: { position: 'absolute', bottom: 0, width: '40%', height: 3, borderRadius: 2 },

    /* lifetime flow */
    dailyFlowContainer: { marginTop: 26 },
    holoFlowCardWrapper: { overflow: 'hidden' },
    dailyFlowPill: { flexDirection: 'row', alignItems: 'center', padding: 20, position: 'relative' },
    flowIconGlow: { position: 'absolute', top: 20, left: 20, width: 50, height: 50, borderRadius: 25, opacity: 0.3 },
    flowIconBox: { width: 56, height: 56, borderRadius: 22, justifyContent: 'center', alignItems: 'center', borderWidth: 1, zIndex: 2 },
    flowTextContainer: { flex: 1, paddingLeft: 18, justifyContent: 'center' },
    flowLabel: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
    flowValueNode: { position: 'relative', flexShrink: 1, maxWidth: '40%' },
    flowValueGlow: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 20, opacity: 0.5 },
    flowValueBox: { paddingHorizontal: 16, paddingVertical: 12, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, zIndex: 2 },
    flowValText: { fontSize: 18, fontWeight: '900', letterSpacing: -0.5, flexShrink: 1 },
    flowBeanSymbol: { fontSize: 16, fontWeight: '900' },

    /* mission */
    massChallengeCard: { padding: 25 },
    massChallengeHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
    massHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    missionIconRing: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 2, backgroundColor: 'rgba(0,0,0,0.3)' },
    missionTextGroup: { marginLeft: 15, flex: 1 },
    missionMainTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
    missionSubText: { color: '#64748B', fontSize: 11, fontWeight: '700', marginTop: 3 },
    bountyBox: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16, borderWidth: 1, maxWidth: '35%' },
    bountyLabel: { color: '#FFF', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginBottom: 2, opacity: 0.8 },
    bountyValue: { fontSize: 14, fontWeight: '900', flexShrink: 1 },
    holoTabContainer: { flexDirection: 'row', gap: 10, marginBottom: 30, backgroundColor: 'rgba(0,0,0,0.25)', padding: 6, borderRadius: 20 },
    holoTab: { flex: 1, paddingVertical: 12, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'transparent', position: 'relative', overflow: 'hidden' },
    holoTabGlow: { position: 'absolute', bottom: 0, width: '50%', height: 2, borderRadius: 2, elevation: 5, shadowOpacity: 1, shadowRadius: 5 },
    holoTabText: { color: '#475569', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    quantumProgressContainer: { backgroundColor: 'rgba(0,0,0,0.3)', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    quantumProgressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
    quantumProgressLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 2 },
    quantumProgressPct: { fontSize: 18, fontWeight: '900' },
    quantumTrack: { width: '100%', height: 10, backgroundColor: '#020617', borderRadius: 5, overflow: 'hidden', marginBottom: 12 },
    quantumFill: { height: '100%', borderRadius: 5, elevation: 10, shadowOpacity: 0.8, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
    quantumFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    quantumCollected: { color: '#FFF', fontSize: 12, fontWeight: '800' },
    quantumRemaining: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },

    /* insight */
    insightPremiumCard: { flexDirection: 'row', alignItems: 'center', padding: 22 },
    insightIconRing: { width: 58, height: 58, borderRadius: 29, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
    insightTopTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    insightDescription: { color: '#94A3B8', fontSize: 13, marginTop: 5, lineHeight: 20 },

    /* history */
    tabCapsuleContainer: { paddingBottom: 20 },
    tabCapsule: { flexDirection: 'row', backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 25, padding: 6, borderWidth: 1, overflow: 'hidden' },
    eliteTab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 16, position: 'relative' },
    eliteTabActive: { borderRadius: 20 },
    activeGlow: { position: 'absolute', bottom: 0, width: '60%', height: 3, borderRadius: 10 },
    eliteTabText: { color: '#475569', fontSize: 12, fontWeight: '900', letterSpacing: 0.5 },
    eliteTabTextActive: { color: '#FFF' },
    statusGlowLine: { height: 3, width: '100%' },
    cardMain: { flexDirection: 'row', padding: 18, justifyContent: 'space-between', alignItems: 'center' },
    userSection: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatarWrapper: { position: 'relative' },
    avatarRing: { width: 60, height: 60, borderRadius: 24, padding: 2, alignItems: 'center', justifyContent: 'center' },
    eliteAvatar: { width: 56, height: 56, borderRadius: 22, backgroundColor: '#0F172A' },
    levelBadgeMini: { position: 'absolute', bottom: -6, right: -6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 2, borderColor: '#020617' },
    levelBadgeText: { color: '#FFF', fontSize: 7, fontWeight: '900' },
    userMeta: { marginLeft: 15, flex: 1, paddingRight: 10, flexShrink: 1 },
    eliteUserName: { color: '#FFF', fontSize: 13, fontWeight: '900', letterSpacing: 0.2 },
    dateTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
    giftLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
    eliteDateText: { color: '#94A3B8', fontSize: 10, fontWeight: '800' },
    giftSubName: { color: '#FBBF24', fontSize: 11, fontWeight: '900', flexShrink: 1 },
    earningsBlock: { alignItems: 'flex-end', minWidth: 60 },
    earnLabel: { color: '#475569', fontSize: 7, fontWeight: '900', letterSpacing: 1.5 },
    beansRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
    eliteBeansValue: { color: '#FBBF24', fontSize: 18, fontWeight: '900' },
    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.25)' },
    footerStatRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    footerStatText: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
    verifiedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    verifiedText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
    cardFooterSimple: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 14, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
    footerTimeText: { color: '#94A3B8', fontSize: 10, fontWeight: '800' },
    receivedTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    receivedText: { fontSize: 8, fontWeight: '900', letterSpacing: 1 },
    emptyCenter: { justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyTitleText: { color: '#FFF', fontSize: 22, fontWeight: '900' },

    /* footer */
    footerContainer: { alignItems: 'center', paddingHorizontal: 20, paddingBottom: 20, paddingTop: 10 },
    bottomFlagBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 30, borderRadius: 25, width: '100%', gap: 10, borderWidth: 1 },
    bottomFlagText: { fontSize: 13, fontWeight: '900', letterSpacing: 1.5 },
    talktimeHighlight: { alignItems: 'center' },
    totalTalkLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2, marginBottom: 5 },
    
    /* flags */
    stealthHistoryCard: { padding: 18, paddingTop: 22, overflow: 'hidden' },
    sessionBadge: { position: 'absolute', top: 0, right: 18, paddingHorizontal: 10, paddingVertical: 4, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, flexDirection: 'row', alignItems: 'center', gap: 4, zIndex: 10 },
    sessionTypeText: { color: '#FFF', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
    cardHeaderUI: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, zIndex: 10 },
    expertThumbRing: { width: 54, height: 54, borderRadius: 18, borderWidth: 1.5, padding: 2, elevation: 10, shadowOpacity: 0.5, shadowRadius: 8 },
    expertThumb: { width: '100%', height: '100%', borderRadius: 15 },
    expertInfo: { flex: 1, marginLeft: 15, overflow: 'hidden' },
    expertName: { color: '#FFF', fontSize: 14, fontWeight: '900', marginBottom: 4, letterSpacing: 0.5 },
    callDateText: { color: '#475569', fontSize: 10, fontWeight: '800' },
    statsRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 12, zIndex: 10, width: '100%' },
    
    footer: { alignItems: 'center', marginTop: 25 },
    verText: { color: 'rgba(255,255,255,0.15)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    secureNode: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 15, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, borderWidth: 1 },
    secureText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
});
