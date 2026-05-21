import React, { useEffect, useState } from 'react';
import { useAuth, useClerk, useUser } from '@clerk/nextjs';

const RatingDisplay = ({ userRating, averageRating, ratingCount }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0 0 0.75rem 0', flexWrap: 'wrap' }}>
        {userRating > 0 && (
            <span style={{ color: '#4CAF50', fontWeight: '700', fontSize: '0.82rem' }}>★ {userRating}</span>
        )}
        {averageRating > 0 ? (
            <span style={{ color: '#FFD700', fontWeight: '700', fontSize: '0.82rem' }}>
                ★ {averageRating.toFixed(2)}{' '}
                <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>({ratingCount})</span>
            </span>
        ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No ratings</span>
        )}
    </div>
);

const RecCard = ({ manga, onAdded, isAlreadyAdded, userRating }) => {
    const { isSignedIn } = useUser();
    const { redirectToSignIn } = useClerk();
    const [showModal, setShowModal] = useState(false);
    const [tempStatus, setTempStatus] = useState('plan_to_read');
    const [tempRating, setTempRating] = useState(0);
    const [tempNotes, setTempNotes] = useState('');
    const [addError, setAddError] = useState(null);
    const [adding, setAdding] = useState(false);

    const handleConfirmAdd = async () => {
        setAddError(null);
        setAdding(true);
        try {
            const res = await fetch('/api/manga/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    mangaDexData: manga._raw,
                    status: tempStatus,
                    rating: tempRating,
                    notes: tempNotes
                })
            });
            if (res.ok) {
                onAdded(manga.mangaDexId);
                setShowModal(false);
            } else {
                const body = await res.json().catch(() => ({}));
                setAddError(body.detail || body.error || `Server error (${res.status})`);
                console.error('[RecCard] add failed:', res.status, body);
            }
        } catch (err) {
            setAddError(err.message || 'Network error');
            console.error('Failed to add manga:', err);
        } finally {
            setAdding(false);
        }
    };

    return (
        <li style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}>
            <div style={{ height: '300px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#1a1a1a' }}>
                <img
                    src={manga.posterImage || "/placeholder.png"}
                    referrerPolicy="no-referrer"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    alt={manga.title}
                />
            </div>

            <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                <h2 style={{ color: 'var(--text-main)', fontSize: '1rem', margin: '0 0 0.2rem 0', fontWeight: '800', lineHeight: '1.3' }}>
                    {manga.title}
                </h2>

                {manga.author && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 0.6rem 0' }}>
                        by {manga.author}
                    </p>
                )}

                {manga.genres?.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.75rem' }}>
                        {manga.genres.slice(0, 5).map(g => (
                            <span key={g} style={{
                                background: 'var(--border-color)',
                                color: 'var(--text-muted)',
                                padding: '0.15rem 0.55rem',
                                borderRadius: '999px',
                                fontSize: '0.68rem',
                                fontWeight: '600',
                                whiteSpace: 'nowrap',
                            }}>{g}</span>
                        ))}
                    </div>
                )}

                <RatingDisplay userRating={userRating} averageRating={manga.averageRating ?? 0} ratingCount={manga.ratingCount ?? 0} />

                <p style={{
                    color: 'var(--text-muted)',
                    fontSize: '0.82rem',
                    WebkitLineClamp: 3,
                    display: '-webkit-box',
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: '1.45',
                    flex: 1,
                    margin: '0 0 1rem 0',
                }}>
                    {manga.synopsis || 'No description available.'}
                </p>

                <button
                    onClick={() => {
                        if (!isSignedIn) { redirectToSignIn(); return; }
                        if (!isAlreadyAdded) setShowModal(true);
                    }}
                    disabled={isAlreadyAdded}
                    style={{
                        width: '100%',
                        padding: '0.65rem',
                        borderRadius: '12px',
                        background: isAlreadyAdded ? '#4CAF50' : 'var(--text-main)',
                        color: isAlreadyAdded ? 'white' : 'var(--bg-color)',
                        border: 'none',
                        fontWeight: 'bold',
                        cursor: isAlreadyAdded ? 'default' : 'pointer',
                        fontSize: '0.9rem',
                    }}
                >
                    {isAlreadyAdded ? '✔ Added' : '+ Add to List'}
                </button>
            </div>

            {showModal && (
                <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, backdropFilter: 'blur(4px)' }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '420px', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                        <h2 style={{ color: 'var(--text-main)', marginTop: 0, fontSize: '1.6rem' }}>Add to List</h2>

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
                                {[...Array(10)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                            </select>
                        </div>

                        <div style={{ margin: '1.2rem 0' }}>
                            <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Notes</label>
                            <textarea
                                value={tempNotes}
                                onChange={(e) => setTempNotes(e.target.value)}
                                placeholder="What did you think?"
                                style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', minHeight: '100px', fontSize: '1rem', resize: 'none', boxSizing: 'border-box' }}
                            />
                        </div>

                        {addError && (
                            <p style={{ color: '#ff4444', fontSize: '0.85rem', margin: '0 0 1rem 0', background: 'rgba(255,68,68,0.1)', padding: '0.6rem 0.9rem', borderRadius: '8px' }}>
                                {addError}
                            </p>
                        )}
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={handleConfirmAdd} disabled={adding} style={{ flex: 1, padding: '1rem', background: '#4CAF50', color: 'white', borderRadius: '14px', fontWeight: 900, border: 'none', cursor: adding ? 'not-allowed' : 'pointer', fontSize: '1rem', opacity: adding ? 0.7 : 1 }}>
                                {adding ? 'Adding...' : '+ Add Manga'}
                            </button>
                            <button onClick={() => { setShowModal(false); setAddError(null); }} style={{ padding: '1rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '14px', cursor: 'pointer' }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </li>
    );
};

export default function Recommendations() {
    const { isLoaded, isSignedIn } = useAuth();
    const [recs, setRecs] = useState({ selectedGenre: '', basedOnTaste: [], trending: [] });
    const [addedIds, setAddedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isLoaded) return;
        if (isSignedIn) {
            fetch('/api/manga/collection')
                .then(r => r.ok ? r.json() : [])
                .then(list => {
                    if (!Array.isArray(list)) return;
                    const ids = new Set();
                    list.forEach(entry => {
                        const mdId = entry.mangaId?.mangaDexId;
                        if (mdId) ids.add(mdId);
                    });
                    setAddedIds(ids);
                })
                .catch(() => {});
        }
        fetch('/api/manga/recommendations')
            .then(res => {
                if (!res.ok) {
                    console.error("API FAILED:", res.status);
                    return null;
                }
                return res.json();
            })
            .then(data => {
                if (data) setRecs(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Fetch error:", err);
                setError('Failed to load recommendations.');
                setLoading(false);
            });
    }, [isLoaded, isSignedIn]);

    const handleMangaAdded = (mangaDexId) => {
        setAddedIds(prev => new Set(prev).add(mangaDexId));
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', padding: '2rem' }}>
            <main style={{ maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ color: 'var(--text-main)', fontSize: '2.5rem', marginBottom: '2rem', fontWeight: '900' }}>Discover</h1>

                {error && <p style={{ color: '#ff4444' }}>{error}</p>}

                {recs?.basedOnTaste?.length > 0 && (
                    <section style={{ marginBottom: '4rem' }}>
                        <h2 style={{ color: 'var(--text-main)', borderLeft: '5px solid var(--accent-green)', paddingLeft: '1rem', marginBottom: '0.5rem' }}>Recommended For You</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', marginLeft: '1.3rem' }}>
                            {recs.selectedGenre ? `Because you like ${recs.selectedGenre}` : 'Based on your history'}
                        </p>
                        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                            {recs.basedOnTaste.map(m => (
                                <RecCard key={m.mangaDexId} manga={m} onAdded={handleMangaAdded} isAlreadyAdded={addedIds.has(m.mangaDexId)} userRating={m.userRating ?? 0} />
                            ))}
                        </ul>
                    </section>
                )}

                <section>
                    <h2 style={{ color: 'var(--text-main)', borderLeft: '5px solid var(--border-color)', paddingLeft: '1rem', marginBottom: '2rem' }}>Global Trending</h2>
                    {loading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                    ) : (
                        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                            {recs?.trending?.map(m => (
                                <RecCard key={m.mangaDexId} manga={m} onAdded={handleMangaAdded} isAlreadyAdded={addedIds.has(m.mangaDexId)} userRating={m.userRating ?? 0} />
                            ))}
                        </ul>
                    )}
                </section>
            </main>
        </div>
    );
}
