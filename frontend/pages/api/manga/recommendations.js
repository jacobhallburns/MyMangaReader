import dbConnect from '../../../lib/dbConnect';
import UserManga from '../../../lib/api/UserManga';
import Manga from '../../../lib/api/Manga';
import { getAuth } from '@clerk/nextjs/server';
import { extractMeta, getCoverUrl, getMangaDexTags, getMangaDexByTag, getTrendingMangaDex, getRandomMangaDex } from '../../../lib/mangadex';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { userId } = getAuth(req);
    let myMangaDexIds = new Set();
    let myRatingsMap = new Map();
    let genreScores = {};

    try {
        await dbConnect();
        if (userId) {
            const list = await UserManga.find({ userId }).populate('mangaId').lean();
            myMangaDexIds = new Set(list.map(entry => entry.mangaId?.mangaDexId).filter(Boolean));
            list.forEach(entry => {
                const globalData = entry.mangaId;
                if (!globalData?.mangaDexId) return;
                if (entry.rating > 0) myRatingsMap.set(globalData.mangaDexId, entry.rating);
                if (!globalData?.genres) return;
                // Positive weight for liked genres, slight penalty for disliked
                const rating = Number(entry.rating || 0);
                const activityBase = entry.status === 'reading' ? 5 : 2;
                const ratingContrib = rating === 0 ? 0 : (rating - 5) * 2; // -8 to +10, neutral at 5
                const weight = activityBase + ratingContrib;
                globalData.genres.forEach(g => {
                    const key = g.charAt(0).toUpperCase() + g.slice(1).toLowerCase();
                    genreScores[key] = (genreScores[key] || 0) + weight;
                });
            });
        }
    } catch (dbErr) {
        console.error('[Recommendations] DB error:', dbErr.message);
    }

    try {
        const { genre } = req.query;
        const sortedGenres = Object.entries(genreScores).sort((a, b) => b[1] - a[1]);

        let targetGenres = [];
        if (genre) {
            targetGenres = [genre];
        } else if (sortedGenres.length > 0) {
            targetGenres = sortedGenres.slice(0, 3).map(([g]) => g);
        }

        const tagMap = await getMangaDexTags();

        // Sequential to respect MangaDex rate limiting
        const recResults = [];
        for (const tg of targetGenres) {
            const tagId = tagMap[tg];
            if (!tagId) { recResults.push({ data: [] }); continue; }
            try {
                recResults.push(await getMangaDexByTag(tagId, 20));
            } catch {
                recResults.push({ data: [] });
            }
        }

        let trendingResult = { data: [] };
        try {
            trendingResult = await getTrendingMangaDex(30);
        } catch (err) {
            console.error('[Recommendations] Trending failed:', err.message);
        }

        let randomResult = { data: [] };
        try {
            randomResult = await getRandomMangaDex(20);
        } catch (err) {
            console.error('[Recommendations] Random pool failed:', err.message);
        }

        const isDoujinshi = (item) =>
            (item.attributes?.tags ?? []).some(
                t => t.attributes?.group === 'format' && t.attributes?.name?.en === 'Doujinshi'
            );

        // Build candidate pool — filter first, then add slight session variance before capping
        let candidates = recResults.flatMap(r => r.data || [])
            .filter((item, idx, self) => item && !isDoujinshi(item) && idx === self.findIndex(t => t.id === item.id))
            .filter(item => !myMangaDexIds.has(item.id));

        // Small shuffle so recommendations vary slightly between sessions
        for (let i = candidates.length - 1; i > 0; i--) {
            if (Math.random() < 0.3) {
                const j = Math.floor(Math.random() * (i + 1));
                [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
            }
        }

        const recommendations = candidates.slice(0, 50);

        // Random pool for the randomizer card (excludes genre recommendations)
        const recIds = new Set(recommendations.map(m => m.id));
        const randomPool = (randomResult.data || [])
            .filter(item => item && !isDoujinshi(item) && !myMangaDexIds.has(item.id) && !recIds.has(item.id));

        // Bulk-fetch stored ratings for all items
        const allItems = [...recommendations, ...(trendingResult.data || []), ...randomPool];
        const mangaDexIds = [...new Set(allItems.map(item => item.id).filter(Boolean))];
        const mangaRecords = await Manga.find(
            { mangaDexId: { $in: mangaDexIds } },
            'mangaDexId averageRating ratingCount'
        ).lean();
        const dbRatingMap = new Map(mangaRecords.map(m => [m.mangaDexId, m]));

        const formatManga = (items) => (items || [])
            .filter((item, idx, self) => item && !isDoujinshi(item) && idx === self.findIndex(t => t.id === item.id))
            .map(item => {
                const meta = extractMeta(item);
                const coverRel = (item.relationships || []).find(r => r.type === 'cover_art');
                const posterImage = coverRel?.attributes?.fileName
                    ? getCoverUrl(item.id, coverRel.attributes.fileName, 512)
                    : null;
                const dbRecord = dbRatingMap.get(item.id);
                return {
                    mangaDexId: item.id,
                    title: meta.title,
                    altTitles: meta.altTitles,
                    posterImage,
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
            availableGenres: Object.keys(tagMap).sort(),
            basedOnTaste: formatManga(recommendations),
            trending: formatManga((trendingResult.data || []).filter(item => !myMangaDexIds.has(item.id))),
            randomPool: formatManga(randomPool),
        });

    } catch (apiErr) {
        console.error('[Recommendations] API error:', apiErr.message);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
}
