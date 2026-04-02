import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { activateKeepAwake, deactivateKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, onSnapshot, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { auth, db } from '../firebaseConfig';

const { height, width } = Dimensions.get('window');

const getLevelData = (totalBeans: number = 0) => {
  if (totalBeans >= 100000000) return { lvl: 10, label: 'LEGEND L10', color: '#F59E0B' };
  if (totalBeans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', color: '#EC4899' };
  if (totalBeans >= 30000000) return { lvl: 8, label: 'ELITE L8', color: '#8B5CF6' };
  if (totalBeans >= 10000000) return { lvl: 7, label: 'MASTER L7', color: '#3B82F6' };
  if (totalBeans >= 5000000)  return { lvl: 6, label: 'DIAMOND L6', color: '#06B6D4' };
  if (totalBeans >= 3000000)  return { lvl: 5, label: 'PLATINUM L5', color: '#10B981' };
  if (totalBeans >= 1000000)  return { lvl: 4, label: 'GOLD L4', color: '#EAB308' };
  if (totalBeans >= 300000)   return { lvl: 3, label: 'SILVER L3', color: '#94A3B8' };
  if (totalBeans >= 100000)    return { lvl: 2, label: 'BRONZE L2', color: '#B45309' };
  if (totalBeans >= 30000)     return { lvl: 1, label: 'ROOKIE L1', color: '#6366F1' };
  return { lvl: 0, label: 'BEGINNER L0', color: '#475569' };
};

export default function ExpertDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const user = auth.currentUser;

  const [expert, setExpert] = useState<any>(null);
  const [isCalling, setIsCalling] = useState(false);
  const [userBalance, setUserBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [userData, setUserData] = useState<any>(null);
  
  // ✅ FOLLOW SYSTEM STATES
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null); 
  const [followLoading, setFollowLoading] = useState(false);

  const getJoinedDuration = (createdAt: any) => {
    if (!createdAt) return '1 Day';
    const joinedDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - joinedDate.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '1 Day';
    if (diffDays < 30) return `${diffDays} Days`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} Mo`;
    return `${Math.floor(diffDays / 365)} Yr`;
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `Talk to ${expert?.name} on TalkPe! Expert in Video Consultation. Download now!`,
        url: `https://talkpe.com/expert/${id}`,
      });
    } catch (error: any) { Alert.alert(error.message); }
  };

  useEffect(() => {
    if (!id) return;
    const unsubExpert = onSnapshot(doc(db, 'users', id as string), (docSnap) => {
      if (docSnap.exists()) {
        setExpert({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    });

    let unsubUser: () => void;
    let unsubFollow: () => void;

    if (user?.uid) {
      unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setUserData(data);
          setUserBalance(data.balance || 0);
        }
      });

      // ✅ REAL-TIME CONNECTION CHECK
      const connectionId = `${user.uid}_${id}`;
      unsubFollow = onSnapshot(doc(db, "connections", connectionId), (docSnap) => {
        if (docSnap.exists()) {
          setConnectionStatus(docSnap.data().status); 
        } else {
          setConnectionStatus(null);
        }
      });
    }
    
    return () => { 
      unsubExpert(); 
      if (unsubUser) unsubUser(); 
      if (unsubFollow) unsubFollow();
    };
  }, [id, user]);

  const handleFollowAction = async () => {
    if (!user) return Alert.alert("Login Required", "Please login to follow experts.");
    
    // ✅ NEW: Redirection Logic for Friends
    if (connectionStatus === 'friend') {
      return router.push('/friends' as any);
    }

    if (!userData) return Alert.alert("Wait", "User data is loading...");

    setFollowLoading(true);
    const connectionId = `${user.uid}_${id}`;

    try {
      if (connectionStatus === null) {
        await setDoc(doc(db, "connections", connectionId), {
          senderId: user.uid,
          senderName: userData.name || "User",
          senderImage: userData.profilePic || userData.profileImage || "",
          receiverId: id,
          status: "pending",
          timestamp: serverTimestamp(),
        });
        Alert.alert("Sent", "Follow request sent to expert!");
      } else {
        // This handles unfollowing if it's 'pending'
        await deleteDoc(doc(db, "connections", connectionId));
      }
    } catch (error) {
      console.error("Follow error:", error);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleCancelCall = async () => {
    if (activeCallId) {
      try {
        await updateDoc(doc(db, "calls", activeCallId), { status: 'cancelled' });
      } catch (err) {
        console.error("Cancel call error:", err);
      }
    }
    setIsCalling(false);
    deactivateKeepAwake();
    setActiveCallId(null);
  };

  const handleStartCall = async () => {
    if (!expert?.isOnline) {
      Alert.alert("Expert Offline 💤", "This expert is currently offline.");
      return;
    }

    if (!userData || !userData.name) {
      Alert.alert("Syncing Profile...", "Please wait a moment.");
      return;
    }
    
    const priceToCharge = Number(expert.userPrice || (expert.beansPerMin * 2) || (expert.pricePerMin * 2) || 2400);
    
    if (userBalance < priceToCharge) {
      Alert.alert("Low Balance! 💎", `Need ${priceToCharge.toLocaleString()} diamonds for 1 min call.`, [
        { text: "Later" }, { text: "Recharge", onPress: () => router.push('/recharge' as any) }
      ]);
      return;
    }

    setIsCalling(true);
    activateKeepAwake();

    try {
      const callRef = await addDoc(collection(db, "calls"), {
        userId: user?.uid,
        userName: userData.name,
        userImage: userData.profilePic || userData.profileImage || "",
        expertId: expert.id,
        expertName: expert.name,
        expertImage: expert.profilePic || expert.profileImage || "",
        status: 'dialing',
        pricePerMin: priceToCharge,
        createdAt: new Date(),
        callerId: user?.uid 
      });

      setActiveCallId(callRef.id);

      const unsubCallStatus = onSnapshot(doc(db, "calls", callRef.id), (snap) => {
        if (snap.exists()) {
          const callData = snap.data();
          if (callData.status === 'accepted') {
            unsubCallStatus();
            setIsCalling(false);
            deactivateKeepAwake();
            setActiveCallId(null);
            router.push({
              pathname: "/videocall",
              params: { expertId: expert.id, expertName: expert.name, price: priceToCharge, callId: callRef.id }
            } as any);
          } else if (callData.status === 'rejected') {
            unsubCallStatus();
            setIsCalling(false);
            deactivateKeepAwake();
            setActiveCallId(null);
            Alert.alert("Call Rejected", "The expert is busy right now.");
          }
        }
      });

      setTimeout(async () => {
        if (activeCallId === callRef.id) {
          setIsCalling(false);
          deactivateKeepAwake();
          await updateDoc(doc(db, "calls", callRef.id), { status: 'timeout' });
          setActiveCallId(null);
        }
      }, 30000);

    } catch (err) {
      setIsCalling(false);
      Alert.alert("Error", "Could not initiate call.");
    }
  };

  if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#3B82F6" /></View>;

  const levelData = getLevelData(expert?.totalBeansEarned || 0);
  const accentColor = expert?.isOnline ? levelData.color : '#475569';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {isCalling && (
        <View style={styles.callingOverlay}>
          <LinearGradient colors={['rgba(15, 23, 42, 0.98)', '#0F172A']} style={StyleSheet.absoluteFill} />
          <ActivityIndicator size="large" color={levelData.color} />
          <Text style={styles.callingText}>Ringing {expert?.name}...</Text>
          <Text style={styles.callingSubtext}>Waiting for expert to join... 💎</Text>
          <TouchableOpacity style={styles.cancelCallBtn} onPress={handleCancelCall}>
            <Text style={styles.cancelText}>CANCEL CALL</Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
        <View style={styles.imageWrapper}>
          <Image 
            source={{ uri: expert?.profilePic || expert?.profileImage || 'https://via.placeholder.com/400' }} 
            style={styles.profileImg} 
          />
          <LinearGradient colors={['rgba(15, 23, 42, 0.5)', 'transparent', '#020617']} style={StyleSheet.absoluteFill} />
          
          <View style={styles.navRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconCircle}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onShare} style={styles.iconCircle}>
              <Ionicons name="share-social-outline" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>

          <View style={[styles.floatingBadge, { backgroundColor: accentColor }]}>
            <MaterialCommunityIcons name={levelData.lvl >= 7 ? "crown" : "shield-check"} size={14} color="#FFF" />
            <Text style={styles.floatingBadgeText}>{expert?.isOnline ? levelData.label : 'OFFLINE'}</Text>
          </View>
        </View>

        <View style={styles.infoContent}>
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.expertName}>{expert?.name}</Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={14} color="#64748B" />
                <Text style={styles.locationText}>{expert?.location || 'India'} • {expert?.age || '24'}y • {expert?.gender}</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 8 }}>
              <View style={[styles.statusBadge, { backgroundColor: expert?.isOnline ? '#05966920' : '#33415520' }]}>
                <View style={[styles.dot, { backgroundColor: expert?.isOnline ? '#10B981' : '#94A3B8' }]} />
                <Text style={[styles.statusText, {color: expert?.isOnline ? '#10B981' : '#94A3B8'}]}>{expert?.isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
              </View>

              {/* ✅ FOLLOW BUTTON WITH REDIRECT LOGIC */}
              <TouchableOpacity 
                style={[
                  styles.followBtn, 
                  connectionStatus !== null && styles.followingBtn,
                  connectionStatus === 'pending' && { backgroundColor: '#F59E0B' } 
                ]} 
                onPress={handleFollowAction}
                disabled={followLoading}
              >
                {followLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <MaterialCommunityIcons 
                      name={connectionStatus === 'friend' ? "account-check" : connectionStatus === 'pending' ? "account-clock" : "account-plus"} 
                      size={16} 
                      color="#FFF" 
                    />
                    <Text style={styles.followBtnText}>
  {connectionStatus === 'friend' ? "Following" : connectionStatus === 'pending' ? "Requested" : "Follow"}
</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.statsCard}>
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: accentColor }]}>L{levelData.lvl}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
            <View style={styles.vDivider} />
            <View style={styles.statBox}>
              <Text style={[styles.statVal, { color: '#3B82F6' }]}>💎 {Number(expert?.userPrice || (expert?.beansPerMin * 2) || 0).toLocaleString()}</Text>
              <Text style={styles.statLabel}>Diamonds/min</Text>
            </View>
            <View style={styles.vDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statVal}>{getJoinedDuration(expert?.createdAt)}</Text>
              <Text style={styles.statLabel}>Member</Text>
            </View>
          </View>

          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Portfolios</Text>
            <Text style={styles.galleryCount}>{expert?.gallery?.length || 0}/5</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
            {expert?.gallery && expert.gallery.length > 0 ? (
              expert.gallery.map((img: string, index: number) => (
                <View key={index} style={styles.galleryItem}>
                  <Image source={{ uri: img }} style={styles.galleryImg} />
                </View>
              ))
            ) : (
              <View style={styles.emptyGallery}><Text style={styles.emptyText}>No portfolio images</Text></View>
            )}
          </ScrollView>

          <Text style={[styles.sectionTitle, { marginTop: 30 }]}>Bio</Text>
          <View style={styles.bioContainer}>
              <Text style={styles.bioText}>{expert?.bio || "Verified professional on TalkPe."}</Text>
          </View>

          <View style={styles.trustBanner}>
            <MaterialCommunityIcons name="shield-check-outline" size={20} color="#10B981" />
            <Text style={styles.trustText}>Verified Expert • Secure End-to-End Call</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bottomBar}>
        <View style={styles.priceInfo}>
          <Text style={styles.totalLabel}>CONSULTATION FEE</Text>
          <View style={styles.priceRow}>
              <Ionicons name="diamond" size={16} color={expert?.isOnline ? "#3B82F6" : "#475569"} />
              <Text style={[styles.totalVal, !expert?.isOnline && { color: '#475569' }]}>
                  {Number(expert?.userPrice || (expert?.beansPerMin * 2) || 0).toLocaleString()}
                  <Text style={{fontSize: 12, color: '#94A3B8'}}>/min</Text>
              </Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.callBtn} 
          onPress={handleStartCall}
          disabled={!expert?.isOnline}
        >
          <LinearGradient 
            colors={expert?.isOnline ? [levelData.color, levelData.color + 'CC'] : ['#1E293B', '#0F172A']} 
            style={[styles.btnGradient, !expert?.isOnline && { borderWidth: 1, borderColor: '#334155' }]}
          >
            <Ionicons name={expert?.isOnline ? "videocam" : "videocam-off"} size={22} color={expert?.isOnline ? "#FFF" : "#475569"} />
            <Text style={[styles.callBtnText, !expert?.isOnline && { color: '#475569' }]}>
                {expert?.isOnline ? "Start Call" : "Offline"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
  imageWrapper: { width: '100%', height: height * 0.52, position: 'relative' },
  profileImg: { width: '100%', height: '100%', resizeMode: 'cover' },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 55, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  iconCircle: { backgroundColor: 'rgba(2, 6, 23, 0.4)', padding: 10, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  floatingBadge: { position: 'absolute', bottom: 60, left: 20, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, gap: 6 },
  floatingBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  infoContent: { padding: 25, marginTop: -45, backgroundColor: '#020617', borderTopLeftRadius: 40, borderTopRightRadius: 40, minHeight: 500 },
  nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  expertName: { color: '#FFF', fontSize: 30, fontWeight: '900' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  locationText: { color: '#64748B', fontSize: 13, fontWeight: '600' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, gap: 6 },
  followBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#3B82F6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 12, gap: 6 },
  followingBtn: { backgroundColor: '#334155' },
  followBtnText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { fontSize: 10, fontWeight: '900' },
  statsCard: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 25, backgroundColor: '#1E293B30', padding: 22, borderRadius: 25, borderWidth: 1, borderColor: '#1E293B' },
  statBox: { alignItems: 'center' },
  vDivider: { width: 1, height: '40%', backgroundColor: '#334155', alignSelf: 'center' },
  statVal: { color: '#FFF', fontSize: 19, fontWeight: '900' },
  statLabel: { color: '#475569', fontSize: 9, marginTop: 4, fontWeight: '800', textTransform: 'uppercase' },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sectionTitle: { color: '#FFF', fontSize: 18, fontWeight: '900' },
  galleryCount: { color: '#3B82F6', fontSize: 11, fontWeight: '800' },
  galleryScroll: { flexDirection: 'row' },
  galleryItem: { marginRight: 12, borderRadius: 18, overflow: 'hidden', backgroundColor: '#1E293B' },
  galleryImg: { width: 120, height: 160, resizeMode: 'cover' },
  emptyGallery: { width: width - 50, height: 100, backgroundColor: '#1E293B20', borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#334155' },
  emptyText: { color: '#475569', fontSize: 12 },
  bioContainer: { backgroundColor: '#1E293B20', padding: 20, borderRadius: 22, marginTop: 10 },
  bioText: { color: '#94A3B8', lineHeight: 22, fontSize: 14 },
  trustBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B98110', padding: 18, borderRadius: 20, marginTop: 30, gap: 10 },
  trustText: { color: '#10B981', fontSize: 12, fontWeight: '700' },
  callingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 9999, justifyContent: 'center', alignItems: 'center' },
  callingText: { color: '#FFF', marginTop: 25, fontSize: 22, fontWeight: '900' },
  callingSubtext: { color: '#3B82F6', marginTop: 10, fontSize: 14, fontWeight: '600' },
  cancelCallBtn: { marginTop: 40, padding: 15, borderRadius: 15, borderWidth: 1, borderColor: '#F87171' },
  cancelText: { color: '#F87171', fontWeight: '900', letterSpacing: 1 },
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 22, paddingBottom: 40, backgroundColor: '#0F172A', borderTopLeftRadius: 35, borderTopRightRadius: 35, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#1E293B' },
  priceInfo: { flex: 1 },
  totalLabel: { color: '#475569', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  totalVal: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  callBtn: { width: '55%', height: 62, borderRadius: 20, overflow: 'hidden' },
  btnGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 },
  callBtnText: { color: '#FFF', fontSize: 17, fontWeight: '900' }
});