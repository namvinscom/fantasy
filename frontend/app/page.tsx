"use client";
import { useQuery } from "@tanstack/react-query";
import fplApi from "@/lib/api";
import { StatCard, LoadingCard, EmptyState, SectionHeader } from "@/components/ui/Cards";
import { Badge, ScoreBadge, PositionBadge } from "@/components/ui/Badge";
import { formatPrice, formatBank, formatRank } from "@/lib/utils";
import {
  TrendingUp, AlertTriangle, ChevronRight,
  Star, Trophy, RefreshCw, Activity, Users,
  CircleDollarSign, Banknote, BarChart3
} from "lucide-react";
import Link from "next/link";

// ─── Header Stats ─────────────────────────────────────────────────────────────
function HeaderStats() {
  const { data: squad, isLoading: squadLoading } = useQuery({
    queryKey: ["squad"],
    queryFn: () => fplApi.getSquad().then((r) => r.data),
  });
  const { data: gwData, isLoading: gwLoading } = useQuery({
    queryKey: ["currentGW"],
    queryFn: () => fplApi.getCurrentGW().then((r) => r.data),
    retry: false,
  });

  if (squadLoading || gwLoading) return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {Array.from({ length: 6 }).map((_, i) => <LoadingCard key={i} className="h-24" />)}
    </div>
  );

  const s = squad?.squad;
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      <StatCard
        label="Gameweek"
        value={gwData ? `GW${gwData.id}` : "—"}
        sub={gwData?.name || "Chưa đồng bộ"}
        color="text-violet-400"
        icon={<Activity className="w-4 h-4" />}
      />
      <StatCard label="Điểm GW" value={s?.gameweek_points ?? "—"} sub="Tuần này" color="text-blue-400" />
      <StatCard label="Tổng điểm" value={s?.total_points ?? "—"} color="text-white" />
      <StatCard label="Xếp hạng tổng" value={s ? formatRank(s.overall_rank) : "—"} color="text-emerald-400" />
      <StatCard
        label="Giá trị đội"
        value={s ? formatPrice(s.team_value) : "—"}
        icon={<CircleDollarSign className="w-4 h-4" />}
      />
      <StatCard
        label="Ngân hàng / FT"
        value={s ? `${formatBank(s.bank)}` : "—"}
        sub={s ? `${s.free_transfers} Free Transfer` : "—"}
        color="text-yellow-400"
      />
    </div>
  );
}

