import dbConnect from '../../../lib/dbConnect.js';
import Manga from '../../../lib/api/Manga.js';

export default async function handler(req, res) {
    await dbConnect();
    
    // Next.js automatically populates 'id' from the filename [id].js
    const { id } = req.query; 

    if (req.method === 'DELETE') {
        try {
            // Deletes manga by the ID passed in the URL
            await Manga.findByIdAndDelete(id);
            res.status(204).send();
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    } 
    
    else if (req.method === 'PATCH') {
        try {
            // Updates status and rating of manga by ID
            const updatedManga = await Manga.findByIdAndUpdate(
                id, 
                { 
                    $set: {
                        status: req.body.status,
                        rating: req.body.rating
                    }
                }, 
                { new: true }
            );
            res.status(200).json(updatedManga);
        } catch (err) {
            res.status(400).json({ error: err.message });
        }
    } 
    
    else {
        res.setHeader('Allow', ['DELETE', 'PATCH']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}