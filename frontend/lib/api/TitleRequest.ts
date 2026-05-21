import mongoose from 'mongoose';

const TitleRequestSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  title: { type: String, required: true },
  notes: String,
}, { timestamps: true });

export default mongoose.models.TitleRequest || mongoose.model('TitleRequest', TitleRequestSchema);
