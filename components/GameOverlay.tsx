import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import LottieView from 'lottie-react-native'; // 🔥 SATTI FIX: Added Lottie Import for Screen Blast
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Easing, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  // 👑 NEW (all optional, so your existing parent keeps working without any change)
  xPhoto?: string | null; // profile photo shown instead of the "X" mark
  oPhoto?: string | null; // profile photo shown instead of the "O" mark
  xName?: string;         // name shown for the X player
  oName?: string;         // name shown for the O player
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

const GOLD = '#FFD66B';

// 🏆 All 8 winning lines (used only to light up the winning cells)
const WIN_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

// 👑 One player's mark: profile photo if available, otherwise a Crown (X) or a Diamond (O)
const PlayerMark = ({ role, photo, size, theme }: { role: 'X' | 'O'; photo?: string | null; size: number; theme: any }) => {
  const [failed, setFailed] = useState(false);
  const ringColors = role === 'X' ? [GOLD, theme.primary] : [theme.accent, theme.secondary];
  const inner = size - 6;

  return (
    <LinearGradient
      colors={ringColors as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center' }}
    >
      <View style={{ width: inner, height: inner, borderRadius: inner / 2, overflow: 'hidden', backgroundColor: '#0B1020', alignItems: 'center', justifyContent: 'center' }}>
        {photo && !failed ? (
          <Image source={{ uri: photo }} style={{ width: inner, height: inner }} onError={() => setFailed(true)} />
        ) : (
          <MaterialCommunityIcons
            name={role === 'X' ? 'crown' : 'diamond-stone'}
            size={inner * 0.58}
            color={role === 'X' ? GOLD : theme.accent}
          />
        )}
      </View>
    </LinearGradient>
  );
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
  xPhoto,
  oPhoto,
  xName,
  oName,
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
          // Ambient glow breathes slowly (smooth back-and-forth, no jump)
          Animated.loop(
            Animated.sequence([
              Animated.timing(shimmerAnim, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
              Animated.timing(shimmerAnim, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
            ])
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

  // 🔥 SATTI FIX: DYNAMIC ROLE CHECK FOR WINNER TEXT
  const actualLocalRole = localRole || myDeviceRole;

  // 🏆 Which cells made the winning line (empty if no winner yet)
  const winningCells: number[] = (() => {
    if (!winner || !board) return [];
    for (const [a, b, c] of WIN_LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) return [a, b, c];
    }
    return [];
  })();

  // Player labels (no more plain "X" / "O" for the user to read)
  const xLabel = xName || 'Crown';
  const oLabel = oName || 'Diamond';
  const currentTurnLabel = isXNext ? xLabel : oLabel;
  const turnRole = isXNext ? 'X' : 'O';

  // Friendly turn text: "Your move" when we know which side this phone is
  const turnText = actualLocalRole
    ? (actualLocalRole === turnRole ? 'Your move' : `${currentTurnLabel}'s move`)
    : `${currentTurnLabel} to play`;

  return (
    <View style={styles.gameOverlay}>
      
      {/* 🔥 SHIMMER ORBS FOR AMBIENT GLOW */}
      <Animated.View style={[styles.shimmerOrb, { top: '20%', right: -50, backgroundColor: theme.primary, transform: [{ translateY: orbTranslateY }] }]} />
      <Animated.View style={[styles.shimmerOrb, { bottom: '20%', left: -50, backgroundColor: theme.secondary, transform: [{ translateY: Animated.multiply(orbTranslateY, -1) }] }]} />

      {/* 👑 ROYAL MULTICOLOR FRAME: theme colour → gold → theme colour */}
      <LinearGradient
        colors={[theme.primary, GOLD, theme.secondary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.frame}
      >
        <BlurView intensity={95} tint="dark" style={styles.gameContainer}>
          <View style={styles.containerTint} pointerEvents="none" />

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
                <Text style={[styles.gameSubTitle, { color: GOLD }]}>Interactive Skill Discover</Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>

          {/* 🥊 VERSUS BAR: both players, the active side glows */}
          <View style={styles.versusRow}>
            <View style={[styles.playerSide, { opacity: !winner && !isXNext ? 0.5 : 1 }]}>
              <PlayerMark role="X" photo={xPhoto} size={48} theme={theme} />
              <Text style={styles.playerName} numberOfLines={1}>{xLabel}</Text>
              {!winner && isXNext && <View style={[styles.turnDot, { backgroundColor: GOLD, shadowColor: GOLD }]} />}
            </View>

            <View style={styles.vsPill}>
              <Text style={styles.vsText}>vs</Text>
            </View>

            <View style={[styles.playerSide, { opacity: !winner && isXNext ? 0.5 : 1 }]}>
              <PlayerMark role="O" photo={oPhoto} size={48} theme={theme} />
              <Text style={styles.playerName} numberOfLines={1}>{oLabel}</Text>
              {!winner && !isXNext && <View style={[styles.turnDot, { backgroundColor: theme.accent, shadowColor: theme.accent }]} />}
            </View>
          </View>

          <View style={{ alignItems: 'center' }}>
            {/* 🔥 DYNAMIC Status Badge - Shows Result or Next Action */}
            <View style={[
                styles.statusBadge, 
                { backgroundColor: winner ? GOLD + '22' : theme.secondary + '20', borderColor: winner ? GOLD + '80' : theme.secondary + '40' }
            ]}>
               {/* 🔥 SATTI FIX: ACCURATE RESULT DISPLAY 🔥 */}
               <Text style={[styles.turnText, { color: winner ? GOLD : '#F1F5F9' }]}>
                 {winner 
                   ? `🎉 Result: ${winner === actualLocalRole ? 'You Win! 🏆' : (expertName || 'Opponent Wins')}` 
                   : turnText
                 }
               </Text>
            </View>
            
            {/* 3x3 Interaction Board */}
            <View style={styles.board}>
              {board && board.map((square, i) => {
                const isWinCell = winningCells.includes(i);
                return (
                  <TouchableOpacity 
                    key={i} 
                    activeOpacity={0.6}
                    style={[
                        styles.square, 
                        square === 'X' ? { borderColor: GOLD + '70' } 
                        : square === 'O' ? { borderColor: theme.accent + '70' } : null,
                        isWinCell && styles.winSquare
                    ]} 
                    onPress={() => handleSquareClick(i)} 
                  >
                    {square ? (
                      <>
                        <LinearGradient
                          colors={square === 'X' ? [GOLD + '30', theme.primary + '25'] : [theme.accent + '30', theme.secondary + '35']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={StyleSheet.absoluteFillObject}
                        />
                        <PlayerMark
                          role={square === 'X' ? 'X' : 'O'}
                          photo={square === 'X' ? xPhoto : oPhoto}
                          size={54}
                          theme={theme}
                        />
                      </>
                    ) : (
                      <View style={styles.emptyDot} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.footerActions}>
              <TouchableOpacity onPress={() => onReset(Math.random() < 0.5)} activeOpacity={0.85}>
                  <LinearGradient
                    colors={[theme.primary, theme.secondary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.resetBtn}
                  >
                    <Ionicons name="refresh" size={18} color="#FFF" style={{marginRight: 8}} />
                    <Text style={styles.resetBtnText}>Restart Activity</Text>
                  </LinearGradient>
              </TouchableOpacity>
          </View>

        </BlurView>
      </LinearGradient>

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
  // Gradient frame (acts as a 2px multicolor border)
  frame: {
    width: '90%',
    padding: 2,
    borderRadius: 42,
  },
  gameContainer: { 
    width: '100%', 
    paddingHorizontal: 22,
    paddingVertical: 24,
    borderRadius: 40, 
    alignItems: 'center', 
    overflow: 'hidden', 
  },
  containerTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(8, 12, 26, 0.88)',
  },
  alertBar: {
    backgroundColor: '#EF4444',
    width: '115%', 
    marginTop: -24, 
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
    marginBottom: 18, 
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
    letterSpacing: 0.6,
    marginTop: 2
  },

  // 🥊 Versus bar
  versusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 18,
    paddingHorizontal: 6,
  },
  playerSide: { alignItems: 'center', width: 96 },
  playerName: {
    color: '#F1F5F9',
    fontSize: 12.5,
    fontWeight: '700',
    marginTop: 6,
    maxWidth: 96,
    textAlign: 'center',
  },
  turnDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 5,
    shadowOpacity: 0.95,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  vsPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    marginBottom: 20,
  },
  vsText: { color: 'rgba(255,255,255,0.65)', fontSize: 12, fontWeight: '800', fontStyle: 'italic' },

  statusBadge: { 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 20, 
    marginBottom: 20,
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
    backgroundColor: 'rgba(255,255,255,0.04)', 
    margin: 3, 
    borderRadius: 22, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.10)',
    overflow: 'hidden',
  },
  winSquare: {
    borderWidth: 2,
    borderColor: GOLD,
    shadowColor: GOLD,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  emptyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
  footerActions: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10
  },
  resetBtn: { 
    marginTop: 14, 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 28, 
    paddingVertical: 13, 
    borderRadius: 22, 
  },
  resetBtnText: { 
    color: '#FFF',
    fontWeight: '800', 
    fontSize: 15 
  },
});
