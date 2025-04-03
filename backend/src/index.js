const app = require("./server");
const WebSocket = require('ws');
const { port } = require("./config");

const server = app.listen(port, function () {
  console.log("Webserver is ready");
});

const wss = new WebSocket.Server({ server });

const MIN_DISTANCE = 50;
let userCursors = {};
let userScores = {};
let clients = {};

function getRandomColor() {
  return `#${Math.floor(Math.random() * 16777215).toString(16)}`;
}

// Handle WebSocket connections
wss.on('connection', (ws) => {
  console.log('New user connected');
  const color = getRandomColor();

  broadcast(JSON.stringify({
    type: 'user-joined',
    score: userScores,
  }));

  ws.on('message', (message) => {
    const data = JSON.parse(message);

    if (data.type === 'user-joined') {
        ws.userId = data.userId;
        userCursors[data.userId] = { x: 0, y: 0 };
        userScores[color] = 0;
        clients[data.userId] = ws;
    }

    if (data.type === 'cursor') {
      userCursors[data.userId] = data.position;
      broadcast(JSON.stringify({
        type: 'cursor',
        userId: data.userId,
        position: userCursors[data.userId],
        color: color,
      }));
    }

    if (data.type === 'check-collision') {
      const { userId, targetUserId } = data;
      if (isColliding(userId, targetUserId)) {
        userScores[color] += 1;
        disconnectUser(targetUserId);
        broadcast(JSON.stringify({
          type: 'score-update',
          userId: userId,
          color: color,
          score: userScores[color],
        }));

      }
    }
  });

  ws.on('close', () => {
    console.log(`User ${ws.userId} disconnected`);
    delete userCursors[ws.userId];
    delete userScores[color];
    delete clients[ws.userId];

    broadcast(JSON.stringify({
      type: 'user-disconnected',
      userId: ws.userId,
    }));
  });
});


function isColliding(user1, user2) {
  if (userCursors[user1] && userCursors[user2]) {
    const dx = userCursors[user1].x - userCursors[user2].x;
    const dy = userCursors[user1].y - userCursors[user2].y;
    return Math.sqrt(dx * dx + dy * dy) < MIN_DISTANCE;
  }
  return false;
}

// Disconnect a user and notify others
function disconnectUser(userId) {
  if (clients[userId]) {
    clients[userId].close();
  }

  delete userCursors[userId];
  delete userScores[userId];
  delete clients[userId];

  broadcast(JSON.stringify({
    type: 'user-disconnected',
    userId: userId,
  }));
}


function broadcast(message) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}
