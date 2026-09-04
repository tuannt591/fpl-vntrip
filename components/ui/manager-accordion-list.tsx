import { type TouchEvent, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { CircleDollarSign, UserRoundCheck } from "lucide-react";
import { LeaderboardEntry, PlayerMatchStatus } from "@/types/fantasy";

interface ManagerAccordionListProps {
  managers: LeaderboardEntry[];
}

export const ManagerAccordionList = ({
  managers,
}: ManagerAccordionListProps) => {
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<{ src: string; name: string } | null>(null);
  const playerSheetTouchStartYRef = useRef<number | null>(null);

  const handlePlayerSheetTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    playerSheetTouchStartYRef.current = event.touches[0]?.clientY ?? null;
  };

  const handlePlayerSheetTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    const startY = playerSheetTouchStartYRef.current;
    const endY = event.changedTouches[0]?.clientY;
    playerSheetTouchStartYRef.current = null;

    if (startY !== null && endY && endY - startY > 56) {
      setSelectedPlayer(null);
    }
  };

  const CHIP_CONFIG: Record<string, { label: string; variant: "secondary" | "destructive" | "default" | "outline" | "success" | "warning" }> = {
    wildcard: { label: "WC", variant: "destructive" },
    freehit: { label: "FH", variant: "destructive" },
    bboost: { label: "BB", variant: "destructive" },
    '3xc': { label: "TC", variant: "destructive" },
  };

  function renderActiveChip(active_chip?: string | null) {
    if (!active_chip) return null;
    const chip = CHIP_CONFIG[active_chip];
    if (!chip) return null;
    return (
      <Badge variant={chip.variant} className="text-xs font-normal px-2">
        {chip.label}
      </Badge>
    );
  }

  function getElementType(elementType: number) {
    switch (true) {
      case elementType === 1: return "Thủ môn";
      case elementType === 2: return "Hậu vệ";
      case elementType === 3: return "Tiền vệ";
      default: return "Tiền đạo";
    }
  }

  function getPositionBadge(elementType: number) {
    switch (elementType) {
      case 1: return { label: "GK", className: "bg-amber-500 text-white" };
      case 2: return { label: "DEF", className: "bg-blue-500 text-white" };
      case 3: return { label: "MID", className: "bg-green-500 text-white" };
      default: return { label: "FWD", className: "bg-red-500 text-white" };
    }
  }

  // Player detail is a bottom sheet on mobile and a compact dialog on larger screens.
  function renderPlayerDialog() {
    if (!selectedPlayer) return null;
    const { elementName, stats, multiplier, is_captain, is_vice_captain, position, clubName, element_type, avatar } = selectedPlayer;
    const playerStats = stats ?? {};
    const totalPoints = playerStats.total_points ?? 0;
    const displayedPoints = position > 11 ? totalPoints : totalPoints * multiplier;
    const fixture = Array.isArray(selectedPlayer.explain) ? selectedPlayer.explain[0] : null;
    const primaryStats = [
      { icon: "⏱", label: "Phút", value: playerStats.minutes ?? "—" },
      { icon: "⚽", label: "Bàn", value: playerStats.goals_scored ?? 0 },
      { icon: "🅰", label: "Kiến tạo", value: playerStats.assists ?? 0 },
      { icon: "✦", label: "Bonus", value: playerStats.bonus ?? 0 },
    ];
    const additionalStats = [
      { label: "Sạch lưới", value: playerStats.clean_sheets ?? 0 },
      { label: "Cản phá", value: playerStats.saves ?? 0 },
      { label: "Thẻ vàng", value: playerStats.yellow_cards ?? 0 },
      { label: "Thẻ đỏ", value: playerStats.red_cards ?? 0 },
      { label: "Phản lưới", value: playerStats.own_goals ?? 0 },
    ];

    return (
      <Dialog open={!!selectedPlayer} onOpenChange={(open) => !open && setSelectedPlayer(null)}>
        <DialogContent className="fpl-player-detail-dialog flex flex-col left-0 right-0 top-auto bottom-0 max-h-[88dvh] max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-t-[1.5rem] border-x-0 border-b-0 bg-popover/95 p-0 shadow-2xl backdrop-blur-xl max-sm:data-[state=closed]:![--tw-exit-scale:1] max-sm:data-[state=closed]:![--tw-exit-translate-x:0] max-sm:data-[state=closed]:![--tw-exit-translate-y:100%] max-sm:data-[state=open]:![--tw-enter-scale:1] max-sm:data-[state=open]:![--tw-enter-translate-x:0] max-sm:data-[state=open]:![--tw-enter-translate-y:100%] [&>button]:right-3 [&>button]:top-3 [&>button]:z-10 [&>button]:rounded-full [&>button]:bg-background/85 [&>button]:p-1 [&>button]:shadow-sm sm:left-[50%] sm:right-auto sm:top-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-3xl sm:border sm:bg-background sm:backdrop-blur-none sm:[&>button]:right-4 sm:[&>button]:top-4 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95">
          <div
            aria-hidden="true"
            onTouchStart={handlePlayerSheetTouchStart}
            onTouchEnd={handlePlayerSheetTouchEnd}
            className="absolute inset-x-0 top-0 z-10 flex h-7 justify-center pt-2 sm:hidden"
          >
            <span className="h-1 w-10 rounded-full bg-muted-foreground/25" />
          </div>

          <section className="fpl-player-detail-hero relative shrink-0 overflow-hidden border-b bg-gradient-to-br from-primary/15 via-primary/[0.06] to-transparent px-4 pb-4 pt-5 sm:min-h-[134px] sm:px-6 sm:py-6">
            <div className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-3 sm:grid-cols-[68px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:pr-10">
              {avatar ? (
                <button
                  type="button"
                  onClick={() => setSelectedAvatar({
                    src: `https://resources.premierleague.com/premierleague25/photos/players/110x140/${avatar}`,
                    name: elementName,
                  })}
                  className="group relative flex h-20 w-16 items-end justify-center overflow-hidden rounded-2xl border border-background/80 bg-background/70 shadow-sm transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-[86px] sm:w-[68px]"
                  aria-label={`Phóng to ảnh ${elementName}`}
                  title="Phóng to ảnh"
                >
                  <Image
                    src={`https://resources.premierleague.com/premierleague25/photos/players/110x140/${avatar}`}
                    alt={elementName}
                    width={80}
                    height={100}
                    className="h-auto w-[5rem]"
                    unoptimized
                  />
                  <span className="absolute inset-x-0 bottom-0 bg-black/45 py-1 text-[9px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">Xem ảnh</span>
                </button>
              ) : (
                <div className="flex h-20 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-emerald-400 text-3xl font-bold text-primary-foreground shadow-sm sm:h-[86px] sm:w-[68px]">
                  {elementName?.charAt(0)}
                </div>
              )}

              <div className="min-w-0 self-center pr-10 sm:pr-0">
                <DialogTitle className="truncate text-lg font-black tracking-tight sm:text-xl">{elementName}</DialogTitle>
                <p className="mt-0.5 truncate text-sm text-muted-foreground">{clubName || "Premier League"}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-background/80 px-2 py-1 text-[11px] font-semibold text-foreground shadow-sm">
                    {getElementType(element_type)}
                  </span>
                  {is_captain && <span className="rounded-full bg-amber-400/20 px-2 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">Captain</span>}
                  {is_vice_captain && <span className="rounded-full bg-muted px-2 py-1 text-[11px] font-bold text-muted-foreground">Vice Captain</span>}
                  {multiplier > 1 && <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">x{multiplier} điểm</span>}
                </div>
              </div>

              <div className="fpl-player-detail-score col-span-2 flex w-full items-center justify-between rounded-2xl border border-border/70 bg-background/65 px-3 py-2 shadow-sm sm:col-span-1 sm:col-start-3 sm:row-start-1 sm:min-w-[5.75rem] sm:self-stretch sm:flex-col sm:justify-center sm:px-3 sm:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Gameweek</p>
                <p className={`font-mono text-2xl font-black leading-none sm:mt-1 sm:text-3xl ${displayedPoints >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-500"}`}>{displayedPoints}</p>
                <p className="text-[11px] font-medium text-muted-foreground">điểm</p>
              </div>
            </div>
          </section>

          <div className="space-y-4 p-4 sm:p-5">
            {fixture?.fixture_name && (
              <div className="fpl-player-detail-fixture flex items-center justify-between gap-3 rounded-2xl border bg-muted/35 px-3 py-2.5 text-xs">
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">Trận đấu</p>
                  <p className="truncate text-muted-foreground">{fixture.fixture_name}</p>
                </div>
                {fixture.match_status === PlayerMatchStatus.NOT_STARTED && <span className="shrink-0 font-semibold text-amber-600 dark:text-amber-400">Sắp diễn ra</span>}
              </div>
            )}

            <section className="fpl-player-detail-stats">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-bold">Điểm số & đóng góp</h3>
                <span className="text-xs text-muted-foreground">Chỉ số Gameweek</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {primaryStats.map((stat) => (
                  <div key={stat.label} className="fpl-player-detail-stat rounded-2xl border bg-card px-1.5 py-2.5 text-center shadow-sm">
                    <span className="text-sm" aria-hidden>{stat.icon}</span>
                    <p className="mt-1 font-mono text-base font-black">{stat.value}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </section>

            <details className="fpl-player-detail-extra group rounded-2xl border bg-muted/25">
              <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-3 text-sm font-semibold marker:content-none">
                Thống kê thêm
                <span className="text-muted-foreground transition-transform group-open:rotate-45">+</span>
              </summary>
              <div className="grid grid-cols-3 gap-px border-t bg-border/60">
                {additionalStats.map((stat) => (
                  <div key={stat.label} className="bg-background px-2 py-2.5 text-center">
                    <p className="font-mono text-sm font-bold">{stat.value}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">{stat.label}</p>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getColorByTeam = (team: string | undefined) => {
    switch (team) {
      case 'Vinno':
        return 'text-red-500';
      case 'Americano':
        return 'text-violet-500';
      default:
        return 'text-gray-500';
    }
  }

  const getRankClass = (rank: number) => {
    if (rank === 1) return "bg-amber-400/20 text-amber-700 ring-1 ring-amber-500/25 dark:text-amber-300";
    if (rank === 2) return "bg-slate-400/15 text-slate-700 ring-1 ring-slate-400/25 dark:text-slate-300";
    if (rank === 3) return "bg-orange-500/15 text-orange-700 ring-1 ring-orange-500/25 dark:text-orange-300";
    return "bg-muted text-muted-foreground";
  };

  return (
    <>
      {renderPlayerDialog()}

      {/* Avatar Preview Dialog */}
      <Dialog open={!!selectedAvatar} onOpenChange={(open) => !open && setSelectedAvatar(null)}>
        <DialogContent className="max-h-[88dvh] w-[min(92vw,28rem)] max-w-none overflow-visible border-0 bg-transparent p-0 shadow-none [&>button]:right-2 [&>button]:top-2 [&>button]:rounded-full [&>button]:bg-background/90 [&>button]:p-1 [&>button]:shadow-sm">
          {selectedAvatar && (
            <div className="flex flex-col items-center gap-3">
              <Image
                src={selectedAvatar.src}
                alt={selectedAvatar.name}
                width={440}
                height={560}
                className="max-h-[78dvh] w-auto max-w-full rounded-3xl object-contain shadow-2xl"
                unoptimized
              />
              <p className="text-sm font-semibold text-white drop-shadow-lg">{selectedAvatar.name}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
      <Accordion
        type="multiple"
        // collapsible
        // value={open}
        // onValueChange={setOpen}
        value={openItems}
        onValueChange={(val) => setOpenItems(val as string[])}
        className="px-2 py-1 sm:px-3"
      >
        {managers.map((entry) => {
          const captain = entry.picks?.find((pick) => pick.is_captain);
          const transferCost = entry?.entryHistory?.transferCost;
          const isOpen = openItems.includes(entry.entry.toString());

          return (
            <AccordionItem
              key={entry.entry}
              value={entry.entry.toString()}
              className={`my-2 overflow-hidden rounded-2xl border bg-card px-2 shadow-[0_8px_20px_-20px_hsl(var(--foreground)/0.65)] transition sm:px-2.5 ${isOpen
                ? "border-primary/55 ring-2 ring-primary/10"
                : "border-border/70 hover:border-primary/30 hover:shadow-sm"
                }`}
            >
              <AccordionTrigger className="w-full items-center gap-2 rounded-xl py-2.5 text-xs sm:py-3 sm:text-sm">
                <div className="flex min-w-0 flex-1 flex-col gap-2 text-left">
                  <div className="flex min-w-0 items-center gap-2">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-black sm:h-8 sm:w-8 ${getRankClass(entry.rank)}`}>
                      {entry.rank}
                    </div>

                    {entry.managerAvatar && (
                      <Image
                        src={entry.managerAvatar}
                        alt={entry.manager}
                        width={32}
                        height={32}
                        className="h-7 w-7 shrink-0 cursor-pointer rounded-full object-cover ring-1 ring-border sm:h-8 sm:w-8"
                        unoptimized
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedAvatar({ src: entry.managerAvatar!, name: entry.manager });
                        }}
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold sm:text-sm">{entry.teamName}</p>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="truncate text-[10px] text-muted-foreground sm:text-xs">{entry.manager}</p>
                        {renderActiveChip(entry.activeChip)}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <p className={`truncate text-[10px] font-bold sm:text-xs ${getColorByTeam(entry.team)}`}>{entry.team}</p>
                      <p className="font-mono text-base font-black leading-none text-emerald-700 dark:text-emerald-400 sm:text-lg">{entry.gwPoint}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-muted-foreground sm:text-xs">
                    {captain && (
                      <span className="inline-flex min-w-0 items-center gap-1">
                        <span className="rounded bg-amber-400/20 px-1 py-px text-[9px] font-black text-amber-800 dark:text-amber-300">C</span>
                        <span className="max-w-[7rem] truncate font-medium text-foreground sm:max-w-[10rem]">{captain.elementName}</span>
                      </span>
                    )}
                    <span aria-hidden className="text-muted-foreground/60">·</span>
                    <span className="inline-flex items-center gap-1" title="Cầu thủ đã thi đấu">
                      <UserRoundCheck className="h-3 w-3 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                      <span>{entry.playedInfo ? `${entry.playedInfo.played}/${entry.playedInfo.total}` : "—"}</span>
                      <span className="sr-only">cầu thủ đã thi đấu</span>
                    </span>
                    <span aria-hidden className="text-muted-foreground/60">·</span>
                    <span className="inline-flex items-center gap-1" title="Team value">
                      <CircleDollarSign className="h-3 w-3 text-amber-600 dark:text-amber-400" aria-hidden="true" />
                      <span className="font-medium text-foreground">{entry.entryHistory?.value !== undefined ? `${(entry.entryHistory.value / 10).toFixed(1)}m` : "—"}</span>
                      <span className="sr-only">team value</span>
                    </span>
                  </div>

                  {entry.transfers?.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border bg-muted/25 p-1">
                      {entry.transfers.map((transfer: any, index: number) => (
                        <span key={`${transfer.element_out}-${transfer.element_in}-${index}`} className="flex min-w-0 max-w-full items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[10px] shadow-sm">
                          <span className="truncate line-through text-red-500">{transfer.element_out_name}</span>
                          <span aria-hidden>→</span>
                          <span className="truncate text-emerald-600 dark:text-emerald-400">{transfer.element_in_name}</span>
                        </span>
                      ))}
                      {transferCost > 0 && (
                        <span className="shrink-0 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">−{transferCost} điểm</span>
                      )}
                    </div>
                  )}
                </div>
              </AccordionTrigger>

              <AccordionContent className="px-1 pb-2 pt-2" onClick={(e) => e.stopPropagation()}>
                {entry.picks ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                      <div>
                        <h3 className="text-xs font-bold sm:text-sm">Đội hình xuất phát</h3>
                        <p className="text-[10px] text-muted-foreground">Chạm cầu thủ để xem chi tiết</p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">XI</span>
                    </div>

                    {/* Starters (positions 1-11) */}
                    <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.07] to-transparent p-1.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {entry.picks
                        .filter((p) => p.position <= 11)
                        .sort((a, b) => a.position - b.position)
                        .map((pick) => {
                          const point = (pick?.stats.total_points || 0) * pick.multiplier;
                          const matchExplanations = Array.isArray(pick?.explain) ? pick.explain : [];
                          const allMatchesNotStarted = matchExplanations.length > 0 && matchExplanations.every(
                            (exp: any) => exp.match_status === PlayerMatchStatus.NOT_STARTED
                          );
                          const allMatchesFinished = matchExplanations.length > 0 && matchExplanations.every(
                            (exp: any) => exp.match_status === PlayerMatchStatus.SUBSTITUTE || exp.match_status === PlayerMatchStatus.PLAYED
                          );
                          const isAutoSubIn = pick.isAutoSubIn === true;
                          const isAutoSubOut = !allMatchesNotStarted && allMatchesFinished && (pick?.stats?.minutes ?? 0) === 0;

                          const posBadge = getPositionBadge(pick.element_type ?? 4);

                          return (
                            <div
                              key={pick.position}
                              data-selected={selectedPlayer?.element === pick.element || undefined}
                              className={`fpl-player-card flex cursor-pointer items-center gap-1 rounded-xl border p-1.5 text-xs shadow-sm transition-all duration-150 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] sm:gap-2 sm:p-2 ${selectedPlayer?.element === pick.element ? "border-primary/70 ring-2 ring-primary/25" : ""} ${isAutoSubIn
                                ? "bg-green-100 dark:bg-green-900/50 border-green-400 dark:border-green-600 ring-1 ring-green-300 dark:ring-green-700"
                                : isAutoSubOut
                                  ? "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 ring-1 ring-red-200 dark:ring-red-800"
                                  : "bg-background/85 dark:bg-background/85 border-border/70 hover:border-primary/45"
                                }`}
                              onClick={() => setSelectedPlayer(pick)}
                              title={isAutoSubOut ? "Không được ra sân" : "Click để xem chi tiết"}
                            >
                              <span className={`shrink-0 text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded ${posBadge.className}`}>
                                {posBadge.label}
                              </span>
                              <span className={`flex-1 truncate text-[11px] sm:text-xs font-medium ${isAutoSubOut ? 'text-red-500 dark:text-red-400' : 'text-black dark:text-white'}`}>
                                {isAutoSubIn && <span className="text-green-600 mr-0.5" title="Auto Sub In">⬆️</span>}
                                {isAutoSubOut && <span className="text-red-500 mr-0.5" title="Không ra sân">⬇️</span>}
                                {pick.elementName}&nbsp;
                                {pick.is_captain && <span className="text-yellow-600 font-bold">(C)</span>}
                                {pick.is_vice_captain && <span className="text-muted-foreground">(VC)</span>}
                              </span>
                              <span className={`font-mono font-bold text-xs sm:text-sm ${allMatchesNotStarted ? 'text-orange-500' : point >= 0 ? 'text-green-700' : 'text-red-500'}`}>
                                {allMatchesNotStarted ? <>--</> : point}
                              </span>
                            </div>
                          )
                        })}
                    </div>

                    <div className="flex items-center justify-between px-1 pt-0.5">
                      <div>
                        <h3 className="text-xs font-bold sm:text-sm">Dự bị</h3>
                        <p className="text-[10px] text-muted-foreground">Điểm không nhân hệ số</p>
                      </div>
                      <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground">Bench</span>
                    </div>

                    {/* Bench (positions 12-15) */}
                    <div className="grid grid-cols-2 gap-1.5 rounded-2xl border bg-muted/20 p-1.5 sm:grid-cols-4">
                      {entry.picks
                        .filter((p) => p.position > 11)
                        .sort((a, b) => a.position - b.position)
                        .map((pick) => {
                          const point = pick?.stats.total_points || 0;
                          const matchExplanations = Array.isArray(pick?.explain) ? pick.explain : [];
                          const allMatchesNotStarted = matchExplanations.length > 0 && matchExplanations.every(
                            (exp: any) => exp.match_status === PlayerMatchStatus.NOT_STARTED
                          );
                          const isAutoSubIn = pick.isAutoSubIn === true;
                          const posBadge = getPositionBadge(pick.element_type ?? 4);

                          return (
                            <div
                              key={pick.position}
                              data-selected={selectedPlayer?.element === pick.element || undefined}
                              className={`fpl-player-card flex cursor-pointer items-center gap-1 rounded-xl border p-1 text-xs transition-all duration-150 active:scale-[0.98] sm:p-1.5 ${selectedPlayer?.element === pick.element ? "border-primary/70 ring-2 ring-primary/25" : ""} ${isAutoSubIn
                                ? "bg-green-100 dark:bg-green-900/50 border-green-400 dark:border-green-600 ring-1 ring-green-300 dark:ring-green-700"
                                : "border-border/70 bg-background/70 hover:border-primary/40 hover:bg-background"
                                }`}
                              onClick={() => setSelectedPlayer(pick)}
                              title={isAutoSubIn ? "Auto Substituted In" : "Click để xem chi tiết"}
                            >
                              <span className={`shrink-0 text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded ${posBadge.className}`}>
                                {posBadge.label}
                              </span>
                              <span className={`flex-1 truncate text-[10px] sm:text-[11px] ${isAutoSubIn ? 'text-green-700 dark:text-green-300 font-medium' : 'text-gray-700 dark:text-gray-300 font-medium'}`}>
                                {isAutoSubIn && <span className="text-green-600 mr-0.5" title="Auto Sub">⬆️</span>}
                                {pick.elementName}
                              </span>
                              <span className={`font-mono text-[10px] sm:text-xs ${isAutoSubIn ? 'text-green-700 dark:text-green-300 font-bold' : allMatchesNotStarted ? 'text-orange-500 font-bold' : 'text-gray-600 dark:text-gray-400 font-bold'}`}>
                                {allMatchesNotStarted ? <>--</> : point}
                              </span>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">Không có dữ liệu đội hình</div>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion >
    </>
  );
};
