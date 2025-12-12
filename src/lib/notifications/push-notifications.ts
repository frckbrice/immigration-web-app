// Browser Push Notifications using Web Push API
import { logger } from '@/lib/utils/logger';

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    logger.warn('This browser does not support notifications');
    return 'denied';
  }

  return await Notification.requestPermission();
}

export async function showNotification(
  title: string,
  options?: NotificationOptions
): Promise<boolean> {
  const permission = await requestNotificationPermission();

  if (permission === 'granted') {
    try {
      const notification = new Notification(title, {
        icon: '/images/app-logo.png',
        badge: '/images/app-logo.png',
        ...options,
      });

      // Handle click/tap to navigate to action URL (web only)
      // We expect callers to pass options.data = { url: "/some/path" } (or absolute URL).
      const url = (options as any)?.data?.url;
      if (typeof url === 'string' && url.trim().length > 0) {
        notification.onclick = (event) => {
          // Prevent default and focus existing tab
          event.preventDefault?.();
          try {
            window.focus();
          } catch {
            // ignore
          }
          // Prefer SPA navigation (no reload). DashboardLayout listens for this event.
          (window as any).__appNotificationNavHandled = false;
          window.dispatchEvent(new CustomEvent('app:navigate', { detail: { url } }));

          // Fallback: if no listener handled it, do a hard navigation after a short delay.
          window.setTimeout(() => {
            if (!(window as any).__appNotificationNavHandled) {
              window.location.href = url;
            }
          }, 250);
        };
      }
      return true;
    } catch (error) {
      logger.error('Failed to create browser notification', error, {
        title,
        options: JSON.stringify(options),
      });
      return false;
    }
  }

  return false;
}

export async function showCaseUpdateNotification(caseRef: string, status: string): Promise<void> {
  await showNotification('Case Status Updated', {
    body: `Case ${caseRef} is now ${status}`,
    tag: `case-${caseRef}`,
    requireInteraction: true,
  });
}

export async function showDocumentNotification(
  documentName: string,
  status: 'approved' | 'rejected'
): Promise<void> {
  await showNotification(status === 'approved' ? 'Document Approved' : 'Document Rejected', {
    body: `Your ${documentName} has been ${status}`,
    tag: `document-${documentName}`,
  });
}

export async function showMessageNotification(from: string, message: string): Promise<void> {
  await showNotification('New Message', {
    body: `${from}: ${message.substring(0, 100)}`,
    tag: 'new-message',
    requireInteraction: true,
  });
}
