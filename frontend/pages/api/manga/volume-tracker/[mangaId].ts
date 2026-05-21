import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect from '../../../../lib/dbConnect';
import VolumeTracker from '../../../../lib/api/VolumeTracker';

const ALLOWED_FIELDS = ['read', 'online', 'physical'] as const;
type VolumeField = typeof ALLOWED_FIELDS[number];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userId } = getAuth(req);
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { mangaId } = req.query as { mangaId: string };
  console.log('[VolumeTracker]', { event: 'request', method: req.method, mangaId, userId });

  await dbConnect();

  if (req.method === 'GET') {
    try {
      const tracker = await VolumeTracker.findOne({ userId, mangaId }).lean();
      const found = !!tracker;
      const volumes = (tracker as any)?.volumes ?? {};
      const volumeKeyCount = Object.keys(volumes).length;
      console.log('[VolumeTracker]', { event: 'fetch', mangaId, userId, found, volumeKeyCount });
      return res.status(200).json({ volumes });
    } catch (err: any) {
      console.error('[VolumeTracker]', { event: 'error', mangaId, userId, error: err.message, stack: err.stack });
      return res.status(500).json({ error: 'Failed to fetch volume state' });
    }
  }

  if (req.method === 'PATCH') {
    const { volumeNumber, field, value } = req.body as {
      volumeNumber: string;
      field: VolumeField;
      value: boolean;
    };

    if (!ALLOWED_FIELDS.includes(field)) {
      return res.status(400).json({ error: 'Invalid field' });
    }

    try {
      await VolumeTracker.findOneAndUpdate(
        { userId, mangaId },
        { $set: { [`volumes.${volumeNumber}.${field}`]: value } },
        { upsert: true }
      );
      console.log('[VolumeTracker]', { event: 'patch', mangaId, userId, volumeNumber, field, value });
      return res.status(200).json({ ok: true });
    } catch (err: any) {
      console.error('[VolumeTracker]', { event: 'patch_error', mangaId, userId, error: err.message, stack: err.stack });
      return res.status(500).json({ error: 'Failed to update volume state' });
    }
  }

  return res.status(405).end();
}
