import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
// 🔥 SATTI FIX: Added deleteDoc, arrayUnion for Kick and Block logic
import { getDatabase, onDisconnect, onValue, ref, set } from 'firebase/database';
import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
// 🔥 SATTI FIX: Added ScrollView to imports for the Disclaimer Modal
import { Alert, Animated, AppState, Dimensions, Easing, FlatList, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import createAgoraRtcEngine, {
    ChannelProfileType,
    ClientRoleType,
    IRtcEngine,
    LighteningContrastLevel,
    RtcTextureView,
} from 'react-native-agora';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';
import { checkAndRequestCallPermissions } from '../../utils/permissions';

import * as ScreenCapture from 'expo-screen-capture';
import GiftOverlay from '../../components/GiftOverlay';
import LiveGameSheet from '../../components/LiveGameSheet';
import MemoryMatch from '../../components/MemoryMatch';

const { width, height } = Dimensions.get('window');
const AGORA_APP_ID = '718cedc3c47e44d1bfa4853d6ac6cd80';

const getLevelConfig = (beans: number) => {
    if (beans >= 100000000) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'] as const, glow: '#F59E0B', next: 0, prev: 50000000, rate: 8000 };
    if (beans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'] as const, glow: '#EC4899', next: 100000000, prev: 30000000, rate: 7000 };
    if (beans >= 30000000) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'] as const, glow: '#8B5CF6', next: 50000000, prev: 10000000, rate: 5400 };
    if (beans >= 10000000) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'] as const, glow: '#3B82F6', next: 30000000, prev: 5000000, rate: 4800 };
    if (beans >= 5000000)  return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'] as const, glow: '#06B6D4', next: 10000000, prev: 3000000, rate: 4200 };
    if (beans >= 3000000)  return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'] as const, glow: '#10B981', next: 5000000, prev: 1000000, rate: 3600 };
    if (beans >= 1000000)  return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'] as const, glow: '#EAB308', next: 3000000, prev: 300000, rate: 3000 };
    if (beans >= 300000)    return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'] as const, glow: '#94A3B8', next: 1000000, prev: 100000, rate: 2400 };
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
    
    const isAppClosing = useRef(false);
    const isRequestingPermissions = useRef(true);

    const [joined, setJoined] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [isFrontCamera, setIsFrontCamera] = useState(true);
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [viewerCount, setViewerCount] = useState(0);

    const [seconds, setSeconds] = useState(0);
    const [showSummary, setShowSummary] = useState(false);
    const [earnings, setEarnings] = useState(0);
    const [giftAlert, setGiftAlert] = useState<string | null>(null);
    const [isProEnabled, setIsProEnabled] = useState(false);
    const [pinnedMessage, setPinnedMessage] = useState<any>(null);
    const [guestUid, setGuestUid] = useState<number | null>(null);
    const [hostImage, setHostImage] = useState<string>("");
    const [hostName, setHostName] = useState<string>("");
    
    const [hostLevel, setHostLevel] = useState<string>("BEGINNER");
    const [hostConfig, setHostConfig] = useState<any>(getLevelConfig(0));
    
    const [activeViewers, setActiveViewers] = useState<any[]>([]);
    const [showProSettings, setShowProSettings] = useState(false);
    const [ProLevel, setProLevel] = useState({ light: 0.7, smooth: 0.8 });

    const [currentLiveId] = useState(params.liveId as string || `live_${auth.currentUser?.uid}_${Date.now()}`);

    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
    const [activeGift, setActiveGift] = useState<any>(null);

    const [gameVisible, setGameVisible] = useState(false);
    const [glassVisible, setGlassVisible] = useState(false);
    
    // 🔥 NEW: HOST GAMING DISCLAIMER MODAL STATES 🔥
    const [disclaimerVisible, setDisclaimerVisible] = useState(false);
    const [disclaimerChecked, setDisclaimerChecked] = useState(false);
    const [pendingGameType, setPendingGameType] = useState<'reflex' | 'memory' | null>(null);

    const [roomData, setRoomData] = useState<any>(null);
    const [myWalletBalance, setMyWalletBalance] = useState(0);

    const [gameBeansSummary, setGameBeansSummary] = useState(0);
    const [sessionEarnedBeans, setSessionEarnedBeans] = useState(0);

    // 🔥 NEW: PLAY STORE REPORT & KICK ACTION SHEET STATES 🔥
    const [actionSheetVisible, setActionSheetVisible] = useState(false);
    // 🔥 SATTI FIX: NEW STATE FOR REPORT REASON SELECTION 🔥
    const [reportSheetVisible, setReportSheetVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);

    const borderType1 = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: hostConfig.colors[0], borderRightColor: hostConfig.colors[0],
        borderTopColor: hostConfig.colors[2] + '80', borderBottomColor: hostConfig.colors[2] + '80',
    };

    const borderType2 = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: hostConfig.colors[2], borderRightColor: hostConfig.colors[2],
        borderTopColor: hostConfig.colors[0] + '80', borderBottomColor: hostConfig.colors[0] + '80',
    };

    const checkGameActive = async () => {
        try {
            const gameSnap = await getDoc(doc(db, "lives", currentLiveId, "games", "reflex_arena"));
            if (gameSnap.exists() && (gameSnap.data().status === 'PLAYING' || gameSnap.data().status === 'WAITING')) {
                return true;
            }
        } catch (e) { console.error("Game check error:", e); }
        return false;
    };

    const safeCancelGameForAudienceRefund = async () => {
        try {
            const roomRef = doc(db, "lives", currentLiveId, "games", "reflex_arena");
            const snap = await getDoc(roomRef);
            if (snap.exists()) {
                const data = snap.data();
                if (data.status === 'PLAYING' || data.status === 'WAITING') {
                    await updateDoc(roomRef, { status: 'CANCELLED' });
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

    useEffect(() => {
        if (!currentLiveId) return;
        
        const handleAppStateChange = async (nextAppState: string) => {
            if (nextAppState === 'active') {
                setGameVisible(false);
                setGlassVisible(false);
                isAppClosing.current = false;
            }

            if ((nextAppState === 'inactive' || nextAppState === 'background') && !isAppClosing.current && !isRequestingPermissions.current) {
                isAppClosing.current = true;
                
                setGameVisible(false);
                setGlassVisible(false);

                if (engine.current) {
                    engine.current.leaveChannel();
                }
                
                setJoined(false);
                setShowSummary(true);

                try {
                    const rtdb = getDatabase();
                    set(ref(rtdb, `presence_lives/${currentLiveId}`), "ended").catch(()=>{});
                    set(ref(rtdb, `lives/${currentLiveId}/games/reflex_arena/status`), "CANCELLED").catch(()=>{});

                    updateDoc(doc(db, "lives", currentLiveId), {
                        status: "ended",
                        endTime: serverTimestamp()
                    }).catch(()=>{});

                    updateDoc(doc(db, "lives", currentLiveId, "games", "reflex_arena"), {
                        status: "CANCELLED",
                        refunded: true,
                        players: []
                    }).catch(()=>{});

                    if (auth.currentUser) {
                        updateDoc(doc(db, "users", auth.currentUser.uid), { isLive: false }).catch(()=>{});
                    }
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
            if (Platform.OS !== 'web') {
                await ScreenCapture.preventScreenCaptureAsync();
            }

            isRequestingPermissions.current = true;
            const hasPermission = await checkAndRequestCallPermissions();
            isRequestingPermissions.current = false;
            
            if (!hasPermission) {
                Alert.alert("Permission Required", "Camera and Microphone access is needed to start Live.");
                router.back();
                return;
            }

            const hostData = await fetchHostData();
            setupAgora(hostData);
        };
        init();
        const unsubListeners = listenToStreamData();
        const timer = setInterval(() => setSeconds(s => s + 1), 1000);

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
            } catch (error) { console.log(error); }
        };
        cleanupGhostRooms();

        const rtdb = getDatabase();
        const connectedRef = ref(rtdb, ".info/connected");
        const livePresenceRef = ref(rtdb, `presence_lives/${currentLiveId}`);
        const gamePresenceRef = ref(rtdb, `lives/${currentLiveId}/games/reflex_arena/status`);

        const unsubPresence = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                onDisconnect(livePresenceRef).set("ended").then(() => {
                    set(livePresenceRef, "active");
                });
                onDisconnect(gamePresenceRef).set("CANCELLED");
            }
        });

        const callQuery = query(
            collection(db, "calls"),
            where("expertId", "==", auth.currentUser?.uid || ""),
            where("status", "in", ["ringing", "pending", "Discover_dialing"])
        );

        const unsubCalls = onSnapshot(callQuery, async (snap) => {
            if (!snap.empty) {
                let validDocSnap = null;
                
                for (const docSnap of snap.docs) {
                    const data = docSnap.data() as any;
                    const now = Date.now();
                    const callTime = data.createdAt?.toMillis ? data.createdAt.toMillis() : now;
                    
                    if (now - callTime <= 30000) { 
                        validDocSnap = docSnap;
                        break; 
                    } else {
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

                let callerPic = null;
                let fetchedName = data.userName || data.callerName || "USER";

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
            if (Platform.OS !== 'web') {
                ScreenCapture.allowScreenCaptureAsync();
            }

            clearInterval(timer);
            unsubListeners();
            unsubCalls();
            unsubWallet();
            
            unsubPresence();
            set(livePresenceRef, "ended"); 
            set(gamePresenceRef, "CANCELLED"); 

            removePlayerFromReflex();

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
        if (!auth.currentUser) return { name: "Host", image: "", levelTitle: "BEGINNER", userPrice: 0 };
        const userSnap = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userSnap.exists()) {
            const userData = userSnap.data();
            let name = userData.name || auth.currentUser.displayName || "Host";
            
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
        return { name: "Host", image: "", levelTitle: "BEGINNER", userPrice: 0 };
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

    const handleCallAction = async (action: 'accepted' | 'rejected') => {
        if (!incomingCall || !auth.currentUser) return;
        
        try {
            if (action === 'accepted') {
                isNavigatingToCall.current = true; 
                
                await updateDoc(doc(db, "lives", currentLiveId), {
                    status: 'ended',
                    endTime: serverTimestamp()
                });

                await updateDoc(doc(db, "users", auth.currentUser.uid), { isLive: false, isBusy: true });

                const callRef = doc(db, "calls", incomingCall.id);
                await updateDoc(callRef, {
                    status: 'accepted',
                    expertName: hostName || "Host", 
                    expertImage: hostImage || "",     
                    callerName: incomingCall.userName || "User",
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
                        expertName: hostName || "Host", 
                        expertImage: hostImage || "",     
                        callerName: incomingCall.userName || "User",
                        callerId: incomingCall.callerId,
                        role: 'expert'
                    }
                });
            } else {
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
                setRoomData(data); 
                setViewerCount(data.viewerCount || 0);
                setPinnedMessage(data.pinnedMessage || null);
                setGameBeansSummary(data.gameBeansCollected || 0);
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
                            const senderName = gift.senderName || 'Premium User';
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

        const updateData: any = {
            status: status,
            currentLiveId: currentLiveId,
        };

        if (status === 'live') {
            let finalName = manualName || hostName || "Host";
            
            if (finalName === "ARUVI MULTIVERSE") {
                finalName = "Aruvi";
            }
            
            updateData.hostId = auth.currentUser.uid;
            updateData.hostName = finalName;
            updateData.hostImage = manualImage || hostImage || "";
            updateData.startedAt = serverTimestamp();
            updateData.viewerCount = 0;
            updateData.currentLevel = level || "BEGINNER";
            updateData.pricePerMin = price || 0;
            updateData.earnedBeans = 0; 
            
            await updateDoc(doc(db, "users", auth.currentUser.uid), { isLive: true, isBusy: false }); 
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
            senderName: hostName || "Host",
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

    const leaveChannel = async () => {
        const isGamePlaying = await checkGameActive();
        
        if (isGamePlaying) {
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
        await removePlayerFromReflex(); 
        await updateDoc(doc(db, "lives", currentLiveId), { viewerCount: 0 });
        if (engine.current) {
            engine.current.leaveChannel();
            engine.current.release();
            engine.current = null;
        }
        router.back();
    };

    // 🔥 NEW: UNIVERSAL USER CLICK TRIGGER (List & Chat) 🔥
    const handleUserClick = (userItem: any, isFromChat = false) => {
        const normalizedUser = {
            id: isFromChat ? userItem.senderId : userItem.id,
            name: isFromChat ? userItem.senderName : userItem.name,
            image: isFromChat ? null : (userItem.photoURL || userItem.profilePic)
        };
        if (normalizedUser.id === auth.currentUser?.uid) return; // Ignore self
        setSelectedUser(normalizedUser);
        setActionSheetVisible(true);
    };

    // 🔥 SATTI FIX: KICK USER FROM LIVE WITH INSTANT DISCONNECT SIGNAL 🔥
    const handleKickUser = async (showAlert = true) => {
        if (!selectedUser) return;
        try {
            // 1. Array Update for blocked users
            await updateDoc(doc(db, "lives", currentLiveId), {
                bannedViewers: arrayUnion(selectedUser.id)
            });
            // 2. Remove from local list
            await deleteDoc(doc(db, "lives", currentLiveId, "activeViewers", selectedUser.id));

            // 🔥 3. THE MAGIC FIX: Send a direct RTDB Kick Signal that the Viewer's App will catch and force close!
            const rtdb = getDatabase();
            await set(ref(rtdb, `lives/${currentLiveId}/kicked_users/${selectedUser.id}`), true);

            // 4. Chat Notification
            await addDoc(collection(db, "lives", currentLiveId, "messages"), {
                text: `${selectedUser.name} was kicked from the stream.`,
                senderName: "System",
                isSystem: true,
                timestamp: serverTimestamp()
            });
            if (showAlert) Alert.alert("Kicked", `${selectedUser.name} has been removed from live.`);
        } catch(e) { console.log(e); }
        setActionSheetVisible(false);
    };

    // 🔥 NEW: BLOCK USER (Blocks permanently + Kicks from live) 🔥
    const handleBlockUser = async (showAlert = true) => {
        if (!selectedUser || !auth.currentUser) return;
        try {
            await updateDoc(doc(db, "users", auth.currentUser.uid), {
                blockedUsers: arrayUnion(selectedUser.id)
            });
            await handleKickUser(false); // Boot them out too without second alert
            if (showAlert) Alert.alert("Blocked", `${selectedUser.name} has been permanently blocked.`);
        } catch (e) { console.log(e); }
        setActionSheetVisible(false);
    };

    // 🔥 SATTI FIX: REPORT TRIGGER MODAL 🔥
    const handleReportUser = () => {
        setActionSheetVisible(false); // Close mini-profile
        setReportSheetVisible(true); // Open specific reasons
    };

    // 🔥 SATTI FIX: SUBMIT ACTUAL REPORT TO ADMIN & TRIGGER BLOCK/KICK 🔥
    const submitReport = async (reason: string) => {
        if (!selectedUser) return;
        try {
            // 1. Submit Report
            await addDoc(collection(db, "reports"), {
                reportedUserId: selectedUser.id,
                reportedUserName: selectedUser.name,
                reportedBy: auth.currentUser?.uid,
                reason: reason,
                timestamp: serverTimestamp(),
                liveId: currentLiveId
            });
            
            // 2. Trigger Block & Kick Silently behind the scenes
            await handleBlockUser(false);
            
            Alert.alert("Reported & Blocked", `User reported to Admin for: ${reason} and has been removed.`);
        } catch (e) { console.log(e); }
        setReportSheetVisible(false);
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
                        <RtcTextureView canvas={{ uid: 0 }} style={guestUid ? styles.halfVideo : styles.fullVideo} />
                        {guestUid && <RtcTextureView canvas={{ uid: guestUid }} style={styles.halfVideo} />}
                    </View>
                )}
                {!joined && <Text style={styles.loadingText}>Connecting...</Text>}
            </View>

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
                                <View style={{flexDirection: 'column', alignItems: 'flex-start', gap: 2}}>
                                    <Text style={styles.hostNameHeaderMass} numberOfLines={1}>{hostName || "Host"}</Text>
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
                            {/* 🔥 SATTI FIX: REPLACED DIRECT GAME LAUNCH WITH DISCLAIMER TRIGGER 🔥 */}
                            <TouchableOpacity onPress={() => { setPendingGameType('reflex'); setDisclaimerVisible(true); }} style={[styles.closeIcon, { borderColor: '#00f2ff', borderWidth: 1, backgroundColor: 'rgba(0, 242, 254, 0.15)' }]}>
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

                            {/* 🔥 SATTI FIX: REPLACED DIRECT GAME LAUNCH WITH DISCLAIMER TRIGGER 🔥 */}
                            <TouchableOpacity
                                onPress={() => { setPendingGameType('memory'); setDisclaimerVisible(true); }}
                                style={[styles.closeIcon, {
                                    borderColor: '#A855F7',
                                    borderWidth: 1.5,
                                    backgroundColor: 'rgba(168, 85, 247, 0.2)',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }]}
                            >
                                <View style={{
                                    width: 24,
                                    height: 24,
                                    flexDirection: 'row',
                                    flexWrap: 'wrap',
                                    justifyContent: 'center',
                                    alignItems: 'center'
                                }}>
                                    <Text style={{ fontSize: 9 }}>🍎</Text>
                                    <Text style={{ fontSize: 9 }}>🍌</Text>
                                    <Text style={{ fontSize: 9 }}>🍇</Text>
                                    <Text style={{ fontSize: 9 }}>🍓</Text>
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
                            // 🔥 NEW: Viewer List Item is now Clickable to show Profile Menu 🔥
                            <TouchableOpacity style={styles.viewerItem} activeOpacity={0.8} onPress={() => handleUserClick(item, false)}>
                                {item.photoURL ? (
                                    <Image source={{ uri: item.photoURL }} style={styles.viewerAvatar} />
                                ) : (
                                    <View style={[styles.viewerAvatar, { backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' }]}>
                                        <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '900' }}>{item.name?.charAt(0).toUpperCase()}</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
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

                            <Text style={styles.callPulseText}>INCOMING CALL</Text>
                            <Text style={styles.callInfoTextMass} numberOfLines={1}>{incomingCall.userName?.toUpperCase() || "USER"}</Text>
                            
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

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} pointerEvents="box-none">
                <View style={{ flex: 1 }} pointerEvents="none" />

                <View style={styles.interactionArea} pointerEvents="box-none">

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

                    <FlatList
                        data={messages}
                        keyExtractor={(item) => item.id}
                        inverted={true}
                        renderItem={({ item, index }) => {
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

                            if (item.isSystem) {
                                return (
                                    <View style={[styles.chatBubble, { backgroundColor: 'rgba(16, 185, 129, 0.1)', alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 6 }]}>
                                        <Text style={[styles.chatText, { color: '#fc05ae', fontWeight: 'bold' }]}>{item.text}</Text>
                                    </View>
                                );
                            }

                            const msgBorder = index % 2 === 0 ? borderType1 : borderType2;
                            return (
                                // 🔥 NEW: Chat Message is now Clickable too 🔥
                                <TouchableOpacity activeOpacity={0.8} style={[styles.chatBubble, msgBorder]} onPress={() => handleUserClick(item, true)}>
                                    <Text style={styles.chatName}>{item.senderName}: <Text style={styles.chatMessage}>{item.text}</Text></Text>
                                </TouchableOpacity>
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
                            <Ionicons name="send" size={18} color="#00F2FE" />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => setShowProSettings(!showProSettings)} style={[styles.iconAction, showProSettings && styles.activePro]}>
                            <MaterialCommunityIcons name="face-man-shimmer" size={20} color={showProSettings ? "#FFF" : "#00F2FE"} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={toggleMute} style={[styles.iconAction, isMuted && styles.activeIcon]}>
                            <Ionicons name={isMuted ? "mic-off" : "mic"} size={18} color={isMuted ? "#FFF" : "#00F2FE"} />
                        </TouchableOpacity>

                        <TouchableOpacity onPress={switchCamera} style={styles.iconAction}>
                            <Ionicons name="camera-reverse" size={18} color="#00F2FE" />
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>

            <LiveGameSheet
                visible={gameVisible}
                onClose={() => setGameVisible(false)}
                liveId={currentLiveId}
                isHost={true}
                userWalletBalance={myWalletBalance}
            />

            <MemoryMatch
                visible={glassVisible}
                onClose={() => setGlassVisible(false)}
                liveId={currentLiveId}
                isHost={true}
                entryFee={50}
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
                                <Text style={styles.statVal}>{sessionEarnedBeans} 🎖️</Text>
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

            {/* 🔥 PREMIUM ACTION SHEET: USER MINI-PROFILE (Over Live Stream) 🔥 */}
            <Modal visible={actionSheetVisible} transparent animationType="slide">
                <View style={styles.actionSheetOverlay}>
                    <TouchableOpacity style={styles.actionSheetDismiss} onPress={() => setActionSheetVisible(false)} />
                    <View style={styles.actionSheetContainer}>
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
                            <Text style={styles.actionSheetTitle}>{selectedUser?.name || "User"}</Text>
                        </View>

                        {/* 🔥 BLOCK AND REPORT ARE MERGED INTO THIS BUTTON 🔥 */}
                        <TouchableOpacity style={styles.actionSheetBtn} onPress={handleReportUser}>
                            <Ionicons name="shield-half-outline" size={22} color="#EF4444" />
                            <Text style={[styles.actionSheetBtnText, { color: '#EF4444' }]}>Block User</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionSheetCancelBtn} onPress={() => setActionSheetVisible(false)}>
                            <Text style={styles.actionSheetCancelText}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 🔥 SATTI FIX: REPORT REASONS MODAL 🔥 */}
            <Modal visible={reportSheetVisible} transparent animationType="slide">
                <View style={styles.actionSheetOverlay}>
                    <TouchableOpacity style={styles.actionSheetDismiss} onPress={() => setReportSheetVisible(false)} />
                    <View style={styles.actionSheetContainer}>
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
                            <Ionicons name="flag-outline" size={22} color="#94A3B8" />
                            <Text style={[styles.actionSheetBtnText, { color: '#FFF' }]}>Other Violations</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.actionSheetCancelBtn} onPress={() => setReportSheetVisible(false)}>
                            <Text style={styles.actionSheetCancelText}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* 🔥 NEW: PLAY STORE COMPLIANT HOST SKILL GAMING DISCLAIMER MODAL 🔥 */}
            <Modal visible={disclaimerVisible} transparent animationType="slide">
                <View style={styles.actionSheetOverlay}>
                    <View style={[styles.actionSheetContainer, { paddingBottom: Platform.OS === 'ios' ? 40 : 30 }]}>
                        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={styles.actionSheetHandle} />
                        <Text style={[styles.actionSheetTitle, { marginBottom: 15, color: '#F59E0B' }]}>🛡️ Host Skill Gaming Policy</Text>

                        <ScrollView style={{ maxHeight: height * 0.35, marginBottom: 15 }} showsVerticalScrollIndicator={false}>
                            <Text style={styles.disclaimerBodyText}>Welcome to TalkPe Pro Games! As a Host, please acknowledge your responsibilities:</Text>
                            
                            <Text style={styles.disclaimerBullet}>🎮 <Text style={styles.disclaimerBold}>Host Role:</Text> You can only host the games (Reflex Arena & Memory Match) to engage your audience. Hosts cannot participate as players.</Text>
                            
                            <Text style={styles.disclaimerBullet}>🏆 <Text style={styles.disclaimerBold}>Host Reward:</Text> You will receive a 10% platform bonus based on the total diamonds spent by users playing your hosted game.</Text>

                            <Text style={styles.disclaimerBullet}>⚠️ <Text style={styles.disclaimerBold}>Do Not Force Close:</Text> Never close or minimize the app while a game is active. This disrupts the session for users.</Text>
                            
                            <Text style={styles.disclaimerBullet}>🧠 <Text style={styles.disclaimerBold}>Skill & Entertainment Only:</Text> These are strictly skill-based interactive features. Diamonds are virtual assets and users cannot cash them out.</Text>
                        </ScrollView>

                        <TouchableOpacity 
                            style={styles.checkboxContainer} 
                            activeOpacity={0.8}
                            onPress={() => setDisclaimerChecked(!disclaimerChecked)}
                        >
                            <Ionicons name={disclaimerChecked ? "checkbox" : "square-outline"} size={24} color={disclaimerChecked ? "#10B981" : "#94A3B8"} />
                            <Text style={styles.checkboxText}>I confirm that I understand my role as a Host, the 10% bonus structure, and agree not to disrupt active games.</Text>
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
    
    headerContainer: { position: 'absolute', top: 50, left: 15, right: 15, zIndex: 10 },
    fullWidthCard: { padding: 18, borderRadius: 30, backgroundColor: 'rgba(2, 6, 23, 0.85)', overflow: 'hidden' },
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
    
    gameBadgePill: { flexDirection: 'row', alignItems: 'center', height: 38, borderRadius: 19, paddingHorizontal: 12, gap: 8, justifyContent: 'center' },
    gameBadgeText: { color: '#00F2FE', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    
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
    
    interactionArea: { height: height * 0.45, paddingHorizontal: 20, paddingBottom: 15, justifyContent: 'flex-end' },
    chatList: { flex: 1, marginBottom: 15 },
    chatBubble: { backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: 10, borderRadius: 15, marginBottom: 8, alignSelf: 'flex-start', maxWidth: '85%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    chatName: { color: '#fec300', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
    chatMessage: { color: '#FFF', fontWeight: '600', fontSize: 12 },
    chatText: { color: '#CBD5E1', fontSize: 11, fontWeight: '600' },
    
    giftChatBubble: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, marginBottom: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.4)' },
    giftChatText: { color: '#FFF', fontWeight: '900', fontSize: 11, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 5 },

    bottomBar: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    input: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 25, height: 44, color: '#FFF', paddingHorizontal: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    iconAction: { width: 40, height: 40, backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    activeIcon: { backgroundColor: 'rgba(239, 68, 68, 0.2)', borderColor: '#EF4444' },
    activePro: { backgroundColor: 'rgba(0, 242, 254, 0.2)', borderColor: '#feb200' },
    
    ProSettingsBar: { backgroundColor: 'rgba(15, 23, 42, 0.95)', borderRadius: 25, padding: 18, marginBottom: 15, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.2)' },
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

    // 🔥 NEW: ACTION SHEET STYLES 🔥
    actionSheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
    actionSheetDismiss: { flex: 1 },
    actionSheetContainer: { borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.2)', borderBottomWidth: 0 },
    actionSheetHandle: { width: 40, height: 5, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, alignSelf: 'center', marginBottom: 20 },
    
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

    // 🔥 NEW: DISCLAIMER STYLES 🔥
    disclaimerBodyText: { color: '#CBD5E1', fontSize: 13, lineHeight: 20, marginBottom: 15 },
    disclaimerBullet: { color: '#CBD5E1', fontSize: 13, lineHeight: 22, marginBottom: 10 },
    disclaimerBold: { fontWeight: 'bold', color: '#FFF' },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12 },
    checkboxText: { color: '#94A3B8', fontSize: 11, marginLeft: 10, flex: 1, lineHeight: 18 },
});