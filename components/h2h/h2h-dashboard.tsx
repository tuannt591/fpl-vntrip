"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Crown,
  Loader2,
  LockKeyhole,
  Plus,
  RefreshCw,
  Trash2,
  Users,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  H2HLoadingSkeleton,
  H2HMatchesSkeleton,
} from "@/components/h2h/h2h-loading-skeleton";
import { cn } from "@/lib/utils";
import type {
  AppProfile,
  ClaimedManager,
  H2HGameweekContext,
  H2HGroupMatch,
  H2HManagerOption,
  H2HParticipantResult,
} from "@/types/h2h";

export type H2HDashboardData = {
  season: string;
  leagueId: string;
  profile: AppProfile;
  myManager: ClaimedManager;
  managers: H2HManagerOption[];
};

type MatchesResponse = {
  season: string;
  leagueId: string;
  myManager: ClaimedManager | null;
  gameweek: H2HGameweekContext;
  matches: H2HGroupMatch[];
};

type MyRecord = {
  wins: number;
  draws: number;
  losses: number;
};

const EMPTY_MATCHES: H2HGroupMatch[] = [];

function Avatar({
  manager,
  size = "md",
}: {
  manager: { managerName: string; managerAvatar: string | null };
  size?: "sm" | "md";
}) {
  const dimension = size === "sm" ? 32 : 40;
  const className = size === "sm" ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm";

  if (manager.managerAvatar) {
    return (
      <Image
        src={manager.managerAvatar}
        alt={manager.managerName}
        width={dimension}
        height={dimension}
        unoptimized
        className={cn("shrink-0 rounded-xl object-cover", className)}
      />
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl bg-primary/10 font-bold text-primary",
        className,
      )}
    >
      {manager.managerName.charAt(0).toUpperCase()}
    </div>
  );
}

