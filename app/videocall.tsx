import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as KeepAwake from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
    addDoc, collection,
    doc, getDoc,
    increment, onSnapshot, orderBy, query,
    serverTimestamp, setDoc, updateDoc
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Easing,
    FlatList,
    Image,
    KeyboardAvoidingView,
    PanResponder,
    PermissionsAndroid,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import createAgoraRtcEngine, {
    ChannelProfileType,
    ClientRoleType,
    IRtcEngine,
    RtcSurfaceView
} from 'react-native-agora';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

// ✅ SVG Imports for Round Timer
import Svg, { Circle } from 'react-native-svg';

// ✅ GAME LOGIC IMPORT
import GameOverlay from '../components/GameOverlay';
import { checkWinner } from '../utils/gameLogic';

const { width, height } = Dimensions.get('window');
const AGORA_APP_ID = '718cedc3c47e44d1bfa4853d6ac6cd80'; 

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function VideoCallScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    
    // Call Params
    const expertId = params.expertId as string;
    const expertName = params.expertName as string;
    const callId = params.callId as string;
    const role = (params.role as string) || (auth.currentUser?.uid === expertId ? 'expert' : 'user'); 
    
    // Agora Refs & State
    const engine = useRef<IRtcEngine | null>(null);
    const [joined, setJoined] = useState(false);
    const [remoteUid, setRemoteUid] = useState<number | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isCallAccepted, setIsCallAccepted] = useState(role !== 'expert'); 
    const [isRinging, setIsRinging] = useState(role === 'expert');
    
    // 🔥 DOUBLE CALCULATION PROTECTION STATE
    const [isFinishing, setIsFinishing] = useState(false);
    const databaseUpdated = useRef(false); 

    // ⏲️ AUTO-CUT & TIMER BAR ANIMATION
    const ringTimerAnim = useRef(new Animated.Value(1)).current; 

    // ✅ Caller Name Handling
    const [callerDisplayName, setCallerDisplayName] = useState(params.callerName as string || "TalkPe User");

    // 💰 BILLING & TIMER STATES
    const [secondsElapsed, setSecondsElapsed] = useState(0);
    const [showLowBalanceWarning, setShowLowBalanceWarning] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null); 
    const [currentBalance, setCurrentBalance] = useState<number | null>(null); 
    const [showSummary, setShowSummary] = useState(false);
    const [finalAmount, setFinalAmount] = useState(0);
    const [finalDuration, setFinalDuration] = useState(0);
    const startTimeRef = useRef<number | null>(null);
    const user = auth.currentUser;

    // 🔥 LOCAL DIAMOND TRACKER STATE
    const [localBalance, setLocalBalance] = useState<number>(0);
    const diamondRatePerMin = 2000;
    const ratePerSecond = diamondRatePerMin / 60;

    // 🔥 RED PULSE ANIMATION STATE
    const pulseAnim = useRef(new Animated.Value(0)).current;
    
    // 💬 CHAT STATES
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [isChatVisible, setIsChatVisible] = useState(false);

    // 🎮 SYNCED GAME STATES
    const [isGameVisible, setIsGameVisible] = useState(false);
    const [board, setBoard] = useState(Array(9).fill(null));
    const [isXNext, setIsXNext] = useState(true);

    // 🎥 FLOATING VIDEO DRAG LOGIC
    const pan = useRef(new Animated.ValueXY({ x: width - 120, y: 110 })).current;
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                // @ts-ignore
                pan.setOffset({ x: pan.x._value, y: pan.y._value });
            },
            onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
            onPanResponderRelease: () => { pan.flattenOffset(); },
        })
    ).current;

    // 🔥 Pulse Animation logic for Red Alert (ONLY FOR USER)
    useEffect(() => {
        if (role !== 'expert' && remainingSeconds !== null && remainingSeconds <= 15 && joined && remoteUid && !showSummary) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: false, easing: Easing.inOut(Easing.ease) }),
                    Animated.timing(pulseAnim, { toValue: 0, duration: 500, useNativeDriver: false, easing: Easing.inOut(Easing.ease) })
                ])
            ).start();
        } else {
            pulseAnim.stopAnimation();
            pulseAnim.setValue(0);
        }
    }, [remainingSeconds, joined, remoteUid, role]);

    // 🔥 AUTOMATIC DAILY RESET LOGIC
    useEffect(() => {
        const checkDailyReset = async () => {
            if (role === 'expert' && expertId) {
                try {
                    const expertSnap = await getDoc(doc(db, "users", expertId));
                    if (expertSnap.exists()) {
                        const expertData = expertSnap.data();
                        const today = new Date().toISOString().split('T')[0];
                        const lastResetDate = expertData.lastBonusDate || "";

                        if (today !== lastResetDate) {
                            await updateDoc(doc(db, "users", expertId), {
                                todayBeans: 0,
                                todayMinutes: 0,
                                milestone_100k: false,
                                milestone_300k: false,
                                milestone_500k: false,
                                lastBonusDate: today
                            });
                        }
                    }
                } catch (e) {}
            }
        };
        if (joined && remoteUid) checkDailyReset();
    }, [joined, remoteUid, role, expertId]);

    useEffect(() => {
        const enableKeepAwake = async () => {
            try {
                await KeepAwake.activateKeepAwakeAsync('TalkPe_Call_Active');
            } catch (e) {}
        };
        enableKeepAwake();

        if (!callId) return;

        const fetchCallerData = async () => {
            try {
                const callSnap = await getDoc(doc(db, "calls", callId));
                if (callSnap.exists()) {
                    const cData = callSnap.data();
                    const cUid = cData.callerId;
                    if (cUid) {
                        const userSnap = await getDoc(doc(db, "users", cUid));
                        if (userSnap.exists()) {
                            const uData = userSnap.data();
                            const realName = uData.userName || uData.name || uData.displayName || "TalkPe User";
                            setCallerDisplayName(realName);
                            await updateDoc(doc(db, "calls", callId), { callerName: realName, status: 'ringing' });
                        }
                    }
                }
            } catch (error) {}
        };

        if (role === 'expert') {
            fetchCallerData();
            ringTimerAnim.setValue(1);
            Animated.timing(ringTimerAnim, {
                toValue: 0,
                duration: 10000, 
                easing: Easing.linear,
                useNativeDriver: false,
            }).start(({ finished }) => {
                if (finished && !isCallAccepted && !remoteUid) {
                    onRejectCall(); 
                }
            });
        }

        if (role !== 'expert') {
            setDoc(doc(db, "calls", callId), {
                callerId: user?.uid,
                callerName: user?.displayName || "Anjali", 
                expertId: expertId,
                status: 'ringing',
                createdAt: serverTimestamp()
            }, { merge: true });
            setTimeout(() => { if (!remoteUid && !isCallAccepted) handleCallEnd(false); }, 15000);
        }

        const q = query(collection(db, "calls", callId, "messages"), orderBy("timestamp", "asc"));
        const unsubChat = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            if (msgs.length > 0) {
                const lastMsg: any = msgs[msgs.length - 1];
                if (lastMsg.senderId !== user?.uid) setIsChatVisible(true);
            }
            setMessages(msgs);
        });
        
        const unsubStatus = onSnapshot(doc(db, "calls", callId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.callerName) setCallerDisplayName(data.callerName);
                if (data.status === 'accepted') {
                    ringTimerAnim.stopAnimation();
                    setIsRinging(false);
                    setIsCallAccepted(true);
                }
                if (data.lowBalanceAlert !== undefined) setShowLowBalanceWarning(data.lowBalanceAlert);

                if ((data.status === 'rejected' || data.status === 'ended' || data.status === 'cancelled') && !showSummary) {
                    handleCallEnd(data.status === 'ended');
                }
            }
        });

        return () => { 
            unsubStatus(); 
            unsubChat(); 
            KeepAwake.deactivateKeepAwake('TalkPe_Call_Active').catch(() => {});
        };
    }, [callId, remoteUid, showSummary, role]);

    // Game Sync
    useEffect(() => {
        if (!callId) return;
        const unsubGame = onSnapshot(doc(db, "calls", callId, "game", "state"), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.board) setBoard(data.board);
                if (data.isXNext !== undefined) setIsXNext(data.isXNext);
                if (data.isVisible !== undefined) setIsGameVisible(data.isVisible);
            }
        });
        return () => unsubGame();
    }, [callId]);

    // User Balance Monitor
    useEffect(() => {
        const targetUserId = role === 'expert' ? params.callerId : user?.uid;
        if (targetUserId && typeof targetUserId === 'string' && targetUserId.trim() !== "") {
            const unsubscribe = onSnapshot(doc(db, 'users', targetUserId), (docSnap) => {
                if (docSnap.exists()) {
                    const bal = docSnap.data().balance || 0;
                    setCurrentBalance(bal);
                    if (localBalance === 0) setLocalBalance(bal);
                }
            }, (error) => {
                console.log("Balance Listener Error:", error);
            });
            return () => unsubscribe();
        }
    }, [user?.uid, role, params.callerId]);

    // 🔥 TRACKER & AUTO-CUT (Exact 1s Cut Logic)
    useEffect(() => {
        let interval: any; 
        if (joined && remoteUid && !showSummary) {
            interval = setInterval(() => {
                setSecondsElapsed(prev => prev + 1);

                if (role !== 'expert') {
                    setLocalBalance(prevBal => {
                        const nextBal = prevBal - ratePerSecond;
                        const totalRemainingSecs = Math.floor(nextBal / ratePerSecond);
                        setRemainingSeconds(totalRemainingSecs);

                        if (nextBal <= 1000 && !showLowBalanceWarning) {
                            updateDoc(doc(db, "calls", callId), { lowBalanceAlert: true }).catch(()=>{});
                        }

                        // 🔥 SECURITY CUT: Stop 1 second before reaching 0 to prevent loss
                        if (nextBal <= ratePerSecond) {
                            clearInterval(interval);
                            handleCallEnd(true);
                            return 0;
                        }
                        return nextBal;
                    });
                } else {
                    if (currentBalance !== null) {
                        const currentRemoteSecs = Math.floor(currentBalance / ratePerSecond);
                        setRemainingSeconds(currentRemoteSecs);
                        setLocalBalance(currentBalance);
                    }
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [joined, remoteUid, showSummary, role, currentBalance, showLowBalanceWarning]);

    useEffect(() => {
        const init = async () => {
            if (Platform.OS === 'android') {
                try {
                    await PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                        PermissionsAndroid.PERMISSIONS.CAMERA,
                    ]);
                } catch (err) {}
            }
            if (isCallAccepted) {
                setTimeout(() => setupVideoSDKEngine(), 500);
            }
        };
        init();
        return () => { 
            engine.current?.leaveChannel();
            engine.current?.release(); 
            engine.current = null;
        };
    }, [isCallAccepted]);

    const setupVideoSDKEngine = async () => {
        try {
            if (engine.current) return;
            engine.current = createAgoraRtcEngine();
            const rtcEngine = engine.current;
            rtcEngine.initialize({ appId: AGORA_APP_ID });
            rtcEngine.enableVideo();
            rtcEngine.startPreview(); 
            rtcEngine.enableAudio();
            rtcEngine.registerEventHandler({
                onJoinChannelSuccess: () => setJoined(true),
                onUserJoined: (_, uid) => { 
                    setRemoteUid(uid); 
                    startTimeRef.current = Date.now(); 
                },
                onUserOffline: () => handleCallEnd(true),
            });
            rtcEngine.joinChannel('', callId || 'test_room', 0, {
                clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                channelProfile: ChannelProfileType.ChannelProfileCommunication,
            });
        } catch (e) {}
    };

    const onAcceptCall = async () => {
        ringTimerAnim.stopAnimation(); 
        if (callId) await updateDoc(doc(db, "calls", callId), { status: 'accepted' });
        setIsRinging(false);
        setIsCallAccepted(true);
    };

    const onRejectCall = async () => {
        ringTimerAnim.stopAnimation(); 
        if (callId) await updateDoc(doc(db, "calls", callId), { status: 'rejected' });
        setIsRinging(false);
        handleCallEnd(false);
    };

    const handleCallEnd = async (shouldDeduct = true) => {
        if (isFinishing || showSummary) return;
        setIsFinishing(true);

        if (engine.current) {
            engine.current.leaveChannel();
            engine.current.release();
            engine.current = null;
        }

        if (callId) {
            await updateDoc(doc(db, "calls", callId), { status: 'ended' }).catch(()=>{});
        }

        let duration = 0;
        let calculatedDiamonds = 0;
        if (startTimeRef.current) {
            // 🔥 PRECISE BILLING CALCULATION
            const rawDuration = Math.floor((Date.now() - startTimeRef.current) / 1000);
            duration = Math.max(0, rawDuration);
            
            // Capping logic for stability
            const billingSeconds = (duration > 60 && duration <= 65) ? 60 : duration;
            
            const possibleDiamonds = Math.floor(billingSeconds * (2000 / 60)); 
            calculatedDiamonds = (currentBalance !== null && possibleDiamonds > currentBalance) ? Math.floor(currentBalance) : possibleDiamonds;
        }
        
        // 🔥 STRICT 50% PAYOUT: Ensuring 2000 Diamonds = Exactly 1000 Beans
        const amountToShow = role === 'expert' ? Math.floor(Math.floor(calculatedDiamonds) / 2) : calculatedDiamonds;
        setFinalAmount(amountToShow);
        setFinalDuration(duration);
        setShowSummary(true);

        if (shouldDeduct && duration > 5 && !databaseUpdated.current) {
            databaseUpdated.current = true; 
            
            try {
                const callMins = Math.max(1, Math.floor(duration / 60));

                if (role === 'expert') {
                    // 🔥 Fixed Integer Payout Logic
                    const expertEarnings = Math.floor(Math.floor(calculatedDiamonds) / 2);
                    const expertSnap = await getDoc(doc(db, "users", expertId));
                    
                    if (expertSnap.exists()) {
                        const expertData = expertSnap.data();
                        const currentTodayBeans = (expertData.todayBeans || 0) + expertEarnings;
                        let bonusToCredit = 0;
                        let milestoneUpdates = {};

                        if (currentTodayBeans >= 500000 && !expertData.milestone_500k) {
                            bonusToCredit = 15000; milestoneUpdates = { milestone_500k: true };
                        } else if (currentTodayBeans >= 300000 && !expertData.milestone_300k) {
                            bonusToCredit = 10000; milestoneUpdates = { milestone_300k: true };
                        } else if (currentTodayBeans >= 100000 && !expertData.milestone_100k) {
                            bonusToCredit = 5000; milestoneUpdates = { milestone_100k: true };
                        }

                        await updateDoc(doc(db, "users", expertId), { 
                            walletBalance: increment(expertEarnings + bonusToCredit),
                            beans: increment(expertEarnings + bonusToCredit),
                            totalBeansEarned: increment(expertEarnings),
                            todayBeans: increment(expertEarnings), 
                            totalCalls: increment(1), 
                            totalMinutes: increment(callMins), 
                            todayMinutes: increment(callMins), 
                            lastCallFrom: callerDisplayName || "User",
                            topCallerName: callerDisplayName || "User",
                            longestCallDuration: duration > (expertData.longestCallDuration || 0) ? duration : (expertData.longestCallDuration || 0),
                            ...milestoneUpdates
                        });

                        await addDoc(collection(db, "transactions"), {
                            userId: params.callerId || 'user', expertId: expertId, expertName: expertName || 'Expert',
                            diamonds: Math.floor(calculatedDiamonds), beans: expertEarnings,
                            duration: duration, type: 'video_call', status: 'completed', timestamp: serverTimestamp()
                        });
                    }
                } else {
                    await updateDoc(doc(db, "users", user!.uid), { 
                        balance: increment(-Math.floor(calculatedDiamonds)) 
                    });
                }
            } catch (error) {
                console.log("DB Update Error:", error);
            }
        }

        setTimeout(() => {
            router.replace(role === 'expert' ? '/expert/dashboard' : '/(tabs)');
        }, 3500); 
    };

    const sendMessage = async () => {
        if (inputText.trim() === '' || !callId) return;
        const text = inputText;
        setInputText('');
        try {
            await addDoc(collection(db, "calls", callId, "messages"), {
                text: text, senderId: user?.uid, senderRole: role, timestamp: serverTimestamp()
            });
        } catch (e) {}
    };

    const winner = (board && typeof checkWinner === 'function') ? checkWinner(board) : null;

    const handleSquareClick = async (index: number) => {
        if (!board || board[index] || winner) return;
        const isUserTurn = (role !== 'expert' && isXNext);
        const isExpertTurn = (role === 'expert' && !isXNext);
        if (!isUserTurn && !isExpertTurn) return; 
        const newBoard = [...board];
        newBoard[index] = isXNext ? 'X' : 'O';
        try {
            await setDoc(doc(db, "calls", callId, "game", "state"), {
                board: newBoard, isXNext: !isXNext, isVisible: true, gameType: 'tictactoe'
            }, { merge: true });
        } catch (e) {}
    };

    const toggleGameVisibility = async () => {
        try {
            await setDoc(doc(db, "calls", callId, "game", "state"), { isVisible: !isGameVisible }, { merge: true });
        } catch (e) {}
    };

    const resetGame = async () => {
        try {
            await setDoc(doc(db, "calls", callId, "game", "state"), {
                board: Array(9).fill(null), isXNext: true, isVisible: true, gameType: 'tictactoe'
            }, { merge: true });
        } catch (e) {}
    };

    const formatTime = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = Math.floor(totalSeconds % 60);
        return `${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
    };

    const radius = 80;
    const stroke = 6;
    const circumference = radius * 2 * Math.PI;

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            
            <Animated.View 
                style={[styles.redAlertOverlay, { opacity: pulseAnim.interpolate({inputRange: [0, 1], outputRange: [0, 0.45]}) }]} 
                pointerEvents="none" 
            />

            <View style={StyleSheet.absoluteFill}>
                {remoteUid ? (
                    <RtcSurfaceView canvas={{ uid: remoteUid }} style={styles.fullVideo} />
                ) : (
                    <View style={styles.waitingBox}>
                        <LinearGradient colors={['#020617', '#1E293B']} style={StyleSheet.absoluteFill} />
                        <MaterialCommunityIcons name="video-wireless-outline" size={80} color="#3B82F6" />
                        <Text style={styles.waitingText}>Connecting to Encrypted Stream...</Text>
                    </View>
                )}
            </View>

            <GameOverlay
                isVisible={isGameVisible} gameType="tictactoe" board={board}
                isXNext={isXNext} winner={winner} expertName={expertName}
                onClose={toggleGameVisibility} onSquareClick={handleSquareClick} onReset={resetGame}
            />

            {joined && !showSummary && (
                <Animated.View {...panResponder.panHandlers} style={[styles.localVideoFloating, { transform: pan.getTranslateTransform() }]}>
                    <RtcSurfaceView canvas={{ uid: 0 }} style={styles.innerVideo} zOrderMediaOverlay={true} />
                </Animated.View>
            )}

            {isCallAccepted && !showSummary && (
                <View style={styles.topHeader}>
                    <View style={[styles.statusBadge, showLowBalanceWarning && {backgroundColor: '#EF4444'}]}>
                        <View style={styles.liveDot} />
                        <Text style={styles.liveText}>{formatTime(secondsElapsed)}</Text>
                        
                        {role !== 'expert' && remainingSeconds !== null && remainingSeconds <= 10 && (
                            <View style={styles.balanceTag}>
                                <MaterialCommunityIcons name="diamond-stone" size={14} color="#FFF" />
                                <Text style={styles.balanceText}>{Math.floor(localBalance)}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.callerNameText}>{role === 'expert' ? callerDisplayName : expertName}</Text>
                </View>
            )}

            {isRinging && role === 'expert' && (
                <View style={styles.ringingOverlay}>
                    <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.callerInfo}>
                        <View style={styles.roundTimerContainer}>
                            <Svg width={(radius + stroke) * 2} height={(radius + stroke) * 2} style={styles.absSvg}>
                                <Circle cx={radius + stroke} cy={radius + stroke} r={radius} stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} fill="transparent" />
                                <AnimatedCircle
                                    cx={radius + stroke} cy={radius + stroke} r={radius} stroke="#3B82F6" strokeWidth={stroke} fill="transparent"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={ringTimerAnim.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })}
                                    strokeLinecap="round"
                                />
                            </Svg>
                            <Image source={{ uri: `https://ui-avatars.com/api/?name=${callerDisplayName || "User"}&background=3B82F6&color=fff&size=256` }} style={styles.callerAvatar} />
                        </View>
                        <Text style={styles.incomingLabel}>Incoming Video Request</Text>
                        <Text style={styles.callerName}>{callerDisplayName || "TalkPe User"}</Text>
                    </View>
                    <View style={styles.ringingActions}>
                        <TouchableOpacity style={[styles.ringBtn, styles.rejectBtn]} onPress={onRejectCall}><Ionicons name="close" size={42} color="#FFF" /></TouchableOpacity>
                        <TouchableOpacity style={[styles.ringBtn, styles.acceptBtn]} onPress={onAcceptCall}><Ionicons name="videocam" size={38} color="#FFF" /></TouchableOpacity>
                    </View>
                </View>
            )}

            {showSummary && (
                <View style={styles.summaryOverlay}>
                    <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={styles.summaryCard}>
                        <MaterialCommunityIcons name={role === 'expert' ? "seed" : "diamond-stone"} size={60} color={role === 'expert' ? "#fbbf24" : "#3B82F6"} />
                        <Text style={styles.summaryTitle}>Call Session Summary</Text>
                        <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Total Duration</Text><Text style={styles.summaryValue}>{formatTime(finalDuration)}</Text></View>
                        <View style={[styles.summaryRow, styles.totalRow]}>
                            <Text style={styles.summaryLabel}>{role === 'expert' ? 'Net Beans Earned' : 'Diamonds Deducted'}</Text>
                            <Text style={[styles.summaryValue, { color: role === 'expert' ? '#fbbf24' : '#3B82F6' }]}>{finalAmount}</Text>
                        </View>
                    </View>
                </View>
            )}

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }} pointerEvents="box-none">
                <View style={styles.uiWrapper} pointerEvents="box-none">
                    {isChatVisible && (
                        <View style={styles.floatingChatContainer}>
                            <BlurView intensity={60} tint="dark" style={styles.chatBlurBox}>
                                <View style={styles.chatHeaderMini}>
                                    <Text style={styles.chatTitle}>Secure Live Chat</Text>
                                    <TouchableOpacity onPress={() => setIsChatVisible(false)}><Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.4)" /></TouchableOpacity>
                                </View>
                                <FlatList
                                    data={messages}
                                    keyExtractor={(item) => item.id}
                                    style={styles.miniChatList}
                                    showsVerticalScrollIndicator={false}
                                    renderItem={({ item }) => (
                                        <View style={[styles.miniBubble, item.senderId === user?.uid ? styles.myMiniChat : styles.theirMiniChat]}>
                                            <Text style={styles.miniChatText}>{item.text}</Text>
                                        </View>
                                    )}
                                />
                                <View style={styles.miniInputRow}>
                                    <TextInput style={styles.miniInput} placeholder="Type a message..." placeholderTextColor="#94A3B8" value={inputText} onChangeText={setInputText} />
                                    <TouchableOpacity onPress={sendMessage} style={styles.miniSendBtn}><Ionicons name="send" size={20} color="#3B82F6" /></TouchableOpacity>
                                </View>
                            </BlurView>
                        </View>
                    )}

                    {isCallAccepted && !showSummary && (
                        <View style={styles.bottomControlsArea}>
                            {showLowBalanceWarning && (
                                <View style={[styles.warningFloating, (remainingSeconds && remainingSeconds <= 30) ? {backgroundColor: '#B91C1C'} : {}]}>
                                    <Ionicons name="alert-circle" size={18} color="#FFF" />
                                    <Text style={styles.warningText}>
                                        {remainingSeconds && remainingSeconds <= 30 
                                            ? `Call will cut in ${remainingSeconds}s` 
                                            : "User Low Balance! Call may end soon."}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.buttonsRow}>
                                <TouchableOpacity style={[styles.blurBtn, isGameVisible && styles.activeBtn]} onPress={toggleGameVisibility}>
                                    <Ionicons name="game-controller" size={26} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.blurBtn} onPress={() => { engine.current?.muteLocalAudioStream(!isMuted); setIsMuted(!isMuted); }}>
                                    <Ionicons name={isMuted ? "mic-off" : "mic"} size={26} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.hangupBtn} onPress={() => handleCallEnd(true)}>
                                    <Ionicons name="call" size={34} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity style={[styles.blurBtn, isChatVisible && styles.activeBtn]} onPress={() => setIsChatVisible(!isChatVisible)}>
                                    <Ionicons name="chatbubble-ellipses" size={26} color="#FFF" />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.blurBtn} onPress={() => engine.current?.switchCamera()}>
                                    <Ionicons name="camera-reverse" size={26} color="#FFF" />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    redAlertOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'red', zIndex: 10 },
    fullVideo: { flex: 1 },
    uiWrapper: { flex: 1, justifyContent: 'flex-end' },
    localVideoFloating: { width: 110, height: 160, position: 'absolute', borderRadius: 20, borderWidth: 2, borderColor: '#3B82F6', zIndex: 100, backgroundColor: '#000', overflow: 'hidden', elevation: 10 },
    innerVideo: { flex: 1 },
    topHeader: { position: 'absolute', top: 40, left: 20, zIndex: 20 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 25 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 10 },
    liveText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    balanceTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(59, 130, 246, 0.4)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginLeft: 10 },
    balanceText: { color: '#FFF', fontSize: 13, fontWeight: '700', marginLeft: 4 },
    callerNameText: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 12, textShadowColor: '#000', textShadowRadius: 15 },
    floatingChatContainer: { position: 'absolute', bottom: 130, left: 15, right: 15, maxHeight: 220, zIndex: 30 },
    chatBlurBox: { borderRadius: 25, padding: 15, overflow: 'hidden', backgroundColor: 'rgba(15, 23, 42, 0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    chatHeaderMini: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    chatTitle: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1 },
    miniChatList: { maxHeight: 100 }, 
    miniBubble: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 15, marginBottom: 6, maxWidth: '85%' },
    myMiniChat: { alignSelf: 'flex-end', backgroundColor: '#3B82F6' },
    theirMiniChat: { alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)' },
    miniChatText: { color: '#FFF', fontSize: 14, fontWeight: '500' },
    miniInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 25, paddingHorizontal: 15, marginTop: 10, height: 45 },
    miniInput: { flex: 1, color: '#FFF', fontSize: 14 },
    miniSendBtn: { marginLeft: 10 },
    bottomControlsArea: { width: '100%', alignItems: 'center', marginBottom: 40, zIndex: 40 },
    buttonsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', width: '100%' },
    blurBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    activeBtn: { backgroundColor: '#3B82F6', borderColor: '#60A5FA' },
    hangupBtn: { width: 75, height: 75, borderRadius: 37.5, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '135deg' }], elevation: 8 },
    ringingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 200, justifyContent: 'center', alignItems: 'center' },
    roundTimerContainer: { width: 180, height: 180, justifyContent: 'center', alignItems: 'center', position: 'relative' },
    absSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
    callerInfo: { alignItems: 'center', marginBottom: 60 },
    callerAvatar: { width: 140, height: 140, borderRadius: 70 },
    incomingLabel: { color: '#3B82F6', fontSize: 14, fontWeight: '900', marginTop: 25, textTransform: 'uppercase', letterSpacing: 2 },
    callerName: { color: '#FFF', fontSize: 32, fontWeight: '900', marginTop: 5 },
    ringingActions: { flexDirection: 'row', gap: 60 },
    ringBtn: { width: 85, height: 85, borderRadius: 42.5, justifyContent: 'center', alignItems: 'center', elevation: 10 },
    acceptBtn: { backgroundColor: '#22C55E' },
    rejectBtn: { backgroundColor: '#EF4444' },
    summaryOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 1000, justifyContent: 'center', alignItems: 'center' },
    summaryCard: { width: '88%', backgroundColor: 'rgba(15, 23, 42, 0.98)', borderRadius: 35, padding: 35, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.3)' },
    summaryTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', marginVertical: 25 },
    summaryRow: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 20 },
    summaryLabel: { color: '#94A3B8', fontSize: 16, fontWeight: '600' },
    summaryValue: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    totalRow: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 20 },
    warningFloating: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EF4444', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 15, marginBottom: 20, elevation: 5 },
    warningText: { color: '#FFF', fontSize: 14, fontWeight: '900', marginLeft: 8 },
    waitingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    waitingText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginTop: 15, opacity: 0.8 },
});