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

  try {
    const globalManga = await Manga.findOneAndUpdate(
      { kitsuId: kitsuData.id },
      {
        title: kitsuData.attributes.canonicalTitle || kitsuData.attributes.titles?.en_jp || kitsuData.attributes.slug,
        synopsis: kitsuData.attributes.synopsis,
        // PORTRAIT ART: This is what you'll use for your list view
        posterImage: kitsuData.attributes.posterImage?.large || 
                    kitsuData.attributes.posterImage?.medium || 
                    kitsuData.attributes.posterImage?.original,
        // LANDSCAPE ART: This is the wide banner (keep it for potential profile headers)
        coverImage: kitsuData.attributes.coverImage?.large || 
                    kitsuData.attributes.coverImage?.original ||
                    kitsuData.attributes.posterImage?.large, // Fallback to poster if no banner exists
        chapterCount: kitsuData.attributes.chapterCount,
        mangaType: kitsuData.type,
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