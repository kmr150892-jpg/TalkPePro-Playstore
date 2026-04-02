import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { db } from '../../../firebaseConfig';

const CallAnalytics = () => {
    const [liveCount, setLiveCount] = useState(0);
    const [successRate, setSuccessRate] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Live Calls Monitor (Only ongoing status)
        const qLive = query(collection(db, "calls"), where("status", "==", "ongoing"));
        const unsubLive = onSnapshot(qLive, (snap) => {
            setLiveCount(snap.size);
            setLoading(false);
        });

        // 2. Success Rate Calculation (Optimized logic)
        // Note: Real apps-la 'total_calls' matrum 'completed_calls' nu oru single doc-la 
        // counter vechirupom. Ippo unga current logic-padi optimized snapshot:
        const unsubAll = onSnapshot(collection(db, "calls"), (snap) => {
            if (!snap.empty) {
                const total = snap.size;
                const completed = snap.docs.filter(d => d.data().status === 'completed').length;
                setSuccessRate(Math.round((completed / total) * 100));
            }
        });

        return () => { 
            unsubLive(); 
            unsubAll(); 
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
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.label}>LIVE CALLS NOW</Text>
                <View style={styles.row}>
                    <View style={styles.pulseIndicator} />
                    <Text style={styles.value}>{liveCount}</Text>
                </View>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.card}>
                <Text style={styles.label}>PLATFORM SUCCESS RATE</Text>
                <Text style={[styles.value, { color: '#10B981' }]}>{successRate}%</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617', padding: 30, justifyContent: 'center' },
    center: { alignItems: 'center' },
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
    }
});

export default CallAnalytics;