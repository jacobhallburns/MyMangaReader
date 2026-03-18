import dbConnect from '../../../lib/dbConnect';
import Manga from '../../../lib/api/Manga.js';

// Master list to ensure dropdown is never empty
const ALL_GENRES = [
    "Action", "Adventure", "Comedy", "Drama", "Sci-Fi", "Space", "Mystery", 
    "Magic", "Supernatural", "Police", "Fantasy", "Sports", "Romance", 
    "Slice of Life", "Racing", "Horror", "Psychological", "Thriller", 
    "Martial Arts", "Super Power", "School", "Ecchi", "Vampire", "Historical", 
    "Military", "Harem", "Mecha", "Demons", "Shounen", "Shoujo", "Seinen", 
    "Josei", "Gender Bender", "Game", "Music", "Psychological", "Post-Apocalyptic",
    "Space", "Zombie", "Ghost", "Tragedy", "Gore"
];

export default async function handler(req, res) {
    // 1. Connect to MongoDB
    await dbConnect();

    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    try {
        const { genre } = req.query; 
        
        const list = await Manga.find({});
        // Create a fast lookup set of IDs you already own
        const myKitsuIds = new Set(list.map(m => m.kitsuId));

        // --- 1. CALCULATE WEIGHTS (To find your default genre) ---
        const statusBonus = (s) => {
            const status = s ? s.toLowerCase() : '';
            return status === 'reading' ? 5 : status === 'completed' ? 3 : 0;
        };

        const genreScores = {};

        list.forEach(m => {
            if (!m.genres || m.genres.length === 0) return;
            const ratingVal = m.rating ? Number(m.rating) : 0;
            // Heavily weight favorites: (Rating * Rating) + Status
            const weight = (ratingVal * ratingVal) + statusBonus(m.status);

            m.genres.forEach(g => {
                const genreName = g.toLowerCase();
                const formattedName = genreName.charAt(0).toUpperCase() + genreName.slice(1);
                genreScores[formattedName] = (genreScores[formattedName] || 0) + weight;
            });
        });

        const sortedGenres = Object.entries(genreScores).sort((a, b) => b[1] - a[1]);

        let targetGenres;
        if (genre) {
            targetGenres = [genre];
        } else if (sortedGenres.length > 0) {
            targetGenres = sortedGenres.slice(0, 3).map(g => g[0]);
        } else {
            targetGenres = ['Adventure'];
        }

        // --- 2. SMART "DIGGING" FETCH ---
        let recommendations = [];
        let seenIds = new Set();

        for (const targetGenre of targetGenres) {
            let offset = 0;
            let attempts = 0;
            const MAX_ATTEMPTS = 3;
            while (recommendations.length < 20 && attempts < MAX_ATTEMPTS) {
                const response = await fetch(`https://kitsu.io/api/edge/manga?filter[categories]=${targetGenre}&sort=-averageRating&page[limit]=20&page[offset]=${offset}`);
                const data = await response.json();

                if (!data.data || data.data.length === 0) break;
                for (const item of data.data) {
                    if (myKitsuIds.has(item.id)) continue;
                    if (seenIds.has(item.id)) continue;
                    recommendations.push(item);
                    seenIds.add(item.id);
                    if (recommendations.length >= 20) break;
                }
                offset += 20;
                attempts++;
            }
        }

        const trendingPromise = fetch(`https://kitsu.io/api/edge/trending/manga?limit=20`);
        const trendingRes = await trendingPromise;
        const trendingData = await trendingRes.json();
        
        // Helper to format for Frontend
        const formatManga = (items) => {
            return items
                .filter((item, index, self) => index === self.findIndex((t) => (t.id === item.id)))
                .slice(0, 20) 
                .map(item => ({
                    kitsuId: item.id,
                    title: item.attributes.titles.en || item.attributes.titles.en_jp,
                    coverImage: item.attributes.posterImage?.small,
                    synopsis: item.attributes.synopsis,
                    status: 'Recommended',
                    rating: item.attributes.averageRating ? Math.round(item.attributes.averageRating / 10) : null
                }));
        };

        // --- 3. MERGE GENRES FOR DROPDOWN ---
        const userKnownGenres = Object.keys(genreScores);
        const uniqueGenres = [...new Set([...ALL_GENRES, ...userKnownGenres])].sort();

        res.status(200).json({
            selectedGenre: targetGenres.join(", "),
            availableGenres: uniqueGenres, 
            basedOnTaste: formatManga(recommendations),
            trending: formatManga(trendingData.data || [])
        });

    } catch (err) {
        console.error("Rec Error:", err);
        res.status(500).json({ error: err.message });
    }
}