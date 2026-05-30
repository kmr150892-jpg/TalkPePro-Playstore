import { Feather, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ScrollView,
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
    
    // 🔥 Default active filter changed from 'ALL' to 'TODAY_RECHARGE'
    const [activeFilter, setActiveFilter] = useState('TODAY_RECHARGE');

    useEffect(() => {
        setLoading(true);
        // 🔥 LIVE MASTER LEDGER: Fetches Inflows and Activity Rewards 🔥
        const qTx = query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(500));
        
        // Removed orderBy here to prevent silent Firestore failures if the field name is different
        const qACTIVITY_REWARDs = query(collection(db, "withdrawals"), limit(300)); 
        
        let txList: any[] = [];
        let ACTIVITY_REWARDList: any[] = [];

        const updateList = () => {
            // Combine collections and sort them by time sequence via Javascript
            const combined = [...txList, ...ACTIVITY_REWARDList].sort((a, b) => {
                const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (new Date(a.timestamp).getTime() || 0);
                const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (new Date(b.timestamp).getTime() || 0);
                return timeB - timeA;
            });
            setTransactions(combined);
            setLoading(false);
        };

        const unsubTx = onSnapshot(qTx, (snap) => {
            // Remove potential duplicates by secure ID
            const uniqueTxs = new Map();
            snap.docs.forEach(doc => {
                uniqueTxs.set(doc.id, { id: doc.id, ...doc.data() });
            });
            txList = Array.from(uniqueTxs.values());
            updateList();
        });

        // 🔥 SYSTEM LOGIC: FETCH ACTIVITY REWARDS (WITHDRAWALS) 🔥
        const unsubACTIVITY_REWARDs = onSnapshot(qACTIVITY_REWARDs, (snap) => {
            const uniqueACTIVITY_REWARDs = new Map();
            snap.docs.forEach(docSnapshot => {
                const data = docSnapshot.data();
                const status = (data.status || '').toUpperCase();
                
                // Allow all logs except the explicitly rejected ones to ensure data shows up
                if (status !== 'REJECTED' && status !== 'FAILED') {
                    uniqueACTIVITY_REWARDs.set(docSnapshot.id, {
                        id: docSnapshot.id,
                        type: 'ACTIVITY_REWARD', 
                        userName: data.expertName || data.userName || data.name || 'Consultant',
                        // Added more field fallbacks in case the DB structure is slightly different
                        amount: data.amountRupee || data.amount || data.ACTIVITY_REWARDAmount || data.withdrawAmount || 0,
                        // Added multiple timestamp fallbacks
                        timestamp: data.paidAt || data.createdAt || data.timestamp || data.processedAt || new Date(),
                        ...data
                    });
                }
            });
            ACTIVITY_REWARDList = Array.from(uniqueACTIVITY_REWARDs.values());
            updateList();
        });

        return () => { unsubTx(); unsubACTIVITY_REWARDs(); };
    }, []);

    // 🔥 AUTOMATIC FILTER ENGINE: Runs perfectly when data updates or tab changes
    useEffect(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const filtered = transactions.filter(t => {
            const upType = t.type ? t.type.toUpperCase() : '';

            // Handle "TODAY_" filters strictly for current operational cycle
            if (activeFilter.startsWith('TODAY_')) {
                const expectedType = activeFilter.replace('TODAY_', '');
                if (upType !== expectedType) return false;
                
                // Ensure synchronization within current date
                const timeData = t.processedAt || t.processedDate || t.paidAt || t.createdAt || t.timestamp || t.date;
                if (!timeData) return false;
                try {
                    const txDate = timeData.toDate ? timeData.toDate() : new Date(timeData);
                    return txDate >= today;
                } catch(e) {
                    return false;
                }
            } 
            // Handle "TOTAL_" cumulative filters
            else if (activeFilter.startsWith('TOTAL_')) {
                const expectedType = activeFilter.replace('TOTAL_', '');
                return upType === expectedType;
            } 
            // Handle Standard Filters
            else {
                return upType === activeFilter;
            }
        });

        setFilteredData(filtered);
    }, [transactions, activeFilter]);

    const applyFilter = (type: string) => {
        setActiveFilter(type);
    };

    const getIcon = (type: string) => {
        const upType = type ? type.toUpperCase() : '';
        switch(upType) {
            case 'RECHARGE': return { name: 'plus-circle', color: '#10B981' };
            case 'ACTIVITY_REWARD': return { name: 'external-link', color: '#6366F1' };
            default: return { name: 'help-circle', color: '#475569' };
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const upType = item.type ? item.type.toUpperCase() : '';
        const iconData = getIcon(upType);
        
        let displayName = item.userName || item.user_name || item.callerName || item.expertName || 'System';
        
        // Amount logic (handling exact values from operational ledger)
        const displayAmount = Number(item.amountRupee || item.amount || item.rechargeAmount || item.ACTIVITY_REWARDAmount || 0);

        // Formatted Operational Timestamp
        let dateString = "Timestamp Unknown";
        const timeData = item.paidAt || item.processedDate || item.processedAt || item.createdAt || item.timestamp || item.date;
        if (timeData) {
            try {
                dateString = timeData.toDate ? timeData.toDate().toLocaleString('en-IN') : new Date(timeData).toLocaleString('en-IN');
            } catch(e) {}
        }

        const isPositive = (upType === 'RECHARGE');
        
        // Dynamic Label Mapping
        const typeLabel = upType ? upType.replace('_', ' ') : 'UNKNOWN';

        return (
            <View style={styles.logCard}>
                <View style={[styles.iconBox, { backgroundColor: iconData.color + '15' }]}>
                    <Feather name={iconData.name as any} size={18} color={iconData.color} />
                </View>
                
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.txTitle}>{displayName}</Text>
                    <Text style={styles.txId}>REF: {item.id.slice(0,12).toUpperCase()}...</Text>
                    <Text style={styles.txDate}>{dateString}</Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.txAmount, { color: isPositive ? '#10B981' : '#EF4444' }]}>
                        {isPositive ? '+ ₹' : '- ₹'}{displayAmount.toLocaleString('en-IN')}
                    </Text>
                    <Text style={styles.txTypeLabel}>{typeLabel}</Text>
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
                <Text style={styles.headerTitle}>SYSTEM MASTER LEDGER</Text>
            </View>

            {/* ⚡ ANALYTICS FILTERS */}
            <View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {/* 🔥 Removed VOUCHER filters here as requested 🔥 */}
                    {['TODAY_RECHARGE', 'TOTAL_RECHARGE', 'TODAY_ACTIVITY_REWARD', 'TOTAL_ACTIVITY_REWARD'].map((f) => (
                        <TouchableOpacity 
                            key={f} 
                            onPress={() => applyFilter(f)}
                            style={[styles.chip, activeFilter === f && styles.activeChip]}
                        >
                            <Text style={[styles.chipText, activeFilter === f && styles.activeChipText]}>
                                {f.replace('TODAY_', "TODAY'S ").replace('TOTAL_', 'TOTAL ')}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
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
                        <Text style={styles.emptyText}>No operational logs found in current cycle.</Text>
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