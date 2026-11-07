import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import { collection, doc, getDoc, limit, onSnapshot, query, runTransaction, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgLinearGradient } from 'react-native-svg';
import { auth, db } from '../../firebaseConfig';

const { width, height } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// 🆕 PREMIUM PALETTE
const PAL = {
  bg0: '#020617',
  bg1: '#0A0620',
  bg2: '#0F172A',
  cyan: '#00F2FE',
  blue: '#4FACFE',
  violet: '#8B5CF6',
  pink: '#EC4899',
  ruby: '#F43F5E',
  gold: '#F5C84C',
  emerald: '#10B981',
  card: 'rgba(10, 6, 28, 0.94)',
};

// 🆕 3D IMAGES (icons8 3D Fluency) - load aagalana automatic-a icon fallback varum
const IMG = {
  bell: 'https://img.icons8.com/3d-fluency/512/bell.png',
  phone: 'https://img.icons8.com/3d-fluency/512/phone.png',
  trophy: 'https://img.icons8.com/3d-fluency/512/trophy.png',
  chat: 'https://img.icons8.com/3d-fluency/512/chat.png',
  star: 'https://img.icons8.com/3d-fluency/512/star.png',
  shield: 'https://img.icons8.com/3d-fluency/512/shield.png',
};

const FILTERS: ('ALL' | 'CALLS' | 'ALERTS')[] = ['ALL', 'CALLS', 'ALERTS'];
const FILTER_ICONS = ['view-grid-outline', 'phone-incoming', 'bell-ring-outline'];

// 🆕 color helpers
const hexToRgb = (hex: string) => {
  const h = (hex || '').replace('#', '');
  if (h.length !== 6) return null;
  return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
};
const blend = (c1: string, c2: string, t: number) => {
  const a = hexToRgb(c1);
  const b = hexToRgb(c2);
  if (!a || !b) return c1;
  const mix = (x: number, y: number) => Math.round(x * (1 - t) + y * t).toString(16).padStart(2, '0');
  return `#${mix(a.r, b.r)}${mix(a.g, b.g)}${mix(a.b, b.b)}`;
};
const lighten = (hex: string, t: number) => blend(hex, '#FFFFFF', t);

// 🆕 UNREAD helpers (same rule the bell badge on the home screen uses)
const isUnread = (n: any) => !(n?.read === true || n?.isRead === true);

// 🆕 LEVEL-UP DUPLICATE GUARD: same level-up notification (same id / same title+message) is shown only ONCE
// (old duplicate logs already saved in Firestore are hidden too)
const levelDedupKey = (n: any): string | null => {
  if (n?.id && String(n.id).startsWith('level_up')) return String(n.id);
  const title = String(n?.title || '');
  if (n?.type !== 'call' && /level/i.test(title)) return `lvl|${title}|${n?.message || ''}`;
  return null;
};
const dedupeLevelLogs = (list: any[]) => {
  const seen = new Set<string>();
  return list.filter((n: any) => {
    const k = levelDedupKey(n);
    if (!k) return true;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

// 🆕 stable key per notification (same content + same time => numbered #0, #1...) so repeated snapshots never double count
const buildKeys = (list: any[]) => {
  const counts: Record<string, number> = {};
  return list.map((n: any) => {
    const base = `${n?.title || ''}|${n?.message || ''}|${n?.time || ''}`;
    const occ = counts[base] || 0;
    counts[base] = occ + 1;
    return `${base}#${occ}`;
  });
};

// 🆕 notification type -> theme (call / level / connection / alert)
const getNotifMeta = (item: any) => {
  const title = String(item?.title || '');
  if (item?.type === 'call') {
    return { kind: 'call', label: 'INCOMING CALL', color: PAL.ruby, color2: '#FB7185', icon: 'phone-incoming', img: IMG.phone };
  }
  if (/level/i.test(title)) {
    return { kind: 'level', label: 'LEVEL UPDATE', color: PAL.gold, color2: '#FFE9A8', icon: 'trophy-award', img: IMG.trophy };
  }
  if (/connection request/i.test(title)) {
    return { kind: 'connection', label: 'CONNECTION', color: PAL.violet, color2: '#C084FC', icon: 'account-plus', img: IMG.chat };
  }
  return { kind: 'alert', label: 'SYSTEM ALERT', color: PAL.cyan, color2: PAL.blue, icon: 'bell-ring', img: IMG.bell };
};

// 🆕 3D image with auto icon fallback
const Img3D = ({ uri, size, fallback, color = '#FFF', style }: any) => {
  const [err, setErr] = useState(false);
  if (err) return <MaterialCommunityIcons name={fallback} size={size * 0.7} color={color} />;
  return <Image source={{ uri }} style={[{ width: size, height: size }, style]} resizeMode="contain" onError={() => setErr(true)} />;
};

// 🆕 Floating (bob + sway) wrapper
const FloatBox = ({ children, amp = 6, dur = 1800, style }: any) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={[
        style,
        {
          transform: [
            { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -amp] }) },
            { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-4deg', '4deg'] }) }
          ]
        }
      ]}
    >
      {children}
    </Animated.View>
  );
};

// 🆕 Twinkling sparkle
const Sparkle = ({ x, y, size = 12, color = PAL.gold, delay = 0, dur = 1800 }: any) => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.timing(v, { toValue: 1, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: dur, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.1, 1] }),
        transform: [
          { scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.15] }) },
          { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] }) }
        ]
      }}
    >
      <MaterialCommunityIcons name="star-four-points" size={size} color={color} />
    </Animated.View>
  );
};

