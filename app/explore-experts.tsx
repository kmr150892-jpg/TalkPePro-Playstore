import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    query,
    serverTimestamp,
    setDoc,
    updateDoc,
    where,
    writeBatch
} from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Dimensions, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { auth, db } from '../firebaseConfig';
import { checkAndRequestCallPermissions } from '../utils/permissions';

const { width, height } = Dimensions.get('window');

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

// 🔥 6 SELECTED AVATARS ONLY
const AI_AVATARS = [
    require('../assets/avatars/pexels-alan-biju-27873857-7633967.jpg'),
    require('../assets/avatars/pexels-alia-hasan-140436223-10322304.jpg'),
    require('../assets/avatars/pexels-cacito-9098953.jpg'),
    require('../assets/avatars/pexels-cottonbro-4909818.jpg'),
    require('../assets/avatars/pexels-manoj-bharathi-202386256-32455915.jpg'),
    require('../assets/avatars/pexels-romantymochko-9316687.jpg')
];

const RadarCircle = ({ delay, color }: { delay: number; color: string }) => {
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.parallel([
                Animated.timing(scale, {
                    toValue: 4,
                    duration: 5000,
                    delay,
                    easing: Easing.out(Easing.quad),
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 5000,
                    delay,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, [color]);

    return <Animated.View style={[styles.radarRing, { borderColor: color, transform: [{ scale }], opacity }]} />;
};

const FloatingNode = ({ imageSource, delay, angle, radius, borderColor }: { imageSource: any, delay: number, angle: number, radius: number, borderColor: string }) => {
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const floatAnim = useRef(new Animated.Value(0)).current;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);

    useEffect(() => {
        Animated.sequence([
            Animated.delay(delay),
            Animated.loop(
                Animated.sequence([
                    Animated.timing(opacityAnim, { toValue: 0.9, duration: 1200, useNativeDriver: true }),
                    Animated.delay(1800), 
                    Animated.timing(opacityAnim, { toValue: 0, duration: 1200, useNativeDriver: true }),
                    Animated.delay(5000) 
                ])
            )
        ]).start();

        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, { toValue: -15, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(floatAnim, { toValue: 0, duration: 3500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();
    }, []);

    return (
        <Animated.View style={[styles.floatingNode, { opacity: opacityAnim, borderColor: borderColor, transform: [{ translateX: x }, { translateY: Animated.add(y, floatAnim) }] }]}>
            <Image source={imageSource} style={styles.nodeImage} />
        </Animated.View>
    );
};

export default function SwipeDiscoverScreen() {
    const router = useRouter();
    const user = auth.currentUser;
    const [statusText, setStatusText] = useState("Initializing Neural Link...");
    const [searchState, setSearchState] = useState("searching"); 
    const [userRealPic, setUserRealPic] = useState<string | null>(null);
    const [userName, setUserName] = useState<string>("User");
    const [expertAvatars, setExpertAvatars] = useState<string[]>([]);
    const [tier, setTier] = useState<any>(calculateUserLevel(0));
    const [hasTrialMins, setHasTrialMins] = useState<boolean>(false);
    
    // 🔥 GHOST FILTER REF (Stores the current user's blocked IDs)
    const myBlockedUsersRef = useRef<string[]>([]);

    const queueDocRef = useRef<any>(null);
    const isDiscovered = useRef(false);
    const hasSentRequest = useRef(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const triedExpertsRef = useRef<string[]>([]);
    const permissionChecked = useRef(false);
    
    useEffect(() => {
        const checkPermsFirst = async () => {
            if (!permissionChecked.current) {
                permissionChecked.current = true;
                const hasPermission = await checkAndRequestCallPermissions();
                if (!hasPermission) {
                    if (router.canGoBack()) {
                        router.back(); 
                    } else {
                        router.replace('/');
                    }
                }
            }
        };
        checkPermsFirst();
    }, []);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!user) return;
            try {
                const userSnap = await getDoc(doc(db, "users", user.uid));
                if (userSnap.exists()) {
                    const data = userSnap.data();
                    setUserRealPic(data.profilePic || data.photoURL || null);
                    setUserName(data.name || user.displayName || "User");
                    setTier(calculateUserLevel(data.totalSpentDiamonds || 0));
                    
                    // 🔥 GHOST FILTER: Save user's block list to Ref
                    myBlockedUsersRef.current = data.blockedUsers || [];

                    if (data.freeMinsRemaining && data.freeMinsRemaining > 0) {
                        setHasTrialMins(true);
                    }
                }
            } catch (e) { console.log(e); }
        };
        fetchUserData();
    }, [user]);

    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, 'users'), where('role', '==', 'expert'), limit(50));
        const unsubExperts = onSnapshot(q, (snap) => {
            const pics = snap.docs
                .filter(d => {
                    const data = d.data();
                    const isOnline = data.isOnline === true || data.isOnline === "true";
                    
                    // 🔥 GHOST FILTER LOGIC FOR AVATARS 🔥
                    const hostBlockedUsers = data.blockedUsers || [];
                    const notBlockedByMe = !myBlockedUsersRef.current.includes(d.id);
                    const notBlockedByHost = !hostBlockedUsers.includes(user.uid);
                    
                    return isOnline && notBlockedByMe && notBlockedByHost;
                })
                .map(d => d.data().profilePic || d.data().photoURL)
                .filter(p => !!p);
            setExpertAvatars(pics.slice(0, 25));
        });
        return () => unsubExperts();
    }, [user]);

    useEffect(() => {
        if (searchState !== "searching") return;
        const sequences = [
            { t: "Syncing secure handshake...", d: 2000 },
            { t: "Locating verified hosts...", d: 6000 },
            { t: `Activating ${tier.label} protocol...`, d: 10000 },
            { t: "Waiting for host response...", d: 15000 }
        ];
        sequences.forEach(seq => {
            setTimeout(() => {
                if (!hasSentRequest.current && searchState === "searching") setStatusText(seq.t);
            }, seq.d);
        });
    }, [searchState, tier]);

    useEffect(() => {
        if (!user || searchState !== "searching") return;
        let activeUnsubQueue: any = null;

        const startDiscovermaking = async () => {
            try {
                const qRef = await addDoc(collection(db, "Discover_queue"), {
                    userId: user.uid,
                    userName: userName, 
                    userImage: userRealPic || user.photoURL || "",
                    tierLvl: tier.lvl,
                    status: "searching",
                    createdAt: serverTimestamp()
                });
                queueDocRef.current = qRef;

                timeoutRef.current = setTimeout(async () => {
                    if (!isDiscovered.current) {
                        setSearchState("no_Discover");
                        if (queueDocRef.current) deleteDoc(queueDocRef.current).catch(e => console.log(e));
                        
                        try {
                            if (user?.uid) {
                                const q = query(collection(db, "calls"), where("callerId", "==", user.uid), where("status", "==", "ringing"));
                                const snap = await getDocs(q);
                                const batch = writeBatch(db);
                                snap.docs.forEach(d => batch.update(d.ref, { status: 'missed' }));
                                await batch.commit();
                            }
                        } catch (error) { console.log(error); }
                    }
                }, 45000); 

                activeUnsubQueue = onSnapshot(doc(db, "Discover_queue", qRef.id), (snap) => {
                    if (snap.exists()) {
                        const data = snap.data();
                        
                        if (data.status === "Discovered") {
                            if (timeoutRef.current) {
                                clearTimeout(timeoutRef.current);
                                timeoutRef.current = null;
                            }
                        }

                        if (data.status === "searching" && data.expertId === null && hasSentRequest.current) {
                            hasSentRequest.current = false;
                            setStatusText("Host occupied. Re-routing...");
                            findExpert(); 
                        }
                    }
                });
                findExpert();
            } catch (error) { console.log("Discover Error:", error); }
        };

        const findExpert = async () => {
            if (isDiscovered.current || hasSentRequest.current || !queueDocRef.current || searchState !== "searching") return;
            setTimeout(async () => {
                if (isDiscovered.current || hasSentRequest.current || !queueDocRef.current || searchState !== "searching") return;
                try {
                    const expertsQuery = query(
                        collection(db, "users"), 
                        where("role", "==", "expert"), 
                        limit(50) 
                    );
                    const querySnapshot = await getDocs(expertsQuery);
                    
                    const availableExperts = querySnapshot.docs.filter(doc => {
                        const data = doc.data();
                        const isOnline = data.isOnline === true || data.isOnline === "true";
                        const isBusy = data.isBusy === true || data.isBusy === "true";
                        
                        // 🔥 GHOST FILTER LOGIC FOR ALGORITHM 🔥
                        const hostBlockedUsers = data.blockedUsers || [];
                        const notBlockedByMe = !myBlockedUsersRef.current.includes(doc.id);
                        const notBlockedByHost = !hostBlockedUsers.includes(user.uid);

                        return isOnline && !isBusy && doc.id !== user.uid && !triedExpertsRef.current.includes(doc.id) && notBlockedByMe && notBlockedByHost;
                    });
                    
                    if (availableExperts.length > 0) {
                        const randomExpertDoc = availableExperts[Math.floor(Math.random() * availableExperts.length)];
                        triedExpertsRef.current.push(randomExpertDoc.id);
                        sendRequestToExpert(randomExpertDoc.id, randomExpertDoc.data());
                    } else {
                        setSearchState("no_Discover");
                        if (queueDocRef.current) deleteDoc(queueDocRef.current).catch(e => console.log(e));
                    }
                } catch (e) { console.log(e); }
            }, 5000);
        };

        const sendRequestToExpert = async (expertId: string, expertData: any) => {
            if (isDiscovered.current || !queueDocRef.current || searchState !== "searching") return;
            hasSentRequest.current = true;
            const callId = `Discover_${user.uid}_${Date.now()}`;
            try {
                const eSnap = await getDoc(doc(db, "users", expertId));
                let finalExpertName = "Host";
                let finalExpertImage = null;

                if (eSnap.exists()) {
                    const eData = eSnap.data();
                    finalExpertName = eData.name || eData.displayName || eData.userName || expertData?.name || "Host";
                    finalExpertImage = eData.profilePic || eData.photoURL || eData.image || expertData?.profilePic || null;
                }

                await setDoc(doc(db, "calls", callId), { 
                    status: "ringing", 
                    expertId: expertId, 
                    expertName: finalExpertName, 
                    expertImage: finalExpertImage, 
                    callerId: user.uid, 
                    callerName: userName, 
                    callerImage: userRealPic || user.photoURL || `https://ui-avatars.com/api/?name=${userName}`,
                    isFreeTrial: hasTrialMins,
                    createdAt: serverTimestamp() 
                });
                await updateDoc(queueDocRef.current, { status: "Discovered", callId: callId, expertId: expertId });
                setStatusText("Host identified. Connecting...");
                
                const unsubCall = onSnapshot(doc(db, "calls", callId), (callSnap) => {
                    if (callSnap.exists()) {
                        const callData = callSnap.data();
                        if (callData.status === "connected" || callData.status === "accepted") {
                            isDiscovered.current = true;
                            if (timeoutRef.current) clearTimeout(timeoutRef.current);
                            unsubCall();
                            deleteDoc(queueDocRef.current).catch(()=>{});
                            
                            router.replace({ 
                                pathname: "/videocall" as any, 
                                params: { 
                                    callId: callId, 
                                    role: 'user',
                                    expertName: finalExpertName, 
                                    expertImage: finalExpertImage || "", 
                                    isFreeTrial: hasTrialMins ? "true" : "false" 
                                } 
                            });
                        } else if (callData.status === "declined" || callData.status === "missed") {
                            hasSentRequest.current = false;
                            unsubCall();
                            setStatusText("Node busy. Searching next...");
                            findExpert();
                        }
                    }
                });
            } catch (e) { hasSentRequest.current = false; }
        };

        startDiscovermaking();
        return () => {
            if (activeUnsubQueue) activeUnsubQueue();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            if (queueDocRef.current && !isDiscovered.current) deleteDoc(queueDocRef.current).catch(e => console.log(e));
        };
    }, [user, searchState, userRealPic, tier, userName, hasTrialMins]);

    const handleRetry = async () => {
        try {
            if (user?.uid) {
                const q = query(collection(db, "calls"), where("callerId", "==", user.uid), where("status", "==", "ringing"));
                const snap = await getDocs(q);
                const batch = writeBatch(db);
                snap.docs.forEach(d => batch.update(d.ref, { status: 'cancelled' }));
                await batch.commit();
            }
        } catch (error) { console.log(error); }

        isDiscovered.current = false;
        hasSentRequest.current = false;
        triedExpertsRef.current = []; 
        setSearchState("searching");
        setStatusText("Re-initializing search...");
    };

    const handleCancel = async () => {
        isDiscovered.current = true;
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (queueDocRef.current) await deleteDoc(queueDocRef.current).catch(e => console.log(e));
        
        try {
            if (user?.uid) {
                const q = query(collection(db, "calls"), where("callerId", "==", user.uid), where("status", "==", "ringing"));
                const snap = await getDocs(q);
                const batch = writeBatch(db);
                snap.docs.forEach(d => batch.update(d.ref, { status: 'cancelled' }));
                await batch.commit();
            }
        } catch (error) { console.log(error); }

        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/');
        }
    };

    return (
        <View style={styles.container}>
            <LinearGradient colors={tier.themeBg} style={StyleSheet.absoluteFill} />
            <View style={[styles.bgGlow, { top: -100, left: -100, backgroundColor: tier.color }]} />
            <View style={[styles.bgGlow, { bottom: -100, right: -100, backgroundColor: tier.secondaryColor }]} />

            <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <View style={styles.topSection}>
                    <Text style={styles.brandName}>TALKPE PRO <Text style={{color: tier.color}}>CONNECT</Text></Text>
                    <Text style={[styles.tagline, {color: tier.secondaryColor}]}>{tier.label} SYNC ACTIVE</Text>
                </View>

                {searchState === "searching" ? (
                    <>
                        <View style={styles.radarContainer}>
                            <RadarCircle delay={0} color={tier.color} />
                            <RadarCircle delay={2000} color={tier.secondaryColor} />
                            <RadarCircle delay={4000} color={tier.color} />
                            
                            {expertAvatars.slice(0, 10).map((uri, index) => {
                                const angle = (index * 36) * (Math.PI / 180);
                                return <FloatingNode key={`exp_${index}`} imageSource={{ uri }} delay={index * 1200} angle={angle} radius={135} borderColor={tier.color} />;
                            })}

                            {AI_AVATARS.map((source, index) => {
                                const angle = (index * 25) * (Math.PI / 180);
                                const radius = 80 + (index % 4) * 22;
                                return <FloatingNode key={`ai_${index}`} imageSource={source} delay={index * 2200} angle={angle} radius={radius} borderColor={tier.secondaryColor} />;
                            })}
                            
                            <View style={[styles.centerAvatar, {borderColor: tier.color, shadowColor: tier.color}]}>
                                <BlurView intensity={70} tint="light" style={styles.avatarBlur}>
                                    <Image 
                                        source={{ uri: userRealPic || user?.photoURL || 'https://ui-avatars.com/api/?name=User&background=0F172A&color=00F2FE&bold=true' }} 
                                        style={styles.userImg} 
                                    />
                                </BlurView>
                                <View style={[styles.pulseDot, {backgroundColor: tier.color}]} />
                            </View>
                        </View>

                        <View style={styles.statusBox}>
                            <ActivityIndicator color={tier.color} size="small" style={{ marginBottom: 15 }} />
                            <Text style={styles.statusText}>{statusText}</Text>
                            <Text style={styles.subStatus}>{tier.status}</Text>
                        </View>

                        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} activeOpacity={0.8}>
                            <BlurView intensity={20} tint="dark" style={styles.cancelBlur}>
                                <Ionicons name="close-circle-outline" size={20} color={tier.secondaryColor} />
                                <Text style={[styles.cancelText, {color: tier.secondaryColor}]}>CANCEL SEARCH</Text>
                            </BlurView>
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={styles.noDiscoverContainer}>
                        <View style={[styles.warningRing, {borderColor: tier.color}]}><Ionicons name="warning-outline" size={60} color={tier.color} /></View>
                        <Text style={styles.noDiscoverTitle}>NO HOST FOUND</Text>
                        <Text style={styles.noDiscoverSub}>All verified hosts are currently engaged. Please try again in a few moments.</Text>
                        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.8}>
                            <LinearGradient colors={[tier.color, tier.secondaryColor]} style={styles.retryGradient} start={{x:0, y:0}} end={{x:1, y:1}}>
                                <Ionicons name="refresh" size={24} color="#FFF" /><Text style={styles.retryText}>RE-INITIALIZE</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.backBtn} onPress={handleCancel} activeOpacity={0.8}><Text style={styles.backText}>GO BACK TO HOME</Text></TouchableOpacity>
                    </View>
                )}
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#020617' },
    bgGlow: { position: 'absolute', width: 450, height: 450, borderRadius: 225, opacity: 0.18 },
    topSection: { position: 'absolute', top: 60, alignItems: 'center' },
    brandName: { color: '#FFF', fontSize: 24, fontWeight: '900', letterSpacing: 6 },
    tagline: { fontSize: 10, fontWeight: '800', letterSpacing: 3, marginTop: 8, textTransform: 'uppercase' },
    radarContainer: { width: 300, height: 300, alignItems: 'center', justifyContent: 'center' },
    radarRing: { position: 'absolute', width: 120, height: 120, borderRadius: 60, borderWidth: 2 },
    centerAvatar: { width: 110, height: 110, borderRadius: 55, padding: 4, backgroundColor: 'rgba(255, 255, 255, 0.1)', borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', zIndex: 20 },
    avatarBlur: { width: 90, height: 90, borderRadius: 45, overflow: 'hidden', borderWidth: 3, borderColor: '#FFF' },
    userImg: { width: '100%', height: '100%' },
    pulseDot: { position: 'absolute', bottom: 10, right: 15, width: 20, height: 20, borderRadius: 10, borderWidth: 3, borderColor: '#020617', zIndex: 30 },
    floatingNode: { position: 'absolute', width: 52, height: 52, borderRadius: 26, borderWidth: 2, overflow: 'hidden', zIndex: 10 },
    nodeImage: { width: '100%', height: '100%' },
    statusBox: { marginTop: 120, alignItems: 'center' },
    statusText: { color: '#FFF', fontSize: 17, fontWeight: '800', letterSpacing: 0.5 },
    subStatus: { color: '#475569', fontSize: 11, fontWeight: '700', marginTop: 8 },
    cancelBtn: { position: 'absolute', bottom: 50 },
    cancelBlur: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 25, paddingVertical: 15, borderRadius: 30, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
    cancelText: { fontSize: 12, fontWeight: '900', letterSpacing: 1.5 },
    noDiscoverContainer: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 30 },
    warningRing: { width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
    noDiscoverTitle: { color: '#FFF', fontSize: 26, fontWeight: '900', letterSpacing: 2, marginBottom: 12 },
    noDiscoverSub: { color: '#94A3B8', fontSize: 14, textAlign: 'center', lineHeight: 22, marginBottom: 50 },
    retryBtn: { width: width * 0.75, borderRadius: 35, elevation: 20 },
    retryGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, borderRadius: 35, gap: 12 },
    retryText: { color: '#FFF', fontSize: 16, fontWeight: '900', letterSpacing: 2 },
    backBtn: { marginTop: 35 },
    backText: { color: '#475569', fontSize: 12, fontWeight: '800', letterSpacing: 1.5 }
});