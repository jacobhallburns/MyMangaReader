import { useState } from 'react';
import { useEffect } from 'react';

export default function MangaSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [addedIds, setAddedIds] = useState(new Set()); // Tracks manga already added
    // for modal when adding manga
    const [editingManga, setEditingManga] = useState(null);
    const [tempRating, setTempRating] = useState('');
    const [tempStatus, setTempStatus] = useState('Completed');

    useEffect(() => {
        const fetchAddedManga = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/manga`);
                const data = await res.json();

                // Gets ids from kitsu and saves it in this set
                const ids = new Set(data.map(entry => entry.kitsuId));
                setAddedIds(ids)
            } catch (err) {
                console.error(`Failed to load existing mnanga.`, err);
            }
        };
        fetchAddedManga();
    }, []);


    // Searches Kitsu api with user query
    const searchKitsu = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        const response = await fetch(`https://kitsu.io/api/edge/manga?filter[text]=${encodeURIComponent(query)}`);
        const data = await response.json();
        setResults(data.data);
        setLoading(false);
    };

    // Opens modals to Add selected manga to db
    const openAddModal = (manga) => {
        // Stores selected manga and resets rating/status
        setEditingManga(manga);
        setTempRating(null);
        setTempStatus('Completed');
    };

    // Adds chosen manga to db
    const addManga = async () => {
        const attributes = editingManga.attributes;
        const payload = {
            kitsuId: editingManga.id,
            title: attributes.titles.en_jp || attributes.slug,
            coverImage: attributes.posterImage?.small || '',
            status: tempStatus,
            rating: tempRating
        };

        try {
            // Sends request to backend to add new manga
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/manga`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const savedManga = await response.json();
            setAddedIds(prev => new Set(prev).add(editingManga.id));
        } catch (err) {
            alert(`Error saving manga: ${err.message}`);
        }
        // resets variables
        setEditingManga(null);
        setTempRating(null);
        setTempStatus('Completed');
    };

    // Renders UI
    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', 
            alignItems: 'flex-start', minHeight: '1000vh', background: '#f8f8f8'
        }}>
            <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center',
                borderLeft: '2px solid #00cc66', borderRight: '2px solid #00cc66',
                paddingLeft: '6rem', paddingRight: '6rem', minHeight: '100vh'
             }}>
            <h3><a href="/manga-list" style={{ display: 'inline-block', marginBottom: '1rem'}}>
                Return to My Manga List</a>
            </h3>

            <h1>Search Manga (Kitsu API)</h1>

            <form onSubmit={searchKitsu} style={{ marginBottom: '1rem' }}>
                <input
                    type="text"
                    placeholder="Enter manga title..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button 
                type="submit"
                style={{
                    border: '1px solid #00cc66'
                }}>
                Search</button>
            </form>

            {loading && <p>Searching...</p>}

            {results.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {results.map((manga) => {
                        const attributes = manga.attributes;
                        const isAdded = addedIds.has(manga.id);
                    return (
                        <li
                            key={manga.id}
                            style={{
                                marginBottom: '2rem',
                                borderBottom: '1px solid #00cc66',
                                paddingBottom: '1rem'
                            }}
                        >
                            <h2>{attributes.titles.en_jp || attributes.slug}</h2>
                            {attributes.posterImage?.small && (
                                <img
                                    src={attributes.posterImage.small}
                                    alt={attributes.titles.en_jp}
                                    style={{ maxWidth: '150px' }}
                                />
                            )}
                            <p style = {{ color: '#ff6699'}}>
                                {attributes.synopsis?.slice(0, 250)}
                                {attributes.synopsis?.length > 250 ? '...' : ''}
                            </p>
                            <button onClick={() => openAddModal(manga)}
                                disabled={isAdded}
                                style={{ backgroundColor: isAdded ? '#00cc66' : undefined}}
                            >
                                {isAdded ? 'Already Added' : 'Add to My List'}
                                </button>
                        </li>
                    );
                })}
            </ul>
        )}
        {editingManga && (
            <div style={{
                position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                zIndex: 9999
            }}>
                <div style={{ background: 'white', padding: '2rem', color: '#cc0000', textAlign: 'left', border: '2px solid #00cc66'}}>
                    <h2>{editingManga.attributes.titles.en_jp}</h2>

                    <label>Status: </label>
                    <select value={tempStatus} onChange={(e) => setTempStatus(e.target.value)}>
                        <option value="Completed">Completed</option>
                        <option value="Reading">Reading</option>
                        <option value="Plan-to-read">Plan to Read</option>
                    </select>

                    <br /><br />

                    <label>Rating (1–10): </label>
                    <select value = {tempRating} onChange={(e) => setTempRating(Number(e.target.value))}>
                        <option value={null}>N/A</option>
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

                    <br /><br />

                    <button onClick={addManga}>
                        Save
                    </button>

                    <button onClick={() => setEditingManga(null)} style={{ marginLeft: '1rem' }}>Cancel</button>
                </div>
            </div>
        )}
        </div>
        </div>
    );
}
