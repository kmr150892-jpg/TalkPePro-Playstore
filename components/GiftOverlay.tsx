import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

// ✅ ACCURATE THEME & LEVEL CONFIG (LOCKED DEEP-GLOW COLORS)
const getLevelConfig = (beans: number) => {
    if (beans >= 100000000) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'] as const, glow: '#F59E0B' };
    if (beans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'] as const, glow: '#EC4899' };
    if (beans >= 30000000) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'] as const, glow: '#8B5CF6' };
    if (beans >= 10000000) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'] as const, glow: '#3B82F6' };
    if (beans >= 5000000)  return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'] as const, glow: '#06B6D4' };
    if (beans >= 3000000)  return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'] as const, glow: '#10B981' };
    if (beans >= 1000000)  return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'] as const, glow: '#EAB308' };
    if (beans >= 300000)   return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'] as const, glow: '#94A3B8' };
    if (beans >= 100000)   return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'] as const, glow: 'transparent' };
    if (beans >= 30000)    return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'] as const, glow: 'transparent' };
    return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'] as const, glow: 'transparent' };
};

// 🔥 NEW: Added `role` prop to detect if viewer is User or Expert
export default function GiftOverlay({ giftData, onComplete, expertTotalBeans = 0, role = 'expert' }: { giftData: any, onComplete: () => void, expertTotalBeans?: number, role?: string }) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const moveAnim = useRef(new Animated.Value(height)).current;
    const scaleAnim = useRef(new Animated.Value(0.1)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const rotateAnim = useRef(new Animated.Value(0)).current;
    
    const [showFestival, setShowFestival] = useState(false);

    // 🔥 DYNAMIC THEME CALCULATION based on Expert's Level
    const config = getLevelConfig(expertTotalBeans);
    const theme = {
        primary: config.colors[0],
        secondary: config.colors[2],
        accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
    };

    useEffect(() => {
        if (giftData && giftData.amount >= 1) { 
            fadeAnim.setValue(0);
            moveAnim.setValue(height);
            scaleAnim.setValue(0.1);
            pulseAnim.setValue(1);
            rotateAnim.setValue(0);
            setShowFestival(false);

            // 🔥 ZERO DELAY ANIMATION START
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.spring(moveAnim, { 
                    toValue: height * 0.30, 
                    friction: 5, 
                    tension: 40,
                    useNativeDriver: true 
                }),
                Animated.spring(scaleAnim, { 
                    toValue: 1, 
                    friction: 4, 
                    tension: 50,
                    useNativeDriver: true 
                }),
                Animated.timing(rotateAnim, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true
                })
            ]).start();

            // Loop pulse instantly
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.05, duration: 400, useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 400, useNativeDriver: true })
                ])
            ).start();

            // Festival appears almost instantly
            setTimeout(() => {
                setShowFestival(true);
            }, 100);

            const holdTime = giftData.amount >= 10000 ? 4500 : 3000; 

            setTimeout(() => {
                Animated.parallel([
                    Animated.timing(fadeAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
                    Animated.timing(scaleAnim, { toValue: 1.5, duration: 500, useNativeDriver: true }), 
                    Animated.timing(moveAnim, { toValue: -height * 0.2, duration: 500, useNativeDriver: true }) 
                ]).start(() => {
                    setShowFestival(false);
                    onComplete();
                });
            }, holdTime);
        }
    }, [giftData]);

    if (!giftData) return null;

    const rotateInterpolate = rotateAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['-15deg', '0deg']
    });

    const isGrandGift = giftData.amount >= 10000;
    
    const lottieSource = isGrandGift 
        ? require('../assets/images/fireworks.json') 
        : require('../assets/images/confetti.json');   

    // Beans calculation
    const beansEarned = Math.floor((giftData.amount || 0) / 2);

    // Dynamic Icons logic (Locked as per your code)
    let GiftIcon = <MaterialCommunityIcons name="gift-outline" size={24} color={theme.accent} />;
    const giftNameLower = (giftData.giftName || "").toLowerCase();

    if (giftNameLower.includes('rose')) {
      GiftIcon = <MaterialCommunityIcons name="flower" size={60} color={theme.primary} />;
    } else if (giftNameLower.includes('heart')) {
      GiftIcon = <Ionicons name="heart" size={60} color={theme.primary} />;
    } else if (giftNameLower.includes('crown')) {
      GiftIcon = <MaterialCommunityIcons name="crown" size={70} color={theme.accent} />;
    } else if (giftNameLower.includes('lion')) {
      GiftIcon = <MaterialCommunityIcons name="paw" size={70} color={theme.accent} />;
    } else if (giftNameLower.includes('car')) {
      GiftIcon = <Ionicons name="car-sport" size={80} color={theme.secondary} />;
    } else if (giftNameLower.includes('rocket') || giftNameLower.includes('galaxy')) {
      GiftIcon = <Ionicons name="rocket" size={90} color={theme.primary} />;
    } else {
      if (giftData.amount >= 25000) GiftIcon = <Ionicons name="car-sport" size={80} color={theme.primary} />;
      else if (giftData.amount >= 10000) GiftIcon = <MaterialCommunityIcons name="crown" size={70} color={theme.accent} />;
      else if (giftData.amount >= 5000) GiftIcon = <MaterialCommunityIcons name="diamond" size={60} color={theme.secondary} />;
      else GiftIcon = <FontAwesome5 name="thumbs-up" size={50} color={theme.primary} />;
    }

    // 🔥 DUAL TONE BORDER STYLES (FLUID) FOR THE GIFT BOX
    const dynamicDualBorder = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: theme.primary,
        borderRightColor: theme.primary,
        borderTopColor: theme.secondary + '80',
        borderBottomColor: theme.secondary + '80',
    };

    return (
        <View style={styles.fullScreen} pointerEvents="none">
            
            {/* GIFT BOX CONTENT (Pushed Behind Lottie) */}
            <Animated.View style={[
                styles.container, 
                { 
                    opacity: fadeAnim, 
                    transform: [
                        { translateY: moveAnim }, 
                        { scale: scaleAnim },
                        { rotate: rotateInterpolate }
                    ],
                    zIndex: 1 
                }
            ]}>
                {/* 🔥 DYNAMIC GLOW AURA BASED ON LEVEL */}
                <View style={[styles.glowAura, { backgroundColor: theme.primary + '50' }, giftData.amount >= 25000 && { backgroundColor: theme.accent + '60', transform: [{ scale: 1.8 }] }]} />

                <Animated.View style={[
                    styles.giftBox, 
                    dynamicDualBorder,
                    { backgroundColor: 'rgba(15, 23, 42, 0.85)' }, 
                    giftData.amount >= 25000 && { backgroundColor: 'rgba(20, 10, 5, 0.9)', borderColor: theme.accent, borderWidth: 3 }, 
                    { transform: [{ scale: pulseAnim }] } 
                ]}>
                    <View style={[styles.senderBadge, { backgroundColor: theme.primary + '20' }]}>
                        <MaterialCommunityIcons name="star-shooting" size={14} color={theme.accent} />
                        <Text style={[styles.senderBadgeText, { color: '#FFF' }]}>{giftData.senderName} SHARED</Text>
                        <MaterialCommunityIcons name="star-shooting" size={14} color={theme.accent} />
                    </View>

                    <View style={styles.iconWrapper}>
                        {GiftIcon}
                        <Text style={[styles.grandText, { color: theme.accent, textShadowColor: theme.primary + '80' }]}>
                            {giftData.amount >= 50000 ? "PREMIUM UPLINK!" 
                            : giftData.amount >= 25000 ? "SUPER ACHIEVEMENT!" 
                            : giftData.amount >= 10000 ? "CONSULTING ELITE!" 
                            : giftData.amount >= 5000 ? "GOLDEN TIER!" 
                            : giftData.amount >= 1000 ? "TOP APPRECIATION!" 
                            : giftData.amount >= 500 ? "SHINING NODE!" 
                            : "KUDOS!"}
                        </Text>
                    </View>

                    {/* 🔥 CONDITIONAL DISPLAY: User sees Diamonds, Host sees Rewards 🔥 */}
                    {role === 'user' ? (
                        <View style={[styles.beansValueBadge, { backgroundColor: 'rgba(0, 242, 254, 0.1)', borderColor: 'rgba(0, 242, 254, 0.4)' }]}>
                            <MaterialCommunityIcons name="diamond-stone" size={18} color="#00F2FE" />
                            <Text style={[styles.beansValueText, { color: '#00F2FE' }]}>{giftData.amount} DIAMONDS</Text>
                        </View>
                    ) : (
                        <View style={[styles.beansValueBadge, { backgroundColor: theme.primary + '20', borderColor: theme.primary + '50' }]}>
                            <MaterialCommunityIcons name="seed" size={18} color={theme.accent} />
                            <Text style={[styles.beansValueText, { color: theme.accent }]}>+{beansEarned} REWARDS</Text>
                        </View>
                    )}
                    
                </Animated.View>
            </Animated.View>

            {/* ✅ FESTIVAL BACKGROUND LOTTIE (Brought to FRONT to cover text) */}
            {showFestival && (
                <LottieView
                    source={lottieSource}
                    autoPlay
                    loop={isGrandGift} 
                    style={styles.lottieBackground}
                    speed={isGrandGift ? 1 : 1.5}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    fullScreen: { 
        ...StyleSheet.absoluteFillObject, 
        zIndex: 9999, 
        justifyContent: 'flex-start', 
        alignItems: 'center' 
    },
    lottieBackground: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10, 
        transform: [{ scale: 1.3 }] 
    },
    container: { 
        alignItems: 'center', 
        justifyContent: 'center',
        width: width * 0.85, 
    },
    glowAura: {
        position: 'absolute',
        width: width * 0.7,
        height: width * 0.7,
        borderRadius: width * 0.35,
        transform: [{ scale: 1.5 }],
        opacity: 0.6,
    },
    giftBox: { 
        paddingVertical: 25, 
        paddingHorizontal: 20, 
        borderRadius: 35, 
        alignItems: 'center', 
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 20,
    },
    senderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 10,
    },
    senderBadgeText: {
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1.5,
        marginHorizontal: 8,
        textTransform: 'uppercase'
    },
    iconWrapper: {
        alignItems: 'center',
        marginVertical: 5,
    },
    grandText: { 
        fontSize: 26, 
        fontWeight: '900', 
        marginTop: 15, 
        textAlign: 'center', 
        textShadowRadius: 15,
        letterSpacing: 1
    },
    beansValueBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 15,
        borderWidth: 1,
    },
    beansValueText: {
        fontSize: 16,
        fontWeight: '900',
        marginLeft: 6,
        letterSpacing: 1
    }
});