import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, increment, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE FOR USER (STRICT THEME SYNC FROM MEMORY V2)
const calculateUserLevel = (totalSpent: number) => {
  if (totalSpent >= 500000001) return { 
      lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#FF0033', secondaryColor: '#660000', anim: 'titan', themeBg: ['#1A0000', '#000000']
  }; 
  if (totalSpent >= 100000001) return { 
      lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#D946EF', secondaryColor: '#c8040b', anim: 'mythic', themeBg: ['#15001A', '#000000']
  }; 
  if (totalSpent >= 50000000) return { 
      lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#9c77f3', secondaryColor: '#d31515', anim: 'grandmaster', themeBg: ['#08001A', '#000000']
  };
  if (totalSpent >= 10000000) return { 
      lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#970d50d4', anim: 'explosion', themeBg: ['#00101A', '#000000']
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

// ✅ ACCURATE THEME & LEVEL CONFIG FOR EXPERT (LOCKED DEEP-GLOW COLORS)
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

interface LiveGameSheetProps {
    visible: boolean;
    onClose: () => void;
    liveId: string; 
    isHost: boolean; 
    userWalletBalance: number; 
}

export default function LiveGameSheet({ visible, onClose, liveId, isHost, userWalletBalance }: LiveGameSheetProps) {
    const [timer, setTimer] = useState(30);
    const [phase, setPhase] = useState<'PICKING' | 'ROLLING' | 'RESULT_PENDING' | 'RESULT'>('PICKING');
    const [roundId, setRoundId] = useState(0); 
    const [slots, setSlots] = useState<any[]>(['?', '?', '?', '?']);
    const [totalSum, setTotalSum] = useState<number | string>('?');
    const [resultType, setResultType] = useState<string>('');
    const [hostFirestoreId, setHostFirestoreId] = useState<string | null>(null);
    
    const [betAmount, setBetAmount] = useState<number>(500);
    
    const betOptions = [500, 1000, 5000, 10000, 25000, 50000, 100000, 500000, 1000000, 3000000, 5000000, 10000000];
    
    const [myPick, setMyPick] = useState<string | null>(null);
    const [myLockedBetAmount, setMyLockedBetAmount] = useState<number>(0); 
    const [winAmount, setWinAmount] = useState<number>(0);
    const [lostAmount, setLostAmount] = useState<number>(0);
    const [showWinPopup, setShowWinPopup] = useState(false);

    const [liveBeansCollected, setLiveBeansCollected] = useState<number>(0);

    const [myThemeConfig, setMyThemeConfig] = useState<any>(null);
    const [myUserData, setMyUserData] = useState<any>(null);

    const pan = useRef(new Animated.ValueXY({ x: width * 0.05, y: height / 2 - 120 })).current;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true, 
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => { pan.extractOffset(); },
            onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
            onPanResponderRelease: () => { pan.flattenOffset(); },
        })
    ).current;

    const formatNumber = (num: number) => {
        if (num >= 1000000) return (num / 1000000) + 'M';
        if (num >= 1000) return (num / 1000) + 'K';
        return num.toString();
    };

    const handleSliderTouch = (e: any) => {
        if (isHost) return; 
        const touchX = e.nativeEvent.locationX;
        const sliderWidth = (width * 0.9) - 40; 
        const percentage = Math.max(0, Math.min(1, touchX / sliderWidth));
        const index = Math.floor(percentage * (betOptions.length - 1));
        setBetAmount(betOptions[index]);
    };

    useEffect(() => {
        if (!auth.currentUser) return;
        const unsub = onSnapshot(doc(db, "users", auth.currentUser.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setMyUserData(data);
                if (isHost) {
                    setMyThemeConfig(getLevelConfig(data.totalBeansEarned || 0));
                } else {
                    setMyThemeConfig(calculateUserLevel(data.totalSpentDiamonds || 0));
                }
            }
        });
        return () => unsub();
    }, [isHost]);

    useEffect(() => {
        if (!visible) return;
        const globalRef = doc(db, 'global_games', 'fortune_clash');
        const liveRef = doc(db, 'lives', liveId);

        const unsubGlobal = onSnapshot(globalRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setTimer(data.timer);
                setPhase(data.phase);

                if (data.roundId !== roundId) {
                    setRoundId(data.roundId);
                    setMyPick(null);
                    setMyLockedBetAmount(0);
                    setShowWinPopup(false);
                    setWinAmount(0);
                    setLostAmount(0);
                }

                if (data.phase === 'PICKING') {
                    setSlots(['?', '?', '?', '?']);
                    setTotalSum('?');
                    setResultType('');
                } else if (data.phase === 'RESULT') {
                    setSlots(data.slots || ['?', '?', '?', '?']);
                    setTotalSum(data.totalSum || '?');
                    setResultType(data.resultType || '');

                    if (myPick && !showWinPopup && !isHost) {
                        if (myPick === data.resultType) {
                            setWinAmount(myLockedBetAmount * 1.8);
                            setLostAmount(0);
                            setShowWinPopup(true);
                        } else {
                            setWinAmount(0);
                            setLostAmount(myLockedBetAmount); 
                            setShowWinPopup(true);
                        }
                    }
                }
            }
        });

        const unsubLive = onSnapshot(liveRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setHostFirestoreId(data.hostId);
                if (isHost) setLiveBeansCollected(data.gameBeansCollected || 0);
            }
        });

        return () => { unsubGlobal(); unsubLive(); };
    }, [visible, roundId, myPick, showWinPopup, isHost, myLockedBetAmount, liveId]);

    useEffect(() => {
        let rollInterval: ReturnType<typeof setInterval>;
        if (phase === 'ROLLING' || phase === 'RESULT_PENDING') {
            rollInterval = setInterval(() => {
                setSlots([Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1, Math.floor(Math.random() * 6) + 1]);
            }, 80); 
        }
        return () => clearInterval(rollInterval);
    }, [phase]);

    const handlePickClick = (type: 'SMALL' | 'BIG') => {
        if (isHost) return; 
        if (phase !== 'PICKING' || timer <= 5) { 
            Alert.alert("Locked ⏳", "Activity session is closed for this round!");
            return;
        }
        const availableBalance = userWalletBalance + (myPick ? myLockedBetAmount : 0);
        if (availableBalance < betAmount) {
            Alert.alert("Insufficient Diamonds 💎", "Recharge your secure wallet to continue!");
            return;
        }
        Alert.alert("Confirm Choice 🎲", `Allocate ${betAmount.toLocaleString()} 💎 to ${type} prediction?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm", onPress: () => executeBet(type) }
        ]);
    };

    const executeBet = async (type: 'SMALL' | 'BIG') => {
        if (!auth.currentUser || !hostFirestoreId) return;
        let deduction = betAmount;
        if (myPick !== null) deduction = betAmount - myLockedBetAmount;
        setMyPick(type);
        setMyLockedBetAmount(betAmount);
        
        if (deduction !== 0) {
            await updateDoc(doc(db, "users", auth.currentUser.uid), { balance: increment(-deduction) });
            await updateDoc(doc(db, 'global_games', 'fortune_clash'), {
                [type === 'SMALL' ? 'totalSmall' : 'totalBig']: increment(deduction)
            });
        }
        
        await setDoc(doc(db, 'global_games', 'fortune_clash', 'rounds', roundId.toString(), 'bets', auth.currentUser.uid), { 
            userId: auth.currentUser.uid, 
            amount: betAmount, 
            pick: type, 
            liveId: liveId,
            hostId: hostFirestoreId,
            timestamp: Date.now() 
        });
    };

    const getSliderThumbPosition = (): any => {
        const index = betOptions.indexOf(betAmount);
        return `${(index / (betOptions.length - 1)) * 100}%`;
    };

    if (!visible) return null;

    const themePrimary = myThemeConfig ? (isHost ? myThemeConfig.colors[0] : myThemeConfig.color) : '#00F2FE';
    const themeSecondary = myThemeConfig ? (isHost ? myThemeConfig.colors[1] : myThemeConfig.secondaryColor) : '#F59E0B';
    const themeBg = myThemeConfig ? (isHost ? [`${myThemeConfig.colors[0]}D9`, '#000000'] : myThemeConfig.themeBg) : ['rgba(15, 5, 36, 0.98)', 'rgba(5, 10, 25, 0.95)'];

    return (
        <Animated.View style={[styles.floatingContainer, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]}>
            {!isHost && showWinPopup && (
                <View style={styles.winPopupOverlay} pointerEvents="none">
                    <View style={[styles.winPopupBox, { borderColor: winAmount > 0 ? '#10B981' : '#EF4444' }]}>
                        <Text style={[styles.winTitle, { color: winAmount > 0 ? '#10B981' : '#EF4444' }]}>{winAmount > 0 ? "🎉 SUCCESS! 🎉" : "💀 ATTEMPT FAILED"}</Text>
                        <Text style={[styles.winCoins, { color: winAmount > 0 ? '#10B981' : '#EF4444' }]}>
                            {winAmount > 0 ? `+${winAmount.toLocaleString()} 💎` : `-${lostAmount.toLocaleString()} 💎`}
                        </Text>
                    </View>
                </View>
            )}

            <BlurView intensity={100} tint="dark" style={[styles.gameSheet, { borderColor: themePrimary + '66' }]}>
                <LinearGradient colors={themeBg as any} style={StyleSheet.absoluteFill} />
                <View {...panResponder.panHandlers} style={styles.dragZone}>
                    <View style={[styles.dragPill, { backgroundColor: themePrimary + '99' }]} />
                </View>

                <View style={styles.gameHeader}>
                    <Text style={[styles.gameTitle, { color: themePrimary }]}>🎲 GLOBAL SKILL ACTIVITY</Text>
                    <TouchableOpacity onPress={onClose} style={[styles.closeGameBtn, { backgroundColor: themePrimary + '26' }]}>
                        <Ionicons name="close" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <View style={styles.gameCenter}>
                    <View style={[styles.timerBox, { borderColor: themePrimary + '40' }]}>
                        <Ionicons name="time" size={12} color={phase === 'PICKING' ? themeSecondary : '#EF4444'} />
                        <Text style={[styles.timerText, { color: phase === 'PICKING' ? themeSecondary : '#EF4444' }]}>
                            00:{timer < 10 ? `0${timer}` : timer} 
                        </Text>
                    </View>
                    
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.sidePickBtn, styles.pickSmall, myPick === 'SMALL' && styles.pickedBtnGlowSmall]} onPress={() => handlePickClick('SMALL')} activeOpacity={0.8} disabled={phase !== 'PICKING'}>
                            <Text style={styles.sidePickLabel}>ZONE A</Text>
                            <Text style={styles.sidePickSub}>Target 4-13</Text>
                            {myPick === 'SMALL' && <Ionicons name="checkmark-circle" size={12} color="#FFF" style={{marginTop:2}} />}
                        </TouchableOpacity>

                        <View style={styles.slotRow}>
                            {slots.map((num, index) => (
                                <View key={index} style={[styles.slotBox, phase === 'RESULT' && [styles.slotBoxGlow, { borderColor: themePrimary }]]}>
                                    <Text style={[styles.slotText, phase === 'RESULT' && { color: themePrimary }]}>{num}</Text>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity style={[styles.sidePickBtn, styles.pickBig, myPick === 'BIG' && styles.pickedBtnGlowBig]} onPress={() => handlePickClick('BIG')} activeOpacity={0.8} disabled={phase !== 'PICKING'}>
                            <Text style={styles.sidePickLabel}>ZONE B</Text>
                            <Text style={styles.sidePickSub}>Target 14-24</Text>
                            {myPick === 'BIG' && <Ionicons name="checkmark-circle" size={12} color="#FFF" style={{marginTop:2}} />}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.resultContainer}>
                        {phase === 'RESULT' ? (
                            <Text style={styles.resultText}>
                                {slots[0]} + {slots[1]} + {slots[2]} + {slots[3]} = <Text style={[styles.totalHighlight, { color: themePrimary }]}>{totalSum}</Text> 
                                <Text style={{ color: resultType === 'BIG' ? '#EF4444' : themeSecondary }}> ({resultType === 'BIG' ? 'ZONE B' : 'ZONE A'})</Text>
                            </Text>
                        ) : (
                            <Text style={[styles.phaseText, phase !== 'PICKING' && { color: '#EF4444' }, phase === 'PICKING' && { color: themeSecondary }]}>
                                {phase === 'PICKING' ? "GLOBAL PREDICTION OPEN" : "LOCKED! ANALYZING..."}
                            </Text>
                        )}
                    </View>
                </View>

                {!isHost ? (
                    <View>
                        <View style={[styles.betAmountContainer, { borderColor: themePrimary + '26' }]}>
                            <View style={styles.selectedAmountHeader}>
                                <Text style={styles.selectAmountLabel}>Select Allocation:</Text>
                                <View style={[styles.activeAmountBadge, { borderColor: themePrimary + '66', backgroundColor: themePrimary + '26' }]}>
                                    <Ionicons name="diamond" size={10} color={themePrimary} />
                                    <Text style={[styles.activeAmountText, { color: themePrimary }]}>{betAmount.toLocaleString()}</Text>
                                </View>
                            </View>

                            <TouchableOpacity activeOpacity={1} onPress={handleSliderTouch} style={styles.sliderTrackContainer}>
                                <View style={styles.sliderTrack} />
                                <View style={[styles.sliderFill, { width: getSliderThumbPosition(), backgroundColor: themePrimary }]} />
                                <View style={[styles.sliderThumb, { left: getSliderThumbPosition(), borderColor: themePrimary, shadowColor: themePrimary }]} />
                            </TouchableOpacity>

                            <View style={styles.chipGrid}>
                                {betOptions.map((amount) => (
                                    <TouchableOpacity key={amount} style={[styles.amountChip, betAmount === amount && [styles.activeChip, { borderColor: themePrimary, backgroundColor: themePrimary + '33' }]]} onPress={() => setBetAmount(amount)} disabled={phase !== 'PICKING'}>
                                        <Text style={[styles.amountChipText, betAmount === amount && [styles.activeChipText, { color: themePrimary }]]}>{formatNumber(amount)}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                ) : (
                    <View style={[styles.hostMessageContainer, { borderColor: themePrimary + '80', backgroundColor: themePrimary + '1A' }]}>
                        <LinearGradient colors={[themePrimary + '40', themeSecondary + '20']} style={[StyleSheet.absoluteFill, { borderRadius: 15 }]} />
                        <View style={[styles.expertEarningBadge, { borderColor: themeSecondary + '80', backgroundColor: 'rgba(0,0,0,0.4)' }]}>
                            <Text style={[styles.expertEarningLabel, { color: '#FFF', textShadowColor: themeSecondary, textShadowRadius: 8 }]}>🔥 ACTIVITY REWARDS EARNED 🔥</Text>
                            <View style={styles.expertEarningValueRow}>
                                <Ionicons name="leaf" size={20} color={themeSecondary} />
                                <Text style={[styles.expertEarningValue, { color: '#FFF', textShadowColor: themePrimary, textShadowRadius: 15 }]}>
                                    {liveBeansCollected.toLocaleString()}
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.hostMessageTitle, { color: '#FFF', textShadowColor: themePrimary, textShadowRadius: 5 }]}>⚡ Interactive Mode Active ⚡</Text>
                        <Text style={styles.hostMessageSub}>Engagement increases ranking! You earn Rewards proportional to activity diamonds in this room.</Text>
                    </View>
                )}
            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    floatingContainer: { position: 'absolute', width: width * 0.9, zIndex: 1000, elevation: 100 },
    winPopupOverlay: { position: 'absolute', top: -80, left: 0, right: 0, alignItems: 'center', zIndex: 100 },
    winPopupBox: { backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: 15, borderRadius: 20, borderWidth: 2, alignItems: 'center' },
    winTitle: { fontSize: 18, fontWeight: '900' },
    winCoins: { fontSize: 24, fontWeight: '900', marginTop: 5 },
    gameSheet: { width: '100%', paddingTop: 15, borderRadius: 25, overflow: 'hidden', borderWidth: 1.5, paddingHorizontal: 12, paddingBottom: 15 },
    dragZone: { width: '100%', height: 30, justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 0, zIndex: 10 },
    dragPill: { width: 45, height: 5, borderRadius: 3 },
    gameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    gameTitle: { fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    closeGameBtn: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center' },
    gameCenter: { alignItems: 'center' },
    timerBox: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, marginBottom: 10, borderWidth: 1 },
    timerText: { fontSize: 12, fontWeight: '900' },
    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 12 },
    sidePickBtn: { width: '28%', height: 55, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, backgroundColor: 'rgba(15, 23, 42, 0.8)' },
    pickSmall: { borderColor: 'rgba(16, 255, 96, 0.99)' },
    pickBig: { borderColor: 'rgb(243, 22, 22)' },
    pickedBtnGlowSmall: { borderColor: '#10B981', backgroundColor: 'rgba(15, 238, 163, 0.25)' },
    pickedBtnGlowBig: { borderColor: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.25)' },
    sidePickLabel: { color: '#FFF', fontSize: 11, fontWeight: '900' },
    sidePickSub: { color: 'rgb(248, 248, 7)', fontSize: 9, fontWeight: '800' },
    slotRow: { width: '38%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    slotBox: { width: 28, height: 40, backgroundColor: '#020617', borderRadius: 6, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
    slotBoxGlow: { backgroundColor: '#010601' },
    slotText: { color: '#FFF', fontSize: 18, fontWeight: '900' },
    resultContainer: { height: 20, justifyContent: 'center', marginBottom: 10 },
    resultText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
    totalHighlight: { fontSize: 16, fontWeight: '900' },
    phaseText: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    betAmountContainer: { backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderRadius: 15, borderWidth: 1 },
    selectedAmountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    selectAmountLabel: { color: '#1e72e7', fontSize: 11, fontWeight: '800' },
    activeAmountBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
    activeAmountText: { fontSize: 11, fontWeight: '900' },
    sliderTrackContainer: { height: 20, justifyContent: 'center', position: 'relative', marginBottom: 10 },
    sliderTrack: { height: 5, backgroundColor: '#f306cf', borderRadius: 2.5, width: '100%' },
    sliderFill: { position: 'absolute', height: 5, borderRadius: 2.5, left: 0 },
    sliderThumb: { position: 'absolute', width: 16, height: 16, borderRadius: 8, borderWidth: 3, marginLeft: -8, top: 2 },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 },
    amountChip: { width: '23%', backgroundColor: 'rgba(30, 41, 59, 0.9)', paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
    activeChip: { elevation: 5 },
    amountChipText: { color: '#ffbf00', fontSize: 10, fontWeight: '900' },
    activeChipText: { fontWeight: 'bold' },
    hostMessageContainer: { marginTop: 10, padding: 15, borderRadius: 15, alignItems: 'center', borderWidth: 1.5, overflow: 'hidden' },
    expertEarningBadge: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, alignItems: 'center', marginBottom: 12, borderWidth: 1 },
    expertEarningLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    expertEarningValueRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 },
    expertEarningValue: { fontSize: 24, fontWeight: '900' },
    hostMessageTitle: { fontSize: 14, fontWeight: '900', marginTop: 4 },
    hostMessageSub: { color: '#E2E8F0', fontSize: 11, textAlign: 'center', marginTop: 6, paddingHorizontal: 10, lineHeight: 16 }
});