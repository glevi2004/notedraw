import { createServer } from "node:http";
import { Server } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { z } from "zod";

const PORT = Number(process.env.PORT || 4001);
const REDIS_URL = process.env.COLLAB_REDIS_URL;
const ALLOWED_ORIGINS = (process.env.COLLAB_ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const MAX_PAYLOAD_BYTES = Number(
  process.env.COLLAB_MAX_PAYLOAD_BYTES || 1_000_000,
);

const WS_EVENTS = {
  SERVER_VOLATILE: "server-volatile-broadcast",
  SERVER: "server-broadcast",
  USER_FOLLOW_CHANGE: "user-follow",
  USER_FOLLOW_ROOM_CHANGE: "user-follow-room-change",
} as const;

const joinRoomSchema = z.string().min(1).max(128);

const stats = {
  connections: 0,
  messages: 0,
};

const server = createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
    return;
  }
  if (req.url === "/metrics") {
    res.writeHead(200, { "content-type": "text/plain" });
    res.end(
      `collab_connections ${stats.connections}\ncollab_messages ${stats.messages}\n`,
    );
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(server, {
  cors: {
    origin: ALLOWED_ORIGINS.length ? ALLOWED_ORIGINS : true,
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: MAX_PAYLOAD_BYTES,
});

if (REDIS_URL) {
  const pub = new Redis(REDIS_URL);
  const sub = pub.duplicate();
  io.adapter(createAdapter(pub, sub));
}

const roomLeaders = new Map<string, string>();

const allow = (socket: any, limit: number, intervalMs: number) => {
  const now = Date.now();
  const rate = (socket.data.rate = socket.data.rate || {
    count: 0,
    ts: now,
  });
  if (now - rate.ts > intervalMs) {
    rate.ts = now;
    rate.count = 0;
  }
  rate.count += 1;
  return rate.count <= limit;
};

const emitRoomUserChange = (roomId: string) => {
  const sockets = Array.from(io.sockets.adapter.rooms.get(roomId) || []);
  io.to(roomId).emit("room-user-change", sockets);
};

io.on("connection", (socket) => {
  stats.connections += 1;
  socket.emit("init-room");

  socket.on("join-room", (roomIdRaw: string) => {
    const roomId = joinRoomSchema.safeParse(roomIdRaw);
    if (!roomId.success) return;

    socket.join(roomId.data);
    socket.data.roomId = roomId.data;

    const sockets = Array.from(io.sockets.adapter.rooms.get(roomId.data) || []);

    if (!roomLeaders.has(roomId.data)) {
      roomLeaders.set(roomId.data, socket.id);
      socket.emit("first-in-room");
    } else {
      socket.to(roomId.data).emit("new-user", socket.id);
    }

    emitRoomUserChange(roomId.data);
  });

  socket.on(
    WS_EVENTS.SERVER,
    (roomId: string, encryptedData: ArrayBuffer, iv: Uint8Array) => {
      if (!allow(socket, 200, 1000)) return;
      if (!roomId) return;
      stats.messages += 1;
      socket.to(roomId).emit("client-broadcast", encryptedData, iv);
    },
  );

  socket.on(
    WS_EVENTS.SERVER_VOLATILE,
    (roomId: string, encryptedData: ArrayBuffer, iv: Uint8Array) => {
      if (!allow(socket, 400, 1000)) return;
      if (!roomId) return;
      stats.messages += 1;
      socket.to(roomId).volatile.emit("client-broadcast", encryptedData, iv);
    },
  );

  socket.on(WS_EVENTS.USER_FOLLOW_CHANGE, (payload: any) => {
    const roomId = socket.data.roomId;
    if (!roomId) return;
    socket.to(roomId).emit(WS_EVENTS.USER_FOLLOW_ROOM_CHANGE, payload);
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.roomId as string | undefined;
    if (!roomId) return;

    const sockets = Array.from(io.sockets.adapter.rooms.get(roomId) || []);

    if (!sockets.length) {
      roomLeaders.delete(roomId);
      return;
    }

    const leaderId = roomLeaders.get(roomId);
    if (leaderId === socket.id) {
      const nextLeader = sockets[0];
      roomLeaders.set(roomId, nextLeader);
      io.to(nextLeader).emit("first-in-room");
    }

    emitRoomUserChange(roomId);
  });
});

server.listen(PORT, () => {
  console.log(`collab server listening on :${PORT}`);
});
