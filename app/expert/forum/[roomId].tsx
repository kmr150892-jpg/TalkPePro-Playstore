import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
// 🔥 ADDED getDoc & increment FOR TODAY BEANS SYNC 🔥
import { getDatabase, onDisconnect, onValue, ref, set } from 'firebase/database';
import { addDoc, collection, doc, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
// 🔥 FIXED: Added AppState to detect Force Close and update Firestore 🔥
import { ActivityIndicator, Alert, Animated, AppState, BackHandler, Dimensions, Easing, FlatList, Image, KeyboardAvoidingView, Modal, PermissionsAndroid, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import LottieView from 'lottie-react-native';
import { ChannelProfileType, ClientRoleType, createAgoraRtcEngine, IRtcEngine } from 'react-native-agora';
import { auth, db } from '../../../firebaseConfig';

// 🔥 IMPORT GAME COMPONENT 🔥
import LiveGameSheet from '../../../components/LiveGameSheet';

const { width, height } = Dimensions.get('window');
const AGORA_APP_ID = "718cedc3c47e44d1bfa4853d6ac6cd80"; 

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
    if (beans >= 300000)   return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'], glow: '#94A3B8', next: 1000000, prev: 100000, rate: 2400 };
    if (beans >= 100000)   return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'], glow: 'transparent', next: 300000, prev: 30000, rate: 1800 };
    if (beans >= 30000)    return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'], glow: 'transparent', next: 100000, prev: 0, rate: 1200 };
    return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'], glow: 'transparent', next: 30000, prev: 0, rate: 1000 };
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
    const [isGameVisible, setIsGameVisible] = useState(false); // 🔥 GAME MODAL STATE

    const [messages, setMessages] = useState<any[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [reactions, setReactions] = useState<any[]>([]);

    const agoraEngine = useRef<IRtcEngine | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isAgoraJoined, setIsAgoraJoined] = useState(false);

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
                querySnapshot.forEach(async (roomDoc) => {
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
                                    const senderName = data.senderName || 'Premium Client';
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
        if (isAgoraJoined && expertData && !hasJoinedFired.current) {
            hasJoinedFired.current = true;
            addDoc(collection(db, "forum_rooms", roomId, "messages"), {
                uid: "system",
                name: "System",
                text: `✨ ${expertData?.name || expertData?.userName || "Consultant"} has initiated the session!`,
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
            where("status", "==", "ringing"),
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
                    expertName: expertData?.name || "Consultant",
                    callId: callId,
                    role: 'expert'
                }
            });
        } catch (e) {}
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
            await addDoc(collection(db, "forum_rooms", roomId, "messages"), {
                uid: user.uid,
                name: expertData?.name || "Consultant",
                text: chatInput.trim(),
                timestamp: serverTimestamp()
            });
            setChatInput('');
        } catch (e) { console.log(e); }
    };

    const handleReaction = async (emoji: string) => {
        try {
            await addDoc(collection(db, "forum_rooms", roomId, "reactions"), { emoji, timestamp: serverTimestamp() });
        } catch (e) { console.log(e); }
    };

    const handleSeatClick = async (index: number) => {
        if (!roomData) return;
        const seat = roomData.seats[index];
        if (seat.uid === user?.uid) {
            Alert.alert("Step Down?", "Vacate this position?", [{ text: "Confirm", onPress: async () => {
                const updatedSeats = [...roomData.seats];
                updatedSeats[index] = { uid: null, name: null, image: null, isMuted: false };
                await updateDoc(doc(db, "forum_rooms", roomId), { seats: updatedSeats });
            }}, { text: "Cancel" }]);
            return;
        }
        if (seat.uid) {
            Alert.alert("Consultant Controls 👑", `Disconnect ${seat.name}?`, [{ text: "Confirm", style: "destructive", onPress: async () => {
                const updatedSeats = [...roomData.seats];
                updatedSeats[index] = { uid: null, name: null, image: null, isMuted: false };
                await updateDoc(doc(db, "forum_rooms", roomId), { seats: updatedSeats });
            }}, { text: "Cancel" }]);
            return;
        }
        if (mySeatIndex !== null) return;
        try {
            const updatedSeats = [...roomData.seats];
            const actualName = expertData?.name || expertData?.userName || user?.displayName || "Consultant";
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

    const handleEndForum = () => {
        Alert.alert("Close Forum?", "This will terminate the session.", [
            { text: "Cancel", style: "cancel" },
            { text: "Terminate", style: "destructive", onPress: async () => {
                await updateDoc(doc(db, "forum_rooms", roomId), { status: "ended" });
                router.replace('/expert/dashboard' as any);
            }}
        ]);
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
                            <Text style={styles.hostName}>👑 Consultant {isAgoraJoined ? "• Active" : "• Synchronizing..."}</Text>
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
                                    <Text style={[styles.seatName, seat.uid === user?.uid && { color: '#4F46E5', fontWeight: '900' }]} numberOfLines={1}>{seat.uid === user?.uid ? "YOU" : (seat.uid ? seat.name : `Node ${index + 1}`)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <View style={styles.chatArea}>
                        <FlatList
                            data={messages}
                            keyExtractor={item => item.id}
                            showsVerticalScrollIndicator={false}
                            renderItem={({ item }) => (
                                <View style={[styles.chatBubble, item.isSystem && { backgroundColor: 'rgba(16, 185, 129, 0.1)', alignSelf: 'center', paddingHorizontal: 15 }]}>
                                    {!item.isSystem && <Text style={styles.chatName}>{item.name}: </Text>}
                                    <Text style={[styles.chatText, item.isSystem && { color: '#10B981', fontWeight: 'bold' }]}>{item.text}</Text>
                                </View>
                            )}
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
                                {/* 🔥 GAME LAUNCH BUTTON 🔥 */}
                                <TouchableOpacity style={styles.gameLaunchButton} onPress={() => setIsGameVisible(true)}>
                                    <Text style={{color: '#FFF', fontWeight: '900', fontSize: 10}}>🎮</Text>
                                </TouchableOpacity>
                            </View>
                        </BlurView>
                    </View>
                </KeyboardAvoidingView>
            </SafeAreaView>

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
                                <Text style={styles.giftAnimSender}>{currentGift.senderName} Sent {currentGift.giftName}</Text>
                                <Text style={styles.giftAnimAmount}>⭐ {Math.floor((currentGift.price || currentGift.amount || 0) / 2)} REWARDS</Text>
                            </LinearGradient>
                        </Animated.View>
                    </View>
                )}
            </View>

            {/* 🔥 GAME MODAL 🔥 */}
            <LiveGameSheet 
                visible={isGameVisible} 
                onClose={() => setIsGameVisible(false)} 
                liveId={roomId}
                isHost={user?.uid === roomData?.hostId}
                userWalletBalance={myWalletBalance}
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
                            {callerProfile?.name || callerProfile?.displayName || incomingCall?.userName || incomingCall?.callerName || incomingCall?.name || incomingCall?.displayName || incomingCall?.user_name || "Premium Client"}
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
    chatBubble: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 12, marginBottom: 6, alignSelf: 'flex-start' },
    chatName: { color: '#F59E0B', fontWeight: '900', fontSize: 12 },
    chatText: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
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
});