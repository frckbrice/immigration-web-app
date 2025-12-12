'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase/firebase-client';
import { useAuthStore } from '@/features/auth/store';
import { logger } from '@/lib/utils/logger';
import { getFreshToken } from '@/lib/auth/token-manager';
import type { CallInvitation } from '@/lib/firebase/call-invitations.service';

// Lazy-load dialogs to avoid breaking dashboard if video deps fail
const IncomingCallDialog = dynamic(
  () => import('@/features/video').then((mod) => ({ default: mod.IncomingCallDialog })),
  { ssr: false, loading: () => null }
);

const VideoCallDialog = dynamic(
  () => import('@/features/video').then((mod) => ({ default: mod.VideoCallDialog })),
  { ssr: false, loading: () => null }
);

/**
 * Global call overlay for the dashboard.
 * - Shows incoming-call UI on any dashboard page (no navigation needed).
 * - Opens the VideoCallDialog after accept (status is updated via API).
 *
 * This avoids relying on notification clicks to land on /dashboard/messages.
 */
export function CallOverlay() {
  const { user } = useAuthStore();

  const [firebaseUserId, setFirebaseUserId] = useState<string | null>(
    () => auth?.currentUser?.uid ?? null
  );
  const [incomingCall, setIncomingCall] = useState<CallInvitation | null>(null);
  const incomingCallRef = useRef<CallInvitation | null>(null);

  const [videoCallOpen, setVideoCallOpen] = useState(false);
  const [callMode, setCallMode] = useState<'video' | 'audio'>('video');
  const [activeCallRoomId, setActiveCallRoomId] = useState<string | null>(null);
  const [acceptedInvitationId, setAcceptedInvitationId] = useState<string | null>(null);
  const [forcedInvitationId, setForcedInvitationId] = useState<string | null>(null);
  const [endCallRequestedFor, setEndCallRequestedFor] = useState<string | null>(null);
  const incomingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Don't block incoming call UI on auth-store user hydration.
  // Firebase UID is enough to show Accept/Reject, improving UX after navigation.
  const isReady = Boolean(firebaseUserId);

  // Track Firebase UID changes
  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => setFirebaseUserId(u?.uid ?? null));
    return unsub;
  }, []);

  // Subscribe to incoming calls for current user
  useEffect(() => {
    if (!firebaseUserId) {
      setIncomingCall(null);
      return;
    }

    let unsubscribe: (() => void) | null = null;
    let mounted = true;

    import('@/lib/firebase/call-invitations.service')
      .then((mod) => {
        if (!mounted) return;
        if (!mod.subscribeToIncomingCalls) return;

        unsubscribe = mod.subscribeToIncomingCalls(firebaseUserId, (invitation) => {
          if (!mounted) return;
          setIncomingCall(invitation);
        });
      })
      .catch((e) => {
        logger.warn('[CallOverlay] Failed to load call invitations service', e);
      });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [firebaseUserId]);

  // Keep ref in sync for timeout callbacks
  useEffect(() => {
    incomingCallRef.current = incomingCall;
  }, [incomingCall]);

  // Allow notification "Answer" action to force-open a specific invitation immediately
  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ invitationId?: string }>).detail;
      const invitationId = detail?.invitationId;
      if (typeof invitationId === 'string' && invitationId.trim().length > 0) {
        setForcedInvitationId(invitationId);
      }
    };

    window.addEventListener('app:call:open', handler as EventListener);
    return () => window.removeEventListener('app:call:open', handler as EventListener);
  }, []);

  // When forcedInvitationId set, subscribe to that specific invitation and sync incomingCall state
  useEffect(() => {
    if (!forcedInvitationId) return;

    let unsubscribe: (() => void) | null = null;
    let mounted = true;

    import('@/lib/firebase/call-invitations.service')
      .then((mod) => {
        if (!mounted) return;
        if (!mod.subscribeToCallStatus) return;

        unsubscribe = mod.subscribeToCallStatus(forcedInvitationId, (invitation) => {
          if (!mounted) return;
          setIncomingCall(invitation);
        });
      })
      .catch((e) => {
        logger.warn('[CallOverlay] Failed to subscribe to forced invitation', e);
      });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [forcedInvitationId]);

  // After accepting, keep an eye on invitation status to close dialog when ended/cancelled/rejected
  useEffect(() => {
    if (!acceptedInvitationId) return;

    let unsubscribe: (() => void) | null = null;
    let mounted = true;

    import('@/lib/firebase/call-invitations.service')
      .then((mod) => {
        if (!mounted) return;
        if (!mod.subscribeToCallStatus) return;

        unsubscribe = mod.subscribeToCallStatus(acceptedInvitationId, (invitation) => {
          if (!mounted) return;
          if (!invitation) return;

          if (['ended', 'cancelled', 'rejected'].includes(invitation.status)) {
            setVideoCallOpen(false);
            setActiveCallRoomId(null);
            setAcceptedInvitationId(null);
          }
        });
      })
      .catch(() => {
        // ignore
      });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [acceptedInvitationId]);

  // Auto-reject incoming calls after a timeout if the user doesn't answer.
  // Uses existing reject endpoint (DELETE /api/calls/[invitationId]).
  useEffect(() => {
    const INCOMING_RING_TIMEOUT_MS = 65_000;

    // Clear any existing timeout
    if (incomingTimeoutRef.current) {
      clearTimeout(incomingTimeoutRef.current);
      incomingTimeoutRef.current = null;
    }

    if (!incomingCall) return;
    if (!['pending', 'ringing'].includes(incomingCall.status)) return;

    // If user already accepted/opened the call UI, don't auto-reject
    if (videoCallOpen || acceptedInvitationId === incomingCall.id) return;

    incomingTimeoutRef.current = setTimeout(async () => {
      try {
        // Re-check current state at timeout moment
        const latest = incomingCallRef.current;
        if (!latest) return;
        if (!['pending', 'ringing'].includes(latest.status)) return;
        if (videoCallOpen) return;

        const token = await getFreshToken();
        if (!token) return;

        await fetch(`/api/calls/${latest.id}`, {
          method: 'DELETE', // reject (recipient)
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });
      } catch (e) {
        // Best-effort: do not block UI
        logger.warn('[CallOverlay] Failed to auto-reject unanswered call', e);
      }
    }, INCOMING_RING_TIMEOUT_MS);

    return () => {
      if (incomingTimeoutRef.current) {
        clearTimeout(incomingTimeoutRef.current);
        incomingTimeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [incomingCall?.id, incomingCall?.status, videoCallOpen, acceptedInvitationId]);

  const handleAccept = useCallback(() => {
    if (!incomingCall) return;
    setCallMode(incomingCall.callMode);
    setActiveCallRoomId(incomingCall.roomId);
    setAcceptedInvitationId(incomingCall.id);
    setForcedInvitationId(incomingCall.id);
    setVideoCallOpen(true);
  }, [incomingCall]);

  const handleReject = useCallback(() => {
    setIncomingCall(null);
    // Do not force-close a video call here; reject happens before opening.
  }, []);

  const endCall = useCallback(
    async (invitationId: string) => {
      // Avoid duplicate PUTs (VideoCallDialog may trigger both onCallEnd and onOpenChange(false))
      if (!invitationId || endCallRequestedFor === invitationId) return;
      setEndCallRequestedFor(invitationId);

      try {
        const token = await getFreshToken();
        if (!token) return;

        await fetch(`/api/calls/${invitationId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          credentials: 'include',
        });
      } catch (e) {
        // Best-effort cleanup: don't block UI close
        logger.warn('[CallOverlay] Failed to end call via API', e);
      }
    },
    [endCallRequestedFor]
  );

  const participantName = useMemo(
    () => incomingCall?.fromUserName ?? 'Participant',
    [incomingCall]
  );
  const userName = useMemo(() => {
    if (!user) return 'User';
    const n = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    return n || user.email || 'User';
  }, [user]);

  if (!isReady) return null;

  return (
    <>
      {incomingCall && ['pending', 'ringing'].includes(incomingCall.status) && (
        <IncomingCallDialog
          invitation={incomingCall}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}

      {videoCallOpen && activeCallRoomId && firebaseUserId && (
        <VideoCallDialog
          open={videoCallOpen}
          onOpenChange={(open) => {
            setVideoCallOpen(open);
            if (!open) {
              // Ensure remote clients (mobile) are notified that the call ended
              if (acceptedInvitationId) {
                void endCall(acceptedInvitationId);
              }
              setActiveCallRoomId(null);
              setAcceptedInvitationId(null);
            }
          }}
          roomId={activeCallRoomId}
          userId={firebaseUserId}
          userName={userName}
          participantName={participantName}
          callMode={callMode}
          onCallEnd={() => {
            // Mark call as ended for all clients (mobile listens to RTDB status)
            if (acceptedInvitationId) {
              void endCall(acceptedInvitationId);
            }
            setVideoCallOpen(false);
            setActiveCallRoomId(null);
            setAcceptedInvitationId(null);
          }}
        />
      )}
    </>
  );
}
