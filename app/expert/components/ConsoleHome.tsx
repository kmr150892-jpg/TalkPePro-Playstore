import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View
} from 'react-native';

// ✅ Firebase Core
import { arrayUnion, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '../../../firebaseConfig';

const { width } = Dimensions.get('window');
const ADMIN_UID = "jOQ0LxpaFkhuqIiMtOcYCGb3nEf2";

// ✅ Cloudinary Config
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dvwjxeexc/image/upload";
const UPLOAD_PRESET = "talkpe"; 

// ✅ Enable LayoutAnimation for Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ✅ MASTER LEVEL LOGIC
const getExpertLevel = (totalBeans: number = 0) => {
  let levelData;
  if (totalBeans >= 100000000) levelData = { lvl: 10, rate: 8000, label: 'LEGEND L10', next: 0, prev: 50000000 };
  else if (totalBeans >= 50000000) levelData = { lvl: 9, rate: 7000, label: 'MYTHIC L9', next: 100000000, prev: 30000000 };
  else if (totalBeans >= 30000000) levelData = { lvl: 8, rate: 5400, label: 'ELITE L8', next: 50000000, prev: 10000000 };
  else if (totalBeans >= 10000000) levelData = { lvl: 7, rate: 4800, label: 'MASTER L7', next: 30000000, prev: 5000000 };
  else if (totalBeans >= 5000000)  levelData = { lvl: 6, rate: 4200, label: 'DIAMOND L6', next: 10000000, prev: 3000000 };
  else if (totalBeans >= 3000000)  levelData = { lvl: 5, rate: 3600, label: 'PLATINUM L5', next: 5000000, prev: 1000000 };
  else if (totalBeans >= 1000000)  levelData = { lvl: 4, rate: 3000, label: 'GOLD L4', next: 3000000, prev: 300000 };
  else if (totalBeans >= 300000)   levelData = { lvl: 3, rate: 2400, label: 'SILVER L3', next: 1000000, prev: 100000 };
  else if (totalBeans >= 100000)    levelData = { lvl: 2, rate: 1800, label: 'BRONZE L2', next: 300000, prev: 30000 };
  else if (totalBeans >= 30000)     levelData = { lvl: 1, rate: 1200, label: 'ROOKIE L1', next: 100000, prev: 0 };
  else levelData = { lvl: 0, rate: 1000, label: 'BEGINNER L0', next: 30000, prev: 0 };

  return { ...levelData, minRate: 300, maxRate: levelData.rate };
};

export default function ConsoleHome({ expertData: initialData, isOnline, setIsOnline }: any) {
  const router = useRouter();
  const [user, setUser] = useState(auth.currentUser);
  const isAdmin = user?.uid === ADMIN_UID;

  const [expertData, setExpertData] = useState(initialData);
  const [modalVisible, setModalVisible] = useState(false);
  const [rateModalVisible, setRateModalVisible] = useState(false);
  
  // ✅ FOLLOW LOGIC STATES
  const [followModalVisible, setFollowModalVisible] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<any[]>([]);
  const [acceptedFollowers, setAcceptedFollowers] = useState<any[]>([]);

  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('');
  const [newRate, setNewRate] = useState('1000');

  const [uploading, setUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalBeans = expertData?.totalBeansEarned || expertData?.totalBeans || 0;
  const walletBalance = expertData?.walletBalance ?? expertData?.beansBalance ?? 0;
  
  const levelInfo = getExpertLevel(totalBeans);
  
  const range = levelInfo.next - levelInfo.prev;
  const earnedInRange = totalBeans - levelInfo.prev;
  const progressPercent = levelInfo.next > 0 ? Math.max(0, Math.min((earnedInRange / range) * 100, 100)) : 100;
  
  const pendingBeansCount = levelInfo.next - totalBeans;
  const statusColor = isOnline ? '#10B981' : '#94A3B8';

  useEffect(() => {
    const authUnsub = auth.onAuthStateChanged((u) => setUser(u));
    return () => authUnsub();
  }, []);

  useEffect(() => {
    if (!user?.uid) return;

    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setExpertData(data);
        setEditName(data.name || data.displayName || '');
        setEditBio(data.bio || '');
        setEditLocation(data.location || '');
        setEditAge(data.age || '');
        setEditGender(data.gender || '');
        setNewRate(String(data.pricePerMin || '1000'));
      }
    });

    // ✅ FIXED REAL-TIME LISTENER FOR PENDING VS FRIENDS
    const q = query(collection(db, "connections"), where("receiverId", "==", user.uid));

const unsubConn = onSnapshot(q, (snap) => {
  const allConns = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  // 🚀 HARD FILTER (NO OVERLAP GUARANTEE)
  const pending: any[] = [];
  const friends: any[] = [];

  allConns.forEach((c: any) => {
    if (c.status === "pending") {
      pending.push(c);
    } else if (c.status === "friend") {
      friends.push(c);
    }
  });

  // ✅ CLEAN STATE UPDATE (FORCE NO DUPLICATES)
  setPendingRequests([...pending]);
  setAcceptedFollowers([...friends]);
});

    return () => { unsub(); unsubConn(); };
  }, [user?.uid]);

  // ✅ LEVEL SYNC
  useEffect(() => {
    const syncLevelDetails = async () => {
      if (user?.uid && expertData) {
        const currentRate = expertData.pricePerMin || 1000;
        if (expertData.currentLevel !== levelInfo.lvl || currentRate < levelInfo.rate) {
          try {
            await updateDoc(doc(db, "users", user.uid), {
              currentLevel: levelInfo.lvl,
              levelTitle: levelInfo.label,
              pricePerMin: levelInfo.rate,
              beansPerMin: levelInfo.rate,
              userPrice: levelInfo.rate * 2
            });
          } catch (e) { console.log("Silent level sync error"); }
        }
      }
    };
    syncLevelDetails();
  }, [totalBeans, user?.uid]);

  // ✅ ACCEPT/REJECT LOGIC - UPDATED TO CLEAR LIST IMMEDIATELY
  const handleAcceptRequest = async (connId: string) => {
    try {
      const connRef = doc(db, "connections", connId);
      // Status update pannunaale onSnapshot automatic-ah "New Requests" la irunthu thookidum
      await updateDoc(connRef, { 
        status: "friend",
        acceptedAt: serverTimestamp()
      });
    } catch (e) { Alert.alert("Error", "Could not accept request."); }
  };

  const handleRejectOrUnfollow = async (connId: string, type: string) => {
    try {
      await deleteDoc(doc(db, "connections", connId));
      if(type === 'unfollow') Alert.alert("Success", "Follower removed.");
    } catch (e) { Alert.alert("Error", "Action failed."); }
  };

  const handleUpdateRate = async () => {
    const rateNum = parseInt(newRate);
    if (expertData?.lastRateUpdate) {
        const lastUpdate = expertData.lastRateUpdate.toDate().getTime();
        const now = new Date().getTime();
        const diffMins = (now - lastUpdate) / (1000 * 60);
        if (diffMins < 30) {
            Alert.alert("Time Restriction", `Wait ${Math.ceil(30 - diffMins)} more minutes.`);
            return;
        }
    }
    if (isNaN(rateNum) || rateNum < levelInfo.minRate || rateNum > levelInfo.maxRate) {
      Alert.alert("Invalid Rate", `As a ${levelInfo.label}, rate must be between ${levelInfo.minRate} and ${levelInfo.maxRate}.`);
      return;
    }
    setSaving(true);
    try {
      if (user?.uid) {
        await updateDoc(doc(db, "users", user.uid), {
          pricePerMin: rateNum,
          beansPerMin: rateNum,
          userPrice: rateNum * 2,
          lastRateUpdate: serverTimestamp() 
        });
        setRateModalVisible(false);
        Alert.alert("Success", "Consultation rate updated!");
      }
    } catch (e) { Alert.alert("Error", "Update failed."); } finally { setSaving(false); }
  };

  const uploadToCloudinary = async (fileUri: string) => {
    let formData = new FormData();
    formData.append("file", { uri: fileUri, type: "image/jpeg", name: `expert_${Date.now()}.jpg` } as any);
    formData.append("upload_preset", UPLOAD_PRESET);
    try {
      const response = await fetch(CLOUDINARY_URL, { method: "POST", body: formData });
      const data = await response.json();
      return data.secure_url;
    } catch (err) { return null; }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!result.canceled && user?.uid) {
      setUploading(true);
      const url = await uploadToCloudinary(result.assets[0].uri);
      if (url) await updateDoc(doc(db, "users", user.uid), { profilePic: url });
      setUploading(false);
    }
  };

  const uploadGalleryImage = async () => {
    if ((expertData?.gallery?.length || 0) >= 5) {
      Alert.alert("Portfolio Full", "Maximum 5 photos allowed.");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.6 });
    if (!result.canceled && user?.uid) {
      setGalleryUploading(true);
      const url = await uploadToCloudinary(result.assets[0].uri);
      if (url) await updateDoc(doc(db, "users", user.uid), { gallery: arrayUnion(url) });
      setGalleryUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { 
        name: editName, bio: editBio, location: editLocation, age: editAge, gender: editGender
      });
      setModalVisible(false);
    } catch (error) { Alert.alert("Error", "Save failed"); } finally { setSaving(false); }
  };

  const handleLogout = () => { auth.signOut().then(() => { router.replace('/'); }); };

  return (
    <ScrollView style={styles.mainContainer} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      
      {/* HEADER BAR */}
      <View style={styles.headerBar}>
        <View style={styles.leftHeader}>
            <Text style={styles.logoText}>TALKPE<Text style={{color: '#818CF8'}}>PRO</Text></Text>
            <Text style={styles.subLogo}>EXPERT CONSOLE</Text>
        </View>
        <View style={styles.rightHeader}>
          {isAdmin && (
            <TouchableOpacity style={styles.adminIconBtn} onPress={() => router.push('/(admin)' as any)}>
              <MaterialCommunityIcons name="shield-crown" size={20} color="#10B981" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.iconCircle} onPress={() => router.push('/expert/notifications' as any)}>
            <Ionicons name="notifications-outline" size={20} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.iconCircle, {marginLeft: 8}]} onPress={handleLogout}>
            <Feather name="log-out" size={18} color="#F43F5E" />
          </TouchableOpacity>
        </View>
      </View>

      {/* PROFILE INFO SECTION */}
      <View style={styles.profileSection}>
        <View style={styles.avatarWrapper}>
          {uploading ? (
            <View style={[styles.avatar, styles.loaderCenter]}><ActivityIndicator color="#3B82F6" /></View>
          ) : (
            <Image source={{ uri: expertData?.profilePic || 'https://via.placeholder.com/150' }} style={styles.avatar} />
          )}
          <TouchableOpacity style={styles.cameraIconBtn} onPress={pickImage} disabled={uploading}>
            <Ionicons name="camera" size={14} color="#FFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.nameText}>{expertData?.name || expertData?.displayName || 'Expert'}</Text>
        
        <View style={styles.identityRow}>
          <View style={styles.idChip}>
            <Ionicons name="location-sharp" size={10} color="#818CF8" />
            <Text style={styles.idChipText}>{expertData?.location || "N/A"}</Text>
          </View>
          <View style={styles.idChip}>
            <MaterialCommunityIcons name="cake-variant" size={10} color="#818CF8" />
            <Text style={styles.idChipText}>{expertData?.age || "00"}</Text>
          </View>
          <View style={styles.idChip}>
            <Ionicons name="person" size={10} color="#818CF8" />
            <Text style={styles.idChipText}>{expertData?.gender || "N/A"}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.editBtn} onPress={() => setModalVisible(true)}>
            <Text style={styles.editBtnText}>EDIT PROFILE & IDENTITY</Text>
        </TouchableOpacity>
        <LinearGradient colors={['#818CF8', '#4F46E5']} style={styles.levelBadge}>
          <Text style={styles.levelBadgeText}>{levelInfo.label}</Text>
        </LinearGradient>
      </View>

      {/* ONLINE STATUS TOGGLE */}
      <View style={[styles.statusCard, { backgroundColor: isOnline ? '#05966910' : '#1E293B40' }]}>
        <View style={styles.statusInfo}>
          <View style={[styles.liveIndicator, { backgroundColor: statusColor }]} />
          <Text style={[styles.statusText, { color: isOnline ? '#10B981' : '#94A3B8' }]}>
            {isOnline ? "Available for Calls" : "Currently Offline"}
          </Text>
        </View>
        <Switch value={isOnline} onValueChange={setIsOnline} trackColor={{ false: "#334155", true: "#059669" }} thumbColor={"#FFF"} />
      </View>

      {/* ANALYTICS / STATS GRID */}
      <View style={styles.statsGrid}>
        <TouchableOpacity style={styles.statBox} onPress={() => setFollowModalVisible(true)}>
          <MaterialCommunityIcons name="account-clock" size={20} color="#818CF8" />
          <Text style={styles.statValue}>{pendingRequests.length}</Text>
          <Text style={styles.statLabel}>NEW REQUESTS</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={[styles.statBox, { borderColor: '#FBBF24', borderWidth: 0.5 }]} onPress={() => setRateModalVisible(true)}>
          <FontAwesome5 name="seedling" size={18} color="#FBBF24" />
          <Text style={styles.statValue}>{expertData?.pricePerMin || 1000}</Text>
          <Text style={[styles.statLabel, {color: '#FBBF24'}]}>EDIT RATE</Text>
        </TouchableOpacity>

        <View style={styles.statBox}>
          <MaterialCommunityIcons name="bank" size={20} color="#10B981" />
          <Text style={styles.statValue}>₹{(expertData?.pricePerMin * 0.01 || 0).toFixed(0)}</Text>
          <Text style={styles.statLabel}>INR/MIN</Text>
        </View>
      </View>

      {/* MY FOLLOWERS BUTTON */}
      <TouchableOpacity 
          style={styles.followersButton} 
          onPress={() => setFollowModalVisible(true)}
      >
          <View style={styles.followersBtnContent}>
              <View style={styles.followersLeft}>
                  <View style={styles.iconCircleSmall}>
                      <Ionicons name="people" size={16} color="#818CF8" />
                  </View>
                  <Text style={styles.followersBtnText}>MY FOLLOWERS ({acceptedFollowers.length})</Text>
              </View>
              <Feather name="chevron-right" size={18} color="#475569" />
          </View>
      </TouchableOpacity>

      {/* WALLET BOX */}
      <View style={styles.walletContainer}>
          <View style={styles.balanceMain}>
              <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <MaterialCommunityIcons name="wallet" size={18} color="#10B981" />
                <Text style={styles.walletLabel}> WITHDRAWABLE BALANCE</Text>
              </View>
              <Text style={styles.walletValue}>
                {walletBalance.toLocaleString()} <Text style={{fontSize: 12, color: '#475569'}}>BEANS</Text>
              </Text>
          </View>
          <View style={styles.lifetimeBox}>
              <Text style={styles.lifetimeLabel}>LIFETIME EARNINGS (LEVEL EXP)</Text>
              <Text style={styles.lifetimeValue}>{totalBeans.toLocaleString()} <FontAwesome5 name="seedling" size={10} color="#818CF8" /></Text>
          </View>
      </View>

      {/* PROGRESS TRACKER */}
      <View style={styles.progressWrapper}>
          <View style={styles.progressTextRow}>
            <Text style={styles.sectionTitle}>NEXT LEVEL PROGRESS</Text>
            <Text style={styles.percentText}>{progressPercent.toFixed(1)}%</Text>
          </View>
          <View style={styles.progressBg}>
             <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
             <Text style={styles.progressLabel}>
              {levelInfo.next > 0 
                ? `${pendingBeansCount.toLocaleString()} beans pending to Level ${levelInfo.lvl + 1}` 
                : "MAX LEVEL REACHED"}
            </Text>
          </View>
      </View>

      {/* PORTFOLIO GALLERY */}
      <View style={styles.galleryWrapper}>
         <View style={styles.progressTextRow}>
            <Text style={styles.sectionTitle}>MY PORTFOLIO ({expertData?.gallery?.length || 0}/5)</Text>
            <TouchableOpacity onPress={uploadGalleryImage} disabled={galleryUploading}>
               {galleryUploading ? <ActivityIndicator size="small" color="#3B82F6" /> : <Feather name="plus-square" size={20} color="#3B82F6" />}
            </TouchableOpacity>
         </View>
         <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
            {expertData?.gallery?.map((img: string, index: number) => (
              <Image key={index} source={{ uri: img }} style={styles.galleryImg} />
            ))}
            {(!expertData?.gallery || expertData?.gallery.length === 0) && (
              <View style={styles.emptyGallery}><Text style={styles.emptyText}>Upload your expertise photos</Text></View>
            )}
         </ScrollView>
      </View>

      {/* BIO SECTION */}
      <View style={styles.bioWrapper}>
        <Text style={styles.sectionTitle}>BIO & EXPERTISE</Text>
        <View style={styles.bioBox}>
          <Text style={styles.bioText}>{expertData?.bio || "Describe your skills to attract users."}</Text>
        </View>
      </View>

      {/* FOLLOWERS & REQUESTS MODAL - LOGIC UPDATED */}
      <Modal visible={followModalVisible} animationType="slide" transparent={true}>
        <View style={styles.overlay}>
          <View style={[styles.modalBox, { maxHeight: '85%' }]}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                <Text style={styles.modalTitle}>Follower Manager</Text>
                <TouchableOpacity onPress={() => setFollowModalVisible(false)}>
                    <Ionicons name="close-circle" size={26} color="#F43F5E" />
                </TouchableOpacity>
            </View>

            {/* TAB 1: NEW REQUESTS (PENDING ONLY) */}
            <View style={styles.tabHeader}>
              <Ionicons name="notifications" size={14} color="#818CF8" />
              <Text style={styles.tabHeaderText}>NEW REQUESTS ({pendingRequests.length})</Text>
            </View>
            <FlatList
              data={pendingRequests}
              keyExtractor={(item) => item.id}
              style={{maxHeight: 250, marginBottom: 15}}
              renderItem={({ item }) => (
                <View style={styles.requestItem}>
                  <Image source={{ uri: item.senderImage || 'https://via.placeholder.com/150' }} style={styles.requestAvatar} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: '#FFF', fontWeight: '800' }}>{item.senderName}</Text>
                    <Text style={{ color: '#475569', fontSize: 10 }}>Wants to follow you</Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => handleAcceptRequest(item.id)} style={styles.acceptBtn}><Ionicons name="checkmark" size={18} color="#FFF" /></TouchableOpacity>
                    <TouchableOpacity onPress={() => handleRejectOrUnfollow(item.id, 'reject')} style={styles.rejectBtn}><Ionicons name="close" size={18} color="#FFF" /></TouchableOpacity>
                  </View>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyListText}>No new requests at this moment.</Text>}
            />

            {/* TAB 2: MY FOLLOWERS (FRIENDS ONLY) */}
            <View style={[styles.tabHeader, {marginTop: 10}]}>
              <Ionicons name="people" size={14} color="#10B981" />
              <Text style={[styles.tabHeaderText, {color: '#10B981'}]}>MY FOLLOWERS ({acceptedFollowers.length})</Text>
            </View>
            <FlatList
              data={acceptedFollowers}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View style={[styles.requestItem, {backgroundColor: '#1E293B60'}]}>
                  <Image source={{ uri: item.senderImage || 'https://via.placeholder.com/150' }} style={styles.requestAvatar} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: '#FFF', fontWeight: '800' }}>{item.senderName}</Text>
                    <Text style={{ color: '#10B981', fontSize: 10 }}>Connected</Text>
                  </View>
                  <TouchableOpacity onPress={() => handleRejectOrUnfollow(item.id, 'unfollow')} style={styles.removeBtn}>
                    <Text style={styles.removeBtnText}>UNFOLLOW</Text>
                  </TouchableOpacity>
                </View>
              )}
              ListEmptyComponent={<Text style={styles.emptyListText}>You don't have any followers yet.</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* RATE SETTINGS MODAL */}
      <Modal visible={rateModalVisible} animationType="fade" transparent={true}>
        <View style={styles.overlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Set Call Rate</Text>
            <Text style={{color: '#94A3B8', fontSize: 12, marginBottom: 20}}>
              Level: <Text style={{color: '#818CF8'}}>{levelInfo.label}</Text>. 
              Range: <Text style={{color: '#FFF'}}>{levelInfo.minRate}</Text> - <Text style={{color: '#FFF'}}>{levelInfo.maxRate}</Text> beans/min.
            </Text>
            <Text style={styles.inputLabel}>Beans Per Minute</Text>
            <TextInput style={styles.input} value={newRate} onChangeText={setNewRate} keyboardType="numeric" placeholderTextColor="#475569" />
            <TouchableOpacity style={styles.saveBtn} onPress={handleUpdateRate} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>UPDATE RATE</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setRateModalVisible(false)} style={{marginTop: 15, alignItems: 'center'}}><Text style={{color: '#F43F5E'}}>Cancel</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* IDENTITY EDIT MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.overlay}>
          <ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center'}}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Update Identity</Text>
            <Text style={styles.inputLabel}>Display Name</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholderTextColor="#475569" />
            <Text style={styles.inputLabel}>Location</Text>
            <TextInput style={styles.input} value={editLocation} onChangeText={setEditLocation} placeholderTextColor="#475569" />
            <View style={{flexDirection: 'row', gap: 10}}>
                <View style={{flex: 1}}>
                    <Text style={styles.inputLabel}>Age</Text>
                    <TextInput style={styles.input} value={editAge} onChangeText={setEditAge} keyboardType="numeric" placeholderTextColor="#475569" />
                </View>
                <View style={{flex: 1}}>
                    <Text style={styles.inputLabel}>Gender</Text>
                    <View style={styles.genderRow}>
                        {['Male', 'Female'].map((g) => (
                            <TouchableOpacity key={g} onPress={() => setEditGender(g)} style={[styles.genderBtn, editGender === g && styles.genderBtnActive]}>
                                <Text style={[styles.genderBtnText, editGender === g && {color: '#FFF'}]}>{g}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </View>
            <Text style={styles.inputLabel}>Bio</Text>
            <TextInput style={[styles.input, { height: 80 }]} value={editBio} onChangeText={setEditBio} multiline placeholderTextColor="#475569" />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} disabled={saving}>
                {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>SAVE CHANGES</Text>}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)} style={{marginTop: 15, alignItems: 'center'}}><Text style={{color: '#F43F5E'}}>Cancel</Text></TouchableOpacity>
          </View>
          </ScrollView>
        </View>
      </Modal>

      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#020617' },
  container: { padding: 20 },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 25 },
  leftHeader: { flex: 1 },
  logoText: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  subLogo: { color: '#475569', fontSize: 8, fontWeight: '800' },
  rightHeader: { flexDirection: 'row', alignItems: 'center' },
  adminIconBtn: { width: 40, height: 40, backgroundColor: '#10B98110', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  iconCircle: { width: 40, height: 40, backgroundColor: '#1E293B', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  profileSection: { alignItems: 'center', marginBottom: 30 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 110, height: 110, borderRadius: 40, borderWidth: 3, borderColor: '#1E293B' },
  loaderCenter: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#1E293B' },
  cameraIconBtn: { position: 'absolute', bottom: 0, right: -5, backgroundColor: '#3B82F6', padding: 6, borderRadius: 8 },
  nameText: { color: '#FFF', fontSize: 26, fontWeight: '900', marginTop: 10 },
  identityRow: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 5 },
  idChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, gap: 5 },
  idChipText: { color: '#94A3B8', fontSize: 10, fontWeight: '700' },
  editBtn: { marginVertical: 10, backgroundColor: '#3B82F615', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 8 },
  editBtnText: { color: '#3B82F6', fontSize: 10, fontWeight: '900' },
  levelBadge: { paddingHorizontal: 20, paddingVertical: 7, borderRadius: 12 },
  levelBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '900' },
  statusCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 15, borderRadius: 15, marginBottom: 20 },
  statusInfo: { flexDirection: 'row', alignItems: 'center' },
  liveIndicator: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  statusText: { fontSize: 13, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 8, marginBottom: 15 },
  statBox: { flex: 1, backgroundColor: '#1E293B60', paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#1E293B' },
  statValue: { color: '#FFF', fontSize: 16, fontWeight: '900' },
  statLabel: { color: '#475569', fontSize: 7, fontWeight: '800' },
  followersButton: { backgroundColor: '#1E293B60', padding: 15, borderRadius: 18, marginBottom: 20, borderWidth: 1, borderColor: '#1E293B', borderStyle: 'dashed' },
  followersBtnContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  followersLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconCircleSmall: { width: 32, height: 32, backgroundColor: '#818CF815', borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  followersBtnText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  walletContainer: { backgroundColor: '#1E293B40', borderRadius: 20, padding: 15, marginBottom: 25, borderWidth: 1, borderColor: '#1E293B' },
  balanceMain: { borderBottomWidth: 1, borderBottomColor: '#1E293B', paddingBottom: 12, marginBottom: 10 },
  walletLabel: { color: '#10B981', fontSize: 10, fontWeight: '900' },
  walletValue: { color: '#FFF', fontSize: 24, fontWeight: '900', marginTop: 5 },
  lifetimeBox: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  lifetimeLabel: { color: '#475569', fontSize: 9, fontWeight: '800' },
  lifetimeValue: { color: '#818CF8', fontSize: 11, fontWeight: '900' },
  sectionTitle: { color: '#475569', fontSize: 10, fontWeight: '900', marginBottom: 10 },
  progressWrapper: { marginBottom: 25 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  percentText: { color: '#818CF8', fontSize: 11, fontWeight: '900' },
  progressBg: { backgroundColor: '#1E293B', height: 40, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 15, overflow: 'hidden', marginTop: 5 },
  progressFill: { position: 'absolute', left: 0, height: '100%', backgroundColor: '#3B82F620' },
  progressLabel: { color: '#818CF8', fontSize: 10, fontWeight: '700' },
  galleryWrapper: { marginBottom: 25 },
  galleryScroll: { flexDirection: 'row' },
  galleryImg: { width: 90, height: 90, borderRadius: 12, marginRight: 10, backgroundColor: '#1E293B' },
  emptyGallery: { width: width - 40, height: 90, borderRadius: 12, backgroundColor: '#1E293B40', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#475569' },
  emptyText: { color: '#475569', fontSize: 10, fontWeight: '700' },
  bioWrapper: { width: '100%' },
  bioBox: { backgroundColor: '#1E293B40', padding: 15, borderRadius: 15 },
  bioText: { color: '#94A3B8', fontSize: 14, lineHeight: 20 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 25 },
  modalBox: { backgroundColor: '#0F172A', borderRadius: 30, padding: 25 },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  inputLabel: { color: '#818CF8', fontSize: 10, fontWeight: '800', marginBottom: 5, marginLeft: 5 },
  input: { backgroundColor: '#1E293B', borderRadius: 15, padding: 15, color: '#FFF', marginBottom: 15 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  genderBtn: { flex: 1, backgroundColor: '#1E293B', padding: 12, borderRadius: 12, alignItems: 'center' },
  genderBtnActive: { backgroundColor: '#3B82F6' },
  genderBtnText: { color: '#475569', fontSize: 12, fontWeight: '800' },
  saveBtn: { backgroundColor: '#3B82F6', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontWeight: '900' },
  tabHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  tabHeaderText: { color: '#818CF8', fontSize: 10, fontWeight: '900' },
  requestItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', padding: 12, borderRadius: 15, marginBottom: 10 },
  requestAvatar: { width: 40, height: 40, borderRadius: 20 },
  acceptBtn: { backgroundColor: '#10B981', padding: 8, borderRadius: 10 },
  rejectBtn: { backgroundColor: '#F43F5E', padding: 8, borderRadius: 10 },
  removeBtn: { backgroundColor: '#334155', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
  removeBtnText: { color: '#F43F5E', fontSize: 9, fontWeight: '900' },
  emptyListText: { color: '#475569', textAlign: 'center', marginVertical: 15, fontSize: 11, fontStyle: 'italic' }
});