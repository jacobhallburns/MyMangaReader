import mongoose from 'mongoose';

const UserMangaSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true }, // Clerk User ID
  mangaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Manga', required: true }, // Link to our Encyclopedia
  status: { 
    type: String, 
    enum: ['reading', 'completed', 'on_hold', 'dropped', 'plan_to_read'],
    default: 'plan_to_read' 
  },
  progress: { type: Number, default: 0 }, // Chapters read
  rating: { type: Number, min: 0, max: 10, default: 0 },
  notes: String,
}, { timestamps: true });

// Ensure a user can't add the same manga to their list twice
UserMangaSchema.index({ userId: 1, mangaId: 1 }, { unique: true });

export default mongoose.models.UserManga || mongoose.model('UserManga', UserMangaSchema);