import dbConnect from '../../../lib/dbConnect';
import UserManga from '../../../lib/api/UserManga';
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(req, res) {
    await dbConnect();
    const { userId } = getAuth(req);
    const { id } = req.query; 

    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (req.method === 'PATCH') {
        try {
            const { status, rating, notes } = req.body;
            
            const updated = await UserManga.findOneAndUpdate(
                { _id: id, userId }, 
                { 
                    $set: { 
                        status, 
                        rating, 
                        notes 
                    } 
                }, 
                { new: true }
            );

            if (!updated) return res.status(404).json({ error: "Entry not found" });
            return res.status(200).json(updated);
        } catch (err) {
            console.error("Update Error:", err);
            return res.status(400).json({ error: err.message });
        }
    } 
    
    if (req.method === 'DELETE') {
        try {
            const deleted = await UserManga.findOneAndDelete({ _id: id, userId });
            if (!deleted) return res.status(404).json({ error: "Entry not found" });
            return res.status(204).send();
        } catch (err) {
            return res.status(400).json({ error: err.message });
        }
    }

    res.setHeader('Allow', ['PATCH', 'DELETE']);
    return res.status(405).end();
}