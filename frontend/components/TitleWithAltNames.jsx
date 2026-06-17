import { useState, useEffect, useRef, useMemo } from 'react';
import { useLang } from '../lib/LangContext';
import { extractRawTitlesFromMedia, resolvePrimaryTitle, resolveAltTitles } from '../lib/titleLocale';

export default function TitleWithAltNames({ title, altTitles = [], mediaRaw = null, style = {} }) {
    const { lang } = useLang();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const { displayTitle, displayAlts } = useMemo(() => {
        if (mediaRaw) {
            const raw = extractRawTitlesFromMedia(mediaRaw);
            return {
                displayTitle: resolvePrimaryTitle(raw, lang) || title,
                displayAlts: resolveAltTitles(raw, lang),
            };
        }

        return { displayTitle: title, displayAlts: altTitles };
    }, [mediaRaw, lang, title, altTitles]);

    const unique = [...new Set((displayAlts || []).filter(t => t && t !== displayTitle))];

    useEffect(() => {
        if (!open) return;

        const handleOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };

        const handleKey = (e) => {
            if (e.key === 'Escape') setOpen(false);
        };

        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('keydown', handleKey);

        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, [open]);

    if (!unique.length) return <span style={style}>{displayTitle}</span>;

    return (
        <span ref={ref} style={{ position: 'relative', display: 'inline' }}>
            <span
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(o => !o);
                }}
                style={{
                    cursor: 'pointer',
                    textDecoration: 'underline dotted',
                    textUnderlineOffset: '3px',
                    ...style
                }}
                title="Click to see alternative titles"
            >
                {displayTitle}
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
                    <p style={{
                        color: 'var(--text-muted)',
                        fontSize: '0.7rem',
                        fontWeight: '700',
                        margin: '0 0 0.5rem 0',
                        letterSpacing: '0.06em'
                    }}>
                        ALTERNATIVE TITLES
                    </p>

                    {unique.map((t, i) => (
                        <p
                            key={i}
                            style={{
                                color: 'var(--text-main)',
                                fontSize: '0.82rem',
                                margin: '0.2rem 0',
                                lineHeight: 1.35
                            }}
                        >
                            {t}
                        </p>
                    ))}
                </div>
            )}
        </span>
    );
}