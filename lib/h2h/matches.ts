import 'server-only';

import {
  getFplEntryHistoryPoints,
  type FplGameweek,
} from '@/lib/fpl-gameweeks';
import {
  completeH2HGroup,
  lockH2HMatches,
} from '@/lib/h2h/repository';
import type {
  H2HGroupMatch,
  H2HParticipantResult,
} from '@/types/h2h';

type CompletedResult = {
  managerEntryId: string;
  points: number;
  rank: number;
  result: Exclude<H2HParticipantResult, 'pending'>;
};

function calculateResults(
  participants: Array<{ managerEntryId: string; points: number }>,
): CompletedResult[] {
  const sortedPoints = Array.from(
    new Set(participants.map((item) => item.points)),
  ).sort((a, b) => b - a);
  const topPoints = sortedPoints[0];
  const allTied = sortedPoints.length === 1;
  const topCount = participants.filter((item) => item.points === topPoints).length;

  return participants.map((participant) => {
    const rank = sortedPoints.indexOf(participant.points) + 1;
    let result: CompletedResult['result'];

    if (allTied) result = 'draw';
    else if (participant.points === topPoints) {
      result = topCount > 1 ? 'joint_winner' : 'winner';
    } else result = 'loss';

    return { ...participant, rank, result };
  });
}

export async function synchronizeH2HMatches(
  matches: H2HGroupMatch[],
  gameweeks: FplGameweek[],
): Promise<boolean> {
  const eventsById = new Map(gameweeks.map((event) => [event.id, event]));
  const now = Date.now();
  const lockIds = matches
    .filter((match) => {
      const event = eventsById.get(match.gameweek);
      return (
        match.status === 'open' &&
        Boolean(event) &&
        Date.parse(event!.deadlineTime) <= now
      );
    })
    .map((match) => match.id);

  if (lockIds.length > 0) await lockH2HMatches(lockIds);

  const completableMatches = matches.filter((match) => {
    const event = eventsById.get(match.gameweek);
    return (
      (match.status === 'open' || match.status === 'locked') &&
      event?.finished === true
    );
  });
  if (completableMatches.length === 0) return lockIds.length > 0;

  const historyByEntryId = new Map<number, Promise<Map<number, number>>>();
  const getHistory = (entryId: number) => {
    let request = historyByEntryId.get(entryId);
    if (!request) {
      request = getFplEntryHistoryPoints(entryId);
      historyByEntryId.set(entryId, request);
    }
    return request;
  };

  let completedCount = 0;
  for (const match of completableMatches) {
    try {
      const scores = await Promise.all(
        match.participants.map(async (participant) => ({
          managerEntryId: participant.managerEntryId,
          points: (await getHistory(participant.manager.entryId)).get(
            match.gameweek,
          ),
        })),
      );

      if (scores.some((score) => score.points === undefined)) {
        console.warn(
          `[H2H] FPL has no final score for every participant in match ${match.id}.`,
        );
        continue;
      }

      await completeH2HGroup(
        match.id,
        calculateResults(
          scores.map((score) => ({
            managerEntryId: score.managerEntryId,
            points: score.points!,
          })),
        ),
      );
      completedCount += 1;
    } catch (error) {
      console.error(`[H2H] Unable to finalize match ${match.id}:`, error);
    }
  }

  return lockIds.length > 0 || completedCount > 0;
}
