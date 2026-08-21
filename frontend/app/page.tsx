"use client";
import { useQuery } from "@tanstack/react-query";
import fplApi from "@/lib/api";
import { StatCard, LoadingCard, EmptyState, SectionHeader } from "@/components/ui/Cards";
import { Badge, ScoreBadge, PositionBadge } from "@/components/ui/Badge";
import { formatPrice, formatBank, formatRank } from "@/lib/utils";
import {
  TrendingUp, AlertTriangle, ChevronRight,
  Star, Trophy, Activity, Users,
  CircleDollarSign, Sparkles, Flame, Target, CalendarDays
} from "lucide-react";
import Link from "next/link";

function cn(...c: (string | false | null | undefined)[]) { return c.filter(Boolean).join(" "); }

// ─── Header Stats ──────────────────────────────────────────────────────────────
function HeaderStats() {
  const { data: squad } = useQuery({ queryKey: ["squad"], queryFn: () => fplApi.getSquad().then(r => r.data) });
  const { data: gwData } = useQuery({ queryKey: ["currentGW"], queryFn: () => fplApi.getCurrentGW().then(r => r.data), retry: false });
  const s = squad?.squad;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 14, marginBottom: 24 }}>
      <StatCard label="Gameweek" value={gwData ? `GW${gwData.id}` : "—"} sub={gwData?.name || "Chưa sync"} icon={<Activity />} iconVariant="primary" />
      <StatCard label="Điểm GW" value={s?.gameweek_points ?? "—"} sub="Tuần này" icon={<TrendingUp />} iconVariant="info" />
      <StatCard label="Tổng điểm" value={s?.total_points ?? "—"} icon={<Trophy />} iconVariant="success" />
      <StatCard label="Xếp hạng" value={s ? formatRank(s.overall_rank) : "—"} icon={<Star />} iconVariant="warning" />
      <StatCard label="Giá trị đội" value={s ? formatPrice(s.team_value) : "—"} icon={<CircleDollarSign />} iconVariant="primary" />
      <StatCard label="Ngân hàng / FT" value={s ? formatBank(s.bank) : "—"} sub={s ? `${s.free_transfers} Free Transfer` : "—"} icon={<Sparkles />} iconVariant="success" />
    </div>
  );
}

