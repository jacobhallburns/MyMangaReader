import React, { useEffect, useState } from 'react';
import { useUser, SignInButton } from '@clerk/nextjs'; // Import Clerk hooks

// --- TYPESCRIPT INTERFACES ---
interface Manga {
    kitsuId: string;
    title: string;
    posterImage?: string;
    synopsis?: string;
    rating?: string | number | null;
}

interface RecsData {
    selectedGenre: string;
    basedOnTaste: Manga[];
    trending: Manga[];
}

const RecCard = ({ manga }: { manga: Manga }) => {
    const { isSignedIn } = useUser(); // Check if user is logged in
    const [isAdded, setIsAdded] = useState(false);

    const handleAdd = async () => {
        // THE "LOGIN WALL" CHECK
        if (!isSignedIn) {
            alert("Please sign in to add manga to your list!");
            window.location.href = "/sign-in"; // Or your preferred login route
            return;
        }

        try {
            const res = await fetch('/api/manga/add', { // Use your sync API
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // Send the raw Kitsu-style data your add.ts expects
                    kitsuData: {
                        id: manga.kitsuId,
                        attributes: {
                            canonicalTitle: manga.title,
                            posterImage: { large: manga.posterImage },
                            synopsis: manga.synopsis
                        }
                    },
                    status: 'plan_to_read'
                })
            });

            if (res.ok) setIsAdded(true);
        } catch (err) {
            console.error("Failed to add:", err);
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
            {/* NEW 140x210 POSTER SCALE */}
            <div style={{ 
                width: '120px', height: '180px', // Slightly smaller for rec cards to fit grid better
                backgroundColor: '#1a1a1a', borderRadius: '12px', 
                flexShrink: 0, overflow: 'hidden', border: '1px solid var(--border-color)',
                boxShadow: '0 8px 16px rgba(0,0,0,0.4)'
            }}>
                <img
                    src={manga.posterImage || "/placeholder.png"}
                    alt={manga.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                    <h2 style={{ color: 'var(--text-main)', fontSize: '1.1rem', margin: '0 0 0.5rem 0', fontWeight: '800' }}>
                        {manga.title}
                    </h2>
                    <p style={{
                        color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.4, margin: 0,
                        display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden'
                    }}>
                        {manga.synopsis || "No synopsis available."}
                    </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                    <span style={{ color: '#FFD700', fontWeight: 'bold', fontSize: '0.9rem' }}>
                        ★ {manga.rating || 'N/A'}
                    </span>
                    <button 
                        onClick={handleAdd}
                        disabled={isAdded}
                        style={{
                            padding: '0.5rem 1rem', borderRadius: '10px', border: 'none',
                            background: isAdded ? '#4CAF50' : 'var(--text-main)',
                            color: isAdded ? 'white' : 'var(--bg-color)',
                            fontWeight: 'bold', cursor: isAdded ? 'default' : 'pointer', fontSize: '0.85rem'
                        }}
                    >
                        {isAdded ? '✔ Added' : '+ Add'}
                    </button>
                </div>
            </div>
        </li>
    );
};

export default function Recommendations() {
    const [recs, setRecs] = useState<RecsData>({ selectedGenre: '', basedOnTaste: [], trending: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/manga/recommendations')
            .then(res => res.json())
            .then(data => {
                setRecs(data);
                setLoading(false);
            });
    }, []);

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', padding: '2rem' }}>
            <main style={{ maxWidth: '1100px', margin: '0 auto' }}>
                <h1 style={{ color: 'var(--text-main)', fontSize: '2rem', marginBottom: '2rem' }}>Discover Manga</h1>
                
                {/* PERSONALIZED SECTION */}
                <section style={{ marginBottom: '4rem' }}>
                    <h2 style={{ color: 'var(--text-main)', borderLeft: '5px solid var(--accent-green)', paddingLeft: '1rem', marginBottom: '0.5rem' }}>
                        Recommended For You
                    </h2>
                    <p style={{ color: 'var(--text-muted)', marginBottom: '2rem', marginLeft: '1.3rem' }}>
                        {recs.selectedGenre ? `Because you like ${recs.selectedGenre}` : 'Based on your reading history'}
                    </p>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
                        {loading ? <p style={{color: 'white'}}>Loading...</p> : recs.basedOnTaste.map(m => <RecCard key={m.kitsuId} manga={m} />)}
                    </div>
                </section>

                {/* TRENDING SECTION */}
                <section>
                    <h2 style={{ color: 'var(--text-main)', borderLeft: '5px solid var(--border-color)', paddingLeft: '1rem', marginBottom: '2rem' }}>
                        Global Trending
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '2rem' }}>
                        {loading ? <p style={{color: 'white'}}>Loading...</p> : recs.trending.map(m => <RecCard key={m.kitsuId} manga={m} />)}
                    </div>
                </section>
            </main>
        </div>
    );
}