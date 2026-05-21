// DEPRECATED: MangaUpdates is no longer used as a data source.
// This route is kept for reference only. MangaDex aggregate is the replacement
// for volume/chapter structure data — see pages/api/manga/volumes/[kitsuId].ts.

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect from '../../../../lib/dbConnect';
import Manga from '../../../../lib/api/Manga';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  return res.status(410).json({
    error: 'DEPRECATED: Chapter data via MangaUpdates is no longer supported. Use the MangaDex aggregate endpoint instead.',
  });

  // --- DEPRECATED: MangaUpdates chapter fetch ---
  // const { kitsuId } = req.query as { kitsuId: string };

  // const [serializationRes] = await Promise.all([
  //   fetch(`https://kitsu.io/api/edge/manga/${kitsuId}?fields[manga]=serialization`, {
  //     headers: { Accept: 'application/vnd.api+json' },
  //   }),
  // ]);

  // let serialization: string | null = null;
  // if (serializationRes.ok) {
  //   const serData = await serializationRes.json();
  //   serialization = serData.data?.attributes?.serialization ?? null;
  // }

  // await dbConnect();
  // const manga = await Manga.findOne({ kitsuId });
  // const mangaTitle = manga?.title || '';

  // const empty = { chapters: [], mangaTitle, serialization, nextCursor: null };
  // if (!mangaTitle) return res.status(200).json(empty);

  // try {
  //   const searchRes = await fetch('https://api.mangaupdates.com/v1/series/search', {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ search: mangaTitle, perpage: 1 }),
  //   });
  //   if (!searchRes.ok) return res.status(200).json(empty);

  //   const searchData = await searchRes.json();
  //   const seriesId = searchData.results?.[0]?.record?.series_id;
  //   if (!seriesId) return res.status(200).json(empty);

  //   const chapRes = await fetch(`https://api.mangaupdates.com/v1/series/${seriesId}/chapters`);
  //   if (!chapRes.ok) return res.status(200).json(empty);

  //   const chapData = await chapRes.json();
  //   const chapters: { number: number; volumeNumber: number | null }[] = [];
  //   for (const vol of chapData ?? []) {
  //     const volumeNumber: number | null = vol.volume ?? null;
  //     for (const ch of vol.chapters ?? []) {
  //       const number = Number(ch.chapter);
  //       if (!isNaN(number)) chapters.push({ number, volumeNumber });
  //     }
  //   }
  //   chapters.sort((a, b) => a.number - b.number);
  //   return res.status(200).json({ chapters, mangaTitle, serialization, nextCursor: null });
  // } catch {
  //   return res.status(200).json(empty);
  // }
}
