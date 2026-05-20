import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect from '../../../../lib/dbConnect';
import Manga from '../../../../lib/api/Manga';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { kitsuId, cursor } = req.query as { kitsuId: string; cursor?: string };

  try {
    const chaptersUrl = cursor
      ? cursor
      : `https://kitsu.io/api/edge/manga/${kitsuId}/chapters?sort=number&page[limit]=40`;

    const [chaptersRes, serializationRes] = await Promise.all([
      fetch(chaptersUrl, { headers: { Accept: 'application/vnd.api+json' } }),
      fetch(`https://kitsu.io/api/edge/manga/${kitsuId}?fields[manga]=serialization`, {
        headers: { Accept: 'application/vnd.api+json' },
      }),
    ]);

    if (!chaptersRes.ok) {
      const body = await chaptersRes.text().catch(() => '');
      throw new Error(`Kitsu chapters API returned ${chaptersRes.status} for manga ${kitsuId}. Body: ${body.slice(0, 200)}`);
    }

    const chaptersData = await chaptersRes.json();
    const chapters: any[] = chaptersData.data || [];
    const nextCursor: string | null = chaptersData.links?.next ?? null;

    // Group chapters by volumeNumber — first chapter seen wins (cover + date)
    const volumeMap = new Map<number, { number: number; title: null; synopsis: null; posterImage: string | null; publishDate: string | null }>();
    for (const ch of chapters) {
      const volNum: number | null = ch.attributes?.volumeNumber ?? null;
      if (volNum == null) continue;
      if (!volumeMap.has(volNum)) {
        const thumb = ch.attributes?.thumbnail;
        volumeMap.set(volNum, {
          number: volNum,
          title: null,
          synopsis: null,
          posterImage: thumb?.original ?? thumb?.large ?? thumb?.medium ?? null,
          publishDate: ch.attributes?.published ?? null,
        });
      }
    }

    const volumes = Array.from(volumeMap.values()).sort((a, b) => a.number - b.number);

    let serialization: string | null = null;
    if (serializationRes.ok) {
      const serData = await serializationRes.json();
      serialization = serData.data?.attributes?.serialization ?? null;
    }

    await dbConnect();
    const manga = await Manga.findOne({ kitsuId });
    const mangaTitle = manga?.title || '';

    return res.status(200).json({ volumes, mangaTitle, serialization, nextCursor });
  } catch (err: any) {
    console.error('[volumes API]', err?.message ?? err);
    return res.status(500).json({ error: err?.message ?? 'Failed to fetch volumes' });
  }
}
