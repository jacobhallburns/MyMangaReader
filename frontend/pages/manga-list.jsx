import { useEffect, useMemo, useState } from 'react';
import Link from "next/link";

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
            const res = await fetch('/api/manga/collection');
            const data = await res.json();
            if (res.ok) {
                setManga(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Fetch failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchManga();
    }, []);

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

    const handleUpdate = async () => {
        try {
            const res = await fetch(`/api/manga/collection?id=${editingManga._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating: tempRating === 'null' ? null : Number(tempRating),
                    status: tempStatus,
                }),
            });
            if (res.ok) fetchManga();
        } catch (err) {
            alert("Update failed");
        } finally {
            setEditingManga(null);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Remove this manga from your collection?")) return;
        try {
            const res = await fetch(`/api/manga/collection?id=${editingManga._id}`, { method: 'DELETE' });
            if (res.ok) fetchManga();
        } catch (err) {
            alert("Delete failed");
        } finally {
            setEditingManga(null);
        }
    };

    if (loading) return <div className="p-8 text-white">Loading your collection...</div>;

    return (
        <div className="p-8 min-h-screen bg-gray-900 text-white">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold">My Collection</h1>
                <Link href="/search" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded">
                    + Add New Manga
                </Link>
            </div>

            {/* Filters and Search */}
            <div className="flex flex-wrap gap-4 mb-8 bg-gray-800 p-4 rounded-lg">
                <input 
                    type="text" 
                    placeholder="Search collection..." 
                    className="bg-gray-700 p-2 rounded border border-gray-600 flex-grow"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select 
                    value={statusFilter} 
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-gray-700 p-2 rounded border border-gray-600"
                >
                    <option value="All">All Statuses</option>
                    <option value="Reading">Reading</option>
                    <option value="Plan-to-read">Plan to Read</option>
                    <option value="Completed">Completed</option>
                </select>
            </div>

            {/* Manga Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {visibleManga.map((m) => (
                    <div key={m._id} className="bg-gray-800 rounded-lg overflow-hidden border border-gray-700 hover:border-green-500 transition-colors">
                        <img src={m.coverImage} alt={m.title} className="w-full h-64 object-cover" />
                        <div className="p-4">
                            <h3 className="font-bold text-lg truncate">{m.title}</h3>
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-sm bg-gray-700 px-2 py-1 rounded text-green-400">{m.status}</span>
                                <span className="text-yellow-500 font-bold">{m.rating ? `⭐ ${m.rating}` : 'No Rating'}</span>
                            </div>
                            <button 
                                onClick={() => {
                                    setEditingManga(m);
                                    setTempStatus(m.status);
                                    setTempRating(m.rating);
                                }}
                                className="w-full mt-4 bg-gray-700 hover:bg-gray-600 py-2 rounded text-sm"
                            >
                                Edit Entry
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit Modal */}
            {editingManga && (
                <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
                    <div className="bg-gray-800 p-6 rounded-lg max-w-md w-full border border-gray-600">
                        <h2 className="text-xl font-bold mb-4">Edit: {editingManga.title}</h2>
                        
                        <label className="block text-sm mb-1">Status</label>
                        <select 
                            value={tempStatus} 
                            onChange={(e) => setTempStatus(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded mb-4 border border-gray-600"
                        >
                            <option value="Reading">Reading</option>
                            <option value="Plan-to-read">Plan to Read</option>
                            <option value="Completed">Completed</option>
                        </select>

                        <label className="block text-sm mb-1">Rating (1-10)</label>
                        <input 
                            type="number" 
                            min="1" max="10" 
                            value={tempRating || ''} 
                            onChange={(e) => setTempRating(e.target.value)}
                            className="w-full bg-gray-700 p-2 rounded mb-6 border border-gray-600"
                        />

                        <div className="flex gap-2">
                            <button onClick={handleUpdate} className="flex-grow bg-green-600 py-2 rounded">Save Changes</button>
                            <button onClick={handleDelete} className="px-4 bg-red-600 py-2 rounded">Delete</button>
                            <button onClick={() => setEditingManga(null)} className="px-4 bg-gray-600 py-2 rounded">Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}