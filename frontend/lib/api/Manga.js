import mongoose from 'mongoose';

const MangaSchema = new mongoose.Schema({
    kitsuId: String,
    title: String,
    genres: [String],
    posterImage: String,
    status: {
        type: String,
        enum: ['Reading', 'Completed', 'Plan-to-read'],
        default: 'Completed',
    },
    rating: Number,
    synopsis: String,
    // Store the Clerk User ID as a string
    userId: {
        type: String,
        required: true, 
    },
}, {timestamps: true});

export default mongoose.models.Manga || mongoose.model('Manga', MangaSchema);