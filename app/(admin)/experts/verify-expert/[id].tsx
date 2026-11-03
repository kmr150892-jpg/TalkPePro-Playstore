import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    Linking,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../../firebaseConfig';

const { width } = Dimensions.get('window');

/* ============================================================
   🆕 DATE HELPER - works for Firestore Timestamp / millis / Date
   ============================================================ */
const formatTs = (ts: any) => {
    try {
        const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
        if (!d || isNaN(d.getTime())) return 'N/A';
        return (
            d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ', ' +
            d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
        );
    } catch (e) {
        return 'N/A';
    }
};

/* ============================================================
   🎬 3D REVEAL WRAPPER - every section flips up in 3D, staggered
   ============================================================ */
const Reveal = ({ index = 0, children, style }: { index?: number; children: React.ReactNode; style?: any }) => {
    const v = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(v, {
            toValue: 1,
            duration: 650,
            delay: 200 + index * 130,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, []);

    return (
        <Animated.View
            style={[
                style,
                {
                    opacity: v,
                    transform: [
                        { perspective: 900 },
                        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [45, 0] }) },
                        { rotateX: v.interpolate({ inputRange: [0, 1], outputRange: ['22deg', '0deg'] }) },
                        { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) },
                    ],
                },
            ]}
        >
            {children}
        </Animated.View>
    );
};

/* ============================================================
   🏷️ SECTION HEADER - glowing icon chip + fading rule line
   ============================================================ */
