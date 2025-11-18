import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useCreateAppointment } from '../api';
import { RefreshCw } from 'lucide-react';
import type { Appointment } from '../types';
import { toast } from 'sonner';

interface ScheduleAppointmentDialogProps {
  caseId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseReference?: string;
  clientName?: string;
  defaultLocation?: string;
  onAppointmentScheduled?: (appointment: Appointment) => void;
}

export function ScheduleAppointmentDialog({
  caseId,
  open,
  onOpenChange,
  caseReference,
  clientName,
  defaultLocation = '',
  onAppointmentScheduled,
}: ScheduleAppointmentDialogProps) {
  const { t } = useTranslation();
  const createAppointment = useCreateAppointment(caseId);
  const [scheduledAt, setScheduledAt] = useState('');
  const [location, setLocation] = useState(defaultLocation);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      setScheduledAt('');
      setLocation(defaultLocation);
      setNotes('');
    }
  }, [open, defaultLocation]);

  const isSubmitDisabled = useMemo(() => {
    if (!scheduledAt || !location.trim()) return true;
    const dateValue = new Date(scheduledAt);
    if (Number.isNaN(dateValue.getTime())) return true;
    return dateValue.getTime() <= Date.now();
  }, [scheduledAt, location]);

  const handleSubmit = async () => {
    if (isSubmitDisabled) return;

    const scheduledDate = new Date(scheduledAt);
    if (Number.isNaN(scheduledDate.getTime())) {
      toast.error(t('cases.dialogs.scheduleAppointment.invalidDateTime'));
      return;
    }

    try {
      await createAppointment.mutateAsync(
        {
          scheduledAt: scheduledDate.toISOString(),
          location: location.trim(),
          notes: notes.trim() ? notes.trim() : undefined,
        },
        {
          onSuccess: (data) => {
            onAppointmentScheduled?.(data);
            onOpenChange(false);
          },
        }
      );
    } catch {
      // Error toast handled by mutation's onError callback.
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('cases.dialogs.scheduleAppointment.title')}</DialogTitle>
          <DialogDescription>
            {caseReference
              ? t('cases.dialogs.scheduleAppointment.descriptionWithCase', {
                  reference: caseReference,
                  clientName: clientName ? ` with ${clientName}` : '',
                })
              : t('cases.dialogs.scheduleAppointment.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="schedule-appointment-datetime">
              {t('cases.dialogs.scheduleAppointment.dateTime')}
            </Label>
            <Input
              id="schedule-appointment-datetime"
              type="datetime-local"
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-appointment-location">
              {t('cases.dialogs.scheduleAppointment.location')}
            </Label>
            <Input
              id="schedule-appointment-location"
              placeholder={t('cases.dialogs.scheduleAppointment.locationPlaceholder')}
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="schedule-appointment-notes">
              {t('cases.dialogs.scheduleAppointment.notes')}
            </Label>
            <Textarea
              id="schedule-appointment-notes"
              placeholder={t('cases.dialogs.scheduleAppointment.notesPlaceholder')}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createAppointment.isPending}
          >
            {t('cases.dialogs.scheduleAppointment.cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={createAppointment.isPending || isSubmitDisabled}>
            {createAppointment.isPending ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                {t('cases.dialogs.scheduleAppointment.scheduling')}
              </>
            ) : (
              t('cases.dialogs.scheduleAppointment.schedule')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
