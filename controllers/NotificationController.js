const express = require("express");
const router = express.Router();

const db = require("../database/mysqlDB").model;
const Notification = db.notification;
const User = db.User;

const { requireAuth } = require("../middlewares/auth");


// --------------------------------------------------------
// Emit socket notification to a user
// --------------------------------------------------------
function emitNotification(io, userId, notification) {
    if (!io) return;
    io.to(`user-${userId}`).emit("notification:new", notification);
}


// ========================================================
// Notification Controller
// ========================================================
module.exports = (io) => {

    // Attach io to requests
    router.use((req, res, next) => {
        req.io = io;
        next();
    });


    // ----------------------------------------------------
    // GET /notifications
    // Fetch logged-in user's notifications
    // ----------------------------------------------------
    router.get("/", requireAuth, async (req, res) => {
        try {
            const notifications = await Notification.findAll({
                where: { userId: req.user.id },
                order: [["createdAt", "DESC"]]
            });

            return res.json({ notifications });

        } catch (err) {
            console.error("Fetch Notifications Error:", err);
            return res.status(500).json({ error: "Failed to load notifications." });
        }
    });


    // ----------------------------------------------------
    // POST /notifications/create
    // Create a notification for a target user
    // ----------------------------------------------------
    router.post("/create", async (req, res) => {
        try {
            const { userId, title, message } = req.body;

            if (!userId || !title || !message) {
                return res.status(400).json({ error: "Missing required fields" });
            }

            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({ error: "User not found" });
            }

            const notification = await Notification.create({
                userId,
                title,
                message
            });

            emitNotification(io, userId, notification);

            return res.json({ notification });

        } catch (err) {
            console.error("Create Notification Error:", err);
            return res.status(500).json({ error: "Failed to create notification." });
        }
    });


    // ----------------------------------------------------
    // PATCH /notifications/read/:id
    // Mark notification as read
    // ----------------------------------------------------
    router.patch("/read/:id", requireAuth, async (req, res) => {
        try {
            const notification = await Notification.findByPk(req.params.id);

            if (!notification) {
                return res.status(404).json({ error: "Notification not found" });
            }

            if (notification.userId !== req.user.id) {
                return res.status(403).json({ error: "Unauthorized" });
            }

            await notification.update({ read: true });

            return res.json({ message: "Notification marked as read", notification });

        } catch (err) {
            console.error("Mark Read Error:", err);
            return res.status(500).json({ error: "Failed to update notification." });
        }
    });


    // ----------------------------------------------------
    // DELETE /notifications/:id
    // Delete notification
    // ----------------------------------------------------
    router.delete("/:id", requireAuth, async (req, res) => {
        try {
            const notification = await Notification.findByPk(req.params.id);

            if (!notification) {
                return res.status(404).json({ error: "Notification not found" });
            }

            if (notification.userId !== req.user.id) {
                return res.status(403).json({ error: "Unauthorized" });
            }

            await notification.destroy();

            return res.json({ message: "Notification deleted" });

        } catch (err) {
            console.error("Delete Notification Error:", err);
            return res.status(500).json({ error: "Failed to delete notification." });
        }
    });

    return router;
};
