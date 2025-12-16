const express = require('express');
const router = express.Router();

const db = require('../database/mysqlDB').model;
const Item = db.Item;
const User = db.User;
const Category = db.Category;

const auth = require('../middlewares/auth');  // JWT middleware

// ----------------------------------------------------------
// Emit updates to all clients
// ----------------------------------------------------------
function emitItems(io) {
    if (!io) return;

    Item.findAll({
        include: [
            { model: User, attributes: ["id", "name", "email"] },
            { model: Category, attributes: ["id", "name"] }
        ]
    }).then(items => {
        io.emit("items/update", items);
    });
}

// =========================================================
// FreeCycle Item Controller
// =========================================================
module.exports = (io) => {

    // ------------------------------------------------------
    // GET /items → Fetch all + search + filters
    // ------------------------------------------------------
    router.get('/', async (req, res) => {
        try {
            const { search, categoryId, location } = req.query;

            const where = {};

            if (search) {
                where.title = { [db.Sequelize.Op.like]: `%${search}%` };
            }

            if (categoryId) where.categoryId = categoryId;
            if (location) where.location = location;

            where.status = "active";   // only show active items

            const items = await Item.findAll({
                where,
                include: [
                    { model: User, attributes: ["id", "name"] },
                    { model: Category, attributes: ["id", "name"] }
                ]
            });

            return res.json(items);

        } catch (err) {
            console.error("Get Items Error:", err);
            return res.status(500).json({ error: "Failed to fetch items." });
        }
    });

    // ------------------------------------------------------
    // GET /items/:id → Fetch single item
    // ------------------------------------------------------
    router.get('/:id', async (req, res) => {
        try {
            const item = await Item.findByPk(req.params.id, {
                include: [
                    { model: User, attributes: ["id", "name", "email"] },
                    { model: Category, attributes: ["id", "name"] }
                ]
            });

            if (!item)
                return res.status(404).json({ error: "Item not found" });

            return res.json(item);

        } catch (err) {
            console.error("Get Item Error:", err);
            return res.status(500).json({ error: "Failed to fetch item." });
        }
    });

    // ------------------------------------------------------
    // POST /items/create → Auth required
    // ownerId comes from JWT, not body
    // ------------------------------------------------------
    router.post('/create', auth, async (req, res) => {
        try {
            const { title, description, categoryId, location, imageUrl } = req.body;

            if (!title) {
                return res.status(400).json({ error: "Title is required." });
            }

            const item = await Item.create({
                title,
                description,
                ownerId: req.user.id,        // <-- secure
                categoryId,
                location,
                imageUrl,
                status: "active"
            });

            emitItems(io);

            return res.json(item);

        } catch (err) {
            console.error("Create Item Error:", err);
            return res.status(500).json({ error: "Failed to create item." });
        }
    });

    // ------------------------------------------------------
    // PATCH /items/:id → Only owner allowed
    // ------------------------------------------------------
    router.patch('/:id', auth, async (req, res) => {
        try {
            const id = req.params.id;
            const updates = req.body;

            const item = await Item.findByPk(id);

            if (!item)
                return res.status(404).json({ error: "Item not found." });

            if (item.ownerId !== req.user.id)
                return res.status(403).json({ error: "Not authorized." });

            delete updates.ownerId; // prevent ownership manipulation

            await item.update(updates);

            emitItems(io);

            return res.json(item);

        } catch (err) {
            console.error("Update Item Error:", err);
            return res.status(500).json({ error: "Failed to update item." });
        }
    });

    // ------------------------------------------------------
    // DELETE /items/:id → Soft delete (status = "deleted")
    // Only owner allowed
    // ------------------------------------------------------
    router.delete('/:id', auth, async (req, res) => {
        try {
            const item = await Item.findByPk(req.params.id);

            if (!item)
                return res.status(404).json({ error: "Item not found." });

            if (item.ownerId !== req.user.id)
                return res.status(403).json({ error: "Not authorized." });

            await item.update({ status: "deleted" });

            emitItems(io);

            return res.json({ message: "Item deleted." });

        } catch (err) {
            console.error("Delete Item Error:", err);
            return res.status(500).json({ error: "Failed to delete item." });
        }
    });

    return router;
};
