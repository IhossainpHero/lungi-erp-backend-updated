// src/server.ts

import connectDB from "@config/db";
import dns from "dns";
import "dotenv/config";
import http from "http";
import app from "./app";
import { initSocket } from "./socket";
dns.setServers(["8.8.8.8", "8.8.4.4"]);

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  await connectDB();

  const httpServer = http.createServer(app);
  initSocket(httpServer);

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📦 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🏥 Health: http://localhost:${PORT}/api/health`);
    console.log(`🔌 Socket.IO ready`);
  });
};

startServer().catch((err) => {
  console.error("Server startup error:", err);
  process.exit(1);
});
