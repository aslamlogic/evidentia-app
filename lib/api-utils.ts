import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'evidentia-secret-key';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tier: string;
  organisationId?: string;
}

export function getUserFromToken(req: NextRequest): JwtPayload | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.substring(7);
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

// Evidentia platform admin or superuser
export function isAdmin(user: JwtPayload | null): boolean {
  return user?.role === 'admin' || user?.role === 'superuser';
}

// Firm-level admin (user_admin) — manages their own organisation only
export function isUserAdmin(user: JwtPayload | null): boolean {
  return user?.role === 'user_admin';
}

// Evidentia superuser (governor) — full system access
export function isSuperuser(user: JwtPayload | null): boolean {
  return user?.role === 'superuser';
}

// Any admin-level access (platform admin, user_admin, or superuser)
export function hasAdminAccess(user: JwtPayload | null): boolean {
  return user?.role === 'admin' || user?.role === 'user_admin' || user?.role === 'superuser';
}

// Scope check: user_admin can only act within their own organisation
export function isSameOrganisation(user: JwtPayload | null, organisationId: string): boolean {
  if (!user || !user.organisationId) return false;
  return user.organisationId === organisationId;
}
