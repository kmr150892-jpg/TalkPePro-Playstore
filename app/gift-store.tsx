import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig'; // Adjust path if needed

const { width } = Dimensions.get('window');

// 🔥 REWARD CATALOG WITH PROFESSIONAL FULFILLMENT ASSETS 🔥
const REWARDS = [
    {
        id: 'amazon_500',
        name: 'Amazon eGift Card',
        value: '500 Credits',
        cost: 100000,
        color: '#F59E0B',
        image: 'https://www.google.com/s2/favicons?domain=amazon.in&sz=128',
        desc: 'Digital shopping credits dispatched to your registered email.'
    },
    {
        id: 'flipkart_1000',
        name: 'Flipkart Gift Card',
        value: '1000 Credits',
        cost: 200000,
        color: '#3B82F6',
        image: 'https://www.google.com/s2/favicons?domain=flipkart.com&sz=128',
        desc: 'Redeemable credits across millions of products on the Flipkart platform.'
    },
    {
        id: 'swiggy_2500',
        name: 'Swiggy Voucher',
        value: '2500 Credits',
        cost: 500000,
        color: '#FC8019',
        image: 'https://www.google.com/s2/favicons?domain=swiggy.com&sz=128',
        desc: 'Professional dining and delivery credits for your convenience.'
    }
];

