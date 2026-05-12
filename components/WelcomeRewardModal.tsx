import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, db } from '../firebaseConfig'; // Ensure correct path

const { width, height } = Dimensions.get('window');

export default function WelcomeRewardModal() {
    const [isVisible, setIsVisible] = useState(false);
    const [userData, setUserData] = useState<any>(null);
    const [isSpinning, setIsSpinning] = useState(false);
    const [reward, setReward] = useState<number | null>(null);
    const [displayNumber, setDisplayNumber] = useState<number>(1);

    const spinAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(1)).current;

    // 🛡️ 1. Check if it's a NEW USER who hasn't claimed yet (with Auth Protector)
    useEffect(() => {
        let unsubSnap: () => void;

        const unsubAuth = auth.onAuthStateChanged((user) => {
            if (user) {
                unsubSnap = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
                    if (docSnap.exists()) {
                        const data = docSnap.data();
                        setUserData({ id: docSnap.id, ...data });

                        // 🔥 Show ONLY if role is 'user' AND they haven't claimed the welcome bonus yet
                        if (data.role === 'user' && !data.hasSpunWelcomeWheel) {
                            setIsVisible(true);
                        } else {
                            setIsVisible(false);
                        }
                    }
                });
            }
        });

        return () => {
            unsubAuth();
            if (unsubSnap) unsubSnap();
        };
    }, []);

    // 🎰 2. The Weighted Allocation Logic
    const calculateReward = () => {
        const rand = Math.random() * 100; // 0 to 100
        if (rand <= 10) return 3; // 🔥 10% Probability for 3 Mins
        if (rand <= 50) return 2; // 🔥 40% Probability for 2 Mins
        return 1;                 // 🔥 50% Probability for 1 Min
    };

    const handleSpin = () => {
        if (isSpinning) return;
        setIsSpinning(true);

        // Calculate final reward securely
        const finalReward = calculateReward();

        // 🌀 Start UI Animations
        Animated.loop(
            Animated.timing(spinAnim, {
                toValue: 1,
                duration: 500,
                easing: Easing.linear,
                useNativeDriver: true,
            })
        ).start();

        // 🎰 Number Shuffling Effect (Decryption Mechanics)
        let shuffles = 0;
        const shuffleInterval = setInterval(() => {
            setDisplayNumber(Math.floor(Math.random() * 3) + 1);
            shuffles++;

            // Stop shuffling after 3 seconds
            if (shuffles > 30) {
                clearInterval(shuffleInterval);
                spinAnim.stopAnimation(); // Stop ring
                setDisplayNumber(finalReward); // Lock in the final reward
                setReward(finalReward);

                // Pop animation for the allocation
                Animated.sequence([
                    Animated.timing(scaleAnim, { toValue: 1.3, duration: 200, useNativeDriver: true }),
                    Animated.timing(scaleAnim, { toValue: 1, duration: 200, useNativeDriver: true })
                ]).start();
            }
        }, 100);
    };

    // 💾 3. Claim and Update Firebase
    const claimReward = async () => {
        if (!userData?.id || reward === null) return;
        
        try {
            await updateDoc(doc(db, "users", userData.id), {
                freeMinsRemaining: reward, // 🔥 Using exact field name from screenshot
                hasSpunWelcomeWheel: true // 🔒 Lock it forever!
            });
            setIsVisible(false); // Close Modal
        } catch (error) {
            // console.error("Error claiming reward:", error);
        }
    };

    const spinInterpolate = spinAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg']
    });

    if (!isVisible) return null;

    return (
        <Modal transparent visible={isVisible} animationType="fade">
            <BlurView intensity={90} tint="dark" style={styles.overlay}>
                <View style={styles.container}>
                    
                    <Text style={styles.title}>WELCOME TO TALKPE PRO</Text>
                    <Text style={styles.subtitle}>Unlock Your Complimentary Session with Consultants</Text>

                    {/* 🔥 THE QUANTUM RING */}
                    <View style={styles.wheelWrapper}>
                        {/* Outer Glowing Ring */}
                        <Animated.View style={[styles.outerRing, { transform: [{ rotate: spinInterpolate }] }]}>
                            <LinearGradient
                                colors={['#00F2FE', 'transparent', '#4FACFE', 'transparent']}
                                style={StyleSheet.absoluteFill}
                                start={{x: 0, y: 0}} end={{x: 1, y: 1}}
                            />
                        </Animated.View>

                        {/* Inner Core display */}
                        <Animated.View style={[styles.innerCore, { transform: [{ scale: scaleAnim }] }]}>
                            {reward ? (
                                <View style={styles.rewardContainer}>
                                    <Text style={styles.rewardNumber}>{reward}</Text>
                                    <Text style={styles.rewardText}>MINS</Text>
                                    <Text style={styles.rewardTextSub}>SECURED</Text>
                                </View>
                            ) : (
                                <Text style={styles.rollingNumber}>{displayNumber}</Text>
                            )}
                        </Animated.View>
                    </View>

                    {/* ACTIONS */}
                    <View style={styles.actionContainer}>
                        {!reward ? (
                            <TouchableOpacity 
                                style={styles.spinBtn} 
                                onPress={handleSpin}
                                disabled={isSpinning}
                            >
                                <LinearGradient
                                    colors={isSpinning ? ['#334155', '#1E293B'] : ['#00F2FE', '#2563EB']}
                                    start={{x:0, y:0}} end={{x:1, y:0}}
                                    style={styles.spinGradient}
                                >
                                    <MaterialCommunityIcons name={isSpinning ? "sync" : "shield-check"} size={24} color="#FFF" />
                                    <Text style={styles.spinText}>{isSpinning ? "DECRYPTING BONUS..." : "UNLOCK WELCOME BONUS"}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        ) : (
                            <Animated.View style={{ opacity: scaleAnim }}>
                                <TouchableOpacity style={styles.claimBtn} onPress={claimReward}>
                                    <LinearGradient
                                        colors={['#10B981', '#047857']}
                                        start={{x:0, y:0}} end={{x:1, y:0}}
                                        style={styles.spinGradient}
                                    >
                                        <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                                        <Text style={styles.spinText}>PROCEED WITH {reward} MINS</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </Animated.View>
                        )}
                    </View>

                </View>
            </BlurView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(2, 6, 23, 0.8)',
    },
    container: {
        width: width * 0.85,
        backgroundColor: '#0F172A',
        borderRadius: 30,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(0, 242, 254, 0.3)',
        elevation: 20,
        shadowColor: '#00F2FE',
        shadowOpacity: 0.4,
        shadowRadius: 20,
    },
    title: {
        color: '#FFF',
        fontSize: 22,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 5,
        textAlign: 'center',
    },
    subtitle: {
        color: '#94A3B8',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 40,
        textAlign: 'center',
        letterSpacing: 1,
    },
    wheelWrapper: {
        width: 200,
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 40,
    },
    outerRing: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 4,
        borderColor: 'rgba(0, 242, 254, 0.1)',
        overflow: 'hidden',
    },
    innerCore: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: '#020617',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#1E293B',
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 1,
        shadowRadius: 10,
    },
    rollingNumber: {
        color: '#00F2FE',
        fontSize: 60,
        fontWeight: '900',
        textShadowColor: 'rgba(0, 242, 254, 0.8)',
        textShadowRadius: 15,
    },
    rewardContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    rewardNumber: {
        color: '#10B981',
        fontSize: 60,
        fontWeight: '900',
        lineHeight: 65,
        textShadowColor: 'rgba(16, 185, 129, 0.8)',
        textShadowRadius: 15,
    },
    rewardText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 2,
    },
    rewardTextSub: {
        color: '#10B981',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    actionContainer: {
        width: '100%',
    },
    spinBtn: {
        width: '100%',
        height: 55,
        borderRadius: 27.5,
        overflow: 'hidden',
    },
    claimBtn: {
        width: '100%',
        height: 55,
        borderRadius: 27.5,
        overflow: 'hidden',
        shadowColor: '#10B981',
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 10,
    },
    spinGradient: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
    },
    spinText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1.5,
    }
});