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
    const [tempStatus, setTempStatus] = useState('plan_to_read');
    const [tempRating, setTempRating] = useState(0);
    const [tempNotes, setTempNotes] = useState('');

    useEffect(() => {
        let cancelled = false;

        const fetchManga = async () => {
            try {
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
            // Updated to check nested mangaId for title/synopsis
            const statusOk = statusFilter === 'All' || (m.status || '').toLowerCase() === statusFilter.toLowerCase();
            if (!q) return statusOk;
            const title = (m.mangaId?.title || m.title || '').toLowerCase();
            const synopsis = (m.mangaId?.synopsis || m.synopsis || '').toLowerCase();
            return statusOk && (title.includes(q) || synopsis.includes(q));
        });

        if (sortBy === 'TitleAZ') list.sort((a, b) => (a.mangaId?.title || '').localeCompare(b.mangaId?.title || ''));
        else if (sortBy === 'TitleZA') list.sort((a, b) => (b.mangaId?.title || '').localeCompare(a.mangaId?.title || ''));
        else if (sortBy === 'RatingHigh') list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
        else if (sortBy === 'RatingLow') list.sort((a, b) => (a.rating ?? 999) - (b.rating ?? 999));

        return list;
    }, [manga, searchTerm, statusFilter, sortBy]);

    const handleSave = async () => {
        try {
            // Updated to hit the dynamic /api/manga/[id] route
            const res = await fetch(`/api/manga/${editingManga._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating: tempRating,
                    status: tempStatus,
                    notes: tempNotes
                }),
            });

            if (res.ok) {
                const updatedData = await res.json();
                setManga(prev => prev.map(m => m._id === editingManga._id 
                    ? { ...m, status: updatedData.status, rating: updatedData.rating, notes: updatedData.notes } 
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
        if (!window.confirm("Are you sure you want to remove this from your list?")) return;
        try {
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
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'white' }}>Loading your collection...</p>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', padding: '1rem' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
                
                <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-color)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
                        <input 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                            placeholder="Search List..." 
                            style={{ padding: '0.7rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'white' }} 
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', background: 'var(--card-bg)', color: 'white' }}>
                                <option value="All">All Status</option>
                                <option value="reading">Reading</option>
                                <option value="completed">Completed</option>
                                <option value="plan_to_read">Plan to Read</option>
                                <option value="on_hold">On Hold</option>
                                <option value="dropped">Dropped</option>
                            </select>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '0.5rem', borderRadius: '8px', background: 'var(--card-bg)', color: 'white' }}>
                                <option value="Updated">Default</option>
                                <option value="TitleAZ">A → Z</option>
                                <option value="RatingHigh">★ Top</option>
                            </select>
                        </div>
                    </div>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {visibleManga.map((entry) => (
                        <li key={entry._id} style={{ 
                            background: 'var(--card-bg)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '16px', 
                            padding: '1rem',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem'
                        }}>
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                {entry.mangaId?.posterImage && (
                                    <img 
                                        src={entry.mangaId?.posterImage || entry.posterImage || entry.coverImage} 
                                        alt={entry.mangaId?.title || entry.title} 
                                        style={{ width: '80px', height: '120px', objectFit: 'cover', borderRadius: '8px' }} 
                                    />
                                )}
                                <div style={{ flex: 1 }}>
                                    <h2 style={{ color: 'var(--text-accent)', fontSize: '1.1rem', margin: '0 0 0.5rem 0' }}>
                                        {entry.mangaId?.title || entry.title}
                                    </h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '0 0 0.5rem 0' }}>
                                        {entry.mangaId?.synopsis?.slice(0, 100) || entry.synopsis?.slice(0, 100)}...
                                    </p>
                                    {entry.notes && (
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontStyle: 'italic', background: 'rgba(255,255,255,0.05)', padding: '0.4rem', borderRadius: '4px' }}>
                                            💬 {entry.notes}
                                        </p>
                                    )}
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>
                                <span style={{ fontSize: '0.8rem', color: 'var(--accent-green)', textTransform: 'capitalize' }}>
                                    {entry.status.replace(/_/g, ' ')} • {entry.rating > 0 ? `${entry.rating} ★` : 'No Rating'}
                                </span>
                                <button onClick={() => { 
                                    setEditingManga(entry); 
                                    setTempStatus(entry.status); 
                                    setTempRating(entry.rating || 0);
                                    setTempNotes(entry.notes || '');
                                }} 
                                style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', borderRadius: '8px', background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', fontWeight: 'bold' }}>
                                    Edit
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>

                {/* MODAL */}
                {editingManga && (
                    <div onClick={() => setEditingManga(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                        <div onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '400px', background: 'var(--card-bg)', borderRadius: '18px', border: '1px solid var(--border-color)', padding: '1.5rem' }}>
                            <h2 style={{ color: 'white', marginTop: 0 }}>Edit Entry</h2>
                            
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ color: 'gray', fontSize: '0.8rem' }}>Status</label>
                                <select value={tempStatus} onChange={(e) => setTempStatus(e.target.value)} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', marginTop: '0.3rem' }}>
                                    <option value="reading">Reading</option>
                                    <option value="completed">Completed</option>
                                    <option value="plan_to_read">Plan to Read</option>
                                    <option value="on_hold">On Hold</option>
                                    <option value="dropped">Dropped</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ color: 'gray', fontSize: '0.8rem' }}>Rating</label>
                                <select value={tempRating} onChange={(e) => setTempRating(Number(e.target.value))} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', marginTop: '0.3rem' }}>
                                    <option value="0">No Rating</option>
                                    {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                </select>
                            </div>

                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', display: 'block', marginBottom: '0.5rem' }}>Notes</label>
                                <textarea 
                                    value={tempNotes} 
                                    onChange={(e) => setTempNotes(e.target.value)} 
                                    style={{ 
                                        width: '100%', 
                                        padding: '0.7rem', 
                                        borderRadius: '10px', 
                                        background: 'var(--bg-color)', 
                                        color: 'white', 
                                        border: '1px solid var(--border-color)',
                                        minHeight: '80px',
                                        boxSizing: 'border-box', // This prevents the box from "pushing out"
                                        fontSize: '0.9rem'
                                    }} 
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button 
                                    onClick={handleSave} 
                                    style={{ flex: 2, padding: '0.8rem', background: '#4CAF50', color: 'white', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                                >
                                    Save Changes
                                </button>
                                <button 
                                    onClick={handleDelete} 
                                    style={{ flex: 1, padding: '0.8rem', background: 'rgba(255,68,68,0.1)', color: '#ff4444', borderRadius: '12px', border: '1px solid #ff4444', cursor: 'pointer' }}
                                >
                                    Delete
                                </button>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}