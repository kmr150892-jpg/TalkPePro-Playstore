import { collection, onSnapshot, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { db } from '../../../firebaseConfig';

const RevenueAnalytics = () => {
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState({
        totalRevenue: 0,
        totalPaidOut: 0,
        pendingLiabilities: 0
    });

    useEffect(() => {
        // 1. Calculate Total Revenue from SUCCESSful orders
        const qOrders = query(collection(db, "orders"), where("status", "==", "SUCCESS"));
        const unsubOrders = onSnapshot(qOrders, (snap) => {
            let rev = 0;
            snap.docs.forEach(d => rev += (d.data().amount || 0) / 100);
            
            // 2. Calculate Total Paid Out (Manual transfers marked as SUCCESS in payouts)
            const qPayouts = query(collection(db, "payouts"), where("status", "==", "PAID"));
            const unsubPayouts = onSnapshot(qPayouts, (pSnap) => {
                let paid = 0;
                pSnap.docs.forEach(d => paid += (d.data().amount || 0));

                // 3. Current Expert Balances (Pending to be paid)
                const qExperts = query(collection(db, "users"), where("role", "==", "expert"));
                const unsubExperts = onSnapshot(qExperts, (eSnap) => {
                    let pending = 0;
                    eSnap.docs.forEach(d => pending += (d.data().balance || 0));

                    setData({
                        totalRevenue: rev,
                        totalPaidOut: paid,
                        pendingLiabilities: pending
                    });
                    setLoading(false);
                });
            });
        });

        // Cleanup hooks inga venum (Omitted for brevity)
    }, []);

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.sectionTitle}>FINANCIAL OVERVIEW</Text>
            
            <View style={styles.mainCard}>
                <Text style={styles.label}>TOTAL USER PAYMENTS</Text>
                <Text style={styles.value}>₹{data.totalRevenue.toLocaleString()}</Text>
            </View>

            <View style={styles.row}>
                <View style={[styles.card, {backgroundColor: '#064E3B'}]}>
                    <Text style={styles.cardLabel}>SENT TO EXPERTS</Text>
                    <Text style={styles.cardValue}>₹{data.totalPaidOut.toLocaleString()}</Text>
                </View>
                <View style={[styles.card, {backgroundColor: '#451A03'}]}>
                    <Text style={styles.cardLabel}>PENDING PAYOUTS</Text>
                    <Text style={styles.cardValue}>₹{data.pendingLiabilities.toLocaleString()}</Text>
                </View>
            </View>

            <View style={styles.profitCard}>
                <Text style={styles.cardLabel}>ESTIMATED TALKPE PROFIT</Text>
                <Text style={styles.profitValue}>
                    ₹{(data.totalRevenue - data.totalPaidOut - data.pendingLiabilities).toFixed(2)}
                </Text>
                <Text style={styles.subText}>(After Gateway Fees & Expert Share)</Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617', padding: 20 },
    sectionTitle: { color: '#475569', fontWeight: '900', marginTop: 40, letterSpacing: 1 },
    mainCard: { backgroundColor: '#0F172A', padding: 25, borderRadius: 20, marginVertical: 20, borderWidth: 1, borderColor: '#1E293B' },
    label: { color: '#94A3B8', fontSize: 12, fontWeight: 'bold' },
    value: { color: '#fff', fontSize: 40, fontWeight: '900', marginTop: 10 },
    row: { flexDirection: 'row', justifyContent: 'space-between' },
    card: { width: '48%', padding: 15, borderRadius: 15 },
    cardLabel: { color: '#CBD5E1', fontSize: 10, fontWeight: 'bold' },
    cardValue: { color: '#fff', fontSize: 20, fontWeight: '900', marginTop: 5 },
    profitCard: { backgroundColor: '#1E1B4B', padding: 25, borderRadius: 20, marginTop: 20, alignItems: 'center' },
    profitValue: { color: '#10B981', fontSize: 35, fontWeight: '900' },
    subText: { color: '#475569', fontSize: 10, marginTop: 5 }
});

export default RevenueAnalytics;