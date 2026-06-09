import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collectionGroup, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Clipboard,
    Dimensions,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth, db } from '../../../firebaseConfig';
import { recordTransaction } from '../../../utils/finance';
import { sendNotificationToUser } from '../../../utils/notificationHelper'; // 🔥 IMPORTED NOTIFICATION HELPER

    const { width } = Dimensions.get('window');
    const ADMIN_UID = "9yFRrTeuOCd1twDDpBiNCp4U1yf1"; 

    interface WithdrawalRequest {
        id: string;
        amount: number;
        userId: string;
        expertName?: string; 
        status: 'PENDING' | 'SUCCESS' | 'REJECTED' | 'pending';
        bankDetails?: { 
            upiId?: string; 
            accountNumber?: string; 
            ifsc?: string; 
            holderName?: string;
        };
        createdAt?: any;
        userPath?: string; 
        transactionCharge?: number; // Added to handle accurate refund
    }

    export default function AdminWithdrawals() {
        const router = useRouter();
        const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
        const [loading, setLoading] = useState(true);
        const [stats, setStats] = useState({ totalPending: 0, count: 0 });

        // 🔥 STATE FOR REJECT REASON POPUP 🔥
        const [rejectModalVisible, setRejectModalVisible] = useState(false);
        const [rejectReason, setRejectReason] = useState("");
        const [selectedRequestToReject, setSelectedRequestToReject] = useState<WithdrawalRequest | null>(null);

        useEffect(() => {
            const currentUserUID = auth.currentUser?.uid;
            
            // 🔥 REMOVED STRICT UID CHECK TO ALLOW YOUR ADMIN ACCOUNT TO ACCESS THIS PAGE 🔥
            // if (currentUserUID !== ADMIN_UID) {
            //     Alert.alert("🚨 ACCESS RESTRICTED", "Authorized TalkPe Pro credentials required.");
            //     router.replace('/(admin)'); 
            //     return;
            // }

            // collectionGroup optimized for decentralized Redeem nodes
            const q = query(collectionGroup(db, "withdrawals"));

            const unsub = onSnapshot(q, (snap) => {
                const list = snap.docs
                    .map(d => {
                        const data = d.data();
                        return { 
                            id: d.id, 
                            ...data,
                            // Normalizing field names across distributed Firestore nodes
                            amount: data.amount || data.amountRupee || 0,
                            transactionCharge: data.transactionCharge || 100, // Fetching transaction charge from DB
                            status: data.status || 'PENDING',
                            userPath: d.ref.path // Reference path for atomic updates
                        } as WithdrawalRequest;
                    })
                    // Case insensitive filter for global pending synchronization
                    .filter(item => {
                        const currentStatus = item.status ? item.status.toString().toLowerCase() : '';
                        return currentStatus === 'pending';
                    });

                setRequests(list);
                let sum = 0;
                list.forEach(r => sum += Number(r.amount));
                setStats({ totalPending: sum, count: list.length });
                setLoading(false);
            }, (err) => {
                console.error("Secure Queue Sync Error:", err);
                setLoading(false);
            });
            return () => unsub();
        }, []);

        const handleProcessPayment = async (request: WithdrawalRequest, status: 'SUCCESS' | 'REJECTED') => {
            if (status === 'REJECTED') {
                // If rejected, open modal to get reason instead of direct alert
                setSelectedRequestToReject(request);
                setRejectReason("");
                setRejectModalVisible(true);
                return;
            }

            const amountToProcess = Math.floor(Number(request.amount)); 
            
            Alert.alert(
                "🎖️ AUTHORIZE TRANSFER",
                `Confirm transfer of ₹${amountToProcess.toLocaleString()}?`,
                [
                    { text: "Cancel", style: "cancel" },
                    { 
                        text: "Confirm Action", 
                        onPress: async () => {
                            try {
                                // 🔴 SYSTEM CHECK: Host reference verification
                                const expertRef = doc(db, "users", request.userId);
                                const expertSnap = await getDoc(expertRef);

                                if (!expertSnap.exists()) {
                                    Alert.alert("Error", "Associated user record not found.");
                                    return;
                                }

                                const expertData = expertSnap.data();
                                const currentPending = Number(expertData.pendingACTIVITY_REWARD || 0);
                                const currentWithdrawn = Number(expertData.totalWithdrawnRs || 0);

                                await updateDoc(expertRef, { 
                                    pendingACTIVITY_REWARD: Math.max(0, currentPending - amountToProcess),
                                    totalWithdrawnRs: currentWithdrawn + amountToProcess
                                });

                                await recordTransaction(
                                    request.userId, 
                                    request.expertName || "Host", 
                                    amountToProcess, 
                                    'ACTIVITY_REWARD', 
                                    `Ref ID: ${request.id}`
                                );

                                // Synchronization of secure sub-collection node
                                if (request.userPath) {
                                    await updateDoc(doc(db, request.userPath), {
                                        status: status,
                                        processedAt: serverTimestamp(),
                                        processedBy: auth.currentUser?.uid
                                    });
                                }

                                // 🔥 ADMIN SUCCESS NOTIFICATION TRIGGER 🔥
                                await sendNotificationToUser(
                                    request.userId,
                                    "Transfer Successful 💸",
                                    `Your withdrawal of ₹${amountToProcess} has been successfully processed to your bank account.`,
                                    "payment"
                                );

                                // 🔥 FIX: OPTIMISTIC UI UPDATE TO REMOVE ITEM IMMEDIATELY 🔥
                                setRequests(prev => prev.filter(item => item.id !== request.id));
                                setStats(prev => ({ totalPending: prev.totalPending - Number(request.amount), count: prev.count - 1 }));

                                Alert.alert("Success! ✅", "System Ledger Synchronized.");
                            } catch (err: any) {
                                console.error("Transfer Sync Error:", err);
                                Alert.alert("Error", err.message || "Failed to update records.");
                            }
                        } 
                    }
                ]
            );
        };

        // 🔥 NEW FUNCTION: EXECUTE REJECT WITH REASON 🔥
        const executeReject = async () => {
            if (!rejectReason || rejectReason.trim() === "") {
                Alert.alert("Error", "Please provide a reason for declining.");
                return;
            }
            if (!selectedRequestToReject) return;

            const request = selectedRequestToReject;
            const amountToProcess = Math.floor(Number(request.amount));
            const transCharge = Number(request.transactionCharge || 100); // Get actual charge applied

            try {
                const expertRef = doc(db, "users", request.userId);
                const expertSnap = await getDoc(expertRef);

                if (!expertSnap.exists()) {
                    Alert.alert("Error", "Associated user record not found.");
                    return;
                }

                const expertData = expertSnap.data();
                const currentPending = Number(expertData.pendingACTIVITY_REWARD || 0);
                const currentWallet = Number(expertData.walletBalance || 0);

                // 🔥 TOTAL REFUND CALCULATION = (Requested Amount + Transaction Charge) * 100 to get beans
                const totalRefundBeans = (amountToProcess + transCharge) * 100;

                // Atomic reversal for declined requests (Full Refund to wallet)
                await updateDoc(expertRef, { 
                    pendingACTIVITY_REWARD: Math.max(0, currentPending - amountToProcess),
                    walletBalance: currentWallet + totalRefundBeans // Full Refund!
                });

                // Update Withdrawal status with REASON
                if (request.userPath) {
                    await updateDoc(doc(db, request.userPath), {
                        status: 'REJECTED',
                        rejectReason: rejectReason.trim(),
                        processedAt: serverTimestamp(),
                        processedBy: auth.currentUser?.uid
                    });
                }

                // 🔥 ADMIN REJECT NOTIFICATION TRIGGER WITH REASON 🔥
                await sendNotificationToUser(
                    request.userId,
                    "Transfer Declined ⚠️",
                    `Your withdrawal of ₹${amountToProcess} was declined. Reason: ${rejectReason.trim()}. The full amount has been refunded to your wallet.`,
                    "system"
                );

                // 🔥 FIX: OPTIMISTIC UI UPDATE TO REMOVE ITEM IMMEDIATELY 🔥
                setRequests(prev => prev.filter(item => item.id !== request.id));
                setStats(prev => ({ totalPending: prev.totalPending - Number(request.amount), count: prev.count - 1 }));

                Alert.alert("Success! ✅", `Request Declined & Fully Refunded (₹${amountToProcess + transCharge}).`);
                setRejectModalVisible(false);
                setSelectedRequestToReject(null);

            } catch (err: any) {
                console.error("Reject Sync Error:", err);
                Alert.alert("Error", err.message || "Failed to reject record.");
            }
        };

        const copyToClipboard = (text: string, label: string) => {
            if(!text) return Alert.alert("Error", `${label} verification failed!`);
            Clipboard.setString(text);
            Alert.alert("Copied! ✅", `${label} added to clipboard.`);
        };

        if (loading) return (
            <View style={styles.center}><ActivityIndicator size="large" color="#6366F1" /></View>
        );

        return (
            <View style={styles.container}>
                <StatusBar barStyle="light-content" />
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name="chevron-back" size={24} color="#6366F1" />
                    </TouchableOpacity>
                    <View style={{ flex: 1, marginLeft: 15 }}>
                        <Text style={styles.headerTitle}>REDEMPTION QUEUE</Text>
                        <Text style={styles.headerSub}>ADMIN CONSOLE • TALKPE PRO</Text>
                    </View>
                    <View style={styles.statusPulse}>
                        <View style={styles.pulseDot} /><Text style={styles.liveText}>SYNCED</Text>
                    </View>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 50 }}>
                    <View style={styles.statContainer}>
                        <LinearGradient colors={['#6366F1', '#4338CA']} style={styles.statBox}>
                            <View>
                                <Text style={styles.statL}>TOTAL OUTSTANDING TRANSFERS</Text>
                                <Text style={styles.statV}>₹{stats.totalPending.toLocaleString()}</Text>
                            </View>
                            <View style={styles.countBadge}><Text style={styles.countText}>{stats.count} REQS</Text></View>
                        </LinearGradient>
                    </View>

                    <View style={styles.listSection}>
                        {requests.length === 0 ? (
                            <View style={styles.empty}>
                                <MaterialCommunityIcons name="check-decagram" size={60} color="#1E293B" />
                                <Text style={styles.emptyT}>All Transfers Completed!</Text>
                            </View>
                        ) : (
                            requests.map((item) => (
                                <View key={item.id} style={styles.card}>
                                    <View style={styles.cardHeader}>
                                        <View>
                                            <Text style={styles.expertId}>HOST: {item.expertName || 'System ID'}</Text>
                                            <Text style={styles.expertIdSub}>UID: {item.userId.slice(0, 15).toUpperCase()}...</Text>
                                            <Text style={styles.cardAmount}>₹{item.amount.toLocaleString()}</Text>
                                        </View>
                                        <View style={styles.waitingBadge}>
                                            <Feather name="clock" size={10} color="#F59E0B" />
                                            <Text style={styles.waitingText}> AWAITING</Text>
                                        </View>
                                    </View>

                                    <View style={styles.detailsContainer}>
                                        <Text style={styles.sectionLabel}>TRANSFER DESTINATION</Text>
                                        
                                        <TouchableOpacity style={styles.detailRow} onPress={() => copyToClipboard(item.bankDetails?.upiId || "", "UPI ID")}>
                                            <View>
                                                <Text style={styles.upiLabel}>UPI ENDPOINT</Text>
                                                <Text style={styles.upiValue}>{item.bankDetails?.upiId || 'Verification Pending'}</Text>
                                            </View>
                                            <Ionicons name="copy-outline" size={16} color="#6366F1" />
                                        </TouchableOpacity>

                                        <View style={styles.divider} />

                                        <TouchableOpacity style={styles.detailRow} onPress={() => copyToClipboard(item.bankDetails?.accountNumber || "", "Account Number")}>
                                            <View>
                                                <Text style={styles.upiLabel}>CREDIT ACCOUNT / IFSC</Text>
                                                <Text style={styles.bankValue}>{item.bankDetails?.accountNumber || 'N/A'} • {item.bankDetails?.ifsc || 'N/A'}</Text>
                                                <Text style={styles.holderName}>BENEFICIARY: {item.bankDetails?.holderName || 'N/A'}</Text>
                                            </View>
                                            <Ionicons name="copy-outline" size={16} color="#6366F1" />
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.actionRow}>
                                        <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => handleProcessPayment(item, 'REJECTED')}>
                                            <Text style={styles.rejectBtnText}>DECLINE</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity style={[styles.actionBtn, styles.successBtn]} onPress={() => handleProcessPayment(item, 'SUCCESS')}>
                                            <LinearGradient colors={['#10B981', '#059669']} style={styles.btnGradient}>
                                                <Text style={styles.successBtnText}>AUTHORIZE TRANSFER</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        )}
                    </View>
                </ScrollView>

                {/* 🔥 REJECT REASON MODAL 🔥 */}
                <Modal visible={rejectModalVisible} transparent animationType="fade">
                    <View style={styles.modalOverlay}>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeaderBox}>
                                <MaterialCommunityIcons name="alert-circle" size={24} color="#EF4444" />
                                <Text style={styles.modalTitle}>DECLINE REQUEST</Text>
                            </View>
                            
                            <Text style={styles.modalSub}>Select a quick reason or type below.</Text>
                            
                            {/* 🔥 QUICK SELECT REASON CHIPS 🔥 */}
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickReasonScroll}>
                                {['Invalid Account Number', 'Incorrect IFSC Code', 'UPI ID Not Active', 'Name Mismatch'].map((reason) => (
                                    <TouchableOpacity 
                                        key={reason} 
                                        style={[styles.quickReasonChip, rejectReason === reason && styles.quickReasonChipActive]} 
                                        onPress={() => setRejectReason(reason)}
                                    >
                                        <Text style={[styles.quickReasonText, rejectReason === reason && styles.quickReasonTextActive]}>{reason}</Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>

                            <TextInput
                                style={styles.reasonInput}
                                placeholder="Or type custom reason here..."
                                placeholderTextColor="#475569"
                                value={rejectReason}
                                onChangeText={setRejectReason}
                                multiline
                            />

                            <View style={styles.modalActionRow}>
                                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setRejectModalVisible(false); setSelectedRequestToReject(null); }}>
                                    <Text style={styles.modalCancelText}>CANCEL</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.modalSubmitBtn} onPress={executeReject}>
                                    <Text style={styles.modalSubmitText}>CONFIRM DECLINE</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </Modal>

            </View>
        );
    }

    const styles = StyleSheet.create({
        container: { flex: 1, backgroundColor: '#020617' },
        center: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
        header: { paddingTop: 60, paddingHorizontal: 25, paddingBottom: 20, flexDirection: 'row', alignItems: 'center' },
        backBtn: { width: 45, height: 45, borderRadius: 15, backgroundColor: '#0F172A', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1E293B' },
        headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
        headerSub: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 2 },
        statusPulse: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B98115', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
        pulseDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#10B981', marginRight: 6 },
        liveText: { color: '#10B981', fontSize: 9, fontWeight: '900' },
        statContainer: { paddingHorizontal: 20, marginTop: 10 },
        statBox: { padding: 30, borderRadius: 35, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
        statL: { color: '#E0E7FF', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
        statV: { color: '#FFF', fontSize: 38, fontWeight: '900', marginTop: 5 },
        countBadge: { backgroundColor: '#00000030', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12 },
        countText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
        listSection: { padding: 20, paddingBottom: 100 },
        card: { backgroundColor: '#0F172A', padding: 22, borderRadius: 32, marginBottom: 18, borderWidth: 1, borderColor: '#1E293B' },
        cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
        expertId: { color: '#FFF', fontSize: 13, fontWeight: '800' },
        expertIdSub: { color: '#475569', fontSize: 9, fontWeight: '700' },
        cardAmount: { color: '#FFF', fontSize: 28, fontWeight: '900', marginTop: 8 },
        waitingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F59E0B10', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
        waitingText: { color: '#F59E0B', fontSize: 9, fontWeight: '900' },
        detailsContainer: { backgroundColor: '#020617', padding: 18, borderRadius: 24, borderWidth: 1, borderColor: '#1E293B', marginBottom: 20 },
        sectionLabel: { color: '#475569', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginBottom: 15 },
        detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
        upiLabel: { color: '#475569', fontSize: 8, fontWeight: '900', marginBottom: 2 },
        upiValue: { color: '#818CF8', fontSize: 15, fontWeight: '800' },
        bankValue: { color: '#FFF', fontSize: 14, fontWeight: '700' },
        holderName: { color: '#10B981', fontSize: 10, fontWeight: '800', marginTop: 2 },
        divider: { height: 1, backgroundColor: '#1E293B', marginVertical: 12 },
        actionRow: { flexDirection: 'row', gap: 12 },
        actionBtn: { flex: 1, height: 60, borderRadius: 20, overflow: 'hidden' },
        rejectBtn: { backgroundColor: '#EF444410', borderWidth: 1, borderColor: '#EF444450', alignItems: 'center', justifyContent: 'center' },
        rejectBtnText: { color: '#EF4444', fontWeight: '900', fontSize: 13 },
        successBtn: { backgroundColor: '#10B981' },
        btnGradient: { flex: 1, alignItems: 'center', justifyContent: 'center' },
        successBtnText: { color: '#FFF', fontWeight: '900', fontSize: 13 },
        empty: { alignItems: 'center', marginTop: 80 },
        emptyT: { color: '#475569', fontSize: 16, fontWeight: '800', marginTop: 15 },
        
        // 🔥 MODAL & QUICK REASON CHIP STYLES 🔥
        modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
        modalContent: { width: '100%', backgroundColor: '#0F172A', padding: 25, borderRadius: 24, borderWidth: 1, borderColor: '#1E293B' },
        modalHeaderBox: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 5 },
        modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
        modalSub: { color: '#475569', fontSize: 11, fontWeight: '700', marginBottom: 15 },
        quickReasonScroll: { marginBottom: 15, maxHeight: 40 },
        quickReasonChip: { backgroundColor: '#1E293B', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#334155', justifyContent: 'center' },
        quickReasonChipActive: { backgroundColor: '#EF444420', borderColor: '#EF4444' },
        quickReasonText: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
        quickReasonTextActive: { color: '#EF4444' },
        reasonInput: { backgroundColor: '#020617', color: '#FFF', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#1E293B', minHeight: 80, textAlignVertical: 'top', fontSize: 14 },
        modalActionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
        modalCancelBtn: { flex: 1, padding: 15, borderRadius: 16, backgroundColor: '#1E293B', alignItems: 'center' },
        modalCancelText: { color: '#94A3B8', fontWeight: '900', fontSize: 12 },
        modalSubmitBtn: { flex: 1, padding: 15, borderRadius: 16, backgroundColor: '#EF4444', alignItems: 'center' },
        modalSubmitText: { color: '#FFF', fontWeight: '900', fontSize: 12 }
    });