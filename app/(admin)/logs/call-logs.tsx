import { Feather } from '@expo/vector-icons';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { db } from '../../../firebaseConfig';

const CallLogs = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 📞 Fetching Last 50 Calls (Live)
        const q = query(collection(db, "calls"), orderBy("startTime", "desc"), limit(50));
        
        const unsubscribe = onSnapshot(q, (snap) => {
            const callData = snap.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setLogs(callData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const renderCallItem = ({ item }: any) => (
        <View style={styles.logCard}>
            <View style={styles.iconBox}>
                <Feather 
                    name={item.status === 'completed' ? "phone-incoming" : "phone-missed"} 
                    size={20} 
                    color={item.status === 'completed' ? "#10B981" : "#EF4444"} 
                />
            </View>
            
            <View style={{ flex: 1, marginLeft: 15 }}>
                <Text style={styles.userText}>{item.userName || 'User'} ↔ {item.expertName || 'Expert'}</Text>
                <Text style={styles.subText}>
                    {item.duration || 0} mins • {new Date(item.startTime?.seconds * 1000).toLocaleString()}
                </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.costText}>- ₹{item.totalCost || 0}</Text>
                <Text style={styles.statusTag}>{item.status?.toUpperCase()}</Text>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <Text style={styles.title}>CALL & SECURITY LOGS</Text>
                <Text style={styles.subtitle}>Real-time monitoring of all connections</Text>
            </View>

            {loading ? (
                <ActivityIndicator color="#6366F1" size="large" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={logs}
                    keyExtractor={(item) => item.id}
                    renderItem={renderCallItem}
                    contentContainerStyle={{ padding: 20 }}
                    ListEmptyComponent={<Text style={styles.empty}>No call history found.</Text>}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { paddingTop: 60, paddingHorizontal: 25, marginBottom: 20 },
    title: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
    subtitle: { color: '#475569', fontSize: 12, marginTop: 4 },
    logCard: { 
        backgroundColor: '#0F172A', 
        padding: 18, 
        borderRadius: 20, 
        flexDirection: 'row', 
        alignItems: 'center', 
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#1E293B'
    },
    iconBox: { backgroundColor: '#1E293B', padding: 10, borderRadius: 12 },
    userText: { color: '#fff', fontWeight: 'bold', fontSize: 14 },
    subText: { color: '#64748B', fontSize: 11, marginTop: 4 },
    costText: { color: '#EF4444', fontWeight: '900', fontSize: 14 },
    statusTag: { color: '#475569', fontSize: 9, fontWeight: 'bold', marginTop: 4 },
    empty: { color: '#475569', textAlign: 'center', marginTop: 100 }
});

export default CallLogs;