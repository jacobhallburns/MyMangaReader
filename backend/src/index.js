import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import mangaRoutes from '../routes/manga.js'; // Manga API routes

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());            // Enables cross-origin resource sharing
app.use(express.json());    // Parses json request bodies

const dbUrl = process.env.DB_URL;

mongoose.connect(dbUrl)
    .then(() => console.log('Connected to DB'))
    .catch(err => console.error('DB connection error:', err));

// Routes
app.use('/api/manga', mangaRoutes);

// Route to confirm backend is working
app.get('/', (req, res) => {
    res.send('Backend is working!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
});
