import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { arrayRemove, collection, deleteDoc, doc, getDoc, increment, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, Image, ImageBackground, PanResponder, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

const { width, height } = Dimensions.get('window');

// 🖼️ PREMIUM IMAGE ASSET (replace with your own: require('../../assets/xxx.jpg') if you like)
const IMG_NET_BG = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=80';

// ✨ TWINKLING STAR FIELD POSITIONS
const STARS = [
  { top: 70, left: 28, size: 3 }, { top: 140, left: width * 0.82, size: 2 }, { top: 250, left: width * 0.5, size: 3 },
  { top: 360, left: 18, size: 2 }, { top: 470, left: width * 0.9, size: 3 }, { top: 560, left: width * 0.3, size: 2 },
  { top: 680, left: width * 0.7, size: 3 }, { top: 780, left: 40, size: 2 }, { top: 190, left: width * 0.14, size: 2 },
  { top: 610, left: width * 0.58, size: 2 },
];

// 🛡️ SAFE ALPHA HELPER: some tier colors are already 8-digit hex (e.g. '#f52b6092'),
// so adding another alpha creates an INVALID color (LinearGradient native crash). This always normalizes first.
const withAlpha = (hex: string, alpha: string = 'FF') => {
  const base = (hex || '#000000').length >= 7 ? hex.slice(0, 7) : hex;
  return base + alpha;
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

// 🆕 STAGGERED CARD ENTRANCE (each card pops in with its own delay + 3D tilt-in)
const FadeInItem = ({ index, children }: any) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 650, delay: Math.min(index, 8) * 90, easing: Easing.out(Easing.back(1.1)), useNativeDriver: true }).start();
  }, []);
  return (
    <Animated.View style={{
      opacity: v,
      transform: [
        { perspective: 900 },
        { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
        { rotateX: v.interpolate({ inputRange: [0, 1], outputRange: ['35deg', '0deg'] }) },
        { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
      ],
    }}>
      {children}
    </Animated.View>
  );
};

export default function FriendsList() {
  const [friends, setFriends] = useState<any[]>([]);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // 🔥 NEW STATE FOR TAB & BLOCKED LIST
  const [activeTab, setActiveTab] = useState<'friends' | 'blocked'>('friends');
  const [blockedProfiles, setBlockedProfiles] = useState<any[]>([]);
  const [actionId, setActionId] = useState<string | null>(null);

  // 🆕 TAB INDICATOR WIDTH (measured)
  const [tabInnerWidth, setTabInnerWidth] = useState(0);

  const user = auth.currentUser;
  const router = useRouter();

  // 🌀 ANIMATION ENGINE REFS
  const scrollY = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current; // 🔥 ORB ANIMATION

  // 🆕 NEW ANIMATION VALUES
  const mainLoop = useRef(new Animated.Value(0)).current;     // rotation loop (orbit rings)
  const pulseAnim = useRef(new Animated.Value(0)).current;    // pulse halos
  const scanAnim = useRef(new Animated.Value(0)).current;     // red scan line (blocked cards)
  const holoAnim = useRef(new Animated.Value(0)).current;     // holographic sweep (stats card)
  const tabAnim = useRef(new Animated.Value(0)).current;      // sliding tab indicator
  const headerEnter = useRef(new Animated.Value(0)).current;  // header entrance
  const tiltX = useRef(new Animated.Value(0)).current;        // stats card 3D tilt
  const tiltY = useRef(new Animated.Value(0)).current;

  // 🆕 STATS CARD DRAG-TO-TILT (3D)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4,
      onPanResponderMove: (_, g) => {
        tiltY.setValue(Math.max(-1, Math.min(1, g.dx / 120)));
        tiltX.setValue(Math.max(-1, Math.min(1, g.dy / 60)));
      },
      onPanResponderRelease: () => {
        Animated.spring(tiltX, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }).start();
        Animated.spring(tiltY, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(tiltX, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }).start();
        Animated.spring(tiltY, { toValue: 0, friction: 4, tension: 60, useNativeDriver: true }).start();
      },
    })
  ).current;

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

    // 🆕 ORBIT ROTATION LOOP
    Animated.loop(Animated.timing(mainLoop, { toValue: 1, duration: 4500, easing: Easing.linear, useNativeDriver: true })).start();

    // 🆕 PULSE HALO LOOP
    Animated.loop(Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ])).start();

    // 🆕 RED SCAN LINE LOOP
    Animated.loop(Animated.sequence([
      Animated.timing(scanAnim, { toValue: 1, duration: 2600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(scanAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();

    // 🆕 HOLO SWEEP LOOP
    Animated.loop(Animated.sequence([
      Animated.delay(1200),
      Animated.timing(holoAnim, { toValue: 1, duration: 2200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(holoAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
    ])).start();

    // 🆕 HEADER ENTRANCE
    Animated.timing(headerEnter, { toValue: 1, duration: 1000, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

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
  const userDiamonds = userData?.totalSpentDiamonds || 0;
  const userTier = calculateUserLevel(userDiamonds);

  // 🆕 SWITCH TAB WITH SLIDING INDICATOR
  const switchTab = (tab: 'friends' | 'blocked') => {
    setActiveTab(tab);
    Animated.spring(tabAnim, { toValue: tab === 'friends' ? 0 : 1, friction: 7, tension: 70, useNativeDriver: true }).start();
  };

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

  // 🆕 DERIVED ANIMATION VALUES
  const orbitRotate = mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const orbitRotateRev = mainLoop.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.6] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0] });
  const scanX = scanAnim.interpolate({ inputRange: [0, 1], outputRange: [-120, width] });
  const holoX = holoAnim.interpolate({ inputRange: [0, 1], outputRange: [-width, width] });
  const tabW = tabInnerWidth > 0 ? tabInnerWidth / 2 : 0;
  const tabX = tabAnim.interpolate({ inputRange: [0, 1], outputRange: [0, tabW] });
  const statsTilt = {
    transform: [
      { perspective: 1000 },
      { rotateX: tiltX.interpolate({ inputRange: [-1, 1], outputRange: ['12deg', '-12deg'] }) },
      { rotateY: tiltY.interpolate({ inputRange: [-1, 1], outputRange: ['-18deg', '18deg'] }) },
    ],
  };
  const headerReveal = {
    opacity: headerEnter,
    transform: [{ translateY: headerEnter.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
  };

  // 🔥 ALTERNATING BORDER STYLES (FLUID, 2px)
  const borderType1 = {
      borderLeftWidth: 2,
      borderRightWidth: 2,
      borderTopWidth: 0.5,
      borderBottomWidth: 0.5,
      borderLeftColor: userTier.color,
      borderRightColor: userTier.color,
      borderTopColor: withAlpha(userTier.secondaryColor, '80'),
      borderBottomColor: withAlpha(userTier.secondaryColor, '80'),
      backgroundColor: 'rgba(10, 10, 10, 0.65)',
  };

  const borderType2 = {
      borderLeftWidth: 2,
      borderRightWidth: 2,
      borderTopWidth: 0.5,
      borderBottomWidth: 0.5,
      borderLeftColor: userTier.secondaryColor,
      borderRightColor: userTier.secondaryColor,
      borderTopColor: withAlpha(userTier.color, '80'),
      borderBottomColor: withAlpha(userTier.color, '80'),
      backgroundColor: 'rgba(10, 10, 10, 0.8)',
  };

  if (loading) {
    return (
      <View style={styles.darkLoader}>
        <View style={styles.loaderOrbit}>
          <Animated.View style={[styles.loaderRing, { borderColor: userTier.color, transform: [{ rotate: orbitRotate }] }]} />
          <Animated.View style={[styles.loaderRingInner, { borderColor: withAlpha(userTier.secondaryColor, 'CC'), transform: [{ rotate: orbitRotateRev }] }]} />
          <ActivityIndicator size="large" color={userTier.color} />
        </View>
        <Text style={[styles.loaderText, { color: userTier.color }]}>Syncing Network Nodes...</Text>
      </View>
    );
  }

  // 🆕 REUSABLE EMPTY STATE (floating icon + orbit rings)
  const renderEmpty = (iconName: any, iconColor: string, title: string, desc: string, isFriends: boolean) => (
    <View style={styles.emptyContainer}>
      <Animated.View style={[styles.emptyOrb, { transform: [{ translateY: floatAnim }] }]}>
        <Animated.View style={[styles.emptyRing, { borderColor: withAlpha(iconColor, 'AA'), transform: [{ rotate: orbitRotate }] }]} />
        <Animated.View style={[styles.emptyRingInner, { borderColor: withAlpha(iconColor, '66'), transform: [{ rotate: orbitRotateRev }] }]} />
        <Animated.View style={[styles.emptyPulse, { backgroundColor: withAlpha(iconColor, '40'), opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
        <MaterialCommunityIcons name={iconName} size={64} color={iconColor} style={{ opacity: 0.9 }} />
      </Animated.View>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyDesc}>{desc}</Text>
    </View>
  );

  return (
    <View style={styles.mainContainer}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* 🔥 DYNAMIC ANIMATED DESIGN BACKGROUND */}
      <LinearGradient colors={userTier.themeBg as any} style={StyleSheet.absoluteFill} />

      {/* 🆕 TWINKLING STAR FIELD */}
      {STARS.map((st, i) => (
        <Animated.View
          key={`star-${i}`}
          pointerEvents="none"
          style={{
            position: 'absolute', top: st.top, left: st.left, width: st.size, height: st.size, borderRadius: st.size,
            backgroundColor: '#FFF',
            opacity: shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: i % 2 === 0 ? [0.1, 0.9] : [0.9, 0.1] }),
          }}
        />
      ))}
      
      {/* 🔥 FLOATING SHIMMER ORBS */}
      <Animated.View style={[styles.shimmerOrb, { top: 80, left: -60, backgroundColor: userTier.color, transform: [{ translateY: orbTranslateY }] }]} />
      <Animated.View style={[styles.shimmerOrb, { bottom: 150, right: -60, backgroundColor: userTier.color, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

      {/* 🌌 Animated Parallax Auras */}
      <Animated.View style={[styles.aura, { top: -50, left: -100, backgroundColor: userTier.color, opacity: 0.15, transform: [{ translateY: parallaxHeader }] }]} />
      <Animated.View style={[styles.aura, { bottom: 50, right: -100, backgroundColor: userTier.secondaryColor, opacity: 0.1, transform: [{ translateY: parallaxHeader }] }]} />

      <SafeAreaView style={styles.headerArea} edges={['top']}>
        <Animated.View style={[styles.header, headerReveal]}>
          <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { borderColor: withAlpha(userTier.color, '40') }]}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>SECURE NETWORK</Text>
            <Text style={[styles.headerSubTitle, { color: userTier.color }]}>Connection Manager</Text>
          </View>
          {/* 🆕 LEVEL BADGE WITH ORBIT RING */}
          <View style={styles.levelOrbitWrap}>
            <Animated.View style={[styles.levelOrbitRing, { borderColor: userTier.color, transform: [{ rotate: orbitRotate }] }]} />
            <View style={[styles.levelOrbitCore, { borderColor: userTier.color }]}>
              <Text style={[styles.levelOrbitText, { color: userTier.color }]}>L{userTier.lvl}</Text>
            </View>
          </View>
        </Animated.View>

        {/* 🆕 3D TILT NETWORK STATUS CARD (drag it!) */}
        <Animated.View style={[styles.statsArea, headerReveal]}>
          <Animated.View style={statsTilt} {...panResponder.panHandlers}>
            <View style={[styles.statsGlow, { shadowColor: userTier.color }]}>
              <View style={[styles.statsCard, borderType1]}>
                <ImageBackground source={{ uri: IMG_NET_BG }} style={StyleSheet.absoluteFill} imageStyle={{ opacity: 0.35 }} />
                <LinearGradient
                  colors={['rgba(0,0,0,0.55)', withAlpha(userTier.color, '30'), 'rgba(0,0,0,0.7)']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Animated.View pointerEvents="none" style={[styles.holoStripe, { transform: [{ translateX: holoX }, { rotate: '25deg' }] }]} />
                <View style={styles.statsRow}>
                  <View style={styles.statsLeft}>
                    <View style={styles.shieldOrb}>
                      <Animated.View style={[styles.shieldPulse, { backgroundColor: withAlpha(userTier.color, '55'), opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                      <MaterialCommunityIcons name="shield-star" size={26} color={userTier.color} />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.statsLabel}>NETWORK STATUS</Text>
                      <Text style={[styles.statsRank, { color: userTier.color }]} numberOfLines={1}>{userTier.label}</Text>
                    </View>
                  </View>
                  <View style={styles.statsRight}>
                    <View style={styles.statBlock}>
                      <Text style={styles.statNum}>{friends.length}</Text>
                      <Text style={styles.statCap}>LINKS</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statBlock}>
                      <Text style={[styles.statNum, { color: '#FB7185' }]}>{blockedProfiles.length}</Text>
                      <Text style={styles.statCap}>BLOCKED</Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </Animated.View>
        </Animated.View>

        {/* 🔥 NEW TAB SWITCHER 🔥 (now with sliding gradient indicator) */}
        <Animated.View style={[styles.tabContainer, headerReveal]}>
          <View style={styles.tabInner} onLayout={(e) => setTabInnerWidth(e.nativeEvent.layout.width)}>
            {tabW > 0 && (
              <Animated.View style={[styles.tabIndicator, { width: tabW, transform: [{ translateX: tabX }] }]}>
                <LinearGradient
                  colors={[withAlpha(userTier.color, 'FF'), withAlpha(userTier.secondaryColor, 'FF')]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={styles.tabIndicatorGrad}
                />
              </Animated.View>
            )}
            <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.tabBtn} 
                onPress={() => switchTab('friends')}
            >
                <Text style={[styles.tabText, activeTab === 'friends' && { color: '#FFF' }]}>ACTIVE LINKS ({friends.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity 
                activeOpacity={0.8}
                style={styles.tabBtn} 
                onPress={() => switchTab('blocked')}
            >
                <Text style={[styles.tabText, activeTab === 'blocked' && { color: '#FFF' }]}>RESTRICTED ({blockedProfiles.length})</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

      </SafeAreaView>

      {/* 🔥 DYNAMIC CONTENT RENDER BASED ON TAB 🔥 */}
      {activeTab === 'friends' ? (
          friends.length === 0 ? (
            renderEmpty('earth-off', userTier.color, 'Empty Network', 'Connect with hosts to expand your secure communication network.', true)
          ) : (
            <Animated.FlatList
              data={friends}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
              onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                 const cardBorderStyle = index % 2 === 0 ? borderType1 : borderType2;
                 const accent = index % 2 === 0 ? userTier.color : userTier.secondaryColor;
                 const accent2 = index % 2 === 0 ? userTier.secondaryColor : userTier.color;
                 return (
                  <FadeInItem index={index}>
                    <Animated.View style={{ transform: [{ translateY: floatAnim }, { perspective: 900 }, { rotateY: index % 2 === 0 ? '2deg' : '-2deg' }] }}>
                      <BlurView intensity={25} tint="dark" style={[styles.stealthCardBase, cardBorderStyle]}>

                        {/* 🆕 glowing accent strip */}
                        <LinearGradient
                          pointerEvents="none"
                          colors={[withAlpha(accent, 'FF'), withAlpha(accent2, '00')]}
                          start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                          style={styles.accentStrip}
                        />
                        
                        <TouchableOpacity 
                          activeOpacity={0.8}
                          style={styles.cardMain}
                          onPress={() => router.push(`/expert-detail?id=${item.receiverId}` as any)}
                        >
                          {/* 🆕 avatar with dual orbit rings */}
                          <View style={styles.avatarOrbitWrap}>
                            <Animated.View style={[styles.avatarOrbitRing, { borderColor: withAlpha(accent, 'CC'), transform: [{ rotate: index % 2 === 0 ? orbitRotate : orbitRotateRev }] }]} />
                            <View style={[styles.avatarGlow, { shadowColor: accent, borderColor: accent }]}>
                              <Image 
                                source={{ uri: item.realImage || `https://ui-avatars.com/api/?name=${item.realName}&background=1E293B&color=fff&bold=true` }} 
                                style={styles.friendImg} 
                              />
                            </View>
                            <View style={styles.onlineDotWrap}>
                              <Animated.View style={[styles.onlineDotHalo, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]} />
                              <View style={styles.onlineDot} />
                            </View>
                          </View>
                          <View style={styles.infoArea}>
                            <Text style={styles.friendName} numberOfLines={1}>{item.realName.toUpperCase()}</Text>
                            <View style={styles.statusBadge}>
                              <View style={[styles.pulseDot, { backgroundColor: '#10B981' }]} />
                              <Text style={styles.statusText}>ENCRYPTED LINK ACTIVE</Text>
                            </View>
                          </View>
                          <View style={[styles.chevronCircle, { borderColor: withAlpha(accent, '55') }]}>
                            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" />
                          </View>
                        </TouchableOpacity>

                        <View style={styles.actionRow}>
                          <TouchableOpacity 
                            style={[styles.actionBtn, { borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }]}
                            onPress={() => handleChatPress(item.receiverId, item.realName)}
                          >
                            <View style={[styles.actionIconBubble, { backgroundColor: withAlpha(userTier.color, '22') }]}>
                              <Ionicons name="chatbubble-ellipses" size={16} color={userTier.color} />
                            </View>
                            <Text style={[styles.btnLabel, { color: userTier.color }]}>MESSAGE</Text>
                          </TouchableOpacity>

                          <TouchableOpacity 
                            style={styles.actionBtn}
                            onPress={() => handleUnfollow(item.id, item.realName)}
                          >
                            <View style={[styles.actionIconBubble, { backgroundColor: 'rgba(251,113,133,0.15)' }]}>
                              <Ionicons name="link-outline" size={16} color="#FB7185" />
                            </View>
                            <Text style={[styles.btnLabel, { color: '#FB7185' }]}>TERMINATE</Text>
                          </TouchableOpacity>
                        </View>
                      </BlurView>
                    </Animated.View>
                  </FadeInItem>
                 );
              }}
            />
          )
      ) : (
          // 🔥 NEW: BLOCKED LIST UI 🔥
          blockedProfiles.length === 0 ? (
              renderEmpty('shield-check', userTier.secondaryColor, 'NO RESTRICTIONS', 'Your secure shield matrix is currently clear. No accounts are restricted.', false)
          ) : (
              <Animated.FlatList
                  data={blockedProfiles}
                  keyExtractor={(item) => item.id}
                  contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
                  onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
                  scrollEventThrottle={16}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item, index }) => {
                      const cardBorderStyle = index % 2 === 0 ? borderType2 : borderType1;
                      const ringColor = index % 2 === 0 ? userTier.secondaryColor : userTier.color;
                      return (
                        <FadeInItem index={index}>
                          <Animated.View style={{ transform: [{ translateY: floatAnim }, { perspective: 900 }, { rotateY: index % 2 === 0 ? '-2deg' : '2deg' }] }}>
                              <BlurView intensity={25} tint="dark" style={[styles.stealthCardBase, cardBorderStyle, { padding: 18, flexDirection: 'row', alignItems: 'center' }]}>

                                  {/* 🆕 red restricted tint + scan line */}
                                  <LinearGradient
                                    pointerEvents="none"
                                    colors={['rgba(239,68,68,0.10)', 'rgba(239,68,68,0)']}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={StyleSheet.absoluteFill}
                                  />
                                  <Animated.View pointerEvents="none" style={[styles.scanLine, { transform: [{ translateX: scanX }, { rotate: '12deg' }] }]} />
                                  
                                  <View style={styles.nodeLeft}>
                                      <View style={styles.blockedAvatarWrap}>
                                          <Animated.View style={[styles.blockedRing, { transform: [{ rotate: orbitRotateRev }] }]} />
                                          <View style={[styles.avatarGlow, { width: 50, height: 50, borderRadius: 25, shadowColor: ringColor, borderColor: ringColor }]}>
                                              <Image 
                                                  source={{ uri: item.profilePic || `https://ui-avatars.com/api/?name=${item.name || 'User'}&background=1E293B&color=fff&bold=true` }} 
                                                  style={[styles.friendImg, { opacity: 0.75 }]} 
                                              />
                                          </View>
                                          <View style={styles.lockBadge}>
                                              <Ionicons name="lock-closed" size={9} color="#FFF" />
                                          </View>
                                      </View>
                                      <View style={styles.infoArea}>
                                          <Text style={styles.friendName} numberOfLines={1}>{item.name?.toUpperCase()}</Text>
                                          <Text style={styles.nodeStatus}>STATUS: ISOLATED_NODE</Text>
                                      </View>
                                  </View>

                                  <TouchableOpacity 
                                      activeOpacity={0.85}
                                      style={[styles.unblockBtn, { borderColor: withAlpha(userTier.color, '60') }]}
                                      onPress={() => handleUnblock(item.id, item.name || "Host")}
                                      disabled={actionId !== null}
                                  >
                                      <LinearGradient
                                        colors={[withAlpha(userTier.color, '40'), withAlpha(userTier.secondaryColor, '25')]}
                                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                                        style={styles.unblockGrad}
                                      >
                                      {actionId === item.id ? (
                                          <ActivityIndicator size="small" color="#FFF" />
                                      ) : (
                                          <>
                                              <MaterialCommunityIcons name="shield-lock-open" size={14} color="#FFF" />
                                              <Text style={styles.unblockBtnText}>UNBLOCK</Text>
                                          </>
                                      )}
                                      </LinearGradient>
                                  </TouchableOpacity>

                              </BlurView>
                          </Animated.View>
                        </FadeInItem>
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
  loaderOrbit: { width: 110, height: 110, justifyContent: 'center', alignItems: 'center' },
  loaderRing: { position: 'absolute', width: 108, height: 108, borderRadius: 54, borderWidth: 1.5, borderStyle: 'dashed' },
  loaderRingInner: { position: 'absolute', width: 86, height: 86, borderRadius: 43, borderWidth: 1, borderStyle: 'dotted' },
  loaderText: { marginTop: 15, fontWeight: '900', letterSpacing: 2, fontSize: 10 },
  
  headerArea: { borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)', backgroundColor: 'rgba(2, 6, 23, 0.4)', paddingBottom: 15 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingBottom: 10, gap: 20 },
  backButton: { backgroundColor: 'rgba(255,255,255,0.03)', padding: 10, borderRadius: 15, borderWidth: 1 },
  headerTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 3 },
  headerSubTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1, marginTop: 4 },

  // 🆕 LEVEL ORBIT BADGE
  levelOrbitWrap: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center' },
  levelOrbitRing: { position: 'absolute', width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderStyle: 'dashed', opacity: 0.8 },
  levelOrbitCore: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  levelOrbitText: { fontSize: 11, fontWeight: '900' },

  // 🆕 3D STATS CARD
  statsArea: { paddingHorizontal: 20, marginTop: 4, marginBottom: 12 },
  statsGlow: { borderRadius: 28, shadowOpacity: 0.5, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 14 },
  statsCard: { height: 84, borderRadius: 28, overflow: 'hidden' },
  holoStripe: { position: 'absolute', width: 60, height: '240%', top: '-70%', backgroundColor: 'rgba(255,255,255,0.14)' },
  statsRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
  statsLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  shieldOrb: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  shieldPulse: { position: 'absolute', width: 44, height: 44, borderRadius: 22 },
  statsLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 8, fontWeight: '900', letterSpacing: 2 },
  statsRank: { fontSize: 13, fontWeight: '900', letterSpacing: 1, marginTop: 3 },
  statsRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statBlock: { alignItems: 'center' },
  statNum: { color: '#FFF', fontSize: 20, fontWeight: '900' },
  statCap: { color: 'rgba(255,255,255,0.5)', fontSize: 7, fontWeight: '900', letterSpacing: 1.5, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)' },
  
  // 🔥 NEW TAB CONTAINER STYLES 🔥
  tabContainer: { flexDirection: 'row', marginHorizontal: 20, marginTop: 5, backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 20, padding: 5, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  tabInner: { flex: 1, flexDirection: 'row' },
  tabIndicator: { position: 'absolute', top: 0, bottom: 0, left: 0 },
  tabIndicatorGrad: { flex: 1, borderRadius: 15 },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 15 },
  tabText: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  stealthCardBase: { borderRadius: 35, marginBottom: 20, overflow: 'hidden', elevation: 10 },
  accentStrip: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 5, zIndex: 20 },
  cardMain: { flexDirection: 'row', alignItems: 'center', padding: 20, zIndex: 10 },
  avatarOrbitWrap: { width: 80, height: 80, justifyContent: 'center', alignItems: 'center' },
  avatarOrbitRing: { position: 'absolute', width: 78, height: 78, borderRadius: 39, borderWidth: 1.5, borderStyle: 'dashed' },
  avatarGlow: { width: 64, height: 64, borderRadius: 32, borderWidth: 2, padding: 2, shadowOpacity: 0.6, shadowRadius: 10, elevation: 10, backgroundColor: '#000' },
  friendImg: { width: '100%', height: '100%', borderRadius: 30 },
  onlineDotWrap: { position: 'absolute', bottom: 6, right: 6, width: 16, height: 16, justifyContent: 'center', alignItems: 'center' },
  onlineDotHalo: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981' },
  onlineDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#10B981', borderWidth: 2, borderColor: '#020617' },
  infoArea: { marginLeft: 14, flex: 1 },
  friendName: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 6 },
  pulseDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: '#10B981', fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  chevronCircle: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  
  actionRow: { flexDirection: 'row', borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.05)', height: 60, backgroundColor: 'rgba(0,0,0,0.3)' },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  actionIconBubble: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
  btnLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  
  // 🔥 BLOCKED LIST SPECIFIC STYLES 🔥
  nodeLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  blockedAvatarWrap: { width: 62, height: 62, justifyContent: 'center', alignItems: 'center' },
  blockedRing: { position: 'absolute', width: 62, height: 62, borderRadius: 31, borderWidth: 1.5, borderStyle: 'dashed', borderColor: 'rgba(239,68,68,0.6)' },
  lockBadge: { position: 'absolute', bottom: 2, right: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#EF4444', borderWidth: 2, borderColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  scanLine: { position: 'absolute', top: -30, bottom: -30, width: 50, backgroundColor: 'rgba(239,68,68,0.10)' },
  nodeStatus: { color: '#EF4444', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 4 },
  unblockBtn: { borderRadius: 14, borderWidth: 1, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.03)' },
  unblockGrad: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 14 },
  unblockBtnText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyOrb: { width: 140, height: 140, justifyContent: 'center', alignItems: 'center' },
  emptyRing: { position: 'absolute', width: 138, height: 138, borderRadius: 69, borderWidth: 1.5, borderStyle: 'dashed' },
  emptyRingInner: { position: 'absolute', width: 112, height: 112, borderRadius: 56, borderWidth: 1, borderStyle: 'dotted' },
  emptyPulse: { position: 'absolute', width: 100, height: 100, borderRadius: 50 },
  emptyTitle: { color: '#FFF', fontSize: 22, fontWeight: '900', marginTop: 20, letterSpacing: 2 },
  emptyDesc: { color: '#475569', textAlign: 'center', marginTop: 12, fontWeight: '700', lineHeight: 20, fontSize: 12 }
});
