import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ✅ Added lowBalanceAlert to interface for real-time expert warning
interface GameOverlayProps {
  isVisible: boolean;
  gameType?: string; 
  board: any[];
  isXNext: boolean;
  winner: string | null;
  expertName?: string; 
  lowBalanceAlert?: boolean; // New prop for balance sync
  onClose: () => void;
  onSquareClick: (index: number) => void;
  onReset: () => void;
}

export default function GameOverlay({
  isVisible,
  gameType,
  board,
  isXNext,
  winner,
  expertName,
  lowBalanceAlert, // Destructured here
  onClose,
  onSquareClick,
  onReset
}: GameOverlayProps) {
  if (!isVisible) return null;

  return (
    <View style={styles.gameOverlay}>
      <BlurView intensity={95} tint="dark" style={styles.gameContainer}>
        
        {/* 🔥 NEW: EXPERT ALERT SECTION (Only shows when balance is low) */}
        {lowBalanceAlert && (
          <View style={styles.alertBar}>
            <Ionicons name="warning" size={16} color="#FFF" style={{marginRight: 8}} />
            <Text style={styles.alertText}>USER BALANCE LOW - CALL ENDING SOON</Text>
          </View>
        )}

        {/* Header Section */}
        <View style={styles.gameHeader}>
          <View>
            <Text style={styles.gameTitle}>Tic Tac Toe</Text>
            {gameType === 'tictactoe' && (
              <Text style={styles.gameSubTitle}>Classic Match</Text>
            )}
          </View>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
            <Ionicons name="close-circle" size={32} color="rgba(255,255,255,0.5)" />
          </TouchableOpacity>
        </View>

        <View style={{ alignItems: 'center' }}>
          {/* Status Badge - Shows Winner or Next Turn */}
          <View style={[styles.statusBadge, winner ? styles.winnerBadge : null]}>
             <Text style={[styles.turnText, winner ? styles.winnerLabel : null]}>
               {winner 
                 ? `🎉 Winner: ${winner === 'X' ? 'You' : (expertName || 'Expert')}` 
                 : `Next Turn: ${isXNext ? 'Your Move (X)' : 'Waiting (O)'}`
               }
             </Text>
          </View>
          
          {/* 3x3 Game Board */}
          <View style={styles.board}>
            {board && board.map((square, i) => (
              <TouchableOpacity 
                key={i} 
                activeOpacity={0.6}
                style={[
                    styles.square, 
                    square && styles.activeSquare,
                    square === 'X' ? styles.squareX : square === 'O' ? styles.squareO : null
                ]} 
                onPress={() => onSquareClick(i)}
              >
                <Text style={[styles.squareText, { color: square === 'X' ? '#3B82F6' : '#EF4444' }]}>
                  {square}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.footerActions}>
            <TouchableOpacity style={styles.resetBtn} onPress={onReset} activeOpacity={0.8}>
                <Ionicons name="refresh" size={18} color="#3B82F6" style={{marginRight: 8}} />
                <Text style={styles.resetBtnText}>Restart Match</Text>
            </TouchableOpacity>
        </View>

      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  gameOverlay: { 
    ...StyleSheet.absoluteFillObject, 
    zIndex: 999, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0,0,0,0.7)' 
  },
  gameContainer: { 
    width: '88%', 
    padding: 25, 
    borderRadius: 35, 
    alignItems: 'center', 
    overflow: 'hidden', 
    borderWidth: 1.5, 
    borderColor: 'rgba(59, 130, 246, 0.3)',
    backgroundColor: 'rgba(15, 23, 42, 0.8)'
  },
  // 🔥 STYLE FOR ALERT BAR
  alertBar: {
    backgroundColor: '#EF4444',
    width: '115%', // To cover the container padding
    marginTop: -25, // Align to top
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
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginTop: 2
  },
  statusBadge: { 
    backgroundColor: 'rgba(59, 130, 246, 0.12)', 
    paddingHorizontal: 20, 
    paddingVertical: 10, 
    borderRadius: 20, 
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.2)'
  },
  winnerBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: '#22C55E',
  },
  turnText: { 
    color: '#3B82F6', 
    fontSize: 15, 
    fontWeight: '800' 
  },
  winnerLabel: {
    color: '#22C55E'
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
    borderRadius: 18, 
    justifyContent: 'center', 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(255,255,255,0.08)' 
  },
  activeSquare: { 
    backgroundColor: 'rgba(255,255,255,0.07)', 
    borderColor: 'rgba(255,255,255,0.15)' 
  },
  squareX: {
    borderColor: 'rgba(59, 130, 246, 0.3)',
  },
  squareO: {
    borderColor: 'rgba(239, 68, 68, 0.3)',
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
    backgroundColor: 'rgba(59, 130, 246, 0.15)', 
    paddingHorizontal: 25, 
    paddingVertical: 12, 
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)'
  },
  resetBtnText: { 
    color: '#3B82F6', 
    fontWeight: '800', 
    fontSize: 15 
  },
});