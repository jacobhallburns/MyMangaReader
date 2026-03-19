import dbConnect from '../../../lib/dbConnect';
import UserManga from '../../../lib/api/UserManga';
import Manga from '../../../lib/api/Manga'; // Required for .populate() to work
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
                // Find user's personal entries and pull the Global Manga data
                const collection = await UserManga.find({ userId })
                    .populate('mangaId') 
                    .lean();
                res.status(200).json(collection);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
            break;

        case 'POST':
            // Note: We usually use /api/manga/add for the complex Kitsu sync,
            // but if you want to keep POST here, it works like this:
            try {
                const { mangaId, status, rating } = req.body;
                const newEntry = new UserManga({
                    userId,
                    mangaId, // This must be the MongoDB _id of the Manga
                    status: status || 'plan_to_read',
                    rating: rating || 0
                });
                const saved = await newEntry.save();
                res.status(201).json(saved);
            } catch (err) {
                res.status(400).json({ error: err.message });
            }
            break;

        default:
            res.setHeader('Allow', ['GET', 'POST']);
            res.status(405).end(`Method ${method} Not Allowed`);
    }
}