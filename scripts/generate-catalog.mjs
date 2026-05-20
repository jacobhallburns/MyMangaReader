// scripts/generate-catalog.mjs
// Run: node scripts/generate-catalog.mjs
// Deps: npm install node-fetch
// Set env: AMAZON_ASSOCIATE_TAG=yourname-20
// Outputs: catalog-A-F.csv, catalog-G-L.csv, catalog-M-R.csv, catalog-S-Z.csv
// Progress saved every 100 entries — safe to interrupt and resume.

import fetch from 'node-fetch';
import {
  createWriteStream,
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from 'fs';
import { join } from 'path';

const ASSOCIATE_TAG = process.env.AMAZON_ASSOCIATE_TAG ?? '';
const KITSU_BASE = 'https://kitsu.io/api/edge';
const DELAY_MS = 300;
const OUTPUT_DIR = '../AffiliateLinks';
const PROGRESS_FILE = join(OUTPUT_DIR, 'catalog-progress.json');
mkdirSync(OUTPUT_DIR, { recursive: true });

const BUCKETS = [
  { name: 'A-F', file: join(OUTPUT_DIR, 'catalog-A-F.csv'), test: c => c <= 'F' },
  { name: 'G-L', file: join(OUTPUT_DIR, 'catalog-G-L.csv'), test: c => c >= 'G' && c <= 'L' },
  { name: 'M-R', file: join(OUTPUT_DIR, 'catalog-M-R.csv'), test: c => c >= 'M' && c <= 'R' },
  { name: 'S-Z', file: join(OUTPUT_DIR, 'catalog-S-Z.csv'), test: c => c >= 'S' },
];

// --- URL builder ---

function buildKindleUrl(title, volumeNum, serialization) {
  const pub = serialization ? ` ${serialization}` : '';
  const query = volumeNum != null
    ? encodeURIComponent(`"${title}, Vol. ${volumeNum}"${pub}`)
    : encodeURIComponent(`${title} manga${pub}`);
  const tag = ASSOCIATE_TAG ? `&tag=${ASSOCIATE_TAG}` : '';
  return `https://www.amazon.com/s?k=${query}&i=digital-text${tag}`;
}

// --- CSV helpers ---

function escapeCsv(val) {
  const s = String(val ?? '');
  return s.includes(',') || s.includes('"') || s.includes('\n')
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function writeRow(stream, fields) {
  stream.write(fields.map(escapeCsv).join(',') + '\n');
}

function getBucket(title) {
  const first = (title[0] ?? '#').toUpperCase();
  return BUCKETS.find(b => b.test(first)) ?? BUCKETS[3];
}

// --- Kitsu helpers ---

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchJson(url) {
  await sleep(DELAY_MS);
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.api+json' }
  });
  if (res.status === 404) return null;
  if (res.status === 429) {
    console.warn('\nRate limited — waiting 10s...');
    await sleep(10000);
    return fetchJson(url);
  }
  if (!res.ok) throw new Error(`${res.status} → ${url}`);
  return res.json();
}

async function getAllManga() {
  const all = [];
  let url = `${KITSU_BASE}/manga?page[limit]=20&sort=title`;
  let page = 1;
  while (url) {
    process.stdout.write(`\rFetching manga list... page ${page}`);
    const data = await fetchJson(url);
    if (!data) break;
    all.push(...data.data);
    url = data.links?.next ?? null;
    page++;
  }
  console.log(`\nTotal: ${all.length} manga`);
  return all;
}

async function getSerialization(kitsuId) {
  try {
    const data = await fetchJson(
      `${KITSU_BASE}/manga/${kitsuId}?fields[manga]=serialization`
    );
    return data?.data?.attributes?.serialization ?? null;
  } catch { return null; }
}

// --- MangaDex chapter + volume data ---

