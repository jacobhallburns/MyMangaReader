import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/dbConnect';
import Manga from '../../../lib/api/Manga';
import UserManga from '../../../lib/api/UserManga';
import { getAuth } from '@clerk/nextjs/server';
import { extractAniListMeta } from '../../../lib/anilist';
import { updateMangaRating } from '../../../lib/updateMangaRating';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await dbConnect();
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { anilistData, status, rating, notes } = req.body;
  if (!anilistData) return res.status(400).json({ error: 'anilistData is required' });

  const meta = extractAniListMeta(anilistData);

  const mangaFields = {
    anilistId: meta.anilistId,
    title: meta.title,
    altTitles: meta.altTitles,
    synopsis: meta.synopsis,
    posterImage: meta.coverUrl,
    coverImage: meta.coverUrl,
    author: meta.author,
    genres: meta.genres,
    volumeCount: meta.volumeCount,
    mangaType: 'manga',
    status: meta.status,
  };

  try {
    const globalManga = await Manga.findOneAndUpdate(
      { anilistId: meta.anilistId },
      { $set: mangaFields },
      { upsert: true, new: true }
    );

    const userEntry = await UserManga.findOneAndUpdate(
      { userId, mangaId: globalManga._id },
      { $set: { status: status || 'plan_to_read', rating: rating || 0, notes: notes || '' } },
      { upsert: true, new: true }
    );

    if (rating) await updateMangaRating(globalManga._id);
    return res.status(200).json({ success: true, manga: globalManga, userEntry });
  } catch (error: any) {
    console.error('[Add]', { event: 'add_error', anilistId: meta.anilistId, message: error?.message, code: error?.code });
    return res.status(500).json({ error: 'Failed to add manga', detail: error?.message });
  }
}
