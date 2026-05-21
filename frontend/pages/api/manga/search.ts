import type { NextApiRequest, NextApiResponse } from 'next';
import { searchMangaDex, extractMeta, getCoverUrl } from '../../../lib/mangadex';

export interface SearchResult {
  id: string;          // mangaDexId
  title: string;
  synopsis: string;
  posterImage: string | null;
  author: string | undefined;
  genres: string[];
  status: string | undefined;
  altTitles: string[];
  volumeCount: number | undefined;
  _raw: any;           // full MangaDex data object, passed through to add.ts
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const q = (req.query.q as string)?.trim();
  if (!q) return res.status(400).json({ error: 'q is required' });

  try {
    const { data } = await searchMangaDex(q, 20);

    const results: SearchResult[] = (data || []).map((manga: any) => {
      const meta = extractMeta(manga);

      // Construct cover URL from the relationship included in the search response
      const coverRel = (manga.relationships || []).find((r: any) => r.type === 'cover_art');
      const coverUrl = coverRel?.attributes?.fileName
        ? getCoverUrl(manga.id, coverRel.attributes.fileName, 512)
        : null;

      return {
        id: manga.id,
        title: meta.title,
        synopsis: meta.synopsis,
        posterImage: coverUrl,
        author: meta.author,
        genres: meta.genres,
        status: meta.status,
        altTitles: meta.altTitles,
        volumeCount: meta.volumeCount,
        _raw: manga,
      };
    });

    return res.status(200).json({ results });
  } catch (err: any) {
    console.error('[Search]', { event: 'error', q, error: err.message });
    return res.status(500).json({ error: 'Search failed' });
  }
}
