import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection, doc, increment, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { auth, db } from '../../../firebaseConfig';
import { sendNotificationToUser } from '../../../utils/notificationHelper'; // 🔥 NOTIFICATION IMPORT

const { width, height } = Dimensions.get('window');

// ✅ ACCURATE THEME & LEVEL CONFIG (LOCKED DEEP-GLOW COLORS)
const getLevelConfig = (beans: number) => {
    if (beans >= 100000000) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'], glow: '#F59E0B', next: 0, prev: 50000000, rate: 8000 };
    if (beans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'], glow: '#EC4899', next: 100000000, prev: 30000000, rate: 7000 };
    if (beans >= 30000000) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'], glow: '#8B5CF6', next: 50000000, prev: 10000000, rate: 5400 };
    if (beans >= 10000000) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'], glow: '#3B82F6', next: 30000000, prev: 5000000, rate: 4800 };
    if (beans >= 5000000)  return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'], glow: '#06B6D4', next: 10000000, prev: 3000000, rate: 4200 };
    if (beans >= 3000000)  return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'], glow: '#10B981', next: 5000000, prev: 1000000, rate: 3600 };
    if (beans >= 1000000)  return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'], glow: '#EAB308', next: 3000000, prev: 300000, rate: 3000 };
    if (beans >= 300000)   return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'], glow: '#94A3B8', next: 1000000, prev: 100000, rate: 2400 };
    if (beans >= 100000)   return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'], glow: 'transparent', next: 300000, prev: 30000, rate: 1800 };
    if (beans >= 30000)    return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'], glow: 'transparent', next: 100000, prev: 0, rate: 1200 };
    return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'], glow: 'transparent', next: 30000, prev: 0, rate: 1000 };
};

export default function WalletSystem({ expertData }: any) {
    const [user, setUser] = useState(auth.currentUser); 
    const [modalVisible, setModalVisible] = useState(false);
    const [editBankVisible, setEditBankVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [amount, setAmount] = useState('');
    const [transactions, setTransactions] = useState<any[]>([]);
    
    const [bankDetails, setBankDetails] = useState({
        holderName: expertData?.bankDetails?.holderName || '',
        accountNumber: expertData?.bankDetails?.accountNumber || '',
        ifsc: expertData?.bankDetails?.ifsc || '',
        upiId: expertData?.bankDetails?.upiId || ''
    });

    const [idProofImage, setIdProofImage] = useState(expertData?.idProof || null);

    // 🔥 ANIMATION REF
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    // 🔥 DYNAMIC THEME CALCULATION
    const totalBeans = expertData?.totalBeansEarned || expertData?.totalBeans || 0;
    const config = getLevelConfig(totalBeans);
    
    const theme = {
        primary: config.colors[0],
        secondary: config.colors[2],
        accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
        // DYNAMIC DESIGNED BACKGROUND GRADIENT
        bgGradient: [
            config.lvl >= 7 ? `${config.colors[0]}40` : '#020617', 
            config.lvl >= 3 ? `${config.colors[1]}20` : '#0F172A', 
            '#020617'
        ] as const 
    };

    useEffect(() => {
        const authUnsub = auth.onAuthStateChanged((u:any) => setUser(u));
        // Start Ambient Animation
        Animated.loop(
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true
          })
        ).start();
        return () => authUnsub();
    }, []);

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, "withdrawals"),
            where("userId", "==", user.uid),
            orderBy("createdAt", "desc"),
            limit(5)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!auth.currentUser) return;
            const txList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTransactions(txList);
        }, (error) => {
            if (error.code === 'permission-denied') {
                console.log("WalletSystem: Sync detached safely.");
            }
        });

        return () => unsubscribe();
    }, [user]);

    useEffect(() => {
        if (expertData?.bankDetails) {
            setBankDetails(expertData.bankDetails);
        }
        if (expertData?.idProof) {
            setIdProofImage(expertData.idProof);
        }
    }, [expertData]);

    const isBankVerified = expertData?.isBankVerified || false; 
    const walletBalanceBeans = expertData?.walletBalance || 0; 
    const availableRupees = Math.floor(walletBalanceBeans / 100); 
    const pendingACTIVITY_REWARD = expertData?.pendingACTIVITY_REWARD || 0;

    const uploadToCloudinary = async (imageUri: string) => {
        const data = new FormData();
        const filename = imageUri.split('/').pop();
        const Discover = /\.(\w+)$/.exec(filename || '');
        const type = Discover ? `image/${Discover[1]}` : `image`;

        // @ts-ignore
        data.append('file', {
            uri: imageUri,
            name: filename || 'id_proof.jpg',
            type: type || 'image/jpeg',
        });
        
        data.append('upload_preset', 'talkpe'); 

        try {
            const response = await fetch('https://api.cloudinary.com/v1_1/dvwjxeexc/image/upload', {
                method: 'POST',
                body: data,
                headers: { 'Accept': 'application/json' },
            });
            
            const result = await response.json();
            return result.secure_url || null;
        } catch (error) {
            return null;
        }
    };

    const pickIdProof = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert("Permission Needed", "We need access to your gallery to upload ID proof.");
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'], 
            allowsEditing: true,
            quality: 0.5,
        });

        if (!result.canceled) {
            setLoading(true); 
            const uploadedUrl = await uploadToCloudinary(result.assets[0].uri);
            if (uploadedUrl) {
                setIdProofImage(uploadedUrl); 
                Alert.alert("Success", "ID Proof uploaded to cloud!");
            } else {
                Alert.alert("Error", "Cloudinary upload failed.");
            }
            setLoading(false);
        }
    };

    const handleWithdrawal = async () => {
        if (!bankDetails.accountNumber || !isBankVerified) {
            Alert.alert("Bank Details Required", "Please link and verify your bank details first.");
            return;
        }

        // 🔥 MASTER UPDATE: CHANGED MINIMUM FROM 3000 TO 500
        if (availableRupees < 500) {
            Alert.alert("Insufficient Balance", "Minimum ₹500 balance required to Redeem.");
            return;
        }

        const numAmtRupee = Number(amount);
        
        if (numAmtRupee > 5000 && !expertData?.idProof) {
            Alert.alert("Identity Verification Required", "Above ₹5,000 requires ID proof.");
            return;
        }

        const transactionCharge = 100; 
        const totalDeductionRupee = numAmtRupee + transactionCharge;
        const requiredBeans = totalDeductionRupee * 100;
        
        // 🔥 MASTER UPDATE: CHANGED MINIMUM AMOUNT CHECK FROM 3000 TO 500
        if (!amount || isNaN(numAmtRupee) || numAmtRupee < 500) {
            Alert.alert("Minimum Limit", "Minimum ₹500 required.");
            return;
        }

        if (requiredBeans > walletBalanceBeans) {
            Alert.alert("Error", `Required: ₹${totalDeductionRupee} in wallet.`);
            return;
        }

        setLoading(true);
        try {
            if (user?.uid && auth.currentUser) {
                await addDoc(collection(db, "withdrawals"), {
                    userId: user.uid,
                    expertName: expertData?.name || 'Host',
                    amount: numAmtRupee,
                    amountRupee: numAmtRupee,
                    transactionCharge: transactionCharge,
                    totalDeductedRupee: totalDeductionRupee,
                    beansDeducted: requiredBeans,
                    status: 'PENDING', 
                    type: 'Redeem',
                    createdAt: serverTimestamp(),
                    bankDetails: bankDetails 
                });

                await updateDoc(doc(db, "users", user.uid), {
                    walletBalance: increment(-requiredBeans),
                    pendingACTIVITY_REWARD: increment(numAmtRupee),
                    lastWithdrawalAt: serverTimestamp()
                });

                // 🔥 NOTIFICATION TRIGGER 1: Redeem Request Update
                await sendNotificationToUser(
                    user.uid,
                    "Withdrawal Requested 💸",
                    `Your redeem request for ₹${numAmtRupee} is being processed. It will be credited soon.`,
                    "payment"
                );

                Alert.alert("Success ✅", "Request sent for processing!");
                setModalVisible(false);
                setAmount('');
            }
        } catch (e) {
            Alert.alert("Error", "Transaction failed.");
        } finally {
            setLoading(false);
        }
    };

    const saveBankDetails = async () => {
        const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
        if (!bankDetails.holderName || bankDetails.accountNumber.length < 9) {
            Alert.alert("Invalid Input", "Check Name and Account.");
            return;
        }
        if (!ifscRegex.test(bankDetails.ifsc.toUpperCase())) {
            Alert.alert("Invalid IFSC", "Enter valid 11-digit IFSC.");
            return;
        }

        setLoading(true);
        try {
            if (user?.uid && auth.currentUser) {
                await updateDoc(doc(db, "users", user.uid), { 
                    bankDetails: bankDetails,
                    idProof: idProofImage, 
                    isBankVerified: false 
                });

                await addDoc(collection(db, "adminNotifications"), {
                    type: 'BANK_VERIFICATION',
                    expertId: user.uid,
                    expertName: expertData?.name || 'Host',
                    status: 'pending',
                    createdAt: serverTimestamp(),
                    details: { ...bankDetails, idProof: idProofImage }
                });

                // 🔥 NOTIFICATION TRIGGER 2: Bank Details Saved Update
                await sendNotificationToUser(
                    user.uid,
                    "Bank Configured 🏦",
                    "Your bank details have been submitted. Waiting for admin verification.",
                    "system"
                );

                Alert.alert("Updated ✅", "Details submitted for verification.");
                setEditBankVisible(false);
            }
        } catch (e) {
            Alert.alert("Error", "Update failed.");
        } finally {
            setLoading(false);
        }
    };

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -30]
    });

    // 🔥 ALTERNATING BORDER STYLES WITH REDUCED THICKNESS (2px)
    const borderType1 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: theme.primary,
        borderRightColor: theme.primary,
        borderTopColor: theme.secondary + '80',
        borderBottomColor: theme.secondary + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    const borderType2 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: theme.secondary,
        borderRightColor: theme.secondary,
        borderTopColor: theme.primary + '80',
        borderBottomColor: theme.primary + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    return (
        <View style={[styles.mainWrapper, { backgroundColor: '#020617' }]}>
            {/* 🔥 DYNAMIC ANIMATED DESIGN BACKGROUND */}
            <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />
            
            {/* Shimmer Orbs for Animation */}
            <Animated.View style={[styles.shimmerOrb, { top: 120, right: -60, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 450, left: -90, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                
                <View style={styles.heroSection}>
                    <LinearGradient 
                        colors={[theme.primary, theme.secondary]} 
                        start={{x:0, y:0}} end={{x:1, y:1}} 
                        style={[styles.premiumCard, { shadowColor: theme.primary, elevation: 20 }]}
                    >
                        <View style={styles.cardGlow} />
                        <View style={styles.cardContentHeader}>
                            <View>
                                <Text style={styles.cardLabelText}>AVAILABLE FOR ACTIVITY_REWARD</Text>
                                <View style={styles.rupeeRow}>
                                    <Text style={styles.symbolText}>₹</Text>
                                    <Text style={styles.mainBalanceText}>{availableRupees.toLocaleString()}</Text>
                                </View>
                            </View>
                            <View style={styles.chipWrapper}>
                                <MaterialCommunityIcons name="integrated-circuit-chip" size={42} color="rgba(255,255,255,0.8)" />
                            </View>
                        </View>

                        <View style={styles.ACTIVITY_REWARDDetailRow}>
                            <View>
                                <Text style={styles.ACTIVITY_REWARDLabel}>PENDING CLEARANCE</Text>
                                <Text style={styles.ACTIVITY_REWARDValue}>₹{pendingACTIVITY_REWARD.toLocaleString()}</Text>
                            </View>
                            <TouchableOpacity 
                                // 🔥 MASTER UPDATE: CHANGED FROM 3000 TO 500 IN DISABLED CHECK
                                style={[styles.massWithdrawBtn, (availableRupees < 500 || !isBankVerified) && { opacity: 0.5 }]}
                                onPress={() => setModalVisible(true)}
                                disabled={availableRupees < 500 || !isBankVerified}
                            >
                                <View style={styles.whiteActionBtn}>
                                    <Text style={styles.blackBtnText}>Claim Reward</Text>
                                </View>
                            </TouchableOpacity>
                        </View>
                        
                        {/* 🔥 MASTER UPDATE: CHANGED FROM 3000 TO 500 IN UI WARNING */}
                        {availableRupees < 500 && (
                            <View style={styles.limitWarning}>
                                <Ionicons name="information-circle" size={12} color="#FFF" />
                                <Text style={styles.warningText}>MINIMUM ₹500 REQUIRED</Text>
                            </View>
                        )}
                    </LinearGradient>
                </View>

                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitleMain}>BANKING DETAILS</Text>
                    <TouchableOpacity onPress={() => setEditBankVisible(true)} style={styles.nodeEditBtn}>
                        <Ionicons name="settings-sharp" size={14} color={theme.primary} />
                        <Text style={[styles.nodeEditText, { color: theme.primary }]}>CONFIG</Text>
                    </TouchableOpacity>
                </View>

                {/* 🔥 DYNAMIC DUAL-TONE BANK CARD (TYPE 1) */}
                <TouchableOpacity style={[styles.bankDetailCard, borderType1]} onPress={() => setEditBankVisible(true)}>
                    <View style={styles.bankInner}>
                        <View style={[styles.bankIconContainer, { backgroundColor: `${theme.primary}15` }]}>
                            <Ionicons name="business" size={20} color={theme.primary} />
                        </View>
                        <View style={{ flex: 1, marginLeft: 15 }}>
                            <Text style={styles.bankTitleText}>PRIMARY ACCOUNT</Text>
                            <Text style={styles.bankValueText}>{bankDetails.accountNumber ? `•••• ${bankDetails.accountNumber.slice(-4)}` : 'DISCONNECTED'}</Text>
                        </View>
                        {isBankVerified ? (
                            <View style={styles.statusBadgeGreen}><Text style={styles.badgeLabelText}>ACTIVE</Text></View>
                        ) : expertData?.bankRejectReason ? (
                            <View style={[styles.statusBadgeYellow, { backgroundColor: '#EF444420', borderColor: '#EF444440' }]}><Text style={[styles.badgeLabelText, { color: '#EF4444' }]}>REJECTED</Text></View>
                        ) : (
                            <View style={styles.statusBadgeYellow}><Text style={styles.badgeLabelText}>PENDING</Text></View>
                        )}
                    </View>
                </TouchableOpacity>

                {/* 🔥 NEW UI: BANK KYC REJECTION REASON DISPLAY BOX 🔥 */}
                {!isBankVerified && expertData?.bankRejectReason && (
                    <View style={[styles.rejectReasonBox, { marginTop: -25, marginBottom: 25 }]}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" style={{marginTop: 2}} />
                        <View style={{ marginLeft: 8, flex: 1 }}>
                            <Text style={styles.rejectLabel}>KYC REJECTION REASON</Text>
                            <Text style={styles.rejectReasonText}>{expertData.bankRejectReason}</Text>
                            <Text style={{ color: theme.primary, fontSize: 10, fontWeight: '800', marginTop: 5 }}>* Tap CONFIG above to fix and resubmit details.</Text>
                        </View>
                    </View>
                )}

                <Text style={styles.sectionTitleMain}>LEDGER HISTORY</Text>
                {transactions.length === 0 ? (
                    <View style={styles.emptyLedger}>
                        <Ionicons name="receipt-outline" size={40} color="#1e293b" />
                        <Text style={styles.emptyLedgerText}>No Activity Recorded</Text>
                    </View>
                ) : (
                    transactions.map((tx, index) => (
                        <View key={tx.id} style={{ marginBottom: 12 }}>
                            {/* 🔥 DYNAMIC DUAL-TONE LEDGER ITEMS WITH REJECT FIX */}
                            <View style={[
                                styles.ledgerItem, 
                                index % 2 === 0 ? borderType2 : borderType1, 
                                { marginBottom: tx.status === 'REJECTED' && tx.rejectReason ? 0 : 0 }
                            ]}>
                                <View style={[styles.ledgerIcon, { backgroundColor: tx.status === 'REJECTED' ? '#EF444420' : tx.status === 'PENDING' ? '#F59E0B20' : `${theme.primary}20` }]}>
                                    <MaterialCommunityIcons 
                                        name={tx.status === 'REJECTED' ? "close-circle" : tx.status === 'PENDING' ? "clock-fast" : "check-circle"} 
                                        size={20} color={tx.status === 'REJECTED' ? "#EF4444" : tx.status === 'PENDING' ? "#F59E0B" : theme.primary} 
                                    />
                                </View>
                                <View style={{ flex: 1, marginLeft: 15 }}>
                                    <Text style={styles.ledgerType}>{tx.type || 'Redeem'}</Text>
                                    <Text style={styles.ledgerDate}>{tx.createdAt?.toDate().toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) || 'RECENT'}</Text>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    {/* 🔥 Strikethrough if rejected to show amount wasn't deducted permanently */}
                                    <Text style={[styles.ledgerAmount, tx.status === 'REJECTED' && { textDecorationLine: 'line-through', opacity: 0.5 }]}>
                                        - ₹{tx.amountRupee || tx.amount}
                                    </Text>
                                    <Text style={[styles.ledgerStatus, { color: tx.status === 'REJECTED' ? '#EF4444' : tx.status === 'PENDING' ? '#F59E0B' : theme.primary }]}>
                                        {tx.status}
                                    </Text>
                                </View>
                            </View>

                            {/* 🔥 NEW UI: REJECTION REASON DISPLAY BOX */}
                            {tx.status === 'REJECTED' && tx.rejectReason && (
                                <View style={styles.rejectReasonBox}>
                                    <MaterialCommunityIcons name="alert-circle-outline" size={16} color="#EF4444" style={{marginTop: 2}} />
                                    <View style={{ marginLeft: 8, flex: 1 }}>
                                        <Text style={styles.rejectLabel}>REJECTION REASON</Text>
                                        <Text style={styles.rejectReasonText}>{tx.rejectReason}</Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    ))
                )}
                <View style={{ height: 120 }} />
            </ScrollView>

            {/* MODALS RENDERED WITH DYNAMIC BG AND DUAL-TONE INPUTS */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalBg}>
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={[styles.modalSheet, { backgroundColor: theme.bgGradient[0] }]}>
                        <View style={styles.modalDragger} />
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}> Redeem Rewards</Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                                <Ionicons name="close" size={22} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.inputArea}>
                            <Text style={styles.currencyLabel}>ENTER REDEEM AMOUNT</Text>
                            <TextInput 
                                style={styles.giantInput} 
                                placeholder="0" 
                                placeholderTextColor="rgba(255,255,255,0.1)" 
                                keyboardType="numeric" 
                                value={amount} 
                                onChangeText={(t: string) => setAmount(t)}
                            />
                            {/* 🔥 DUAL TONE INFO BOX (TYPE 1) */}
                            <View style={[styles.feeInfoBox, borderType1]}>
                                <Text style={styles.feeText}>TRANS. CHARGE: <Text style={{color: '#FFF'}}>₹100</Text></Text>
                                <View style={styles.feeDot} />
                                <Text style={styles.feeText}>EST. DEDUCTION: <Text style={{color: '#FFF'}}>₹{(Number(amount) || 0) + 100}</Text></Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.finalSubmitBtn} onPress={handleWithdrawal} disabled={loading}>
                            <LinearGradient colors={[theme.primary, theme.secondary]} style={styles.finalSubmitGrad}>
                                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.finalSubmitText}>INITIALIZE TRANSFER</Text>}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal visible={editBankVisible} transparent animationType="fade">
                <View style={styles.modalBg}>
                    <BlurView intensity={95} tint="dark" style={StyleSheet.absoluteFill} />
                    <View style={[styles.modalSheet, { height: height * 0.85, backgroundColor: theme.bgGradient[0] }]}>
                        <Text style={styles.modalTitle}>Banking Configuration</Text>
                        <ScrollView style={{ marginTop: 25 }} showsVerticalScrollIndicator={false}>
                            {/* 🔥 DUAL TONE INPUT NODES (ALTERNATING) */}
                            <InputNode label="ACCOUNT HOLDER" value={bankDetails.holderName} onChange={(t: string) => setBankDetails({...bankDetails, holderName: t})} borderStyle={borderType1} />
                            <InputNode label="ACCOUNT NUMBER" value={bankDetails.accountNumber} onChange={(t: string) => setBankDetails({...bankDetails, accountNumber: t})} keyboard="numeric" borderStyle={borderType2} />
                            <InputNode label="IFSC CODE" value={bankDetails.ifsc} onChange={(t: string) => setBankDetails({...bankDetails, ifsc: t})} autoCap="characters" borderStyle={borderType1} />
                            <InputNode label="UPI ID / VPA" value={bankDetails.upiId} onChange={(t: string) => setBankDetails({...bankDetails, upiId: t})} borderStyle={borderType2} />
                            
                            <Text style={styles.nodeLabel}>ID VERIFICATION DOCUMENTS</Text>
                            <TouchableOpacity style={[styles.uploadNode, borderType1]} onPress={pickIdProof}>
                                {loading ? (
                                    <ActivityIndicator color={theme.primary} />
                                ) : idProofImage ? (
                                    <View style={styles.uploadSuccess}>
                                        <Ionicons name="checkmark-done-circle" size={24} color="#10B981" />
                                        <Text style={styles.uploadSuccessText}>SECURELY ATTACHED</Text>
                                    </View>
                                ) : (
                                    <View style={{ alignItems: 'center' }}>
                                        <Ionicons name="cloud-upload" size={28} color={theme.primary} />
                                        <Text style={styles.uploadHint}>Upload Aadhaar or PAN Card</Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </ScrollView>
                        
                        <View style={styles.modalActionRow}>
                            <TouchableOpacity style={styles.cancelNode} onPress={() => setEditBankVisible(false)}>
                                <Text style={styles.cancelNodeText}>CANCEL</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.saveNode} onPress={saveBankDetails} disabled={loading}>
                                <LinearGradient colors={['#10B981', '#059669']} style={styles.saveNodeGrad}>
                                    {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveNodeText}>SAVE CONFIG</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const InputNode = ({ label, value, onChange, keyboard = "default", autoCap = "none", borderStyle }: any) => (
    <View style={styles.inputNodeBox}>
        <Text style={styles.nodeLabel}>{label}</Text>
        <TextInput 
            style={[styles.nodeInput, borderStyle]} 
            value={value} 
            onChangeText={(t: string) => onChange(t)} 
            keyboardType={keyboard} 
            autoCapitalize={autoCap} 
            placeholderTextColor="#334155"
        />
    </View>
);

const styles = StyleSheet.create({
    mainWrapper: { flex: 1 },
    // 🔥 DESIGN: AMBIENT SHIMMER ORBS
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
    container: { padding: 20 },
    heroSection: { marginBottom: 30 },
    premiumCard: { borderRadius: 35, padding: 25, overflow: 'hidden' },
    cardGlow: { position: 'absolute', top: -100, left: -100, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(255,255,255,0.1)' },
    cardContentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    cardLabelText: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    rupeeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
    symbolText: { color: '#FFF', fontSize: 24, fontWeight: '400', marginRight: 5 },
    mainBalanceText: { color: '#FFF', fontSize: 44, fontWeight: '900' },
    chipWrapper: { padding: 5, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 12 },
    ACTIVITY_REWARDDetailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 30, paddingTop: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' },
    ACTIVITY_REWARDLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 9, fontWeight: '800' },
    ACTIVITY_REWARDValue: { color: '#FFF', fontSize: 18, fontWeight: '900', marginTop: 2 },
    massWithdrawBtn: { borderRadius: 18, overflow: 'hidden', elevation: 12, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
    whiteActionBtn: { backgroundColor: '#FFFFFF', paddingHorizontal: 22, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
    blackBtnText: { color: '#020617', fontWeight: '900', fontSize: 12, letterSpacing: 1.5 },
    limitWarning: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'center', marginTop: 15, backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10 },
    warningText: { color: '#FFF', fontSize: 8, fontWeight: '900' },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, marginTop: 10 },
    sectionTitleMain: { color: '#475569', fontSize: 11, fontWeight: '900', letterSpacing: 3 },
    nodeEditBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#1e293b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
    nodeEditText: { fontSize: 9, fontWeight: '900' },
    
    // 🔥 ZERO BOX FLUID SHAPES
    bankDetailCard: { borderRadius: 30, overflow: 'hidden', marginBottom: 30 },
    bankInner: { flexDirection: 'row', alignItems: 'center', padding: 20 },
    bankIconContainer: { width: 48, height: 48, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    bankTitleText: { color: '#475569', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    bankValueText: { color: '#FFF', fontSize: 16, fontWeight: '800', marginTop: 3 },
    statusBadgeGreen: { backgroundColor: '#10B98120', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#10B98140' },
    statusBadgeYellow: { backgroundColor: '#F59E0B20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#F59E0B40' },
    badgeLabelText: { color: '#FFF', fontSize: 9, fontWeight: '900' },
    
    emptyLedger: { alignItems: 'center', padding: 40, backgroundColor: 'rgba(30, 41, 59, 0.2)', borderRadius: 25, marginTop: 10 },
    emptyLedgerText: { color: '#334155', fontSize: 12, fontWeight: '800', marginTop: 10 },
    
    ledgerItem: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 30, zIndex: 2 },
    ledgerIcon: { width: 45, height: 45, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    ledgerType: { color: '#FFF', fontSize: 15, fontWeight: '800' },
    ledgerDate: { color: '#475569', fontSize: 11, fontWeight: '700', marginTop: 2 },
    ledgerAmount: { color: '#FFF', fontSize: 16, fontWeight: '900' },
    ledgerStatus: { fontSize: 9, fontWeight: '900', marginTop: 3, letterSpacing: 1 },

    // 🔥 NEW REJECTION REASON STYLES
    rejectReasonBox: { flexDirection: 'row', backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: '#EF444450', borderRadius: 20, padding: 15, marginHorizontal: 10, marginTop: -15, zIndex: -1, paddingTop: 20 },
    rejectLabel: { color: '#EF4444', fontSize: 9, fontWeight: '900', letterSpacing: 1, marginBottom: 2 },
    rejectReasonText: { color: '#FFF', fontSize: 11, fontWeight: '700', lineHeight: 16 },
    
    modalBg: { flex: 1, justifyContent: 'flex-end' },
    modalSheet: { borderTopLeftRadius: 40, borderTopRightRadius: 40, padding: 30, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
    modalDragger: { width: 50, height: 5, backgroundColor: '#1e293b', borderRadius: 10, alignSelf: 'center', marginBottom: 20 },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
    modalTitle: { color: '#FFF', fontSize: 24, fontWeight: '900' },
    modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
    inputArea: { marginBottom: 30 },
    currencyLabel: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 2, textAlign: 'center', marginBottom: 15 },
    giantInput: { color: '#FFF', fontSize: 60, fontWeight: '900', textAlign: 'center', paddingVertical: 10 },
    feeInfoBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 15, paddingVertical: 12, borderRadius: 20 },
    feeText: { color: '#475569', fontSize: 10, fontWeight: '800' },
    feeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#334155' },
    finalSubmitBtn: { borderRadius: 25, overflow: 'hidden' },
    finalSubmitGrad: { paddingVertical: 20, alignItems: 'center' },
    finalSubmitText: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 2 },
    inputNodeBox: { marginBottom: 20 },
    nodeLabel: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 8 },
    nodeInput: { borderRadius: 20, padding: 18, color: '#FFF', fontSize: 15, fontWeight: '700' },
    uploadNode: { height: 100, borderRadius: 25, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
    uploadHint: { color: '#475569', fontSize: 11, fontWeight: '800', marginTop: 8 },
    uploadSuccess: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    uploadSuccessText: { color: '#10B981', fontSize: 12, fontWeight: '900' },
    modalActionRow: { flexDirection: 'row', gap: 12, marginTop: 25 },
    cancelNode: { flex: 1, paddingVertical: 18, alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 20 },
    cancelNodeText: { color: '#94A3B8', fontWeight: '900', fontSize: 13 },
    saveNode: { flex: 2, borderRadius: 20, overflow: 'hidden' },
    saveNodeGrad: { paddingVertical: 18, alignItems: 'center' },
    saveNodeText: { color: '#FFF', fontWeight: '900', fontSize: 13 }
});