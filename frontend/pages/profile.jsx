import { useEffect, useState } from 'react';
import { useAuth, useUser, useClerk } from '@clerk/nextjs';

export default function ProfilePage() {
    const { isLoaded, isSignedIn } = useAuth();
    const { user } = useUser();
    const { redirectToSignIn } = useClerk();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [username, setUsername] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [bio, setBio] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        if (!isLoaded) return;

        if (!isSignedIn) {
            setLoading(false);
            return;
        }

        const loadProfile = async () => {
            try {
                const res = await fetch('/api/user/profile');
                const data = await res.json();

                if (data.profile) {
                    setUsername(data.profile.username || '');
                    setDisplayName(data.profile.displayName || '');
                    setBio(data.profile.bio || '');
                } else {
                    const fallbackName =
                        user?.username ||
                        user?.firstName ||
                        user?.primaryEmailAddress?.emailAddress?.split('@')[0] ||
                        '';

                    setUsername(fallbackName.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20).toLowerCase());
                    setDisplayName(user?.fullName || fallbackName);
                    setBio('');
                }
            } catch (err) {
                setError('Failed to load profile.');
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [isLoaded, isSignedIn, user]);

    const saveProfile = async () => {
        setSaving(true);
        setMessage('');
        setError('');

        try {
            const res = await fetch('/api/user/profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    displayName,
                    bio,
                    avatarUrl: user?.imageUrl || '',
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Failed to save profile.');
            }

            setUsername(data.profile.username || '');
            setDisplayName(data.profile.displayName || '');
            setBio(data.profile.bio || '');
            setMessage('Profile saved.');
            window.dispatchEvent(new Event('mymanga-profile-updated'));
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    if (!isLoaded || loading) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-muted)' }}>Loading profile...</p>
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div style={{ minHeight: '100vh', background: 'var(--bg-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
                <div style={{ maxWidth: '420px', width: '100%', background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '2rem', textAlign: 'center' }}>
                    <h1 style={{ color: 'var(--text-main)', marginTop: 0 }}>Profile</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Sign in to create your profile.</p>
                    <button
                        onClick={() => redirectToSignIn()}
                        style={{ padding: '0.8rem 1.4rem', borderRadius: '12px', background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                    >
                        Sign In
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-color)', padding: '2rem 1rem' }}>
            <main style={{ maxWidth: '620px', margin: '0 auto' }}>
                <h1 style={{ color: 'var(--text-main)', fontSize: '2.3rem', marginBottom: '0.4rem' }}>Profile</h1>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>
                    This is what friends will see when they find you.
                </p>

                <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '24px', padding: '1.5rem', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                        <img
                            src={user?.imageUrl || '/placeholder.png'}
                            alt=""
                            style={{ width: '72px', height: '72px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border-color)' }}
                        />
                        <div>
                            <p style={{ margin: 0, color: 'var(--text-main)', fontWeight: 800 }}>
                                {displayName || username || 'Your profile'}
                            </p>
                            <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                {username ? `@${username}` : 'Choose a username'}
                            </p>
                        </div>
                    </div>

                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700 }}>
                        Username
                    </label>
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="example_user"
                        style={{ width: '100%', boxSizing: 'border-box', marginTop: '0.45rem', marginBottom: '0.45rem', padding: '0.85rem', borderRadius: '12px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '1rem' }}
                    />
                    <p style={{ margin: '0 0 1.2rem 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        3–20 characters. Letters, numbers, and underscores only.
                    </p>

                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700 }}>
                        Display Name
                    </label>
                    <input
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Your display name"
                        maxLength={40}
                        style={{ width: '100%', boxSizing: 'border-box', marginTop: '0.45rem', marginBottom: '1.2rem', padding: '0.85rem', borderRadius: '12px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '1rem' }}
                    />

                    <label style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700 }}>
                        Bio
                    </label>
                    <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder="Favorite genres, current reads, etc."
                        maxLength={160}
                        style={{ width: '100%', boxSizing: 'border-box', marginTop: '0.45rem', minHeight: '100px', padding: '0.85rem', borderRadius: '12px', background: 'var(--bg-color)', color: 'var(--text-main)', border: '1px solid var(--border-color)', fontSize: '1rem', resize: 'none' }}
                    />
                    <p style={{ textAlign: 'right', color: 'var(--text-muted)', fontSize: '0.75rem', margin: '0.35rem 0 1.2rem 0' }}>
                        {bio.length}/160
                    </p>

                    {error && (
                        <p style={{ color: '#ff6b6b', background: 'rgba(255, 107, 107, 0.1)', borderRadius: '10px', padding: '0.7rem 0.9rem', fontSize: '0.9rem' }}>
                            {error}
                        </p>
                    )}

                    {message && (
                        <p style={{ color: 'var(--accent-green)', background: 'rgba(0, 204, 102, 0.1)', borderRadius: '10px', padding: '0.7rem 0.9rem', fontSize: '0.9rem' }}>
                            {message}
                        </p>
                    )}

                    <button
                        onClick={saveProfile}
                        disabled={saving}
                        style={{ width: '100%', padding: '1rem', borderRadius: '14px', background: 'var(--text-main)', color: 'var(--bg-color)', border: 'none', fontWeight: 900, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}
                    >
                        {saving ? 'Saving...' : 'Save Profile'}
                    </button>
                </div>
            </main>
        </div>
    );
}