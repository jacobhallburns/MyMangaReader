import express from 'express';
import Manga from '../models/Manga.js';

const router = express.Router();

router.get('/', async (req, res) => {
   const { userId } = req.query;
   if (!userId) return res.status(400).json({error: 'userID required'});

   const list = await Manga.find({ userId });

   const statusBonus = (s) => (s === 'reading' ? 3 : s === 'completed' ? 2 : s === 'on-hold' ? 1 : 0);

   const weighted = list.map(m =>{
      const weight = (Number(m.rating ?? 0) * 2) + statusBonus(m.status ?? '');
      return { ...m.toObject(), weight};
   });
})