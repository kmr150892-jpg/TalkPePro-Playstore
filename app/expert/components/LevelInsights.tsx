import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    DimensionValue,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../firebaseConfig';

const { width } = Dimensions.get('window');

// --- 🎯 THE MASTER LOGIC ENGINE ---
export const getLevelData = (totalBeans: number) => {
    let levelData;
    if (totalBeans >= 100000000) levelData = { lvl: 10, rate: 8000, label: 'LEGEND L10', next: 0, color: '#F59E0B' };
    else if (totalBeans >= 50000000) levelData = { lvl: 9, rate: 7000, label: 'MYTHIC L9', next: 100000000, color: '#EC4899' };
    else if (totalBeans >= 30000000) levelData = { lvl: 8, rate: 5400, label: 'ELITE L8', next: 50000000, color: '#8B5CF6' };
    else if (totalBeans >= 10000000) levelData = { lvl: 7, rate: 4800, label: 'MASTER L7', next: 30000000, color: '#3B82F6' };
    else if (totalBeans >= 5000000)  levelData = { lvl: 6, rate: 4200, label: 'DIAMOND L6', next: 10000000, color: '#06B6D4' };
    else if (totalBeans >= 3000000)  levelData = { lvl: 5, rate: 3600, label: 'PLATINUM L5', next: 5000000, color: '#10B981' };
    else if (totalBeans >= 1000000)  levelData = { lvl: 4, rate: 3000, label: 'GOLD L4', next: 3000000, color: '#EAB308' };
    else if (totalBeans >= 300000)   levelData = { lvl: 3, rate: 2400, label: 'SILVER L3', next: 1000000, color: '#94A3B8' };
    else if (totalBeans >= 100000)    levelData = { lvl: 2, rate: 1800, label: 'BRONZE L2', next: 300000, color: '#B45309' };
    else if (totalBeans >= 30000)     levelData = { lvl: 1, rate: 1200, label: 'ROOKIE L1', next: 100000, color: '#6366F1' };
    else levelData = { lvl: 0, rate: 1000, label: 'BEGINNER L0', next: 30000, color: '#475569' };

    return { ...levelData, minRate: 300, maxRate: levelData.rate };
};

export const ALL_LEVELS = [
    { lvl: 0, label: 'BEGINNER L0', goal: 0, rate: 1000 },
    { lvl: 1, label: 'ROOKIE L1', goal: 30000, rate: 1200 },
    { lvl: 2, label: 'BRONZE L2', goal: 100000, rate: 1800 },
    { lvl: 3, label: 'SILVER L3', goal: 300000, rate: 2400 },
    { lvl: 4, label: 'GOLD L4', goal: 1000000, rate: 3000 },
    { lvl: 5, label: 'PLATINUM L5', goal: 3000000, rate: 3600 },
    { lvl: 6, label: 'DIAMOND L6', goal: 5000000, rate: 4200 },
    { lvl: 7, label: 'MASTER L7', goal: 10000000, rate: 4800 },
    { lvl: 8, label: 'ELITE L8', goal: 30000000, rate: 5400 },
    { lvl: 9, label: 'MYTHIC L9', goal: 50000000, rate: 7000 },
    { lvl: 10, label: 'LEGEND L10', goal: 100000000, rate: 8000 },
];

