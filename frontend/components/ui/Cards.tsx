import { cn } from "@/lib/utils";
import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export function StatCard({ label, value, sub, color, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn("glass-card p-4 relative overflow-hidden group", className)}>
      {/* Subtle background gradient */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.04) 0%, transparent 60%)" }} />
      <div className="relative">
        <div className="flex items-start justify-between mb-2">
          <p className="text-[10px] font-bold tracking-widest uppercase" style={{ color: "rgba(255,255,255,0.3)" }}>{label}</p>
          {icon && <span className="text-slate-600">{icon}</span>}
        </div>
        <p className={cn("text-2xl font-black tracking-tight", color || "text-white")} style={{ fontFamily: "var(--font-space, sans-serif)" }}>
          {value}
        </p>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{sub}</p>}
        {trend && (
          <span className={cn("text-xs font-semibold mt-1 block",
            trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-slate-500"
          )}>
            {trend === "up" ? "▲" : trend === "down" ? "▼" : "—"}
          </span>
        )}
      </div>
    </div>
  );
}

export function LoadingCard({ className }: { className?: string }) {
  return <div className={cn("shimmer rounded-xl", className || "h-24")} />;
}

export function EmptyState({ message, icon, action }: { 
  message: string; 
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="glass-card p-10 flex flex-col items-center justify-center text-center gap-3">
      {icon && <div className="text-slate-700">{icon}</div>}
      <p className="text-slate-500 text-sm max-w-xs leading-relaxed">{message}</p>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

export function SectionHeader({ title, sub, action }: { 
  title: string; 
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between mb-3">
      <div>
        <h2 className="text-base font-bold text-white tracking-tight">{title}</h2>
        {sub && <p className="text-[11px] mt-0.5" style={{ color: "rgba(255,255,255,0.3)" }}>{sub}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function InfoBanner({ text, type = "info" }: { text: string; type?: "info" | "warning" | "success" }) {
  const styles = {
    info: "bg-blue-900/20 border-blue-800/30 text-blue-300",
    warning: "bg-yellow-900/20 border-yellow-800/30 text-yellow-300",
    success: "bg-emerald-900/20 border-emerald-800/30 text-emerald-300",
  };
  return (
    <div className={cn("px-4 py-3 rounded-xl border text-xs leading-relaxed", styles[type])}>
      {text}
    </div>
  );
}
