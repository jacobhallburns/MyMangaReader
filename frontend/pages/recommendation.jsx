import React, { useEffect, useState } from 'react';
import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import TitleWithAltNames from '../components/TitleWithAltNames';

const fmtRating = (n) => String(parseFloat(n.toFixed(2)));

const RatingDisplay = ({ userRating, averageRating, ratingCount }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', margin: '0 0 0.75rem 0', flexWrap: 'wrap' }}>
        {userRating > 0 && (
            <span style={{ color: '#4CAF50', fontWeight: '700', fontSize: '0.82rem' }}>★ {userRating}</span>
        )}
        {averageRating > 0 ? (
            <span style={{ color: '#FFD700', fontWeight: '700', fontSize: '0.82rem' }}>
                ★ {fmtRating(averageRating)}{' '}
                <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>({ratingCount})</span>
            </span>
        ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No ratings</span>
        )}
    </div>
);

const AddModal = ({ manga, onClose, onAdded }) => {
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
                    kitsuData: manga._raw,
                    status: tempStatus,
                    rating: tempRating,
                    notes: tempNotes
                })
            });

            if (res.ok) {
                onAdded(manga.kitsuId);
                onClose();
            } else {
                const body = await res.json().catch(() => ({}));
                setAddError(body.detail || body.error || `Server error (${res.status})`);
            }
        } catch (err) {
            setAddError(err.message || 'Network error');
        } finally {
            setAdding(false);
        }
    };

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000, backdropFilter: 'blur(4px)' }}>
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

                    <button onClick={onClose} style={{ padding: '1rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '14px', cursor: 'pointer' }}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
};

const CardContent = ({ manga, isAlreadyAdded, userRating, onAddClick }) => (
    <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
        <h2 style={{ color: 'var(--text-main)', fontSize: '1rem', margin: '0 0 0.2rem 0', fontWeight: '800', lineHeight: '1.3' }}>
            <TitleWithAltNames title={manga.title} altTitles={manga.altTitles ?? []} mediaRaw={manga._raw ?? null} />
        </h2>

        {manga.author && (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0 0.6rem 0' }}>by {manga.author}</p>
        )}

        {manga.genres?.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', marginBottom: '0.75rem' }}>
                {manga.genres.slice(0, 5).map(g => (
                    <span key={g} style={{ background: 'var(--border-color)', color: 'var(--text-muted)', padding: '0.15rem 0.55rem', borderRadius: '999px', fontSize: '0.68rem', fontWeight: '600', whiteSpace: 'nowrap' }}>
                        {g}
                    </span>
                ))}
            </div>
        )}

        <RatingDisplay userRating={userRating} averageRating={manga.averageRating ?? 0} ratingCount={manga.ratingCount ?? 0} />

        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', WebkitLineClamp: 3, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.45', flex: 1, margin: '0 0 1rem 0' }}>
            {manga.synopsis || 'No description available.'}
        </p>

        <button
            onClick={onAddClick}
            disabled={isAlreadyAdded}
            style={{ width: '100%', padding: '0.65rem', borderRadius: '12px', background: isAlreadyAdded ? '#4CAF50' : 'var(--text-main)', color: isAlreadyAdded ? 'white' : 'var(--bg-color)', border: 'none', fontWeight: 'bold', cursor: isAlreadyAdded ? 'default' : 'pointer', fontSize: '0.9rem' }}
        >
            {isAlreadyAdded ? '✔ Added' : '+ Add to List'}
        </button>
    </div>
);

const RecCard = ({ manga, onAdded, isAlreadyAdded, userRating }) => {
    const { isSignedIn } = useUser();
    const { redirectToSignIn } = useClerk();
    const [showModal, setShowModal] = useState(false);

    return (
        <li style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
            <div style={{ height: '300px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#1a1a1a' }}>
                <img src={manga.posterImage || '/placeholder.png'} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt={manga.title} />
            </div>

            <CardContent
                manga={manga}
                isAlreadyAdded={isAlreadyAdded}
                userRating={userRating}
                onAddClick={() => {
                    if (!isSignedIn) {
                        redirectToSignIn();
                        return;
                    }

                    if (!isAlreadyAdded) setShowModal(true);
                }}
            />

            {showModal && <AddModal manga={manga} onClose={() => setShowModal(false)} onAdded={onAdded} />}
        </li>
    );
};

