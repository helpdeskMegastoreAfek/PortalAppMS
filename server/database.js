// server/database.js

require('dotenv').config();
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');

const mysqlPool = mysql.createPool({
    host: process.env.MYSQL_HOST || '10.0.0.106',
    user: process.env.MYSQL_USER || 'israelRead',
    password: process.env.MYSQL_PASSWORD || 'israel@kls123',
    database: process.env.MYSQL_DATABASE || 'israelwms',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const connectToMongo = async () => {
    try {
        const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/your_db_name';
        await mongoose.connect(mongoURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log("MongoDB Connected Successfully");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error.message);
        process.exit(1);
    }
};

module.exports = {
    mysqlPool,
    connectToMongo
};