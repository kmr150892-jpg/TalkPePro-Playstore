import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, increment, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Easing, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

const { width, height } = Dimensions.get('window');

interface TurboRacingSheetProps {
    visible: boolean;
    onClose: () => void;
    liveId: string; 
    isHost: boolean; 
    userWalletBalance: number; 
}

export default function TurboRacingSheet({ visible, onClose, liveId, isHost, userWalletBalance }: TurboRacingSheetProps) {
    const [timer, setTimer] = useState(30);
    const [phase, setPhase] = useState<'PICKING' | 'ROLLING' | 'RESULT_PENDING' | 'RESULT'>('PICKING');
    const [roundId, setRoundId] = useState(0); 
    const [resultType, setResultType] = useState<'RED' | 'GREEN' | 'BLUE' | ''>('');
    const [hostFirestoreId, setHostFirestoreId] = useState<string | null>(null);
    
    const [betAmount, setBetAmount] = useState<number>(500);
    const betOptions = [500, 1000, 5000, 10000, 25000, 50000, 100000, 500000, 1000000, 3000000, 5000000, 10000000];
    
    const [myPick, setMyPick] = useState<'RED' | 'GREEN' | 'BLUE' | null>(null);
    const [myLockedBetAmount, setMyLockedBetAmount] = useState<number>(0); 
    const [winAmount, setWinAmount] = useState<number>(0);
    const [lostAmount, setLostAmount] = useState<number>(0);
    const [showWinPopup, setShowWinPopup] = useState(false);
    const [liveBeansCollected, setLiveBeansCollected] = useState<number>(0);

    // 🔥 NEW: Tracks if car physically crossed the finish line
    const [raceFinished, setRaceFinished] = useState(false);

    // 🔥 VISUAL WALLET FREEZE LOGIC 🔥
    const [displayBalance, setDisplayBalance] = useState(userWalletBalance);
    
    useEffect(() => {
        if (phase === 'PICKING' || showWinPopup) {
            setDisplayBalance(userWalletBalance);
        }
    }, [userWalletBalance, phase, showWinPopup]);

    // 🔥 RACING ANIMATION ENGINE 🔥
    const trackLength = width * 0.9 - 80; 
    const redAnim = useRef(new Animated.Value(0)).current;
    const greenAnim = useRef(new Animated.Value(0)).current;
    const blueAnim = useRef(new Animated.Value(0)).current;

    const pan = useRef(new Animated.ValueXY({ x: width * 0.05, y: height / 2 - 180 })).current;
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

    // 📡 GLOBAL ENGINE SYNC
    useEffect(() => {
        if (!visible) return;
        const globalRef = doc(db, 'global_games', 'turbo_racing'); 
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
                    setRaceFinished(false); // Reset finish line tracker
                    setWinAmount(0);
                    setLostAmount(0);
                    setResultType('');
                    redAnim.setValue(0); greenAnim.setValue(0); blueAnim.setValue(0);
                }

                // Silently store the result for the animation engine
                if (data.resultType) {
                    setResultType(data.resultType);
                }

                // Calculate win/loss but DO NOT show popup yet
                if (data.phase === 'RESULT') {
                    if (myPick && !isHost) {
                        if (myPick === data.resultType) {
                            setWinAmount(myLockedBetAmount * 2); 
                            setLostAmount(0);
                        } else {
                            setWinAmount(0);
                            setLostAmount(myLockedBetAmount); 
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
    }, [visible, roundId, myPick, isHost, myLockedBetAmount, liveId]);

    // 🔥 THE FIX: Delaying Result Text & Popup until Car physically crosses the line 🔥
    useEffect(() => {
        if (phase === 'RESULT') {
            const finishTimer = setTimeout(() => {
                setRaceFinished(true); // Now the text will change to WINNER
                if (myPick !== null && !isHost) {
                    setShowWinPopup(true); // Now the popup will show & wallet updates
                }
            }, 1500); // Exactly matches the Animated.timing climax duration
            return () => clearTimeout(finishTimer);
        } else {
            setRaceFinished(false);
            setShowWinPopup(false);
        }
    }, [phase, myPick, isHost]);

    // 🏎️ 10 SECONDS F1 OVERTAKING LOGIC 🏎️
    useEffect(() => {
        let raceInterval: ReturnType<typeof setInterval> | null = null;

        if (phase === 'ROLLING' || phase === 'RESULT_PENDING') {
            raceInterval = setInterval(() => {
                Animated.parallel([
                    Animated.timing(redAnim, { toValue: Math.random() * 0.6 + 0.1, duration: 800, useNativeDriver: false }),
                    Animated.timing(greenAnim, { toValue: Math.random() * 0.6 + 0.1, duration: 800, useNativeDriver: false }),
                    Animated.timing(blueAnim, { toValue: Math.random() * 0.6 + 0.1, duration: 800, useNativeDriver: false }),
                ]).start();
            }, 800);
        } else if (phase === 'RESULT') {
            if (raceInterval) clearInterval(raceInterval);
            
            Animated.parallel([
                Animated.timing(redAnim, { toValue: resultType === 'RED' ? 1 : Math.random() * 0.1 + 0.7, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: false }),
                Animated.timing(greenAnim, { toValue: resultType === 'GREEN' ? 1 : Math.random() * 0.1 + 0.7, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: false }),
                Animated.timing(blueAnim, { toValue: resultType === 'BLUE' ? 1 : Math.random() * 0.1 + 0.7, duration: 1500, easing: Easing.out(Easing.quad), useNativeDriver: false }),
            ]).start();
        } else {
            if (raceInterval) clearInterval(raceInterval);
            redAnim.setValue(0); greenAnim.setValue(0); blueAnim.setValue(0);
        }

        return () => {
            if (raceInterval) clearInterval(raceInterval);
        };
    }, [phase, resultType]);

    const handlePickClick = (type: 'RED' | 'GREEN' | 'BLUE') => {
        if (isHost) return; 
        if (phase !== 'PICKING' || timer <= 5) { 
            Alert.alert("Locked ⏳", "Predictions are closed for this round!");
            return;
        }
        const availableBalance = displayBalance + (myPick ? myLockedBetAmount : 0);
        if (availableBalance < betAmount) {
            Alert.alert("Insufficient Diamonds 💎", "Recharge your secure wallet to participate!");
            return;
        }
        Alert.alert("Confirm Prediction 🏎️", `Allocate ${betAmount.toLocaleString()} 💎 to the ${type} Car?`, [
            { text: "Cancel", style: "cancel" },
            { text: "Confirm", onPress: () => executeBet(type) }
        ]);
    };

    const executeBet = async (type: 'RED' | 'GREEN' | 'BLUE') => {
        if (!auth.currentUser || !hostFirestoreId) return;
        let deduction = betAmount;
        if (myPick !== null) deduction = betAmount - myLockedBetAmount;
        setMyPick(type);
        setMyLockedBetAmount(betAmount);
        
        if (deduction !== 0) {
            await updateDoc(doc(db, "users", auth.currentUser.uid), { balance: increment(-deduction) });
            await updateDoc(doc(db, 'global_games', 'turbo_racing'), {
                [type === 'RED' ? 'totalRed' : type === 'GREEN' ? 'totalGreen' : 'totalBlue']: increment(deduction)
            });
        }
        
        await setDoc(doc(db, 'global_games', 'turbo_racing', 'rounds', roundId.toString(), 'bets', auth.currentUser.uid), { 
            userId: auth.currentUser.uid, amount: betAmount, pick: type, liveId: liveId, hostId: hostFirestoreId, timestamp: Date.now() 
        });
    };

    const getSliderThumbPosition = (): any => {
        const index = betOptions.indexOf(betAmount);
        return `${(index / (betOptions.length - 1)) * 100}%`;
    };

    const getDynamicColor = () => {
        if (resultType === 'RED') return '#EF4444';
        if (resultType === 'GREEN') return '#10B981';
        if (resultType === 'BLUE') return '#3B82F6';
        return '#F59E0B'; 
    };

    if (!visible) return null;

    const redLeft = redAnim.interpolate({ inputRange: [0, 1], outputRange: [0, trackLength] });
    const greenLeft = greenAnim.interpolate({ inputRange: [0, 1], outputRange: [0, trackLength] });
    const blueLeft = blueAnim.interpolate({ inputRange: [0, 1], outputRange: [0, trackLength] });

    const bgColors = isHost ? ['#450a0a', '#1a0505'] : ['#0F172A', '#020617']; 
    const borderColorTheme = isHost ? '#F59E0B' : '#334155';

    return (
        <Animated.View style={[styles.floatingContainer, { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]}>
            {!isHost && showWinPopup && (
                <View style={styles.winPopupOverlay} pointerEvents="none">
                    <View style={[styles.winPopupBox, { borderColor: getDynamicColor() }]}>
                        <Text style={[styles.winTitle, { color: getDynamicColor() }]}>
                            {winAmount > 0 ? `🎉 SUCCESS: ${resultType}! 🎉` : `💀 ${resultType} COMPLETED`}
                        </Text>
                        <Text style={[styles.winCoins, { color: winAmount > 0 ? '#10B981' : '#EF4444' }]}>
                            {winAmount > 0 ? `+${winAmount.toLocaleString()} 💎` : `-${lostAmount.toLocaleString()} 💎`}
                        </Text>
                    </View>
                </View>
            )}

            <BlurView intensity={100} tint="dark" style={[styles.gameSheet, { borderColor: borderColorTheme }]}>
                <LinearGradient colors={bgColors as any} style={StyleSheet.absoluteFill} />
                <View {...panResponder.panHandlers} style={styles.dragZone}>
                    <View style={styles.dragPill} />
                </View>

                <View style={styles.gameHeader}>
                    <Text style={styles.gameTitle}>🏎️ TURBO RACING ACTIVITY</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeGameBtn}>
                        <Ionicons name="close" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* ✅ TIMERS FIXED: Will not say "SUCCESS" until car hits finish line ✅ */}
                <View style={styles.timerBox}>
                    <Ionicons name="flash" size={14} color="#F59E0B" />
                    <Text style={[styles.timerText, { color: '#F59E0B' }]}>
                        {phase === 'PICKING' ? `PREDICTING: ${timer}s` : 
                         phase === 'ROLLING' || (phase === 'RESULT' && !raceFinished) ? `RACING: ${timer}s` : 
                         (phase === 'RESULT' && raceFinished) ? `COMPLETED: ${resultType} (${timer}s)` : `WAITING...`} 
                    </Text>
                </View>

                <View style={styles.trackContainer}>
                    <View style={styles.finishLine} />
                    <View style={styles.trackEdgeTop} />
                    
                    <View style={styles.lane}>
                        <Animated.Image source={require('../assets/images/red-car.png')} style={[styles.carImg, { left: redLeft }]} resizeMode="contain" />
                    </View>
                    <View style={styles.laneDivider} />

                    <View style={styles.lane}>
                        <Animated.Image source={require('../assets/images/green-car.png')} style={[styles.carImg, { left: greenLeft }]} resizeMode="contain" />
                    </View>
                    <View style={styles.laneDivider} />

                    <View style={styles.lane}>
                        <Animated.Image source={require('../assets/images/blue-car.png')} style={[styles.carImg, { left: blueLeft }]} resizeMode="contain" />
                    </View>
                    <View style={styles.trackEdgeBottom} />
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.carBetBtn, { borderColor: 'rgba(239,68,68,0.4)' }, myPick === 'RED' && { backgroundColor: 'rgba(239,68,68,0.2)', borderColor: '#EF4444' }]} onPress={() => handlePickClick('RED')}>
                        <Text style={[styles.carBetText, { color: '#EF4444' }]}>RED</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.carBetBtn, { borderColor: 'rgba(16,185,129,0.4)' }, myPick === 'GREEN' && { backgroundColor: 'rgba(16,185,129,0.2)', borderColor: '#10B981' }]} onPress={() => handlePickClick('GREEN')}>
                        <Text style={[styles.carBetText, { color: '#10B981' }]}>GREEN</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.carBetBtn, { borderColor: 'rgba(59,130,246,0.4)' }, myPick === 'BLUE' && { backgroundColor: 'rgba(59,130,246,0.2)', borderColor: '#3B82F6' }]} onPress={() => handlePickClick('BLUE')}>
                        <Text style={[styles.carBetText, { color: '#3B82F6' }]}>BLUE</Text>
                    </TouchableOpacity>
                </View>

                {!isHost ? (
                    <View style={styles.betAmountContainer}>
                        <View style={styles.selectedAmountHeader}>
                            <Text style={styles.selectAmountLabel}>Select Allocation:</Text>
                            <View style={styles.activeAmountBadge}>
                                <Ionicons name="diamond" size={10} color="#F59E0B" />
                                <Text style={styles.activeAmountText}>{betAmount.toLocaleString()}</Text>
                            </View>
                        </View>

                        <TouchableOpacity activeOpacity={1} onPress={handleSliderTouch} style={styles.sliderTrackContainer}>
                            <View style={styles.sliderTrack} />
                            <View style={[styles.sliderFill, { width: getSliderThumbPosition() }]} />
                            <View style={[styles.sliderThumb, { left: getSliderThumbPosition() }]} />
                        </TouchableOpacity>

                        <View style={styles.chipGrid}>
                            {betOptions.map((amount) => (
                                <TouchableOpacity key={amount} style={[styles.amountChip, betAmount === amount && styles.activeChip]} onPress={() => setBetAmount(amount)} disabled={phase !== 'PICKING'}>
                                    <Text style={[styles.amountChipText, betAmount === amount && styles.activeChipText]}>{formatNumber(amount)}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                ) : (
                    <View style={[styles.hostMessageContainer, { borderColor: borderColorTheme }]}>
                        <LinearGradient colors={['rgba(245,158,11,0.2)', 'rgba(239,68,68,0.1)']} style={[StyleSheet.absoluteFill, { borderRadius: 15 }]} />
                        <Text style={styles.expertEarningLabel}>🔥 REWARDS EARNED THIS SESSION 🔥</Text>
                        <Text style={styles.expertEarningValue}>{liveBeansCollected.toLocaleString()}</Text>
                        
                        {/* 🔥 SATTI FIX: MASSIVE EXPERT COMMENT BOX 🔥 */}
                        <View style={styles.expertCommentBox}>
                            <Ionicons name="sparkles" size={12} color="#F59E0B" style={{marginBottom: 4}} />
                            <Text style={styles.expertCommentText}>
                                Engagement increases ranking! You earn <Text style={{color: '#F59E0B', fontWeight: '900'}}>5 Rewards</Text> for every 100 Diamonds allocated in your room.
                            </Text>
                        </View>
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
    winTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
    winCoins: { fontSize: 24, fontWeight: '900', marginTop: 5 },
    gameSheet: { width: '100%', paddingTop: 15, borderRadius: 25, overflow: 'hidden', borderWidth: 1.5, paddingHorizontal: 12, paddingBottom: 15 },
    dragZone: { width: '100%', height: 30, justifyContent: 'center', alignItems: 'center', position: 'absolute', top: 0, zIndex: 10 },
    dragPill: { width: 45, height: 5, borderRadius: 3, backgroundColor: '#475569' },
    gameHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    gameTitle: { fontSize: 15, fontWeight: '900', letterSpacing: 1, color: '#F59E0B' },
    closeGameBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    timerBox: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#F59E0B' },
    timerText: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    
    trackContainer: { width: '100%', height: 160, backgroundColor: '#1E293B', borderRadius: 12, borderWidth: 3, borderColor: '#0F172A', overflow: 'hidden', marginBottom: 15, paddingVertical: 0 },
    trackEdgeTop: { height: 6, backgroundColor: '#EF4444', width: '100%', borderBottomWidth: 2, borderColor: '#FFF' },
    trackEdgeBottom: { height: 6, backgroundColor: '#EF4444', width: '100%', borderTopWidth: 2, borderColor: '#FFF' },
    finishLine: { position: 'absolute', right: 12, top: 0, bottom: 0, width: 20, backgroundColor: '#FFF', borderLeftWidth: 6, borderRightWidth: 6, borderColor: '#000', opacity: 0.9, zIndex: 1 },
    lane: { flex: 1, justifyContent: 'center', position: 'relative', backgroundColor: '#334155' },
    laneDivider: { height: 2, backgroundColor: 'rgba(255,255,255,0.4)', borderStyle: 'dashed', borderWidth: 1, borderColor: 'transparent' },
    carImg: { width: 55, height: 35, position: 'absolute', zIndex: 2 },

    actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 15 },
    carBetBtn: { width: '31%', height: 45, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, backgroundColor: 'rgba(15, 23, 42, 0.8)' },
    carBetText: { fontSize: 12, fontWeight: '900' },
    
    betAmountContainer: { backgroundColor: 'rgba(0,0,0,0.4)', padding: 10, borderRadius: 15, borderWidth: 1, borderColor: '#334155' },
    selectedAmountHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
    selectAmountLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
    activeAmountBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.1)' },
    activeAmountText: { fontSize: 11, fontWeight: '900', color: '#F59E0B' },
    sliderTrackContainer: { height: 20, justifyContent: 'center', position: 'relative', marginBottom: 10 },
    sliderTrack: { height: 5, backgroundColor: '#1E293B', borderRadius: 2.5, width: '100%' },
    sliderFill: { position: 'absolute', height: 5, borderRadius: 2.5, left: 0, backgroundColor: '#F59E0B' },
    sliderThumb: { position: 'absolute', width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#F59E0B', marginLeft: -8, top: 2, backgroundColor: '#020617' },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 6 },
    amountChip: { width: '23%', backgroundColor: 'rgba(30, 41, 59, 0.9)', paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
    activeChip: { borderColor: '#F59E0B', backgroundColor: 'rgba(245,158,11,0.2)' },
    amountChipText: { color: '#94A3B8', fontSize: 10, fontWeight: '900' },
    activeChipText: { color: '#F59E0B', fontWeight: 'bold' },
    
    hostMessageContainer: { marginTop: 10, padding: 15, borderRadius: 15, alignItems: 'center', borderWidth: 1.5, overflow: 'hidden' },
    expertEarningLabel: { color: '#F59E0B', fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    expertEarningValue: { color: '#FFF', fontSize: 26, fontWeight: '900', marginTop: 5 },
    
    // 🔥 SATTI FIX: NEW COMMENT BOX STYLES 🔥
    expertCommentBox: { marginTop: 12, padding: 10, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(245,158,11,0.2)', alignItems: 'center' },
    expertCommentText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '700', textAlign: 'center', lineHeight: 14 }
});