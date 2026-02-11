import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Image from "next/image";
import { LeaderboardEntry, PlayerMatchStatus } from "@/types/fantasy";

interface ManagerAccordionListProps {
  managers: LeaderboardEntry[];
}

export const ManagerAccordionList = ({
  managers,
}: ManagerAccordionListProps) => {
  const [selectedPlayer, setSelectedPlayer] = useState<any | null>(null);
  const [openItems, setOpenItems] = useState<string[]>([]);

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

  // Hàm render dialog chi tiết player
  function renderPlayerDialog() {
    if (!selectedPlayer) return null;
    const { elementName, stats, multiplier, is_captain, is_vice_captain, position, clubName, element_type, avatar } = selectedPlayer;

    // Icon cho từng chỉ số
    const statIcons: Record<string, string> = {
      total_points: "⭐",
      minutes: "⏱️",
      goals_scored: "⚽",
      assists: "🅰️",
      bonus: "🎁",
      yellow_cards: "🟨",
      red_cards: "🟥",
      clean_sheets: "🧤",
      saves: "🛡️",
      own_goals: "🥅",
    };

    // Danh sách chỉ số hiển thị
    const statList = [
      { key: "total_points", label: "Điểm", value: position > 11 ? (stats.total_points || 0) : (stats.total_points || 0) * multiplier },
      { key: "minutes", label: "Phút thi đấu", value: stats.minutes ?? "-" },
      { key: "goals_scored", label: "Bàn thắng", value: stats.goals_scored ?? 0 },
      { key: "assists", label: "Kiến tạo", value: stats.assists ?? 0 },
      { key: "bonus", label: "Bonus", value: stats.bonus ?? 0 },
      { key: "yellow_cards", label: "Thẻ vàng", value: stats.yellow_cards ?? 0 },
      { key: "red_cards", label: "Thẻ đỏ", value: stats.red_cards ?? 0 },
      { key: "clean_sheets", label: "Sạch lưới", value: stats.clean_sheets ?? 0 },
      { key: "saves", label: "Cản phá", value: stats.saves ?? 0 },
      { key: "own_goals", label: "Phản lưới", value: stats.own_goals ?? 0 },
    ];

    return (
      <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
        <DialogContent className="dark:bg-gray-900 bg-white max-w-lg rounded-xl shadow-2xl border-2 border-blue-200 dark:border-blue-900 p-2">
          <div className="flex flex-col gap-1 items-center justify-center">
            <div>
              {avatar ? (
                <Image
                  src={`https://resources.premierleague.com/premierleague25/photos/players/110x140/${avatar}`}
                  alt={elementName}
                  width={80}
                  height={100}
                  className="w-[5rem] h-auto"
                  unoptimized // Nếu ảnh ngoài domain Next.js, dùng unoptimized hoặc cấu hình domains trong next.config.js
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-blue-400 to-green-400 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
                  {elementName?.charAt(0)}
                </div>
              )}
            </div>

            <div className="text-xl font-extrabold text-blue-700 dark:text-blue-200">
              {elementName}
            </div>

            <div className="text-xs text-muted-foreground">{clubName || ""}</div>

            <div className="flex gap-2">
              <span className="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 text-xs font-semibold">
                {getElementType(element_type)}
              </span>
              {is_captain && (
                <span className="px-2 py-1 rounded bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-200 text-xs font-semibold">
                  Captain
                </span>
              )}
              {is_vice_captain && (
                <span className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 text-xs font-semibold">
                  Vice Captain
                </span>
              )}
              <span className="px-2 py-1 rounded bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-200 text-xs font-semibold">
                x{multiplier}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-5 gap-2">
            {statList.map(stat => (
              <div
                key={stat.key}
                className="flex flex-col items-center bg-gray-50 dark:bg-gray-800 rounded-lg py-2 shadow-sm hover:scale-105 transition-transform"
              >
                <span className="text-xs">{statIcons[stat.key]}</span>
                <span className="font-bold text-base text-blue-700 dark:text-blue-200">{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getColorByTeam = (team: string | undefined) => {
    switch (team) {
      case '87':
        return 'text-red-500';
      case '89':
        return 'text-violet-500';
      case '3T':
        return 'text-amber-500';
      default:
        return 'text-gray-500';
    }
  }

  return (
    <>
      {renderPlayerDialog()}
      <Accordion
        type="multiple"
        // collapsible
        // value={open}
        // onValueChange={setOpen}
        value={openItems}
        onValueChange={(val) => setOpenItems(val as string[])}
      >
        {managers.map((entry) => {
          const captain = entry?.picks.find(p => p.is_captain);
          const viceCaptain = entry?.picks.find(p => p.is_vice_captain);
          const transferCost = entry?.entryHistory?.transferCost;
          const isOpen = openItems.includes(entry.entry.toString());

          return (
            <AccordionItem key={entry.entry} value={entry.entry.toString()} className={`border-2 my-2 px-2 bg-gray-100 dark:bg-gray-800 ${isOpen
              ? "border-blue-500 dark:border-blue-400"
              : "border-transparent"
              }`}>
              <AccordionTrigger className="flex py-2 sm:py-3 items-baseline rounded cursor-pointer text-xs sm:text-sm gap-1 sm:gap-2 w-full">
                {/* ---------------------rank----------------------- */}
                <div className="w-6 sm:w-10 text-center">
                  <p>{entry.rank}</p>
                </div>

                {/* ---------------------team----------------------- */}
                <div className={`w-8 sm:w-10 text-center ${getColorByTeam(entry.team)}`}>
                  <p className="text-xs sm:text-sm">{entry.team}</p>
                  <p className="text-[10px] sm:text-xs hidden sm:block">Team</p>
                </div>

                {/* ---------------------manager----------------------- */}
                <div className="flex-1 min-w-0 text-left px-1 sm:px-2">
                  <p className="truncate text-xs sm:text-sm">{entry.teamName}</p>
                  <p className="text-muted-foreground truncate text-[10px] sm:text-xs">
                    {entry.manager}
                  </p>
                </div>

                {/* ---------------------Captain----------------------- */}
                <div className="w-14 sm:w-[5rem] md:w-[6rem] text-center">
                  {captain && <p className="truncate text-[10px] sm:text-xs">{captain?.elementName}</p>}
                  {viceCaptain && <p className="text-muted-foreground text-[9px] sm:text-[10px] truncate">{viceCaptain?.elementName}</p>}
                </div>

                {/* ---------------------GW----------------------- */}
                <div className="w-10 sm:w-12 text-center">
                  <p className="font-semibold text-green-700 text-base sm:text-lg">{entry.gwPoint}</p>
                  {transferCost ? <p className="text-[10px] sm:text-xs font-medium text-red-500">(-{transferCost})</p> : null}
                </div>

              </AccordionTrigger>

              {/* ---------------------detail info (clickable to toggle)----------------------- */}
              <div
                className="flex items-center flex-wrap px-1 py-0.5 gap-1 border-t dark:border-gray-700 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                onClick={() => {
                  if (isOpen) {
                    setOpenItems(openItems.filter(id => id !== entry.entry.toString()));
                  } else {
                    setOpenItems([...openItems, entry.entry.toString()]);
                  }
                }}
              >
                {/* Hiển thị tiền bank nếu có */}
                {entry.entryHistory?.bank !== undefined && (
                  <span className="text-[10px]">
                    💰{(entry.entryHistory.value / 10).toFixed(1)}m
                  </span>
                )}

                {/* Hiển thị chip nếu có */}
                {renderActiveChip(entry.activeChip)}

                {/* Hiển thị played */}
                {entry.playedInfo && (
                  <span className="bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full text-[10px]">
                    <span className="font-bold">Played&nbsp;</span>
                    {entry.playedInfo.played}/{entry.playedInfo.total}
                  </span>
                )}

                {/* Hiển thị transfer nếu có */}
                {entry?.transfers && entry?.transfers.length > 0 && (
                  <div className="flex flex-wrap gap-0.5 items-center text-[10px]">
                    {entry.transfers.map((t: any, idx: number) => (
                      <span key={idx} className="flex items-center gap-0.5 bg-gray-200 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                        <span className="line-through text-red-500">{t.element_out_name}</span>
                        <span>→</span>
                        <span className="text-green-600">{t.element_in_name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <AccordionContent className="py-2" onClick={(e) => e.stopPropagation()}>
                {entry.picks ? (
                  <div className="space-y-2">
                    {/* Starters (positions 1-11) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1">
                      {entry.picks
                        .filter((p) => p.position <= 11)
                        .sort((a, b) => a.position - b.position)
                        .map((pick) => {
                          const point = (pick?.stats.total_points || 0) * pick.multiplier;
                          const allMatchesNotStarted = pick?.explain.every(
                            (exp: any) => exp.match_status === PlayerMatchStatus.NOT_STARTED
                          );
                          const allMatchesFinished = pick?.explain.every(
                            (exp: any) => exp.match_status === PlayerMatchStatus.SUBSTITUTE || exp.match_status === PlayerMatchStatus.PLAYED
                          );
                          const isAutoSubIn = pick.isAutoSubIn === true;
                          const isAutoSubOut = !allMatchesNotStarted && allMatchesFinished && (pick?.stats?.minutes ?? 0) === 0;

                          const posBadge = getPositionBadge(pick.element_type ?? 4);

                          return (
                            <div
                              key={pick.position}
                              className={`cursor-pointer p-1.5 sm:p-2 flex items-center gap-1 sm:gap-2 text-xs rounded-md border shadow-sm transition-all duration-150 hover:scale-[1.02] hover:shadow-md active:scale-[0.98] ${isAutoSubIn
                                  ? "bg-green-100 dark:bg-green-900/50 border-green-400 dark:border-green-600 ring-1 ring-green-300 dark:ring-green-700"
                                  : isAutoSubOut
                                    ? "bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700 ring-1 ring-red-200 dark:ring-red-800"
                                    : "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600"
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

                    {/* Separator */}
                    <div className="flex items-center gap-2 px-1">
                      <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Bench</span>
                      <div className="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
                    </div>

                    {/* Bench (positions 12-15) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                      {entry.picks
                        .filter((p) => p.position > 11)
                        .sort((a, b) => a.position - b.position)
                        .map((pick) => {
                          const point = pick?.stats.total_points || 0;
                          const allMatchesNotStarted = pick?.explain.every(
                            (exp: any) => exp.match_status === PlayerMatchStatus.NOT_STARTED
                          );
                          const isAutoSubIn = pick.isAutoSubIn === true;
                          const posBadge = getPositionBadge(pick.element_type ?? 4);

                          return (
                            <div
                              key={pick.position}
                              className={`cursor-pointer p-1 sm:p-1.5 flex items-center gap-1 text-xs rounded border transition-all duration-150 active:scale-[0.98] ${isAutoSubIn
                                ? "bg-green-100 dark:bg-green-900/50 border-green-400 dark:border-green-600 ring-1 ring-green-300 dark:ring-green-700"
                                : "border border-gray-300 dark:border-gray-500 bg-gray-100 dark:bg-gray-800/80 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gray-50 dark:hover:bg-gray-700"
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