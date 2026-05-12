import { AsyncLocalStorage } from 'node:async_hooks';
import { createWriteStream } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import pino from 'pino';
import pretty from 'pino-pretty';
import { env } from '@goldspire/config/env';

/** Paths passed to pino `redact` (dot-paths). */
export const redact: string[] = [
  'password',
  '*.password',
  'accessToken',
  'refreshToken',
  'token',
  '*.token',
  'authorization',
  'headers.authorization',
  '*.authorization',
  'cookie',
  'headers.cookie',
  '*.cookie',
  'DATABASE_URL',
  '*.DATABASE_URL',
  'databaseUrl',
  '*.databaseUrl',
];

const requestStore = new AsyncLocalStorage<{ requestId: string }>();

export function requestId(): string | undefined {
  return requestStore.getStore()?.requestId;
}

export function withRequestId<T>(id: string, fn: () => Promise<T>): Promise<T> {
  return requestStore.run({ requestId: id }, fn);
}

/** Optional per-process service label for log filenames (set before first log, or use env). */
let explicitServiceName: string | undefined;

export function setLoggerServiceName(name: string): void {
  explicitServiceName = name;
}

function serviceName(): string {
  return explicitServiceName ?? process.env.LOGGER_SERVICE ?? 'goldspire';
}

function logDir(): string {
  const raw = process.env.LOGGER_LOG_DIR?.trim();
  if (!raw || raw.length === 0) return join(process.cwd(), 'logs');
  if (isAbsolute(raw)) return raw;
  return join(process.cwd(), raw);
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

const baseOptions: pino.LoggerOptions = {
  level: process.env.LOG_LEVEL ?? 'info',
  redact: {
    paths: redact,
    censor: '[Redacted]',
  },
  mixin() {
    const id = requestId();
    return id ? { requestId: id } : {};
  },
};

function createRootLogger(): pino.Logger {
  const isProd = env.NODE_ENV === 'production';

  if (isProd) {
    return pino(baseOptions);
  }

  const dir = logDir();
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `${serviceName()}-${todayStamp()}.log`);
  const fileStream = createWriteStream(filePath, { flags: 'a' });
  const prettyStream = pretty({
    colorize: true,
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname',
  });

  return pino(
    baseOptions,
    pino.multistream([
      { level: 'debug', stream: prettyStream },
      { level: 'debug', stream: fileStream },
    ]),
  );
}

let rootLogger: pino.Logger | undefined;

function getRoot(): pino.Logger {
  if (!rootLogger) {
    rootLogger = createRootLogger();
  }
  return rootLogger;
}

/**
 * Root pino instance. Lazily created on first use so callers can set
 * `LOGGER_SERVICE` / `withRequestLogging({ service })` before the first line is written.
 */
export const logger: pino.Logger = new Proxy({} as pino.Logger, {
  get(_target, prop, receiver) {
    const root = getRoot();
    const value = Reflect.get(root, prop, receiver);
    if (typeof value === 'function') {
      return (value as (...a: unknown[]) => unknown).bind(root);
    }
    return value;
  },
});

export function child(bindings: pino.Bindings): pino.Logger {
  return getRoot().child(bindings);
}
