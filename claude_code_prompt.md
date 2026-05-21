# Claude Code Prompt — Volume Tracker Popup + API Migration

## Context
This is an existing manga/comic tracking and discovery website (working name: MyMangaReader).
The site already has infrastructure including routing, components, a user auth system, and existing
API integrations. Do NOT rebuild the whole site. Read the existing codebase first, understand the
patterns already in use (component structure, state management, styling approach, API call conventions),
and make targeted changes that match the existing style.

---

## Task 1 — Volume Tracker Popup Component

### What to build
Rebuild the existing volume list UI as a **modal/popup overlay** component. If a modal system
already exists in the codebase, use it. If not, create a self-contained popup with a backdrop overlay.

### Layout requirements
- **10 volumes per page**, paginated, single column
- Each row contains:
  - Volume number label (e.g. "Volume 1")
  - **Read/Unread toggle button** — no checkbox. Starts as a muted "Unread" button. When clicked,
    it changes to "Read" with a visually distinct active state (brighter color, subtle glow or
    highlight — match whatever accent/primary color the site already uses). Clicking again toggles
    back to Unread.
  - **Online Copy toggle** — checkbox or toggle, label "Online Copy"
  - **Physical Copy toggle** — checkbox or toggle, label "Physical Copy"
  - **"Buy on Amazon" button** — affiliate link. Construct the URL as:
    `https://www.amazon.com/s?k={seriesTitle}+Volume+{volumeNumber}&tag=AFFILIATETAG`
    Use a placeholder tag `MYMANGA-20` that can be swapped out. Open in new tab.

- A **stats summary bar** below the list showing:
  - Volumes read (e.g. "Read: 3/17")
  - Online copies owned
  - Physical copies owned

- A **"Request a Title" or "Add a Title"** button accessible from the popup header or nearby,
  for series not yet in the database. This can open a simple form or link to a submission page —
  adapt to whatever pattern the site uses for user-submitted content.

### Series header inside popup
- Show the series cover image (hotlinked from MangaDex CDN — store and display the URL,
  do NOT download or host the image bytes)
- Series title, author, genres

### Data persistence
User volume state (read, online copy, physical copy) should be saved per user per series.
Look at the existing user data / database schema. If using MongoDB, a document like:
`{ userId, mangaId, volumes: { "1": { read, online, physical }, ... } }`
is appropriate. If the project uses a different DB or ORM, adapt accordingly.

---

## Task 2 — API Integration Migration

### Current state
The codebase likely has integrations with Kitsu and/or MangaUpdates. Review what these are
currently used for, then migrate or supplement them using the sources below.

### Finalized API source list

**Primary metadata source — MangaDex API**
- Base URL: `https://api.mangadex.org`
- Use for: series title, alternative titles (multi-language), synopsis, genres/tags,
  cover image URL, volume list, author/artist, publication status, content rating
- No API key required for public queries
- Rate limit: respect headers, add request throttling
- This is the primary seed source. Store results in your own DB — do NOT call MangaDex
  in real-time for every user page load. MangaDex is a data supplier, not a runtime dependency.

**Supplemental metadata — Comick.io**
- Base URL: `https://api.comick.io` (unofficial but widely used)
- Use for: manhwa and manhua coverage gaps, additional genre tagging
- Call when MangaDex data is thin for a given title, especially Korean/Chinese comics

**Cross-reference / ID mapping — anime-offline-database**
- GitHub: `https://github.com/manami-project/anime-offline-database`
- MIT licensed JSON dataset
- Use for: mapping between MangaDex IDs, MAL IDs, AniList IDs, AniDB IDs
- Download and store locally — this is a static dataset updated periodically, not a live API

**Volume/edition data — Google Books API**
- Base URL: `https://www.googleapis.com/books/v1/volumes`
- Free, 1000 req/day on free tier
- Use for: ISBN lookups, publisher info, physical volume metadata
- Run as a background/batch job, not real-time

**Release tracking — MangaUpdates**
- Base URL: `https://api.mangaupdates.com`
- Use for: scanlation release schedules, niche titles not well-covered by MangaDex,
  additional alternative title data
- No explicit bulk collection ban but be conservative with request volume

**Affiliate monetization — Amazon Associates**
- All "Buy" links go through Amazon Associates
- Affiliate tag placeholder: `MYMANGA-20` (to be replaced with real tag)
- Construct links as: `https://www.amazon.com/s?k={title}+Volume+{n}&tag=MYMANGA-20`
- No Amazon API key needed for search links — only needed for product data lookup

### Caching / DB strategy
- Seed series metadata from MangaDex into your own database once
- Serve all title page requests from your own DB, not live API calls
- Run background sync jobs (nightly or weekly) to update volume counts,
  cover image URLs, and release status
- Cover images: store only the CDN URL string, render as `<img src="...">` — never
  download or re-host image files

### "Not in our database" fallback
If a user searches for a title not in the local DB, fall back to a live MangaDex API query
to show results. Give the user an "Add this title" option to import it into the local DB.
This is separate from the user-submitted "Request a Title" flow above.

---

## Task 3 — Things to Check / Add if Missing

Review the codebase and add the following if they are not already implemented:

- **Genre tag display** on series pages and in search/filter — genres sourced from MangaDex tags.
  Note: tags may need cleanup/normalization. Add a TODO comment if a full genre taxonomy
  hasn't been defined yet.

- **Alternative titles** — series should store and display alt names (romaji, native script,
  English variants). MangaDex returns these per-language in the `altTitles` field.

- **Series cover image** — one image per series, hotlinked from MangaDex CDN. No per-volume images.

- **Read/ownership tracking persisted to user account** — the volume state (read, online copy,
  physical copy) must be tied to an authenticated user, not just local storage.

- **Amazon affiliate links on every volume row** — see Task 1.

- **Pagination on volume list** — 10 per page as described in Task 1.

- **"Add a Title" / "Request a Title" flow** — user-facing way to flag a missing series,
  separate from admin data entry.

- **API request throttling / retry logic** — especially for MangaDex (90 req/min limit).
  Add exponential backoff on 429 responses.

---

## What NOT to change
- Do not rename the project or change branding — that decision is deferred
- Do not change the general site routing or page structure unless directly required by the above
- Do not rebuild components that are working — only modify what's needed
- Match the existing code style, naming conventions, and component patterns you find in the repo

---

## Output expectations
For each change, briefly explain what you found in the existing code and what you changed or added.
Flag anything ambiguous (e.g. "I found two different API utility files — I used X, but you may
want to consolidate") rather than silently picking one.
