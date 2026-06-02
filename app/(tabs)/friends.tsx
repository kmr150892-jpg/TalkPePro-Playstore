import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { arrayRemove, collection, deleteDoc, doc, getDoc, increment, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

const { width, height } = Dimensions.get('window');

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT THEME SYNC FROM MEMORY V2)
const calculateUserLevel = (totalSpent: number) => {
  if (totalSpent >= 500000001) return { 
      lvl: 8, label: 'TITAN OVERSEER', status: 'GOD PROTOCOL ACTIVE', color: '#FF0033', secondaryColor: '#660000', anim: 'titan', themeBg: ['#1A0000', '#000000']
  }; 
  if (totalSpent >= 100000001) return { 
      lvl: 7, label: 'MYTHIC RULER', status: 'ASCENDED BEING', color: '#D946EF', secondaryColor: '#c8040b', anim: 'mythic', themeBg: ['#15001A', '#000000']
  }; 
  if (totalSpent >= 50000000) return { 
      lvl: 6, label: 'GRANDMASTER', status: 'ELITE COMMANDER', color: '#9c77f3', secondaryColor: '#d31515', anim: 'grandmaster', themeBg: ['#08001A', '#000000']
  };
  if (totalSpent >= 10000000) return { 
      lvl: 5, label: 'ELITE VETERAN', status: 'TACTICAL EXPERT', color: '#00F2FE', secondaryColor: '#970d50d4', anim: 'explosion', themeBg: ['#00101A', '#000000']
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

export default function FriendsList() {
  const [friends, setFriends] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 🔥 NEW STATE FOR TAB & BLOCKED LIST
  const [activeTab, setActiveTab] = useState<'friends' | 'blocked'>('friends');
  const [blockedProfiles, setBlockedProfiles] = useState<any[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);

  const user = auth.currentUser;
  const router = useRouter();

  // 🌀 ANIMATION ENGINE REFS
  const scrollY = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current; // 🔥 ORB ANIMATION

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -5, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(floatAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
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

    // Fetch User Data for Theme Sync & Blocked Users Array
    const userRef = doc(db, "users", user.uid);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) setUserData(snap.data());
    });

    const q = query(
      collection(db, "connections"),
      where("senderId", "==", user.uid),
      where("status", "==", "friend")
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const friendsData = await Promise.all(
        snapshot.docs.map(async (connectionDoc) => {
          const data = connectionDoc.data();
          const expertId = data.receiverId;
          const expertRef = doc(db, "users", expertId);
          const expertSnap = await getDoc(expertRef);

          let expertInfo = {
            name: data.receiverName || "Host",
            image: data.receiverImage || null
          };

          if (expertSnap.exists()) {
            const expertData = expertSnap.data();
            expertInfo.name = expertData.displayName || expertData.name || expertInfo.name;
            expertInfo.image = expertData.profilePic || expertData.photoURL || expertInfo.image;
          }

          return {
            id: connectionDoc.id,
            ...data,
            realName: expertInfo.name,
            realImage: expertInfo.image
          };
        })
      );
      setFriends(friendsData);
      setLoading(false);
    });

    return () => { unsubscribe(); unsubUser(); };
  }, [user]);

  // 🔥 NEW EFFECT TO FETCH BLOCKED PROFILES PROPERLY
  useEffect(() => {
    if (!userData?.blockedUsers || userData.blockedUsers.length === 0) {
        setBlockedProfiles([]);
        return;
    }
    const fetchBlocked = async () => {
        try {
            const profiles = await Promise.all(
                userData.blockedUsers.map(async (id: string) => {
                    const docRef = doc(db, "users", id);
                    const docSnap = await getDoc(docRef);
                    if (docSnap.exists()) {
                        return { id: docSnap.id, ...docSnap.data() };
                    }
                    return { id, name: "Unknown Network Node", profilePic: null };
                })
            );
            setBlockedProfiles(profiles);
        } catch (e) {
            console.error("Blocked fetch error:", e);
        }
    };
    fetchBlocked();
  }, [userData?.blockedUsers]);


  // 🔥 SATTI FIX: Synced Highest Balance check for accurate Level display!
  const userDiamonds = Math.max(
      userData?.totalDiamonds || 0,
      userData?.walletBalance || 0,
      userData?.balance || 0
  );
  const userTier = calculateUserLevel(userDiamonds);

  const handleChatPress = (expertId: string, expertName: string) => {
    if (!user) return;
    const chatId = user.uid < expertId ? `${user.uid}_${expertId}` : `${expertId}_${user.uid}`;
    router.push({
      pathname: '/chat/ChatScreen' as any,
      params: { chatId, receiverId: expertId, receiverName: expertName }
    });
  };

  const handleUnfollow = (connectionId: string, name: string) => {
    Alert.alert(
      "Terminate Link",
      `Are you sure you want to disconnect your network link with ${name}?`,
      [
        { text: "CANCEL", style: "cancel" },
        { 
          text: "CONFIRM", 
          style: "destructive", 
          onPress: async () => {
            try {
              const userRef = doc(db, "users", user!.uid);
              const userSnap = await getDoc(userRef);
              const currentCount = userSnap.data()?.friendsCount || 0;

              await deleteDoc(doc(db, "connections", connectionId));
              
              if (currentCount > 0) {
                await updateDoc(userRef, { friendsCount: increment(-1) });
              }
            } catch (error) {
              Alert.alert("System Error", "Unable to update network node.");
            }
          } 
        }
      ]
    );
  };

  // 🔥 NEW UNBLOCK FUNCTION 🔥
  const handleUnblock = async (targetId: string, targetName: string) => {
    if (!user) return;
    Alert.alert(
        "RESTORE SECURITY ACCESS",
        `Are you sure you want to unblock and restore communication links with ${targetName}?`,
        [
            { text: "CANCEL", style: "cancel" },
            {
                text: "CONFIRM UNBLOCK",
                onPress: async () => {
                    setActionId(targetId);
                    try {
                        const myRef = doc(db, "users", user.uid);
                        await updateDoc(myRef, {
                            blockedUsers: arrayRemove(targetId)
                        });
                        Alert.alert("LINK RESTORED", `${targetName} has been successfully unblocked.`);
                    } catch (error) {
                        Alert.alert("CRITICAL ERROR", "Unable to alter database arrays.");
                    } finally {
                        setActionId(null);
                    }
                }
            }
        ]
    );
  };

  const parallaxHeader = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0, -30], extrapolate: 'clamp' });
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
        <Text style={[styles.loaderText, { color: userTier.color }]}>Syncing Network Nodes...</Text>
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
      <Animated.View style={[styles.shimmerOrb, { bottom: 150, right: -60, backgroundColor: userTier.color, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

      {/* 🌌 Animated Parallax Auras */}
      <Animated.View style={[styles.aura, { top: -50, left: -100, backgroundColor: userTier.color, opacity: 0.15, transform: [{ translateY: parallaxHeader }] }]} />
      <Animated.View style={[styles.aura, { bottom: 50, right: -100, backgroundColor: userTier.secondaryColor, opacity: 0.1, transform: [{ translateY: parallaxHeader }] }]} />

      <SafeAreaView style={styles.headerArea} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { borderColor: userTier.color + '40' }]}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>SECURE NETWORK</Text>
            <Text style={[styles.headerSubTitle, { color: userTier.color }]}>Connection Manager</Text>
          </View>
        </View>

        {/* 🔥 NEW TAB SWITCHER 🔥 */}
        <View style={styles.tabContainer}>
            <TouchableOpacity 
                activeOpacity={0.8}
                style={[styles.tabBtn, activeTab === 'friends' && { backgroundColor: userTier.color }]} 
                onPress={() => setActiveTab('friends')}
            >
                <Text style={[styles.tabText, activeTab === 'friends' && { color: '#FFF' }]}>ACTIVE LINKS ({friends.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                activeOpacity={0.8}
                style={[styles.tabBtn, activeTab === 'blocked' && { backgroundColor: userTier.secondaryColor }]} 
                onPress={() => setActiveTab('blocked')}
            >
                <Text style={[styles.tabText, activeTab === 'blocked' && { color: '#FFF' }]}>RESTRICTED ({blockedProfiles.length})</Text>
            </TouchableOpacity>
        </View>

      </SafeAreaView>

      {/* 🔥 DYNAMIC CONTENT RENDER BASED ON TAB 🔥 */}
      {activeTab === 'friends' ? (
          friends.length === 0 ? (
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons name="earth-off" size={80} color={userTier.color} style={{ opacity: 0.2 }} />
              <Text style={styles.emptyTitle}>Empty Network</Text>
              <Text style={styles.emptyDesc}>Connect with hosts to expand your secure communication network.</Text>
            </View>
          ) : (
            <Animated.FlatList
              data={friends}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                 const cardBorderStyle = index % 2 === 0 ? borderType1 : borderType2;
                 return (
                    <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                      <BlurView intensity={25} tint="dark" style={[styles.stealthCardBase, cardBorderStyle]}>
                        
                        <TouchableOpacity 
                          activeOpacity={0.8}
                          style={styles.cardMain}
                          onPress={() => router.push(`/expert-detail?id=${item.receiverId}` as any)}
                        >
                          <View style={[styles.avatarGlow, { shadowColor: index % 2 === 0 ? userTier.color : userTier.secondaryColor, borderColor: index % 2 === 0 ? userTier.color : userTier.secondaryColor }]}>
                            <Image 
                              source={{ uri: item.realImage || `https://ui-avatars.com/api/?name=${item.realName}&background=1E293B&color=fff&bold=true` }} 
                              style={styles.friendImg} 
                            />
                          </View>
                          <View style={styles.infoArea}>
                            <Text style={styles.friendName}>{item.realName.toUpperCase()}</Text>
                            <View style={styles.statusBadge}>
                              <View style={[styles.pulseDot, { backgroundColor: '#10B981' }]} />
                              <Text style={styles.statusText}>ENCRYPTED LINK ACTIVE</Text>
                            </View>
                          </View>
                          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.2)" />
                        </TouchableOpacity>

                        <View style={styles.actionRow}>
                          <TouchableOpacity 
                            style={[styles.actionBtn, { borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }]}
                            onPress={() => handleChatPress(item.receiverId, item.realName)}
                          >
                            <Ionicons name="chatbubble-ellipses" size={18} color={userTier.color} />
                            <Text style={[styles.btnLabel, { color: userTier.color }]}>MESSAGE</Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={styles.actionBtn}
                            onPress={() => handleUnfollow(item.id, item.realName)}
                          >
                            <Ionicons name="link-outline" size={18} color="#FB7185" />
                            <Text style={[styles.btnLabel, { color: '#FB7185' }]}>TERMINATE</Text>
                          </TouchableOpacity>
                        </View>
                      </BlurView>
                    </Animated.View>
                 );
              }}
            />
          )
      ) : (
          // 🔥 NEW: BLOCKED LIST UI 🔥
          blockedProfiles.length === 0 ? (
              <View style={styles.emptyContainer}>
                  <MaterialCommunityIcons name="shield-check" size={80} color={userTier.secondaryColor} style={{ opacity: 0.2 }} />
                  <Text style={styles.emptyTitle}>NO RESTRICTIONS</Text>
                  <Text style={styles.emptyDesc}>Your secure shield matrix is currently clear. No accounts are restricted.</Text>
              </View>
          ) : (
              <Animated.FlatList
                  data={blockedProfiles}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
                  onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item, index }) => {
                      const cardBorderStyle = index % 2 === 0 ? borderType2 : borderType1;
                      return (
                          <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                              <BlurView intensity={25} tint="dark" style={[styles.stealthCardBase, cardBorderStyle, { padding: 18, flexDirection: 'row', alignItems: 'center' }]}>
                                  
                                  <View style={styles.nodeLeft}>
                                      <View style={[styles.avatarGlow, { width: 50, height: 50, borderRadius: 25, shadowColor: index % 2 === 0 ? userTier.secondaryColor : userTier.color, borderColor: index % 2 === 0 ? userTier.secondaryColor : userTier.color }]}>
                                          <Image 
                                              source={{ uri: item.profilePic || `https://ui-avatars.com/api/?name=${item.name || 'User'}&background=1E293B&color=fff&bold=true` }} 
                                              style={styles.friendImg} 
                                          />
                                      </View>
                                      <View style={styles.infoArea}>
                                          <Text style={styles.friendName} numberOfLines={1}>{item.name?.toUpperCase()}</Text>
                                          <Text style={styles.nodeStatus}>STATUS: ISOLATED_NODE</Text>
                                      </View>
                                  </View>

                                  <TouchableOpacity 
                                      style={[styles.unblockBtn, { borderColor: userTier.color + '60' }]}
                                      onPress={() => handleUnblock(item.id, item.name || "Host")}
                                      disabled={actionId !== null}
                                  >
                                      {actionId === item.id ? (
                                          <ActivityIndicator size="small" color="#FFF" />
                                      ) : (
                                          <>
                                              <MaterialCommunityIcons name="shield-lock-open" size={14} color="#FFF" />
                                              <Text style={styles.unblockBtnText}>UNBLOCK</Text>
                                          </>
                                      )}
                                  </TouchableOpacity>

                              </BlurView>
                          </Animated.View>
                      )
                  }}
              />
          )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#020617' },
  shimmerOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.15, filter: 'blur(100px)' },
  aura: { position: 'absolute', width: 400, height: 400, borderRadius: 200, filter: 'blur(100px)' },
  darkLoader: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 15, fontWeight: '900', letterSpacing: 2, fontSize: 10 },
  
  headerArea: { borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(2, 6, 23, 0.4)', paddingBottom: 15 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 10, gap: 20 },
  backButton: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 15, borderWidth: 1 },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  headerSubTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 4 },
  
  // 🔥 NEW TAB CONTAINER STYLES 🔥
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginTop: 5, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 15 },
  tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  stealthCardBase: { borderRadius: 35, marginBottom: 20, overflow: 'hidden', elevation: 10 },
  cardMain: { flexDirection: 'row', alignItems: 'center', padding: 20, zIndex: 10 },
  avatarGlow: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, padding: 2, shadowOpacity: 0.6, shadowRadius: 10, elevation: 10, backgroundColor: '#000' },
  friendImg: { width: '100%', height: '100%', borderRadius: 30 },
  infoArea: { marginLeft: 18, flex: 1 },
  friendName: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  pulseDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: '#10B981', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  
  actionRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', height: 60, backgroundColor: 'rgba(0,0,0,0.3)' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  btnLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  
  // 🔥 BLOCKED LIST SPECIFIC STYLES 🔥
  nodeLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  nodeStatus: { color: '#EF4444', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  unblockBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.03)' },
  unblockBtnText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 20, letterSpacing: 2 },
  emptyDesc: { color: '#475569', textAlign: 'center', marginTop: 12, fontWeight: '700', lineHeight: 20, fontSize: 12 }
});