// src/socket.ts
import { Server as HttpServer } from "http";
import { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export const initSocket = (httpServer: HttpServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("🔌 socket connected:", socket.id);
    socket.on("disconnect", () => {
      console.log("🔌 socket disconnected:", socket.id);
    });
  });

  return io;
};

// যেকোনো controller থেকে ডাটা create/update/delete হলে এটা কল করলেই
// সব connected client-কে জানিয়ে দেওয়া হবে — ওরা সাথে সাথে নিজেদের ডাটা refetch করে নেবে
export const emitDataChanged = (resource: string, action?: string): void => {
  if (!io) return;
  io.emit("data:changed", { resource, action, at: Date.now() });
};
