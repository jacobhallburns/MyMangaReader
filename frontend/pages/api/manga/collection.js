import dbConnect from '../../../lib/dbConnect.js';
import Manga from '../../../lib/api/Manga.js';

export default async function handler(req, res) {
    // Ensure the database is connected before processing the request
    await dbConnect();

    const { method } = req;

    switch (method) {
        case 'GET':
            try {
                // Gets all manga from the database
                const manga = await Manga.find();
                res.status(200).json(manga);
            } catch (err) {
                console.error(err);
                res.status(500).json({ error: err.message });
            }
            break;

        case 'POST':
            try {
                // Adds a new manga to the database
                const newManga = new Manga(req.body);
                const saved = await newManga.save();
                res.status(201).json(saved);
            } catch (err) {
                res.status(400).json({ error: err.message });
            }
            break;

        default:
            // If a method other than GET or POST is used
            res.setHeader('Allow', ['GET', 'POST']);
            res.status(405).end(`Method ${method} Not Allowed`);
            break;
    }
}