import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
// 🔥 Added deleteDoc to the imports
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

const { width } = Dimensions.get('window');

// 🆕 LAYOUT CONSTANTS (used for the 3D scroll effects)
const ROW_H = 134;         // chat row height
const ROW_GAP = 14;        // gap between rows
const ITEM_H = ROW_H + ROW_GAP;
const LIST_TOP = 72;       // where the first chat row starts inside the list (header area height)

// 🛡️ SAFE ALPHA HELPER: always normalizes to 6-digit hex before adding alpha (prevents invalid colors / gradient crashes)
const safeAlpha = (hex: string, alpha: string = 'FF') => {
  const base = (hex || '#000000').length >= 7 ? hex.slice(0, 7) : hex;
  return base + alpha;
};

// 🔥 HOST PROFILE HELPERS
// users doc-la `name` (host edit pannum latest name) & `displayName` (registration time-la set aana old name) rendum irukku.
// So `name` ku PRIORITY. (Host app `displayName` update panna, rendu idathilum `pickName`-la 'name' & 'displayName' order-a maathunga)
const pickName = (p: any) => p?.name || p?.displayName || null;
const pickImage = (p: any) => p?.profilePic || p?.photoURL || null;

// 🆕🆕 NEW: color helpers (royal metallic tones - always 6-digit safe)
const hexToRgb = (hex: string) => {
  const h = (hex || '').replace('#', '').slice(0, 6);
  if (h.length !== 6) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
};
const blend = (c1: string, c2: string, t: number) => {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  if (!a || !b) return (c1 || '#FFFFFF').slice(0, 7);
  const mix = (x: number, y: number) => Math.round(x * (1 - t) + y * t).toString(16).padStart(2, '0');
  return `#${mix(a.r, b.r)}${mix(a.g, b.g)}${mix(a.b, b.b)}`;
};
const lighten = (hex: string, t: number) => blend(hex, '#FFFFFF', t);

