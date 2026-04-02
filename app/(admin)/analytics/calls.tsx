import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { db } from '../../../firebaseConfig';

const CallAnalytics = () => {
    const [liveCount, setLiveCount] = useState(0);
    const [successRate, setSuccessRate] = useState(0);
    const [loading, setLoading] = useState(true);
    
    // Call Logs state - Idhu mattum dhaan extra
    const [callLogs, setCallLogs] = useState<any[]>([]);

    useEffect(() => {
        // 1. Live Calls Monitor (Only ongoing status)
        const qLive = query(collection(db, "calls"), where("status", "==", "ongoing"));
        const unsubLive = onSnapshot(qLive, (snap) => {
            setLiveCount(snap.size);
            setLoading(false);
        });

        // 2. Success Rate Calculation (Optimized logic)
        const unsubAll = onSnapshot(collection(db, "calls"), (snap) => {
            if (!snap.empty) {
                const total = snap.size;
                const completed = snap.docs.filter(d => d.data().status === 'completed').length;
                setSuccessRate(Math.round((completed / total) * 100));
            }
        });

        // 3. Call Logs logic - Ippo add panniyadhu
        const qLogs = query(
            collection(db, "transactions"), 
            orderBy("timestamp", "desc"), 
            limit(10) // Kadaisi 10 calls mattum
        );
        const unsubLogs = onSnapshot(qLogs, (snap) => {
            const logs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCallLogs(logs);
        });

        return () => { 
            unsubLive(); 
            unsubAll(); 
            unsubLogs();
        };
    }, []);

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator color="#6366F1" size="large" />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* --- Original Live Calls Section --- */}
            <View style={styles.card}>
                <Text style={styles.label}>LIVE CALLS NOW</Text>
                <View style={styles.row}>
                    <View style={styles.pulseIndicator} />
                    <Text style={styles.value}>{liveCount}</Text>
                </View>
            </View>
            
            <View style={styles.divider} />
            
            {/* --- Original Success Rate Section --- */}
            <View style={styles.card}>
                <Text style={styles.label}>PLATFORM SUCCESS RATE</Text>
                <Text style={[styles.value, { color: '#10B981' }]}>{successRate}%</Text>
            </View>

            <View style={styles.divider} />

            {/* --- New Call Logs Section --- */}
            <View style={styles.card}>
                <Text style={styles.label}>RECENT CALL LOGS</Text>
                {callLogs.length === 0 ? (
                    <Text style={{color: '#475569', marginTop: 10}}>No recent calls found</Text>
                ) : (
                    callLogs.map((log) => (
                        <View key={log.id} style={styles.logItem}>
                            <View style={styles.logHeader}>
                                <Text style={styles.logText}>Expert: {log.expertName || 'N/A'}</Text>
                                <Text style={styles.logStatus}>COMPLETED</Text>
                            </View>
                            <Text style={styles.logSubText}>
                                {Math.floor((log.duration || 0) / 60)} mins | {log.diamonds || 0} Diamonds
                            </Text>
                        </View>
                    ))
                )}
            </View>
            
            {/* Scroll panna gap-kaga */}
            <View style={{height: 40}} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617', padding: 30 },
    center: { alignItems: 'center', justifyContent: 'center' },
    card: { marginVertical: 10 },
    row: { flexDirection: 'row', alignItems: 'center' },
    pulseIndicator: { 
        width: 12, 
        height: 12, 
        borderRadius: 6, 
        backgroundColor: '#6366F1', 
        marginRight: 15,
        shadowColor: '#6366F1',
        shadowRadius: 10,
        elevation: 5
    },
    label: { color: '#475569', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
    value: { color: '#fff', fontSize: 80, fontWeight: '900', marginTop: 5 },
    divider: { 
        height: 1, 
        backgroundColor: '#1E293B', 
        marginVertical: 40,
        opacity: 0.5
    },
    logItem: {
        backgroundColor: '#0F172A',
        padding: 15,
        borderRadius: 16,
        marginTop: 12,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    logText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    logStatus: { color: '#10B981', fontSize: 10, fontWeight: '900' },
    logSubText: { color: '#64748B', fontSize: 13, marginTop: 6 }
});

export default CallAnalytics;