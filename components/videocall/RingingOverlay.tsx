import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { db } from '../../firebaseConfig';

const { width, height } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// 🔥 THE UNIVERSAL TIER ENGINE (LOCKED PROTOCOL)
const calculateTier = (diamonds: number) => {
    if (diamonds >= 500000001) return { lvl: 8, label: 'TITAN L8', color: '#FF0033' };
    if (diamonds >= 100000001) return { lvl: 7, label: 'MYTHIC L7', color: '#D946EF' };
    if (diamonds >= 50000000) return { lvl: 6, label: 'GRANDMASTER L6', color: '#9c77f3' };
    if (diamonds >= 10000000) return { lvl: 5, label: 'ELITE L5', color: '#00F2FE' };
    if (diamonds >= 5000000) return { lvl: 4, label: 'LEGEND L4', color: '#d0630a' };
    if (diamonds >= 1000000) return { lvl: 3, label: 'DIAMOND L3', color: '#4ADE80' };
    if (diamonds >= 200001) return { lvl: 2, label: 'GOLD L2', color: '#ffae00' };
    return { lvl: 1, label: 'SILVER L1', color: '#0f33e7' };
};

interface RingingOverlayProps {
    role: string;
    callerDisplayName: string;
    expertName: string;
    ringTimerAnim: Animated.Value;
    onAcceptCall: () => void;
    onRejectCall: () => void;
    handleCallEnd: (shouldDeduct: boolean, status: string) => void;
    callerId?: string; // Optional but needed for Tier Sync
    expertId?: string; // Optional but needed for Tier Sync
}

