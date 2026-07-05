# AH Session Synthesis Layer
**Date:** June 2026  
**Status:** Implemented in gemini.ts

---

## Problem Identified

AH's individual skills were detecting findings correctly, but the final report presented all findings with equal weight.

This caused reports to over-emphasize frequent errors and under-emphasize the most instructionally significant learning gains.

### Example — 26 June Session

Detected correctly:
- Counting errors
- Object counting instability
- Subitizing weaknesses
- Make 5 retrieval success
- Number bond retention

Incorrect report emphasis:
- Focused on counting dependency as the primary story
- Classified the student as using count-all throughout
- Failed to highlight retained Make 5 knowledge as the key learning gain

---

## Root Cause

The system lacked a synthesis layer.

Skills operated independently and produced findings, but no mechanism existed to determine:
- Most important learning gain
- Most important remaining obstacle
- Readiness for progression
- Next instructional priority

---

## Solution

Added a Session Synthesis Layer executed after skill assessment, before recommendation generation.

### Required synthesis output fields
- `biggest_success` — single string, most important learning gain
- `biggest_obstacle` — single string, most important remaining barrier
- `progression_ready` — boolean, true only if retrieval consistent AND understanding secure AND counting foundations stable
- `next_session_focus` — single string, max 20 words, concrete next-session priority

---

## Synthesis Principles

1. **Instructional significance > frequency of observations.** A single high-value finding (number bond retention) outweighs many low-value findings (counting errors) in the session summary.

2. **Prioritise instructional significance, not transcript order.** If meaningful number bond retrieval is demonstrated, it should normally be prioritised over rote counting achievements unless a more significant learning gain is present.

3. **A student may simultaneously show strong retrieval and weak counting foundations.** Reports must reflect both rather than collapsing them into a generic weakness narrative.

4. **Count-all must only be classified when counting is used to solve arithmetic or number bond problems**, not during object counting or quantity verification tasks. If the student retrieves any number bond facts without counting, `strategy_observed` should be `mixed`, not `count-all`.

5. **Session summaries must lead with:** biggest success → main obstacle → next session focus, before detailed findings.

---

## Product Lesson

AH's value is not finding more observations.

AH's value is determining which observations matter most instructionally.

The synthesis layer transformed AH from a findings engine into a learning-intelligence engine.

---

## Final Synthesis Prompt (June 2026)

---

## Recommendation Contradiction Fix (June 2026)

### Problem
The recommendation engine was simultaneously producing:
- "Do not introduce new content until retrieval is stable."
- "Test transfer to a new number to verify learning generalises."

These are contradictory. A tutor cannot follow both.

### Root Cause
`interventions_tutor` was being populated independently from the synthesis outputs. `progression_ready: false` in the JSON did not gate the tutor-facing transfer testing recommendation.

### Fix
Added a single gating rule:
> If `progression_ready = false`, do NOT include transfer testing in `interventions_tutor`. Transfer testing is only appropriate when `progression_ready = true`.

### Principle
**Recommendations must resolve to a single instructional direction.**

When the synthesis layer says the student is not ready to progress, all tutor recommendations must reinforce consolidation — not simultaneously suggest expansion.

The deeper issue this reveals: AH must eventually learn to distinguish between:
- `emerging mastery` → continue consolidating
- `secure mastery` → ready to progress

That distinction lives above the five skills, in the synthesis and recommendation prioritization layer.

---

## Count-All Contradiction Fix (June 2026)

### Problem
Session Intelligence showed: "Student used a count-all strategy"
Evidence & Strategy Signals showed: "No count-all strategy detected"

Both visible on screen simultaneously. A judge would notice immediately.

### Root Cause
`strategy_observed = "mixed"` from Gemini, but the UI mapping was binary:
- `count-all` → "Count-all strategy detected"
- anything else → "No count-all strategy detected"

So `mixed` silently fell through to the negative case while `math_observations` still contained the count-all observation in free text.

