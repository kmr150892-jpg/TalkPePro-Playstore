import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Easing, Image, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../../../../firebaseConfig';
import { sendNotificationToUser } from '../../../../utils/notificationHelper'; // 🔥 ADDED NOTIFICATION HELPER

/* ───────────────────────── 3D / ANIMATION BUILDING BLOCKS ───────────────────────── */

// 3D press tilt
const Press3D = ({ children, style, onPress }: any) => {
  const p = useRef(new Animated.Value(0)).current;
  const pressIn = () => Animated.spring(p, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 6 }).start();
  const pressOut = () => Animated.spring(p, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 10 }).start();
  const scale = p.interpolate({ inputRange: [0, 1], outputRange: [1, 0.96] });
  const rotateX = p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '7deg'] });
  return (
    <TouchableOpacity activeOpacity={1} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={{ flex: 1 }}>
      <Animated.View style={[style, { transform: [{ perspective: 800 }, { rotateX }, { scale }] }]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
};

// Staggered entrance (fade + rise + flip-up)
const Reveal = ({ index = 0, children, style }: any) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, {
      toValue: 1,
      duration: 540,
      delay: index * 100,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, []);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [36, 0] });
  const rotateX = v.interpolate({ inputRange: [0, 1], outputRange: ['-14deg', '0deg'] });
  return (
    <Animated.View style={[style, { opacity: v, transform: [{ perspective: 900 }, { translateY }, { rotateX }] }]}>
      {children}
    </Animated.View>
  );
};

// Breathing live dot
const PulseDot = ({ color, size = 8 }: { color: string; size?: number }) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  const ringScale = v.interpolate({ inputRange: [0, 1], outputRange: [1, 3.2] });
  const ringOpacity = v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
      <Animated.View style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color, opacity: ringOpacity, transform: [{ scale: ringScale }] }} />
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
    </View>
  );
};

// Floating glow orbs background
const BackgroundOrbs = () => {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const la = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    );
    const lb = Animated.loop(
      Animated.sequence([
        Animated.timing(b, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(b, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    );
    la.start(); lb.start();
    return () => { la.stop(); lb.stop(); };
  }, []);
  const aY = a.interpolate({ inputRange: [0, 1], outputRange: [0, 40] });
  const aX = a.interpolate({ inputRange: [0, 1], outputRange: [0, -25] });
  const bY = b.interpolate({ inputRange: [0, 1], outputRange: [0, -50] });
  const bX = b.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View style={[styles.orb, { top: -80, right: -90, width: 300, height: 300, backgroundColor: '#818CF8', opacity: 0.14, transform: [{ translateY: aY }, { translateX: aX }] }]} />
      <Animated.View style={[styles.orb, { bottom: 80, left: -120, width: 320, height: 320, backgroundColor: '#10B981', opacity: 0.08, transform: [{ translateY: bY }, { translateX: bX }] }]} />
    </View>
  );
};

// One bank-detail row with icon tile
const DetailRow = ({ icon, label, value, last }: any) => (
  <View style={[styles.detailRow, last && { marginBottom: 0 }]}>
    <View style={styles.detailIcon}>
      <MaterialCommunityIcons name={icon} size={18} color="#818CF8" />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  </View>
);

// Scanning line over the KYC document (decorative)
const ScanLine = () => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
      ])
    );
    l.start();
    return () => l.stop();
  }, []);
  const translateY = v.interpolate({ inputRange: [0, 1], outputRange: [0, 196] });
  return (
    <Animated.View pointerEvents="none" style={[styles.scanLine, { transform: [{ translateY }] }]} />
  );
};

// Modal card that springs in (3D)
const ModalCard = ({ children }: any) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(v, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 9 }).start();
  }, []);
  const scale = v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] });
  const rotateX = v.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '0deg'] });
  return (
    <Animated.View style={[styles.modalContent, { opacity: v, transform: [{ perspective: 900 }, { rotateX }, { scale }] }]}>
      {children}
    </Animated.View>
  );
};

