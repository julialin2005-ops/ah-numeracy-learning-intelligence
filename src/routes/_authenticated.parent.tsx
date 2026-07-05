import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStudentSessions, getLatestMastery, getRecallChecks } from "@/lib/data.functions";
import { Card, Metric, MetricGrid } from "@/components/Primitives";
import { StatusBadge, statusTone } from "@/components/StatusBadge";
import { isDemo, demoGetSessions, demoGetLatestMastery } from "@/lib/demo";
import { useAuth } from "@/lib/auth.context";
import { sdb } from "@/lib/supabase-unsafe";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/parent")({
  head: () => ({
    meta: [
      { title: "Parent Dashboard — AH" },
      { name: "description", content: "Kid profile, retention checks, and recall history" },
    ],
  }),
  component: ParentPage,
});

function useParentStudents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["linked-students", user?.id, user?.role, isDemo()],
    enabled: !!user?.id,
    queryFn: async () => {
      if (isDemo()) {
        const { DEMO_STUDENT } = await import("@/lib/demo");
        return [DEMO_STUDENT];
      }
      const role = user!.role;
      if (role === "admin") {
        const { data, error } = await sdb.from("students").select("*").order("pseudonym");
        if (error) throw error;
        return data || [];
      }
      const rel = role === "tutor" ? "tutor" : "parent";
      let { data, error } = await sdb
        .from("student_users")
        .select("student_id, relationship_role, students(*)")
        .eq("user_id", user!.id)
        .eq("relationship_role", rel);
      if (error) console.error("[parent] student_users error:", error);
      if (!data || data.length === 0) {
        const fb = await sdb
          .from("student_users")
          .select("student_id, students(*)")
          .eq("user_id", user!.id);
        data = fb.data;
      }
      return ((data || []) as any[]).map((r) => r.students).filter(Boolean);
    },
  });
}