const RandomizerCard = ({ manga, onAdded, isAlreadyAdded, userRating, onSpin, spinning = false }) => {
    const { isSignedIn } = useUser();
    const { redirectToSignIn } = useClerk();
    const [showModal, setShowModal] = useState(false);

    return (
        <li style={{
            background: 'var(--card-bg)',
            border: '2px solid #D4AF37',
            borderRadius: '16px',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 0 24px rgba(212,175,55,0.25), 0 4px 20px rgba(0,0,0,0.15)',
            position: 'relative',
        }}>
            <div style={{ height: '4px', background: 'linear-gradient(90deg, #7B5B00, #D4AF37, #FFD700, #D4AF37, #7B5B00)', flexShrink: 0 }} />

            <div style={{ background: 'linear-gradient(180deg, #120d00 0%, #1c1500 100%)', padding: '0.7rem 1rem 0.65rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', borderBottom: '1px solid #3a2900', flexShrink: 0 }}>
                <button
                    onClick={spinning ? undefined : onSpin}
                    title={spinning ? 'Finding something new...' : "Fortune's Pick — click to randomize"}
                    style={{ background: 'none', border: 'none', cursor: spinning ? 'wait' : 'pointer', padding: 0, lineHeight: 0 }}
                >
                    <div
                        className="gem-glow"
                        style={{
                            width: '34px',
                            height: '38px',
                            background: 'linear-gradient(160deg, #c4b5fd 0%, #7c3aed 45%, #4c1d95 100%)',
                            clipPath: 'polygon(50% 0%, 100% 30%, 85% 100%, 15% 100%, 0% 30%)',
                            opacity: spinning ? 0.45 : 1,
                            transition: 'opacity 0.2s',
                        }}
                    />
                </button>

                <span style={{ color: '#D4AF37', fontSize: '0.6rem', fontWeight: '800', letterSpacing: '0.14em', opacity: 0.9 }}>
                    {spinning ? 'SEARCHING...' : "FORTUNE'S PICK"}
                </span>
            </div>

            <div style={{ height: '260px', overflow: 'hidden', flexShrink: 0, backgroundColor: '#1a1a1a' }}>
                <img src={manga.posterImage || '/placeholder.png'} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} alt={manga.title} />
            </div>

            <CardContent
                manga={manga}
                isAlreadyAdded={isAlreadyAdded}
                userRating={userRating}
                onAddClick={() => {
                    if (!isSignedIn) {
                        redirectToSignIn();
                        return;
                    }

                    if (!isAlreadyAdded) setShowModal(true);
                }}
            />

            {showModal && <AddModal manga={manga} onClose={() => setShowModal(false)} onAdded={onAdded} />}
        </li>
    );
};

