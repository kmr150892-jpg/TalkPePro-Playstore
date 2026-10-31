import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Alert, Animated, Easing, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// 🔥 SATTI FIX: UPDATED GIFT LIST TO INCLUDE ALL YOUR PREMIUM CUSTOM IMAGE GIFTS 🔥
const GIFT_OPTIONS = [
    // Total 13 Gifts from 100 to 1,000,000 based on the provided assets
    { id: '1', name: 'Chocolate', amount: 100, type: 'diamond', icon: 'gift' },
    { id: '2', name: 'Cake', amount: 500, type: 'diamond', icon: 'cake' },
    { id: '3', name: 'Diamond', amount: 1000, type: 'diamond', icon: 'diamond-stone' },
    { id: '4', name: 'Crown', amount: 5000, type: 'diamond', icon: 'crown' },
    { id: '5', name: 'Car', amount: 10000, type: 'diamond', icon: 'car' },
    { id: '6', name: 'Private Jet', amount: 25000, type: 'diamond', icon: 'airplane' },
    { id: '7', name: 'Palace', amount: 50000, type: 'diamond', icon: 'castle' },
    { id: '8', name: 'Golden Shoe', amount: 100000, type: 'diamond', icon: 'shoe-heel' },
    { id: '9', name: 'Melody Queen', amount: 150000, type: 'diamond', icon: 'music' },
    // 🔥 SATTI FIX: Changed 'Rockstar Guitar' to 'Rockstar' & Added 'Rising Star' 🔥
    { id: '10', name: 'Rockstar', amount: 200000, type: 'diamond', icon: 'guitar-electric' },
    { id: '11', name: 'Rising Star', amount: 300000, type: 'diamond', icon: 'star' },
    { id: '12', name: 'Superstar Mic', amount: 500000, type: 'diamond', icon: 'microphone-variant' },
    { id: '13', name: 'Talent Crown', amount: 1000000, type: 'diamond', icon: 'crown' },
];

// ✅ ACCURATE THEME & LEVEL CONFIG (LOCKED DEEP-GLOW COLORS)
const getLevelConfig = (beans: number) => {
    if (beans >= 100000000) return { lvl: 10, colors: ['#ff0404', '#F59E0B', '#df03ee'] as const, glow: '#F59E0B' };
    if (beans >= 50000000) return { lvl: 9, colors: ['#f40691', '#dbc0c0', '#0a0303'] as const, glow: '#EC4899' };
    if (beans >= 30000000) return { lvl: 8, colors: ['#660aee', '#d4cfdf', '#d40808'] as const, glow: '#8B5CF6' };
    if (beans >= 10000000) return { lvl: 7, colors: ['#0af635', '#ca0bf5', '#fd068a'] as const, glow: '#3B82F6' };
    if (beans >= 5000000)  return { lvl: 6, colors: ['#f70606', '#fdec05', '#fad906'] as const, glow: '#06B6D4' };
    if (beans >= 3000000)  return { lvl: 5, colors: ['#136a3e', '#10B981', '#f6085b'] as const, glow: '#10B981' };
    if (beans >= 1000000)  return { lvl: 4, colors: ['#ffd001', '#EAB308', '#1d00f9'] as const, glow: '#EAB308' };
    if (beans >= 300000)   return { lvl: 3, colors: ['#bababa', '#74706f', '#bc0e08'] as const, glow: '#94A3B8' };
    if (beans >= 100000)   return { lvl: 2, colors: ['#ff8604', '#f29d0a', '#1505fc'] as const, glow: 'transparent' };
    if (beans >= 30000)    return { lvl: 1, colors: ['#03ffc8', '#13feea', '#f64a06'] as const, glow: 'transparent' };
    return { lvl: 0, colors: ['#f807cf', '#f607e2', '#2a06f5'] as const, glow: 'transparent' };
};

