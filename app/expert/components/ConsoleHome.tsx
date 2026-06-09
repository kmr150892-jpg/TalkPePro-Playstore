import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { deleteUser } from 'firebase/auth';
import { arrayUnion, collection, deleteDoc, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { Circle } from 'react-native-svg';
import { auth, db } from '../../../firebaseConfig';
import { sendNotificationToUser } from '../../../utils/notificationHelper';

// --- COMPONENTS ---

const { height, width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const ADMIN_UID = "jOQ0LxpaFkhuqIiMtOcYCGb3nEf2";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dvwjxeexc/image/upload";
const UPLOAD_PRESET = "talkpe";

// ✅ ACCURATE THEME & LEVEL CONFIG
const getLevelConfig = (userData: any) => {
    const getObj = (lvl: number) => {
        if (lvl >= 10) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'] as const, glow: '#F59E0B', next: 0, prev: 50000000, rate: 8000 };
        if (lvl === 9) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'] as const, glow: '#EC4899', next: 100000000, prev: 30000000, rate: 7000 };
        if (lvl === 8) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'] as const, glow: '#8B5CF6', next: 50000000, prev: 10000000, rate: 5400 };
        if (lvl === 7) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'] as const, glow: '#3B82F6', next: 30000000, prev: 5000000, rate: 4800 };
        if (lvl === 6) return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'] as const, glow: '#06B6D4', next: 10000000, prev: 3000000, rate: 4200 };
        if (lvl === 5) return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'] as const, glow: '#10B981', next: 5000000, prev: 1000000, rate: 3600 };
        if (lvl === 4) return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'] as const, glow: '#EAB308', next: 3000000, prev: 300000, rate: 3000 };
        if (lvl === 3) return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'] as const, glow: '#94A3B8', next: 1000000, prev: 100000, rate: 2400 };
        if (lvl === 2) return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'] as const, glow: 'transparent', next: 300000, prev: 30000, rate: 1800 };
        if (lvl === 1) return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'] as const, glow: 'transparent', next: 100000, prev: 0, rate: 1200 };
        return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'] as const, glow: 'transparent', next: 30000, prev: 0, rate: 1000 };
    };

    const rawLvl = userData?.expertLevel ?? userData?.currentLevel ?? userData?.level;
    if (rawLvl !== undefined && rawLvl !== null) {
        if (typeof rawLvl === 'number') return getObj(rawLvl);
        if (typeof rawLvl === 'string') {
            const Discover = rawLvl.match(/\d+/);
            if (Discover) return getObj(parseInt(Discover[0], 10));
        }
    }

    const title = String(userData?.levelTitle || '').toUpperCase();
    if (title) {
        const Discover = title.match(/\d+/);
        if (Discover) return getObj(parseInt(Discover[0], 10));
    }

    const beans = Number(userData?.totalBeansEarned) || Number(userData?.beans) || 0;
    if (beans >= 100000000) return getObj(10);
    if (beans >= 50000000) return getObj(9);
    if (beans >= 30000000) return getObj(8);
    if (beans >= 10000000) return getObj(7);
    if (beans >= 5000000)  return getObj(6);
    if (beans >= 3000000)  return getObj(5);
    if (beans >= 1000000)  return getObj(4);
    if (beans >= 300000)   return getObj(3);
    if (beans >= 100000)   return getObj(2);
    if (beans >= 30000)    return getObj(1);
    return getObj(0);
};

const EXPERTISE_TAGS = [ "Singing", "Dancing", "Astrology", "Tarot Reading", "Community Advice", "Career Counseling", "Life Coaching",
    "Mindfulness & Motivation",  "Yoga", "Meditation", "Cooking", "Baking", "Photography", "Video Editing",
    "Graphic Design", "Digital Marketing", "Programming", "App Development", "Web Development",
    "Business Strategy", "Public Speaking", "Language Tutor", "English Fluency",
    "Tamil Stories", "Comedy & Mimicry", "Acting", "Makeup & Styling", "Fashion Advice", "Interior Design", "Gaming Pro",
    "Chess Strategy", "Magic Tricks", "Guitar Lessons", "Keyboard Lessons", "Drawing & Sketching", "Painting",
    "Crafting", "Pet Care", "Travel Planning", "Event Planning", "Standup Comedy", "Math Tutoring",
    "Science Tutoring", "History & Culture", "Storytelling", "Poetry & Writing"];
const HOBBIES_TAGS = ["Reading 📚", "Writing ✍️", "Coding 💻", "Analytics 📊", "Public Speaking 🎙️", "Networking 🤝", "Planning 📅", "Strategy 🎯","Gaming 🎮", "Photography 📸", "Traveling ✈️", "Cooking 🍳",
    "Music 🎵", "Fitness & Gym 🏋️‍♂️", "Art & Design 🎨", "Gardening 🌱",
    "Movies & Anime 🍿", "Sports & Outdoors ⚽", "Yoga & Meditation 🧘‍♀️",
    "DIY Crafts ✂️", "Podcasting 🎧", "Astrology ✨", "Pets & Animals 🐾",
    "Foodie & Cafe Hopping 🍕", "Vlogging 📹", "Board Games 🎲"];

export default function ConsoleHome({ expertData: initialData, isOnline, setIsOnline }: any) {
  const router = useRouter();
  const [user, setUser] = useState(auth.currentUser);
  const isAdmin = user?.uid === ADMIN_UID;

  const [expertData, setExpertData] = useState(initialData);
  const [modalVisible, setModalVisible] = useState(false);
  const [rateModalVisible, setRateModalVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
 
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAge, setEditAge] = useState('');
  const [editGender, setEditGender] = useState('');
  const [newRate, setNewRate] = useState('1000');
 
  const [editExpertise, setEditExpertise] = useState<string[]>([]);
  const [editHobbies, setEditHobbies] = useState<string[]>([]);

  const [uploading, setUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [unreadCount, setUnreadCount] = useState(0); 

  // 🔥 NEW FIX: REFS TO PREVENT INFINITE LOOPS & FIX ZERO-TO-ONE REQUEST BUG 🔥
  const initialLoadRef = useRef(true);
  const knownRequestsRef = useRef<string[]>([]);

  const shimmerAnim = useRef(new Animated.Value(0)).current;

  const config = getLevelConfig(expertData);
  const walletBalance = expertData?.walletBalance ?? expertData?.beansBalance ?? 0;
  const totalBeans = expertData?.totalBeansEarned || expertData?.totalBeans || 0;
 
  const theme = {
    primary: config.colors[0],
    secondary: config.colors[2] || config.colors[1] || config.colors[0],
    accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
    bgGradient: [
        config.lvl >= 7 ? `${config.colors[0]}40` : '#020617',
        config.lvl >= 3 ? `${config.colors[1] || config.colors[0]}20` : '#0F172A',
        '#020617'
    ] as const
  };

  const range = config.next - config.prev;
  const earnedInRange = totalBeans - config.prev;
  const progressPercent = config.next > 0 ? Math.max(0, Math.min((earnedInRange / range) * 100, 100)) : 100;
  const pendingBeans = config.next - totalBeans;

  const prevLvlRef = useRef<number | null>(null);

  useEffect(() => {
    const authUnsub = auth.onAuthStateChanged((u: any) => {
        if (u) {
            setUser(u);
            updateDoc(doc(db, "users", u.uid), { isOnline: true }).catch((err) => {
                console.log("Auto Online Fail", err);
            });
            setIsOnline(true);
        }
    });
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
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setExpertData(data);
        setEditName(data.name || data.displayName || '');
        setEditBio(data.bio || '');
        setEditLocation(data.location || '');
        setEditAge(data.age || '');
        setEditGender(data.gender || '');
        
        if (!newRate || newRate === '1000' && data.pricePerMin !== 1000) {
            setNewRate(String(data.pricePerMin || '1000'));
        }
        
        setEditExpertise(data.expertiseTags || []);
        setEditHobbies(data.hobbies || []);
        
        if (data.isOnline !== undefined && data.isOnline !== isOnline) {
            setIsOnline(data.isOnline);
        }

        if (data.notifications) {
          const unread = data.notifications.filter((notif: any) => !notif.read).length;
          setUnreadCount(unread);
        }
      }
    });
    return () => unsub();
  }, [user?.uid]);

  // 🔥 NEW FIX: ROBUST BACKGROUND LISTENER FOR CONNECTION REQUESTS 🔥
  useEffect(() => {
      if (!user?.uid) return;

      const requestQuery = query(collection(db, "connections"), where("receiverId", "==", user.uid), where("status", "==", 'pending'));

      const unsubRequests = onSnapshot(requestQuery, async (snapshot) => {
          const currentIds = snapshot.docs.map(doc => doc.id);
          
          if (initialLoadRef.current) {
              // App open பண்ணும்போது இருக்குற பழைய requests-க்கு நோட்டிபிகேஷன் அனுப்பக் கூடாது.
              knownRequestsRef.current = currentIds;
              initialLoadRef.current = false;
              return;
          }

          // புதுசா வந்துருக்க ஐடி மட்டும் பில்டர் பண்றோம் (0 to 1 வந்தாலும் இது எடுக்கும்!)
          const newIncomingIds = currentIds.filter(id => !knownRequestsRef.current.includes(id));
          
          if (newIncomingIds.length > 0) {
              for (const docSnap of snapshot.docs) {
                  if (newIncomingIds.includes(docSnap.id)) {
                      const connData = docSnap.data();
                      await sendNotificationToUser(
                          user.uid,
                          "New Connection Request! 🤝",
                          `${connData.senderName || 'A user'} wants to connect with you. Check your requests tab!`,
                          "system"
                      );
                  }
              }
          }
          
          // அடுத்த முறை செக் பண்ண ரெஃப்பரன்ஸை அப்டேட் பண்றோம்
          knownRequestsRef.current = currentIds;
      });

      return () => unsubRequests();
  }, [user?.uid]);

  useEffect(() => {
      if (expertData && user?.uid) {
          if (prevLvlRef.current === null) {
              prevLvlRef.current = config.lvl;
          } else if (prevLvlRef.current !== config.lvl) {
              const newMaxRate = config.rate;
              setNewRate(String(newMaxRate));
              
              updateDoc(doc(db, "users", user.uid), {
                  pricePerMin: newMaxRate,
                  beansPerMin: newMaxRate,
                  userPrice: newMaxRate * 2,
                  lastRateUpdate: serverTimestamp()
              }).then(() => {
                  Alert.alert(
                      "Level Updated! 🚀",
                      `Your rank changed! Your Call Rate has been automatically updated to the new Max Price: ${newMaxRate} Rewards/Min!`
                  );
                  // 🔥 AUTO NOTIFICATION WHEN LEVEL UPGRADES 🔥
                  sendNotificationToUser(
                      user.uid,
                      "Level Upgraded! 🚀",
                      `Congratulations! You have reached ${config.label}. Your new call rate is ${newMaxRate}.`,
                      "system"
                  );
              }).catch(()=>{});
              
              prevLvlRef.current = config.lvl;
          }
      }
  }, [config.lvl, config.rate, expertData, user?.uid]);

  const handleOpenRateModal = () => {
      if (expertData?.lastRateUpdate) {
          let lastUpdateMillis = 0;
          
          if (typeof expertData.lastRateUpdate.toMillis === 'function') {
              lastUpdateMillis = expertData.lastRateUpdate.toMillis();
          } else if (expertData.lastRateUpdate.seconds) {
              lastUpdateMillis = expertData.lastRateUpdate.seconds * 1000;
          }

          if (lastUpdateMillis > 0) {
              const now = Date.now();
              const diffMins = (now - lastUpdateMillis) / (1000 * 60);

              if (diffMins < 30) {
                  const remainingMins = Math.ceil(30 - diffMins);
                  Alert.alert(
                      "Rate Locked ⏳",
                      `You can only update your rate once every 30 minutes. Please wait ${remainingMins} more minute(s).`
                  );
                  return; 
              }
          }
      }
      setRateModalVisible(true);
  };

  const handleShareApp = async () => {
    try {
        const result = await Share.share({
            message: `I’m available on the TalkPe Pro platform! Connect with me for a professional call session. 🚀💎 Platform Link: https://play.google.com/store/apps/details?id=com.talkpe.app`,
            title: 'Download TalkPe Pro'
        });

        if (result.action === Share.sharedAction) {
            console.log('Shared successfully!');
        } else if (result.action === Share.dismissedAction) {
            console.log('Share dismissed by user');
        }
    } catch (error: any) {
        Alert.alert("Share Error", error.message);
    }
  };

  const handleUpdateRate = async () => {
    const rateNum = parseInt(newRate);
    if (isNaN(rateNum) || rateNum < 300 || rateNum > config.rate) {
      Alert.alert("Invalid Rate", `Range: 300 - ${config.rate}`);
      return;
    }
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user!.uid), {
        pricePerMin: rateNum,
        beansPerMin: rateNum,
        userPrice: rateNum * 2,
        lastRateUpdate: serverTimestamp()
      });
      setRateModalVisible(false);
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

  const pickCoverImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return;
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.6 });
    if (!result.canceled && user?.uid) {
      setCoverUploading(true);
      const url = await uploadToCloudinary(result.assets[0].uri);
      if (url) await updateDoc(doc(db, "users", user.uid), { coverPhoto: url });
      setCoverUploading(false);
    }
  };

  const uploadGalleryImage = async () => {
    if ((expertData?.gallery?.length || 0) >= 5) {
      Alert.alert("Portfolio Full", "Max 5 photos.");
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

  const toggleTag = (tag: string, list: string[], setList: any, maxLimit: number) => {
    if (list.includes(tag)) {
        setList(list.filter((t: string) => t !== tag));
    } else {
        if (list.length >= maxLimit) {
            const updatedList = [...list];
            updatedList.shift();
            setList([...updatedList, tag]);
            return;
        }
        setList([...list, tag]);
    }
  };

  const handleSaveProfile = async () => {
    if (!user?.uid) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), { name: editName, bio: editBio.trim(), location: editLocation, age: editAge, gender: editGender, expertiseTags: editExpertise, hobbies: editHobbies });
      setModalVisible(false);
    } catch (error) { Alert.alert("Error", "Save failed"); } finally { setSaving(false); }
  };

  const handleLogout = async () => {
      if (user?.uid) {
          try {
              await updateDoc(doc(db, "users", user.uid), { isOnline: false });
          } catch (e) {}
      }
      auth.signOut().then(() => { router.replace('/'); });
  };

  const handleTerminateExpert = () => {
      const walletBal = expertData?.walletBalance ?? expertData?.beansBalance ?? 0;
      const msg = walletBal > 0
          ? `Hold on! You have ${walletBal} rewards in your wallet. Deleting your account means this balance is gone forever.`
          : "Final warning: This will permanently wipe your Host profile and all associated data.";

      Alert.alert(
          "TERMINATE IDENTITY?",
          msg,
          [
              { text: "Cancel", style: "cancel" },
              {
                  text: "Delete My Identity",
                  style: "destructive",
                  onPress: async () => {
                      if (!user) return;
                      setIsDeleting(true);
                      try {
                          await updateDoc(doc(db, "users", user.uid), { isOnline: false });
                          await deleteDoc(doc(db, "users", user.uid));
                          await deleteUser(user);
                          Alert.alert("Terminated", "Your identity has been removed from the talkpe pro.");
                          router.replace('/');
                      } catch (error: any) {
                          if (error.code === 'auth/requires-recent-login') {
                              Alert.alert("Security Check", "Please Logout and Login again before deleting for safety.");
                          } else {
                              Alert.alert("Error", "Termination failed. Check connection.");
                          }
                      } finally { setIsDeleting(false); }
                  }
              }
          ]
      );
  };

  const orbTranslateY = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -30]
  });

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

  const toggleOnlineStatus = async (status: boolean) => {
    if (!user?.uid) return;
    setIsOnline(status);
    try {
        await updateDoc(doc(db, "users", user.uid), { isOnline: status });
    } catch (e) {
        console.log("Status Update Error", e);
        setIsOnline(!status);
    }
  };

  return (
    <ScrollView style={styles.mainContainer} contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
      
      <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />
      
      <Animated.View style={[styles.shimmerOrb, { top: 120, right: -60, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
      <Animated.View style={[styles.shimmerOrb, { top: 450, left: -90, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

      <View style={styles.coverContainer}>
         <Image source={{ uri: expertData?.coverPhoto || 'https://images.unsplash.com/photo-1557682250-33bd709cbe85?q=80&w=2029&auto=format&fit=crop' }} style={styles.coverImage} />
         <LinearGradient colors={['rgba(2,6,23,0.5)', 'transparent', 'rgba(2,6,23,0.9)']} style={StyleSheet.absoluteFill} />
         
         <View style={styles.headerBar}>
            <View style={styles.leftHeader}>
                <Text style={styles.logoText}>TALKPE<Text style={{color: theme.primary}}>PRO</Text></Text>
                <Text style={styles.subLogo}>COMMAND CENTER</Text>
            </View>
            <View style={styles.rightHeader}>
              
              {isAdmin && (
                <TouchableOpacity style={styles.adminIconBtn} onPress={() => router.push('/(admin)' as any)}>
                  <MaterialCommunityIcons name="shield-crown" size={20} color="#10B981" />
                </TouchableOpacity>
              )}
              
              {/* 🔥 NOTIFICATION BELL WITH BADGE */}
              <TouchableOpacity style={styles.iconCircle} onPress={() => router.push("/expert/notifications")}>
                <View>
                    <Ionicons name="notifications-outline" size={18} color="#FFF" />
                    {unreadCount > 0 && (
                        <View style={styles.badgeContainer}>
                            <Text style={styles.badgeText}>
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </Text>
                        </View>
                    )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.iconCircle, {marginLeft: 8}]} onPress={() => router.push("/blocked-users")}>
                <Ionicons name="person-remove-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconCircle, {marginLeft: 8}]} onPress={handleLogout}>
                <Feather name="log-out" size={18} color="#F43F5E" />
              </TouchableOpacity>
            </View>
         </View>

         <TouchableOpacity style={styles.shareCoverBtn} onPress={handleShareApp}>
             <Ionicons name="share-social" size={14} color="#FFF" />
             <Text style={styles.editCoverText}>Share</Text>
         </TouchableOpacity>

         <TouchableOpacity style={styles.editCoverBtn} onPress={pickCoverImage} disabled={coverUploading}>
            {coverUploading ? <ActivityIndicator size="small" color="#FFF" /> : <><Ionicons name="camera" size={14} color="#FFF" /><Text style={styles.editCoverText}>Banner</Text></>}
         </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
         
          <View style={styles.profileSection}>
            <View style={styles.avatarWrapper}>
              <LinearGradient colors={[theme.primary, theme.secondary || '#1E293B']} style={styles.avatarRing}>
                {uploading ? (
                  <View style={[styles.avatar, styles.loaderCenter]}><ActivityIndicator color={theme.primary} /></View>
                ) : (
                  <Image source={{ uri: expertData?.profilePic || 'https://via.placeholder.com/150' }} style={styles.avatar} />
                )}
              </LinearGradient>
              <TouchableOpacity style={[styles.cameraIconBtn, {backgroundColor: theme.primary}]} onPress={pickImage} disabled={uploading}>
                <Ionicons name="camera" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.nameText}>{expertData?.name || 'Host'}</Text>
           
            <View style={[styles.fluidIdentityCapsule, borderType1]}>
              <View style={styles.fluidIdSection}>
                <Ionicons name="location-sharp" size={16} color={theme.primary} />
                <Text style={styles.fluidIdLabel}>LOCATION</Text>
                <Text style={styles.fluidIdVal}>{expertData?.location || "India"}</Text>
              </View>
              
              <View style={[styles.fluidDivider, { backgroundColor: theme.primary + '30' }]} />
              
              <View style={styles.fluidIdSection}>
                <MaterialCommunityIcons name="cake-variant" size={16} color={theme.primary} />
                <Text style={styles.fluidIdLabel}>AGE</Text>
                <Text style={styles.fluidIdVal}>{expertData?.age || "24"}</Text>
              </View>
              
              <View style={[styles.fluidDivider, { backgroundColor: theme.primary + '30' }]} />
              
              <View style={styles.fluidIdSection}>
                <Ionicons name="person" size={16} color={theme.primary} />
                <Text style={styles.fluidIdLabel}>GENDER</Text>
                <Text style={styles.fluidIdVal}>{expertData?.gender || "N/A"}</Text>
              </View>
            </View>

            <View style={styles.expertActionRow}>
                <TouchableOpacity style={[styles.fluidActionPill, borderType2]} onPress={() => setModalVisible(true)}>
                    <Text style={[styles.editProfileText, {color: theme.primary}]}>EDIT PROFILE</Text>
                </TouchableOpacity>
                <LinearGradient colors={[theme.primary, theme.secondary]} style={styles.fluidCrownBadge}>
                    <MaterialCommunityIcons name="crown" size={14} color="#FFF" />
                    <Text style={styles.levelBadgeText}>{config.label}</Text>
                </LinearGradient>
            </View>
          </View>

          <View style={[styles.fluidStatusCard, borderType1]}>
            <View style={styles.statusInner}>
              <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10B981' : '#94A3B8', shadowColor: isOnline ? '#10B981' : '#94A3B8' }]} />
              <View>
                <Text style={[styles.statusLabel, { color: isOnline ? '#10B981' : '#94A3B8' }]}>{isOnline ? "ONLINE/OFFLINE" : "STANDBY MODE"}</Text>
                <Text style={styles.statusSubText}>{isOnline ? "Receiving incoming requests" : "Currently offline from system"}</Text>
              </View>
            </View>
            <Switch value={isOnline} onValueChange={toggleOnlineStatus} trackColor={{ false: "#1E293B", true: "#059669" }} thumbColor={"#FFF"} />
          </View>

          <View style={styles.fluidStatsGrid}>
            <TouchableOpacity style={[styles.fluidStatCard, borderType2]} onPress={() => router.push('/expert-history')}>
              <MaterialCommunityIcons name="history" size={20} color={theme.primary} />
              <Text style={styles.statValue}>LOGS</Text>
              <Text style={styles.statLabel}>HISTORY</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.fluidStatCard, borderType1]} onPress={handleOpenRateModal}>
              <FontAwesome5 name="fire-alt" size={18} color="#FBBF24" />
              <Text style={styles.statValue}>{expertData?.pricePerMin || 1000}</Text>
              <Text style={styles.statLabel}>EDIT RATE</Text>
            </TouchableOpacity>
            <View style={[styles.fluidStatCard, borderType2]}>
              <MaterialCommunityIcons name="currency-inr" size={20} color="#10B981" />
              <Text style={styles.statValue}>₹{(expertData?.pricePerMin * 0.01 || 0).toFixed(0)}</Text>
              <Text style={styles.statLabel}>PER MIN</Text>
            </View>
          </View>

          <View style={[styles.fluidWalletCard, borderType1]}>
              <View style={styles.walletHeader}>
                <Text style={styles.walletTitle}>NET GAINED REWARDS</Text>
                <MaterialCommunityIcons name="integrated-circuit-chip" size={32} color={theme.primary + '60'} />
              </View>
              <Text style={styles.walletBeansValue}>{walletBalance.toLocaleString()}</Text>
              <View style={styles.walletFooter}>
                <Text style={[styles.walletSubTitle, {color: 'rgba(255,255,255,0.6)'}]}>WITHDRAWABLE REWARDS</Text>
                <View style={[styles.lifetimeBadge, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={[styles.lifetimeText, { color: theme.primary }]}>LIFETIME REWARDS: {totalBeans.toLocaleString()}</Text>
                </View>
              </View>
                        </View>

          <View style={styles.cyberProgressBox}>
              <View style={styles.progressTextRow}>
                <Text style={styles.sectionTitle}>RANK PROGRESS</Text>
                <Text style={[styles.percentText, { color: theme.primary }]}>{progressPercent.toFixed(0)}%</Text>
              </View>
              <View style={styles.neonBarContainer}>
                <View style={styles.neonBarBg}>
                  <LinearGradient
                    colors={[theme.primary, theme.accent, '#FFF']}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={[styles.neonBarFill, { width: `${progressPercent}%` }]}
                  />
                </View>
                <View style={styles.barSegments}>
                    {[1,2,3,4,5,6,7,8].map(i => <View key={i} style={styles.segmentLine} />)}
                </View>
              </View>
              <Text style={styles.nextLevelText}>{config.next > 0 ? `${pendingBeans.toLocaleString()} more to reach Level ${config.lvl + 1}` : "ULTIMATE RANK REACHED"}</Text>
          </View>

          {expertData?.expertiseTags && expertData.expertiseTags.length > 0 && (
             <View style={styles.marginSection}>
                <Text style={styles.sectionTitle}>CORE EXPERTISE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                    {expertData.expertiseTags.map((tag: string, index: number) => (
                        <LinearGradient key={index} colors={[theme.primary, theme.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.premiumChip}>
                            <MaterialCommunityIcons name="star-four-points" size={12} color="#FFF" style={{marginRight: 6}} />
                            <Text style={styles.premiumChipText}>{tag}</Text>
                        </LinearGradient>
                    ))}
                </ScrollView>
             </View>
          )}

          {expertData?.hobbies && expertData.hobbies.length > 0 && (
             <View style={styles.marginSection}>
                <Text style={styles.sectionTitle}>INTERESTS & HOBBIES</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                    {expertData.hobbies.map((tag: string, index: number) => (
                        <View key={index} style={[styles.cyberHobbyChip, { borderLeftColor: theme.primary }]}>
                            <Text style={styles.cyberHobbyText}>{tag}</Text>
                        </View>
                    ))}
                </ScrollView>
             </View>
          )}

          <View style={styles.marginSection}>
             <View style={styles.progressTextRow}>
                <Text style={styles.sectionTitle}>PORTFOLIO GALLERY</Text>
                <TouchableOpacity onPress={uploadGalleryImage} disabled={galleryUploading}>
                    {galleryUploading ? <ActivityIndicator size="small" color={theme.primary} /> : <Feather name="plus-circle" size={20} color={theme.primary} />}
                </TouchableOpacity>
             </View>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 10}}>
                {expertData?.gallery?.map((img: string, index: number) => <Image key={index} source={{ uri: img }} style={styles.galleryImg} />)}
                {(!expertData?.gallery || expertData?.gallery.length === 0) && <View style={styles.emptyGallery}><Text style={styles.emptyText}>Upload your work</Text></View>}
             </ScrollView>
          </View>

          <View style={styles.bioWrapper}>
            <Text style={styles.sectionTitle}>BIO DESCRIPTION</Text>
            <BlurView intensity={15} tint="dark" style={[styles.fluidBioBox, borderType2]}>
              <Text style={styles.bioText}>{expertData?.bio || "Describe your professional skills."}</Text>
            </BlurView>
          </View>

          <View style={[styles.compactRow, { marginTop: 30 }]}>
              <TouchableOpacity
                  style={[styles.compactBtn, { borderColor: theme.primary, borderWidth: 1 }]}
                  onPress={() => router.push('/expert/support' as any)}
              >
                  <LinearGradient
                      colors={[theme.primary + '30', 'rgba(0,0,0,0.6)']}
                      start={{x:0, y:0}} end={{x:1, y:1}}
                      style={[styles.compactGradient, { paddingVertical: 15 }]}
                  >
                      <MaterialCommunityIcons name="headset" size={16} color={theme.primary} />
                      <Text style={[styles.compactBtnText, { color: theme.primary }]}>SUPPORT HUB</Text>
                  </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                  style={[styles.compactBtn, { borderColor: theme.secondary, borderWidth: 1 }]}
                  onPress={() => router.push('/expert/legal' as any)}
              >
                  <LinearGradient
                      colors={[theme.secondary + '30', 'rgba(0,0,0,0.6)']}
                      start={{x:0, y:0}} end={{x:1, y:1}}
                      style={[styles.compactGradient, { paddingVertical: 15 }]}
                  >
                      <MaterialCommunityIcons name="shield-lock" size={16} color={theme.secondary} />
                      <Text style={[styles.compactBtnText, { color: theme.secondary }]}>PRIVACY POLICY</Text>
                  </LinearGradient>
              </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.homeDeleteBtn} onPress={handleTerminateExpert} disabled={isDeleting}>
              {isDeleting ? <ActivityIndicator color="#EF4444" /> : (
                  <>
                      <Ionicons name="trash-outline" size={20} color="#EF4444" />
                      <Text style={styles.homeDeleteText}>DELETE ACCOUNT</Text>
                  </>
              )}
          </TouchableOpacity>

      </View>

      <Modal visible={rateModalVisible} animationType="fade" transparent={true}>
        <View style={styles.overlay}><View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Set Call Rate</Text>
            <Text style={{color: '#94A3B8', fontSize: 12, marginBottom: 20}}>Rank: <Text style={{color: theme.primary}}>{config.label}</Text>. Max: <Text style={{color: '#FFF'}}>{config.rate}</Text> rewards.</Text>
           
            <Text style={styles.inputLabel}>Rewards Per Minute</Text>
           
            <View style={{flexDirection: 'row', alignItems: 'center', marginBottom: 15}}>
                <TextInput style={[styles.input, {flex: 1, marginBottom: 0}]} value={newRate} onChangeText={setNewRate} keyboardType="numeric" placeholderTextColor="#475569" />
                <TouchableOpacity
                    style={{backgroundColor: `${theme.primary}20`, padding: 15, borderRadius: 15, marginLeft: 10, borderWidth: 1, borderColor: theme.primary}}
                    onPress={() => setNewRate(String(config.rate))}
                >
                    <Text style={{color: theme.primary, fontWeight: '900', fontSize: 10, letterSpacing: 1}}>SET MAX</Text>
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={[styles.saveBtn, {backgroundColor: theme.primary}]} onPress={handleUpdateRate} disabled={saving}>{saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>CONFIRM RATE</Text>}</TouchableOpacity>
            <TouchableOpacity onPress={() => setRateModalVisible(false)} style={{marginTop: 15, alignItems: 'center'}}><Text style={{color: '#F43F5E'}}>Cancel</Text></TouchableOpacity>
        </View></View>
      </Modal>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.overlay}><ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center', paddingVertical: 40}} showsVerticalScrollIndicator={false}>
          <View style={styles.modalBoxLarge}>
            <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
                <Text style={styles.modalTitle}>Update Identity</Text>
                <TouchableOpacity onPress={() => setModalVisible(false)}><Ionicons name="close-circle" size={24} color="#475569" /></TouchableOpacity>
            </View>
            <Text style={[styles.inputLabel, {color: theme.primary}]}>Display Name</Text>
            <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholderTextColor="#475569" />
            <View style={{flexDirection: 'row', gap: 10}}>
                <View style={{flex: 1}}><Text style={[styles.inputLabel, {color: theme.primary}]}>Age</Text><TextInput style={styles.input} value={editAge} onChangeText={setEditAge} keyboardType="numeric" placeholderTextColor="#475569" /></View>
                <View style={{flex: 1.5}}><Text style={[styles.inputLabel, {color: theme.primary}]}>Location</Text><TextInput style={styles.input} value={editLocation} onChangeText={setEditLocation} placeholderTextColor="#475569" /></View>
            </View>
            <Text style={[styles.inputLabel, {color: theme.primary}]}>Gender</Text>
            <View style={styles.genderRow}>{['Male', 'Female', 'Other'].map((g) => (
                <TouchableOpacity key={g} onPress={() => setEditGender(g)} style={[styles.genderBtn, editGender === g && {backgroundColor: `${theme.primary}20`, borderColor: theme.primary}]}><Text style={[styles.genderBtnText, editGender === g && {color: theme.primary, fontWeight: '900'}]}>{g}</Text></TouchableOpacity>
            ))}</View>
            <Text style={[styles.inputLabel, {color: theme.primary}]}>Expertise (Max 3)</Text>
            <View style={styles.tagsWrapper}>{EXPERTISE_TAGS.map((tag) => {
                const isSel = editExpertise.includes(tag);
                return <TouchableOpacity key={tag} onPress={() => toggleTag(tag, editExpertise, setEditExpertise, 3)} style={[styles.tagChip, isSel && {backgroundColor: theme.primary, borderColor: theme.primary}]}><Text style={[styles.tagChipText, isSel && {color: '#FFF'}]}>{tag}</Text></TouchableOpacity>
            })}</View>
            <Text style={[styles.inputLabel, {color: theme.primary}]}>Hobbies (Max 5)</Text>
            <View style={styles.tagsWrapper}>{HOBBIES_TAGS.map((tag) => {
                const isSel = editHobbies.includes(tag);
                return <TouchableOpacity key={tag} onPress={() => toggleTag(tag, editHobbies, setEditHobbies, 5)} style={[styles.tagChip, isSel && {backgroundColor: theme.primary, borderColor: theme.primary}]}><Text style={[styles.tagChipText, isSel && {color: '#FFF'}]}>{tag}</Text></TouchableOpacity>
            })}</View>
            <Text style={[styles.inputLabel, {color: theme.primary}]}>Bio</Text>
            <TextInput style={[styles.input, { height: 80, textAlignVertical: 'top' }]} value={editBio} onChangeText={setEditBio} multiline placeholderTextColor="#475569" />
            <TouchableOpacity style={[styles.saveBtn, {backgroundColor: theme.primary}]} onPress={handleSaveProfile} disabled={saving}>{saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>SAVE PROFILE</Text>}</TouchableOpacity>
          </View>
        </ScrollView></View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#020617' },
  shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
  coverContainer: { width: '100%', height: 250, position: 'relative' },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'absolute', top: 5, left: 10, right: 5, zIndex: 10 },
  logoText: { color: '#FFF', fontSize: 22, fontWeight: '900' },
  subLogo: { color: '#94A3B8', fontSize: 8, fontWeight: '800', letterSpacing: 1 },
  leftHeader: { flex: 1 },
 
  shareCoverBtn: { position: 'absolute', bottom: 2, left: 3, backgroundColor: 'rgb(243, 6, 156)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.4)', elevation: 5, zIndex: 10 },
  editCoverBtn: { position: 'absolute', bottom: 2, right: 3, backgroundColor: 'rgba(4, 4, 247, 0.6)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', zIndex: 10 },
 
  editCoverText: { color: '#FFF', fontSize: 11, fontWeight: '800', marginLeft: 6, letterSpacing: 0.5 },
 
  contentContainer: { paddingHorizontal: 20, marginTop: -60 },
  rightHeader: { flexDirection: 'row', alignItems: 'center' },
  adminIconBtn: { width: 38, height: 38, backgroundColor: 'rgba(16, 185, 129, 0.2)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: '#10B98140' },
  iconCircle: { width: 38, height: 38, backgroundColor: 'rgba(15, 23, 42, 0.8)', borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  
  badgeContainer: { position: 'absolute', right: -6, top: -6, backgroundColor: '#F43F5E', borderRadius: 10, minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#020617' },
  badgeText: { color: '#FFF', fontSize: 8, fontWeight: '900', paddingHorizontal: 3 },

  profileSection: { alignItems: 'center', marginBottom: 25 },
  avatarWrapper: { position: 'relative', padding: 5 },
  avatarRing: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 130, height: 130, borderRadius: 65, borderWidth: 4, borderColor: '#020617' },
  cameraIconBtn: { position: 'absolute', bottom: 5, right: 5, padding: 8, borderRadius: 12, borderWidth: 3, borderColor: '#020617' },
  nameText: { color: '#FFF', fontSize: 28, fontWeight: '900', marginTop: 15 },
 
  fluidIdentityCapsule: { flexDirection: 'row', width: '100%', borderRadius: 40, paddingVertical: 12, marginTop: 20, alignItems: 'center', justifyContent: 'space-evenly' },
  fluidIdSection: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fluidDivider: { width: 1, height: '70%' },
  fluidIdLabel: { color: '#475569', fontSize: 8, fontWeight: '900', marginTop: 5 },
  fluidIdVal: { color: '#FFF', fontSize: 13, fontWeight: '800', marginTop: 2 },
 
  expertActionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  fluidActionPill: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 30 },
  editProfileText: { fontSize: 10, fontWeight: '900' },
  fluidCrownBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 30, gap: 6 },
  levelBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },
 
  fluidStatusCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 35, marginBottom: 20 },
  statusInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusDot: { width: 10, height: 10, borderRadius: 5, elevation: 10 },
  statusLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  statusSubText: { color: '#475569', fontSize: 9, fontWeight: '600' },
 
  fluidStatsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  fluidStatCard: { flex: 1, paddingVertical: 20, borderRadius: 30, alignItems: 'center' },
  statValue: { color: '#FFF', fontSize: 16, fontWeight: '900', marginVertical: 4 },
  statLabel: { color: '#475569', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
 
  fluidWalletCard: { padding: 25, borderRadius: 40, marginBottom: 30, elevation: 15 },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletTitle: { color: 'rgba(255,255,255,0.8)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  walletBeansValue: { color: '#FFF', fontSize: 38, fontWeight: '900', marginVertical: 12 },
  walletFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletSubTitle: { fontSize: 9, fontWeight: '800' },
  lifetimeBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  lifetimeText: { fontSize: 10, fontWeight: '800' },
 
  cyberProgressBox: { marginBottom: 30, padding: 15 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  neonBarContainer: { height: 35, justifyContent: 'center', marginVertical: 10 },
  neonBarBg: { height: 10, backgroundColor: '#0F172A', borderRadius: 5, overflow: 'hidden' },
  neonBarFill: { height: '100%', borderRadius: 5 },
  barSegments: { position: 'absolute', flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  segmentLine: { width: 2, height: 15, backgroundColor: '#020617' },
  percentText: { fontSize: 18, fontWeight: '900' },
  nextLevelText: { color: '#475569', fontSize: 9, fontWeight: '700', textAlign: 'center' },
  marginSection: { marginBottom: 25 },
  sectionTitle: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 10 },
  chipScroll: { gap: 10, paddingBottom: 10 },
  premiumChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  premiumChipText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  cyberHobbyChip: { backgroundColor: '#1E293B', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 12, borderLeftWidth: 4 },
  cyberHobbyText: { color: '#E2E8F0', fontSize: 12, fontWeight: '700' },
  galleryImg: { width: 100, height: 100, borderRadius: 15, marginRight: 10 },
  emptyGallery: { width: width - 40, height: 100, borderRadius: 15, backgroundColor: 'rgba(30, 41, 59, 0.4)', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#334155' },
  emptyText: { color: '#475569', fontSize: 10, fontWeight: '700' },
 
  bioWrapper: { width: '100%', marginTop: 10 },
  fluidBioBox: { padding: 22, borderRadius: 35, overflow: 'hidden' },
  bioText: { color: '#94A3B8', fontSize: 14, lineHeight: 22 },
 
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#0F172A', borderRadius: 30, padding: 25 },
  modalBoxLarge: { backgroundColor: '#0F172A', borderRadius: 30, padding: 20, borderWidth: 1, borderColor: '#1E293B' },
  modalTitle: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  inputLabel: { fontSize: 10, fontWeight: '900', marginBottom: 5, letterSpacing: 1 },
  input: { backgroundColor: '#1E293B', borderRadius: 15, padding: 15, color: '#FFF', marginBottom: 15 },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  genderBtn: { flex: 1, backgroundColor: '#1E293B', padding: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1 },
  genderBtnText: { color: '#94A3B8', fontSize: 12, fontWeight: '800' },
  tagsWrapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  tagChip: { backgroundColor: '#1E293B', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#334155' },
  tagChipText: { color: '#94A3B8', fontSize: 11, fontWeight: '700' },
  saveBtn: { padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 10 },
  saveBtnText: { color: '#FFF', fontWeight: '900' },
  loaderCenter: { justifyContent: 'center', alignItems: 'center' },
  homeDeleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 20, paddingVertical: 15, borderRadius: 15, backgroundColor: 'rgba(239, 68, 68, 0.08)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', width: '80%', alignSelf: 'center' },
  homeDeleteText: { color: '#EF4444', fontSize: 10, fontWeight: '900', letterSpacing: 2 },

  compactTopBar: {
    width: 'auto',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginHorizontal: 15,
    marginTop: 10,
    marginBottom: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  compactActionGrid: {
      width: '100%',
      gap: 10
  },
  compactRow: {
      flexDirection: 'row',
      width: '100%',
      gap: 10,
      justifyContent: 'space-between'
  },
  compactBtn: {
      flex: 1,
      borderRadius: 12,
      overflow: 'hidden',
      elevation: 5,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 5,
  },
  compactGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 10,
      gap: 6
  },
  compactBtnText: {
      color: '#FFF',
      fontWeight: '900',
      fontSize: 11,
      letterSpacing: 1,
  },
  liveButtonGlow: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      borderRadius: 12,
      backgroundColor: '#FF0000',
      opacity: 0.2,
      zIndex: -1
  },
  masterclassBtn: {
      borderRadius: 12,
      overflow: 'hidden',
      elevation: 5,
      shadowColor: '#000',
      shadowOpacity: 0.3,
      shadowRadius: 5,
  },
  masterclassGradient: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 15,
  },
  masterclassTitle: {
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: 3,
      textTransform: 'uppercase'
  }
});