export default function LevelInsights({ expertData }: any) {
    const [showModal, setShowModal] = useState(false);
    
    const totalBeans = expertData?.totalBeans || expertData?.totalBeansEarned || 0; 
    const currentLevelInfo = getLevelData(totalBeans);
    
    const scaleAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

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

    return (
        <View style={styles.mainContainer}>
            <StatusBar barStyle="light-content" />
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <LinearGradient colors={['#1e1b4b', '#020617']} style={styles.heroCard}>
                    <View style={styles.heroTop}>
                        <View>
                            <Text style={[styles.badgeText, { color: currentLevelInfo.color }]}>CURRENT STATUS</Text>
                            <Text style={styles.heroTitle}>{currentLevelInfo.label}</Text>
                        </View>
                        <View style={[styles.iconHexagon, { borderColor: currentLevelInfo.color }]}>
                            <MaterialCommunityIcons name={currentLevelInfo.lvl >= 7 ? "crown" : "shield-star"} size={40} color={currentLevelInfo.color} />
                        </View>
                    </View>
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Total Beans</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                <MaterialCommunityIcons name="seed-outline" size={16} color="#F59E0B" style={{ marginRight: 4 }} />
                                <Text style={styles.statValue}>{totalBeans.toLocaleString()}</Text>
                            </View>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statLabel}>Max Rate Cap</Text>
                            <Text style={styles.statValue}>{currentLevelInfo.rate} B/m</Text>
                        </View>
                    </View>
                    <View style={styles.progressSection}>
                        <View style={styles.progressHeader}><Text style={styles.progressTitle}>Next Level Progress</Text><Text style={styles.progressPercent}>{progressPercent.toFixed(0)}%</Text></View>
                        <View style={styles.progressTrack}><LinearGradient colors={[currentLevelInfo.color, '#FFFFFF']} start={{x:0, y:0}} end={{x:1, y:0}} style={[styles.progressFill, { width: `${progressPercent}%` as DimensionValue }]} /></View>
                        {remainingBeans > 0 && <Text style={styles.remainingText}>Need <Text style={{color: '#FFF'}}>{remainingBeans.toLocaleString()}</Text> more beans for {ALL_LEVELS[currentLvlIdx + 1]?.label}</Text>}
                    </View>
                </LinearGradient>

                <Text style={styles.sectionTitle}>TalkPe Roadmap</Text>
                <View style={styles.roadmapContainer}>
                    {ALL_LEVELS.map((item, index) => {
                        const isCompleted = totalBeans >= (ALL_LEVELS[index + 1]?.goal || 999999999);
                        const isCurrent = currentLevelInfo.lvl === item.lvl;
                        const isLocked = totalBeans < item.goal && !isCurrent;
                        return (
                            <View key={item.lvl} style={styles.roadmapItem}>
                                {index !== ALL_LEVELS.length - 1 && <View style={[styles.timelineConnector, totalBeans >= ALL_LEVELS[index+1]?.goal && { backgroundColor: '#4F46E5' }]} />}
                                <View style={[styles.roadmapDot, isCurrent && { backgroundColor: currentLevelInfo.color, transform: [{scale: 1.3}], borderWidth: 3, borderColor: '#FFF' }, isCompleted && { backgroundColor: '#10B981' }]}>{isCompleted ? <MaterialCommunityIcons name="check" size={10} color="#FFF" /> : null}</View>
                                <View style={[styles.roadmapCard, isCurrent && { backgroundColor: '#1e293b', borderColor: currentLevelInfo.color, borderWidth: 1 }]}>
                                    <View style={{ flex: 1 }}><Text style={[styles.roadmapLabel, isLocked && { color: '#475569' }]}>{item.label}</Text><Text style={styles.roadmapGoal}>{item.goal.toLocaleString()} Beans</Text></View>
                                    <View style={{ alignItems: 'flex-end' }}><Text style={[styles.roadmapRate, isLocked && { color: '#475569' }]}>{item.rate}</Text><Text style={styles.roadmapUnit}>Max B/min</Text></View>
                                </View>
                            </View>
                        );
                    })}
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>

            <Modal visible={showModal} transparent animationType="none">
                <View style={styles.modalOverlay}>
                    <Animated.View style={[styles.modalContent, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                        <LinearGradient colors={['#1e1b4b', '#020617']} style={styles.modalGradient}>
                            <MaterialCommunityIcons name="party-popper" size={60} color="#F59E0B" />
                            <Text style={styles.congratsText}>LEVEL UP!</Text>
                            <View style={[styles.modalBadge, { borderColor: currentLevelInfo.color }]}><MaterialCommunityIcons name="crown" size={70} color={currentLevelInfo.color} /><Text style={[styles.modalLevelName, { color: currentLevelInfo.color }]}>{currentLevelInfo.label}</Text></View>
                            <TouchableOpacity style={[styles.claimButton, { backgroundColor: currentLevelInfo.color }]} onPress={closeLevelUp}><Text style={styles.claimButtonText}>MASSIVE!</Text></TouchableOpacity>
                        </LinearGradient>
                    </Animated.View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: { flex: 1, backgroundColor: '#020617' },
    container: { padding: 20 },
    heroCard: { borderRadius: 35, padding: 25, marginBottom: 30, borderWidth: 1, borderColor: '#ffffff10' },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    badgeText: { fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 4 },
    heroTitle: { color: '#FFF', fontSize: 28, fontWeight: '900' },
    iconHexagon: { width: 70, height: 70, borderRadius: 20, borderWidth: 2, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff05' },
    statsRow: { flexDirection: 'row', marginTop: 25, backgroundColor: '#ffffff08', borderRadius: 22, padding: 15 },
    statItem: { flex: 1, alignItems: 'center' },
    statDivider: { width: 1, backgroundColor: '#ffffff15', height: '100%' },
    statLabel: { color: '#94a3b8', fontSize: 10, fontWeight: '800' },
    statValue: { color: '#FFF', fontSize: 20, fontWeight: '900' },
    progressSection: { marginTop: 25 },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    progressTitle: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    progressPercent: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    progressTrack: { height: 10, backgroundColor: '#ffffff10', borderRadius: 10, overflow: 'hidden' },
    progressFill: { height: '100%', borderRadius: 10 },
    remainingText: { color: '#94a3b8', fontSize: 11, marginTop: 12, textAlign: 'center', fontWeight: '600' },
    sectionTitle: { color: '#64748b', fontSize: 12, fontWeight: '900', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 },
    roadmapContainer: { paddingLeft: 5 },
    roadmapItem: { flexDirection: 'row', marginBottom: 15, alignItems: 'center' },
    timelineConnector: { position: 'absolute', left: 7, top: 22, width: 2, height: 40, backgroundColor: '#1e293b' },
    roadmapDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#1e293b', zIndex: 2, justifyContent: 'center', alignItems: 'center' },
    roadmapCard: { flex: 1, marginLeft: 20, backgroundColor: '#0f172a', padding: 15, borderRadius: 20, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#ffffff05' },
    roadmapLabel: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    roadmapGoal: { color: '#64748b', fontSize: 10, marginTop: 2 },
    roadmapRate: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    roadmapUnit: { color: '#64748b', fontSize: 8, textAlign: 'right' },
    modalOverlay: { flex: 1, backgroundColor: '#000000f0', justifyContent: 'center', alignItems: 'center' },
    modalContent: { width: width * 0.8, borderRadius: 35, overflow: 'hidden' },
    modalGradient: { padding: 35, alignItems: 'center' },
    congratsText: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 10 },
    modalBadge: { width: 150, height: 150, borderRadius: 75, borderWidth: 3, justifyContent: 'center', alignItems: 'center', marginVertical: 25 },
    modalLevelName: { fontSize: 18, fontWeight: '900', marginTop: 10 },
    claimButton: { width: '100%', padding: 18, borderRadius: 18, alignItems: 'center' },
    claimButtonText: { color: '#FFF', fontSize: 16, fontWeight: '900' }
});