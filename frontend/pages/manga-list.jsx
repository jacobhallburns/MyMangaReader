import { useEffect, useMemo, useState } from 'react';
import Link from "next/link";

const CHAPTERS_PER_PAGE = 20;

function getPageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
}

export default function MangaList() {
    const [manga, setManga] = useState([]);
    const [loading, setLoading] = useState(true);

    // Search / Filter / Sort
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState('Updated');

    // Edit modal state
    const [editingManga, setEditingManga] = useState(null);
    const [tempStatus, setTempStatus] = useState('plan_to_read');
    const [tempRating, setTempRating] = useState(0);
    const [tempNotes, setTempNotes] = useState('');

    // Detail modal state
    const [detailManga, setDetailManga] = useState(null);
    const [chapters, setChapters] = useState([]);
    const [chaptersLoading, setChaptersLoading] = useState(false);
    const [chaptersError, setChaptersError] = useState(null);
    const [nextCursor, setNextCursor] = useState(null);
    const [serialization, setSerialization] = useState(null);
    const [mangaTitle, setMangaTitle] = useState('');
    const [loadMoreLoading, setLoadMoreLoading] = useState(false);
    const [chapterPage, setChapterPage] = useState(1);
    const [pendingAdvancePage, setPendingAdvancePage] = useState(null);
    const [selectedChapter, setSelectedChapter] = useState(null);

    useEffect(() => {
        let cancelled = false;
        const fetchManga = async () => {
            try {
                const res = await fetch('/api/manga/collection');
                if (res.status === 503) {
                    if (!cancelled) setTimeout(fetchManga, 300);
                    return;
                }
                const data = await res.json();
                if (!cancelled) setManga(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Fetch failed:", err);
                if (!cancelled) setTimeout(fetchManga, 500);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        fetchManga();
        return () => { cancelled = true; };
    }, []);

    const visibleManga = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        let list = [...manga].filter((m) => {
            const statusOk = statusFilter === 'All' || (m.status || '').toLowerCase() === statusFilter.toLowerCase();
            if (!q) return statusOk;
            const title = (m.mangaId?.title || m.title || '').toLowerCase();
            const synopsis = (m.mangaId?.synopsis || m.synopsis || '').toLowerCase();
            return statusOk && (title.includes(q) || synopsis.includes(q));
        });

        if (sortBy === 'TitleAZ') list.sort((a, b) => (a.mangaId?.title || '').localeCompare(b.mangaId?.title || ''));
        else if (sortBy === 'TitleZA') list.sort((a, b) => (b.mangaId?.title || '').localeCompare(a.mangaId?.title || ''));
        else if (sortBy === 'RatingHigh') list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
        return list;
    }, [manga, searchTerm, statusFilter, sortBy]);

    const handleSave = async () => {
        try {
            const res = await fetch(`/api/manga/${editingManga._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating: tempRating, status: tempStatus, notes: tempNotes }),
            });
            if (res.ok) {
                const updatedData = await res.json();
                setManga(prev => prev.map(m => m._id === editingManga._id
                    ? { ...m, status: updatedData.status, rating: updatedData.rating, notes: updatedData.notes }
                    : m
                ));
            }
        } catch (err) {
            alert(`Failed to update: ${err.message}`);
        } finally {
            setEditingManga(null);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Remove this from your list?")) return;
        try {
            const res = await fetch(`/api/manga/${editingManga._id}`, { method: 'DELETE' });
            if (res.ok) setManga(prev => prev.filter(m => m._id !== editingManga._id));
        } catch (err) {
            alert(`Failed to delete: ${err.message}`);
        } finally {
            setEditingManga(null);
        }
    };

    const loadChapters = async (entry) => {
        const kitsuId = entry.mangaId?.kitsuId;
        if (!kitsuId) {
            setChaptersError('No Kitsu ID on this manga entry.');
            return;
        }
        setChaptersLoading(true);
        setChaptersError(null);
        setChapters([]);
        setNextCursor(null);
        setSerialization(null);
        setMangaTitle('');
        setChapterPage(1);
        setPendingAdvancePage(null);
        setSelectedChapter(null);
        try {
            const res = await fetch(`/api/manga/chapters/${kitsuId}`);
            const data = await res.json();
            if (!res.ok) {
                const msg = data?.error || `API error ${res.status}`;
                console.error('[loadChapters]', msg, { kitsuId, status: res.status });
                setChaptersError(msg);
                return;
            }
            setChapters(data.chapters || []);
            setNextCursor(data.nextCursor ?? null);
            setSerialization(data.serialization ?? null);
            setMangaTitle(data.mangaTitle || '');
        } catch (err) {
            console.error('[loadChapters] fetch threw:', err);
            setChaptersError(err.message || 'Network error');
        } finally {
            setChaptersLoading(false);
        }
    };

    const loadMoreChapters = async () => {
        if (!nextCursor || !detailManga) return;
        const kitsuId = detailManga.mangaId?.kitsuId;
        if (!kitsuId) return;
        setLoadMoreLoading(true);
        try {
            const res = await fetch(`/api/manga/chapters/${kitsuId}?cursor=${encodeURIComponent(nextCursor)}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            setChapters(prev => {
                const seen = new Set(prev.map(c => c.number));
                return [...prev, ...(data.chapters || []).filter(c => !seen.has(c.number))];
            });
            setNextCursor(data.nextCursor ?? null);
        } catch {
            // silently fail on load more — existing list is preserved
        } finally {
            setLoadMoreLoading(false);
        }
    };

    useEffect(() => {
        if (pendingAdvancePage !== null && !loadMoreLoading) {
            const total = Math.max(1, Math.ceil(chapters.length / CHAPTERS_PER_PAGE));
            setChapterPage(Math.min(pendingAdvancePage, total));
            setPendingAdvancePage(null);
        }
    }, [loadMoreLoading, pendingAdvancePage, chapters.length]);

    const goToChapterPage = (page) => {
        const total = Math.ceil(chapters.length / CHAPTERS_PER_PAGE);
        if (page < 1 || (page > total && !nextCursor)) return;
        if (page > total && nextCursor && !loadMoreLoading) {
            setPendingAdvancePage(page);
            loadMoreChapters();
        } else {
            setChapterPage(page);
        }
    };

    const openDetail = (entry) => {
        setDetailManga(entry);
        loadChapters(entry);
    };

    if (loading) return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <p style={{ color: 'var(--text-main)' }}>Loading collection...</p>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', padding: '1rem' }}>
            <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

                <div style={{ position: 'sticky', top: 0, zIndex: 10, background: 'var(--bg-color)', paddingBottom: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
                        <input
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Search List..."
                            style={{ padding: '0.8rem', borderRadius: '12px', border: '1px solid var(--border-color)', background: 'var(--card-bg)', color: 'var(--text-main)' }}
                        />
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
                            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: '0.6rem', borderRadius: '8px', background: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                                <option value="All">All Status</option>
                                <option value="reading">Reading</option>
                                <option value="completed">Completed</option>
                                <option value="plan_to_read">Plan to Read</option>
                                <option value="on_hold">On Hold</option>
                                <option value="dropped">Dropped</option>
                            </select>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '0.6rem', borderRadius: '8px', background: 'var(--card-bg)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                                <option value="Updated">Default</option>
                                <option value="TitleAZ">A → Z</option>
                                <option value="TitleZA">Z → A</option>
                                <option value="RatingHigh">★ Top</option>
                            </select>
                        </div>
                    </div>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {visibleManga.map((entry) => (
                        <li key={entry._id} onClick={() => openDetail(entry)} style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '24px',
                            padding: '1.5rem',
                            display: 'flex',
                            gap: '1.5rem',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            cursor: 'pointer'
                        }}>
                            {/* Poster View Container */}
                            <div style={{
                                width: '140px',
                                height: '210px',
                                backgroundColor: '#1a1a1a',
                                borderRadius: '16px',
                                flexShrink: 0,
                                overflow: 'hidden',
                                border: '1px solid var(--border-color)',
                                boxShadow: '0 8px 16px rgba(0,0,0,0.4)'
                            }}>
                                <img
                                    src={entry.mangaId?.posterImage || "/placeholder.png"}
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    alt={entry.mangaId?.title || "manga cover"}
                                />
                            </div>

                            {/* Content Area */}
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                                <div>
                                    <h2 style={{ color: 'var(--text-main)', fontSize: '1.4rem', margin: '0 0 0.6rem 0', fontWeight: '800' }}>
                                        {entry.mangaId?.title || entry.title}
                                    </h2>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', margin: '0 0 1rem 0' }}>
                                        {entry.mangaId?.synopsis?.slice(0, 200) || entry.synopsis?.slice(0, 200)}...
                                    </p>

                                    {entry.notes && (
                                        <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', background: 'var(--bg-color)', padding: '0.7rem 1rem', borderRadius: '12px', borderLeft: '4px solid var(--accent-green)', opacity: 0.9 }}>
                                            <span style={{ fontWeight: 'bold', color: 'var(--accent-green)' }}>Note:</span> {entry.notes}
                                        </div>
                                    )}
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.7rem', alignItems: 'center' }}>
                                        <span style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', background: 'rgba(76, 175, 80, 0.15)', color: 'var(--accent-green)', fontSize: '0.8rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            {entry.status.replace(/_/g, ' ')}
                                        </span>
                                        {entry.rating > 0 && (
                                            <span style={{ color: '#FFD700', fontSize: '1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '3px' }}>
                                                ★ {entry.rating}
                                            </span>
                                        )}
                                    </div>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingManga(entry);
                                            setTempStatus(entry.status);
                                            setTempRating(entry.rating || 0);
                                            setTempNotes(entry.notes || '');
                                        }}
                                        style={{ padding: '0.6rem 1.4rem', borderRadius: '12px', background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', fontWeight: 'bold', cursor: 'pointer', fontSize: '0.95rem' }}
                                    >
                                        Edit Entry
                                    </button>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>

                {/* DETAIL MODAL */}
                {detailManga && (
                    <>
                        <div onClick={() => setDetailManga(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
                            <div onClick={(e) => e.stopPropagation()} style={{ width: '92%', maxWidth: '720px', maxHeight: '85vh', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <h2 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>
                                        {mangaTitle || detailManga.mangaId?.title} — Chapters
                                    </h2>
                                    <button onClick={() => setDetailManga(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, padding: '0 0.25rem' }}>✕</button>
                                </div>

                                {chaptersLoading && (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0', margin: 0 }}>Loading chapters...</p>
                                )}

                                {chaptersError && !chaptersLoading && (
                                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                        <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>Could not load chapters.</p>
                                        <p style={{ color: '#ff6b6b', fontSize: '0.8rem', marginBottom: '1rem', fontFamily: 'monospace' }}>{chaptersError}</p>
                                        <button onClick={() => loadChapters(detailManga)} style={{ padding: '0.6rem 1.4rem', borderRadius: '12px', background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>Retry</button>
                                    </div>
                                )}

                                {!chaptersLoading && !chaptersError && chapters.length === 0 && (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0', margin: 0 }}>No chapters available for this manga.</p>
                                )}

                                {!chaptersLoading && !chaptersError && chapters.length > 0 && (() => {
                                    const totalKnownPages = Math.max(1, Math.ceil(chapters.length / CHAPTERS_PER_PAGE));
                                    const visibleChapters = chapters.slice((chapterPage - 1) * CHAPTERS_PER_PAGE, chapterPage * CHAPTERS_PER_PAGE);
                                    const canGoNext = chapterPage < totalKnownPages || !!nextCursor;
                                    const canGoPrev = chapterPage > 1;
                                    const pageNums = getPageNumbers(chapterPage, totalKnownPages);
                                    const btnBase = { border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.35rem 0.65rem', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', minWidth: '34px', textAlign: 'center' };
                                    return (
                                        <>
                                            {/* Chapter pills row */}
                                            <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', overflowX: 'auto', padding: '0.25rem 0', flexWrap: 'nowrap' }}>
                                                {visibleChapters.map((ch) => {
                                                    const isSelected = selectedChapter?.number === ch.number;
                                                    return (
                                                        <button
                                                            key={ch.number}
                                                            onClick={() => setSelectedChapter(ch)}
                                                            style={{
                                                                padding: '0.4rem 0.9rem',
                                                                borderRadius: '20px',
                                                                border: '1px solid var(--border-color)',
                                                                background: isSelected ? 'var(--text-main)' : 'var(--bg-color)',
                                                                color: isSelected ? 'var(--bg-color)' : 'var(--text-main)',
                                                                fontSize: '0.82rem',
                                                                fontWeight: '600',
                                                                cursor: 'pointer',
                                                                whiteSpace: 'nowrap',
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            Ch. {ch.number}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            {/* Pagination bar */}
                                            {(totalKnownPages > 1 || nextCursor) && (
                                                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                    <button
                                                        onClick={() => goToChapterPage(chapterPage - 1)}
                                                        disabled={!canGoPrev || loadMoreLoading}
                                                        style={{ ...btnBase, background: canGoPrev ? 'var(--bg-color)' : 'transparent', color: canGoPrev ? 'var(--text-main)' : 'var(--text-muted)', opacity: canGoPrev ? 1 : 0.35, cursor: canGoPrev ? 'pointer' : 'default' }}
                                                    >←</button>

                                                    {pageNums.map((p, i) =>
                                                        p === '...' ? (
                                                            <span key={`e${i}`} style={{ color: 'var(--text-muted)', padding: '0 0.2rem', fontSize: '0.82rem' }}>…</span>
                                                        ) : (
                                                            <button
                                                                key={p}
                                                                onClick={() => goToChapterPage(p)}
                                                                disabled={loadMoreLoading}
                                                                style={{ ...btnBase, background: p === chapterPage ? 'var(--text-main)' : 'var(--bg-color)', color: p === chapterPage ? 'var(--bg-color)' : 'var(--text-main)', borderColor: p === chapterPage ? 'var(--text-main)' : 'var(--border-color)' }}
                                                            >{p}</button>
                                                        )
                                                    )}

                                                    {nextCursor && (
                                                        <span style={{ color: 'var(--text-muted)', padding: '0 0.2rem', fontSize: '0.82rem' }}>…</span>
                                                    )}

                                                    <button
                                                        onClick={() => goToChapterPage(chapterPage + 1)}
                                                        disabled={!canGoNext || loadMoreLoading}
                                                        style={{ ...btnBase, background: canGoNext ? 'var(--bg-color)' : 'transparent', color: canGoNext ? 'var(--text-main)' : 'var(--text-muted)', opacity: canGoNext && !loadMoreLoading ? 1 : 0.35, cursor: canGoNext && !loadMoreLoading ? 'pointer' : 'default' }}
                                                    >{loadMoreLoading && pendingAdvancePage ? '…' : '→'}</button>
                                                </div>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
                        </div>

                        {/* CHAPTER DETAIL MODAL (layered on top) */}
                        {selectedChapter && (
                            <div onClick={() => setSelectedChapter(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
                                <div onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '380px', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', padding: '1.75rem', boxShadow: '0 20px 40px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <h2 style={{ color: 'var(--text-main)', margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>
                                            {mangaTitle} — Chapter {selectedChapter.number}
                                        </h2>
                                        <button onClick={() => setSelectedChapter(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, padding: '0 0.25rem' }}>✕</button>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                                        {selectedChapter.posterImage ? (
                                            <img
                                                src={selectedChapter.posterImage}
                                                alt={`Chapter ${selectedChapter.number}`}
                                                style={{ width: '200px', borderRadius: '12px', display: 'block' }}
                                            />
                                        ) : (
                                            <div style={{ width: '200px', height: '280px', background: '#333', borderRadius: '12px' }} />
                                        )}
                                    </div>

                                    {(() => {
                                        const term = serialization ? ` ${serialization}` : ' manga';
                                        const volRef = selectedChapter.volumeNumber ?? selectedChapter.number;
                                        const query = encodeURIComponent(`${mangaTitle} volume ${volRef}${term} new`);
                                        const tag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG ?? '';
                                        const href = `https://www.amazon.com/s?k=${query}${tag ? `&tag=${tag}` : ''}`;
                                        return (
                                            <div style={{ textAlign: 'center' }}>
                                                <a
                                                    href={href}
                                                    target="_blank"
                                                    rel="noopener noreferrer sponsored"
                                                    style={{ display: 'inline-block', padding: '0.6rem 1.4rem', border: '1px solid var(--border-color)', borderRadius: '12px', background: 'transparent', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: '600' }}
                                                >
                                                    Buy on Amazon
                                                </a>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* EDIT MODAL */}
                {editingManga && (
                    <div onClick={() => setEditingManga(null)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}>
                        <div onClick={(e) => e.stopPropagation()} style={{ width: '90%', maxWidth: '420px', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', padding: '2rem', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}>
                            <h2 style={{ color: 'var(--text-main)', marginTop: 0, fontSize: '1.6rem' }}>Edit Entry</h2>

                            <div style={{ marginBottom: '1.2rem' }}>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Status</label>
                                <select value={tempStatus} onChange={(e) => setTempStatus(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', marginTop: '0.5rem', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '1rem' }}>
                                    <option value="reading">Reading</option>
                                    <option value="completed">Completed</option>
                                    <option value="plan_to_read">Plan to Read</option>
                                    <option value="on_hold">On Hold</option>
                                    <option value="dropped">Dropped</option>
                                </select>
                            </div>

                            <div style={{ marginBottom: '1.2rem' }}>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600' }}>Rating</label>
                                <select value={tempRating} onChange={(e) => setTempRating(Number(e.target.value))} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', marginTop: '0.5rem', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '1rem' }}>
                                    <option value="0">No Rating</option>
                                    {[...Array(10)].map((_, i) => <option key={i+1} value={i+1}>{i+1}</option>)}
                                </select>
                            </div>

                            <div style={{ marginBottom: '2rem' }}>
                                <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: '600', display: 'block', marginBottom: '0.5rem' }}>Notes</label>
                                <textarea
                                    value={tempNotes}
                                    onChange={(e) => setTempNotes(e.target.value)}
                                    style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', minHeight: '100px', fontSize: '1rem', resize: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <button onClick={handleSave} style={{ flex: 2, padding: '1rem', background: '#4CAF50', color: 'white', borderRadius: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>Save Changes</button>
                                <button onClick={handleDelete} style={{ flex: 1, padding: '1rem', background: 'rgba(255,68,68,0.1)', color: '#ff4444', borderRadius: '14px', border: '1px solid #ff4444', cursor: 'pointer', fontWeight: '600' }}>Delete</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
