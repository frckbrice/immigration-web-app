'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/utils/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  MessageSquare,
  Mail,
  Search,
  Calendar,
  User,
  Briefcase,
  ChevronRight,
  MessageCircle,
  Send,
  Filter,
} from 'lucide-react';
import { SimpleSkeleton, SkeletonText } from '@/components/ui/simple-skeleton';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils/helpers';
import { toast } from 'sonner';

interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantEmail: string;
  participantRole: string;
  lastMessage: string;
  lastMessageTime: string;
  lastMessageType: 'EMAIL' | 'CHAT';
  messageCount: number;
  unreadCount: number;
  conversationType: 'EMAIL' | 'CHAT' | 'MIXED';
  caseReference?: string;
  caseId?: string;
}

interface ConversationHistoryResponse {
  conversations: Conversation[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export function ConversationHistoryTable() {
  const { t } = useTranslation();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'EMAIL' | 'CHAT'>('all');

  // Fetch conversation history
  const { data, isLoading, error } = useQuery<ConversationHistoryResponse>({
    queryKey: ['conversation-history', typeFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('limit', '100');

      const response = await apiClient.get(`/api/conversations/history?${params.toString()}`);
      return response.data.data;
    },
    staleTime: 30000, // 30 seconds
  });

  const conversations = data?.conversations || [];

  // Calculate stats
  const stats = useMemo(() => {
    const totalConversations = conversations.length;
    const emailConversations = conversations.filter(
      (c) => c.conversationType === 'EMAIL' || c.conversationType === 'MIXED'
    ).length;
    const chatConversations = conversations.filter(
      (c) => c.conversationType === 'CHAT' || c.conversationType === 'MIXED'
    ).length;
    const totalMessages = conversations.reduce((sum, c) => sum + c.messageCount, 0);
    const unreadMessages = conversations.reduce((sum, c) => sum + c.unreadCount, 0);

    return {
      totalConversations,
      emailConversations,
      chatConversations,
      totalMessages,
      unreadMessages,
    };
  }, [conversations]);

  const handleStartChat = (conversation: Conversation) => {
    // Navigate to messages page with client info and chat mode to switch to Active Chats tab
    router.push(
      `/dashboard/messages?mode=chat&clientId=${conversation.participantId}&clientName=${encodeURIComponent(conversation.participantName)}&clientEmail=${encodeURIComponent(conversation.participantEmail)}`
    );
  };

  const handleSendEmail = (conversation: Conversation) => {
    router.push(
      `/dashboard/messages?mode=email&clientId=${conversation.participantId}&clientName=${encodeURIComponent(conversation.participantName)}&clientEmail=${encodeURIComponent(conversation.participantEmail)}${conversation.caseReference ? `&caseRef=${encodeURIComponent(conversation.caseReference)}` : ''}`
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffHours < 1) return t('messages.justNow') || t('notifications.justNow') || 'Just now';
    if (diffHours < 24)
      return t('notifications.hoursAgo', { hours: diffHours }) || `${diffHours}h ago`;
    if (diffHours < 48)
      return t('messages.yesterday') || t('notifications.yesterday') || 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getConversationTypeIcon = (type: string) => {
    switch (type) {
      case 'EMAIL':
        return <Mail className="h-4 w-4" />;
      case 'CHAT':
        return <MessageSquare className="h-4 w-4" />;
      case 'MIXED':
        return (
          <div className="flex gap-0.5">
            <Mail className="h-3 w-3" />
            <MessageSquare className="h-3 w-3" />
          </div>
        );
      default:
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getConversationTypeBadge = (type: string) => {
    switch (type) {
      case 'EMAIL':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
            <Mail className="h-3 w-3 mr-1" />
            {t('messages.email') || 'Email'}
          </Badge>
        );
      case 'CHAT':
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
            <MessageSquare className="h-3 w-3 mr-1" />
            {t('messages.chat') || 'Chat'}
          </Badge>
        );
      case 'MIXED':
        return (
          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
            <MessageCircle className="h-3 w-3 mr-1" />
            {t('messages.mixed') || 'Mixed'}
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Stats Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Card key={i} className="p-4">
              <SimpleSkeleton className="h-16 w-full" />
            </Card>
          ))}
        </div>

        {/* Table Skeleton */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <SimpleSkeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-red-600">
            {t('messages.failedToLoadHistory') || 'Failed to load conversation history'}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {t('common.tryAgainLater') || 'Please try again later'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 sm:gap-3">
        <Card
          className="p-2.5 sm:p-4"
          style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}
        >
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate pr-1">
              {t('messages.totalConversations') || 'Total Conversations'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-lg sm:text-2xl font-bold">{stats.totalConversations}</span>
          </div>
        </Card>

        <Card
          className="p-2.5 sm:p-4"
          style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}
        >
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate pr-1">
              {t('messages.emailThreads') || 'Email Threads'}
            </span>
            <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" style={{ color: '#ff4538' }} />
          </div>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-lg sm:text-2xl font-bold">{stats.emailConversations}</span>
          </div>
        </Card>

        <Card
          className="p-2.5 sm:p-4"
          style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}
        >
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate pr-1">
              {t('messages.chatSessions') || 'Chat Sessions'}
            </span>
            <MessageSquare
              className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0"
              style={{ color: '#ff4538' }}
            />
          </div>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-lg sm:text-2xl font-bold">{stats.chatConversations}</span>
          </div>
        </Card>

        <Card
          className="p-2.5 sm:p-4"
          style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}
        >
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate pr-1">
              {t('messages.totalMessages') || 'Total Messages'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-lg sm:text-2xl font-bold">{stats.totalMessages}</span>
          </div>
        </Card>

        <Card
          className="p-2.5 sm:p-4 col-span-2 md:col-span-1"
          style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}
        >
          <div className="flex items-center justify-between mb-1 sm:mb-2">
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground truncate pr-1">
              {t('messages.unreadMessages') || 'Unread Messages'}
            </span>
          </div>
          <div className="flex items-baseline gap-1 sm:gap-2">
            <span className="text-lg sm:text-2xl font-bold text-orange-600">
              {stats.unreadMessages}
            </span>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}>
        <CardHeader className="pb-3 sm:pb-6">
          <CardTitle className="text-base sm:text-lg">
            {t('messages.conversationHistory') || 'Conversation History'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4"
                style={{ color: '#ff4538' }}
              />
              <Input
                placeholder={t('messages.searchConversations') || 'Search conversations...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 sm:pl-10 h-10 sm:h-11 text-sm sm:text-base"
              />
            </div>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={(value: any) => setTypeFilter(value)}>
              <SelectTrigger
                className="w-full sm:w-[200px] h-10 sm:h-11 text-white [&_svg]:!text-[#ff4538]"
                style={{
                  backgroundColor: '#143240',
                  borderColor: 'rgba(255, 69, 56, 0.3)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                }}
              >
                <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-2 shrink-0" />
                <SelectValue placeholder={t('messages.filterByType') || 'Filter by type'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('messages.allTypes') || 'All Types'}</SelectItem>
                <SelectItem value="EMAIL">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {t('messages.emailOnly') || 'Email Only'}
                  </div>
                </SelectItem>
                <SelectItem value="CHAT">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    {t('messages.chatOnly') || 'Chat Only'}
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Conversations Table */}
      <Card style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}>
        <CardContent className="p-0">
          {conversations.length === 0 ? (
            <div className="py-8 sm:py-12 text-center px-4">
              <MessageCircle
                className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4 opacity-50"
                style={{ color: '#ff4538' }}
              />
              <h3 className="text-base sm:text-lg font-semibold">
                {t('messages.noConversationsFound') || 'No conversations found'}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                {searchQuery
                  ? t('messages.tryAdjustingSearch') || 'Try adjusting your search or filters'
                  : t('messages.startMessagingClients') ||
                    'Start messaging with clients to see conversations here'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs sm:text-sm">
                      {t('messages.participant') || 'Participant'}
                    </TableHead>
                    <TableHead className="text-xs sm:text-sm">
                      {t('messages.type') || 'Type'}
                    </TableHead>
                    <TableHead className="text-xs sm:text-sm hidden sm:table-cell">
                      {t('messages.lastMessage') || 'Last Message'}
                    </TableHead>
                    <TableHead className="text-xs sm:text-sm hidden md:table-cell">
                      {t('cases.referenceNumber') || 'Case'}
                    </TableHead>
                    <TableHead className="text-center text-xs sm:text-sm">
                      {t('messages.messages') || 'Messages'}
                    </TableHead>
                    <TableHead className="text-center text-xs sm:text-sm">
                      {t('messages.unread') || 'Unread'}
                    </TableHead>
                    <TableHead className="text-xs sm:text-sm hidden lg:table-cell">
                      {t('messages.lastActivity') || 'Last Activity'}
                    </TableHead>
                    <TableHead className="text-right text-xs sm:text-sm">
                      {t('common.actions') || 'Actions'}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {conversations.map((conversation) => (
                    <TableRow key={conversation.id} className="hover:bg-muted/50">
                      {/* Participant */}
                      <TableCell className="py-2 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Avatar className="h-7 w-7 sm:h-9 sm:w-9 shrink-0">
                            <AvatarFallback className="text-[10px] sm:text-xs">
                              {getInitials(conversation.participantName)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-xs sm:text-sm truncate">
                              {conversation.participantName}
                            </p>
                            <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                              {conversation.participantEmail}
                            </p>
                            <Badge
                              variant="outline"
                              className="text-[10px] sm:text-xs mt-0.5 sm:mt-1 h-4 sm:h-5 px-1 sm:px-1.5"
                            >
                              {conversation.participantRole}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell className="py-2 sm:py-4">
                        {getConversationTypeBadge(conversation.conversationType)}
                      </TableCell>

                      {/* Last Message */}
                      <TableCell className="py-2 sm:py-4 hidden sm:table-cell">
                        <div className="max-w-xs">
                          <p className="text-xs sm:text-sm truncate">{conversation.lastMessage}</p>
                          <div className="flex items-center gap-1 mt-0.5 sm:mt-1">
                            {conversation.lastMessageType === 'EMAIL' ? (
                              <Mail
                                className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground shrink-0"
                                style={{ color: '#ff4538' }}
                              />
                            ) : (
                              <MessageSquare
                                className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground shrink-0"
                                style={{ color: '#ff4538' }}
                              />
                            )}
                            <span className="text-[10px] sm:text-xs text-muted-foreground">
                              {conversation.lastMessageType}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* Case */}
                      <TableCell className="py-2 sm:py-4 hidden md:table-cell">
                        {conversation.caseReference ? (
                          <div className="flex items-center gap-1">
                            <Briefcase
                              className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground shrink-0"
                              style={{ color: '#ff4538' }}
                            />
                            <span className="text-xs sm:text-sm font-medium truncate">
                              {conversation.caseReference}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Message Count */}
                      <TableCell className="text-center py-2 sm:py-4">
                        <Badge
                          variant="secondary"
                          className="text-xs sm:text-sm h-5 sm:h-6 px-1.5 sm:px-2"
                        >
                          {conversation.messageCount}
                        </Badge>
                      </TableCell>

                      {/* Unread Count */}
                      <TableCell className="text-center py-2 sm:py-4">
                        {conversation.unreadCount > 0 ? (
                          <Badge className="bg-orange-500 hover:bg-orange-600 text-xs sm:text-sm h-5 sm:h-6 px-1.5 sm:px-2">
                            {conversation.unreadCount}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Last Activity */}
                      <TableCell className="py-2 sm:py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-1 text-xs sm:text-sm">
                          <Calendar
                            className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground shrink-0"
                            style={{ color: '#ff4538' }}
                          />
                          <span className="text-muted-foreground truncate">
                            {formatDate(conversation.lastMessageTime)}
                          </span>
                        </div>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right py-2 sm:py-4">
                        <div className="flex justify-end gap-1 sm:gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartChat(conversation)}
                            className="gap-1 h-7 sm:h-8 px-2 sm:px-3 text-white"
                            style={{
                              backgroundColor: '#143240',
                              borderColor: 'rgba(255, 69, 56, 0.3)',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                            }}
                          >
                            <MessageSquare className="h-3 w-3 shrink-0" />
                            <span className="hidden sm:inline text-xs sm:text-sm">
                              {t('messages.chat') || 'Chat'}
                            </span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendEmail(conversation)}
                            className="gap-1 h-7 sm:h-8 px-2 sm:px-3 text-white"
                            style={{
                              backgroundColor: '#143240',
                              borderColor: 'rgba(255, 69, 56, 0.3)',
                              borderWidth: '1px',
                              borderStyle: 'solid',
                            }}
                          >
                            <Send className="h-3 w-3 shrink-0" />
                            <span className="hidden sm:inline text-xs sm:text-sm">
                              {t('messages.email') || 'Email'}
                            </span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination Info */}
      {data?.pagination && data.pagination.total > 0 && (
        <div className="text-xs sm:text-sm text-muted-foreground text-center">
          {conversations.length === data.pagination.total
            ? t('messages.allConversations', { total: data.pagination.total }) ||
              `${data.pagination.total} ${data.pagination.total === 1 ? 'conversation' : 'conversations'}`
            : t('messages.showingConversations', {
                showing: conversations.length,
                total: data.pagination.total,
              }) || `Showing ${conversations.length} of ${data.pagination.total} conversations`}
        </div>
      )}
    </div>
  );
}

export function ConversationHistoryTableSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <SimpleSkeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <SimpleSkeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
