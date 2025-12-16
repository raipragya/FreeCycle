// --------------------------------------------------------------------
// FreeCycle Backend 2025 - Sequelize Model Loader
// Replaces old ferry-booking models with Item / Request / User / Chat
// --------------------------------------------------------------------

const Sequelize = require('sequelize');
const config = require('./config.js');

class Mysql {
    constructor() {
        this.Sequelize = Sequelize;
        this.sequelize = this.setupDatabase();
        this.model = {};     // Will be filled in mountModel()
    }

    // --------------------------------------------
    // Create Sequelize instance
    // --------------------------------------------
    setupDatabase() {
        const database = process.env.DB_NAME || config.DB_NAME;
        const username = process.env.DB_USERNAME || config.DB_USERNAME;
        const password = process.env.DB_PASSWORD || config.DB_PASSWORD;
        const host = process.env.DB_HOST || config.DB_HOST;

        return new Sequelize(database, username, password, {
            host,
            dialect: 'mysql',
            define: {
                timestamps: true
            },
            logging: false
        });
    }

    // --------------------------------------------
    // Connect to DB
    // --------------------------------------------
    async mount() {
        try {
            await this.sequelize.authenticate();
            console.log('\x1b[32m[DB]\x1b[37m Connected to MySQL successfully.');
        } catch (err) {
            console.error('[DB] Connection error:', err);
        }
    }

    // --------------------------------------------
    // Mount FreeCycle models
    // --------------------------------------------
    async mountModel() {
        const sequelize = this.sequelize;
        const DataTypes = this.Sequelize;

        const model = {};
        model.sequelize = sequelize;

        // ---------------------------
        // Register FreeCycle models
        // ---------------------------
        model.User       = require('./model/User.js')(sequelize, DataTypes);
        model.Item       = require('./model/Item.js')(sequelize, DataTypes);
        model.Request    = require('./model/Request.js')(sequelize, DataTypes);
        model.Message    = require('./model/Message.js')(sequelize, DataTypes);
        model.Category   = require('./model/Category.js')(sequelize, DataTypes);
        model.Notification = require('./model/Notification.js')(sequelize, DataTypes);

        // apply schemas
        await this.mountSync(model);

        // apply relationships
        await this.mountRelation(model);

        this.model = model;
        return model;
    }

    // --------------------------------------------
    // Sync FreeCycle models
    // --------------------------------------------
    async mountSync(model) {
        await model.User.sync();
        await model.Item.sync();
        await model.Category.sync();
        await model.Request.sync();
        await model.Message.sync();
        await model.Notification.sync();
    }

    // --------------------------------------------
    // Define FreeCycle relationships
    // --------------------------------------------
    async mountRelation(model) {

        // User → Item (1:M)
        model.User.hasMany(model.Item, { foreignKey: 'ownerId' });
        model.Item.belongsTo(model.User, { foreignKey: 'ownerId' });

        // Item → Request (1:M)
        model.Item.hasMany(model.Request, { foreignKey: 'itemId' });
        model.Request.belongsTo(model.Item, { foreignKey: 'itemId' });

        // User → Request (1:M)
        model.User.hasMany(model.Request, { foreignKey: 'requesterId' });
        model.Request.belongsTo(model.User, { foreignKey: 'requesterId' });

        // Category → Item (1:M)
        model.Category.hasMany(model.Item, { foreignKey: 'categoryId' });
        model.Item.belongsTo(model.Category, { foreignKey: 'categoryId' });

        // Chat message relations
        // User → Message (sent)
        model.User.hasMany(model.Message, { foreignKey: 'senderId' });
        model.Message.belongsTo(model.User, { foreignKey: 'senderId' });

        // Item → Message (chat per item)
        model.Item.hasMany(model.Message, { foreignKey: 'itemId' });
        model.Message.belongsTo(model.Item, { foreignKey: 'itemId' });

        // Notification: linked to user
        model.User.hasMany(model.Notification, { foreignKey: 'userId' });
        model.Notification.belongsTo(model.User, { foreignKey: 'userId' });
    }
}

module.exports = new Mysql();
