import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as KeepAwake from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ScreenCapture from 'expo-screen-capture';
import { getDatabase, onDisconnect, onValue, ref, set } from 'firebase/database';
import {
    addDoc,
    arrayUnion, // 🔥 SATTI UPDATE: Added arrayUnion for Block Logic
    collection,
    doc, getDoc,
    increment, onSnapshot, orderBy, query,
    serverTimestamp, setDoc, updateDoc, where
} from 'firebase/firestore';
import React, { useContext, useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator, // 🔥 SATTI UPDATE: Added for loading state
    Alert,
    Animated,
    AppState,
    Dimensions,
    Easing,
    Image,
    KeyboardAvoidingView,
    Modal, // 🔥 SATTI UPDATE: Added Modal for Report Screen
    PanResponder,
    PermissionsAndroid,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import createAgoraRtcEngine, {
    ChannelProfileType,
    ClientRoleType,
    IRtcEngine,
    RtcSurfaceView
} from 'react-native-agora';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';

import GameOverlay from '../components/GameOverlay';
import GiftOverlay from '../components/GiftOverlay';
import BottomControls from '../components/videocall/BottomControls';
import CallSummary from '../components/videocall/CallSummary';
import FloatingChat from '../components/videocall/FloatingChat';
import GiftPanel from '../components/videocall/GiftPanel';
import GiftRain from '../components/videocall/GiftRain';
import RingingOverlay from '../components/videocall/RingingOverlay';
import { BlockContext } from '../utils/context/BlockContext';
import { checkWinner } from '../utils/gameLogic';

const { width } = Dimensions.get('window');
const AGORA_APP_ID = '718cedc3c47e44d1bfa4853d6ac6cd80'; 

const getExpertTierRate = (beans: number) => {
    if (beans >= 100000000) return 8000;
    if (beans >= 50000000) return 7000;
    if (beans >= 30000000) return 5400;
    if (beans >= 10000000) return 4800;
    if (beans >= 5000000) return 4200;
    if (beans >= 3000000) return 3600;
    if (beans >= 1000000) return 3000;
    if (beans >= 300000) return 2400; 
    if (beans >= 100000) return 1800; 
    if (beans >= 30000) return 1200;  
    return 1000; 
};

const getQuickDiscoverTierRate = (beans: number) => {
    if (beans >= 100000000) return 4400; 
    if (beans >= 50000000) return 4000;  
    if (beans >= 30000000) return 3600;  
    if (beans >= 10000000) return 3200;  
    if (beans >= 5000000) return 2800;   
    if (beans >= 3000000) return 2400;   
    if (beans >= 1000000) return 2000;   
    if (beans >= 300000) return 1600;    
    if (beans >= 100000) return 1200;    
    if (beans >= 30000) return 1200;     
    return 1000; 
};

export default function VideoCallScreen() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const user = auth.currentUser;
    const { blockUser } = useContext(BlockContext); 
    
    const initialExpertId = (params.expertId as string) || (params.expertID as string) || (params.hostId as string); 
    const [expertIdState, setExpertIdState] = useState<string | undefined>(initialExpertId);
    
    const isConfirmedExpert = user?.uid === expertIdState || user?.uid === initialExpertId || params.role === 'expert';
    const role = isConfirmedExpert ? 'expert' : ((params.role as string)?.toLowerCase() || 'user'); 
    
    const safeExpertId = expertIdState || (role === 'expert' ? user?.uid : "UNKNOWN_EXPERT") as string;

    const [expertName, setExpertName] = useState(params.expertName as string || "Host");
    const callId = params.callId as string;
    const channelName = callId; 
    
    const isQuickDiscover = callId?.startsWith('Discover_');

    const engine = useRef<IRtcEngine | null>(null);
    const [joined, setJoined] = useState(false);
    const [remoteUid, setRemoteUid] = useState<number | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    
    const [isProEnabled, setIsProEnabled] = useState(false);

    const [isCallAccepted, setIsCallAccepted] = useState(role === 'user'); 
    const [isRinging, setIsRinging] = useState(true); 
    
    const [isFinishing, setIsFinishing] = useState(false);
    const databaseUpdated = useRef(false); 
    const callInitRef = useRef(false); 
    const isMounted = useRef(true);

    const ringTimerAnim = useRef(new Animated.Value(1)).current; 
    
    const [callerDisplayName, setCallerDisplayName] = useState(params.callerName as string || "User User");
    const [realCallerId, setRealCallerId] = useState<string | undefined>(params.callerId as string);
    
    const [callerProfilePic, setCallerProfilePic] = useState<string | null>((params.callerImage as string) || (params.callerPic as string) || null);
    const [expertProfilePic, setExpertProfilePic] = useState<string | null>((params.expertImage as string) || (params.expertPic as string) || (params.hostImage as string) || null);

    const [secondsElapsed, setSecondsElapsed] = useState(0);
    const [showLowBalanceWarning, setShowLowBalanceWarning] = useState(false);
    const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null); 
    const [currentBalance, setCurrentBalance] = useState<number | null>(null); 
    const [showSummary, setShowSummary] = useState(false);
    const [finalAmount, setFinalAmount] = useState(0);
    const [finalDuration, setFinalDuration] = useState(0);
    
    const localDurationRef = useRef<number>(0); 
    
    const diamondRateRef = useRef<number>(1200); 
    const [localBalance, setLocalBalance] = useState<number>(0);

    const pulseAnim = useRef(new Animated.Value(0)).current;
    const [messages, setMessages] = useState<any[]>([]);
    const [inputText, setInputText] = useState('');
    const [isChatVisible, setIsChatVisible] = useState(false);
    const [isXNext, setIsXNext] = useState(true);
    const [isGameVisible, setIsGameVisible] = useState(false);
    const [board, setBoard] = useState(Array(9).fill(null));
    const [userData, setUserData] = useState<any>(null); 

    const isFreeCall = params.isFree === "true" || params.isFreeTrial === "true" || params.isTrial === "true"; 
    const [freeTimeLeft, setFreeTimeLeft] = useState(0); 
    const [isFreeModeActive, setIsFreeModeActive] = useState(isFreeCall);
    const initialTrialSecondsRef = useRef<number>(0);

    const [isGiftPanelVisible, setIsGiftPanelVisible] = useState(false);
    const [giftRainVisible, setGiftRainVisible] = useState(false);
    const [activeGiftType, setActiveGiftType] = useState<'diamond' | 'fireworks' | 'confetti'>('diamond');
    const [totalGiftsDiamonds, setTotalGiftsDiamonds] = useState(0);
    const [totalGiftsBeans, setTotalGiftsBeans] = useState(0);

    const [remoteDisconnected, setRemoteDisconnected] = useState(false);

    const [activeGiftOverlay, setActiveGiftOverlay] = useState<any>(null);
    const [expertThemeBeans, setExpertThemeBeans] = useState<number>(0);

    // 🔥 SATTI UPDATE: Block & Report Modal State Variables
    const [blockModalVisible, setBlockModalVisible] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);
    const blockReasons = [
        "Abusive Language / Harassment",
        "Inappropriate Behavior / Nudity",
        "Scam / Spam / Phishing",
        "Threatening / Aggressive",
        "Other Unwanted Contact"
    ];

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

    useEffect(() => {
        isMounted.current = true;
        if (!callId || !user) return;
        
        const rtdb = getDatabase();
        const myPresenceRef = ref(rtdb, `presence_calls/${callId}/${role}`);
        const otherRole = role === 'expert' ? 'user' : 'expert';
        const otherPresenceRef = ref(rtdb, `presence_calls/${callId}/${otherRole}`);
        const connectedRef = ref(rtdb, ".info/connected");
        
        const unsubConnected = onValue(connectedRef, (snap) => {
            if (snap.val() === true) {
                onDisconnect(myPresenceRef).set("ended").then(() => {
                    set(myPresenceRef, "active");
                });
            }
        });

        const unsubOther = onValue(otherPresenceRef, async (snap) => {
            if (snap.exists() && snap.val() === "ended") {
                setRemoteDisconnected(true); 
            }
        });

        return () => { 
            isMounted.current = false;
            unsubConnected();
            unsubOther();
            set(myPresenceRef, "ended"); 
        };
    }, [callId, role, user]);

    useEffect(() => {
        if (remoteDisconnected && !isFinishing) {
            handleCallEnd(true, 'completed', true); 
        }
    }, [remoteDisconnected, isFinishing]);

    useEffect(() => {
        if (!callId) return;
        const handleAppStateChange = async (nextAppState: string) => {
            if (nextAppState === 'background' || nextAppState === 'inactive') {
                if (!isFinishing) {
                    handleCallEnd(true, 'completed');
                }
            }
        };
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => { subscription.remove(); };
    }, [callId, role, safeExpertId, isFinishing]);

    useEffect(() => {
        let unsubCallerPic: (() => void) | undefined;
        let unsubExpertPic: (() => void) | undefined;

        if (realCallerId) {
            unsubCallerPic = onSnapshot(doc(db, "users", realCallerId), (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    const pic = data.profilePic || data.photoURL || data.image || null;
                    if (pic) setCallerProfilePic(pic);
                    if (!params.callerName) {
                         setCallerDisplayName(data.name || data.userName || data.displayName || "User User");
                    }
                }
            });
        }

        if (safeExpertId && safeExpertId !== "UNKNOWN_EXPERT") {
            unsubExpertPic = onSnapshot(doc(db, "users", safeExpertId), (snap) => {
                if (snap.exists()) {
                    const data = snap.data();
                    const pic = data.profilePic || data.photoURL || data.image || null;
                    if (pic) setExpertProfilePic(pic);
                    if (!params.expertName) {
                         setExpertName(data.name || data.userName || data.displayName || "Host");
                    }
                }
            });
        }

        return () => {
            if (unsubCallerPic) unsubCallerPic();
            if (unsubExpertPic) unsubExpertPic();
        };
    }, [realCallerId, safeExpertId]);

    useEffect(() => {
        if (role === 'expert' && isCallAccepted && safeExpertId && safeExpertId !== "UNKNOWN_EXPERT") {
            updateDoc(doc(db, "users", safeExpertId), { isBusy: true }).catch(() => {});
        }
    }, [isCallAccepted, role, safeExpertId]);

    useEffect(() => {
        const fetchFreeTime = async () => {
            if (user?.uid && role !== 'expert') {
                try {
                    const uSnap = await getDoc(doc(db, "users", user.uid));
                    if (uSnap.exists()) {
                        const uData = uSnap.data();
                        setUserData(uData); 
                        const minsRem = uData.freeMinsRemaining || 0;
                        const secsRem = Math.floor(minsRem * 60);
                        setFreeTimeLeft(secsRem);
                        initialTrialSecondsRef.current = secsRem; 
                        
                        if (minsRem > 0) {
                            setIsFreeModeActive(true); 
                        } else {
                            setIsFreeModeActive(false);
                        }
                    }
                } catch (e) {}
            }
        };
        fetchFreeTime();
    }, [user, role]);

    useEffect(() => {
        const activateSecurity = async () => {
            await ScreenCapture.preventScreenCaptureAsync();
        };
        activateSecurity();
        return () => {
            ScreenCapture.allowScreenCaptureAsync();
        };
    }, []);

    useEffect(() => {
        if (remainingSeconds !== null && remainingSeconds <= 10 && joined && remoteUid && !showSummary) {
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
    }, [remainingSeconds, joined, remoteUid]);

    useEffect(() => {
        if (role !== 'expert' || !user?.uid) return;

        const busyQuery = query(
            collection(db, "calls"),
            where("expertId", "==", user.uid),
            where("status", "==", "dialing")
        );

        const unsubBusy = onSnapshot(busyQuery, (snapshot) => {
            snapshot.docChanges().forEach(async (change) => {
                if (change.type === "added") {
                    const newCallId = change.doc.id;
                    if (newCallId !== callId) {
                        try {
                            await updateDoc(doc(db, "calls", newCallId), { status: 'rejected' });
                        } catch (e) {}
                    }
                }
            });
        });

        return () => unsubBusy();
    }, [role, user?.uid, callId]);

    useEffect(() => {
        const enableKeepAwake = async () => {
            try {
                if (isMounted.current) {
                    await KeepAwake.activateKeepAwakeAsync('TalkPe_Call_Active');
                }
            } catch (e) {
                console.log("KeepAwake Error Ignored:", e);
            }
        };
        
        setTimeout(() => enableKeepAwake(), 500);

        if (!callId) return;

        const fetchExpertData = async () => {
            let finalExpertId = safeExpertId;
            let callDocRate = 0;
            if (!expertIdState && callId) {
                const callSnap = await getDoc(doc(db, "calls", callId));
                if (callSnap.exists()) {
                    finalExpertId = callSnap.data().expertId;
                    callDocRate = callSnap.data().userPrice || callSnap.data().pricePerMin || callSnap.data().beansPerMin || 0;
                    setExpertIdState(finalExpertId);
                }
            }
            if (finalExpertId && finalExpertId !== 'UNKNOWN_EXPERT') {
                try {
                    const expertSnap = await getDoc(doc(db, "users", finalExpertId));
                    if (expertSnap.exists()) {
                        const eData = expertSnap.data();
                        if (!params.expertName) setExpertName(eData.name || eData.userName || eData.displayName || "Host");
                        const pic = eData.profilePic || eData.photoURL || null;
                        if (pic && !expertProfilePic) setExpertProfilePic(pic); 
                        
                        const totalBeans = eData.totalBeansEarned || eData.totalBeans || 0;
                        setExpertThemeBeans(totalBeans); 

                        let finalUserPaymentRate = 0;

                        if (isQuickDiscover) {
                            const qmBaseRate = getQuickDiscoverTierRate(totalBeans);
                            finalUserPaymentRate = qmBaseRate * 2; 
                        } else {
                            finalUserPaymentRate = callDocRate || eData.userPrice || eData.pricePerMin || eData.beansPerMin || getExpertTierRate(totalBeans);
                        }

                        diamondRateRef.current = finalUserPaymentRate;
                    }
                } catch (error) {}
            }
        };

        const fetchCallerData = async () => {
            try {
                const callSnap = await getDoc(doc(db, "calls", callId));
                if (callSnap.exists()) {
                    const cData = callSnap.data();
                    const cUid = cData.callerId;
                    if (cUid) {
                        setRealCallerId(cUid); 
                        const userSnap = await getDoc(doc(db, "users", cUid));
                        if (userSnap.exists()) {
                            const uData = userSnap.data();
                            const realName = uData.name || uData.userName || uData.displayName || "User User";
                            if (!params.callerName) setCallerDisplayName(realName);
                            const pic = uData.profilePic || uData.photoURL || null;
                            if (pic && !callerProfilePic) setCallerProfilePic(pic); 
                            
                            await updateDoc(doc(db, "calls", callId), { callerName: params.callerName || realName, status: 'ringing' });
                        }
                    }
                }
            } catch (error) {}
        };

        fetchExpertData(); 

        ringTimerAnim.setValue(1);
        Animated.timing(ringTimerAnim, {
            toValue: 0,
            duration: 12000, 
            easing: Easing.linear,
            useNativeDriver: false,
        }).start(({ finished }) => {
            if (finished && !isCallAccepted && !remoteUid) {
                handleMissedCall(); 
            }
        });

        if (role === 'expert') {
            fetchCallerData();
        } else {
            const initializeUserCall = async () => {
                if (callInitRef.current) return; 
                callInitRef.current = true;

                const callSnap = await getDoc(doc(db, "calls", callId));
                const existingCallData = callSnap.exists() ? callSnap.data() : {};
                
                let currentExpertId = safeExpertId !== "UNKNOWN_EXPERT" ? safeExpertId : (existingCallData.expertId || "UNKNOWN_EXPERT");

                if (currentExpertId && callId) {
                    try {
                        const uSnap = await getDoc(doc(db, "users", user!.uid));
                        const uData = uSnap.exists() ? uSnap.data() : {};
                        const finalName = uData.name || user?.displayName || existingCallData.callerName || "User User";
                        const finalPic = uData.profilePic || user?.photoURL || existingCallData.callerImage || null; 
                        if (finalPic && !callerProfilePic) setCallerProfilePic(finalPic); 
                        
                        const dbMinsRem = uData.freeMinsRemaining || 0;
                        const isDbTrial = dbMinsRem > 0;

                        const eSnap = await getDoc(doc(db, "users", currentExpertId));
                        const eData = eSnap.exists() ? eSnap.data() : {};
                        const eFinalName = eData.name || eData.userName || existingCallData.expertName || "Host";
                        const eFinalPic = eData.profilePic || eData.photoURL || existingCallData.expertImage || null;
                        
                        await setDoc(doc(db, "calls", callId), {
                            callerId: user?.uid,
                            callerName: params.callerName || finalName, 
                            callerImage: finalPic, 
                            expertId: currentExpertId,
                            expertName: params.expertName || eFinalName, 
                            expertImage: params.expertImage || eFinalPic, 
                            status: existingCallData.status === 'accepted' || existingCallData.status === 'connected' ? existingCallData.status : 'ringing', 
                            createdAt: existingCallData.createdAt || serverTimestamp(),
                            isFreeTrial: isDbTrial 
                        }, { merge: true });
                    } catch (err) {
                        console.error("User initialization error:", err);
                    }
                }
            };
            initializeUserCall(); 
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
                
                if (data.callerId && !realCallerId) setRealCallerId(data.callerId);
                if (data.expertId && data.expertId !== expertIdState) setExpertIdState(data.expertId); 

                if (data.callerName && !callerDisplayName) setCallerDisplayName(data.callerName);
                if (data.expertName && !params.expertName) setExpertName(data.expertName);
                if (data.expertImage && !expertProfilePic) setExpertProfilePic(data.expertImage);
                if (data.callerImage && !callerProfilePic) setCallerProfilePic(data.callerImage);

                if (!isQuickDiscover && (data.userPrice || data.pricePerMin || data.beansPerMin)) {
                    const price = data.userPrice || data.pricePerMin || data.beansPerMin;
                    diamondRateRef.current = price;
                }

                if (data.lastGift && data.lastGift.timestamp > (Date.now() - 5000)) {
                    setActiveGiftType(data.lastGift.type);
                    setGiftRainVisible(true);
                    setActiveGiftOverlay(data.lastGift); 
                }

                if (data.totalGiftsDiamonds !== undefined) {
                    setTotalGiftsDiamonds(data.totalGiftsDiamonds);
                    setTotalGiftsBeans(data.totalGiftsBeans || 0);
                }

                if (data.status === 'accepted' && !isCallAccepted) {
                    ringTimerAnim.stopAnimation();
                    setIsRinging(false);
                    setIsCallAccepted(true);
                }
                
                if (data.lowBalanceAlert !== undefined) {
                    setShowLowBalanceWarning(data.lowBalanceAlert);
                    if (data.remainingSeconds !== undefined) {
                        setRemainingSeconds(data.remainingSeconds);
                    }
                }

                if (data.status === 'user_ended' && role === 'expert' && !isFinishing) {
                    handleCallEnd(true, 'completed');
                }

                if (['rejected', 'ended', 'cancelled', 'completed', 'missed', 'blocked'].includes(data.status)) {
                    if (!showSummary && !databaseUpdated.current) { 
                        const finalDur = data.finalDuration || 0;
                        setFinalDuration(finalDur);
                        
                        if (role === 'expert') {
                            setFinalAmount(data.expertEarnings || 0);
                        } else {
                            setFinalAmount(data.totalDiamonds || 0);
                        }
                        
                        databaseUpdated.current = true;
                        setIsFinishing(true);
                        
                        if (engine.current) { engine.current.leaveChannel(); engine.current.release(); engine.current = null; }
                        
                        setShowSummary(true);
                        setTimeout(() => router.replace(role === 'expert' ? '/expert/dashboard' : '/(tabs)'), 5000);
                    }
                }
            }
        });

        return () => { 
            unsubStatus(); 
            unsubChat(); 
            KeepAwake.deactivateKeepAwake('TalkPe_Active_Call').catch(() => {});
        };
    }, [callId, role]); 

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

    useEffect(() => {
        const targetUserId = role === 'expert' ? (realCallerId || params.callerId) : user?.uid;
        if (targetUserId && typeof targetUserId === 'string' && targetUserId.trim() !== "") {
            const unsubscribe = onSnapshot(doc(db, 'users', targetUserId), (docSnap) => {
                if (docSnap.exists()) {
                    const bal = docSnap.data().balance || 0;
                    setCurrentBalance(bal);
                    if (localBalance === 0) setLocalBalance(bal);
                }
            });
            return () => unsubscribe();
        }
    }, [user?.uid, role, realCallerId, params.callerId]);

    useEffect(() => {
        let interval: any; 
        if (joined && remoteUid && !showSummary) {
            interval = setInterval(() => {
                localDurationRef.current += 1; 
                const currentDuration = localDurationRef.current;
                setSecondsElapsed(currentDuration);
                
                const exactRatePerSec = diamondRateRef.current / 60;

                if (isFreeModeActive && initialTrialSecondsRef.current > 0) {
                    const nextTime = Math.max(0, initialTrialSecondsRef.current - currentDuration);
                    setFreeTimeLeft(nextTime);

                    if (role !== 'expert') setRemainingSeconds(nextTime);

                    if (nextTime <= 0) {
                        setIsFreeModeActive(false); 
                        if (localBalance < exactRatePerSec) {
                            clearInterval(interval);
                            handleCallEnd(true, 'completed');
                        }
                    }
                    
                    if (nextTime <= 10 && nextTime > 0) {
                        if (!showLowBalanceWarning) setShowLowBalanceWarning(true);
                        updateDoc(doc(db, "calls", callId), { lowBalanceAlert: true, remainingSeconds: nextTime }).catch(()=>{});
                    }
                } 
                else {
                    if (role !== 'expert') {
                        setLocalBalance(prevBal => {
                            const nextBal = prevBal - exactRatePerSec; 
                            const currentRemSecs = Math.floor(nextBal / exactRatePerSec);
                            setRemainingSeconds(currentRemSecs);
                            
                            if (currentRemSecs <= 10 && !showLowBalanceWarning) {
                                setShowLowBalanceWarning(true);
                                updateDoc(doc(db, "calls", callId), { lowBalanceAlert: true, remainingSeconds: currentRemSecs }).catch(()=>{});
                            } else if (currentRemSecs <= 10) {
                                updateDoc(doc(db, "calls", callId), { remainingSeconds: currentRemSecs }).catch(()=>{});
                            }
                            
                            if (nextBal <= 0) {
                                clearInterval(interval);
                                handleCallEnd(true, 'completed');
                                return 0; 
                            }
                            return nextBal;
                        });
                    } else if (currentBalance !== null) {
                        const exactRatePerSec = diamondRateRef.current / 60;
                        setRemainingSeconds(Math.floor(currentBalance / exactRatePerSec));
                        setLocalBalance(currentBalance);
                    }
                }
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [joined, remoteUid, showSummary, role, currentBalance, isFreeModeActive]);

    useEffect(() => {
        const init = async () => {
            setIsFinishing(false);
            databaseUpdated.current = false; 
            setSecondsElapsed(0); 

            if (Platform.OS === 'android') {
                try {
                    await PermissionsAndroid.requestMultiple([
                        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
                        PermissionsAndroid.PERMISSIONS.CAMERA,
                    ]);
                } catch (err) {}
            }

            if (engine.current) {
                await engine.current.leaveChannel();
                await engine.current.release();
                engine.current = null;
            }

            if (isCallAccepted) {
                setTimeout(() => setupVideoSDKEngine(), 800); 
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
            rtcEngine.initialize({ appId: AGORA_APP_ID, channelProfile: ChannelProfileType.ChannelProfileCommunication });
            rtcEngine.enableVideo();
            rtcEngine.enableAudio();
            rtcEngine.startPreview(); 
                
            rtcEngine.registerEventHandler({
                onJoinChannelSuccess: async () => {
                    setJoined(true);
                    if (callId) await updateDoc(doc(db, "calls", callId), { status: 'connected', connectedAt: serverTimestamp() }).catch(()=>{});
                },
                onUserJoined: async (_, uid) => { 
                    setRemoteUid(uid); 
                    databaseUpdated.current = false;
                    localDurationRef.current = 0; 
                },
                onUserOffline: () => handleCallEnd(true, 'completed', true), 
                onError: (err) => console.log(err)
            });

            rtcEngine.joinChannel('', channelName, 0, {
                clientRoleType: ClientRoleType.ClientRoleBroadcaster,
                autoSubscribeAudio: true, autoSubscribeVideo: true,
                publishCameraTrack: true, publishMicrophoneTrack: true
            });
        } catch (e) {}
    };

    const toggleProFilter = () => {
        if (!engine.current) return;
        const nextState = !isProEnabled;
        try {
            engine.current.setBeautyEffectOptions(nextState, {
                lighteningContrastLevel: 1, 
                lighteningLevel: 0.7, 
                smoothnessLevel: 0.7, 
                rednessLevel: 0.1,
            });
            setIsProEnabled(nextState);
        } catch (error) {
            console.log("Pro engine error:", error);
        }
    };

    const handleSendGift = async (amount: number, type: string, giftName: string = 'Gift') => {
        if (!user) return;
        const targetUserIdForLog = realCallerId || params.callerId || user?.uid || 'unknown';

        try {
            const userRef = doc(db, "users", user.uid);
            const userSnap = await getDoc(userRef);

            if (!userSnap.exists()) return;

            const dbBalance = Number(userSnap.data().balance || 0);

            const activeRate = diamondRateRef.current;
            const accruedCallCost = isFreeModeActive ? 0 : Math.floor(localDurationRef.current * (activeRate / 60));
            
            const realAvailableBalance = dbBalance - accruedCallCost;

            if (realAvailableBalance < amount) {
                Alert.alert(
                    "Insufficient Assets! 💎", 
                    `Requires ${amount.toLocaleString()} assets. Available: ${realAvailableBalance.toLocaleString()} (accounting for session cost).`,
                    [
                        { text: "Cancel", style: "cancel" },
                        { text: "Add Assets", onPress: () => router.push('/recharge' as any) }
                    ]
                );
                return; 
            }

            setLocalBalance(prev => prev - amount);

            const expertBeans = Math.floor(amount / 2);
            const today = new Date().toISOString().split('T')[0];
            
            await updateDoc(userRef, { balance: increment(-amount) });
            
            const expertRef = doc(db, "users", safeExpertId); 
            const expertSnap = await getDoc(expertRef);
            
            if (expertSnap.exists()) {
                const eData = expertSnap.data();
                const isNewDay = eData.lastBonusDate !== today;
                
                let currentTopVip = eData.topVipSupporter || { name: 'None', amount: 0, date: '' };
                if (isNewDay || amount > currentTopVip.amount) {
                     currentTopVip = { name: userData?.name || callerDisplayName, amount: amount, date: today };
                }

                const updatedTodayBeans = isNewDay ? expertBeans : (Number(eData.todayBeans) || 0) + expertBeans;
                let achievedMilestone = "0 / 100K";
                if (updatedTodayBeans >= 500000) achievedMilestone = "ELITE (500K)";
                else if (updatedTodayBeans >= 300000) achievedMilestone = "PRO (300K)";
                else if (updatedTodayBeans >= 100000) achievedMilestone = "STARTER (100K)";

                await updateDoc(expertRef, {
                    walletBalance: increment(expertBeans),
                    beans: increment(expertBeans),
                    totalBeansEarned: increment(expertBeans), 
                    totalDiamondsReceived: increment(amount), 
                    todayBeans: isNewDay ? expertBeans : increment(expertBeans),
                    topVipSupporter: currentTopVip,
                    currentDailyMilestone: achievedMilestone,
                    lastBonusDate: today
                });
                
                await addDoc(collection(db, "transactions"), {
                    userId: targetUserIdForLog, expertId: safeExpertId, expertName, 
                    diamonds: amount, beans: expertBeans,
                    type: 'gift', status: 'completed', giftType: type,
                    timestamp: serverTimestamp()
                });
            }
            
            await updateDoc(doc(db, "calls", callId), {
                lastGift: { 
                    type, 
                    amount, 
                    timestamp: Date.now(), 
                    giftName, 
                    senderName: userData?.name || callerDisplayName || "User" 
                },
                totalGiftsDiamonds: increment(amount),
                totalGiftsBeans: increment(expertBeans)
            });
        } catch (error) { console.error("Gift error:", error); }
    };

    const onAcceptCall = async () => {
        ringTimerAnim.stopAnimation(); 
        if (callId) await updateDoc(doc(db, "calls", callId), { status: 'accepted' });

        if (role === 'expert' && safeExpertId && safeExpertId !== "UNKNOWN_EXPERT") {
            try {
                await updateDoc(doc(db, "users", safeExpertId), { isBusy: true });
            } catch (e) { console.log(e); }
        }

        setIsRinging(false);
        setIsCallAccepted(true);
    };

    const onRejectCall = async () => {
        ringTimerAnim.stopAnimation(); 
        if (callId) await updateDoc(doc(db, "calls", callId), { status: 'rejected' });
        setIsRinging(false);
        handleCallEnd(false, 'rejected');
    };

    const handleMissedCall = async () => {
        if (isCallAccepted || remoteUid || isFinishing) return;
        if (callId) await updateDoc(doc(db, "calls", callId), { status: 'missed' });
        handleCallEnd(false, 'missed');
    };

    // 🔥 SATTI UPDATE: New Block UI Trigger
    const handleBlockUser = () => {
        setBlockModalVisible(true);
    };

    // 🔥 SATTI UPDATE: Execution Logic with Database Storage
    const handleReasonSelect = async (reason: string) => {
        let targetUserId = '';
        
        if (role === 'expert') {
            targetUserId = realCallerId || (params.callerId as string);
        } else {
            targetUserId = safeExpertId;
        }

        if (!targetUserId && callId) {
            const snap = await getDoc(doc(db, "calls", callId));
            if (snap.exists()) {
                targetUserId = role === 'expert' ? snap.data().callerId : snap.data().expertId;
            }
        }
        
        if (!targetUserId) return;
        
        Alert.alert(
            "CONFIRM BLOCK",
            `Are you sure you want to restrict this user?\n\nReason: ${reason}`,
            [
                { text: "CANCEL", style: "cancel" },
                { 
                    text: "BLOCK & REPORT", 
                    style: "destructive", 
                    onPress: () => executeBlockUser(reason, targetUserId) 
                }
            ]
        );
    };

    // 🔥 SATTI UPDATE: Core Block & Database Logic matching Profile Model
    const executeBlockUser = async (reason: string, targetUserId: string) => {
        if (!user || !targetUserId) return;
        setIsBlocking(true);
        const currentUserId = user.uid;

        try {
            // 1. Array Union to blockedUsers (Invisible matching)
            await updateDoc(doc(db, "users", currentUserId), { blockedUsers: arrayUnion(targetUserId) });
            
            // 2. Increment block count
            await updateDoc(doc(db, "users", targetUserId), { expertBlockCount: increment(1) });
            
            // 3. Admin Alert Data Push
            await addDoc(collection(db, "admin_alerts"), {
                type: role === 'expert' ? 'EXPERT_BLOCKED_USER' : 'USER_BLOCKED_EXPERT', 
                expertId: role === 'expert' ? currentUserId : targetUserId, 
                userId: role === 'expert' ? targetUserId : currentUserId, 
                reporterRole: role,
                reason: reason,
                timestamp: serverTimestamp(), 
                status: 'unread'
            });

            blockUser(targetUserId); // Context block connection
            handleCallEnd(true, 'ended'); // Force deduct current call
            
            Alert.alert("USER RESTRICTED", "The user has been blocked and reported to safety moderation.");
        } catch (error) {
            Alert.alert("SYSTEM ERROR", "Unable to complete blocking protocol.");
        } finally {
            setIsBlocking(false); 
            setBlockModalVisible(false);
        }
    };

    const handleCallEnd = async (shouldDeduct = true, finalStatus = 'completed', isRemoteKill = false) => {
        if (isFinishing || showSummary || databaseUpdated.current) return;

        setIsFinishing(true); 
        
        if (engine.current) { 
            engine.current.leaveChannel(); 
            engine.current.release(); 
            engine.current = null; 
        }

        const duration = localDurationRef.current;

        if (role === 'user' && !isRemoteKill && finalStatus === 'completed') {
            try { await updateDoc(doc(db, "calls", callId), { status: "user_ended" }); } catch (e) {}
            if (safeExpertId && safeExpertId !== "UNKNOWN_EXPERT") {
                try { updateDoc(doc(db, "users", safeExpertId), { isBusy: false }); } catch (e) {}
            }
            return; 
        }

        let isBiller = role === 'expert';

        if (role === 'user' && isRemoteKill) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            try {
                const snap = await getDoc(doc(db, "calls", callId));
                if (snap.exists() && ['completed', 'ended'].includes(snap.data().status) && snap.data().finalDuration !== undefined) {
                    setFinalDuration(snap.data().finalDuration);
                    setFinalAmount(snap.data().totalDiamonds);
                    
                    if (snap.data().totalGiftsDiamonds !== undefined) {
                        setTotalGiftsDiamonds(snap.data().totalGiftsDiamonds);
                        setTotalGiftsBeans(snap.data().totalGiftsBeans || 0);
                    }

                    databaseUpdated.current = true;
                    cleanupAndExit(finalStatus);
                    return;
                }
            } catch(e) {}
            isBiller = true; 
        }

        if (databaseUpdated.current) return; 
        databaseUpdated.current = true;

        if (safeExpertId && safeExpertId !== "UNKNOWN_EXPERT") {
            try { await updateDoc(doc(db, "users", safeExpertId), { isBusy: false }); } catch (e) {}
        }

        if (shouldDeduct && duration > 5) {
            try {
                const checkCallSnap = await getDoc(doc(db, "calls", callId));
                let dbCallerId = realCallerId || (params.callerId as string);
                let dbCallerName = callerDisplayName || "User User";

                if (checkCallSnap.exists()) {
                    const cData = checkCallSnap.data();
                    
                    if (cData.totalGiftsDiamonds !== undefined) {
                        setTotalGiftsDiamonds(cData.totalGiftsDiamonds);
                        setTotalGiftsBeans(cData.totalGiftsBeans || 0);
                    }

                    if (['completed', 'ended'].includes(cData.status) && cData.finalDuration !== undefined) {
                         setFinalDuration(cData.finalDuration || duration);
                         setFinalAmount(role === 'expert' ? cData.expertEarnings : cData.totalDiamonds);
                         cleanupAndExit(finalStatus);
                         return;
                    }
                    dbCallerId = cData.callerId || dbCallerId;
                    dbCallerName = cData.callerName || dbCallerName;
                }

                if (isBiller || finalStatus === 'ended') {
                    const targetCallerId = (role === 'user' ? user?.uid : dbCallerId);
                    const exactCallMins = duration / 60; 
                    const today = new Date().toISOString().split('T')[0];
                    const activeRate = diamondRateRef.current;

                    let expertEarningsBeans = Math.floor((duration * (activeRate / 60)) / 2);
                    let billableDiamonds = Math.floor(duration * (activeRate / 60));
                    let uiFinalUserAmount = billableDiamonds;

                    let usedFreeSeconds = 0;
                    let freshFreeTimeLeftInSeconds = 0;
                    let isActuallyTrial = false;

                    if (targetCallerId) {
                        const initialFreeMinsData = await getDoc(doc(db, "users", targetCallerId));
                        if (initialFreeMinsData.exists()) {
                            const currentFreeMins = initialFreeMinsData.data().freeMinsRemaining || 0;
                            freshFreeTimeLeftInSeconds = currentFreeMins * 60;
                            isActuallyTrial = freshFreeTimeLeftInSeconds > 0;

                            if (isActuallyTrial) {
                                usedFreeSeconds = Math.min(duration, freshFreeTimeLeftInSeconds);
                                const excessSeconds = Math.max(0, duration - freshFreeTimeLeftInSeconds);
                                billableDiamonds = Math.floor(excessSeconds * (activeRate / 60));
                                uiFinalUserAmount = (duration <= freshFreeTimeLeftInSeconds) ? 0 : billableDiamonds;
                            }

                            const newFreeMinsBalance = Math.max(0, currentFreeMins - (usedFreeSeconds / 60));
                            const currentActualBalance = initialFreeMinsData.data().balance || 0;
                            const finalDeduction = (isActuallyTrial && duration <= freshFreeTimeLeftInSeconds) ? 0 : Math.min(billableDiamonds, currentActualBalance);

                            await updateDoc(doc(db, "users", targetCallerId), { 
                                balance: increment(-finalDeduction), 
                                totalMinutesSpent: increment(exactCallMins),
                                freeMinsRemaining: newFreeMinsBalance, 
                                isWelcomeCallAvailable: newFreeMinsBalance > 0.05
                            });
                        }
                    }

                    const expertRef = doc(db, "users", safeExpertId); 
                    const expertSnap = await getDoc(expertRef);
                    if (expertSnap.exists()) {
                        const eData = expertSnap.data();
                        const isNewDay = eData.lastBonusDate !== today;
                        let currentTopVip = eData.topVipSupporter || { name: 'None', amount: 0, date: '' };
                        if (isNewDay || billableDiamonds > currentTopVip.amount) {
                             currentTopVip = { name: dbCallerName, amount: billableDiamonds, date: today };
                        }
                        
                        const updatedTodayBeans = isNewDay ? expertEarningsBeans : (Number(eData.todayBeans) || 0) + expertEarningsBeans;
                        let achievedMilestone = "0 / 100K";
                        if (updatedTodayBeans >= 500000) achievedMilestone = "ELITE (500K)";
                        else if (updatedTodayBeans >= 300000) achievedMilestone = "PRO (300K)";
                        else if (updatedTodayBeans >= 100000) achievedMilestone = "STARTER (100K)";
                        const currentLongest = Number(eData.longestCallDuration) || 0;
                        const newLongest = duration > currentLongest ? duration : currentLongest;

                        await updateDoc(expertRef, { 
                            walletBalance: increment(expertEarningsBeans), 
                            beans: increment(expertEarningsBeans), 
                            totalBeansEarned: increment(expertEarningsBeans),
                            todayBeans: isNewDay ? expertEarningsBeans : increment(expertEarningsBeans),
                            todayMinutes: isNewDay ? exactCallMins : increment(exactCallMins), 
                            todayCalls: isNewDay ? 1 : increment(1),
                            totalMinutes: increment(exactCallMins), 
                            totalCalls: increment(1),
                            topVipSupporter: currentTopVip,
                            currentDailyMilestone: achievedMilestone, 
                            lastCallFrom: dbCallerName, 
                            lastBonusDate: today,
                            longestCallDuration: newLongest 
                        });
                    }
                    
                    await updateDoc(doc(db, "calls", callId), { 
                        status: 'completed', 
                        finalDuration: duration, 
                        totalDiamonds: uiFinalUserAmount, 
                        expertEarnings: expertEarningsBeans, 
                        endedAt: serverTimestamp() 
                    });
                    
                    await addDoc(collection(db, "transactions"), { 
                        userId: targetCallerId || 'unknown', expertId: safeExpertId, diamonds: uiFinalUserAmount, beans: expertEarningsBeans, duration, type: 'video_call', status: 'completed', timestamp: serverTimestamp() 
                    });

                    setFinalDuration(duration);
                    setFinalAmount(role === 'expert' ? expertEarningsBeans : uiFinalUserAmount); 
                }
            } catch (error) { console.log("Billing Error:", error); }
        } else {
             if (isRemoteKill || role === 'expert') {
                 updateDoc(doc(db, "calls", callId), { status: finalStatus, endedAt: serverTimestamp() }).catch(()=>{});
             }
        }

        cleanupAndExit(finalStatus);
    };

    const cleanupAndExit = (finalStatus: string) => {
        if (engine.current) { engine.current.leaveChannel(); engine.current.release(); engine.current = null; }

        if (safeExpertId && safeExpertId !== "UNKNOWN_EXPERT") {
            try { updateDoc(doc(db, "users", safeExpertId), { isBusy: false }); } catch (e) {}
        }

        if (['missed', 'rejected', 'cancelled'].includes(finalStatus)) { 
            router.replace(role === 'expert' ? '/expert/dashboard' : '/(tabs)');
        } else {
            setShowSummary(true);
            const targetPath = (role !== 'expert' && isFreeModeActive && currentBalance! < 10 && remainingSeconds === 0) 
                ? '/recharge' 
                : (role === 'expert' ? '/expert/dashboard' : '/(tabs)');
            setTimeout(() => router.replace(targetPath as any), 5000); 
        }
    };

    const sendMessage = async () => {
        if (inputText.trim() === '' || !callId) return;
        const text = inputText; setInputText('');
        const senderLabel = userData?.name || callerDisplayName;
        await addDoc(collection(db, "calls", callId, "messages"), { 
            text, 
            senderId: user?.uid, 
            senderName: senderLabel, 
            senderRole: role, 
            timestamp: serverTimestamp() 
        });
    };

    const formatTime = (ts: number) => {
        const mins = Math.floor(ts / 60); const secs = Math.floor(ts % 60);
        return `${mins < 10 ? '0' + mins : mins}:${secs < 10 ? '0' + secs : secs}`;
    };

    const topHeaderProfilePic = role === 'expert' 
        ? (callerProfilePic || `https://ui-avatars.com/api/?name=${callerDisplayName}&background=0F172A&color=00F2FE&bold=true`)
        : (expertProfilePic || `https://ui-avatars.com/api/?name=${expertName}&background=0F172A&color=00F2FE&bold=true`);

    return (
        <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            <Animated.View style={[styles.redAlertOverlay, { opacity: pulseAnim.interpolate({inputRange: [0, 1], outputRange: [0, 0.45]}) }]} pointerEvents="none" />

            <View style={StyleSheet.absoluteFill}>
                {remoteUid ? <RtcSurfaceView canvas={{ uid: remoteUid }} style={styles.fullVideo} /> : (
                    <View style={styles.waitingBox}>
                        <LinearGradient colors={['#020617', '#1E293B']} style={StyleSheet.absoluteFill} />
                        <MaterialCommunityIcons name="shield-check-outline" size={80} color="#3B82F6" />
                        <Text style={styles.waitingText}>Establishing Secure Node...</Text>
                    </View>
                )}
            </View>

            <GameOverlay isVisible={isGameVisible} gameType="tictactoe" board={board} isXNext={isXNext} winner={checkWinner(board)} expertName={expertName} onClose={async () => await setDoc(doc(db, "calls", callId, "game", "state"), { isVisible: false }, { merge: true })} onSquareClick={async (i) => { if (!board[i]) { const nb = [...board]; nb[i] = isXNext ? 'X' : 'O'; await setDoc(doc(db, "calls", callId, "game", "state"), { board: nb, isXNext: !isXNext, isVisible: true }, { merge: true }); }}} onReset={async () => await setDoc(doc(db, "calls", callId, "game", "state"), { board: Array(9).fill(null), isXNext: true, isVisible: true }, { merge: true })} />

            <GiftRain visible={giftRainVisible} giftType={activeGiftType} onComplete={() => setGiftRainVisible(false)} />

            <GiftOverlay 
                giftData={activeGiftOverlay} 
                onComplete={() => setActiveGiftOverlay(null)} 
                expertTotalBeans={expertThemeBeans} 
                role={role} 
            />

            {showLowBalanceWarning && remainingSeconds !== null && remainingSeconds <= 10 && !showSummary && (
                <View style={styles.warningContainer} pointerEvents="none">
                    <Animated.Text style={[styles.warningTimerText, { opacity: pulseAnim }]}>
                        {remainingSeconds}s
                    </Animated.Text>
                    <Text style={styles.warningSubText}>Session ending soon</Text>
                </View>
            )}

            {joined && !showSummary && (
                <Animated.View {...panResponder.panHandlers} style={[styles.localVideoFloating, { transform: pan.getTranslateTransform() }]}>
                    <RtcSurfaceView canvas={{ uid: 0 }} style={styles.innerVideo} zOrderMediaOverlay={true} />
                </Animated.View>
            )}

            {isCallAccepted && !showSummary && (
                <View style={styles.topHeader}>
                    <View style={styles.headerContent}>
                        <View style={styles.headerInfo}>
                            <View style={styles.headerAvatarWrapper}>
                                <Image source={{ uri: topHeaderProfilePic }} style={styles.headerAvatarPic} />
                            </View>
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <View style={styles.statusBadge}>
                                    <View style={styles.liveDot} />
                                    <Text style={styles.liveText}>{formatTime(secondsElapsed)}</Text>
                                    {isFreeModeActive && <Text style={styles.freeBadgeText}> COMPLIMENTARY</Text>}
                                </View>
                                <Text style={styles.callerNameText} numberOfLines={1}>{role === 'expert' ? (callerDisplayName || "User") : expertName}</Text>
                            </View>
                        </View>
                        
                        <TouchableOpacity style={styles.topRightBlockBtn} onPress={handleBlockUser} activeOpacity={0.7}>
                            <Ionicons name="shield-checkmark" size={18} color="#EF4444" />
                            <Text style={styles.blockBtnText}>RESTRICT</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {isRinging && !isCallAccepted && (
                <RingingOverlay 
                    role={role} 
                    callerDisplayName={callerDisplayName} 
                    expertName={expertName} 
                    ringTimerAnim={ringTimerAnim} 
                    onAcceptCall={onAcceptCall} 
                    onRejectCall={onRejectCall} 
                    handleCallEnd={handleCallEnd}
                    callerId={realCallerId}
                    expertId={safeExpertId} 
                />
            )}

            {showSummary && (
                <CallSummary role={role} finalDurationFormatted={formatTime(finalDuration)} finalAmount={finalAmount} giftAmount={role === 'expert' ? totalGiftsBeans : totalGiftsDiamonds} />
            )}

            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
                keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0} 
                style={{ flex: 1 }} 
                pointerEvents="box-none"
            >
                <View style={styles.uiWrapper} pointerEvents="box-none">
                    {isChatVisible && (
                        <FloatingChat messages={messages} inputText={inputText} setInputText={setInputText} sendMessage={sendMessage} setIsChatVisible={setIsChatVisible} currentUserId={user?.uid} />
                    )}
                    {isGiftPanelVisible && role === 'user' && (
                        <GiftPanel userBalance={localBalance} onClose={() => setIsGiftPanelVisible(false)} onSendGift={handleSendGift} />
                    )}
                    {isCallAccepted && !showSummary && (
                        <BottomControls 
                            showLowBalanceWarning={showLowBalanceWarning} 
                            isFreeModeActive={isFreeModeActive} 
                            freeTimeLeft={freeTimeLeft} 
                            remainingSeconds={remainingSeconds} 
                            isGameVisible={isGameVisible} 
                            isChatVisible={isChatVisible} 
                            isMuted={isMuted} 
                            isProEnabled={isProEnabled}
                            togglePro={toggleProFilter} 
                            toggleGameVisibility={async () => await setDoc(doc(db, "calls", callId, "game", "state"), { isVisible: !isGameVisible }, { merge: true })} 
                            toggleChatVisibility={() => setIsChatVisible(!isChatVisible)} 
                            toggleMute={() => { engine.current?.muteLocalAudioStream(!isMuted); setIsMuted(!isMuted); }} 
                            switchCamera={() => engine.current?.switchCamera()} 
                            handleCallEnd={handleCallEnd} 
                            role={role}
                            onOpenGiftPanel={role === 'user' ? () => setIsGiftPanelVisible(true) : () => {}} 
                        />
                    )}
                </View>
            </KeyboardAvoidingView>

            {/* 🔥 SATTI UPDATE: New Reporting Modal UI Added at the bottom */}
            <Modal
                visible={blockModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setBlockModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={{ alignItems: 'center', marginBottom: 15 }}>
                            <View style={styles.modalIconRing}>
                                <MaterialCommunityIcons name="shield-off-outline" size={32} color="#EF4444" />
                            </View>
                            <Text style={styles.modalTitle}>REPORT & BLOCK</Text>
                            <Text style={styles.modalSubText}>
                                Restrict this user from contacting you. This action will be reported for safety moderation and the call will end immediately.
                            </Text>
                        </View>

                        <Text style={styles.modalLabel}>REASON FOR REPORTING:</Text>
                        {blockReasons.map((reason, idx) => (
                            <TouchableOpacity 
                                key={idx} 
                                style={styles.reasonBtn}
                                onPress={() => handleReasonSelect(reason)}
                                disabled={isBlocking}
                            >
                                <Text style={styles.reasonText}>{reason}</Text>
                                <Ionicons name="chevron-forward" size={16} color="#3B82F6" />
                            </TouchableOpacity>
                        ))}

                        {isBlocking && (
                            <ActivityIndicator size="small" color="#EF4444" style={{ marginTop: 10 }} />
                        )}

                        <TouchableOpacity 
                            style={styles.cancelBtn} 
                            onPress={() => setBlockModalVisible(false)}
                            disabled={isBlocking}
                        >
                            <Text style={styles.cancelBtnText}>CANCEL</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
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
    topHeader: { position: 'absolute', top: 40, left: 20, right: 20, zIndex: 150 },
    headerContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: width - 40 },
    headerInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
    headerAvatarWrapper: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden', backgroundColor: '#000' },
    headerAvatarPic: { width: '100%', height: '100%' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 25, alignSelf: 'flex-start' },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#10B981', marginRight: 10 },
    liveText: { color: '#FFF', fontSize: 16, fontWeight: '800' },
    freeBadgeText: { color: '#FBBF24', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    callerNameText: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 4, textShadowColor: '#000', textShadowRadius: 15, flexShrink: 1 },
    topRightBlockBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239, 68, 68, 0.2)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.4)', elevation: 5, zIndex: 999, flexShrink: 0 },
    blockBtnText: { color: '#EF4444', fontWeight: 'bold', marginLeft: 5, fontSize: 12 },
    waitingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    waitingText: { color: '#FFF', fontSize: 14, fontWeight: '600', marginTop: 15, opacity: 0.8 },
    warningContainer: { position: 'absolute', top: '40%', alignSelf: 'center', zIndex: 120, alignItems: 'center' },
    warningTimerText: { color: '#FFF', fontSize: 100, fontWeight: '900', textShadowColor: '#EF4444', textShadowRadius: 30 },
    warningSubText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', backgroundColor: 'rgba(239, 68, 68, 0.8)', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 15, overflow: 'hidden', marginTop: -10 },
    
    /* 🔥 SATTI UPDATE: Modal Styles Added */
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#0F172A', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40, borderWidth: 1, borderColor: '#3B82F6', borderBottomWidth: 0 },
    modalIconRing: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 15, backgroundColor: 'rgba(239, 68, 68, 0.1)' },
    modalTitle: { color: '#EF4444', fontSize: 20, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
    modalSubText: { color: '#94A3B8', fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 },
    modalLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
    reasonBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(59, 130, 246, 0.4)' },
    reasonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    cancelBtn: { marginTop: 15, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)' },
    cancelBtnText: { color: '#94A3B8', fontSize: 13, fontWeight: '900', letterSpacing: 1 }
});