import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, limit, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../../firebaseConfig';

const { width, height } = Dimensions.get('window');

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [realCallerName, setRealCallerName] = useState<string | null>(null);

  // 1. General Notifications Listener
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const unsubUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setNotifications(data.notifications || []); 
      }
      setLoading(false);
    });
    return () => unsubUser();
  }, []);

  // 2. 🔥 ALTERNATIVE METHOD: Separate Listener for Call Status
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const callQuery = query(
      collection(db, "calls"),
      where("expertId", "==", user.uid),
      where("status", "==", "dialing"),
      limit(1)
    );

    const unsubCalls = onSnapshot(callQuery, (snapshot) => {
      if (!snapshot.empty) {
        const docSnapshot = snapshot.docs[0];
        const docData = docSnapshot.data();
        
        // Modal-ai open pannaama data-vai mattum set panrom
        setIncomingCall({ id: docSnapshot.id, ...docData });
      } else {
        setIncomingCall(null);
        setShowCallModal(false);
        setRealCallerName(null);
      }
    });

    return () => unsubCalls();
  }, []);

  // 3. 🔥 THE REAL FIX: React to incomingCall change and Fetch Name
  useEffect(() => {
    async function fetchName() {
      if (incomingCall?.callerId) {
        try {
          const userSnap = await getDoc(doc(db, "users", incomingCall.callerId));
          if (userSnap.exists()) {
            const uData = userSnap.data();
            const name = uData.userName || uData.name || "TalkPe User";
            
            // Strictly check: Anonymous nu vantha ignore pannu
            if (name !== "Anonymous") {
              setRealCallerName(name);
              setShowCallModal(true);
            }
          } else {
            setRealCallerName(incomingCall.callerName || "User");
            setShowCallModal(true);
          }
        } catch (e) {
          setRealCallerName("User");
          setShowCallModal(true);
        }
      }
    }
    fetchName();
  }, [incomingCall?.id]); // Call ID maarum pothu mattum thaan ithu trigger aagum

  const handleAccept = async () => {
    if (!incomingCall) return;
    try {
      await updateDoc(doc(db, "calls", incomingCall.id), { status: 'accepted' });
      setShowCallModal(false);
      router.push({
        pathname: '/videocall',
        params: { 
          callId: incomingCall.id, 
          role: 'expert', 
          callerName: realCallerName || "User"
        }
      } as any);
    } catch (e) { console.log(e); }
  };

  const handleReject = async () => {
    if (!incomingCall) return;
    try {
      await updateDoc(doc(db, "calls", incomingCall.id), { status: 'rejected' });
      setShowCallModal(false);
    } catch (e) { console.log(e); }
  };

  const renderItem = ({ item }: any) => (
    <View style={styles.notificationCard}>
      <View style={styles.iconBg}>
        <MaterialCommunityIcons 
          name={item.type === 'call' ? 'phone-incoming' : 'bell-ring'} 
          size={22} 
          color="#818CF8" 
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.notifTitle}>{item.title || "New Update"}</Text>
        <Text style={styles.notifBody}>{item.message || "You have a new message"}</Text>
        <Text style={styles.notifTime}>{item.time || "Just now"}</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color="#818CF8" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={[...notifications].reverse()}
          keyExtractor={(_, index) => index.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="bell-off-outline" size={60} color="#1E293B" />
              <Text style={styles.emptyText}>No notifications yet!</Text>
            </View>
          }
        />
      )}

      {/* ✅ Premium Call Modal with Strict Name Check */}
      <Modal visible={showCallModal && !!realCallerName} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
          <View style={styles.callContent}>
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: `https://ui-avatars.com/api/?name=${realCallerName}&background=818CF8&color=fff` }} 
                style={styles.callerAvatar} 
              />
              <View style={styles.pulseRing} />
            </View>
            <Text style={styles.incomingText}>INCOMING CALL</Text>
            <Text style={styles.callerName}>{realCallerName}</Text>
            <View style={styles.buttonRow}>
              <TouchableOpacity onPress={handleReject} style={[styles.callBtn, styles.declineBtn]}>
                <Ionicons name="close" size={32} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAccept} style={[styles.callBtn, styles.acceptBtn]}>
                <Ionicons name="videocam" size={32} color="#FFF" />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 50, paddingHorizontal: 20, paddingBottom: 20 },
  backBtn: { backgroundColor: '#1E293B', padding: 8, borderRadius: 12 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  listContent: { padding: 20 },
  notificationCard: { flexDirection: 'row', backgroundColor: '#1E293B40', padding: 15, borderRadius: 24, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  iconBg: { width: 48, height: 48, backgroundColor: 'rgba(129, 140, 248, 0.1)', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  textContainer: { flex: 1 },
  notifTitle: { color: '#FFF', fontSize: 14, fontWeight: '800' },
  notifBody: { color: '#94A3B8', fontSize: 12, marginTop: 4, lineHeight: 18 },
  notifTime: { color: '#475569', fontSize: 10, marginTop: 8, fontWeight: '700' },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#475569', fontSize: 14, marginTop: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  callContent: { alignItems: 'center', width: '100%' },
  avatarContainer: { width: 120, height: 120, marginBottom: 30, justifyContent: 'center', alignItems: 'center' },
  callerAvatar: { width: 110, height: 110, borderRadius: 55, borderWidth: 3, borderColor: '#818CF8' },
  pulseRing: { position: 'absolute', width: 140, height: 140, borderRadius: 70, borderWidth: 2, borderColor: '#818CF830' },
  incomingText: { color: '#818CF8', fontSize: 12, fontWeight: '900', letterSpacing: 3, marginBottom: 10 },
  callerName: { color: '#FFF', fontSize: 28, fontWeight: '900', marginBottom: 60 },
  buttonRow: { flexDirection: 'row', gap: 50 },
  callBtn: { width: 75, height: 75, borderRadius: 37.5, justifyContent: 'center', alignItems: 'center', elevation: 10 },
  declineBtn: { backgroundColor: '#EF4444' },
  acceptBtn: { backgroundColor: '#10B981' }
});