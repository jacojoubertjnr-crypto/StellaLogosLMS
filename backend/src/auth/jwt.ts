import jwt from 'jsonwebtoken';

const SECRET = process.env.JWT_SECRET;
if (!SECRET) throw new Error('JWT_SECRET is not set in .env');
const RESOLVED_SECRET = SECRET;

export interface TokenPayload {
  userId: string;
  role: 'Admin' | 'Teacher' | 'Learner';
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, RESOLVED_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, RESOLVED_SECRET) as unknown as TokenPayload;
  } catch {
    return null;
  }
}
