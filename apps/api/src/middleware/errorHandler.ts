import type { ErrorRequestHandler } from 'express';
import type { ErrorResponse } from '@brix/shared';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    const body: ErrorResponse = { error: err.message };
    res.status(err.status).json(body);
    return;
  }
  const body: ErrorResponse = { error: 'Internal server error' };
  res.status(500).json(body);
};
