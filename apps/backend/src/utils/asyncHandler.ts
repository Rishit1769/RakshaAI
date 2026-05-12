import { Request, Response, NextFunction } from 'express';

/**
 * Wraps async route handlers to forward errors to Express error middleware.
 * Eliminates try/catch boilerplate in every controller.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
