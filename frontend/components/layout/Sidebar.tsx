"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Calendar,
  ArrowLeftRight,
  Zap,
  Shuffle,
  RefreshCw,
  Trophy,
  Activity,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import fplApi from "@/lib/api";
import { useState } from "react";
import { timeAgo } from "@/lib/utils";

const NAV = [
  { href: "/", icon: LayoutDashboard, label: "Tổng quan" },
  { href: "/squad", icon: Trophy, label: "Đội của tôi" },
  { href: "/players", icon: Users, label: "Cầu thủ" },
  { href: "/fixtures", icon: Calendar, label: "Lịch thi đấu" },
  { href: "/transfers", icon: ArrowLeftRight, label: "Transfer" },
  { href: "/chips", icon: Zap, label: "Chip" },
  { href: "/simulator", icon: Shuffle, label: "Mô phỏng" },
];

export function Sidebar() {
  const pathname = usePathname();
  const qc = useQueryClient();
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastManualSync, setLastManualSync] = useState<string | null>(null);
  const [lastManualSyncFailed, setLastManualSyncFailed] = useState(false);

  const { data: syncStatus } = useQuery({
    queryKey: ["syncStatus"],
    queryFn: () => fplApi.getSyncStatus().then((r) => r.data),
    staleTime: 60_000,
  });

  const latestSyncLog = syncStatus?.[0];
  const lastSync = lastManualSync || latestSyncLog?.created_at;
  const lastSyncFailed = lastManualSync ? lastManualSyncFailed : latestSyncLog?.status === "error";

  const syncMut = useMutation({
    mutationFn: () => fplApi.sync().then((r) => r.data),
    onSuccess: (data) => {
      const p = data.results?.players ?? 0;
      const f = data.results?.fixtures ?? 0;
      const ok = data.status === "ok";
      setLastManualSync(data.timestamp || new Date().toISOString());
      setLastManualSyncFailed(!ok);
      setSyncMsg(ok ? `${p} cầu thủ, ${f} trận đã đồng bộ` : (data.results?.error || "Không thể lấy dữ liệu mới từ FPL."));
      setIsSuccess(ok);
      qc.invalidateQueries({ queryKey: ["syncStatus"] });
      qc.invalidateQueries({ queryKey: ["players"] });
      qc.invalidateQueries({ queryKey: ["squad"] });
      setTimeout(() => { setSyncMsg(null); setIsSuccess(false); }, 6000);
    },
    onError: () => {
      setLastManualSync(new Date().toISOString());
      setLastManualSyncFailed(true);
      setSyncMsg("Đồng bộ thất bại. Kiểm tra backend hoặc kết nối FPL.");
      setIsSuccess(false);
      setTimeout(() => setSyncMsg(null), 5000);
    },
  });

  return (
    <aside className="w-60 h-screen flex flex-col shrink-0 border-r border-white/[0.05]" style={{ background: "linear-gradient(180deg, #080f1c 0%, #060b14 100%)" }}>
      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/[0.05]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}>
            <span className="text-white font-black text-xs">NV</span>
          </div>
          <div className="min-w-0">
            <p className="font-black text-white text-sm leading-tight tracking-tight">Namvinscom</p>
            <p className="text-[10px] font-semibold tracking-wider" style={{ color: "rgba(124,58,237,0.8)" }}>FANTASY · 2026/27</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="section-title px-2 mb-3">Menu</p>
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150",
                active
                  ? "text-white"
                  : "text-slate-500 hover:text-slate-200 hover:bg-white/[0.04]"
              )}
              style={active ? {
                background: "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(37,99,235,0.12))",
                border: "1px solid rgba(124,58,237,0.25)",
              } : {}}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-violet-400" : "")} />
              {label}
              {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-500 pulse-dot" />}
            </Link>
          );
        })}
      </nav>

      {/* Sync section */}
      <div className="px-3 pb-4 border-t border-white/[0.05] pt-3">
        {/* Last sync info */}
        {lastSync && (
          <div className={cn(
            "mb-2 flex items-center gap-2 rounded-lg border px-2.5 py-2",
            lastSyncFailed
              ? "border-red-400/20 bg-red-400/[0.08]"
              : "border-emerald-400/15 bg-emerald-400/[0.08]"
          )}>
            {lastSyncFailed ? (
              <AlertCircle className="w-3.5 h-3.5 text-red-300" />
            ) : (
              <Activity className="w-3.5 h-3.5 text-emerald-400 live-dot" />
            )}
            <span className={cn(
              "text-[11px] font-medium",
              lastSyncFailed ? "text-red-100/80" : "text-emerald-100/80"
            )}>
              {lastSyncFailed ? "Lần sync lỗi" : "Cập nhật"} {timeAgo(lastSync)}
            </span>
          </div>
        )}

        {/* Sync message */}
        {syncMsg && (
          <div className={cn(
            "text-xs px-3 py-2 rounded-lg mb-2 leading-snug",
            isSuccess ? "bg-emerald-900/30 text-emerald-400 border border-emerald-800/40" : "bg-red-900/30 text-red-400 border border-red-800/40"
          )}>
            <span className="flex items-start gap-2">
              {isSuccess ? <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" /> : <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
              <span>{syncMsg}</span>
            </span>
          </div>
        )}

        <button
          id="btn-sync-fpl"
          onClick={() => syncMut.mutate()}
          disabled={syncMut.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold btn-primary"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", syncMut.isPending && "animate-spin")} />
          {syncMut.isPending ? "Đang đồng bộ…" : "Đồng bộ FPL"}
        </button>
        <p className="text-[10px] text-slate-700 mt-1.5 text-center">
          Dữ liệu từ fantasy.premierleague.com
        </p>
      </div>
    </aside>
  );
}