/* ───────────────────────────────── MAIN SCREEN ───────────────────────────────── */

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
                  "Your bank and KYC details have been successfully verified! You can now request Redemptions.",
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

  if (loading) return (
    <View style={styles.center}>
      <BackgroundOrbs />
      <View style={styles.loaderRing}>
        <ActivityIndicator color="#818CF8" size="large" />
      </View>
      <Text style={styles.loaderText}>SECURING CONNECTION...</Text>
    </View>
  );

  // 🆕 visual-only: status chip + avatar initial (from existing data)
  const isVerified = !!expert?.isBankVerified;
  const initial = String(expert?.name || 'Host').trim().charAt(0).toUpperCase() || 'H';

  return (
    <View style={styles.container}>
    <BackgroundOrbs />
    <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

      <Reveal index={0}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Financial KYC Verification</Text>
            <View style={styles.secureRow}>
              <MaterialCommunityIcons name="lock-check" size={12} color="#10B981" />
              <Text style={styles.secureText}>SECURE ADMIN REVIEW</Text>
            </View>
          </View>
          <View style={{ width: 44 }} />
        </View>
      </Reveal>

      {/* HOST PROFILE HERO */}
      <Reveal index={1}>
        <View style={styles.heroCard}>
          <View style={styles.heroOrbA} />
          <View style={styles.heroOrbB} />
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
          </View>
          <View style={styles.expertInfo}>
             <Text style={styles.name}>{expert?.name || 'Host'}</Text>
             <Text style={styles.email}>{expert?.email}</Text>
          </View>
          <View style={[styles.statusChip, { backgroundColor: isVerified ? '#10B9811F' : '#F59E0B1F', borderColor: isVerified ? '#10B98155' : '#F59E0B55' }]}>
            <PulseDot color={isVerified ? '#10B981' : '#F59E0B'} size={6} />
            <Text style={[styles.statusChipText, { color: isVerified ? '#10B981' : '#F59E0B' }]}>
              {isVerified ? 'BANK VERIFIED' : 'AWAITING REVIEW'}
            </Text>
          </View>
        </View>
      </Reveal>

      {/* BANK DETAILS */}
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionAccent} />
        <Text style={styles.sectionTitleInline}>BANK DETAILS</Text>
      </View>
      <Reveal index={2}>
        <View style={styles.card}>
          <DetailRow icon="account-outline" label="HOLDER NAME" value={expert?.bankDetails?.holderName || 'N/A'} />
          <DetailRow icon="bank-outline" label="ACCOUNT NUMBER" value={expert?.bankDetails?.accountNumber || 'N/A'} />
          <DetailRow icon="barcode" label="IFSC CODE" value={expert?.bankDetails?.ifsc || 'N/A'} />
          <DetailRow icon="qrcode-scan" label="UPI ID" value={expert?.bankDetails?.upiId || 'N/A'} last />
        </View>
      </Reveal>

      {/* KYC DOCUMENT */}
      <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionAccent, { backgroundColor: '#10B981' }]} />
        <Text style={styles.sectionTitleInline}>IDENTITY VERIFICATION (KYC)</Text>
        {expert?.idProof && (
          <TouchableOpacity onPress={downloadImage} style={styles.downloadChip}>
            <Ionicons name="download-outline" size={13} color="#818CF8" />
            <Text style={styles.downloadText}>Download</Text>
          </TouchableOpacity>
        )}
      </View>
      <Reveal index={3}>
        <View style={styles.card}>
          {expert?.idProof ? (
            <TouchableOpacity onPress={downloadImage} activeOpacity={0.8}>
              <View style={styles.docFrame}>
                <Image 
                    source={{ uri: expert.idProof }} 
                    style={styles.idImage} 
                    resizeMode="contain"
                />
                <ScanLine />
                <View style={[styles.corner, { top: 8, left: 8, borderTopWidth: 2, borderLeftWidth: 2 }]} />
                <View style={[styles.corner, { top: 8, right: 8, borderTopWidth: 2, borderRightWidth: 2 }]} />
                <View style={[styles.corner, { bottom: 8, left: 8, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
                <View style={[styles.corner, { bottom: 8, right: 8, borderBottomWidth: 2, borderRightWidth: 2 }]} />
              </View>
              <Text style={{ color: '#64748B', fontSize: 10, textAlign: 'center', marginTop: 10 }}>* Tap document for secure download/full view</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.noDocBox}>
              <MaterialCommunityIcons name="file-alert-outline" size={30} color="#EF4444" />
              <Text style={[styles.value, { color: '#EF4444', fontSize: 12, marginTop: 8 }]}>No KYC Document Uploaded</Text>
            </View>
          )}
        </View>
      </Reveal>

      {/* ACTIONS */}
      <Reveal index={4}>
        <View style={styles.btnGroup}>
          <Press3D style={[styles.btn, styles.rejectBtn]} onPress={() => handleAction('Reject')}>
            <MaterialCommunityIcons name="close-octagon-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={[styles.btnText, {color: '#EF4444'}]}>DECLINE</Text>
          </Press3D>
          <Press3D style={[styles.btn, styles.approveBtn]} onPress={() => handleAction('Approve')}>
            <MaterialCommunityIcons name="shield-check" size={18} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>AUTHORIZE & VERIFY</Text>
          </Press3D>
        </View>
      </Reveal>
      <View style={{ height: 50 }} />

    </ScrollView>

    {/* 🔥 REJECT REASON MODAL 🔥 */}
    <Modal visible={rejectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
            <ModalCard>
                <View style={styles.modalGlow} />
                <View style={styles.modalHeaderBox}>
                    <View style={styles.modalIconTile}>
                      <MaterialCommunityIcons name="alert-circle" size={24} color="#EF4444" />
                    </View>
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
            </ModalCard>
        </View>
    </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  scrollContent: { padding: 20 },
  center: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  orb: { position: 'absolute', borderRadius: 999 },

  loaderRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 1, borderColor: '#312E81', backgroundColor: '#818CF812', alignItems: 'center', justifyContent: 'center', shadowColor: '#818CF8', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  loaderText: { color: '#475569', fontSize: 11, fontWeight: '900', letterSpacing: 2, marginTop: 20 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 26 },
  backBtn: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#334155', borderBottomWidth: 3, borderBottomColor: '#312E81', shadowColor: '#818CF8', shadowOpacity: 0.35, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  headerTitle: { color: '#FFF', fontSize: 17, fontWeight: '900', textShadowColor: '#818CF8', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 12 },
  secureRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 5 },
  secureText: { color: '#10B981', fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },

  heroCard: { alignItems: 'center', backgroundColor: '#0F172A', borderRadius: 32, padding: 24, borderWidth: 1, borderBottomWidth: 5, borderColor: '#FFFFFF10', borderBottomColor: '#312E81', overflow: 'hidden', shadowColor: '#818CF8', shadowOpacity: 0.35, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 14 },
  heroOrbA: { position: 'absolute', top: -70, right: -50, width: 200, height: 200, borderRadius: 100, backgroundColor: '#818CF8', opacity: 0.16 },
  heroOrbB: { position: 'absolute', bottom: -80, left: -40, width: 180, height: 180, borderRadius: 90, backgroundColor: '#10B981', opacity: 0.08 },
  avatarRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 1.5, borderColor: '#4F46E5', alignItems: 'center', justifyContent: 'center', shadowColor: '#818CF8', shadowOpacity: 0.7, shadowRadius: 16, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  avatar: { width: 68, height: 68, borderRadius: 34, backgroundColor: '#312E8180', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#C7D2FE', fontSize: 28, fontWeight: '900' },
  expertInfo: { alignItems: 'center', marginTop: 16, marginBottom: 14 },
  name: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  email: { color: '#64748B', fontSize: 14, marginTop: 5 },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 8, borderRadius: 13, borderWidth: 1 },
  statusChipText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', marginTop: 28, marginBottom: 14 },
  sectionAccent: { width: 3, height: 14, borderRadius: 2, backgroundColor: '#818CF8', marginRight: 10 },
  sectionTitleInline: { color: '#94A3B8', fontSize: 11, fontWeight: '900', letterSpacing: 2, flex: 1 },
  downloadChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#818CF81F', borderWidth: 1, borderColor: '#818CF855', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, gap: 4 },
  downloadText: { color: '#818CF8', fontSize: 11, fontWeight: '900' },

  card: { backgroundColor: '#0B1224', borderRadius: 28, padding: 22, borderWidth: 1, borderBottomWidth: 4, borderColor: '#FFFFFF10', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  detailIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: '#818CF81F', borderWidth: 1, borderColor: '#818CF855', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  label: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  value: { color: '#FFF', fontSize: 16, fontWeight: '700', marginTop: 5 },
  divider: { height: 1, backgroundColor: '#FFFFFF10', marginVertical: 20 },

  docFrame: { height: 200, borderRadius: 18, overflow: 'hidden', backgroundColor: '#1E293B', borderWidth: 1, borderColor: '#334155' },
  idImage: { width: '100%', height: 200, borderRadius: 15, backgroundColor: '#1E293B' },
  scanLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#10B981', opacity: 0.8, shadowColor: '#10B981', shadowOpacity: 1, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
  corner: { position: 'absolute', width: 18, height: 18, borderColor: '#818CF8', borderRadius: 3 },
  noDocBox: { alignItems: 'center', paddingVertical: 18 },

  btnGroup: { flexDirection: 'row', gap: 15, marginTop: 30 },
  btn: { flex: 1, padding: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', borderBottomWidth: 4 },
  rejectBtn: { backgroundColor: '#EF444420', borderWidth: 1, borderColor: '#EF444440', borderBottomColor: '#EF444480', shadowColor: '#EF4444', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  approveBtn: { backgroundColor: '#818CF8', borderBottomColor: '#4F46E5', shadowColor: '#818CF8', shadowOpacity: 0.6, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 9 },
  btnText: { color: '#FFF', fontWeight: '900', fontSize: 13 },

  // 🔥 MODAL & QUICK REASON CHIP STYLES 🔥
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { width: '100%', backgroundColor: '#0F172A', padding: 25, borderRadius: 28, borderWidth: 1, borderBottomWidth: 4, borderColor: '#1E293B', borderBottomColor: '#EF444470', overflow: 'hidden', shadowColor: '#EF4444', shadowOpacity: 0.4, shadowRadius: 24, shadowOffset: { width: 0, height: 10 }, elevation: 16 },
  modalGlow: { position: 'absolute', top: -60, right: -50, width: 180, height: 180, borderRadius: 90, backgroundColor: '#EF4444', opacity: 0.12 },
  modalHeaderBox: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  modalIconTile: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#EF44441F', borderWidth: 1, borderColor: '#EF444455', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
  modalSub: { color: '#475569', fontSize: 11, fontWeight: '700', marginBottom: 15 },
  quickReasonScroll: { marginBottom: 15, maxHeight: 40 },
  quickReasonChip: { backgroundColor: '#1E293B', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#334155', justifyContent: 'center' },
  quickReasonChipActive: { backgroundColor: '#EF444420', borderColor: '#EF4444' },
  quickReasonText: { color: '#94A3B8', fontSize: 11, fontWeight: '800' },
  quickReasonTextActive: { color: '#EF4444' },
  reasonInput: { backgroundColor: '#020617', color: '#FFF', padding: 15, borderRadius: 16, borderWidth: 1, borderColor: '#1E293B', minHeight: 80, textAlignVertical: 'top', fontSize: 14 },
  modalActionRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancelBtn: { flex: 1, padding: 15, borderRadius: 16, backgroundColor: '#1E293B', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#0F172A' },
  modalCancelText: { color: '#94A3B8', fontWeight: '900', fontSize: 12 },
  modalSubmitBtn: { flex: 1, padding: 15, borderRadius: 16, backgroundColor: '#EF4444', alignItems: 'center', borderBottomWidth: 3, borderBottomColor: '#B91C1C', shadowColor: '#EF4444', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  modalSubmitText: { color: '#FFF', fontWeight: '900', fontSize: 12 }
});