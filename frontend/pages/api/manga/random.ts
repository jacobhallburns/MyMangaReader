import type { NextApiRequest, NextApiResponse } from 'next';
import { getRandomKitsu, extractKitsuMeta } from '../../../lib/kitsu';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const { data } = await getRandomKitsu(5);

    if (!data?.length) {
      return res.status(200).json({ manga: null });
    }

    const item = data[Math.floor(Math.random() * data.length)];
    const meta = extractKitsuMeta(item);

    console.log('[Random]', {
      event: 'spin',
      kitsuId: meta.kitsuId,
      title: meta.title,
    });

    return res.status(200).json({
      manga: {
        kitsuId: meta.kitsuId,
        title: meta.title,
        altTitles: meta.altTitles,
        posterImage: meta.coverUrl ?? null,
        synopsis: meta.synopsis,
        author: meta.author,
        genres: meta.genres,
        volumeCount: meta.volumeCount,
        chapterCount: meta.chapterCount,
        averageRating: 0,
        ratingCount: 0,
        userRating: 0,
        _raw: item,
      },
    });
  } catch (err: any) {
    console.error('[Random]', {
      event: 'error',
      error: err.message,
    });

    return res.status(500).json({
      error: 'Failed to fetch random manga',
    });
  }
}