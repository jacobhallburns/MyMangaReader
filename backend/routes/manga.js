import express from 'express';
import Manga from '../models/Manga.js';
const router = express.Router();

// Gets all manga from db
router.get('/', async (req, res) => {
    const manga = await Manga.find();
    res.json(manga);
});

// Adds a new manga to db
router.post('/', async (req, res) => {
    try {
        const newManga = new Manga(req.body);   // Creates new manga doc
        const saved = await newManga.save();    // Saves to db
        res.status(201).json(saved);
    } catch (err) {
        res.status(400).json({ error: err.message});
    }
});

// Deletes manga (by ID)
router.delete('/:id', async (req, res) => {
    try {
        await Manga.findByIdAndDelete(req.params.id);
        res.status(204).send();
    } catch (err) {
        res.status(400).json({ error: err.message});
    }
});

export default router;
