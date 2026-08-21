"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import fplApi from "@/lib/api";
import { LoadingCard } from "@/components/ui/Cards";
import { cn } from "@/lib/utils";
import { BarChart3, Calendar, Trophy, Target } from "lucide-react";

export default function GameweeksPage() {
  const [selectedGwId, setSelectedGwId] = useState<number | null>(null);

  const { data: gws, isLoading: isLoadingGws } = useQuery({
    queryKey: ["gameweeks"],
    queryFn: () => fplApi.getGameweeks().then((r) => r.data),
  });

  const gwId = selectedGwId ?? gws?.find((g) => g.is_current)?.id ?? gws?.[0]?.id ?? 1;
  const currentGw = gws?.find(g => g.id === gwId);

  const { data: fixtures, isLoading: isLoadingFix } = useQuery({
    queryKey: ["fixtures", gwId],
    queryFn: () => fplApi.getFixtures({ gameweek: gwId }).then((r) => r.data),
    enabled: !!gwId,
  });

  if (isLoadingGws) return <div className="p-6"><LoadingCard className="h-96" /></div>;

  return (
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-blue-400" />
          Phân tích Gameweek
        </h1>
        <p className="text-slate-600 text-sm mt-1">
          Lịch thi đấu và tổng hợp điểm số các vòng đấu
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6">
        {/* Sidebar GW selection */}
        <div className="glass-card p-4 overflow-y-auto max-h-[70vh]">
          <h3 className="font-bold text-white mb-4 text-sm px-2">Chọn vòng đấu</h3>
          <div className="space-y-1">
            {gws?.map((gw) => (
              <button
                key={gw.id}
                onClick={() => setSelectedGwId(gw.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-between",
                  gwId === gw.id
                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    : "text-slate-400 hover:text-white hover:bg-white/[0.02]"
                )}
              >
                <span>{gw.name}</span>
                {gw.is_current && <span className="text-[9px] uppercase tracking-wider bg-blue-500 text-white px-1.5 py-0.5 rounded">Live</span>}
                {gw.is_next && <span className="text-[9px] uppercase tracking-wider text-slate-500">Next</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div>
          {currentGw && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Điểm trung bình</p>
                  <Target className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-2xl font-black text-white">{currentGw.average_entry_score ?? "—"}</p>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Điểm cao nhất</p>
                  <Trophy className="w-4 h-4 text-yellow-400" />
                </div>
                <p className="text-2xl font-black text-yellow-400">{currentGw.highest_score ?? "—"}</p>
              </div>
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Top Player ID</p>
                  <Trophy className="w-4 h-4 text-emerald-400" />
                </div>
                <p className="text-2xl font-black text-emerald-400">{currentGw.top_element ?? "—"}</p>
              </div>
            </div>
          )}

          <h3 className="font-bold text-white mb-4 text-lg">Lịch thi đấu GW{gwId}</h3>
          
          {isLoadingFix ? (
            <LoadingCard className="h-48" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fixtures?.map((f) => {
                const date = f.kickoff_time ? new Date(f.kickoff_time) : null;
                return (
                  <div key={f.id} className="glass-card p-4 flex flex-col">
                    <div className="text-[10px] text-slate-500 mb-3 flex items-center gap-1.5">
                      <Calendar className="w-3 h-3" />
                      {date ? date.toLocaleString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "TBA"}
                      {f.finished && <span className="ml-auto text-emerald-500 font-bold">FT</span>}
                    </div>
                    
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-3 w-2/5">
                        <span className={cn(
                          "w-6 h-6 flex items-center justify-center rounded text-[10px] font-black",
                          f.team_h_difficulty === 1 ? "bg-emerald-500/20 text-emerald-400" :
                          f.team_h_difficulty === 2 ? "bg-emerald-500/20 text-emerald-400" :
                          f.team_h_difficulty === 3 ? "bg-slate-500/20 text-slate-300" :
                          f.team_h_difficulty === 4 ? "bg-red-500/20 text-red-400" :
                          "bg-red-900/40 text-red-500"
                        )}>{f.team_h_difficulty}</span>
                        <span className="font-bold text-white text-sm">{f.team_h_name}</span>
                      </div>
                      
                      <div className="flex-1 flex justify-center text-lg font-black text-white px-2">
                        {f.finished ? `${f.team_h_score} - ${f.team_a_score}` : "v"}
                      </div>

                      <div className="flex items-center justify-end gap-3 w-2/5">
                        <span className="font-bold text-white text-sm text-right">{f.team_a_name}</span>
                        <span className={cn(
                          "w-6 h-6 flex items-center justify-center rounded text-[10px] font-black",
                          f.team_a_difficulty === 1 ? "bg-emerald-500/20 text-emerald-400" :
                          f.team_a_difficulty === 2 ? "bg-emerald-500/20 text-emerald-400" :
                          f.team_a_difficulty === 3 ? "bg-slate-500/20 text-slate-300" :
                          f.team_a_difficulty === 4 ? "bg-red-500/20 text-red-400" :
                          "bg-red-900/40 text-red-500"
                        )}>{f.team_a_difficulty}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
