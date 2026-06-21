import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect from '../../../lib/dbConnect';
import UserProfile from '../../../lib/api/UserProfile';
import Friendship from '../../../lib/api/Friendship';

function serializeProfile(profile: any) {
  if (!profile) return null;

  return {
    id: String(profile._id),
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    bio: profile.bio,
  };
}

function serializeFriendship(friendship: any, profileMap: Map<string, any>, currentUserId: string) {
  const isRequester = friendship.requesterClerkUserId === currentUserId;
  const otherUserId = isRequester
    ? friendship.recipientClerkUserId
    : friendship.requesterClerkUserId;

  return {
    id: String(friendship._id),
    status: friendship.status,
    isRequester,
    otherUser: serializeProfile(profileMap.get(otherUserId)),
    createdAt: friendship.createdAt,
    updatedAt: friendship.updatedAt,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await dbConnect();

    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    const friendships: any[] = await Friendship.find({
      $or: [
        { requesterClerkUserId: userId },
        { recipientClerkUserId: userId },
      ],
    })
      .sort({ updatedAt: -1 })
      .lean();

    const otherUserIds = Array.from(new Set(
      friendships.map((friendship) => {
        return friendship.requesterClerkUserId === userId
          ? friendship.recipientClerkUserId
          : friendship.requesterClerkUserId;
      })
    ));

    const profiles: any[] = await UserProfile.find({
      clerkUserId: { $in: otherUserIds },
    }).lean();

    const profileMap = new Map(
      profiles.map((profile) => [profile.clerkUserId, profile])
    );

    const acceptedFriendships = friendships.filter((friendship) =>
      friendship.status === 'accepted'
    );

    const incomingFriendships = friendships.filter((friendship) =>
      friendship.status === 'pending' &&
      friendship.recipientClerkUserId === userId
    );

    const outgoingFriendships = friendships.filter((friendship) =>
      friendship.status === 'pending' &&
      friendship.requesterClerkUserId === userId
    );

    return res.status(200).json({
      friends: acceptedFriendships.map((friendship) =>
        serializeFriendship(friendship, profileMap, userId)
      ),
      incomingRequests: incomingFriendships.map((friendship) =>
        serializeFriendship(friendship, profileMap, userId)
      ),
      outgoingRequests: outgoingFriendships.map((friendship) =>
        serializeFriendship(friendship, profileMap, userId)
      ),
    });
  } catch (err: any) {
    console.error('[FriendsList]', {
      event: 'error',
      message: err.message,
      code: err.code,
    });

    return res.status(500).json({
      error: 'Failed to load friends.',
    });
  }
}