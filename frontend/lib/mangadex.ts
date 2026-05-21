// MangaDex API utility — rate limit: 90 req/min (1 per ~667ms)
// All server-side only. Do NOT import this in browser-executed code.
// Cover images: store only the CDN URL string — never download or re-host bytes.

const BASE = 'https://api.mangadex.org';
const COVERS_BASE = 'https://uploads.mangadex.org/covers';
const MIN_INTERVAL_MS = 720; // safely above the 667ms floor for 90 req/min

let lastRequestAt = 0;

async function throttledFetch(url: string, options?: RequestInit): Promise<Response> {
  const gap = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (gap > 0) await new Promise<void>(r => setTimeout(r, gap));
  lastRequestAt = Date.now();
  console.log('[MangaDex]', { event: 'request', url });
  return fetch(url, { ...options, headers: { 'User-Agent': 'MyMangaReader/1.0', ...options?.headers } });
}

async function fetchWithBackoff(url: string, options?: RequestInit, retries = 3): Promise<Response> {
  const res = await throttledFetch(url, options);
  if (res.status === 429 && retries > 0) {
    const wait = Math.max(2, Number(res.headers.get('Retry-After') || 2)) * 1000;
    console.warn('[MangaDex]', { event: 'rate_limited', url, retriesLeft: retries - 1, waitMs: wait });
    await new Promise<void>(r => setTimeout(r, wait));
    return fetchWithBackoff(url, options, retries - 1);
  }
  if (!res.ok) {
    console.error('[MangaDex]', { event: 'error', url, status: res.status });
  }
  return res;
}

export async function searchMangaDex(query: string, limit = 20) {
  const url = `${BASE}/manga?title=${encodeURIComponent(query)}&limit=${limit}&includes[]=cover_art&includes[]=author&contentRating[]=safe`;
  const res = await fetchWithBackoff(url);
  if (!res.ok) throw new Error(`MangaDex search failed: ${res.status}`);
  const json = await res.json() as { data: any[] };
  console.log('[MangaDex]', { event: 'search_result', query, count: json.data?.length ?? 0 });
  return json;
}

export async function getMangaDexById(mangaDexId: string) {
  const url = `${BASE}/manga/${mangaDexId}?includes[]=cover_art&includes[]=author&includes[]=artist`;
  const res = await fetchWithBackoff(url);
  if (!res.ok) throw new Error(`MangaDex fetch failed: ${res.status}`);
  const json = await res.json() as { data: any };
  return json;
}

// Returns the published volume structure: { volumes: { "1": { volume, count, chapters }, ... } }
// No language filter — we want ALL published volumes regardless of translation availability.
// (Filtering by en would exclude series like One Piece where Viz holds the English license
// and scanlations have been taken down from MangaDex.)
export async function getMangaDexAggregate(mangaDexId: string) {
  const url = `${BASE}/manga/${mangaDexId}/aggregate`;
  const res = await fetchWithBackoff(url);
  if (!res.ok) throw new Error(`MangaDex aggregate failed: ${res.status}`);
  const json = await res.json() as { volumes: Record<string, any> };
  const volumeKeys = Object.keys(json.volumes || {}).filter(k => k !== 'none');
  console.log('[MangaDex]', { event: 'aggregate_result', mangaDexId, volumeCount: volumeKeys.length });
  return json;
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

// Returns a name→UUID map for all genre/theme tags. Not throttled — it's a metadata endpoint.
export async function getMangaDexTags(): Promise<Record<string, string>> {
  try {
    const res = await fetch(`${BASE}/manga/tag`, { headers: { 'User-Agent': 'MyMangaReader/1.0' } });
    if (!res.ok) return {};
    const json = await res.json() as { data: any[] };
    const map: Record<string, string> = {};
    for (const tag of json.data ?? []) {
      const group: string = tag.attributes?.group;
      const name: string | undefined = tag.attributes?.name?.en;
      if (name && (group === 'genre' || group === 'theme')) map[name] = tag.id;
    }
    console.log('[MangaDex]', { event: 'tags_fetched', count: Object.keys(map).length });
    return map;
  } catch {
    return {};
  }
}

export async function getMangaDexByTag(tagId: string, limit = 15): Promise<{ data: any[] }> {
  const url = `${BASE}/manga?includedTags[]=${tagId}&order[rating]=desc&limit=${limit}&includes[]=cover_art&includes[]=author&contentRating[]=safe`;
  const res = await fetchWithBackoff(url);
  if (!res.ok) return { data: [] };
  return res.json() as Promise<{ data: any[] }>;
}

export async function getTrendingMangaDex(limit = 15): Promise<{ data: any[] }> {
  const url = `${BASE}/manga?order[followedCount]=desc&limit=${limit}&includes[]=cover_art&includes[]=author&contentRating[]=safe`;
  const res = await fetchWithBackoff(url);
  if (!res.ok) return { data: [] };
  return res.json() as Promise<{ data: any[] }>;
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

  const genres: string[] = (attr.tags ?? [])
    .filter((t: any) => t.attributes?.group === 'genre' || t.attributes?.group === 'theme')
    .map((t: any) => t.attributes?.name?.en)
    .filter(Boolean);

  const status: string | undefined = attr.status;

  // attributes.volumes is the declared count (null for ongoing); attributes.lastVolume is the highest published
  const rawVolumes = attr.volumes ? parseInt(attr.volumes) : undefined;
  const rawLastVolume = attr.lastVolume ? parseInt(attr.lastVolume) : undefined;
  const volumeCount: number | undefined =
    (!isNaN(rawVolumes as number) ? rawVolumes : undefined) ??
    (!isNaN(rawLastVolume as number) ? rawLastVolume : undefined);

  const coverRel = rels.find(r => r.type === 'cover_art');
  const coverFileName: string | undefined = coverRel?.attributes?.fileName;
  const coverUrl = coverFileName ? getCoverUrl(mangaData.id, coverFileName) : undefined;

  const authorRel = rels.find(r => r.type === 'author');
  const author: string | undefined = authorRel?.attributes?.name;

  return { title, altTitles, synopsis, genres, status, volumeCount, author, coverUrl };
}
