import { Suspense } from 'react';
import { CasesPageWithTabs } from '@/features/cases/components/CasesPageWithTabs';
import { CasesListSkeleton } from '@/features/cases/components/CasesList';

export default function CasesPage() {
  return (
    <Suspense fallback={<CasesListSkeleton />}>
      <CasesPageWithTabs />
    </Suspense>
  );
}
