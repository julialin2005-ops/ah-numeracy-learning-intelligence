import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "blue" | "green" | "amber" | "red" | "orange" | "gray" | "teal";

const TONE: Record<Tone, string> = {
  blue: "bg-[var(--status-blue-bg)] text-[var(--status-blue-fg)]",
  green: "bg-[var(--status-green-bg)] text-[var(--status-green-fg)]",
  amber: "bg-[var(--status-amber-bg)] text-[var(--status-amber-fg)]",
  red: "bg-[var(--status-red-bg)] text-[var(--status-red-fg)]",
  orange: "bg-[var(--status-orange-bg)] text-[var(--status-orange-fg)]",
  gray: "bg-[var(--status-gray-bg)] text-[var(--status-gray-fg)]",
  teal: "bg-[var(--status-teal-bg)] text-[var(--status-teal-fg)]",
};

export function StatusBadge({
  tone = "gray",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("ah-badge", TONE[tone], className)}>{children}</span>
  );
}

/** Map mastery status string to tone */
export function statusTone(
  status: string | null | undefined,
): { tone: Tone; label: string } {
  const s = (status || "").toLowerCase();
  if (s.includes("fluent") || s === "mastered") return { tone: "green", label: "Fluent" };
  if (s.includes("consolidat")) return { tone: "blue", label: "Consolidating" };
  if (s.includes("emerg")) return { tone: "amber", label: "Emerging" };
  if (s.includes("not") || s === "" || s === "none") return { tone: "gray", label: "Not started" };
  return { tone: "gray", label: status || "—" };
}
