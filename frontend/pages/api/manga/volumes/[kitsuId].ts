// NOTE: Route param named [kitsuId] for historical reasons; receives the Manga document's MongoDB _id.

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect from '../../../../lib/dbConnect';
import Manga from '../../../../lib/api/Manga';
import { searchKitsu, getKitsuById, extractKitsuMeta } from '../../../../lib/kitsu';

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

  const empty = {
    volumes: [],
    mangaTitle,
    serialization: manga.serialization || null,
    nextCursor: null,
    genres: manga.genres || [],
    author: manga.author || null,
  };

  let kitsuId: string | null = manga.kitsuId ? String(manga.kitsuId) : null;
  let freshGenres: string[] = manga.genres || [];
  let freshAuthor: string | null = manga.author || null;
  let freshCover: string | null = manga.posterImage || null;
  let serialization: string | null = manga.serialization || null;
  let volumeMax = manga.volumeCount || 0;

  async function applyMetaFromKitsu(item: any) {
    const meta = extractKitsuMeta(item);

    kitsuId = meta.kitsuId;

    const dbUpdate: Record<string, any> = {
      kitsuId: meta.kitsuId,
    };

    if (meta.genres.length > 0) {
      dbUpdate.genres = meta.genres;
      freshGenres = meta.genres;
    }

    if (meta.author) {
      dbUpdate.author = meta.author;
      freshAuthor = meta.author;
    }

    if (meta.altTitles.length > 0) {
      dbUpdate.altTitles = meta.altTitles;
    }

    if (meta.coverUrl && !manga.posterImage) {
      dbUpdate.posterImage = meta.coverUrl;
      freshCover = meta.coverUrl;
    }

    if (meta.volumeCount) {
      dbUpdate.volumeCount = meta.volumeCount;
      volumeMax = meta.volumeCount;
    }

    if (meta.chapterCount) {
      dbUpdate.chapterCount = meta.chapterCount;
    }

    if (meta.serialization) {
      dbUpdate.serialization = meta.serialization;
      serialization = meta.serialization;
    }

    if (meta.mangaType) {
      dbUpdate.mangaType = meta.mangaType;
    }

    if (meta.status) {
      dbUpdate.status = meta.status;
    }

    await Manga.findByIdAndUpdate(mangaDocId, dbUpdate);

    console.log('[VolumeTracker]', {
      event: 'metadata_backfilled',
      kitsuId,
      volumeMax,
      genres: freshGenres.length,
    });
  }

  if (!kitsuId) {
    try {
      console.log('[VolumeTracker]', {
        event: 'kitsu_search',
        title: mangaTitle,
      });

      const { data } = await searchKitsu(mangaTitle, 1);
      const first = data?.[0];

      if (first?.id) {
        await applyMetaFromKitsu(first);
      }
    } catch (err: any) {
      console.error('[VolumeTracker]', {
        event: 'kitsu_search_error',
        title: mangaTitle,
        error: err.message,
      });
    }
  } else if (volumeMax === 0 || !manga.genres?.length || !manga.serialization) {
    try {
      console.log('[VolumeTracker]', {
        event: 'metadata_fetch',
        kitsuId,
      });

      const { data: detail } = await getKitsuById(kitsuId);

      if (detail) {
        await applyMetaFromKitsu(detail);
      }
    } catch (err: any) {
      console.error('[VolumeTracker]', {
        event: 'metadata_fetch_error',
        kitsuId,
        error: err.message,
      });
    }
  }

  if (!kitsuId) {
    console.warn('[VolumeTracker]', {
      event: 'no_kitsu_id',
      mangaDocId,
      title: mangaTitle,
    });

    return res.status(200).json({
      ...empty,
      _warning: 'Series not found on Kitsu',
    });
  }

  console.log('[VolumeTracker]', {
    event: 'volumes_resolved',
    kitsuId,
    title: mangaTitle,
    volumeMax,
  });

  if (volumeMax === 0) {
    console.warn('[VolumeTracker]', {
      event: 'no_volume_data',
      kitsuId,
      title: mangaTitle,
    });

    return res.status(200).json({
      ...empty,
      genres: freshGenres,
      author: freshAuthor,
      posterImage: freshCover,
      serialization,
      _warning: 'Volume data unavailable — Kitsu does not list a volume count for this series',
    });
  }

  const volumes = Array.from({ length: volumeMax }, (_, i) => ({
    volumeNumber: i + 1,
    chapters: [],
  }));

  return res.status(200).json({
    volumes,
    mangaTitle,
    serialization,
    nextCursor: null,
    genres: freshGenres,
    author: freshAuthor,
    posterImage: freshCover,
  });
}