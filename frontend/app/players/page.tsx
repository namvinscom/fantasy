"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import fplApi, { type Player } from "@/lib/api";
import { Badge, PositionBadge, ScoreBadge, StatusDot } from "@/components/ui/Badge";
import { LoadingCard, EmptyState } from "@/components/ui/Cards";
import { formatPrice, getStatusLabel } from "@/lib/utils";
import { Search, SlidersHorizontal, ChevronLeft, ChevronRight } from "lucide-react";

const POSITIONS = [
  { value: "All", label: "Tất cả" },
  { value: "GK", label: "Thủ môn" },
  { value: "DEF", label: "Hậu vệ" },
  { value: "MID", label: "Tiền vệ" },
  { value: "FWD", label: "Tiền đạo" },
];

const SORT_OPTIONS = [
  { value: "fpl_score", label: "Điểm FPL" },
  { value: "total_points", label: "Tổng điểm" },
  { value: "price", label: "Giá tiền" },
  { value: "form", label: "Phong độ" },
  { value: "ownership", label: "% Sở hữu" },
  { value: "expected_goals", label: "xG" },
  { value: "expected_assists", label: "xA" },
];

const STATUS_LABELS: Record<string, string> = {
  a: "Sẵn sàng",
  d: "Nghi ngờ",
  i: "Chấn thương",
  s: "Treo giò",
  u: "Không sẵn",
  n: "Không đủ dk",
};

function RecLabel({ score, status }: { score: number | null; status: string }) {
  if (["i", "s", "u", "n"].includes(status)) return <Badge label="SELL" variant="sell" />;
  if (score == null) return <span className="text-slate-700 text-xs">—</span>;
  if (score >= 72) return <Badge label="BUY" variant="buy" />;
  if (score >= 55) return <Badge label="HOLD" variant="hold" />;
  if (score >= 40) return <Badge label="WATCH" variant="watch" />;
  return <Badge label="SELL" variant="sell" />;
}

export default function PlayersPage() {
  const [position, setPosition] = useState("All");
  const [sortBy, setSortBy] = useState("fpl_score");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const limit = 30;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["players", position, sortBy, search, page],
    queryFn: () =>
      fplApi.getPlayers({
        position: position === "All" ? undefined : position,
        sort_by: sortBy,
        search: search || undefined,
        limit,
        offset: page * limit,
      }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  return (
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-black text-white tracking-tight">Cơ sở dữ liệu cầu thủ</h1>
        <p className="text-slate-600 text-sm mt-1">
          {data ? `${data.total.toLocaleString()} cầu thủ` : "Tải dữ liệu..."} · Lọc, sắp xếp và tìm kiếm
        </p>
      </div>

      {/* Filters bar */}
      <div className="glass-card p-3 mb-4 flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-44">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
          <input
            id="player-search"
            type="text"
            placeholder="Tìm cầu thủ..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="input-dark w-full pl-8 pr-3 py-2 text-sm"
          />
        </div>

        {/* Position filter */}
        <div className="flex gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
          {POSITIONS.map((pos) => (
            <button
              key={pos.value}
              id={`pos-filter-${pos.value.toLowerCase()}`}
              onClick={() => { setPosition(pos.value); setPage(0); }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                position === pos.value
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-white"
              }`}
            >
              {pos.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-600" />
          <select
            id="player-sort"
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
            className="input-dark px-3 py-2 text-sm"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-slate-900">
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="shimmer h-11 rounded-lg" style={{ animationDelay: `${i * 0.05}s` }} />
            ))}
          </div>
        ) : !data?.players?.length ? (
          <EmptyState message="Không tìm thấy cầu thủ. Thử đồng bộ dữ liệu FPL hoặc thay đổi bộ lọc." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {[
                      { label: "#", className: "w-8" },
                      { label: "Cầu thủ", className: "min-w-[140px]" },
                      { label: "Vị trí", className: "" },
                      { label: "Giá", className: "text-right" },
                      { label: "Điểm", className: "text-right" },
                      { label: "Phong độ", className: "text-right" },
                      { label: "Sở hữu", className: "text-right" },
                      { label: "xG", className: "text-right" },
                      { label: "xA", className: "text-right" },
                      { label: "FPL Score", className: "text-right" },
                      { label: "Khuyến nghị", className: "text-center" },
                      { label: "Tình trạng", className: "" },
                    ].map((h) => (
                      <th key={h.label} className={`px-3 py-3 text-[10px] font-bold text-slate-600 uppercase tracking-wider ${h.className}`}>
                        {h.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {data.players.map((p, idx) => (
                    <tr
                      key={p.id}
                      className={`hover:bg-white/[0.02] transition-colors ${isFetching ? "opacity-60" : ""}`}
                    >
                      <td className="px-3 py-3 text-slate-700 text-xs tabular-nums">{page * limit + idx + 1}</td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-white text-sm leading-tight">{p.web_name}</p>
                        <p className="text-[10px] text-slate-600 truncate max-w-[120px]">{p.name}</p>
                      </td>
                      <td className="px-3 py-3">
                        <PositionBadge position={p.position} showFull />
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-300 text-xs">{p.price_display}</td>
                      <td className="px-3 py-3 text-right font-bold text-white">{p.total_points}</td>
                      <td className="px-3 py-3 text-right text-slate-400 text-xs">{p.form?.toFixed(1) ?? "—"}</td>
                      <td className="px-3 py-3 text-right text-slate-400 text-xs">{p.selected_by_percent?.toFixed(1) ?? "—"}%</td>
                      <td className="px-3 py-3 text-right text-slate-400 text-xs">
                        {p.expected_goals != null ? p.expected_goals.toFixed(2) : <span className="text-slate-700">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-400 text-xs">
                        {p.expected_assists != null ? p.expected_assists.toFixed(2) : <span className="text-slate-700">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <ScoreBadge score={p.fpl_score} />
                      </td>
                      <td className="px-3 py-3 text-center">
                        <RecLabel score={p.fpl_score} status={p.status} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <StatusDot status={p.status} />
                          <span className="text-[11px] text-slate-500">{STATUS_LABELS[p.status] || p.status}</span>
                        </div>
                        {p.news && (
                          <p className="text-[10px] text-slate-700 truncate max-w-[100px] mt-0.5" title={p.news}>
                            {p.news.slice(0, 25)}…
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-white/[0.05]">
              <p className="text-[11px] text-slate-600">
                {page * limit + 1}–{Math.min((page + 1) * limit, data.total)} / {data.total.toLocaleString()} cầu thủ
              </p>
              <div className="flex gap-1.5">
                <button
                  id="btn-prev-page"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-25 disabled:cursor-not-allowed text-slate-300 transition-colors"
                >
                  <ChevronLeft className="w-3 h-3" /> Trước
                </button>
                <button
                  id="btn-next-page"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * limit >= data.total}
                  className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-25 disabled:cursor-not-allowed text-slate-300 transition-colors"
                >
                  Tiếp <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
