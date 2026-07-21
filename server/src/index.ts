import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import todosRouter from "./routes/todos";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/todo-app";

// Middleware
app.use(cors());
app.use(express.json());

// API routes
app.use("/api/todos", todosRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Serve static files from client build in production
const clientDistPath = path.resolve(__dirname, "../../client/dist");
app.use(express.static(clientDistPath));

// SPA fallback — serve index.html for non-API routes
app.get("*", (_req, res) => {
  const indexPath = path.join(clientDistPath, "index.html");
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ error: "Not found" });
    }
  });
});

// Connect to MongoDB and start server
async function start() {
  try {
    console.log(`Connecting to MongoDB at ${MONGODB_URI.replace(/\/\/.*@/, "//***@")}`);
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
    process.exit(1);
  }
}

start();
