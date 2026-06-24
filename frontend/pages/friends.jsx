import { useEffect, useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';

function UserCard({ friendship, type, onAction }) {
  const user = friendship.otherUser;

  if (!user) {
    return (
      <div className="friend-card">
        <p className="friend-name">Unknown user</p>
        <p className="friend-subtext">This profile may have been deleted.</p>
      </div>
    );
  }

  const displayName = user.displayName || user.username || 'User';
  const username = user.username || '';
  const firstLetter = displayName.charAt(0).toUpperCase();

  return (
    <div className="friend-card">
      <div className="friend-card-main">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="friend-avatar"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="friend-avatar friend-avatar-fallback">
            {firstLetter}
          </div>
        )}

        <div className="friend-info">
          <p className="friend-name">{displayName}</p>

          {username && (
            <p className="friend-subtext">@{username}</p>
          )}

          {user.bio && (
            <p className="friend-bio">{user.bio}</p>
          )}
        </div>
      </div>

      <div className="friend-actions">
        {type === 'incoming' && (
          <>
            <button
              onClick={() => onAction(friendship.id, 'accept')}
              className="primary-button small-button"
            >
              Accept
            </button>

            <button
              onClick={() => onAction(friendship.id, 'decline')}
              className="secondary-button small-button"
            >
              Decline
            </button>
          </>
        )}

        {type === 'outgoing' && (
          <button
            onClick={() => onAction(friendship.id, 'remove')}
            className="secondary-button small-button"
          >
            Cancel Request
          </button>
        )}

        {type === 'friend' && (
          <button
            onClick={() => onAction(friendship.id, 'remove')}
            className="danger-button small-button"
          >
            Remove Friend
          </button>
        )}
      </div>
    </div>
  );
}

