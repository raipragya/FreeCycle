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

        this.app.use('/auth', AuthController);             
        this.app.use('/users', UserController);             
        this.app.use('/items', ItemController);             
        this.app.use('/requests', RequestController);       
        this.app.use('/home', HomeController);               

        // --------------------------
        // Controllers requiring socket.io
        
        this.app.use('/chat', ChatController(this.io));      
        this.app.use('/notifications', NotificationController(this.io)); 
    }
}

module.exports = new ApiController();

