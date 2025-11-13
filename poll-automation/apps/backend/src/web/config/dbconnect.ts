import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGO_URI || '',
};

export const connectDB = async () => {
  const maxRetries = 5;
  const retryDelay = 2000; // 2 seconds

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await mongoose.connect(config.mongoUri, {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });
      console.log('✅ Connected to MongoDB');
      return;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      console.log(`❌ MongoDB connection attempt ${attempt}/${maxRetries} failed:`, errorMessage);
      
      if (attempt === maxRetries) {
        console.error('❌ All MongoDB connection attempts failed - continuing without MongoDB');
        // Don't exit, let the application run without MongoDB
        return;
      }
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
};
