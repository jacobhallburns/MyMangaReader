// DEPRECATED:
// This route used to be for chapter data from older sources.
// The current Kitsu setup uses volumeCount/chapterCount from Kitsu instead.
// Use pages/api/manga/volumes/[kitsuId].ts for the volume tracker.

import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  return res.status(410).json({
    error: 'Chapter data is no longer supported from this route. Use the Kitsu-backed volume endpoint instead.',
  });
}