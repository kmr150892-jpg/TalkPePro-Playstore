import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
// 🔥 FIXED: Added getDocs and limit to the import statement
import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
// 🔥 NEW: RTDB IMPORT FOR PRESENCE SYSTEM 🔥
import { getDatabase, onDisconnect, onValue, ref, set } from 'firebase/database';
import React, { useEffect, useRef, useState } from 'react';
// 🔥 FIXED: Added AppState to detect Force Close and update Firestore 🔥
import { ActivityIndicator, Alert, Animated, AppState, BackHandler, Dimensions, Easing, FlatList, Image, KeyboardAvoidingView, Modal, PermissionsAndroid, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LottieView from 'lottie-react-native';
import { ChannelProfileType, ClientRoleType, createAgoraRtcEngine, IRtcEngine } from 'react-native-agora';
import { auth, db } from '../../../firebaseConfig';

import LiveGameSheet from '../../../components/LiveGameSheet';
import MemoryMatch from '../../../components/MemoryMatch';

const { width, height } = Dimensions.get('window');
const AGORA_APP_ID = "718cedc3c47e44d1bfa4853d6ac6cd80"; 

const REACTION_EMOJIS = ['❤️', '🔥', '😂', '👏', '🙌', '💯'];

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

export default function ExpertForumRoomScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const roomId = params.roomId as string;
    const user = auth.currentUser;

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

    const [waitingList, setWaitingList] = useState<any[]>([]);
    const [waitingModalVisible, setWaitingModalVisible] = useState(false);

    useEffect(() => {
        if (!roomId) return;
        const wq = query(collection(db, "forum_rooms", roomId, "waitingList"), orderBy("requestedAt", "asc"));
        const unsubWaiting = onSnapshot(wq, (snap) => {
            setWaitingList(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });
        return () => unsubWaiting();
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
        const handleAppStateChange = async (nextAppState: string) => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                try {
                    await updateDoc(doc(db, "forum_rooms", roomId), { status: "ended" });
                } catch (error) { console.log(error); }
            }
        };
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => { subscription.remove(); };
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
            const hasPermission = await requestMicrophonePermission();
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

    const toggleMic = () => {
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
            updatedSeats[emptyIdx] = { uid: w.id, name: w.name || 'User', image: w.image || '', isMuted: false };
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
                isMuted: isMuted
            };
            await updateDoc(doc(db, "forum_rooms", roomId), { seats: updatedSeats });
        } catch (e) { console.log(e); }
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
                <LinearGradient colors={['#1E1B4B', '#020617']} style={StyleSheet.absoluteFill} />
                <ActivityIndicator size="large" color="#10B981" />
                <Text style={{ color: '#10B981', marginTop: 15, fontWeight: '900', letterSpacing: 2 }}>ENTERING ARENA...</Text>
            </View>
        );
    }

    if (!roomData) return null;

    return (
        <View style={styles.container}>
            <LinearGradient colors={['#1E1B4B', '#020617']} style={StyleSheet.absoluteFill} />
            <SafeAreaView style={{ flex: 1 }}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
                    <View style={styles.header}>
                        <TouchableOpacity onPress={handleEndForum} style={styles.iconBtn}>
                            <Ionicons name="power" size={24} color="#EF4444" />
                        </TouchableOpacity>
                        <View style={styles.roomInfo}>
                            <Text style={styles.roomName}>{roomData.roomName}</Text>
                            <Text style={styles.hostName}>👑 Host {isAgoraJoined ? "• Active" : "• Synchronizing..."}</Text>
                        </View>
                        <View style={styles.beanBadge}>
                            <MaterialCommunityIcons name="wallet-outline" size={14} color="#F59E0B" />
                            <Text style={styles.beanText}>{expertData?.walletBalance || 0}</Text>
                        </View>
                    </View>

                    <View style={styles.seatsContainer}>
                        <View style={styles.seatsGrid}>
                            {roomData.seats?.map((seat: any, index: number) => (
                                <TouchableOpacity key={index} style={styles.seatWrapper} onPress={() => handleSeatClick(index)}>
                                    <View style={[styles.seatCircle, seat.uid && styles.occupiedSeat, seat.uid === user?.uid && { borderColor: '#4F46E5', borderWidth: 3 }]}>
                                        {seat.uid ? <Image source={{ uri: seat.image }} style={styles.seatAvatar} /> : <MaterialCommunityIcons name="account-voice" size={24} color="rgba(255,255,255,0.03)" />}
                                        {seat.uid && <View style={styles.seatStatusDot} />}
                                        {seat.uid && seat.isMuted && <View style={styles.muteOverlay}><Ionicons name="mic-off" size={14} color="#FFF" /></View>}
                                    </View>
                                    <Text style={[styles.seatName, seat.uid === user?.uid && { color: '#4F46E5', fontWeight: '900' }]} numberOfLines={1}>{seat.uid === user?.uid ? "YOU" : (seat.uid ? seat.name : `Seat ${index + 1}`)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.chatArea}>
                        <FlatList
                            data={messages}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => {
                                return (
                                    <TouchableOpacity 
                                        activeOpacity={0.8} 
                                        onPress={() => handleUserClick(item)}
                                        style={[
                                            styles.chatBubble, 
                                            item.isSystem && { backgroundColor: 'rgba(16, 185, 129, 0.1)', alignSelf: 'center', paddingHorizontal: 15 },
                                            { maxWidth: '95%' }
                                        ]}
                                    >
                                        {!item.isSystem && (
                                            <Text style={styles.chatName}>
                                                {item.name}: 
                                            </Text>
                                        )}
                                        <Text style={[styles.chatText, item.isSystem && { color: '#10B981', fontWeight: 'bold', textAlign: 'center' }]}>{item.text}</Text>
                                    </TouchableOpacity>
                                );
                            }}
                            contentContainerStyle={{ paddingVertical: 10 }}
                        />
                    </View>

                    <View style={styles.bottomArea}>
                        <View style={styles.reactionRow}>
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
                                placeholder="Sync with the forum..."
                                placeholderTextColor="#64748B"
                                style={styles.chatInputField}
                            />
                            <TouchableOpacity 
                                style={[styles.sendIconBtn, { opacity: chatInput.trim() ? 1 : 0.5 }]} 
                                onPress={handleSendChat}
                                disabled={!chatInput.trim()}
                            >
                                <Ionicons name="send" size={20} color="#F59E0B" />
                            </TouchableOpacity>

                            <View style={styles.actionRow}>
                                <TouchableOpacity style={styles.actionBtnSmall} onPress={toggleMic}>
                                    <Ionicons name={isMuted ? "mic-off" : "mic"} size={22} color={isMuted ? "#EF4444" : "#4F46E5"} />
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.actionBtnSmall} onPress={() => setWaitingModalVisible(true)}>
                                    <Ionicons name="hourglass-outline" size={22} color="#F59E0B" />
                                    {waitingList.length > 0 && (
                                        <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                                            <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '900' }}>{waitingList.length}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>

                                <Modal visible={waitingModalVisible} transparent animationType="slide" onRequestClose={() => setWaitingModalVisible(false)}>
                                    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' }}>
                                        <View style={{ maxHeight: height * 0.6, backgroundColor: '#0F172A', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 }}>
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                                                <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '900' }}>⏳ Waiting List ({waitingList.length})</Text>
                                                <TouchableOpacity onPress={() => setWaitingModalVisible(false)}>
                                                    <Ionicons name="close" size={22} color="#FFF" />
                                                </TouchableOpacity>
                                            </View>
                                            {waitingList.length === 0 ? (
                                                <Text style={{ color: '#94A3B8', textAlign: 'center', paddingVertical: 30 }}>Queue is empty</Text>
                                            ) : (
                                                <ScrollView>
                                                    {waitingList.map((w: any) => (
                                                        <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 14 }}>
                                                            <Image source={{ uri: w.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(w.name || 'U')}` }} style={{ width: 44, height: 44, borderRadius: 22 }} />
                                                            <View style={{ flex: 1, marginLeft: 10 }}>
                                                                <Text style={{ color: '#FFF', fontWeight: '800' }} numberOfLines={1}>{w.name || 'User'}</Text>
                                                                <Text style={{ color: '#94A3B8', fontSize: 11 }}>Level {w.lvl || 1} • {getWaitText(w.requestedAt)}</Text>
                                                            </View>
                                                            <TouchableOpacity onPress={() => assignWaitingUser(w)} style={{ backgroundColor: '#10B981', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, marginRight: 8 }}>
                                                                <Text style={{ color: '#020617', fontWeight: '900', fontSize: 11 }}>SEAT</Text>
                                                            </TouchableOpacity>
                                                            <TouchableOpacity onPress={() => removeWaitingUser(w.id)} style={{ backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }}>
                                                                <Text style={{ color: '#EF4444', fontWeight: '900', fontSize: 11 }}>REMOVE</Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    ))}
                                                </ScrollView>
                                            )}
                                        </View>
                                    </View>
                                </Modal>
                                
                                {/* 🔥 NEW: TRIGGER DISCLAIMER FOR REFLEX ARENA INSTEAD OF DIRECT LAUNCH 🔥 */}
                                <TouchableOpacity style={[styles.gameLaunchButton, { backgroundColor: 'rgb(0, 0, 0)', borderColor: 'rgb(0, 229, 255)', borderWidth: 1 }]} onPress={() => { setPendingGameType('reflex'); setDisclaimerVisible(true); }}>
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

                                {/* 🔥 NEW: TRIGGER DISCLAIMER FOR MEMORY MATCH INSTEAD OF DIRECT LAUNCH 🔥 */}
                                <TouchableOpacity 
                                    onPress={() => { setPendingGameType('memory'); setDisclaimerVisible(true); }} 
                                    style={[styles.gameLaunchButton, { borderColor: '#A855F7', borderWidth: 1.5, backgroundColor: 'rgba(168, 85, 247, 0.2)' }]}
                                >
                                    <View style={{ width: 24, height: 24, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 9 }}>🍎</Text>
                                        <Text style={{ fontSize: 9 }}>🍌</Text>
                                        <Text style={{ fontSize: 9 }}>🍇</Text>
                                        <Text style={{ fontSize: 9 }}>🍓</Text>
                                    </View>
                                </TouchableOpacity>
                                
                            </View>
                        </BlurView>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>

            {vipEntry && (
                <Animated.View style={[StyleSheet.absoluteFillObject, { zIndex: 9999, justifyContent: 'center', alignItems: 'center', backgroundColor: vipProgress.interpolate({ inputRange: [0, 1], outputRange: ['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)'] }) }]} pointerEvents="none">
                    <Animated.View style={[styles.vipEntryBannerContainer, { transform: getVipTransform(vipEntry.anim) }]}>
                        <LinearGradient colors={vipEntry.themeBg || ['#0A001A', '#000000']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.vipBannerGradient}>
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

            <Modal visible={ringModalVisible} transparent animationType="fade">
                <BlurView intensity={90} tint="dark" style={styles.ringingOverlay}>
                    <View style={styles.ringingContent}>
                        <Text style={styles.ringConnectingText}>INCOMING UPLINK...</Text>
                        <View style={styles.ringAvatarWrapper}>
                            <Animated.View style={[styles.ringPulseGlow, { transform: [{ scale: pulseAnim }] }]} />
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
                        </View>
                        <Text style={styles.ringExpertName}>
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

                        {roomData?.seats?.some((s: any) => s.uid === selectedUser?.id) && (
                            <>
                                <TouchableOpacity style={styles.actionSheetBtn} onPress={() => handleDisconnectUser(selectedUser?.id)}>
                                    <Ionicons name="mic-off-circle-outline" size={22} color="#F59E0B" />
                                    <Text style={[styles.actionSheetBtnText, { color: '#F59E0B' }]}>Remove from Seat</Text>
                                </TouchableOpacity>
                                <View style={styles.actionSheetDivider} />
                            </>
                        )}

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
                    <View style={[styles.actionSheetContainer, { paddingBottom: Platform.OS === 'ios' ? 50 : 40 }]}>
                        <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
                        <View style={styles.actionSheetHandle} />
                        <Text style={[styles.actionSheetTitle, { marginBottom: 15, color: '#F59E0B' }]}>🛡️ Host Skill Gaming Policy</Text>

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
                            <Ionicons name={disclaimerChecked ? "checkbox" : "square-outline"} size={24} color={disclaimerChecked ? "#10B981" : "#94A3B8"} />
                            <Text style={styles.checkboxText}>I confirm that I understand my role as a Host, that games are free to play, and agree not to disrupt active games.</Text>
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
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 15 },
    iconBtn: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: 'rgba(239,68,68,0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)' },
    roomInfo: { flex: 1, marginLeft: 15 },
    roomName: { color: '#FFF', fontSize: 18, fontWeight: '900' },
    hostName: { color: '#10B981', fontSize: 12, fontWeight: '800' },
    beanBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,158,11,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
    beanText: { color: '#F59E0B', fontSize: 12, fontWeight: '900', marginLeft: 4 },
    seatsContainer: { height: height * 0.35, justifyContent: 'center' },
    seatsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: width, gap: 15 },
    seatWrapper: { alignItems: 'center', width: width * 0.2 },
    seatCircle: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }, 
    occupiedSeat: { borderColor: '#3B82F6', borderWidth: 2 },
    seatAvatar: { width: '100%', height: '100%', borderRadius: 27.5 },
    seatStatusDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#020617' },
    muteOverlay: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.6)', width: '100%', height: '100%', borderRadius: 27.5, justifyContent: 'center', alignItems: 'center' },
    seatName: { color: '#94A3B8', fontSize: 9, fontWeight: '700', marginTop: 5, textAlign: 'center' },
    chatArea: { flex: 1, paddingHorizontal: 20, marginBottom: 5 },
    chatBubble: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 12, marginBottom: 6, alignSelf: 'flex-start', flexWrap: 'wrap' },
    chatName: { color: '#F59E0B', fontWeight: '900', fontSize: 12 },
    chatText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600', flexShrink: 1 },
    bottomArea: { paddingHorizontal: 15, paddingBottom: 20 },
    reactionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginBottom: 10 },
    reactionBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 6, borderRadius: 15 },
    controlsBox: { flexDirection: 'row', alignItems: 'center', borderRadius: 25, paddingHorizontal: 15, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    chatInputField: { flex: 1, color: '#FFF', fontSize: 13, fontWeight: '600' },
    sendIconBtn: { paddingHorizontal: 8, justifyContent: 'center', alignItems: 'center' },
    actionRow: { flexDirection: 'row', gap: 10 },
    actionBtnSmall: { width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
    gameLaunchButton: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#A855F7', justifyContent: 'center', alignItems: 'center' },
    topOverlayLayer: { ...StyleSheet.absoluteFillObject, zIndex: 1000, elevation: 1000 },
    lottieContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
    giftAnimationContainer: { alignItems: 'center', justifyContent: 'center' },
    giftAnimIcon: { fontSize: 150, textShadowColor: 'rgba(255,255,255,0.8)', textShadowRadius: 40 },
    giftAnimLabel: { alignItems: 'center', marginTop: -15, paddingHorizontal: 30, paddingVertical: 15, borderRadius: 25 },
    giftAnimSender: { color: '#F59E0B', fontSize: 16, fontWeight: '900', letterSpacing: 1.2 },
    giftAnimAmount: { color: '#FFF', fontSize: 32, fontWeight: '900', marginTop: 5, textShadowColor: '#F59E0B', textShadowRadius: 15 },
    ringingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    ringingContent: { alignItems: 'center', justifyContent: 'center' },
    ringConnectingText: { color: '#10B981', fontSize: 14, fontWeight: '900', letterSpacing: 4, marginBottom: 50 },
    ringAvatarWrapper: { justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    ringPulseGlow: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 2, borderColor: '#10B981', opacity: 0.4 },
    ringAvatarContainer: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#10B981', zIndex: 10, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }, 
    ringExpertName: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
    ringTimer: { color: '#94A3B8', fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 50 },
    ringActionRow: { flexDirection: 'row', gap: 40 },
    ringActionBtn: { width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', elevation: 15, shadowOpacity: 0.6, shadowRadius: 15 },

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

    vipEntryBannerContainer: { width: width * 0.95, alignSelf: 'center', borderRadius: 30, elevation: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.8, shadowRadius: 20 },
    vipBannerGradient: { alignItems: 'center', padding: 25, borderRadius: 25, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
    vipBannerAvatar: { width: 250, height: 250, marginBottom: 10 }, 
    vipBannerLabel: { fontSize: 18, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.8)', textShadowRadius: 10 },
    vipBannerName: { color: '#FFF', fontSize: 16, fontWeight: 'bold', textAlign: 'center', lineHeight: 24, paddingHorizontal: 10 },

    // 🔥 NEW: DISCLAIMER STYLES 🔥
    disclaimerBodyText: { color: '#CBD5E1', fontSize: 13, lineHeight: 20, marginBottom: 15 },
    disclaimerBullet: { color: '#CBD5E1', fontSize: 13, lineHeight: 22, marginBottom: 10 },
    disclaimerBold: { fontWeight: 'bold', color: '#FFF' },
    checkboxContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 15, borderRadius: 12 },
    checkboxText: { color: '#94A3B8', fontSize: 11, marginLeft: 10, flex: 1, lineHeight: 18 },
});
