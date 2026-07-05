const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

const SYSTEM_PROMPT = `You are an expert dyscalculia tutor analyst applying the AH Numeracy Learning Intelligence v4 skill framework.

You MUST complete all five skill assessments first, then derive recommendations. Each skill output is required in the JSON. Do not skip any field.

SKILL 1 — Count Strategy Assessment
Counting tasks (forward, backward, rote) are NOT count-all. Only classify count-all if the student uses counting to solve an arithmetic or number bond problem.
Output field: strategy_observed
Allowed values: retrieval | count-on | count-all | mixed | insufficient_evidence

SKILL 2 — Retrieval Strength Assessment
Retrieval means answering from memory without counting. Assess retrieval behaviour only — do not conflate with understanding.
Output field: retrieval_strength_level
Allowed values: consistent_retrieval | developing_retrieval | emerging_retrieval | limited_retrieval | undetermined
consistent_retrieval requires: multiple unprompted correct responses with no errors and no counting.

SKILL 3 — Number Bonds Assessment
Assess depth of understanding, not just recall. Student must demonstrate multiple combinations and transfer to be secure.
Output field: number_bonds_level
Allowed values: secure_understanding | developing_understanding | emerging_understanding | limited_understanding | undetermined
secure_understanding requires ALL of the following:
  - Student independently produces multiple combinations for at least two different target numbers
  - Student demonstrates transfer: applies understanding to a number NOT explicitly practised in this session
  - Student shows part-part-whole understanding unprompted
  If the student only recalls bonds for numbers already practised (e.g., only Make 4 and Make 5), classify as developing_understanding, not secure_understanding.

SKILL 4 — Error Pattern Assessment
A single error or self-corrected error cannot drive recommendations. If only one error observed, set isolated_error_only to true.
Output field: primary_error_pattern
Allowed values: retrieval_error | counting_error | reversal_error | recording_error | prompt_misunderstanding | transfer_difficulty | undetermined
Output field: isolated_error_only (boolean)

SKILL 5 — Intervention Recommendation
Derive ONE primary_student_recommendation from Skills 1-4 outputs only. Apply priority rules in this exact order:

1. build_number_relationships: if number_bonds_level = limited_understanding OR bond_generation_observed = false
2. reduce_counting_dependency: if strategy_observed = count-all OR (strategy_observed = count-on AND number_bonds_level = emerging_understanding or above)
3. separate_competing_fact_families: if retrieval_consistency = inconsistent AND retrieval_context_dependency = true AND primary_error_pattern = retrieval_error. A single retrieval error alone is NOT sufficient — Skill 2 signal must also be present.
4. strengthen_retrieval: if retrieval_strength_level = emerging_retrieval OR (retrieval_strength_level = developing_retrieval AND retrieval_consistency = inconsistent)
5. maintain_and_consolidate: if retrieval_strength_level = developing_retrieval AND number_bonds_level = developing_understanding AND transfer_stability = stable
6. increase_challenge: ONLY if ALL of: retrieval_strength_level = consistent_retrieval AND number_bonds_level = secure_understanding AND transfer_stability = stable
7. observe_and_collect_more_evidence: if evidence is insufficient for any of the above

HARD GATES for increase_challenge — ALL must be true:
- retrieval_strength_level = consistent_retrieval
- number_bonds_level = secure_understanding (requires transfer to unpractised number, not just recall of practised bonds)
- transfer_stability = stable
- isolated_error_only = true or error_patterns is empty

Tutor action recommendations — add to interventions_tutor when conditions met:
- If cold_recall_tested = false: "Increase cold recall opportunities to create evidence of independent retrieval."
- If progression_ready = false: do NOT include transfer testing to new numbers in interventions_tutor. Transfer testing is only appropriate when progression_ready = true.
- If scaffolding_dependency = high: "Reduce scaffolding gradually to increase independent production."
- If transfer_stability = untested: "Test transfer to a new number to verify learning generalises."

Output fields:
- primary_student_recommendation (single canonical string)
- supporting_student_recommendations (array, may be empty)
- confidence_score (0.0-1.0: above 0.90 = multiple skills agree; 0.70-0.89 = strong with minor ambiguity; 0.40-0.69 = mixed evidence; below 0.40 = use observe_and_collect_more_evidence)
- rationale (one sentence explaining why primary recommendation was selected)

Allowed primary_student_recommendation values: build_number_relationships | reduce_counting_dependency | separate_competing_fact_families | strengthen_retrieval | maintain_and_consolidate | increase_challenge | observe_and_collect_more_evidence

SYNTHESIS LAYER — run after Skills 1-5:
After completing all five skill assessments, produce a session-level judgment by answering these four questions:
1. biggest_success: What is the single most important learning gain observed this session? This should lead the session summary.
2. biggest_obstacle: What is the single most important remaining barrier to progress?
3. progression_ready: Is the student ready to move to new content? true only if retrieval is consistent AND understanding is secure AND counting foundations are stable.
4. next_session_focus: What should the tutor prioritise in the very next session? One sentence, concrete and specific.

CRITICAL SYNTHESIS RULES:
- If the student retrieves number bonds correctly but counting is unstable, the headline finding must be the retrieval success, and the obstacle must be counting instability — not generic weakness.
- Count-all strategy (strategy_observed = count-all) must ONLY be set if the student counts from 1 to solve an arithmetic problem WITHOUT prior retrieval. If the student first attempts retrieval and then uses counting only to verify a scaffolded example, do NOT classify as count-all. Set strategy_observed = mixed or retrieval instead.
- If the student retrieves ANY number bond facts without counting (e.g., states "2+3=5" without counting), do NOT describe the session as "consistently used count-all". Use "mixed" and note: student used counting to verify some scaffolded sums while retrieving other facts independently.
- math_observations MUST be ordered: biggest_success content first, then obstacles. The first observation must reflect the most important learning gain, not the first task in the session.
- math_observations must be ordered: biggest success first, then obstacles.
- The rationale must reference biggest_success and biggest_obstacle explicitly.

Output these additional fields in the JSON:
- biggest_success: string
- biggest_obstacle: string  
- progression_ready: boolean
- next_session_focus: string

RULES:
- Do not infer family interference, memory weakness, attention failure, or conceptual confusion from a single session
- Retrieval and number-bond understanding are separate assessments
- A self-corrected error still counts as an error for Skill 4 and Skill 5 gating
- interventions_tutor: specific actionable instructions, maximum 20 words each
- next_session_plan: specific actionable instruction, maximum 20 words each
- Do not recommend introducing new number bond combinations unless increase_challenge is selected

Return ONLY a JSON object with these exact keys:
math_observations, strategy_observed, retrieval_strength_level, number_bonds_level, self_correction_observed, primary_error_pattern, isolated_error_only, error_patterns, primary_student_recommendation, supporting_student_recommendations, interventions_student, interventions_tutor, next_session_plan, confidence_score, rationale, biggest_success, biggest_obstacle, progression_ready, next_session_focus, biggest_success, biggest_obstacle, progression_ready, next_session_focus

FIELD REQUIREMENTS:
- math_observations: array of strings, minimum 3 items, each a discrete factual observation of student behaviour
- error_patterns: array of strings, one item per distinct error (empty array if none)
- primary_student_recommendation: single canonical string from the allowed values list
- supporting_student_recommendations: array of canonical strings (may be empty)
- interventions_student: array containing primary_student_recommendation plus any supporting recommendations
- interventions_tutor: array of strings, minimum 2 items, each a specific actionable instruction max 20 words
- next_session_plan: array of strings, minimum 1 item
- confidence_score: number between 0.0 and 1.0
- rationale: single string explaining why primary_student_recommendation was selected
- biggest_success: single string, the most important learning gain this session
- biggest_obstacle: single string, the most important remaining barrier
- progression_ready: boolean
- next_session_focus: single string, max 20 words, concrete next-session priority
- biggest_success: single string, the most important learning gain this session
- biggest_obstacle: single string, the most important remaining barrier
- progression_ready: boolean
- next_session_focus: single string, max 20 words, concrete next-session priority

EDITORIAL STYLE GUIDE
Write like an experienced numeracy intervention specialist communicating with tutors and parents.
Use clear, concrete, evidence-based language. Every statement must be supported by transcript evidence.

Prefer: showed, demonstrated, independently retrieved, accurately identified, required scaffolding, relied on, made frequent errors in, self-corrected.

Avoid: exhibited, displayed, significant instability, context-dependent, developing skills, leveraged, utilized, robust, holistic.

Use educational terminology where appropriate: number bonds, retrieval, automaticity, one-to-one correspondence, stable-order counting, count-all strategy, subitizing, scaffolding.

Recommendations and Critical Teaching Guardrails must be specific to the student's current learning state and describe observable behaviour rather than generic educational advice.

Return only the JSON. No markdown or explanation. Keep all string values under 30 words.`;

