import { createFileRoute } from "@tanstack/react-router";
import { SKILL_GROUPS } from "@/lib/skills";
import { useState } from "react";
import type { ComponentType, CSSProperties } from "react";
import { Hash, CircleDot, Milestone } from "lucide-react";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Skills — AH" },
      { name: "description", content: "How AH tracks numeracy skill progression" },
    ],
  }),
  component: SkillsPage,
});

const BRAND_STRONG = "#5334C7";
const BRAND = "#5B43C6";
const BRAND_LIGHT = "#A48AF0";
const BRAND_TINT = "#F4F1FE";

const DOMAIN_DESCRIPTIONS: Record<string, string> = {
  "Foundational": "Counting, subitizing, cardinality, staircase",
  "Number bonds": "Make 3 to Make 10 and related combinations",
  "Bridging & extension": "Bridging through 10, place value",
};

const DOMAIN_ICONS: Record<string, ComponentType<{ size?: number; style?: CSSProperties }>> = {
  "Foundational": Hash,
  "Number bonds": CircleDot,
  "Bridging & extension": Milestone,
};

const STAGES = [
  { code: "D", label: "Discovery", desc: "Introduced" },
  { code: "F", label: "Foundation", desc: "Supported" },
  { code: "R", label: "Retrieval", desc: "Independent" },
  { code: "T", label: "Transfer", desc: "Applied" },
];

function SkillDomainCard({
  label,
  description,
  icon: Icon,
  skills,
  defaultOpen,
}: {
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; style?: CSSProperties }>;
  skills: readonly string[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  return (
    <div
      className="rounded-xl border transition-colors overflow-hidden"
      style={{ borderColor: open ? BRAND_LIGHT : "var(--border)" }}
    >
      <div style={{ height: 3, background: BRAND_TINT }} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left rounded-xl transition-colors"
        style={{ background: "transparent" }}
        onMouseEnter={(e) => (e.currentTarget.style.background = BRAND_TINT)}
        onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span
            className="flex-shrink-0 inline-flex items-center justify-center rounded-full"
            style={{ width: 36, height: 36, background: BRAND_TINT }}
          >
            <Icon size={18} style={{ color: BRAND }} />
          </span>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-[var(--text)]">{label}</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">{description}</div>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[11px] text-muted-foreground opacity-70">{skills.length} skills</span>
          <span
            className="text-xs transition-transform"
            style={{ color: BRAND, transform: open ? "rotate(180deg)" : "none" }}
          >
            ▾
          </span>
        </div>
      </button>
      {open && (
        <div className="px-5 pb-4 pt-1">
          {skills.map((name) => (
            <div
              key={name}
              className="py-1.5 pl-3 text-[13px] text-[var(--text)]"
              style={{ borderTop: "1px solid color-mix(in srgb, var(--border) 50%, transparent)" }}
            >
              {name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SkillsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)] mb-1">Skills</h1>
        <p className="text-sm text-muted-foreground">AH's structured numeracy learning model.</p>
      </div>

      {/* Hero: D -> F -> R -> T progression as a journey */}
      <div className="rounded-xl border py-8 px-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider text-center mb-6" style={{ color: BRAND }}>
          How AH measures learning
        </p>
        <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
          {STAGES.map((s, i) => (
            <div key={s.code} className="flex items-center gap-1 sm:gap-2">
              <div className="flex flex-col items-center text-center" style={{ width: 96 }}>
                <span
                  className="inline-flex items-center justify-center rounded-full text-2xl font-bold mb-2.5"
                  style={{ width: 60, height: 60, background: BRAND_TINT, color: BRAND_STRONG }}
                >
                  {s.code}
                </span>
                <span className="text-[15px] font-bold text-[var(--text)]">{s.label}</span>
                <span className="text-[11px] text-muted-foreground">{s.desc}</span>
              </div>
              {i < STAGES.length - 1 && (
                <span className="text-lg" style={{ color: BRAND_LIGHT, position: "relative", top: -24 }}>
                  →
                </span>
              )}
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center mt-6">
          Every numeracy skill progresses through four evidence-based learning stages.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-[var(--text)] mb-1">Skill domains</h2>
        <p className="text-sm text-muted-foreground mb-4">Skills are organised by mathematical concept to mirror how numeracy develops over time.</p>
        <div className="space-y-3">
          {SKILL_GROUPS.map((group, i) => (
            <SkillDomainCard
              key={group.label}
              label={group.label}
              description={DOMAIN_DESCRIPTIONS[group.label] || ""}
              icon={DOMAIN_ICONS[group.label] || Hash}
              skills={group.skills}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
