/**
 * @file gameLogic.ts
 * TalkPe Interactive Logic - Tic Tac Toe Only
 */

/**
 * Tic Tac Toe Success Verification Logic
 * @param squares Array of 9 strings (X, O, or null)
 * @returns 'X', 'O', or null
 */
export const checkWinner = (squares: (string | null)[]) => {
  if (!squares || !Array.isArray(squares)) {
    return null;
  }

  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Horizontal
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Vertical
    [0, 4, 8], [2, 4, 6],           // Diagonal
  ];

  for (let i = 0; i < lines.length; i++) {
    const [a, b, c] = lines[i];
    if (squares[a] && squares[a] === squares[b] && squares[a] === squares[c]) {
      return squares[a];
    }
  }
  
  return null;
};