import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useClerk } from '@clerk/nextjs';

export default function MangaSearch() {
    const { isSignedIn, isLoaded } = useAuth();
    const { redirectToSignIn } = useClerk();

    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Keyed by mangaDexId for MangaDex results
    const [addedIds, setAddedIds] = useState(new Set());
    const [addedMangaMap, setAddedMangaMap] = useState(new Map());

    const [editingManga, setEditingManga] = useState(null);
    const [tempRating, setTempRating] = useState(0);
    const [tempStatus, setTempStatus] = useState('plan_to_read');
    const [tempNotes, setTempNotes] = useState('');

    // true when editingManga is a raw MangaDex result (not yet added)
    const isNew = !!editingManga?._raw;

    useEffect(() => {
        const fetchAddedManga = async () => {
            if (!isSignedIn) return;
            try {
                const res = await fetch('/api/manga/collection');
                const dataList = await res.json();
                if (Array.isArray(dataList)) {
                    const ids = new Set();
                    const map = new Map();
                    dataList.forEach((entry) => {
                        const mdId = entry.mangaId?.mangaDexId;
                        const kId = entry.mangaId?.kitsuId; // legacy fallback
                        if (mdId) { ids.add(mdId); map.set(mdId, entry); }
                        if (kId) { ids.add(kId); map.set(kId, entry); }
                    });
                    setAddedIds(ids);
                    setAddedMangaMap(map);
                }
            } catch (err) {
                console.error('[Search] Failed to load existing manga:', err);
            }
        };
        if (isLoaded) fetchAddedManga();
    }, [isSignedIn, isLoaded]);

    const searchManga = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;
        setLoading(true);
        setError(null);
        console.log('[Search] searching for:', query);
        try {
            const res = await fetch(`/api/manga/search?q=${encodeURIComponent(query)}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || `Search failed (${res.status})`);
            setResults(data.results || []);
            console.log('[Search] results:', data.results?.length ?? 0);
        } catch (err) {
            console.error('[Search] error:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const addOrUpdateManga = async () => {
        try {
            if (isNew) {
                const res = await fetch('/api/manga/add', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        mangaDexData: editingManga._raw,
                        status: tempStatus,
                        rating: tempRating,
                        notes: tempNotes,
                    }),
                });
                if (res.ok) {
                    const result = await res.json();
                    const mdId = editingManga.id;
                    setAddedIds((prev) => new Set(prev).add(mdId));
                    setAddedMangaMap((prev) => new Map(prev).set(mdId, result.userEntry));
                }
            } else {
                const res = await fetch(`/api/manga/${editingManga._id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: tempStatus, rating: tempRating, notes: tempNotes }),
                });
                if (res.ok) {
                    const updatedEntry = await res.json();
                    const mdId = editingManga.mangaId?.mangaDexId || editingManga.mangaId?.kitsuId;
                    if (mdId) setAddedMangaMap((prev) => new Map(prev).set(mdId, updatedEntry));
                }
            }
        } catch (err) {
            console.error('[Search] addOrUpdate error:', err);
            alert(`Error: ${err.message}`);
        }
        setEditingManga(null);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 1rem', minHeight: '100vh', background: 'var(--bg-color)' }}>
            <div style={{ maxWidth: '1000px', width: '100%', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', padding: '0 1rem' }}>
                <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-color)', padding: '1rem 0' }}>
                    <form onSubmit={searchManga}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Search MangaDex..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                style={{ flex: 1, padding: '0.7rem', borderRadius: '12px', border: '2px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)' }}
                            />
                            <button type="submit" disabled={loading} style={{ padding: '0.7rem 1.1rem', borderRadius: '12px', background: 'var(--text-main)', color: 'var(--bg-color)', fontWeight: 700, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                                {loading ? '...' : 'Search'}
                            </button>
                        </div>
                    </form>
                    {error && <p style={{ color: '#ff6b6b', fontSize: '0.85rem', margin: '0.5rem 0 0 0' }}>{error}</p>}
                </div>

                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1.5rem' }}>
                    {results.map((m) => {
                        const isAdded = addedIds.has(m.id);
                        const entry = addedMangaMap.get(m.id);

                        return (
                            <li key={m.id} style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '1.5rem', display: 'flex', gap: '1.5rem' }}>
                                <div style={{ width: '140px', height: '210px', backgroundColor: '#1a1a1a', borderRadius: '16px', flexShrink: 0, overflow: 'hidden', border: '1px solid var(--border-color)', boxShadow: '0 8px 16px rgba(0,0,0,0.4)' }}>
                                    <img
                                        src={m.posterImage || '/placeholder.png'}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        alt={m.title || 'manga cover'}
                                    />
                                </div>

                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                                    <div>
                                        <h2 style={{ color: 'var(--text-main)', fontSize: '1.4rem', margin: '0 0 0.25rem 0', fontWeight: '800' }}>
                                            {entry?.mangaId?.title || m.title || 'Unknown Title'}
                                        </h2>
                                        {m.author && (
                                            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', margin: '0 0 0.5rem 0' }}>by {m.author}</p>
                                        )}
                                        {m.genres?.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.6rem' }}>
                                                {m.genres.slice(0, 5).map(g => (
                                                    <span key={g} style={{ padding: '0.15rem 0.5rem', borderRadius: '20px', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '600' }}>{g}</span>
                                                ))}
                                            </div>
                                        )}
                                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.4', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0 }}>
                                            {m.synopsis || 'No synopsis available.'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (!isSignedIn) return redirectToSignIn();
                                            if (isAdded) {
                                                setEditingManga(entry);
                                                setTempStatus(entry.status);
                                                setTempRating(entry.rating || 0);
                                                setTempNotes(entry.notes || '');
                                            } else {
                                                setEditingManga(m);
                                                setTempStatus('plan_to_read');
                                                setTempRating(0);
                                                setTempNotes('');
                                            }
                                        }}
                                        style={{ marginTop: '1rem', padding: '0.6rem 1.2rem', borderRadius: '12px', background: isAdded ? '#4CAF50' : 'var(--text-main)', color: isAdded ? 'white' : 'var(--bg-color)', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                                    >
                                        {isAdded ? 'Edit' : '+ Add to List'}
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>

                {editingManga && (
                    <div onClick={() => setEditingManga(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
                        <div onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '420px', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                            <h2 style={{ color: 'var(--text-main)', marginTop: 0, fontSize: '1.6rem' }}>{isNew ? 'Add to List' : 'Edit Entry'}</h2>

                            <div style={{ margin: '1.2rem 0' }}>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Status</label>
                                <select value={tempStatus} onChange={(e) => setTempStatus(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', marginTop: '0.5rem', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '1rem' }}>
                                    <option value="reading">Reading</option>
                                    <option value="completed">Completed</option>
                                    <option value="plan_to_read">Plan to Read</option>
                                    <option value="on_hold">On Hold</option>
                                    <option value="dropped">Dropped</option>
                                </select>
                            </div>

                            <div style={{ margin: '1.2rem 0' }}>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Rating (1-10)</label>
                                <select value={tempRating} onChange={(e) => setTempRating(Number(e.target.value))} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', marginTop: '0.5rem', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '1rem' }}>
                                    <option value="0">No Rating</option>
                                    {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                </select>
                            </div>

                            <div style={{ margin: '1.2rem 0' }}>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Notes</label>
                                <textarea
                                    value={tempNotes}
                                    onChange={(e) => setTempNotes(e.target.value)}
                                    placeholder="What did you think?"
                                    style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', minHeight: '100px', fontSize: '1rem', resize: 'none' }}
                                />
                            </div>

                            <button onClick={addOrUpdateManga} style={{ width: '100%', padding: '1rem', background: '#4CAF50', color: 'white', borderRadius: '14px', fontWeight: 900, border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                                {isNew ? '+ Add Manga' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
