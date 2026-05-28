import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    DimensionValue,
    Easing,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../firebaseConfig';

const { width, height } = Dimensions.get('window');

// ✅ ACCURATE THEME & LEVEL CONFIG (LOCKED DEEP-GLOW COLORS & DUAL RATES)
export const getLevelData = (totalBeans: number) => {
    let levelData;
    if (totalBeans >= 100000000) levelData = { lvl: 10, rate: 8000, qmRate: 4400, label: 'LEGEND L10', next: 0, colors: ['#ff0404', '#F59E0B', '#df03ee'], glow: '#F59E0B' };
    else if (totalBeans >= 50000000) levelData = { lvl: 9, rate: 7000, qmRate: 4000, label: 'MYTHIC L9', next: 100000000, colors: ['#f40691', '#dbc0c0', '#0a0303'], glow: '#EC4899' };
    else if (totalBeans >= 30000000) levelData = { lvl: 8, rate: 5400, qmRate: 3600, label: 'ELITE L8', next: 50000000, colors: ['#660aee', '#d4cfdf', '#d40808'], glow: '#8B5CF6' };
    else if (totalBeans >= 10000000) levelData = { lvl: 7, rate: 4800, qmRate: 3200, label: 'MASTER L7', next: 30000000, colors: ['#0af635', '#ca0bf5', '#fd068a'], glow: '#3B82F6' };
    else if (totalBeans >= 5000000)  levelData = { lvl: 6, rate: 4200, qmRate: 2800, label: 'DIAMOND L6', next: 10000000, colors: ['#f70606', '#fdec05', '#fad906'], glow: '#06B6D4' };
    else if (totalBeans >= 3000000)  levelData = { lvl: 5, rate: 3600, qmRate: 2400, label: 'PLATINUM L5', next: 5000000, colors: ['#136a3e', '#10B981', '#f6085b'], glow: '#10B981' };
    else if (totalBeans >= 1000000)  levelData = { lvl: 4, rate: 3000, qmRate: 2000, label: 'GOLD L4', next: 3000000, colors: ['#ffd001', '#EAB308', '#1d00f9'], glow: '#EAB308' };
    else if (totalBeans >= 300000)   levelData = { lvl: 3, rate: 2400, qmRate: 1600, label: 'SILVER L3', next: 1000000, colors: ['#bababa', '#74706f', '#bc0e08'], glow: '#94A3B8' };
    else if (totalBeans >= 100000)    levelData = { lvl: 2, rate: 1800, qmRate: 1200, label: 'BRONZE L2', next: 300000, colors: ['#ff8604', '#f29d0a', '#1505fc'], glow: 'transparent' };
    else if (totalBeans >= 30000)     levelData = { lvl: 1, rate: 1200, qmRate: 1200, label: 'ROOKIE L1', next: 100000, colors: ['#03ffc8', '#13feea', '#f64a06'], glow: 'transparent' };
    else levelData = { lvl: 0, rate: 1000, qmRate: 1000, label: 'BEGINNER L0', next: 30000, colors: ['#f807cf', '#f607e2', '#2a06f5'], glow: 'transparent' };

    return { ...levelData, minRate: 300, maxRate: levelData.rate, color: levelData.colors[0], shadow: levelData.glow !== 'transparent' ? levelData.glow : levelData.colors[0] };
};

