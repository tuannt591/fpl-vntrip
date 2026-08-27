import 'server-only';

import type { AppSession } from '@/types/h2h';

export const APP_SESSION_COOKIE = 'fpl_vntrip_session';
export const APP_SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

function getSessionSecret(): string {
  const secret = process.env.APP_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error('APP_SESSION_SECRET must contain at least 32 characters.');
  }

  return secret;
}

async function getSigningKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(getSessionSecret()),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function createAppSessionToken(
  input: Omit<AppSession, 'version' | 'expiresAt'>,
  expiresAt: number,
): Promise<string> {
  const payload: AppSession = {
    version: 1,
    ...input,
    expiresAt,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = await crypto.subtle.sign(
    'HMAC',
    await getSigningKey(),
    new TextEncoder().encode(encodedPayload),
  );

  return `${encodedPayload}.${Buffer.from(signature).toString('base64url')}`;
}

export async function readAppSessionToken(
  token: string | undefined,
): Promise<AppSession | null> {
  if (!token) return null;

  try {
    const [encodedPayload, encodedSignature, ...rest] = token.split('.');
    if (!encodedPayload || !encodedSignature || rest.length > 0) return null;

    const validSignature = await crypto.subtle.verify(
      'HMAC',
      await getSigningKey(),
      Buffer.from(encodedSignature, 'base64url'),
      new TextEncoder().encode(encodedPayload),
    );

    if (!validSignature) return null;

    const session = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as Partial<AppSession>;

    if (
      session.version !== 1 ||
      typeof session.profileId !== 'string' ||
      typeof session.ermisUserId !== 'string' ||
      typeof session.email !== 'string' ||
      typeof session.expiresAt !== 'number' ||
      session.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return session as AppSession;
  } catch {
    return null;
  }
}
