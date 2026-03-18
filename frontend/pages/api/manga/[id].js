import dbConnect from '../../../lib/dbConnect.js';
import Manga from '../../../lib/api/Manga.js';
import { getAuth } from '@clerk/nextjs/server'; // Import Clerk Auth

export default async function handler(req, res) {
    await dbConnect();
    const { userId } = getAuth(req);
    const { id } = req.query;

    if (!userId) return res.status(401).end();

    if (req.method === 'DELETE') {
        try {
            // Find AND Delete only if it belongs to this user
            const deleted = await Manga.findOneAndDelete({ _id: id, userId });
            if (!deleted) return res.status(404).json({ error: "Unauthorized or Not Found" });
            res.status(204).send();
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    } 
    
    else if (req.method === 'PATCH') {
        try {
            // Find AND Update only if it belongs to this user
            const updatedManga = await Manga.findOneAndUpdate(
                { _id: id, userId }, 
                { 
                    $set: {
                        status: req.body.status,
                        rating: req.body.rating
                    }
                }, 
                { new: true }
            );
            if (!updatedManga) return res.status(404).json({ error: "Unauthorized or Not Found" });
            res.status(200).json(updatedManga);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    } 
    else {
        res.status(405).end();
    }
}