// 🆕 Gradient-border glow card
const GlowCard = ({ colors, radius = 24, children, style, innerStyle, glow }: any) => (
  <View
    style={[
      {
        borderRadius: radius,
        backgroundColor: PAL.bg1,
        shadowColor: glow || colors[0],
        shadowOpacity: 0.45,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 9
      },
      style
    ]}
  >
    <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: radius, padding: 1.5 }}>
      <View style={[{ borderRadius: radius - 1.5, overflow: 'hidden', backgroundColor: PAL.card }, innerStyle]}>{children}</View>
    </LinearGradient>
  </View>
);

// 🆕 Radar ripple rings (call screen) - mount aana odane start aagum
const Ripple = ({ color, size = 220, count = 3 }: any) => {
  const vals = useRef(Array.from({ length: count }, () => new Animated.Value(0))).current;
  useEffect(() => {
    const loops = vals.map((v, i) => {
      const l = Animated.loop(
        Animated.sequence([
          Animated.delay(i * 800),
          Animated.timing(v, { toValue: 1, duration: 2400, easing: Easing.out(Easing.ease), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true })
        ])
      );
      l.start();
      return l;
    });
    return () => loops.forEach(l => l.stop());
  }, []);
  return (
    <>
      {vals.map((v, i) => (
        <Animated.View
          key={i}
          pointerEvents="none"
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: size / 2,
            borderWidth: 2,
            borderColor: color,
            opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
            transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.7] }) }]
          }}
        />
      ))}
    </>
  );
};

