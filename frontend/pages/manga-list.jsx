import { useEffect, useMemo, useState } from 'react';
import Link from "next/link";

export default function MangaList() {
    const [manga, setManga] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [sortBy, setSortBy] = useState('Updated');

    const [editingManga, setEditingManga] = useState(null);
    const [tempStatus, setTempStatus] = useState('Completed');
    const [tempRating, setTempRating] = useState(null);

    const fetchManga = async () => {
        try {
            // Updated to relative Next.js API path
            const res = await fetch('/api/manga/collection');
            const data = await res.json();
            if (res.ok) {
                setManga(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Fetch failed:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchManga();
    }, []);

    const visibleManga = useMemo(() => {
        const q = searchTerm.trim().toLowerCase();
        let list = manga.filter((m) => {
            const statusOk = statusFilter === 'All' || (m.status || '').toLowerCase() === statusFilter.toLowerCase();
            if (!q) return statusOk;
            return (m.title || '').toLowerCase().includes(q) || (m.synopsis || '').toLowerCase().includes(q);
        });

        if (sortBy === 'TitleAZ') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
        else if (sortBy === 'TitleZA') list.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
        else if (sortBy === 'RatingHigh') list.sort((a, b) => (b.rating ?? -1) - (a.rating ?? -1));
        else if (sortBy === 'RatingLow') list.sort((a, b) => (a.rating ?? 999) - (b.rating ?? 999));

        return list;
    }, [manga, searchTerm, statusFilter, sortBy]);

    const handleUpdate = async () => {
        try {
            const res = await fetch(`/api/manga/collection?id=${editingManga._id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating: tempRating === 'null' ? null : tempRating,
                    status: tempStatus,
                }),
            });
            if (res.ok) fetchManga();
        } catch (err) {
            alert("Update failed");
        } finally {
            setEditingManga(null);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Remove this manga?")) return;
        try {
            const res = await fetch(`/api/manga/collection?id=${editingManga._id}`, { method: 'DELETE' });
            if (res.ok) fetchManga();
        } catch (err) {
            alert("Delete failed");
        } finally {
            setEditingManga(null);
        }
    };

    if (loading) return <p>Loading your collection...</p>;

    return (
        /* ... Keep your existing JSX and Styles ... */
        /* Note: Ensure "Save" and "Delete" buttons call handleUpdate and handleDelete */
    );
}