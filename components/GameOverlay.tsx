import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import LottieView from 'lottie-react-native'; // 🔥 SATTI FIX: Added Lottie Import for Screen Blast
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ✅ Added expertBeans to calculate dynamic theme + lowBalanceAlert for real-time expert warning
interface GameOverlayProps {
  isVisible: boolean;
  gameType?: string; 
  board: any[];
  isXNext: boolean;
  winner: string | null;
  expertName?: string; 
  expertBeans?: number; // 🔥 ADDED FOR DYNAMIC THEME
  lowBalanceAlert?: boolean; 
  localRole?: 'X' | 'O' | null; // 🔥 SATTI FIX: Added local role to block opposite player clicks
  onClose: () => void;
  onSquareClick: (index: number) => void;
  onReset: (randomStartIsX?: boolean) => void;
}

// 🔥 ACCURATE THEME & LEVEL CONFIG (LOCKED DEEP-GLOW COLORS)
const getLevelConfig = (beans: number) => {
    if (beans >= 100000000) return { lvl: 10, label: 'LEGEND L10', colors: ['#ff0404', '#F59E0B', '#df03ee'] as const, glow: '#F59E0B' };
    if (beans >= 50000000) return { lvl: 9, label: 'MYTHIC L9', colors: ['#f40691', '#dbc0c0', '#0a0303'] as const, glow: '#EC4899' };
    if (beans >= 30000000) return { lvl: 8, label: 'ELITE L8', colors: ['#660aee', '#d4cfdf', '#d40808'] as const, glow: '#8B5CF6' };
    if (beans >= 10000000) return { lvl: 7, label: 'MASTER L7', colors: ['#0af635', '#ca0bf5', '#fd068a'] as const, glow: '#3B82F6' };
    if (beans >= 5000000)  return { lvl: 6, label: 'DIAMOND L6', colors: ['#f70606', '#fdec05', '#fad906'] as const, glow: '#06B6D4' };
    if (beans >= 3000000)  return { lvl: 5, label: 'PLATINUM L5', colors: ['#136a3e', '#10B981', '#f6085b'] as const, glow: '#10B981' };
    if (beans >= 1000000)  return { lvl: 4, label: 'GOLD L4', colors: ['#ffd001', '#EAB308', '#1d00f9'] as const, glow: '#EAB308' };
    if (beans >= 300000)   return { lvl: 3, label: 'SILVER L3', colors: ['#bababa', '#74706f', '#bc0e08'] as const, glow: '#94A3B8' };
    if (beans >= 100000)   return { lvl: 2, label: 'BRONZE L2', colors: ['#ff8604', '#f29d0a', '#1505fc'] as const, glow: 'transparent' };
    if (beans >= 30000)    return { lvl: 1, label: 'ROOKIE L1', colors: ['#03ffc8', '#13feea', '#f64a06'] as const, glow: 'transparent' };
    return { lvl: 0, label: 'BEGINNER L0', colors: ['#f807cf', '#f607e2', '#2a06f5'] as const, glow: 'transparent' };
};

