// NOTE: Route param named [kitsuId] for historical reasons; receives the Manga document's MongoDB _id.

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect from '../../../../lib/dbConnect';
import Manga from '../../../../lib/api/Manga';
import { searchAniList, getAniListById, extractAniListMeta } from '../../../../lib/anilist';

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

  let anilistId: number | null = manga.anilistId ?? null;
  let freshGenres: string[] = manga.genres || [];
  let freshAuthor: string | null = manga.author || null;
  let freshCover: string | null = manga.posterImage || null;
  let volumeMax = manga.volumeCount || 0;

  // Resolve anilistId + backfill metadata if missing
  if (!anilistId) {
    try {
      console.log('[VolumeTracker]', { event: 'anilist_search', title: mangaTitle });
      const { data } = await searchAniList(mangaTitle, 1);
      const first = data?.[0];
      if (first?.id) {
        const meta = extractAniListMeta(first);
        anilistId = meta.anilistId;
        const dbUpdate: Record<string, any> = { anilistId };
        if (meta.genres.length > 0) { dbUpdate.genres = meta.genres; freshGenres = meta.genres; }
        if (meta.author) { dbUpdate.author = meta.author; freshAuthor = meta.author; }
        if (meta.altTitles.length > 0) dbUpdate.altTitles = meta.altTitles;
        if (meta.coverUrl && !manga.posterImage) { dbUpdate.posterImage = meta.coverUrl; freshCover = meta.coverUrl; }
        if (meta.volumeCount) { dbUpdate.volumeCount = meta.volumeCount; volumeMax = meta.volumeCount; }
        await Manga.findByIdAndUpdate(mangaDocId, dbUpdate);
        console.log('[VolumeTracker]', { event: 'metadata_backfilled', anilistId, genres: freshGenres.length, author: freshAuthor });
      }
    } catch (err: any) {
      console.error('[VolumeTracker]', { event: 'anilist_search_error', title: mangaTitle, error: err.message });
    }
  } else if (volumeMax === 0 || !manga.genres?.length || !manga.author) {
    // anilistId known but metadata incomplete — fetch fresh
    try {
      console.log('[VolumeTracker]', { event: 'metadata_fetch', anilistId });
      const { data: detail } = await getAniListById(anilistId);
      if (detail) {
        const meta = extractAniListMeta(detail);
        const dbUpdate: Record<string, any> = {};
        if (!manga.genres?.length && meta.genres.length > 0) { dbUpdate.genres = meta.genres; freshGenres = meta.genres; }
        if (!manga.author && meta.author) { dbUpdate.author = meta.author; freshAuthor = meta.author; }
        if (!manga.posterImage && meta.coverUrl) { dbUpdate.posterImage = meta.coverUrl; freshCover = meta.coverUrl; }
        if (meta.volumeCount && volumeMax === 0) { dbUpdate.volumeCount = meta.volumeCount; volumeMax = meta.volumeCount; }
        if (Object.keys(dbUpdate).length > 0) {
          await Manga.findByIdAndUpdate(mangaDocId, dbUpdate);
          console.log('[VolumeTracker]', { event: 'metadata_updated', anilistId, fields: Object.keys(dbUpdate) });
        }
      }
    } catch (err: any) {
      console.error('[VolumeTracker]', { event: 'metadata_fetch_error', anilistId, error: err.message });
    }
  }

  if (!anilistId) {
    console.warn('[VolumeTracker]', { event: 'no_anilist_id', mangaDocId, title: mangaTitle });
    return res.status(200).json({ ...empty, _warning: 'Series not found on AniList' });
  }

  console.log('[VolumeTracker]', { event: 'volumes_resolved', anilistId, title: mangaTitle, volumeMax });

  if (volumeMax === 0) {
    console.warn('[VolumeTracker]', { event: 'no_volume_data', anilistId, title: mangaTitle });
    return res.status(200).json({
      ...empty,
      genres: freshGenres,
      author: freshAuthor,
      _warning: 'Volume data unavailable — series has no volume count on AniList',
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
