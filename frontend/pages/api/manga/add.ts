import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/dbConnect';
import Manga from '../../../lib/api/Manga';
import UserManga from '../../../lib/api/UserManga';
import { getAuth } from '@clerk/nextjs/server';
import { extractKitsuMeta } from '../../../lib/kitsu';
import { updateMangaRating } from '../../../lib/updateMangaRating';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  await dbConnect();

  const { userId } = getAuth(req);

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { kitsuData, status, rating, notes } = req.body;

  if (!kitsuData) {
    return res.status(400).json({ error: 'kitsuData is required' });
  }

  const meta = extractKitsuMeta(kitsuData);

  const mangaFields = {
    kitsuId: meta.kitsuId,
    title: meta.title,
    altTitles: meta.altTitles,
    rawTitles: meta.rawTitles,
    synopsis: meta.synopsis,
    posterImage: meta.coverUrl,
    coverImage: meta.coverUrl,
    author: meta.author,
    genres: meta.genres,
    chapterCount: meta.chapterCount,
    volumeCount: meta.volumeCount,
    serialization: meta.serialization,
    mangaType: meta.mangaType || 'manga',
    status: meta.status,
  };

  try {
    const globalManga = await Manga.findOneAndUpdate(
      { kitsuId: meta.kitsuId },
      { $set: mangaFields },
      { upsert: true, new: true }
    );

    const userEntry = await UserManga.findOneAndUpdate(
      { userId, mangaId: globalManga._id },
      {
        $set: {
          status: status || 'plan_to_read',
          rating: Number(rating) || 0,
          notes: notes || '',
        },
      },
      { upsert: true, new: true }
    );

    if (Number(rating) > 0) {
      await updateMangaRating(globalManga._id);
    }

    return res.status(200).json({
      success: true,
      manga: globalManga,
      userEntry,
    });
  } catch (error: any) {
    console.error('[Add]', {
      event: 'add_error',
      kitsuId: meta.kitsuId,
      message: error?.message,
      code: error?.code,
    });

    return res.status(500).json({
      error: 'Failed to add manga',
      detail: error?.message,
    });
  }
}