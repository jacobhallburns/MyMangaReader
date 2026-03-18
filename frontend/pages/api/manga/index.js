import dbConnect from '../../../lib/db.js';
import Manga from '../../../models/Manga.js';
import mongoose from 'mongoose';

export default async function handler(req, res) {
  await dbConnect();

  if (req.method === 'GET') {
    try {
      // 1 = connected
      if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ error: 'Database not connected yet' });
      }

      const manga = await Manga.find();
      res.status(200).json(manga);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  } else if (req.method === 'POST') {
    try {
      const newManga = new Manga(req.body);   // Creates new manga doc
      const saved = await newManga.save();    // Saves to db
      res.status(201).json(saved);
    } catch (err) {
      res.status(400).json({ error: err.message});
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
