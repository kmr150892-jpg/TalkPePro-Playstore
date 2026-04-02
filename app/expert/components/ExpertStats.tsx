import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { auth, db } from '../../../firebaseConfig';

const { width } = Dimensions.get('window');

export default function ExpertStats({ expertData }: { expertData: any }) {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<any>(null);
    const [activeTab, setActiveTab] = useState(0); 

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(25)).current;

    const milestones = [
        { target: 100000, bonus: 5000, label: "Starter" },
        { target: 300000, bonus: 10000, label: "Pro" },
        { target: 500000, bonus: 15000, label: "Elite" }
    ];

    useEffect(() => {
        const expertId = auth.currentUser?.uid;
        if (!expertId) return;

        const unsub = onSnapshot(doc(db, "users", expertId), (snap) => {
            if (snap.exists()) {
                const d = snap.data();
                
                const totalBeans = Number(d.walletBalance) || 0; 
                const lastCallerName = d.lastCallFrom || "Waiting for Call...";
                const eliteFan = d.topCallerName || "No Fans Yet";
                const longestSecs = Number(d.longestCallDuration) || 0; 

                if (totalBeans >= 300000) setActiveTab(2);
                else if (totalBeans >= 100000) setActiveTab(1);
                else setActiveTab(0);

                setStats({
                    ...d,
                    totalBeans,
                    todayBeans: Number(d.todayBeans) || 0,
                    totalCalls: Number(d.totalCalls) || 0,
                    totalWithdrawn: Number(d.totalWithdrawnRs) || 0,
                    displayMins: Math.round(Number(d.totalMinutes) || 0).toString(),
                    todayMins: Math.round(Number(d.todayMinutes) || 0).toString(),
                    longestCallDisplay: (longestSecs / 60).toFixed(0), 
                    topFanName: eliteFan,
                    lastCaller: lastCallerName,
                    statusLabel: d.isVerified === true ? "VERIFIED PRO" : "PENDING VERIFICATION",
                    statusColor: d.isVerified === true ? "#10B981" : "#F59E0B",
                });
                
                setLoading(false);
                Animated.parallel([
                    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
                    Animated.spring(slideAnim, { toValue: 0, friction: 6, useNativeDriver: true })
                ]).start();
            }
        });

        return () => unsub();
    }, []);

    if (loading) return (
        <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
            <Text style={styles.loaderText}>SYNCING LIVE DATA...</Text>
        </View>
    );

    const currentMilestone = milestones[activeTab];
    const progress = Math.min(stats?.todayBeans / currentMilestone.target, 1);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                
                <LinearGradient colors={['#1E1B4B', '#0F172A']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.heroCard}>
                    <View style={styles.heroRow}>
                        <View>
                            <Text style={styles.labelSmall}>TOTAL EARNINGS</Text>
                            <View style={styles.beansRow}>
                                <Text style={styles.revenueText}>{stats?.totalBeans?.toLocaleString()}</Text>
                                <Text style={styles.beansUnit}>BEANS</Text>
                            </View>
                        </View>
                        <View style={styles.liveBadge}>
                            <View style={styles.pulseDot} />
                            <Text style={styles.badgeText}>LIVE</Text>
                        </View>
                    </View>
                    <View style={styles.heroFooter}>
                        <View style={styles.miniStat}>
                            <Text style={styles.miniLabel}>ACCOUNT STATUS</Text>
                            <View style={styles.statusRow}>
                                 <View style={[styles.statusDot, { backgroundColor: stats?.statusColor }]} />
                                 <Text style={[styles.miniValue, { color: stats?.statusColor }]}>{stats?.statusLabel}</Text>
                            </View>
                        </View>
                        <View style={[styles.miniStat, { alignItems: 'flex-end' }]}>
                            <Text style={styles.miniLabel}>LAST CALLER</Text>
                            <Text style={styles.miniValue} numberOfLines={1}>{stats?.lastCaller}</Text>
                        </View>
                    </View>
                </LinearGradient>

                <Text style={styles.sectionTitle}>Performance Overview</Text>
                <View style={styles.grid}>
                    <View style={styles.gridRow}>
                        <StatBox icon="today" label="Today (Min)" value={stats?.todayMins} color="#10B981" />
                        <StatBox icon="call" label="Total Calls" value={stats?.totalCalls} color="#3B82F6" />
                    </View>
                    <View style={styles.gridRow}>
                        <StatBox icon="time" label="Total Talk (Min)" value={stats?.displayMins} color="#F59E0B" />
                        <StatBox type="feather" icon="arrow-up-right" label="Withdrawn" value={`₹${stats?.totalWithdrawn}`} color="#EF4444" />
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Today's Progress</Text>
                <View style={styles.todayBeansHighlight}>
                    <LinearGradient colors={['#0F172A', '#1E293B']} style={styles.todayGradient}>
                        <View style={styles.todayLeft}>
                            <MaterialCommunityIcons name="flash-outline" size={32} color="#F59E0B" />
                            <Text style={styles.todayLabel}>Today's Earnings</Text>
                        </View>
                        <View style={styles.todayRight}>
                            <Text style={styles.todayValue}>{stats?.todayBeans?.toLocaleString()}</Text>
                            <Text style={styles.todayUnit}>BEANS</Text>
                        </View>
                    </LinearGradient>
                </View>

                <Text style={styles.sectionTitle}>Daily Bean Bonus</Text>
                <View style={styles.goalContainer}>
                    <View style={styles.tabBar}>
                        {milestones.map((m, index) => (
                            <TouchableOpacity 
                                key={index} 
                                style={[styles.tab, activeTab === index && styles.activeTab]}
                                onPress={() => setActiveTab(index)}
                            >
                                <Text style={[styles.tabText, activeTab === index && styles.activeTabText]}>
                                    {m.target >= 100000 ? `${m.target/100000}L` : m.target}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.goalHeader}>
                        <View>
                            <Text style={styles.goalTitle}>{currentMilestone.bonus.toLocaleString()} Bonus Beans</Text>
                            <Text style={styles.goalSub}>{currentMilestone.label} Milestone Target</Text>
                        </View>
                        <FontAwesome5 name="fire" size={24} color={progress === 1 ? "#10B981" : "#F59E0B"} />
                    </View>

                    <View style={styles.progressBackground}>
                        <LinearGradient
                            colors={progress === 1 ? ['#10B981', '#059669'] : ['#F59E0B', '#EF4444']}
                            start={{x:0, y:0}} end={{x:1, y:0}}
                            style={[styles.progressFill, { width: `${progress * 100}%` }]}
                        />
                    </View>

                    <View style={styles.goalFooter}>
                        <Text style={styles.progressText}>{Math.round(progress * 100)}% Completed</Text>
                        <Text style={styles.remainingText}>
                            {stats?.todayBeans >= currentMilestone.target ? 'Target Reached! 🏆' : `${(currentMilestone.target - stats?.todayBeans).toLocaleString()} Beans to go`}
                        </Text>
                    </View>
                </View>

                <Text style={styles.sectionTitle}>Elite Caller Insights</Text>
                <View style={styles.insightCard}>
                    <LinearGradient colors={['#1E1B4B', '#312E81']} style={styles.insightGradient}>
                        <View style={styles.iconCircleElite}>
                            <MaterialCommunityIcons name="crown" size={24} color="#FFD700" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.insightTitle}>Top Fan: {stats?.topFanName}</Text>
                            <Text style={styles.insightText}>
                                Your longest session lasted <Text style={{color: '#FFF', fontWeight: '900'}}>{stats?.longestCallDisplay} minutes</Text>.
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                <View style={{ height: 120 }} />
            </Animated.View>
        </ScrollView>
    );
}

