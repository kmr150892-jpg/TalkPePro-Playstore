import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, query, updateDoc, where } from 'firebase/firestore'; // 🔥 SATTI FIX: Added getDocs
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';
import { sendNotificationToUser } from '../../utils/notificationHelper'; // 🔥 IMPORTED NOTIFICATION HELPER

const { width, height } = Dimensions.get('window');

// 🔥 THE UNIVERSAL USER TIER ENGINE (FOR LIST ITEMS SYNC)
const calculateUserTier = (diamonds: number) => {
    if (diamonds >= 500000001) return { lvl: 8, label: 'TITAN L8', color: '#FF0033' };
    if (diamonds >= 100000001) return { lvl: 7, label: 'MYTHIC L7', color: '#D946EF' };
    if (diamonds >= 50000000) return { lvl: 6, label: 'GRANDMASTER L6', color: '#9c77f3' };
    if (diamonds >= 10000000) return { lvl: 5, label: 'ELITE L5', color: '#00F2FE' };
    if (diamonds >= 5000000) return { lvl: 4, label: 'LEGEND L4', color: '#d0630a' };
    if (diamonds >= 1000000) return { lvl: 3, label: 'DIAMOND L3', color: '#4ADE80' };
    if (diamonds >= 200001) return { lvl: 2, label: 'GOLD L2', color: '#ffae00' };
    return { lvl: 1, label: 'SILVER L1', color: '#0f33e7' };
};

// ✅ ACCURATE EXPERT THEME & LEVEL CONFIG (FOR HEADER & GLOBAL UI)
const getLevelConfig = (beans: number) => {
    if (beans >= 100000000) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'], glow: '#F59E0B' };
    if (beans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'], glow: '#EC4899' };
    if (beans >= 30000000) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'], glow: '#8B5CF6' };
    if (beans >= 10000000) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'], glow: '#3B82F6' };
    if (beans >= 5000000)  return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'], glow: '#06B6D4' };
    if (beans >= 3000000)  return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'], glow: '#10B981' };
    if (beans >= 1000000)  return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'], glow: '#EAB308' };
    if (beans >= 300000)   return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'], glow: '#94A3B8' };
    if (beans >= 100000)   return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'], glow: 'transparent' };
    if (beans >= 30000)    return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'], glow: 'transparent' };
    return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'], glow: 'transparent' };
};

// 🆕 COLOR HELPERS (level color -> light / dark variants, text-safe colours)
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
const darken = (hex: string, t: number) => blend(hex, '#000000', t);

// 🆕 3D IMAGES (icons8 3D Fluency) - load aagalana automatic-a icon fallback varum
const IMG = {
    chat: 'https://img.icons8.com/3d-fluency/512/speech-bubble.png',
    handshake: 'https://img.icons8.com/3d-fluency/512/handshake.png',
    crown: 'https://img.icons8.com/3d-fluency/512/crown.png',
    trophy: 'https://img.icons8.com/3d-fluency/512/trophy.png',
    star: 'https://img.icons8.com/3d-fluency/512/star.png',
};

// 🆕 3D image with auto icon fallback
const Img3D = ({ uri, size, fallback, color = '#FFF', style }: any) => {
    const [err, setErr] = useState(false);
    if (err) return <Ionicons name={fallback} size={size * 0.7} color={color} />;
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
                        { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['-3deg', '3deg'] }) }
                    ]
                }
            ]}
        >
            {children}
        </Animated.View>
    );
};

// 🆕 ✨ Twinkling sparkle
const Sparkle = ({ x, y, size = 12, color = '#F5C84C', delay = 0, dur = 1800 }: any) => {
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
            <Ionicons name="sparkles" size={size} color={color} />
        </Animated.View>
    );
};

// 🆕 Pulse dot (online / live)
const PulseDot = ({ color, size = 8 }: { color: string; size?: number }) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(v, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(v, { toValue: 0, duration: 1200, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <View style={{ width: size + 8, height: size + 8, justifyContent: 'center', alignItems: 'center', marginRight: 4 }}>
            <Animated.View
                style={{
                    position: 'absolute',
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor: color,
                    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.8, 0.15] }),
                    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2] }) }]
                }}
            />
            <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }} />
        </View>
    );
};