export default function GameOverlay({
  isVisible,
  gameType,
  board,
  isXNext,
  winner,
  expertName,
  expertBeans = 0, 
  lowBalanceAlert, 
  localRole, 
  onClose,
  onSquareClick,
  onReset
}: GameOverlayProps) {
  
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const [isWaiting, setIsWaiting] = useState(false); 
  
  // 🔥 SATTI FIX: AUTO-DETECT DEVICE ROLE TO PREVENT DOUBLE PLAY 🔥
  const [myDeviceRole, setMyDeviceRole] = useState<'X' | 'O' | null>(null);

  // 🔥 DYNAMIC THEME CALCULATION
  const config = getLevelConfig(expertBeans);
  const theme = {
      primary: config.colors[0],
      secondary: config.colors[2],
      accent: config.glow !== 'transparent' ? config.glow : config.colors[0],
  };

  useEffect(() => {
      if (isVisible) {
          Animated.loop(
            Animated.timing(shimmerAnim, {
              toValue: 1,
              duration: 4000,
              easing: Easing.inOut(Easing.sin),
              useNativeDriver: true
            })
          ).start();
      } else {
          shimmerAnim.stopAnimation();
      }
  }, [isVisible]);

  // Unlock board when network updates
  useEffect(() => {
      setIsWaiting(false);
  }, [board, isXNext]);

  // Clear auto-detected role when game is fully reset
  useEffect(() => {
      const isBoardEmpty = board.every(square => square === null);
      if (isBoardEmpty) {
          setMyDeviceRole(null);
          setIsWaiting(false);
      }
  }, [board]);

  // 🔥 SATTI FIX: STRICT TURN VALIDATION 🔥
  const handleSquareClick = (index: number) => {
      if (board[index] || winner || isWaiting) return;

      const expectedRoleForThisClick = isXNext ? 'X' : 'O';

      // 1. If Parent passed a strict localRole, use it
      if (localRole) {
          if (localRole !== expectedRoleForThisClick) {
              Alert.alert("Wait for turn! ⏳", "It is currently the other participant's move.");
              return;
          }
      } 
      // 2. If no localRole, auto-lock this device to the first role it plays!
      else {
          if (!myDeviceRole) {
              setMyDeviceRole(expectedRoleForThisClick); // Lock device to X or O
          } else if (myDeviceRole !== expectedRoleForThisClick) {
              Alert.alert("Wait for turn! ⏳", "It is currently the other participant's move.");
              return;
          }
      }

      setIsWaiting(true); // Lock locally until network updates
      onSquareClick(index);
  };

  if (!isVisible) return null;

  const orbTranslateY = shimmerAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -30]
  });

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

  // 🔥 SATTI FIX: DYNAMIC ROLE CHECK FOR WINNER TEXT
  const actualLocalRole = localRole || myDeviceRole;

  return (
    <View style={styles.gameOverlay}>
      
      {/* 🔥 SHIMMER ORBS FOR AMBIENT GLOW */}
      <Animated.View style={[styles.shimmerOrb, { top: '20%', right: -50, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
      <Animated.View style={[styles.shimmerOrb, { bottom: '20%', left: -50, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

      {/* 🔥 ZERO-BOX FLUID CONTAINER WITH DUAL TONE BORDER */}
      <BlurView intensity={95} tint="dark" style={[styles.gameContainer, borderType1]}>
        
        {/* ALERT SECTION (Only shows when balance is low) */}
        {lowBalanceAlert && (
          <View style={styles.alertBar}>
            <Ionicons name="warning" size={16} color="#FFF" style={{marginRight: 8}} />
            <Text style={styles.alertText}>SESSION ENDING SOON - INSUFFICIENT DIAMONDS</Text>
          </View>
        )}

        {/* Header Section */}
        <View style={styles.gameHeader}>
          <View>
            <Text style={styles.gameTitle}>Tic Tac Toe</Text>
            {gameType === 'tictactoe' && (
              <Text style={[styles.gameSubTitle, { color: theme.primary }]}>Interactive Skill Discover</Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center' }}>
          {/* 🔥 DYNAMIC Status Badge - Shows Result or Next Action */}
          <View style={[
              styles.statusBadge, 
              { backgroundColor: winner ? theme.primary + '25' : theme.secondary + '20', borderColor: winner ? theme.primary + '50' : theme.secondary + '40' }
          ]}>
             {/* 🔥 SATTI FIX: ACCURATE RESULT DISPLAY 🔥 */}
             <Text style={[styles.turnText, { color: winner ? theme.primary : theme.secondary }]}>
               {winner 
                 ? `🎉 Result: ${winner === actualLocalRole ? 'You Win! 🏆' : (expertName || 'Opponent Wins')}` 
                 : `Action: ${isXNext ? 'X Turn' : 'O Turn'}`
               }
             </Text>
          </View>
          
          {/* 3x3 Interaction Board */}
          <View style={styles.board}>
            {board && board.map((square, i) => (
              <TouchableOpacity 
                key={i} 
                activeOpacity={0.6}
                style={[
                    styles.square, 
                    square && styles.activeSquare,
                    square === 'X' ? { borderColor: theme.primary + '60', backgroundColor: theme.primary + '10' } 
                    : square === 'O' ? { borderColor: theme.secondary + '60', backgroundColor: theme.secondary + '10' } : null
                ]} 
                onPress={() => handleSquareClick(i)} 
              >
                {/* 🔥 DYNAMIC COLORS */}
                <Text style={[styles.squareText, { color: square === 'X' ? theme.primary : square === 'O' ? theme.secondary : 'transparent' }]}>
                  {square}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.footerActions}>
            <TouchableOpacity style={[styles.resetBtn, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40' }]} onPress={() => onReset(Math.random() < 0.5)} activeOpacity={0.8}>
                <Ionicons name="refresh" size={18} color={theme.primary} style={{marginRight: 8}} />
                <Text style={[styles.resetBtnText, { color: theme.primary }]}>Restart Activity</Text>
            </TouchableOpacity>
        </View>

      </BlurView>

      {/* 🔥 SATTI FIX: FIREWORKS SCREEN BLAST ANIMATION 🔥 */}
      {winner && (
          <View style={[StyleSheet.absoluteFillObject, { zIndex: 1000, elevation: 1000 }]} pointerEvents="none">
              <LottieView
                  source={require('../assets/images/fireworks.json')}
                  autoPlay
                  loop={false}
                  style={StyleSheet.absoluteFillObject}
                  resizeMode="cover"
              />
          </View>
      )}
      
    </View>
  );
}

const styles = StyleSheet.create({
  gameOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    zIndex: 999, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(2, 6, 23, 0.85)' 
  },
  shimmerOrb: { 
    position: 'absolute', 
    width: 250, 
    height: 250, 
    borderRadius: 125, 
    opacity: 0.25, 
    filter: 'blur(60px)',
    zIndex: -1
  },
  gameContainer: { 
    width: '88%', 
    padding: 25, 
    borderRadius: 40, 
    alignItems: 'center', 
    overflow: 'hidden', 
  },
  alertBar: {
    backgroundColor: '#EF4444',
    width: '115%', 
    marginTop: -25, 
    marginBottom: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5
  },
  gameHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '100%', 
    marginBottom: 25, 
    alignItems: 'center' 
  },
  gameTitle: { 
    color: '#FFF', 
    fontSize: 22, 
    fontWeight: '900', 
    letterSpacing: 0.5 
  },
  gameSubTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2
  },
  statusBadge: { 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 20, 
    marginBottom: 25,
    borderWidth: 1,
  },
  turnText: { 
    fontSize: 15, 
    fontWeight: '800' 
  },
  board: { 
    width: 255, 
    height: 255, 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'center',
    alignItems: 'center'
  },
  square: { 
    width: 78, 
    height: 78, 
    backgroundColor: 'rgba(255,255,255,0.03)', 
    margin: 3, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)' 
  },
  activeSquare: { 
    borderWidth: 2,
  },
  squareText: { 
    fontSize: 36, 
    fontWeight: '900',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowRadius: 10
  },
  footerActions: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10
  },
  resetBtn: { 
    marginTop: 20, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 25, 
    paddingVertical: 12, 
    borderRadius: 20, 
    borderWidth: 1,
  },
  resetBtnText: { 
    fontWeight: '800', 
    fontSize: 15 
  },
});