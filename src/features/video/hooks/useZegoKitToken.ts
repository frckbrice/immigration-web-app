import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getFreshToken } from '@/lib/auth/token-manager';

/**
 * Parse technical error messages into user-friendly messages
 * Hides technical details from users
 */
function parseVideoError(error: string): string {
  const lowerError = error.toLowerCase();

  // Authentication errors
  if (lowerError.includes('unauthorized') || lowerError.includes('authentication')) {
    return 'Please sign in to start a call.';
  }

  // Configuration errors
  if (
    lowerError.includes('not configured') ||
    lowerError.includes('zego') ||
    lowerError.includes('app id') ||
    lowerError.includes('server secret')
  ) {
    return 'Video calling is temporarily unavailable. Please contact support.';
  }

  // Network errors
  if (
    lowerError.includes('network') ||
    lowerError.includes('fetch') ||
    lowerError.includes('connection')
  ) {
    return 'Connection error. Please check your internet and try again.';
  }

  // Rate limiting
  if (lowerError.includes('rate limit') || lowerError.includes('too many')) {
    return 'Too many requests. Please wait a moment and try again.';
  }

  // Token generation errors
  if (lowerError.includes('token') || lowerError.includes('generate')) {
    return 'Unable to establish secure connection. Please try again.';
  }

  // Generic user-friendly message for unknown errors
  return 'Unable to start the call. Please try again.';
}

interface UseZegoKitTokenParams {
  roomId: string;
  userId: string;
  userName: string;
  canPublish?: boolean;
  canLogin?: boolean;
  streamIds?: string[];
  metadata?: Record<string, unknown>;
  expiresInSeconds?: number;
  enabled?: boolean;
}

interface TokenResponse {
  token: string;
  appId: number;
  userId: string;
  roomId: string;
  expiresAt: string;
  issuedAt: string;
  durationSeconds: number;
}

interface ApiResponse {
  success: boolean;
  data: TokenResponse;
  error?: string;
}

export function useZegoKitToken({
  roomId,
  userId,
  userName,
  canPublish = true,
  canLogin = true,
  streamIds,
  metadata,
  expiresInSeconds,
  enabled = true,
}: UseZegoKitTokenParams) {
  const metadataKey = useMemo(() => (metadata ? JSON.stringify(metadata) : undefined), [metadata]);
  const streamKey = useMemo(() => (streamIds ? streamIds.join(',') : undefined), [streamIds]);

  return useQuery<TokenResponse>({
    queryKey: [
      'zego-kit-token',
      roomId,
      userId,
      canPublish,
      canLogin,
      streamKey,
      metadataKey,
      expiresInSeconds,
    ],
    enabled: enabled && Boolean(roomId && userId && userName),
    staleTime: Math.max((expiresInSeconds ?? 60) * 1000 - 30_000, 30_000),
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const body = {
        roomId,
        canPublish,
        canLogin,
        streamIds,
        metadata: {
          requestedBy: userId,
          requestedByName: userName,
          ...metadata,
        },
        expiresInSeconds,
      };

      // Get Firebase ID token for authentication
      const token = await getFreshToken();

      if (!token) {
        throw new Error('Please sign in to start a call.');
      }

      const response = await fetch('/api/video/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        let userFriendlyMessage = 'Unable to start the call. Please try again.';

        // Handle different HTTP status codes
        if (response.status === 401) {
          userFriendlyMessage = 'Please sign in to start a call.';
        } else if (response.status === 403) {
          userFriendlyMessage = 'You do not have permission to start a call.';
        } else if (response.status === 404) {
          userFriendlyMessage = 'Call service is not available. Please contact support.';
        } else if (response.status === 429) {
          userFriendlyMessage = 'Too many requests. Please wait a moment and try again.';
        } else if (response.status >= 500) {
          userFriendlyMessage = 'Service temporarily unavailable. Please try again later.';
        } else {
          // Try to parse error from response body
          try {
            const payload = (await response.json()) as ApiResponse;
            if (payload?.error) {
              userFriendlyMessage = parseVideoError(payload.error);
            }
          } catch (error) {
            // Log technical details to console only
            console.warn('[VideoCall] Failed to parse error payload:', error);
          }
        }

        throw new Error(userFriendlyMessage);
      }

      const payload = (await response.json()) as ApiResponse;

      if (!payload?.success || !payload?.data?.token) {
        const errorMsg = payload?.error
          ? parseVideoError(payload.error)
          : 'Unable to start the call. Please try again.';
        throw new Error(errorMsg);
      }

      return payload.data;
    },
  });
}
