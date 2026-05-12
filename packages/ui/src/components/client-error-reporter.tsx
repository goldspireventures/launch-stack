'use client';

import * as React from 'react';

/**
 * Mount once in each app's root layout. Catches:
 *
 *  - `window.onerror` (synchronous render / event-handler exceptions)
 *  - `window.onunhandledrejection` (rejected promises with no catch)
 *  - React error boundary fallback messages forwarded by `errorBoundaryEvent`
 *
 * Each event POSTs to `/api/log/client-error` on the same origin. The route
 * (provided by every app, see `apps/*\/src/app/api/log/client-error/route.ts`)
 * logs the entry to stdout with a clear prefix so it shows up in the dev
 * terminal — closing the gap where smoke tests only catch server errors.
 *
 * Production behaviour: same payload shape, but the server route should
 * forward to Sentry / your error pipeline instead of stdout. The shape
 * is intentionally Sentry-compatible.
 */
export function ClientErrorReporter({ app }: { app: string }) {
  React.useEffect(() => {
    let lastSent = '';
    let lastSentAt = 0;

    function post(payload: {
      kind: 'error' | 'rejection';
      message: string;
      stack?: string;
      url: string;
      lineno?: number;
      colno?: number;
    }) {
      const key = `${payload.kind}|${payload.message}`;
      const now = Date.now();
      // Dedup the same error within 2s to avoid hammering the dev log when
      // React re-throws the same exception on every render attempt.
      if (key === lastSent && now - lastSentAt < 2000) return;
      lastSent = key;
      lastSentAt = now;

      try {
        const body = JSON.stringify({
          ...payload,
          app,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        });
        // `keepalive` lets the request finish even if the user is navigating
        // away from the page that just crashed.
        fetch('/api/log/client-error', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        }).catch(() => {
          // Don't recurse — failing to log a client error must never throw.
        });
      } catch {
        // ignore
      }
    }

    function onError(ev: ErrorEvent) {
      post({
        kind: 'error',
        message: ev.message ?? 'unknown error',
        stack: ev.error?.stack,
        url: window.location.href,
        lineno: ev.lineno,
        colno: ev.colno,
      });
    }

    function onRejection(ev: PromiseRejectionEvent) {
      const reason = ev.reason;
      post({
        kind: 'rejection',
        message:
          typeof reason === 'string'
            ? reason
            : reason?.message ?? JSON.stringify(reason) ?? 'unhandled rejection',
        stack: reason?.stack,
        url: window.location.href,
      });
    }

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, [app]);

  return null;
}
