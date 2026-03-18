import dbConnect from '../../../lib/dbConnect';
import Manga from '../../../lib/api/Manga';

export default async function handler(req, res) {
    if (req.method !== 'GET') return res.status(405).end();

    try {
        await dbConnect();
        const { genre } = req.query;
        const list = await Manga.find({});
        const myKitsuIds = new Set(list.map(m => m.kitsuId));

        // 1. Restore the Weighting System
        const genreScores = {};
        list.forEach(m => {
            if (!m.genres) return;
            const weight = (Number(m.rating || 0) ** 2) + (m.status === 'Reading' ? 5 : 3);
            m.genres.forEach(g => {
                const formatted = g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
                genreScores[formatted] = (genreScores[formatted] || 0) + weight;
            });
        });

        const sortedGenres = Object.entries(genreScores).sort((a, b) => b[1] - a[1]);
        let targetGenres = genre ? [genre] : sortedGenres.slice(0, 3).map(g => g[0]);
        if (targetGenres.length === 0) targetGenres = ['Adventure'];

        // 2. Smart Digging Fetch
        let recommendations = [];
        for (const target of targetGenres) {
            const kitsuRes = await fetch(`https://kitsu.io/api/edge/manga?filter[categories]=${target}&sort=-averageRating&page[limit]=10`);
            const data = await kitsuRes.json();
            const filtered = (data.data || []).filter(item => !myKitsuIds.has(item.id));
            recommendations.push(...filtered);
        }

        res.status(200).json({
            selectedGenre: targetGenres.join(", "),
            basedOnTaste: recommendations.slice(0, 20), // Truncate to top 20
            // ... add trending fetch here ...
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}