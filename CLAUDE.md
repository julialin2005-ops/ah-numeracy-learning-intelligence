# AH — Project Context for Claude

## What this is

AH is a **Numeracy Learning Intelligence** platform.
It transforms tutoring session evidence into structured learning insight for
children with dyscalculia and foundational numeracy difficulties.

This repository is the **capstone demo version** — no authentication,
single student (Adrian), single tutor. The goal is a 3-minute walkthrough
for a non-technical judge.

**Core promise:** Understand what changed in every learning session.
**Role definition:** The tutor remains the coach. AH becomes the intelligence
layer behind the coaching.

**What AH is NOT:**
- Not a math practice app
- Not an AI tutor replacing the specialist
- Not a progress dashboard (AH interprets learning, it does not just display metrics)
- Not a diagnosis tool
- Not fully automated — human review remains in the loop

---

## Tech Stack

- **Frontend:** React + TanStack Router (Lovable-generated)
- **Backend:** Supabase — project ref `eestpryxoabkjfvfqpys`
- **Supabase client config:** Lives in `src/lib/supabase-config.ts`. Do not change project URL or anon key. Do not move or overwrite this file.
- **AI (production):** Gemini / Google ADK for AI analysis
- **AI (coding assistant):** Claude Code is used only to help build the app, not as the production AI engine

---

## The 5 AH Intelligence Skills

These are the five analysis pipeline skills. Each has a distinct job.
Reference them by exact name in any AI prompt or UI label.

### 1. Count-All Detector
Identifies whether the student is using a count-all strategy (counting from 1
for every problem) rather than count-on or retrieval. Key distinction:
count-all is a strategy failure; interference errors (fast wrong answer from
a parallel fact family) are a retrieval competition failure. Do NOT conflate them.

Output: `detected`, `confidence_score`, `strategy_type`, `evidence_quotes`,
`rationale`, `interference_flag`

### 2. Retrieval Strength Assessment
Evaluates whether mathematical knowledge is being retrieved from memory
efficiently or reconstructed through counting each time.

### 3. Number Bonds Assessment
Assesses flexibility and fluency with part-part-whole relationships.
Tracks fact families (Make 5, Make 6–10, etc.) through the D→F→R→T progression.

### 4. Error Pattern Detection
Identifies recurring misconceptions and procedural breakdowns. Most important
pattern: **Family Interference Error** — student retrieves a fact from the wrong
number bond family because two families are active in memory simultaneously.
This is a retrieval competition failure, not a conceptual failure. Treat differently.

### 5. Intervention Recommendation
Generates evidence-based recommendations on two independent tracks:
- Track 1: What the student needs next
- Track 2: What the tutor must change in delivery
These tracks are independent. A correct student recommendation with wrong tutor
delivery will still fail.

---

## Skill Taxonomy (Educational Knowledge Base)

AH tracks learning across 7 domains using 4 progression phases:

| Phase | Definition |
|-------|-----------|
| **D** | Discovery — no consistent response. Answers random or absent. |
| **F** | Foundation — correct with concrete support (rods, dot cards). Cannot produce without support. |
| **R** | Retrieval — correct after concrete support removed. **R is NEVER confirmed within a single session.** Requires cold recall at the start of a subsequent session. |
| **T** | Transfer — applies knowledge to novel contexts without prompting. |

**F→R Transition (critical rule):** Within-session recall after card removal = F→R transition state, not confirmed R. AH codes this explicitly to prevent premature Retrieval assignment.

### 7 Learning Domains
1. Make 5 and Below (number bonds within 5)
2. Make 6–10 (number bonds 6–10; gated on confirmed R of Domain 1)
3. Cardinality (last number counted = quantity of the set)
4. Subitising (immediate visual quantity recognition, no counting)
5. Number Sequencing (forward/backward, before/after, 0–15 range)
6. Equal Groups (precursor to multiplication)
7. Multiplicative Thinking (gated on Domain 6 Foundation)

**Interference tracking rule:**
- Interference at retrieval level with concrete support present → Foundation not consolidated for either family. Pause progression.
- Interference absent across two consecutive sessions → R confirmation gate cleared.

---

## Database Schema (Supabase)

