"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fplApi from "@/lib/api";
import { LoadingCard } from "@/components/ui/Cards";
import { cn } from "@/lib/utils";
import { BarChart3, Calendar, Trophy, Target, Star, RefreshCw, Shirt } from "lucide-react";

const POS_COLOR: Record<string, string> = {
  GK: "bg-yellow-400/20 text-yellow-600 border-yellow-400/40",
  DEF: "bg-blue-400/20 text-blue-600 border-blue-400/40",
  MID: "bg-emerald-400/20 text-emerald-600 border-emerald-400/40",
  FWD: "bg-red-400/20 text-red-600 border-red-400/40",
};

const POS_SHIRT: Record<string, string> = {
  GK: "#f59e0b",
  DEF: "#3b82f6",
  MID: "#10b981",
  FWD: "#ef4444",
};

function DreamTeamPitch({ team }: { team: any[] }) {
  const gk = team.filter((p) => p.position === "GK");
  const def = team.filter((p) => p.position === "DEF");
  const mid = team.filter((p) => p.position === "MID");
  const fwd = team.filter((p) => p.position === "FWD");

  const rows = [
    { label: "FWD", players: fwd },
    { label: "MID", players: mid },
    { label: "DEF", players: def },
    { label: "GK", players: gk },
  ];

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #2d7a3a 0%, #1e5c2a 50%, #2d7a3a 100%)",
        border: "2px solid rgba(255,255,255,0.15)",
      }}
    >
      {/* Pitch markings */}
      <div className="relative py-6 px-4">
        {/* Center circle */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/20 pointer-events-none" />
        {/* Center line */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white/20 pointer-events-none" />

        <div className="space-y-6">
          {rows.map(({ label, players }) =>
            players.length > 0 ? (
              <div key={label} className="flex justify-center gap-4 md:gap-8">
                {players.map((p) => (
                  <div key={p.player_id} className="flex flex-col items-center w-16 md:w-20">
                    {/* Shirt */}
                    <div className="relative mb-0.5">
                      <div className="relative h-10 w-10 md:h-12 md:w-12 flex items-center justify-center">
                        <Shirt
                          className="h-full w-full drop-shadow-lg"
                          style={{ color: POS_SHIRT[p.position] || "#fff" }}
                        />
                        {p.is_captain && (
                          <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-yellow-400 text-[9px] font-black text-black border border-black/20 shadow">
                            C
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Name label */}
                    <div className="w-full rounded overflow-hidden shadow-lg border border-black/40">
                      <div className="w-full bg-[#37003c] px-0.5 py-[2px] text-center">
                        <span className="block truncate text-[9px] md:text-[10px] font-bold leading-none text-pure-white pb-0.5">
                          {p.web_name}
                        </span>
                      </div>
                      <div className="w-full bg-[#f1f5f9] px-0.5 py-[2px] text-center flex items-center justify-center">
                        <span className="text-[9px] md:text-[11px] font-black leading-none text-emerald-700">
                          {p.points} pts
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null
          )}
        </div>
      </div>
    </div>
  );
}

function FixtureCard({ f }: { f: any }) {
  const date = f.kickoff_time ? new Date(f.kickoff_time) : null;
  const isFinished = f.finished;
  // Show score whenever both scores are available (even before FPL marks as "finished")
  const hasScore = f.team_h_score !== null && f.team_a_score !== null;
  const homeWin = hasScore && f.team_h_score > f.team_a_score;
  const awayWin = hasScore && f.team_a_score > f.team_h_score;

  const getDiffColor = (d: number) =>
    d <= 2 ? "bg-emerald-500/15 text-emerald-600 border-emerald-400/30" :
    d === 3 ? "bg-slate-400/15 text-slate-600 border-slate-400/30" :
    d === 4 ? "bg-red-400/15 text-red-600 border-red-400/30" :
    "bg-red-900/20 text-red-700 border-red-500/30";

  return (
    <div className={cn(
      "glass-card p-4 flex flex-col transition-all",
      hasScore && "border-l-2 border-l-emerald-400"
    )}>
      <div className="text-[10px] text-slate-500 mb-3 flex items-center gap-1.5">
        <Calendar className="w-3 h-3 flex-shrink-0" />
        <span>
          {date
            ? date.toLocaleString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
            : "TBA"}
        </span>
        {isFinished && (
          <span className="ml-auto text-[9px] font-black uppercase tracking-wider text-emerald-600 bg-emerald-500/15 px-1.5 py-0.5 rounded border border-emerald-400/30">
            FT
          </span>
        )}
        {!isFinished && hasScore && (
          <span className="ml-auto text-[9px] font-black uppercase tracking-wider text-blue-600 bg-blue-500/15 px-1.5 py-0.5 rounded border border-blue-400/30">
            Kết quả
          </span>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto gap-2">
        {/* Home team */}
        <div className="flex items-center gap-2 w-2/5 min-w-0">
          <span className={cn("flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-[10px] font-black border", getDiffColor(f.team_h_difficulty))}>
            {f.team_h_difficulty}
          </span>
          <span className={cn("font-bold text-sm truncate", homeWin ? "text-emerald-600" : "text-slate-700")}>
            {f.team_h_name}
          </span>
        </div>

        {/* Score */}
        <div className="flex-1 flex justify-center items-center">
          {hasScore ? (
            <div className="flex items-center gap-1.5">
              <span className={cn("text-xl font-black", homeWin ? "text-emerald-600" : "text-slate-700")}>
                {f.team_h_score}
              </span>
              <span className="text-slate-400 font-bold text-sm">-</span>
              <span className={cn("text-xl font-black", awayWin ? "text-emerald-600" : "text-slate-700")}>
                {f.team_a_score}
              </span>
            </div>
          ) : (
            <span className="text-slate-400 font-bold text-lg">v</span>
          )}
        </div>

        {/* Away team */}
        <div className="flex items-center justify-end gap-2 w-2/5 min-w-0">
          <span className={cn("font-bold text-sm truncate text-right", awayWin ? "text-emerald-600" : "text-slate-700")}>
            {f.team_a_name}
          </span>
          <span className={cn("flex-shrink-0 w-6 h-6 flex items-center justify-center rounded text-[10px] font-black border", getDiffColor(f.team_a_difficulty))}>
            {f.team_a_difficulty}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function GameweeksPage() {
  const [selectedGwId, setSelectedGwId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"fixtures" | "dreamteam">("fixtures");
  const qc = useQueryClient();

  const { data: gws, isLoading: isLoadingGws } = useQuery({
    queryKey: ["gameweeks"],
    queryFn: () => fplApi.getGameweeks().then((r) => r.data),
  });

  const gwId = selectedGwId ?? gws?.find((g) => g.is_current)?.id ?? gws?.[0]?.id ?? 1;
  const currentGw = gws?.find((g) => g.id === gwId);

  const { data: fixtures, isLoading: isLoadingFix } = useQuery({
    queryKey: ["fixtures", gwId],
    queryFn: () => fplApi.getFixtures({ gameweek: gwId }).then((r) => r.data),
    enabled: !!gwId,
  });

  const { data: dreamTeam, isLoading: isLoadingDT, error: dtError } = useQuery({
    queryKey: ["dreamteam", gwId],
    queryFn: () => fplApi.getDreamTeam(gwId).then((r) => r.data),
    enabled: !!gwId && activeTab === "dreamteam",
    retry: false,
  });

  const syncMutation = useMutation({
    mutationFn: () => fplApi.sync(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fixtures", gwId] });
      qc.invalidateQueries({ queryKey: ["dreamteam", gwId] });
      qc.invalidateQueries({ queryKey: ["gameweeks"] });
    },
  });

  if (isLoadingGws) return <div className="p-6"><LoadingCard className="h-96" /></div>;

  return (
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3" style={{ color: "var(--gray-800)" }}>
            <BarChart3 className="w-6 h-6 text-blue-400" />
            Phân tích Gameweek
          </h1>
          <p className="text-slate-600 text-sm mt-1">Lịch thi đấu, kết quả và Dream Team các vòng đấu</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
        {/* Sidebar GW selection */}
        <div className="glass-card p-4 overflow-y-auto max-h-[75vh] custom-scrollbar">
          <h3 className="font-bold mb-3 text-sm px-2" style={{ color: "var(--gray-700)" }}>Chọn vòng đấu</h3>
          <div className="space-y-0.5">
            {gws?.map((gw) => (
              <button
                key={gw.id}
                onClick={() => { setSelectedGwId(gw.id); setActiveTab("fixtures"); }}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-between",
                  gwId === gw.id
                    ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                    : "text-slate-500 hover:bg-slate-100"
                )}
              >
                <span>{gw.name}</span>
                <div className="flex items-center gap-1">
                  {gw.finished && <span className="text-[9px] text-emerald-600 font-black">✓</span>}
                  {gw.is_current && <span className="text-[9px] uppercase tracking-wider bg-blue-500 text-white px-1.5 py-0.5 rounded">Live</span>}
                  {gw.is_next && <span className="text-[9px] uppercase tracking-wider text-slate-400">Next</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0">
          {/* Stats bar */}
          {currentGw && (
            <div className="grid grid-cols-3 gap-4 mb-5">
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Điểm TB</p>
                  <Target className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-2xl font-black" style={{ color: "var(--gray-800)" }}>{currentGw.average_entry_score ?? "—"}</p>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Điểm cao nhất</p>
                  <Trophy className="w-4 h-4 text-yellow-500" />
                </div>
                <p className="text-2xl font-black text-yellow-600">{currentGw.highest_score ?? "—"}</p>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Top Player</p>
                  <Star className="w-4 h-4 text-emerald-500" />
                </div>
                <p className="text-2xl font-black text-emerald-600">{currentGw.top_element ?? "—"}</p>
              </div>
            </div>
          )}

          {/* Tabs + Sync */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1 p-1 rounded-lg bg-slate-100 border border-slate-200">
              <button
                onClick={() => setActiveTab("fixtures")}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                  activeTab === "fixtures" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                📅 Lịch thi đấu
              </button>
            <button
                onClick={() => setActiveTab("dreamteam")}
                className={cn(
                  "px-4 py-1.5 rounded-md text-xs font-bold transition-all",
                  activeTab === "dreamteam" ? "bg-white text-yellow-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                🏆 Dream Team
              </button>
            </div>

            {/* Sync button — always visible */}
            <button
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg border transition-all text-slate-500 border-slate-300 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50"
            >
              <RefreshCw className={cn("w-3 h-3", syncMutation.isPending && "animate-spin")} />
              {syncMutation.isPending ? "Đang cập nhật..." : "Cập nhật kết quả"}
            </button>
          </div>

          {/* Tab content */}
          {activeTab === "fixtures" && (
            <>
              <h3 className="font-bold mb-4 text-base" style={{ color: "var(--gray-700)" }}>
                Lịch thi đấu GW{gwId}
                {currentGw?.finished && <span className="ml-2 text-[10px] text-emerald-600 font-black uppercase bg-emerald-500/10 px-2 py-0.5 rounded">Đã kết thúc</span>}
              </h3>
              {isLoadingFix ? (
                <LoadingCard className="h-48" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {fixtures?.map((f) => <FixtureCard key={f.id} f={f} />)}
                </div>
              )}
            </>
          )}

          {activeTab === "dreamteam" && (
            <div>
              <h3 className="font-bold mb-4 text-base flex items-center gap-2" style={{ color: "var(--gray-700)" }}>
                <Trophy className="w-4 h-4 text-yellow-500" />
                Dream Team GW{gwId}
              </h3>
              {isLoadingDT ? (
                <LoadingCard className="h-64" />
              ) : dtError ? (
                <div className="glass-card p-8 text-center text-slate-500">
                  <Trophy className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm font-bold text-slate-600 mb-1">Dream Team chưa có sẵn</p>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">FPL công bố Dream Team sau khi đã chốt điểm Bonus (thường 1-2 ngày sau khi vòng đấu kết thúc hoàn toàn).</p>
                </div>
              ) : dreamTeam?.team && dreamTeam.team.length > 0 ? (
                <div className="space-y-4">
                  <DreamTeamPitch team={dreamTeam.team} />
                  {/* Table */}
                  <div className="glass-card overflow-hidden">
                    <table className="table w-full text-sm">
                      <thead>
                        <tr>
                          <th className="text-left">Cầu thủ</th>
                          <th>Vị trí</th>
                          <th className="text-right">Điểm GW{gwId}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dreamTeam.team.map((p) => (
                          <tr key={p.player_id}>
                            <td className="flex items-center gap-2 font-semibold">
                              {p.web_name}
                              {p.is_captain && <span className="text-[9px] font-black bg-yellow-400/20 text-yellow-600 px-1.5 py-0.5 rounded border border-yellow-400/30">C</span>}
                            </td>
                            <td className="text-center">
                              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded border", POS_COLOR[p.position])}>{p.position}</span>
                            </td>
                            <td className="text-right font-black text-emerald-600">{p.points}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
