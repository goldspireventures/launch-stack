/**
 * Common error types used across the stack. Server code throws these; the
 * tRPC error formatter converts them to the appropriate HTTP status.
 */

export class GoldspireError extends Error {
  readonly code: string;
  readonly status: number;
  override readonly cause?: unknown;
  constructor(message: string, opts: { code: string; status: number; cause?: unknown }) {
    super(message);
    this.name = this.constructor.name;
    this.code = opts.code;
    this.status = opts.status;
    this.cause = opts.cause;
  }
}

export class NotFoundError extends GoldspireError {
  constructor(entity: string, id?: string) {
    super(`${entity}${id ? ` ${id}` : ''} not found`, { code: 'NOT_FOUND', status: 404 });
  }
}

export class UnauthenticatedError extends GoldspireError {
  constructor(message = 'Authentication required') {
    super(message, { code: 'UNAUTHENTICATED', status: 401 });
  }
}

export class ForbiddenError extends GoldspireError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, { code: 'FORBIDDEN', status: 403 });
  }
}

export class ValidationError extends GoldspireError {
  constructor(message: string, cause?: unknown) {
    super(message, { code: 'VALIDATION', status: 400, cause });
  }
}

export class ConflictError extends GoldspireError {
  constructor(message: string) {
    super(message, { code: 'CONFLICT', status: 409 });
  }
}

export class RateLimitError extends GoldspireError {
  constructor(message = 'Too many requests') {
    super(message, { code: 'RATE_LIMIT', status: 429 });
  }
}

export class IntegrationError extends GoldspireError {
  constructor(service: string, message: string, cause?: unknown) {
    super(`${service}: ${message}`, { code: 'INTEGRATION_ERROR', status: 502, cause });
  }
}
