import { BlurView } from 'expo-blur';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

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

interface CallSummaryProps {
    role: string;
    finalDurationFormatted: string;
    finalAmount: number; // This is Call Charge
    giftAmount: number;  // 🔥 NEW PROP FOR GIFT BREAKDOWN
    expertBeans?: number; // 🔥 ADDED FOR DYNAMIC THEME
}

export default function CallSummary({ role, finalDurationFormatted, finalAmount, giftAmount, expertBeans = 0 }: CallSummaryProps) {
    
    // Total calculation - Rendu perukkum orey data thaan pogaanum
    const totalEarningsOrSpent = finalAmount + giftAmount;

    const shimmerAnim = useRef(new Animated.Value(0)).current;

    // 🔥 DYNAMIC THEME CALCULATION
    const config = getLevelConfig(expertBeans);
    
    // 🔥 SATTI FIX: Added safe 'host' checks to prevent UI breaking if role changes in backend
    const isConsultant = role === 'expert' || role === 'host';

    // 🔥 SYMBOL LOGIC: Rewards for Host, Diamonds for User
    const currencySymbol = isConsultant ? '🎖️' : '💎';

    const theme = {
        // If it's the user view, fallback to standard blue. If expert/host, use their deep-glow colors.
        primary: isConsultant ? config.colors[0] : '#3B82F6',
        secondary: isConsultant ? config.colors[2] : '#1E40AF',
        accent: isConsultant && config.glow !== 'transparent' ? config.glow : '#60A5FA',
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
        outputRange: [0, -30]
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

    return (
        <View style={styles.summaryOverlay}>
            <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />

            {/* 🔥 SHIMMER ORBS FOR AMBIENT GLOW */}
            <Animated.View style={[styles.shimmerOrb, { top: '10%', right: -50, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { bottom: '10%', left: -50, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            <View style={[styles.summaryCard, borderType1]}>
                
                {/* 🔥 DYNAMIC ICON BASED ON ROLE */}
                <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40', borderWidth: 1 }]}>
                    <Text style={{ fontSize: 45 }}>{currencySymbol}</Text>
                </View>
                
                <Text style={styles.summaryTitle}>Session Summary</Text>
                
                {/* ⏳ Total Duration Row - Accurate From DB */}
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Total Duration</Text>
                    <Text style={styles.summaryValue}>{finalDurationFormatted}</Text>
                </View>

                {/* 💎/🎖️ Call Charge Row */}
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{isConsultant ? 'Session Rewards' : 'Session Cost'}</Text>
                    <Text style={styles.summaryValue}>{finalAmount} {currencySymbol}</Text>
                </View>

                {/* 🎁 Gift Row (Only shows if gifts were sent) */}
                <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>{isConsultant ? 'Gift Rewards' : 'Bonuses Sent'}</Text>
                    <Text style={[styles.summaryValue, { color: '#FBBF24' }]}>
                        {giftAmount > 0 ? `+${giftAmount} ${currencySymbol}` : `0 ${currencySymbol}`}
                    </Text>
                </View>
                
                {/* 🏆 Grand Total Row */}
                <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.summaryLabel}>
                        {isConsultant ? 'Net Rewards Accrued' : 'Total Deducted'}
                    </Text>
                    <Text style={[styles.summaryValue, { color: theme.primary, fontSize: 22, textShadowColor: theme.primary + '80', textShadowRadius: 10 }]}>
                        {totalEarningsOrSpent} {currencySymbol}
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    summaryOverlay: { 
        ...StyleSheet.absoluteFillObject, 
        zIndex: 1000, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    // 🔥 AMBIENT SHIMMER ORBS
    shimmerOrb: { 
        position: 'absolute', 
        width: 300, 
        height: 300, 
        borderRadius: 150, 
        opacity: 0.2, 
        filter: 'blur(70px)',
        zIndex: -1
    },
    summaryCard: { 
        width: '88%', 
        borderRadius: 40, // 🔥 ZERO BOX FLUID SHAPE
        padding: 35, 
        alignItems: 'center', 
        overflow: 'hidden',
        elevation: 20,
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 20
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 10
    },
    summaryTitle: { 
        color: '#FFF', 
        fontSize: 22, 
        fontWeight: '900', 
        marginVertical: 25,
        letterSpacing: 0.5 
    },
    summaryRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        width: '100%', 
        marginBottom: 20 
    },
    summaryLabel: { 
        color: '#94A3B8', 
        fontSize: 14, 
        fontWeight: '700',
        letterSpacing: 0.5 
    },
    summaryValue: { 
        color: '#FFF', 
        fontSize: 16, 
        fontWeight: '900',
        letterSpacing: 0.5 
    },
    totalRow: { 
        borderTopWidth: 1, 
        borderTopColor: 'rgba(255,255,255,0.1)', 
        paddingTop: 20 
    }
});