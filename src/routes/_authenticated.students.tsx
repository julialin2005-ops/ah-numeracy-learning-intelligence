import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { sdb } from "@/lib/supabase-unsafe";
import { isDemo } from "@/lib/demo";

export const Route = createFileRoute("/_authenticated/students")({
  component: StudentsPage,
});

function fmt(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
}

function StudentsPage() {
  const { data: studentsData, isLoading: loadingStudent } = useQuery({
    queryKey: ["students-page-student", isDemo()],
    queryFn: async () => {
      const { data, error } = await sdb.from("students").select("*").eq("display_name", "Adrian").single();
      if (error) throw error;
      return { students: [data] };
    },
  });

  const student = studentsData?.students?.[0] ?? null;

  const { data: sessionsData, isLoading: loadingSessions } = useQuery({
    queryKey: ["students-page-sessions", student?.id, isDemo()],
    enabled: !!student?.id,
    queryFn: async () => {
      const { data, error } = await sdb
        .from("sessions")
        .select("id, session_date")
        .eq("student_id", student!.id)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return { sessions: data || [] };
    },
  });

  const sessions: any[] = sessionsData?.sessions ?? [];
  const latest = sessions[0] ?? null;
  const totalSessions = sessions.length;
  const lastDate = fmt(latest?.session_date);
  const name = student?.name || student?.full_name || student?.pseudonym || "Adrian";
  const loading = loadingStudent || loadingSessions;

  return (
    <div style={{ background: "#F8FAFC", minHeight: "100%" }}>
      <div className="max-w-2xl mx-auto py-8 px-2">

        <h1 className="text-[22px] font-bold mb-6" style={{ color: "#101828" }}>
          Student
        </h1>

        {loading ? (
          <p className="text-sm" style={{ color: "#6B7280" }}>Loading…</p>
        ) : !student ? (
          <p className="text-sm" style={{ color: "#6B7280" }}>No student found.</p>
        ) : (
          <div
            className="rounded-xl p-6"
            style={{ background: "#FFFFFF", border: "1px solid #E5E7EB" }}
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-4 mb-6">
              <div
                className="flex items-center justify-center rounded-full text-white font-bold text-xl shrink-0"
                style={{ width: 56, height: 56, background: "#5B43C6" }}
              >
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-[20px] font-bold leading-tight" style={{ color: "#5B43C6" }}>
                  {name}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>
                  Active student 
                </p>
              </div>
            </div>

            {/* Key stats */}
            <div className="space-y-3 mb-6">
              {[
                { label: "Last session date", value: lastDate },
                { label: "Total sessions", value: totalSessions > 0 ? String(totalSessions) : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-baseline justify-between gap-4" style={{ borderBottom: "1px solid #F3F4F6", paddingBottom: 10 }}>
                  <span className="text-[13px]" style={{ color: "#6B7280" }}>{label}</span>
                  <span className="text-[13px] font-medium" style={{ color: "#101828" }}>{value}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
              <a href="/sessions"
              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-md text-sm font-medium text-white"
              style={{ backgroundColor: "#5334C7" }}
            >
              View Sessions →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
