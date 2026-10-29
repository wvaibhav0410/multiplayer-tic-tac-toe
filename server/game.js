export const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
];

export function getWinner(board) {
  for (const line of WINNING_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], winningLine: line };
    }
  }
  return null;
}

export function chooseComputerMove(board, computerMark = 'O') {
  if (!Array.isArray(board) || board.length !== 9 || !['X', 'O'].includes(computerMark)) return null;
  if (board.some(mark => mark !== null && mark !== 'X' && mark !== 'O')) return null;

  const opponentMark = computerMark === 'X' ? 'O' : 'X';
  let bestMove = null;
  let bestScore = -Infinity;

  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== null) continue;
    board[index] = computerMark;
    const score = minimax(board, opponentMark, computerMark, 1);
    board[index] = null;

    if (score > bestScore) {
      bestScore = score;
      bestMove = index;
    }
  }
  return bestMove;
}

function minimax(board, currentMark, computerMark, depth) {
  const result = getWinner(board);
  if (result) return result.winner === computerMark ? 10 - depth : depth - 10;
  if (board.every(Boolean)) return 0;

  const maximizing = currentMark === computerMark;
  let bestScore = maximizing ? -Infinity : Infinity;
  const nextMark = currentMark === 'X' ? 'O' : 'X';

  for (let index = 0; index < board.length; index += 1) {
    if (board[index] !== null) continue;
    board[index] = currentMark;
    const score = minimax(board, nextMark, computerMark, depth + 1);
    board[index] = null;
    bestScore = maximizing ? Math.max(bestScore, score) : Math.min(bestScore, score);
  }
  return bestScore;
}

export function applyMove(room, playerId, index) {
  if (!room || room.status !== 'playing') return { error: 'This game is not accepting moves.' };
  if (!Number.isInteger(index) || index < 0 || index > 8) return { error: 'Choose a valid square.' };
  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: 'You are not a player in this room.' };
  if (room.currentTurn !== player.mark) return { error: 'It is not your turn yet.' };
  if (room.board[index]) return { error: 'That square is already taken.' };

  room.board[index] = player.mark;
  const result = getWinner(room.board);
  if (result) {
    room.status = 'finished'; room.winner = result.winner; room.winningLine = result.winningLine;
  } else if (room.board.every(Boolean)) {
    room.status = 'finished'; room.winner = null; room.winningLine = [];
  } else {
    room.currentTurn = player.mark === 'X' ? 'O' : 'X';
  }
  return { room };
}

export function publicRoom(room) {
  return {
    code: room.code,
    players: room.players.map(({ id, name, mark }) => ({ id, name, mark })),
    board: [...room.board], status: room.status, currentTurn: room.currentTurn,
    winner: room.winner, winningLine: [...room.winningLine]
  };
}