const LoadMoreButton = ({ onClick }) => (
    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
        <button
            onClick={onClick}
            style={{ padding: '0.65rem 2rem', borderRadius: '12px', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem' }}
        >
            Load More
        </button>
    </div>
);

export default function Recommendations() {
    const { isLoaded, isSignedIn } = useAuth();
    const [recs, setRecs] = useState({ selectedGenre: '', basedOnTaste: [], trending: [], randomPool: [] });
    const [addedIds, setAddedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [recVisible, setRecVisible] = useState(14);
    const [trendVisible, setTrendVisible] = useState(15);
    const [randomizerItem, setRandomizerItem] = useState(null);
    const [spinLoading, setSpinLoading] = useState(false);

    useEffect(() => {
        if (!isLoaded) return;

        if (isSignedIn) {
            fetch('/api/manga/collection')
                .then(r => r.ok ? r.json() : [])
                .then(list => {
                    if (!Array.isArray(list)) return;

                    const ids = new Set();

                    list.forEach(entry => {
                        const kid = entry.mangaId?.kitsuId;
                        if (kid) ids.add(String(kid));
                    });

                    setAddedIds(ids);
                })
                .catch(() => {});
        }

        fetch('/api/manga/recommendations')
            .then(res => {
                if (!res.ok) {
                    console.error('API FAILED:', res.status);
                    return null;
                }

                return res.json();
            })
            .then(data => {
                if (data) setRecs(data);
                setLoading(false);
            })
            .catch(err => {
                console.error('Fetch error:', err);
                setError('Failed to load recommendations.');
                setLoading(false);
            });
    }, [isLoaded, isSignedIn]);

    useEffect(() => {
        if (randomizerItem || recs.basedOnTaste.length === 0) return;

        const candidate = recs.basedOnTaste[recVisible] ?? recs.randomPool?.[0] ?? null;

        if (candidate) setRandomizerItem(candidate);
    }, [recs.basedOnTaste, recs.randomPool]);

    const handleMangaAdded = (kitsuId) => {
        setAddedIds(prev => new Set(prev).add(String(kitsuId)));
    };

    const HISTORY_KEY = 'randomizerHistory';
    const HISTORY_SIZE = 50;

    const getHistory = () => {
        try {
            return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        } catch {
            return [];
        }
    };

    const addToHistory = (kitsuId) => {
        let h = getHistory().filter(id => id !== kitsuId);

        h.push(kitsuId);

        if (h.length > HISTORY_SIZE) h = h.slice(-HISTORY_SIZE);

        localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
    };

    const spinRandomizer = async () => {
        if (spinLoading) return;

        setSpinLoading(true);

        const history = getHistory();
        let result = null;

        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const res = await fetch('/api/manga/random');

                if (!res.ok) break;

                const data = await res.json();

                if (!data.manga) break;

                if (!history.includes(data.manga.kitsuId) && data.manga.kitsuId !== randomizerItem?.kitsuId) {
                    result = data.manga;
                    break;
                }
            } catch {
                break;
            }
        }

        if (result) {
            addToHistory(result.kitsuId);
            setRandomizerItem(result);
        }

        setSpinLoading(false);
    };

    const handleLoadMoreRecs = () => {
        setRecVisible(v => Math.min(v + 5, recs.basedOnTaste.length));
    };

    const regularRecs = recs.basedOnTaste.slice(0, recVisible);
    const hasMoreRecs = recVisible < recs.basedOnTaste.length;
    const hasMoreTrend = trendVisible < (recs.trending?.length ?? 0);

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
                            {randomizerItem && (
                                <RandomizerCard
                                    key={`randomizer-${randomizerItem.kitsuId}`}
                                    manga={randomizerItem}
                                    onAdded={handleMangaAdded}
                                    isAlreadyAdded={addedIds.has(randomizerItem.kitsuId)}
                                    userRating={randomizerItem.userRating ?? 0}
                                    onSpin={spinRandomizer}
                                    spinning={spinLoading}
                                />
                            )}

                            {regularRecs.map(m => (
                                <RecCard
                                    key={m.kitsuId}
                                    manga={m}
                                    onAdded={handleMangaAdded}
                                    isAlreadyAdded={addedIds.has(m.kitsuId)}
                                    userRating={m.userRating ?? 0}
                                />
                            ))}
                        </ul>

                        {hasMoreRecs && <LoadMoreButton onClick={handleLoadMoreRecs} />}
                    </section>
                )}

                <section>
                    <h2 style={{ color: 'var(--text-main)', borderLeft: '5px solid var(--border-color)', paddingLeft: '1rem', marginBottom: '2rem' }}>Global Trending</h2>

                    {loading ? (
                        <p style={{ color: 'var(--text-muted)' }}>Loading...</p>
                    ) : (
                        <>
                            <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1.5rem' }}>
                                {recs?.trending?.slice(0, trendVisible).map(m => (
                                    <RecCard
                                        key={m.kitsuId}
                                        manga={m}
                                        onAdded={handleMangaAdded}
                                        isAlreadyAdded={addedIds.has(m.kitsuId)}
                                        userRating={m.userRating ?? 0}
                                    />
                                ))}
                            </ul>

                            {hasMoreTrend && <LoadMoreButton onClick={() => setTrendVisible(t => t + 5)} />}
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}