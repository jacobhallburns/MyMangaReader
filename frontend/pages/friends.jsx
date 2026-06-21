import { useEffect, useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';

function UserCard({ friendship, type, onAction }) {
  const user = friendship.otherUser;

  if (!user) {
    return (
      <div style={cardStyle}>
        <p style={{ margin: 0, color: 'var(--text-main)', fontWeight: 800 }}>
          Unknown user
        </p>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)' }}>
          This profile may have been deleted.
        </p>
      </div>
    );
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
        <img
          src={user.avatarUrl || '/placeholder.png'}
          alt=""
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '1px solid var(--border-color)',
          }}
        />

        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, color: 'var(--text-main)', fontWeight: 900 }}>
            {user.displayName || user.username}
          </p>

          <p style={{ margin: '0.15rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            @{user.username}
          </p>

          {user.bio && (
            <p style={{ margin: '0.45rem 0 0', color: 'var(--text-main)', fontSize: '0.9rem' }}>
              {user.bio}
            </p>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', flexWrap: 'wrap' }}>
        {type === 'incoming' && (
          <>
            <button
              onClick={() => onAction(friendship.id, 'accept')}
              style={primaryButtonStyle}
            >
              Accept
            </button>

            <button
              onClick={() => onAction(friendship.id, 'decline')}
              style={secondaryButtonStyle}
            >
              Decline
            </button>
          </>
        )}

        {type === 'outgoing' && (
          <button
            onClick={() => onAction(friendship.id, 'remove')}
            style={secondaryButtonStyle}
          >
            Cancel Request
          </button>
        )}

        {type === 'friend' && (
          <button
            onClick={() => onAction(friendship.id, 'remove')}
            style={dangerButtonStyle}
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
      console.warn('[FriendsPage] loadFriends failed');
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
      console.warn('[FriendsPage] sendRequest failed');
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
      console.warn('[FriendsPage] handleAction failed');
      setError('Failed to update friend request.');
    }
  };

  if (!isLoaded || loading) {
    return (
      <main style={pageStyle}>
        <section style={panelStyle}>
          <p style={{ color: 'var(--text-main)', margin: 0 }}>Loading friends...</p>
        </section>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main style={pageStyle}>
        <section style={panelStyle}>
          <h2 style={titleStyle}>Friends</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Sign in to add friends and manage your friend requests.
          </p>
          <button onClick={() => redirectToSignIn()} style={primaryButtonStyle}>
            Sign In
          </button>
        </section>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={panelStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h2 style={titleStyle}>Friends</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Add friends by username and manage your friend requests.
            </p>
          </div>
        </div>

        <form onSubmit={sendRequest} style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter username"
            style={inputStyle}
          />

          <button disabled={sending} type="submit" style={primaryButtonStyle}>
            {sending ? 'Sending...' : 'Send Request'}
          </button>
        </form>

        {message && (
          <p style={{ color: '#22c55e', fontWeight: 700, marginTop: '1rem' }}>
            {message}
          </p>
        )}

        {error && (
          <p style={{ color: '#ff6b6b', fontWeight: 700, marginTop: '1rem' }}>
            {error}
          </p>
        )}
      </section>

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Incoming Requests</h3>

        {incomingRequests.length === 0 ? (
          <p style={emptyStyle}>No incoming requests.</p>
        ) : (
          <div style={gridStyle}>
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

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Friends</h3>

        {friends.length === 0 ? (
          <p style={emptyStyle}>No friends yet.</p>
        ) : (
          <div style={gridStyle}>
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

      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Outgoing Requests</h3>

        {outgoingRequests.length === 0 ? (
          <p style={emptyStyle}>No outgoing requests.</p>
        ) : (
          <div style={gridStyle}>
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
    </main>
  );
}

const pageStyle = {
  maxWidth: '1000px',
  margin: '0 auto',
  padding: '2rem 1rem',
};

const panelStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border-color)',
  borderRadius: '18px',
  padding: '1.5rem',
  boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
};

const sectionStyle = {
  marginTop: '1.5rem',
};

const titleStyle = {
  margin: 0,
  color: 'var(--text-main)',
  fontSize: '2rem',
};

const sectionTitleStyle = {
  margin: '0 0 0.75rem',
  color: 'var(--text-main)',
  fontSize: '1.35rem',
};

const gridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
  gap: '1rem',
};

const cardStyle = {
  background: 'var(--card-bg)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '1rem',
};

const inputStyle = {
  flex: '1 1 260px',
  padding: '0.75rem 0.9rem',
  borderRadius: '12px',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-color)',
  color: 'var(--text-main)',
  fontSize: '1rem',
};

const primaryButtonStyle = {
  padding: '0.7rem 1rem',
  borderRadius: '12px',
  border: 'none',
  background: '#cc0000',
  color: 'white',
  fontWeight: 800,
  cursor: 'pointer',
};

const secondaryButtonStyle = {
  padding: '0.7rem 1rem',
  borderRadius: '12px',
  border: '1px solid var(--border-color)',
  background: 'var(--bg-color)',
  color: 'var(--text-main)',
  fontWeight: 800,
  cursor: 'pointer',
};

const dangerButtonStyle = {
  padding: '0.7rem 1rem',
  borderRadius: '12px',
  border: '1px solid rgba(255, 107, 107, 0.45)',
  background: 'transparent',
  color: '#ff6b6b',
  fontWeight: 800,
  cursor: 'pointer',
};

const emptyStyle = {
  color: 'var(--text-muted)',
  background: 'var(--card-bg)',
  border: '1px solid var(--border-color)',
  borderRadius: '16px',
  padding: '1rem',
  margin: 0,
};