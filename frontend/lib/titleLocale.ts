export interface RawTitles {
  primary: Record<string, string>;
  alt: Array<{ lang: string; title: string }>;
}

export const SUPPORTED_LANGUAGES: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'ja-ro', label: 'Romaji' },
  { code: 'ja', label: 'Japanese' },
];

const NATIVE_LANGS = ['ja', 'ko', 'zh', 'zh-hk', 'zh-tw'];

export function extractRawTitlesFromAniList(media: any): RawTitles {
  const primary: Record<string, string> = {};
  if (media?.title?.english) primary['en'] = media.title.english;
  if (media?.title?.romaji) primary['ja-ro'] = media.title.romaji;
  if (media?.title?.native) primary['ja'] = media.title.native;
  const alt: Array<{ lang: string; title: string }> = (media?.synonyms ?? [])
    .filter(Boolean)
    .map((t: string) => ({ lang: 'other', title: t }));
  return { primary, alt };
}

export function resolvePrimaryTitle(raw: RawTitles, lang: string = 'en'): string {
  if (raw.primary[lang]) return raw.primary[lang];
  if (lang === 'en' && raw.primary['en-us']) return raw.primary['en-us'];
  const altMatch = raw.alt.find(
    a => a.lang === lang || (lang === 'en' && a.lang === 'en-us')
  );
  if (altMatch) return altMatch.title;
  return (
    raw.primary['en'] ??
    raw.primary['en-us'] ??
    raw.alt.find(a => a.lang === 'en' || a.lang === 'en-us')?.title ??
    Object.values(raw.primary)[0] ??
    ''
  );
}

export function resolveAltTitles(raw: RawTitles, lang: string = 'en'): string[] {
  const primary = resolvePrimaryTitle(raw, lang);
  const seen = new Set([primary.trim().toLowerCase()]);
  const result: string[] = [];

  function add(title: string) {
    const key = title.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    result.push(title.trim());
  }

  // English title (most widely readable — useful when primary is non-English)
  const en =
    raw.primary['en'] ??
    raw.primary['en-us'] ??
    raw.alt.find(a => a.lang === 'en' || a.lang === 'en-us')?.title;
  if (en) add(en);

  // Native script titles
  for (const nl of NATIVE_LANGS) {
    const t = raw.primary[nl] ?? raw.alt.find(a => a.lang === nl)?.title;
    if (t) add(t);
  }

  // Romanizations (e.g. ja-ro, ko-ro)
  for (const a of raw.alt) {
    if (a.lang.endsWith('-ro')) add(a.title);
  }

  // All remaining alt titles
  for (const a of raw.alt) {
    add(a.title);
  }

  // Any remaining primary titles not yet shown
  for (const t of Object.values(raw.primary)) {
    add(t);
  }

  return result;
}
