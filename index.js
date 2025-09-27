// server.js
import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

let esp32Client = null;

wss.on("connection", (ws, req) => {
  console.log("Client connected");

  ws.on("message", (msg) => {
    console.log("Message:", msg.toString());

    if (msg.toString().includes("ESP32 connected")) {
      esp32Client = ws;
      console.log("ESP32 registered ✅");
    } else {
      if (esp32Client && esp32Client.readyState === ws.OPEN) {
        esp32Client.send(msg.toString());
      }
    }
  });

  ws.on("close", () => {
    if (esp32Client === ws) esp32Client = null;
    console.log("Client disconnected");
  });
});

app.get("/", (req, res) => res.send("WebSocket server running"));

const PORT = process.env.PORT || 3008;
server.listen(PORT, () => console.log(`✅ Server running on ${PORT}`));

});

// Start server
server.listen(3008, () => console.log("Server running on http://localhost:3002"));
