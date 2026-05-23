import mongoose from 'mongoose';

const MangaSchema = new mongoose.Schema({
  anilistId: { type: Number, unique: true, sparse: true }, // primary key for AniList-sourced entries
  kitsuId: { type: String }, // deprecated — kept for backward compat with old entries
  mangaDexId: { type: String }, // deprecated — kept for backward compat with old entries
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
  averageRating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.models.Manga || mongoose.model('Manga', MangaSchema);