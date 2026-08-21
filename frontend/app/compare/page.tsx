"use client";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import fplApi, { Player, PlayerDetail } from "@/lib/api";
import dynamic from "next/dynamic";
const RadarChartWrapper = dynamic(() => import("@/components/ui/RadarChartWrapper"), { ssr: false, loading: () => <div className="flex h-full items-center justify-center text-slate-500">Đang tải biểu đồ...</div> });
import { GitCompare, Search, ShieldAlert, CheckCircle2, AlertCircle, Shirt } from "lucide-react";
import { cn, formatPrice } from "@/lib/utils";

function PlayerSelect({
  value,
  onChange,
  label,
  players,
  placeholder = "Tìm cầu thủ...",
}: {
  value: Player | null;
  onChange: (p: Player | null) => void;
  label: string;
  players: Player[];
  placeholder?: string;
}) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filtered = useMemo(() => {
    if (!search) return players.slice(0, 50);
    const lower = search.toLowerCase();
    return players
      .filter((p) => p.web_name.toLowerCase().includes(lower) || p.name.toLowerCase().includes(lower))
      .slice(0, 50);
  }, [players, search]);

  return (
    <div className="relative flex-1">
      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-emerald-300">{label}</label>
      {value ? (
        <div className="flex items-center justify-between rounded-lg border border-emerald-400/30 bg-emerald-400/10 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/20">
              <Shirt className="h-5 w-5 text-emerald-300" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">{value.web_name}</p>
              <p className="text-xs text-slate-400">{value.team_short} · {value.position} · {formatPrice(value.price)}</p>
            </div>
          </div>
          <button
            onClick={() => onChange(null)}
            className="text-xs font-bold text-red-300 hover:text-red-200"
          >
            Đổi
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            className="input-dark w-full px-4 py-3 pl-10 text-sm"
            placeholder={placeholder}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          />
          {isOpen && (
            <div className="absolute left-0 right-0 top-full z-10 mt-2 max-h-60 overflow-y-auto rounded-lg border border-white/10 bg-slate-900 shadow-xl custom-scrollbar">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  className="flex w-full items-center justify-between border-b border-white/5 px-4 py-2.5 hover:bg-white/5"
                  onMouseDown={() => {
                    onChange(p);
                    setSearch("");
                    setIsOpen(false);
                  }}
                >
                  <span className="text-sm font-bold text-white">{p.web_name}</span>
                  <span className="text-xs text-slate-400">{p.team_short}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PlayerCard({ detail, color }: { detail: PlayerDetail; color: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/40 p-5 backdrop-blur-md">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <h3 className="text-xl font-black text-white" style={{ color }}>{detail.web_name}</h3>
          <p className="text-sm text-slate-400">{detail.team_name} · {detail.position}</p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-white">{formatPrice(detail.price)}</p>
          <p className="text-xs text-slate-500">Giá hiện tại</p>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-white/5 p-3 text-center">
          <p className="text-xs font-bold text-slate-400">Total Points</p>
          <p className="text-lg font-black text-white">{detail.total_points}</p>
        </div>
        <div className="rounded-lg bg-white/5 p-3 text-center">
          <p className="text-xs font-bold text-slate-400">Ownership</p>
          <p className="text-lg font-black text-white">{detail.selected_by_percent}%</p>
        </div>
      </div>

      {detail.reasons.length > 0 && (
        <div className="mb-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">Điểm mạnh</p>
          <ul className="space-y-1.5">
            {detail.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {detail.risks.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-yellow-400">Rủi ro</p>
          <ul className="space-y-1.5">
            {detail.risks.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-yellow-400" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function ComparePage() {
  const [p1, setP1] = useState<Player | null>(null);
  const [p2, setP2] = useState<Player | null>(null);

  const { data: searchResults } = useQuery({
    queryKey: ["allPlayersForCompare"],
    queryFn: () => fplApi.getPlayers({ limit: 1000 }).then((r) => r.data.players),
  });

  const { data: d1 } = useQuery({
    queryKey: ["playerDetail", p1?.id],
    queryFn: () => fplApi.getPlayer(p1!.id).then((r) => r.data),
    enabled: !!p1,
  });

  const { data: d2 } = useQuery({
    queryKey: ["playerDetail", p2?.id],
    queryFn: () => fplApi.getPlayer(p2!.id).then((r) => r.data),
    enabled: !!p2,
  });

  const chartData = useMemo(() => {
    if (!d1 || !d2) return [];
    return [
      { metric: "FPL Score", p1: d1.score_breakdown?.total || 0, p2: d2.score_breakdown?.total || 0 },
      { metric: "Tấn Công", p1: d1.score_breakdown?.xg_xa || 0, p2: d2.score_breakdown?.xg_xa || 0 },
      { metric: "Phong Độ", p1: d1.score_breakdown?.form || 0, p2: d2.score_breakdown?.form || 0 },
      { metric: "Lịch T.Đấu", p1: d1.score_breakdown?.fixture || 0, p2: d2.score_breakdown?.fixture || 0 },
      { metric: "Vai Trò", p1: d1.score_breakdown?.role || 0, p2: d2.score_breakdown?.role || 0 },
      { metric: "Đội Bóng", p1: d1.score_breakdown?.team_strength || 0, p2: d2.score_breakdown?.team_strength || 0 },
    ];
  }, [d1, d2]);

  return (
    <div className="flex h-full flex-col p-4 md:p-8">
      <div className="mb-8 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 shadow-lg">
          <GitCompare className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white md:text-3xl">So sánh cầu thủ</h1>
          <p className="text-sm font-medium text-slate-400">Phân tích chuyên sâu qua biểu đồ Radar (AI FPL Score)</p>
        </div>
      </div>

      <div className="mb-8 flex flex-col gap-4 md:flex-row">
        <PlayerSelect
          label="Cầu thủ 1 (Màu xanh)"
          value={p1}
          onChange={setP1}
          players={searchResults || []}
          placeholder="Chọn cầu thủ đầu tiên..."
        />
        <div className="flex items-center justify-center md:pt-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 font-black text-slate-500">
            VS
          </div>
        </div>
        <PlayerSelect
          label="Cầu thủ 2 (Màu cam)"
          value={p2}
          onChange={setP2}
          players={searchResults || []}
          placeholder="Chọn cầu thủ thứ hai..."
        />
      </div>

      {!d1 || !d2 ? (
        <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-white/5 bg-black/20 text-center">
          <ShieldAlert className="mb-4 h-12 w-12 text-slate-600" />
          <h2 className="text-lg font-bold text-slate-400">Chưa chọn đủ cầu thủ</h2>
          <p className="mt-2 text-sm text-slate-500">Hãy tìm và chọn 2 cầu thủ ở trên để bắt đầu so sánh</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="glass-card flex h-[500px] flex-col rounded-2xl p-6">
              <h3 className="mb-4 text-center text-lg font-bold text-white">Phân tích chỉ số (Tối đa 100đ)</h3>
              <div className="flex-1">
                <RadarChartWrapper data={chartData} d1Name={d1.web_name} d2Name={d2.web_name} />
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-6">
            <PlayerCard detail={d1} color="#34d399" />
            <PlayerCard detail={d2} color="#fb923c" />
          </div>
        </div>
      )}
    </div>
  );
}
