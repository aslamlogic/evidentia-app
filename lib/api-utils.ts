import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'evidentia-secret-key';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  tier: string;
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

export function isAdmin(user: JwtPayload | null): boolean {
  return user?.role === 'admin' || user?.role === 'superuser';
}
