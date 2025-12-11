'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DocumentsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to cases page with documents tab
    router.replace('/dashboard/cases?tab=documents');
  }, [router]);

  return null;
}
