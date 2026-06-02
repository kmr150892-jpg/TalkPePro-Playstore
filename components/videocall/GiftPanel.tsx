import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

interface GiftPanelProps {
    onSendGift: (amount: number, type: string, name: string) => void; // Added name for GiftOverlay support
    onClose: () => void;
    userBalance: number;
    expertBeans?: number; // 🔥 ADDED FOR DYNAMIC THEME
}

export default function GiftPanel({ onSendGift, onClose, userBalance, expertBeans = 0 }: GiftPanelProps) {
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    // 🔥 DYNAMIC THEME CALCULATION
    const config = getLevelConfig(expertBeans);
    const theme = {
        primary: config.colors[0],
        secondary: config.colors[2],
        accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
    };

    useEffect(() => {
        Animated.loop(
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true
          })
        ).start();
    }, []);

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -20]
    });

    // 🔥 DUAL-TONE BORDER STYLES (FLUID, 2px)
    const borderType1 = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: theme.primary,
        borderRightColor: theme.primary,
        borderTopColor: theme.secondary + '80',
        borderBottomColor: theme.secondary + '80',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
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
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
    };

    return (
        <View style={styles.overlay}>
            
            {/* 🔥 SHIMMER ORBS FOR AMBIENT GLOW */}
            <Animated.View style={[styles.shimmerOrb, { top: -30, right: 10, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { bottom: -30, left: 10, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            <BlurView intensity={95} tint="dark" style={[styles.panel, borderType1]}>
                <View style={styles.header}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.title}>SEND A BONUS</Text>
                        <MaterialCommunityIcons name="gift" size={18} color={theme.primary} style={{ marginLeft: 8 }} />
                    </View>
                    <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
                        <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                </View>

                <FlatList
                    data={GIFT_OPTIONS}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 5 }}
                    renderItem={({ item, index }) => {
                        // 🔥 Alternating Dual-Tone Borders
                        const cardBorderStyle = index % 2 === 0 ? borderType2 : borderType1;
                        
                        // 🔥 SATTI FIX: Fetch image if it matches the name
                        const imageSource = getGiftImage(item.name);
                        
                        return (
                            <TouchableOpacity 
                                style={[styles.giftCard, cardBorderStyle]} 
                                onPress={() => onSendGift(item.amount, item.type, item.name)}
                                activeOpacity={0.7}
                            >
                                {/* 🔥 SATTI FIX: Image rendering logic inside Flatlist */}
                                {imageSource ? (
                                    <Image source={imageSource} style={styles.giftImage} resizeMode="contain" />
                                ) : (
                                    <MaterialCommunityIcons name={item.icon as any} size={40} color={index % 2 === 0 ? theme.secondary : theme.primary} />
                                )}
                                
                                <Text style={styles.giftName}>{item.name}</Text>
                                <View style={[styles.priceRow, { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 }]}>
                                    <MaterialCommunityIcons name="diamond-stone" size={12} color="#FBBF24" />
                                    <Text style={styles.priceText}>{item.amount}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    }}
                />
                
                <View style={[styles.balanceContainer, { borderColor: theme.primary + '40', backgroundColor: theme.primary + '10' }]}>
                    <Text style={styles.balanceText}>Your Balance:</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 6 }}>
                        <MaterialCommunityIcons name="diamond-stone" size={14} color="#FBBF24" />
                        <Text style={[styles.balanceValue, { color: theme.primary }]}> {Math.floor(userBalance).toLocaleString()}</Text>
                    </View>
                </View>
            </BlurView>
        </View>
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
        opacity: 0.25, 
        zIndex: -1
    },
    panel: { 
        width: '92%', 
        borderRadius: 35, 
        padding: 20, 
        overflow: 'hidden', 
    },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 15 
    },
    title: { 
        color: '#FFF', 
        fontSize: 16, 
        fontWeight: '900', 
        letterSpacing: 1 
    },
    giftCard: { 
        padding: 2, 
        borderRadius: 25, 
        alignItems: 'center', 
        marginRight: 10, 
        width: 150, 
    },
    // 🔥 SATTI FIX: Custom style for your PNG images inside the card
    giftImage: {
        width: 125,
        height: 125,
        marginBottom: 2,
    },
    giftName: { 
        color: '#FFF', 
        fontSize: 20, 
        fontWeight: '900', 
        marginTop: 3,
        marginBottom: 5,
        letterSpacing: 0.5,
        textAlign: 'center'
    },
    priceRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        gap: 3, 
    },
    priceText: { 
        color: '#FBBF24', 
        fontSize: 15, 
        fontWeight: '900' 
    },
    balanceContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 15,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    balanceText: { 
        color: 'rgba(255,255,255,0.7)', 
        fontSize: 11, 
        fontWeight: '800',
        letterSpacing: 0.5
    },
    balanceValue: {
        fontSize: 14,
        fontWeight: '900',
    }
});