// NOTE: The route param is named [kitsuId] for historical reasons but now receives
// the Manga document's MongoDB _id. The frontend was updated to pass _id.
// Kitsu is no longer called here — MangaDex aggregate is used instead.

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect from '../../../../lib/dbConnect';
import Manga from '../../../../lib/api/Manga';
import { searchMangaDex, getMangaDexById, getMangaDexAggregate, extractMeta } from '../../../../lib/mangadex';
import { getAniListVolumeCount } from '../../../../lib/anilist';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { kitsuId: mangaDocId } = req.query as { kitsuId: string };

  console.log('[VolumeTracker]', { event: 'volumes_fetch', mangaDocId, userId });

  await dbConnect();
  const manga = await Manga.findById(mangaDocId).lean() as any;

  if (!manga) {
    console.warn('[VolumeTracker]', { event: 'manga_not_found', mangaDocId });
    return res.status(404).json({ error: 'Manga not found' });
  }

  const mangaTitle = manga.title || '';
  const empty = { volumes: [], mangaTitle, serialization: null, nextCursor: null, genres: manga.genres || [], author: manga.author || null };

  console.log('[VolumeTracker]', {
    event: 'manga_found',
    mangaDocId,
    title: mangaTitle,
    mangaDexId: manga.mangaDexId ?? null,
    genreCount: manga.genres?.length ?? 0,
    hasAuthor: !!manga.author,
  });

  let mangaDexId: string | null = manga.mangaDexId ?? null;
  let freshGenres: string[] = manga.genres || [];
  let freshAuthor: string | null = manga.author || null;
  let freshCover: string | null = manga.posterImage || null;

  // --- Resolve mangaDexId + backfill metadata ---
  if (!mangaDexId) {
    // First time: search MangaDex by title. The search result includes tags (genres)
    // and author relationship, so we can backfill all missing metadata in one call.
    try {
      console.log('[VolumeTracker]', { event: 'mangadex_search', title: mangaTitle });
      const searchResult = await searchMangaDex(mangaTitle, 1);
      const first = searchResult.data?.[0];
      if (first?.id) {
        mangaDexId = first.id;
        const meta = extractMeta(first);

        const dbUpdate: Record<string, any> = { mangaDexId };
        if (meta.genres.length > 0) { dbUpdate.genres = meta.genres; freshGenres = meta.genres; }
        if (meta.author) { dbUpdate.author = meta.author; freshAuthor = meta.author; }
        if (meta.altTitles.length > 0) dbUpdate.altTitles = meta.altTitles;
        if (meta.coverUrl && !manga.posterImage) { dbUpdate.posterImage = meta.coverUrl; freshCover = meta.coverUrl; }

        await Manga.findByIdAndUpdate(mangaDocId, dbUpdate);
        console.log('[VolumeTracker]', { event: 'metadata_backfilled', mangaDexId, genres: freshGenres.length, author: freshAuthor });
      }
    } catch (err: any) {
      console.error('[VolumeTracker]', { event: 'mangadex_search_error', title: mangaTitle, error: err.message, stack: err.stack });
    }
  } else if (!manga.genres?.length || !manga.author) {
    // mangaDexId known but metadata incomplete — fetch full detail to fill gaps
    try {
      console.log('[VolumeTracker]', { event: 'metadata_fetch', mangaDexId, missingGenres: !manga.genres?.length, missingAuthor: !manga.author });
      const detail = await getMangaDexById(mangaDexId);
      const meta = extractMeta(detail.data);

      const dbUpdate: Record<string, any> = {};
      if (!manga.genres?.length && meta.genres.length > 0) { dbUpdate.genres = meta.genres; freshGenres = meta.genres; }
      if (!manga.author && meta.author) { dbUpdate.author = meta.author; freshAuthor = meta.author; }
      if (!manga.posterImage && meta.coverUrl) { dbUpdate.posterImage = meta.coverUrl; freshCover = meta.coverUrl; }

      if (Object.keys(dbUpdate).length > 0) {
        await Manga.findByIdAndUpdate(mangaDocId, dbUpdate);
        console.log('[VolumeTracker]', { event: 'metadata_updated', mangaDexId, fields: Object.keys(dbUpdate) });
      }
    } catch (err: any) {
      console.error('[VolumeTracker]', { event: 'metadata_fetch_error', mangaDexId, error: err.message });
    }
  }

  if (!mangaDexId) {
    console.warn('[VolumeTracker]', { event: 'no_mangadex_id', mangaDocId, title: mangaTitle });
    return res.status(200).json({ ...empty, _warning: 'Series not found on MangaDex' });
  }

  // --- Resolve volume count ---
  // Priority 1: stored volumeCount (set when manga was added, fast DB read).
  // Priority 2: live getMangaDexById — for manga where lastVolume wasn't stored yet.
  // Priority 3: aggregate max — last resort for ongoing series where lastVolume is null
  //             but chapters exist. We still enumerate 1..N from the max, so DMCA gaps
  //             (e.g. One Piece vols 8-60) don't appear as missing.
  let volumeMax = manga.volumeCount || 0;

  if (volumeMax === 0) {
    try {
      const detail = await getMangaDexById(mangaDexId);
      const meta = extractMeta(detail.data);
      if (meta.volumeCount) {
        volumeMax = meta.volumeCount;
        await Manga.findByIdAndUpdate(mangaDocId, { $set: { volumeCount: meta.volumeCount } });
        console.log('[VolumeTracker]', { event: 'volumecount_fetched', mangaDexId, volumeCount: meta.volumeCount });
      }
    } catch (err: any) {
      console.warn('[VolumeTracker]', { event: 'volumecount_fetch_failed', mangaDexId, error: err.message });
    }
  }

  if (volumeMax === 0) {
    try {
      const aggregate = await getMangaDexAggregate(mangaDexId);
      const keys = Object.keys(aggregate.volumes || {}).filter(k => k !== 'none' && !isNaN(parseFloat(k)));
      if (keys.length > 0) {
        volumeMax = Math.max(...keys.map(k => parseFloat(k)));
        console.log('[VolumeTracker]', { event: 'volumecount_from_aggregate', mangaDexId, volumeMax });
      }
    } catch (err: any) {
      console.warn('[VolumeTracker]', { event: 'aggregate_fallback_failed', mangaDexId, error: err.message });
    }
  }

  if (volumeMax === 0) {
    const count = await getAniListVolumeCount(mangaTitle);
    if (count) {
      volumeMax = count;
      await Manga.findByIdAndUpdate(mangaDocId, { $set: { volumeCount: count } });
      console.log('[VolumeTracker]', { event: 'volumecount_from_anilist', mangaDexId, title: mangaTitle, volumeMax });
    }
  }

  console.log('[VolumeTracker]', { event: 'volumes_resolved', mangaDexId, title: mangaTitle, volumeMax });

  if (volumeMax === 0) {
    console.warn('[VolumeTracker]', { event: 'no_volume_data', mangaDexId, title: mangaTitle });
    return res.status(200).json({
      ...empty,
      genres: freshGenres,
      author: freshAuthor,
      _warning: 'Volume data unavailable — series has no volume information on MangaDex',
    });
  }

  const volumes = Array.from({ length: volumeMax }, (_, i) => ({ volumeNumber: i + 1, chapters: [] }));

  return res.status(200).json({
    volumes,
    mangaTitle,
    serialization: null,
    nextCursor: null,
    genres: freshGenres,
    author: freshAuthor,
    posterImage: freshCover,
  });
}
