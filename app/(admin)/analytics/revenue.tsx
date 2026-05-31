import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { db } from '../../../firebaseConfig';

const RevenueAnalytics = () => {
    const [loading, setLoading] = useState(true);
    
    // 🔥 UPDATED STATE: Removed User Distribution details for Reward Grants
    const [data, setData] = useState<any>({
        totalRevenue: 0,
        todayRevenue: 0,
        totalPaidOut: 0,
        todayPaidOut: 0,
        userBreakdown: [],
        expertBreakdown: []
    });

    useEffect(() => {
        // 🔥 1. Calculate Total & Today's Inflows ONLY from RECHARGE transactions
        const qOrders = query(collection(db, "transactions"), where("status", "in", ["SUCCESS", "success", "COMPLETED", "completed", "PAID", "paid"]));
        const unsubOrders = onSnapshot(qOrders, (snap) => {
            let rev = 0;
            let todayRev = 0;
            let userMap: any = {};
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            snap.docs.forEach(d => {
                const docData = d.data();
                
                // 🔥 FIX 1 & 4: Strictly filter out DISTRIBUTIONS. Only process RECHARGE types.
                if (docData.type && docData.type.toUpperCase() !== 'RECHARGE') {
                    return; // Skip this document
                }
                
                // Safe parsing for amount
                let amt = Number(docData.amount || docData.rechargeAmount || docData.totalAmount || docData.price || 0);
                
                rev += amt;

                // Today's Inflow Calculation
                const timeData = docData.createdAt || docData.timestamp || docData.date;
                if (timeData) {
                    try {
                        const dateObj = timeData.toDate ? timeData.toDate() : new Date(timeData);
                        if (dateObj >= today) {
                            todayRev += amt;
                        }
                    } catch(e) {}
                }

                // User Breakdown Calculation
                const uName = docData.userName || docData.user_name || docData.callerName || docData.userId || 'Unknown User';
                if (!userMap[uName]) userMap[uName] = 0;
                userMap[uName] += amt;
            });

            const userArr = Object.keys(userMap).map(k => ({ name: k, amount: userMap[k] })).sort((a,b) => b.amount - a.amount);

            setData((prev: any) => ({ ...prev, totalRevenue: rev, todayRevenue: todayRev, userBreakdown: userArr }));
        });

        // 🔥 2. Calculate Total Distributed, Today's Distributed & Host Breakdown
        const qACTIVITY_REWARDs = query(collection(db, "withdrawals"), where("status", "in", ["PAID", "paid", "SUCCESS", "success", "COMPLETED", "completed"]));
        const unsubACTIVITY_REWARDs = onSnapshot(qACTIVITY_REWARDs, (pSnap) => {
            let paid = 0;
            let todayPaid = 0; // NEW
            let expertMap: any = {};

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            pSnap.docs.forEach(d => {
                const docData = d.data();
                
                const amt = Number(docData.amountRupee || docData.amount || docData.ACTIVITY_REWARDAmount || docData.transferred || 0);
                paid += amt;

                // 🔥 NEW: Today's Host Distribution Calculation
                const timeData = docData.createdAt || docData.timestamp || docData.processedAt || docData.date;
                if (timeData) {
                    try {
                        const dateObj = timeData.toDate ? timeData.toDate() : new Date(timeData);
                        if (dateObj >= today) {
                            todayPaid += amt;
                        }
                    } catch(e) {}
                }

                const eName = docData.expertName || docData.userName || docData.expert_name || docData.receiverName || docData.expertId || 'Unknown Host';
                if (!expertMap[eName]) expertMap[eName] = 0;
                expertMap[eName] += amt;
            });

            const expertArr = Object.keys(expertMap).map(k => ({ name: k, amount: expertMap[k] })).sort((a,b) => b.amount - a.amount);

            setData((prev: any) => ({ ...prev, totalPaidOut: paid, todayPaidOut: todayPaid, expertBreakdown: expertArr }));
            setLoading(false); 
        });

        return () => {
            unsubOrders();
            unsubACTIVITY_REWARDs();
        };
    }, []);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <Text style={styles.sectionTitle}>OPERATIONAL OVERVIEW</Text>
            
            <View style={styles.mainCard}>
                <Text style={styles.label}>TOTAL USER ALLOCATIONS (INFLOWS)</Text>
                <Text style={styles.value}>₹{data.totalRevenue.toLocaleString('en-IN')}</Text>
                
                <View style={styles.todayBox}>
                    <Text style={styles.todayLabel}>TODAY'S ALLOCATIONS:</Text>
                    <Text style={styles.todayValue}>+ ₹{data.todayRevenue.toLocaleString('en-IN')}</Text>
                </View>
            </View>

            {/* HOST DISTRIBUTIONS ROW */}
            <View style={styles.row}>
                <View style={[styles.card, {backgroundColor: '#064E3B'}]}>
                    <Text style={styles.cardLabel}>TOTAL PROCESSED TO HOSTS</Text>
                    <Text style={styles.cardValue}>₹{data.totalPaidOut.toLocaleString('en-IN')}</Text>
                </View>
                <View style={[styles.card, {backgroundColor: '#7F1D1D'}]}>
                    <Text style={styles.cardLabel}>TODAY'S HOST PROCESSED</Text>
                    <Text style={styles.cardValue}>₹{data.todayPaidOut.toLocaleString('en-IN')}</Text>
                </View>
            </View>

            <View style={styles.profitCard}>
                {/* 🔥 FIX 3: EXACT Math Formula (Shows minus if loss) */}
                <Text style={styles.cardLabel}>PLATFORM OPERATIONAL SHARE</Text>
                <Text style={[styles.profitValue, { color: (data.totalRevenue - data.totalPaidOut) >= 0 ? '#10B981' : '#EF4444' }]}>
                    {(data.totalRevenue - data.totalPaidOut) < 0 ? '- ' : ''}₹{Math.abs(data.totalRevenue - data.totalPaidOut).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                </Text>
                <Text style={styles.subText}>(Allocations - Host processed)</Text>

                {/* 🔥 FIX 5: Today's EXACT Formula (Shows minus if loss) */}
                <View style={styles.todayProfitBox}>
                    <Text style={[styles.cardLabel, {color: '#818CF8'}]}>TODAY'S OPERATIONAL SHARE</Text>
                    <Text style={[styles.profitValue, {fontSize: 24, marginTop: 5, color: (data.todayRevenue - data.todayPaidOut) >= 0 ? '#38BDF8' : '#EF4444'}]}>
                        {(data.todayRevenue - data.todayPaidOut) < 0 ? '- ' : ''}₹{Math.abs(data.todayRevenue - data.todayPaidOut).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </Text>
                    <Text style={styles.subText}>(Today's Allocations - Today's Hosts)</Text>
                </View>
            </View>

            {/* USER ALLOCATION BREAKDOWN */}
            <Text style={[styles.sectionTitle, { marginTop: 30 }]}>USER ALLOCATION DETAILS</Text>
            <View style={styles.listCard}>
                {data.userBreakdown.length === 0 ? (
                    <Text style={styles.noDataText}>No allocations found yet.</Text>
                ) : (
                    data.userBreakdown.map((u: any, index: number) => (
                        <View key={index} style={styles.listItem}>
                            <Text style={styles.listName}>{u.name}</Text>
                            <Text style={styles.listAmount}>₹{u.amount.toLocaleString('en-IN')}</Text>
                        </View>
                    ))
                )}
            </View>

            {/* HOST REDEMPTIONS BREAKDOWN */}
            <Text style={[styles.sectionTitle, { marginTop: 30 }]}>HOST REDEMPTIONS DETAILS</Text>
            <View style={styles.listCard}>
                {data.expertBreakdown.length === 0 ? (
                    <Text style={styles.noDataText}>No redemptions sent yet.</Text>
                ) : (
                    data.expertBreakdown.map((e: any, index: number) => (
                        <View key={index} style={styles.listItem}>
                            <Text style={styles.listName}>{e.name}</Text>
                            <Text style={[styles.listAmount, {color: '#10B981'}]}>₹{e.amount.toLocaleString('en-IN')}</Text>
                        </View>
                    ))
                )}
            </View>

            <View style={{height: 50}} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617', padding: 20 },
    sectionTitle: { color: '#475569', fontWeight: '900', marginTop: 40, letterSpacing: 1, marginBottom: 10 },
    mainCard: { backgroundColor: '#0F172A', padding: 25, borderRadius: 20, marginVertical: 10, borderWidth: 1, borderColor: '#1E293B' },
    label: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' },
    value: { color: '#fff', fontSize: 40, fontWeight: '900', marginTop: 10 },
    
    todayBox: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#1E293B', flexDirection: 'row', alignItems: 'center' },
    todayLabel: { color: '#CBD5E1', fontSize: 11, fontWeight: 'bold', marginRight: 10 },
    todayValue: { color: '#10B981', fontSize: 16, fontWeight: '900' },

    row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    card: { width: '48%', padding: 15, borderRadius: 15 },
    cardLabel: { color: '#CBD5E1', fontSize: 10, fontWeight: 'bold' },
    cardValue: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 5 },
    profitCard: { backgroundColor: '#1E1B4B', padding: 25, borderRadius: 20, marginTop: 20, alignItems: 'center', borderWidth: 1, borderColor: '#312E81' },
    profitValue: { fontSize: 35, fontWeight: '900', marginTop: 10 },
    subText: { color: '#64748B', fontSize: 10, marginTop: 5 },

    todayProfitBox: { marginTop: 20, paddingTop: 20, borderTopWidth: 1, borderTopColor: '#312E81', width: '100%', alignItems: 'center' },

    listCard: { backgroundColor: '#0F172A', borderRadius: 20, padding: 15, borderWidth: 1, borderColor: '#1E293B' },
    listItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 0.5, borderBottomColor: '#1E293B' },
    listName: { color: '#F1F5F9', fontSize: 14, fontWeight: '700' },
    listAmount: { color: '#38BDF8', fontSize: 14, fontWeight: '900' },
    noDataText: { color: '#475569', fontSize: 13, textAlign: 'center', paddingVertical: 10, fontStyle: 'italic' }
});

export default RevenueAnalytics;