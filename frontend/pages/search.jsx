import { useEffect, useState } from 'react';
import Link from "next/link";

export default function MangaSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [addedIds, setAddedIds] = useState(new Set());

    useEffect(() => {
        const fetchExisting = async () => {
            const res = await fetch('/api/manga/collection');
            const data = await res.json();
            if (Array.isArray(data)) {
                setAddedIds(new Set(data.map(m => m.kitsuId)));
            }
        };
        fetchExisting();
    }, []);

    const searchKitsu = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await fetch(`https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(query)}&page[limit]=10`);
            const data = await response.json();
            setResults(data.data || []);
        } finally {
            setLoading(false);
        }
    };

    const addManga = async (manga, status, rating) => {
        const genresRes = await fetch(`https://kitsu.io/api/edge/manga/${manga.id}/categories`);
        const genreData = await genresRes.json();
        
        const payload = {
            kitsuId: manga.id,
            title: manga.attributes.titles?.en_jp || manga.attributes.slug,
            coverImage: manga.attributes.posterImage?.small || '',
            synopsis: manga.attributes.synopsis || '',
            status,
            rating,
            genres: genreData.data.map(g => g.attributes.title)
        };

        const res = await fetch('/api/manga/collection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) setAddedIds(prev => new Set(prev).add(manga.id));
    };

    return (
        /* ... Keep your existing JSX ... */
    );
}