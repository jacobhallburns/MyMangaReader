import dbConnect from '../../../lib/dbConnect';
import UserConfig from '../../../lib/api/UserConfig';
import { getAuth } from '@clerk/nextjs/server';

export default async function handler(req, res) {
    await dbConnect();
    const { userId } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (req.method === 'GET') {
        const config = await UserConfig.findOne({ userId });
        return res.status(200).json(config || { theme: 'light' });
    }

    if (req.method === 'POST') {
        const { theme } = req.body;
        const config = await UserConfig.findOneAndUpdate(
            { userId },
            { theme },
            { upsert: true, new: true }
        );
        return res.status(200).json(config);
    }
}