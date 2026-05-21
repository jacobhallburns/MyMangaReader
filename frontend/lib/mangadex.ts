// MangaDex API utility — rate limit: 90 req/min (1 per ~667ms)
// Do NOT call this in real-time for every page load; use it for seeding/batch jobs.
// Cover images: store only the CDN URL string, never download or re-host the bytes.

const BASE = 'https://api.mangadex.org';
const COVERS_BASE = 'https://uploads.mangadex.org/covers';
const MIN_INTERVAL_MS = 720; // slightly above 667ms to stay safely under the limit

let lastRequestAt = 0;

async function throttledFetch(url: string, options?: RequestInit): Promise<Response> {
  const gap = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (gap > 0) await new Promise<void>(r => setTimeout(r, gap));
  lastRequestAt = Date.now();
  return fetch(url, { ...options, headers: { 'User-Agent': 'MyMangaReader/1.0', ...options?.headers } });
}

async function fetchWithBackoff(url: string, options?: RequestInit, retries = 3): Promise<Response> {
  const res = await throttledFetch(url, options);
  if (res.status === 429 && retries > 0) {
    const wait = Math.max(2, Number(res.headers.get('Retry-After') || 2)) * 1000;
    await new Promise<void>(r => setTimeout(r, wait));
    return fetchWithBackoff(url, options, retries - 1);
  }
  return res;
}

export async function searchMangaDex(query: string, limit = 10) {
  const params = new URLSearchParams({
    title: query,
    limit: String(limit),
    'includes[]': 'cover_art',
  });
  // URLSearchParams doesn't handle repeated keys well, append manually
  params.append('includes[]', 'author');
  const res = await fetchWithBackoff(`${BASE}/manga?${params}`);
  if (!res.ok) throw new Error(`MangaDex search ${res.status}`);
  return res.json() as Promise<{ data: any[] }>;
}

export async function getMangaDexById(mangaDexId: string) {
  const params = new URLSearchParams();
  ['cover_art', 'author', 'artist'].forEach(r => params.append('includes[]', r));
  const res = await fetchWithBackoff(`${BASE}/manga/${mangaDexId}?${params}`);
  if (!res.ok) throw new Error(`MangaDex fetch ${res.status}`);
  return res.json() as Promise<{ data: any }>;
}

export function getCoverUrl(mangaDexId: string, fileName: string, width: 256 | 512 | null = 512): string {
  const suffix = width ? `.${width}.jpg` : '';
  return `${COVERS_BASE}/${mangaDexId}/${fileName}${suffix}`;
}

export interface MangaDexMeta {
  title: string;
  altTitles: string[];
  synopsis: string;
  genres: string[];
  status: string | undefined;
  volumeCount: number | undefined;
  author: string | undefined;
  coverUrl: string | undefined;
}

export function extractMeta(mangaData: any): MangaDexMeta {
  const attr = mangaData.attributes ?? {};
  const rels: any[] = mangaData.relationships ?? [];

  const title: string =
    attr.title?.en ??
    attr.title?.['en-us'] ??
    (Object.values(attr.title ?? {}) as string[])[0] ??
    '';

  const altTitles: string[] = (attr.altTitles ?? [])
    .flatMap((t: Record<string, string>) => Object.values(t))
    .filter(Boolean);

  const synopsis: string =
    attr.description?.en ??
    attr.description?.['en-us'] ??
    (Object.values(attr.description ?? {}) as string[])[0] ??
    '';

  // MangaDex tag groups: "genre" and "theme" are the relevant content tags
  const genres: string[] = (attr.tags ?? [])
    .filter((t: any) => t.attributes?.group === 'genre' || t.attributes?.group === 'theme')
    .map((t: any) => t.attributes?.name?.en)
    .filter(Boolean);

  const status: string | undefined = attr.status;
  const volumeCount: number | undefined = attr.lastVolume ? parseInt(attr.lastVolume) || undefined : undefined;

  const coverRel = rels.find(r => r.type === 'cover_art');
  const coverFileName: string | undefined = coverRel?.attributes?.fileName;
  const coverUrl = coverFileName ? getCoverUrl(mangaData.id, coverFileName) : undefined;

  const authorRel = rels.find(r => r.type === 'author');
  const author: string | undefined = authorRel?.attributes?.name;

  return { title, altTitles, synopsis, genres, status, volumeCount, author, coverUrl };
}
