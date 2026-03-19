import React, { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';

const RecCard = ({ manga, onAdded, isAlreadyAdded }) => {
    const { isSignedIn } = useUser();
    const [showModal, setShowModal] = useState(false);
    const [tempStatus, setTempStatus] = useState('plan_to_read');
    const [tempRating, setTempRating] = useState(0);

    const handleConfirmAdd = async () => {
        try {
            const res = await fetch('/api/manga/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    kitsuData: {
                        id: manga.kitsuId,
                        type: 'manga',
                        attributes: {
                            canonicalTitle: manga.title,
                            synopsis: manga.synopsis,
                            posterImage: { large: manga.posterImage }
                        }
                    },
                    status: tempStatus,
                    rating: tempRating,
                    notes: ""
                })
            });

            if (res.ok) {
                onAdded(manga.kitsuId);
                setShowModal(false);
            }
        } catch (err) {
            console.error("Failed to add manga:", err);
        }
    };

    return (
        <li style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            padding: '1.25rem',
            display: 'flex',
            gap: '1.5rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}>
            <div style={{ 
                width: '120px', height: '180px', backgroundColor: '#1a1a1a', 
                borderRadius: '16px', flexShrink: 0, overflow: 'hidden', 
                border: '1px solid var(--border-color)', boxShadow: '0 8px 16px rgba(0,0,0,0.4)'
            }}>
                <img src={manga.posterImage || "/placeholder.png"} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={manga.title} />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{ color: 'var(--text-main)', fontSize: '1.2rem', margin: '0 0 0.5rem 0', fontWeight: '800' }}>{manga.title}</h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', WebkitLineClamp: 3, display: '-webkit-box', WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                        {manga.synopsis}
                    </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#FFD700', fontWeight: 'bold' }}>★ {manga.rating}</span>
                    <button 
                        onClick={() => {
                            if (!isSignedIn) {
                                // Direct browser redirect to avoid Next.js router 404s
                                window.location.assign("/sign-in");
                                return;
                            }
                            if (!isAlreadyAdded) setShowModal(true);
                        }}
                        disabled={isAlreadyAdded}
                        style={{ 
                            padding: '0.6rem 1.2rem', 
                            borderRadius: '12px', 
                            background: isAlreadyAdded ? '#4CAF50' : 'var(--text-main)', 
                            color: isAlreadyAdded ? 'white' : 'var(--bg-color)', 
                            border: 'none', 
                            fontWeight: 'bold', 
                            cursor: isAlreadyAdded ? 'default' : 'pointer' 
                        }}
                    >
                        {isAlreadyAdded ? '✔ Added' : '+ Add to List'}
                    </button>
                </div>
            </div>

            {showModal && (
                <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
                    <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '24px', width: '90%', maxWidth: '350px', border: '1px solid var(--border-color)' }}>
                        <h3 style={{ color: 'var(--text-main)', marginTop: 0 }}>Add {manga.title}</h3>
                        <select value={tempStatus} onChange={e => setTempStatus(e.target.value)} style={{ width: '100%', padding: '0.7rem', margin: '0.5rem 0 1.5rem 0', borderRadius: '10px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                            <option value="plan_to_read">Plan to Read</option>
                            <option value="reading">Reading</option>
                            <option value="completed">Completed</option>
                        </select>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <button onClick={handleConfirmAdd} style={{ flex: 1, padding: '0.8rem', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 'bold' }}>Confirm</button>
                            <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '0.8rem', background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border-color)', borderRadius: '12px' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </li>
    );
};

export default function Recommendations() {
    const [recs, setRecs] = useState({ selectedGenre: '', basedOnTaste: [], trending: [] });
    const [addedIds, setAddedIds] = useState(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/manga/recommendations')
            .then(res => res.json())
            .then(data => {
                setRecs(data);
                setLoading(false);
            });
    }, []);

    const handleMangaAdded = (kitsuId) => {
        setAddedIds(prev => new Set(prev).add(kitsuId));
    };

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', padding: '2rem' }}>
            <main style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <h1 style={{ color: 'var(--text-main)', fontSize: '2.5rem', marginBottom: '2rem', fontWeight: '900' }}>Discover</h1>
                
                {recs.basedOnTaste.length > 0 && (
                    <section style={{ marginBottom: '4rem' }}>
                        <h2 style={{ color: 'var(--text-main)', borderLeft: '5px solid var(--accent-green)', paddingLeft: '1rem', marginBottom: '0.5rem' }}>Recommended For You</h2>
                        <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', marginLeft: '1.3rem' }}>{recs.selectedGenre ? `Because you like ${recs.selectedGenre}` : 'Based on your history'}</p>
                        <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '2rem' }}>
                            {recs.basedOnTaste.map(m => (
                                <RecCard key={m.kitsuId} manga={m} onAdded={handleMangaAdded} isAlreadyAdded={addedIds.has(m.kitsuId)} />
                            ))}
                        </ul>
                    </section>
                )}

                <section>
                    <h2 style={{ color: 'var(--text-main)', borderLeft: '5px solid var(--border-color)', paddingLeft: '1rem', marginBottom: '2rem' }}>Global Trending</h2>
                    <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(450px, 1fr))', gap: '2rem' }}>
                        {loading ? <p style={{color: 'white'}}>Loading...</p> : recs.trending.map(m => (
                            <RecCard key={m.kitsuId} manga={m} onAdded={handleMangaAdded} isAlreadyAdded={addedIds.has(m.kitsuId)} />
                        ))}
                    </ul>
                </section>
            </main>
        </div>
    );
}