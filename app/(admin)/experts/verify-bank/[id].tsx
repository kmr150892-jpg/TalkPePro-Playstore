import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../../../../firebaseConfig';
import { sendNotificationToUser } from '../../../../utils/notificationHelper'; // 🔥 ADDED NOTIFICATION HELPER

export default function VerifyBankDetails() {
  const { id } = useLocalSearchParams(); // Host ID securely passed here
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [expert, setExpert] = useState<any>(null);

  // 🔥 STATE FOR REJECT REASON POPUP 🔥
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  useEffect(() => {
    fetchExpertDetails();
  }, [id]);

  const fetchExpertDetails = async () => {
    try {
      const docRef = doc(db, "users", id as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setExpert(docSnap.data());
      } else {
        Alert.alert("Error", "Host record not found");
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (status: 'Approve' | 'Reject') => {
    if (status === 'Reject') {
        // 🔥 OPENS REJECT REASON MODAL INSTEAD OF DIRECT ALERT
        setRejectReason("");
        setRejectModalVisible(true);
        return;
    }

    Alert.alert(
      `Confirm ${status} Action`,
      `Are you sure you want to ${status.toLowerCase()} these financial details?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Yes, Confirm", 
          onPress: async () => {
            setLoading(true);
            try {
              // 1. Update Host Profile for APPROVE
              await updateDoc(doc(db, "users", id as string), {
                isBankVerified: true,
                bankRejectReason: null // Clears any past reject reason
              });

              // 2. Remove the notification (Cleaning up operational logs)
              const q = query(collection(db, "adminNotifications"), 
                where("expertId", "==", id), 
                where("type", "==", "BANK_VERIFICATION")
              );
              const querySnapshot = await getDocs(q);
              querySnapshot.forEach(async (document) => {
                await deleteDoc(doc(db, "adminNotifications", document.id));
              });

              // 🔥 ADMIN SUCCESS NOTIFICATION TRIGGER 🔥
              await sendNotificationToUser(
                  id as string,
                  "Bank Verified 🏦✅",
                  "Your bank and KYC details have been successfully verified! You can now request withdrawals.",
                  "system"
              );

              Alert.alert("Success ✅", `Financial details ${status.toLowerCase()}ed successfully!`);
              router.back();
            } catch (e) {
              Alert.alert("Error", "System update failed");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // 🔥 NEW FUNCTION: EXECUTE REJECT BANK DETAILS WITH REASON 🔥
  const executeRejectBank = async () => {
      if (!rejectReason || rejectReason.trim() === "") {
          Alert.alert("Error", "Please provide a reason for declining.");
          return;
      }
      setLoading(true);
      try {
          // 1. Update Host Profile with Reject Reason
          await updateDoc(doc(db, "users", id as string), {
              isBankVerified: false,
              bankRejectReason: rejectReason.trim() // 🔥 Saving reason so host can see it and retry
          });

          // 2. Remove the notification (Cleaning up operational logs)
          const q = query(collection(db, "adminNotifications"), 
              where("expertId", "==", id), 
              where("type", "==", "BANK_VERIFICATION")
          );
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach(async (document) => {
              await deleteDoc(doc(db, "adminNotifications", document.id));
          });

          // 🔥 ADMIN REJECT NOTIFICATION TRIGGER WITH REASON 🔥
          await sendNotificationToUser(
              id as string,
              "Bank KYC Declined ⚠️",
              `Your banking KYC was declined. Reason: ${rejectReason.trim()}. Please review and submit correct details in your console.`,
              "system"
          );

          Alert.alert("Declined ❌", "Host bank details rejected successfully.");
          setRejectModalVisible(false);
          router.back();
      } catch (e) {
          Alert.alert("Error", "System update failed");
      } finally {
          setLoading(false);
      }
  };

  // ✅ SECURE FUNCTION: To open KYC document in browser for secure download
  const downloadImage = () => {
    if (expert?.idProof) {
      Linking.openURL(expert.idProof);
    } else {
      Alert.alert("Error", "No KYC document found to download");
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#818CF8" size="large" /></View>;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#FFF" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Financial KYC Verification</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.card}>
        <View style={styles.expertInfo}>
           <Text style={styles.name}>{expert?.name || 'Host'}</Text>
           <Text style={styles.email}>{expert?.email}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.detailRow}>
          <Text style={styles.label}>HOLDER NAME</Text>
          <Text style={styles.value}>{expert?.bankDetails?.holderName || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>ACCOUNT NUMBER</Text>
          <Text style={styles.value}>{expert?.bankDetails?.accountNumber || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>IFSC CODE</Text>
          <Text style={styles.value}>{expert?.bankDetails?.ifsc || 'N/A'}</Text>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.label}>UPI ID</Text>
          <Text style={styles.value}>{expert?.bankDetails?.upiId || 'N/A'}</Text>
        </View>

        <View style={styles.divider} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.label}>IDENTITY VERIFICATION (KYC)</Text>
            {expert?.idProof && (
                <TouchableOpacity onPress={downloadImage}>
                    <Text style={{ color: '#818CF8', fontSize: 12, fontWeight: '900' }}>Download</Text>
                </TouchableOpacity>
            )}
        </View>
        
        {expert?.idProof ? (
          <TouchableOpacity onPress={downloadImage} activeOpacity={0.8}>
            <Image 
                source={{ uri: expert.idProof }} 
                style={styles.idImage} 
                resizeMode="contain"
            />
            <Text style={{ color: '#64748B', fontSize: 10, textAlign: 'center', marginTop: 10 }}>* Tap document for secure download/full view</Text>
          </TouchableOpacity>
        ) : (
          <Text style={[styles.value, { color: '#EF4444', fontSize: 12 }]}>No KYC Document Uploaded</Text>
        )}
      </View>

      <View style={styles.btnGroup}>
        <TouchableOpacity style={[styles.btn, styles.rejectBtn]} onPress={() => handleAction('Reject')}>
          <Text style={[styles.btnText, {color: '#EF4444'}]}>DECLINE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => handleAction('Approve')}>
          <Text style={styles.btnText}>AUTHORIZE & VERIFY</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 50 }} />

      {/* 🔥 REJECT REASON MODAL 🔥 */}
      <Modal visible={rejectModalVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                  <View style={styles.modalHeaderBox}>
                      <MaterialCommunityIcons name="alert-circle" size={24} color="#EF4444" />
                      <Text style={styles.modalTitle}>DECLINE KYC</Text>
                  </View>
                  
                  <Text style={styles.modalSub}>Select a quick reason or type below.</Text>
                  
                  {/* 🔥 QUICK SELECT REASON CHIPS 🔥 */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickReasonScroll}>
                      {['Invalid Account Number', 'Incorrect IFSC Code', 'Blurry KYC Document', 'Name Mismatch'].map((reason) => (
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
                      <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setRejectModalVisible(false)}>
                          <Text style={styles.modalCancelText}>CANCEL</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.modalSubmitBtn} onPress={executeRejectBank}>
                          <Text style={styles.modalSubmitText}>CONFIRM DECLINE</Text>
                      </TouchableOpacity>
                  </View>
              </View>
          </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617', padding: 20 },
  center: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 30 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  card: { backgroundColor: '#0F172A', borderRadius: 25, padding: 25, borderWidth: 1, borderColor: '#FFFFFF10' },
  expertInfo: { alignItems: 'center', marginBottom: 20 },
  name: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  email: { color: '#64748B', fontSize: 14, marginTop: 5 },
  divider: { height: 1, backgroundColor: '#FFFFFF10', marginVertical: 20 },
  detailRow: { marginBottom: 20 },
  label: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  value: { color: '#FFF', fontSize: 16, fontWeight: '700', marginTop: 5 },
  idImage: { width: '100%', height: 200, borderRadius: 15, marginTop: 15, backgroundColor: '#1E293B' },
  btnGroup: { flexDirection: 'row', gap: 15, marginTop: 30 },
  btn: { flex: 1, padding: 18, borderRadius: 18, alignItems: 'center' },
  rejectBtn: { backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF444440' },
  approveBtn: { backgroundColor: '#818CF8' },
  btnText: { color: '#FFF', fontWeight: '900', fontSize: 14 },

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