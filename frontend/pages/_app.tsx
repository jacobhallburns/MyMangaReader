import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ClerkProvider, UserButton, useAuth } from '@clerk/nextjs'; 
import { dark } from '@clerk/themes';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// 1. This component handles the UI and the Database Syncing
function ThemeWrapper({ Component, pageProps, isDark, setIsDark }: any) {
  const [mounted, setMounted] = useState(false);
  const { isLoaded, isSignedIn } = useAuth(); 

  // Handle mounting to prevent Hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch theme from MongoDB when the user signs in
  useEffect(() => {
    if (mounted && isLoaded && isSignedIn) {
      fetch('/api/user/config')
        .then((res) => res.json())
        .then((data) => {
          const isDarkTheme = data.theme === 'dark';
          setIsDark(isDarkTheme);
          if (isDarkTheme) document.body.classList.add('dark-theme');
          else document.body.classList.remove('dark-theme');
        })
        .catch((err) => console.error("Failed to load theme from DB", err));
    } else if (mounted) {
        // Fallback for logged-out users
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
          setIsDark(true);
          document.body.classList.add('dark-theme');
        }
    }
  }, [mounted, isLoaded, isSignedIn, setIsDark]);

  const addMangaToList = async (kitsuData: any, status: string = 'plan_to_read') => {
    if (!isSignedIn) {
      alert("Please sign in to add manga to your list!");
      return;
    }

    try {
      const response = await fetch('/api/manga/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kitsuData, status }),
      });

      if (response.ok) {
        alert(`${kitsuData.attributes.canonicalTitle} added to your list!`);
      }
    } catch (err) {
      console.error("Error adding manga:", err);
    }
  };

  if (!mounted) return null;

  return (
    <div className={isDark ? 'dark-theme' : ''}>
      <div style={{ background: 'var(--bg-color)', borderBottom: '2px solid var(--border-color)' }}>
        <header style={{ 
            maxWidth: '1000px', 
            margin: '0 auto', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '1rem',
            flexWrap: 'wrap',
            gap: '1rem' 
        }}>
          <h1 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.5rem' }}>My Manga Reader</h1>
          <nav style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <Link href="/manga-list" style={{ fontWeight: 600, color: 'var(--text-main)' }}>Manga List</Link>
            <Link href="/recommendation" style={{ fontWeight: 600, color: 'var(--text-main)' }}>Recommendations</Link>
            <Link href="/search" style={{ fontWeight: 600, color: 'var(--text-main)' }}>Add Manga</Link>
            
            {/* Theme Toggle Button is now handled by the parent's toggle function via props if needed, 
                but we'll define it here for simplicity since we have access to setIsDark */}
            <button 
              onClick={async () => {
                const newTheme = !isDark ? 'dark' : 'light';
                setIsDark(!isDark);
                if (!isDark) document.body.classList.add('dark-theme');
                else document.body.classList.remove('dark-theme');
                localStorage.setItem('theme', newTheme);

                if (isSignedIn) {
                  await fetch('/api/user/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ theme: newTheme }),
                  });
                }
              }} 
              style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', padding: '0.2rem 0.5rem' }}
            >
              {isDark ? '☀️' : '🌙'}
            </button>
            <UserButton />
          </nav>
        </header>
      </div>
      <Component {...pageProps} isDark={isDark} addMangaToList={addMangaToList} />
    </div>
  );
}

// 2. The Root App provides the SINGLE ClerkProvider
export default function App(props: AppProps) {
  const [isDark, setIsDark] = useState(false);

  return (
    <ClerkProvider 
      {...props.pageProps}
      afterSignOutUrl="/"
      appearance={{
        baseTheme: isDark ? dark : undefined,
        variables: { colorPrimary: '#cc0000' }
      }}
    >
      <ThemeWrapper {...props} isDark={isDark} setIsDark={setIsDark} />
    </ClerkProvider>
  );
}