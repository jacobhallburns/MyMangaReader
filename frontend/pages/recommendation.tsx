import React, { useEffect, useState } from 'react';
import Link from "next/link";

// ... Keep your interfaces ...

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
            // Relative path for serverless environment
            const res = await fetch('/api/manga/recommendations');
            const data = await res.json();
            if (res.ok) setRecs(data);
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

    return (
        /* ... Keep your existing JSX ... */
    );
}