export const ALL_LEVELS = [
    { lvl: 0, label: 'BEGINNER L0', goal: 0, rate: 1000, qmRate: 1000, color: '#f807cf' },
    { lvl: 1, label: 'ROOKIE L1', goal: 30000, rate: 1200, qmRate: 1200, color: '#03ffc8' },
    { lvl: 2, label: 'BRONZE L2', goal: 100000, rate: 1800, qmRate: 1200, color: '#ff8604' },
    { lvl: 3, label: 'SILVER L3', goal: 300000, rate: 2400, qmRate: 1600, color: '#bababa' },
    { lvl: 4, label: 'GOLD L4', goal: 1000000, rate: 3000, qmRate: 2000, color: '#ffd001' },
    { lvl: 5, label: 'PLATINUM L5', goal: 3000000, rate: 3600, qmRate: 2400, color: '#136a3e' },
    { lvl: 6, label: 'DIAMOND L6', goal: 5000000, rate: 4200, qmRate: 2800, color: '#f70606' },
    { lvl: 7, label: 'MASTER L7', goal: 10000000, rate: 4800, qmRate: 3200, color: '#0af635' },
    { lvl: 8, label: 'ELITE L8', goal: 30000000, rate: 5400, qmRate: 3600, color: '#660aee' },
    { lvl: 9, label: 'MYTHIC L9', goal: 50000000, rate: 7000, qmRate: 4000, color: '#f40691' },
    { lvl: 10, label: 'LEGEND L10', goal: 100000000, rate: 8000, qmRate: 4400, color: '#ff0404' },
];

