import { useEffect, useState } from 'react';

export default function MangaSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [addedIds, setAddedIds] = useState(new Set()); 
    const [addedMangaMap, setAddedMangaMap] = useState(new Map()); 

    const [editingManga, setEditingManga] = useState(null);
    const [tempRating, setTempRating] = useState(null);
    const [tempStatus, setTempStatus] = useState('Completed');
    const isNew = !!editingManga?.attributes;

    const pageSize = 10;
    const [offset, setOffset] = useState(0);
    const [moreManga, setMoreManga] = useState(true);

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
            const response = await fetch(`https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(query)}&page[limit]=${pageSize}&page[offset]=0`);
            const data = await response.json();
            setResults(data.data || []);
            setOffset(pageSize);
            setMoreManga(true);
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const loadMore = async () => {
        setLoading(true);
        try {
            const response = await fetch(`https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(query)}&page[limit]=${pageSize}&page[offset]=${offset}`);
            const data = await response.json();
            setResults((prev) => [...prev, ...(data.data || [])]);
            setOffset((prevOffset) => prevOffset + pageSize);
            if (!data.data || data.data.length < pageSize) setMoreManga(false);
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const addOrUpdateManga = async () => {
        if (isNew) {
            const attributes = editingManga.attributes;
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
                alert(`Error: ${err.message}`);
            }
        } else {
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
                alert(`Error: ${err.message}`);
            }
        }
        setEditingManga(null);
    };

    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '0 1rem', minHeight: '100vh', background: 'var(--bg-color)' }}>
            <div style={{ maxWidth: '1000px', width: '100%', borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)', padding: '0 1rem' }}>
                <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-color)', padding: '1rem 0' }}>
                    <form onSubmit={searchKitsu}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <input
                                type="text"
                                placeholder="Search Kitsu..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                style={{ flex: 1, padding: '0.7rem', borderRadius: '12px', border: '2px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)' }}
                            />
                            <button type="submit" style={{ padding: '0.7rem 1.1rem', borderRadius: '12px', background: 'var(--text-main)', color: 'var(--bg-color)', fontWeight: 700 }}>Search</button>
                        </div>
                    </form>
                </div>

                {loading && <p style={{ color: 'var(--accent-green)', fontWeight: 600 }}>Searching...</p>}

                <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '1.5rem' }}>
                    {results.map((m) => {
                        const isAdded = addedIds.has(m.id);
                        return (
                            <li key={m.id} style={{ background: 'var(--card-bg)', border: '2px solid var(--border-color)', borderRadius: '16px', padding: '1.5rem' }}>
                                <h2 style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>{m.attributes.titles?.en_jp || m.attributes.slug}</h2>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.25rem' }}>
                                    {m.attributes.posterImage?.small && <img src={m.attributes.posterImage.small} style={{ width: '150px', borderRadius: '12px', border: '1px solid var(--border-color)' }} alt="cover" />}
                                    <div style={{ flex: 1, minWidth: '250px' }}>
                                        <p style={{ color: 'var(--text-muted)' }}>{m.attributes.synopsis?.slice(0, 250)}...</p>
                                        <button 
                                            onClick={() => isAdded ? setEditingManga(addedMangaMap.get(m.id)) : openAddModal(m)}
                                            style={{ marginTop: '1rem', padding: '0.6rem 1.2rem', borderRadius: '10px', background: isAdded ? 'var(--accent-green)' : 'var(--text-main)', color: 'white', fontWeight: 700 }}
                                        >
                                            {isAdded ? 'Edit' : '+ Add to My List'}
                                        </button>
                                    </div>
                                </div>
                            </li>
                        );
                    })}
                </ul>

                {moreManga && results.length > 0 && (
                    <button onClick={loadMore} style={{ width: '100%', margin: '1.5rem 0', padding: '0.75rem', borderRadius: '12px', background: 'var(--card-bg)', border: '2px solid var(--border-color)', color: 'var(--text-main)', fontWeight: 800 }}>Load More</button>
                )}

                {editingManga && (
                    <div onClick={() => setEditingManga(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999 }}>
                        <div onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '500px', background: 'var(--card-bg)', borderRadius: '18px', border: '2px solid var(--border-color)', padding: '1.5rem' }}>
                            <h2 style={{ color: 'var(--text-main)' }}>{isNew ? 'Add' : 'Edit'} {editingManga.attributes?.titles?.en_jp || editingManga.title}</h2>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', margin: '1rem 0' }}>
                                <select value={tempStatus} onChange={(e) => setTempStatus(e.target.value)} style={{ padding: '0.7rem', borderRadius: '12px', border: '1.5px solid var(--border-color)', background: 'var(--bg-color)', color: 'white' }}>
                                    <option value="Completed">Completed</option>
                                    <option value="Reading">Reading</option>
                                    <option value="Plan-to-read">Plan to Read</option>
                                </select>
                                <select value={tempRating == null ? 'null' : String(tempRating)} onChange={(e) => setTempRating(e.target.value === 'null' ? null : Number(e.target.value))} style={{ padding: '0.7rem', borderRadius: '12px', border: '1.5px solid var(--border-color)', background: 'var(--bg-color)', color: 'white' }}>
                                    <option value="null">N/A</option>
                                    {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                </select>
                            </div>
                            <button onClick={addOrUpdateManga} style={{ width: '100%', padding: '0.7rem', background: 'var(--accent-green)', color: 'white', borderRadius: '12px', fontWeight: 900 }}>
                                {isNew ? '+ Add to List' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}