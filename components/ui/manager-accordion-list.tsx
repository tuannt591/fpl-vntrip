import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import Image from "next/image";
import { LeaderboardEntry } from "@/types/fantasy";

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

  // Hàm render dialog chi tiết player
  function renderPlayerDialog() {
    if (!selectedPlayer) return null;
    const { elementName, liveData, multiplier, is_captain, is_vice_captain, position, clubName, element_type, avatar } = selectedPlayer;
    const stats = liveData?.stats || {};

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
          const captain = entry.picksData?.picks.find(p => p.is_captain);
          const viceCaptain = entry.picksData?.picks.find(p => p.is_vice_captain);
          const transferCost = entry.picksData?.entry_history?.event_transfers_cost;
          const isOpen = openItems.includes(entry.entry.toString());

          return (
            <AccordionItem key={entry.entry} value={entry.entry.toString()} className={`border-2 my-2 px-2 bg-gray-100 dark:bg-gray-800 ${isOpen
              ? "border-blue-500 dark:border-blue-400"
              : "border-transparent"
              }`}>
              <AccordionTrigger className="flex py-3 items-baseline rounded cursor-pointer text-sm gap-2 w-full">
                {/* ---------------------rank----------------------- */}
                <div className="w-10 text-center">
                  <p>{entry.rank}</p>
                </div>

                {/* ---------------------team----------------------- */}
                <div className={`w-10 text-center ${getColorByTeam(entry.team)}`}>
                  <p>{entry.team}</p>
                  <p className="text-xs">Team</p>
                </div>

                {/* ---------------------manager----------------------- */}
                <div className="text-left px-2" style={{ width: 'calc(100% - 14.5rem)' }}>
                  <p className="truncate">{entry.teamName}</p>
                  <p className="text-muted-foreground truncate text-xs flex items-center gap-1">
                    {entry.manager}
                  </p>
                </div>

                {/* ---------------------Captain----------------------- */}
                <div className="w-[6rem] text-center">
                  {captain && <p className="truncate">{captain?.elementName}</p>}
                  {viceCaptain && <p className="text-muted-foreground text-xs truncate">{viceCaptain?.elementName}</p>}
                </div>

                {/* ---------------------GW----------------------- */}
                <div className="w-10 text-center">
                  <p className="font-semibold text-green-700 text-lg">{entry.gwPoint}</p>
                  {transferCost ? <p className="text-xs font-medium text-red-500">(-{transferCost})</p> : null}
                </div>

              </AccordionTrigger>

              {/* ---------------------detail info----------------------- */}
              <div className="flex items-center flex-wrap p-1 gap-1 border-t dark:border-gray-700">
                {/* Hiển thị tiền bank nếu có */}
                {entry.picksData?.entry_history?.bank !== undefined && (
                  <p className="text-xs">
                    💰{(entry.picksData.entry_history.value / 10).toFixed(1)}m
                  </p>
                )}

                {/* Hiển thị chip nếu có */}
                {renderActiveChip(entry.picksData?.active_chip)}

                {/* Hiển thị played */}
                {entry.played && (
                  <div className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full text-xs">
                    <span className="font-bold">Played&nbsp;</span>
                    {entry.played}
                  </div>
                )}


                {/* Hiển thị transfer nếu có */}
                {entry?.transfers && entry?.transfers.length > 0 && (
                  <div className="flex flex-wrap gap-1 items-center text-xs">
                    {entry.transfers.map((t: any, idx: number) => (
                      <span key={idx} className="flex items-center gap-1 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                        <span className="line-through text-red-500">{t.element_out_name}</span>
                        <span>→</span>
                        <span className="text-green-600">{t.element_in_name}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <AccordionContent className="py-2">
                {entry.picksData ? (
                  <div className="flex flex-wrap gap-1">
                    {entry.picksData.picks
                      .sort((a, b) => a.position - b.position)
                      .map((pick) => {
                        const minutes = pick.liveData?.stats?.minutes ?? '-';
                        const point = pick.position > 11 ? (pick.liveData?.stats.total_points || 0) : (pick.liveData?.stats.total_points || 0) * pick.multiplier;
                        return (
                          <div
                            key={pick.position}
                            className={`cursor-pointer p-2 flex items-center gap-2 text-xs rounded-md border ${pick.position > 11 ? "bg-gray-100 dark:bg-gray-800 dark:border-gray-700" : "bg-white dark:bg-gray-900"}`}
                            onClick={() => setSelectedPlayer(pick)}
                          >
                            <span className="flex-1 truncate text-black dark:text-white">
                              {pick.elementName}&nbsp;
                              {pick.is_captain && <span className="text-muted-foreground">(C)</span>}
                              {pick.is_vice_captain && <span className="text-muted-foreground">(VC)</span>}
                              {/* <span className="text-muted-foreground"> - {minutes}&apos;</span> */}
                            </span>
                            <span className={`font-mono font-semibold text-sm ${point >= 0 ? 'text-green-700' : 'text-red-500'}`}>
                              {point}
                            </span>
                          </div>
                        )
                      })}
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