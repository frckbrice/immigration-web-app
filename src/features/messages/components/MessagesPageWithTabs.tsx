'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, History, Mail } from 'lucide-react';
import { MessagesList } from './MessagesListEnhanced';
import { ConversationHistoryTable } from './ConversationHistoryTable';
import { ReceivedEmailsTable } from './ReceivedEmailsTable';
import { Badge } from '@/components/ui/badge';

interface MessagesPageWithTabsProps {
  preselectedClientId?: string;
  preselectedClientName?: string;
  preselectedClientEmail?: string;
  caseReference?: string;
  initialMode?: 'email' | 'chat';
  initialTab?: 'active' | 'received' | 'history';
  preselectedMessageId?: string;
}

export function MessagesPageWithTabs({
  preselectedClientId,
  preselectedClientName,
  preselectedClientEmail,
  caseReference,
  initialMode,
  initialTab,
  preselectedMessageId,
}: MessagesPageWithTabsProps = {}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string>(initialTab || 'active');

  // If coming from case details with a specific client, show active tab
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    } else if (preselectedClientId || initialMode === 'chat') {
      setActiveTab('active');
    } else if (initialMode === 'email') {
      setActiveTab('active'); // Stay on active tab for email mode too
    }
  }, [preselectedClientId, initialMode, initialTab]);

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-3 bg-transparent p-1">
          <TabsTrigger value="active" className="gap-2">
            <MessageSquare className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">{t('messages.activeChats') || 'Active Chats'}</span>
            <span className="sm:hidden">{t('messages.chats') || 'Chats'}</span>
          </TabsTrigger>
          <TabsTrigger value="received" className="gap-2">
            <Mail className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline">
              {t('messages.receivedEmails') || 'Received Emails'}
            </span>
            <span className="sm:hidden">{t('messages.emails') || 'Emails'}</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4 flex-shrink-0" />
            <span className="hidden sm:inline break-words whitespace-normal text-center">
              {t('messages.conversationHistory') || 'Conversation History'}
            </span>
            <span className="sm:hidden">{t('messages.history') || 'History'}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-0">
          <MessagesList
            preselectedClientId={preselectedClientId}
            preselectedClientName={preselectedClientName}
            preselectedClientEmail={preselectedClientEmail}
            caseReference={caseReference}
            initialMode={initialMode}
          />
        </TabsContent>

        <TabsContent value="received" className="space-y-0">
          <ReceivedEmailsTable preselectedMessageId={preselectedMessageId} />
        </TabsContent>

        <TabsContent value="history" className="space-y-0">
          <ConversationHistoryTable />
        </TabsContent>
      </Tabs>
    </div>
  );
}
