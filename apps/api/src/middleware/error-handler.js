import { ZodError } from 'zod';

export function notFound(_req, res) {
  res.status(404).json({ error: { message: 'Route not found', code: 'NOT_FOUND' } });
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof ZodError) {
    return res.status(422).json({ error: { message: 'Validation failed', code: 'VALIDATION_ERROR', details: error.issues } });
  }
  const status = error.status ?? 500;
  return res.status(status).json({
    error: {
      message: status === 500 ? 'Something went wrong' : error.message,
      code: error.code ?? (status === 500 ? 'INTERNAL_ERROR' : 'REQUEST_ERROR'),
    },
  });
}
