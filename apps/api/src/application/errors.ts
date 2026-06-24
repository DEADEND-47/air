export class AppError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
    readonly code = 'BAD_REQUEST',
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string) { super(`${entity} not found`, 404, 'NOT_FOUND'); }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') { super(message, 403, 'FORBIDDEN'); }
}
