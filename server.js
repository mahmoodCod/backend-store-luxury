const app = require("./app");
const dotenv = require('dotenv');
const mongoose = require('mongoose');

dotenv.config();
const isProdoctionMode = process.env.NODE_ENV === 'production';

async function connectToDB() {
    try {
        const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/shop_2';
        
        if (!process.env.MONGO_URL && isProdoctionMode) {
            console.error('Error: MONGO_URL environment variable is required in production mode');
            process.exit(1);
        }
        
        await mongoose.connect(mongoUrl);
        console.log(`MongoDB connected: ${mongoose.connection.host}`);

    } catch (err) {
        console.error(`Error in mongoose connection: ${err.message}`);
        if (err.message.includes('ECONNREFUSED')) {
            console.error('Failed to connect to MongoDB. Please check:');
            console.error('1. MongoDB is running');
            console.error('2. MONGO_URL environment variable is set correctly');
            console.error('3. Network connectivity to MongoDB server');
        }
        // Fail fast to avoid running without persistence (products appearing to disappear)
        process.exit(1);
    };
};

async function startServer() {
    const port = process.env.PORT || 4000;

    app.listen(port, "0.0.0.0", () => {
        console.log(`Server is Running ${isProdoctionMode ? "production" : "development"} mode on port ${port}`);
    });
};

async function run() {
    await connectToDB();
    await startServer();
};

run();