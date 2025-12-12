'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ZegoCloudRoomConfig } from '@zegocloud/zego-uikit-prebuilt';
import { useZegoKitToken } from '../hooks/useZegoKitToken';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function ensureReactDevtoolsCreateSpanPolyfill() {
  // Zego SDK can assume a React DevTools hook exists and contains createSpan in multiple places.
  // We provide a safe no-op implementation to prevent runtime crashes like:
  // "Cannot read properties of undefined (reading 'createSpan')"
  if (typeof window === 'undefined') return;

  const w = window as any;

  // Safe span factory
  const safeSpan = () => ({
    stop() {},
  });

  // Ensure hook exists with expected shape
  if (!w.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    w.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
      createSpan: safeSpan,
      rendererInterfaces: new Map(),
      subscribers: new Map(),
    };
  }

  const hook = w.__REACT_DEVTOOLS_GLOBAL_HOOK__;

  // Ensure top-level createSpan
  if (typeof hook.createSpan !== 'function') {
    hook.createSpan = safeSpan;
  }

  // Ensure rendererInterfaces map exists
  if (!hook.rendererInterfaces || typeof hook.rendererInterfaces.get !== 'function') {
    hook.rendererInterfaces = new Map();
  }

  // Ensure subscribers map exists
  if (!hook.subscribers || typeof hook.subscribers.get !== 'function') {
    hook.subscribers = new Map();
  }

  // Populate both maps with safe objects
  for (let i = 0; i < 20; i++) {
    const ri = hook.rendererInterfaces.get(i) || {};
    const sub = hook.subscribers.get(i) || {};

    if (typeof ri.createSpan !== 'function') {
      hook.rendererInterfaces.set(i, { ...ri, createSpan: safeSpan });
    }
    if (typeof sub.createSpan !== 'function') {
      hook.subscribers.set(i, { ...sub, createSpan: safeSpan });
    }
  }
}

/**
 * IMPORTANT:
 * Zego's prebuilt SDK touches `document` at import-time in some versions.
 * To avoid SSR crashes ("document is not defined"), we treat the SDK as a runtime-only
 * dependency and dynamically import it inside effects.
 */
export type ScenarioMode = 'VideoConference' | 'OneONoneCall' | 'GroupCall';

interface TokenRequestOptions {
  canPublish?: boolean;
  canLogin?: boolean;
  streamIds?: string[];
  metadata?: Record<string, unknown>;
  expiresInSeconds?: number;
}

export interface VideoCallContainerProps {
  className?: string;
  roomId: string;
  userId: string;
  userName: string;
  scenarioMode?: ScenarioMode;
  config?: Omit<ZegoCloudRoomConfig, 'container'>;
  onLeaveRoom?: () => void;
  onError?: (error: Error) => void;
  kitToken?: string;
  tokenRequestOptions?: TokenRequestOptions;
}