const StatBox = ({ icon, label, value, color, type }: any) => (
    <View style={styles.gridBox}>
        <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
            {type === 'feather' ? <Feather name={icon} size={20} color={color} /> : <Ionicons name={icon} size={20} color={color} />}
        </View>
        <View>
            <Text style={styles.gridValue}>{value}</Text>
            <Text style={styles.gridLabel}>{label}</Text>
        </View>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#020617' },
    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    loaderText: { color: '#6366F1', marginTop: 15, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    sectionTitle: { color: '#475569', fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginBottom: 18, marginTop: 35, textTransform: 'uppercase' },
    heroCard: { borderRadius: 32, padding: 28, borderWidth: 1, borderColor: '#FFFFFF08' },
    heroRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    labelSmall: { color: '#818CF8', fontSize: 11, fontWeight: '900' },
    beansRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 5 },
    revenueText: { color: '#FFF', fontSize: 42, fontWeight: '900' },
    beansUnit: { color: '#6366F1', fontSize: 16, fontWeight: '800' },
    liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF10', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, gap: 6 },
    pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
    badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
    heroFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 30, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#FFFFFF08' },
    miniStat: { flex: 1 },
    miniLabel: { color: '#64748B', fontSize: 9, fontWeight: '800', marginBottom: 5 },
    statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statusDot: { width: 8, height: 8, borderRadius: 4 },
    miniValue: { color: '#FFF', fontSize: 13, fontWeight: '900' },
    grid: { gap: 15 },
    gridRow: { flexDirection: 'row', gap: 15 },
    gridBox: { flex: 1, backgroundColor: '#0F172A', padding: 22, borderRadius: 28, borderWidth: 1, borderColor: '#1E293B' },
    iconCircle: { width: 44, height: 44, borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
    gridValue: { color: '#FFF', fontSize: 22, fontWeight: '900' },
    gridLabel: { color: '#64748B', fontSize: 11, fontWeight: '700' },
    todayBeansHighlight: { borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)', marginBottom: 5 },
    todayGradient: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 22 },
    todayLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    todayLabel: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    todayRight: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
    todayValue: { color: '#F59E0B', fontSize: 26, fontWeight: '900' },
    todayUnit: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
    goalContainer: { backgroundColor: '#0F172A', borderRadius: 32, padding: 20, borderWidth: 1, borderColor: '#1E293B' },
    tabBar: { flexDirection: 'row', backgroundColor: '#020617', borderRadius: 20, padding: 5, marginBottom: 20 },
    tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 15 },
    activeTab: { backgroundColor: '#1E1B4B', borderWidth: 1, borderColor: '#312E81' },
    tabText: { color: '#64748B', fontSize: 12, fontWeight: '900' },
    activeTabText: { color: '#818CF8' },
    goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    goalTitle: { color: '#FFF', fontSize: 18, fontWeight: '800' },
    goalSub: { color: '#64748B', fontSize: 12 },
    progressBackground: { height: 12, backgroundColor: '#020617', borderRadius: 6, overflow: 'hidden', marginVertical: 10 },
    progressFill: { height: '100%', borderRadius: 6 },
    goalFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    progressText: { color: '#F59E0B', fontSize: 12, fontWeight: '700' },
    remainingText: { color: '#64748B', fontSize: 12, fontWeight: '600' },
    insightCard: { borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#312E81' },
    insightGradient: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
    iconCircleElite: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#FFFFFF10', justifyContent: 'center', alignItems: 'center' },
    insightTitle: { color: '#FFF', fontSize: 15, fontWeight: '800' },
    insightText: { color: '#A5B4FC', fontSize: 12, lineHeight: 18 },
});