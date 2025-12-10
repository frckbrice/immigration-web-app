'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { Briefcase, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RoleCasesList } from './RoleCasesList';
import { DocumentsByCaseTable } from '@/features/documents/components/DocumentsByCaseTable';

interface CasesPageWithTabsProps {
  initialTab?: 'cases' | 'documents';
}

export function CasesPageWithTabs({ initialTab = 'cases' }: CasesPageWithTabsProps) {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Sync tab state when initialTab prop changes
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (value: 'cases' | 'documents') => {
    setActiveTab(value);
    // Update URL without page reload
    const params = new URLSearchParams(window.location.search);
    if (value === 'documents') {
      params.set('tab', 'documents');
    } else {
      params.delete('tab');
    }
    const queryString = params.toString();
    router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, { scroll: false });
  };

  const isCasesActive = activeTab === 'cases';
  const isDocumentsActive = activeTab === 'documents';

  return (
    <div className="space-y-6">
      {/* Custom Tab Switcher */}
      <div className="flex gap-2 border-b border-border pb-0">
        <Button
          type="button"
          variant="ghost"
          onClick={() => handleTabChange('cases')}
          className={cn(
            'rounded-none rounded-t-md border-b-2 transition-all gap-2 px-4 py-2.5',
            isCasesActive
              ? 'border-[#ff4538] bg-[#361d22] text-white hover:bg-[#361d22]/90 hover:text-white'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
          )}
          style={
            isCasesActive
              ? {
                  backgroundColor: '#361d22',
                  borderBottomColor: '#ff4538',
                  borderBottomWidth: '2px',
                  color: 'white',
                }
              : {
                  borderBottomColor: 'transparent',
                  borderBottomWidth: '2px',
                }
          }
        >
          <Briefcase className="h-4 w-4 flex-shrink-0" />
          <span className="hidden sm:inline">{t('cases.title') || 'Cases'}</span>
          <span className="sm:hidden">{t('cases.title') || 'Cases'}</span>
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => handleTabChange('documents')}
          className={cn(
            'rounded-none rounded-t-md border-b-2 transition-all gap-2 px-4 py-2.5',
            isDocumentsActive
              ? 'border-[#ff4538] bg-[#361d22] text-white hover:bg-[#361d22]/90 hover:text-white'
              : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50'
          )}
          style={
            isDocumentsActive
              ? {
                  backgroundColor: '#361d22',
                  borderBottomColor: '#ff4538',
                  borderBottomWidth: '2px',
                  color: 'white',
                }
              : {
                  borderBottomColor: 'transparent',
                  borderBottomWidth: '2px',
                }
          }
        >
          <FileText className="h-4 w-4 flex-shrink-0" />
          <span className="hidden sm:inline">{t('documents.title') || 'Documents'}</span>
          <span className="sm:hidden">{t('documents.title') || 'Docs'}</span>
        </Button>
      </div>

      {/* Tab Content */}
      <div className="space-y-0">
        {isCasesActive && <RoleCasesList />}
        {isDocumentsActive && <DocumentsByCaseTable />}
      </div>
    </div>
  );
}
