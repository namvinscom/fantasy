"use client";
import { useQuery } from "@tanstack/react-query";
import fplApi from "@/lib/api";
import { LoadingCard } from "@/components/ui/Cards";
import { ChipBadge } from "@/components/ui/Badge";
import { Info, Zap } from "lucide-react";
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
                  "glass-card p-5 transition-all",
                  used
                    ? "opacity-50 border-red-500/15"
                    : inPhase
                    ? "border-violet-500/20"
                    : "opacity-40"
                )}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-2xl">{chip.icon}</span>
                  <ChipBadge used={used} inPhase={inPhase} />
                </div>
                <h3 className="text-base font-black text-white mb-0.5">{chip.label}</h3>
                <p className="text-[10px] font-bold uppercase tracking-wider text-violet-400 mb-2">{chip.phase}</p>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3">{chip.desc}</p>
                <div className="border-t border-white/[0.05] pt-2.5">
                  <p className="text-[10px] text-yellow-500/70 leading-snug">
                    💡 {chip.tip}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
