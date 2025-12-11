import { Suspense } from 'react';
import { CasesPageWithTabs } from '@/features/cases/components/CasesPageWithTabs';
import { CasesListSkeleton } from '@/features/cases/components/CasesList';

interface CasesPageProps {
  searchParams: Promise<{
    tab?: string;
    [key: string]: string | string[] | undefined;
  }>;
}

export default async function CasesPage({ searchParams }: CasesPageProps) {
  const params = await searchParams;
  const initialTab = params.tab === 'documents' ? 'documents' : 'cases';

  return (
    <Suspense fallback={<CasesListSkeleton />}>
      <CasesPageWithTabs initialTab={initialTab} />
    </Suspense>
  );
}
