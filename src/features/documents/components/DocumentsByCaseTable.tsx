'use client';

import { useState, useMemo } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { useDocuments, useDeleteDocument } from '../api';
import type { Document } from '../types';
import { DocumentStatus } from '../types';
import { DocumentCard, type DocumentCardProps } from './DocumentCard';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Briefcase,
  User,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
  Upload,
} from 'lucide-react';
import { UploadDialog } from './UploadDialog';
import { DocumentType } from '../types';
import { useCreateDocument } from '../api';
import { uploadFiles, getAuthHeaders } from '@/lib/uploadthing/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import Link from 'next/link';
import { SimpleSkeleton, SkeletonText } from '@/components/ui/simple-skeleton';
import { useTranslation } from 'react-i18next';
import { logger } from '@/lib/utils/logger';

const getStatusConfig = (t: any) => ({
  PENDING: {
    label: t('documents.pending'),
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
  APPROVED: {
    label: t('documents.approved'),
    icon: CheckCircle,
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  REJECTED: {
    label: t('documents.rejected'),
    icon: XCircle,
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
});

interface CaseDocumentsGroup {
  caseId: string;
  caseReference: string;
  clientId: string;
  clientName: string;
  serviceType: string;
  documentCount: number;
  pendingCount: number;
  documents: Document[];
}

export function DocumentsByCaseTable() {
  const { t } = useTranslation();
  const statusConfig = getStatusConfig(t);
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCase, setSelectedCase] = useState<CaseDocumentsGroup | null>(null);
  const [caseDialogOpen, setCaseDialogOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const itemsPerPage = 20; // More items per page since we're grouping by case

  const { data, isLoading, error, refetch } = useDocuments({});
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();

  // Group documents by case
  const caseGroups = useMemo(() => {
    const documents: Document[] = data?.documents || [];
    const groups = new Map<string, CaseDocumentsGroup>();

    // Log all documents for debugging
    logger.info('[DocumentsByCaseTable] Processing documents', {
      totalDocuments: documents.length,
      documents: documents.map((d) => ({
        id: d.id,
        caseId: d.caseId,
        hasCase: !!d.case,
        hasUploadedBy: !!d.uploadedBy,
        status: d.status,
      })),
    });

    // Track documents without cases for debugging
    const documentsWithoutCase: Document[] = [];
    const documentsWithoutUploadedBy: Document[] = [];

    documents.forEach((doc) => {
      // Handle documents without case info - include them in a special group
      if (!doc.case) {
        logger.warn('[DocumentsByCaseTable] Document missing case data', {
          docId: doc.id,
          caseId: doc.caseId,
          fileName: doc.fileName,
        });

        // If document has caseId but case relation is null, it might be orphaned
        // Still include it but use a placeholder case reference
        if (doc.caseId && doc.uploadedBy) {
          const caseId = doc.caseId;
          const clientId = doc.uploadedById;
          const clientName = `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`.trim();

          if (!groups.has(caseId)) {
            groups.set(caseId, {
              caseId,
              caseReference: `Case ${doc.caseId.substring(0, 8)}... (Orphaned)`,
              clientId,
              clientName,
              serviceType: 'Unknown',
              documentCount: 0,
              pendingCount: 0,
              documents: [],
            });
          }

          const group = groups.get(caseId)!;
          group.documentCount++;
          if (doc.status === DocumentStatus.PENDING) group.pendingCount++;
          group.documents.push(doc);
        } else {
          documentsWithoutCase.push(doc);
        }
        return;
      }

      if (!doc.uploadedBy) {
        logger.warn('[DocumentsByCaseTable] Document missing uploadedBy data', {
          docId: doc.id,
          uploadedById: doc.uploadedById,
          fileName: doc.fileName,
        });
        documentsWithoutUploadedBy.push(doc);
        return;
      }

      const caseId = doc.caseId;
      const caseReference = doc.case.referenceNumber;
      const clientId = doc.uploadedById;
      const clientName = `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}`.trim();
      const serviceType = doc.case.serviceType || '';

      if (!groups.has(caseId)) {
        groups.set(caseId, {
          caseId,
          caseReference,
          clientId,
          clientName,
          serviceType,
          documentCount: 0,
          pendingCount: 0,
          documents: [],
        });
      }

      const group = groups.get(caseId)!;
      group.documentCount++;
      if (doc.status === DocumentStatus.PENDING) group.pendingCount++;
      group.documents.push(doc);
    });

    // Log summary of documents processed
    if (documentsWithoutCase.length > 0 || documentsWithoutUploadedBy.length > 0) {
      logger.warn('[DocumentsByCaseTable] Some documents were excluded', {
        totalDocuments: documents.length,
        documentsInGroups: Array.from(groups.values()).reduce((sum, g) => sum + g.documentCount, 0),
        documentsWithoutCase: documentsWithoutCase.length,
        documentsWithoutUploadedBy: documentsWithoutUploadedBy.length,
      });
    }

    // Sort each group's documents by upload date (newest first)
    groups.forEach((group) => {
      group.documents.sort(
        (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
      );
    });

    // Convert to array and sort by latest upload date
    return Array.from(groups.values()).sort((a, b) => {
      const aLatest = a.documents[0]?.uploadDate || '';
      const bLatest = b.documents[0]?.uploadDate || '';
      return new Date(bLatest).getTime() - new Date(aLatest).getTime();
    });
  }, [data?.documents]);

  // Filter and search
  const filteredGroups = useMemo(() => {
    let filtered = caseGroups;

    // Search by case reference or client name
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (group) =>
          group.caseReference.toLowerCase().includes(query) ||
          group.clientName.toLowerCase().includes(query) ||
          group.serviceType.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((group) =>
        group.documents.some((doc) => doc.status === statusFilter)
      );
    }

    return filtered;
  }, [caseGroups, searchQuery, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredGroups.length / itemsPerPage);
  const paginatedGroups = filteredGroups.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleView = (doc: Document) => {
    try {
      logger.info('Attempting to view document (by-case)', {
        filePath: doc.filePath,
        documentId: doc.id,
        fileName: doc.fileName,
      });

      if (!doc.filePath) {
        logger.error('Document filePath is empty (by-case)', {
          documentId: doc.id,
          fileName: doc.fileName,
        });
        toast.error(t('documents.invalidDocumentUrl'));
        return;
      }

      let fileUrl = doc.filePath;

      // If it's not a full URL, add https://
      if (!fileUrl.startsWith('http://') && !fileUrl.startsWith('https://')) {
        logger.warn('Document filePath is not a full URL (by-case), adding https://', {
          filePath: doc.filePath,
          documentId: doc.id,
        });
        fileUrl = `https://${fileUrl}`;
      }

      logger.info('Constructed file URL (by-case)', { fileUrl, documentId: doc.id });

      // Validate URL format
      let url: URL;
      try {
        url = new URL(fileUrl);
      } catch (urlError) {
        logger.error('Invalid URL format (by-case)', {
          error: urlError instanceof Error ? urlError.message : String(urlError),
          filePath: doc.filePath,
          fileUrl,
          documentId: doc.id,
        });
        toast.error(t('documents.invalidDocumentUrl'));
        return;
      }

      const trustedDomains = ['utfs.io', 'uploadthing.com', 'ufs.sh'];
      const isTrusted = trustedDomains.some(
        (domain) => url.hostname === domain || url.hostname.endsWith('.' + domain)
      );

      if (!isTrusted) {
        logger.warn('Document URL is not from trusted domain (by-case)', {
          hostname: url.hostname,
          fileUrl,
          documentId: doc.id,
          trustedDomains,
        });
        toast.error(t('documents.invalidDocumentUrl'));
        return;
      }

      logger.info('Opening document in new tab (by-case)', { fileUrl, documentId: doc.id });
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      logger.error('Failed to open document (by-case)', error, {
        filePath: doc.filePath,
        documentId: doc.id,
        fileName: doc.fileName,
      });
      toast.error(t('documents.invalidDocumentUrl'));
    }
  };

  const handleDownload = async (doc: Document) => {
    try {
      const response = await fetch(doc.filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.originalName || 'document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      toast.error(t('documents.downloadFailed'));
    }
  };

  const handleDelete = async (doc: Document) => {
    try {
      await deleteDocument.mutateAsync(doc.id);
      refetch();
    } catch (error) {
      // Error toast handled by mutation
    }
  };

  const openCaseDocuments = (group: CaseDocumentsGroup) => {
    setSelectedCase(group);
    setCaseDialogOpen(true);
  };

  const handleUpload = async (selectedFile: File, documentType: DocumentType, caseId: string) => {
    if (!selectedFile || !documentType || !caseId) {
      toast.error(t('documents.selectFileTypeAndCase'));
      return;
    }

    let uploadedFileUrl: string | null = null;
    let uploadSuccess = false;

    try {
      setIsUploading(true);

      // Step 1: Upload file to storage
      const headers = await getAuthHeaders();
      const uploadedFiles = await uploadFiles('documentUploader', {
        files: [selectedFile],
        headers,
      });

      if (!uploadedFiles || uploadedFiles.length === 0) {
        throw new Error('Upload failed: No result returned from storage');
      }

      const uploaded = uploadedFiles[0];
      uploadedFileUrl = uploaded.ufsUrl;
      uploadSuccess = true;

      // Step 2: Create document metadata in database
      await createDocument.mutateAsync({
        fileName: uploaded.name,
        originalName: selectedFile.name,
        filePath: uploaded.ufsUrl,
        fileSize: uploaded.size,
        mimeType: uploaded.type || selectedFile.type,
        documentType: documentType as DocumentType,
        caseId,
      });

      toast.success(t('documents.uploadSuccess'));
      setUploadOpen(false);
      refetch();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error('Document upload failed', error);
      toast.error(errorMessage || t('documents.uploadFailed'));
    } finally {
      setIsUploading(false);
    }
  };

  const isClient = user?.role === 'CLIENT';
  const isAdmin = user?.role === 'ADMIN';
  const isAgent = user?.role === 'AGENT';

  // Determine border color based on role
  const borderColor = isAdmin
    ? '#ff4538' // Second color scheme for ADMIN
    : isAgent
      ? '#143240' // Fourth color scheme for AGENT
      : '#361d22'; // Third color scheme for CLIENT

  if (isLoading) return <DocumentsByCaseTableSkeleton />;

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{t('documents.errorLoadingShort')}</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold leading-tight">
              {t('documents.title')}
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1.5 sm:mt-2 leading-relaxed">
              {isClient
                ? t('documents.manageDocuments')
                : user?.role === 'ADMIN'
                  ? t('documents.reviewAllDocuments')
                  : t('documents.reviewAssignedDocuments')}
            </p>
          </div>
          {/* Upload button for clients */}
          {isClient && (
            <UploadDialog
              open={uploadOpen}
              onOpenChange={setUploadOpen}
              onUpload={handleUpload}
              isUploading={isUploading}
            />
          )}
        </div>

        {/* Filters */}
        <Card style={{ borderColor, borderWidth: '1px', borderStyle: 'solid' }}>
          <CardContent className="pt-4 sm:pt-6">
            <div className="flex flex-col md:flex-row gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search
                  className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4"
                  style={{ color: '#ff4538' }}
                />
                <Input
                  placeholder={
                    t('documents.searchByCaseOrClient') ||
                    'Search by case reference, client name, or service type'
                  }
                  className="pl-8 sm:pl-10 text-xs sm:text-sm h-9 sm:h-10"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('documents.allStatus')}</SelectItem>
                  <SelectItem value={DocumentStatus.PENDING}>{t('documents.pending')}</SelectItem>
                  <SelectItem value={DocumentStatus.APPROVED}>{t('documents.approved')}</SelectItem>
                  <SelectItem value={DocumentStatus.REJECTED}>{t('documents.rejected')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Table - Responsive with horizontal scroll on mobile */}
        {filteredGroups.length === 0 ? (
          <Card style={{ borderColor, borderWidth: '1px', borderStyle: 'solid' }}>
            <CardContent className="py-8 sm:py-12 text-center">
              <FileText
                className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground mb-3 sm:mb-4 opacity-50"
                style={{ color: '#ff4538' }}
              />
              <h3 className="text-lg sm:text-xl font-semibold mb-1.5 sm:mb-2 leading-tight">
                {t('documents.noDocumentsFound')}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {searchQuery || statusFilter !== 'all'
                  ? t('documents.adjustFilters')
                  : t('documents.noDocumentsUploaded')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="overflow-x-auto mx-[0.1.1rem] md:flex-row max-w-7xl">
            <Card
              className="rounded-none sm:rounded-lg"
              style={{ borderColor, borderWidth: '1px', borderStyle: 'solid' }}
            >
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="py-2 sm:py-3">
                      <TableHead className="min-w-[200px] text-xs sm:text-sm py-2 sm:py-3">
                        {t('documents.case') || 'Case'}
                      </TableHead>
                      {!isClient && (
                        <TableHead className="min-w-[150px] text-xs sm:text-sm py-2 sm:py-3">
                          {t('documents.client')}
                        </TableHead>
                      )}
                      <TableHead className="min-w-[100px] text-xs sm:text-sm py-2 sm:py-3">
                        {t('documents.totalDocuments')}
                      </TableHead>
                      <TableHead className="min-w-[120px] text-xs sm:text-sm py-2 sm:py-3">
                        {t('documents.pendingReview')}
                      </TableHead>
                      <TableHead className="min-w-[100px] text-xs sm:text-sm py-2 sm:py-3">
                        {t('documents.latestUpload')}
                      </TableHead>
                      <TableHead className="text-right min-w-[100px] text-xs sm:text-sm py-2 sm:py-3">
                        {t('documents.actions')}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedGroups.map((group) => {
                      const latestDoc = group.documents[0];
                      return (
                        <TableRow key={group.caseId} className="py-2 sm:py-3">
                          <TableCell className="py-2 sm:py-3">
                            <button
                              onClick={() => openCaseDocuments(group)}
                              className="flex items-center gap-1.5 sm:gap-2 hover:underline text-left w-full"
                              title={`Click to view all ${group.documentCount} document${group.documentCount !== 1 ? 's' : ''} for this case`}
                            >
                              <Briefcase
                                className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0"
                                style={{ color: '#ff4538' }}
                              />
                              <span className="text-sm sm:text-base font-medium truncate">
                                {group.caseReference}
                              </span>
                              <span className="text-[10px] sm:text-xs text-muted-foreground ml-auto">
                                ({group.documentCount})
                              </span>
                            </button>
                          </TableCell>
                          {!isClient && (
                            <TableCell className="py-2 sm:py-3">
                              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                                <User
                                  className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0"
                                  style={{ color: '#ff4538' }}
                                />
                                <span className="text-xs sm:text-sm truncate">
                                  {group.clientName}
                                </span>
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="py-2 sm:py-3">
                            <Badge variant="secondary" className="text-[10px] sm:text-xs">
                              {group.documentCount}{' '}
                              {group.documentCount === 1
                                ? t('documents.document')
                                : t('documents.documents_plural')}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 sm:py-3">
                            {group.pendingCount > 0 ? (
                              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300 text-[10px] sm:text-xs">
                                {group.pendingCount}
                              </Badge>
                            ) : (
                              <span className="text-xs sm:text-sm text-muted-foreground">
                                {t('documents.none')}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-2 sm:py-3 text-xs sm:text-sm text-muted-foreground">
                            {latestDoc
                              ? new Date(latestDoc.uploadDate).toLocaleDateString()
                              : 'N/A'}
                          </TableCell>
                          <TableCell className="py-2 sm:py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openCaseDocuments(group)}
                                    className="flex-shrink-0"
                                    style={{
                                      backgroundColor: 'transparent',
                                      borderColor: 'rgba(255, 69, 56, 0.3)',
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                      color: 'inherit',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.5)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.3)';
                                    }}
                                  >
                                    <FileText
                                      className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                                      style={{ color: '#ff4538' }}
                                    />
                                    <span className="hidden sm:inline ml-1 text-xs sm:text-sm">
                                      {t('documents.view')}
                                    </span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('documents.viewDocuments')}</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    asChild
                                    className="flex-shrink-0"
                                    style={{
                                      backgroundColor: 'transparent',
                                      borderColor: 'rgba(255, 69, 56, 0.3)',
                                      borderWidth: '1px',
                                      borderStyle: 'solid',
                                      color: 'inherit',
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.5)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.3)';
                                    }}
                                  >
                                    <Link href={`/dashboard/cases/${group.caseId}`}>
                                      <Briefcase
                                        className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                                        style={{ color: '#ff4538' }}
                                      />
                                      <span className="hidden sm:inline ml-1 text-xs sm:text-sm">
                                        {t('documents.viewCase')}
                                      </span>
                                    </Link>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{t('documents.viewCaseDetails')}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t('documents.showing', {
                from: (currentPage - 1) * itemsPerPage + 1,
                to: Math.min(currentPage * itemsPerPage, filteredGroups.length),
                total: filteredGroups.length,
              })}
            </p>
            <div className="flex gap-1.5 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  backgroundColor: 'transparent',
                  borderColor: 'rgba(255, 69, 56, 0.3)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: 'inherit',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.3)';
                }}
              >
                <ChevronLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: '#ff4538' }} />
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-xs sm:text-sm px-1.5 sm:px-2">
                  {t('documents.page', { current: currentPage, total: totalPages })}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  backgroundColor: 'transparent',
                  borderColor: 'rgba(255, 69, 56, 0.3)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: 'inherit',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.3)';
                }}
              >
                <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: '#ff4538' }} />
              </Button>
            </div>
          </div>
        )}

        {/* Case Documents Dialog */}
        <Dialog open={caseDialogOpen} onOpenChange={setCaseDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
            <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 flex-shrink-0">
              <DialogTitle className="text-base sm:text-lg flex items-center gap-2">
                <Briefcase className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#ff4538' }} />
                {t('documents.caseDocuments', { reference: selectedCase?.caseReference }) ||
                  `Case ${selectedCase?.caseReference}`}
              </DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                <div className="space-y-1">
                  {!isClient && (
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" style={{ color: '#ff4538' }} />
                      <span>{selectedCase?.clientName}</span>
                    </div>
                  )}
                  <div>
                    {t('documents.documentsUploaded', {
                      count: selectedCase?.documentCount || 0,
                      type:
                        selectedCase?.documentCount === 1
                          ? t('documents.document')
                          : t('documents.documents_plural'),
                    })}
                    {selectedCase && selectedCase.pendingCount > 0 && (
                      <span className="text-yellow-600">
                        {' '}
                        • {t('documents.pendingReviewCount', { count: selectedCase.pendingCount })}
                      </span>
                    )}
                  </div>
                  {!isClient && (
                    <span className="text-xs block mt-2">{t('documents.approveRejectHint')}</span>
                  )}
                </div>
              </DialogDescription>
            </DialogHeader>

            <div className="px-6 pb-6 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-3">
                {selectedCase?.documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onView={() => handleView(doc)}
                    onDownload={() => handleDownload(doc)}
                    onDelete={
                      isClient && doc.status !== 'APPROVED' ? () => handleDelete(doc) : undefined
                    }
                    showCaseInfo={!isClient}
                    showDelete={isClient && doc.status !== 'APPROVED'}
                    isDeleting={deleteDocument.isPending}
                    {...({ borderColor } as { borderColor?: string })}
                  />
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

function DocumentsByCaseTableSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <SkeletonText size="xl" className="w-48" />
        <SkeletonText size="sm" className="w-80" />
      </div>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <SimpleSkeleton className="h-10 flex-1 rounded" />
            <SimpleSkeleton className="h-10 w-full md:w-[200px] rounded" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-0">
          <div className="space-y-4 p-6">
            {[1, 2, 3, 4, 5].map((i) => (
              <SimpleSkeleton key={i} className="h-16 w-full rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
