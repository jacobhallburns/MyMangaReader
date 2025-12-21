import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import mangaRoutes from '../routes/manga.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const dbUrl = process.env.DB_URL;

if (!dbUrl) {
  throw new Error("DB_URL is not set. Check your .env file.");
}

// Routes
app.use('/api/manga', mangaRoutes);

app.get('/', (req, res) => {
  res.send('Backend is working!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// connect in background with retry
async function connectWithRetry() {
  while (true) {
    try {
      await mongoose.connect(dbUrl);
      console.log('Connected to DB');
      break;
    } catch (err) {
      console.error('DB connection error:', err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}
connectWithRetry();
