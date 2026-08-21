"use client";
import { useQuery } from "@tanstack/react-query";
import fplApi from "@/lib/api";
import { LoadingCard } from "@/components/ui/Cards";
import { ChipBadge } from "@/components/ui/Badge";
import { Info, Zap, Sparkles, TrendingUp, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

const CHIP_INFO = [
  {
    key: "wildcard_1",
    label: "Wildcard 1",
    phase: "GW1–GW19",
    phaseStart: 1, phaseEnd: 19,
    icon: "🃏",
    desc: "Chuyển nhượng không giới hạn trong 1 GW. Giá trị đội được giữ nguyên. Sử dụng khi cần tái cơ cấu toàn bộ đội.",
    tip: "Dùng khi squad cần thay đổi lớn, không dùng sớm trong mùa.",
  },
  {
    key: "wildcard_2",
    label: "Wildcard 2",
    phase: "GW20–GW38",
    phaseStart: 20, phaseEnd: 38,
    icon: "🃏",
    desc: "Wildcard cho nửa mùa thứ hai. Lý tưởng để chuẩn bị trước các DGW.",
    tip: "Giữ để dùng trước Double Gameweek lớn ở cuối mùa.",
  },
  {
    key: "freehit_1",
    label: "Free Hit 1",
    phase: "GW1–GW19",
    phaseStart: 1, phaseEnd: 19,
    icon: "⚡",
    desc: "Chuyển nhượng không giới hạn trong 1 GW. Đội hình trở về trạng thái cũ sau GW.",
    tip: "Dành riêng cho Blank Gameweek — các cầu thủ không có trận đấu.",
  },
  {
    key: "freehit_2",
    label: "Free Hit 2",
    phase: "GW20–GW38",
    phaseStart: 20, phaseEnd: 38,
    icon: "⚡",
    desc: "Free Hit cho nửa mùa thứ hai. Đội hình trở về trạng thái cũ sau GW.",
    tip: "Giữ cho BGW cuối mùa nếu nhiều cầu thủ bị trống lịch.",
  },
  {
    key: "bench_boost",
    label: "Bench Boost",
    phase: "Bất kỳ GW",
    phaseStart: 1, phaseEnd: 38,
    icon: "🚀",
    desc: "Tính điểm của cả 4 cầu thủ trên băng ghế dự bị trong 1 GW.",
    tip: "Dùng trong Double Gameweek khi ghế dự bị cũng có 2 trận.",
  },
  {
    key: "triple_captain",
    label: "Triple Captain",
    phase: "Bất kỳ GW",
    phaseStart: 1, phaseEnd: 38,
    icon: "👑",
    desc: "Nhân 3 điểm của captain trong 1 GW thay vì nhân đôi.",
    tip: "Dùng trong DGW với captain an toàn như Haaland khi fixture dễ.",
  },
];

export default function ChipsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["squad"],
    queryFn: () => fplApi.getSquad().then((r) => r.data),
  });
  const { data: gwData } = useQuery({
    queryKey: ["currentGW"],
    queryFn: () => fplApi.getCurrentGW().then((r) => r.data),
    retry: false,
  });

  const { data: plannerData } = useQuery({
    queryKey: ["chipPlanner"],
    queryFn: () => fplApi.getChipPlannerData().then((r) => r.data),
  });

  const chips = data?.squad?.chips as Record<string, boolean> | undefined;
  const currentGW = gwData?.id ?? 1;

  return (
    <div className="p-6 fade-in">
      {/* Header */}
      <div className="mb-5">
        <h1 className="text-2xl font-black text-white tracking-tight">Kế hoạch Chip</h1>
        <p className="text-slate-600 text-sm mt-1">
          Mùa 2026/27 · {currentGW ? `Đang ở GW${currentGW}` : "Chưa đồng bộ"}
        </p>
      </div>

      {/* Structure info */}
      <div className="elevated-card p-4 mb-5 flex items-start gap-3">
        <Info className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-white mb-1">Cấu trúc chip mùa 2026/27</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Mùa này có <strong className="text-white">2 bộ chip</strong>: GW1–19 (nửa đầu) và GW20–38 (nửa sau). 
            Không thể dùng chip sai giai đoạn. Bench Boost và Triple Captain có thể dùng bất kỳ GW nào, mỗi chip dùng 1 lần/mùa.
          </p>
        </div>
      </div>

      {/* Chip cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <LoadingCard key={i} className="h-44" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {CHIP_INFO.map((chip) => {
            const used = chips ? chips[chip.key] : false;
            const inPhase = chip.phase === "Bất kỳ GW" || (currentGW >= chip.phaseStart && currentGW <= chip.phaseEnd);

            return (
              <div
                key={chip.key}
                className={cn(
                  "glass-card p-5 transition-all relative overflow-hidden",
                  used
                    ? "border-red-500/20 bg-red-900/10 opacity-75 grayscale-[30%]"
                    : inPhase
                    ? "border-emerald-500/40 bg-gradient-to-br from-emerald-900/20 to-transparent shadow-[0_0_20px_rgba(16,185,129,0.08)] hover:border-emerald-400/60 hover:shadow-[0_0_30px_rgba(16,185,129,0.15)] hover:-translate-y-1"
                    : "border-slate-700/50 bg-slate-900/50 opacity-60"
                )}
              >
                {/* Status Indicator */}
                {used && (
                  <div className="absolute top-4 right-4 transform rotate-12 border-2 border-red-500/50 text-red-500/70 text-[10px] font-black tracking-widest px-2 py-0.5 rounded">
                    ĐÃ DÙNG
                  </div>
                )}
                {!used && !inPhase && (
                  <div className="absolute top-4 right-4 flex items-center gap-1 text-slate-500 bg-slate-800/80 px-2 py-1 rounded-md border border-slate-700/50">
                    <Lock className="w-3 h-3" />
                    <span className="text-[9px] font-bold uppercase tracking-wider">Sai Giai Đoạn</span>
                  </div>
                )}
                {!used && inPhase && (
                  <div className="absolute top-4 right-4 flex items-center gap-1.5 text-emerald-400 bg-emerald-900/30 px-2.5 py-1 rounded-md border border-emerald-500/30">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-bold uppercase tracking-wider">Sẵn sàng</span>
                  </div>
                )}

                <div className="mb-4 mt-2">
                  <span className="text-3xl drop-shadow-md">{chip.icon}</span>
                </div>
                
                <h3 className={cn("text-lg font-black mb-0.5", used ? "text-slate-400" : inPhase ? "text-emerald-50" : "text-slate-300")}>
                  {chip.label}
                </h3>
                <p className={cn("text-[10px] font-bold uppercase tracking-wider mb-2", used ? "text-red-400/60" : inPhase ? "text-emerald-400" : "text-slate-500")}>
                  {chip.phase}
                </p>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">
                  {chip.desc}
                </p>
                
                <div className={cn("border-t pt-3", used ? "border-red-500/10" : inPhase ? "border-emerald-500/20" : "border-white/[0.05]")}>
                  <p className={cn("text-[11px] leading-snug font-medium", used ? "text-slate-500" : inPhase ? "text-yellow-400" : "text-slate-500")}>
                    💡 {chip.tip}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Recommendations */}
      <div className="mb-6">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-violet-400" />
          AI Khuyến nghị chiến lược
        </h3>
        <div className="glass-card p-5 border border-violet-500/20 bg-violet-900/10">
          {plannerData?.recommendations?.length ? (
            <ul className="space-y-2">
              {plannerData.recommendations.map((rec: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm text-violet-100">
                  <span className="text-violet-400 mt-0.5 font-black">→</span>
                  <span className="leading-relaxed">{rec}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Chưa có khuyến nghị nào.</p>
          )}
        </div>
      </div>

      {/* Special Gameweeks Timeline */}
      <div className="mb-6">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-400" />
          Lịch thi đấu đặc biệt (BGW / DGW)
        </h3>
        <div className="glass-card p-5">
          {plannerData?.special_gameweeks?.length ? (
            <div className="space-y-4">
              {plannerData.special_gameweeks.map((gw) => (
                <div key={gw.gameweek} className="border-b border-white/[0.05] pb-4 last:border-0 last:pb-0">
                  <p className="font-black text-white text-sm mb-2">Gameweek {gw.gameweek}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {gw.blanks.length > 0 && (
                      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
                        <p className="text-[10px] uppercase font-bold text-red-400 tracking-wider mb-1">Blank (Không đá)</p>
                        <p className="text-xs text-red-200">{gw.blanks.join(", ")}</p>
                      </div>
                    )}
                    {gw.doubles.length > 0 && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3">
                        <p className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider mb-1">Double (Đá 2 trận)</p>
                        <p className="text-xs text-emerald-200">{gw.doubles.join(", ")}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Chưa phát hiện Gameweek nào có lịch thi đấu đặc biệt.</p>
          )}
        </div>
      </div>

      {/* Squad Horizon Analysis */}
      <div className="mb-6">
        <h3 className="font-bold text-white mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          Squad Horizon (Độ khó lịch thi đấu 5 vòng tới)
        </h3>
        <div className="glass-card p-5">
          {plannerData?.squad_horizon?.length ? (
            <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
              {plannerData.squad_horizon.map((h: any) => {
                const diff = h.average_fdr;
                const isHard = diff >= 3.5 || h.has_blank;
                const isEasy = diff <= 2.6 && !h.has_blank;
                return (
                  <div key={h.gameweek} className={cn(
                    "flex-1 min-w-[80px] p-3 rounded-xl border flex flex-col items-center justify-center text-center",
                    isHard ? "bg-red-500/10 border-red-500/20" : isEasy ? "bg-emerald-500/10 border-emerald-500/20" : "bg-slate-800/50 border-white/5"
                  )}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">GW{h.gameweek}</p>
                    <p className={cn(
                      "text-xl font-black mb-1",
                      isHard ? "text-red-400" : isEasy ? "text-emerald-400" : "text-white"
                    )}>
                      {h.average_fdr.toFixed(1)}
                    </p>
                    {h.has_blank && <p className="text-[9px] font-bold text-red-300 bg-red-900/40 px-1.5 py-0.5 rounded">BLANK</p>}
                    {h.has_double && <p className="text-[9px] font-bold text-emerald-300 bg-emerald-900/40 px-1.5 py-0.5 rounded">DOUBLE</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-4">Không có dữ liệu đội hình để phân tích.</p>
          )}
        </div>
      </div>

      {/* Strategy guide */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-yellow-400" />
          <h3 className="font-bold text-white">Chiến lược sử dụng Chip</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-[11px] text-slate-500">
          {[
            {
              title: "Wildcard — Khi nào?",
              content: "Khi squad bị thương hàng loạt, fixture swing lớn, hoặc cần rebuild hoàn toàn. Không dùng sớm trong mùa trừ khẩn cấp. Lưu để dùng trước chuỗi fixture tốt."
            },
            {
              title: "Free Hit — Chiến thuật",
              content: "Lý tưởng nhất trong Blank Gameweek khi nhiều cầu thủ không có trận. Chọn 15 cầu thủ có lịch tốt nhất GW đó mà không ảnh hưởng squad dài hạn."
            },
            {
              title: "Bench Boost — Cách tối đa hóa",
              content: "Phải chuẩn bị từ trước: dùng Wildcard để đảm bảo ghế dự bị có cầu thủ 2 trận. Lý tưởng nhất khi tất cả 15 cầu thủ đều có DGW."
            },
            {
              title: "Triple Captain — Chọn ai?",
              content: "Chọn cầu thủ có floor cao nhất, không phải ceiling. Haaland/Salah trong DGW với fixture dễ là lựa chọn tối ưu. Tránh differential captain."
            },
          ].map((item) => (
            <div key={item.title}>
              <p className="font-bold text-white mb-1.5">{item.title}</p>
              <p className="leading-relaxed">{item.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
