import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

// 🌈 Multicolor palettes (same family as the royal settings menu)
const IDLE_RING = ['rgba(34,211,238,0.60)', 'rgba(139,92,246,0.50)', 'rgba(255,92,158,0.60)'];
const RAINBOW_COLORS = ['#FF3D81', '#F5C84C', '#34D399', '#22D3EE', '#8B5CF6', '#FF3D81'];

// 🆕 UNIQUE SQUIRCLE BUTTON: multicolor gradient ring + press-spring + neon fill when active
interface FancyButtonProps {
    icon: string;
    iconColor?: string;
    active?: boolean;
    activeColors?: string[];
    idleColors?: string[];
    glow?: string;
    onPress?: () => void;
    children?: React.ReactNode;
}

const FancyButton = ({
    icon,
    iconColor = '#FFF',
    active = false,
    activeColors = ['#22D3EE', '#8B5CF6'],
    idleColors = IDLE_RING,
    glow = '#22D3EE',
    onPress,
    children
}: FancyButtonProps) => {
    const scale = useRef(new Animated.Value(1)).current;

    const pressIn = () => {
        Animated.spring(scale, { toValue: 0.86, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
    };
    const pressOut = () => {
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }).start();
    };

    return (
        <TouchableOpacity activeOpacity={0.85} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
            <Animated.View
                style={[
                    styles.fancyOuter,
                    { transform: [{ scale }] },
                    active && { shadowColor: glow, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.95, shadowRadius: 14, elevation: 15 }
                ]}
            >
                <LinearGradient
                    colors={(active ? activeColors : idleColors) as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.fancyRing}
                >
                    <View style={styles.fancyInner}>
                        {active && (
                            <LinearGradient
                                colors={[activeColors[0] + '77', activeColors[activeColors.length - 1] + '44'] as any}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={StyleSheet.absoluteFill}
                            />
                        )}
                        <Ionicons name={icon as any} size={22} color={iconColor} />
                        {children}
                    </View>
                </LinearGradient>
            </Animated.View>
        </TouchableOpacity>
    );
};

interface BottomControlsProps {
    showLowBalanceWarning: boolean;
    isFreeModeActive: boolean;
    freeTimeLeft: number;
    remainingSeconds: number | null;
    isGameVisible: boolean;
    isChatVisible: boolean;
    isMuted: boolean;
    isProEnabled?: boolean; // 🔥 NEW PROPS FOR Pro FILTER
    togglePro?: () => void; // 🔥 NEW PROPS FOR Pro FILTER
    toggleGameVisibility: () => void;
    toggleChatVisibility: () => void;
    toggleMute: () => void;
    switchCamera: () => void;
    handleCallEnd: (shouldDeduct: boolean, status: string) => void;
    onOpenGiftPanel?: () => void; 
    expertBeans?: number; 
    role?: string; 
}

