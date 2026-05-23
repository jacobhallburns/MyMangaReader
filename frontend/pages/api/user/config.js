import dbConnect from '../../../lib/dbConnect';
import UserConfig from '../../../lib/api/UserConfig';
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(req, res) {
    try {
        await dbConnect();
        const { userId } = getAuth(req);
        
        if (!userId) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (req.method === 'GET') {
            const config = await UserConfig.findOne({ userId });
            return res.status(200).json(config || { theme: 'light', titleLanguage: 'en' });
        }

        if (req.method === 'POST') {
            const { theme, titleLanguage } = req.body;
            const update = {};

            if (theme !== undefined) {
                if (!['light', 'dark'].includes(theme)) {
                    return res.status(400).json({ error: "Invalid theme" });
                }
                update.theme = theme;
            }

            if (titleLanguage !== undefined) {
                const VALID_LANGS = ['en', 'ja-ro', 'ja', 'ko', 'zh'];
                if (!VALID_LANGS.includes(titleLanguage)) {
                    return res.status(400).json({ error: "Invalid titleLanguage" });
                }
                update.titleLanguage = titleLanguage;
            }

            if (Object.keys(update).length === 0) {
                return res.status(400).json({ error: "No valid fields to update" });
            }

            const config = await UserConfig.findOneAndUpdate(
                { userId },
                { $set: update },
                { upsert: true, new: true }
            );
            return res.status(200).json(config);
        }

        return res.status(405).json({ error: "Method not allowed" });
    } catch (error) {
        console.error("Theme API Error:", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}