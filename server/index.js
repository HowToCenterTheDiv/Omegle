// Basic setup: Express app with HTTP and Socket.IO server
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static frontend files (like index.html, script.js, etc.)
app.use(express.static(path.join(__dirname, "../public")));

// Start the server on port 3000
server.listen(3000, () => {
  console.log("Signaling server running on http://localhost:3000");
});

// --- SOCKET.IO Logic (Signaling Layer) ---

// Object to keep track of rooms and connected users
const rooms = {};

// When a new socket (user) connects
io.on("connection", (socket) => {
  console.log("New user connected:", socket.id);

  // When user joins a room
  socket.on("join-room", (roomId) => {
    socket.join(roomId); // Join Socket.IO room
    console.log(`User ${socket.id} joined room: ${roomId}`);

    // Track members in each room
    if (!rooms[roomId]) rooms[roomId] = [];
    rooms[roomId].push(socket.id);
  });
   
    
    //ending the call

    socket.on("end-call", ({ roomId }) => {
  socket.to(roomId).emit("call-ended");
});

  // When a user sends an offer
  socket.on("send-offer", ({ offer, roomId }) => {
      // Relay offer to all other peers in the room except sender
      console.log("offer received");
      
    socket.to(roomId).emit("receive-offer", offer);
  });

  // When a user sends an answer
  socket.on("send-answer", ({ answer, roomId }) => {
      // Relay answer to the other peer
      console.log("anser sent");
      
    socket.to(roomId).emit("receive-answer", answer);
  });

  // When a user sends ICE candidate
  socket.on("send-ice", ({ candidate, roomId }) => {
      // Relay ICE candidate to the other peer
      console.log("ice candidate sent");
      
    socket.to(roomId).emit("receive-ice", candidate);
  });

  // Optional: Handle disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
    for (const room in rooms) {
      rooms[room] = rooms[room].filter(id => id !== socket.id);
    }
  });
});
