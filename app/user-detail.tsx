import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, arrayUnion, collection, doc, increment, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { auth, db } from '../firebaseConfig';

const { height, width } = Dimensions.get('window');

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT THEME SYNC V2)
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
  return { 
      lvl: 1, label: 'SILVER AGENT', status: 'STAR FAME', color: '#0f33e7', secondaryColor: '#6b0402', anim: 'wave', themeBg: ['#050505', '#000000']
  };
};

export default function UserDetail() {
    const params = useLocalSearchParams();
    const userId = (params.id || params.userId) as string;
    const router = useRouter();

    const [targetUser, setTargetUser] = useState<any>(null);
    const [currentUserData, setCurrentUserData] = useState<any>(null); // 🔥 SATTI FIX: Track Expert's profile to prevent double block
    const [loading, setLoading] = useState(true);

    const [blockModalVisible, setBlockModalVisible] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);
    
    const blockReasons = [
        "Abusive Language / Harassment",
        "Inappropriate Behavior / Nudity",
        "Scam / Spam / Phishing",
        "Threatening / Aggressive",
        "Other Unwanted Contact"
    ];

    const scrollY = useRef(new Animated.Value(0)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const trailX = useRef(new Animated.Value(-width)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current; 

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -10, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 2500, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
            ])
        ).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();

        const runTrail = () => {
            trailX.setValue(-width);
            Animated.timing(trailX, { toValue: width, duration: 3500, useNativeDriver: true }).start(() => runTrail());
        };
        runTrail();

        if (!userId) return;
        
        const unsubTargetUser = onSnapshot(doc(db, 'users', userId), (docSnap) => {
            if (docSnap.exists()) {
                setTargetUser({ id: docSnap.id, ...docSnap.data() });
            }
            setLoading(false);
        });

        let unsubCurrentUser = () => {};
        if (auth.currentUser) {
            unsubCurrentUser = onSnapshot(doc(db, 'users', auth.currentUser.uid), (docSnap) => {
                if (docSnap.exists()) {
                    setCurrentUserData(docSnap.data());
                }
            });
        }

        return () => { unsubTargetUser(); unsubCurrentUser(); };
    }, [userId]);

    const handleReasonSelect = (reason: string) => {
        if (!targetUser || !auth.currentUser) return;

        const alreadyBlocked = Array.isArray(currentUserData?.blockedUsers) && currentUserData.blockedUsers.includes(userId);
        
        if (alreadyBlocked) {
            Alert.alert(
                "ACTION RESTRICTED", 
                "This user is already in your blacklist. Please manage them via Security Settings if you wish to restore access."
            );
            setBlockModalVisible(false);
            return;
        }

        Alert.alert(
            "CONFIRM BLOCK",
            `Are you sure you want to block ${targetUser.name}?\n\nReason: ${reason}`,
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
        setIsBlocking(true);
        const expertId = auth.currentUser!.uid;

        try {
            await updateDoc(doc(db, "users", expertId), { blockedUsers: arrayUnion(userId) });
            await updateDoc(doc(db, "users", userId), { expertBlockCount: increment(1) });
            
            await addDoc(collection(db, "admin_alerts"), {
                type: 'EXPERT_BLOCKED_USER', 
                expertId: expertId, 
                expertName: currentUserData?.name || auth.currentUser?.displayName || "Expert",
                userId: userId, 
                userName: targetUser.name, 
                reason: reason,
                timestamp: serverTimestamp(), 
                status: 'unread'
            });

            Alert.alert("USER BLOCKED", `${targetUser.name} has been successfully restricted and reported to safety moderation.`);
        } catch (error) {
            Alert.alert("SYSTEM ERROR", "Unable to complete blocking protocol. Please check your connection.");
        } finally {
            setIsBlocking(false); 
            setBlockModalVisible(false);
        }
    };

    if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#6366F1" /></View>;

    // 🔥 SATTI FIX: Synced Highest Balance check for accurate Level display!
    const userDiamonds = Math.max(
        targetUser?.totalDiamonds || 0,
        targetUser?.walletBalance || 0,
        targetUser?.balance || 0
    );
    const userRank = calculateUserLevel(userDiamonds);
    const gender = targetUser?.gender || 'N/A';

    const parallaxImg = scrollY.interpolate({ inputRange: [0, 300], outputRange: [0, -50], extrapolate: 'clamp' });
    const bgOpacity = scrollY.interpolate({ inputRange: [0, 200], outputRange: [0.15, 0.05], extrapolate: 'clamp' });
    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });

    const borderType1 = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: userRank.color, borderRightColor: userRank.color,
        borderTopColor: userRank.secondaryColor + '80', borderBottomColor: userRank.secondaryColor + '80',
        backgroundColor: 'rgba(5, 5, 5, 0.65)',
    };

    const borderType2 = {
        borderLeftWidth: 2, borderRightWidth: 2, borderTopWidth: 0.5, borderBottomWidth: 0.5,
        borderLeftColor: userRank.secondaryColor, borderRightColor: userRank.secondaryColor,
        borderTopColor: userRank.color + '80', borderBottomColor: userRank.color + '80',
        backgroundColor: 'rgba(5, 5, 5, 0.8)',
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            <LinearGradient colors={userRank.themeBg as any} style={StyleSheet.absoluteFill} />

            <Animated.View style={[styles.parallaxAura, { top: 40, left: -50, backgroundColor: userRank.color, opacity: bgOpacity, transform: [{ translateY: parallaxImg }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: height * 0.4, right: -80, backgroundColor: userRank.color, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { bottom: 50, left: -80, backgroundColor: userRank.secondaryColor, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 120 }}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
            >
                <View style={styles.imageWrapper}>
                    <Animated.Image
                        source={{ uri: targetUser?.coverPhoto || 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400' }}
                        style={[styles.profileImg, { transform: [{ translateY: parallaxImg }] }]}
                    />
                    <LinearGradient colors={['rgba(2, 6, 23, 0.3)', 'transparent', userRank.themeBg[0]]} style={StyleSheet.absoluteFill} />
                    
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <BlurView intensity={30} tint="dark" style={styles.blurBack}>
                            <Ionicons name="chevron-back" size={24} color="#FFF" />
                        </BlurView>
                    </TouchableOpacity>

                    <Animated.View style={[styles.leftAvatarNode, { transform: [{ translateY: floatAnim }] }]}>
                         <View style={[styles.avatarBorder, { borderColor: userRank.color, shadowColor: userRank.color }]}>
                            <Image source={{ uri: targetUser?.profilePic || `https://ui-avatars.com/api/?name=${targetUser?.name}` }} style={styles.syncedAvatarImg} />
                         </View>
                    </Animated.View>
                </View>

                <View style={[styles.infoContent, { backgroundColor: userRank.themeBg[0] }]}>
                    <View style={styles.topHeaderInfo}>
                        <View style={{flex: 1}}>
                            <Text style={styles.userName}>{targetUser?.name || "TalkPe User"}</Text>
                            <Text style={styles.idLabel}>NETWORK ID: {userId.slice(0, 10).toUpperCase()}</Text>
                        </View>
                        <LinearGradient colors={[userRank.color, userRank.secondaryColor]} style={styles.rankBadgeMass}>
                             <MaterialCommunityIcons name="crown" size={16} color="#FFF" />
                             <Text style={styles.rankLabelMass}>{userRank.label}</Text>
                        </LinearGradient>
                    </View>

                    <View style={styles.dataNodeRow}>
                        <View style={[styles.stealthNodeBase, borderType1]}>
                            <View style={[styles.quadBorder, { borderLeftColor: userRank.color, borderRightColor: userRank.color, borderTopColor: userRank.secondaryColor, borderBottomColor: userRank.secondaryColor }]} />
                            <Ionicons name="location-sharp" size={18} color={userRank.color} />
                            <Text style={styles.dataLabel}>LOCATION</Text>
                            <Text style={styles.dataVal} numberOfLines={1}>{targetUser?.location || 'GLOBAL'}</Text>
                        </View>

                        <View style={[styles.stealthNodeBase, borderType2]}>
                            <View style={[styles.quadBorder, { borderLeftColor: userRank.secondaryColor, borderRightColor: userRank.secondaryColor, borderTopColor: userRank.color, borderBottomColor: userRank.color }]} />
                            <MaterialCommunityIcons name="cake-variant" size={18} color={userRank.secondaryColor} />
                            <Text style={styles.dataLabel}>AGE</Text>
                            <Text style={styles.dataVal}>{targetUser?.age || '20'}</Text>
                        </View>

                        <View style={[styles.stealthNodeBase, borderType1]}>
                            <View style={[styles.quadBorder, { borderLeftColor: userRank.color, borderRightColor: userRank.color, borderTopColor: userRank.secondaryColor, borderBottomColor: userRank.secondaryColor }]} />
                            <Ionicons name={gender === 'Male' ? "male" : "female"} size={18} color={userRank.color} />
                            <Text style={styles.dataLabel}>GENDER</Text>
                            <Text style={styles.dataVal}>{gender.toUpperCase()}</Text>
                        </View>
                    </View>

                    <View style={[styles.metricsWrapper, borderType2]}>
                        <View style={[styles.quadBorder, { borderLeftColor: userRank.secondaryColor, borderRightColor: userRank.secondaryColor, borderTopColor: userRank.color, borderBottomColor: userRank.color, opacity: 0.3 }]} />
                        <View style={styles.metricsInner}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{targetUser?.friendsCount || 0}</Text>
                                <Text style={styles.statSub}>FOLLOWERS</Text>
                            </View>
                            <View style={[styles.divider, { backgroundColor: userRank.secondaryColor + '40' }]} />
                            <View style={styles.statItem}>
                                <Text style={[styles.statNumber, { color: userRank.color }]}>L{userRank.lvl}</Text>
                                <Text style={styles.statSub}>TIER RANK</Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.sectionHeader}>
                        <View style={[styles.glowBar, { backgroundColor: userRank.color }]} />
                        <Text style={styles.sectionTitleText}>BIOGRAPHY</Text>
                    </View>
                    <View style={[styles.bioContainer, borderType1]}>
                        <Animated.View style={[styles.glowTrail, { backgroundColor: userRank.color, transform: [{ translateX: trailX }] }]} />
                        <MaterialCommunityIcons name="format-quote-open" size={24} color={userRank.color + '50'} style={styles.quoteIcon} />
                        <Text style={styles.bioText}>
                            {targetUser?.bio || "This TalkPe identity has not yet shared a biography."}
                        </Text>
                    </View>

                    {targetUser?.hobbies && targetUser.hobbies.length > 0 && (
                        <>
                            <View style={[styles.sectionHeader, { marginTop: 35 }]}>
                                <View style={[styles.glowBar, { backgroundColor: userRank.color }]} />
                                <Text style={styles.sectionTitleText}>INTERESTS</Text>
                            </View>
                            <View style={styles.hobbiesList}>
                                {targetUser.hobbies.map((hobby: string, index: number) => {
                                    const hobbyBorder = index % 2 === 0 ? borderType2 : borderType1;
                                    return (
                                        <View key={index} style={[styles.hobbyPill, hobbyBorder]}>
                                            <Text style={[styles.hobbyLabel, { color: index % 2 === 0 ? userRank.secondaryColor : userRank.color }]}>{hobby.toUpperCase()}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </>
                    )}

                    <View style={styles.actionRowMass}>
                        <TouchableOpacity 
                            style={[styles.actionBtnMass, { backgroundColor: userRank.color + '15', borderColor: userRank.color + '40' }]}
                            onPress={() => router.push({ 
                                pathname: '/chat/ChatScreen', 
                                params: { userId: userId, userName: targetUser?.name } 
                            })}
                        >
                            <Ionicons name="chatbubble-ellipses" size={20} color={userRank.color} />
                            <Text style={[styles.actionBtnTextMass, { color: userRank.color }]}>MESSAGE</Text>
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.actionBtnMass, { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.3)' }]}
                            onPress={() => setBlockModalVisible(true)}
                        >
                            <MaterialCommunityIcons name="shield-off" size={20} color="#EF4444" />
                            <Text style={[styles.actionBtnTextMass, { color: '#EF4444' }]}>BLOCK & REPORT</Text>
                        </TouchableOpacity>
                    </View>

                    <LinearGradient colors={[userRank.color + '20', 'transparent']} start={{x:0, y:0}} end={{x:1, y:0}} style={styles.trustBanner}>
                        <MaterialCommunityIcons name="check-decagram" size={20} color={userRank.color} />
                        <Text style={[styles.trustLabel, { color: userRank.color }]}>VERIFIED SECURE NETWORK NODE</Text>
                    </LinearGradient>
                </View>
            </Animated.ScrollView>

            <Modal
                visible={blockModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setBlockModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { borderColor: userRank.color }]}>
                        <View style={{ alignItems: 'center', marginBottom: 15 }}>
                            <View style={[styles.modalIconRing, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                <MaterialCommunityIcons name="shield-off-outline" size={32} color="#EF4444" />
                            </View>
                            <Text style={styles.modalTitle}>BLOCK USER</Text>
                            <Text style={styles.modalSubText}>
                                Restrict {targetUser?.name} from contacting you. This action will be reported for safety moderation.
                            </Text>
                        </View>

                        <Text style={styles.modalLabel}>REASON FOR REPORTING:</Text>
                        {blockReasons.map((reason, idx) => (
                            <TouchableOpacity 
                                key={idx} 
                                style={[styles.reasonBtn, { borderColor: userRank.color + '40' }]}
                                onPress={() => handleReasonSelect(reason)}
                                disabled={isBlocking}
                            >
                                <Text style={styles.reasonText}>{reason}</Text>
                                <Ionicons name="chevron-forward" size={16} color={userRank.color} />
                            </TouchableOpacity>
                        ))}

                        {isBlocking && (
                            <ActivityIndicator size="small" color="#EF4444" style={{ marginTop: 10 }} />
                        )}

                        <TouchableOpacity 
                            style={styles.cancelBtn} 
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
    container: { flex: 1, backgroundColor: '#000' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    shimmerOrb: { position: 'absolute', width: 400, height: 400, borderRadius: 200, opacity: 0.15 },
    parallaxAura: { position: 'absolute', width: 450, height: 450, borderRadius: 225 },
    imageWrapper: { width: '100%', height: height * 0.45, position: 'relative', overflow: 'visible' },
    profileImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    backBtn: { position: 'absolute', top: 55, left: 20, zIndex: 20 },
    blurBack: { padding: 10, borderRadius: 15, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    leftAvatarNode: { position: 'absolute', bottom: -55, left: 35, zIndex: 15 },
    avatarBorder: { width: 115, height: 115, borderRadius: 35, borderWidth: 3, padding: 3, backgroundColor: '#000', elevation: 20, shadowOpacity: 0.8, shadowRadius: 15 },
    syncedAvatarImg: { width: '100%', height: '100%', borderRadius: 30 },
    infoContent: { padding: 25, paddingTop: 75, borderTopLeftRadius: 45, borderTopRightRadius: 45, minHeight: height },
    topHeaderInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 35 },
    userName: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
    idLabel: { color: '#475569', fontSize: 10, fontWeight: '800', marginTop: 4, letterSpacing: 1.5 },
    rankBadgeMass: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 18, elevation: 15 }, 
    rankLabelMass: { color: '#FFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    dataNodeRow: { flexDirection: 'row', gap: 10, marginBottom: 35 },
    stealthNodeBase: { flex: 1, height: 110, borderRadius: 25, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }, 
    quadBorder: { ...StyleSheet.absoluteFillObject, borderLeftWidth: 3, borderRightWidth: 3, borderTopWidth: 1, borderBottomWidth: 1, borderRadius: 25 },
    dataLabel: { color: '#64748B', fontSize: 8, fontWeight: '900', letterSpacing: 1.5, marginTop: 10 },
    dataVal: { color: '#FFF', fontSize: 13, fontWeight: '800', marginTop: 3 },
    metricsWrapper: { marginBottom: 35, height: 90, borderRadius: 30, overflow: 'hidden', justifyContent: 'center' }, 
    metricsInner: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', zIndex: 10 },
    statItem: { alignItems: 'center' },
    divider: { width: 1, height: 30 },
    statNumber: { color: '#FFF', fontSize: 24, fontWeight: '900' },
    statSub: { color: '#64748B', fontSize: 8, marginTop: 4, fontWeight: '900', letterSpacing: 2 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
    glowBar: { width: 4, height: 18, borderRadius: 2 },
    sectionTitleText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 2.5 },
    bioContainer: { borderRadius: 30, padding: 22, overflow: 'hidden', position: 'relative' }, 
    glowTrail: { position: 'absolute', width: 80, height: '200%', top: '-50%', opacity: 0.1, transform: [{ rotate: '35deg' }] },
    quoteIcon: { position: 'absolute', top: 12, left: 12 },
    bioText: { color: '#E2E8F0', lineHeight: 24, fontSize: 14, fontWeight: '600', textAlign: 'justify', zIndex: 5 },
    hobbiesList: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    hobbyPill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 }, 
    hobbyLabel: { fontSize: 11, fontWeight: '900', letterSpacing: 1 },
    actionRowMass: { flexDirection: 'row', gap: 15, marginTop: 40, marginBottom: 10 },
    actionBtnMass: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 20, borderWidth: 1 },
    actionBtnTextMass: { fontSize: 12, fontWeight: '900', letterSpacing: 1 },
    trustBanner: { flexDirection: 'row', alignItems: 'center', marginTop: 25, gap: 10, alignSelf: 'center', paddingHorizontal: 22, paddingVertical: 15, borderRadius: 25, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
    trustLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 2 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#0F172A', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40, borderWidth: 1, borderBottomWidth: 0 },
    modalIconRing: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    modalTitle: { color: '#EF4444', fontSize: 20, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
    modalSubText: { color: '#94A3B8', fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 },
    modalLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
    reasonBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
    reasonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    cancelBtn: { marginTop: 15, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)' },
    cancelBtnText: { color: '#94A3B8', fontSize: 13, fontWeight: '900', letterSpacing: 1 }
});