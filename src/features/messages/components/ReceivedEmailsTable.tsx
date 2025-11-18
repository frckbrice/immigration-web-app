'use client';

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  ColumnDef,
  SortingState,
  PaginationState,
} from '@tanstack/react-table';
import { useAuthStore } from '@/features/auth/store';
import { apiClient } from '@/lib/utils/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Mail,
  Clock,
  FileText,
  AlertCircle,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  User,
  Reply,
  X,
} from 'lucide-react';
import { format } from 'date-fns';
import { SimpleSkeleton } from '@/components/ui/simple-skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getInitials } from '@/lib/utils/helpers';

interface Email {
  id: string;
  senderId: string;
  recipientId: string;
  caseId: string | null;
  subject: string | null;
  content: string;
  isRead: boolean;
  readAt: Date | null;
  sentAt: Date;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  recipient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  case: {
    id: string;
    referenceNumber: string;
    serviceType: string;
  } | null;
}

interface ReceivedEmailsResponse {
  emails: Email[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

interface ReceivedEmailsTableProps {
  preselectedMessageId?: string;
}

export function ReceivedEmailsTable({ preselectedMessageId }: ReceivedEmailsTableProps = {}) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const queryClient = useQueryClient();

  // Filtering state
  const [searchQuery, setSearchQuery] = useState('');
  const [isReadFilter, setIsReadFilter] = useState<'all' | 'read' | 'unread'>('all');

  // Dialog state
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Pagination state
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  // Sorting state
  const [sorting, setSorting] = useState<SortingState>([
    {
      id: 'sentAt',
      desc: true, // Default: newest first
    },
  ]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchQuery, isReadFilter]);

  // Build API query params
  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    params.append('direction', 'incoming');
    params.append('page', String(pagination.pageIndex + 1)); // API uses 1-based pages
    params.append('limit', String(pagination.pageSize));

    if (searchQuery.trim()) {
      params.append('search', searchQuery.trim());
    }

    if (isReadFilter !== 'all') {
      params.append('isRead', isReadFilter === 'read' ? 'true' : 'false');
    }

    // Add sorting
    if (sorting.length > 0) {
      const sort = sorting[0];
      params.append('sortBy', sort.id);
      params.append('sortOrder', sort.desc ? 'desc' : 'asc');
    }

