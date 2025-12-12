// Firebase Call Invitations Service (SERVER-SIDE)
// Uses Firebase Admin SDK to bypass Realtime Database security rules.
// This file should ONLY be imported from API routes / server code.

import { adminDatabase } from './firebase-admin';
import { logger } from '@/lib/utils/logger';

export type CallStatus = 'pending' | 'ringing' | 'accepted' | 'rejected' | 'ended' | 'cancelled';
export type CallMode = 'video' | 'audio';

export interface CallInvitation {
  id: string; // invitationId (call-${roomId})
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

function getCallRoomId(userId1: string, userId2: string): string {
  return [userId1, userId2].sort().join('-');
}

function requireAdminDatabase() {
  if (!adminDatabase) {
    throw new Error(
      'Admin database not available. Ensure FIREBASE_DATABASE_URL and Firebase Admin credentials are configured.'
    );
  }
  return adminDatabase;
}

export async function createCallInvitation(
  fromUserId: string,
  fromUserName: string,
  toUserId: string,
  toUserName: string,
  callMode: CallMode
): Promise<CallInvitation> {
  const db = requireAdminDatabase();

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

  const invitationRef = db.ref(`callInvitations/${invitationId}`);

  await invitationRef.set(invitation);
  await invitationRef.update({ status: 'ringing' satisfies CallStatus });

  logger.info('Call invitation created (Admin SDK)', {
    invitationId,
    roomId: roomId.substring(0, 8) + '...',
    fromUserId: fromUserId.substring(0, 8) + '...',
    toUserId: toUserId.substring(0, 8) + '...',
    callMode,
  });

  return { ...invitation, status: 'ringing' };
}

async function getInvitationOrThrow(invitationId: string): Promise<CallInvitation> {
  const db = requireAdminDatabase();
  const ref = db.ref(`callInvitations/${invitationId}`);
  const snapshot = await ref.get();
  if (!snapshot.exists()) {
    throw new Error('Call invitation not found');
  }
  return snapshot.val() as CallInvitation;
}

export async function acceptCallInvitation(invitationId: string, userId: string): Promise<void> {
  const db = requireAdminDatabase();
  const invitation = await getInvitationOrThrow(invitationId);

  if (invitation.toUserId !== userId) {
    throw new Error('Unauthorized: Only the recipient can accept the call');
  }

  await db.ref(`callInvitations/${invitationId}`).update({
    status: 'accepted' satisfies CallStatus,
    answeredAt: Date.now(),
  });
}

export async function rejectCallInvitation(invitationId: string, userId: string): Promise<void> {
  const db = requireAdminDatabase();
  const invitation = await getInvitationOrThrow(invitationId);

  if (invitation.toUserId !== userId) {
    throw new Error('Unauthorized: Only the recipient can reject the call');
  }

  await db.ref(`callInvitations/${invitationId}`).update({
    status: 'rejected' satisfies CallStatus,
    answeredAt: Date.now(),
  });
}

export async function cancelCallInvitation(invitationId: string, userId: string): Promise<void> {
  const db = requireAdminDatabase();
  const invitation = await getInvitationOrThrow(invitationId);

  if (invitation.fromUserId !== userId) {
    throw new Error('Unauthorized: Only the caller can cancel the call');
  }

  await db.ref(`callInvitations/${invitationId}`).update({
    status: 'cancelled' satisfies CallStatus,
    endedAt: Date.now(),
  });
}

export async function endCall(invitationId: string, userId: string): Promise<void> {
  const db = requireAdminDatabase();
  const invitation = await getInvitationOrThrow(invitationId);

  if (invitation.fromUserId !== userId && invitation.toUserId !== userId) {
    throw new Error('Unauthorized: Only participants can end the call');
  }

  await db.ref(`callInvitations/${invitationId}`).update({
    status: 'ended' satisfies CallStatus,
    endedAt: Date.now(),
  });
}
