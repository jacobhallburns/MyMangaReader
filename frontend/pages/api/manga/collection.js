import dbConnect from '../../../lib/dbConnect.js';
import Manga from '../../../lib/api/Manga.js';
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
                // ONLY find manga belonging to THIS user
                const manga = await Manga.find({ userId });
                res.status(200).json(manga);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
            break;

        case 'POST':
            try {
                // Attach the userId to the new manga record
                const newManga = new Manga({
                    ...req.body,
                    userId
                });
                const saved = await newManga.save();
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