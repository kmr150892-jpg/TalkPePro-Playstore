import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../../firebaseConfig';

const UserAnalytics = () => {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState({ total: 0, users: 0, experts: 0 });

    useEffect(() => {
        const unsub = onSnapshot(collection(db, "users"), (snap) => {
            let uCount = 0;
            let eCount = 0;
            
            snap.docs.forEach(d => {
                // Role identifier logic kept exactly as configured in DB
                if (d.data().role === 'expert') eCount++;
                else uCount++;
            });

            setCounts({ total: snap.size, users: uCount, experts: eCount });
            setLoading(false);
        });
        return () => unsub();
    }, []);

    if (loading) return <View style={styles.loader}><ActivityIndicator color="#F59E0B" size="large" /></View>;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()}><Feather name="arrow-left" size={24} color="#F59E0B" /></TouchableOpacity>
                <Text style={styles.title}>CLIENT BASE METRICS</Text>
            </View>

            <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>TOTAL NETWORK SIZE</Text>
                <Text style={styles.totalValue}>{counts.total}</Text>
            </View>

            <View style={styles.row}>
                <View style={styles.statBox}>
                    <MaterialCommunityIcons name="account" size={30} color="#6366F1" />
                    <Text style={styles.statNum}>{counts.users}</Text>
                    <Text style={styles.statLabel}>ACTIVE CLIENTS</Text>
                </View>
                <View style={styles.statBox}>
                    <MaterialCommunityIcons name="star-face" size={30} color="#F59E0B" />
                    <Text style={styles.statNum}>{counts.experts}</Text>
                    <Text style={styles.statLabel}>CONSULTANTS</Text>
                </View>
            </View>

            <View style={styles.growthCard}>
                <Text style={styles.growthText}>Network Distribution: {((counts.experts / counts.total) * 100).toFixed(1)}% Consultants</Text>
                <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${(counts.experts / counts.total) * 100}%` }]} />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617', padding: 25 },
    loader: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
    header: { paddingTop: 40, flexDirection: 'row', alignItems: 'center', marginBottom: 40 },
    title: { color: '#fff', fontSize: 20, fontWeight: '900', marginLeft: 15 },
    totalBox: { alignItems: 'center', marginBottom: 40 },
    totalLabel: { color: '#475569', fontSize: 12, fontWeight: '900', letterSpacing: 2 },
    totalValue: { color: '#fff', fontSize: 80, fontWeight: '900' },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    statBox: { backgroundColor: '#0F172A', width: '47%', padding: 25, borderRadius: 30, alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
    statNum: { color: '#fff', fontSize: 28, fontWeight: '900', marginTop: 10 },
    statLabel: { color: '#475569', fontSize: 10, fontWeight: '900', marginTop: 5 },
    growthCard: { marginTop: 30, backgroundColor: '#0F172A', padding: 20, borderRadius: 20 },
    growthText: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
    progressBar: { height: 8, backgroundColor: '#020617', borderRadius: 10, overflow: 'hidden' },
    progressFill: { height: '100%', backgroundColor: '#F59E0B' }
});

export default UserAnalytics;