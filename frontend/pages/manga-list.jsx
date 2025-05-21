import { useEffect, useState } from 'react';

// Gets user saved manga list from backend
export default function MangaList() {
    const [manga, setManga] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch manga from backend api
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/manga`)
            .then(res => res.json())    // Parse responce as json
            .then(data => {
                setManga(data);
                setLoading(false);      // Stop showing loading message
        })
        .catch(err => {
            console.error("Error fetching manga:", err);
            setLoading(false);          // Stops loading message 
        });
    }, []);                             // Empty array means this only runs on page load

    // Function deletes manga entry by ID
    const deleteManga = async (id) => {
        // Sends delete request to backend
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/manga/${id}`, {
            method: 'DELETE',
        });
        // Update local state
        setManga(manga.filter(entry => entry._id !== id));
    };

    // Shows loading message while its loading
    if (loading) return <p>Loading...</p>;

    // Shows manga list
    return (
        <div style={{ padding: '1rem' }}>
            <h1>My Manga List</h1>
            <h3><a href="/search" style={{ display: 'inline-block', marginBottom: '1rem' }}>Add manga from Kitsu search</a></h3>
            {manga.length === 0 ? <p>No manga found. Go to the search page to add some!</p> : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {manga.map((entry) => (
                        <li key={entry._id} style={{ marginBottom: '1rem', borderBottom: '1px solid #ccc', paddingBottom: '1rem' }}>
                            <h2>{entry.title}</h2>
                            {entry.coverImage && <img src={entry.coverImage} alt={entry.title} style={{ maxWidth: '200px' }} />}
                            <p>Status: {entry.status}</p>
                            <p>Rating: {entry.rating ?? 'N/A'}</p>
                            <button onClick={() => deleteManga(entry._id)}>Delete</button>
                        </li>
                    ))}
                </ul>
            )}
         </div>
    );
}
