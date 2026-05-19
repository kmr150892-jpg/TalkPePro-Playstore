import { Ionicons } from '@expo/vector-icons';
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

    // 🔥 DUAL-TONE BORDER STYLES (FLUID, 2px) for Active Buttons
    const activeBorderType = {
        borderLeftWidth: 2,
        borderRightWidth: 2,
        borderTopWidth: 0.5,
        borderBottomWidth: 0.5,
        borderLeftColor: theme.primary,
        borderRightColor: theme.primary,
        borderTopColor: theme.secondary + '80',
        borderBottomColor: theme.secondary + '80',
        backgroundColor: theme.primary + '30',
    };

    // 🔥 STRICT CONSULTANT CHECK
    const isConsultant = role?.toLowerCase() === 'expert' || role?.toLowerCase() === 'consultant';

    return (
        <View style={styles.bottomControlsArea}>
            {showWarning && (
                <View style={[styles.warningFloating, isCriticalWarning ? {backgroundColor: '#B91C1C'} : {backgroundColor: theme.primary + '90'}]}>
                    <Ionicons name="alert-circle" size={18} color="#FFF" />
                    <Text style={styles.warningText}>{warningMessage}</Text>
                </View>
            )}
            
            <View style={[styles.buttonsRow, { backgroundColor: 'rgba(15, 23, 42, 0.45)', paddingVertical: 12, borderRadius: 40 }]}>
                {/* 🔄 Camera Switch Button */}
                <TouchableOpacity style={styles.blurBtn} onPress={switchCamera}>
                    <Ionicons name="camera-reverse" size={22} color="#FFF" />
                </TouchableOpacity>

                {/* 🎮 Game Button */}
                <TouchableOpacity style={[styles.blurBtn, isGameVisible && activeBorderType]} onPress={toggleGameVisibility}>
                    <Ionicons name="game-controller" size={22} color={isGameVisible ? theme.accent : "#FFF"} />
                </TouchableOpacity>

                {/* ✨ Pro FILTER BUTTON (CONSULTANT ONLY) */}
                {isConsultant && (
                    <TouchableOpacity style={[styles.blurBtn, isProEnabled && activeBorderType]} onPress={togglePro}>
                        <Ionicons name="sparkles" size={22} color={isProEnabled ? theme.accent : "#FFF"} />
                    </TouchableOpacity>
                )}

                {/* 📞 HANGUP BUTTON */}
                <TouchableOpacity style={styles.hangupBtn} onPress={() => handleCallEnd(true, 'completed')}>
                    <Ionicons name="call" size={28} color="#FFF" />
                </TouchableOpacity>

                {/* 🎤 Mute Button */}
                <TouchableOpacity style={[styles.blurBtn, isMuted && { backgroundColor: 'rgba(244, 63, 94, 0.2)', borderColor: 'rgba(244, 63, 94, 0.5)' }]} onPress={toggleMute}>
                    <Ionicons name={isMuted ? "mic-off" : "mic"} size={22} color={isMuted ? "#F43F5E" : "#FFF"} />
                </TouchableOpacity>

                {/* 🎁 Gift Button (HIDDEN FOR CONSULTANT) */}
                {!isConsultant && (
                    <TouchableOpacity style={styles.blurBtn} onPress={onOpenGiftPanel}>
                        <Ionicons name="gift" size={22} color={theme.accent} />
                    </TouchableOpacity>
                )}

                {/* 💬 Chat Button */}
                <TouchableOpacity style={[styles.blurBtn, isChatVisible && activeBorderType]} onPress={toggleChatVisibility}>
                    <Ionicons name="chatbubble-ellipses" size={22} color={isChatVisible ? theme.accent : "#FFF"} />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    bottomControlsArea: { 
        width: '100%', 
        alignItems: 'center', 
        marginBottom: 40, 
        zIndex: 40 
    },
    buttonsRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-evenly', 
        width: '98%', 
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)'
    },
    blurBtn: { 
        width: 48, 
        height: 48, 
        borderRadius: 24, 
        backgroundColor: 'rgba(255,255,255,0.12)', 
        justifyContent: 'center', 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.2)' 
    },
    hangupBtn: { 
        width: 62, 
        height: 62, 
        borderRadius: 31, 
        backgroundColor: '#EF4444', 
        justifyContent: 'center', 
        alignItems: 'center', 
        transform: [{ rotate: '135deg' }], 
        elevation: 8,
        shadowColor: '#EF4444',
        shadowOpacity: 0.5,
        shadowRadius: 10
    },
    warningFloating: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        paddingHorizontal: 16, 
        paddingVertical: 10, 
        borderRadius: 20, 
        marginBottom: 20, 
        elevation: 5 
    },
    warningText: { 
        color: '#FFF', 
        fontSize: 14, 
        fontWeight: '900', 
        marginLeft: 8 
    }
});