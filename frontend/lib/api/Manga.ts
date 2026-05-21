import mongoose from 'mongoose';

const MangaSchema = new mongoose.Schema({
  kitsuId: { type: String, required: true, unique: true },
  mangaDexId: { type: String, sparse: true }, // populated when series is synced from MangaDex
  title: { type: String, required: true },
  altTitles: { type: [String], default: [] }, // romaji, native, English variants from MangaDex altTitles
  slug: String,
  synopsis: String,
  posterImage: String,
  coverImage: String,
  author: String,
  chapterCount: Number,
  volumeCount: Number, // total volumes; prefer this over live Kitsu lookup once populated
  mangaType: String,
  status: String,
  genres: { type: [String], default: [] },
  // TODO: define a full genre taxonomy once MangaDex tags are normalized
}, { timestamps: true });

export default mongoose.models.Manga || mongoose.model('Manga', MangaSchema);