// ─── Transfer Panel ────────────────────────────────────────────────────────────
function TransferPanel() {
  const { data, isLoading } = useQuery({ queryKey: ["transfers"], queryFn: () => fplApi.getTransferRecommendations().then(r => r.data), retry: false });
  if (isLoading) return <LoadingCard className="h-44" />;
  if (!data?.suggestions?.length) return <EmptyState message="Chưa có squad. Thiết lập đội hình để nhận đề xuất transfer." icon={<AlertTriangle />} action={<Link href="/squad" style={{ fontSize: 12, color: "var(--primary)" }}>Thiết lập đội →</Link>} />;
  const top = data.suggestions[0];
  const gain = top.net_gain > 0;
  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <TrendingUp style={{ width: 16, height: 16, color: "var(--primary)" }} /> Đề xuất tốt nhất
        </h3>
        {data.free_transfers > 0 && <span className="badge badge-success">{data.free_transfers} FT Miễn phí</span>}
      </div>
      <div className="card-body">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ flex: 1, padding: "12px 14px", borderRadius: 8, background: "rgba(251,44,54,0.05)", border: "1px solid rgba(251,44,54,0.15)" }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--danger)", marginBottom: 4 }}>Bán</p>
            <p style={{ fontWeight: 700, color: "#262626", fontSize: 14 }}>{top.player_out_name}</p>
            <p style={{ fontSize: 11, color: "#737373", marginTop: 2 }}>Điểm: {top.player_out_score.toFixed(0)}</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <ChevronRight style={{ width: 20, height: 20, color: "#a3a3a3" }} />
            <p style={{ fontSize: 10, fontWeight: 700, color: gain ? "var(--success)" : "var(--danger)", marginTop: 2 }}>{gain ? `+${top.net_gain}` : top.net_gain}</p>
          </div>
          <div style={{ flex: 1, padding: "12px 14px", borderRadius: 8, background: "rgba(0,201,81,0.05)", border: "1px solid rgba(0,201,81,0.15)" }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", color: "var(--success)", marginBottom: 4 }}>Mua</p>
            <p style={{ fontWeight: 700, color: "#262626", fontSize: 14 }}>{top.player_in_name}</p>
            <p style={{ fontSize: 11, color: "#737373", marginTop: 2 }}>Điểm: {top.player_in_score.toFixed(0)}</p>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, paddingTop: 12, borderTop: "1px solid #e5e5e5" }}>
          {[["Tăng điểm", gain ? `+${top.net_gain}` : `${top.net_gain}`, gain ? "var(--success)" : "var(--danger)"],
            ["Chi phí", top.transfer_cost === 0 ? "Miễn phí" : `-${top.transfer_cost}đ`, top.transfer_cost === 0 ? "var(--success)" : "var(--danger)"],
            ["Tin cậy", `${top.confidence}%`, "var(--primary)"]
          ].map(([label, val, color]) => (
            <div key={label as string} style={{ textAlign: "center" }}>
              <p style={{ fontSize: 10, color: "#737373", marginBottom: 3 }}>{label}</p>
              <p style={{ fontSize: 14, fontWeight: 700, color: color as string }}>{val}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <p style={{ fontSize: 11, color: "#737373", flex: 1, marginRight: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{top.reason}</p>
          <Badge label={top.recommendation} variant={top.recommendation.toLowerCase() as "buy" | "hold"} />
        </div>
      </div>
    </div>
  );
}

// ─── Captain Panel ─────────────────────────────────────────────────────────────
function CaptainPanel() {
  const { data, isLoading } = useQuery({ queryKey: ["captain"], queryFn: () => fplApi.getCaptainPicks().then(r => r.data), retry: false });
  if (isLoading) return <LoadingCard className="h-52" />;
  if (!data?.candidates?.length) return <EmptyState message="Thiết lập đội hình để nhận gợi ý captain." icon={<Star />} />;
  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Star style={{ width: 16, height: 16, color: "var(--warning)" }} /> Gợi ý Captain</h3>
      </div>
      <div style={{ padding: 0 }}>
        {data.candidates.slice(0, 3).map((c, i) => (
          <div key={c.player_id} className="list-item" style={i === 0 ? { background: "rgba(240,177,0,0.05)" } : {}}>
            <span style={{ width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 800, background: i === 0 ? "var(--warning)" : "#e5e5e5", color: i === 0 ? "#fff" : "#525252" }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: "#262626", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.player_name}</p>
              <p style={{ fontSize: 11, color: "#737373", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.reasons.slice(0, 2).join(" · ") || "—"}</p>
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, color: i === 0 ? "var(--warning)" : "#a3a3a3", flexShrink: 0 }}>{c.captain_score.toFixed(0)}</span>
          </div>
        ))}
      </div>
      {data.recommended_captain && (
        <div style={{ padding: "12px 20px", borderTop: "1px solid #e5e5e5", background: "#fafafa", borderRadius: "0 0 12px 12px" }}>
          <p style={{ fontSize: 10, color: "#737373", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>Captain đề xuất</p>
          <p style={{ fontWeight: 800, color: "var(--warning)", fontSize: 15 }}>{data.recommended_captain}</p>
          {data.recommended_vc && <p style={{ fontSize: 12, color: "#737373", marginTop: 2 }}>Phó: {data.recommended_vc}</p>}
        </div>
      )}
    </div>
  );
}

// ─── Top FPL Score Players ─────────────────────────────────────────────────────
function TopPlayersPanel() {
  const { data, isLoading } = useQuery({ queryKey: ["topPlayers"], queryFn: () => fplApi.getPlayers({ sort_by: "fpl_score", limit: 5 }).then(r => r.data) });
  if (isLoading) return <LoadingCard className="h-56" />;
  if (!data?.players?.length) return <EmptyState message="Không có dữ liệu. Đồng bộ FPL để tải." icon={<Users />} />;
  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Users style={{ width: 16, height: 16, color: "var(--info)" }} /> Nên mua ngay</h3>
        <Link href="/players" style={{ fontSize: 12, color: "var(--primary)" }}>Xem tất cả →</Link>
      </div>
      <div style={{ padding: 0 }}>
        {data.players.map((p, i) => (
          <div key={p.id} className="list-item">
            <span style={{ fontSize: 11, color: "#a3a3a3", width: 16, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
            <PositionBadge position={p.position} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: "#262626", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.web_name}</p>
              <p style={{ fontSize: 11, color: "#737373" }}>{p.price_display} · {p.selected_by_percent?.toFixed(1)}% sở hữu</p>
            </div>
            <ScoreBadge score={p.fpl_score} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Top Form Players ──────────────────────────────────────────────────────────
function TopFormPanel() {
  const { data, isLoading } = useQuery({ queryKey: ["topForm"], queryFn: () => fplApi.getPlayers({ sort_by: "form", limit: 5 }).then(r => r.data) });
  if (isLoading) return <LoadingCard className="h-56" />;
  if (!data?.players?.length) return null;
  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Flame style={{ width: 16, height: 16, color: "var(--danger)" }} /> Top Phong Độ</h3>
      </div>
      <div style={{ padding: 0 }}>
        {data.players.map((p, i) => (
          <div key={p.id} className="list-item">
            <span style={{ fontSize: 11, color: "#a3a3a3", width: 16, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
            <PositionBadge position={p.position} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: "#262626", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.web_name}</p>
              <p style={{ fontSize: 11, color: "#737373" }}>{p.price_display} · {p.team_short}</p>
            </div>
            <span className="badge badge-danger">{p.form?.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Top xGI Players ──────────────────────────────────────────────────────────
function TopXGIPanel() {
  const { data, isLoading } = useQuery({ queryKey: ["topXGI"], queryFn: () => fplApi.getPlayers({ sort_by: "expected_goal_involvements", limit: 5 }).then(r => r.data) });
  if (isLoading) return <LoadingCard className="h-56" />;
  if (!data?.players?.length) return null;
  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Target style={{ width: 16, height: 16, color: "var(--info)" }} /> Top xGI</h3>
      </div>
      <div style={{ padding: 0 }}>
        {data.players.map((p, i) => (
          <div key={p.id} className="list-item">
            <span style={{ fontSize: 11, color: "#a3a3a3", width: 16, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
            <PositionBadge position={p.position} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 600, fontSize: 14, color: "#262626", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.web_name}</p>
              <p style={{ fontSize: 11, color: "#737373" }}>{p.price_display} · {p.team_short}</p>
            </div>
            <span className="badge badge-info">{p.expected_goal_involvements?.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Favorable Fixtures ────────────────────────────────────────────────────────
function FavorableFixturesPanel() {
  const { data, isLoading } = useQuery({ queryKey: ["fixtureDifficulty"], queryFn: () => fplApi.getFixtureDifficulty(5).then(r => r.data) });
  if (isLoading) return <LoadingCard className="h-56" />;
  const sorted = [...(data || [])].sort((a, b) => (a.avg_fdr_5 || 0) - (b.avg_fdr_5 || 0)).slice(0, 5);
  if (!sorted.length) return null;
  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><CalendarDays style={{ width: 16, height: 16, color: "var(--success)" }} /> Lịch thi đấu thuận lợi</h3>
      </div>
      <div style={{ padding: "8px 0" }}>
        {sorted.map((row, i) => (
          <div key={row.team_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 11, color: "#a3a3a3", width: 16, flexShrink: 0 }}>{i + 1}</span>
              <p style={{ fontWeight: 600, fontSize: 13, color: "#262626", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.team_name}</p>
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              {row.gw_fixtures.slice(0, 5).map((f, j) => (
                <div key={j} className={cn(
                  "badge",
                  f.color === "green" ? "badge-success" : f.color === "red" ? "badge-danger" : "badge-warning"
                )} style={{ width: 28, justifyContent: "center", fontSize: 9 }}>
                  {f.opponent_short}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Fixture Alerts ────────────────────────────────────────────────────────────
function FixtureAlerts() {
  const { data, isLoading } = useQuery({ queryKey: ["fixtureDifficulty"], queryFn: () => fplApi.getFixtureDifficulty(5).then(r => r.data) });
  if (isLoading) return <LoadingCard className="h-40" />;
  const alerts = data?.filter(r => r.swing_alert).slice(0, 4);
  if (!alerts?.length) return <div className="card"><div style={{ padding: "16px 20px", fontSize: 13, color: "#737373", textAlign: "center" }}>Không có cảnh báo lịch thi đấu</div></div>;
  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><AlertTriangle style={{ width: 16, height: 16, color: "var(--warning)" }} /> Cảnh báo lịch</h3>
      </div>
      <div style={{ padding: "8px 0" }}>
        {alerts.map(row => (
          <div key={row.team_id} style={{ padding: "10px 20px", borderBottom: "1px solid #f5f5f5", borderLeft: "3px solid var(--warning)", marginLeft: 12, marginBottom: 8, borderRadius: "0 6px 6px 0" }}>
            <p style={{ fontWeight: 600, fontSize: 14, color: "#262626" }}>{row.team_name}</p>
            <p style={{ fontSize: 11, color: "#737373", marginTop: 2 }}>{row.swing_alert}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Chips Panel ───────────────────────────────────────────────────────────────
function ChipsPanel() {
  const { data } = useQuery({ queryKey: ["squad"], queryFn: () => fplApi.getSquad().then(r => r.data) });
  const chips = data?.squad?.chips;
  const chipList = [
    { key: "wildcard_1", label: "Wildcard 1", phase: "GW1–19" },
    { key: "wildcard_2", label: "Wildcard 2", phase: "GW20–38" },
    { key: "freehit_1", label: "Free Hit 1", phase: "GW1–19" },
    { key: "freehit_2", label: "Free Hit 2", phase: "GW20–38" },
    { key: "bench_boost", label: "Bench Boost", phase: "Bất kỳ" },
    { key: "triple_captain", label: "Triple Captain", phase: "Bất kỳ" },
  ];
  return (
    <div className="card">
      <div className="card-header">
        <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}><Trophy style={{ width: 16, height: 16, color: "var(--primary)" }} /> Trạng thái Chip</h3>
      </div>
      <div style={{ padding: "8px 0" }}>
        {chipList.map(chip => {
          const used = chips ? (chips as Record<string, boolean>)[chip.key] : false;
          return (
            <div key={chip.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 20px" }}>
              <div>
                <p style={{ fontWeight: 500, fontSize: 13, color: "#262626" }}>{chip.label}</p>
                <p style={{ fontSize: 11, color: "#a3a3a3" }}>{chip.phase}</p>
              </div>
              <span className={used ? "chip-used" : "chip-available"}>{used ? "Đã dùng" : "Còn"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Dashboard ────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: syncStatus } = useQuery({ queryKey: ["syncStatus"], queryFn: () => fplApi.getSyncStatus().then(r => r.data), staleTime: 60_000 });
  const isLive = syncStatus?.logs?.[0]?.status === "success";

  return (
    <div className="page-content fade-in">
      {/* Page header */}
      <div className="page-header" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <h1>Dashboard <span style={{ color: "var(--primary)" }}>Fantasy</span></h1>
          <p>Phân tích &amp; hỗ trợ quyết định FPL · Mùa 2026/27</p>
        </div>
        {isLive && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: "rgba(0,201,81,0.08)", border: "1px solid rgba(0,201,81,0.2)" }}>
            <span className="live-dot" style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--success)", display: "inline-block" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "#00a843" }}>Dữ liệu thực</span>
          </div>
        )}
      </div>

      {/* Header stats */}
      <HeaderStats />

      {/* Main grid — 3 columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
        {/* Column 1 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <SectionHeader title="Đề xuất Transfer" sub="Tính toán tổng hợp FPL + Fixture" />
          <TransferPanel />
          <SectionHeader title="Captain tuần này" />
          <CaptainPanel />
          <SectionHeader title="Trạng thái Chip" />
          <ChipsPanel />
        </div>
        {/* Column 2 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <SectionHeader title="Nên mua ngay" sub="Theo điểm FPL tổng hợp" />
          <TopPlayersPanel />
          <SectionHeader title="Top Phong Độ" sub="Cầu thủ đang bay cao nhất" />
          <TopFormPanel />
          <SectionHeader title="Top xGI" sub="Đóng góp bàn thắng kỳ vọng cao" />
          <TopXGIPanel />
        </div>
        {/* Column 3 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <SectionHeader title="Lịch thi đấu thuận lợi" sub="5 vòng tới — FDR thấp nhất" />
          <FavorableFixturesPanel />
          <SectionHeader title="Cảnh báo lịch thi đấu" sub="Biến động FDR đáng chú ý" />
          <FixtureAlerts />
        </div>
      </div>
    </div>
  );
}