// 🆕 Unread badge with bounce pulse
const BounceBadge = ({ style, children }: any) => {
    const v = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const loop = Animated.loop(
            Animated.sequence([
                Animated.timing(v, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(v, { toValue: 0, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        );
        loop.start();
        return () => loop.stop();
    }, []);
    return (
        <Animated.View style={[style, { transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }]}>
            {children}
        </Animated.View>
    );
};

// 🆕 User card (self stagger entrance + glow border + tier colours)
const UserCard = ({ item, index, activeTab, theme, userTier, onOpenProfile, onChat, onDeleteChat, onDisconnect, onAccept }: any) => {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.spring(anim, { toValue: 1, delay: Math.min(index, 8) * 70, friction: 7, tension: 55, useNativeDriver: true }).start();
    }, []);

    const tierText = lighten(userTier.color, 0.5); // 🆕 text-safe tier colour
    const borderColors = index % 2 === 0
        ? [userTier.color, theme.secondary + '66', userTier.color + '33']
        : [theme.primary + 'CC', userTier.color + '55', theme.secondary + '99'];

    return (
        <Animated.View
            style={[
                styles.cardWrapper,
                {
                    opacity: anim,
                    transform: [
                        { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) },
                        { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }
                    ]
                }
            ]}
        >
            <TouchableOpacity activeOpacity={0.8} onLongPress={onDeleteChat}>
                <View style={[styles.cardGlow, { shadowColor: userTier.color }]}>
                    <LinearGradient colors={borderColors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardBorder}>
                        <BlurView intensity={15} tint="dark" style={styles.fluidUserCard}>
                            <LinearGradient colors={[userTier.color + '26', 'rgba(5,3,15,0.85)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} pointerEvents="none" />
                            <View style={[styles.cardAccent, { backgroundColor: userTier.color }]} />
                            <View style={styles.cardWatermark} pointerEvents="none">
                                <Ionicons name="diamond" size={96} color={userTier.color + '14'} />
                            </View>

                            <View style={styles.avatarNode}>
                                <TouchableOpacity onPress={onOpenProfile}>
                                    {/* ✅ RING COLOR DiscoverES USER'S OWN TIER */}
                                    <LinearGradient colors={[lighten(userTier.color, 0.5), userTier.color, darken(userTier.color, 0.35)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.nodeAvatarRing, { shadowColor: userTier.color }]}>
                                        <Image source={{ uri: item.userImage || `https://ui-avatars.com/api/?name=${item.userName}&background=1E293B&color=fff&bold=true` }} style={styles.nodeAvatarImg} />
                                    </LinearGradient>
                                    {activeTab === 'USERS' && <View style={styles.onlineStatus} />}
                                </TouchableOpacity>
                            </View>

                            <View style={styles.infoNode}>
                                <TouchableOpacity onPress={onOpenProfile}>
                                    <Text style={styles.userName} numberOfLines={1}>{item.userName.toUpperCase()}</Text>
                                </TouchableOpacity>
                                <View style={styles.statusRow}>
                                    <View style={[styles.tierPill, { backgroundColor: userTier.color + '30', borderColor: userTier.color + '88' }]}>
                                        <Ionicons name="diamond" size={9} color={tierText} style={{ marginRight: 4 }} />
                                        <Text style={[styles.statusText, { color: tierText }]}>{userTier.label}</Text>
                                    </View>
                                </View>
                            </View>

                            {activeTab === 'USERS' ? (
                                <View style={styles.actionNode}>
                                    {/* Button also navigates or deletes on long press */}
                                    <TouchableOpacity onPress={onChat} onLongPress={onDeleteChat} activeOpacity={0.85}>
                                        <LinearGradient colors={[lighten(userTier.color, 0.15), userTier.color, darken(userTier.color, 0.3)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.fluidRoundBtn, { shadowColor: userTier.color }]}>
                                            <LinearGradient colors={['rgba(255,255,255,0.45)', 'rgba(255,255,255,0)']} style={styles.btnGloss} pointerEvents="none" />
                                            <Ionicons name="chatbubble-ellipses" size={18} color="#FFF" />
                                            {item.unread > 0 && (
                                                <BounceBadge style={styles.glowBadge}>
                                                    <Text style={styles.badgeVal}>{item.unread}</Text>
                                                </BounceBadge>
                                            )}
                                        </LinearGradient>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={onDisconnect} style={[styles.fluidRoundBtn, { backgroundColor: 'rgba(244, 63, 94, 0.15)', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)' }]}>
                                        <Ionicons name="close" size={18} color="#FB7185" />
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <View style={styles.requestNode}>
                                    <TouchableOpacity onPress={onAccept} activeOpacity={0.85}>
                                        <LinearGradient colors={[lighten(theme.primary, 0.15), theme.primary, darken(theme.primary, 0.3)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.acceptMiniBtn, { shadowColor: theme.primary }]}>
                                            <LinearGradient colors={['rgba(255,255,255,0.4)', 'rgba(255,255,255,0)']} style={styles.btnGloss} pointerEvents="none" />
                                            <Ionicons name="link" size={14} color="#FFF" style={{ marginRight: 5 }} />
                                            <Text style={styles.miniPillText}>LINK</Text>
                                        </LinearGradient>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </BlurView>
                    </LinearGradient>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

interface ExpertMessagesProps {
    onBlockUser: (targetUserId: string) => Promise<void>;
}

export default function ExpertMessages({ onBlockUser }: ExpertMessagesProps) {
    const [activeTab, setActiveTab] = useState<'USERS' | 'REQUESTS'>('USERS');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expertProfile, setExpertProfile] = useState<any>(null);
    
    // 🔥 NEW STATES FOR REQUEST BADGE ALERTS 🔥
    const [newRequestCount, setNewRequestCount] = useState(0);
    const [lastKnownRequestIds, setLastKnownRequestIds] = useState<string[]>([]);
    
    const expert = auth.currentUser;
    const router = useRouter();

    // 🔥 ANIMATION REFS FOR SHIMMER ORBS
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    // 🆕 PREMIUM ANIMATION VALUES
    const rotAnim = useRef(new Animated.Value(0)).current;   // hero rotating frame
    const sweepAnim = useRef(new Animated.Value(0)).current; // hero shine sweep
    const tabSlide = useRef(new Animated.Value(0)).current;  // tab pill slide
    const tabAnim = useRef(new Animated.Value(1)).current;   // list content transition
    const heroIn = useRef(new Animated.Value(0)).current;    // hero entrance
    const [tabW, setTabW] = useState(0);
    const particles = useRef(
        Array.from({ length: 12 }, (_, i) => ({
            v: new Animated.Value(0),
            x: ((i * 41) % 100) / 100 * width,
            y: 160 + ((i * 59) % 460),
            size: 2 + (i % 3),
            dur: 6500 + (i % 5) * 1200,
            delay: i * 500,
        }))
    ).current;

    // 🔥 Expert Own Dynamic Theme Core
    const totalBeansEarned = expertProfile?.totalBeansEarned || 0;
    const config = getLevelConfig(totalBeansEarned);
    
    const theme = {
        primary: config.colors[0],
        secondary: config.colors[2],
        accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
        // 🆕 TEXT-SAFE colours (dark colours text-la nalla theriya brighten panniruken)
        accentText: lighten(config.glow !== 'transparent' ? config.glow : config.colors[0], 0.45),
        primaryText: lighten(config.colors[0], 0.4),
        secondaryText: lighten(config.colors[2], 0.62),
        // 🔥 DYNAMIC BACKGROUND DESIGN - MATTERS LEVEL COLORS
        bgGradient: [
            config.lvl >= 7 ? `${config.colors[0]}40` : '#020617',
            config.lvl >= 3 ? `${config.colors[1]}20` : '#0F172A',
            '#020617'
        ] as const
    };
    const PARTICLE_COLORS = [theme.accent, theme.primary, theme.secondary, '#FFFFFF'];

    useEffect(() => {
        // Start Ambient Animation
        Animated.loop(
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true
          })
        ).start();

        // 🆕 Hero rotating frame + shine sweep + entrance
        const rotLoop = Animated.loop(Animated.timing(rotAnim, { toValue: 1, duration: 14000, easing: Easing.linear, useNativeDriver: true }));
        rotLoop.start();
        const sweepLoop = Animated.loop(
            Animated.sequence([
                Animated.delay(2000),
                Animated.timing(sweepAnim, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(sweepAnim, { toValue: 0, duration: 0, useNativeDriver: true })
            ])
        );
        sweepLoop.start();
        Animated.spring(heroIn, { toValue: 1, friction: 6, tension: 45, useNativeDriver: true }).start();

        // 🆕 Floating particles
        particles.forEach((p) => {
            Animated.loop(
                Animated.sequence([
                    Animated.delay(p.delay),
                    Animated.timing(p.v, { toValue: 1, duration: p.dur, easing: Easing.linear, useNativeDriver: true }),
                    Animated.timing(p.v, { toValue: 0, duration: 0, useNativeDriver: true })
                ])
            ).start();
        });
    }, []);

    // 🆕 Tab pill slide + list content transition
    useEffect(() => {
        Animated.spring(tabSlide, { toValue: activeTab === 'USERS' ? 0 : 1, useNativeDriver: true, friction: 8, tension: 70 }).start();
        tabAnim.setValue(0);
        Animated.timing(tabAnim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, [activeTab]);

    // 🔥 NEW EFFECT: INDEPENDENT BACKGROUND LISTENER FOR PENDING REQUESTS & NOTIFICATIONS 🔥
    useEffect(() => {
        if (!expert?.uid) return;

        const requestQuery = query(collection(db, "connections"), where("receiverId", "==", expert.uid), where("status", "==", 'pending'));

        const unsubRequests = onSnapshot(requestQuery, async (snapshot) => {
            const currentIds = snapshot.docs.map(doc => doc.id);
            
            // Check if there are new requests that we haven't seen yet
            const newIncomingIds = currentIds.filter(id => !lastKnownRequestIds.includes(id));
            
            if (newIncomingIds.length > 0 && lastKnownRequestIds.length > 0) {
                // If there's a new request and it's not the initial load, send a Notification!
                for (const docSnap of snapshot.docs) {
                    if (newIncomingIds.includes(docSnap.id)) {
                        const connData = docSnap.data();
                        await sendNotificationToUser(
                            expert.uid,
                            "New Connection Request! 🤝",
                            `${connData.senderName || 'A user'} wants to connect with you. Check your requests tab!`,
                            "system"
                        );
                    }
                }
            }

            // Only update the unread badge if we are NOT currently on the REQUESTS tab
            if (activeTab !== 'REQUESTS') {
                setNewRequestCount(currentIds.length);
            } else {
                // If we are already on the tab, clear it immediately
                setNewRequestCount(0);
            }

            // Keep track of known IDs to detect future new ones
            setLastKnownRequestIds(currentIds);
        });

        return () => unsubRequests();
    }, [expert?.uid, activeTab, lastKnownRequestIds]);

    useEffect(() => {
        if (!expert?.uid) return;
        setLoading(true);

        const expertRef = doc(db, "users", expert.uid);
        const unsubExpert = onSnapshot(expertRef, (snap) => {
            if (snap.exists()) setExpertProfile(snap.data());
        });

        const statusQuery = activeTab === 'USERS' ? 'friend' : 'pending';
        const q = query(collection(db, "connections"), where("receiverId", "==", expert.uid), where("status", "==", statusQuery));

        let unsubscribeChats: (() => void) | null = null;

        const unsubscribe = onSnapshot(q, async (snapshot) => {
            const usersData = await Promise.all(
                snapshot.docs.map(async (connDoc) => {
                    const connData = connDoc.data();
                    const userId = connData.senderId;
                    const userRef = doc(db, "users", userId);
                    const userSnap = await getDoc(userRef);
                    const uData = userSnap.exists() ? userSnap.data() : {};

                    const highestDiamonds = uData?.totalSpentDiamonds || 0;

                    return {
                        id: connDoc.id,
                        ...connData,
                        userName: uData.displayName || uData.name || connData.senderName || "User",
                        userImage: uData.profilePic || uData.photoURL || connData.senderImage || null,
                        userId: userId,
                        totalSpent: highestDiamonds, // 🔥 Replaced simple totalSpentDiamonds with Highest Balance Logic
                        unread: 0
                    };
                })
            );

            setData(usersData);
            setLoading(false);

            if (activeTab === 'USERS' && usersData.length > 0 && expert?.uid) {
                if (unsubscribeChats) unsubscribeChats();
                const chatQ = query(collection(db, "chats"), where("participants", "array-contains", expert.uid));
                unsubscribeChats = onSnapshot(chatQ, (chatSnapshot) => {
                    const chatCounts: any = {};
                    chatSnapshot.docs.forEach(docSnap => {
                        const cData = docSnap.data();
                        if (cData.unreadCount && expert.uid) {
                            chatCounts[docSnap.id] = cData.unreadCount[expert.uid] || 0;
                        }
                    });

                    setData(prevData => prevData.map(user => {
                        const chatId1 = `${expert.uid}_${user.userId}`;
                        const chatId2 = `${user.userId}_${expert.uid}`;
                        const unreadVal = chatCounts[chatId1] || chatCounts[chatId2] || 0;
                        return { ...user, unread: unreadVal };
                    }));
                });
            }
        });

        return () => {
            unsubscribe(); unsubExpert(); if (unsubscribeChats) unsubscribeChats();
        };
    }, [activeTab, expert?.uid]);

    // 🔥 SATTI FIX: FIREBASE DEEP SUBCOLLECTION WIPEOUT ENGINE 🔥
    const executeChatWipeout = async (chatId: string) => {
        try {
            // 1. Fetch all ghost messages in the subcollection
            const msgsSnap = await getDocs(collection(db, "chats", chatId, "messages"));
            
            // 2. Erase every single message
            const deletePromises = msgsSnap.docs.map(msgDoc => deleteDoc(doc(db, "chats", chatId, "messages", msgDoc.id)));
            await Promise.all(deletePromises);
            
            // 3. Destroy the main Chat Room
            await deleteDoc(doc(db, "chats", chatId));
        } catch (e) {
            console.log("Deep wipeout failed:", e);
        }
    };

    const handleAccept = async (id: string, senderId: string) => {
        if (!expert?.uid) return;
        try {
            await updateDoc(doc(db, "connections", id), { status: 'friend' });
            await updateDoc(doc(db, "users", senderId), { friendsCount: increment(1) });
            await updateDoc(doc(db, "users", expert.uid), { friendsCount: increment(1) });
        } catch (e) { Alert.alert("Error", "Transmission failed."); }
    };

    const handleRejectOrUnfollow = async (id: string, type: string, otherUserId?: string) => {
        if (!expert?.uid) return;
        Alert.alert("Manage Link", `${type} this node?`, [
            { text: "CANCEL", style: "cancel" },
            { text: "DISCONNECT", onPress: async () => {
                try {
                    await deleteDoc(doc(db, "connections", id));
                    if (type === 'Disconnect' && otherUserId) {
                        await updateDoc(doc(db, "users", otherUserId), { friendsCount: increment(-1) }).catch(() => {});
                        await updateDoc(doc(db, "users", expert.uid), { friendsCount: increment(-1) }).catch(() => {});
                        
                        // 🔥 SATTI FIX: Deep wipeout when unfollowing! 🔥
                        const chatId1 = `${expert.uid}_${otherUserId}`;
                        const chatId2 = `${otherUserId}_${expert.uid}`;
                        await executeChatWipeout(chatId1);
                        await executeChatWipeout(chatId2);
                    }
                } catch (e) { console.log(e); }
            }},
            { text: "BLOCK", style: "destructive", onPress: () => { if(otherUserId) onBlockUser(otherUserId); } }
        ]);
    };

    // 🔥 NEW: EXPERT DELETE CHAT LOGIC (DEEP WIPEOUT) 🔥
    const handleDeleteChat = (chatId: string) => {
        Alert.alert(
            "Delete Entire Chat",
            "Are you sure you want to permanently delete this entire chat history?",
            [
                { text: "Cancel", style: "cancel" },
                { 
                    text: "Delete All", 
                    style: "destructive", 
                    onPress: async () => {
                        try {
                            // 🔥 SATTI FIX: Trigger the Deep Wipeout Engine 🔥
                            await executeChatWipeout(chatId);
                            Alert.alert("Deleted", "Chat wipeout successful.");
                        } catch (error) {
                            Alert.alert("Error", "Could not delete the chat.");
                        }
                    } 
                }
            ]
        );
    };

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -30]
    });

    // 🔥 ALTERNATING BORDER STYLES WITH REDUCED THICKNESS (2px)
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

    // 🆕 Interpolations
    const spin = rotAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
    const sweepX = sweepAnim.interpolate({ inputRange: [0, 1], outputRange: [-width * 0.6, width * 1.1] });
    const tabSegW = tabW > 0 ? (tabW - 16) / 2 : 0;

    // 🆕 Expert identity (header)
    const expertName = expertProfile?.name || expertProfile?.displayName || expert?.displayName || 'Pro Expert';
    const expertPic = expertProfile?.profilePic || expertProfile?.photoURL || `https://ui-avatars.com/api/?name=${expertName}&background=0F172A&color=fff`;

    const getChatId = (uid: string, otherId: string) => uid < otherId ? `${uid}_${otherId}` : `${otherId}_${uid}`;

    return (
        <View style={styles.mainWrapper}>
            <StatusBar barStyle="light-content" />
            
            {/* 🔥 DYNAMIC ANIMATED DESIGN BACKGROUND */}
            <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />
            
            {/* Shimmer Orbs for Animation */}
            <Animated.View style={[styles.shimmerOrb, { top: 50, right: -60, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 350, left: -90, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 650, right: -80, backgroundColor: theme.accent, transform: [{ translateY: orbTranslateY }] }]} />

            {/* 🆕 Floating particles (level theme embers) */}
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
                        backgroundColor: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
                        opacity: p.v.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 0.8, 0.5, 0] }),
                        transform: [{ translateY: p.v.interpolate({ inputRange: [0, 1], outputRange: [0, -300] }) }]
                    }}
                />
            ))}

            {/* 👑 MAGIC MASSIVE HEADER DESIGN */}
            <Animated.View
                style={[
                    styles.topHeader,
                    {
                        opacity: heroIn,
                        transform: [{ translateY: heroIn.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }]
                    }
                ]}
            >
                <View style={[styles.heroWrapper, { shadowColor: theme.accent }]}>
                    <View style={styles.heroFrame}>
                        <Animated.View style={[styles.heroFrameSpin, { transform: [{ rotate: spin }] }]} pointerEvents="none">
                            <LinearGradient
                                colors={[theme.accent, theme.primary, theme.secondary, lighten(theme.accent, 0.5), theme.accent] as any}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                        </Animated.View>

                        <LinearGradient colors={[theme.primary + '40', '#0A0620', theme.secondary + '30', '#060315'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroCard}>
                            <LinearGradient colors={['rgba(255,255,255,0.10)', 'rgba(255,255,255,0)']} style={styles.heroSheen} pointerEvents="none" />
                            <Sparkle x={width * 0.45} y={20} size={13} color={theme.accentText} delay={0} />
                            <Sparkle x={width * 0.7} y={95} size={10} color={theme.primaryText} delay={600} />
                            <Sparkle x={22} y={120} size={11} color={theme.secondaryText} delay={1100} />

                            {/* shine sweep */}
                            <Animated.View pointerEvents="none" style={[styles.heroSweep, { transform: [{ translateX: sweepX }, { rotate: '20deg' }] }]}>
                                <LinearGradient colors={['transparent', 'rgba(255,255,255,0.15)', 'transparent']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
                            </Animated.View>

                            <View style={styles.headerContent}>
                                <View style={{ flex: 1, paddingRight: 15 }}>
                                    {/* Type 1 Dual border for Pill Header */}
                                    <BlurView intensity={20} tint="dark" style={[styles.statusPillHeader, borderType1, { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 }]}>
                                        <PulseDot color={theme.accent} size={6} />
                                        <Text style={[styles.statusPillText, { color: theme.accentText }]}>SYSTEM {config.label}</Text>
                                    </BlurView>
                                    {/* 🔥 TEXT AUTO SHRINK ON SMALL SCREENS */}
                                    <Text style={styles.mainTitle} numberOfLines={1} adjustsFontSizeToFit={true}>TALKPE PRO NETWORK</Text>
                                    <View style={[styles.neonUnderline, { backgroundColor: theme.primary }]} />
                                </View>
                                <View style={styles.headerRight}>
                                    <FloatBox amp={5} dur={1600}>
                                        <Img3D uri={IMG.chat} size={54} fallback="chatbubbles" color={theme.accent} />
                                    </FloatBox>
                                    <TouchableOpacity style={[styles.headerIcon, borderType2]}>
                                        <Ionicons name="flash" size={20} color={theme.accentText} />
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* 🆕 Expert identity row */}
                            <View style={[styles.identityRow, { borderColor: theme.accent + '40' }]}>
                                <View>
                                    <LinearGradient colors={[lighten(theme.accent, 0.5), theme.accent, darken(theme.accent, 0.35)]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.identityRing}>
                                        <Image source={{ uri: expertPic }} style={styles.identityAvatar} />
                                    </LinearGradient>
                                    <View style={styles.identityCrown}>
                                        <Img3D uri={IMG.crown} size={20} fallback="ribbon" color={theme.accentText} />
                                    </View>
                                </View>
                                <View style={{ flex: 1, marginLeft: 12 }}>
                                    <Text style={styles.identityName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{expertName}</Text>
                                    <Text style={[styles.identityLevel, { color: theme.accentText }]} numberOfLines={1}>{config.label}</Text>
                                </View>
                            </View>

                            {/* 🆕 Stat chips (dark blur - white text nalla theriyum) */}
                            <View style={styles.heroSummaryGrid}>
                                <BlurView intensity={20} tint="dark" style={styles.summaryChip}>
                                    <View style={styles.summaryTopRow}>
                                        <Ionicons name="people" size={12} color={theme.primaryText} />
                                        <Text style={styles.summaryLabel}>LINKS</Text>
                                    </View>
                                    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{expertProfile?.friendsCount || 0}</Text>
                                </BlurView>
                                <BlurView intensity={20} tint="dark" style={styles.summaryChip}>
                                    <View style={styles.summaryTopRow}>
                                        <Ionicons name="hourglass" size={12} color={theme.accentText} />
                                        <Text style={styles.summaryLabel}>PENDING</Text>
                                    </View>
                                    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>{lastKnownRequestIds.length}</Text>
                                </BlurView>
                                <BlurView intensity={20} tint="dark" style={styles.summaryChip}>
                                    <View style={styles.summaryTopRow}>
                                        <Ionicons name="star" size={12} color={theme.secondaryText} />
                                        <Text style={styles.summaryLabel}>LEVEL</Text>
                                    </View>
                                    <Text style={styles.summaryValue} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>L{config.lvl}</Text>
                                </BlurView>
                            </View>
                        </LinearGradient>
                    </View>
                </View>
            </Animated.View>

            {/* 👑 Expert Global Theme Tabs - Fluid Styling (sliding pill) */}
            <View style={styles.tabWrapper}>
                <BlurView intensity={15} tint="dark" style={[styles.tabContainer, borderType1]} onLayout={(e) => setTabW(e.nativeEvent.layout.width)}>
                    {tabSegW > 0 && (
                        <Animated.View
                            style={[
                                styles.tabPill,
                                {
                                    width: tabSegW,
                                    borderColor: activeTab === 'USERS' ? theme.accent : '#EC4899',
                                    shadowColor: activeTab === 'USERS' ? theme.accent : '#EC4899',
                                    transform: [{ translateX: tabSlide.interpolate({ inputRange: [0, 1], outputRange: [0, tabSegW] }) }]
                                }
                            ]}
                        >
                            <Animated.View style={[StyleSheet.absoluteFill, { opacity: tabSlide.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}>
                                <LinearGradient colors={[theme.primary + '88', theme.accent + '33']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                            </Animated.View>
                            <Animated.View style={[StyleSheet.absoluteFill, { opacity: tabSlide.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) }]}>
                                <LinearGradient colors={['rgba(236, 72, 153, 0.55)', 'rgba(236, 72, 153, 0.2)']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                            </Animated.View>
                            <LinearGradient colors={['rgba(255,255,255,0.22)', 'rgba(255,255,255,0)']} style={styles.tabPillGloss} pointerEvents="none" />
                        </Animated.View>
                    )}
                    <TouchableOpacity
                        style={styles.massTab}
                        onPress={() => setActiveTab('USERS')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="people" size={15} color={activeTab === 'USERS' ? '#FFF' : '#CBD5E1'} style={{ marginRight: 6 }} />
                        <Text style={[styles.tabText, activeTab === 'USERS' && { color: '#FFF' }]}>USERS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.massTab}
                        onPress={() => {
                            setActiveTab('REQUESTS');
                            setNewRequestCount(0); // 🔥 CLEAR BADGE ON CLICK 🔥
                        }}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="person-add" size={15} color={activeTab === 'REQUESTS' ? '#FFF' : '#CBD5E1'} style={{ marginRight: 6 }} />
                        <Text style={[styles.tabText, activeTab === 'REQUESTS' && { color: '#FFF' }]}>REQUESTS</Text>
                        
                        {/* 🔥 REQUESTS TAB ALERT BADGE 🔥 */}
                        {newRequestCount > 0 && activeTab !== 'REQUESTS' && (
                            <BounceBadge style={styles.tabBadge}>
                                <Text style={styles.tabBadgeText}>{newRequestCount > 9 ? '9+' : newRequestCount}</Text>
                            </BounceBadge>
                        )}
                    </TouchableOpacity>
                </BlurView>
            </View>

            <Animated.View
                style={{
                    flex: 1,
                    opacity: tabAnim,
                    transform: [{ translateY: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }]
                }}
            >
                {loading ? (
                    <View style={styles.loaderContainer}>
                        <ActivityIndicator size="large" color={theme.primary} />
                    </View>
                ) : (
                    <FlatList
                        data={data}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ padding: 20, paddingBottom: 150 }}
                        showsVerticalScrollIndicator={false}
                        ListEmptyComponent={
                            <View style={styles.emptyBox}>
                                <FloatBox amp={8} dur={1800}>
                                    <Img3D uri={activeTab === 'USERS' ? IMG.handshake : IMG.star} size={90} fallback="people" color={theme.accent} />
                                </FloatBox>
                                <Text style={[styles.emptyTitle, { color: theme.accentText }]}>{activeTab === 'USERS' ? 'NO ACTIVE LINKS YET' : 'NO PENDING REQUESTS'}</Text>
                                <Text style={styles.emptySub}>{activeTab === 'USERS' ? 'Accepted users will appear here.' : 'New requests will appear here.'}</Text>
                            </View>
                        }
                        renderItem={({ item, index }) => {
                            // ✅ INDIVIDUAL USER DYNAMIC TIER SYNC
                            const userTier = calculateUserTier(item.totalSpent || 0);
                            
                            return (
                                <UserCard
                                    item={item}
                                    index={index}
                                    activeTab={activeTab}
                                    theme={theme}
                                    userTier={userTier}
                                    onOpenProfile={() => router.push({ pathname: '/user-detail', params: { id: item.userId } } as any)}
                                    onChat={() => expert?.uid && router.push({ pathname: "/chat/ChatScreen" as any, params: { chatId: expert.uid < item.userId ? `${expert.uid}_${item.userId}` : `${item.userId}_${expert.uid}`, receiverId: item.userId, receiverName: item.userName } })}
                                    onDeleteChat={() => {
                                        if (expert?.uid) {
                                            const chatId = expert.uid < item.userId ? `${expert.uid}_${item.userId}` : `${item.userId}_${expert.uid}`;
                                            handleDeleteChat(chatId);
                                        }
                                    }}
                                    onDisconnect={() => handleRejectOrUnfollow(item.id, 'Disconnect', item.userId)}
                                    onAccept={() => handleAccept(item.id, item.senderId)}
                                />
                            );
                        }}
                    />
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: '#020617' },
    // 🔥 DESIGN: AMBIENT SHIMMER ORBS
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
    
    // 🔥 SATTI FIX: Width locked strictly to window width to prevent overflow
    topHeader: { width: width, paddingHorizontal: 25, paddingTop: 60, paddingBottom: 20, position: 'relative', zIndex: 10 },

    // 🆕 hero frame
    heroWrapper: { width: '100%', borderRadius: 36, backgroundColor: '#0A0620', elevation: 20, shadowOpacity: 0.5, shadowRadius: 24, shadowOffset: { width: 0, height: 10 } },
    heroFrame: { borderRadius: 36, overflow: 'hidden', padding: 2.5, backgroundColor: '#0A0620' },
    heroFrameSpin: { position: 'absolute', top: '50%', left: '50%', width: 900, height: 900, marginLeft: -450, marginTop: -450 },
    heroCard: { borderRadius: 33.5, padding: 18, overflow: 'hidden' },
    heroSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 80 },
    heroSweep: { position: 'absolute', top: -60, bottom: -60, width: 90 },

    // 🔥 SATTI FIX: headerContent explicitly constrained (hero card padding inside topHeader)
    headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerRight: { alignItems: 'center', gap: 6 },
    
    statusPillHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, alignSelf: 'flex-start' },
    pulseDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
    statusPillText: { fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    mainTitle: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },
    neonUnderline: { width: 40, height: 4, borderRadius: 2, marginTop: 4, opacity: 0.8 },
    
    // 🔥 Cleaned up Icon Style
    headerIcon: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' }, 

    // 🆕 identity
    identityRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16, backgroundColor: 'rgba(0,0,0,0.28)', padding: 10, borderRadius: 22, borderWidth: 1 },
    identityRing: { width: 52, height: 52, borderRadius: 26, padding: 2.5, justifyContent: 'center', alignItems: 'center' },
    identityAvatar: { width: '100%', height: '100%', borderRadius: 24, backgroundColor: '#0F172A' },
    identityCrown: { position: 'absolute', top: -14, alignSelf: 'center', left: 16 },
    identityName: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 0.5 },
    identityLevel: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5, marginTop: 3 },

    // 🆕 stat chips
    heroSummaryGrid: { flexDirection: 'row', gap: 10, marginTop: 14 },
    summaryChip: { flex: 1, padding: 12, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(0,0,0,0.25)' },
    summaryTopRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
    summaryLabel: { color: 'rgba(255,255,255,0.72)', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    summaryValue: { color: '#FFF', fontSize: 18, fontWeight: '900' },
    
    tabWrapper: { paddingHorizontal: 25, marginBottom: 15 },
    tabContainer: { flexDirection: 'row', padding: 6, borderRadius: 25, overflow: 'hidden' },
    tabPill: { position: 'absolute', top: 6, left: 6, bottom: 6, borderRadius: 20, borderWidth: 1.2, overflow: 'hidden', shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 }, elevation: 6 },
    tabPillGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 16 },
    massTab: { flex: 1, height: 44, borderRadius: 20, justifyContent: 'center', alignItems: 'center', flexDirection: 'row' },
    tabText: { color: '#CBD5E1', fontWeight: '900', fontSize: 12, letterSpacing: 2 },

    // 🔥 NEW STYLES FOR THE REQUEST TAB BADGE 🔥
    tabBadge: { position: 'absolute', top: 4, right: 15, backgroundColor: '#EF4444', minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: '#020617' },
    tabBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '900', paddingHorizontal: 3 },

    cardWrapper: { marginBottom: 15 },
    cardGlow: { borderRadius: 35, backgroundColor: '#0A0620', shadowOpacity: 0.4, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 9 },
    cardBorder: { borderRadius: 35, padding: 1.5 },
    fluidUserCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 33.5, overflow: 'hidden', backgroundColor: 'rgba(10, 6, 28, 0.96)' }, 
    cardAccent: { position: 'absolute', left: 0, top: 18, bottom: 18, width: 4, borderTopRightRadius: 4, borderBottomRightRadius: 4 },
    cardWatermark: { position: 'absolute', right: -16, bottom: -20 },
    avatarNode: { position: 'relative' },
    nodeAvatarRing: { width: 56, height: 56, borderRadius: 28, padding: 2.5, elevation: 12, shadowOpacity: 0.7, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } },
    nodeAvatarImg: { width: '100%', height: '100%', borderRadius: 25, backgroundColor: '#020617' },
    onlineStatus: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2.5, borderColor: '#020617', zIndex: 10 },

    infoNode: { flex: 1, marginLeft: 16, paddingRight: 10 },
    userName: { color: '#FFF', fontSize: 15, fontWeight: '900', letterSpacing: 1 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
    tierPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9, borderWidth: 1 },
    statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },

    actionNode: { flexDirection: 'row', gap: 10 },
    fluidRoundBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 10, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, overflow: 'visible' }, 
    btnGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 18, borderTopLeftRadius: 22, borderTopRightRadius: 22 },
    glowBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', minWidth: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#020617' },
    badgeVal: { color: '#FFF', fontSize: 10, fontWeight: '900' },

    requestNode: { flexDirection: 'row', alignItems: 'center' },
    acceptMiniBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 12, borderRadius: 20, elevation: 10, shadowOpacity: 0.6, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, overflow: 'hidden' },
    miniPillText: { color: '#FFF', fontSize: 12, fontWeight: '900', letterSpacing: 1, textShadowColor: 'rgba(0,0,0,0.55)', textShadowRadius: 2, textShadowOffset: { width: 0, height: 1 } },

    // 🆕 empty state
    emptyBox: { alignItems: 'center', marginTop: 50, opacity: 0.95 },
    emptyTitle: { marginTop: 14, fontSize: 13, fontWeight: '900', letterSpacing: 2 },
    emptySub: { color: '#CBD5E1', marginTop: 6, fontSize: 12, fontWeight: '700' },

    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
});
