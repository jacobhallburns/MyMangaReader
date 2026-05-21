import { useState, useEffect, useRef } from 'react';

export default function TitleWithAltNames({ title, altTitles = [], style = {} }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const unique = [...new Set((altTitles || []).filter(t => t && t !== title))];

    useEffect(() => {
        if (!open) return;
        const handleOutside = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        const handleKey = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('keydown', handleKey);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, [open]);

    if (!unique.length) return <span style={style}>{title}</span>;

    return (
        <span ref={ref} style={{ position: 'relative', display: 'inline' }}>
            <span
                onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }}
                style={{ cursor: 'pointer', textDecoration: 'underline dotted', textUnderlineOffset: '3px', ...style }}
                title="Click to see alternative titles"
            >
                {title}
            </span>
            {open && (
                <div style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    zIndex: 9000,
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    padding: '0.75rem 1rem',
                    minWidth: '200px',
                    maxWidth: '320px',
                    boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
                    maxHeight: '220px',
                    overflowY: 'auto',
                }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: '700', margin: '0 0 0.5rem 0', letterSpacing: '0.06em' }}>
                        ALTERNATIVE TITLES
                    </p>
                    {unique.map((t, i) => (
                        <p key={i} style={{ color: 'var(--text-main)', fontSize: '0.82rem', margin: '0.2rem 0', lineHeight: 1.35 }}>
                            {t}
                        </p>
                    ))}
                </div>
            )}
        </span>
    );
}
