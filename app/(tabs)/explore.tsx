import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { useVideoPlayer, VideoView } from 'expo-video';
import { addDoc, arrayUnion, collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Image,
    Keyboard,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    ViewToken
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';
import { checkAndRequestCallPermissions } from '../../utils/permissions';

const { width, height } = Dimensions.get('window');

// 🆕 Vertical left-bottom rail position (distance from screen bottom). Change this one number to move it up/down.
const RAIL_BOTTOM = 325;

// 🛡️ SAFE ALPHA HELPER: always normalizes to 6-digit hex before adding alpha (prevents invalid colors / gradient crashes)
const withAlpha = (hex: string, alpha: string = 'FF') => {
    const base = (hex || '#000000').length >= 7 ? hex.slice(0, 7) : hex;
    return base + alpha;
};

// 🔒 Safe Level Data Fetcher (🔥 SMART FETCH WITH 3 COLORS 🔥)
const getSmartLevelConfig = (userData: any) => {
    const getObj = (lvl: number) => {
        if (lvl >= 10) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'] as const, glow: '#F59E0B' };
        if (lvl === 9) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'] as const, glow: '#EC4899' };
        if (lvl === 8) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'] as const, glow: '#8B5CF6' };
        if (lvl === 7) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'] as const, glow: '#3B82F6' };
        if (lvl === 6) return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'] as const, glow: '#06B6D4' };
        if (lvl === 5) return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'] as const, glow: '#10B981' };
        if (lvl === 4) return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'] as const, glow: '#EAB308' };
        if (lvl === 3) return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'] as const, glow: '#94A3B8' };
        if (lvl === 2) return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'] as const, glow: 'transparent' };
        if (lvl === 1) return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'] as const, glow: 'transparent' };
        return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'] as const, glow: 'transparent' };
    };

    // 1. Direct Level Override
    const lvl = userData?.expertLevel ?? userData?.currentLevel ?? userData?.level;
    if (lvl !== undefined && lvl !== null) return getObj(Number(lvl));

    // 2. Title Fallback
    const title = String(userData?.levelTitle || '').toUpperCase();
    if (title.includes('L10') || title.includes('LEGEND')) return getObj(10);
    if (title.includes('L9') || title.includes('MYTHIC')) return getObj(9);
    if (title.includes('L8') || title.includes('ELITE')) return getObj(8);
    if (title.includes('L7') || title.includes('MASTER')) return getObj(7);
    if (title.includes('L6') || title.includes('DIAMOND')) return getObj(6);
    if (title.includes('L5') || title.includes('PLATINUM')) return getObj(5);
    if (title.includes('L4') || title.includes('GOLD')) return getObj(4);
    if (title.includes('L3') || title.includes('SILVER')) return getObj(3);
    if (title.includes('L2') || title.includes('BRONZE')) return getObj(2);
    if (title.includes('L1') || title.includes('ROOKIE')) return getObj(1);
    if (title.includes('L0') || title.includes('BEGINNER')) return getObj(0);

    // 3. Beans Fallback
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

// 🆕 EXPANDING RIPPLE WAVES (used in call modals)
const RippleRings = ({ color, size }: { color: string, size: number }) => {
    const vals = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
    useEffect(() => {
        vals.forEach((v, i) => {
            Animated.sequence([
                Animated.delay(i * 800),
                Animated.loop(Animated.sequence([
                    Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.out(Easing.quad), useNativeDriver: true }),
                    Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
                ])),
            ]).start();
        });
    }, []);
    return (
        <>
            {vals.map((v, i) => (
                <Animated.View
                    key={i}
                    pointerEvents="none"
                    style={{
                        position: 'absolute', width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: color,
                        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                        transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.1] }) }],
                    }}
                />
            ))}
        </>
    );
};

