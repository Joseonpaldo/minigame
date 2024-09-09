const express = require('express');
const http = require('http');
const cors = require('cors');
const { initSocket } = require('./src/config/socket');

const app = express();
const server = http.createServer(app);
const port = 4000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  methods: ['GET', 'POST']
}));
app.use(express.json());
app.use(express.static('public')); // Serve static files

// Start server
server.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Initialize socket.io
initSocket(server);