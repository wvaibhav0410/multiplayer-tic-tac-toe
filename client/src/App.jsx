import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || window.location.origin;
const newSocket = () => io(SERVER_URL, { autoConnect: false, transports: ['websocket', 'polling'] });

function getRoomFromUrl() {
  return new URLSearchParams(window.location.search).get('room')?.toUpperCase() || '';
}

export default function App() {
  const [socket] = useState(newSocket);
  const [connected, setConnected] = useState(false);
  const [name, setName] = useState('');
  const [roomInput, setRoomInput] = useState(getRoomFromUrl());
  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    socket.connect();
    socket.on('connect', () => { setConnected(true); setNotice(''); });
    socket.on('disconnect', () => { setConnected(false); setNotice('Connection lost. Reconnecting…'); });
    socket.on('room:update', (data) => { setRoom(data); setPlayerId(socket.id); setBusy(false); });
    socket.on('room:created', ({ code }) => {
      setRoomInput(code);
      const url = new URL(window.location.href); url.searchParams.set('room', code); window.history.replaceState({}, '', url);
    });
    socket.on('game:error', (message) => { setNotice(message); setBusy(false); });
    socket.on('game:notice', setNotice);
    return () => { socket.removeAllListeners(); socket.disconnect(); };
  }, [socket]);

  const me = room?.players?.find(p => p.id === playerId);
  const opponent = room?.players?.find(p => p.id !== playerId);
  const isMyTurn = room?.status === 'playing' && room.currentTurn === me?.mark;
  const winningLine = useMemo(() => room?.winningLine || [], [room]);

  function joinRoom(event) {
    event.preventDefault();
    if (!connected) { setNotice('Connecting to the game server…'); return; }
    setBusy(true); setNotice('');
    socket.emit('room:join', { name: name.trim() || 'Player', code: roomInput.trim().toUpperCase() });
  }
  function createRoom() {
    if (!connected) { setNotice('Connecting to the game server…'); return; }
    setBusy(true); setNotice('');
    socket.emit('room:create', { name: name.trim() || 'Player' });
  }
  function makeMove(index) {
    if (!room || room.status !== 'playing' || !isMyTurn || room.board[index]) return;
    socket.emit('game:move', { code: room.code, index });
  }
  function rematch() { socket.emit('game:rematch', { code: room?.code }); }
  function leaveRoom() {
    socket.emit('room:leave', { code: room?.code });
    setRoom(null); setNotice('');
    const url = new URL(window.location.href); url.searchParams.delete('room'); window.history.replaceState({}, '', url);
  }
  async function shareRoom() {
    const link = `${window.location.origin}${window.location.pathname}?room=${room.code}`;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setNotice(`Share this invite link: ${link}`); }
  }
  async function copyRoomCode() {
    try { await navigator.clipboard.writeText(room.code); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 1800); }
    catch { setNotice(`Room code: ${room.code}`); }
  }
  const statusText = !room ? '' : room.status === 'waiting'
    ? 'Waiting for a friend to join…'
    : room.status === 'finished'
      ? room.winner ? `${room.players.find(p => p.mark === room.winner)?.name || room.winner} wins!` : 'It’s a draw!'
      : isMyTurn ? 'Your turn — make a move'
        : room.currentTurn === 'X' && room.board.every(mark => !mark)
          ? 'Waiting for X to make the first move…'
          : `${opponent?.name || 'Opponent'} is thinking…`;

  return <main className="page-shell">
    <header className="topbar"><a className="brand" href={window.location.pathname} onClick={e => { if (room) { e.preventDefault(); leaveRoom(); } }}><span className="brand-icon">✳</span> NAMO <span>ARENA</span></a><div className="connection"><span className={`status-dot ${connected ? 'online' : ''}`}/>{connected ? 'Live server' : 'Connecting…'}</div></header>
    <section className="hero"><div className="eyebrow"><span className="eyebrow-line"/> THE CLASSIC, CONNECTED <span className="eyebrow-line"/></div><h1>Small board.<br/><span>Big rivalry.</span></h1><p className="subtitle">Challenge a friend to a live game of Tic-Tac-Toe, wherever they are.</p></section>

    {!room ? <section className="lobby panel">
      <div className="panel-heading"><div><p className="section-kicker">READY PLAYER ONE?</p><h2>Enter the arena</h2></div><span className="mini-symbol">NA<span>MO</span></span></div>
      <form onSubmit={joinRoom} className="lobby-form">
        <label htmlFor="player-name">YOUR DISPLAY NAME</label><input id="player-name" maxLength="20" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Namo" autoComplete="nickname" />
        <button type="button" className="primary-button create-button" onClick={createRoom} disabled={busy || !connected}>{busy ? 'One moment…' : '＋  Create a new game'}<span>→</span></button>
        <div className="separator"><span/> OR JOIN A FRIEND <span/></div>
        <label htmlFor="room-code">ROOM CODE</label><input id="room-code" value={roomInput} onChange={e => setRoomInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))} placeholder="ENTER 6-LETTER CODE" maxLength="6" autoCapitalize="characters" />
        <button className="secondary-button" type="submit" disabled={busy || !connected || roomInput.trim().length < 4}>Join game <span>↗</span></button>
      </form>
      {notice && <p className="notice" role="status">{notice}</p>}
      <div className="rules-strip"><span>✦</span><div><strong>Quick rules</strong><p>Get three of your marks in a row — across, down, or diagonal — before your opponent does.</p></div></div>
    </section> : <section className="game-layout">
      <div className="game-panel panel">
        <div className="room-bar"><div><p className="section-kicker">ROOM CODE</p><button className="room-code" onClick={copyRoomCode} title="Copy room code" aria-label={copiedCode ? 'Room code copied' : 'Copy room code'}>{copiedCode ? '✓ Copied!' : <>{room.code} <span>▣</span></>}</button></div><button className="share-button" onClick={shareRoom}>{copied ? '✓ Copied!' : '↗ Invite friend'}</button></div>
        <div className="players-row"><div className={`player-card ${me?.mark === 'X' && isMyTurn ? 'active' : ''}`}><span className="player-mark x-mark">X</span><div><strong>{room.players.find(p => p.mark === 'X')?.name || 'Waiting…'}</strong><small>PLAYER X {room.players.find(p => p.id === playerId && p.mark === 'X') ? '· YOU' : ''}</small></div></div><div className="vs">VS</div><div className={`player-card right-player ${me?.mark === 'O' && isMyTurn ? 'active' : ''}`}><span className="player-mark o-mark">O</span><div><strong>{room.players.find(p => p.mark === 'O')?.name || 'Waiting…'}</strong><small>PLAYER O {room.players.find(p => p.id === playerId && p.mark === 'O') ? '· YOU' : ''}</small></div></div></div>
        <div className={`turn-banner ${room.status === 'finished' ? 'finished' : ''}`}><span className="turn-pulse"/>{statusText}</div>
        <div className="board" role="group" aria-label="Tic-Tac-Toe board">{room.board.map((mark, i) => <button key={i} className={`cell ${mark === 'X' ? 'cell-x' : mark === 'O' ? 'cell-o' : ''} ${winningLine.includes(i) ? 'winning-cell' : ''}`} onClick={() => makeMove(i)} disabled={!isMyTurn || !!mark || room.status !== 'playing'} aria-label={`Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}${mark ? `, ${mark}` : ', empty'}`}>{mark && <span>{mark}</span>}</button>)}</div>
        {room.status === 'finished' ? <button className="primary-button rematch-button" onClick={rematch}>↻ Play again</button> : <p className="board-hint">{room.status === 'waiting' ? 'Your game link is ready to share.' : 'Take your time. Your opponent sees every move live.'}</p>}
        {notice && <p className="notice" role="status">{notice}</p>}
        <button className="leave-button" onClick={leaveRoom}>← Leave game</button>
      </div>
      <aside className="side-panel"><div className="side-card panel"><span className="side-icon">♟</span><p className="section-kicker">THE OBJECTIVE</p><h3>Three in a row.</h3><p>Line up three of your marks horizontally, vertically, or diagonally to win.</p><div className="example-board"><span className="ex-x">X</span><span className="ex-x">X</span><span className="ex-x">X</span><span/><span className="ex-o">O</span><span/><span className="ex-o">O</span><span/><span/></div><small className="example-caption">Like this. Simple.</small></div><div className="side-card tip-card"><span>✦</span><div><strong>Good strategy?</strong><p>Claim the center, watch for forks, and block your opponent’s winning line.</p></div></div></aside>
    </section>}
    <footer><span>NAMO ARENA</span><span>MADE FOR FRIENDLY COMPETITION</span><span>1 BOARD · 2 PLAYERS · INFINITE REMATCHES</span></footer>
  </main>;
}
