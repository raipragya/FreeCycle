module.exports = (sequelize, DataTypes) => {
    const Notification = sequelize.define("Notification", {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        title: {
            type: DataTypes.STRING,
            allowNull: false
        },

        message: {
            type: DataTypes.STRING,
            allowNull: false
        },

        read: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        }
    });

    Notification.associate = (models) => {
        Notification.belongsTo(models.User, { foreignKey: "userId" });
    };

    return Notification;
};
