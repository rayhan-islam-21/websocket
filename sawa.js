const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const uri =
  "mongodb+srv://merayhanislam21_db_user:ow4kDYB2mwNGYMCI@aquatrack.35ww4zj.mongodb.net/?retryWrites=true&w=majority&appName=aquatrack";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB Atlas");

    const db = client.db("aquatrackDB");
    const dataCollection = db.collection("esp32Data");
    const pumpCollection = db.collection("pumpState");

    // ===== Initialize pump state if not exists =====
    const pumpExists = await pumpCollection.findOne({ _id: "currentState" });
    if (!pumpExists) {
      await pumpCollection.insertOne({
        _id: "currentState",
        mode: "AUTO", // default mode
        motor1: "OFF",
        motor2: "OFF",
        updatedAt: new Date(),
      });
      console.log("⚡ Pump state initialized in DB");
    }

    // ===== GET last 50 sensor readings =====
    app.get("/api/data", async (req, res) => {
      try {
        const data = await dataCollection
          .find({})
          .sort({ timestamp: -1 })
          .limit(50)
          .toArray();
        res.json(data);
      } catch (error) {
        console.error("❌ Error fetching data:", error);
        res.status(500).json({ error: "Failed to fetch data" });
      }
    });

    // ===== POST new data from ESP32 =====
    app.post("/api/data", async (req, res) => {
      try {
        const { temperature, distance, motor1, motor2, mode } = req.body;

        if (temperature === undefined || distance === undefined) {
          return res.status(400).json({ error: "Missing required fields" });
        }

        const newData = {
          temperature,
          distance,
          motor1: motor1 === 1 ? "ON" : "OFF",
          motor2: motor2 === 1 ? "ON" : "OFF",
          mode: mode || "AUTO",
          timestamp: new Date(),
        };

        const result = await dataCollection.insertOne(newData);
        console.log("📡 Data received:", newData);

        res.json({ success: true, id: result.insertedId });
      } catch (error) {
        console.error("❌ Error saving data:", error);
        res.status(500).json({ error: "Failed to save data" });
      }
    });

    // ===== GET current pump state =====
    app.get("/api/pump", async (req, res) => {
      try {
        const pumpState = await pumpCollection.findOne({ _id: "currentState" });
        if (!pumpState) {
          return res.status(404).json({ error: "Pump state not found" });
        }
        res.json({
          mode: pumpState.mode,
          motor1: pumpState.motor1,
          motor2: pumpState.motor2,
        });
      } catch (error) {
        console.error("❌ Error fetching pump state:", error);
        res.status(500).json({ error: "Failed to fetch pump state" });
      }
    });

    // ===== UPDATE pump state (from web/app) =====
    app.post("/api/pump", async (req, res) => {
      try {
        const { mode, motor1, motor2 } = req.body;

        if (!mode) {
          return res.status(400).json({ error: "mode is required" });
        }

        await pumpCollection.updateOne(
          { _id: "currentState" },
          { $set: { mode, motor1, motor2, updatedAt: new Date() } }
        );

        console.log(
          `⚡ Pump state updated: Mode=${mode}, Motor1=${motor1}, Motor2=${motor2}`
        );
        res.json({ success: true });
      } catch (error) {
        console.error("❌ Error updating pump state:", error);
        res.status(500).json({ error: "Failed to update pump state" });
      }
    });

    // ===== Start server =====
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ Error connecting to MongoDB:", err);
  }
}

run().catch(console.dir);
