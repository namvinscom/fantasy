import { cn } from "@/lib/utils";

// Recommendation badge
interface BadgeProps {
  label: string;
  variant?: "buy" | "hold" | "sell" | "watch" | "default";
  size?: "sm" | "md";
  className?: string;
}

const REC_VI: Record<string, string> = {
  BUY: "MUA",
  HOLD: "GIỮ",
  SELL: "BÁN",
  WATCH: "THEO DÕI",
};

export function Badge({ label, variant = "default", size = "sm", className }: BadgeProps) {
  const styles: Record<string, string> = {
    buy:   "badge-buy",
    hold:  "badge-hold",
    sell:  "badge-sell",
    watch: "badge-watch",
    default: "bg-white/5 text-slate-400 border border-white/8",
  };
  const sizes = { sm: "px-2 py-0.5 text-[10px]", md: "px-3 py-1 text-xs" };
  // Display Vietnamese label
  const display = REC_VI[label?.toUpperCase()] || label;
  return (
    <span className={cn(
      "inline-flex items-center rounded-md font-bold uppercase tracking-wider",
      styles[variant],
      sizes[size],
      className
    )}>
      {display}
    </span>
  );
}

// Position badge
const POS_VI: Record<string, string> = {
  GK: "THỦ",
  DEF: "HẬU",
  MID: "TIỀN",
  FWD: "TẤN",
};

export function PositionBadge({ position, showFull = false }: { position: string; showFull?: boolean }) {
  const normalizedPosition = position === "GKP" ? "GK" : position;
  const styles: Record<string, string> = {
    GK:  "bg-yellow-500/15 text-yellow-400 border border-yellow-500/25",
    DEF: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25",
    MID: "bg-blue-500/15 text-blue-400 border border-blue-500/25",
    FWD: "bg-red-500/15 text-red-400 border border-red-500/25",
  };
  return (
    <span className={cn(
      "inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-black tracking-wider",
      styles[normalizedPosition] || "bg-slate-700 text-slate-300"
    )}>
      {showFull ? normalizedPosition : (POS_VI[normalizedPosition] || normalizedPosition)}
    </span>
  );
}

// FPL Score badge
export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="text-slate-700 text-xs">—</span>;
  const color =
    score >= 72 ? "text-emerald-400" :
    score >= 55 ? "text-blue-400" :
    score >= 40 ? "text-yellow-400" :
    "text-red-400";
  const bg =
    score >= 72 ? "bg-emerald-500/10 border-emerald-500/20" :
    score >= 55 ? "bg-blue-500/10 border-blue-500/20" :
    score >= 40 ? "bg-yellow-500/10 border-yellow-500/20" :
    "bg-red-500/10 border-red-500/20";
  return (
    <span className={cn("font-black text-sm px-2 py-0.5 rounded-lg border font-mono", color, bg)}>
      {score.toFixed(0)}
    </span>
  );
}

// FDR badge
export function FDRBadge({ fdr, size = "sm" }: { fdr: number | null | undefined; size?: "sm" | "md" }) {
  if (fdr == null) return null;
  const sizeStyle = size === "md" ? "w-7 h-7 text-sm" : "w-5 h-5 text-xs";
  return (
    <span className={cn("inline-flex items-center justify-center rounded-md font-bold", `fdr-${fdr}`, sizeStyle)}>
      {fdr}
    </span>
  );
}

// Status dot
export function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    a: "bg-emerald-500",
    d: "bg-yellow-500",
    i: "bg-red-500",
    s: "bg-red-600",
    u: "bg-slate-500",
    n: "bg-slate-600",
  };
  return <span className={cn("inline-block w-2 h-2 rounded-full", colors[status] || "bg-slate-500")} />;
}

// Chip status badge
export function ChipBadge({ used, inPhase }: { used: boolean; inPhase: boolean }) {
  if (used) return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-500/15 text-red-400 border border-red-500/20">
      Đã dùng
    </span>
  );
  if (!inPhase) return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-500/15 text-slate-500 border border-slate-500/20">
      Sai GW
    </span>
  );
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
      Có thể dùng
    </span>
  );
}
