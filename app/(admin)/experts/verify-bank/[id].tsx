import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { db } from '../../../../firebaseConfig';

export default function VerifyBankDetails() {
  const { id } = useLocalSearchParams(); // Host ID securely passed here
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [expert, setExpert] = useState<any>(null);

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
              // 1. Update Host Profile (Database key kept intact)
              await updateDoc(doc(db, "users", id as string), {
                isBankVerified: status === 'Approve' ? true : false
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
          <Text style={styles.btnText}>DECLINE</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, styles.approveBtn]} onPress={() => handleAction('Approve')}>
          <Text style={styles.btnText}>AUTHORIZE & VERIFY</Text>
        </TouchableOpacity>
      </View>
      <View style={{ height: 50 }} />
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
  btnText: { color: '#FFF', fontWeight: '900', fontSize: 14 }
});