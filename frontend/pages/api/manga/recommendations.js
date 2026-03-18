import dbConnect from '../../../lib/dbConnect';
import Manga from '../../../lib/api/Manga';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        await dbConnect();
        const { genre } = req.query; 
        const list = await Manga.find({});
        const myKitsuIds = new Set(list.map(m => m.kitsuId));

        // ... Keep your existing logic for ALL_GENRES, scores, and fetching ...
        // Replace 'res.json(...)' at the end with:
        return res.status(200).json({
            selectedGenre: targetGenres.join(", "),
            availableGenres: uniqueGenres,
            basedOnTaste: formatManga(recommendations),
            trending: formatManga(trendingData.data || [])
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}