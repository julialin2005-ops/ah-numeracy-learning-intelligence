// V1 demo / review mode. Lets reviewers explore the app without an active
// Supabase auth session. Uses the anon supabase client for direct reads —
// RLS still applies, so denied tables come back as empty arrays.
import { sdb } from "./supabase-unsafe";

export const DEMO_KEY = "astro_demo";

export const isDemo = (): boolean => true;

export const enableDemo = () => {
  if (typeof window !== "undefined") localStorage.setItem(DEMO_KEY, "1");
};

export const disableDemo = () => {
  if (typeof window !== "undefined") localStorage.removeItem(DEMO_KEY);
};

export const DEMO_STUDENT_SENTINEL_ID = "demo-student-a";

export const DEMO_STUDENT = {
  id: "61f63e83-1aff-4797-b077-67ae6551e6f8",
  name: "Adrian",
  pseudonym: "Adrian",
  full_name: "Adrian",
  grade: "1",
  status: "active",
  phase: "Foundation",
  last_session_date: null as string | null,
};

export const DEMO_USER = {
  id: "demo-admin",
  email: "demo@astrohippo.local",
  role: "admin" as const,
  profile: { role: "admin", name: "Demo Admin" } as Record<string, any>,
  students: [DEMO_STUDENT],
};

// Try an anon-key query; on RLS denial / network error, return fallback.
async function safe<T>(p: Promise<{ data: any; error: any }>, fallback: T): Promise<T> {
  try {
    const { data, error } = await p;
    if (error || !data) return fallback;
    return data as T;
  } catch {
    return fallback;
  }
}

function withId(studentId: string | undefined) {
  return studentId && studentId !== DEMO_STUDENT_SENTINEL_ID ? studentId : null;
}

export async function demoGetStudents() {
  const rows = await safe<any[] | null>(
    sdb.from("students").select("*") as any,
    null,
  );
  const students = rows && rows.length ? rows : [DEMO_STUDENT];
  return { students };
}

export async function demoGetAllStudents() {
  const rows = await safe<any[] | null>(
    sdb.from("students").select("*").order("name") as any,
    null,
  );
  const students = rows && rows.length ? rows : [DEMO_STUDENT];
  return { students };
}

export async function demoGetSessions(studentId: string) {
  const id = withId(studentId);
  if (!id) return { sessions: [] };
  const rows = await safe<any[]>(
    sdb
      .from("sessions")
      .select("*, session_analysis(*), annotations(*)")
      .eq("student_id", id)
      .order("session_date", { ascending: false }) as any,
    [],
  );
  return { sessions: rows };
}

export async function demoGetLatestMastery(studentId?: string) {
  const id = withId(studentId);
  let q: any = sdb.from("latest_mastery").select("*");
  if (id) q = q.eq("student_id", id);
  const rows = await safe<any[]>(q, []);
  return { mastery: rows };
}

export async function demoGetMasteryUpdates(studentId?: string) {
  const id = withId(studentId);
  let q: any = sdb
    .from("mastery_updates")
    .select("*, skills(name)")
    .order("created_at", { ascending: false });
  if (id) q = q.eq("student_id", id);
  const rows = await safe<any[]>(q, []);
  return { updates: rows };
}

export async function demoGetRecallChecks(studentId?: string) {
  const id = withId(studentId);
  let q: any = sdb
    .from("recall_checks")
    .select("*, skills(name)")
    .order("created_at", { ascending: false });
  if (id) q = q.eq("student_id", id);
  const rows = await safe<any[]>(q, []);
  return { checks: rows };
}

export async function demoGetRecallSummary(studentId?: string) {
  const id = withId(studentId);
  let q: any = sdb.from("recall_summary").select("*");
  if (id) q = q.eq("student_id", id);
  const rows = await safe<any[]>(q, []);
  return { summary: rows };
}

export async function demoGetSupportEffectiveness() {
  const rows = await safe<any[]>(
    sdb.from("support_effectiveness").select("*") as any,
    [],
  );
  return { effectiveness: rows };
}

export async function demoGetPhaseTransitions(studentId?: string) {
  const id = withId(studentId);
  let q: any = sdb
    .from("phase_transitions")
    .select("*")
    .order("created_at", { ascending: false });
  if (id) q = q.eq("student_id", id);
  const rows = await safe<any[]>(q, []);
  return { transitions: rows };
}

export async function demoGetNotifications() {
  return { notifications: [] as any[] };
}

export async function demoSaveSession(input: {
  studentId: string;
  session_date?: string | null;
  session_code?: string | null;
  phase?: string | null;
  session_number?: number | null;
  focus?: string | null;
  transcript_raw?: string | null;
  tutor_summary?: string | null;
  task_demand?: string | null;
  concept_type?: string | null;
  session_outcome?: string | null;
  supports_used?: any;
  support_effects?: any;
  behaviour_events?: any;
  representative?: string | null;
}) {
  const id = withId(input.studentId);
  if (!id) {
    return { session: null, skipped: true as const, updated: false as const };
  }
  const payload: any = {
    student_id: id,
    session_date: input.session_date ?? null,
    session_code: input.session_code ?? null,
    phase: input.phase ?? null,
    session_number: input.session_number ?? null,
    focus: input.focus ?? null,
    transcript_raw: input.transcript_raw ?? null,
    tutor_summary: input.tutor_summary ?? null,
    task_demand: input.task_demand ?? null,
    concept_type: input.concept_type ?? null,
    session_outcome: input.session_outcome ?? null,
    supports_used: input.supports_used ?? null,
    support_effects: input.support_effects ?? null,
    behaviour_events: input.behaviour_events ?? null,
    representative: input.representative ?? null,
  };

  if (input.session_code) {
    const { data: existing } = await sdb
      .from("sessions")
      .select("id")
      .eq("student_id", id)
      .eq("session_code", input.session_code)
      .maybeSingle();
    if (existing?.id) {
      const { data, error } = await sdb
        .from("sessions")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return { session: data, skipped: false as const, updated: true as const };
    }
  }

  const { data, error } = await sdb.from("sessions").insert(payload).select().single();
  if (error) throw error;
  return { session: data, skipped: false as const, updated: false as const };
}
