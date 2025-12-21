import { useEffect, useState } from 'react';
import Link from "next/link";

// Gets user saved manga list from backend
export default function MangaList() {
    const [manga, setManga] = useState([]);
    const [loading, setLoading] = useState(true);
    // for modal when editing manga
    const [editingManga, setEditingManga] = useState(null);
    const [tempStatus, setTempStatus] = useState('Completed');
    const [tempRating, setTempRating] = useState(null);

    useEffect(() => {
    let cancelled = false;

    const fetchManga = async () => {
        try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/manga`);

        // If DB isn't ready yet, keep loading and retry
        if (res.status === 503) {
            if (!cancelled) {
            setTimeout(fetchManga, 300);
            }
            return;
        }
        const data = await res.json().catch(() => null);

        if (!res.ok) {
            console.error("Backend error:", data);
            if (!cancelled) setManga([]);
            return;
        }

        if (!cancelled) setManga(Array.isArray(data) ? data : []);
        } catch (err) {
        console.error("Fetch failed:", err);
        // Backend not reachable yet -> keep loading and retry
        if (!cancelled) {
            setTimeout(fetchManga, 500);
        }
        return;
        }
        if (!cancelled) setLoading(false);
    };
    fetchManga();
    return () => {
        cancelled = true;
    };
    }, []);


    // Shows loading message while its loading
    if (loading) return <p>Loading...</p>;

    // Shows manga list
    return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem', 
            alignItems: 'flex-start', minHeight: '100vh', background: '#f8f8f8'
        }}>
            <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center',
                borderLeft: '2px solid #00cc66', borderRight: '2px solid #00cc66',
                paddingLeft: '6rem', paddingRight: '6rem', minHeight: '100vh'
             }}>
            <header
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '1rem 0',
                borderBottom: '2px solid #00cc66',
                marginBottom: '1.25rem',
            }}
            >
            <h1 style={{ margin: 0 }}>My Manga List</h1>

            <nav style={{ display: 'flex', gap: '2rem' }}>
                <Link href="/recommendation">Recommendation Page</Link>
                <Link href="/search">Add Manga</Link>
            </nav>
            </header>
            {manga.length === 0 ? <p>No manga found. Go to the search page to add some!</p> : (
                <ul style={{ listStyle: 'none', padding: 0 }}>
                    {manga.map((entry) => (
                        <li key={entry._id} style={{ marginBottom: '1rem', borderBottom: '1px solid #00cc66', paddingBottom: '1rem' }}>
                            <h2>{entry.title}</h2>
                            <div style={{
                                display: 'flex',
                                gap: '1rem',
                                alignItems: 'center'
                            }}>

                            {entry.coverImage && <img src={entry.coverImage} alt={entry.title} style={{ maxWidth: '200px' }} />}


                            <div style={{textAlign: 'left', flex: 1}}>
                                <p style={{color: '#ff6699', maxWidth: '400px'}}>{entry.synopsis?.slice(0, 250)}
                                        {entry.synopsis?.length > 250 ? '...' : ''}</p>
                                <p>Status: {entry.status}</p>
                                <p>Rating: {entry.rating ?? 'N/A'}</p>
                                <button onClick={() => {
                                    setEditingManga(entry);
                                    setTempStatus(entry.status || 'Completed');
                                    setTempRating(entry.rating ?? 'null');
                                }}>Edit</button>
                            </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            {editingManga && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex',
                    justifyContent: 'center', alignItems: 'center', zIndex: 9999
                }}>
                    <div style={{
                        background: 'white', padding: '2rem', color: '#cc0000',
                        textAlign: 'left', border: '2px solid #00cc66'
                    }}>
                    <h2>{editingManga.title}</h2>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1rem'}}>
                    <img
                        src={editingManga.coverImage}
                        alt={editingManga.title}
                        style={{ maxWidth: '200px', flexShrink: 0 }}
                    />

                    <p style={{ color: '#ff6699', maxWidth: '400px', marginTop: 0 }}>
                        {editingManga.synopsis && editingManga.synopsis.trim()
                            ? editingManga.synopsis.slice(0, 1000) + (editingManga.synopsis.length > 1000 ? '...' : '')
                            : 'No synopsis available.'}
                    </p>
                    </div>

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

                    <button onClick={async () => {
                        try {
                        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/manga/${editingManga._id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ rating: tempRating === 'null' ? null : tempRating, status: tempStatus })
                        });
                        const updated = manga.map((m) => m._id === editingManga._id
                            ? { ...m, status: tempStatus, rating: tempRating === 'null' ? null : tempRating }
                            : m);
                        setManga(updated);
                        } catch (err) {
                        alert(`Failed to update manga: ${err.message}`);
                        } finally {
                        setEditingManga(null);
                        }
                    }}>Save</button>

                    <button onClick={() => setEditingManga(null)} style={{ marginLeft: '1rem' }}>
                        Cancel
                    </button>

                    <button onClick={async () => {
                        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/manga/${editingManga._id}`, {
                        method: 'DELETE'
                        });
                        setManga(manga.filter(m => m._id !== editingManga._id));
                        setEditingManga(null);
                    }} style={{ marginLeft: '1rem'}}>
                        Remove from My List
                    </button>
                </div>
            </div>
)}

         </div>
         </div>
    );
}
