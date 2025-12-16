module.exports = (sequelize, DataTypes) => {
    const Item = sequelize.define('Item', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        title: {
            type: DataTypes.STRING,
            allowNull: false
        },

        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },

        status: {
            type: DataTypes.ENUM("AVAILABLE", "REQUESTED", "GIVEN_AWAY", "EXPIRED"),
            defaultValue: "AVAILABLE"
        },

        imageUrl: {
            type: DataTypes.STRING,
            allowNull: true
        },

        location: {
            type: DataTypes.STRING,
            allowNull: true
        }
    });

    return Item;
};
