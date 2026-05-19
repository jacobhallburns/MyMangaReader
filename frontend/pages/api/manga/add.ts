import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/dbConnect';
import Manga from '../../../lib/api/Manga';
import UserManga from '../../../lib/api/UserManga';
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await dbConnect();
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { kitsuData, status } = req.body;

  let genres: string[] = [];
  try {
    const catRes = await fetch(
      `https://kitsu.io/api/edge/manga/${kitsuData.id}/categories?page[limit]=8&sort=-totalMediaCount`
    );
    if (catRes.ok) {
      const catJson = await catRes.json();
      genres = (catJson.data ?? []).map((c: any) => c.attributes?.title).filter(Boolean);
    }
  } catch {
    // non-fatal: proceed with empty genres
  }

  try {
    const globalManga = await Manga.findOneAndUpdate(
      { kitsuId: kitsuData.id },
      {
        title: kitsuData.attributes.canonicalTitle || kitsuData.attributes.titles?.en_jp || kitsuData.attributes.slug,
        synopsis: kitsuData.attributes.synopsis,
        posterImage: kitsuData.attributes.posterImage?.large ||
                    kitsuData.attributes.posterImage?.medium ||
                    kitsuData.attributes.posterImage?.original,
        coverImage: kitsuData.attributes.coverImage?.large ||
                    kitsuData.attributes.coverImage?.original ||
                    kitsuData.attributes.posterImage?.large,
        chapterCount: kitsuData.attributes.chapterCount,
        mangaType: kitsuData.type,
        genres,
      },
      { upsert: true, new: true }
    );

    const userEntry = await UserManga.findOneAndUpdate(
      { userId, mangaId: globalManga._id },
      { 
        status: status || 'plan_to_read',
        rating: req.body.rating || 0,
        notes: req.body.notes || ''
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, manga: globalManga, userEntry });
  } catch (error) {
    console.error("Add Manga Error:", error);
    return res.status(500).json({ error: 'Failed to sync manga' });
  }
}