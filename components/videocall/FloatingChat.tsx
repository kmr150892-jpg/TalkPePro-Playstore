import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

interface FloatingChatProps {
    messages: any[];
    inputText: string;
    setInputText: (text: string) => void;
    sendMessage: () => void;
    setIsChatVisible: (visible: boolean) => void;
    currentUserId: string | undefined;
    expertBeans?: number; // 🔥 ADDED FOR DYNAMIC THEME
}

export default function FloatingChat({
    messages,
    inputText,
    setInputText,
    sendMessage,
    setIsChatVisible,
    currentUserId,
    expertBeans = 0
}: FloatingChatProps) {

    // 🔥 DYNAMIC THEME CALCULATION
    const config = getLevelConfig(expertBeans);
    const theme = {
        primary: config.colors[0],
        secondary: config.colors[2],
        accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
    };

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
        <View style={styles.floatingChatContainer}>
            <BlurView intensity={95} tint="dark" style={[styles.chatBlurBox, borderType1]}>
                {/* Chat Header */}
                <View style={styles.chatHeaderMini}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="chatbubbles" size={14} color={theme.accent} style={{ marginRight: 6 }} />
                        <Text style={[styles.chatTitle, { color: theme.accent }]}>Secure Text Channel</Text>
                    </View>
                    <TouchableOpacity onPress={() => setIsChatVisible(false)}>
                        <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                </View>

                {/* Messages List */}
                <FlatList
                    data={messages}
                    keyExtractor={(item) => item.id}
                    style={styles.miniChatList}
                    showsVerticalScrollIndicator={false}
                    renderItem={({ item }) => {
                        const isMine = item.senderId === currentUserId;
                        return (
                            <View style={[
                                styles.miniBubble, 
                                isMine ? [styles.myMiniChat, { backgroundColor: theme.primary }] : [styles.theirMiniChat, { backgroundColor: theme.secondary + '30', borderWidth: 1, borderColor: theme.secondary + '50' }]
                            ]}>
                                <Text style={[styles.miniChatText, isMine ? { color: '#FFF' } : { color: '#E2E8F0' }]}>{item.text}</Text>
                            </View>
                        );
                    }}
                />

                {/* Input Area */}
                <View style={[styles.miniInputRow, { borderColor: theme.primary + '30', borderWidth: 1 }]}>
                    <TextInput 
                        style={styles.miniInput} 
                        placeholder="Type a message..." 
                        placeholderTextColor="#94A3B8" 
                        value={inputText} 
                        onChangeText={setInputText} 
                    />
                    <TouchableOpacity onPress={sendMessage} style={styles.miniSendBtn}>
                        <Ionicons name="send" size={20} color={theme.primary} />
                    </TouchableOpacity>
                </View>
            </BlurView>
        </View>
    );
}

const styles = StyleSheet.create({
    floatingChatContainer: { 
        position: 'absolute', 
        bottom: 130, 
        left: 15, 
        right: 15, 
        maxHeight: 250, // Slightly increased to breathe
        zIndex: 30 
    },
    chatBlurBox: { 
        borderRadius: 30, // 🔥 ZERO BOX FLUID SHAPE
        padding: 15, 
        overflow: 'hidden', 
        elevation: 15,
        shadowColor: '#000',
        shadowOpacity: 0.5,
        shadowRadius: 10
    },
    chatHeaderMini: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 12 
    },
    chatTitle: { 
        fontSize: 11, 
        fontWeight: '900', 
        textTransform: 'uppercase', 
        letterSpacing: 1 
    },
    miniChatList: { 
        maxHeight: 120 
    }, 
    miniBubble: { 
        paddingHorizontal: 15, 
        paddingVertical: 10, 
        borderRadius: 20, // Fluid bubble
        marginBottom: 8, 
        maxWidth: '85%' 
    },
    myMiniChat: { 
        alignSelf: 'flex-end', 
    },
    theirMiniChat: { 
        alignSelf: 'flex-start', 
    },
    miniChatText: { 
        fontSize: 14, 
        fontWeight: '600' 
    },
    miniInputRow: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        backgroundColor: 'rgba(255,255,255,0.05)', 
        borderRadius: 25, // Fluid input
        paddingHorizontal: 15, 
        marginTop: 10, 
        height: 48 
    },
    miniInput: { 
        flex: 1, 
        color: '#FFF', 
        fontSize: 14,
        fontWeight: '500'
    },
    miniSendBtn: { 
        marginLeft: 10,
        padding: 5
    }
});