// 🆕🆕 NEW: letters smoothly blend colour 1 -> colour 2 (metallic title)
const GradientText = ({ text, colors, style }: { text: string; colors: string[]; style?: any }) => {
  const n = text.length;
  const pick = (i: number) => {
    if (colors.length === 1 || n <= 1) return colors[0];
    const pos = (i / (n - 1)) * (colors.length - 1);
    const idx = Math.min(colors.length - 2, Math.floor(pos));
    return blend(colors[idx], colors[idx + 1], pos - idx);
  };
  return (
    <Text style={style}>
      {text.split('').map((ch, i) => (
        <Text key={i} style={{ color: pick(i) }}>{ch}</Text>
      ))}
    </Text>
  );
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

// 🆕🆕 NEW: royal ornament divider  ──── ◆ ────
const Ornament = ({ c1, c2, size = 7, style }: any) => (
  <View style={[styles.ornRow, style]} pointerEvents="none">
    <LinearGradient colors={['transparent', safeAlpha(c1, 'CC')]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ornLine} />
    <MaterialCommunityIcons name="rhombus" size={size} color={c1} />
    <LinearGradient colors={[safeAlpha(c2, 'CC'), 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.ornLine} />
  </View>
);

// 🆕🆕 NEW: overlapping avatar stack in the header (latest hosts - photo + unread dot) - royal rings
const AvatarStack = ({ threads, userTier }: any) => {
  const list = threads.slice(0, 4);
  const extra = Math.max(0, threads.length - list.length);
  return (
    <View style={styles.stackRow}>
      {list.map((t: any, i: number) => {
        const uri = t.expertImage || `https://ui-avatars.com/api/?name=${t.expertName}&background=1E293B&color=fff&bold=true&size=256`;
        const accent = i % 2 === 0 ? userTier.color : userTier.secondaryColor;
        return (
          <View
            key={t.id}
            style={[styles.stackAv, { marginLeft: i === 0 ? 0 : -14, zIndex: 10 - i, borderColor: lighten(accent, 0.35), shadowColor: accent }]}
          >
            <Image source={{ uri }} style={styles.stackImg} />
            {t.unread > 0 && <View style={[styles.stackDot, { backgroundColor: userTier.color }]} />}
          </View>
        );
      })}
      {extra > 0 && (
        <View style={[styles.stackMore, { marginLeft: -14, borderColor: safeAlpha(userTier.color, '88') }]}>
          <Text style={styles.stackMoreText}>+{extra}</Text>
        </View>
      )}
    </View>
  );
};

// 🆕🆕 NEW: "ROYAL PORTRAIT" CHAT ROW
// - hairline gradient frame (no heavy borders), dark glass panel, faint photo watermark that melts in
// - left: tall portrait frame (double tier-tone frame, 3D sway, gloss), unread = rotating wax seal
// - right: name (letter-spaced), time in gold, ornament divider, italic message, chevron
// (own component so every row has its own entrance + press tilt + 3D scroll animation)
const ThreadCard = ({ item, index, count, userTier, floatAnim, shimmerAnim, scrollY, sweepX, spinRotate, spinRotateRev, borderStyle, onPress, onLongPress }: any) => {
  const enter = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(Math.min(index, 8) * 70),
      Animated.spring(enter, { toValue: 1, friction: 7, tension: 45, useNativeDriver: true }),
    ]).start();
  }, []);

  const accent = (index % 2 === 0 ? userTier.color : userTier.secondaryColor) as string;
  const accent2 = (index % 2 === 0 ? userTier.secondaryColor : userTier.color) as string;
  const gold = lighten(accent, 0.55);   // metallic highlight
  const itemTop = LIST_TOP + index * ITEM_H;

  // 3D scroll effect: row tilts back + shrinks + fades as it leaves the top
  const scrollScale = scrollY.interpolate({ inputRange: [itemTop - 40, itemTop + ITEM_H * 1.3], outputRange: [1, 0.88], extrapolate: 'clamp' });
  const scrollTilt = scrollY.interpolate({ inputRange: [itemTop - 40, itemTop + ITEM_H * 1.3], outputRange: ['0deg', '35deg'], extrapolate: 'clamp' });
  const scrollFade = scrollY.interpolate({ inputRange: [itemTop - 40, itemTop + ITEM_H * 1.3], outputRange: [1, 0.3], extrapolate: 'clamp' });
  // 🆕 watermark photo parallax
  const photoShift = scrollY.interpolate({ inputRange: [itemTop - ITEM_H * 5, itemTop + ITEM_H * 2], outputRange: [-16, 16], extrapolate: 'clamp' });

  const enterTilt = enter.interpolate({ inputRange: [0, 1], outputRange: ['35deg', '0deg'] });
  const enterY = enter.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
  const pressScale = press.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] });
  const pressTiltX = press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '8deg'] });
  const pressTiltY = press.interpolate({ inputRange: [0, 1], outputRange: ['0deg', index % 2 === 0 ? '-6deg' : '6deg'] });
  const badgePulse = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] });
  const twinkle = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] });
  // 🆕 portrait 3D sway (holographic feel)
  const portraitSway = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [index % 2 === 0 ? '-9deg' : '9deg', index % 2 === 0 ? '9deg' : '-9deg'] });

  const avatarUri = item.expertImage || `https://ui-avatars.com/api/?name=${item.expertName}&background=1E293B&color=fff&bold=true`;
  const timeStr = item.lastMessageTime?.toDate
    ? item.lastMessageTime.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
      <Animated.View
        style={{
          opacity: Animated.multiply(enter, scrollFade),
          transform: [
            { perspective: 900 },
            { translateY: enterY },
            { rotateX: enterTilt },
            { rotateX: scrollTilt },
            { scale: scrollScale },
            { scale: pressScale },
            { rotateX: pressTiltX },
            { rotateY: pressTiltY },
          ],
        }}
      >
        <View style={[styles.rowOuter, { shadowColor: accent }]}>
          {/* ✨ hairline gradient frame (royal edge) */}
          <LinearGradient
            colors={[safeAlpha(gold, 'DD'), safeAlpha(accent, '22'), safeAlpha(accent2, '99')]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.hairline}
          >
            <View style={styles.rowInner}>
              {/* faint host photo watermark (right), melts into the dark glass */}
              <Animated.Image
                source={{ uri: avatarUri }}
                blurRadius={3}
                style={[styles.ghostPhoto, { transform: [{ translateX: photoShift }, { scale: 1.12 }] }]}
              />
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(6,4,12,1)', 'rgba(6,4,12,0.92)', 'rgba(6,4,12,0.55)', 'rgba(6,4,12,0.9)']}
                locations={[0, 0.5, 0.8, 1]}
                start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
                style={StyleSheet.absoluteFill}
              />
              {/* dual-tone royal tint */}
              <LinearGradient
                pointerEvents="none"
                colors={[safeAlpha(borderStyle.borderLeftColor, '2A'), safeAlpha(accent, '00'), safeAlpha(accent2, '1A')]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              {/* glass sheen on top edge */}
              <LinearGradient
                pointerEvents="none"
                colors={['rgba(255,255,255,0.09)', 'rgba(255,255,255,0)']}
                style={styles.sheen}
              />
              {/* moving light sweep */}
              <Animated.View pointerEvents="none" style={[styles.sweep, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0)']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFill}
                />
              </Animated.View>
              {/* corner stars */}
              <Animated.View pointerEvents="none" style={[styles.cornerStar, { top: 8, right: 12, opacity: twinkle }]}>
                <MaterialCommunityIcons name="star-four-points" size={9} color={gold} />
              </Animated.View>
              <Animated.View pointerEvents="none" style={[styles.cornerStar, { bottom: 8, left: 10, opacity: twinkle }]}>
                <MaterialCommunityIcons name="star-four-points" size={8} color={lighten(accent2, 0.5)} />
              </Animated.View>

              {/* 🔥 ADDED ONLONGPRESS TO THE CHAT ROW FOR DELETE 🔥 */}
              <TouchableOpacity
                activeOpacity={0.88}
                style={styles.chatCard}
                onPress={onPress}
                onLongPress={onLongPress}
                onPressIn={() => Animated.spring(press, { toValue: 1, friction: 6, useNativeDriver: true }).start()}
                onPressOut={() => Animated.spring(press, { toValue: 0, friction: 4, useNativeDriver: true }).start()}
              >
                {/* 🖼 ROYAL PORTRAIT FRAME */}
                <View style={styles.portraitStage}>
                  <Animated.View style={{ transform: [{ perspective: 500 }, { rotateY: portraitSway }] }}>
                    <LinearGradient
                      colors={[gold, safeAlpha(accent, 'FF'), safeAlpha(accent2, 'FF')]}
                      start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                      style={[styles.portraitFrame, { shadowColor: accent }]}
                    >
                      <View style={styles.portraitInner}>
                        <Image source={{ uri: avatarUri }} style={styles.avatar} />
                        <LinearGradient
                          pointerEvents="none"
                          colors={['rgba(255,255,255,0.28)', 'rgba(255,255,255,0)']}
                          start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 0.6 }}
                          style={StyleSheet.absoluteFill}
                        />
                      </View>
                    </LinearGradient>
                    {/* crest rhombus on the bottom frame */}
                    <View style={[styles.crest, { backgroundColor: accent, borderColor: gold, shadowColor: accent }]} />
                  </Animated.View>

                  {/* 🔴 UNREAD = rotating royal wax seal */}
                  {item.unread > 0 && (
                    <Animated.View style={[styles.sealWrap, { transform: [{ scale: badgePulse }] }]}>
                      <Animated.View style={[styles.sealRing, { borderColor: safeAlpha(gold, 'CC'), transform: [{ rotate: index % 2 === 0 ? spinRotate : spinRotateRev }] }]} />
                      <LinearGradient
                        colors={[gold, safeAlpha(userTier.color, 'FF')]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={[styles.badgeContainer, { shadowColor: userTier.color }]}
                      >
                        <Text style={styles.badgeText}>{item.unread > 9 ? '9+' : item.unread}</Text>
                      </LinearGradient>
                    </Animated.View>
                  )}
                </View>

                {/* 💬 NAME + TIME + ORNAMENT + MESSAGE */}
                <View style={styles.rowInfo}>
                  <View style={styles.rowTop}>
                    <Text style={styles.nameText} numberOfLines={1}>{item.expertName.toUpperCase()}</Text>
                    {!!timeStr && <Text style={[styles.timeText, { color: gold }]}>{timeStr}</Text>}
                  </View>
                  <Ornament c1={accent} c2={accent2} style={{ marginTop: 7, marginBottom: 9 }} />
                  <View style={styles.rowBottom}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                      <MaterialCommunityIcons name={item.unread > 0 ? 'message-badge' : 'message-text-outline'} size={14} color={item.unread > 0 ? gold : '#64748B'} style={{ marginRight: 7 }} />
                      <Text style={[styles.lastMsgText, item.unread > 0 && styles.unreadMsgText]} numberOfLines={1}>
                        {item.lastMessageText || "Encrypted Packet Received"}
                      </Text>
                      {item.unread > 0 && <View style={[styles.newIndicator, { backgroundColor: userTier.color, shadowColor: userTier.color }]} />}
                    </View>
                    <View style={[styles.chevronBox, { borderColor: safeAlpha(gold, '77') }]}>
                      <Ionicons name="chevron-forward" size={14} color={gold} />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

export default function MessageList() {
  // 🔥 LIVE SYNC: raw chat docs + live host profiles are kept separately, then merged below
  const [rawThreads, setRawThreads] = useState<any[]>([]);
  const [hostProfiles, setHostProfiles] = useState<Record<string, any>>({});
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const router = useRouter();

  // 🌀 ANIMATION ENGINE REFS
  const scrollY = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current; // 🔥 ORB ANIMATION
  const spinAnim = useRef(new Animated.Value(0)).current; // 🆕 ORBITING RINGS + LIGHT SWEEP

  // 🆕🆕 NEW: floating gold dust particles
  const dust = useRef(
    Array.from({ length: 16 }, (_, i) => ({
      v: new Animated.Value(0),
      x: ((i * 43) % 100) / 100 * width,
      y: 140 + ((i * 61) % 560),
      size: 2 + (i % 3),
      dur: 6500 + (i % 5) * 1300,
      delay: i * 420,
    }))
  ).current;

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

    // 🆕 Continuous rotation for rings (also drives the light sweep)
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true })
    ).start();

    // 🆕 gold dust rising
    dust.forEach((p) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.v, { toValue: 1, duration: p.dur, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(p.v, { toValue: 0, duration: 0, useNativeDriver: true })
        ])
      ).start();
    });

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

    // 🔥 Only chat data here (host name/photo now come LIVE from the profile listeners below)
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const threads = snapshot.docs.map((chatDoc) => {
        const data = chatDoc.data();
        const expertId = data.participants.find((id: string) => id !== user.uid);
        const myUnreadCount = data.unreadCount ? data.unreadCount[user.uid] || 0 : 0;
        return { id: chatDoc.id, ...data, receiverId: expertId, unread: myUnreadCount };
      });
      setRawThreads(threads);
      setLoading(false);
    });

    return () => { unsubscribe(); unsubUser(); };
  }, [user]);

  // 🔥 LIVE HOST PROFILES: host name / photo maarina udane Messages-la update aagum
  const hostIdsKey = rawThreads
    .map((t) => t.receiverId)
    .filter(Boolean)
    .sort()
    .join(',');

  useEffect(() => {
    if (!hostIdsKey) {
      setHostProfiles({});
      return;
    }
    const ids = hostIdsKey.split(',');
    const unsubs = ids.map((id) =>
      onSnapshot(
        doc(db, 'users', id),
        (snap) => {
          setHostProfiles((prev) => ({ ...prev, [id]: snap.exists() ? snap.data() : null }));
        },
        () => {
          // permission / network error -> mark as loaded so the screen never gets stuck on the loader
          setHostProfiles((prev) => ({ ...prev, [id]: null }));
        }
      )
    );
    return () => unsubs.forEach((u) => u());
  }, [hostIdsKey]);

  // 🔥 MERGED THREADS (chat doc + live host profile) - same shape as before, so the whole UI works untouched
  const chatThreads = useMemo(
    () =>
      rawThreads.map((t) => {
        const p = hostProfiles[t.receiverId];
        return {
          ...t,
          expertName: pickName(p) || "Host Node",
          expertImage: pickImage(p) || null,
        };
      }),
    [rawThreads, hostProfiles]
  );

  // ⏳ keep the loader until every host profile has arrived (same behaviour as the old await-based loading)
  const profilesReady = rawThreads.every((t) => !t.receiverId || t.receiverId in hostProfiles);

  // 🔥 SATTI FIX: Synced Highest Balance check for accurate Level display in Messages!
  const userDiamonds = userData?.totalSpentDiamonds || 0;
  const userTier = calculateUserLevel(userDiamonds);

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

  // 🆕 DERIVED ANIMATION VALUES
  const spinRotate = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const spinRotateRev = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] });
  const sweepX = spinAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [-160, width, width] });
  const titleTilt = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: ['8deg', '-8deg'] });
  const heroParallax = scrollY.interpolate({ inputRange: [0, 300], outputRange: [0, -90], extrapolate: 'clamp' });
  const crownGlow = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.9] });
  const totalUnread = chatThreads.reduce((acc, t) => acc + (t.unread || 0), 0);
  const heroUri = chatThreads.length > 0 ? chatThreads[0].expertImage : null;

  // 🆕 royal title colours
  const titleColors = [lighten(userTier.color, 0.7), (userTier.color as string).slice(0, 7), lighten(userTier.secondaryColor, 0.45)];

  // 🔥 ALTERNATING BORDER STYLES (FLUID, 2px) - ippo royal row tint-ku use aagum
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

  if (loading || !profilesReady) {
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

      {/* 🆕 HERO BACKDROP: latest host's photo, blurred + tinted, fades into the theme (parallax on scroll) */}
      {heroUri ? (
        <Animated.View pointerEvents="none" style={[styles.heroBg, { transform: [{ translateY: heroParallax }] }]}>
          <Image source={{ uri: heroUri }} blurRadius={40} style={styles.heroImg} />
          <LinearGradient
            colors={[safeAlpha(userTier.themeBg[0], '66'), safeAlpha(userTier.themeBg[0], 'FF')]}
            style={StyleSheet.absoluteFill}
          />
          <LinearGradient
            colors={[safeAlpha(userTier.color, '33'), safeAlpha(userTier.color, '00')]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
      
      {/* 🔥 FLOATING SHIMMER ORBS */}
      <Animated.View style={[styles.shimmerOrb, { top: 80, left: -60, backgroundColor: userTier.color, transform: [{ translateY: orbTranslateY }] }]} />
      <Animated.View style={[styles.shimmerOrb, { bottom: 150, right: -60, backgroundColor: userTier.secondaryColor, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

      {/* 🌌 Animated Parallax Auras with Theme Sync */}
      <Animated.View style={[styles.aura, { top: -60, left: -100, backgroundColor: userTier.color, opacity: 0.15, transform: [{ translateY: parallaxHeader }] }]} />
      <Animated.View style={[styles.aura, { bottom: 100, right: -100, backgroundColor: userTier.secondaryColor, opacity: 0.1, transform: [{ translateY: parallaxHeader }] }]} />

      {/* 🆕 GIANT SLOW-ROTATING HALO RINGS (depth layer behind everything) */}
      <Animated.View pointerEvents="none" style={[styles.bgRing, { borderColor: safeAlpha(userTier.color, '22'), transform: [{ rotate: spinRotate }] }]} />
      <Animated.View pointerEvents="none" style={[styles.bgRingInner, { borderColor: safeAlpha(userTier.secondaryColor, '22'), transform: [{ rotate: spinRotateRev }] }]} />

      {/* 🆕🆕 NEW: floating gold dust */}
      {dust.map((p, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: p.y,
            left: p.x,
            width: p.size,
            height: p.size,
            borderRadius: p.size / 2,
            backgroundColor: i % 3 === 0 ? lighten(userTier.color, 0.6) : i % 3 === 1 ? (userTier.color as string).slice(0, 7) : '#FFFFFF',
            opacity: p.v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.8, 0.5, 0] }),
            transform: [{ translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, -300] }) }]
          }}
        />
      ))}

      <SafeAreaView style={styles.safeHeader} edges={['top']}>
        <View style={styles.header}>
          {/* 🔍 existing header icon (right corner) */}
          <View style={styles.headerIconStage}>
            <Animated.View pointerEvents="none" style={[styles.headerIconOrbit, { borderColor: safeAlpha(userTier.color, '88'), transform: [{ rotate: spinRotate }] }]} />
            <TouchableOpacity style={[styles.headerIcon, { borderColor: userTier.color + '40' }]}>
              <MaterialCommunityIcons name="comment-search-outline" size={24} color={userTier.color} />
            </TouchableOpacity>
          </View>

          {/* 👑 ROYAL MASTHEAD */}
          <View style={styles.masthead}>
            <View style={styles.crownStage}>
              <Animated.View pointerEvents="none" style={[styles.crownGlowBlob, { backgroundColor: userTier.color, opacity: crownGlow }]} />
              <Animated.View pointerEvents="none" style={[styles.crownRing, { borderColor: safeAlpha(lighten(userTier.color, 0.4), 'AA'), transform: [{ rotate: spinRotate }] }]} />
              <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
                <MaterialCommunityIcons name="crown" size={26} color={lighten(userTier.color, 0.45)} />
              </Animated.View>
            </View>

            <View style={styles.labelRow}>
              <LinearGradient colors={['transparent', safeAlpha(userTier.color, 'FF')]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.labelLine} />
              <MaterialCommunityIcons name="rhombus" size={7} color={userTier.color} />
              <Text style={[styles.welcomeLabel, { color: userTier.color }]}>SECURE CHANNEL</Text>
              <MaterialCommunityIcons name="rhombus" size={7} color={userTier.secondaryColor} />
              <LinearGradient colors={[safeAlpha(userTier.secondaryColor, 'FF'), 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.labelLine} />
            </View>

            {/* 🆕 3D tilting metallic title */}
            <Animated.View style={{ transform: [{ perspective: 600 }, { rotateX: titleTilt }] }}>
              <GradientText text="MESSAGES" colors={titleColors} style={[styles.headerTitle, { textShadowColor: userTier.color }]} />
            </Animated.View>

            {/* 🆕 STATUS CHIPS: tier, threads, unread */}
            <View style={styles.statRow}>
              <LinearGradient
                colors={[safeAlpha(userTier.color, 'FF'), safeAlpha(userTier.secondaryColor, 'FF')]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.tierChip}
              >
                <Text style={styles.tierChipText}>L{userTier.lvl} • {userTier.label}</Text>
              </LinearGradient>
              <View style={[styles.statChip, { borderColor: safeAlpha(userTier.color, '55') }]}>
                <Ionicons name="chatbubbles" size={11} color={userTier.color} />
                <Text style={styles.statChipText}>{chatThreads.length}</Text>
              </View>
              {totalUnread > 0 && (
                <View style={[styles.statChip, { borderColor: safeAlpha(userTier.color, '55'), backgroundColor: safeAlpha(userTier.color, '22') }]}>
                  <View style={[styles.statDot, { backgroundColor: userTier.color }]} />
                  <Text style={styles.statChipText}>{totalUnread > 99 ? '99+' : totalUnread} NEW</Text>
                </View>
              )}
            </View>

            {/* 🆕 latest hosts avatar stack */}
            {chatThreads.length > 0 && <AvatarStack threads={chatThreads} userTier={userTier} />}
          </View>
        </View>
      </SafeAreaView>

      {chatThreads.length === 0 ? (
        <View style={styles.center}>
          <Animated.View style={{ transform: [{ translateY: floatAnim }] }}>
            <View style={[styles.emptyIconCircle, { borderColor: userTier.color + '30' }]}>
               <Animated.View pointerEvents="none" style={[styles.emptyOrbit, { borderColor: safeAlpha(userTier.color, '88'), transform: [{ rotate: spinRotate }] }]} />
               <Ionicons name="chatbubbles-outline" size={60} color={userTier.color} />
            </View>
          </Animated.View>
          <Text style={styles.emptyTitle}>NO TRANSMISSIONS</Text>
          <Text style={styles.emptyText}>Start a secure conversation with a host to see threads here.</Text>
        </View>
      ) : (
        <Animated.FlatList
          data={chatThreads}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            // 🔥 oru section mattum (ACTIVE NODES rail illa) - ellaa chats-um inge
            <View style={styles.allTitleRow}>
              <LinearGradient colors={['transparent', safeAlpha(userTier.color, 'CC')]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.allTitleLine} />
              <MaterialCommunityIcons name="rhombus" size={8} color={userTier.color} />
              <Text style={[styles.allTitle, { color: lighten(userTier.color, 0.5) }]}>ALL TRANSMISSIONS</Text>
              <Text style={[styles.allCount, { color: userTier.color }]}>{chatThreads.length}</Text>
              <MaterialCommunityIcons name="rhombus" size={8} color={userTier.secondaryColor} />
              <LinearGradient colors={[safeAlpha(userTier.secondaryColor, 'CC'), 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.allTitleLine} />
            </View>
          }
          renderItem={({ item, index }) => {
             // 🔥 Alternating Border Logic (dual-tone tint for each royal row)
             const cardBorderStyle = index % 2 === 0 ? borderType1 : borderType2;

             return (
              <ThreadCard
                item={item}
                index={index}
                count={chatThreads.length}
                userTier={userTier}
                floatAnim={floatAnim}
                shimmerAnim={shimmerAnim}
                scrollY={scrollY}
                sweepX={sweepX}
                spinRotate={spinRotate}
                spinRotateRev={spinRotateRev}
                borderStyle={cardBorderStyle}
                onPress={() => handleChatPress(item.id, item.receiverId, item.expertName)}
                onLongPress={() => handleDeleteChat(item.id)}
              />
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: { flex: 1, backgroundColor: '#020617' },
  // 🆕 hero backdrop
  heroBg: { position: 'absolute', top: 0, left: 0, right: 0, height: 420, opacity: 0.55 },
  heroImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  // 🔥 DESIGN: AMBIENT SHIMMER ORBS
  shimmerOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.15, filter: 'blur(100px)' },
  aura: { position: 'absolute', width: 450, height: 450, borderRadius: 225, filter: 'blur(110px)' },
  // 🆕 giant rotating halo rings
  bgRing: { position: 'absolute', width: 520, height: 520, borderRadius: 260, borderWidth: 1.5, borderStyle: 'dashed', top: '18%', left: width / 2 - 260 },
  bgRingInner: { position: 'absolute', width: 380, height: 380, borderRadius: 190, borderWidth: 1, borderStyle: 'dotted', top: '18%', marginTop: 70, left: width / 2 - 190 },
  darkLoader: { flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' },
  loaderText: { marginTop: 15, fontWeight: '900', letterSpacing: 2, fontSize: 10 },
  
  // header (royal masthead, centered, no boxed bar)
  safeHeader: { backgroundColor: 'transparent' },
  header: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 14, alignItems: 'center' },
  masthead: { alignItems: 'center', width: '100%' },
  crownStage: { width: 62, height: 50, justifyContent: 'center', alignItems: 'center' },
  crownGlowBlob: { position: 'absolute', width: 40, height: 40, borderRadius: 20, filter: 'blur(18px)' },
  crownRing: { position: 'absolute', width: 48, height: 48, borderRadius: 24, borderWidth: 1.2, borderStyle: 'dashed' },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  labelLine: { width: 44, height: 1.5, borderRadius: 1 },
  welcomeLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 4 },
  headerTitle: { fontSize: 32, fontWeight: '900', letterSpacing: 7, marginTop: 4, textAlign: 'center', textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 16 },
  headerIconStage: { position: 'absolute', right: 14, top: 4, width: 60, height: 60, justifyContent: 'center', alignItems: 'center', zIndex: 5 },
  headerIconOrbit: { position: 'absolute', width: 58, height: 58, borderRadius: 29, borderWidth: 1.2, borderStyle: 'dashed' },
  headerIcon: { backgroundColor: 'rgba(255, 255, 255, 0.03)', padding: 10, borderRadius: 12, borderWidth: 1 },

  // 🆕 header status chips
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  tierChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  tierChipText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 3 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  statChipText: { color: '#E2E8F0', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  statDot: { width: 5, height: 5, borderRadius: 3 },

  // avatar stack
  stackRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  stackAv: { width: 38, height: 38, borderRadius: 19, borderWidth: 2, backgroundColor: '#000', shadowOpacity: 0.7, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 8 },
  stackImg: { width: '100%', height: '100%', borderRadius: 17 },
  stackDot: { position: 'absolute', top: -2, right: -2, width: 11, height: 11, borderRadius: 6, borderWidth: 2, borderColor: '#020617' },
  stackMore: { width: 38, height: 38, borderRadius: 19, borderWidth: 1.5, backgroundColor: 'rgba(255,255,255,0.06)', justifyContent: 'center', alignItems: 'center' },
  stackMoreText: { color: '#E2E8F0', fontSize: 11, fontWeight: '900' },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  emptyIconCircle: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', marginBottom: 20, borderWidth: 1 },
  emptyOrbit: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 1.5, borderStyle: 'dashed' },
  emptyTitle: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 2 },
  emptyText: { color: '#475569', textAlign: 'center', fontSize: 13, marginTop: 10, fontWeight: '600', lineHeight: 20 },

  // single list title (ornament header)
  allTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 44, marginBottom: 8 },
  allTitle: { fontSize: 10, fontWeight: '900', letterSpacing: 3.5 },
  allTitleLine: { flex: 1, height: 1.5, borderRadius: 1 },
  allCount: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },

  // 🆕🆕 ornament
  ornRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ornLine: { flex: 1, height: 1.2, borderRadius: 1 },

  // 🆕🆕 NEW: ROYAL PORTRAIT ROW
  rowOuter: { height: ROW_H, marginBottom: ROW_GAP, borderRadius: 30, backgroundColor: '#05030A', elevation: 12, shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  hairline: { flex: 1, borderRadius: 30, padding: 1.3 },
  rowInner: { flex: 1, borderRadius: 28.7, overflow: 'hidden', backgroundColor: '#07050E' },
  ghostPhoto: { position: 'absolute', top: -10, right: 0, width: '60%', height: ROW_H + 20, opacity: 0.5 },
  sheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 34 },
  sweep: { position: 'absolute', top: -30, bottom: -30, width: 70 },
  cornerStar: { position: 'absolute', zIndex: 5 },
  chatCard: { flex: 1, flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingRight: 14, zIndex: 10 },

  portraitStage: { width: 88, height: ROW_H - 26, justifyContent: 'center', alignItems: 'center' },
  portraitFrame: { width: 80, height: 100, borderRadius: 26, padding: 2.5, elevation: 12, shadowOpacity: 0.7, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } },
  portraitInner: { flex: 1, borderRadius: 23.5, padding: 2, backgroundColor: '#000', overflow: 'hidden' },
  avatar: { width: '100%', height: '100%', borderRadius: 21, backgroundColor: '#0F172A' },
  crest: { position: 'absolute', alignSelf: 'center', bottom: -5, width: 11, height: 11, borderWidth: 1.5, transform: [{ rotate: '45deg' }], shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 6 },

  sealWrap: { position: 'absolute', top: -2, right: -4, width: 34, height: 34, justifyContent: 'center', alignItems: 'center' },
  sealRing: { position: 'absolute', width: 34, height: 34, borderRadius: 17, borderWidth: 1.3, borderStyle: 'dashed' },
  badgeContainer: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#05030A',
    elevation: 10,
    shadowOpacity: 0.7,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 }
  },
  badgeText: { color: '#1A0F00', fontSize: 10, fontWeight: '900' },

  rowInfo: { flex: 1, marginLeft: 14, justifyContent: 'center' },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nameText: { color: '#FFF', fontSize: 16, fontWeight: '800', letterSpacing: 1.6, flexShrink: 1, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 6 },
  timeText: { marginLeft: 8, fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  lastMsgText: { color: '#94A3B8', fontSize: 12.5, fontWeight: '500', fontStyle: 'italic', flex: 1 },
  unreadMsgText: { color: '#F8FAFC', fontWeight: '700' },
  newIndicator: { width: 7, height: 7, borderRadius: 3.5, marginLeft: 8, shadowOpacity: 0.9, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  chevronBox: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', borderWidth: 1 }
});