    return params.toString();
  }, [pagination, searchQuery, isReadFilter, sorting]);

  // Fetch incoming emails with server-side pagination, filtering, and sorting
  const { data, isLoading, error } = useQuery<ReceivedEmailsResponse>({
    queryKey: ['received-emails', user?.id, queryParams],
    queryFn: async () => {
      const response = await apiClient.get(`/api/emails?${queryParams}`);
      return response.data.data;
    },
    enabled: !!user?.id,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: true,
    refetchInterval: 60000, // Refetch every minute
  });

  const emails = data?.emails || [];
  const paginationData = data?.pagination;
  const unreadCount = useMemo(() => {
    if (!data?.emails) return 0;
    return data.emails.filter((email) => !email.isRead).length;
  }, [data?.emails]);

  // Auto-open email if preselectedMessageId is provided
  useEffect(() => {
    if (preselectedMessageId && emails.length > 0) {
      const email = emails.find((e) => e.id === preselectedMessageId);
      if (email) {
        setSelectedEmailId(email.id);
        setIsDialogOpen(true);
      }
    }
  }, [preselectedMessageId, emails]);

  // Fetch single email details for dialog
  const { data: selectedEmailData, isLoading: isLoadingEmail } = useQuery<{ email: Email }>({
    queryKey: ['email-detail', selectedEmailId],
    queryFn: async () => {
      if (!selectedEmailId) return null;
      const response = await apiClient.get(`/api/emails/${selectedEmailId}`);
      return response.data.data;
    },
    enabled: !!selectedEmailId && isDialogOpen,
  });

  // Mark email as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (emailId: string) => {
      await apiClient.put(`/api/emails/${emailId}`);
    },
    onSuccess: () => {
      // Invalidate queries to refresh the list and notifications
      queryClient.invalidateQueries({ queryKey: ['received-emails'] });
      queryClient.invalidateQueries({ queryKey: ['email-detail'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleViewEmail = useCallback(
    (email: Email) => {
      setSelectedEmailId(email.id);
      setIsDialogOpen(true);

      // Mark as read if unread
      if (!email.isRead) {
        markAsReadMutation.mutate(email.id);
      }
    },
    [markAsReadMutation]
  );

  const handleCloseDialog = useCallback(() => {
    setIsDialogOpen(false);
    setSelectedEmailId(null);
  }, []);

  // Column definitions
  const columns = useMemo<ColumnDef<Email>[]>(
    () => [
      {
        accessorKey: 'sender',
        header: t('messages.sender') || 'Sender',
        cell: ({ row }) => {
          const email = row.original;
          const senderName = `${email.sender.firstName} ${email.sender.lastName}`;
          const isUnread = !email.isRead;

          return (
            <div className="flex items-center gap-3">
              <div
                className={`flex-shrink-0 rounded-full p-2 ${
                  isUnread ? 'bg-blue-500 dark:bg-blue-600' : 'bg-muted'
                }`}
                style={isUnread ? {} : { backgroundColor: '#f3f4f6' }}
              >
                <Mail className="h-4 w-4" style={{ color: isUnread ? '#ffffff' : '#ff4538' }} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">{senderName}</p>
                  {isUnread && (
                    <Badge variant="default" className="h-4 px-1.5 text-xs">
                      {t('messages.new') || 'New'}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{email.sender.email}</p>
              </div>
            </div>
          );
        },
        size: 250,
      },
      {
        accessorKey: 'subject',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 data-[state=open]:bg-accent"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              {t('email.subject') || 'Subject'}
              <ArrowUpDown className="ml-2 h-4 w-4" style={{ color: '#ff4538' }} />
            </Button>
          );
        },
        cell: ({ row }) => {
          const email = row.original;
          return (
            <div className="max-w-md">
              <p className="text-sm font-semibold text-foreground truncate">
                {email.subject || `(${t('email.noSubject') || 'No subject'})`}
              </p>
              <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                {email.content.substring(0, 150)}
                {email.content.length > 150 ? '...' : ''}
              </p>
            </div>
          );
        },
        size: 350,
      },
      {
        accessorKey: 'case',
        header: t('cases.referenceNumber') || 'Case',
        cell: ({ row }) => {
          const email = row.original;
          return email.case ? (
            <div className="flex items-center gap-1">
              <FileText className="h-3 w-3" style={{ color: '#ff4538' }} />
              <span className="text-sm truncate">{email.case.referenceNumber}</span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          );
        },
        size: 150,
      },
      {
        accessorKey: 'sentAt',
        header: ({ column }) => {
          return (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 data-[state=open]:bg-accent"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              {t('messages.date') || 'Date'}
              {column.getIsSorted() === 'asc' ? (
                <ArrowUp className="ml-2 h-4 w-4" style={{ color: '#ff4538' }} />
              ) : column.getIsSorted() === 'desc' ? (
                <ArrowDown className="ml-2 h-4 w-4" style={{ color: '#ff4538' }} />
              ) : (
                <ArrowUpDown className="ml-2 h-4 w-4" style={{ color: '#ff4538' }} />
              )}
            </Button>
          );
        },
        cell: ({ row }) => {
          const email = row.original;
          return (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" style={{ color: '#ff4538' }} />
              <span>{format(new Date(email.sentAt), 'MMM d, h:mm a')}</span>
            </div>
          );
        },
        size: 150,
      },
      {
        id: 'actions',
        header: t('common.actions') || 'Actions',
        cell: ({ row }) => {
          const email = row.original;
          return (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => handleViewEmail(email)}
            >
              {t('common.view') || 'View'}
            </Button>
          );
        },
        size: 100,
      },
    ],
    [handleViewEmail]
  );

  // Table instance with server-side pagination and sorting
  const table = useReactTable({
    data: emails,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    manualPagination: true, // Server-side pagination
    manualSorting: true, // Server-side sorting
    pageCount: paginationData ? paginationData.totalPages : 0,
    state: {
      sorting,
      pagination,
    },
    initialState: {
      pagination: {
        pageSize: 20,
      },
    },
  });

  if (isLoading && !data) {
    return (
      <Card style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Received Emails</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <SimpleSkeleton key={i} className="h-20 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">Received Emails</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="mx-auto h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">Failed to load emails</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Received Emails</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Incoming emails and replies from clients
            </p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="default" className="ml-2">
              {unreadCount} unread
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
              style={{ color: '#ff4538' }}
            />
            <Input
              placeholder={t('messages.searchEmails') || 'Search emails by subject or content...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select
            value={isReadFilter}
            onValueChange={(value: 'all' | 'read' | 'unread') => setIsReadFilter(value)}
          >
            <SelectTrigger
              className="w-full sm:w-[180px] text-white [&_svg]:!text-[#ff4538]"
              style={{
                backgroundColor: '#143240',
                borderColor: 'rgba(255, 69, 56, 0.3)',
                borderWidth: '1px',
                borderStyle: 'solid',
              }}
            >
              <SelectValue
                placeholder={t('messages.filterByReadStatus') || 'Filter by read status'}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('messages.allEmails') || 'All emails'}</SelectItem>
              <SelectItem value="unread">{t('messages.unreadOnly') || 'Unread only'}</SelectItem>
              <SelectItem value="read">{t('messages.readOnly') || 'Read only'}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        {emails.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Mail className="mx-auto h-12 w-12 mb-4 opacity-30" />
            <p className="text-sm font-medium">
              {t('messages.noReceivedEmails') || 'No received emails'}
            </p>
            <p className="text-xs mt-1">
              {searchQuery || isReadFilter !== 'all'
                ? t('messages.tryAdjustingFilters') || 'Try adjusting your filters'
                : t('messages.clientEmailReplies') || 'Client email replies will appear here'}
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead key={header.id} style={{ width: header.getSize() }}>
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {table.getRowModel().rows?.length ? (
                    table.getRowModel().rows.map((row) => {
                      const email = row.original;
                      const isUnread = !email.isRead;

                      return (
                        <TableRow
                          key={row.id}
                          className={`cursor-pointer hover:bg-muted/50 ${
                            isUnread ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                          }`}
                          onClick={() => handleViewEmail(email)}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={columns.length} className="h-24 text-center">
                        {t('messages.noEmailsFound') || 'No emails found.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {paginationData && paginationData.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-0 mt-4 px-2">
                <p className="text-xs sm:text-sm text-muted-foreground order-2 sm:order-1">
                  {t('messages.showingEmails', {
                    from: pagination.pageIndex * pagination.pageSize + 1,
                    to: Math.min(
                      (pagination.pageIndex + 1) * pagination.pageSize,
                      paginationData.total
                    ),
                    total: paginationData.total,
                  }) ||
                    `Showing ${pagination.pageIndex * pagination.pageSize + 1} to ${Math.min((pagination.pageIndex + 1) * pagination.pageSize, paginationData.total)} of ${paginationData.total} emails`}
                </p>
                <div className="flex items-center gap-2 order-1 sm:order-2 w-full sm:w-auto justify-center sm:justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="text-white h-9 sm:h-8 px-3 sm:px-3"
                    style={{
                      backgroundColor: '#143240',
                      borderColor: 'rgba(255, 69, 56, 0.3)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                  >
                    <ChevronLeft className="h-4 w-4 sm:mr-1" />
                    <span className="hidden sm:inline">{t('common.previous') || 'Previous'}</span>
                  </Button>
                  <span className="text-xs sm:text-sm text-muted-foreground px-2 whitespace-nowrap">
                    {t('common.pageOf', {
                      current: pagination.pageIndex + 1,
                      total: paginationData.totalPages,
                    }) || `Page ${pagination.pageIndex + 1} of ${paginationData.totalPages}`}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="text-white h-9 sm:h-8 px-3 sm:px-3"
                    style={{
                      backgroundColor: '#143240',
                      borderColor: 'rgba(255, 69, 56, 0.3)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                  >
                    <span className="hidden sm:inline">{t('common.next') || 'Next'}</span>
                    <ChevronRight className="h-4 w-4 sm:ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Email Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent className="w-[95vw] max-w-[90vw] sm:max-w-3xl max-h-[90vh] sm:max-h-[90vh] h-[100vh] sm:h-auto overflow-hidden flex flex-col p-0 sm:p-6">
          <DialogHeader className="space-y-2 pb-3 sm:pb-4 border-b px-4 sm:px-0 pt-4 sm:pt-0">
            <div className="flex items-start justify-between gap-2">
              <DialogTitle className="text-lg sm:text-xl font-semibold pr-2 sm:pr-4 flex-1 min-w-0">
                <span className="truncate block">
                  {isLoadingEmail
                    ? t('messages.loadingEmail') || 'Loading email...'
                    : selectedEmailData?.email?.subject ||
                      t('messages.emailDetails') ||
                      'Email Details'}
                </span>
              </DialogTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCloseDialog}
                className="h-8 w-8 shrink-0"
              >
                {/* <X className="h-4 w-4" /> */}
              </Button>
            </div>
            {selectedEmailData?.email && (
              <DialogDescription className="text-xs sm:text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-3 w-3 shrink-0" style={{ color: '#ff4538' }} />
                  <span className="break-words">
                    {format(
                      new Date(selectedEmailData.email.sentAt),
                      'EEEE, MMMM d, yyyy at h:mm a'
                    )}
                  </span>
                </div>
              </DialogDescription>
            )}
          </DialogHeader>

          {isLoadingEmail ? (
            <div className="space-y-4 flex-1 overflow-y-auto px-4 sm:px-0">
              <SimpleSkeleton className="h-8 w-full" />
              <SimpleSkeleton className="h-20 w-full" />
              <SimpleSkeleton className="h-40 w-full" />
            </div>
          ) : selectedEmailData?.email ? (
            <>
              <div className="flex-1 overflow-y-auto py-3 sm:py-4 space-y-3 sm:space-y-4 px-4 sm:px-0">
                {/* Sender Info */}
                <div className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 bg-muted/50 rounded-lg">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 shrink-0">
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs sm:text-sm">
                      {getInitials(
                        `${selectedEmailData.email.sender.firstName} ${selectedEmailData.email.sender.lastName}`
                      )}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-semibold text-xs sm:text-sm truncate">
                        {selectedEmailData.email.sender.firstName}{' '}
                        {selectedEmailData.email.sender.lastName}
                      </p>
                      {!selectedEmailData.email.isRead && (
                        <Badge variant="default" className="h-5 px-2 text-xs shrink-0">
                          New
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-muted-foreground break-all">
                      {selectedEmailData.email.sender.email}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <User className="h-3 w-3 shrink-0" style={{ color: '#ff4538' }} />
                      <span>{t('messages.fromClient') || 'From client'}</span>
                    </div>
                  </div>
                </div>

                {/* Case Info */}
                {selectedEmailData.email.case && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-blue-900 dark:text-blue-100">
                        {t('messages.relatedCase') || 'Related Case'}
                      </p>
                      <p className="text-xs sm:text-sm font-semibold text-blue-700 dark:text-blue-300 truncate">
                        {selectedEmailData.email.case.referenceNumber}
                      </p>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Email Content */}
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="whitespace-pre-wrap break-words text-xs sm:text-sm leading-relaxed p-3 sm:p-4 bg-background rounded-lg border">
                    {selectedEmailData.email.content ||
                      `(${t('messages.noContent') || 'No content'})`}
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-3 sm:pt-4 border-t px-4 sm:px-0 pb-4 sm:pb-0">
                <div className="text-xs text-muted-foreground order-2 sm:order-1">
                  {selectedEmailData.email.isRead ? (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3 shrink-0" style={{ color: '#ff4538' }} />
                      <span className="break-words">
                        {t('messages.read') || 'Read'}{' '}
                        {selectedEmailData.email.readAt &&
                          format(new Date(selectedEmailData.email.readAt), 'MMM d, h:mm a')}
                      </span>
                    </span>
                  ) : (
                    <span>{t('messages.unread') || 'Unread'}</span>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2 order-1 sm:order-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={handleCloseDialog}
                    className="w-full sm:w-auto text-white"
                    style={{
                      backgroundColor: '#143240',
                      borderColor: 'rgba(255, 69, 56, 0.3)',
                      borderWidth: '1px',
                      borderStyle: 'solid',
                    }}
                  >
                    {t('common.close') || 'Close'}
                  </Button>
                  <Button
                    onClick={() => {
                      handleCloseDialog();
                      // Navigate to messages page for reply
                      window.location.href = `/dashboard/messages?mode=email&messageId=${selectedEmailData.email.id}&clientId=${selectedEmailData.email.senderId}&clientName=${encodeURIComponent(`${selectedEmailData.email.sender.firstName} ${selectedEmailData.email.sender.lastName}`)}`;
                    }}
                    className="w-full sm:w-auto text-white"
                    style={{
                      backgroundColor: '#ff4538',
                      borderColor: '#ff4538',
                    }}
                  >
                    <Reply className="h-4 w-4 mr-2" />
                    {t('messages.reply') || 'Reply'}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 flex-1 flex items-center justify-center px-4">
              <div>
                <AlertCircle
                  className="mx-auto h-10 w-10 mb-3 opacity-50"
                  style={{ color: '#ff4538' }}
                />
                <p className="text-sm text-muted-foreground">
                  {t('messages.failedToLoadEmailDetails') || 'Failed to load email details'}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
