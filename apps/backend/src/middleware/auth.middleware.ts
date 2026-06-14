import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { sendUnauthorized, sendForbidden } from '../utils/response';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    sendUnauthorized(res, 'No token provided');
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        fullName: true,
        phone: true,
        departmentId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      sendUnauthorized(res, 'Account is inactive or no longer exists');
      return;
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      phone: user.phone ?? '',
      departmentId: user.departmentId,
    };

    next();
  } catch {
    sendUnauthorized(res, 'Invalid or expired token');
  }
}

export function authorize(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendUnauthorized(res);
      return;
    }

    if (!roles.includes(req.user.role)) {
      sendForbidden(res, 'You do not have permission to access this resource');
      return;
    }

    next();
  };
}

export const requireAdmin = authorize(UserRole.admin, UserRole.super_admin);

export function requireDepartment(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    sendUnauthorized(res);
    return;
  }

  if (req.user.role !== UserRole.department) {
    sendForbidden(res, 'Department access required');
    return;
  }

  if (!req.user.departmentId) {
    sendForbidden(res, 'Department account is not linked to a department');
    return;
  }

  next();
}

export function requireDepartmentOrAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    sendUnauthorized(res);
    return;
  }

  if (req.user.role === UserRole.department || req.user.role === UserRole.admin || req.user.role === UserRole.super_admin) {
    next();
    return;
  }

  sendForbidden(res, 'Department or admin access required');
}
