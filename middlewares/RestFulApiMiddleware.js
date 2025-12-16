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
        this.app.use(cors());                  
        this.app.use(helmet());                
        this.app.use(express.json());          
        this.app.use(express.urlencoded({ extended: true })); 
        this.app.use(compression());          
        this.app.use(morgan("dev"));          

        // ---------------------------
        // Static files (for uploads)
        // ---------------------------
        this.app.use(express.static("public"));
    }
}

module.exports = new RestFulApiMiddleware();

