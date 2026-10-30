import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, getDoc, onSnapshot, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, FlatList, Image, Modal, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

const COLOR_POOL = [
    { name: 'RED', colorCode: '#FF2A5F' },
    { name: 'BLUE', colorCode: '#00F2FE' },
    { name: 'GREEN', colorCode: '#10B981' },
    { name: 'YELLOW', colorCode: '#FFD700' },
    { name: 'PURPLE', colorCode: '#A855F7' }, 
    { name: 'ORANGE', colorCode: '#F97316' }  
];

const MIN_PLAYERS = 2;
const MAX_PLAYERS = 10;

// 🔥 15 Pairs (13 Normal, 1 Jackpot, 1 Trap) for the 30-Card Grid 🔥
const EMOJI_PAIRS = ['🍎', '🍌', '🍇', '🍉', '🍓', '🍒', '🍍', '🥝', '🥑', '🥕', '🌽', '🍩', '🍕', '💎', '☠️'];

interface GlassPathProps {
    visible: boolean;
    onClose: () => void;
    liveId: string;
    isHost: boolean;
    entryFee?: number; // 🆓 Game is free now. Prop kept optional so existing callers don't break.
    userWalletBalance?: number;
    collectionName?: string; 
}

// 🔥 Optimized PlayerItem Component outside to fix VirtualizedList Warning 🔥
const PlayerItem = React.memo(({ item }: { item: any }) => (
    <View style={{ alignItems: 'center', marginRight: 15 }}>
        <View style={[styles.playerAvatarWrapper, (item.status === 'eliminated' || item.status === 'time_up') && styles.eliminatedAvatar, { marginRight: 0 }]}>
            {item.avatar ? (
                <Image source={{ uri: item.avatar }} style={styles.playerAvatar} />
            ) : (
                <View style={styles.playerInitials}><Text style={styles.initialText}>{item.name?.charAt(0)}</Text></View>
            )}
            {(item.status === 'eliminated' || item.status === 'time_up') && <View style={styles.crossOverlay}><Ionicons name="close" size={20} color="#EF4444" /></View>}
        </View>
        <Text style={styles.scoreText}>{item.score || 0} Pts</Text>
    </View>
));

