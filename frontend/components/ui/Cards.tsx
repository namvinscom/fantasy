// Cards UI Components — inapp-1.0.0 light mode style

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: React.ReactNode;
  iconVariant?: "primary" | "success" | "info" | "warning" | "danger";
}

export function StatCard({ label, value, sub, color, icon, iconVariant = "primary" }: StatCardProps) {
  return (
    <div className="stat-card">
      {icon && (
        <div className={`stat-icon stat-icon-${iconVariant}`}>
          {icon}
        </div>
      )}
      <div style={{ minWidth: 0 }}>
        <p className="stat-label">{label}</p>
        <p className="stat-value" style={color ? { color } : undefined}>{value}</p>
        {sub && <p className="stat-sub">{sub}</p>}
      </div>
    </div>
  );
}

export function LoadingCard({ className }: { className?: string }) {
  return (
    <div className={`shimmer rounded-xl ${className || "h-32"}`} />
  );
}

export function EmptyState({
  message,
  icon,
  action,
}: {
  message: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="empty-state">
        {icon && <span style={{ color: "#d4d4d4" }}>{icon}</span>}
        <p style={{ fontSize: "0.8125rem", color: "#737373", maxWidth: 280, lineHeight: 1.5 }}>{message}</p>
        {action && <div>{action}</div>}
      </div>
    </div>
  );
}

export function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      {sub && <p>{sub}</p>}
    </div>
  );
}
