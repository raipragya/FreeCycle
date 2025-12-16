const express = require("express");
const router = express.Router();

const db = require("../database/mysqlDB").model;
const Request = db.Request;
const Item = db.Item;
const User = db.User;

const { requireAuth } = require("../middlewares/auth");

// Utility function for socket events
function emitRequestUpdate(io, ownerId, requesterId) {
    if (!io) return;

    io.to(`user-${ownerId}`).emit("requests/update");
    io.to(`user-${requesterId}`).emit("requests/update");
}

// ============================================================
// POST /requests/create → Send a new request
// ============================================================
router.post("/create", requireAuth, async (req, res) => {
    try {
        const { itemId, message } = req.body;

        const item = await Item.findByPk(itemId);

        if (!item)
            return res.status(404).json({ error: "Item not found" });

        if (item.ownerId === req.user.id)
            return res.status(400).json({ error: "You cannot request your own item" });

        // Create request
        const request = await Request.create({
            itemId,
            requesterId: req.user.id,
            ownerId: item.ownerId,
            message,
            status: "PENDING"
        });

        // Update item status
        await item.update({ status: "REQUESTED" });

        emitRequestUpdate(req.io, item.ownerId, req.user.id);

        return res.json({ message: "Request created", request });

    } catch (err) {
        console.error("Create Request Error:", err);
        return res.status(500).json({ error: "Failed to create request" });
    }
});

// ============================================================
// PATCH /requests/:id/accept → Owner accepts request
// ============================================================
router.patch("/:id/accept", requireAuth, async (req, res) => {
    try {
        const request = await Request.findByPk(req.params.id);
        if (!request) return res.status(404).json({ error: "Request not found" });

        if (req.user.id !== request.ownerId)
            return res.status(403).json({ error: "Not authorized" });

        // Accept this request
        await request.update({ status: "ACCEPTED" });

        // Set item as given away
        const item = await Item.findByPk(request.itemId);
        await item.update({ status: "GIVEN_AWAY" });

        // Reject all other pending requests for same item
        await Request.update(
            { status: "REJECTED" },
            {
                where: {
                    itemId: item.id,
                    id: { [db.Sequelize.Op.ne]: request.id }
                }
            }
        );

        emitRequestUpdate(req.io, request.ownerId, request.requesterId);

        return res.json({ message: "Request accepted", request });

    } catch (err) {
        console.error("Accept Request Error:", err);
        return res.status(500).json({ error: "Failed to accept request" });
    }
});

// ============================================================
// PATCH /requests/:id/reject → Owner rejects request
// ============================================================
router.patch("/:id/reject", requireAuth, async (req, res) => {
    try {
        const request = await Request.findByPk(req.params.id);
        if (!request) return res.status(404).json({ error: "Request not found" });

        if (req.user.id !== request.ownerId)
            return res.status(403).json({ error: "Not authorized" });

        await request.update({ status: "REJECTED" });

        emitRequestUpdate(req.io, request.ownerId, request.requesterId);

        return res.json({ message: "Request rejected" });

    } catch (err) {
        console.error("Reject Request Error:", err);
        return res.status(500).json({ error: "Failed to reject request" });
    }
});

// ============================================================
// PATCH /requests/:id/cancel → Requester cancels their request
// ============================================================
router.patch("/:id/cancel", requireAuth, async (req, res) => {
    try {
        const request = await Request.findByPk(req.params.id);
        if (!request) return res.status(404).json({ error: "Request not found" });

        if (req.user.id !== request.requesterId)
            return res.status(403).json({ error: "Not authorized" });

        await request.update({ status: "CANCELLED" });

        emitRequestUpdate(req.io, request.ownerId, request.requesterId);

        return res.json({ message: "Request cancelled" });

    } catch (err) {
        console.error("Cancel Request Error:", err);
        return res.status(500).json({ error: "Failed to cancel request" });
    }
});

// ============================================================
// GET /requests/item/:itemId → Get all requests for an item
// ============================================================
router.get("/item/:itemId", requireAuth, async (req, res) => {
    try {
        const requests = await Request.findAll({
            where: { itemId: req.params.itemId },
            include: [
                { model: User, as: "requester", attributes: ["id", "name"] }
            ]
        });

        return res.json({ requests });

    } catch (err) {
        console.error("Fetch Item Requests Error:", err);
        return res.status(500).json({ error: "Failed to fetch requests" });
    }
});

// ============================================================
// GET /requests/sent → Get sent requests
// ============================================================
router.get("/sent", requireAuth, async (req, res) => {
    try {
        const requests = await Request.findAll({
            where: { requesterId: req.user.id },
            include: [
                { model: Item, attributes: ["id", "title", "status"] }
            ]
        });

        return res.json({ requests });

    } catch (err) {
        console.error("Get Sent Requests Error:", err);
        return res.status(500).json({ error: "Failed to fetch sent requests" });
    }
});

// ============================================================
// GET /requests/received → Requests for my items
// ============================================================
router.get("/received", requireAuth, async (req, res) => {
    try {
        const requests = await Request.findAll({
            where: { ownerId: req.user.id },
            include: [
                { model: Item, attributes: ["id", "title", "status"] },
                { model: User, as: "requester", attributes: ["id", "name"] }
            ]
        });

        return res.json({ requests });

    } catch (err) {
        console.error("Get Received Requests Error:", err);
        return res.status(500).json({ error: "Failed to fetch received requests" });
    }
});

module.exports = (io) => {
    // Attach io instance to router for socket events
    router.use((req, res, next) => {
        req.io = io;
        next();
    });
    return router;
};