// 🔥 SATTI FIX: Path updated from '../' to '../../' because this file is inside 'videocall' folder
// Mapped exactly to the files shown in the screenshot
const getGiftImage = (giftName: string) => {
    const name = (giftName || "").toLowerCase();
    
    // Check custom ones first to avoid overlap
    if (name.includes('talent crown')) return require('../../assets/images/Talent Crown.png');
    if (name.includes('golden shoe')) return require('../../assets/images/Golden Shoe.png');
    if (name.includes('melody queen')) return require('../../assets/images/Melody Queen.png');
    // 🔥 SATTI FIX: Corrected Names Below 🔥
    if (name.includes('rockstar')) return require('../../assets/images/Rockstar.png');
    if (name.includes('rising star')) return require('../../assets/images/Rising Star.png');
    if (name.includes('superstar mic')) return require('../../assets/images/Superstar Mic.png');

    // Standard ones
    if (name.includes('chocolate')) return require('../../assets/images/chocolate.png');
    if (name.includes('cake')) return require('../../assets/images/cake.png');
    if (name.includes('crown')) return require('../../assets/images/crown.png');
    if (name.includes('diamond')) return require('../../assets/images/diamond.png');
    if (name.includes('car')) return require('../../assets/images/car.png');
    if (name.includes('private jet')) return require('../../assets/images/private jet.png');
    if (name.includes('palace')) return require('../../assets/images/palace.png');
    
    return null;
};

// 💎 Compact price so every card stays neat: 1K, 25K, 1M
const formatPrice = (n: number) => {
    if (n >= 1000000) return `${n / 1000000}M`;
    if (n >= 1000) return `${n / 1000}K`;
    return `${n}`;
};

const CARD_WIDTH = 112;
const CARD_GAP = 10;

// 🛡️ Gifts ABOVE this amount ask "Are you sure?" before sending (change to 4999 to include 5000)
const CONFIRM_ABOVE = 5000;

interface GiftPanelProps {
    onSendGift: (amount: number, type: string, name: string) => void; // Added name for GiftOverlay support
    onClose: () => void;
    userBalance: number;
    expertBeans?: number; // 🔥 ADDED FOR DYNAMIC THEME
}

// 🎁 One gift card: gradient hairline border, glow disc behind the image, press bounce
const GiftCard = ({ item, theme, canAfford, onPress }: any) => {
    const scale = useRef(new Animated.Value(1)).current;
    const imageSource = getGiftImage(item.name);

    const pressIn = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, friction: 6 }).start();
    const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 4 }).start();

    return (
        <Animated.View style={{ transform: [{ scale }], marginRight: CARD_GAP, opacity: canAfford ? 1 : 0.5 }}>
            <TouchableOpacity activeOpacity={0.9} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
                <LinearGradient
                    colors={[theme.primary, theme.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardBorder}
                >
                    <View style={styles.cardInner}>
                        <View style={[styles.glowDisc, { backgroundColor: theme.accent + '26' }]} />
                        {imageSource ? (
                            <Image source={imageSource} style={styles.giftImage} resizeMode="contain" />
                        ) : (
                            <MaterialCommunityIcons name={item.icon as any} size={44} color={theme.accent} style={{ marginVertical: 16 }} />
                        )}
                        <Text style={styles.giftName} numberOfLines={1}>{item.name}</Text>
                        <View style={styles.pricePill}>
                            <MaterialCommunityIcons name="diamond-stone" size={12} color="#FBBF24" />
                            <Text style={styles.priceText}>{formatPrice(item.amount)}</Text>
                        </View>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        </Animated.View>
    );
};

