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
  { value: "fpl_score", label: "Khuyến nghị mua (AI Score)" },
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

const TEAMS = [
  { id: 1, name: 'Arsenal', short: 'ARS' },
  { id: 2, name: 'Aston Villa', short: 'AVL' },
  { id: 3, name: 'Bournemouth', short: 'BOU' },
  { id: 4, name: 'Brentford', short: 'BRE' },
  { id: 5, name: 'Brighton', short: 'BHA' },
  { id: 6, name: 'Chelsea', short: 'CHE' },
  { id: 7, name: 'Coventry City', short: 'COV' },
  { id: 8, name: 'Crystal Palace', short: 'CRY' },
  { id: 9, name: 'Everton', short: 'EVE' },
  { id: 10, name: 'Fulham', short: 'FUL' },
  { id: 11, name: 'Hull City', short: 'HUL' },
  { id: 12, name: 'Ipswich Town', short: 'IPS' },
  { id: 13, name: 'Leeds', short: 'LEE' },
  { id: 14, name: 'Liverpool', short: 'LIV' },
  { id: 15, name: 'Man City', short: 'MCI' },
  { id: 16, name: 'Man Utd', short: 'MUN' },
  { id: 17, name: 'Newcastle', short: 'NEW' },
  { id: 18, name: "Nott'm Forest", short: 'NFO' },
  { id: 19, name: 'Spurs', short: 'TOT' },
  { id: 20, name: 'Sunderland', short: 'SUN' },
];

function RecLabel({ score, status }: { score: number | null; status: string }) {
  if (["i", "s", "u", "n"].includes(status)) return <Badge label="SELL" variant="sell" />;
  if (score == null) return <span className="text-slate-700 text-xs">—</span>;
  if (score >= 72) return <Badge label="BUY" variant="buy" />;
  if (score >= 55) return <Badge label="HOLD" variant="hold" />;
  if (score >= 40) return <Badge label="WATCH" variant="watch" />;
  return <Badge label="SELL" variant="sell" />;
}

