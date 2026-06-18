import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import AccountMenu from '../components/AccountMenu';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LangContext } from '../lib/LangContext';
import { SUPPORTED_LANGUAGES } from '../lib/titleLocale';

// 1. This component handles the UI and the Database Syncing
function ThemeWrapper({ Component, pageProps, isDark, setIsDark }: any) {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState('en');
  const { isLoaded, isSignedIn } = useAuth();

  // Handle mounting to prevent hydration errors
  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      setIsDark(false);
      document.body.classList.remove('dark-theme');
    } else {
      setIsDark(true);
      document.body.classList.add('dark-theme');
    }
    const savedLang = localStorage.getItem('titleLanguage');
    if (savedLang) setLang(savedLang);
  }, []);

  // Fetch config from MongoDB when the user signs in
  useEffect(() => {
    if (mounted && isLoaded && isSignedIn) {
      fetch('/api/user/config')
        .then((res) => res.json())
        .then((data) => {
          const isDarkTheme = data.theme !== 'light';
          setIsDark(isDarkTheme);
          if (isDarkTheme) document.body.classList.add('dark-theme');
          else document.body.classList.remove('dark-theme');
          if (data.titleLanguage) {
            setLang(data.titleLanguage);
            localStorage.setItem('titleLanguage', data.titleLanguage);
          }
        })
        .catch((err) => console.error("Failed to load config from DB", err));
    } else if (mounted) {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'light') {
        setIsDark(false);
        document.body.classList.remove('dark-theme');
      } else {
        setIsDark(true);
        document.body.classList.add('dark-theme');
      }
    }
  }, [mounted, isLoaded, isSignedIn, setIsDark]);

  const handleLangChange = async (newLang: string) => {
    setLang(newLang);
    localStorage.setItem('titleLanguage', newLang);
    if (isSignedIn) {
      await fetch('/api/user/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titleLanguage: newLang }),
      });
    }
  };

  if (!mounted) return null;

  return (
    <LangContext.Provider value={{ lang, setLang: handleLangChange }}>
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
            gap: '1rem',
          }}>
            <h1 style={{ margin: 0, color: 'var(--text-main)', fontSize: '1.5rem' }}>My Manga Reader</h1>
            <nav style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <Link href="/manga-list" style={{ fontWeight: 600, color: 'var(--text-main)' }}>Manga List</Link>
              <Link href="/recommendation" style={{ fontWeight: 600, color: 'var(--text-main)' }}>Recommendations</Link>
              <Link href="/search" style={{ fontWeight: 600, color: 'var(--text-main)' }}>Add Manga</Link>
              <select
                value={lang}
                onChange={(e) => handleLangChange(e.target.value)}
                style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', padding: '0.2rem 0.4rem', color: 'var(--text-main)', fontSize: '0.85rem' }}
                title="Title language"
              >
                {SUPPORTED_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
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
              <AccountMenu />
            </nav>
          </header>
        </div>
        <Component {...pageProps} isDark={isDark} />
      </div>
    </LangContext.Provider>
  );
}

// 2. The Root App provides the SINGLE ClerkProvider
export default function App(props: AppProps) {
  const [isDark, setIsDark] = useState(true);

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