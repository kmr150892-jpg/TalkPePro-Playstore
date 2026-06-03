import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, onSnapshot, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import LottieView from 'lottie-react-native'; // 🔥 SATTI UPDATE: Lottie Animation Imported
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, Modal, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

// 🎨 DYNAMIC ARCADE COLOR CONFIG
const COLOR_POOL = [
    { name: 'RED', colorCode: '#FF2A5F' },
    { name: 'BLUE', colorCode: '#00F2FE' },
    { name: 'GREEN', colorCode: '#10B981' },
    { name: 'YELLOW', colorCode: '#FFD700' },
    { name: 'PURPLE', colorCode: '#A855F7' }, 
    { name: 'ORANGE', colorCode: '#F97316' }  
];

const ENTRY_FEES = [500, 1000, 5000, 10000, 25000, 50000];
const MAX_PLAYERS = 10;

interface LiveGameSheetProps {
    visible: boolean;
    onClose: () => void;
    liveId: string;
    isHost: boolean;
    userWalletBalance: number;
    collectionName?: string; 
}

export default function LiveGameSheet({ visible, onClose, liveId, isHost, userWalletBalance, collectionName = 'lives' }: LiveGameSheetProps) {
    // --- System States ---
    const [gameStatus, setGameStatus] = useState<'WAITING' | 'PLAYING' | 'FINISHED' | 'CANCELLED'>('WAITING');
    const [players, setPlayers] = useState<any[]>([]);
    const [entryFee, setEntryFee] = useState<number>(500); 
    const [isFeeLocked, setIsFeeLocked] = useState<boolean>(false);
    const [hostId, setHostId] = useState<string>('');
    const [matchResults, setMatchResults] = useState<any>(null); 

    // --- Gameplay Engine States ---
    const [targetWord, setTargetWord] = useState<string>('START');
    const [displayColor, setDisplayColor] = useState<string>('#00F2FE');
    const [score, setScore] = useState<number>(0);
    const [combo, setCombo] = useState<number>(0);
    const [gameTimeLeft, setGameTimeLeft] = useState<number>(60);
    const [isPlayingSolo, setIsPlayingSolo] = useState<boolean>(false);
    const [hasSubmittedScore, setHasSubmittedScore] = useState<boolean>(false);
    
    // --- Twist States ---
    const [currentRule, setCurrentRule] = useState<'COLOR' | 'WORD'>('COLOR');
    const [buttonDecoys, setButtonDecoys] = useState(COLOR_POOL);
    const [wordTilt, setWordTilt] = useState<string>('0deg');
    const [wordFontSize, setWordFontSize] = useState<number>(52);
    const [wordTranslate, setWordTranslate] = useState({ x: 0, y: 0 });

    // --- Lobby States ---
    const [lobbyTimeLeft, setLobbyTimeLeft] = useState<number>(45); 
    const [isProcessing, setIsProcessing] = useState<boolean>(false); 
    const hasJoined = players.some(p => p.id === auth.currentUser?.uid);

    // --- Animation & Data Refs ---
    const progressAnim = useRef(new Animated.Value(1)).current;
    const scoreAnim = useRef(new Animated.Value(1)).current;
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    
    const pan = useRef(new Animated.ValueXY()).current;
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: () => {
                pan.flattenOffset();
            }
        })
    ).current;

    const scoreRef = useRef<number>(0);
    const hasSubmittedScoreRef = useRef<boolean>(false);

    // 🔥 SATTI FIX: Auto-detect forum vs live based on ID 🔥
    const actualCollection = liveId?.startsWith('forum_') ? 'forum_rooms' : collectionName;
    const roomRef = doc(db, actualCollection, liveId, 'games', 'reflex_arena');

    // 🔥 SATTI FIX: SELF-HEALING AUTO REFUND WITH PROPER WALLET SYNC
    const handleAutoRefundOnCancel = async () => {
        if (!auth.currentUser) return;
        const uid = auth.currentUser.uid;
        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', uid);
                const roomSnap = await transaction.get(roomRef);
                const userSnap = await transaction.get(userRef);

                if (!roomSnap.exists() || !userSnap.exists()) return;
                const roomData = roomSnap.data();

                if (roomData.status !== 'CANCELLED') return;

                const currentPlayers = roomData.players || [];
                const myPlayerObj = currentPlayers.find((p: any) => p.id === uid);

                if (!myPlayerObj) return; 

                const roomFee = Number(roomData.entryFee) || 0;
                
                // 🔥 FIXED: Update both wallet fields safely
                const uData = userSnap.data();
                const safeBal = Number(uData.balance) || 0;
                const safeWalletBal = Number(uData.walletBalance) || 0;

                const updatedPlayers = currentPlayers.filter((p: any) => p.id !== uid);

                transaction.update(userRef, { 
                    balance: safeBal + roomFee,
                    walletBalance: safeWalletBal + roomFee
                });
                
                transaction.update(roomRef, { players: updatedPlayers });

                const txId = `${uid}_auto_refund_${liveId}`;
                const txRef = doc(db, 'transactions', txId);
                transaction.set(txRef, {
                    userId: uid, type: 'GAME_REFUND', amount: roomFee, status: 'SUCCESS', title: 'Arena Auto Refund (Host Left)', timestamp: serverTimestamp()
                });

                // 🔥 SATTI FIX: Strict 1:1 ID lock to prevent double activity logs 🔥
                const activityRef = doc(db, 'users', uid, 'activityHistory', txId);
                transaction.set(activityRef, {
                    type: 'ARENA_REFUND', status: 'REFUNDED', gameName: 'REFLEX BLITZ ARENA',
                    sessionId: 'reflex_arena', entryFee: roomFee, winAmount: roomFee, lossAmount: 0,
                    title: 'Arena Auto Refund (Host Left)', timestamp: serverTimestamp()
                });
            });
        } catch (e) {
            console.log("Auto refund error:", e);
        }
    };

    // 🔥 SATTI FIX: PARENT ROOM LISTENER FOR HOST FORCE-CLOSE AUTO REFUND 🔥
    useEffect(() => {
        if (!liveId || !visible || isHost) return;
        const parentRoomRef = doc(db, actualCollection, liveId);
        
        const unsubParent = onSnapshot(parentRoomRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                // If parent room ends (Host force close / network cut), trigger refund safely!
                if (data.status === 'ended' || data.status === 'CANCELLED') {
                    forceRefundOnHostDrop();
                }
            }
        });

        return () => unsubParent();
    }, [liveId, visible, isHost, actualCollection]);

    // 🔥 SATTI FIX: BACKUP FORCE REFUND LOGIC IF HOST DISCONNECTS ABRUPTLY 🔥
    const forceRefundOnHostDrop = async () => {
        if (!auth.currentUser || isProcessing) return;
        const uid = auth.currentUser.uid;
        try {
            await runTransaction(db, async (transaction) => {
                const gameSnap = await transaction.get(roomRef);
                const userRef = doc(db, 'users', uid);
                const userSnap = await transaction.get(userRef);

                if (!gameSnap.exists() || !userSnap.exists()) return;
                const gameData = gameSnap.data();

                // If game is already finished or formally refunded, skip to prevent double addition
                if (gameData.status === 'FINISHED' || gameData.status === 'CANCELLED' || gameData.refunded) return;

                const currentPlayers = gameData.players || [];
                const myPlayerObj = currentPlayers.find((p: any) => p.id === uid);
                if (!myPlayerObj) return; // You are not in the game, nothing to refund

                const roomFee = Number(gameData.entryFee) || 0;
                if (roomFee === 0) return;

                const uData = userSnap.data();
                const safeBal = Number(uData.balance) || 0;
                const safeWalletBal = Number(uData.walletBalance) || 0;

                const updatedPlayers = currentPlayers.filter((p: any) => p.id !== uid);

                transaction.update(userRef, { 
                    balance: safeBal + roomFee,
                    walletBalance: safeWalletBal + roomFee
                });
                
                transaction.update(roomRef, { players: updatedPlayers });

                const txId = `${uid}_force_refund_${liveId}`;
                const txRef = doc(db, 'transactions', txId);
                transaction.set(txRef, {
                    userId: uid, type: 'GAME_REFUND', amount: roomFee, status: 'SUCCESS', title: 'Arena Refund (Host Disconnected)', timestamp: serverTimestamp()
                });

                // 🔥 SATTI FIX: Strict 1:1 ID lock to prevent double activity logs 🔥
                const activityRef = doc(db, 'users', uid, 'activityHistory', txId);
                transaction.set(activityRef, {
                    type: 'ARENA_REFUND', status: 'REFUNDED', gameName: 'REFLEX BLITZ ARENA',
                    sessionId: 'reflex_arena', entryFee: roomFee, winAmount: roomFee, lossAmount: 0,
                    title: 'Arena Refund (Host Disconnected)', timestamp: serverTimestamp()
                });
            });
            onClose(); // Auto close the modal since room is dead
        } catch (e) {
            console.log("Force refund error:", e);
        }
    };

    useEffect(() => {
        if (!liveId || !visible) return;

        if (isHost) {
            getDoc(roomRef).then(snap => {
                const data = snap.data();
                if (!snap.exists() || data?.status === 'FINISHED' || data?.status === 'CANCELLED') {
                    setDoc(roomRef, { 
                        status: 'WAITING', 
                        entryFee: entryFee, 
                        isFeeLocked: false,
                        hostId: auth.currentUser?.uid, 
                        players: [], 
                        refunded: false, 
                        createdAt: serverTimestamp() 
                    });
                    setMatchResults(null);
                    setPlayers([]);
                    setIsFeeLocked(false);
                    setHasSubmittedScore(false);
                    hasSubmittedScoreRef.current = false;
                }
            });
        }

        const unsub = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status) setGameStatus(data.status);
                if (data.players) setPlayers(data.players);
                if (data.entryFee !== undefined) setEntryFee(data.entryFee);
                if (data.isFeeLocked !== undefined) setIsFeeLocked(data.isFeeLocked);
                if (data.hostId) setHostId(data.hostId);
                
                if (data.status === 'FINISHED') {
                    setMatchResults({
                        isTie: data.isTie,
                        winnerIds: data.winnerIds,
                        rewardPerWinner: data.rewardPerWinner,
                        expertBeans: data.expertBeans,
                        totalPool: data.totalPool,
                        adminCommission: data.adminCommission,
                        rankedPlayers: data.rankedPlayers || data.players 
                    });
                    if (isPlayingSolo) {
                        setIsPlayingSolo(false);
                        if (timerRef.current) clearInterval(timerRef.current);
                    }
                }

                if (data.status === 'CANCELLED') {
                    if (!isHost) {
                        handleAutoRefundOnCancel();
                    }
                    onClose(); 
                }
            }
        });
        return () => unsub();
    }, [liveId, visible]);

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (gameStatus === 'WAITING' && isFeeLocked && visible) {
            interval = setInterval(() => {
                setLobbyTimeLeft(prev => (prev > 0 ? prev - 1 : 0));
            }, 1000);
        }
        return () => { if(interval) clearInterval(interval); }
    }, [gameStatus, isFeeLocked, visible]);

    useEffect(() => {
        if (gameStatus === 'PLAYING') {
            if (!isHost && !isPlayingSolo && gameTimeLeft === 60) {
                setScore(0);
                scoreRef.current = 0;
                setCombo(0);
                setHasSubmittedScore(false);
                hasSubmittedScoreRef.current = false;
                progressAnim.setValue(1);
                generateNewClash();
                setIsPlayingSolo(true);
            }

            timerRef.current = setInterval(() => {
                setGameTimeLeft(prev => {
                    if (prev > 1) {
                        Animated.timing(progressAnim, {
                            toValue: (prev - 1) / 60,
                            duration: 1000,
                            easing: Easing.linear,
                            useNativeDriver: false
                        }).start();
                        return prev - 1;
                    } else {
                        if (timerRef.current) clearInterval(timerRef.current);
                        
                        if (!isHost && !hasSubmittedScoreRef.current) {
                            submitMyScore(scoreRef.current); 
                        }
                        
                        if (isHost) {
                            setTimeout(() => {
                                processMasterPayout();
                            }, 6000); 
                        }
                        return 0;
                    }
                });
            }, 1000);
        } else {
            setGameTimeLeft(60); 
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [gameStatus]); 

    const generateNewClash = () => {
        let wordIdx = Math.floor(Math.random() * COLOR_POOL.length);
        let colorIdx = Math.floor(Math.random() * COLOR_POOL.length);

        if (Math.random() < 0.90) {
            while (wordIdx === colorIdx) {
                colorIdx = Math.floor(Math.random() * COLOR_POOL.length);
            }
        }

        let finalWord = COLOR_POOL[wordIdx].name;
        if (Math.random() > 0.4) {
            finalWord = finalWord.split('').map(c => Math.random() > 0.5 ? c.toUpperCase() : c.toLowerCase()).join('');
        }
        if (Math.random() > 0.6) {
            finalWord = finalWord.split('').join(' ');
        }
        
        setTargetWord(finalWord);
        setDisplayColor(COLOR_POOL[colorIdx].colorCode);
        setCurrentRule(Math.random() > 0.5 ? 'COLOR' : 'WORD');

        const shuffledNames = [...COLOR_POOL].map(c => c.name).sort(() => Math.random() - 0.5);
        const shuffledColors = [...COLOR_POOL].map(c => c.colorCode).sort(() => Math.random() - 0.5);
        const generatedDecoys = shuffledNames.map((name, index) => ({ name, colorCode: shuffledColors[index] }));
        
        setButtonDecoys(generatedDecoys);
        setWordTilt(`${(Math.random() * 30 - 15).toFixed(1)}deg`);
        setWordFontSize(Math.floor(Math.random() * 14) + 26);
        setWordTranslate({ x: Math.random() * 30 - 15, y: Math.random() * 20 - 10 });
    };

    const handleColorTap = (tappedName: string, tappedColorCode: string) => {
        if (gameStatus !== 'PLAYING' || !isPlayingSolo || isHost) return;

        let isCorrect = false;

        if (currentRule === 'COLOR') {
            const correctColorObj = COLOR_POOL.find(c => c.colorCode === displayColor);
            if (tappedName === correctColorObj?.name || tappedColorCode === displayColor) {
                isCorrect = true;
            }
        } else {
            const cleanWord = targetWord.replace(/\s/g, '').toUpperCase();
            const correctWordObj = COLOR_POOL.find(c => c.name === cleanWord);
            if (tappedName === cleanWord || tappedColorCode === correctWordObj?.colorCode) {
                isCorrect = true;
            }
        }

        if (isCorrect) {
            const addedScore = 100 + (combo * 15); 
            setScore(prev => {
                const newScore = prev + addedScore;
                scoreRef.current = newScore;
                return newScore;
            });
            setCombo(prev => prev + 1);

            Animated.sequence([
                Animated.timing(scoreAnim, { toValue: 1.4, duration: 100, useNativeDriver: true }),
                Animated.timing(scoreAnim, { toValue: 1, duration: 100, useNativeDriver: true })
            ]).start();
        } else {
            setCombo(0);
            setScore(prev => {
                const newScore = Math.max(0, prev - 150);
                scoreRef.current = newScore;
                return newScore;
            });
        }
        generateNewClash();
    };

    const updateRoomFee = async (fee: number) => {
        if (isFeeLocked) return; 
        try {
            setEntryFee(fee); 
            await updateDoc(roomRef, { entryFee: fee });
        } catch (e) { console.log("Fee Update Error: ", e); }
    };

    const lockRoomFee = async () => {
        try {
            await updateDoc(roomRef, { isFeeLocked: true });
        } catch (e) { console.log("Lock Error", e); }
    };

    const unlockRoomFee = async () => {
        try {
            await updateDoc(roomRef, { isFeeLocked: false });
        } catch (e) { console.log("Unlock Error", e); }
    };

    const handleJoinArena = async () => {
        if (!auth.currentUser || isProcessing || !isFeeLocked) return;
        setIsProcessing(true);
        const uid = auth.currentUser.uid;
        const uName = auth.currentUser.displayName || 'Player';

        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', uid);
                const userSnap = await transaction.get(userRef);
                const roomSnap = await transaction.get(roomRef);

                if (!userSnap.exists() || !roomSnap.exists()) throw "Data missing! Arena setup might be incomplete.";
                
                const uData = userSnap.data();
                const safeBal = Number(uData.balance) || 0;
                const safeWalletBal = Number(uData.walletBalance) || 0;
                const effectiveBalance = Math.max(safeBal, safeWalletBal); 
                
                const roomData = roomSnap.data();
                const roomFee = Number(roomData.entryFee) || 0;
                const currentPlayers = roomData.players || [];

                if (currentPlayers.find((p: any) => p.id === uid)) throw "Already joined";
                if (currentPlayers.length >= MAX_PLAYERS) throw "Arena Full";
                if (effectiveBalance < roomFee) throw `Insufficient Balance. You need ${roomFee} 💎 to join.`;

                transaction.update(userRef, { 
                    balance: Math.max(0, safeBal - roomFee),
                    walletBalance: Math.max(0, safeWalletBal - roomFee)
                });
                
                transaction.update(roomRef, {
                    players: [...currentPlayers, { id: uid, name: uName, score: 0, hasFinished: false, joinedAt: Date.now() }]
                });

                const txRef = doc(db, 'transactions', `${uid}_arena_${Date.now()}`);
                transaction.set(txRef, {
                    userId: uid, type: 'ARENA_ENTRY', amount: roomFee, status: 'SUCCESS', title: 'Reflex Arena Entry', timestamp: serverTimestamp()
                });
            });
            Alert.alert("Success!", "You joined the Arena. Waiting for launch.");
        } catch(e: any) { 
            Alert.alert("Join Failed", e.toString());
        }
        setIsProcessing(false);
    };

    const handleExitArena = async () => {
        if (!auth.currentUser || isProcessing) return;
        setIsProcessing(true);
        const uid = auth.currentUser.uid;

        try {
            await runTransaction(db, async (transaction) => {
                const userRef = doc(db, 'users', uid);
                const roomSnap = await transaction.get(roomRef);
                const userSnap = await transaction.get(userRef);

                if (!roomSnap.exists() || !userSnap.exists()) throw "Data missing";
                const roomData = roomSnap.data();

                if (roomData.status !== 'WAITING') throw "Arena already active! Can't exit now.";

                const currentPlayers = roomData.players || [];
                const myPlayerObj = currentPlayers.find((p: any) => p.id === uid);

                if (!myPlayerObj) throw "You are not in the arena";

                const roomFee = Number(roomData.entryFee) || 0;
                
                const uData = userSnap.data();
                const safeBal = Number(uData.balance) || 0;
                const safeWalletBal = Number(uData.walletBalance) || 0;
                
                const updatedPlayers = currentPlayers.filter((p: any) => p.id !== uid);

                transaction.update(userRef, { 
                    balance: safeBal + roomFee,
                    walletBalance: safeWalletBal + roomFee
                });
                
                transaction.update(roomRef, { players: updatedPlayers });

                const txId = `${uid}_refund_${liveId}_${Date.now()}`; // Manual exit needs timestamp to allow re-joining
                const txRef = doc(db, 'transactions', txId);
                transaction.set(txRef, {
                    userId: uid, type: 'ARENA_REFUND', amount: roomFee, status: 'SUCCESS', title: 'Reflex Arena Refund', timestamp: serverTimestamp()
                });

                // 🔥 SATTI FIX: Strict 1:1 ID lock to prevent double activity logs 🔥
                const activityRef = doc(db, 'users', uid, 'activityHistory', txId);
                transaction.set(activityRef, {
                    type: 'ARENA_REFUND', status: 'REFUNDED', gameName: 'REFLEX BLITZ ARENA',
                    sessionId: 'reflex_arena', entryFee: roomFee, winAmount: roomFee, lossAmount: 0,
                    title: 'Reflex Arena Refund', timestamp: serverTimestamp()
                });
            });
            Alert.alert("Refunded 🎖️", "You left the arena. Access Requirement has been refunded to your wallet.");
        } catch (e: any) {
            Alert.alert("Exit Failed", e.toString());
        }
        setIsProcessing(false);
    };

    const handleHostClose = async () => {
        if (isHost && (gameStatus === 'WAITING' || gameStatus === 'PLAYING') && players.length > 0) {
            Alert.alert(
                "Cancel Arena & Refund?",
                "Closing now will cancel the arena and refund all participants.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Yes, Refund All", style: "destructive", onPress: async () => {
                        setIsProcessing(true);
                        try {
                            await runTransaction(db, async (transaction) => {
                                const roomSnap = await transaction.get(roomRef);
                                if(!roomSnap.exists()) return;
                                const data = roomSnap.data();

                                if (data.status === 'CANCELLED' || data.refunded === true) {
                                    return; 
                                }

                                const currentPlayers = data.players || [];
                                const roomFee = Number(data.entryFee) || 0;

                                const userSnapsPromises = currentPlayers.map((p: any) => transaction.get(doc(db, 'users', p.id)));
                                const userSnaps = await Promise.all(userSnapsPromises);

                                currentPlayers.forEach((p: any, index: number) => {
                                    const uSnap = userSnaps[index];
                                    if(uSnap.exists()){
                                        const uData = uSnap.data();
                                        const safeBal = Number(uData.balance) || 0;
                                        const safeWalletBal = Number(uData.walletBalance) || 0;
                                        
                                        transaction.update(uSnap.ref, { 
                                            balance: safeBal + roomFee,
                                            walletBalance: safeWalletBal + roomFee
                                        });
                                        
                                        const txId = `${p.id}_host_cancel_${liveId}`;
                                        const txRef = doc(db, 'transactions', txId);
                                        transaction.set(txRef, { userId: p.id, type: 'ARENA_REFUND', amount: roomFee, status: 'SUCCESS', title: 'Host Cancelled Refund', timestamp: serverTimestamp() });

                                        // 🔥 SATTI FIX: Strict 1:1 ID lock to prevent double activity logs 🔥
                                        const activityRef = doc(db, 'users', p.id, 'activityHistory', txId);
                                        transaction.set(activityRef, {
                                            type: 'ARENA_REFUND', status: 'REFUNDED', gameName: 'REFLEX BLITZ ARENA',
                                            sessionId: 'reflex_arena', entryFee: roomFee, winAmount: roomFee, lossAmount: 0,
                                            title: 'Host Cancelled Refund', timestamp: serverTimestamp()
                                        });
                                    }
                                });
                                transaction.update(roomRef, { status: 'CANCELLED', players: [], refunded: true });
                            });
                            onClose();
                        } catch (e) {
                            console.log("Refund error:", e);
                            Alert.alert("Error", "Could not refund users properly.");
                        }
                        setIsProcessing(false);
                    }}
                ]
            );
        } else {
            onClose();
        }
    };

    const launchLiveReflexMatch = async () => {
        if (players.length < 2) {
            Alert.alert("Waiting for Challengers ⏳", "Need at least 2 participants to share rewards!");
            return;
        }
        try {
            await updateDoc(roomRef, {
                status: 'PLAYING',
                gameStartedAt: serverTimestamp(),
                gameExpiresAt: Date.now() + 75000 
            });
        } catch (e) { console.log(e); }
    };

    const submitMyScore = async (finalScore: number) => {
        if (!auth.currentUser || hasSubmittedScoreRef.current) return;
        
        setHasSubmittedScore(true);
        hasSubmittedScoreRef.current = true;
        setIsPlayingSolo(false);
        const uid = auth.currentUser.uid;

        const pushScoreToDB = async (retryCount = 0) => {
            try {
                await runTransaction(db, async (transaction) => {
                    const roomSnap = await transaction.get(roomRef);
                    if (!roomSnap.exists() || roomSnap.data().status !== 'PLAYING') return;

                    const data = roomSnap.data();
                    const currentPlayers = data.players || [];
                    
                    const updatedPlayers = currentPlayers.map((p: any) => 
                        p.id === uid ? { ...p, score: finalScore, hasFinished: true } : p
                    );
                    
                    transaction.update(roomRef, { players: updatedPlayers });
                });
            } catch (e) {
                console.error(`Score Submit Retry ${retryCount}:`, e);
                if (retryCount < 3) {
                    setTimeout(() => pushScoreToDB(retryCount + 1), 1000 + Math.random() * 1500);
                }
            }
        };

        setTimeout(() => pushScoreToDB(0), Math.random() * 1500);
    };

    const processMasterPayout = async () => {
        if (isProcessing || !isHost) return;
        setIsProcessing(true);

        try {
            await runTransaction(db, async (transaction) => {
                const roomSnap = await transaction.get(roomRef);
                if (!roomSnap.exists()) return;
                const data = roomSnap.data();
                
                if (data.status !== 'PLAYING') return; 

                const currentPlayers = data.players || [];
                if (currentPlayers.length === 0) return; 

                const ranked = [...currentPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));
                
                const topScore = Number(ranked[0]?.score) || 0;
                const winners = ranked.filter(p => p.score === topScore);
                const isTie = winners.length > 1;
                
                const rawEntryFee = Number(data.entryFee) || 0;
                const totalPool = rawEntryFee * currentPlayers.length;
                
                const totalWinnerReward = Math.floor(totalPool * 0.75); 
                const adminCommission = Math.floor(totalPool * 0.15); 
                const expertBeans = Math.floor(totalPool * 0.10); 

                const rewardPerWinner = winners.length > 0 ? Math.floor(totalWinnerReward / winners.length) : 0;

                const winnerRefs = winners.map(w => doc(db, 'users', w.id));
                const winnerSnaps = await Promise.all(winnerRefs.map(ref => transaction.get(ref)));

                let expertSnap = null, liveSnap = null;
                const actualHostId = data.hostId || auth.currentUser?.uid; 

                if (actualHostId) {
                    const eRef = doc(db, 'users', actualHostId);
                    expertSnap = { snap: await transaction.get(eRef), ref: eRef };
                }
                
                if (liveId && actualHostId) {
                    const lRef = doc(db, actualCollection, liveId);
                    liveSnap = { snap: await transaction.get(lRef), ref: lRef };
                }

                winners.forEach((w, index) => {
                    const wSnap = winnerSnaps[index];
                    if(wSnap.exists()){
                        const wData = wSnap.data() || {};
                        const currentSafeBalance = Number(wData.balance) || 0;
                        const currentSafeWallet = Number(wData.walletBalance) || 0;
                        
                        transaction.update(wSnap.ref, { 
                            balance: currentSafeBalance + rewardPerWinner,
                            walletBalance: currentSafeWallet + rewardPerWinner
                        });
                        
                        const winTxRef = doc(db, 'transactions', `${w.id}_win_${Date.now()}`);
                        transaction.set(winTxRef, {
                            userId: w.id,
                            type: 'ARENA_REWARD',
                            amount: rewardPerWinner,
                            status: 'SUCCESS',
                            title: 'Reflex Arena Reward',
                            timestamp: serverTimestamp()
                        });
                    }
                });

                if (expertSnap && expertSnap.snap.exists()) {
                    const eData = expertSnap.snap.data() || {};
                    const safeEBeans = Number(eData.beans) || 0;
                    const safeEBalance = Number(eData.balance) || 0;
                    const safeWalletBal = Number(eData.walletBalance) || 0;
                    const safeBeansBal = Number(eData.beansBalance) || 0;
                    const safeTotalEarned = Number(eData.totalBeansEarned) || 0;

                    transaction.update(expertSnap.ref, { 
                        beans: safeEBeans + expertBeans,
                        balance: safeEBalance + expertBeans,
                        walletBalance: safeWalletBal + expertBeans,
                        beansBalance: safeBeansBal + expertBeans,
                        totalBeansEarned: safeTotalEarned + expertBeans
                    });
                    
                    const expertTxRef = doc(db, 'transactions', `${actualHostId}_commission_${Date.now()}`);
                    transaction.set(expertTxRef, {
                        userId: actualHostId,
                        type: 'HOST_BONUS',
                        amount: expertBeans,
                        currency: 'DIAMONDS', 
                        status: 'SUCCESS',
                        title: 'Arena Host Bonus',
                        timestamp: serverTimestamp()
                    });
                }

                if (liveSnap && liveSnap.snap.exists()) {
                    const lData = liveSnap.snap.data() || {};
                    const safeEarned = Number(lData.earnedBeans) || 0;
                    transaction.update(liveSnap.ref, { earnedBeans: safeEarned + expertBeans });
                }

                transaction.update(roomRef, {
                    status: 'FINISHED',
                    rankedPlayers: ranked, 
                    isTie: isTie,
                    winnerIds: winners.map(w => w.id), 
                    totalPool: totalPool,
                    rewardPerWinner: rewardPerWinner,
                    expertBeans: expertBeans,
                    adminCommission: adminCommission
                });
            });
        } catch (e) {
            console.error("Payout error:", e);
            setTimeout(processMasterPayout, 2000);
        }
        setIsProcessing(false);
    };

    const progressBarWidth = progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%']
    });

    const getWinnerText = () => {
        if (!matchResults || !players.length) return "UNKNOWN";
        if (matchResults.isTie) return "TIE - MULTIPLE TOP CHALLENGERS!";
        const w = players.find(p => p.id === matchResults.winnerIds?.[0]);
        return w ? w.name.toUpperCase() : "UNKNOWN";
    };

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.sheetOverlay}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                
                <Animated.View 
                    style={[styles.arcadeContentCard, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]}
                >
                    <LinearGradient colors={['#0F172A', '#020617']} style={StyleSheet.absoluteFill} />
                    
                    {/* Top Drag Handle */}
                    <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
                        <View style={styles.dragPill} />
                    </View>

                    <View style={styles.sheetHeaderRow}>
                        <View style={styles.titleIconBadge}>
                            <MaterialCommunityIcons name="brain" size={20} color="#00F2FE" />
                            <Text style={styles.mainTitleText}>REFLEX BLITZ Arena</Text>
                        </View>
                        <TouchableOpacity onPress={handleHostClose} style={styles.closeRoundBtn}>
                            <Ionicons name="close" size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* 🔥 SATTI FIX: GAME DISCONNECT POLICY WARNING 🔥 */}
                    {(gameStatus === 'WAITING' || gameStatus === 'PLAYING') && (
                        <View style={styles.warningBanner}>
                            <Ionicons name="warning" size={16} color="#F59E0B" />
                            <Text style={styles.warningText}>
                                {isHost 
                                    ? "HOST WARNING: Do not close app from recent tabs. Users will lose diamonds, and action will be taken against your account."
                                    : "NOTE: Do not close app during gameplay. Refunds apply ONLY for verified host disconnections."}
                            </Text>
                        </View>
                    )}

                    {/* MATCHMAKING */}
                    {gameStatus === 'WAITING' && (
                        <View style={styles.lobbyStateWrapper}>
                            <Text style={styles.lobbyHelperText}>{isFeeLocked ? `ARENA LOBBY LOCK (${lobbyTimeLeft}s)` : 'WAITING FOR HOST TO LOCK ARENA PASS...'}</Text>
                            
                            <View style={styles.entryFeeContainer}>
                                <Text style={styles.feeLabel}>ARENA PASS:</Text>
                                <Text style={styles.feeValueText}>🪙 {entryFee} Diamonds</Text>
                            </View>

                            {/* 🔥 SATTI FIX: Increased maxHeight to fit perfectly with taller modal 🔥 */}
                            <ScrollView style={{width: '100%', maxHeight: 220}} showsVerticalScrollIndicator={false}>
                                <View style={styles.playerPoolRow}>
                                    {[...Array(MAX_PLAYERS)].map((_, idx) => {
                                        const p = players[idx];
                                        if (p) {
                                            return (
                                                <View key={p.id || idx} style={styles.profileAuraWrapper}>
                                                    <View style={[styles.avatarAuraGlow, { borderColor: COLOR_POOL[idx % COLOR_POOL.length].colorCode }]}>
                                                        <Text style={styles.initialsAvatarText}>{p.name?.charAt(0).toUpperCase() || 'P'}</Text>
                                                    </View>
                                                    <Text style={styles.poolPlayerName} numberOfLines={1}>{p.name || 'Joined'}</Text>
                                                </View>
                                            );
                                        } else {
                                            return (
                                                <View key={`empty-${idx}`} style={styles.profileAuraWrapper}>
                                                    <View style={[styles.avatarAuraGlow, { borderColor: '#334155', borderStyle: 'dashed' }]}>
                                                        <Ionicons name="person-add" size={16} color="#334155" />
                                                    </View>
                                                    <Text style={[styles.poolPlayerName, { color: '#475569' }]}>Slot {idx + 1}</Text>
                                                </View>
                                            );
                                        }
                                    })}
                                </View>
                            </ScrollView>

                            {isHost && !isFeeLocked && (
                                <View style={{ width: '100%', marginBottom: 20 }}>
                                    <Text style={[styles.feeLabel, { marginBottom: 10 }]}>SELECT ARENA PASS (DIAMONDS)</Text>
                                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 5 }}>
                                        {ENTRY_FEES.map(fee => (
                                            <TouchableOpacity 
                                                key={fee} 
                                                onPress={() => updateRoomFee(fee)} 
                                                style={[styles.feeChip, entryFee === fee && styles.feeChipActive]}
                                            >
                                                <Text style={[styles.feeChipText, entryFee === fee && styles.feeChipTextActive]}>{fee} 💎</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                    <TouchableOpacity onPress={lockRoomFee} style={[styles.arcadeLaunchBtn, { width: '100%', marginTop: 20 }]}>
                                        <LinearGradient colors={['#A855F7', '#7E22CE']} style={StyleSheet.absoluteFill} />
                                        <Text style={[styles.launchBtnLabel, { color: '#FFF' }]}>🔒 LOCK {entryFee}💎 & OPEN ARENA</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                            
                            {isHost && isFeeLocked && (
                                <View style={{ width: '100%', marginBottom: 20, alignItems: 'center' }}>
                                    <Text style={[styles.feeLabel, { marginBottom: 10, color: '#F59E0B' }]}>🔒 ARENA PASS LOCKED</Text>
                                    <TouchableOpacity onPress={launchLiveReflexMatch} style={styles.arcadeLaunchBtn}>
                                        <LinearGradient colors={['#00F2FE', '#059669']} style={StyleSheet.absoluteFill} />
                                        <Text style={styles.launchBtnLabel}>START 60S CHALLENGE</Text>
                                    </TouchableOpacity>
                                    
                                    {players.length === 0 && (
                                        <TouchableOpacity onPress={unlockRoomFee} style={{marginTop: 15, padding: 10}}>
                                            <Text style={{color: '#94A3B8', fontWeight: 'bold', fontSize: 12}}>🔓 UNLOCK & EDIT PASS</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            {!isHost && isFeeLocked && !hasJoined && (
                                <TouchableOpacity onPress={handleJoinArena} disabled={isProcessing} style={styles.arcadeLaunchBtn}>
                                    <LinearGradient colors={['#F59E0B', '#D97706']} style={StyleSheet.absoluteFill} />
                                    <Text style={styles.launchBtnLabel}>{isProcessing ? 'PROCESSING...' : `JOIN ARENA (${entryFee} 💎)`}</Text>
                                </TouchableOpacity>
                            )}

                            {!isHost && !isFeeLocked && (
                                <Text style={[styles.waitServerSignalText, { color: '#F59E0B' }]}>⏳ Waiting for host to lock arena pass...</Text>
                            )}

                            {!isHost && hasJoined && (
                                <View style={{ alignItems: 'center', width: '100%' }}>
                                    <Text style={styles.waitServerSignalText}>You are in! Awaiting expert to launch... ({lobbyTimeLeft}s)</Text>
                                    <TouchableOpacity onPress={handleExitArena} disabled={isProcessing} style={[styles.arcadeLaunchBtn, { marginTop: 15, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#EF4444', elevation: 0 }]}>
                                        <Text style={[styles.launchBtnLabel, { color: '#EF4444' }]}>{isProcessing ? 'WAIT...' : 'EXIT & REFUND'}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    )}

                    {/* LIVE 60 SECONDS */}
                    {gameStatus === 'PLAYING' && (
                        <View style={styles.activeEngineMainContainer}>
                            <View style={styles.timelineTrackContainer}>
                                <Animated.View style={[styles.timelineFillBar, { width: progressBarWidth }]} />
                            </View>

                            {isHost ? (
                                <View style={styles.expertWaitingView}>
                                    <MaterialCommunityIcons name="timer-sand" size={60} color="#00F2FE" />
                                    <Text style={styles.expertPlayingTitle}>CHALLENGE IN PROGRESS!</Text>
                                    <Text style={styles.expertPlayingTime}>{gameTimeLeft}</Text>
                                    <Text style={styles.expertPlayingSub}>Challengers competing for {entryFee * players.length} 💎</Text>
                                    {gameTimeLeft === 0 && (
                                        <Text style={[styles.expertPlayingSub, { color: '#F59E0B', marginTop: 10 }]}>Evaluating final scores...</Text>
                                    )}
                                </View>
                            ) : (
                                <View style={{ flex: 1 }}>
                                    <View style={styles.hudHeaderStatsBar}>
                                        <View style={styles.hudBadgeContainer}>
                                            <Text style={styles.hudMetaLabel}>SCORE</Text>
                                            <Animated.Text style={[styles.hudValueText, { transform: [{ scale: scoreAnim }] }]}>{score}</Animated.Text>
                                        </View>
                                        <View style={[styles.hudBadgeContainer, { backgroundColor: 'rgba(255,42,95,0.1)', borderColor: '#FF2A5F' }]}>
                                            <Ionicons name="time" size={16} color="#FF2A5F" />
                                            <Text style={[styles.hudValueText, { color: '#FFF', fontVariant: ['tabular-nums'] }]}>{gameTimeLeft}s</Text>
                                        </View>
                                        <View style={[styles.hudBadgeContainer, { borderColor: '#FFD700' }]}>
                                            <Text style={styles.hudMetaLabel}>COMBO</Text>
                                            <Text style={[styles.hudValueText, { color: '#FFD700' }]}>x{combo}</Text>
                                        </View>
                                    </View>

                                    <View style={styles.ruleBannerContainer}>
                                        <Text style={[styles.ruleBannerText, { color: currentRule === 'COLOR' ? '#00F2FE' : '#FFD700' }]}>
                                            {currentRule === 'COLOR' ? '👉 MATCH THE COLOR 👈' : '👉 READ THE TEXT 👈'}
                                        </Text>
                                    </View>

                                    <View style={styles.centralMatrixBox}>
                                        <Animated.Text style={[styles.matrixWordRenderer, { 
                                            color: displayColor, 
                                            fontSize: wordFontSize,
                                            transform: [
                                                { rotate: wordTilt },
                                                { translateX: wordTranslate.x },
                                                { translateY: wordTranslate.y }
                                            ] 
                                        }]}>
                                            {targetWord}
                                        </Animated.Text>
                                    </View>

                                    <View style={styles.quadrantActionGrid}>
                                        {buttonDecoys.map((btnColor) => (
                                            <TouchableOpacity 
                                                key={`${btnColor.name}-${btnColor.colorCode}`}
                                                activeOpacity={0.7}
                                                onPress={() => handleColorTap(btnColor.name, btnColor.colorCode)}
                                                style={[styles.quadrantButton, { borderColor: btnColor.colorCode, backgroundColor: 'rgba(15,23,42,0.6)' }]}
                                            >
                                                <LinearGradient colors={[`${btnColor.colorCode}15`, 'transparent']} style={StyleSheet.absoluteFill} />
                                                <Text style={[styles.quadrantButtonLabel, { color: btnColor.colorCode }]}>{btnColor.name}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {!isHost && hasSubmittedScore && (
                                <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', zIndex: 10, borderRadius: 20 }]}>
                                    <Text style={{ fontSize: 40, marginBottom: 15 }}>⏳</Text>
                                    <Text style={{ color: '#00F2FE', fontSize: 16, fontWeight: '800' }}>Evaluating Scores...</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* DETAILED LEADERBOARD & RESULTS SCREEN */}
                    {gameStatus === 'FINISHED' && matchResults && (
                        <View style={styles.terminalStateWrapper}>
                            
                            {/* 🔥 SATTI UPDATE: MASS CELEBRATION FOR WINNERS ONLY 🔥 */}
                            {!isHost && matchResults.winnerIds?.includes(auth.currentUser?.uid) && (
                                <View style={[StyleSheet.absoluteFill, { zIndex: 999 }]} pointerEvents="none">
                                    <LottieView
                                        source={require('../assets/images/fireworks.json')} 
                                        autoPlay
                                        loop={false}
                                        style={{ width: '100%', height: '100%' }}
                                        resizeMode="cover"
                                    />
                                </View>
                            )}

                            <Ionicons name="trophy" size={42} color="#FFD700" style={styles.summaryTrophyIcon} />
                            
                            <Text style={styles.terminalTitle}>{getWinnerText()}</Text>
                            
                            <View style={styles.leaderboardContainer}>
                                <Text style={styles.leaderboardTitle}>🏆 ARENA LEADERBOARD</Text>
                                <ScrollView style={{ width: '100%', maxHeight: 100 }} showsVerticalScrollIndicator={false}>
                                    {matchResults.rankedPlayers?.map((p: any, idx: number) => {
                                        const isWinner = matchResults.winnerIds?.includes(p.id);
                                        return (
                                            <View key={p.id} style={[styles.leaderboardRow, isWinner && styles.leaderboardRowWinner]}>
                                                <Text style={styles.lbRank}>#{idx + 1}</Text>
                                                <Text style={styles.lbName} numberOfLines={1}>{p.name} {isWinner ? '👑' : ''}</Text>
                                                <Text style={styles.lbScore}>{p.score} pts</Text>
                                            </View>
                                        )
                                    })}
                                </ScrollView>
                            </View>

                            <View style={styles.resultDetailsCard}>
                                <View style={styles.resultRow}>
                                    <Text style={styles.resultLabel}>{matchResults.isTie ? 'Shared Reward (Per Winner):' : 'Top Challenger (75%):'}</Text>
                                    <Text style={[styles.resultValue, { color: '#10B981' }]}>+{matchResults.rewardPerWinner} 💎</Text>
                                </View>
                                {isHost && (
                                    <View style={styles.resultRow}>
                                        <Text style={styles.resultLabel}>Host Bonus (10%):</Text>
                                        <Text style={[styles.resultValue, { color: '#A855F7' }]}>+{matchResults.expertBeans} 🎖️</Text>
                                    </View>
                                )}
                                <View style={styles.resultRow}>
                                    <Text style={styles.resultLabel}>Total Rewards:</Text>
                                    <Text style={styles.resultValue}>{matchResults.totalPool} 💎</Text>
                                </View>
                            </View>

                            <TouchableOpacity onPress={onClose} style={[styles.arcadeLaunchBtn, { marginTop: 10 }]}>
                                <LinearGradient colors={['#334155', '#0F172A']} style={StyleSheet.absoluteFill} />
                                <Text style={[styles.launchBtnLabel, { color: '#FFF' }]}>EXIT ARENA</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* 🔥 SATTI FIX: Bottom Drag Handle Pinned to absolute bottom 🔥 */}
                    <View {...panResponder.panHandlers} style={[styles.dragHandleContainer, { position: 'absolute', bottom: 15, alignSelf: 'center', width: '100%', height: 30 }]}>
                        <View style={styles.dragPill} />
                    </View>

                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2, 6, 23, 0.5)' },
    // 🔥 SATTI FIX: Increased height from 0.78 to 0.85 so banner & players list fits nicely without cutting UI 🔥
    arcadeContentCard: { width: width, height: height * 0.85, borderTopLeftRadius: 40, borderTopRightRadius: 40, borderWidth: 2, borderColor: 'rgb(0, 241, 254)', overflow: 'hidden', padding: 25, paddingTop: 10, paddingBottom: 50 },
    
    dragHandleContainer: { width: '100%', height: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
    dragPill: { width: 50, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.3)' },

    sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    titleIconBadge: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    mainTitleText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
    closeRoundBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    
    // 🔥 SATTI FIX: COMPACT WARNING BANNER STYLES 🔥
    warningBanner: { flexDirection: 'row', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', marginBottom: 15, alignItems: 'center' },
    warningText: { color: '#F59E0B', fontSize: 10, fontWeight: '700', marginLeft: 8, flex: 1, lineHeight: 14 },

    lobbyStateWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    lobbyHelperText: { color: '#94A3B8', fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 10 },
    entryFeeContainer: { backgroundColor: 'rgba(0, 242, 254, 0.08)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.2)', marginBottom: 20 },
    feeLabel: { color: '#00F2FE', fontSize: 10, fontWeight: '900', textAlign: 'center', marginBottom: 2 },
    feeValueText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
    
    playerPoolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 25, width: '100%' },
    profileAuraWrapper: { alignItems: 'center', width: '17%', marginBottom: 10 }, 
    avatarAuraGlow: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowRadius: 10, shadowOpacity: 0.3, shadowOffset: { width: 0, height: 4 } },
    initialsAvatarText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    poolPlayerName: { color: '#CBD5E1', fontSize: 9, fontWeight: '700', marginTop: 5, textAlign: 'center' },
    
    arcadeLaunchBtn: { width: '85%', height: 56, borderRadius: 18, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowColor: '#00F2FE', shadowOpacity: 0.4, shadowRadius: 10 },
    launchBtnLabel: { color: '#020617', fontWeight: '900', fontSize: 15, letterSpacing: 1.5 },
    waitServerSignalText: { color: '#64748B', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginTop: 15 },

    activeEngineMainContainer: { flex: 1 },
    hudHeaderStatsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    hudBadgeContainer: { flex: 1, height: 50, backgroundColor: 'rgba(30,41,59,0.3)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center', marginHorizontal: 5 },
    hudMetaLabel: { color: '#94A3B8', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    hudValueText: { color: '#00F2FE', fontSize: 18, fontWeight: '900' },
    timelineTrackContainer: { width: '100%', height: 6, backgroundColor: '#1E293B', borderRadius: 3, overflow: 'hidden', marginBottom: 20 },
    timelineFillBar: { height: '100%', backgroundColor: '#FF2A5F', borderRadius: 3 },
    
    ruleBannerContainer: { backgroundColor: 'rgba(15,23,42,0.8)', paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 15, alignItems: 'center' },
    ruleBannerText: { fontSize: 16, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },

    centralMatrixBox: { flex: 1, justifyContent: 'center', alignItems: 'center', minHeight: 80, backgroundColor: 'rgba(15,23,42,0.4)', borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.03)', marginBottom: 15, padding: 10 },
    matrixWordRenderer: { fontWeight: '900', letterSpacing: 4, textShadowColor: 'rgba(0,0,0,0.4)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10 },
    
    quadrantActionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
    quadrantButton: { width: (width - 100) / 3, height: 60, borderRadius: 16, borderWidth: 2, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', elevation: 5 },
    quadrantButtonLabel: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },

    expertWaitingView: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(15,23,42,0.6)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(0,242,254,0.2)' },
    expertPlayingTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 20, letterSpacing: 2 },
    expertPlayingTime: { color: '#00F2FE', fontSize: 60, fontWeight: '900', marginVertical: 10 },
    expertPlayingSub: { color: '#94A3B8', fontSize: 14, fontWeight: '600' },

    terminalStateWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 15 },
    summaryTrophyIcon: { marginBottom: 5, shadowColor: '#FFD700', shadowOpacity: 0.5, shadowRadius: 15 },
    terminalTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1, marginBottom: 10, textAlign: 'center', textShadowColor: 'rgba(255,215,0,0.5)', textShadowRadius: 10 },
    
    leaderboardContainer: { width: '100%', backgroundColor: 'rgba(15,23,42,0.8)', borderRadius: 15, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    leaderboardTitle: { color: '#94A3B8', fontSize: 12, fontWeight: '800', marginBottom: 10, textAlign: 'center', letterSpacing: 1 },
    leaderboardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 8, marginBottom: 5 },
    leaderboardRowWinner: { backgroundColor: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)', borderWidth: 1 },
    lbRank: { color: '#94A3B8', fontSize: 14, fontWeight: '900', width: 30 },
    lbName: { color: '#FFF', fontSize: 14, fontWeight: '800', flex: 1, marginLeft: 10 },
    lbScore: { color: '#00F2FE', fontSize: 14, fontWeight: '900' },

    resultDetailsCard: { width: '100%', backgroundColor: 'rgba(30,41,59,0.5)', borderRadius: 15, padding: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', marginBottom: 10 },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
    resultLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
    resultValue: { color: '#FFF', fontSize: 14, fontWeight: '900' },

    feeChip: { backgroundColor: 'rgba(30,41,59,0.5)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    feeChipActive: { backgroundColor: 'rgb(254, 135, 0)', borderColor: '#fe00b2' },
    feeChipText: { color: '#feffff', fontSize: 12, fontWeight: '800' },
    feeChipTextActive: { color: '#000000', fontSize: 14, fontWeight: '900' }
});