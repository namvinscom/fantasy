// Badge UI Components — inapp-1.0.0 light mode style

export function Badge({
  label,
  variant,
  size,
}: {
  label: string;
  variant?: "buy" | "hold" | "sell" | "watch" | "primary" | "success" | "info" | "warning" | "danger" | "must-have" | "solid hold" | "monitor / rotation" | "sell / drop";
  size?: string;
}) {
  const variantMap: Record<string, string> = {
    buy: "badge-success",
    "must-have": "badge-success",
    hold: "badge-info",
    "solid hold": "badge-info",
    sell: "badge-danger",
    "sell / drop": "badge-danger",
    watch: "badge-warning",
    "monitor / rotation": "badge-warning",
    primary: "badge-primary",
    success: "badge-success",
    info: "badge-info",
    warning: "badge-warning",
    danger: "badge-danger",
  };
  const cls = variantMap[variant || "primary"] || "badge-primary";
  return <span className={`badge ${cls}`}>{label}</span>;
}

export function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) return <span className="score-pill score-low">—</span>;
  const cls = score >= 70 ? "score-high" : score >= 40 ? "score-medium" : "score-low";
  return <span className={`score-pill ${cls}`}>{Math.round(score)}</span>;
}

export function PositionBadge({ position, showFull }: { position: string; showFull?: boolean }) {
  const p = position?.toUpperCase();
  const variantMap: Record<string, string> = {
    GK: "badge-gk",
    GKP: "badge-gk",
    DEF: "badge-def",
    MID: "badge-mid",
    FWD: "badge-fwd",
  };
  const cls = variantMap[p] || "badge-primary";
  const label = showFull ? ({ GK: "Thủ môn", DEF: "Hậu vệ", MID: "Tiền vệ", FWD: "Tiền đạo" }[p] || p) : (p === "GKP" ? "GK" : p);
  return (
    <span className={`badge ${cls}`} style={{ minWidth: 34, justifyContent: "center" }}>
      {label}
    </span>
  );
}

export function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    a: "#00C951",
    d: "#F0B100",
    i: "#FB2C36",
    s: "#FB2C36",
    u: "#a3a3a3",
    n: "#a3a3a3",
  };
  const color = colorMap[status] || "#a3a3a3";
  return (
    <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} title={status} />
  );
}

export function ChipBadge({ used, label }: { used: boolean; label: string }) {
  return (
    <span className={used ? "chip-used" : "chip-available"}>{used ? "Đã dùng" : label}</span>
  );
}
