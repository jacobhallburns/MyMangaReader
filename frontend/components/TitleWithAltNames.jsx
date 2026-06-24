import { useState, useEffect, useRef, useMemo } from 'react';
import { useLang } from '../lib/LangContext';
import {
    extractRawTitlesFromMedia,
    resolvePrimaryTitle,
    resolveAltTitles,
} from '../lib/titleLocale';

function isUsableRawTitles(rawTitles) {
    return (
        rawTitles &&
        typeof rawTitles === 'object' &&
        rawTitles.primary &&
        typeof rawTitles.primary === 'object' &&
        Array.isArray(rawTitles.alt)
    );
}

function normalizeAltTitles(altTitles) {
    if (!Array.isArray(altTitles)) return [];

    return altTitles
        .map((item) => {
            if (typeof item === 'string') return item;
            if (item?.title) return item.title;
            return '';
        })
        .filter(Boolean);
}

export default function TitleWithAltNames({
    title,
    altTitles = [],
    rawTitles = null,
    mediaRaw = null,
    style = {},
}) {
    const { lang } = useLang();
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const { displayTitle, displayAlts } = useMemo(() => {
        if (isUsableRawTitles(rawTitles)) {
            return {
                displayTitle: resolvePrimaryTitle(rawTitles, lang) || title,
                displayAlts: resolveAltTitles(rawTitles, lang),
            };
        }

        if (mediaRaw) {
            const extracted = extractRawTitlesFromMedia(mediaRaw);

            return {
                displayTitle: resolvePrimaryTitle(extracted, lang) || title,
                displayAlts: resolveAltTitles(extracted, lang),
            };
        }

        return {
            displayTitle: title,
            displayAlts: normalizeAltTitles(altTitles),
        };
    }, [rawTitles, mediaRaw, lang, title, altTitles]);

    const unique = useMemo(() => {
        const seen = new Set();
        const displayKey = String(displayTitle || '').trim().toLowerCase();

        if (displayKey) seen.add(displayKey);

        return (displayAlts || []).filter((t) => {
            const key = String(t || '').trim().toLowerCase();

            if (!key || seen.has(key)) return false;

            seen.add(key);
            return true;
        });
    }, [displayAlts, displayTitle]);

    useEffect(() => {
        if (!open) return;

        const handleOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        };

        const handleKey = (e) => {
            if (e.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handleOutside);
        document.addEventListener('keydown', handleKey);

        return () => {
            document.removeEventListener('mousedown', handleOutside);
            document.removeEventListener('keydown', handleKey);
        };
    }, [open]);

    if (!unique.length) {
        return <span style={style}>{displayTitle}</span>;
    }

    return (
        <span ref={ref} style={{ position: 'relative', display: 'inline' }}>
            <span
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen((o) => !o);
                }}
                style={{
                    cursor: 'pointer',
                    textDecoration: 'underline dotted',
                    textUnderlineOffset: '3px',
                    ...style,
                }}
                title="Click to see alternative titles"
            >
                {displayTitle}
            </span>

            {open && (
                <div
                    style={{
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
                    }}
                >
                    <p
                        style={{
                            color: 'var(--text-muted)',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            margin: '0 0 0.5rem 0',
                            letterSpacing: '0.06em',
                        }}
                    >
                        ALTERNATIVE TITLES
                    </p>

                    {unique.map((t, i) => (
                        <p
                            key={i}
                            style={{
                                color: 'var(--text-main)',
                                fontSize: '0.82rem',
                                margin: '0.2rem 0',
                                lineHeight: 1.35,
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