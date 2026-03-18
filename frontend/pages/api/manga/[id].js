import dbConnect from '../../../lib/db.js';
import Manga from '../../../models/Manga.js';

export default async function handler(req, res) {
  await dbConnect();

  const { id } = req.query;

  if (req.method === 'DELETE') {
    try {
        await Manga.findByIdAndDelete(id);
        res.status(204).send();
    } catch (err) {
        res.status(400).json({ error: err.message});
    }
  } else if (req.method === 'PATCH') {
    try {
        const updatedManga = await Manga.findByIdAndUpdate(
            id, { $set: {
                status: req.body.status,
                rating: req.body.rating
            }}, {new: true}
        );
        res.status(200).json(updatedManga);
    } catch (err) {
        res.status(400).json({error: err.message});
    }
  } else {
    res.setHeader('Allow', ['DELETE', 'PATCH']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
