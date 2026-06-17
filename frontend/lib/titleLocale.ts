export interface RawTitles {
  primary: Record<string, string>;
  alt: Array<{ lang: string; title: string }>;
}

export const SUPPORTED_LANGUAGES: ReadonlyArray<{ code: string; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'ja-ro', label: 'Romaji' },
  { code: 'ja', label: 'Japanese' },
];

const NATIVE_LANGS = ['ja', 'ja_jp', 'ko', 'zh', 'zh-hk', 'zh-tw'];

function addIfPresent(target: Record<string, string>, key: string, value?: string) {
  if (typeof value === 'string' && value.trim()) target[key] = value.trim();
}

export function extractRawTitlesFromKitsu(media: any): RawTitles {
  const attributes = media?.attributes ?? {};
  const titles = attributes.titles ?? {};
  const primary: Record<string, string> = {};

  addIfPresent(primary, 'en', titles.en ?? titles.en_us);
  addIfPresent(primary, 'ja-ro', titles.en_jp ?? attributes.canonicalTitle);
  addIfPresent(primary, 'ja', titles.ja_jp);

  // If Kitsu only gives canonicalTitle, keep it as English fallback so the UI never goes blank.
  if (!primary.en && attributes.canonicalTitle) {
    addIfPresent(primary, 'en', attributes.canonicalTitle);
  }

  const alt: Array<{ lang: string; title: string }> = [];

  for (const [lang, title] of Object.entries(titles)) {
    if (typeof title === 'string' && title.trim()) {
      const mappedLang =
        lang === 'en_jp'
          ? 'ja-ro'
          : lang === 'ja_jp'
            ? 'ja'
            : lang.replace('_', '-');

      alt.push({ lang: mappedLang, title: title.trim() });
    }
  }

  for (const title of attributes.abbreviatedTitles ?? []) {
    if (typeof title === 'string' && title.trim()) {
      alt.push({ lang: 'other', title: title.trim() });
    }
  }

  return { primary, alt };
}

export function extractRawTitlesFromMedia(media: any): RawTitles {
  if (media?.attributes?.titles || media?.attributes?.canonicalTitle) {
    return extractRawTitlesFromKitsu(media);
  }

  // Generic fallback for older raw objects that may still be in browser state.
  const primary: Record<string, string> = {};

  if (media?.title?.english) primary.en = media.title.english;
  if (media?.title?.romaji) primary['ja-ro'] = media.title.romaji;
  if (media?.title?.native) primary.ja = media.title.native;

  const alt: Array<{ lang: string; title: string }> = (media?.synonyms ?? [])
    .filter(Boolean)
    .map((t: string) => ({ lang: 'other', title: t }));

  return { primary, alt };
}

export function resolvePrimaryTitle(raw: RawTitles, lang: string = 'en'): string {
  if (raw.primary[lang]) return raw.primary[lang];
  if (lang === 'en' && raw.primary['en-us']) return raw.primary['en-us'];

  const altMatch = raw.alt.find(
    (a) => a.lang === lang || (lang === 'en' && a.lang === 'en-us')
  );

  if (altMatch) return altMatch.title;

  return (
    raw.primary.en ??
    raw.primary['en-us'] ??
    raw.primary['ja-ro'] ??
    raw.alt.find((a) => a.lang === 'en' || a.lang === 'en-us')?.title ??
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

  const en =
    raw.primary.en ??
    raw.primary['en-us'] ??
    raw.alt.find((a) => a.lang === 'en' || a.lang === 'en-us')?.title;

  if (en) add(en);

  for (const nl of NATIVE_LANGS) {
    const t = raw.primary[nl] ?? raw.alt.find((a) => a.lang === nl)?.title;
    if (t) add(t);
  }

  if (raw.primary['ja-ro']) add(raw.primary['ja-ro']);

  for (const a of raw.alt) {
    if (a.lang.endsWith('-ro')) add(a.title);
  }

  for (const a of raw.alt) {
    add(a.title);
  }

  for (const t of Object.values(raw.primary)) {
    add(t);
  }

  return result;
}