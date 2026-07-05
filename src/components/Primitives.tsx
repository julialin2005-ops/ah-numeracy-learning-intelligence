import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import mascotAsset from "@/assets/astro-hippo.jpeg.asset.json";

export function MascotImage({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <img
      src={mascotAsset.url}
      alt="Astro Hippo"
      className={cn("rounded-full object-cover", className)}
      style={{ width: size, height: size }}
    />
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center py-6 px-4">
      <MascotImage size={56} className="opacity-90 mb-3" />
      <div className="text-sm font-medium">{title}</div>
      {description && (
        <div className="text-xs text-muted-foreground mt-1 max-w-xs">{description}</div>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function Metric({
  label,
  value,
  sub,
  small,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  small?: boolean;
}) {
  return (
    <div className="ah-metric">
      <div className="ah-metric-label">{label}</div>
      <div className={cn(small ? "ah-metric-val-sm" : "ah-metric-val")}>{value}</div>
      {sub && <div className="ah-metric-sub">{sub}</div>}
    </div>
  );
}

export function MetricGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-2 mb-2.5" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))" }}>
      {children}
    </div>
  );
}

export function Card({
  title,
  subtitle,
  children,
  className,
  action,
  headerBg,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
  headerBg?: string;
}) {
  const hasHeader = !!(title || action || subtitle);

  if (headerBg && hasHeader) {
    return (
      <div className={cn("ah-card", className)} style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ background: headerBg, borderBottom: "1px solid var(--border)", padding: "14px 16px" }}>
          {(title || action) && (
            <div className="flex items-start justify-between gap-3">
              {title && <div className="ah-card-title">{title}</div>}
              {action}
            </div>
          )}
          {subtitle && <div className="ah-card-sub" style={{ marginTop: 4 }}>{subtitle}</div>}
        </div>
        <div style={{ padding: "14px 16px" }}>{children}</div>
      </div>
    );
  }

  return (
    <div className={cn("ah-card", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between gap-3">
          {title && <div className="ah-card-title">{title}</div>}
          {action}
        </div>
      )}
      {subtitle && <div className="ah-card-sub">{subtitle}</div>}
      {children}
    </div>
  );
}
