import { NextRequest, NextResponse } from 'next/server';

import { getRequestIdentity } from '@/lib/auth/request-session';
import { FPL_SEASON, VNTRIP_LEAGUE_ID } from '@/lib/fpl-config';
import { getManagerClaim } from '@/lib/h2h/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const identity = await getRequestIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    const manager = await getManagerClaim(
      identity.profile.id,
      FPL_SEASON,
      VNTRIP_LEAGUE_ID,
    );

    return NextResponse.json({ profile: identity.profile, manager });
  } catch (error) {
    console.error('[Auth] Unable to load current profile:', error);
    return NextResponse.json(
      { error: 'Không thể tải thông tin đăng nhập.' },
      { status: 500 },
    );
  }
}
