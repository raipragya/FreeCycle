const express = require('express');
const http = require('http');
const socketio = require('socket.io');

// Middlewares
const RestFulApiMiddleware = require('./middlewares/RestFulApiMiddleware');

// Database
const mysqlDB = require('./database/mysqlDB');

// Main Controller Router
const ApiController = require('./controllers/ApiController');

// Socket Server (Chat + Notifications)
const SocketServer = require('./socketServer');

module.exports = class App {
    constructor(port) {
        this.app = express();
        this.http = http.createServer(this.app);

        this.io = socketio(this.http, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            }
        });

        this.port = process.env.PORT || port;
    }

    // ------------------------------
    // 1. Database Initialization
    // ------------------------------
    async mountDatabase() {
        console.log("Connecting to database...");
        await mysqlDB.mount();
        console.log("Database connected.");
    }

    // ------------------------------
    // 2. Global Middlewares
    // ------------------------------
    mountMiddleware() {
        RestFulApiMiddleware.inCludeApp(this.app);
        RestFulApiMiddleware.mount();
    }

    // ------------------------------
    // 3. Socket.io Initialization
    // ------------------------------
    mountSocketServer() {
        const socketServer = new SocketServer(this.io);
        socketServer.mount();
    }

    // ------------------------------
    // 4. API Controllers
    // ------------------------------
    mountController() {
        ApiController.inCludeApp(this.app, this.io);
        ApiController.mount();
    }

    // ------------------------------
    // 5. Start Server
    // ------------------------------
    async start() {
        await this.mountMiddleware();
        await this.mountDatabase();
        await mysqlDB.mountModel();
        await this.mountSocketServer();
        await this.mountController();

        this.http.listen(this.port, () => {
            console.log(
                "\x1b[31mFreeCycle:\x1b[37m",
                `Backend running on port \x1b[32m${this.port}\x1b[37m`
            );
        });
    }
};

