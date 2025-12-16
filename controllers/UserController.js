const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const db = require("../database/mysqlDB").model;
const User = db.User;
const Item = db.Item;
const Request = db.Request;

const { requireAuth } = require("../middlewares/auth");   // FIXED IMPORT

// ============================================================
// GET /users/me  → Fetch logged-in user's profile
// ============================================================
router.get("/me", requireAuth, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id, {
            attributes: ["id", "name", "email", "location", "rating", "role"]
        });

        return res.json({ user });
    } catch (err) {
        console.error("Get Profile Error:", err);
        return res.status(500).json({ error: "Failed to fetch profile" });
    }
});


// ============================================================
// PATCH /users/update  → Update profile safely
// ============================================================
router.patch("/update", requireAuth, async (req, res) => {
    try {
        const allowedFields = ["name", "location"];   // SECURITY

        const data = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                data[field] = req.body[field];
            }
        }

        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ error: "User not found" });

        await user.update(data);

        return res.json({ message: "Profile updated", user });

    } catch (err) {
        console.error("Update User Error:", err);
        return res.status(500).json({ error: "Failed to update profile" });
    }
});


// ============================================================
// PATCH /users/change-password
// ============================================================
router.patch("/change-password", requireAuth, async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ error: "Missing password fields" });
        }

        const user = await User.findByPk(req.user.id);

        const valid = await bcrypt.compare(oldPassword, user.passwordHash);  // FIXED
        if (!valid) {
            return res.status(400).json({ error: "Invalid old password" });
        }

        const hashed = await bcrypt.hash(newPassword, 10);
        await user.update({ passwordHash: hashed });   // FIXED

        return res.json({ message: "Password updated successfully" });

    } catch (err) {
        console.error("Change Password Error:", err);
        return res.status(500).json({ error: "Failed to change password" });
    }
});


// ============================================================
// GET /users/items  → Items posted by this user
// ============================================================
router.get("/items", requireAuth, async (req, res) => {
    try {
        const items = await Item.findAll({
            where: { ownerId: req.user.id }
        });

        return res.json({ items });
    } catch (err) {
        console.error("Get User Items Error:", err);
        return res.status(500).json({ error: "Failed to fetch items" });
    }
});


// ============================================================
// GET /users/requests/sent  → Requests the user has made
// ============================================================
router.get("/requests/sent", requireAuth, async (req, res) => {
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
// GET /users/requests/received  → Requests for my items
// ============================================================
router.get("/requests/received", requireAuth, async (req, res) => {
    try {
        const myItems = await Item.findAll({ where: { ownerId: req.user.id } });
        const myItemIds = myItems.map(item => item.id);

        const requests = await Request.findAll({
            where: { itemId: myItemIds },
            include: [
                { model: Item, attributes: ["id", "title", "status"] },
                { model: User, as: "requester", attributes: ["id", "name"] }
            ]
        });

        return res.json({ requests });

    } catch (err) {
        console.error("Get Received Requests Error:", err);
        return res.status(500).json({ error: "Failed to fetch requests" });
    }
});


// ============================================================
// PATCH /users/rating → Owner rates a requester
// ============================================================
router.patch("/rating", requireAuth, async (req, res) => {
    try {
        const { userId, rating } = req.body;

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: "Invalid rating (1-5)" });
        }

        if (!userId) {
            return res.status(400).json({ error: "Missing userId to rate" });
        }

        const userToRate = await User.findByPk(userId);
        if (!userToRate) {
            return res.status(404).json({ error: "User not found" });
        }

        await userToRate.update({ rating });

        return res.json({ message: "Rating updated", rating });

    } catch (err) {
        console.error("Rating Update Error:", err);
        return res.status(500).json({ error: "Failed to update rating" });
    }
});

module.exports = router;
