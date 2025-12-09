import { Suspense } from 'react';
import { CasesListSkeleton } from '@/features/cases/components/CasesList';
import { CasesPageWithTabs } from '@/features/cases/components/CasesPageWithTabs';

interface MyCasesPageProps {
  searchParams: Promise<{
    tab?: string;
    [key: string]: string | string[] | undefined;
  }>;
}

// Client-facing cases page with tabs (Cases / Documents)
export default async function MyCasesPage({ searchParams }: MyCasesPageProps) {
  const params = await searchParams;
  const initialTab = params.tab === 'documents' ? 'documents' : 'cases';

  return (
    <Suspense fallback={<CasesListSkeleton />}>
      <CasesPageWithTabs initialTab={initialTab} />
    </Suspense>
  );
}
