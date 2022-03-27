import express from 'express';
import http from 'http';
import { createClient } from "redis";
import { Server } from "socket.io";

const redisClient = createClient();
redisClient.connect();

const app = express();
const server = http.createServer(app);

redisClient.on("error", (error) => {
  console.error(error);
});

redisClient.on("connect", () => {
    console.log("Connected to redis");
});

const io = new Server(server, {
    cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
    }
});

io.on('connection', async (socket) => {
    socket.on("get players", async () => {
        const usernames = await redisClient.keys("*");

        usernames.forEach(async username => {
            socket.emit("player joined", {
                username,
                ...await redisClient.hGetAll(username)
            });
        });
    });
    socket.on("new player", async username => {
        if (username === "resetAll") {
            await redisClient.flushAll();
        } else {
            await redisClient.hSet(username, {
                isReady: "false"
            });
            socket.broadcast.emit("player joined", { username, isReady: false });
        }
    });

    socket.on("player ready", async (username) => {
        await redisClient.hSet(username, {
            isReady: "true"
        });
        socket.broadcast.emit("new player ready", username);
    });

    socket.on("launch game", () => {
        io.emit("game launched");
    });
});

server.listen(8000, () => {
  console.log('listening on port 8000');
});
