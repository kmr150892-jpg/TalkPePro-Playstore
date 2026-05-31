import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { arrayUnion, collection, doc, limit, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    Image,
    Modal,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';

// --- COMPONENTS ---
import ExpertNotificationBar from '../../components/ExpertNotificationBar';
import ConsoleHome from './components/ConsoleHome';
import ExpertStats from './components/ExpertStats';
import LevelInsights from './components/LevelInsights';
import WalletSystem from './components/WalletSystem';
import ExpertMessages from './ExpertMessages';

const { width, height } = Dimensions.get('window');

// ✅ ACCURATE THEME & LEVEL CONFIG
const getLevelConfig = (userData: any) => {
    const getObj = (lvl: number) => {
        if (lvl >= 10) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'] as const, glow: '#F59E0B', next: 0, prev: 50000000, rate: 8000 };
        if (lvl === 9) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'] as const, glow: '#EC4899', next: 100000000, prev: 30000000, rate: 7000 };
        if (lvl === 8) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'] as const, glow: '#8B5CF6', next: 50000000, prev: 10000000, rate: 5400 };
        if (lvl === 7) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'] as const, glow: '#3B82F6', next: 30000000, prev: 5000000, rate: 4800 };
        if (lvl === 6) return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'] as const, glow: '#06B6D4', next: 10000000, prev: 3000000, rate: 4200 };
        if (lvl === 5) return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'] as const, glow: '#10B981', next: 5000000, prev: 1000000, rate: 3600 };
        if (lvl === 4) return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'] as const, glow: '#EAB308', next: 3000000, prev: 300000, rate: 3000 };
        if (lvl === 3) return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'] as const, glow: '#94A3B8', next: 1000000, prev: 100000, rate: 2400 };
        if (lvl === 2) return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'] as const, glow: 'transparent', next: 300000, prev: 30000, rate: 1800 };
        if (lvl === 1) return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'] as const, glow: 'transparent', next: 100000, prev: 0, rate: 1200 };
        return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'] as const, glow: 'transparent', next: 30000, prev: 0, rate: 1000 };
    };

    const rawLvl = userData?.expertLevel ?? userData?.currentLevel ?? userData?.level;
    if (rawLvl !== undefined && rawLvl !== null) {
        if (typeof rawLvl === 'number') return getObj(rawLvl);
        if (typeof rawLvl === 'string') {
            const levelMatch = rawLvl.match(/\d+/);
            if (levelMatch) return getObj(parseInt(levelMatch[0], 10));
        }
    }

    const title = String(userData?.levelTitle || '').toUpperCase();
    if (title) {
        const titleMatch = title.match(/\d+/);
        if (titleMatch) return getObj(parseInt(titleMatch[0], 10));
    }

    const beans = Number(userData?.totalBeansEarned) || Number(userData?.beans) || 0;
    if (beans >= 100000000) return getObj(10);
    if (beans >= 50000000) return getObj(9);
    if (beans >= 30000000) return getObj(8);
    if (beans >= 10000000) return getObj(7);
    if (beans >= 5000000)  return getObj(6);
    if (beans >= 3000000)  return getObj(5);
    if (beans >= 1000000)  return getObj(4);
    if (beans >= 300000)   return getObj(3);
    if (beans >= 100000)   return getObj(2);
    if (beans >= 30000)    return getObj(1);
    return getObj(0);
};

export default function ExpertDashboard() {
    const router = useRouter();
    const [user, setUser] = useState(auth.currentUser);
    const [activeTab, setActiveTab] = useState('DASH');
    const [loading, setLoading] = useState(true);
    const [expertData, setExpertData] = useState<any>(null);
    const [isOnline, setIsOnline] = useState(false);
    
    const [isUploading, setIsUploading] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    
    // Separate loading states for buttons
    const [isStartingLive, setIsStartingLive] = useState(false);
    const [isStartingForum, setIsStartingForum] = useState(false);

    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [showCallModal, setShowCallModal] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const shimmerAnim = useRef(new Animated.Value(0)).current; 

    // DYNAMIC THEME ENGINE
    const config = getLevelConfig(expertData);
    
    const theme = {
        primary: config.colors[0],
        secondary: config.colors[2] || config.colors[1] || config.colors[0],
        accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
        bgGradient: [
            config.lvl >= 7 ? `${config.colors[0]}40` : '#020617', 
            config.lvl >= 3 ? `${config.colors[1] || config.colors[0]}20` : '#0F172A', 
            '#020617' 
        ] as const 
    };

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -40]
    });

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
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
    };

    const player = useVideoPlayer(expertData?.teaserVideo || null, (player) => {
        player.loop = true;
    });

    useEffect(() => {
        if (showPreviewModal) {
            player.play();
        } else {
            player.pause();
        }
    }, [showPreviewModal]);

    useEffect(() => {
        const authUnsub = auth.onAuthStateChanged((u:any) => {
            if (!u) {
                setLoading(false);
                router.replace('/' as any);
            } else {
                setUser(u);
            }
        });

        Animated.loop(
            Animated.timing(shimmerAnim, {
                toValue: 1,
                duration: 4000,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: true
            })
        ).start();

        return () => authUnsub();
    }, []);

    useEffect(() => {
        if (!user?.uid) return;

        const unsubProfile = onSnapshot(doc(db, "users", user.uid), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                if (data) {
                    setExpertData({ uid: snap.id, ...data });
                    setIsOnline(data.isOnline ?? false);
                }
                
                setLoading(false);
                Animated.parallel([
                    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
                    Animated.timing(slideAnim, { toValue: 0, duration: 400, useNativeDriver: true })
                ]).start();
            } else {
                setLoading(false);
            }
        });

        const DiscoverQueueQuery = query(
            collection(db, "Discover_queue"),
            where("expertId", "==", user.uid),
            where("status", "==", "Discovered"),
            limit(1)
        );

        const unsubDiscoverQueue = onSnapshot(DiscoverQueueQuery, (snap) => {
            if (!snap.empty) {
                const DiscoverDoc = snap.docs[0];
                const DiscoverData = DiscoverDoc.data();
                setIncomingCall({ 
                    id: DiscoverData.callId,
                    callerName: DiscoverData.userName || "Discover User",
                    status: 'dialing',
                    isDiscoverCall: true,
                    queueId: DiscoverDoc.id
                });
            }
        });

        const callsQuery = query(
            collection(db, "calls"),
            where("expertId", "==", user.uid),
            where("status", "==", "dialing"),
            limit(1)
        );

        const unsubCalls = onSnapshot(callsQuery, (snap) => {
            if (!snap.empty) {
                const callDoc = snap.docs[0];
                const callData = { id: callDoc.id, ...callDoc.data() };
                setIncomingCall(callData);
                setShowCallModal(true);
            } else if (!incomingCall?.isDiscoverCall) {
                setShowCallModal(false);
                setIncomingCall(null);
            }
        });

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.05, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) })
            ])
        ).start();

        return () => {
            unsubProfile();
            unsubCalls();
            unsubDiscoverQueue();
        };
    }, [user?.uid]);

    // 🔥 FORUM CREATION LOGIC 🔥
    const startForumRoom = async () => {
        if (!user?.uid || isStartingForum || isStartingLive) return;

        try {
            setIsStartingForum(true); 
            
            const roomId = `forum_${user.uid}_${Date.now()}`;
            const roomRef = doc(db, "forum_rooms", roomId); // STRICTLY forum_rooms

            const initialData = {
                roomId: roomId,
                hostId: user.uid,
                hostName: expertData?.name || "Host",
                hostImage: expertData?.profilePic || "",
                roomName: `${expertData?.name || 'Host'}'s Forum`,
                status: "active",
                viewerCount: 1,
                createdAt: serverTimestamp(),
                seats: Array(8).fill({ 
                    uid: null, 
                    name: null, 
                    image: null, 
                    isMuted: false 
                })
            };

            await setDoc(roomRef, initialData);

            // 🔥 SATTI EXACT FIX: Fixed Dynamic literal path matching app/expert/forum/[roomId].tsx
            router.push(`/expert/forum/${roomId}` as any);
            
            setIsStartingForum(false);

        } catch (error) {
            setIsStartingForum(false);
            console.error("Session Room Error:", error);
            Alert.alert("Error", "Could not initiate forum.");
        }
    };

    // 🔥 LIVE STREAM CREATION LOGIC 🔥
    const startLiveStream = async () => {
        if (!user?.uid || isStartingLive || isStartingForum) return;
        try {
            setIsStartingLive(true);
            
            const liveId = `live_${user.uid}_${Date.now()}`;
            const liveRef = doc(db, "lives", liveId);
            
            await setDoc(liveRef, {
                hostId: user.uid,
                hostName: expertData?.name || "Host",
                hostImage: expertData?.profilePic || "",
                status: "live",
                createdAt: serverTimestamp(),
                viewerCount: 0
            });
            
            // 🔥 SATTI EXACT FIX: Direct Explicit String Literal passing search query to prevent route confusion
            router.push(`/expert/livestream?liveId=${liveId}` as any);

            setIsStartingLive(false);

        } catch (error) {
            setIsStartingLive(false);
            console.error("Live Stream Error: ", error);
            Alert.alert("Error", "Could not start live stream.");
        }
    };

    const handleUploadTeaser = async () => {
        if (!user?.uid) return;
        
        try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (permissionResult.granted === false) {
                Alert.alert("Permission Required", "Camera roll access is needed to upload a teaser.");
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['videos'], 
                allowsEditing: true,
                aspect: [9, 16],
                quality: 1, 
                videoMaxDuration: 30, 
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const selectedVideo = result.assets[0];

                if (selectedVideo.duration && selectedVideo.duration > 30000) {
                    Alert.alert(
                        "Video Too Long! ⏱️", 
                        "Teaser video must be under 30 seconds. Please edit or select a shorter video."
                    );
                    return;
                }

                setIsUploading(true);
                const videoUri = selectedVideo.uri;

                const CLOUD_NAME = 'dvwjxeexc'; 
                const UPLOAD_PRESET = 'TALKPE'; 

                const data = new FormData();
                data.append('file', {
                    uri: videoUri,
                    type: 'video/mp4',
                    name: `teaser_${user.uid}_${Date.now()}.mp4`
                } as any);
                data.append('upload_preset', UPLOAD_PRESET);
                data.append('cloud_name', CLOUD_NAME);

                const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`, {
                    method: 'POST',
                    body: data,
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'multipart/form-data',
                    }
                });

                const responseData = await response.json();

                if (responseData.secure_url) {
                    const userDocRef = doc(db, "users", user.uid);
                    await updateDoc(userDocRef, {
                        teaserVideo: responseData.secure_url
                    });

                    Alert.alert("Success!", "Your cinematic teaser has been updated! 🎬");
                } else {
                    console.error("Cloudinary Error:", responseData);
                    Alert.alert("Upload Failed", responseData.error?.message || "Could not upload video to Cloudinary.");
                }
                
                setIsUploading(false);
            }
        } catch (error) {
            console.error("Video Upload Error: ", error);
            Alert.alert("Upload Failed", "Something went wrong while uploading your teaser.");
            setIsUploading(false);
        }
    };

    const handleAcceptCall = async () => {
        if (!incomingCall || !user?.uid) return;
        setShowCallModal(false);
        try {
            await updateDoc(doc(db, "users", user.uid), { isBusy: true });
            
            if (!incomingCall.isDiscoverCall) {
                await updateDoc(doc(db, "calls", incomingCall.id), {
                    status: 'accepted',
                    acceptedAt: serverTimestamp()
                });
            }
            router.push({
                pathname: '/videocall',
                params: {
                    expertId: user.uid,
                    expertName: expertData?.userName || expertData?.name || 'Host',
                    callId: incomingCall.id,
                    role: 'expert',
                    callerName: incomingCall.callerName || 'User'
                }
            } as any);
        } catch (e) {
            console.log("Accept Fail", e);
            setShowCallModal(true);
        }
    };

    const handleBlurCall = async () => {
         // Function body placeholder preserved exactly to avoid line reduction 
    };

    const handleRejectCall = async () => {
        if (!incomingCall) return;
        try {
            if (incomingCall.isDiscoverCall) {
                await updateDoc(doc(db, "Discover_queue", incomingCall.queueId), { 
                    status: "searching", expertId: null, callId: null 
                });
            } else {
                await updateDoc(doc(db, "calls", incomingCall.id), { status: 'rejected' });
            }
            setShowCallModal(false);
            setIncomingCall(null);
        } catch (e) { console.log("Reject Fail", e); }
    };

    const handleBlockUser = async (targetUserId: string) => {
        if (!user?.uid || !targetUserId) return;
        try {
            const expertRef = doc(db, "users", user.uid);
            await updateDoc(expertRef, {
                blockedUsers: arrayUnion(targetUserId)
            });
        } catch (e) { console.log("Block Error", e); }
    };

    if (loading) {
        return (
            <View style={styles.loader}>
                <ActivityIndicator size="large" color="#6366F1" />
                <Text style={styles.loaderText}>SYNCING SECURELY...</Text>
            </View>
        );
    }

    const toggleOnlineStatus = async (status: boolean) => {
        if (!user?.uid) return;
        try {
            await updateDoc(doc(db, "users", user.uid), { isOnline: status });
        } catch (e) { console.log("Status Update Error", e); }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'DASH': return (
                <View style={{ flex: 1 }}>
                    <View style={[styles.compactTopBar, borderType1]}>
                        <LinearGradient
                            colors={['rgba(239, 68, 68, 0.12)', 'transparent']}
                            style={StyleSheet.absoluteFill}
                        />
                        
                        <View style={styles.compactActionGrid}>
                            <View style={styles.compactRow}>
                                <Animated.View style={[{ flex: 1 }, { transform: [{ scale: pulseAnim }] }]}>
                                    <TouchableOpacity
                                        style={[styles.compactBtn, { flex: 0, width: '100%' }]}
                                        onPress={startLiveStream} 
                                        disabled={isStartingLive || isStartingForum} 
                                    >
                                        <LinearGradient
                                            colors={['#FF0000', '#B91C1C']}
                                            start={{x:0, y:0}} end={{x:1, y:1}}
                                            style={styles.compactGradient}
                                        >
                                            {isStartingLive ? (
                                                <ActivityIndicator size="small" color="#FFF" />
                                            ) : (
                                                <MaterialCommunityIcons name="broadcast" size={16} color="#FFF" />
                                            )}
                                            <Text style={styles.compactBtnText}>{isStartingLive ? "SYNCING..." : "GO LIVE"}</Text>
                                        </LinearGradient>
                                        <View style={styles.liveButtonGlow} />
                                    </TouchableOpacity>
                                </Animated.View>

                                <Animated.View style={[{ flex: 1 }, { transform: [{ scale: pulseAnim }] }]}>
                                    <TouchableOpacity
                                        style={[styles.compactBtn, { flex: 0, width: '100%', borderColor: '#F59E0B', borderWidth: 1 }]}
                                        onPress={startForumRoom} 
                                        disabled={isStartingForum || isStartingLive}
                                    >
                                        <LinearGradient
                                            colors={['#F59E0B', '#B45309']}
                                            style={styles.compactGradient}
                                        >
                                            {isStartingForum ? (
                                                <ActivityIndicator size="small" color="#FFF" />
                                            ) : (
                                                <MaterialCommunityIcons name="account-group" size={16} color="#FFF" />
                                            )}
                                            <Text style={[styles.compactBtnText, { textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 5 }]}>
                                                {isStartingForum ? "SYNCING..." : "FORUM"}
                                            </Text>
                                        </LinearGradient>
                                        <View style={[styles.liveButtonGlow, { backgroundColor: '#F59E0B' }]} />
                                    </TouchableOpacity>
                                </Animated.View>
                            </View>

                            <TouchableOpacity 
                                style={[styles.masterclassBtn, { borderColor: config.colors[1], borderWidth: 1.5, shadowColor: config.colors[0], shadowOpacity: 0.5, shadowRadius: 10, elevation: 8 }]}
                                onPress={() => router.push('/expert/masterclass' as any)}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={[config.colors[0] + 'E6', config.colors[2] + 'E6']}
                                    start={{x:0, y:0}} end={{x:1, y:0}}
                                    style={styles.masterclassGradient}
                                >
                                    <Text style={[styles.masterclassTitle, { color: config.colors[1], textShadowColor: '#000', textShadowRadius: 8 }]}>PREMIUM SPOTLIGHT</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                        </View>
                    </View>

                    <ConsoleHome expertData={expertData} isOnline={isOnline} setIsOnline={toggleOnlineStatus} />
                </View>
            );
            case 'WALLET': return <WalletSystem expertData={expertData} />;
            case 'MESSAGES': return <ExpertMessages onBlockUser={handleBlockUser} />;
            case 'LEVELS': return <LevelInsights expertData={expertData} />;
            case 'STATS': return <ExpertStats expertData={expertData} />;
            default: return <ConsoleHome expertData={expertData} isOnline={isOnline} setIsOnline={toggleOnlineStatus} />;
        }
    };

    const NavButton = ({ id, icon, label, active, onPress, theme }: any) => {
        const isActive = active === id;
        return (
            <TouchableOpacity onPress={() => onPress(id)} style={styles.navItem}>
                <View style={[styles.iconBox, isActive && [styles.activeIconBox, { backgroundColor: theme.primary, shadowColor: theme.primary }]]}>
                    <Ionicons name={icon} size={isActive ? 20 : 18} color={isActive ? '#FFF' : '#94A3B8'} />
                </View>
                <Text style={[styles.navText, { color: isActive ? '#FFF' : '#64748B' }]}>{label}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            <LinearGradient colors={theme.bgGradient} style={StyleSheet.absoluteFill} />
            <Animated.View style={[styles.shimmerOrb, { top: 80, right: -60, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { top: 450, left: -90, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            <ExpertNotificationBar />

            <SafeAreaView style={{ flex: 1 }} edges={['top']}>
                <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
                    {renderContent()}
                </Animated.View>

                <View style={styles.floatingNavWrapper}>
                    <BlurView intensity={40} tint="dark" style={[styles.glassNav, borderType2]}>
                        <NavButton id="DASH" icon="grid-outline" label="Home" active={activeTab} onPress={setActiveTab} theme={theme} />
                        <NavButton id="WALLET" icon="wallet-outline" label="Wallet" active={activeTab} onPress={setActiveTab} theme={theme} />
                        <NavButton id="MESSAGES" icon="chatbubbles-outline" label="Chat" active={activeTab} onPress={setActiveTab} theme={theme} />
                        <NavButton id="LEVELS" icon="ribbon-outline" label="Rank" active={activeTab} onPress={setActiveTab} theme={theme} />
                        <NavButton id="STATS" icon="bar-chart-outline" label="Stats" active={activeTab} onPress={setActiveTab} theme={theme} />
                    </BlurView>
                </View>
            </SafeAreaView>

            <Modal visible={showPreviewModal} transparent animationType="slide" onRequestClose={() => setShowPreviewModal(false)}>
                <BlurView intensity={95} tint="dark" style={styles.previewModalOverlay}>
                    <TouchableOpacity style={styles.closePreviewBtn} onPress={() => setShowPreviewModal(false)}>
                        <Ionicons name="close-circle" size={40} color="#FFF" />
                    </TouchableOpacity>
                    <View style={[styles.previewVideoContainer, { borderColor: theme.primary, shadowColor: theme.primary }]}>
                        {expertData?.teaserVideo && (
                            <VideoView
                                player={player}
                                style={styles.previewVideo}
                                contentFit="cover"
                                nativeControls={true}
                            />
                        )}
                    </View>
                </BlurView>
            </Modal>

            <Modal visible={showCallModal} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
                    <LinearGradient colors={['transparent', theme.primary + '20', 'transparent']} style={StyleSheet.absoluteFill} />
                    <View style={styles.callContent}>
                        <View style={styles.pulseContainer}>
                            <View style={[styles.outerPulse, { borderColor: theme.primary + '60' }]} />
                            <Image source={{ uri: `https://ui-avatars.com/api/?name=${incomingCall?.callerName || 'U'}&background=${theme.primary.replace('#','')}&color=fff&size=200` }} style={[styles.callerAvatar, { borderColor: theme.primary }]} />
                        </View>
                        <Text style={[styles.incomingLabel, { color: theme.accent }]}>
                            {incomingCall?.isDiscoverCall ? '🚀 QUICK SYNC REQUEST' : 'INCOMING CALL'}
                        </Text>
                        <Text style={styles.callerNameText}>{incomingCall?.callerName || "New User"}</Text>
                        <Text style={styles.callSubText}>
                            {incomingCall?.isDiscoverCall ? 'System Discovered you with this user!' : 'Wants to initiate a session...'}
                        </Text>
                        <View style={styles.callActionRow}>
                            <TouchableOpacity onPress={handleRejectCall} style={[styles.actionBtn, styles.declineBg]}>
                                <Ionicons name="close" size={40} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={handleAcceptCall} style={[styles.actionBtn, styles.acceptBg]}>
                                <Ionicons name="videocam" size={35} color="#FFF" />
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
    loader: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#020617' },
    loaderText: { color: '#6366F1', marginTop: 15, fontSize: 10, fontWeight: '900', letterSpacing: 2 },
    shimmerOrb: { position: 'absolute', width: 350, height: 350, borderRadius: 175, opacity: 0.15, filter: 'blur(80px)' },
    
    compactTopBar: {
        width: 'auto',
        justifyContent: 'center',
        paddingVertical: 12, 
        paddingHorizontal: 12,
        marginHorizontal: 15,
        marginTop: 10,
        marginBottom: 10,
        borderRadius: 20,
        overflow: 'hidden',
    },
    compactActionGrid: {
        width: '100%',
        gap: 10
    },
    compactRow: {
        flexDirection: 'row',
        width: '100%',
        gap: 10,
        justifyContent: 'space-between'
    },
    compactBtn: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 5,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 5,
    },
    compactGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        gap: 6
    },
    compactBtnText: {
        color: '#FFF',
        fontWeight: '900',
        fontSize: 11,
        letterSpacing: 1,
    },
    liveButtonGlow: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        borderRadius: 12,
        backgroundColor: '#FF0000',
        opacity: 0.2,
        zIndex: -1
    },

    masterclassBtn: {
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 5,
    },
    masterclassGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center', 
        padding: 15, 
    },
    masterclassTitle: {
        fontSize: 14, 
        fontWeight: '900',
        letterSpacing: 3, 
        textTransform: 'uppercase'
    },

    previewModalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.85)' },
    closePreviewBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: 20, zIndex: 100, shadowColor: '#000', shadowOpacity: 0.8, shadowRadius: 10 },
    previewVideoContainer: { width: width * 0.85, height: height * 0.7, borderRadius: 30, overflow: 'hidden', borderWidth: 2, elevation: 20, shadowOpacity: 0.5, shadowRadius: 20, backgroundColor: '#000' },
    previewVideo: { width: '100%', height: '100%' },
    
    floatingNavWrapper: { position: 'absolute', bottom: 0, left: 0, right: 0 },
    glassNav: { 
        flexDirection: 'row', 
        width: 'auto', 
        marginHorizontal: 15, 
        marginBottom: Platform.OS === 'ios' ? 35 : 25, 
        paddingVertical: 12, 
        borderRadius: 35, 
        justifyContent: 'space-around', 
        overflow: 'hidden' 
    },
    
    navItem: { alignItems: 'center', justifyContent: 'center', width: width / 5.5 },
    iconBox: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    activeIconBox: { shadowOpacity: 0.4, shadowRadius: 10, elevation: 8 },
    navText: { fontSize: 8, fontWeight: '800', marginTop: 4, letterSpacing: 0.3 },
    modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    callContent: { alignItems: 'center', width: '100%', zIndex: 10 },
    pulseContainer: { width: 180, height: 180, justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
    outerPulse: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2 },
    callerAvatar: { width: 140, height: 140, borderRadius: 70, borderWidth: 4 },
    incomingLabel: { fontWeight: '900', fontSize: 11, letterSpacing: 4, marginBottom: 15 },
    callerNameText: { color: '#FFF', fontSize: 36, fontWeight: '900', marginBottom: 5 },
    callSubText: { color: '#94A3B8', fontSize: 14, fontWeight: '600', marginBottom: 60 },
    callActionRow: { flexDirection: 'row', gap: 60 },
    actionBtn: { width: 85, height: 85, borderRadius: 42.5, justifyContent: 'center', alignItems: 'center', elevation: 20, shadowColor: '#000', shadowOpacity: 0.5, shadowRadius: 15 },
    declineBg: { backgroundColor: '#FF3B30' },
    acceptBg: { backgroundColor: '#34C759' },
});