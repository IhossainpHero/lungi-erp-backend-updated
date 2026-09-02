import mongoose from 'mongoose';
const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) throw new Error('MONGODB_URI is not defined in .env');

    const conn = await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // 🔧 সাময়িক ফিক্স: পুরনো phone_1 unique index মুছে ফেলা
    try {
      await mongoose.connection.collection('users').dropIndex('phone_1');
      console.log('✅ পুরনো phone_1 index মুছে ফেলা হয়েছে');
    } catch (e: any) {
      if (e.codeName !== 'IndexNotFound') console.log('Index drop skip:', e.message);
    }
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;