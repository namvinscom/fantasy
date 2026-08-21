"use client";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import fplApi from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { LoadingCard, EmptyState, SectionHeader } from "@/components/ui/Cards";
import { formatPrice } from "@/lib/utils";
import { ArrowRight, AlertTriangle, Star, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export default function TransfersPage() {
  const [outId, setOutId] = useState("");
  const [inId, setInId] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["transfers"],
    queryFn: () => fplApi.getTransferRecommendations().then((r) => r.data),
    retry: false,
  });

  const { data: captainData } = useQuery({
    queryKey: ["captain"],
    queryFn: () => fplApi.getCaptainPicks().then((r) => r.data),
    retry: false,
  });

  const hitMut = useMutation({
    mutationFn: () => fplApi.whatIf(+outId, +inId).then((r) => r.data),
  });

  const hitResult = hitMut.data as any;

  return (
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-black text-white tracking-tight">Transfer Optimizer</h1>
        <p className="text-slate-600 text-sm mt-1">
          Phân tích transfer tối ưu · Tính toán -4 hit · Gợi ý captain
        </p>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl border border-blue-500/15 bg-blue-500/5 mb-5">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Không chase điểm GW trước. Ưu tiên <strong className="text-white">fixture 3-5 GW tới</strong>, phút thi đấu, role và xGI. 
          Chỉ đề xuất transfer khi lợi ích rõ ràng và bền vững.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — Transfer suggestions */}
        <div className="lg:col-span-2 space-y-3">
          {/* Budget info */}
          {data && (
            <div className="flex items-center gap-4 px-4 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06]">
              <span className="text-[11px] text-slate-500">
                <span className="font-bold text-white">{data.free_transfers}FT</span> miễn phí
              </span>
              <span className="text-white/10">|</span>
              <span className="text-[11px] text-slate-500">
                Ngân hàng: <span className="font-bold text-white">{formatPrice(data.bank)}</span>
              </span>
            </div>
          )}

          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <LoadingCard key={i} className="h-36" />)}
            </div>
          ) : !data?.suggestions?.length ? (
            <EmptyState
              message="Chưa có squad. Thiết lập đội hình trước để nhận đề xuất transfer."
              icon={<AlertTriangle className="w-7 h-7" />}
            />
          ) : (
            data.suggestions.map((s, i) => (
              <div key={i} className={cn("glass-card p-5", i === 0 && "border-violet-500/20")}>
                {i === 0 && (
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-500 pulse-dot" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-violet-400">Khuyến nghị hàng đầu</span>
                  </div>
                )}

                {/* Player swap */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 p-3 rounded-xl border border-red-500/15 bg-red-500/5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1.5">Bán ra</p>
                    <p className="font-bold text-white">{s.player_out_name}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {formatPrice(s.player_out_price)} · Điểm: {s.player_out_score.toFixed(0)}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Tầm nhìn 5V:</span>
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded",
                        s.horizon_fdr_out >= 3.5 ? "bg-red-500/20 text-red-400" : s.horizon_fdr_out <= 2.6 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-slate-300"
                      )}>
                        FDR {s.horizon_fdr_out?.toFixed(1) || "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-center shrink-0">
                    <ArrowRight className="w-4 h-4 text-slate-600" />
                    <span className={`text-[10px] font-bold mt-1 ${s.net_gain > 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {s.net_gain > 0 ? "+" : ""}{s.net_gain}đ
                    </span>
                  </div>
                  <div className="flex-1 p-3 rounded-xl border border-emerald-500/15 bg-emerald-500/5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5">Mua vào</p>
                    <p className="font-bold text-white">{s.player_in_name}</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      {formatPrice(s.player_in_price)} · Điểm: {s.player_in_score.toFixed(0)}
                    </p>
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 font-bold">Tầm nhìn 5V:</span>
                      <span className={cn(
                        "text-[10px] font-bold px-1.5 py-0.5 rounded",
                        s.horizon_fdr_in >= 3.5 ? "bg-red-500/20 text-red-400" : s.horizon_fdr_in <= 2.6 ? "bg-emerald-500/20 text-emerald-400" : "bg-white/10 text-slate-300"
                      )}>
                        FDR {s.horizon_fdr_in?.toFixed(1) || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-4 gap-2 py-3 border-y border-white/[0.05]">
                  {[
                    { label: "Tăng điểm", value: `${s.score_gain > 0 ? "+" : ""}${s.score_gain}`, color: s.score_gain > 0 ? "text-emerald-400" : "text-red-400" },
                    { label: "Chi phí", value: s.transfer_cost === 0 ? "Miễn phí" : `-${s.transfer_cost}đ`, color: s.transfer_cost === 0 ? "text-emerald-400" : "text-red-400" },
                    { label: "Lợi ích ròng", value: `${s.net_gain > 0 ? "+" : ""}${s.net_gain}`, color: s.net_gain > 0 ? "text-emerald-400 text-base font-black" : "text-red-400 text-base font-black" },
                    { label: "Độ tin cậy", value: `${s.confidence}%`, color: "text-white" },
                  ].map((m) => (
                    <div key={m.label} className="text-center">
                      <p className="text-[10px] text-slate-600 mb-0.5">{m.label}</p>
                      <p className={`font-bold ${m.color}`}>{m.value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-[11px] text-slate-600 flex-1 line-clamp-2">{s.reason}</p>
                  <Badge label={s.recommendation} variant={s.recommendation.toLowerCase() as "buy" | "hold"} size="md" />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* -4 Hit Calculator */}
          <div className="glass-card p-5">
            <p className="text-sm font-bold text-white mb-1">Máy tính -4 Hit</p>
            <p className="text-[11px] text-slate-600 mb-4">Nhập ID cầu thủ để tính có nên chịu hit không</p>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] text-red-400 uppercase tracking-wider font-bold mb-1.5 block">
                  Bán — Player ID
                </label>
                <input
                  id="hit-calc-out"
                  type="number"
                  placeholder="VD: 328"
                  value={outId}
                  onChange={(e) => setOutId(e.target.value)}
                  className="input-dark w-full px-3 py-2.5 text-sm"
                />
              </div>
              <div>
                <label className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold mb-1.5 block">
                  Mua — Player ID
                </label>
                <input
                  id="hit-calc-in"
                  type="number"
                  placeholder="VD: 401"
                  value={inId}
                  onChange={(e) => setInId(e.target.value)}
                  className="input-dark w-full px-3 py-2.5 text-sm"
                />
              </div>
              <button
                id="btn-calc-hit"
                onClick={() => outId && inId && hitMut.mutate()}
                disabled={!outId || !inId || hitMut.isPending}
                className="w-full py-2.5 btn-primary text-sm mt-1"
              >
                {hitMut.isPending ? "Đang tính…" : "Tính toán transfer"}
              </button>
            </div>

            {hitResult && !hitMut.isPending && (
              <div className="mt-4 pt-4 border-t border-white/[0.06] space-y-2.5 fade-in">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Bán</span>
                  <span className="font-semibold text-white">{hitResult.player_out?.name || `ID: ${outId}`}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Mua</span>
                  <span className="font-semibold text-white">{hitResult.player_in?.name || `ID: ${inId}`}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Chênh lệch điểm</span>
                  <span className={`font-bold ${hitResult.score_difference > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {hitResult.score_difference > 0 ? "+" : ""}{hitResult.score_difference}
                  </span>
                </div>

                <div className={cn(
                  "mt-3 p-3 rounded-xl border text-center",
                  hitResult.net_gain > 0
                    ? "bg-emerald-500/8 border-emerald-500/20"
                    : "bg-red-500/8 border-red-500/20"
                )}>
                  <p className={`font-black text-base ${hitResult.net_gain > 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {hitResult.verdict === "Take the hit" ? "✅ Nên chịu hit" : "❌ Không nên chịu hit"}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">{hitResult.reason}</p>
                </div>
              </div>
            )}
          </div>

          {/* Captain suggestions */}
          {captainData?.candidates?.length ? (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-yellow-400" />
                <p className="text-xs font-bold uppercase tracking-wider text-yellow-400">Captain tuần này</p>
              </div>
              <div className="space-y-2">
                {captainData.candidates.map((c, i) => (
                  <div key={c.player_id} className={cn(
                    "flex items-center gap-2.5 p-2.5 rounded-xl transition-colors",
                    i === 0 ? "bg-yellow-500/8 border border-yellow-500/15" : "hover:bg-white/[0.02]"
                  )}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                      i === 0 ? "bg-yellow-500 text-black" : "bg-slate-800 text-slate-500"
                    }`}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${i === 0 ? "text-yellow-300" : "text-white"}`}>
                        {c.player_name}
                      </p>
                      <p className="text-[10px] text-slate-600 truncate">
                        {c.reasons[0] || "—"}
                      </p>
                    </div>
                    <span className={`font-black text-sm tabular-nums ${i === 0 ? "text-yellow-400" : "text-slate-500"}`}>
                      {c.captain_score.toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
