const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const db = require('../database/mysqlDB').model;

const User = db.User;

// Secret for JWT
const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey123";

// --------------------------
// Helper to generate JWT
// --------------------------
function generateToken(user) {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            role: user.role
        },
        JWT_SECRET,
        { expiresIn: "7d" }
    );
}

// ===================================================
//                     Register
// ===================================================
router.post('/register', async (req, res) => {
    try {
        const { name, email, password, location } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({ error: "Missing required fields." });
        }

        const existing = await User.findOne({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: "User already exists." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            name,
            email,
            password: hashedPassword,
            location,
            role: "USER"
        });

        const token = generateToken(newUser);

        return res.json({
            user: {
                id: newUser.id,
                name: newUser.name,
                email: newUser.email,
                location: newUser.location,
                role: newUser.role
            },
            token
        });
    } catch (err) {
        console.error("Register Error:", err);
        return res.status(500).json({ error: "Registration failed." });
    }
});

// ===================================================
//                     Login
// ===================================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Missing email or password." });
        }

        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(400).json({ error: "Invalid email or password." });
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
            return res.status(400).json({ error: "Invalid email or password." });
        }

        const token = generateToken(user);

        return res.json({
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                location: user.location,
                role: user.role
            },
            token
        });

    } catch (err) {
        console.error("Login Error:", err);
        return res.status(500).json({ error: "Login failed." });
    }
});

module.exports = router;

