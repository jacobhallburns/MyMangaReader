import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect from '../../../lib/dbConnect';
import TitleRequest from '../../../lib/api/TitleRequest';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { title, notes } = req.body as { title: string; notes?: string };
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });

  await dbConnect();
  await TitleRequest.create({ userId, title: title.trim(), notes: notes?.trim() });

  return res.status(201).json({ ok: true });
}
