import 'server-only';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

type Cache = { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };

// 开发时热更新会重复执行模块，把连接缓存挂在 global 上避免连接数暴涨
const globalForMongoose = global as unknown as { mongoose?: Cache };
const cached: Cache = globalForMongoose.mongoose ?? { conn: null, promise: null };
globalForMongoose.mongoose = cached;

export default async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('缺少环境变量 MONGODB_URI');
  }

  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000,
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    // 清空缓存，下次请求可以重试
    cached.promise = null;
    throw error;
  }
}
