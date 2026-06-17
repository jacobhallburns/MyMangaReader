import { useEffect, useMemo, useState } from 'react';
import TitleWithAltNames from '../components/TitleWithAltNames';

const VOLUMES_PER_PAGE = 10;
const fmtRating = (n) => String(parseFloat(n.toFixed(2)));

function getPageNumbers(current, total) {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 4) return [1, 2, 3, 4, 5, '...', total];
    if (current >= total - 3) return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    return [1, '...', current - 1, current, current + 1, '...', total];
}

export default function MangaList() {
    const [manga, setManga] = useState([]);
    const [loading, setLoading] = useState(true);

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState('Updated');

    const [editingManga, setEditingManga] = useState(null);
    const [tempStatus, setTempStatus] = useState('plan_to_read');
    const [tempRating, setTempRating] = useState(0);
    const [tempNotes, setTempNotes] = useState('');

    const [detailManga, setDetailManga] = useState(null);
    const [volumes, setVolumes] = useState([]);
    const [volumesLoading, setVolumesLoading] = useState(false);
    const [volumesError, setVolumesError] = useState(null);
    const [nextCursor, setNextCursor] = useState(null);
    const [serialization, setSerialization] = useState(null);
    const [mangaTitle, setMangaTitle] = useState('');
    const [loadMoreLoading, setLoadMoreLoading] = useState(false);
    const [volumePage, setVolumePage] = useState(1);
    const [pendingAdvancePage, setPendingAdvancePage] = useState(null);
    const [volumeStates, setVolumeStates] = useState({});

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

        return () => {
            cancelled = true;
        };
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
        try {
            const res = await fetch(`/api/manga/${editingManga._id}`, { method: 'DELETE' });

            if (res.ok) setManga(prev => prev.filter(m => m._id !== editingManga._id));
        } catch (err) {
            alert(`Failed to delete: ${err.message}`);
        } finally {
            setEditingManga(null);
        }
    };

    const loadVolumes = async (entry) => {
        const mangaDocId = entry.mangaId?._id;

        if (!mangaDocId) {
            setVolumesError('Manga document ID missing.');
            return;
        }

        const title = entry.mangaId?.title || '(unknown)';

        console.log('[VolumePopup]', {
            event: 'open',
            title,
            mangaDocId,
            kitsuId: entry.mangaId?.kitsuId ?? null,
            volumeCount: entry.mangaId?.volumeCount ?? null
        });

        if (!entry.mangaId?.volumeCount) {
            console.warn('[VolumePopup] volumeCount is null or 0 for', title, entry.mangaId);
        }

        setVolumesLoading(true);
        setVolumesError(null);
        setVolumes([]);
        setNextCursor(null);
        setSerialization(null);
        setMangaTitle('');
        setVolumePage(1);
        setPendingAdvancePage(null);

        try {
            const res = await fetch(`/api/manga/volumes/${mangaDocId}`);
            const data = await res.json();

            console.log('[VolumePopup]', {
                event: 'volumes_response',
                title,
                ok: res.ok,
                count: data.volumes?.length ?? 0,
                genres: data.genres?.length ?? 0,
                warning: data._warning ?? null
            });

            if (!res.ok) {
                setVolumesError(data?.error || `API error ${res.status}`);
                return;
            }

            if (data._warning) {
                console.warn('[VolumePopup]', {
                    event: 'warning',
                    title,
                    warning: data._warning
                });
            }

            const vols = data.volumes || [];

            console.log('[VolumePopup]', {
                event: 'rows_generated',
                title,
                rowCount: vols.length
            });

            setVolumes(vols);
            setNextCursor(data.nextCursor ?? null);
            setSerialization(data.serialization ?? null);
            setMangaTitle(data.mangaTitle || '');

            if (data.genres?.length > 0 || data.author || data.posterImage) {
                const patch = {
                    ...(data.genres?.length > 0 ? { genres: data.genres } : {}),
                    ...(data.author ? { author: data.author } : {}),
                };

                setManga(prev => prev.map(m =>
                    m.mangaId?._id === mangaDocId
                        ? { ...m, mangaId: { ...m.mangaId, ...patch } }
                        : m
                ));

                setDetailManga(prev => prev
                    ? { ...prev, mangaId: { ...prev.mangaId, ...patch } }
                    : prev
                );
            }
        } catch (err) {
            console.error('[VolumePopup]', {
                event: 'fetch_error',
                title,
                error: err.message
            });

            setVolumesError(err.message || 'Network error');
        } finally {
            setVolumesLoading(false);
        }
    };

    const loadVolumeStates = async (entry) => {
        const mangaObjId = entry.mangaId?._id;

        if (!mangaObjId) return;

        try {
            const res = await fetch(`/api/manga/volume-tracker/${mangaObjId}`);
            const data = await res.json();

            console.log('[VolumePopup]', {
                event: 'state_loaded',
                mangaObjId,
                volumeStateCount: Object.keys(data.volumes || {}).length
            });

            if (res.ok) setVolumeStates(data.volumes || {});
        } catch (err) {
            console.error('[VolumePopup]', {
                event: 'state_load_error',
                mangaObjId,
                error: err.message
            });
        }
    };

    const loadMoreVolumes = async () => {
        if (!nextCursor || !detailManga) return;

        const mangaDocId = detailManga.mangaId?._id;

        if (!mangaDocId) return;

        setLoadMoreLoading(true);

        try {
            const res = await fetch(`/api/manga/volumes/${mangaDocId}?cursor=${encodeURIComponent(nextCursor)}`);

            if (!res.ok) throw new Error();

            const data = await res.json();

            setVolumes(prev => {
                const seen = new Set(prev.map(v => v.volumeNumber));
                return [...prev, ...(data.volumes || []).filter(v => !seen.has(v.volumeNumber))];
            });

            setNextCursor(data.nextCursor ?? null);
        } catch {
            // existing list is preserved
        } finally {
            setLoadMoreLoading(false);
        }
    };

    useEffect(() => {
        if (pendingAdvancePage !== null && !loadMoreLoading) {
            const total = Math.max(1, Math.ceil(volumes.length / VOLUMES_PER_PAGE));

            setVolumePage(Math.min(pendingAdvancePage, total));
            setPendingAdvancePage(null);
        }
    }, [loadMoreLoading, pendingAdvancePage, volumes.length]);

    const goToVolumePage = (page) => {
        const total = Math.ceil(volumes.length / VOLUMES_PER_PAGE);

        if (page < 1 || (page > total && !nextCursor)) return;

        if (page > total && nextCursor && !loadMoreLoading) {
            setPendingAdvancePage(page);
            loadMoreVolumes();
        } else {
            setVolumePage(page);
        }
    };

    const openDetail = (entry) => {
        setDetailManga(entry);
        setVolumeStates({});
        loadVolumes(entry);
        loadVolumeStates(entry);
    };

    const handleVolumeToggle = async (volumeNumber, field, value) => {
        const key = String(volumeNumber);

        setVolumeStates(prev => ({
            ...prev,
            [key]: {
                read: false,
                online: false,
                physical: false,
                ...(prev[key] || {}),
                [field]: value
            },
        }));

        try {
            await fetch(`/api/manga/volume-tracker/${detailManga.mangaId._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ volumeNumber: key, field, value }),
            });
        } catch {
            setVolumeStates(prev => ({
                ...prev,
                [key]: {
                    ...(prev[key] || {}),
                    [field]: !value
                },
            }));
        }
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
                        <li
                            key={entry._id}
                            onClick={() => openDetail(entry)}
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '24px',
                                padding: '1.5rem',
                                display: 'flex',
                                gap: '1.5rem',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                                cursor: 'pointer'
                            }}
                        >
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
                                    referrerPolicy="no-referrer"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    alt={entry.mangaId?.title || "manga cover"}
                                />
                            </div>

                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '0.2rem 0' }}>
                                <div>
                                    <h2 style={{ color: 'var(--text-main)', fontSize: '1.4rem', margin: '0 0 0.6rem 0', fontWeight: '800' }}>
                                        <TitleWithAltNames title={entry.mangaId?.title || entry.title} altTitles={entry.mangaId?.altTitles ?? []} />
                                    </h2>

                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', margin: '0 0 0.75rem 0' }}>
                                        {entry.mangaId?.synopsis?.slice(0, 200) || entry.synopsis?.slice(0, 200)}...
                                    </p>

                                    {(entry.mangaId?.genres || []).length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem', marginBottom: '0.75rem' }}>
                                            {entry.mangaId.genres.slice(0, 5).map(g => (
                                                <span key={g} style={{ padding: '0.18rem 0.55rem', borderRadius: '20px', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '600' }}>
                                                    {g}
                                                </span>
                                            ))}
                                        </div>
                                    )}

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

                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                                            {entry.rating > 0 && (
                                                <span style={{ color: '#4CAF50', fontWeight: '700', fontSize: '0.82rem' }}>★ {entry.rating}</span>
                                            )}

                                            {(entry.mangaId?.averageRating ?? 0) > 0 ? (
                                                <span style={{ color: '#FFD700', fontWeight: '700', fontSize: '0.82rem' }}>
                                                    ★ {fmtRating(entry.mangaId.averageRating)}{' '}
                                                    <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>({entry.mangaId.ratingCount})</span>
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>No ratings</span>
                                            )}
                                        </div>
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

                {detailManga && (
                    <div
                        onClick={() => setDetailManga(null)}
                        style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, backdropFilter: 'blur(4px)' }}
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            style={{ width: '92%', maxWidth: '900px', minHeight: '500px', maxHeight: '85vh', background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid var(--border-color)', padding: '1.75rem', boxShadow: '0 20px 40px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: '1.1rem', overflowY: 'hidden' }}
                        >
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                                <div style={{ width: '72px', height: '100px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: '#1a1a1a', border: '1px solid var(--border-color)' }}>
                                    <img
                                        src={detailManga.mangaId?.posterImage || '/placeholder.png'}
                                        referrerPolicy="no-referrer"
                                        alt=""
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                </div>

                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <h2 style={{ margin: '0 0 0.2rem 0', color: 'var(--text-main)', fontSize: '1.15rem', fontWeight: '800', lineHeight: 1.3 }}>
                                        {mangaTitle || detailManga.mangaId?.title}
                                    </h2>

                                    {detailManga.mangaId?.author && (
                                        <p style={{ margin: '0 0 0.45rem 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                            by {detailManga.mangaId.author}
                                        </p>
                                    )}

                                    {(detailManga.mangaId?.genres || []).length > 0 && (
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                                            {detailManga.mangaId.genres.slice(0, 6).map(g => (
                                                <span key={g} style={{ padding: '0.18rem 0.5rem', borderRadius: '20px', border: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '600' }}>
                                                    {g}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <button
                                    onClick={() => setDetailManga(null)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '1.4rem', cursor: 'pointer', lineHeight: 1, padding: '0 0.1rem', flexShrink: 0 }}
                                >
                                    ✕
                                </button>
                            </div>

                            {(() => {
                                const states = Object.values(volumeStates);
                                const readCount = states.filter(s => s.read).length;
                                const onlineCount = states.filter(s => s.online).length;
                                const physicalCount = states.filter(s => s.physical).length;
                                const total = volumes.length;

                                return (
                                    <div style={{ display: 'flex', gap: '1.25rem', background: 'var(--bg-color)', padding: '0.6rem 1rem', borderRadius: '10px', fontSize: '0.83rem', fontWeight: '600', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                                        <span>Read: <span style={{ color: 'var(--accent-green)' }}>{readCount}/{total}</span></span>
                                        <span>Online: <span style={{ color: 'var(--text-main)' }}>{onlineCount}</span></span>
                                        <span>Physical: <span style={{ color: 'var(--text-main)' }}>{physicalCount}</span></span>
                                    </div>
                                );
                            })()}

                            <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, display: 'flex', flexDirection: 'column', gap: '0.38rem' }}>
                                {volumesLoading && (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0', margin: 0 }}>Loading volumes...</p>
                                )}

                                {volumesError && !volumesLoading && (
                                    <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                                        <p style={{ color: '#ff6b6b', fontSize: '0.85rem', margin: '0 0 1rem 0', fontFamily: 'monospace' }}>{volumesError}</p>
                                        <button onClick={() => loadVolumes(detailManga)} style={{ padding: '0.6rem 1.4rem', borderRadius: '12px', background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                                            Retry
                                        </button>
                                    </div>
                                )}

                                {!volumesLoading && !volumesError && volumes.length === 0 && (
                                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem 0', margin: 0 }}>No volumes available for this manga.</p>
                                )}

                                {!volumesLoading && !volumesError && volumes.length > 0 && (() => {
                                    const visibleVolumes = volumes.slice((volumePage - 1) * VOLUMES_PER_PAGE, volumePage * VOLUMES_PER_PAGE);
                                    const affiliateTag = process.env.NEXT_PUBLIC_AMAZON_ASSOCIATE_TAG || 'MYMANGA-20';
                                    const seriesTitle = mangaTitle || detailManga.mangaId?.title || '';

                                    return visibleVolumes.map((vol) => {
                                        const key = String(vol.volumeNumber);
                                        const state = volumeStates[key] || { read: false, online: false, physical: false };
                                        const isRead = !!state.read;
                                        const amazonHref = `https://www.amazon.com/s?k=${encodeURIComponent(`${seriesTitle} Volume ${vol.volumeNumber}`)}&tag=${affiliateTag}`;

                                        return (
                                            <div
                                                key={vol.volumeNumber}
                                                style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', padding: '0.5rem 0.75rem', background: 'var(--bg-color)', borderRadius: '10px', flexWrap: 'wrap', flexShrink: 0 }}
                                            >
                                                <span style={{ width: '5.5rem', fontWeight: '700', color: 'var(--text-main)', fontSize: '0.85rem', flexShrink: 0 }}>
                                                    Volume {vol.volumeNumber}
                                                </span>

                                                <button
                                                    onClick={() => handleVolumeToggle(vol.volumeNumber, 'read', !isRead)}
                                                    style={{ padding: '0.26rem 0.72rem', borderRadius: '20px', border: `1px solid ${isRead ? 'var(--accent-green)' : 'var(--border-color)'}`, background: isRead ? 'rgba(0,204,102,0.12)' : 'transparent', color: isRead ? 'var(--accent-green)' : 'var(--text-muted)', fontWeight: '700', fontSize: '0.74rem', cursor: 'pointer', minWidth: '56px', boxShadow: isRead ? '0 0 5px rgba(0,204,102,0.28)' : 'none', transition: 'all 0.15s ease', flexShrink: 0 }}
                                                >
                                                    {isRead ? 'Read' : 'Unread'}
                                                </button>

                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.28rem', cursor: 'pointer', fontSize: '0.76rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                                                    <input type="checkbox" checked={!!state.online} onChange={(e) => handleVolumeToggle(vol.volumeNumber, 'online', e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--accent-green)' }} />
                                                    Online Copy
                                                </label>

                                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.28rem', cursor: 'pointer', fontSize: '0.76rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                                                    <input type="checkbox" checked={!!state.physical} onChange={(e) => handleVolumeToggle(vol.volumeNumber, 'physical', e.target.checked)} style={{ cursor: 'pointer', accentColor: 'var(--accent-green)' }} />
                                                    Physical Copy
                                                </label>

                                                <a href={amazonHref} target="_blank" rel="noopener noreferrer sponsored" onClick={(e) => e.stopPropagation()} style={{ marginLeft: 'auto', padding: '0.26rem 0.72rem', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.74rem', fontWeight: '600', flexShrink: 0, whiteSpace: 'nowrap' }}>
                                                    Buy on Amazon
                                                </a>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>

                            <p style={{ flexShrink: 0, margin: 0, textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', opacity: 0.6 }}>
                                As an Amazon Associate I earn from qualifying purchases.
                            </p>

                            {!volumesLoading && !volumesError && volumes.length > 0 && (() => {
                                const totalKnownPages = Math.max(1, Math.ceil(volumes.length / VOLUMES_PER_PAGE));
                                const canGoNext = volumePage < totalKnownPages || !!nextCursor;
                                const canGoPrev = volumePage > 1;
                                const pageNums = getPageNumbers(volumePage, totalKnownPages);
                                const btnBase = { border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0.35rem 0.65rem', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', minWidth: '34px', textAlign: 'center' };

                                if (totalKnownPages <= 1 && !nextCursor) return null;

                                return (
                                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', flexShrink: 0 }}>
                                        <button onClick={() => goToVolumePage(volumePage - 1)} disabled={!canGoPrev || loadMoreLoading} style={{ ...btnBase, background: canGoPrev ? 'var(--bg-color)' : 'transparent', color: canGoPrev ? 'var(--text-main)' : 'var(--text-muted)', opacity: canGoPrev ? 1 : 0.35, cursor: canGoPrev ? 'pointer' : 'default' }}>
                                            ←
                                        </button>

                                        {pageNums.map((p, i) =>
                                            p === '...' ? (
                                                <span key={`e${i}`} style={{ color: 'var(--text-muted)', padding: '0 0.2rem', fontSize: '0.82rem' }}>…</span>
                                            ) : (
                                                <button key={p} onClick={() => goToVolumePage(p)} disabled={loadMoreLoading} style={{ ...btnBase, background: p === volumePage ? 'var(--text-main)' : 'var(--bg-color)', color: p === volumePage ? 'var(--bg-color)' : 'var(--text-main)', borderColor: p === volumePage ? 'var(--text-main)' : 'var(--border-color)' }}>
                                                    {p}
                                                </button>
                                            )
                                        )}

                                        {nextCursor && <span style={{ color: 'var(--text-muted)', padding: '0 0.2rem', fontSize: '0.82rem' }}>…</span>}

                                        <button onClick={() => goToVolumePage(volumePage + 1)} disabled={!canGoNext || loadMoreLoading} style={{ ...btnBase, background: canGoNext ? 'var(--bg-color)' : 'transparent', color: canGoNext ? 'var(--text-main)' : 'var(--text-muted)', opacity: canGoNext && !loadMoreLoading ? 1 : 0.35, cursor: canGoNext && !loadMoreLoading ? 'pointer' : 'default' }}>
                                            {loadMoreLoading && pendingAdvancePage ? '…' : '→'}
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

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
                                    {[...Array(10)].map((_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
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
                                <button onClick={handleSave} style={{ flex: 2, padding: '1rem', background: '#4CAF50', color: 'white', borderRadius: '14px', fontWeight: 'bold', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>
                                    Save Changes
                                </button>

                                <button onClick={handleDelete} style={{ flex: 1, padding: '1rem', background: 'rgba(255,68,68,0.1)', color: '#ff4444', borderRadius: '14px', border: '1px solid #ff4444', cursor: 'pointer', fontWeight: '600' }}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}