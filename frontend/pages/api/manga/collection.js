import dbConnect from '../../../lib/dbConnect';
import UserManga from '../../../lib/api/UserManga';
import Manga from '../../../lib/api/Manga'; // needed so populate('mangaId') works
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(req, res) {
    await dbConnect();

    const { userId } = getAuth(req);

    if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
    }

    const { method } = req;

    switch (method) {
        case 'GET':
            try {
                const collection = await UserManga.find({ userId })
                    .populate('mangaId')
                    .sort({ updatedAt: -1 })
                    .lean();

                return res.status(200).json(collection);
            } catch (err) {
                console.error('[Collection] GET error:', err);
                return res.status(500).json({ error: err.message });
            }

        case 'POST':
            try {
                const { mangaId, status, rating, notes } = req.body;

                if (!mangaId) {
                    return res.status(400).json({ error: 'mangaId is required' });
                }

                const newEntry = new UserManga({
                    userId,
                    mangaId,
                    status: status || 'plan_to_read',
                    rating: rating || 0,
                    notes: notes || '',
                });

                const saved = await newEntry.save();

                return res.status(201).json(saved);
            } catch (err) {
                console.error('[Collection] POST error:', err);
                return res.status(400).json({ error: err.message });
            }

        default:
            res.setHeader('Allow', ['GET', 'POST']);
            return res.status(405).end(`Method ${method} Not Allowed`);
    }
}