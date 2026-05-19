import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../../firebaseConfig';

const { width } = Dimensions.get('window');

const ExpertWalletDetail = () => {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [expert, setExpert] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        
        // 🔥 SYSTEM LIVE LISTENER: Allocation Metrics & Operational Analytics
        const docRef = doc(db, "users", id as string);
        const unsubExpert = onSnapshot(docRef, (snap) => {
            if (snap.exists()) {
                setExpert({ id: snap.id, ...snap.data() });
            }
            setLoading(false);
        }, (error) => {
            console.error("Firestore Sync Error:", error);
            setLoading(false);
        });

        return () => unsubExpert();
    }, [id]);

    if (loading) return (
        <View style={styles.center}>
            <ActivityIndicator size="large" color="#6366F1" />
        </View>
    );

    // 💡 Logic: Calculating Estimated Distribution (Standardized Unit Mapping)
    const estimatedACTIVITY_REWARD = (expert?.walletBalance || 0);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* 🚀 OPERATIONAL HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#6366F1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>FINANCIAL ANALYTICS</Text>
                <View style={styles.expertMiniProfile}>
                    <Text style={styles.avatarChar}>
                        {expert?.name ? expert.name[0].toUpperCase() : 'C'}
                    </Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
                
                {/* 💎 NEUMORPHIC BALANCE INTERFACE */}
                <View style={styles.cardContainer}>
                    <LinearGradient 
                        colors={['#6366F1', '#4338CA']} 
                        start={{x:0, y:0}} 
                        end={{x:1, y:1}} 
                        style={styles.balanceCard}
                    >
                        <View style={styles.cardTop}>
                            <View>
                                <Text style={styles.balanceLabel}>AVAILABLE ALLOCATIONS</Text>
                                <View style={styles.row}>
                                    <MaterialCommunityIcons name="seed" size={24} color="#A5B4FC" />
                                    <Text style={styles.balanceValue}> ₹{(expert?.walletBalance || 0).toLocaleString()}</Text>
                                </View>
                            </View>
                            <View style={styles.chip}>
                                <Text style={styles.chipText}>{expert?.status === 'Approved' ? 'VERIFIED' : 'ACTIVE'}</Text>
                            </View>
                        </View>

                        <View style={styles.rupeeEquivalent}>
                            <Text style={styles.eqLabel}>Estimated Distribution:</Text>
                            <Text style={styles.eqValue}>₹{estimatedACTIVITY_REWARD.toLocaleString()}</Text>
                        </View>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Lifetime Units</Text>
                                <Text style={styles.statValue}>{expert?.totalBeansEarned || 0}</Text>
                            </View>
                            <View style={styles.vDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statLabel}>Total Sessions</Text>
                                <Text style={styles.statValue}>{expert?.totalCallsHandled || 0}</Text>
                            </View>
                        </View>
                    </LinearGradient>
                </View>

                {/* 📊 SYSTEM INSIGHTS SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>CONSULTANT CONFIGURATION</Text>
                    
                    <View style={styles.infoBox}>
                        <View style={styles.infoRow}>
                            <View style={[styles.iconWrap, { backgroundColor: '#10B98120' }]}>
                                <Feather name="trending-up" size={16} color="#10B981" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>Platform Service Fee</Text>
                                <Text style={styles.infoValue}>Enterprise Standard (10%)</Text>
                            </View>
                        </View>

                        <View style={styles.infoRow}>
                            <View style={[styles.iconWrap, { backgroundColor: '#F59E0B20' }]}>
                                <Feather name="clock" size={16} color="#F59E0B" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.infoLabel}>Session Rate</Text>
                                <Text style={styles.infoValue}>{expert?.beansPerMin || 1000} Units / min</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* 🕒 SETTLEMENT QUEUE */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>RECENT DISTRIBUTIONS</Text>
                    <View style={styles.emptyBox}>
                        <BlurView intensity={5} style={styles.emptyBlur}>
                            <MaterialCommunityIcons name="history" size={40} color="#1E293B" />
                            <Text style={styles.emptyText}>No recent distribution logs</Text>
                        </BlurView>
                    </View>
                </View>

                {/* ⚡ ACTION INTERFACE */}
                <TouchableOpacity 
                    style={styles.ACTIVITY_REWARDBtn} 
                    onPress={() => router.push(`/(admin)/withdrawals?expertId=${id}` as any)}
                >
                    <LinearGradient 
                        colors={['#0F172A', '#1E293B']} 
                        style={styles.ACTIVITY_REWARDGradient}
                    >
                        <Text style={styles.ACTIVITY_REWARDBtnText}>AUDIT DISBURSEMENT REQUESTS</Text>
                        <Feather name="arrow-right" size={18} color="#6366F1" />
                    </LinearGradient>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    center: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
    header: { 
        paddingTop: 60, 
        paddingBottom: 20, 
        paddingHorizontal: 25, 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center' 
    },
    backBtn: { backgroundColor: '#0F172A', padding: 12, borderRadius: 18, borderWidth: 1, borderColor: '#1E293B' },
    headerTitle: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    expertMiniProfile: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155' },
    avatarChar: { color: '#818CF8', fontWeight: '900', fontSize: 18 },
    
    cardContainer: { paddingHorizontal: 20, marginTop: 10 },
    balanceCard: { 
        padding: 30, 
        borderRadius: 40, 
        elevation: 20, 
        shadowColor: '#6366F1', 
        shadowOpacity: 0.4, 
        shadowRadius: 20 
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    balanceLabel: { color: '#E0E7FF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    row: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    balanceValue: { color: '#fff', fontSize: 48, fontWeight: '900' },
    chip: { backgroundColor: '#FFFFFF30', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    chipText: { color: '#fff', fontSize: 10, fontWeight: '900' },
    
    rupeeEquivalent: { marginTop: 15, backgroundColor: '#00000020', padding: 15, borderRadius: 20 },
    eqLabel: { color: '#C7D2FE', fontSize: 12, fontWeight: '600' },
    eqValue: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 2 },

    statsRow: { 
        flexDirection: 'row', 
        marginTop: 25, 
        paddingTop: 25, 
        borderTopWidth: 1, 
        borderTopColor: '#ffffff20', 
        justifyContent: 'space-around' 
    },
    statItem: { alignItems: 'center' },
    statLabel: { color: '#E0E7FF', fontSize: 10, fontWeight: '700' },
    statValue: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 5 },
    vDivider: { width: 1, backgroundColor: '#ffffff20', height: '100%' },

    section: { paddingHorizontal: 25, marginTop: 35 },
    sectionTitle: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
    infoBox: { backgroundColor: '#0F172A', borderRadius: 30, padding: 20, borderWidth: 1, borderColor: '#1E293B' },
    infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
    iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 15 },
    infoLabel: { color: '#475569', fontSize: 11, fontWeight: '700' },
    infoValue: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 2 },
    
    emptyBox: { height: 160, borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: '#1E293B', borderStyle: 'dashed' },
    emptyBlur: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    emptyText: { color: '#1E293B', marginTop: 12, fontWeight: '900', fontSize: 12, letterSpacing: 1 },

    ACTIVITY_REWARDBtn: { margin: 25, height: 75, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: '#6366F130' },
    ACTIVITY_REWARDGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 15 },
    ACTIVITY_REWARDBtnText: { color: '#fff', fontWeight: '900', fontSize: 13, letterSpacing: 1.5 }
});

export default ExpertWalletDetail;