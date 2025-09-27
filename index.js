const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Replace with your ESP32 IP and port
const ESP32_IP = "192.168.0.103";
const ESP32_PORT = 81;

// Connect to ESP32 WebSocket
let espSocket = new WebSocket(`ws://${ESP32_IP}:${ESP32_PORT}`);

espSocket.on("open", () => console.log("Connected to ESP32"));

espSocket.on("message", (msg) => {
  console.log("Data from ESP32:", msg.toString());
  // Broadcast to all frontend clients
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg.toString());
    }
  });
});

espSocket.on("close", () => {
  console.log("ESP32 disconnected, retrying in 5s...");
  setTimeout(() => {
    espSocket = new WebSocket(`ws://${ESP32_IP}:${ESP32_PORT}`);
  }, 5000);
});

// Optional route for testing
app.get("/", (req, res) => res.send("WebSocket server running"));

// Handle WebSocket connections from frontend
wss.on("connection", (ws) => {
  console.log("Frontend client connected");

  ws.on("message", (message) => {
    console.log("Command from frontend:", message.toString());
    // Forward command to ESP32
    if (espSocket.readyState === WebSocket.OPEN) {
      espSocket.send(message.toString());
    }
  });

  ws.on("close", () => console.log("Frontend client disconnected"));
});

// Start server
server.listen(3008, () => console.log("Server running on http://localhost:3002"));
