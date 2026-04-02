import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../firebaseConfig';

export default function VerificationQueue() {
    const router = useRouter();
    const [applications, setApplications] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 🔥 OPTION B LOGIC: Pending applications mattum fetch pannum
        const q = query(
            collection(db, "users"), 
            where("isApplying", "==", true),
            where("status", "==", "Pending")
        ); 
        
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(d => {
                const data = d.data();
                return { 
                    id: d.id, 
                    ...data,
                    // Timestamp-ah numeric value-ah mathikrom sorting-kaga
                    sortTime: data.createdAt?.seconds || 0 
                };
            });

            // ✅ Error Fixed: sortTime vachi safety-ah sort pannuvom
            const sortedList = list.sort((a, b) => b.sortTime - a.sortTime);
            
            setApplications(sortedList);
            setLoading(false);
        }, (error) => {
            console.error("Queue Sync Error:", error);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const renderItem = ({ item }: any) => {
        const photo = item.photoURL || item.profilePic || item.profileImage || 'https://via.placeholder.com/150';
        
        return (
            <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.card}
                // 🔥 MASS FIX: Path correction based on your folder structure
                onPress={() => router.push(`/(admin)/experts/verify-expert/${item.id}` as any)}
            >
                <View style={styles.cardContent}>
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: photo }} style={styles.avatar} />
                        {/* Orange pulse for Pending status */}
                        <View style={styles.activePulse} />
                    </View>
                    
                    <View style={styles.info}>
                        <Text style={styles.name}>{item.name || 'NEW CANDIDATE'}</Text>
                        <View style={styles.metaRow}>
                            <Feather name="tag" size={10} color="#6366F1" />
                            <Text style={styles.subText}>{item.category || 'General Consultation'}</Text>
                        </View>
                    </View>

                    <View style={styles.actionArea}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>REVIEW</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#6366F1" style={{ marginTop: 5 }} />
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <LinearGradient colors={['#020617', '#0F172A']} style={StyleSheet.absoluteFill} />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Feather name="arrow-left" size={20} color="#6366F1" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>INBOUND QUEUE</Text>
                    <Text style={styles.subtitle}>AWAITING SYSTEM AUTHORIZATION</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator color="#6366F1" size="large" />
                    <Text style={styles.loadingText}>SCANNING DATABASE...</Text>
                </View>
            ) : (
                <FlatList
                    data={applications}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <View style={styles.emptyIconCircle}>
                                <Feather name="shield-off" size={40} color="#1E293B" />
                            </View>
                            <Text style={styles.emptyTitle}>NO PENDING TASKS</Text>
                            <Text style={styles.emptySub}>All expert applications have been processed.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { paddingTop: 60, paddingHorizontal: 25, marginBottom: 25, flexDirection: 'row', alignItems: 'center', gap: 15 },
    backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E293B' },
    title: { color: '#fff', fontSize: 20, fontWeight: '900', letterSpacing: 1 },
    subtitle: { color: '#6366F1', fontSize: 9, fontWeight: '800', letterSpacing: 1.5, marginTop: 2 },
    loadingText: { color: '#475569', fontSize: 10, fontWeight: '900', marginTop: 15, letterSpacing: 2 },
    list: { paddingHorizontal: 20, paddingBottom: 40 },
    card: { backgroundColor: '#0F172A', padding: 18, borderRadius: 28, marginBottom: 12, borderWidth: 1, borderColor: '#1E293B' },
    cardContent: { flexDirection: 'row', alignItems: 'center' },
    avatarContainer: { position: 'relative' },
    avatar: { width: 55, height: 55, borderRadius: 18, backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
    activePulse: { position: 'absolute', bottom: -2, right: -2, width: 12, height: 12, borderRadius: 6, backgroundColor: '#F59E0B', borderWidth: 2, borderColor: '#0F172A' },
    info: { flex: 1, marginLeft: 15 },
    name: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
    subText: { color: '#475569', fontSize: 11, fontWeight: '700' },
    actionArea: { alignItems: 'flex-end' },
    badge: { backgroundColor: 'rgba(245, 158, 11, 0.1)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(245, 158, 11, 0.2)' },
    badgeText: { color: '#F59E0B', fontSize: 9, fontWeight: '900', letterSpacing: 0.5 },
    empty: { alignItems: 'center', marginTop: 80, paddingHorizontal: 40 },
    emptyIconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#1E293B' },
    emptyTitle: { color: '#fff', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    emptySub: { color: '#475569', fontSize: 12, textAlign: 'center', marginTop: 8, lineHeight: 18, fontWeight: '600' }
});