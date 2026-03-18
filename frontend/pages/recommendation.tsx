import React, { useEffect, useState } from 'react';

// --- TYPESCRIPT INTERFACES ---
interface Manga {
    kitsuId: string;
    title: string;
    coverImage?: string;
    synopsis?: string;
    rating?: number | null;
    status?: string;
}

interface RecsData {
    selectedGenre: string;
    availableGenres: string[];
    basedOnTaste: Manga[];
    trending: Manga[];
}

// --- SUB-COMPONENT ---
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

            if (res.ok) {
                setIsAdded(true);
            } else {
                alert("Could not add to list.");
            }
        } catch (err) {
            console.error("Failed to add manga:", err);
        }
    };

    return (
        <li style={{
            background: 'var(--card-bg)',
            border: '2px solid var(--border-color)',
            borderRadius: '16px',
            padding: '1rem',
            boxShadow: '0 10px 28px rgba(0,0,0,0.08)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            justifyContent: 'space-between'
        }}>
            <div>
                <h2 style={{ marginTop: 0, marginBottom: '0.5rem', color: 'var(--text-main)', fontSize: '1.3rem' }}>
                    {manga.title}
                </h2>

                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem' }}>
                    {manga.coverImage && (
                        <img
                            src={manga.coverImage}
                            alt={manga.title}
                            style={{
                                width: '100px',
                                height: '150px',
                                objectFit: 'cover',
                                borderRadius: '8px',
                                border: '2px solid var(--border-color)',
                                flexShrink: 0,
                            }}
                        />
                    )}
                    <p style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.9rem',
                        lineHeight: 1.4,
                        margin: 0,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 6,
                        WebkitBoxOrient: 'vertical'
                    }}>
                        {manga.synopsis || "No synopsis available."}
                    </p>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span style={{ color: 'var(--accent-green)', fontWeight: 600 }}>
                    Avg Rating: {manga.rating ? `${manga.rating}/10` : 'N/A'}
                    </span>
                    <button 
                        onClick={handleAdd}
                        disabled={isAdded}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '10px',
                            border: 'none',
                            background: isAdded ? '#888' : 'var(--accent-green)',
                            color: 'white',
                            fontWeight: 'bold',
                            cursor: isAdded ? 'default' : 'pointer',
                        }}
                    >
                        {isAdded ? '✔ Added!' : '+ Add to List'}
                    </button>
            </div>
        </li>
    );
};

export default function Recommendations() {
    const [recs, setRecs] = useState<RecsData>({ selectedGenre: '', availableGenres: [], basedOnTaste: [], trending: [] });
    const [loading, setLoading] = useState(true);

    const fetchRecs = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/manga/recommendations');
            const data = await res.json();
            if (res.ok) setRecs(data);
        } catch (err) {
            console.error("Failed to load recommendations", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecs();
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', paddingBottom: '4rem' }}>
            <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
                <div style={{ marginBottom: '4rem' }}>
                <h2 style={{
                    color: 'var(--text-main)',
                    borderLeft: '5px solid var(--text-main)',
                    paddingLeft: '1rem',
                    margin: 0
                }}>
                    Recommended For You
                </h2>

                <p style={{ marginTop: '0.4rem', marginLeft: '1rem', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                    {recs.selectedGenre ? `Based on: ${recs.selectedGenre}` : 'Based on your manga list'}
                </p>
                    
                    {loading ? (
                        <p style={{color: 'var(--text-main)', fontWeight: 'bold'}}>Finding recommendations for you...</p>
                    ) : (
                        <ul style={{
                            listStyle: 'none',
                            padding: 0,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            rowGap: '3.5rem',
                            columnGap: '1rem',
                        }}>
                            {recs.basedOnTaste.map(m => (
                                <RecCard key={m.kitsuId} manga={m} />
                            ))}
                        </ul>
                    )}
                </div>

                <div>
                    <h2 style={{ color: 'var(--text-main)', borderLeft: '5px solid var(--border-color)', paddingLeft: '1rem', marginBottom: '1.5rem' }}>
                        Global Trending
                    </h2>
                    <ul style={{
                        listStyle: 'none', padding: 0, display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                        rowGap: '3.5rem',
                        columnGap: '1.3rem',
                    }}>
                        {recs.trending.map(m => (
                            <RecCard key={m.kitsuId} manga={m} />
                        ))}
                    </ul>
                </div>
            </main>
        </div>
    );
}