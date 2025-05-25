// Loads global css and wraps all pages (applies global styles)

import '../styles/globals.css';
import type {AppProps} from 'next/app';

export default function App({ Component, pageProps}: AppProps) {
    return <Component {...pageProps}/>;
}