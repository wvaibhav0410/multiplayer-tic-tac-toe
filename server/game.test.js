import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMove, getWinner } from './game.js';

function room() {
  return { code: 'ABC123', players: [{ id: 'x', name: 'Namo', mark: 'X' }, { id: 'o', name: 'Sam', mark: 'O' }], board: Array(9).fill(null), status: 'playing', currentTurn: 'X', winner: null, winningLine: [] };
}
test('detects horizontal, vertical and diagonal wins', () => {
  assert.deepEqual(getWinner(['X','X','X',null,null,null,null,null,null]).winningLine, [0,1,2]);
  assert.equal(getWinner(['O',null,null,'O',null,null,'O',null,null]).winner, 'O');
  assert.deepEqual(getWinner(['X',null,null,null,'X',null,null,null,'X']).winningLine, [0,4,8]);
});
test('accepts a legal move and alternates turns', () => {
  const game = room(); assert.equal(applyMove(game, 'x', 0).room.board[0], 'X'); assert.equal(game.currentTurn, 'O');
});
test('rejects wrong-turn, occupied and invalid moves', () => {
  const game = room();
  assert.ok(applyMove(game, 'o', 0).error);
  applyMove(game, 'x', 0);
  assert.ok(applyMove(game, 'o', 0).error);
  assert.ok(applyMove(game, 'o', 12).error);
});
test('ends a game on a win and blocks subsequent moves', () => {
  const game = room();
  for (const [id, index] of [['x',0],['o',3],['x',1],['o',4],['x',2]]) applyMove(game, id, index);
  assert.equal(game.status, 'finished'); assert.equal(game.winner, 'X');
  assert.ok(applyMove(game, 'o', 5).error);
});
test('detects a draw when the board fills without a winner', () => {
  const game = room();
  for (const [id, index] of [['x',0],['o',1],['x',2],['o',4],['x',3],['o',5],['x',7],['o',6],['x',8]]) applyMove(game, id, index);
  assert.equal(game.status, 'finished'); assert.equal(game.winner, null);
});
