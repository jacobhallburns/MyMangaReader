import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { ClerkProvider, SignedIn, SignedOut, RedirectToSignIn } from '@clerk/nextjs';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ClerkProvider {...pageProps}>
      {/* If you want the whole app protected, use logic here. 
          Otherwise, just wrap the component as shown below. */}
      <Component {...pageProps} />
    </ClerkProvider>
  );
}