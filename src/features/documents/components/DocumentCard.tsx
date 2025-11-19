'use client';

import type { Document } from '../types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  Download,
  Trash2,
  File,
  Image,
  FileIcon,
  ExternalLink,
  Briefcase,
  User,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';

const getStatusConfig = (t: any) => ({
  PENDING: {
    label: t('documents.pending'),
    icon: Clock,
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  },
  APPROVED: {
    label: t('documents.approved'),
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  },
  REJECTED: {
    label: t('documents.rejected'),
    icon: XCircle,
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
  },
});

const getDocTypeLabels = (t: any) => ({
  PASSPORT: t('documents.types.PASSPORT'),
  ID_CARD: t('documents.types.ID_CARD'),
  BIRTH_CERTIFICATE: t('documents.types.BIRTH_CERTIFICATE'),
  MARRIAGE_CERTIFICATE: t('documents.types.MARRIAGE_CERTIFICATE'),
  DIPLOMA: t('documents.types.DIPLOMA'),
  EMPLOYMENT_LETTER: t('documents.types.EMPLOYMENT_LETTER'),
  BANK_STATEMENT: t('documents.types.BANK_STATEMENT'),
  PROOF_OF_RESIDENCE: t('documents.types.PROOF_OF_RESIDENCE'),
  PHOTO: t('documents.types.PHOTO'),
  OTHER: t('documents.types.OTHER'),
});

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
};

const getFileIcon = (mimeType: string) => {
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType === 'application/pdf') return File;
  return FileIcon;
};

export interface DocumentCardProps {
  document: Document;
  onView: () => void;
  onDownload: () => void;
  onDelete?: () => void;
  showDelete?: boolean;
  isDeleting?: boolean;
  showCaseInfo?: boolean; // Show case and client info for AGENT/ADMIN
}

export function DocumentCard({
  document,
  onView,
  onDownload,
  onDelete,
  showDelete = false,
  isDeleting = false,
  showCaseInfo = false,
}: DocumentCardProps) {
  const { t } = useTranslation();
  const statusConfig = getStatusConfig(t);
  const docTypeLabels = getDocTypeLabels(t);
  const StatusIcon = statusConfig[document.status]?.icon || Clock;
  const FIcon = getFileIcon(document.mimeType);

  return (
    <TooltipProvider>
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
            <div className="flex gap-3 sm:gap-4 flex-1 min-w-0">
              <div className="p-3 rounded-lg bg-muted flex-shrink-0">
                <FIcon className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-1">
                  <h3 className="font-semibold truncate text-sm sm:text-base">
                    {document.originalName}
                  </h3>
                  <Badge
                    className={cn(
                      'flex items-center gap-1 w-fit text-xs',
                      statusConfig[document.status]?.className || ''
                    )}
                  >
                    <StatusIcon className="h-3 w-3 flex-shrink-0" />
                    <span className="whitespace-nowrap">
                      {statusConfig[document.status]?.label || document.status}
                    </span>
                  </Badge>
                </div>

                {/* Case Reference - Always shown */}
                {document.case && (
                  <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 mb-2">
                    <div className="flex items-center gap-1.5 text-sm min-w-0">
                      <Briefcase className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium text-primary truncate">
                        {document.case.referenceNumber}
                      </span>
                    </div>
                    {/* Client Info - Only shown for AGENT/ADMIN */}
                    {showCaseInfo && document.uploadedBy && (
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground min-w-0">
                        <User className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">
                          {document.uploadedBy.firstName} {document.uploadedBy.lastName}
                        </span>
                      </div>
                    )}
                    {/* View Case Button - Only shown for AGENT/ADMIN */}
                    {showCaseInfo && (
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-sm self-start sm:self-center"
                        asChild
                      >
                        <Link href={`/dashboard/cases/${document.caseId}`}>
                          {t('documents.viewCase')} <ExternalLink className="ml-1 h-3 w-3 inline" />
                        </Link>
                      </Button>
                    )}
                  </div>
                )}

                <p className="text-xs sm:text-sm text-muted-foreground break-words">
                  {docTypeLabels[document.documentType] || document.documentType} •{' '}
                  {formatFileSize(document.fileSize)} •{' '}
                  {new Date(document.uploadDate).toLocaleDateString()}
                </p>
                {document.status === 'APPROVED' && document.verifiedBy && (
                  <p className="text-xs text-green-600 mt-1 break-words">
                    ✓ {t('documents.verifiedBy')} {document.verifiedBy}
                  </p>
                )}
                {document.status === 'REJECTED' && document.rejectionReason && (
                  <div className="flex gap-2 mt-2 p-2 bg-red-50 dark:bg-red-950/20 rounded">
                    <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                    <p className="text-xs text-red-600 break-words">{document.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-2 flex-shrink-0 justify-end sm:justify-start">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onView}
                    aria-label={t('documents.viewDocumentAria', {
                      fileName: document.originalName ?? t('documents.document'),
                    })}
                    className="flex-shrink-0"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('documents.viewDocument')}</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDownload}
                    aria-label={t('documents.downloadDocumentAria', {
                      fileName: document.originalName ?? t('documents.document'),
                    })}
                    className="flex-shrink-0"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('documents.downloadDocument')}</p>
                </TooltipContent>
              </Tooltip>

              {showDelete && onDelete && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onDelete}
                      disabled={isDeleting}
                      aria-label={t('documents.deleteDocumentAria', {
                        fileName: document.originalName ?? t('documents.document'),
                      })}
                      className="flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('documents.deleteDocument')}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
