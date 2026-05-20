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
    const volumesUrl = cursor
      ? cursor
      : `https://kitsu.io/api/edge/manga/${kitsuId}/volumes?sort=number&page[limit]=40`;

    const [kitsuRes, serializationRes] = await Promise.all([
      fetch(volumesUrl, { headers: { Accept: 'application/vnd.api+json' } }),
      fetch(`https://kitsu.io/api/edge/manga/${kitsuId}?fields[manga]=serialization`, {
        headers: { Accept: 'application/vnd.api+json' },
      }),
    ]);

    let volumes: any[] = [];
    let nextCursor: string | null = null;

    if (kitsuRes.ok) {
      const kitsuData = await kitsuRes.json();
      volumes = (kitsuData.data || []).map((v: any) => ({
        number: v.attributes?.number,
        title: v.attributes?.titles?.en_jp || v.attributes?.titles?.en || null,
        synopsis: v.attributes?.synopsis || null,
        posterImage:
          v.attributes?.posterImage?.large ||
          v.attributes?.posterImage?.medium ||
          null,
        publishDate: v.attributes?.published || null,
      }));
      nextCursor = kitsuData.links?.next ?? null;
    }

    let serialization: string | null = null;
    if (serializationRes.ok) {
      const serData = await serializationRes.json();
      serialization = serData.data?.attributes?.serialization ?? null;
    }

    await dbConnect();
    const manga = await Manga.findOne({ kitsuId });
    const mangaTitle = manga?.title || '';

    return res.status(200).json({ volumes, mangaTitle, serialization, nextCursor });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch volumes' });
  }
}
