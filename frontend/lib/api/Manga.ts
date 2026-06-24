import mongoose from 'mongoose';

const RawTitlesSchema = new mongoose.Schema(
  {
    primary: {
      type: Map,
      of: String,
      default: {},
    },
    alt: {
      type: [
        {
          lang: { type: String, default: 'other' },
          title: { type: String, required: true },
        },
      ],
      default: [],
    },
  },
  { _id: false }
);

const MangaSchema = new mongoose.Schema(
  {
    kitsuId: { type: String, unique: true, sparse: true }, // primary key for Kitsu-sourced entries
    anilistId: { type: Number, sparse: true }, // legacy — kept for backward compatibility with existing DB records
    mangaDexId: { type: String }, // legacy — kept for backward compatibility with old entries

    title: { type: String, required: true },
    altTitles: { type: [String], default: [] },
    rawTitles: {
      type: RawTitlesSchema,
      default: () => ({
        primary: {},
        alt: [],
      }),
    },
    slug: String,

    synopsis: String,
    posterImage: String,
    coverImage: String,
    author: String,

    chapterCount: Number,
    volumeCount: Number,
    serialization: String,
    mangaType: String,

    status: String,
    genres: { type: [String], default: [] },

    averageRating: { type: Number, default: 0 },
    ratingCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

export default mongoose.models.Manga || mongoose.model('Manga', MangaSchema);