import 'server-only';

import type { NextRequest } from 'next/server';

import { APP_SESSION_COOKIE, readAppSessionToken } from '@/lib/auth/app-session';
import { getProfileById } from '@/lib/h2h/repository';
import type { AppProfile, AppSession } from '@/types/h2h';

export async function getRequestIdentity(
  request: NextRequest,
): Promise<{ session: AppSession; profile: AppProfile } | null> {
  const session = await readAppSessionToken(
    request.cookies.get(APP_SESSION_COOKIE)?.value,
  );

  if (!session) return null;

  const profile = await getProfileById(session.profileId);
  if (!profile || profile.ermisUserId !== session.ermisUserId) return null;

  return { session, profile };
}