export function VideoCallContainer({
  className,
  roomId,
  userId,
  userName,
  scenarioMode = 'VideoConference',
  config,
  onLeaveRoom,
  onError,
  kitToken: kitTokenProp,
  tokenRequestOptions,
}: VideoCallContainerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const instanceRef = useRef<any>(null);
  const activeJoinKeyRef = useRef<string | null>(null);
  const isJoiningRef = useRef(false);
  const [initialised, setInitialised] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinErrorDetails, setJoinErrorDetails] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const {
    canPublish = true,
    canLogin = true,
    streamIds,
    metadata,
    expiresInSeconds,
  } = tokenRequestOptions || {};

  const tokenQuery = useZegoKitToken({
    roomId,
    userId,
    userName,
    canPublish,
    canLogin,
    streamIds,
    metadata,
    expiresInSeconds,
    enabled: !kitTokenProp,
  });

  const tokenData = !kitTokenProp ? tokenQuery.data : null;
  const hasTokenData = Boolean(kitTokenProp || tokenData?.token);
  // Stable key used to prevent accidental duplicate joins (do not log; may contain sensitive data).
  const joinKey = kitTokenProp
    ? `kit:${kitTokenProp}`
    : tokenData?.token
      ? `api:${tokenData.token}`
      : null;

  const isLoadingToken = !kitTokenProp && tokenQuery.isLoading;
  const tokenError = !kitTokenProp ? tokenQuery.error : null;

  useEffect(() => {
    if (!hasTokenData || !joinKey) {
      return;
    }

    if (joinKey === activeJoinKeyRef.current) {
      return;
    }

    let cancelled = false;
    let rafId: number | null = null;

    const waitForContainerAndJoin = async (triesLeft: number) => {
      if (cancelled) return;

      const container = containerRef.current;
      if (!container) {
        if (triesLeft <= 0) {
          const message =
            t('video.connectionFailed') ||
            'Failed to connect to the call. Please check your internet connection and try again.';
          setJoinError(message);
          onError?.(new Error(message));
          return;
        }
        rafId = window.requestAnimationFrame(() => waitForContainerAndJoin(triesLeft - 1));
        return;
      }

      // Prevent duplicate joins (React dev mode can double-invoke effects).
      if (isJoiningRef.current) return;
      isJoiningRef.current = true;

      activeJoinKeyRef.current = joinKey;

      instanceRef.current?.destroy();
      setJoinError(null);
      setJoinErrorDetails(null);
      setInitialised(false);

      try {
        // Prevent Zego from crashing in some browser/devtools combinations
        ensureReactDevtoolsCreateSpanPolyfill();

        // Dynamically import SDK (avoids SSR "document is not defined")
        const mod = await import('@zegocloud/zego-uikit-prebuilt');
        if (cancelled) return;
        const ZegoUIKitPrebuilt = (mod as any)?.ZegoUIKitPrebuilt;

        if (!ZegoUIKitPrebuilt || typeof ZegoUIKitPrebuilt.create !== 'function') {
          throw new Error('ZegoUIKitPrebuilt is not available');
        }

        // If the token is coming from our API, wrap it into a kitToken for the prebuilt UI.
        // NOTE: do not log tokens.
        const kitToken =
          kitTokenProp ||
          (tokenData?.token
            ? typeof ZegoUIKitPrebuilt.generateKitTokenForProduction === 'function'
              ? ZegoUIKitPrebuilt.generateKitTokenForProduction(
                  tokenData.appId,
                  tokenData.token,
                  tokenData.roomId,
                  tokenData.userId,
                  userName
                )
              : tokenData.token
            : null);

        if (!kitToken) {
          throw new Error('Video calling is not configured. Missing kit token.');
        }

        const uiKit = ZegoUIKitPrebuilt.create(kitToken);
        if (cancelled) return;
        if (process.env.NODE_ENV === 'development') {
          // eslint-disable-next-line no-console
          console.log('[VideoCall] uiKit instance:', uiKit);
        }
        instanceRef.current = uiKit;

        const {
          onLeaveRoom: configLeaveHandler,
          scenario: configScenario,
          ...restConfig
        } = config || {};

        uiKit.joinRoom({
          container,
          sharedLinks: [],
          showLeavingView: false,
          showRoomDetailsButton: false,
          showTextChat: false,
          showUserList: false,
          autoHideFooter: true,
          scenario: {
            ...configScenario,
            mode:
              (ZegoUIKitPrebuilt as any)[scenarioMode] ??
              (ZegoUIKitPrebuilt as any).VideoConference,
            // Ensure we're not joining as a non-publishing role by default.
            // For 1:1 calls, using Host ensures local audio/video is published.
            config: {
              ...(configScenario?.config ?? {}),
              role: (configScenario?.config as any)?.role ?? (ZegoUIKitPrebuilt as any).Host,
            },
          },
          onLeaveRoom: () => {
            configLeaveHandler?.();
            onLeaveRoom?.();
          },
          ...restConfig,
        });

        setInitialised(true);
      } catch (error) {
        // Log technical details to console only
        console.error('[ZegoCloud] Failed to join room', error);
        instanceRef.current = null;
        activeJoinKeyRef.current = null;

        const message =
          t('video.connectionFailed') ||
          'Failed to connect to the call. Please check your internet connection and try again.';
        setJoinError(message);
        // Keep details only in development to avoid exposing internals to users
        if (process.env.NODE_ENV === 'development') {
          const detail =
            error instanceof Error
              ? `${error.name}: ${error.message}`
              : typeof error === 'string'
                ? error
                : JSON.stringify(error);
          setJoinErrorDetails(detail);
        } else {
          setJoinErrorDetails(null);
        }
        onError?.(new Error(message));
      } finally {
        isJoiningRef.current = false;
      }
    };

    // Wait up to ~2 seconds for the portal DOM to mount (120 frames at 60fps)
    void waitForContainerAndJoin(120);

    return () => {
      cancelled = true;
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      instanceRef.current?.destroy();
      instanceRef.current = null;
      activeJoinKeyRef.current = null;
      setInitialised(false);
      setJoinError(null);
      setJoinErrorDetails(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joinKey, hasTokenData, scenarioMode, retryKey, userName]);

  useEffect(() => {
    return () => {
      instanceRef.current?.destroy();
      instanceRef.current = null;
      activeJoinKeyRef.current = null;
    };
  }, []);

  if (isLoadingToken) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center rounded-md border border-border bg-muted/40 p-4 text-sm text-muted-foreground',
          className
        )}
      >
        {t('video.connecting') || 'Connecting to secure video session…'}
      </div>
    );
  }

  if (tokenError) {
    // Get user-friendly error message (errors are already parsed in useZegoKitToken)
    const errorMessage =
      tokenError instanceof Error
        ? tokenError.message
        : t('video.unableToStart') || 'Unable to start the call.';

    // Log technical details to console only (not shown to user)
    if (tokenError instanceof Error) {
      console.error('[VideoCall] Technical error details:', {
        message: tokenError.message,
        stack: tokenError.stack,
      });
    }

    return (
      <div
        className={cn(
          'flex h-full w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed border-destructive/40 bg-destructive/5 p-4 text-center text-sm text-destructive',
          className
        )}
      >
        <p>{errorMessage}</p>
        <Button size="sm" variant="outline" onClick={() => tokenQuery.refetch()}>
          {t('common.tryAgain') || 'Try Again'}
        </Button>
      </div>
    );
  }

  if (!hasTokenData) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center rounded-md border border-dashed border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive',
          className
        )}
      >
        {t('video.notConfigured') ||
          'Video calling is not configured. Please verify your ZegoCloud credentials.'}
      </div>
    );
  }

  if (joinError) {
    return (
      <div
        className={cn(
          'flex h-full w-full flex-col items-center justify-center gap-3 rounded-md border border-dashed border-destructive/40 bg-destructive/5 p-4 text-center text-sm text-destructive',
          className
        )}
      >
        <p>{joinError}</p>
        {process.env.NODE_ENV === 'development' && (
          <div className="w-full max-w-xl text-left text-xs text-muted-foreground">
            <p className="font-medium text-foreground/80">Debug details</p>
            <pre className="mt-1 whitespace-pre-wrap  rounded-md border border-border bg-background/60 p-2">
              {joinErrorDetails ||
                `No details captured.\nroomId=${roomId}\nscenarioMode=${String(scenarioMode)}\napiUserId=${tokenQuery.data?.userId ?? 'n/a'}\nappId=${tokenQuery.data?.appId ?? 'n/a'}`}
            </pre>
          </div>
        )}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              // Force a re-join attempt with the same token
              activeJoinKeyRef.current = null;
              instanceRef.current?.destroy();
              instanceRef.current = null;
              setJoinError(null);
              setJoinErrorDetails(null);
              setRetryKey((v) => v + 1);
            }}
          >
            {t('common.tryAgain') || 'Try Again'}
          </Button>
          {!kitTokenProp && (
            <Button size="sm" variant="outline" onClick={() => tokenQuery.refetch()}>
              {t('video.refreshToken') || 'Refresh Token'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('relative h-full w-full', className)}>
      {/* Visible placeholder so the dialog never looks "blank" */}
      {!initialised && (
        <div className="absolute inset-0 flex items-center justify-center rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          {t('video.connecting') || 'Connecting…'}
        </div>
      )}

      <div
        ref={containerRef}
        className={cn(
          'relative h-full w-full overflow-hidden rounded-lg border border-border bg-background',
          // Keep container visible (no opacity:0) to avoid portal/layout timing issues.
          initialised ? 'opacity-100' : 'opacity-100'
        )}
      />
    </div>
  );
}

// ScenarioMode is exported above (do not re-export to avoid TS conflict).
