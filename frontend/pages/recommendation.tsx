import React, { useEffect, useState } from 'react';
import Link from "next/link";

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
    topGenre: string;
    basedOnTaste: Manga[];
    trending: Manga[];
}

interface RecCardProps {
    manga: Manga;
    badgeText: string;
    badgeColor: string;
}

// --- SUB-COMPONENT ---
const RecCard = ({ manga, badgeText, badgeColor }: RecCardProps) => (
    <li style={{
        background: '#ffffff',
        border: '2px solid #00cc66',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 10px 28px rgba(0,0,0,0.08)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        justifyContent: 'space-between'
    }}>
        <div>
            <h2 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#cc0000', fontSize: '1.3rem' }}>
                {manga.title}
            </h2>
            
            <span style={{
                display: 'inline-block',
                padding: '0.2rem 0.6rem',
                borderRadius: '8px',
                background: badgeColor,
                color: 'white',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                marginBottom: '1rem'
            }}>
                {badgeText}
            </span>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                {manga.coverImage && (
                    <img
                        src={manga.coverImage}
                        alt={manga.title}
                        style={{
                            width: '100px',
                            height: '150px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '2px solid #00cc66',
                            flexShrink: 0,
                        }}
                    />
                )}
                <p style={{
                    color: '#ff6699',
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
                <span style={{ color: '#00aa55', fontWeight: 600 }}>
                Rating: {manga.rating ? `${manga.rating}/10` : 'N/A'}
                </span>
                
                <button style={{
                padding: '0.5rem 1rem',
                borderRadius: '10px',
                border: 'none',
                background: '#00cc66',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer'
                }}>
                + Add to List
                </button>
        </div>
    </li>
);

// --- MAIN PAGE COMPONENT ---
export default function Recommendations() {
    const [recs, setRecs] = useState<RecsData>({ topGenre: '', basedOnTaste: [], trending: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRecs = async () => {
            try {
                const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
                const res = await fetch(`${backendUrl}/api/recommendations`);
                const data = await res.json();
                
                if (res.ok) {
                    setRecs(data);
                } else {
                    console.error("Backend error:", data);
                }
            } catch (err) {
                console.error("Failed to load recommendations", err);
            } finally {
                setLoading(false);
            }
        };

        fetchRecs();
    }, []);

    if (loading) return (
        <div style={{ 
            minHeight: '100vh', 
            background: '#f8f8f8', 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center',
            color: '#00cc66',
            fontSize: '1.5rem',
            fontWeight: 'bold'
        }}>
            Analyzing your library...
        </div>
    );

    return (
        <div style={{
            minHeight: '100vh',
            background: '#f8f8f8',
            paddingBottom: '4rem'
        }}>
            {/* --- HEADER --- */}
            <div style={{ 
                background: '#f8f8f8', 
                padding: '0 2rem', 
                borderBottom: '2px solid #00cc66', 
                position: 'sticky', 
                top: 0, 
                zIndex: 10 
            }}>
                <header style={{
                    maxWidth: '1000px',
                    margin: '0 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 0',
                }}>
                    <h1 style={{ margin: 0 }}>Find New Manga</h1>
                    
                    {/* NAVIGATION BUTTONS */}
                    <nav style={{ display: 'flex', gap: '3rem' }}>
                        {/* 1. Link back to Manga List (Home) */}
                        <Link href="/manga-list" style={{ 
                            fontWeight: 600, 
                            fontSize: '1.2rem', 
                            color: 'black', 
                            textDecoration: 'none' 
                        }}>
                            Manga List
                        </Link>

                        {/* 2. Link to Search Page (Add Manga) */}
                        <Link href="/search" style={{ 
                            fontWeight: 600, 
                            fontSize: '1.2rem', 
                            color: 'black', 
                            textDecoration: 'none' 
                        }}>
                            Add Manga
                        </Link>
                    </nav>
                </header>
            </div>

            {/* --- MAIN CONTENT --- */}
            <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
                
                {/* SECTION 1: PERSONALIZED */}
                <div style={{ marginBottom: '4rem' }}>
                    <h2 style={{ 
                        color: '#333', 
                        borderLeft: '5px solid #cc0000', 
                        paddingLeft: '1rem', 
                        marginBottom: '1.5rem' 
                    }}>
                        Because you read <span style={{color: '#cc0000'}}>{recs.topGenre}</span>
                    </h2>
                    
                    {recs.basedOnTaste.length === 0 ? (
                        <p>Read more manga to get personalized picks!</p>
                    ) : (
                        <ul style={{
                            listStyle: 'none',
                            padding: 0,
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '1.5rem',
                        }}>
                            {recs.basedOnTaste.map(m => (
                                <RecCard 
                                    key={m.kitsuId} 
                                    manga={m} 
                                    badgeText={`Highly Rated ${recs.topGenre}`} 
                                    badgeColor="#cc0000" 
                                />
                            ))}
                        </ul>
                    )}
                </div>

                {/* SECTION 2: GLOBAL TRENDING */}
                <div>
                    <h2 style={{ 
                        color: '#333', 
                        borderLeft: '5px solid #00cc66', 
                        paddingLeft: '1rem', 
                        marginBottom: '1.5rem' 
                    }}>
                        Global Trending
                    </h2>
                    
                    <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: '1.5rem',
                    }}>
                        {recs.trending.map(m => (
                            <RecCard 
                                key={m.kitsuId} 
                                manga={m} 
                                badgeText="Trending Now" 
                                badgeColor="#00cc66" 
                            />
                        ))}
                    </ul>
                </div>

            </main>
        </div>
    );
}