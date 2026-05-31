import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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

    // 🔥 HIGH-END NEON GLOW FOR ACTIVE BUTTONS (GAME, CHAT)
    const activeBorderType = {
        borderWidth: 2,
        borderColor: theme.accent,
        backgroundColor: theme.primary + '50', // Darker opacity for floating feel
        shadowColor: theme.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 15,
        elevation: 15,
    };

    // 🔥 SATTI FIX: EXPLOSIVE GLOW FOR PRO FILTER BUTTON SO HOST KNOWS IT WORKED
    const activeProFilterStyle = {
        borderWidth: 2,
        borderColor: '#FFD700', // Gold pop for Pro
        backgroundColor: 'rgba(255, 215, 0, 0.35)', 
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 15,
        elevation: 15,
    };

    // 🔥 STRICT HOST CHECK
    const isConsultant = role?.toLowerCase() === 'expert' || role?.toLowerCase() === 'host';

    return (
        <View style={styles.bottomControlsArea}>
            {showWarning && (
                <View style={[styles.warningFloating, isCriticalWarning ? {backgroundColor: '#B91C1C', shadowColor: '#B91C1C'} : {backgroundColor: theme.primary + '95', shadowColor: theme.primary}]}>
                    <Ionicons name="alert-circle" size={18} color="#FFF" />
                    <Text style={styles.warningText}>{warningMessage}</Text>
                </View>
            )}
            
            {/* 🔥 NO BLACK BOX - BUTTONS DIRECTLY FLOAT ON SCREEN 🔥 */}
            <View style={styles.buttonsRow}>
                
                {/* 🔄 Camera Switch Button */}
                <TouchableOpacity style={styles.blurBtn} activeOpacity={0.6} onPress={switchCamera}>
                    <Ionicons name="camera-reverse" size={22} color="#FFF" />
                </TouchableOpacity>

                {/* 🎮 Game Button */}
                <TouchableOpacity style={[styles.blurBtn, isGameVisible && activeBorderType]} activeOpacity={0.6} onPress={toggleGameVisibility}>
                    <Ionicons name="game-controller" size={22} color={isGameVisible ? "#FFF" : "#FFF"} />
                </TouchableOpacity>

                {/* ✨ Pro FILTER BUTTON (HOST ONLY) */}
                {isConsultant && (
                    <TouchableOpacity style={[styles.blurBtn, isProEnabled && activeProFilterStyle]} activeOpacity={0.6} onPress={togglePro}>
                        <Ionicons name="sparkles" size={22} color={isProEnabled ? "#FFD700" : "#FFF"} />
                        {/* 🔥 Added a tiny indicator dot to show it's LIVE */}
                        {isProEnabled && <View style={styles.proActiveDot} />}
                    </TouchableOpacity>
                )}

                {/* 📞 HANGUP BUTTON - RICH RED GRADIENT GLOW */}
                <TouchableOpacity style={styles.hangupWrapper} activeOpacity={0.8} onPress={() => handleCallEnd(true, 'completed')}>
                    <LinearGradient 
                        colors={['#FF416C', '#FF4B2B']} 
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                        style={styles.hangupGradient}
                    >
                        <Ionicons name="call" size={28} color="#FFF" style={{ transform: [{ rotate: '135deg' }] }} />
                    </LinearGradient>
                </TouchableOpacity>

                {/* 🎤 Mute Button */}
                <TouchableOpacity style={[styles.blurBtn, isMuted && styles.mutedBtnStyle]} activeOpacity={0.6} onPress={toggleMute}>
                    <Ionicons name={isMuted ? "mic-off" : "mic"} size={22} color={isMuted ? "#FFF" : "#FFF"} />
                </TouchableOpacity>

                {/* 🎁 Gift Button (HIDDEN FOR HOST) */}
                {!isConsultant && (
                    <TouchableOpacity style={[styles.blurBtn, { borderColor: theme.accent + '90' }]} activeOpacity={0.6} onPress={onOpenGiftPanel}>
                        <Ionicons name="gift" size={22} color={theme.accent} />
                    </TouchableOpacity>
                )}

                {/* 💬 Chat Button */}
                <TouchableOpacity style={[styles.blurBtn, isChatVisible && activeBorderType]} activeOpacity={0.6} onPress={toggleChatVisibility}>
                    <Ionicons name="chatbubble-ellipses" size={22} color={isChatVisible ? "#FFF" : "#FFF"} />
                </TouchableOpacity>
                
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
    blurBtn: { 
        width: 50, // Slightly bigger for standalone floating look
        height: 50, 
        borderRadius: 25, 
        backgroundColor: 'rgba(0, 0, 0, 0.55)', // Dark frosted glass for high contrast over video
        justifyContent: 'center', 
        alignItems: 'center', 
        borderWidth: 1.5, 
        borderColor: 'rgba(255, 255, 255, 0.25)', // Crisper white edge
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
        elevation: 12,
    },
    mutedBtnStyle: {
        backgroundColor: 'rgba(244, 63, 94, 0.85)', // Strong red for mute
        borderColor: '#F43F5E',
        shadowColor: '#F43F5E',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 12,
        elevation: 12,
    },
    proActiveDot: {
        position: 'absolute',
        top: 8,
        right: 10,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FFF',
        shadowColor: '#FFF',
        shadowRadius: 4,
        shadowOpacity: 1,
    },
    hangupWrapper: {
        width: 68, // Made hangup button slightly more prominent
        height: 68, 
        borderRadius: 34, 
        shadowColor: '#FF416C',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.7,
        shadowRadius: 15,
        elevation: 15,
        justifyContent: 'center',
        alignItems: 'center',
    },
    hangupGradient: {
        width: '100%',
        height: '100%',
        borderRadius: 34,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.4)',
    },
    warningFloating: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 20, 
        paddingVertical: 12, 
        borderRadius: 25, 
        marginBottom: 20, 
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10 
    },
    warningText: { 
        color: '#FFF', 
        fontSize: 14, 
        fontWeight: '900', 
        marginLeft: 8,
        letterSpacing: 0.5
    }
});