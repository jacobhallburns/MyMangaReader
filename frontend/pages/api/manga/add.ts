import type { NextApiRequest, NextApiResponse } from 'next'; // 1. Add this import
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
    // 1. Ensure the Manga exists in our Global Cache
    const globalManga = await Manga.findOneAndUpdate(
      { kitsuId: kitsuData.id },
      {
        title: kitsuData.attributes.canonicalTitle || kitsuData.attributes.titles?.en_jp || kitsuData.attributes.slug,
        synopsis: kitsuData.attributes.synopsis,
        // FALLBACKS: Try large, then medium, then small
        posterImage: kitsuData.attributes.posterImage?.large || 
                    kitsuData.attributes.posterImage?.medium || 
                    kitsuData.attributes.posterImage?.small,
        coverImage: kitsuData.attributes.coverImage?.large || 
                    kitsuData.attributes.coverImage?.original,
        chapterCount: kitsuData.attributes.chapterCount,
        mangaType: kitsuData.type,
      },
      { upsert: true, new: true }
    );

    // 2. Create or Update the User's personal relationship with this Manga
    const userEntry = await UserManga.findOneAndUpdate(
      { userId, mangaId: globalManga._id }, // Ensure this is the _id object
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