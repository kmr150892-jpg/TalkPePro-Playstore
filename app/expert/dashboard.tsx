import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, limit, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

// --- COMPONENTS ---
import ConsoleHome from './components/ConsoleHome';
import ExpertStats from './components/ExpertStats';
import LevelInsights from './components/LevelInsights';
import WalletSystem from './components/WalletSystem';
// ✅ NEW COMPONENT IMPORT
import ExpertMessages from './ExpertMessages';

const { width } = Dimensions.get('window');

export default function ExpertDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(auth.currentUser);
  const [activeTab, setActiveTab] = useState('DASH');
  const [loading, setLoading] = useState(true);
  const [expertData, setExpertData] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(false);

  // Call Modal States
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [showCallModal, setShowCallModal] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  // 🛡️ 1. AUTH OBSERVER
  useEffect(() => {
    const authUnsub = auth.onAuthStateChanged((u) => {
      if (!u) {
        setLoading(false);
        router.replace('/' as any);
      } else {
        setUser(u);
      }
    });
    return () => authUnsub();
  }, []);

  // 📡 2. REAL-TIME PROFILE & CALL MONITOR
  useEffect(() => {
    if (!user?.uid) return;

    // A. Profile Listener - Fix for isOnline error
    const unsubProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data) {
          // Safety check added here to avoid "data is undefined" error
          setExpertData({ uid: snap.id, ...data });
          setIsOnline(data.isOnline ?? false); 
        }
        
        setLoading(false);
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true })
        ]).start();
      } else {
        setLoading(false);
      }
    });

    // 🚀 B. CALL MONITOR
    const callsQuery = query(
      collection(db, "calls"),
      where("expertId", "==", user.uid),
      where("status", "==", "dialing"),
      limit(1)
    );

    const unsubCalls = onSnapshot(callsQuery, (snap) => {
      if (!snap.empty) {
        const callDoc = snap.docs[0];
        const callData = { id: callDoc.id, ...callDoc.data() };
        setIncomingCall(callData);
        setShowCallModal(true);
      } else {
        setShowCallModal(false);
        setIncomingCall(null);
      }
    });

    return () => {
      unsubProfile();
      unsubCalls();
    };
  }, [user?.uid]);

  // ✅ CALL ACTIONS - FIXED FOR DOUBLE CALCULATION PROTECTION
  const handleAcceptCall = async () => {
    if (!incomingCall || !user?.uid) return;
    
    // First, close modal to prevent UI ghosting
    setShowCallModal(false);

    try {
      // Update status to accepted
      await updateDoc(doc(db, "calls", incomingCall.id), { 
        status: 'accepted',
        acceptedAt: serverTimestamp() 
      });
      
      // Navigate to video call with proper params
      router.push({
        pathname: '/videocall',
        params: {
          expertId: user.uid,
          expertName: expertData?.userName || expertData?.name || 'Expert',
          callId: incomingCall.id,
          role: 'expert',
          callerName: incomingCall.callerName || 'User'
        }
      } as any);
    } catch (e) { 
      console.log("Accept Fail", e); 
      // If error, reset modal state
      setShowCallModal(true);
    }
  };

  const handleRejectCall = async () => {
    if (!incomingCall) return;
    try {
      await updateDoc(doc(db, "calls", incomingCall.id), { status: 'rejected' });
      setShowCallModal(false);
    } catch (e) { console.log("Reject Fail", e); }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#6366F1" />
        <Text style={styles.loaderText}>SYNCING SECURELY...</Text>
      </View>
    );
  }

  // 🛠️ HANDLER FOR STATUS & PRICE SYNC
  const toggleOnlineStatus = async (status: boolean) => {
    if (!user?.uid) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { 
        isOnline: status
      });
    } catch (e) {
      console.log("Status Update Error", e);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'DASH': return <ConsoleHome expertData={expertData} isOnline={isOnline} setIsOnline={toggleOnlineStatus} />;
      case 'WALLET': return <WalletSystem expertData={expertData} />;
      case 'MESSAGES': return <ExpertMessages />; // ✅ Fixed: Component handling its own navigation
      case 'LEVELS': return <LevelInsights expertData={expertData} />;
      case 'STATS': return <ExpertStats expertData={expertData} />;
      default: return <ConsoleHome expertData={expertData} isOnline={isOnline} setIsOnline={toggleOnlineStatus} />;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={['#020617', '#0F172A', '#020617']} style={StyleSheet.absoluteFill} />
      
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          {renderContent()}
        </Animated.View>

        <View style={styles.bottomNav}>
          <NavButton id="DASH" icon="cpu" label="CONSOLE" active={activeTab} onPress={setActiveTab} />
          <NavButton id="WALLET" icon="database" label="WALLET" active={activeTab} onPress={setActiveTab} />
          {/* ✅ MESSAGES BUTTON */}
          <NavButton id="MESSAGES" icon="message-square" label="MESSAGES" active={activeTab} onPress={setActiveTab} />
          <NavButton id="LEVELS" icon="award" label="LEVELS" active={activeTab} onPress={setActiveTab} />
          <NavButton id="STATS" icon="activity" label="STATS" active={activeTab} onPress={setActiveTab} />
        </View>
      </SafeAreaView>

      {/* 🔥 CALL OVERLAY */}
      <Modal visible={showCallModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
          
          <View style={styles.callContent}>
            <View style={styles.pulseContainer}>
                <View style={styles.outerPulse} />
                <Image
                  source={{ uri: `https://ui-avatars.com/api/?name=${incomingCall?.callerName || 'U'}&background=6366F1&color=fff&size=200` }}
                  style={styles.callerAvatar}
                />
            </View>

            <Text style={styles.incomingLabel}>INCOMING CONSULTATION</Text>
            <Text style={styles.callerNameText}>{incomingCall?.callerName || "New User"}</Text>
            <Text style={styles.callSubText}>Wants to connect with you...</Text>
            
            <View style={styles.callActionRow}>
              <TouchableOpacity onPress={handleRejectCall} style={[styles.actionBtn, styles.declineBg]}>
                <Ionicons name="close" size={40} color="#FFF" />
              </TouchableOpacity>
              
              <TouchableOpacity onPress={handleAcceptCall} style={[styles.actionBtn, styles.acceptBg]}>
                <Ionicons name="videocam" size={35} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const NavButton = ({ id, icon, label, active, onPress }: any) => {
  const isActive = active === id;
  // Dynamic icon library selection
  const IconComponent = id === 'WALLET' ? FontAwesome5 : Feather;
  const iconName = id === 'WALLET' ? 'seedling' : icon;

  return (
    <TouchableOpacity onPress={() => onPress(id)} style={styles.navBtn}>
      <View style={[styles.navIconBg, isActive && styles.activeIconBg]}>
        <IconComponent name={iconName as any} size={18} color={isActive ? '#FFF' : '#64748B'} />
      </View>
      <Text style={[styles.navLabel, { color: isActive ? '#FFF' : '#64748B' }]}>{label}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
  loaderText: { color: '#6366F1', marginTop: 15, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  
  bottomNav: {
    flexDirection: 'row',
    backgroundColor: '#0F172A',
    // ✅ ULTRA HEIGHT UPDATE
    height: Platform.OS === 'ios' ? 110 : 100, 
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
    paddingBottom: Platform.OS === 'ios' ? 45 : 35, // Icons-ah nalla mela thukki vachutaen
    paddingTop: 15,
    borderTopLeftRadius: 35,
    borderTopRightRadius: 35,
    elevation: 25,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: -8 }
  },
  navBtn: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navIconBg: { padding: 6, borderRadius: 12 },
  activeIconBg: { backgroundColor: '#6366F1' },
  navLabel: { fontSize: 7, fontWeight: '900', marginTop: 4, letterSpacing: 0.5 },

  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  callContent: { alignItems: 'center', width: '100%' },
  pulseContainer: { width: 180, height: 180, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  outerPulse: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: 'rgba(99, 102, 241, 0.2)' },
  callerAvatar: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: '#6366F1' },
  incomingLabel: { color: '#6366F1', fontWeight: '900', fontSize: 11, letterSpacing: 4, marginBottom: 15 },
  callerNameText: { color: '#FFF', fontSize: 36, fontWeight: '900', marginBottom: 5 },
  callSubText: { color: '#94A3B8', fontSize: 14, fontWeight: '600', marginBottom: 60 },
  callActionRow: { flexDirection: 'row', gap: 60 },
  actionBtn: { width: 85, height: 85, borderRadius: 42.5, justifyContent: 'center', alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 15 },
  declineBg: { backgroundColor: '#FF3B30' },
  acceptBg: { backgroundColor: '#34C759' }
});