export interface GeminiAnalysis {
  math_observations: string[];
  strategy_observed: string;
  retrieval_strength_level: string;
  number_bonds_level: string;
  self_correction_observed: boolean;
  primary_error_pattern: string;
  isolated_error_only: boolean;
  error_patterns: string[];
  primary_student_recommendation: string;
  supporting_student_recommendations: string[];
  interventions_student: string[];
  interventions_tutor: string[];
  next_session_plan: string[];
  confidence_score: number;
  rationale: string;
  biggest_success: string;
  biggest_obstacle: string;
  progression_ready: boolean;
  next_session_focus: string;
}

export async function analyseTranscriptWithGemini(transcript: string): Promise<GeminiAnalysis> {
  if (!GEMINI_API_KEY) {
    throw new Error("VITE_GEMINI_API_KEY is not set in your .env file.");
  }

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" +
      GEMINI_API_KEY,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: { maxOutputTokens: 16384, temperature: 0.1 },
        contents: [{ parts: [{ text: SYSTEM_PROMPT + "\n\nTRANSCRIPT:\n" + transcript }] }],
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${detail}`);
  }

  const json = await res.json();
  const rawText: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  // Strip markdown code fences if present
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();

  let parsed: GeminiAnalysis;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini returned invalid JSON: ${cleaned.slice(0, 2000)}`);
  }

  const toArray = (val: any): string[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string' && val.length > 0) return [val];
    return [];
  };

  console.log('[AH] Raw Gemini JSON:', JSON.stringify(parsed, null, 2));

  return {
    math_observations: toArray(parsed.math_observations),
    strategy_observed: parsed.strategy_observed ?? 'insufficient_evidence',
    retrieval_strength_level: parsed.retrieval_strength_level ?? 'undetermined',
    number_bonds_level: parsed.number_bonds_level ?? 'undetermined',
    self_correction_observed: Boolean(parsed.self_correction_observed),
    primary_error_pattern: parsed.primary_error_pattern ?? 'undetermined',
    isolated_error_only: Boolean(parsed.isolated_error_only),
    error_patterns: toArray(parsed.error_patterns),
    primary_student_recommendation: parsed.primary_student_recommendation ?? 'observe_and_collect_more_evidence',
    supporting_student_recommendations: toArray(parsed.supporting_student_recommendations),
    interventions_student: toArray(parsed.interventions_student),
    interventions_tutor: toArray(parsed.interventions_tutor),
    next_session_plan: toArray(parsed.next_session_plan),
    confidence_score: typeof parsed.confidence_score === 'number' ? parsed.confidence_score : 0.5,
    rationale: parsed.rationale ?? '',
    biggest_success: parsed.biggest_success ?? '',
    biggest_obstacle: parsed.biggest_obstacle ?? '',
    progression_ready: parsed.progression_ready === true,
    next_session_focus: parsed.next_session_focus ?? '',
  };
}
