import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient'; // 🔥 ADDED FOR DEEP GLOW
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated, // 🔥 ADDED FOR ORB ANIMATION
    Easing, // 🔥 ADDED FOR ORB ANIMATION
    StyleSheet,
    Text, // 🔥 ADDED FOR LOADING TEXT
    View
} from 'react-native';
import createAgoraRtcEngine, {
    ChannelProfileType,
    ClientRoleType,
    IRtcEngine,
    RtcSurfaceView
} from 'react-native-agora';

// Secure Agora App Configuration
const AGORA_APP_ID = '718cedc3c47e44d1bfa4853d6ac6cd80'; 

interface LivePreviewProps {
    liveId: string;
}

export const LivePreview = ({ liveId }: LivePreviewProps) => {
    const engine = useRef<IRtcEngine | null>(null);
    const [remoteUid, setRemoteUid] = useState<number>(0);
    const [joined, setJoined] = useState(false);
    const isFocused = useIsFocused();

    // 🔥 ANIMATION REF FOR DEEP-GLOW LOADING STATE
    const shimmerAnim = useRef(new Animated.Value(0)).current;
    
    // 🔥 SATTI FIX: NEW ANIMATION REFS FOR RADAR PULSE EFFECT
    const pulseScale = useRef(new Animated.Value(1)).current;
    const pulseOpacity = useRef(new Animated.Value(0.8)).current;

    useEffect(() => {
        // 🔥 Start Ambient Animation for Secure Loading Interface
        Animated.loop(
          Animated.timing(shimmerAnim, {
            toValue: 1,
            duration: 4000,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true
          })
        ).start();

        // 🔥 SATTI FIX: START RADAR PULSE ANIMATION
        Animated.loop(
            Animated.parallel([
                Animated.sequence([
                    Animated.timing(pulseScale, { toValue: 1.8, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                    Animated.timing(pulseScale, { toValue: 1, duration: 0, useNativeDriver: true })
                ]),
                Animated.sequence([
                    Animated.timing(pulseOpacity, { toValue: 0, duration: 1500, easing: Easing.out(Easing.ease), useNativeDriver: true }),
                    Animated.timing(pulseOpacity, { toValue: 0.8, duration: 0, useNativeDriver: true })
                ])
            ])
        ).start();
    }, []);

    useEffect(() => {
        let isSubscribed = true;

        const setupPreview = async () => {
            // Verify screen focus protocol before channel attachment
            if (!isFocused) return;

            try {
                // Initialize fresh Host RTC instance
                engine.current = createAgoraRtcEngine();
                const rtcEngine = engine.current;

                rtcEngine.initialize({ appId: AGORA_APP_ID });
                rtcEngine.enableVideo();
                
                // Privacy Protocol: Audio fully disabled for preview mode
                rtcEngine.muteLocalAudioStream(true);
                rtcEngine.muteAllRemoteAudioStreams(true);

                rtcEngine.registerEventHandler({
                    onJoinChannelSuccess: () => {
                        if (isSubscribed) setJoined(true);
                    },
                    onUserJoined: (connection, uid) => {
                        // console.log("Preview: Host Joined UID:", uid);
                        if (isSubscribed) setRemoteUid(uid);
                    },
                    onUserOffline: () => {
                        if (isSubscribed) setRemoteUid(0);
                    },
                    onError: (err) => {
                        // console.error("Agora Infrastructure Error:", err);
                    }
                });

                // Secure uplink for preview synchronization
                rtcEngine.joinChannel('', liveId, 0, {
                    clientRoleType: ClientRoleType.ClientRoleAudience,
                    channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
                });

            } catch (e) {
                // console.error("Secure Preview Protocol Error:", e);
            }
        };

        setupPreview();

        return () => {
            isSubscribed = false;
            if (engine.current) {
                engine.current.leaveChannel();
                engine.current.release();
                engine.current = null;
            }
            // Protocol state reset
            setRemoteUid(0);
            setJoined(false);
        };
    }, [liveId, isFocused]); 

    const orbTranslateY = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -20]
    });

    return (
        <View style={styles.container}>
            {/* Focal check & remote transmission logic synchronization */}
            {isFocused && remoteUid !== 0 ? (
                <RtcSurfaceView 
                    key={`${liveId}-${remoteUid}`} // Dynamic re-rendering for UID synchronization
                    canvas={{ uid: remoteUid }} 
                    style={styles.video} 
                    connection={{ channelId: liveId }} // Core connection parameter for RTC View
                />
            ) : (
                <View style={styles.loading}>
                    {/* 🔥 AAA DYNAMIC DEEP-GLOW THEME FOR SECURE LOADING STATE */}
                    <LinearGradient colors={['#050505', '#110022', '#000000']} style={StyleSheet.absoluteFill} />
                    
                    {/* 🔥 SATTI FIX: BIGGER, MORE VIBRANT NEON ORBS */}
                    <Animated.View style={[styles.shimmerOrb, { top: -40, right: -40, backgroundColor: '#00F2FE', transform: [{ translateY: orbTranslateY }] }]} />
                    <Animated.View style={[styles.shimmerOrb, { bottom: -40, left: -40, backgroundColor: '#FF0844', transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />
                    
                    {/* 🔥 SATTI FIX: NEW HIGH-END RADAR PULSE UI */}
                    <View style={styles.radarContainer}>
                        <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseScale }], opacity: pulseOpacity }]} />
                        <View style={styles.centerOrb}>
                            <ActivityIndicator color="#FFF" size="large" />
                        </View>
                    </View>

                    {/* 🔥 SATTI FIX: GLOWING TEXT INDICATOR */}
                    <Text style={styles.loadingText}>CONNECTING...</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    video: {
        flex: 1,
    },
    loading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#020617', 
        overflow: 'hidden',
    },
    // 🔥 DESIGN: SECURE AMBIENT SHIMMER ORBS - MADE BIGGER & MORE PREMIUM
    shimmerOrb: { 
        position: 'absolute', 
        width: 250, 
        height: 250, 
        borderRadius: 125, 
        opacity: 0.20, 
        // filter: 'blur(40px)' // Note: Standard React Native doesn't support 'filter' on View; usually handled via BlurView or SVG
    },
    // 🔥 SATTI FIX: NEW MASS STYLES FOR RADAR PULSE & TEXT
    radarContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 25,
    },
    pulseRing: {
        position: 'absolute',
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 2,
        borderColor: '#00F2FE',
    },
    centerOrb: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: 'rgba(0, 242, 254, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#00F2FE',
        shadowColor: '#00F2FE',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 15,
        elevation: 10,
    },
    loadingText: {
        color: '#00F2FE',
        fontSize: 13,
        fontWeight: '900',
        letterSpacing: 4,
        textShadowColor: '#00F2FE',
        textShadowOffset: { width: 0, height: 0 },
        textShadowRadius: 8,
        marginTop: 10,
    }
});