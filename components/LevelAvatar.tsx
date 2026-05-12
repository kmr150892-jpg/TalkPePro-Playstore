import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';

interface LevelAvatarProps {
  image: string;
  beans: number;
  size?: number;
}

// ✅ ACCURATE THEME & LEVEL CONFIG (LOCKED DEEP-GLOW COLORS)
// Gradient ends with the starting color for a seamless 360-degree rotation
const getLevelConfig = (beans: number) => {
  // 🔥 L10 - LEGEND: 100,000,000+
  if (beans >= 100000000) return { lvl: 10, colors: ['#ff0404', '#F59E0B', '#df03ee', '#ff0404'], glow: '#F59E0B', hasCrown: true, speed: 1200, intensity: 1.18 };
  
  // 🔥 L9 - MYTHIC: 50,000,000+
  if (beans >= 50000000) return { lvl: 9, colors: ['#f40691', '#dbc0c0', '#0a0303', '#f40691'], glow: '#EC4899', hasCrown: true, speed: 1500, intensity: 1.15 };
  
  // 🔥 L8 - ELITE: 30,000,000+
  if (beans >= 30000000) return { lvl: 8, colors: ['#660aee', '#d4cfdf', '#d40808', '#660aee'], glow: '#8B5CF6', hasCrown: true, speed: 1800, intensity: 1.12 };
  
  // 🔥 L7 - MASTER: 10,000,000+
  if (beans >= 10000000) return { lvl: 7, colors: ['#0af635', '#ca0bf5', '#fd068a', '#0af635'], glow: '#3B82F6', hasCrown: false, speed: 2200, intensity: 1.10 };
  
  // 🔥 L6 - DIAMOND: 5,000,000+
  if (beans >= 5000000) return { lvl: 6, colors: ['#f70606', '#fdec05', '#fad906', '#f70606'], glow: '#06B6D4', hasCrown: false, speed: 2800, intensity: 1.08 };
  
  // 🔥 L5 - PLATINUM: 3,000,000+
  if (beans >= 3000000) return { lvl: 5, colors: ['#136a3e', '#10B981', '#f6085b', '#136a3e'], glow: '#10B981', hasCrown: false, speed: 3500, intensity: 1.06 };
  
  // 🔥 L4 - GOLD: 1,000,000+
  if (beans >= 1000000) return { lvl: 4, colors: ['#ffd001', '#EAB308', '#1d00f9', '#ffd001'], glow: '#EAB308', hasCrown: false, speed: 4000, intensity: 1.05 };
  
  // 🔥 L3 - SILVER: 300,000+
  if (beans >= 300000) return { lvl: 3, colors: ['#bababa', '#74706f', '#bc0e08', '#bababa'], glow: '#94A3B8', hasCrown: false, speed: 5000, intensity: 1.04 };
  
  // 🔥 L2 - BRONZE: 100,000+
  if (beans >= 100000) return { lvl: 2, colors: ['#ff8604', '#f29d0a', '#1505fc', '#ff8604'], glow: 'transparent', hasCrown: false, speed: 6000, intensity: 1.02 };
  
  // 🔥 L1 - ROOKIE: 30,000+
  if (beans >= 30000) return { lvl: 1, colors: ['#03ffc8', '#13feea', '#f64a06', '#03ffc8'], glow: 'transparent', hasCrown: false, speed: 7000, intensity: 1.01 };

  // 🌱 L0 - BEGINNER: 0+
  return { lvl: 0, colors: ['#f807cf', '#f607e2', '#2a06f5', '#f807cf'], glow: 'transparent', hasCrown: false, speed: 0, intensity: 1 };
};

