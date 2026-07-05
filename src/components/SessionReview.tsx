import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { sdb } from "@/lib/supabase-unsafe";
import { RECOMMENDATION_GUIDANCE } from "@/lib/recommendation_guidance";
import { Card } from "@/components/Primitives";
import { cn } from "@/lib/utils";
import { isDemo, demoGetSessions, demoSaveSession } from "@/lib/demo";
import { analyseTranscriptWithGemini } from "@/lib/gemini";
import { BarChart2, Shield, Target } from "lucide-react";

const SECTIONS = {
  findings: {
    iconBg: "#5B43C6",
    badgeBg: "#F3F0FF",
    badgeText: "#5B43C6",
    badgeBorder: "#D9CCFF",
  },
  evidence: {
    iconBg: "#16A34A",
    badgeBg: "#F0FDF4",
    badgeText: "#16A34A",
    badgeBorder: "#BBF7D0",
  },
  recommendations: {
    iconBg: "#D97706",
    badgeBg: "#FFFBEB",
    badgeText: "#D97706",
    badgeBorder: "#FCD34D",
  },
} as const;

type SectionKey = keyof typeof SECTIONS;

function SectionTitle({ icon, number, label, sectionKey }: { icon: React.ReactNode; number: number; label: string; sectionKey: SectionKey }) {
  const { iconBg } = SECTIONS[sectionKey];
  return (
    <span className="flex items-center gap-3">
      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", background: iconBg, color: "#ffffff", flexShrink: 0 }}>
        {icon}
      </span>
      <span>{number}. {label}</span>
    </span>
  );
}

function CountBadge({ count, label, sectionKey }: { count: number; label: string; sectionKey: SectionKey }) {
  const { badgeBg, badgeText, badgeBorder } = SECTIONS[sectionKey];
  return (
    <span
      className="text-[11px] font-medium px-2.5 py-1 rounded-md shrink-0"
      style={{ background: badgeBg, color: badgeText, border: `1px solid ${badgeBorder}` }}
    >
      {count} {label}
    </span>
  );
}

const TASK_DEMAND_MAP: Record<string, string> = { Low: "low", Moderate: "moderate", High: "high" };
const CONCEPT_TYPE_MAP: Record<string, string> = { New: "new", Review: "review", Consolidation: "consolidation" };
const OUTCOME_MAP: Record<string, string> = { Successful: "successful", "Partial success": "partial", Struggled: "struggled" };

const TASK_DEMAND_REVERSE: Record<string, string> = { low: "Low", moderate: "Moderate", high: "High" };
const CONCEPT_TYPE_REVERSE: Record<string, string> = { new: "New", review: "Review", consolidation: "Consolidation" };
const OUTCOME_REVERSE: Record<string, string> = { successful: "Successful", partial: "Partial success", struggled: "Struggled" };


function formatJsonbField(v: any): string {
  if (v === null || v === undefined) return "Not available";
  if (typeof v === "string") return v.trim() ? v : "Not available";
  if (Array.isArray(v)) {
    if (v.length === 0) return "Not available";
    return v
      .map((item) => {
        if (item === null || item === undefined) return "- ";
        if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") return `- ${item}`;
        if (typeof item === "object") {
          return `- ${Object.entries(item).map(([k, val]) => `${k}: ${typeof val === "object" ? JSON.stringify(val) : val}`).join("; ")}`;
        }
        return `- ${String(item)}`;
      })
      .join("\n");
  }
  if (typeof v === "object") {
    const entries = Object.entries(v);
    if (entries.length === 0) return "Not available";
    return entries.map(([k, val]) => `- ${k}: ${typeof val === "object" ? JSON.stringify(val) : val}`).join("\n");
  }
  return String(v);
}

const PHASES = [
  { code: "D", label: "Discovery", value: "discovery" },
  { code: "F", label: "Foundation", value: "foundation" },
  { code: "R", label: "Retrieval", value: "retrieval" },
  { code: "T", label: "Transfer", value: "transfer" },
] as const;

