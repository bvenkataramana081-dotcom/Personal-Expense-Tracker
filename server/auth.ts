import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { getUserIdFromSession, findUserById } from './db';
import { User } from '../src/types';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const testHash = crypto.scryptSync(password, salt, 64).toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(testHash, 'hex'));
  } catch {
    return false;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: User;
  userId?: string;
}

export function extractSessionToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  if (req.cookies && req.cookies.session_token) {
    return req.cookies.session_token;
  }
  return null;
}

export function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractSessionToken(req);
  if (!token) {
    res.status(401).json({ error: 'You are not authorized to access this record. Please log in.' });
    return;
  }

  const userId = getUserIdFromSession(token);
  if (!userId) {
    res.status(401).json({ error: 'Invalid or expired session. Please log in again.' });
    return;
  }

  const user = findUserById(userId);
  if (!user) {
    res.status(401).json({ error: 'User not found.' });
    return;
  }

  req.userId = user.id;
  req.user = {
    id: user.id,
    username: user.username,
    email: user.email,
    created_at: user.created_at,
  };

  next();
}
