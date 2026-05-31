import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, collection, deleteDoc, doc, getDocs, increment, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore'; // 🔥 SATTI FIX: Added getDocs for Wipeout
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

const { width, height } = Dimensions.get('window');

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

export default function ChatScreen() {
  // 🔥 SATTI FIX: Mapped parameters to support both direct chat and profile chat routes 🔥
  const { chatId, receiverId, receiverName, userId, userName } = useLocalSearchParams();
  
  const actualReceiverId = (receiverId || userId) as string;
  const actualReceiverName = (receiverName || userName) as string;

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [receiverImage, setReceiverImage] = useState<string | null>(null);
  
  const [userData, setUserData] = useState<any>(null); // ✅ Current Logged-in User Data
  const [receiverData, setReceiverData] = useState<any>(null); // 🔥 SATTI FIX: Opponent User Data

  const user = auth.currentUser;
  const router = useRouter();

  // 🔥 SATTI FIX: Universal Chat Room Generator
  const activeChatId = (chatId as string) || (user?.uid && actualReceiverId ? [user.uid, actualReceiverId].sort().join('_') : '');

  // 🌀 ANIMATION ENGINE REFS
  const shimmerAnim = useRef(new Animated.Value(0)).current;

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

    const q = query(collection(db, "chats", activeChatId, "messages"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(
      q, 
      (snap) => {
        const msgs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMessages(msgs);
      },
      (error) => {
        if (error.code === 'permission-denied') console.log("Safe Ignore: Chat listener detached on logout.");
      }
    );

    return () => { unsubscribe(); unsubUser(); unsubReceiver(); };
  }, [activeChatId, user, actualReceiverId]);

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
                          // 1. Fetch and delete all messages in subcollection
                          const msgsSnap = await getDocs(collection(db, "chats", activeChatId, "messages"));
                          const deletePromises = msgsSnap.docs.map(msgDoc => deleteDoc(doc(db, "chats", activeChatId, "messages", msgDoc.id)));
                          await Promise.all(deletePromises);
                          
                          // 2. Delete main chat document
                          await deleteDoc(doc(db, "chats", activeChatId));
                          
                          // 3. Eject user back to previous screen
                          router.back();
                      } catch (error) {
                          Alert.alert("Error", "Could not clear the session.");
                      }
                  } 
              }
          ]
      );
  };

  const totalSpent = userData?.totalSpentDiamonds || 0;
  const userTier = calculateUserLevel(totalSpent);
  
  const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -30] });

  const borderType1 = {
      borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
      borderLeftColor: userTier.color, borderRightColor: userTier.color,
      borderTopColor: userTier.secondaryColor + '80', borderBottomColor: userTier.secondaryColor + '80',
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
  };

  // 🔥 SATTI FIX: MUTE CHAT IF ANYONE BLOCKS ANYONE 🔥
  const isBlockedByMe = Array.isArray(userData?.blockedUsers) && userData.blockedUsers.includes(actualReceiverId);
  const isBlockedByThem = Array.isArray(receiverData?.blockedUsers) && receiverData.blockedUsers.includes(user?.uid);
  const isChatBlocked = isBlockedByMe || isBlockedByThem;

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* 🔥 DYNAMIC ANIMATED DESIGN BACKGROUND */}
      <LinearGradient colors={userTier.themeBg as any} style={StyleSheet.absoluteFill} />
      
      {/* 🔥 FLOATING SHIMMER ORBS */}
      <Animated.View style={[styles.shimmerOrb, { top: 150, right: -80, backgroundColor: userTier.secondaryColor, transform: [{ translateY: orbTranslateY }] }]} />
      <Animated.View style={[styles.shimmerOrb, { bottom: 100, left: -80, backgroundColor: userTier.color, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

      {/* --- MASS HEADER HUD --- */}
      <SafeAreaView edges={['top']} style={[styles.headerSafe, { borderColor: userTier.color + '40' }]}>
        <View style={styles.headerHud}>
           <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: userTier.secondaryColor + '50' }]}>
              <Ionicons name="chevron-back" size={24} color="#FFF" />
           </TouchableOpacity>
           
           <View style={styles.headerInfo}>
              <LinearGradient colors={[userTier.color, userTier.secondaryColor]} style={styles.headerAvatarRing}>
                  <Image 
                    source={{ uri: receiverImage || `https://ui-avatars.com/api/?name=${actualReceiverName || 'Host'}&background=1E293B&color=fff` }} 
                    style={styles.headerAvatar} 
                  />
              </LinearGradient>
              <View style={{marginLeft: 12}}>
                  <Text style={styles.headerName}>{actualReceiverName || "Host Node"}</Text>
                  <View style={styles.statusRow}>
                     <View style={[styles.pulseDot, { backgroundColor: isChatBlocked ? '#EF4444' : userTier.color }]} />
                     <Text style={[styles.statusText, { color: isChatBlocked ? '#EF4444' : userTier.color }]}>
                         {isChatBlocked ? "UPLINK SEVERED" : "ENCRYPTED LINK"}
                     </Text>
                  </View>
              </View>
           </View>

           {/* 🔥 SATTI FIX: Added Wipeout Trash Button to Header 🔥 */}
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
               <TouchableOpacity onPress={handleWipeoutChat} style={styles.headerAction}>
                  <Ionicons name="trash-outline" size={22} color="#EF4444" />
               </TouchableOpacity>
               <TouchableOpacity style={styles.headerAction}>
                  <MaterialCommunityIcons name={isChatBlocked ? "shield-off-outline" : "shield-lock-outline"} size={22} color={isChatBlocked ? "#EF4444" : userTier.color} />
               </TouchableOpacity>
           </View>
        </View>
      </SafeAreaView>

      {/* 🔥 THE FIX: WhatsApp Style Keyboard Behavior 🔥 */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={{ flex: 1 }}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          contentContainerStyle={styles.chatList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const isMine = item.senderId === user?.uid;
            return (
              <View style={[styles.msgWrapper, isMine ? { alignItems: 'flex-end' } : { alignItems: 'flex-start' }]}>
                {/* 🔥 UNIVERSAL DELETE: TouchableOpacity wraps BOTH bubbles now! 🔥 */}
                <TouchableOpacity 
                    activeOpacity={0.8} 
                    onLongPress={() => handleDeleteMessage(item.id)}
                >
                    {isMine ? (
                        <LinearGradient 
                          colors={[userTier.color, userTier.secondaryColor]} 
                          start={{x:0, y:0}} end={{x:1, y:1}} 
                          style={[styles.myBubble, { shadowColor: userTier.color }]}
                        >
                            <Text style={styles.msgText}>{item.text}</Text>
                        </LinearGradient>
                    ) : (
                        <BlurView intensity={25} tint="dark" style={[styles.theirBubble, { borderColor: userTier.secondaryColor + '60' }]}>
                            <Text style={styles.msgText}>{item.text}</Text>
                        </BlurView>
                    )}
                </TouchableOpacity>
                <Text style={styles.timeText}>
                    {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                </Text>
              </View>
            );
          }}
        />

        {/* --- FUTURISTIC INPUT / BLOCKED MSG --- */}
        <View style={styles.inputArea}>
            <BlurView intensity={80} tint="dark" style={[styles.inputBlur, borderType1, isChatBlocked && { justifyContent: 'center' }]}>
                {/* 🔥 SATTI FIX: Replace Input with Block Message if chat is restricted 🔥 */}
                {isChatBlocked ? (
                    <View style={styles.blockedMsgContainer}>
                        <MaterialCommunityIcons name="shield-off" size={16} color="#EF4444" />
                        <Text style={styles.blockedMsgText}>You cannot reply to this conversation.</Text>
                    </View>
                ) : (
                    <>
                        <TouchableOpacity style={styles.attachBtn}>
                           <Ionicons name="add" size={24} color={userTier.color} />
                        </TouchableOpacity>
                        
                        <TextInput
                          style={styles.input}
                          value={message}
                          onChangeText={setMessage}
                          placeholder="Type transmission..."
                          placeholderTextColor="#475569"
                          multiline
                        />

                        <TouchableOpacity 
                          onPress={sendMessage} 
                          disabled={!message.trim()}
                          style={[styles.sendBtn, !message.trim() && { opacity: 0.5 }]}
                        >
                          <LinearGradient 
                            colors={[userTier.color, userTier.secondaryColor]} 
                            start={{x:0, y:0}} end={{x:1, y:1}} 
                            style={styles.sendGrad}
                          >
                            <Ionicons name="send" size={18} color="#FFF" />
                          </LinearGradient>
                        </TouchableOpacity>
                    </>
                )}
            </BlurView>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#020617' },
  shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },

  headerSafe: { borderBottomWidth: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)' },
  headerHud: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, justifyContent: 'space-between' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 15, borderWidth: 1 },
  headerInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: 15 },
  headerAvatarRing: { padding: 2, borderRadius: 18 },
  headerAvatar: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#0F172A' },
  headerName: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  pulseDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6, elevation: 5, shadowOpacity: 0.5, shadowRadius: 5 },
  statusText: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  headerAction: { padding: 8 },

  chatList: { padding: 20, paddingBottom: 30 },
  msgWrapper: { marginBottom: 20, width: '100%' },
  myBubble: { 
    padding: 16, borderRadius: 24, borderBottomRightRadius: 6, 
    maxWidth: '85%', elevation: 15, shadowOpacity: 0.4, shadowRadius: 15
  },
  theirBubble: { 
    padding: 16, borderRadius: 24, borderBottomLeftRadius: 6, 
    maxWidth: '85%', backgroundColor: 'rgba(5, 5, 5, 0.65)', borderWidth: 1
  },
  msgText: { color: '#FFF', fontSize: 15, fontWeight: '600', lineHeight: 22 },
  timeText: { color: '#64748b', fontSize: 10, fontWeight: '800', marginTop: 6, letterSpacing: 0.5 },

  inputArea: { paddingHorizontal: 20, paddingBottom: Platform.OS === 'ios' ? 20 : 30, paddingTop: 10 },
  inputBlur: { flexDirection: 'row', alignItems: 'center', borderRadius: 35, padding: 8, overflow: 'hidden', minHeight: 65 },
  attachBtn: { padding: 10, marginLeft: 5 },
  input: { flex: 1, color: '#FFF', fontSize: 15, fontWeight: '600', maxHeight: 100, paddingHorizontal: 12, paddingTop: Platform.OS === 'ios' ? 10 : 0 },
  sendBtn: { marginLeft: 10 },
  sendGrad: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', elevation: 8 },

  // 🔥 SATTI FIX: BLOCKED MSG STYLES 🔥
  blockedMsgContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, gap: 8, width: '100%' },
  blockedMsgText: { color: '#94A3B8', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
});