// 🆕 Small stat box (hero)
const StatBox = ({ icon, label, value, color }: any) => (
  <View style={[styles.statBox, { borderColor: color + '55' }]}>
    <LinearGradient colors={[color + '33', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
    <LinearGradient colors={[color, color + '88']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statIcon}>
      <MaterialCommunityIcons name={icon} size={14} color="#FFF" />
    </LinearGradient>
    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{value}</Text>
    <Text style={styles.statLabel} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>{label}</Text>
  </View>
);

// 🆕 Notification card (own staggered entrance + press scale)
const NotifCard = ({ item, index, onPress, onDelete, disabled, tappable, isNew }: any) => {
  const anim = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue: 1, delay: Math.min(index, 8) * 70, friction: 7, tension: 55, useNativeDriver: true }).start();
  }, []);

  const meta = getNotifMeta(item);
  const isCall = meta.kind === 'call';

  return (
    <Animated.View
      style={{
        marginBottom: 16,
        opacity: anim,
        transform: [
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
          { scale: Animated.multiply(anim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }), scale) }
        ]
      }}
    >
      <TouchableOpacity
        activeOpacity={tappable ? 0.85 : 1}
        disabled={disabled}
        onPress={onPress}
        onPressIn={() => tappable && Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start()}
      >
        <GlowCard colors={[meta.color, meta.color + '22', meta.color2 + '88']} radius={28} glow={meta.color}>
          <BlurView intensity={20} tint="dark" style={styles.notificationCard}>
            <LinearGradient colors={[meta.color + '2E', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
            <View style={[styles.cardAccent, { backgroundColor: meta.color }]} />
            <View style={styles.cardWatermark} pointerEvents="none">
              <MaterialCommunityIcons name={meta.icon as any} size={110} color={meta.color + '12'} />
            </View>

            {item.callerImage ? (
              // 🔥 caller profile photo (if saved in the notification)
              <View>
                <LinearGradient colors={[lighten(meta.color, 0.5), meta.color, meta.color2]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.avatarRing}>
                  <Image source={{ uri: item.callerImage }} style={styles.notifAvatar} />
                </LinearGradient>
                <View style={[styles.avatarBadge, { backgroundColor: meta.color }]}>
                  <MaterialCommunityIcons name={meta.icon as any} size={11} color="#0B1026" />
                </View>
              </View>
            ) : (
              <View style={styles.iconWrap}>
                <View style={[styles.iconGlow, { backgroundColor: meta.color }]} />
                <LinearGradient
                  colors={[meta.color, meta.color + '77']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.iconBg, isCall ? styles.iconBgCall : styles.iconBgAlert, { shadowColor: meta.color }]}
                >
                  <LinearGradient colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']} style={styles.iconGloss} pointerEvents="none" />
                  <FloatBox amp={3} dur={1500}>
                    <Img3D uri={meta.img} size={34} fallback={meta.icon} color="#FFF" />
                  </FloatBox>
                </LinearGradient>
              </View>
            )}

            <View style={styles.textContainer}>
              <View style={styles.tagRow}>
                <View style={[styles.tagChip, { backgroundColor: meta.color + '26', borderColor: meta.color + '77' }]}>
                  <View style={[styles.tagDot, { backgroundColor: meta.color }]} />
                  <Text style={[styles.tagText, { color: lighten(meta.color, 0.5) }]}>{meta.label}</Text>
                </View>
                {/* 🆕 NEW pill - only for notifications that arrived since you last opened this screen */}
                {isNew && (
                  <View style={styles.newPill}>
                    <Text style={styles.newPillText}>NEW</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.notifTitle, isCall && { color: '#FDA4AF' }]}>{item.title || "SYSTEM ALERT"}</Text>
              <Text style={styles.notifBody}>{item.message || "Protocol update received."}</Text>
              <View style={styles.timeRow}>
                <Ionicons name="time-outline" size={12} color="#94A3B8" />
                <Text style={styles.notifTime}>{item.time || "Just now"}</Text>
              </View>
            </View>

            <View style={styles.rightCol}>
              {/* 🔥 delete this log */}
              <TouchableOpacity onPress={onDelete} style={styles.deleteBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#F43F5E" />
              </TouchableOpacity>
              <View style={[styles.chevBubble, { borderColor: meta.color + '55', opacity: tappable ? 1 : 0.35 }]}>
                <Ionicons name="chevron-forward" size={16} color={lighten(meta.color, 0.4)} />
              </View>
            </View>
          </BlurView>
        </GlowCard>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function NotificationsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [showCallModal, setShowCallModal] = useState(false);
  const [realCallerName, setRealCallerName] = useState<string | null>(null);
  const [callerProfilePic, setCallerProfilePic] = useState<string | null>(null); 

  // 🆕 filter + hero count + ring seconds
  const [filter, setFilter] = useState<'ALL' | 'CALLS' | 'ALERTS'>('ALL');
  const [filterW, setFilterW] = useState(0);
  const [heroCount, setHeroCount] = useState(0);
  const [ringSecs, setRingSecs] = useState(12);

  // 🆕 NEW (unread) notifications of this visit - these are what the header badge counts
  const [newKeys, setNewKeys] = useState<string[]>([]);
  const isFocusedRef = useRef(true);
  const notifsRef = useRef<any[]>([]);

  // 🔥 NEW FIX: last "seen" time saved in Firestore (same value the home bell badge uses)
  const seenAtRef = useRef<number | null>(null);
  // 🔥 NEW FIX: a notification is "fresh" if it is unread OR newer than the last seen time (this is exactly the bell badge rule)
  const isFresh = (n: any) =>
    isUnread(n) || (seenAtRef.current !== null && typeof n?.createdAt === 'number' && n.createdAt > seenAtRef.current);

  // 🔥 NEW FIX: same level-up shown only once in list + counts
  const shownNotifications = dedupeLevelLogs(notifications);

  const ringTimerAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const floatAnim = useRef(new Animated.Value(0)).current; 

  // 🆕 PREMIUM ANIMATION VALUES
  const orbAnim = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;
  const sweepAnim = useRef(new Animated.Value(0)).current;
  const glowPulse = useRef(new Animated.Value(0)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const filterSlide = useRef(new Animated.Value(0)).current;
  const headerAnim = useRef(new Animated.Value(0)).current;
  const btnPulse = useRef(new Animated.Value(0)).current;
  const particles = useRef(
    Array.from({ length: 14 }, (_, i) => ({
      v: new Animated.Value(0),
      x: ((i * 41) % 100) / 100 * width,
      y: 160 + ((i * 59) % 520),
      size: 2 + (i % 3),
      dur: 6500 + (i % 5) * 1200,
      delay: i * 500,
    }))
  ).current;
  
  const radius = 85; 
  const stroke = 8;  
  const circumference = radius * 2 * Math.PI;

  // 🆕 remember which notifications are NEW (unread) - safe to call many times (keys are stable)
  const registerNew = (list: any[]) => {
    const keys = buildKeys(list);
    const visible = new Set(dedupeLevelLogs(list)); // hidden duplicates are never counted
    const fresh: string[] = [];
    list.forEach((n: any, i: number) => { if (visible.has(n) && isFresh(n)) fresh.push(keys[i]); });
    if (fresh.length === 0) return false;
    setNewKeys(prev => {
      const next = [...prev];
      fresh.forEach(k => { if (!next.includes(k)) next.push(k); });
      return next.length === prev.length ? prev : next;
    });
    return true;
  };

  // 🆕 mark everything as read in Firestore (this is what clears the bell badge on the home screen)
  // 🔥 FIX: also saves "notifSeenAt" - the home bell badge also counts notifications newer than this time,
  // so without updating it the badge never cleared even after reading.
  // Runs in a transaction so a notification that arrives at the same moment is never overwritten.
  const markAllRead = async (_list?: any[]) => {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const userRef = doc(db, "users", user.uid);
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(userRef);
        if (!snap.exists()) return;
        const latest: any[] = Array.isArray(snap.data().notifications) ? snap.data().notifications : [];
        // seen time = now (or the newest notification time if the clocks differ) so nothing stays "newer than seen"
        let seenAt = Date.now();
        latest.forEach((n: any) => { if (typeof n?.createdAt === 'number' && n.createdAt > seenAt) seenAt = n.createdAt; });
        tx.update(userRef, {
          notifications: latest.map((n: any) => ({ ...n, read: true })),
          notifSeenAt: seenAt
        });
      });
    } catch (err) {
      console.error("Error updating read status: ", err);
    }
  };

  // 🔥 FIX: only mark as read while this screen is really in front.
  // If this screen stays mounted in the background (e.g. after opening dashboard from a card), new notifications
  // used to be marked read instantly - so the bell badge outside never showed a count.
  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      const pending = notifsRef.current;
      if (pending.some(isFresh)) {
        registerNew(pending);
        markAllRead(pending);
      }
      return () => {
        isFocusedRef.current = false;
        // 🔥 NEW FIX: once you leave the screen, these are "seen" - clear the NEW highlights so they don't come back next visit
        setNewKeys([]);
      };
    }, [])
  );

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // 🔥 FIX: Added 'async' to docSnap callback to handle read status update
    const unsubUser = onSnapshot(doc(db, "users", user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const notifs = data.notifications || [];
        // 🔥 NEW FIX: keep the saved seen-time so "fresh" matches the home bell badge rule
        seenAtRef.current = data.notifSeenAt === undefined ? null : (Number(data.notifSeenAt) || 0);
        setNotifications(notifs); 
        notifsRef.current = notifs;

        // 🔥 FIX: Mark unread notifications as read when screen is opened (only while focused)
        const hasUnread = notifs.some(isFresh);
        if (hasUnread) {
            registerNew(notifs); // keep them highlighted + counted as NEW for this visit
            if (isFocusedRef.current) {
                await markAllRead(notifs);
            }
        }
      }
      setLoading(false);
    });

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
        Animated.sequence([
            Animated.timing(floatAnim, { toValue: -10, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
            Animated.timing(floatAnim, { toValue: 0, duration: 2000, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
        ])
    ).start();

    return () => unsubUser();
  }, []);

  // 🆕 Ambient animations (orbs, header icon spin, hero shine, glow pulse, particles, header entrance, button pulse)
  useEffect(() => {
    const orbLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(orbAnim, { toValue: 1, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(orbAnim, { toValue: 0, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
      ])
    );
    orbLoop.start();
    const spinLoop = Animated.loop(Animated.timing(spinAnim, { toValue: 1, duration: 9000, easing: Easing.linear, useNativeDriver: true }));
    spinLoop.start();
    const sweepLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(1800),
        Animated.timing(sweepAnim, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(sweepAnim, { toValue: 0, duration: 0, useNativeDriver: true })
      ])
    );
    sweepLoop.start();
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(glowPulse, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    );
    glowLoop.start();
    const btnLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(btnPulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(btnPulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    );
    btnLoop.start();

    particles.forEach((p) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(p.delay),
          Animated.timing(p.v, { toValue: 1, duration: p.dur, easing: Easing.linear, useNativeDriver: true }),
          Animated.timing(p.v, { toValue: 0, duration: 0, useNativeDriver: true })
        ])
      ).start();
    });

    Animated.spring(headerAnim, { toValue: 1, friction: 7, tension: 50, useNativeDriver: true }).start();

    return () => {
      orbLoop.stop(); spinLoop.stop(); sweepLoop.stop(); glowLoop.stop(); btnLoop.stop();
    };
  }, []);

  // 🆕 Hero count-up
  useEffect(() => {
    const target = shownNotifications.length;
    const id = countAnim.addListener(({ value }) => setHeroCount(Math.floor(target * value)));
    countAnim.setValue(0);
    Animated.timing(countAnim, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
      if (finished) setHeroCount(target);
    });
    return () => countAnim.removeListener(id);
  }, [shownNotifications.length]);

  // 🆕 Filter pill slide
  useEffect(() => {
    Animated.spring(filterSlide, { toValue: FILTERS.indexOf(filter), useNativeDriver: true, friction: 8, tension: 70 }).start();
  }, [filter]);

  // 🆕 Live ring seconds (12 -> 0)
  useEffect(() => {
    const id = ringTimerAnim.addListener(({ value }) => {
      const s = Math.max(0, Math.ceil(value * 12));
      setRingSecs(prev => (prev === s ? prev : s));
    });
    return () => ringTimerAnim.removeListener(id);
  }, []);

  // 🔥 CRITICAL FIX: REAL-TIME CALL LISTENER & STATE RESET
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const callQuery = query(
      collection(db, "calls"),
      where("expertId", "==", user.uid),
      where("status", "==", "dialing"),
      limit(1)
    );

    const unsubCalls = onSnapshot(callQuery, async (snapshot) => {
      if (!snapshot.empty) {
        const docSnapshot = snapshot.docs[0];
        const docData = docSnapshot.data();
        
        // Prevent re-triggering if the same call ID is already active
        if (incomingCall?.id !== docSnapshot.id) {
            setIncomingCall({ id: docSnapshot.id, ...docData });

            try {
                const userSnap = await getDoc(doc(db, "users", docData.callerId));
                if (userSnap.exists()) {
                  const uData = userSnap.data();
                  // Priority: Custom Name > Google Auth Name
                  const name = uData.name || uData.userName || uData.displayName || "TALKPE PRO User";
                  // Priority: Cloudinary Upload > Google Profile Pic
                  const photo = uData.profilePic || uData.photoURL || null;
                  
                  setRealCallerName(name);
                  setCallerProfilePic(photo);
                  setShowCallModal(true);
                  startRingTimer();
                } else {
                  setRealCallerName(docData.callerName || "User");
                  setShowCallModal(true);
                  startRingTimer();
                }
            } catch (e) {
                setRealCallerName("User");
                setShowCallModal(true);
                startRingTimer();
            }
        }
      } else {
        // 🔥 FULL STATE CLEANUP: Reset everything when call ends or is rejected
        setIncomingCall(null);
        setShowCallModal(false);
        setRealCallerName(null);
        setCallerProfilePic(null);
        ringTimerAnim.stopAnimation();
      }
    });

    return () => unsubCalls();
  }, [incomingCall?.id]); // Added dependency to monitor call ID changes

  const startRingTimer = () => {
    ringTimerAnim.setValue(1);
    Animated.timing(ringTimerAnim, {
      toValue: 0,
      duration: 12000, 
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleMissedCall();
      }
    });
  };

  const handleMissedCall = async () => {
    if (incomingCall?.id) {
      try {
        await updateDoc(doc(db, "calls", incomingCall.id), { status: 'missed' });
        // State cleanup is handled automatically by the onSnapshot listener above
      } catch (e) { console.log(e); }
    }
  };

  const handleAccept = async () => {
    if (!incomingCall) return;
    ringTimerAnim.stopAnimation();
    try {
      await updateDoc(doc(db, "calls", incomingCall.id), { status: 'accepted' });
      setShowCallModal(false);
      router.push({
        pathname: '/videocall',
        params: { 
          callId: incomingCall.id, 
          role: 'expert', 
          callerName: realCallerName || "User",
          callerId: incomingCall.callerId // Passing this to maintain ID tracking
        }
      } as any);
    } catch (e) { console.log(e); }
  };

  const handleReject = async () => {
    if (!incomingCall) return;
    ringTimerAnim.stopAnimation();
    try {
      await updateDoc(doc(db, "calls", incomingCall.id), { status: 'rejected' });
      // State cleanup is handled automatically by the onSnapshot listener above
    } catch (e) { console.log(e); }
  };

  // 🔥 NEW: delete a single notification from the log (with confirmation)
  const deleteNotification = (item: any) => {
    const user = auth.currentUser;
    if (!user) return;
    Alert.alert("Delete log", "Remove this notification?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            // 🔥 NEW FIX: for a level-up log, also remove its hidden duplicates so they don't reappear after delete
            const dk = levelDedupKey(item);
            await updateDoc(doc(db, "users", user.uid), {
              notifications: notifications.filter((n: any) => n !== item && !(dk && levelDedupKey(n) === dk))
            });
          } catch (e) { console.log("Delete notification error:", e); }
        }
      }
    ]);
  };

  // 🔥 NEW: clear the whole log (with confirmation)
  const clearAllNotifications = () => {
    const user = auth.currentUser;
    if (!user) return;
    Alert.alert("Clear all logs", "Remove all notifications? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear All",
        style: "destructive",
        onPress: async () => {
          try {
            await updateDoc(doc(db, "users", user.uid), { notifications: [] });
            setNewKeys([]);
          } catch (e) { console.log("Clear notifications error:", e); }
        }
      }
    ]);
  };

  // 🆕 NEW-notification lookup (object -> stable key) used to highlight NEW cards
  const notifKeyList = buildKeys(notifications);
  const keyOf = new Map<any, string>();
  notifications.forEach((n: any, i: number) => keyOf.set(n, notifKeyList[i]));
  const newCount = newKeys.length;

  const renderItem = ({ item, index }: any) => {
    const targetId = item.callerId || item.userId || item.fromId; // 🔥 NEW: who to open on tap
    // 🔥 NEW: notifications without a user (level up / connection request) open a dashboard tab instead
    const notifTitle = String(item.title || '');
    const targetTab: string | null =
      item.tab ||
      (/connection request/i.test(notifTitle) ? 'MESSAGES' :
       /level/i.test(notifTitle) ? 'LEVELS' : null);
    return (
      // 🔥 NEW: Card is now tappable -> opens that user's profile (only if the notification has a user id)
      <NotifCard
        item={item}
        index={index}
        isNew={newKeys.includes(keyOf.get(item) || '')}
        tappable={!!(targetId || targetTab)}
        disabled={!targetId && !targetTab}
        onDelete={() => deleteNotification(item)}
        onPress={() => {
          if (targetId) {
            router.push({ pathname: '/user-detail', params: { userId: targetId } } as any);
          } else if (targetTab) {
            router.navigate({ pathname: '/expert/dashboard', params: { tab: targetTab, ts: String(Date.now()) } } as any);
          }
        }}
      />
    );
  };

  // Safe fallback if the real name is not fetched quickly
  const displayName = realCallerName || "User";
  const displayPic = callerProfilePic || `https://ui-avatars.com/api/?name=${displayName}&background=0F172A&color=00F2FE&size=512&bold=true`;

  // 🆕 derived values
  const totalLogs = shownNotifications.length;
  const callLogs = shownNotifications.filter((n: any) => n?.type === 'call').length;
  const alertLogs = totalLogs - callLogs;
  const listData = [...shownNotifications].reverse().filter((n: any) =>
    filter === 'ALL' ? true : filter === 'CALLS' ? n?.type === 'call' : n?.type !== 'call'
  );

  const orbY = orbAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -34] });
  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const sweepX = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.6, width * 1.1] });
  const heroGlow = glowPulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] });
  const filterSegW = filterW > 0 ? (filterW - 10) / 3 : 0;

  // 🆕 list header (hero + filters + clear all)
  const listHeader = (
    <View>
      {/* 🏆 HERO SUMMARY */}
      <GlowCard colors={[PAL.cyan, PAL.violet, PAL.pink]} radius={34} glow={PAL.cyan} style={{ marginBottom: 20 }}>
        <View style={styles.heroInner}>
          <LinearGradient colors={[PAL.cyan + '30', 'transparent', PAL.pink + '1F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
          <Sparkle x={width * 0.5} y={14} size={12} color={PAL.cyan} delay={0} />
          <Sparkle x={width * 0.72} y={80} size={10} color={PAL.pink} delay={600} />
          <Sparkle x={20} y={96} size={9} color={PAL.gold} delay={1100} />
          <Animated.View pointerEvents="none" style={[styles.heroSweep, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
            <LinearGradient colors={['transparent', 'rgba(255,255,255,0.14)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>

          <View style={styles.heroRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <View style={styles.heroChipRow}>
                <View style={styles.heroLiveChip}>
                  <Animated.View style={[styles.heroLiveDot, { opacity: heroGlow }]} />
                  <Text style={styles.heroLiveText}>SECURE LOG CENTER</Text>
                </View>
                {/* 🆕 how many NEW notifications arrived */}
                {newCount > 0 && (
                  <View style={styles.heroNewChip}>
                    <MaterialCommunityIcons name="bell-ring" size={11} color="#FFF" />
                    <Text style={styles.heroNewText}>{newCount} NEW</Text>
                  </View>
                )}
              </View>
              <Text style={styles.heroBig} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{heroCount}</Text>
              <Text style={styles.heroSub}>TOTAL TRANSMISSIONS</Text>
            </View>
            <View style={styles.heroImgBox}>
              <Animated.View style={[styles.heroImgGlow, { opacity: heroGlow }]} />
              <FloatBox amp={7} dur={1700}>
                <Img3D uri={IMG.bell} size={92} fallback="bell-ring" color={PAL.cyan} />
              </FloatBox>
            </View>
          </View>

          <View style={styles.statRow}>
            <StatBox icon="bell-ring-outline" label="LOGS" value={totalLogs} color={PAL.cyan} />
            <StatBox icon="phone-incoming" label="CALLS" value={callLogs} color={PAL.ruby} />
            <StatBox icon="shield-star-outline" label="ALERTS" value={alertLogs} color={PAL.violet} />
          </View>
        </View>
      </GlowCard>

      {/* 🎚 FILTER TABS */}
      <View style={styles.filterRow} onLayout={(e) => setFilterW(e.nativeEvent.layout.width)}>
        {filterSegW > 0 && (
          <Animated.View
            style={[
              styles.filterPill,
              { width: filterSegW, transform: [{ translateX: filterSlide.interpolate({ inputRange: [0, 1, 2], outputRange: [0, filterSegW, filterSegW * 2] }) }] }
            ]}
          >
            <LinearGradient colors={[PAL.cyan + '66', PAL.violet + '44']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        )}
        {FILTERS.map((f, idx) => {
          const active = filter === f;
          return (
            <TouchableOpacity key={f} style={styles.filterBtn} onPress={() => setFilter(f)} activeOpacity={0.8}>
              <MaterialCommunityIcons name={FILTER_ICONS[idx] as any} size={15} color={active ? '#FFF' : '#94A3B8'} />
              <Text style={[styles.filterText, active && { color: '#FFF' }]} numberOfLines={1} adjustsFontSizeToFit>{f}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {notifications.length > 0 ? (
        <View style={styles.clearAllRow}>
          <TouchableOpacity onPress={clearAllNotifications} style={styles.clearAllBtn} activeOpacity={0.7}>
            <MaterialCommunityIcons name="trash-can-outline" size={16} color="#F43F5E" />
            <Text style={styles.clearAllText}>CLEAR ALL</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#020617', '#0B0A24', '#020617']} style={StyleSheet.absoluteFill} />

      {/* 🆕 aurora orbs */}
      <Animated.View style={[styles.orb, { top: 80, right: -70, backgroundColor: PAL.cyan, transform: [{ translateY: orbY }] }]} />
      <Animated.View style={[styles.orb, { top: 420, left: -100, backgroundColor: PAL.violet, transform: [{ translateY: Animated.multiply(orbY, -1) }] }]} />
      <Animated.View style={[styles.orb, { top: 760, right: -90, backgroundColor: PAL.pink, transform: [{ translateY: orbY }] }]} />

      {/* 🆕 floating particles */}
      {particles.map((p, i) => (
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
            backgroundColor: [PAL.cyan, PAL.violet, PAL.pink, PAL.gold, '#FFFFFF'][i % 5],
            opacity: p.v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.8, 0.5, 0] }),
            transform: [{ translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, -300] }) }]
          }}
        />
      ))}

      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerAnim,
              transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }]
            }
          ]}
        >
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color="#FFF" />
          </TouchableOpacity>
          <View style={{alignItems: 'center'}}>
            <Text style={styles.headerLabel}>TERMINAL ACCESS</Text>
            <Text style={styles.headerTitle}>LOGS & ALERTS</Text>
            <View style={styles.headerUnderline}>
              <LinearGradient colors={['transparent', PAL.cyan, PAL.pink, 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            </View>
          </View>
          <TouchableOpacity style={styles.configBtn}>
             <Animated.View style={{ transform: [{ rotate: spin }] }}>
               <MaterialCommunityIcons name="shield-refresh-outline" size={24} color="#00F2FE" />
             </Animated.View>
             {/* 🔥 FIX: badge now shows the NEW notifications count (not the total logs, which was always stuck on the same number) */}
             {newCount > 0 && (
               <View style={styles.countBadge}>
                 <Text style={styles.countBadgeText}>{newCount > 99 ? '99+' : newCount}</Text>
               </View>
             )}
          </TouchableOpacity>
        </Animated.View>

        {loading ? (
          <View style={styles.loader}>
            <View>
              <Ripple color={PAL.cyan} size={90} count={2} />
              <ActivityIndicator size="large" color="#00F2FE" />
            </View>
            <Text style={styles.loaderText}>SYNCING NODES...</Text>
          </View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(_, index) => index.toString()}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                   <Ripple color={PAL.cyan} size={140} count={2} />
                   <View style={styles.emptyGlow} />
                   <FloatBox amp={8} dur={1700}>
                     <Img3D uri={IMG.bell} size={84} fallback="bell-sleep" color="#475569" />
                   </FloatBox>
                   <Sparkle x={-6} y={18} size={12} color={PAL.cyan} delay={0} />
                   <Sparkle x={118} y={8} size={10} color={PAL.pink} delay={500} />
                   <Sparkle x={112} y={108} size={11} color={PAL.gold} delay={1000} />
                </View>
                <Text style={styles.emptyTitle}>NO TRANSMISSIONS</Text>
                <Text style={styles.emptyText}>Your secure notification log is currently empty. Waiting for incoming data.</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>

      <Modal visible={showCallModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
          <LinearGradient colors={['rgba(99, 102, 241, 0.18)', 'transparent', 'rgba(236, 72, 153, 0.12)']} style={StyleSheet.absoluteFill} />
          <Animated.View style={[styles.orb, { top: 60, right: -80, backgroundColor: PAL.violet, opacity: 0.18, transform: [{ translateY: orbY }] }]} />
          <Animated.View style={[styles.orb, { bottom: 40, left: -90, backgroundColor: PAL.pink, opacity: 0.14, transform: [{ translateY: Animated.multiply(orbY, -1) }] }]} />
          
          <View style={styles.callContent}>
            <View style={styles.callBadgeContainer}>
                <View style={styles.liveDot} />
                <Text style={styles.incomingLabel}>INCOMING SECURE LINE</Text>
            </View>
            
            <View style={styles.mainAvatarSection}>
                <Animated.View style={[styles.timerWrapper, { transform: [{ scale: pulseAnim }, { translateY: floatAnim }] }]}>
                    
                    {/* 🆕 radar ripples */}
                    <Ripple color={PAL.cyan} size={200} count={3} />

                    {/* Background Pulsing Glows */}
                    <View style={[styles.bgGlow, { backgroundColor: '#6366F1' }]} />
                    <View style={[styles.bgGlow, { backgroundColor: '#EC4899', width: 220, height: 220, opacity: 0.15 }]} />

                    <Svg width={(radius + stroke) * 2} height={(radius + stroke) * 2} style={styles.timerSvg}>
                        <Defs>
                          <SvgLinearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                            <Stop offset="0" stopColor={PAL.cyan} />
                            <Stop offset="1" stopColor={PAL.pink} />
                          </SvgLinearGradient>
                        </Defs>
                        <Circle cx={radius + stroke} cy={radius + stroke} r={radius} stroke="rgba(255, 255, 255, 0.05)" strokeWidth={stroke} fill="transparent" />
                        <AnimatedCircle
                            cx={radius + stroke}
                            cy={radius + stroke}
                            r={radius}
                            stroke="url(#ringGrad)" 
                            strokeWidth={stroke}
                            fill="transparent"
                            strokeDasharray={circumference}
                            strokeDashoffset={ringTimerAnim.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })}
                            strokeLinecap="round"
                        />
                    </Svg>
                    <View style={styles.avatarContainer}>
                        <Image 
                            source={{ uri: displayPic }} 
                            style={styles.callerAvatar} 
                        />
                    </View>
                    <Sparkle x={6} y={30} size={12} color={PAL.cyan} delay={0} />
                    <Sparkle x={196} y={50} size={10} color={PAL.pink} delay={600} />
                    <Sparkle x={180} y={180} size={11} color={PAL.gold} delay={1100} />
                </Animated.View>
            </View>

            <Text style={styles.callerNameText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{displayName.toUpperCase()}</Text>
            <Text style={styles.callerSubText}>Requesting video uplink...</Text>

            {/* 🆕 live countdown */}
            <View style={styles.countdownChip}>
              <MaterialCommunityIcons name="timer-sand" size={14} color={PAL.cyan} />
              <Text style={styles.countdownText}>00:{String(ringSecs).padStart(2, '0')}</Text>
            </View>
            
            <View style={styles.encryptionBadge}>
               <MaterialCommunityIcons name="shield-lock-outline" size={16} color="#10B981" />
               <Text style={styles.encryptionText}>QUANTUM ENCRYPTED</Text>
            </View>
            
            <View style={styles.buttonRow}>
              <TouchableOpacity onPress={handleReject} style={styles.actionBtnContainer} activeOpacity={0.8}>
                <Animated.View style={[styles.rejectGlow, { opacity: btnPulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] }), transform: [{ scale: btnPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }] }]} />
                <LinearGradient colors={['#F43F5E', '#9F1239']} style={styles.actionBtnInner}>
                   <Ionicons name="close" size={36} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.btnLabel, {color: '#F43F5E'}]}>DECLINE</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={handleAccept} style={styles.actionBtnContainer} activeOpacity={0.8}>
                <Animated.View style={[styles.acceptGlow, { opacity: btnPulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.7] }), transform: [{ scale: btnPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }] }]} />
                <LinearGradient colors={['#10B981', '#059669']} style={styles.actionBtnInner}>
                   <Ionicons name="videocam" size={32} color="#FFF" />
                </LinearGradient>
                <Text style={[styles.btnLabel, {color: '#10B981'}]}>ACCEPT</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#020617' },
  safeArea: { flex: 1 },
  orb: { position: 'absolute', width: 340, height: 340, borderRadius: 170, opacity: 0.14 },

  // header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20,paddingVertical: 20 },
  headerLabel: { color: '#00F2FE', fontSize: 10, fontWeight: '900', letterSpacing: 4 },
  headerTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: -1, textShadowColor: '#00F2FE80', textShadowRadius: 10 },
  headerUnderline: { width: 120, height: 2, borderRadius: 1, marginTop: 6, overflow: 'hidden' },
  backBtn: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  configBtn: { padding: 10, backgroundColor: 'rgba(0, 242, 254, 0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.2)' },
  countBadge: { position: 'absolute', top: -6, right: -6, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: '#F43F5E', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#020617' },
  countBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900' },

  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loaderText: { color: '#00F2FE', marginTop: 25, fontWeight: '900', letterSpacing: 3, fontSize: 11 },
  listContent: { padding: 20, paddingBottom: 100 },

  // hero
  heroInner: { padding: 20 },
  heroSweep: { position: 'absolute', top: -40, bottom: -40, width: 80 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroChipRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  heroLiveChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 7, backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  heroLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  heroLiveText: { color: '#10B981', fontSize: 9.5, fontWeight: '900', letterSpacing: 1.6 },
  heroNewChip: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#F43F5E', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)' },
  heroNewText: { color: '#FFF', fontSize: 9.5, fontWeight: '900', letterSpacing: 1.2 },
  heroBig: { color: '#FFF', fontSize: 52, fontWeight: '900', letterSpacing: -1, marginTop: 10, textShadowColor: 'rgba(0,242,254,0.5)', textShadowRadius: 10 },
  heroSub: { color: '#7DD3FC', fontSize: 11, fontWeight: '900', letterSpacing: 2.5, marginTop: 2 },
  heroImgBox: { width: 110, height: 110, justifyContent: 'center', alignItems: 'center' },
  heroImgGlow: { position: 'absolute', width: 84, height: 84, borderRadius: 42, backgroundColor: '#00F2FE' },
  statRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  statBox: { flex: 1, minWidth: 0, padding: 12, borderRadius: 18, borderWidth: 1, backgroundColor: 'rgba(0,0,0,0.28)', overflow: 'hidden', alignItems: 'flex-start' },
  statIcon: { width: 24, height: 24, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { color: '#FFF', fontSize: 20, fontWeight: '900', maxWidth: '100%' },
  statLabel: { color: '#CBD5E1', fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginTop: 2, maxWidth: '100%' },

  // filter tabs
  filterRow: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 22, padding: 5, borderWidth: 1, borderColor: 'rgba(0,242,254,0.18)', marginBottom: 16 },
  // 🔥 FIX: border / shadow / elevation / gloss line removed -> no line behind the tab buttons
  filterPill: { position: 'absolute', top: 5, left: 5, bottom: 5, borderRadius: 17, overflow: 'hidden' },
  filterBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 },
  filterText: { color: '#94A3B8', fontSize: 11, fontWeight: '900', letterSpacing: 1.2, flexShrink: 1 },

  // notification card
  notificationCard: { flexDirection: 'row', alignItems: 'center', padding: 18, paddingLeft: 20, backgroundColor: 'rgba(15, 23, 42, 0.6)', overflow: 'hidden' },
  cardAccent: { position: 'absolute', left: 0, top: 14, bottom: 14, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
  cardWatermark: { position: 'absolute', right: -16, bottom: -24 },
  iconWrap: { width: 60, height: 60, justifyContent: 'center', alignItems: 'center' },
  iconGlow: { position: 'absolute', width: 46, height: 46, borderRadius: 23, opacity: 0.35 },
  iconBg: { width: 55, height: 55, borderRadius: 20, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  iconBgCall: { shadowColor: '#F43F5E', shadowRadius: 15, elevation: 10 },
  iconBgAlert: { shadowColor: '#00F2FE', shadowRadius: 15, elevation: 10 },
  iconGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 20 },
  avatarRing: { width: 60, height: 60, borderRadius: 22, padding: 2.5, justifyContent: 'center', alignItems: 'center' },
  notifAvatar: { width: '100%', height: '100%', borderRadius: 19, backgroundColor: '#0F172A' },
  avatarBadge: { position: 'absolute', bottom: -4, right: -4, width: 22, height: 22, borderRadius: 11, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#05030F' },
  textContainer: { flex: 1, marginLeft: 16, minWidth: 0 },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tagChip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  tagDot: { width: 5, height: 5, borderRadius: 3 },
  tagText: { fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  newPill: { backgroundColor: '#F43F5E', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  newPillText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.4 },
  notifTitle: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
  notifBody: { color: '#B6C2D4', fontSize: 13, marginTop: 6, fontWeight: '600', lineHeight: 20 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12 },
  notifTime: { color: '#94A3B8', fontSize: 10, fontWeight: '800', letterSpacing: 1 },
  rightCol: { alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginLeft: 8, gap: 10 },
  deleteBtn: { width: 34, height: 34, borderRadius: 12, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(244, 63, 94, 0.12)', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)' },
  chevBubble: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)' },

  clearAllRow: { alignItems: 'flex-end', marginBottom: 15 },
  clearAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, backgroundColor: 'rgba(244, 63, 94, 0.1)', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)' },
  clearAllText: { color: '#F43F5E', fontSize: 11, fontWeight: '900', letterSpacing: 2 },

  // empty
  emptyState: { alignItems: 'center', marginTop: height * 0.06 },
  emptyIconCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(30, 41, 59, 0.5)', justifyContent: 'center', alignItems: 'center', marginBottom: 30, borderWidth: 2, borderColor: 'rgba(255,255,255,0.05)', position: 'relative' },
  emptyGlow: { position: 'absolute', width: 100, height: 100, borderRadius: 50, backgroundColor: '#6366F1', opacity: 0.12 },
  emptyTitle: { color: '#FFF', fontSize: 20, fontWeight: '900', letterSpacing: 4 },
  emptyText: { color: '#94A3B8', fontSize: 13, marginTop: 12, fontWeight: '600', textAlign: 'center', paddingHorizontal: 40, lineHeight: 22 },
  
  // call modal
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  callContent: { alignItems: 'center', width: '100%', paddingHorizontal: 30 },
  callBadgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(99, 102, 241, 0.15)', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, marginBottom: 50, borderWidth: 1, borderColor: 'rgba(99, 102, 241, 0.3)' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#00F2FE', marginRight: 10, shadowColor: '#00F2FE', shadowRadius: 5, elevation: 5 },
  incomingLabel: { color: '#00F2FE', fontSize: 11, fontWeight: '900', letterSpacing: 4 },
  
  mainAvatarSection: { position: 'relative', marginBottom: 35 },
  timerWrapper: { width: 220, height: 220, justifyContent: 'center', alignItems: 'center' },
  bgGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 100, opacity: 0.25 },
  timerSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
  avatarContainer: { width: 150, height: 150, borderRadius: 75, overflow: 'hidden', borderWidth: 4, borderColor: '#020617', backgroundColor: '#0F172A', elevation: 25 },
  callerAvatar: { width: '100%', height: '100%', resizeMode: 'cover' },
  
  callerNameText: { color: '#FFF', fontSize: 40, fontWeight: '900', textAlign: 'center', letterSpacing: -1, textShadowColor: 'rgba(255,255,255,0.2)', textShadowRadius: 15, maxWidth: '100%' },
  callerSubText: { color: '#94A3B8', fontSize: 14, fontWeight: '700', marginTop: 10, letterSpacing: 1 },
  countdownChip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 12, backgroundColor: 'rgba(0,242,254,0.1)', borderWidth: 1, borderColor: 'rgba(0,242,254,0.3)' },
  countdownText: { color: '#00F2FE', fontSize: 13, fontWeight: '900', letterSpacing: 2 },
  
  encryptionBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(16, 185, 129, 0.15)', paddingHorizontal: 18, paddingVertical: 8, borderRadius: 12, marginTop: 20, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.3)' },
  encryptionText: { color: '#10B981', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
  
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: 50, paddingHorizontal: 20 },
  actionBtnContainer: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  rejectGlow: { position: 'absolute', top: -2, width: 90, height: 90, borderRadius: 45, backgroundColor: '#F43F5E', opacity: 0.4 },
  acceptGlow: { position: 'absolute', top: -2, width: 90, height: 90, borderRadius: 45, backgroundColor: '#10B981', opacity: 0.4 },
  actionBtnInner: { width: 85, height: 85, borderRadius: 42.5, justifyContent: 'center', alignItems: 'center', elevation: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  btnLabel: { marginTop: 18, fontSize: 12, fontWeight: '900', letterSpacing: 3 }
});