export default function GlassPathSheet({ visible, onClose, liveId, isHost, userWalletBalance = 0, collectionName = 'lives' }: GlassPathProps) {
    const [gameStatus, setGameStatus] = useState<'WAITING' | 'SHUFFLING' | 'PLAYING' | 'FINISHED' | 'CANCELLED'>('WAITING');
    const [players, setPlayers] = useState<any[]>([]);
    // 🆓 isFeeLocked now simply means "Arena is OPEN for joining" (Firestore field name kept for compatibility)
    const [isFeeLocked, setIsFeeLocked] = useState<boolean>(false);
    const [hostId, setHostId] = useState<string>('');
    const [matchResults, setMatchResults] = useState<any>(null); 
    const [isProcessing, setIsProcessing] = useState<boolean>(false); 
    const [lobbyTimeLeft, setLobbyTimeLeft] = useState<number>(45); 
    
    // --- Memory Match Engine States ---
    const [deck, setDeck] = useState<string[]>([]);
    const [myOpenCards, setMyOpenCards] = useState<number[]>([]);
    const [myMatchedPairs, setMyMatchedPairs] = useState<string[]>([]);
    const [isChecking, setIsChecking] = useState<boolean>(false);

    // 🔥 Twist States 🔥
    const [consecutiveMistakes, setConsecutiveMistakes] = useState<number>(0);
    const [isFrozen, setIsFrozen] = useState<boolean>(false);
    const [isBlackout, setIsBlackout] = useState<boolean>(false);
    const [showJackpotFlash, setShowJackpotFlash] = useState<boolean>(false);

    // 🔥 Score & Combo States 🔥
    const [myProgress, setMyProgress] = useState(0); 
    const [myScore, setMyScore] = useState<number>(0);
    const [myCombo, setMyCombo] = useState<number>(1);
    const [myStatus, setMyStatus] = useState<'idle' | 'playing' | 'eliminated' | 'won' | 'time_up'>('idle');
    
    // 60-Second Panic Timer
    const [timeLeftToCross, setTimeLeftToCross] = useState<number>(60); 

    const hasJoined = players.some(p => p.id === auth.currentUser?.uid);

    // 🔥 SATTI FIX: Auto-detect forum vs live based on ID 🔥
    const actualCollection = liveId?.startsWith('forum_') ? 'forum_rooms' : collectionName;
    const roomRef = doc(db, actualCollection, liveId, 'games', 'memory_match');

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

    useEffect(() => {
        if (!liveId || !visible || isHost) return;
        const parentRoomRef = doc(db, actualCollection, liveId);
        
        const unsubParent = onSnapshot(parentRoomRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data.status === 'ended' || data.status === 'CANCELLED') {
                    handleHostDropExit();
                }
            }
        });

        return () => unsubParent();
    }, [liveId, visible, isHost, actualCollection]);

    // 🆓 Host dropped / room ended: just remove the player from the arena and close (no wallet logic)
    const handleHostDropExit = async () => {
        if (!auth.currentUser || isProcessing) return;
        const uid = auth.currentUser.uid;
        try {
            await runTransaction(db, async (transaction) => {
                const gameSnap = await transaction.get(roomRef);

                if (!gameSnap.exists()) return;
                const gameData = gameSnap.data();

                if (gameData.status === 'FINISHED' || gameData.status === 'CANCELLED') return;

                const currentPlayers = gameData.players || [];
                const myPlayerObj = currentPlayers.find((p: any) => p.id === uid);
                if (!myPlayerObj) return; 

                const updatedPlayers = currentPlayers.filter((p: any) => p.id !== uid);
                transaction.update(roomRef, { players: updatedPlayers });
            });
            onClose(); 
        } catch (e) {
            console.log("Host drop exit error:", e);
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
                        isFeeLocked: false,
                        hostId: auth.currentUser?.uid, 
                        players: [], 
                        deck: [], 
                        createdAt: serverTimestamp() 
                    });
                    setMatchResults(null);
                    setPlayers([]);
                    setIsFeeLocked(false);
                    setMyProgress(0);
                    setMyScore(0);
                    setMyCombo(1);
                    setMyStatus('idle');
                    setTimeLeftToCross(60);
                    setMyOpenCards([]);
                    setMyMatchedPairs([]);
                    setIsChecking(false);
                    setConsecutiveMistakes(0);
                    setIsFrozen(false);
                    setIsBlackout(false);
                    setShowJackpotFlash(false);
                }
            });
        }

        const unsub = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.status) setGameStatus(data.status);
                if (data.players) setPlayers(data.players);
                if (data.isFeeLocked !== undefined) setIsFeeLocked(data.isFeeLocked);
                if (data.hostId) setHostId(data.hostId);
                if (data.deck) setDeck(data.deck);
                
                if (data.status === 'SHUFFLING') {
                    setMyOpenCards([]);
                    setMyMatchedPairs([]);
                    setMyProgress(0);
                    setMyScore(0);
                    setMyCombo(1);
                    setIsChecking(false);
                    setConsecutiveMistakes(0);
                    setIsFrozen(false);
                    setIsBlackout(false);
                    setShowJackpotFlash(false);
                    setTimeLeftToCross(60);
                }

                if (auth.currentUser) {
                    const me = data.players?.find((p: any) => p.id === auth.currentUser?.uid);
                    if (me) {
                        setMyStatus(me.status);
                        setMyProgress(me.progress || 0);
                        setMyScore(me.score || 0);
                    }
                }

                if (data.status === 'FINISHED') {
                    setMatchResults({
                        isTie: data.isTie,
                        winnerIds: data.winnerIds,
                        rankedPlayers: data.rankedPlayers || data.players 
                    });

                    if (isHost && !data.payoutProcessed) {
                        finalizeMatchResults();
                    }
                }

                if (data.status === 'CANCELLED') {
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
        let playTimer: ReturnType<typeof setInterval>;
        if (gameStatus === 'PLAYING') {
            playTimer = setInterval(() => {
                setTimeLeftToCross(prev => {
                    if (prev <= 1) {
                        clearInterval(playTimer);
                        if (myStatus === 'playing') {
                            handleTimeOutElimination();
                        }
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else if (gameStatus === 'SHUFFLING') {
            setTimeLeftToCross(60);
        }
        return () => { if(playTimer) clearInterval(playTimer); }
    }, [gameStatus, myStatus, isHost]);

    // 🆓 Host opens the arena lobby (no fee, no diamonds)
    const openArena = async () => {
        try {
            await setDoc(roomRef, { isFeeLocked: true }, { merge: true });
        } catch (e) { console.log("Open Arena Error", e); }
    };

    const closeArenaLobby = async () => {
        try {
            await setDoc(roomRef, { isFeeLocked: false }, { merge: true });
        } catch (e) { console.log("Close Lobby Error", e); }
    };

    // 🆓 Works for both Host and Players (Host can now play too)
    const handleJoinArena = async () => {
        if (!auth.currentUser || isProcessing || !isFeeLocked) return;
        setIsProcessing(true);
        const uid = auth.currentUser.uid;
        const uName = auth.currentUser.displayName || 'Player';
        const avatar = auth.currentUser.photoURL || "";

        try {
            await runTransaction(db, async (transaction) => {
                const roomSnap = await transaction.get(roomRef);

                if (!roomSnap.exists()) throw "Data missing! Arena setup might be incomplete.";
                
                const roomData = roomSnap.data();
                const currentPlayers = roomData.players || [];

                if (currentPlayers.find((p: any) => p.id === uid)) throw "Already joined";
                if (currentPlayers.length >= MAX_PLAYERS) throw "Arena Full";

                transaction.update(roomRef, {
                    players: [...currentPlayers, { id: uid, name: uName, avatar: avatar, status: 'playing', progress: 0, score: 0, joinedAt: Date.now() }]
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
                const roomSnap = await transaction.get(roomRef);

                if (!roomSnap.exists()) throw "Data missing";
                const roomData = roomSnap.data();

                if (roomData.status !== 'WAITING') throw "Arena already active! Can't exit now.";

                const currentPlayers = roomData.players || [];
                const myPlayerObj = currentPlayers.find((p: any) => p.id === uid);

                if (!myPlayerObj) throw "You are not in the arena";

                const updatedPlayers = currentPlayers.filter((p: any) => p.id !== uid);
                transaction.update(roomRef, { players: updatedPlayers });
            });
            Alert.alert("Left Arena 🎖️", "You left the arena.");
        } catch (e: any) {
            Alert.alert("Exit Failed", e.toString());
        }
        setIsProcessing(false);
    };

    const handleHostClose = async () => {
        if (isHost && (gameStatus === 'WAITING' || gameStatus === 'SHUFFLING' || gameStatus === 'PLAYING') && players.length > 0) {
            Alert.alert(
                "Cancel Arena?",
                "Closing now will cancel the arena for all participants.",
                [
                    { text: "Cancel", style: "cancel" },
                    { text: "Yes, Cancel Arena", style: "destructive", onPress: async () => {
                        setIsProcessing(true);
                        try {
                            await runTransaction(db, async (transaction) => {
                                const roomSnap = await transaction.get(roomRef);
                                if(!roomSnap.exists()) return;
                                const data = roomSnap.data();

                                if (data.status === 'CANCELLED') { return; }

                                transaction.update(roomRef, { status: 'CANCELLED', players: [] });
                            });
                            onClose();
                        } catch (e) {
                            Alert.alert("Error", "Could not cancel the arena properly.");
                        }
                        setIsProcessing(false);
                    }}
                ]
            );
        } else {
            onClose();
        }
    };

    const launchLiveMatch = async () => {
        if (players.length < MIN_PLAYERS) {
            Alert.alert("Waiting for Challengers ⏳", `Need at least ${MIN_PLAYERS} participants to start the match!`);
            return;
        }
        try {
            let newDeck = [...EMOJI_PAIRS, ...EMOJI_PAIRS];
            newDeck.sort(() => Math.random() - 0.5);
            
            await setDoc(roomRef, {
                status: 'SHUFFLING',
                deck: newDeck, 
                gameStartedAt: serverTimestamp(),
                players: players.map(p => ({ ...p, status: 'playing', progress: 0, score: 0 }))
            }, { merge: true });

            setTimeout(async () => {
                await updateDoc(roomRef, { status: 'PLAYING' });
            }, 3000); 

        } catch (e) { console.log(e); }
    };

    const handleTimeOutElimination = async () => {
        if (!auth.currentUser) return;
        
        try {
            const snap = await getDoc(roomRef);
            if (!snap.exists()) return;
            let data = snap.data();
            let freshPlayersList = data.players || [];
            
            let myIndex = freshPlayersList.findIndex((p: any) => p.id === auth.currentUser?.uid);
            if (myIndex === -1 || freshPlayersList[myIndex].status !== 'playing') return;

            freshPlayersList[myIndex].status = 'time_up';
            const allFinished = freshPlayersList.every((p: any) => p.status === 'time_up' || p.status === 'won');
            
            const updates: any = { players: freshPlayersList };
            
            if (allFinished) {
                updates.status = 'FINISHED';
                const maxScore = Math.max(...freshPlayersList.map((p: any) => p.score || 0));
                
                if (maxScore > 0) { 
                    updates.winnerIds = freshPlayersList.filter((p: any) => p.score === maxScore).map((p: any) => p.id);
                    updates.isTie = updates.winnerIds.length > 1;
                } else {
                    updates.winnerIds = [];
                    updates.isTie = false;
                }
                updates.payoutProcessed = false;
            }
            
            await updateDoc(roomRef, updates);
            setMyStatus('time_up'); 
        } catch (e) {
            console.log(e);
        }
    };

    const handleCardPress = async (index: number) => {
        if (!auth.currentUser || gameStatus !== 'PLAYING' || myStatus !== 'playing') return;
        if (isChecking || isFrozen || isBlackout || myOpenCards.includes(index) || myMatchedPairs.includes(deck[index])) return;

        const newOpen = [...myOpenCards, index];
        setMyOpenCards(newOpen);

        if (newOpen.length === 2) {
            setIsChecking(true);
            const card1 = deck[newOpen[0]];
            const card2 = deck[newOpen[1]];

            if (card1 === card2) {
                setConsecutiveMistakes(0);
                const newMatched = [...myMatchedPairs, card1];
                setMyMatchedPairs(newMatched);
                setMyOpenCards([]);
                setIsChecking(false);

                let addedScore = 0;
                let newCombo = myCombo;

                if (card1 === '💎') {
                    addedScore = 300 * myCombo;
                    newCombo = myCombo + 1;
                    setShowJackpotFlash(true);
                    setTimeout(() => setShowJackpotFlash(false), 1000);
                } else if (card1 === '☠️') {
                    addedScore = -200;
                    setIsBlackout(true);
                    setTimeout(() => setIsBlackout(false), 3000);
                } else {
                    addedScore = 100 * myCombo;
                    newCombo = myCombo + 1;
                }

                const newScore = myScore + addedScore;
                setMyScore(newScore);
                setMyCombo(newCombo);

                setPlayers(prevPlayers => prevPlayers.map(p => 
                    p.id === auth.currentUser?.uid ? { ...p, progress: newMatched.length, score: newScore } : p
                ));

                getDoc(roomRef).then(snap => {
                    if (snap.exists()) {
                        let freshPlayers = snap.data().players || [];
                        let mIndex = freshPlayers.findIndex((p:any) => p.id === auth.currentUser?.uid);
                        if (mIndex !== -1) {
                            freshPlayers[mIndex].progress = newMatched.length;
                            freshPlayers[mIndex].score = newScore;
                            
                            if (newMatched.length === 15) {
                                const finalWinScore = newScore + 1000;
                                freshPlayers[mIndex].score = finalWinScore;
                                setMyScore(finalWinScore);

                                freshPlayers[mIndex].status = 'won';
                                updateDoc(roomRef, { 
                                    status: 'FINISHED', 
                                    winnerIds: [auth.currentUser?.uid],
                                    isTie: false,
                                    players: freshPlayers,
                                    payoutProcessed: false
                                });
                            } else {
                                updateDoc(roomRef, { players: freshPlayers });
                            }
                        }
                    }
                });

            } else {
                setMyCombo(1);
                
                setConsecutiveMistakes(prev => {
                    const mistakes = prev + 1;
                    if (mistakes >= 5) {
                        setIsFrozen(true);
                        setTimeout(() => { setIsFrozen(false); setConsecutiveMistakes(0); }, 3000); 
                    }
                    return mistakes;
                });

                setTimeout(() => {
                    setMyOpenCards([]);
                    setIsChecking(false);
                }, 600);
            }
        }
    };

    // 🆓 No payout anymore. Host only ranks the players and marks the match as processed.
    const finalizeMatchResults = async () => {
        if (isProcessing || !isHost) return;
        setIsProcessing(true);

        try {
            await runTransaction(db, async (transaction) => {
                const roomSnap = await transaction.get(roomRef);
                if (!roomSnap.exists()) return;
                const data = roomSnap.data();
                
                if (data.status !== 'FINISHED' || data.payoutProcessed) return; 

                const currentPlayers = data.players || [];
                if (currentPlayers.length === 0) return; 

                const winnerIds = data.winnerIds || [];
                const isTie = winnerIds.length > 1; 

                const ranked = [...currentPlayers].sort((a, b) => {
                    if (a.status === 'won' && b.status !== 'won') return -1;
                    if (b.status === 'won' && a.status !== 'won') return 1;
                    return (b.score || 0) - (a.score || 0);
                });

                transaction.update(roomRef, {
                    payoutProcessed: true,
                    rankedPlayers: ranked, 
                    isTie: isTie
                });
            });
        } catch (e) {
            console.error("Finalize results error:", e);
        }
        setIsProcessing(false);
    };

    const getWinnerText = () => {
        if (!matchResults) return "UNKNOWN";
        if (matchResults.winnerIds?.length === 0) return "NOBODY SCORED ☠️";
        if (matchResults.isTie) return "TIE - MULTIPLE WINNERS!";
        const w = players.find(p => p.id === matchResults.winnerIds?.[0]);
        return w ? `${w.name.toUpperCase()} WON! 🏆` : "UNKNOWN";
    };

    const topScore = matchResults?.rankedPlayers?.length
        ? Math.max(...matchResults.rankedPlayers.map((p: any) => p.score || 0))
        : 0;

    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.sheetOverlay}>
                <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
                
                <Animated.View 
                    style={[styles.arcadeContentCard, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]}
                >
                    <LinearGradient colors={['#0F172A', '#020617']} style={StyleSheet.absoluteFill} />
                    
                    <View {...panResponder.panHandlers} style={styles.dragHandleContainer}>
                        <View style={styles.dragPill} />
                    </View>

                    <View style={styles.sheetHeaderRow}>
                        <View style={styles.titleIconBadge}>
                            <MaterialCommunityIcons name="cards-playing-outline" size={24} color="#A855F7" style={styles.glowIcon} />
                            <Text style={styles.mainTitleText} numberOfLines={1} adjustsFontSizeToFit>MEMORY MATCH ARENA</Text>
                        </View>
                        <TouchableOpacity onPress={handleHostClose} style={styles.closeRoundBtn}>
                            <Ionicons name="close" size={20} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    {/* MATCHMAKING / LOBBY */}
                    {gameStatus === 'WAITING' && (
                        <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
                            <View style={styles.lobbyStateWrapper}>
                                <Text style={styles.lobbyHelperText}>{isFeeLocked ? `ARENA LOBBY OPEN (${lobbyTimeLeft}s)` : 'WAITING FOR HOST TO OPEN ARENA...'}</Text>
                                
                                <View style={styles.entryFeeContainer}>
                                    <Text style={styles.feeLabel}>ARENA PASS:</Text>
                                    <Text style={styles.feeValueText}>🎮 FREE TO PLAY</Text>
                                </View>

                                <View style={styles.playerPoolRow}>
                                    {[...Array(MAX_PLAYERS)].map((_, idx) => {
                                        const p = players[idx];
                                        if (p) {
                                            return (
                                                <View key={p.id || idx} style={styles.profileAuraWrapper}>
                                                    <View style={[styles.avatarAuraGlow, { borderColor: COLOR_POOL[idx % COLOR_POOL.length].colorCode }]}>
                                                        {p.avatar ? (
                                                            <Image source={{ uri: p.avatar }} style={{width: '100%', height: '100%', borderRadius: 21}} />
                                                        ) : (
                                                            <Text style={styles.initialsAvatarText}>{p.name?.charAt(0).toUpperCase() || 'P'}</Text>
                                                        )}
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

                                {isHost && !isFeeLocked && (
                                    <View style={{ width: '100%', marginBottom: 20, alignItems: 'center' }}>
                                        <TouchableOpacity onPress={openArena} style={[styles.arcadeLaunchBtn, { width: '100%', marginTop: 20 }]}>
                                            <LinearGradient colors={['#A855F7', '#7E22CE']} style={StyleSheet.absoluteFill} />
                                            <Text style={[styles.launchBtnLabel, { color: '#FFF' }]}>🚀 OPEN ARENA</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                
                                {isHost && isFeeLocked && (
                                    <View style={{ width: '100%', marginBottom: 20, alignItems: 'center' }}>
                                        <Text style={[styles.feeLabel, { marginBottom: 10, color: '#F59E0B' }]}>✅ ARENA OPEN</Text>
                                        <TouchableOpacity onPress={launchLiveMatch} style={styles.arcadeLaunchBtn}>
                                            <LinearGradient colors={['#00F2FE', '#059669']} style={StyleSheet.absoluteFill} />
                                            <Text style={styles.launchBtnLabel}>START 60s MEMORY MATCH</Text>
                                        </TouchableOpacity>
                                        
                                        {players.length === 0 && (
                                            <TouchableOpacity onPress={closeArenaLobby} style={{marginTop: 15, padding: 10}}>
                                                <Text style={{color: '#94A3B8', fontWeight: 'bold', fontSize: 12}}>🔓 CLOSE LOBBY</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}

                                {isFeeLocked && !hasJoined && (
                                    <TouchableOpacity onPress={handleJoinArena} disabled={isProcessing} style={styles.arcadeLaunchBtn}>
                                        <LinearGradient colors={['#F59E0B', '#D97706']} style={StyleSheet.absoluteFill} />
                                        <Text style={styles.launchBtnLabel}>{isProcessing ? 'PROCESSING...' : 'JOIN ARENA'}</Text>
                                    </TouchableOpacity>
                                )}

                                {!isHost && !isFeeLocked && (
                                    <Text style={[styles.waitServerSignalText, { color: '#F59E0B' }]}>⏳ Waiting for host to open the arena...</Text>
                                )}

                                {hasJoined && (
                                    <View style={{ alignItems: 'center', width: '100%' }}>
                                        <Text style={styles.waitServerSignalText}>
                                            {isHost ? `You joined as a player! Start when ready. (${lobbyTimeLeft}s)` : `You are in! Awaiting expert to launch... (${lobbyTimeLeft}s)`}
                                        </Text>
                                        <TouchableOpacity onPress={handleExitArena} disabled={isProcessing} style={[styles.arcadeLaunchBtn, { marginTop: 15, backgroundColor: 'transparent', borderWidth: 1, borderColor: '#EF4444', elevation: 0 }]}>
                                            <Text style={[styles.launchBtnLabel, { color: '#EF4444' }]}>{isProcessing ? 'WAIT...' : 'EXIT ARENA'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                                
                                {/* 🔥 SATTI FIX: Warning moved to bottom of Lobby ScrollView 🔥 */}
                                <View style={[styles.warningBanner, { marginTop: 20 }]}>
                                    <Ionicons name="warning" size={14} color="#F59E0B" />
                                    <Text style={styles.warningText}>
                                        {isHost 
                                            ? "HOST WARNING: Do not close app from recent tabs. It will end the arena for all players, and action may be taken against your account."
                                            : "NOTE: Do not close app during gameplay. If the host disconnects, the arena will end."}
                                    </Text>
                                </View>
                            </View>
                        </ScrollView>
                    )}

                    {/* LIVE MEMORY MATCH ENGINE (30 CARDS FLATLIST) */}
                    {(gameStatus === 'SHUFFLING' || gameStatus === 'PLAYING') && (
                        <View style={styles.activeEngineMainContainer}>
                            
                            {/* 🔥 SATTI FIX: Reduced spacing here to fit grid perfectly 🔥 */}
                            <View style={[
                                styles.statusPill, 
                                gameStatus === 'SHUFFLING' && styles.shufflingPill,
                                gameStatus === 'PLAYING' && timeLeftToCross <= 10 && { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.2)' }
                            ]}>
                                <Text style={[
                                    styles.statusText, 
                                    gameStatus === 'SHUFFLING' && { color: '#A855F7' },
                                    gameStatus === 'PLAYING' && timeLeftToCross <= 10 && { color: '#EF4444', fontSize: 16 }
                                ]}>
                                    {gameStatus === 'SHUFFLING' && "PREPARING BOARD... ⚡"}
                                    {gameStatus === 'PLAYING' && `⏳ MATCH ALL PAIRS IN: 00:${timeLeftToCross < 10 ? '0'+timeLeftToCross : timeLeftToCross}`}
                                </Text>
                            </View>

                            <View style={{ flexDirection: 'row', gap: 20, marginBottom: 2 }}>
                                <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '900', textShadowColor: 'rgba(255,215,0,0.5)', textShadowRadius: 5 }}>💎 JACKPOT: +300</Text>
                                <Text style={{ color: '#EF4444', fontSize: 10, fontWeight: '900', textShadowColor: 'rgba(239,68,68,0.5)', textShadowRadius: 5 }}>☠️ TRAP: -200</Text>
                            </View>

                            {myStatus === 'playing' && (
                                <View style={styles.liveHudContainer}>
                                    <Text style={styles.hudScoreText}>SCORE: {myScore}</Text>
                                    <Text style={styles.hudComboText}>COMBO x{myCombo}</Text>
                                </View>
                            )}

                            <View style={styles.playersContainer}>
                                <Text style={styles.playersTitle}>SURVIVORS & SCORE ({players.filter(p=>p.status!=='eliminated' && p.status!=='time_up').length}/{players.length})</Text>
                                <FlatList
                                    data={players}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    keyExtractor={(item) => item.id}
                                    getItemLayout={(data, index) => ({
                                        length: 70,
                                        offset: 70 * index,
                                        index,
                                    })}
                                    initialNumToRender={10}
                                    maxToRenderPerBatch={5}
                                    windowSize={5}
                                    renderItem={({ item }) => <PlayerItem item={item} />}
                                />
                            </View>

                            <View style={styles.gridContainerWrapper}>
                                <FlatList 
                                    data={deck}
                                    numColumns={5}
                                    keyExtractor={(_, index) => index.toString()}
                                    style={{ width: '100%' }}
                                    contentContainerStyle={styles.gridContainer}
                                    columnWrapperStyle={styles.columnWrapper}
                                    showsVerticalScrollIndicator={false}
                                    /* 🔥 SATTI FIX: Added Warning Banner at the bottom of the grid list 🔥 */
                                    ListFooterComponent={() => (
                                        <View style={[styles.warningBanner, { marginTop: 15, width: '95%', alignSelf: 'center' }]}>
                                            <Ionicons name="warning" size={14} color="#F59E0B" />
                                            <Text style={styles.warningText}>
                                                {isHost 
                                                    ? "HOST WARNING: Do not close app from recent tabs. It will end the arena for all players, and action may be taken against your account."
                                                    : "NOTE: Do not close app during gameplay. If the host disconnects, the arena will end."}
                                            </Text>
                                        </View>
                                    )}
                                    renderItem={({ item, index }) => {
                                        const isFlipped = myOpenCards.includes(index) || myMatchedPairs.includes(item);
                                        const isMatched = myMatchedPairs.includes(item);

                                        return (
                                            <TouchableOpacity 
                                                activeOpacity={0.8}
                                                disabled={isChecking || isFrozen || isBlackout || isFlipped || myStatus !== 'playing' || gameStatus !== 'PLAYING'}
                                                style={[
                                                    styles.card, 
                                                    isFlipped && styles.neonGlowBlue, 
                                                    isMatched && styles.neonGlowGreen
                                                ]}
                                                onPress={() => handleCardPress(index)}
                                            >
                                                {isFlipped ? (
                                                    <LinearGradient 
                                                        colors={isMatched ? ['rgba(16,185,129,0.3)', 'rgba(5,150,105,0.1)'] : ['#00F2FE', '#0284C7']} 
                                                        style={styles.boxGradient}
                                                    >
                                                        {isMatched ? (
                                                            <Ionicons name="checkmark-done" size={20} color="#10B981" />
                                                        ) : (
                                                            <Text style={styles.cardEmojiText}>{item}</Text>
                                                        )}
                                                    </LinearGradient>
                                                ) : (
                                                    <View style={styles.cardBack}>
                                                        <MaterialCommunityIcons name="hexagon-slice-6" size={20} color="rgba(255,255,255,0.1)" />
                                                    </View>
                                                )}
                                            </TouchableOpacity>
                                        );
                                    }}
                                />

                                {isBlackout && (
                                    <View style={styles.blackoutOverlay}>
                                        <Ionicons name="skull" size={80} color="#EF4444" style={{ shadowColor: '#EF4444', shadowRadius: 20, shadowOpacity: 1 }} />
                                        <Text style={styles.massFreezeTitle}>TRAP HIT!</Text>
                                        <Text style={styles.massFreezeSub}>-200 POINTS & BLINDED</Text>
                                    </View>
                                )}

                                {showJackpotFlash && (
                                    <View style={styles.jackpotFlash}>
                                        <Text style={{ fontSize: 80 }}>💎</Text>
                                        <Text style={[styles.massFreezeTitle, { color: '#000', textShadowColor: '#FFF' }]}>JACKPOT!</Text>
                                        <Text style={[styles.massFreezeSub, { color: '#000' }]}>+300 POINTS</Text>
                                    </View>
                                )}

                                {isFrozen && !isBlackout && !showJackpotFlash && (
                                    <View style={styles.massFreezeOverlay}>
                                        <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
                                        <LinearGradient colors={['rgba(239,68,68,0.3)', 'rgba(2,6,23,0.8)']} style={StyleSheet.absoluteFill} />
                                        <Ionicons name="warning" size={60} color="#EF4444" style={{ marginBottom: 10, shadowColor: '#EF4444', shadowRadius: 20, shadowOpacity: 1 }} />
                                        <Text style={styles.massFreezeTitle}>SYSTEM LOCKED!</Text>
                                        <Text style={styles.massFreezeSub}>5 MISTAKES = 3s PENALTY</Text>
                                    </View>
                                )}
                            </View>

                            {(myStatus === 'eliminated' || myStatus === 'time_up') && timeLeftToCross <= 0 && (
                                <Text style={styles.eliminatedText} numberOfLines={1} adjustsFontSizeToFit>TIME OUT! WAITING FOR RESULTS... ⏳</Text>
                            )}

                        </View>
                    )}

                    {/* DETAILED LEADERBOARD & RESULTS SCREEN */}
                    {gameStatus === 'FINISHED' && matchResults && (
                        <View style={styles.terminalStateWrapper}>
                            
                            {matchResults.winnerIds?.includes(auth.currentUser?.uid) && (
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
                            
                            <Text style={styles.terminalTitle} numberOfLines={1} adjustsFontSizeToFit>{getWinnerText()}</Text>
                            
                            <View style={styles.leaderboardContainer}>
                                <Text style={styles.leaderboardTitle}>🏆 ARENA SURVIVAL BOARD</Text>
                                <ScrollView style={{ flex: 1, width: '100%' }} showsVerticalScrollIndicator={false}>
                                    {matchResults.rankedPlayers?.map((p: any, idx: number) => {
                                        const isWinner = matchResults.winnerIds?.includes(p.id);
                                        return (
                                            <View key={p.id} style={[styles.leaderboardRow, isWinner && styles.leaderboardRowWinner]}>
                                                <Text style={styles.lbRank}>#{idx + 1}</Text>
                                                <Text style={styles.lbName} numberOfLines={1} ellipsizeMode="tail">{p.name} {isWinner ? '👑' : ''}</Text>
                                                <Text style={styles.lbScore}>{p.score || 0} Pts</Text>
                                            </View>
                                        )
                                    })}
                                </ScrollView>
                            </View>

                            <View style={styles.resultDetailsCard}>
                                <View style={styles.resultRow}>
                                    <Text style={styles.resultLabel}>{matchResults.winnerIds?.length === 0 ? 'Nobody Scored:' : (matchResults.isTie ? 'Tied Winners:' : 'Winning Score:')}</Text>
                                    <Text style={[styles.resultValue, matchResults.winnerIds?.length === 0 ? { color: '#EF4444' } : { color: '#10B981' }]}>
                                        {matchResults.winnerIds?.length === 0 ? 'NO WINNER' : (matchResults.isTie ? `${matchResults.winnerIds?.length} 🏆` : `${topScore} Pts`)}
                                    </Text>
                                </View>
                                <View style={styles.resultRow}>
                                    <Text style={styles.resultLabel}>Total Players:</Text>
                                    <Text style={styles.resultValue}>{matchResults.rankedPlayers?.length || 0}</Text>
                                </View>
                            </View>
                            
                            <TouchableOpacity onPress={onClose} style={[styles.arcadeLaunchBtn, { marginTop: 10, height: 50 }]}>
                                <LinearGradient colors={['#334155', '#0F172A']} style={StyleSheet.absoluteFill} />
                                <Text style={[styles.launchBtnLabel, { color: '#FFF' }]}>EXIT ARENA</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View {...panResponder.panHandlers} style={[styles.dragHandleContainer, { position: 'absolute', bottom: 15, alignSelf: 'center', width: '100%', height: 30 }]}>
                        <View style={styles.dragPill} />
                    </View>

                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    sheetOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2, 6, 23, 0.7)' },
    arcadeContentCard: { width: width, height: height * 0.85, borderTopLeftRadius: 40, borderTopRightRadius: 40, borderWidth: 2, borderColor: 'rgba(168, 85, 247, 0.4)', overflow: 'hidden', padding: 20, paddingTop: 10, paddingBottom: 40 },
    
    dragHandleContainer: { width: '100%', height: 30, justifyContent: 'center', alignItems: 'center', marginBottom: 5 },
    dragPill: { width: 50, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.4)' },

    sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    titleIconBadge: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
    glowIcon: { shadowColor: '#A855F7', shadowOpacity: 0.8, shadowRadius: 10 },
    mainTitleText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 1.5, textShadowColor: '#A855F7', textShadowRadius: 8, flexShrink: 1 },
    closeRoundBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    
    // 🔥 SATTI FIX: COMPACT WARNING BANNER STYLES 🔥
    warningBanner: { flexDirection: 'row', backgroundColor: 'rgba(245, 158, 11, 0.1)', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.3)', alignItems: 'center' },
    warningText: { color: '#F59E0B', fontSize: 8.5, fontWeight: '700', marginLeft: 8, flex: 1, lineHeight: 12 },

    lobbyStateWrapper: { flex: 1, alignItems: 'center' },
    lobbyHelperText: { color: '#94A3B8', fontSize: 11, fontWeight: '900', letterSpacing: 3, marginBottom: 10 },
    entryFeeContainer: { backgroundColor: 'rgba(168, 85, 247, 0.1)', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(168, 85, 247, 0.3)', marginBottom: 20 },
    feeLabel: { color: '#A855F7', fontSize: 10, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
    feeValueText: { color: '#FFF', fontSize: 20, fontWeight: '900', textShadowColor: 'rgba(168, 85, 247, 0.5)', textShadowRadius: 10 },
    
    playerPoolRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', alignItems: 'center', marginBottom: 25, width: '100%' },
    profileAuraWrapper: { alignItems: 'center', width: '17%', marginBottom: 10 }, 
    avatarAuraGlow: { width: 44, height: 44, borderRadius: 22, borderWidth: 2, backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center', elevation: 10, shadowRadius: 10, shadowOpacity: 0.5, shadowOffset: { width: 0, height: 4 } },
    initialsAvatarText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    poolPlayerName: { color: '#CBD5E1', fontSize: 9, fontWeight: '700', marginTop: 5, textAlign: 'center' },
    
    arcadeLaunchBtn: { width: '85%', height: 56, borderRadius: 20, overflow: 'hidden', justifyContent: 'center', alignItems: 'center', elevation: 12, shadowColor: '#00F2FE', shadowOpacity: 0.5, shadowRadius: 15 },
    launchBtnLabel: { color: '#020617', fontWeight: '900', fontSize: 15, letterSpacing: 1.5 },
    waitServerSignalText: { color: '#64748B', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, marginTop: 15 },

    activeEngineMainContainer: { flex: 1, alignItems: 'center', paddingTop: 0 },
    
    // 🔥 SATTI FIX: REDUCED VERTICAL PADDINGS SO GRID FITS PERFECTLY 🔥
    statusPill: { backgroundColor: 'rgba(168, 85, 247, 0.1)', paddingHorizontal: 20, paddingVertical: 5, borderRadius: 25, borderWidth: 1, borderColor: '#A855F7', marginBottom: 5, shadowColor: '#A855F7', shadowOpacity: 0.4, shadowRadius: 10 },
    shufflingPill: { borderColor: '#A855F7', backgroundColor: 'rgba(168, 85, 247, 0.1)' },
    statusText: { color: '#A855F7', fontWeight: '900', fontSize: 13, letterSpacing: 1.5 },

    liveHudContainer: { flexDirection: 'row', justifyContent: 'space-between', width: '95%', backgroundColor: 'rgba(15,23,42,0.8)', paddingVertical: 6, paddingHorizontal: 20, borderRadius: 15, borderWidth: 1, borderColor: '#334155', marginBottom: 5 },
    hudScoreText: { color: '#00F2FE', fontSize: 16, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0, 242, 254, 0.6)', textShadowRadius: 8 },
    hudComboText: { color: '#FFD700', fontSize: 16, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(255, 215, 0, 0.6)', textShadowRadius: 8 },

    playersContainer: { width: '100%', paddingHorizontal: 10, height: 55, marginBottom: 5 },
    playersTitle: { color: '#94A3B8', fontSize: 11, fontWeight: '800', marginBottom: 3, letterSpacing: 1.5 },
    playerAvatarWrapper: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: '#10B981', overflow: 'hidden' },
    eliminatedAvatar: { borderColor: '#EF4444', opacity: 0.4 },
    playerAvatar: { width: '100%', height: '100%' },
    playerInitials: { width: '100%', height: '100%', backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
    initialText: { color: '#FFF', fontWeight: 'bold' },
    scoreText: { color: '#A855F7', fontSize: 10, fontWeight: '900', marginTop: 4 },
    crossOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },

    gridContainerWrapper: { flex: 1, width: '100%' },
    gridContainer: { paddingBottom: 20, alignItems: 'center' },
    
    // 🔥 SATTI FIX: NEW MATH FOR ENLARGED CARDS 🔥
    columnWrapper: { gap: 8, justifyContent: 'center', marginBottom: 8 },
    card: { 
        width: Math.floor((width - 80) / 5.8), // Makes card significantly larger and fits exactly 5 columns
        height: Math.floor((width - 80) / 5.8), 
        borderRadius: 8, 
        borderWidth: 2, 
        borderColor: 'rgb(253, 178, 3)', 
        overflow: 'hidden',
        backgroundColor: '#000000',
        elevation: 8,
        shadowColor: '#00F2FE',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 3,
    },
    cardBack: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(30, 41, 59, 0.9)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.05)',
        borderRadius: 6,
        borderStyle: 'dashed'
    },
    boxGradient: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    cardEmojiText: { fontSize: 24 }, // Increased emoji size for bigger cards

    neonGlowGreen: { borderColor: '#10B981', shadowColor: '#10B981', shadowOpacity: 0.8, shadowRadius: 10, elevation: 15 },
    neonGlowBlue: { borderColor: '#00F2FE', shadowColor: '#00F2FE', shadowOpacity: 0.8, shadowRadius: 10, elevation: 15 },

    blackoutOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.95)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200
    },
    jackpotFlash: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(255, 215, 0, 0.8)',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200
    },

    massFreezeOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#EF4444',
        zIndex: 100
    },
    massFreezeTitle: { color: '#EF4444', fontSize: 24, fontWeight: '900', letterSpacing: 2, textShadowColor: 'rgba(239,68,68,0.8)', textShadowRadius: 15 },
    massFreezeSub: { color: '#FFF', fontSize: 14, fontWeight: '800', marginTop: 5, letterSpacing: 1 },

    eliminatedText: { color: '#EF4444', fontSize: 16, fontWeight: '900', letterSpacing: 1.5, marginTop: 10, textShadowColor: 'rgba(239, 68, 68, 0.6)', textShadowRadius: 10 },

    terminalStateWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10, paddingBottom: 15 },
    summaryTrophyIcon: { marginBottom: 10, shadowColor: '#FFD700', shadowOpacity: 0.6, shadowRadius: 20 },
    terminalTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15, textAlign: 'center', textShadowColor: 'rgba(255,215,0,0.6)', textShadowRadius: 15 },
    
    leaderboardContainer: { flex: 1, width: '100%', backgroundColor: 'rgba(15,23,42,0.9)', borderRadius: 20, padding: 5, marginBottom: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
    leaderboardTitle: { color: '#94A3B8', fontSize: 12, fontWeight: '900', marginBottom: 12, textAlign: 'center', letterSpacing: 1.5 },
    leaderboardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 10, marginBottom: 8 },
    leaderboardRowWinner: { backgroundColor: 'rgba(16, 185, 129, 0.2)', borderColor: 'rgba(16, 185, 129, 0.4)', borderWidth: 1 },
    lbRank: { color: '#94A3B8', fontSize: 14, fontWeight: '900', width: 30 },
    lbName: { color: '#FFF', fontSize: 14, fontWeight: '800', flex: 1, marginLeft: 10 },
    lbScore: { color: '#00F2FE', fontSize: 11, fontWeight: '900' },

    resultDetailsCard: { width: '100%', backgroundColor: 'rgba(30,41,59,0.7)', borderRadius: 18, padding: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 15 },
    resultRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 6 },
    resultLabel: { color: '#94A3B8', fontSize: 13, fontWeight: '800' },
    resultValue: { color: '#FFF', fontSize: 16, fontWeight: '900' }
});