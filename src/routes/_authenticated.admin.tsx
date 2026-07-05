import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { sdb } from "@/lib/supabase-unsafe";
import { useAuth } from "@/lib/auth.context";
import { Card, Metric, MetricGrid } from "@/components/Primitives";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [{ title: "Admin Dashboard — AH" }],
  }),
  component: AdminPage,
});

type Section =
  | "overview" | "users" | "parents" | "tutors" | "students"
  | "sessions" | "notifications" | "audit" | "health";

const SECTIONS: { id: Section; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "users", label: "Users" },
  { id: "parents", label: "Parents" },
  { id: "tutors", label: "Tutors" },
  { id: "students", label: "Students" },
  { id: "sessions", label: "Sessions" },
  { id: "notifications", label: "Notifications" },
  { id: "audit", label: "Audit Log" },
  { id: "health", label: "System Health" },
];

// --- live queries (browser client; RLS applies) ---
function useProfiles() {
  return useQuery({
    queryKey: ["admin", "profiles"],
    queryFn: async () => {
      const { data, error } = await sdb.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) { console.error("[admin] profiles:", error); throw error; }
      return data || [];
    },
  });
}
function useStudents() {
  return useQuery({
    queryKey: ["admin", "students"],
    queryFn: async () => {
      const { data, error } = await sdb.from("students").select("*").order("pseudonym");
      if (error) { console.error("[admin] students:", error); throw error; }
      return data || [];
    },
  });
}
function useStudentUsers() {
  return useQuery({
    queryKey: ["admin", "student_users"],
    queryFn: async () => {
      const { data, error } = await sdb.from("student_users").select("*");
      if (error) { console.error("[admin] student_users:", error); throw error; }
      return data || [];
    },
  });
}
function useSessions() {
  return useQuery({
    queryKey: ["admin", "sessions"],
    queryFn: async () => {
      const { data, error } = await sdb
        .from("sessions")
        .select("*")
        .order("session_date", { ascending: false })
        .limit(50);
      if (error) { console.error("[admin] sessions:", error); throw error; }
      return data || [];
    },
  });
}
function useNotifications() {
  return useQuery({
    queryKey: ["admin", "notifications"],
    queryFn: async () => {
      const { data, error } = await sdb.from("notifications").select("*").order("created_at", { ascending: false }).limit(50);
      if (error) { console.error("[admin] notifications:", error); throw error; }
      return data || [];
    },
    retry: false,
  });
}
function useProfilesByRole(role: "parent" | "tutor") {
  return useQuery({
    queryKey: ["admin", "profiles", "byRole", role],
    queryFn: async () => {
      const { data, error } = await sdb
        .from("profiles")
        .select("id, full_name")
        .eq("role", role);
      if (error) { console.error(`[admin] profiles role=${role}:`, error); throw error; }
      return data || [];
    },
  });
}
function useAuditLog() {
  return useQuery({
    queryKey: ["admin", "audit_log"],
    queryFn: async () => {
      // Try common table names; first that resolves wins.
      const candidates = ["audit_log", "audit_logs"];
      for (const t of candidates) {
        const { data, error } = await sdb.from(t).select("*").order("created_at", { ascending: false }).limit(50);
        if (!error) return { rows: data || [], table: t };
        console.warn(`[admin] audit table ${t} not readable:`, error.message);
      }
      throw new Error("No audit_log table available.");
    },
    retry: false,
  });
}

