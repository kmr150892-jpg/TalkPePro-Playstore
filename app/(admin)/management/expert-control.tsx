import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../firebaseConfig';

const { width } = Dimensions.get('window');

interface ExpertData {
    id: string;
    name?: string;
    status?: string;
    isBlocked?: boolean;
    currentLevel?: number;
    beansPerMin?: number; 
    userPrice?: number;
    role?: string;
    uid?: string;
    photoURL?: string;
}

export default function ExpertControl() {
    const router = useRouter();
    const [experts, setExperts] = useState<ExpertData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        
        // Only fetch users who are authorized consultants
        const q = query(
            collection(db, "users"), 
            where("role", "==", "expert")
        ); 
        
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ExpertData));
            
            // Sorting: Active consultants first, Restricted profiles at the bottom
            const sortedList = list.sort((a, b) => {
                if (a.isBlocked === b.isBlocked) return 0;
                return a.isBlocked ? 1 : -1;
            });
            
            setExperts(sortedList);
            setLoading(false);
        }, (err) => {
            console.error("Hub Sync Error:", err);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const toggleBlockStatus = async (userId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus;
        Alert.alert(
            newStatus ? "RESTRICT PROFILE?" : "RESTORE ACCESS?",
            `Confirming credential modification for this consultant. Proceed?`,
            [
                { text: "CANCEL", style: "cancel" },
                { 
                    text: "CONFIRM", 
                    onPress: async () => {
                        try {
                            const userRef = doc(db, "users", userId);
                            // 🔥 SYSTEM LOGIC: forceLogout flag instantly synchronizes status across platform nodes 🔥
                            await updateDoc(userRef, {
                                isBlocked: newStatus,
                                status: newStatus ? "Blocked" : "Active",
                                forceLogout: newStatus ? true : false,
                                updatedAt: new Date().toISOString()
                            });
                        } catch (err) {
                            Alert.alert("SYSTEM ERROR", "Configuration failed. Verify database permissions.");
                        }
                    }
                }
            ]
        );
    };

    const renderExpert = ({ item }: { item: ExpertData }) => {
        const isBlocked = item.isBlocked || item.status === 'Blocked';

        return (
            <View style={[styles.card, isBlocked && styles.blockedCard]}>
                <View style={styles.cardHeader}>
                    <View style={styles.avatarWrapper}>
                        <Image source={{ uri: item.photoURL || 'https://via.placeholder.com/150' }} style={styles.avatarImage} />
                        <View style={[styles.statusDot, { backgroundColor: isBlocked ? '#EF4444' : '#10B981' }]} />
                    </View>

                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={styles.name}>{item.name || 'AUTHORIZED CONSULTANT'}</Text>
                        <Text style={styles.idText}>SYSTEM ID: {item.uid?.slice(0, 15).toUpperCase() || item.id.slice(0, 15).toUpperCase()}</Text>
                    </View>
                    
                    <View style={[styles.statusBadge, { backgroundColor: isBlocked ? '#EF444415' : '#10B98115' }]}>
                        <Text style={[styles.statusText, { color: isBlocked ? '#EF4444' : '#10B981' }]}>
                            {isBlocked ? 'RESTRICTED' : 'ACTIVE'}
                        </Text>
                    </View>
                </View>

                {/* PERFORMANCE METRICS GRID */}
                <View style={styles.metricsGrid}>
                    <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>TIER LEVEL</Text>
                        <Text style={styles.metricValue}>{item.currentLevel ?? 0}</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>REWARD /MIN</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                           <MaterialCommunityIcons name="leaf" size={12} color="#FBBF24" />
                           <Text style={styles.metricValue}>{item.beansPerMin || 0}</Text>
                        </View>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.metricItem}>
                        <Text style={styles.metricLabel}>CLIENT RATE</Text>
                        <View style={{flexDirection: 'row', alignItems: 'center', gap: 4}}>
                           <MaterialCommunityIcons name="diamond" size={12} color="#818CF8" />
                           <Text style={styles.metricValue}>{item.userPrice || 0}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity 
                        activeOpacity={0.7}
                        style={[styles.actionBtn, { borderColor: isBlocked ? '#10B981' : '#EF444420', backgroundColor: isBlocked ? 'transparent' : '#EF444408' }]} 
                        onPress={() => toggleBlockStatus(item.id, !!isBlocked)}
                    >
                        <Feather name={isBlocked ? "refresh-cw" : "user-x"} size={16} color={isBlocked ? '#10B981' : '#EF4444'} />
                        <Text style={[styles.btnText, { color: isBlocked ? '#10B981' : '#EF4444' }]}>
                            {isBlocked ? 'RESTORE' : 'RESTRICT'}
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                         activeOpacity={0.7}
                         style={[styles.actionBtn, styles.primaryBtn]}
                         onPress={() => router.push(`/(admin)/experts/verify-expert/${item.id}`)}
                    >
                        <MaterialCommunityIcons name="account-cog-outline" size={18} color="#fff" />
                        <Text style={[styles.btnText, { color: '#fff' }]}>MANAGE PROFILE</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0F172A']} style={StyleSheet.absoluteFill} />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="settings" size={24} color="#475569" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>CONSULTANT HUB</Text>
                    <Text style={styles.subtitle}>Administrative Terminal • TalkPe OS</Text>
                </View>
                <View style={styles.countBadge}>
                    <Text style={styles.countText}>{experts.length}</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.loaderArea}>
                    <ActivityIndicator size="large" color="#6366F1" />
                    <Text style={styles.loaderText}>SYNCHRONIZING...</Text>
                </View>
            ) : (
                <FlatList
                    data={experts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderExpert}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialCommunityIcons name="account-off-outline" size={60} color="#1E293B" />
                            <Text style={styles.emptyText}>NO AUTHORIZED PROFILES</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { paddingTop: 60, paddingHorizontal: 25, marginBottom: 25, flexDirection: 'row', alignItems: 'center', gap: 15 },
    backBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#1E293B60', alignItems: 'center', justifyContent: 'center' },
    title: { color: '#fff', fontSize: 28, fontWeight: '900', letterSpacing: 0.5 },
    subtitle: { color: '#475569', fontSize: 11, fontWeight: '700', marginTop: 2 },
    countBadge: { marginLeft: 'auto', backgroundColor: '#1E293B', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 15 },
    countText: { color: '#6366F1', fontWeight: '900', fontSize: 18 },
    loaderArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loaderText: { color: '#475569', fontSize: 10, fontWeight: '900', marginTop: 15, letterSpacing: 2 },
    list: { paddingHorizontal: 20, paddingBottom: 100 },
    card: { backgroundColor: '#111827', padding: 25, borderRadius: 35, marginBottom: 16, borderWidth: 1, borderColor: '#1E293B' },
    blockedCard: { opacity: 0.5 },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    avatarWrapper: { position: 'relative' },
    avatarImage: { width: 70, height: 70, borderRadius: 22, backgroundColor: '#1E293B' },
    statusDot: { position: 'absolute', bottom: 2, right: 2, width: 16, height: 16, borderRadius: 8, borderWidth: 3, borderColor: '#111827' },
    name: { color: '#fff', fontSize: 20, fontWeight: '900' },
    idText: { color: '#475569', fontSize: 10, marginTop: 4, fontWeight: '700' },
    statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'transparent' },
    statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    metricsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 20, padding: 18, backgroundColor: '#02061760', borderRadius: 25, borderWidth: 1, borderColor: '#1E293B40' },
    metricItem: { flex: 1, alignItems: 'center' },
    divider: { width: 1, height: '50%', backgroundColor: '#1E293B', alignSelf: 'center' },
    metricLabel: { color: '#475569', fontSize: 9, fontWeight: '900', marginBottom: 6 },
    metricValue: { color: '#fff', fontSize: 16, fontWeight: '900' },
    actions: { flexDirection: 'row', gap: 12 },
    actionBtn: { flex: 1, height: 55, borderRadius: 20, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    primaryBtn: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    btnText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    emptyContainer: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: '#1E293B', fontSize: 12, fontWeight: '900', marginTop: 15 }
});