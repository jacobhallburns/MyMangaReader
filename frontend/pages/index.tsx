import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // This will trigger the middleware check and then move to the list
    router.push('/manga-list');
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <p className="text-white">Loading your collection...</p>
    </div>
  );
}