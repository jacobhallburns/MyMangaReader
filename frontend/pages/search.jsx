import { useState } from 'react';
import { useEffect } from 'react';

export default function MangaSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(null); // Tracks manga being added
    const [addedIds, setAddedIds] = useState(new Set()); // Tracks manga already added


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

    // Adds selected manga to db
    const addToMyList = async (manga) => {
        setAdding(manga.id); // Sets "adding" state to disable button while adding
        const attributes = manga.attributes;

        // Formats data to save to backend
        const payload = {
            kitsuId: manga.id,
            title: attributes.titles.en_jp || attributes.slug,
            coverImage: attributes.posterImage?.small || '',
            status: 'Completed',    // Default status for new entry
            rating: null            // No rating by default
        };

        // Sends post request to backend for new manga entry
        try { 
            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/manga`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
        });

        setAddedIds(prev => new Set(prev).add(manga.id));
        } catch (error) {
            alert(`Error: ${err.message}`);
        } finally {
            setAdding(null); // Resets adding state
        }
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
                            <button
                                onClick={() => addToMyList(manga)}
                                disabled={adding === manga.id || isAdded}
                                style = {{
                                    backgroundColor: isAdded ? '#00cc66' : undefined
                                }}
                            >
                                {isAdded
                                    ? 'Already Added'
                                    : adding === manga.id
                                    ? 'Adding...'
                                    : 'Add to My List'}
                            </button>
                        </li>
                    );
                })}
            </ul>
        )}
        </div>
        </div>
    );
}
