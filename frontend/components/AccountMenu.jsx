import { useEffect, useRef, useState } from 'react';
import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import Link from 'next/link';

export default function AccountMenu() {
    const { isLoaded, isSignedIn } = useAuth();
    const { user } = useUser();
    const { redirectToSignIn, openUserProfile, signOut } = useClerk();

    const [open, setOpen] = useState(false);
    const [profile, setProfile] = useState(null);
    const ref = useRef(null);

    const loadPublicProfile = async () => {
        if (!isSignedIn) {
            setProfile(null);
            return;
        }

        try {
            const res = await fetch('/api/user/profile', {
                cache: 'no-store',
            });

            if (!res.ok) return;

            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) return;

            const data = await res.json();
            setProfile(data.profile || null);
        } catch (err) {
            console.error('[AccountMenu] Failed to load public profile:', err);
        }
    };

    useEffect(() => {
        if (isLoaded && isSignedIn) {
            loadPublicProfile();
        }
    }, [isLoaded, isSignedIn]);

    useEffect(() => {
        const handleProfileUpdated = () => {
            loadPublicProfile();
        };

        window.addEventListener('mymanga-profile-updated', handleProfileUpdated);
        window.addEventListener('focus', handleProfileUpdated);

        return () => {
            window.removeEventListener('mymanga-profile-updated', handleProfileUpdated);
            window.removeEventListener('focus', handleProfileUpdated);
        };
    }, [isSignedIn]);

    useEffect(() => {
        if (!open) return;

        const handleOutside = (e) => {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
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

    if (!isLoaded) return null;

    if (!isSignedIn) {
        return (
            <button
                onClick={() => redirectToSignIn()}
                style={{
                    padding: '0.45rem 0.8rem',
                    borderRadius: '999px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--card-bg)',
                    color: 'var(--text-main)',
                    fontWeight: 700,
                    cursor: 'pointer',
                }}
            >
                Sign In
            </button>
        );
    }

    const displayName =
        profile?.displayName ||
        profile?.username ||
        user?.firstName ||
        user?.username ||
        'Account';

    const username =
        profile?.username ||
        user?.username ||
        '';

    const email = user?.primaryEmailAddress?.emailAddress || '';

    return (
        <div ref={ref} style={{ position: 'relative' }}>
            <button
                onClick={() => setOpen((v) => !v)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem',
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '999px',
                    padding: '0.25rem 0.65rem 0.25rem 0.25rem',
                    cursor: 'pointer',
                    color: 'var(--text-main)',
                }}
                title="Account"
            >
                <img
                    src={profile?.avatarUrl || user?.imageUrl || '/placeholder.png'}
                    alt=""
                    style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                    }}
                />

                <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>
                    {displayName}
                </span>
            </button>

            {open && (
                <div
                    style={{
                        position: 'absolute',
                        right: 0,
                        top: '115%',
                        width: '250px',
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '16px',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.35)',
                        zIndex: 10000,
                        overflow: 'hidden',
                    }}
                >
                    <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid var(--border-color)' }}>
                        <p style={{ margin: 0, color: 'var(--text-main)', fontWeight: 800 }}>
                            {displayName}
                        </p>

                        {username && (
                            <p style={{ margin: '0.2rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
                                @{username}
                            </p>
                        )}

                        {email && (
                            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                                {email}
                            </p>
                        )}
                    </div>

                    <Link
                        href="/profile"
                        onClick={() => setOpen(false)}
                        style={{
                            display: 'block',
                            padding: '0.8rem 1rem',
                            color: 'var(--text-main)',
                            textDecoration: 'none',
                            fontWeight: 700,
                        }}
                    >
                        Public Profile
                    </Link>

                    <button
                        onClick={() => {
                            setOpen(false);
                            openUserProfile();
                        }}
                        style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '0.8rem 1rem',
                            background: 'transparent',
                            border: 'none',
                            borderTop: '1px solid var(--border-color)',
                            color: 'var(--text-main)',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        Manage Account
                    </button>

                    <button
                        onClick={() => signOut()}
                        style={{
                            display: 'block',
                            width: '100%',
                            textAlign: 'left',
                            padding: '0.8rem 1rem',
                            background: 'transparent',
                            border: 'none',
                            borderTop: '1px solid var(--border-color)',
                            color: '#ff6b6b',
                            fontWeight: 700,
                            cursor: 'pointer',
                        }}
                    >
                        Sign Out
                    </button>
                </div>
            )}
        </div>
    );
}