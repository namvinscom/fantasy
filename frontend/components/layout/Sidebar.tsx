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
  BarChart3,
  GitCompare,
} from "lucide-react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import fplApi from "@/lib/api";
import { useState, useEffect, useRef } from "react";
import { timeAgo } from "@/lib/utils";

const NAV = [
  { href: "/", icon: LayoutDashboard, label: "Tổng quan" },
  { href: "/squad", icon: Trophy, label: "Đội của tôi" },
  { href: "/players", icon: Users, label: "Cầu thủ" },
  { href: "/fixtures", icon: Calendar, label: "Lịch thi đấu" },
  { href: "/transfers", icon: ArrowLeftRight, label: "Transfer" },
  { href: "/compare", icon: GitCompare, label: "So sánh" },
  { href: "/chips", icon: Zap, label: "Chip" },
  { href: "/gameweeks", icon: BarChart3, label: "Gameweeks" },
  { href: "/simulator", icon: Shuffle, label: "Mô phỏng" },
];

export function Sidebar() {
  const pathname = usePathname();
  const qc = useQueryClient();
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastManualSync, setLastManualSync] = useState<string | null>(null);
  const [lastManualSyncFailed, setLastManualSyncFailed] = useState(false);

  const { data: syncStatusResponse } = useQuery({
    queryKey: ["syncStatus"],
    queryFn: () => fplApi.getSyncStatus().then((r) => r.data),
    staleTime: 5000,
    refetchInterval: (query) => query.state.data?.is_syncing ? 2000 : false,
  });

  const prevIsSyncing = useRef(syncStatusResponse?.is_syncing);

  useEffect(() => {
    if (prevIsSyncing.current === true && syncStatusResponse?.is_syncing === false) {
      qc.invalidateQueries();
      setSyncMsg("Đồng bộ hoàn tất. Dữ liệu đã được cập nhật.");
      setIsSuccess(true);
      setTimeout(() => setSyncMsg(null), 5000);
    }
    prevIsSyncing.current = syncStatusResponse?.is_syncing;
  }, [syncStatusResponse?.is_syncing, qc]);

  const syncMut = useMutation({
    mutationFn: () => fplApi.sync().then((r) => r.data),
    onSuccess: (data) => {
      const ok = data.status === "processing";
      setLastManualSync(data.timestamp || new Date().toISOString());
      setLastManualSyncFailed(!ok);
      setSyncMsg(ok ? "Đang đồng bộ ngầm..." : "Không thể khởi tạo đồng bộ.");
      setIsSuccess(ok);
      qc.invalidateQueries({ queryKey: ["syncStatus"] });
    },
    onError: () => {
      setLastManualSync(new Date().toISOString());
      setLastManualSyncFailed(true);
      setSyncMsg("Đồng bộ thất bại. Kiểm tra backend.");
      setIsSuccess(false);
      setTimeout(() => setSyncMsg(null), 5000);
    },
  });

  const isSyncing = syncStatusResponse?.is_syncing || syncMut.isPending;
  const latestSyncLog = syncStatusResponse?.logs?.[0];
  const lastSync = lastManualSync || latestSyncLog?.created_at;
  const lastSyncFailed = lastManualSync ? lastManualSyncFailed : latestSyncLog?.status === "error";

  return (
    <aside
      className="sidebar"
      style={{ width: "240px", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 1030 }}
    >
      {/* Logo */}
      <div className="sidebar-logo">
        <div
          style={{
            width: 34, height: 34, borderRadius: 10,
            background: "linear-gradient(135deg, #E66239, #c4502d)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ color: "#fff", fontWeight: 800, fontSize: 13, letterSpacing: -0.5 }}>NV</span>
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14, color: "#262626", lineHeight: 1.2 }}>Namvinscom</p>
          <p style={{ fontWeight: 600, fontSize: 10, color: "#E66239", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Fantasy · 2026/27
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        <p className="sidebar-nav-group-label">Menu chính</p>
        {NAV.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/" && pathname.startsWith(href));
          return (
            <Link key={href} href={href} className={`nav-link ${active ? "active" : ""}`}>
              <Icon className="nav-icon" />
              <span>{label}</span>
              {active && <span className="nav-badge" />}
            </Link>
          );
        })}
      </nav>

      {/* Sync section */}
      <div style={{ padding: "12px", borderTop: "1px solid #e5e5e5" }}>
        {/* Sync status message */}
        {syncMsg && (
          <div
            style={{
              display: "flex", alignItems: "flex-start", gap: 8,
              padding: "9px 12px",
              borderRadius: 8,
              marginBottom: 8,
              fontSize: 12, fontWeight: 500,
              background: isSuccess ? "rgba(0,201,81,0.08)" : "rgba(251,44,54,0.08)",
              color: isSuccess ? "#00a843" : "#d91a24",
              border: `1px solid ${isSuccess ? "rgba(0,201,81,0.2)" : "rgba(251,44,54,0.2)"}`,
            }}
          >
            {isSuccess
              ? <CheckCircle2 style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
              : <AlertCircle style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
            }
            <span style={{ lineHeight: 1.4 }}>{syncMsg}</span>
          </div>
        )}

        {/* Last sync info */}
        {lastSync && !syncMsg && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 7,
              padding: "7px 10px",
              borderRadius: 8, marginBottom: 8,
              fontSize: 11.5, fontWeight: 500,
              background: lastSyncFailed ? "rgba(251,44,54,0.06)" : "rgba(0,201,81,0.06)",
              color: lastSyncFailed ? "#d91a24" : "#00a843",
              border: `1px solid ${lastSyncFailed ? "rgba(251,44,54,0.15)" : "rgba(0,201,81,0.15)"}`,
            }}
          >
            <Activity style={{ width: 13, height: 13 }} />
            <span>{lastSyncFailed ? "Lần sync lỗi" : "Cập nhật"} {timeAgo(lastSync)}</span>
          </div>
        )}

        <button
          id="btn-sync-fpl"
          onClick={() => syncMut.mutate()}
          disabled={isSyncing}
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
        >
          <RefreshCw style={{ width: 14, height: 14 }} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Đang đồng bộ…" : "Đồng bộ FPL"}
        </button>
        <p style={{ fontSize: 11, color: "#a3a3a3", marginTop: 6, textAlign: "center" }}>
          Từ fantasy.premierleague.com
        </p>
      </div>
    </aside>
  );
}