export default function BottomControls({
    showLowBalanceWarning,
    isFreeModeActive,
    freeTimeLeft,
    remainingSeconds,
    isGameVisible,
    isChatVisible,
    isMuted,
    isProEnabled = false,
    togglePro,
    toggleGameVisibility,
    toggleChatVisibility,
    toggleMute,
    switchCamera,
    handleCallEnd,
    onOpenGiftPanel, 
    expertBeans = 0,
    role = 'user' 
}: BottomControlsProps) {

    // 🔥 DYNAMIC THEME CALCULATION
    const config = getLevelConfig(expertBeans);
    const theme = {
        primary: config.colors[0],
        secondary: config.colors[2],
        accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
    };

    // 🚨 Warning Tag Logic
    const showWarning = showLowBalanceWarning || (isFreeModeActive && freeTimeLeft <= 60);
    const isCriticalWarning = freeTimeLeft <= 30 || (remainingSeconds && remainingSeconds <= 30);
    const warningMessage = isFreeModeActive 
        ? `Trial ends in ${freeTimeLeft}s` 
        : (remainingSeconds && remainingSeconds <= 30 ? `Session ends in ${remainingSeconds}s` : "Low Balance Alert!");

    // 🔥 STRICT HOST CHECK
    const isConsultant = role?.toLowerCase() === 'expert' || role?.toLowerCase() === 'host';

    // 🆕 Hangup rainbow ring continuous spin
    const hangupSpin = useRef(new Animated.Value(0)).current;
    const hangupScale = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        const spinLoop = Animated.loop(
            Animated.timing(hangupSpin, { toValue: 1, duration: 3500, easing: Easing.linear, useNativeDriver: true })
        );
        spinLoop.start();
        return () => { spinLoop.stop(); };
    }, []);

    // 🆕 Critical warning pulse
    const warnPulse = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        if (showWarning && isCriticalWarning) {
            const pulseLoop = Animated.loop(
                Animated.sequence([
                    Animated.timing(warnPulse, { toValue: 0.6, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(warnPulse, { toValue: 1, duration: 450, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
                ])
            );
            pulseLoop.start();
            return () => { pulseLoop.stop(); warnPulse.setValue(1); };
        } else {
            warnPulse.setValue(1);
        }
    }, [showWarning, isCriticalWarning]);

    const hangupPressIn = () => {
        Animated.spring(hangupScale, { toValue: 0.9, useNativeDriver: true, speed: 40, bounciness: 6 }).start();
    };
    const hangupPressOut = () => {
        Animated.spring(hangupScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 12 }).start();
    };

    // Theme-based active colors (Game / Chat) - level glow same as before
    const themeActiveColors = [theme.primary, theme.accent, theme.secondary];

    return (
        <View style={styles.bottomControlsArea}>
            {showWarning && (
                <Animated.View
                    style={[
                        styles.warningFloating,
                        isCriticalWarning ? { shadowColor: '#B91C1C' } : { shadowColor: theme.primary },
                        { opacity: warnPulse }
                    ]}
                >
                    <LinearGradient
                        colors={(isCriticalWarning ? ['#FF416C', '#B91C1C', '#FF4B2B'] : [theme.primary, theme.accent, theme.secondary]) as any}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.warningRing}
                    >
                        <View style={styles.warningInner}>
                            <LinearGradient
                                colors={(isCriticalWarning ? ['#B91C1CEE', '#7F1D1DEE'] : [theme.primary + '99', theme.secondary + '66']) as any}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={StyleSheet.absoluteFill}
                            />
                            <Ionicons name="alert-circle" size={18} color="#FFF" />
                            <Text style={styles.warningText}>{warningMessage}</Text>
                        </View>
                    </LinearGradient>
                </Animated.View>
            )}
            
            {/* 🔥 NO BLACK BOX - BUTTONS DIRECTLY FLOAT ON SCREEN 🔥 */}
            <View style={styles.buttonsRow}>
                
                {/* 🔄 Camera Switch Button */}
                <FancyButton
                    icon="camera-reverse"
                    onPress={switchCamera}
                />

                {/* 🎮 Game Button */}
                <FancyButton
                    icon="game-controller"
                    active={isGameVisible}
                    activeColors={themeActiveColors}
                    glow={theme.accent}
                    onPress={toggleGameVisibility}
                />

                {/* ✨ Pro FILTER BUTTON (HOST ONLY) */}
                {isConsultant && (
                    <FancyButton
                        icon="sparkles"
                        iconColor={isProEnabled ? "#FFD700" : "#FFF"}
                        active={isProEnabled}
                        activeColors={['#FFD700', '#F59E0B', '#FF8A00']}
                        glow="#FFD700"
                        onPress={togglePro}
                    >
                        {/* 🔥 Added a tiny indicator dot to show it's LIVE */}
                        {isProEnabled && <View style={styles.proActiveDot} />}
                    </FancyButton>
                )}

                {/* 📞 HANGUP BUTTON - ROTATING RAINBOW RING + RICH RED GRADIENT CORE */}
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => handleCallEnd(true, 'completed')}
                    onPressIn={hangupPressIn}
                    onPressOut={hangupPressOut}
                >
                    <Animated.View style={[styles.hangupWrapper, { transform: [{ scale: hangupScale }] }]}>
                        <View style={styles.hangupRingClip} pointerEvents="none">
                            <Animated.View
                                style={[
                                    styles.hangupSpinner,
                                    { transform: [{ rotate: hangupSpin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }
                                ]}
                            >
                                <LinearGradient
                                    colors={RAINBOW_COLORS as any}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={StyleSheet.absoluteFill}
                                />
                            </Animated.View>
                        </View>
                        <LinearGradient 
                            colors={['#FF416C', '#FF4B2B']} 
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                            style={styles.hangupGradient}
                        >
                            <Ionicons name="call" size={28} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
                        </LinearGradient>
                    </Animated.View>
                </TouchableOpacity>

                {/* 🎤 Mute Button */}
                <FancyButton
                    icon={isMuted ? "mic-off" : "mic"}
                    active={isMuted}
                    activeColors={['#FF416C', '#F43F5E']}
                    glow="#F43F5E"
                    onPress={toggleMute}
                />

                {/* 🎁 Gift Button (HIDDEN FOR HOST) */}
                {!isConsultant && (
                    <FancyButton
                        icon="gift"
                        iconColor={theme.accent}
                        idleColors={[theme.accent + 'CC', theme.secondary + '99', theme.accent + 'CC']}
                        onPress={onOpenGiftPanel}
                    />
                )}

                {/* 💬 Chat Button */}
                <FancyButton
                    icon="chatbubble-ellipses"
                    active={isChatVisible}
                    activeColors={themeActiveColors}
                    glow={theme.accent}
                    onPress={toggleChatVisibility}
                />
                
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    bottomControlsArea: { 
        width: '100%', 
        alignItems: 'center', 
        marginBottom: 15, // 🔥 PUSHED WAY DOWN (Closer to bottom)
        zIndex: 40 
    },
    buttonsRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-evenly', 
        width: '100%', // Takes full width to space out the floating buttons
        paddingHorizontal: 10,
        // 🔥 REMOVED ALL BORDERS, BACKGROUNDS & SHADOWS OF THE CONTAINER (NO BLACK BOX)
    },

    // 🆕 SQUIRCLE BUTTON (multicolor ring)
    fancyOuter: {
        width: 50,
        height: 50,
        borderRadius: 18,
        backgroundColor: '#0B1026',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 12,
    },
    fancyRing: {
        flex: 1,
        borderRadius: 18,
        padding: 1.5,
    },
    fancyInner: {
        flex: 1,
        borderRadius: 16.5,
        backgroundColor: 'rgba(8, 12, 30, 0.78)', // Dark glass for high contrast over video
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },

    proActiveDot: {
        position: 'absolute',
        top: 7,
        right: 9,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFF',
        shadowColor: '#FFF',
        shadowRadius: 4,
        shadowOpacity: 1,
    },

    // 🆕 HANGUP (rounded square + rotating rainbow ring)
    hangupWrapper: {
        width: 68, // Made hangup button slightly more prominent
        height: 68, 
        borderRadius: 24, 
        backgroundColor: '#0B1026',
        shadowColor: '#FF416C',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.7,
        shadowRadius: 15,
        elevation: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hangupRingClip: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 24,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    hangupSpinner: {
        position: 'absolute',
        width: 130,
        height: 130,
        left: (68 - 130) / 2,
        top: (68 - 130) / 2,
    },
    hangupGradient: {
        position: 'absolute',
        top: 4,
        left: 4,
        right: 4,
        bottom: 4,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },

    // 🆕 WARNING PILL (gradient ring)
    warningFloating: { 
        borderRadius: 25, 
        marginBottom: 20, 
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10 
    },
    warningRing: {
        borderRadius: 25,
        padding: 1.5,
    },
    warningInner: {
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingVertical: 12, 
        borderRadius: 23.5,
        backgroundColor: 'rgba(8, 12, 30, 0.9)',
        overflow: 'hidden',
    },
    warningText: { 
        color: '#FFF', 
        fontSize: 14, 
        fontWeight: '900', 
        marginLeft: 8,
        letterSpacing: 0.5
    }
});