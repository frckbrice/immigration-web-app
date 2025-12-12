import { useEffect, useState } from 'react';
import { auth } from '@/lib/firebase/firebase-client';
import {
  subscribeToIncomingCalls,
  type CallInvitation,
} from '@/lib/firebase/call-invitations.service';
import { logger } from '@/lib/utils/logger';

/**
 * Hook to listen for incoming call invitations in real-time
 * @returns The current incoming call invitation or null
 */
export function useIncomingCall(): CallInvitation | null {
  const [incomingCall, setIncomingCall] = useState<CallInvitation | null>(null);

  useEffect(() => {
    const firebaseUser = auth?.currentUser;

    if (!firebaseUser?.uid) {
      setIncomingCall(null);
      return;
    }

    logger.debug('[IncomingCall] Subscribing to incoming calls', {
      userId: firebaseUser.uid.substring(0, 8) + '...',
    });

    const unsubscribe = subscribeToIncomingCalls(firebaseUser.uid, (invitation) => {
      logger.debug('[IncomingCall] Call invitation update', {
        hasInvitation: !!invitation,
        status: invitation?.status,
        callMode: invitation?.callMode,
      });

      setIncomingCall(invitation);
    });

    return () => {
      logger.debug('[IncomingCall] Unsubscribing from incoming calls');
      unsubscribe();
    };
  }, []);

  return incomingCall;
}
