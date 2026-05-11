/**
 * Minimal structured logger. We avoid pino in this base package so the bundle
 * stays light for Edge runtimes; apps that want richer logging can swap this
 * for pino/winston/etc. behind the same surface.
 */
import { isProduction } from '@goldspire/config';

type Level = 'debug' | 'info' | 'warn' | 'error';

interface Entry {
  level: Level;
  message: string;
  data?: Record<string, unknown>;
  err?: unknown;
}

function emit({ level, message, data, err }: Entry) {
  const payload: Record<string, unknown> = {
    level,
    msg: message,
    ts: new Date().toISOString(),
    ...(data ?? {}),
  };
  if (err instanceof Error) {
    payload.err = { name: err.name, message: err.message, stack: err.stack };
  } else if (err !== undefined) {
    payload.err = err;
  }
  const line = isProduction ? JSON.stringify(payload) : prettyPrint(level, message, data, err);
  if (level === 'error' || level === 'warn') {
    // eslint-disable-next-line no-console
    console[level === 'error' ? 'error' : 'warn'](line);
  } else {
    // eslint-disable-next-line no-console
    console.log(line);
  }
}

function prettyPrint(level: Level, message: string, data?: unknown, err?: unknown): string {
  const tag = `[${level.toUpperCase()}]`.padEnd(7);
  const extra = data ? ` ${JSON.stringify(data)}` : '';
  const errStr = err instanceof Error ? `\n${err.stack ?? err.message}` : err ? ` err=${err}` : '';
  return `${tag} ${message}${extra}${errStr}`;
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) =>
    isProduction ? undefined : emit({ level: 'debug', message, data }),
  info: (message: string, data?: Record<string, unknown>) => emit({ level: 'info', message, data }),
  warn: (message: string, data?: Record<string, unknown>, err?: unknown) =>
    emit({ level: 'warn', message, data, err }),
  error: (message: string, err?: unknown, data?: Record<string, unknown>) =>
    emit({ level: 'error', message, data, err }),
  child: (context: Record<string, unknown>) => ({
    debug: (msg: string, d?: Record<string, unknown>) => logger.debug(msg, { ...context, ...d }),
    info: (msg: string, d?: Record<string, unknown>) => logger.info(msg, { ...context, ...d }),
    warn: (msg: string, d?: Record<string, unknown>, e?: unknown) =>
      logger.warn(msg, { ...context, ...d }, e),
    error: (msg: string, e?: unknown, d?: Record<string, unknown>) =>
      logger.error(msg, e, { ...context, ...d }),
  }),
};
