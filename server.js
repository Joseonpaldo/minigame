const express = require('express');
const http = require('http');
const cors = require('cors');
const { initSocket } = require('./src/config/socketIo/socket');

const app = express();
const server = http.createServer(app);
const port = 4000;

// Middleware
app.use(cors({
  origin: "*",
  methods: ['GET', 'POST']
}));
app.use(express.json());
app.use(express.static('public')); // Serve static files

app.get('/nws/health', (req, res) => {
  res.status(200).send('Server is running');
});

// Start server
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Initialize socket.io
initSocket(server);