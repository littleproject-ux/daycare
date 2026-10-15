import { Suspense } from 'react';
import CariPageClient from './PageClient';

// useSearchParams() needs a Suspense boundary for static prerendering
export default function Page() {
  return (
    <Suspense fallback={null}>
      <CariPageClient />
    </Suspense>
  );
}
