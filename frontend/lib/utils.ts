import { clsx, type ClassValue } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPrice(price: number | null | undefined): string {
  if (price == null) return "£?.?m";
  return `£${(price / 10).toFixed(1)}m`;
}

export function formatBank(bank: number | null | undefined): string {
  if (bank == null) return "£?.?m";
  return `£${(bank / 10).toFixed(1)}m`;
}

export function getStatusLabel(status: string): string {
  const map: Record<string, string> = {
    a: "Available",
    d: "Doubtful",
    i: "Injured",
    s: "Suspended",
    u: "Unavailable",
    n: "Ineligible",
  };
  return map[status] || status;
}

export function getStatusColor(status: string): string {
  if (status === "a") return "text-emerald-400";
  if (status === "d") return "text-yellow-400";
  return "text-red-400";
}

export function getRecommendationColor(rec: string): string {
  if (rec === "BUY") return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
  if (rec === "HOLD") return "text-blue-400 bg-blue-400/10 border-blue-400/30";
  if (rec === "SELL") return "text-red-400 bg-red-400/10 border-red-400/30";
  if (rec === "WATCH") return "text-yellow-400 bg-yellow-400/10 border-yellow-400/30";
  return "text-slate-400 bg-slate-400/10 border-slate-400/30";
}

export function getFDRColor(fdr: number): string {
  if (fdr <= 2) return "bg-emerald-500";
  if (fdr === 3) return "bg-yellow-500";
  return "bg-red-500";
}

export function getFDRTextColor(fdr: number): string {
  if (fdr <= 2) return "text-emerald-400";
  if (fdr === 3) return "text-yellow-400";
  return "text-red-400";
}

export function getPositionColor(pos: string): string {
  const map: Record<string, string> = {
    GK: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    DEF: "bg-green-500/20 text-green-400 border-green-500/30",
    MID: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    FWD: "bg-red-500/20 text-red-400 border-red-500/30",
  };
  return map[pos] || "bg-slate-500/20 text-slate-400";
}

export function getScoreColor(score: number): string {
  if (score >= 72) return "text-emerald-400";
  if (score >= 55) return "text-blue-400";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

export function getScoreBg(score: number): string {
  if (score >= 72) return "bg-emerald-500";
  if (score >= 55) return "bg-blue-500";
  if (score >= 40) return "bg-yellow-500";
  return "bg-red-500";
}

export function formatRank(rank: number | null | undefined): string {
  if (rank == null) return "—";
  return rank.toLocaleString();
}

export function timeAgo(isoString: string): string {
  const normalized = /[zZ]|[+-]\d{2}:\d{2}$/.test(isoString) ? isoString : `${isoString}Z`;
  const diff = Math.max(0, Date.now() - new Date(normalized).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}
