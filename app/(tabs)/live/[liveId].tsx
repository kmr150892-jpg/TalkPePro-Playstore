import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDoc, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
// 🔥 NEW: RTDB IMPORT FOR PRESENCE SYSTEM 🔥
import { getDatabase, onValue, ref } from 'firebase/database';
import React, { useEffect, useRef, useState } from 'react';
// 🔥 FIXED: Added AppState to detect Force Close and update Firestore 🔥
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, FlatList, Image, KeyboardAvoidingView, Modal, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import createAgoraRtcEngine, { ChannelProfileType, ClientRoleType, IRtcEngine, RtcSurfaceView } from 'react-native-agora';
import { SafeAreaView } from 'react-native-safe-area-context';
import GiftOverlay from '../../../components/GiftOverlay';
import LiveGameSheet from '../../../components/LiveGameSheet'; // ✅ REFLEX BLITZ ARENA IMPORTED
import MemoryMatch from '../../../components/MemoryMatch'; // ✅ GLASS PATH IMPORTED
import { auth, db } from '../../../firebaseConfig';
import { checkAndRequestCallPermissions } from '../../../utils/permissions';

// --- NEW: Security Import ---

const { width, height } = Dimensions.get('window');
const AGORA_APP_ID = '718cedc3c47e44d1bfa4853d6ac6cd80';

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
const AnimatedGiftIcon = ({ source }: { source: any }) => {
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
            style={[styles.giftImage, { transform: [{ translateY }] }]} 
            resizeMode="contain" 
        />
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
    const router = useRouter();
    const navigation = useNavigation();
    const params = useLocalSearchParams();
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

    useEffect(() => {
        isCallingRef.current = isCalling;
    }, [isCalling]);

    // 🔥 GAME FEATURE STATE
    const [gameVisible, setGameVisible] = useState(false);
    const [glassPathVisible, setGlassPathVisible] = useState(false); // 🔥 NEW: GLASS PATH STATE
    const [myWalletBalance, setMyWalletBalance] = useState(0);

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

        // 🔥 SATTI FIX: FRONTEND AUTO-REFUND LOGIC (USER-SIDE SAFEGUARD) 🔥
        // Expert app kill pannalum, user screen close aagurathuku munnadi refund adichudum!
        try {
            if (auth.currentUser) {
                const roomRef = doc(db, 'lives', liveId, 'games', 'reflex_arena');
                const roomSnap = await getDoc(roomRef);
                
                if (roomSnap.exists()) {
                    const roomData = roomSnap.data();
                    // Check if game was stuck in WAITING or PLAYING state
                    if (roomData.status === 'WAITING' || roomData.status === 'PLAYING') {
                        const players = roomData.players || [];
                        const iAmPlaying = players.some((p: any) => p.id === auth.currentUser?.uid);
                        
                        if (iAmPlaying) {
                            const entryFee = Number(roomData.entryFee) || 0;
                            if (entryFee > 0) {
                                const userRef = doc(db, "users", auth.currentUser.uid);
                                // 1. Instantly refund the wallet
                                await updateDoc(userRef, { balance: increment(entryFee) });
                                
                                // 2. Add to transaction history
                                await addDoc(collection(db, "users", auth.currentUser.uid, "activityHistory"), {
                                    type: "ARENA_REFUND",
                                    status: "REFUNDED",
                                    gameName: "REFLEX BLITZ ARENA",
                                    sessionId: "reflex_arena",
                                    entryFee: entryFee,
                                    winAmount: entryFee,
                                    lossAmount: 0,
                                    title: "Arena Pass Refund (Host Left)",
                                    timestamp: serverTimestamp()
                                });
                                console.log(`✅ Frontend Auto-Refund processed successfully for ${entryFee} diamonds!`);
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.log("Frontend Refund Check Error:", e);
        }
        // ----------------------------------------------------------------------

        // 🔥 SATTI FIX: GAME WAITING LOGIC REMOVED! INSTANT EXIT & CLOSE ALL MODALS 🔥
        setExitMessage("Host left the broadcast. Exiting... 🚀");
        setIsLiveEndedWaiting(true); // Lock the screen
        
        // 🔥 Force close modals and WAIT 500ms before showing Alert! 🔥
        setGameVisible(false); // Instantly close the game modal
        setGlassPathVisible(false); // 🔥 Close Glass Path modal
        setShowGiftModal(false);
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
                    if (data.amount >= 1000) {
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
                    setIsCalling(false);
                    isCallingRef.current = false;
                    
                    if (hostFirestoreId) {
                        const expertRef = doc(db, "users", hostFirestoreId);
                        const expertSnap = await getDoc(expertRef);
                        
                        if (expertSnap.exists() && expertSnap.data().isBusy === true) {
                            setShowBusyStatus(true);
                            
                            await addDoc(collection(db, "lives", liveId, "messages"), {
                                text: `${hostName} is currently on another call. Please try later.`,
                                senderName: "System",
                                senderId: "system_msg",
                                timestamp: serverTimestamp(),
                                isSystem: true
                            });

                            setTimeout(() => setShowBusyStatus(false), 4000);
                        }
                    }
                }
            }
        });

        return unsub;
    };

    // 🔥 SATTI FIX: ROBUST CALL INITIATOR WITH PERMISSION CHECK 🔥
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

    // 🔥 SATTI FIX: Synced Highest Balance check for accurate Level display!
    const userDiamonds = Math.max(
        userData?.totalDiamonds || 0,
        userData?.walletBalance || 0,
        userData?.balance || 0
    );
    const userTier = calculateUserLevel(userDiamonds);
    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });

    // 🔥 ALTERNATING BORDER STYLES (FLUID, 2px)
    const borderType1 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: userTier.color,
        borderRightColor: userTier.color,
        borderTopColor: userTier.secondaryColor + '80',
        borderBottomColor: userTier.secondaryColor + '80',
    };

    const borderType2 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: userTier.secondaryColor,
        borderRightColor: userTier.secondaryColor,
        borderTopColor: userTier.color + '80',
        borderBottomColor: userTier.color + '80',
    };

    return (
        <View style={styles.container}>
            {/* 🔥 SATTI FIX: KEYBOARD AVOIDING VIEW WRAPS ENTIRE SCREEN 🔥 */}
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                
                {/* BACKGROUND ELEMENTS */}
                <LinearGradient colors={userTier.themeBg as any} style={StyleSheet.absoluteFill} />
                <Animated.View style={[styles.shimmerOrb, { top: 100, left: -60, backgroundColor: userTier.color, transform: [{ translateY: orbTranslateY }] }]} />
                <Animated.View style={[styles.shimmerOrb, { bottom: 200, right: -60, backgroundColor: userTier.secondaryColor, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

                {/* VIDEO CONTAINER */}
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
                            <ActivityIndicator size="large" color={userTier.color} style={{ marginBottom: 20 }} />
                            <Text style={[styles.loadingText, { color: userTier.color }]}>Connecting to {hostName}...</Text>
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

                <SafeAreaView style={{ flex: 1 }} pointerEvents="box-none">
                    
                    {/* 🔥 SATTI FIX: FULLY COVERED HEADER BLOCK 🔥 */}
                    <View style={styles.header}>
                        <BlurView intensity={90} tint="dark" style={[styles.fullWidthCard, borderType1]}>
                            <View style={styles.topRow}>
                                <View style={styles.profileInfoSide}>
                                    <View style={styles.avatarWrapper}>
                                        {hostImage ? (
                                            <Image source={{ uri: hostImage }} style={[styles.hostAvatar, { borderColor: userTier.color }]} />
                                        ) : (
                                            <View style={[styles.avatarPlaceholder, { backgroundColor: userTier.color }]}>
                                                <Text style={styles.placeholderText}>{hostName.charAt(0).toUpperCase()}</Text>
                                            </View>
                                        )}
                                        <View style={styles.liveIndicator}>
                                            <View style={styles.liveDot} />
                                            <Text style={styles.countText}>{viewerCount}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.nameContainer}>
                                        {/* 🔥 SATTI FIX: Level Badge moved below the name 🔥 */}
                                        <View style={{flexDirection: 'column', alignItems: 'flex-start', gap: 2}}>
                                            <Text style={styles.hostNameText} numberOfLines={1}>{hostName}</Text>
                                            <Text style={[styles.onlineStatus, { color: userTier.color }]}>Active Now</Text>
                                        </View>
                                    </View>
                                </View>
                                
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                    {/* 🔥 UNIQUE MEMORY MATCH GAME ICON (Perfect Round Fit) 🔥 */}
                                    <TouchableOpacity 
                                        onPress={() => setGlassPathVisible(true)} 
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

                                    {/* 🔥 SATTI FIX: CUSTOM SKILL ARENA ICON (Play Store Safe) 🔥 */}
                                    <TouchableOpacity onPress={() => setGameVisible(true)} style={[styles.closeIcon, { borderColor: 'rgb(0, 234, 255)', borderWidth: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
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
                                    </TouchableOpacity>

                                    <TouchableOpacity onPress={handleBackNavigation} style={[styles.closeIcon, { borderColor: userTier.secondaryColor + '40', borderWidth: 1 }]}>
                                        <Ionicons name="close" size={22} color="#FFF" />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            <View style={styles.actionRow}>
                                <TouchableOpacity onPress={handleCallButtonPress} style={{flex: 1.5}} disabled={isCalling}>
                                    <Animated.View style={[
                                        styles.callBtnMass, 
                                        { opacity: isCalling ? 1 : blinkAnim, transform: [{ rotate: rotation }], backgroundColor: userTier.color, shadowColor: userTier.color },
                                        isCalling && { backgroundColor: userTier.secondaryColor }
                                    ]}>
                                        {isCalling ? (
                                            <ActivityIndicator size="small" color="#FFF" />
                                        ) : (
                                            <Ionicons name="call" size={14} color="#FFF" />
                                        )}
                                        <Text style={styles.callTextMass}>
                                            {isCalling ? "Calling..." : `${callRate}💎/m`}
                                        </Text>
                                    </Animated.View>
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setShowGiftModal(true)} style={[styles.giftBtnMass, { borderColor: userTier.secondaryColor + '60' }]}>
                                    <FontAwesome5 name="gift" size={20} color={userTier.color} />
                                    <Text style={styles.giftTextMass}></Text>
                                </TouchableOpacity>
                                <LinearGradient colors={[userTier.color, userTier.secondaryColor]} style={styles.levelTag}>
                                    <FontAwesome5 name="crown" size={8} color="#FFF" />
                                    <Text style={styles.levelTextTag}>{hostLevel}</Text>
                                </LinearGradient>
                            </View>
                        </BlurView>
                    </View>

                    {showBusyStatus && (
                        <View style={styles.busyOverlay}>
                            <BlurView intensity={90} tint="dark" style={[styles.busyCard, borderType1]}>
                                <View style={[styles.busyIconCircle, { backgroundColor: userTier.secondaryColor + '30' }]}>
                                    <Ionicons name="time" size={32} color={userTier.color} />
                                </View>
                                <Text style={styles.busyTitle}>Host is Engaged</Text>
                                <Text style={styles.busySub}>The host is currently on another call or unable to pick up. Please try again in a few minutes.</Text>
                            </BlurView>
                        </View>
                    )}

                    <Animated.View style={[styles.giftNotify, { opacity: giftAnim, transform: [{ scale: giftAnim }] }]}>
                        <LinearGradient colors={[userTier.color, userTier.secondaryColor]} style={styles.giftPop}>
                            <FontAwesome5 name="gem" size={20} color="#FFF" />
                            <Text style={styles.giftPopText}>{giftAlert}</Text>
                        </LinearGradient>
                    </Animated.View>

                    {reactions.map((r) => (
                        <FloatingHeart key={r.id} x={r.x} />
                    ))}

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
                                            <Text style={[styles.chatText, { color: '#032cf9', fontWeight: 'bold' }]}>{item.text}</Text>
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

                        <View style={styles.inputBar}>
                            <TextInput 
                                style={[styles.textInput, { borderColor: userTier.color + '50' }]} 
                                placeholder="Chat..." 
                                placeholderTextColor="#94A3B8"
                                value={inputText}
                                onChangeText={setInputText}
                                editable={!isLiveEndedWaiting}
                            />
                            <TouchableOpacity onPress={addReaction} disabled={isLiveEndedWaiting} style={[styles.reactionBtn, { backgroundColor: userTier.secondaryColor, shadowColor: userTier.secondaryColor }]}>
                                <Ionicons name="heart" size={24} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={sendMessage} disabled={isLiveEndedWaiting} style={[styles.sendBtn, { backgroundColor: userTier.color, shadowColor: userTier.color }]}>
                                <Ionicons name="paper-plane" size={20} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView>

            <GiftOverlay 
                giftData={activeGrandGift} 
                onComplete={() => setActiveGrandGift(null)} 
                role="user"
            />

            {/* 🔥 SATTI FIX: ANIMATED PREMIUM GIFTS REPLACED EMOJIS 🔥 */}
            <Modal visible={showGiftModal} transparent animationType="slide">
                <View style={styles.modalOverlay}>
                    <BlurView intensity={100} tint="dark" style={[styles.modalContent, borderType2, { borderBottomWidth: 0 }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Send Appreciation 💎</Text>
                            <TouchableOpacity onPress={() => setShowGiftModal(false)}>
                                <Ionicons name="close" size={28} color={userTier.color} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.giftGrid}>
                            <TouchableOpacity onPress={() => sendGift('Chocolate', 1000)} style={[styles.giftBtnMain, borderType1]}>
                                <AnimatedGiftIcon source={require('../../../assets/images/chocolate.png')} />
                                <Text style={styles.giftNameText}>Chocolate</Text>
                                <Text style={[styles.giftPrice, { color: userTier.color }]}>1k</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => sendGift('Cake', 3000)} style={[styles.giftBtnMain, borderType2]}>
                                <AnimatedGiftIcon source={require('../../../assets/images/cake.png')} />
                                <Text style={styles.giftNameText}>Cake</Text>
                                <Text style={[styles.giftPrice, { color: userTier.secondaryColor }]}>3k</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => sendGift('Crown', 5000)} style={[styles.giftBtnMain, borderType1]}>
                                <AnimatedGiftIcon source={require('../../../assets/images/crown.png')} />
                                <Text style={styles.giftNameText}>Crown</Text>
                                <Text style={[styles.giftPrice, { color: userTier.color }]}>5k</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => sendGift('Diamond', 10000)} style={[styles.giftBtnMain, borderType2]}>
                                <AnimatedGiftIcon source={require('../../../assets/images/diamond.png')} />
                                <Text style={styles.giftNameText}>Diamond</Text>
                                <Text style={[styles.giftPrice, { color: userTier.secondaryColor }]}>10k</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => sendGift('Car', 25000)} style={[styles.giftBtnMain, borderType1]}>
                                <AnimatedGiftIcon source={require('../../../assets/images/car.png')} />
                                <Text style={styles.giftNameText}>Car</Text>
                                <Text style={[styles.giftPrice, { color: userTier.color }]}>25k</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => sendGift('Private Jet', 50000)} style={[styles.giftBtnMain, borderType2]}>
                                <AnimatedGiftIcon source={require('../../../assets/images/private jet.png')} />
                                <Text style={styles.giftNameText}>Private Jet</Text>
                                <Text style={[styles.giftPrice, { color: userTier.secondaryColor }]}>50k</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => sendGift('Palace', 100000)} style={[styles.giftBtnMain, borderType1, { width: '45%' }]}>
                                <AnimatedGiftIcon source={require('../../../assets/images/palace.png')} />
                                <Text style={styles.giftNameText}>Palace</Text>
                                <Text style={[styles.giftPrice, { color: userTier.color }]}>100k</Text>
                            </TouchableOpacity>
                        </View>
                    </BlurView>
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
    videoGrid: { flex: 1, flexDirection: 'column' },
    fullVideo: { flex: 1 },
    halfVideo: { flex: 0.5, borderBottomWidth: 1, borderColor: '#1E293B' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' }, // <--- SATTI FIX ADDED
    loadingText: { color: '#0400fe', alignSelf: 'center', marginTop: '50%', fontWeight: '900', letterSpacing: 2 },
    shimmerOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.15, filter: 'blur(100px)' },
    
    // 🔥 SATTI FIX: HEADER STYLING TO FULLY COVER ELEMENTS 🔥
    header: { position: 'absolute', top: 50, left: 15, right: 15, zIndex: 10 },
    fullWidthCard: { padding: 18, borderRadius: 30, backgroundColor: 'rgba(2, 6, 23, 0.85)', overflow: 'hidden' }, // Deep solid background
    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    profileInfoSide: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    avatarWrapper: { position: 'relative' },
    hostAvatar: { width: 54, height: 54, borderRadius: 27, borderWidth: 2 },
    avatarPlaceholder: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center' },
    placeholderText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
    liveIndicator: { position: 'absolute', bottom: -5, alignSelf: 'center', backgroundColor: '#EF4444', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6, borderRadius: 10, gap: 3 },
    liveDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#FFF' },
    countText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
    nameContainer: { marginLeft: 15 },
    hostNameText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },
    onlineStatus: { fontSize: 11, fontWeight: '600' },
    closeIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(231, 6, 6, 0.89)', justifyContent: 'center', alignItems: 'center' },
    actionRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    callBtnMass: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 20, gap: 6, flex: 1.5, shadowOpacity: 0.3, shadowRadius: 5 },
    callTextMass: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
    giftBtnMass: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgb(255, 255, 255)', paddingVertical: 8, borderRadius: 20, gap: 1, borderWidth: 1 },
    giftTextMass: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
    levelTag: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 20, gap: 5 },
    levelTextTag: { color: '#FFF', fontSize: 12, fontWeight: '900' },
    
    giftNotify: { position: 'absolute', top: 200, alignSelf: 'center', zIndex: 100 },
    giftPop: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 30, gap: 12, shadowColor: '#000', shadowRadius: 10, elevation: 10 },
    giftPopText: { color: '#FFF', fontWeight: '900', fontSize: 15 },
    
    // 🔥 SATTI FIX: INTERACTION AREA CHANGED TO FLEX FOR KEYBOARD FIX 🔥
    interactionArea: { height: height * 0.45, paddingHorizontal: 20, paddingBottom: 15, justifyContent: 'flex-end' },
    chatList: { flex: 1, marginBottom: 15 },
    chatBubble: { backgroundColor: 'rgba(15, 23, 42, 0.6)', padding: 10, borderRadius: 15, marginBottom: 8, alignSelf: 'flex-start', maxWidth: '85%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    chatName: { color: '#fe9d00', fontWeight: '900', fontSize: 11, letterSpacing: 0.5 },
    chatMessage: { color: '#FFF', fontWeight: '600', fontSize: 12 },
    chatText: { color: '#CBD5E1', fontSize: 11, fontWeight: '600' },
    
    // 🔥 SATTI FIX: ROYAL GIFT BUBBLE STYLES 🔥
    giftChatBubble: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, marginBottom: 8, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(245, 159, 11, 0.99)' },
    giftChatText: { color: '#FFF', fontWeight: '900', fontSize: 11, textShadowColor: 'rgb(99, 71, 170)', textShadowRadius: 5 },

    inputBar: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, gap: 12 },
    textInput: { flex: 1, height: 50, backgroundColor: 'rgba(15,23,42,0.85)', borderRadius: 25, paddingHorizontal: 20, color: '#FFF', borderWidth: 1 },
    sendBtn: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', shadowRadius: 5, shadowOpacity: 0.4 },
    floatingReaction: { position: 'absolute', bottom: 120, zIndex: 99 },
    reactionBtn: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', shadowRadius: 5, shadowOpacity: 0.4 },
    
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
    modalContent: { borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 25, overflow: 'hidden' },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    modalTitle: { color: '#FFF', fontSize: 22, fontWeight: '800' },
    giftGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, justifyContent: 'center', marginBottom: 30 },
    
    // 🔥 SATTI FIX: CHANGED BUTTON SIZE TO ACCOMMODATE TEXT 🔥
    giftBtnMain: { width: 85, height: 110, backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    
    // 🔥 SATTI FIX: NEW STYLES FOR ANIMATED IMAGES & TEXT 🔥
    giftImage: { width: 80, height: 80 },
    giftNameText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', marginTop: -10, textAlign: 'center' },
    giftPrice: { fontSize: 14, fontWeight: '900', marginTop: 2 },
    
    busyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', zIndex: 1000 },
    busyCard: { width: width * 0.85, padding: 35, borderRadius: 35, alignItems: 'center', overflow: 'hidden' },
    busyIconCircle: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    busyTitle: { color: '#FFF', fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
    busySub: { color: '#94A3B8', fontSize: 15, textAlign: 'center', lineHeight: 24 }
});