import { NextRequest, NextResponse } from 'next/server';

import { getRequestIdentity } from '@/lib/auth/request-session';
import { getFplLeagueManagers } from '@/lib/fpl-league';
import { FPL_SEASON, VNTRIP_LEAGUE_ID } from '@/lib/fpl-config';
import { createManagerClaim, getManagerClaim } from '@/lib/h2h/repository';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const identity = await getRequestIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }
    if (!identity.profile.isH2HEnabled) {
      return NextResponse.json(
        { error: 'Tài khoản chưa được phép chơi H2H.' },
        { status: 403 },
      );
    }

    const body = (await request.json()) as { entryId?: unknown };
    const entryId = Number(body.entryId);
    if (!Number.isSafeInteger(entryId) || entryId <= 0) {
      return NextResponse.json({ error: 'Entry ID không hợp lệ.' }, { status: 400 });
    }

    const currentClaim = await getManagerClaim(
      identity.profile.id,
      FPL_SEASON,
      VNTRIP_LEAGUE_ID,
    );
    if (currentClaim) {
      if (currentClaim.entryId === entryId) {
        return NextResponse.json({ manager: currentClaim });
      }
      return NextResponse.json(
        { error: 'Bạn đã claim một manager trong mùa giải này.' },
        { status: 409 },
      );
    }

    const managers = await getFplLeagueManagers();
    const manager = managers.find((item) => item.entryId === entryId);
    if (!manager) {
      return NextResponse.json(
        { error: 'Manager không thuộc league hiện tại.' },
        { status: 400 },
      );
    }

    try {
      const claim = await createManagerClaim({
        profileId: identity.profile.id,
        season: FPL_SEASON,
        leagueId: VNTRIP_LEAGUE_ID,
        ...manager,
      });
      return NextResponse.json({ manager: claim }, { status: 201 });
    } catch (error) {
      if ((error as Error & { code?: string }).code === '23505') {
        return NextResponse.json(
          { error: 'Manager này vừa được một thành viên khác claim.' },
          { status: 409 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('[H2H] Unable to claim manager:', error);
    return NextResponse.json(
      { error: 'Không thể claim manager.' },
      { status: 500 },
    );
  }
}
