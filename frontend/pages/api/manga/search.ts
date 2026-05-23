import type { NextApiRequest, NextApiResponse } from 'next';
import { searchAniList, extractAniListMeta } from '../../../lib/anilist';
import dbConnect from '../../../lib/dbConnect';
import Manga from '../../../lib/api/Manga';

export interface SearchResult {
  id: string;          // String(anilistId)
  title: string;
  synopsis: string;
  posterImage: string | null;
  author: string | undefined;
  genres: string[];
  status: string | undefined;
  altTitles: string[];
  volumeCount: number | undefined;
  averageRating: number;
  ratingCount: number;
  _raw: any;           // full AniList media object, passed through to add.ts
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const q = (req.query.q as string)?.trim();
  if (!q) return res.status(400).json({ error: 'q is required' });

  try {
    const { data } = await searchAniList(q, 20);

    await dbConnect();
    const anilistIds = (data || []).map((m: any) => m.id);
    const mangaRecords = await Manga.find(
      { anilistId: { $in: anilistIds } },
      'anilistId averageRating ratingCount'
    ).lean() as any[];
    const ratingMap = new Map(mangaRecords.map((m: any) => [m.anilistId, m]));

    const results: SearchResult[] = (data || []).map((media: any) => {
      const meta = extractAniListMeta(media);
      const dbRecord = ratingMap.get(media.id) as any;
      return {
        id: String(media.id),
        title: meta.title,
        synopsis: meta.synopsis,
        posterImage: meta.coverUrl ?? null,
        author: meta.author,
        genres: meta.genres,
        status: meta.status,
        altTitles: meta.altTitles,
        volumeCount: meta.volumeCount,
        averageRating: dbRecord?.averageRating ?? 0,
        ratingCount: dbRecord?.ratingCount ?? 0,
        _raw: media,
      };
    });

    return res.status(200).json({ results });
  } catch (err: any) {
    console.error('[Search]', { event: 'error', q, error: err.message });
    return res.status(500).json({ error: 'Search failed' });
  }
}
