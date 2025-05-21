import mongoose from 'mongoose';

// Defines schema for manga entries
const MangaSchema = new mongoose.Schema({
    kitsuId: String,      // ID from Kitsu
    title: String,        // Title of manga
    coverImage: String,   // URL to cover image of manga
    // Saves user reading status for each manga
    status: {
        type: String,
        enum: ['reading', 'completed', 'plan-to-read'],
        default: 'completed',
    },
    rating: Number,     // User rating
    // Potentially for multi user support
    userId: {
        type: mongoose.Schema.Types.ObjectId,
    },
}, {timestamps: true});     // Adds createdAt and updatedAt

export default mongoose.model('Manga', MangaSchema);