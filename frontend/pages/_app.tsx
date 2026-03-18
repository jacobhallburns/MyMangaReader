import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ClerkProvider } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function App({ Component, pageProps }: AppProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setIsDark(true);
      document.body.classList.add('dark-theme');
    }
  }, []);

  const toggleTheme = () => {
    if (isDark) {
      document.body.classList.remove('dark-theme');
      localStorage.setItem('theme', 'light');
    } else {
      document.body.classList.add('dark-theme');
      localStorage.setItem('theme', 'dark');
    }
    setIsDark(!isDark);
  };

  return (
    <ClerkProvider {...pageProps}>
      {/* --- GLOBAL HEADER --- */}
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
          
          <nav style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <Link href="/manga-list" style={{ fontWeight: 600, color: 'var(--text-main)' }}>Manga List</Link>
            <Link href="/recommendation" style={{ fontWeight: 600, color: 'var(--text-main)' }}>Recommendations</Link>
            <Link href="/search" style={{ fontWeight: 600, color: 'var(--text-main)' }}>Add Manga</Link>
            
            {/* Theme Toggle inside the Nav */}
            <button onClick={toggleTheme} style={{ background: 'none', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', padding: '0.2rem 0.5rem' }}>
              {isDark ? '☀️' : '🌙'}
            </button>
          </nav>
        </header>
      </div>

      {/* --- PAGE CONTENT --- */}
      <Component {...pageProps} />
    </ClerkProvider>
  );
}