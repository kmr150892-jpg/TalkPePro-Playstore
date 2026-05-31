import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getDatabase, onValue, ref } from 'firebase/database';
import {
    addDoc,
    collection,
    doc,
    getDoc,
    increment,
    limit,
    onSnapshot,
    orderBy,
    query,
    serverTimestamp,
    updateDoc,
    where // 🔥 SATTI FIX: ADDED MISSING IMPORT 🔥
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
    KeyboardAvoidingView,
    Modal,
    PermissionsAndroid,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { ChannelProfileType, ClientRoleType, createAgoraRtcEngine, IRtcEngine } from 'react-native-agora';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

// 🔥 Participation NUMBER GAME IMPORT 🔥
import LiveGameSheet from '../../components/LiveGameSheet';
import MemoryMatch from '../../components/MemoryMatch'; // 🔥 ADDED MEMORY MATCH IMPORT 🔥

// TURBO RACING SHEET HAS BEEN COMPLETELY REMOVED PER USER REQUEST

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
    return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'], glow: 'transparent', next: 30000, prev: 0, rate: 1000 };
};

export default function PartyRoomScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const roomId = params.roomId as string;
    const user = auth.currentUser;

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
    const [isSpeakerMuted, setIsSpeakerMuted] = useState(false); // 🔥 SATTI FIX: SPEAKER MUTE STATE 🔥
    const [isAgoraJoined, setIsAgoraJoined] = useState(false);

    const [showGiftModal, setShowGiftModal] = useState(false);
    const [currentGift, setCurrentGift] = useState<any>(null);
    const giftAnimY = useRef(new Animated.Value(50)).current; 
    const scaleAnim = useRef(new Animated.Value(0)).current;

    const [gameVisible, setGameVisible] = useState(false);
    const [glassPathVisible, setGlassPathVisible] = useState(false); // 🔥 MEMORY MATCH STATE 🔥
    
    const gameVisibleRef = useRef(false);
    
    useEffect(() => { gameVisibleRef.current = gameVisible; }, [gameVisible]);

    const [displayWalletBalance, setDisplayWalletBalance] = useState(0); 
    const isClosingRef = useRef(false);
    
    // 🔥 SATTI FIX: NEW STATE FOR UI FREEZE DURING GRACEFUL EXIT 🔥
    const [isLiveEndedWaiting, setIsLiveEndedWaiting] = useState(false);
    const [exitMessage, setExitMessage] = useState("");
    
    // 🔥 SATTI FIX: Robust Reference Tracking for Leave Logic 🔥
    const hasAnnouncedJoin = useRef(false);
    const userDataRef = useRef<any>(null);
    const mySeatIndexRef = useRef<number | null>(null);
    const roomDataRef = useRef<any>(null);

    // 🔥 SATTI FIX: NEW REF TO TRACK CALL INITIATION STATE
    const isCallingRef = useRef(false);
    const [isCallingState, setIsCallingState] = useState(false); 
    const navigatingToCallRef = useRef(false);

    useEffect(() => { userDataRef.current = userData; }, [userData]);
    useEffect(() => { mySeatIndexRef.current = mySeatIndex; }, [mySeatIndex]);
    useEffect(() => { roomDataRef.current = roomData; }, [roomData]);

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

    // 🔥 SATTI FIX: Explicit Leave Function to prevent "toto film left" bugs! 🔥
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
        } catch(e) { console.log(e); }

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
        
        // 1. Instantly Close Sub-Modals
        setShowGiftModal(false);

        if (agoraEngine.current) {
            agoraEngine.current.leaveChannel();
            agoraEngine.current.release();
            agoraEngine.current = null;
            setIsAgoraJoined(false);
        }

        try {
            // OLD GAMBLING GAMES COMPLETELY REMOVED FROM HERE
            // NO ACTIVE GAMES TO WAIT FOR ANYMORE

            // 🔥 FORUM EXIT IMMEDIATELY 🔥
            setExitMessage("Forum ended. Exiting... 🚀");
            setIsLiveEndedWaiting(true); // Lock the screen
            
            // Force close game dashboards so alert is visible
            setGameVisible(false);
            setGlassPathVisible(false); // 🔥 CLOSE MODAL ON EXIT 🔥
            
            setTimeout(() => {
                Alert.alert(
                    "Forum Ended", 
                    "Host closed this Forum. See you next time! 🚀", 
                    [{ text: "OK", onPress: () => router.replace('/(tabs)' as any) }],
                    { cancelable: false }
                );
            }, 500);

            // Auto-navigate back after 3.5 seconds just in case user ignores Alert
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

        // 🔥 SATTI FIX: RESET EXIT STATES ON RE-entry 🔥
        setIsLiveEndedWaiting(false);
        setExitMessage("");
        isClosingRef.current = false;

        const rtdb = getDatabase();
        const roomPresenceRef = ref(rtdb, `presence_rooms/${roomId}`);
        
        const unsubPresence = onValue(roomPresenceRef, async (snap) => {
            if (snap.exists() && snap.val() === "ended") {
                await updateDoc(doc(db, "forum_rooms", roomId), { status: "ended" }).catch(()=>{});
                await updateDoc(doc(db, "lives", roomId), { status: "ended" }).catch(()=>{}); 
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
                // 🔥 Shield: Don't end room if we are routing to a call!
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
            setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })).reverse());
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
            unsubRoom(); 
            unsubUser(); 
            unsubGifts(); 
            unsubMsgs(); 
            unsubReactions(); 
        };
    }, [roomId, user]);

    // 🔥 SATTI FIX: AUTOMATIC JOIN NOTIFICATION (DEPENDENCIES LOCKED TO PREVENT SPAM) 🔥
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

    useEffect(() => {
        if (agoraEngine.current && isAgoraJoined) {
            if (isHost || mySeatIndex !== null) {
                agoraEngine.current.setClientRole(ClientRoleType.ClientRoleBroadcaster);
                agoraEngine.current.muteLocalAudioStream(isMuted);
            } else {
                agoraEngine.current.setClientRole(ClientRoleType.ClientRoleAudience);
            }
        }
    }, [isHost, mySeatIndex, isAgoraJoined, isMuted]);

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
        try {
            const updatedSeats = [...roomData.seats];
            const actualName = userData?.name || userData?.displayName || user?.displayName || "VIP User";
            const actualImage = userData?.profilePic || userData?.photoURL || user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(actualName)}&background=0F172A&color=00F2FE`;

            updatedSeats[index] = {
                uid: user?.uid, 
                name: actualName,
                image: actualImage,
                isMuted: isMuted
            };
            await updateDoc(doc(db, "forum_rooms", roomId), { seats: updatedSeats });
        } catch (e) { console.log(e); }
    };

    const toggleMic = () => {
        const newMutedState = !isMuted;
        setIsMuted(newMutedState);
        if (mySeatIndex !== null && roomData) {
            const updatedSeats = [...roomData.seats];
            updatedSeats[mySeatIndex].isMuted = newMutedState;
            updateDoc(doc(db, "forum_rooms", roomId), { seats: updatedSeats });
        }
    };

    // 🔥 SATTI FIX: MUTE/UNMUTE ROOM SPEAKER 🔥
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
            await addDoc(collection(db, "forum_rooms", roomId, "messages"), {
                uid: user.uid,
                name: userData?.name || "Guest",
                text: chatInput.trim(),
                timestamp: serverTimestamp()
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
                senderId: user.uid, // 🔥 SATTI FIX: ADDED SENDER ID 🔥
                senderImage: userData.profilePic || userData.photoURL || user?.photoURL || null, // 🔥 SATTI FIX: ADDED SENDER IMAGE 🔥
                timestamp: serverTimestamp()
            });

            updateDoc(doc(db, "users", user.uid), { balance: increment(-gift.price) });
            updateDoc(doc(db, "users", roomData.hostId), { 
                totalBeansEarned: increment(expertBeans),
                walletBalance: increment(expertBeans),
                beans: increment(expertBeans)
            });

            // 🔥 SATTI FIX: ROYAL VIP GIFT MESSAGE TO CHAT 🔥
            addDoc(collection(db, "forum_rooms", roomId, "messages"), {
                uid: "system_gift",
                name: "System",
                text: `🎁 ${userData?.name || userData?.displayName || "Guest"} sent a ${gift.name} ${gift.icon}!`,
                timestamp: serverTimestamp(),
                isGift: true // 🔥 NEW FLAG FOR ROYAL UI 🔥
            }).catch(e => console.log(e));

        } catch (e) { console.log(e); }
    };

    // 🔥 SATTI FIX: ROBUST CALL INITIATOR FOR USER IN FORUM ROOM 🔥
    const handleCallButtonPress = async () => {
        if (!roomData?.hostId || !auth.currentUser) return; 
        if (isCallingRef.current) return;

        try {
            isCallingRef.current = true; // Shield ON
            setIsCallingState(true);

            // 1. Force Fetch latest USER profile to ensure Caller picture/name is 100% there
            let verifiedUserName = auth.currentUser.displayName || "User";
            let verifiedUserPic = auth.currentUser.photoURL || "";
            
            const userProfileRef = doc(db, "users", auth.currentUser.uid);
            const userSnap = await getDoc(userProfileRef);
            
            if (userSnap.exists()) {
                const freshData = userSnap.data();
                verifiedUserName = freshData.name || verifiedUserName;
                verifiedUserPic = freshData.profilePic || verifiedUserPic;
            }

            // 2. We need the expert's call rate (pricePerMin) since it's not stored in forum_rooms directly
            let expertCallRate = 25; // fallback
            const expertProfileRef = doc(db, "users", roomData.hostId);
            const expertSnap = await getDoc(expertProfileRef);

            if (expertSnap.exists()) {
                const eData = expertSnap.data();
                expertCallRate = eData.pricePerMin || 25;
            }

            // 3. Initiate the call with the robust caller data
            const callRef = await addDoc(collection(db, "calls"), {
                userId: auth.currentUser.uid,
                userName: verifiedUserName,     // ⚡ EXACT USER NAME ATTACHED
                userImage: verifiedUserPic,     // ⚡ EXACT USER PIC ATTACHED
                expertId: roomData.hostId,
                expertName: roomData.hostName || "Expert", 
                expertImage: roomData.hostImage || "", 
                status: "pending",
                createdAt: serverTimestamp(),
                pricePerMin: expertCallRate,
                type: "video"
            });
            
        } catch (error) {
            isCallingRef.current = false; // Shield OFF
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
                    navigatingToCallRef.current = true; // Shield ON
                    
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

    if (isLoading || !roomData) return null;

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#0F172A', '#020617']} style={StyleSheet.absoluteFill} />
            
            {/* 🔥 SATTI FIX: THE ULTIMATE INVISIBLE SHIELD LOCK DURING GRACEFUL EXIT 🔥 */}
            {isLiveEndedWaiting && (
                <View 
                    style={[StyleSheet.absoluteFillObject, { zIndex: 9999, elevation: 9999, backgroundColor: 'transparent' }]} 
                    onStartShouldSetResponder={() => true} // This traps ALL touches!
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

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleLeaveParty} style={styles.iconBtn}>
                            <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                        </TouchableOpacity>

                        <View style={styles.roomInfo}>
                            <Text style={styles.roomName}>{roomData.roomName || 'Forum Arena'}</Text>
                            <Text style={styles.hostName}>Host: {roomData.hostName} {isAgoraJoined ? '🟢' : '🟠'}</Text>
                        </View>
                        <View style={styles.balanceBadge}>
                            <MaterialCommunityIcons name="diamond-stone" size={14} color="#3B82F6" />
                            <Text style={styles.balanceText}>{displayWalletBalance}</Text>
                        </View>
                    </View>

                    <View style={styles.seatsContainer}>
                        <View style={styles.seatsGrid}>
                            {roomData.seats?.map((seat: any, index: number) => (
                                <TouchableOpacity key={index} style={styles.seatWrapper} onPress={() => handleSeatClick(index)}>
                                    <View style={[styles.seatCircle, seat.uid && styles.occupiedSeat, seat.uid === user?.uid && { borderColor: '#10B981', borderWidth: 3 }]}>
                                        {seat.uid ? <Image source={{ uri: seat.image }} style={styles.seatAvatar} /> : <MaterialCommunityIcons name="sofa-single-outline" size={24} color="rgba(255,255,255,0.03)" />}
                                        {seat.uid && <View style={styles.seatStatusDot} />}
                                        {seat.uid && seat.isMuted && <View style={styles.muteOverlay}><Ionicons name="mic-off" size={14} color="#FFF" /></View>}
                                    </View>
                                    <Text style={[styles.seatName, seat.uid === user?.uid && { color: '#10B981', fontWeight: '900' }]} numberOfLines={1}>{seat.uid ? seat.name : `Seat ${index + 1}`}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <LiveGameSheet 
                        visible={gameVisible} 
                        onClose={() => setGameVisible(false)} 
                        liveId={roomId} 
                        isHost={false} 
                        userWalletBalance={userData?.balance || 0} 
                    />

                    {/* ✅ MEMORY MATCH ARENA */}
                    <MemoryMatch
                        visible={glassPathVisible}
                        onClose={() => setGlassPathVisible(false)}
                        liveId={roomId}
                        isHost={false}
                        userWalletBalance={userData?.balance || 0}
                        entryFee={0}
                    />

                    <View style={styles.chatArea}>
                        <FlatList
                            data={messages}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                // 🔥 SATTI FIX: ROYAL GIFT MESSAGE RENDER 🔥
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
                                        <View style={[styles.chatBubble, { backgroundColor: 'rgba(16, 185, 129, 0.1)', alignSelf: 'center', paddingHorizontal: 15 }]}>
                                            <Text style={[styles.chatText, { color: '#10B981', fontWeight: 'bold' }]}>{item.text}</Text>
                                        </View>
                                    );
                                }

                                // Normal User Message
                                return (
                                    <View style={styles.chatBubble}>
                                        <Text style={styles.chatName}>{item.name}: </Text>
                                        <Text style={styles.chatText}>{item.text}</Text>
                                    </View>
                                );
                            }}
                            contentContainerStyle={{ paddingVertical: 10 }}
                        />
                    </View>

                    <View style={styles.bottomArea}>
                        <View style={styles.reactionRow}>
                            {/* 🔥 SPEAKER MUTE BUTTON POSITIONED HERE 🔥 */}
                            <TouchableOpacity onPress={toggleSpeaker} style={[styles.reactionBtn, { backgroundColor: isSpeakerMuted ? 'rgba(239,68,68,0.2)' : 'rgba(59,130,246,0.15)' }]}>
                                <Ionicons name={isSpeakerMuted ? "volume-mute" : "volume-medium"} size={20} color={isSpeakerMuted ? "#EF4444" : "#3B82F6"} />
                            </TouchableOpacity>

                            {REACTION_EMOJIS.map(emoji => (
                                <TouchableOpacity key={emoji} onPress={() => handleReaction(emoji)} style={styles.reactionBtn}>
                                    <Text style={{fontSize: 20}}>{emoji}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <BlurView intensity={30} tint="dark" style={styles.controlsBox}>
                            <TextInput
                                value={chatInput}
                                onChangeText={setChatInput}
                                placeholder="Type a message..."
                                placeholderTextColor="#64748B"
                                style={styles.chatInputField}
                                editable={!isLiveEndedWaiting} // 🔥 SATTI FIX: LOCK INPUT
                            />
                            
                            <TouchableOpacity 
                                style={[styles.sendBtn, { opacity: chatInput.trim() && !isLiveEndedWaiting ? 1 : 0.4 }]} 
                                onPress={handleSendChat}
                                disabled={!chatInput.trim() || isLiveEndedWaiting} // 🔥 SATTI FIX: LOCK BUTTON
                            >
                                <Ionicons name="send" size={20} color="#3B82F6" />
                            </TouchableOpacity>

                            <View style={styles.actionRow}>
                                {/* 🔥 CUSTOM SKILL ARENA ICON (Play Store Safe) 🔥 */}
                                <TouchableOpacity style={[styles.gameBtnSmall, { backgroundColor: 'rgba(255, 255, 255, 0.05)', borderColor: 'rgba(255,255,255,0.15)', borderWidth: 1 }]} onPress={() => setGameVisible(true)}>
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

                                {/* 🔥 UNIQUE MEMORY MATCH GAME ICON (Perfect Round Fit) 🔥 */}
                                <TouchableOpacity
                                    onPress={() => setGlassPathVisible(true)}
                                    style={[styles.gameBtnSmall, {
                                        borderColor: '#A855F7',
                                        borderWidth: 1.5,
                                        backgroundColor: 'rgba(168, 85, 247, 0.2)'
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

                                <TouchableOpacity style={styles.giftBtnSmall} onPress={() => setShowGiftModal(true)}>
                                    <Ionicons name="gift" size={22} color="#EC4899" />
                                </TouchableOpacity>
                                {(isHost || mySeatIndex !== null) && (
                                    <TouchableOpacity style={[styles.actionBtnSmall, { backgroundColor: isMuted ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)' }]} onPress={toggleMic}>
                                        <Ionicons name={isMuted ? "mic-off" : "mic"} size={22} color={isMuted ? "#EF4444" : "#10B981"} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </BlurView>
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView>

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
                            </LinearGradient>
                        </Animated.View>
                    </View>
                )}
            </View>

            <Modal visible={showGiftModal} transparent animationType="slide">
                <TouchableOpacity style={{flex: 1}} onPress={() => setShowGiftModal(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity activeOpacity={1} style={{width: '100%'}}>
                            <BlurView intensity={100} tint="dark" style={styles.premiumGiftSheet}>
                                <View style={styles.giftSheetHeader}>
                                    <Text style={styles.premiumSheetTitle}>SEND PREMIUM GIFT 🎁</Text>
                                    <View style={styles.balanceBadge}><Text style={styles.balanceText}>💎 {userData?.balance || 0}</Text></View>
                                </View>
                                <FlatList data={GIFTS} numColumns={4} renderItem={({ item }) => (
                                    <TouchableOpacity style={styles.premiumGiftCard} onPress={() => handleSendGift(item)}>
                                        <LinearGradient colors={item.colors as any} style={styles.premiumGiftIconBox}><Text style={{fontSize: 30}}>{item.icon}</Text></LinearGradient>
                                        <Text style={styles.premiumPriceText}>💎 {item.price}</Text>
                                        <Text style={styles.premiumNameText}>{item.name}</Text>
                                    </TouchableOpacity>
                                )} />
                            </BlurView>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
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
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(239,68,68,0.1)', justifyContent: 'center', alignItems: 'center' },
    roomInfo: { flex: 1, marginLeft: 15 },
    roomName: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    hostName: { color: '#64748B', fontSize: 11, fontWeight: '600' },
    balanceBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59,130,246,0.15)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
    balanceText: { color: '#3B82F6', fontSize: 11, fontWeight: '900' },
    seatsContainer: { height: height * 0.3, justifyContent: 'center' },
    seatsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 15 },
    seatWrapper: { alignItems: 'center', width: width * 0.2 },
    seatCircle: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }, 
    occupiedSeat: { borderColor: '#3B82F6' },
    seatAvatar: { width: '100%', height: '100%', borderRadius: 27.5 },
    seatStatusDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#020617' },
    muteOverlay: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.5)', width: '100%', height: '100%', borderRadius: 27.5, justifyContent: 'center', alignItems: 'center' },
    seatName: { color: '#94A3B8', fontSize: 9, fontWeight: '700', marginTop: 5 },
    chatArea: { flex: 1, paddingHorizontal: 20, marginBottom: 10 },
    chatBubble: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 12, marginBottom: 6, alignSelf: 'flex-start' },
    chatName: { color: '#3B82F6', fontWeight: '900', fontSize: 12 },
    chatText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
    
    // 🔥 SATTI FIX: ROYAL GIFT BUBBLE STYLES 🔥
    giftChatBubble: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15, marginBottom: 8, alignSelf: 'center', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.4)' },
    giftChatText: { color: '#FFF', fontWeight: '900', fontSize: 13, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 5 },

    bottomArea: { paddingHorizontal: 15, paddingBottom: 20 },
    reactionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginBottom: 10 },
    reactionBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 6, borderRadius: 15 },
    controlsBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    chatInputField: { flex: 1, color: '#FFF', fontSize: 13, fontWeight: '600' },
    sendBtn: { paddingHorizontal: 10 },
    actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    gameBtnSmall: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(245, 158, 11, 0.1)', justifyContent: 'center', alignItems: 'center' },
    giftBtnSmall: { width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(236,72,153,0.1)', justifyContent: 'center', alignItems: 'center' },
    actionBtnSmall: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    topOverlayLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1000, elevation: 1000 },
    lottieContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    giftAnimationContainer: { alignItems: 'center', justifyContent: 'center' },
    giftAnimIcon: { fontSize: 150, textShadowColor: 'rgba(255,255,255,0.8)', textShadowRadius: 40 },
    giftAnimLabel: { alignItems: 'center', marginTop: -15, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25 },
    giftAnimSender: { color: '#3B82F6', fontSize: 16, fontWeight: '900', letterSpacing: 1.2 },
    modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    premiumGiftSheet: { width: '100%', height: height * 0.4, borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 15, overflow: 'hidden' },
    giftSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    premiumSheetTitle: { color: '#FFF', fontWeight: '900' },
    premiumGiftCard: { width: (width - 30) / 4, alignItems: 'center', marginVertical: 10 },
    premiumGiftIconBox: { width: 55, height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center' },
    premiumPriceText: { color: '#3B82F6', fontSize: 10, fontWeight: '900', marginTop: 5 },
    premiumNameText: { color: '#94A3B8', fontSize: 9, fontWeight: '700' }
});