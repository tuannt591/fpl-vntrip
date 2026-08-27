import { NextRequest, NextResponse } from 'next/server';

import { getRequestIdentity } from '@/lib/auth/request-session';
import {
  getFplGameweekContext,
  getFplGameweeks,
} from '@/lib/fpl-gameweeks';
import { FPL_SEASON, VNTRIP_LEAGUE_ID } from '@/lib/fpl-config';
import { synchronizeH2HMatches } from '@/lib/h2h/matches';
import {
  createH2HGroup,
  getClaimedManagersByEntryIds,
  getH2HMatches,
  getManagerClaim,
} from '@/lib/h2h/repository';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const identity = await getRequestIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    const [myManager, gameweeks, initialMatches] = await Promise.all([
      getManagerClaim(identity.profile.id, FPL_SEASON, VNTRIP_LEAGUE_ID),
      getFplGameweeks(),
      getH2HMatches(FPL_SEASON, VNTRIP_LEAGUE_ID),
    ]);
    const changed = await synchronizeH2HMatches(initialMatches, gameweeks);
    const matches = changed
      ? await getH2HMatches(FPL_SEASON, VNTRIP_LEAGUE_ID)
      : initialMatches;

    return NextResponse.json({
      season: FPL_SEASON,
      leagueId: VNTRIP_LEAGUE_ID,
      myManager,
      gameweek: getFplGameweekContext(gameweeks),
      matches,
    });
  } catch (error) {
    console.error('[H2H] Unable to load group matches:', error);
    return NextResponse.json(
      { error: 'Không thể tải danh sách trận H2H.' },
      { status: 500 },
    );
  }
}

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

    const body = (await request.json()) as { opponentEntryIds?: unknown };
    if (!Array.isArray(body.opponentEntryIds)) {
      return NextResponse.json(
        { error: 'Danh sách manager không hợp lệ.' },
        { status: 400 },
      );
    }

    const opponentEntryIds = body.opponentEntryIds.map(Number);
    if (
      opponentEntryIds.length === 0 ||
      opponentEntryIds.some(
        (entryId) => !Number.isSafeInteger(entryId) || entryId <= 0,
      ) ||
      new Set(opponentEntryIds).size !== opponentEntryIds.length
    ) {
      return NextResponse.json(
        { error: 'Hãy chọn ít nhất một manager và không chọn trùng.' },
        { status: 400 },
      );
    }

    const [myManager, gameweeks] = await Promise.all([
      getManagerClaim(identity.profile.id, FPL_SEASON, VNTRIP_LEAGUE_ID),
      getFplGameweeks(),
    ]);
    if (!myManager) {
      return NextResponse.json(
        { error: 'Bạn cần claim manager của mình trước.' },
        { status: 409 },
      );
    }
    if (opponentEntryIds.includes(myManager.entryId)) {
      return NextResponse.json(
        { error: 'Bạn đã được tự động thêm vào nhóm H2H.' },
        { status: 400 },
      );
    }

    const gameweek = getFplGameweekContext(gameweeks);
    if (!gameweek.creationGameweek || !gameweek.creationDeadlineTime) {
      return NextResponse.json(
        { error: 'Hiện không có gameweek nào đang mở đăng ký H2H.' },
        { status: 409 },
      );
    }
    if (Date.parse(gameweek.creationDeadlineTime) <= Date.now()) {
      return NextResponse.json(
        { error: 'Đã hết hạn tạo trận cho gameweek này.' },
        { status: 409 },
      );
    }

    const opponents = await getClaimedManagersByEntryIds(
      FPL_SEASON,
      VNTRIP_LEAGUE_ID,
      opponentEntryIds,
    );
    if (opponents.length !== opponentEntryIds.length) {
      return NextResponse.json(
        { error: 'Tất cả thành viên phải claim manager trước khi tham gia.' },
        { status: 400 },
      );
    }

    try {
      const match = await createH2HGroup({
        season: FPL_SEASON,
        leagueId: VNTRIP_LEAGUE_ID,
        gameweek: gameweek.creationGameweek,
        initiatedByProfileId: identity.profile.id,
        managerEntryIds: [myManager.id, ...opponents.map((item) => item.id)],
      });
      return NextResponse.json({ match, gameweek }, { status: 201 });
    } catch (error) {
      const databaseError = error as Error & { code?: string };
      if (databaseError.code === '23505') {
        return NextResponse.json(
          {
            error:
              'Nhóm manager này đã có một trận H2H trong gameweek hiện tại.',
          },
          { status: 409 },
        );
      }
      if (databaseError.code === '22023') {
        return NextResponse.json(
          { error: 'Danh sách thành viên H2H không hợp lệ.' },
          { status: 400 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error('[H2H] Unable to create group match:', error);
    return NextResponse.json(
      { error: 'Không thể tạo trận H2H.' },
      { status: 500 },
    );
  }
}
