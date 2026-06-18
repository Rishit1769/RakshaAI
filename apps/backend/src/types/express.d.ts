import { UserRole } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /** Authenticated user injected by auth middleware */
      user?: {
        id: string;
        email: string;
        role: UserRole;
        fullName: string;
        phone: string;
        departmentId: string | null;
        ngoId: string | null;
        mustChangePassword: boolean;
      };
    }
  }
}

export {};
