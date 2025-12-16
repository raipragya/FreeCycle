module.exports = (sequelize, DataTypes) => {
    const Message = sequelize.define("Message", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        // The item this chat conversation belongs to
        itemId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        // The user who sent the message
        senderId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        content: {
            type: DataTypes.TEXT,
            allowNull: false
        },

        // Optional: For message read receipts
        read: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    });

    // Associations
    Message.associate = (models) => {
        Message.belongsTo(models.User, { foreignKey: "senderId" });
        Message.belongsTo(models.Item, { foreignKey: "itemId" });
    };

    return Message;
};
