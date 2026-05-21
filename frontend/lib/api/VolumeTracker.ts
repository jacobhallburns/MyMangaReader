import mongoose from 'mongoose';

const VolumeTrackerSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  mangaId: { type: mongoose.Schema.Types.ObjectId, ref: 'Manga', required: true },
  // volumes stored as { "1": { read, online, physical }, "2": { ... }, ... }
  volumes: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

VolumeTrackerSchema.index({ userId: 1, mangaId: 1 }, { unique: true });

export default mongoose.models.VolumeTracker || mongoose.model('VolumeTracker', VolumeTrackerSchema);
