import type { NextApiRequest, NextApiResponse } from 'next';
import { getAuth } from '@clerk/nextjs/server';
import dbConnect from '../../../lib/dbConnect';
import Friendship from '../../../lib/api/Friendship';
import UserProfile from '../../../lib/api/UserProfile';
import UserManga from '../../../lib/api/UserManga';
import Manga from '../../../lib/api/Manga';

function serializeProfile(profile: any) {
  if (!profile) return null;

  return {
    id: String(profile._id),
    username: profile.username,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
  };
}

function serializeManga(manga: any) {
  if (!manga) return null;

  return {
    id: String(manga._id),
    kitsuId: manga.kitsuId,
    title: manga.title,
    posterImage: manga.posterImage || manga.coverImage || '',
    coverImage: manga.coverImage || manga.posterImage || '',
    genres: manga.genres || [],
  };
}

function normalizeStatus(status: string) {
  return String(status || '').trim().toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
}

function formatStatusAction(status: string) {
  const normalized = normalizeStatus(status);

  const labels: Record<string, string> = {
    reading: 'started reading',
    completed: 'completed',
    on_hold: 'put on hold',
    dropped: 'dropped',
    plan_to_read: 'added to plan-to-read',
    planned: 'added to plan-to-read',
  };

  return labels[normalized] || 'updated';
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await dbConnect();

    // Ensures Mongoose knows the Manga model for populate()
    Manga;

    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method !== 'GET') {
      res.setHeader('Allow', ['GET']);
      return res.status(405).json({ error: `Method ${req.method} not allowed` });
    }

    const friendships: any[] = await Friendship.find({
      status: 'accepted',
      $or: [
        { requesterClerkUserId: userId },
        { recipientClerkUserId: userId },
      ],
    }).lean();

    const friendUserIds = friendships.map((friendship) => {
      return friendship.requesterClerkUserId === userId
        ? friendship.recipientClerkUserId
        : friendship.requesterClerkUserId;
    });

    if (friendUserIds.length === 0) {
      return res.status(200).json({
        friendCount: 0,
        activities: [],
      });
    }

    const [profiles, entries]: any[] = await Promise.all([
      UserProfile.find({
        clerkUserId: { $in: friendUserIds },
      }).lean(),

      UserManga.find({
        userId: { $in: friendUserIds },
      })
        .sort({ updatedAt: -1 })
        .limit(40)
        .populate('mangaId')
        .lean(),
    ]);

    const profileMap = new Map(
      profiles.map((profile: any) => [profile.clerkUserId, profile])
    );

    const activities = entries
      .filter((entry: any) => entry.mangaId)
      .map((entry: any) => {
        const profile = profileMap.get(entry.userId);
        const manga = entry.mangaId;

        return {
          id: String(entry._id),
          friend: serializeProfile(profile),
          manga: serializeManga(manga),
          status: entry.status,
          actionText: formatStatusAction(entry.status),
          progress: entry.progress || 0,
          rating: entry.rating || 0,
          notes: entry.notes || '',
          updatedAt: entry.updatedAt,
        };
      });

    return res.status(200).json({
      friendCount: friendUserIds.length,
      activities,
    });
  } catch (err: any) {
    console.error('[FriendActivity]', {
      event: 'error',
      message: err.message,
      code: err.code,
    });

    return res.status(500).json({
      error: 'Failed to load friend activity.',
    });
  }
}