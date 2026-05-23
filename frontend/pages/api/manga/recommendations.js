import dbConnect from '../../../lib/dbConnect';
import UserManga from '../../../lib/api/UserManga';
import Manga from '../../../lib/api/Manga';
import { getAuth } from '@clerk/nextjs/server';
import { extractAniListMeta, getAniListGenres, getAniListByGenre, getTrendingAniList, getRandomAniList } from '../../../lib/anilist';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { userId } = getAuth(req);
    let myAnilistIds = new Set();
    let myRatingsMap = new Map();
    let genreScores = {};

    try {
        await dbConnect();
        if (userId) {
            const list = await UserManga.find({ userId }).populate('mangaId').lean();
            myAnilistIds = new Set(list.map(entry => entry.mangaId?.anilistId).filter(Boolean));
            list.forEach(entry => {
                const globalData = entry.mangaId;
                if (!globalData?.anilistId) return;
                if (entry.rating > 0) myRatingsMap.set(globalData.anilistId, entry.rating);
                if (!globalData?.genres) return;
                const rating = Number(entry.rating || 0);
                const activityBase = entry.status === 'reading' ? 5 : 2;
                const ratingContrib = rating === 0 ? 0 : (rating - 5) * 2;
                const weight = activityBase + ratingContrib;
                globalData.genres.forEach(g => {
                    genreScores[g] = (genreScores[g] || 0) + weight;
                });
            });
        }
    } catch (dbErr) {
        console.error('[Recommendations] DB error:', dbErr.message);
    }

    try {
        const { genre } = req.query;
        const sortedGenres = Object.entries(genreScores).sort((a, b) => b[1] - a[1]);
        const availableGenres = getAniListGenres();

        let targetGenres = [];
        if (genre) {
            targetGenres = [genre];
        } else if (sortedGenres.length > 0) {
            targetGenres = sortedGenres.slice(0, 3).map(([g]) => g);
        }

        // Sequential to respect AniList rate limiting
        const recResults = [];
        for (const tg of targetGenres) {
            try {
                recResults.push(await getAniListByGenre(tg, 20));
            } catch {
                recResults.push({ data: [] });
            }
        }

        let trendingResult = { data: [] };
        try {
            trendingResult = await getTrendingAniList(25);
        } catch (err) {
            console.error('[Recommendations] Trending failed:', err.message);
        }

        let randomResult = { data: [] };
        try {
            randomResult = await getRandomAniList(20);
        } catch (err) {
            console.error('[Recommendations] Random pool failed:', err.message);
        }

        // Build candidate pool
        let candidates = recResults.flatMap(r => r.data || [])
            .filter((item, idx, self) => item && idx === self.findIndex(t => t.id === item.id))
            .filter(item => !myAnilistIds.has(item.id));

        // Slight shuffle for session variance
        for (let i = candidates.length - 1; i > 0; i--) {
            if (Math.random() < 0.3) {
                const j = Math.floor(Math.random() * (i + 1));
                [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
            }
        }

        const recommendations = candidates.slice(0, 50);

        const recIds = new Set(recommendations.map(m => m.id));
        const randomPool = (randomResult.data || [])
            .filter(item => item && !myAnilistIds.has(item.id) && !recIds.has(item.id));

        // Bulk-fetch stored ratings
        const allItems = [...recommendations, ...(trendingResult.data || []), ...randomPool];
        const anilistIds = [...new Set(allItems.map(item => item.id).filter(Boolean))];
        const mangaRecords = await Manga.find(
            { anilistId: { $in: anilistIds } },
            'anilistId averageRating ratingCount'
        ).lean();
        const dbRatingMap = new Map(mangaRecords.map(m => [m.anilistId, m]));

        const formatManga = (items) => (items || [])
            .filter((item, idx, self) => item && idx === self.findIndex(t => t.id === item.id))
            .map(item => {
                const meta = extractAniListMeta(item);
                const dbRecord = dbRatingMap.get(item.id);
                return {
                    anilistId: item.id,
                    title: meta.title,
                    altTitles: meta.altTitles,
                    posterImage: meta.coverUrl ?? null,
                    synopsis: meta.synopsis,
                    author: meta.author,
                    genres: meta.genres,
                    averageRating: dbRecord?.averageRating ?? 0,
                    ratingCount: dbRecord?.ratingCount ?? 0,
                    userRating: myRatingsMap.get(item.id) ?? 0,
                    _raw: item,
                };
            });

        res.status(200).json({
            selectedGenre: targetGenres.join(', '),
            availableGenres,
            basedOnTaste: formatManga(recommendations),
            trending: formatManga((trendingResult.data || []).filter(item => !myAnilistIds.has(item.id))),
            randomPool: formatManga(randomPool),
        });

    } catch (apiErr) {
        console.error('[Recommendations] API error:', apiErr.message);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
}
