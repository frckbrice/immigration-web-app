'use client';

import { Suspense } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { DocumentsListSkeleton } from '@/features/documents/components/DocumentsListWithUpload';
import { DocumentsByCaseTable } from '@/features/documents/components/DocumentsByCaseTable';

export default function DocumentsPage() {
  // Use case-grouped table view for all roles (CLIENT, AGENT, ADMIN) for better scalability
  return (
    <Suspense fallback={<DocumentsListSkeleton />}>
      <DocumentsByCaseTable />
    </Suspense>
  );
}
