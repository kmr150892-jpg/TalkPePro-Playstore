import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient'; // 🔥 ADDED FOR DEEP GLOW
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated, // 🔥 ADDED FOR ORB ANIMATION
    Easing, // 🔥 ADDED FOR ORB ANIMATION
    StyleSheet,
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
                    <LinearGradient colors={['#020617', '#1E1B4B', '#020617']} style={StyleSheet.absoluteFill} />
                    <Animated.View style={[styles.shimmerOrb, { top: -20, right: -20, backgroundColor: '#6366F1', transform: [{ translateY: orbTranslateY }] }]} />
                    <Animated.View style={[styles.shimmerOrb, { bottom: -20, left: -20, backgroundColor: '#EC4899', transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />
                    
                    <ActivityIndicator color="#6366F1" size="large" />
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
    // 🔥 DESIGN: SECURE AMBIENT SHIMMER ORBS
    shimmerOrb: { 
        position: 'absolute', 
        width: 150, 
        height: 150, 
        borderRadius: 75, 
        opacity: 0.25, 
        // filter: 'blur(40px)' // Note: Standard React Native doesn't support 'filter' on View; usually handled via BlurView or SVG
    }
});