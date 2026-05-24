import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Modal,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    ViewToken
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../../firebaseConfig';
import { checkAndRequestCallPermissions } from '../../utils/permissions';

const { width, height } = Dimensions.get('window');

// 🔒 Safe Level Data Fetcher (🔥 SMART FETCH WITH 3 COLORS 🔥)
const getSmartLevelConfig = (userData: any) => {
    const getObj = (lvl: number) => {
        if (lvl >= 10) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'] as const, glow: '#F59E0B' };
        if (lvl === 9) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'] as const, glow: '#EC4899' };
        if (lvl === 8) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'] as const, glow: '#8B5CF6' };
        if (lvl === 7) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'] as const, glow: '#3B82F6' };
        if (lvl === 6) return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'] as const, glow: '#06B6D4' };
        if (lvl === 5) return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'] as const, glow: '#10B981' };
        if (lvl === 4) return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'] as const, glow: '#EAB308' };
        if (lvl === 3) return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'] as const, glow: '#94A3B8' };
        if (lvl === 2) return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'] as const, glow: 'transparent' };
        if (lvl === 1) return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'] as const, glow: 'transparent' };
        return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'] as const, glow: 'transparent' };
    };

    // 1. Direct Level Override
    const lvl = userData?.expertLevel ?? userData?.currentLevel ?? userData?.level;
    if (lvl !== undefined && lvl !== null) return getObj(Number(lvl));

    // 2. Title Fallback
    const title = String(userData?.levelTitle || '').toUpperCase();
    if (title.includes('L10') || title.includes('LEGEND')) return getObj(10);
    if (title.includes('L9') || title.includes('MYTHIC')) return getObj(9);
    if (title.includes('L8') || title.includes('ELITE')) return getObj(8);
    if (title.includes('L7') || title.includes('MASTER')) return getObj(7);
    if (title.includes('L6') || title.includes('DIAMOND')) return getObj(6);
    if (title.includes('L5') || title.includes('PLATINUM')) return getObj(5);
    if (title.includes('L4') || title.includes('GOLD')) return getObj(4);
    if (title.includes('L3') || title.includes('SILVER')) return getObj(3);
    if (title.includes('L2') || title.includes('BRONZE')) return getObj(2);
    if (title.includes('L1') || title.includes('ROOKIE')) return getObj(1);
    if (title.includes('L0') || title.includes('BEGINNER')) return getObj(0);

    // 3. Beans Fallback
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

// 🎬 INDIVIDUAL VIDEO ITEM COMPONENT
const ExpertVideoCard = ({ expert, isActive, isScreenFocused, onConnect }: { expert: any, isActive: boolean, isScreenFocused: boolean, onConnect: () => void }) => {
    
    const player = useVideoPlayer(expert.teaserVideo || null, (player) => {
        player.loop = true;
    });

    useEffect(() => {
        if (isActive && isScreenFocused) {
            player.play();
        } else {
            player.pause();
        }
    }, [isActive, isScreenFocused, player]);

    // 🔥 3-COLOR THEME FETCH 🔥
    const tierData = getSmartLevelConfig(expert);
    const c1 = tierData.colors[0];
    const c2 = tierData.colors[1];
    const c3 = tierData.colors[2];
    
    // Fallback glow logic to ensure text pops
    const glowColor = tierData.glow !== 'transparent' ? tierData.glow : c3;
    
    // 🔥 Dynamically calculate Diamond price based purely on Expert's Per Minute Rate (Beans * 2)
    const displayDiamondPrice = expert.pricePerMin ? expert.pricePerMin * 2 : 2000;

    return (
        <View style={styles.cardContainer}>
            {expert.teaserVideo ? (
                <VideoView
                    player={player}
                    style={styles.video}
                    contentFit="cover"
                    nativeControls={false} 
                />
            ) : (
                <Image 
                    source={{ uri: expert.profilePic || expert.photoURL || `https://ui-avatars.com/api/?name=${expert.name}&background=0F172A&color=00F2FE&size=512` }} 
                    style={styles.video} 
                />
            )}

            <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(2, 6, 23, 0.95)']}
                style={styles.bottomGradient}
            >
                <View style={styles.contentWrapper}>
                    
                    <View style={styles.infoRow}>
                        <View>
                            {/* 🔥 EXPERT NAME (Uses Glow Color for Shadow) 🔥 */}
                            <Text style={[styles.expertName, { color: '#FFF', textShadowColor: glowColor, textShadowRadius: 15 }]}>
                                {expert.name || expert.userName || 'TALKPE PRO Consultant'}
                            </Text>
                            
                            {/* 🔥 ALL BADGES IN ONE ROW (Tier + Skill + Online) */}
                            <View style={styles.badgeRow}>
                                <MaterialCommunityIcons name="check-decagram" size={16} color="#10B981" />
                                
                                {/* 🔥 3-COLOR LINEAR GRADIENT TIER BADGE 🔥 */}
                                <LinearGradient 
                                    colors={[c1, c2, c3]} 
                                    start={{x:0, y:0}} end={{x:1, y:1}} 
                                    style={styles.tierBadge}
                                >
                                    <Text style={[styles.tierText, { color: '#FFF' }]}>{tierData.label}</Text>
                                </LinearGradient>

                                {/* 🔥 SKILL BADGE (Uses c3 for Contrast) 🔥 */}
                                {expert.hasMasterclass && expert.masterclassSkill && (
                                    <View style={[styles.skillBadge, { backgroundColor: c3 + '20', borderColor: c3 }]}>
                                        <Text style={[styles.skillBadgeText, { color: c3 }]}>{expert.masterclassSkill}</Text>
                                    </View>
                                )}

                                {/* Online Badge */}
                                {expert.isOnline && (
                                    <View style={styles.liveBadge}>
                                        <View style={styles.liveDot} />
                                        <Text style={styles.liveText}>ONLINE</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>

                    <Text style={styles.bioText} numberOfLines={2}>
                        {expert.bio || "Hi there! I'm an official TALKPE PRO consultant. Let's have a productive session! ✨"}
                    </Text>

                    {/* 🔥 3-COLOR CONNECT BUTTON 🔥 */}
                    <TouchableOpacity 
                        style={[styles.connectBtn, { shadowColor: glowColor }]} 
                        activeOpacity={0.8}
                        onPress={onConnect}
                    >
                        <LinearGradient
                            colors={[c1, c2, c3]}
                            start={{x:0, y:0}} end={{x:1, y:1}}
                            style={styles.btnGradient}
                        >
                            <Ionicons name="videocam" size={24} color="#FFF" />
                            <Text style={styles.btnText}>CONNECT NOW</Text>
                            
                            <Text style={styles.btnDivider}>|</Text>
                            
                            <View style={styles.pricePill}>
                                <MaterialCommunityIcons name="diamond-stone" size={16} color="#FFF" />
                                <Text style={styles.pricePillText}>{displayDiamondPrice}</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                </View>
            </LinearGradient>
        </View>
    );
};

export default function CinematicExploreScreen() {
    const [experts, setExperts] = useState<any[]>([]);
    const [activeIndex, setActiveIndex] = useState(0);
    const [hasTrialMins, setHasTrialMins] = useState(false); 
    const router = useRouter();
    
    const isScreenFocused = useIsFocused();
    const user = auth.currentUser;

    // 🔥 SATTI FIX: RINGING PROTOCOL STATES (FOR USER OUTGOING) 🔥
    const [ringModalVisible, setRingModalVisible] = useState(false);
    const [ringTimer, setRingTimer] = useState(12);
    const [currentExpert, setCurrentExpert] = useState<any>(null);
    const [currentCallId, setCurrentCallId] = useState<string | null>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // 🔥 SATTI FIX: NEW STATES FOR EXPERT INCOMING CALL MODAL 🔥
    const [incomingCall, setIncomingCall] = useState<any>(null);
    const [incomingTimer, setIncomingTimer] = useState(12);
    const incomingPulse = useRef(new Animated.Value(1)).current;

    // 🔥 Check User Trial Status on Load
    useEffect(() => {
        const fetchTrialStatus = async () => {
            if (user) {
                try {
                    const uSnap = await getDoc(doc(db, "users", user.uid));
                    if (uSnap.exists()) {
                        const data = uSnap.data();
                        if (data.freeMinsRemaining && data.freeMinsRemaining > 0) {
                            setHasTrialMins(true);
                        } else {
                            setHasTrialMins(false);
                        }
                    }
                } catch (e) {}
            }
        };
        fetchTrialStatus();
    }, [user]);

    useEffect(() => {
        const q = query(
            collection(db, "users"),
            where("role", "==", "expert"),
        );

        const unsub = onSnapshot(q, (snap) => {
            const fetchedExperts = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
            fetchedExperts.sort((a, b) => (b.totalBeansEarned || 0) - (a.totalBeansEarned || 0));
            setExperts(fetchedExperts);
        });

        return () => unsub();
    }, []);

    // 🔥 SATTI FIX: EXPERT INCOMING CALL GLOBAL LISTENER (enga erunthalum varum) 🔥
    useEffect(() => {
        if (!user?.uid) return;

        const callQuery = query(
            collection(db, "calls"),
            where("expertId", "==", user.uid),
            where("status", "in", ["calling", "ringing", "pending", "Discover_dialing"])
        );

        const unsubCalls = onSnapshot(callQuery, async (snap) => {
            if (!snap.empty) {
                let validDocSnap = null;
                for (const docSnap of snap.docs) {
                    const data = docSnap.data();
                    const now = Date.now();
                    const callTime = data.createdAt?.toMillis ? data.createdAt.toMillis() : now;
                    if (now - callTime <= 30000) {
                        validDocSnap = docSnap;
                        break;
                    } else {
                        updateDoc(doc(db, "calls", docSnap.id), { status: 'missed' }).catch(()=>{});
                    }
                }

                if (validDocSnap) {
                    const data = validDocSnap.data();
                    
                    // 🔥 FETCH USER IMAGE AND NAME DIRECTLY FROM DOC FIRST
                    let callerPic = data.callerImage || null;
                    let fetchedName = data.callerName || data.userName || "CLIENT";
                    
                    // Fallback just in case callerImage wasn't saved in the db
                    if(!callerPic && data.callerId) {
                        const callerDoc = await getDoc(doc(db, "users", data.callerId));
                        if(callerDoc.exists()){
                            const cData = callerDoc.data();
                            callerPic = cData.profilePic || cData.photoURL || null;
                            fetchedName = cData.name || cData.userName || cData.displayName || fetchedName;
                        }
                    }
                    
                    setIncomingCall({ id: validDocSnap.id, ...data, callerImage: callerPic, userName: fetchedName });
                    setIncomingTimer(12); // Reset to 12 secs when new call pops
                } else {
                    setIncomingCall(null);
                }
            } else {
                setIncomingCall(null);
            }
        });
        return () => unsubCalls();
    }, [user?.uid]);

    // 🔥 SATTI FIX: 12 SEC TIMER FOR EXPERT INCOMING CALL 🔥
    useEffect(() => {
        let interval: any;
        if (incomingCall) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(incomingPulse, { toValue: 1.05, duration: 1000, useNativeDriver: true }),
                    Animated.timing(incomingPulse, { toValue: 1, duration: 1000, useNativeDriver: true })
                ])
            ).start();

            interval = setInterval(() => {
                setIncomingTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        handleIncomingCallAction('missed');
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            incomingPulse.setValue(1);
        }
        return () => clearInterval(interval);
    }, [incomingCall]);

    // 🔥 SATTI FIX: EXPERT ACTION HANDLER (Accept / Reject) 🔥
    const handleIncomingCallAction = async (action: 'accepted' | 'rejected' | 'missed') => {
        if (!incomingCall || !user) return;
        try {
            if (action === 'accepted') {
                await updateDoc(doc(db, "calls", incomingCall.id), { status: 'accepted', expertId: user.uid, acceptedAt: serverTimestamp() });
                router.replace({ pathname: "/videocall" as any, params: { callId: incomingCall.id, expertId: user.uid, callerId: incomingCall.callerId, role: 'expert' } });
            } else {
                // If expert rejects, the call status goes to 'rejected' cutting the user's side too!
                await updateDoc(doc(db, "calls", incomingCall.id), { status: action });
                setIncomingCall(null);
            }
        } catch (e) { console.error(e); }
    };

    // 🔥 SATTI FIX: RINGING ENGINE (12 SECONDS) & FIRESTORE SYNC (FOR USER) 🔥
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        let unsubscribeCall: () => void;

        if (ringModalVisible && currentCallId && currentExpert) {
            // Pulse Animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
                ])
            ).start();

            // 12s Countdown Timer
            interval = setInterval(() => {
                setRingTimer((prev) => {
                    if (prev <= 1) {
                        clearInterval(interval);
                        handleMissedCall(currentCallId);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);

            // Listen to Expert's Response in Firestore
            unsubscribeCall = onSnapshot(doc(db, "calls", currentCallId), (docSnap) => {
                if (docSnap.exists()) {
                    const status = docSnap.data().status;
                    if (status === 'accepted' || status === 'connected' || status === 'in-progress') {
                        clearInterval(interval);
                        setRingModalVisible(false);
                        // 🔥 EXPERT ACCEPTED! NOW Route to Videocall 🔥
                        router.push({
                            pathname: "/videocall" as any,
                            params: { 
                                expertId: currentExpert.id,
                                expertName: currentExpert.name || currentExpert.userName,
                                expertImage: currentExpert.profilePic || currentExpert.photoURL,
                                callId: currentCallId,
                                role: 'user',
                                isFreeTrial: hasTrialMins ? "true" : "false" 
                            }
                        });
                    } else if (status === 'rejected' || status === 'declined' || status === 'ended') {
                        // 🔥 EXPERT REJECTED! USER GETS ALERT & MODAL CLOSES IMMEDIATELY 🔥
                        clearInterval(interval);
                        setRingModalVisible(false);
                        Alert.alert("Unavailable", "The consultant declined the connection.");
                    }
                }
            });
        } else {
            pulseAnim.setValue(1);
        }

        return () => {
            if (interval) clearInterval(interval);
            if (unsubscribeCall) unsubscribeCall();
        };
    }, [ringModalVisible, currentCallId, currentExpert]);

    // 🔥 HANDLERS FOR TIMEOUT AND CANCELLATION 🔥
    const handleMissedCall = async (callId: string) => {
        setRingModalVisible(false);
        Alert.alert("Timeout", "Consultant didn't answer. Try again later.");
        try {
            await updateDoc(doc(db, "calls", callId), { status: 'missed' });
        } catch (e) {}
    };

    const cancelCall = async () => {
        setRingModalVisible(false);
        if (currentCallId) {
            try {
                await updateDoc(doc(db, "calls", currentCallId), { status: 'cancelled' });
            } catch (e) {}
        }
    };

    const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
        if (viewableItems.length > 0) {
            setActiveIndex(viewableItems[0].index || 0);
        }
    }, []);

    const viewabilityConfig = {
        itemVisiblePercentThreshold: 70, 
    };

    // 🔥 THE NEW CALL ROUTING LOGIC WITH BUSY & LIVE CHECK 🔥
    const handleConnect = async (expert: any) => {
        try {
            // 👇👇 Satti's Permission Check Box 👇👇
            const hasPermission = await checkAndRequestCallPermissions();
            if (!hasPermission) {
                return; // If permission denied, do not proceed with call request
            }
            // 👆👆 -------------------------------- 👆👆

            // 1. Check if Expert is LIVE
            const liveQuery = query(collection(db, "lives"), where("hostId", "==", expert.id), where("status", "==", "live"));
            const liveSnap = await getDocs(liveQuery);

            if (!liveSnap.empty) {
                const actualLiveId = liveSnap.docs[0].id;
                // Expert is live, send user to the Live Room
                router.push({
                    pathname: '/(tabs)/live/[liveId]' as any, 
                    params: { liveId: actualLiveId }
                });
                return;
            }

            // 2. Check if Expert is BUSY
            if (expert.isBusy === true || expert.isBusy === "true") {
                Alert.alert(
                    "Consultant is Engaged ⏳", 
                    `${expert.name || "This consultant"} is currently assisting another client. Please try again in a few minutes.`
                );
                return;
            }

            // 🔥 3. FIRE UP THE 12s RINGING PROTOCOL 🔥
            const newCallId = `call_${Date.now()}_${expert.id}`; 
            
            setCurrentExpert(expert);
            setCurrentCallId(newCallId);
            setRingTimer(12);
            setRingModalVisible(true);

            await setDoc(doc(db, "calls", newCallId), {
                callerId: user?.uid || "UNKNOWN_USER",
                callerImage: user?.photoURL || `https://ui-avatars.com/api/?name=${user?.displayName || 'User'}&background=0F172A&color=fff`,
                callerName: user?.displayName || "User",
                expertId: expert.id,
                expertImage: expert.profilePic || expert.photoURL || null,
                expertName: expert.name || expert.userName || "Consultant",
                isFreeTrial: hasTrialMins,
                status: 'calling', // Changed from 'ringing' to 'calling' for global sync
                createdAt: serverTimestamp(),
                totalDiamonds: 0,
                expertEarnings: 0,
                finalDuration: 0
            });

        } catch (error) {
            console.error("Routing Error: ", error);
            Alert.alert("Connection Error", "Unable to connect at the moment. Try again.");
            setRingModalVisible(false);
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
            
            <FlatList
                data={experts}
                keyExtractor={(item) => item.id}
                renderItem={({ item, index }) => (
                    <ExpertVideoCard 
                        expert={item} 
                        isActive={index === activeIndex} 
                        isScreenFocused={isScreenFocused} 
                        onConnect={() => handleConnect(item)}
                    />
                )}
                pagingEnabled 
                showsVerticalScrollIndicator={false}
                snapToAlignment="start"
                decelerationRate="fast"
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                windowSize={3} 
                initialNumToRender={1}
                maxToRenderPerBatch={2}
            />

            <View style={styles.topHeader}>
                <Text style={styles.headerTitle}>FEATURED CONSULTANTS</Text>
                <TouchableOpacity style={styles.searchBtn}>
                    <Ionicons name="search" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            {/* 🔥 SATTI FIX: EXPERT INCOMING CALL OVERLAY 🔥 */}
            {incomingCall && (
                <Modal visible={!!incomingCall} transparent animationType="fade">
                    <View style={styles.callOverlayMass}>
                        <Animated.View style={[styles.callCardWrapper, { transform: [{ scale: incomingPulse }] }]}>
                            <BlurView intensity={90} tint="dark" style={styles.callCardMass}>
                                <Text style={styles.callPulseText}>INCOMING CONSULTATION</Text>
                                
                                <View style={styles.callerAvatarRing}>
                                    {incomingCall.callerImage ? (
                                        <Image source={{ uri: incomingCall.callerImage }} style={styles.callerCallAvatar} />
                                    ) : (
                                        <View style={styles.callerCallInitials}>
                                            <Text style={styles.callerCallInitialsText}>
                                                {incomingCall.userName ? incomingCall.userName.charAt(0).toUpperCase() : "U"}
                                            </Text>
                                        </View>
                                    )}
                                </View>

                                <Text style={styles.callInfoTextMass} numberOfLines={1}>{incomingCall.userName?.toUpperCase() || "CLIENT"}</Text>
                                
                                <Text style={styles.ringTimerExpert}>00:{incomingTimer.toString().padStart(2, '0')}</Text>

                                <View style={styles.callActionsMass}>
                                    <TouchableOpacity onPress={() => handleIncomingCallAction('rejected')} activeOpacity={0.8} style={styles.actionBtnHitbox}>
                                        <LinearGradient colors={['#F43F5E', '#9F1239']} style={styles.callBtnMass}>
                                            <Ionicons name="close" size={28} color="#FFF" />
                                        </LinearGradient>
                                        <Text style={styles.callBtnLabel}>DECLINE</Text>
                                    </TouchableOpacity>
                                    
                                    <TouchableOpacity onPress={() => handleIncomingCallAction('accepted')} activeOpacity={0.8} style={styles.actionBtnHitbox}>
                                        <LinearGradient colors={['#10B981', '#059669']} style={styles.callBtnMass}>
                                            <Ionicons name="videocam" size={28} color="#FFF" />
                                        </LinearGradient>
                                        <Text style={styles.callBtnLabel}>ACCEPT</Text>
                                    </TouchableOpacity>
                                </View>
                            </BlurView>
                        </Animated.View>
                    </View>
                </Modal>
            )}

            {/* 🔥 SATTI FIX: USER RINGING UI OVERLAY 🔥 */}
            <Modal visible={ringModalVisible} transparent animationType="fade">
                <BlurView intensity={90} tint="dark" style={styles.ringingOverlay}>
                    <View style={styles.ringingContent}>
                        <Text style={styles.ringConnectingText}>REQUESTING UPLINK...</Text>
                        
                        <View style={styles.ringAvatarWrapper}>
                            <Animated.View style={[styles.ringPulseGlow, { transform: [{ scale: pulseAnim }] }]} />
                            <Image 
                                source={{ uri: currentExpert?.profilePic || currentExpert?.photoURL || `https://ui-avatars.com/api/?name=${currentExpert?.name}&background=0F172A&color=fff` }} 
                                style={styles.ringAvatar} 
                            />
                        </View>

                        <Text style={styles.ringExpertName}>{currentExpert?.name || "Consultant"}</Text>
                        <Text style={styles.ringTimer}>00:{ringTimer.toString().padStart(2, '0')}</Text>

                        <TouchableOpacity style={styles.cancelCallBtn} onPress={cancelCall} activeOpacity={0.8}>
                            <MaterialCommunityIcons name="phone-hangup" size={32} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </BlurView>
            </Modal>

        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#000',
    },
    topHeader: {
        position: 'absolute',
        top: 50,
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    headerTitle: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 2,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowRadius: 10,
    },
    searchBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    cardContainer: {
        width: width,
        height: height, 
        position: 'relative',
        backgroundColor: '#020617',
    },
    video: {
        ...StyleSheet.absoluteFillObject,
    },
    bottomGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.4, 
        justifyContent: 'flex-end',
        paddingHorizontal: 20,
        paddingBottom: 90, 
    },
    contentWrapper: {
        gap: 15,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
    },
    expertName: {
        fontSize: 32,
        fontWeight: '900',
        marginBottom: 8,
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    tierBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    tierText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    skillBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
    },
    skillBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: 1
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#10B981',
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10B981',
        marginRight: 4,
    },
    liveText: {
        color: '#10B981',
        fontSize: 10,
        fontWeight: 'bold',
    },
    bioText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 14,
        fontWeight: '500',
        lineHeight: 20,
    },
    connectBtn: {
        width: '100%',
        height: 60,
        borderRadius: 30,
        marginTop: 10,
        overflow: 'hidden',
        elevation: 10,
        shadowOpacity: 0.5,
        shadowRadius: 15,
    },
    btnGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    btnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: 1,
    },
    btnDivider: {
        color: '#FFF',
        fontSize: 20,
        opacity: 0.4,
        marginHorizontal: 2
    },
    pricePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.25)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 4
    },
    pricePillText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
    },

    // 🔥 SATTI FIX: RINGING UI STYLES (USER OUTGOING) 🔥
    ringingOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    ringingContent: { alignItems: 'center', justifyContent: 'center' },
    ringConnectingText: { color: '#38BDF8', fontSize: 14, fontWeight: '900', letterSpacing: 4, marginBottom: 50 },
    ringAvatarWrapper: { justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
    ringPulseGlow: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 2, borderColor: '#38BDF8', opacity: 0.4 },
    ringAvatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#38BDF8', zIndex: 10 },
    ringExpertName: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 1, marginBottom: 5 },
    ringTimer: { color: '#94A3B8', fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 60 },
    cancelCallBtn: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center', elevation: 15, shadowColor: '#EF4444', shadowOpacity: 0.6, shadowRadius: 15 },

    // 🔥 SATTI FIX: EXPERT INCOMING CALL STYLES 🔥
    callOverlayMass: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', alignItems: 'center', zIndex: 99999, backgroundColor: 'rgba(2, 6, 23, 0.8)' },
    callCardWrapper: { width: '80%', borderRadius: 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(0, 242, 254, 0.4)' },
    callCardMass: { paddingVertical: 35, paddingHorizontal: 20, alignItems: 'center' },
    callPulseText: { color: '#00F2FE', fontSize: 11, fontWeight: '900', letterSpacing: 5, marginBottom: 15 },
    callerAvatarRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#00F2FE', justifyContent: 'center', alignItems: 'center', marginBottom: 20, backgroundColor: '#0F172A', elevation: 20, shadowColor: '#00F2FE', shadowRadius: 20, shadowOpacity: 0.6 },
    callerCallAvatar: { width: 82, height: 82, borderRadius: 41 },
    callerCallInitials: { width: 82, height: 82, borderRadius: 41, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
    callerCallInitialsText: { color: '#00F2FE', fontSize: 32, fontWeight: '900' },
    callInfoTextMass: { color: '#FFF', fontSize: 22, fontWeight: '900', marginBottom: 10 },
    ringTimerExpert: { color: '#EF4444', fontSize: 18, fontWeight: '900', letterSpacing: 2, marginBottom: 20 },
    callActionsMass: { flexDirection: 'row', gap: 40, justifyContent: 'center' },
    actionBtnHitbox: { alignItems: 'center' },
    callBtnMass: { width: 65, height: 65, borderRadius: 32.5, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)' },
    callBtnLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '900', marginTop: 10 }
});