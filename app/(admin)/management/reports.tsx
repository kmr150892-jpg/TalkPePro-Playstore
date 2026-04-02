import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { db } from '../../../firebaseConfig';

const ReportedUsers = () => {
    const [reports, setReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 🚨 LIVE MONITORING: Reports sorted by latest
        const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snap) => {
            setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleAction = async (reportId: string, status: string) => {
        try {
            await updateDoc(doc(db, "reports", reportId), { status: status });
            Alert.alert("Success", `Report marked as ${status}`);
        } catch (error) {
            console.error(error);
        }
    };

    const renderReportItem = ({ item }: any) => (
        <View style={[styles.reportCard, item.status === 'resolved' && { opacity: 0.6 }]}>
            <View style={styles.cardHeader}>
                <View style={[styles.severityBadge, { backgroundColor: item.priority === 'HIGH' ? '#EF444420' : '#F59E0B20' }]}>
                    <View style={[styles.dot, { backgroundColor: item.priority === 'HIGH' ? '#EF4444' : '#F59E0B' }]} />
                    <Text style={[styles.badgeText, { color: item.priority === 'HIGH' ? '#EF4444' : '#F59E0B' }]}>
                        {item.priority || 'NORMAL'}
                    </Text>
                </View>
                <Text style={styles.timeText}>{new Date(item.createdAt?.seconds * 1000).toLocaleDateString()}</Text>
            </View>

            <Text style={styles.reportReason}>{item.reason || 'No reason provided'}</Text>
            
            <View style={styles.userLine}>
                <Text style={styles.label}>FROM:</Text>
                <Text style={styles.value}>{item.reporterName} ({item.reporterRole})</Text>
            </View>
            <View style={styles.userLine}>
                <Text style={styles.label}>AGAINST:</Text>
                <Text style={[styles.value, { color: '#F87171' }]}>{item.reportedName}</Text>
            </View>

            <View style={styles.actionRow}>
                <TouchableOpacity 
                    style={[styles.btn, { backgroundColor: '#10B98120' }]} 
                    onPress={() => handleAction(item.id, 'resolved')}
                >
                    <Feather name="check-circle" size={14} color="#10B981" />
                    <Text style={[styles.btnText, { color: '#10B981' }]}>RESOLVE</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                    style={[styles.btn, { backgroundColor: '#EF444420' }]}
                    onPress={() => Alert.alert("Confirm", "Ban this user permanently?", [
                        { text: "Cancel" },
                        { text: "BAN USER", style: 'destructive' }
                    ])}
                >
                    <MaterialCommunityIcons name="account-cancel" size={14} color="#EF4444" />
                    <Text style={[styles.btnText, { color: '#EF4444' }]}>BAN USER</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <Text style={styles.title}>SECURITY & REPORTS</Text>
                <Text style={styles.subtitle}>Manage complaints and user behavior</Text>
            </View>

            {loading ? (
                <ActivityIndicator color="#F43F5E" size="large" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={reports}
                    keyExtractor={(item) => item.id}
                    renderItem={renderReportItem}
                    contentContainerStyle={{ padding: 20 }}
                    ListEmptyComponent={<Text style={styles.empty}>All clear! No reports found.</Text>}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    header: { paddingTop: 60, paddingHorizontal: 25, marginBottom: 20 },
    title: { color: '#fff', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
    subtitle: { color: '#F43F5E', fontSize: 10, fontWeight: 'bold', marginTop: 4, letterSpacing: 1 },
    reportCard: { backgroundColor: '#0F172A', padding: 20, borderRadius: 24, marginBottom: 15, borderWidth: 1, borderColor: '#1E293B' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    severityBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    dot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
    badgeText: { fontSize: 10, fontWeight: '900' },
    timeText: { color: '#475569', fontSize: 10 },
    reportReason: { color: '#fff', fontSize: 15, fontWeight: '700', marginBottom: 15 },
    userLine: { flexDirection: 'row', marginBottom: 6 },
    label: { color: '#475569', fontSize: 10, fontWeight: '900', width: 60 },
    value: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
    actionRow: { flexDirection: 'row', marginTop: 20, borderTopWidth: 1, borderTopColor: '#1E293B', paddingTop: 15 },
    btn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, marginRight: 10 },
    btnText: { fontSize: 11, fontWeight: '900', marginLeft: 6 },
    empty: { color: '#475569', textAlign: 'center', marginTop: 100 }
});

export default ReportedUsers;