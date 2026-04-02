import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection, doc, increment, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../../firebaseConfig';

const { width } = Dimensions.get('window');

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

  useEffect(() => {
    const authUnsub = auth.onAuthStateChanged((u) => setUser(u));
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
  const pendingPayout = expertData?.pendingPayout || 0;

  const uploadToCloudinary = async (imageUri: string) => {
    const data = new FormData();
    const filename = imageUri.split('/').pop();
    const match = /\.(\w+)$/.exec(filename || '');
    const type = match ? `image/${match[1]}` : `image`;

    // @ts-ignore
    data.append('file', {
      uri: imageUri,
      name: filename || 'id_proof.jpg',
      type: type || 'image/jpeg',
    });
    
    data.append('upload_preset', 'TALKPE'); 

    try {
      const response = await fetch('https://api.cloudinary.com/v1_1/dvwjxeexc/image/upload', {
        method: 'POST',
        body: data,
        headers: {
          'Accept': 'application/json',
        },
      });
      
      const result = await response.json();
      if (result.secure_url) {
        return result.secure_url;
      } else {
        console.error("Cloudinary Detailed Error:", result);
        return null;
      }
    } catch (error) {
      console.error("Cloudinary Fetch Error:", error);
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
        Alert.alert("Error", "Cloudinary upload failed. Check your internet or preset settings.");
      }
      setLoading(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!bankDetails.accountNumber || !isBankVerified) {
      Alert.alert("Bank Details Required", "Please link and verify your bank details first.");
      return;
    }

    if (availableRupees < 3000) {
      Alert.alert("Insufficient Balance", "Minimum ₹3,000 balance required to withdraw.");
      return;
    }

    const numAmtRupee = Number(amount);
    
    if (numAmtRupee > 5000 && !expertData?.idProof) {
      Alert.alert("Identity Verification Required", "For withdrawals above ₹5,000, please upload your ID proof in 'Edit Info'.");
      return;
    }

    const transactionCharge = 100; 
    const totalDeductionRupee = numAmtRupee + transactionCharge;
    const requiredBeans = totalDeductionRupee * 100;
    
    if (!amount || isNaN(numAmtRupee) || numAmtRupee < 500) {
      Alert.alert("Minimum Limit", "Minimum withdrawal per request is ₹500.");
      return;
    }

    if (requiredBeans > walletBalanceBeans) {
      Alert.alert("Error", `Including ₹${transactionCharge} charge, you need ₹${totalDeductionRupee} in wallet.`);
      return;
    }

    setLoading(true);
    try {
      if (user?.uid && auth.currentUser) {
        await addDoc(collection(db, "withdrawals"), {
          userId: user.uid,
          expertName: expertData?.name || 'Expert',
          amount: numAmtRupee,
          amountRupee: numAmtRupee,
          transactionCharge: transactionCharge,
          totalDeductedRupee: totalDeductionRupee,
          beansDeducted: requiredBeans,
          status: 'PENDING', 
          type: 'Withdrawal',
          createdAt: serverTimestamp(),
          bankDetails: bankDetails 
        });

        // ✅ FIXED: Using increment to handle balance updates safely
        await updateDoc(doc(db, "users", user.uid), {
          walletBalance: increment(-requiredBeans),
          pendingPayout: increment(numAmtRupee),
          lastWithdrawalAt: serverTimestamp()
        });

        Alert.alert("Success ✅", `Withdrawal request sent! ₹${transactionCharge} transaction charge applied.`);
        setModalVisible(false);
        setAmount('');
      }
    } catch (e) {
      Alert.alert("Error", "Request failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const saveBankDetails = async () => {
    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!bankDetails.holderName || bankDetails.accountNumber.length < 9) {
      Alert.alert("Invalid Input", "Check Name and Account Number.");
      return;
    }
    if (!ifscRegex.test(bankDetails.ifsc.toUpperCase())) {
      Alert.alert("Invalid IFSC", "Enter a valid 11-digit IFSC code.");
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
          expertName: expertData?.name || 'Expert',
          status: 'pending',
          createdAt: serverTimestamp(),
          details: { ...bankDetails, idProof: idProofImage }
        });

        Alert.alert("Updated ✅", "Bank details & ID submitted for verification.");
        setEditBankVisible(false);
      }
    } catch (e) {
      Alert.alert("Error", "Update failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#020617' }}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#6366f1', '#a855f7']} style={styles.balanceCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardLabel}>AVAILABLE BALANCE</Text>
            {isBankVerified && <MaterialCommunityIcons name="check-decagram" size={22} color="#fff" />}
          </View>
          <Text style={styles.balanceText}>{`₹${availableRupees.toLocaleString()}`}</Text>
          <View style={styles.cardFooter}>
            <View>
              <Text style={styles.footerLabel}>Pending Payout</Text>
              <Text style={styles.footerVal}>{`₹${pendingPayout.toLocaleString()}`}</Text>
            </View>
            <TouchableOpacity 
              style={[styles.withdrawBtn, (availableRupees < 3000 || !isBankVerified) && { opacity: 0.6 }]} 
              onPress={() => setModalVisible(true)}
            >
              <Text style={styles.withdrawBtnText}>WITHDRAW</Text>
            </TouchableOpacity>
          </View>
          {availableRupees < 3000 && (
              <Text style={styles.limitNote}>* Min ₹3,000 required for withdrawal</Text>
          )}
        </LinearGradient>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>BANKING & UPI DETAILS</Text>
          <TouchableOpacity onPress={() => setEditBankVisible(true)}>
            <Text style={styles.editLink}>Edit Info</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <View style={styles.bankCircle}>
                <FontAwesome5 name="university" size={14} color="#818CF8" />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.infoLabel}>BANK ACCOUNT</Text>
                <Text style={styles.infoValue}>{bankDetails.accountNumber || 'Not Linked'}</Text>
            </View>
            {isBankVerified ? (
              <View style={styles.verifiedBadge}><Text style={styles.badgeText}>VERIFIED</Text></View>
            ) : (
              <View style={styles.pendingBadge}><Text style={styles.badgeText}>PENDING</Text></View>
            )}
          </View>
        </View>

        <Text style={styles.sectionTitle}>RECENT TRANSACTIONS</Text>
        {transactions.map((item) => (
          <View key={item.id} style={styles.transactionItem}>
            <View style={[styles.txIconBox, { backgroundColor: item.status === 'PENDING' || item.status === 'Pending' ? '#F59E0B20' : '#10B98120' }]}>
                <MaterialCommunityIcons 
                  name={item.status === 'PENDING' || item.status === 'Pending' ? "arrow-top-right" : "check"} 
                  size={18} color={item.status === 'PENDING' || item.status === 'Pending' ? "#F59E0B" : "#10B981"} 
                />
            </View>
            <View style={{ flex: 1, marginLeft: 15 }}>
              <Text style={styles.txTitle}>{item.type || 'Withdrawal'}</Text>
              <Text style={styles.txDate}>{item.createdAt?.toDate().toLocaleDateString() || 'Today'}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.txAmount}>{`- ₹${item.amountRupee || item.amount}`}</Text>
              <Text style={[styles.txStatus, { color: item.status === 'PENDING' || item.status === 'Pending' ? '#F59E0B' : '#10B981' }]}>{item.status}</Text>
            </View>
          </View>
        ))}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Withdrawal Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Request Payout</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
            <TextInput 
              style={styles.input} 
              placeholder="₹ 0.00" 
              placeholderTextColor="#475569" 
              keyboardType="numeric" 
              value={amount} 
              onChangeText={setAmount} 
            />
            <Text style={styles.modalSubT}>
              {`Total Deduction: ₹${(Number(amount) || 0) + 100} (Inc. ₹100 Charge)`}
            </Text>
            <TouchableOpacity style={styles.submitBtn} onPress={handleWithdrawal} disabled={loading}>
              {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>CONFIRM WITHDRAWAL</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Bank Edit Modal */}
      <Modal visible={editBankVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { minHeight: 600 }]}>
            <Text style={styles.modalTitle}>Bank & ID Settings</Text>
            <ScrollView style={{ marginTop: 20 }}>
              <Text style={styles.inputL}>HOLDER NAME</Text>
              <TextInput style={styles.miniInput} value={bankDetails.holderName} onChangeText={(t) => setBankDetails({...bankDetails, holderName: t})} />
              <Text style={styles.inputL}>ACCOUNT NUMBER</Text>
              <TextInput style={styles.miniInput} keyboardType="numeric" value={bankDetails.accountNumber} onChangeText={(t) => setBankDetails({...bankDetails, accountNumber: t})} />
              <Text style={styles.inputL}>IFSC CODE</Text>
              <TextInput style={styles.miniInput} autoCapitalize="characters" value={bankDetails.ifsc} onChangeText={(t) => setBankDetails({...bankDetails, ifsc: t})} />
              <Text style={styles.inputL}>UPI ID</Text>
              <TextInput style={styles.miniInput} value={bankDetails.upiId} onChangeText={(t) => setBankDetails({...bankDetails, upiId: t})} />
              
              <Text style={styles.inputL}>GOVERNMENT ID PROOF (Required for &gt;₹5000)</Text>
              <TouchableOpacity 
                style={[styles.miniInput, { height: 80, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#4F46E5' }]} 
                onPress={pickIdProof}
              >
                {loading ? (
                   <ActivityIndicator color="#818CF8" />
                ) : idProofImage ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                    <Text style={{ color: '#10B981', marginLeft: 8, fontWeight: '700' }}>ID Proof Attached</Text>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center' }}>
                    <Ionicons name="cloud-upload-outline" size={24} color="#818CF8" />
                    <Text style={{ color: '#64748B', fontSize: 11, marginTop: 4 }}>Tap to upload Aadhar/PAN</Text>
                  </View>
                )}
              </TouchableOpacity>
            </ScrollView>
            
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 20 }}>
              <TouchableOpacity style={[styles.submitBtn, { flex: 1, backgroundColor: '#334155' }]} onPress={() => setEditBankVisible(false)}>
                <Text style={styles.submitBtnText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.submitBtn, { flex: 2 }]} onPress={saveBankDetails} disabled={loading}>
                {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>SAVE DETAILS</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20 },
  balanceCard: { padding: 25, borderRadius: 30, marginBottom: 25 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLabel: { color: '#FFFFFFCC', fontSize: 11, fontWeight: '900' },
  balanceText: { color: '#FFF', fontSize: 40, fontWeight: '900', marginVertical: 10 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#FFFFFF20' },
  footerLabel: { color: '#FFFFFF99', fontSize: 10, fontWeight: '700' },
  footerVal: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  withdrawBtn: { backgroundColor: '#FFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 15 },
  withdrawBtnText: { color: '#4F46E5', fontWeight: '900', fontSize: 12 },
  limitNote: { color: '#FFFFFF99', fontSize: 9, marginTop: 10, fontStyle: 'italic', textAlign: 'center' },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { color: '#64748b', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, marginBottom: 15 },
  editLink: { color: '#818CF8', fontSize: 12, fontWeight: '900' },
  infoBox: { backgroundColor: '#0f172a', borderRadius: 25, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: '#ffffff10' },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  bankCircle: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  infoLabel: { color: '#64748B', fontSize: 10, fontWeight: '700' },
  infoValue: { color: '#FFF', fontSize: 15, fontWeight: '700', marginTop: 2 },
  verifiedBadge: { backgroundColor: '#10B98120', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  pendingBadge: { backgroundColor: '#F59E0B20', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  transactionItem: { backgroundColor: '#0f172a', padding: 15, borderRadius: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  txIconBox: { width: 45, height: 45, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  txTitle: { color: '#fff', fontSize: 14, fontWeight: '700' },
  txDate: { color: '#64748B', fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '800', color: '#fff' },
  txStatus: { fontSize: 10, fontWeight: '900', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: '#000000CC', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#0F172A', borderTopLeftRadius: 35, borderTopRightRadius: 35, padding: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  modalTitle: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  modalSubT: { color: '#64748B', fontSize: 12, textAlign: 'center', marginBottom: 20 },
  input: { backgroundColor: '#1E293B', borderRadius: 20, padding: 20, color: '#FFF', fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  inputL: { color: '#64748B', fontSize: 10, fontWeight: '900', marginBottom: 8 },
  miniInput: { backgroundColor: '#1E293B', borderRadius: 12, padding: 12, color: '#FFF', fontSize: 14, marginBottom: 15 },
  submitBtn: { backgroundColor: '#4F46E5', padding: 20, borderRadius: 20, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontWeight: '900', fontSize: 15 }
});