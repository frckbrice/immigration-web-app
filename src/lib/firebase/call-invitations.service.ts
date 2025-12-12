// Firebase Call Invitations Service
// Manages real-time call invitations between users

import { database } from './firebase-client';
import { ref, set, update, onValue, off, get, remove } from 'firebase/database';
import { logger } from '@/lib/utils/logger';

export type CallStatus = 'pending' | 'ringing' | 'accepted' | 'rejected' | 'ended' | 'cancelled';
export type CallMode = 'video' | 'audio';

export interface CallInvitation {
  id: string; // roomId
  fromUserId: string; // Firebase UID of caller
  fromUserName: string;
  toUserId: string; // Firebase UID of recipient
  toUserName: string;
  roomId: string; // Deterministic room ID
  callMode: CallMode;
  status: CallStatus;
  createdAt: number;
  answeredAt?: number;
  endedAt?: number;
}

/**
 * Generate deterministic room ID from two user IDs
 * Ensures both users generate the same room ID
 */
function getCallRoomId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('-');
}

/**
 * Create a call invitation
 * @param fromUserId - Firebase UID of the caller
 * @param fromUserName - Name of the caller
 * @param toUserId - Firebase UID of the recipient
 * @param toUserName - Name of the recipient
 * @param callMode - 'video' or 'audio'
 * @returns The call invitation object
 */
export async function createCallInvitation(
  fromUserId: string,
  fromUserName: string,
  toUserId: string,
  toUserName: string,
  callMode: CallMode
): Promise<CallInvitation> {
  if (!database) {
    logger.error('Firebase Database is not initialized');
    throw new Error('Database service unavailable');
  }

  const roomId = getCallRoomId(fromUserId, toUserId);
  const invitationId = `call-${roomId}`;

  const invitation: CallInvitation = {
    id: invitationId,
    fromUserId,
    fromUserName,
    toUserId,
    toUserName,
    roomId,
    callMode,
    status: 'pending',
    createdAt: Date.now(),
  };

  const invitationRef = ref(database, `callInvitations/${invitationId}`);

  try {
    await set(invitationRef, invitation);
    logger.info('Call invitation created', {
      invitationId,
      fromUserId: fromUserId.substring(0, 8) + '...',
      toUserId: toUserId.substring(0, 8) + '...',
      callMode,
    });

    // Also set status to 'ringing' for the recipient
    await update(invitationRef, {
      status: 'ringing',
    });

    return { ...invitation, status: 'ringing' };
  } catch (error) {
    logger.error('Failed to create call invitation', error);
    throw error;
  }
}

/**
 * Accept a call invitation
 * @param invitationId - The call invitation ID (roomId)
 * @param userId - Firebase UID of the user accepting
 */
export async function acceptCallInvitation(invitationId: string, userId: string): Promise<void> {
  if (!database) {
    logger.error('Firebase Database is not initialized');
    throw new Error('Database service unavailable');
  }

  const invitationRef = ref(database, `callInvitations/${invitationId}`);

  try {
    const snapshot = await get(invitationRef);
    if (!snapshot.exists()) {
      throw new Error('Call invitation not found');
    }

    const invitation = snapshot.val() as CallInvitation;

    // Verify user is the recipient
    if (invitation.toUserId !== userId) {
      throw new Error('Unauthorized: Only the recipient can accept the call');
    }

    await update(invitationRef, {
      status: 'accepted',
      answeredAt: Date.now(),
    });

    logger.info('Call invitation accepted', {
      invitationId,
      userId: userId.substring(0, 8) + '...',
    });
  } catch (error) {
    logger.error('Failed to accept call invitation', error);
    throw error;
  }
}

/**
 * Reject a call invitation
 * @param invitationId - The call invitation ID (roomId)
 * @param userId - Firebase UID of the user rejecting
 */
export async function rejectCallInvitation(invitationId: string, userId: string): Promise<void> {
  if (!database) {
    logger.error('Firebase Database is not initialized');
    throw new Error('Database service unavailable');
  }

  const invitationRef = ref(database, `callInvitations/${invitationId}`);

  try {
    const snapshot = await get(invitationRef);
    if (!snapshot.exists()) {
      throw new Error('Call invitation not found');
    }

    const invitation = snapshot.val() as CallInvitation;

    // Verify user is the recipient
    if (invitation.toUserId !== userId) {
      throw new Error('Unauthorized: Only the recipient can reject the call');
    }

    await update(invitationRef, {
      status: 'rejected',
      answeredAt: Date.now(),
    });

    logger.info('Call invitation rejected', {
      invitationId,
      userId: userId.substring(0, 8) + '...',
    });
  } catch (error) {
    logger.error('Failed to reject call invitation', error);
    throw error;
  }
}

/**
 * Cancel a call invitation (by the caller)
 * @param invitationId - The call invitation ID (roomId)
 * @param userId - Firebase UID of the caller
 */
