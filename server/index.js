import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { randomInt } from 'node:crypto';
import { applyMove, publicRoom } from './game.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_ORIGIN || true, methods: ['GET', 'POST'] },
  pingInterval: 25000, pingTimeout: 20000
});
const rooms = new Map();
const socketRooms = new Map();
const PORT = Number(process.env.PORT) || 3001;
const clientDist = resolve(__dirname, '../client/dist');

app.get('/health', (_req, res) => res.json({ ok: true, rooms: rooms.size }));
app.use(express.static(clientDist));
app.get('*', (_req, res, next) => {
  res.sendFile(resolve(clientDist, 'index.html'), err => { if (err) next(); });
});

function cleanName(value) {
  return String(value || 'Player').replace(/[<>\u0000-\u001f]/g, '').trim().slice(0, 20) || 'Player';
}
function cleanCode(value) { return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); }
function createCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do { code = Array.from({ length: 6 }, () => chars[randomInt(chars.length)]).join(''); } while (rooms.has(code));
  return code;
}
function sendRoom(room) { io.to(room.code).emit('room:update', publicRoom(room)); }
function createRoom(socket, name) {
  const code = createCode();
  const room = { code, players: [{ id: socket.id, name: cleanName(name), mark: 'X' }], board: Array(9).fill(null), status: 'waiting', currentTurn: 'X', winner: null, winningLine: [] };
  rooms.set(code, room); socket.join(code); socketRooms.set(socket.id, code);
  socket.emit('room:created', { code }); sendRoom(room);
}
function joinRoom(socket, name, rawCode) {
  const code = cleanCode(rawCode);
  const room = rooms.get(code);
  if (!room) return socket.emit('game:error', 'We could not find that room. Check the code and try again.');
  if (room.players.some(p => p.id === socket.id)) { sendRoom(room); return; }
  if (room.players.length >= 2) return socket.emit('game:error', 'This room is full. Ask your friend to create a new room.');
  if (room.status !== 'waiting') return socket.emit('game:error', 'This game has already started. Create a new room to play.');
  room.players.push({ id: socket.id, name: cleanName(name), mark: 'O' });
  room.status = 'playing'; socket.join(code); socketRooms.set(socket.id, code);
  sendRoom(room); io.to(code).emit('game:notice', 'Both players are here. Let the game begin!');
}
function leaveRoom(socket, explicit = false) {
  const code = socketRooms.get(socket.id);
  if (!code) return;
  const room = rooms.get(code);
  socketRooms.delete(socket.id); socket.leave(code);
  if (!room) return;
  room.players = room.players.filter(p => p.id !== socket.id);
  if (room.players.length === 0 || explicit) {
    // A game with a departed player is reset to a waiting room only if the remaining player stays.
    if (room.players.length === 0) rooms.delete(code);
    else {
      room.board = Array(9).fill(null); room.status = 'waiting'; room.currentTurn = 'X'; room.winner = null; room.winningLine = [];
      room.players = room.players.map(p => ({ ...p, mark: 'X' }));
      io.to(code).emit('game:notice', 'Your opponent left. Waiting for another player to join.'); sendRoom(room);
    }
    return;
  }
  room.board = Array(9).fill(null); room.status = 'waiting'; room.currentTurn = 'X'; room.winner = null; room.winningLine = [];
  room.players = room.players.map(p => ({ ...p, mark: 'X' }));
  io.to(code).emit('game:notice', 'Your opponent disconnected. The room is open for them to rejoin or for a new friend.'); sendRoom(room);
}

io.on('connection', socket => {
  socket.on('room:create', ({ name } = {}) => {
    if (socketRooms.has(socket.id)) leaveRoom(socket, true);
    createRoom(socket, name);
  });
  socket.on('room:join', ({ name, code } = {}) => {
    if (socketRooms.has(socket.id)) leaveRoom(socket, true);
    joinRoom(socket, name, code);
  });
  socket.on('game:move', ({ code: rawCode, index } = {}) => {
    const code = cleanCode(rawCode);
    if (socketRooms.get(socket.id) !== code) return socket.emit('game:error', 'Join this room before making a move.');
    const room = rooms.get(code);
    const result = applyMove(room, socket.id, index);
    if (result.error) return socket.emit('game:error', result.error);
    sendRoom(room);
  });
  socket.on('game:rematch', ({ code: rawCode } = {}) => {
    const code = cleanCode(rawCode); const room = rooms.get(code);
    if (!room || socketRooms.get(socket.id) !== code) return socket.emit('game:error', 'You are not in this game.');
    if (room.status !== 'finished') return socket.emit('game:error', 'Finish the current game before starting a rematch.');
    room.board = Array(9).fill(null); room.status = room.players.length === 2 ? 'playing' : 'waiting'; room.currentTurn = 'X'; room.winner = null; room.winningLine = [];
    sendRoom(room); io.to(code).emit('game:notice', 'New round! Player X starts.');
  });
  socket.on('room:leave', () => leaveRoom(socket, true));
  socket.on('disconnect', () => leaveRoom(socket));
});

httpServer.listen(PORT, '0.0.0.0', () => console.log(`Namo Arena server listening on port ${PORT}`));
