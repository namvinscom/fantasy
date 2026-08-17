"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import fplApi from "@/lib/api";
import { PositionBadge } from "@/components/ui/Badge";
import { LoadingCard } from "@/components/ui/Cards";
import { formatPrice } from "@/lib/utils";
import { Banknote, Plus, Shield, Shirt, Star, Trophy, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import { SquadBuilder } from "@/components/ui/SquadBuilder";

// ─── Pitch player card ─────────────────────────────────────────────────────────
function PitchPlayer({ player }: { player: any }) {
  const score = player.fpl_score;
  const isAvail = player.status === "a";

  return (
    <div className="flex min-w-[72px] flex-col items-center gap-1">
      <div className="relative flex flex-col items-center">
        <div className={cn(
          "relative flex h-16 w-14 items-center justify-center overflow-hidden rounded-md border shadow-lg transition-colors",
          !isAvail
            ? "border-red-300/70 bg-red-950/60"
            : "border-white/25 bg-slate-950/55"
        )}>
          <div className="absolute inset-x-0 top-0 h-7 bg-gradient-to-b from-white/16 to-transparent" />
          <Shirt className="h-7 w-7 text-white/85" />
          <div className="absolute inset-x-0 bottom-0 bg-black/75 px-1 py-1">
            <span className="block truncate text-center text-[10px] font-black leading-none text-white">
              {player.web_name}
            </span>
          </div>
        </div>
        {player.is_captain && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-yellow-400 text-[9px] font-black text-black shadow-sm">
            C
          </span>
        )}
        {player.is_vice_captain && !player.is_captain && (
          <span className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[9px] font-black text-black shadow-sm">
            V
          </span>
        )}
      </div>
      <div className="flex items-center gap-1 rounded bg-black/55 px-1.5 py-0.5">
        <PositionBadge position={player.position} />
        <span className={cn(
          "text-[10px] font-black tabular-nums",
          score == null ? "text-slate-500"
          : score >= 72 ? "text-emerald-300"
          : score >= 55 ? "text-cyan-300"
          : "text-yellow-300"
        )}>
          {score != null ? score.toFixed(0) : "—"}
        </span>
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
    </div>
  );
}


// ─── Main page ─────────────────────────────────────────────────────────────────
export default function SquadPage() {
  const [showInfo, setShowInfo] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["squad"],
    queryFn: () => fplApi.getSquad().then((r) => r.data),
  });

  if (isLoading) return <div className="p-6"><LoadingCard className="h-96" /></div>;

  const squad = data?.squad;

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
        <button
          id="btn-setup-squad"
          onClick={() => setShowInfo(true)}
          className="flex items-center gap-2 px-4 py-2 btn-primary text-sm"
        >
          <Plus className="w-4 h-4" />
          Thiết lập squad
        </button>
      </div>

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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pitch + stats */}
          <div className="lg:col-span-2 space-y-4">
            {/* Quick stats */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Giá trị đội", value: formatPrice(squad.team_value), icon: WalletCards },
                { label: "Ngân hàng", value: formatPrice(squad.bank), icon: Banknote },
                { label: "Free Transfer", value: `${squad.free_transfers}FT`, icon: Plus },
                { label: "Tổng điểm", value: squad.total_points ?? "—", icon: Trophy },
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
      )}

      {showInfo && <SquadBuilder onClose={() => setShowInfo(false)} />}
    </div>
  );
}
