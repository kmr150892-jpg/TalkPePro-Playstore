import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Application from 'expo-application';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { addDoc, arrayUnion, collection, deleteDoc, doc, getDoc, getDocs, increment, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useContext, useEffect, useRef, useState } from 'react'; // 🔥 SATTI UPDATE: Added useContext here
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    Modal,
    Platform,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { auth, db } from '../firebaseConfig';
import { BlockContext } from '../utils/context/BlockContext'; // 🔥 SATTI UPDATE: BlockContext Imported Here
import { checkAndRequestCallPermissions } from '../utils/permissions';

const { height, width } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// 🔥 MASS UPDATE: ACCURATE THEME ENGINE (LOCKED DEEP-GLOW COLORS)
const getLevelTheme = (beans: number = 0) => {
    if (beans >= 100000000) return { lvl: 10, label: 'LEGEND L10', color: '#ff0404', grad: ['#ff0404', '#df03ee'] as const, shadow: '#F59E0B60' };
    if (beans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', color: '#f40691', grad: ['#f40691', '#0a0303'] as const, shadow: '#EC489960' };
    if (beans >= 30000000) return { lvl: 8, label: 'ELITE L8', color: '#660aee', grad: ['#660aee', '#d40808'] as const, shadow: '#8B5CF660' };
    if (beans >= 10000000) return { lvl: 7, label: 'MASTER L7', color: '#0af635', grad: ['#0af635', '#fd068a'] as const, shadow: '#3B82F660' };
    if (beans >= 5000000) return { lvl: 6, label: 'DIAMOND L6', color: '#f70606', grad: ['#f70606', '#fad906'] as const, shadow: '#06B6D460' };
    if (beans >= 3000000) return { lvl: 5, label: 'PLATINUM L5', color: '#136a3e', grad: ['#136a3e', '#f6085b'] as const, shadow: '#10B98160' };
    if (beans >= 1000000) return { lvl: 4, label: 'GOLD L4', color: '#ffd001', grad: ['#ffd001', '#1d00f9'] as const, shadow: '#EAB30860' };
    if (beans >= 300000) return { lvl: 3, label: 'SILVER L3', color: '#bababa', grad: ['#bababa', '#bc0e08'] as const, shadow: '#94A3B860' };
    if (beans >= 100000) return { lvl: 2, label: 'BRONZE L2', color: '#ff8604', grad: ['#ff8604', '#1505fc'] as const, shadow: '#B4530960' };
    if (beans >= 30000) return { lvl: 1, label: 'ROOKIE L1', color: '#03ffc8', grad: ['#03ffc8', '#f64a06'] as const, shadow: '#6366F160' };
    return { lvl: 0, label: 'BEGINNER L0', color: '#f807cf', grad: ['#f807cf', '#2a06f5'] as const, shadow: '#764a7560' };
};

export default function ExpertDetail() {
    const params = useLocalSearchParams();
    const expertId = (params.id || params.userId) as string; 
    
    const router = useRouter();
    const user = auth.currentUser;

    const { blockUser } = useContext(BlockContext); // 🔥 SATTI UPDATE: Context initialized

    const [expert, setExpert] = useState<any>(null);
    const [isCalling, setIsCalling] = useState(false);
    const [userBalance, setUserBalance] = useState(0);
    const [loading, setLoading] = useState(true);
    const [activeCallId, setActiveCallId] = useState<string | null>(null);
    
    // 🔥 SATTI FIX: Added a Ref to strictly track call ID in case user presses BACK button abruptly.
    const activeCallIdRef = useRef<string | null>(null); 
    
    const [userData, setUserData] = useState<any>(null);
    const [connectionStatus, setConnectionStatus] = useState<string | null>(null); 
    const [followLoading, setFollowLoading] = useState(false);
    const [isBlockedByExpert, setIsBlockedByExpert] = useState(false);

    // 🔥 SATTI UPDATE: Block & Report Admin Setup
    const [blockModalVisible, setBlockModalVisible] = useState(false);
    const [isBlocking, setIsBlocking] = useState(false);
    const blockReasons = [
        "Abusive Language / Harassment",
        "Inappropriate Behavior / Nudity",
        "Scam / Spam / Phishing",
        "Threatening / Aggressive",
        "Other Unwanted Contact"
    ];

    const unsubCallRef = useRef<(() => void) | null>(null);
    const ringTimerAnim = useRef(new Animated.Value(1)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current; 
    const radius = 75;
    const stroke = 6;
    const circumference = radius * 2 * Math.PI;

    const getJoinedDuration = (createdAt: any) => {
        if (!createdAt) return '1 Day';
        const joinedDate = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - joinedDate.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return '1 Day';
        if (diffDays < 30) return `${diffDays} Days`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} Mo`;
        return `${Math.floor(diffDays / 365)} Yr`;
    };

    const onShare = async () => {
        try {
            await Share.share({
                message: `Connect with ${expert?.name} on TALKPE PRO! Verified Professional Host. Download now!`,
                url: `https://talkpe.com/expert/${expertId}`,
            });
        } catch (error: any) { Alert.alert(error.message); }
    };

    // 🔥 SATTI FIX: UNMOUNT SAFETY. Stops the call if user leaves the screen without pressing Cancel.
    useEffect(() => {
        return () => {
            if (activeCallIdRef.current) {
                // Keep local reference to avoid closure issues
                const cid = activeCallIdRef.current;
                updateDoc(doc(db, "calls", cid), { 
                    status: 'cancelled',
                    updatedAt: serverTimestamp(),
                    endedAt: serverTimestamp()
                }).catch(e => console.log("Unmount cancel error: ", e));
            }
        };
    }, []);

    useEffect(() => {
        Animated.loop(
            Animated.timing(shimmerAnim, {
              toValue: 1,
              duration: 4000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true
            })
        ).start();

        if (!expertId) {
            setLoading(false);
            return;
        }

        const unsubExpert = onSnapshot(doc(db, 'users', expertId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.blockedUsers?.includes(user?.uid)) {
                    setIsBlockedByExpert(true);
                    setLoading(false);
                    return; 
                }
                setIsBlockedByExpert(false);
                setExpert({ id: docSnap.id, ...data });
            }
            setLoading(false);
        });

        let unsubUser: () => void;
        let unsubFollow: () => void;

        if (user?.uid) {
            unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setUserData(data);
                    setUserBalance(data.balance || 0);
                }
            });

            const connectionId = `${user.uid}_${expertId}`;
            unsubFollow = onSnapshot(doc(db, "connections", connectionId), (docSnap) => {
                if (docSnap.exists()) setConnectionStatus(docSnap.data().status); 
                else setConnectionStatus(null);
            });
        }
        
        return () => { 
            unsubExpert(); 
            if (unsubUser) unsubUser(); 
            if (unsubFollow) unsubFollow();
            if (unsubCallRef.current) unsubCallRef.current();
        };
    }, [expertId, user]);

    // 🔥 SATTI UPDATE: Block & Admin Report Core Engine 🔥
    const handleReasonSelect = (reason: string) => {
        if (!expert || !user) return;

        const alreadyBlocked = Array.isArray(userData?.blockedUsers) && userData.blockedUsers.includes(expertId);
        
        if (alreadyBlocked) {
            Alert.alert(
                "ACTION RESTRICTED", 
                "This host is already in your blacklist. Please manage them via Security Settings if you wish to restore access."
            );
            setBlockModalVisible(false);
            return;
        }

        Alert.alert(
            "CONFIRM BLOCK",
            `Are you sure you want to block ${expert.name}?\n\nReason: ${reason}`,
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
        const myUid = user!.uid;

        try {
            // Update my doc
            await updateDoc(doc(db, "users", myUid), { blockedUsers: arrayUnion(expertId) });
            // Update expert's block count
            await updateDoc(doc(db, "users", expertId), { expertBlockCount: increment(1) });
            
            // Push alert to admin
            await addDoc(collection(db, "admin_alerts"), {
                type: 'USER_BLOCKED_EXPERT', 
                expertId: expertId, 
                expertName: expert.name || "Unknown Expert",
                userId: myUid, 
                userName: userData?.name || user?.displayName || "TalkPe User", 
                reason: reason,
                timestamp: serverTimestamp(), 
                status: 'unread'
            });

            // Trigger local context block to clear app feeds
            blockUser(expertId); 

            Alert.alert("HOST BLOCKED", `${expert.name} has been successfully restricted and reported to safety moderation.`, [
                { text: "OK", onPress: () => router.back() }
            ]);
        } catch (error) {
            Alert.alert("SYSTEM ERROR", "Unable to complete blocking protocol. Please check your connection.");
        } finally {
            setIsBlocking(false); 
            setBlockModalVisible(false);
        }
    };

    const handleFollowAction = async () => {
        if (!user) return Alert.alert("Login Required", "Please login to connect with hosts.");
        if (connectionStatus === 'friend') return router.push('/friends' as any);
        if (!userData) return Alert.alert("Wait", "User data is loading...");

        setFollowLoading(true);
        const connectionId = `${user.uid}_${expertId}`;
        try {
            if (connectionStatus === null) {
                await setDoc(doc(db, "connections", connectionId), {
                    senderId: user.uid,
                    senderName: userData.userName || userData.name || "TalkPe Pro User",
                    senderImage: userData.profilePic || userData.profileImage || "",
                    receiverId: expertId,
                    status: "pending",
                    timestamp: serverTimestamp(),
                });
                Alert.alert("Sent", "Connection request sent!");
            } else {
                await deleteDoc(doc(db, "connections", connectionId));
            }
        } catch (error) { console.error(error); } finally { setFollowLoading(false); }
    };

    const handleCancelCall = async () => {
        ringTimerAnim.stopAnimation();
        
        // 🔥 SATTI FIX: Grab the active ID from both state and ref for 100% reliability BEFORE clearing it
        const cid = activeCallId || activeCallIdRef.current;
        
        if (unsubCallRef.current) {
            unsubCallRef.current();
            unsubCallRef.current = null;
        }

        if (cid) {
            try { 
                await updateDoc(doc(db, "calls", cid), { 
                    status: 'cancelled',
                    updatedAt: serverTimestamp(), // 🔥 This tells Backend to stop the host's ring notification!
                    endedAt: serverTimestamp() 
                }); 
            } catch (err) { console.error(err); }
        }

        setIsCalling(false);
        deactivateKeepAwake();
        setActiveCallId(null);
        activeCallIdRef.current = null; // Syncing the ref AFTER database update
    };

    const handleStartCall = async () => {
        if (!expert?.isOnline) return Alert.alert("Host Offline 💤", "This host is currently offline.");
        
        if (expert?.status === 'live' || expert?.isLive === true || expert?.isLive === "true") {
            return Alert.alert("Host is Live 🔴", "This host is currently hosting a live broadcast. Please join the session instead.");
        }
        
        if (expert?.isBusy === true || expert?.isBusy === "true") {
            return Alert.alert("Host is Busy ⏳", `${expert.name} is currently assisting another user. Please try again shortly.`);
        }

        const hasPermission = await checkAndRequestCallPermissions();
        if (!hasPermission) {
            return; 
        }

        if (!userData || (!userData.name && !userData.userName)) return Alert.alert("Syncing Profile...", "Please wait a moment.");
        
        const priceToCharge = Number(expert.userPrice || (expert.beansPerMin * 2) || (expert.pricePerMin * 2) || 2400);
        
        const validFreeMins = Number(userData?.freeMinsRemaining || 0);
        const isFreeCall = (userData?.isWelcomeCallAvailable === true) || (validFreeMins > 0.05);

        if (!isFreeCall && userBalance < priceToCharge) {
            Alert.alert("Insufficient Assets! 💎", `Requires ${priceToCharge.toLocaleString()} diamonds for a 1 min call.`, [
                { text: "Later", style: "cancel" }, { text: "Add Assets", onPress: () => router.push('/recharge' as any) }
            ]);
            return;
        }

        const proceedToCall = async () => {
            setIsCalling(true);

            if (isFreeCall) {
                try {
                    let deviceId = "unknown_device";
                    if (Platform.OS === 'android') {
                        deviceId = Application.getAndroidId() || "android_unknown";
                    } else if (Platform.OS === 'ios') {
                        deviceId = await Application.getIosIdForVendorAsync() || "ios_unknown";
                    }

                    const deviceRef = doc(db, "used_devices", deviceId);
                    const deviceSnap = await getDoc(deviceRef);

                    if (deviceSnap.exists()) {
                        const deviceData = deviceSnap.data();
                        
                        if (deviceData.userId !== user?.uid) {
                            setIsCalling(false);
                            Alert.alert(
                                "Privilege Claimed 🚫", 
                                "This device has already utilized the Complimentary Call on another account. Please add assets to continue consulting.",
                                [
                                    { text: "Cancel", style: "cancel" },
                                    { text: "Add Assets", onPress: () => router.push('/recharge' as any) }
                                ]
                            );
                            
                            if (user) {
                                await updateDoc(doc(db, "users", user.uid), {
                                    isWelcomeCallAvailable: false,
                                    freeMinsRemaining: 0
                                });
                            }
                            return; 
                        }
                    } else {
                        await setDoc(deviceRef, {
                            usedAt: serverTimestamp(),
                            userId: user?.uid,
                            hardwareId: deviceId
                        });
                    }
                } catch (e) {
                    console.log("Device security verification error:", e);
                }
            }

            initiateCall(priceToCharge, isFreeCall);
        };

        if (isFreeCall) {
            Alert.alert(
                "Welcome Privilege! 🎉", 
                "You have a COMPLIMENTARY call available. Do you want to use it now?",
                [
                    { text: "Not Now", style: "cancel" },
                    { text: "Yes, Start Session", onPress: proceedToCall }
                ]
            );
        } else {
            proceedToCall();
        }
    };

    const initiateCall = async (priceToCharge: number, isFreeCall: boolean) => {
        await activateKeepAwakeAsync(); 
        try {
            const callRef = await addDoc(collection(db, "calls"), {
                callerId: user?.uid || "UNKNOWN_USER",
                callerName: userData?.userName || userData?.name || "TalkPe Pro User",
                callerImage: userData?.profilePic || userData?.profileImage || "",
                expertId: expert.id,
                expertName: expert.name,
                expertImage: expert.profilePic || expert.expertImage || expert.profileImage || "",
                status: 'calling', 
                
                userId: user?.uid,
                userName: userData?.userName || userData?.name || "TalkPe Pro User",
                userImage: userData?.profilePic || userData?.profileImage || "",
                pricePerMin: isFreeCall ? 0 : priceToCharge, 
                isFreeCall: isFreeCall, 
                isFreeTrial: isFreeCall, 
                createdAt: serverTimestamp(), 
                totalDiamonds: 0,
                expertEarnings: 0,
                finalDuration: 0
            });

            // 🔥 SATTI FIX: Save to both state and ref
            setActiveCallId(callRef.id);
            activeCallIdRef.current = callRef.id;

            ringTimerAnim.setValue(1);
            Animated.timing(ringTimerAnim, {
                toValue: 0,
                duration: 12000,
                easing: Easing.linear,
                useNativeDriver: false,
            }).start(({ finished }) => {
                if (finished) handleTimeout(callRef.id);
            });

            unsubCallRef.current = onSnapshot(doc(db, "calls", callRef.id), (snap) => {
                if (snap.exists()) {
                    const callData = snap.data();
                    if (callData.status === 'accepted') {
                        if (unsubCallRef.current) unsubCallRef.current();
                        unsubCallRef.current = null;
                        ringTimerAnim.stopAnimation();
                        setIsCalling(false);
                        deactivateKeepAwake();
                        
                        // 🔥 Clear state and ref securely
                        setActiveCallId(null);
                        activeCallIdRef.current = null;
                        
                        router.push({
                            pathname: "/videocall",
                            params: { 
                                expertId: expert.id, 
                                expertName: expert.name, 
                                price: isFreeCall ? 0 : priceToCharge, 
                                callId: callRef.id,
                                isFree: isFreeCall ? "true" : "false" 
                            }
                        } as any);
                    } else if (['rejected', 'missed', 'cancelled', 'timeout'].includes(callData.status)) {
                        if (unsubCallRef.current) unsubCallRef.current();
                        unsubCallRef.current = null;
                        ringTimerAnim.stopAnimation();
                        setIsCalling(false);
                        deactivateKeepAwake();
                        
                        // 🔥 Clear state and ref securely
                        setActiveCallId(null);
                        activeCallIdRef.current = null;
                        
                        if (callData.status === 'rejected') Alert.alert("Engaged", "The host is currently engaged.");
                    }
                }
            });
        } catch (err) {
            setIsCalling(false);
            Alert.alert("Error", "Could not initiate call session.");
        }
    };

    const handleTimeout = async (cid: string) => {
        try {
            if (unsubCallRef.current) { unsubCallRef.current(); unsubCallRef.current = null; }
            await updateDoc(doc(db, "calls", cid), { 
                status: 'missed',
                updatedAt: serverTimestamp() // 🔥 Notifies backend even on timeouts
            });
            setIsCalling(false);
            deactivateKeepAwake();
            setActiveCallId(null);
            activeCallIdRef.current = null;
        } catch (e) { console.log(e); }
    };

    const handleJoinLive = async () => {
        try {
            const liveQuery = query(collection(db, "lives"), where("hostId", "==", expert.id), where("status", "==", "live"));
            const liveSnap = await getDocs(liveQuery);

            if (!liveSnap.empty) {
                const actualLiveId = liveSnap.docs[0].id;
                router.push({
                    pathname: '/live/[liveId]' as any, 
                    params: { liveId: actualLiveId }
                });
            } else {
                Alert.alert("Broadcast Concluded", "Host is not currently broadcasting or the session has concluded.");
            }
        } catch (e) {
            Alert.alert("Error", "Could not join the live session right now.");
        }
    };

    if (loading) return <View style={styles.loader}><ActivityIndicator size="large" color="#6366F1" /></View>;

    if (isBlockedByExpert) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <Ionicons name="eye-off-outline" size={80} color="#1E293B" />
                <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '900', marginTop: 20 }}>Profile Not Available</Text>
                <Text style={{ color: '#64748B', textAlign: 'center', marginTop: 10 }}>This account is currently restricted. Please explore other hosts.</Text>
                <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 30, backgroundColor: '#334155', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 15 }}><Text style={{ color: '#FFF', fontWeight: 'bold' }}>Go Back</Text></TouchableOpacity>
            </View>
        );
    }

    const theme = getLevelTheme(expert?.totalBeansEarned || 0);
    const accentColor = expert?.isOnline ? theme.color : '#475569';
    const isExpertLive = expert?.status === 'live' || expert?.isLive === true || expert?.isLive === "true"; 
    const followThemeColor = connectionStatus === 'friend' ? '#1E293B' : (connectionStatus === 'pending' ? '#F59E0B' : theme.color);

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -30]
    });

    const borderType1 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: theme.color,
        borderRightColor: theme.color,
        borderTopColor: theme.grad[1] + '80', 
        borderBottomColor: theme.grad[1] + '80', 
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    const borderType2 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: theme.grad[1],
        borderRightColor: theme.grad[1],
        borderTopColor: theme.color + '80',
        borderBottomColor: theme.color + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.45)',
    };

    const validFreeMinsUI = Number(userData?.freeMinsRemaining || 0);
    const hasFreeCallUI = (userData?.isWelcomeCallAvailable === true) || (validFreeMinsUI > 0.05);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            
            <LinearGradient colors={['#020617', theme.grad[1] + '30', '#020617']} style={StyleSheet.absoluteFill} />
            <Animated.View style={[styles.shimmerOrb, { top: 250, right: -60, backgroundColor: theme.color, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 600, left: -90, backgroundColor: theme.grad[1], transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            {isCalling && (
                <View style={styles.callingOverlay}>
                    <LinearGradient colors={['rgba(2, 6, 23, 0.98)', '#0F172A']} style={StyleSheet.absoluteFill} />
                    <View style={styles.timerWrapper}>
                        <Svg width={(radius + stroke) * 2} height={(radius + stroke) * 2} style={styles.timerSvg}>
                            <Circle cx={radius + stroke} cy={radius + stroke} r={radius} stroke="rgba(255,255,255,0.05)" strokeWidth={stroke} fill="transparent" />
                            <AnimatedCircle
                                cx={radius + stroke} cy={radius + stroke} r={radius} stroke={theme.color} strokeWidth={stroke} fill="transparent"
                                strokeDasharray={circumference}
                                strokeDashoffset={ringTimerAnim.interpolate({ inputRange: [0, 1], outputRange: [circumference, 0] })}
                                strokeLinecap="round"
                            />
                        </Svg>
                        <View style={styles.callingAvatarContainer}><Image source={{ uri: expert?.profilePic || expert?.profileImage || 'https://via.placeholder.com/400' }} style={styles.callingAvatar} /></View>
                    </View>
                    <Text style={styles.callingText}>Connecting to {expert?.name}...</Text>
                    <Text style={styles.callingSubtext}>Establishing Secure Link... 💎</Text>
                    <TouchableOpacity style={styles.cancelCallBtn} onPress={handleCancelCall}>
                        <View style={styles.cancelCircle}><Ionicons name="close" size={32} color="#FFF" /></View>
                        <Text style={styles.cancelLabel}>CANCEL</Text>
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 150 }}>
                <View style={styles.imageWrapper}>
                    <Image source={{ uri: expert?.coverPhoto || expert?.profilePic || 'https://via.placeholder.com/600x800' }} style={styles.profileImg} />
                    <LinearGradient colors={['rgba(2, 6, 23, 0.4)', 'transparent', '#020617']} style={StyleSheet.absoluteFill} />
                    
                    <View style={styles.coverAvatarNode}>
                         <LinearGradient colors={theme.grad} style={styles.avatarRing}>
                             <Image 
                                 source={{ uri: expert?.profilePic || expert?.profileImage || 'https://via.placeholder.com/150' }} 
                                 style={styles.expertMainAvatar} 
                             />
                         </LinearGradient>
                         <LinearGradient colors={theme.grad} style={styles.avatarLevelBadge}>
                             <Text style={styles.avatarLevelText}>{theme.label}</Text>
                         </LinearGradient>
                    </View>

                    <View style={styles.navRow}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.iconCircle}><Ionicons name="chevron-back" size={24} color="#FFF" /></TouchableOpacity>
                        
                        {/* 🔥 SATTI UPDATE: Changed to Block & Report Modal Trigger */}
                        <View style={{ flexDirection: 'row', gap: 12 }}>
                            <TouchableOpacity onPress={() => setBlockModalVisible(true)} style={styles.iconCircle}>
                                <MaterialCommunityIcons name="shield-off" size={22} color="#EF4444" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onShare} style={styles.iconCircle}>
                                <Ionicons name="share-social-outline" size={22} color="#FFF" />
                            </TouchableOpacity>
                        </View>

                    </View>
                </View>

                <View style={styles.infoContent}>
                    <View style={styles.nameRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.expertName}>{expert?.name}</Text>
                            <View style={styles.locationRow}>
                                <Ionicons name="location-sharp" size={14} color={theme.color} />
                                <Text style={styles.locationText}>{expert?.location || 'India'} • {expert?.age || '24'}y • {expert?.gender}</Text>
                            </View>
                        </View>
                        <View style={{ alignItems: 'flex-end', gap: 10 }}>
                            <View style={[styles.statusBadge, { backgroundColor: expert?.isOnline ? '#10B98115' : '#33415520', borderColor: expert?.isOnline ? '#10B98130' : '#334155', borderWidth: 1 }]}>
                                <View style={[styles.dot, { backgroundColor: expert?.isOnline ? '#10B981' : '#94A3B8' }]} />
                                <Text style={[styles.statusText, {color: expert?.isOnline ? '#10B981' : '#94A3B8'}]}>{expert?.isOnline ? 'ONLINE' : 'OFFLINE'}</Text>
                            </View>
                            <TouchableOpacity 
                                style={[styles.followBtn, { backgroundColor: followThemeColor }]} 
                                onPress={handleFollowAction} disabled={followLoading}>
                                {followLoading ? <ActivityIndicator size="small" color="#FFF" /> : (
                                    <>
                                        <MaterialCommunityIcons name={connectionStatus === 'friend' ? "account-check" : connectionStatus === 'pending' ? "account-clock" : "account-plus"} size={18} color="#FFF" />
                                        <Text style={styles.followBtnText}>{connectionStatus === 'friend' ? "Connected" : connectionStatus === 'pending' ? "Waiting" : "Connect"}</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={[styles.statsCard, borderType1]}>
                        <View style={styles.statBox}>
                            <Text style={[styles.statVal, { color: theme.color }]} numberOfLines={1} adjustsFontSizeToFit>{theme.label.split(' ')[0]}</Text>
                            <Text style={styles.statLabel}>Host Tier</Text>
                        </View>
                        <View style={styles.vDivider} />
                        <View style={styles.statBox}>
                            <View style={styles.priceContainer}>
                                <MaterialCommunityIcons name="diamond-stone" size={18} color={theme.color} />
                                <Text style={[styles.statVal, { fontSize: 22 }]} numberOfLines={1} adjustsFontSizeToFit>{Number(expert?.userPrice || (expert?.beansPerMin * 2) || 0).toLocaleString()}</Text>
                            </View>
                            <Text style={styles.statLabel}>Per Minute Fee</Text>
                        </View>
                        <View style={styles.vDivider} />
                        <View style={styles.statBox}>
                            <Text style={styles.statVal} numberOfLines={1} adjustsFontSizeToFit>{getJoinedDuration(expert?.createdAt)}</Text>
                            <Text style={styles.statLabel}>Platform Tenure</Text>
                        </View>
                    </View>

                    {expert?.expertiseTags && expert.expertiseTags.length > 0 && (
                        <View style={styles.chipSection}>
                            <Text style={[styles.sectionTitle, { color: theme.color }]}>Expertise In</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                                {expert.expertiseTags.map((tag: string, index: number) => (
                                    <View key={index} style={[styles.chipItem, { borderColor: `${theme.color}40` }]}>
                                        <Text style={[styles.chipText, { color: theme.color }]}>{tag.toUpperCase()}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <Text style={[styles.sectionTitle, { marginTop: 15, color: theme.color }]}>Professional Overview</Text>
                    <View style={[styles.bioContainer, borderType2]}>
                        <MaterialCommunityIcons name="format-quote-open" size={24} color={theme.color + '40'} style={styles.quoteIcon} />
                        <Text style={styles.bioText}>{expert?.bio || "Professional host dedicated to providing high-quality guidance and support."}</Text>
                    </View>

                    {expert?.hobbies && expert.hobbies.length > 0 && (
                        <View style={[styles.chipSection, { marginTop: 25 }]}>
                            <Text style={[styles.sectionTitle, { color: theme.color }]}>Personal Interests</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
                                {expert.hobbies.map((tag: string, index: number) => (
                                    <View key={index} style={styles.hobbyChip}><Text style={styles.hobbyText}>{tag}</Text></View>
                                ))}
                            </ScrollView>
                        </View>
                    )}

                    <View style={[styles.sectionHeaderRow, { marginTop: 25 }]}>
                        <Text style={[styles.sectionTitle, { color: theme.color }]}>Portfolio Visuals</Text>
                        <Text style={styles.galleryCount}>{expert?.gallery?.length || 0}/5 SECURE</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryScroll}>
                        {expert?.gallery?.length > 0 ? expert.gallery.map((img: string, index: number) => (
                            <View key={index} style={[styles.galleryItem, borderType1, { padding: 4, borderRadius: 25 }]}><Image source={{ uri: img }} style={styles.galleryImg} /></View>
                        )) : <View style={styles.emptyGallery}><Text style={styles.emptyText}>No visual data found</Text></View>}
                    </ScrollView>

                    <View style={[styles.trustBanner, borderType1]}>
                        <MaterialCommunityIcons name="shield-lock" size={20} color={theme.color} />
                        <Text style={[styles.trustText, { color: theme.color }]}>Quantum Secure End-to-End Encryption</Text>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.bottomBar}>
                {isExpertLive ? (
                    <TouchableOpacity style={styles.liveActionBtn} onPress={handleJoinLive}>
                        <LinearGradient colors={['#EF4444', '#991B1B']} style={styles.btnGradient}>
                            <MaterialCommunityIcons name="access-point" size={26} color="#FFF" />
                            <View>
                                <Text style={styles.callBtnText}>JOIN LIVE SESSION</Text>
                                <Text style={{color: '#FFF', fontSize: 10, fontWeight: '900'}}>TAP TO CONNECT</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <>
                        <View style={styles.priceInfo}>
                            <Text style={styles.totalLabel}>CALL FEE</Text>
                            <View style={styles.priceRow}>
                                <Ionicons name="diamond" size={18} color={accentColor} />
                                <Text style={[styles.totalVal, { color: accentColor }]} numberOfLines={1} adjustsFontSizeToFit>
                                    {hasFreeCallUI ? "COMPLIMENTARY" : Number(expert?.userPrice || (expert?.beansPerMin * 2) || 0).toLocaleString()}
                                    {!hasFreeCallUI && <Text style={{fontSize: 12, color: '#475569'}}>/min</Text>}
                                </Text>
                            </View>
                        </View>
                        
                        <TouchableOpacity 
                            style={styles.callBtn} 
                            onPress={handleStartCall} 
                            disabled={!expert?.isOnline || expert?.isBusy === true || expert?.isBusy === "true"}
                        >
                            <LinearGradient 
                                colors={
                                    !expert?.isOnline ? (['#1E293B', '#0F172A'] as const) : 
                                    (expert?.isBusy === true || expert?.isBusy === "true") ? (['#F59E0B', '#B45309'] as const) : 
                                    theme.grad
                                } 
                                style={styles.btnGradient}
                            >
                                <Ionicons name={!expert?.isOnline ? "videocam-off" : (expert?.isBusy === true || expert?.isBusy === "true") ? "time" : "videocam"} size={22} color={expert?.isOnline ? "#FFF" : "#475569"} />
                                <Text style={[styles.callBtnText, !expert?.isOnline && { color: '#475569' }]}>
                                    {!expert?.isOnline ? "Offline" : (expert?.isBusy === true || expert?.isBusy === "true") ? "Engaged" : "CONNECT NOW"}
                                </Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </>
                )}
            </View>

            {/* 🔥 SATTI UPDATE: BLOCK & REPORT MODAL UI 🔥 */}
            <Modal
                visible={blockModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setBlockModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContainer, { borderColor: theme.color }]}>
                        <View style={{ alignItems: 'center', marginBottom: 15 }}>
                            <View style={[styles.modalIconRing, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                <MaterialCommunityIcons name="shield-off-outline" size={32} color="#EF4444" />
                            </View>
                            <Text style={styles.modalTitle}>BLOCK HOST</Text>
                            <Text style={styles.modalSubText}>
                                Restrict {expert?.name} from contacting you or showing in your feed. This action will be reported for safety moderation.
                            </Text>
                        </View>

                        <Text style={styles.modalLabel}>REASON FOR REPORTING:</Text>
                        {blockReasons.map((reason, idx) => (
                            <TouchableOpacity 
                                key={idx} 
                                style={[styles.reasonBtn, { borderColor: theme.color + '40' }]}
                                onPress={() => handleReasonSelect(reason)}
                                disabled={isBlocking}
                            >
                                <Text style={styles.reasonText}>{reason}</Text>
                                <Ionicons name="chevron-forward" size={16} color={theme.color} />
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
    container: { flex: 1, backgroundColor: '#020617' },
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
    imageWrapper: { width: '100%', height: height * 0.40, position: 'relative', overflow: 'visible' },
    profileImg: { width: '100%', height: '100%', resizeMode: 'cover' },
    coverAvatarNode: { position: 'absolute', bottom: -45, left: '50%', marginLeft: -50, zIndex: 11, alignItems: 'center', justifyContent: 'center' },
    avatarRing: { padding: 4, borderRadius: 60, elevation: 10 },
    expertMainAvatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#020617' },
    avatarLevelBadge: { position: 'absolute', bottom: -8, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, borderWidth: 2, borderColor: '#020617' },
    avatarLevelText: { color: '#FFF', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
    navRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 55, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    iconCircle: { backgroundColor: 'rgba(2, 6, 23, 0.4)', padding: 12, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
    infoContent: { padding: 25, paddingTop: 65, minHeight: height },
    nameRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    expertName: { color: '#FFF', fontSize: 32, fontWeight: '900', letterSpacing: -0.5 },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
    locationText: { color: '#94A3B8', fontSize: 14, fontWeight: '700' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, gap: 8 },
    followBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, gap: 8, elevation: 5 },
    followBtnText: { color: '#FFF', fontSize: 12, fontWeight: '900' },
    dot: { width: 8, height: 8, borderRadius: 4 },
    statusText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    statsCard: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginVertical: 30, paddingVertical: 25, borderRadius: 35, width: width - 40, alignSelf: 'center' },
    statBox: { flex: 1, alignItems: 'center', paddingHorizontal: 5 },
    priceContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center' },
    vDivider: { width: 1, height: '60%', backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'center' },
    statVal: { color: '#FFF', fontSize: 19, fontWeight: '900', textAlign: 'center' },
    statLabel: { color: '#64748B', fontSize: 10, marginTop: 8, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1, textAlign: 'center' },
    chipSection: { marginBottom: 15 },
    chipScroll: { paddingRight: 20, gap: 10, paddingVertical: 12 },
    chipItem: { backgroundColor: 'rgba(255, 255, 255, 0.03)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 25, borderWidth: 1 },
    chipText: { fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
    hobbyChip: { backgroundColor: 'rgba(15, 23, 42, 0.6)', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#1E293B' },
    hobbyText: { color: '#94A3B8', fontSize: 12, fontWeight: '700' },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
    sectionTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 0.2 },
    galleryCount: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    galleryScroll: { flexDirection: 'row', marginBottom: 10 },
    galleryItem: { marginRight: 15, borderRadius: 25, overflow: 'hidden', elevation: 10 },
    galleryImg: { width: 130, height: 180, resizeMode: 'cover', borderRadius: 20 },
    emptyGallery: { width: width - 50, height: 120, backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 30, justifyContent: 'center', alignItems: 'center', borderStyle: 'dashed', borderWidth: 1, borderColor: '#1E293B' },
    emptyText: { color: '#475569', fontSize: 12, fontWeight: '700' },
    bioContainer: { padding: 25, borderRadius: 35, marginTop: 15, position: 'relative' },
    quoteIcon: { position: 'absolute', top: 15, left: 18 },
    bioText: { color: '#94A3B8', lineHeight: 26, fontSize: 15, fontWeight: '600', paddingLeft: 8 },
    trustBanner: { flexDirection: 'row', alignItems: 'center', padding: 22, borderRadius: 30, marginTop: 35, gap: 12 },
    trustText: { fontSize: 12, fontWeight: '800' },
    callingOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 9999, justifyContent: 'center', alignItems: 'center' },
    timerWrapper: { width: 200, height: 200, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
    timerSvg: { position: 'absolute', transform: [{ rotate: '-90deg' }] },
    callingAvatarContainer: { width: 150, height: 150, borderRadius: 75, overflow: 'hidden', borderWidth: 4, borderColor: '#020617', elevation: 25 },
    callingAvatar: { width: '100%', height: '100%' },
    callingText: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: 0.5 },
    callingSubtext: { color: '#6366F1', marginTop: 10, fontSize: 15, fontWeight: '800', letterSpacing: 1 },
    cancelCallBtn: { marginTop: 80, alignItems: 'center' },
    cancelCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', elevation: 20, shadowColor: '#EF4444', shadowOpacity: 0.5, shadowRadius: 15 },
    cancelLabel: { color: '#EF4444', marginTop: 15, fontWeight: '900', fontSize: 13, letterSpacing: 3 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 22, paddingBottom: Platform.OS === 'ios' ? 45 : 30, backgroundColor: 'rgba(15, 23, 42, 0.95)', borderTopLeftRadius: 40, borderTopRightRadius: 40, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)', elevation: 30 },
    priceInfo: { flex: 1 },
    totalLabel: { color: '#475569', fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'nowrap' },
    totalVal: { color: '#FFF', fontSize: 26, fontWeight: '900', flexShrink: 1 },
    callBtn: { width: '58%', height: 65, borderRadius: 32, overflow: 'hidden', elevation: 15 },
    btnGradient: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 12 },
    callBtnText: { color: '#FFF', fontSize: 18, fontWeight: '900', letterSpacing: 0.5 },
    liveActionBtn: { flex: 1, height: 68, borderRadius: 35, overflow: 'hidden', elevation: 15 },

    // 🔥 SATTI UPDATE: MODAL STYLES 🔥
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'flex-end' },
    modalContainer: { backgroundColor: '#0F172A', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 25, paddingBottom: 40, borderWidth: 1, borderBottomWidth: 0 },
    modalIconRing: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
    modalTitle: { color: '#EF4444', fontSize: 20, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
    modalSubText: { color: '#94A3B8', fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 20, paddingHorizontal: 10 },
    modalLabel: { color: '#64748B', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginBottom: 15 },
    reasonBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 16, borderRadius: 16, marginBottom: 10, borderWidth: 1 },
    reasonText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    cancelActionBtn: { marginTop: 15, padding: 16, alignItems: 'center', borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)' },
    cancelBtnText: { color: '#94A3B8', fontSize: 13, fontWeight: '900', letterSpacing: 1 }
});