function ParentPage() {
  const studentsQ = useParentStudents();
  const students = studentsQ.data || [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const active = useMemo(
    () => students.find((s: any) => s.id === selectedId) || students[0] || null,
    [students, selectedId],
  );

  return (
    <div className="space-y-2.5">
      {students.length > 1 && (
        <Card title="Select child" subtitle="Switch which child the dashboard reflects.">
          <div className="flex flex-wrap gap-2">
            {students.map((s: any) => (
              <button
                key={s.id}
                onClick={() => setSelectedId(s.id)}
                className={cn(
                  "px-3 py-1.5 text-xs rounded-md border",
                  active?.id === s.id
                    ? "bg-foreground text-background border-foreground"
                    : "bg-background hover:bg-muted",
                )}
              >
                {s.pseudonym || s.name || s.full_name || "—"}
              </button>
            ))}
          </div>
        </Card>
      )}

      {!active ? (
        <Card title="No linked child">
          <p className="text-sm text-muted-foreground">No student linked to this account yet.</p>
        </Card>
      ) : (
        <>
          <KidProfile student={active} />
          <RetentionCheck student={active} />
        </>
      )}
    </div>
  );
}

function KidProfile({ student }: { student: any }) {
  const fetchSessions = useServerFn(getStudentSessions);
  const { data: ssd } = useQuery({
    queryKey: ["sessions", student.id],
    queryFn: () => (isDemo() ? demoGetSessions(student.id) : fetchSessions({ data: { studentId: student.id } })),
  });
  const last = ssd?.sessions?.[0];

  const fetchMastery = useServerFn(getLatestMastery);
  const { data: md } = useQuery({
    queryKey: ["mastery", student.id],
    queryFn: () => (isDemo() ? demoGetLatestMastery(student.id) : fetchMastery({ data: { studentId: student.id } })),
  });
  const mastery: any[] = md?.mastery || [];
  const fluent = mastery.filter((m: any) => /fluent/i.test(m.status || ""));
  const emerging = mastery.filter((m: any) => /emerg|consolid/i.test(m.status || ""));
  const supports = Array.isArray(last?.supports_used) ? last.supports_used : [];

  return (
    <div className="space-y-2.5">
      <Card title="Kid profile" subtitle="For families with more than one child, the parent selects the child first. All stories, checks, and recall follow the selected child.">
        <MetricGrid>
          <Metric label="Selected child" value={student.pseudonym || student.name || student.full_name || "—"} sub={student.phase || "F5 Foundation"} small />
          <Metric label="Tutor" value={last?.tutor_summary ? "assigned" : "—"} sub={last?.tutor_name || ""} small />
          <Metric label="Last session" value={last?.session_date ? new Date(last.session_date).toLocaleDateString() : (last?.date ? new Date(last.date).toLocaleDateString() : "—")} sub={last?.focus || ""} small />
        </MetricGrid>
      </Card>

      <Card title="Learning story">
        <p className="text-sm leading-relaxed">
          {last?.tutor_summary || "Once your tutor records a session, a parent-friendly summary will appear here."}
        </p>
        <div className="ah-slabel mt-3">Why we are doing this right now</div>
        <p className="text-sm leading-relaxed">
          {last?.focus
            ? `This week we are focused on ${last.focus}. Repetition at this stage is consolidation, not stagnation.`
            : "Once a session focus is recorded, the rationale for this week's work will appear here."}
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Card title="What changed this week">
          {fluent.slice(0, 5).map((m: any) => (
            <div key={m.skill_name || m.skill} className="flex items-center gap-2 py-1.5" style={{ borderBottom: "0.5px solid var(--border)" }}>
              <span className="text-[var(--status-green-fg)] font-bold">✓</span>
              <span className="text-sm flex-1">{m.skill_name || m.skill}</span>
              <StatusBadge tone="green">Fluent</StatusBadge>
            </div>
          ))}
          {fluent.length === 0 && <p className="text-xs text-muted-foreground">No wins recorded yet.</p>}
        </Card>

        <Card title="What helped today" subtitle="Strategies that supported today's session.">
          {supports.length === 0 ? (
            <p className="text-xs text-muted-foreground">No supports recorded for the most recent session.</p>
          ) : (
            supports.map((s: string) => (
              <div key={s} className="flex items-center gap-2 py-1.5" style={{ borderBottom: "0.5px solid var(--border)" }}>
                <span className="text-[var(--status-blue-fg)]">●</span>
                <span className="text-sm">{s}</span>
              </div>
            ))
          )}
        </Card>
      </div>

      <Card title="Working on now">
        {emerging.slice(0, 6).map((m: any) => {
          const t = statusTone(m.status);
          return (
            <div key={m.skill_name || m.skill} className="flex items-center gap-2 py-1.5" style={{ borderBottom: "0.5px solid var(--border)" }}>
              <span className="text-[var(--status-blue-fg)]">→</span>
              <span className="text-sm flex-1">{m.skill_name || m.skill}</span>
              <StatusBadge tone={t.tone}>{t.label}</StatusBadge>
            </div>
          );
        })}
        {emerging.length === 0 && <p className="text-xs text-muted-foreground">Nothing in active development right now.</p>}
      </Card>
    </div>
  );
}

function RetentionCheck({ student }: { student: any }) {
  const fetchSessions = useServerFn(getStudentSessions);
  const { data: ssd } = useQuery({
    queryKey: ["sessions", student.id],
    queryFn: () => (isDemo() ? demoGetSessions(student.id) : fetchSessions({ data: { studentId: student.id } })),
  });
  const last = ssd?.sessions?.[0];

  const fetchChecks = useServerFn(getRecallChecks);
  const { data: cd } = useQuery({
    queryKey: ["recall-checks", student.id],
    queryFn: () => fetchChecks({ data: { studentId: student.id } }).catch(() => ({ checks: [] })),
  });
  const checks: any[] = cd?.checks || [];

  const snapshot = new Map<string, any>();
  for (const c of checks) {
    const k = c.skills?.name || c.skill_name || c.skill || "Unknown";
    if (!snapshot.has(k)) snapshot.set(k, c);
  }
  const snapshotEntries = Array.from(snapshot.entries()).slice(0, 4);

  return (
    <div className="space-y-2.5">
      <Card title="Home recall check" subtitle='Two short checks at different times after each session. Takes about 2 minutes each. Low pressure — if the student struggles, say "that\u2019s okay" and move on.'>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-md border p-3 text-center">
            <div className="text-sm font-semibold">24-Hour Recall</div>
            <div className="text-xs text-muted-foreground italic">(do this tomorrow)</div>
            <div className="ah-slabel mt-2">Focus</div>
            <div className="text-sm">{last?.focus || "No recent session focus"}</div>
            <div className="text-[11px] text-muted-foreground mt-1">~2 minutes</div>
          </div>
          <div className="rounded-md border p-3 text-center">
            <div className="text-sm font-semibold">72-Hour Recall</div>
            <div className="text-xs text-muted-foreground italic">(do this in 3 days)</div>
            <div className="ah-slabel mt-2">Focus</div>
            <div className="text-sm">{last?.focus || "No recent session focus"}</div>
            <div className="text-[11px] text-muted-foreground mt-1">~2 minutes</div>
          </div>
        </div>
      </Card>

      <Card title="Retention snapshot" subtitle="Based on recent home recall checks.">
        {snapshotEntries.length === 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {["Make 4", "Make 5", "Subitizing 6", "Backward counting"].map((k) => (
              <div key={k} className="rounded-md border p-2.5">
                <div className="text-sm font-medium">{k}</div>
                <div className="text-[11px] text-muted-foreground">No checks yet</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {snapshotEntries.map(([k, c]) => {
              const t = statusTone(c.result || c.status);
              return (
                <div key={k} className="rounded-md border p-2.5">
                  <div className="text-sm font-medium truncate">{k}</div>
                  <StatusBadge tone={t.tone}>{t.label}</StatusBadge>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="Recent checks">
        {checks.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">No checks completed yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Date</th>
                  <th className="py-1.5 pr-3 font-medium">Concept</th>
                  <th className="py-1.5 pr-3 font-medium">Result</th>
                  <th className="py-1.5 pr-3 font-medium">Support</th>
                  <th className="py-1.5 font-medium">Feeling</th>
                </tr>
              </thead>
              <tbody>
                {checks.slice(0, 10).map((c: any) => (
                  <tr key={c.id} style={{ borderTop: "0.5px solid var(--border)" }}>
                    <td className="py-1.5 pr-3 tabular-nums">{c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</td>
                    <td className="py-1.5 pr-3">{c.skills?.name || c.skill_name || "—"}</td>
                    <td className="py-1.5 pr-3">{c.result || c.status || "—"}</td>
                    <td className="py-1.5 pr-3">{c.support || "—"}</td>
                    <td className="py-1.5">{c.feeling || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
