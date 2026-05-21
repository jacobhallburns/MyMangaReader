import dbConnect from '../../../lib/dbConnect';
import UserManga from '../../../lib/api/UserManga';
import Manga from '../../../lib/api/Manga';
import { getAuth } from '@clerk/nextjs/server';
import { extractMeta, getCoverUrl, getMangaDexTags, getMangaDexByTag, getTrendingMangaDex } from '../../../lib/mangadex';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { userId } = getAuth(req);
    let myMangaDexIds = new Set();
    let myRatingsMap = new Map(); // mangaDexId -> user's rating
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
                const weight = (Number(entry.rating || 0) ** 2) + (entry.status === 'reading' ? 5 : 2);
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
                recResults.push(await getMangaDexByTag(tagId, 15));
            } catch {
                recResults.push({ data: [] });
            }
        }

        let trendingResult = { data: [] };
        try {
            trendingResult = await getTrendingMangaDex(15);
        } catch (err) {
            console.error('[Recommendations] Trending failed:', err.message);
        }

        const isDoujinshi = (item) =>
            (item.attributes?.tags ?? []).some(
                t => t.attributes?.group === 'format' && t.attributes?.name?.en === 'Doujinshi'
            );

        const recommendations = recResults.flatMap(r => r.data || [])
            .filter((item, idx, self) => item && !isDoujinshi(item) && idx === self.findIndex(t => t.id === item.id))
            .filter(item => !myMangaDexIds.has(item.id))
            .slice(0, 15);

        // Bulk-fetch stored ratings for all items we're about to return
        const allItems = [...recommendations, ...(trendingResult.data || [])];
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
            trending: formatManga(trendingResult.data || []),
        });

    } catch (apiErr) {
        console.error('[Recommendations] API error:', apiErr.message);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
}