export default function GiftStoreScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    const [userData, setUserData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [successModal, setSuccessModal] = useState(false);
    const [myRequests, setMyRequests] = useState<any[]>([]); // 🔥 NEW: Track User's Requests

    // 🔥 FETCH USER DATA (MAIN WALLET BALANCE) 🔥
    useEffect(() => {
        if (!user?.uid) return;

        const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                setUserData(snap.data());
            }
            setLoading(false);
        });

        return () => unsubUser();
    }, [user?.uid]);

    // 🔥 FETCH USER'S REDEMPTION HISTORY (LIVE TRACKING) 🔥
    useEffect(() => {
        if (!user?.uid) return;

        const qReq = query(collection(db, "reward_requests"), where("userId", "==", user.uid));
        const unsubReq = onSnapshot(qReq, (snap) => {
            let reqs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Client-side sorting (Newest first) to avoid Firestore Indexing Errors
            reqs.sort((a: any, b: any) => {
                 const timeA = a.requestDate?.toMillis ? a.requestDate.toMillis() : 0;
                 const timeB = b.requestDate?.toMillis ? b.requestDate.toMillis() : 0;
                 return timeB - timeA;
            });
            
            setMyRequests(reqs);
        });

        return () => unsubReq();
    }, [user?.uid]);

    // 🔥 FIXED: Strictly mapped to Main Wallet Balance (balance field) from DB
    const userBalance = userData?.balance || 0; 

    // 🔥 REDEMPTION LOGIC 🔥
    const handleRedeem = async (reward: any) => {
        if (userBalance < reward.cost) {
            Alert.alert("Insufficient Balance", `You require ${reward.cost.toLocaleString()} 💎 to unlock this reward. Current wallet: ${userBalance.toLocaleString()} 💎.`);
            return;
        }

        Alert.alert(
            "Confirm Claim",
            `Do you wish to exchange ${reward.cost.toLocaleString()} 💎 for a ${reward.value} ${reward.name}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Confirm",
                    style: "default",
                    onPress: async () => {
                        setProcessing(true);
                        try {
                            const newBalance = userBalance - reward.cost;

                            // 1. Deduct balance from Main Wallet (Only 'balance' field is updated)
                            await updateDoc(doc(db, "users", user!.uid), {
                                balance: newBalance
                            });

                            // 2. Add Transaction to History
                            await addDoc(collection(db, "transactions"), {
                                userId: user!.uid,
                                type: "LOYALTY_REDEMPTION",
                                title: `Unlocked ${reward.name}`,
                                amount: reward.cost,
                                status: "success",
                                timestamp: serverTimestamp()
                            });

                            // 🔥 SMART NAME FETCHER: Falls back to email prefix if name is empty 🔥
                            const userEmailStr = user!.email || userData?.email || '';
                            const emailPrefix = userEmailStr ? userEmailStr.split('@')[0] : 'TalkPe Pro User';
                            const finalUserName = userData?.name || userData?.displayName || userData?.userName || user?.displayName || emailPrefix;

                            // 3. Create a request for the Admin in "reward_requests" collection
                            await addDoc(collection(db, "reward_requests"), {
                                userId: user!.uid,
                                userName: finalUserName,
                                userEmail: userEmailStr || 'No Email Provided',
                                voucherName: reward.name,
                                voucherValue: reward.value,
                                costDeducted: reward.cost,
                                status: "Pending",
                                requestDate: serverTimestamp()
                            });

                            setProcessing(false);
                            setSuccessModal(true); // Show Success UI

                        } catch (error) {
                            console.error(error);
                            Alert.alert("Sync Error", "Could not complete the request. Please verify your connection.");
                            setProcessing(false);
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#10B981" />
            </View>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <LinearGradient colors={['#0F172A', '#020617', '#000000']} style={StyleSheet.absoluteFill} />

            {/* HEADER HUD */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Redemption Center</Text>
                    <Text style={styles.headerSub}>Loyalty Rewards Program</Text>
                </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 20, paddingBottom: 50 }}>
                
                {/* WALLET ASSETS CARD */}
                <LinearGradient colors={['rgba(16, 185, 129, 0.15)', 'rgba(2, 6, 23, 0.8)']} style={styles.balanceCard}>
                    <View style={styles.balanceHeader}>
                        <Text style={styles.balanceLabel}>TOTAL ACCOUNT ASSETS</Text>
                        <MaterialCommunityIcons name="diamond-stone" size={24} color="#10B981" />
                    </View>
                    <Text style={styles.balanceValue}>{userBalance.toLocaleString()}</Text>
                    <Text style={styles.balanceDesc}>Utilize your verified assets to connect with experts or claim premium loyalty vouchers.</Text>
                </LinearGradient>

                <Text style={styles.catalogTitle}>REWARD CATALOG</Text>

                {/* VOUCHER LIST */}
                {REWARDS.map((reward, index) => (
                    <View key={index} style={[styles.rewardCard, { borderColor: reward.color + '40' }]}>
                        <View style={styles.rewardIconBox}>
                            <Image source={{ uri: reward.image }} style={{ width: 45, height: 45, resizeMode: 'contain' }} />
                        </View>
                        <View style={styles.rewardInfo}>
                            <Text style={[styles.rewardValue, { color: reward.color }]}>{reward.value}</Text>
                            <Text style={styles.rewardName}>{reward.name}</Text>
                            <Text style={styles.rewardDesc}>{reward.desc}</Text>
                            
                            <TouchableOpacity 
                                style={[styles.redeemBtn, { backgroundColor: userBalance >= reward.cost ? reward.color : '#334155' }]}
                                onPress={() => handleRedeem(reward)}
                                disabled={processing} 
                            >
                                {processing ? (
                                    <ActivityIndicator size="small" color="#FFF" />
                                ) : (
                                    <Text style={styles.redeemBtnText}>
                                        CLAIM FOR {reward.cost.toLocaleString()} 💎
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}

                {/* REDEMPTION HISTORY TRACKER */}
                {myRequests.length > 0 && (
                    <View style={styles.requestsContainer}>
                        <Text style={[styles.catalogTitle, { marginTop: 25 }]}>MY CLAIM HISTORY</Text>
                        {myRequests.map((req, index) => {
                            const isPending = req.status === 'Pending';
                            const isDelivered = req.status === 'Delivered';
                            const statusColor = isPending ? '#F59E0B' : (isDelivered ? '#10B981' : '#EF4444');
                            
                            const timeVal = req.requestDate;
                            let displayTime = 'Synchronizing...';
                            if (timeVal) {
                                const dateObj = timeVal.toDate ? timeVal.toDate() : new Date(timeVal);
                                displayTime = dateObj.toLocaleDateString() + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                            }

                            return (
                                <View key={req.id || index} style={[styles.reqCard, { borderLeftColor: statusColor }]}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.reqTitle}>{req.voucherValue} {req.voucherName}</Text>
                                        <Text style={styles.reqDate}>{displayTime}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.reqCost}>-{req.costDeducted?.toLocaleString()} 💎</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                                            <Text style={[styles.statusText, { color: statusColor }]}>{req.status.toUpperCase()}</Text>
                                        </View>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}

            </ScrollView>

            {/* FULFILLMENT STATUS MODAL */}
            <Modal visible={successModal} animationType="fade" transparent={true}>
                <BlurView intensity={90} tint="dark" style={styles.modalOverlay}>
                    <View style={styles.successBox}>
                        <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                        <Text style={styles.successTitle}>Request Logged</Text>
                        <Text style={styles.successText}>
                            Your reward claim has been successfully registered. The administration will verify the session integrity and dispatch the voucher code to your registered email address within 24-48 business hours.
                        </Text>
                        <TouchableOpacity style={styles.successBtn} onPress={() => {
                            setSuccessModal(false);
                        }}>
                            <Text style={styles.successBtnText}>ACKNOWLEDGE</Text>
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20, gap: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
    backBtn: { width: 45, height: 45, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    headerTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 0.5 },
    headerSub: { color: '#10B981', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
    balanceCard: { padding: 25, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)', marginBottom: 30 },
    balanceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    balanceLabel: { color: '#94A3B8', fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
    balanceValue: { color: '#FFF', fontSize: 40, fontWeight: '900', marginVertical: 10 },
    balanceDesc: { color: 'rgba(255,255,255,0.6)', fontSize: 11, fontWeight: '600', lineHeight: 16 },
    catalogTitle: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1.5, marginBottom: 15, marginLeft: 5 },
    rewardCard: { flexDirection: 'row', backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 20, padding: 15, marginBottom: 15, borderWidth: 1 },
    rewardIconBox: { width: 70, height: 70, backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 15, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    rewardInfo: { flex: 1 },
    rewardValue: { fontSize: 16, fontWeight: '900', marginBottom: 2 },
    rewardName: { color: '#FFF', fontSize: 14, fontWeight: '800', marginBottom: 5 },
    rewardDesc: { color: '#94A3B8', fontSize: 11, fontWeight: '500', lineHeight: 16, marginBottom: 15 },
    redeemBtn: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    redeemBtnText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    requestsContainer: { marginTop: 10 },
    reqCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(15, 23, 42, 0.8)', padding: 15, borderRadius: 15, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderLeftWidth: 4 },
    reqTitle: { color: '#FFF', fontSize: 13, fontWeight: '800', marginBottom: 4 },
    reqDate: { color: '#94A3B8', fontSize: 10, fontWeight: '600' },
    reqCost: { color: '#EF4444', fontSize: 14, fontWeight: '900', marginBottom: 4 },
    statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
    statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    successBox: { backgroundColor: '#0F172A', padding: 30, borderRadius: 30, alignItems: 'center', borderWidth: 1, borderColor: '#1E293B', width: '100%' },
    successTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 15, marginBottom: 10 },
    successText: { color: '#94A3B8', fontSize: 13, fontWeight: '600', textAlign: 'center', lineHeight: 22, marginBottom: 25 },
    successBtn: { backgroundColor: '#10B981', width: '100%', paddingVertical: 15, borderRadius: 15, alignItems: 'center' },
    successBtnText: { color: '#020617', fontSize: 13, fontWeight: '900', letterSpacing: 1 }
});