export default function FriendsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { redirectToSignIn } = useClerk();

  const [username, setUsername] = useState('');
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);

  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const loadFriends = async () => {
    if (!isSignedIn) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/friends', {
        cache: 'no-store',
      });

      const contentType = res.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        setError('Friends API did not return JSON.');
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load friends.');
        return;
      }

      setFriends(data.friends || []);
      setIncomingRequests(data.incomingRequests || []);
      setOutgoingRequests(data.outgoingRequests || []);
    } catch (err) {
      console.warn('[FriendsPage] loadFriends failed', err);
      setError('Failed to load friends.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadFriends();
    } else if (isLoaded) {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  const sendRequest = async (e) => {
    e.preventDefault();

    const cleanedUsername = username.trim();

    if (!cleanedUsername) {
      setError('Enter a username.');
      setMessage('');
      return;
    }

    setSending(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanedUsername }),
      });

      const contentType = res.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        setError('Friend request API did not return JSON.');
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send friend request.');
        return;
      }

      setUsername('');
      setMessage(data.message || 'Friend request sent.');
      await loadFriends();
    } catch (err) {
      console.warn('[FriendsPage] sendRequest failed', err);
      setError('Failed to send friend request.');
    } finally {
      setSending(false);
    }
  };

  const handleAction = async (friendshipId, action) => {
    setMessage('');
    setError('');

    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action }),
      });

      const contentType = res.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        setError('Friend response API did not return JSON.');
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to update friend request.');
        return;
      }

      setMessage(data.message || 'Updated.');
      await loadFriends();
    } catch (err) {
      console.warn('[FriendsPage] handleAction failed', err);
      setError('Failed to update friend request.');
    }
  };

  if (!isLoaded || loading) {
    return (
      <main className="friends-page">
        <div className="friends-inner">
          <section className="friends-panel">
            <div className="skeleton-title" />
            <div className="skeleton-line" />
          </section>
        </div>

        <style jsx global>{styles}</style>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="friends-page">
        <div className="friends-inner">
          <section className="friends-panel">
            <h2 className="friends-title">Friends</h2>

            <p className="friends-copy">
              Sign in to add friends and manage your friend requests.
            </p>

            <button onClick={() => redirectToSignIn()} className="primary-button">
              Sign In
            </button>
          </section>
        </div>

        <style jsx global>{styles}</style>
      </main>
    );
  }

  return (
    <main className="friends-page">
      <div className="friends-inner">
        <section className="friends-panel hero-panel">
          <div className="friends-hero-text">
            <h2 className="friends-title">Friends</h2>

            <p className="friends-copy">
              Add friends by username and manage your friend requests.
            </p>
          </div>

          <form onSubmit={sendRequest} className="friend-request-form">
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              className="friend-input"
            />

            <button disabled={sending} type="submit" className="primary-button send-button">
              {sending ? 'Sending...' : 'Send Request'}
            </button>
          </form>

          {message && (
            <p className="success-message">
              {message}
            </p>
          )}

          {error && (
            <p className="error-message">
              {error}
            </p>
          )}
        </section>

        <section className="friends-section">
          <div className="section-heading-row">
            <h3 className="section-title">Incoming Requests</h3>
            <span className="count-pill">{incomingRequests.length}</span>
          </div>

          {incomingRequests.length === 0 ? (
            <p className="empty-card">No incoming requests.</p>
          ) : (
            <div className="friend-grid">
              {incomingRequests.map((friendship) => (
                <UserCard
                  key={friendship.id}
                  friendship={friendship}
                  type="incoming"
                  onAction={handleAction}
                />
              ))}
            </div>
          )}
        </section>

        <section className="friends-section">
          <div className="section-heading-row">
            <h3 className="section-title">Friends</h3>
            <span className="count-pill">{friends.length}</span>
          </div>

          {friends.length === 0 ? (
            <p className="empty-card">No friends yet.</p>
          ) : (
            <div className="friend-grid">
              {friends.map((friendship) => (
                <UserCard
                  key={friendship.id}
                  friendship={friendship}
                  type="friend"
                  onAction={handleAction}
                />
              ))}
            </div>
          )}
        </section>

        <section className="friends-section">
          <div className="section-heading-row">
            <h3 className="section-title">Outgoing Requests</h3>
            <span className="count-pill">{outgoingRequests.length}</span>
          </div>

          {outgoingRequests.length === 0 ? (
            <p className="empty-card">No outgoing requests.</p>
          ) : (
            <div className="friend-grid">
              {outgoingRequests.map((friendship) => (
                <UserCard
                  key={friendship.id}
                  friendship={friendship}
                  type="outgoing"
                  onAction={handleAction}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      <style jsx global>{styles}</style>
    </main>
  );
}

const styles = `
  .friends-page {
    min-height: 100vh;
    background: var(--bg-color);
    padding: 2rem 1rem 4rem;
  }

  .friends-inner {
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
  }

  .friends-panel,
  .friend-card,
  .empty-card {
    background: linear-gradient(145deg, var(--card-bg), rgba(204, 0, 0, 0.035));
    border: 1px solid var(--border-color);
    box-shadow: 0 10px 26px rgba(0,0,0,0.18);
  }

  .friends-panel {
    border-radius: 22px;
    padding: 1.5rem;
  }

  .hero-panel {
    margin-bottom: 1.5rem;
  }

  .friends-title {
    margin: 0;
    color: var(--text-main);
    font-size: 2rem;
    font-weight: 900;
    letter-spacing: 0.01em;
  }

  .friends-copy {
    color: var(--text-muted);
    line-height: 1.5;
    margin: 0.45rem 0 0;
  }

  .friend-request-form {
    margin-top: 1.25rem;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
  }

  .friend-input {
    width: 100%;
    min-width: 0;
    padding: 0.78rem 0.9rem;
    border-radius: 12px;
    border: 1px solid var(--border-color);
    background: var(--bg-color);
    color: var(--text-main);
    font-size: 1rem;
    outline: none;
  }

  .friend-input:focus {
    border-color: #cc0000;
    box-shadow: 0 0 0 3px rgba(204, 0, 0, 0.16);
  }

  .primary-button,
  .secondary-button,
  .danger-button {
    border-radius: 12px;
    padding: 0.72rem 1rem;
    font-weight: 900;
    cursor: pointer;
    transition: transform 0.15s ease, opacity 0.15s ease;
  }

  .primary-button:hover,
  .secondary-button:hover,
  .danger-button:hover {
    transform: translateY(-1px);
  }

  .primary-button:disabled {
    opacity: 0.65;
    cursor: not-allowed;
  }

  .primary-button {
    border: none;
    background: linear-gradient(135deg, #cc0000, #ef4444);
    color: white;
    box-shadow: 0 10px 22px rgba(204, 0, 0, 0.2);
  }

  .secondary-button {
    border: 1px solid var(--border-color);
    background: var(--bg-color);
    color: var(--text-main);
  }

  .danger-button {
    border: 1px solid rgba(255, 107, 107, 0.45);
    background: transparent;
    color: #ff6b6b;
  }

  .small-button {
    padding: 0.62rem 0.9rem;
    font-size: 0.86rem;
  }

  .send-button {
    white-space: nowrap;
  }

  .success-message,
  .error-message {
    font-weight: 800;
    margin: 1rem 0 0;
    border-radius: 12px;
    padding: 0.7rem 0.9rem;
  }

  .success-message {
    color: #22c55e;
    background: rgba(34, 197, 94, 0.1);
    border: 1px solid rgba(34, 197, 94, 0.25);
  }

  .error-message {
    color: #ff6b6b;
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid rgba(255, 107, 107, 0.25);
  }

  .friends-section {
    margin-top: 1.5rem;
  }

  .section-heading-row {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin-bottom: 0.75rem;
  }

  .section-title {
    margin: 0;
    color: var(--text-main);
    font-size: 1.35rem;
    font-weight: 900;
  }

  .count-pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 26px;
    height: 26px;
    padding: 0 0.45rem;
    border-radius: 999px;
    background: var(--card-bg);
    color: var(--text-muted);
    border: 1px solid var(--border-color);
    font-weight: 900;
    font-size: 0.78rem;
  }

  .friend-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1rem;
  }

  .friend-card {
    border-radius: 18px;
    padding: 1rem;
    min-width: 0;
  }

  .friend-card-main {
    display: flex;
    align-items: flex-start;
    gap: 0.9rem;
    min-width: 0;
  }

  .friend-avatar {
    width: 50px;
    height: 50px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--border-color);
    background: var(--bg-color);
    flex-shrink: 0;
  }

  .friend-avatar-fallback {
    display: grid;
    place-items: center;
    color: white;
    background: linear-gradient(135deg, #0284c7, #0ea5e9);
    font-weight: 900;
    font-size: 1.15rem;
  }

  .friend-info {
    min-width: 0;
    flex: 1;
  }

  .friend-name {
    margin: 0;
    color: var(--text-main);
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .friend-subtext {
    margin: 0.18rem 0 0;
    color: var(--text-muted);
    font-size: 0.88rem;
    overflow-wrap: anywhere;
  }

  .friend-bio {
    margin: 0.5rem 0 0;
    color: var(--text-main);
    font-size: 0.9rem;
    line-height: 1.45;
  }

  .friend-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }

  .empty-card {
    color: var(--text-muted);
    border-radius: 16px;
    padding: 1rem;
    margin: 0;
  }

  .skeleton-title,
  .skeleton-line {
    border-radius: 999px;
    background: linear-gradient(90deg, var(--bg-color), var(--border-color), var(--bg-color));
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .skeleton-title {
    width: 170px;
    height: 32px;
    margin-bottom: 1rem;
  }

  .skeleton-line {
    width: 260px;
    height: 18px;
  }

  @keyframes shimmer {
    from {
      background-position: 200% 0;
    }

    to {
      background-position: -200% 0;
    }
  }

  @media (max-width: 640px) {
    .friends-page {
      padding: 1.15rem 0.75rem 3rem;
    }

    .friends-panel {
      padding: 1rem;
      border-radius: 18px;
    }

    .friends-title {
      font-size: 1.7rem;
    }

    .friend-request-form {
      grid-template-columns: 1fr;
      gap: 0.65rem;
    }

    .send-button {
      width: 100%;
    }

    .section-title {
      font-size: 1.15rem;
    }

    .friend-grid {
      grid-template-columns: 1fr;
      gap: 0.85rem;
    }

    .friend-card {
      padding: 0.85rem;
      border-radius: 16px;
    }

    .friend-avatar {
      width: 44px;
      height: 44px;
    }

    .friend-actions {
      gap: 0.45rem;
    }

    .small-button {
      flex: 1 1 auto;
      padding: 0.62rem 0.75rem;
    }
  }

  @media (max-width: 360px) {
    .friend-card-main {
      gap: 0.7rem;
    }

    .friend-avatar {
      width: 40px;
      height: 40px;
    }

    .small-button {
      width: 100%;
    }
  }
`;