import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
// 🔥 Added deleteDoc to the imports
import { collection, deleteDoc, doc, getDoc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

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

export default function MessageList() {
  const [chatThreads, setChatThreads] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const router = useRouter();

  // 🌀 ANIMATION ENGINE REFS
  const scrollY = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current; // 🔥 ORB ANIMATION

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -6, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();

    // 🔥 Start Ambient Shimmer (SMOOTH FLOATING SEQUENCE)
    Animated.loop(
        Animated.sequence([
            Animated.timing(shimmerAnim, {
              toValue: 1,
              duration: 4000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true
            }),
            Animated.timing(shimmerAnim, {
              toValue: 0,
              duration: 4000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true
            })
        ])
    ).start();

    if (!user) return;

    // Fetch User Data for Universal Theme Sync
    const userRef = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) setUserData(snap.data());
    });

    const q = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid),
      orderBy("lastMessageTime", "desc")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const threads = await Promise.all(
        snapshot.docs.map(async (chatDoc) => {
          const data = chatDoc.data();
          const expertId = data.participants.find((id: string) => id !== user.uid);

          const expertRef = doc(db, "users", expertId);
          const expertSnap = await getDoc(expertRef);
          const expertData = expertSnap.exists() ? expertSnap.data() : {};

          const myUnreadCount = data.unreadCount ? data.unreadCount[user.uid] || 0 : 0;

          return {
            id: chatDoc.id,
            ...data,
            expertName: expertData.displayName || expertData.name || "Host Node",
            expertImage: expertData.profilePic || expertData.photoURL || null,
            receiverId: expertId,
            unread: myUnreadCount
          };
        })
      );
      setChatThreads(threads);
      setLoading(false);
    });

    return () => { unsubscribe(); unsubUser(); };
  }, [user]);

  const totalSpent = userData?.totalSpentDiamonds || 0;
  const userTier = calculateUserLevel(totalSpent);

  const handleChatPress = (chatId: string, expertId: string, name: string) => {
    router.push({
      pathname: '/chat/ChatScreen' as any,
      params: { chatId, receiverId: expertId, receiverName: name }
    });
  };

  // 🔥 DELETE CHAT THREAD LOGIC 🔥
  const handleDeleteChat = (chatId: string) => {
      Alert.alert(
          "Clear Thread",
          "Are you sure you want to permanently delete this communication thread?",
          [
              { text: "Cancel", style: "cancel" },
              { 
                  text: "Delete", 
                  style: "destructive", 
                  onPress: async () => {
                      try {
                          await deleteDoc(doc(db, "chats", chatId));
                      } catch (error) {
                          Alert.alert("Error", "Could not delete the thread.");
                      }
                  } 
              }
          ]
      );
  };

  const parallaxHeader = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0, -40], extrapolate: 'clamp' });
  const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });

  // 🔥 ALTERNATING BORDER STYLES (FLUID, 2px)
  const borderType1 = {
      borderLeftWidth: 2,
      borderRightWidth: 2,
      borderTopWidth: 0.5,
      borderBottomWidth: 0.5,
      borderLeftColor: userTier.color,
      borderRightColor: userTier.color,
      borderTopColor: userTier.secondaryColor + '80',
      borderBottomColor: userTier.secondaryColor + '80',
      backgroundColor: 'rgba(10, 10, 10, 0.65)',
  };

  const borderType2 = {
      borderLeftWidth: 2,
      borderRightWidth: 2,
      borderTopWidth: 0.5,
      borderBottomWidth: 0.5,
      borderLeftColor: userTier.secondaryColor,
      borderRightColor: userTier.secondaryColor,
      borderTopColor: userTier.color + '80',
      borderBottomColor: userTier.color + '80',
      backgroundColor: 'rgba(10, 10, 10, 0.8)',
  };

  if (loading) {
    return (
      <View style={styles.darkLoader}>
        <ActivityIndicator size="large" color={userTier.color} />
        <Text style={[styles.loaderText, { color: userTier.color }]}>Decrypting Secure Channels...</Text>
      </View>
    );
  }

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* 🔥 DYNAMIC ANIMATED DESIGN BACKGROUND */}
      <LinearGradient colors={userTier.themeBg as any} style={StyleSheet.absoluteFill} />
      
      {/* 🔥 FLOATING SHIMMER ORBS */}
      <Animated.View style={[styles.shimmerOrb, { top: 80, left: -60, backgroundColor: userTier.color, transform: [{ translateY: orbTranslateY }] }]} />
      <Animated.View style={[styles.shimmerOrb, { bottom: 150, right: -60, backgroundColor: userTier.secondaryColor, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

      {/* 🌌 Animated Parallax Auras with Theme Sync */}
      <Animated.View style={[styles.aura, { top: -60, left: -100, backgroundColor: userTier.color, opacity: 0.15, transform: [{ translateY: parallaxHeader }] }]} />
      <Animated.View style={[styles.aura, { bottom: 100, right: -100, backgroundColor: userTier.secondaryColor, opacity: 0.1, transform: [{ translateY: parallaxHeader }] }]} />

      <SafeAreaView style={styles.safeHeader} edges={['top']}>
        <View style={styles.header}>
          <View>
            <Text style={[styles.welcomeLabel, { color: userTier.color }]}>SECURE CHANNEL</Text>
            <Text style={styles.headerTitle}>MESSAGES</Text>
          </View>
          <TouchableOpacity style={[styles.headerIcon, { borderColor: userTier.color + '40' }]}>
            <MaterialCommunityIcons name="comment-search-outline" size={24} color={userTier.color} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {chatThreads.length === 0 ? (
        <View style={styles.center}>
          <View style={[styles.emptyIconCircle, { borderColor: userTier.color + '30' }]}>
             <Ionicons name="chatbubbles-outline" size={60} color={userTier.color} />
          </View>
          <Text style={styles.emptyTitle}>NO TRANSMISSIONS</Text>
          <Text style={styles.emptyText}>Start a secure conversation with a host to see threads here.</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={chatThreads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          showsVerticalScrollIndicator={false}
          renderItem={({ item, index }) => {
             // 🔥 Alternating Border Logic for Chat Cards
             const cardBorderStyle = index % 2 === 0 ? borderType1 : borderType2;

             return (
              <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                <BlurView intensity={12} tint="dark" style={[styles.stealthCardBase, cardBorderStyle]}>
                  
                  {/* 🔥 ADDED ONLONGPRESS TO THE CHAT CARD FOR DELETE 🔥 */}
                  <TouchableOpacity 
                    activeOpacity={0.8}
                    style={styles.chatCard}
                    onPress={() => handleChatPress(item.id, item.receiverId, item.expertName)}
                    onLongPress={() => handleDeleteChat(item.id)}
                  >
                    <View style={styles.avatarNode}>
                      <View style={[styles.avatarGlow, { shadowColor: index % 2 === 0 ? userTier.color : userTier.secondaryColor, borderColor: index % 2 === 0 ? userTier.color : userTier.secondaryColor }]}>
                        <Image 
                          source={{ uri: item.expertImage || `https://ui-avatars.com/api/?name=${item.expertName}&background=1E293B&color=fff&bold=true` }} 
                          style={styles.avatar} 
                        />
                      </View>
                      {item.unread > 0 && (
                        <View style={[styles.badgeContainer, { backgroundColor: userTier.color, shadowColor: userTier.color }]}>
                          <Text style={styles.badgeText}>{item.unread > 9 ? '9+' : item.unread}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.chatInfo}>
                      <View style={styles.chatHeaderRow}>
                        <Text style={styles.nameText}>{item.expertName.toUpperCase()}</Text>
                        <Text style={styles.timeText}>
                          {item.lastMessageTime?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                      <View style={styles.msgPreviewRow}>
                        <Text style={[styles.lastMsgText, item.unread > 0 && styles.unreadMsgText]} numberOfLines={1}>
                          {item.lastMessageText || "Encrypted Packet Received"}
                        </Text>
                        {item.unread > 0 && <View style={[styles.newIndicator, { backgroundColor: userTier.color }]} />}
                      </View>
                    </View>
                    
                    <View style={styles.chevronBox}>
                        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.2)" />
                    </View>
                  </TouchableOpacity>
                </BlurView>
              </Animated.View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#020617' },
  // 🔥 DESIGN: AMBIENT SHIMMER ORBS
  shimmerOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.15, filter: 'blur(100px)' },
  aura: { position: 'absolute', width: 450, height: 450, borderRadius: 225, filter: 'blur(110px)' },
  darkLoader: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 15, fontWeight: '900', letterSpacing: 2, fontSize: 10 },
  
  safeHeader: { borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(15, 23, 42, 0.8)' },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  welcomeLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 3 },
  headerTitle: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: -1 },
  headerIcon: { backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: 10, borderRadius: 12, borderWidth: 1 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1 },
  emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  emptyText: { color: '#475569', textAlign: 'center', fontSize: 13, marginTop: 10, fontWeight: '600', lineHeight: 20 },

  // ZERO BOX STEALTH CARD DESIGN (SYNCED)
  stealthCardBase: { borderRadius: 35, marginBottom: 15, overflow: 'hidden', backgroundColor: 'rgba(5,5,5,0.6)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  chatCard: { flexDirection: 'row', alignItems: 'center', padding: 18, zIndex: 10 },
  avatarNode: { position: 'relative' },
  avatarGlow: { padding: 2, borderRadius: 18, borderWidth: 2, elevation: 12, backgroundColor: '#000' },
  avatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#0F172A' },
  
  badgeContainer: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
    borderColor: '#020617',
    elevation: 10,
    shadowOpacity: 0.6,
    shadowRadius: 8
  },
  badgeText: { color: '#FFF', fontSize: 9, fontWeight: '900' },

  chatInfo: { flex: 1, marginLeft: 16 },
  chatHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  nameText: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 0.5 },
  timeText: { color: '#475569', fontSize: 10, fontWeight: '800' },
  
  msgPreviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMsgText: { color: '#64748b', fontSize: 12, fontWeight: '600', flex: 1 },
  unreadMsgText: { color: '#cbd5e1', fontWeight: '800' },
  newIndicator: { width: 7, height: 7, borderRadius: 3.5, marginLeft: 10 },

  chevronBox: { marginLeft: 8, opacity: 0.3 }
});