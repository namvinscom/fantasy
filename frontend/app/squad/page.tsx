"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import fplApi from "@/lib/api";
import { PositionBadge, ScoreBadge, StatusDot } from "@/components/ui/Badge";
import { LoadingCard } from "@/components/ui/Cards";
import { formatPrice } from "@/lib/utils";
import { Banknote, Plus, Shield, Shirt, Star, Trophy, WalletCards, RefreshCw, LayoutGrid, BarChart2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { SquadBuilder } from "@/components/ui/SquadBuilder";

// ─── Analytics Table ─────────────────────────────────────────────────────────
function SquadAnalyticsTable({ players }: { players: any[] }) {
  const sortedPlayers = [...players].sort((a, b) => {
    // Sort starters first, then by position
    if (a.is_starting !== b.is_starting) return b.is_starting ? 1 : -1;
    const ord: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
    return (ord[a.position] ?? 4) - (ord[b.position] ?? 4);
  });

  return (
    <div className="glass-card overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.05]">
              <th className="px-3 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider text-left">Vai trò</th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider text-left min-w-[140px]">Cầu thủ</th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider text-left">Vị trí</th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider text-right">Form</th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider text-right">xG</th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider text-right">xA</th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider text-right">FPL Score</th>
              <th className="px-3 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider text-left">Tình trạng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.03]">
            {sortedPlayers.map((p) => (
              <tr key={p.player_id} className={cn("hover:bg-white/[0.02] transition-colors", !p.is_starting && "opacity-60")}>
                <td className="px-3 py-3 text-xs font-semibold">
                  {p.is_starting ? (
                    <span className="text-emerald-400">Đá chính</span>
                  ) : (
                    <span className="text-slate-500">Dự bị {p.bench_order}</span>
                  )}
                  {p.is_captain && <span className="ml-1 text-yellow-400">(C)</span>}
                  {p.is_vice_captain && <span className="ml-1 text-slate-400">(V)</span>}
                </td>
                <td className="px-3 py-3">
                  <p className="font-semibold text-white text-sm leading-tight flex items-baseline gap-1.5">
                    {p.web_name}
                    <span className="text-[9px] text-slate-500 font-normal bg-white/5 px-1 rounded">ID: {p.player_id}</span>
                  </p>
                  <p className="text-[10px] text-slate-600 truncate max-w-[140px]">{p.name} · <span className="text-slate-400 font-medium">{p.team_name || p.team_short}</span></p>
                </td>
                <td className="px-3 py-3">
                  <PositionBadge position={p.position} showFull />
                </td>
                <td className="px-3 py-3 text-right text-slate-300 text-xs">{p.form?.toFixed(1) ?? "—"}</td>
                <td className="px-3 py-3 text-right text-slate-300 text-xs">{p.expected_goals != null ? p.expected_goals.toFixed(2) : "—"}</td>
                <td className="px-3 py-3 text-right text-slate-300 text-xs">{p.expected_assists != null ? p.expected_assists.toFixed(2) : "—"}</td>
                <td className="px-3 py-3 text-right">
                  <ScoreBadge score={p.fpl_score} />
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <StatusDot status={p.status} />
                    <span className="text-[11px] text-slate-500">
                      {p.status === 'a' ? 'Sẵn sàng' : p.status === 'd' ? 'Nghi ngờ' : p.status === 'i' ? 'Chấn thương' : p.status === 's' ? 'Treo giò' : 'Không rõ'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Pitch player card ─────────────────────────────────────────────────────────
function PitchPlayer({ player }: { player: any }) {
  const score = player.fpl_score;
  const isAvail = player.status === "a";

  return (
    <div className="flex flex-col items-center w-16 md:w-20">
      <div className="relative flex flex-col items-center mb-0.5">
        <div className="relative flex h-10 w-10 md:h-12 md:w-12 items-center justify-center">
          <Shirt className="h-full w-full text-white/95 drop-shadow-md" style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.5))" }} />
        </div>
        
        {player.is_captain && (
          <span className="absolute -right-1 top-0 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full bg-yellow-400 text-[9px] md:text-[10px] font-black text-black shadow-md border border-black/20">
            C
          </span>
        )}
        {player.is_vice_captain && !player.is_captain && (
          <span className="absolute -right-1 top-0 flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-full bg-slate-200 text-[9px] md:text-[10px] font-black text-black shadow-md border border-black/20">
            V
          </span>
        )}
      </div>

      <div className="w-full flex flex-col items-center rounded overflow-hidden shadow-lg border border-black/40">
        <div className={cn(
          "w-full px-0.5 py-[2px] text-center",
          !isAvail ? "bg-red-600" : "bg-[#37003c]"
        )}>
          <span className="block truncate text-[9px] md:text-[11px] font-bold leading-none text-pure-white pb-0.5">
            {player.web_name}
          </span>
        </div>
        <div className="w-full bg-[#f1f5f9] px-0.5 py-[2px] text-center flex items-center justify-center">
          <span className={cn(
            "text-[9px] md:text-[11px] font-black leading-none",
            score == null ? "text-slate-500"
            : score >= 72 ? "text-emerald-700"
            : score >= 55 ? "text-blue-700"
            : "text-slate-800"
          )}>
            {score != null ? score.toFixed(0) : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Pitch visualization ───────────────────────────────────────────────────────
function PitchView({ players }: { players: any[] }) {
  const starters = players.filter((p) => p.is_starting);
  const bench = players.filter((p) => !p.is_starting)
    .sort((a, b) => (a.bench_order ?? 99) - (b.bench_order ?? 99));

  const byPos: Record<string, any[]> = { GK: [], DEF: [], MID: [], FWD: [] };
  for (const p of starters) {
    if (byPos[p.position]) byPos[p.position].push(p);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 shadow-2xl">
      <div
        className="relative min-h-[560px] p-5 md:p-7"
        style={{ background: "linear-gradient(180deg, #0d5f37 0%, #168247 48%, #0d6539 100%)" }}
      >
        <div className="absolute left-8 right-8 top-1/2 h-px bg-white/15" />
        <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
        <div className="absolute left-1/2 top-7 h-24 w-56 -translate-x-1/2 rounded-b-full border border-t-0 border-white/15" />
        <div className="absolute bottom-7 left-1/2 h-24 w-56 -translate-x-1/2 rounded-t-full border border-b-0 border-white/15" />

        <div className="relative flex min-h-[500px] flex-col justify-around gap-5">
          {["FWD", "MID", "DEF", "GK"].map((pos) =>
            byPos[pos].length > 0 ? (
              <div key={pos} className="flex justify-center gap-4 md:gap-8">
                {byPos[pos].map((p) => <PitchPlayer key={p.player_id} player={p} />)}
              </div>
            ) : null
          )}
        </div>
      </div>

      {/* Bench */}
      {bench.length > 0 && (
        <div className="border-t border-white/10 bg-slate-950/85 px-6 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Ghế dự bị</p>
            <p className="text-[10px] text-slate-600">Thứ tự auto-sub từ trái qua phải</p>
          </div>
          <div className="flex justify-center gap-4 md:gap-8">
            {bench.map((p) => <PitchPlayer key={p.player_id} player={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Squad info panel ──────────────────────────────────────────────────────────
function SquadInfoPanel({ squad }: { squad: any }) {
  const { data: xiData } = useQuery({
    queryKey: ["xi"],
    queryFn: () => fplApi.getOptimalXI().then((r) => r.data),
    retry: false,
  });
  const { data: captainData } = useQuery({
    queryKey: ["captain"],
    queryFn: () => fplApi.getCaptainPicks().then((r) => r.data),
    retry: false,
  });
  const { data: transferData } = useQuery({
    queryKey: ["transfers"],
    queryFn: () => fplApi.getTransferRecommendations().then((r) => r.data),
    retry: false,
  });

  return (
    <div className="space-y-3">
      {/* Squad list */}
      <div className="glass-card p-4">
        <p className="section-title mb-3">Danh sách 15 cầu thủ</p>
        <div className="space-y-1">
          {squad.players
            .sort((a: any, b: any) => {
              const ord: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
              if (a.is_starting !== b.is_starting) return b.is_starting ? 1 : -1;
              return (ord[a.position] ?? 4) - (ord[b.position] ?? 4);
            })
            .map((p: any) => (
              <div
                key={p.player_id}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 rounded-lg",
                  !p.is_starting ? "opacity-40" : "hover:bg-white/[0.02]"
                )}
              >
                <PositionBadge position={p.position} showFull />
                <span className="flex-1 text-[12px] font-semibold text-white truncate">{p.web_name}</span>
                {p.is_captain && <span className="text-[10px] text-yellow-400 font-black">(C)</span>}
                {p.is_vice_captain && <span className="text-[10px] text-slate-400 font-black">(V)</span>}
                {!p.is_starting && <span className="text-[9px] text-slate-700">Dự bị</span>}
              </div>
            ))}
        </div>
      </div>

      {/* Recommended formation */}
      {xiData && (
        <div className="glass-card p-4">
          <p className="section-title mb-2">Formation đề xuất</p>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-black gradient-text">{xiData.formation}</span>
            <span className="text-[11px] text-slate-600">Tổng điểm: {xiData.total_score.toFixed(0)}</span>
          </div>
          {[
            { label: "TM", players: xiData.gk },
            { label: "HV", players: xiData.defenders },
            { label: "TV", players: xiData.midfielders },
            { label: "TĐ", players: xiData.forwards },
          ].map(({ label, players }) =>
            players.length > 0 ? (
              <div key={label} className="mb-1.5">
                <span className="text-[9px] text-slate-700 font-bold mr-2">{label}</span>
                {players.map((p) => (
                  <span key={p.id} className="text-[10px] text-slate-400 mr-2">{p.name?.split(" ").pop()}</span>
                ))}
              </div>
            ) : null
          )}
        </div>
      )}

      {/* Captain */}
      {captainData?.recommended_captain && (
        <div className="glass-card p-4">
          <p className="section-title mb-2">Captain đề xuất</p>
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="font-black text-yellow-400">{captainData.recommended_captain}</span>
          </div>
          {captainData.recommended_vc && (
            <p className="text-[11px] text-slate-600 mt-1">Phó: {captainData.recommended_vc}</p>
          )}
        </div>
      )}

      {/* Transfer Suggestions */}
      {transferData?.suggestions && transferData.suggestions.length > 0 && (
        <div className="glass-card p-4 border border-emerald-400/20 bg-emerald-950/20">
          <p className="section-title mb-3 text-emerald-300">Tư vấn chuyển nhượng</p>
          <div className="space-y-3">
            {transferData.suggestions.slice(0, 2).map((s: any, idx: number) => (
              <div key={idx} className="flex flex-col gap-1.5 p-2 bg-black/40 rounded border border-white/10">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-red-400 uppercase font-bold tracking-wider">OUT</span>
                    <span className="text-xs text-slate-300 line-through">{s.player_out_name}</span>
                  </div>
                  <RefreshCw className="w-4 h-4 text-slate-600" />
                  <div className="flex flex-col items-end">
                    <span className="text-[9px] text-emerald-400 uppercase font-bold tracking-wider">IN</span>
                    <span className="text-xs text-white font-bold">{s.player_in_name}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] text-slate-500">{s.reason}</span>
                  <span className={cn(
                    "text-[10px] font-black px-1.5 py-0.5 rounded",
                    s.net_gain > 5 ? "bg-emerald-500/20 text-emerald-400" : "bg-cyan-500/20 text-cyan-400"
                  )}>
                    +{s.net_gain.toFixed(1)} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


// ─── Main page ─────────────────────────────────────────────────────────────────
export default function SquadPage() {
  const [showInfo, setShowInfo] = useState(false);
  const [viewMode, setViewMode] = useState<"pitch" | "analytics">("pitch");
  const queryClient = useQueryClient();

  const syncMut = useMutation({
    mutationFn: () => fplApi.sync(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["squad"] });
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["squad"],
    queryFn: () => fplApi.getSquad().then((r) => r.data),
  });

  const squad = data?.squad;

  const { data: squadInfo } = useQuery({
    queryKey: ["squadInfo"],
    queryFn: () => fplApi.getSquadInfo().then((r) => r.data),
    enabled: !!squad?.fpl_team_id,
  });

  if (isLoading) return <div className="p-6"><LoadingCard className="h-96" /></div>;

  return (
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-200">
            <Trophy className="h-3.5 w-3.5" />
            Fantasy squad
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Đội của tôi</h1>
          <p className="mt-1 text-sm text-slate-500">
            {squad ? `GW${squad.gameweek} · Formation: ${squad.formation || "—"}` : "Chưa thiết lập squad"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => syncMut.mutate()}
            disabled={syncMut.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-white/[0.05] border border-white/10 rounded-lg text-sm font-bold text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw className={cn("w-4 h-4", syncMut.isPending && "animate-spin")} />
            {syncMut.isPending ? "Đang đồng bộ..." : "Đồng bộ FPL"}
          </button>
          <button
            id="btn-setup-squad"
            onClick={() => setShowInfo(true)}
            className="flex items-center gap-2 px-4 py-2 btn-primary text-sm"
          >
            <Plus className="w-4 h-4" />
            Thiết lập squad
          </button>
        </div>
      </div>

      {squad && (
        <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] w-fit mb-4">
          <button
            onClick={() => setViewMode("pitch")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === "pitch" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Sân Bóng
          </button>
          <button
            onClick={() => setViewMode("analytics")}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              viewMode === "analytics" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-400 hover:text-white"
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            Phân Tích Đội Hình
          </button>
        </div>
      )}

      {!squad ? (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900/70">
          <div className="grid min-h-[420px] grid-cols-1 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="flex flex-col justify-center p-8 md:p-10">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
                <Shield className="h-6 w-6" />
              </div>
              <h2 className="max-w-xl text-2xl font-black text-white">Tạo squad 15 cầu thủ giống FPL để mở transfer, captain và simulator.</h2>
              <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-400">
                Chọn formation, điền 11 cầu thủ đá chính, 4 dự bị, captain/vice và kiểm tra ngân sách ngay trong một màn hình.
              </p>
              <button onClick={() => setShowInfo(true)} className="btn-primary mt-6 flex w-fit items-center gap-2 px-5 py-3 text-sm">
                <Plus className="h-4 w-4" />
                Thiết lập squad
              </button>
            </div>
            <div
              className="relative hidden border-l border-white/10 p-6 lg:block"
              style={{ background: "linear-gradient(180deg, #0d5f37 0%, #168247 55%, #0f5f35 100%)" }}
            >
              <div className="absolute left-8 right-8 top-1/2 h-px bg-white/15" />
              <div className="absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15" />
              <div className="relative flex h-full flex-col justify-around">
                {[3, 4, 3, 1].map((count, row) => (
                  <div key={row} className="flex justify-center gap-5">
                    {Array.from({ length: count }).map((_, i) => (
                      <div key={i} className="h-14 w-12 rounded-md border border-white/25 bg-slate-950/45 shadow-lg" />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        viewMode === "pitch" ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Pitch + stats */}
            <div className="lg:col-span-2 space-y-4">
              {/* Quick stats */}
              <div className="grid grid-cols-5 gap-3">
                {[
                  { label: "Giá trị đội", value: formatPrice(squad.team_value), icon: WalletCards },
                  { label: "Ngân hàng", value: formatPrice(squad.bank), icon: Banknote },
                  { label: "Free Transfer", value: `${squad.free_transfers}FT`, icon: Plus },
                  { label: "Hạng tổng", value: squadInfo?.overall_rank ? squadInfo.overall_rank.toLocaleString() : (squad.overall_rank?.toLocaleString() ?? "—"), icon: Trophy },
                  { label: "Tổng điểm", value: squadInfo?.total_points ?? squad.total_points ?? "—", icon: Star },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.045] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-[10px] uppercase tracking-wider text-slate-500">{s.label}</p>
                      <s.icon className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                    <p className="text-lg font-black text-white">{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Pitch */}
              <PitchView players={squad.players} />
            </div>

            {/* Info panel */}
            <SquadInfoPanel squad={squad} />
          </div>
        ) : (
          <SquadAnalyticsTable players={squad.players} />
        )
      )}

      {showInfo && <SquadBuilder initialSquad={squad} onClose={() => setShowInfo(false)} />}
    </div>
  );
}
