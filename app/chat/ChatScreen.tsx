import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePreventScreenCapture } from 'expo-screen-capture'; // 🆕 SCREENSHOT / SCREEN RECORD BLOCK
import { addDoc, arrayUnion, collection, deleteDoc, doc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'; // 🔥 SATTI FIX: Added getDocs for Wipeout | 🆕 arrayUnion for Block
import React, { useContext, useEffect, useRef, useState } from 'react'; // 🆕 useContext (BlockContext)
import {
  ActivityIndicator, // 🆕 Block loader
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal, // 🆕 Block popup
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'; // 🆕 useSafeAreaInsets (nav buttons overlap fix)
import { auth, db } from '../../firebaseConfig';
import { BlockContext } from '../../utils/context/BlockContext'; // 🆕 Same BlockContext as Expert screen (user -> host block)
import { playMessageSound } from '../../utils/sounds'; // 🔔 NEW: message sound

const { width, height } = Dimensions.get('window');

// 🆕 Safe alpha helper (8-digit hex colors-kum work aagum, e.g. '#09bbf1fe' + '50' invalid aagaadhu)
const alpha = (c: string, a: string) => (c || '#000000').slice(0, 7) + a;

// 🆕 Lighten helper - dark tier colors-ah brighter ah mathi screen "dark" feel ah remove pannum
const lighten = (c: string, amt: number) => {
  const hex = (c || '#000000').slice(1, 7);
  const r = parseInt(hex.slice(0, 2), 16) || 0;
  const g = parseInt(hex.slice(2, 4), 16) || 0;
  const b = parseInt(hex.slice(4, 6), 16) || 0;
  const mix = (v: number) => Math.round(v + (255 - v) * amt);
  const toHex = (v: number) => mix(v).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT THEME SYNC FROM MEMORY V2)
const calculateUserLevel = (totalSpent: number) => {
  if (totalSpent >= 500000001) return { 
      lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#ff0000', secondaryColor: '#660000', anim: 'titan', themeBg: ['#1A0000', '#000000']
  }; 
  if (totalSpent >= 100000001) return { 
      lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#ff0dba', secondaryColor: '#a50606', anim: 'mythic', themeBg: ['#15001A', '#000000']
  }; 
  if (totalSpent >= 50000000) return { 
      lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#f6f60d', secondaryColor: '#02fa0a', anim: 'grandmaster', themeBg: ['#08001A', '#000000']
  };
  if (totalSpent >= 10000000) return { 
      lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#f52b6092', anim: 'explosion', themeBg: ['#00101A', '#000000']
  };
  if (totalSpent >= 5000000) return { 
      lvl: 4, label: 'LEGENDARY NODE', status: 'NEBULA COMMANDER', color: '#d0630a', secondaryColor: '#5f0bf0', anim: 'nebula', themeBg: ['#0A001A', '#000000']
  };
  if (totalSpent >= 1000000) return { 
      lvl: 3, label: 'DIAMOND CORE', status: 'NUCLEAR ASSET', color: '#bcde4a', secondaryColor: '#09bbf1fe', anim: 'diamond', themeBg: ['#001A0A', '#000000']
  };
  if (totalSpent >= 200001) return { 
      lvl: 2, label: 'GOLD OPERATIVE', status: 'ROYAL STRIKER', color: '#ffae00', secondaryColor: '#ac4a4a', anim: 'sparkle', themeBg: ['#1A0B00', '#000000']
  };
  // ✅ Level 1 Secondary Color is RED (#6b0402)
  return { 
      lvl: 1, label: 'SILVER AGENT', status: 'STAR FAME', color: '#0f33e7', secondaryColor: '#6b0402', anim: 'wave', themeBg: ['#050505', '#000000']
  };
};

// 🆕 HOST / USER ROLE DETECTOR (host screen-la irundhu user ah block, user screen-la irundhu host ah block - rendu flow-kum idhu thaan base)
// ⚠️ Unga DB-la host-ah identify panra field vera irundha, inge mattum maathunga.
const isHostRole = (d: any) => {
  if (!d) return false;
  const r = String(d.role || d.userType || d.accountType || '').toLowerCase();
  if (r === 'expert' || r === 'host') return true;
  if (d.isExpert === true || d.isHost === true) return true;
  if (d.beansPerMin !== undefined || (Array.isArray(d.expertiseTags) && d.expertiseTags.length > 0) || Number(d.totalBeansEarned || 0) > 0) return true;
  return false;
};

// 🆕 Floating star-dust particles (fixed positions, shimmer driver-la drift + twinkle aagum)
const PARTICLES = [
  { x: 0.06, y: 0.16, s: 3 }, { x: 0.22, y: 0.30, s: 2 }, { x: 0.38, y: 0.12, s: 4 }, { x: 0.55, y: 0.26, s: 2 },
  { x: 0.72, y: 0.14, s: 3 }, { x: 0.90, y: 0.28, s: 2 }, { x: 0.12, y: 0.48, s: 3 }, { x: 0.33, y: 0.58, s: 2 },
  { x: 0.50, y: 0.44, s: 4 }, { x: 0.68, y: 0.60, s: 2 }, { x: 0.86, y: 0.50, s: 3 }, { x: 0.18, y: 0.76, s: 2 },
  { x: 0.44, y: 0.82, s: 3 }, { x: 0.78, y: 0.78, s: 2 }
];

// 🆕 Floating 3D glass crystals (background-la slow ah 3D-la thirumbum)
const CRYSTALS = [
  { x: 0.74, y: 0.20, size: 98, r: 26, rev: false },
  { x: 0.02, y: 0.52, size: 72, r: 20, rev: true },
  { x: 0.60, y: 0.70, size: 58, r: 16, rev: false }
];

// 🆕 Date separator helpers
const dayKey = (m: any) => (m?.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000) : new Date()).toDateString();
const dayLabel = (m: any) => {
  const d = m?.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000) : new Date();
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'TODAY';
  if (d.toDateString() === yest.toDateString()) return 'YESTERDAY';
  return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
};

