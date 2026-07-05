## Goal
Make Session History rows clickable; loading a row populates all Session Review fields, scrolls to the top of the Session Review section, and visually highlights the selected row. No new components, no schema/RLS changes, no new inserts — continues using existing `update()` save logic via `analysedSessionId`.

## Files changed
- `src/components/SessionReview.tsx` (only file)

## Implementation details

### 1. Sessions query columns
Current query already uses `select("*, session_analysis(*), annotations(*)")`, so `id, session_date, session_code, phase, focus, task_demand, concept_type, session_outcome, tutor_summary` are already returned. Keep `select("*")` (covers all listed columns plus `session_number`/`transcript_raw` needed to rehydrate identity & transcript). No query change required.

### 2. Reverse enum → radio-label maps
Add module-level constants (mirror existing forward maps):
```
const TASK_DEMAND_REVERSE = { low: "Low", moderate: "Moderate", high: "High" };
const CONCEPT_TYPE_REVERSE = { new: "New", review: "Review", consolidation: "Consolidation" };
const OUTCOME_REVERSE = { successful: "Successful", partial: "Partial success", struggled: "Struggled" };
```

### 3. `handleSelectSession(row)`
- `setAnalysedSessionId(row.id)` — so existing Save Session Review and Download Tutor Report target this row.
- Populate identity:
  - `setSessionDate(row.session_date ? String(row.session_date).slice(0,10) : "")`
  - Derive `phaseCode` from `row.phase` using `PHASES.find(p => p.value === row.phase)?.code ?? ""`; setPhaseCode.
  - `setSessionNumber(row.session_number != null ? String(row.session_number) : (row.session_code?.match(/\d+$/)?.[0] ?? ""))`
  - `setFocus(row.focus || "")`
- Populate transcript & summary:
  - `setTranscriptRaw(row.transcript_raw || "")`
  - `setTutorSummary(row.tutor_summary || "")`
- Populate radios using REVERSE maps (fall back to `""` when null):
  - `setTaskDemand(TASK_DEMAND_REVERSE[row.task_demand] ?? "")`
  - `setConceptType(CONCEPT_TYPE_REVERSE[row.concept_type] ?? "")`
  - `setSessionOutcome(OUTCOME_REVERSE[row.session_outcome] ?? "")`
- `setAnalysisRan(true)` so the post-analysis output panel (annotations) renders for the loaded session.
- Clear `analysisError` and `uploadError`.
- Scroll: wrap the SessionReview root `<div className="space-y-2.5">` with `ref={rootRef}` and call `rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })`. (No new component — just a `useRef` on existing root div.)

### 4. Row UI
- Add `<th>` for "Code".
- Each `<tr>`:
  - `onClick={() => handleSelectSession(s)}`
  - `role="button"`, `tabIndex={0}`, `onKeyDown` Enter/Space activation
  - `className={cn("cursor-pointer hover:bg-muted", analysedSessionId === s.id && "bg-[var(--surface-2)] outline outline-1 outline-[var(--status-blue-fg)]")}`
  - Keep existing `borderTop` inline style
- Columns shown: Date, Code (`s.session_code`), Focus, Outcome (Code is additive for clarity; not required by spec but useful — if you prefer Date/Focus/Outcome only, say so and I'll drop the Code column).

### 5. Save / Download
No change — they already key off `analysedSessionId`, which `handleSelectSession` sets. Saving an edited radio/summary updates the selected historical row in place.

## Out of scope / unchanged
- Auth, routing, role gating, AppShell, Sessions route shell.
- Supabase schema, RLS, query columns (already sufficient).
- Insert path / Analyse flow remain identical.

## Verification
1. Open `/sessions` as tutor with ≥1 saved session.
2. Click a row → identity fields, phase chip, session number, focus, transcript, radios, and Tutor Summary all populate from that row.
3. Page smooth-scrolls to top of Session Review.
4. Clicked row gets highlighted; clicking a different row moves the highlight.
5. Edit a radio + click Save Session Review → toast success; refetch shows updated values; clicking the same row reloads the new values.
6. Click Download Tutor Report → filename uses the selected row's `session_code` and date.
7. Parent role: history rows are visible (existing behavior) and clickable but identity/context cards remain hidden — only Tutor Summary + radios are gated; for parent, click still updates `analysedSessionId` so the annotation output reflects that row.
