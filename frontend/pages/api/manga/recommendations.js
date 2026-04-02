import dbConnect from '../../../lib/dbConnect';
import Manga from '../../../lib/api/Manga';
import UserManga from '../../../lib/api/UserManga'; 
import { getAuth } from '@clerk/nextjs/server';

const ALL_GENRES = [
    "Action", "Adventure", "Comedy", "Drama", "Sci-Fi", "Mystery", 
    "Magic", "Supernatural", "Fantasy", "Sports", "Romance", 
    "Slice of Life", "Horror", "Psychological", "Thriller", 
    "Martial Arts", "School", "Historical", "Military", "Mecha", 
    "Demons", "Shounen", "Shoujo", "Seinen", "Josei", "Game"
];

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { userId } = getAuth(req);
    let list = [];
    let myKitsuIds = new Set();
    let genreScores = {};

    try {
        await dbConnect();

        if (userId) {
            // 1. Fetch user's personal list and POPULATE the global manga data
            // This is the key change from your old version
            list = await UserManga.find({ userId }).populate('mangaId').lean();
            
            myKitsuIds = new Set(list.map(entry => entry.mangaId?.kitsuId));

            // 2. Calculate taste based on the populated genres and user's rating
            list.forEach(entry => {
                const globalData = entry.mangaId;
                if (!globalData || !globalData.genres) return;

                // Weight based on user's personal rating and status
                const weight = (Number(entry.rating || 0) ** 2) + (entry.status === 'reading' ? 5 : 2);
                
                globalData.genres.forEach(g => {
                    const formatted = g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
                    genreScores[formatted] = (genreScores[formatted] || 0) + weight;
                });
            });
        }
    } catch (dbErr) {
        console.error("Taste Calculation Error:", dbErr.message);
    }

    try {
        const { genre } = req.query;
        const sortedGenres = Object.entries(genreScores).sort((a, b) => b[1] - a[1]);
        
        let targetGenres = [];
        if (genre) {
            targetGenres = [genre];
        } else if (sortedGenres.length > 0) {
            targetGenres = sortedGenres.slice(0, 3).map(g => g[0]);
        } 

        // 3. Fetch from Kitsu (Optimized safety check)
        const recResults = targetGenres.length > 0 
            ? await Promise.all(
                targetGenres.map(async (tg) => {
                    try {
                        const res = await fetch(`https://kitsu.io/api/edge/manga?filter[categories]=${tg}&sort=-averageRating&page[limit]=15`);
                        if (!res.ok) return { data: [] };
                        return await res.json();
                    } catch {
                        return { data: [] };
                    }
                })
            )
            : [];

        let trendingData = { data: [] };

        try {
            const res = await fetch(`https://kitsu.io/api/edge/trending/manga?limit=15`);
            if (res.ok) {
                trendingData = await res.json();
            }
        } catch (err) {
            console.error("Trending fetch failed:", err.message);
        }
        // 4. Unified Formatter
        const formatManga = (data) => (data || [])
            .filter((item, index, self) => item && index === self.findIndex((t) => t.id === item.id))
            .map(item => ({
                kitsuId: item.id,
                title: item.attributes.canonicalTitle || item.attributes.titles.en_jp,
                posterImage: item.attributes.posterImage?.large || item.attributes.posterImage?.medium,
                synopsis: item.attributes.synopsis,
                rating: item.attributes.averageRating ? (item.attributes.averageRating / 10).toFixed(1) : "N/A"
            }));

        const recommendations = recResults.flatMap(r => r.data || [])
            .filter(item => !myKitsuIds.has(item.id)) 
            .slice(0, 15);

        const uniqueGenres = [...new Set([...ALL_GENRES, ...Object.keys(genreScores)])].sort();

        res.status(200).json({
            selectedGenre: targetGenres.join(", "),
            availableGenres: uniqueGenres,
            basedOnTaste: formatManga(recommendations),
            trending: formatManga(trendingData.data || []) // Using the cleaned up variable
        });

    } catch (apiErr) {
        console.error("API Error:", apiErr.message);
        res.status(500).json({ error: "Failed to fetch data" });
    }
}