"use client";
import { useQuery } from "@tanstack/react-query";
import fplApi from "@/lib/api";
import { LoadingCard, EmptyState } from "@/components/ui/Cards";
import { cn } from "@/lib/utils";
import { AlertTriangle, TrendingUp, TrendingDown, Calendar } from "lucide-react";
import { useState } from "react";

const FDR_STYLE: Record<number, { cell: string; text: string }> = {
  1: { cell: "bg-emerald-600", text: "text-white" },
  2: { cell: "bg-emerald-500/85", text: "text-white" },
  3: { cell: "bg-yellow-500", text: "text-black" },
  4: { cell: "bg-red-500", text: "text-white" },
  5: { cell: "bg-red-700", text: "text-white" },
};

const FDR_LABEL = ["", "Dễ nhất", "Dễ", "Trung bình", "Khó", "Rất khó"];

export default function FixturesPage() {
  const [numGW, setNumGW] = useState(8);

  const { data, isLoading } = useQuery({
    queryKey: ["fixtureDifficulty", numGW],
    queryFn: () => fplApi.getFixtureDifficulty(numGW).then((r) => r.data),
  });

  const gwCols = data?.[0]?.gw_fixtures ?? [];

  return (
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Phân tích lịch thi đấu</h1>
          <p className="text-slate-600 text-sm mt-1">Hệ số độ khó (FDR) · Cảnh báo biến động fixture</p>
        </div>
        <div className="flex items-center gap-1.5 bg-white/[0.03] p-1 rounded-xl border border-white/[0.06]">
          {[3, 5, 8].map((n) => (
            <button
              key={n}
              id={`btn-gw-${n}`}
              onClick={() => setNumGW(n)}
              className={cn(
                "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                numGW === n ? "bg-violet-600 text-white shadow-sm" : "text-slate-500 hover:text-white"
              )}
            >
              {n} GW
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[10px] text-slate-600 uppercase tracking-wider font-bold">Độ khó:</span>
        {[1, 2, 3, 4, 5].map((fdr) => (
          <span key={fdr} className={cn(
            "text-[10px] font-bold px-2.5 py-1 rounded-md",
            FDR_STYLE[fdr]?.cell, FDR_STYLE[fdr]?.text
          )}>
            {fdr} — {FDR_LABEL[fdr]}
          </span>
        ))}
      </div>

      {isLoading ? (
        <LoadingCard className="h-96" />
      ) : !data?.length ? (
        <EmptyState
          message="Chưa có dữ liệu lịch thi đấu. Nhấn 'Đồng bộ FPL' để tải."
          icon={<Calendar className="w-8 h-8" />}
        />
      ) : (
        <div className="space-y-4">
          {/* Swing alerts */}
          {data.filter((r) => r.swing_alert).length > 0 && (
            <div className="elevated-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <p className="text-sm font-bold text-white">Cảnh báo biến động lịch thi đấu</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {data
                  .filter((r) => r.swing_alert)
                  .map((r) => {
                    const isHarder = r.alert_severity === "sell" || r.alert_severity === "avoid";
                    return (
                      <div key={r.team_id} className={cn(
                        "flex items-start gap-2.5 p-3 rounded-xl border",
                        isHarder
                          ? "bg-red-500/5 border-red-500/15"
                          : "bg-emerald-500/5 border-emerald-500/15"
                      )}>
                        {isHarder
                          ? <TrendingDown className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                          : <TrendingUp className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                        }
                        <div>
                          <p className="font-bold text-white text-sm">{r.team_name}</p>
                          <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{r.swing_alert}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* FDR Table */}
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-600 uppercase tracking-wider sticky left-0 bg-[#0f1929] z-10 min-w-[120px]">
                      CLB
                    </th>
                    <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider min-w-[50px]">
                      TB 3GW
                    </th>
                    <th className="px-3 py-3 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider min-w-[50px]">
                      TB 5GW
                    </th>
                    {gwCols.map((gf) => (
                      <th key={gf.gw} className="px-2 py-3 text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider min-w-[72px]">
                        GW{gf.gw}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {data.map((row) => (
                    <tr key={row.team_id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-2.5 sticky left-0 bg-[#0f1929] z-10">
                        <p className="font-bold text-white text-xs">{row.team_short}</p>
                        <p className="text-[10px] text-slate-600 truncate max-w-[80px]">{row.team_name}</p>
                      </td>
                      {/* 3GW avg */}
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn(
                          "text-xs font-black tabular-nums",
                          row.avg_fdr_3 != null && row.avg_fdr_3 <= 2.5 ? "text-emerald-400"
                          : row.avg_fdr_3 != null && row.avg_fdr_3 <= 3.5 ? "text-yellow-400"
                          : "text-red-400"
                        )}>
                          {row.avg_fdr_3?.toFixed(1) ?? "—"}
                        </span>
                      </td>
                      {/* 5GW avg */}
                      <td className="px-3 py-2.5 text-center">
                        <span className={cn(
                          "text-xs font-black tabular-nums",
                          row.avg_fdr_5 != null && row.avg_fdr_5 <= 2.5 ? "text-emerald-400"
                          : row.avg_fdr_5 != null && row.avg_fdr_5 <= 3.5 ? "text-yellow-400"
                          : "text-red-400"
                        )}>
                          {row.avg_fdr_5?.toFixed(1) ?? "—"}
                        </span>
                      </td>
                      {/* GW cells */}
                      {row.gw_fixtures.map((gf) => {
                        const style = FDR_STYLE[Math.round(gf.fdr)] || { cell: "bg-slate-700", text: "text-slate-300" };
                        const venueLabel = gf.fixture_count === 0 ? "Blank" : gf.fixture_count && gf.fixture_count > 1 ? "Double" : gf.is_home ? "(S)" : "(K)";
                        return (
                          <td key={gf.gw} className="px-1.5 py-2">
                            <div className={cn(
                              "flex flex-col items-center justify-center px-1 py-1.5 rounded-lg text-[10px] font-bold leading-tight min-w-[62px]",
                              style.cell, style.text
                            )}>
                              <span className="font-black">{gf.opponent_short.replace(" (H)", "").replace(" (A)", "")}</span>
                              <span className="opacity-75 text-[9px]">{venueLabel}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2 border-t border-white/[0.05] flex items-center gap-4">
              <span className="text-[10px] text-slate-700">Ghi chú: (S) = Sân nhà · (K) = Sân khách</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
