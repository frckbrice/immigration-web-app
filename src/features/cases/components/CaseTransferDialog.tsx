'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useUsers } from '@/features/users/api';
import { useTransferCase } from '../api/mutations';
import { useAuthStore } from '@/features/auth/store';
import type { Case } from '../types';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { RefreshCw, Info } from 'lucide-react';
import { getInitials } from '@/lib/utils/helpers';
import { toast } from 'sonner';

interface CaseTransferDialogProps {
  caseData: Case;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const getTransferSchema = (t: any) =>
  z.object({
    newAgentId: z.string().min(1, t('cases.dialogs.transferCase.selectAgent')),
    reason: z.enum(['REASSIGNMENT', 'COVERAGE', 'SPECIALIZATION', 'WORKLOAD', 'OTHER']),
    handoverNotes: z.string().optional(),
    notifyClient: z.boolean(),
    notifyAgent: z.boolean(),
  });

type TransferFormValues = z.infer<ReturnType<typeof getTransferSchema>>;

export function CaseTransferDialog({
  caseData,
  open,
  onOpenChange,
  onSuccess,
}: CaseTransferDialogProps) {
  const { t } = useTranslation();
  const { user, isLoading: isAuthLoading, accessToken } = useAuthStore();

  // SECURITY FIX: Only fetch if dialog is open and user is ADMIN/AGENT with valid token
  const { data: usersData, isLoading: isLoadingUsers } = useUsers(
    { role: 'AGENT' },
    {
      enabled:
        open &&
        !isAuthLoading &&
        !!user &&
        !!accessToken &&
        (user.role === 'ADMIN' || user.role === 'AGENT'),
    }
  );
  const transferCase = useTransferCase();

  const form = useForm<TransferFormValues>({
    resolver: zodResolver(getTransferSchema(t)),
    defaultValues: {
      newAgentId: '',
      reason: 'REASSIGNMENT',
      handoverNotes: '',
      notifyClient: true,
      notifyAgent: true,
    },
  });

  const agents = usersData?.users || [];
  const selectedAgentId = form.watch('newAgentId');
  const selectedAgent = agents.find((a: any) => a.id === selectedAgentId);

  const onSubmit = async (data: TransferFormValues) => {
    try {
      await transferCase.mutateAsync({
        caseId: caseData.id,
        newAgentId: data.newAgentId,
        reason: data.reason,
        handoverNotes: data.handoverNotes,
        notifyClient: data.notifyClient,
        notifyAgent: data.notifyAgent,
      });

      toast.success(t('cases.dialogs.transferCase.transferredSuccessfully'));
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      // Error is handled in mutation
    }
  };

  const reasonLabels: Record<string, string> = {
    REASSIGNMENT: t('cases.dialogs.transferCase.reasons.REASSIGNMENT'),
    COVERAGE: t('cases.dialogs.transferCase.reasons.COVERAGE'),
    SPECIALIZATION: t('cases.dialogs.transferCase.reasons.SPECIALIZATION'),
    WORKLOAD: t('cases.dialogs.transferCase.reasons.WORKLOAD'),
    OTHER: t('cases.dialogs.transferCase.reasons.OTHER'),
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="max-w-2xl max-h-[95vh] overflow-y-auto sm:max-h-[90vh] w-[95vw] sm:w-full"
        style={{ borderColor: '#ff4538', borderWidth: '1px', borderStyle: 'solid' }}
      >
        <DialogHeader className="pb-2 sm:pb-3">
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg font-semibold leading-tight">
            <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" style={{ color: '#ff4538' }} />
            {t('cases.dialogs.transferCase.title')}
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm leading-relaxed">{t('cases.dialogs.transferCase.description')}</DialogDescription>
        </DialogHeader>

        {/* Current Case Info */}
        <div className="rounded-lg border p-3 sm:p-4 bg-muted/50 space-y-2 sm:space-y-3" style={{ borderColor: 'rgba(255, 69, 56, 0.2)' }}>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium break-words">
                {t('cases.dialogs.transferCase.case')}: {caseData.referenceNumber}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground break-words">
                {t('cases.dialogs.transferCase.client')}: {caseData.client?.firstName}{' '}
                {caseData.client?.lastName}
              </p>
              <p className="text-xs sm:text-sm text-muted-foreground break-words">
                {t('cases.dialogs.transferCase.service')}: {caseData.serviceType.replace(/_/g, ' ')}
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] sm:text-xs w-fit">{caseData.status}</Badge>
          </div>
          {caseData.assignedAgent && (
            <div className="pt-2 border-t mt-2" style={{ borderColor: 'rgba(255, 69, 56, 0.1)' }}>
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                {t('cases.dialogs.transferCase.currentAgent')}
              </p>
              <p className="text-xs sm:text-sm font-medium break-words">
                {caseData.assignedAgent.firstName} {caseData.assignedAgent.lastName}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground break-words">{caseData.assignedAgent.email}</p>
            </div>
          )}
        </div>

        {/* Transfer Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 sm:space-y-4">
            {/* New Agent Selection */}
            <FormField
              control={form.control}
              name="newAgentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('cases.dialogs.transferCase.newAgent')}</FormLabel>
                  {isLoadingUsers ? (
                    <Skeleton className="h-10 w-full" />
                  ) : (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('cases.dialogs.transferCase.selectAgent')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {agents
                          .filter((a: any) => a.id !== caseData.assignedAgentId && a.isActive)
                          .map((agent: any) => (
                            <SelectItem key={agent.id} value={agent.id}>
                              {agent.firstName} {agent.lastName} ({agent.email})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Selected Agent Preview */}
            {selectedAgent && (
              <div className="rounded-lg border p-3 sm:p-4 bg-background space-y-2" style={{ borderColor: 'rgba(255, 69, 56, 0.2)' }}>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Avatar className="h-8 w-8 sm:h-10 sm:w-10">
                    <AvatarFallback className="text-xs sm:text-sm" style={{ backgroundColor: '#091a24' }}>
                      {getInitials(`${selectedAgent.firstName} ${selectedAgent.lastName}`)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold break-words">
                      {selectedAgent.firstName} {selectedAgent.lastName}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground break-words">{selectedAgent.email}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Transfer Reason */}
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('cases.dialogs.transferCase.transferReason')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(reasonLabels).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Handover Notes */}
            <FormField
              control={form.control}
              name="handoverNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('cases.dialogs.transferCase.handoverNotes')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('cases.dialogs.transferCase.handoverNotesPlaceholder')}
                      className="min-h-[120px] resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('cases.dialogs.transferCase.handoverNotesDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notification Options */}
            <div className="space-y-2 sm:space-y-3 rounded-lg border p-3 sm:p-4" style={{ borderColor: 'rgba(255, 69, 56, 0.2)' }}>
              <p className="text-xs sm:text-sm font-medium">
                {t('cases.dialogs.transferCase.notificationOptions')}
              </p>

              <FormField
                control={form.control}
                name="notifyClient"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t('cases.dialogs.transferCase.notifyClient')}</FormLabel>
                      <FormDescription>
                        {t('cases.dialogs.transferCase.notifyClientDescription')}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notifyAgent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t('cases.dialogs.transferCase.notifyAgent')}</FormLabel>
                      <FormDescription>
                        {t('cases.dialogs.transferCase.notifyAgentDescription')}
                      </FormDescription>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            {/* Info Box */}
            <div className="flex items-start gap-2 p-3 rounded-md text-xs sm:text-sm" style={{ backgroundColor: 'rgba(255, 69, 56, 0.1)', borderColor: 'rgba(255, 69, 56, 0.2)', borderWidth: '1px', borderStyle: 'solid' }}>
              <Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 mt-0.5 flex-shrink-0" style={{ color: '#ff4538' }} />
              <div className="min-w-0 flex-1">
                <p className="font-medium mb-1">
                  {t('cases.dialogs.transferCase.transferEffects')}
                </p>
                <p className="text-[10px] sm:text-xs opacity-80">
                  {t('cases.dialogs.transferCase.transferEffectsDescription')}
                </p>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  form.reset();
                  onOpenChange(false);
                }}
                disabled={transferCase.isPending}
                className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: 'inherit',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 69, 56, 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                {t('cases.dialogs.transferCase.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={transferCase.isPending || !form.formState.isValid}
                className="w-full sm:w-auto text-xs sm:text-sm h-8 sm:h-9"
                style={{
                  backgroundColor: '#361d22',
                  borderColor: '#ff4538',
                  borderWidth: '1px',
                  borderStyle: 'solid',
                  color: 'white',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
              >
                <RefreshCw
                  className={`mr-1.5 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4 ${transferCase.isPending ? 'animate-spin' : ''}`}
                  style={{ color: '#ff4538' }}
                />
                {transferCase.isPending
                  ? t('cases.dialogs.transferCase.transferring')
                  : t('cases.dialogs.transferCase.transferCase')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
