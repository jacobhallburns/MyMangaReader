import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ClerkProvider, UserButton, useAuth } from '@clerk/nextjs'; 
import { dark } from '@clerk/themes';
import { useState, useEffect } from 'react';
import Link from 'next/link';

function ThemeWrapper({ Component, pageProps }: AppProps) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { isLoaded, isSignedIn } = useAuth(); 

  // 1. Handle mounting to prevent Hydration/Client-side errors
  useEffect(() => {
    setMounted(true);
  }, []);

  // 2. Handle theme fetching
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
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
          setIsDark(true);
          document.body.classList.add('dark-theme');
        }
    }
  }, [mounted, isLoaded, isSignedIn]);

  const toggleTheme = async () => {
    const newTheme = !isDark ? 'dark' : 'light';
    if (!isDark) {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    }
    setIsDark(!isDark);

    if (isSignedIn) {
      await fetch('/api/user/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      });
    }
  };

  // Prevent rendering until mounted to avoid the client-side exception
  if (!mounted) {
    return null;
  }

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
            <button onClick={toggleTheme} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', padding: '0.2rem 0.5rem' }}>
              {isDark ? '☀️' : '🌙'}
            </button>
            <UserButton afterSignOutUrl="/sign-in" />
          </nav>
        </header>
      </div>
      <Component {...pageProps} isDark={isDark} />
    </div>
  );
}

export default function App(props: AppProps) {
  // We apply the 'appearance' here so it affects all Clerk components globally
  // We use props.pageProps.isDark if available, or just rely on the wrapper's state
  return (
    <ClerkProvider {...props.pageProps}>
      <ThemeWrapper {...props} />
    </ClerkProvider>
  );
}