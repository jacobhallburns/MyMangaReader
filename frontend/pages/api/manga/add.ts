import type { NextApiRequest, NextApiResponse } from 'next';
import dbConnect from '../../../lib/dbConnect';
import Manga from '../../../lib/api/Manga';
import UserManga from '../../../lib/api/UserManga';
import { getAuth } from '@clerk/nextjs/server';
import { extractMeta } from '../../../lib/mangadex';
import { updateMangaRating } from '../../../lib/updateMangaRating';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await dbConnect();
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { mangaDexData, status, rating, notes } = req.body;

  // --- MangaDex path (current) ---
  if (mangaDexData) {
    const meta = extractMeta(mangaDexData);

    // Build cover URL from the _raw manga object's cover_art relationship
    const coverRel = (mangaDexData.relationships || []).find((r: any) => r.type === 'cover_art');
    let coverUrl: string | undefined;
    if (coverRel?.attributes?.fileName) {
      const { getCoverUrl } = await import('../../../lib/mangadex');
      coverUrl = getCoverUrl(mangaDexData.id, coverRel.attributes.fileName, 512);
    }

    const mangaFields = {
      mangaDexId: mangaDexData.id,
      title: meta.title,
      altTitles: meta.altTitles,
      synopsis: meta.synopsis,
      posterImage: coverUrl ?? meta.coverUrl,
      coverImage: coverUrl ?? meta.coverUrl,
      author: meta.author,
      genres: meta.genres,
      volumeCount: meta.volumeCount,
      mangaType: 'manga',
      status: meta.status,
    };

    try {
      const globalManga = await Manga.findOneAndUpdate(
        { mangaDexId: mangaDexData.id },
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
      console.error('[Add]', { event: 'mangadex_add_error', mangaDexId: mangaDexData.id, message: error?.message, code: error?.code, error });
      return res.status(500).json({ error: 'Failed to add manga', detail: error?.message });
    }
  }

  // --- DEPRECATED: Kitsu path ---
  // Kitsu is no longer the primary source. This path remains for any existing
  // integrations that still pass kitsuData, but will be removed in a future cleanup.
  const { kitsuData } = req.body;
  if (!kitsuData) return res.status(400).json({ error: 'mangaDexData or kitsuData required' });

  // DEPRECATED: Kitsu genre fetch — genres now come from MangaDex tags
  // let genres: string[] = [];
  // try {
  //   const catRes = await fetch(
  //     `https://kitsu.io/api/edge/manga/${kitsuData.id}/categories?page[limit]=8&sort=-totalMediaCount`
  //   );
  //   if (catRes.ok) {
  //     const catJson = await catRes.json();
  //     genres = (catJson.data ?? []).map((c: any) => c.attributes?.title).filter(Boolean);
  //   }
  // } catch { /* non-fatal */ }
  const genres: string[] = [];

  try {
    const globalManga = await Manga.findOneAndUpdate(
      { kitsuId: kitsuData.id },
      {
        kitsuId: kitsuData.id,
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
      { status: status || 'plan_to_read', rating: req.body.rating || 0, notes: req.body.notes || '' },
      { upsert: true, new: true }
    );

    return res.status(200).json({ success: true, manga: globalManga, userEntry });
  } catch (error) {
    console.error('[Add]', { event: 'kitsu_add_error', kitsuId: kitsuData?.id, error });
    return res.status(500).json({ error: 'Failed to sync manga' });
  }
}
