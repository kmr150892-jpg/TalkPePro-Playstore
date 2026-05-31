import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

export default function AdminRewardRequestsScreen() {
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    // 🔥 FETCH ALL GRANT REQUESTS (Real-time) 🔥
    useEffect(() => {
        const q = query(collection(db, "reward_requests"), orderBy("requestDate", "desc"));
        const unsub = onSnapshot(q, (snap) => {
            const reqData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRequests(reqData);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    // ✅ AUTHORIZE GRANT PROTOCOL ✅
    const handleApprove = async (req: any) => {
        Alert.alert(
            "Authorize Grant Fulfillment?",
            `Confirm delivery of ${req.voucherValue} ${req.voucherName} to ${req.userEmail}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm Delivery",
                    style: "default",
                    onPress: async () => {
                        setProcessingId(req.id);
                        try {
                            // 1. Update Request Status to Delivered in central ledger
                            await updateDoc(doc(db, "reward_requests", req.id), {
                                status: "Delivered",
                                processedDate: serverTimestamp()
                            });

                            // 2. Synchronize associated transaction node to success
                            const txQuery = query(collection(db, "transactions"), 
                                where("userId", "==", req.userId), 
                                where("type", "==", "VOUCHER_REDEEM"),
                                where("status", "==", "pending")
                            );
                            const txSnap = await getDocs(txQuery);
                            txSnap.forEach(async (txDoc) => {
                                await updateDoc(doc(db, "transactions", txDoc.id), {
                                    status: "success"
                                });
                            });

                            Alert.alert("Success", "System Grant Marked as Fulfilled.");
                        } catch (error) {
                            console.error(error);
                            Alert.alert("Error", "Failed to synchronize grant record.");
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };

    // ❌ DECLINE & REVERSAL PROTOCOL ❌
    const handleReject = async (req: any) => {
        Alert.alert(
            "Decline & Unit Reversal?",
            `This will decline the request and reverse ${req.costDeducted} units back to the user wallet. Proceed?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Decline & Reverse",
                    style: "destructive",
                    onPress: async () => {
                        setProcessingId(req.id);
                        try {
                            // 1. Update Request Status to Rejected for audit trail
                            await updateDoc(doc(db, "reward_requests", req.id), {
                                status: "Rejected",
                                processedDate: serverTimestamp()
                            });

                            // 2. Atomic reversal of units back to user profile
                            await updateDoc(doc(db, "users", req.userId), {
                                balance: increment(req.costDeducted),
                                beansBalance: increment(req.costDeducted),
                                walletBalance: increment(req.costDeducted)
                            });

                            // 3. Update associated transaction node as failed/reversed
                            const txQuery = query(collection(db, "transactions"), 
                                where("userId", "==", req.userId), 
                                where("type", "==", "VOUCHER_REDEEM"),
                                where("status", "==", "pending")
                            );
                            const txSnap = await getDocs(txQuery);
                            txSnap.forEach(async (txDoc) => {
                                await updateDoc(doc(db, "transactions", txDoc.id), {
                                    status: "failed",
                                    title: `Reversed: ${req.voucherName}`
                                });
                            });

                            Alert.alert("Reversed", "Request declined and units synchronized.");
                        } catch (error) {
                            console.error(error);
                            Alert.alert("Error", "Failed to process grant reversal.");
                        } finally {
                            setProcessingId(null);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#3B82F6" />
                <Text style={styles.loaderText}>SYNCHRONIZING SECURE LOGS...</Text>
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <LinearGradient colors={['#0F172A', '#020617', '#000000']} style={StyleSheet.absoluteFill} />

            {/* 🛡️ SYSTEM HEADER */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>System Grants</Text>
                    <Text style={styles.headerSub}>Operational Control Center</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                
                {requests.length === 0 ? (
                    <View style={styles.emptyBox}>
                        <MaterialCommunityIcons name="inbox-outline" size={60} color="rgba(255,255,255,0.2)" />
                        <Text style={styles.emptyText}>No pending allocations found.</Text>
                    </View>
                ) : (
                    requests.map((req) => {
                        const isPending = req.status === 'Pending';
                        const isDelivered = req.status === 'Delivered';
                        const statusColor = isPending ? '#F59E0B' : (isDelivered ? '#10B981' : '#EF4444');

                        return (
                            <View key={req.id} style={[styles.reqCard, { borderLeftColor: statusColor }]}>
                                <View style={styles.reqHeader}>
                                    <Text style={styles.reqUser}>{req.userName}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                                        <Text style={[styles.statusText, { color: statusColor }]}>{req.status.toUpperCase()}</Text>
                                    </View>
                                </View>
                                
                                <Text style={styles.reqEmail}><Ionicons name="mail" size={12} /> {req.userEmail}</Text>
                                
                                <View style={styles.divider} />
                                
                                <View style={styles.detailsRow}>
                                    <View>
                                        <Text style={styles.detailLabel}>REQUESTED ALLOCATION</Text>
                                        <Text style={styles.detailValue}>{req.voucherValue} {req.voucherName}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.detailLabel}>ALLOCATION COST</Text>
                                        <Text style={styles.detailDiamond}>{req.costDeducted.toLocaleString()} 💎</Text>
                                    </View>
                                </View>

                                {/* OPERATIONAL ACTIONS (Visible only for Pending Status) */}
                                {isPending && (
                                    <View style={styles.actionRow}>
                                        <TouchableOpacity 
                                            style={[styles.actionBtn, styles.rejectBtn]} 
                                            onPress={() => handleReject(req)}
                                            disabled={processingId === req.id}
                                        >
                                            {processingId === req.id ? <ActivityIndicator size="small" color="#FFF"/> : <Text style={styles.rejectText}>DECLINE & REVERSE</Text>}
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity 
                                            style={[styles.actionBtn, styles.approveBtn]} 
                                            onPress={() => handleApprove(req)}
                                            disabled={processingId === req.id}
                                        >
                                            {processingId === req.id ? <ActivityIndicator size="small" color="#FFF"/> : <Text style={styles.approveText}>COMMIT DELIVERY</Text>}
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>
                        );
                    })
                )}
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    loaderText: { color: '#3B82F6', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 15 },
    
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, gap: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { width: 45, height: 45, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    headerTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 0.5 },
    headerSub: { color: '#3B82F6', fontSize: 11, fontWeight: '700', letterSpacing: 1 },

    scrollContent: { padding: 20, paddingBottom: 50 },

    emptyBox: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 13, fontWeight: '700', marginTop: 15, letterSpacing: 1 },

    reqCard: { backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: 20, borderRadius: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderLeftWidth: 4 },
    reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
    reqUser: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    reqEmail: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
    
    divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', marginVertical: 15 },
    
    detailsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    detailLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 9, fontWeight: '800', letterSpacing: 1, marginBottom: 4 },
    detailValue: { color: '#FFF', fontSize: 14, fontWeight: '800' },
    detailDiamond: { color: '#3B82F6', fontSize: 16, fontWeight: '900' },

    actionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
    actionBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    rejectBtn: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)' },
    rejectText: { color: '#EF4444', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    approveBtn: { backgroundColor: '#10B981' },
    approveText: { color: '#020617', fontSize: 11, fontWeight: '900', letterSpacing: 1 }
});