export async function cancelCallInvitation(invitationId: string, userId: string): Promise<void> {
  if (!database) {
    logger.error('Firebase Database is not initialized');
    throw new Error('Database service unavailable');
  }

  const invitationRef = ref(database, `callInvitations/${invitationId}`);

  try {
    const snapshot = await get(invitationRef);
    if (!snapshot.exists()) {
      return; // Already cancelled or doesn't exist
    }

    const invitation = snapshot.val() as CallInvitation;

    // Verify user is the caller
    if (invitation.fromUserId !== userId) {
      throw new Error('Unauthorized: Only the caller can cancel the call');
    }

    await update(invitationRef, {
      status: 'cancelled',
      endedAt: Date.now(),
    });

    logger.info('Call invitation cancelled', {
      invitationId,
      userId: userId.substring(0, 8) + '...',
    });
  } catch (error) {
    logger.error('Failed to cancel call invitation', error);
    throw error;
  }
}

/**
 * End a call (mark as ended)
 * @param invitationId - The call invitation ID (roomId)
 * @param userId - Firebase UID of the user ending the call
 */
export async function endCall(invitationId: string, userId: string): Promise<void> {
  if (!database) {
    logger.error('Firebase Database is not initialized');
    throw new Error('Database service unavailable');
  }

  const invitationRef = ref(database, `callInvitations/${invitationId}`);

  try {
    const snapshot = await get(invitationRef);
    if (!snapshot.exists()) {
      return; // Already ended or doesn't exist
    }

    const invitation = snapshot.val() as CallInvitation;

    // Verify user is a participant
    if (invitation.fromUserId !== userId && invitation.toUserId !== userId) {
      throw new Error('Unauthorized: Only participants can end the call');
    }

    await update(invitationRef, {
      status: 'ended',
      endedAt: Date.now(),
    });

    logger.info('Call ended', {
      invitationId,
      userId: userId.substring(0, 8) + '...',
    });
  } catch (error) {
    logger.error('Failed to end call', error);
    throw error;
  }
}

/**
 * Subscribe to incoming call invitations for a user
 * @param userId - Firebase UID of the user
 * @param callback - Callback function called when invitation status changes
 * @returns Unsubscribe function
 */
export function subscribeToIncomingCalls(
  userId: string,
  callback: (invitation: CallInvitation | null) => void
): () => void {
  if (!database) {
    logger.error('Firebase Database is not initialized');
    return () => {}; // Return no-op cleanup function
  }

  const invitationsRef = ref(database, 'callInvitations');

  const unsubscribe = onValue(
    invitationsRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      // Find active invitation for this user
      const invitations = snapshot.val();
      let activeInvitation: CallInvitation | null = null;

      for (const invitationId in invitations) {
        const invitation = invitations[invitationId] as CallInvitation;

        // Check if this invitation is for the current user and is active
        if (
          invitation.toUserId === userId &&
          (invitation.status === 'pending' || invitation.status === 'ringing')
        ) {
          activeInvitation = invitation;
          break;
        }
      }

      callback(activeInvitation);
    },
    (error) => {
      logger.error('Error listening to call invitations', error);
      callback(null);
    }
  );

  return () => {
    off(invitationsRef);
  };
}

/**
 * Subscribe to call status changes for a specific call
 * @param invitationId - The call invitation ID (roomId)
 * @param callback - Callback function called when status changes
 * @returns Unsubscribe function
 */
export function subscribeToCallStatus(
  invitationId: string,
  callback: (invitation: CallInvitation | null) => void
): () => void {
  if (!database) {
    logger.error('Firebase Database is not initialized');
    return () => {}; // Return no-op cleanup function
  }

  const invitationRef = ref(database, `callInvitations/${invitationId}`);

  const unsubscribe = onValue(
    invitationRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      const invitation = snapshot.val() as CallInvitation;
      callback(invitation);
    },
    (error) => {
      logger.error('Error listening to call status', error);
      callback(null);
    }
  );

  return () => {
    off(invitationRef);
  };
}

/**
 * Clean up old call invitations (older than 1 hour)
 * This can be called periodically or on app start
 */
export async function cleanupOldCallInvitations(): Promise<void> {
  if (!database) {
    logger.error('Firebase Database is not initialized');
    return;
  }

  const invitationsRef = ref(database, 'callInvitations');
  const snapshot = await get(invitationsRef);

  if (!snapshot.exists()) {
    return;
  }

  const invitations = snapshot.val();
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const deletions: Promise<void>[] = [];

  for (const invitationId in invitations) {
    const invitation = invitations[invitationId] as CallInvitation;

    // Delete if older than 1 hour or ended/cancelled/rejected
    if (
      invitation.createdAt < oneHourAgo ||
      ['ended', 'cancelled', 'rejected'].includes(invitation.status)
    ) {
      const invitationRef = ref(database, `callInvitations/${invitationId}`);
      deletions.push(remove(invitationRef).then(() => {}));
    }
  }

  if (deletions.length > 0) {
    await Promise.all(deletions);
    logger.info(`Cleaned up ${deletions.length} old call invitations`);
  }
}
