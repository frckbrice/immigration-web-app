'use client';

import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import { useAuthStore } from '@/features/auth/store';
import { useSendEmail } from '../api/mutations';
import { useCases } from '@/features/cases/api/queries';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Mail, Paperclip, X, Send, FileIcon, Loader2, Briefcase, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';
import { useTranslation } from 'react-i18next';
import { SimpleSkeleton } from '@/components/ui/simple-skeleton';
import { uploadFiles, getAuthHeaders } from '@/lib/uploadthing/client';
import type { MessageAttachment } from '@/lib/types';
import { useMediaQuery } from '@/lib/utils/hooks/useMediaQuery';

interface EmailComposerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientId?: string; // For agents - pre-select recipient
  recipientName?: string;
  recipientEmail?: string;
  caseReference?: string;
}

export function EmailComposer({
  open,
  onOpenChange,
  recipientId,
  recipientName,
  recipientEmail,
  caseReference,
}: EmailComposerProps) {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const sendEmail = useSendEmail();
  const isDesktop = useMediaQuery('(min-width: 768px)');

  // Form state
  const [caseId, setCaseId] = useState('');
  const [selectedRecipient, setSelectedRecipient] = useState(recipientId || '');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update selected recipient when props change
  useEffect(() => {
    if (recipientId) {
      setSelectedRecipient(recipientId);
    }
  }, [recipientId]);

  // Pre-fill subject with case reference if available
  useEffect(() => {
    if (caseReference && open && !subject) {
      setSubject(t('email.regardingCase', { caseReference }) || `Regarding Case: ${caseReference}`);
    }
  }, [caseReference, open]);

  // Fetch cases (for all users - now required for emails)
  const {
    data: casesData,
    isLoading: isLoadingCases,
    isError: isErrorLoadingCases,
    refetch: refetchCases,
  } = useCases(
    { limit: 100 },
    {
      enabled: open, // Now enabled for all users since caseId is required
      refetchOnMount: true, // Override default to ensure fresh data when opening
      staleTime: 30 * 1000, // 30 seconds - shorter than default for more recent data
    }
  );

  // Filter out approved cases - approved cases should not be available for email operations
  const userCases = (casesData?.cases || []).filter(
    (caseItem: any) => caseItem.status !== 'APPROVED'
  );

  // Log for debugging
  useEffect(() => {
    if (open) {
      logger.debug('[EmailComposer] Cases query state', {
        isLoading: isLoadingCases,
        isError: isErrorLoadingCases,
        casesCount: userCases.length,
        totalCases: casesData?.cases?.length || 0,
        hasData: !!casesData,
      });
    }
  }, [open, isLoadingCases, isErrorLoadingCases, userCases.length, casesData]);

  const handleReset = useCallback(() => {
    setCaseId('');
    setSelectedRecipient('');
    setSubject('');
    setContent('');
    setAttachments([]);
  }, []);

  const handleSend = useCallback(async () => {
    if (!subject.trim() || !content.trim()) {
      toast.error(t('email.subjectAndMessageRequired'));
      return;
    }

    // CRITICAL: ALL emails must have a caseId
    if (!caseId) {
      toast.error(t('email.pleaseSelectCase'));
      return;
    }

    if (user?.role !== 'CLIENT' && !selectedRecipient) {
      toast.error(t('email.pleaseSelectRecipient'));
      return;
    }

    try {
      await sendEmail.mutateAsync({
        recipientId: selectedRecipient || undefined,
        caseId, // caseId is now required
        subject,
        content,
        attachments: attachments.length > 0 ? attachments : undefined,
      });

      // Success - reset form and close
      handleReset();
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
      logger.error('Email send error', error);
    }
  }, [
    subject,
    content,
    user?.role,
    caseId,
    selectedRecipient,
    sendEmail,
    attachments,
    handleReset,
    onOpenChange,
  ]);

  // Handle file selection
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;

      // Validate file count (max 3)
      if (attachments.length + files.length > 3) {
        toast.error(t('email.maxAttachments') || 'Maximum 3 attachments allowed per email');
        return;
      }

      setIsUploading(true);
      try {
        logger.debug('[Email Upload] Starting upload', { fileCount: files.length });

        const headers = await getAuthHeaders();
        const uploadedFiles = await uploadFiles('messageAttachment', {
          files: Array.from(files),
          headers,
        });

        if (!uploadedFiles || uploadedFiles.length === 0) {
          throw new Error(t('email.uploadFailed') || 'Upload failed: No result returned');
        }

        const newAttachments: MessageAttachment[] = uploadedFiles.map((file) => ({
          url: file.ufsUrl,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          uploadedAt: new Date().toISOString(),
        }));

        setAttachments((prev) => [...prev, ...newAttachments]);
        toast.success(t('email.filesAttached', { count: uploadedFiles.length }));
      } catch (error) {
        logger.error('File upload error:', error);
        toast.error(t('email.uploadError') || 'Failed to upload file(s)');
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    },
    [attachments.length, sendEmail.isPending]
  );

  const handleRemoveAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Helper function to get human-readable service type labels with proper fallbacks
  const getServiceTypeLabel = useCallback(
    (serviceType: string): string => {
      // Default English labels as fallback
      const defaultLabels: Record<string, string> = {
        STUDENT_VISA: 'Student Visa',
        WORK_PERMIT: 'Work Permit',
        FAMILY_REUNIFICATION: 'Family Reunification',
        TOURIST_VISA: 'Tourist Visa',
        BUSINESS_VISA: 'Business Visa',
        PERMANENT_RESIDENCY: 'Permanent Residency',
      };

      // Try translation first, fall back to default label
      const translationKey = `cases.serviceTypes.${serviceType}`;
      const translated = t(translationKey);

      // If translation returns the key itself, use default label
      if (translated === translationKey) {
        return defaultLabels[serviceType] || serviceType.replace(/_/g, ' ');
      }

      return translated;
    },
    [t]
  );

  // Helper function to get human-readable status labels with proper fallbacks
  const getCaseStatusLabel = useCallback(
    (status: string): string => {
      // Default English labels as fallback
      const defaultLabels: Record<string, string> = {
        SUBMITTED: 'Submitted',
        UNDER_REVIEW: 'Under Review',
        DOCUMENTS_REQUIRED: 'Documents Required',
        PROCESSING: 'Processing',
        APPROVED: 'Approved',
        REJECTED: 'Rejected',
        CLOSED: 'Closed',
      };

      // Try translation first, fall back to default label
      const translationKey = `cases.status.${status}`;
      const translated = t(translationKey);

      // If translation returns the key itself, use default label
      if (translated === translationKey) {
        return defaultLabels[status] || status.replace(/_/g, ' ');
      }

      return translated;
    },
    [t]
  );

  const isFormValid = useMemo(
    () =>
      subject.trim() &&
      content.trim() &&
      caseId &&
      (user?.role !== 'CLIENT' ? selectedRecipient : true),
    [subject, content, caseId, user?.role, selectedRecipient]
  );

  // Memoized input change handlers
  const handleSubjectChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSubject(e.target.value);
  }, []);

  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);

  const handleCaseChange = useCallback((value: string) => {
    setCaseId(value);
  }, []);

  // Form content component (reused in both Sheet and Dialog)
  // Memoized to prevent re-rendering and input jumping
  const FormContent = useMemo(
    () => (
      <div className="space-y-4 sm:space-y-6 px-0 sm:px-1">
        {/* Recipient Info Card - For Agents/Admins */}
        {user?.role !== 'CLIENT' && (recipientName || recipientEmail) && (
          <div className="p-2.5 sm:p-4 rounded-lg border border-border bg-card">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-full shrink-0 bg-primary/10">
                <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-xs sm:text-sm text-muted-foreground">
                  {t('email.sendingEmailTo')}
                </h4>
                <p className="text-xs sm:text-sm font-medium mt-1 truncate text-foreground">
                  {recipientName}
                </p>
                {recipientEmail && (
                  <p className="text-xs truncate break-all text-muted-foreground">
                    {recipientEmail}
                  </p>
                )}
                {caseReference && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Briefcase className="h-3 w-3 shrink-0 text-primary" />
                    <span className="truncate">{t('email.caseLabel', { caseReference })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Case Selector - Required for ALL users */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between gap-2">
            <Label
              htmlFor="case-select"
              className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 text-foreground"
            >
              <Briefcase className="h-3 w-3 sm:h-4 sm:w-4 shrink-0 text-primary" />
              <span className="truncate">{t('email.selectCase') || 'Select Case'}</span>
              <span className="text-primary">*</span>
            </Label>
            {userCases.length > 0 && (
              <span className="text-xs text-muted-foreground shrink-0">
                {userCases.length} {userCases.length === 1 ? 'case' : 'cases'}
              </span>
            )}
          </div>

          {isLoadingCases ? (
            <div className="space-y-2">
              <SimpleSkeleton className="h-14 w-full rounded-lg" />
              <SimpleSkeleton className="h-4 w-3/4 rounded" />
            </div>
          ) : isErrorLoadingCases ? (
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-sm text-red-700 p-4 bg-red-50 rounded-lg border border-red-200">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Unable to load cases</p>
                  <p className="text-xs mt-1 opacity-90">
                    {t('email.casesLoadError') || 'Please check your connection and try again.'}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchCases()}
                className="w-full h-10"
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                {t('common.retry') || 'Retry'}
              </Button>
            </div>
          ) : userCases.length === 0 ? (
            <div className="flex items-start gap-3 text-sm text-amber-700 p-4 bg-amber-50 rounded-lg border border-amber-200">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">No cases found</p>
                <p className="text-xs mt-1 opacity-90">
                  {t('email.noCasesAvailable') ||
                    'Please create a case first to send emails to your agent.'}
                </p>
              </div>
            </div>
          ) : (
            <>
              <Select value={caseId} onValueChange={handleCaseChange}>
                <SelectTrigger
                  id="case-select"
                  className="h-12 sm:h-14 transition-all text-sm sm:text-base text-foreground bg-input border border-primary/30 hover:border-primary/50 focus:border-primary [&[data-placeholder]]:text-muted-foreground"
                >
                  <SelectValue
                    placeholder={t('email.chooseCasePlaceholder') || 'Choose a case to continue...'}
                  >
                    {caseId &&
                      (() => {
                        const selectedCase = userCases.find((c: any) => c.id === caseId);
                        if (!selectedCase) return null;

                        const statusColorMap: Record<string, string> = {
                          SUBMITTED: 'bg-blue-100 text-blue-700',
                          UNDER_REVIEW: 'bg-purple-100 text-purple-700',
                          DOCUMENTS_REQUIRED: 'bg-orange-100 text-orange-700',
                          PROCESSING: 'bg-indigo-100 text-indigo-700',
                          APPROVED: 'bg-green-100 text-green-700',
                          REJECTED: 'bg-red-100 text-red-700',
                          CLOSED: 'bg-gray-100 text-gray-700',
                        };
                        const statusColor =
                          statusColorMap[selectedCase.status] || 'bg-gray-100 text-gray-700';

                        return (
                          <div className="flex items-center justify-between w-full pr-2">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-sm text-foreground">
                                {selectedCase.referenceNumber}
                              </span>
                              <span className="text-xs flex items-center gap-1 text-muted-foreground">
                                <Briefcase className="h-3 w-3 text-primary" />
                                {getServiceTypeLabel(selectedCase.serviceType)}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${statusColor}`}
                            >
                              {getCaseStatusLabel(selectedCase.status)}
                            </span>
                          </div>
                        );
                      })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-[300px] bg-popover border-border">
                  {userCases.map((caseItem: any) => {
                    const statusColorMap: Record<string, string> = {
                      SUBMITTED: 'bg-blue-100 text-blue-700',
                      UNDER_REVIEW: 'bg-purple-100 text-purple-700',
                      DOCUMENTS_REQUIRED: 'bg-orange-100 text-orange-700',
                      PROCESSING: 'bg-indigo-100 text-indigo-700',
                      APPROVED: 'bg-green-100 text-green-700',
                      REJECTED: 'bg-red-100 text-red-700',
                      CLOSED: 'bg-gray-100 text-gray-700',
                    };
                    const statusColor =
                      statusColorMap[caseItem.status] || 'bg-gray-100 text-gray-700';

                    return (
                      <SelectItem
                        key={caseItem.id}
                        value={caseItem.id}
                        className="py-3 cursor-pointer transition-all hover:bg-accent"
                      >
                        <div className="flex flex-col gap-2 w-full">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-sm text-foreground">
                              {caseItem.referenceNumber}
                            </span>
                            <span
                              className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${statusColor}`}
                            >
                              {getCaseStatusLabel(caseItem.status)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Briefcase className="h-3 w-3 text-primary" />
                            <span>{getServiceTypeLabel(caseItem.serviceType)}</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <div className="flex items-start gap-2 p-2.5 sm:p-3 rounded-lg border border-border bg-card">
                <Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5 text-primary" />
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {t('email.caseHelper') ||
                    'Your email will be sent to the agent assigned to the selected case'}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Subject */}
        <div className="space-y-2 sm:space-y-2.5">
          <Label
            htmlFor="subject"
            className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 text-foreground"
          >
            {t('email.subject') || 'Subject'}
            <span className="text-primary">*</span>
          </Label>
          <Input
            id="subject"
            value={subject}
            onChange={handleSubjectChange}
            placeholder={t('email.subjectPlaceholder') || 'Enter email subject...'}
            maxLength={200}
            className="h-11 sm:h-12 text-sm sm:text-base text-foreground bg-input border-primary/30 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
          />
          <div className="flex justify-between items-center gap-2">
            <p className="text-xs text-muted-foreground truncate">
              {subject.trim() ? t('email.subjectProvided') : t('email.subjectRequired')}
            </p>
            <p className="text-xs text-muted-foreground shrink-0">{subject.length}/200</p>
          </div>
        </div>

        {/* Message Content - Rich Text Area */}
        <div className="space-y-2 sm:space-y-2.5">
          <Label
            htmlFor="content"
            className="text-xs sm:text-sm font-semibold flex items-center gap-1.5 sm:gap-2 text-foreground"
          >
            {t('email.message') || 'Message'}
            <span className="text-primary">*</span>
          </Label>
          <Textarea
            id="content"
            value={content}
            onChange={handleContentChange}
            placeholder={
              t('email.contentPlaceholder') ||
              'Type your message here...\n\nYou can format your message with:\n• Line breaks\n• Bullet points\n• Multiple paragraphs'
            }
            className="min-h-[180px] sm:min-h-[220px] resize-y text-sm sm:text-base leading-relaxed text-foreground bg-input border-primary/30 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            maxLength={5000}
          />
          <div className="flex justify-between items-center gap-2">
            <p className="text-xs text-muted-foreground truncate">
              {content.trim()
                ? t('email.wordCount', { count: content.split(/\s+/).filter(Boolean).length }) ||
                  `✓ ${content.split(/\s+/).filter(Boolean).length} words`
                : t('email.messageRequired')}
            </p>
            <p className="text-xs text-muted-foreground shrink-0">{content.length}/5000</p>
          </div>
        </div>

        {/* Attachments */}
        <div className="space-y-2 sm:space-y-3">
          <Label className="text-xs sm:text-sm font-semibold text-foreground">
            {t('email.attachments') || 'Attachments'} (Optional)
          </Label>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.doc,.docx"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Attachment Preview */}
          {attachments.length > 0 && (
            <div className="space-y-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs font-medium text-slate-700 uppercase tracking-wide">
                Attached Files ({attachments.length}/3)
              </p>
              {attachments.map((attachment, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-2.5 bg-white rounded-md border border-slate-200 shadow-sm"
                >
                  <div className="p-2 bg-blue-50 rounded">
                    <FileIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{attachment.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {attachment.size > 1024 * 1024
                        ? `${(attachment.size / (1024 * 1024)).toFixed(2)} MB`
                        : `${(attachment.size / 1024).toFixed(0)} KB`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                    onClick={() => handleRemoveAttachment(index)}
                    disabled={isUploading || sendEmail.isPending}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading || attachments.length >= 3 || sendEmail.isPending}
            className="w-full h-10 sm:h-11 border-dashed border-2 hover:border-solid text-sm sm:text-base border-primary/30 hover:border-primary/50 text-foreground"
          >
            <Paperclip className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 shrink-0 text-primary" />
            {isUploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin shrink-0" />
                <span className="truncate">Uploading...</span>
              </>
            ) : (
              <span className="truncate">
                {attachments.length === 0 ? t('email.addFiles') : t('email.addMoreFiles')} (
                {attachments.length}/3)
              </span>
            )}
          </Button>
          {attachments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center px-2">
              Support: Images, PDF, Word documents • Max 3 files
            </p>
          )}
        </div>
      </div>
    ),
    [
      user?.role,
      recipientName,
      recipientEmail,
      caseReference,
      isLoadingCases,
      isErrorLoadingCases,
      userCases,
      caseId,
      subject,
      content,
      attachments,
      isUploading,
      sendEmail.isPending,
      t,
      handleCaseChange,
      handleSubjectChange,
      handleContentChange,
      handleRemoveAttachment,
      refetchCases,
      getServiceTypeLabel,
      getCaseStatusLabel,
    ]
  );

  // Desktop: Slide-over Sheet
  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-xl overflow-y-auto bg-background border-l border-border">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-foreground">
              <Mail className="h-5 w-5 text-primary" />
              {t('email.compose') || 'Compose Email'}
            </SheetTitle>
            <SheetDescription className="text-muted-foreground">
              {user?.role === 'CLIENT'
                ? t('email.clientDescription') || 'Send a formal email to your assigned agent'
                : t('email.agentDescription') || 'Send a formal email to your client'}
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 px-1">{FormContent}</div>

          <SheetFooter className="gap-3 sm:gap-3 pt-6 border-t sticky bottom-0 pb-6 bg-background border-border">
            <Button
              variant="outline"
              onClick={() => {
                handleReset();
                onOpenChange(false);
              }}
              disabled={sendEmail.isPending}
              className="flex-1 h-11 border-border hover:border-primary/50"
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleSend}
              disabled={!isFormValid || sendEmail.isPending || isUploading}
              className="flex-1 h-11 bg-primary text-primary-foreground border border-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendEmail.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t('email.sending') || 'Sending...'}
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  {t('email.send') || 'Send Email'}
                </>
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    );
  }

  // Mobile: Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-[90vw] sm:max-w-lg max-h-[90vh] sm:max-h-[90vh] h-[100vh] sm:h-auto overflow-y-auto p-4 sm:p-6 bg-background border-border">
        <DialogHeader className="space-y-2 sm:space-y-3 pb-3 sm:pb-0">
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl text-foreground">
            <Mail className="h-4 w-4 sm:h-5 sm:w-5 shrink-0 text-primary" />
            <span className="truncate">{t('email.compose') || 'Compose Email'}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm text-muted-foreground">
            {user?.role === 'CLIENT'
              ? t('email.clientDescription') || 'Send a formal email to your assigned agent'
              : t('email.agentDescription') || 'Send a formal email to your client'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-3 sm:py-4">{FormContent}</div>

        <DialogFooter className="gap-2 sm:gap-3 flex-col sm:flex-row pt-3 sm:pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => {
              handleReset();
              onOpenChange(false);
            }}
            disabled={sendEmail.isPending}
            className="w-full sm:w-auto h-10 sm:h-11 border-border hover:border-primary/50"
          >
            {t('common.cancel') || 'Cancel'}
          </Button>
          <Button
            onClick={handleSend}
            disabled={!isFormValid || sendEmail.isPending || isUploading}
            className="w-full sm:w-auto h-10 sm:h-11 bg-primary text-primary-foreground border border-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendEmail.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('email.sending') || 'Sending...'}
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                {t('email.send') || 'Send Email'}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