// ─── Transfer Panel ────────────────────────────────────────────────────────────
function TransferPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["transfers"],
    queryFn: () => fplApi.getTransferRecommendations().then((r) => r.data),
    retry: false,
  });

  if (isLoading) return <LoadingCard className="h-44" />;
  if (!data?.suggestions?.length) {
    return (
      <EmptyState
        message="Chưa có squad. Thiết lập đội hình để nhận đề xuất transfer phù hợp."
        icon={<AlertTriangle className="w-7 h-7" />}
        action={
          <Link href="/squad" className="text-xs text-violet-400 hover:text-violet-300 underline">
            Thiết lập đội →
          </Link>
        }
      />
    );
  }

  const top = data.suggestions[0];
  const isPositive = top.net_gain > 0;

  return (
    <div className="elevated-card p-5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-bold uppercase tracking-wider text-violet-400">Đề xuất tốt nhất</span>
        {data.free_transfers > 0 && (
          <span className="ml-auto text-[10px] bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
            {data.free_transfers}FT Miễn phí
          </span>
        )}
      </div>

      {/* Players comparison */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 p-3 rounded-xl border border-red-500/15 bg-red-500/5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">Bán</p>
          <p className="font-bold text-white text-sm">{top.player_out}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Điểm: {top.player_out_score.toFixed(0)}</p>
        </div>
        <div className="flex flex-col items-center">
          <ChevronRight className="w-5 h-5 text-slate-600" />
          <span className={cn_simple(
            "text-[10px] font-bold mt-1",
            isPositive ? "text-emerald-400" : "text-red-400"
          )}>
            {isPositive ? `+${top.net_gain}` : top.net_gain}
          </span>
        </div>
        <div className="flex-1 p-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">Mua</p>
          <p className="font-bold text-white text-sm">{top.player_in}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Điểm: {top.player_in_score.toFixed(0)}</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.06]">
        <div className="text-center">
          <p className="text-[10px] text-slate-600 mb-0.5">Tăng điểm</p>
          <p className={`text-sm font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {isPositive ? "+" : ""}{top.net_gain}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-600 mb-0.5">Chi phí</p>
          <p className={`text-sm font-bold ${top.transfer_cost === 0 ? "text-emerald-400" : "text-red-400"}`}>
            {top.transfer_cost === 0 ? "Miễn phí" : `-${top.transfer_cost}đ`}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-slate-600 mb-0.5">Độ tin cậy</p>
          <p className="text-sm font-bold text-white">{top.confidence}%</p>
        </div>
      </div>

      <div className="mt-3 flex justify-between items-center">
        <p className="text-[11px] text-slate-600 flex-1 mr-3 line-clamp-1">{top.reason}</p>
        <Badge label={top.recommendation} variant={top.recommendation.toLowerCase() as "buy" | "hold"} />
      </div>
    </div>
  );
}

// ─── Captain Panel ─────────────────────────────────────────────────────────────
function CaptainPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["captain"],
    queryFn: () => fplApi.getCaptainPicks().then((r) => r.data),
    retry: false,
  });

  if (isLoading) return <LoadingCard className="h-52" />;
  if (!data?.candidates?.length) {
    return (
      <EmptyState
        message="Thiết lập đội hình để nhận gợi ý captain."
        icon={<Star className="w-7 h-7" />}
      />
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Star className="w-4 h-4 text-yellow-400" />
        <p className="text-xs font-bold uppercase tracking-wider text-yellow-400">Gợi ý Captain</p>
      </div>
      <div className="space-y-2">
        {data.candidates.slice(0, 3).map((c, i) => (
          <div key={c.player_id} className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-colors ${i === 0 ? "bg-yellow-500/8 border border-yellow-500/15" : "hover:bg-white/[0.02]"}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 ${
              i === 0 ? "bg-yellow-500 text-black" : "bg-slate-800 text-slate-400"
            }`}>
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className={`font-bold text-sm truncate ${i === 0 ? "text-yellow-300" : "text-white"}`}>
                {c.player_name}
              </p>
              <p className="text-[10px] text-slate-600 truncate">
                {c.reasons.slice(0, 2).join(" · ") || "Tính toán đang cập nhật"}
              </p>
            </div>
            <span className={`font-black text-sm tabular-nums ${i === 0 ? "text-yellow-400" : "text-slate-400"}`}>
              {c.captain_score.toFixed(0)}
            </span>
          </div>
        ))}
      </div>
      {data.recommended_captain && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <p className="text-[10px] text-slate-600 mb-1 uppercase tracking-wider">Captain đề xuất</p>
          <p className="font-black text-yellow-400">{data.recommended_captain}</p>
          {data.recommended_vc && (
            <p className="text-[11px] text-slate-500 mt-0.5">Phó: {data.recommended_vc}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Top Players Panel ─────────────────────────────────────────────────────────
function TopPlayersPanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["topPlayers"],
    queryFn: () => fplApi.getPlayers({ sort_by: "fpl_score", limit: 5 }).then((r) => r.data),
  });

  if (isLoading) return <LoadingCard className="h-56" />;
  if (!data?.players?.length) {
    return (
      <EmptyState
        message="Không có dữ liệu. Nhấn 'Đồng bộ FPL' để tải dữ liệu."
        action={<span className="text-[10px] text-slate-600">Dùng nút bên trái</span>}
      />
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" />
          <p className="text-xs font-bold uppercase tracking-wider text-blue-400">Mua ngay</p>
        </div>
        <Link href="/players" className="text-[10px] text-slate-600 hover:text-slate-400">
          Xem tất cả →
        </Link>
      </div>
      <div className="space-y-2">
        {data.players.map((p, i) => (
          <div key={p.id} className="flex items-center gap-2.5 py-1.5">
            <span className="text-[11px] text-slate-700 w-4 shrink-0 text-right">{i + 1}</span>
            <PositionBadge position={p.position} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{p.web_name}</p>
              <p className="text-[10px] text-slate-600">{p.price_display} · {p.selected_by_percent?.toFixed(1)}% sở hữu</p>
            </div>
            <ScoreBadge score={p.fpl_score} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Fixture Alerts ────────────────────────────────────────────────────────────
function FixtureAlerts() {
  const { data, isLoading } = useQuery({
    queryKey: ["fixtureDifficulty"],
    queryFn: () => fplApi.getFixtureDifficulty(5).then((r) => r.data),
  });

  if (isLoading) return <LoadingCard className="h-40" />;
  const alerts = data?.filter((r) => r.swing_alert).slice(0, 4);
  if (!alerts?.length) {
    return (
      <div className="glass-card p-4">
        <p className="text-xs text-slate-600 text-center">Không có cảnh báo lịch thi đấu</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-yellow-400" />
        <p className="text-xs font-bold uppercase tracking-wider text-yellow-400">Cảnh báo lịch</p>
      </div>
      <div className="space-y-2.5">
        {alerts.map((row) => (
          <div key={row.team_id} className="border-l-2 border-yellow-500/40 pl-3 py-0.5">
            <p className="text-sm font-bold text-white">{row.team_name}</p>
            <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{row.swing_alert}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chips Panel ───────────────────────────────────────────────────────────────
function ChipsPanel() {
  const { data } = useQuery({
    queryKey: ["squad"],
    queryFn: () => fplApi.getSquad().then((r) => r.data),
  });

  const chips = data?.squad?.chips;
  const chipList = [
    { key: "wildcard_1", label: "Wildcard 1", phase: "GW1-19" },
    { key: "wildcard_2", label: "Wildcard 2", phase: "GW20-38" },
    { key: "freehit_1", label: "Free Hit 1", phase: "GW1-19" },
    { key: "freehit_2", label: "Free Hit 2", phase: "GW20-38" },
    { key: "bench_boost", label: "Bench Boost", phase: "Bất kỳ" },
    { key: "triple_captain", label: "Triple Captain", phase: "Bất kỳ" },
  ];

  return (
    <div className="glass-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-violet-400" />
        <p className="text-xs font-bold uppercase tracking-wider text-violet-400">Chip</p>
      </div>
      <div className="space-y-2">
        {chipList.map((chip) => {
          const used = chips ? (chips as Record<string, boolean>)[chip.key] : false;
          return (
            <div key={chip.key} className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-white">{chip.label}</p>
                <p className="text-[10px] text-slate-700">{chip.phase}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                used
                  ? "bg-red-500/15 text-red-400 border border-red-500/20"
                  : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
              }`}>
                {used ? "Đã dùng" : "Còn"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// helper
function cn_simple(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: syncStatus } = useQuery({
    queryKey: ["syncStatus"],
    queryFn: () => fplApi.getSyncStatus().then((r) => r.data),
    staleTime: 60_000,
  });

  const isLive = syncStatus?.[0]?.status === "success";

  return (
    <div className="p-6 fade-in max-w-[1400px]">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight leading-none">
            Namvinscom <span className="gradient-text">Fantasy</span>
          </h1>
          <p className="text-slate-600 text-sm mt-1.5">
            Phân tích & hỗ trợ quyết định FPL · Mùa 2026/27
          </p>
        </div>
        {isLive && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/8">
            <span className="w-2 h-2 rounded-full bg-emerald-500 live-dot" />
            <span className="text-[11px] font-semibold text-emerald-400">Dữ liệu thực</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <HeaderStats />

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left — 2 cols */}
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader
            title="Đề xuất Transfer"
            sub="Tính toán dựa trên điểm FPL, fixture, xGI và phút thi đấu"
          />
          <TransferPanel />

          <SectionHeader
            title="Nên mua ngay"
            sub="Xếp hạng theo điểm FPL tổng hợp"
          />
          <TopPlayersPanel />

          <SectionHeader
            title="Cảnh báo lịch thi đấu"
            sub="5 GW tiếp theo — biến động độ khó (FDR)"
          />
          <FixtureAlerts />
        </div>

        {/* Right — 1 col */}
        <div className="space-y-4">
          <SectionHeader title="Captain tuần này" />
          <CaptainPanel />

          <SectionHeader title="Trạng thái Chip" />
          <ChipsPanel />
        </div>
      </div>
    </div>
  );
}
