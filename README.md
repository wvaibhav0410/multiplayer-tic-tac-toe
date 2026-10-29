# XO Arena — Multiplayer Tic-Tac-Toe

A responsive, real-time two-player Tic-Tac-Toe game built with React, Vite, CSS, Node.js, Express, and Socket.IO. The server is authoritative: it validates turns, moves, wins, draws, and rematches. Players can be on different devices and share a room link/code.

## Features

- Create a private six-character room code and share the invite URL.
- Two players join from separate browsers/devices; X starts, then turns alternate.
- Server-side validation rejects illegal moves, occupied squares, out-of-turn moves, and moves after the game ends.
- Detects all eight winning lines and draws; winning cells are highlighted.
- Rematch support, connection indicator, disconnect notices, responsive layout, and `/health` endpoint.
- Node's built-in test runner covers game rules.

## Requirements

- Node.js 20 or newer (npm included).
- For local development, two browser windows or two devices on the same network.

## Run locally

1. Extract this project and open a terminal in the project folder.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Start frontend and backend together:

   ```bash
   npm run dev
   ```

4. Open the Vite URL printed in the terminal, normally `http://localhost:5173`.
5. Create a game, copy the invite URL or room code, then open it in a second browser/device. For a second physical device on the same Wi-Fi, use your computer's LAN IP and ensure the firewall allows port 5173; configure `VITE_SERVER_URL` to the computer's LAN IP and port 3001 if needed, then restart Vite.

The Vite dev server runs on port 5173 and the Socket.IO/Express server on port 3001. If testing from a different device, set `VITE_SERVER_URL=http://YOUR_LAN_IP:3001` in a `.env` file in the project root and restart the dev server. The backend currently allows cross-origin Socket.IO connections for simple setup; restrict `CLIENT_ORIGIN` for a production deployment if desired.

## Test the game rules

```bash
npm test
```

The tests check horizontal/vertical/diagonal wins, turn order, illegal moves, win termination, and draws.

## Production build

```bash
npm install
npm run build
npm start
```

Express serves the built frontend and Socket.IO from the same origin. Set `PORT` if your host provides one. Check `https://YOUR_HOST/health` for a JSON health response.

## Deploy publicly on Render

This project is designed to run as one Node web service so HTTP and Socket.IO share the same public URL.

1. Create a Git repository and push this folder to GitHub.
2. In Render, choose **New → Web Service** and connect the repository.
3. Use these settings:
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Node version:** 20 or newer (the `engines` field requests this)
4. Deploy and wait for the service to become live.
5. Open the Render URL, create a room, then open the invite link on a different device/network to verify real public access.
6. Optional: add `CLIENT_ORIGIN=https://YOUR-SERVICE.onrender.com` as an environment variable to restrict Socket.IO origins. Do not set `VITE_SERVER_URL` in this single-service deployment; the frontend automatically uses its own origin.

Other Node hosts work too, provided they support persistent WebSocket connections and run `npm start`. Avoid static-only hosting for the complete app: the Socket.IO backend must stay available.

## Game rules

- Two players per room: X and O. X moves first.
- Players take turns marking one empty square in a 3×3 board.
- The first player to make a horizontal, vertical, or diagonal line of three wins.
- If all nine squares fill without a winning line, the game is a draw.
- A rematch clears the board and X starts again.

## Project layout

```text
client/
  index.html
  vite.config.js
  src/App.jsx
  src/main.jsx
  src/styles.css
server/
  game.js          # pure game rules
  game.test.js     # Node test suite
  index.js         # Express + Socket.IO room server
package.json
```

## Notes / next improvements

- Rooms are held in server memory. Restarting the server clears rooms, and a multi-instance deployment would need a shared Socket.IO adapter and persistent room store.
- This starter does not include accounts, ranked matchmaking, chat, or persistent match history.
