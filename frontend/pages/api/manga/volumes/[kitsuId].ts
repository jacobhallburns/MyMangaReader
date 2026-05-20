import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect from '../../../../lib/dbConnect';
import Manga from '../../../../lib/api/Manga';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { kitsuId } = req.query as { kitsuId: string };

  const [serializationRes] = await Promise.all([
    fetch(`https://kitsu.io/api/edge/manga/${kitsuId}?fields[manga]=serialization`, {
      headers: { Accept: 'application/vnd.api+json' },
    }),
  ]);

  let serialization: string | null = null;
  if (serializationRes.ok) {
    const serData = await serializationRes.json();
    serialization = serData.data?.attributes?.serialization ?? null;
  }

  await dbConnect();
  const manga = await Manga.findOne({ kitsuId });
  const mangaTitle = manga?.title || '';

  const empty = { volumes: [], mangaTitle, serialization, nextCursor: null };

  if (!mangaTitle) return res.status(200).json(empty);

  try {
    const searchRes = await fetch('https://api.mangaupdates.com/v1/series/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ search: mangaTitle, perpage: 1 }),
    });
    if (!searchRes.ok) return res.status(200).json(empty);

    const searchData = await searchRes.json();
    const seriesId = searchData.results?.[0]?.record?.series_id;
    if (!seriesId) return res.status(200).json(empty);

    const chapRes = await fetch(`https://api.mangaupdates.com/v1/series/${seriesId}/chapters`);
    if (!chapRes.ok) return res.status(200).json(empty);

    const chapData = await chapRes.json();

    const volumes: { volumeNumber: number; chapters: { number: number }[] }[] = [];
    for (const vol of chapData ?? []) {
      const volumeNumber: number | null = vol.volume ?? null;
      if (volumeNumber == null) continue;
      const chapters = (vol.chapters ?? [])
        .map((ch: any) => ({ number: Number(ch.chapter) }))
        .filter((ch: { number: number }) => !isNaN(ch.number));
      volumes.push({ volumeNumber, chapters });
    }
    volumes.sort((a, b) => a.volumeNumber - b.volumeNumber);

    return res.status(200).json({ volumes, mangaTitle, serialization, nextCursor: null });
  } catch {
    return res.status(200).json(empty);
  }
}
