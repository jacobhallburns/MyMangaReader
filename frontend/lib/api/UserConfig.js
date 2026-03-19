import mongoose from 'mongoose';

const UserConfigSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    theme: { type: String, enum: ['light', 'dark'], default: 'light' }
});

export default mongoose.models.UserConfig || mongoose.model('UserConfig', UserConfigSchema);