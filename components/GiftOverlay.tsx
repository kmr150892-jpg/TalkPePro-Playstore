import { FontAwesome5, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

// ✅ ACCURATE THEME & LEVEL CONFIG (LOCKED DEEP-GLOW COLORS)
const getLevelConfig = (beans: number) => {
    if (beans >= 100000000) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'] as const, glow: '#F59E0B' };
    if (beans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'] as const, glow: '#EC4899' };
    if (beans >= 30000000) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'] as const, glow: '#8B5CF6' };
    if (beans >= 10000000) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'] as const, glow: '#3B82F6' };
    if (beans >= 500000)  return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'] as const, glow: '#06B6D4' };
    if (beans >= 3000000)  return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'] as const, glow: '#10B981' };
    if (beans >= 1000000)  return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'] as const, glow: '#EAB308' };
    if (beans >= 300000)   return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'] as const, glow: '#94A3B8' };
    if (beans >= 100000)   return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'] as const, glow: 'transparent' };
    if (beans >= 30000)    return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'] as const, glow: 'transparent' };
    return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'] as const, glow: 'transparent' };
};

// 🔥 SATTI FIX: Image Mapper function based on your assets (Corrected Exact Names)
const getGiftImage = (giftName: string) => {
    const name = (giftName || "").toLowerCase();
    if (name.includes('chocolate')) return require('../assets/images/chocolate.png');
    if (name.includes('cake')) return require('../assets/images/cake.png');
    
    // 🔥 PUDHUSA ADD PANNA GIFTS 🔥
    if (name.includes('talent crown')) return require('../assets/images/Talent Crown.png');
    if (name.includes('golden shoe')) return require('../assets/images/Golden Shoe.png');
    if (name.includes('melody queen')) return require('../assets/images/Melody Queen.png');
    if (name.includes('rockstar')) return require('../assets/images/Rockstar.png');
    if (name.includes('rising star')) return require('../assets/images/Rising Star.png');
    if (name.includes('superstar mic')) return require('../assets/images/Superstar Mic.png');

    // Pazhaya Gifts
    if (name.includes('crown')) return require('../assets/images/crown.png');
    if (name.includes('diamond')) return require('../assets/images/diamond.png');
    if (name.includes('car')) return require('../assets/images/car.png');
    if (name.includes('private jet')) return require('../assets/images/private jet.png');
    if (name.includes('palace')) return require('../assets/images/palace.png');
    
    return null;
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
                    toValue: height * 0.20, // 🔥 SATTI FIX: Whole container placed perfectly at 20% height for absolute screen centering!
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
    
    // 🔥 SATTI FIX: Fetch image source if it matches our custom gifts
    const customImageSource = getGiftImage(giftNameLower);

    if (customImageSource) {
        // Render Image if it's one of the custom PNGs
        GiftIcon = <Image source={customImageSource} style={styles.customGiftImage} resizeMode="contain" />;
    } else if (giftNameLower.includes('rose')) {
      GiftIcon = <MaterialCommunityIcons name="flower" size={120} color={theme.primary} />; 
    } else if (giftNameLower.includes('heart')) {
      GiftIcon = <Ionicons name="heart" size={120} color={theme.primary} />; 
    } else if (giftNameLower.includes('crown')) {
      GiftIcon = <MaterialCommunityIcons name="crown" size={140} color={theme.accent} />; 
    } else if (giftNameLower.includes('lion')) {
      GiftIcon = <MaterialCommunityIcons name="paw" size={140} color={theme.accent} />; 
    } else if (giftNameLower.includes('car')) {
      GiftIcon = <Ionicons name="car-sport" size={160} color={theme.secondary} />; 
    } else if (giftNameLower.includes('rocket') || giftNameLower.includes('galaxy')) {
      GiftIcon = <Ionicons name="rocket" size={160} color={theme.primary} />; 
    } else {
      if (giftData.amount >= 25000) GiftIcon = <Ionicons name="car-sport" size={160} color={theme.primary} />; 
      else if (giftData.amount >= 10000) GiftIcon = <MaterialCommunityIcons name="crown" size={140} color={theme.accent} />; 
      else if (giftData.amount >= 5000) GiftIcon = <MaterialCommunityIcons name="diamond" size={120} color={theme.secondary} />; 
      else GiftIcon = <FontAwesome5 name="thumbs-up" size={100} color={theme.primary} />; 
    }

    // 🔥 SATTI FIX: DUAL TONE BORDER STYLES REMOVED (Made Transparent) SO NO BOX APPEARS
    const dynamicDualBorder = {
        borderLeftWidth: 0,
        borderRightWidth: 0,
        borderTopWidth: 0,
        borderBottomWidth: 0,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: 'transparent',
        borderBottomColor: 'transparent',
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
                {/* 🔥 SATTI FIX: Glow Aura made completely transparent so the rose color is GONE 🔥 */}
                <View style={[styles.glowAura, { backgroundColor: 'transparent' }, giftData.amount >= 25000 && { backgroundColor: 'transparent', transform: [{ scale: 1.8 }] }]} />

                <Animated.View style={[
                    styles.giftBox, 
                    dynamicDualBorder,
                    { backgroundColor: 'transparent' }, // 🔥 SATTI FIX: Changed from rgba to transparent
                    giftData.amount >= 25000 && { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0 }, // 🔥 SATTI FIX: Made transparent
                    { transform: [{ scale: pulseAnim }] } 
                ]}>
                    <View style={[styles.senderBadge, { backgroundColor: 'rgba(0,0,0,0.5)', borderColor: 'rgba(255,255,255,0.2)' }]}>
                        <MaterialCommunityIcons name="star-shooting" size={16} color="#FFD700" />
                        <Text style={[styles.senderBadgeText, { color: '#FFF' }]}>{giftData.senderName} SHARED</Text>
                        <MaterialCommunityIcons name="star-shooting" size={16} color="#FFD700" />
                    </View>

                    <View style={styles.iconWrapper}>
                        {GiftIcon}
                        
                        {/* 🔥 SATTI FIX: PREMIUM GOLD COLOR, SMALLER TEXT SIZE 🔥 */}
                        <Text style={[styles.grandText, { color: '#FFD700', textShadowColor: 'rgba(0,0,0,0.9)' }]}>
                            {giftData.giftName ? `${giftData.giftName.toUpperCase()}!` : "KUDOS!"}
                        </Text>
                    </View>

                    {/* 🔥 CONDITIONAL DISPLAY: User sees Diamonds, Host sees Rewards 🔥 */}
                    {role === 'user' ? (
                        <View style={[styles.beansValueBadge, { backgroundColor: 'rgba(0, 0, 0, 0.6)', borderColor: 'rgb(255, 128, 0)' }]}>
                            <MaterialCommunityIcons name="diamond-stone" size={20} color="#fea900" />
                            <Text style={[styles.beansValueText, { color: '#ff9900'  }]}>{giftData.amount} DIAMONDS</Text>
                        </View>
                    ) : (
                        <View style={[styles.beansValueBadge, { backgroundColor: 'rgba(0, 0, 0, 0.6)', borderColor: '#ff9900'  }]}>
                            <Text style={{ fontSize: 20 }}>🎖️</Text>
                            <Text style={[styles.beansValueText, { color: '#ff9900' }]}>+{beansEarned} REWARDS</Text>
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
        width: width * 0.9, 
    },
    glowAura: {
        position: 'absolute',
        width: width * 0.75,
        height: width * 0.75,
        borderRadius: width * 0.375,
        transform: [{ scale: 1.6 }],
        opacity: 0, 
        filter: 'blur(40px)',
    },
    giftBox: { 
        paddingVertical: 35, 
        paddingHorizontal: 25, 
        borderRadius: 45, 
        alignItems: 'center', 
        width: '100%',
        shadowColor: 'transparent', 
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
    },
    senderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 18,
        borderRadius: 25,
        marginBottom: 15,
        marginTop: 90, 
        borderWidth: 1,
    },
    senderBadgeText: {
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 2,
        marginHorizontal: 8,
        textTransform: 'uppercase'
    },
    iconWrapper: {
        alignItems: 'center',
        marginVertical: 10,
    },
    customGiftImage: {
        width: 380, 
        height: 380, 
        marginTop: -30, 
        marginBottom: -50, 
    },
    grandText: { 
        fontSize: 24, 
        fontWeight: '900', 
        marginTop: -15, 
        textAlign: 'center', 
        textShadowRadius: 10,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    beansValueBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: 30,
        marginTop: -10, 
        borderWidth: 1.5,
    },
    beansValueText: {
        fontSize: 18,
        fontWeight: '900',
        marginLeft: 8,
        letterSpacing: 1.5
    }
});