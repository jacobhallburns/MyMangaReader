import dbConnect from '../../../lib/dbConnect';
import Manga from '../../../lib/api/Manga'; // 

export default async function handler(req, res) {
    const { method } = req;
    const { id } = req.query; // Handles the /api/manga/collection?id=... logic

    await dbConnect();

    switch (method) {
        case 'GET':
            try {
                const manga = await Manga.find({}); // [cite: 23]
                res.status(200).json(manga);
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
            break;

        case 'POST':
            try {
                const newManga = await Manga.create(req.body); // [cite: 24]
                res.status(201).json(newManga);
            } catch (err) {
                res.status(400).json({ error: err.message });
            }
            break;

        case 'PATCH':
            try {
                const updatedManga = await Manga.findByIdAndUpdate(
                    id, 
                    { $set: { status: req.body.status, rating: req.body.rating }}, // [cite: 26]
                    { new: true }
                );
                if (!updatedManga) return res.status(404).json({ error: "Manga not found" });
                res.status(200).json(updatedManga);
            } catch (err) {
                res.status(400).json({ error: err.message });
            }
            break;

        case 'DELETE':
            try {
                const deletedManga = await Manga.findByIdAndDelete(id); // [cite: 25]
                if (!deletedManga) return res.status(404).json({ error: "Manga not found" });
                res.status(204).end();
            } catch (err) {
                res.status(400).json({ error: err.message });
            }
            break;

        default:
            res.setHeader('Allow', ['GET', 'POST', 'PATCH', 'DELETE']);
            res.status(405).end(`Method ${method} Not Allowed`);
    }
}