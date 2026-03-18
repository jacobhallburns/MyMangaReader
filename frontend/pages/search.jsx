import { useEffect, useState } from 'react';
import Link from "next/link";

export default function MangaSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);

    const [addedIds, setAddedIds] = useState(new Set()); 
    const [addedMangaMap, setAddedMangaMap] = useState(new Map()); 

    // modal state
    const [editingManga, setEditingManga] = useState(null);
    const [tempRating, setTempRating] = useState(null);
    const [tempStatus, setTempStatus] = useState('Completed');
    const isNew = !!editingManga?.attributes;

    // pagination
    const pageSize = 10;
    const [offset, setOffset] = useState(0);
    const [moreManga, setMoreManga] = useState(true);

    // Load existing collection to show "Edit" vs "Add" buttons
    useEffect(() => {
        const fetchAddedManga = async () => {
            try {
                const res = await fetch('/api/manga/collection');
                const list = await res.json().catch(() => []);

                const dataList = Array.isArray(list) ? list : [];
                setAddedIds(new Set(dataList.map((entry) => entry.kitsuId)));

                const map = new Map();
                dataList.forEach((entry) => map.set(entry.kitsuId, entry));
                setAddedMangaMap(map);
            } catch (err) {
                console.error('Failed to load existing manga.', err);
            }
        };
        fetchAddedManga();
    }, []);

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
            setOffset(pageSize);
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
        // CASE 1: Adding a brand new manga from Kitsu search
        if (isNew) {
            const attributes = editingManga.attributes;
            
            // Fetch categories for personalized recommendations later
            const genreResponse = await fetch(`https://kitsu.io/api/edge/manga/${editingManga.id}/categories`);
            const genreData = await genreResponse.json();
            const genres = genreData.data.map(g => g.attributes.title);

            const payload = {
                kitsuId: editingManga.id,
                title: attributes.titles?.en_jp || attributes.slug,
                coverImage: attributes.posterImage?.small || '',
                synopsis: attributes.synopsis || '',
                status: tempStatus,
                rating: tempRating,
                genres: genres
            };

            try {
                const response = await fetch('/api/manga/collection', {
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
            }
        } 
        // CASE 2: Updating a manga already in your DB
        else {
            try {
                await fetch(`/api/manga/${editingManga._id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: tempStatus, rating: tempRating }),
                });

                setAddedMangaMap((prevMap) => {
                    const newMap = new Map(prevMap);
                    newMap.set(editingManga.kitsuId, { ...editingManga, status: tempStatus, rating: tempRating });
                    return newMap;
                });
            } catch (err) {
                alert(`Error updating manga: ${err.message}`);
            }
        }
        setEditingManga(null);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 2rem', minHeight: '100vh', background: '#f8f8f8' }}>
            <div style={{ maxWidth: '1000px', width: '100%', borderLeft: '2px solid #00cc66', borderRight: '2px solid #00cc66', padding: '0 2rem', minHeight: '100vh' }}>
                <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8f8f8', padding: '1rem 0' }}>
                    <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #00cc66', marginBottom: '1rem' }}>
                        <h1 style={{ margin: 0 }}>Add Manga</h1>
                        <nav style={{ display: 'flex', gap: '3rem' }}>
                            <Link href="/manga-list" style={{ fontWeight: 600, fontSize: '1.2rem' }}>Manga List</Link>
                            <Link href="/recommendation" style={{ fontWeight: 600, fontSize: '1.2rem' }}>Recommendations</Link>
                        </nav>
                    </header>

                    <form onSubmit={searchKitsu} style={{ paddingBottom: '1rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Search Kitsu..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                style={{ flex: 1, padding: '0.7rem', borderRadius: '12px', border: '2px solid #00cc66' }}
                            />
                            <button type="submit" style={{ padding: '0.7rem 1.1rem', borderRadius: '12px', background: '#cc0000', color: 'white', fontWeight: 700 }}>Search</button>
                        </div>
                    </form>
                </div>

                {loading && <p style={{ color: '#00aa55', fontWeight: 600 }}>Searching...</p>}

                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1.5rem' }}>
                    {results.map((m) => {
                        const isAdded = addedIds.has(m.id);
                        return (
                            <li key={m.id} style={{ background: '#fff', border: '2px solid #00cc66', borderRadius: '16px', padding: '1.5rem' }}>
                                <h2 style={{ color: '#cc0000', marginBottom: '1rem' }}>{m.attributes.titles?.en_jp || m.attributes.slug}</h2>
                                <div style={{ display: 'flex', gap: '1.25rem' }}>
                                    {m.attributes.posterImage?.small && <img src={m.attributes.posterImage.small} style={{ width: '150px', borderRadius: '12px', border: '2px solid #00cc66' }} alt="cover" />}
                                    <div style={{ flex: 1 }}>
                                        <p style={{ color: '#ff6699' }}>{m.attributes.synopsis?.slice(0, 250)}...</p>
                                        <button 
                                            onClick={() => isAdded ? setEditingManga(addedMangaMap.get(m.id)) : openAddModal(m)}
                                            style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', background: isAdded ? '#00cc66' : '#cc0000', color: 'white', fontWeight: 700 }}
                                        >
                                            {isAdded ? 'Edit' : 'Add to My List'}
                                        </button>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>

                {moreManga && results.length > 0 && (
                    <button onClick={loadMore} style={{ margin: '1.5rem 0', padding: '0.75rem', borderRadius: '12px', background: 'white', border: '2px solid #00cc66', color: '#cc0000', fontWeight: 800 }}>Load More</button>
                )}

                {editingManga && (
                    <div onClick={() => setEditingManga(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                        <div onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '760px', background: '#fff', borderRadius: '18px', border: '2px solid #00cc66', padding: '1.5rem' }}>
                            <h2 style={{ color: '#cc0000' }}>{isNew ? 'Add' : 'Edit'} {editingManga.attributes?.titles?.en_jp || editingManga.title}</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', margin: '1rem 0' }}>
                                <select value={tempStatus} onChange={(e) => setTempStatus(e.target.value)} style={{ padding: '0.7rem', borderRadius: '12px', border: '2px solid #00cc66' }}>
                                    <option value="Completed">Completed</option>
                                    <option value="Reading">Reading</option>
                                    <option value="Plan-to-read">Plan to Read</option>
                                </select>
                                <select value={tempRating == null ? 'null' : String(tempRating)} onChange={(e) => setTempRating(e.target.value === 'null' ? null : Number(e.target.value))} style={{ padding: '0.7rem', borderRadius: '12px', border: '2px solid #00cc66' }}>
                                    <option value="null">N/A</option>
                                    {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                </select>
                            </div>
                            <button onClick={addOrUpdateManga} style={{ width: '100%', padding: '0.7rem', background: '#00cc66', color: 'white', borderRadius: '12px', fontWeight: 900 }}>
                                {isNew ? '+ Add to List' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}