import express from 'express';
import Manga from '../models/Manga.js';
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        // OPTIONAL: If you want to filter by user later, uncomment lines below.
        // const { userId } = req.query;
        // const query = userId ? { userId } : {}; 
        const query = {}; 

        // 1. Fetch local library
        const list = await Manga.find(query);
        const myKitsuIds = new Set(list.map(m => m.kitsuId));

        // 2. Your Scoring Logic (Meshed)
        const statusBonus = (s) => {
            const status = s ? s.toLowerCase() : '';
            return status === 'reading' ? 3 : status === 'completed' ? 2 : status === 'on-hold' ? 1 : 0;
        };

        const genreScores = {};

        list.forEach(m => {
            if (!m.genres || m.genres.length === 0) return;

            // Your Formula: Rating * 2 + Status Bonus
            const ratingVal = m.rating ? Number(m.rating) : 0;
            const weight = (ratingVal * 2) + statusBonus(m.status);

            // Apply this weight to every genre this manga has
            m.genres.forEach(g => {
                const genreName = g.toLowerCase();
                genreScores[genreName] = (genreScores[genreName] || 0) + weight;
            });
        });

        // 3. Find Top Genre
        const sortedGenres = Object.entries(genreScores).sort((a, b) => b[1] - a[1]);
        const topGenre = sortedGenres.length > 0 ? sortedGenres[0][0] : 'adventure'; 

        // 4. Fetch from Kitsu (New Logic)
        const [genreRes, trendingRes] = await Promise.all([
            fetch(`https://kitsu.io/api/edge/manga?filter[categories]=${topGenre}&sort=-averageRating&page[limit]=15`),
            fetch(`https://kitsu.io/api/edge/trending/manga?limit=10`)
        ]);

        const genreData = await genreRes.json();
        const trendingData = await trendingRes.json();

        // 5. Helper to clean data
        const processKitsuResults = (kitsuResponse) => {
            if (!kitsuResponse || !kitsuResponse.data) return [];
            return kitsuResponse.data
                .filter(item => !myKitsuIds.has(item.id)) // Remove duplicates
                .map(item => ({
                    kitsuId: item.id,
                    title: item.attributes.titles.en || item.attributes.titles.en_jp,
                    coverImage: item.attributes.posterImage?.small,
                    synopsis: item.attributes.synopsis,
                    status: 'Recommended',
                    rating: item.attributes.averageRating ? Math.round(item.attributes.averageRating / 10) : null
                }));
        };

        res.json({
            topGenre: topGenre.charAt(0).toUpperCase() + topGenre.slice(1),
            basedOnTaste: processKitsuResults(genreData),
            trending: processKitsuResults(trendingData)
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

export default router;