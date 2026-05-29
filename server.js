const http = require('http');
const { Server } = require('socket.io');
const app = require('./src/app');
const setupCheckinSocket = require('./src/sockets/checkinSocket');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

setupCheckinSocket(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
