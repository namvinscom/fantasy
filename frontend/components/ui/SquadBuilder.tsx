"use client";
import { useMemo, useState, memo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fplApi, { PickSuggestion, Player } from "@/lib/api";
import {
  ArrowDownUp,
  Check,
  Crown,
  Filter,
  Info,
  Search,
  Shield,
  Shirt,
  Sparkles,
  Star,
  Trash2,
  UserPlus,
  X,
  RotateCcw,
} from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";
import { PositionBadge } from "./Badge";

type Position = "GK" | "DEF" | "MID" | "FWD";
type Formation = "3-4-3" | "3-5-2" | "4-3-3" | "4-4-2" | "4-5-1" | "5-3-2" | "5-4-1";
type SlotArea = "starter" | "bench";
type Slot = { id: string; area: SlotArea; position: Position; player: Player | null };
type AssistantView = "suggestions" | "all";

const POS_LIMITS: Record<Position, number> = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
const POS_LABELS: Record<Position, string> = { GK: "Thủ môn", DEF: "Hậu vệ", MID: "Tiền vệ", FWD: "Tiền đạo" };
const POS_ORDER: Position[] = ["GK", "DEF", "MID", "FWD"];
const FORMATIONS: Formation[] = ["3-4-3", "3-5-2", "4-3-3", "4-4-2", "4-5-1", "5-3-2", "5-4-1"];

function getFormationCounts(formation: Formation): Record<Position, number> {
  const [def, mid, fwd] = formation.split("-").map(Number);
  return { GK: 1, DEF: def, MID: mid, FWD: fwd };
}

function buildSlots(formation: Formation): Slot[] {
  const starterCounts = getFormationCounts(formation);
  const slots: Slot[] = [];

  for (const pos of POS_ORDER) {
    for (let i = 0; i < starterCounts[pos]; i += 1) {
      slots.push({ id: `starter-${pos}-${i}`, area: "starter", position: pos, player: null });
    }
  }

  for (const pos of POS_ORDER) {
    const benchCount = POS_LIMITS[pos] - starterCounts[pos];
    for (let i = 0; i < benchCount; i += 1) {
      slots.push({ id: `bench-${pos}-${i}`, area: "bench", position: pos, player: null });
    }
  }

  return slots;
}

function arrangePlayersInSlots(players: Player[], formation: Formation): Slot[] {
  const slots = buildSlots(formation);
  const byPosition = new Map<Position, Player[]>();

  for (const pos of POS_ORDER) {
    byPosition.set(pos, players.filter((p) => p.position === pos));
  }

  return slots.map((slot) => {
    const nextPlayer = byPosition.get(slot.position)?.shift() ?? null;
    return { ...slot, player: nextPlayer };
  });
}

function getSelectedPlayers(slots: Slot[]) {
  return slots.flatMap((slot) => (slot.player ? [slot.player] : []));
}

function getSlotRows(slots: Slot[]) {
  return {
    GK: slots.filter((slot) => slot.area === "starter" && slot.position === "GK"),
    DEF: slots.filter((slot) => slot.area === "starter" && slot.position === "DEF"),
    MID: slots.filter((slot) => slot.area === "starter" && slot.position === "MID"),
    FWD: slots.filter((slot) => slot.area === "starter" && slot.position === "FWD"),
    bench: slots.filter((slot) => slot.area === "bench"),
  };
}

function suggestionToPlayer(suggestion: PickSuggestion): Player {
  return {
    id: suggestion.player_id,
    name: suggestion.name,
    web_name: suggestion.web_name,
    team_id: suggestion.team_id,
    team_name: suggestion.team_name,
    team_short: suggestion.team_short,
    position: suggestion.position,
    price: suggestion.price,
    price_display: suggestion.price_display,
    total_points: suggestion.total_points ?? 0,
    event_points: 0,
    form: suggestion.form ?? 0,
    selected_by_percent: suggestion.ownership ?? 0,
    minutes: 0,
    goals_scored: 0,
    assists: 0,
    clean_sheets: 0,
    bonus: 0,
    expected_goals: null,
    expected_assists: null,
    expected_goal_involvements: null,
    news: suggestion.news,
    chance_of_playing_next_round: null,
    status: suggestion.status,
    fpl_score: suggestion.fpl_score,
  };
}

const PlayerSlot = memo(function PlayerSlot({
  slot,
  captainId,
  viceCaptainId,
  onClear,
  onFocusPosition,
  onCaptain,
  onViceCaptain,
  onDropPlayer,
}: {
  slot: Slot;
  captainId: number | null;
  viceCaptainId: number | null;
  onClear: (slotId: string) => void;
  onFocusPosition: (position: Position) => void;
  onCaptain: (playerId: number) => void;
  onViceCaptain: (playerId: number) => void;
  onDropPlayer: (data: string, targetSlotId: string) => void;
}) {
  const [isOver, setIsOver] = useState(false);
  const player = slot.player;
  const isStarter = slot.area === "starter";

  return (
    <div className="group flex min-w-[60px] flex-col items-center gap-1">
      <button
        type="button"
        draggable={!!player}
        onDragStart={(e) => {
          if (player) {
            e.dataTransfer.setData("text/plain", JSON.stringify({ type: "squad", slotId: slot.id }));
          } else {
            e.preventDefault();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsOver(false);
          const data = e.dataTransfer.getData("text/plain");
          if (data) onDropPlayer(data, slot.id);
        }}
        onClick={() => (player ? onClear(slot.id) : onFocusPosition(slot.position))}
        className={cn(
          "relative flex h-[64px] w-[58px] items-center justify-center overflow-hidden rounded-md border transition-all md:h-[72px] md:w-[64px]",
          isOver && "ring-2 ring-emerald-400 ring-offset-2 ring-offset-black scale-105 z-10",
          player
            ? "border-emerald-300/50 bg-slate-950/55 shadow-lg shadow-black/20 hover:border-red-300/80"
            : "border-dashed border-white/25 bg-white/[0.055] hover:border-cyan-300/70 hover:bg-cyan-400/10"
        )}
        aria-label={player ? `Remove ${player.web_name}` : `Choose ${slot.position}`}
      >
        {player ? (
          <>
            <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-white/14 to-transparent" />
            <Shirt className="h-8 w-8 text-white/85" />
            <div className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-1 text-center">
              <span className="block truncate text-[10px] font-black leading-none text-white">{player.web_name}</span>
            </div>
            {captainId === player.id && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-[9px] font-black text-black">
                C
              </span>
            )}
            {viceCaptainId === player.id && captainId !== player.id && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-black text-black">
                V
              </span>
            )}
            <span className="absolute inset-0 hidden items-center justify-center bg-red-500/85 text-white group-hover:flex">
              <Trash2 className="h-5 w-5" />
            </span>
          </>
        ) : (
          <UserPlus className="h-6 w-6 text-white/35" />
        )}
      </button>

      <div className="min-h-[34px] text-center">
        <div className="rounded bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white">
          {player ? formatPrice(player.price) : slot.position}
        </div>
        {player && isStarter && (
          <div className="mt-1 flex justify-center gap-1 opacity-100 transition-opacity">
            <button
              type="button"
              onClick={() => onCaptain(player.id)}
              className={cn("rounded border px-1.5 py-0.5 text-[9px] font-black", captainId === player.id ? "border-yellow-400 bg-yellow-400 text-black" : "border-yellow-400/30 bg-yellow-400/10 text-yellow-300")}
            >
              C
            </button>
            <button
              type="button"
              onClick={() => onViceCaptain(player.id)}
              className={cn("rounded border px-1.5 py-0.5 text-[9px] font-black", viceCaptainId === player.id ? "border-slate-200 bg-slate-200 text-black" : "border-white/20 bg-white/10 text-slate-200")}
            >
              V
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export function SquadBuilder({ initialSquad, onClose }: { initialSquad?: any; onClose: () => void }) {
  const [tab, setTab] = useState<"import" | "manual">("manual");
  const [teamId, setTeamId] = useState("");
  const [formation, setFormation] = useState<Formation>(
    (initialSquad?.formation as Formation) || "3-4-3"
  );
  
  const [slots, setSlots] = useState<Slot[]>(() => {
    const defaultFormation = (initialSquad?.formation as Formation) || "3-4-3";
    if (!initialSquad?.players) return buildSlots(defaultFormation);

    const squadStarters = initialSquad.players.filter((p: any) => p.is_starting);
    const squadBench = initialSquad.players.filter((p: any) => !p.is_starting).sort((a: any, b: any) => (a.bench_order ?? 99) - (b.bench_order ?? 99));
    const sortedPlayers = [...squadStarters, ...squadBench];
    
    const mappedPlayers: Player[] = sortedPlayers.map((sp: any) => ({
      id: sp.player_id,
      name: sp.name,
      web_name: sp.web_name,
      team_id: sp.team_id,
      team_name: sp.team_name || "",
      team_short: sp.team_short || "",
      position: sp.position as Position,
      price: sp.price,
      price_display: formatPrice(sp.price),
      total_points: sp.total_points ?? 0,
      event_points: sp.gameweek_points ?? 0,
      form: sp.form ?? 0,
      selected_by_percent: sp.ownership ?? 0,
      minutes: 0, goals_scored: 0, assists: 0, clean_sheets: 0, bonus: 0,
      expected_goals: sp.expected_goals, expected_assists: sp.expected_assists, expected_goal_involvements: null,
      news: sp.news, chance_of_playing_next_round: sp.chance_of_playing, status: sp.status, fpl_score: sp.fpl_score,
    }));

    return arrangePlayersInSlots(mappedPlayers, defaultFormation);
  });

  const [search, setSearch] = useState("");
  const [filterPos, setFilterPos] = useState<Position | null>(null);
  const [assistantView, setAssistantView] = useState<AssistantView>("suggestions");
  const [captainId, setCaptainId] = useState<number | null>(() => {
    return initialSquad?.players?.find((p: any) => p.is_captain)?.player_id || null;
  });
  const [viceCaptainId, setViceCaptainId] = useState<number | null>(() => {
    return initialSquad?.players?.find((p: any) => p.is_vice_captain)?.player_id || null;
  });
  const qc = useQueryClient();

  const selected = useMemo(() => getSelectedPlayers(slots), [slots]);
  const rows = useMemo(() => getSlotRows(slots), [slots]);
  const starters = slots.filter((slot) => slot.area === "starter" && slot.player).map((slot) => slot.player as Player);
  const totalCost = selected.reduce((acc, p) => acc + p.price, 0);
  const remaining = 1000 - totalCost;
  const selectedIds = new Set(selected.map((p) => p.id));

  const counts = POS_ORDER.reduce((acc, pos) => ({ ...acc, [pos]: 0 }), {} as Record<Position, number>);
  const teamCounts: Record<number, number> = {};
  for (const p of selected) {
    counts[p.position] += 1;
    teamCounts[p.team_id] = (teamCounts[p.team_id] || 0) + 1;
  }

  const { data: searchResults } = useQuery({
    queryKey: ["players", search, filterPos, "total_points"],
    queryFn: () => fplApi.getPlayers({ search, position: filterPos || undefined, limit: 1000, sort_by: "total_points" }).then((r) => r.data),
    enabled: tab === "manual",
  });

  const excludeIds = selected.map((p) => p.id).join(",");
  const { data: pickData, isFetching: isFetchingPicks } = useQuery({
    queryKey: ["pickSuggestions", filterPos, remaining, excludeIds],
    queryFn: () => fplApi.getPickSuggestions({
      position: filterPos || undefined,
      budget: Math.max(0, remaining),
      exclude_ids: excludeIds || undefined,
      limit: 18,
    }).then((r) => r.data),
    enabled: tab === "manual" && assistantView === "suggestions" && remaining > 0,
  });

  const importMut = useMutation({
    mutationFn: () => fplApi.importSquad(teamId).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries();
      onClose();
    },
  });

  const saveManualMut = useMutation({
    mutationFn: () => {
      const fallbackCaptain = starters[0]?.id ?? null;
      const fallbackVice = starters.find((p) => p.id !== fallbackCaptain)?.id ?? null;
      const starterIds = new Set(starters.map((p) => p.id));
      const safeCaptainId = captainId && starterIds.has(captainId) ? captainId : fallbackCaptain;
      const safeViceId =
        viceCaptainId && starterIds.has(viceCaptainId) && viceCaptainId !== safeCaptainId
          ? viceCaptainId
          : fallbackVice;

      const players = slots.flatMap((slot) => {
        if (!slot.player) return [];
        return [{
          player_id: slot.player.id,
          is_starting: slot.area === "starter",
          is_captain: slot.player.id === safeCaptainId,
          is_vice_captain: slot.player.id === safeViceId,
          bench_order: slot.area === "bench" ? rows.bench.findIndex((benchSlot) => benchSlot.id === slot.id) + 1 : null,
        }];
      });

      return fplApi.saveSquad({
        gameweek: 1,
        team_value: totalCost,
        bank: remaining,
        free_transfers: 1,
        formation,
        players,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries();
      onClose();
    },
  });

  const setFormationAndKeepPlayers = (nextFormation: Formation) => {
    setFormation(nextFormation);
    setSlots(arrangePlayersInSlots(selected, nextFormation));
  };

  const focusPosition = (position: Position) => {
    setFilterPos(position);
    setAssistantView("suggestions");
    requestAnimationFrame(() => document.getElementById("player-search-input")?.focus());
  };

  const clearSlot = (slotId: string) => {
    const removed = slots.find((slot) => slot.id === slotId)?.player;
    setSlots((current) => current.map((slot) => (slot.id === slotId ? { ...slot, player: null } : slot)));
    if (removed?.id === captainId) setCaptainId(null);
    if (removed?.id === viceCaptainId) setViceCaptainId(null);
  };

  const addPlayer = (player: Player) => {
    if (selectedIds.has(player.id)) {
      setSlots((current) => current.map((slot) => (slot.player?.id === player.id ? { ...slot, player: null } : slot)));
      if (player.id === captainId) setCaptainId(null);
      if (player.id === viceCaptainId) setViceCaptainId(null);
      return;
    }

    if (selected.length >= 15) return alert("Đã chọn đủ 15 cầu thủ.");
    if (counts[player.position] >= POS_LIMITS[player.position]) return alert(`${POS_LABELS[player.position]} đã đủ số lượng.`);
    if ((teamCounts[player.team_id] || 0) >= 3) return alert("Chỉ được tối đa 3 cầu thủ cùng một CLB.");
    if (remaining - player.price < 0) return alert("Không đủ ngân sách.");

    const targetSlot = slots.find((slot) => slot.position === player.position && !slot.player);
    if (!targetSlot) return alert(`Không còn slot ${POS_LABELS[player.position]} trong formation này.`);

    setSlots((current) => current.map((slot) => (slot.id === targetSlot.id ? { ...slot, player } : slot)));
    if (!captainId && targetSlot.area === "starter" && player.position !== "GK") setCaptainId(player.id);
    if (!viceCaptainId && captainId && targetSlot.area === "starter" && player.id !== captainId) setViceCaptainId(player.id);
  };

  const assignCaptain = (playerId: number) => {
    setCaptainId(playerId);
    if (viceCaptainId === playerId) setViceCaptainId(null);
  };

  const assignViceCaptain = (playerId: number) => {
    if (captainId === playerId) return;
    setViceCaptainId(playerId);
  };

  const handleResetSquad = () => {
    setSlots(buildSlots(formation));
    setCaptainId(null);
    setViceCaptainId(null);
  };

  const swapWithBench = (player: Player) => {
    const currentSlot = slots.find((slot) => slot.player?.id === player.id);
    if (!currentSlot) return;
    const swapSlot = slots.find(
      (slot) => slot.area !== currentSlot.area && slot.position === player.position && slot.player
    );
    if (!swapSlot) return;

    setSlots((current) =>
      current.map((slot) => {
        if (slot.id === currentSlot.id) return { ...slot, player: swapSlot.player };
        if (slot.id === swapSlot.id) return { ...slot, player: currentSlot.player };
        return slot;
      })
    );
  };

  const handleDropPlayer = (dataStr: string, targetSlotId: string) => {
    try {
      const data = JSON.parse(dataStr);
      const targetSlot = slots.find((s) => s.id === targetSlotId);
      if (!targetSlot) return;

      if (data.type === "assistant") {
        const droppedPlayerId = data.id;
        const playerFromSearch = searchResults?.players?.find((p) => p.id === droppedPlayerId);
        const playerFromPicks = pickData?.suggestions?.find((p) => p.player_id === droppedPlayerId);
        const player = playerFromSearch || (playerFromPicks ? suggestionToPlayer(playerFromPicks) : null);

        if (!player) return;

        if (player.position !== targetSlot.position) {
          return alert(`Không thể xếp ${POS_LABELS[player.position]} vào vị trí ${POS_LABELS[targetSlot.position]}`);
        }

        const existingPlayer = targetSlot.player;

        if (selectedIds.has(player.id) && (!existingPlayer || existingPlayer.id !== player.id)) {
          return alert("Cầu thủ này đã có trong đội hình.");
        }

        const remainingAfterRemove = existingPlayer ? remaining + existingPlayer.price : remaining;
        if (remainingAfterRemove - player.price < 0) return alert("Không đủ ngân sách.");

        const currentTeamCounts = { ...teamCounts };
        if (existingPlayer) currentTeamCounts[existingPlayer.team_id] -= 1;
        if ((currentTeamCounts[player.team_id] || 0) >= 3) return alert("Chỉ được tối đa 3 cầu thủ cùng một CLB.");

        setSlots((current) =>
          current.map((slot) => {
            if (slot.id === targetSlotId) return { ...slot, player };
            return slot;
          })
        );

        if (existingPlayer) {
          if (captainId === existingPlayer.id) setCaptainId(null);
          if (viceCaptainId === existingPlayer.id) setViceCaptainId(null);
        }
      } else if (data.type === "squad") {
        const sourceSlotId = data.slotId;
        const sourceSlot = slots.find((s) => s.id === sourceSlotId);
        if (!sourceSlot || !sourceSlot.player || sourceSlotId === targetSlotId) return;

        if (sourceSlot.position !== targetSlot.position) {
           // Swap across positions (only possible for outfield bench) -> For now, reject to avoid complex formation changes.
           return alert("Chỉ hỗ trợ kéo thả đổi cầu thủ cùng vị trí.");
        }

        setSlots((current) =>
          current.map((slot) => {
            if (slot.id === sourceSlot.id) return { ...slot, player: targetSlot.player };
            if (slot.id === targetSlot.id) return { ...slot, player: sourceSlot.player };
            return slot;
          })
        );
      }
    } catch (e) {}
  };

  const canSave = selected.length === 15 && remaining >= 0 && rows.bench.every((slot) => slot.player);
  const captain = starters.find((p) => p.id === captainId);
  const viceCaptain = starters.find((p) => p.id === viceCaptainId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/80 p-2 backdrop-blur-md md:p-6">
      <div className={cn("glass-card flex h-full max-h-full w-full flex-col", tab === "manual" ? "max-w-7xl" : "h-auto max-w-2xl")}>
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.05] p-4 md:p-5">
          <div className="flex items-center gap-3">
            <Shield className="h-5 w-5 text-emerald-400" />
            <div>
              <h2 className="text-base font-bold text-white">Thiết lập đội hình</h2>
              <p className="text-[11px] text-slate-500">15 cầu thủ, 11 đá chính, 4 dự bị</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex shrink-0 gap-6 border-b border-white/[0.05] px-4 pt-3 md:px-5">
          <button
            onClick={() => setTab("manual")}
            className={cn("border-b-2 pb-3 text-sm font-bold transition-colors", tab === "manual" ? "border-emerald-400 text-emerald-300" : "border-transparent text-slate-500")}
          >
            Xây đội thủ công
          </button>
          <button
            onClick={() => setTab("import")}
            className={cn("border-b-2 pb-3 text-sm font-bold transition-colors", tab === "import" ? "border-emerald-400 text-emerald-300" : "border-transparent text-slate-500")}
          >
            Import Team ID
          </button>
        </div>

        <div className="flex min-h-0 flex-1 flex-col p-4 md:p-5">
          {tab === "import" ? (
            <div className="mx-auto max-w-md py-8">
              <div className="mb-6 rounded-lg border border-blue-400/20 bg-blue-400/10 p-4 text-sm leading-relaxed text-blue-100">
                Nhập Team ID từ trang FPL để tải đội tự động. ID nằm trong URL dạng
                <code className="mx-1 rounded bg-black/30 px-1 text-cyan-200">/entry/[ID]/event/1</code>.
              </div>

              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-emerald-300">FPL Team ID</label>
              <input
                type="number"
                placeholder="Ví dụ: 123456"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
                className="input-dark mb-6 w-full px-4 py-3 text-base"
                autoFocus
              />

              {importMut.isError && (
                <div className="mb-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-300">
                  {(importMut.error as any)?.response?.data?.detail || "Lỗi kết nối. Vui lòng kiểm tra lại ID."}
                </div>
              )}

              <button
                onClick={() => teamId && importMut.mutate()}
                disabled={!teamId || importMut.isPending}
                className="btn-primary w-full py-3.5 text-base font-bold"
              >
                {importMut.isPending ? "Đang tải..." : "Tải đội hình"}
              </button>
            </div>
          ) : (
            <div className="flex min-h-0 flex-1 flex-col gap-5 xl:flex-row">
              <div className="flex min-h-[520px] flex-1 flex-col overflow-hidden rounded-lg border border-white/10 bg-black/35 shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-cyan-300" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Formation</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {FORMATIONS.map((item) => (
                      <button
                        key={item}
                        onClick={() => setFormationAndKeepPlayers(item)}
                        className={cn(
                          "rounded-md px-3 py-1.5 text-xs font-black transition-colors",
                          formation === item ? "bg-emerald-400 text-slate-950" : "bg-white/[0.07] text-slate-300 hover:bg-white/[0.12]"
                        )}
                      >
                        {item}
                      </button>
                    ))}
                    <div className="mx-1 h-5 w-px bg-white/10"></div>
                    <button
                      type="button"
                      onClick={handleResetSquad}
                      className="flex items-center gap-1.5 rounded-md bg-red-500/10 px-3 py-1.5 text-xs font-black text-red-400 transition-colors hover:bg-red-500/20"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset
                    </button>
                  </div>
                </div>

                <div
                  className="relative flex min-h-0 flex-1 flex-col justify-between overflow-hidden p-4 md:p-6"
                  style={{ background: "linear-gradient(180deg, #0c5a34 0%, #13713e 42%, #0f5f35 100%)" }}
                >
                  <div className="absolute left-6 right-6 top-1/2 h-px bg-white/15" />
                  <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
                  <div className="absolute left-1/2 top-6 h-20 w-48 -translate-x-1/2 rounded-b-full border border-t-0 border-white/15" />
                  <div className="absolute bottom-6 left-1/2 h-20 w-48 -translate-x-1/2 rounded-t-full border border-b-0 border-white/15" />

                  <div className="relative flex flex-1 flex-col justify-around gap-4">
                    {(["FWD", "MID", "DEF", "GK"] as Position[]).map((pos) => (
                      <div key={pos} className="flex justify-center gap-3 md:gap-7">
                        {rows[pos].map((slot) => (
                          <PlayerSlot
                            key={slot.id}
                            slot={slot}
                            captainId={captainId}
                            viceCaptainId={viceCaptainId}
                            onClear={clearSlot}
                            onFocusPosition={focusPosition}
                            onCaptain={assignCaptain}
                            onViceCaptain={assignViceCaptain}
                            onDropPlayer={handleDropPlayer}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-white/10 bg-slate-950/80 px-4 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Dự bị</span>
                    <span className="text-[10px] text-slate-500">GK + 3 outfield theo formation</span>
                  </div>
                  <div className="flex justify-center gap-3 md:gap-6">
                    {rows.bench.map((slot) => (
                      <PlayerSlot
                        key={slot.id}
                        slot={slot}
                        captainId={captainId}
                        viceCaptainId={viceCaptainId}
                        onClear={clearSlot}
                        onFocusPosition={focusPosition}
                        onCaptain={assignCaptain}
                        onViceCaptain={assignViceCaptain}
                        onDropPlayer={handleDropPlayer}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 w-full shrink-0 flex-col gap-4 xl:w-[410px]">
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3 text-center">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Ngân sách</p>
                    <p className={cn("text-lg font-black", remaining < 0 ? "text-red-300" : "text-emerald-300")}>{formatPrice(remaining)}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3 text-center">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Cầu thủ</p>
                    <p className={cn("text-lg font-black", selected.length === 15 ? "text-emerald-300" : "text-white")}>{selected.length}/15</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3 text-center">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">Đội</p>
                    <p className="text-lg font-black text-cyan-200">max 3</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {POS_ORDER.map((pos) => (
                    <button
                      key={pos}
                      onClick={() => focusPosition(pos)}
                      className={cn(
                        "rounded-lg border px-2 py-2 text-center transition-colors",
                        filterPos === pos ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                      )}
                    >
                      <div className="mb-1 flex justify-center"><PositionBadge position={pos} /></div>
                      <span className={cn("text-xs font-black", counts[pos] === POS_LIMITS[pos] ? "text-emerald-300" : "text-slate-300")}>
                        {counts[pos]}/{POS_LIMITS[pos]}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border border-yellow-400/20 bg-yellow-400/10 p-3">
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-yellow-300">
                      <Crown className="h-3.5 w-3.5" /> Captain
                    </div>
                    <p className="truncate text-sm font-bold text-white">{captain?.web_name || "Chưa chọn"}</p>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/[0.045] p-3">
                    <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      <Star className="h-3.5 w-3.5" /> Vice
                    </div>
                    <p className="truncate text-sm font-bold text-white">{viceCaptain?.web_name || "Chưa chọn"}</p>
                  </div>
                </div>

                <div className="flex min-h-0 flex-1 flex-col rounded-lg border border-white/10 bg-white/[0.045] p-4">
                  <div className="mb-3 space-y-3">
                    <div className="grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-black/25 p-1">
                      <button
                        type="button"
                        onClick={() => setAssistantView("suggestions")}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-black transition-colors",
                          assistantView === "suggestions" ? "bg-emerald-400 text-slate-950" : "text-slate-400 hover:bg-white/[0.08]"
                        )}
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        Gợi ý
                      </button>
                      <button
                        type="button"
                        onClick={() => setAssistantView("all")}
                        className={cn(
                          "rounded-md px-3 py-2 text-xs font-black transition-colors",
                          assistantView === "all" ? "bg-cyan-300 text-slate-950" : "text-slate-400 hover:bg-white/[0.08]"
                        )}
                      >
                        Tất cả
                      </button>
                    </div>

                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <input
                        id="player-search-input"
                        type="text"
                        placeholder="Tìm cầu thủ..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onFocus={() => setAssistantView("all")}
                        className="input-dark w-full px-3 py-2.5 pl-9 text-sm"
                      />
                    </div>
                    <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
                      <button
                        onClick={() => setFilterPos(null)}
                        className={cn("rounded-md px-3 py-1.5 text-xs font-bold transition-colors", filterPos === null ? "bg-cyan-300 text-slate-950" : "bg-white/[0.07] text-slate-400 hover:bg-white/[0.12]")}
                      >
                        ALL
                      </button>
                      {POS_ORDER.map((pos) => (
                        <button
                          key={pos}
                          onClick={() => setFilterPos(pos)}
                          className={cn("rounded-md px-3 py-1.5 text-xs font-bold transition-colors", filterPos === pos ? "bg-cyan-300 text-slate-950" : "bg-white/[0.07] text-slate-400 hover:bg-white/[0.12]")}
                        >
                          {pos}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="custom-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {assistantView === "suggestions" && (
                      <>
                        {isFetchingPicks && (
                          <div className="py-8 text-center text-sm text-slate-500">Đang tính gợi ý...</div>
                        )}
                        {!isFetchingPicks && pickData?.suggestions?.map((suggestion) => {
                          const player = suggestionToPlayer(suggestion);
                          return (
                            <div 
                              key={suggestion.player_id} 
                              className="rounded-lg border border-emerald-400/15 bg-emerald-400/[0.055] p-3 transition-colors hover:border-emerald-300/35 cursor-grab active:cursor-grabbing"
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'assistant', id: suggestion.player_id }))}
                            >
                              <div className="flex items-start gap-3">
                                <button
                                  type="button"
                                  onClick={() => addPlayer(player)}
                                  className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-300/35 bg-emerald-300/[0.12] text-emerald-200 hover:bg-emerald-300/20"
                                  aria-label="Pick suggested player"
                                >
                                  <UserPlus className="h-4 w-4" />
                                </button>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-black text-white">{suggestion.web_name}</p>
                                      <div className="mt-1 flex items-center gap-2">
                                        <PositionBadge position={suggestion.position} />
                                        <span className="text-xs font-semibold text-slate-300">{suggestion.price_display}</span>
                                        <span className="truncate text-[10px] text-slate-500">{suggestion.team_short}</span>
                                      </div>
                                    </div>
                                    <div className="rounded-lg border border-emerald-300/20 bg-black/30 px-2 py-1 text-right">
                                      <p className="text-[9px] font-bold uppercase tracking-wider text-emerald-200/70">Pick</p>
                                      <p className="text-sm font-black text-emerald-200">{suggestion.pick_score.toFixed(0)}</p>
                                    </div>
                                  </div>
                                  {suggestion.reasons.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-1">
                                      {suggestion.reasons.slice(0, 2).map((reason) => (
                                        <span key={reason} className="rounded bg-white/[0.08] px-2 py-0.5 text-[10px] text-slate-200">
                                          {reason}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                  {suggestion.risks.length > 0 && (
                                    <p className="mt-1 truncate text-[10px] text-yellow-200/80">{suggestion.risks[0]}</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        {!isFetchingPicks && (!pickData?.suggestions || pickData.suggestions.length === 0) && (
                          <div className="py-10 text-center text-sm text-slate-500">Không có gợi ý phù hợp ngân sách/vị trí hiện tại.</div>
                        )}
                      </>
                    )}

                    {assistantView === "all" && searchResults?.players?.map((player) => {
                      const isSelected = selectedIds.has(player.id);
                      const selectedSlot = slots.find((slot) => slot.player?.id === player.id);
                      const hasBenchPair = Boolean(
                        selectedSlot && slots.some((slot) => slot.area !== selectedSlot.area && slot.position === player.position && slot.player)
                      );

                      return (
                        <div 
                          key={player.id} 
                          className="flex items-center gap-2 rounded-lg border border-white/8 bg-black/25 p-2.5 transition-colors hover:border-white/20 cursor-grab active:cursor-grabbing"
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify({ type: 'assistant', id: player.id }))}
                        >
                          <button
                            type="button"
                            onClick={() => addPlayer(player)}
                            className={cn(
                              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-colors",
                              isSelected ? "border-red-400/30 bg-red-400/10 text-red-300" : "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                            )}
                            aria-label={isSelected ? "Remove player" : "Add player"}
                          >
                            {isSelected ? <Trash2 className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold leading-tight text-white">{player.web_name}</p>
                            <div className="mt-1.5 flex items-center gap-2">
                              <PositionBadge position={player.position} />
                              <span className="text-xs font-semibold text-slate-300">{formatPrice(player.price)}</span>
                              <span className="truncate text-[10px] text-slate-500">{(player as Player & { team_name?: string }).team_name}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="block text-xs font-black text-emerald-300">{player.total_points}</span>
                            <span className="text-[9px] uppercase tracking-wider text-slate-500">điểm</span>
                          </div>
                          {isSelected && (
                            <button
                              type="button"
                              onClick={() => swapWithBench(player)}
                              disabled={!hasBenchPair}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-30"
                              aria-label="Swap starter and bench"
                            >
                              <ArrowDownUp className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                    {assistantView === "all" && (!searchResults?.players || searchResults.players.length === 0) && (
                      <div className="py-10 text-center text-sm text-slate-500">Không tìm thấy cầu thủ</div>
                    )}
                  </div>

                  {saveManualMut.isError && (
                    <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                      {(saveManualMut.error as any)?.response?.data?.detail || "Không thể lưu đội hình."}
                    </div>
                  )}

                  <div className="mt-4 border-t border-white/10 pt-4">
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleResetSquad}
                        className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-300 transition-colors hover:bg-red-500/20"
                      >
                        Reset
                      </button>
                      <button
                        onClick={() => saveManualMut.mutate()}
                        disabled={saveManualMut.isPending}
                        className="btn-primary flex flex-1 items-center justify-center gap-2 py-3 text-sm font-bold"
                      >
                        {saveManualMut.isPending ? (
                          "Đang lưu..."
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            {canSave ? "Lưu đội hình" : "Lưu nháp"}
                          </>
                        )}
                      </button>
                    </div>
                    {!canSave && (
                      <div className="mt-2 flex items-start gap-2 text-[11px] leading-relaxed text-slate-500">
                        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        Đội hình chưa đủ 15 người hoặc sai cấu trúc sẽ được "Lưu nháp". Bạn có thể quay lại sửa sau.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
