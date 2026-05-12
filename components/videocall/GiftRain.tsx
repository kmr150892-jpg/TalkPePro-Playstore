import { MaterialCommunityIcons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

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
        primary: config.colors[0],
        secondary: config.colors[2],
    };

    useEffect(() => {
        if (visible) {
            if (giftType === 'diamond') {
                // Generate 15-20 random particle positions
                const newParticles = Array.from({ length: 18 }).map((_, i) => ({
                    id: i,
                    x: Math.random() * width,
                    anim: new Animated.Value(-100),
                    delay: Math.random() * 2000,
                    rotate: `${Math.random() * 360}deg`,
                    // Assign alternate colors to diamonds (Primary and Secondary)
                    color: i % 2 === 0 ? theme.primary : theme.secondary
                }));

                setParticles(newParticles);

                const animations = newParticles.map(p => 
                    Animated.sequence([
                        Animated.delay(p.delay),
                        Animated.timing(p.anim, {
                            toValue: height + 100,
                            duration: 3000,
                            // 🔥 SATTI FIX: useNativeDriver kept true for massive performance 🔥
                            useNativeDriver: true,
                        })
                    ])
                );

                Animated.parallel(animations).start(() => {
                    onComplete();
                    setParticles([]);
                });
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
            {/* 💎 DIAMOND RAIN WITH DEEP-GLOW DYNAMIC THEME */}
            {giftType === 'diamond' && particles.map((p) => (
                <Animated.View
                    key={p.id}
                    style={[
                        styles.particleContainer,
                        {
                            left: p.x,
                            transform: [
                                { translateY: p.anim },
                                { rotate: p.rotate }
                            ]
                        }
                    ]}
                >
                    <MaterialCommunityIcons 
                        name="diamond-stone" 
                        size={30} 
                        color={p.color} 
                        style={{
                            textShadowColor: p.color,
                            textShadowRadius: 15,
                        }}
                    />
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
        zIndex: 999,
    },
    fullScreenLottie: {
        width: width,
        height: height,
        position: 'absolute',
        zIndex: 1000,
    }
});