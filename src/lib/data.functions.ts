import { sdb } from "@/lib/supabase-unsafe";

// Profile
export async function getProfile(userId: string) {
  const { data, error } = await sdb
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) throw error;
  return { profile: data };
}

// Students linked to a user
export async function getMyStudents(userId: string) {
  const { data: studentUsers, error: suError } = await sdb
    .from("student_users")
    .select("student_id")
    .eq("user_id", userId);
  if (suError) throw suError;
  if (!studentUsers?.length) return { students: [] };

  const studentIds = studentUsers.map((su: any) => su.student_id);
  const { data: students, error } = await sdb
    .from("students")
    .select("*")
    .in("id", studentIds);
  if (error) throw error;
  return { students: students || [] };
}

// All students
export async function getAllStudents() {
  const { data, error } = await sdb
    .from("students")
    .select("*")
    .order("name");
  if (error) throw error;
  return { students: data || [] };
}

// Sessions for a student
export async function getStudentSessions(studentId: string) {
  const { data: sessions, error } = await sdb
    .from("sessions")
    .select("*, session_analysis(*), annotations(*)")
    .eq("student_id", studentId)
    .order("session_date", { ascending: false });
  if (error) throw error;
  return { sessions: sessions || [] };
}

// Save (or upsert by student_id + session_code) a session row
export type SaveSessionInput = {
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
};

export async function saveSession(data: SaveSessionInput) {
  const payload: any = {
    student_id: data.studentId,
    session_date: data.session_date ?? null,
    session_code: data.session_code ?? null,
    phase: data.phase ?? null,
    session_number: data.session_number ?? null,
    focus: data.focus ?? null,
    transcript_raw: data.transcript_raw ?? null,
    tutor_summary: data.tutor_summary ?? null,
    task_demand: data.task_demand ?? null,
    concept_type: data.concept_type ?? null,
    session_outcome: data.session_outcome ?? null,
    supports_used: data.supports_used ?? null,
    support_effects: data.support_effects ?? null,
    behaviour_events: data.behaviour_events ?? null,
    representative: data.representative ?? null,
  };

  if (data.session_code) {
    const { data: existing } = await sdb
      .from("sessions")
      .select("id")
      .eq("student_id", data.studentId)
      .eq("session_code", data.session_code)
      .maybeSingle();
    if (existing?.id) {
      const { data: row, error } = await sdb
        .from("sessions")
        .update(payload)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return { session: row, updated: true };
    }
  }

  const { data: row, error } = await sdb
    .from("sessions")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return { session: row, updated: false };
}

// Mastery updates
export async function getMasteryUpdates(studentId?: string) {
  let query = sdb
    .from("mastery_updates")
    .select("*, skills(name)")
    .order("created_at", { ascending: false });
  if (studentId) query = query.eq("student_id", studentId);
  const { data: updates, error } = await query;
  if (error) throw error;
  return { updates: updates || [] };
}

// Recall checks
export async function getRecallChecks(studentId?: string) {
  let query = sdb
    .from("recall_checks")
    .select("*, skills(name)")
    .order("created_at", { ascending: false });
  if (studentId) query = query.eq("student_id", studentId);
  const { data: checks, error } = await query;
  if (error) throw error;
  return { checks: checks || [] };
}

// Notifications
export async function getNotifications(userId: string) {
  const { data, error } = await sdb
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return { notifications: data || [] };
}

// Mark notification read
export async function markNotificationRead(id: string) {
  const { error } = await sdb
    .from("notifications")
    .update({ read: true })
    .eq("id", id);
  if (error) throw error;
  return { success: true };
}

// Skills
export async function getSkills() {
  const { data, error } = await sdb.from("skills").select("*").order("name");
  if (error) throw error;
  return { skills: data || [] };
}

// Latest mastery view
export async function getLatestMastery(studentId?: string) {
  let query = sdb.from("latest_mastery").select("*");
  if (studentId) query = query.eq("student_id", studentId);
  const { data: mastery, error } = await query;
  if (error) throw error;
  return { mastery: mastery || [] };
}

// Recall summary view
export async function getRecallSummary(studentId?: string) {
  let query = sdb.from("recall_summary").select("*");
  if (studentId) query = query.eq("student_id", studentId);
  const { data: summary, error } = await query;
  if (error) throw error;
  return { summary: summary || [] };
}

// Support effectiveness view
export async function getSupportEffectiveness() {
  const { data, error } = await sdb.from("support_effectiveness").select("*");
  if (error) throw error;
  return { effectiveness: data || [] };
}

// Phase transitions
export async function getPhaseTransitions(studentId?: string) {
  let query = sdb
    .from("phase_transitions")
    .select("*")
    .order("created_at", { ascending: false });
  if (studentId) query = query.eq("student_id", studentId);
  const { data: transitions, error } = await query;
  if (error) throw error;
  return { transitions: transitions || [] };
}
