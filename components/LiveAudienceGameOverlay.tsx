import { MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, onSnapshot } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig';

const { width } = Dimensions.get('window');

interface LiveAudienceGameOverlayProps {
    liveId: string;
    roomId?: string;
    onOpenGameSheet: () => void; // Parent screen-ku trigger anuppa
}

export default function LiveAudienceGameOverlay({ liveId, roomId = 'reflex_arena', onOpenGameSheet }: LiveAudienceGameOverlayProps) {
    const [gameData, setGameData] = useState<any>(null);
    const [isVisible, setIsVisible] = useState(false);
    
    // Animations
    const slideAnim = useRef(new Animated.Value(100)).current; // Start below screen
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // 🔥 FIRESTORE LISTENER FOR GAME STATUS
    useEffect(() => {
        const roomRef = roomId === 'reflex_arena' ? doc(db, 'global_games', 'reflex_arena') : doc(db, 'lives', liveId, 'games', roomId);

        const unsub = onSnapshot(roomRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setGameData(data);
                
                // Check if user is already in the players array
                const hasJoined = data.players?.some((p: any) => p.id === auth.currentUser?.uid);
                
                // Show banner ONLY if game is WAITING and user HAS NOT joined yet
                if (data.status === 'WAITING' && !hasJoined) {
                    setIsVisible(true);
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        friction: 5,
                        tension: 40,
                        useNativeDriver: true
                    }).start();
                } else {
                    // Hide banner smoothly
                    Animated.timing(slideAnim, {
                        toValue: 150,
                        duration: 300,
                        easing: Easing.in(Easing.ease),
                        useNativeDriver: true
                    }).start(() => setIsVisible(false));
                }
            } else {
                setIsVisible(false);
            }
        });

        return () => unsub();
    }, [liveId, roomId]);

    // 🔥 PULSE ANIMATION FOR THE JOIN BUTTON
    useEffect(() => {
        if (isVisible) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
                    Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
                ])
            ).start();
        } else {
            pulseAnim.setValue(1);
        }
    }, [isVisible]);

    if (!isVisible || !gameData) return null;

    const entryFee = gameData.entryFee || 0;

    return (
        <Animated.View style={[styles.overlayContainer, { transform: [{ translateY: slideAnim }] }]}>
            <TouchableOpacity activeOpacity={0.9} onPress={onOpenGameSheet} style={styles.touchableWrapper}>
                <BlurView intensity={70} tint="dark" style={styles.glassCard}>
                    <LinearGradient 
                        colors={['rgba(245, 158, 11, 0.2)', 'rgba(0, 0, 0, 0.6)']} 
                        start={{ x: 0, y: 0 }} 
                        end={{ x: 1, y: 1 }} 
                        style={StyleSheet.absoluteFill} 
                    />
                    
                    <View style={styles.contentRow}>
                        {/* ICON & TEXT AREA */}
                        <View style={styles.infoSection}>
                            <View style={styles.iconGlow}>
                                <MaterialCommunityIcons name="brain" size={24} color="#F59E0B" />
                            </View>
                            <View style={styles.textStack}>
                                <Text style={styles.alertTitle}>EXPERT CHALLENGE!</Text>
                                <Text style={styles.alertSub}>Reflex Blitz Arena is Open</Text>
                            </View>
                        </View>

                        {/* ACTION BUTTON AREA */}
                        <Animated.View style={[styles.actionSection, { transform: [{ scale: pulseAnim }] }]}>
                            <LinearGradient colors={['#F59E0B', '#D97706']} style={styles.joinBtnBg}>
                                <Text style={styles.joinBtnText}>JOIN</Text>
                                <View style={styles.feeBadge}>
                                    <Text style={styles.feeBadgeText}>{entryFee} 💎</Text>
                                </View>
                            </LinearGradient>
                        </Animated.View>
                    </View>
                    
                    {/* BOTTOM PROGRESS BAR (Visual Effect) */}
                    <View style={styles.bottomHighlight} />
                </BlurView>
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlayContainer: {
        position: 'absolute',
        bottom: 90, // Adjusted to sit right above bottom inputs/menus in the live stream
        left: 15,
        right: 15,
        zIndex: 9999,
        elevation: 20,
        shadowColor: '#F59E0B',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.4,
        shadowRadius: 15,
    },
    touchableWrapper: {
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.5)',
    },
    glassCard: {
        padding: 15,
        width: '100%',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    infoSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    iconGlow: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.4)',
    },
    textStack: {
        marginLeft: 12,
        flex: 1,
    },
    alertTitle: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 1,
        marginBottom: 2,
    },
    alertSub: {
        color: '#CBD5E1',
        fontSize: 11,
        fontWeight: '600',
    },
    actionSection: {
        marginLeft: 10,
    },
    joinBtnBg: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        gap: 6,
    },
    joinBtnText: {
        color: '#020617',
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 1,
    },
    feeBadge: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    feeBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: '800',
    },
    bottomHighlight: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: '#F59E0B',
        opacity: 0.8,
    }
});