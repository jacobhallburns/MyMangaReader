// NOTE: The route param is named [kitsuId] for historical reasons but now receives
// the Manga document's MongoDB _id. The frontend was updated to pass _id.
// Kitsu is no longer called here — MangaDex aggregate is used instead.

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect from '../../../../lib/dbConnect';
import Manga from '../../../../lib/api/Manga';
import { searchMangaDex, getMangaDexAggregate } from '../../../../lib/mangadex';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  // param is now the Manga document's _id
  const { kitsuId: mangaDocId } = req.query as { kitsuId: string };

  console.log('[VolumeTracker]', { event: 'volumes_fetch', mangaDocId, userId });

  await dbConnect();
  const manga = await Manga.findById(mangaDocId).lean() as any;

  if (!manga) {
    console.warn('[VolumeTracker]', { event: 'manga_not_found', mangaDocId });
    return res.status(404).json({ error: 'Manga not found' });
  }

  const mangaTitle = manga.title || '';
  console.log('[VolumeTracker]', { event: 'manga_found', mangaDocId, title: mangaTitle, mangaDexId: manga.mangaDexId ?? null });

  const empty = { volumes: [], mangaTitle, serialization: null, nextCursor: null };

  // Resolve mangaDexId — use stored value or find via title search
  let mangaDexId: string | null = manga.mangaDexId ?? null;

  if (!mangaDexId) {
    try {
      console.log('[VolumeTracker]', { event: 'mangadex_search', title: mangaTitle });
      const searchResult = await searchMangaDex(mangaTitle, 1);
      const first = searchResult.data?.[0];
      if (first?.id) {
        mangaDexId = first.id;
        // Cache the mangaDexId so future requests skip this search
        await Manga.findByIdAndUpdate(mangaDocId, { mangaDexId });
        console.log('[VolumeTracker]', { event: 'mangadex_id_cached', mangaDocId, mangaDexId });
      }
    } catch (err: any) {
      console.error('[VolumeTracker]', { event: 'mangadex_search_error', title: mangaTitle, error: err.message, stack: err.stack });
    }
  }

  if (!mangaDexId) {
    console.warn('[VolumeTracker]', { event: 'no_mangadex_id', mangaDocId, title: mangaTitle });
    return res.status(200).json({ ...empty, _warning: 'Series not found on MangaDex' });
  }

  try {
    const aggregate = await getMangaDexAggregate(mangaDexId);

    // Extract and sort volume numbers from the aggregate response.
    // "none" key holds chapters with no assigned volume — skip it.
    const volumeNums = Object.keys(aggregate.volumes || {})
      .filter(k => k !== 'none' && !isNaN(parseFloat(k)))
      .map(k => parseFloat(k))
      .sort((a, b) => a - b);

    console.log('[VolumeTracker]', { event: 'volumes_resolved', mangaDexId, volumeCount: volumeNums.length });

    if (volumeNums.length === 0) {
      // Aggregate returned nothing — series may be fully unlisted or English TL has no volumes
      console.warn('[VolumeTracker]', { event: 'aggregate_empty', mangaDexId, title: mangaTitle });
      return res.status(200).json({ ...empty, _warning: 'Volume data unavailable — series may have no English releases yet' });
    }

    const volumes = volumeNums.map(n => ({ volumeNumber: n, chapters: [] }));
    return res.status(200).json({ volumes, mangaTitle, serialization: null, nextCursor: null });

  } catch (err: any) {
    console.error('[VolumeTracker]', { event: 'aggregate_error', mangaDexId, error: err.message, stack: err.stack });
    return res.status(200).json({ ...empty, _warning: 'Failed to load volume data from MangaDex' });
  }
}