export default function LevelAvatar({ image, beans, size = 100 }: LevelAvatarProps) {
  const config = getLevelConfig(beans);
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const auraAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (config.lvl >= 1) {
      // 🌀 Fast Precision Rotation
      Animated.loop(
        Animated.timing(rotateAnim, { toValue: 1, duration: config.speed || 5000, easing: Easing.linear, useNativeDriver: true })
      ).start();
      
      // 💓 Heartbeat Pulse
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: config.intensity, duration: 1000, useNativeDriver: true, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
        ])
      ).start();

      // ✨ Floating Aura Movement
      Animated.loop(
        Animated.sequence([
          Animated.timing(auraAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(auraAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [config.lvl]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const auraScale = auraAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.3],
  });

  const borderThickness = size * 0.15; 
  const containerSize = size + borderThickness + 40;

  return (
    <View style={[styles.container, { width: containerSize, height: containerSize }]}>
      
      {/* 🌌 LAYER 1: BEHIND GLOW AURA */}
      {config.lvl >= 3 && (
        <Animated.View style={[
          styles.extremeGlow,
          {
            width: size + 20,
            height: size + 20,
            borderRadius: (size + 20) / 2,
            backgroundColor: config.glow,
            shadowColor: config.glow,
            transform: [{ scale: auraScale }],
            opacity: auraAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] })
          }
        ]} />
      )}

      {/* 🌀 LAYER 2 & 3 MERGED: ROTATING BORDER + IMAGE (ALIGNED) */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }], justifyContent: 'center', alignItems: 'center' }}>
        
        {/* The Rotating Ring */}
        {config.lvl >= 1 && (
          <Animated.View style={{ transform: [{ rotate: spin }] }}>
            <LinearGradient
              colors={config.colors as any}
              style={[
                styles.mainBorder,
                {
                  width: size + borderThickness,
                  height: size + borderThickness,
                  borderRadius: (size + borderThickness) / 2,
                }
              ]}
            >
              <View style={[styles.depthGap, { width: size + 4, height: size + 4, borderRadius: (size + 4)/2 }]} />
            </LinearGradient>
          </Animated.View>
        )}

        {/* The Profile Image - Exactly Centered */}
        <View style={[styles.imageContainer, { width: size, height: size, borderRadius: size / 2 }]}>
          <Image 
              source={{ uri: image || 'https://ui-avatars.com/api/?name=TalkPe&background=020617&color=fff' }} 
              style={styles.fullImage} 
          />
          {config.lvl >= 7 && <View style={[styles.innerNeon, { borderRadius: size/2, borderColor: config.glow }]} />}
        </View>

        {/* 💎 LAYER 4: GLASS REFLECTION */}
        {config.lvl >= 3 && (
           <LinearGradient 
              colors={['rgba(255,255,255,0.4)', 'transparent', 'transparent']} 
              style={[styles.glassShine, { width: size, height: size, borderRadius: size / 2 }]} 
           />
        )}
      </Animated.View>

      {/* 👑 LAYER 5: FLOATING CROWN */}
      {config.hasCrown && (
        <Animated.View style={[styles.crownWrapper, { top: -size * 0.1, transform: [{ translateY: auraAnim.interpolate({ inputRange: [0, 1], outputRange: [0, -10] }) }] }]}>
          <MaterialCommunityIcons name="crown" size={size * 0.5} color="#FFD700" style={styles.crownGlow} />
          <View style={styles.crownSparkle} />
        </Animated.View>
      )}
      
    </View>
  );
}

const styles = StyleSheet.create({
  container: { justifyContent: 'center', alignItems: 'center', position: 'relative' },
  extremeGlow: {
    position: 'absolute',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 25,
    elevation: 20,
  },
  mainBorder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  depthGap: {
    backgroundColor: '#020617',
  },
  imageContainer: {
    position: 'absolute',
    backgroundColor: '#020617',
    overflow: 'hidden',
    zIndex: 5,
    justifyContent: 'center',
    alignItems: 'center'
  },
  fullImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  innerNeon: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderWidth: 1.5,
    opacity: 0.6,
  },
  glassShine: {
    position: 'absolute',
    zIndex: 6,
  },
  crownWrapper: {
    position: 'absolute',
    zIndex: 20,
    alignItems: 'center',
  },
  crownGlow: {
    textShadowColor: 'rgba(255, 215, 0, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  crownSparkle: {
    position: 'absolute',
    top: 5,
    width: 4,
    height: 4,
    backgroundColor: '#FFF',
    borderRadius: 2,
    opacity: 0.8,
  },
});