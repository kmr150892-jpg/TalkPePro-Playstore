import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

const { width } = Dimensions.get('window');

// 🔥 THE ULTIMATE DYNAMIC TIER ENGINE (STRICT THEME SYNC)
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

export default function ExpertNotificationBar() {
    const [DiscoverRequest, setDiscoverRequest] = useState<any>(null);
    const [userTier, setUserTier] = useState<any>(calculateUserLevel(0));
    const translateY = useRef(new Animated.Value(-200)).current; 
    const router = useRouter();
    const consultant = auth.currentUser;

    useEffect(() => {
        if (!consultant) return;

        const q = query(
            collection(db, "Discover_queue"),
            where("expertId", "==", consultant.uid),
            where("status", "==", "Discovered")
        );

        const unsub = onSnapshot(q, async (snap) => {
            if (!snap.empty) {
                const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as any; 
                
                // 🔥 NAME FIX: Fetch real name to bypass Google's default 'TOTOFILM'
                let finalName = data.userName || "Client";
                try {
                    const uSnap = await getDoc(doc(db, "users", data.userId));
                    if (uSnap.exists()) {
                        const uData = uSnap.data();
                        finalName = uData.name || uData.userName || finalName;
                    }
                } catch(e) {}
                
                // Force fallback to 'Client' if the email-based name still shows
                if (finalName.toUpperCase() === 'TOTOFILM' || finalName.includes('@')) {
                    finalName = 'Client';
                }
                data.displayCallerName = finalName;

                setDiscoverRequest(data);
                
                const DiscoveredTier = calculateUserLevel(data.totalSpent || (data.tierLvl ? data.tierLvl * 100000 : 0));
                setUserTier(DiscoveredTier);

                Animated.spring(translateY, { 
                    toValue: 0, 
                    useNativeDriver: true, 
                    bounciness: 12 
                }).start();
            } else {
                hideBar();
            }
        });

        return () => unsub();
    }, [consultant]);

    const hideBar = () => {
        Animated.timing(translateY, { 
            toValue: -200, 
            duration: 500, 
            useNativeDriver: true 
        }).start(() => {
            setDiscoverRequest(null);
        });
    };

    const handleAccept = async () => {
        if (!DiscoverRequest) return;
        try {
            // 🔥 DOUBLE-RING FIX: Change status to 'accepted' so videocall.tsx skips the ringing overlay!
            await updateDoc(doc(db, "calls", DiscoverRequest.callId), {
                status: "accepted",
                acceptedAt: serverTimestamp()
            });

            // Push to videocall and pass the correct name
            router.push({
                pathname: "/videocall" as any,
                params: { 
                    callId: DiscoverRequest.callId, 
                    role: 'expert', 
                    callerName: DiscoverRequest.displayCallerName 
                }
            });

            hideBar();
        } catch (e) { console.log("Accept Error:", e); }
    };

    const handleReject = async () => {
        if (!DiscoverRequest) return;
        try {
            await updateDoc(doc(db, "Discover_queue", DiscoverRequest.id), {
                status: "searching",
                expertId: null
            });
            hideBar();
        } catch (e) { console.log("Reject Error:", e); }
    };

    if (!DiscoverRequest) return null;

    return (
        <Animated.View style={[styles.container, { transform: [{ translateY }] }]}>
            <BlurView intensity={90} tint="dark" style={[styles.glassBar, { borderColor: userTier.color, shadowColor: userTier.color }]}>
                <LinearGradient 
                    colors={['rgba(255,255,255,0.05)', userTier.color + '20']} 
                    style={StyleSheet.absoluteFill} 
                />
                <View style={styles.content}>
                    <Image 
                        source={{ uri: DiscoverRequest.userImage || `https://ui-avatars.com/api/?name=${DiscoverRequest.displayCallerName}&background=0F172A&color=00F2FE&size=256&bold=true` }} 
                        style={[styles.avatar, { borderColor: userTier.color }]} 
                    />
                    <View style={styles.textDetails}>
                        <Text style={[styles.incomingText, { color: userTier.color }]}>
                            {userTier.label} SYNC
                        </Text>
                        <Text style={styles.userName} numberOfLines={1}>{DiscoverRequest.displayCallerName}</Text>
                    </View>

                    <View style={styles.actions}>
                        <TouchableOpacity onPress={handleReject} style={[styles.btn, styles.rejectBtn]}>
                            <Ionicons name="close" size={22} color="#FFF" />
                        </TouchableOpacity>
                        
                        <TouchableOpacity onPress={handleAccept} style={[styles.btn, styles.acceptBtn, { backgroundColor: userTier.color, shadowColor: userTier.color }]}>
                            <Ionicons name="checkmark-sharp" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>
                </View>
            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 50, 
        left: 12,
        right: 12,
        zIndex: 99999,
        elevation: 25,
    },
    glassBar: {
        borderRadius: 24,
        overflow: 'hidden',
        borderWidth: 1.5,
        padding: 10,
        backgroundColor: 'rgba(2, 6, 23, 0.7)', 
        shadowOpacity: 0.6,
        shadowRadius: 15,
        elevation: 10,
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2.5,
    },
    textDetails: {
        flex: 1,
        marginLeft: 15,
    },
    incomingText: {
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    userName: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '800',
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
        marginRight: 5,
    },
    btn: {
        width: 44,
        height: 44,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        shadowOpacity: 0.4,
        shadowRadius: 5,
        elevation: 5,
    },
    rejectBtn: {
        backgroundColor: 'rgba(239, 68, 68, 0.9)',
        shadowColor: '#EF4444',
    },
    acceptBtn: {
        // Background and shadow handled dynamically inline
    }
});