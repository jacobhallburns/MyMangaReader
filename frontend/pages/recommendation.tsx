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
    selectedGenre: string;
    availableGenres: string[];
    basedOnTaste: Manga[];
    trending: Manga[];
}

interface RecCardProps {
    manga: Manga;
    badgeText: string;
    badgeColor: string;
}

// --- SUB-COMPONENT ---
const RecCard = ({ manga, badgeText, badgeColor }: RecCardProps) => {
    const [isAdded, setIsAdded] = useState(false);

    const handleAdd = async () => {
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            const res = await fetch(`${backendUrl}/api/manga`, {
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

            if (res.ok) setIsAdded(true);
            else alert("Could not add to list.");
        } catch (err) {
            console.error("Failed to add manga:", err);
        }
    };

    return (
        <li style={{
            background: '#ffffff',
            border: '2px solid #00cc66',
            borderRadius: '16px',
            padding: '1rem',
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
                    Avg Rating: {manga.rating ? `${manga.rating}/10` : 'N/A'}
                    </span>
                    <button 
                        onClick={handleAdd}
                        disabled={isAdded}
                        style={{
                            padding: '0.5rem 1rem',
                            borderRadius: '10px',
                            border: 'none',
                            background: isAdded ? '#888' : '#00cc66',
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

// --- MAIN PAGE COMPONENT ---
export default function Recommendations() {
    // Initial state
    const [recs, setRecs] = useState<RecsData>({ selectedGenre: '', availableGenres: [], basedOnTaste: [], trending: [] });
    const [loading, setLoading] = useState(true);
    const [filterGenre, setFilterGenre] = useState(''); // Tracks dropdown selection

    // Function to fetch data (accepts an optional genre override)
    const fetchRecs = async (genreOverride?: string) => {
        setLoading(true);
        try {
            const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
            // If user selected a genre, append it to URL
            const query = genreOverride ? `?genre=${genreOverride}` : '';
            
            const res = await fetch(`${backendUrl}/api/recommendations${query}`);
            const data = await res.json();
            
            if (res.ok) {
                setRecs(data);
                // If this was the initial load, set the filter to the auto-detected genre
                if (!genreOverride) setFilterGenre(data.selectedGenre);
            }
        } catch (err) {
            console.error("Failed to load recommendations", err);
        } finally {
            setLoading(false);
        }
    };

    // Initial Load
    useEffect(() => {
        fetchRecs();
    }, []);

    // Handle Dropdown Change
    const handleGenreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newGenre = e.target.value;
        setFilterGenre(newGenre); // Update dropdown UI immediately
        fetchRecs(newGenre);      // Fetch new data
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f8f8f8', paddingBottom: '4rem' }}>
            
            {/* HEADER */}
            <div style={{ background: '#f8f8f8', padding: '0 2rem', borderBottom: '2px solid #00cc66', position: 'sticky', top: 0, zIndex: 10 }}>
                <header style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0' }}>
                    <h1 style={{ margin: 0 }}>Find New Manga</h1>
                    <nav style={{ display: 'flex', gap: '3rem' }}>
                        <Link href="/manga-list" style={{ fontWeight: 600, fontSize: '1.2rem', color: '#cc0000', textDecoration: 'none' }}>
                            Manga List
                        </Link>
                        <Link href="/search" style={{ fontWeight: 600, fontSize: '1.2rem', color: '#cc0000', textDecoration: 'none' }}>
                            Add Manga
                        </Link>
                    </nav>
                </header>
            </div>

            {/* MAIN CONTENT */}
            <main style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem' }}>
                
                {/* SECTION 1: PERSONALIZED */}
                <div style={{ marginBottom: '4rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <h2 style={{ 
                            color: '#333', 
                            borderLeft: '5px solid #cc0000', 
                            paddingLeft: '1rem', 
                            margin: 0
                        }}>
                            Because you read...
                        </h2>
                        
                        {/* THE DROPDOWN FILTER */}
                        <select 
                            value={filterGenre} 
                            onChange={handleGenreChange}
                            style={{
                                padding: '0.5rem',
                                fontSize: '1.1rem',
                                borderRadius: '8px',
                                border: '2px solid #cc0000',
                                background: 'white',
                                color: '#cc0000',
                                fontWeight: 'bold',
                                cursor: 'pointer'
                            }}
                        >
                            {recs.availableGenres.length > 0 ? (
                                recs.availableGenres.map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))
                            ) : (
                                <option value={recs.selectedGenre}>{recs.selectedGenre}</option>
                            )}
                            <option value="Action">Action</option>
                            <option value="Romance">Romance</option>
                            <option value="Comedy">Comedy</option>
                        </select>
                    </div>
                    
                    {loading ? (
                         <p style={{color: '#cc0000', fontWeight: 'bold'}}>Finding best {filterGenre} manga for you...</p>
                    ) : recs.basedOnTaste.length === 0 ? (
                        <p>No recommendations found for this genre.</p>
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
                                <RecCard 
                                    key={m.kitsuId} 
                                    manga={m} 
                                    badgeText={`Top Rated ${recs.selectedGenre}`} 
                                    badgeColor="#cc0000" 
                                />
                            ))}
                        </ul>
                    )}
                </div>

                {/* SECTION 2: GLOBAL TRENDING */}
                <div>
                    <h2 style={{ color: '#333', borderLeft: '5px solid #00cc66', paddingLeft: '1rem', marginBottom: '1.5rem' }}>
                        Global Trending
                    </h2>
                    <ul style={{
                        listStyle: 'none', padding: 0, display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
                        rowGap: '3.5rem',
                        columnGap: '1.3rem',
                    }}>
                        {recs.trending.map(m => (
                            <RecCard key={m.kitsuId} manga={m} badgeText="Trending Now" badgeColor="#00cc66" />
                        ))}
                    </ul>
                </div>

            </main>
        </div>
    );
}