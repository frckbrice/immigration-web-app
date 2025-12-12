'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Video, Phone, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { VideoCallContainer, type ScenarioMode } from './VideoCallContainer';
import { cn } from '@/lib/utils';

interface VideoCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  userId: string;
  userName: string;
  participantName?: string;
  callMode?: 'video' | 'audio';
  onCallEnd?: () => void;
}

export function VideoCallDialog({
  open,
  onOpenChange,
  roomId,
  userId,
  userName,
  participantName,
  callMode = 'video',
  onCallEnd,
}: VideoCallDialogProps) {
  const { t } = useTranslation();
  const [isLeaving, setIsLeaving] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<
    'granted' | 'denied' | 'prompt' | 'unknown'
  >('unknown');
  const [microphonePermission, setMicrophonePermission] = useState<
    'granted' | 'denied' | 'prompt' | 'unknown'
  >('unknown');
  const [mediaPreflightError, setMediaPreflightError] = useState<string | null>(null);
  const [isSecureContext, setIsSecureContext] = useState(true);
  const [originHint, setOriginHint] = useState<string | null>(null);

  // Use 1:1 call mode for both audio and video.
  // Video vs audio behavior is controlled by config (camera/mic toggles).
  // This matches typical cross-platform 1:1 calling behavior and avoids blank conference UI.
  const scenarioMode: ScenarioMode = 'OneONoneCall';

  const handleLeave = () => {
    setIsLeaving(true);
    onCallEnd?.();
    onOpenChange(false);
    // Reset leaving state after a delay
    setTimeout(() => setIsLeaving(false), 500);
  };

  // Check media permissions (best-effort). This prevents auto-starting devices when browser has denied.
  useEffect(() => {
    let cancelled = false;

    async function checkPermissions() {
      if (typeof navigator === 'undefined') return;

      // Permissions API is not supported in all browsers for camera/mic.
      const perms: any = (navigator as any).permissions;
      if (!perms?.query) {
        if (!cancelled) {
          setCameraPermission('unknown');
          setMicrophonePermission('unknown');
        }
        return;
      }

      try {
        const cam = await perms.query({ name: 'camera' });
        const mic = await perms.query({ name: 'microphone' });
        if (!cancelled) {
          setCameraPermission(cam?.state ?? 'unknown');
          setMicrophonePermission(mic?.state ?? 'unknown');
        }
      } catch {
        if (!cancelled) {
          setCameraPermission('unknown');
          setMicrophonePermission('unknown');
        }
      }
    }

    checkPermissions();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Detect insecure contexts (common when using http://0.0.0.0:3000 or LAN IP)
  useEffect(() => {
    if (!open) return;
    if (typeof window === 'undefined') return;

    const secure = Boolean(window.isSecureContext);
    setIsSecureContext(secure);

    const host = window.location?.hostname;
    // Only localhost/127.0.0.1 are treated as secure on http; IPs / 0.0.0.0 are not.
    if (!secure) {
      const hint =
        host && host !== 'localhost' && host !== '127.0.0.1'
          ? `You're on http://${host}. Camera/microphone require HTTPS (or http://localhost).`
          : 'Camera/microphone require a secure context (HTTPS or http://localhost).';
      setOriginHint(hint);
    } else {
      setOriginHint(null);
    }
  }, [open]);

  const shouldShowPrejoin = useMemo(() => {
    // If either permission is explicitly denied, show prejoin so user sees toggles and guidance
    if (cameraPermission === 'denied' || microphonePermission === 'denied') return true;
    // If we don't know, keep UX fast: don't force prejoin, let Zego handle prompts.
    return false;
  }, [cameraPermission, microphonePermission]);

  const shouldTurnOnMic = useMemo(() => {
    if (microphonePermission === 'denied') return false;
    return true;
  }, [microphonePermission]);

  const shouldTurnOnCamera = useMemo(() => {
    if (callMode !== 'video') return false;
    if (cameraPermission === 'denied') return false;
    return true;
  }, [callMode, cameraPermission]);

  // IMPORTANT:
  // Do NOT call getUserMedia() automatically on mount.
  // Some environments enforce Permissions Policy restrictions, and early probing can spam errors
  // and cause the call UI to close. Zego will request devices when the user joins.
  useEffect(() => {
    if (!open) return;
    setMediaPreflightError(null);
  }, [open]);

  // Only short-circuit rendering AFTER hooks (to satisfy rules-of-hooks).
  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'w-[95vw] max-w-[95vw] sm:max-w-4xl lg:max-w-6xl',
          'h-[95vh] max-h-[95vh] sm:max-h-[90vh]',
          'p-0 sm:p-4',
          'overflow-hidden',
          'flex flex-col'
        )}
        showCloseButton={false}
      >
        <DialogHeader className="px-4 sm:px-6 pt-4 sm:pt-6 pb-2 sm:pb-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {callMode === 'video' ? (
                <Video className="h-5 w-5 text-primary" />
              ) : (
                <Phone className="h-5 w-5 text-primary" />
              )}
              <div>
                <DialogTitle className="text-lg sm:text-xl">
                  {callMode === 'video'
                    ? t('video.videoCall') || 'Video Call'
                    : t('video.audioCall') || 'Audio Call'}
                </DialogTitle>
                <DialogDescription className="text-xs sm:text-sm mt-1">
                  {participantName
                    ? t('video.calling', { name: participantName }) ||
                      `Calling ${participantName}...`
                    : t('video.connecting') || 'Connecting...'}
                </DialogDescription>
                {!isSecureContext && originHint && (
                  <p className="mt-2 text-xs text-destructive">{originHint}</p>
                )}
                {mediaPreflightError && (
                  <p className="mt-2 text-xs text-destructive">{mediaPreflightError}</p>
                )}
                {process.env.NODE_ENV === 'development' && (
                  <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                    debug: secureContext={String(isSecureContext)} cam={cameraPermission} mic=
                    {microphonePermission}
                  </p>
                )}
              </div>
            </div>
            {!isLeaving && (
              <button
                onClick={handleLeave}
                className="rounded-full p-2 hover:bg-destructive/10 transition-colors"
                aria-label={t('video.endCall') || 'End call'}
              >
                <X className="h-5 w-5 text-destructive" />
              </button>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 relative overflow-hidden bg-background">
          <VideoCallContainer
            className="h-full w-full"
            roomId={roomId}
            userId={userId}
            userName={userName}
            scenarioMode={scenarioMode}
            onLeaveRoom={handleLeave}
            onError={(error) => {
              // Log technical details to console only (not shown to user)
              console.error('[VideoCallDialog] Technical error:', {
                message: error?.message,
                stack: error?.stack,
              });
              // Error is already handled by VideoCallContainer UI with user-friendly messages
            }}
            config={{
              turnOnMicrophoneWhenJoining: shouldTurnOnMic,
              turnOnCameraWhenJoining: shouldTurnOnCamera,
              // Only show pre-join when permissions are denied (otherwise it slows UX).
              showPreJoinView: shouldShowPrejoin,
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
