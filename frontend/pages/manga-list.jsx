import {useEffect, useMemo, useState } from 'react';
import Link from "next/link";

// Gets user saved manga list from backend
export default function MangaList() {
    const [manga, setManga] = useState([]);
    const [loading, setLoading] = useState(true);

    // search / filter / sort
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState('Updated'); // Updated | TitleAZ | TitleZA | RatingHigh | RatingLow


    // for modal when editing manga
    const [editingManga, setEditingManga] = useState(null);
    const [tempStatus, setTempStatus] = useState('Completed');
    const [tempRating, setTempRating] = useState(null);

    useEffect(() => {
        let cancelled = false;

    const fetchManga = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/manga`);

        // DB not ready yet → keep loading and retry
        if (res.status === 503) {
            if (!cancelled) setTimeout(fetchManga, 300);
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
        if (!cancelled) setTimeout(fetchManga, 500);
        return;
    }

        if (!cancelled) setLoading(false);
    };

    fetchManga();
    return () => (cancelled = true);
}, []);

// Build a filtered + sorted view (doesn't change original array)
    const visibleManga = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
    let list = manga.filter((m) => {
        const statusOk = statusFilter === 'All' || (m.status || '').toLowerCase() === statusFilter.toLowerCase();
        if (!q) return statusOk;
            const title = (m.title || '').toLowerCase();
        const synopsis = (m.synopsis || '').toLowerCase();
        const textOk = title.includes(q) || synopsis.includes(q);
        return statusOk && textOk;
    });

    // sorting
    if (sortBy === 'TitleAZ') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    } else if (sortBy === 'TitleZA') {
      list.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
    } else if (sortBy === 'RatingHigh') {
      list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
    } else if (sortBy === 'RatingLow') {
      list.sort((a, b) => (a.rating ?? 999) - (b.rating ?? 999));
    }
    // "Updated" keeps original order

    return list;
  }, [manga, searchTerm, statusFilter, sortBy]);

    if (loading) return <p>Loading...</p>;

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            paddingLeft: '2rem',
            paddingRight: '2rem',
            minHeight: '100vh',
            background: '#f8f8f8',
        }}>
        <div style={{
            maxWidth: '1000px',
            width: '100%',
            borderLeft: '2px solid #00cc66',
            borderRight: '2px solid #00cc66',
            paddingLeft: '2rem',
            paddingRight: '2rem',
            minHeight: '100vh',
        }}>

        {/* HEADER */}
        <div style = {{
            marginLeft: '-4rem',
            marginRight: '-4rem',
            paddingLeft: '4rem',
            paddingRight: '4rem',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            background: '#f8f8f8',
        }}>

        <header style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem 0',
            borderBottom: '2px solid #00cc66',
            marginBottom: '1.5rem',            
        }}>
        <h1 style={{ margin: 0 }}>My Manga List</h1>

        <nav style={{ display: 'flex', gap: '3rem' }}>
        <Link
        href="/recommendation"
        style={{
        fontWeight: 600,
        fontSize: '1.2rem',
        }}
    >Recommendation Page</Link>

    <Link
        href="/search"
        style={{
        fontWeight: 600,
        fontSize: '1.2rem',
        }}
    >Add Manga</Link></nav>
    </header> 
    
    {/* SEARCH + FILTER BAR */}
        <div style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        paddingBottom: '1rem',
        }}> <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search List..."
            style={{
            flex: 1,
            padding: '0.7rem 0.9rem',
            borderRadius: '12px',
            border: '2px solid #00cc66',
            outline: 'none',
            background: 'white',
            color: '#ff6699'
            }} className = "search-input"
        />

        <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
            padding: '0.7rem 0.9rem',
            borderRadius: '12px',
            border: '2px solid #00cc66',
            background: 'white',
            color: '#ff6699',
            }}
        >
            <option value="All">All Status</option>
            <option value="Completed">Completed</option>
            <option value="Reading">Reading</option>
            <option value="Plan-to-read">Plan to Read</option>
        </select>

        <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            style={{
            padding: '0.7rem 0.9rem',
            borderRadius: '12px',
            border: '2px solid #00cc66',
            background: 'white',
            color: '#ff6699'
            }}
        >
            <option value="Updated">Sort: Default</option>
            <option value="TitleAZ">Title: A → Z</option>
            <option value="TitleZA">Title: Z → A</option>
            <option value="RatingHigh">Rating: High → Low</option>
            <option value="RatingLow">Rating: Low → High</option>
        </select>
        </div>
    </div>

        {/* CONTENT */}
        {manga.length === 0 ? (
          <p>No manga found. Go to the search page to add some!</p>
        ) : visibleManga.length === 0 ? (
          <p>No results. Try a different search or filter.</p>
        ) : (
          <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'grid',
              gap: '1.5rem',
            }}>
            {visibleManga.map((entry) => (
              <li key={entry._id} style={{
                    background: '#ffffff',
                    border: '2px solid #00cc66',
                    borderRadius: '16px',
                    padding: '1.5rem',
                    boxShadow: '0 10px 28px rgba(0,0,0,0.08)',
                }}>
                <h2 style={{ marginTop: 0, marginBottom: '1rem', color: '#cc0000' }}>
                    {entry.title}
                </h2>

                <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
                  {entry.coverImage && (
                    <img
                      src={entry.coverImage}
                      alt={entry.title}
                      style={{
                        width: '180px',
                        height: '260px',
                        objectFit: 'cover',
                        borderRadius: '12px',
                        border: '2px solid #00cc66',
                        flexShrink: 0,
                      }}
                    />
                  )}

                  <div style={{ textAlign: 'left', flex: 1 }}>
                    <p style={{
                        color: '#ff6699',
                        marginTop: 0,
                        marginBottom: '1rem',
                        lineHeight: 1.5,
                      }}>
                      {entry.synopsis?.slice(0, 250)}
                      {entry.synopsis?.length > 250 ? '...' : ''}
                    </p>

                    <div style={{
                        display: 'flex',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                        marginBottom: '1rem',
                      }}>
                      <span style={{
                          padding: '0.4rem 0.75rem',
                          borderRadius: '999px',
                          border: '2px solid #00cc66',
                          color: '#00aa55',
                          fontWeight: 500,
                        }}>
                        Status: {entry.status || 'N/A'}
                      </span>
                      <span style={{
                          padding: '0.4rem 0.75rem',
                          borderRadius: '999px',
                          border: '2px solid #00cc66',
                          color: '#00aa55',
                          fontWeight: 500,
                        }}>
                        Rating:{' '} {entry.rating != null ? (<>
                            {entry.rating} <span style={{ color: '#ffcc00', fontSize: '1.3em'}}>★</span></>) : ('N/A')}
                      </span>
                    </div>

                    <button onClick={() => {
                        setEditingManga(entry);
                        setTempStatus(entry.status || 'Completed');
                        setTempRating(entry.rating ?? 'null');
                      }}
                      style={{
                        padding: '0.6rem 1.2rem',
                        borderRadius: '10px',
                        border: 'none',
                        background: '#cc0000',
                        color: 'white',
                        cursor: 'pointer',
                      }}>
                      Edit
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* EDIT MODAL */}
        {editingManga && (
          <div style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
            }}>
            <div style={{
                background: 'white',
                padding: '2rem',
                color: '#cc0000',
                textAlign: 'left',
                border: '2px solid #00cc66',
                maxWidth: '600px',
                width: '100%',
              }}
            >
              <h2>{editingManga.title}</h2>

              <label>Status: </label>
              <select value={tempStatus} onChange={(e) => setTempStatus(e.target.value)}>
                <option value="Completed">Completed</option>
                <option value="Reading">Reading</option>
                <option value="Plan-to-read">Plan to Read</option>
              </select>
              <br /><br />

              <label>Rating (1–10): </label>
              <select value={tempRating} onChange={(e) => setTempRating(Number(e.target.value))}>
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
                  await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/manga/${editingManga._id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        rating: tempRating === 'null' ? null : tempRating,
                        status: tempStatus,
                      }),
                    }
                  );

                  setManga((prev) =>
                    prev.map((m) =>
                      m._id === editingManga._id
                        ? { ...m, status: tempStatus, rating: tempRating }
                        : m
                    )
                  );

                  setEditingManga(null);
                }}
              >
                Save
              </button>

              <button onClick={() => setEditingManga(null)} style={{ marginLeft: '1rem' }}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
