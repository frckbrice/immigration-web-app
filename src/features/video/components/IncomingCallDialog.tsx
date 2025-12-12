'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Video, Phone, PhoneOff, PhoneCall } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getFreshToken } from '@/lib/auth/token-manager';
import type { CallInvitation } from '@/lib/firebase/call-invitations.service';

interface IncomingCallDialogProps {
  invitation: CallInvitation;
  onAccept: () => void;
  onReject: () => void;
}

export function IncomingCallDialog({ invitation, onAccept, onReject }: IncomingCallDialogProps) {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);

  const callType = invitation.callMode === 'video' ? 'Video' : 'Audio';
  const callTypeLabel = invitation.callMode === 'video' ? 'Video Call' : 'Audio Call';

  const handleAccept = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      // Accept the call invitation via API
      const token = await getFreshToken();
      if (!token) {
        throw new Error('Please sign in to accept the call.');
      }

      const response = await fetch(`/api/calls/${invitation.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to accept call' }));
        throw new Error(error.error || 'Failed to accept call');
      }

      onAccept();
    } catch (error) {
      console.error('[IncomingCall] Failed to accept call:', error);
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    try {
      // Reject the call invitation via API
      const token = await getFreshToken();
      if (!token) {
        throw new Error('Please sign in to reject the call.');
      }

      const response = await fetch(`/api/calls/${invitation.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        // Continue even if API call fails - user wants to reject
        console.warn('[IncomingCall] Failed to reject call via API, continuing anyway');
      }

      onReject();
    } catch (error) {
      console.error('[IncomingCall] Failed to reject call:', error);
      // Continue anyway - user wants to reject
      onReject();
    }
  };

  // Auto-dismiss if invitation is no longer active
  useEffect(() => {
    if (['rejected', 'cancelled', 'ended'].includes(invitation.status)) {
      onReject();
    }
  }, [invitation.status, onReject]);

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent
        className={cn(
          'w-[90vw] max-w-md',
          'p-6 sm:p-8',
          'flex flex-col items-center',
          'border-2',
          invitation.callMode === 'video' ? 'border-primary' : 'border-blue-500'
        )}
        showCloseButton={false}
      >
        <DialogHeader className="text-center space-y-4 w-full">
          <div className="flex justify-center">
            <div
              className={cn(
                'rounded-full p-6',
                invitation.callMode === 'video' ? 'bg-primary/10' : 'bg-blue-500/10'
              )}
            >
              {invitation.callMode === 'video' ? (
                <Video className="h-12 w-12 text-primary" />
              ) : (
                <Phone className="h-12 w-12 text-blue-500" />
              )}
            </div>
          </div>

          <DialogTitle className="text-xl sm:text-2xl font-semibold">
            {t('video.incomingCall', { defaultValue: 'Incoming Call' })}
          </DialogTitle>

          <DialogDescription className="text-base sm:text-lg">
            <div className="font-medium text-foreground mb-1">{invitation.fromUserName}</div>
            <div className="text-muted-foreground">
              {t('video.callingYou', {
                defaultValue: `is calling you (${callTypeLabel})`,
                callType: callTypeLabel,
              })}
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-4 w-full mt-4">
          <Button
            onClick={handleReject}
            disabled={isProcessing}
            variant="destructive"
            size="lg"
            className="flex-1 h-14 text-base font-semibold"
          >
            <PhoneOff className="h-5 w-5 mr-2" />
            {t('video.reject', { defaultValue: 'Reject' })}
          </Button>

          <Button
            onClick={handleAccept}
            disabled={isProcessing}
            size="lg"
            className={cn(
              'flex-1 h-14 text-base font-semibold text-white',
              invitation.callMode === 'video'
                ? 'bg-primary hover:bg-primary/90'
                : 'bg-blue-500 hover:bg-blue-600'
            )}
          >
            <PhoneCall className="h-5 w-5 mr-2" />
            {t('video.accept', { defaultValue: 'Accept' })}
          </Button>
        </div>

        {isProcessing && (
          <p className="text-sm text-muted-foreground mt-2">
            {t('video.processing', { defaultValue: 'Processing...' })}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
