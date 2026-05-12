import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, query, updateDoc, where } from 'firebase/firestore'; // 🔥 SATTI FIX: Added getDocs
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, Dimensions, Easing, FlatList, Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../../firebaseConfig';

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

interface ExpertMessagesProps {
    onBlockUser: (targetUserId: string) => Promise<void>;
}

export default function ExpertMessages({ onBlockUser }: ExpertMessagesProps) {
    const [activeTab, setActiveTab] = useState<'CLIENTS' | 'REQUESTS'>('CLIENTS');
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expertProfile, setExpertProfile] = useState<any>(null);
    const expert = auth.currentUser;
    const router = useRouter();

    // 🔥 ANIMATION REFS FOR SHIMMER ORBS
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    // 🔥 Expert Own Dynamic Theme Core
    const totalBeansEarned = expertProfile?.totalBeansEarned || 0;
    const config = getLevelConfig(totalBeansEarned);
    
    const theme = {
        primary: config.colors[0],
        secondary: config.colors[2],
        accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
        // 🔥 DYNAMIC BACKGROUND DESIGN - MATTERS LEVEL COLORS
        bgGradient: [
            config.lvl >= 7 ? `${config.colors[0]}40` : '#020617',
            config.lvl >= 3 ? `${config.colors[1]}20` : '#0F172A',
            '#020617'
        ] as const
    };

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
    }, []);

    useEffect(() => {
        if (!expert?.uid) return;
        setLoading(true);

        const expertRef = doc(db, "users", expert.uid);
        const unsubExpert = onSnapshot(expertRef, (snap) => {
            if (snap.exists()) setExpertProfile(snap.data());
        });

        const statusQuery = activeTab === 'CLIENTS' ? 'friend' : 'pending';
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

                    return {
                        id: connDoc.id,
                        ...connData,
                        userName: uData.displayName || uData.name || connData.senderName || "User",
                        userImage: uData.profilePic || uData.photoURL || connData.senderImage || null,
                        userId: userId,
                        totalSpent: uData.totalSpentDiamonds || 0,
                        unread: 0
                    };
                })
            );

            setData(usersData);
            setLoading(false);

            if (activeTab === 'CLIENTS' && usersData.length > 0 && expert?.uid) {
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

    return (
        <View style={styles.mainWrapper}>
            <StatusBar barStyle="light-content" />
            
            {/* 🔥 DYNAMIC ANIMATED DESIGN BACKGROUND */}
            <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />
            
            {/* Shimmer Orbs for Animation */}
            <Animated.View style={[styles.shimmerOrb, { top: 50, right: -60, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 350, left: -90, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            {/* 👑 MAGIC MASSIVE HEADER DESIGN */}
            <View style={styles.topHeader}>
                <View style={styles.headerContent}>
                    <View style={{ flex: 1, paddingRight: 15 }}>
                        {/* Type 1 Dual border for Pill Header */}
                        <BlurView intensity={20} tint="dark" style={[styles.statusPillHeader, borderType1, { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 }]}>
                            <View style={[styles.pulseDot, { backgroundColor: theme.accent }]} />
                            <Text style={[styles.statusPillText, { color: theme.accent }]}>SYSTEM {config.label}</Text>
                        </BlurView>
                        {/* 🔥 TEXT AUTO SHRINK ON SMALL SCREENS */}
                        <Text style={styles.mainTitle} numberOfLines={1} adjustsFontSizeToFit={true}>TALKPE PRO NETWORK</Text>
                        <View style={[styles.neonUnderline, { backgroundColor: theme.primary }]} />
                    </View>
                    <TouchableOpacity style={[styles.headerIcon, borderType2]}>
                        <Ionicons name="flash" size={20} color={theme.accent} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* 👑 Expert Global Theme Tabs - Fluid Styling */}
            <View style={styles.tabWrapper}>
                <BlurView intensity={15} tint="dark" style={[styles.tabContainer, borderType1]}>
                    <TouchableOpacity
                        style={[styles.massTab, activeTab === 'CLIENTS' && { backgroundColor: theme.primary + '30' }]}
                        onPress={() => setActiveTab('CLIENTS')}
                    >
                        <Text style={[styles.tabText, activeTab === 'CLIENTS' && { color: '#FFF' }]}>CLIENTS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.massTab, activeTab === 'REQUESTS' && { backgroundColor: 'rgba(236, 72, 153, 0.25)' }]}
                        onPress={() => setActiveTab('REQUESTS')}
                    >
                        <Text style={[styles.tabText, activeTab === 'REQUESTS' && { color: '#FFF' }]}>REQUESTS</Text>
                    </TouchableOpacity>
                </BlurView>
            </View>

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
                    renderItem={({ item, index }) => {
                        // ✅ INDIVIDUAL USER DYNAMIC TIER SYNC
                        const userTier = calculateUserTier(item.totalSpent || 0);
                        
                        // 🔥 ALTERNATING CHESSBOARD EFFECT BORDER LOGIC
                        const cardBorderStyle = index % 2 === 0 ? borderType2 : borderType1;
                        
                        return (
                            <View style={styles.cardWrapper}>
                                <TouchableOpacity 
                                    activeOpacity={0.8}
                                    onLongPress={() => {
                                        if (expert?.uid) {
                                            const chatId = expert.uid < item.userId ? `${expert.uid}_${item.userId}` : `${item.userId}_${expert.uid}`;
                                            handleDeleteChat(chatId);
                                        }
                                    }}
                                >
                                    <BlurView intensity={15} tint="dark" style={[styles.fluidUserCard, cardBorderStyle]}>
                                        <View style={styles.avatarNode}>
                                            <TouchableOpacity onPress={() => router.push({ pathname: '/user-detail', params: { id: item.userId } } as any)}>
                                                {/* ✅ RING COLOR MATCHES USER'S OWN TIER */}
                                                <View style={[styles.nodeAvatarRing, { borderColor: userTier.color, shadowColor: userTier.color }]}>
                                                    <Image source={{ uri: item.userImage || `https://ui-avatars.com/api/?name=${item.userName}&background=1E293B&color=fff&bold=true` }} style={styles.nodeAvatarImg} />
                                                </View>
                                                {activeTab === 'CLIENTS' && <View style={styles.onlineStatus} />}
                                            </TouchableOpacity>
                                        </View>

                                        <View style={styles.infoNode}>
                                            <TouchableOpacity onPress={() => router.push({ pathname: '/user-detail', params: { id: item.userId } } as any)}>
                                                <Text style={styles.userName} numberOfLines={1}>{item.userName.toUpperCase()}</Text>
                                            </TouchableOpacity>
                                            <View style={styles.statusRow}>
                                                <Text style={[styles.statusText, { color: userTier.color }]}>{userTier.label}</Text>
                                            </View>
                                        </View>

                                        {activeTab === 'CLIENTS' ? (
                                            <View style={styles.actionNode}>
                                                {/* Button also navigates or deletes on long press */}
                                                <TouchableOpacity 
                                                    onPress={() => expert?.uid && router.push({ pathname: "/chat/ChatScreen" as any, params: { chatId: expert.uid < item.userId ? `${expert.uid}_${item.userId}` : `${item.userId}_${expert.uid}`, receiverId: item.userId, receiverName: item.userName } })} 
                                                    onLongPress={() => {
                                                        if (expert?.uid) {
                                                            const chatId = expert.uid < item.userId ? `${expert.uid}_${item.userId}` : `${item.userId}_${expert.uid}`;
                                                            handleDeleteChat(chatId);
                                                        }
                                                    }}
                                                    style={[styles.fluidRoundBtn, { backgroundColor: userTier.color }]}
                                                >
                                                    <Ionicons name="chatbubble-ellipses" size={18} color="#FFF" />
                                                    {item.unread > 0 && <View style={styles.glowBadge}><Text style={styles.badgeVal}>{item.unread}</Text></View>}
                                                </TouchableOpacity>
                                                <TouchableOpacity onPress={() => handleRejectOrUnfollow(item.id, 'Disconnect', item.userId)} style={[styles.fluidRoundBtn, { backgroundColor: 'rgba(244, 63, 94, 0.15)', borderWidth: 1, borderColor: 'rgba(244, 63, 94, 0.3)' }]}>
                                                    <Ionicons name="close" size={18} color="#F43F5E" />
                                                </TouchableOpacity>
                                            </View>
                                        ) : (
                                            <View style={styles.requestNode}>
                                                <TouchableOpacity onPress={() => handleAccept(item.id, item.senderId)} style={[styles.acceptMiniBtn, { backgroundColor: theme.primary }]}>
                                                    <Text style={styles.miniPillText}>LINK</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </BlurView>
                                </TouchableOpacity>
                            </View>
                        );
                    }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    mainWrapper: { flex: 1, backgroundColor: '#020617' },
    // 🔥 DESIGN: AMBIENT SHIMMER ORBS
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
    
    // 🔥 SATTI FIX: Width locked strictly to window width to prevent overflow
    topHeader: { width: width, paddingHorizontal: 25, paddingTop: 65, paddingBottom: 35, position: 'relative', zIndex: 10 },
    // 🔥 SATTI FIX: headerContent explicitly constrained to Width minus Left & Right padding (25 + 25 = 50)
    headerContent: { width: width - 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    
    statusPillHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, alignSelf: 'flex-start' },
    pulseDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
    statusPillText: { fontSize: 8, fontWeight: '900', letterSpacing: 2 },
    mainTitle: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: 1 },
    neonUnderline: { width: 40, height: 4, borderRadius: 2, marginTop: 4, opacity: 0.8 },
    
    // 🔥 Cleaned up Icon Style
    headerIcon: { width: 46, height: 46, borderRadius: 23, justifyContent: 'center', alignItems: 'center' }, 
    
    tabWrapper: { paddingHorizontal: 25, marginBottom: 15 },
    tabContainer: { flexDirection: 'row', padding: 6, borderRadius: 25, overflow: 'hidden' },
    massTab: { flex: 1, height: 44, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    tabText: { color: '#94A3B8', fontWeight: '900', fontSize: 10, letterSpacing: 2 },

    cardWrapper: { marginBottom: 15 },
    fluidUserCard: { flexDirection: 'row', alignItems: 'center', padding: 18, borderRadius: 35 }, 
    avatarNode: { position: 'relative' },
    nodeAvatarRing: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, padding: 2, elevation: 12, backgroundColor: '#020617' },
    nodeAvatarImg: { width: '100%', height: '100%', borderRadius: 22 },
    onlineStatus: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: '#10B981', borderWidth: 2.5, borderColor: '#020617', zIndex: 10 },

    infoNode: { flex: 1, marginLeft: 16, paddingRight: 10 },
    userName: { color: '#FFF', fontSize: 14, fontWeight: '900', letterSpacing: 1 },
    statusRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    statusText: { fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },

    actionNode: { flexDirection: 'row', gap: 10 },
    fluidRoundBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', elevation: 10 }, 
    glowBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: '#EF4444', minWidth: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#020617' },
    badgeVal: { color: '#FFF', fontSize: 8, fontWeight: '900' },

    requestNode: { flexDirection: 'row', alignItems: 'center' },
    acceptMiniBtn: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, elevation: 10 },
    miniPillText: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1 },

    loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 100 },
});