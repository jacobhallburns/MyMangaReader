import mongoose from 'mongoose';

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

const UserProfileSchema = new mongoose.Schema({
  clerkUserId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: USERNAME_REGEX,
  },

  displayName: {
    type: String,
    trim: true,
    maxlength: 40,
  },

  avatarUrl: {
    type: String,
    default: '',
  },

  bio: {
    type: String,
    trim: true,
    maxlength: 160,
    default: '',
  },
}, { timestamps: true });

export const isValidUsername = (username: string) => {
  return USERNAME_REGEX.test(username);
};

export default mongoose.models.UserProfile || mongoose.model('UserProfile', UserProfileSchema);