// 🆕 Quick starter chips (empty chat-la) - tap pannina input-la mattum varum, auto-send aagaadhu
const STARTERS = ['👋 Hi!', 'How are you?', "Let's connect"];

// 🆕 BLOCK REASONS (Expert / User detail screens-la irukkura same reasons)
const BLOCK_REASONS = [
  "Abusive Language / Harassment",
  "Inappropriate Behavior / Nudity",
  "Scam / Spam / Phishing",
  "Threatening / Aggressive",
  "Other Unwanted Contact"
];

// 🆕 3D EXTRUDED MESSAGE BUBBLE - depth layer, glass sheen, avatar, date chip, entrance flip + press tilt
const MessageBubble = ({ item, isMine, tier, onLongPress, showAvatar, avatarUri, showDate, dateLabel, tight }: any) => {
  const enter = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(enter, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }).start();
  }, []);

  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [30, 0] });
  const translateX = enter.interpolate({ inputRange: [0, 1], outputRange: [isMine ? 50 : -50, 0] });
  const rotateX = enter.interpolate({ inputRange: [0, 1], outputRange: ['32deg', '0deg'] });
  const rotateYEnter = enter.interpolate({ inputRange: [0, 1], outputRange: [isMine ? '-22deg' : '22deg', '0deg'] });
  const scale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] });

  const pIn = () => Animated.spring(press, { toValue: 1, friction: 6, useNativeDriver: true }).start();
  const pOut = () => Animated.spring(press, { toValue: 0, friction: 5, useNativeDriver: true }).start();

  return (
    <Animated.View
      style={[
        styles.msgWrapper,
        { marginBottom: tight ? 6 : 20 },
        { opacity: enter, transform: [{ perspective: 900 }, { translateY }, { translateX }, { rotateX }, { rotateY: rotateYEnter }, { scale }] }
      ]}
    >
      {showDate && (
        <View style={styles.dateRow}>
          <LinearGradient colors={['transparent', alpha(tier.color, '88')]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dateLine} />
          <View style={[styles.dateChip, { borderColor: alpha(tier.color, '70') }]}>
            <Text style={[styles.dateText, { color: '#FFFFFF' }]}>{dateLabel}</Text>
          </View>
          <LinearGradient colors={[alpha(tier.color, '88'), 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.dateLine} />
        </View>
      )}

      <View style={[styles.rowLine, isMine ? { justifyContent: 'flex-end' } : { justifyContent: 'flex-start' }]}>
        {!isMine && (
          showAvatar ? (
            <LinearGradient colors={[tier.color, tier.secondaryColor]} style={styles.bubbleAvatarRing}>
              <Image source={{ uri: avatarUri }} style={styles.bubbleAvatar} />
            </LinearGradient>
          ) : (
            <View style={styles.avatarSpacer} />
          )
        )}

        <View style={{ maxWidth: '78%', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
          {/* 🔥 UNIVERSAL DELETE: TouchableOpacity wraps BOTH bubbles now! 🔥 */}
          <TouchableOpacity 
              activeOpacity={0.85} 
              onLongPress={() => onLongPress(item.id)}
              onPressIn={pIn}
              onPressOut={pOut}
          >
              {isMine ? (
                  <View>
                      {/* 3D depth layer (extrude) */}
                      <View style={[styles.depthMine, { backgroundColor: alpha(tier.secondaryColor, 'BB') }]} />
                      <LinearGradient 
                        colors={[tier.color, tier.secondaryColor]} 
                        start={{x:0, y:0}} end={{x:1, y:1}} 
                        style={[styles.myBubble, { shadowColor: tier.color }]}
                      >
                          <LinearGradient
                            colors={['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.06)', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 0.9, y: 0.8 }}
                            style={styles.bubbleSheenMine}
                            pointerEvents="none"
                          />
                          <Text style={styles.msgText}>{item.text}</Text>
                      </LinearGradient>
                  </View>
              ) : (
                  <View>
                      <View style={[styles.depthTheirs, { backgroundColor: alpha(tier.secondaryColor, '55') }]} />
                      <LinearGradient
                        colors={[alpha(tier.secondaryColor, 'DD'), 'rgba(255,255,255,0.10)', alpha(tier.color, 'BB')]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={[styles.theirBorder, { shadowColor: tier.secondaryColor }]}
                      >
                          <BlurView intensity={40} tint="dark" style={styles.theirBubble}>
                              <LinearGradient
                                colors={['rgba(255,255,255,0.10)', 'transparent']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 0.9, y: 0.7 }}
                                style={StyleSheet.absoluteFill}
                                pointerEvents="none"
                              />
                              <Text style={styles.msgText}>{item.text}</Text>
                          </BlurView>
                      </LinearGradient>
                  </View>
              )}
          </TouchableOpacity>
          <Text style={styles.timeText}>
              {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
};

export default function ChatScreen() {
  // 🔒 SCREENSHOT & SCREEN RECORDING BLOCK (Android: full block, iOS: black screen in capture)
  usePreventScreenCapture();

  // 🔥 SATTI FIX: Mapped parameters to support both direct chat and profile chat routes 🔥
  const { chatId, receiverId, receiverName, userId, userName } = useLocalSearchParams();
  
  const actualReceiverId = (receiverId || userId) as string;
  const actualReceiverName = (receiverName || userName) as string;

  const { blockUser } = useContext(BlockContext); // 🆕 Context initialized (user -> host block flow-ku)

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [receiverImage, setReceiverImage] = useState<string | null>(null);
  
  const [userData, setUserData] = useState<any>(null); // ✅ Current Logged-in User Data
  const [receiverData, setReceiverData] = useState<any>(null); // 🔥 SATTI FIX: Opponent User Data

  const [msgsLoaded, setMsgsLoaded] = useState(false); // 🆕 empty-state flash aagaama irukka
  const [showJump, setShowJump] = useState(false); // 🆕 scroll-to-latest button
  const [kbOpen, setKbOpen] = useState(false); // 🆕 keyboard open/close track (input dock spacing)

  // 🆕 BLOCK & REPORT MODAL STATES (Expert / User detail screens-la irukkura same flow)
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);

  const user = auth.currentUser;
  const router = useRouter();
  const listRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets(); // 🆕 phone navigation buttons height

  // 🔥 SATTI FIX: Universal Chat Room Generator
  const activeChatId = (chatId as string) || (user?.uid && actualReceiverId ? [user.uid, actualReceiverId].sort().join('_') : '');

  // 🌀 ANIMATION ENGINE REFS
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  // 🆕 new animation drivers
  const spinAnim = useRef(new Animated.Value(0)).current;
  const spinRevAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const headerEnter = useRef(new Animated.Value(0)).current;
  const inputEnter = useRef(new Animated.Value(0)).current;
  const focusAnim = useRef(new Animated.Value(0)).current;
  const sendPop = useRef(new Animated.Value(0)).current;
  const floatIcon = useRef(new Animated.Value(0)).current;
  const jumpAnim = useRef(new Animated.Value(0)).current;

  // 🆕 Keyboard listeners - keyboard open aana nav-bar gap theva illa, close aana nav-bar mela input lift
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const s = Keyboard.addListener(showEvt, () => setKbOpen(true));
    const h = Keyboard.addListener(hideEvt, () => setKbOpen(false));
    return () => { s.remove(); h.remove(); };
  }, []);

  useEffect(() => {
    if (!activeChatId || !user) return;

    // 🔥 Start Ambient Shimmer
    Animated.loop(
        Animated.sequence([
            Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
        ])
    ).start();

    // 🔥 Reset Unread Count Logic
    const resetUnread = async () => {
      try {
        const chatRef = doc(db, "chats", activeChatId);
        await updateDoc(chatRef, { [`unreadCount.${user.uid}`]: 0 });
      } catch (e) {
        console.log("Sync error or document initializing...");
      }
    };
    resetUnread();

    // 🔥 Fetch Current User Data (For theme & "Blocked by Me" check)
    const userRef = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(
      userRef, 
      (snap) => {
        if (snap.exists()) setUserData(snap.data());
      },
      (error) => {
        if (error.code === 'permission-denied') console.log("Safe Ignore: User listener detached on logout.");
      }
    );

    // 🔥 SATTI FIX: Fetch Receiver Data (For "Blocked by Them" check & Profile Pic) 🔥
    let unsubReceiver = () => {};
    if (actualReceiverId) {
        unsubReceiver = onSnapshot(
          doc(db, "users", actualReceiverId), 
          (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setReceiverData(data);
                setReceiverImage(data.profilePic || data.photoURL || null);
            }
          },
          (error) => {
            if (error.code === 'permission-denied') console.log("Safe Ignore: Receiver listener detached on logout.");
          }
        );
    }

    // 🔔 NEW: first snapshot = old history (no sound). Only later 'added' messages from the other person ring.
    let isFirstSnapshot = true;

    const q = query(collection(db, "chats", activeChatId, "messages"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q, 
      (snap) => {
        // 🔔 NEW: message sound for new incoming message
        if (!isFirstSnapshot) {
          const hasNewIncoming = snap.docChanges().some((change) => {
            if (change.type !== 'added') return false;
            if (change.doc.metadata.hasPendingWrites) return false; // my own message still sending
            const d: any = change.doc.data();
            return d.senderId && d.senderId !== user.uid;
          });
          if (hasNewIncoming) playMessageSound();
        }
        isFirstSnapshot = false;

        const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs);
        setMsgsLoaded(true);
      },
      (error) => {
        if (error.code === 'permission-denied') console.log("Safe Ignore: Chat listener detached on logout.");
      }
    );

    return () => { unsubscribe(); unsubUser(); unsubReceiver(); };
  }, [activeChatId, user, actualReceiverId]);

  // 🆕 One-time UI animations (avatar rings, status pulse, entrances, floating icon)
  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 7000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.timing(spinRevAnim, { toValue: 1, duration: 11000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 1100, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true })
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatIcon, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatIcon, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

    Animated.spring(headerEnter, { toValue: 1, friction: 8, tension: 50, useNativeDriver: true }).start();
    Animated.spring(inputEnter, { toValue: 1, friction: 8, tension: 50, delay: 150, useNativeDriver: true }).start();
  }, []);

  // 🆕 send button pop when text available
  const hasText = message.trim().length > 0;
  useEffect(() => {
    Animated.spring(sendPop, { toValue: hasText ? 1 : 0, friction: 5, tension: 120, useNativeDriver: true }).start();
  }, [hasText]);

  // 🆕 jump-to-latest button show/hide
  useEffect(() => {
    Animated.spring(jumpAnim, { toValue: showJump ? 1 : 0, friction: 7, tension: 90, useNativeDriver: true }).start();
  }, [showJump]);

  // 2. Transmit Message Logic
  const sendMessage = async () => {
    if (message.trim().length === 0) return;

    try {
      await addDoc(collection(db, "chats", activeChatId, "messages"), {
        text: message,
        senderId: user?.uid,
        createdAt: serverTimestamp(),
      });

      const chatRef = doc(db, "chats", activeChatId);
      
      await setDoc(chatRef, {
        lastMessageText: message,
        lastMessageTime: serverTimestamp(),
        participants: [user?.uid, actualReceiverId],
        unreadCount: { [actualReceiverId]: increment(1) }
      }, { merge: true });

      setMessage('');
    } catch (e) {
      console.error("Transmission Error:", e);
    }
  };

  // 🔥 3. DELETE SINGLE MESSAGE LOGIC 🔥
  const handleDeleteMessage = (msgId: string) => {
      Alert.alert(
          "Delete Record",
          "Are you sure you want to permanently delete this transmission?",
          [
              { text: "Cancel", style: "cancel" },
              { 
                  text: "Delete", style: "destructive", 
                  onPress: async () => {
                      try {
                          await deleteDoc(doc(db, "chats", activeChatId, "messages", msgId));
                      } catch (error) {
                          Alert.alert("Error", "Could not delete record.");
                      }
                  } 
              }
          ]
      );
  };

  // 🔥 SATTI FIX: DEEP WIPEOUT ENTIRE CHAT FROM INSIDE 🔥
  const handleWipeoutChat = () => {
      Alert.alert(
          "Clear Session",
          "Are you sure you want to permanently delete this entire session history?",
          [
              { text: "Cancel", style: "cancel" },
              { 
                  text: "Clear All", style: "destructive", 
                  onPress: async () => {
                      try {
                          const msgsSnap = await getDocs(collection(db, "chats", activeChatId, "messages"));
                          const deletePromises = msgsSnap.docs.map(msgDoc => deleteDoc(doc(db, "chats", activeChatId, "messages", msgDoc.id)));
                          await Promise.all(deletePromises);
                          
                          await deleteDoc(doc(db, "chats", activeChatId));
                          router.back();
                      } catch (error) {
                          Alert.alert("Error", "Could not clear the session.");
                      }
                  } 
              }
          ]
      );
  };

  // 🔥 SATTI FIX: Synced Highest Balance check for accurate Level display in Chat!
  const userDiamonds = userData?.totalSpentDiamonds || 0;
  const userTier = calculateUserLevel(userDiamonds);

  // 🆕 BRIGHT UI TIER - same tier colors, but lightened so the screen is NOT dark anymore
  const uiTier = {
    ...userTier,
    color: lighten(userTier.color, 0.08),
    secondaryColor: lighten(userTier.secondaryColor, 0.04),
  };
  
  const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });

  const borderType1 = {
      borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
      borderLeftColor: uiTier.color, borderRightColor: uiTier.color,
      borderTopColor: alpha(uiTier.secondaryColor, 'B0'), borderBottomColor: alpha(uiTier.secondaryColor, 'B0'),
      backgroundColor: 'rgba(8, 12, 34, 0.90)',
  };

  // 🔥 SATTI FIX: MUTE CHAT IF ANYONE BLOCKS ANYONE 🔥
  const isBlockedByMe = Array.isArray(userData?.blockedUsers) && userData.blockedUsers.includes(actualReceiverId);
  const isBlockedByThem = Array.isArray(receiverData?.blockedUsers) && receiverData.blockedUsers.includes(user?.uid);
  const isChatBlocked = isBlockedByMe || isBlockedByThem;

  // 🆕 ROLE: naan host-ah (host -> user block) illa user-ah (user -> host block)
  const iAmHost = isHostRole(userData);
  const receiverLabel = iAmHost ? 'USER' : 'HOST';

  // 🆕 BLOCK & REPORT (header shield button) - Expert / User detail screens-la irukkura same flow
  const openBlockModal = () => {
      if (!user?.uid || !actualReceiverId) return;
      setBlockModalVisible(true);
  };

  const handleBlockReasonSelect = (reason: string) => {
      if (!user?.uid || !actualReceiverId) return;

      if (isBlockedByMe) {
          Alert.alert(
              "ACTION RESTRICTED",
              `This ${receiverLabel.toLowerCase()} is already in your blacklist. Please manage them via Security Settings if you wish to restore access.`
          );
          setBlockModalVisible(false);
          return;
      }

      Alert.alert(
          "CONFIRM BLOCK",
          `Are you sure you want to block ${actualReceiverName || receiverLabel.toLowerCase()}?\n\nReason: ${reason}`,
          [
              { text: "CANCEL", style: "cancel" },
              {
                  text: "BLOCK & REPORT",
                  style: "destructive",
                  onPress: () => executeBlockUser(reason)
              }
          ]
      );
  };

  const executeBlockUser = async (reason: string) => {
      if (!user?.uid || !actualReceiverId) return;
      setIsBlocking(true);
      const myUid = user.uid;
      const myName = userData?.name || user.displayName || (iAmHost ? "Expert" : "TalkPe User");
      const theirName = actualReceiverName || receiverData?.name || (iAmHost ? "User" : "Unknown Expert");

      try {
          // Update my doc
          await updateDoc(doc(db, "users", myUid), { blockedUsers: arrayUnion(actualReceiverId) });
          // Update blocked person's block count
          await updateDoc(doc(db, "users", actualReceiverId), { expertBlockCount: increment(1) });

          // Push alert to admin (same types as Expert / User detail screens)
          if (iAmHost) {
              await addDoc(collection(db, "admin_alerts"), {
                  type: 'EXPERT_BLOCKED_USER',
                  expertId: myUid,
                  expertName: myName,
                  userId: actualReceiverId,
                  userName: theirName,
                  reason: reason,
                  timestamp: serverTimestamp(),
                  status: 'unread'
              });
          } else {
              await addDoc(collection(db, "admin_alerts"), {
                  type: 'USER_BLOCKED_EXPERT',
                  expertId: actualReceiverId,
                  expertName: theirName,
                  userId: myUid,
                  userName: myName,
                  reason: reason,
                  timestamp: serverTimestamp(),
                  status: 'unread'
              });
          }

          if (iAmHost) {
              Alert.alert("USER BLOCKED", `${theirName} has been successfully restricted and reported to safety moderation.`);
          } else {
              // Trigger local context block to clear app feeds
              blockUser(actualReceiverId);
              Alert.alert("HOST BLOCKED", `${theirName} has been successfully restricted and reported to safety moderation.`, [
                  { text: "OK", onPress: () => router.back() }
              ]);
          }
      } catch (error) {
          Alert.alert("SYSTEM ERROR", "Unable to complete blocking protocol. Please check your connection.");
      } finally {
          setIsBlocking(false);
          setBlockModalVisible(false);
      }
  };

  const avatarUri = receiverImage || `https://ui-avatars.com/api/?name=${actualReceiverName || 'Host'}&background=1E293B&color=fff`;

  // 🆕 interpolations
  const ringRotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const ringRotateRev = spinRevAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const crystalRotA = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const crystalRotB = spinRevAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const dotScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const dotOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] });
  const haloScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.5] });
  const haloOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });
  const headerY = headerEnter.interpolate({ inputRange: [0, 1], outputRange: [-60, 0] });
  const headerRotX = headerEnter.interpolate({ inputRange: [0, 1], outputRange: ['-35deg', '0deg'] });
  const inputY = inputEnter.interpolate({ inputRange: [0, 1], outputRange: [80, 0] });
  const sendScale = sendPop.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] });
  const sendRotate = sendPop.interpolate({ inputRange: [0, 1], outputRange: ['-25deg', '0deg'] });
  const sendRingOpacity = Animated.multiply(sendPop, haloOpacity);
  const floatY = floatIcon.interpolate({ inputRange: [0, 1], outputRange: [0, -14] });
  const floatRotY = floatIcon.interpolate({ inputRange: [0, 1], outputRange: ['-16deg', '16deg'] });
  const avatarRotY = floatIcon.interpolate({ inputRange: [0, 1], outputRange: ['-12deg', '12deg'] });
  const blobX1 = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 50] });
  const blobX2 = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -60] });
  const jumpScale = jumpAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] });

  // 🆕 Input dock bottom spacing: nav buttons mela lift (keyboard close), keyboard open aana tight
  const dockBottom = kbOpen ? 10 : Math.max(insets.bottom, 12) + (Platform.OS === 'android' ? 26 : 12);

  const showEmpty = msgsLoaded && messages.length === 0 && !isChatBlocked;

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* 🔥 DYNAMIC ANIMATED DESIGN BACKGROUND (BRIGHT MIDNIGHT AURORA) */}
      <LinearGradient colors={['#0D1230', '#080B20', '#110A27']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* 🆕 receiver profile pic = blurred ambient wallpaper */}
      <Image source={{ uri: avatarUri }} blurRadius={45} style={[StyleSheet.absoluteFill, { opacity: 0.08 }]} />
      {/* 🆕 tier colour light-wash top & bottom */}
      <LinearGradient colors={[alpha(uiTier.color, '22'), 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 0.6 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <LinearGradient colors={['transparent', alpha(uiTier.secondaryColor, '1C')]} start={{ x: 0.1, y: 0.4 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
      {/* 🆕 tier base theme (themeBg) - soft vignette at the bottom only */}
      <LinearGradient colors={['transparent', alpha(userTier.themeBg[0], '88')]} style={StyleSheet.absoluteFill} pointerEvents="none" />
      
      {/* 🔥 FLOATING SHIMMER ORBS (aurora) */}
      <Animated.View style={[styles.shimmerOrb, { top: 150, right: -80, backgroundColor: uiTier.secondaryColor, transform: [{ translateY: orbTranslateY }, { translateX: blobX2 }] }]} />
      <Animated.View style={[styles.shimmerOrb, { bottom: 100, left: -80, backgroundColor: uiTier.color, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }, { translateX: blobX1 }] }]} />
      <Animated.View style={[styles.shimmerOrbSmall, { top: height * 0.38, left: width * 0.35, backgroundColor: uiTier.color, transform: [{ translateY: Animated.multiply(orbTranslateY, 0.6) }, { translateX: blobX1 }] }]} />

      {/* 🆕 3D glass crystals */}
      {CRYSTALS.map((c, i) => (
        <Animated.View
          key={`crystal-${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: c.x * width,
            top: c.y * height,
            width: c.size,
            height: c.size,
            borderRadius: c.r,
            borderWidth: 1.5,
            borderColor: alpha(i % 2 === 0 ? uiTier.color : uiTier.secondaryColor, '88'),
            overflow: 'hidden',
            opacity: 0.28,
            transform: [
              { perspective: 700 },
              { rotateX: c.rev ? crystalRotA : crystalRotB },
              { rotateY: c.rev ? crystalRotB : crystalRotA },
              { translateY: orbTranslateY }
            ]
          }}
        >
          <LinearGradient colors={[alpha(uiTier.color, '66'), 'rgba(255,255,255,0.10)', alpha(uiTier.secondaryColor, '55')]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        </Animated.View>
      ))}

      {/* 🆕 star-dust particles */}
      {PARTICLES.map((p, i) => {
        const up = i % 2 === 0;
        const ty = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: up ? [0, -40 - (i % 3) * 14] : [-30 - (i % 3) * 10, 0] });
        const op = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: up ? [0.2, 0.95] : [0.95, 0.2] });
        return (
          <Animated.View
            key={i}
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: p.x * width,
              top: p.y * height,
              width: p.s,
              height: p.s,
              borderRadius: p.s / 2,
              backgroundColor: i % 3 === 0 ? '#FFFFFF' : uiTier.color,
              opacity: op,
              transform: [{ translateY: ty }]
            }}
          />
        );
      })}

      {/* --- FLOATING GLASS HEADER HUD --- */}
      <Animated.View style={{ opacity: headerEnter, transform: [{ perspective: 1000 }, { translateY: headerY }, { rotateX: headerRotX }] }}>
      <SafeAreaView edges={['top']} style={styles.headerSafe}>
        <LinearGradient
          colors={[alpha(uiTier.color, 'EE'), alpha(uiTier.secondaryColor, '55'), alpha(uiTier.color, 'EE')]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={[styles.headerBorder, { shadowColor: uiTier.color }]}
        >
          <BlurView intensity={60} tint="dark" style={styles.headerHud}>
             <LinearGradient colors={['rgba(255,255,255,0.10)', 'transparent']} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} pointerEvents="none" />

             <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: alpha(uiTier.secondaryColor, '90') }]}>
                <Ionicons name="chevron-back" size={24} color="#FFF" />
             </TouchableOpacity>
             
             <View style={styles.headerInfo}>
                <Animated.View style={[styles.avatarBox, { transform: [{ perspective: 600 }, { rotateY: avatarRotY }] }]}>
                    <Animated.View style={[styles.avatarHalo, { backgroundColor: uiTier.color, opacity: haloOpacity, transform: [{ scale: haloScale }] }]} />
                    <Animated.View style={{ position: 'absolute', transform: [{ rotate: ringRotateRev }] }}>
                        <LinearGradient colors={[uiTier.secondaryColor, 'transparent', uiTier.secondaryColor, 'transparent']} style={styles.headerAvatarRingOuter} />
                    </Animated.View>
                    <Animated.View style={{ position: 'absolute', transform: [{ rotate: ringRotate }] }}>
                        <LinearGradient colors={[uiTier.color, uiTier.secondaryColor, uiTier.color]} style={styles.headerAvatarRing} />
                    </Animated.View>
                    <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
                </Animated.View>
                {/* 🆕 minWidth: 0 -> text neelama irundhaalum trash button mela overlap aagaadhu */}
                <View style={{ marginLeft: 12, flex: 1, minWidth: 0 }}>
                    <Text style={styles.headerName} numberOfLines={1}>{actualReceiverName || "Host Node"}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={[styles.statusPill, { borderColor: alpha(isChatBlocked ? '#FF6B6B' : uiTier.color, '88'), backgroundColor: alpha(isChatBlocked ? '#FF6B6B' : uiTier.color, '28') }]}>
                         <View style={styles.pulseWrap}>
                            <Animated.View style={[styles.pulseRing, { backgroundColor: isChatBlocked ? '#FF6B6B' : uiTier.color, opacity: dotOpacity, transform: [{ scale: dotScale }] }]} />
                            <View style={[styles.pulseDot, { backgroundColor: isChatBlocked ? '#FF6B6B' : uiTier.color }]} />
                         </View>
                         {/* 🆕 "UPLINK SEVERED" romba neelam -> "BLOCKED" (delete button-ku edikkaadhu) */}
                         <Text style={[styles.statusText, { color: isChatBlocked ? '#FF8A8A' : '#FFFFFF' }]}>
                             {isChatBlocked ? "BLOCKED" : "CHAT"}
                         </Text>
                      </View>
                      {/* 🆕 protected (screenshot blocked) badge - chat blocked-ah irukkumbodhu hide (pill-ku space kidaikka) */}
                      {!isChatBlocked && (
                        <View style={[styles.secureBadge, { borderColor: alpha(uiTier.color, '88') }]}>
                          <Ionicons name="lock-closed" size={10} color="#FFF" />
                        </View>
                      )}
                    </View>
                </View>
             </View>

             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                 <TouchableOpacity onPress={handleWipeoutChat} style={[styles.headerAction, { borderColor: 'rgba(255,107,107,0.65)' }]}>
                    <Ionicons name="trash-outline" size={19} color="#FF6B6B" />
                 </TouchableOpacity>
                 {/* 🆕 BLOCK & REPORT BUTTON (shield irundha idathula) - Expert / User detail screens-la irukkura same shield-off icon + flow */}
                 <TouchableOpacity
                    onPress={openBlockModal}
                    style={[styles.headerAction, { borderColor: 'rgba(239,68,68,0.70)' }]}
                 >
                    <MaterialCommunityIcons name="shield-off" size={20} color="#EF4444" />
                 </TouchableOpacity>
             </View>
          </BlurView>
        </LinearGradient>
      </SafeAreaView>
      </Animated.View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={{ flex: 1 }}
      >
        {/* 🆕 list area wrapper - empty state & jump button idhukulla center aagum */}
        <View style={{ flex: 1 }}>
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(item) => item.id}
            inverted
            contentContainerStyle={styles.chatList}
            showsVerticalScrollIndicator={false}
            scrollEventThrottle={16}
            onScroll={(e) => {
              const s = e.nativeEvent.contentOffset.y > 400;
              setShowJump((p) => (p === s ? p : s));
            }}
            renderItem={({ item, index }) => {
              const isMine = item.senderId === user?.uid;
              const older = messages[index + 1];
              const newer = messages[index - 1];
              const showDate = !older || dayKey(older) !== dayKey(item);
              const showAvatar = !isMine && (!newer || newer.senderId !== item.senderId);
              const tight = !!newer && newer.senderId === item.senderId && dayKey(newer) === dayKey(item);
              return (
                <MessageBubble
                  item={item}
                  isMine={isMine}
                  tier={uiTier}
                  onLongPress={handleDeleteMessage}
                  showAvatar={showAvatar}
                  avatarUri={avatarUri}
                  showDate={showDate}
                  dateLabel={showDate ? dayLabel(item) : ''}
                  tight={tight}
                />
              );
            }}
          />

          {/* 🔥 EMPTY STATE - ippo screen nadu-la (center) varum, thala kila illa! */}
          {showEmpty && (
            <View pointerEvents="box-none" style={styles.emptyOverlay}>
              <View style={styles.emptyWrap}>
                <Animated.View style={[styles.emptyIconCircle, { borderColor: alpha(uiTier.color, '99'), shadowColor: uiTier.color, transform: [{ perspective: 800 }, { translateY: floatY }, { rotateY: floatRotY }] }]}>
                  <LinearGradient colors={[alpha(uiTier.color, '77'), alpha(uiTier.secondaryColor, '33')]} style={StyleSheet.absoluteFill} />
                  <LinearGradient colors={['rgba(255,255,255,0.30)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 0.9, y: 0.9 }} style={StyleSheet.absoluteFill} />
                  <MaterialCommunityIcons name="message-text-lock-outline" size={50} color="#FFFFFF" />
                </Animated.View>
                <Text style={styles.emptyTitle}>Start the conversation</Text>
                <Text style={styles.emptySub}>Say hi to {actualReceiverName || "Host Node"}</Text>
                <View style={styles.starterRow}>
                  {STARTERS.map((s) => (
                    <TouchableOpacity key={s} activeOpacity={0.8} onPress={() => setMessage(s)} style={[styles.starterChip, { borderColor: alpha(uiTier.color, '99') }]}>
                      <Text style={styles.starterText}>{s}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          <Animated.View
            pointerEvents={showJump ? 'auto' : 'none'}
            style={[styles.jumpWrap, { opacity: jumpAnim, transform: [{ scale: jumpScale }] }]}
          >
            <TouchableOpacity activeOpacity={0.85} onPress={() => listRef.current?.scrollToOffset({ offset: 0, animated: true })}>
              <LinearGradient colors={[uiTier.color, uiTier.secondaryColor]} style={[styles.jumpBtn, { shadowColor: uiTier.color }]}>
                <Ionicons name="chevron-down" size={22} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Animated.View style={[styles.inputArea, { paddingBottom: dockBottom, opacity: inputEnter, transform: [{ translateY: inputY }] }]}>
            <View style={styles.dockRow}>
                {!isChatBlocked && (
                    <TouchableOpacity activeOpacity={0.8} style={[styles.attachBtn, { borderColor: alpha(uiTier.color, '99'), shadowColor: uiTier.color }]}>
                       <LinearGradient colors={[alpha(uiTier.color, '55'), 'rgba(255,255,255,0.10)']} style={StyleSheet.absoluteFill} />
                       <Ionicons name="add" size={26} color="#FFFFFF" />
                    </TouchableOpacity>
                )}

                <View style={{ flex: 1 }}>
                    {!isChatBlocked && (
                        <Animated.View
                            pointerEvents="none"
                            style={[styles.inputGlow, { backgroundColor: alpha(uiTier.color, '88'), opacity: focusAnim }]}
                        />
                    )}
                    <BlurView intensity={80} tint="dark" style={[styles.inputBlur, borderType1, isChatBlocked && { justifyContent: 'center' }]}>
                        {isChatBlocked ? (
                            <View style={styles.blockedMsgContainer}>
                                <MaterialCommunityIcons name="shield-off" size={16} color="#FF6B6B" />
                                <Text style={styles.blockedMsgText}>You cannot reply to this conversation.</Text>
                            </View>
                        ) : (
                            <TextInput
                              style={styles.input}
                              value={message}
                              onChangeText={setMessage}
                              placeholder="Type transmission..."
                              placeholderTextColor="#6F7DAE"
                              multiline
                              onFocus={() => Animated.timing(focusAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start()}
                              onBlur={() => Animated.timing(focusAnim, { toValue: 0, duration: 250, useNativeDriver: true }).start()}
                            />
                        )}
                    </BlurView>
                </View>

                {!isChatBlocked && (
                    <View style={styles.sendOuter}>
                        <Animated.View pointerEvents="none" style={[styles.sendRing, { backgroundColor: uiTier.color, opacity: sendRingOpacity, transform: [{ scale: haloScale }] }]} />
                        <Animated.View style={{ transform: [{ perspective: 600 }, { scale: sendScale }, { rotate: sendRotate }] }}>
                            <TouchableOpacity 
                              onPress={sendMessage} 
                              disabled={!message.trim()}
                              style={[styles.sendBtn, !message.trim() && { opacity: 0.55 }]}
                            >
                              <LinearGradient 
                                colors={[uiTier.color, uiTier.secondaryColor]} 
                                start={{x:0, y:0}} end={{x:1, y:1}} 
                                style={[styles.sendGrad, { shadowColor: uiTier.color }]}
                              >
                                <LinearGradient colors={['rgba(255,255,255,0.45)', 'transparent']} start={{x:0,y:0}} end={{x:0.8,y:0.8}} style={StyleSheet.absoluteFill} pointerEvents="none" />
                                <Ionicons name="send" size={20} color="#FFF" />
                              </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>
                    </View>
                )}
            </View>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* 🆕 BLOCK & REPORT MODAL (Expert / User detail screens-la irukkura same bottom-sheet UI) */}
      <Modal
        visible={blockModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setBlockModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              {
                borderColor: uiTier.color,
                borderTopColor: alpha(uiTier.color, 'EE'),
                borderLeftColor: alpha(uiTier.color, 'EE'),
                borderBottomColor: alpha(uiTier.secondaryColor, 'EE'),
                borderRightColor: alpha(uiTier.secondaryColor, 'EE'),
              }
            ]}
          >
            <View style={{ alignItems: 'center', marginBottom: 15 }}>
              <View style={[styles.modalIconRing, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                <MaterialCommunityIcons name="shield-off-outline" size={32} color="#EF4444" />
              </View>
              <Text style={styles.modalTitle}>BLOCK {receiverLabel}</Text>
              <Text style={styles.modalSubText}>
                Restrict {actualReceiverName || receiverLabel.toLowerCase()} from contacting you{iAmHost ? '' : ' or showing in your feed'}. This action will be reported for safety moderation.
              </Text>
            </View>

            <Text style={styles.modalLabel}>REASON FOR REPORTING:</Text>
            {BLOCK_REASONS.map((reason, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.blockReasonBtn,
                  {
                    borderColor: alpha(uiTier.color, '40'),
                    borderTopColor: alpha(uiTier.color, 'AA'),
                    borderLeftColor: alpha(uiTier.color, 'AA'),
                    borderBottomColor: alpha(uiTier.secondaryColor, 'AA'),
                    borderRightColor: alpha(uiTier.secondaryColor, 'AA'),
                  }
                ]}
                onPress={() => handleBlockReasonSelect(reason)}
                disabled={isBlocking}
              >
                <Text style={styles.blockReasonText}>{reason}</Text>
                <Ionicons name="chevron-forward" size={16} color={uiTier.color} />
              </TouchableOpacity>
            ))}

            {isBlocking && (
              <ActivityIndicator size="small" color="#EF4444" style={{ marginTop: 10 }} />
            )}

            <TouchableOpacity
              style={styles.cancelActionBtn}
              onPress={() => setBlockModalVisible(false)}
              disabled={isBlocking}
            >
              <Text style={styles.cancelBtnText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#080B20' },
  shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.16 },
  shimmerOrbSmall: { position: 'absolute', width: 190, height: 190, borderRadius: 95, opacity: 0.10 },

  headerSafe: { paddingHorizontal: 12, paddingBottom: 6 },
  headerBorder: { borderRadius: 32, padding: 1.5, marginTop: 6, shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 14 },
  headerHud: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 30.5, overflow: 'hidden', backgroundColor: 'rgba(6,9,26,0.85)' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.08)', width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 10 },
  avatarBox: { width: 66, height: 66, alignItems: 'center', justifyContent: 'center' },
  avatarHalo: { position: 'absolute', width: 56, height: 56, borderRadius: 28 },
  headerAvatarRingOuter: { width: 66, height: 66, borderRadius: 33, opacity: 0.8 },
  headerAvatarRing: { width: 58, height: 58, borderRadius: 22 },
  headerAvatar: { width: 50, height: 50, borderRadius: 18, backgroundColor: '#10153A', borderWidth: 2, borderColor: '#080B20' },
  headerName: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.4 },
  statusPill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1, marginTop: 5 },
  secureBadge: { width: 22, height: 22, borderRadius: 11, borderWidth: 1, marginTop: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  pulseWrap: { width: 14, height: 14, alignItems: 'center', justifyContent: 'center', marginRight: 3 },
  pulseRing: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, elevation: 5, shadowOpacity: 0.5, shadowRadius: 5 },
  statusText: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  headerAction: { width: 38, height: 38, borderRadius: 19, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },

  chatList: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 24, flexGrow: 1 },
  msgWrapper: { width: '100%' },
  rowLine: { flexDirection: 'row', alignItems: 'flex-end' },
  bubbleAvatarRing: { width: 34, height: 34, borderRadius: 13, padding: 1.5, marginRight: 8, marginBottom: 18, alignItems: 'center', justifyContent: 'center' },
  bubbleAvatar: { width: '100%', height: '100%', borderRadius: 11.5, backgroundColor: '#10153A' },
  avatarSpacer: { width: 42 },
  dateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, marginTop: 6 },
  dateLine: { flex: 1, height: 1 },
  dateChip: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.07)', marginHorizontal: 10 },
  dateText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.8 },
  depthMine: { position: 'absolute', top: 6, left: 5, right: -5, bottom: -6, borderRadius: 24, borderBottomRightRadius: 6 },
  depthTheirs: { position: 'absolute', top: 6, left: -4, right: 4, bottom: -6, borderRadius: 24, borderBottomLeftRadius: 6 },
  myBubble: { 
    padding: 16, borderRadius: 24, borderBottomRightRadius: 6, 
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.30)',
    elevation: 15, shadowOpacity: 0.6, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }
  },
  bubbleSheenMine: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 24, borderBottomRightRadius: 6 },
  theirBorder: { borderRadius: 24, borderBottomLeftRadius: 6, padding: 1.2, shadowOpacity: 0.45, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8 },
  theirBubble: { 
    padding: 15, borderRadius: 22.8, borderBottomLeftRadius: 5, 
    backgroundColor: 'rgba(8, 12, 34, 0.88)', overflow: 'hidden'
  },
  msgText: { color: '#FFF', fontSize: 15, fontWeight: '600', lineHeight: 22, textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  timeText: { color: '#7983AE', fontSize: 10, fontWeight: '800', marginTop: 8, letterSpacing: 0.5 },

  emptyOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', paddingBottom: 30 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyIconCircle: { width: 120, height: 120, borderRadius: 60, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.05)', shadowOpacity: 0.7, shadowRadius: 24, shadowOffset: { width: 0, height: 12 }, elevation: 12, marginBottom: 24 },
  emptyTitle: { color: '#FFF', fontSize: 21, fontWeight: '900', letterSpacing: 0.3 },
  emptySub: { color: '#8089B3', fontSize: 13, fontWeight: '700', marginTop: 6, letterSpacing: 0.5 },
  starterRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginTop: 22 },
  starterChip: { paddingHorizontal: 15, paddingVertical: 10, borderRadius: 16, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.07)' },
  starterText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },

  jumpWrap: { position: 'absolute', right: 20, bottom: 14 },
  jumpBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowOpacity: 0.6, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 10 },

  inputArea: { paddingHorizontal: 14, paddingTop: 10 },
  dockRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
  inputGlow: { position: 'absolute', top: -3, left: -3, right: -3, bottom: -3, borderRadius: 34 },
  inputBlur: { flexDirection: 'row', alignItems: 'center', borderRadius: 30, paddingHorizontal: 10, paddingVertical: 6, overflow: 'hidden', minHeight: 56 },
  attachBtn: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: 'rgba(8,12,34,0.92)', shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  input: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '600', maxHeight: 100, paddingHorizontal: 12, paddingTop: Platform.OS === 'ios' ? 10 : 0, textAlignVertical: 'center' },
  sendOuter: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
  sendRing: { position: 'absolute', width: 54, height: 54, borderRadius: 27 },
  sendBtn: { },
  sendGrad: { width: 54, height: 54, borderRadius: 27, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', elevation: 10, shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 5 } },

  blockedMsgContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 8, width: '100%' },
  blockedMsgText: { color: '#D3DBF5', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },

  // 🆕 BLOCK & REPORT MODAL STYLES (Expert / User detail screens-la irukkura same)
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#0A0F22', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40, borderWidth: 1.3, borderBottomWidth: 0 },
  modalIconRing: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  modalTitle: { color: '#EF4444', fontSize: 20, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
  modalSubText: { color: '#94A3B8', fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 },
  modalLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
  blockReasonBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1.2 },
  blockReasonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  cancelActionBtn: { marginTop: 15, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)' },
  cancelBtnText: { color: '#94A3B8', fontSize: 13, fontWeight: '900', letterSpacing: 1 },
});