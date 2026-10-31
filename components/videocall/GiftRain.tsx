import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native';

const { width, height } = Dimensions.get('window');

// ✅ ACCURATE THEME & LEVEL CONFIG (LOCKED DEEP-GLOW COLORS)
const getLevelConfig = (beans: number) => {
    if (beans >= 100000000) return { lvl: 10, colors: ['#ff0404', '#F59E0B', '#df03ee'] as const };
    if (beans >= 50000000) return { lvl: 9, colors: ['#f40691', '#dbc0c0', '#0a0303'] as const };
    if (beans >= 30000000) return { lvl: 8, colors: ['#660aee', '#d4cfdf', '#d40808'] as const };
    if (beans >= 10000000) return { lvl: 7, colors: ['#0af635', '#ca0bf5', '#fd068a'] as const };
    if (beans >= 5000000)  return { lvl: 6, colors: ['#f70606', '#fdec05', '#fad906'] as const };
    if (beans >= 3000000)  return { lvl: 5, colors: ['#136a3e', '#10B981', '#f6085b'] as const };
    if (beans >= 1000000)  return { lvl: 4, colors: ['#ffd001', '#EAB308', '#1d00f9'] as const };
    if (beans >= 300000)   return { lvl: 3, colors: ['#bababa', '#74706f', '#bc0e08'] as const };
    if (beans >= 100000)   return { lvl: 2, colors: ['#ff8604', '#f29d0a', '#1505fc'] as const };
    if (beans >= 30000)    return { lvl: 1, colors: ['#03ffc8', '#13feea', '#f64a06'] as const };
    return { lvl: 0, colors: ['#f807cf', '#f607e2', '#2a06f5'] as const };
};

const GOLD = '#FFD66B';
const CRYSTAL = '#FFFFFF';

// 🌑 Some level colours are almost black (e.g. #0a0303) and would vanish on a dark screen.
// If a colour is too dark, swap it for gold so every diamond stays visible.
const keepVisible = (hex: string) => {
    const h = hex.replace('#', '');
    if (h.length < 6) return GOLD;
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.22 ? GOLD : hex;
};

interface GiftRainProps {
    visible: boolean;
    onComplete: () => void;
    giftType?: 'diamond' | 'fireworks' | 'confetti'; 
    expertTotalBeans?: number; // 🔥 ADDED FOR DYNAMIC THEME
}

export default function GiftRain({ visible, onComplete, giftType = 'diamond', expertTotalBeans = 0 }: GiftRainProps) {
    const [particles, setParticles] = useState<any[]>([]);
    // Lottie Ref
    const lottieRef = useRef<LottieView>(null);

    // 🔥 DYNAMIC THEME CALCULATION
    const config = getLevelConfig(expertTotalBeans);
    const theme = {
        primary: keepVisible(config.colors[0]),
        secondary: keepVisible(config.colors[2]),
    };

    useEffect(() => {
        if (visible) {
            if (giftType === 'diamond') {
                // 👑 Royal palette: level colours + gold + crystal white
                const palette = [theme.primary, GOLD, theme.secondary, CRYSTAL];

                // Layered rain: big = near (faster, brighter), small = far (slower, dimmer)
                const newParticles = Array.from({ length: 26 }).map((_, i) => {
                    const depth = Math.random();
                    const size = 16 + depth * 26;
                    return {
                        id: i,
                        x: Math.random() * (width - 40),
                        anim: new Animated.Value(0),
                        delay: Math.random() * 1800,
                        duration: 4200 - depth * 1600,
                        size,
                        peakOpacity: 0.55 + depth * 0.45,
                        sway: 8 + Math.random() * 22,
                        spin: (Math.random() < 0.5 ? -1 : 1) * (180 + Math.random() * 360),
                        color: palette[i % palette.length],
                    };
                });

                setParticles(newParticles);

                const animations = newParticles.map(p => 
                    Animated.sequence([
                        Animated.delay(p.delay),
                        Animated.timing(p.anim, {
                            toValue: 1,
                            duration: p.duration,
                            easing: Easing.linear,
                            // 🔥 SATTI FIX: useNativeDriver kept true for massive performance 🔥
                            useNativeDriver: true,
                        })
                    ])
                );

                const running = Animated.parallel(animations);
                running.start(({ finished }) => {
                    if (!finished) return; // stopped by cleanup, don't fire onComplete twice
                    onComplete();
                    setParticles([]);
                });
                return () => running.stop();
            } else {
                // Lottie logic (Fireworks or Confetti)
                // 🔥 Optimized: Reset and Play
                lottieRef.current?.reset();
                lottieRef.current?.play();
                // Auto stop after 4 seconds for Lottie
                const timer = setTimeout(() => {
                    onComplete();
                }, 4000);
                return () => clearTimeout(timer);
            }
        }
    }, [visible, giftType]);

    if (!visible) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {/* 💎 LAYERED DIAMOND RAIN: sway, spin, soft glow, fades in and out */}
            {giftType === 'diamond' && particles.map((p) => (
                <Animated.View
                    key={p.id}
                    style={[
                        styles.particleContainer,
                        {
                            left: p.x,
                            width: p.size * 1.7,
                            height: p.size * 1.7,
                            opacity: p.anim.interpolate({
                                inputRange: [0, 0.08, 0.85, 1],
                                outputRange: [0, p.peakOpacity, p.peakOpacity, 0],
                            }),
                            transform: [
                                { translateY: p.anim.interpolate({ inputRange: [0, 1], outputRange: [-120, height + 120] }) },
                                { translateX: p.anim.interpolate({ inputRange: [0, 0.25, 0.5, 0.75, 1], outputRange: [0, p.sway, 0, -p.sway, 0] }) },
                                { rotate: p.anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
                            ],
                        },
                    ]}
                >
                    {/* Soft glow disc behind the stone */}
                    <View
                        style={[
                            styles.glow,
                            {
                                width: p.size * 1.7,
                                height: p.size * 1.7,
                                borderRadius: p.size * 0.85,
                                backgroundColor: p.color + '33',
                                shadowColor: p.color,
                            },
                        ]}
                    />
                    <MaterialCommunityIcons name="diamond-stone" size={p.size} color={p.color} />
                </Animated.View>
            ))}

            {/* 🎆 FIREWORKS LOTTIE */}
            {giftType === 'fireworks' && (
                <LottieView
                    ref={lottieRef}
                    source={require('../../assets/images/fireworks.json')} 
                    style={styles.fullScreenLottie}
                    loop={false}
                />
            )}

            {/* 🎉 CONFETTI LOTTIE */}
            {giftType === 'confetti' && (
                <LottieView
                    ref={lottieRef}
                    source={require('../../assets/images/confetti.json')} 
                    style={styles.fullScreenLottie}
                    loop={false}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    particleContainer: {
        position: 'absolute',
        top: 0,
        zIndex: 999,
        alignItems: 'center',
        justifyContent: 'center',
    },
    glow: {
        position: 'absolute',
        shadowOpacity: 0.9,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 0 },
        elevation: 6,
    },
    fullScreenLottie: {
        width: width,
        height: height,
        position: 'absolute',
        zIndex: 1000,
    }
});