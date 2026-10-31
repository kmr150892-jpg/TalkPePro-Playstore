import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
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

// 🌈 Same multicolor family as the royal settings menu / glow studio
const BORDER_COLORS = ['#F5D27A', '#FF5C9E', '#8B5CF6', '#22D3EE', '#34D399'];
const RAINBOW_COLORS = ['#FF3D81', '#F5C84C', '#34D399', '#22D3EE', '#8B5CF6', '#FF3D81'];

// 🆕 Glass "ticket" row (staggered slide-in)
const SummaryRow = ({
    anim, index, icon, gradColors, label, value, valueColor
}: {
    anim: Animated.Value;
    index: number;
    icon: string;
    gradColors: [string, string];
    label: string;
    value: string;
    valueColor?: string;
}) => {
    const start = index * 0.18;
    return (
        <Animated.View
            style={[
                styles.rowWrap,
                {
                    opacity: anim.interpolate({ inputRange: [start, start + 0.46], outputRange: [0, 1], extrapolate: 'clamp' }),
                    transform: [{ translateX: anim.interpolate({ inputRange: [start, start + 0.46], outputRange: [34, 0], extrapolate: 'clamp' }) }]
                }
            ]}
        >
            <LinearGradient colors={[gradColors[0] + '26', 'rgba(255,255,255,0.02)'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
            <LinearGradient colors={gradColors as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.rowIcon}>
                <LinearGradient colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)'] as any} style={styles.rowIconGloss} pointerEvents="none" />
                <Ionicons name={icon as any} size={18} color="#FFF" />
            </LinearGradient>
            <Text style={styles.summaryLabel} numberOfLines={1}>{label}</Text>
            <Text style={[styles.summaryValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
        </Animated.View>
    );
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

    // 🆕 Entrance / stagger / medallion / count-up / redirect-bar animations
    const enter = useRef(new Animated.Value(0)).current;
    const rowsAnim = useRef(new Animated.Value(0)).current;
    const spin = useRef(new Animated.Value(0)).current;
    const bob = useRef(new Animated.Value(0)).current;
    const countAnim = useRef(new Animated.Value(0)).current;
    const redirectAnim = useRef(new Animated.Value(0)).current;
    const [displayTotal, setDisplayTotal] = useState<number | string>(0);

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
        // ambient orbs (smooth up & down)
        const shimmerLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        shimmerLoop.start();

        // card entrance (spring) -> rows stagger
        Animated.spring(enter, { toValue: 1, useNativeDriver: true, friction: 7, tension: 55 }).start();
        Animated.timing(rowsAnim, { toValue: 1, duration: 900, delay: 320, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();

        // medallion halo spin + float
        const spinLoop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 3600, easing: Easing.linear, useNativeDriver: true }));
        spinLoop.start();
        const bobLoop = Animated.loop(
            Animated.sequence([
                Animated.timing(bob, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
                Animated.timing(bob, { toValue: 0, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
            ])
        );
        bobLoop.start();

        // total count-up (JS driven) - end-la exact total kaattum
        const listenerId = countAnim.addListener(({ value }) => {
            setDisplayTotal(Math.floor(totalEarningsOrSpent * value));
        });
        Animated.timing(countAnim, { toValue: 1, duration: 1100, delay: 600, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(({ finished }) => {
            if (finished) setDisplayTotal(totalEarningsOrSpent);
        });

        // redirect countdown bar (parent 5 sec-la redirect pannum)
        Animated.timing(redirectAnim, { toValue: 1, duration: 5000, easing: Easing.linear, useNativeDriver: false }).start();

        return () => {
            shimmerLoop.stop();
            spinLoop.stop();
            bobLoop.stop();
            countAnim.removeListener(listenerId);
        };
    }, []);

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -30]
    });

    return (
        <View style={styles.summaryOverlay}>
            <BlurView intensity={100} tint="dark" style={StyleSheet.absoluteFill} />

            {/* 🔥 SHIMMER ORBS FOR AMBIENT GLOW */}
            <Animated.View style={[styles.shimmerOrb, { top: '10%', right: -50, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
            <Animated.View style={[styles.shimmerOrb, { bottom: '10%', left: -50, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

            <Animated.View
                style={[
                    styles.cardShadow,
                    {
                        shadowColor: theme.primary,
                        opacity: enter,
                        transform: [
                            { perspective: 1000 },
                            { translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
                            { rotateX: enter.interpolate({ inputRange: [0, 1], outputRange: ['16deg', '0deg'] }) },
                            { scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) }
                        ]
                    }
                ]}
            >
                {/* 🌈 Multicolor gradient border */}
                <LinearGradient colors={BORDER_COLORS as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardBorder}>
                    <View style={styles.summaryCard}>
                        <LinearGradient colors={['#161040', '#0A0F24', '#05131E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                        <View style={[styles.cardGlowTop, { backgroundColor: theme.primary + '33' }]} pointerEvents="none" />
                        <View style={[styles.cardGlowBottom, { backgroundColor: theme.accent + '22' }]} pointerEvents="none" />
                        <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0)'] as any} style={styles.topSheen} pointerEvents="none" />

                        {/* 🔥 DYNAMIC ICON BASED ON ROLE (3D medallion) */}
                        <Animated.View style={[styles.medallionBox, { transform: [{ translateY: bob.interpolate({ inputRange: [0, 1], outputRange: [0, -6] }) }] }]}>
                            <View style={[styles.groundShadow, { backgroundColor: theme.primary + '66' }]} pointerEvents="none" />
                            <View style={[styles.medallionWrap, { shadowColor: theme.primary }]}>
                                <View style={styles.haloClip} pointerEvents="none">
                                    <Animated.View style={[styles.haloSpinner, { transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }]}>
                                        <LinearGradient colors={RAINBOW_COLORS as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                                    </Animated.View>
                                </View>
                                <LinearGradient colors={[theme.accent, theme.primary, theme.secondary] as any} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={styles.medallionBody}>
                                    <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(0,0,0,0.45)'] as any} start={{ x: 0.5, y: 0.3 }} end={{ x: 0.5, y: 1 }} style={StyleSheet.absoluteFill} />
                                    <LinearGradient colors={['rgba(255,255,255,0.8)', 'rgba(255,255,255,0)'] as any} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.medallionSpecular} />
                                    <Text style={styles.medallionEmoji}>{currencySymbol}</Text>
                                </LinearGradient>
                                <View style={styles.medallionEdge} pointerEvents="none" />
                            </View>
                        </Animated.View>

                        <View style={styles.statusChip}>
                            <View style={styles.statusDot} />
                            <Text style={styles.statusText}>COMPLETED</Text>
                        </View>
                        <Text style={styles.summaryTitle}>Session Summary</Text>

                        <LinearGradient
                            colors={['transparent', '#F5D27A', '#FF5C9E', '#8B5CF6', '#22D3EE', 'transparent']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.divider}
                        />
                        
                        {/* ⏳ Total Duration Row - Accurate From DB */}
                        <SummaryRow
                            anim={rowsAnim}
                            index={0}
                            icon="time"
                            gradColors={['#22D3EE', '#6366F1']}
                            label="Total Duration"
                            value={finalDurationFormatted}
                        />

                        {/* 💎/🎖️ Call Charge Row */}
                        <SummaryRow
                            anim={rowsAnim}
                            index={1}
                            icon={isConsultant ? 'ribbon' : 'wallet'}
                            gradColors={[theme.primary, theme.accent]}
                            label={isConsultant ? 'Session Rewards' : 'Session Cost'}
                            value={`${finalAmount} ${currencySymbol}`}
                        />

                        {/* 🎁 Gift Row (Only shows if gifts were sent) */}
                        <SummaryRow
                            anim={rowsAnim}
                            index={2}
                            icon="gift"
                            gradColors={['#FBBF24', '#FF8A00']}
                            label={isConsultant ? 'Gift Rewards' : 'Bonuses Sent'}
                            value={giftAmount > 0 ? `+${giftAmount} ${currencySymbol}` : `0 ${currencySymbol}`}
                            valueColor="#FBBF24"
                        />
                        
                        {/* 🏆 Grand Total Row (hero panel + count-up) */}
                        <Animated.View
                            style={[
                                styles.totalWrap,
                                {
                                    shadowColor: theme.primary,
                                    opacity: rowsAnim.interpolate({ inputRange: [0.54, 1], outputRange: [0, 1], extrapolate: 'clamp' }),
                                    transform: [{ scale: rowsAnim.interpolate({ inputRange: [0.54, 1], outputRange: [0.92, 1], extrapolate: 'clamp' }) }]
                                }
                            ]}
                        >
                            <LinearGradient colors={[theme.primary, theme.accent, theme.secondary] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.totalBorder}>
                                <View style={styles.totalInner}>
                                    <LinearGradient colors={[theme.primary + '40', 'rgba(8,12,30,0.9)'] as any} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
                                    <LinearGradient colors={['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)'] as any} style={styles.totalSheen} pointerEvents="none" />
                                    <View style={styles.totalLeft}>
                                        <Ionicons name="trophy" size={16} color={theme.accent} />
                                        <Text style={styles.totalLabel}>
                                            {isConsultant ? 'Net Rewards Accrued' : 'Total Deducted'}
                                        </Text>
                                    </View>
                                    <Text style={[styles.totalValue, { color: '#FFF', textShadowColor: theme.primary, textShadowRadius: 14 }]}>
                                        {displayTotal} {currencySymbol}
                                    </Text>
                                </View>
                            </LinearGradient>
                        </Animated.View>

                        {/* ⏱ Redirect countdown */}
                        <View style={styles.redirectBox}>
                            <Text style={styles.redirectText}>REDIRECTING SHORTLY</Text>
                            <View style={styles.redirectTrack}>
                                <Animated.View
                                    style={[
                                        styles.redirectFillWrap,
                                        { width: redirectAnim.interpolate({ inputRange: [0, 1], outputRange: ['100%', '0%'] }) }
                                    ]}
                                >
                                    <LinearGradient
                                        colors={BORDER_COLORS as any}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={StyleSheet.absoluteFill}
                                    />
                                </Animated.View>
                            </View>
                        </View>
                    </View>
                </LinearGradient>
            </Animated.View>
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

    cardShadow: {
        width: '88%',
        elevation: 24,
        shadowOpacity: 0.55,
        shadowRadius: 28,
        shadowOffset: { width: 0, height: 14 },
    },
    cardBorder: { borderRadius: 38, padding: 2 },
    summaryCard: { 
        borderRadius: 36, // 🔥 ZERO BOX FLUID SHAPE
        paddingHorizontal: 22,
        paddingTop: 30,
        paddingBottom: 22,
        alignItems: 'center', 
        overflow: 'hidden',
    },
    cardGlowTop: { position: 'absolute', top: -60, alignSelf: 'center', width: 240, height: 200, borderRadius: 120 },
    cardGlowBottom: { position: 'absolute', bottom: -70, right: -40, width: 200, height: 180, borderRadius: 100 },
    topSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 90 },

    // medallion
    medallionBox: { width: 112, height: 124, alignItems: 'center', justifyContent: 'center' },
    medallionWrap: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#0B1026', shadowOpacity: 0.9, shadowRadius: 22, shadowOffset: { width: 0, height: 0 }, elevation: 16 },
    haloClip: { position: 'absolute', top: -5, left: -5, width: 110, height: 110, borderRadius: 55, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    haloSpinner: { position: 'absolute', width: 200, height: 200, left: (110 - 200) / 2, top: (110 - 200) / 2 },
    medallionBody: { flex: 1, borderRadius: 50, overflow: 'hidden', justifyContent: 'center', alignItems: 'center' },
    medallionSpecular: { position: 'absolute', top: 7, left: 14, width: 56, height: 32, borderRadius: 18, transform: [{ rotate: '-20deg' }] },
    medallionEmoji: { fontSize: 44, textShadowColor: 'rgba(0,0,0,0.45)', textShadowOffset: { width: 1.5, height: 3 }, textShadowRadius: 5 },
    medallionEdge: { ...StyleSheet.absoluteFillObject, borderRadius: 50, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)' },
    groundShadow: { position: 'absolute', bottom: 0, alignSelf: 'center', width: 70, height: 10, borderRadius: 5 },

    statusChip: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: 'rgba(52,211,153,0.14)', borderWidth: 1, borderColor: 'rgba(52,211,153,0.45)' },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34D399' },
    statusText: { color: '#34D399', fontSize: 9, fontWeight: '900', letterSpacing: 2 },

    summaryTitle: { 
        color: '#FFF', 
        fontSize: 22, 
        fontWeight: '900', 
        marginTop: 10,
        marginBottom: 14,
        letterSpacing: 0.5 
    },
    divider: { height: 1.5, width: '100%', marginBottom: 16 },

    // rows
    rowWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        marginBottom: 10,
        padding: 10,
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.10)',
        backgroundColor: 'rgba(255,255,255,0.03)',
    },
    rowIcon: { width: 38, height: 38, borderRadius: 13, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', marginRight: 12 },
    rowIconGloss: { position: 'absolute', top: 0, left: 0, right: 0, height: 16 },
    summaryLabel: { 
        flex: 1,
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

    // total hero
    totalWrap: {
        width: '100%',
        marginTop: 6,
        borderRadius: 22,
        shadowOpacity: 0.7,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 6 },
        elevation: 12,
        backgroundColor: '#0B1026',
    },
    totalBorder: { borderRadius: 22, padding: 1.5 },
    totalInner: { borderRadius: 20.5, paddingHorizontal: 16, paddingVertical: 16, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    totalSheen: { position: 'absolute', top: 0, left: 0, right: 0, height: 26 },
    totalLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, paddingRight: 8 },
    totalLabel: { color: '#CBD5E1', fontSize: 13, fontWeight: '800', letterSpacing: 0.5, flexShrink: 1 },
    totalValue: { fontSize: 24, fontWeight: '900', letterSpacing: 0.5 },

    // redirect bar
    redirectBox: { width: '100%', alignItems: 'center', marginTop: 18 },
    redirectText: { color: '#64748B', fontSize: 9, fontWeight: '900', letterSpacing: 2.5, marginBottom: 8 },
    redirectTrack: { width: '70%', height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
    redirectFillWrap: { height: '100%', borderRadius: 2, overflow: 'hidden' },
});
