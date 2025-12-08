'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Briefcase, FileText } from 'lucide-react';
import { RoleCasesList } from './RoleCasesList';
import { DocumentsByCaseTable } from '@/features/documents/components/DocumentsByCaseTable';
import { DocumentsListSkeleton } from '@/features/documents/components/DocumentsListWithUpload';

export function CasesPageWithTabs() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>('cases');

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-2 bg-transparent p-1">
          <TabsTrigger value="cases" className="gap-2">
            <Briefcase className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">{t('cases.title') || 'Cases'}</span>
            <span className="sm:hidden">{t('cases.title') || 'Cases'}</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">{t('documents.title') || 'Documents'}</span>
            <span className="sm:hidden">{t('documents.title') || 'Docs'}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cases" className="space-y-0">
          <RoleCasesList />
        </TabsContent>

        <TabsContent value="documents" className="space-y-0">
          <DocumentsByCaseTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}

