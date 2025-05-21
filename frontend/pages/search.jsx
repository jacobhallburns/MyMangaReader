import { useState } from 'react';

export default function MangaSearch() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [adding, setAdding] = useState(null); // Tracks manga being added

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
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/manga`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        setAdding(null);    // Resets adding state
        alert(`${payload.title} added to your list.`);
    };

    // Renders UI
    return (
        <div style={{ padding: '1rem' }}>
            <h1>Search Manga (Kitsu API)</h1>

            <form onSubmit={searchKitsu} style={{ marginBottom: '1rem' }}>
                <input
                    type="text"
                    placeholder="Enter manga title..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />
                <button type="submit">Search</button>
            </form>

            {loading && <p>Searching...</p>}

            {results.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {results.map((manga) => {
                        const attributes = manga.attributes;
                        return (
                            <li key={manga.id} style={{ marginBottom: '2rem', borderBottom: '1px solid #ccc', paddingBottom: '1rem' }}>
                                <h2>{attributes.titles.en_jp || attributes.slug}</h2>
                                {attributes.posterImage?.small && (
                                    <img src={attributes.posterImage.small} alt={attributes.titles.en_jp} style={{ maxWidth: '150px' }} />
                                )}
                                <p>{attributes.synopsis?.slice(0, 200)}{attributes.synopsis?.length > 200 ? '...' : ''}</p>
                                <button onClick={() => addToMyList(manga)} disabled={adding === manga.id}>
                                    {adding === manga.id ? 'Adding...' : 'Add to My List'}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
