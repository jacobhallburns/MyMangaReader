import type { NextApiRequest, NextApiResponse } from 'next';
import { getRandomAniList, extractAniListMeta } from '../../../lib/anilist';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const { data } = await getRandomAniList(5);
    if (!data?.length) return res.status(200).json({ manga: null });

    const item = data[Math.floor(Math.random() * data.length)];
    const meta = extractAniListMeta(item);

    console.log('[Random]', { event: 'spin', anilistId: item.id, title: meta.title });

    return res.status(200).json({
      manga: {
        anilistId: item.id,
        title: meta.title,
        altTitles: meta.altTitles,
        posterImage: meta.coverUrl ?? null,
        synopsis: meta.synopsis,
        author: meta.author,
        genres: meta.genres,
        averageRating: 0,
        ratingCount: 0,
        userRating: 0,
        _raw: item,
      },
    });
  } catch (err: any) {
    console.error('[Random]', { event: 'error', error: err.message });
    return res.status(500).json({ error: 'Failed to fetch random manga' });
  }
}
