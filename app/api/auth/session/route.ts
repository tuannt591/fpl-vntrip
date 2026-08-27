import { NextRequest, NextResponse } from 'next/server';

import {
  APP_SESSION_COOKIE,
  APP_SESSION_MAX_AGE_SECONDS,
  createAppSessionToken,
} from '@/lib/auth/app-session';
import {
  ErmisVerificationError,
  verifyErmisAccessToken,
} from '@/lib/auth/ermis';
import { getManagerClaim, upsertProfile } from '@/lib/h2h/repository';
import { FPL_SEASON, VNTRIP_LEAGUE_ID } from '@/lib/fpl-config';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let body: { token?: unknown; userId?: unknown; email?: unknown };

  try {
    body = (await request.json()) as {
      token?: unknown;
      userId?: unknown;
      email?: unknown;
    };
  } catch {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 });
  }

  if (typeof body.token !== 'string') {
    return NextResponse.json(
      { error: 'Ermis token is required.' },
      { status: 400 },
    );
  }

  try {
    const ermisIdentity = await verifyErmisAccessToken(body.token, {
      userId: typeof body.userId === 'string' ? body.userId : undefined,
      email: typeof body.email === 'string' ? body.email : undefined,
    });
    return await createSessionResponse(ermisIdentity);
  } catch (error) {
    const verificationError =
      error instanceof ErmisVerificationError ? error : null;
    console.error(
      '[Auth] Ermis token verification failed:',
      verificationError?.code || error,
    );
    return NextResponse.json(
      {
        error:
          verificationError?.publicMessage ||
          'Không thể xác thực phiên đăng nhập Chat.',
        code: verificationError?.code || 'UNKNOWN_VERIFICATION_ERROR',
      },
      { status: 401 },
    );
  }
}

async function createSessionResponse(
  ermisIdentity: Awaited<ReturnType<typeof verifyErmisAccessToken>>,
) {
  try {
    const profile = await upsertProfile({
      ermisUserId: ermisIdentity.userId,
      email: ermisIdentity.email,
      displayName: ermisIdentity.displayName,
    });
    const manager = await getManagerClaim(
      profile.id,
      FPL_SEASON,
      VNTRIP_LEAGUE_ID,
    );

    const now = Math.floor(Date.now() / 1000);
    const appSessionExpiry = now + APP_SESSION_MAX_AGE_SECONDS;
    const expiresAt = ermisIdentity.tokenExpiresAt
      ? Math.min(appSessionExpiry, ermisIdentity.tokenExpiresAt)
      : appSessionExpiry;
    const sessionToken = await createAppSessionToken(
      {
        profileId: profile.id,
        ermisUserId: profile.ermisUserId,
        email: profile.email,
      },
      expiresAt,
    );

    const response = NextResponse.json({ profile, manager });
    response.cookies.set(APP_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: Math.max(1, expiresAt - now),
    });

    return response;
  } catch (error) {
    console.error('[Auth] Unable to persist app session:', error);
    return NextResponse.json(
      { error: 'Không thể tạo phiên H2H. Vui lòng thử lại sau.' },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(APP_SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
  return response;
}
