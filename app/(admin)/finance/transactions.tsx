import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { db } from '../../../firebaseConfig';

export default function MasterLedger() {
    const router = useRouter();
    const [transactions, setTransactions] = useState<any[]>([]);
    const [filteredData, setFilteredData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('ALL');

    useEffect(() => {
        // 🔥 LIVE MASTER LEDGER: Fetches every single movement
        const q = query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(100));
        
        const unsub = onSnapshot(q, (snap) => {
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(list);
            setFilteredData(list);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    // 🎯 Filter Logic
    const applyFilter = (type: string) => {
        setActiveFilter(type);
        if (type === 'ALL') {
            setFilteredData(transactions);
        } else {
            const filtered = transactions.filter(t => t.type === type);
            setFilteredData(filtered);
        }
    };

    const getIcon = (type: string) => {
        switch(type) {
            case 'RECHARGE': return { name: 'plus-circle', color: '#10B981' };
            case 'CALL_DEDUCTION': return { name: 'phone-outgoing', color: '#EF4444' };
            case 'PAYOUT': return { name: 'external-link', color: '#6366F1' };
            default: return { name: 'help-circle', color: '#475569' };
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const iconData = getIcon(item.type);
        return (
            <View style={styles.logCard}>
                <View style={[styles.iconBox, { backgroundColor: iconData.color + '15' }]}>
                    <Feather name={iconData.name as any} size={18} color={iconData.color} />
                </View>
                
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.txTitle}>{item.userName || item.expertName || 'System'}</Text>
                    <Text style={styles.txId}>ID: {item.id.slice(0,12)}...</Text>
                    <Text style={styles.txDate}>{item.timestamp?.toDate().toLocaleString()}</Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.txAmount, { color: item.type === 'RECHARGE' ? '#10B981' : '#EF4444' }]}>
                        {item.type === 'RECHARGE' ? '+' : '-'} ₹{item.amount}
                    </Text>
                    <Text style={styles.txTypeLabel}>{item.type.replace('_', ' ')}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color="#6366F1" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>MASTER LEDGER</Text>
            </View>

            {/* ⚡ FILTER CHIPS */}
            <View style={styles.filterRow}>
                {['ALL', 'RECHARGE', 'CALL_DEDUCTION', 'PAYOUT'].map((f) => (
                    <TouchableOpacity 
                        key={f} 
                        onPress={() => applyFilter(f)}
                        style={[styles.chip, activeFilter === f && styles.activeChip]}
                    >
                        <Text style={[styles.chipText, activeFilter === f && styles.activeChipText]}>
                            {f === 'CALL_DEDUCTION' ? 'CALLS' : f}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <ActivityIndicator color="#6366F1" size="large" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={filteredData}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No transactions found.</Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { paddingTop: 60, paddingBottom: 10, paddingHorizontal: 25, flexDirection: 'row', alignItems: 'center' },
    backBtn: { backgroundColor: '#0F172A', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#1E293B' },
    headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', marginLeft: 15, letterSpacing: 1 },
    
    filterRow: { flexDirection: 'row', paddingHorizontal: 20, marginVertical: 15, gap: 8 },
    chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: '#0F172A', borderWidth: 1, borderColor: '#1E293B' },
    activeChip: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
    chipText: { color: '#475569', fontSize: 10, fontWeight: '900' },
    activeChipText: { color: '#FFF' },

    logCard: { backgroundColor: '#0F172A', padding: 15, borderRadius: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
    iconBox: { width: 45, height: 45, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    txTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    txId: { color: '#475569', fontSize: 10, marginTop: 2 },
    txDate: { color: '#475569', fontSize: 9, marginTop: 2 },
    txAmount: { fontSize: 16, fontWeight: '900' },
    txTypeLabel: { color: '#475569', fontSize: 8, fontWeight: '900', marginTop: 4 },
    emptyText: { color: '#475569', textAlign: 'center', marginTop: 100, fontWeight: '700' }
});