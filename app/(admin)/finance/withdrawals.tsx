import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collectionGroup, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Clipboard,
    Dimensions,
    Easing,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth, db } from '../../../firebaseConfig';
import { recordTransaction } from '../../../utils/finance';
import { sendNotificationToUser } from '../../../utils/notificationHelper'; // 🔥 IMPORTED NOTIFICATION HELPER

    const { width } = Dimensions.get('window');
    const ADMIN_UID = "9yFRrTeuOCd1twDDpBiNCp4U1yf1"; 

    interface WithdrawalRequest {
        id: string;
        amount: number;
        userId: string;
        expertName?: string; 
        status: 'PENDING' | 'SUCCESS' | 'REJECTED' | 'pending';
        bankDetails?: { 
            upiId?: string; 
            accountNumber?: string; 
            ifsc?: string; 
            holderName?: string;
        };
        createdAt?: any;
        userPath?: string; 
        transactionCharge?: number; // Added to handle accurate refund
    }

    /* ============================================================
       🃏 3D REQUEST CARD - flips in with perspective, amber glow,
       AWAITING badge pulses, shimmer sweeps across the card.
       All handlers come from the screen so logic stays identical.
       ============================================================ */
    const RequestCard = ({
        item,
        index,
        onProcess,
        onCopy,
        onOpenProfile,
    }: {
        item: WithdrawalRequest;
        index: number;
        onProcess: (request: WithdrawalRequest, status: 'SUCCESS' | 'REJECTED') => void;
        onCopy: (text: string, label: string) => void;
        onOpenProfile: (userId: string) => void; // 🔥 NEW: OPEN HOST PROFILE / PASSBOOK PAGE
    }) => {
        const enter = useRef(new Animated.Value(0)).current;
        const pulse = useRef(new Animated.Value(0)).current;
        const sweep = useRef(new Animated.Value(0)).current;

        useEffect(() => {
            Animated.spring(enter, {
                toValue: 1,
                friction: 7,
                tension: 45,
                delay: Math.min(index, 8) * 110,
                useNativeDriver: true,
            }).start();

            const pulseLoop = Animated.loop(
                Animated.sequence([
                    Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                    Animated.timing(pulse, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                ])
            );
            const sweepLoop = Animated.loop(
                Animated.sequence([
                    Animated.delay(2000 + (index % 3) * 500),
                    Animated.timing(sweep, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                    Animated.timing(sweep, { toValue: 0, duration: 0, useNativeDriver: true }),
                ])
            );
            pulseLoop.start();
            sweepLoop.start();
            return () => { pulseLoop.stop(); sweepLoop.stop(); };
        }, []);

        const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.28] });
        const badgeScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] });
        const sweepX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-120, width] });

        return (
            <Animated.View
                style={{
                    opacity: enter,
                    transform: [
                        { perspective: 1000 },
                        { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [70, 0] }) },
                        { rotateX: enter.interpolate({ inputRange: [0, 1], outputRange: ['30deg', '0deg'] }) },
                        { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) },
                    ],
                }}
            >
                {/* amber glow behind the card */}
                <Animated.View style={[styles.cardGlow, { opacity: glowOpacity }]} />

                <View style={styles.card}>
                    <LinearGradient
                        colors={['rgba(245,158,11,0.12)', 'transparent', 'transparent']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={StyleSheet.absoluteFill}
                    />
                    {/* shimmer sweep */}
                    <Animated.View pointerEvents="none" style={[styles.shimmer, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
                        <LinearGradient
                            colors={['transparent', 'rgba(251,191,36,0.12)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={{ flex: 1 }}
                        />
                    </Animated.View>

                    <View style={styles.cardHeader}>
                        {/* 🔥 NEW: TAP HOST PROFILE → OPENS (admin)/experts/verify-expert/[id] 🔥 */}
                        <TouchableOpacity activeOpacity={0.7} style={styles.profileTap} onPress={() => onOpenProfile(item.userId)}>
                            <Text style={styles.expertId}>HOST: {item.expertName || 'System ID'}</Text>
                            <Text style={styles.expertIdSub}>UID: {item.userId.slice(0, 15).toUpperCase()}...</Text>
                            <Text style={styles.cardAmount}>₹{item.amount.toLocaleString()}</Text>
                            <View style={styles.viewProfileChip}>
                                <MaterialCommunityIcons name="book-open-variant" size={11} color="#818CF8" />
                                <Text style={styles.viewProfileText}>VIEW PASSBOOK & VERIFY</Text>
                                <Ionicons name="chevron-forward" size={11} color="#818CF8" />
                            </View>
                        </TouchableOpacity>
                        <Animated.View style={[styles.waitingBadge, { transform: [{ scale: badgeScale }] }]}>
                            <Feather name="clock" size={10} color="#F59E0B" />
                            <Text style={styles.waitingText}> AWAITING</Text>
                        </Animated.View>
                    </View>

                    <View style={styles.detailsContainer}>
                        <View style={styles.vaultHeader}>
                            <MaterialCommunityIcons name="bank-transfer" size={14} color="#6366F1" />
                            <Text style={styles.sectionLabel}>TRANSFER DESTINATION</Text>
                        </View>
                        
                        <TouchableOpacity style={styles.detailRow} onPress={() => onCopy(item.bankDetails?.upiId || "", "UPI ID")}>
                            <View>
                                <Text style={styles.upiLabel}>UPI ENDPOINT</Text>
                                <Text style={styles.upiValue}>{item.bankDetails?.upiId || 'Verification Pending'}</Text>
                            </View>
                            <View style={styles.copyChip}>
                                <Ionicons name="copy-outline" size={16} color="#6366F1" />
                            </View>
                        </TouchableOpacity>

                        <View style={styles.divider} />

                        <TouchableOpacity style={styles.detailRow} onPress={() => onCopy(item.bankDetails?.accountNumber || "", "Account Number")}>
                            <View>
                                <Text style={styles.upiLabel}>CREDIT ACCOUNT / IFSC</Text>
                                <Text style={styles.bankValue}>{item.bankDetails?.accountNumber || 'N/A'} • {item.bankDetails?.ifsc || 'N/A'}</Text>
                                <Text style={styles.holderName}>BENEFICIARY: {item.bankDetails?.holderName || 'N/A'}</Text>
                            </View>
                            <View style={styles.copyChip}>
                                <Ionicons name="copy-outline" size={16} color="#6366F1" />
                            </View>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => onProcess(item, 'REJECTED')}>
                            <Feather name="x-circle" size={16} color="#EF4444" style={{ marginRight: 8 }} />
                            <Text style={styles.rejectBtnText}>DECLINE</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionBtn, styles.successBtn]} onPress={() => onProcess(item, 'SUCCESS')}>
                            <LinearGradient colors={['#10B981', '#059669']} style={styles.btnGradient}>
                                <Feather name="check-circle" size={16} color="#FFF" style={{ marginRight: 8 }} />
                                <Text style={styles.successBtnText}>AUTHORIZE TRANSFER</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        );
    };

    /* ============================================================
       🪟 MODAL POP - the decline popup springs in with 3D tilt
       every time the Modal opens (content mounts on open)
       ============================================================ */
    const ModalPop = ({ children }: { children: React.ReactNode }) => {
        const pop = useRef(new Animated.Value(0)).current;

        useEffect(() => {
            Animated.spring(pop, { toValue: 1, friction: 7, tension: 55, useNativeDriver: true }).start();
        }, []);

        return (
            <Animated.View
                style={{
                    width: '100%',
                    opacity: pop,
                    transform: [
                        { perspective: 1000 },
                        { rotateX: pop.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '0deg'] }) },
                        { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
                    ],
                }}
            >
                {children}
            </Animated.View>
        );
    };

    export default function AdminWithdrawals() {
        const router = useRouter();
        const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
        const [loading, setLoading] = useState(true);
        const [stats, setStats] = useState({ totalPending: 0, count: 0 });

        // 🔥 STATE FOR REJECT REASON POPUP 🔥
        const [rejectModalVisible, setRejectModalVisible] = useState(false);
        const [rejectReason, setRejectReason] = useState("");
        const [selectedRequestToReject, setSelectedRequestToReject] = useState<WithdrawalRequest | null>(null);

        /* ---------- 🎞️ HEADER / BACKGROUND / HERO ANIMATIONS ---------- */
        const orbA = useRef(new Animated.Value(0)).current;
        const orbB = useRef(new Animated.Value(0)).current;
        const headerIn = useRef(new Animated.Value(0)).current;
        const heroIn = useRef(new Animated.Value(0)).current;
        const tilt = useRef(new Animated.Value(0)).current;
        const shine = useRef(new Animated.Value(0)).current;
        const livePulse = useRef(new Animated.Value(0)).current;
        const floatIcon = useRef(new Animated.Value(0)).current;
        const spin = useRef(new Animated.Value(0)).current;

        useEffect(() => {
            Animated.timing(headerIn, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
            Animated.spring(heroIn, { toValue: 1, friction: 7, tension: 40, delay: 200, useNativeDriver: true }).start();

            const loopTiming = (val: Animated.Value, duration: number, delay = 0) =>
                Animated.loop(
                    Animated.sequence([
                        Animated.timing(val, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                        Animated.timing(val, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                    ])
                );
            const l1 = loopTiming(orbA, 6000);
            const l2 = loopTiming(orbB, 7500, 700);
            const l3 = loopTiming(tilt, 3200);
            const l4 = loopTiming(livePulse, 900);
            const l5 = loopTiming(floatIcon, 2200);
            const l6 = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 12000, easing: Easing.linear, useNativeDriver: true }));
            const l7 = Animated.loop(
                Animated.sequence([
                    Animated.delay(2200),
                    Animated.timing(shine, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                    Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
                ])
            );
            [l1, l2, l3, l4, l5, l6, l7].forEach(l => l.start());
            return () => [l1, l2, l3, l4, l5, l6, l7].forEach(l => l.stop());
        }, []);

        useEffect(() => {
            const currentUserUID = auth.currentUser?.uid;
            
            // 🔥 REMOVED STRICT UID CHECK TO ALLOW YOUR ADMIN ACCOUNT TO ACCESS THIS PAGE 🔥
            // if (currentUserUID !== ADMIN_UID) {
            //     Alert.alert("🚨 ACCESS RESTRICTED", "Authorized TalkPe Pro credentials required.");
            //     router.replace('/(admin)'); 
            //     return;
            // }

            // collectionGroup optimized for decentralized Redeem nodes
            const q = query(collectionGroup(db, "withdrawals"));

            const unsub = onSnapshot(q, (snap) => {
                const list = snap.docs
                    .map(d => {
                        const data = d.data();
                        return { 
                            id: d.id, 
                            ...data,
                            // Normalizing field names across distributed Firestore nodes
                            amount: data.amount || data.amountRupee || 0,
                            transactionCharge: data.transactionCharge || 100, // Fetching transaction charge from DB
                            status: data.status || 'PENDING',
                            userPath: d.ref.path // Reference path for atomic updates
                        } as WithdrawalRequest;
                    })
                    // Case insensitive filter for global pending synchronization
                    .filter(item => {
                        const currentStatus = item.status ? item.status.toString().toLowerCase() : '';
                        return currentStatus === 'pending';
                    });

                setRequests(list);
                let sum = 0;
                list.forEach(r => sum += Number(r.amount));
                setStats({ totalPending: sum, count: list.length });
                setLoading(false);
            }, (err) => {
                console.error("Secure Queue Sync Error:", err);
                setLoading(false);
            });
            return () => unsub();
        }, []);

        // 🔥 NEW: OPEN HOST PROFILE / PASSBOOK (admin)/experts/verify-expert/[id].tsx 🔥
        const openHostProfile = (userId: string) => {
            if (!userId) {
                Alert.alert("Error", "Host ID not found.");
                return;
            }
            router.push(`/(admin)/experts/verify-expert/${userId}` as any);
        };

        const handleProcessPayment = async (request: WithdrawalRequest, status: 'SUCCESS' | 'REJECTED') => {
            if (status === 'REJECTED') {
                // If rejected, open modal to get reason instead of direct alert
                setSelectedRequestToReject(request);
                setRejectReason("");
                setRejectModalVisible(true);
                return;
            }

            const amountToProcess = Math.floor(Number(request.amount)); 
            
            Alert.alert(
                "🎖️ AUTHORIZE TRANSFER",
                `Confirm transfer of ₹${amountToProcess.toLocaleString()}?`,
                [
                    { text: "Cancel", style: "cancel" },
                    { 
                        text: "Confirm Action", 
                        onPress: async () => {
                            try {
                                // 🔴 SYSTEM CHECK: Host reference verification
                                const expertRef = doc(db, "users", request.userId);
                                const expertSnap = await getDoc(expertRef);

                                if (!expertSnap.exists()) {
                                    Alert.alert("Error", "Associated user record not found.");
                                    return;
                                }

                                const expertData = expertSnap.data();
                                const currentPending = Number(expertData.pendingACTIVITY_REWARD || 0);
                                const currentWithdrawn = Number(expertData.totalWithdrawnRs || 0);

                                await updateDoc(expertRef, { 
                                    pendingACTIVITY_REWARD: Math.max(0, currentPending - amountToProcess),
                                    totalWithdrawnRs: currentWithdrawn + amountToProcess
                                });

                                await recordTransaction(
                                    request.userId, 
                                    request.expertName || "Host", 
                                    amountToProcess, 
                                    'ACTIVITY_REWARD', 
                                    `Ref ID: ${request.id}`
                                );

                                // Synchronization of secure sub-collection node
                                if (request.userPath) {
                                    await updateDoc(doc(db, request.userPath), {
                                        status: status,
                                        processedAt: serverTimestamp(),
                                        processedBy: auth.currentUser?.uid
                                    });
                                }

                                // 🔥 ADMIN SUCCESS NOTIFICATION TRIGGER 🔥
                                await sendNotificationToUser(
                                    request.userId,
                                    "Transfer Successful 💸",
                                    `Your withdrawal of ₹${amountToProcess} has been successfully processed to your bank account.`,
                                    "payment"
                                );

                                // 🔥 FIX: OPTIMISTIC UI UPDATE TO REMOVE ITEM IMMEDIATELY 🔥
                                setRequests(prev => prev.filter(item => item.id !== request.id));
                                setStats(prev => ({ totalPending: prev.totalPending - Number(request.amount), count: prev.count - 1 }));

                                Alert.alert("Success! ✅", "System Ledger Synchronized.");
                            } catch (err: any) {
                                console.error("Transfer Sync Error:", err);
                                Alert.alert("Error", err.message || "Failed to update records.");
                            }
                        } 
                    }
                ]
            );
        };

        // 🔥 NEW FUNCTION: EXECUTE REJECT WITH REASON 🔥
        const executeReject = async () => {
            if (!rejectReason || rejectReason.trim() === "") {
                Alert.alert("Error", "Please provide a reason for declining.");
                return;
            }
            if (!selectedRequestToReject) return;

            const request = selectedRequestToReject;
            const amountToProcess = Math.floor(Number(request.amount));
            const transCharge = Number(request.transactionCharge || 100); // Get actual charge applied

            try {
                const expertRef = doc(db, "users", request.userId);
                const expertSnap = await getDoc(expertRef);

                if (!expertSnap.exists()) {
                    Alert.alert("Error", "Associated user record not found.");
                    return;
                }

                const expertData = expertSnap.data();
                const currentPending = Number(expertData.pendingACTIVITY_REWARD || 0);
                const currentWallet = Number(expertData.walletBalance || 0);

                // 🔥 TOTAL REFUND CALCULATION = (Requested Amount + Transaction Charge) * 100 to get beans
                const totalRefundBeans = (amountToProcess + transCharge) * 100;

                // Atomic reversal for declined requests (Full Refund to wallet)
                await updateDoc(expertRef, { 
                    pendingACTIVITY_REWARD: Math.max(0, currentPending - amountToProcess),
                    walletBalance: currentWallet + totalRefundBeans // Full Refund!
                });

                // Update Withdrawal status with REASON
                if (request.userPath) {
                    await updateDoc(doc(db, request.userPath), {
                        status: 'REJECTED',
                        rejectReason: rejectReason.trim(),
                        processedAt: serverTimestamp(),
                        processedBy: auth.currentUser?.uid
                    });
                }

                // 🔥 ADMIN REJECT NOTIFICATION TRIGGER WITH REASON 🔥
                await sendNotificationToUser(
                    request.userId,
                    "Transfer Declined ⚠️",
                    `Your withdrawal of ₹${amountToProcess} was declined. Reason: ${rejectReason.trim()}. The full amount has been refunded to your wallet.`,
                    "system"
                );

                // 🔥 FIX: OPTIMISTIC UI UPDATE TO REMOVE ITEM IMMEDIATELY 🔥
                setRequests(prev => prev.filter(item => item.id !== request.id));
                setStats(prev => ({ totalPending: prev.totalPending - Number(request.amount), count: prev.count - 1 }));

                Alert.alert("Success! ✅", `Request Declined & Fully Refunded (₹${amountToProcess + transCharge}).`);
                setRejectModalVisible(false);
                setSelectedRequestToReject(null);

            } catch (err: any) {
                console.error("Reject Sync Error:", err);
                Alert.alert("Error", err.message || "Failed to reject record.");
            }
        };

        const copyToClipboard = (text: string, label: string) => {
            if(!text) return Alert.alert("Error", `${label} verification failed!`);
            Clipboard.setString(text);
            Alert.alert("Copied! ✅", `${label} added to clipboard.`);
        };

        if (loading) return (
            <View style={styles.center}><ActivityIndicator size="large" color="#6366F1" /></View>
        );

        /* ---------- 🎨 DERIVED ANIMATION STYLES ---------- */
        const orbAY = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });
        const orbAX = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
        const orbBY = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
        const orbBX = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -35] });
        const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-width, width * 1.2] });
        const liveHaloScale = livePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] });
        const liveHaloOpacity = livePulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
        const iconFloatY = floatIcon.interpolate({ inputRange: [0, 1], outputRange: [0, -12] });
        const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
        const heroTransform = [
            { perspective: 1000 },
            { translateY: heroIn.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
            { rotateX: heroIn.interpolate({ inputRange: [0, 1], outputRange: ['35deg', '0deg'] }) },
            { scale: heroIn.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
            { rotateY: tilt.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) },
            { rotateX: tilt.interpolate({ inputRange: [0, 1], outputRange: ['1.5deg', '-1.5deg'] }) },
        ];

        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                <LinearGradient colors={['#020617', '#0F172A', '#020617']} style={StyleSheet.absoluteFill} />

                {/* 🌌 AURORA FLOATING ORBS */}
                <Animated.View pointerEvents="none" style={[styles.orb, styles.orbA, { transform: [{ translateX: orbAX }, { translateY: orbAY }] }]} />
                <Animated.View pointerEvents="none" style={[styles.orb, styles.orbB, { transform: [{ translateX: orbBX }, { translateY: orbBY }] }]} />
                <Animated.View pointerEvents="none" style={[styles.orb, styles.orbC, { transform: [{ translateY: orbAY }] }]} />

                <Animated.View
                    style={[
                        styles.header,
                        {
                            opacity: headerIn,
                            transform: [
                                { perspective: 900 },
                                { translateY: headerIn.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) },
                                { rotateX: headerIn.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] }) },
                            ],
                        },
                    ]}
                >
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#6366F1" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={styles.headerTitle}>REDEMPTION QUEUE</Text>
                        <Text style={styles.headerSub}>ADMIN CONSOLE • TALKPE PRO</Text>
                    </View>
                    <View style={styles.statusPulse}>
                        <View style={styles.pulseDotWrap}>
                            <Animated.View style={[styles.pulseHalo, { opacity: liveHaloOpacity, transform: [{ scale: liveHaloScale }] }]} />
                            <View style={styles.pulseDot} />
                        </View>
                        <Text style={styles.liveText}>SYNCED</Text>
                    </View>
                </Animated.View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
                    {/* 💎 3D HERO - TOTAL OUTSTANDING */}
                    <Animated.View style={[styles.statContainer, { opacity: heroIn, transform: heroTransform }]}>
                        <LinearGradient colors={['#6366F1', '#4338CA']} style={styles.statBox}>
                            <LinearGradient
                                colors={['rgba(255,255,255,0.22)', 'transparent', 'rgba(0,0,0,0.25)']}
                                locations={[0, 0.5, 1]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.statCircleA} />
                            <View style={styles.statCircleB} />
                            <Animated.View pointerEvents="none" style={[styles.statShine, { transform: [{ translateX: shineX }, { rotate: '20deg' }] }]}>
                                <LinearGradient
                                    colors={['transparent', 'rgba(255,255,255,0.28)', 'transparent']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={{ flex: 1 }}
                                />
                            </Animated.View>
                            <View>
                                <Text style={styles.statL}>TOTAL OUTSTANDING TRANSFERS</Text>
                                <Text style={styles.statV}>₹{stats.totalPending.toLocaleString()}</Text>
                            </View>
                            <View style={styles.countBadge}><Text style={styles.countText}>{stats.count} REQS</Text></View>
                        </LinearGradient>
                    </Animated.View>

                    <View style={styles.listSection}>
                        {requests.length === 0 ? (
                            <View style={styles.empty}>
                                <View style={styles.emptyStage}>
                                    <Animated.View style={[styles.orbitRing, { transform: [{ rotate: rotate }] }]} />
                                    <Animated.View style={{ transform: [{ perspective: 800 }, { translateY: iconFloatY }, { rotateX: '12deg' }] }}>
                                        <MaterialCommunityIcons name="check-decagram" size={60} color="#1E293B" />
                                    </Animated.View>
                                </View>
                                <Text style={styles.emptyT}>All Transfers Completed!</Text>
                            </View>
                        ) : (
                            requests.map((item, index) => (
                                <RequestCard
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    onProcess={handleProcessPayment}
                                    onCopy={copyToClipboard}
                                    onOpenProfile={openHostProfile}
                                />
                            ))
                        )}
                    </View>
                </ScrollView>

                {/* 🔥 REJECT REASON MODAL 🔥 */}
                <Modal visible={rejectModalVisible} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <ModalPop>
                        <View style={styles.modalContent}>
                            <LinearGradient
                                colors={['rgba(239,68,68,0.14)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <View style={styles.modalHeaderBox}>
                                <MaterialCommunityIcons name="alert-circle" size={24} color="#EF4444" />
                                <Text style={styles.modalTitle}>DECLINE REQUEST</Text>
                            </View>
                            
                            <Text style={styles.modalSub}>Select a quick reason or type below.</Text>
                            
                            {/* 🔥 QUICK SELECT REASON CHIPS 🔥 */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickReasonScroll}>
                                {['Invalid Account Number', 'Incorrect IFSC Code', 'UPI ID Not Active', 'Name Mismatch'].map((reason) => (
                                    <TouchableOpacity 
                                        key={reason} 
                                        style={[styles.quickReasonChip, rejectReason === reason && styles.quickReasonChipActive]} 
                                        onPress={() => setRejectReason(reason)}
                                    >
                                        <Text style={[styles.quickReasonText, rejectReason === reason && styles.quickReasonTextActive]}>{reason}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TextInput
                                style={styles.reasonInput}
                                placeholder="Or type custom reason here..."
                                placeholderTextColor="#475569"
                                value={rejectReason}
                                onChangeText={setRejectReason}
                                multiline
                            />

                            <View style={styles.modalActionRow}>
                                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setRejectModalVisible(false); setSelectedRequestToReject(null); }}>
                                    <Text style={styles.modalCancelText}>CANCEL</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalSubmitBtn} onPress={executeReject}>
                                    <Text style={styles.modalSubmitText}>CONFIRM DECLINE</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                        </ModalPop>
                    </View>
                </Modal>

            </View>
        );
    }

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: '#020617' },
        center: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },

        /* background orbs */
        orb: { position: 'absolute', borderRadius: 999 },
        orbA: { width: 280, height: 280, top: -70, right: -90, backgroundColor: 'rgba(99,102,241,0.18)' },
        orbB: { width: 240, height: 240, top: 420, left: -110, backgroundColor: 'rgba(139,92,246,0.14)' },
        orbC: { width: 200, height: 200, bottom: 100, right: -80, backgroundColor: 'rgba(16,185,129,0.08)' },

        header: { paddingTop: 60, paddingHorizontal: 25, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
        backBtn: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E293B', shadowColor: '#6366F1', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
        headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.5, textShadowColor: 'rgba(99,102,241,0.6)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
        headerSub: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 2 },
        statusPulse: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B98115', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: '#10B98133' },
        pulseDotWrap: { width: 12, height: 12, alignItems: 'center', justifyContent: 'center', marginRight: 4 },
        pulseHalo: { position: 'absolute', width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981' },
        pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
        liveText: { color: '#10B981', fontSize: 9, fontWeight: '900' },
        statContainer: { paddingHorizontal: 20, marginTop: 10 },
        statBox: { padding: 30, borderRadius: 35, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', overflow: 'hidden', elevation: 18, shadowColor: '#6366F1', shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } },
        statCircleA: { position: 'absolute', width: 190, height: 190, borderRadius: 95, top: -70, right: -60, backgroundColor: 'rgba(255,255,255,0.08)' },
        statCircleB: { position: 'absolute', width: 140, height: 140, borderRadius: 70, bottom: -60, left: -40, backgroundColor: 'rgba(255,255,255,0.06)' },
        statShine: { position: 'absolute', top: -60, bottom: -60, width: 90 },
        statL: { color: '#E0E7FF', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
        statV: { color: '#FFF', fontSize: 38, fontWeight: '900', marginTop: 5, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 4 }, textShadowRadius: 10 },
        countBadge: { backgroundColor: '#00000030', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FFFFFF30' },
        countText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
        listSection: { padding: 20, paddingBottom: 100 },

        cardGlow: { position: 'absolute', top: 20, left: 20, right: 20, bottom: 4, borderRadius: 30, backgroundColor: '#F59E0B' },
        card: { backgroundColor: '#0F172A', padding: 22, borderRadius: 32, marginBottom: 18, borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 12 }, elevation: 10 },
        shimmer: { position: 'absolute', top: -40, bottom: -40, width: 90 },
        cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
        // 🔥 NEW STYLES: TAPPABLE HOST PROFILE BLOCK 🔥
        profileTap: { flex: 1, marginRight: 10 },
        viewProfileChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, marginTop: 10, backgroundColor: '#6366F115', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#6366F133' },
        viewProfileText: { color: '#818CF8', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 },
        expertId: { color: '#FFF', fontSize: 13, fontWeight: '800' },
        expertIdSub: { color: '#475569', fontSize: 9, fontWeight: '700' },
        cardAmount: { color: '#FFF', fontSize: 28, fontWeight: '900', marginTop: 8, textShadowColor: 'rgba(99,102,241,0.5)', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 },
        waitingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B10', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: '#F59E0B33' },
        waitingText: { color: '#F59E0B', fontSize: 9, fontWeight: '900' },
        detailsContainer: { backgroundColor: '#020617', padding: 18, borderRadius: 24, borderWidth: 1, borderColor: '#1E293B', marginBottom: 20 },
        vaultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 15 },
        sectionLabel: { color: '#475569', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
        detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
        copyChip: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#6366F115', borderWidth: 1, borderColor: '#6366F133', alignItems: 'center', justifyContent: 'center' },
        upiLabel: { color: '#475569', fontSize: 8, fontWeight: '900', marginBottom: 2 },
        upiValue: { color: '#818CF8', fontSize: 15, fontWeight: '800' },
        bankValue: { color: '#FFF', fontSize: 14, fontWeight: '700' },
        holderName: { color: '#10B981', fontSize: 10, fontWeight: '800', marginTop: 2 },
        divider: { height: 1, backgroundColor: '#1E293B', marginVertical: 12 },
        actionRow: { flexDirection: 'row', gap: 12 },
        actionBtn: { flex: 1, height: 60, borderRadius: 20, overflow: 'hidden' },
        rejectBtn: { backgroundColor: '#EF444410', borderWidth: 1, borderColor: '#EF444450', alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
        rejectBtnText: { color: '#EF4444', fontWeight: '900', fontSize: 13 },
        successBtn: { backgroundColor: '#10B981', shadowColor: '#10B981', shadowOpacity: 0.55, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
        btnGradient: { flex: 1, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
        successBtnText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
        empty: { alignItems: 'center', marginTop: 80 },
        emptyStage: { width: 140, height: 140, alignItems: 'center', justifyContent: 'center' },
        orbitRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(99,102,241,0.4)' },
        emptyT: { color: '#475569', fontSize: 16, fontWeight: '800', marginTop: 15 },
        
        // 🔥 MODAL & QUICK REASON CHIP STYLES 🔥
        modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
        modalContent: { width: '100%', backgroundColor: '#0F172A', padding: 25, borderRadius: 24, borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden', shadowColor: '#EF4444', shadowOpacity: 0.35, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 14 },
        modalHeaderBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
        modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
        modalSub: { color: '#475569', fontSize: 11, fontWeight: '700', marginBottom: 15 },
        quickReasonScroll: { marginBottom: 15, maxHeight: 40 },
        quickReasonChip: { backgroundColor: '#1E293B', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#334155', justifyContent: 'center' },
        quickReasonChipActive: { backgroundColor: '#EF444420', borderColor: '#EF4444', shadowColor: '#EF4444', shadowOpacity: 0.5, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
        quickReasonText: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
        quickReasonTextActive: { color: '#EF4444' },
        reasonInput: { backgroundColor: '#020617', color: '#FFF', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#1E293B', minHeight: 80, textAlignVertical: 'top', fontSize: 14 },
        modalActionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
        modalCancelBtn: { flex: 1, padding: 15, borderRadius: 16, backgroundColor: '#1E293B', alignItems: 'center' },
        modalCancelText: { color: '#94A3B8', fontWeight: '900', fontSize: 12 },
        modalSubmitBtn: { flex: 1, padding: 15, borderRadius: 16, backgroundColor: '#EF4444', alignItems: 'center', shadowColor: '#EF4444', shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
        modalSubmitText: { color: '#FFF', fontWeight: '900', fontSize: 12 }
    });