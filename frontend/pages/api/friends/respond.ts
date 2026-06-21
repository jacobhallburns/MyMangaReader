import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect from '../../../lib/dbConnect';
import Friendship from '../../../lib/api/Friendship';

function cleanAction(value: unknown) {
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

    const friendshipId = String(req.body.friendshipId || '').trim();
    const action = cleanAction(req.body.action);

    if (!friendshipId) {
      return res.status(400).json({ error: 'Friendship ID is required.' });
    }

    if (!['accept', 'decline', 'remove'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action.' });
    }

    const friendship: any = await Friendship.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found.' });
    }

    const isRequester = friendship.requesterClerkUserId === userId;
    const isRecipient = friendship.recipientClerkUserId === userId;

    if (!isRequester && !isRecipient) {
      return res.status(403).json({ error: 'You do not have access to this friendship.' });
    }

    if (action === 'accept') {
      if (!isRecipient) {
        return res.status(403).json({ error: 'Only the recipient can accept this request.' });
      }

      if (friendship.status !== 'pending') {
        return res.status(400).json({ error: 'This request is no longer pending.' });
      }

      friendship.status = 'accepted';
      await friendship.save();

      return res.status(200).json({
        message: 'Friend request accepted.',
      });
    }

    if (action === 'decline') {
      if (!isRecipient) {
        return res.status(403).json({ error: 'Only the recipient can decline this request.' });
      }

      if (friendship.status !== 'pending') {
        return res.status(400).json({ error: 'This request is no longer pending.' });
      }

      friendship.status = 'declined';
      await friendship.save();

      return res.status(200).json({
        message: 'Friend request declined.',
      });
    }

    if (action === 'remove') {
      await Friendship.findByIdAndDelete(friendshipId);

      return res.status(200).json({
        message: 'Friendship removed.',
      });
    }

    return res.status(400).json({ error: 'Invalid action.' });
  } catch (err: any) {
    console.error('[FriendRespond]', {
      event: 'error',
      message: err.message,
      code: err.code,
    });

    return res.status(500).json({
      error: 'Failed to update friend request.',
    });
  }
}