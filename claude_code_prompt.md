# Claude Code Prompt — MangaDex Migration + Popup Fix + Logging

## Context
Existing Next.js manga tracking site deployed on Vercel. Stack: Next.js, MongoDB atlas,
Clerk auth, Tailwind (or CSS modules — check what's in use). Live at
my-manga-reader-pi.vercel.app.

Read the codebase before making any changes. Understand existing patterns, then make targeted edits. - Note: The memories you made last are up to date, nothing has changed. If they are acurate, use them as a shortcut.
 Do not rebuild working things unless critical, and if you do, report on it in the summary you give briefly..

---

## Bug Report — Volume Popup (pages/manga-list.jsx or equivalent)

The volume popup opens for a series (e.g. One Piece) and shows:
  "No volumes available for this manga."
  Stats bar: Read: 0/0 — Online: 0 — Physical: 0

This is wrong. One Piece has 107+ volumes. The popup is receiving a zero or null
volumeCount and generating no rows.

### Diagnose and fix this before touching anything else:
1. Find where the popup fetches or reads volumeCount for the selected series
2. Check whether volumeCount is actually stored on the Manga document in MongoDB
   (it may be null/undefined if seeding never ran)
3. Check whether the popup generates volume rows from volumeCount correctly —
   if volumeCount is null, does it fall back gracefully or silently render nothing?
4. Trace the full data path: Kitsu API call → field mapping → Mongo storage (or direct
   use) → popup rendering. Find where the count is being lost.
5. Fix the root cause. If the field isn't being stored, store it. If it's stored but
   not read, fix the read. If null isn't handled, add a fallback.

---

## Task 1 — Replace Kitsu + MangaUpdates with MangaDex (live query, no seeding)

### Remove
- All live Kitsu API calls for search and manga detail
- All MangaUpdates API calls — remove entirely, we are not using this API anymore
- Do not delete the files yet, comment out and leave a // DEPRECATED notice

### Add — MangaDex as live query source
The utility already exists at lib/mangadex.ts. Wire it into the search and detail flows.

**Search:**
Replace Kitsu search with:
  GET https://api.mangadex.org/manga?title={query}&limit=20&includes[]=cover_art&includes[]=author

**Single title detail (for popup):**
  GET https://api.mangadex.org/manga/{id}?includes[]=cover_art&includes[]=author

**Cover image URL construction:**
MangaDex covers require a separate relationship. From the manga object:
  - Find the relationship with type "cover_art"
  - Get its attributes.fileName
  - Construct: https://uploads.mangadex.org/covers/{mangaId}/{fileName}.512.jpg
The lib/mangadex.ts getCoverUrl() function should handle this — use it.

**Field mapping from MangaDex response to your Manga schema:**
  - title: attributes.title.en (fall back to first available language)
  - altTitles: attributes.altTitles — array of {lang: title} objects, store English first
  - synopsis: attributes.description.en (fall back to first available)
  - genres: attributes.tags filtered to tag.attributes.group === "genre",
    mapped to tag.attributes.name.en
  - volumeCount: attributes.volumes (may be null for ongoing — store null, handle in UI)
  - author: from included relationships where type === "author", attributes.name
  - mangaDexId: data.id
  - status: attributes.status ("ongoing", "completed", "hiatus", "cancelled")

**Volume count null handling:**
If volumeCount is null (ongoing series with no declared volume count), the popup
should render a reasonable fallback — either show a message like "Volume count
unavailable — volumes will appear as data is updated" OR if there's a way to get
the actual highest volume number from MangaDex chapter data, use that.
Do NOT silently show "No volumes available" for a series that clearly exists.

**Rate limiting:**
The lib/mangadex.ts utility already has 720ms throttling and exponential backoff
on 429. Use it. Do not make raw fetch calls directly to MangaDex.

---

## Task 2 — Make the Popup Larger

The current popup is too small. Increase its size by 75–100%.

- Width: increase from current value to min-width 700px, max-width 900px
  (or 80vw if the current implementation uses viewport units)
- Height: allow it to grow taller — min-height 500px, max-height 85vh with
  internal scroll on the volume list area only (not the whole modal)
- The series header (cover image, title, genres) stays fixed at the top
- The stats bar stays fixed above the volume list
- The volume rows area scrolls independently if content exceeds available height
- Pagination stays at the bottom of the scroll area, always visible
- The modal should be centered both horizontally and vertically on the page

Do not change the dark background color or overall visual style — just make it bigger.

---

## Task 3 — Add Logging to the Volume Popup

Right now failures are silent ("No volumes available"). Add structured logging so
we can diagnose future failures from Vercel logs or browser console.

### Server-side (API route: pages/api/manga/volume-tracker/[mangaId].ts or equivalent):
Add console.log statements at these points:
  - Request received: log mangaId and userId
  - MongoDB query result: log whether a document was found, and what volumeCount is
  - Any catch block: log the full error object, not just error.message
  - Response being sent: log the shape of what's returned

Use this format so logs are easy to grep:
  console.log('[VolumeTracker]', { event: 'fetch', mangaId, userId, volumeCount })
  console.error('[VolumeTracker]', { event: 'error', mangaId, error: err.message, stack: err.stack })

### Client-side (popup component in pages/manga-list.jsx or equivalent):
Add console.log at:
  - When popup opens: log the manga object being passed in (title, id, volumeCount)
  - After API fetch for volume state: log the response and parsed data
  - When volumeCount is null/zero: log a specific warning
    console.warn('[VolumePopup] volumeCount is null or 0 for', manga.title, manga)
  - In catch blocks: log full error
  - When volume rows are generated: log how many rows were created

### MangaDex utility (lib/mangadex.ts):
Add logging to:
  - Each outbound request: log the URL being called
  - Each 429 response: log the retry attempt number and wait time
  - Each successful response: log the number of results returned
  - Any error: log full error with the URL that caused it

Use prefix [MangaDex] for all logs from this file.

---

## Task 4 — Cleanup

- Remove MangaUpdates from the API summary in any README or internal docs
- Update any comments in code that reference Kitsu as the primary source
- If there's a .env.example or similar, add NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG
  and MANGADEX_BASE_URL=https://api.mangadex.org as documented variables
- Leave KITSU_ env vars in .env.example as commented-out legacy references

---

## Output
For each task, report:
1. What you found (the existing code/data causing the issue)
2. What you changed
3. Any remaining ambiguity or things I should manually verify

Flag immediately if the volume count bug has a different root cause than expected —
do not silently work around it, explain what you found first.