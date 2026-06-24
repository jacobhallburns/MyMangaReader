import { useEffect, useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import Link from 'next/link';

function timeAgo(dateValue) {
  if (!dateValue) return '';

  const date = new Date(dateValue);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (Number.isNaN(seconds)) return '';

  if (seconds < 30) return 'just now';
  if (seconds < 60) return `${seconds} seconds ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} ago`;

  const years = Math.floor(days / 365);
  return `${years} year${years === 1 ? '' : 's'} ago`;
}

function normalizeStatus(status) {
  return String(status || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-/g, '_');
}

function cleanStatus(status) {
  return String(status || '').replace(/_/g, ' ');
}

function getStatusVisual(status) {
  const normalized = normalizeStatus(status);

  if (normalized === 'completed') {
    return {
      label: 'Completed',
      accent: '#22c55e',
      soft: 'rgba(34, 197, 94, 0.14)',
    };
  }

  if (normalized === 'reading') {
    return {
      label: 'Reading',
      accent: '#38bdf8',
      soft: 'rgba(56, 189, 248, 0.14)',
    };
  }

  if (normalized === 'plan_to_read' || normalized === 'planned') {
    return {
      label: 'Plan to Read',
      accent: '#f59e0b',
      soft: 'rgba(245, 158, 11, 0.14)',
    };
  }

  if (normalized === 'on_hold') {
    return {
      label: 'On Hold',
      accent: '#a78bfa',
      soft: 'rgba(167, 139, 250, 0.14)',
    };
  }

  if (normalized === 'dropped') {
    return {
      label: 'Dropped',
      accent: '#ef4444',
      soft: 'rgba(239, 68, 68, 0.14)',
    };
  }

  return {
    label: cleanStatus(status) || 'Updated',
    accent: '#cc0000',
    soft: 'rgba(204, 0, 0, 0.14)',
  };
}

function ActivityCard({ activity }) {
  const friend = activity.friend || {};
  const manga = activity.manga || {};
  const visual = getStatusVisual(activity.status);

  const friendName = friend.displayName || friend.username || 'A friend';
  const username = friend.username ? `@${friend.username}` : '@unknown';
  const actionText = activity.actionText || activity.statusText || 'updated';
  const mangaTitle = manga.title || 'a manga';
  const cover = manga.posterImage || manga.coverImage || '/placeholder.png';
  const avatar = friend.avatarUrl || '/placeholder.png';

  return (
    <article
      className="activity-card"
      style={{
        '--accent': visual.accent,
        '--accent-soft': visual.soft,
      }}
    >
      <div className="accent-bar" />

      <img src={cover} alt="" className="manga-cover" referrerPolicy="no-referrer" />

      <div className="activity-body">
        <div className="top-row">
          <div className="friend-cluster">
            <img src={avatar} alt="" className="friend-avatar" referrerPolicy="no-referrer" />

            <div className="friend-text">
              <div className="friend-line">
                <span className="friend-name">{friendName}</span>
                <span className="username">{username}</span>
              </div>

              {activity.updatedAt && (
                <p className="time-line">{timeAgo(activity.updatedAt)}</p>
              )}
            </div>
          </div>

          <span className="status-chip">{visual.label}</span>
        </div>

        <p className="action-line">
          {actionText}{' '}
          <span className="manga-title">{mangaTitle}</span>
        </p>

        <div className="detail-row">
          {activity.rating ? (
            <span className="detail-pill">★ {activity.rating}/10</span>
          ) : null}

          {activity.progress ? (
            <span className="detail-pill">Progress {activity.progress}</span>
          ) : null}

          {manga.genres?.slice?.(0, 2).map((genre) => (
            <span key={genre} className="detail-pill muted-pill">
              {genre}
            </span>
          ))}
        </div>

        {activity.notes && (
          <div className="notes-block">
            <span className="quote-mark">“</span>
            <p>{activity.notes}</p>
          </div>
        )}
      </div>
    </article>
  );
}

export default function FeedPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { redirectToSignIn } = useClerk();

  const [activities, setActivities] = useState([]);
  const [friendCount, setFriendCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [touchStartY, setTouchStartY] = useState(null);
  const [pullDistance, setPullDistance] = useState(0);

  const loadActivity = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setRefreshing(true);
    setError('');

    try {
      const res = await fetch('/api/friends/activity', {
        cache: 'no-store',
      });

      const contentType = res.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        setError('Activity API did not return JSON.');
        return;
      }

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to load activity.');
        return;
      }

      setFriendCount(data.friendCount || 0);
      setActivities(data.activities || []);
    } catch (err) {
      console.warn('[ActivityPage] loadActivity failed', err);
      setError('Failed to load activity.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setPullDistance(0);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      loadActivity();
    } else if (isLoaded) {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  const handleTouchStart = (e) => {
    if (window.scrollY === 0) {
      setTouchStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e) => {
    if (touchStartY === null || window.scrollY !== 0 || refreshing) return;

    const distance = e.touches[0].clientY - touchStartY;

    if (distance > 0) {
      setPullDistance(Math.min(distance, 90));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance >= 70 && !refreshing && isSignedIn) {
      loadActivity({ silent: true });
    } else {
      setPullDistance(0);
    }

    setTouchStartY(null);
  };

  if (!isLoaded || loading) {
    return (
      <main className="activity-page">
        <div className="page-inner">
          <section className="top-card">
            <div className="skeleton-title" />
            <div className="skeleton-line" />
          </section>
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  if (!isSignedIn) {
    return (
      <main className="activity-page">
        <div className="page-inner">
          <section className="top-card">
            <h2 className="title">Activity</h2>
            <p className="empty-copy">Sign in to see what your friends are reading.</p>

            <button onClick={() => redirectToSignIn()} className="primary-button">
              Sign In
            </button>
          </section>
        </div>

        <style jsx>{styles}</style>
      </main>
    );
  }

  const emptyTitle = friendCount === 0 ? 'Your activity page is waiting.' : 'Nothing new yet.';
  const emptyText = friendCount === 0
    ? 'Add friends to start seeing their manga updates, ratings, and notes here.'
    : 'When your friends update their manga lists, their activity will show up here.';

  return (
    <main
      className="activity-page"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="page-inner">
        <div
          className="pull-indicator"
          style={{
            height: pullDistance > 0 ? `${Math.max(26, pullDistance)}px` : '0px',
            opacity: pullDistance >= 70 || refreshing ? 1 : 0,
          }}
        >
          {refreshing ? 'Refreshing...' : pullDistance >= 70 ? 'Release to refresh' : ''}
        </div>

        <header className="page-header">
          <h2 className="title">Activity</h2>
          <div className="title-accent" />
        </header>

        {error && (
          <p className="error">{error}</p>
        )}

        {activities.length === 0 ? (
          <div className="empty-card">
            <div className="empty-icon">✦</div>
            <h3>{emptyTitle}</h3>
            <p>{emptyText}</p>

            <Link href="/friends" className="link-button">
              Manage Friends
            </Link>
          </div>
        ) : (
          <div className="activity-list">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </div>

      <style jsx>{styles}</style>
    </main>
  );
}

const styles = `
  .activity-page {
    min-height: 100vh;
    background: var(--bg-color);
    padding: 2rem 1rem 4rem;
  }

  .page-inner {
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 1.25rem;
  }

  .title {
    margin: 0;
    color: var(--text-main);
    font-size: 2.25rem;
    letter-spacing: 0.02em;
  }

  .title-accent {
    width: 72px;
    height: 4px;
    border-radius: 999px;
    background: linear-gradient(90deg, #cc0000, #ef4444);
    margin-top: 0.6rem;
  }

  .top-card,
  .empty-card,
  .activity-card {
    background: linear-gradient(145deg, var(--card-bg), rgba(204, 0, 0, 0.035));
    border: 1px solid var(--border-color);
    border-radius: 22px;
    box-shadow: 0 10px 26px rgba(0,0,0,0.18);
  }

  .top-card {
    padding: 1.5rem;
  }

  .activity-list {
    display: grid;
    gap: 1rem;
  }

  .activity-card {
    position: relative;
    overflow: hidden;
    display: grid;
    grid-template-columns: 82px minmax(0, 1fr);
    gap: 1rem;
    padding: 1rem;
  }

  .accent-bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 5px;
    background: var(--accent);
  }

  .manga-cover {
    width: 82px;
    height: 116px;
    border-radius: 14px;
    object-fit: cover;
    border: 1px solid var(--border-color);
    flex-shrink: 0;
    background: var(--bg-color);
    box-shadow: 0 8px 18px rgba(0,0,0,0.25);
  }

  .activity-body {
    min-width: 0;
  }

  .top-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 0.8rem;
  }

  .friend-cluster {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    min-width: 0;
  }

  .friend-avatar {
    width: 38px;
    height: 38px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid var(--accent);
    background: var(--bg-color);
    flex-shrink: 0;
  }

  .friend-text {
    min-width: 0;
  }

  .friend-line {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    flex-wrap: wrap;
  }

  .friend-name {
    color: var(--text-main);
    font-weight: 900;
  }

  .username,
  .time-line {
    color: var(--text-muted);
    font-size: 0.86rem;
  }

  .time-line {
    margin: 0.15rem 0 0;
  }

  .status-chip {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    color: var(--accent);
    background: var(--accent-soft);
    border: 1px solid var(--accent);
    border-radius: 999px;
    padding: 0.3rem 0.65rem;
    font-size: 0.78rem;
    font-weight: 900;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .action-line {
    margin: 0.75rem 0 0;
    color: var(--text-main);
    line-height: 1.45;
    font-size: 1.03rem;
  }

  .manga-title {
    color: #ff3b3b;
    font-weight: 900;
  }

  .detail-row {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
    margin-top: 0.75rem;
  }

  .detail-pill {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    color: var(--text-main);
    background: var(--bg-color);
    border: 1px solid var(--border-color);
    border-radius: 999px;
    padding: 0.25rem 0.6rem;
    font-size: 0.78rem;
    font-weight: 900;
  }

  .muted-pill {
    color: var(--text-muted);
  }

  .notes-block {
    position: relative;
    margin-top: 0.9rem;
    color: var(--text-main);
    padding: 0.2rem 0 0.1rem 1rem;
    border-left: 3px solid var(--accent);
    line-height: 1.5;
  }

  .notes-block p {
    margin: 0;
  }

  .quote-mark {
    position: absolute;
    left: 0.2rem;
    top: -0.25rem;
    color: var(--accent);
    opacity: 0.45;
    font-size: 1.6rem;
    font-weight: 900;
  }

  .empty-card {
    padding: 1.6rem;
    text-align: left;
  }

  .empty-card h3 {
    margin: 0;
    color: var(--text-main);
  }

  .empty-card p,
  .empty-copy {
    color: var(--text-muted);
    line-height: 1.5;
  }

  .empty-icon {
    width: 46px;
    height: 46px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    color: white;
    background: linear-gradient(135deg, #cc0000, #f59e0b);
    margin-bottom: 0.9rem;
    font-weight: 900;
  }

  .primary-button,
  .link-button {
    display: inline-block;
    border: none;
    border-radius: 13px;
    background: linear-gradient(135deg, #cc0000, #ef4444);
    color: white;
    padding: 0.75rem 1rem;
    font-weight: 900;
    cursor: pointer;
    text-decoration: none;
    box-shadow: 0 10px 22px rgba(204, 0, 0, 0.22);
  }

  .error {
    color: #ff6b6b;
    font-weight: 800;
    margin: 1rem 0;
    background: rgba(255, 107, 107, 0.1);
    border: 1px solid rgba(255, 107, 107, 0.25);
    border-radius: 14px;
    padding: 0.8rem 1rem;
  }

  .pull-indicator {
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    font-weight: 900;
    transition: height 0.18s ease, opacity 0.18s ease;
  }

  .skeleton-title,
  .skeleton-line {
    border-radius: 999px;
    background: linear-gradient(90deg, var(--bg-color), var(--border-color), var(--bg-color));
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
  }

  .skeleton-title {
    width: 180px;
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

  @media (max-width: 560px) {
    .activity-page {
      padding: 1.25rem 0.8rem 3rem;
    }

    .title {
      font-size: 1.8rem;
    }

    .activity-card {
      grid-template-columns: 64px minmax(0, 1fr);
      gap: 0.8rem;
      padding: 0.85rem;
      border-radius: 18px;
    }

    .manga-cover {
      width: 64px;
      height: 92px;
      border-radius: 12px;
    }

    .friend-avatar {
      width: 34px;
      height: 34px;
    }

    .top-row {
      flex-direction: column;
      gap: 0.55rem;
    }

    .status-chip {
      font-size: 0.72rem;
      padding: 0.25rem 0.55rem;
    }

    .action-line {
      font-size: 0.95rem;
      margin-top: 0.65rem;
    }

    .detail-pill {
      font-size: 0.72rem;
      padding: 0.22rem 0.55rem;
    }
  }

  @media (max-width: 360px) {
    .activity-card {
      grid-template-columns: 58px minmax(0, 1fr);
    }

    .manga-cover {
      width: 58px;
      height: 84px;
    }
  }
`;