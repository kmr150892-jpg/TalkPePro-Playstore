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
    const [adminAlerts, setAdminAlerts] = useState<any[]>([]); // 🔥 SYSTEM LOGIC: Moderation Alerts State
    const [usersMap, setUsersMap] = useState<Record<string, any>>({}); // 🔥 SYSTEM LOGIC: Global Security Mapping
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 🔥 SYSTEM LOGIC: Monitoring User Nodes for Safety Compliance (Red Siren Protocol)
        const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
            const map: Record<string, any> = {};
            snap.docs.forEach(d => { map[d.id] = d.data(); });
            setUsersMap(map);
        });

        // 🚨 LIVE AUDIT: Community generated reports synchronized by timestamp
        const q = query(collection(db, "reports"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snap) => {
            setReports(snap.docs.map(d => ({ id: d.id, _collection: 'reports', ...d.data() })));
            setLoading(false);
        });

        // 🔥 SYSTEM LOGIC: Fetching Internal Consultant Safety Alerts
        const qAlerts = query(collection(db, "admin_alerts"), orderBy("timestamp", "desc"));
        const unsubAlerts = onSnapshot(qAlerts, (snap) => {
            setAdminAlerts(snap.docs.map(d => ({ id: d.id, _collection: 'admin_alerts', ...d.data() })));
        });

        return () => { 
            unsubscribe(); 
            unsubAlerts(); 
            unsubUsers(); 
        };
    }, []);

    // 🔥 SYSTEM LOGIC: Synchronizing dual moderation streams into chronological sequence
    const combinedData = [...reports, ...adminAlerts].sort((a, b) => {
        const timeA = a.createdAt?.seconds || a.timestamp?.seconds || 0;
        const timeB = b.createdAt?.seconds || b.timestamp?.seconds || 0;
        return timeB - timeA;
    });

    const handleAction = async (reportId: string, status: string, collectionName: string = "reports") => {
        try {
            await updateDoc(doc(db, collectionName, reportId), { status: status });
            Alert.alert("Success", `Audit record marked as ${status}`);
        } catch (error) {
            console.error(error);
        }
    };

    // 🔥 SYSTEM LOGIC: Permanent Access Restriction Protocol
    const handleBanUser = async (targetUserId: string | undefined, reportId: string, collectionName: string) => {
        Alert.alert("Confirm Restriction", "Permanently restrict this user's platform access?", [
            { text: "Cancel", style: "cancel" },
            { 
                text: "RESTRICT ACCESS", 
                style: 'destructive',
                onPress: async () => {
                    try {
                        if (targetUserId) {
                            // Triggers instantaneous credential synchronization and session termination
                            await updateDoc(doc(db, "users", targetUserId), {
                                isBlocked: true,
                                status: 'Blocked',
                                forceLogout: true 
                            });
                        }
                        await updateDoc(doc(db, collectionName, reportId), { status: 'resolved' });
                        Alert.alert("RESTRICTED", "User has been permanently restricted from the platform.");
                    } catch (e) {
                        Alert.alert("Error", "Failed to modify user access.");
                    }
                }
            }
        ]);
    };

    const renderReportItem = ({ item }: any) => {
        // 🔥 SYSTEM LOGIC: Dynamic mapping for multi-source moderation alerts
        const isAlert = item._collection === 'admin_alerts';
        const reporterLabel = isAlert ? item.expertName : item.reporterName;
        const reporterRoleLabel = isAlert ? 'CONSULTANT' : item.reporterRole;
        const reportedLabel = isAlert ? item.userName : item.reportedName;
        const targetUserId = isAlert ? item.userId : item.reportedId;
        const timeSecs = item.createdAt?.seconds || item.timestamp?.seconds;

        // 🔥 CRITICAL COMPLIANCE CHECK (Red Siren)
        const targetUser = usersMap[targetUserId || ''];
        const blockCount = targetUser?.expertBlockCount || 0;
        const isCriticalRisk = blockCount >= 5;

        return (
            <View style={[styles.reportCard, item.status === 'resolved' && { opacity: 0.6 }, isCriticalRisk && styles.criticalCard]}>
                <View style={styles.cardHeader}>
                    <View style={[styles.severityBadge, { backgroundColor: isCriticalRisk ? '#EF4444' : (item.priority === 'HIGH' || isAlert ? '#EF444420' : '#F59E0B20') }]}>
                        <View style={[styles.dot, { backgroundColor: isCriticalRisk ? '#FFF' : (item.priority === 'HIGH' || isAlert ? '#EF4444' : '#F59E0B') }]} />
                        <Text style={[styles.badgeText, { color: isCriticalRisk ? '#FFF' : (item.priority === 'HIGH' || isAlert ? '#EF4444' : '#F59E0B') }]}>
                            {isCriticalRisk ? `CRITICAL: ${blockCount} FLAGS` : (item.priority || (isAlert ? 'SERVICE ALERT' : 'STANDARD'))}
                        </Text>
                    </View>
                    <Text style={styles.timeText}>{timeSecs ? new Date(timeSecs * 1000).toLocaleDateString() : 'Recent'}</Text>
                </View>

                {/* 🔥 RED ALERT SAFETY WARNING 🔥 */}
                {isCriticalRisk && (
                    <Text style={styles.sirenText}>🚨 SAFETY WARNING: THIS USER HAS BEEN RESTRICTED BY {blockCount} CONSULTANTS. IMMEDIATE REVIEW REQUIRED.</Text>
                )}

                <Text style={styles.reportReason}>{item.reason || 'No specific reason documented'}</Text>
                
                <View style={styles.userLine}>
                    <Text style={styles.label}>SOURCE:</Text>
                    <Text style={styles.value}>{reporterLabel} ({reporterRoleLabel})</Text>
                </View>
                <View style={styles.userLine}>
                    <Text style={styles.label}>TARGET:</Text>
                    <Text style={styles.value}>{reportedLabel}</Text>
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity 
                        style={[styles.btn, { backgroundColor: '#10B98120' }]} 
                        onPress={() => handleAction(item.id, 'resolved', item._collection)}
                    >
                        <Feather name="check-circle" size={14} color="#10B981" />
                        <Text style={[styles.btnText, { color: '#10B981' }]}>RESOLVE</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.btn, { backgroundColor: '#EF444420' }]}
                        onPress={() => handleBanUser(targetUserId, item.id, item._collection)}
                    >
                        <MaterialCommunityIcons name="account-cancel" size={14} color="#EF4444" />
                        <Text style={[styles.btnText, { color: '#EF4444' }]}>RESTRICT</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <Text style={styles.title}>PLATFORM MODERATION</Text>
                <Text style={styles.subtitle}>Community safety and compliance terminal</Text>
            </View>

            {loading ? (
                <ActivityIndicator color="#F43F5E" size="large" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={combinedData}
                    keyExtractor={(item) => item.id}
                    renderItem={renderReportItem}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ padding: 20 }}
                    ListEmptyComponent={<Text style={styles.empty}>System clear. No safety reports documented.</Text>}
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
    empty: { color: '#475569', textAlign: 'center', marginTop: 100 },
    criticalCard: { borderColor: '#EF4444', borderWidth: 2, backgroundColor: 'rgba(239, 68, 68, 0.08)' },
    sirenText: { color: '#EF4444', fontSize: 10, fontWeight: '900', marginBottom: 15, letterSpacing: 0.5 },
});

export default ReportedUsers;