export default function GiftPanel({ onSendGift, onClose, userBalance, expertBeans = 0 }: GiftPanelProps) {
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    const enter = useRef(new Animated.Value(0)).current;

    // 🔥 DYNAMIC THEME CALCULATION
    const config = getLevelConfig(expertBeans);
    const theme = {
        primary: config.colors[0],
        secondary: config.colors[2],
        accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
    };

    useEffect(() => {
        // Ambient glow breathes slowly (smooth back-and-forth, no jump)
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
        ).start();

        // ONE entrance moment: panel glides up
        Animated.timing(enter, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    }, []);

    const orbTranslateY = shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -20] });

    // 🛡️ Big gifts need a confirm. Low balance skips the confirm so the parent's "Insufficient balance" alert still shows.
    const handleGiftPress = (item: { name: string; amount: number; type: string }) => {
        const needsConfirm = item.amount > CONFIRM_ABOVE && userBalance >= item.amount;
        if (!needsConfirm) {
            onSendGift(item.amount, item.type, item.name);
            return;
        }
        Alert.alert(
            `Send ${item.name}?`,
            `${item.amount.toLocaleString()} diamonds will be deducted from your balance.`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Send', onPress: () => onSendGift(item.amount, item.type, item.name) },
            ]
        );
    };

    return (
        <Animated.View
            style={[
                styles.overlay,
                {
                    opacity: enter,
                    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
                },
            ]}
        >
            {/* 🔥 SHIMMER ORBS FOR AMBIENT GLOW */}
            <Animated.View style={[styles.shimmerOrb, { top: -30, right: 10, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { bottom: -30, left: 10, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            <BlurView intensity={70} tint="dark" style={styles.panel}>
                <View style={styles.panelTint} pointerEvents="none" />

                {/* Signature accent edge (same as chat) */}
                <LinearGradient
                    colors={[theme.primary, theme.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.accentEdge}
                />

                {/* Header: title on the left, balance + close on the right */}
                <View style={styles.header}>
                    <View style={styles.titleWrap}>
                        <MaterialCommunityIcons name="gift-outline" size={20} color={theme.accent} />
                        <Text style={styles.title}>Send a bonus</Text>
                    </View>

                    <View style={styles.headerRight}>
                        <View style={styles.balancePill}>
                            <MaterialCommunityIcons name="diamond-stone" size={14} color="#FBBF24" />
                            <Text style={styles.balanceValue}>{Math.floor(userBalance).toLocaleString()}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={onClose}
                            activeOpacity={0.7}
                            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                            style={styles.closeBtn}
                        >
                            <Ionicons name="close" size={18} color="rgba(255,255,255,0.85)" />
                        </TouchableOpacity>
                    </View>
                </View>

                <FlatList
                    data={GIFT_OPTIONS}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.id}
                    snapToInterval={CARD_WIDTH + CARD_GAP}
                    decelerationRate="fast"
                    contentContainerStyle={{ paddingVertical: 6, paddingRight: 6 }}
                    renderItem={({ item }) => (
                        <GiftCard
                            item={item}
                            theme={theme}
                            canAfford={userBalance >= item.amount}
                            onPress={() => handleGiftPress(item)}
                        />
                    )}
                />
            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: { 
        position: 'absolute', 
        bottom: 125, 
        left: 0, 
        right: 0, 
        alignItems: 'center', 
        zIndex: 500 
    },
    shimmerOrb: { 
        position: 'absolute', 
        width: 200, 
        height: 200, 
        borderRadius: 100, 
        opacity: 0.22, 
        zIndex: -1
    },
    panel: { 
        width: '92%', 
        borderRadius: 30, 
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.16)',
    },
    panelTint: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(8, 12, 26, 0.66)',
    },
    accentEdge: {
        position: 'absolute',
        top: 0,
        left: 30,
        right: 30,
        height: 2,
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
    },

    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 10 
    },
    titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    title: { color: '#FFFFFF', fontSize: 17, fontWeight: '800', letterSpacing: 0.2 },
    headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    balancePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 11,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: 'rgba(251,191,36,0.12)',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(251,191,36,0.45)',
    },
    balanceValue: { color: '#FBBF24', fontSize: 13, fontWeight: '800' },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Gradient hairline border (1.5px) wraps the dark inner card
    cardBorder: {
        width: CARD_WIDTH,
        padding: 1.5,
        borderRadius: 24,
    },
    cardInner: {
        borderRadius: 22.5,
        backgroundColor: 'rgba(10, 14, 28, 0.94)',
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 10,
        paddingHorizontal: 6,
        overflow: 'hidden',
    },
    glowDisc: {
        position: 'absolute',
        top: 6,
        width: 88,
        height: 88,
        borderRadius: 44,
    },
    giftImage: {
        width: 84,
        height: 84,
    },
    giftName: { 
        color: '#FFFFFF', 
        fontSize: 13, 
        fontWeight: '700', 
        marginTop: 6,
        marginBottom: 6,
        textAlign: 'center',
        width: '100%',
    },
    pricePill: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(251,191,36,0.12)',
    },
    priceText: { 
        color: '#FBBF24', 
        fontSize: 13, 
        fontWeight: '800' 
    },
});
