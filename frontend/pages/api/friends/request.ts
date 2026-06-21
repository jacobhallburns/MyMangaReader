import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect from '../../../lib/dbConnect';
import UserProfile from '../../../lib/api/UserProfile';
import Friendship, { makeFriendKey } from '../../../lib/api/Friendship';

function cleanUsername(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await dbConnect();

    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', ['POST']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    const username = cleanUsername(req.body.username);

    if (!username) {
      return res.status(400).json({ error: 'Username is required.' });
    }

    const requesterProfile: any = await UserProfile.findOne({
      clerkUserId: userId,
    }).lean();

    if (!requesterProfile) {
      return res.status(400).json({
        error: 'Create your public profile before adding friends.',
      });
    }

    const recipientProfile: any = await UserProfile.findOne({
      username,
    }).lean();

    if (!recipientProfile) {
      return res.status(404).json({
        error: 'No user found with that username.',
      });
    }

    if (recipientProfile.clerkUserId === userId) {
      return res.status(400).json({
        error: 'You cannot add yourself as a friend.',
      });
    }

    const friendKey = makeFriendKey(userId, recipientProfile.clerkUserId);

    const existing: any = await Friendship.findOne({ friendKey });

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(409).json({
          error: 'You are already friends with this user.',
        });
      }

      if (existing.status === 'pending') {
        if (existing.requesterClerkUserId === userId) {
          return res.status(409).json({
            error: 'Friend request already sent.',
          });
        }

        return res.status(409).json({
          error: 'This user already sent you a friend request. Accept it from your requests.',
        });
      }

      existing.requesterClerkUserId = userId;
      existing.recipientClerkUserId = recipientProfile.clerkUserId;
      existing.status = 'pending';
      await existing.save();

      return res.status(200).json({
        message: 'Friend request sent.',
      });
    }

    const friendship = await Friendship.create({
      requesterClerkUserId: userId,
      recipientClerkUserId: recipientProfile.clerkUserId,
      friendKey,
      status: 'pending',
    });

    return res.status(201).json({
      message: 'Friend request sent.',
    });
  } catch (err: any) {
    console.error('[FriendRequest]', {
      event: 'error',
      message: err.message,
      code: err.code,
    });

    if (err.code === 11000) {
      return res.status(409).json({
        error: 'A friendship or request already exists with this user.',
      });
    }

    return res.status(500).json({
      error: 'Failed to send friend request.',
    });
  }
}