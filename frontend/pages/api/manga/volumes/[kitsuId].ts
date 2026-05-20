import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect from '../../../../lib/dbConnect';
import Manga from '../../../../lib/api/Manga';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { kitsuId } = req.query as { kitsuId: string };

  const kitsuRes = await fetch(
    `https://kitsu.io/api/edge/manga/${kitsuId}?fields[manga]=serialization,volumeCount`,
    { headers: { Accept: 'application/vnd.api+json' } }
  );

  let serialization: string | null = null;
  let volumeCount = 0;

  if (kitsuRes.ok) {
    const kitsuData = await kitsuRes.json();
    serialization = kitsuData.data?.attributes?.serialization ?? null;
    volumeCount = kitsuData.data?.attributes?.volumeCount ?? 0;
  }

  await dbConnect();
  const manga = await Manga.findOne({ kitsuId });
  const mangaTitle = manga?.title || '';

  const empty = { volumes: [], mangaTitle, serialization, nextCursor: null };

  if (!mangaTitle || volumeCount === 0) return res.status(200).json(empty);

  const volumes = Array.from({ length: volumeCount }, (_, i) => ({
    volumeNumber: i + 1,
    chapters: [],
  }));

  return res.status(200).json({ volumes, mangaTitle, serialization, nextCursor: null });
}
