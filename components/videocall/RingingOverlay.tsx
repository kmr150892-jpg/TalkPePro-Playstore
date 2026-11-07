import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { db } from '../../firebaseConfig';
import { startRingtone, stopRingtone } from '../../utils/sounds'; // 🔔 NEW: ring sound

const { width, height } = Dimensions.get('window');
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const GOLD = '#FFD66B';

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
    const rippleAnim = useRef(new Animated.Value(0)).current;
    const enterAnim = useRef(new Animated.Value(0)).current;

    // 🎬 Animations: gentle pulse + one expanding ripple + a single entrance glide
    useEffect(() => {
        const pulse = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.08, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        const ripple = Animated.loop(
            Animated.timing(rippleAnim, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true })
        );
        pulse.start();
        ripple.start();
        Animated.timing(enterAnim, { toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
        return () => { pulse.stop(); ripple.stop(); };
    }, []);

    // 🔔 NEW: Ring while this overlay is visible; stops on accept / reject / timeout (unmount)
    useEffect(() => {
        startRingtone();
        return () => { stopRingtone(); };
    }, []);

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
    const displayLabel = isConsultant ? `Incoming ${tier.label}` : "Establishing uplink...";
    const displayName = isConsultant ? callerDisplayName : expertName;
    
    // ✅ IMAGE SOURCE PRIORITY: Force Cloudinary -> Google -> Avatar
    const finalImageSource = profileData?.profilePic || profileData?.photoURL || null;
    const profilePicObj = finalImageSource 
        ? { uri: finalImageSource } 
        : { uri: `https://ui-avatars.com/api/?name=${displayAvatarName}&background=0F172A&color=${tier.color.replace('#','')}&size=256&bold=true` };

    const rippleScale = rippleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.55] });
    const rippleOpacity = rippleAnim.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 0.45, 0] });

    return (
        <View style={styles.ringingOverlay}>
            <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={styles.darkTint} pointerEvents="none" />
            
            {/* Background Tier Aura Magic: two overlapping glows (tier colour + gold) */}
            <View style={[styles.glowAura, { backgroundColor: tier.color, opacity: 0.16, top: height * 0.14 }]} />
            <View style={[styles.glowAura, { backgroundColor: GOLD, opacity: 0.07, width: width * 0.55, height: width * 0.55, borderRadius: width * 0.275, top: height * 0.3, right: -width * 0.1 }]} />

            <Animated.View
                style={[
                    styles.callerInfo,
                    { opacity: enterAnim, transform: [{ translateY: enterAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] },
                ]}
            >
                <Animated.View style={[styles.roundTimerContainer, { transform: [{ scale: pulseAnim }] }]}>
                    {/* Ripple: one ring that expands and fades, like a call signal */}
                    <Animated.View
                        style={[
                            styles.ripple,
                            { borderColor: tier.color, opacity: rippleOpacity, transform: [{ scale: rippleScale }] },
                        ]}
                    />

                    <Svg width={centerPoint * 2} height={centerPoint * 2} style={styles.absSvg}>
                        <Defs>
                            {/* Countdown ring blends tier colour into gold */}
                            <SvgGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <Stop offset="0%" stopColor={tier.color} />
                                <Stop offset="100%" stopColor={GOLD} />
                            </SvgGradient>
                        </Defs>
                        <Circle 
                            cx={centerPoint} 
                            cy={centerPoint} 
                            r={radius} 
                            stroke="rgba(255,255,255,0.07)" 
                            strokeWidth={stroke} 
                            fill="transparent" 
                        />
                        <AnimatedCircle 
                            cx={centerPoint} 
                            cy={centerPoint} 
                            r={radius} 
                            stroke="url(#ringGrad)" 
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
                    <View style={[styles.avatarWrapper, { borderColor: tier.color, shadowColor: tier.color }]}>
                        {/* ✅ STRICT OBJECT USAGE FOR IMAGE */}
                        <Image 
                            source={profilePicObj} 
                            style={styles.callerAvatar} 
                            resizeMode="cover"
                        />
                    </View>
                </Animated.View>

                <View style={styles.textGroup}>
                    <View style={[styles.tierBadge, { borderColor: tier.color + '70', backgroundColor: tier.color + '1A' }]}>
                         <MaterialCommunityIcons name="shield-check" size={14} color={tier.color} />
                         <Text style={[styles.incomingLabel, { color: tier.color }]}>{displayLabel}</Text>
                    </View>
                    <Text style={styles.callerName} numberOfLines={1}>{displayName}</Text>
                    <Text style={styles.subStatusText}>TalkPe Secure Connectivity Node</Text>
                </View>
            </Animated.View>

            <View style={styles.ringingActions}>
                {/* Reject Button */}
                <View style={styles.actionItem}>
                    <TouchableOpacity 
                        activeOpacity={0.8}
                        style={[styles.ringBtn, styles.rejectBtn]} 
                        onPress={isConsultant ? onRejectCall : () => handleCallEnd(false, 'cancelled')}
                    >
                        <Ionicons name="close" size={38} color="#FFF" />
                    </TouchableOpacity>
                    <Text style={styles.actionLabel}>Decline</Text>
                </View>
                
                {/* Accept Button (Only for Host) */}
                {isConsultant && (
                    <View style={styles.actionItem}>
                        <TouchableOpacity activeOpacity={0.8} onPress={onAcceptCall} style={[styles.acceptShadow, { shadowColor: tier.color }]}>
                            <LinearGradient
                                colors={[tier.color, tier.color + 'B0']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={[styles.ringBtn, styles.acceptBtn]}
                            >
                                <Ionicons name="videocam" size={36} color="#FFF" />
                            </LinearGradient>
                        </TouchableOpacity>
                        <Text style={styles.actionLabel}>Accept</Text>
                    </View>
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
    darkTint: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(4, 7, 18, 0.55)',
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
    ripple: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
    },
    absSvg: { 
        position: 'absolute', 
        transform: [{ rotate: '-90deg' }] 
    },
    avatarWrapper: {
        width: 155,
        height: 155,
        borderRadius: 77.5,
        borderWidth: 3,
        padding: 3,
        backgroundColor: '#000',
        elevation: 20,
        shadowOpacity: 0.7,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 0 },
        overflow: 'hidden'
    },
    callerAvatar: { 
        width: '100%', 
        height: '100%', 
        borderRadius: 70 
    },
    callerInfo: { 
        alignItems: 'center', 
        marginBottom: 70 
    },
    textGroup: {
        alignItems: 'center',
        marginTop: 38,
        paddingHorizontal: 24,
    },
    tierBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        paddingHorizontal: 15,
        paddingVertical: 7,
        borderRadius: 20,
        borderWidth: 1,
    },
    incomingLabel: { 
        fontSize: 12, 
        fontWeight: '800', 
        letterSpacing: 0.6 
    },
    callerName: { 
        color: '#FFF', 
        fontSize: 34, 
        fontWeight: '800', 
        marginTop: 16,
        letterSpacing: -0.5,
        textAlign: 'center',
    },
    subStatusText: {
        color: 'rgba(148,163,184,0.85)',
        fontSize: 12.5,
        fontWeight: '600',
        marginTop: 8,
        letterSpacing: 0.4
    },
    ringingActions: { 
        flexDirection: 'row', 
        alignItems: 'flex-start',
        gap: 56 
    },
    actionItem: {
        alignItems: 'center',
    },
    ringBtn: { 
        width: 78, 
        height: 78, 
        borderRadius: 39, 
        justifyContent: 'center', 
        alignItems: 'center', 
        borderWidth: 1.5,
        borderColor: 'rgba(255,255,255,0.22)'
    },
    actionLabel: {
        marginTop: 10,
        color: 'rgba(255,255,255,0.9)',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3
    },
    acceptShadow: {
        borderRadius: 39,
        shadowOpacity: 0.85,
        shadowRadius: 18,
        shadowOffset: { width: 0, height: 0 },
        elevation: 16,
    },
    acceptBtn: { 
        width: 78,
        height: 78,
    },
    rejectBtn: { 
        backgroundColor: '#EF4444',
        shadowColor: '#EF4444',
        elevation: 12,
    }
});