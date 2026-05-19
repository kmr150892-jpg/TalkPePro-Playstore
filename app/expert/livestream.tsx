import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
// 🔥 SATTI FIX: Added getDoc to fetch game status securely
import { addDoc, collection, doc, getDoc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
// 🔥 NEW: RTDB IMPORT FOR PRESENCE SYSTEM 🔥
import { getDatabase, onDisconnect, onValue, ref, set } from 'firebase/database';
import React, { useEffect, useRef, useState } from 'react';
// 🔥 FIXED: Added AppState to detect Force Close and update Firestore 🔥
import { Animated, AppState, Dimensions, Easing, FlatList, Image, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import createAgoraRtcEngine, {
    ChannelProfileType,
    ClientRoleType,
    IRtcEngine,
    LighteningContrastLevel,
    RtcTextureView, // 🔥 SATTI FIX: CHANGED TO TEXTURE VIEW FOR ANDROID BLACK SCREEN FIX
} from 'react-native-agora';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

// --- NEW: Security Import ---
import * as ScreenCapture from 'expo-screen-capture';
import GiftOverlay from '../../components/GiftOverlay';
import LiveGameSheet from '../../components/LiveGameSheet'; // ✅ REFLEX BLITZ ARENA

const { width, height } = Dimensions.get('window');
const AGORA_APP_ID = '718cedc3c47e44d1bfa4853d6ac6cd80';

// ✅ ACCURATE THEME & LEVEL CONFIG (L0 TO L10) - LOCKED COLORS
const getLevelConfig = (beans: number) => {
    if (beans >= 100000000) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'] as const, glow: '#F59E0B', next: 0, prev: 50000000, rate: 8000 };
    if (beans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'] as const, glow: '#EC4899', next: 100000000, prev: 30000000, rate: 7000 };
    if (beans >= 30000000) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'] as const, glow: '#8B5CF6', next: 50000000, prev: 10000000, rate: 5400 };
    if (beans >= 10000000) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'] as const, glow: '#3B82F6', next: 30000000, prev: 5000000, rate: 4800 };
    if (beans >= 5000000)  return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'] as const, glow: '#06B6D4', next: 10000000, prev: 3000000, rate: 4200 };
    if (beans >= 3000000)  return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'] as const, glow: '#10B981', next: 5000000, prev: 1000000, rate: 3600 };
    if (beans >= 1000000)  return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'] as const, glow: '#EAB308', next: 3000000, prev: 300000, rate: 3000 };
    if (beans >= 300000)   return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'] as const, glow: '#94A3B8', next: 1000000, prev: 100000, rate: 2400 };
    if (beans >= 100000)   return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'] as const, glow: 'transparent', next: 300000, prev: 30000, rate: 1800 };
    if (beans >= 30000)    return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'] as const, glow: 'transparent', next: 100000, prev: 0, rate: 1200 };
    return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'] as const, glow: 'transparent', next: 30000, prev: 0, rate: 1000 };
};

export default function LiveStreamScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const engine = useRef<IRtcEngine | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current; 
    const isNavigatingToCall = useRef(false); 
    
    // 🔥 SATTI FIX: Ref to prevent double triggering of AppState close logic
    const isAppClosing = useRef(false);

    // --- Existing States ---
    const [joined, setJoined] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isFrontCamera, setIsFrontCamera] = useState(true);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [viewerCount, setViewerCount] = useState(0);

    // --- Feature States ---
    const [seconds, setSeconds] = useState(0);
    const [showSummary, setShowSummary] = useState(false);
    const [earnings, setEarnings] = useState(0); 
    const [giftAlert, setGiftAlert] = useState<string | null>(null);
    const [isProEnabled, setIsProEnabled] = useState(false);
    const [pinnedMessage, setPinnedMessage] = useState<any>(null);
    const [guestUid, setGuestUid] = useState<number | null>(null);
    const [hostImage, setHostImage] = useState<string>(""); 
    const [hostName, setHostName] = useState<string>("");
    
    // ✅ Dynamic Level & Theme States
    const [hostLevel, setHostLevel] = useState<string>("BEGINNER");
    const [hostConfig, setHostConfig] = useState<any>(getLevelConfig(0));
    
    // ✅ New State for Active Viewers List
    const [activeViewers, setActiveViewers] = useState<any[]>([]);

    // --- Pro Settings State ---
    const [showProSettings, setShowProSettings] = useState(false);
    const [ProLevel, setProLevel] = useState({ light: 0.7, smooth: 0.8 });

    // Unique Live ID
    const [currentLiveId] = useState(params.liveId as string || `live_${auth.currentUser?.uid}_${Date.now()}`);

    // --- 🟢 NEW: Call Request State & Blocked Users ---
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
    
    // ✅ NEW: Active Gift State for Festival Animation
    const [activeGift, setActiveGift] = useState<any>(null);

    // 🔥 GAME FEATURE STATE (REFLEX BLITZ ARENA)
    const [gameVisible, setGameVisible] = useState(false);
    const [myWalletBalance, setMyWalletBalance] = useState(0);

    // 🔥 NEW: Total Beans Earned from Game in this Live Session (For Summary)
    const [gameBeansSummary, setGameBeansSummary] = useState(0);

    // 🔥 SATTI FIX: Added state to track Exact Current Session Beans (Gifts + Game Commission)
    const [sessionEarnedBeans, setSessionEarnedBeans] = useState(0);

    // 🔥 SATTI FIX: NEW DYNAMIC BORDER STYLE FOR FULL WIDTH HEADER 🔥
    const borderType1 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: hostConfig.colors[0],
        borderRightColor: hostConfig.colors[0],
        borderTopColor: hostConfig.colors[2] + '80',
        borderBottomColor: hostConfig.colors[2] + '80',
    };

    // 🔥 SATTI FIX: ADDED MISSING BORDERTYPE2 HERE 🔥
    const borderType2 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: hostConfig.colors[2],
        borderRightColor: hostConfig.colors[2],
        borderTopColor: hostConfig.colors[0] + '80',
        borderBottomColor: hostConfig.colors[0] + '80',
    };

    // 🔥 SATTI FIX: Room paths changed from 'global_games' to current session 'lives' collection 🔥
    const checkGameActive = async () => {
        try {
            const gameSnap = await getDoc(doc(db, "lives", currentLiveId, "games", "reflex_arena"));
            if (gameSnap.exists() && (gameSnap.data().status === 'PLAYING' || gameSnap.data().status === 'WAITING')) {
                return true;
            }
        } catch (e) { console.error("Game check error:", e); }
        return false;
    };

    // 🔥 SATTI FIX: NEW STRICT FUNCTION TO CANCEL GAME & WAIT FOR REFUND BEFORE ENDING LIVE 🔥
    const safeCancelGameForAudienceRefund = async () => {
        try {
            const roomRef = doc(db, "lives", currentLiveId, "games", "reflex_arena");
            const snap = await getDoc(roomRef);
            if (snap.exists()) {
                const data = snap.data();
                if (data.status === 'PLAYING' || data.status === 'WAITING') {
                    await updateDoc(roomRef, { status: 'CANCELLED' });
                    // ⏳ Give 1.5 seconds for Firebase to trigger audience refund locally before ending Live completely
                    await new Promise(resolve => setTimeout(resolve, 1500));
                }
            }
        } catch (e) { console.log("Refund Wait Error: ", e); }
    };

    const removePlayerFromReflex = async () => {
        if (!auth.currentUser) return;
        try {
            const roomRef = doc(db, "lives", currentLiveId, "games", "reflex_arena");
            const snap = await getDoc(roomRef);
            if (snap.exists()) {
                const data = snap.data();
                if (data.status === 'PLAYING' || data.status === 'WAITING') {
                    const updatedPlayers = data.players.filter((p: any) => p.id !== auth.currentUser?.uid);
                    await updateDoc(roomRef, { players: updatedPlayers });
                }
            }
        } catch (e) { console.log(e); }
    };

    // 🔥 STRICT FIX: APPSTATE LISTENER TO HANDLE FORCE CLOSE WAITING LOGIC 🔥
    useEffect(() => {
    if (!currentLiveId) return;
    
    const handleAppStateChange = async (nextAppState: string) => {
        if ((nextAppState === 'inactive' || nextAppState === 'background') && !isAppClosing.current) {
            isAppClosing.current = true;
            
            try {
                // 🔥 METHOD 1: Direct REST API Endpoint call via fetch (Bypasses thick JS SDK cycle)
                // Firestore document updating endpoint via REST
                const firestoreRestUrl = `https://firestore.googleapis.com/v1/projects/YOUR_PROJECT_ID/databases/(default)/documents/lives/${currentLiveId}?updateMask.fieldPaths=status`;
                
                fetch(firestoreRestUrl, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fields: { status: { stringValue: 'ended' } }
                    })
                }).catch(() => {});

                // 🔥 METHOD 2: Regular quick batch flush
                const batch = writeBatch(db);
                batch.update(doc(db, "lives", currentLiveId), { status: "ended", endTime: serverTimestamp() });
                if (auth.currentUser) {
                    batch.update(doc(db, "users", auth.currentUser.uid), { isLive: false });
                }
                await batch.commit();

            } catch (error) { 
                console.log("Force close cleanup log:", error); 
            }
        }
    };
    
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => { subscription.remove(); };
}, [currentLiveId]);

    useEffect(() => {
        const init = async () => {
            // --- 🔒 Security Start: Prevent Screen Capture ---
            if (Platform.OS !== 'web') {
                await ScreenCapture.preventScreenCaptureAsync();
            }

            const hostData = await fetchHostData(); 
            setupAgora(hostData); 
        };
        init();
        const unsubListeners = listenToStreamData();
        const timer = setInterval(() => setSeconds(s => s + 1), 1000);

        // Pulser for mass animations
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();

        // 🔥 1. FIRESTORE CLEANUP: GHOST ROOM KILLER 🔥
        const cleanupGhostRooms = async () => {
            if (!auth.currentUser) return;
            try {
                const q = query(collection(db, "lives"), where("hostId", "==", auth.currentUser.uid), where("status", "==", "live"));
                const querySnapshot = await getDocs(q);
                querySnapshot.forEach(async (roomDoc) => {
                    if (roomDoc.id !== currentLiveId) {
                        await updateDoc(doc(db, "lives", roomDoc.id), { status: "ended" });
                    }
                });
            } catch (error) {
                console.log("Ghost room cleanup error:", error);
            }
        };
        cleanupGhostRooms();

        // 🔥 2. RTDB PRESENCE: FORCE CLOSE DETECTOR 🔥
        const rtdb = getDatabase();
        const connectedRef = ref(rtdb, ".info/connected");
        const livePresenceRef = ref(rtdb, `presence_lives/${currentLiveId}`);
        // 🔥 SATTI FIX: App force close aana odane game auto-cancel aaga hook add paniten
        const gamePresenceRef = ref(rtdb, `lives/${currentLiveId}/games/reflex_arena/status`);

        const unsubPresence = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                onDisconnect(livePresenceRef).set("ended").then(() => {
                    set(livePresenceRef, "active");
                });
                
                // 🔥 SATTI FIX: Disconnect aanal game CANCELLED nu marum
                onDisconnect(gamePresenceRef).set("CANCELLED");
            }
        });

        // --- 🛡️ UPDATED: Listen for incoming calls with GHOST CALL FILTER ---
        const callQuery = query(
            collection(db, "calls"),
            where("expertId", "==", auth.currentUser?.uid || ""),
            where("status", "in", ["ringing", "pending", "Discover_dialing"]) 
        );

        const unsubCalls = onSnapshot(callQuery, async (snap) => {
            if (!snap.empty) {
                // 🔥 THE FIX: Filter out ghost/old calls stuck in database
                let validDocSnap = null;
                
                for (const docSnap of snap.docs) {
                    const data = docSnap.data() as any;
                    const now = Date.now();
                    const callTime = data.createdAt?.toMillis ? data.createdAt.toMillis() : now;
                    
                    if (now - callTime <= 30000) { // Call must be less than 30 seconds old
                        validDocSnap = docSnap;
                        break; // Found a valid fresh ringing call
                    } else {
                        // Auto-clean old ghost calls to 'missed' so they never bother again
                        updateDoc(doc(db, "calls", docSnap.id), { status: 'missed' }).catch(()=>{});
                    }
                }

                if (!validDocSnap) {
                    setIncomingCall(null);
                    return;
                }

                const data = validDocSnap.data() as any;
                const currentUserId = data.userId || data.callerId; 

                const userRef = doc(db, "users", auth.currentUser?.uid || "");
                const expertSnap = await getDoc(userRef);
                const myBlockedList = expertSnap.data()?.blockedUsers || [];

                if (myBlockedList.includes(currentUserId)) {
                    await updateDoc(doc(db, "calls", validDocSnap.id), { status: 'rejected' });
                    return; 
                }

                // ✅ FORCE FETCH ACTUAL NAME & IMAGE FOR ULTRA PREMIUM MODAL
                let callerPic = null;
                let fetchedName = data.userName || data.callerName || "CLIENT";

                if(currentUserId) {
                    const callerDoc = await getDoc(doc(db, "users", currentUserId));
                    if(callerDoc.exists()){
                        const cData = callerDoc.data();
                        callerPic = cData.profilePic || cData.photoURL || null;
                        fetchedName = cData.name || cData.userName || cData.displayName || fetchedName;
                    }
                }
                setIncomingCall({ id: validDocSnap.id, ...data, callerId: currentUserId, callerImage: callerPic, userName: fetchedName });
            } else {
                setIncomingCall(null);
            }
        });

        let unsubWallet = () => {};
        if (auth.currentUser) {
            unsubWallet = onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
                if (docSnap.exists()) {
                    setMyWalletBalance(docSnap.data().walletBalance || 0);
                }
            });
        }

        return () => {
            // --- 🔓 Security End: Allow Screen Capture ---
            if (Platform.OS !== 'web') {
                ScreenCapture.allowScreenCaptureAsync();
            }

            clearInterval(timer);
            unsubListeners(); 
            unsubCalls();
            unsubWallet();
            
            unsubPresence();
            set(livePresenceRef, "ended"); // Normal back button cleanup
            set(gamePresenceRef, "CANCELLED"); // 🔥 SATTI FIX: Cleanup on unmount

            // 🔥 SATTI FIX: Remove player from Reflex if they unmount
            removePlayerFromReflex();

            // 🔥 SATTI FIX: GHOST LIVE ROOM KILLED ON EXIT 🔥
            // Forcefully update Firestore so room doesn't stay 'live' when host completely unmounts
            if (currentLiveId) {
                updateDoc(doc(db, 'lives', currentLiveId), {
                    status: 'ended',
                    endedAt: serverTimestamp()
                }).catch(e => console.log("Live close error", e));
            }

            if (!isNavigatingToCall.current) {
                leaveChannel();
            }
        };
    }, []);

    const fetchHostData = async () => {
        if (!auth.currentUser) return { name: "Consultant", image: "", levelTitle: "BEGINNER", userPrice: 0 };
        const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userSnap.exists()) {
            const userData = userSnap.data();
            let name = userData.name || auth.currentUser.displayName || "Consultant";
            if (name === "ARUVI MULTIVERSE") {
                name = "Aruvi";
            }
            const img = userData.profilePic || userData.photoURL || ""; 
            const beans = userData.totalBeansEarned || 0;
            const config = getLevelConfig(beans); 
            const price = userData.userPrice || 0;
            
            setHostName(name);
            setHostImage(img);
            setHostLevel(config.label); 
            setHostConfig(config);
            return { name, image: img, levelTitle: config.label, userPrice: price };
        }
        return { name: "Consultant", image: "", levelTitle: "BEGINNER", userPrice: 0 };
    };

    const setupAgora = async (hostData: { name: string, image: string, levelTitle: string, userPrice: number }) => {
        try {
            if (engine.current) return; 

            engine.current = createAgoraRtcEngine();
            const rtcEngine = engine.current;
            rtcEngine.initialize({ appId: AGORA_APP_ID });
            rtcEngine.enableVideo();
            rtcEngine.startPreview();

            rtcEngine.registerEventHandler({
                onJoinChannelSuccess: () => {
                    setJoined(true);
                    updateLiveStatus('live', hostData.name, hostData.image, hostData.levelTitle, hostData.userPrice); 
                },
                onUserJoined: (connection, uid) => {
                    setGuestUid(uid);
                },
                onUserOffline: () => {
                    setGuestUid(null);
                }
            });

            rtcEngine.joinChannel('', currentLiveId, 0, {
                clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
            });
        } catch (e) { console.error(e); }
    };

    // 🔥 CRITICAL FIX: handleCallAction Logic 
    const handleCallAction = async (action: 'accepted' | 'rejected') => {
        if (!incomingCall || !auth.currentUser) return; 
        
        try {
            if (action === 'accepted') {
                isNavigatingToCall.current = true; // Prevents Agora from unmounting in useEffect cleanup
                
                await updateDoc(doc(db, "lives", currentLiveId), { 
                    status: 'ended',
                    endTime: serverTimestamp() 
                });

                await updateDoc(doc(db, "users", auth.currentUser.uid), { isLive: false, isBusy: true });

                const callRef = doc(db, "calls", incomingCall.id);
                await updateDoc(callRef, { 
                    status: 'accepted',
                    expertName: hostName || "Consultant", // 🔥 SATTI FIX: NAME MAP
                    expertImage: hostImage || "",     // 🔥 SATTI FIX: IMAGE MAP
                    callerName: incomingCall.userName || "Client",
                    expertId: auth.currentUser.uid,
                    acceptedAt: serverTimestamp()
                });
                
                const batch = writeBatch(db);
                const viewersSnap = await getDocs(collection(db, "lives", currentLiveId, "activeViewers"));
                viewersSnap.forEach((vDoc) => batch.delete(vDoc.ref));
                await batch.commit();

                if (engine.current) {
                    engine.current.stopPreview();
                    engine.current.leaveChannel();
                    engine.current.release();
                    engine.current = null;
                }

                router.replace({
                    pathname: "/videocall",
                    params: { 
                        callId: incomingCall.id,
                        expertId: auth.currentUser.uid,
                        expertName: hostName || "Consultant", // 🔥 SATTI FIX: EXPERT PARAMS
                        expertImage: hostImage || "",     // 🔥 SATTI FIX: EXPERT PARAMS
                        callerName: incomingCall.userName || "Client",
                        callerId: incomingCall.callerId, 
                        role: 'expert'
                    }
                });
            } else {
                // 🔥 REJECT LOGIC: Only update call status to rejected, Do not touch Agora or leave Live
                await updateDoc(doc(db, "calls", incomingCall.id), { status: 'rejected' });
                setIncomingCall(null);
            }
        } catch (error) {
            console.error("Call Action Error:", error);
        }
    };

    const listenToStreamData = () => {
        const q = query(collection(db, "lives", currentLiveId, "messages"), orderBy("timestamp", "desc"));
        const unsubChat = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });

        const unsubDoc = onSnapshot(doc(db, "lives", currentLiveId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setViewerCount(data.viewerCount || 0);
                setPinnedMessage(data.pinnedMessage || null);
                // ✅ Update game beans summary for real-time tracking in host view
                setGameBeansSummary(data.gameBeansCollected || 0);
                
                // 🔥 SATTI FIX: Track the exact session earning for accurate Summary 🔥
                setSessionEarnedBeans(data.earnedBeans || 0);
            }
        });

        const unsubHost = onSnapshot(doc(db, "users", auth.currentUser?.uid || ""), (snap) => {
            if(snap.exists()) {
                const data = snap.data();
                const beans = data.totalBeansEarned || 0;
                const config = getLevelConfig(beans);
                setHostConfig(config);
                setHostLevel(config.label);
            }
        });

        const unsubGifts = onSnapshot(query(collection(db, "lives", currentLiveId, "gifts"), orderBy("timestamp", "desc")), async (snap) => {
            snap.docChanges().forEach(async (change) => {
                if (change.type === "added") {
                    const gift = change.doc.data();
                    setActiveGift(gift); 
                    
                    const diamondAmount = gift.amount || 0;
                    setEarnings(prev => prev + diamondAmount);

                    if (auth.currentUser) {
                        const beanAmount = Math.floor(diamondAmount / 2);
                        const userRef = doc(db, "users", auth.currentUser.uid);
                        
                        const expertSnap = await getDoc(userRef);
                        if (expertSnap.exists()) {
                            const eData = expertSnap.data();
                            const today = new Date().toISOString().split('T')[0];
                            const isNewDay = eData.lastBonusDate !== today;
                            
                            let currentTopVip = eData.topVipSupporter || { name: 'None', amount: 0, date: '' };
                            const senderName = gift.senderName || 'Premium Client';
                            if (isNewDay || diamondAmount > currentTopVip.amount) {
                                 currentTopVip = { name: senderName, amount: diamondAmount, date: today };
                            }

                            const updatedTodayBeans = isNewDay ? beanAmount : (Number(eData.todayBeans) || 0) + beanAmount;
                            let achievedMilestone = "0 / 100K";
                            if (updatedTodayBeans >= 500000) achievedMilestone = "ELITE (500K)";
                            else if (updatedTodayBeans >= 300000) achievedMilestone = "PRO (300K)";
                            else if (updatedTodayBeans >= 100000) achievedMilestone = "STARTER (100K)";

                            await updateDoc(userRef, {
                                totalBeansEarned: increment(beanAmount),
                                walletBalance: increment(beanAmount),
                                beans: increment(beanAmount),
                                todayBeans: isNewDay ? beanAmount : increment(beanAmount),
                                topVipSupporter: currentTopVip,
                                currentDailyMilestone: achievedMilestone,
                                lastBonusDate: today,
                                totalDiamondsReceived: increment(diamondAmount)
                            });

                            // 🔥 SATTI FIX: Current session document la exact gift tracking
                            await updateDoc(doc(db, "lives", currentLiveId), {
                                earnedBeans: increment(beanAmount)
                            }).catch(e => console.log(e));
                        }
                    }
                }
            });
        });

        const viewersQuery = query(collection(db, "lives", currentLiveId, "activeViewers"), orderBy("joinedAt", "desc"));
        const unsubViewers = onSnapshot(viewersQuery, (snapshot) => {
            const viewers = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    ...data,
                    photoURL: data.photoURL || data.profilePic || null 
                };
            });
            setActiveViewers(viewers);
        });

        return () => { unsubChat(); unsubDoc(); unsubGifts(); unsubViewers(); unsubHost(); };
    };

    const updateLiveStatus = async (status: string, manualName?: string, manualImage?: string, level?: string, price?: number) => {
        if (!auth.currentUser) return;

        let finalName = manualName || hostName || "Consultant";
        if (finalName === "ARUVI MULTIVERSE") {
            finalName = "Aruvi";
        }

        const updateData: any = {
            hostId: auth.currentUser.uid,
            hostName: finalName,
            hostImage: manualImage || hostImage || "",
            status: status,
            currentLiveId: currentLiveId,
        };

        if (status === 'live') {
            updateData.startedAt = serverTimestamp();
            updateData.viewerCount = 0;
            updateData.currentLevel = level || "BEGINNER";
            updateData.pricePerMin = price || 0;
            updateData.earnedBeans = 0; // 🔥 SATTI FIX: Live start aagum pothu session tracking initialize panren
            
            await updateDoc(doc(db, "users", auth.currentUser.uid), { isLive: true, isBusy: false }); // Made sure isBusy is false on start
        } 

        try {
            await setDoc(doc(db, "lives", currentLiveId), updateData, { merge: true });
        } catch (error) {
            console.error("Status Update Error:", error);
        }
    };

    const toggleMute = () => {
        engine.current?.muteLocalAudioStream(!isMuted);
        setIsMuted(!isMuted);
    };

    const switchCamera = () => {
        engine.current?.switchCamera();
        setIsFrontCamera(!isFrontCamera);
    };

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

    const sendMessage = async () => {
        if (!inputText.trim() || !auth.currentUser) return;
        await addDoc(collection(db, "lives", currentLiveId, "messages"), {
            text: inputText,
            senderName: hostName || "Consultant",
            senderId: auth.currentUser.uid,
            timestamp: serverTimestamp(),
            isHost: true
        });
        setInputText('');
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec < 10 ? '0' : ''}${sec}`;
    };

    // 🔥 SATTI FIX: MANUAL CLOSE WAITING LOGIC 🔥
    const leaveChannel = async () => {
        const isGamePlaying = await checkGameActive();
        
        if (isGamePlaying) {
            // 🔥 SATTI FIX: Muthalla game cancel aagi refund aanathukku apparam Live end aagum
            await safeCancelGameForAudienceRefund();
        } else {
            await removePlayerFromReflex(); 
        }
        
        await updateLiveStatus('ended');
        if (auth.currentUser) {
            await updateDoc(doc(db, "users", auth.currentUser.uid), { isLive: false });
        }
        
        try {
            const batch = writeBatch(db);
            const viewersSnap = await getDocs(collection(db, "lives", currentLiveId, "activeViewers"));
            viewersSnap.forEach((vDoc) => batch.delete(vDoc.ref));
            await batch.commit();
        } catch (e) { console.log("Cleanup error:", e); }

        setShowSummary(true);
    };

    const confirmExit = async () => {
        await removePlayerFromReflex(); // Safety cleanup
        await updateDoc(doc(db, "lives", currentLiveId), { viewerCount: 0 });
        if (engine.current) {
            engine.current.leaveChannel();
            engine.current.release();
            engine.current = null;
        }
        router.back();
    };

    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });

    return (
        <SafeAreaView style={styles.container}>
            <LinearGradient colors={hostConfig.colors[0] === '#ad57a6' ? ['#020617', '#0F172A'] : [`${hostConfig.colors[0]}15`, '#020617']} style={StyleSheet.absoluteFill} />
            <Animated.View style={[styles.shimmerOrb, { top: 100, right: -60, backgroundColor: hostConfig.colors[0], transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { bottom: 150, left: -60, backgroundColor: hostConfig.colors[2], transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            <View style={styles.videoContainer}>
                {joined && (
                    <View style={styles.videoGrid}>
                        {/* 🔥 SATTI FIX: Android-la SurfaceView use panna LinearGradient pinnadi video poyi full black aagidum. Athunala RtcTextureView ku mathitten! Ippo pakkaava theriyum! 🔥 */}
                        <RtcTextureView canvas={{ uid: 0 }} style={guestUid ? styles.halfVideo : styles.fullVideo} />
                        
                        {/* GUEST VIDEO */}
                        {guestUid && <RtcTextureView canvas={{ uid: guestUid }} style={styles.halfVideo} />}
                    </View>
                )}
                {!joined && <Text style={styles.loadingText}>Connecting...</Text>}
            </View>

            {/* 🔥 SATTI FIX: HEADER STYLING TO FULLY COVER ELEMENTS 🔥 */}
            <View style={styles.headerContainer}>
                <BlurView intensity={90} tint="dark" style={[styles.fullWidthCard, borderType1]}>
                    <View style={styles.topRow}>
                        <View style={styles.profileInfoSide}>
                            <View style={styles.avatarWrapper}>
                                {hostImage ? (
                                    <Image source={{ uri: hostImage }} style={[styles.hostAvatarMass, { borderColor: hostConfig.colors[0] }]} />
                                ) : (
                                    <View style={[styles.initialsCircleMass, { borderColor: hostConfig.colors[0] }]}>
                                        <Text style={styles.initialsText}>{hostName ? hostName.charAt(0).toUpperCase() : "E"}</Text>
                                    </View>
                                )}
                                <View style={[styles.crownBadgeMass, { borderColor: '#020617' }]}>
                                    <MaterialCommunityIcons name="crown" size={10} color="#FFF" />
                                </View>
                            </View>
                            <View style={styles.nameAndStats}>
                                {/* 🔥 SATTI FIX: Level Badge moved below the name 🔥 */}
                                <View style={{flexDirection: 'column', alignItems: 'flex-start', gap: 2}}>
                                    <Text style={styles.hostNameHeaderMass} numberOfLines={1}>{hostName || "Consultant"}</Text>
                                    <View style={{ backgroundColor: hostConfig.colors[0] + '30', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: hostConfig.colors[0], alignSelf: 'flex-start' }}>
                                        <Text style={{ color: hostConfig.colors[0] === '#ad57a6' ? '#FFF' : hostConfig.colors[0], fontSize: 8, fontWeight: '900', textTransform: 'uppercase' }}>{hostConfig.label}</Text>
                                    </View>
                                </View>
                                
                                <View style={styles.statsRow}>
                                    <View style={styles.liveBadgeMass}>
                                        <Text style={styles.liveText}>{formatTime(seconds)}</Text>
                                    </View>
                                    <View style={styles.viewerBadgeMass}>
                                        <Ionicons name="eye" size={10} color="#00F2FE" />
                                        <Text style={styles.viewerCountTextMass}>{viewerCount}</Text>
                                    </View>
                                </View>
                            </View>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            {/* 🔥 SATTI FIX: REFLEX SKILL ARENA CUSTOM ICON DESIGN 🔥 */}
                            <TouchableOpacity onPress={() => setGameVisible(true)} style={[styles.closeIcon, { borderColor: '#00F2FE', borderWidth: 1, backgroundColor: 'rgba(0, 242, 254, 0.15)' }]}>
                                <View style={{ width: 16, height: 16 }}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                                        <View style={{ width: 7, height: 7, backgroundColor: '#FF2A5F', borderRadius: 2 }} />
                                        <View style={{ width: 7, height: 7, backgroundColor: '#00F2FE', borderRadius: 2 }} />
                                    </View>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <View style={{ width: 7, height: 7, backgroundColor: '#10B981', borderRadius: 2 }} />
                                        <View style={{ width: 7, height: 7, backgroundColor: '#FFD700', borderRadius: 2 }} />
                                    </View>
                                </View>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={leaveChannel} style={[styles.closeIcon, { borderColor: hostConfig.colors[2] + '40', borderWidth: 1 }]}>
                                <Ionicons name="close" size={22} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </BlurView>
                
                <View style={styles.activeViewersList}>
                    <FlatList
                        horizontal
                        data={activeViewers}
                        keyExtractor={(item) => item.id}
                        showsHorizontalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <View style={styles.viewerItem}>
                                {item.photoURL ? (
                                    <Image source={{ uri: item.photoURL }} style={styles.viewerAvatar} />
                                ) : (
                                    <View style={[styles.viewerAvatar, { backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' }]}>
                                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>{item.name?.charAt(0).toUpperCase()}</Text>
                                    </View>
                                )}
                            </View>
                        )}
                    />
                </View>
            </View>

            <GiftOverlay 
                giftData={activeGift} 
                onComplete={() => setActiveGift(null)} 
            />

            {pinnedMessage && (
                <View style={styles.pinnedBox}>
                    <Ionicons name="pin" size={16} color="#00F2FE" />
                    <Text style={styles.pinnedText} numberOfLines={1}>{pinnedMessage.text}</Text>
                </View>
            )}

            {incomingCall && (
                <View style={styles.callOverlayMass}>
                    <Animated.View style={[styles.callCardWrapper, { transform: [{ scale: pulseAnim }] }]}>
                        <BlurView intensity={90} tint="dark" style={styles.callCardMass}>
                            <LinearGradient
                                colors={['rgba(2, 6, 23, 0.98)', 'rgba(15, 23, 42, 0.95)', 'rgba(0, 242, 254, 0.15)']}
                                style={StyleSheet.absoluteFill}
                            />
                            
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
                                <View style={styles.radarGlow} />
                            </View>

                            <Text style={styles.callPulseText}>INCOMING CONSULTATION</Text>
                            <Text style={styles.callInfoTextMass} numberOfLines={1}>{incomingCall.userName?.toUpperCase() || "CLIENT"}</Text>
                            
                            <View style={styles.callActionsMass}>
                                <TouchableOpacity onPress={() => handleCallAction('rejected')} activeOpacity={0.8} style={styles.actionBtnHitbox}>
                                    <LinearGradient colors={['#F43F5E', '#9F1239']} style={styles.callBtnMass}>
                                        <Ionicons name="close" size={28} color="#FFF" />
                                    </LinearGradient>
                                    <Text style={styles.callBtnLabel}>DECLINE</Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity onPress={() => handleCallAction('accepted')} activeOpacity={0.8} style={styles.actionBtnHitbox}>
                                    <LinearGradient colors={['#10B981', '#059669']} style={styles.callBtnMass}>
                                        <Ionicons name="videocam" size={28} color="#FFF" />
                                    </LinearGradient>
                                    <Text style={styles.callBtnLabel}>ACCEPT</Text>
                                </TouchableOpacity>
                            </View>
                        </BlurView>
                    </Animated.View>
                </View>
            )}

            {/* 🔥 SATTI FIX: KEYBOARD AVOIDING VIEW WRAPS ENTIRE SCREEN 🔥 */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} pointerEvents="box-none">
                
                {showProSettings && (
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
                )}

                {/* SPACER TO PUSH CHAT TO BOTTOM */}
                <View style={{ flex: 1 }} pointerEvents="none" />

                {/* 🔥 SATTI FIX: FLEX INTERACTION AREA FOR KEYBOARD FIX 🔥 */}
                <View style={styles.interactionArea} pointerEvents="box-none">
                    <FlatList
                        data={messages}
                        keyExtractor={(item) => item.id}
                        inverted={true} 
                        renderItem={({ item, index }) => {
                            // 🔥 SATTI FIX: ROYAL GIFT MESSAGE RENDER IN CHAT 🔥
                            if (item.isGift) {
                                return (
                                    <LinearGradient 
                                        colors={['rgba(245, 158, 11, 0.2)', 'rgba(236, 72, 153, 0.2)']} 
                                        start={{x:0, y:0}} end={{x:1, y:1}} 
                                        style={styles.giftChatBubble}
                                    >
                                        <Text style={styles.giftChatText}>{item.text}</Text>
                                    </LinearGradient>
                                );
                            }

                            // Normal System Message (Join/Leave)
                            if (item.isSystem) {
                                return (
                                    <View style={[styles.chatBubble, { backgroundColor: 'rgba(16, 185, 129, 0.1)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6 }]}>
                                        <Text style={[styles.chatText, { color: '#fc05ae', fontWeight: 'bold' }]}>{item.text}</Text>
                                    </View>
                                );
                            }

                            // Normal User Message
                            const msgBorder = index % 2 === 0 ? borderType1 : borderType2;
                            return (
                                <View style={[styles.chatBubble, msgBorder]}>
                                    <Text style={styles.chatName}>{item.senderName}: <Text style={styles.chatMessage}>{item.text}</Text></Text>
                                </View>
                            );
                        }}
                        style={styles.chatList}
                        contentContainerStyle={{ paddingTop: 20 }}
                        showsVerticalScrollIndicator={false}
                    />

                    <View style={styles.bottomBar}>
                        <TextInput 
                            style={styles.input} 
                            placeholder="Connect..." 
                            placeholderTextColor="#94A3B8"
                            value={inputText}
                            onChangeText={setInputText}
                        />
                        
                        <TouchableOpacity onPress={sendMessage} style={styles.iconAction}>
                            <Ionicons name="send" size={20} color="#00F2FE" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowProSettings(!showProSettings)} style={[styles.iconAction, showProSettings && styles.activePro]}>
                            <MaterialCommunityIcons name="face-man-shimmer" size={22} color={showProSettings ? "#FFF" : "#00F2FE"} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={toggleMute} style={[styles.iconAction, isMuted && styles.activeIcon]}>
                            <Ionicons name={isMuted ? "mic-off" : "mic"} size={20} color={isMuted ? "#FFF" : "#00F2FE"} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={switchCamera} style={styles.iconAction}>
                            <Ionicons name="camera-reverse" size={20} color="#00F2FE" />
                        </TouchableOpacity>

                    </View>
                </View>
            </KeyboardAvoidingView>

            {/* ✅ REFLEX BLITZ ARENA */}
            <LiveGameSheet 
                visible={gameVisible} 
                onClose={() => setGameVisible(false)} 
                liveId={currentLiveId} 
                isHost={true} 
                userWalletBalance={myWalletBalance} 
            />

            <Modal visible={showSummary} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryTitle}>SESSION SUMMARY</Text>
                        <View style={styles.statGrid}>
                            <View style={styles.statItem}><Text style={styles.statVal}>{formatTime(seconds)}</Text><Text style={styles.statLabel}>Duration</Text></View>
                            <View style={styles.statItem}><Text style={styles.statVal}>{viewerCount}</Text><Text style={styles.statLabel}>Viewers</Text></View>
                            <View style={styles.statItem}>
                                {/* 🔥 SATTI FIX: Precise session earnings strictly mapped to current Live Doc 🔥 */}
                                <Text style={styles.statVal}>{sessionEarnedBeans} 🫘</Text>
                                <Text style={styles.statLabel}>Rewards Accrued</Text>
                            </View>
                        </View>
                        {gameBeansSummary > 0 && (
                            <View style={{ marginBottom: 20, alignItems: 'center' }}>
                                <Text style={{ color: '#10B981', fontWeight: '900', fontSize: 12 }}>Activity Bonus: +{gameBeansSummary} Rewards</Text>
                            </View>
                        )}
                        <TouchableOpacity style={styles.exitBtn} onPress={confirmExit}><Text style={styles.exitBtnText}>DONE</Text></TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    videoContainer: { ...StyleSheet.absoluteFillObject },
    videoGrid: { flex: 1, flexDirection: 'column' },
    fullVideo: { flex: 1 },
    halfVideo: { flex: 0.5, borderBottomWidth: 1, borderColor: '#1E293B' },
    loadingText: { color: '#00F2FE', alignSelf: 'center', marginTop: '50%', fontWeight: '900', letterSpacing: 2 },
    
    // 🔥 SATTI FIX: HEADER STYLING TO FULLY COVER ELEMENTS 🔥
    headerContainer: { position: 'absolute', top: 50, left: 15, right: 15, zIndex: 10 },
    fullWidthCard: { padding: 18, borderRadius: 30, backgroundColor: 'rgba(2, 6, 23, 0.85)', overflow: 'hidden' }, // Deep solid background
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    profileInfoSide: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatarWrapper: { position: 'relative' },
    hostAvatarMass: { width: 46, height: 46, borderRadius: 23, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
    initialsCircleMass: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.2)' },
    initialsText: { color: '#00F2FE', fontSize: 18, fontWeight: '900' },
    crownBadgeMass: { position: 'absolute', top: -3, right: -3, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#020617' },
    nameAndStats: { marginLeft: 12, paddingVertical: 2 },
    hostNameHeaderMass: { color: '#FFF', fontSize: 15, fontWeight: '900', maxWidth: 120, letterSpacing: -0.5 },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5, gap: 10 },
    liveBadgeMass: { backgroundColor: '#EF4444', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, elevation: 5, shadowColor: '#EF4444', shadowOpacity: 0.5, shadowRadius: 5 },
    liveText: { color: '#FFF', fontWeight: '900', fontSize: 10, letterSpacing: 1 },
    viewerBadgeMass: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(0, 242, 254, 0.1)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.2)' },
    viewerCountTextMass: { color: '#00F2FE', fontSize: 11, fontWeight: '900' },
    closeIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
    
    activeViewersList: { marginTop: 15, paddingHorizontal: 15 },
    viewerItem: { marginRight: 10 },
    viewerAvatar: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', backgroundColor: '#1E293B' },
    
    callOverlayMass: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', zIndex: 99999, elevation: 99999, backgroundColor: 'rgba(2, 6, 23, 0.8)' },
    callCardWrapper: { width: '80%', borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.4)', elevation: 30, shadowColor: '#00F2FE', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 25 },
    callCardMass: { paddingVertical: 35, paddingHorizontal: 20, alignItems: 'center' },
    callerAvatarRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#00F2FE', justifyContent: 'center', alignItems: 'center', marginBottom: 20, backgroundColor: '#0F172A', position: 'relative', elevation: 20, shadowColor: '#00F2FE', shadowRadius: 20, shadowOpacity: 0.6 },
    callerCallAvatar: { width: 82, height: 82, borderRadius: 41 },
    callerCallInitials: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
    callerCallInitialsText: { color: '#00F2FE', fontSize: 32, fontWeight: '900' },
    radarGlow: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: '#00F2FE', opacity: 0.2, filter: 'blur(15px)' },
    callPulseText: { color: '#00F2FE', fontSize: 11, fontWeight: '900', letterSpacing: 5, marginBottom: 10, textShadowColor: '#00F2FE', textShadowRadius: 5 },
    callInfoTextMass: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0, marginBottom: 30, textAlign: 'center', textShadowColor: 'rgba(255,255,255,0.4)', textShadowRadius: 10 },
    callActionsMass: { flexDirection: 'row', gap: 40, width: '100%', justifyContent: 'center' },
    actionBtnHitbox: { alignItems: 'center' },
    callBtnMass: { width: 65, height: 65, borderRadius: 32.5, justifyContent: 'center', alignItems: 'center', elevation: 20, shadowColor: '#000', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
    callBtnLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '900', textAlign: 'center', marginTop: 10, letterSpacing: 2 },
    
    giftPopup: { position: 'absolute', top: 150, alignSelf: 'center', zIndex: 10 },
    giftGradient: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 25, gap: 10 },
    giftText: { color: '#FFF', fontWeight: 'bold' },
    pinnedBox: { position: 'absolute', top: 185, left: 20, right: 20, backgroundColor: 'rgba(15, 23, 42, 0.7)', padding: 12, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 10, zIndex: 5, borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.2)' },
    pinnedText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    
    // 🔥 SATTI FIX: INTERACTION AREA CHANGED TO FLEX FOR KEYBOARD FIX 🔥
    interactionArea: { height: height * 0.45, paddingHorizontal: 20, paddingBottom: 15, justifyContent: 'flex-end' },
    chatList: { flex: 1, marginBottom: 15 },
    chatBubble: { backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: 10, borderRadius: 15, marginBottom: 8, alignSelf: 'flex-start', maxWidth: '85%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    chatName: { color: '#fec300', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
    chatMessage: { color: '#FFF', fontWeight: '600', fontSize: 12 },
    chatText: { color: '#CBD5E1', fontSize: 11, fontWeight: '600' },
    
    // 🔥 SATTI FIX: ROYAL GIFT BUBBLE STYLES 🔥
    giftChatBubble: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, marginBottom: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.4)' },
    giftChatText: { color: '#FFF', fontWeight: '900', fontSize: 11, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 5 },

    bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    input: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 25, height: 48, color: '#FFF', paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    iconAction: { width: 48, height: 48, backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    activeIcon: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: '#EF4444' },
    activePro: { backgroundColor: 'rgba(0, 242, 254, 0.2)', borderColor: '#feb200' },
    
    ProSettingsBar: { backgroundColor: 'rgba(15, 23, 42, 0.95)', marginHorizontal: 15, borderRadius: 25, padding: 18, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.2)' },
    settingGroup: { flex: 1, alignItems: 'center' },
    settingLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '900', marginBottom: 10, letterSpacing: 1.5 },
    chipRow: { flexDirection: 'row', gap: 10 },
    chip: { backgroundColor: '#1E293B', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
    activeChip: { backgroundColor: 'rgba(0, 242, 254, 0.1)', borderColor: '#00F2FE' },
    chipText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
    settingDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 15 },
    
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    summaryCard: { width: '85%', backgroundColor: '#0F172A', borderRadius: 30, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.3)', elevation: 20 },
    summaryTitle: { color: '#00F2FE', fontSize: 20, fontWeight: '900', letterSpacing: 3, marginBottom: 30 },
    statGrid: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 40 },
    statItem: { alignItems: 'center', flex: 1 },
    statVal: { color: '#FFF', fontSize: 24, fontWeight: '900', marginBottom: 5 },
    statLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
    exitBtn: { backgroundColor: '#00F2FE', width: '100%', padding: 18, borderRadius: 20, alignItems: 'center', elevation: 5, shadowColor: '#00F2FE', shadowOpacity: 0.5, shadowRadius: 10 },
    exitBtnText: { color: '#020617', fontWeight: '900', fontSize: 14, letterSpacing: 2 },
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
});