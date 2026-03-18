import { useEffect, useState } from 'react';
import Link from "next/link";

export default function MangaSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [offset, setOffset] = useState(0); // Pagination restored
    const [addedIds, setAddedIds] = useState(new Set());

    useEffect(() => {
        const fetchExisting = async () => {
            const res = await fetch('/api/manga/collection');
            const data = await res.json();
            if (Array.isArray(data)) setAddedIds(new Set(data.map(m => m.kitsuId)));
        };
        fetchExisting();
    }, []);

    const searchKitsu = async (e, isNewSearch = true) => {
        if (e) e.preventDefault();
        setLoading(true);
        const currentOffset = isNewSearch ? 0 : offset;
        try {
            const response = await fetch(`https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(query)}&page[limit]=10&page[offset]=${currentOffset}`);
            const data = await response.json();
            setResults(prev => isNewSearch ? data.data : [...prev, ...data.data]);
            setOffset(currentOffset + 10);
        } finally {
            setLoading(false);
        }
    };

    const addManga = async (manga) => {
    setLoading(true);
    try {
        // 1. Fetch categories from Kitsu to power recommendations later
        const genresRes = await fetch(`https://kitsu.io/api/edge/manga/${manga.id}/categories`);
        const genreData = await genresRes.json();
        const genres = genreData.data.map(g => g.attributes.title);

        const payload = {
            kitsuId: manga.id,
            title: manga.attributes.titles?.en_jp || manga.attributes.slug,
            coverImage: manga.attributes.posterImage?.small || '',
            synopsis: manga.attributes.synopsis || '',
            status: 'Plan-to-read',
            rating: null,
            genres: genres // Important for the "Smart Digging" logic
        };

        // 2. Send to the new Serverless API endpoint
        const res = await fetch('/api/manga/collection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            setAddedIds(prev => new Set(prev).add(manga.id));
        } else {
            const errorData = await res.json();
            alert(`Error: ${errorData.error}`);
        }
    } catch (err) {
        console.error("Add failed:", err);
    } finally {
        setLoading(false);
    }
};

    return (
        <div className="p-8 bg-gray-900 min-h-screen text-white">
            <header className="flex justify-between items-center mb-8 border-b-2 border-green-500 pb-4">
                <h1 className="text-3xl font-bold">Add Manga</h1>
                <Link href="/manga-list" className="text-red-500 font-bold hover:text-green-500">Back to List</Link>
            </header>

            <form onSubmit={(e) => searchKitsu(e, true)} className="flex gap-4 mb-12">
                <input 
                    type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search Kitsu database..."
                    className="flex-grow p-4 rounded-xl bg-gray-800 border-2 border-green-500 outline-none text-pink-400 font-bold"
                />
                <button type="submit" className="bg-red-600 px-8 rounded-xl font-bold hover:bg-green-600 transition-colors">Search</button>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {results.map((m) => (
                    <div key={m.id} className="bg-gray-800 border-2 border-green-500 p-6 rounded-2xl flex gap-4 shadow-lg hover:scale-[1.02] transition-transform">
                        <img src={m.attributes.posterImage?.small} className="w-24 h-36 rounded-lg object-cover border border-green-500" />
                        <div className="flex-1">
                            <h3 className="text-xl font-bold text-red-500 mb-2">{m.attributes.titles?.en_jp || m.attributes.slug}</h3>
                            {addedIds.has(m.id) ? (
                                <span className="text-green-400 font-bold">✓ Already in List</span>
                            ) : (
                                <button onClick={() => addManga(m)} className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-600 transition-colors">
                                    + Add to List
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {results.length > 0 && (
                <button onClick={() => searchKitsu(null, false)} className="w-full mt-12 py-4 border-2 border-dashed border-green-500 rounded-xl font-bold text-green-500 hover:bg-green-500 hover:text-white transition-all">
                    {loading ? "Loading..." : "Load More Manga"}
                </button>
            )}
        </div>
    );
}