**Key tables:**
- `sessions` — session identity + review fields (session_date, phase, session_number, session_code, focus, task_demand, concept_type, session_outcome, tutor_summary, session_rating)
- `session_analysis` — AI-generated output ONLY (math findings, interventions, plan arrays)
- `mastery_updates` — skill mastery changes per session
- `recall_checks` — retention data
- `annotations` — six canonical types: `interference`, `gap`, `positive`, `milestone`, `attention`, `procedural`
- `skills` — 21 canonical skills, read-only, pull dynamically

**Key views (verify these exist before use):**
- `latest_mastery` — current mastery per skill per student. **Verify:** run `select * from latest_mastery limit 5;` in Supabase before referencing in code. If it errors, replace with the actual table/view that exists.
- `recall_summary` — retention overview
- `support_effectiveness` — intervention tracking

**Rule:** Session review fields save to `sessions`. AI output saves to `session_analysis`. Never mix these.

---

## Brand System

**Light mode only. No dark mode.**

### Color Tokens
```css
--color-brand:        #7C4DFF;  /* AH Purple — only active brand color */
--color-text-primary: #101828;  /* Dark text */
--color-bg:           #F8FAFC;  /* Off-white background */
--color-surface:      #FFFFFF;  /* Cards, modals */
--color-accent-soft:  #E7A8D9;  /* Mascot/brand accents only */
--color-error:        #D92D20;
--color-warning:      #F79009;
--color-success:      #12B76A;
--color-info:         #2F6BFF;  /* Informational dashboard states only — NOT a brand color */
```

**Removed color:** `#2F6BFF` (Galaxy Blue) is NOT a brand color. It appears only as `--color-info` in dashboard functional states (charts, info badges). Never use it as a primary or brand element.

### Typography
```css
--font-heading: "Poppins", "Montserrat", sans-serif;  /* Bold */
--font-body:    "Inter", "Open Sans", sans-serif;
```

### Button Rules
- **Primary:** `#7C4DFF` fill, white text
- **Secondary:** White fill, `#7C4DFF` border and text
- **Destructive:** White fill, `#D92D20` border and text

### Color Ratio (UI)
- 70% Off White (`#F8FAFC`)
- 20% Dark Text (`#101828`)
- 10% AH Purple (`#7C4DFF`)

### Design Rules
- When in doubt: white space, dark text, AH Purple only
- Do not add colors not in this token set
- Border radius: 8px standard, 12px large cards

---

## Dashboard Layout

- **Left sidebar:** Fixed, 220px wide, full height
- **Sidebar background:** Dark (e.g. `#1a1a2e`) to contrast with light content
- **Active nav item:** 3px left border `#7C4DFF` + `rgba(124,77,255,0.08)` background
- **Main content:** Remaining viewport width, independently scrollable
- **5 nav items only:** Students · Sessions · Analysis · Skills · Reports

---

## Dashboard Design Principles

- Every screen must communicate student status within 5 seconds
- Primary action always visible without scrolling
- No clutter — if a judge can't understand it in 3 minutes, cut it
- Display only on Reports page — no editing
- Skills page is read-only — no interactions

---

## Capstone Constraints

- No authentication screens
- No admin panel
- No parent management UI
- No "add student" — Adrian is the demo student, pre-seeded in Supabase
- Data entry only on Sessions page (transcript upload + session details)
- Target: 3-minute walkthrough for a non-technical judge

---

## AI Analysis

**Production AI stack:** Gemini / Google ADK (capstone requirement — Google stack).
Claude Code is the coding assistant only. Do not use Claude/Anthropic API in the demo runtime.

**For the capstone demo:** If the Gemini API is not yet wired, use pre-seeded demo output
rather than a broken live API call. A clean static result is better than a broken live one.

When the analysis pipeline is active, instruct the model to apply the 5 AH skills and
return structured JSON with these keys:
- `math_observations` (array)
- `count_all_detected` (bool + evidence)
- `interference_flag` (bool)
- `error_patterns` (array)
- `interventions` (Track 1: student needs, Track 2: tutor delivery changes)
- `next_session_plan` (array)

Save output to `session_analysis` table only. Never to `sessions`.

---

## Do NOT change

- `src/lib/supabase-config.ts` — do not change the project URL or anon key
- Any RLS policies
- The `skills` table — 21 canonical skills, treat as read-only
- The 5 nav items — no additions for capstone scope
- Any existing session analysis or mastery data