async function getMangaDexChapters(title) {
  try {
    const searchRes = await fetch(
      `https://api.mangadex.org/manga?title=${encodeURIComponent(title)}&limit=1&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic`
    );
    const searchJson = await searchRes.json();
    const mangaId = searchJson?.data?.[0]?.id;
    if (!mangaId) return [];

    const aggRes = await fetch(
      `https://api.mangadex.org/manga/${mangaId}/aggregate?translatedLanguage[]=en`
    );
    const aggJson = await aggRes.json();
    const volumesObj = aggJson?.volumes ?? {};
    const volumes = Object.values(volumesObj)
      .map(vol => {
        const volumeNumber = vol.volume === 'none' || vol.volume == null
          ? null
          : Number(vol.volume);
        const chapters = Object.keys(vol.chapters ?? {})
          .map(Number)
          .filter(n => !isNaN(n))
          .sort((a, b) => a - b);
        return { volumeNumber, chapters };
      })
      .filter(vol => vol.chapters.length > 0)
      .sort((a, b) => {
        if (a.volumeNumber === null) return 1;
        if (b.volumeNumber === null) return -1;
        return a.volumeNumber - b.volumeNumber;
      });

    return volumes;
  } catch {
    return [];
  }
}

// --- Main ---

async function run() {
  if (!ASSOCIATE_TAG) {
    console.warn('Warning: AMAZON_ASSOCIATE_TAG not set — links will have no tag\n');
  }

  // Resume support
  let completedIds = new Set();
  if (existsSync(PROGRESS_FILE)) {
    const saved = JSON.parse(readFileSync(PROGRESS_FILE, 'utf8'));
    completedIds = new Set(saved.completedIds);
    console.log(`Resuming — ${completedIds.size} entries already done\n`);
  }

  // Open CSV streams
  const streams = {};
  for (const bucket of BUCKETS) {
    const isResume = existsSync(bucket.file) && completedIds.size > 0;
    streams[bucket.name] = createWriteStream(bucket.file, {
      flags: isResume ? 'a' : 'w'
    });
    if (!isResume) {
      writeRow(streams[bucket.name], [
        'mangaTitle',
        'kitsuId',
        'volumeNumber',
        'chapters',
        'kindleUrl',
      ]);
    }
  }

  const allManga = await getAllManga();
  let processed = 0;
  let skipped = 0;
  let errors = 0;

  for (const manga of allManga) {
    const id = manga.id;

    if (completedIds.has(id)) {
      skipped++;
      processed++;
      continue;
    }

    const title = manga.attributes.titles?.en
      ?? manga.attributes.titles?.en_jp
      ?? manga.attributes.slug
      ?? `Unknown-${id}`;

    process.stdout.write(
      `\r[${++processed}/${allManga.length}] ${title.substring(0, 50).padEnd(50)}`
    );

    try {
      const [volumes, serialization] = await Promise.all([
        getMangaDexChapters(title),
        getSerialization(id)
      ]);
      const bucket = getBucket(title);
      const stream = streams[bucket.name];

      if (volumes.length === 0) {
        // No chapter data — write a single series-level fallback row
        writeRow(stream, [
          title, id, '1', '', buildKindleUrl(title, 1, serialization),
        ]);
      } else {
        for (const vol of volumes) {
          const chapterList = vol.chapters.sort((a, b) => a - b).join(',');
          writeRow(stream, [
            title, id, vol.volumeNumber ?? 'unknown', chapterList,
            buildKindleUrl(title, vol.volumeNumber, serialization),
          ]);
        }
      }

      completedIds.add(id);

      // Checkpoint every 100 entries
      if (processed % 100 === 0) {
        writeFileSync(PROGRESS_FILE, JSON.stringify({
          completedIds: [...completedIds]
        }));
      }

    } catch (err) {
      errors++;
      process.stdout.write(` ✗ ${err.message}\n`);
    }
  }

  // Close all streams
  for (const bucket of BUCKETS) {
    streams[bucket.name].end();
  }

  // Final progress save
  writeFileSync(PROGRESS_FILE, JSON.stringify({
    completedIds: [...completedIds]
  }));

  console.log(`\n\nDone!`);
  console.log(`Processed: ${processed}`);
  console.log(`Skipped:   ${skipped} (already done)`);
  console.log(`Errors:    ${errors}`);
  console.log(`\nOutput files:`);
  for (const b of BUCKETS) console.log(`  ${b.file}`);
}

run().catch(console.error);