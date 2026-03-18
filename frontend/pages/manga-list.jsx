import { useEffect, useMemo, useState } from 'react';
import Link from "next/link";
import { useAuth } from '@clerk/nextjs'; // Added for Clerk support

export default function MangaList() {
    const [manga, setManga] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState('Updated');

    const [editingManga, setEditingManga] = useState(null);
    const [tempStatus, setTempStatus] = useState('Completed');
    const [tempRating, setTempRating] = useState(null);

    const fetchManga = async () => {
        try {
            // Points to your new serverless collection endpoint
            const res = await fetch('/api/manga/collection');
            const data = await res.json();
            if (res.ok) setManga(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Fetch failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchManga(); }, []);

    // Restored the robust useMemo filtering/sorting from your old UI
    const visibleManga = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        let list = manga.filter((m) => {
            const statusOk = statusFilter === 'All' || (m.status || '').toLowerCase() === statusFilter.toLowerCase();
            if (!q) return statusOk;
            return (m.title || '').toLowerCase().includes(q) || (m.synopsis || '').toLowerCase().includes(q);
        });

        if (sortBy === 'TitleAZ') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        else if (sortBy === 'TitleZA') list.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        else if (sortBy === 'RatingHigh') list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
        else if (sortBy === 'RatingLow') list.sort((a, b) => (a.rating ?? 999) - (b.rating ?? 999));

        return list;
    }, [manga, searchTerm, statusFilter, sortBy]);

    if (loading) return <div className="p-8 text-white">Loading your collection...</div>;

    return (
        <div className="p-8 min-h-screen bg-gray-900 text-white">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">My Collection</h1>
                <div className="flex gap-4">
                    <Link href="/recommendation" className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">Recommendations</Link>
                    <Link href="/search" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded">+ Add New</Link>
                </div>
            </div>

            {/* Restored Filter Bar */}
            <div className="flex flex-wrap gap-4 mb-8 bg-gray-800 p-4 rounded-lg border border-green-500/30">
                <input 
                    type="text" placeholder="Search collection..." 
                    className="bg-gray-700 p-2 rounded border border-gray-600 flex-grow"
                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-gray-700 p-2 rounded border border-gray-600">
                    <option value="All">All Statuses</option>
                    <option value="Reading">Reading</option>
                    <option value="Plan-to-read">Plan to Read</option>
                    <option value="Completed">Completed</option>
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-gray-700 p-2 rounded border border-gray-600">
                    <option value="Updated">Sort: Default</option>
                    <option value="TitleAZ">Title: A-Z</option>
                    <option value="RatingHigh">Rating: High-Low</option>
                </select>
            </div>

            {/* Restored the high-quality Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {visibleManga.map((m) => (
                    <div key={m._id} className="bg-gray-800 rounded-xl overflow-hidden border-2 border-green-500/20 hover:border-green-500 transition-all shadow-xl">
                        <div className="flex p-4 gap-4">
                            <img src={m.coverImage} alt={m.title} className="w-32 h-48 object-cover rounded-lg border-2 border-green-500" />
                            <div className="flex-1">
                                <h3 className="font-bold text-xl text-red-500 line-clamp-2">{m.title}</h3>
                                <p className="text-pink-400 text-sm mt-2 line-clamp-3">{m.synopsis}</p>
                                <div className="mt-4 flex flex-wrap gap-2">
                                    <span className="text-xs font-bold px-2 py-1 rounded-full border border-green-500 text-green-400">{m.status}</span>
                                    <span className="text-xs font-bold px-2 py-1 rounded-full border border-yellow-500 text-yellow-500">
                                        {m.rating ? `⭐ ${m.rating}/10` : 'No Rating'}
                                    </span>
                                </div>
                                <button 
                                    onClick={() => { setEditingManga(m); setTempStatus(m.status); setTempRating(m.rating); }}
                                    className="w-full mt-4 bg-red-600 hover:bg-green-600 py-2 rounded-lg text-sm font-bold transition-colors"
                                > Edit Entry </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Restored Detailed Edit Modal */}
            {editingManga && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-gray-800 p-8 rounded-2xl max-w-2xl w-full border-2 border-green-500 shadow-2xl">
                        <div className="flex gap-6">
                            <img src={editingManga.coverImage} className="w-48 h-72 rounded-lg border-2 border-green-500" />
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-red-500 mb-4">{editingManga.title}</h2>
                                <label className="block text-sm font-bold mb-2 text-green-400">Status</label>
                                <select value={tempStatus} onChange={(e) => setTempStatus(e.target.value)} className="w-full bg-gray-700 p-3 rounded-lg mb-4 border border-gray-600">
                                    <option value="Reading">Reading</option>
                                    <option value="Plan-to-read">Plan to Read</option>
                                    <option value="Completed">Completed</option>
                                </select>
                                <label className="block text-sm font-bold mb-2 text-green-400">Rating (1-10)</label>
                                <input type="number" min="1" max="10" value={tempRating || ''} onChange={(e) => setTempRating(e.target.value)} className="w-full bg-gray-700 p-3 rounded-lg mb-6 border border-gray-600"/>
                                <div className="flex gap-4">
                                    <button onClick={async () => {
                                        const res = await fetch(`/api/manga/collection?id=${editingManga._id}`, {
                                            method: 'PATCH',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ rating: Number(tempRating), status: tempStatus }),
                                        });
                                        if (res.ok) fetchManga();
                                        setEditingManga(null);
                                    }} className="flex-grow bg-green-600 py-3 rounded-lg font-bold">Save</button>
                                    <button onClick={() => setEditingManga(null)} className="px-6 bg-gray-600 py-3 rounded-lg font-bold">Cancel</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}