import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, FlatList, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

// 🎨 Picks black or white text so messages stay readable on ANY level colour (yellow, silver, etc.)
const getReadableText = (hex: string) => {
    const h = hex.replace('#', '');
    if (h.length < 6) return '#FFFFFF';
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.62 ? '#0B1020' : '#FFFFFF';
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
    const onPrimary = getReadableText(theme.primary);

    const listRef = useRef<FlatList>(null);
    const enter = useRef(new Animated.Value(0)).current;
    const sendScale = useRef(new Animated.Value(1)).current;
    const hasText = inputText.trim().length > 0;

    // ✨ ONE entrance moment: panel glides up and fades in
    useEffect(() => {
        Animated.timing(enter, {
            toValue: 1,
            duration: 380,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, []);

    const handleSend = () => {
        if (!hasText) return;
        Animated.sequence([
            Animated.timing(sendScale, { toValue: 0.82, duration: 70, useNativeDriver: true }),
            Animated.spring(sendScale, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();
        sendMessage();
    };

    return (
        <Animated.View
            style={[
                styles.floatingChatContainer,
                {
                    opacity: enter,
                    transform: [{ translateY: enter.interpolate({ inputRange: [0, 1], outputRange: [28, 0] }) }],
                },
            ]}
        >
            <BlurView intensity={70} tint="dark" style={styles.panel}>
                {/* Frosted base so text stays crisp over any video */}
                <View style={styles.panelTint} pointerEvents="none" />

                {/* Signature accent edge: the one bold detail */}
                <LinearGradient
                    colors={[theme.primary, theme.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.accentEdge}
                />

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View style={[styles.liveDot, { backgroundColor: theme.accent, shadowColor: theme.accent }]} />
                        <Text style={styles.title}>Chat</Text>
                        <Text style={styles.subtitle}>private to this call</Text>
                    </View>
                    <TouchableOpacity
                        onPress={() => setIsChatVisible(false)}
                        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                        style={styles.closeBtn}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="chevron-down" size={18} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                </View>

                {/* Messages */}
                <FlatList
                    ref={listRef}
                    data={messages}
                    keyExtractor={(item) => item.id}
                    style={styles.list}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Ionicons name="chatbubble-ellipses-outline" size={22} color="rgba(255,255,255,0.35)" />
                            <Text style={styles.emptyText}>No messages yet. Say something.</Text>
                        </View>
                    }
                    renderItem={({ item, index }) => {
                        const isMine = item.senderId === currentUserId;
                        const prev = index > 0 ? messages[index - 1] : null;
                        const sameSenderAsPrev = prev && prev.senderId === item.senderId;

                        if (isMine) {
                            return (
                                <View style={[styles.row, styles.rowMine, { marginTop: sameSenderAsPrev ? 3 : 10 }]}>
                                    <LinearGradient
                                        colors={[theme.primary, theme.secondary]}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={[styles.bubble, styles.bubbleMine]}
                                    >
                                        <Text style={[styles.msgText, { color: onPrimary }]}>{item.text}</Text>
                                    </LinearGradient>
                                </View>
                            );
                        }

                        return (
                            <View style={[styles.row, styles.rowTheirs, { marginTop: sameSenderAsPrev ? 3 : 10 }]}>
                                <View style={[styles.bubble, styles.bubbleTheirs]}>
                                    <View style={[styles.theirsBar, { backgroundColor: theme.accent }]} />
                                    <Text style={[styles.msgText, { color: '#F1F5F9' }]}>{item.text}</Text>
                                </View>
                            </View>
                        );
                    }}
                />

                {/* Input */}
                <View style={[styles.inputRow, hasText && { borderColor: theme.accent + '90' }]}>
                    <TextInput
                        style={styles.input}
                        placeholder="Write a message"
                        placeholderTextColor="rgba(203,213,225,0.55)"
                        value={inputText}
                        onChangeText={setInputText}
                        returnKeyType="send"
                        blurOnSubmit={false}
                        onSubmitEditing={handleSend}
                        selectionColor={theme.accent}
                    />
                    <Animated.View style={{ transform: [{ scale: sendScale }] }}>
                        <Pressable onPress={handleSend} disabled={!hasText} hitSlop={8}>
                            <LinearGradient
                                colors={hasText ? [theme.primary, theme.secondary] : ['rgba(255,255,255,0.10)', 'rgba(255,255,255,0.10)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.sendOrb}
                            >
                                <Ionicons
                                    name="arrow-up"
                                    size={20}
                                    color={hasText ? onPrimary : 'rgba(255,255,255,0.35)'}
                                />
                            </LinearGradient>
                        </Pressable>
                    </Animated.View>
                </View>
            </BlurView>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    floatingChatContainer: {
        position: 'absolute',
        bottom: 130,
        left: 14,
        right: 14,
        zIndex: 30,
        shadowColor: '#000',
        shadowOpacity: 0.55,
        shadowRadius: 22,
        shadowOffset: { width: 0, height: 10 },
        elevation: 18,
    },
    panel: {
        borderRadius: 28,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.16)',
        paddingHorizontal: 14,
        paddingTop: 14,
        paddingBottom: 12,
    },
    panelTint: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(8, 12, 26, 0.62)',
    },
    accentEdge: {
        position: 'absolute',
        top: 0,
        left: 28,
        right: 28,
        height: 2,
        borderBottomLeftRadius: 2,
        borderBottomRightRadius: 2,
        opacity: 0.95,
    },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'baseline', flex: 1 },
    liveDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
        alignSelf: 'center',
        marginRight: 8,
        shadowOpacity: 0.9,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 0 },
        elevation: 4,
    },
    title: { color: '#FFFFFF', fontSize: 15, fontWeight: '800', letterSpacing: 0.2 },
    subtitle: { color: 'rgba(203,213,225,0.55)', fontSize: 11, fontWeight: '500', marginLeft: 8 },
    closeBtn: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: 'rgba(255,255,255,0.08)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    list: { maxHeight: 150 },
    listContent: { paddingVertical: 4, flexGrow: 1 },

    emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 22, gap: 6 },
    emptyText: { color: 'rgba(203,213,225,0.55)', fontSize: 12.5, fontWeight: '500' },

    row: { flexDirection: 'row', maxWidth: '100%' },
    rowMine: { justifyContent: 'flex-end' },
    rowTheirs: { justifyContent: 'flex-start' },
    bubble: {
        maxWidth: '82%',
        paddingHorizontal: 14,
        paddingVertical: 9,
    },
    // Asymmetric corners: the small corner points at the sender
    bubbleMine: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 6,
    },
    bubbleTheirs: {
        backgroundColor: 'rgba(255,255,255,0.09)',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        borderBottomRightRadius: 20,
        borderBottomLeftRadius: 6,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.14)',
        paddingLeft: 17,
        overflow: 'hidden',
    },
    theirsBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        opacity: 0.9,
    },
    msgText: { fontSize: 14, fontWeight: '600', lineHeight: 19 },

    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        height: 50,
        borderRadius: 25,
        paddingLeft: 18,
        paddingRight: 5,
        backgroundColor: 'rgba(255,255,255,0.07)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
    },
    input: { flex: 1, color: '#FFFFFF', fontSize: 14, fontWeight: '500', paddingVertical: 0 },
    sendOrb: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});
