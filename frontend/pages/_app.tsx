import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ClerkProvider, useAuth } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import AccountMenu from '../components/AccountMenu';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { LangContext } from '../lib/LangContext';

const NAV_ITEMS = [
  { href: '/manga-list', label: 'Manga List' },
  { href: '/recommendation', label: 'Recommendations' },
  { href: '/activity', label: 'Activity' },
  { href: '/search', label: 'Add Manga' },
];

function ThemeWrapper({ Component, pageProps, isDark, setIsDark }: any) {
  const [mounted, setMounted] = useState(false);
  const [lang, setLang] = useState('en');
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

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
  }, [setIsDark]);

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
        .catch((err) => console.error('Failed to load config from DB', err));
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

  const handleThemeToggle = async () => {
    const nextIsDark = !isDark;
    const newTheme = nextIsDark ? 'dark' : 'light';

    setIsDark(nextIsDark);

    if (nextIsDark) document.body.classList.add('dark-theme');
    else document.body.classList.remove('dark-theme');

    localStorage.setItem('theme', newTheme);

    if (isSignedIn) {
      await fetch('/api/user/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: newTheme }),
      });
    }
  };

  if (!mounted) return null;

  const visibleNavItems = NAV_ITEMS.filter((item) => item.href !== router.pathname);

  return (
    <LangContext.Provider value={{ lang, setLang: handleLangChange }}>
      <div className={isDark ? 'dark-theme' : ''}>
        <div className="site-header-wrap">
          <header className="site-header">
            <Link href="/manga-list" className="site-brand">
              My Manga Reader
            </Link>

            <div className="site-header-right">
              <nav className="site-nav" aria-label="Main navigation">
                {visibleNavItems.map((item) => (
                  <Link key={item.href} href={item.href} className="site-nav-link">
                    {item.label}
                  </Link>
                ))}
              </nav>

              <AccountMenu
                isDark={isDark}
                lang={lang}
                onThemeToggle={handleThemeToggle}
                onLangChange={handleLangChange}
              />
            </div>
          </header>
        </div>

        <Component {...pageProps} isDark={isDark} />
      </div>
    </LangContext.Provider>
  );
}

export default function App(props: AppProps) {
  const [isDark, setIsDark] = useState(true);

  return (
    <ClerkProvider
      {...props.pageProps}
      afterSignOutUrl="/"
      appearance={{
        baseTheme: isDark ? dark : undefined,
        variables: { colorPrimary: '#cc0000' },
      }}
    >
      <ThemeWrapper {...props} isDark={isDark} setIsDark={setIsDark} />
    </ClerkProvider>
  );
}