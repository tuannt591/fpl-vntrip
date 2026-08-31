import { NextRequest, NextResponse } from 'next/server';

import { getRequestIdentity } from '@/lib/auth/request-session';
import { getFplLeagueManagers } from '@/lib/fpl-league';
import { FPL_SEASON, VNTRIP_LEAGUE_ID } from '@/lib/fpl-config';
import { getLeagueClaims, getManagerClaim } from '@/lib/h2h/repository';
import type { H2HManagerOption } from '@/types/h2h';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const identity = await getRequestIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    const [managers, claims, myManager] = await Promise.all([
      getFplLeagueManagers(),
      getLeagueClaims(FPL_SEASON, VNTRIP_LEAGUE_ID),
      getManagerClaim(identity.profile.id, FPL_SEASON, VNTRIP_LEAGUE_ID),
    ]);
    const claimsByEntryId = new Map(claims.map((claim) => [claim.entryId, claim]));
    const options: H2HManagerOption[] = managers.map((manager) => {
      const claim = claimsByEntryId.get(manager.entryId);
      return {
        ...manager,
        claimed: Boolean(claim),
        claimedByMe: claim?.profileId === identity.profile.id,
      };
    });

    return NextResponse.json({
      season: FPL_SEASON,
      leagueId: VNTRIP_LEAGUE_ID,
      profile: identity.profile,
      myManager,
      managers: options,
    }, {
      headers: {
        'Cache-Control': 'private, no-store',
        'Vary': 'Cookie',
      },
    });
  } catch (error) {
    console.error('[H2H] Unable to load manager claim options:', error);
    return NextResponse.json(
      { error: 'Không thể tải danh sách manager.' },
      { status: 500 },
    );
  }
}