const DEMO_TRANSCRIPT = `T: Student, ready?
S: Yes.
T: Can you help me build the staircase?
S: Okay.
T: Let's start with one block. Now add another. How many?
S: Two.
T: Good. Add one more.
S: Three.
T: Now make 5 — how many more do we need?
S: Two more.
T: Perfect. Let's count together: one, two, three, four, five.`;

function formatDDMMYYYY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return "";
  return `${d}/${m}/${y}`;
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs: any = await import("pdfjs-dist");
  try { pdfjs.GlobalWorkerOptions.workerSrc = ""; } catch {}
  const buf = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: buf, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true });
  const pdf = await loadingTask.promise;
  let out = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((it: any) => ("str" in it ? it.str : "")).join(" ");
    out += strings + "\n\n";
  }
  return out.trim();
}

export type SessionReviewRole = "parent" | "tutor" | "admin";

export interface SessionReviewProps {
  student: any | null | undefined;
  role: SessionReviewRole;
  showWorkflowProgression?: boolean;
  onContinueMastery?: () => void;
  onSaved?: () => void;
}

export function SessionReview({
  student,
  role,
  showWorkflowProgression = false,
  onContinueMastery,
  onSaved,
}: SessionReviewProps) {
  const active = student;
  const isTutor = role === "tutor" || role === "admin";

  // Session identity
  const [sessionDate, setSessionDate] = useState<string>("");
  const [phaseCode, setPhaseCode] = useState<string>("");
  const [sessionNumber, setSessionNumber] = useState<string>("");
  const [focus, setFocus] = useState<string>("");

  // Transcript / context / summary
  const [transcriptRaw, setTranscriptRaw] = useState("");
  const [tutorSummary, setTutorSummary] = useState("");
  const [taskDemand, setTaskDemand] = useState<string>("");
  const [conceptType, setConceptType] = useState<string>("");
  const [sessionOutcome, setSessionOutcome] = useState<string>("");

  // Analysis state
  const [analysing, setAnalysing] = useState(false);
  const [analysisRan, setAnalysisRan] = useState(false);
  const [analysisSavedMsg, setAnalysisSavedMsg] = useState<string | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysedSessionId, setAnalysedSessionId] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const summaryWords = tutorSummary.trim() ? tutorSummary.trim().split(/\s+/).length : 0;
  const sessionNumberInt = sessionNumber ? parseInt(sessionNumber, 10) : NaN;
  const sessionCode =
    Number.isFinite(sessionNumberInt) && sessionNumberInt > 0
      ? `S${sessionNumberInt}`
      : "";
  const identityComplete = !!(sessionDate && sessionNumber);
  const canAnalyse = identityComplete && transcriptRaw.trim().length > 0;

  const { data: ssd, refetch: refetchSessions, isFetching: refreshing } = useQuery({
    queryKey: ["sessions", active?.id],
    enabled: !!active?.id,
    queryFn: async () => {
      if (isDemo()) return demoGetSessions(active!.id);
      const { data, error } = await sdb
        .from("sessions")
        .select("*, session_analysis(*), annotations(*)")
        .eq("student_id", active!.id)
        .order("session_date", { ascending: false });
      if (error) throw error;
      return { sessions: data || [] };
    },
  });
  const sessions: any[] = ssd?.sessions || [];

  // Pull analysis data from the just-saved row (or latest session for non-tutor viewers)
  const analysedSession = useMemo(() => {
    if (analysedSessionId) return sessions.find((s) => s.id === analysedSessionId);
    if (!isTutor) return sessions[0]; // parent / read-only viewer sees latest analysis
    return null;
  }, [sessions, analysedSessionId, isTutor]);

  const showAnnotationOut = (isTutor && analysisRan) || (!isTutor && !!analysedSession);

  const annotations: any[] = Array.isArray(analysedSession?.annotations) ? analysedSession!.annotations : [];

  // Prefer session_analysis AI output; fall back to annotations if not yet analysed
  const sa: any = Array.isArray(analysedSession?.session_analysis)
    ? analysedSession!.session_analysis[0]
    : analysedSession?.session_analysis ?? null;

  const parseJsonbArray = (v: any): string[] => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    if (typeof v === "string") { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
    return [];
  };
  // Fix 1: filter raw enum leakage — single underscore_token with no spaces
  const isRawEnum = (s: string) => /^\s*[a-z][a-z0-9]*(_[a-z0-9]+)+\s*$/.test(s);

  const mathFindings: string[] = parseJsonbArray(sa?.math_findings)
    .filter((item: string) => !isRawEnum(item));
  const supportingContext: string[] = parseJsonbArray(sa?.supporting_context)
    .filter((item: string) => !/family interference/i.test(item) && !isRawEnum(item));

  // Fix 2: map [Student] enum values to readable text
  const STUDENT_ENUM_MAP: Record<string, string> = {
    strengthen_retrieval: "Continue retrieval practice for current number bonds without visual supports.",
    maintain_and_consolidate: "Maintain current number bonds before introducing new combinations.",
    increase_challenge: "Student is ready for new number bond combinations.",
    observe_and_collect_more_evidence: "Continue observing — more sessions needed before changing approach.",
    reduce_counting_dependency: "Reduce counting dependency by encouraging retrieval before counting.",
    build_number_relationships: "Build number relationships using concrete part-whole activities.",
  };

  const interventionsList: { text: string; enumKey: string | null }[] = parseJsonbArray(sa?.interventions).map((item: string) => {
    if (!item.startsWith("[Student]")) return { text: item, enumKey: null };
    const enumPart = item.replace(/^\[Student\]\s*/, "").trim();
    const readable = STUDENT_ENUM_MAP[enumPart];
    return {
      text: readable ? `[Student] ${readable}` : item,
      enumKey: enumPart,
    };
  });

  async function handleAnalyse() {
    if (!active?.id) { setAnalysisError("No active student selected."); return; }
    if (!canAnalyse) { setAnalysisError("Complete session identity and add transcript text first."); return; }
    setAnalysing(true);
    setAnalysisError(null);
    setAnalysisProgress(10);

    const phaseValue = PHASES.find((p) => p.code === phaseCode)?.value || null;
    const payload = {
      studentId: active.id,
      session_date: sessionDate ? new Date(sessionDate).toISOString() : null,
      session_code: sessionCode || null,
      phase: phaseValue,
      session_number: Number.isFinite(sessionNumberInt) ? sessionNumberInt : null,
      focus: focus.trim() || null,
      transcript_raw: transcriptRaw,
      tutor_summary: tutorSummary || null,
      task_demand: taskDemand || null,
      concept_type: conceptType || null,
      session_outcome: sessionOutcome || null,
    };

    try {
      setAnalysisProgress(40);
      let savedId: string | null = null;
      if (isDemo()) {
        const res = await demoSaveSession(payload);
        if (res.skipped) {
          setAnalysisError("Demo student is not persisted. Sign in with a real account to analyse.");
          return;
        }
        savedId = res.session?.id ?? null;
      } else {
        const row = {
          student_id: payload.studentId,
          session_date: payload.session_date,
          session_code: payload.session_code,
          phase: payload.phase,
          session_number: payload.session_number,
          focus: payload.focus,
          transcript_raw: payload.transcript_raw,
          tutor_summary: payload.tutor_summary,
          task_demand: payload.task_demand,
          concept_type: payload.concept_type,
          session_outcome: payload.session_outcome,
        };
        if (payload.session_code) {
          const { data: existing, error: selErr } = await sdb
            .from("sessions")
            .select("id")
            .eq("student_id", payload.studentId)
            .eq("session_code", payload.session_code)
            .maybeSingle();
          if (selErr) throw selErr;
          if (existing?.id) {
            const { error } = await sdb.from("sessions").update(row).eq("id", existing.id);
            if (error) throw error;
            savedId = existing.id;
          } else {
            const { data, error } = await sdb.from("sessions").insert(row).select("id").single();
            if (error) throw error;
            savedId = data?.id ?? null;
          }
        } else {
          const { data, error } = await sdb.from("sessions").insert(row).select("id").single();
          if (error) throw error;
          savedId = data?.id ?? null;
        }
      }
      // --- Gemini AI analysis ---
      setAnalysisProgress(60);
      console.log("[AH] Gemini block reached. savedId:", savedId, "transcriptRaw length:", transcriptRaw.length);
      if (savedId) {
        try {
          console.log("[AH] Calling analyseTranscriptWithGemini…");
          const ai = await analyseTranscriptWithGemini(transcriptRaw);

          // Map Gemini output to session_analysis columns
          const mathFindings = [
            ...( ai.math_observations ?? []),
          ];
          const supportingContext: string[] = [
            ai.strategy_observed === 'count-all'
              ? "Count-all strategy detected: student is counting from 1 for each arithmetic problem."
              : ai.strategy_observed === 'mixed'
              ? "Mixed strategy observed: student used counting for some problems and retrieval for others."
              : "No count-all strategy detected.",
            ...(ai.error_patterns ?? []).map((e: string) => `Student showed a ${e.replace(/_/g, " ")} during the session.`),
          ];
          const interventions = [
            ...( ai.interventions_student ?? []).map((s: string) => `[Student] ${s}`),
            ...( ai.interventions_tutor ?? []).map((s: string) => `[Tutor] ${s}`),
          ];
          const nextSessionPlan = ai.next_session_plan ?? [];

          // Upsert into session_analysis (delete existing first to keep one row per session)
          await sdb.from("session_analysis").upsert({
            session_id: savedId,
            student_id: payload.studentId,
            math_findings: mathFindings,
            supporting_context: supportingContext,
            interventions: interventions,
            plan_continue: nextSessionPlan,
            biggest_success: ai.biggest_success || null,
            biggest_obstacle: ai.biggest_obstacle || null,
            progression_ready: ai.progression_ready,
            next_session_focus: ai.next_session_focus || null,
            rationale: ai.rationale || null,
            confidence_score: ai.confidence_score || null,
            primary_student_recommendation: ai.primary_student_recommendation || null,
          }, { onConflict: "session_id" });
        } catch (aiErr: any) {
          // Non-fatal: session is saved, just surface the AI error
          console.error("[AH] Gemini error:", aiErr);
          setAnalysisError(`Session saved. AI analysis failed: ${aiErr?.message || String(aiErr)}`);
        }
      }
      // --- end Gemini ---

      setAnalysisProgress(85);
      await refetchSessions();
      setAnalysedSessionId(savedId);
      setAnalysisRan(true);
      setAnalysisSavedMsg(`✓ Session ${sessionCode} analysed and saved.`);
      setAnalysisProgress(100);
      onSaved?.();
    } catch (e: any) {
      setAnalysisError(`Analysis failed: ${e?.message || String(e)}`);
    } finally {
      setAnalysing(false);
      setTimeout(() => setAnalysisProgress(0), 800);
    }
  }

  const [savingReview, setSavingReview] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  function handleSelectSession(row: any) {
    if (!row) return;
    setAnalysedSessionId(row.id);
    setSessionDate(row.session_date ? String(row.session_date).slice(0, 10) : "");
    const code = PHASES.find((p) => p.value === row.phase)?.code ?? "";
    setPhaseCode(code);
    const num =
      row.session_number != null
        ? String(row.session_number)
        : (typeof row.session_code === "string" ? (row.session_code.match(/\d+$/)?.[0] ?? "") : "");
    setSessionNumber(num);
    setFocus(row.focus || "");
    setTranscriptRaw(row.transcript_raw || "");
    setTutorSummary(row.tutor_summary || "");
    setTaskDemand(row.task_demand ? (TASK_DEMAND_REVERSE[row.task_demand] ?? "") : "");
    setConceptType(row.concept_type ? (CONCEPT_TYPE_REVERSE[row.concept_type] ?? "") : "");
    setSessionOutcome(row.session_outcome ? (OUTCOME_REVERSE[row.session_outcome] ?? "") : "");
    setAnalysisRan(true);
    setAnalysisError(null);
    setUploadError(null);
    requestAnimationFrame(() => {
      rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }


  async function handleSaveSessionReview() {
    if (!analysedSessionId) {
      toast.error("Save the session first by running Analyse.");
      return;
    }
    setSavingReview(true);
    try {
      const { error } = await sdb
        .from("sessions")
        .update({
          task_demand: TASK_DEMAND_MAP[taskDemand] ?? null,
          concept_type: CONCEPT_TYPE_MAP[conceptType] ?? null,
          session_outcome: OUTCOME_MAP[sessionOutcome] ?? null,
          tutor_summary: tutorSummary || null,
        })
        .eq("id", analysedSessionId);
      if (error) throw error;
      toast.success("Session review saved.");
      await refetchSessions();
    } catch (e: any) {
      toast.error(`Failed to save session review: ${e?.message || String(e)}`);
    } finally {
      setSavingReview(false);
    }
  }

  async function handleDownloadTutorReport() {
    const row =
      (analysedSessionId && sessions.find((s) => s.id === analysedSessionId)) ||
      sessions[0];
    if (!row) {
      toast.error("No session available to download.");
      return;
    }
    setDownloadingReport(true);
    try {
      let analysis: any = null;
      try {
        const { data } = await sdb
          .from("session_analysis")
          .select("*")
          .eq("session_id", row.id)
          .maybeSingle();
        analysis = data || null;
      } catch {
        analysis = null;
      }

      const pseudonym = (active as any)?.pseudonym || (active as any)?.name || "";
      const sessDateRaw: string = row.session_date || row.date || "";
      const sessDateOnly = sessDateRaw ? String(sessDateRaw).slice(0, 10) : "";
      const sessCode = row.session_code || "session";

      const lines: string[] = [];
      lines.push("AH — TUTOR REPORT");
      lines.push(`Session: ${sessCode} · ${sessDateOnly}`);
      if (pseudonym) lines.push(`Student: ${pseudonym}`);
      lines.push(`Phase: ${row.phase ?? ""}`);
      lines.push(`Focus: ${row.focus ?? ""}`);
      lines.push("");
      lines.push(`TASK DEMAND: ${row.task_demand ?? ""}`);
      lines.push(`CONCEPT TYPE: ${row.concept_type ?? ""}`);
      lines.push(`SESSION OUTCOME: ${row.session_outcome ?? ""}`);
      lines.push("");
      lines.push("TUTOR SUMMARY:");
      lines.push(row.tutor_summary || "Not available");
      lines.push("");
      lines.push("MATH FINDINGS:");
      lines.push(formatJsonbField(analysis?.math_findings));
      lines.push("");
      lines.push("SUPPORTING CONTEXT:");
      lines.push(formatJsonbField(analysis?.supporting_context));
      lines.push("");
      lines.push("INTERVENTION MOVES:");
      lines.push(formatJsonbField(analysis?.interventions));
      lines.push("");
      lines.push("NEXT SESSION — CONTINUE:");
      lines.push(formatJsonbField(analysis?.plan_continue));
      lines.push("");
      lines.push("NEXT SESSION — REVIEW:");
      lines.push(formatJsonbField(analysis?.plan_review));
      lines.push("");
      lines.push("NEXT SESSION — AVOID:");
      lines.push(formatJsonbField(analysis?.plan_avoid));

      const text = lines.join("\n");
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `AH-tutor-report-${sessCode}-${sessDateOnly}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(`Failed to download report: ${e?.message || String(e)}`);
    } finally {
      setDownloadingReport(false);
    }
  }

  async function handleFileUpload(f: File) {
    setUploadError(null);
    try {
      const isPdf = /\.pdf$/i.test(f.name) || f.type === "application/pdf";
      if (isPdf) {
        const text = await extractPdfText(f);
        if (!text) throw new Error("No text found in PDF.");
        setTranscriptRaw(text);
      } else {
        const text = await f.text();
        setTranscriptRaw(text);
      }
    } catch (err: any) {
      setUploadError(`Upload failed: ${err?.message || String(err)}`);
    }
  }

  return (
    <div ref={rootRef} className="space-y-2.5">

      {/* SESSION IDENTITY — tutor/admin only */}
      {isTutor && (
      <Card title="1. Session identity" subtitle="Enter the session date and session number. Session code is generated automatically.">
          <div className="flex items-start gap-4 mt-2">
            <div className="flex flex-col gap-1" style={{ width: 220 }}>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Session Date</span>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-md border bg-background"
              />
            </div>
            <div className="flex flex-col gap-1" style={{ width: 140 }}>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Session Number</span>
              <input
                type="text"
                inputMode="numeric"
                value={sessionNumber}
                onChange={(e) => setSessionNumber(e.target.value.replace(/[^0-9]/g, ""))}
                placeholder="e.g. 3"
                className="text-xs px-2.5 py-1.5 rounded-md border bg-background w-full"
              />
            </div>
            <div className="flex flex-col gap-1" style={{ width: 120 }}>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Session Code</span>
              <div className="text-xs px-2.5 py-1.5 rounded-md border bg-muted font-semibold tabular-nums text-[var(--text)]">
                {sessionCode || <span className="text-muted-foreground font-normal">—</span>}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* SESSION REVIEW (transcript) — tutor/admin only */}
      {isTutor && (
        <Card
          title="2. Session transcript"
          subtitle="Upload a tutoring transcript. AH analyses mastery, retrieval, misconceptions and intervention opportunities automatically."
        >

          <p className="text-xs text-[var(--text-muted)] mb-3">For best results: Keep transcripts under 12,000 characters (maximum 20,000).</p>
          <textarea
            id="transcript"
            rows={9}
            value={transcriptRaw}
            onChange={(e) => setTranscriptRaw(e.target.value)}
            disabled={!identityComplete}
            placeholder={identityComplete ? "Paste labelled transcript here (T: / S: per turn)…" : "Fill in session identity above to unlock the transcript."}
            className="w-full p-2.5 text-xs rounded-md border resize-y bg-[var(--surface-2)] disabled:opacity-60"
            style={{ fontFamily: "monospace", lineHeight: 1.6 }}
          />
          <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
            <label className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-md border cursor-pointer hover:bg-muted">
              ↑ Upload transcript file (.txt / .pdf)
              <input
                type="file"
                accept=".txt,.md,.pdf,text/plain,text/markdown,application/pdf"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  await handleFileUpload(f);
                  e.target.value = "";
                }}
              />
            </label>
            <span className={cn("text-[11px] tabular-nums", transcriptRaw.length > 5000 ? "text-destructive" : "text-muted-foreground")}>
              {transcriptRaw.length.toLocaleString()} characters
            </span>
          </div>

          <div className="mt-4 flex flex-col items-start gap-1.5">
            <button
              type="button"
              onClick={handleAnalyse}
              disabled={analysing || !canAnalyse}
             className="inline-flex items-center gap-1.5 px-5 py-3 text-xs rounded-md text-white hover:opacity-90 disabled:opacity-50"
style={{ backgroundColor: '#5334C7' }}
            >
              ✦ {analysing ? "Analysing..." : "Analyse Session"}
            </button>
          </div>

          {(analysing || analysisProgress > 0) && (
            <div className="mt-3 h-1.5 w-full rounded-full bg-[var(--input)] overflow-hidden">
              <div
                className="h-full bg-foreground transition-all"
                style={{ width: `${analysisProgress}%` }}
              />
            </div>
          )}

          {analysisError && (
            <div className="mt-2 text-[11px] px-2.5 py-2 rounded border border-destructive text-destructive">{analysisError}</div>
          )}
          {uploadError && (
            <div className="mt-2 text-[11px] px-2.5 py-2 rounded border border-destructive text-destructive">{uploadError}</div>
          )}
        </Card>
      )}

      {/* TUTOR SUMMARY */}
      {isTutor && (
        <Card title="Tutor notes" subtitle="Optional. What happened in this session? What worked, what did not, any observations worth noting. Under 200 words.">
          <textarea
            id="tutor-summary"
            rows={3}
            value={tutorSummary}
            onChange={(e) => {
              const next = e.target.value;
              const words = next.trim() ? next.trim().split(/\s+/) : [];
              if (words.length > 200) return;
              setTutorSummary(next);
            }}
            placeholder="e.g. Student was distracted today, worked on Make 5 with rods..."
            className="w-full p-2.5 text-xs rounded-md border resize-y bg-[var(--surface-2)]"
            style={{ minHeight: 72, lineHeight: 1.6 }}
          />
        </Card>
      )}

      {/* SAVE / DOWNLOAD ACTIONS */}
      {isTutor && (
        <div className="flex items-center gap-2 flex-wrap">
          {analysisSavedMsg && (
  <span className="text-xs text-green-600 font-medium">{analysisSavedMsg}</span>
)}
          {analysisRan && (
            <button
              type="button"
              onClick={handleDownloadTutorReport}
              disabled={downloadingReport}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs rounded-md border hover:bg-muted disabled:opacity-50"
            >
              {downloadingReport ? "Preparing…" : "Download Tutor Report"}
            </button>
          )}
        </div>
      )}

      {/* POST-ANALYSIS OUTPUT */}
      {showAnnotationOut && (
        <div id="annotation-out" className="space-y-2.5">

          {/* SYNTHESIS SUMMARY */}
          {(sa?.biggest_success || sa?.biggest_obstacle || sa?.next_session_focus) && (
            <div className="rounded-lg border border-[#D9CCFF] bg-[#F3F0FF] p-4 space-y-2.5">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#5B43C6] mb-1">Session Summary</div>
              {sa?.biggest_success && (
                <div className="flex gap-2 items-start">
                  <span className="text-[11px] font-semibold text-[#5B43C6] w-28 flex-shrink-0 mt-0.5">Biggest success</span>
                  <span className="text-xs text-[var(--text)]">{sa.biggest_success}</span>
                </div>
              )}
              {sa?.biggest_obstacle && (
                <div className="flex gap-2 items-start">
                  <span className="text-[11px] font-semibold text-[var(--status-amber-fg)] w-28 flex-shrink-0 mt-0.5">Main obstacle</span>
                  <span className="text-xs text-[var(--text)]">{sa.biggest_obstacle}</span>
                </div>
              )}
              {sa?.next_session_focus && (
                <div className="flex gap-2 items-start">
                  <span className="text-[11px] font-semibold text-[var(--text2)] w-28 flex-shrink-0 mt-0.5">Next session</span>
                  <span className="text-xs font-medium text-[var(--text)]">{sa.next_session_focus}</span>
                </div>
              )}
            </div>
          )}

          <Card
            title={<SectionTitle icon={<BarChart2 size={16} />} number={1} label="Session Intelligence" sectionKey="findings" />}
            subtitle="Mastery, retention, errors, and conceptual advances."
            action={mathFindings.length > 0 ? <CountBadge count={mathFindings.length} label="findings" sectionKey="findings" /> : undefined}
            headerBg="#F8F5FF"
          >
            <div id="annotations-list-math">
              {mathFindings.length === 0 ? (
                <p className="text-xs text-muted-foreground">No math findings recorded for this session.</p>
              ) : (
                <ul className="space-y-1.5">
                  {mathFindings.map((item: string, i: number) => (
                    <li key={i} className="text-xs flex gap-2 items-start">
                      <span className="text-[var(--status-blue-fg)] font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>

          <Card
            title={<SectionTitle icon={<Shield size={16} />} number={2} label="Evidence & Strategy Signals" sectionKey="evidence" />}
            action={supportingContext.length > 0 ? <CountBadge count={supportingContext.length} label="signals" sectionKey="evidence" /> : undefined}
            headerBg="#F6FCF7"
            subtitle="Non-math observations that affect math performance: regulation, reading, motor, behaviour."
          >
            <div id="annotations-list-context">
              {supportingContext.length === 0 ? (
                <p className="text-xs text-muted-foreground">No supporting context recorded for this session.</p>
              ) : (
                <ul className="space-y-1.5">
                  {supportingContext.map((item: string, i: number) => (
                    <li key={i} className="text-xs flex gap-2 items-start">
                      <span className="text-[var(--status-teal-fg)] font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-end gap-2 mt-4 pt-3 border-t">
              {showWorkflowProgression && onContinueMastery && (
                <button
                  type="button"
                  onClick={onContinueMastery}
                  className="px-3.5 py-1.5 text-xs rounded-md border hover:bg-muted"
                >
                  Continue → Mastery Update
                </button>
              )}
            </div>
          </Card>

          <Card
            title={<SectionTitle icon={<Target size={16} />} number={3} label="Tutor Next Steps" sectionKey="recommendations" />}
            subtitle="Evidence-based recommendations for teaching and intervention."
            action={interventionsList.length > 0 ? <CountBadge count={interventionsList.length} label="recommendations" sectionKey="recommendations" /> : undefined}
            headerBg="#FFFCF5"
          >
            <div id="interventions" className="space-y-3">
              {interventionsList.length === 0 ? (
                <p className="text-xs text-muted-foreground">No intervention moves recorded for this session.</p>
              ) : (
                interventionsList.map((item, i) => {
                  const isStudent = item.text.startsWith("[Student]");
                  const guidance = item.enumKey ? RECOMMENDATION_GUIDANCE[item.enumKey] : null;

                  if (guidance && isStudent) {
                    return (
                      <div key={i} className="rounded-lg border border-[var(--status-amber-fg)] bg-[#FFFCF5] p-3 space-y-2">
                        <div className="flex gap-2 items-start">
                          <span className="text-[var(--status-amber-fg)] font-bold text-xs mt-0.5">→</span>
                          <span className="text-xs font-semibold text-[var(--text)]">[Student] {guidance.label}</span>
                        </div>
                        <div className="pl-4 space-y-1.5">
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text2)] mb-0.5">Why this matters</p>
                            <p className="text-xs text-[var(--text)]">{guidance.why}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text2)] mb-0.5">Next-session action</p>
                            <p className="text-xs text-[var(--text)]">{guidance.action}</p>
                          </div>
                          {guidance.doNot && (
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-wide text-red-500 mb-0.5">Critical Teaching Guardrail</p>
                              <p className="text-xs text-red-600">{guidance.doNot}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Tutor items or unmatched: render as before
                  return (
                    <div key={i} className="flex gap-2 items-start">
                      <span className="text-[var(--status-amber-fg)] font-bold text-xs mt-0.5">→</span>
                      <span className="text-xs">{item.text}</span>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      )}

      {/* SESSION HISTORY */}
      <Card
        title="Session history"
        subtitle="Saved sessions from Supabase."
        className="border-[var(--status-blue-fg)]"
        action={
          <button
            type="button"
            onClick={() => refetchSessions()}
            disabled={refreshing}
            className="text-[11px] px-2.5 py-1 rounded-md border hover:bg-muted disabled:opacity-50"
          >
            ↻ {refreshing ? "Refreshing…" : "Refresh sessions"}
          </button>
        }
      >
        {sessions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No Supabase sessions loaded yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1.5 pr-3 font-medium">Date</th>
                  <th className="py-1.5 pr-3 font-medium">Code</th>
                  <th className="py-1.5 font-medium">Analysis status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s: any) => {
                  const selected = analysedSessionId === s.id;
                  return (
                    <tr
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => handleSelectSession(s)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleSelectSession(s);
                        }
                      }}
                      style={{ borderTop: "0.5px solid var(--border)" }}
                      className={cn(
                        "cursor-pointer hover:bg-muted transition-colors",
                        selected && "bg-[var(--surface-2)] outline outline-1 outline-[var(--status-blue-fg)]",
                      )}
                    >
                      <td className="py-1.5 pr-3 tabular-nums">{s.session_date ? new Date(s.session_date).toLocaleDateString() : (s.date ? new Date(s.date).toLocaleDateString() : "—")}</td>
                      <td className="py-1.5 pr-3 tabular-nums">{s.session_code || "—"}</td>
                   <td className="py-1.5">
                        {s.session_analysis ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium" style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>Analysed</span>
                        ) : (
                          <span className="text-muted-foreground">Not analysed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
