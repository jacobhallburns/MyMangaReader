import { useEffect, useMemo, useState } from 'react';
import Link from "next/link";

export default function MangaList() {
    const [manga, setManga] = useState([]);
    const [loading, setLoading] = useState(true);

    // search / filter / sort
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState('Updated'); 

    // modal state
    const [editingManga, setEditingManga] = useState(null);
    const [tempStatus, setTempStatus] = useState('Completed');
    const [tempRating, setTempRating] = useState(null);

    useEffect(() => {
        let cancelled = false;

        const fetchManga = async () => {
            try {
                // Fetching from the new internal API route
                const res = await fetch('/api/manga/collection');

                if (res.status === 503) {
                    if (!cancelled) setTimeout(fetchManga, 300);
                    return;
                }

                const data = await res.json();
                if (!cancelled) setManga(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Fetch failed:", err);
                if (!cancelled) setTimeout(fetchManga, 500);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchManga();
        return () => { cancelled = true; };
    }, []);

    const visibleManga = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        let list = [...manga].filter((m) => {
            const statusOk = statusFilter === 'All' || (m.status || '').toLowerCase() === statusFilter.toLowerCase();
            if (!q) return statusOk;
            const title = (m.title || '').toLowerCase();
            const synopsis = (m.synopsis || '').toLowerCase();
            return statusOk && (title.includes(q) || synopsis.includes(q));
        });

        if (sortBy === 'TitleAZ') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        else if (sortBy === 'TitleZA') list.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        else if (sortBy === 'RatingHigh') list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
        else if (sortBy === 'RatingLow') list.sort((a, b) => (a.rating ?? 999) - (b.rating ?? 999));

        return list;
    }, [manga, searchTerm, statusFilter, sortBy]);

    const handleSave = async () => {
        try {
            // Updated to hit the dynamic [id].js route
            const res = await fetch(`/api/manga/${editingManga._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating: tempRating === 'null' ? null : tempRating,
                    status: tempStatus,
                }),
            });

            if (res.ok) {
                setManga(prev => prev.map(m => m._id === editingManga._id 
                    ? { ...m, status: tempStatus, rating: tempRating === 'null' ? null : tempRating } 
                    : m
                ));
            }
        } catch (err) {
            alert(`Failed to update: ${err.message}`);
        } finally {
            setEditingManga(null);
        }
    };

    const handleDelete = async () => {
        try {
            // Updated to hit the dynamic [id].js route
            const res = await fetch(`/api/manga/${editingManga._id}`, { method: 'DELETE' });
            if (res.ok) {
                setManga(prev => prev.filter(m => m._id !== editingManga._id));
            }
        } catch (err) {
            alert(`Failed to delete: ${err.message}`);
        } finally {
            setEditingManga(null);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <p className="text-white">Loading your collection...</p>
        </div>
    );

    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 2rem', minHeight: '100vh', background: '#f8f8f8' }}>
            <div style={{ maxWidth: '1000px', width: '100%', borderLeft: '2px solid #00cc66', borderRight: '2px solid #00cc66', padding: '0 2rem', minHeight: '100vh' }}>
                <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8f8f8', padding: '1rem 0' }}>
                    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #00cc66', paddingBottom: '1rem' }}>
                        <h1 style={{ margin: 0 }}>My Manga List</h1>
                        <nav style={{ display: 'flex', gap: '3rem' }}>
                            <Link href="/recommendation" style={{ fontWeight: 600, fontSize: '1.2rem' }}>Recommendations</Link>
                            <Link href="/search" style={{ fontWeight: 600, fontSize: '1.2rem' }}>Add Manga</Link>
                        </nav>
                    </header>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search List..." className="search-input" style={{ flex: 1, padding: '0.7rem', borderRadius: '12px', border: '2px solid #00cc66' }} />
                        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '0.7rem', borderRadius: '12px', border: '2px solid #00cc66' }}>
                            <option value="All">All Status</option>
                            <option value="Completed">Completed</option>
                            <option value="Reading">Reading</option>
                            <option value="Plan-to-read">Plan to Read</option>
                        </select>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '0.7rem', borderRadius: '12px', border: '2px solid #00cc66' }}>
                            <option value="Updated">Sort: Default</option>
                            <option value="TitleAZ">Title: A → Z</option>
                            <option value="TitleZA">Title: Z → A</option>
                            <option value="RatingHigh">Rating: High → Low</option>
                            <option value="RatingLow">Rating: Low → High</option>
                        </select>
                    </div>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1.5rem', marginTop: '1rem' }}>
                    {visibleManga.map((entry) => (
                        <li key={entry._id} style={{ background: '#fff', border: '2px solid #00cc66', borderRadius: '16px', padding: '1.5rem' }}>
                            <h2 style={{ color: '#cc0000', margin: '0 0 1rem 0' }}>{entry.title}</h2>
                            <div style={{ display: 'flex', gap: '1.25rem' }}>
                                {entry.coverImage && <img src={entry.coverImage} alt={entry.title} style={{ width: '150px', borderRadius: '12px', border: '2px solid #00cc66' }} />}
                                <div style={{ flex: 1 }}>
                                    <p style={{ color: '#ff6699' }}>{entry.synopsis?.slice(0, 250)}...</p>
                                    <div style={{ display: 'flex', gap: '0.75rem', margin: '1rem 0' }}>
                                        <span style={{ padding: '0.4rem 0.75rem', borderRadius: '999px', border: '2px solid #00cc66', color: '#00aa55' }}>Status: {entry.status}</span>
                                        <span style={{ padding: '0.4rem 0.75rem', borderRadius: '999px', border: '2px solid #00cc66', color: '#00aa55' }}>Rating: {entry.rating ?? 'N/A'} ★</span>
                                    </div>
                                    <button onClick={() => { setEditingManga(entry); setTempStatus(entry.status); setTempRating(entry.rating ?? 'null'); }} style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', background: '#cc0000', color: 'white' }}>Edit</button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>

                {editingManga && (
                    <div onClick={() => setEditingManga(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                        <div onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '760px', background: '#fff', borderRadius: '18px', border: '2px solid #00cc66', padding: '1.5rem' }}>
                            <h2 style={{ color: '#cc0000' }}>Edit {editingManga.title}</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '1rem 0' }}>
                                <select value={tempStatus} onChange={(e) => setTempStatus(e.target.value)} style={{ padding: '0.7rem', borderRadius: '12px', border: '2px solid #00cc66' }}>
                                    <option value="Completed">Completed</option>
                                    <option value="Reading">Reading</option>
                                    <option value="Plan-to-read">Plan to Read</option>
                                </select>
                                <select value={tempRating} onChange={(e) => setTempRating(e.target.value === 'null' ? 'null' : Number(e.target.value))} style={{ padding: '0.7rem', borderRadius: '12px', border: '2px solid #00cc66' }}>
                                    <option value="null">N/A</option>
                                    {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                </select>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button onClick={handleDelete} style={{ background: '#cc0000', color: 'white', padding: '0.7rem 1.5rem', borderRadius: '12px' }}>Delete</button>
                                <button onClick={handleSave} style={{ background: '#00cc66', color: 'white', padding: '0.7rem 1.5rem', borderRadius: '12px' }}>Save</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}