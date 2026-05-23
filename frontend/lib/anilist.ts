// AniList GraphQL API — rate limit: 90 req/min
// Server-side only. Do NOT import this in browser-executed code.

import { extractRawTitlesFromAniList, resolvePrimaryTitle, resolveAltTitles, RawTitles } from './titleLocale';

const ENDPOINT = 'https://graphql.anilist.co';
const MIN_INTERVAL_MS = 750;

let lastRequestAt = 0;

async function throttledRequest(query: string, variables: Record<string, any> = {}): Promise<any> {
  const gap = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (gap > 0) await new Promise<void>(r => setTimeout(r, gap));
  lastRequestAt = Date.now();

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });

  if (res.status === 429) {
    const wait = Math.max(2000, Number(res.headers.get('Retry-After') ?? 2) * 1000);
    console.warn('[AniList]', { event: 'rate_limited', waitMs: wait });
    await new Promise<void>(r => setTimeout(r, wait));
    return throttledRequest(query, variables);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('[AniList]', { event: 'http_error', status: res.status, body: text.slice(0, 200) });
    throw new Error(`AniList request failed: ${res.status}`);
  }

  const json = await res.json();
  if (json.errors?.length) {
    console.error('[AniList]', { event: 'graphql_error', errors: json.errors });
  }
  return json;
}

// Shared field set for all media queries
const MEDIA_FIELDS = `
  id
  title { english romaji native }
  synonyms
  description(asHtml: false)
  coverImage { extraLarge large }
  genres
  tags { name category rank isAdult }
  volumes
  chapters
  status
  averageScore
  popularity
  format
  countryOfOrigin
  staff(sort: [RELEVANCE], page: 1, perPage: 5) {
    edges { role node { name { full } } }
  }
`;

// ─── Queries ───────────────────────────────────────────────────────────────────

export async function searchAniList(query: string, limit = 20): Promise<{ data: any[] }> {
  const gql = `
    query ($search: String, $perPage: Int) {
      Page(perPage: $perPage) {
        media(search: $search, type: MANGA, sort: [SEARCH_MATCH], format_not_in: [NOVEL]) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const json = await throttledRequest(gql, { search: query, perPage: limit });
  const data: any[] = json?.data?.Page?.media ?? [];
  console.log('[AniList]', { event: 'search', query, count: data.length });
  return { data };
}

export async function getAniListById(id: number): Promise<{ data: any }> {
  const gql = `
    query ($id: Int) {
      Media(id: $id, type: MANGA) {
        ${MEDIA_FIELDS}
      }
    }
  `;
  const json = await throttledRequest(gql, { id });
  return { data: json?.data?.Media ?? null };
}

export async function getTrendingAniList(limit = 25): Promise<{ data: any[] }> {
  const gql = `
    query ($perPage: Int) {
      Page(perPage: $perPage) {
        media(type: MANGA, sort: [TRENDING_DESC], format_not_in: [NOVEL]) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const json = await throttledRequest(gql, { perPage: limit });
  const data: any[] = json?.data?.Page?.media ?? [];
  console.log('[AniList]', { event: 'trending', count: data.length });
  return { data };
}

export async function getAniListByGenre(genre: string, limit = 20): Promise<{ data: any[] }> {
  const gql = `
    query ($genre: String, $perPage: Int) {
      Page(perPage: $perPage) {
        media(type: MANGA, genre: $genre, sort: [SCORE_DESC], format_not_in: [NOVEL]) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const json = await throttledRequest(gql, { genre, perPage: limit });
  const data: any[] = json?.data?.Page?.media ?? [];
  console.log('[AniList]', { event: 'by_genre', genre, count: data.length });
  return { data };
}

const RANDOM_SORTS = ['SCORE_DESC', 'POPULARITY_DESC', 'TRENDING_DESC'] as const;

export async function getRandomAniList(limit = 5): Promise<{ data: any[] }> {
  const sort = RANDOM_SORTS[Math.floor(Math.random() * RANDOM_SORTS.length)];
  const page = Math.floor(Math.random() * 3000) + 1;
  const gql = `
    query ($page: Int, $perPage: Int, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        media(type: MANGA, sort: $sort, format_not_in: [NOVEL]) {
          ${MEDIA_FIELDS}
        }
      }
    }
  `;
  const json = await throttledRequest(gql, { page, perPage: limit, sort: [sort] });
  const data: any[] = json?.data?.Page?.media ?? [];
  console.log('[AniList]', { event: 'random', sort, page, count: data.length });
  return { data };
}

export function getAniListGenres(): string[] {
  return [
    'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy',
    'Horror', 'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological',
    'Romance', 'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
  ];
}

// ─── Meta extraction ───────────────────────────────────────────────────────────

export interface AniListMeta {
  anilistId: number;
  title: string;
  altTitles: string[];
  rawTitles: RawTitles;
  synopsis: string;
  genres: string[];
  status: string | undefined;
  volumeCount: number | undefined;
  author: string | undefined;
  coverUrl: string | undefined;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&[^;]+;/g, m => {
    const entities: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'" };
    return entities[m] ?? ' ';
  }).replace(/\s+/g, ' ').trim();
}

function mapStatus(status: string | null | undefined): string | undefined {
  if (!status) return undefined;
  const map: Record<string, string> = {
    FINISHED: 'completed',
    RELEASING: 'ongoing',
    NOT_YET_RELEASED: 'not_yet_released',
    CANCELLED: 'cancelled',
    HIATUS: 'hiatus',
  };
  return map[status] ?? status.toLowerCase();
}

export function extractAniListMeta(media: any): AniListMeta {
  const rawTitles = extractRawTitlesFromAniList(media);
  const title = resolvePrimaryTitle(rawTitles, 'en');
  const altTitles = resolveAltTitles(rawTitles, 'en');
  const synopsis = media.description ? stripHtml(media.description) : '';
  const genres: string[] = media.genres ?? [];
  const status = mapStatus(media.status);
  const volumeCount: number | undefined = typeof media.volumes === 'number' && media.volumes > 0 ? media.volumes : undefined;
  const coverUrl: string | undefined = media.coverImage?.extraLarge ?? media.coverImage?.large ?? undefined;

  const staff: Array<{ role: string; name: string }> = (media.staff?.edges ?? []).map((e: any) => ({
    role: e.role ?? '',
    name: e.node?.name?.full ?? '',
  }));
  const authorEdge =
    staff.find(s => s.role === 'Story & Art') ??
    staff.find(s => s.role === 'Story') ??
    staff.find(s => s.role === 'Art') ??
    staff[0];
  const author: string | undefined = authorEdge?.name || undefined;

  return { anilistId: media.id, title, altTitles, rawTitles, synopsis, genres, status, volumeCount, author, coverUrl };
}
