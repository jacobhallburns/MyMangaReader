import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null; // Clear the failed promise so we can try again
    throw e;
  }

  // One-time migration: drop the old non-sparse unique index on kitsuId.
  // Without sparse:true, the unique index rejects multiple null kitsuId values,
  // blocking every MangaDex add after the first.
  if (!cached._kitsuIdxDropped) {
    cached._kitsuIdxDropped = true;
    try {
      await cached.conn.connection.db.collection('mangas').dropIndex('kitsuId_1');
      console.log('[DB] Dropped legacy kitsuId_1 unique index');
    } catch (e) { /* already gone or never existed — no-op */ }
  }

  return cached.conn;
}

export default dbConnect;