function SectionError({ q }: { q: { error: unknown } }) {
  const msg = (q.error as any)?.message || String(q.error);
  return (
    <div className="text-xs p-2 rounded" style={{ background: "var(--status-red-bg)", color: "var(--status-red-fg)" }}>
      Couldn't load this section: {msg}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left text-[11px] uppercase tracking-wide text-muted-foreground font-medium pb-2 pr-3">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="py-1.5 pr-3 text-sm align-top" style={{ borderTop: "0.5px solid var(--border)" }}>{children}</td>;
}

function AdminPage() {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>("overview");

  const profiles = useProfiles();
  const students = useStudents();
  const studentUsers = useStudentUsers();
  const sessions = useSessions();
  const notifications = useNotifications();
  const audit = useAuditLog();

  const allProfiles = profiles.data || [];
  const parents = allProfiles.filter((p: any) => p.role === "parent");
  const tutors = allProfiles.filter((p: any) => p.role === "tutor");
  const profileById = new Map(allProfiles.map((p: any) => [p.id, p]));
  const studentById = new Map((students.data || []).map((s: any) => [s.id, s]));
  const links = studentUsers.data || [];

  const openNotifications = (notifications.data || []).filter((n: any) => !n.read).length;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Admin Dashboard</h1>
          <div className="text-xs text-muted-foreground mt-1">Platform control layer · AH pilot</div>
        </div>
        <span className="text-xs font-medium text-[var(--status-green-fg)]">Admin role active</span>
      </div>

      {/* Sub-tabs */}
      <div className="flex overflow-x-auto" style={{ borderBottom: "1px solid var(--border)", gap: 0 }}>
        {SECTIONS.map((s) => {
          const active = section === s.id;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "px-3 py-2 text-[13px] whitespace-nowrap shrink-0 -mb-px border-b-2 transition-colors",
                active ? "text-foreground font-medium border-foreground" : "text-muted-foreground border-transparent hover:text-foreground",
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {section === "overview" && (
        <>
          <MetricGrid>
            <Metric label="Total students" value={students.isLoading ? "…" : (students.data?.length ?? "—")} sub="active pilot" />
            <Metric label="Parents" value={profiles.isLoading ? "…" : parents.length} sub="linked users" />
            <Metric label="Tutors" value={profiles.isLoading ? "…" : tutors.length} sub="assigned" />
            <Metric label="Sessions" value={sessions.isLoading ? "…" : (sessions.data?.length ?? "—")} sub="recent" />
            <Metric label="Open notifications" value={notifications.isError ? "—" : openNotifications} sub="dashboard notices" />
            <Metric label="Data status" value={profiles.isError ? "Error" : "Connected"} sub="Supabase live" small />
          </MetricGrid>

          <div className="grid gap-2.5 md:grid-cols-2">
            <Card title="Recent sessions">
              {sessions.isError && <SectionError q={sessions} />}
              {!sessions.isError && (sessions.data || []).slice(0, 5).map((s: any) => (
                <div key={s.id} className="flex items-center gap-2 py-1.5" style={{ borderBottom: "0.5px solid var(--border)" }}>
                  <span className="text-[var(--status-green-fg)]">✓</span>
                  <span className="text-sm flex-1">
                    {s.session_code || s.focus || "Session"} · {s.focus || s.tutor_summary?.slice(0, 60) || "—"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{s.session_date ? new Date(s.session_date).toLocaleDateString() : ""}</span>
                </div>
              ))}
              {!sessions.isError && (sessions.data || []).length === 0 && (
                <p className="text-xs text-muted-foreground">No sessions yet.</p>
              )}
            </Card>
            <Card title="Admin priorities">
              <div className="text-sm space-y-1.5">
                <div>→ Confirm RLS policies for parents, tutors, and admins.</div>
                <div>→ Audit student-to-user links via student_users.</div>
                <div>→ Monitor session ingestion and notification queue.</div>
              </div>
            </Card>
          </div>
        </>
      )}

      {section === "users" && (
        <Card title="Users" subtitle="Profile visibility is RLS-scoped.">
          {profiles.isError ? <SectionError q={profiles} /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><Th>ID</Th><Th>Full name</Th><Th>Role</Th><Th>Update existing user role</Th><Th>Created</Th></tr></thead>
                <tbody>
                  {allProfiles.map((p: any) => (
                    <tr key={p.id}>
                      <Td><span className="font-mono text-[11px]">{p.id?.slice(0, 8)}…</span></Td>
                      <Td>{p.full_name || p.name || "—"}</Td>
                      <Td><span className="ah-badge bg-[var(--status-teal-bg)] text-[var(--status-teal-fg)] capitalize">{p.role || "—"}</span></Td>
                      <Td><RoleEditor profile={p} /></Td>
                      <Td>{p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {allProfiles.length === 0 && !profiles.isLoading && <p className="text-xs text-muted-foreground py-2">No profiles visible.</p>}
            </div>
          )}
        </Card>
      )}

      {(section === "parents" || section === "tutors") && (() => {
        const wantRole = section === "parents" ? "parent" : "tutor";
        const list = allProfiles.filter((p: any) => p.role === wantRole);
        return (
          <Card title={section === "parents" ? "Parents" : "Tutors"}>
            {(profiles.isError || studentUsers.isError) && <SectionError q={profiles.isError ? profiles : studentUsers} />}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><Th>Name</Th><Th>ID</Th><Th>Linked students</Th></tr></thead>
                <tbody>
                  {list.map((p: any) => {
                    const linked = links
                      .filter((l: any) => l.user_id === p.id)
                      .map((l: any) => studentById.get(l.student_id))
                      .filter(Boolean);
                    return (
                      <tr key={p.id}>
                        <Td>{p.full_name || p.name || "—"}</Td>
                        <Td><span className="font-mono text-[11px]">{p.id?.slice(0, 8)}…</span></Td>
                        <Td>{linked.length ? linked.map((s: any) => s.pseudonym || s.full_name).join(", ") : <span className="text-muted-foreground">—</span>}</Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {list.length === 0 && !profiles.isLoading && <p className="text-xs text-muted-foreground py-2">No {wantRole}s visible.</p>}
            </div>
          </Card>
        );
      })()}

      {section === "students" && (
        <div className="space-y-3">
          <CreateStudentForm />
          <div className="grid gap-2.5 md:grid-cols-2">
            <LinkUserToStudentForm
              relationshipRole="parent"
              students={students.data || []}
            />
            <LinkUserToStudentForm
              relationshipRole="tutor"
              students={students.data || []}
            />
          </div>
          <Card title="Students">
            {students.isError ? <SectionError q={students} /> : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr><Th>Name</Th><Th>Phase</Th><Th>Linked parent(s)</Th><Th>Linked tutor(s)</Th></tr></thead>
                  <tbody>
                    {(students.data || []).map((s: any) => {
                      const linkRows = links.filter((l: any) => l.student_id === s.id);
                      const named = (filterRole: string) => linkRows
                        .filter((l: any) => {
                          const u = profileById.get(l.user_id) as any;
                          return (l.relationship_role || u?.role) === filterRole;
                        })
                        .map((l: any) => {
                          const u = profileById.get(l.user_id) as any;
                          return u ? (u.full_name || u.name || u.id?.slice(0, 6)) : l.user_id?.slice(0, 6);
                        });
                      const parents = named("parent");
                      const tutors = named("tutor");
                      const noLinks = linkRows.length === 0;
                      return (
                        <tr key={s.id}>
                          <Td>{s.pseudonym || s.full_name || "—"}</Td>
                          <Td>{s.phase || "—"}</Td>
                          <Td>{noLinks ? <span className="text-muted-foreground">No linked users yet.</span> : (parents.length ? parents.join(", ") : <span className="text-muted-foreground">—</span>)}</Td>
                          <Td>{noLinks ? <span className="text-muted-foreground">No linked users yet.</span> : (tutors.length ? tutors.join(", ") : <span className="text-muted-foreground">—</span>)}</Td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}

      {section === "sessions" && (
        <Card title="Recent sessions" subtitle="Last 50">
          {sessions.isError ? <SectionError q={sessions} /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><Th>Date</Th><Th>Code</Th><Th>Student</Th><Th>Focus</Th><Th>Outcome</Th></tr></thead>
                <tbody>
                  {(sessions.data || []).map((s: any) => (
                    <tr key={s.id}>
                      <Td>{s.session_date ? new Date(s.session_date).toLocaleDateString() : "—"}</Td>
                      <Td>{s.session_code || "—"}</Td>
                      <Td>{(studentById.get(s.student_id) as any)?.pseudonym || s.student_id?.slice(0, 6) || "—"}</Td>
                      <Td>{s.focus || "—"}</Td>
                      <Td>{s.session_outcome || s.outcome || "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {section === "notifications" && (
        <Card title="Notifications">
          {notifications.isError ? <SectionError q={notifications} /> : (
            <div>
              {(notifications.data || []).map((n: any) => (
                <div key={n.id} className="flex items-center gap-2 py-1.5" style={{ borderBottom: "0.5px solid var(--border)" }}>
                  <span className={n.read ? "text-muted-foreground" : "text-[var(--status-amber-fg)]"}>{n.read ? "○" : "●"}</span>
                  <span className="text-sm flex-1">{n.title || n.message || n.body || "Notification"}</span>
                  <span className="text-[11px] text-muted-foreground">{n.created_at ? new Date(n.created_at).toLocaleDateString() : ""}</span>
                </div>
              ))}
              {(notifications.data || []).length === 0 && <p className="text-xs text-muted-foreground">No notifications.</p>}
            </div>
          )}
        </Card>
      )}

      {section === "audit" && (
        <Card title="Audit Log">
          {audit.isError ? <SectionError q={audit} /> : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead><tr><Th>When</Th><Th>Actor</Th><Th>Action</Th><Th>Target</Th></tr></thead>
                <tbody>
                  {(audit.data?.rows || []).map((row: any) => (
                    <tr key={row.id}>
                      <Td>{row.created_at ? new Date(row.created_at).toLocaleString() : "—"}</Td>
                      <Td>{row.actor_id?.slice(0, 8) || row.user_id?.slice(0, 8) || "—"}</Td>
                      <Td>{row.action || row.event || "—"}</Td>
                      <Td>{row.target || row.entity || row.resource || "—"}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(audit.data?.rows || []).length === 0 && <p className="text-xs text-muted-foreground py-2">No audit entries.</p>}
            </div>
          )}
        </Card>
      )}

      {section === "health" && (
        <Card title="System Health">
          <ul className="text-sm space-y-1.5">
            <HealthRow label="Supabase connected" ok={!profiles.isError || !students.isError} detail="Browser client reachable" />
            <HealthRow label="Auth working" ok={!!user?.id} detail={user?.email || "no session"} />
            <HealthRow label="Current user role" ok={!!user?.role} detail={user?.role || "unknown"} />
            <HealthRow label="Profile loaded" ok={!!user?.profile} detail={user?.profile ? "ok" : "missing"} />
            <HealthRow label="Students table readable" ok={!students.isError} detail={students.isError ? "denied" : `${students.data?.length ?? 0} rows`} />
            <HealthRow label="Sessions table readable" ok={!sessions.isError} detail={sessions.isError ? "denied" : `${sessions.data?.length ?? 0} rows`} />
          </ul>
        </Card>
      )}
    </div>
  );
}

function HealthRow({ label, ok, detail }: { label: string; ok: boolean; detail?: string }) {
  return (
    <li className="flex items-center gap-2 py-1" style={{ borderBottom: "0.5px solid var(--border)" }}>
      <span className={ok ? "text-[var(--status-green-fg)]" : "text-[var(--status-red-fg)]"}>{ok ? "✓" : "✕"}</span>
      <span className="flex-1">{label}</span>
      <span className="text-xs text-muted-foreground">{detail}</span>
    </li>
  );
}

// ---------- Admin action components ----------

const ROLE_OPTIONS = ["parent", "tutor", "admin"] as const;

function RoleEditor({ profile }: { profile: any }) {
  const qc = useQueryClient();
  const [role, setRole] = useState<string>(profile.role || "parent");
  const [err, setErr] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: async (nextRole: string) => {
      console.log("[admin] update role", profile.id, "→", nextRole);
      const { error } = await sdb.from("profiles").update({ role: nextRole }).eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setErr(null);
      qc.invalidateQueries({ queryKey: ["admin", "profiles"] });
    },
    onError: (e: any) => {
      console.error("[admin] role update failed", e);
      setErr(e?.message || String(e));
    },
  });
  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="text-sm rounded px-2 py-1"
        style={{ border: "0.5px solid var(--border)", background: "var(--background)" }}
        disabled={mut.isPending}
      >
        {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
      </select>
      <button
        onClick={() => mut.mutate(role)}
        disabled={mut.isPending || role === profile.role}
        className="ah-badge bg-[var(--status-teal-bg)] text-[var(--status-teal-fg)] disabled:opacity-50"
      >
        {mut.isPending ? "Saving…" : "Save"}
      </button>
      {err && <span className="text-[11px] text-[var(--status-red-fg)]">{err}</span>}
    </div>
  );
}

function CreateStudentForm() {
  const qc = useQueryClient();
  const [pseudonym, setPseudonym] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phase, setPhase] = useState("foundation");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { pseudonym: pseudonym.trim(), phase };
      if (displayName.trim()) payload.display_name = displayName.trim();
      console.log("[admin] create student", payload);
      const { data, error } = await sdb.from("students").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      setErr(null);
      setOk(`Created: ${data?.pseudonym}`);
      setPseudonym("");
      setDisplayName("");
      qc.invalidateQueries({ queryKey: ["admin", "students"] });
    },
    onError: (e: any) => {
      console.error("[admin] create student failed", e);
      setOk(null);
      setErr(e?.message || String(e));
    },
  });

  return (
    <Card title="Create Student" subtitle="Inserts a row into students. RLS applies.">
      <form
        onSubmit={(e) => { e.preventDefault(); if (pseudonym.trim()) mut.mutate(); }}
        className="grid gap-2 sm:grid-cols-4 items-end"
      >
        <label className="text-xs flex flex-col gap-1">
          <span className="text-muted-foreground">Pseudonym *</span>
          <input
            required
            value={pseudonym}
            onChange={(e) => setPseudonym(e.target.value)}
            className="text-sm rounded px-2 py-1.5"
            style={{ border: "0.5px solid var(--border)", background: "var(--background)" }}
          />
        </label>
        <label className="text-xs flex flex-col gap-1">
          <span className="text-muted-foreground">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="text-sm rounded px-2 py-1.5"
            style={{ border: "0.5px solid var(--border)", background: "var(--background)" }}
          />
        </label>
        <label className="text-xs flex flex-col gap-1">
          <span className="text-muted-foreground">Phase</span>
          <select
            value={phase}
            onChange={(e) => setPhase(e.target.value)}
            className="text-sm rounded px-2 py-1.5"
            style={{ border: "0.5px solid var(--border)", background: "var(--background)" }}
          >
            <option value="foundation">foundation</option>
            <option value="developing">developing</option>
            <option value="secure">secure</option>
            <option value="mastery">mastery</option>
          </select>
        </label>
        <button
          type="submit"
          disabled={mut.isPending || !pseudonym.trim()}
          className="text-sm rounded px-3 py-1.5 disabled:opacity-50"
          style={{ background: "var(--foreground)", color: "var(--background)" }}
        >
          {mut.isPending ? "Creating…" : "Create student"}
        </button>
        {err && <div className="sm:col-span-4 text-xs text-[var(--status-red-fg)]">{err}</div>}
        {ok && <div className="sm:col-span-4 text-xs text-[var(--status-green-fg)]">{ok}</div>}
      </form>
    </Card>
  );
}

function LinkUserToStudentForm({
  relationshipRole,
  students,
}: {
  relationshipRole: "parent" | "tutor";
  students: any[];
}) {
  const qc = useQueryClient();
  const profilesQ = useProfilesByRole(relationshipRole);
  const profiles = profilesQ.data || [];
  const [userId, setUserId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const mut = useMutation({
    mutationFn: async () => {
      const payload = { user_id: userId, student_id: studentId, relationship_role: relationshipRole };
      console.log("[admin] link", relationshipRole, payload);
      const { data, error } = await sdb.from("student_users").insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setErr(null);
      setOk("Linked.");
      setUserId("");
      setStudentId("");
      qc.invalidateQueries({ queryKey: ["admin", "student_users"] });
    },
    onError: (e: any) => {
      console.error("[admin] link failed", e);
      setOk(null);
      setErr(e?.message || String(e));
    },
  });

  return (
    <Card
      title={`Link ${relationshipRole === "parent" ? "Parent" : "Tutor"} ↔ Student`}
      subtitle={`Inserts into student_users with relationship_role = '${relationshipRole}'.`}
    >
      <form
        onSubmit={(e) => { e.preventDefault(); if (userId && studentId) mut.mutate(); }}
        className="grid gap-2 sm:grid-cols-3 items-end"
      >
        <label className="text-xs flex flex-col gap-1">
          <span className="text-muted-foreground capitalize">{relationshipRole} profile</span>
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="text-sm rounded px-2 py-1.5"
            style={{ border: "0.5px solid var(--border)", background: "var(--background)" }}
          >
            <option value="">Select…</option>
            {profiles.map((p: any) => (
              <option key={p.id} value={p.id}>{p.full_name || p.name || p.id?.slice(0, 8)}</option>
            ))}
          </select>
        </label>
        <label className="text-xs flex flex-col gap-1">
          <span className="text-muted-foreground">Student</span>
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="text-sm rounded px-2 py-1.5"
            style={{ border: "0.5px solid var(--border)", background: "var(--background)" }}
          >
            <option value="">Select…</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.pseudonym || s.full_name || s.id?.slice(0, 8)}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={mut.isPending || !userId || !studentId}
          className="text-sm rounded px-3 py-1.5 disabled:opacity-50"
          style={{ background: "var(--foreground)", color: "var(--background)" }}
        >
          {mut.isPending ? "Linking…" : "Link"}
        </button>
        {err && <div className="sm:col-span-3 text-xs text-[var(--status-red-fg)]">{err}</div>}
        {ok && <div className="sm:col-span-3 text-xs text-[var(--status-green-fg)]">{ok}</div>}
      </form>
    </Card>
  );
}
