import mongoose from 'mongoose';

export const FRIENDSHIP_STATUSES = ['pending', 'accepted', 'declined'] as const;

export function makeFriendKey(userIdA: string, userIdB: string) {
  return [userIdA, userIdB].sort().join(':');
}

const FriendshipSchema = new mongoose.Schema({
  requesterClerkUserId: {
    type: String,
    required: true,
    index: true,
  },

  recipientClerkUserId: {
    type: String,
    required: true,
    index: true,
  },

  friendKey: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  status: {
    type: String,
    enum: FRIENDSHIP_STATUSES,
    default: 'pending',
    index: true,
  },
}, { timestamps: true });

FriendshipSchema.index({ requesterClerkUserId: 1, recipientClerkUserId: 1 });
FriendshipSchema.index({ recipientClerkUserId: 1, status: 1 });
FriendshipSchema.index({ requesterClerkUserId: 1, status: 1 });

export default mongoose.models.Friendship || mongoose.model('Friendship', FriendshipSchema);