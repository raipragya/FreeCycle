// ----------------------------------------------------------
// FreeCycle Backend - API Controller Loader (2025)
// ----------------------------------------------------------

const express = require('express');

// Import Controllers
const AuthController = require('./AuthController');
const UserController = require('./UserController');
const ItemController = require('./ItemController');
const RequestController = require('./RequestController');
const HomeController = require('./HomeController');

// Controllers that need socket.io
const ChatController = require('./ChatController');
const NotificationController = require('./NotificationController');

class ApiController {
    constructor() {
        this.app = null;
        this.io = null;
    }

    inCludeApp(app, io) {
        this.app = app;
        this.io = io;
    }

    mount() {
        if (!this.app) {
            console.error("API Controller Error: App not initialized.");
            return;
        }

        console.log('\x1b[36m[FreeCycle]\x1b[37m API Controllers Mounted.');

        // --------------------------
        // Main REST API Routes
        // --------------------------

        this.app.use('/auth', AuthController);                 // Register/Login
        this.app.use('/users', UserController);               // Profile, rating, settings
        this.app.use('/items', ItemController);               // Item CRUD
        this.app.use('/requests', RequestController);         // Request flows
        this.app.use('/home', HomeController);                // Server status / file upload

        // --------------------------
        // Controllers requiring socket.io
        
        this.app.use('/chat', ChatController(this.io));       // Chat REST + sockets
        this.app.use('/notifications', NotificationController(this.io)); // Push notifications
    }
}

module.exports = new ApiController();
