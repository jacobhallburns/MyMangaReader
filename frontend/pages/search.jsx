import { useEffect, useState } from 'react';
import Link from "next/link";

export default function MangaSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const [addedIds, setAddedIds] = useState(new Set()); // Tracks manga already added
    const [addedMangaMap, setAddedMangaMap] = useState(new Map()); // kitsuId -> db entry

    // modal
    const [editingManga, setEditingManga] = useState(null);
    const [tempRating, setTempRating] = useState(null);
    const [tempStatus, setTempStatus] = useState('Completed');
    const isNew = !!editingManga?.attributes;

    // pagination
    const pageSize = 10;
    const [offset, setOffset] = useState(0);
    const [moreManga, setMoreManga] = useState(true);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

    useEffect(() => {
    const fetchAddedManga = async () => {
        try {
        const res = await fetch(`${backendUrl}/api/manga`);
        const raw = await res.json().catch(() => null);

        const list =
            Array.isArray(raw) ? raw :
            Array.isArray(raw?.data) ? raw.data :
            Array.isArray(raw?.manga) ? raw.manga :
            Array.isArray(raw?.items) ? raw.items :
            [];

        setAddedIds(new Set(list.map((entry) => entry.kitsuId)));

        const map = new Map();
        list.forEach((entry) => map.set(entry.kitsuId, entry));
        setAddedMangaMap(map);
        } catch (err) {
        console.error('Failed to load existing manga.', err);
        setAddedIds(new Set());
        setAddedMangaMap(new Map());
        }
    };

    fetchAddedManga();
    }, [backendUrl]);


    const openAddModal = (manga) => {
        setEditingManga(manga);
        setTempRating(null);
        setTempStatus('Completed');
    };

    const searchKitsu = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
        const response = await fetch(
            `https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(query)}&page[limit]=${pageSize}&page[offset]=0`
        );
        const data = await response.json();

        setResults(data.data || []);
        setOffset(20);
        setMoreManga(true);
        } catch (err) {
        alert(`Error searching manga: ${err.message}`);
        } finally {
        setLoading(false);
        }
    };

    const loadMore = async () => {
        setLoading(true);
        try {
        const response = await fetch(
            `https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(query)}&page[limit]=${pageSize}&page[offset]=${offset}`
        );
        const data = await response.json();

        setResults((prev) => [...prev, ...(data.data || [])]);
        setOffset((prevOffset) => prevOffset + pageSize);

        if (!data.data || data.data.length < pageSize) setMoreManga(false);
        } catch (err) {
        alert(`Error loading manga: ${err.message}`);
        } finally {
        setLoading(false);
        }
    };

    const addOrUpdateManga = async () => {
        if (editingManga?.attributes) {
        const attributes = editingManga.attributes;

        const payload = {
            kitsuId: editingManga.id,
            title: attributes.titles?.en_jp || attributes.slug,
            coverImage: attributes.posterImage?.small || '',
            synopsis: attributes.synopsis || '',
            status: tempStatus,
            rating: tempRating,
        };

        try {
            const response = await fetch(`${backendUrl}/api/manga`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            });

            const savedManga = await response.json();

            setAddedIds((prev) => new Set(prev).add(editingManga.id));
            setAddedMangaMap((prevMap) => {
            const newMap = new Map(prevMap);
            newMap.set(savedManga.kitsuId, savedManga);
            return newMap;
            });
        } catch (err) {
            alert(`Error saving manga: ${err.message}`);
        } finally {
            setEditingManga(null);
            setTempRating(null);
            setTempStatus('Completed');
        }
        return;
        }

        try {
        await fetch(`${backendUrl}/api/manga/${editingManga._id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
            status: tempStatus,
            rating: tempRating,
            }),
        });

        setAddedMangaMap((prevMap) => {
            const newMap = new Map(prevMap);
            newMap.set(editingManga.kitsuId, {
            ...editingManga,
            status: tempStatus,
            rating: tempRating,
            });
            return newMap;
        });
        } catch (err) {
        alert(`Error updating manga: ${err.message}`);
        } finally {
        setEditingManga(null);
        setTempRating(null);
        setTempStatus('Completed');
        }
    };

    return (
        <div
        style={{
            display: 'flex',
            justifyContent: 'center',
            paddingLeft: '2rem',
            paddingRight: '2rem',
            minHeight: '100vh',
            background: '#f8f8f8',
        }} >
        <div
            style={{
            maxWidth: '1000px',
            width: '100%',
            borderLeft: '2px solid #00cc66',
            borderRight: '2px solid #00cc66',
            paddingLeft: '2rem',
            paddingRight: '2rem',
            minHeight: '100vh',
            }} >
            {/* HEADER */}
            <div
            style={{
                marginLeft: '-4rem',
                marginRight: '-4rem',
                paddingLeft: '4rem',
                paddingRight: '4rem',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                background: '#f8f8f8',
            }} >
            <header style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '1rem 0',
                borderBottom: '2px solid #00cc66',
                marginBottom: '1rem',
                }} >
                <h1 style={{ margin: 0 }}>Add Manga</h1>

                <nav style={{ display: 'flex', gap: '3rem' }}>
                <Link
                    href="/manga-list"
                    style={{
                    fontWeight: 600,
                    fontSize: '1.2rem',
                    }} >
                    Manga List
                </Link>

                <Link
                    href="/recommendation"
                    style={{
                    fontWeight: 600,
                    fontSize: '1.2rem',
                    }} >
                    Recommendation Page
                </Link>
                </nav>
            </header>

            {/* SEARCH BAR */}
            <form onSubmit={searchKitsu} style={{ paddingBottom: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input
                    type="text"
                    placeholder="Search Kitsu..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    style={{
                    flex: 1,
                    padding: '0.7rem 0.9rem',
                    borderRadius: '12px',
                    border: '2px solid #00cc66',
                    outline: 'none',
                    background: 'white',
                    color: '#ff6699',
                    }}
                />

                <button
                    type="submit"
                    style={{
                    padding: '0.7rem 1.1rem',
                    borderRadius: '12px',
                    border: '2px solid #00cc66',
                    background: '#cc0000',
                    color: 'white',
                    fontWeight: 700,
                    cursor: 'pointer',
                    }} >
                    Search
                </button>
                </div>
            </form>
            </div>

            {/* CONTENT */}
            {loading && <p style={{ color: '#00aa55', fontWeight: 600 }}>Searching...</p>}

            {results.length === 0 ? (<p style={{ marginTop: '1.5rem' }}>Search for a manga to add it to your list.</p> ) : ( <>
                <ul style={{
                    listStyle: 'none',
                    padding: 0,
                    margin: 0,
                    display: 'grid',
                    gap: '1.5rem',
                }} >
                {results.map((m) => {
                    const attributes = m.attributes;
                    const isAdded = addedIds.has(m.id);

                    return ( <li
                        key={m.id}
                        style={{
                        background: '#ffffff',
                        border: '2px solid #00cc66',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        boxShadow: '0 10px 28px rgba(0,0,0,0.08)',
                        }} >
                        <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#cc0000' }}>
                        {attributes.titles?.en_jp || attributes.slug}
                        </h2>

                        <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                        {attributes.posterImage?.small && (
                            <img
                            src={attributes.posterImage.small}
                            alt={attributes.titles?.en_jp || attributes.slug}
                            style={{
                                width: '180px',
                                height: '260px',
                                objectFit: 'cover',
                                borderRadius: '12px',
                                border: '2px solid #00cc66',
                                flexShrink: 0,
                            }} />
                        )}

                        <div style={{ textAlign: 'left', flex: 1 }}>
                            <p style={{
                                color: '#ff6699',
                                marginTop: 0,
                                marginBottom: '1rem',
                                lineHeight: 1.5,
                            }} >
                            {attributes.synopsis?.slice(0, 250)}
                            {attributes.synopsis?.length > 250 ? '...' : ''}
                            </p>

                            <button onClick={() => {
                                if (isAdded) {
                                    const existing = addedMangaMap.get(m.id);
                                    if (existing) {
                                        setEditingManga(existing);
                                        setTempRating(existing.rating ?? null);
                                        setTempStatus(existing.status || 'Completed');
                                    }
                                } else {
                                openAddModal(m);
                                }
                            }}
                            style={{
                                padding: '0.6rem 1.2rem',
                                borderRadius: '10px',
                                border: 'none',
                                background: isAdded ? '#00cc66' : '#cc0000',
                                color: 'white',
                                cursor: 'pointer',
                                fontWeight: 700,
                            }}
                            >
                            {isAdded ? 'Edit' : 'Add to My List'}
                            </button>
                        </div>
                        </div>
                    </li>
                    );
                })}
                </ul>

                {moreManga && (
                <button
                    onClick={loadMore}
                    disabled={loading}
                    style={{
                    marginTop: '1.5rem',
                    padding: '0.75rem 1.2rem',
                    borderRadius: '12px',
                    border: '2px solid #00cc66',
                    background: 'white',
                    color: '#cc0000',
                    fontWeight: 800,
                    cursor: 'pointer',
                    }} >
                    Load More Manga
                </button>
                )} </>
            )}

        {editingManga && ( <div onClick={() => setEditingManga(null)} style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.65)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            padding: '2rem',
        }} > 
        <div onClick={(e) => e.stopPropagation()}
            style={{
                width: '100%',
                maxWidth: '760px',
                background: '#ffffff',
                borderRadius: '18px',
                border: '2px solid #00cc66',
                boxShadow: '0 18px 60px rgba(0,0,0,0.25)',
                overflow: 'hidden',
            }} >
        {/* Top bar */}
        <div
            style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.25rem',
            background: '#f8f8f8',
            borderBottom: '2px solid #00cc66',
            }}
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <h2 style={{ margin: 0, color: '#cc0000', fontSize: '1.35rem', lineHeight: 1.2 }}>
                {editingManga.attributes
                ? (editingManga.attributes.titles?.en_jp || editingManga.attributes.slug)
                : editingManga.title}
            </h2>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span
                style={{
                    padding: '0.35rem 0.7rem',
                    borderRadius: '999px',
                    border: '2px solid #00cc66',
                    color: '#00aa55',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                }}
                >
                Status: {tempStatus || 'N/A'}
                </span>

                <span
                style={{
                    padding: '0.35rem 0.7rem',
                    borderRadius: '999px',
                    border: '2px solid #00cc66',
                    color: '#00aa55',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                }}
                >
                Rating:{' '}
                {tempRating != null ? (
                    <>
                    {tempRating} <span style={{ color: '#ffcc00', fontSize: '1.2em' }}>★</span>
                    </>
                ) : (
                    'N/A'
                )}
                </span>
            </div>
            </div>

            <button
            onClick={() => setEditingManga(null)}
            style={{
                border: '2px solid #00cc66',
                background: 'white',
                borderRadius: '12px',
                padding: '0.2rem 0.4rem',
                cursor: 'pointer',
                color: '#cc0000',
                fontSize: '1.6rem',
                fontWeight: 900,
                lineHeight: 0.9,
            }}
            >
            ✕
            </button>
        </div>

        {/* Body */}
        <div
            style={{
            display: 'grid',
            gridTemplateColumns: '220px 1fr',
            gap: '1.25rem',
            padding: '1.25rem',
            }}
        >
            {/* Cover */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
            {(
                editingManga.attributes
                ? editingManga.attributes.posterImage?.small
                : editingManga.coverImage
            ) ? (
                <img
                src={
                    editingManga.attributes
                    ? editingManga.attributes.posterImage?.small
                    : editingManga.coverImage
                }
                alt="cover"
                style={{
                    width: '200px',
                    height: '300px',
                    objectFit: 'cover',
                    borderRadius: '14px',
                    border: '2px solid #00cc66',
                }}
                />
            ) : (
                <div
                style={{
                    width: '200px',
                    height: '300px',
                    borderRadius: '14px',
                    border: '2px dashed #00cc66',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#00aa55',
                    fontWeight: 800,
                }}
                >
                No Cover
                </div>
            )}
            </div>

            {/* Info */}
            <div style={{ minWidth: 0 }}>
            <p
                style={{
                marginTop: 0,
                color: '#ff6699',
                lineHeight: 1.55,
                marginBottom: '1rem',
                maxHeight: '180px',
                overflow: 'auto',
                paddingRight: '0.25rem',
                }}
            >
                {(() => {
                const syn = editingManga.attributes?.synopsis || editingManga.synopsis || '';
                return syn.trim() ? syn : 'No synopsis available.';
                })()}
            </p>

            <div
                style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '0.9rem',
                alignItems: 'center',
                marginBottom: '1.25rem',
                }}
            >
                <div>
                <label style={{ display: 'block', fontWeight: 900, marginBottom: '0.35rem' }}>
                    Status
                </label>
                <select
                    value={tempStatus}
                    onChange={(e) => setTempStatus(e.target.value)}
                    style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '12px',
                    border: '2px solid #00cc66',
                    background: 'white',
                    color: '#ff6699',
                    fontWeight: 700,
                    outline: 'none',
                    }}
                >
                    <option value="Completed">Completed</option>
                    <option value="Reading">Reading</option>
                    <option value="Plan-to-read">Plan to Read</option>
                </select>
                </div>

                <div>
                <label style={{ display: 'block', fontWeight: 900, marginBottom: '0.35rem' }}>
                    Rating (1–10)
                </label>
                <select
                    value={tempRating == null ? 'null' : String(tempRating)}
                    onChange={(e) => {
                    const v = e.target.value;
                    setTempRating(v === 'null' ? null : Number(v));
                    }}
                    style={{
                    width: '100%',
                    padding: '0.7rem 0.85rem',
                    borderRadius: '12px',
                    border: '2px solid #00cc66',
                    background: 'white',
                    color: '#ff6699',
                    fontWeight: 700,
                    outline: 'none',
                    }}
                >
                    <option value="null">N/A</option>
                    <option value="10">10 – Masterpiece</option>
                    <option value="9">9 - Amazing</option>
                    <option value="8">8 - Great</option>
                    <option value="7">7 – Good</option>
                    <option value="6">6 - Fine</option>
                    <option value="5">5 – Average</option>
                    <option value="4">4 - Poor</option>
                    <option value="3">3 – Bad</option>
                    <option value="2">2 - Really Bad</option>
                    <option value="1">1 – Awful</option>
                </select>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={addOrUpdateManga}
                style={{
                    padding: '0.65rem 1.1rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: isNew ? '#cc0000' : '#00cc66', 
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 900,
                }} >
                {isNew ? '+ Add to My List' : 'Save'}
                </button>


                {!editingManga.attributes && (
                <button
                    onClick={async () => {
                    try {
                        await fetch(`${backendUrl}/api/manga/${editingManga._id}`, { method: 'DELETE' });

                        setAddedIds((prev) => {
                        const s = new Set(prev);
                        s.delete(editingManga.kitsuId);
                        return s;
                        });

                        setAddedMangaMap((prev) => {
                        const m = new Map(prev);
                        m.delete(editingManga.kitsuId);
                        return m;
                        });
                    } catch (err) {
                        alert(`Error deleting manga: ${err.message}`);
                    } finally {
                        setEditingManga(null);
                        setTempRating(null);
                        setTempStatus('Completed');
                    }
                    }}
                    style={{
                    padding: '0.65rem 1.1rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: '#cc0000',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 900,
                    }}
                >
                    Remove from My List
                </button>
                )}
            </div>
            </div>
        </div>
        </div>
    </div>
)}
</div>
</div>
);
}