function formatDeadline(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function getResultLabel(result: H2HParticipantResult) {
  if (result === "winner") return "Thắng";
  if (result === "joint_winner") return "Đồng hạng";
  if (result === "draw") return "Hòa";
  if (result === "loss") return "Thua";
  return "Chờ kết quả";
}

function getResultClass(result: H2HParticipantResult) {
  if (result === "winner" || result === "joint_winner") {
    return "text-emerald-600 dark:text-emerald-400";
  }
  if (result === "draw") return "text-amber-600 dark:text-amber-400";
  if (result === "loss") return "text-destructive";
  return "text-muted-foreground";
}

function MatchStatus({ match }: { match: H2HGroupMatch }) {
  if (match.status === "completed") {
    return (
      <Badge className="border-0 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400">
        Xong
      </Badge>
    );
  }
  if (match.status === "locked") {
    return (
      <Badge className="gap-1 border-0 bg-amber-500/10 text-amber-700 hover:bg-amber-500/10 dark:text-amber-400">
        <LockKeyhole className="h-3 w-3" /> Chờ điểm
      </Badge>
    );
  }
  return (
    <Badge className="gap-1 border-0 bg-sky-500/10 text-sky-700 hover:bg-sky-500/10 dark:text-sky-400">
      <Clock3 className="h-3 w-3" /> Đang mở
    </Badge>
  );
}

function MatchCard({
  match,
  myEntryId,
  canDelete,
  onDelete,
}: {
  match: H2HGroupMatch;
  myEntryId: number;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const [showAllParticipants, setShowAllParticipants] = useState(false);
  const myParticipant = match.participants.find(
    (participant) => participant.manager.entryId === myEntryId,
  );
  const compactParticipants = match.participants.slice(0, 3);

  if (
    myParticipant &&
    !compactParticipants.some((participant) => participant.id === myParticipant.id)
  ) {
    compactParticipants[compactParticipants.length - 1] = myParticipant;
  }

  const visibleParticipants = showAllParticipants
    ? match.participants
    : compactParticipants;
  const hiddenParticipantCount = match.participants.length - compactParticipants.length;

  return (
    <article className="overflow-hidden rounded-2xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-black text-primary-foreground">
            {match.gameweek}
          </div>
          <div>
            <p className="text-sm font-bold">Gameweek {match.gameweek}</p>
            <p className="text-xs text-muted-foreground">
              {match.participantCount} người tham gia
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <MatchStatus match={match} />
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              aria-label="Xóa trận H2H"
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="divide-y px-4">
        {visibleParticipants.map((participant) => {
          const isMe = participant.manager.entryId === myEntryId;
          const isWinner =
            participant.result === "winner" ||
            participant.result === "joint_winner";

          return (
            <div
              key={participant.id}
              className={cn(
                "flex items-center gap-2.5 py-2",
                isMe && "-mx-1 rounded-lg bg-primary/[0.045] px-1",
              )}
            >
              {isWinner ? (
                <Crown className="h-4 w-4 shrink-0 text-amber-500" />
              ) : (
                <span className="w-4 shrink-0 text-center text-xs text-muted-foreground">
                  {participant.rank ?? ""}
                </span>
              )}
              <Avatar manager={participant.manager} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {participant.manager.teamName}
                  {isMe && <span className="ml-1.5 text-xs text-primary">Bạn</span>}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {participant.manager.managerName}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-sm font-bold">
                  {participant.points ?? "—"}
                </p>
                <p
                  className={cn(
                    "text-[10px] font-medium",
                    getResultClass(participant.result),
                  )}
                >
                  {getResultLabel(participant.result)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {hiddenParticipantCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAllParticipants((current) => !current)}
          className="flex w-full items-center justify-center gap-1.5 border-t px-4 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
        >
          {showAllParticipants
            ? "Thu gọn danh sách"
            : `Xem thêm ${hiddenParticipantCount} người`}
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 transition-transform",
              showAllParticipants && "rotate-90",
            )}
          />
        </button>
      )}
    </article>
  );
}

function calculateMyRecord(matches: H2HGroupMatch[], myEntryId: number): MyRecord {
  return matches.reduce<MyRecord>(
    (record, match) => {
      if (match.status !== "completed") return record;
      const participant = match.participants.find(
        (item) => item.manager.entryId === myEntryId,
      );
      if (!participant) return record;

      if (participant.result === "winner" || participant.result === "joint_winner") {
        record.wins += 1;
      } else if (participant.result === "draw") {
        record.draws += 1;
      } else if (participant.result === "loss") {
        record.losses += 1;
      }
      return record;
    },
    { wins: 0, draws: 0, losses: 0 },
  );
}

export function H2HDashboard({ data }: { data: H2HDashboardData }) {
  const router = useRouter();
  const [matchesData, setMatchesData] = useState<MatchesResponse | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<number[]>([]);
  const [matchFilter, setMatchFilter] = useState<"mine" | "all">("mine");
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [pickerErrorMessage, setPickerErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteMatch, setDeleteMatch] = useState<H2HGroupMatch | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isRedirecting, setIsRedirecting] = useState(false);
  const matchesRequestRef = useRef<AbortController | null>(null);

  const redirectToLogin = useCallback(() => {
    setIsRedirecting(true);
    router.replace("/login?next=%2Fh2h");
  }, [router]);

  const loadMatches = useCallback(async () => {
    matchesRequestRef.current?.abort();
    const controller = new AbortController();
    matchesRequestRef.current = controller;
    setIsLoading(true);
    setErrorMessage("");
    try {
      const response = await fetch("/api/h2h/matches", {
        headers: { Accept: "application/json" },
        cache: "no-store",
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;

      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      const responseData = (await response.json()) as
        | MatchesResponse
        | { error?: string };
      if (controller.signal.aborted) return;

      if (!response.ok || !("matches" in responseData)) {
        throw new Error(
          "error" in responseData && responseData.error
            ? responseData.error
            : "Không thể tải các trận H2H.",
        );
      }
      setMatchesData(responseData);
    } catch (error) {
      if (controller.signal.aborted) return;

      setErrorMessage(
        error instanceof Error ? error.message : "Không thể tải các trận H2H.",
      );
    } finally {
      if (matchesRequestRef.current === controller) {
        matchesRequestRef.current = null;
        setIsLoading(false);
      }
    }
  }, [redirectToLogin]);

  useEffect(() => {
    void loadMatches();
    return () => {
      const controller = matchesRequestRef.current;
      matchesRequestRef.current = null;
      controller?.abort();
    };
  }, [loadMatches]);

  useEffect(() => {
    if (!successMessage) return;

    const timeoutId = window.setTimeout(() => setSuccessMessage(""), 4000);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  const matches = matchesData?.matches ?? EMPTY_MATCHES;
  const myMatches = useMemo(
    () =>
      matches.filter((match) =>
        match.participants.some(
          (participant) => participant.manager.entryId === data.myManager.entryId,
        ),
      ),
    [data.myManager.entryId, matches],
  );
  const displayedMatches = matchFilter === "mine" ? myMatches : matches;
  const record = useMemo(
    () => calculateMyRecord(matches, data.myManager.entryId),
    [data.myManager.entryId, matches],
  );
  const selectedManagers = data.managers.filter((manager) =>
    selectedEntryIds.includes(manager.entryId),
  );
  const deadline = formatDeadline(
    matchesData?.gameweek.creationDeadlineTime ?? null,
  );

  const canCreate = matchesData?.gameweek.canCreate === true;
  const canDeleteMatch = (match: H2HGroupMatch) =>
    match.status === "open" &&
    match.initiatedByProfileId === data.profile.id &&
    match.gameweek === matchesData?.gameweek.creationGameweek &&
    Boolean(
      matchesData?.gameweek.creationDeadlineTime &&
      Date.parse(matchesData.gameweek.creationDeadlineTime) > Date.now(),
    );

  const toggleManager = (entryId: number) => {
    setSelectedEntryIds((current) =>
      current.includes(entryId)
        ? current.filter((item) => item !== entryId)
        : [...current, entryId],
    );
    setPickerErrorMessage("");
  };

  const createMatch = async () => {
    if (selectedEntryIds.length === 0 || isCreating) return;

    setIsCreating(true);
    setPickerErrorMessage("");
    try {
      const response = await fetch("/api/h2h/matches", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ opponentEntryIds: selectedEntryIds }),
      });
      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      const responseData = (await response.json()) as {
        match?: H2HGroupMatch;
        error?: string;
      };
      if (!response.ok || !responseData.match) {
        throw new Error(responseData.error || "Không thể tạo trận H2H.");
      }

      setSelectedEntryIds([]);
      setIsPickerOpen(false);
      setMatchFilter("mine");
      setSuccessMessage("Đã tạo nhóm H2H thành công.");
      await loadMatches();
    } catch (error) {
      setPickerErrorMessage(
        error instanceof Error ? error.message : "Không thể tạo trận H2H.",
      );
    } finally {
      setIsCreating(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteMatch || isDeleting) return;

    setIsDeleting(true);
    setErrorMessage("");
    try {
      const response = await fetch(`/api/h2h/matches/${deleteMatch.id}`, {
        method: "DELETE",
        headers: { Accept: "application/json" },
      });
      if (response.status === 401) {
        redirectToLogin();
        return;
      }

      const responseData = (await response.json()) as {
        success?: boolean;
        error?: string;
      };
      if (!response.ok || !responseData.success) {
        throw new Error(responseData.error || "Không thể xóa trận H2H.");
      }
      setDeleteMatch(null);
      await loadMatches();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Không thể xóa trận H2H.",
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (isRedirecting || (isLoading && !matchesData)) {
    return <H2HLoadingSkeleton />;
  }

  if (!matchesData && errorMessage) {
    return (
      <Card className="mx-auto max-w-xl rounded-3xl border-destructive/40">
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="h-8 w-8 text-destructive" />
          <p className="text-sm text-destructive">{errorMessage}</p>
          <Button variant="outline" onClick={() => void loadMatches()}>
            Thử lại
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-5">
      <section className="rounded-2xl border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          <Avatar manager={data.myManager} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{data.myManager.teamName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {data.myManager.managerName} · Mùa {data.season}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadMatches()}
            disabled={isLoading}
            aria-label="Tải lại"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-3 divide-x rounded-xl bg-muted/55 py-2.5">
          {[
            ["Thắng", record.wins, "text-emerald-600"],
            ["Hòa", record.draws, "text-amber-600"],
            ["Thua", record.losses, "text-destructive"],
          ].map(([label, value, className]) => (
            <div key={String(label)} className="text-center">
              <p className={cn("font-mono text-lg font-black", className)}>{value}</p>
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {errorMessage && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-destructive/25 bg-destructive/[0.05] p-3 text-sm text-destructive">
          <span className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            {errorMessage}
          </span>
          <button type="button" onClick={() => setErrorMessage("")} aria-label="Đóng lỗi">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] p-3 text-sm text-emerald-700 dark:text-emerald-400">
          <span className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            {successMessage}
          </span>
          <button
            type="button"
            onClick={() => setSuccessMessage("")}
            aria-label="Đóng thông báo thành công"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-bold">Tạo nhóm H2H</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {canCreate
                ? `GW ${matchesData?.gameweek.creationGameweek} · hạn ${deadline}`
                : "Chưa có gameweek mở đăng ký"}
            </p>
          </div>
          <Button
            size="sm"
            className="gap-1.5 rounded-xl"
            disabled={!canCreate || isLoading}
            onClick={() => {
              setPickerErrorMessage("");
              setIsPickerOpen(true);
            }}
          >
            <Plus className="h-4 w-4" /> Tạo nhóm
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-bold">Trận đấu</h2>
            <p className="text-xs text-muted-foreground">
              {matchFilter === "mine"
                ? "Các nhóm bạn đang tham gia"
                : "Tất cả nhóm trong league"}
            </p>
          </div>
          <div className="flex rounded-lg bg-muted p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMatchFilter("mine")}
              className={cn(
                "rounded-md px-2.5 py-1.5 transition",
                matchFilter === "mine" ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              Của tôi ({myMatches.length})
            </button>
            <button
              type="button"
              onClick={() => setMatchFilter("all")}
              className={cn(
                "rounded-md px-2.5 py-1.5 transition",
                matchFilter === "all" ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              Tất cả
            </button>
          </div>
        </div>

        {isLoading ? (
          <H2HMatchesSkeleton />
        ) : displayedMatches.length ? (
          <div className="space-y-3">
            {displayedMatches.map((match) => (
              <MatchCard
                key={match.id}
                match={match}
                myEntryId={data.myManager.entryId}
                canDelete={canDeleteMatch(match)}
                onDelete={() => setDeleteMatch(match)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed p-8 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
              <Users className="h-5 w-5" />
            </div>
            <p className="mt-3 text-sm font-semibold">Chưa có trận đấu</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tạo một nhóm để bắt đầu so điểm gameweek.
            </p>
          </div>
        )}
      </section>

      <Dialog
        open={isPickerOpen}
        onOpenChange={(open) => {
          setIsPickerOpen(open);
          if (!open) setPickerErrorMessage("");
        }}
      >
        <DialogContent className="flex max-h-[86dvh] max-w-md flex-col gap-0 overflow-hidden rounded-2xl p-0 sm:rounded-2xl">
          <DialogHeader className="border-b px-5 pb-4 pt-5">
            <DialogTitle>Chọn đối thủ</DialogTitle>
            <DialogDescription>
              Có thể chọn nhiều người.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {pickerErrorMessage && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-destructive/25 bg-destructive/[0.05] px-3 py-2 text-xs leading-5 text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{pickerErrorMessage}</span>
              </div>
            )}
            {selectedManagers.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-1.5 px-1">
                {selectedManagers.map((manager) => (
                  <button
                    key={manager.entryId}
                    type="button"
                    onClick={() => toggleManager(manager.entryId)}
                    className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                  >
                    {manager.managerName}
                    <X className="h-3 w-3" />
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              {data.managers
                .filter((manager) => !manager.claimedByMe)
                .map((manager) => {
                  const selected = selectedEntryIds.includes(manager.entryId);
                  const unavailable = !manager.claimed;

                  return (
                    <button
                      key={manager.entryId}
                      type="button"
                      disabled={unavailable}
                      onClick={() => toggleManager(manager.entryId)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-xl border p-2.5 text-left",
                        selected
                          ? "border-primary bg-primary/[0.06]"
                          : "border-transparent bg-muted/50",
                        unavailable && "cursor-not-allowed opacity-45",
                      )}
                    >
                      <Avatar manager={manager} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{manager.managerName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {manager.teamName}
                        </p>
                      </div>
                      {unavailable ? (
                        <span className="text-[10px] text-muted-foreground">Chưa claim</span>
                      ) : selected ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3.5 w-3.5" />
                        </span>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
            </div>
          </div>

          <DialogFooter className="border-t bg-background px-4 py-3 sm:flex-row sm:justify-between">
            <p className="hidden text-xs text-muted-foreground sm:block">
              Nhóm có {selectedEntryIds.length + 1} người
            </p>
            <Button
              className="w-full rounded-xl sm:w-auto"
              disabled={selectedEntryIds.length === 0 || isCreating}
              onClick={createMatch}
            >
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isCreating
                ? "Đang tạo..."
                : `Tạo nhóm${selectedEntryIds.length ? ` (${selectedEntryIds.length + 1})` : ""}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteMatch)}
        onOpenChange={(open) => !open && setDeleteMatch(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Xóa trận H2H?</DialogTitle>
            <DialogDescription>
              Chỉ có thể xóa trước deadline. Sau đó bạn vẫn có thể tạo lại nhóm này.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setDeleteMatch(null)}
            >
              Giữ lại
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={confirmDelete}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Xóa trận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
