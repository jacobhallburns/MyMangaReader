import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';

const app = express();
const PORT = process.env.PORT || 5000;

const dbUrl = process.env.DB_URL;

mongoose.connect(dbUrl)
    .then(() => console.log('Connected to DB'))
    .catch(err => console.error('DB connection error:', err));

app.get('/', (req, res) => {
    res.send('Backend is working!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
});
