import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect from '../../../lib/dbConnect';
import UserProfile, { isValidUsername } from '../../../lib/api/UserProfile';

function cleanUsername(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function cleanText(value: unknown, maxLength: number) {
  return String(value || '').trim().slice(0, maxLength);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await dbConnect();

    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const profile = await UserProfile.findOne({ clerkUserId: userId }).lean();

      return res.status(200).json({
        profile: profile || null,
      });
    }

    if (req.method === 'POST') {
      const username = cleanUsername(req.body.username);
      const displayName = cleanText(req.body.displayName, 40);
      const bio = cleanText(req.body.bio, 160);
      const avatarUrl = cleanText(req.body.avatarUrl, 500);

      if (!isValidUsername(username)) {
        return res.status(400).json({
          error: 'Username must be 3–20 characters and only use letters, numbers, or underscores.',
        });
      }

      const existing = await UserProfile.findOne({
        username,
        clerkUserId: { $ne: userId },
      }).lean();

      if (existing) {
        return res.status(409).json({
          error: 'That username is already taken.',
        });
      }

      const profile = await UserProfile.findOneAndUpdate(
        { clerkUserId: userId },
        {
          $set: {
            username,
            displayName: displayName || username,
            bio,
            avatarUrl,
          },
        },
        { upsert: true, new: true }
      );

      return res.status(200).json({
        profile,
      });
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (err: any) {
    console.error('[UserProfile]', {
      event: 'error',
      message: err.message,
      code: err.code,
    });

    if (err.code === 11000) {
      return res.status(409).json({
        error: 'That username is already taken.',
      });
    }

    return res.status(500).json({
      error: 'Failed to save profile.',
    });
  }
}