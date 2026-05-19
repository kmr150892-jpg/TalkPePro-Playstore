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
        // 🔥 LIVE MASTER LEDGER: Fetches Inflows, Disbursements AND Authorized Reward Grants 🔥
        // Increased limit to 500 so recharges don't get hidden behind 100s of operational logs
        const qTx = query(collection(db, "transactions"), orderBy("timestamp", "desc"), limit(500));
        const qVouchers = query(collection(db, "reward_requests"), orderBy("requestDate", "desc"), limit(100));
        const qACTIVITY_REWARDs = query(collection(db, "withdrawals"), orderBy("createdAt", "desc"), limit(100)); 
        
        let txList: any[] = [];
        let voucherList: any[] = [];
        let ACTIVITY_REWARDList: any[] = [];

        const updateList = () => {
            // Combine all collections and sort them by time sequence
            const combined = [...txList, ...voucherList, ...ACTIVITY_REWARDList].sort((a, b) => {
                const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
                const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
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

        // 🔥 SYSTEM LOGIC: Fetch Reward Grants that are marked as 'Delivered'
        const unsubVouchers = onSnapshot(qVouchers, (snap) => {
            const uniqueVouchers = new Map();
            snap.docs.forEach(docSnapshot => {
                const data = docSnapshot.data();
                if (data.status === 'Delivered') {
                    uniqueVouchers.set(docSnapshot.id, {
                        id: docSnapshot.id,
                        type: 'VOUCHER', // Unit mapping to VOUCHER
                        userName: data.userName || data.userEmail || 'Client',
                        amount: data.costDeducted || 0,
                        voucherName: data.voucherName || 'Reward Grant',
                        timestamp: data.processedDate || data.requestDate // Use operational time
                    });
                }
            });
            voucherList = Array.from(uniqueVouchers.values());
            updateList();
        });

        // 🔥 SYSTEM LOGIC: STRICT DISBURSEMENT DUPLICATE REMOVAL & STATUS VERIFICATION 🔥
        const unsubACTIVITY_REWARDs = onSnapshot(qACTIVITY_REWARDs, (snap) => {
            const uniqueACTIVITY_REWARDs = new Map();
            snap.docs.forEach(docSnapshot => {
                const data = docSnapshot.data();
                const status = (data.status || '').toUpperCase();
                
                // Only take fully completed distributions
                if (status === 'SUCCESS' || status === 'PAID') {
                    uniqueACTIVITY_REWARDs.set(docSnapshot.id, {
                        id: docSnapshot.id,
                        type: 'ACTIVITY_REWARD', // Unit mapping to ACTIVITY_REWARD
                        userName: data.expertName || data.userName || 'Consultant',
                        amount: data.amountRupee || data.amount || data.ACTIVITY_REWARDAmount || 0,
                        timestamp: data.paidAt || data.createdAt || data.processedAt
                    });
                }
            });
            ACTIVITY_REWARDList = Array.from(uniqueACTIVITY_REWARDs.values());
            updateList();
        });

        return () => { unsubTx(); unsubVouchers(); unsubACTIVITY_REWARDs(); };
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
            case 'VOUCHER': return { name: 'gift', color: '#F59E0B' }; 
            default: return { name: 'help-circle', color: '#475569' };
        }
    };

    const renderItem = ({ item }: { item: any }) => {
        const upType = item.type ? item.type.toUpperCase() : '';
        const iconData = getIcon(upType);
        
        let displayName = item.userName || item.user_name || item.callerName || item.expertName || 'System';
        
        // Amount logic (handling exact values from operational ledger)
        const displayAmount = Number(item.amountRupee || item.amount || item.rechargeAmount || item.ACTIVITY_REWARDAmount || item.costDeducted || 0);

        // Formatted Operational Timestamp
        let dateString = "Timestamp Unknown";
        const timeData = item.paidAt || item.processedDate || item.processedAt || item.createdAt || item.timestamp || item.date;
        if (timeData) {
            try {
                dateString = timeData.toDate ? timeData.toDate().toLocaleString('en-IN') : new Date(timeData).toLocaleString('en-IN');
            } catch(e) {}
        }

        const isPositive = (upType === 'RECHARGE');
        const isVoucher = (upType === 'VOUCHER');
        
        // Dynamic Label Mapping
        const typeLabel = isVoucher ? `REWARD: ${item.voucherName?.toUpperCase()}` : (upType ? upType.replace('_', ' ') : 'UNKNOWN');

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
                    <Text style={[styles.txAmount, { color: isPositive ? '#10B981' : (isVoucher ? '#F59E0B' : '#EF4444') }]}>
                        {isPositive ? '+ ₹' : (isVoucher ? '- ' : '- ₹')}{displayAmount.toLocaleString('en-IN')}{isVoucher ? ' 💎' : ''}
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
                    {['TODAY_RECHARGE', 'TOTAL_RECHARGE', 'TODAY_ACTIVITY_REWARD', 'TOTAL_ACTIVITY_REWARD', 'TODAY_VOUCHER', 'TOTAL_VOUCHER'].map((f) => (
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