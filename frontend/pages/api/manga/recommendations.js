import dbConnect from '../../../lib/dbConnect';
import Manga from '../../../lib/api/Manga.js';

const ALL_GENRES = [
    "Action", "Adventure", "Comedy", "Drama", "Sci-Fi", "Space", "Mystery", 
    "Magic", "Supernatural", "Police", "Fantasy", "Sports", "Romance", 
    "Slice of Life", "Racing", "Horror", "Psychological", "Thriller", 
    "Martial Arts", "Super Power", "School", "Ecchi", "Vampire", "Historical", 
    "Military", "Harem", "Mecha", "Demons", "Shounen", "Shoujo", "Seinen", 
    "Josei", "Gender Bender", "Game", "Music", "Post-Apocalyptic",
    "Space", "Zombie", "Ghost", "Tragedy", "Gore"
];

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    // Initialize data structures to prevent crashes if DB fails
    let list = [];
    let myKitsuIds = new Set();
    let genreScores = {};

    try {
        // 1. Attempt Database Connection
        await dbConnect();
        list = await Manga.find({});
        myKitsuIds = new Set(list.map(m => m.kitsuId));

        // 2. Calculate User Taste
        const statusBonus = (s) => {
            const status = s ? s.toLowerCase() : '';
            return status === 'reading' ? 5 : status === 'completed' ? 3 : 0;
        };

        list.forEach(m => {
            if (!m.genres || m.genres.length === 0) return;
            const weight = (Number(m.rating || 0) ** 2) + statusBonus(m.status);
            m.genres.forEach(g => {
                const formattedName = g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
                genreScores[formattedName] = (genreScores[formattedName] || 0) + weight;
            });
        });
    } catch (dbErr) {
        console.error("Database or Model Error:", dbErr.message);
        // We continue so the "Global Trending" can still load even if DB is down
    }

    try {
        const { genre } = req.query;
        const sortedGenres = Object.entries(genreScores).sort((a, b) => b[1] - a[1]);

        let targetGenres;
        if (genre) {
            targetGenres = [genre];
        } else if (sortedGenres.length > 0) {
            targetGenres = sortedGenres.slice(0, 3).map(g => g[0]);
        } else {
            targetGenres = ['Adventure']; // Default fallback
        }

        // 3. Fetch from Kitsu (Recommendations + Trending)
        const [recResults, trendingRes] = await Promise.all([
            Promise.all(targetGenres.map(tg => 
                fetch(`https://kitsu.io/api/edge/manga?filter[categories]=${tg}&sort=-averageRating&page[limit]=20`)
                .then(r => r.json())
            )),
            fetch(`https://kitsu.io/api/edge/trending/manga?limit=20`).then(r => r.json())
        ]);

        const formatManga = (items) => (items || [])
            .filter((item, index, self) => item && index === self.findIndex((t) => t.id === item.id))
            .map(item => ({
                kitsuId: item.id,
                title: item.attributes.titles.en || item.attributes.titles.en_jp,
                coverImage: item.attributes.posterImage?.small,
                synopsis: item.attributes.synopsis,
                status: 'Recommended',
                rating: item.attributes.averageRating ? Math.round(item.attributes.averageRating / 10) : null
            }));

        const recommendations = recResults.flatMap(r => r.data || [])
            .filter(item => !myKitsuIds.has(item.id))
            .slice(0, 20);

        const uniqueGenres = [...new Set([...ALL_GENRES, ...Object.keys(genreScores)])].sort();

        res.status(200).json({
            selectedGenre: targetGenres.join(", "),
            availableGenres: uniqueGenres,
            basedOnTaste: formatManga(recommendations),
            trending: formatManga(trendingRes.data || [])
        });

    } catch (apiErr) {
        console.error("Kitsu API Error:", apiErr.message);
        res.status(500).json({ error: "Failed to fetch recommendations" });
    }
}