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
