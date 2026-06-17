// Kitsu JSON:API client — server-side only.
// Do NOT import this file directly inside browser-only React components.

import {
  extractRawTitlesFromKitsu,
  resolvePrimaryTitle,
  resolveAltTitles,
  RawTitles,
} from './titleLocale';

const ENDPOINT = process.env.KITSU_BASE_URL || 'https://kitsu.io/api/edge';
const MIN_INTERVAL_MS = 500;

let lastRequestAt = 0;

type KitsuResource = Record<string, any>;

type KitsuCollection = {
  data: KitsuResource[];
};

async function throttledGet(
  path: string,
  params: Record<string, string | number | undefined> = {}
): Promise<any> {
  const gap = MIN_INTERVAL_MS - (Date.now() - lastRequestAt);
  if (gap > 0) await new Promise<void>((resolve) => setTimeout(resolve, gap));
  lastRequestAt = Date.now();

  const url = new URL(`${ENDPOINT}${path}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') {
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      Accept: 'application/vnd.api+json',
    },
  });

  if (res.status === 429) {
    const wait = Math.max(
      2000,
      Number(res.headers.get('Retry-After') ?? 2) * 1000
    );

    console.warn('[Kitsu]', {
      event: 'rate_limited',
      waitMs: wait,
    });

    await new Promise<void>((resolve) => setTimeout(resolve, wait));
    return throttledGet(path, params);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');

    console.error('[Kitsu]', {
      event: 'http_error',
      status: res.status,
      body: text.slice(0, 200),
      url: url.toString(),
    });

    throw new Error(`Kitsu request failed: ${res.status}`);
  }

  return res.json();
}

function includedKey(type: string, id: string): string {
  return `${type}:${id}`;
}

function attachIncludedCategories(json: any): KitsuResource[] {
  const included = Array.isArray(json?.included) ? json.included : [];
  const includedMap = new Map<string, KitsuResource>();

  for (const item of included) {
    if (item?.type && item?.id) {
      includedMap.set(includedKey(item.type, item.id), item);
    }
  }

  return (json?.data ?? []).map((item: KitsuResource) => {
    const rels = [
      ...(item?.relationships?.categories?.data ?? []),
      ...(item?.relationships?.genres?.data ?? []),
    ];

    const categories = rels
      .map((rel: any) => includedMap.get(includedKey(rel.type, rel.id)))
      .filter(Boolean);

    return {
      ...item,
      _includedCategories: categories,
    };
  });
}

function sanitizeLimit(limit: number): number {
  return Math.max(1, Math.min(Number(limit) || 20, 20));
}

function categorySlug(name: string): string {
  return String(name)
    .trim()
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function searchKitsu(
  query: string,
  limit = 20
): Promise<KitsuCollection> {
  const json = await throttledGet('/manga', {
    'filter[text]': query,
    'page[limit]': sanitizeLimit(limit),
    include: 'categories',
  });

  const data = attachIncludedCategories(json);

  console.log('[Kitsu]', {
    event: 'search',
    query,
    count: data.length,
  });

  return { data };
}

export async function getKitsuById(
  id: string
): Promise<{ data: KitsuResource | null }> {
  const json = await throttledGet(`/manga/${encodeURIComponent(id)}`, {
    include: 'categories',
  });

  const data =
    attachIncludedCategories({
      data: json?.data ? [json.data] : [],
      included: json?.included,
    })[0] ?? null;

  return { data };
}

export async function getTrendingKitsu(limit = 25): Promise<KitsuCollection> {
  const json = await throttledGet('/manga', {
    sort: 'popularityRank',
    'page[limit]': sanitizeLimit(limit),
    include: 'categories',
  });

  const data = attachIncludedCategories(json);

  console.log('[Kitsu]', {
    event: 'trending',
    count: data.length,
  });

  return { data };
}

export async function getKitsuByGenre(
  genre: string,
  limit = 20
): Promise<KitsuCollection> {
  const slug = categorySlug(genre);

  try {
    const json = await throttledGet('/manga', {
      'filter[categories]': slug,
      sort: 'popularityRank',
      'page[limit]': sanitizeLimit(limit),
      include: 'categories',
    });

    const data = attachIncludedCategories(json);

    console.log('[Kitsu]', {
      event: 'by_genre',
      genre,
      slug,
      count: data.length,
    });

    if (data.length > 0) return { data };
  } catch (err: any) {
    console.warn('[Kitsu]', {
      event: 'by_genre_failed',
      genre,
      slug,
      error: err.message,
    });
  }

  return searchKitsu(genre, limit);
}

export async function getRandomKitsu(limit = 5): Promise<KitsuCollection> {
  const offset = Math.floor(Math.random() * 5000);

  try {
    const json = await throttledGet('/manga', {
      sort: 'popularityRank',
      'page[limit]': sanitizeLimit(limit),
      'page[offset]': offset,
      include: 'categories',
    });

    const data = attachIncludedCategories(json);

    console.log('[Kitsu]', {
      event: 'random',
      offset,
      count: data.length,
    });

    if (data.length > 0) return { data };
  } catch (err: any) {
    console.warn('[Kitsu]', {
      event: 'random_failed',
      offset,
      error: err.message,
    });
  }

  return getTrendingKitsu(limit);
}

export function getKitsuGenres(): string[] {
  return [
    'Action',
    'Adventure',
    'Comedy',
    'Drama',
    'Fantasy',
    'Horror',
    'Mystery',
    'Romance',
    'Science Fiction',
    'Slice of Life',
    'Sports',
    'Supernatural',
    'Thriller',
    'Psychological',
    'Historical',
    'School',
    'Martial Arts',
    'Seinen',
    'Shounen',
    'Shoujo',
    'Josei',
  ];
}

export interface KitsuMeta {
  kitsuId: string;
  title: string;
  altTitles: string[];
  rawTitles: RawTitles;
  synopsis: string;
  genres: string[];
  status: string | undefined;
  chapterCount: number | undefined;
  volumeCount: number | undefined;
  serialization: string | undefined;
  mangaType: string | undefined;
  author: string | undefined;
  coverUrl: string | undefined;
}

function mapStatus(status: string | null | undefined): string | undefined {
  if (!status) return undefined;

  const map: Record<string, string> = {
    current: 'ongoing',
    finished: 'completed',
    tba: 'tba',
    unreleased: 'not_yet_released',
    upcoming: 'not_yet_released',
  };

  return map[status] ?? String(status).toLowerCase();
}

function positiveNumber(value: any): number | undefined {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function extractKitsuMeta(media: KitsuResource): KitsuMeta {
  const attributes = media?.attributes ?? {};

  const rawTitles = extractRawTitlesFromKitsu(media);

  const title =
    resolvePrimaryTitle(rawTitles, 'en') ||
    attributes.canonicalTitle ||
    `Kitsu #${media?.id}`;

  const altTitles = resolveAltTitles(rawTitles, 'en');

  const synopsis = attributes.synopsis ?? attributes.description ?? '';

  const genres: string[] = (media?._includedCategories ?? [])
    .map(
      (category: any) =>
        category?.attributes?.title ??
        category?.attributes?.name ??
        category?.attributes?.slug
    )
    .filter(Boolean)
    .filter(
      (value: string, index: number, arr: string[]) =>
        arr.indexOf(value) === index
    );

  const poster = attributes.posterImage ?? {};

  const coverUrl: string | undefined =
    poster.original ??
    poster.large ??
    poster.medium ??
    poster.small ??
    poster.tiny ??
    undefined;

  return {
    kitsuId: String(media.id),
    title,
    altTitles,
    rawTitles,
    synopsis,
    genres,
    status: mapStatus(attributes.status),
    chapterCount: positiveNumber(attributes.chapterCount),
    volumeCount: positiveNumber(attributes.volumeCount),
    serialization: attributes.serialization || undefined,
    mangaType: attributes.mangaType || attributes.subtype || undefined,
    author: undefined,
    coverUrl,
  };
}