# MyMangaReader

A manga tracking and discovery website for saving manga, rating entries, tracking owned/read volumes, and finding recommendations.

## Current Stack

* **Frontend / Backend**: Next.js
* **Auth**: Clerk
* **Database**: MongoDB with Mongoose
* **Manga API**: Kitsu API
* **Deployment**: Vercel
* **Affiliate links**: Amazon Associate tag

## Main Features

* Search manga using Kitsu
* Add manga to a personal list
* Edit reading status, rating, and notes
* View global average ratings
* Get recommendation and trending manga
* Random "Fortune's Pick" recommendation
* Track manga volumes as:

  * Read / unread
  * Online copy owned
  * Physical copy owned
* Amazon affiliate links for volume searches
* User theme and title language settings

## Local Setup

From the project root, go into the frontend folder:

```bash
cd frontend
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

On Windows PowerShell, you can use:

```powershell
Copy-Item .env.example .env.local
```

Then add the real local development values to:

```text
frontend/.env.local
```

Required environment variables:

```env
MONGODB_URI=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG=
KITSU_BASE_URL=https://kitsu.io/api/edge
```

Do not commit `.env.local`.

## Run Locally

From the `frontend` folder:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

## Build Check

Before pushing changes, run:

```bash
npm run build
```

If the build passes, check changed files:

```bash
git status
```

Make sure no environment files are being committed.

## Important Notes

The app currently uses Kitsu as the active manga source.

Old AniList and MangaDex-related fields may still exist in the database models for backward compatibility with older saved manga entries, but new manga data should use `kitsuId`.

Kitsu provides fields such as `volumeCount` and `chapterCount`. The volume tracker generates volume rows from `volumeCount`.

If local development uses the production MongoDB URI, local edits may affect live data.