### Fix
Added a third branch to the strategy signal mapping:
- `count-all` → "Count-all strategy detected: student is counting from 1 for each arithmetic problem."
- `mixed` → "Mixed strategy observed: student used counting for some problems and retrieval for others."
- anything else → "No count-all strategy detected."

### Principle
**Binary UI mappings on non-binary model outputs will always produce contradictions.**
Any time Gemini returns an enum with 3+ values, the UI must handle all values explicitly.

---

## Future Refinement: Task Scope vs Generalisation Limitation

### Problem (not yet fixed)
The system may report:
> "Student only produced number bonds for a single target number throughout the session."

This reads as a weakness. But if the lesson objective was Make 4, producing only Make 4 bonds is expected and appropriate.

### Distinction AH needs to make
- **Task scope limitation:** Student worked on one number because that was the lesson objective. Not a weakness.
- **Generalisation limitation:** Student was asked to apply knowledge across numbers and could not. A genuine finding.

### Why it matters commercially
Tutors set lesson objectives. AH should know the difference between:
- "Student stayed on topic"
- "Student could not transfer"

### Current status
Not implemented. Phase and session focus fields were removed from the demo UI, so AH has no signal about lesson scope. Revisit when session context is reintroduced in production.

---

## Recommendation Guidance Mapping (June 2026)

Stored in `src/lib/recommendation_guidance.ts`. Maps canonical skill output values to tutor-facing expanded guidance with three components: label, why this matters, next-session action, and optional do-not.

### Canonical values and guidance

**observe_and_collect_more_evidence**
- Label: Continue observing — more sessions needed before changing approach.
- Why: Progress under scaffolding is not the same as consolidation. Transfer and independent cold recall not yet confirmed.
- Action: Begin next session with one cold recall probe before using any visual support.
- Do not: Do not increase challenge or introduce a new fact family until independent retrieval and transfer are observed.

**maintain_and_consolidate**
- Label: Maintain and consolidate current learning.
- Why: Retrieval is developing but not yet consistent across varied conditions.
- Action: Revisit same number bond families using varied representations. Include cold recall probe before visual support each session.
- Do not: Do not introduce new number families. Do not assume scaffolded recall equals consolidation.

**strengthen_retrieval**
- Label: Strengthen retrieval of known facts.
- Why: Student can produce correct answers but retrieval is inconsistent or context-dependent.
- Action: Short daily retrieval sprints, 5–8 facts, no visual aids, timed. Focus on inconsistent facts.
- Do not: Do not introduce new content until retrieval of current facts is stable.

**build_number_relationships**
- Label: Build number relationships using concrete part-whole activities.
- Why: Part-whole structure not yet demonstrated. Recall without understanding is fragile.
- Action: Use manipulatives to model decomposition. Record spontaneous vs. prompted combinations.
- Do not: Do not drill recall before part-whole understanding is established.

**reduce_counting_dependency**
- Label: Reduce counting dependency — move toward retrieval.
- Why: Student is reconstructing answers by counting rather than retrieving from memory.
- Action: Introduce subitizing and number bond cards. Cover manipulatives after initial exposure. Prompt: 'Can you remember without counting?'
- Do not: Do not remove counting support abruptly. Fade gradually over several sessions.

**separate_competing_fact_families**
- Label: Separate competing fact families to stabilise retrieval.
- Why: Interference between adjacent number bond families practiced in close succession.
- Action: One fact family per session only. Confirm stable retrieval within one family before reintroducing the other.
- Do not: Do not alternate between adjacent fact families until retrieval is consistent within each independently.

**increase_challenge**
- Label: Ready to progress — introduce new number bond combinations.
- Why: Student demonstrates secure understanding and consistent independent retrieval including transfer.
- Action: Introduce bonds for new target number. Begin with concrete, move to abstract. Test cold recall of existing bonds at session start.
- Do not: Do not skip consolidation of new bonds before adding further families.

### Design principle
Each recommendation resolves to a single instructional direction. Label is concise for UI display. Why, action, and do-not provide the depth a tutor needs to act immediately without further interpretation.
