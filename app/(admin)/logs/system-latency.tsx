import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { db } from '../../../firebaseConfig';

const { width } = Dimensions.get('window');

const SystemLatency = () => {
    const [healthData, setHealthData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 📊 SYSTEM DIAGNOSTICS: Fetching latest engine performance metrics from secure logs
        const q = query(collection(db, "system_health"), orderBy("timestamp", "desc"), limit(20));
        const unsubscribe = onSnapshot(q, (snap) => {
            setHealthData(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const getStatusColor = (latency: number) => {
        if (latency < 100) return '#10B981'; // Optimal (Green)
        if (latency < 250) return '#F59E0B'; // Functional (Yellow)
        return '#EF4444'; // Critical (Red)
    };

    const renderHealthCard = ({ item }: any) => (
        <View style={styles.healthCard}>
            <View style={styles.cardHeader}>
                <Text style={styles.sessionText}>REF: {item.sessionId?.slice(-8).toUpperCase()}</Text>
                <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.latency) }]} />
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>RESPONSE TIME</Text>
                    <Text style={[styles.statValue, { color: getStatusColor(item.latency) }]}>{item.latency}ms</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>DATA INTEGRITY</Text>
                    <Text style={styles.statValue}>{100 - item.packetLoss}%</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>THROUGHPUT</Text>
                    <Text style={styles.statValue}>{item.bitrate}kbps</Text>
                </View>
            </View>

            <Text style={styles.footerText}>User: {item.userName} • Platform: {item.deviceOS}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <Text style={styles.title}>ENGINE DIAGNOSTICS</Text>
                <Text style={styles.subtitle}>Real-time Network Stability & Optimization Monitor</Text>
            </View>

            {loading ? (
                <ActivityIndicator color="#10B981" size="large" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={healthData}
                    keyExtractor={(item) => item.id}
                    renderItem={renderHealthCard}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 20 }}
                    ListEmptyComponent={<Text style={styles.empty}>No active diagnostic data found.</Text>}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { paddingTop: 60, paddingHorizontal: 25, marginBottom: 20 },
    title: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
    subtitle: { color: '#10B981', fontSize: 10, fontWeight: 'bold', marginTop: 4, letterSpacing: 1 },
    healthCard: { backgroundColor: '#0F172A', padding: 20, borderRadius: 24, marginBottom: 15, borderWidth: 1, borderColor: '#1E293B' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sessionText: { color: '#475569', fontSize: 10, fontWeight: 'bold' },
    statusDot: { 
        width: 10, 
        height: 10, 
        borderRadius: 5, 
        shadowColor: '#10B981', 
        shadowRadius: 10, 
        shadowOpacity: 0.8, 
        elevation: 5 
    },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#1E293B', paddingTop: 15 },
    statItem: { alignItems: 'center' },
    statLabel: { color: '#475569', fontSize: 9, fontWeight: '900', marginBottom: 4 },
    statValue: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
    footerText: { color: '#334155', fontSize: 10, marginTop: 15, textAlign: 'center' },
    empty: { color: '#475569', textAlign: 'center', marginTop: 100 }
});

export default SystemLatency;