import dotenv from 'dotenv'
dotenv.config()

const express = require('express');
const mongoose = require('mongoose');

const app = express();
const PORT = 5000;

const dbUrl = ProcessingInstruction.env.DB_URL;
mongoose.connect(dbUrl)
    .then(() => console.log('Connected to DB'))
    .catch(err => console.error('DB connection error:', err));

app.get('/', (req, res) => {
    res.send('Backend is working!');
});

app.listen(PORT, () => console.log('Server running on port ${PORT}'));