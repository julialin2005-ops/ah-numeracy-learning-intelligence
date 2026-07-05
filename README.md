# AH – Numeracy Learning Intelligence

> Google × Kaggle AI Agents Capstone Project (2026)


AH is an AI-powered Numeracy Learning Intelligence platform that transforms dyscalculia tutoring transcripts into structured, evidence-based learning intelligence, helping tutors understand what changed in every learning session.

**Demo video:** https://youtu.be/3ECpq8yxhhI

```
Real Tutoring Transcript
          │
          ▼
   Gemini 2.5 Flash
          │
          ▼
 Five Specialised AI Skills
          │
          ▼
Structured Learning Intelligence
          │
          ▼
    Tutor Report
          │
          ▼
   Parent Summary
```

---

## The Problem

Tutors working with dyscalculic students generate a transcript or session note after every lesson. That record captures *what happened* — but almost never *what changed*: whether a skill moved from counting to retrieval, whether an error was a one-off slip or a real gap, what to do differently next time. That synthesis normally depends on the tutor's memory and judgment, session after session, with no structured trail for parents or for tracking progress over time.

AH replaces that manual synthesis step with a five-skill AI analysis pipeline that reads a session transcript and produces a structured report a tutor can act on immediately, and a parent can actually understand.

## What AH Does

A tutor logs a session transcript. Gemini runs it through five sequential skill assessments. A Synthesis Layer combines the outputs into a tutor report — demonstrated skills, misconceptions, session evidence, recommended next steps, and a parent-friendly summary. The tutor remains the educator; AH is the learning intelligence layer that helps interpret the lesson.

## The Five-Skill Framework

Each skill has one job and reports observable evidence only — no inferred causes, no diagnosis, no assumptions about attention, memory, or family interference.

| Skill | Purpose |
|-------|---------|
| Count Strategy Assessment | Identifies the strategy used to solve counting tasks. |
| Retrieval Strength Assessment | Evaluates how reliably known facts can be recalled. |
| Number Bonds Assessment | Assesses understanding of part-whole number relationships. |
| Error Pattern Assessment | Detects recurring numeracy error patterns. |
| Intervention Recommendation | Recommends the most appropriate instructional next step. |

Recommendations require recurring evidence across skills rather than an isolated error — this prevents over-recommending off a single event.

**Synthesis Layer:** consolidates the five outputs into `biggest_success`, `biggest_obstacle`, `progression_ready`, and `next_session_focus` — the fields driving the tutor and parent report views.

## Architecture

```
Tutoring Transcript
        │
        ▼
Gemini 2.5 Flash API call  (src/lib/gemini.ts)
        │
        ▼
Five-Skill Sequential Assessment
        │
        ▼
Synthesis Layer
        │
        ▼
Supabase (session_analysis, mastery_updates, recall_checks)
        │
        ▼
React Dashboard — Tutor + Parent views
```

This implementation uses direct Gemini API integration rather than an ADK-based orchestration framework.

## Tech Stack

- **Frontend:** React, TanStack Router, Tailwind, shadcn/ui
- **Runtime/Build:** Bun, Vite
- **Backend:** Supabase (Postgres, RLS)
- **AI:** Gemini 2.5 Flash, direct API integration
- **Deployment:** Lovable

## Current MVP

This is a single-tutor, single-student pilot, not a multi-tenant product yet. It demonstrates the full pipeline end-to-end: transcript in, structured report out, for one real dyscalculia tutoring relationship.

**Built:**
- Session logging and transcript capture
- Five-skill Gemini analysis pipeline
- Synthesis Layer report generation
- Tutor dashboard with Why/Action/Guardrail recommendation cards
- Parent-facing view: session history, mastery status, and retention checks per skill

**Future roadmap:**
- Multi-session trend analysis (mastery progression, retention curves across sessions)
- Multi-tutor / multi-student admin management (current user bootstrap is direct SQL)
- Agent-orchestration layer (ADK) or MCP tool integration
- Automated human-review gate before a report reaches a parent

The deployed app sits behind tutor/parent authentication, so it isn't included as a clickable link here. The demo video shows the full pipeline running live, end to end, against real session data.

## Running Locally

**Requirements:** Bun, a Supabase project.

```bash
git clone https://github.com/julialin2005-ops/ah-numeracy-learning-intelligence.git
cd ah-numeracy-learning-intelligence
bun install
bun run dev
```

App runs at `localhost:8080`. No `.env` file or API key is required to view existing results — the app connects directly to the live pilot Supabase database (configured in `src/lib/supabase-config.ts`).

**To see a completed analysis:** go to **Sessions**, then click the saved session dated **26/06/2026 (code S6)** under Session History. This loads the full AI-generated report — Session Intelligence, Evidence & Strategy Signals, and Tutor Next Steps — from a real tutoring session, already analysed.

**Note:** RLS is currently disabled on this pilot database (single-tutor, single-parent scale). Please read/explore only — avoid submitting new transcripts for analysis or editing existing records, since this is the same database backing the real pilot relationship shown in the demo video. Running a new analysis requires a Gemini API key (`VITE_GEMINI_API_KEY` in `.env`), which is intentionally not included here.

## Repository Structure

```
src/
  routes/        # Pages — tutor, parent, admin, sessions, progress
  components/    # SessionReview, AppShell, shared UI primitives
  lib/           # Gemini integration, recommendation guidance, Supabase config
supabase/
  migrations/    # Schema + RLS migrations
docs/            # Synthesis layer design, learning taxonomy
```

## Vision

AH introduces the category of **Numeracy Learning Intelligence**.

Today, AH analyses individual tutoring sessions. The next stage is longitudinal learning intelligence — synthesising evidence across many sessions to help tutors understand mastery progression, retention, intervention effectiveness, and long-term learning outcomes.

## License

MIT