// 🎬 INDIVIDUAL VIDEO ITEM COMPONENT
const ExpertVideoCard = ({ expert, isActive, isScreenFocused, onConnect, onProfile, index, total, loop, glow, shine }: { expert: any, isActive: boolean, isScreenFocused: boolean, onConnect: () => void, onProfile: () => void, index: number, total: number, loop: Animated.Value, glow: Animated.Value, shine: Animated.Value }) => {
    
    const player = useVideoPlayer(expert.teaserVideo || null, (player) => {
        player.loop = true;
    });

    useEffect(() => {
        if (isActive && isScreenFocused) {
            player.play();
        } else {
            player.pause();
        }
    }, [isActive, isScreenFocused, player]);

    // 🆕 CONTENT ENTRANCE (slides up every time this card becomes the active one)
    const enter = useRef(new Animated.Value(0)).current;
    const press = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (isActive) {
            Animated.spring(enter, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }).start();
        } else {
            enter.setValue(0);
        }
    }, [isActive]);

    // 🔥 3-COLOR THEME FETCH 🔥
    const tierData = getSmartLevelConfig(expert);
    const c1 = tierData.colors[0];
    const c2 = tierData.colors[1];
    const c3 = tierData.colors[2];
    
    // Fallback glow logic to ensure text pops
    const glowColor = tierData.glow !== 'transparent' ? tierData.glow : c3;
    
    // 🔥 Dynamically calculate Diamond price based purely on Expert's Per Minute Rate (Beans * 2)
    const displayDiamondPrice = expert.pricePerMin ? expert.pricePerMin * 2 : 2000;

    // 🆕 DERIVED ANIMATIONS
    const orbitRotate = loop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const orbitRotateRev = loop.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
    const glowScale = glow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
    const glowOpacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });
    const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-140, width] });
    const contentStyle = {
        opacity: enter,
        transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [50, 0] }) }],
    };
    // 🆕 Rail now slides in from the LEFT
    const railStyle = {
        opacity: enter,
        transform: [{ translateX: enter.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] }) }],
    };
    const progress = `${Math.min(100, ((index + 1) / Math.max(total, 1)) * 100)}%`;

    return (
        <View style={styles.cardContainer}>
            {expert.teaserVideo ? (
                <VideoView
                    player={player}
                    style={styles.video}
                    contentFit="cover"
                    nativeControls={false} 
                />
            ) : (
                <Image 
                    source={{ uri: expert.profilePic || expert.photoURL || `https://ui-avatars.com/api/?name=${expert.name}&background=0F172A&color=00F2FE&size=512` }} 
                    style={styles.video} 
                />
            )}

            {/* 🆕 TOP VIGNETTE (keeps header readable on bright videos) */}
            <LinearGradient pointerEvents="none" colors={['rgba(2,6,23,0.8)', 'rgba(2,6,23,0)']} style={styles.topVignette} />

            {/* 🆕 VERTICAL LEFT-BOTTOM RAIL: orbiting avatar + level chip, rating, progress (as in the first version) */}
            <Animated.View style={[styles.sideRail, railStyle]}>
                <TouchableOpacity activeOpacity={0.85} onPress={onProfile} style={styles.railAvatarWrap}>
                    <Animated.View style={[styles.railRing, { borderColor: withAlpha(c1, 'DD'), transform: [{ rotate: orbitRotate }] }]} />
                    <Animated.View style={[styles.railRingInner, { borderColor: withAlpha(c3, 'CC'), transform: [{ rotate: orbitRotateRev }] }]} />
                    <View style={[styles.railAvatarCore, { borderColor: withAlpha(glowColor, 'FF'), shadowColor: glowColor }]}>
                        <Image
                            source={{ uri: expert.profilePic || expert.photoURL || `https://ui-avatars.com/api/?name=${expert.name}&background=0F172A&color=00F2FE&size=256` }}
                            style={styles.railAvatarImg}
                        />
                    </View>
                    <LinearGradient colors={[c1, c2, c3] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.railLevelChip}>
                        <Text style={styles.railLevelText}>L{tierData.lvl}</Text>
                    </LinearGradient>
                </TouchableOpacity>

                {expert.rating ? (
                    <View style={styles.railStat}>
                        <Ionicons name="star" size={14} color="#F59E0B" />
                        <Text style={styles.railStatText}>{Number(expert.rating).toFixed(1)}</Text>
                    </View>
                ) : null}

                <View style={styles.progressWrap}>
                    <View style={styles.progressTrack}>
                        <LinearGradient colors={[withAlpha(c1, 'FF'), withAlpha(c3, 'FF')]} style={[styles.progressFill, { height: progress as any }]} />
                    </View>
                    <Text style={styles.progressText}>{index + 1}/{total}</Text>
                </View>
            </Animated.View>

            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(2, 6, 23, 0.95)']}
                style={styles.bottomGradient}
            >
                <Animated.View style={[styles.contentWrapper, contentStyle]}>
                    
                    <View style={styles.infoRow}>
                        <View style={{ flex: 1 }}>
                            {/* 🔥 EXPERT NAME (Uses Glow Color for Shadow) 🔥 */}
                            <Text style={[styles.expertName, { color: '#FFF', textShadowColor: glowColor, textShadowRadius: 15 }]}>
                                {expert.name || expert.userName || 'TALKPE PRO Host'}
                            </Text>
                            
                            {/* 🔥 ALL BADGES IN ONE ROW (Tier + Skill + Online) */}
                            <View style={styles.badgeRow}>
                                <MaterialCommunityIcons name="check-decagram" size={16} color="#10B981" />
                                
                                {/* 🔥 3-COLOR LINEAR GRADIENT TIER BADGE 🔥 */}
                                <LinearGradient 
                                    colors={[c1, c2, c3] as any} 
                                    start={{x:0, y:0}} end={{x:1, y:1}} 
                                    style={[styles.tierBadge, { borderColor: 'rgba(255,255,255,0.35)' }]}
                                >
                                    <Text style={[styles.tierText, { color: '#FFF' }]}>{tierData.label}</Text>
                                </LinearGradient>

                                {/* 🔥 SKILL BADGE (Uses c3 for Contrast) 🔥 */}
                                {expert.hasMasterclass && expert.masterclassSkill && (
                                    <View style={[styles.skillBadge, { backgroundColor: withAlpha(c3, '20'), borderColor: c3 }]}>
                                        <Text style={[styles.skillBadgeText, { color: c3 }]}>{expert.masterclassSkill}</Text>
                                    </View>
                                )}

                                {/* Online Badge */}
                                {expert.isOnline && (
                                    <View style={styles.liveBadge}>
                                        <View style={styles.liveDotWrap}>
                                            <Animated.View style={[styles.liveDotHalo, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
                                            <View style={styles.liveDot} />
                                        </View>
                                        <Text style={styles.liveText}>ONLINE</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    {/* 🔥 3-COLOR CONNECT BUTTON 🔥 (now 3D press + shine + pulsing glow) */}
                    <Animated.View style={{ transform: [{ perspective: 800 }, { scale: press }] }}>
                        <TouchableOpacity 
                            style={[styles.connectBtn, { shadowColor: glowColor }]} 
                            activeOpacity={0.9}
                            onPress={onConnect}
                            onPressIn={() => Animated.spring(press, { toValue: 0.95, friction: 6, useNativeDriver: true }).start()}
                            onPressOut={() => Animated.spring(press, { toValue: 1, friction: 4, useNativeDriver: true }).start()}
                        >
                            <LinearGradient
                                colors={[c1, c2, c3] as any}
                                start={{x:0, y:0}} end={{x:1, y:1}}
                                style={styles.btnGradient}
                            >
                                <View style={styles.btnIconWrap}>
                                    <Animated.View style={[styles.btnIconHalo, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
                                    <Ionicons name="videocam" size={22} color="#FFF" />
                                </View>
                                <Text style={styles.btnText} numberOfLines={1} adjustsFontSizeToFit>CONNECT NOW</Text>
                                
                                <Text style={styles.btnDivider}>|</Text>
                                
                                <View style={styles.pricePill}>
                                    <MaterialCommunityIcons name="diamond-stone" size={16} color="#FFF" />
                                    <Text style={styles.pricePillText}>{displayDiamondPrice}</Text>
                                </View>
                            </LinearGradient>
                            <Animated.View pointerEvents="none" style={[styles.shineBar, { transform: [{ translateX: shineX }, { rotate: '20deg' }] }]} />
                        </TouchableOpacity>
                    </Animated.View>

                </Animated.View>
            </LinearGradient>
        </View>
    );
};

export default function CinematicExploreScreen() {
    const [experts, setExperts] = useState<any[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [hasTrialMins, setHasTrialMins] = useState(false); 
    const [userData, setUserData] = useState<any>(null); // To store local expert data
    const router = useRouter();
    
    const isScreenFocused = useIsFocused();
    const user = auth.currentUser;

    // 🆕 SEARCH STATES (host name type panni filter panna)
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const flatListRef = useRef<FlatList<any>>(null);

    // 🔒 NEW: SCREENSHOT & SCREEN RECORDING PROTECTION (active only while this screen is focused)
    useEffect(() => {
        const key = 'explore-feed-protect';
        if (isScreenFocused) {
            ScreenCapture.preventScreenCaptureAsync(key).catch(() => {});
        } else {
            ScreenCapture.allowScreenCaptureAsync(key).catch(() => {});
        }
        return () => {
            ScreenCapture.allowScreenCaptureAsync(key).catch(() => {});
        };
    }, [isScreenFocused]);

    // 🔥 SATTI FIX: RINGING PROTOCOL STATES (FOR USER OUTGOING) 🔥
    const [ringModalVisible, setRingModalVisible] = useState(false);
    const [ringTimer, setRingTimer] = useState(20);
    const [currentExpert, setCurrentExpert] = useState<any>(null);
    const [currentCallId, setCurrentCallId] = useState<string | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // 🔥 SATTI FIX: NEW STATES FOR EXPERT INCOMING CALL MODAL 🔥
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [incomingTimer, setIncomingTimer] = useState(20);
    const incomingPulse = useRef(new Animated.Value(1)).current;

    // 🔥 NEW STATES: REPORT MODAL 🔥
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [expertToReport, setExpertToReport] = useState<any>(null);

    // 🆕 SHARED ANIMATION LOOPS (passed to every video card + modals)
    const mainLoop = useRef(new Animated.Value(0)).current;   // rotation
    const glowAnim = useRef(new Animated.Value(0)).current;   // pulse halo
    const shineAnim = useRef(new Animated.Value(0)).current;  // button shine sweep

    useEffect(() => {
        Animated.loop(Animated.timing(mainLoop, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true })).start();

        Animated.loop(Animated.sequence([
            Animated.timing(glowAnim, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(glowAnim, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ])).start();

        Animated.loop(Animated.sequence([
            Animated.timing(shineAnim, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.delay(1800),
            Animated.timing(shineAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])).start();
    }, []);

    // 🆕 Search text maarina list-oda first video-ku pogum (active index reset)
    useEffect(() => {
        setActiveIndex(0);
        flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
    }, [searchQuery]);

    // 🔥 Check User Trial Status & Ghost Data on Load (SATTI FIX: Realtime onSnapshot)
    useEffect(() => {
        if (!user) return;
        const unsubUser = onSnapshot(doc(db, "users", user.uid), (uSnap) => {
            if (uSnap.exists()) {
                const data = uSnap.data();
                setUserData(data); // Save local user/expert data for profilePic fallback & blocked array
                if (data.freeMinsRemaining && data.freeMinsRemaining > 0) {
                    setHasTrialMins(true);
                } else {
                    setHasTrialMins(false);
                }
            }
        });
        return () => unsubUser();
    }, [user]);

    useEffect(() => {
        const q = query(
            collection(db, "users"),
            where("role", "==", "expert"),
        );

        const unsub = onSnapshot(q, (snap) => {
            const fetchedExperts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            fetchedExperts.sort((a, b) => (b.totalBeansEarned || 0) - (a.totalBeansEarned || 0));
            setExperts(fetchedExperts);
        });

        return () => unsub();
    }, []);

    // 🔥 SATTI FIX: EXPERT INCOMING CALL GLOBAL LISTENER (enga erunthalum varum) 🔥
    useEffect(() => {
        if (!user?.uid) return;

        const callQuery = query(
            collection(db, "calls"),
            where("expertId", "==", user.uid),
            where("status", "in", ["calling", "ringing", "pending", "Discover_dialing"])
        );

        const unsubCalls = onSnapshot(callQuery, async (snap) => {
            if (!snap.empty) {
                let validDocSnap = null;
                for (const docSnap of snap.docs) {
                    const data = docSnap.data();
                    const now = Date.now();
                    const callTime = data.createdAt?.toMillis ? data.createdAt.toMillis() : now;
                    if (now - callTime <= 30000) {
                        validDocSnap = docSnap;
                        break;
                    } else {
                        updateDoc(doc(db, "calls", docSnap.id), { status: 'missed' }).catch(()=>{});
                    }
                }

                if (validDocSnap) {
                    const data = validDocSnap.data();
                    
                    // 🔥 FETCH USER IMAGE AND NAME DIRECTLY FROM DOC FIRST
                    let callerPic = data.callerImage || null;
                    let fetchedName = data.callerName || data.userName || "USER";
                    
                    // Fallback just in case callerImage wasn't saved in the db
                    if(!callerPic && data.callerId) {
                        const callerDoc = await getDoc(doc(db, "users", data.callerId));
                        if(callerDoc.exists()){
                            const cData = callerDoc.data();
                            callerPic = cData.profilePic || cData.photoURL || null;
                            fetchedName = cData.name || cData.userName || cData.displayName || fetchedName;
                        }
                    }
                    
                    setIncomingCall({ id: validDocSnap.id, ...data, callerImage: callerPic, userName: fetchedName });
                    setIncomingTimer(20); // Reset to 20 secs when new call pops
                } else {
                    setIncomingCall(null);
                }
            } else {
                setIncomingCall(null);
            }
        });
        return () => unsubCalls();
    }, [user?.uid]);

    // 🔥 SATTI FIX: 12 SEC TIMER FOR EXPERT INCOMING CALL 🔥
    useEffect(() => {
        let interval: any;
        if (incomingCall) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(incomingPulse, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
                    Animated.timing(incomingPulse, { toValue: 1, duration: 1000, useNativeDriver: true })
                ])
            ).start();

            interval = setInterval(() => {
                setIncomingTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        handleIncomingCallAction('missed');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            incomingPulse.setValue(1);
        }
        return () => clearInterval(interval);
    }, [incomingCall]);

    // 🔥 SATTI FIX: EXPERT ACTION HANDLER (Accept / Reject) 🔥
    const handleIncomingCallAction = async (action: 'accepted' | 'rejected' | 'missed') => {
        if (!incomingCall || !user) return;
        try {
            if (action === 'accepted') {
                // 🔥 SATTI FIX: Robust fallback using userData so expert image is never null 🔥
                const expertPic = userData?.profilePic || user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || userData?.userName || user?.displayName || 'Expert')}&background=1E293B&color=fff&bold=true`;
                const expertNameStr = userData?.name || userData?.userName || user?.displayName || "Host";
                
                await updateDoc(doc(db, "calls", incomingCall.id), { 
                    status: 'accepted', 
                    expertId: user.uid, 
                    expertImage: expertPic,
                    expertName: expertNameStr,
                    acceptedAt: serverTimestamp() 
                });
                router.replace({ pathname: "/videocall" as any, params: { callId: incomingCall.id, expertId: user.uid, callerId: incomingCall.callerId, role: 'expert' } });
            } else {
                // If expert rejects, the call status goes to 'rejected' cutting the user's side too!
                await updateDoc(doc(db, "calls", incomingCall.id), { status: action });
                setIncomingCall(null);
            }
        } catch (e) { console.error(e); }
    };

    // 🔥 SATTI FIX: RINGING ENGINE (12 SECONDS) & FIRESTORE SYNC (FOR USER) 🔥
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        let unsubscribeCall: () => void;

        if (ringModalVisible && currentCallId && currentExpert) {
            // Pulse Animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
                ])
            ).start();

            // 12s Countdown Timer
            interval = setInterval(() => {
                setRingTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        handleMissedCall(currentCallId);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Listen to Expert's Response in Firestore
            unsubscribeCall = onSnapshot(doc(db, "calls", currentCallId), (docSnap) => {
                if (docSnap.exists()) {
                    const status = docSnap.data().status;
                    if (status === 'accepted' || status === 'connected' || status === 'in-progress') {
                        clearInterval(interval);
                        setRingModalVisible(false);
                        // 🔥 EXPERT ACCEPTED! NOW Route to Videocall with Robust Fallbacks 🔥
                        router.push({
                            pathname: "/videocall" as any,
                            params: { 
                                expertId: currentExpert?.id || "UNKNOWN_EXPERT",
                                expertName: currentExpert?.name || currentExpert?.userName || "Host",
                                expertImage: currentExpert?.profilePic || currentExpert?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentExpert?.name || currentExpert?.userName || 'Host')}&background=1E293B&color=fff&bold=true`,
                                callId: currentCallId,
                                role: 'user',
                                isFreeTrial: hasTrialMins ? "true" : "false" 
                            }
                        });
                    } else if (status === 'rejected' || status === 'declined' || status === 'ended') {
                        // 🔥 EXPERT REJECTED! USER GETS ALERT & MODAL CLOSES IMMEDIATELY 🔥
                        clearInterval(interval);
                        setRingModalVisible(false);
                        Alert.alert("Unavailable", "The host declined the connection.");
                    }
                }
            });
        } else {
            pulseAnim.setValue(1);
        }

        return () => {
            if (interval) clearInterval(interval);
            if (unsubscribeCall) unsubscribeCall();
        };
    }, [ringModalVisible, currentCallId, currentExpert]);

    // 🔥 HANDLERS FOR TIMEOUT AND CANCELLATION 🔥
    const handleMissedCall = async (callId: string) => {
        setRingModalVisible(false);
        Alert.alert("Timeout", "Host didn't answer. Try again later.");
        try {
            await updateDoc(doc(db, "calls", callId), { status: 'missed' });
        } catch (e) {}
    };

    const cancelCall = async () => {
        setRingModalVisible(false);
        if (currentCallId) {
            try {
                await updateDoc(doc(db, "calls", currentCallId), { status: 'cancelled' });
            } catch (e) {}
        }
    };

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index || 0);
        }
    }, []);

    const viewabilityConfig = {
        itemVisiblePercentThreshold: 70, 
    };

    // 🔥 THE NEW CALL ROUTING LOGIC WITH BUSY & LIVE CHECK 🔥
    const handleConnect = async (expert: any) => {
        try {
            // 👇👇 Satti's Permission Check Box 👇👇
            const hasPermission = await checkAndRequestCallPermissions();
            if (!hasPermission) {
                return; // If permission denied, do not proceed with call request
            }
            // 👆👆 -------------------------------- 👆👆

            // 1. Check if Expert is LIVE
            const liveQuery = query(collection(db, "lives"), where("hostId", "==", expert.id), where("status", "==", "live"));
            const liveSnap = await getDocs(liveQuery);

            if (!liveSnap.empty) {
                const actualLiveId = liveSnap.docs[0].id;
                // Expert is live, send user to the Live Room
                router.push({
                    pathname: '/(tabs)/live/[liveId]' as any, 
                    params: { liveId: actualLiveId }
                });
                return;
            }

            // 2. Check if Expert is BUSY
            if (expert.isBusy === true || expert.isBusy === "true") {
                Alert.alert(
                    "Host is Engaged ⏳", 
                    `${expert.name || "This host"} is currently assisting another user. Please try again in a few minutes.`
                );
                return;
            }

            // 🔥 3. FIRE UP THE 12s RINGING PROTOCOL 🔥
            const newCallId = `call_${Date.now()}_${expert.id}`; 
            
            setCurrentExpert(expert);
            setCurrentCallId(newCallId);
            setRingTimer(20); // Reset to 20 seconds for each new call
            setRingModalVisible(true);

            // 🔥 SATTI FIX: Robust caller and expert fallbacks during setDoc 🔥
            const cImage = userData?.profilePic || user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData?.name || userData?.userName || user?.displayName || 'User')}&background=0F172A&color=fff&bold=true`;
            const cName = userData?.name || userData?.userName || user?.displayName || "User";

            const eImage = expert?.profilePic || expert?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(expert?.name || expert?.userName || "Host")}&background=1E293B&color=fff&bold=true`;
            const eName = expert?.name || expert?.userName || "Host";

            await setDoc(doc(db, "calls", newCallId), {
                callerId: user?.uid || "UNKNOWN_USER",
                callerImage: cImage,
                callerName: cName,
                expertId: expert?.id || "UNKNOWN_EXPERT",
                expertImage: eImage,
                expertName: eName,
                isFreeTrial: hasTrialMins,
                status: 'calling', // Changed from 'ringing' to 'calling' for global sync
                createdAt: serverTimestamp(),
                totalDiamonds: 0,
                expertEarnings: 0,
                finalDuration: 0
            });

        } catch (error) {
            console.error("Routing Error: ", error);
            Alert.alert("Connection Error", "Unable to connect at the moment. Try again.");
            setRingModalVisible(false);
        }
    };

    // ==========================================
    // 🔥 CORE GHOST FILTER APPLICATION (DIRECT SYNC) 🔥
    // ==========================================
    const currentBlocked = userData?.blockedUsers || [];
    const safeExperts = experts.filter((expert) => {
        const hostBlockedUsers = expert.blockedUsers || [];
        const notBlockedByMe = !currentBlocked.includes(expert.id);
        const notBlockedByHost = !hostBlockedUsers.includes(user?.uid);
        return notBlockedByMe && notBlockedByHost;
    });

    // 🆕 SEARCH FILTER: host name (name / userName) type panna match aagura hosts mattum varum
    const trimmedQuery = searchQuery.trim().toLowerCase();
    const displayExperts = trimmedQuery
        ? safeExperts.filter((expert) => {
            const nm = String(expert.name || expert.userName || '').toLowerCase();
            return nm.includes(trimmedQuery);
        })
        : safeExperts;

    // 🆕 Search icon toggle (open / close)
    const toggleSearch = () => {
        if (searchOpen) {
            Keyboard.dismiss();
            setSearchQuery('');
            setSearchOpen(false);
        } else {
            setSearchOpen(true);
        }
    };

    // 🔥 REPORT & BLOCK ACTION HANDLER 🔥
    const openReportModal = (expert: any) => {
        if (!expert) return;
        setExpertToReport(expert);
        setReportModalVisible(true);
    };

    const submitReport = async (reason: string) => {
        if (!user || !expertToReport) return;
        try {
            // 1. Alert to Admin Collection
            await addDoc(collection(db, 'admin_alerts'), {
                reportedBy: user.uid,
                reportedUserId: expertToReport.id,
                reportedUserName: expertToReport.name || 'Host',
                reason: reason,
                type: 'feed_video_report',
                status: 'pending',
                timestamp: serverTimestamp()
            });

            // 2. Block the user in current user's document instantly
            await updateDoc(doc(db, 'users', user.uid), {
                blockedUsers: arrayUnion(expertToReport.id)
            });

            setReportModalVisible(false);
            setExpertToReport(null);
            Alert.alert("Restricted & Reported", "This host has been removed from your feed and reported to the Admin team.");
        } catch (error) {
            Alert.alert("Error", "Could not submit report.");
        }
    };

    // 🆕 DERIVED ANIMATION VALUES FOR MODALS / HEADER
    const orbitRotate = mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const orbitRotateRev = mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
    const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
    const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 0] });
    const ringProgress = `${Math.max(0, Math.min(100, (ringTimer / 20) * 100))}%`;
    const incomingProgress = `${Math.max(0, Math.min(100, (incomingTimer / 20) * 100))}%`;
    const reportIcons: any[] = ['eye-off', 'person-remove', 'alert-circle', 'document-text', 'flag'];

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            <FlatList
                ref={flatListRef}
                data={displayExperts}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                    <ExpertVideoCard 
                        expert={item} 
                        isActive={index === activeIndex} 
                        isScreenFocused={isScreenFocused} 
                        onConnect={() => handleConnect(item)}
                        onProfile={() => router.push({ pathname: '/expert-detail', params: { id: item.id } } as any)}
                        index={index}
                        total={displayExperts.length}
                        loop={mainLoop}
                        glow={glowAnim}
                        shine={shineAnim}
                    />
                )}
                pagingEnabled 
                showsVerticalScrollIndicator={false}
                snapToAlignment="start"
                decelerationRate="fast"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                windowSize={3} 
                initialNumToRender={1}
                maxToRenderPerBatch={2}
                getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
                keyboardShouldPersistTaps="handled"
            />

            {/* 🆕 EMPTY FEED STATE */}
            {displayExperts.length === 0 && (
                <View pointerEvents="none" style={styles.emptyFeed}>
                    <Animated.View style={[styles.emptyFeedRing, { transform: [{ rotate: orbitRotate }] }]} />
                    <MaterialCommunityIcons name="video-off-outline" size={46} color="#38BDF8" />
                    <Text style={styles.emptyFeedText}>{trimmedQuery ? 'NO HOSTS FOUND' : 'NO HOSTS AVAILABLE'}</Text>
                </View>
            )}

            <View style={styles.topHeader}>
                {/* 🔥 SATTI FIX: Header Text Overflow Fix (numberOfLines & adjustsFontSizeToFit) 🔥 */}
                <View style={styles.titlePill}>
                    <LinearGradient colors={['#38BDF8', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.titleIcon}>
                        <MaterialCommunityIcons name="lightning-bolt" size={12} color="#FFF" />
                    </LinearGradient>
                    <Text style={styles.headerTitle} numberOfLines={1} adjustsFontSizeToFit>FEATURED HOSTS</Text>
                </View>
                
                {/* 🔥 NEW: Header Right Actions with Restrict & Search side-by-side 🔥 */}
                <View style={styles.headerRightControls}>
                    {displayExperts.length > 0 && displayExperts[activeIndex] && (
                        <TouchableOpacity style={styles.reportBtnGlobal} onPress={() => openReportModal(displayExperts[activeIndex])} activeOpacity={0.8}>
                            <View style={styles.reportIconWrap}>
                                <Animated.View style={[styles.reportHalo, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
                                <Ionicons name="shield-checkmark" size={16} color="#EF4444" />
                            </View>
                            <Text style={styles.reportBtnText}>RESTRICT</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={[styles.searchBtn, searchOpen && styles.searchBtnActive]} onPress={toggleSearch} activeOpacity={0.8}>
                        <Ionicons name={searchOpen ? "close" : "search"} size={24} color={searchOpen ? "#38BDF8" : "#FFF"} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* 🆕 SEARCH BAR (search icon click panna open aagum, host name type pannalam) */}
            {searchOpen && (
                <View style={styles.searchBarWrap}>
                    <BlurView intensity={70} tint="dark" style={styles.searchBarInner}>
                        <Ionicons name="search" size={18} color="#38BDF8" />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search host name..."
                            placeholderTextColor="#94A3B8"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            autoFocus
                            autoCorrect={false}
                            autoCapitalize="none"
                            returnKeyType="search"
                            onSubmitEditing={() => Keyboard.dismiss()}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn} activeOpacity={0.7}>
                                <Ionicons name="close-circle" size={20} color="#94A3B8" />
                            </TouchableOpacity>
                        )}
                    </BlurView>
                </View>
            )}

            {/* 🔥 NEW: BLOCK & REPORT MODAL 🔥 */}
            <Modal visible={reportModalVisible} transparent animationType="fade">
                <BlurView intensity={90} tint="dark" style={styles.reportOverlay}>
                    <View style={styles.reportCard}>
                        {/* 🆕 neon red top line */}
                        <LinearGradient colors={['#EF4444', '#F59E0B', '#EF4444']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.reportTopLine} />
                        <View style={styles.reportHeader}>
                            <View style={styles.reportWarnWrap}>
                                <Animated.View style={[styles.reportWarnHalo, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
                                <Ionicons name="warning" size={28} color="#EF4444" />
                            </View>
                            <Text style={styles.reportTitle}>RESTRICT & REPORT</Text>
                        </View>
                        <Text style={styles.reportSub}>Why are you reporting {expertToReport?.name || 'this host'}?</Text>

                        {/* 🔥 SATTI UPDATE: SPOTLIGHT / VIDEO FEED SPECIFIC REPORT REASONS 🔥 */}
                        {[
                            'Inappropriate Video Content / Nudity',
                            'Fake Profile / Impersonation',
                            'Misleading Services / False Claims',
                            'Offensive Profile Details / Bio',
                            'Other Violation'
                        ].map((reason, idx) => (
                            <TouchableOpacity key={idx} style={styles.reasonBtn} onPress={() => submitReport(reason)} activeOpacity={0.7}>
                                <View style={styles.reasonIconBubble}>
                                    <Ionicons name={reportIcons[idx]} size={16} color="#EF4444" />
                                </View>
                                <Text style={styles.reasonBtnText}>{reason}</Text>
                                <Ionicons name="chevron-forward" size={16} color="#64748B" />
                            </TouchableOpacity>
                        ))}

                        <TouchableOpacity style={styles.cancelReportBtn} onPress={() => setReportModalVisible(false)}>
                            <Text style={styles.cancelReportText}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </Modal>

            {/* 🔥 SATTI FIX: EXPERT INCOMING CALL OVERLAY 🔥 */}
            {incomingCall && (
                <Modal visible={!!incomingCall} transparent animationType="fade">
                    <View style={styles.callOverlayMass}>
                        {/* 🆕 caller photo as blurred backdrop */}
                        {incomingCall.callerImage ? (
                            <Image source={{ uri: incomingCall.callerImage }} blurRadius={30} style={styles.callBackdrop} />
                        ) : null}
                        <LinearGradient pointerEvents="none" colors={['rgba(2,6,23,0.55)', 'rgba(2,6,23,0.92)']} style={StyleSheet.absoluteFill} />

                        <Animated.View style={[styles.callCardWrapper, { transform: [{ scale: incomingPulse }] }]}>
                            <BlurView intensity={90} tint="dark" style={styles.callCardMass}>
                                <View style={styles.incomingChip}>
                                    <View style={styles.incomingChipDot} />
                                    <Text style={styles.callPulseText}>INCOMING CALL</Text>
                                </View>
                                
                                <View style={styles.callerAvatarStage}>
                                    <RippleRings color="#00F2FE" size={90} />
                                    <Animated.View style={[styles.callerOrbit, { transform: [{ rotate: orbitRotate }] }]} />
                                    <View style={styles.callerAvatarRing}>
                                        {incomingCall.callerImage ? (
                                            <Image source={{ uri: incomingCall.callerImage }} style={styles.callerCallAvatar} />
                                        ) : (
                                            <View style={styles.callerCallInitials}>
                                                <Text style={styles.callerCallInitialsText}>
                                                    {incomingCall.userName ? incomingCall.userName.charAt(0).toUpperCase() : "U"}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>

                                <Text style={styles.callInfoTextMass} numberOfLines={1}>{incomingCall.userName?.toUpperCase() || "USER"}</Text>
                                
                                <Text style={styles.ringTimerExpert}>00:{incomingTimer.toString().padStart(2, '0')}</Text>

                                {/* 🆕 countdown bar */}
                                <View style={styles.timerTrack}>
                                    <LinearGradient colors={['#EF4444', '#F59E0B']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.timerFill, { width: incomingProgress as any }]} />
                                </View>

                                <View style={styles.callActionsMass}>
                                    <TouchableOpacity onPress={() => handleIncomingCallAction('rejected')} activeOpacity={0.8} style={styles.actionBtnHitbox}>
                                        <LinearGradient colors={['#F43F5E', '#9F1239']} style={[styles.callBtnMass, { shadowColor: '#F43F5E' }]}>
                                            <Ionicons name="close" size={28} color="#FFF" />
                                        </LinearGradient>
                                        <Text style={styles.callBtnLabel}>DECLINE</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity onPress={() => handleIncomingCallAction('accepted')} activeOpacity={0.8} style={styles.actionBtnHitbox}>
                                        <View style={styles.acceptWrap}>
                                            <Animated.View style={[styles.acceptHalo, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
                                            <LinearGradient colors={['#10B981', '#059669']} style={[styles.callBtnMass, { shadowColor: '#10B981' }]}>
                                                <Ionicons name="videocam" size={28} color="#FFF" />
                                            </LinearGradient>
                                        </View>
                                        <Text style={styles.callBtnLabel}>ACCEPT</Text>
                                    </TouchableOpacity>
                                </View>
                            </BlurView>
                        </Animated.View>
                    </View>
                </Modal>
            )}

            {/* 🔥 SATTI FIX: USER RINGING UI OVERLAY 🔥 */}
            <Modal visible={ringModalVisible} transparent animationType="fade">
                <View style={styles.ringingOverlay}>
                    {/* 🆕 expert photo as blurred backdrop */}
                    <Image 
                        source={{ uri: currentExpert?.profilePic || currentExpert?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentExpert?.name || 'Host')}&background=0F172A&color=fff` }} 
                        blurRadius={30}
                        style={styles.callBackdrop}
                    />
                    <LinearGradient pointerEvents="none" colors={['rgba(2,6,23,0.6)', 'rgba(2,6,23,0.95)']} style={StyleSheet.absoluteFill} />
                    <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />

                    <View style={styles.ringingContent}>
                        <View style={styles.uplinkChip}>
                            <View style={styles.uplinkDot} />
                            <Text style={styles.ringConnectingText}>REQUESTING UPLINK...</Text>
                        </View>
                        
                        <View style={styles.ringAvatarWrapper}>
                            <RippleRings color="#38BDF8" size={120} />
                            <Animated.View style={[styles.ringPulseGlow, { transform: [{ scale: pulseAnim }] }]} />
                            <Animated.View style={[styles.ringOrbit, { transform: [{ rotate: orbitRotate }] }]} />
                            <Animated.View style={[styles.ringOrbitInner, { transform: [{ rotate: orbitRotateRev }] }]} />
                            <Image 
                                source={{ uri: currentExpert?.profilePic || currentExpert?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentExpert?.name || 'Host')}&background=0F172A&color=fff` }} 
                                style={styles.ringAvatar} 
                            />
                        </View>

                        <Text style={styles.ringExpertName}>{currentExpert?.name || "Host"}</Text>
                        <Text style={styles.ringTimer}>00:{ringTimer.toString().padStart(2, '0')}</Text>

                        {/* 🆕 countdown bar */}
                        <View style={styles.timerTrack}>
                            <LinearGradient colors={['#38BDF8', '#6366F1']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.timerFill, { width: ringProgress as any }]} />
                        </View>

                        <TouchableOpacity style={styles.cancelCallBtn} onPress={cancelCall} activeOpacity={0.8}>
                            <MaterialCommunityIcons name="phone-hangup" size={32} color="#FFF" />
                        </TouchableOpacity>
                        <Text style={styles.cancelLabel}>CANCEL</Text>
                    </View>
                </View>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#000',
    },
    topHeader: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    // 🆕 glass title pill (🆕 chinna size)
    titlePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingLeft: 5,
        paddingRight: 10,
        paddingVertical: 4,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        flexShrink: 1,
    },
    titleIcon: { width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center' },
    // 🔥 SATTI FIX: Reduced fontSize & letterSpacing to avoid overflow 🔥
    headerTitle: {
        color: '#FFF',
        fontSize: 12, // 🆕 Reduced from 16 (chinna title)
        fontWeight: '900',
        letterSpacing: 1, // 🆕 Reduced from 1.5
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowRadius: 10,
        flexShrink: 1, // Ensure it shrinks if needed
    },
    // 🔥 NEW STYLES: Header Right Controls (Search + Restrict side-by-side) 🔥
    headerRightControls: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reportBtnGlobal: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.4)',
        elevation: 5,
        marginRight: 10, // Added margin right to keep space before search button
    },
    reportIconWrap: { width: 20, height: 20, justifyContent: 'center', alignItems: 'center' },
    reportHalo: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: 'rgba(239,68,68,0.6)' },
    reportBtnText: {
        color: '#EF4444',
        fontWeight: 'bold',
        marginLeft: 6,
        fontSize: 10,
        letterSpacing: 1
    },
    searchBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    // 🆕 search open irukkum pothu icon button highlight
    searchBtnActive: {
        borderColor: 'rgba(56,189,248,0.7)',
        backgroundColor: 'rgba(56,189,248,0.15)',
    },
    // 🆕 SEARCH BAR (header keela)
    searchBarWrap: {
        position: 'absolute',
        top: 106,
        left: 20,
        right: 20,
        zIndex: 11,
    },
    searchBarInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 48,
        paddingHorizontal: 16,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: 'rgba(2,6,23,0.7)',
        borderWidth: 1,
        borderColor: 'rgba(56,189,248,0.5)',
    },
    searchInput: {
        flex: 1,
        color: '#FFF',
        fontSize: 15,
        fontWeight: '700',
        height: 48,
        paddingVertical: 0,
    },
    searchClearBtn: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardContainer: {
        width: width,
        height: height, 
        position: 'relative',
        backgroundColor: '#020617',
    },
    video: {
        ...StyleSheet.absoluteFillObject,
    },
    topVignette: { position: 'absolute', top: 0, left: 0, right: 0, height: 180 },

    // 🆕 VERTICAL LEFT-BOTTOM RAIL
    sideRail: { position: 'absolute', left: 14, bottom: RAIL_BOTTOM, alignItems: 'center', gap: 16, zIndex: 5 },
    railAvatarWrap: { width: 78, height: 78, justifyContent: 'center', alignItems: 'center' },
    railRing: { position: 'absolute', width: 78, height: 78, borderRadius: 39, borderWidth: 1.5, borderStyle: 'dashed' },
    railRingInner: { position: 'absolute', width: 68, height: 68, borderRadius: 34, borderWidth: 1, borderStyle: 'dotted' },
    railAvatarCore: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, padding: 2, backgroundColor: '#000', shadowOpacity: 0.9, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 10 },
    railAvatarImg: { width: '100%', height: '100%', borderRadius: 26 },
    railLevelChip: { position: 'absolute', bottom: 0, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
    railLevelText: { color: '#FFF', fontSize: 9, fontWeight: '900', textShadowColor: '#000', textShadowRadius: 3 },
    railStat: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', gap: 2 },
    railStatText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
    progressWrap: { alignItems: 'center', gap: 6 },
    progressTrack: { width: 4, height: 70, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden', justifyContent: 'flex-end' },
    progressFill: { width: '100%', borderRadius: 2 },
    progressText: { color: 'rgba(255,255,255,0.7)', fontSize: 9, fontWeight: '900' },

    // 🔥 SATTI FIX: Bottom UI Pushed Down (height lowered & padding reduced) 🔥
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.5, // Reduced from 0.55 so it covers less of the top video
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingBottom: 150, // Dropped from 145 to 95 to move content much lower to the bottom edge
    },
    contentWrapper: {
        gap: 15,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    expertName: {
        fontSize: 32,
        fontWeight: '900',
        marginBottom: 8,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    tierBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    tierText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowRadius: 3,
    },
    skillBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    skillBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#10B981',
    },
    liveDotWrap: { width: 12, height: 12, justifyContent: 'center', alignItems: 'center', marginRight: 2 },
    liveDotHalo: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
    },
    liveText: {
        color: '#10B981',
        fontSize: 10,
        fontWeight: 'bold',
    },
    bioGlass: {
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderRadius: 16,
        borderLeftWidth: 3,
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    bioText: {
        color: 'rgba(255,255,255,0.85)',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    connectBtn: {
        width: '100%',
        height: 60,
        borderRadius: 30,
        marginTop: 10,
        overflow: 'hidden',
        elevation: 10,
        shadowOpacity: 0.5,
        shadowRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    btnGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 12,
    },
    btnIconWrap: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
    btnIconHalo: { position: 'absolute', width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,255,255,0.5)' },
    shineBar: { position: 'absolute', top: -30, bottom: -30, width: 50, backgroundColor: 'rgba(255,255,255,0.25)' },
    btnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
        flexShrink: 1,
        textShadowColor: 'rgba(0,0,0,0.4)',
        textShadowRadius: 4,
    },
    btnDivider: {
        color: '#FFF',
        fontSize: 20,
        opacity: 0.4,
        marginHorizontal: 2
    },
    pricePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4
    },
    pricePillText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
    },

    // 🆕 EMPTY FEED
    emptyFeed: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    emptyFeedRing: { position: 'absolute', width: 130, height: 130, borderRadius: 65, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(56,189,248,0.6)', top: '50%', marginTop: -85 },
    emptyFeedText: { color: '#94A3B8', fontSize: 12, fontWeight: '900', letterSpacing: 3, marginTop: 14 },

    // 🔥 NEW STYLES: REPORT MODAL 🔥
    reportOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
    reportCard: { width: '85%', backgroundColor: '#0F172A', borderRadius: 25, padding: 25, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.4)', elevation: 15, overflow: 'hidden', shadowColor: '#EF4444', shadowOpacity: 0.5, shadowRadius: 20 },
    reportTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
    reportHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    reportWarnWrap: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    reportWarnHalo: { position: 'absolute', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(239,68,68,0.45)' },
    reportTitle: { color: '#EF4444', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
    reportSub: { color: '#94A3B8', fontSize: 12, marginBottom: 20 },
    reasonBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12, marginBottom: 10, gap: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
    reasonIconBubble: { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(239,68,68,0.12)', justifyContent: 'center', alignItems: 'center' },
    reasonBtnText: { color: '#E2E8F0', fontSize: 14, fontWeight: '600', flex: 1 },
    cancelReportBtn: { marginTop: 10, padding: 15, alignItems: 'center' },
    cancelReportText: { color: '#64748B', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },

    // 🔥 SATTI FIX: RINGING UI STYLES (USER OUTGOING) 🔥
    ringingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    callBackdrop: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
    ringingContent: { alignItems: 'center', justifyContent: 'center', width: '100%' },
    uplinkChip: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(56,189,248,0.12)', borderWidth: 1, borderColor: 'rgba(56,189,248,0.4)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginBottom: 50 },
    uplinkDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#38BDF8' },
    ringConnectingText: { color: '#38BDF8', fontSize: 13, fontWeight: '900', letterSpacing: 3 },
    ringAvatarWrapper: { width: 240, height: 240, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    ringPulseGlow: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 2, borderColor: '#38BDF8', opacity: 0.4 },
    ringOrbit: { position: 'absolute', width: 160, height: 160, borderRadius: 80, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(56,189,248,0.8)' },
    ringOrbitInner: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1, borderStyle: 'dotted', borderColor: 'rgba(99,102,241,0.9)' },
    ringAvatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#38BDF8', zIndex: 10 },
    ringExpertName: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
    ringTimer: { color: '#94A3B8', fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 14 },
    timerTrack: { width: 180, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.12)', overflow: 'hidden', marginBottom: 40 },
    timerFill: { height: '100%', borderRadius: 3 },
    cancelCallBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', elevation: 15, shadowColor: '#EF4444', shadowOpacity: 0.6, shadowRadius: 15, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
    cancelLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 10 },

    // 🔥 SATTI FIX: EXPERT INCOMING CALL STYLES 🔥
    callOverlayMass: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', zIndex: 99999, backgroundColor: 'rgba(2, 6, 23, 0.8)' },
    callCardWrapper: { width: '80%', borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.4)' },
    callCardMass: { paddingVertical: 35, paddingHorizontal: 20, alignItems: 'center' },
    incomingChip: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 },
    incomingChipDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#00F2FE' },
    callPulseText: { color: '#00F2FE', fontSize: 11, fontWeight: '900', letterSpacing: 5 },
    callerAvatarStage: { width: 150, height: 150, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
    callerOrbit: { position: 'absolute', width: 110, height: 110, borderRadius: 55, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(0,242,254,0.8)' },
    callerAvatarRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#00F2FE', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A', elevation: 20, shadowColor: '#00F2FE', shadowRadius: 20, shadowOpacity: 0.6 },
    callerCallAvatar: { width: 82, height: 82, borderRadius: 41 },
    callerCallInitials: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
    callerCallInitialsText: { color: '#00F2FE', fontSize: 32, fontWeight: '900' },
    callInfoTextMass: { color: '#FFF', fontSize: 22, fontWeight: '900', marginBottom: 10 },
    ringTimerExpert: { color: '#EF4444', fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
    callActionsMass: { flexDirection: 'row', gap: 40, justifyContent: 'center' },
    actionBtnHitbox: { alignItems: 'center' },
    acceptWrap: { width: 65, height: 65, justifyContent: 'center', alignItems: 'center' },
    acceptHalo: { position: 'absolute', width: 65, height: 65, borderRadius: 33, backgroundColor: 'rgba(16,185,129,0.6)' },
    callBtnMass: { width: 65, height: 65, borderRadius: 32.5, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)', shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 10 },
    callBtnLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '900', marginTop: 10 }
});
