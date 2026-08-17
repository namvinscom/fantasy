"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import fplApi from "@/lib/api";
import { LoadingCard } from "@/components/ui/Cards";
import { Badge, PositionBadge, ScoreBadge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import { Shuffle, ArrowRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export default function SimulatorPage() {
  const [outId, setOutId] = useState("");
  const [inId, setInId] = useState("");

  const simMut = useMutation({
    mutationFn: () => fplApi.whatIf(+outId, +inId).then((r) => r.data),
  });

  const result = simMut.data as any;

  const verdictConfig: Record<string, { label: string; color: string; bg: string }> = {
    BUY:     { label: "NÊN MUA", color: "text-emerald-400", bg: "bg-emerald-500/8 border-emerald-500/20" },
    HOLD:    { label: "GIỮ NGUYÊN", color: "text-blue-400", bg: "bg-blue-500/8 border-blue-500/20" },
    AVOID:   { label: "KHÔNG NÊN", color: "text-red-400", bg: "bg-red-500/8 border-red-500/20" },
    CONSIDER:{ label: "CÂN NHẮC", color: "text-yellow-400", bg: "bg-yellow-500/8 border-yellow-500/20" },
  };

  return (
    <div className="p-6 fade-in max-w-2xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
          <Shuffle className="w-6 h-6 text-violet-400" />
          Mô phỏng Transfer
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Thử bất kỳ phương án nào — xem ngay tác động điểm, ngân sách và khuyến nghị
        </p>
      </div>

      {/* Input card */}
      <div className="elevated-card p-5 mb-5">
        <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
          Nhập ID cầu thủ (tìm trong trang <strong className="text-white">Cầu thủ</strong>) để mô phỏng. 
          Kết quả tính toán ngay lập tức dựa trên dữ liệu FPL thực tế.
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-2 block">
              Bán ra — Player ID
            </label>
            <input
              id="sim-out-id"
              type="number"
              placeholder="VD: 328"
              value={outId}
              onChange={(e) => setOutId(e.target.value)}
              className="input-dark w-full px-4 py-3 text-sm"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-2 block">
              Mua vào — Player ID
            </label>
            <input
              id="sim-in-id"
              type="number"
              placeholder="VD: 401"
              value={inId}
              onChange={(e) => setInId(e.target.value)}
              className="input-dark w-full px-4 py-3 text-sm"
            />
          </div>
        </div>
        <button
          id="btn-simulate"
          onClick={() => simMut.mutate()}
          disabled={!outId || !inId || simMut.isPending}
          className="w-full py-3 btn-primary flex items-center justify-center gap-2 font-semibold"
        >
          {simMut.isPending ? (
            "Đang phân tích…"
          ) : (
            <>
              <Shuffle className="w-4 h-4" />
              Mô phỏng Transfer
            </>
          )}
        </button>
      </div>

      {/* Loading */}
      {simMut.isPending && <LoadingCard className="h-64" />}

      {/* Result */}
      {result && !simMut.isPending && (
        <div className="space-y-4 fade-in">
          {/* Comparison */}
          <div className="glass-card p-5">
            <div className="grid grid-cols-2 gap-5">
              {/* Sell */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-3">Đang bán</p>
                <p className="text-xl font-black text-white leading-tight mb-1">{result.player_out?.name}</p>
                <p className="text-sm text-slate-500 mb-3">{formatPrice(result.player_out?.price)}</p>
                <div className="flex items-center gap-2 mb-3">
                  <ScoreBadge score={result.player_out?.fpl_score} />
                  {result.player_out?.recommendation && (
                    <Badge
                      label={result.player_out.recommendation}
                      variant={result.player_out.recommendation.toLowerCase()}
                    />
                  )}
                </div>
                <div className="space-y-1">
                  {result.player_out?.reasons?.map((r: string) => (
                    <p key={r} className="text-[11px] text-emerald-400 flex gap-1.5">
                      <span className="shrink-0">+</span> {r}
                    </p>
                  ))}
                  {result.player_out?.risks?.map((r: string) => (
                    <p key={r} className="text-[11px] text-red-400 flex gap-1.5">
                      <span className="shrink-0">−</span> {r}
                    </p>
                  ))}
                </div>
              </div>

              {/* Separator */}
              <div className="relative">
                <div className="absolute left-0 top-0 bottom-0 w-px bg-white/[0.05]" />
                <div className="pl-5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-3">Định mua</p>
                  <p className="text-xl font-black text-white leading-tight mb-1">{result.player_in?.name}</p>
                  <p className="text-sm text-slate-500 mb-3">{formatPrice(result.player_in?.price)}</p>
                  <div className="flex items-center gap-2 mb-3">
                    <ScoreBadge score={result.player_in?.fpl_score} />
                    {result.player_in?.recommendation && (
                      <Badge
                        label={result.player_in.recommendation}
                        variant={result.player_in.recommendation.toLowerCase()}
                      />
                    )}
                  </div>
                  <div className="space-y-1">
                    {result.player_in?.reasons?.map((r: string) => (
                      <p key={r} className="text-[11px] text-emerald-400 flex gap-1.5">
                        <span className="shrink-0">+</span> {r}
                      </p>
                    ))}
                    {result.player_in?.risks?.map((r: string) => (
                      <p key={r} className="text-[11px] text-red-400 flex gap-1.5">
                        <span className="shrink-0">−</span> {r}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Verdict */}
          {(() => {
            const cfg = verdictConfig[result.verdict] || verdictConfig["HOLD"];
            return (
              <div className={cn("glass-card p-5 text-center border", cfg.bg)}>
                <p className="text-[10px] uppercase tracking-widest text-slate-600 mb-2">Kết luận</p>
                <p className={cn("text-4xl font-black mb-2 tracking-tight", cfg.color)}>{cfg.label}</p>
                <p className="text-sm text-slate-400 mb-5 leading-relaxed max-w-sm mx-auto">{result.reason}</p>

                <div className="grid grid-cols-3 gap-4 border-t border-white/[0.06] pt-4">
                  {[
                    {
                      label: "Chênh lệch điểm",
                      value: `${result.score_difference > 0 ? "+" : ""}${result.score_difference}`,
                      color: result.score_difference > 0 ? "text-emerald-400" : "text-red-400",
                    },
                    {
                      label: "Chi phí chuyển nhượng",
                      value: result.transfer_cost === 0 ? "Miễn phí" : `-${result.transfer_cost}đ`,
                      color: result.transfer_cost === 0 ? "text-emerald-400" : "text-red-400",
                    },
                    {
                      label: "Lợi ích ròng",
                      value: `${result.net_gain > 0 ? "+" : ""}${result.net_gain}`,
                      color: result.net_gain > 0 ? "text-emerald-400 text-lg font-black" : "text-red-400 text-lg font-black",
                    },
                  ].map((m) => (
                    <div key={m.label}>
                      <p className="text-[10px] text-slate-600 mb-1">{m.label}</p>
                      <p className={cn("font-bold", m.color)}>{m.value}</p>
                    </div>
                  ))}
                </div>

                {!result.affordable && (
                  <div className="mt-4 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-400 font-semibold">⚠ Không đủ ngân sách trong bank</p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Error */}
      {simMut.isError && (
        <div className="glass-card p-4 border border-red-500/20 bg-red-500/5">
          <p className="text-red-400 text-sm">
            ❌ Không thể phân tích. Kiểm tra Player ID và đảm bảo backend đang chạy.
          </p>
        </div>
      )}
    </div>
  );
}
