// scripts/test-tokyo-ghoul.mjs
// Run: node scripts/test-tokyo-ghoul.mjs
// Deps: npm install node-fetch
// Set env: AMAZON_ASSOCIATE_TAG=yourname-20

import fetch from 'node-fetch';
import { createWriteStream, mkdirSync } from 'fs';
import { join } from 'path';

const ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG ?? '';
const KITSU_BASE = 'https://kitsu.io/api/edge';
const OUTPUT_DIR = '../AffiliateLinks';
mkdirSync(OUTPUT_DIR, { recursive: true });

function buildKindleUrl(title, volumeNum, serialization) {
  const pub = serialization ? ` ${serialization}` : '';
  const query = volumeNum != null
    ? encodeURIComponent(`"${title}, Vol. ${volumeNum}"${pub}`)
    : encodeURIComponent(`${title} manga${pub}`);
  const tag = ASSOCIATE_TAG ? `&tag=${ASSOCIATE_TAG}` : '';
  return `https://www.amazon.com/s?k=${query}&i=digital-text${tag}`;
}

function escapeCsv(val) {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function writeRow(stream, fields) {
  stream.write(fields.map(escapeCsv).join(',') + '\n');
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.api+json' }
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`${res.status} → ${url}`);
  return res.json();
}

async function getManga(title) {
  const data = await fetchJson(
    `${KITSU_BASE}/manga?filter[text]=${encodeURIComponent(title)}&page[limit]=1`
  );
  return data?.data[0] ?? null;
}

async function getSerialization(kitsuId) {
  try {
    const data = await fetchJson(
      `${KITSU_BASE}/manga/${kitsuId}?fields[manga]=serialization`
    );
    return data?.data?.attributes?.serialization ?? null;
  } catch { return null; }
}

async function getMangaUpdatesVolumes(title) {
  try {
    const searchRes = await fetch(
      'https://api.mangaupdates.com/v1/series/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ search: title, perpage: 1 })
      }
    );
    const searchJson = await searchRes.json();
    const seriesId = searchJson?.results?.[0]?.record?.series_id;
    if (!seriesId) return [];

    const seriesRes = await fetch(`https://api.mangaupdates.com/v1/series/${seriesId}`);
    const series = await seriesRes.json();

    // Parse "14 Volumes (Complete)" or "5 Volumes (Ongoing)" etc.
    const match = series?.status?.match(/^(\d+)\s+Volumes?/i);
    const volumeCount = match ? parseInt(match[1], 10) : null;
    if (!volumeCount) return [];

    return Array.from({ length: volumeCount }, (_, i) => ({
      volumeNumber: i + 1,
      chapters: []
    }));
  } catch {
    return [];
  }
}

async function run() {
  console.log('Fetching Tokyo Ghoul from Kitsu...');

  const manga = await getManga('Tokyo Ghoul');
  if (!manga) { console.error('Not found on Kitsu'); process.exit(1); }

  const title = manga.attributes.titles.en
    ?? manga.attributes.titles.en_jp
    ?? 'Tokyo Ghoul';

  const [volumes, serialization] = await Promise.all([
    getMangaUpdatesVolumes(title),
    getSerialization(manga.id)
  ]);

  const chapterCount = volumes.reduce((sum, v) => sum + v.chapters.length, 0);
  console.log(`\nTitle:           ${title}`);
  console.log(`Chapters found:  ${chapterCount}`);
  console.log(`Serialization:   ${serialization ?? 'none'}`);
  console.log(`Volumes derived: ${volumes.length}\n`);

  const outPath = join(OUTPUT_DIR, 'test-tokyo-ghoul.csv');
  const out = createWriteStream(outPath);

  writeRow(out, ['mangaTitle', 'kitsuId', 'volumeNumber', 'chapters', 'kindleUrl']);

  if (volumes.length === 0) {
    writeRow(out, [
      title, manga.id, '1', '', buildKindleUrl(title, 1, serialization),
    ]);
    console.log('No chapter data — wrote series-level fallback row');
  } else {
    for (const vol of volumes) {
      const chapterList = vol.chapters.sort((a, b) => a - b).join(',');
      const kindleUrl = buildKindleUrl(title, vol.volumeNumber, serialization);
      writeRow(out, [
        title, manga.id, vol.volumeNumber ?? 'unknown', chapterList, kindleUrl,
      ]);
      console.log(
        `  Vol ${String(vol.volumeNumber ?? 'unknown').padEnd(7)} ` +
        `chapters [${chapterList}] → ${kindleUrl}`
      );
    }
  }

  out.end(() => {
    console.log(`\nWritten to ${outPath}`);
    if (!ASSOCIATE_TAG) {
      console.warn('Warning: AMAZON_ASSOCIATE_TAG not set — links have no tag');
    }
  });
}

run().catch(console.error);