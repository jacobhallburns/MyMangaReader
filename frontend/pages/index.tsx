import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // changed: landing destination is now /recommendation (was /manga-list)
    router.push('/recommendation');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-white">Loading your collection...</p>
    </div>
  );
}