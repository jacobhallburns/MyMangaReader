import mongoose from 'mongoose';

const MangaSchema = new mongoose.Schema({
  kitsuId: { type: String, required: true, unique: true }, // The link to Kitsu
  title: { type: String, required: true },
  slug: String,
  synopsis: String,
  posterImage: String,
  coverImage: String,
  chapterCount: Number,
  mangaType: String, // e.g., "manga", "manhwa"
  status: String,    // e.g., "finished", "current"
}, { timestamps: true });

export default mongoose.models.Manga || mongoose.model('Manga', MangaSchema);