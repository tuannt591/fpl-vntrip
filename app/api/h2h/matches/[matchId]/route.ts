import { NextRequest, NextResponse } from 'next/server';

import { getRequestIdentity } from '@/lib/auth/request-session';
import { getFplGameweeks } from '@/lib/fpl-gameweeks';
import { FPL_SEASON, VNTRIP_LEAGUE_ID } from '@/lib/fpl-config';
import {
  cancelH2HMatch,
  getH2HMatchById,
} from '@/lib/h2h/repository';

export const dynamic = 'force-dynamic';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { matchId: string } },
) {
  try {
    const identity = await getRequestIdentity(request);
    if (!identity) {
      return NextResponse.json({ error: 'Unauthenticated.' }, { status: 401 });
    }

    const match = await getH2HMatchById(params.matchId);
    if (
      !match ||
      match.season !== FPL_SEASON ||
      match.leagueId !== VNTRIP_LEAGUE_ID ||
      match.status === 'cancelled'
    ) {
      return NextResponse.json(
        { error: 'Không tìm thấy trận H2H.' },
        { status: 404 },
      );
    }
    if (match.initiatedByProfileId !== identity.profile.id) {
      return NextResponse.json(
        { error: 'Chỉ người tạo nhóm mới có thể xóa trận này.' },
        { status: 403 },
      );
    }
    if (match.status !== 'open') {
      return NextResponse.json(
        { error: 'Không thể xóa trận đã khóa hoặc đã có kết quả.' },
        { status: 409 },
      );
    }

    const gameweeks = await getFplGameweeks();
    const event = gameweeks.find((item) => item.id === match.gameweek);
    if (!event || Date.parse(event.deadlineTime) <= Date.now()) {
      return NextResponse.json(
        { error: 'Đã qua deadline nên không thể xóa trận này.' },
        { status: 409 },
      );
    }

    const cancelled = await cancelH2HMatch(match.id, identity.profile.id);
    if (!cancelled) {
      return NextResponse.json(
        { error: 'Trận vừa được khóa nên không thể xóa.' },
        { status: 409 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[H2H] Unable to cancel group match:', error);
    return NextResponse.json(
      { error: 'Không thể xóa trận H2H.' },
      { status: 500 },
    );
  }
}
