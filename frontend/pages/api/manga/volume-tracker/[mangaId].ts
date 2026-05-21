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
  await dbConnect();

  if (req.method === 'GET') {
    const tracker = await VolumeTracker.findOne({ userId, mangaId }).lean();
    return res.status(200).json({ volumes: (tracker as any)?.volumes ?? {} });
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

    await VolumeTracker.findOneAndUpdate(
      { userId, mangaId },
      { $set: { [`volumes.${volumeNumber}.${field}`]: value } },
      { upsert: true }
    );
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
