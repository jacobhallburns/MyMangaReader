import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ClerkProvider, UserButton, useAuth } from '@clerk/nextjs'; 
import { dark } from '@clerk/themes';
import { useState, useEffect } from 'react';
import Link from 'next/link';

// 1. Create a sub-component to handle the theme and user logic
function ThemeWrapper({ Component, pageProps }: AppProps) {
  const [isDark, setIsDark] = useState(false);
  const { isLoaded, isSignedIn } = useAuth(); // Now this is INSIDE the Provider

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetch('/api/user/config')
        .then((res) => res.json())
        .then((data) => {
          const isDarkTheme = data.theme === 'dark';
          setIsDark(isDarkTheme);
          if (isDarkTheme) document.body.classList.add('dark-theme');
          else document.body.classList.remove('dark-theme');
        })
        .catch((err) => console.error("Failed to load theme from DB", err));
    } else {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
          setIsDark(true);
          document.body.classList.add('dark-theme');
        }
    }
  }, [isLoaded, isSignedIn]);

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

  return (
    <div className={isDark ? 'dark-theme' : ''}>
      {/* CRITICAL: We can override the appearance here 
         to ensure Clerk matches the current state 
      */}
      <ClerkProvider 
        {...pageProps}
        afterSignOutUrl="/sign-in"
        appearance={{
          baseTheme: isDark ? dark : undefined,
          variables: { colorPrimary: '#cc0000' }
        }}
      >
        <div style={{ background: 'var(--bg-color)', borderBottom: '2px solid var(--border-color)' }}>
          <header style={{ /* ... your styles ... */ }}>
            <h1 style={{ margin: 0, color: 'var(--text-main)' }}>My Manga Reader</h1>
            <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
              <Link href="/manga-list" style={{ color: 'var(--text-main)' }}>Manga List</Link>
              {/* ... other links ... */}
              <button onClick={toggleTheme}>{isDark ? '☀️' : '🌙'}</button>
              <UserButton />
            </nav>
          </header>
        </div>
        <Component {...pageProps} />
      </ClerkProvider>
    </div>
  );
}

// 2. The Root App only provides the Clerk context
export default function App(props: AppProps) {
  return (
    <ClerkProvider {...props.pageProps}>
      <ThemeWrapper {...props} />
    </ClerkProvider>
  );
}