function StatsDictionary() {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="glass-card p-6 border-t-4 border-t-violet-500 md:col-span-2">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="flex-1">
            <h3 className="text-lg font-black text-white mb-2">FPL Score (Điểm tiềm năng AI)</h3>
            <p className="text-sm text-slate-400 mb-5 leading-relaxed">
              Điểm đánh giá từ 0-100 được tính toán tự động. Nếu cầu thủ chấn thương hoặc treo giò, điểm sẽ bị giảm nặng hoặc về 0.
            </p>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3 bg-white/[0.01] p-2 rounded-lg border border-white/[0.02]">
                <div className="min-w-[100px]"><Badge label="Must-Have" variant="must-have" /></div>
                <span className="text-slate-300"><strong>&gt; 75 điểm</strong>: Chắc chắn phải có mặt.</span>
              </li>
              <li className="flex items-center gap-3 bg-white/[0.01] p-2 rounded-lg border border-white/[0.02]">
                <div className="min-w-[100px]"><Badge label="Solid Hold" variant="solid hold" /></div>
                <span className="text-slate-300"><strong>60 - 75 điểm</strong>: Giữ an toàn, điểm ổn định.</span>
              </li>
              <li className="flex items-center gap-3 bg-white/[0.01] p-2 rounded-lg border border-white/[0.02]">
                <div className="min-w-[100px]"><Badge label="Monitor / Rotation" variant="monitor / rotation" /></div>
                <span className="text-slate-300"><strong>45 - 59 điểm</strong>: Dự bị / Xoay tua.</span>
              </li>
              <li className="flex items-center gap-3 bg-white/[0.01] p-2 rounded-lg border border-white/[0.02]">
                <div className="min-w-[100px]"><Badge label="Sell / Drop" variant="sell / drop" /></div>
                <span className="text-slate-300"><strong>&lt; 45 điểm</strong>: Ưu tiên bán hoặc loại bỏ.</span>
              </li>
            </ul>
          </div>
          
          <div className="flex-1 bg-black/20 rounded-xl p-5 border border-white/[0.05]">
            <h4 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>
              Công thức tính FPL Score
            </h4>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 text-right font-mono font-black text-emerald-400 text-lg">30%</div>
                <div className="flex-1 text-sm text-slate-200">
                  <div className="font-semibold">Chỉ số tấn công (xG + xA / 90)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Khả năng ghi bàn và kiến tạo kỳ vọng</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 text-right font-mono font-black text-blue-400 text-lg">25%</div>
                <div className="flex-1 text-sm text-slate-200">
                  <div className="font-semibold">Lịch thi đấu (FDR)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Độ khó của 5 vòng đấu tiếp theo</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 text-right font-mono font-black text-orange-400 text-lg">15%</div>
                <div className="flex-1 text-sm text-slate-200">
                  <div className="font-semibold">Phong độ (Form)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Điểm số thực tế thu về gần đây</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 text-right font-mono font-black text-purple-400 text-lg">15%</div>
                <div className="flex-1 text-sm text-slate-200">
                  <div className="font-semibold">Vai trò (Role)</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Đá phạt, penalty, đá cao hay thấp</div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 text-right font-mono font-black text-rose-400 text-lg">15%</div>
                <div className="flex-1 text-sm text-slate-200">
                  <div className="font-semibold">Sức mạnh đội bóng</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Chỉ số chung của CLB chủ quản</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-6 border-t-4 border-t-emerald-500">
        <h3 className="text-lg font-black text-white mb-2">xG (Bàn thắng kỳ vọng)</h3>
        <p className="text-sm text-slate-400 mb-4 leading-relaxed">
          Đo lường xác suất một cú sút trở thành bàn thắng. Hiển thị tổng xG trung bình.
        </p>
        <div className="bg-white/[0.02] rounded-lg p-3 space-y-2 text-sm border border-white/5">
          <div className="flex justify-between items-center"><span className="text-emerald-400 font-bold">≥ 0.45 / trận</span> <span className="text-slate-300">Xuất sắc (Top Tiền đạo)</span></div>
          <div className="flex justify-between items-center"><span className="text-emerald-300 font-bold">0.30 - 0.44 / trận</span> <span className="text-slate-300">Tốt (Tiền vệ công / TĐ phụ)</span></div>
          <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">&lt; 0.30 / trận</span> <span className="text-slate-500">Trung bình / Yếu</span></div>
        </div>
      </div>

      <div className="glass-card p-6 border-t-4 border-t-blue-500">
        <h3 className="text-lg font-black text-white mb-2">xA (Kiến tạo kỳ vọng)</h3>
        <p className="text-sm text-slate-400 mb-4 leading-relaxed">
          Xác suất những đường chuyền tạo ra cơ hội có thể chuyển hóa thành bàn thắng.
        </p>
        <div className="bg-white/[0.02] rounded-lg p-3 space-y-2 text-sm border border-white/5">
          <div className="flex justify-between items-center"><span className="text-blue-400 font-bold">≥ 0.30 / trận</span> <span className="text-slate-300">Playmaker hàng đầu</span></div>
          <div className="flex justify-between items-center"><span className="text-blue-300 font-bold">0.15 - 0.29 / trận</span> <span className="text-slate-300">Kiến tạo tốt</span></div>
          <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">&lt; 0.15 / trận</span> <span className="text-slate-500">Trung bình / Yếu</span></div>
        </div>
      </div>

      <div className="glass-card p-6 border-t-4 border-t-orange-500">
        <h3 className="text-lg font-black text-white mb-2">Phong độ (Form)</h3>
        <p className="text-sm text-slate-400 mb-4 leading-relaxed">
          Trung bình điểm FPL thực tế ghi được trong các vòng đấu gần nhất.
        </p>
        <div className="bg-white/[0.02] rounded-lg p-3 space-y-2 text-sm border border-white/5">
          <div className="flex justify-between items-center"><span className="text-orange-400 font-bold">≥ 6.0 điểm</span> <span className="text-slate-300">Đang bay cao (On Fire)</span></div>
          <div className="flex justify-between items-center"><span className="text-orange-300 font-bold">4.0 - 5.9 điểm</span> <span className="text-slate-300">Ổn định</span></div>
          <div className="flex justify-between items-center"><span className="text-slate-400 font-bold">&lt; 4.0 điểm</span> <span className="text-slate-400">Phong độ thấp</span></div>
        </div>
      </div>
    </div>

      <div className="glass-card p-6 border-t-4 border-t-purple-500 md:col-span-2 mt-6">
        <h3 className="text-lg font-black text-white mb-4">Bảng tính điểm FPL (Quy tắc cơ bản)</h3>
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-sm text-left text-slate-300">
            <thead className="text-xs uppercase bg-white/[0.04] text-slate-400">
              <tr>
                <th className="px-4 py-3 rounded-tl-lg">Hành động</th>
                <th className="px-4 py-3 text-center">Tiền đạo (FWD)</th>
                <th className="px-4 py-3 text-center">Tiền vệ (MID)</th>
                <th className="px-4 py-3 text-center">Hậu vệ (DEF)</th>
                <th className="px-4 py-3 text-center rounded-tr-lg">Thủ môn (GK)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              <tr className="hover:bg-violet-500/20 transition-colors">
                <td className="px-4 py-3 font-medium text-white">Ra sân dưới 60 phút</td>
                <td className="px-4 py-3 text-center">+1</td>
                <td className="px-4 py-3 text-center">+1</td>
                <td className="px-4 py-3 text-center">+1</td>
                <td className="px-4 py-3 text-center">+1</td>
              </tr>
              <tr className="hover:bg-violet-500/20 transition-colors">
                <td className="px-4 py-3 font-medium text-white">Ra sân trên 60 phút (không dính thẻ đỏ)</td>
                <td className="px-4 py-3 text-center">+2</td>
                <td className="px-4 py-3 text-center">+2</td>
                <td className="px-4 py-3 text-center">+2</td>
                <td className="px-4 py-3 text-center">+2</td>
              </tr>
              <tr className="hover:bg-violet-500/20 transition-colors">
                <td className="px-4 py-3 font-medium text-white">Ghi 1 bàn thắng</td>
                <td className="px-4 py-3 text-center font-bold text-emerald-400">+4</td>
                <td className="px-4 py-3 text-center font-bold text-emerald-400">+5</td>
                <td className="px-4 py-3 text-center font-bold text-emerald-400">+6</td>
                <td className="px-4 py-3 text-center font-bold text-emerald-400">+6</td>
              </tr>
              <tr className="hover:bg-violet-500/20 transition-colors">
                <td className="px-4 py-3 font-medium text-white">Có 1 kiến tạo</td>
                <td className="px-4 py-3 text-center">+3</td>
                <td className="px-4 py-3 text-center">+3</td>
                <td className="px-4 py-3 text-center">+3</td>
                <td className="px-4 py-3 text-center">+3</td>
              </tr>
              <tr className="hover:bg-violet-500/20 transition-colors">
                <td className="px-4 py-3 font-medium text-white">Giữ sạch lưới (Clean Sheet)</td>
                <td className="px-4 py-3 text-center text-slate-400">0</td>
                <td className="px-4 py-3 text-center">+1</td>
                <td className="px-4 py-3 text-center font-bold text-emerald-400">+4</td>
                <td className="px-4 py-3 text-center font-bold text-emerald-400">+4</td>
              </tr>
              <tr className="hover:bg-violet-500/20 transition-colors">
                <td className="px-4 py-3 font-medium text-white">Cứ mỗi 3 pha cứu thua (Save)</td>
                <td className="px-4 py-3 text-center text-slate-400">0</td>
                <td className="px-4 py-3 text-center text-slate-400">0</td>
                <td className="px-4 py-3 text-center text-slate-400">0</td>
                <td className="px-4 py-3 text-center">+1</td>
              </tr>
              <tr className="hover:bg-violet-500/20 transition-colors">
                <td className="px-4 py-3 font-medium text-white">Cản phá Penalty</td>
                <td className="px-4 py-3 text-center text-slate-400">0</td>
                <td className="px-4 py-3 text-center text-slate-400">0</td>
                <td className="px-4 py-3 text-center text-slate-400">0</td>
                <td className="px-4 py-3 text-center font-bold text-emerald-400">+5</td>
              </tr>
              <tr className="hover:bg-violet-500/20 transition-colors">
                <td className="px-4 py-3 font-medium text-white">Đá hỏng Penalty</td>
                <td className="px-4 py-3 text-center font-bold text-red-400">-2</td>
                <td className="px-4 py-3 text-center font-bold text-red-400">-2</td>
                <td className="px-4 py-3 text-center font-bold text-red-400">-2</td>
                <td className="px-4 py-3 text-center font-bold text-red-400">-2</td>
              </tr>
              <tr className="hover:bg-violet-500/20 transition-colors">
                <td className="px-4 py-3 font-medium text-white">Thủng lưới mỗi 2 bàn</td>
                <td className="px-4 py-3 text-center text-slate-400">0</td>
                <td className="px-4 py-3 text-center text-slate-400">0</td>
                <td className="px-4 py-3 text-center font-bold text-red-400">-1</td>
                <td className="px-4 py-3 text-center font-bold text-red-400">-1</td>
              </tr>
              <tr className="hover:bg-violet-500/20 transition-colors">
                <td className="px-4 py-3 font-medium text-white">Thẻ vàng / Thẻ đỏ</td>
                <td className="px-4 py-3 text-center font-bold text-red-400">-1 / -3</td>
                <td className="px-4 py-3 text-center font-bold text-red-400">-1 / -3</td>
                <td className="px-4 py-3 text-center font-bold text-red-400">-1 / -3</td>
                <td className="px-4 py-3 text-center font-bold text-red-400">-1 / -3</td>
              </tr>
              <tr className="hover:bg-violet-500/20 transition-colors">
                <td className="px-4 py-3 font-medium text-white">Đốt đền (Phản lưới nhà)</td>
                <td className="px-4 py-3 text-center font-bold text-red-400">-2</td>
                <td className="px-4 py-3 text-center font-bold text-red-400">-2</td>
                <td className="px-4 py-3 text-center font-bold text-red-400">-2</td>
                <td className="px-4 py-3 text-center font-bold text-red-400">-2</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export default function PlayersPage() {
  const [activeTab, setActiveTab] = useState<"list" | "dictionary">("list");
  const [position, setPosition] = useState("All");
  const [sortBy, setSortBy] = useState("fpl_score");
  const [search, setSearch] = useState("");
  const [maxPrice, setMaxPrice] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [teamFilter, setTeamFilter] = useState<string>("All");
  const [page, setPage] = useState(0);
  const limit = 30;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["players", position, sortBy, search, maxPrice, statusFilter, teamFilter, page],
    queryFn: () =>
      fplApi.getPlayers({
        position: position === "All" ? undefined : position,
        team_id: teamFilter === "All" ? undefined : Number(teamFilter),
        sort_by: sortBy,
        search: search || undefined,
        max_price: maxPrice === "All" ? undefined : Number(maxPrice) * 10,
        status: statusFilter === "All" ? undefined : statusFilter,
        limit,
        offset: page * limit,
      }).then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  return (
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="mb-5 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Cơ sở dữ liệu cầu thủ</h1>
          <p className="text-slate-600 text-sm mt-1">
            {data ? `${data.total.toLocaleString()} cầu thủ` : "Tải dữ liệu..."} · Lọc, sắp xếp và tìm kiếm
          </p>
        </div>
        <div className="flex bg-white/[0.03] p-1 rounded-xl border border-white/[0.06] w-fit">
          <button
            onClick={() => setActiveTab("list")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "list" ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-white/20"
            }`}
          >
            Danh sách
          </button>
          <button
            onClick={() => setActiveTab("dictionary")}
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
              activeTab === "dictionary" ? "bg-violet-600 text-white shadow-sm" : "text-slate-400 hover:text-white hover:bg-white/20"
            }`}
          >
            Từ điển chỉ số
          </button>
        </div>
      </div>

      {activeTab === "list" ? (
        <>
      {/* Filters bar */}
      <div className="glass-card p-3 mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              id="player-search"
              type="text"
              placeholder="Tìm cầu thủ..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="bg-slate-800 border border-slate-700 text-white w-full pl-9 pr-3 py-2 rounded-lg text-sm shadow-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all placeholder:text-slate-500"
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
                    : "text-slate-400 hover:text-white hover:bg-white/20"
                }`}
              >
                {pos.label}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400" />
            <select
              id="player-sort"
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(0); }}
              className="bg-slate-800 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm shadow-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Advanced Filters */}
        <div className="flex flex-wrap gap-4 items-center pt-3 border-t border-white/[0.05]">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-300">Câu lạc bộ:</label>
            <select
              value={teamFilter}
              onChange={(e) => { setTeamFilter(e.target.value); setPage(0); }}
              className="bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-lg text-xs shadow-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all min-w-[140px]"
            >
              <option value="All">Tất cả CLB</option>
              {TEAMS.map(t => (
                <option key={t.id} value={t.id}>{t.name} ({t.short})</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-300">Giá tối đa:</label>
            <select
              value={maxPrice}
              onChange={(e) => { setMaxPrice(e.target.value); setPage(0); }}
              className="bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-lg text-xs shadow-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all min-w-[100px]"
            >
              <option value="All">Tất cả</option>
              <option value="4.5">£4.5m</option>
              <option value="5.0">£5.0m</option>
              <option value="6.0">£6.0m</option>
              <option value="7.5">£7.5m</option>
              <option value="9.0">£9.0m</option>
              <option value="11.0">£11.0m</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-300">Tình trạng:</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
              className="bg-slate-800 border border-slate-700 text-white px-3 py-1.5 rounded-lg text-xs shadow-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 transition-all min-w-[130px]"
            >
              <option value="All">Tất cả</option>
              <option value="a">✅ Sẵn sàng</option>
              <option value="d">⚠️ Nghi ngờ</option>
              <option value="i">❌ Chấn thương</option>
              <option value="s">🚫 Treo giò</option>
            </select>
          </div>
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
                      className={`hover:bg-violet-500/20 cursor-pointer transition-colors ${isFetching ? "opacity-60" : ""}`}
                    >
                      <td className="px-3 py-3 text-slate-400 text-xs tabular-nums">{page * limit + idx + 1}</td>
                      <td className="px-3 py-3">
                        <p className="font-semibold text-white text-sm leading-tight flex items-baseline gap-1.5">
                          {p.web_name} 
                          <span className="text-[9px] text-slate-400 font-normal bg-white/5 px-1 rounded">ID: {p.id}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{p.name} · <span className="text-slate-300 font-medium">{p.team_name}</span></p>
                      </td>
                      <td className="px-3 py-3">
                        <PositionBadge position={p.position} showFull />
                      </td>
                      <td className="px-3 py-3 text-right font-mono text-slate-300 text-xs">{p.price_display}</td>
                      <td className="px-3 py-3 text-right font-bold text-white">{p.total_points}</td>
                      <td className="px-3 py-3 text-right text-slate-400 text-xs">{p.form?.toFixed(1) ?? "—"}</td>
                      <td className="px-3 py-3 text-right text-slate-400 text-xs">{p.selected_by_percent?.toFixed(1) ?? "—"}%</td>
                      <td className="px-3 py-3 text-right text-slate-300 text-xs">
                        {p.expected_goals != null ? p.expected_goals.toFixed(2) : <span className="text-slate-500">—</span>}
                      </td>
                      <td className="px-3 py-3 text-right text-slate-300 text-xs">
                        {p.expected_assists != null ? p.expected_assists.toFixed(2) : <span className="text-slate-500">—</span>}
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
                          <p className="text-[10px] text-slate-400 truncate max-w-[100px] mt-0.5" title={p.news}>
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
                  className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-white/[0.04] hover:bg-violet-500/20 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed text-slate-300 transition-colors"
                >
                  <ChevronLeft className="w-3 h-3" /> Trước
                </button>
                <button
                  id="btn-next-page"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={(page + 1) * limit >= data.total}
                  className="flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium rounded-lg bg-white/[0.04] hover:bg-violet-500/20 hover:text-white disabled:opacity-25 disabled:cursor-not-allowed text-slate-300 transition-colors"
                >
                  Tiếp <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
        </>
      ) : (
        <StatsDictionary />
      )}
    </div>
  );
}
