const express = require("express");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const morgan = require("morgan");

class RestFulApiMiddleware {
    constructor() {
        this.app = null;
    }

    inCludeApp(app) {
        this.app = app;
    }

    mount() {
        console.log("\x1b[31mSystem:\x1b[37m API Middleware initialized");

        // ---------------------------
        // Essential Middlewares
        // ---------------------------
        this.app.use(cors());                  // Enable CORS
        this.app.use(helmet());                // Secure headers
        this.app.use(express.json());          // JSON parser
        this.app.use(express.urlencoded({ extended: true })); // URL-encoded parser
        this.app.use(compression());           // Response compression
        this.app.use(morgan("dev"));           // Logging for development

        // ---------------------------
        // Static files (for uploads)
        // ---------------------------
        this.app.use(express.static("public"));
    }
}

module.exports = new RestFulApiMiddleware();