const SectionHead = ({ icon, title }: { icon: React.ReactNode; title: string }) => (
    <View style={styles.sectionHeader}>
        <View style={styles.sectionIconChip}>{icon}</View>
        <Text style={styles.sectionTitle}>{title}</Text>
        <LinearGradient
            colors={['#6366F155', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.sectionRule}
        />
    </View>
);

export default function VerifyExpertDetail() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [expert, setExpert] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const expertId = Array.isArray(id) ? id[0] : id;

    /* ---------- 🎞️ ANIMATION VALUES ---------- */
    const heroIn = useRef(new Animated.Value(0)).current;      // hero 3D entrance
    const tilt = useRef(new Animated.Value(0)).current;        // hero idle 3D tilt loop
    const pulse = useRef(new Animated.Value(0)).current;       // status dot / glow pulse
    const scan = useRef(new Animated.Value(0)).current;        // hologram scan line
    const orbA = useRef(new Animated.Value(0)).current;        // floating background orb A
    const orbB = useRef(new Animated.Value(0)).current;        // floating background orb B
    const shine = useRef(new Animated.Value(0)).current;       // metallic shine sweep
    const footerIn = useRef(new Animated.Value(0)).current;    // footer slide-up

    useEffect(() => {
        Animated.spring(heroIn, { toValue: 1, friction: 7, tension: 40, delay: 100, useNativeDriver: true }).start();
        Animated.timing(footerIn, { toValue: 1, duration: 700, delay: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

        const loopTiming = (val: Animated.Value, duration: number, delay = 0) =>
            Animated.loop(
                Animated.sequence([
                    Animated.timing(val, { toValue: 1, duration, delay, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                    Animated.timing(val, { toValue: 0, duration, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                ])
            );

        const l1 = loopTiming(tilt, 3200);
        const l2 = loopTiming(pulse, 1100);
        const l3 = loopTiming(orbA, 6000);
        const l4 = loopTiming(orbB, 7500, 800);
        const l5 = Animated.loop(
            Animated.timing(scan, { toValue: 1, duration: 3400, easing: Easing.linear, useNativeDriver: true })
        );
        const l6 = Animated.loop(
            Animated.sequence([
                Animated.delay(2200),
                Animated.timing(shine, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
                Animated.timing(shine, { toValue: 0, duration: 0, useNativeDriver: true }),
            ])
        );

        [l1, l2, l3, l4, l5, l6].forEach(l => l.start());
        return () => [l1, l2, l3, l4, l5, l6].forEach(l => l.stop());
    }, []);

    useEffect(() => {
        if (!expertId) return;
        
        const unsub = onSnapshot(doc(db, "users", expertId), 
            (snapshot) => {
                if (snapshot.exists()) {
                    setExpert({ id: snapshot.id, ...snapshot.data() });
                }
                setLoading(false);
            }, (err) => {
                console.error("Sync Error:", err);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [expertId]);

    const handleVerification = async (action: 'APPROVE' | 'REJECT') => {
        const isApprove = action === 'APPROVE';
        setProcessing(true);
        try {
            const userRef = doc(db, "users", expertId as string);
            const updateData: any = {
                // 🔥 SATTI FIX: Reject aana "User" status ku maaridum, appothan thirumba fresh login page & register form pogum
                status: isApprove ? "Active" : "User", 
                role: isApprove ? "expert" : "user", 
                isApplying: false, 
                // 🔥 SATTI FIX: Added this to clear the onboarding lock flag! 🔥
                registrationInProgress: false, 
                isVerified: isApprove,
                lastAdminAction: serverTimestamp(),
            };

            if (isApprove) {
                updateData.verifiedAt = serverTimestamp();
                updateData.walletBalance = expert?.walletBalance || 0; 
                updateData.totalBeansEarned = expert?.totalBeansEarned || 0;
                
                // 🔥 THE FIX: Start at Level 0 (Beginner) instead of 1 🔥
                updateData.currentLevel = 0;
                updateData.levelTitle = "BEGINNER";
                
                updateData.beansPerMin = 1000; 
                updateData.userPrice = 2000;   
            }

            await updateDoc(userRef, updateData);
            Alert.alert("SYSTEM UPDATED", `Host access is now ${isApprove ? 'Authorized' : 'Declined'}.`);
            router.back();
        } catch (err) {
            Alert.alert("ERROR", "System update failed.");
        } finally {
            setProcessing(false);
        }
    };

    const toggleBlockStatus = async () => {
        const isCurrentlyBlocked = expert?.isBlocked || expert?.status === 'Blocked';
        const nextStatus = !isCurrentlyBlocked;

        Alert.alert(
            nextStatus ? "RESTRICT HOST?" : "RESTORE ACCESS?",
            `Are you sure you want to ${nextStatus ? 'restrict' : 'restore'} platform access for ${expert?.name}?`,
            [
                { text: "CANCEL", style: "cancel" },
                { 
                    text: "CONFIRM", 
                    style: nextStatus ? "destructive" : "default",
                    onPress: async () => {
                        setProcessing(true);
                        try {
                            const userRef = doc(db, "users", expertId as string);
                            await updateDoc(userRef, {
                                isBlocked: nextStatus,
                                status: nextStatus ? "Blocked" : "Active"
                            });
                        } catch (err) {
                            Alert.alert("ERROR", "Access modification failed.");
                        } finally {
                            setProcessing(false);
                        }
                    }
                }
            ]
        );
    };

    // Helper to open ID Proof
    const openIdProof = () => {
        if (expert?.idProof) {
            Linking.openURL(expert.idProof);
        } else {
            Alert.alert("Not Found", "Identity document not uploaded yet.");
        }
    };

    // 🔥 SATTI FIX: CRASH PREVENTION FOR LOCAL FILES 🔥
    const handleOpenMedia = (url: string) => {
        if (!url) return;
        if (url.startsWith('file://')) {
            Alert.alert(
                "Cannot Open Media", 
                "This Host uploaded a local device file instead of a Cloud URL. Ask them to login again so the system can auto-upload it to Firebase."
            );
        } else {
            Linking.openURL(url);
        }
    };

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator color="#6366F1" size="large" />
        </View>
    );

    const isPending = expert?.status === 'Pending' || expert?.isApplying === true;
    const isBlocked = expert?.status === 'Blocked' || expert?.isBlocked;
    const expertPhoto = expert?.profilePic || expert?.photoURL || expert?.image;
    const statusColor = isPending ? '#F59E0B' : (isBlocked ? '#EF4444' : '#10B981');

    /* ---------- 🆕 REDEEM DATA (total + history from notifications) ---------- */
    const totalRedeemedRs = Number(expert?.totalWithdrawnRs || 0);
    const totalRedeemedRewards = totalRedeemedRs * 100; // 100 rewards = ₹1 (same as BALANCE (RS) logic)
    const redeemEvents = (Array.isArray(expert?.notifications) ? expert.notifications : [])
        .filter((n: any) => /Withdrawal Requested|Transfer Successful|Transfer Declined/i.test(n?.title || ''))
        .map((n: any) => {
            const title = String(n?.title || '');
            const kind = /Successful/i.test(title) ? 'SUCCESS' : (/Declined/i.test(title) ? 'DECLINED' : 'REQUESTED');
            const match = String(n?.message || '').match(/₹\s?([\d,]+)/);
            const amount = match ? Number(match[1].replace(/,/g, '')) : 0;
            return { kind, amount, createdAt: n?.createdAt || 0, message: String(n?.message || '') };
        })
        .sort((a: any, b: any) => b.createdAt - a.createdAt);
    const redeemSuccessCount = redeemEvents.filter((e: any) => e.kind === 'SUCCESS').length;
    const redeemDeclinedCount = redeemEvents.filter((e: any) => e.kind === 'DECLINED').length;
    const redeemRequestedCount = redeemEvents.filter((e: any) => e.kind === 'REQUESTED').length;
    const redeemPendingCount = Math.max(0, redeemRequestedCount - redeemSuccessCount - redeemDeclinedCount);
    const recentRedeemEvents = redeemEvents.slice(0, 6);
    const redeemKindColor = (k: string) => (k === 'SUCCESS' ? '#10B981' : (k === 'DECLINED' ? '#EF4444' : '#F59E0B'));
    const redeemKindLabel = (k: string) => (k === 'SUCCESS' ? 'PAID' : (k === 'DECLINED' ? 'DECLINED' : 'REQUESTED'));

    /* ---------- 🎨 DERIVED ANIMATION STYLES ---------- */
    const heroTransform = [
        { perspective: 1000 },
        { translateY: heroIn.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
        { rotateX: heroIn.interpolate({ inputRange: [0, 1], outputRange: ['35deg', '0deg'] }) },
        { scale: heroIn.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) },
        { rotateY: tilt.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) },
        { rotateX: tilt.interpolate({ inputRange: [0, 1], outputRange: ['1.5deg', '-1.5deg'] }) },
    ];
    const dotScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] });
    const dotHalo = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
    const glowOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });
    const scanY = scan.interpolate({ inputRange: [0, 1], outputRange: [0, 380] });
    const scanOpacity = scan.interpolate({ inputRange: [0, 0.1, 0.9, 1], outputRange: [0, 0.9, 0.9, 0] });
    const shineX = shine.interpolate({ inputRange: [0, 1], outputRange: [-width, width * 1.2] });
    const orbAY = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });
    const orbAX = orbA.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
    const orbBY = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
    const orbBX = orbB.interpolate({ inputRange: [0, 1], outputRange: [0, -35] });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0F172A', '#020617']} style={StyleSheet.absoluteFill} />

            {/* 🌌 AURORA FLOATING ORBS (background depth) */}
            <Animated.View pointerEvents="none" style={[styles.orb, styles.orbA, { transform: [{ translateX: orbAX }, { translateY: orbAY }] }]} />
            <Animated.View pointerEvents="none" style={[styles.orb, styles.orbB, { transform: [{ translateX: orbBX }, { translateY: orbBY }] }]} />
            <Animated.View pointerEvents="none" style={[styles.orb, styles.orbC, { transform: [{ translateY: orbAY }] }]} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <LinearGradient colors={['#1E293B', '#0F172A']} style={StyleSheet.absoluteFill} />
                    <Ionicons name="chevron-back" size={24} color="#6366F1" />
                </TouchableOpacity>
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>{isPending ? 'ONBOARDING REVIEW' : 'HOST CONSOLE'}</Text>
                    <View style={styles.sysChip}>
                        <View style={[styles.sysChipDot, { backgroundColor: statusColor }]} />
                        <Text style={styles.headerSub}>SYSTEM ID: {String(expertId || '').toUpperCase()}</Text>
                    </View>
                </View>
                <View style={styles.headerBadge}>
                    <MaterialCommunityIcons name="shield-crown" size={20} color="#6366F1" />
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                {/* Profile Card - 3D HOLO PASS */}
                <Animated.View style={[styles.heroWrap, { transform: heroTransform }]}>
                    {/* pulsing status glow behind the card */}
                    <Animated.View style={[styles.heroGlow, { backgroundColor: statusColor, opacity: glowOpacity }]} />

                    <View style={[styles.profileCard, { borderColor: statusColor + '55' }]}>
                        <View style={styles.imageContainer}>
                            {expertPhoto ? (
                                <Image source={{ uri: expertPhoto }} style={styles.selfie} resizeMode="cover" />
                            ) : (
                                <View style={styles.placeholderImage}>
                                    <Feather name="user" size={60} color="#1E293B" />
                                </View>
                            )}
                            <LinearGradient colors={['rgba(2,6,23,0.35)', 'transparent', 'rgba(2,6,23,0.97)']} locations={[0, 0.45, 1]} style={styles.imageOverlay} />
                        </View>

                        {/* HOLOGRAM SCAN LINE */}
                        <Animated.View pointerEvents="none" style={[styles.scanLine, { opacity: scanOpacity, transform: [{ translateY: scanY }] }]}>
                            <LinearGradient
                                colors={['transparent', statusColor, 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ flex: 1 }}
                            />
                        </Animated.View>

                        {/* METALLIC SHINE SWEEP */}
                        <Animated.View pointerEvents="none" style={[styles.shine, { transform: [{ translateX: shineX }, { rotate: '20deg' }] }]}>
                            <LinearGradient
                                colors={['transparent', 'rgba(255,255,255,0.18)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ flex: 1 }}
                            />
                        </Animated.View>

                        {/* corner brackets (scanner frame) */}
                        <View style={[styles.corner, styles.cornerTL, { borderColor: statusColor }]} />
                        <View style={[styles.corner, styles.cornerTR, { borderColor: statusColor }]} />

                        {/* top-right floating chip */}
                        <View style={styles.topChip}>
                            <MaterialCommunityIcons name="fingerprint" size={14} color="#A5B4FC" />
                            <Text style={styles.topChipText}>{isPending ? 'KYC REVIEW' : 'VERIFIED PASS'}</Text>
                        </View>

                        <View style={styles.infoOverlay}>
                            <Text style={styles.name}>{expert?.name || 'ARUVI MULTIVERSE'}</Text>
                            <View style={[styles.statusBadge, { borderColor: statusColor }]}>
                                <View style={styles.dotWrap}>
                                    <Animated.View style={[styles.dotHalo, { backgroundColor: statusColor, opacity: dotHalo, transform: [{ scale: dotScale }] }]} />
                                    <View style={[styles.dot, { backgroundColor: statusColor }]} />
                                </View>
                                <Text style={[styles.statusText, { color: statusColor }]}>
                                    {isPending ? 'PENDING VERIFICATION' : (isBlocked ? 'ACCESS RESTRICTED' : 'ACTIVE HOST')}
                                </Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* METRICS & ANALYTICS */}
               {!isPending && (
                    <Reveal index={0} style={styles.section}>
                        <SectionHead icon={<MaterialCommunityIcons name="finance" size={14} color="#6366F1" />} title="OPERATIONAL METRICS" />
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <LinearGradient colors={['#6366F122', 'transparent']} style={StyleSheet.absoluteFill} />
                                <Text style={styles.statLabel}>REWARDS</Text>
                                <View style={styles.currencyRow}>
                                    {/* 🔥 SATTI UPDATE: REPLACED LEAF WITH MEDAL 🎖️ */}
                                    <Text style={{ fontSize: 16 }}>🎖️</Text>
                                    <Text style={styles.statValue}> {expert?.walletBalance || 0}</Text>
                                </View>
                            </View>
                            <View style={styles.statBox}>
                                <LinearGradient colors={['#10B98122', 'transparent']} style={StyleSheet.absoluteFill} />
                                <Text style={styles.statLabel}>BALANCE (RS)</Text>
                                <View style={styles.currencyRow}>
                                    <FontAwesome5 name="wallet" size={14} color="#10B981" />
                                    <Text style={styles.statValue}> ₹{Math.floor((expert?.walletBalance || 0) / 100)}</Text>
                                </View>
                            </View>
                        </View>
                        
                        {/* ✅ TIER BOX */}
                        <View style={[styles.statBox, styles.tierBox, { marginTop: 15, width: '100%', flexDirection: 'row', justifyContent: 'space-between' }]}>
                             <LinearGradient colors={['#6366F133', '#8B5CF611', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                             <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                 <MaterialCommunityIcons name="crown" size={16} color="#F59E0B" style={{ marginRight: 8 }} />
                                 <Text style={styles.statLabel2}>HOST TIER</Text>
                             </View>
                             <Text style={[styles.statValue, { fontSize: 14, color: '#6366F1' }]}>{expert?.levelTitle || 'BEGINNER L0'}</Text>
                        </View>
                    </Reveal>
                )}

                {/* 🆕 REDEEM HISTORY - how much reward this host has redeemed so far */}
                {!isPending && (
                    <Reveal index={1} style={styles.section}>
                        <SectionHead icon={<MaterialCommunityIcons name="cash-check" size={14} color="#6366F1" />} title="REDEEM HISTORY" />
                        <View style={styles.statsRow}>
                            <View style={styles.statBox}>
                                <LinearGradient colors={['#F59E0B22', 'transparent']} style={StyleSheet.absoluteFill} />
                                <Text style={styles.statLabel}>TOTAL REDEEMED</Text>
                                <View style={styles.currencyRow}>
                                    <Text style={{ fontSize: 16 }}>🎖️</Text>
                                    <Text style={styles.statValue}> {totalRedeemedRewards}</Text>
                                </View>
                            </View>
                            <View style={styles.statBox}>
                                <LinearGradient colors={['#10B98122', 'transparent']} style={StyleSheet.absoluteFill} />
                                <Text style={styles.statLabel}>PAID OUT (RS)</Text>
                                <View style={styles.currencyRow}>
                                    <FontAwesome5 name="money-bill-wave" size={14} color="#10B981" />
                                    <Text style={styles.statValue}> ₹{totalRedeemedRs}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={[styles.glassBox, { marginTop: 15 }]}>
                            <LinearGradient colors={['#F59E0B10', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                            <View style={styles.infoRow}>
                                <View style={styles.labelWrap}>
                                    <Feather name="calendar" size={12} color="#6366F1" />
                                    <Text style={styles.infoLabel}>LAST REDEEM:</Text>
                                </View>
                                <Text style={styles.infoValue}>{expert?.lastWithdrawalAt ? formatTs(expert.lastWithdrawalAt) : 'NEVER'}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.infoRow}>
                                <View style={styles.labelWrap}>
                                    <Feather name="check-circle" size={12} color="#10B981" />
                                    <Text style={styles.infoLabel}>SUCCESSFUL:</Text>
                                </View>
                                <Text style={[styles.infoValue, { color: '#10B981' }]}>{redeemSuccessCount}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.infoRow}>
                                <View style={styles.labelWrap}>
                                    <Feather name="x-circle" size={12} color="#EF4444" />
                                    <Text style={styles.infoLabel}>DECLINED:</Text>
                                </View>
                                <Text style={[styles.infoValue, { color: '#EF4444' }]}>{redeemDeclinedCount}</Text>
                            </View>
                            <View style={styles.divider} />
                            <View style={styles.infoRow}>
                                <View style={styles.labelWrap}>
                                    <Feather name="loader" size={12} color="#F59E0B" />
                                    <Text style={styles.infoLabel}>IN PROCESS:</Text>
                                </View>
                                <Text style={[styles.infoValue, { color: '#F59E0B' }]}>{redeemPendingCount}</Text>
                            </View>

                            {recentRedeemEvents.length > 0 && (
                                <>
                                    <View style={styles.divider} />
                                    <Text style={[styles.infoLabel, { marginBottom: 12 }]}>RECENT ACTIVITY:</Text>
                                    {recentRedeemEvents.map((ev: any, i: number) => (
                                        <View key={i} style={[styles.redeemEventRow, i === recentRedeemEvents.length - 1 && { marginBottom: 0 }]}>
                                            <View style={[styles.redeemEventDot, { backgroundColor: redeemKindColor(ev.kind) }]} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.infoValue}>₹{ev.amount}</Text>
                                                <Text style={styles.redeemEventTime}>{formatTs(ev.createdAt)}</Text>
                                            </View>
                                            <View style={[styles.redeemEventBadge, { borderColor: redeemKindColor(ev.kind) }]}>
                                                <Text style={[styles.redeemEventBadgeText, { color: redeemKindColor(ev.kind) }]}>{redeemKindLabel(ev.kind)}</Text>
                                            </View>
                                        </View>
                                    ))}
                                </>
                            )}
                        </View>
                    </Reveal>
                )}

                {/* HOST CREDENTIALS */}
                <Reveal index={2} style={styles.section}>
                    <SectionHead icon={<Feather name="shield" size={14} color="#6366F1" />} title="HOST CREDENTIALS" />
                    <View style={styles.glassBox}>
                        <LinearGradient colors={['#6366F114', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                        <View style={styles.infoRow}>
                            <View style={styles.labelWrap}>
                                <Feather name="user" size={12} color="#6366F1" />
                                <Text style={styles.infoLabel}>NAME:</Text>
                            </View>
                            <Text style={styles.infoValue}>{expert?.name || 'ARUVI MULTIVERSE'}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <View style={styles.labelWrap}>
                                <Ionicons name="male-female" size={12} color="#6366F1" />
                                <Text style={styles.infoLabel}>GENDER:</Text>
                            </View>
                            <Text style={styles.infoValue}>{expert?.gender || 'Female'}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <View style={styles.labelWrap}>
                                <Feather name="clock" size={12} color="#6366F1" />
                                <Text style={styles.infoLabel}>BASE RATE:</Text>
                            </View>
                            <View style={styles.valRow}>
                                {/* 🔥 SATTI UPDATE: REPLACED LEAF WITH MEDAL 🎖️ */}
                                <Text style={{ fontSize: 14, marginRight: 4 }}>🎖️</Text>
                                <Text style={styles.infoValue}>{expert?.pricePerMin || 1000} /min</Text>
                            </View>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <View style={styles.labelWrap}>
                                <Feather name="map-pin" size={12} color="#6366F1" />
                                <Text style={styles.infoLabel}>LOCATION:</Text>
                            </View>
                            <Text style={styles.infoValue}>{expert?.location || 'Chennai'}</Text>
                        </View>
                    </View>
                </Reveal>

                {/* 🔥 SATTI UPDATE: PLAY STORE VERIFICATION MEDIA 🔥 */}
                <Reveal index={3} style={styles.section}>
                    <SectionHead icon={<MaterialCommunityIcons name="shield-check" size={14} color="#6366F1" />} title="PLAY STORE VERIFICATION MEDIA" />
                    <View style={styles.mediaRow}>
                        <View style={styles.mediaCard}>
                            <LinearGradient colors={['#6366F118', 'transparent']} style={StyleSheet.absoluteFill} />
                            <Text style={styles.infoLabel}>LIVE SELFIE:</Text>
                            {expert?.liveSelfie ? (
                                <TouchableOpacity onPress={() => handleOpenMedia(expert.liveSelfie)} activeOpacity={0.8}>
                                    <View style={styles.thumbFrame}>
                                        <Image source={{ uri: expert.liveSelfie }} style={styles.mediaThumb} />
                                        <View style={styles.thumbBadge}>
                                            <Feather name="maximize-2" size={12} color="#fff" />
                                        </View>
                                    </View>
                                    <Text style={{color: '#6366F1', fontSize: 10, marginTop: 8, fontWeight: '900', textAlign: 'center'}}>TAP TO VIEW</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.missingBox}>
                                    <Feather name="alert-triangle" size={18} color="#EF4444" />
                                    <Text style={[styles.infoValue, { color: '#EF4444', marginTop: 8, fontSize: 11 }]}>NOT PROVIDED</Text>
                                </View>
                            )}
                        </View>
                        <View style={styles.mediaCard}>
                            <LinearGradient colors={['#8B5CF618', 'transparent']} style={StyleSheet.absoluteFill} />
                            <Text style={styles.infoLabel}>5S INTRO VIDEO:</Text>
                            {expert?.introVideo ? (
                                <TouchableOpacity onPress={() => handleOpenMedia(expert.introVideo)} activeOpacity={0.8}>
                                    <View style={[styles.thumbFrame, styles.mediaThumb, { justifyContent: 'center', alignItems: 'center' }]}>
                                        <Animated.View style={[styles.playHalo, { opacity: dotHalo, transform: [{ scale: dotScale }] }]} />
                                        <Ionicons name="play-circle" size={42} color="#6366F1" />
                                    </View>
                                    <Text style={{color: '#6366F1', fontSize: 10, marginTop: 8, fontWeight: '900', textAlign: 'center'}}>TAP TO PLAY</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.missingBox}>
                                    <Feather name="alert-triangle" size={18} color="#EF4444" />
                                    <Text style={[styles.infoValue, { color: '#EF4444', marginTop: 8, fontSize: 11 }]}>NOT PROVIDED</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </Reveal>

                {/* FINANCIAL & ID CONFIGURATION */}
                <Reveal index={4} style={styles.section}>
                    <SectionHead icon={<FontAwesome5 name="university" size={12} color="#6366F1" />} title="FINANCIAL & ID CONFIGURATION" />
                    <View style={styles.glassBox}>
                        <LinearGradient colors={['#10B98110', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                        <View style={styles.infoRow}>
                            <View style={styles.labelWrap}>
                                <Feather name="user-check" size={12} color="#6366F1" />
                                <Text style={styles.infoLabel}>HOLDER NAME:</Text>
                            </View>
                            <Text style={styles.infoValue}>{expert?.bankDetails?.holderName || 'N/A'}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <View style={styles.labelWrap}>
                                <Feather name="credit-card" size={12} color="#6366F1" />
                                <Text style={styles.infoLabel}>ACCOUNT NO:</Text>
                            </View>
                            <Text style={styles.infoValue}>{expert?.bankDetails?.accountNumber || 'N/A'}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <View style={styles.labelWrap}>
                                <Feather name="hash" size={12} color="#6366F1" />
                                <Text style={styles.infoLabel}>IFSC CODE:</Text>
                            </View>
                            <Text style={styles.infoValue}>{expert?.bankDetails?.ifsc || 'N/A'}</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.infoRow}>
                            <View style={styles.labelWrap}>
                                <Feather name="file-text" size={12} color="#6366F1" />
                                <Text style={styles.infoLabel}>KYC DOCUMENT:</Text>
                            </View>
                            {expert?.idProof ? (
                                <TouchableOpacity onPress={openIdProof} activeOpacity={0.8}>
                                    <View style={styles.thumbFrame}>
                                        <Image source={{ uri: expert.idProof }} style={styles.idThumb} />
                                        <View style={styles.thumbBadge}>
                                            <Feather name="external-link" size={12} color="#fff" />
                                        </View>
                                    </View>
                                    <Text style={{color: '#6366F1', fontSize: 10, marginTop: 5, fontWeight: '900'}}>TAP TO VIEW</Text>
                                </TouchableOpacity>
                            ) : (
                                <Text style={[styles.infoValue, { color: '#EF4444' }]}>NOT UPLOADED</Text>
                            )}
                        </View>
                    </View>
                </Reveal>

            </ScrollView>

            {/* ACTION FOOTER */}
            <Animated.View
                style={[
                    styles.footerContainer,
                    {
                        opacity: footerIn,
                        transform: [{ translateY: footerIn.interpolate({ inputRange: [0, 1], outputRange: [80, 0] }) }],
                    },
                ]}
            >
                <BlurView intensity={80} tint="dark" style={styles.footerBlur}>
                    {isPending ? (
                        <>
                            <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleVerification('REJECT')} disabled={processing}>
                                <Feather name="x-circle" size={18} color="#EF4444" />
                                <Text style={styles.rejectBtnText}>DECLINE</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => handleVerification('APPROVE')} disabled={processing}>
                                <LinearGradient colors={['#818CF8', '#6366F1', '#4F46E5']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFill, { borderRadius: 20 }]} />
                                {processing ? <ActivityIndicator color="#fff" /> : (
                                    <>
                                        <Feather name="check-circle" size={18} color="#fff" />
                                        <Text style={styles.approveBtnText}>AUTHORIZE</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity 
                            style={[styles.actionBtn, isBlocked ? styles.unblockBtn : styles.blockBtn]} 
                            onPress={toggleBlockStatus}
                            disabled={processing}
                        >
                            <Feather name={isBlocked ? "unlock" : "slash"} size={18} color="#fff" />
                            <Text style={styles.approveBtnText}>{isBlocked ? 'RESTORE ACCESS' : 'RESTRICT HOST'}</Text>
                        </TouchableOpacity>
                    )}
                </BlurView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    center: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },

    /* background orbs */
    orb: { position: 'absolute', borderRadius: 999 },
    orbA: { width: 280, height: 280, top: -60, right: -90, backgroundColor: 'rgba(99,102,241,0.18)' },
    orbB: { width: 240, height: 240, top: 420, left: -110, backgroundColor: 'rgba(139,92,246,0.14)' },
    orbC: { width: 200, height: 200, bottom: 120, right: -80, backgroundColor: 'rgba(16,185,129,0.09)' },

    header: { paddingTop: 60, paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    backBtn: { width: 45, height: 45, borderRadius: 14, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden', shadowColor: '#6366F1', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
    headerText: { marginLeft: 15, flex: 1 },
    headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },
    headerSub: { color: '#64748B', fontSize: 9, fontWeight: '800' },
    sysChip: { flexDirection: 'row', alignItems: 'center', marginTop: 4, alignSelf: 'flex-start', backgroundColor: '#0F172A', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: '#1E293B' },
    sysChipDot: { width: 5, height: 5, borderRadius: 3, marginRight: 6 },
    headerBadge: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#6366F115', borderWidth: 1, borderColor: '#6366F144', alignItems: 'center', justifyContent: 'center' },

    scrollContent: { paddingHorizontal: 20, paddingBottom: 150 },

    /* hero */
    heroWrap: { marginBottom: 28 },
    heroGlow: { position: 'absolute', top: 25, left: 20, right: 20, bottom: -10, borderRadius: 40 },
    profileCard: { height: 380, borderRadius: 35, overflow: 'hidden', borderWidth: 1.5, borderColor: '#1E293B', backgroundColor: '#0F172A', shadowColor: '#000', shadowOpacity: 0.6, shadowRadius: 25, shadowOffset: { width: 0, height: 18 }, elevation: 18 },
    imageContainer: { flex: 1 },
    selfie: { width: '100%', height: '100%' },
    placeholderImage: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    imageOverlay: { ...StyleSheet.absoluteFillObject },
    scanLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
    shine: { position: 'absolute', top: -60, bottom: -60, width: 90 },
    corner: { position: 'absolute', width: 22, height: 22 },
    cornerTL: { top: 18, left: 18, borderTopWidth: 2.5, borderLeftWidth: 2.5, borderTopLeftRadius: 8 },
    cornerTR: { top: 18, right: 18, borderTopWidth: 2.5, borderRightWidth: 2.5, borderTopRightRadius: 8 },
    topChip: { position: 'absolute', top: 24, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(2,6,23,0.65)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1, borderColor: '#6366F155', gap: 6 },
    topChipText: { color: '#A5B4FC', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
    infoOverlay: { position: 'absolute', bottom: 25, left: 25 },
    name: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 8 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, marginTop: 10, borderWidth: 1, alignSelf: 'flex-start' },
    dotWrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
    dotHalo: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
    dot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },

    /* sections */
    section: { marginBottom: 25 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
    sectionIconChip: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#6366F11A', borderWidth: 1, borderColor: '#6366F144', alignItems: 'center', justifyContent: 'center' },
    sectionTitle: { color: '#6366F1', fontSize: 10, fontWeight: '900', marginLeft: 8, letterSpacing: 1.5 },
    sectionRule: { flex: 1, height: 1, marginLeft: 10 },

    glassBox: { backgroundColor: '#0F172A', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden', shadowColor: '#6366F1', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    labelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    valRow: { flexDirection: 'row', alignItems: 'center' },
    infoLabel: { color: '#475569', fontSize: 10, fontWeight: '900' },
    infoValue: { color: '#fff', fontSize: 13, fontWeight: '800' },
    divider: { height: 1, backgroundColor: '#1E293B', marginVertical: 15 },

    /* stats */
    statsRow: { flexDirection: 'row', gap: 15 },
    statBox: { flex: 1, backgroundColor: '#0F172A', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: '#1E293B', alignItems: 'center', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
    tierBox: { alignItems: 'center', borderColor: '#6366F144' },
    statLabel: { color: '#475569', fontSize: 9, fontWeight: '900', marginBottom: 8, letterSpacing: 1 },
    statLabel2: { color: '#475569', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    statValue: { color: '#fff', fontSize: 20, fontWeight: '900' },
    currencyRow: { flexDirection: 'row', alignItems: 'center' },

    /* 🆕 redeem history */
    redeemEventRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 12 },
    redeemEventDot: { width: 8, height: 8, borderRadius: 4 },
    redeemEventTime: { color: '#64748B', fontSize: 10, fontWeight: '700', marginTop: 2 },
    redeemEventBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
    redeemEventBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },

    /* media */
    mediaRow: { flexDirection: 'row', gap: 15 },
    mediaCard: { flex: 1, backgroundColor: '#0F172A', padding: 16, borderRadius: 24, borderWidth: 1, borderColor: '#1E293B', overflow: 'hidden', alignItems: 'center', gap: 10, shadowColor: '#6366F1', shadowOpacity: 0.12, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 5 },
    thumbFrame: { borderRadius: 14, borderWidth: 1, borderColor: '#6366F155', overflow: 'hidden' },
    mediaThumb: { width: 130, height: 90, borderRadius: 14, backgroundColor: '#1E293B' },
    thumbBadge: { position: 'absolute', bottom: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(2,6,23,0.75)', alignItems: 'center', justifyContent: 'center' },
    playHalo: { position: 'absolute', width: 46, height: 46, borderRadius: 23, backgroundColor: '#6366F1' },
    missingBox: { width: 130, height: 90, borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: '#EF444466', backgroundColor: '#EF444410', alignItems: 'center', justifyContent: 'center' },

    /* footer */
    footerContainer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    footerBlur: { paddingHorizontal: 20, paddingVertical: 35, flexDirection: 'row', gap: 15, borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden', borderTopWidth: 1, borderColor: '#6366F133' },
    actionBtn: { flex: 1, height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    rejectBtn: { backgroundColor: '#EF444415', borderWidth: 1, borderColor: '#EF4444' },
    rejectBtnText: { color: '#EF4444', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
    approveBtn: { backgroundColor: '#6366F1', shadowColor: '#6366F1', shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
    approveBtnText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1 },
    blockBtn: { backgroundColor: '#EF4444', shadowColor: '#EF4444', shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
    unblockBtn: { backgroundColor: '#10B981', shadowColor: '#10B981', shadowOpacity: 0.5, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
    idThumb: { width: 120, height: 70, borderRadius: 12, backgroundColor: '#1E293B' }
});