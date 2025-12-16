const express = require("express");
const router = express.Router();
const { success } = require("../utils/response");

// Simple server status route
router.get("/", (req, res) => {
    return success(res, "FreeCycle backend is running...");
});

// Optional: simple file upload using multer
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: "public/uploads",
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname);
    }
});

const upload = multer({ storage });

// Upload route: /home/upload
router.post("/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
    }

    return success(res, {
        url: "/uploads/" + req.file.filename
    });
});

module.exports = router;
