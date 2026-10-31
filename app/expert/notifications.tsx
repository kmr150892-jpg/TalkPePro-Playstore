import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, limit, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';

const { width, height } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [realCallerName, setRealCallerName] = useState<string | null>(null);
  const [callerProfilePic, setCallerProfilePic] = useState<string | null>(null); 

  const ringTimerAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current; 
  
  const radius = 85; 
  const stroke = 8;  
  const circumference = radius * 2 * Math.PI;

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 🔥 FIX: Added 'async' to docSnap callback to handle read status update
    const unsubUser = onSnapshot(doc(db, "users", user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const notifs = data.notifications || [];
        setNotifications(notifs); 

        // 🔥 FIX: Mark unread notifications as read when screen is opened
        const hasUnread = notifs.some((n: any) => n.read === false);
        if (hasUnread) {
            const updatedNotifs = notifs.map((n: any) => ({ ...n, read: true }));
            try {
                await updateDoc(doc(db, "users", user.uid), {
                    notifications: updatedNotifs
                });
            } catch (err) {
                console.error("Error updating read status: ", err);
            }
        }
      }
      setLoading(false);
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
        Animated.sequence([
            Animated.timing(floatAnim, { toValue: -10, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(floatAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
    ).start();

    return () => unsubUser();
  }, []);

  // 🔥 CRITICAL FIX: REAL-TIME CALL LISTENER & STATE RESET
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const callQuery = query(
      collection(db, "calls"),
      where("expertId", "==", user.uid),
      where("status", "==", "dialing"),
      limit(1)
    );

    const unsubCalls = onSnapshot(callQuery, async (snapshot) => {
      if (!snapshot.empty) {
        const docSnapshot = snapshot.docs[0];
        const docData = docSnapshot.data();
        
        // Prevent re-triggering if the same call ID is already active
        if (incomingCall?.id !== docSnapshot.id) {
            setIncomingCall({ id: docSnapshot.id, ...docData });

            try {
                const userSnap = await getDoc(doc(db, "users", docData.callerId));
                if (userSnap.exists()) {
                  const uData = userSnap.data();
                  // Priority: Custom Name > Google Auth Name
                  const name = uData.name || uData.userName || uData.displayName || "TALKPE PRO User";
                  // Priority: Cloudinary Upload > Google Profile Pic
                  const photo = uData.profilePic || uData.photoURL || null;
                  
                  setRealCallerName(name);
                  setCallerProfilePic(photo);
                  setShowCallModal(true);
                  startRingTimer();
                } else {
                  setRealCallerName(docData.callerName || "User");
                  setShowCallModal(true);
                  startRingTimer();
                }
            } catch (e) {
                setRealCallerName("User");
                setShowCallModal(true);
                startRingTimer();
            }
        }
      } else {
        // 🔥 FULL STATE CLEANUP: Reset everything when call ends or is rejected
        setIncomingCall(null);
        setShowCallModal(false);
        setRealCallerName(null);
        setCallerProfilePic(null);
        ringTimerAnim.stopAnimation();
      }
    });

    return () => unsubCalls();
  }, [incomingCall?.id]); // Added dependency to monitor call ID changes

  const startRingTimer = () => {
    ringTimerAnim.setValue(1);
    Animated.timing(ringTimerAnim, {
      toValue: 0,
      duration: 12000, 
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleMissedCall();
      }
    });
  };

  const handleMissedCall = async () => {
    if (incomingCall?.id) {
      try {
        await updateDoc(doc(db, "calls", incomingCall.id), { status: 'missed' });
        // State cleanup is handled automatically by the onSnapshot listener above
      } catch (e) { console.log(e); }
    }
  };

  const handleAccept = async () => {
    if (!incomingCall) return;
    ringTimerAnim.stopAnimation();
    try {
      await updateDoc(doc(db, "calls", incomingCall.id), { status: 'accepted' });
      setShowCallModal(false);
      router.push({
        pathname: '/videocall',
        params: { 
          callId: incomingCall.id, 
          role: 'expert', 
          callerName: realCallerName || "User",
          callerId: incomingCall.callerId // Passing this to maintain ID tracking
        }
      } as any);
    } catch (e) { console.log(e); }
  };

  const handleReject = async () => {
    if (!incomingCall) return;
    ringTimerAnim.stopAnimation();
    try {
      await updateDoc(doc(db, "calls", incomingCall.id), { status: 'rejected' });
      // State cleanup is handled automatically by the onSnapshot listener above
    } catch (e) { console.log(e); }
  };

  // 🔥 NEW: delete a single notification from the log (with confirmation)
  const deleteNotification = (item: any) => {
    const user = auth.currentUser;
    if (!user) return;
    Alert.alert("Delete log", "Remove this notification?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "users", user.uid), {
              notifications: notifications.filter((n: any) => n !== item)
            });
          } catch (e) { console.log("Delete notification error:", e); }
        }
      }
    ]);
  };

  // 🔥 NEW: clear the whole log (with confirmation)
  const clearAllNotifications = () => {
    const user = auth.currentUser;
    if (!user) return;
    Alert.alert("Clear all logs", "Remove all notifications? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "users", user.uid), { notifications: [] });
          } catch (e) { console.log("Clear notifications error:", e); }
        }
      }
    ]);
  };

  const renderItem = ({ item }: any) => {
    const isCall = item.type === 'call';
    const targetId = item.callerId || item.userId || item.fromId; // 🔥 NEW: who to open on tap
    // 🔥 NEW: notifications without a user (level up / connection request) open a dashboard tab instead
    const notifTitle = String(item.title || '');
    const targetTab: string | null =
      item.tab ||
      (/connection request/i.test(notifTitle) ? 'MESSAGES' :
       /level/i.test(notifTitle) ? 'LEVELS' : null);
    return (
      // 🔥 NEW: Card is now tappable -> opens that user's profile (only if the notification has a user id)
      <TouchableOpacity
        activeOpacity={(targetId || targetTab) ? 0.7 : 1}
        disabled={!targetId && !targetTab}
        onPress={() => {
          if (targetId) {
            router.push({ pathname: '/user-detail', params: { userId: targetId } } as any);
          } else if (targetTab) {
            router.navigate({ pathname: '/expert/dashboard', params: { tab: targetTab, ts: String(Date.now()) } } as any);
          }
        }}
        style={styles.notificationCardWrapper}
      >
          <BlurView intensity={20} tint="dark" style={styles.notificationCard}>
            {item.callerImage ? (
              // 🔥 NEW: caller profile photo (if saved in the notification)
              <Image source={{ uri: item.callerImage }} style={styles.notifAvatar} />
            ) : (
            <LinearGradient
              colors={isCall ? ['#F43F5E', '#9F1239'] : ['#00F2FE', '#4FACFE']}
              start={{x: 0, y: 0}} end={{x: 1, y: 1}}
              style={[styles.iconBg, isCall ? styles.iconBgCall : styles.iconBgAlert]}
            >
              <MaterialCommunityIcons 
                name={isCall ? 'phone-incoming' : 'bell-ring'} 
                size={22} 
                color="#FFF" 
              />
            </LinearGradient>
            )}
            <View style={styles.textContainer}>
              <Text style={[styles.notifTitle, isCall && {color: '#FDA4AF'}]}>{item.title || "SYSTEM ALERT"}</Text>
              <Text style={styles.notifBody}>{item.message || "Protocol update received."}</Text>
              <View style={styles.timeRow}>
                 <Ionicons name="time-outline" size={12} color="#64748B" />
                 <Text style={styles.notifTime}>{item.time || "Just now"}</Text>
              </View>
            </View>
            {/* 🔥 NEW: delete this log */}
            <TouchableOpacity onPress={() => deleteNotification(item)} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialCommunityIcons name="trash-can-outline" size={20} color="#F43F5E" />
            </TouchableOpacity>
            <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
          </BlurView>
      </TouchableOpacity>
    );
  };

  // Safe fallback if the real name is not fetched quickly
  const displayName = realCallerName || "User";
  const displayPic = callerProfilePic || `https://ui-avatars.com/api/?name=${displayName}&background=0F172A&color=00F2FE&size=512&bold=true`;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#020617', '#0F172A', '#020617']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{alignItems: 'center'}}>
            <Text style={styles.headerLabel}>TERMINAL ACCESS</Text>
            <Text style={styles.headerTitle}>LOGS & ALERTS</Text>
          </View>
          <TouchableOpacity style={styles.configBtn}>
             <MaterialCommunityIcons name="shield-refresh-outline" size={24} color="#00F2FE" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#00F2FE" />
            <Text style={styles.loaderText}>SYNCING NODES...</Text>
          </View>
        ) : (
          <FlatList
            data={[...notifications].reverse()}
            keyExtractor={(_, index) => index.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              notifications.length > 0 ? (
                <View style={styles.clearAllRow}>
                  <TouchableOpacity onPress={clearAllNotifications} style={styles.clearAllBtn} activeOpacity={0.7}>
                    <MaterialCommunityIcons name="trash-can-outline" size={16} color="#F43F5E" />
                    <Text style={styles.clearAllText}>CLEAR ALL</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                   <MaterialCommunityIcons name="bell-sleep" size={70} color="#1E293B" />
                   <View style={styles.emptyGlow} />
                </View>
                <Text style={styles.emptyTitle}>NO TRANSMISSIONS</Text>
                <Text style={styles.emptyText}>Your secure notification log is currently empty. Waiting for incoming data.</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      <Modal visible={showCallModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(99, 102, 241, 0.1)', 'transparent', 'rgba(236, 72, 153, 0.05)']} style={StyleSheet.absoluteFill} />
          
          <View style={styles.callContent}>
            <View style={styles.callBadgeContainer}>
                <View style={styles.liveDot} />
                <Text style={styles.incomingLabel}>INCOMING SECURE LINE</Text>
            </View>
            
            <View style={styles.mainAvatarSection}>
                <Animated.View style={[styles.timerWrapper, { transform: [{ scale: pulseAnim }, { translateY: floatAnim }] }]}>
                    
                    {/* Background Pulsing Glows */}
                    <View style={[styles.bgGlow, { backgroundColor: '#6366F1' }]} />
                    <View style={[styles.bgGlow, { backgroundColor: '#EC4899', width: 220, height: 220, opacity: 0.15 }]} />

                    <Svg width={(radius + stroke) * 2} height={(radius + stroke) * 2} style={styles.timerSvg}>
                        <Circle cx={radius + stroke} cy={radius + stroke} r={radius} stroke="rgba(255, 255, 255, 0.05)" strokeWidth={stroke} fill="transparent" />
                        <AnimatedCircle
                            cx={radius + stroke}
                            cy={radius + stroke}
                            r={radius}
                            stroke="#00F2FE" 
                            strokeWidth={stroke}
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={ringTimerAnim.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })}
                            strokeLinecap="round"
                        />
                    </Svg>
                    <View style={styles.avatarContainer}>
                        <Image 
                            source={{ uri: displayPic }} 
                            style={styles.callerAvatar} 
                        />
                    </View>
                </Animated.View>
            </View>

            <Text style={styles.callerNameText}>{displayName.toUpperCase()}</Text>
            <Text style={styles.callerSubText}>Requesting video uplink...</Text>
            
            <View style={styles.encryptionBadge}>
               <MaterialCommunityIcons name="shield-lock-outline" size={16} color="#10B981" />
               <Text style={styles.encryptionText}>QUANTUM ENCRYPTED</Text>
            </View>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity onPress={handleReject} style={styles.actionBtnContainer} activeOpacity={0.8}>
                <View style={styles.rejectGlow} />
                <LinearGradient colors={['#F43F5E', '#9F1239']} style={styles.actionBtnInner}>
                   <Ionicons name="close" size={36} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.btnLabel, {color: '#F43F5E'}]}>DECLINE</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleAccept} style={styles.actionBtnContainer} activeOpacity={0.8}>
                <View style={styles.acceptGlow} />
                <LinearGradient colors={['#10B981', '#059669']} style={styles.actionBtnInner}>
                   <Ionicons name="videocam" size={32} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.btnLabel, {color: '#10B981'}]}>ACCEPT</Text>
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
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20,paddingVertical: 20 },
  headerLabel: { color: '#00F2FE', fontSize: 10, fontWeight: '900', letterSpacing: 4 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: -1, textShadowColor: '#00F2FE80', textShadowRadius: 10 },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  configBtn: { padding: 10, backgroundColor: 'rgba(0, 242, 254, 0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.2)' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { color: '#00F2FE', marginTop: 15, fontWeight: '900', letterSpacing: 3, fontSize: 11 },
  listContent: { padding: 20, paddingBottom: 100 },
  notificationCardWrapper: { marginBottom: 15, borderRadius: 25, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', elevation: 15 },
  notificationCard: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: 'rgba(15, 23, 42, 0.6)' },
  iconBg: { width: 55, height: 55, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  iconBgCall: { shadowColor: '#F43F5E', shadowRadius: 15, elevation: 10 },
  iconBgAlert: { shadowColor: '#00F2FE', shadowRadius: 15, elevation: 10 },
  notifAvatar: { width: 55, height: 55, borderRadius: 20, backgroundColor: '#0F172A' },
  deleteBtn: { padding: 8, marginRight: 4 },
  clearAllRow: { alignItems: 'flex-end', marginBottom: 15 },
  clearAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(244, 63, 94, 0.1)', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)' },
  clearAllText: { color: '#F43F5E', fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  textContainer: { flex: 1, marginLeft: 18 },
  notifTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  notifBody: { color: '#94A3B8', fontSize: 13, marginTop: 6, fontWeight: '600', lineHeight: 20 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  notifTime: { color: '#64748B', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  emptyState: { alignItems: 'center', marginTop: height * 0.15 },
  emptyIconCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(30, 41, 59, 0.5)', justifyContent: 'center', alignItems: 'center', marginBottom: 30, borderWidth: 2, borderColor: 'rgba(255,255,255,0.05)', position: 'relative' },
  emptyGlow: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#6366F1', opacity: 0.1, filter: 'blur(20px)' },
  emptyTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 4 },
  emptyText: { color: '#64748B', fontSize: 13, marginTop: 12, fontWeight: '600', textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
  
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  callContent: { alignItems: 'center', width: '100%', paddingHorizontal: 30 },
  callBadgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, marginBottom: 50, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.3)' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00F2FE', marginRight: 10, shadowColor: '#00F2FE', shadowRadius: 5, elevation: 5 },
  incomingLabel: { color: '#00F2FE', fontSize: 11, fontWeight: '900', letterSpacing: 4 },
  
  mainAvatarSection: { position: 'relative', marginBottom: 35 },
  timerWrapper: { width: 220, height: 220, justifyContent: 'center', alignItems: 'center' },
  bgGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 100, opacity: 0.25, filter: 'blur(30px)' },
  timerSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  avatarContainer: { width: 150, height: 150, borderRadius: 75, overflow: 'hidden', borderWidth: 4, borderColor: '#020617', backgroundColor: '#0F172A', elevation: 25 },
  callerAvatar: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  callerNameText: { color: '#FFF', fontSize: 40, fontWeight: '900', textAlign: 'center', letterSpacing: -1, textShadowColor: 'rgba(255,255,255,0.2)', textShadowRadius: 15 },
  callerSubText: { color: '#94A3B8', fontSize: 14, fontWeight: '700', marginTop: 10, letterSpacing: 1 },
  
  encryptionBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12, marginTop: 30, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  encryptionText: { color: '#10B981', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 60, paddingHorizontal: 20 },
  actionBtnContainer: { alignItems: 'center', position: 'relative' },
  rejectGlow: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: '#F43F5E', opacity: 0.4, filter: 'blur(15px)' },
  acceptGlow: { position: 'absolute', width: 90, height: 90, borderRadius: 45, backgroundColor: '#10B981', opacity: 0.4, filter: 'blur(15px)' },
  actionBtnInner: { width: 85, height: 85, borderRadius: 42.5, justifyContent: 'center', alignItems: 'center', elevation: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  btnLabel: { marginTop: 18, fontSize: 12, fontWeight: '900', letterSpacing: 3 }
});
