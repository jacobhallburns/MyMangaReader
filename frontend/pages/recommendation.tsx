import React, { useEffect, useState } from 'react';
import Link from "next/link";

interface Manga {
    kitsuId: string;
    title: string;
    coverImage: string;
    synopsis: string;
    rating?: number;
}

interface RecsData {
    selectedGenre: string;
    availableGenres: string[];
    basedOnTaste: Manga[];
    trending: Manga[];
}

// Restored the detailed RecCard from your Docker-era UI
const RecCard = ({ manga }: { manga: Manga }) => {
    const [isAdded, setIsAdded] = useState(false);

    const handleAdd = async () => {
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
            if (res.ok) setIsAdded(true);
        } catch (err) {
            console.error("Failed to add manga:", err);
        }
    };

    return (
        <div className="bg-gray-800 border-2 border-green-500 rounded-2xl p-4 flex flex-col h-full shadow-lg hover:shadow-green-500/20 transition-all">
            <h3 className="text-red-500 font-bold text-lg mb-3 truncate">{manga.title}</h3>
            <div className="flex gap-4 mb-4 flex-grow">
                <img 
                    src={manga.coverImage} 
                    className="w-24 h-36 object-cover rounded-lg border-2 border-green-500 shrink-0" 
                />
                <p className="text-pink-400 text-sm line-clamp-6 leading-relaxed">
                    {manga.synopsis || "No synopsis available."}
                </p>
            </div>
            <div className="flex justify-between items-center mt-auto pt-4 border-t border-gray-700">
                <span className="text-green-400 font-bold text-sm">
                    {manga.rating ? `⭐ ${manga.rating}/10` : 'Trending'}
                </span>
                <button 
                    onClick={handleAdd}
                    disabled={isAdded}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${
                        isAdded ? 'bg-gray-600 text-gray-400' : 'bg-green-600 hover:bg-red-600 text-white'
                    }`}
                >
                    {isAdded ? '✔ Added' : '+ Add'}
                </button>
            </div>
        </div>
    );
};

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

    useEffect(() => { fetchRecs(); }, []);

    if (loading) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="text-green-500 font-bold text-xl animate-pulse text-center">
                Calculating your taste...<br/>
                <span className="text-sm text-gray-500">(Searching Kitsu API)</span>
            </div>
        </div>
    );

    return (
        <div className="p-8 bg-gray-900 min-h-screen text-white">
            <header className="max-w-6xl mx-auto flex justify-between items-center mb-12 border-b-2 border-green-500 pb-6">
                <div>
                    <h1 className="text-4xl font-bold italic tracking-tighter">RECOMMENDATIONS</h1>
                    <p className="text-green-400 mt-2 font-mono">Targeting: {recs.selectedGenre || "General"}</p>
                </div>
                <nav className="flex gap-6 font-bold">
                    <Link href="/manga-list" className="hover:text-red-500 transition-colors">MY COLLECTION</Link>
                    <Link href="/search" className="hover:text-red-500 transition-colors">SEARCH</Link>
                </nav>
            </header>

            <main className="max-w-6xl mx-auto space-y-16">
                <section>
                    <h2 className="text-2xl font-bold mb-8 flex items-center gap-4">
                        <span className="bg-red-600 w-2 h-8"></span> BASED ON YOUR TASTE
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {recs.basedOnTaste.map(m => <RecCard key={m.kitsuId} manga={m} />)}
                    </div>
                </section>

                <section>
                    <h2 className="text-2xl font-bold mb-8 flex items-center gap-4">
                        <span className="bg-green-600 w-2 h-8"></span> GLOBAL TRENDING
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {recs.trending.map(m => <RecCard key={m.kitsuId} manga={m} />)}
                    </div>
                </section>
            </main>
        </div>
    );
}