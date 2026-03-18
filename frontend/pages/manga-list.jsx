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
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', padding: '1rem' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                
                
                <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-color)', paddingBottom: '1rem' }}>
                    

                    {/* FILTERS - Stacks on small screens */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
                        <input 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            placeholder="Search List..." 
                            style={{ background: 'var(--card-bg)', color: 'white' }} 
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ background: 'var(--card-bg)', color: 'white' }}>
                                <option value="All">All Status</option>
                                <option value="Completed">Completed</option>
                                <option value="Reading">Reading</option>
                                <option value="Plan-to-read">Plan to Read</option>
                            </select>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ background: 'var(--card-bg)', color: 'white' }}>
                                <option value="Updated">Default</option>
                                <option value="TitleAZ">A → Z</option>
                                <option value="RatingHigh">★ Top</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* MANGA CARDS */}
                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {visibleManga.map((entry) => (
                        <li key={entry._id} style={{ 
                            background: 'var(--card-bg)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '16px', 
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column', // Stacked by default for mobile
                            gap: '1rem'
                        }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                {entry.coverImage && <img src={entry.coverImage} alt={entry.title} style={{ width: '80px', height: '120px', objectFit: 'cover' }} />}
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ color: 'var(--text-accent)', fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>{entry.title}</h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>{entry.synopsis?.slice(0, 100)}...</p>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)' }}>{entry.status} • {entry.rating ?? 'N/A'} ★</span>
                                <button onClick={() => { setEditingManga(entry); setTempStatus(entry.status); setTempRating(entry.rating ?? 'null'); }} 
                                        style={{ padding: '0.4rem 1rem', fontSize: '0.9rem' }}>Edit</button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}