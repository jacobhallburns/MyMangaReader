import React, { useEffect, useState } from 'react';

// 1. Define the Manga interface
interface Manga {
    kitsuId: string;
    title: string;
    coverImage: string;
    synopsis: string;
}

// 2. Define the Recommendation Data interface
interface RecsData {
    selectedGenre: string;
    availableGenres: string[];
    basedOnTaste: Manga[];
    trending: Manga[]; // Changed from byGenre to match your second state block
}

export default function Recommendations() {
    const [recs, setRecs] = useState<RecsData>({ 
        selectedGenre: '', 
        availableGenres: [], 
        basedOnTaste: [], 
        trending: [] 
    });
    const [loading, setLoading] = useState(true);

    const fetchRecs = async () => {
        setLoading(true);
        try {
            // Relative path is correct for Vercel serverless functions
            const res = await fetch('/api/manga/recommendations');
            if (res.ok) {
                const data = await res.json();
                setRecs(data);
            }
        } catch (err) {
            console.error("Failed to load recommendations", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddFromRec = async (manga: Manga) => {
        try {
            const res = await fetch('/api/manga/collection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kitsuId: manga.kitsuId,
                    title: manga.title,
                    coverImage: manga.coverImage,
                    synopsis: manga.synopsis,
                    status: 'Plan-to-read',
                    rating: null
                })
            });
            return res.ok;
        } catch (err) {
            console.error(err);
            return false;
        }
    };

    useEffect(() => {
        fetchRecs();
    }, []);

    if (loading) return <div className="p-8 text-white">Loading recommendations...</div>;

    return (
        <div className="p-8 text-white">
            <h1 className="text-2xl font-bold mb-4">Recommended for You</h1>
            {/* Your JSX logic for mapping over recs.basedOnTaste and recs.trending goes here */}
        </div>
    );
}