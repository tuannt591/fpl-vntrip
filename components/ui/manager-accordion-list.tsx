import { useState, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import Image from "next/image";
import { ArrowDown, ArrowRight, ArrowUp, CircleDollarSign, List, Map, Shuffle, Sparkles, UserRoundCheck } from "lucide-react";
import { LeaderboardEntry, PickWithLive, PlayerMatchStatus } from "@/types/fantasy";

interface ManagerAccordionListProps {
  managers: LeaderboardEntry[];
}

type SquadView = "list" | "pitch";

const PLAYER_PHOTO_BASE_URL = "https://resources.premierleague.com/premierleague25/photos/players/500x500";
const PLAYER_AVATAR_SIZES = "(max-width: 399px) 48px, (max-width: 639px) 64px, (max-width: 767px) 80px, (max-width: 1023px) 96px, 112px";

type PitchRowLayout = {
  elementType: number;
  insetClassName: string;
};

// The pitch is a four-row grid. Each role owns one flex row, so spacing can be
// adjusted per row without calculating absolute coordinates for every player.
const PITCH_ROW_LAYOUTS: PitchRowLayout[] = [
  {
    elementType: 1,
    insetClassName: "mx-[35%]",
  },
  {
    elementType: 2,
    insetClassName: "mx-[6%] sm:mx-[12%]",
  },
  {
    elementType: 3,
    insetClassName: "mx-[2%] sm:mx-[5%]",
  },
  {
    elementType: 4,
    insetClassName: "mx-[6%] sm:mx-[10%]",
  },
];

function getPitchRowGridClass(playerCount: number) {
  if (playerCount === 1) return "grid-cols-1";
  if (playerCount === 2) return "grid-cols-2 gap-x-[clamp(2.5rem,14vw,10rem)]";
  if (playerCount === 3) return "grid-cols-3 gap-x-[clamp(0.5rem,2vw,1.5rem)]";
  if (playerCount === 4) return "grid-cols-4 gap-x-[clamp(0.375rem,1.5vw,1.25rem)]";
  return "grid-cols-5 gap-x-[clamp(0.25rem,1.25vw,1rem)]";
}

// Module-level cache: tracks avatar URLs that have already been successfully
// loaded during this session. When PlayerAvatar remounts (e.g. accordion
// toggle), it can skip the fade-in animation and show the image immediately.
const loadedAvatarCache = new Set<string>();
const errorAvatarCache = new Set<string>();

function PlayerAvatar({
  avatar,
  name,
  className,
  sizes: sizesProp,
}: {
  avatar?: string;
  name?: string;
  className?: string;
  sizes?: string;
}) {
  const sizes = sizesProp ?? PLAYER_AVATAR_SIZES;
  const src = avatar ? `${PLAYER_PHOTO_BASE_URL}/${avatar}` : null;
  const alreadyLoaded = src ? loadedAvatarCache.has(src) : false;
  const alreadyErrored = src ? errorAvatarCache.has(src) : false;

  const [hasImageError, setHasImageError] = useState(alreadyErrored);
  const [isLoaded, setIsLoaded] = useState(alreadyLoaded);

  const handleLoad = useCallback(() => {
    if (src) loadedAvatarCache.add(src);
    setIsLoaded(true);
  }, [src]);

  const handleError = useCallback(() => {
    if (src) errorAvatarCache.add(src);
    setHasImageError(true);
  }, [src]);

  return (
    <span className={`relative block ${className ?? ""}`}>
      <Image
        src="/placeholder.png"
        alt=""
        fill
        sizes={sizes}
        className={`object-cover object-bottom transition-opacity duration-200 ${src && isLoaded && !hasImageError ? "opacity-0" : "opacity-100"}`}
        aria-hidden="true"
      />
      {src && !hasImageError && (
        <Image
          src={src}
          alt={name ? `Ảnh ${name}` : ""}
          fill
          sizes={sizes}
          className={`object-cover object-bottom transition-opacity duration-200 ${isLoaded ? "opacity-100" : "opacity-0"}`}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </span>
  );
}

export const ManagerAccordionList = ({
  managers,
}: ManagerAccordionListProps) => {
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useState<{ src: string; name: string } | null>(null);
  const [squadViews, setSquadViews] = useState<Record<string, SquadView>>({});
  const CHIP_CONFIG: Record<string, { label: string; className: string }> = {
    wildcard: {
      label: "Wildcard",
      className: "border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300",
    },
    freehit: {
      label: "Free Hit",
      className: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    },
    bboost: {
      label: "Bench Boost",
      className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    },
    '3xc': {
      label: "Triple Captain",
      className: "border-amber-500/35 bg-amber-500/10 text-amber-800 dark:text-amber-300",
    },
  };

  function renderActiveChip(active_chip?: string | null) {
    if (!active_chip) return null;
    const chip = CHIP_CONFIG[active_chip];
    if (!chip) return null;
    return (
      <Badge
        variant="outline"
        aria-label={`Chip đang kích hoạt: ${chip.label}`}
        title={`Chip đang kích hoạt: ${chip.label}`}
        className={`h-5 shrink-0 gap-1 whitespace-nowrap px-1.5 text-[10px] font-semibold leading-none shadow-none ${chip.className}`}
      >
        <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
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

  function hasOnlyUpcomingFixtures(pick: PickWithLive) {
    const matches = Array.isArray(pick.explain) ? pick.explain : [];
    return matches.length > 0 && matches.every(
      (match: any) => match.match_status === PlayerMatchStatus.NOT_STARTED,
    );
  }

  function getFormation(starters: PickWithLive[]) {
    const count = (elementType: number) => starters.filter(
      (pick) => (pick.element_type ?? 4) === elementType,
    ).length;
    return `${count(2)}-${count(3)}-${count(4)}`;
  }

  function getShortName(name?: string) {
    if (!name) return "Không rõ";
    const words = name.trim().split(/\s+/);
    return words.length > 1 ? words[words.length - 1] : name;
  }

  function renderPitchPlayer(pick: PickWithLive) {
    const isUpcoming = hasOnlyUpcomingFixtures(pick);
    const isAutoSubOut = pick.isAutoSubOut === true;
    const points = (pick.stats?.total_points ?? 0) * pick.multiplier;

    return (
      <button
        key={pick.position}
        type="button"
        data-selected={selectedPlayer?.element === pick.element || undefined}
        onClick={() => setSelectedPlayer(pick)}
        title={`${pick.elementName ?? "Cầu thủ"} — chạm để xem chi tiết`}
        className={`fpl-pitch-player relative z-10 flex w-full flex-col items-center outline-none transition-transform duration-150 hover:z-20 hover:scale-105 focus-visible:z-20 focus-visible:scale-105 focus-visible:ring-2 focus-visible:ring-primary/80 ${isAutoSubOut ? "opacity-60" : ""}`}
      >
        <span className="relative flex h-12 w-12 items-center justify-center md:h-12 md:w-12 lg:h-14 lg:w-14">
          <span className={`h-full w-full overflow-hidden rounded-full border-1 bg-background shadow-md ${isAutoSubOut ? "border-rose-400" : "border-background/95"}`}>
            <PlayerAvatar
              avatar={pick.avatar}
              name={pick.elementName}
              className="h-full w-full"
            />
          </span>
          {pick.is_captain && <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-amber-400 text-[9px] font-black text-amber-950 md:h-[18px] md:w-[18px] md:text-[10px]">C</span>}
          {!pick.is_captain && pick.is_vice_captain && <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-background bg-sky-500 text-[8px] font-black text-white md:h-[18px] md:w-[18px] md:text-[9px]">V</span>}
          {isAutoSubOut && <span className="absolute -left-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-background bg-rose-500 text-white md:h-4 md:w-4"><ArrowDown className="h-2.5 w-2.5 md:h-3 md:w-3" /></span>}
        </span>
        <span className={`flex w-full max-w-[70px] flex-col items-center justify-center gap-0 rounded-md border px-1 py-px text-[10px] font-bold leading-[1.25] shadow-sm backdrop-blur sm:max-w-[82px] sm:px-1.5 sm:py-1 md:max-w-[106px] md:px-2 md:py-1.5 md:text-[11px] lg:max-w-[124px] lg:px-2.5 lg:py-2 lg:text-xs ${isAutoSubOut ? "border-rose-300 bg-rose-50/95 text-rose-700 dark:border-rose-700 dark:bg-rose-950/95 dark:text-rose-200" : "border-background/70 bg-background/95 text-foreground"}`}>
          <span className="min-w-0 w-full truncate text-center">{getShortName(pick.elementName)}</span>
          <span className={`shrink-0 font-mono leading-none ${isUpcoming ? "text-amber-600 dark:text-amber-400" : points >= 0 ? "text-emerald-700 dark:text-emerald-400" : "text-rose-600"}`}>
            {isUpcoming ? "--" : points}
          </span>
        </span>
      </button>
    );
  }

  function renderPitchView(entry: LeaderboardEntry) {
    const starters = entry.picks
      .filter((pick) => pick.position <= 11)
      .sort((a, b) => a.position - b.position);
    const bench = entry.picks
      .filter((pick) => pick.position > 11)
      .sort((a, b) => a.position - b.position);
    return (
      <section aria-label={`Sơ đồ sân đấu của ${entry.teamName}`} className="space-y-3">
        <div className="overflow-hidden rounded-2xl border border-emerald-950/20 bg-emerald-950 shadow-inner">
          <div className="relative aspect-[1417/788] min-h-[340px] w-full overflow-hidden sm:min-h-[360px]">
            <Image
              src="/pitch-graphic.svg"
              alt="Sân bóng"
              fill
              sizes="(max-width: 640px) 100vw, 720px"
              className="object-cover"
              priority={false}
            />
            <div className="absolute inset-x-2 top-5 z-20 flex items-center justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-white/80 sm:inset-x-4 sm:top-3 sm:text-[10px]">
              <span className="rounded-full bg-black/20 px-1.5 py-0.5 backdrop-blur">Sơ đồ {getFormation(starters)}</span>
            </div>
            <div className="absolute inset-x-[3%] bottom-[5%] top-[5%] z-10 grid grid-rows-4 gap-4">
              {PITCH_ROW_LAYOUTS.map((row) => {
                const players = starters.filter(
                  (pick) => (pick.element_type ?? 4) === row.elementType,
                );
                const rowInset = players.length >= 5 ? "mx-0" : row.insetClassName;

                return (
                  <div
                    key={row.elementType}
                    className={`grid min-w-0 place-items-center ${getPitchRowGridClass(players.length)} ${rowInset}`}
                  >
                    {players.map((pick) => renderPitchPlayer(pick))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border-t border-white/25 bg-emerald-950/85 px-2 pb-2 pt-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:px-3 sm:pb-3">
            <div className="mb-1.5 flex items-center justify-between px-0.5 text-white/90 sm:mb-2">
              <div className="flex items-baseline gap-2">
                <h4 className="text-[10px] font-black uppercase tracking-[0.12em] sm:text-[11px]">Dự bị</h4>
                <p className="hidden text-[9px] text-white/60 sm:block">Điểm không nhân hệ số</p>
              </div>
              <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-wide text-white/75">Bench</span>
            </div>
            <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
              {bench.map((pick) => {
                const isUpcoming = hasOnlyUpcomingFixtures(pick);
                const isAutoSubIn = pick.isAutoSubIn === true;
                const points = pick.stats?.total_points ?? 0;
                const position = getPositionBadge(pick.element_type ?? 4);
                return (
                  <button
                    key={pick.position}
                    type="button"
                    data-selected={selectedPlayer?.element === pick.element || undefined}
                    onClick={() => setSelectedPlayer(pick)}
                    title={`${pick.elementName ?? "Cầu thủ"} — chạm để xem chi tiết`}
                    className={`fpl-player-card group flex min-w-0 flex-col items-center rounded-lg border p-1 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 sm:rounded-xl sm:p-1.5 ${isAutoSubIn ? "border-emerald-300 bg-emerald-400/20" : "border-white/25 bg-emerald-900/45"}`}
                  >
                    <span className="relative h-12 w-12 shrink-0 md:h-12 md:w-12">
                      <span className="block h-full w-full overflow-hidden rounded-full border-1 border-background/90 bg-muted shadow-sm">
                        <PlayerAvatar avatar={pick.avatar} name={pick.elementName} className="h-full w-full" />
                      </span>
                    <span className={`absolute -bottom-1 -right-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full border border-emerald-950 px-0.5 text-[7px] font-black text-white ${position.className}`}>{position.label}</span>
                    </span>
                    <span className="flex w-full min-w-0 flex-col items-center rounded-md bg-background/95 px-0.5 py-0.5 text-[10px] font-bold leading-none text-foreground md:text-[11px] lg:text-xs">
                      <span className="w-full truncate">{getShortName(pick.elementName)}</span>
                      <span className={`mt-0.5 flex items-center gap-0.5 font-mono ${isUpcoming ? "text-amber-600 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}`}>
                        {isAutoSubIn && <ArrowUp className="h-2 w-2" />}
                        {isUpcoming ? "--" : points}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    );
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
        <DialogContent
          bottomSheet
          overlayClassName="!bg-black/35 backdrop-blur-sm"
          onMobileSwipeDown={() => setSelectedPlayer(null)}
          className="fpl-player-detail-dialog flex flex-col left-0 right-0 top-auto bottom-0 max-h-[88dvh] max-w-none translate-x-0 translate-y-0 gap-0 overflow-y-auto rounded-t-[1.5rem] border-x-0 border-b-0 bg-popover/95 p-0 shadow-2xl backdrop-blur-xl max-sm:data-[state=closed]:![--tw-exit-scale:1] max-sm:data-[state=closed]:![--tw-exit-translate-x:0] max-sm:data-[state=closed]:![--tw-exit-translate-y:100%] max-sm:data-[state=open]:![--tw-enter-scale:1] max-sm:data-[state=open]:![--tw-enter-translate-x:0] max-sm:data-[state=open]:![--tw-enter-translate-y:100%] [&>button]:right-3 [&>button]:top-3 [&>button]:z-10 [&>button]:rounded-full [&>button]:bg-background/85 [&>button]:p-1 [&>button]:shadow-sm sm:bottom-auto sm:left-[50%] sm:right-auto sm:top-[50%] sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-3xl sm:border sm:bg-background sm:backdrop-blur-none sm:[&>button]:right-4 sm:[&>button]:top-4 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95"
        >
          <div
            aria-hidden="true"
            data-bottom-sheet-drag-handle
            className="absolute inset-x-0 top-0 z-10 flex h-10 touch-none items-center justify-center sm:hidden"
          >
            <span className="bottom-sheet-drag-indicator" />
          </div>

          <section className="fpl-player-detail-hero relative shrink-0 overflow-hidden border-b bg-gradient-to-br from-primary/15 via-primary/[0.06] to-transparent px-4 pb-4 pt-5 sm:min-h-[134px] sm:px-6 sm:py-6">
            <div className="absolute -right-10 -top-14 h-36 w-36 rounded-full bg-primary/10 blur-2xl" />
            <div className="relative grid grid-cols-[112px_minmax(0,1fr)] gap-x-3 gap-y-3 sm:grid-cols-[128px_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:pr-10">
              <button
                type="button"
                onClick={() => setSelectedAvatar({
                  src: avatar
                    ? `${PLAYER_PHOTO_BASE_URL}/${avatar}`
                    : "/placeholder.png",
                  name: elementName,
                })}
                className="relative h-[140px] w-28 overflow-hidden rounded-2xl border border-background/80 bg-background/70 shadow-sm transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:h-[160px] sm:w-32"
                aria-label={`Phóng to ảnh ${elementName}`}
                title="Phóng to ảnh"
              >
                <PlayerAvatar
                  avatar={avatar}
                  name={elementName}
                  className="h-full w-full"
                  sizes="(max-width: 639px) 112px, 128px"
                />
              </button>

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
              <div className="relative aspect-[110/140] w-[min(92vw,28rem)] max-h-[78dvh] overflow-hidden rounded-3xl bg-black/20 shadow-2xl">
                <Image
                  src={selectedAvatar.src}
                  alt={selectedAvatar.name}
                  fill
                  sizes="(max-width: 640px) 92vw, 440px"
                  className="object-contain"
                  onError={() => setSelectedAvatar((current) => current
                    ? { ...current, src: "/placeholder.png" }
                    : current)}
                  priority
                />
              </div>
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
          const autoSubstitutions = entry.picks
            .filter((pick) => pick.isAutoSubOut)
            .map((outPlayer) => ({
              outPlayer,
              inPlayer: entry.picks.find(
                (pick) => pick.element === outPlayer.autoSubPartnerElement,
              ),
            }));
          const squadView = squadViews[entry.entry] ?? "list";

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
                        sizes="32px"
                        className="h-7 w-7 shrink-0 cursor-pointer rounded-full object-cover ring-1 ring-border sm:h-8 sm:w-8"
                        onClick={(event) => {
                          event.stopPropagation();
                          setSelectedAvatar({ src: entry.managerAvatar!, name: entry.manager });
                        }}
                      />
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold sm:text-sm">{entry.teamName}</p>
                      <div className="flex min-w-0 items-center gap-1.5">
                        <p className="min-w-0 flex-1 truncate text-[10px] text-muted-foreground sm:text-xs">{entry.manager}</p>
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
                    <div className="flex items-start justify-between gap-3 px-1 max-[399px]:flex-col max-[399px]:items-stretch max-[399px]:gap-2">
                      <div>
                        <h3 className="text-xs font-bold sm:text-sm">Đội hình xuất phát</h3>
                        <p className="text-[10px] text-muted-foreground">Chạm cầu thủ để xem chi tiết</p>
                      </div>
                      <div className="relative grid shrink-0 grid-cols-2 rounded-lg border bg-muted/45 p-0.5 max-[399px]:self-end" role="tablist" aria-label="Chọn cách hiển thị đội hình">
                        <span
                          aria-hidden
                          className="pointer-events-none absolute bottom-0.5 left-0.5 top-0.5 rounded-md bg-background shadow-sm transition-transform duration-300 ease-out motion-reduce:transition-none"
                          style={{
                            width: "calc((100% - 0.25rem) / 2)",
                            transform: `translateX(${squadView === "pitch" ? 100 : 0}%)`,
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => setSquadViews((views) => ({ ...views, [entry.entry]: "list" }))}
                          role="tab"
                          aria-selected={squadView === "list"}
                          className={`relative z-10 inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-[10px] font-semibold transition-colors duration-200 motion-reduce:transition-none sm:text-xs ${squadView === "list" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          <List className="h-3.5 w-3.5" aria-hidden="true" />
                          Danh sách
                        </button>
                        <button
                          type="button"
                          onClick={() => setSquadViews((views) => ({ ...views, [entry.entry]: "pitch" }))}
                          role="tab"
                          aria-selected={squadView === "pitch"}
                          className={`relative z-10 inline-flex h-7 items-center justify-center gap-1 rounded-md px-2 text-[10px] font-semibold transition-colors duration-200 motion-reduce:transition-none sm:text-xs ${squadView === "pitch" ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                        >
                          <Map className="h-3.5 w-3.5" aria-hidden="true" />
                          Sân đấu
                        </button>
                      </div>
                    </div>

                    {autoSubstitutions.length > 0 && (
                      <section
                        aria-label="Các lượt thay người tự động"
                        className="rounded-xl border border-sky-500/25 bg-sky-500/[0.06] p-2 sm:p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sky-500/12 text-sky-700 dark:text-sky-300">
                              <Shuffle className="h-3.5 w-3.5" aria-hidden="true" />
                            </span>
                            <div className="min-w-0">
                              <h4 className="text-[11px] font-bold text-foreground sm:text-xs">Thay người tự động</h4>
                              <p className="text-[10px] text-muted-foreground">Cầu thủ dự bị được tính điểm thay cho người không ra sân</p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-full bg-sky-500/10 px-1.5 py-0.5 text-[9px] font-bold text-sky-700 dark:text-sky-300">
                            {autoSubstitutions.length} lượt
                          </span>
                        </div>

                        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                          {autoSubstitutions.map(({ outPlayer, inPlayer }) => (
                            <div
                              key={outPlayer.element}
                              className="flex min-w-0 items-center gap-1.5 rounded-lg border border-sky-500/15 bg-background/70 px-2 py-1.5 text-[10px] shadow-sm"
                            >
                              <span className="flex min-w-0 flex-1 items-center gap-1 text-rose-600 dark:text-rose-400">
                                <ArrowDown className="h-3 w-3 shrink-0" aria-hidden="true" />
                                <span className="truncate font-semibold">{outPlayer.elementName}</span>
                              </span>
                              <ArrowRight className="h-3 w-3 shrink-0 text-sky-600 dark:text-sky-300" aria-hidden="true" />
                              <span className="flex min-w-0 flex-1 items-center gap-1 text-emerald-700 dark:text-emerald-300">
                                <ArrowUp className="h-3 w-3 shrink-0" aria-hidden="true" />
                                <span className="truncate font-semibold">{inPlayer?.elementName ?? "—"}</span>
                              </span>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {squadView === "pitch" ? renderPitchView(entry) : <>
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
                            const isAutoSubOut = pick.isAutoSubOut === true;

                            const posBadge = getPositionBadge(pick.element_type ?? 4);

                            return (
                              <div
                                key={pick.position}
                                data-selected={selectedPlayer?.element === pick.element || undefined}
                                className={`fpl-player-card flex cursor-pointer items-center gap-1 rounded-xl border p-1.5 text-xs shadow-sm transition-all duration-150 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] sm:gap-2 sm:p-2 ${selectedPlayer?.element === pick.element ? "border-primary/70 ring-2 ring-primary/25" : ""} ${isAutoSubOut
                                  ? "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 ring-1 ring-red-200 dark:ring-red-800"
                                  : "bg-background/85 dark:bg-background/85 border-border/70 hover:border-primary/45"
                                  }`}
                                onClick={() => setSelectedPlayer(pick)}
                                title={isAutoSubOut ? "Đã được thay ra tự động" : "Click để xem chi tiết"}
                              >
                                <span className={`shrink-0 text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded ${posBadge.className}`}>
                                  {posBadge.label}
                                </span>
                                <span className={`flex-1 truncate text-[11px] sm:text-xs font-medium ${isAutoSubOut ? 'text-red-500 dark:text-red-400' : 'text-black dark:text-white'}`}>
                                  {isAutoSubOut && <ArrowDown className="mr-0.5 inline h-3 w-3 align-[-1px] text-rose-500" aria-label="Đã được thay ra tự động" />}
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
                                title={isAutoSubIn ? "Đã được thay vào tự động" : "Click để xem chi tiết"}
                              >
                                <span className={`shrink-0 text-[9px] sm:text-[10px] font-bold px-1 py-0.5 rounded ${posBadge.className}`}>
                                  {posBadge.label}
                                </span>
                                <span className={`flex-1 truncate text-[10px] sm:text-[11px] ${isAutoSubIn ? 'text-green-700 dark:text-green-300 font-medium' : 'text-gray-700 dark:text-gray-300 font-medium'}`}>
                                  {isAutoSubIn && <ArrowUp className="mr-0.5 inline h-3 w-3 align-[-1px] text-emerald-600 dark:text-emerald-400" aria-label="Đã được thay vào tự động" />}
                                  {pick.elementName}
                                </span>
                                <span className={`font-mono text-[10px] sm:text-xs ${isAutoSubIn ? 'text-green-700 dark:text-green-300 font-bold' : allMatchesNotStarted ? 'text-orange-500 font-bold' : 'text-gray-600 dark:text-gray-400 font-bold'}`}>
                                  {allMatchesNotStarted ? <>--</> : point}
                                </span>
                              </div>
                            )
                          })}
                      </div>
                    </>}
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
