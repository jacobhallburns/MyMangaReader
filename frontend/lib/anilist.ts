// AniList GraphQL API — used as a fallback volume-count source when MangaDex
// returns null for lastVolume/volumes. No API key required for public queries.
// Rate limit: 90 requests/minute.

const ENDPOINT = 'https://graphql.anilist.co';

const QUERY = `
  query ($search: String) {
    Media(search: $search, type: MANGA) {
      volumes
      title { romaji english native }
    }
  }
`;

export async function getAniListVolumeCount(title: string): Promise<number | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ query: QUERY, variables: { search: title } }),
    });

    if (!res.ok) {
      console.warn('[AniList]', { event: 'request_failed', status: res.status, title });
      return null;
    }

    const json = await res.json();
    const volumes: unknown = json?.data?.Media?.volumes;
    const matched: string = json?.data?.Media?.title?.english
      ?? json?.data?.Media?.title?.romaji
      ?? '(unknown)';

    console.log('[AniList]', { event: 'volume_lookup', title, matched, volumes });

    return typeof volumes === 'number' && volumes > 0 ? volumes : null;
  } catch (err: any) {
    console.warn('[AniList]', { event: 'fetch_error', title, error: err.message });
    return null;
  }
}
