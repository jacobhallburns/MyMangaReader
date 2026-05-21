import UserManga from './api/UserManga';
import Manga from './api/Manga';
import type { Types } from 'mongoose';

export async function updateMangaRating(mangaObjectId: Types.ObjectId | string) {
  const [result] = await UserManga.aggregate([
    { $match: { mangaId: mangaObjectId, rating: { $gt: 0 } } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Manga.findByIdAndUpdate(mangaObjectId, {
    $set: {
      averageRating: result?.avg ?? 0,
      ratingCount: result?.count ?? 0,
    },
  });
}
