module.exports = class SocketServer {
    constructor(io) {
        this.io = io;
    }

    mount() {
        console.log("\x1b[36m[Socket]\x1b[0m WebSocket server initialized");

        this.io.on("connection", (socket) => {
            console.log("Socket connected:", socket.id);

            // -------------------------------
            //     USER NOTIFICATION ROOM
            // -------------------------------
            const userId = socket.handshake.query.userId;
            
            if (userId) {
                socket.join(`user-${userId}`);
                console.log(`User ${userId} joined notification room`);
            }

            // -------------------------------
            //        CHAT SOCKET LOGIC
            // -------------------------------
            socket.on("joinItemRoom", ({ itemId }) => {
                if (!itemId) return;

                const roomName = `item-${itemId}`;
                socket.join(roomName);

                console.log(`Socket ${socket.id} joined ${roomName}`);
            });

            socket.on("sendMessage", ({ itemId, senderId, content }) => {
                if (!itemId || !senderId || !content) return;

                const roomName = `item-${itemId}`;

                // Emit to all users in the item chat room
                this.io.to(roomName).emit("newMessage", {
                    itemId,
                    senderId,
                    content,
                    timestamp: new Date()
                });

                console.log(`Message broadcast to ${roomName}`);
            });

            // -------------------------------
            //          DISCONNECT
            // -------------------------------
            socket.on("disconnect", () => {
                console.log("Socket disconnected:", socket.id);
            });
        });
    }
};

