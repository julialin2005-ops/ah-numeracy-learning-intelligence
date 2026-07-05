import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { sdb } from "@/lib/supabase-unsafe";
import { useAuth } from "@/lib/auth.context";
import { isDemo, demoGetSessions } from "@/lib/demo";
import { Card, Metric, MetricGrid } from "@/components/Primitives";
import { SessionReview, type SessionReviewRole } from "@/components/SessionReview";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/sessions")({
  head: () => ({
    meta: [
      { title: "Sessions — AH" },
      { name: "description", content: "Session creation, transcript analysis, and history." },
    ],
  }),
  component: SessionsPage,
});

function useLinkedStudents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["linked-students", user?.id, user?.role, isDemo()],
    enabled: !!user?.id,
    queryFn: async () => {
      if (isDemo()) {
        const { demoGetStudents } = await import("@/lib/demo");
        const { students } = await demoGetStudents();
        const adrian = students.find((s: any) => s.display_name === "Adrian" || s.name === "Adrian") || students[0];
        return adrian ? [adrian] : students;
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
      if (error) console.error("[sessions] student_users error:", error);
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

function SessionsPage() {
  const { user } = useAuth();
  const role = (user?.role || "parent") as SessionReviewRole;
  const navigate = useNavigate();
  const studentsQ = useLinkedStudents();
  const students = studentsQ.data || [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const active = useMemo(
    () => students.find((s: any) => s.id === selectedId) || students[0] || null,
    [students, selectedId],
  );

  const { data: ssd } = useQuery({
    queryKey: ["sessions", active?.id],
    enabled: !!active?.id,
    queryFn: async () => {
      if (isDemo()) return demoGetSessions(active!.id);
      const { data, error } = await sdb
        .from("sessions")
        .select("*")
        .eq("student_id", active!.id)
        .order("session_date", { ascending: false })
        .limit(1);
      if (error) throw error;
      return { sessions: data || [] };
    },
  });
  const latest = ssd?.sessions?.[0];

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
          {/* SessionReview, role-gated */}
          <SessionReview
            student={active}
            role={role}
            showWorkflowProgression={role === "tutor"}
            onContinueMastery={() =>
              navigate({ to: "/tutor", search: { step: "mastery" } })
            }
          />
        </>
      )}
    </div>
  );
}
