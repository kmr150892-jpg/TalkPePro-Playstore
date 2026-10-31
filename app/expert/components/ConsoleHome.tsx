import { Feather, FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { deleteUser } from 'firebase/auth';
import { arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { auth, db } from '../../../firebaseConfig';
import { sendNotificationToUser } from '../../../utils/notificationHelper';

// --- COMPONENTS ---

const { height, width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const ADMIN_UID = "jOQ0LxpaFkhuqIiMtOcYCGb3nEf2";

const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dvwjxeexc/image/upload";
const UPLOAD_PRESET = "talkpe";

// 🎨 IMAGES (you can replace these with your own brand images anytime)
const DEFAULT_COVER = 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=2000&auto=format&fit=crop';
const WALLET_BG = 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1200&auto=format&fit=crop';
const BIO_BG = 'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=1200&auto=format&fit=crop';

// ⭕ RANK RING CONFIG
const RING_SIZE = 116;
const RING_STROKE = 10;
const RING_R = (RING_SIZE - RING_STROKE) / 2;
const RING_C = 2 * Math.PI * RING_R;

// ✨ PRESS-SCALE BUTTON (adds a springy premium feel to every tap)
const ScaleBtn = ({ children, onPress, style, wrapStyle, disabled }: any) => {
  const s = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={wrapStyle}
      onPressIn={() => Animated.spring(s, { toValue: 0.93, useNativeDriver: true, speed: 40, bounciness: 0 }).start()}
      onPressOut={() => Animated.spring(s, { toValue: 1, useNativeDriver: true, friction: 4 }).start()}
    >
      <Animated.View style={[style, { transform: [{ scale: s }] }]}>{children}</Animated.View>
    </Pressable>
  );
};

// ✨ FLOATING GLOW PARTICLE (cover area magic dust)
const FloatingDot = ({ delay, left, size, color, duration }: any) => {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(a, { toValue: 1, duration, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true })
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        bottom: 40,
        left,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: a.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.8, 0] }),
        transform: [
          { translateY: a.interpolate({ inputRange: [0, 1], outputRange: [0, -140] }) },
          { translateX: a.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 14, -10] }) }
        ]
      }}
    />
  );
};

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

  // 🆕 BANNER MENU (Banner button click panna Change / Remove options ulla varum)
  const [bannerMenuOpen, setBannerMenuOpen] = useState(false);
  const bannerMenuAnim = useRef(new Animated.Value(0)).current;

  // 🔥 NEW FIX: REFS TO PREVENT INFINITE LOOPS & FIX ZERO-TO-ONE REQUEST BUG 🔥
  const initialLoadRef = useRef(true);
  const knownRequestsRef = useRef<string[]>([]);
  const seenInitRef = useRef(false); // one-time: set the 'notifications last seen' time

  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // ✨ NEW PREMIUM ANIMATION VALUES
  const scrollY = useRef(new Animated.Value(0)).current;           // parallax cover
  const spinAnim = useRef(new Animated.Value(0)).current;          // rotating avatar ring
  const pulseAnim = useRef(new Animated.Value(0)).current;         // halo / online pulse
  const sweepAnim = useRef(new Animated.Value(0)).current;         // light sweep on wallet + badge
  const walletAnim = useRef(new Animated.Value(0)).current;        // wallet count-up
  const progressAnim = useRef(new Animated.Value(0)).current;      // rank ring fill
  const sectionAnims = useRef(Array.from({ length: 12 }, () => new Animated.Value(0))).current; // staggered entrance
  const [walletShown, setWalletShown] = useState(0);
  const [percentShown, setPercentShown] = useState(0);

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

    // ✨ NEW: continuous premium loops
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 6000, easing: Easing.linear, useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.timing(pulseAnim, { toValue: 1, duration: 1900, easing: Easing.out(Easing.quad), useNativeDriver: true })
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.delay(1400),
        Animated.timing(sweepAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(sweepAnim, { toValue: 0, duration: 0, useNativeDriver: true })
      ])
    ).start();

    // ✨ NEW: staggered entrance of every section
    Animated.stagger(
      90,
      sectionAnims.map((a) =>
        Animated.timing(a, { toValue: 1, duration: 750, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      )
    ).start();

    return () => authUnsub();
  }, []);

  // ✨ NEW: wallet count-up animation
  useEffect(() => {
    const id = walletAnim.addListener(({ value }) => setWalletShown(Math.round(value)));
    Animated.timing(walletAnim, {
      toValue: Number(walletBalance) || 0,
      duration: 1600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start();
    return () => walletAnim.removeListener(id);
  }, [walletBalance]);

  // ✨ NEW: rank ring fill animation
  useEffect(() => {
    const id = progressAnim.addListener(({ value }) => setPercentShown(Math.round(value)));
    Animated.timing(progressAnim, {
      toValue: progressPercent,
      duration: 1500,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false
    }).start();
    return () => progressAnim.removeListener(id);
  }, [progressPercent]);

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

        // 🔔 BELL COUNT (bullet-proof): a notification counts as NEW when
        //   (a) its read flag is not true, OR
        //   (b) it was created after the last time the Notifications screen was opened (notifSeenAt).
        // (b) means nothing else in the app (toast bar, background listeners...) can silently hide the count by flipping read:true.
        if (data.notifSeenAt === undefined && !seenInitRef.current) {
          seenInitRef.current = true;
          updateDoc(doc(db, "users", user.uid), { notifSeenAt: Date.now() }).catch(() => {});
        }
        if (Array.isArray(data.notifications)) {
          const seenAt = data.notifSeenAt === undefined ? null : (Number(data.notifSeenAt) || 0);
          const unread = data.notifications.filter((notif: any) => {
            const flagUnread = !(notif?.read === true || notif?.isRead === true);
            const newerThanSeen = seenAt !== null && typeof notif?.createdAt === 'number' && notif.createdAt > seenAt;
            return flagUnread || newerThanSeen;
          }).length;
          setUnreadCount(unread);
        } else {
          setUnreadCount(0);
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
    let result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [16, 9], quality: 0.9 });
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

  // 🗑️ NEW: DELETE GALLERY PHOTO (with confirmation)
  const deleteGalleryImage = (imgUrl: string) => {
    if (!user?.uid) return;
    Alert.alert(
      "Delete Photo",
      "Delete photo from portfolio?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await updateDoc(doc(db, "users", user.uid), { gallery: arrayRemove(imgUrl) });
            } catch (e) {
              Alert.alert("Error", "Delete failed. Check connection.");
            }
          }
        }
      ]
    );
  };

  // 🗑️ NEW: DELETE BANNER IMAGE (with confirmation)
  const deleteCoverImage = () => {
    if (!user?.uid) return;
    Alert.alert(
      "Remove Banner",
      "Remove your banner photo? The default banner will be shown.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setCoverUploading(true);
              await updateDoc(doc(db, "users", user.uid), { coverPhoto: deleteField() });
            } catch (e) {
              Alert.alert("Error", "Could not remove banner. Check connection.");
            } finally { setCoverUploading(false); }
          }
        }
      ]
    );
  };

  // 🆕 BANNER MENU open / close
  const openBannerMenu = () => {
    setBannerMenuOpen(true);
    bannerMenuAnim.setValue(0);
    Animated.timing(bannerMenuAnim, { toValue: 1, duration: 170, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  };

  const closeBannerMenu = () => {
    Animated.timing(bannerMenuAnim, { toValue: 0, duration: 130, easing: Easing.in(Easing.ease), useNativeDriver: true }).start(() => setBannerMenuOpen(false));
  };

  // 🆕 Banner button: custom banner irundha menu (Change / Remove), illana direct-a photo pick
  const handleBannerPress = () => {
    if (coverUploading) return;
    if (expertData?.coverPhoto) {
      if (bannerMenuOpen) closeBannerMenu(); else openBannerMenu();
    } else {
      pickCoverImage();
    }
  };

  // 🗑️ NEW: DELETE PROFILE PHOTO (the image inside the ring, with confirmation)
  const deleteProfileImage = () => {
    if (!user?.uid) return;
    Alert.alert(
      "Remove Profile Photo",
      "Remove your profile photo? A default avatar will be shown.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              setUploading(true);
              await updateDoc(doc(db, "users", user.uid), { profilePic: deleteField() });
            } catch (e) {
              Alert.alert("Error", "Could not remove photo. Check connection.");
            } finally { setUploading(false); }
          }
        }
      ]
    );
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

  // ✨ NEW: derived animation styles
  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.38] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] });
  const dotPulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.8] });
  const dotPulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] });
  const badgePulse = pulseAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.18, 1] });
  const sweepX = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-160, width] });
  const badgeSweepX = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-60, 180] });
  const ringOffset = progressAnim.interpolate({ inputRange: [0, 100], outputRange: [RING_C, 0] });
  const coverTranslate = scrollY.interpolate({ inputRange: [-250, 0, 250], outputRange: [-125, 0, 125], extrapolate: 'clamp' });
  const coverScale = scrollY.interpolate({ inputRange: [-250, 0], outputRange: [2, 1], extrapolate: 'clamp' });
  const coverTextFade = scrollY.interpolate({ inputRange: [0, 140], outputRange: [1, 0], extrapolate: 'clamp' });

  const reveal = (i: number) => ({
    opacity: sectionAnims[i],
    transform: [{ translateY: sectionAnims[i].interpolate({ inputRange: [0, 1], outputRange: [46, 0] }) }]
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
    <View style={styles.rootContainer}>

      {/* 🌌 FIXED LIVE BACKGROUND (stays still while content scrolls = depth) */}
      <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />
      <Animated.View pointerEvents="none" style={[styles.shimmerOrb, { top: 120, right: -60, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
      <Animated.View pointerEvents="none" style={[styles.shimmerOrb, { top: 450, left: -90, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

    <Animated.ScrollView
      style={styles.mainContainer}
      contentContainerStyle={{ paddingBottom: 170 }}
      showsVerticalScrollIndicator={false}
      scrollEventThrottle={16}
      onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
    >

      {/* 🎬 HERO COVER WITH PARALLAX */}
      <View style={styles.coverContainer}>
         <Animated.Image
            source={{ uri: expertData?.coverPhoto || DEFAULT_COVER }}
            style={[styles.coverImage, { transform: [{ translateY: coverTranslate }, { scale: coverScale }] }]}
         />
         {/* ☀️ bright banner: only a very light top scrim so the header icons stay readable */}
         <LinearGradient colors={['rgba(2,6,23,0.30)', 'transparent']} style={styles.coverTopScrim} pointerEvents="none" />

         {/* ✨ floating magic dust */}
         <FloatingDot delay={0}    left={width * 0.12} size={6} color={theme.primary}   duration={4200} />
         <FloatingDot delay={900}  left={width * 0.30} size={4} color="#FFF"            duration={3600} />
         <FloatingDot delay={1700} left={width * 0.48} size={7} color={theme.secondary} duration={4800} />
         <FloatingDot delay={600}  left={width * 0.66} size={5} color={theme.accent}    duration={4000} />
         <FloatingDot delay={2300} left={width * 0.82} size={4} color="#FFF"            duration={3400} />
         <FloatingDot delay={1300} left={width * 0.90} size={6} color={theme.primary}   duration={5000} />
         
         <Animated.View style={[styles.headerBar, { opacity: coverTextFade }]}>
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
                <Ionicons name={unreadCount > 0 ? "notifications" : "notifications-outline"} size={18} color="#FFF" />
                {unreadCount > 0 && (
                    <Animated.View style={[styles.badgeContainer, { transform: [{ scale: badgePulse }] }]}>
                        <Text style={styles.badgeText}>
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </Text>
                    </Animated.View>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={[styles.iconCircle, {marginLeft: 8}]} onPress={() => router.push("/blocked-users")}>
                <Ionicons name="person-remove-outline" size={18} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconCircle, {marginLeft: 8}]} onPress={handleLogout}>
                <Feather name="log-out" size={18} color="#F43F5E" />
              </TouchableOpacity>
            </View>
         </Animated.View>
         <ScaleBtn wrapStyle={styles.shareCoverWrap} style={styles.shareCoverBtn} onPress={handleShareApp}>
             <Ionicons name="share-social" size={14} color="#FFF" />
             <Text style={styles.editCoverText}>Share</Text>
         </ScaleBtn>

         {/* 🆕 BANNER BUTTON: custom banner irundha click panna menu (Change / Remove), illana direct-a pick */}
         <ScaleBtn wrapStyle={styles.editCoverWrap} style={styles.editCoverBtn} onPress={handleBannerPress} disabled={coverUploading}>
            {coverUploading ? <ActivityIndicator size="small" color="#FFF" /> : (
              <>
                <Ionicons name="camera" size={14} color="#FFF" />
                <Text style={styles.editCoverText}>Banner</Text>
                {!!expertData?.coverPhoto && (
                  <Ionicons name={bannerMenuOpen ? "chevron-down" : "chevron-up"} size={12} color="#FFF" style={{ marginLeft: 4 }} />
                )}
              </>
            )}
         </ScaleBtn>

         {/* 🆕 BANNER MENU (Change Banner / Remove Banner) - veliya tap panna mooditum */}
         {bannerMenuOpen && (
           <>
             <Pressable style={styles.bannerMenuBackdrop} onPress={closeBannerMenu} />
             <Animated.View
               style={[
                 styles.bannerMenu,
                 {
                   borderColor: theme.primary + '90',
                   opacity: bannerMenuAnim,
                   transform: [
                     { translateY: bannerMenuAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
                     { scale: bannerMenuAnim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }
                   ]
                 }
               ]}
             >
               <TouchableOpacity style={styles.bannerMenuItem} onPress={() => { closeBannerMenu(); pickCoverImage(); }} activeOpacity={0.7}>
                 <Ionicons name="image-outline" size={17} color={theme.primary} />
                 <Text style={styles.bannerMenuText}>Change Banner</Text>
               </TouchableOpacity>
               <View style={styles.bannerMenuDivider} />
               <TouchableOpacity style={styles.bannerMenuItem} onPress={() => { closeBannerMenu(); deleteCoverImage(); }} activeOpacity={0.7}>
                 <Ionicons name="trash-outline" size={17} color="#F87171" />
                 <Text style={[styles.bannerMenuText, { color: '#F87171' }]}>Remove Banner</Text>
               </TouchableOpacity>
             </Animated.View>
           </>
         )}

         
      </View>

      <View style={styles.contentContainer}>
         
          {/* 👤 PROFILE HERO */}
          <View style={styles.profileSection}>
            <Animated.View style={[styles.avatarWrapper, reveal(0)]}>
              {/* pulsing halo */}
              <Animated.View style={[styles.avatarHalo, { borderColor: theme.primary, opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
              {/* rotating gradient ring */}
              <View style={styles.avatarRingClip}>
                <Animated.View style={{ width: 230, height: 230, transform: [{ rotate: spin }] }}>
                  <LinearGradient
                    colors={[theme.primary, 'transparent', theme.secondary, 'transparent', theme.accent, theme.primary]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={{ flex: 1 }}
                  />
                </Animated.View>
              </View>
              <View style={styles.avatarInner}>
                {uploading ? (
                  <View style={[styles.avatar, styles.loaderCenter]}><ActivityIndicator color={theme.primary} /></View>
                ) : (
                  <Image source={{ uri: expertData?.profilePic || `https://ui-avatars.com/api/?name=${encodeURIComponent(expertData?.name || 'Host')}&background=${theme.primary.replace('#', '')}&color=fff&size=300&bold=true` }} style={styles.avatar} />
                )}
              </View>
              <ScaleBtn wrapStyle={styles.cameraIconWrap} style={[styles.cameraIconBtn, {backgroundColor: theme.primary}]} onPress={pickImage} disabled={uploading}>
                <Ionicons name="camera" size={18} color="#FFF" />
              </ScaleBtn>
              {/* 🗑️ NEW: DELETE PROFILE PHOTO (shows only when a photo exists) */}
              {!!expertData?.profilePic && !uploading && (
                <ScaleBtn wrapStyle={styles.avatarDeleteWrap} style={styles.avatarDeleteBtn} onPress={deleteProfileImage}>
                  <Ionicons name="trash-outline" size={18} color="#FFF" />
                </ScaleBtn>
              )}
            </Animated.View>

            <Animated.View style={[{ alignItems: 'center', width: '100%' }, reveal(1)]}>
              <Text style={styles.nameText}>{expertData?.name || 'Host'}</Text>

              {/* 🏅 LEVEL BADGE (with light sweep) */}
              <LinearGradient colors={[theme.primary, theme.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.fluidCrownBadge}>
                  <MaterialCommunityIcons name="crown" size={14} color="#FFF" />
                  <Text style={styles.levelBadgeText}>{config.label}</Text>
                  <Animated.View pointerEvents="none" style={[styles.badgeSweep, { transform: [{ translateX: badgeSweepX }, { skewX: '-20deg' }] }]} />
              </LinearGradient>
           
              {/* 🪪 IDENTITY PILLS (equal size, identical borders, perfectly aligned) */}
              <View style={styles.fluidIdentityCapsule}>
                <View style={[styles.fluidIdSection, borderType1]}>
                  <View style={[styles.idIconCircle, { backgroundColor: theme.primary + '25' }]}>
                    <Ionicons name="location-sharp" size={15} color={theme.primary} />
                  </View>
                  <Text style={styles.fluidIdLabel}>LOCATION</Text>
                  <Text style={styles.fluidIdVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{expertData?.location || "India"}</Text>
                </View>

                <View style={[styles.fluidIdSection, borderType1]}>
                  <View style={[styles.idIconCircle, { backgroundColor: theme.primary + '25' }]}>
                    <MaterialCommunityIcons name="cake-variant" size={15} color={theme.primary} />
                  </View>
                  <Text style={styles.fluidIdLabel}>AGE</Text>
                  <Text style={styles.fluidIdVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{expertData?.age || "24"}</Text>
                </View>

                <View style={[styles.fluidIdSection, borderType1]}>
                  <View style={[styles.idIconCircle, { backgroundColor: theme.primary + '25' }]}>
                    <Ionicons name="person" size={15} color={theme.primary} />
                  </View>
                  <Text style={styles.fluidIdLabel}>GENDER</Text>
                  <Text style={styles.fluidIdVal} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{expertData?.gender || "N/A"}</Text>
                </View>
              </View>

              <View style={styles.expertActionRow}>
                  <ScaleBtn onPress={() => setModalVisible(true)} style={{}}>
                    <LinearGradient colors={[theme.primary, theme.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.editProfileGradient}>
                      <Feather name="edit-3" size={14} color="#FFF" />
                      <Text style={styles.editProfileText}>EDIT PROFILE</Text>
                    </LinearGradient>
                  </ScaleBtn>
              </View>
            </Animated.View>
          </View>

          {/* 🟢 STATUS CARD WITH LIVE PULSE */}
          <Animated.View style={[styles.fluidStatusCard, borderType1, reveal(2)]}>
            <View style={styles.statusInner}>
              <View style={styles.statusDotWrap}>
                {isOnline && (
                  <Animated.View style={[styles.statusDotPulse, { opacity: dotPulseOpacity, transform: [{ scale: dotPulseScale }] }]} />
                )}
                <View style={[styles.statusDot, { backgroundColor: isOnline ? '#10B981' : '#94A3B8', shadowColor: isOnline ? '#10B981' : '#94A3B8' }]} />
              </View>
              <View>
                <Text style={[styles.statusLabel, { color: isOnline ? '#10B981' : '#94A3B8' }]}>{isOnline ? "LIVE · ONLINE" : "STANDBY MODE"}</Text>
                <Text style={styles.statusSubText}>{isOnline ? "Receiving incoming requests" : "Currently offline from system"}</Text>
              </View>
            </View>
            <Switch value={isOnline} onValueChange={toggleOnlineStatus} trackColor={{ false: "#1E293B", true: "#059669" }} thumbColor={"#FFF"} />
          </Animated.View>

          {/* 📊 STATS GRID */}
          <Animated.View style={[styles.fluidStatsGrid, reveal(3)]}>
            <ScaleBtn wrapStyle={{ flex: 1 }} style={[styles.fluidStatCard, borderType2]} onPress={() => router.push('/expert-history')}>
              <View style={[styles.statIconCircle, { backgroundColor: theme.primary + '22' }]}>
                <MaterialCommunityIcons name="history" size={20} color={theme.primary} />
              </View>
              <Text style={styles.statValue}>LOGS</Text>
              <Text style={styles.statLabel}>HISTORY</Text>
            </ScaleBtn>
            <ScaleBtn wrapStyle={{ flex: 1 }} style={[styles.fluidStatCard, borderType1]} onPress={handleOpenRateModal}>
              <View style={[styles.statIconCircle, { backgroundColor: '#FBBF2422' }]}>
                <FontAwesome5 name="fire-alt" size={18} color="#FBBF24" />
              </View>
              <Text style={styles.statValue}>{expertData?.pricePerMin || 1000}</Text>
              <Text style={styles.statLabel}>EDIT RATE</Text>
            </ScaleBtn>
            <View style={{ flex: 1 }}>
              <View style={[styles.fluidStatCard, borderType2]}>
                <View style={[styles.statIconCircle, { backgroundColor: '#10B98122' }]}>
                  <MaterialCommunityIcons name="currency-inr" size={20} color="#10B981" />
                </View>
                <Text style={styles.statValue}>₹{(expertData?.pricePerMin * 0.01 || 0).toFixed(0)}</Text>
                <Text style={styles.statLabel}>PER MIN</Text>
              </View>
            </View>
          </Animated.View>

          {/* 💳 PREMIUM WALLET CARD (image bg + count-up + light sweep) */}
          <Animated.View style={[styles.fluidWalletCard, { borderColor: theme.primary + '70' }, reveal(4)]}>
              <Image source={{ uri: WALLET_BG }} style={styles.walletBgImage} />
              <LinearGradient colors={[theme.primary + 'AA', '#020617E6', theme.secondary + '99']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
              <Animated.View pointerEvents="none" style={[styles.walletSweep, { transform: [{ translateX: sweepX }, { skewX: '-20deg' }] }]} />

              <View style={styles.walletHeader}>
                <Text style={styles.walletTitle}>NET GAINED REWARDS</Text>
                <MaterialCommunityIcons name="integrated-circuit-chip" size={34} color="rgba(255,255,255,0.55)" />
              </View>
              <Text style={styles.walletBeansValue}>{walletShown.toLocaleString()}</Text>
              <View style={styles.walletFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name="wallet-outline" size={14} color="rgba(255,255,255,0.7)" />
                  <Text style={[styles.walletSubTitle, {color: 'rgba(255,255,255,0.7)'}]}>WITHDRAWABLE REWARDS</Text>
                </View>
                <View style={[styles.lifetimeBadge, { backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: theme.primary + '60' }]}>
                    <Text style={[styles.lifetimeText, { color: '#FFF' }]}>LIFETIME: {totalBeans.toLocaleString()}</Text>
                </View>
              </View>
          </Animated.View>

          {/* ⭕ RANK PROGRESS RING */}
          <Animated.View style={[styles.cyberProgressBox, borderType2, reveal(5)]}>
              <View style={styles.ringRow}>
                <View style={{ width: RING_SIZE, height: RING_SIZE, alignItems: 'center', justifyContent: 'center' }}>
                  <Svg width={RING_SIZE} height={RING_SIZE} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
                    <Defs>
                      <SvgGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                        <Stop offset="0" stopColor={theme.primary} />
                        <Stop offset="1" stopColor={theme.accent} />
                      </SvgGradient>
                    </Defs>
                    <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_R} stroke="rgba(255,255,255,0.08)" strokeWidth={RING_STROKE} fill="none" />
                    <AnimatedCircle
                      cx={RING_SIZE / 2}
                      cy={RING_SIZE / 2}
                      r={RING_R}
                      stroke="url(#ringGrad)"
                      strokeWidth={RING_STROKE}
                      strokeLinecap="round"
                      fill="none"
                      strokeDasharray={RING_C}
                      strokeDashoffset={ringOffset}
                    />
                  </Svg>
                  <Text style={[styles.percentText, { color: theme.primary }]}>{percentShown}%</Text>
                </View>

                <View style={{ flex: 1, marginLeft: 20 }}>
                  <Text style={styles.sectionTitle}>RANK PROGRESS</Text>
                  <Text style={styles.rankBigText}>{config.label}</Text>
                  <View style={styles.neonBarBg}>
                    <LinearGradient
                      colors={[theme.primary, theme.accent, '#FFF']}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      style={[styles.neonBarFill, { width: `${progressPercent}%` }]}
                    />
                  </View>
                  <Text style={styles.nextLevelText}>{config.next > 0 ? `${pendingBeans.toLocaleString()} more to reach Level ${config.lvl + 1}` : "ULTIMATE RANK REACHED"}</Text>
                </View>
              </View>
          </Animated.View>

          {expertData?.expertiseTags && expertData.expertiseTags.length > 0 && (
             <Animated.View style={[styles.marginSection, reveal(6)]}>
                <Text style={styles.sectionTitle}>CORE EXPERTISE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                    {expertData.expertiseTags.map((tag: string, index: number) => (
                        <LinearGradient key={index} colors={[theme.primary, theme.secondary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.premiumChip}>
                            <MaterialCommunityIcons name="star-four-points" size={12} color="#FFF" style={{marginRight: 6}} />
                            <Text style={styles.premiumChipText}>{tag}</Text>
                        </LinearGradient>
                    ))}
                </ScrollView>
             </Animated.View>
          )}

          {expertData?.hobbies && expertData.hobbies.length > 0 && (
             <Animated.View style={[styles.marginSection, reveal(7)]}>
                <Text style={styles.sectionTitle}>INTERESTS & HOBBIES</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                    {expertData.hobbies.map((tag: string, index: number) => (
                        <View key={index} style={[styles.cyberHobbyChip, { borderLeftColor: theme.primary }]}>
                            <Text style={styles.cyberHobbyText}>{tag}</Text>
                        </View>
                    ))}
                </ScrollView>
             </Animated.View>
          )}

          {/* 🖼️ PORTFOLIO GALLERY */}
          <Animated.View style={[styles.marginSection, reveal(8)]}>
             <View style={styles.progressTextRow}>
                <Text style={styles.sectionTitle}>PORTFOLIO GALLERY</Text>
                <TouchableOpacity onPress={uploadGalleryImage} disabled={galleryUploading}>
                    {galleryUploading ? <ActivityIndicator size="small" color={theme.primary} /> : <Feather name="plus-circle" size={22} color={theme.primary} />}
                </TouchableOpacity>
             </View>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginTop: 10}}>
                {expertData?.gallery?.map((img: string, index: number) => (
                  <View key={index} style={[styles.galleryItem, { borderColor: theme.primary + '70' }]}>
                    <Image source={{ uri: img }} style={styles.galleryImg} />
                    <LinearGradient colors={['transparent', 'rgba(2,6,23,0.55)']} style={styles.galleryShade} pointerEvents="none" />
                    <TouchableOpacity style={styles.galleryDeleteBtn} onPress={() => deleteGalleryImage(img)}>
                      <Ionicons name="close" size={14} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                ))}
                {(!expertData?.gallery || expertData?.gallery.length === 0) && <View style={styles.emptyGallery}><Ionicons name="images-outline" size={26} color="#475569" /><Text style={[styles.emptyText, { marginTop: 6 }]}>Upload your work</Text></View>}
             </ScrollView>
          </Animated.View>

          {/* 📝 BIO */}
          <Animated.View style={[styles.bioWrapper, reveal(9)]}>
            <Text style={styles.sectionTitle}>BIO DESCRIPTION</Text>
            <BlurView intensity={25} tint="dark" style={[styles.fluidBioBox, borderType2]}>
              <Image source={{ uri: BIO_BG }} style={styles.bioBgImage} />
              <Ionicons name="chatbubble-ellipses-outline" size={22} color={theme.primary} style={{ marginBottom: 10 }} />
              <Text style={styles.bioText}>{expertData?.bio || "Describe your professional skills."}</Text>
            </BlurView>
          </Animated.View>

          <Animated.View style={[styles.compactRow, { marginTop: 30 }, reveal(10)]}>
              <ScaleBtn
                  wrapStyle={{ flex: 1 }}
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
              </ScaleBtn>

              <ScaleBtn
                  wrapStyle={{ flex: 1 }}
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
              </ScaleBtn>
          </Animated.View>

          <Animated.View style={reveal(11)}>
            <TouchableOpacity style={styles.homeDeleteBtn} onPress={handleTerminateExpert} disabled={isDeleting}>
                {isDeleting ? <ActivityIndicator color="#EF4444" /> : (
                    <>
                        <Ionicons name="trash-outline" size={20} color="#EF4444" />
                        <Text style={styles.homeDeleteText}>DELETE ACCOUNT</Text>
                    </>
                )}
            </TouchableOpacity>
          </Animated.View>

      </View>

      {/* ⚡ RATE MODAL */}
      <Modal visible={rateModalVisible} animationType="fade" transparent={true}>
        <View style={styles.overlay}><View style={[styles.modalBox, { borderWidth: 1, borderColor: theme.primary + '60' }]}>
            <LinearGradient colors={[theme.primary + '25', 'transparent']} style={styles.modalGlow} pointerEvents="none" />
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

      {/* ✏️ EDIT PROFILE MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.overlay}><ScrollView contentContainerStyle={{flexGrow: 1, justifyContent: 'center', paddingVertical: 40}} showsVerticalScrollIndicator={false}>
          <View style={[styles.modalBoxLarge, { borderColor: theme.primary + '50' }]}>
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

    </Animated.ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootContainer: { flex: 1, backgroundColor: '#020617' },
  mainContainer: { flex: 1, backgroundColor: 'transparent' },
  shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
  coverContainer: { width: '100%', height: 300, position: 'relative', overflow: 'hidden' },
  coverTopScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 110 },
  coverImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', position: 'absolute', top: 5, left: 10, right: 5, zIndex: 10 },
  logoText: { color: '#FFF', fontSize: 22, fontWeight: '900', letterSpacing: 1 },
  subLogo: { color: '#94A3B8', fontSize: 8, fontWeight: '800', letterSpacing: 3 },
  leftHeader: { flex: 1 },
 
  shareCoverWrap: { position: 'absolute', bottom: 70, left: 10, zIndex: 10 },
  editCoverWrap: { position: 'absolute', bottom: 70, right: 10, zIndex: 10 },
  shareCoverBtn: { backgroundColor: 'rgba(243, 6, 156, 0.85)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', elevation: 5 },
  editCoverBtn: { backgroundColor: 'rgba(4, 4, 247, 0.65)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
 
  editCoverText: { color: '#FFF', fontSize: 11, fontWeight: '800', marginLeft: 6, letterSpacing: 0.5 },
  // 🆕 BANNER MENU STYLES (Change / Remove)
  bannerMenuBackdrop: { ...StyleSheet.absoluteFillObject, zIndex: 14 },
  bannerMenu: { position: 'absolute', bottom: 112, right: 10, zIndex: 20, minWidth: 176, backgroundColor: 'rgba(8, 15, 35, 0.96)', borderRadius: 18, padding: 6, borderWidth: 1, elevation: 12, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
  bannerMenuItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 11, borderRadius: 12 },
  bannerMenuText: { color: '#FFF', fontSize: 12, fontWeight: '800', letterSpacing: 0.3 },
  bannerMenuDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 8 },
 
  contentContainer: { paddingHorizontal: 20, marginTop: -90 },
  rightHeader: { flexDirection: 'row', alignItems: 'center' },
  adminIconBtn: { width: 38, height: 38, backgroundColor: 'rgba(16, 185, 129, 0.2)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 8, borderWidth: 1, borderColor: '#10B98140' },
  iconCircle: { width: 38, height: 38, backgroundColor: 'rgba(15, 23, 42, 0.7)', borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' },
  
  badgeContainer: { position: 'absolute', right: -7, top: -7, backgroundColor: '#F43F5E', borderRadius: 10, minWidth: 19, height: 19, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#020617', zIndex: 20, elevation: 8 },
  badgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', paddingHorizontal: 4 },

  profileSection: { alignItems: 'center', marginBottom: 25 },
  avatarWrapper: { width: 156, height: 156, justifyContent: 'center', alignItems: 'center' },
  avatarHalo: { position: 'absolute', width: 148, height: 148, borderRadius: 74, borderWidth: 2 },
  avatarRingClip: { width: 148, height: 148, borderRadius: 74, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
  avatarInner: { position: 'absolute', top: 10, alignSelf: 'center' },
  avatarRing: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 136, height: 136, borderRadius: 68, borderWidth: 4, borderColor: '#020617' },
  cameraIconWrap: { position: 'absolute', bottom: 4, right: 4 },
  cameraIconBtn: { padding: 8, borderRadius: 14, borderWidth: 3, borderColor: '#020617' },
  avatarDeleteWrap: { position: 'absolute', bottom: 4, left: 4 },
  avatarDeleteBtn: { padding: 8, borderRadius: 14, borderWidth: 3, borderColor: '#020617', backgroundColor: '#EF4444' },
  nameText: { color: '#FFF', fontSize: 30, fontWeight: '900', marginTop: 14, letterSpacing: 0.5, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 8 },
 
  fluidIdentityCapsule: { flexDirection: 'row', alignSelf: 'stretch', width: '100%', marginTop: 20, alignItems: 'stretch', justifyContent: 'space-between', gap: 10 },
  fluidIdSection: { flex: 1, flexBasis: 0, minWidth: 0, height: 98, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, borderRadius: 24 },
  idIconCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  fluidDivider: { width: 1, height: '70%' },
  fluidIdLabel: { color: '#64748B', fontSize: 8, fontWeight: '900', marginTop: 8, height: 11, lineHeight: 11, letterSpacing: 1, textAlign: 'center' },
  fluidIdVal: { color: '#FFF', fontSize: 13, fontWeight: '800', marginTop: 3, height: 18, lineHeight: 18, width: '100%', textAlign: 'center' },
 
  expertActionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 20 },
  fluidActionPill: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 30 },
  editProfileGradient: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 30 },
  editProfileText: { fontSize: 11, fontWeight: '900', color: '#FFF', letterSpacing: 1.5 },
  fluidCrownBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 30, gap: 6, marginTop: 10, overflow: 'hidden' },
  levelBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  badgeSweep: { position: 'absolute', top: 0, bottom: 0, width: 26, backgroundColor: 'rgba(255,255,255,0.35)' },
 
  fluidStatusCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, borderRadius: 35, marginBottom: 20 },
  statusInner: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  statusDotWrap: { width: 22, height: 22, justifyContent: 'center', alignItems: 'center' },
  statusDotPulse: { position: 'absolute', width: 10, height: 10, borderRadius: 5, backgroundColor: '#10B981' },
  statusDot: { width: 10, height: 10, borderRadius: 5, elevation: 10 },
  statusLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  statusSubText: { color: '#64748B', fontSize: 9, fontWeight: '600' },
 
  fluidStatsGrid: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  fluidStatCard: { height: 122, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  statIconCircle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  statValue: { color: '#FFF', fontSize: 16, fontWeight: '900', marginVertical: 4 },
  statLabel: { color: '#64748B', fontSize: 7, fontWeight: '900', letterSpacing: 1 },
 
  fluidWalletCard: { padding: 25, borderRadius: 36, marginBottom: 30, elevation: 15, overflow: 'hidden', borderWidth: 1, backgroundColor: '#0F172A' },
  walletBgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.35 },
  walletSweep: { position: 'absolute', top: -20, bottom: -20, width: 80, backgroundColor: 'rgba(255,255,255,0.14)' },
  walletHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletTitle: { color: 'rgba(255,255,255,0.85)', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  walletBeansValue: { color: '#FFF', fontSize: 42, fontWeight: '900', marginVertical: 14, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 3 }, textShadowRadius: 10 },
  walletFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  walletSubTitle: { fontSize: 9, fontWeight: '800' },
  lifetimeBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  lifetimeText: { fontSize: 10, fontWeight: '800' },
 
  cyberProgressBox: { marginBottom: 30, padding: 20, borderRadius: 32 },
  ringRow: { flexDirection: 'row', alignItems: 'center' },
  rankBigText: { color: '#FFF', fontSize: 18, fontWeight: '900', marginBottom: 12, letterSpacing: 0.5 },
  progressTextRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  neonBarContainer: { height: 35, justifyContent: 'center', marginVertical: 10 },
  neonBarBg: { height: 8, backgroundColor: '#0F172A', borderRadius: 4, overflow: 'hidden', marginBottom: 10 },
  neonBarFill: { height: '100%', borderRadius: 4 },
  barSegments: { position: 'absolute', flexDirection: 'row', justifyContent: 'space-around', width: '100%' },
  segmentLine: { width: 2, height: 15, backgroundColor: '#020617' },
  percentText: { fontSize: 22, fontWeight: '900' },
  nextLevelText: { color: '#64748B', fontSize: 9, fontWeight: '700' },
  marginSection: { marginBottom: 25 },
  sectionTitle: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 10 },
  chipScroll: { gap: 10, paddingBottom: 10 },
  premiumChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  premiumChipText: { color: '#FFF', fontSize: 11, fontWeight: '800' },
  cyberHobbyChip: { backgroundColor: 'rgba(30,41,59,0.85)', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 14, borderLeftWidth: 4 },
  cyberHobbyText: { color: '#E2E8F0', fontSize: 12, fontWeight: '700' },
  galleryImg: { width: 120, height: 120, borderRadius: 18 },
  galleryItem: { position: 'relative', marginRight: 12, borderRadius: 20, borderWidth: 1.5, padding: 2, overflow: 'hidden' },
  galleryShade: { position: 'absolute', left: 2, right: 2, bottom: 2, height: 50, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  galleryDeleteBtn: { position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(239, 68, 68, 0.9)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  emptyGallery: { width: width - 40, height: 110, borderRadius: 20, backgroundColor: 'rgba(30, 41, 59, 0.4)', justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#334155' },
  emptyText: { color: '#64748B', fontSize: 10, fontWeight: '700' },
 
  bioWrapper: { width: '100%', marginTop: 10 },
  fluidBioBox: { padding: 22, borderRadius: 35, overflow: 'hidden' },
  bioBgImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%', opacity: 0.12 },
  bioText: { color: '#CBD5E1', fontSize: 14, lineHeight: 23 },
 
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', padding: 20 },
  modalBox: { backgroundColor: '#0F172A', borderRadius: 30, padding: 25, overflow: 'hidden' },
  modalGlow: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 },
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
      borderRadius: 16,
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