export default function LevelInsights({ expertData }: any) {
    const [showModal, setShowModal] = useState(false);
    
    const totalBeans = expertData?.totalBeansEarned || expertData?.totalBeans || 0; 
    const currentLevelInfo = getLevelData(totalBeans);

    // 🔥 DYNAMIC THEME ENGINE FOR BACKGROUND
    const theme = {
        primary: currentLevelInfo.colors[0],
        secondary: currentLevelInfo.colors[2],
        accent: currentLevelInfo.glow !== 'transparent' ? currentLevelInfo.glow : currentLevelInfo.colors[0],
        bgGradient: [
            currentLevelInfo.lvl >= 7 ? `${currentLevelInfo.colors[0]}40` : '#020617', 
            currentLevelInfo.lvl >= 3 ? `${currentLevelInfo.colors[1]}20` : '#0F172A', 
            '#020617'
        ] as const
    };
    
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const orbAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Linear shimmer for progress bar
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.linear }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        ).start();

        // Sinusoidal float for background orbs
        Animated.loop(
            Animated.timing(orbAnim, {
              toValue: 1,
              duration: 4000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true
            })
        ).start();
    }, []);

    useEffect(() => {
        const syncLevelToDB = async () => {
            if (expertData?.uid) {
                const dbLevel = expertData.currentLevel || 0;
                const newLevel = currentLevelInfo.lvl;

                if (newLevel !== dbLevel) {
                    try {
                        const userRef = doc(db, 'users', expertData.uid);
                        await updateDoc(userRef, {
                            currentLevel: newLevel,
                            levelTitle: currentLevelInfo.label,
                            pricePerMin: currentLevelInfo.rate,
                            beansPerMin: currentLevelInfo.rate 
                        });

                        if (newLevel > dbLevel) triggerLevelUp();
                    } catch (error: any) {
                        console.error("❌ Firestore ERROR:", error.message);
                    }
                }
            }
        };
        syncLevelToDB();
    }, [totalBeans, expertData?.uid, expertData?.currentLevel]);

    const triggerLevelUp = () => {
        setShowModal(true);
        Animated.parallel([
            Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true })
        ]).start();
    };

    const closeLevelUp = () => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
            setShowModal(false);
            scaleAnim.setValue(0);
        });
    };

    const currentLvlIdx = ALL_LEVELS.findIndex(l => l.lvl === currentLevelInfo.lvl);
    const currentGoal = ALL_LEVELS[currentLvlIdx]?.goal || 0;
    const nextGoal = currentLevelInfo.next;
    const progressPercent = nextGoal > 0 ? Math.min(((totalBeans - currentGoal) / (nextGoal - currentGoal)) * 100, 100) : 100;
    const remainingBeans = nextGoal > 0 ? nextGoal - totalBeans : 0;

    const shimmerTranslate = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-width, width]
    });

    const orbTranslateY = orbAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -30]
    });

    // 🔥 ALTERNATING BORDER STYLES WITH REDUCED THICKNESS (2px)
    const borderType1 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: theme.primary,
        borderRightColor: theme.primary,
        borderTopColor: theme.secondary + '80',
        borderBottomColor: theme.secondary + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    const borderType2 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: theme.secondary,
        borderRightColor: theme.secondary,
        borderTopColor: theme.primary + '80',
        borderBottomColor: theme.primary + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    return (
        <View style={[styles.mainContainer, { backgroundColor: '#020617' }]}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />
            
            {/* Shimmer Orbs for Animation */}
            <Animated.View style={[styles.shimmerOrb, { top: 80, right: -60, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 400, left: -90, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                
                {/* 🔥 MASS CYBER HERO SECTION DYNAMIC */}
                <View style={styles.heroWrapper}>
                    <LinearGradient 
                        colors={[theme.primary, theme.secondary, '#020617']} 
                        start={{x:0, y:0}} end={{x:1, y:1}} 
                        style={[styles.heroCard, borderType1, { shadowColor: theme.primary }]}
                    >
                        <View style={styles.heroGlow} />
                        <View style={styles.heroTop}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.badgeLabel, { color: theme.primary }]}>PREMIUM STATUS</Text>
                                <Text style={styles.heroTitle}>{currentLevelInfo.label}</Text>
                                <View style={styles.expertVerifiedRow}>
                                    <MaterialCommunityIcons name="check-decagram" size={14} color={theme.primary} />
                                    <Text style={[styles.expertType, { color: theme.primary }]}>OFFICIAL TALKPE EXPERT</Text>
                                </View>
                            </View>
                            {/* 🔥 Fluid Hexagon instead of sharp box */}
                            <View style={[styles.capsuleContainer, { borderColor: theme.primary }]}>
                                <LinearGradient colors={[theme.primary, '#000']} style={styles.capsuleInner}>
                                    <MaterialCommunityIcons name={currentLevelInfo.lvl >= 7 ? "crown" : "star-face"} size={40} color="#FFF" />
                                </LinearGradient>
                            </View>
                        </View>

                        <View style={styles.heroStatsContainer}>
                            <BlurView intensity={20} tint="light" style={styles.heroStatBox}>
                                <Text style={styles.hStatLabel}>TOTAL REWARD</Text>
                                <View style={styles.hValueRow}>
                                    <Text style={{ fontSize: 15 }}>🎖️</Text>
                                    <Text style={styles.hStatValue} numberOfLines={1} adjustsFontSizeToFit>{totalBeans.toLocaleString()}</Text>
                                </View>
                            </BlurView>
                            <BlurView intensity={20} tint="light" style={styles.heroStatBox}>
                                <Text style={styles.hStatLabel}>CALL FEE CAP (R/min)</Text>
                                <View style={styles.dualRateContainer}>
                                    <Text style={styles.heroRateText}>CALL: {currentLevelInfo.rate}</Text>
                                    <Text style={styles.heroRateText}>QUICK: {currentLevelInfo.qmRate}</Text>
                                </View>
                            </BlurView>
                        </View>

                        <View style={styles.massProgressSection}>
                            <View style={styles.progressHeader}>
                                <Text style={styles.progressTitle}>RANK SYNCING...</Text>
                                <Text style={[styles.progressPercent, {color: theme.primary}]}>{progressPercent.toFixed(0)}%</Text>
                            </View>
                            <View style={styles.megaTrack}>
                                <LinearGradient 
                                    colors={[theme.primary, '#FFF', theme.primary]} 
                                    start={{x:0, y:0}} end={{x:1, y:0}} 
                                    style={[styles.megaFill, { width: `${progressPercent}%` as DimensionValue }]} 
                                >
                                    <Animated.View style={[styles.shimmerLayer, { transform: [{ translateX: shimmerTranslate }] }]} />
                                </LinearGradient>
                            </View>
                            {remainingBeans > 0 && (
                                <View style={styles.remainingBadge}>
                                    <Text style={styles.remainingText}>
                                        NEED <Text style={{color: theme.primary, fontWeight: '900'}}>{remainingBeans.toLocaleString()}</Text> FOR {ALL_LEVELS[currentLvlIdx + 1]?.label}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </LinearGradient>
                </View>

                <Text style={[styles.sectionHeader, { color: theme.primary }]}>ELITE ROADMAP</Text>
                
                <View style={styles.roadmapBox}>
                    {ALL_LEVELS.map((item, index) => {
                        const isCompleted = totalBeans >= (ALL_LEVELS[index + 1]?.goal || 999999999);
                        const isCurrent = currentLevelInfo.lvl === item.lvl;
                        const isLocked = totalBeans < item.goal && !isCurrent;
                        
                        // 🔥 Alternate borders for roadmap items
                        const roadmapBorderStyle = index % 2 === 0 ? borderType2 : borderType1;
                        
                        return (
                            <View key={item.lvl} style={styles.roadmapRow}>
                                <View style={styles.timelineLeft}>
                                    <View style={[styles.verticalLine, isCompleted && {backgroundColor: '#10B981'}]} />
                                    <View style={[styles.markerDot, isCurrent && {backgroundColor: item.color, scaleX: 1.5, scaleY: 1.5, shadowColor: item.color, elevation: 10}, isCompleted && {backgroundColor: '#10B981'}]}>
                                        {isCompleted && <MaterialCommunityIcons name="check" size={10} color="#FFF" />}
                                        {isLocked && <MaterialCommunityIcons name="lock" size={8} color="#475569" />}
                                    </View>
                                </View>
                                
                                <TouchableOpacity activeOpacity={0.8} style={[styles.roadmapCard, roadmapBorderStyle, isCurrent && {borderColor: item.color, borderLeftWidth: 4, backgroundColor: 'rgba(255,255,255,0.05)'}, isLocked && {opacity: 0.5}]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.rmLabel, {color: isLocked ? '#475569' : '#FFF'}]}>{item.label}</Text>
                                        <Text style={styles.rmGoal}>{item.goal.toLocaleString()} XP Rewards</Text>
                                    </View>
                                    
                                    {/* 🔥 DUAL RATE DISPLAY FOR EACH LEVEL */}
                                    <View style={styles.rateColumn}>
                                        <View style={[styles.rmRateBox, {backgroundColor: isLocked ? '#1e293b' : item.color + '20', marginBottom: 2}]}>
                                            <Text style={[styles.rmRateText, {color: isLocked ? '#475569' : item.color}]}>CALL: {item.rate}</Text>
                                        </View>
                                        <View style={[styles.rmRateBox, {backgroundColor: isLocked ? '#1e293b' : item.color + '20'}]}>
                                            <Text style={[styles.rmRateText, {color: isLocked ? '#475569' : item.color}]}>QUICK: {item.qmRate}</Text>
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        );
                    })}
                </View>

                <View style={{ height: 120 }} />
            </ScrollView>

            {/* 🔥 MASS LEVEL UP MODAL DYNAMIC */}
            <Modal visible={showModal} transparent animationType="none">
                <BlurView intensity={95} tint="dark" style={styles.modalOverlay}>
                    <Animated.View style={[styles.modalContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                        <LinearGradient colors={[theme.primary, '#020617']} style={styles.modalGradient}>
                            <View style={styles.fireworkContainer}>
                                <MaterialCommunityIcons name="creation" size={40} color="#FBBF24" />
                            </View>
                            <Text style={styles.congratsLabel}>NEW RANK UNLOCKED</Text>
                            <Text style={styles.congratsTitle}>CONGRATULATIONS!</Text>
                            
                            <View style={[styles.modalRankCard, { borderColor: theme.primary }]}>
                                <MaterialCommunityIcons name="crown" size={80} color={theme.primary} />
                                <Text style={[styles.modalLevelName, { color: theme.primary }]}>{currentLevelInfo.label}</Text>
                                <View style={styles.newBenefitBox}>
                                    <Text style={styles.benefitText}>NEW CALL RATE: {currentLevelInfo.rate} REWARDS</Text>
                                    <Text style={styles.benefitText}>NEW QUICK RATE: {currentLevelInfo.qmRate} REWARDS</Text>
                                </View>
                            </View>

                            <TouchableOpacity style={[styles.claimBtn, { backgroundColor: theme.primary }]} onPress={closeLevelUp}>
                                <Text style={styles.claimBtnText}>MASSIVE!</Text>
                            </TouchableOpacity>
                        </LinearGradient>
                    </Animated.View>
                </BlurView>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1 },
    // 🔥 AMBIENT SHIMMER ORBS
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
    container: { padding: 15 },
    heroWrapper: { marginTop: 10, marginBottom: 30 },
    heroCard: { borderRadius: 40, padding: 25, overflow: 'hidden', elevation: 20, position: 'relative' },
    heroGlow: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.05)' },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badgeLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 3, marginBottom: 5 },
    heroTitle: { color: '#FFF', fontSize: 32, fontWeight: '900', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 10 },
    expertVerifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
    expertType: { fontSize: 10, fontWeight: '800' },
    // 🔥 ZERO BOX CAPSULE
    capsuleContainer: { width: 80, height: 80, borderRadius: 30, borderWidth: 2, padding: 4 },
    capsuleInner: { flex: 1, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    heroStatsContainer: { flexDirection: 'row', gap: 12, marginTop: 30 },
    heroStatBox: { flex: 1, padding: 15, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    hStatLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 9, fontWeight: '900', marginBottom: 5 },
    hValueRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'nowrap' }, 
    hStatValue: { color: '#FFF', fontSize: 18, fontWeight: '900', flex: 1 }, 
    dualRateContainer: { flexDirection: 'column', marginTop: 2, gap: 2 },
    heroRateText: { color: '#FFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
    massProgressSection: { marginTop: 35 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    progressTitle: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
    progressPercent: { fontSize: 18, fontWeight: '900' },
    megaTrack: { height: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    megaFill: { height: '100%', borderRadius: 10, position: 'relative' },
    shimmerLayer: { width: '50%', height: '100%', backgroundColor: 'rgba(255,255,255,0.2)', position: 'absolute' },
    remainingBadge: { backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 8, borderRadius: 15, marginTop: 15 },
    remainingText: { color: '#94a3b8', fontSize: 10, textAlign: 'center', fontWeight: '800', letterSpacing: 1 },
    sectionHeader: { fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 20, marginLeft: 10 },
    roadmapBox: { paddingHorizontal: 5 },
    roadmapRow: { flexDirection: 'row', height: 90, alignItems: 'center' },
    timelineLeft: { width: 30, alignItems: 'center', height: '100%' },
    verticalLine: { width: 2, flex: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
    markerDot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#1e293b', position: 'absolute', top: '40%', zIndex: 10, justifyContent: 'center', alignItems: 'center' },
    roadmapCard: { flex: 1, marginLeft: 15, height: 75, borderRadius: 25, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15 },
    rmLabel: { fontSize: 14, fontWeight: '900' },
    rmGoal: { color: '#64748b', fontSize: 10, fontWeight: '700', marginTop: 2 },
    rateColumn: { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center' },
    rmRateBox: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    rmRateText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: width * 0.85, borderRadius: 40, overflow: 'hidden' },
    modalGradient: { padding: 40, alignItems: 'center' },
    fireworkContainer: { marginBottom: 10 },
    congratsLabel: { color: '#FBBF24', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
    congratsTitle: { color: '#FFF', fontSize: 26, fontWeight: '900', marginTop: 5 },
    modalRankCard: { width: '100%', padding: 30, borderRadius: 30, borderWidth: 2, borderStyle: 'dashed', alignItems: 'center', marginVertical: 30 },
    modalLevelName: { fontSize: 22, fontWeight: '900', marginTop: 15, textAlign: 'center' },
    newBenefitBox: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15, marginTop: 15, alignItems: 'center', gap: 5 },
    benefitText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
    claimBtn: { width: '100%', padding: 20, borderRadius: 25, alignItems: 'center', elevation: 10 },
    claimBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 }
});