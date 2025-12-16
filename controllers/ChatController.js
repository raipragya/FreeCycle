const express = require("express");
const router = express.Router();

const db = require("../database/mysqlDB").model;
const Message = db.Message;
const User = db.User;
const Item = db.Item;
const Request = db.Request;

const { requireAuth } = require("../middlewares/auth");

// ========================================================
// UTIL: Generate secure room name
// ========================================================
function makeRoom(itemId, ownerId, requesterId) {
    return `chat-item-${itemId}-owner-${ownerId}-req-${requesterId}`;
}

// ========================================================
// SOCKET SERVER INITIALIZATION
// ========================================================
function setupChatSocket(io) {
    if (!io._chatInitialized) {
        const chat = io.of("/chat");

        chat.on("connection", async (socket) => {
            console.log("[Chat] User connected:", socket.id);

            // --- JOIN CHAT ROOM ---
            socket.on("joinRoom", async ({ itemId, userId }) => {
                const item = await Item.findByPk(itemId);

                if (!item) return;

                const ownerId = item.ownerId;

                // Find accepted request
                const req = await Request.findOne({
                    where: { itemId, status: "ACCEPTED" }
                });

                if (!req) return; // chat cannot start without acceptance

                const requesterId = req.requesterId;

                // Only these two users can join
                if (userId !== ownerId && userId !== requesterId) return;

                const room = makeRoom(itemId, ownerId, requesterId);
                socket.join(room);
                socket.emit("joinedRoom", { room });
            });

            // --- SEND MESSAGE SOCKET ---
            socket.on("sendMessage", async ({ itemId, senderId, content }) => {
                if (!content?.trim()) return;

                const item = await Item.findByPk(itemId);
                if (!item) return;

                // Validate relationship
                const req = await Request.findOne({
                    where: { itemId, status: "ACCEPTED" }
                });

                if (!req) return;

                const ownerId = item.ownerId;
                const requesterId = req.requesterId;

                if (senderId !== ownerId && senderId !== requesterId)
                    return; // unauthorized send attempt

                const room = makeRoom(itemId, ownerId, requesterId);

                const message = await Message.create({
                    itemId,
                    senderId,
                    content
                });

                chat.to(room).emit("newMessage", {
                    id: message.id,
                    itemId,
                    senderId,
                    content,
                    createdAt: message.createdAt
                });
            });

            // Typing indicator
            socket.on("typing", ({ room, userId }) => {
                socket.to(room).emit("typing", { userId });
            });

            socket.on("stopTyping", ({ room, userId }) => {
                socket.to(room).emit("stopTyping", { userId });
            });
        });

        io._chatInitialized = true;
    }
}


// ========================================================
// REST CONTROLLER (HTTP Apis)
// ========================================================
module.exports = (io) => {

    // Initialize socket namespace once
    setupChatSocket(io);


    // ----------------------------------------------------
    // GET /chat/:itemId  — Get chat history (with pagination)
    // ----------------------------------------------------
    router.get("/:itemId", requireAuth, async (req, res) => {
        try {
            const { itemId } = req.params;
            const page = Number(req.query.page || 1);
            const pageSize = 20;

            // Check chat permission
            const item = await Item.findByPk(itemId);
            if (!item) return res.status(404).json({ error: "Item not found" });

            const reqChat = await Request.findOne({
                where: { itemId, status: "ACCEPTED" }
            });

            if (!reqChat) {
                return res.status(403).json({ error: "Chat not available." });
            }

            if (req.user.id !== item.ownerId && req.user.id !== reqChat.requesterId) {
                return res.status(403).json({ error: "Unauthorized to view chat." });
            }

            const messages = await Message.findAll({
                where: { itemId },
                include: [{ model: User, attributes: ["id", "name"] }],
                limit: pageSize,
                offset: (page - 1) * pageSize,
                order: [["createdAt", "ASC"]]
            });

            return res.json({ messages });

        } catch (err) {
            console.error("Chat History Error:", err);
            return res.status(500).json({ error: "Failed to load messages." });
        }
    });


    // ----------------------------------------------------
    // POST /chat/send  — Non-socket fallback message sender
    // ----------------------------------------------------
    router.post("/send", requireAuth, async (req, res) => {
        try {
            const { itemId, content } = req.body;

            if (!itemId || !content)
                return res.status(400).json({ error: "Missing fields." });

            // Check item
            const item = await Item.findByPk(itemId);
            if (!item)
                return res.status(404).json({ error: "Item not found" });

            // Check acceptance
            const reqChat = await Request.findOne({
                where: { itemId, status: "ACCEPTED" }
            });

            if (!reqChat)
                return res.status(403).json({ error: "Chat not allowed" });

            const requesterId = reqChat.requesterId;
            const ownerId = item.ownerId;

            if (req.user.id !== ownerId && req.user.id !== requesterId) {
                return res.status(403).json({ error: "Unauthorized." });
            }

            // Create message
            const message = await Message.create({
                itemId,
                senderId: req.user.id,
                content
            });

            const room = makeRoom(itemId, ownerId, requesterId);

            // Broadcast via socket
            io.of("/chat").to(room).emit("newMessage", {
                id: message.id,
                itemId,
                senderId: req.user.id,
                content,
                createdAt: message.createdAt
            });

            return res.json({ message });

        } catch (err) {
            console.error("Send Message Error:", err);
            return res.status(500).json({ error: "Failed to send message." });
        }
    });

    return router;
};