export default function RingingOverlay({
    role,
    callerDisplayName,
    expertName,
    ringTimerAnim,
    onAcceptCall,
    onRejectCall,
    handleCallEnd,
    callerId,
    expertId
}: RingingOverlayProps) {
    
    const [profileData, setProfileData] = useState<any>(null);
    const pulseAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        // 🔥 REAL-TIME INSTANT FETCH PROTOCOL
        const isConsultant = role === 'expert' || role === 'host';
        const targetId = isConsultant ? callerId : expertId;
        if (!targetId) return;

        const unsub = onSnapshot(doc(db, "users", targetId), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setProfileData(data);
            }
        });

        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        ).start();

        return () => unsub();
    }, [callerId, expertId]);

    // Tier Calculation Sync
    const tierData = profileData?.totalSpentDiamonds || profileData?.totalBeansEarned || 0;
    const tier = calculateTier(tierData);

    // SVG Settings
    const radius = 85; 
    const stroke = 8; 
    const circumference = radius * 2 * Math.PI;
    const centerPoint = radius + stroke;

    // 🔥 SATTI FIX: Host Role Logic for Wording Compliance
    const isConsultant = role === 'expert' || role === 'host';

    const displayAvatarName = isConsultant ? callerDisplayName : expertName;
    const displayLabel = isConsultant ? `INCOMING ${tier.label}` : "ESTABLISHING UPLINK...";
    const displayName = isConsultant ? callerDisplayName : expertName;
    
    // ✅ IMAGE SOURCE PRIORITY: Force Cloudinary -> Google -> Avatar
    const finalImageSource = profileData?.profilePic || profileData?.photoURL || null;
    const profilePicObj = finalImageSource 
        ? { uri: finalImageSource } 
        : { uri: `https://ui-avatars.com/api/?name=${displayAvatarName}&background=0F172A&color=${tier.color.replace('#','')}&size=256&bold=true` };

    return (
        <View style={styles.ringingOverlay}>
            <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
            
            {/* Background Tier Aura Magic */}
            <View style={[styles.glowAura, { backgroundColor: tier.color, opacity: 0.15 }]} />

            <View style={styles.callerInfo}>
                <Animated.View style={[styles.roundTimerContainer, { transform: [{ scale: pulseAnim }] }]}>
                    <Svg width={centerPoint * 2} height={centerPoint * 2} style={styles.absSvg}>
                        <Circle 
                            cx={centerPoint} 
                            cy={centerPoint} 
                            r={radius} 
                            stroke="rgba(255,255,255,0.05)" 
                            strokeWidth={stroke} 
                            fill="transparent" 
                        />
                        <AnimatedCircle 
                            cx={centerPoint} 
                            cy={centerPoint} 
                            r={radius} 
                            stroke={tier.color} 
                            strokeWidth={stroke} 
                            fill="transparent" 
                            strokeDasharray={circumference} 
                            strokeDashoffset={ringTimerAnim.interpolate({ 
                                inputRange: [0, 1], 
                                outputRange: [circumference, 0] 
                            })} 
                            strokeLinecap="round" 
                        />
                    </Svg>
                    <View style={[styles.avatarWrapper, { borderColor: tier.color }]}>
                        {/* ✅ STRICT OBJECT USAGE FOR IMAGE */}
                        <Image 
                            source={profilePicObj} 
                            style={styles.callerAvatar} 
                            resizeMode="cover"
                        />
                    </View>
                </Animated.View>

                <View style={styles.textGroup}>
                    <View style={[styles.tierBadge, { borderColor: tier.color + '60' }]}>
                         <MaterialCommunityIcons name="shield-check" size={12} color={tier.color} />
                         <Text style={[styles.incomingLabel, { color: tier.color }]}>{displayLabel}</Text>
                    </View>
                    <Text style={styles.callerName}>{displayName.toUpperCase()}</Text>
                    <Text style={styles.subStatusText}>TalkPe Secure Connectivity Node</Text>
                </View>
            </View>

            <View style={styles.ringingActions}>
                {/* Reject Button */}
                <TouchableOpacity 
                    activeOpacity={0.8}
                    style={[styles.ringBtn, styles.rejectBtn]} 
                    onPress={isConsultant ? onRejectCall : () => handleCallEnd(false, 'cancelled')}
                >
                    <Ionicons name="close" size={42} color="#FFF" />
                    <Text style={styles.actionLabel}>DECLINE</Text>
                </TouchableOpacity>
                
                {/* Accept Button (Only for Host) */}
                {isConsultant && (
                    <TouchableOpacity activeOpacity={0.8} style={[styles.ringBtn, styles.acceptBtn, { backgroundColor: tier.color }]} onPress={onAcceptCall}>
                        <Ionicons name="videocam" size={38} color="#FFF" />
                        <Text style={styles.actionLabel}>ACCEPT</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    ringingOverlay: { 
        ...StyleSheet.absoluteFillObject, 
        zIndex: 200, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)'
    },
    glowAura: {
        position: 'absolute',
        width: width * 0.8,
        height: width * 0.8,
        borderRadius: width * 0.4,
        // filter: 'blur(80px)', // Fixed for cross-platform support
    },
    roundTimerContainer: { 
        width: 200, 
        height: 200, 
        justifyContent: 'center', 
        alignItems: 'center', 
        position: 'relative' 
    },
    absSvg: { 
        position: 'absolute', 
        transform: [{ rotate: '-90deg' }] 
    },
    avatarWrapper: {
        width: 155,
        height: 155,
        borderRadius: 77.5,
        borderWidth: 4,
        padding: 3,
        backgroundColor: '#000',
        elevation: 20,
        shadowOpacity: 0.5,
        shadowRadius: 15,
        overflow: 'hidden'
    },
    callerAvatar: { 
        width: '100%', 
        height: '100%', 
        borderRadius: 70 
    },
    callerInfo: { 
        alignItems: 'center', 
        marginBottom: 80 
    },
    textGroup: {
        alignItems: 'center',
        marginTop: 40
    },
    tierBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        backgroundColor: 'rgba(0,0,0,0.4)'
    },
    incomingLabel: { 
        fontSize: 10, 
        fontWeight: '900', 
        textTransform: 'uppercase', 
        letterSpacing: 3 
    },
    callerName: { 
        color: '#FFF', 
        fontSize: 38, 
        fontWeight: '900', 
        marginTop: 15,
        letterSpacing: -1
    },
    subStatusText: {
        color: '#64748B',
        fontSize: 12,
        fontWeight: '700',
        marginTop: 8,
        letterSpacing: 1
    },
    ringingActions: { 
        flexDirection: 'row', 
        gap: 50 
    },
    ringBtn: { 
        width: 85, 
        height: 85, 
        borderRadius: 25, 
        justifyContent: 'center', 
        alignItems: 'center', 
        elevation: 15,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    actionLabel: {
        position: 'absolute',
        bottom: -25,
        color: '#FFF',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2
    },
    acceptBtn: { 
        shadowColor: '#22C55E' 
    },
    rejectBtn: { 
        backgroundColor: '#EF4444',
        shadowColor: '#EF4444'
    }
});